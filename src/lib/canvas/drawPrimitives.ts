import { createMaterialPattern } from "@/lib/canvas/patterns";
import type { Point } from "@/lib/canvas/floodFill";
import type { DetectedShape } from "@/lib/canvas/shapeCorrection";
import type { DrawSettings } from "@/lib/canvas/drawSettings";
import type { VertexJoin } from "@/lib/canvas/vertexJoin";

function applyStrokeStyle(
  ctx: CanvasRenderingContext2D,
  settings: DrawSettings,
): void {
  const { tool, material, color, brushSize, textureStrength } = settings;

  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = brushSize;

  if (tool === "eraser") {
    ctx.globalCompositeOperation = "destination-out";
    ctx.strokeStyle = "rgba(0,0,0,1)";
  } else {
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = createMaterialPattern(
      ctx,
      material,
      color,
      textureStrength,
    );
  }
}

function getShadowOffset(settings: DrawSettings): number {
  return 2 + Math.round((settings.shadowIntensity / 100) * 4);
}

function getShadowAlpha(settings: DrawSettings): number {
  return 0.1 + (settings.shadowIntensity / 100) * 0.35;
}

/** Cień prostopadły do linii — nie wydłuża końców wzdłuż kreski. */
function perpendicularShadowOffset(
  from: Point,
  to: Point,
  offset: number,
): { ox: number; oy: number } {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy);
  if (len < 0.5) {
    return { ox: offset * 0.7, oy: offset * 0.7 };
  }

  let ox = (dy / len) * offset;
  let oy = (-dx / len) * offset;

  if (oy < 0) {
    ox = -ox;
    oy = -oy;
  }

  return { ox, oy };
}

function drawLineStroke(
  ctx: CanvasRenderingContext2D,
  from: Point,
  to: Point,
  settings: DrawSettings,
  lineCap: CanvasLineCap,
): void {
  applyStrokeStyle(ctx, settings);
  ctx.lineCap = lineCap;
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
}

/** Prosta z butt — cień równoległy, bez wystających końców. */
export function drawStraightLine(
  ctx: CanvasRenderingContext2D,
  from: Point,
  to: Point,
  settings: DrawSettings,
): void {
  const { shadowEnabled, tool } = settings;
  const lineCap: CanvasLineCap = "butt";

  if (!shadowEnabled || tool === "eraser") {
    drawLineStroke(ctx, from, to, settings, lineCap);
    ctx.globalCompositeOperation = "source-over";
    return;
  }

  const offset = getShadowOffset(settings);
  const { ox, oy } = perpendicularShadowOffset(from, to, offset);
  const shadowAlpha = getShadowAlpha(settings);

  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  ctx.lineCap = lineCap;
  ctx.lineJoin = "round";
  ctx.lineWidth = settings.brushSize;
  ctx.strokeStyle = `rgba(0,0,0,${shadowAlpha})`;
  ctx.beginPath();
  ctx.moveTo(from.x + ox, from.y + oy);
  ctx.lineTo(to.x + ox, to.y + oy);
  ctx.stroke();
  ctx.restore();

  drawLineStroke(ctx, from, to, settings, lineCap);
  ctx.globalCompositeOperation = "source-over";
}

