<script setup lang="ts">
import { ref, computed } from 'vue';
import { Decimal, format } from '../lib/decimal';

const tMax = ref(40);
const expGrowth = ref(1.07);
const expBase = ref(1);
const logScale = ref(true);
const showExp = ref(true);

const DEPTHS = [1, 2, 3, 4, 5] as const;
type Depth = (typeof DEPTHS)[number];
const visibleDepths = ref<Record<Depth, boolean>>({ 1: true, 2: true, 3: true, 4: true, 5: true });

const N_SAMPLES = 240;

function factorial(n: number): Decimal {
  let r = new Decimal(1);
  for (let i = 2; i <= n; i++) r = r.mul(i);
  return r;
}

interface Series {
  label: string;
  color: string;
  values: Decimal[];
  isExp?: boolean;
  depth?: Depth;
}

const COLORS: Record<Depth, string> = {
  1: '#7fa8c9',
  2: '#9fc89f',
  3: '#d4b16a',
  4: '#cf8f6e',
  5: '#b58cc2',
};
const EXP_COLOR = '#e07b6c';

const ts = computed(() => {
  const out: number[] = [];
  for (let i = 0; i < N_SAMPLES; i++) {
    out.push((i / (N_SAMPLES - 1)) * tMax.value);
  }
  return out;
});

const series = computed<Series[]>(() => {
  const out: Series[] = [];
  for (const d of DEPTHS) {
    if (!visibleDepths.value[d]) continue;
    const fact = factorial(d);
    const values = ts.value.map((t) => new Decimal(t).pow(d).div(fact));
    out.push({ label: `depth ${d}`, color: COLORS[d], values, depth: d });
  }
  if (showExp.value) {
    const base = new Decimal(expBase.value);
    const r = new Decimal(expGrowth.value);
    const values = ts.value.map((t) => base.mul(r.pow(t)));
    out.push({
      label: `${expBase.value} × ${expGrowth.value.toFixed(3)}^t`,
      color: EXP_COLOR,
      values,
      isExp: true,
    });
  }
  return out;
});

const W = 640;
const H = 360;
const PAD = { l: 70, r: 16, t: 14, b: 60 };
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

function buildScale(seriesList: Series[], log: boolean): YScale {
  let max = -Infinity;
  let min = Infinity;
  for (const s of seriesList) {
    for (const v of s.values) {
      const n = v.toNumber();
      if (!Number.isFinite(n)) continue;
      if (n > max) max = n;
      if (n > 0 && n < min) min = n;
    }
  }
  if (!Number.isFinite(max) || max <= 0) {
    return { toY: () => PAD.t + PH / 2, ticks: [] };
  }
  if (log) {
    if (!Number.isFinite(min) || min <= 0) min = Math.max(1e-3, max * 1e-9);
    const lmin = Math.log10(min);
    const lmax = Math.log10(max);
    const span = lmax - lmin || 1;
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
      ticks.push({ label: `10^${p}`, y: PAD.t + (1 - (p - lmin) / span) * PH });
    }
    return { toY, ticks };
  }
  const span = max;
  const toY = (v: Decimal): number => {
    const n = v.toNumber();
    return PAD.t + (1 - n / span) * PH;
  };
  const ticks: Tick[] = [
    { label: format(max), y: PAD.t },
    { label: format(span * 0.5), y: PAD.t + PH * 0.5 },
    { label: '0', y: PAD.t + PH },
  ];
  return { toY, ticks };
}

const yScale = computed(() => buildScale(series.value, logScale.value));

