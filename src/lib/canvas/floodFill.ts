import { createMaterialPattern } from "@/lib/canvas/patterns";
import type { DrawSettings } from "@/lib/canvas/drawSettings";
import { markSmoothVertexBridge } from "@/lib/canvas/vertexJoin";

export interface Point {
  x: number;
  y: number;
}

export type FillSettings = Pick<
  DrawSettings,
  "material" | "color" | "textureStrength" | "brushSize"
>;

/** Próg nasycenia: poniżej = cień / anty-alias / szarość (zawsze wypełnialne). */
const SOFT_PIXEL_SATURATION_MAX = 45;

/**
 * Rdzeń obrysu — tylko w pełni kryjące, wyraźnie nasycone piksele.
 * Cień (niskie saturation) i anty-alias (alpha < 255) NIGDY nie blokują.
 */
function isHardBarrier(data: Uint8ClampedArray, idx: number): boolean {
  const r = data[idx];
  const g = data[idx + 1];
  const b = data[idx + 2];
  const a = data[idx + 3];

  if (a < 240) return false;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const saturation = max - min;

  if (saturation < SOFT_PIXEL_SATURATION_MAX) return false;

  return saturation > 38;
}

/** Cień z drawPrimitives — ciemny, mało nasycony, półprzezroczysty. */
function isShadowPixel(data: Uint8ClampedArray, idx: number): boolean {
  const r = data[idx];
  const g = data[idx + 1];
  const b = data[idx + 2];
  const a = data[idx + 3];

  if (a < 12 || a > 220) return false;

  const saturation = Math.max(r, g, b) - Math.min(r, g, b);
  const lightness = (r + g + b) / 3;

  return saturation < SOFT_PIXEL_SATURATION_MAX && lightness < 235;
}

/** Piksel anty-aliasu lub innej miękkiej krawędzi (niepełna krycie). */
function isAntiAliasPixel(data: Uint8ClampedArray, idx: number): boolean {
  const a = data[idx + 3];
  return a > 0 && a < 250;
}

function isFillCandidate(
  data: Uint8ClampedArray,
  idx: number,
  bridgeMask: Uint8Array,
  pi: number,
): boolean {
  if (bridgeMask[pi] || isHardBarrier(data, idx)) return false;
  return true;
}

function buildHardBarrierMask(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): Uint8Array {
  const mask = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) {
    if (isHardBarrier(data, i * 4)) mask[i] = 1;
  }
  return mask;
}

/** Rozszerza obrys o anty-alias przylegający do twardego obrysu — lepszy szkielet. */
function buildBarrierMaskForEndpoints(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): Uint8Array {
  const mask = buildHardBarrierMask(data, width, height);

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const pi = y * width + x;
      if (mask[pi]) continue;

      const idx = pi * 4;
      if (!isAntiAliasPixel(data, idx) && data[idx + 3] < 200) continue;

      let touchesHard = false;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          if (mask[(y + dy) * width + (x + dx)]) touchesHard = true;
        }
      }
      if (touchesHard) mask[pi] = 1;
    }
  }

  return mask;
}

/** Zhang-Suen — cienki szkielet obrysu do wykrywania końców linii. */
function skeletonizeMask(
  mask: Uint8Array,
  width: number,
  height: number,
): Uint8Array {
  const img = new Uint8Array(mask);
  const get = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return 0;
    return img[y * width + x];
  };

  const transitions = (p: number[]) => {
    let count = 0;
    for (let i = 0; i < 8; i++) {
      if (p[i] === 0 && p[(i + 1) % 8] === 1) count++;
    }
    return count;
  };

  const sumNeighbors = (x: number, y: number) => {
    let s = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        s += get(x + dx, y + dy);
      }
    }
    return s;
  };

  let changed = true;
  while (changed) {
    changed = false;
    const toRemove: number[] = [];

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        if (!img[y * width + x]) continue;

        const p = [
          get(x, y - 1),
          get(x + 1, y - 1),
          get(x + 1, y),
          get(x + 1, y + 1),
          get(x, y + 1),
          get(x - 1, y + 1),
          get(x - 1, y),
          get(x - 1, y - 1),
        ];
        const b = sumNeighbors(x, y);
        const a = transitions(p);

        if (b < 2 || b > 6 || a !== 1) continue;
        if (p[0] * p[2] * p[4] !== 0) continue;
        if (p[2] * p[4] * p[6] !== 0) continue;

        toRemove.push(y * width + x);
      }
    }

    for (const pi of toRemove) {
      img[pi] = 0;
      changed = true;
    }

    toRemove.length = 0;

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        if (!img[y * width + x]) continue;

        const p = [
          get(x, y - 1),
          get(x + 1, y - 1),
          get(x + 1, y),
          get(x + 1, y + 1),
          get(x, y + 1),
          get(x - 1, y + 1),
          get(x - 1, y),
          get(x - 1, y - 1),
        ];
        const b = sumNeighbors(x, y);
        const a = transitions(p);

        if (b < 2 || b > 6 || a !== 1) continue;
        if (p[0] * p[2] * p[6] !== 0) continue;
        if (p[0] * p[4] * p[6] !== 0) continue;

        toRemove.push(y * width + x);
      }
    }

    for (const pi of toRemove) {
      img[pi] = 0;
      changed = true;
    }
  }

  return img;
}

