"use client";

import { useCallback, useRef, useState } from "react";
import type { MaterialId, Tool } from "@/lib/types/workflow";
import { MATERIALS } from "@/lib/types/workflow";

const CANVAS_SIZE = 512;

function createMaterialPattern(
  ctx: CanvasRenderingContext2D,
  material: MaterialId,
  color: string,
): CanvasPattern | string {
  const patternCanvas = document.createElement("canvas");
  patternCanvas.width = 16;
  patternCanvas.height = 16;
  const pctx = patternCanvas.getContext("2d");
  if (!pctx) return color;

  pctx.fillStyle = color;
  pctx.fillRect(0, 0, 16, 16);

  switch (material) {
    case "wood":
      pctx.strokeStyle = "rgba(0,0,0,0.15)";
      for (let i = 0; i < 16; i += 4) {
        pctx.beginPath();
        pctx.moveTo(0, i);
        pctx.lineTo(16, i + 1);
        pctx.stroke();
      }
      break;
    case "metal":
      pctx.fillStyle = "rgba(255,255,255,0.35)";
      pctx.fillRect(0, 0, 8, 16);
      break;
    case "glass":
      pctx.fillStyle = "rgba(255,255,255,0.25)";
      pctx.beginPath();
      pctx.arc(8, 8, 6, 0, Math.PI * 2);
      pctx.fill();
      break;
    case "stone":
      pctx.fillStyle = "rgba(0,0,0,0.12)";
      pctx.fillRect(2, 2, 5, 5);
      pctx.fillRect(9, 7, 4, 4);
      break;
    case "plastic":
      pctx.fillStyle = "rgba(255,255,255,0.2)";
      pctx.fillRect(0, 0, 16, 4);
      break;
    case "fabric":
      pctx.strokeStyle = "rgba(0,0,0,0.1)";
      for (let i = 0; i < 16; i += 2) {
        pctx.beginPath();
        pctx.moveTo(i, 0);
        pctx.lineTo(i, 16);
        pctx.stroke();
      }
      break;
  }

  return ctx.createPattern(patternCanvas, "repeat") ?? color;
}

export function useDrawingCanvas(initialMaterial: MaterialId = "wood") {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  const [tool, setTool] = useState<Tool>("brush");
  const [material, setMaterialState] = useState<MaterialId>(initialMaterial);
  const [color, setColor] = useState(
    () => MATERIALS.find((m) => m.id === initialMaterial)?.swatch ?? "#ffffff",
  );
  const [brushSize, setBrushSize] = useState(8);

  const setMaterial = useCallback((nextMaterial: MaterialId) => {
    setMaterialState(nextMaterial);
    const swatch = MATERIALS.find((m) => m.id === nextMaterial)?.swatch;
    if (swatch) setColor(swatch);
  }, []);

  const getContext = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.getContext("2d");
  }, []);

  const getPoint = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return {
        x: (event.clientX - rect.left) * scaleX,
        y: (event.clientY - rect.top) * scaleY,
      };
    },
    [],
  );

  const drawLine = useCallback(
    (
      from: { x: number; y: number },
      to: { x: number; y: number },
      currentTool: Tool,
      currentMaterial: MaterialId,
      currentColor: string,
      size: number,
    ) => {
      const ctx = getContext();
      if (!ctx) return;

      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = size;

      if (currentTool === "eraser") {
        ctx.globalCompositeOperation = "destination-out";
        ctx.strokeStyle = "rgba(0,0,0,1)";
      } else {
        ctx.globalCompositeOperation = "source-over";
        const pattern = createMaterialPattern(ctx, currentMaterial, currentColor);
        ctx.strokeStyle = pattern;
      }

      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
      ctx.globalCompositeOperation = "source-over";
    },
    [getContext],
  );

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      isDrawingRef.current = true;
      const point = getPoint(event);
      if (!point) return;
      lastPointRef.current = point;
      drawLine(point, point, tool, material, color, brushSize);
    },
    [brushSize, color, drawLine, getPoint, material, tool],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDrawingRef.current) return;
      const point = getPoint(event);
      const last = lastPointRef.current;
      if (!point || !last) return;
      drawLine(last, point, tool, material, color, brushSize);
      lastPointRef.current = point;
    },
    [brushSize, color, drawLine, getPoint, material, tool],
  );

  const handlePointerUp = useCallback(() => {
    isDrawingRef.current = false;
    lastPointRef.current = null;
  }, []);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = getContext();
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, [getContext]);

  const exportDataUrl = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.toDataURL("image/png");
  }, []);

  return {
    canvasRef,
    canvasSize: CANVAS_SIZE,
    tool,
    setTool,
    material,
    setMaterial,
    color,
    setColor,
    brushSize,
    setBrushSize,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    clearCanvas,
    exportDataUrl,
  };
}
