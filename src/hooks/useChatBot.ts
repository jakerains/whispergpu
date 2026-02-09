"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type {
  ChatMessage,
  ChatProgressItem,
  ChatWorkerOutgoingMessage,
  ChatModelLoadProgress,
} from "@/types/chat";
import {
  CHAT_MODELS,
  DEFAULT_CHAT_MODEL_ID,
  DEFAULT_SYSTEM_PROMPT,
} from "@/lib/chat-constants";
import { getCachedModelIds } from "@/lib/model-cache";

export type ChatStatus = "idle" | "submitted" | "streaming" | "error";

interface ParsedStream {
  thinking: string;
  response: string;
  isThinking: boolean;
}

/**
 * Parses a raw token stream that may contain <think>...</think> blocks.
 * Returns the separated thinking and response content, plus whether
 * we're currently inside a thinking block.
 */
function parseThinkingFromRaw(raw: string): ParsedStream {
  const thinkStart = raw.indexOf("<think>");
  const thinkEnd = raw.indexOf("</think>");

  // No thinking block at all
  if (thinkStart === -1) {
    return { thinking: "", response: raw, isThinking: false };
  }

  // <think> found but no closing tag yet — still thinking
  if (thinkEnd === -1) {
    const thinking = raw.substring(thinkStart + "<think>".length);
    return { thinking: thinking.trim(), response: "", isThinking: true };
  }

  // Both tags present — thinking is done, extract response after </think>
  const thinking = raw.substring(thinkStart + "<think>".length, thinkEnd);
  const response = raw.substring(thinkEnd + "</think>".length);
  return { thinking: thinking.trim(), response: response.trim(), isThinking: false };
}

interface ChatBotState {
  // Model state
  isModelLoading: boolean;
  isModelReady: boolean;
  progressItems: ChatProgressItem[];
  modelError: string | null;
  modelId: string;
  setModelId: (id: string) => void;
  loadModel: () => void;
  cachedModelIds: Set<string>;

  // Chat state
  messages: ChatMessage[];
  isGenerating: boolean;
  isThinking: boolean;
  streamingContent: string;
  streamingThinking: string;
  input: string;
  setInput: (value: string) => void;
  status: ChatStatus;

  // Actions
  handleSubmit: () => void;
  stop: () => void;
  append: (message: Omit<ChatMessage, "id" | "createdAt">) => void;
  setMessages: (messages: ChatMessage[]) => void;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

export function useChatBot(): ChatBotState {
  const workerRef = useRef<Worker | null>(null);

  // Model state
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [isModelReady, setIsModelReady] = useState(false);
  const [progressItems, setProgressItems] = useState<ChatProgressItem[]>([]);
  const [modelError, setModelError] = useState<string | null>(null);
  const [modelId, setModelId] = useState(DEFAULT_CHAT_MODEL_ID);
  const [cachedModelIds, setCachedModelIds] = useState<Set<string>>(new Set());

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [streamingThinking, setStreamingThinking] = useState("");
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<ChatStatus>("idle");

  // Streaming buffer — raw tokens accumulate here
  const streamBufferRef = useRef("");
  const rafRef = useRef<number | null>(null);

  // Check which models are already cached in the browser
  const refreshCacheStatus = useCallback(async () => {
    const ids = CHAT_MODELS.map((m) => m.id);
    const cached = await getCachedModelIds(ids);
    setCachedModelIds(cached);
  }, []);

  useEffect(() => {
    refreshCacheStatus();
  }, [refreshCacheStatus]);

  // Initialize worker
  useEffect(() => {
    const worker = new Worker(
      new URL("../app/chat/chat-worker.ts", import.meta.url),
      { type: "module" }
    );

    worker.onmessage = (event: MessageEvent<ChatWorkerOutgoingMessage>) => {
      const message = event.data;

      switch (message.type) {
        case "initiate": {
          const data = message.data as ChatModelLoadProgress;
          setProgressItems((prev) => {
            const existing = prev.find((p) => p.file === data.file);
            if (existing) return prev;
            return [
              ...prev,
              {
                file: data.file || "unknown",
                progress: 0,
                loaded: 0,
                total: 0,
                name: data.name,
                status: "initiate",
              },
            ];
          });
          break;
        }
        case "progress": {
          const data = message.data as ChatModelLoadProgress;
          setProgressItems((prev) =>
            prev.map((item) =>
              item.file === data.file
                ? {
                    ...item,
                    progress: data.progress ?? item.progress,
                    loaded: data.loaded ?? item.loaded,
                    total: data.total ?? item.total,
                    status: "progress",
                  }
                : item
            )
          );
          break;
        }
        case "done": {
          const data = message.data as ChatModelLoadProgress;
          setProgressItems((prev) =>
            prev.map((item) =>
              item.file === data.file
                ? { ...item, progress: 100, status: "done" }
                : item
            )
          );
          break;
        }
        case "ready":
          setIsModelLoading(false);
          setIsModelReady(true);
          // Refresh cache status so newly downloaded model shows as cached
          refreshCacheStatus();
          break;
        case "token": {
          const { token } = message.data;
          streamBufferRef.current += token;
          // Batch UI updates via rAF, parse thinking vs response
          if (rafRef.current === null) {
            rafRef.current = requestAnimationFrame(() => {
              const parsed = parseThinkingFromRaw(streamBufferRef.current);
              setIsThinking(parsed.isThinking);
              setStreamingThinking(parsed.thinking);
              setStreamingContent(parsed.response);
              setStatus("streaming");
              rafRef.current = null;
            });
          }
          break;
        }
        case "complete": {
          const { content } = message.data;
          // Parse final content to separate thinking from response
          const parsed = parseThinkingFromRaw(content);
          const assistantMessage: ChatMessage = {
            id: generateId(),
            role: "assistant",
            content: parsed.response || content,
            thinking: parsed.thinking || undefined,
            createdAt: Date.now(),
          };
          setMessages((prev) => [...prev, assistantMessage]);
          setStreamingContent("");
          setStreamingThinking("");
          setIsThinking(false);
          streamBufferRef.current = "";
          setIsGenerating(false);
          setStatus("idle");
          break;
        }
        case "error":
          setModelError(message.data.message);
          setIsModelLoading(false);
          setIsGenerating(false);
          setStreamingContent("");
          setStreamingThinking("");
          setIsThinking(false);
          streamBufferRef.current = "";
          setStatus("error");
          break;
      }
    };

    workerRef.current = worker;

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
      worker.terminate();
    };
  }, []);

