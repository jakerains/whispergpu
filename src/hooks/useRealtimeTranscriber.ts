"use client";

import { useState, useRef, useCallback, useEffect } from "react";

const WHISPER_SAMPLING_RATE = 16_000;
const MAX_AUDIO_LENGTH = 30; // seconds
const MAX_SAMPLES = WHISPER_SAMPLING_RATE * MAX_AUDIO_LENGTH;

interface ProgressItem {
  file: string;
  progress: number;
  total: number;
}

export interface RealtimeTranscriberState {
  status: "idle" | "loading" | "ready";
  loadingMessage: string;
  progressItems: ProgressItem[];
  text: string;
  tps: number | null;
  language: string;
  isListening: boolean;
  isProcessing: boolean;
  stream: MediaStream | null;
  analyserNode: AnalyserNode | null;
  setLanguage: (lang: string) => void;
  loadModel: (modelId?: string) => void;
  startListening: () => void;
  stopListening: () => void;
  reset: () => void;
}

export function useRealtimeTranscriber(): RealtimeTranscriberState {
  const workerRef = useRef<Worker | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const [status, setStatus] = useState<"idle" | "loading" | "ready">("idle");
  const [loadingMessage, setLoadingMessage] = useState("");
  const [progressItems, setProgressItems] = useState<ProgressItem[]>([]);

  const [text, setText] = useState("");
  const [tps, setTps] = useState<number | null>(null);
  const [language, setLanguage] = useState("en");

  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [chunks, setChunks] = useState<Blob[]>([]);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);

  // Initialize worker
  useEffect(() => {
    if (!workerRef.current) {
      workerRef.current = new Worker(
        new URL(
          "../app/speech-to-text/realtime-worker.ts",
          import.meta.url
        ),
        { type: "module" }
      );
    }

    const onMessage = (e: MessageEvent) => {
      switch (e.data.status) {
        case "loading":
          setStatus("loading");
          setLoadingMessage(e.data.data);
          break;

        case "initiate":
          setProgressItems((prev) => [...prev, e.data]);
          break;

        case "progress":
          setProgressItems((prev) =>
            prev.map((item) =>
              item.file === e.data.file ? { ...item, ...e.data } : item
            )
          );
          break;

        case "done":
          setProgressItems((prev) =>
            prev.filter((item) => item.file !== e.data.file)
          );
          break;

        case "ready":
          setStatus("ready");
          break;

        case "start":
          setIsProcessing(true);
          // Request next data while processing
          recorderRef.current?.requestData();
          break;

        case "update":
          if (e.data.tps) {
            setTps(e.data.tps);
          }
          break;

        case "complete":
          setIsProcessing(false);
          if (e.data.output) {
            const outputText = Array.isArray(e.data.output)
              ? e.data.output[0]
              : e.data.output;
            setText(outputText);
          }
          break;
      }
    };

    workerRef.current.addEventListener("message", onMessage);

    return () => {
      workerRef.current?.removeEventListener("message", onMessage);
    };
  }, []);

  // Set up media recorder (once, on mount)
  useEffect(() => {
    if (recorderRef.current) return;

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((mediaStream) => {
        setStream(mediaStream);

        recorderRef.current = new MediaRecorder(mediaStream);
        audioContextRef.current = new AudioContext({
          sampleRate: WHISPER_SAMPLING_RATE,
        });

        // Create analyser for visualization
        const source = audioContextRef.current.createMediaStreamSource(mediaStream);
        const analyser = audioContextRef.current.createAnalyser();
        analyser.fftSize = 2048;
        source.connect(analyser);
        setAnalyserNode(analyser);

        recorderRef.current.onstart = () => {
          setIsListening(true);
          setChunks([]);
        };

        recorderRef.current.ondataavailable = (e) => {
          if (e.data.size > 0) {
            setChunks((prev) => [...prev, e.data]);
          } else {
            // Empty chunk — retry after short delay
            setTimeout(() => {
              recorderRef.current?.requestData();
            }, 25);
          }
        };

        recorderRef.current.onstop = () => {
          setIsListening(false);
        };
      })
      .catch((err) => console.error("Microphone access error:", err));

    return () => {
      recorderRef.current?.stop();
      recorderRef.current = null;
    };
  }, []);

  // Core transcription loop: when chunks arrive and we're not processing, send to worker
  useEffect(() => {
    if (!recorderRef.current) return;
    if (!isListening) return;
    if (isProcessing) return;
    if (status !== "ready") return;

    if (chunks.length > 0) {
      const blob = new Blob(chunks, {
        type: recorderRef.current.mimeType,
      });

      const fileReader = new FileReader();
      fileReader.onloadend = async () => {
        const arrayBuffer = fileReader.result as ArrayBuffer;
        const decoded =
          await audioContextRef.current!.decodeAudioData(arrayBuffer);
        let audio = decoded.getChannelData(0);
        if (audio.length > MAX_SAMPLES) {
          audio = audio.slice(-MAX_SAMPLES);
        }

        workerRef.current?.postMessage({
          type: "generate",
          data: { audio, language },
        });
      };
      fileReader.readAsArrayBuffer(blob);
    } else {
      recorderRef.current?.requestData();
    }
  }, [status, isListening, isProcessing, chunks, language]);

  const loadModel = useCallback((modelId?: string) => {
    workerRef.current?.postMessage({
      type: "load",
      data: { modelId: modelId || "onnx-community/whisper-base" },
    });
    setStatus("loading");
  }, []);

  const startListening = useCallback(() => {
    if (recorderRef.current && status === "ready") {
      setText("");
      setTps(null);
      recorderRef.current.start();
    }
  }, [status]);

  const stopListening = useCallback(() => {
    recorderRef.current?.stop();
  }, []);

  const reset = useCallback(() => {
    recorderRef.current?.stop();
    setText("");
    setTps(null);
    setChunks([]);
    // Restart if model is ready
    if (status === "ready") {
      setTimeout(() => {
        recorderRef.current?.start();
      }, 100);
    }
  }, [status]);

  return {
    status,
    loadingMessage,
    progressItems,
    text,
    tps,
    language,
    isListening,
    isProcessing,
    stream,
    analyserNode,
    setLanguage,
    loadModel,
    startListening,
    stopListening,
    reset,
  };
}
