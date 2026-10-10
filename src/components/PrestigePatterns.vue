<script setup lang="ts">
import { ref, computed } from 'vue';
import { seriesColor } from '../lib/series-colors';

interface Curve {
  id: string;
  label: string;
  category: string;
  fn: (x: number, prevRun: number, lf: number) => number;
}

// Each curve maps x (= thisRun / prevRun) to y (= Δp / p_current).
// Constants are Pecorella's. Lifetime curves use lf as "previous run / lifetime
// after previous run"; default 0.75 ≡ his "lifetime is 4/3 of previous run".
const CURVES: Curve[] = [
  {
    id: 'rg',
    label: 'Realm Grinder',
    category: 'max, sqrt',
    fn: (x, prevRun) => {
      const D = 1e12;
      const p = (c: number) => 0.5 * (-1 + Math.sqrt(1 + (8 * c) / D));
      const pBefore = p(prevRun);
      const pAfter = Math.max(pBefore, p(x * prevRun));
      return pBefore > 0 ? (pAfter - pBefore) / pBefore : 0;
    },
  },
  {
    id: 'ac',
    label: 'AdVenture Capitalist',
    category: 'lifetime, sqrt',
    fn: (x, prevRun, lf) => {
      const D = 1e15;
      const p = (c: number) => 150 * Math.sqrt(c / D);
      const cBefore = prevRun / lf;
      const cAfter = cBefore + x * prevRun;
      return p(cBefore) > 0 ? (p(cAfter) - p(cBefore)) / p(cBefore) : 0;
    },
  },
  {
    id: 'cc',
    label: 'Cookie Clicker',
    category: 'lifetime, cube root',
    fn: (x, prevRun, lf) => {
      const D = 1e12;
      const p = (c: number) => Math.cbrt(c / D);
      const cBefore = prevRun / lf;
      const cAfter = cBefore + x * prevRun;
      return p(cBefore) > 0 ? (p(cAfter) - p(cBefore)) / p(cBefore) : 0;
    },
  },
  {
    id: 'ei',
    label: 'Egg, Inc.',
    category: 'since-reset, x^0.14',
    fn: (x) => Math.pow(Math.max(x, 1e-9), 0.14),
  },
  {
    id: 'ch',
    label: 'Clicker Heroes',
    category: 'log of currency',
    fn: (x, prevRun) => {
      // Δp / p_current = log(thisRun) / log(prevRun) under "1 prior run at prevRun" baseline.
      const lp = Math.log(prevRun);
      if (!Number.isFinite(lp) || lp <= 0) return 0;
      return Math.log(Math.max(x * prevRun, 1)) / lp;
    },
  },
];

const prevRunExp = ref(15); // log10(prevRun); default 1e15 puts everyone in asymptotic regime
const prevRun = computed(() => Math.pow(10, prevRunExp.value));
const lifetimeFraction = ref(0.75);
const xMax = ref(8);

const N_X = 120;
const xs = computed(() => {
  const a = 0.25;
  const b = xMax.value;
  return Array.from({ length: N_X }, (_, i) => a + ((b - a) * i) / (N_X - 1));
});

interface Series {
  id: string;
  label: string;
  category: string;
  pts: { x: number; y: number }[];
}

const series = computed<Series[]>(() => {
  const pr = prevRun.value;
  const lf = lifetimeFraction.value;
  return CURVES.map((c) => ({
    id: c.id,
    label: c.label,
    category: c.category,
    pts: xs.value.map((x) => ({ x, y: c.fn(x, pr, lf) })),
  }));
});

const W = 640;
const H = 360;
const PAD = { l: 56, r: 130, t: 14, b: 40 };
const PW = W - PAD.l - PAD.r;
const PH = H - PAD.t - PAD.b;

const yMax = computed(() => {
  let m = 0;
  for (const s of series.value) {
    for (const p of s.pts) {
      if (Number.isFinite(p.y) && p.y > m) m = p.y;
    }
  }
  return Math.max(1.5, Math.min(m, 6));
});

