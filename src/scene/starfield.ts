import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Points,
  ShaderMaterial,
} from 'three';

const VERT = /* glsl */ `
  attribute float size;
  attribute float alpha;
  attribute vec3 color;
  varying vec3 vColor;
  varying float vAlpha;
  uniform float uPixelRatio;
  void main() {
    vColor = color;
    vAlpha = alpha;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = clamp(size * uPixelRatio * (300.0 / -mv.z), 1.0, 96.0);
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    if (d > 1.0) discard;
    float core = smoothstep(0.3, 0.0, d);
    float halo = exp(-d * d * 5.0) * 0.55;
    gl_FragColor = vec4(vColor * (core + halo) + core * 0.35, (core + halo) * vAlpha);
  }
`;

/** Point cloud of soft glowing sprites with per-point colour, size and alpha. */
export function createGlowPoints(
  positions: Float32Array,
  colors: Float32Array,
  sizes: Float32Array,
  alphas?: Float32Array,
  depthTest = true,
): Points<BufferGeometry, ShaderMaterial> {
  const count = positions.length / 3;
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('color', new BufferAttribute(colors, 3));
  geometry.setAttribute('size', new BufferAttribute(sizes, 1));
  geometry.setAttribute('alpha', new BufferAttribute(alphas ?? new Float32Array(count).fill(1), 1));
  const material = new ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: { uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) } },
    transparent: true,
    depthWrite: false,
    depthTest,
    blending: AdditiveBlending,
  });
  return new Points(geometry, material);
}

/** Deterministic PRNG so the backdrop looks the same on every load. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Distant background stars on a sphere, denser toward the galactic plane. */
export function createBackdrop(count: number, radius: number, seed = 7): Points<BufferGeometry, ShaderMaterial> {
  const rand = mulberry32(seed);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const alphas = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const theta = rand() * Math.PI * 2;
    // Bias latitude toward 0 so a faint Milky Way band appears.
    const band = rand() < 0.55;
    const lat = band ? (rand() - 0.5) * 0.35 : Math.asin(rand() * 2 - 1);
    positions[i * 3] = radius * Math.cos(lat) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.sin(lat);
    positions[i * 3 + 2] = radius * Math.cos(lat) * Math.sin(theta);
    const tint = 0.75 + rand() * 0.25;
    colors[i * 3] = tint;
    colors[i * 3 + 1] = tint * (0.9 + rand() * 0.1);
    colors[i * 3 + 2] = 1;
    sizes[i] = 4 + rand() * 6;
    alphas[i] = 0.25 + rand() * 0.45;
  }
  return createGlowPoints(positions, colors, sizes, alphas);
}