/** Końce otwartych linii — węzły szkieletu z dokładnie jednym sąsiadem. */
function findLineEndpoints(
  skeleton: Uint8Array,
  width: number,
  height: number,
): Point[] {
  const endpoints: Point[] = [];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      if (!skeleton[y * width + x]) continue;

      let neighbors = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          if (skeleton[(y + dy) * width + (x + dx)]) neighbors++;
        }
      }

      if (neighbors === 1) {
        endpoints.push({ x, y });
      }
    }
  }

  return endpoints;
}

/** Zapasowe końce — wypukłe wierzchołki obrysu (gdy szkielet zawiedzie). */
function findConvexBarrierTips(
  barrierMask: Uint8Array,
  width: number,
  height: number,
): Point[] {
  const tips: Point[] = [];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      if (!barrierMask[y * width + x]) continue;

      let neighbors = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          if (barrierMask[(y + dy) * width + (x + dx)]) neighbors++;
        }
      }

      if (neighbors <= 3) {
        tips.push({ x, y });
      }
    }
  }

  return tips;
}

function mergeNearbyPoints(points: Point[], minDist: number): Point[] {
  const merged: Point[] = [];

  for (const p of points) {
    let found = false;
    for (const m of merged) {
      if (Math.hypot(p.x - m.x, p.y - m.y) < minDist) {
        m.x = (m.x + p.x) / 2;
        m.y = (m.y + p.y) / 2;
        found = true;
        break;
      }
    }
    if (!found) merged.push({ x: p.x, y: p.y });
  }

  return merged;
}

function connectNearbyEndpoints(
  endpoints: Point[],
  maxDistance: number,
): Array<[Point, Point]> {
  const used = new Set<number>();
  const result: Array<[Point, Point]> = [];

  for (let i = 0; i < endpoints.length; i++) {
    if (used.has(i)) continue;

    let bestJ = -1;
    let bestD = maxDistance + 1;

    for (let j = 0; j < endpoints.length; j++) {
      if (i === j || used.has(j)) continue;
      const d = Math.hypot(
        endpoints[j].x - endpoints[i].x,
        endpoints[j].y - endpoints[i].y,
      );
      if (d <= maxDistance && d < bestD) {
        bestD = d;
        bestJ = j;
      }
    }

    if (bestJ >= 0) {
      result.push([endpoints[i], endpoints[bestJ]]);
      used.add(i);
      used.add(bestJ);
    }
  }

  return result;
}

/** Końce linii w okolicy kliknięcia — rozszerzamy promień aż znajdziemy parę. */
function findRegionalEndpoints(
  endpoints: Point[],
  cx: number,
  cy: number,
  brushSize: number,
): Point[] {
  if (endpoints.length < 2) return endpoints;

  const maxRadius = Math.min(280, Math.max(brushSize * 10, 80));
  const step = Math.max(4, brushSize * 0.5);

  for (let r = brushSize; r <= maxRadius; r += step) {
    const regional = endpoints.filter(
      (ep) => Math.hypot(ep.x - cx, ep.y - cy) <= r,
    );
    if (regional.length >= 2) return regional;
  }

  return endpoints.filter(
    (ep) => Math.hypot(ep.x - cx, ep.y - cy) <= maxRadius,
  );
}

/** Mostki między bliskimi końcami linii w okolicy kliknięcia. */
function buildEndpointBridgeMask(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  brushSize: number,
  startX: number,
  startY: number,
): Uint8Array {
  const barrierMask = buildBarrierMaskForEndpoints(data, width, height);
  const skeleton = skeletonizeMask(barrierMask, width, height);
  let allEndpoints = findLineEndpoints(skeleton, width, height);

  let endpoints = findRegionalEndpoints(
    allEndpoints,
    startX,
    startY,
    brushSize,
  );

  if (endpoints.length < 2) {
    const tipEndpoints = findConvexBarrierTips(barrierMask, width, height);
    allEndpoints = mergeNearbyPoints(
      [...allEndpoints, ...tipEndpoints],
      Math.max(3, brushSize * 0.4),
    );
    endpoints = findRegionalEndpoints(
      allEndpoints,
      startX,
      startY,
      brushSize,
    );
  }

  if (endpoints.length < 2) return new Uint8Array(width * height);

  const snapDistance = brushSize;
  const pairs = connectNearbyEndpoints(endpoints, snapDistance);
  const bridgeMask = new Uint8Array(width * height);

  for (const [from, to] of pairs) {
    markSmoothVertexBridge(bridgeMask, width, height, from, to, brushSize);
  }

  return bridgeMask;
}