function drawElbowStroke(
  ctx: CanvasRenderingContext2D,
  p1: Point,
  center: Point,
  p2: Point,
  settings: DrawSettings,
  strokeStyle: string | CanvasGradient | CanvasPattern,
): void {
  ctx.lineCap = "butt";
  ctx.lineJoin = "round";
  ctx.lineWidth = settings.brushSize;
  ctx.strokeStyle = strokeStyle;
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(center.x, center.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.stroke();
}

/** Płynny zaokrąglony wierzchołek tam, gdzie spotykają się dwie linie. */
export function drawSmoothVertexJoin(
  ctx: CanvasRenderingContext2D,
  join: VertexJoin,
  settings: DrawSettings,
): void {
  const { shadowEnabled, tool, brushSize } = settings;
  const half = brushSize / 2;
  const { center, dirA, dirB } = join;

  const p1 = { x: center.x + dirA.x * half, y: center.y + dirA.y * half };
  const p2 = { x: center.x + dirB.x * half, y: center.y + dirB.y * half };

  if (!shadowEnabled || tool === "eraser") {
    if (tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      drawElbowStroke(ctx, p1, center, p2, settings, "rgba(0,0,0,1)");
    } else {
      applyStrokeStyle(ctx, settings);
      drawElbowStroke(ctx, p1, center, p2, settings, ctx.strokeStyle);
    }
    ctx.globalCompositeOperation = "source-over";
    return;
  }

  const offset = getShadowOffset(settings);
  const shadowAlpha = getShadowAlpha(settings);
  const shadowP1 = { x: p1.x + offset * 0.65, y: p1.y + offset * 0.65 };
  const shadowCenter = {
    x: center.x + offset * 0.65,
    y: center.y + offset * 0.65,
  };
  const shadowP2 = { x: p2.x + offset * 0.65, y: p2.y + offset * 0.65 };

  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  drawElbowStroke(
    ctx,
    shadowP1,
    shadowCenter,
    shadowP2,
    settings,
    `rgba(0,0,0,${shadowAlpha})`,
  );
  ctx.restore();

  applyStrokeStyle(ctx, settings);
  drawElbowStroke(ctx, p1, center, p2, settings, ctx.strokeStyle);
  ctx.globalCompositeOperation = "source-over";
}

function drawShadowStroke(
  ctx: CanvasRenderingContext2D,
  draw: () => void,
  settings: DrawSettings,
  options?: { lineCap?: CanvasLineCap },
): void {
  const { shadowEnabled, brushSize } = settings;
  const lineCap = options?.lineCap ?? "round";

  if (!shadowEnabled || settings.tool === "eraser") {
    draw();
    return;
  }

  const shadowOffset = getShadowOffset(settings);
  const shadowAlpha = getShadowAlpha(settings);

  ctx.save();
  ctx.translate(shadowOffset, shadowOffset);
  ctx.globalCompositeOperation = "source-over";
  ctx.lineCap = lineCap;
  ctx.lineJoin = "round";
  ctx.lineWidth = brushSize;
  ctx.strokeStyle = `rgba(0,0,0,${shadowAlpha})`;
  draw();
  ctx.restore();

  draw();
}

export function drawSegment(
  ctx: CanvasRenderingContext2D,
  from: Point,
  to: Point,
  settings: DrawSettings,
): void {
  drawShadowStroke(ctx, () => {
    applyStrokeStyle(ctx, settings);
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  }, settings);
  ctx.globalCompositeOperation = "source-over";
}

function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/** Płynny odcinek swobodnego szkicu (krzywa Beziera przez punkty). */
export function drawFreehandSegment(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  settings: DrawSettings,
): void {
  const n = points.length;
  if (n < 2) return;

  if (n === 2) {
    drawSegment(ctx, points[0], points[1], settings);
    return;
  }

  const p0 = points[n - 3];
  const p1 = points[n - 2];
  const p2 = points[n - 1];
  const start = midpoint(p0, p1);
  const end = midpoint(p1, p2);

  drawShadowStroke(ctx, () => {
    applyStrokeStyle(ctx, settings);
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.quadraticCurveTo(p1.x, p1.y, end.x, end.y);
    ctx.stroke();
  }, settings);
  ctx.globalCompositeOperation = "source-over";
}

/** Domyka ostatni odcinek swobodnego szkicu do końca pociągnięcia. */
export function drawFreehandCap(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  settings: DrawSettings,
): void {
  if (points.length < 3) return;

  const p1 = points[points.length - 2];
  const p2 = points[points.length - 1];
  const start = midpoint(p1, p2);

  drawShadowStroke(ctx, () => {
    applyStrokeStyle(ctx, settings);
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  }, settings);
  ctx.globalCompositeOperation = "source-over";
}

export function interpolateStrokePoints(
  from: Point,
  to: Point,
  maxStep: number,
): Point[] {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.hypot(dx, dy);
  if (dist <= maxStep) return [to];

  const steps = Math.ceil(dist / maxStep);
  const points: Point[] = [];
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    points.push({ x: from.x + dx * t, y: from.y + dy * t });
  }
  return points;
}

export function drawCorrectedShape(
  ctx: CanvasRenderingContext2D,
  shape: DetectedShape,
  settings: DrawSettings,
): void {
  if (shape.type === "freehand") return;

  if (shape.type === "line") {
    drawStraightLine(ctx, shape.from, shape.to, settings);
    return;
  }

  drawShadowStroke(
    ctx,
    () => {
      applyStrokeStyle(ctx, settings);

      ctx.beginPath();
      switch (shape.type) {
        case "circle":
          ctx.arc(shape.cx, shape.cy, shape.r, 0, Math.PI * 2);
          break;
        case "rectangle":
          ctx.rect(shape.x, shape.y, shape.w, shape.h);
          break;
      }
      ctx.stroke();
    },
    settings,
  );
  ctx.globalCompositeOperation = "source-over";
}
