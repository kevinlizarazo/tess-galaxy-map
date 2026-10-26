/**
 * One planet row, named after the NASA Exoplanet Archive `pscomppars` columns
 * so the fetch script can write archive output with no renaming.
 */
export interface PlanetRow {
  pl_name: string;
  hostname: string;
  ra: number; // degrees, J2000
  dec: number; // degrees, J2000
  sy_dist: number | null; // parsecs
  st_teff: number | null; // kelvin
  st_rad: number | null; // solar radii
  st_mass: number | null; // solar masses
  pl_rade: number | null; // Earth radii
  pl_bmasse: number | null; // Earth masses
  pl_orbper: number | null; // days
  pl_orbsmax: number | null; // AU
  pl_eqt: number | null; // kelvin
  disc_year: number | null;
  tic_id: string | null;
}

export interface Snapshot {
  generated: string;
  source: string;
  rows: PlanetRow[];
}

export interface Planet {
  name: string;
  /** Short label such as "b" or "c", taken from the end of the name. */
  letter: string;
  radiusEarth: number | null;
  massEarth: number | null;
  periodDays: number | null;
  semiMajorAxisAu: number | null;
  eqTempK: number | null;
  discYear: number | null;
}

export interface StarSystem {
  /** URL-safe id used for deep links, e.g. "toi-700". */
  id: string;
  hostname: string;
  ticId: string | null;
  ra: number;
  dec: number;
  distancePc: number | null;
  teffK: number | null;
  radiusSun: number | null;
  massSun: number | null;
  planets: Planet[];
}
