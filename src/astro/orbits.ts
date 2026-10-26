const DAYS_PER_YEAR = 365.25;

/**
 * Kepler's third law: semi-major axis in AU from period (days) and stellar mass
 * (solar masses), ignoring planet mass.
 */
export function semiMajorAxisAu(periodDays: number, starMassSun: number): number {
  const years = periodDays / DAYS_PER_YEAR;
  return Math.cbrt(starMassSun * years * years);
}

/**
 * Rough main-sequence mass from radius when the archive has no mass.
 * Good enough to place orbits; not for science.
 */
export function estimateStarMass(radiusSun: number | null): number {
  if (radiusSun === null || radiusSun <= 0) return 1;
  return Math.min(3, Math.max(0.08, radiusSun));
}

/** Best available semi-major axis for a planet, or null if nothing is known. */
export function resolveSemiMajorAxis(
  aAu: number | null,
  periodDays: number | null,
  starMassSun: number | null,
  starRadiusSun: number | null,
): number | null {
  if (aAu !== null && aAu > 0) return aAu;
  if (periodDays === null || periodDays <= 0) return null;
  return semiMajorAxisAu(periodDays, starMassSun ?? estimateStarMass(starRadiusSun));
}

/**
 * Display radius for an orbit in system-view scene units. Log-scaled so a
 * 0.006 AU and a 0.5 AU orbit are both visible, and always outside the star.
 */
export function displayOrbitRadius(aAu: number, starDisplayRadius: number): number {
  return starDisplayRadius + 2 + 9 * Math.log10(1 + aAu * 60);
}

/** Display radius for a planet sphere, log-scaled from Earth radii. */
export function displayPlanetRadius(radiusEarth: number | null): number {
  const r = radiusEarth ?? 1.5;
  return 0.2 + 0.32 * Math.log2(1 + r);
}

/** Display radius for a host star sphere. */
export function displayStarRadius(radiusSun: number | null): number {
  const r = radiusSun ?? 1;
  return 1 + 1.6 * Math.log2(1 + r * 2);
}

/**
 * Angular speed in radians per simulated day. Real periods are kept, so
 * relative speeds between planets in a system are correct.
 */
export function angularSpeed(periodDays: number | null): number {
  if (periodDays === null || periodDays <= 0) return 0;
  return (2 * Math.PI) / periodDays;
}

const AU_PER_SOLAR_RADIUS = 0.00465047;

/**
 * Blackbody equilibrium temperature (zero albedo, full heat redistribution):
 * Teq = Teff * sqrt(R* / 2a). Used only when the archive has no value.
 */
export function estimateEqTemp(teffK: number | null, radiusSun: number | null, aAu: number | null): number | null {
  if (teffK === null || radiusSun === null || aAu === null || aAu <= 0) return null;
  return teffK * Math.sqrt((radiusSun * AU_PER_SOLAR_RADIUS) / (2 * aAu));
}

/** Archive equilibrium temperature, or an estimate flagged as such. */
export function planetEqTemp(
  planet: { eqTempK: number | null; semiMajorAxisAu: number | null; periodDays: number | null },
  star: { teffK: number | null; radiusSun: number | null; massSun: number | null },
): { value: number | null; estimated: boolean } {
  if (planet.eqTempK !== null) return { value: planet.eqTempK, estimated: false };
  const a = resolveSemiMajorAxis(planet.semiMajorAxisAu, planet.periodDays, star.massSun, star.radiusSun);
  const value = estimateEqTemp(star.teffK, star.radiusSun, a);
  return { value, estimated: value !== null };
}

/** "Temperate" here means a blackbody equilibrium temperature of 175–320 K. */
export function isTemperate(eqTempK: number | null): boolean {
  return eqTempK !== null && eqTempK >= 175 && eqTempK <= 320;
}
