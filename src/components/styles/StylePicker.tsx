"use client";

import { STYLES } from "@/lib/types/workflow";
import type { StyleId } from "@/lib/types/workflow";

interface StylePickerProps {
  style: StyleId;
  onStyleChange: (style: StyleId) => void;
}

export function StylePicker({ style, onStyleChange }: StylePickerProps) {
  return (
    <div>
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
        Styl obrazu
      </h2>
      <div className="flex flex-wrap gap-2">
        {STYLES.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onStyleChange(item.id)}
            className={`rounded-full border px-4 py-2 text-sm transition ${
              style === item.id
                ? "border-violet-500 bg-violet-500/15 text-white"
                : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-500"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
