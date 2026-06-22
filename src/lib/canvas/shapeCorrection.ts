import type { Point } from "@/lib/canvas/floodFill";
import type { ShapeKind } from "@/lib/types/workflow";

export type DetectedShape =
  | { type: "line"; from: Point; to: Point }
  | { type: "circle"; cx: number; cy: number; r: number }
  | { type: "rectangle"; x: number; y: number; w: number; h: number }
  | { type: "triangle"; x: number; y: number; w: number; h: number }
  | { type: "freehand" };

function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function pathLength(points: Point[]): number {
  let len = 0;
  for (let i = 1; i < points.length; i++) {
    len += distance(points[i - 1], points[i]);
  }
  return len;
}

function maxDeviationFromLine(
  points: Point[],
  from: Point,
  to: Point,
): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const lineLen = Math.hypot(dx, dy);
  if (lineLen < 1) return 0;

  let max = 0;
  for (const p of points) {
    const cross = Math.abs(dy * p.x - dx * p.y + to.x * from.y - to.y * from.x);
    max = Math.max(max, cross / lineLen);
  }
  return max;
}

/** Dopasowuje prostą — końce z punktów blisko osi, bez haczyków na końcach. */
export function fitLineEndpoints(points: Point[]): { from: Point; to: Point } {
  const n = points.length;
  let cx = 0;
  let cy = 0;
  for (const p of points) {
    cx += p.x;
    cy += p.y;
  }
  cx /= n;
  cy /= n;

  let cxx = 0;
  let cxy = 0;
  let cyy = 0;
  for (const p of points) {
    const dx = p.x - cx;
    const dy = p.y - cy;
    cxx += dx * dx;
    cxy += dx * dy;
    cyy += dy * dy;
  }

  const angle = 0.5 * Math.atan2(2 * cxy, cxx - cyy);
  const dirX = Math.cos(angle);
  const dirY = Math.sin(angle);

  const projected = points.map((p) => {
    const rx = p.x - cx;
    const ry = p.y - cy;
    return {
      t: rx * dirX + ry * dirY,
      perp: Math.abs(rx * dirY - ry * dirX),
    };
  });

  const perps = projected.map((p) => p.perp).sort((a, b) => a - b);
  const medianPerp = perps[Math.floor(perps.length / 2)] ?? 0;
  const devThreshold = Math.max(5, medianPerp * 1.6 + 2);

  const core = projected.filter((p) => p.perp <= devThreshold);
  const source = core.length >= 3 ? core : projected;

  let minT = Infinity;
  let maxT = -Infinity;

  for (const { t } of source) {
    if (t < minT) minT = t;
    if (t > maxT) maxT = t;
  }

  return {
    from: { x: cx + minT * dirX, y: cy + minT * dirY },
    to: { x: cx + maxT * dirX, y: cy + maxT * dirY },
  };
}

/** Wykrywa tylko prostą linię — bez zamiany na koła/prostokąty. */
export function detectLine(points: Point[]): { from: Point; to: Point } | null {
  if (points.length < 4) return null;

  const fittedLine = fitLineEndpoints(points);
  const fittedDeviation = maxDeviationFromLine(
    points,
    fittedLine.from,
    fittedLine.to,
  );
  const fittedLen = distance(fittedLine.from, fittedLine.to);
  const totalLen = pathLength(points);

  if (fittedLen < 8) return null;

  if (fittedDeviation < 12) return fittedLine;

  if (fittedDeviation < 18 && fittedLen / totalLen > 0.65) {
    return fittedLine;
  }

  return null;
}

/** Gotowy kształt z prostokąta przeciągnięcia (dowolny rozmiar). */
export function buildShapeFromBox(
  from: Point,
  to: Point,
  kind: ShapeKind,
): DetectedShape | null {
  const x = Math.min(from.x, to.x);
  const y = Math.min(from.y, to.y);
  const w = Math.abs(to.x - from.x);
  const h = Math.abs(to.y - from.y);

  if (w < 2 && h < 2) return null;

  switch (kind) {
    case "rectangle":
      return { type: "rectangle", x, y, w, h };
    case "circle":
      return {
        type: "circle",
        cx: x + w / 2,
        cy: y + h / 2,
        r: Math.min(w, h) / 2,
      };
    case "triangle":
      return { type: "triangle", x, y, w, h };
  }
}
