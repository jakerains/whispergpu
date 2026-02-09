import {
  AutoTokenizer,
  AutoProcessor,
  WhisperForConditionalGeneration,
  TextStreamer,
  full,
} from "@huggingface/transformers";

const MAX_NEW_TOKENS = 64;

// Singleton model loader
class RealtimeWhisperPipeline {
  static model_id: string | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static tokenizer: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static processor: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static model: any = null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static async getInstance(modelId: string, progress_callback: any = null) {
    // Reset if model changed
    if (this.model_id && this.model_id !== modelId) {
      this.tokenizer = null;
      this.processor = null;
      this.model = null;
    }

    this.model_id = modelId;

    this.tokenizer ??= AutoTokenizer.from_pretrained(modelId, {
      progress_callback,
    });
    this.processor ??= AutoProcessor.from_pretrained(modelId, {
      progress_callback,
    });

    this.model ??= WhisperForConditionalGeneration.from_pretrained(modelId, {
      dtype: {
        encoder_model: "fp32",
        decoder_model_merged: "q4",
      },
      device: "webgpu",
      progress_callback,
    });

    return Promise.all([this.tokenizer, this.processor, this.model]);
  }
}

let processing = false;

async function generate({
  audio,
  language,
}: {
  audio: Float32Array;
  language: string;
}) {
  if (processing) return;
  processing = true;

  self.postMessage({ status: "start" });

  const [tokenizer, processor, model] =
    await RealtimeWhisperPipeline.getInstance(
      RealtimeWhisperPipeline.model_id!
    );

  let startTime: number | null = null;
  let numTokens = 0;

  const callback_function = () => {
    startTime ??= performance.now();

    let tps: number | undefined;
    if (numTokens++ > 0) {
      tps = (numTokens / (performance.now() - startTime!)) * 1000;
    }
    self.postMessage({
      status: "update",
      tps,
      numTokens,
    });
  };

  const streamer = new TextStreamer(tokenizer, {
    skip_prompt: true,
    skip_special_tokens: true,
    callback_function,
  });

  const inputs = await processor(audio);

  const outputs = await model.generate({
    ...inputs,
    max_new_tokens: MAX_NEW_TOKENS,
    language,
    streamer,
  });

  const outputText = tokenizer.batch_decode(outputs, {
    skip_special_tokens: true,
  });

  self.postMessage({
    status: "complete",
    output: outputText,
  });
  processing = false;
}

async function load(modelId: string) {
  self.postMessage({
    status: "loading",
    data: "Loading model...",
  });

  const [_tokenizer, _processor, model] =
    await RealtimeWhisperPipeline.getInstance(
      modelId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (x: any) => {
        self.postMessage(x);
      }
    );

  self.postMessage({
    status: "loading",
    data: "Compiling shaders and warming up model...",
  });

  // Warmup: run model with dummy input to pre-compile WebGPU shaders
  await model.generate({
    input_features: full([1, 80, 3000], 0.0),
    max_new_tokens: 1,
  });

  self.postMessage({ status: "ready" });
}

self.addEventListener("message", async (e: MessageEvent) => {
  const { type, data } = e.data;

  switch (type) {
    case "load":
      load(data?.modelId || "onnx-community/whisper-base");
      break;

    case "generate":
      generate(data);
      break;
  }
});