  const loadModel = useCallback(() => {
    if (!workerRef.current) return;
    const model = CHAT_MODELS.find((m) => m.id === modelId);
    if (!model) return;

    setIsModelLoading(true);
    setIsModelReady(false);
    setModelError(null);
    setProgressItems([]);
    workerRef.current.postMessage({
      type: "load",
      modelId: model.id,
      dtype: model.dtype,
    });
  }, [modelId]);

  const handleSubmit = useCallback(() => {
    if (!workerRef.current || !input.trim() || isGenerating) return;

    const model = CHAT_MODELS.find((m) => m.id === modelId);
    if (!model) return;

    const userMessage: ChatMessage = {
      id: generateId(),
      role: "user",
      content: input.trim(),
      createdAt: Date.now(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setIsGenerating(true);
    setIsThinking(false);
    setStreamingContent("");
    setStreamingThinking("");
    streamBufferRef.current = "";
    setStatus("submitted");

    // Build messages to send to worker (include system prompt)
    const workerMessages: ChatMessage[] = [
      {
        id: "system",
        role: "system",
        content: model.systemPrompt || DEFAULT_SYSTEM_PROMPT,
        createdAt: 0,
      },
      ...updatedMessages,
    ];

    workerRef.current.postMessage({
      type: "generate",
      messages: workerMessages,
      maxTokens: model.maxTokens,
      generationConfig: model.generationConfig,
    });
  }, [input, isGenerating, messages, modelId]);

  const stop = useCallback(() => {
    if (!workerRef.current) return;
    workerRef.current.postMessage({ type: "abort" });

    // Commit whatever we have so far
    if (streamBufferRef.current) {
      const parsed = parseThinkingFromRaw(streamBufferRef.current);
      const partialMessage: ChatMessage = {
        id: generateId(),
        role: "assistant",
        content: parsed.response || streamBufferRef.current,
        thinking: parsed.thinking || undefined,
        createdAt: Date.now(),
      };
      setMessages((prev) => [...prev, partialMessage]);
    }

    setStreamingContent("");
    setStreamingThinking("");
    setIsThinking(false);
    streamBufferRef.current = "";
    setIsGenerating(false);
    setStatus("idle");
  }, []);

  const append = useCallback(
    (message: Omit<ChatMessage, "id" | "createdAt">) => {
      const newMessage: ChatMessage = {
        ...message,
        id: generateId(),
        createdAt: Date.now(),
      };
      setMessages((prev) => [...prev, newMessage]);
    },
    []
  );

  return {
    isModelLoading,
    isModelReady,
    progressItems,
    modelError,
    modelId,
    setModelId,
    loadModel,
    cachedModelIds,
    messages,
    isGenerating,
    isThinking,
    streamingContent,
    streamingThinking,
    input,
    setInput,
    status,
    handleSubmit,
    stop,
    append,
    setMessages,
  };
}
