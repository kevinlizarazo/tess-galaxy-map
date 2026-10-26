import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildTapUrl, buildTessQuery, toSnapshot } from '../src/data/archive';
import { groupSystems, normalizeRow, parseSnapshot, planetLetter, slugify } from '../src/data/loadSystems';
import { DEFAULT_FILTER, filterSystems, sizeClassOf } from '../src/data/query';
import { parseHash, toHash } from '../src/data/route';

const bundled = parseSnapshot(
  JSON.parse(readFileSync(new URL('../public/data/tess-systems.json', import.meta.url), 'utf8')),
);
const systems = groupSystems(bundled.rows);
const byId = (id: string) => systems.find((s) => s.id === id)!;

describe('bundled snapshot', () => {
  it('parses every row', () => {
    expect(bundled.rows.length).toBeGreaterThan(0);
    for (const row of bundled.rows) {
      expect(row.ra).toBeGreaterThanOrEqual(0);
      expect(row.ra).toBeLessThan(360);
      expect(Math.abs(row.dec)).toBeLessThanOrEqual(90);
    }
  });

  it('has unique system ids', () => {
    expect(new Set(systems.map((s) => s.id)).size).toBe(systems.length);
  });
});

describe('normalizeRow', () => {
  it('coerces strings and blanks', () => {
    const row = normalizeRow({ pl_name: 'X b', hostname: 'X', ra: '10.5', dec: '-3', sy_dist: '', tic_id: 12345 });
    expect(row).toMatchObject({ ra: 10.5, dec: -3, sy_dist: null, tic_id: '12345' });
  });

  it('rejects rows without a position', () => {
    expect(normalizeRow({ pl_name: 'X b', hostname: 'X', ra: null, dec: 1 })).toBeNull();
  });
});

describe('groupSystems', () => {
  it('groups planets by host and sorts them by period', () => {
    const toi700 = byId('toi-700');
    expect(toi700.planets.map((p) => p.letter)).toEqual(['b', 'c', 'e', 'd']);
  });
});

describe('names', () => {
  it('slugifies hostnames for URLs', () => {
    expect(slugify('LTT 1445 A')).toBe('ltt-1445-a');
    expect(slugify('WD 1856+534')).toBe('wd-1856-534');
  });

  it('extracts planet letters', () => {
    expect(planetLetter('TOI-700 d', 'TOI-700')).toBe('d');
    expect(planetLetter('Odd Name c', 'Different')).toBe('c');
  });
});

describe('filterSystems', () => {
  it('returns everything with the default filter', () => {
    expect(filterSystems(systems, DEFAULT_FILTER)).toHaveLength(systems.length);
  });

  it('searches names and TIC IDs, ignoring spaces and case', () => {
    expect(filterSystems(systems, { ...DEFAULT_FILTER, text: 'toi700' }).map((s) => s.id)).toEqual(['toi-700']);
    expect(filterSystems(systems, { ...DEFAULT_FILTER, text: '150428135' }).map((s) => s.id)).toEqual(['toi-700']);
  });

  it('filters by planet count, distance and size class', () => {
    const multi = filterSystems(systems, { ...DEFAULT_FILTER, minPlanets: 6 });
    expect(multi.every((s) => s.planets.length >= 6)).toBe(true);
    const near = filterSystems(systems, { ...DEFAULT_FILTER, maxDistancePc: 10 });
    expect(near.every((s) => (s.distancePc ?? Infinity) <= 10)).toBe(true);
    const giants = filterSystems(systems, { ...DEFAULT_FILTER, sizeClass: 'giant' });
    expect(giants.map((s) => s.id)).toContain('toi-1338');
  });

  it('buckets planet sizes', () => {
    expect(sizeClassOf(1)).toBe('earth');
    expect(sizeClassOf(1.5)).toBe('super-earth');
    expect(sizeClassOf(3)).toBe('neptune');
    expect(sizeClassOf(11)).toBe('giant');
    expect(sizeClassOf(null)).toBeNull();
  });
});

describe('routes', () => {
  it('round-trips system routes', () => {
    expect(parseHash(toHash({ view: 'system', systemId: 'toi-700' }))).toEqual({ view: 'system', systemId: 'toi-700' });
  });

  it('falls back to the galaxy view', () => {
    expect(parseHash('')).toEqual({ view: 'galaxy' });
    expect(parseHash('#/nonsense')).toEqual({ view: 'galaxy' });
  });
});

describe('archive helpers', () => {
  it('queries TESS discoveries in the composite table', () => {
    expect(buildTessQuery()).toMatch(/from pscomppars where disc_facility like '%TESS%'/);
    expect(buildTapUrl()).toContain('format=json');
  });

  it('builds a snapshot and drops bad rows', () => {
    const snap = toSnapshot([{ pl_name: 'A b', hostname: 'A', ra: 1, dec: 2 }, { pl_name: 'bad' }], '2026-01-01');
    expect(snap.rows).toHaveLength(1);
    expect(snap.generated).toBe('2026-01-01');
  });

  it('rejects non-array responses', () => {
    expect(() => toSnapshot({ error: 'nope' }, 'x')).toThrow();
  });
});
