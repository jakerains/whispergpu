"use client";

import { Mic, Square, RotateCcw, Loader2, Download, Zap } from "lucide-react";
import { AudioVisualizer } from "./AudioVisualizer";
import { ProgressBar } from "./ProgressBar";
import type { RealtimeTranscriberState } from "@/hooks/useRealtimeTranscriber";

const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "it", name: "Italian" },
  { code: "pt", name: "Portuguese" },
  { code: "nl", name: "Dutch" },
  { code: "ru", name: "Russian" },
  { code: "zh", name: "Chinese" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "ar", name: "Arabic" },
  { code: "hi", name: "Hindi" },
  { code: "tr", name: "Turkish" },
  { code: "vi", name: "Vietnamese" },
  { code: "th", name: "Thai" },
  { code: "sv", name: "Swedish" },
  { code: "pl", name: "Polish" },
  { code: "uk", name: "Ukrainian" },
];

interface RealtimeTranscriptionProps {
  rt: RealtimeTranscriberState;
}

export function RealtimeTranscription({ rt }: RealtimeTranscriptionProps) {
  const progressItems = rt.progressItems.map((item) => ({
    ...item,
    loaded: 0,
    status: "progress" as const,
  }));

  return (
    <div className="space-y-5">
      {/* Load Model Card */}
      {rt.status !== "ready" && (
        <div className="card p-6 animate-fade-in-up">
          <div className="flex items-center gap-2.5 mb-4">
            <Zap className="w-[18px] h-[18px]" style={{ color: "var(--accent)" }} />
            <h2
              className="text-base font-semibold"
              style={{ fontFamily: "var(--font-display)", color: "var(--foreground)" }}
            >
              Realtime Model
            </h2>
          </div>

          <p className="text-sm mb-4 leading-relaxed" style={{ color: "var(--muted)" }}>
            Uses <span className="font-medium" style={{ color: "var(--foreground)" }}>whisper-base</span> (~200 MB)
            with WebGPU acceleration. The model streams transcription token-by-token as you speak.
            Once loaded, it&apos;s cached for future visits.
          </p>

          {rt.status === "idle" && (
            <button
              onClick={() => rt.loadModel()}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all hover:brightness-110 active:scale-[0.99]"
              style={{
                background: "var(--accent)",
                color: "#fff",
                boxShadow: "0 2px 12px rgba(194, 114, 78, 0.3)",
              }}
            >
              <Download className="w-4 h-4" />
              Load Realtime Model
            </button>
          )}

          {rt.status === "loading" && (
            <div>
              <div className="flex items-center gap-2 mb-3 text-sm" style={{ color: "var(--accent)" }}>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="font-medium">{rt.loadingMessage}</span>
              </div>
              <ProgressBar items={progressItems} />
            </div>
          )}
        </div>
      )}

      {/* Live Transcription Card */}
      {rt.status === "ready" && (
        <div className="card p-6 animate-fade-in-up">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <Mic className="w-[18px] h-[18px]" style={{ color: rt.isListening ? "var(--recording)" : "var(--muted)" }} />
                {rt.isListening && (
                  <span
                    className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full animate-pulse"
                    style={{ background: "var(--recording)" }}
                  />
                )}
              </div>
              <h2
                className="text-base font-semibold"
                style={{ fontFamily: "var(--font-display)", color: "var(--foreground)" }}
              >
                Live Transcription
              </h2>
            </div>

            {rt.tps && (
              <span
                className="text-xs font-medium px-2 py-1 rounded-full"
                style={{
                  fontFamily: "var(--font-mono)",
                  background: "var(--success-bg)",
                  color: "var(--success)",
                  border: "1px solid var(--success-border)",
                }}
              >
                {rt.tps.toFixed(1)} tok/s
              </span>
            )}
          </div>

          {/* Audio Visualizer */}
          <div className="mb-4">
            <AudioVisualizer analyserNode={rt.analyserNode} isRecording={rt.isListening} />
          </div>

          {/* Transcript Display */}
          <div
            className="min-h-[100px] max-h-[200px] overflow-y-auto rounded-xl p-4 mb-4 text-sm leading-relaxed"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border-subtle)",
              color: rt.text ? "var(--foreground)" : "var(--muted-light)",
            }}
          >
            {rt.text || (rt.isListening ? "Listening... start speaking" : "Click Start to begin")}
            {rt.isProcessing && (
              <span
                className="inline-block w-1.5 h-4 ml-0.5 align-middle animate-pulse rounded-sm"
                style={{ background: "var(--accent)" }}
              />
            )}
          </div>

          {/* Language Selector */}
          <div className="mb-4">
            <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--muted)" }}>
              Language
            </label>
            <select
              value={rt.language}
              onChange={(e) => {
                rt.stopListening();
                rt.setLanguage(e.target.value);
                setTimeout(() => rt.startListening(), 100);
              }}
              className="w-full rounded-lg px-3 py-2 text-sm"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border-subtle)",
                color: "var(--foreground)",
              }}
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>

          {/* Controls */}
          <div className="flex gap-2">
            {!rt.isListening ? (
              <button
                onClick={rt.startListening}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:brightness-110 active:scale-[0.99]"
                style={{
                  background: "var(--accent)",
                  color: "#fff",
                  boxShadow: "0 2px 12px rgba(194, 114, 78, 0.3)",
                }}
              >
                <Mic className="w-4 h-4" />
                Start
              </button>
            ) : (
              <button
                onClick={rt.stopListening}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:brightness-110 active:scale-[0.99]"
                style={{
                  background: "var(--recording)",
                  color: "#fff",
                  boxShadow: "0 2px 12px rgba(212, 91, 91, 0.3)",
                }}
              >
                <Square className="w-4 h-4" fill="white" />
                Stop
              </button>
            )}
            <button
              onClick={rt.reset}
              className="px-3 py-2.5 rounded-xl text-sm font-medium transition-all hover:brightness-110"
              style={{
                background: "var(--surface)",
                color: "var(--muted)",
                border: "1px solid var(--border-subtle)",
              }}
              title="Reset transcript"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
