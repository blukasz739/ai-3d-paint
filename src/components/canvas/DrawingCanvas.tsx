"use client";

import type { RefObject } from "react";
import type { Tool } from "@/lib/types/workflow";

interface DrawingCanvasProps {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  canvasSize: number;
  tool: Tool;
  onPointerDown: (event: React.PointerEvent<HTMLCanvasElement>) => void;
  onPointerMove: (event: React.PointerEvent<HTMLCanvasElement>) => void;
  onPointerUp: () => void;
}

const CURSOR: Record<Tool, string> = {
  brush: "crosshair",
  eraser: "cell",
  fill: "pointer",
};

export function DrawingCanvas({
  canvasRef,
  canvasSize,
  tool,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: DrawingCanvasProps) {
  return (
    <div className="flex flex-1 items-center justify-center p-4 lg:p-8">
      <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-2 shadow-2xl shadow-black/40">
        <canvas
          ref={canvasRef}
          width={canvasSize}
          height={canvasSize}
          className="touch-none rounded-lg bg-white"
          style={{
            width: "min(100%, 512px)",
            height: "auto",
            aspectRatio: "1",
            cursor: CURSOR[tool],
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        />
      </div>
    </div>
  );
}
