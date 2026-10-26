import { PerspectiveCamera, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { easeInOutCubic } from '../src/scene/CameraDirector';
import { pickNearestOnScreen, toScreen } from '../src/scene/picking';

function camera() {
  const cam = new PerspectiveCamera(60, 1, 0.1, 1000);
  cam.position.set(0, 0, 10);
  cam.lookAt(0, 0, 0);
  cam.updateMatrixWorld();
  return cam;
}

const viewport = { width: 800, height: 800 };

describe('pickNearestOnScreen', () => {
  it('picks the point under the cursor', () => {
    const pts = [new Vector3(-3, 0, 0), new Vector3(0, 0, 0), new Vector3(3, 0, 0)];
    expect(pickNearestOnScreen(pts, camera(), { x: 400, y: 400 }, viewport, 10)).toBe(1);
  });

  it('returns -1 when nothing is close enough', () => {
    expect(pickNearestOnScreen([new Vector3(0, 0, 0)], camera(), { x: 10, y: 10 }, viewport, 10)).toBe(-1);
  });

  it('ignores points behind the camera and unpickable points', () => {
    const pts = [new Vector3(0, 0, 20), new Vector3(0, 0, 0)];
    expect(pickNearestOnScreen(pts, camera(), { x: 400, y: 400 }, viewport, 10)).toBe(1);
    expect(pickNearestOnScreen(pts, camera(), { x: 400, y: 400 }, viewport, 10, (i) => i !== 1)).toBe(-1);
  });
});

describe('toScreen', () => {
  it('maps the view centre to the middle of the viewport', () => {
    const s = toScreen(new Vector3(), camera(), viewport);
    expect(s?.x).toBeCloseTo(400);
    expect(s?.y).toBeCloseTo(400);
  });
});

describe('easeInOutCubic', () => {
  it('starts at 0, ends at 1 and is symmetric', () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5);
  });
});
