"use client";

import { clsx } from "clsx";

type Status = "idle" | "loading" | "ready" | "recording" | "transcribing" | "error";

interface StatusIndicatorProps {
  status: Status;
  label?: string;
}

const statusConfig: Record<Status, { color: string; bgColor: string; borderColor: string; pulse: boolean; defaultLabel: string }> = {
  idle: {
    color: "var(--muted-light)",
    bgColor: "var(--surface)",
    borderColor: "var(--border-subtle)",
    pulse: false,
    defaultLabel: "Idle",
  },
  loading: {
    color: "var(--accent)",
    bgColor: "var(--accent-bg)",
    borderColor: "var(--accent-border)",
    pulse: true,
    defaultLabel: "Loading...",
  },
  ready: {
    color: "var(--success)",
    bgColor: "var(--success-bg)",
    borderColor: "var(--success-border)",
    pulse: false,
    defaultLabel: "Ready",
  },
  recording: {
    color: "var(--recording)",
    bgColor: "var(--recording-bg)",
    borderColor: "rgba(212, 91, 91, 0.2)",
    pulse: true,
    defaultLabel: "Recording",
  },
  transcribing: {
    color: "var(--warning)",
    bgColor: "var(--warning-bg)",
    borderColor: "var(--warning-border)",
    pulse: true,
    defaultLabel: "Transcribing...",
  },
  error: {
    color: "var(--error)",
    bgColor: "var(--error-bg)",
    borderColor: "var(--error-border)",
    pulse: false,
    defaultLabel: "Error",
  },
};

export function StatusIndicator({ status, label }: StatusIndicatorProps) {
  const config = statusConfig[status];

  return (
    <div
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full"
      style={{
        background: config.bgColor,
        border: `1px solid ${config.borderColor}`,
      }}
    >
      <span className="relative flex h-2 w-2">
        {config.pulse && (
          <span
            className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-pulse"
            style={{ background: config.color }}
          />
        )}
        <span
          className="relative inline-flex rounded-full h-2 w-2"
          style={{ background: config.color }}
        />
      </span>
      <span className="text-xs font-medium" style={{ color: config.color }}>
        {label || config.defaultLabel}
      </span>
    </div>
  );
}
