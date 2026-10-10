<script setup lang="ts">
import { ref, computed } from 'vue';
import { Decimal, format } from '../lib/decimal';

const costBase = ref(3.738);
const rateGrowth = ref(1.07);
const productionBase = ref(1.67);
const logScale = ref(true);
const withMilestones = ref(true);

const N_MAX = 200;

const MILESTONES: ReadonlyArray<readonly [number, number]> = [
  [25, 2],
  [50, 2],
  [100, 2],
  [200, 2],
];

interface Sample {
  n: number;
  cost: Decimal;
  prod: Decimal;
}

const samples = computed<Sample[]>(() => {
  const out: Sample[] = [];
  let bonus = new Decimal(1);
  let mIdx = 0;
  for (let n = 1; n <= N_MAX; n++) {
    if (withMilestones.value) {
      while (mIdx < MILESTONES.length && MILESTONES[mIdx][0] === n) {
        bonus = bonus.mul(MILESTONES[mIdx][1]);
        mIdx++;
      }
    }
    const cost = new Decimal(costBase.value).mul(new Decimal(rateGrowth.value).pow(n));
    const prod = new Decimal(productionBase.value).mul(n).mul(bonus);
    out.push({ n, cost, prod });
  }
  return out;
});

const W = 640;
const H = 320;
const PAD = { l: 64, r: 16, t: 14, b: 36 };
const PW = W - PAD.l - PAD.r;
const PH = H - PAD.t - PAD.b;

interface Tick {
  label: string;
  y: number;
}
interface YScale {
  toY: (v: Decimal) => number;
  ticks: Tick[];
}

function buildScale(rows: Sample[], log: boolean): YScale {
  let min = Infinity;
  let max = -Infinity;
  for (const s of rows) {
    const c = s.cost.toNumber();
    const p = s.prod.toNumber();
    for (const v of [c, p]) {
      if (!Number.isFinite(v)) continue;
      if (v < min) min = v;
      if (v > max) max = v;
    }
  }
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) {
    return { toY: () => PAD.t + PH / 2, ticks: [] };
  }
  if (log) {
    if (min <= 0) min = 1e-3;
    const lmin = Math.log10(min);
    const lmax = Math.log10(max);
    const span = lmax - lmin;
    const toY = (v: Decimal): number => {
      const raw = v.toNumber();
      const safe = raw > 0 && Number.isFinite(raw) ? raw : min;
      const lv = Math.log10(safe);
      return PAD.t + (1 - (lv - lmin) / span) * PH;
    };
    const ticks: Tick[] = [];
    const lo = Math.ceil(lmin);
    const hi = Math.floor(lmax);
    const step = Math.max(1, Math.ceil((hi - lo + 1) / 8));
    for (let p = lo; p <= hi; p += step) {
      ticks.push({
        label: `10^${p}`,
        y: PAD.t + (1 - (p - lmin) / span) * PH,
      });
    }
    return { toY, ticks };
  }
  const span = max - min;
  const toY = (v: Decimal): number => PAD.t + (1 - (v.toNumber() - min) / span) * PH;
  const ticks: Tick[] = [
    { label: format(max), y: PAD.t },
    { label: format(min + span * 0.5), y: PAD.t + PH * 0.5 },
    { label: format(min), y: PAD.t + PH },
  ];
  return { toY, ticks };
}

const yScale = computed(() => buildScale(samples.value, logScale.value));

