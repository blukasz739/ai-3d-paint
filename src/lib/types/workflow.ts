export type MaterialId =
  | "wood"
  | "metal"
  | "glass"
  | "stone"
  | "plastic"
  | "fabric";

export type StyleId =
  | "realistic"
  | "animated"
  | "cartoon"
  | "lowpoly"
  | "watercolor";

export type WorkflowStep = "draw" | "review" | "model";

export type ReviewStatus =
  | "idle"
  | "generating"
  | "ready"
  | "approved"
  | "error";

export type GenerationStatus =
  | "idle"
  | "starting"
  | "processing"
  | "succeeded"
  | "failed";

export type Tool = "brush" | "eraser" | "fill" | "shape";

export type ShapeKind = "rectangle" | "triangle" | "circle";

export const SHAPE_KINDS: { id: ShapeKind; label: string }[] = [
  { id: "rectangle", label: "Prostokąt" },
  { id: "triangle", label: "Trójkąt" },
  { id: "circle", label: "Koło" },
];

export interface MaterialOption {
  id: MaterialId;
  label: string;
  promptLabel: string;
  swatch: string;
}

export interface StyleOption {
  id: StyleId;
  label: string;
  promptLabel: string;
}

export const MATERIALS: MaterialOption[] = [
  { id: "wood", label: "Drewno", promptLabel: "wooden with visible grain", swatch: "#8B5A2B" },
  { id: "metal", label: "Metal", promptLabel: "polished metallic", swatch: "#A8B0BC" },
  { id: "glass", label: "Szkło", promptLabel: "translucent glass", swatch: "#7EC8E3" },
  { id: "stone", label: "Kamień", promptLabel: "rough stone", swatch: "#6B6B6B" },
  { id: "plastic", label: "Plastik", promptLabel: "smooth plastic", swatch: "#E74C3C" },
  { id: "fabric", label: "Tkanina", promptLabel: "soft fabric texture", swatch: "#9B59B6" },
];

export const STYLES: StyleOption[] = [
  { id: "realistic", label: "Realistyczny", promptLabel: "photorealistic" },
  { id: "animated", label: "Animowany", promptLabel: "animated 3D render" },
  { id: "cartoon", label: "Kreskówkowy", promptLabel: "cartoon stylized" },
  { id: "lowpoly", label: "Low-poly", promptLabel: "low-poly geometric" },
  { id: "watercolor", label: "Akwarela", promptLabel: "watercolor illustration" },
];

export const WORKFLOW_STEPS: { id: WorkflowStep; label: string }[] = [
  { id: "draw", label: "Rysowanie" },
  { id: "review", label: "Stylizacja" },
  { id: "model", label: "Model 3D" },
];