function buildPath(values: Decimal[], y: YScale): string {
  const xStep = PW / (N_SAMPLES - 1);
  const parts: string[] = [];
  for (let i = 0; i < values.length; i++) {
    const x = PAD.l + i * xStep;
    const yy = y.toY(values[i]);
    parts.push((i === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + yy.toFixed(1));
  }
  return parts.join(' ');
}

const X_TICKS = computed(() => {
  const tm = tMax.value;
  const stepCandidates = [1, 2, 5, 10, 20, 25, 50, 100];
  const target = 6;
  let step = stepCandidates[0];
  for (const c of stepCandidates) {
    if (tm / c <= target) {
      step = c;
      break;
    }
  }
  const out: number[] = [];
  for (let v = 0; v <= tm; v += step) out.push(v);
  return out;
});

function xTickPos(t: number): number {
  return PAD.l + (t / tMax.value) * PW;
}
</script>

<template>
  <div class="demo ngc">
    <div class="ngc-controls">
      <label>
        <span class="demo-label">t max = {{ tMax }}</span>
        <input v-model.number="tMax" type="range" min="10" max="200" step="1" />
      </label>
      <label>
        <span class="demo-label">exponential growth = {{ expGrowth.toFixed(3) }}</span>
        <input v-model.number="expGrowth" type="range" min="1.01" max="1.20" step="0.001" />
      </label>
      <label>
        <span class="demo-label">exponential base = {{ expBase.toFixed(2) }}</span>
        <input v-model.number="expBase" type="range" min="0.1" max="10" step="0.05" />
      </label>
      <label class="ngc-toggle">
        <input v-model="logScale" type="checkbox" />
        log scale
      </label>
    </div>

    <div class="ngc-legend">
      <label v-for="d in DEPTHS" :key="d" class="ngc-legend-item">
        <input v-model="visibleDepths[d]" type="checkbox" />
        <span class="ngc-swatch" :style="{ background: COLORS[d] }" />
        <span
          >depth {{ d }}
          <span class="ngc-formula"
            >(t<sup>{{ d }}</sup
            >/{{ d === 1 ? '1' : d === 2 ? '2' : d === 3 ? '6' : d === 4 ? '24' : '120' }})</span
          ></span
        >
      </label>
      <label class="ngc-legend-item">
        <input v-model="showExp" type="checkbox" />
        <span class="ngc-swatch" :style="{ background: EXP_COLOR }" />
        <span>exponential</span>
      </label>
    </div>

    <svg
      :viewBox="`0 0 ${W} ${H}`"
      class="ngc-chart"
      role="img"
      aria-label="Polynomial vs exponential growth"
    >
      <line :x1="PAD.l" :y1="PAD.t" :x2="PAD.l" :y2="PAD.t + PH" class="ngc-axis" />
      <line :x1="PAD.l" :y1="PAD.t + PH" :x2="W - PAD.r" :y2="PAD.t + PH" class="ngc-axis" />
      <g>
        <g v-for="t in yScale.ticks" :key="t.label">
          <line :x1="PAD.l" :y1="t.y" :x2="W - PAD.r" :y2="t.y" class="ngc-grid" />
          <text :x="PAD.l - 8" :y="t.y + 3" text-anchor="end" class="ngc-tick">{{ t.label }}</text>
        </g>
      </g>
      <g>
        <text
          v-for="tx in X_TICKS"
          :key="tx"
          :x="xTickPos(tx)"
          :y="H - PAD.b + 16"
          text-anchor="middle"
          class="ngc-tick"
        >
          {{ tx }}
        </text>
      </g>
      <text :x="PAD.l + PW / 2" :y="H - 24" text-anchor="middle" class="ngc-tick">t (seconds)</text>

      <path
        v-for="(s, i) in series"
        :key="i"
        :d="buildPath(s.values, yScale)"
        :class="['ngc-line', s.isExp ? 'ngc-line-exp' : 'ngc-line-poly']"
        :style="{ stroke: s.color }"
      />
    </svg>
  </div>
</template>

<style scoped>
.ngc-controls {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--gap);
  margin-bottom: var(--gap);
}

.ngc-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.9em;
  color: var(--color-text-muted);
  align-self: end;
}

.ngc-toggle input {
  width: auto;
}

.ngc-legend {
  display: flex;
  flex-wrap: wrap;
  gap: var(--gap);
  margin-bottom: var(--gap-sm);
  font-family: var(--font-mono);
  font-size: 0.85em;
  color: var(--color-text-muted);
}

.ngc-legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.ngc-legend-item input {
  width: auto;
  margin: 0;
}

.ngc-swatch {
  display: inline-block;
  width: 16px;
  height: 3px;
  border-radius: 2px;
}

.ngc-formula {
  opacity: 0.7;
  margin-left: 4px;
}

.ngc-chart {
  width: 100%;
  height: auto;
  display: block;
  font-family: var(--font-mono);
}

.ngc-axis {
  stroke: var(--color-border);
  stroke-width: 1;
}

.ngc-grid {
  stroke: var(--color-border);
  stroke-width: 0.5;
  stroke-dasharray: 2 3;
  opacity: 0.6;
}

.ngc-tick {
  fill: var(--color-text-muted);
  font-size: 11px;
}

.ngc-line {
  fill: none;
  stroke-width: 1.75;
  vector-effect: non-scaling-stroke;
}

.ngc-line-exp {
  stroke-dasharray: 5 3;
}
</style>
