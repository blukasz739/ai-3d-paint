import type { Point } from "@/lib/canvas/floodFill";

export type DetectedShape =
  | { type: "line"; from: Point; to: Point }
  | { type: "circle"; cx: number; cy: number; r: number }
  | { type: "rectangle"; x: number; y: number; w: number; h: number }
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

/**
 * Dopasowuje prostą do punktów szkicu. Końce liczone z punktów
 * blisko osi — ignoruje „haczyki” na początku/końcu ruchu.
 */
function fitLineEndpoints(points: Point[]): { from: Point; to: Point } {
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

function fitCircle(points: Point[]): {
  cx: number;
  cy: number;
  r: number;
  score: number;
} {
  const cx = points.reduce((s, p) => s + p.x, 0) / points.length;
  const cy = points.reduce((s, p) => s + p.y, 0) / points.length;
  const radii = points.map((p) => distance(p, { x: cx, y: cy }));
  const avgR = radii.reduce((s, r) => s + r, 0) / radii.length;
  if (avgR < 15) return { cx, cy, r: avgR, score: 0 };

  const variance =
    radii.reduce((s, r) => s + (r - avgR) ** 2, 0) / radii.length;
  const cv = Math.sqrt(variance) / avgR;

  const len = pathLength(points);
  const expectedLen = 2 * Math.PI * avgR;
  const lenRatio = len / expectedLen;
  const lengthScore = Math.max(0, 1 - Math.abs(lenRatio - 1) * 1.5);

  const radiusScore = Math.max(0, 1 - cv * 2.5);
  const score = radiusScore * 0.65 + lengthScore * 0.35;

  return { cx, cy, r: avgR, score };
}

function fitRectangle(points: Point[]): {
  x: number;
  y: number;
  w: number;
  h: number;
  score: number;
} {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const w = maxX - minX;
  const h = maxY - minY;
  if (w < 20 || h < 20) return { x: minX, y: minY, w, h, score: 0 };

  const aspect = Math.min(w, h) / Math.max(w, h);

  const margin = Math.max(3, Math.min(w, h) * 0.12);
  let onPerimeter = 0;
  let inCornerZone = 0;

  for (const p of points) {
    const nearLeft = Math.abs(p.x - minX) < margin;
    const nearRight = Math.abs(p.x - maxX) < margin;
    const nearTop = Math.abs(p.y - minY) < margin;
    const nearBottom = Math.abs(p.y - maxY) < margin;
    const onEdge =
      (nearLeft || nearRight) && p.y >= minY - margin && p.y <= maxY + margin;
    const onEdgeV =
      (nearTop || nearBottom) && p.x >= minX - margin && p.x <= maxX + margin;

    if (onEdge || onEdgeV) onPerimeter++;

    const cornerDist = Math.min(
      distance(p, { x: minX, y: minY }),
      distance(p, { x: maxX, y: minY }),
      distance(p, { x: minX, y: maxY }),
      distance(p, { x: maxX, y: maxY }),
    );
    if (cornerDist < margin * 2.5) inCornerZone++;
  }

  const perimeterRatio = onPerimeter / points.length;
  const cornerRatio = inCornerZone / points.length;

  let score = perimeterRatio * 0.6 + Math.min(cornerRatio * 4, 0.4);

  // Kwadratowy bbox to typowy przypadek koła — obniżamy wynik prostokąta.
  if (aspect > 0.72) {
    score *= 0.35;
  } else if (aspect > 0.55) {
    score *= 0.65;
  }

  return { x: minX, y: minY, w, h, score };
}

export function detectShape(points: Point[]): DetectedShape {
  if (points.length < 4) return { type: "freehand" };

  const start = points[0];
  const end = points[points.length - 1];
  const closed = distance(start, end) < 35;
  const totalLen = pathLength(points);

  if (closed && totalLen > 50) {
    const circle = fitCircle(points);
    const rect = fitRectangle(points);
    const aspect = Math.min(rect.w, rect.h) / Math.max(rect.w, rect.h);

    const circleWins =
      circle.score >= 0.38 &&
      (circle.score >= rect.score || aspect > 0.68);

    if (circleWins) {
      return { type: "circle", cx: circle.cx, cy: circle.cy, r: circle.r };
    }

    if (rect.score > 0.5 && aspect < 0.82) {
      return { type: "rectangle", x: rect.x, y: rect.y, w: rect.w, h: rect.h };
    }

    if (circle.score >= 0.32 && aspect > 0.6) {
      return { type: "circle", cx: circle.cx, cy: circle.cy, r: circle.r };
    }
  }

  const deviation = maxDeviationFromLine(points, start, end);
  const straightDist = distance(start, end);
  const fittedLine = fitLineEndpoints(points);
  const fittedDeviation = maxDeviationFromLine(
    points,
    fittedLine.from,
    fittedLine.to,
  );
  const fittedLen = distance(fittedLine.from, fittedLine.to);

  if (fittedLen > 25 && fittedDeviation < 12) {
    return { type: "line", from: fittedLine.from, to: fittedLine.to };
  }

  if (straightDist > 25 && deviation < 12) {
    return { type: "line", from: fittedLine.from, to: fittedLine.to };
  }

  if (totalLen > 30 && fittedDeviation < 18 && fittedLen / totalLen > 0.65) {
    return { type: "line", from: fittedLine.from, to: fittedLine.to };
  }

  return { type: "freehand" };
}
