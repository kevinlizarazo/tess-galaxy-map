import type { StarSystem } from './types';

export type SizeClass = 'any' | 'earth' | 'super-earth' | 'neptune' | 'giant';

export interface SystemFilter {
  text: string;
  minPlanets: number;
  maxDistancePc: number | null;
  sizeClass: SizeClass;
}

export const DEFAULT_FILTER: SystemFilter = {
  text: '',
  minPlanets: 1,
  maxDistancePc: null,
  sizeClass: 'any',
};

/** Rough size buckets by planet radius in Earth radii. */
export function sizeClassOf(radiusEarth: number | null): Exclude<SizeClass, 'any'> | null {
  if (radiusEarth === null) return null;
  if (radiusEarth < 1.25) return 'earth';
  if (radiusEarth < 2) return 'super-earth';
  if (radiusEarth < 6) return 'neptune';
  return 'giant';
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[\s_-]+/g, '');
}

export function matchesText(system: StarSystem, text: string): boolean {
  const q = normalize(text);
  if (!q) return true;
  const haystack = [system.hostname, system.ticId ?? '', ...system.planets.map((p) => p.name)];
  return haystack.some((h) => normalize(h).includes(q));
}

export function matchesFilter(system: StarSystem, f: SystemFilter): boolean {
  if (system.planets.length < f.minPlanets) return false;
  if (f.maxDistancePc !== null && (system.distancePc === null || system.distancePc > f.maxDistancePc)) {
    return false;
  }
  if (f.sizeClass !== 'any' && !system.planets.some((p) => sizeClassOf(p.radiusEarth) === f.sizeClass)) {
    return false;
  }
  return matchesText(system, f.text);
}

export function filterSystems(systems: StarSystem[], f: SystemFilter): StarSystem[] {
  return systems.filter((s) => matchesFilter(s, f));
}
