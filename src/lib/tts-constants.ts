export interface TTSModelOption {
  id: string;
  label: string;
  size: string;
  description: string;
  supportsAsr?: boolean;
  supportsTts?: boolean;
  supportsInterleaved?: boolean;
  voiceProfile?: string;
}

export const TTS_MODELS: TTSModelOption[] = [
  {
    id: "LiquidAI/LFM2.5-Audio-1.5B-ONNX",
    label: "LFM2.5 Audio (Q4)",
    size: "~1.5 GB",
    description: "Liquid multimodal audio model with high-quality TTS",
    supportsAsr: true,
    supportsTts: true,
    supportsInterleaved: true,
    voiceProfile: "UK female voice",
  },
  {
    id: "onnx-community/OuteTTS-0.2-500M",
    label: "OuteTTS v0.2",
    size: "~125 MB (q4)",
    description: "Multi-language TTS with speaker profiles (EN/CN/JP/KR)",
    supportsTts: true,
    voiceProfile: "male_1, female_1, or random",
  },
];

export const OUTETTS_SPEAKERS = [
  { id: "male_1", label: "Male" },
  { id: "female_1", label: "Female" },
  { id: "random", label: "Random" },
] as const;

export const DEFAULT_TTS_MODEL_ID = TTS_MODELS[0].id;
