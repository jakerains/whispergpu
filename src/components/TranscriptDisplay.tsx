"use client";

import { useRef, useEffect, useState } from "react";
import { Copy, Check, FileText } from "lucide-react";
import type { TranscriberData } from "@/types/transcriber";

interface TranscriptDisplayProps {
  transcript: TranscriberData | null;
  isTranscribing: boolean;
}

function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function TranscriptDisplay({ transcript, isTranscribing }: TranscriptDisplayProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript]);

  const handleCopy = async () => {
    if (!transcript?.text) return;
    try {
      await navigator.clipboard.writeText(transcript.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available
    }
  };

  const hasContent = transcript && (transcript.text || transcript.chunks.length > 0);

  return (
    <div className="card overflow-hidden animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
      <div
        className="flex items-center justify-between px-5 py-3"
        style={{ borderBottom: "1px solid var(--card-border)" }}
      >
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4" style={{ color: "var(--muted)" }} />
          <h3 className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
            Transcript
          </h3>
        </div>
        {hasContent && (
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
            style={{
              background: copied ? "var(--success-bg)" : "var(--surface)",
              color: copied ? "var(--success)" : "var(--muted)",
              border: `1px solid ${copied ? "var(--success-border)" : "var(--border-subtle)"}`,
            }}
          >
            {copied ? (
              <>
                <Check className="w-3 h-3" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                Copy
              </>
            )}
          </button>
        )}
      </div>

      <div
        ref={scrollRef}
        className="p-5 max-h-64 overflow-y-auto scrollbar-thin"
      >
        {!hasContent && !isTranscribing && (
          <p className="text-sm text-center py-6" style={{ color: "var(--muted-light)" }}>
            Transcript will appear here after recording...
          </p>
        )}

        {isTranscribing && !hasContent && (
          <div className="flex items-center gap-2 py-6 justify-center">
            <div
              className="w-4 h-4 border-2 rounded-full animate-spin"
              style={{ borderColor: "var(--warning-border)", borderTopColor: "var(--warning)" }}
            />
            <span className="text-sm" style={{ color: "var(--warning)" }}>Transcribing audio...</span>
          </div>
        )}

        {hasContent && transcript.chunks.length > 0 && (
          <div className="space-y-3">
            {transcript.chunks.map((chunk, index) => (
              <div key={index} className="flex gap-3">
                <span
                  className="text-xs pt-0.5 shrink-0"
                  style={{ fontFamily: "var(--font-mono)", color: "var(--accent-light)" }}
                >
                  {formatTimestamp(chunk.timestamp[0])}
                </span>
                <p className="text-sm leading-relaxed" style={{ color: "var(--foreground)" }}>
                  {chunk.text}
                  {index === transcript.chunks.length - 1 && isTranscribing && (
                    <span
                      className="inline-block w-0.5 h-4 ml-0.5 animate-blink align-middle"
                      style={{ background: "var(--accent)" }}
                    />
                  )}
                </p>
              </div>
            ))}
          </div>
        )}

        {hasContent && transcript.chunks.length === 0 && transcript.text && (
          <p className="text-sm leading-relaxed" style={{ color: "var(--foreground)" }}>
            {transcript.text}
            {isTranscribing && (
              <span
                className="inline-block w-0.5 h-4 ml-0.5 animate-blink align-middle"
                style={{ background: "var(--accent)" }}
              />
            )}
          </p>
        )}
      </div>
    </div>
  );
}
