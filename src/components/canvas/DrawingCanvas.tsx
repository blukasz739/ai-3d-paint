"use client";

import type { RefObject } from "react";

interface DrawingCanvasProps {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  canvasSize: number;
  onPointerDown: (event: React.PointerEvent<HTMLCanvasElement>) => void;
  onPointerMove: (event: React.PointerEvent<HTMLCanvasElement>) => void;
  onPointerUp: () => void;
}

export function DrawingCanvas({
  canvasRef,
  canvasSize,
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
          className="touch-none cursor-crosshair rounded-lg bg-white"
          style={{ width: "min(100%, 512px)", height: "auto", aspectRatio: "1" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        />
      </div>
    </div>
  );
}
