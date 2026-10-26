import { PerspectiveCamera, Vector3, WebGLRenderer } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { loadSystems } from './data/loadSystems';
import { parseHash, toHash, type Route } from './data/route';
import type { StarSystem } from './data/types';
import { CameraDirector } from './scene/CameraDirector';
import { GalaxyView } from './scene/GalaxyView';
import { toScreen } from './scene/picking';
import { SystemView } from './scene/SystemView';
import { escapeHtml } from './ui/format';
import { InfoPanel } from './ui/InfoPanel';
import { SystemList } from './ui/SystemList';
import './styles.css';

const GALAXY_HOME = { pos: new Vector3(0, 170, 280), target: new Vector3(0, 0, 0) };
const MAX_LABELS = 40;
const LABEL_RANGE = 140;
const SPEEDS = [0, 0.25, 1, 2, 5, 10, 30];

function el<T extends HTMLElement = HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing #${id}`);
  return node as T;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

class App {
  private readonly canvas = el<HTMLCanvasElement>('scene');
  private readonly renderer = new WebGLRenderer({ canvas: this.canvas, antialias: true });
  private readonly camera = new PerspectiveCamera(55, 1, 0.1, 6000);
  private readonly controls = new OrbitControls(this.camera, this.canvas);
  private readonly director = new CameraDirector(this.camera, this.controls);
  private readonly galaxy: GalaxyView;
  private readonly systemView = new SystemView();
  private readonly info = new InfoPanel(el('info'));
  private readonly list: SystemList;
  private readonly reticle = el('reticle');
  private readonly labelLayer = el('labels');
  private readonly labelPool: HTMLDivElement[] = [];
  private readonly fade = el('fade');

  private mode: 'galaxy' | 'system' = 'galaxy';
  private focused: StarSystem | null = null;
  private hovered = -1;
  private selectedPlanet = 0;
  private simDays = 0;
  private speedIndex = 3;
  private transitioning = false;
  private downAt: { x: number; y: number } | null = null;
  private last = performance.now();

  constructor(private readonly systems: StarSystem[]) {
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.galaxy = new GalaxyView(systems);

    this.list = new SystemList(systems);
    this.list.onChange = (visible) => this.galaxy.setVisible(new Set(visible.map((s) => s.id)));
    this.list.onSelect = (s) => this.select(s);
    this.list.onHover = (s) => {
      if (this.mode === 'galaxy') this.setHovered(s ? this.galaxy.indexOf(s.id) : -1);
    };
    this.list.render();

    this.info.onEnterSystem = (s) => this.navigate({ view: 'system', systemId: s.id });
    this.info.onSelectPlanet = (i) => this.selectPlanet(i);

    const reduced = el<HTMLInputElement>('reduced-motion');
    reduced.checked = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.director.reducedMotion = reduced.checked;
    reduced.addEventListener('change', () => (this.director.reducedMotion = reduced.checked));

    this.director.jumpTo(GALAXY_HOME.pos, GALAXY_HOME.target);
    this.bindInput();
    this.resize();
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('hashchange', () => void this.applyRoute(parseHash(location.hash)));
    this.renderBreadcrumb();
    this.renderHint();
    void this.applyRoute(parseHash(location.hash), true);
    this.renderer.setAnimationLoop((t) => this.frame(t));
  }

  private get viewport() {
    return { width: this.canvas.clientWidth, height: this.canvas.clientHeight };
  }

  private resize(): void {
    const { width, height } = this.viewport;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
  }

  private bindInput(): void {
    this.canvas.addEventListener('pointerdown', (e) => (this.downAt = { x: e.clientX, y: e.clientY }));
    this.canvas.addEventListener('pointerup', (e) => {
      const d = this.downAt;
      this.downAt = null;
      if (!d || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 5) return; // it was a drag
      this.handleClick({ x: e.clientX, y: e.clientY });
    });
    this.canvas.addEventListener('dblclick', () => {
      if (this.mode === 'galaxy' && this.focused) this.navigate({ view: 'system', systemId: this.focused.id });
    });
    this.canvas.addEventListener('pointermove', (e) => {
      if (this.director.flying || this.transitioning || this.mode !== 'galaxy') return;
      this.setHovered(this.galaxy.pick(this.camera, { x: e.clientX, y: e.clientY }, this.viewport));
    });
    this.canvas.addEventListener('pointerleave', () => this.mode === 'galaxy' && this.setHovered(-1));

    window.addEventListener('keydown', (e) => {
      const typing = e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement;
      if (e.key === 'Escape') {
        if (typing) (e.target as HTMLElement).blur();
        else this.back();
        return;
      }
      if (typing) return;
      if (e.key === '/') {
        e.preventDefault();
        el<HTMLInputElement>('search').focus();
      } else if (e.key === 'Enter' && this.mode === 'galaxy' && this.focused) {
        this.navigate({ view: 'system', systemId: this.focused.id });
      } else if (e.key === ']') {
        this.setSpeed(this.speedIndex + 1);
      } else if (e.key === '[') {
        this.setSpeed(this.speedIndex - 1);
      } else if (e.key === ' ' && this.mode === 'system') {
        e.preventDefault();
        this.setSpeed(this.speedIndex === 0 ? 3 : 0);
      } else if (this.mode === 'system' && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
        const n = this.systemView.planets().length;
        if (n) this.selectPlanet((this.selectedPlanet + (e.key === 'ArrowRight' ? 1 : n - 1)) % n);
      }
    });
  }

