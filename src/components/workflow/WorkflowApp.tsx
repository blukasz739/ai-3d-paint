"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { DrawingCanvas } from "@/components/canvas/DrawingCanvas";
import { MaterialSidebar } from "@/components/sidebar/MaterialSidebar";
import { StylePicker } from "@/components/styles/StylePicker";
import { ImageReview } from "@/components/review/ImageReview";
import { ModelViewer } from "@/components/viewer/ModelViewer";
import { StepIndicator } from "@/components/workflow/StepIndicator";
import {
  DownloadStepLink,
  HeaderBackButton,
  PrimaryStepButton,
  SuccessStepButton,
  WorkflowStepAction,
} from "@/components/workflow/WorkflowStepAction";
import { useDrawingCanvas } from "@/hooks/useDrawingCanvas";
import { isCanvasEmpty } from "@/lib/canvas/exportCanvas";
import type {
  GenerationStatus,
  MaterialId,
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
  const [drawMaterial, setDrawMaterial] = useState<MaterialId>("wood");
  const [drawColor, setDrawColor] = useState("#8B5A2B");

  useEffect(() => {
    fetch("/api/stylize")
      .then((res) => {
        if (!res.ok) throw new Error("api_unreachable");
        return res.json();
      })
      .then((data: { configured?: boolean }) => {
        if (data.configured) return;

        const isLocal =
          window.location.hostname === "localhost" ||
          window.location.hostname === "127.0.0.1";

        setConfigError(
          isLocal
            ? "Brak REPLICATE_API_TOKEN — skopiuj .env.example do .env.local i uzupełnij token."
            : "Brak REPLICATE_API_TOKEN — w Netlify: Site configuration → Environment variables → dodaj REPLICATE_API_TOKEN, potem Trigger deploy.",
        );
      })
      .catch(() => {
        setConfigError(
          "Nie można połączyć z API serwera. Sprawdź logi deployu na Netlify (build i Functions).",
        );
      });
  }, []);

  useEffect(() => {
    if (step !== "draw") return;

    const onKeyDown = (event: KeyboardEvent) => {
      const mod = event.ctrlKey || event.metaKey;
      if (!mod) return;

      if (event.key === "z" && !event.shiftKey) {
        event.preventDefault();
        drawing.undo();
      } else if (event.key === "y" || (event.key === "z" && event.shiftKey)) {
        event.preventDefault();
        drawing.redo();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- undo/redo są stabilne z useCallback
  }, [step, drawing.undo, drawing.redo]);

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
    setDrawMaterial(drawing.material);
    setDrawColor(drawing.color);
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
          material: drawMaterial,
          style,
          color: drawColor,
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
  }, [drawColor, drawMaterial, originalUrl, style]);

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

  const handleBackToDraw = useCallback(() => {
    setStep("draw");
  }, []);

  const handleBackToReview = useCallback(() => {
    setStep("review");
    setGenerationStatus("idle");
    setGenerationError(null);
  }, []);

  const isGenerating3D =
    generationStatus === "starting" || generationStatus === "processing";

  const canAcceptReview = reviewStatus === "ready" && Boolean(stylizedUrl);
  const isStylizing = reviewStatus === "generating";

  const headerAction = (
    <WorkflowStepAction>
      {step === "draw" && (
        <PrimaryStepButton onClick={handleContinueToReview}>
          Dalej: stylizacja
        </PrimaryStepButton>
      )}
      {step === "review" && canAcceptReview && (
        <SuccessStepButton
          onClick={handleAcceptAndGenerate3D}
          disabled={isGenerating3D}
        >
          {isGenerating3D ? "Generowanie 3D…" : "Akceptuj i generuj 3D"}
        </SuccessStepButton>
      )}
      {step === "review" && !canAcceptReview && (
        <PrimaryStepButton
          onClick={handleStylize}
          disabled={!originalUrl || isStylizing}
        >
          {isStylizing ? "Przekształcanie…" : "Przekształć w przedmiot"}
        </PrimaryStepButton>
      )}
      {step === "model" && modelUrl && (
        <DownloadStepLink href={modelUrl}>Pobierz .glb</DownloadStepLink>
      )}
      {step === "model" && !modelUrl && isGenerating3D && (
        <PrimaryStepButton disabled>Generowanie modelu…</PrimaryStepButton>
      )}
    </WorkflowStepAction>
  );

  const headerLeading =
    step === "review" ? (
      <HeaderBackButton onClick={handleBackToDraw} disabled={isGenerating3D}>
        ← Wróć do rysowania
      </HeaderBackButton>
    ) : step === "model" ? (
      <HeaderBackButton onClick={handleBackToReview}>
        ← Wróć do stylizacji
      </HeaderBackButton>
    ) : undefined;

  return (
    <AppShell headerAction={headerAction} headerLeading={headerLeading}>
      {configError && (
        <div className="shrink-0 border-b border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          {configError}
        </div>
      )}

      <StepIndicator currentStep={step} />

      {step === "draw" && (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <button
            type="button"
            className="shrink-0 border-b border-zinc-800 px-4 py-2 text-left text-sm text-zinc-400 lg:hidden"
            onClick={() => setSidebarOpen((v) => !v)}
          >
            {sidebarOpen ? "Ukryj panel" : "Pokaż materiały i narzędzia"}
          </button>
          <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
            <div
              className={`${sidebarOpen ? "block" : "hidden"} shrink-0 lg:block lg:overflow-y-auto`}
            >
              <MaterialSidebar
                material={drawing.material}
                onMaterialChange={drawing.setMaterial}
                tool={drawing.tool}
                onToolChange={drawing.setTool}
                brushSize={drawing.brushSize}
                onBrushSizeChange={drawing.setBrushSize}
                color={drawing.color}
                onColorChange={drawing.setColor}
                shadowEnabled={drawing.shadowEnabled}
                onShadowEnabledChange={drawing.setShadowEnabled}
                shadowIntensity={drawing.shadowIntensity}
                onShadowIntensityChange={drawing.setShadowIntensity}
                textureStrength={drawing.textureStrength}
                onTextureStrengthChange={drawing.setTextureStrength}
                lineCorrection={drawing.lineCorrection}
                onLineCorrectionChange={drawing.setLineCorrection}
                shapeKind={drawing.shapeKind}
                onShapeKindChange={drawing.setShapeKind}
                canUndo={drawing.canUndo}
                canRedo={drawing.canRedo}
                onUndo={drawing.undo}
                onRedo={drawing.redo}
                onClear={drawing.clearCanvas}
              />
            </div>
            <div className="min-h-0 min-w-0 flex-1">
              <DrawingCanvas
                canvasRef={drawing.canvasRef}
                canvasSize={drawing.canvasSize}
                tool={drawing.tool}
                onPointerDown={drawing.handlePointerDown}
                onPointerMove={drawing.handlePointerMove}
                onPointerUp={drawing.handlePointerUp}
              />
            </div>
          </div>
        </div>
      )}

      {step === "review" && (
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <div className="border-b border-zinc-800 p-4 lg:px-8">
            <StylePicker style={style} onStyleChange={setStyle} />
          </div>
          <ImageReview
            originalUrl={originalUrl}
            stylizedUrl={stylizedUrl}
            status={reviewStatus}
            error={reviewError}
            onRegenerate={handleStylize}
            isGenerating3D={isGenerating3D}
          />
        </div>
      )}

      {step === "model" && (
        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-4 lg:p-8">
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
