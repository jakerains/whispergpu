export type DetectionPipelineType = "object-detection" | "yolov10" | "zero-shot-object-detection";

export interface DetectionModelOption {
  id: string;
  label: string;
  size: string;
  description: string;
  pipelineType: DetectionPipelineType;
}

export const DETECTION_MODELS: DetectionModelOption[] = [
  {
    id: "onnx-community/yolov10n",
    label: "YOLOv10 Nano",
    size: "~8 MB",
    description: "Ultra-fast and tiny — best for real-time webcam",
    pipelineType: "yolov10",
  },
  {
    id: "onnx-community/yolov10s",
    label: "YOLOv10 Small",
    size: "~24 MB",
    description: "Great speed/accuracy balance — recommended",
    pipelineType: "yolov10",
  },
  {
    id: "onnx-community/yolov10m",
    label: "YOLOv10 Medium",
    size: "~52 MB",
    description: "Higher accuracy, still fast",
    pipelineType: "yolov10",
  },
  {
    id: "Xenova/yolos-tiny",
    label: "YOLOS Tiny",
    size: "~29 MB",
    description: "Lightweight transformer detector",
    pipelineType: "object-detection",
  },
  {
    id: "Xenova/detr-resnet-50",
    label: "DETR ResNet-50",
    size: "~166 MB",
    description: "Higher accuracy, 91 object classes",
    pipelineType: "object-detection",
  },
  {
    id: "onnx-community/grounding-dino-tiny-ONNX",
    label: "Grounding DINO Tiny",
    size: "~151 MB (q4)",
    description: "Open-vocabulary — type any text to detect custom objects",
    pipelineType: "zero-shot-object-detection",
  },
];

export const DEFAULT_DETECTION_MODEL_ID = "onnx-community/grounding-dino-tiny-ONNX";
