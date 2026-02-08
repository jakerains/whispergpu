"use client";

import { useRef, useEffect } from "react";

interface AudioVisualizerProps {
  analyserNode: AnalyserNode | null;
  isRecording: boolean;
}

export function AudioVisualizer({ analyserNode, isRecording }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analyserNode || !isRecording) {
      // Draw flat line when not recording
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const dpr = window.devicePixelRatio || 1;
          canvas.width = canvas.offsetWidth * dpr;
          canvas.height = canvas.offsetHeight * dpr;
          ctx.scale(dpr, dpr);
          const w = canvas.offsetWidth;
          const h = canvas.offsetHeight;
          ctx.clearRect(0, 0, w, h);
          ctx.beginPath();
          ctx.moveTo(0, h / 2);
          ctx.lineTo(w, h / 2);
          ctx.strokeStyle = "rgba(194, 114, 78, 0.2)";
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.scale(dpr, dpr);

      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;

      analyserNode.getByteTimeDomainData(dataArray);

      ctx.clearRect(0, 0, w, h);

      // Warm gradient stroke
      const gradient = ctx.createLinearGradient(0, 0, w, 0);
      gradient.addColorStop(0, "rgba(194, 114, 78, 0.7)");
      gradient.addColorStop(0.5, "rgba(196, 144, 58, 0.7)");
      gradient.addColorStop(1, "rgba(194, 114, 78, 0.7)");

      ctx.beginPath();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = gradient;

      const sliceWidth = w / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * h) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        x += sliceWidth;
      }

      ctx.lineTo(w, h / 2);
      ctx.stroke();

      // Warm glow effect
      ctx.shadowBlur = 8;
      ctx.shadowColor = "rgba(194, 114, 78, 0.4)";
      ctx.stroke();
      ctx.shadowBlur = 0;

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [analyserNode, isRecording]);

  return (
    <div
      className="w-full h-20 rounded-xl overflow-hidden"
      style={{ background: "var(--surface)", border: "1px solid var(--border-subtle)" }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ display: "block" }}
      />
    </div>
  );
}
