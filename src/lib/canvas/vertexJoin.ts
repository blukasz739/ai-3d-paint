import type { Point } from "@/lib/canvas/floodFill";

export interface LineSegment {
  from: Point;
  to: Point;
}

export interface VertexJoin {
  center: Point;
  dirA: Point;
  dirB: Point;
}

function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function normalize(dx: number, dy: number): Point {
  const len = Math.hypot(dx, dy);
  if (len < 0.001) return { x: 1, y: 0 };
  return { x: dx / len, y: dy / len };
}

function endpointKey(segmentIndex: number, end: "from" | "to"): string {
  return `${segmentIndex}:${end}`;
}

function directionFromEndpoint(
  segment: LineSegment,
  end: "from" | "to",
): Point {
  const dx = segment.to.x - segment.from.x;
  const dy = segment.to.y - segment.from.y;
  if (end === "from") return normalize(-dx, -dy);
  return normalize(dx, dy);
}

/** Przyciąga punkt do istniejącego końca linii w zasięgu grubości pędzla. */
export function snapPointToVertices(
  point: Point,
  segments: LineSegment[],
  snapDistance: number,
): Point {
  let best = point;
  let bestD = snapDistance + 1;

  for (const segment of segments) {
    for (const candidate of [segment.from, segment.to]) {
      const d = distance(point, candidate);
      if (d <= snapDistance && d < bestD) {
        bestD = d;
        best = { x: candidate.x, y: candidate.y };
      }
    }
  }

  return best;
}

/** Wyszukuje pary bliskich końców — miejsca na płynny wierzchołek. */
export function findVertexJoins(
  segments: LineSegment[],
  snapDistance: number,
): VertexJoin[] {
  const joins: VertexJoin[] = [];
  const used = new Set<string>();

  for (let i = 0; i < segments.length; i++) {
    for (const endA of ["from", "to"] as const) {
      const keyA = endpointKey(i, endA);
      if (used.has(keyA)) continue;

      const pointA = endA === "from" ? segments[i].from : segments[i].to;

      for (let j = 0; j < segments.length; j++) {
        for (const endB of ["from", "to"] as const) {
          if (i === j && endA === endB) continue;

          const keyB = endpointKey(j, endB);
          if (used.has(keyB)) continue;

          const pointB = endB === "from" ? segments[j].from : segments[j].to;
          const d = distance(pointA, pointB);
          if (d > snapDistance) continue;

          const dirA = directionFromEndpoint(segments[i], endA);
          const dirB = directionFromEndpoint(segments[j], endB);
          const alignment = dirA.x * dirB.x + dirA.y * dirB.y;
          if (alignment > 0.9) continue;

          const center = d < 0.5 ? pointA : midpoint(pointA, pointB);
          joins.push({ center, dirA, dirB });
          used.add(keyA);
          used.add(keyB);
        }
      }
    }
  }

  return joins;
}

export function snapLineSegment(
  from: Point,
  to: Point,
  segments: LineSegment[],
  snapDistance: number,
): LineSegment {
  return {
    from: snapPointToVertices(from, segments, snapDistance),
    to: snapPointToVertices(to, segments, snapDistance),
  };
}

/** Zaokrąglony łuk w masce wypełnienia — płynny wierzchołek zamiast ostrego mostka. */
export function markSmoothVertexBridge(
  mask: Uint8Array,
  width: number,
  height: number,
  from: Point,
  to: Point,
  brushSize: number,
): void {
  const center = midpoint(from, to);
  const radius = Math.max(2, brushSize * 0.55);
  const r = Math.ceil(radius);
  const r2 = radius * radius;
  const x0 = Math.max(0, Math.floor(center.x - r));
  const x1 = Math.min(width - 1, Math.ceil(center.x + r));
  const y0 = Math.max(0, Math.floor(center.y - r));
  const y1 = Math.min(height - 1, Math.ceil(center.y + r));

  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = x - center.x;
      const dy = y - center.y;
      if (dx * dx + dy * dy <= r2) {
        mask[y * width + x] = 1;
      }
    }
  }

  const armRadius = Math.max(1.5, brushSize * 0.4);
  const armR2 = armRadius * armRadius;
  const dist = distance(from, to);
  if (dist < 1) return;

  for (const arm of [from, to]) {
    const t = 0.35;
    const ax = arm.x + (center.x - arm.x) * t;
    const ay = arm.y + (center.y - arm.y) * t;
    const ax0 = Math.max(0, Math.floor(ax - armRadius));
    const ax1 = Math.min(width - 1, Math.ceil(ax + armRadius));
    const ay0 = Math.max(0, Math.floor(ay - armRadius));
    const ay1 = Math.min(height - 1, Math.ceil(ay + armRadius));

    for (let y = ay0; y <= ay1; y++) {
      for (let x = ax0; x <= ax1; x++) {
        const dx = x - ax;
        const dy = y - ay;
        if (dx * dx + dy * dy <= armR2) {
          mask[y * width + x] = 1;
        }
      }
    }
  }
}