  private handleClick(cursor: { x: number; y: number }): void {
    if (this.transitioning) return;
    if (this.mode === 'galaxy') {
      const i = this.galaxy.pick(this.camera, cursor, this.viewport);
      const s = this.systems[i];
      if (!s) return;
      if (this.focused?.id === s.id && !this.director.flying) this.navigate({ view: 'system', systemId: s.id });
      else this.select(s);
    } else {
      const i = this.systemView.pick(this.camera, cursor, this.viewport);
      if (i >= 0) this.selectPlanet(i);
    }
  }

  private setHovered(i: number): void {
    this.hovered = i;
    this.galaxy.setHovered(i);
  }

  private setSpeed(i: number): void {
    this.speedIndex = Math.max(0, Math.min(SPEEDS.length - 1, i));
    this.renderHint();
  }

  private navigate(route: Route): void {
    const hash = toHash(route);
    if (location.hash === hash) void this.applyRoute(route);
    else location.hash = hash;
  }

  private back(): void {
    if (this.mode === 'system') this.navigate({ view: 'galaxy' });
    else if (this.focused) {
      this.focused = null;
      this.info.hide();
      this.list.setCurrent(null);
      this.renderBreadcrumb();
      void this.director.flyTo(GALAXY_HOME.pos, GALAXY_HOME.target, 1400);
    }
  }

  /** Galaxy level: fly toward a star and show its summary. */
  private select(system: StarSystem): void {
    if (this.mode === 'system') {
      this.navigate({ view: 'system', systemId: system.id });
      return;
    }
    const i = this.galaxy.indexOf(system.id);
    const p = this.galaxy.positions[i];
    if (!p) return;
    this.focused = system;
    this.list.setCurrent(system.id);
    this.info.showPreview(system);
    this.renderBreadcrumb();
    void this.director.flyTo(this.approachPoint(p, 28), p, 1500);
  }

  /** A camera position `distance` units from `target`, coming from the current direction. */
  private approachPoint(target: Vector3, distance: number): Vector3 {
    const dir = this.camera.position.clone().sub(target);
    if (dir.lengthSq() < 1e-6) dir.set(0, 0.5, 1);
    dir.normalize();
    dir.y = Math.max(dir.y, 0.35);
    return target.clone().add(dir.normalize().multiplyScalar(distance));
  }

  private async applyRoute(route: Route, initial = false): Promise<void> {
    if (this.transitioning) return;
    if (route.view === 'system') {
      const system = this.systems.find((s) => s.id === route.systemId);
      if (!system) {
        history.replaceState(null, '', toHash({ view: 'galaxy' }));
        return;
      }
      await this.enterSystem(system, initial);
    } else if (this.mode === 'system') {
      await this.exitSystem();
    }
  }

  private async enterSystem(system: StarSystem, instant: boolean): Promise<void> {
    this.transitioning = true;
    this.focused = system;
    this.list.setCurrent(system.id);
    this.setHovered(-1);
    if (!instant && this.mode === 'galaxy') {
      const p = this.galaxy.positions[this.galaxy.indexOf(system.id)];
      if (p) await this.director.flyTo(this.approachPoint(p, 4), p, 1100);
    }
    await this.crossfade(() => {
      this.mode = 'system';
      this.systemView.show(system);
      this.simDays = 0;
      this.selectedPlanet = 0;
      this.systemView.setSelected(0);
      const e = this.systemView.extent;
      this.controls.minDistance = 3;
      this.controls.maxDistance = e * 6;
      this.director.jumpTo(new Vector3(0, e * 2.2, e * 3.4), new Vector3());
    }, instant);
    this.info.showSystem(system, this.selectedPlanet);
    this.renderBreadcrumb();
    this.renderHint();
    const e = this.systemView.extent;
    await this.director.flyTo(new Vector3(0, e * 1.1, e * 2.2), new Vector3(), 1300);
    this.transitioning = false;
  }

  private async exitSystem(): Promise<void> {
    this.transitioning = true;
    const system = this.focused;
    await this.crossfade(() => {
      this.mode = 'galaxy';
      this.controls.minDistance = 2;
      this.controls.maxDistance = 1200;
      const p = system ? this.galaxy.positions[this.galaxy.indexOf(system.id)] : undefined;
      if (p) this.director.jumpTo(p.clone().add(new Vector3(0, 2, 4)), p);
      else this.director.jumpTo(GALAXY_HOME.pos, GALAXY_HOME.target);
    }, false);
    this.renderBreadcrumb();
    this.renderHint();
    if (system) {
      this.info.showPreview(system);
      const p = this.galaxy.positions[this.galaxy.indexOf(system.id)];
      if (p) await this.director.flyTo(this.approachPoint(p, 28), p, 1300);
    }
    this.transitioning = false;
  }

