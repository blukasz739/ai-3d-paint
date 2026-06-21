import type Replicate from "replicate";

const TRELLIS2_OWNER = "fishwowater";
const TRELLIS2_NAME = "trellis2";

export async function getTrellis2VersionId(
  replicate: Replicate,
): Promise<string> {
  const model = await replicate.models.get(TRELLIS2_OWNER, TRELLIS2_NAME);
  const versionId = model.latest_version?.id;

  if (!versionId) {
    throw new Error("Could not resolve TRELLIS.2 model version on Replicate");
  }

  return versionId;
}

export interface Trellis2Input {
  image: string;
  seed?: number;
  preprocess_image?: boolean;
  generate_video?: boolean;
  generate_model?: boolean;
  pipeline_type?: string;
}

export async function createTrellis2Prediction(
  replicate: Replicate,
  input: Trellis2Input,
) {
  const versionId = await getTrellis2VersionId(replicate);

  return replicate.predictions.create({
    version: versionId,
    input,
  });
}
