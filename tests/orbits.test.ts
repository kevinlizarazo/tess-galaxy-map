import { describe, expect, it } from 'vitest';
import {
  angularSpeed,
  displayOrbitRadius,
  displayPlanetRadius,
  displayStarRadius,
  estimateEqTemp,
  isTemperate,
  planetEqTemp,
  resolveSemiMajorAxis,
  semiMajorAxisAu,
} from '../src/astro/orbits';

describe('semiMajorAxisAu', () => {
  it('gives 1 AU for Earth around the Sun', () => {
    expect(semiMajorAxisAu(365.25, 1)).toBeCloseTo(1, 5);
  });

  it('is close to the archive value for TOI-700 d', () => {
    expect(semiMajorAxisAu(37.426, 0.415)).toBeCloseTo(0.163, 2);
  });
});

describe('resolveSemiMajorAxis', () => {
  it('prefers the measured value', () => {
    expect(resolveSemiMajorAxis(0.05, 10, 1, 1)).toBe(0.05);
  });

  it('falls back to Kepler with a mass estimated from radius', () => {
    expect(resolveSemiMajorAxis(null, 365.25, null, 1)).toBeCloseTo(1, 5);
  });

  it('returns null with no period or axis', () => {
    expect(resolveSemiMajorAxis(null, null, 1, 1)).toBeNull();
  });
});

describe('display scales', () => {
  it('keeps orbits outside the star and in order', () => {
    const star = displayStarRadius(0.4);
    const inner = displayOrbitRadius(0.006, star);
    const outer = displayOrbitRadius(0.5, star);
    expect(inner).toBeGreaterThan(star);
    expect(outer).toBeGreaterThan(inner);
  });

  it('makes bigger planets bigger', () => {
    expect(displayPlanetRadius(10)).toBeGreaterThan(displayPlanetRadius(1));
  });
});

describe('angularSpeed', () => {
  it('completes one orbit per period', () => {
    expect(angularSpeed(10) * 10).toBeCloseTo(2 * Math.PI);
  });

  it('is zero without a period', () => {
    expect(angularSpeed(null)).toBe(0);
  });
});

describe('isTemperate', () => {
  it('flags 175–320 K only', () => {
    expect(isTemperate(269)).toBe(true);
    expect(isTemperate(415)).toBe(false);
    expect(isTemperate(150)).toBe(false);
    expect(isTemperate(null)).toBe(false);
  });
});

describe('equilibrium temperature', () => {
  it('gives about 278 K for Earth around the Sun', () => {
    expect(estimateEqTemp(5772, 1, 1)).toBeCloseTo(278, -1);
  });

  it('is close to the archive value for TOI-700 d', () => {
    expect(estimateEqTemp(3480, 0.42, 0.163)).toBeCloseTo(269, -1);
  });

  it('prefers archive values and flags estimates', () => {
    const star = { teffK: 5772, radiusSun: 1, massSun: 1 };
    expect(planetEqTemp({ eqTempK: 300, semiMajorAxisAu: null, periodDays: null }, star)).toEqual({
      value: 300,
      estimated: false,
    });
    const est = planetEqTemp({ eqTempK: null, semiMajorAxisAu: null, periodDays: 365.25 }, star);
    expect(est.estimated).toBe(true);
    expect(est.value).toBeCloseTo(278, -1);
  });
});
