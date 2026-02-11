"use client";

import { useState } from "react";
import {
  Settings,
  Download,
  CheckCircle2,
  AlertCircle,
  Cpu,
  Zap,
  ChevronDown,
  Mic,
  Square,
  Clock,
  Activity,
  RotateCcw,
  Radio,
  HardDrive,
} from "lucide-react";
import { clsx } from "clsx";
import { ProgressBar } from "./ProgressBar";
import { StatusIndicator } from "./StatusIndicator";
import { AudioVisualizer } from "./AudioVisualizer";
import { PARAKEET_MODELS } from "@/lib/parakeet-constants";
import type { ParakeetTranscriberState, ParakeetWord, ParakeetMetrics } from "@/hooks/useParakeetTranscriber";

type ParakeetSubMode = "standard" | "realtime";

interface ParakeetTranscriptionProps {
  pk: ParakeetTranscriberState;
  isWebGPUSupported: boolean;
  // Standard sub-mode: external recorder
  isRecording: boolean;
  isRecorderReady?: boolean;
  duration: number;
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

function WordTimeline({ words }: { words: ParakeetWord[] }) {
  if (words.length === 0) return null;

  return (
    <div className="space-y-1">
      <label className="text-xs font-medium block" style={{ color: "var(--muted)" }}>
        Word Timestamps
      </label>
      <div className="flex flex-wrap gap-1">
        {words.map((word, i) => {
          const confidence = word.confidence ?? 1;
          const opacity = 0.5 + confidence * 0.5;
          return (
            <span
              key={i}
              className="inline-flex items-baseline gap-1 px-1.5 py-0.5 rounded text-xs"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border-subtle)",
                opacity,
              }}
              title={`${word.start_time.toFixed(2)}s – ${word.end_time.toFixed(2)}s (${(confidence * 100).toFixed(0)}%)`}
            >
              <span style={{ color: "var(--foreground)" }}>{word.text}</span>
              <span style={{ color: "var(--muted-light)", fontFamily: "var(--font-mono)", fontSize: "10px" }}>
                {word.start_time.toFixed(1)}s
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

function MetricsDisplay({ metrics }: { metrics: ParakeetMetrics }) {
  return (
    <div
      className="flex flex-wrap gap-3 p-3 rounded-xl text-xs"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border-subtle)",
        fontFamily: "var(--font-mono)",
      }}
    >
      <div>
        <span style={{ color: "var(--muted)" }}>RTF </span>
        <span style={{ color: "var(--accent)" }}>{metrics.rtf.toFixed(3)}x</span>
      </div>
      <div>
        <span style={{ color: "var(--muted)" }}>Total </span>
        <span style={{ color: "var(--foreground)" }}>{metrics.total_ms.toFixed(0)}ms</span>
      </div>
      <div>
        <span style={{ color: "var(--muted)" }}>Encode </span>
        <span style={{ color: "var(--foreground)" }}>{metrics.encode_ms.toFixed(0)}ms</span>
      </div>
      <div>
        <span style={{ color: "var(--muted)" }}>Decode </span>
        <span style={{ color: "var(--foreground)" }}>{metrics.decode_ms.toFixed(0)}ms</span>
      </div>
    </div>
  );
}

export function ParakeetTranscription({
  pk,
  isWebGPUSupported,
  isRecording,
  duration,
  audioError,
  analyserNode,
  onStartRecording,
  onStopRecording,
}: ParakeetTranscriptionProps) {
  const [subMode, setSubMode] = useState<ParakeetSubMode>("standard");
  const selectedModel = PARAKEET_MODELS.find((m) => m.key === pk.modelKey) ?? PARAKEET_MODELS[0];
  const isCurrentModelCached = pk.cachedModelKeys.has(pk.modelKey);

  const currentStatus = pk.isStreaming
    ? "recording"
    : isRecording
    ? "recording"
    : pk.isTranscribing || pk.isStreamProcessing
    ? "transcribing"
    : pk.isModelReady
    ? "ready"
    : "idle";

  return (
    <div className="space-y-5">
      {/* Model Setup Card */}
      <div className="card p-6 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <Settings className="w-[18px] h-[18px]" style={{ color: "var(--muted)" }} />
            <h2
              className="text-base font-semibold"
              style={{ fontFamily: "var(--font-display)", color: "var(--foreground)" }}
            >
              Parakeet Setup
            </h2>
          </div>
          <StatusIndicator
            status={pk.isModelReady ? "ready" : pk.isModelLoading ? "loading" : pk.error ? "error" : "idle"}
          />
        </div>

        {!pk.isModelReady && (
          <>
            {/* Backend Toggle */}
            <div className="mb-5">
              <label className="text-xs font-medium mb-2 block" style={{ color: "var(--muted)" }}>
                Inference Backend
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => pk.setBackend("webgpu")}
                  disabled={!isWebGPUSupported || pk.isModelLoading}
                  className={clsx(
                    "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
                    (!isWebGPUSupported || pk.isModelLoading) && "opacity-40 cursor-not-allowed"
                  )}
                  style={{
                    background: pk.backend === "webgpu" ? "var(--accent-bg)" : "var(--surface)",
                    color: pk.backend === "webgpu" ? "var(--accent)" : "var(--muted)",
                    border: `1px solid ${pk.backend === "webgpu" ? "var(--accent-border)" : "var(--border-subtle)"}`,
                  }}
                >
                  <Zap className="w-4 h-4" />
                  WebGPU
                </button>
                <button
                  onClick={() => pk.setBackend("wasm")}
                  disabled={pk.isModelLoading}
                  className={clsx(
                    "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
                    pk.isModelLoading && "opacity-40 cursor-not-allowed"
                  )}
                  style={{
                    background: pk.backend === "wasm" ? "var(--accent-bg)" : "var(--surface)",
                    color: pk.backend === "wasm" ? "var(--accent)" : "var(--muted)",
                    border: `1px solid ${pk.backend === "wasm" ? "var(--accent-border)" : "var(--border-subtle)"}`,
                  }}
                >
                  <Cpu className="w-4 h-4" />
                  WASM
                </button>
              </div>
            </div>

            {/* Model Selector */}
            <div className="mb-5">
              <label className="text-xs font-medium mb-2 block" style={{ color: "var(--muted)" }}>
                Model
              </label>
              <div className="relative">
                <select
                  value={pk.modelKey}
                  onChange={(e) => pk.setModelKey(e.target.value)}
                  disabled={pk.isModelLoading}
                  className={clsx(
                    "w-full appearance-none px-4 py-2.5 pr-10 rounded-xl text-sm font-medium transition-all focus:outline-none",
                    pk.isModelLoading && "opacity-40 cursor-not-allowed"
                  )}
                  style={{
                    background: "var(--surface)",
                    color: "var(--foreground)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  {PARAKEET_MODELS.map((model) => (
                    <option key={model.key} value={model.key}>
                      {model.label} — {model.size}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                  style={{ color: "var(--muted-light)" }}
                />
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                <p className="text-xs" style={{ color: "var(--muted-light)" }}>
                  {selectedModel.description} — {selectedModel.languages}
                </p>
                {isCurrentModelCached && (
                  <span
                    className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full shrink-0"
                    style={{
                      background: "var(--success-bg)",
                      color: "var(--success)",
                      border: "1px solid var(--success-border)",
                    }}
                  >
                    <HardDrive className="w-3 h-3" />
                    Cached
                  </span>
                )}
              </div>
            </div>

            {/* Load Button */}
            <button
              onClick={pk.loadModel}
              disabled={pk.isModelLoading}
              className={clsx(
                "w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all",
                pk.isModelLoading ? "cursor-wait" : "hover:brightness-110 active:scale-[0.99]"
              )}
              style={{
                background: pk.isModelLoading ? "var(--accent-bg)" : "var(--accent)",
                color: pk.isModelLoading ? "var(--accent)" : "#FFFFFF",
                border: pk.isModelLoading ? "1px solid var(--accent-border)" : "none",
                boxShadow: pk.isModelLoading ? "none" : "0 2px 12px rgba(194, 114, 78, 0.3)",
              }}
            >
              {pk.isModelLoading ? (
                <>
                  <div
                    className="w-4 h-4 border-2 rounded-full animate-spin"
                    style={{ borderColor: "var(--accent-border)", borderTopColor: "var(--accent)" }}
                  />
                  {isCurrentModelCached ? "Loading from cache..." : "Downloading model..."}
                </>
              ) : (
                <>
                  {isCurrentModelCached ? (
                    <HardDrive className="w-4 h-4" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  {isCurrentModelCached ? "Load Parakeet (Cached)" : "Load Parakeet Model"}
                </>
              )}
            </button>

            {/* Progress */}
            <ProgressBar items={pk.progressItems} />

            {/* Error */}
            {pk.error && (
              <div
                className="mt-4 flex items-start gap-2 p-3 rounded-xl"
                style={{ background: "var(--error-bg)", border: "1px solid var(--error-border)" }}
              >
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "var(--error)" }} />
                <p className="text-sm" style={{ color: "var(--error)" }}>{pk.error}</p>
              </div>
            )}
          </>
        )}

        {pk.isModelReady && (
          <div
            className="flex items-center gap-3 p-4 rounded-xl"
            style={{ background: "var(--success-bg)", border: "1px solid var(--success-border)" }}
          >
            <CheckCircle2 className="w-5 h-5" style={{ color: "var(--success)" }} />
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--success)" }}>Parakeet Ready</p>
              <p className="text-xs" style={{ color: "var(--success)", opacity: 0.7 }}>
                {selectedModel.label} loaded on {pk.backend === "webgpu" ? "WebGPU" : "WASM"}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Sub-Mode Toggle (only when model is ready) */}
      {pk.isModelReady && (
        <div className="card p-1.5 animate-fade-in-up flex gap-1" style={{ animationDelay: "0.15s" }}>
          <button
            onClick={() => setSubMode("standard")}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: subMode === "standard" ? "var(--accent-bg)" : "transparent",
              color: subMode === "standard" ? "var(--accent)" : "var(--muted)",
              border: subMode === "standard" ? "1px solid var(--accent-border)" : "1px solid transparent",
            }}
          >
            <Mic className="w-3.5 h-3.5" />
            Record &amp; Transcribe
          </button>
          <button
            onClick={() => setSubMode("realtime")}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: subMode === "realtime" ? "var(--accent-bg)" : "transparent",
              color: subMode === "realtime" ? "var(--accent)" : "var(--muted)",
              border: subMode === "realtime" ? "1px solid var(--accent-border)" : "1px solid transparent",
            }}
          >
            <Radio className="w-3.5 h-3.5" />
            Realtime
          </button>
        </div>
      )}

      {/* ──── STANDARD SUB-MODE ──── */}
      {pk.isModelReady && subMode === "standard" && (
        <>
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
                  disabled={pk.isTranscribing}
                  className={clsx(
                    "relative z-10 w-20 h-20 rounded-full flex items-center justify-center transition-all",
                    !isRecording && !pk.isTranscribing && "hover:scale-105 active:scale-95",
                    pk.isTranscribing && !isRecording && "cursor-not-allowed opacity-40"
                  )}
                  style={{
                    background: isRecording
                      ? "var(--recording)"
                      : !pk.isTranscribing
                      ? "var(--accent)"
                      : "var(--muted-light)",
                    boxShadow: isRecording
                      ? "0 4px 20px rgba(212, 91, 91, 0.35)"
                      : !pk.isTranscribing
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

              {(isRecording || duration > 0) && (
                <div className="flex items-center gap-1.5 text-sm" style={{ color: "var(--muted)" }}>
                  <Clock className="w-3.5 h-3.5" />
                  <span style={{ fontFamily: "var(--font-mono)" }}>{formatDuration(duration)}</span>
                </div>
              )}

              {!isRecording && !pk.isTranscribing && (
                <p className="text-xs" style={{ color: "var(--muted)" }}>
                  Click the mic to start recording (max 30s)
                </p>
              )}
              {isRecording && (
                <p className="text-xs font-medium" style={{ color: "var(--recording)" }}>
                  Recording... Click stop when done
                </p>
              )}
              {pk.isTranscribing && (
                <p className="text-xs font-medium" style={{ color: "var(--warning)" }}>
                  Processing with Parakeet...
                </p>
              )}
            </div>

            {audioError && (
              <div
                className="mt-4 p-3 rounded-xl"
                style={{ background: "var(--error-bg)", border: "1px solid var(--error-border)" }}
              >
                <p className="text-sm" style={{ color: "var(--error)" }}>{audioError}</p>
              </div>
            )}

            <div className="mt-6">
              <AudioVisualizer analyserNode={analyserNode} isRecording={isRecording} />
            </div>
          </div>

          {/* Standard Results Card */}
          {pk.result && (
            <div className="card p-6 animate-fade-in-up space-y-4">
              <div className="flex items-center gap-2.5">
                <Activity className="w-[18px] h-[18px]" style={{ color: "var(--accent)" }} />
                <h2
                  className="text-base font-semibold"
                  style={{ fontFamily: "var(--font-display)", color: "var(--foreground)" }}
                >
                  Results
                </h2>
              </div>

              <div
                className="p-4 rounded-xl text-sm leading-relaxed"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border-subtle)",
                  color: "var(--foreground)",
                }}
              >
                {pk.result.text || "(No speech detected)"}
              </div>

              {pk.result.words.length > 0 && <WordTimeline words={pk.result.words} />}

              {pk.result.metrics && (
                <div>
                  <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--muted)" }}>
                    Performance
                  </label>
                  <MetricsDisplay metrics={pk.result.metrics} />
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ──── REALTIME SUB-MODE ──── */}
      {pk.isModelReady && subMode === "realtime" && (
        <div className="card p-6 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <Radio
                  className="w-[18px] h-[18px]"
                  style={{ color: pk.isStreaming ? "var(--recording)" : "var(--muted)" }}
                />
                {pk.isStreaming && (
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
            <StatusIndicator status={currentStatus} />
          </div>

          {/* Audio Visualizer */}
          <div className="mb-4">
            <AudioVisualizer analyserNode={pk.analyserNode} isRecording={pk.isStreaming} />
          </div>

          {/* Live Transcript Display */}
          <div
            className="min-h-[100px] max-h-[200px] overflow-y-auto rounded-xl p-4 mb-4 text-sm leading-relaxed"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border-subtle)",
              color: pk.liveText ? "var(--foreground)" : "var(--muted-light)",
            }}
          >
            {pk.liveText || (pk.isStreaming ? "Listening... start speaking" : "Click Start to begin")}
            {pk.isStreamProcessing && (
              <span
                className="inline-block w-1.5 h-4 ml-0.5 align-middle animate-pulse rounded-sm"
                style={{ background: "var(--accent)" }}
              />
            )}
          </div>

          {/* Live Word Timeline */}
          {pk.liveWords.length > 0 && (
            <div className="mb-4">
              <WordTimeline words={pk.liveWords} />
            </div>
          )}

          {/* Live Performance Metrics */}
          {pk.liveMetrics && (
            <div className="mb-4">
              <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--muted)" }}>
                Performance
              </label>
              <MetricsDisplay metrics={pk.liveMetrics} />
            </div>
          )}

          {/* Controls */}
          <div className="flex gap-2">
            {!pk.isStreaming ? (
              <button
                onClick={pk.startStreaming}
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
                onClick={pk.stopStreaming}
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
              onClick={pk.resetStream}
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

      {/* Error (shown in any sub-mode) */}
      {pk.isModelReady && pk.error && (
        <div
          className="card p-4 flex items-start gap-2"
          style={{ background: "var(--error-bg)", border: "1px solid var(--error-border)" }}
        >
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "var(--error)" }} />
          <p className="text-sm" style={{ color: "var(--error)" }}>{pk.error}</p>
        </div>
      )}
    </div>
  );
}
