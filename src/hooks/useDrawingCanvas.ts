"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DrawSettings } from "@/lib/canvas/drawSettings";
import {
  drawCorrectedShape,
  drawFreehandCap,
  drawFreehandSegment,
  drawSegment,
  interpolateStrokePoints,
} from "@/lib/canvas/drawPrimitives";
import { floodFill, type Point } from "@/lib/canvas/floodFill";
import {
  buildShapeFromBox,
  detectLine,
} from "@/lib/canvas/shapeCorrection";
import type { MaterialId, ShapeKind, Tool } from "@/lib/types/workflow";
import { MATERIALS } from "@/lib/types/workflow";

export type { DrawSettings } from "@/lib/canvas/drawSettings";

const CANVAS_SIZE = 512;
const MAX_HISTORY = 40;

export function useDrawingCanvas(initialMaterial: MaterialId = "wood") {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<Point | null>(null);
  const strokePointsRef = useRef<Point[]>([]);
  const strokeSnapshotRef = useRef<ImageData | null>(null);
  const historyRef = useRef<ImageData[]>([]);
  const historyIndexRef = useRef(0);

  const [tool, setTool] = useState<Tool>("brush");
  const [material, setMaterialState] = useState<MaterialId>(initialMaterial);
  const [color, setColor] = useState(
    () => MATERIALS.find((m) => m.id === initialMaterial)?.swatch ?? "#ffffff",
  );
  const [brushSize, setBrushSize] = useState(8);
  const [shadowEnabled, setShadowEnabled] = useState(true);
  const [shadowIntensity, setShadowIntensity] = useState(40);
  const [textureStrength, setTextureStrength] = useState(70);
  const [lineCorrection, setLineCorrection] = useState(false);
  const [shapeKind, setShapeKindState] = useState<ShapeKind>("rectangle");
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [historyReady, setHistoryReady] = useState(false);

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

  const syncHistoryButtons = useCallback(() => {
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
  }, []);

  const restoreSnapshot = useCallback(
    (snapshot: ImageData) => {
      const ctx = getContext();
      if (!ctx) return;
      ctx.putImageData(snapshot, 0, 0);
    },
    [getContext],
  );

  const pushHistory = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = getContext();
    if (!canvas || !ctx) return;

    const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const trimmed = historyRef.current.slice(0, historyIndexRef.current + 1);
    trimmed.push(snapshot);

    if (trimmed.length > MAX_HISTORY) {
      trimmed.shift();
    }

    historyRef.current = trimmed;
    historyIndexRef.current = trimmed.length - 1;
    syncHistoryButtons();
  }, [getContext, syncHistoryButtons]);

  const initHistory = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = getContext();
    if (!canvas || !ctx) return;

    const empty = ctx.createImageData(canvas.width, canvas.height);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    historyRef.current = [empty];
    historyIndexRef.current = 0;
    syncHistoryButtons();
    setHistoryReady(true);
  }, [getContext, syncHistoryButtons]);

  useEffect(() => {
    initHistory();
  }, [initHistory]);

  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current -= 1;
    restoreSnapshot(historyRef.current[historyIndexRef.current]);
    syncHistoryButtons();
  }, [restoreSnapshot, syncHistoryButtons]);

  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current += 1;
    restoreSnapshot(historyRef.current[historyIndexRef.current]);
    syncHistoryButtons();
  }, [restoreSnapshot, syncHistoryButtons]);

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

  const setShapeKind = useCallback((kind: ShapeKind) => {
    setShapeKindState(kind);
    setTool("shape");
  }, []);

  const drawShapePreview = useCallback(
    (ctx: CanvasRenderingContext2D, from: Point, to: Point) => {
      if (!strokeSnapshotRef.current) return;
      ctx.putImageData(strokeSnapshotRef.current, 0, 0);
      const shape = buildShapeFromBox(from, to, shapeKind);
      if (shape) {
        drawCorrectedShape(ctx, shape, getSettings());
      }
    },
    [getSettings, shapeKind],
  );

  const appendFreehandPoint = useCallback(
    (ctx: CanvasRenderingContext2D, point: Point) => {
      const settings = getSettings();
      const last = strokePointsRef.current[strokePointsRef.current.length - 1];
      const step = Math.max(2, settings.brushSize * 0.35);
      const interpolated = interpolateStrokePoints(last, point, step);

      for (const p of interpolated) {
        strokePointsRef.current.push(p);
        drawFreehandSegment(ctx, strokePointsRef.current, settings);
      }
    },
    [getSettings],
  );

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const point = getPoint(event);
      if (!point) return;

      const ctx = getContext();
      const canvas = canvasRef.current;
      if (!ctx || !canvas) return;

      if (tool === "fill") {
        floodFill(ctx, point.x, point.y, {
          material,
          color,
          textureStrength,
          brushSize,
        });
        pushHistory();
        return;
      }

      event.currentTarget.setPointerCapture(event.pointerId);
      isDrawingRef.current = true;
      lastPointRef.current = point;
      strokePointsRef.current = [point];

      const settings = getSettings();

      if (tool === "shape" || (tool === "brush" && lineCorrection)) {
        strokeSnapshotRef.current = ctx.getImageData(
          0,
          0,
          canvas.width,
          canvas.height,
        );
      } else {
        strokeSnapshotRef.current = null;
        drawSegment(ctx, point, point, settings);
      }
    },
    [
      brushSize,
      color,
      getContext,
      getPoint,
      getSettings,
      lineCorrection,
      material,
      pushHistory,
      textureStrength,
      tool,
    ],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDrawingRef.current || tool === "fill") return;
      const point = getPoint(event);
      const start = strokePointsRef.current[0];
      if (!point || !lastPointRef.current || !start) return;

      const ctx = getContext();
      if (!ctx) return;

      if (tool === "shape") {
        drawShapePreview(ctx, start, point);
      } else if (tool === "brush") {
        appendFreehandPoint(ctx, point);
      } else {
        const last = lastPointRef.current;
        drawSegment(ctx, last, point, getSettings());
        strokePointsRef.current.push(point);
      }

      lastPointRef.current = point;
    },
    [
      appendFreehandPoint,
      drawShapePreview,
      getContext,
      getPoint,
      getSettings,
      tool,
    ],
  );

  const handlePointerUp = useCallback(() => {
    if (!isDrawingRef.current) return;

    const ctx = getContext();
    const settings = getSettings();
    const points = strokePointsRef.current;
    const start = points[0];
    const end = points[points.length - 1];

    if (ctx && start && end) {
      if (tool === "shape") {
        const shape = buildShapeFromBox(start, end, shapeKind);
        if (shape && strokeSnapshotRef.current) {
          ctx.putImageData(strokeSnapshotRef.current, 0, 0);
          drawCorrectedShape(ctx, shape, settings);
        }
      } else if (tool === "brush" && points.length > 1) {
        const line =
          lineCorrection && strokeSnapshotRef.current && points.length > 3
            ? detectLine(points)
            : null;

        if (line) {
          ctx.putImageData(strokeSnapshotRef.current!, 0, 0);
          drawCorrectedShape(
            ctx,
            { type: "line", from: line.from, to: line.to },
            settings,
          );
        } else {
          drawFreehandCap(ctx, points, settings);
        }
      }
    }

    isDrawingRef.current = false;
    lastPointRef.current = null;
    strokePointsRef.current = [];
    strokeSnapshotRef.current = null;

    if (tool !== "fill") {
      pushHistory();
    }
  }, [
    getContext,
    getSettings,
    lineCorrection,
    pushHistory,
    shapeKind,
    tool,
  ]);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = getContext();
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pushHistory();
  }, [getContext, pushHistory]);

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
    lineCorrection,
    setLineCorrection,
    shapeKind,
    setShapeKind,
    canUndo: historyReady ? canUndo : false,
    canRedo: historyReady ? canRedo : false,
    undo,
    redo,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    clearCanvas,
    exportDataUrl,
  };
}