function buildPath(rows: Sample[], pick: 'cost' | 'prod', y: YScale): string {
  const xStep = PW / (N_MAX - 1);
  const parts: string[] = [];
  for (let i = 0; i < rows.length; i++) {
    const v = pick === 'cost' ? rows[i].cost : rows[i].prod;
    const x = PAD.l + i * xStep;
    const yy = y.toY(v);
    parts.push((i === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + yy.toFixed(1));
  }
  return parts.join(' ');
}

const costPath = computed(() => buildPath(samples.value, 'cost', yScale.value));
const prodPath = computed(() => buildPath(samples.value, 'prod', yScale.value));

const X_TICKS = [0, 50, 100, 150, 200];
function xTickPos(n: number): number {
  return PAD.l + (n / N_MAX) * PW;
}
</script>

<template>
  <div class="demo egs">
    <div class="egs-controls">
      <label>
        <span class="demo-label">base cost = {{ costBase.toFixed(3) }}</span>
        <input v-model.number="costBase" type="range" min="1" max="10" step="0.001" />
      </label>
      <label>
        <span class="demo-label">cost ratio = {{ rateGrowth.toFixed(3) }}</span>
        <input v-model.number="rateGrowth" type="range" min="1.01" max="1.20" step="0.001" />
      </label>
      <label>
        <span class="demo-label">production base = {{ productionBase.toFixed(2) }} / sec</span>
        <input v-model.number="productionBase" type="range" min="0.1" max="10" step="0.01" />
      </label>
      <label class="egs-toggle">
        <input v-model="logScale" type="checkbox" />
        log scale
      </label>
      <label class="egs-toggle">
        <input v-model="withMilestones" type="checkbox" />
        milestone ×2 bumps (25, 50, 100, 200)
      </label>
    </div>

    <div class="egs-legend">
      <span class="egs-legend-item"><span class="egs-swatch egs-swatch-cost" /> cost of next</span>
      <span class="egs-legend-item"
        ><span class="egs-swatch egs-swatch-prod" /> production / sec</span
      >
    </div>

    <svg
      :viewBox="`0 0 ${W} ${H}`"
      class="egs-chart"
      role="img"
      aria-label="Cost and production curves"
    >
      <line :x1="PAD.l" :y1="PAD.t" :x2="PAD.l" :y2="PAD.t + PH" class="egs-axis" />
      <line :x1="PAD.l" :y1="PAD.t + PH" :x2="W - PAD.r" :y2="PAD.t + PH" class="egs-axis" />
      <g>
        <g v-for="t in yScale.ticks" :key="t.label">
          <line :x1="PAD.l" :y1="t.y" :x2="W - PAD.r" :y2="t.y" class="egs-grid" />
          <text :x="PAD.l - 8" :y="t.y + 3" text-anchor="end" class="egs-tick">{{ t.label }}</text>
        </g>
      </g>
      <g>
        <text
          v-for="nx in X_TICKS"
          :key="nx"
          :x="xTickPos(nx)"
          :y="H - PAD.b + 16"
          text-anchor="middle"
          class="egs-tick"
        >
          {{ nx }}
        </text>
      </g>
      <text :x="PAD.l + PW / 2" :y="H - 4" text-anchor="middle" class="egs-tick">N owned</text>

      <path :d="costPath" class="egs-line egs-line-cost" />
      <path :d="prodPath" class="egs-line egs-line-prod" />
    </svg>
  </div>
</template>

<style scoped>
.egs-controls {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--gap);
}
.egs-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.9em;
  color: var(--color-text-muted);
  align-self: end;
}
.egs-toggle input {
  width: auto;
}
.egs-legend {
  display: flex;
  flex-wrap: wrap;
  gap: var(--gap-lg);
  font-size: 0.85em;
  color: var(--color-text-muted);
  margin-block: var(--gap);
}
.egs-legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.egs-swatch {
  display: inline-block;
  width: 16px;
  height: 3px;
  border-radius: 2px;
}
.egs-swatch-cost {
  background: var(--series-teal);
}
.egs-swatch-prod {
  background: var(--color-primary);
}
.egs-chart {
  width: 100%;
  height: auto;
  display: block;
  font-family: var(--font-mono);
}
.egs-axis {
  stroke: var(--color-border);
  stroke-width: 1;
}
.egs-grid {
  stroke: var(--color-border);
  stroke-width: 0.5;
  stroke-dasharray: 2 3;
  opacity: 0.6;
}
.egs-tick {
  fill: var(--color-text-muted);
  font-size: 11px;
}
.egs-line {
  fill: none;
  stroke-width: 1.75;
  vector-effect: non-scaling-stroke;
}
.egs-line-cost {
  stroke: var(--series-teal);
}
.egs-line-prod {
  stroke: var(--color-primary);
}
</style>
