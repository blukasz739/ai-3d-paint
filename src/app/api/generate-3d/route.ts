import { NextResponse } from "next/server";
import { getReplicateClient, isReplicateConfigured } from "@/lib/replicate/client";
import { createTrellis2Prediction } from "@/lib/replicate/models";

interface Generate3DBody {
  imageUrl?: string;
}

export async function POST(request: Request) {
  if (!isReplicateConfigured()) {
    return NextResponse.json(
      { error: "REPLICATE_API_TOKEN is not configured" },
      { status: 500 },
    );
  }

  try {
    const body = (await request.json()) as Generate3DBody;
    const { imageUrl } = body;

    if (!imageUrl || !imageUrl.startsWith("http")) {
      return NextResponse.json({ error: "Invalid image URL" }, { status: 400 });
    }

    const replicate = getReplicateClient();

    const prediction = await createTrellis2Prediction(replicate, {
      image: imageUrl,
      seed: 42,
      preprocess_image: true,
      generate_video: false,
      generate_model: true,
      pipeline_type: "1024_cascade",
    });

    return NextResponse.json({
      predictionId: prediction.id,
      status: prediction.status,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "3D generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
