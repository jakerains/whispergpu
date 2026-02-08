"use client";

import { Mic, Square, Clock } from "lucide-react";
import { clsx } from "clsx";
import { AudioVisualizer } from "./AudioVisualizer";
import { TranscriptDisplay } from "./TranscriptDisplay";
import { StatusIndicator } from "./StatusIndicator";
import type { TranscriberData } from "@/types/transcriber";

interface TranscriptionPanelProps {
  isModelReady: boolean;
  isRecording: boolean;
  isTranscribing: boolean;
  duration: number;
  transcript: TranscriberData | null;
  audioError: string | null;
  analyserNode: AnalyserNode | null;
  onStartRecording: () => void;
  onStopRecording: () => void;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function TranscriptionPanel({
  isModelReady,
  isRecording,
  isTranscribing,
  duration,
  transcript,
  audioError,
  analyserNode,
  onStartRecording,
  onStopRecording,
}: TranscriptionPanelProps) {
  const currentStatus = isRecording
    ? "recording"
    : isTranscribing
    ? "transcribing"
    : isModelReady
    ? "ready"
    : "idle";

  return (
    <div className="space-y-5">
      {/* Controls Card */}
      <div className="card p-6 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
        <div className="flex items-center justify-between mb-6">
          <h2
            className="text-base font-semibold"
            style={{ fontFamily: "var(--font-display)", color: "var(--foreground)" }}
          >
            Transcription
          </h2>
          <StatusIndicator status={currentStatus} />
        </div>

        {/* Mic Button */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            {/* Pulse rings when recording */}
            {isRecording && (
              <>
                <div
                  className="absolute inset-0 rounded-full animate-ping"
                  style={{ background: "rgba(212, 91, 91, 0.15)" }}
                />
                <div
                  className="absolute -inset-3 rounded-full"
                  style={{
                    border: "2px solid rgba(212, 91, 91, 0.25)",
                    animation: "pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                  }}
                />
              </>
            )}
            <button
              onClick={isRecording ? onStopRecording : onStartRecording}
              disabled={!isModelReady || isTranscribing}
              className={clsx(
                "relative z-10 w-20 h-20 rounded-full flex items-center justify-center transition-all",
                !isRecording && isModelReady && !isTranscribing && "hover:scale-105 active:scale-95",
                (!isModelReady || isTranscribing) && !isRecording && "cursor-not-allowed opacity-40"
              )}
              style={{
                background: isRecording
                  ? "var(--recording)"
                  : isModelReady && !isTranscribing
                  ? "var(--accent)"
                  : "var(--muted-light)",
                boxShadow: isRecording
                  ? "0 4px 20px rgba(212, 91, 91, 0.35)"
                  : isModelReady && !isTranscribing
                  ? "0 4px 20px rgba(194, 114, 78, 0.35)"
                  : "none",
              }}
            >
              {isRecording ? (
                <Square className="w-7 h-7 text-white" fill="white" />
              ) : (
                <Mic className="w-8 h-8 text-white" />
              )}
            </button>
          </div>

          {/* Duration */}
          {(isRecording || duration > 0) && (
            <div className="flex items-center gap-1.5 text-sm" style={{ color: "var(--muted)" }}>
              <Clock className="w-3.5 h-3.5" />
              <span style={{ fontFamily: "var(--font-mono)" }}>{formatDuration(duration)}</span>
            </div>
          )}

          {/* Helper text */}
          {!isModelReady && (
            <p className="text-xs" style={{ color: "var(--muted-light)" }}>
              Load the model first to start recording
            </p>
          )}
          {isModelReady && !isRecording && !isTranscribing && (
            <p className="text-xs" style={{ color: "var(--muted)" }}>
              Click the mic to start recording
            </p>
          )}
          {isRecording && (
            <p className="text-xs font-medium" style={{ color: "var(--recording)" }}>
              Recording... Click stop when done
            </p>
          )}
          {isTranscribing && (
            <p className="text-xs font-medium" style={{ color: "var(--warning)" }}>
              Processing your audio...
            </p>
          )}
        </div>

        {/* Audio Error */}
        {audioError && (
          <div
            className="mt-4 p-3 rounded-xl"
            style={{ background: "var(--error-bg)", border: "1px solid var(--error-border)" }}
          >
            <p className="text-sm" style={{ color: "var(--error)" }}>{audioError}</p>
          </div>
        )}

        {/* Visualizer */}
        <div className="mt-6">
          <AudioVisualizer analyserNode={analyserNode} isRecording={isRecording} />
        </div>
      </div>

      {/* Transcript */}
      <TranscriptDisplay transcript={transcript} isTranscribing={isTranscribing} />
    </div>
  );
}
