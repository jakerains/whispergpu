// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — onnxruntime-web types don't resolve via package.json exports
import * as ort from "onnxruntime-web";
import { env, pipeline } from "@huggingface/transformers";
import { AudioModel } from "../../lib/lfm/audio-model.js";

// Engine type for routing — mirrors TTSEngine from tts-constants
type TTSEngine = "kitten" | "kokoro" | "supertonic" | "lfm" | "outetts";

// Constants inlined — Web Workers don't resolve path aliases
const MODEL_ENGINE_MAP: Record<string, TTSEngine> = {
  "onnx-community/kitten-tts-nano-0.1-ONNX": "kitten",
  "onnx-community/Kokoro-82M-v1.0-ONNX": "kokoro",
  "onnx-community/Supertonic-TTS-2-ONNX": "supertonic",
  "LiquidAI/LFM2.5-Audio-1.5B-ONNX": "lfm",
  "onnx-community/OuteTTS-0.2-500M": "outetts",
};

const DEFAULT_MODEL_ID = "onnx-community/Kokoro-82M-v1.0-ONNX";

// Disable local model check — always download from HF Hub
env.allowLocalModels = false;
env.useBrowserCache = true;

// Singleton model instances
let lfmModel: AudioModel | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let outeTtsInterface: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let kokoroTts: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let supertonicPipeline: any = null;

// Kitten TTS state (raw ONNX Runtime inference)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let kittenSession: any = null;
let kittenVocab: Record<string, number> = {};
// Cache fetched voice embeddings to avoid re-downloading
const kittenVoiceCache: Record<string, Float32Array> = {};

let currentModelId: string | null = null;
let currentEngine: TTSEngine | null = null;

function disposeCurrentModel() {
  if (lfmModel) {
    lfmModel.dispose();
    lfmModel = null;
  }
  outeTtsInterface = null;
  kokoroTts = null;
  supertonicPipeline = null;
  kittenSession = null;
  kittenVocab = {};
  currentModelId = null;
  currentEngine = null;
}

function postProgress(file: string, progress: number, status: "initiate" | "progress" | "done") {
  self.postMessage({
    type: status,
    data: {
      file,
      progress,
      loaded: progress,
      total: 100,
      name: file,
      status,
    },
  });
}

// ─── Kitten TTS (raw ONNX Runtime — style_text_to_speech_2) ──

async function loadKittenModel(modelId: string) {
  // Use WASM backend (tiny model, fast on CPU, avoids WebGPU precision issues)
  ort.env.wasm.numThreads = 1;

  postProgress("kitten-model", 0, "initiate");

  // Fetch the quantized ONNX model from HuggingFace
  const modelUrl = `https://huggingface.co/${modelId}/resolve/main/onnx/model_quantized.onnx`;
  const modelResponse = await fetch(modelUrl);
  if (!modelResponse.ok) throw new Error(`Failed to download model: ${modelResponse.statusText}`);
  const modelBuffer = await modelResponse.arrayBuffer();

  postProgress("kitten-model", 50, "progress");

  // Create ONNX inference session
  kittenSession = await ort.InferenceSession.create(modelBuffer, {
    executionProviders: ["wasm"],
  });

  postProgress("kitten-model", 70, "progress");

  // Load tokenizer vocab from HuggingFace
  const tokenizerUrl = `https://huggingface.co/${modelId}/resolve/main/tokenizer.json`;
  const tokenizerResponse = await fetch(tokenizerUrl);
  if (!tokenizerResponse.ok) throw new Error(`Failed to download tokenizer: ${tokenizerResponse.statusText}`);
  const tokenizerData = await tokenizerResponse.json();
  kittenVocab = tokenizerData.model?.vocab ?? {};

  postProgress("kitten-model", 100, "done");

  currentModelId = modelId;
  currentEngine = "kitten";
}

