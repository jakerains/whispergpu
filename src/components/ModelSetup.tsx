"use client";

import { Settings, Download, CheckCircle2, AlertCircle, Cpu, Zap, ChevronDown } from "lucide-react";
import { clsx } from "clsx";
import { ProgressBar } from "./ProgressBar";
import { StatusIndicator } from "./StatusIndicator";
import type { TranscriberProgressItem } from "@/types/transcriber";
import { WHISPER_MODELS } from "@/lib/constants";

interface ModelSetupProps {
  isModelLoading: boolean;
  isModelReady: boolean;
  progressItems: TranscriberProgressItem[];
  error: string | null;
  device: "webgpu" | "wasm";
  modelId: string;
  isWebGPUSupported: boolean;
  onDeviceChange: (device: "webgpu" | "wasm") => void;
  onModelChange: (modelId: string) => void;
  onLoadModel: () => void;
}

export function ModelSetup({
  isModelLoading,
  isModelReady,
  progressItems,
  error,
  device,
  modelId,
  isWebGPUSupported,
  onDeviceChange,
  onModelChange,
  onLoadModel,
}: ModelSetupProps) {
  const selectedModel = WHISPER_MODELS.find((m) => m.id === modelId) ?? WHISPER_MODELS[0];
  return (
    <div className="card p-6 mb-6 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <Settings className="w-[18px] h-[18px]" style={{ color: "var(--muted)" }} />
          <h2
            className="text-base font-semibold"
            style={{ fontFamily: "var(--font-display)", color: "var(--foreground)" }}
          >
            Model Setup
          </h2>
        </div>
        <StatusIndicator
          status={isModelReady ? "ready" : isModelLoading ? "loading" : error ? "error" : "idle"}
        />
      </div>

      {!isModelReady && (
        <>
          {/* Device Toggle */}
          <div className="mb-5">
            <label className="text-xs font-medium mb-2 block" style={{ color: "var(--muted)" }}>
              Inference Device
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => onDeviceChange("webgpu")}
                disabled={!isWebGPUSupported || isModelLoading}
                className={clsx(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
                  (!isWebGPUSupported || isModelLoading) && "opacity-40 cursor-not-allowed"
                )}
                style={{
                  background: device === "webgpu" ? "var(--accent-bg)" : "var(--surface)",
                  color: device === "webgpu" ? "var(--accent)" : "var(--muted)",
                  border: `1px solid ${device === "webgpu" ? "var(--accent-border)" : "var(--border-subtle)"}`,
                }}
              >
                <Zap className="w-4 h-4" />
                WebGPU
              </button>
              <button
                onClick={() => onDeviceChange("wasm")}
                disabled={isModelLoading}
                className={clsx(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
                  isModelLoading && "opacity-40 cursor-not-allowed"
                )}
                style={{
                  background: device === "wasm" ? "var(--accent-bg)" : "var(--surface)",
                  color: device === "wasm" ? "var(--accent)" : "var(--muted)",
                  border: `1px solid ${device === "wasm" ? "var(--accent-border)" : "var(--border-subtle)"}`,
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
                value={modelId}
                onChange={(e) => onModelChange(e.target.value)}
                disabled={isModelLoading}
                className={clsx(
                  "w-full appearance-none px-4 py-2.5 pr-10 rounded-xl text-sm font-medium transition-all focus:outline-none",
                  isModelLoading && "opacity-40 cursor-not-allowed"
                )}
                style={{
                  background: "var(--surface)",
                  color: "var(--foreground)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                {WHISPER_MODELS.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.label} — {model.size}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "var(--muted-light)" }} />
            </div>
            <p className="text-xs mt-1.5" style={{ color: "var(--muted-light)" }}>
              {selectedModel.description}
            </p>
          </div>

          {/* Load Button */}
          <button
            onClick={onLoadModel}
            disabled={isModelLoading}
            className={clsx(
              "w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all",
              isModelLoading ? "cursor-wait" : "hover:brightness-110 active:scale-[0.99]"
            )}
            style={{
              background: isModelLoading ? "var(--accent-bg)" : "var(--accent)",
              color: isModelLoading ? "var(--accent)" : "#FFFFFF",
              border: isModelLoading ? "1px solid var(--accent-border)" : "none",
              boxShadow: isModelLoading ? "none" : "0 2px 12px rgba(194, 114, 78, 0.3)",
            }}
          >
            {isModelLoading ? (
              <>
                <div
                  className="w-4 h-4 border-2 rounded-full animate-spin"
                  style={{ borderColor: "var(--accent-border)", borderTopColor: "var(--accent)" }}
                />
                Loading Model...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Load Whisper Model
              </>
            )}
          </button>

          {/* Progress */}
          <ProgressBar items={progressItems} />

          {/* Error */}
          {error && (
            <div
              className="mt-4 flex items-start gap-2 p-3 rounded-xl"
              style={{ background: "var(--error-bg)", border: "1px solid var(--error-border)" }}
            >
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "var(--error)" }} />
              <p className="text-sm" style={{ color: "var(--error)" }}>{error}</p>
            </div>
          )}
        </>
      )}

      {isModelReady && (
        <div
          className="flex items-center gap-3 p-4 rounded-xl"
          style={{ background: "var(--success-bg)", border: "1px solid var(--success-border)" }}
        >
          <CheckCircle2 className="w-5 h-5" style={{ color: "var(--success)" }} />
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--success)" }}>Model Ready</p>
            <p className="text-xs" style={{ color: "var(--success)", opacity: 0.7 }}>
              {selectedModel.label} loaded on {device === "webgpu" ? "WebGPU" : "WASM"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
