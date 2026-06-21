import type { MaterialId, StyleId } from "@/lib/types/workflow";
import { MATERIALS, STYLES } from "@/lib/types/workflow";

export function buildStylizePrompt(material: MaterialId, style: StyleId): string {
  const materialLabel =
    MATERIALS.find((m) => m.id === material)?.promptLabel ?? material;
  const styleLabel =
    STYLES.find((s) => s.id === style)?.promptLabel ?? style;

  return [
    `Transform this sketch into a ${styleLabel} 3D-ready product image of the same object.`,
    `Material: ${materialLabel}.`,
    "Clean white background, centered object, sharp details, studio lighting,",
    "no text, no watermark, high quality product render.",
    "Preserve the shape and proportions from the input sketch.",
  ].join(" ");
}