async function synthesizeWithKitten(text: string, voiceId?: string) {
  if (!kittenSession) {
    throw new Error("Kitten TTS model not loaded");
  }

  const { phonemize } = await import("phonemizer");

  // 1. Convert text to phonemes
  const phonemes = await phonemize(text, "en-us");

  // 2. Tokenize: wrap in $ delimiters, map each char to vocab ID
  const tokenChars = `$${phonemes}$`.split("");
  const tokenIds = tokenChars.map((char) => {
    const id = kittenVocab[char];
    return id !== undefined ? id : 0; // fallback to pad token
  });

  // 3. Load voice embedding (cached)
  const speaker = voiceId || "expr-voice-2-f";
  if (!kittenVoiceCache[speaker]) {
    const voiceUrl = `https://huggingface.co/${currentModelId}/resolve/main/voices/${speaker}.bin`;
    const voiceResponse = await fetch(voiceUrl);
    if (!voiceResponse.ok) throw new Error(`Failed to download voice: ${speaker}`);
    const voiceBuffer = await voiceResponse.arrayBuffer();
    kittenVoiceCache[speaker] = new Float32Array(voiceBuffer);
  }

  const voiceData = kittenVoiceCache[speaker];

  // Voice data is shape [num_steps, 256] — select style vector based on token count
  const numSteps = voiceData.length / 256;
  const styleIndex = Math.min(tokenIds.length, numSteps - 1);
  const styleVector = voiceData.slice(styleIndex * 256, (styleIndex + 1) * 256);

  // 4. Create ONNX tensors
  const inputIds = new BigInt64Array(tokenIds.map((id) => BigInt(id)));

  const inputs = {
    input_ids: new ort.Tensor("int64", inputIds, [1, inputIds.length]),
    style: new ort.Tensor("float32", styleVector, [1, 256]),
    speed: new ort.Tensor("float32", new Float32Array([1.0]), [1]),
  };

  // 5. Run inference
  const results = await kittenSession.run(inputs);
  const audioOutput = results.waveform;
  const audioData = new Float32Array(audioOutput.data as Float32Array);

  self.postMessage({
    type: "result",
    data: { audio: audioData, samplingRate: 24000 },
  });
}

// ─── Kokoro TTS ───────────────────────────────────────────────

async function loadKokoroModel(modelId: string) {
  const { KokoroTTS } = await import("kokoro-js");

  // Use WASM — WebGPU produces corrupted audio (transformers.js #1320, fix in v4)
  const tts = await KokoroTTS.from_pretrained(modelId, {
    dtype: "q8",
    progress_callback: (progressData: unknown) => {
      const data = progressData as {
        file?: string;
        progress?: number;
        status?: string;
      };
      const file = data.file ?? "kokoro-model";
      const progress = data.progress ?? 0;
      const status = data.status as "initiate" | "progress" | "done" | undefined;

      if (status === "initiate" || status === "progress" || status === "done") {
        postProgress(file, progress, status);
      }
    },
  });

  kokoroTts = tts;
  currentModelId = modelId;
  currentEngine = "kokoro";
}

async function synthesizeWithKokoro(text: string, voiceId?: string) {
  if (!kokoroTts) {
    throw new Error("Kokoro model not loaded");
  }

  const result = await kokoroTts.generate(text, {
    voice: voiceId || "af_sky",
  });

  // kokoro-js returns { audio: Float32Array, sampling_rate: number }
  const audio = result.audio as Float32Array;
  const samplingRate = result.sampling_rate as number;

  self.postMessage({
    type: "result",
    data: { audio, samplingRate },
  });
}

// ─── Supertonic TTS ───────────────────────────────────────────

async function loadSupertonicModel(modelId: string) {
  const synthesizer = await pipeline("text-to-speech", modelId, {
    device: "webgpu",
    progress_callback: (progressData: unknown) => {
      const data = progressData as {
        file?: string;
        progress?: number;
        status?: string;
      };

      const file = data.file ?? "supertonic-model";
      const progress = data.progress ?? 0;
      const status = data.status as "initiate" | "progress" | "done" | undefined;

      if (status === "initiate" || status === "progress" || status === "done") {
        postProgress(file, progress, status);
      }
    },
  });

  supertonicPipeline = synthesizer;
  currentModelId = modelId;
  currentEngine = "supertonic";
}

async function synthesizeWithSupertonic(text: string, speakerId?: string) {
  if (!supertonicPipeline) {
    throw new Error("Supertonic model not loaded");
  }

  const speaker = speakerId || "F1";
  const speakerUrl = `https://huggingface.co/onnx-community/Supertonic-TTS-2-ONNX/resolve/main/voices/${speaker}.bin`;

  // Supertonic v2 requires language tags
  const taggedText = `<en>${text}</en>`;

  const result = await supertonicPipeline(taggedText, {
    speaker_embeddings: speakerUrl,
    num_inference_steps: 10,
    speed: 1.0,
  });

  const audio = result.audio as Float32Array;
  const samplingRate = result.sampling_rate as number;

  self.postMessage({
    type: "result",
    data: { audio, samplingRate },
  });
}

// ─── LFM Audio ────────────────────────────────────────────────

async function loadLfmModel(modelId: string) {
  const modelPath = `https://huggingface.co/${modelId}/resolve/main`;
  const model = new AudioModel();

  await model.load(modelPath, {
    device: "webgpu",
    quantization: {
      decoder: "q4",
      audioEncoder: "q4",
      audioEmbedding: "q4",
      audioDetokenizer: "q4",
      vocoder: "q4",
    },
    progressCallback: (progressData: unknown) => {
      const data = progressData as {
        file?: string;
        progress?: number;
      };
      const file = data.file ?? "lfm-model";
      const progress = data.progress ?? 0;

      postProgress(file, 0, "initiate");
      postProgress(file, progress, "progress");
      if (progress >= 100) {
        postProgress(file, 100, "done");
      }
    },
  });

  lfmModel = model;
  currentModelId = modelId;
  currentEngine = "lfm";
}

