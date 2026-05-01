<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue';
import uPlot from 'uplot';
import type { Options, AlignedData } from 'uplot';
import 'uplot/dist/uPlot.min.css';
import { seriesColor } from '../../../lib/series-colors';

// Lotka-Volterra predator-prey coupled ODE:
//   dx/dt = α x − β x y          (prey grows, eaten by predators)
//   dy/dt = δ x y − γ y          (predators grow on prey, decay otherwise)
//
// Closed-form trajectory does not exist, but the conserved quantity
//   H(x, y) = δ x − γ ln(x) + β y − α ln(y)
// is constant along orbits — every trajectory is a closed loop on a level set
// of H.  Equilibrium at (x*, y*) = (γ/δ, α/β); stable to small perturbation
// only in the conservative-orbit sense (orbits rotate around it, no asymptotic
// approach).

const alpha = ref(1.0);
const beta = ref(0.05);
const gamma = ref(0.5);
const delta = ref(0.02);
const x0 = ref(40);
const y0 = ref(9);
const tMax = ref(40);

// RK4 integration with fixed step.
const STEP = 0.01;
const trajectory = computed(() => {
  const a = alpha.value;
  const b = beta.value;
  const g = gamma.value;
  const d = delta.value;
  const T = tMax.value;
  const n = Math.floor(T / STEP) + 1;
  const ts = new Float64Array(n);
  const xs = new Float64Array(n);
  const ys = new Float64Array(n);
  let x = x0.value;
  let y = y0.value;
  ts[0] = 0;
  xs[0] = x;
  ys[0] = y;
  for (let i = 1; i < n; i++) {
    const t = i * STEP;
    const k1x = a * x - b * x * y;
    const k1y = d * x * y - g * y;
    const x2 = x + 0.5 * STEP * k1x;
    const y2 = y + 0.5 * STEP * k1y;
    const k2x = a * x2 - b * x2 * y2;
    const k2y = d * x2 * y2 - g * y2;
    const x3 = x + 0.5 * STEP * k2x;
    const y3 = y + 0.5 * STEP * k2y;
    const k3x = a * x3 - b * x3 * y3;
    const k3y = d * x3 * y3 - g * y3;
    const x4 = x + STEP * k3x;
    const y4 = y + STEP * k3y;
    const k4x = a * x4 - b * x4 * y4;
    const k4y = d * x4 * y4 - g * y4;
    x += (STEP / 6) * (k1x + 2 * k2x + 2 * k3x + k4x);
    y += (STEP / 6) * (k1y + 2 * k2y + 2 * k3y + k4y);
    if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || y < 0) {
      // Numerical blow-up; clamp tail to last good value.
      ts[i] = t;
      xs[i] = xs[i - 1];
      ys[i] = ys[i - 1];
      continue;
    }
    ts[i] = t;
    xs[i] = x;
    ys[i] = y;
  }
  return { ts, xs, ys };
});

const equilibrium = computed(() => ({
  x: gamma.value / delta.value,
  y: alpha.value / beta.value,
}));

const conserved = computed(() => {
  // H at the initial condition; theoretical invariant along the orbit.
  return (
    delta.value * x0.value -
    gamma.value * Math.log(x0.value) +
    beta.value * y0.value -
    alpha.value * Math.log(y0.value)
  );
});

const conservedDrift = computed(() => {
  // Numerical drift of H at trajectory endpoint vs initial. Sanity check on RK4.
  const { xs, ys } = trajectory.value;
  const x = xs[xs.length - 1];
  const y = ys[ys.length - 1];
  const Hend =
    delta.value * x - gamma.value * Math.log(x) + beta.value * y - alpha.value * Math.log(y);
  return Math.abs(Hend - conserved.value) / Math.abs(conserved.value);
});

const period = computed(() => {
  // Detect first crossing back through the y = y₀ line in the same direction
  // as the initial velocity. Approximation; exact for orbits, only meaningful
  // when the orbit is closed.
  const { ts, ys } = trajectory.value;
  if (ys.length < 10) return null;
  const initialDir = ys[1] - ys[0];
  if (Math.abs(initialDir) < 1e-9) return null;
  for (let i = Math.floor(ys.length * 0.05); i < ys.length - 1; i++) {
    const dir = ys[i + 1] - ys[i];
    if (Math.sign(dir) !== Math.sign(initialDir)) continue;
    if (Math.sign(ys[i] - y0.value) !== Math.sign(ys[i + 1] - y0.value)) {
      return ts[i];
    }
  }
  return null;
});

