export interface ChatGenerationConfig {
  do_sample?: boolean;
  temperature?: number;
  top_p?: number;
  repetition_penalty?: number;
}

export interface ChatModelOption {
  id: string;
  label: string;
  size: string;
  description: string;
  dtype: string | Record<string, string>;
  maxTokens: number;
  systemPrompt?: string;
  useProcessor?: boolean;
  generationConfig?: ChatGenerationConfig;
}

export const CHAT_MODELS: ChatModelOption[] = [
  {
    id: "onnx-community/Qwen3-0.6B-ONNX",
    label: "Qwen3 (0.6B)",
    size: "~570 MB",
    description: "Lightweight Qwen3 model, fast inference",
    dtype: "q4f16",
    maxTokens: 512,
  },
  {
    id: "LiquidAI/LFM2.5-1.2B-Instruct-ONNX",
    label: "LFM 2.5 (1.2B)",
    size: "~1.2 GB",
    description: "Liquid AI hybrid model, optimized for edge",
    dtype: "q4",
    maxTokens: 512,
  },
  {
    id: "HuggingFaceTB/SmolLM3-3B-ONNX",
    label: "SmolLM3 (3B)",
    size: "~2.1 GB",
    description: "HuggingFace 3B model, 6 languages, 128k context",
    dtype: "q4f16",
    maxTokens: 1024,
  },
];

export const DEFAULT_CHAT_MODEL_ID = CHAT_MODELS[0].id;

export const DEFAULT_SYSTEM_PROMPT =
  "You are a helpful, friendly AI assistant. Respond concisely and clearly.";

export const SUGGESTION_CHIPS = [
  "Explain WebGPU in simple terms",
  "Write a haiku about coding",
  "What can you help me with?",
  "Tell me a fun fact",
];
