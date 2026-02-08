"use client";

import { useState } from "react";
import { User, Bot, Copy, Check, ChevronDown, ChevronRight, Brain } from "lucide-react";
import type { ChatMessage as ChatMessageType } from "@/types/chat";

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const [thinkingOpen, setThinkingOpen] = useState(false);
  const isUser = message.role === "user";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available
    }
  };

  return (
    <div
      className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"} animate-fade-in-up`}
    >
      {/* Avatar */}
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{
          background: isUser ? "var(--accent)" : "var(--surface)",
          border: isUser ? "none" : "1px solid var(--border-subtle)",
        }}
      >
        {isUser ? (
          <User className="w-4 h-4 text-white" />
        ) : (
          <Bot className="w-4 h-4" style={{ color: "var(--accent)" }} />
        )}
      </div>

      {/* Bubble */}
      <div
        className={`group relative max-w-[80%] px-4 py-3 rounded-2xl ${isUser ? "rounded-tr-md" : "rounded-tl-md"}`}
        style={{
          background: isUser ? "var(--accent)" : "var(--card)",
          color: isUser ? "#FFFFFF" : "var(--foreground)",
          border: isUser ? "none" : "1px solid var(--card-border)",
          boxShadow: isUser ? "none" : "var(--card-shadow)",
        }}
      >
        {/* Collapsible thinking section */}
        {!isUser && message.thinking && (
          <div className="mb-2">
            <button
              onClick={() => setThinkingOpen(!thinkingOpen)}
              className="flex items-center gap-1.5 text-xs font-medium py-1 px-2 rounded-lg transition-colors"
              style={{
                color: "var(--muted)",
                background: "var(--surface)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <Brain className="w-3 h-3" />
              <span>Reasoning</span>
              {thinkingOpen ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
            </button>
            {thinkingOpen && (
              <div
                className="mt-2 p-3 rounded-lg text-xs leading-relaxed whitespace-pre-wrap"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border-subtle)",
                  color: "var(--muted)",
                  maxHeight: "200px",
                  overflowY: "auto",
                }}
              >
                {message.thinking}
              </div>
            )}
          </div>
        )}

        <p className="text-sm leading-relaxed whitespace-pre-wrap">
          {message.content}
        </p>

        {/* Copy button for assistant messages */}
        {!isUser && (
          <button
            onClick={handleCopy}
            className="absolute -bottom-3 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border-subtle)",
            }}
            title="Copy message"
          >
            {copied ? (
              <Check className="w-3 h-3" style={{ color: "var(--success)" }} />
            ) : (
              <Copy className="w-3 h-3" style={{ color: "var(--muted)" }} />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