// Phase plane drawn on a raw canvas — uPlot is 1D-monotonic-x and doesn't
// natively render parametric (x(t), y(t)) trajectories.
const phaseCanvasRef = ref<HTMLCanvasElement | null>(null);
function drawPhase(): void {
  const cnv = phaseCanvasRef.value;
  if (!cnv) return;
  const dpr = window.devicePixelRatio || 1;
  const w = cnv.clientWidth;
  const h = cnv.clientHeight;
  if (cnv.width !== Math.floor(w * dpr) || cnv.height !== Math.floor(h * dpr)) {
    cnv.width = Math.floor(w * dpr);
    cnv.height = Math.floor(h * dpr);
  }
  const ctx = cnv.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  const { xs, ys } = trajectory.value;
  let xMin = Infinity;
  let xMax = -Infinity;
  let yMin = Infinity;
  let yMax = -Infinity;
  for (let i = 0; i < xs.length; i++) {
    if (xs[i] < xMin) xMin = xs[i];
    if (xs[i] > xMax) xMax = xs[i];
    if (ys[i] < yMin) yMin = ys[i];
    if (ys[i] > yMax) yMax = ys[i];
  }
  const eq = equilibrium.value;
  xMin = Math.max(0, Math.min(xMin, eq.x) * 0.9);
  xMax = Math.max(xMax, eq.x) * 1.1;
  yMin = Math.max(0, Math.min(yMin, eq.y) * 0.9);
  yMax = Math.max(yMax, eq.y) * 1.1;

  const padL = 40;
  const padR = 12;
  const padT = 12;
  const padB = 28;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;
  const xToPx = (xv: number) => padL + ((xv - xMin) / (xMax - xMin)) * plotW;
  const yToPx = (yv: number) => padT + (1 - (yv - yMin) / (yMax - yMin)) * plotH;

  const grid = cssVar('--color-border', '#4a423c');
  const axisStroke = cssVar('--color-text-muted', '#a89784');

  // Axes.
  ctx.strokeStyle = grid;
  ctx.lineWidth = 0.5;
  ctx.setLineDash([2, 3]);
  for (let i = 0; i <= 4; i++) {
    const xv = xMin + (i / 4) * (xMax - xMin);
    const px = xToPx(xv);
    ctx.beginPath();
    ctx.moveTo(px, padT);
    ctx.lineTo(px, padT + plotH);
    ctx.stroke();
  }
  for (let i = 0; i <= 4; i++) {
    const yv = yMin + (i / 4) * (yMax - yMin);
    const py = yToPx(yv);
    ctx.beginPath();
    ctx.moveTo(padL, py);
    ctx.lineTo(padL + plotW, py);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // Trajectory.
  ctx.strokeStyle = seriesColor('amber');
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  for (let i = 0; i < xs.length; i++) {
    const px = xToPx(xs[i]);
    const py = yToPx(ys[i]);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();

  // Initial-condition marker.
  ctx.fillStyle = seriesColor('amber');
  ctx.beginPath();
  ctx.arc(xToPx(x0.value), yToPx(y0.value), 4, 0, Math.PI * 2);
  ctx.fill();

  // Equilibrium marker.
  ctx.strokeStyle = seriesColor('teal');
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(xToPx(eq.x), yToPx(eq.y), 5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(xToPx(eq.x) - 6, yToPx(eq.y));
  ctx.lineTo(xToPx(eq.x) + 6, yToPx(eq.y));
  ctx.moveTo(xToPx(eq.x), yToPx(eq.y) - 6);
  ctx.lineTo(xToPx(eq.x), yToPx(eq.y) + 6);
  ctx.stroke();

  // Axis labels and tick numbers.
  ctx.fillStyle = axisStroke;
  ctx.font = '11px ui-monospace, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (let i = 0; i <= 4; i++) {
    const xv = xMin + (i / 4) * (xMax - xMin);
    ctx.fillText(xv.toFixed(0), xToPx(xv), padT + plotH + 4);
  }
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let i = 0; i <= 4; i++) {
    const yv = yMin + (i / 4) * (yMax - yMin);
    ctx.fillText(yv.toFixed(0), padL - 4, yToPx(yv));
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('x (prey)', padL + plotW / 2, h - 4);
  ctx.save();
  ctx.translate(12, padT + plotH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('y (predator)', 0, 0);
  ctx.restore();
}

function cssVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

// Time-series plot via uPlot.
const tsRef = ref<HTMLDivElement | null>(null);
let tsPlot: uPlot | null = null;
let ro: ResizeObserver | null = null;

function buildTsData(): AlignedData {
  const { ts, xs, ys } = trajectory.value;
  // Subsample to keep uPlot snappy; trajectory has ~4000 pts, plot ~400 is plenty.
  const stride = Math.max(1, Math.floor(ts.length / 400));
  const n = Math.ceil(ts.length / stride);
  const tt = new Float64Array(n);
  const xx = new Float64Array(n);
  const yy = new Float64Array(n);
  for (let i = 0, j = 0; i < ts.length && j < n; i += stride, j++) {
    tt[j] = ts[i];
    xx[j] = xs[i];
    yy[j] = ys[i];
  }
  return [tt, xx, yy] as unknown as AlignedData;
}

function buildTsOpts(width: number): Options {
  const stroke = cssVar('--color-text-muted', '#a89784');
  const grid = cssVar('--color-border', '#4a423c');
  return {
    width,
    height: 220,
    cursor: { drag: { x: false, y: false }, points: { size: 4 } },
    legend: { show: false },
    scales: { x: { time: false } },
    axes: [
      {
        stroke,
        grid: { stroke: grid, width: 0.5, dash: [2, 3] },
        ticks: { stroke: grid, width: 0.5 },
        label: 't',
        labelSize: 24,
        font: '11px ui-monospace, monospace',
        labelFont: '11px ui-monospace, monospace',
      },
      {
        stroke,
        grid: { stroke: grid, width: 0.5, dash: [2, 3] },
        ticks: { stroke: grid, width: 0.5 },
        label: 'population',
        labelSize: 28,
        size: 56,
        font: '11px ui-monospace, monospace',
        labelFont: '11px ui-monospace, monospace',
      },
    ],
    series: [
      {},
      {
        label: 'x (prey)',
        stroke: seriesColor('amber'),
        width: 1.6,
        points: { show: false },
      },
      {
        label: 'y (predator)',
        stroke: seriesColor('teal'),
        width: 1.6,
        points: { show: false },
      },
    ],
  };
}

function mount(): void {
  if (tsRef.value) {
    const w = tsRef.value.clientWidth || 320;
    tsPlot = new uPlot(buildTsOpts(w), buildTsData(), tsRef.value);
  }
  drawPhase();
}

onMounted(() => {
  mount();
  ro = new ResizeObserver(() => {
    if (tsPlot && tsRef.value) {
      const w = tsRef.value.clientWidth;
      if (w > 0) tsPlot.setSize({ width: w, height: 220 });
    }
    drawPhase();
  });
  if (tsRef.value) ro.observe(tsRef.value);
  if (phaseCanvasRef.value) ro.observe(phaseCanvasRef.value);
});

onBeforeUnmount(() => {
  ro?.disconnect();
  ro = null;
  tsPlot?.destroy();
  tsPlot = null;
});

watch(
  () => [alpha.value, beta.value, gamma.value, delta.value, x0.value, y0.value, tMax.value],
  () => {
    if (tsPlot) tsPlot.setData(buildTsData());
    drawPhase();
  },
);
</script>

<template>
  <div class="demo">
    <div class="demo-controls">
      <label>
        <span class="demo-label">α (prey growth) = {{ alpha.toFixed(2) }}</span>
        <input
          v-model.number="alpha"
          type="range"
          min="0.1"
          max="2"
          step="0.05"
        >
      </label>
      <label>
        <span class="demo-label">β (predation) = {{ beta.toFixed(3) }}</span>
        <input
          v-model.number="beta"
          type="range"
          min="0.005"
          max="0.2"
          step="0.005"
        >
      </label>
      <label>
        <span class="demo-label">γ (predator decay) = {{ gamma.toFixed(2) }}</span>
        <input
          v-model.number="gamma"
          type="range"
          min="0.1"
          max="2"
          step="0.05"
        >
      </label>
      <label>
        <span class="demo-label">δ (predator gain) = {{ delta.toFixed(3) }}</span>
        <input
          v-model.number="delta"
          type="range"
          min="0.005"
          max="0.1"
          step="0.001"
        >
      </label>
      <label>
        <span class="demo-label">x₀ (initial prey) = {{ x0.toFixed(0) }}</span>
        <input
          v-model.number="x0"
          type="range"
          min="1"
          max="120"
          step="1"
        >
      </label>
      <label>
        <span class="demo-label">y₀ (initial predator) = {{ y0.toFixed(0) }}</span>
        <input
          v-model.number="y0"
          type="range"
          min="1"
          max="60"
          step="1"
        >
      </label>
      <label>
        <span class="demo-label">t range = 0..{{ tMax.toFixed(0) }}</span>
        <input
          v-model.number="tMax"
          type="range"
          min="10"
          max="120"
          step="2"
        >
      </label>
    </div>

    <div class="dual">
      <div class="dual-panel">
        <span class="triptych-panel-label">phase plane (x vs y)</span>
        <div class="phase-wrapper">
          <canvas ref="phaseCanvasRef" />
        </div>
      </div>
      <div class="dual-panel">
        <span class="triptych-panel-label">x(t), y(t) — time series</span>
        <div ref="tsRef" />
      </div>
    </div>

    <div class="readouts">
      <div>
        <span class="r-label">equilibrium (x*, y*)</span>
        <code>({{ equilibrium.x.toFixed(2) }}, {{ equilibrium.y.toFixed(2) }})</code>
      </div>
      <div>
        <span class="r-label">conserved H</span>
        <code>{{ conserved.toFixed(3) }}</code>
      </div>
      <div>
        <span class="r-label">numerical drift in H</span>
        <code>{{ (conservedDrift * 100).toFixed(2) }}%</code>
      </div>
      <div>
        <span class="r-label">period (one orbit)</span>
        <code>{{ period === null ? '—' : `≈ ${period.toFixed(1)}` }}</code>
      </div>
    </div>

    <p class="demo-note">
      The phase-plane panel shows the trajectory as a closed loop around the equilibrium
      <code>(γ/δ, α/β)</code>. The orbit's <em>shape</em> is set by the conserved quantity
      <code>H</code>; <code>(x₀, y₀)</code> picks <em>which</em> orbit. There is no closed-form
      trajectory — but the orbit is closed, the period is finite, and small perturbations of
      <code>(x₀, y₀)</code> produce nested orbits, not asymptotic decay. This is the bifurcation:
      the catalog's first-passage time still <em>exists</em> (return to <code>y = y₀</code>), but no
      elementary algebra delivers it.
    </p>
  </div>
</template>

<style scoped>
.demo-controls {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--gap);
}
.dual {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: var(--gap);
  margin-top: var(--gap);
}
.dual-panel {
  min-width: 0;
}
.phase-wrapper {
  position: relative;
  width: 100%;
  height: 220px;
}
.phase-wrapper canvas {
  width: 100%;
  height: 100%;
  display: block;
}
.readouts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--gap);
  margin-top: var(--gap);
  font-family: var(--font-mono);
  font-size: 0.88em;
}
.readouts > div {
  background: var(--color-bg);
  border-radius: var(--radius-sm);
  padding: var(--gap-sm) var(--gap);
}
.r-label {
  display: block;
  color: var(--color-text-muted);
  font-size: 0.78em;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 2px;
}
.readouts code {
  background: none;
  padding: 0;
  color: var(--color-text);
}
.demo-note {
  margin-top: var(--gap);
  font-size: 0.92em;
  color: var(--color-text-muted);
}
.demo-note code {
  background: none;
  padding: 0;
  font-size: 0.95em;
}
@media (max-width: 880px) {
  .dual {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
