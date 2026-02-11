"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { TranscriberProgressItem } from "@/types/transcriber";
import { DEFAULT_PARAKEET_MODEL, PARAKEET_MODELS } from "@/lib/parakeet-constants";
import { getCachedParakeetModelIds } from "@/lib/model-cache";

const SAMPLING_RATE = 16_000;
const MAX_AUDIO_LENGTH = 30; // seconds
const MAX_SAMPLES = SAMPLING_RATE * MAX_AUDIO_LENGTH;
const CHUNK_INTERVAL_MS = 500; // MediaRecorder timeslice

export interface ParakeetWord {
  text: string;
  start_time: number;
  end_time: number;
  confidence: number;
}

export interface ParakeetMetrics {
  rtf: number;
  total_ms: number;
  preprocess_ms: number;
  encode_ms: number;
  decode_ms: number;
  tokenize_ms: number;
}

export interface ParakeetResult {
  text: string;
  words: ParakeetWord[];
  metrics: ParakeetMetrics | null;
}

export interface ParakeetTranscriberState {
  // Model state
  isModelLoading: boolean;
  isModelReady: boolean;
  progressItems: TranscriberProgressItem[];
  error: string | null;
  backend: "webgpu" | "wasm";
  modelKey: string;
  cachedModelKeys: Set<string>;
  setBackend: (backend: "webgpu" | "wasm") => void;
  setModelKey: (modelKey: string) => void;
  loadModel: () => void;

  // Standard mode
  isTranscribing: boolean;
  result: ParakeetResult | null;
  transcribe: (audio: Float32Array) => void;

  // Realtime mode
  isStreaming: boolean;
  isStreamProcessing: boolean;
  liveText: string;
  liveWords: ParakeetWord[];
  liveMetrics: ParakeetMetrics | null;
  analyserNode: AnalyserNode | null;
  startStreaming: () => void;
  stopStreaming: () => void;
  resetStream: () => void;
}

