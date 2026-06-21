import type { MaterialId, Tool } from "@/lib/types/workflow";

export interface DrawSettings {
  tool: Tool;
  material: MaterialId;
  color: string;
  brushSize: number;
  shadowEnabled: boolean;
  shadowIntensity: number;
  textureStrength: number;
}
