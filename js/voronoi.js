import { Delaunay } from "https://cdn.jsdelivr.net/npm/d3-delaunay@6/+esm";



const CELL_SIZE = 200;
const SCATTER    = 0.75;   // 0 = perfect grid, 1 = fully scattered
const DRIFT_SPEED = 0.06; // radians per second, roughly one lap per 100s

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
let seeds = [];      // each seed keeps its home cell centre and its own drift phases
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
  buildPalette();
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
        phaseX1: Math.random() * Math.PI * 2,
        phaseX2: Math.random() * Math.PI * 2,
        phaseY1: Math.random() * Math.PI * 2,
        phaseY2: Math.random() * Math.PI * 2,
        rateX1: 0.7 + Math.random() * 0.6,
        rateX2: 1.7 + Math.random() * 0.9,
        rateY1: 0.7 + Math.random() * 0.6,
        rateY2: 1.7 + Math.random() * 0.9,
        colour: palette[Math.floor(Math.random() * palette.length)],
      });
    }
  }

  points = seeds.map(() => [0, 0]);
}

function positionSeeds(time) {
  const t = time * DRIFT_SPEED;

  for (let i = 0; i < seeds.length; i++) {
    const s = seeds[i];
    // weights sum to 1, so the offset can never exceed the amplitude and the seed stays in its cell
    const dx = 0.6 * Math.sin(t * s.rateX1 + s.phaseX1) + 0.4 * Math.sin(t * s.rateX2 + s.phaseX2);
    const dy = 0.6 * Math.sin(t * s.rateY1 + s.phaseY1) + 0.4 * Math.sin(t * s.rateY2 + s.phaseY2);

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
  positionSeeds(now / 1000);
  render();
  frame = requestAnimationFrame(tick);
}

function start() {
  cancelAnimationFrame(frame);

  if (reducedMotion.matches) {
    positionSeeds(0);
    render();
    return;
  }

  frame = requestAnimationFrame(tick);
}


resize();
buildSeeds();
start();

let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    resize();
    buildSeeds();
    start();
  }, 200);
});

reducedMotion.addEventListener('change', start);
