import { NextResponse } from "next/server";
import { getReplicateClient, isReplicateConfigured } from "@/lib/replicate/client";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  if (!isReplicateConfigured()) {
    return NextResponse.json(
      { error: "REPLICATE_API_TOKEN is not configured" },
      { status: 500 },
    );
  }

  try {
    const { id } = await params;
    const replicate = getReplicateClient();
    const prediction = await replicate.predictions.get(id);

    let modelUrl: string | null = null;

    if (prediction.status === "succeeded" && prediction.output) {
      const output = prediction.output as {
        model_file?: string;
      } | string;

      if (typeof output === "object" && output?.model_file) {
        modelUrl = output.model_file;
      } else if (typeof output === "string") {
        modelUrl = output;
      }
    }

    return NextResponse.json({
      id: prediction.id,
      status: prediction.status,
      modelUrl,
      error: prediction.error ?? null,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch prediction";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
