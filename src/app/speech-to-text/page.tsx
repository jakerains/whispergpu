"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { ModelSetup } from "@/components/ModelSetup";
import { TranscriptionPanel } from "@/components/TranscriptionPanel";
import { RealtimeTranscription } from "@/components/RealtimeTranscription";
import { useTranscriber } from "@/hooks/useTranscriber";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useRealtimeTranscriber } from "@/hooks/useRealtimeTranscriber";
import { useWebGPUSupport } from "@/hooks/useWebGPUSupport";
import { Mic, Radio } from "lucide-react";

type STTMode = "standard" | "realtime";

export default function SpeechToTextPage() {
  const { isSupported: isWebGPUSupported, isChecking: isCheckingWebGPU } =
    useWebGPUSupport();

  const [mode, setMode] = useState<STTMode>("standard");

  const transcriber = useTranscriber();
  const recorder = useAudioRecorder();
  const realtime = useRealtimeTranscriber();

  // Auto-set device based on WebGPU support
  useEffect(() => {
    if (!isCheckingWebGPU && !isWebGPUSupported) {
      transcriber.setDevice("wasm");
    }
  }, [isCheckingWebGPU, isWebGPUSupported]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStartRecording = async () => {
    await recorder.startRecording();
  };

  const handleStopRecording = async () => {
    const audio = await recorder.stopRecording();
    if (audio) {
      transcriber.transcribe(audio);
    }
  };

  return (
    <main className="min-h-screen">
      <div className="max-w-2xl mx-auto px-5 py-10 sm:py-14">
        <Header
          isWebGPUSupported={isWebGPUSupported}
          isCheckingWebGPU={isCheckingWebGPU}
        />

        {/* Mode Toggle */}
        <div className="card p-1.5 mb-6 animate-fade-in-up flex gap-1">
          <button
            onClick={() => setMode("standard")}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all"
            style={{
              background: mode === "standard" ? "var(--accent-bg)" : "transparent",
              color: mode === "standard" ? "var(--accent)" : "var(--muted)",
              border: mode === "standard" ? "1px solid var(--accent-border)" : "1px solid transparent",
            }}
          >
            <Mic className="w-4 h-4" />
            Standard
          </button>
          <button
            onClick={() => setMode("realtime")}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all"
            style={{
              background: mode === "realtime" ? "var(--accent-bg)" : "transparent",
              color: mode === "realtime" ? "var(--accent)" : "var(--muted)",
              border: mode === "realtime" ? "1px solid var(--accent-border)" : "1px solid transparent",
            }}
          >
            <Radio className="w-4 h-4" />
            Realtime
          </button>
        </div>

        {/* Standard Mode */}
        {mode === "standard" && (
          <>
            <ModelSetup
              isModelLoading={transcriber.isModelLoading}
              isModelReady={transcriber.isModelReady}
              progressItems={transcriber.progressItems}
              error={transcriber.error}
              device={transcriber.device}
              modelId={transcriber.modelId}
              isWebGPUSupported={isWebGPUSupported}
              onDeviceChange={transcriber.setDevice}
              onModelChange={transcriber.setModelId}
              onLoadModel={transcriber.loadModel}
            />

            <TranscriptionPanel
              isModelReady={transcriber.isModelReady}
              isRecording={recorder.isRecording}
              isTranscribing={transcriber.isTranscribing}
              duration={recorder.duration}
              transcript={transcriber.transcript}
              audioError={recorder.error}
              analyserNode={recorder.analyserNode}
              onStartRecording={handleStartRecording}
              onStopRecording={handleStopRecording}
            />
          </>
        )}

        {/* Realtime Mode */}
        {mode === "realtime" && (
          <RealtimeTranscription rt={realtime} />
        )}

        <footer className="mt-10 text-center">
          <div className="inline-flex items-center gap-1.5 text-xs" style={{ color: "var(--muted)" }}>
            <span>Powered by</span>
            <span className="font-medium" style={{ color: "var(--foreground)" }}>Transformers.js</span>
            <span>&</span>
            <span className="font-medium" style={{ color: "var(--foreground)" }}>Whisper</span>
          </div>
          <p className="text-xs mt-1" style={{ color: "var(--muted-light)" }}>
            All processing happens locally in your browser
          </p>
        </footer>
      </div>
    </main>
  );
}
