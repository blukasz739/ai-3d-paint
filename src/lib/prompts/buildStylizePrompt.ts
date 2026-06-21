import type { MaterialId, StyleId } from "@/lib/types/workflow";
import { MATERIALS, STYLES } from "@/lib/types/workflow";

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const normalized = hex.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return null;
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

function describeColor(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  const { r, g, b } = rgb;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2 / 255;

  let hueName = "neutral";
  if (max - min > 20) {
    if (r >= g && r >= b) hueName = g > b * 1.2 ? "warm orange-red" : "red";
    else if (g >= r && g >= b) hueName = b > r * 1.2 ? "cyan-green" : "green";
    else if (b >= r && b >= g) hueName = r > g * 1.2 ? "purple-blue" : "blue";
    else if (r > 200 && g > 180 && b < 120) hueName = "yellow";
    else if (r > 180 && g > 100 && b > 150) hueName = "pink";
  }

  const tone =
    lightness > 0.75 ? "light" : lightness < 0.3 ? "dark" : "medium";

  return `${tone} ${hueName} (${hex})`;
}

export function buildStylizePrompt(
  material: MaterialId,
  style: StyleId,
  color: string,
): string {
  const materialLabel =
    MATERIALS.find((m) => m.id === material)?.promptLabel ?? material;
  const styleLabel =
    STYLES.find((s) => s.id === style)?.promptLabel ?? style;
  const colorLabel = describeColor(color);

  return [
    `Transform this sketch into a ${styleLabel} 3D-ready product image of the same object.`,
    `Material: ${materialLabel}.`,
    `The object must use this exact primary color: ${colorLabel}.`,
    "Match the color from the sketch closely — do not change hue or saturation.",
    "Clean white background, centered object, sharp details, studio lighting,",
    "no text, no watermark, high quality product render.",
    "Preserve the shape, proportions and colors from the input sketch.",
  ].join(" ");
}
