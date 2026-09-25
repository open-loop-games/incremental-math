<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { seriesColor } from '../../../lib/series-colors';

// 3-strategy population game on the 2-simplex.  Strategy frequencies
// (xR, xP, xS) evolve under the replicator equation:
//   dx_i/dt = x_i (f_i − φ),    f_i = Σ_j A[i][j] x_j,   φ = Σ_k x_k f_k.
//
// Standard RPS has A[i][j] zero-sum:  ε = 0 ⇒ orbits around (1/3,1/3,1/3),
// the centroid is a centre (Lyapunov-stable, not asymptotically stable).
// A small positive ε on the diagonal makes the game positive-sum and the
// centroid an attractor; a small negative ε makes it a repeller and the
// trajectory spirals outward toward an edge.  The bifurcation between
// orbits, attractor, and repeller is the headline.

const epsilon = ref(0.0);
const xR = ref(0.6);
const xP = ref(0.3);
const tMax = ref(60);

function buildPayoff(eps: number): number[][] {
  // Symmetric RPS with diagonal perturbation.
  const a = 1;
  const b = -1;
  return [
    [eps, b, a],
    [a, eps, b],
    [b, a, eps],
  ];
}

function normalize(r: number, p: number): { R: number; P: number; S: number } {
  const s = 1 - r - p;
  return { R: r, P: p, S: s };
}

const initialState = computed(() => normalize(xR.value, xP.value));

const STEP = 0.02;

const trajectory = computed(() => {
  const A = buildPayoff(epsilon.value);
  const n = Math.floor(tMax.value / STEP) + 1;
  const ts = new Float64Array(n);
  const r = new Float64Array(n);
  const p = new Float64Array(n);
  const s = new Float64Array(n);
  // Clamp to interior of the simplex so replicator doesn't latch on a corner.
  let R = Math.max(1e-4, Math.min(1 - 2e-4, initialState.value.R));
  let P = Math.max(1e-4, Math.min(1 - R - 1e-4, initialState.value.P));
  let S = 1 - R - P;
  ts[0] = 0;
  r[0] = R;
  p[0] = P;
  s[0] = S;
  for (let i = 1; i < n; i++) {
    const k1 = step(R, P, S, A);
    const R2 = R + 0.5 * STEP * k1.dR;
    const P2 = P + 0.5 * STEP * k1.dP;
    const S2 = S + 0.5 * STEP * k1.dS;
    const k2 = step(R2, P2, S2, A);
    const R3 = R + 0.5 * STEP * k2.dR;
    const P3 = P + 0.5 * STEP * k2.dP;
    const S3 = S + 0.5 * STEP * k2.dS;
    const k3 = step(R3, P3, S3, A);
    const R4 = R + STEP * k3.dR;
    const P4 = P + STEP * k3.dP;
    const S4 = S + STEP * k3.dS;
    const k4 = step(R4, P4, S4, A);
    R += (STEP / 6) * (k1.dR + 2 * k2.dR + 2 * k3.dR + k4.dR);
    P += (STEP / 6) * (k1.dP + 2 * k2.dP + 2 * k3.dP + k4.dP);
    S += (STEP / 6) * (k1.dS + 2 * k2.dS + 2 * k3.dS + k4.dS);
    // Renormalize to combat drift.
    const sum = R + P + S;
    R /= sum;
    P /= sum;
    S /= sum;
    ts[i] = i * STEP;
    r[i] = R;
    p[i] = P;
    s[i] = S;
  }
  return { ts, r, p, s };
});

interface Step {
  dR: number;
  dP: number;
  dS: number;
}

function step(R: number, P: number, S: number, A: number[][]): Step {
  const fR = A[0][0] * R + A[0][1] * P + A[0][2] * S;
  const fP = A[1][0] * R + A[1][1] * P + A[1][2] * S;
  const fS = A[2][0] * R + A[2][1] * P + A[2][2] * S;
  const phi = R * fR + P * fP + S * fS;
  return {
    dR: R * (fR - phi),
    dP: P * (fP - phi),
    dS: S * (fS - phi),
  };
}

const finalState = computed(() => {
  const { r, p, s } = trajectory.value;
  const i = r.length - 1;
  return { R: r[i], P: p[i], S: s[i] };
});

const regime = computed(() => {
  const eps = epsilon.value;
  if (Math.abs(eps) < 0.005) return 'closed orbits (zero-sum)';
  if (eps > 0) return 'centroid attractor (positive-sum)';
  return 'centroid repeller (negative-sum)';
});

