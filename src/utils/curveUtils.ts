import { CurvePoint, ToneCurves } from '../types';

/**
 * Evaluates a smooth monotone spline at normalized position x in [0, 1].
 */
export function evaluateSpline(points: CurvePoint[] | undefined, x: number): number {
  if (!points || points.length === 0) return x;
  if (points.length === 1) return points[0].y;

  // Ensure points are sorted by x
  const pts = [...points].sort((a, b) => a.x - b.x);
  const n = pts.length;

  if (x <= pts[0].x) return Math.max(0, Math.min(1, pts[0].y));
  if (x >= pts[n - 1].x) return Math.max(0, Math.min(1, pts[n - 1].y));

  // Find segment [i, i+1] where pts[i].x <= x <= pts[i+1].x
  let i = 0;
  for (let k = 0; k < n - 1; k++) {
    if (x >= pts[k].x && x <= pts[k + 1].x) {
      i = k;
      break;
    }
  }

  const p0 = pts[i];
  const p1 = pts[i + 1];
  const dx = p1.x - p0.x;
  if (dx <= 0.00001) return p0.y;

  // Calculate clamped slopes for smooth, non-oscillating curves
  const prevP = i > 0 ? pts[i - 1] : p0;
  const nextP = i < n - 2 ? pts[i + 2] : p1;

  const dxPrev = p1.x - prevP.x;
  const dxNext = nextP.x - p0.x;

  const m0 = dxPrev > 0.00001 ? (p1.y - prevP.y) / dxPrev : (p1.y - p0.y) / dx;
  const m1 = dxNext > 0.00001 ? (nextP.y - p0.y) / dxNext : (p1.y - p0.y) / dx;

  const t = (x - p0.x) / dx;
  const t2 = t * t;
  const t3 = t2 * t;

  // Cubic Hermite basis
  const h00 = 2 * t3 - 3 * t2 + 1;
  const h10 = t3 - 2 * t2 + t;
  const h01 = -2 * t3 + 3 * t2;
  const h11 = t3 - t2;

  const y = h00 * p0.y + h10 * dx * m0 + h01 * p1.y + h11 * dx * m1;
  return Math.max(0, Math.min(1, y));
}

/**
 * Checks if any tone curve channel deviates from default identity
 */
export function isCurvesActive(curves?: ToneCurves): boolean {
  if (!curves) return false;
  const channels: (keyof ToneCurves)[] = ['master', 'red', 'green', 'blue'];
  for (const ch of channels) {
    const pts = curves[ch];
    if (!pts) continue;
    if (pts.length !== 2) return true;
    if (Math.abs(pts[0].x - 0) > 0.005 || Math.abs(pts[0].y - 0) > 0.005) return true;
    if (Math.abs(pts[1].x - 1) > 0.005 || Math.abs(pts[1].y - 1) > 0.005) return true;
  }
  return false;
}

/**
 * Creates a 256x1 RGBA Uint8Array LUT mapping 0..255 input values to output RGB values
 */
export function createCurveLUT(curves?: ToneCurves): Uint8Array {
  const lut = new Uint8Array(256 * 4);
  const masterPts = curves?.master || [{ x: 0, y: 0 }, { x: 1, y: 1 }];
  const redPts = curves?.red || [{ x: 0, y: 0 }, { x: 1, y: 1 }];
  const greenPts = curves?.green || [{ x: 0, y: 0 }, { x: 1, y: 1 }];
  const bluePts = curves?.blue || [{ x: 0, y: 0 }, { x: 1, y: 1 }];

  for (let i = 0; i < 256; i++) {
    const u = i / 255.0;

    // Apply master curve
    const masterVal = evaluateSpline(masterPts, u);

    // Apply color channel curves
    const r = evaluateSpline(redPts, masterVal);
    const g = evaluateSpline(greenPts, masterVal);
    const b = evaluateSpline(bluePts, masterVal);

    lut[i * 4 + 0] = Math.round(Math.max(0, Math.min(1, r)) * 255);
    lut[i * 4 + 1] = Math.round(Math.max(0, Math.min(1, g)) * 255);
    lut[i * 4 + 2] = Math.round(Math.max(0, Math.min(1, b)) * 255);
    lut[i * 4 + 3] = 255;
  }

  return lut;
}