async function synthesizeWithLfm(text: string) {
  if (!lfmModel) {
    throw new Error("LFM model not loaded");
  }

  const ttsResult = await lfmModel.generateSpeech(text, {
    maxNewTokens: 1024,
  }) as {
    audioCodes?: number[][];
    textOutput?: string;
  };

  if (!ttsResult.audioCodes || ttsResult.audioCodes.length === 0) {
    throw new Error("No audio frames were generated");
  }

  const waveform = await lfmModel.decodeAudioCodes(ttsResult.audioCodes);

  if (!waveform || waveform.length === 0) {
    throw new Error("Failed to decode generated audio");
  }

  self.postMessage({
    type: "result",
    data: {
      audio: waveform,
      samplingRate: 24000,
      text: ttsResult.textOutput ?? "",
    },
  });
}

// ─── OuteTTS ──────────────────────────────────────────────────

async function loadOuteTtsModel(modelId: string) {
  const { HFModelConfig_v1, InterfaceHF } = await import("outetts");

  // Detect WebGPU shader-f16 support for optimal quantization
  let fp16Supported = false;
  try {
    const adapter = await navigator.gpu?.requestAdapter();
    if (adapter) {
      fp16Supported = adapter.features.has("shader-f16");
    }
  } catch {
    // WebGPU not available, fall back to WASM
  }

  const config = new HFModelConfig_v1({
    model_path: modelId,
    language: "en",
    dtype: fp16Supported ? "q4f16" : "q4",
    device: "webgpu",
  });

  const ttsInterface = await InterfaceHF({ model_version: "0.2", cfg: config });
  outeTtsInterface = ttsInterface;
  currentModelId = modelId;
  currentEngine = "outetts";
}

async function synthesizeWithOuteTts(text: string, speakerId?: string) {
  if (!outeTtsInterface) {
    throw new Error("OuteTTS model not loaded");
  }

  const speaker = speakerId && speakerId !== "random"
    ? outeTtsInterface.load_default_speaker(speakerId)
    : null;

  const output = await outeTtsInterface.generate({
    text,
    speaker,
    temperature: 0.1,
    repetition_penalty: 1.1,
    max_length: 4096,
  });

  const wavBuffer: ArrayBuffer = output.to_wav();

  self.postMessage(
    {
      type: "result",
      data: { wavBuffer },
    },
    { transfer: [wavBuffer] }
  );
}

// ─── Router ───────────────────────────────────────────────────

async function loadModel(modelId: string) {
  // Reload if model changed
  if (currentModelId !== null && currentModelId !== modelId) {
    disposeCurrentModel();
  }

  if (currentModelId === modelId) {
    return;
  }

  const engine = MODEL_ENGINE_MAP[modelId];
  if (!engine) {
    throw new Error(`Unknown TTS model: ${modelId}`);
  }

  switch (engine) {
    case "kitten":
      await loadKittenModel(modelId);
      break;
    case "kokoro":
      await loadKokoroModel(modelId);
      break;
    case "supertonic":
      await loadSupertonicModel(modelId);
      break;
    case "lfm":
      await loadLfmModel(modelId);
      break;
    case "outetts":
      await loadOuteTtsModel(modelId);
      break;
  }
}

// ─── Message handler ──────────────────────────────────────────

self.addEventListener("message", async (event: MessageEvent) => {
  const { type } = event.data;

  if (type === "load") {
    const { modelId } = event.data;
    try {
      await loadModel(modelId || DEFAULT_MODEL_ID);
      self.postMessage({ type: "ready" });
    } catch (error) {
      self.postMessage({
        type: "error",
        data: {
          message:
            error instanceof Error
              ? error.message
              : "Failed to load TTS model",
        },
      });
    }
  }

  if (type === "synthesize") {
    const { text, speakerId } = event.data;
    try {
      switch (currentEngine) {
        case "kitten":
          await synthesizeWithKitten(text, speakerId);
          break;
        case "kokoro":
          await synthesizeWithKokoro(text, speakerId);
          break;
        case "supertonic":
          await synthesizeWithSupertonic(text, speakerId);
          break;
        case "lfm":
          await synthesizeWithLfm(text);
          break;
        case "outetts":
          await synthesizeWithOuteTts(text, speakerId);
          break;
        default:
          throw new Error("No TTS model loaded");
      }
    } catch (error) {
      self.postMessage({
        type: "error",
        data: {
          message:
            error instanceof Error
              ? error.message
              : "Speech synthesis failed",
        },
      });
    }
  }

  if (type === "dispose") {
    disposeCurrentModel();
  }
});