// SVG simplex layout.
const SIMPLEX_W = 360;
const SIMPLEX_H = 320;
// Triangle vertices: R top, P bottom-left, S bottom-right.
const V = {
  R: { x: SIMPLEX_W / 2, y: 30 },
  P: { x: 40, y: SIMPLEX_H - 30 },
  S: { x: SIMPLEX_W - 40, y: SIMPLEX_H - 30 },
};

function project(R: number, P: number, S: number): { x: number; y: number } {
  return {
    x: R * V.R.x + P * V.P.x + S * V.S.x,
    y: R * V.R.y + P * V.P.y + S * V.S.y,
  };
}

const trajectoryPath = computed(() => {
  const { r, p, s } = trajectory.value;
  // Subsample to keep path tractable.
  const stride = Math.max(1, Math.floor(r.length / 600));
  let path = '';
  for (let i = 0; i < r.length; i += stride) {
    const pt = project(r[i], p[i], s[i]);
    path += (i === 0 ? 'M ' : ' L ') + pt.x.toFixed(1) + ' ' + pt.y.toFixed(1);
  }
  return path;
});

const startPoint = computed(() =>
  project(initialState.value.R, initialState.value.P, initialState.value.S),
);
const endPoint = computed(() =>
  project(finalState.value.R, finalState.value.P, finalState.value.S),
);
const centroid = computed(() => project(1 / 3, 1 / 3, 1 / 3));

const colorTraj = seriesColor('amber');
const colorStart = seriesColor('teal');
const colorEnd = seriesColor('mauve');

// Time series of frequencies.
const tsRef = ref<HTMLDivElement | null>(null);
let tsCanvas: HTMLCanvasElement | null = null;
let ro: ResizeObserver | null = null;

function drawTimeSeries(): void {
  if (!tsRef.value) return;
  if (!tsCanvas) {
    tsCanvas = document.createElement('canvas');
    tsCanvas.style.display = 'block';
    tsCanvas.style.width = '100%';
    tsCanvas.style.height = '220px';
    tsRef.value.appendChild(tsCanvas);
  }
  const dpr = window.devicePixelRatio || 1;
  const w = tsRef.value.clientWidth;
  const h = 220;
  if (tsCanvas.width !== Math.floor(w * dpr) || tsCanvas.height !== Math.floor(h * dpr)) {
    tsCanvas.width = Math.floor(w * dpr);
    tsCanvas.height = Math.floor(h * dpr);
  }
  const ctx = tsCanvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  const padL = 36;
  const padR = 12;
  const padT = 12;
  const padB = 24;
  const pw = w - padL - padR;
  const ph = h - padT - padB;
  const { ts, r, p, s } = trajectory.value;
  const xToPx = (t: number) => padL + (t / tMax.value) * pw;
  const yToPx = (v: number) => padT + (1 - v) * ph;

  // Grid.
  const grid = cssVar('--color-border', '#4a423c');
  const text = cssVar('--color-text-muted', '#a89784');
  ctx.strokeStyle = grid;
  ctx.lineWidth = 0.5;
  ctx.setLineDash([2, 3]);
  for (let i = 0; i <= 4; i++) {
    const y = padT + (i / 4) * ph;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(padL + pw, y);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // Three series.
  const stride = Math.max(1, Math.floor(ts.length / 800));
  const drawSeries = (vals: Float64Array, color: string): void => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < ts.length; i += stride) {
      const x = xToPx(ts[i]);
      const y = yToPx(vals[i]);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  };
  drawSeries(r, seriesColor('amber'));
  drawSeries(p, seriesColor('sage'));
  drawSeries(s, seriesColor('teal'));

  // Axis labels.
  ctx.fillStyle = text;
  ctx.font = '11px ui-monospace, monospace';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let i = 0; i <= 4; i++) {
    const v = 1 - i / 4;
    ctx.fillText(v.toFixed(1), padL - 4, padT + (i / 4) * ph);
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (let i = 0; i <= 4; i++) {
    const t = (i / 4) * tMax.value;
    ctx.fillText(t.toFixed(0), padL + (i / 4) * pw, padT + ph + 4);
  }
}

function cssVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

onMounted(() => {
  drawTimeSeries();
  ro = new ResizeObserver(() => drawTimeSeries());
  if (tsRef.value) ro.observe(tsRef.value);
});

onBeforeUnmount(() => {
  ro?.disconnect();
  ro = null;
});

watch([epsilon, xR, xP, tMax], () => drawTimeSeries());
</script>

