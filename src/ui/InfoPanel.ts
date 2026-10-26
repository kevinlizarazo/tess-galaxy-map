import { spectralClass } from '../astro/coords';
import { isTemperate, planetEqTemp } from '../astro/orbits';
import { sizeClassOf } from '../data/query';
import type { Planet, StarSystem } from '../data/types';
import { planetColor } from '../scene/SystemView';
import { escapeHtml, fmt, fmtDistance, fmtPeriod } from './format';

const SIZE_LABEL: Record<string, string> = {
  earth: 'Earth-size',
  'super-earth': 'Super-Earth',
  neptune: 'Neptune-like',
  giant: 'Giant',
};

/** Right-hand data panel for the selected system and planet. */
export class InfoPanel {
  onSelectPlanet: (index: number) => void = () => {};
  onEnterSystem: (system: StarSystem) => void = () => {};

  constructor(private readonly el: HTMLElement) {
    el.addEventListener('click', (e) => {
      const target = (e.target as HTMLElement).closest<HTMLElement>('[data-planet], [data-enter]');
      if (!target) return;
      if (target.dataset.planet !== undefined) this.onSelectPlanet(Number(target.dataset.planet));
      if (target.dataset.enter !== undefined && this.system) this.onEnterSystem(this.system);
    });
  }

  private system: StarSystem | null = null;

  hide(): void {
    this.el.hidden = true;
    this.system = null;
  }

  /** Short star summary shown while browsing the galaxy. */
  showPreview(system: StarSystem): void {
    this.system = system;
    this.el.hidden = false;
    this.el.innerHTML = `
      <h3 class="name">${escapeHtml(system.hostname)}</h3>
      ${this.starStats(system)}
      <button class="enter" data-enter>Enter system ›</button>`;
  }

  showSystem(system: StarSystem, selectedPlanet: number): void {
    this.system = system;
    this.el.hidden = false;
    const planet = system.planets[selectedPlanet];
    const list = system.planets
      .map(
        (p, i) => `
        <li><button data-planet="${i}" aria-current="${i === selectedPlanet}">
          <span class="swatch" style="background:#${planetColor(planetEqTemp(p, system).value).getHexString()}"></span>
          <span>${escapeHtml(p.name)}</span>
          <span class="meta">${fmtPeriod(p.periodDays)}</span>
        </button></li>`,
      )
      .join('');
    this.el.innerHTML = `
      <h3 class="name">${escapeHtml(system.hostname)}</h3>
      ${this.starStats(system)}
      <h3>Planets</h3>
      <ul class="planet-list">${list}</ul>
      ${planet ? this.planetStats(planet, system) : ''}`;
  }

  private starStats(s: StarSystem): string {
    return `
      <p class="subtitle">${escapeHtml(s.ticId ?? 'No TIC ID')} · ${spectralClass(s.teffK)}-type star</p>
      <dl class="stats">
        <dt>Distance</dt><dd>${fmtDistance(s.distancePc)}</dd>
        <dt>Temperature</dt><dd>${fmt(s.teffK, 0, 'K')}</dd>
        <dt>Radius</dt><dd>${fmt(s.radiusSun, 2, 'R☉')}</dd>
        <dt>Mass</dt><dd>${fmt(s.massSun, 2, 'M☉')}</dd>
        <dt>Planets</dt><dd>${s.planets.length}</dd>
      </dl>`;
  }

  private planetStats(p: Planet, s: StarSystem): string {
    const size = sizeClassOf(p.radiusEarth);
    const teq = planetEqTemp(p, s);
    const tags = [
      size ? `<span class="tag">${SIZE_LABEL[size]}</span>` : '',
      isTemperate(teq.value) ? '<span class="tag temperate">Temperate</span>' : '',
    ].join(' ');
    return `
      <h3 class="name">${escapeHtml(p.name)}</h3>
      <p class="subtitle">${tags || '&nbsp;'}</p>
      <dl class="stats">
        <dt>Radius</dt><dd>${fmt(p.radiusEarth, 2, 'R⊕')}</dd>
        <dt>Mass</dt><dd>${fmt(p.massEarth, 2, 'M⊕')}</dd>
        <dt>Period</dt><dd>${fmtPeriod(p.periodDays)}</dd>
        <dt>Orbit</dt><dd>${fmt(p.semiMajorAxisAu, 4, 'AU')}</dd>
        <dt>Eq. temp</dt><dd>${teq.estimated ? '~' : ''}${fmt(teq.value, 0, 'K')}${teq.estimated ? ' (est.)' : ''}</dd>
        <dt>Discovered</dt><dd>${p.discYear ?? '—'}</dd>
      </dl>`;
  }
}
