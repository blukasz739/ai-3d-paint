import { NextResponse } from "next/server";
import { buildStylizePrompt } from "@/lib/prompts/buildStylizePrompt";
import { validateDataUrlSize } from "@/lib/canvas/exportCanvas";
import { getReplicateClient, isReplicateConfigured } from "@/lib/replicate/client";
import type { MaterialId, StyleId } from "@/lib/types/workflow";
import { MATERIALS, STYLES } from "@/lib/types/workflow";

interface StylizeBody {
  canvasDataUrl?: string;
  material?: MaterialId;
  style?: StyleId;
  color?: string;
}

function isValidHexColor(color: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(color);
}

export async function GET() {
  return NextResponse.json({ configured: isReplicateConfigured() });
}

export async function POST(request: Request) {
  if (!isReplicateConfigured()) {
    return NextResponse.json(
      { error: "REPLICATE_API_TOKEN is not configured" },
      { status: 500 },
    );
  }

  try {
    const body = (await request.json()) as StylizeBody;
    const { canvasDataUrl, material, style, color } = body;

    if (!canvasDataUrl?.startsWith("data:image/")) {
      return NextResponse.json(
        { error: "Invalid canvas data URL" },
        { status: 400 },
      );
    }

    if (!validateDataUrlSize(canvasDataUrl)) {
      return NextResponse.json(
        { error: "Canvas image is too large (max 2MB)" },
        { status: 400 },
      );
    }

    if (!material || !MATERIALS.some((m) => m.id === material)) {
      return NextResponse.json({ error: "Invalid material" }, { status: 400 });
    }

    if (!style || !STYLES.some((s) => s.id === style)) {
      return NextResponse.json({ error: "Invalid style" }, { status: 400 });
    }

    if (!color || !isValidHexColor(color)) {
      return NextResponse.json({ error: "Invalid color" }, { status: 400 });
    }

    const replicate = getReplicateClient();
    const prompt = buildStylizePrompt(material, style, color);

    const output = await replicate.run("google/nano-banana-2", {
      input: {
        prompt,
        image_input: [canvasDataUrl],
        aspect_ratio: "1:1",
        resolution: "1K",
        output_format: "png",
      },
    });

    const imageUrl = typeof output === "string" ? output : String(output);

    return NextResponse.json({ imageUrl });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Stylization failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
