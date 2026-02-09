export interface SegmentationModelOption {
  id: string;
  label: string;
  size: string;
  description: string;
  dtype?: string;
  modelClass: "sam3" | "sam1";
}

export const SEGMENTATION_MODELS: SegmentationModelOption[] = [
  {
    id: "onnx-community/sam3-tracker-ONNX",
    label: "SAM3 (Meta)",
    size: "~301 MB",
    description: "Segment Anything 3 — latest from Meta, q4f16 quantized",
    dtype: "q4f16",
    modelClass: "sam3",
  },
];

export const DEFAULT_SEGMENTATION_MODEL_ID = SEGMENTATION_MODELS[0].id;
