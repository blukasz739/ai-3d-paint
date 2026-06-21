"use client";

import type { ReviewStatus } from "@/lib/types/workflow";

interface ImageReviewProps {
  originalUrl: string | null;
  stylizedUrl: string | null;
  status: ReviewStatus;
  error: string | null;
  onStylize: () => void;
  onRegenerate: () => void;
  onAccept: () => void;
  isGenerating3D: boolean;
}

export function ImageReview({
  originalUrl,
  stylizedUrl,
  status,
  error,
  onStylize,
  onRegenerate,
  onAccept,
  isGenerating3D,
}: ImageReviewProps) {
  const isGenerating = status === "generating";
  const canAccept = status === "ready" && stylizedUrl;

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 lg:p-8">
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <p className="mb-2 text-sm font-medium text-zinc-400">Twój rysunek</p>
          <div className="overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900">
            {originalUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={originalUrl}
                alt="Oryginalny rysunek"
                className="aspect-square w-full object-contain bg-white"
              />
            ) : (
              <div className="flex aspect-square items-center justify-center text-zinc-500">
                Brak obrazu
              </div>
            )}
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-zinc-400">
            Wynik AI (nano-banana-2)
          </p>
          <div className="overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900">
            {isGenerating ? (
              <div className="flex aspect-square flex-col items-center justify-center gap-3 text-zinc-400">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
                <p className="text-sm">Przekształcanie rysunku…</p>
              </div>
            ) : stylizedUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={stylizedUrl}
                alt="Stylizowany obraz"
                className="aspect-square w-full object-contain bg-white"
              />
            ) : (
              <div className="flex aspect-square items-center justify-center px-6 text-center text-sm text-zinc-500">
                Kliknij „Przekształć w przedmiot”, aby wygenerować obraz
              </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <p className="text-sm text-zinc-500">
        Zaakceptowany obraz trafi do TRELLIS.2 w celu wygenerowania modelu 3D.
        Generacja 3D zużywa ok. $0.82 na Replicate i może potrwać 5–10 minut.
      </p>

      <div className="flex flex-wrap gap-3">
        {status === "idle" || status === "error" ? (
          <button
            type="button"
            onClick={onStylize}
            disabled={!originalUrl || isGenerating}
            className="rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-40"
          >
            Przekształć w przedmiot
          </button>
        ) : null}

        {canAccept ? (
          <>
            <button
              type="button"
              onClick={onRegenerate}
              disabled={isGenerating || isGenerating3D}
              className="rounded-lg border border-zinc-600 px-5 py-2.5 text-sm text-zinc-200 hover:border-zinc-400 disabled:opacity-40"
            >
              Regeneruj
            </button>
            <button
              type="button"
              onClick={onAccept}
              disabled={isGenerating3D}
              className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-40"
            >
              {isGenerating3D ? "Generowanie 3D…" : "Akceptuj i generuj 3D"}
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
