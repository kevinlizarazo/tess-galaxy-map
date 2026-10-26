import { Vector3, type Camera } from 'three';

const tmp = new Vector3();

/**
 * Screen-space picking: index of the point closest to the cursor within
 * `maxPx` pixels, or -1. More forgiving than ray-vs-point tests for tiny stars.
 */
export function pickNearestOnScreen(
  points: readonly Vector3[],
  camera: Camera,
  cursorPx: { x: number; y: number },
  viewport: { width: number; height: number },
  maxPx: number,
  isPickable: (index: number) => boolean = () => true,
): number {
  let best = -1;
  let bestDist = maxPx * maxPx;
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (!p || !isPickable(i)) continue;
    tmp.copy(p).project(camera);
    if (tmp.z < -1 || tmp.z > 1) continue; // behind the camera or past the far plane
    const sx = ((tmp.x + 1) / 2) * viewport.width;
    const sy = ((1 - tmp.y) / 2) * viewport.height;
    const dx = sx - cursorPx.x;
    const dy = sy - cursorPx.y;
    const d = dx * dx + dy * dy;
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}

/** Project a world point to CSS pixels, or null when it is off-camera. */
export function toScreen(
  point: Vector3,
  camera: Camera,
  viewport: { width: number; height: number },
): { x: number; y: number } | null {
  tmp.copy(point).project(camera);
  if (tmp.z < -1 || tmp.z > 1) return null;
  return { x: ((tmp.x + 1) / 2) * viewport.width, y: ((1 - tmp.y) / 2) * viewport.height };
}
