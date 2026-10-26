import { DEFAULT_FILTER, filterSystems, type SizeClass, type SystemFilter } from '../data/query';
import type { StarSystem } from '../data/types';
import { escapeHtml, fmt } from './format';

function $(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id}`);
  return el;
}

/** Left-hand panel: search, filters and a keyboard-friendly list of systems. */
export class SystemList {
  filter: SystemFilter = { ...DEFAULT_FILTER };
  onChange: (visible: StarSystem[]) => void = () => {};
  onSelect: (system: StarSystem) => void = () => {};
  onHover: (system: StarSystem | null) => void = () => {};

  private readonly list = $('system-list') as HTMLUListElement;
  private readonly count = $('count');
  private readonly search = $('search') as HTMLInputElement;
  private readonly minPlanets = $('min-planets') as HTMLSelectElement;
  private readonly maxDistance = $('max-distance') as HTMLSelectElement;
  private readonly sizeClass = $('size-class') as HTMLSelectElement;
  private current: string | null = null;

  constructor(private readonly systems: StarSystem[]) {
    const update = () => this.readControls();
    this.search.addEventListener('input', update);
    this.minPlanets.addEventListener('change', update);
    this.maxDistance.addEventListener('change', update);
    this.sizeClass.addEventListener('change', update);
    this.search.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const first = this.list.querySelector<HTMLButtonElement>('button');
        first?.click();
      }
    });
    this.list.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-id]');
      const sys = btn && this.systems.find((s) => s.id === btn.dataset.id);
      if (sys) this.onSelect(sys);
    });
    const hover = (e: Event) => {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-id]');
      this.onHover((btn && this.systems.find((s) => s.id === btn.dataset.id)) ?? null);
    };
    this.list.addEventListener('mouseover', hover);
    this.list.addEventListener('focusin', hover);
    this.list.addEventListener('mouseleave', () => this.onHover(null));
  }

  private readControls(): void {
    this.filter = {
      text: this.search.value,
      minPlanets: Number(this.minPlanets.value) || 1,
      maxDistancePc: this.maxDistance.value ? Number(this.maxDistance.value) : null,
      sizeClass: this.sizeClass.value as SizeClass,
    };
    this.render();
  }

  setCurrent(id: string | null): void {
    this.current = id;
    for (const btn of this.list.querySelectorAll<HTMLButtonElement>('button[data-id]')) {
      btn.setAttribute('aria-current', String(btn.dataset.id === id));
    }
  }

  render(): void {
    const visible = filterSystems(this.systems, this.filter).sort(
      (a, b) => (a.distancePc ?? Infinity) - (b.distancePc ?? Infinity),
    );
    this.count.textContent = `${visible.length}/${this.systems.length}`;
    this.list.innerHTML = visible
      .map(
        (s) => `<li><button data-id="${s.id}" aria-current="${s.id === this.current}">
          <span>${escapeHtml(s.hostname)}</span>
          <span class="meta">${s.planets.length}p · ${fmt(s.distancePc, 0, 'pc')}</span>
        </button></li>`,
      )
      .join('');
    this.onChange(visible);
  }
}
