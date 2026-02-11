export interface ParakeetModelOption {
  key: string;
  repoId: string;
  label: string;
  size: string;
  description: string;
  languages: string;
}

export const PARAKEET_MODELS: ParakeetModelOption[] = [
  {
    key: "parakeet-tdt-0.6b-v2",
    repoId: "ysdede/parakeet-tdt-0.6b-v2-onnx",
    label: "Parakeet TDT v2 (English)",
    size: "~200 MB",
    description: "Fast, English-only, high accuracy",
    languages: "English",
  },
  {
    key: "parakeet-tdt-0.6b-v3",
    repoId: "istupakov/parakeet-tdt-0.6b-v3-onnx",
    label: "Parakeet TDT v3 (Multilingual)",
    size: "~200 MB",
    description: "13 languages, word-level timestamps",
    languages: "EN, FR, DE, ES, IT, PT, NL, PL, RU, UK, JA, KO, ZH",
  },
];

export const DEFAULT_PARAKEET_MODEL = "parakeet-tdt-0.6b-v2";
