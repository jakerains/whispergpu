"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { ModelSetup } from "@/components/ModelSetup";
import { TranscriptionPanel } from "@/components/TranscriptionPanel";
import { RealtimeTranscription } from "@/components/RealtimeTranscription";
import { ParakeetTranscription } from "@/components/ParakeetTranscription";
import { useTranscriber } from "@/hooks/useTranscriber";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useRealtimeTranscriber } from "@/hooks/useRealtimeTranscriber";
import { useParakeetTranscriber } from "@/hooks/useParakeetTranscriber";
import { useWebGPUSupport } from "@/hooks/useWebGPUSupport";
import { Mic, Radio, AudioWaveform } from "lucide-react";

type STTMode = "standard" | "realtime" | "parakeet";

export default function SpeechToTextPage() {
  const { isSupported: isWebGPUSupported, isChecking: isCheckingWebGPU } =
    useWebGPUSupport();

  const [mode, setMode] = useState<STTMode>("standard");

  const transcriber = useTranscriber();
  const recorder = useAudioRecorder();
  const realtime = useRealtimeTranscriber();
  const parakeet = useParakeetTranscriber();

  // Auto-set device based on WebGPU support
  useEffect(() => {
    if (!isCheckingWebGPU && !isWebGPUSupported) {
      transcriber.setDevice("wasm");
      parakeet.setBackend("wasm");
    }
  }, [isCheckingWebGPU, isWebGPUSupported]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStartRecording = async () => {
    await recorder.startRecording();
  };

  const handleStopRecording = async () => {
    const audio = await recorder.stopRecording();
    if (audio) {
      if (mode === "parakeet") {
        parakeet.transcribe(audio);
      } else {
        transcriber.transcribe(audio);
      }
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
            Whisper
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
            Whisper Live
          </button>
          <button
            onClick={() => setMode("parakeet")}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all"
            style={{
              background: mode === "parakeet" ? "var(--accent-bg)" : "transparent",
              color: mode === "parakeet" ? "var(--accent)" : "var(--muted)",
              border: mode === "parakeet" ? "1px solid var(--accent-border)" : "1px solid transparent",
            }}
          >
            <AudioWaveform className="w-4 h-4" />
            Parakeet
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

        {/* Parakeet Mode */}
        {mode === "parakeet" && (
          <ParakeetTranscription
            pk={parakeet}
            isWebGPUSupported={isWebGPUSupported}
            isRecording={recorder.isRecording}
            duration={recorder.duration}
            audioError={recorder.error}
            analyserNode={recorder.analyserNode}
            onStartRecording={handleStartRecording}
            onStopRecording={handleStopRecording}
          />
        )}

        <footer className="mt-10 text-center">
          <div className="inline-flex items-center gap-1.5 text-xs flex-wrap justify-center" style={{ color: "var(--muted)" }}>
            <span>Powered by</span>
            <span className="font-medium" style={{ color: "var(--foreground)" }}>Transformers.js</span>
            <span>&</span>
            <span className="font-medium" style={{ color: "var(--foreground)" }}>Whisper</span>
            <span>&</span>
            <span className="font-medium" style={{ color: "var(--foreground)" }}>Parakeet.js</span>
          </div>
          <p className="text-xs mt-1" style={{ color: "var(--muted-light)" }}>
            All processing happens locally in your browser
          </p>
        </footer>
      </div>
    </main>
  );
}
