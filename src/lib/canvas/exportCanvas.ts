const MAX_DATA_URL_BYTES = 2 * 1024 * 1024;

export function canvasToDataUrl(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL("image/png");
}

export function isCanvasEmpty(canvas: HTMLCanvasElement): boolean {
  const ctx = canvas.getContext("2d");
  if (!ctx) return true;

  const { width, height } = canvas;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  for (let i = 3; i < data.length; i += 4) {
    if (data[i] > 0) return false;
  }

  return true;
}

export function validateDataUrlSize(dataUrl: string): boolean {
  return dataUrl.length <= MAX_DATA_URL_BYTES;
}
