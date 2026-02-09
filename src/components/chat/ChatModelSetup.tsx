"use client";

import {
  Settings,
  Download,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  HardDrive,
  RefreshCw,
} from "lucide-react";
import { clsx } from "clsx";
import { ProgressBar } from "../ProgressBar";
import { StatusIndicator } from "../StatusIndicator";
import type { ChatProgressItem } from "@/types/chat";
import { CHAT_MODELS } from "@/lib/chat-constants";

interface ChatModelSetupProps {
  isModelLoading: boolean;
  isModelReady: boolean;
  progressItems: ChatProgressItem[];
  error: string | null;
  modelId: string;
  cachedModelIds: Set<string>;
  onModelChange: (modelId: string) => void;
  onLoadModel: () => void;
}

export function ChatModelSetup({
  isModelLoading,
  isModelReady,
  progressItems,
  error,
  modelId,
  cachedModelIds,
  onModelChange,
  onLoadModel,
}: ChatModelSetupProps) {
  const selectedModel =
    CHAT_MODELS.find((m) => m.id === modelId) ?? CHAT_MODELS[0];
  const isSelectedCached = cachedModelIds.has(modelId);

  return (
    <div
      className="card p-6 mb-6 animate-fade-in-up"
      style={{ animationDelay: "0.1s" }}
    >
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <Settings
            className="w-[18px] h-[18px]"
            style={{ color: "var(--muted)" }}
          />
          <h2
            className="text-base font-semibold"
            style={{
              fontFamily: "var(--font-display)",
              color: "var(--foreground)",
            }}
          >
            Chat Model
          </h2>
        </div>
        <StatusIndicator
          status={
            isModelReady
              ? "ready"
              : isModelLoading
                ? "loading"
                : error
                  ? "error"
                  : "idle"
          }
        />
      </div>

      {!isModelReady && (
        <>
          {/* Model Selector */}
          <div className="mb-5">
            <label
              className="text-xs font-medium mb-2 block"
              style={{ color: "var(--muted)" }}
            >
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
                {CHAT_MODELS.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.label} — {model.size}
                    {cachedModelIds.has(model.id) ? " ✓ Cached" : ""}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                style={{ color: "var(--muted-light)" }}
              />
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <p
                className="text-xs"
                style={{ color: "var(--muted-light)" }}
              >
                {selectedModel.description}
              </p>
              {isSelectedCached && (
                <span
                  className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md shrink-0"
                  style={{
                    background: "var(--success-bg)",
                    color: "var(--success)",
                    border: "1px solid var(--success-border)",
                  }}
                >
                  <HardDrive className="w-2.5 h-2.5" />
                  Cached
                </span>
              )}
            </div>
          </div>

          {/* Load Button */}
          <button
            onClick={onLoadModel}
            disabled={isModelLoading}
            className={clsx(
              "w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all",
              isModelLoading
                ? "cursor-wait"
                : "hover:brightness-110 active:scale-[0.99]"
            )}
            style={{
              background: isModelLoading
                ? "var(--accent-bg)"
                : isSelectedCached
                  ? "var(--success)"
                  : "var(--accent)",
              color: isModelLoading ? "var(--accent)" : "#FFFFFF",
              border: isModelLoading
                ? "1px solid var(--accent-border)"
                : "none",
              boxShadow: isModelLoading
                ? "none"
                : isSelectedCached
                  ? "0 2px 12px rgba(90, 154, 110, 0.3)"
                  : "0 2px 12px rgba(194, 114, 78, 0.3)",
            }}
          >
            {isModelLoading ? (
              <>
                <div
                  className="w-4 h-4 border-2 rounded-full animate-spin"
                  style={{
                    borderColor: "var(--accent-border)",
                    borderTopColor: "var(--accent)",
                  }}
                />
                {isSelectedCached ? "Loading from Cache..." : "Downloading Model..."}
              </>
            ) : isSelectedCached ? (
              <>
                <HardDrive className="w-4 h-4" />
                Load from Cache
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Download Model
              </>
            )}
          </button>

          {/* Progress */}
          <ProgressBar items={progressItems} />

          {/* Error */}
          {error && (
            <div
              className="mt-4 flex items-start gap-2 p-3 rounded-xl"
              style={{
                background: "var(--error-bg)",
                border: "1px solid var(--error-border)",
              }}
            >
              <AlertCircle
                className="w-4 h-4 mt-0.5 shrink-0"
                style={{ color: "var(--error)" }}
              />
              <p className="text-sm" style={{ color: "var(--error)" }}>
                {error}
              </p>
            </div>
          )}
        </>
      )}

      {isModelReady && (
        <div className="space-y-3">
          <div
            className="flex items-center gap-3 p-4 rounded-xl"
            style={{
              background: "var(--success-bg)",
              border: "1px solid var(--success-border)",
            }}
          >
            <CheckCircle2
              className="w-5 h-5"
              style={{ color: "var(--success)" }}
            />
            <div className="flex-1">
              <p
                className="text-sm font-medium"
                style={{ color: "var(--success)" }}
              >
                Model Ready
              </p>
              <p
                className="text-xs"
                style={{ color: "var(--success)", opacity: 0.7 }}
              >
                {selectedModel.label} loaded on WebGPU
              </p>
            </div>
          </div>

          {/* Switch Model */}
          <div
            className="flex items-center gap-2 p-3 rounded-xl"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <div className="relative flex-1">
              <select
                value={modelId}
                onChange={(e) => onModelChange(e.target.value)}
                className="w-full appearance-none px-3 py-2 pr-8 rounded-lg text-xs font-medium transition-all focus:outline-none"
                style={{
                  background: "var(--card)",
                  color: "var(--foreground)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                {CHAT_MODELS.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.label} — {model.size}
                    {cachedModelIds.has(model.id) ? " ✓ Cached" : ""}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
                style={{ color: "var(--muted-light)" }}
              />
            </div>
            <button
              onClick={onLoadModel}
              className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all hover:brightness-110 active:scale-[0.97]"
              style={{
                background: "var(--accent)",
                color: "#FFFFFF",
                boxShadow: "0 2px 8px rgba(194, 114, 78, 0.3)",
              }}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Switch
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
