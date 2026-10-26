const DEG = Math.PI / 180;

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** RA/Dec (degrees) and distance to Cartesian ICRS coordinates in the same unit as distance. */
export function equatorialToCartesian(raDeg: number, decDeg: number, distance: number): Vec3 {
  const ra = raDeg * DEG;
  const dec = decDeg * DEG;
  return {
    x: distance * Math.cos(dec) * Math.cos(ra),
    y: distance * Math.cos(dec) * Math.sin(ra),
    z: distance * Math.sin(dec),
  };
}

// ICRS -> Galactic rotation matrix (Hipparcos, J2000).
const GAL = [
  [-0.0548755604162154, -0.873437090234885, -0.483835015548713],
  [0.494109427875584, -0.444829629960011, 0.746982244497219],
  [-0.867666149019005, -0.198076373431201, 0.455983776175066],
] as const;

export function equatorialToGalactic(v: Vec3): Vec3 {
  return {
    x: GAL[0][0] * v.x + GAL[0][1] * v.y + GAL[0][2] * v.z,
    y: GAL[1][0] * v.x + GAL[1][1] * v.y + GAL[1][2] * v.z,
    z: GAL[2][0] * v.x + GAL[2][1] * v.y + GAL[2][2] * v.z,
  };
}

/**
 * Compress distances so 7 pc and 400 pc neighbours both fit on screen
 * while keeping their order. Returns scene units.
 */
export function compressDistance(pc: number): number {
  return 30 * Math.log2(1 + pc / 8);
}

/** Fallback distance for stars with no measured distance. */
export const UNKNOWN_DISTANCE_PC = 500;

/**
 * Scene position of a star with the Sun at the origin. The galactic plane is
 * the XZ plane (Y is galactic north) so the map's grid lies along the Milky Way.
 */
export function starScenePosition(raDeg: number, decDeg: number, distancePc: number | null): Vec3 {
  const r = compressDistance(distancePc ?? UNKNOWN_DISTANCE_PC);
  const g = equatorialToGalactic(equatorialToCartesian(raDeg, decDeg, r));
  return { x: g.x, y: g.z, z: -g.y };
}

/**
 * Approximate blackbody colour for a stellar effective temperature.
 * Based on Tanner Helland's fit; returns linear-ish RGB in 0..1.
 */
export function temperatureToRgb(teffK: number | null): [number, number, number] {
  const t = Math.min(40000, Math.max(1000, teffK ?? 5800)) / 100;
  let r: number;
  let g: number;
  let b: number;
  if (t <= 66) {
    r = 255;
    g = 99.4708025861 * Math.log(t) - 161.1195681661;
    b = t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  } else {
    r = 329.698727446 * Math.pow(t - 60, -0.1332047592);
    g = 288.1221695283 * Math.pow(t - 60, -0.0755148492);
    b = 255;
  }
  const clamp = (v: number) => Math.min(255, Math.max(0, v)) / 255;
  return [clamp(r), clamp(g), clamp(b)];
}

/** Morgan–Keenan spectral class letter from effective temperature. */
export function spectralClass(teffK: number | null): string {
  if (teffK === null) return '?';
  if (teffK >= 30000) return 'O';
  if (teffK >= 10000) return 'B';
  if (teffK >= 7500) return 'A';
  if (teffK >= 6000) return 'F';
  if (teffK >= 5200) return 'G';
  if (teffK >= 3700) return 'K';
  return 'M';
}
