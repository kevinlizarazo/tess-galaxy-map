import { normalizeRow } from './loadSystems';
import type { PlanetRow, Snapshot } from './types';

export const TAP_ENDPOINT = 'https://exoplanetarchive.ipac.caltech.edu/TAP/sync';

export const COLUMNS = [
  'pl_name',
  'hostname',
  'ra',
  'dec',
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
  'tic_id',
] as const;

/** ADQL for every planet in the composite table that TESS discovered. */
export function buildTessQuery(): string {
  return `select ${COLUMNS.join(',')} from pscomppars where disc_facility like '%TESS%' order by hostname, pl_orbper`;
}

export function buildTapUrl(query = buildTessQuery()): string {
  const params = new URLSearchParams({ query, format: 'json' });
  return `${TAP_ENDPOINT}?${params.toString()}`;
}

/** Turn raw archive JSON into a snapshot, dropping rows with no position. */
export function toSnapshot(raw: unknown, generated: string): Snapshot {
  if (!Array.isArray(raw)) throw new Error('Expected the archive to return a JSON array');
  const rows = raw
    .map((r) => (r && typeof r === 'object' ? normalizeRow(r as Record<string, unknown>) : null))
    .filter((r): r is PlanetRow => r !== null);
  return {
    generated,
    source: 'NASA Exoplanet Archive, Planetary Systems Composite Parameters (pscomppars), disc_facility like %TESS%',
    rows,
  };
}
