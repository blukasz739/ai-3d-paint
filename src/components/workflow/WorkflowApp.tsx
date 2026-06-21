"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { DrawingCanvas } from "@/components/canvas/DrawingCanvas";
import { CanvasToolbar } from "@/components/canvas/CanvasToolbar";
import { MaterialSidebar } from "@/components/sidebar/MaterialSidebar";
import { StylePicker } from "@/components/styles/StylePicker";
import { ImageReview } from "@/components/review/ImageReview";
import { ModelViewer } from "@/components/viewer/ModelViewer";
import { StepIndicator } from "@/components/workflow/StepIndicator";
import { useDrawingCanvas } from "@/hooks/useDrawingCanvas";
import { isCanvasEmpty } from "@/lib/canvas/exportCanvas";
import type {
  GenerationStatus,
  ReviewStatus,
  StyleId,
  WorkflowStep,
} from "@/lib/types/workflow";

const POLL_INTERVAL_MS = 4000;

export function WorkflowApp() {
  const drawing = useDrawingCanvas();
  const [step, setStep] = useState<WorkflowStep>("draw");
  const [style, setStyle] = useState<StyleId>("realistic");
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [stylizedUrl, setStylizedUrl] = useState<string | null>(null);
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus>("idle");
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [generationStatus, setGenerationStatus] =
    useState<GenerationStatus>("idle");
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    fetch("/api/stylize")
      .then((res) => res.json())
      .then((data: { configured?: boolean }) => {
        if (!data.configured) {
          setConfigError(
            "Brak REPLICATE_API_TOKEN — skopiuj .env.example do .env.local i uzupełnij token.",
          );
        }
      })
      .catch(() => null);
  }, []);

  const handleContinueToReview = useCallback(() => {
    const canvas = drawing.canvasRef.current;
    if (!canvas) return;

    if (isCanvasEmpty(canvas)) {
      setReviewError("Canvas jest pusty — narysuj coś przed kontynuacją.");
      return;
    }

    const dataUrl = drawing.exportDataUrl();
    if (!dataUrl) return;

    setOriginalUrl(dataUrl);
    setStylizedUrl(null);
    setReviewStatus("idle");
    setReviewError(null);
    setStep("review");
  }, [drawing]);

  const handleStylize = useCallback(async () => {
    if (!originalUrl) return;

    setReviewStatus("generating");
    setReviewError(null);

    try {
      const response = await fetch("/api/stylize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          canvasDataUrl: originalUrl,
          material: drawing.material,
          style,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Stylization failed");
      }

      setStylizedUrl(data.imageUrl);
      setReviewStatus("ready");
    } catch (error) {
      setReviewStatus("error");
      setReviewError(
        error instanceof Error ? error.message : "Nie udało się stylizować obrazu",
      );
    }
  }, [drawing.material, originalUrl, style]);

  const pollPrediction = useCallback(async (predictionId: string) => {
    const response = await fetch(`/api/predictions/${predictionId}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error ?? "Polling failed");
    }

    return data as {
      status: string;
      modelUrl: string | null;
      error: string | null;
    };
  }, []);

  const handleAcceptAndGenerate3D = useCallback(async () => {
    if (!stylizedUrl) return;

    setStep("model");
    setGenerationStatus("starting");
    setGenerationError(null);
    setModelUrl(null);
    setReviewStatus("approved");

    try {
      const response = await fetch("/api/generate-3d", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: stylizedUrl }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "3D generation failed");
      }

      setGenerationStatus("processing");

      const poll = async (): Promise<void> => {
        const result = await pollPrediction(data.predictionId);

        if (result.status === "succeeded" && result.modelUrl) {
          setModelUrl(result.modelUrl);
          setGenerationStatus("succeeded");
          return;
        }

        if (result.status === "failed" || result.status === "canceled") {
          throw new Error(result.error ?? "Generacja 3D nie powiodła się");
        }

        setTimeout(poll, POLL_INTERVAL_MS);
      };

      await poll();
    } catch (error) {
      setGenerationStatus("failed");
      setGenerationError(
        error instanceof Error ? error.message : "Generacja 3D nie powiodła się",
      );
    }
  }, [pollPrediction, stylizedUrl]);

  const isGenerating3D =
    generationStatus === "starting" || generationStatus === "processing";

  return (
    <AppShell>
      {configError && (
        <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          {configError}
        </div>
      )}

      <StepIndicator currentStep={step} />

      {step === "draw" && (
        <>
          <div className="flex flex-1 flex-col lg:flex-row">
            <button
              type="button"
              className="border-b border-zinc-800 px-4 py-2 text-left text-sm text-zinc-400 lg:hidden"
              onClick={() => setSidebarOpen((v) => !v)}
            >
              {sidebarOpen ? "Ukryj panel" : "Pokaż materiały i narzędzia"}
            </button>
            <div className={`${sidebarOpen ? "block" : "hidden"} lg:block`}>
              <MaterialSidebar
                material={drawing.material}
                onMaterialChange={drawing.setMaterial}
                tool={drawing.tool}
                onToolChange={drawing.setTool}
                brushSize={drawing.brushSize}
                onBrushSizeChange={drawing.setBrushSize}
                color={drawing.color}
                onColorChange={drawing.setColor}
                onClear={drawing.clearCanvas}
              />
            </div>
            <DrawingCanvas
              canvasRef={drawing.canvasRef}
              canvasSize={drawing.canvasSize}
              onPointerDown={drawing.handlePointerDown}
              onPointerMove={drawing.handlePointerMove}
              onPointerUp={drawing.handlePointerUp}
            />
          </div>
          <CanvasToolbar onContinue={handleContinueToReview} />
        </>
      )}

      {step === "review" && (
        <div className="flex flex-1 flex-col">
          <div className="border-b border-zinc-800 p-4 lg:px-8">
            <StylePicker style={style} onStyleChange={setStyle} />
          </div>
          <ImageReview
            originalUrl={originalUrl}
            stylizedUrl={stylizedUrl}
            status={reviewStatus}
            error={reviewError}
            onStylize={handleStylize}
            onRegenerate={handleStylize}
            onAccept={handleAcceptAndGenerate3D}
            isGenerating3D={isGenerating3D}
          />
          <div className="border-t border-zinc-800 px-4 py-3">
            <button
              type="button"
              onClick={() => setStep("draw")}
              className="text-sm text-zinc-400 hover:text-zinc-200"
            >
              ← Wróć do rysowania
            </button>
          </div>
        </div>
      )}

      {step === "model" && (
        <div className="flex flex-1 flex-col gap-6 p-4 lg:p-8">
          <div>
            <h2 className="mb-1 text-lg font-semibold">Twój model 3D</h2>
            <p className="text-sm text-zinc-500">
              Obracaj myszą, scrolluj aby przybliżyć. Model generowany przez
              TRELLIS.2.
            </p>
          </div>

          <ModelViewer
            modelUrl={modelUrl}
            isLoading={isGenerating3D}
            error={generationError}
          />

          {modelUrl && (
            <div className="flex flex-wrap gap-3">
              <a
                href={modelUrl}
                download="model.glb"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-500"
              >
                Pobierz .glb
              </a>
              <button
                type="button"
                onClick={() => {
                  setStep("review");
                  setGenerationStatus("idle");
                  setGenerationError(null);
                }}
                className="rounded-lg border border-zinc-600 px-5 py-2.5 text-sm text-zinc-200 hover:border-zinc-400"
              >
                Wróć do review
              </button>
              <button
                type="button"
                onClick={() => {
                  drawing.clearCanvas();
                  setStep("draw");
                  setOriginalUrl(null);
                  setStylizedUrl(null);
                  setReviewStatus("idle");
                  setModelUrl(null);
                  setGenerationStatus("idle");
                  setGenerationError(null);
                }}
                className="rounded-lg border border-zinc-600 px-5 py-2.5 text-sm text-zinc-200 hover:border-zinc-400"
              >
                Nowy projekt
              </button>
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
}
