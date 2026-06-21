"use client";

import { useCallback, useRef, useState } from "react";
import { createMaterialPattern } from "@/lib/canvas/patterns";
import type { MaterialId, Tool } from "@/lib/types/workflow";
import { MATERIALS } from "@/lib/types/workflow";

const CANVAS_SIZE = 512;

export interface DrawSettings {
  tool: Tool;
  material: MaterialId;
  color: string;
  brushSize: number;
  shadowEnabled: boolean;
  shadowIntensity: number;
  textureStrength: number;
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
  const [shadowEnabled, setShadowEnabled] = useState(true);
  const [shadowIntensity, setShadowIntensity] = useState(40);
  const [textureStrength, setTextureStrength] = useState(70);

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
      settings: DrawSettings,
    ) => {
      const ctx = getContext();
      if (!ctx) return;

      const {
        tool: currentTool,
        material: currentMaterial,
        color: currentColor,
        brushSize: size,
        shadowEnabled: shadows,
        shadowIntensity,
        textureStrength: texture,
      } = settings;

      const shadowOffset = 2 + Math.round((shadowIntensity / 100) * 4);
      const shadowAlpha = 0.1 + (shadowIntensity / 100) * 0.35;

      if (currentTool === "brush" && shadows) {
        ctx.save();
        ctx.globalCompositeOperation = "source-over";
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.lineWidth = size;
        ctx.strokeStyle = `rgba(0,0,0,${shadowAlpha})`;
        ctx.beginPath();
        ctx.moveTo(from.x + shadowOffset, from.y + shadowOffset);
        ctx.lineTo(to.x + shadowOffset, to.y + shadowOffset);
        ctx.stroke();
        ctx.restore();
      }

      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = size;

      if (currentTool === "eraser") {
        ctx.globalCompositeOperation = "destination-out";
        ctx.strokeStyle = "rgba(0,0,0,1)";
      } else {
        ctx.globalCompositeOperation = "source-over";
        const pattern = createMaterialPattern(
          ctx,
          currentMaterial,
          currentColor,
          texture,
        );
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

  const getSettings = useCallback(
    (): DrawSettings => ({
      tool,
      material,
      color,
      brushSize,
      shadowEnabled,
      shadowIntensity,
      textureStrength,
    }),
    [
      brushSize,
      color,
      material,
      shadowEnabled,
      shadowIntensity,
      textureStrength,
      tool,
    ],
  );

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      isDrawingRef.current = true;
      const point = getPoint(event);
      if (!point) return;
      lastPointRef.current = point;
      drawLine(point, point, getSettings());
    },
    [drawLine, getPoint, getSettings],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDrawingRef.current) return;
      const point = getPoint(event);
      const last = lastPointRef.current;
      if (!point || !last) return;
      drawLine(last, point, getSettings());
      lastPointRef.current = point;
    },
    [drawLine, getPoint, getSettings],
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
    shadowEnabled,
    setShadowEnabled,
    shadowIntensity,
    setShadowIntensity,
    textureStrength,
    setTextureStrength,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    clearCanvas,
    exportDataUrl,
  };
}
