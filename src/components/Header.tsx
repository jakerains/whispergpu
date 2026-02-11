"use client";

import { Waves } from "lucide-react";

interface HeaderProps {
  isWebGPUSupported: boolean;
  isCheckingWebGPU: boolean;
}

export function Header({ isWebGPUSupported, isCheckingWebGPU }: HeaderProps) {
  return (
    <header className="text-center mb-8 animate-fade-in-up">
      <div className="flex items-center justify-center gap-3 mb-4">
        <div
          className="p-2.5 rounded-xl animate-float"
          style={{ background: "var(--accent-bg)", border: "1px solid var(--accent-border)" }}
        >
          <Waves className="w-7 h-7" style={{ color: "var(--accent)" }} />
        </div>
        <h1
          className="text-3xl sm:text-4xl font-bold tracking-tight"
          style={{ fontFamily: "var(--font-display)", color: "var(--foreground)" }}
        >
          Speech to Text
        </h1>
      </div>
      <p className="text-sm mb-4 max-w-md mx-auto leading-relaxed" style={{ color: "var(--muted)" }}>
        Speech recognition powered by Whisper &amp; Parakeet — running entirely in your browser
      </p>
      <div className="flex items-center justify-center gap-2">
        {isCheckingWebGPU ? (
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
            style={{ background: "var(--surface)", color: "var(--muted)", border: "1px solid var(--border-subtle)" }}
          >
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--muted-light)" }} />
            Checking WebGPU...
          </span>
        ) : isWebGPUSupported ? (
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
            style={{ background: "var(--success-bg)", color: "var(--success)", border: "1px solid var(--success-border)" }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--success)" }} />
            WebGPU Available
          </span>
        ) : (
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
            style={{ background: "var(--warning-bg)", color: "var(--warning)", border: "1px solid var(--warning-border)" }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--warning)" }} />
            WebGPU Unavailable — Using WASM
          </span>
        )}
      </div>
    </header>
  );
}
