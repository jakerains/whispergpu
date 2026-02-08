export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  thinking?: string;
  createdAt: number;
}

export interface ChatProgressItem {
  file: string;
  progress: number;
  loaded: number;
  total: number;
  name?: string;
  status?: string;
}

export interface ChatModelLoadProgress {
  status: "initiate" | "download" | "progress" | "done" | "ready";
  file?: string;
  progress?: number;
  loaded?: number;
  total?: number;
  name?: string;
}

// Worker message types
export type ChatWorkerIncomingMessage =
  | { type: "load"; modelId: string; dtype: string }
  | { type: "generate"; messages: ChatMessage[]; maxTokens: number }
  | { type: "abort" };

export type ChatWorkerOutgoingMessage =
  | { type: "initiate"; data: ChatModelLoadProgress }
  | { type: "progress"; data: ChatModelLoadProgress }
  | { type: "done"; data: ChatModelLoadProgress }
  | { type: "ready" }
  | { type: "token"; data: { token: string } }
  | { type: "complete"; data: { content: string } }
  | { type: "error"; data: { message: string } };
