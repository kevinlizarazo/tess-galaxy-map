# Roadmap

Planned work, roughly in priority order. Each item lists rough hours.

## Data

- [ ] **Full archive snapshot.** Run `fetch-data` against the live archive, commit the full TESS set (hundreds of systems), and review the scales and label density at that size. *(3h)*
- [ ] **TOI candidates layer.** Add unconfirmed TESS Objects of Interest from the TOI table as a separate, toggleable star layer with its own styling. *(4h)*
- [ ] **Scheduled data refresh.** A GitHub Action that runs `fetch-data` weekly and opens a PR when the data changes. *(2h)*
- [ ] **Show estimated orbits in the panel.** Display the Kepler-derived semi-major axis, marked "est.", instead of a dash. *(1h)*

## Visualisation

- [ ] **Light curves.** When a planet is selected, fetch its TESS light curve from MAST and draw the transit dip in the info panel. *(6h)*
- [ ] **Sector coverage overlay.** Draw the TESS observing sectors on the sky sphere, with the camera boresights per year. *(4h)*
- [ ] **Habitable-zone band.** Shade the conservative habitable zone in the system view, based on stellar luminosity. *(2h)*
- [ ] **Orbit eccentricity and inclination.** Use `pl_orbeccen` and `pl_orbincl` when they're available, instead of circular, coplanar orbits. *(3h)*
- [ ] **Level of detail.** Cluster distant stars and fade labels by importance, so the full dataset stays at 60 fps on laptops. *(4h)*
- [ ] **Constellation and reference markers.** Optional markers for bright naked-eye stars, to help orient the map. *(2h)*
- [ ] **Ambient audio.** Soft hum and UI sounds, muted by default. *(2h)*

## Interaction

- [ ] **Mobile and touch.** Bottom-sheet panels, tap targets and pinch zoom tuned for phones. *(4h)*
- [ ] **Compare mode.** Pin two systems or planets side by side. *(3h)*
- [ ] **Guided tour.** A short scripted fly-through of notable systems such as TOI-700, L 98-59 and TOI-1338. *(3h)*
- [ ] **Shareable camera state.** Store the camera position in the URL as well as the system. *(1h)*

## Quality

- [ ] **End-to-end tests.** Playwright tests for focus, enter, back, search and deep links, run in CI. *(3h)*
- [ ] **Accessibility audit.** Screen-reader pass, focus order, and colour contrast on the HUD. *(2h)*
- [ ] **Bundle size.** Code-split three.js addons and lazy-load the system view. *(2h)*

Estimated total: about 51 hours.
