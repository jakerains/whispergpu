"use client";

import { MessageSquare } from "lucide-react";

interface ChatHeaderProps {
  isWebGPUSupported: boolean;
  isCheckingWebGPU: boolean;
}

export function ChatHeader({
  isWebGPUSupported,
  isCheckingWebGPU,
}: ChatHeaderProps) {
  return (
    <header className="text-center mb-8 animate-fade-in-up">
      <div className="flex items-center justify-center gap-3 mb-4">
        <div
          className="p-2.5 rounded-xl animate-float"
          style={{
            background: "var(--accent-bg)",
            border: "1px solid var(--accent-border)",
          }}
        >
          <MessageSquare className="w-7 h-7" style={{ color: "var(--accent)" }} />
        </div>
        <h1
          className="text-3xl sm:text-4xl font-bold tracking-tight"
          style={{
            fontFamily: "var(--font-display)",
            color: "var(--foreground)",
          }}
        >
          WebGPU Chat
        </h1>
      </div>
      <p
        className="text-sm mb-4 max-w-md mx-auto leading-relaxed"
        style={{ color: "var(--muted)" }}
      >
        Chat with language models running entirely in your browser via WebGPU
      </p>
      <div className="flex items-center justify-center gap-2">
        {isCheckingWebGPU ? (
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
            style={{
              background: "var(--surface)",
              color: "var(--muted)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: "var(--muted-light)" }}
            />
            Checking WebGPU...
          </span>
        ) : isWebGPUSupported ? (
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
            style={{
              background: "var(--success-bg)",
              color: "var(--success)",
              border: "1px solid var(--success-border)",
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: "var(--success)" }}
            />
            WebGPU Available
          </span>
        ) : (
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
            style={{
              background: "var(--error-bg)",
              color: "var(--error)",
              border: "1px solid var(--error-border)",
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: "var(--error)" }}
            />
            WebGPU Required for Chat
          </span>
        )}
      </div>
    </header>
  );
}
