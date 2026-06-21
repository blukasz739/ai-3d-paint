import type { MaterialId } from "@/lib/types/workflow";

export const COLOR_PRESETS = [
  "#ffffff",
  "#000000",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#8B5A2B",
  "#A8B0BC",
  "#6B6B6B",
] as const;

function drawPatternTile(
  pctx: CanvasRenderingContext2D,
  material: MaterialId,
  color: string,
  strength: number,
) {
  const alpha = Math.max(0.05, strength / 100);
  pctx.fillStyle = color;
  pctx.fillRect(0, 0, 32, 32);

  switch (material) {
    case "wood":
      pctx.strokeStyle = `rgba(0,0,0,${0.12 * alpha})`;
      for (let i = 0; i < 32; i += 5) {
        pctx.beginPath();
        pctx.moveTo(0, i);
        pctx.lineTo(32, i + 2);
        pctx.stroke();
      }
      break;
    case "metal":
      pctx.fillStyle = `rgba(255,255,255,${0.4 * alpha})`;
      pctx.fillRect(0, 0, 14, 32);
      pctx.fillStyle = `rgba(0,0,0,${0.08 * alpha})`;
      pctx.fillRect(14, 0, 18, 32);
      break;
    case "glass":
      pctx.fillStyle = `rgba(255,255,255,${0.35 * alpha})`;
      pctx.beginPath();
      pctx.arc(16, 16, 12, 0, Math.PI * 2);
      pctx.fill();
      pctx.strokeStyle = `rgba(255,255,255,${0.5 * alpha})`;
      pctx.lineWidth = 2;
      pctx.strokeRect(4, 4, 24, 24);
      break;
    case "stone":
      pctx.fillStyle = `rgba(0,0,0,${0.15 * alpha})`;
      pctx.fillRect(3, 3, 10, 10);
      pctx.fillRect(18, 8, 8, 8);
      pctx.fillRect(8, 20, 12, 9);
      break;
    case "plastic":
      pctx.fillStyle = `rgba(255,255,255,${0.3 * alpha})`;
      pctx.fillRect(0, 0, 32, 8);
      pctx.fillStyle = `rgba(0,0,0,${0.06 * alpha})`;
      pctx.fillRect(0, 24, 32, 8);
      break;
    case "fabric":
      pctx.strokeStyle = `rgba(0,0,0,${0.12 * alpha})`;
      for (let i = 0; i < 32; i += 4) {
        pctx.beginPath();
        pctx.moveTo(i, 0);
        pctx.lineTo(i, 32);
        pctx.stroke();
        pctx.beginPath();
        pctx.moveTo(0, i);
        pctx.lineTo(32, i);
        pctx.stroke();
      }
      break;
  }
}

export function createMaterialPattern(
  ctx: CanvasRenderingContext2D,
  material: MaterialId,
  color: string,
  textureStrength: number,
): CanvasPattern | string {
  if (textureStrength <= 0) return color;

  const patternCanvas = document.createElement("canvas");
  const tileSize = textureStrength > 50 ? 32 : 16;
  patternCanvas.width = tileSize;
  patternCanvas.height = tileSize;
  const pctx = patternCanvas.getContext("2d");
  if (!pctx) return color;

  drawPatternTile(pctx, material, color, textureStrength);
  return ctx.createPattern(patternCanvas, "repeat") ?? color;
}
