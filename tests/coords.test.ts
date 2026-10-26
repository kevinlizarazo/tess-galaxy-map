import { describe, expect, it } from 'vitest';
import {
  compressDistance,
  equatorialToCartesian,
  equatorialToGalactic,
  spectralClass,
  starScenePosition,
  temperatureToRgb,
} from '../src/astro/coords';

const len = (v: { x: number; y: number; z: number }) => Math.hypot(v.x, v.y, v.z);

describe('equatorialToCartesian', () => {
  it('puts RA 0, Dec 0 on the +x axis', () => {
    const v = equatorialToCartesian(0, 0, 10);
    expect(v.x).toBeCloseTo(10);
    expect(v.y).toBeCloseTo(0);
    expect(v.z).toBeCloseTo(0);
  });

  it('puts the celestial north pole on +z', () => {
    expect(equatorialToCartesian(123, 90, 5).z).toBeCloseTo(5);
  });
});

describe('equatorialToGalactic', () => {
  it('maps the galactic centre direction (Sgr A*) to galactic +x', () => {
    const g = equatorialToGalactic(equatorialToCartesian(266.405, -28.936, 1));
    expect(g.x).toBeCloseTo(1, 3);
    expect(g.y).toBeCloseTo(0, 2);
    expect(g.z).toBeCloseTo(0, 2);
  });

  it('maps the north galactic pole to galactic +z', () => {
    const g = equatorialToGalactic(equatorialToCartesian(192.8595, 27.1283, 1));
    expect(g.z).toBeCloseTo(1, 3);
  });

  it('preserves length', () => {
    const v = equatorialToCartesian(84.29, -80.47, 18.3);
    expect(len(equatorialToGalactic(v))).toBeCloseTo(18.3);
  });
});

describe('compressDistance', () => {
  it('is zero at the Sun and keeps distance order', () => {
    expect(compressDistance(0)).toBe(0);
    expect(compressDistance(10)).toBeLessThan(compressDistance(50));
    expect(compressDistance(50)).toBeLessThan(compressDistance(400));
  });
});

describe('starScenePosition', () => {
  it('places stars at the compressed distance from the origin', () => {
    const p = starScenePosition(97.0959, -65.5786, 31.1);
    expect(len(p)).toBeCloseTo(compressDistance(31.1));
  });

  it('uses Y as galactic north', () => {
    const p = starScenePosition(192.8595, 27.1283, 10);
    expect(p.y).toBeCloseTo(compressDistance(10), 2);
  });
});

describe('temperatureToRgb', () => {
  it('makes cool stars red and hot stars blue', () => {
    const [r1, , b1] = temperatureToRgb(3000);
    const [r2, , b2] = temperatureToRgb(15000);
    expect(r1).toBeGreaterThan(b1);
    expect(b2).toBeGreaterThan(r2);
  });

  it('returns channels in 0..1 for any input', () => {
    for (const t of [null, 500, 3000, 5800, 9000, 60000]) {
      for (const c of temperatureToRgb(t)) {
        expect(c).toBeGreaterThanOrEqual(0);
        expect(c).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe('spectralClass', () => {
  it.each([
    [3400, 'M'],
    [4600, 'K'],
    [5770, 'G'],
    [6500, 'F'],
    [null, '?'],
  ])('%s K -> %s', (t, cls) => {
    expect(spectralClass(t)).toBe(cls);
  });
});
