"use client";

import { Sparkles } from "lucide-react";
import { SUGGESTION_CHIPS } from "@/lib/chat-constants";

interface ChatEmptyStateProps {
  modelLabel: string;
  onSuggestionClick: (text: string) => void;
}

export function ChatEmptyState({
  modelLabel,
  onSuggestionClick,
}: ChatEmptyStateProps) {
  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-float"
          style={{
            background: "var(--accent-bg)",
            border: "1px solid var(--accent-border)",
          }}
        >
          <Sparkles className="w-7 h-7" style={{ color: "var(--accent)" }} />
        </div>
        <h3
          className="text-lg font-semibold mb-1"
          style={{
            fontFamily: "var(--font-display)",
            color: "var(--foreground)",
          }}
        >
          {modelLabel} is ready
        </h3>
        <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
          Start a conversation or try one of these suggestions
        </p>
        <div className="flex flex-wrap gap-2 justify-center">
          {SUGGESTION_CHIPS.map((chip) => (
            <button
              key={chip}
              onClick={() => onSuggestionClick(chip)}
              className="px-3.5 py-2 rounded-xl text-xs font-medium transition-all hover:brightness-95 active:scale-[0.98]"
              style={{
                background: "var(--surface)",
                color: "var(--muted)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              {chip}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
