import {
  AutoModelForCausalLM,
  AutoTokenizer,
  TextStreamer,
  env,
} from "@huggingface/transformers";

// Disable local model check - always download from HF Hub
env.allowLocalModels = false;
// Ensure browser Cache API is used — avoids re-downloading on refresh
env.useBrowserCache = true;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let tokenizer: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let model: any = null;
let currentModelId: string | null = null;
let currentDtype: string | null = null;
let aborted = false;

async function loadModel(
  modelId: string,
  dtype: string,
  progressCallback: (data: unknown) => void
) {
  // Dispose previous model if switching
  if (model !== null && (currentModelId !== modelId || currentDtype !== dtype)) {
    try {
      await model.dispose();
    } catch {
      // ignore disposal errors
    }
    model = null;
    tokenizer = null;
    currentModelId = null;
    currentDtype = null;
  }

  if (model !== null) return;

  tokenizer = await AutoTokenizer.from_pretrained(modelId, {
    progress_callback: progressCallback,
  });

  model = await AutoModelForCausalLM.from_pretrained(modelId, {
    dtype: dtype as "fp32" | "fp16" | "q8" | "int8" | "uint8" | "q4" | "bnb4" | "q4f16" | "auto",
    device: "webgpu",
    progress_callback: progressCallback,
  });

  currentModelId = modelId;
  currentDtype = dtype;
}

// Listen for messages from main thread
self.addEventListener("message", async (event: MessageEvent) => {
  const { type } = event.data;

  if (type === "load") {
    const { modelId, dtype } = event.data;
    try {
      await loadModel(modelId, dtype, (data: unknown) => {
        const progressData = data as Record<string, unknown>;
        self.postMessage({
          type: progressData.status,
          data: progressData,
        });
      });
      self.postMessage({ type: "ready" });
    } catch (error) {
      self.postMessage({
        type: "error",
        data: {
          message:
            error instanceof Error
              ? error.message
              : "Failed to load chat model",
        },
      });
    }
  }

  if (type === "generate") {
    const { messages, maxTokens } = event.data;
    aborted = false;

    try {
      if (!tokenizer || !model) {
        throw new Error("Model not loaded");
      }

      // Build chat messages for the template
      const chatMessages = messages.map(
        (m: { role: string; content: string }) => ({
          role: m.role,
          content: m.content,
        })
      );

      // Apply chat template to get input token IDs
      const inputs = tokenizer.apply_chat_template(chatMessages, {
        add_generation_prompt: true,
        return_dict: true,
      });

      let fullContent = "";

      // Create a text streamer for token-by-token output
      const streamer = new TextStreamer(tokenizer, {
        skip_prompt: true,
        skip_special_tokens: true,
        callback_function: (token: string) => {
          if (aborted) return;
          fullContent += token;
          self.postMessage({
            type: "token",
            data: { token },
          });
        },
      });

      // Generate with streaming
      await model.generate({
        ...inputs,
        max_new_tokens: maxTokens,
        do_sample: true,
        temperature: 0.7,
        top_p: 0.9,
        streamer,
      });

      if (!aborted) {
        self.postMessage({
          type: "complete",
          data: { content: fullContent },
        });
      }
    } catch (error) {
      if (!aborted) {
        self.postMessage({
          type: "error",
          data: {
            message:
              error instanceof Error
                ? error.message
                : "Generation failed",
          },
        });
      }
    }
  }

  if (type === "abort") {
    aborted = true;
  }
});