function xToPx(x: number): number {
  const a = 0.25;
  const b = xMax.value;
  return PAD.l + ((x - a) / (b - a)) * PW;
}
function yToPx(y: number): number {
  const clamped = Math.max(0, Math.min(y, yMax.value));
  return PAD.t + (1 - clamped / yMax.value) * PH;
}

function pathFor(s: Series): string {
  const parts: string[] = [];
  let started = false;
  for (const p of s.pts) {
    if (!Number.isFinite(p.y)) {
      started = false;
      continue;
    }
    const x = xToPx(p.x);
    const y = yToPx(p.y);
    parts.push((started ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1));
    started = true;
  }
  return parts.join(' ');
}

const X_TICKS = computed(() => {
  const m = xMax.value;
  if (m <= 4) return [0.5, 1, 2, 3, 4];
  if (m <= 8) return [0.5, 1, 2, 4, 6, 8];
  return [0.5, 1, 2, 4, 8, 16];
});

const Y_TICKS = computed(() => {
  const m = yMax.value;
  const step = m <= 1.5 ? 0.25 : m <= 3 ? 0.5 : 1;
  const out: number[] = [];
  for (let v = 0; v <= m + 1e-9; v += step) out.push(Number(v.toFixed(2)));
  return out;
});

// Highlight: which curve crosses y=1 at x=current value, etc.
const highlightX = ref(2);
const sliceVals = computed(() => {
  const x = highlightX.value;
  return series.value.map((s) => {
    const c = CURVES.find((c) => c.id === s.id)!;
    const y = c.fn(x, prevRun.value, lifetimeFraction.value);
    return { id: s.id, label: s.label, category: s.category, y };
  });
});

const COLORS: Record<string, string> = {
  rg: seriesColor('teal'),
  ac: seriesColor('amber'),
  cc: seriesColor('slate'),
  ei: seriesColor('sage'),
  ch: seriesColor('mauve'),
};

function fmtY(y: number): string {
  if (!Number.isFinite(y)) return '—';
  if (y < 0.01) return y.toFixed(3);
  if (y < 10) return y.toFixed(2);
  return y.toFixed(1);
}
</script>

