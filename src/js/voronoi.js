import { Delaunay } from "./vendor/d3-delaunay.js";



const CELL_SIZE = 200;
const SCATTER    = 0.75;   // 0 = perfect grid, 1 = fully scattered
const DRIFT_SPEED = 0.06; // radians per second, roughly one lap per 100s
const DRIFT_BIAS  = 0.6;

const BASE_COLOUR_VAR  = '--primary-color';
const FALLBACK_COLOUR  = '#151514';
const SHADES           = 5;
const LIGHTNESS_SPREAD = 2;
const HUE_SPREAD       = 2;
const EDGE_DARKEN      = 6;

const canvas = document.getElementById('bg');
const ctx = canvas.getContext('2d');

let palette = [];
let edgeColour = '#0A0A0A';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

let width = 0;
let height = 0;
let seeds = [];
let points = [];
let frame;



function parseHex(hex) {
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return null;

  let digits = match[1];
  if (digits.length === 3) {
    digits = digits[0] + digits[0] + digits[1] + digits[1] + digits[2] + digits[2];
  }

  const n = parseInt(digits, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;

  if (d === 0) return [0, 0, l * 100];

  const s = d / (1 - Math.abs(2 * l - 1));
  let h;
  if (max === r)
    h = ((g - b) / d) % 6;
  else if (max === g)
    h = (b - r) / d + 2;
  else
    h = (r - g) / d + 4;

  return [((h * 60) + 360) % 360, s * 100, l * 100];
}

// kept in sessionStorage so moving between pages does not re-roll it
function remember(key, make) {
  try {
    const stored = sessionStorage.getItem(key);
    if (stored !== null) return Number(stored);
    const fresh = make();
    sessionStorage.setItem(key, String(fresh));
    return fresh;
  } catch (e) {
    return make();   // private mode can throw on storage access
  }
}

const SALT = remember('voronoi-salt', () => (Math.random() * 0xffffffff) | 0);

const EPOCH = remember('anim-epoch', () => Date.now());
const TIME_OFFSET = (Date.now() - EPOCH) / 1000;

function hash32(x) {
  x = (x + 0x9e3779b9) | 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x21f0aaad);
  x ^= x >>> 15;
  x = Math.imul(x, 0x735a2d97);
  x ^= x >>> 15;
  return x | 0;
}

function rand(col, row, field) {
  let h = hash32(SALT ^ hash32(col));
  h = hash32(h ^ hash32(row));
  h = hash32(h ^ hash32(field));
  return (h >>> 0) / 4294967296;
}

function readBaseColour() {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(BASE_COLOUR_VAR);

  return rgbToHsl(parseHex(value) || parseHex(FALLBACK_COLOUR));
}

// spread the shades evenly either side of the base, from darkest to lightest
function buildPalette() {
  const [hue, sat, light] = readBaseColour();

  palette = [];
  for (let i = 0; i < SHADES; i++) {
    // -1 for the darkest shade, 0 for the base, +1 for the lightest
    const offset = SHADES === 1 ? 0 : (i / (SHADES - 1)) * 2 - 1;
    const h = (hue + offset * HUE_SPREAD + 360) % 360;
    const l = Math.min(100, Math.max(0, light + offset * LIGHTNESS_SPREAD));
    palette.push(`hsl(${h.toFixed(1)}, ${sat.toFixed(1)}%, ${l.toFixed(1)}%)`);
  }

  const edgeLight = Math.max(0, light - EDGE_DARKEN);
  edgeColour = `hsl(${hue.toFixed(1)}, ${sat.toFixed(1)}%, ${edgeLight.toFixed(1)}%)`;
}

function resize() {
  width  = window.innerWidth;
  height = window.innerHeight;

  const density = Math.min(window.devicePixelRatio || 1, 2);

  canvas.width  = width * density;
  canvas.height = height * density;
  canvas.style.width  = width + 'px';
  canvas.style.height = height + 'px';
  ctx.setTransform(density, 0, 0, density, 0, 0);
}

function buildSeeds() {
  seeds = [];

  // the wobble a seed is allowed either side of its home, so it never leaves its own cell
  const amplitude = CELL_SIZE * SCATTER / 2;
  const cols = Math.ceil(width / CELL_SIZE) + 2;
  const rows = Math.ceil(height / CELL_SIZE) + 2;

  for (let row = -1; row < rows; row++) {
    for (let col = -1; col < cols; col++) {
      seeds.push({
        homeX: col * CELL_SIZE + CELL_SIZE / 2,
        homeY: row * CELL_SIZE + CELL_SIZE / 2,
        amplitude,
        phaseX1: rand(col, row, 0) * Math.PI * 2,
        phaseX2: rand(col, row, 1) * Math.PI * 2,
        phaseY1: rand(col, row, 2) * Math.PI * 2,
        phaseY2: rand(col, row, 3) * Math.PI * 2,
        rateX1: 0.7 + rand(col, row, 4) * 0.6,
        rateX2: 1.7 + rand(col, row, 5) * 0.9,
        rateY1: 0.7 + rand(col, row, 6) * 0.6,
        rateY2: 1.7 + rand(col, row, 7) * 0.9,
        colour: palette[Math.floor(rand(col, row, 8) * palette.length)],
      });
    }
  }

  points = seeds.map(() => [0, 0]);
}

function positionSeeds(time) {
  const t = time * DRIFT_SPEED;

  for (let i = 0; i < seeds.length; i++) {
    const s = seeds[i];
    // the two weights sum to 1 by construction, so the offset can never exceed the amplitude and the seed stays in its cell
    const dx = DRIFT_BIAS * Math.sin(t * s.rateX1 + s.phaseX1) + (1 - DRIFT_BIAS) * Math.sin(t * s.rateX2 + s.phaseX2);
    const dy = DRIFT_BIAS * Math.sin(t * s.rateY1 + s.phaseY1) + (1 - DRIFT_BIAS) * Math.sin(t * s.rateY2 + s.phaseY2);

    points[i][0] = s.homeX + dx * s.amplitude;
    points[i][1] = s.homeY + dy * s.amplitude;
  }
}

function render() {
  const voronoi = Delaunay.from(points).voronoi([0, 0, width, height]);

  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = edgeColour;
  ctx.lineWidth = 1;

  for (let i = 0; i < points.length; i++) {
    ctx.beginPath();
    voronoi.renderCell(i, ctx);   // traces this cells outline
    ctx.fillStyle = seeds[i].colour;
    ctx.fill();
    ctx.stroke();
  }
}

function tick(now) {
  positionSeeds(now / 1000 + TIME_OFFSET);
  render();
  frame = requestAnimationFrame(tick);
}

function start() {
  cancelAnimationFrame(frame);

  if (reducedMotion.matches) {
    positionSeeds(TIME_OFFSET);
    render();
    return;
  }

  frame = requestAnimationFrame(tick);
}


resize();
buildPalette(); // will need to change to be able to read light vs dark mode
buildSeeds();
start();


let resizePending = false;
window.addEventListener('resize', () => {
  if (resizePending) return;
  resizePending = true;

  requestAnimationFrame((now) => {
    resizePending = false;
    resize();
    buildSeeds();
    positionSeeds(now / 1000 + TIME_OFFSET);
    render();
  });
});

reducedMotion.addEventListener('change', start);

// the base colour is baked into palette and into every seed's colour at build
// time, so a theme switch has to redo both rather than just repaint
window.addEventListener('themechange', () => {
  buildPalette();
  buildSeeds();
  positionSeeds(performance.now() / 1000 + TIME_OFFSET);
  render();
});
