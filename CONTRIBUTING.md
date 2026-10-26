# Contributing

Issues and pull requests are welcome.

1. Fork the repo and create a branch.
2. `npm install`, then `npm run dev` to work locally.
3. Run `npm run check` before you push. It runs lint, typecheck, tests and the build, exactly as CI does.
4. Keep pure logic (coordinates, orbits, data parsing) in `src/astro` or `src/data`, and add unit tests for it in `tests/`.

## Data

Don't hand-edit large archive snapshots. Change `src/data/archive.ts`, then regenerate with `npm run fetch-data`.

## Secrets

This project needs no API keys. Never commit `.env` files or credentials.
