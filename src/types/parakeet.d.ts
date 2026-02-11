declare module "parakeet.js" {
  export interface ParakeetProgressEvent {
    file: string;
    loaded: number;
    total: number;
  }

  export interface ParakeetOptions {
    backend: "webgpu" | "webgpu-hybrid" | "webgpu-strict" | "wasm";
    progress?: (event: ParakeetProgressEvent) => void;
  }

  export interface ParakeetWordResult {
    text: string;
    start_time: number;
    end_time: number;
    confidence: number;
  }

  export interface ParakeetTokenResult {
    token: string;
    start_time: number;
    end_time: number;
    confidence: number;
  }

  export interface ParakeetMetricsResult {
    rtf: number;
    total_ms: number;
    preprocess_ms: number;
    encode_ms: number;
    decode_ms: number;
    tokenize_ms: number;
  }

  export interface ParakeetTranscribeOptions {
    temperature?: number;
    frameStride?: number;
    enableProfiling?: boolean;
    returnLogProbs?: boolean;
    returnTimestamps?: boolean;
    returnConfidences?: boolean;
    timeOffset?: number;
    prefixSamples?: number;
    precomputedFeatures?: {
      features: Float32Array;
      T: number;
      melBins: number;
    } | null;
    incremental?: {
      cacheKey: string;
      prefixSeconds: number;
    } | null;
  }

  export interface ParakeetTranscribeResult {
    utterance_text: string;
    words: ParakeetWordResult[];
    tokens: ParakeetTokenResult[];
    confidence_scores: {
      overall_log_prob: number;
      word_avg: number;
      token_avg: number;
    };
    metrics: ParakeetMetricsResult | null;
    is_final: boolean;
  }

  export interface ParakeetStreamingTranscriber {
    processChunk(audio: Float32Array): Promise<ParakeetTranscribeResult>;
    finalize(): ParakeetTranscribeResult;
    reset(): void;
  }

  export interface ParakeetModel {
    transcribe(
      audio: Float32Array,
      sampleRate: number,
      options?: ParakeetTranscribeOptions
    ): Promise<ParakeetTranscribeResult>;
    createStreamingTranscriber(
      options?: Partial<ParakeetTranscribeOptions>
    ): ParakeetStreamingTranscriber;
  }

  export function fromHub(
    modelKey: string,
    options: ParakeetOptions
  ): Promise<ParakeetModel>;

  export const MODELS: Record<string, unknown>;
}
