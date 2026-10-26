import type { Planet, PlanetRow, Snapshot, StarSystem } from './types';

const NUMERIC_FIELDS = [
  'sy_dist',
  'st_teff',
  'st_rad',
  'st_mass',
  'pl_rade',
  'pl_bmasse',
  'pl_orbper',
  'pl_orbsmax',
  'pl_eqt',
  'disc_year',
] as const;

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function planetLetter(planetName: string, hostname: string): string {
  if (planetName.startsWith(hostname)) {
    const rest = planetName.slice(hostname.length).trim();
    if (rest) return rest;
  }
  const parts = planetName.trim().split(/\s+/);
  return parts[parts.length - 1] ?? planetName;
}

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Coerce a loosely typed archive row into a PlanetRow.
 * Returns null when the row is missing a name, host, or sky position.
 */
export function normalizeRow(raw: Record<string, unknown>): PlanetRow | null {
  const pl_name = typeof raw.pl_name === 'string' ? raw.pl_name.trim() : '';
  const hostname = typeof raw.hostname === 'string' ? raw.hostname.trim() : '';
  const ra = toNumberOrNull(raw.ra);
  const dec = toNumberOrNull(raw.dec);
  if (!pl_name || !hostname || ra === null || dec === null) return null;

  const row: PlanetRow = {
    pl_name,
    hostname,
    ra,
    dec,
    sy_dist: null,
    st_teff: null,
    st_rad: null,
    st_mass: null,
    pl_rade: null,
    pl_bmasse: null,
    pl_orbper: null,
    pl_orbsmax: null,
    pl_eqt: null,
    disc_year: null,
    tic_id: raw.tic_id === null || raw.tic_id === undefined || raw.tic_id === '' ? null : String(raw.tic_id),
  };
  for (const field of NUMERIC_FIELDS) {
    row[field] = toNumberOrNull(raw[field]);
  }
  return row;
}

/** Group planet rows by host star, sorting planets by orbital period. */
export function groupSystems(rows: PlanetRow[]): StarSystem[] {
  const byHost = new Map<string, StarSystem>();
  for (const row of rows) {
    let system = byHost.get(row.hostname);
    if (!system) {
      system = {
        id: slugify(row.hostname),
        hostname: row.hostname,
        ticId: row.tic_id,
        ra: row.ra,
        dec: row.dec,
        distancePc: row.sy_dist,
        teffK: row.st_teff,
        radiusSun: row.st_rad,
        massSun: row.st_mass,
        planets: [],
      };
      byHost.set(row.hostname, system);
    }
    const planet: Planet = {
      name: row.pl_name,
      letter: planetLetter(row.pl_name, row.hostname),
      radiusEarth: row.pl_rade,
      massEarth: row.pl_bmasse,
      periodDays: row.pl_orbper,
      semiMajorAxisAu: row.pl_orbsmax,
      eqTempK: row.pl_eqt,
      discYear: row.disc_year,
    };
    system.planets.push(planet);
  }
  const systems = [...byHost.values()];
  for (const s of systems) {
    s.planets.sort((a, b) => (a.periodDays ?? Infinity) - (b.periodDays ?? Infinity));
  }
  return systems.sort((a, b) => a.hostname.localeCompare(b.hostname));
}

export function parseSnapshot(json: unknown): Snapshot {
  if (!json || typeof json !== 'object' || !Array.isArray((json as Snapshot).rows)) {
    throw new Error('Snapshot is missing a "rows" array');
  }
  const snap = json as { generated?: unknown; source?: unknown; rows: unknown[] };
  const rows = snap.rows
    .map((r) => (r && typeof r === 'object' ? normalizeRow(r as Record<string, unknown>) : null))
    .filter((r): r is PlanetRow => r !== null);
  return {
    generated: typeof snap.generated === 'string' ? snap.generated : 'unknown',
    source: typeof snap.source === 'string' ? snap.source : 'unknown',
    rows,
  };
}

export async function loadSystems(url: string): Promise<{ snapshot: Snapshot; systems: StarSystem[] }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}: HTTP ${res.status}`);
  const snapshot = parseSnapshot(await res.json());
  return { snapshot, systems: groupSystems(snapshot.rows) };
}