<template>
  <div class="demo pp">
    <div class="pp-controls">
      <label>
        <span class="demo-label">previous run = 10^{{ prevRunExp.toFixed(1) }}</span>
        <input v-model.number="prevRunExp" type="range" min="9" max="21" step="0.5" />
      </label>
      <label>
        <span class="demo-label">prev run / lifetime = {{ lifetimeFraction.toFixed(2) }}</span>
        <input v-model.number="lifetimeFraction" type="range" min="0.4" max="0.95" step="0.01" />
      </label>
      <label>
        <span class="demo-label">x range up to {{ xMax }}×</span>
        <input v-model.number="xMax" type="range" min="2" max="16" step="1" />
      </label>
      <label>
        <span class="demo-label">slice at x = {{ highlightX.toFixed(2) }}×</span>
        <input v-model.number="highlightX" type="range" min="0.25" :max="xMax" step="0.05" />
      </label>
    </div>

    <svg
      :viewBox="`0 0 ${W} ${H}`"
      class="pp-chart"
      role="img"
      aria-label="Prestige currency gain vs run-ratio for five games"
    >
      <line :x1="PAD.l" :y1="PAD.t" :x2="PAD.l" :y2="PAD.t + PH" class="pp-axis" />
      <line :x1="PAD.l" :y1="PAD.t + PH" :x2="PAD.l + PW" :y2="PAD.t + PH" class="pp-axis" />

      <g>
        <g v-for="t in Y_TICKS" :key="`y-${t}`">
          <line :x1="PAD.l" :y1="yToPx(t)" :x2="PAD.l + PW" :y2="yToPx(t)" class="pp-grid" />
          <text :x="PAD.l - 8" :y="yToPx(t) + 3" text-anchor="end" class="pp-tick">{{ t }}</text>
        </g>
        <line :x1="PAD.l" :y1="yToPx(1)" :x2="PAD.l + PW" :y2="yToPx(1)" class="pp-axis-special" />
        <text :x="PAD.l - 8" :y="yToPx(1) + 3" text-anchor="end" class="pp-tick pp-tick-special">
          1.0
        </text>
      </g>

      <g>
        <text
          v-for="t in X_TICKS"
          :key="`x-${t}`"
          :x="xToPx(t)"
          :y="PAD.t + PH + 16"
          text-anchor="middle"
          class="pp-tick"
        >
          {{ t }}×
        </text>
      </g>
      <text :x="PAD.l + PW / 2" :y="H - 6" text-anchor="middle" class="pp-axis-label">
        this run / previous run
      </text>
      <text
        :x="14"
        :y="PAD.t + PH / 2"
        text-anchor="middle"
        class="pp-axis-label"
        :transform="`rotate(-90 14 ${PAD.t + PH / 2})`"
      >
        Δp / p (current)
      </text>

      <g>
        <path
          v-for="s in series"
          :key="s.id"
          :d="pathFor(s)"
          :stroke="COLORS[s.id]"
          class="pp-line"
        />
      </g>

      <line
        :x1="xToPx(highlightX)"
        :y1="PAD.t"
        :x2="xToPx(highlightX)"
        :y2="PAD.t + PH"
        class="pp-slice"
      />
      <g>
        <circle
          v-for="s in sliceVals"
          :key="`d-${s.id}`"
          :cx="xToPx(highlightX)"
          :cy="yToPx(s.y)"
          r="3.5"
          :fill="COLORS[s.id]"
          stroke="var(--color-bg)"
          stroke-width="1"
        />
      </g>

      <g>
        <g
          v-for="(s, i) in sliceVals"
          :key="`l-${s.id}`"
          :transform="`translate(${PAD.l + PW + 12} ${PAD.t + 8 + i * 22})`"
        >
          <line x1="0" x2="14" y1="-4" y2="-4" :stroke="COLORS[s.id]" stroke-width="2.5" />
          <text x="20" y="0" class="pp-legend-name">{{ s.label }}</text>
          <text x="20" y="12" class="pp-legend-y">y = {{ fmtY(s.y) }}</text>
        </g>
      </g>
    </svg>

    <div class="pp-readout">
      <div class="pp-readout-row">
        <span class="pp-readout-label">y = 1 means this run doubles your prestige currency</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pp-controls {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--gap);
  margin-bottom: var(--gap);
}

.pp-chart {
  width: 100%;
  height: auto;
  display: block;
  font-family: var(--font-mono);
}

.pp-axis {
  stroke: var(--color-border);
  stroke-width: 1;
}

.pp-axis-special {
  stroke: var(--color-text-muted);
  stroke-width: 1;
  stroke-dasharray: 4 3;
  opacity: 0.5;
}

.pp-grid {
  stroke: var(--color-border);
  stroke-width: 0.5;
  stroke-dasharray: 2 3;
  opacity: 0.5;
}

.pp-tick {
  fill: var(--color-text-muted);
  font-size: 11px;
}

.pp-tick-special {
  fill: var(--color-text);
  font-weight: 600;
}

.pp-axis-label {
  fill: var(--color-text-muted);
  font-size: 11px;
}

.pp-line {
  fill: none;
  stroke-width: 1.75;
  vector-effect: non-scaling-stroke;
}

.pp-slice {
  stroke: var(--color-text-muted);
  stroke-width: 1;
  stroke-dasharray: 3 3;
  opacity: 0.6;
}

.pp-legend-name {
  fill: var(--color-text);
  font-size: 11px;
  font-weight: 600;
}

.pp-legend-y {
  fill: var(--color-text-muted);
  font-size: 10px;
}

.pp-readout {
  margin-top: var(--gap-sm);
  font-family: var(--font-mono);
  font-size: 0.85em;
  color: var(--color-text-muted);
}
</style>
