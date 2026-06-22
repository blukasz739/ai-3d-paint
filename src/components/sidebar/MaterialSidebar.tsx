"use client";

import { useEffect, useState } from "react";
import { COLOR_PRESETS } from "@/lib/canvas/patterns";
import { MATERIALS, SHAPE_KINDS } from "@/lib/types/workflow";
import type { MaterialId, ShapeKind, Tool } from "@/lib/types/workflow";

interface MaterialSidebarProps {
  material: MaterialId;
  onMaterialChange: (material: MaterialId) => void;
  tool: Tool;
  onToolChange: (tool: Tool) => void;
  brushSize: number;
  onBrushSizeChange: (size: number) => void;
  color: string;
  onColorChange: (color: string) => void;
  shadowEnabled: boolean;
  onShadowEnabledChange: (enabled: boolean) => void;
  shadowIntensity: number;
  onShadowIntensityChange: (value: number) => void;
  textureStrength: number;
  onTextureStrengthChange: (value: number) => void;
  lineCorrection: boolean;
  onLineCorrectionChange: (enabled: boolean) => void;
  shapeKind: ShapeKind;
  onShapeKindChange: (kind: ShapeKind) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
}

export function MaterialSidebar({
  material,
  onMaterialChange,
  tool,
  onToolChange,
  brushSize,
  onBrushSizeChange,
  color,
  onColorChange,
  shadowEnabled,
  onShadowEnabledChange,
  shadowIntensity,
  onShadowIntensityChange,
  textureStrength,
  onTextureStrengthChange,
  lineCorrection,
  onLineCorrectionChange,
  shapeKind,
  onShapeKindChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onClear,
}: MaterialSidebarProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const undoEnabled = isClient && canUndo;
  const redoEnabled = isClient && canRedo;
  const colorValue = color.toLowerCase();

  return (
    <aside className="flex w-full shrink-0 flex-col gap-4 border-r border-zinc-800 bg-zinc-950 p-4 lg:w-72 lg:overflow-y-auto">
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Materiały i tekstury
        </h2>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
          {MATERIALS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onMaterialChange(item.id)}
              className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition ${
                material === item.id
                  ? "border-violet-500 bg-violet-500/10 text-white"
                  : "border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-600"
              }`}
            >
              <span
                className="h-5 w-5 shrink-0 rounded-full border border-white/20"
                style={{ backgroundColor: item.swatch }}
              />
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-zinc-500">
          <span>Siła tekstury</span>
          <span className="normal-case text-zinc-400">{textureStrength}%</span>
        </label>
        <input
          type="range"
          min={0}
          max={100}
          value={textureStrength}
          onChange={(e) => onTextureStrengthChange(Number(e.target.value))}
          className="w-full accent-violet-500"
        />
      </div>

      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Kolory
        </h2>
        <div className="mb-3 grid grid-cols-6 gap-2">
          {COLOR_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => onColorChange(preset)}
              title={preset}
              className={`aspect-square rounded-md border-2 transition hover:scale-105 ${
                colorValue === preset.toLowerCase()
                  ? "border-violet-400 ring-2 ring-violet-500/40"
                  : "border-zinc-700"
              }`}
              style={{ backgroundColor: preset }}
            />
          ))}
        </div>
        <label className="mb-2 block text-xs text-zinc-500">Własny kolor</label>
        {isClient ? (
          <input
            type="color"
            value={colorValue}
            onChange={(e) => onColorChange(e.target.value)}
            className="h-10 w-full cursor-pointer rounded-lg border border-zinc-700 bg-zinc-900"
          />
        ) : (
          <div
            className="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-900"
            style={{ backgroundColor: colorValue }}
            aria-hidden
          />
        )}
      </div>

      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Cienie
        </h2>
        <label className="mb-2 flex items-center justify-between text-xs text-zinc-500">
          <span>Natężenie cienia</span>
          <span>{shadowIntensity}%</span>
        </label>
        <input
          type="range"
          min={10}
          max={100}
          value={shadowIntensity}
          onChange={(e) => onShadowIntensityChange(Number(e.target.value))}
          {...(shadowEnabled ? {} : { disabled: true })}
          className="mb-3 w-full accent-violet-500 disabled:opacity-40"
        />
        <label className="flex cursor-pointer items-center gap-3 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={shadowEnabled}
            onChange={(e) => onShadowEnabledChange(e.target.checked)}
            className="h-4 w-4 rounded accent-violet-500"
          />
          Włącz cień przy rysowaniu
        </label>
      </div>

      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Narzędzia
        </h2>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => onToolChange("brush")}
            className={`rounded-lg border px-3 py-2 text-sm ${
              tool === "brush"
                ? "border-violet-500 bg-violet-500/10 text-white"
                : "border-zinc-800 bg-zinc-900 text-zinc-300"
            }`}
          >
            Pędzel
          </button>
          <button
            type="button"
            onClick={() => onToolChange("eraser")}
            className={`rounded-lg border px-3 py-2 text-sm ${
              tool === "eraser"
                ? "border-violet-500 bg-violet-500/10 text-white"
                : "border-zinc-800 bg-zinc-900 text-zinc-300"
            }`}
          >
            Gumka
          </button>
          <button
            type="button"
            onClick={() => onToolChange("fill")}
            className={`rounded-lg border px-3 py-2 text-sm ${
              tool === "fill"
                ? "border-violet-500 bg-violet-500/10 text-white"
                : "border-zinc-800 bg-zinc-900 text-zinc-300"
            }`}
          >
            Wypełnij
          </button>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Historia
        </h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onUndo}
            {...(undoEnabled ? {} : { disabled: true })}
            className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-300 disabled:opacity-40"
            title="Cofnij (Ctrl+Z)"
          >
            Cofnij
          </button>
          <button
            type="button"
            onClick={onRedo}
            {...(redoEnabled ? {} : { disabled: true })}
            className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-300 disabled:opacity-40"
            title="Ponów (Ctrl+Y)"
          >
            Ponów
          </button>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Wyprostowanie linii
        </h2>
        <label className="flex cursor-pointer items-center gap-3 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={lineCorrection}
            onChange={(e) => onLineCorrectionChange(e.target.checked)}
            className="h-4 w-4 rounded accent-violet-500"
          />
          Wyprostuj rysowaną linię
        </label>
      </div>

      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Kształty
        </h2>
        <div className="grid grid-cols-3 gap-2">
          {SHAPE_KINDS.map((shape) => (
            <button
              key={shape.id}
              type="button"
              onClick={() => onShapeKindChange(shape.id)}
              className={`rounded-lg border px-2 py-2 text-xs sm:text-sm ${
                tool === "shape" && shapeKind === shape.id
                  ? "border-violet-500 bg-violet-500/10 text-white"
                  : "border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-600"
              }`}
            >
              {shape.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Rozmiar: {brushSize}px
        </label>
        <input
          type="range"
          min={2}
          max={40}
          value={brushSize}
          onChange={(e) => onBrushSizeChange(Number(e.target.value))}
          className="w-full accent-violet-500"
        />
      </div>

      <button
        type="button"
        onClick={onClear}
        className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-300 transition hover:border-red-500/50 hover:text-red-300"
      >
        Wyczyść canvas
      </button>
    </aside>
  );
}
