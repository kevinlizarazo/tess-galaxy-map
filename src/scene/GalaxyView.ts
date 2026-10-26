import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  PolarGridHelper,
  Scene,
  Vector3,
  type Camera,
} from 'three';
import { starScenePosition, temperatureToRgb } from '../astro/coords';
import type { StarSystem } from '../data/types';
import { pickNearestOnScreen } from './picking';
import { createBackdrop, createGlowPoints } from './starfield';

const HIGHLIGHT_ALPHA = 1;
const DIMMED_ALPHA = 0.12;

/** The zoomed-out map: every TESS host star around the Sun, on a galactic-plane grid. */
export class GalaxyView {
  readonly scene = new Scene();
  readonly positions: Vector3[];
  private readonly stars;
  private readonly stalks: LineSegments<BufferGeometry, LineBasicMaterial>;
  private readonly visible: boolean[];
  private readonly baseSizes: Float32Array;
  private hovered = -1;

  constructor(private readonly systems: StarSystem[]) {
    this.scene.background = new Color(0x02040a);
    this.positions = systems.map((s) => {
      const p = starScenePosition(s.ra, s.dec, s.distancePc);
      return new Vector3(p.x, p.y, p.z);
    });
    this.visible = systems.map(() => true);

    const n = systems.length;
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    this.baseSizes = new Float32Array(n);
    systems.forEach((s, i) => {
      const p = this.positions[i]!;
      pos.set([p.x, p.y, p.z], i * 3);
      col.set(temperatureToRgb(s.teffK), i * 3);
      this.baseSizes[i] = 16 + Math.min(4, s.planets.length) * 3;
    });
    this.stars = createGlowPoints(pos, col, this.baseSizes.slice());
    this.stars.renderOrder = 2;

    this.stalks = this.buildStalks();
    this.scene.add(
      createBackdrop(7000, 1800),
      this.buildDisc(),
      this.buildGrid(),
      this.stalks,
      this.buildSol(),
      this.stars,
    );
  }

  /** Drop lines from each star to the galactic plane, like a 3D star chart. */
  private buildStalks(): LineSegments<BufferGeometry, LineBasicMaterial> {
    const verts = new Float32Array(this.positions.length * 6);
    this.positions.forEach((p, i) => verts.set([p.x, p.y, p.z, p.x, 0, p.z], i * 6));
    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(verts, 3));
    const mat = new LineBasicMaterial({ color: 0x3fa9d6, transparent: true, opacity: 0.22, depthWrite: false });
    return new LineSegments(geo, mat);
  }

  private buildGrid(): Group {
    const group = new Group();
    const grid = new PolarGridHelper(260, 12, 8, 96, 0x1d5f7a, 0x123a4c);
    const mat = grid.material as LineBasicMaterial;
    mat.transparent = true;
    mat.opacity = 0.45;
    mat.depthWrite = false;
    group.add(grid);
    return group;
  }

  /** Soft radial glow under the grid. Uses a canvas texture, so browser only. */
  private buildDisc(): Mesh {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      g.addColorStop(0, 'rgba(80, 160, 220, 0.35)');
      g.addColorStop(0.4, 'rgba(40, 90, 160, 0.15)');
      g.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, size, size);
    }
    const mesh = new Mesh(
      new PlaneGeometry(620, 620),
      new MeshBasicMaterial({
        map: new CanvasTexture(canvas),
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    );
    mesh.rotation.x = -Math.PI / 2;
    return mesh;
  }

  private buildSol(): Group {
    const group = new Group();
    const sol = createGlowPoints(
      new Float32Array([0, 0, 0]),
      new Float32Array(temperatureToRgb(5772)),
      new Float32Array([18]),
    );
    group.add(sol);
    return group;
  }

  /** Dim stars that fail the current filter. */
  setVisible(ids: ReadonlySet<string>): void {
    const alpha = this.stars.geometry.getAttribute('alpha') as BufferAttribute;
    this.systems.forEach((s, i) => {
      const on = ids.has(s.id);
      this.visible[i] = on;
      alpha.setX(i, on ? HIGHLIGHT_ALPHA : DIMMED_ALPHA);
    });
    alpha.needsUpdate = true;
  }

  setHovered(index: number): void {
    if (index === this.hovered) return;
    const size = this.stars.geometry.getAttribute('size') as BufferAttribute;
    if (this.hovered >= 0) size.setX(this.hovered, this.baseSizes[this.hovered]!);
    if (index >= 0) size.setX(index, this.baseSizes[index]! * 1.8);
    size.needsUpdate = true;
    this.hovered = index;
  }

  pick(camera: Camera, cursor: { x: number; y: number }, viewport: { width: number; height: number }): number {
    return pickNearestOnScreen(this.positions, camera, cursor, viewport, 18, (i) => this.visible[i] ?? false);
  }

  indexOf(systemId: string): number {
    return this.systems.findIndex((s) => s.id === systemId);
  }
}
