"use client";

import { MATERIALS } from "@/lib/types/workflow";
import type { MaterialId, Tool } from "@/lib/types/workflow";

interface MaterialSidebarProps {
  material: MaterialId;
  onMaterialChange: (material: MaterialId) => void;
  tool: Tool;
  onToolChange: (tool: Tool) => void;
  brushSize: number;
  onBrushSizeChange: (size: number) => void;
  color: string;
  onColorChange: (color: string) => void;
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
  onClear,
}: MaterialSidebarProps) {
  return (
    <aside className="flex w-full shrink-0 flex-col gap-6 border-r border-zinc-800 bg-zinc-950 p-4 lg:w-64">
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Materiały
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
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Narzędzia
        </h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onToolChange("brush")}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
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
            className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
              tool === "eraser"
                ? "border-violet-500 bg-violet-500/10 text-white"
                : "border-zinc-800 bg-zinc-900 text-zinc-300"
            }`}
          >
            Gumka
          </button>
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

      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Kolor
        </label>
        <input
          type="color"
          value={color}
          onChange={(e) => onColorChange(e.target.value)}
          className="h-10 w-full cursor-pointer rounded-lg border border-zinc-700 bg-zinc-900"
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
