import { fromHub } from "parakeet.js";

// Inlined — Workers can't use path aliases
const DEFAULT_PARAKEET_MODEL = "parakeet-tdt-0.6b-v2";

// Singleton model cache
let modelInstance: Awaited<ReturnType<typeof fromHub>> | null = null;
let currentModelKey: string | null = null;

// Streaming guard
let streamProcessing = false;

async function loadModel(
  modelKey: string,
  backend: "webgpu" | "wasm"
) {
  // Reload if model changed
  if (modelInstance !== null && currentModelKey !== modelKey) {
    modelInstance = null;
    currentModelKey = null;
  }

  if (modelInstance === null) {
    // parakeet.js fromUrls expects "webgpu-hybrid" (encoder on GPU, decoder on WASM)
    // not plain "webgpu" — plain "webgpu" falls through the provider selection
    const ortBackend = backend === "webgpu" ? "webgpu-hybrid" : backend;

    // Track files we've seen to send "initiate" on first event
    const seenFiles = new Set<string>();

    modelInstance = await fromHub(modelKey, {
      backend: ortBackend,
      progress: (data: { file: string; loaded: number; total: number }) => {
        // Send "initiate" the first time we see a file
        if (!seenFiles.has(data.file)) {
          seenFiles.add(data.file);
          self.postMessage({
            type: "initiate",
            data: {
              file: data.file,
              progress: 0,
              loaded: 0,
              total: data.total,
              status: "initiate",
            },
          });
        }

        const pct = data.total > 0 ? (data.loaded / data.total) * 100 : 0;

        if (pct >= 100) {
          self.postMessage({
            type: "done",
            data: {
              file: data.file,
              progress: 100,
              loaded: data.loaded,
              total: data.total,
              status: "done",
            },
          });
        } else {
          self.postMessage({
            type: "progress",
            data: {
              file: data.file,
              progress: pct,
              loaded: data.loaded,
              total: data.total,
              status: "progress",
            },
          });
        }
      },
    });
    currentModelKey = modelKey;
  }

  return modelInstance;
}

self.addEventListener("message", async (event: MessageEvent) => {
  const { type } = event.data;

  if (type === "load") {
    const { modelKey = DEFAULT_PARAKEET_MODEL, backend = "webgpu" } =
      event.data;
    try {
      await loadModel(modelKey, backend);
      self.postMessage({ type: "ready" });
    } catch (error) {
      self.postMessage({
        type: "error",
        data: {
          message:
            error instanceof Error
              ? error.message
              : "Failed to load Parakeet model",
        },
      });
    }
  }

  // Standard mode: record-then-transcribe
  if (type === "transcribe") {
    const { audio } = event.data as { audio: Float32Array; type: string };
    try {
      if (!modelInstance) {
        throw new Error("Model not loaded. Please load a model first.");
      }

      const result = await modelInstance.transcribe(audio, 16000, {
        returnTimestamps: true,
        returnConfidences: true,
        enableProfiling: true,
      });

      self.postMessage({
        type: "complete",
        data: {
          text: result.utterance_text || "",
          words: result.words || [],
          metrics: result.metrics || null,
        },
      });
    } catch (error) {
      self.postMessage({
        type: "error",
        data: {
          message:
            error instanceof Error
              ? error.message
              : "Parakeet transcription failed",
        },
      });
    }
  }

  // Realtime mode: start streaming session
  if (type === "start-stream") {
    try {
      if (!modelInstance) {
        throw new Error("Model not loaded. Please load a model first.");
      }
      streamProcessing = false;
      self.postMessage({ type: "stream-started" });
    } catch (error) {
      self.postMessage({
        type: "error",
        data: {
          message:
            error instanceof Error
              ? error.message
              : "Failed to start streaming",
        },
      });
    }
  }

  // Realtime mode: process audio chunk (growing window — full audio each time)
  if (type === "stream-chunk") {
    if (!modelInstance || streamProcessing) return;
    streamProcessing = true;

    const { audio } = event.data as { audio: Float32Array; type: string };
    try {
      const result = await modelInstance.transcribe(audio, 16000, {
        returnTimestamps: true,
        returnConfidences: true,
        enableProfiling: true,
      });

      self.postMessage({
        type: "stream-result",
        data: {
          text: result.utterance_text || "",
          words: result.words || [],
          metrics: result.metrics || null,
        },
      });
    } catch (error) {
      self.postMessage({
        type: "error",
        data: {
          message:
            error instanceof Error
              ? error.message
              : "Stream chunk processing failed",
        },
      });
    } finally {
      streamProcessing = false;
    }
  }

  // Realtime mode: stop streaming
  if (type === "stop-stream") {
    streamProcessing = false;
    self.postMessage({
      type: "stream-final",
      data: { text: "", words: [] },
    });
  }

  // Reset streaming session
  if (type === "reset-stream") {
    streamProcessing = false;
    self.postMessage({ type: "stream-reset" });
  }
});
