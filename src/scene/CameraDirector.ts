import { Vector3, type PerspectiveCamera } from 'three';
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

interface Flight {
  fromPos: Vector3;
  toPos: Vector3;
  fromTarget: Vector3;
  toTarget: Vector3;
  start: number;
  duration: number;
  resolve: () => void;
}

/** Smooth camera flights between points of interest, galaxy-map style. */
export class CameraDirector {
  private flight: Flight | null = null;
  reducedMotion = false;

  constructor(
    private readonly camera: PerspectiveCamera,
    private readonly controls: OrbitControls,
  ) {}

  get flying(): boolean {
    return this.flight !== null;
  }

  /** Fly to a camera position looking at a target. Resolves when the camera arrives. */
  flyTo(position: Vector3, target: Vector3, durationMs = 1600): Promise<void> {
    this.flight?.resolve();
    if (this.reducedMotion || durationMs <= 0) {
      this.jumpTo(position, target);
      this.flight = null;
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this.flight = {
        fromPos: this.camera.position.clone(),
        toPos: position.clone(),
        fromTarget: this.controls.target.clone(),
        toTarget: target.clone(),
        start: performance.now(),
        duration: durationMs,
        resolve,
      };
      this.controls.enabled = false;
    });
  }

  jumpTo(position: Vector3, target: Vector3): void {
    this.camera.position.copy(position);
    this.controls.target.copy(target);
    this.controls.update();
  }

  update(now: number): void {
    const f = this.flight;
    if (!f) return;
    const t = Math.min(1, (now - f.start) / f.duration);
    const k = easeInOutCubic(t);
    this.camera.position.lerpVectors(f.fromPos, f.toPos, k);
    this.controls.target.lerpVectors(f.fromTarget, f.toTarget, k);
    this.camera.lookAt(this.controls.target);
    if (t >= 1) {
      this.flight = null;
      this.controls.enabled = true;
      this.controls.update();
      f.resolve();
    }
  }
}
