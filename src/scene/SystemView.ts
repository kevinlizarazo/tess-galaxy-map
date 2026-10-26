import {
  AmbientLight,
  BufferGeometry,
  Color,
  Group,
  LineBasicMaterial,
  LineLoop,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PointLight,
  Scene,
  SphereGeometry,
  Vector3,
  type Camera,
} from 'three';
import { temperatureToRgb } from '../astro/coords';
import {
  angularSpeed,
  displayOrbitRadius,
  displayPlanetRadius,
  displayStarRadius,
  isTemperate,
  planetEqTemp,
  resolveSemiMajorAxis,
} from '../astro/orbits';
import type { Planet, StarSystem } from '../data/types';
import { pickNearestOnScreen } from './picking';
import { createBackdrop, createGlowPoints } from './starfield';

interface PlanetBody {
  planet: Planet;
  mesh: Mesh<SphereGeometry, MeshStandardMaterial>;
  orbit: LineLoop<BufferGeometry, LineBasicMaterial>;
  radius: number;
  temperate: boolean;
  speed: number;
  phase: number;
}

/** Planet colour from equilibrium temperature: hot orange, temperate teal, cold blue. */
export function planetColor(eqTempK: number | null): Color {
  if (eqTempK === null) return new Color(0x9aa7b4);
  if (eqTempK > 1000) return new Color(0xff7a3d);
  if (eqTempK > 600) return new Color(0xe8a65a);
  if (eqTempK > 320) return new Color(0xd8c39a);
  if (eqTempK >= 175) return new Color(0x4fd6b0);
  return new Color(0x6f9de8);
}

/** The zoomed-in view of one star system with animated orbits. */
export class SystemView {
  readonly scene = new Scene();
  private readonly content = new Group();
  private bodies: PlanetBody[] = [];
  private selected = -1;
  system: StarSystem | null = null;
  /** Radius of the outermost orbit, used to frame the camera. */
  extent = 20;

  constructor() {
    this.scene.background = new Color(0x02040a);
    this.scene.add(createBackdrop(4000, 1200, 11), new AmbientLight(0xffffff, 0.15), this.content);
  }

  show(system: StarSystem): void {
    this.clear();
    this.system = system;

    const starRadius = displayStarRadius(system.radiusSun);
    const [r, g, b] = temperatureToRgb(system.teffK);
    const starColor = new Color(r, g, b);
    const star = new Mesh(new SphereGeometry(starRadius, 48, 32), new MeshBasicMaterial({ color: starColor }));
    const glow = createGlowPoints(
      new Float32Array([0, 0, 0]),
      new Float32Array([r, g, b]),
      new Float32Array([starRadius * 14]),
      undefined,
      false, // the glow sits inside the star sphere, so skip the depth test
    );
    const light = new PointLight(starColor, 2.5, 0, 0);
    this.content.add(star, glow, light);

    let extent = starRadius + 4;
    system.planets.forEach((planet, i) => {
      const a = resolveSemiMajorAxis(planet.semiMajorAxisAu, planet.periodDays, system.massSun, system.radiusSun);
      // Planets with no orbit data still get a ring, spaced by order.
      const radius = a !== null ? displayOrbitRadius(a, starRadius) : starRadius + 3 + i * 3;
      extent = Math.max(extent, radius);

      const eqTemp = planetEqTemp(planet, system).value;
      const temperate = isTemperate(eqTemp);
      const orbit = new LineLoop(
        circleGeometry(radius, 160),
        new LineBasicMaterial({
          color: temperate ? 0x4fd6b0 : 0x3fa9d6,
          transparent: true,
          opacity: temperate ? 0.7 : 0.35,
        }),
      );
      const mesh = new Mesh(
        new SphereGeometry(displayPlanetRadius(planet.radiusEarth), 32, 24),
        new MeshStandardMaterial({ color: planetColor(eqTemp), roughness: 0.8, metalness: 0.05 }),
      );
      this.content.add(orbit, mesh);
      this.bodies.push({
        planet,
        mesh,
        orbit,
        radius,
        temperate,
        speed: angularSpeed(planet.periodDays),
        // Golden-angle spread so planets don't start lined up.
        phase: i * 2.39996,
      });
    });
    this.extent = extent;
    this.update(0);
  }

  /** Advance orbits to `simDays` since the view opened. */
  update(simDays: number): void {
    for (const b of this.bodies) {
      const angle = b.phase + b.speed * simDays;
      b.mesh.position.set(Math.cos(angle) * b.radius, 0, -Math.sin(angle) * b.radius);
    }
  }

  setSelected(index: number): void {
    const prev = this.bodies[this.selected];
    if (prev) prev.orbit.material.opacity = prev.temperate ? 0.7 : 0.35;
    this.selected = index;
    const next = this.bodies[index];
    if (next) next.orbit.material.opacity = 1;
  }

  planetPositions(): Vector3[] {
    return this.bodies.map((b) => b.mesh.position);
  }

  planets(): Planet[] {
    return this.bodies.map((b) => b.planet);
  }

  pick(camera: Camera, cursor: { x: number; y: number }, viewport: { width: number; height: number }): number {
    return pickNearestOnScreen(this.planetPositions(), camera, cursor, viewport, 22);
  }

  private clear(): void {
    for (const child of [...this.content.children]) {
      this.content.remove(child);
      child.traverse((o) => {
        const m = o as Partial<Mesh>;
        m.geometry?.dispose();
        const mat = m.material;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else mat?.dispose();
      });
    }
    this.bodies = [];
    this.selected = -1;
    this.system = null;
  }
}

function circleGeometry(radius: number, segments: number): BufferGeometry {
  const pts: Vector3[] = [];
  for (let i = 0; i < segments; i++) {
    const t = (i / segments) * Math.PI * 2;
    pts.push(new Vector3(Math.cos(t) * radius, 0, Math.sin(t) * radius));
  }
  return new BufferGeometry().setFromPoints(pts);
}
