"use client";

interface CanvasToolbarProps {
  onContinue: () => void;
  disabled?: boolean;
}

export function CanvasToolbar({ onContinue, disabled }: CanvasToolbarProps) {
  return (
    <div className="flex items-center justify-between border-t border-zinc-800 bg-zinc-950 px-4 py-3">
      <p className="text-sm text-zinc-400">
        Narysuj obiekt na białym tle. Im wyraźniejszy kontur, tym lepszy wynik 3D.
      </p>
      <button
        type="button"
        onClick={onContinue}
        disabled={disabled}
        className="rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Dalej: stylizacja
      </button>
    </div>
  );
}
