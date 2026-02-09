export interface DepthModelOption {
  id: string;
  label: string;
  size: string;
  description: string;
}

export const DEPTH_MODELS: DepthModelOption[] = [
  {
    id: "onnx-community/depth-anything-v2-small",
    label: "Depth Anything V2 Small",
    size: "~99 MB",
    description: "Fast, accurate monocular depth estimation",
  },
  {
    id: "onnx-community/depth-anything-v2-base",
    label: "Depth Anything V2 Base",
    size: "~389 MB",
    description: "Higher quality depth maps, more detail",
  },
];

export const DEFAULT_DEPTH_MODEL_ID = DEPTH_MODELS[0].id;