  private async crossfade(swap: () => void, instant: boolean): Promise<void> {
    if (instant || this.director.reducedMotion) {
      swap();
      return;
    }
    this.fade.classList.add('on');
    await sleep(300);
    swap();
    this.fade.classList.remove('on');
  }

  private selectPlanet(i: number): void {
    const system = this.focused;
    if (!system || this.mode !== 'system') return;
    this.selectedPlanet = i;
    this.systemView.setSelected(i);
    this.info.showSystem(system, i);
  }

  private renderBreadcrumb(): void {
    const nav = el('breadcrumb');
    const parts = [`<button data-crumb="galaxy">Local Neighbourhood</button>`];
    if (this.focused) {
      parts.push(`<span class="sep">›</span>`);
      parts.push(
        this.mode === 'system'
          ? `<span>${escapeHtml(this.focused.hostname)}</span>`
          : `<button data-crumb="system">${escapeHtml(this.focused.hostname)}</button>`,
      );
    }
    nav.innerHTML = parts.join('');
    nav.querySelector('[data-crumb="galaxy"]')?.addEventListener('click', () => {
      if (this.mode === 'system') this.navigate({ view: 'galaxy' });
      else this.back();
    });
    nav.querySelector('[data-crumb="system"]')?.addEventListener('click', () => {
      if (this.focused) this.navigate({ view: 'system', systemId: this.focused.id });
    });
  }

  private renderHint(): void {
    el('hint').textContent =
      this.mode === 'galaxy'
        ? 'Drag to orbit · scroll to zoom · click a star to focus, click again to enter · / to search'
        : `Time ×${SPEEDS[this.speedIndex]} days/s ([ ] to change, space to pause) · ← → planets · Esc to leave`;
  }

  private frame(now: number): void {
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    this.director.update(now);
    if (!this.director.flying) this.controls.update();

    if (this.mode === 'system') {
      this.simDays += dt * (SPEEDS[this.speedIndex] ?? 0);
      this.systemView.update(this.simDays);
      this.renderer.render(this.systemView.scene, this.camera);
    } else {
      this.renderer.render(this.galaxy.scene, this.camera);
    }
    this.updateOverlay();
  }

  private updateOverlay(): void {
    const vp = this.viewport;
    const labels: { x: number; y: number; text: string; cls?: string }[] = [];

    if (this.mode === 'galaxy') {
      const hoverPos = this.galaxy.positions[this.hovered];
      const hoverSys = this.systems[this.hovered];
      const screen = hoverPos && toScreen(hoverPos, this.camera, vp);
      if (screen && hoverSys) {
        this.reticle.hidden = false;
        this.reticle.style.left = `${screen.x}px`;
        this.reticle.style.top = `${screen.y}px`;
        this.reticle.querySelector('span')!.textContent = hoverSys.hostname;
      } else {
        this.reticle.hidden = true;
      }
      const sol = toScreen(new Vector3(), this.camera, vp);
      if (sol) labels.push({ ...sol, text: 'Sol', cls: 'sol' });
      const nearby = this.galaxy.positions
        .map((p, i) => ({ i, d: p.distanceTo(this.camera.position) }))
        .filter(({ i, d }) => d < LABEL_RANGE && i !== this.hovered)
        .sort((a, b) => a.d - b.d)
        .slice(0, MAX_LABELS);
      for (const { i } of nearby) {
        const s = toScreen(this.galaxy.positions[i]!, this.camera, vp);
        if (s) labels.push({ ...s, text: this.systems[i]!.hostname });
      }
    } else {
      this.reticle.hidden = true;
      const planets = this.systemView.planets();
      this.systemView.planetPositions().forEach((p, i) => {
        const s = toScreen(p, this.camera, vp);
        if (s) labels.push({ ...s, text: planets[i]!.letter });
      });
    }

    while (this.labelPool.length < labels.length) {
      const div = document.createElement('div');
      this.labelLayer.appendChild(div);
      this.labelPool.push(div);
    }
    this.labelPool.forEach((div, i) => {
      const l = labels[i];
      if (!l) {
        div.hidden = true;
        return;
      }
      div.hidden = false;
      div.className = `label ${l.cls ?? ''}`;
      div.textContent = l.text;
      div.style.left = `${l.x}px`;
      div.style.top = `${l.y}px`;
    });
  }
}

async function main(): Promise<void> {
  const loading = el('loading');
  try {
    const { snapshot, systems } = await loadSystems(`${import.meta.env.BASE_URL}data/tess-systems.json`);
    el('data-credit').textContent = `Data: ${snapshot.source.split('.')[0]} · ${snapshot.generated}`;
    new App(systems);
    loading.hidden = true;
  } catch (err) {
    console.error(err);
    loading.textContent = 'Could not load star data. Check the console for details.';
  }
}

void main();