export function useParakeetTranscriber(): ParakeetTranscriberState {
  const workerRef = useRef<Worker | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processingRef = useRef(false);

  // Model state
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [isModelReady, setIsModelReady] = useState(false);
  const [progressItems, setProgressItems] = useState<TranscriberProgressItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [backend, setBackend] = useState<"webgpu" | "wasm">("webgpu");
  const [modelKey, setModelKey] = useState(DEFAULT_PARAKEET_MODEL);
  const [cachedModelKeys, setCachedModelKeys] = useState<Set<string>>(new Set());

  // Standard mode state
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [result, setResult] = useState<ParakeetResult | null>(null);

  // Realtime mode state
  const [isStreaming, setIsStreaming] = useState(false);
  const [isStreamProcessing, setIsStreamProcessing] = useState(false);
  const [liveText, setLiveText] = useState("");
  const [liveWords, setLiveWords] = useState<ParakeetWord[]>([]);
  const [liveMetrics, setLiveMetrics] = useState<ParakeetMetrics | null>(null);
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);
  const [chunks, setChunks] = useState<Blob[]>([]);

  // Initialize worker
  useEffect(() => {
    const worker = new Worker(
      new URL("../app/speech-to-text/parakeet-worker.ts", import.meta.url),
      { type: "module" }
    );

    worker.onmessage = (event: MessageEvent) => {
      const message = event.data;

      switch (message.type) {
        case "initiate": {
          const data = message.data;
          setProgressItems((prev) => {
            const existing = prev.find((p) => p.file === data.file);
            if (existing) return prev;
            return [
              ...prev,
              {
                file: data.file || "unknown",
                progress: 0,
                loaded: 0,
                total: 0,
                status: "initiate",
              },
            ];
          });
          break;
        }
        case "progress": {
          const data = message.data;
          setProgressItems((prev) =>
            prev.map((item) =>
              item.file === data.file
                ? {
                    ...item,
                    progress: data.progress ?? item.progress,
                    loaded: data.loaded ?? item.loaded,
                    total: data.total ?? item.total,
                    status: "progress",
                  }
                : item
            )
          );
          break;
        }
        case "done": {
          const data = message.data;
          setProgressItems((prev) =>
            prev.map((item) =>
              item.file === data.file
                ? { ...item, progress: 100, status: "done" }
                : item
            )
          );
          break;
        }
        case "ready":
          setIsModelLoading(false);
          setIsModelReady(true);
          refreshCacheStatus();
          break;

        // Standard mode responses
        case "complete":
          setResult(message.data);
          setIsTranscribing(false);
          break;

        // Realtime mode responses
        case "stream-started":
          setIsStreaming(true);
          break;
        case "stream-result":
          processingRef.current = false;
          setIsStreamProcessing(false);
          setLiveText(message.data.text || "");
          setLiveWords(message.data.words || []);
          setLiveMetrics(message.data.metrics || null);
          break;
        case "stream-final":
          setIsStreaming(false);
          processingRef.current = false;
          setIsStreamProcessing(false);
          break;
        case "stream-reset":
          setLiveText("");
          setLiveWords([]);
          setLiveMetrics(null);
          break;

        case "error":
          setError(message.data.message);
          setIsModelLoading(false);
          setIsTranscribing(false);
          processingRef.current = false;
          setIsStreamProcessing(false);
          break;
      }
    };

    worker.onerror = (event: ErrorEvent) => {
      setError(`Worker error: ${event.message || "Unknown worker error"}`);
      setIsModelLoading(false);
      setIsTranscribing(false);
      processingRef.current = false;
      setIsStreamProcessing(false);
    };

    workerRef.current = worker;

    return () => {
      worker.terminate();
    };
  }, []);

  // Cache detection: check which parakeet models are in IndexedDB
  const refreshCacheStatus = useCallback(async () => {
    const repoIds = PARAKEET_MODELS.map((m) => m.repoId);
    const cachedRepoIds = await getCachedParakeetModelIds(repoIds);
    // Map back to model keys for easy lookup
    const keys = new Set<string>();
    for (const m of PARAKEET_MODELS) {
      if (cachedRepoIds.has(m.repoId)) keys.add(m.key);
    }
    setCachedModelKeys(keys);
  }, []);

  useEffect(() => {
    refreshCacheStatus();
  }, [refreshCacheStatus]);

  // Realtime transcription loop: decode accumulated chunks and send to worker
  useEffect(() => {
    if (!recorderRef.current) return;
    if (!isStreaming) return;
    if (!isModelReady) return;
    if (chunks.length === 0) return;
    // Use ref to avoid race condition — state update is async
    if (processingRef.current) return;
    processingRef.current = true;
    setIsStreamProcessing(true);

    const recorder = recorderRef.current;
    const blob = new Blob(chunks, { type: recorder.mimeType });

    const fileReader = new FileReader();
    fileReader.onloadend = async () => {
      try {
        const arrayBuffer = fileReader.result as ArrayBuffer;
        const decoded =
          await audioContextRef.current!.decodeAudioData(arrayBuffer);
        let audio = decoded.getChannelData(0);
        if (audio.length > MAX_SAMPLES) {
          audio = audio.slice(-MAX_SAMPLES);
        }

        workerRef.current?.postMessage({
          type: "stream-chunk",
          audio,
        });
      } catch {
        // decodeAudioData can fail on very short blobs — skip and retry next cycle
        processingRef.current = false;
        setIsStreamProcessing(false);
      }
    };
    fileReader.readAsArrayBuffer(blob);
  }, [isStreaming, isModelReady, chunks]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadModel = useCallback(() => {
    if (!workerRef.current) return;
    setIsModelLoading(true);
    setIsModelReady(false);
    setError(null);
    setProgressItems([]);
    workerRef.current.postMessage({ type: "load", modelKey, backend });
  }, [modelKey, backend]);

  // Standard mode: transcribe recorded audio
  const transcribe = useCallback((audio: Float32Array) => {
    if (!workerRef.current) return;
    setIsTranscribing(true);
    setResult(null);
    setError(null);
    workerRef.current.postMessage({ type: "transcribe", audio });
  }, []);

  // Realtime mode: start streaming
  const startStreaming = useCallback(() => {
    if (!workerRef.current || !isModelReady) return;

    // Request mic and set up MediaRecorder
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((mediaStream) => {
        const recorder = new MediaRecorder(mediaStream);
        const ctx = new AudioContext({ sampleRate: SAMPLING_RATE });

        // Create analyser for visualization
        const source = ctx.createMediaStreamSource(mediaStream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 2048;
        source.connect(analyser);
        setAnalyserNode(analyser);

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            setChunks((prev) => [...prev, e.data]);
          }
        };

        recorder.onstop = () => {
          mediaStream.getTracks().forEach((t) => t.stop());
          ctx.close();
          setAnalyserNode(null);
        };

        recorderRef.current = recorder;
        audioContextRef.current = ctx;

        // Tell worker to prepare for streaming
        workerRef.current?.postMessage({ type: "start-stream" });

        // Clear previous state and start recording with timeslice
        setLiveText("");
        setLiveWords([]);
        setLiveMetrics(null);
        setChunks([]);
        processingRef.current = false;
        setError(null);
        recorder.start(CHUNK_INTERVAL_MS);
      })
      .catch((err) => {
        setError(`Microphone access denied: ${err.message}`);
      });
  }, [isModelReady]);

  // Realtime mode: stop streaming
  const stopStreaming = useCallback(() => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setIsStreaming(false);
    setChunks([]);
    processingRef.current = false;
    workerRef.current?.postMessage({ type: "stop-stream" });
  }, []);

  // Realtime mode: reset transcript
  const resetStream = useCallback(() => {
    setLiveText("");
    setLiveWords([]);
    setLiveMetrics(null);
    setChunks([]);
    processingRef.current = false;
    workerRef.current?.postMessage({ type: "reset-stream" });
  }, []);

  return {
    // Model state
    isModelLoading,
    isModelReady,
    progressItems,
    error,
    backend,
    modelKey,
    cachedModelKeys,
    setBackend,
    setModelKey,
    loadModel,

    // Standard mode
    isTranscribing,
    result,
    transcribe,

    // Realtime mode
    isStreaming,
    isStreamProcessing,
    liveText,
    liveWords,
    liveMetrics,
    analyserNode,
    startStreaming,
    stopStreaming,
    resetStream,
  };
}