<template>
  <div class="demo">
    <div class="demo-controls">
      <label>
        <span class="demo-label">ε (diagonal perturbation) = {{ epsilon.toFixed(2) }}</span>
        <input v-model.number="epsilon" type="range" min="-0.3" max="0.3" step="0.01" />
      </label>
      <label>
        <span class="demo-label">x_R (initial Rock) = {{ xR.toFixed(2) }}</span>
        <input v-model.number="xR" type="range" min="0.05" max="0.9" step="0.01" />
      </label>
      <label>
        <span class="demo-label"
          >x_P (initial Paper) = {{ Math.min(xP, 1 - xR - 0.01).toFixed(2) }}</span
        >
        <input
          v-model.number="xP"
          type="range"
          min="0.05"
          :max="(1 - xR - 0.01).toFixed(2)"
          step="0.01"
        />
      </label>
      <label>
        <span class="demo-label">t range = 0..{{ tMax }}</span>
        <input v-model.number="tMax" type="range" min="20" max="200" step="5" />
      </label>
    </div>

    <div class="dual">
      <div class="dual-panel">
        <span class="triptych-panel-label">trajectory on the 2-simplex</span>
        <svg :viewBox="`0 0 ${SIMPLEX_W} ${SIMPLEX_H}`" class="simplex">
          <polygon
            :points="`${V.R.x},${V.R.y} ${V.P.x},${V.P.y} ${V.S.x},${V.S.y}`"
            class="simplex-bg"
          />
          <circle :cx="centroid.x" :cy="centroid.y" r="3" class="centroid" />
          <path :d="trajectoryPath" :stroke="colorTraj" />
          <circle :cx="startPoint.x" :cy="startPoint.y" r="5" :fill="colorStart" />
          <circle :cx="endPoint.x" :cy="endPoint.y" r="5" :fill="colorEnd" />
          <text :x="V.R.x" :y="V.R.y - 8" text-anchor="middle" class="vlabel">R</text>
          <text :x="V.P.x - 8" :y="V.P.y + 12" text-anchor="end" class="vlabel">P</text>
          <text :x="V.S.x + 8" :y="V.S.y + 12" text-anchor="start" class="vlabel">S</text>
        </svg>
      </div>
      <div class="dual-panel">
        <span class="triptych-panel-label">x_R(t), x_P(t), x_S(t) — frequencies</span>
        <div ref="tsRef" class="ts-wrap" />
        <div class="legend">
          <span><span class="dot" :style="{ background: seriesColor('amber') }" />R</span>
          <span><span class="dot" :style="{ background: seriesColor('sage') }" />P</span>
          <span><span class="dot" :style="{ background: seriesColor('teal') }" />S</span>
        </div>
      </div>
    </div>

    <div class="readouts">
      <div>
        <span class="r-label">regime</span>
        <code>{{ regime }}</code>
      </div>
      <div>
        <span class="r-label">final (R, P, S)</span>
        <code>
          ({{ finalState.R.toFixed(3) }}, {{ finalState.P.toFixed(3) }},
          {{ finalState.S.toFixed(3) }})
        </code>
      </div>
    </div>

    <p class="demo-note">
      Replicator dynamics on Rock-Paper-Scissors with payoff
      <code>A[i][i] = ε</code>, off-diagonals <code>±1</code>. At <code>ε = 0</code> the game is
      zero-sum and the trajectory traces a closed orbit around the centroid <code>(⅓, ⅓, ⅓)</code> —
      the same Lyapunov-conserved structure as the predator-prey demo, in strategy-space
      coordinates. Push <code>ε</code> positive and the centroid becomes an attractor; push negative
      and a repeller. The
      <a
        href="https://en.wikipedia.org/wiki/Best_response"
        target="_blank"
        rel="noopener noreferrer"
        >best-response operator's</a
      >
      fixed point at the centroid stays put under any perturbation, but whether the dynamics
      <em>reach</em> it is a separate question — and is exactly the kind of "the equilibrium exists,
      the trajectory to it does not close" that the bifurcation row labels.
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
.simplex {
  width: 100%;
  max-height: 320px;
  display: block;
  background: var(--color-bg);
  border-radius: var(--radius-sm);
}
.simplex-bg {
  fill: var(--color-surface);
  stroke: var(--color-text-muted);
  stroke-width: 1;
}
.simplex path {
  fill: none;
  stroke-width: 1.5;
}
.simplex .centroid {
  fill: var(--color-text-muted);
}
.vlabel {
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 600;
  fill: var(--color-text);
}
.ts-wrap {
  background: var(--color-bg);
  border-radius: var(--radius-sm);
  padding: var(--gap-sm);
  position: relative;
}
.legend {
  display: flex;
  gap: var(--gap);
  font-family: var(--font-mono);
  font-size: 0.8em;
  color: var(--color-text-muted);
  margin-top: var(--gap-sm);
  justify-content: center;
}
.legend .dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 4px;
  vertical-align: middle;
}
.readouts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
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
.demo-note a {
  color: var(--color-primary);
}
@media (max-width: 880px) {
  .dual {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