function hasFilledNeighbor(
  mask: Uint8Array,
  width: number,
  height: number,
  x: number,
  y: number,
): boolean {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
      if (mask[ny * width + nx]) return true;
    }
  }
  return false;
}

function buildFillMask(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  startX: number,
  startY: number,
  bridgeMask: Uint8Array,
): Uint8Array | null {
  if (startX < 0 || startY < 0 || startX >= width || startY >= height) {
    return null;
  }

  const startPi = startY * width + startX;
  const startIdx = startPi * 4;
  if (bridgeMask[startPi] || isHardBarrier(data, startIdx)) return null;

  const mask = new Uint8Array(width * height);
  const stack: Point[] = [{ x: startX, y: startY }];

  while (stack.length > 0) {
    const { x, y } = stack.pop()!;
    const pi = y * width + x;
    if (mask[pi]) continue;

    const idx = pi * 4;
    if (!isFillCandidate(data, idx, bridgeMask, pi)) continue;

    mask[pi] = 1;

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          stack.push({ x: nx, y: ny });
        }
      }
    }
  }

  return mask;
}

/**
 * Pętla aż do stabilizacji: wchłania cień, anty-alias i jasne schodki
 * sąsiadujące z już wypełnionym obszarem.
 */
function expandThroughSoftPixels(
  mask: Uint8Array,
  data: Uint8ClampedArray,
  width: number,
  height: number,
  maxIterations: number,
  bridgeMask: Uint8Array,
): void {
  for (let iter = 0; iter < maxIterations; iter++) {
    const next = new Uint8Array(mask);
    let changed = false;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const pi = y * width + x;
        if (mask[pi]) continue;
        if (!hasFilledNeighbor(mask, width, height, x, y)) continue;

        const idx = pi * 4;
        if (bridgeMask[pi] || isHardBarrier(data, idx)) continue;

        const isSoft =
          isShadowPixel(data, idx) ||
          isAntiAliasPixel(data, idx) ||
          isFillCandidate(data, idx, bridgeMask, pi);

        if (isSoft) {
          next[pi] = 1;
          changed = true;
        }
      }
    }

    mask.set(next);
    if (!changed) break;
  }
}

function applyPatternToMask(
  ctx: CanvasRenderingContext2D,
  mask: Uint8Array,
  settings: FillSettings,
): void {
  const { width, height } = ctx.canvas;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  const patternCanvas = document.createElement("canvas");
  patternCanvas.width = width;
  patternCanvas.height = height;
  const patternCtx = patternCanvas.getContext("2d");
  if (!patternCtx) return;

  const fillStyle = createMaterialPattern(
    patternCtx,
    settings.material,
    settings.color,
    settings.textureStrength,
  );
  patternCtx.fillStyle = fillStyle;
  patternCtx.fillRect(0, 0, width, height);

  const patternData = patternCtx.getImageData(0, 0, width, height).data;

  for (let i = 0; i < width * height; i++) {
    if (!mask[i]) continue;
    const idx = i * 4;
    data[idx] = patternData[idx];
    data[idx + 1] = patternData[idx + 1];
    data[idx + 2] = patternData[idx + 2];
    data[idx + 3] = 255;
  }

  ctx.putImageData(imageData, 0, 0);
}

export function floodFill(
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  settings: FillSettings,
): boolean {
  const { width, height } = ctx.canvas;
  const x = Math.floor(startX);
  const y = Math.floor(startY);

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const bridgeMask = buildEndpointBridgeMask(
    data,
    width,
    height,
    settings.brushSize,
    x,
    y,
  );
  const mask = buildFillMask(data, width, height, x, y, bridgeMask);
  if (!mask) return false;

  let filled = 0;
  for (let i = 0; i < mask.length; i++) if (mask[i]) filled++;
  if (filled === 0) return false;

  const softPasses =
    Math.max(12, Math.ceil(settings.brushSize) + 6);

  expandThroughSoftPixels(mask, data, width, height, softPasses, bridgeMask);

  applyPatternToMask(ctx, mask, settings);
  return true;
}
