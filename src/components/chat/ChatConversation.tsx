"use client";

import { useRef, useEffect } from "react";
import { Bot, Brain } from "lucide-react";
import type { ChatMessage as ChatMessageType } from "@/types/chat";
import { ChatMessage } from "./ChatMessage";

interface ChatConversationProps {
  messages: ChatMessageType[];
  streamingContent: string;
  streamingThinking: string;
  isGenerating: boolean;
  isThinking: boolean;
}

export function ChatConversation({
  messages,
  streamingContent,
  streamingThinking,
  isGenerating,
  isThinking,
}: ChatConversationProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages or streaming content
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent, streamingThinking]);

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto scrollbar-thin space-y-4 p-4"
      style={{ minHeight: 0 }}
    >
      {messages.map((msg) => (
        <ChatMessage key={msg.id} message={msg} />
      ))}

      {/* Streaming message */}
      {isGenerating && (
        <div className="flex gap-3 flex-row animate-fade-in-up">
          {/* Avatar */}
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <Bot className="w-4 h-4" style={{ color: "var(--accent)" }} />
          </div>

          {/* Streaming bubble */}
          <div
            className="max-w-[80%] px-4 py-3 rounded-2xl rounded-tl-md"
            style={{
              background: "var(--card)",
              border: "1px solid var(--card-border)",
              boxShadow: "var(--card-shadow)",
              color: "var(--foreground)",
            }}
          >
            {/* Thinking phase indicator */}
            {isThinking && (
              <div className="mb-2">
                <div
                  className="inline-flex items-center gap-1.5 text-xs font-medium py-1 px-2 rounded-lg"
                  style={{
                    color: "var(--accent)",
                    background: "var(--accent-bg)",
                    border: "1px solid var(--accent-border)",
                  }}
                >
                  <Brain className="w-3 h-3 animate-pulse" />
                  <span>Thinking...</span>
                </div>
                {streamingThinking && (
                  <div
                    className="mt-2 p-3 rounded-lg text-xs leading-relaxed whitespace-pre-wrap scrollbar-thin"
                    style={{
                      background: "var(--surface)",
                      border: "1px solid var(--border-subtle)",
                      color: "var(--muted)",
                      maxHeight: "150px",
                      overflowY: "auto",
                    }}
                  >
                    {streamingThinking}
                    <span
                      className="inline-block w-0.5 h-3 ml-0.5 align-text-bottom animate-blink"
                      style={{ background: "var(--muted-light)" }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Response content (shows after thinking, or directly if no thinking) */}
            {!isThinking && streamingContent ? (
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {streamingContent}
                <span
                  className="inline-block w-0.5 h-4 ml-0.5 align-text-bottom animate-blink"
                  style={{ background: "var(--accent)" }}
                />
              </p>
            ) : !isThinking && !streamingContent ? (
              <div className="flex items-center gap-1.5 py-0.5">
                <span
                  className="typing-dot"
                  style={{ background: "var(--muted-light)" }}
                />
                <span
                  className="typing-dot"
                  style={{
                    background: "var(--muted-light)",
                    animationDelay: "0.15s",
                  }}
                />
                <span
                  className="typing-dot"
                  style={{
                    background: "var(--muted-light)",
                    animationDelay: "0.3s",
                  }}
                />
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
