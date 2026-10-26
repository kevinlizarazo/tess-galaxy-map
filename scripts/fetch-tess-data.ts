/**
 * Refresh public/data/tess-systems.json from the NASA Exoplanet Archive.
 * Usage: npm run fetch-data
 */
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { buildTapUrl, toSnapshot } from '../src/data/archive';

const OUT = fileURLToPath(new URL('../public/data/tess-systems.json', import.meta.url));

async function main(): Promise<void> {
  const url = buildTapUrl();
  console.log(`Querying ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Archive returned HTTP ${res.status}: ${await res.text()}`);
  const snapshot = toSnapshot(await res.json(), new Date().toISOString().slice(0, 10));
  const hosts = new Set(snapshot.rows.map((r) => r.hostname));
  await writeFile(OUT, JSON.stringify(snapshot) + '\n');
  console.log(`Wrote ${snapshot.rows.length} planets in ${hosts.size} systems to ${OUT}`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
