<script setup lang="ts">
import { ref, computed } from 'vue';
import { format } from 'open-loop-engine/primitives';

// Four canonical softcap shapes plotted on a shared input axis. Operates on
// JS Number directly — the lesson is the curve shape, not big-number arithmetic.

const xMax = ref(1000);
const threshold = ref(100);
const rootN = ref(2);          // root softcap exponent (1/n)
const powerP = ref(0.7);       // power softcap exponent (< 1)
const logK = ref(40);          // log softcap post-threshold strength
const piecewiseSlope2 = ref(0.1); // piecewise post-threshold slope ratio

const showLinear = ref(true);
const showRoot = ref(true);
const showPower = ref(true);
const showLog = ref(true);
const showPiecewise = ref(true);
const logScale = ref(false);

const N_SAMPLES = 256;

interface Curve {
  key: string;
  label: string;
  color: string;
  visible: boolean;
  fn: (x: number) => number;
}

const curves = computed<Curve[]>(() => [
  {
    key: 'linear',
    label: 'linear (no cap)',
    color: '#9aa0a6',
    visible: showLinear.value,
    fn: (x) => x,
  },
  {
    key: 'root',
    label: `root  ·  threshold + (x − threshold)^(1/${rootN.value.toFixed(1)})`,
    color: '#4f9de0',
    visible: showRoot.value,
    fn: (x) => {
      if (x <= threshold.value) return x;
      return threshold.value + Math.pow(x - threshold.value, 1 / rootN.value);
    },
  },
  {
    key: 'power',
    label: `power  ·  threshold · (x / threshold)^${powerP.value.toFixed(2)}`,
    color: '#6ec07a',
    visible: showPower.value,
    fn: (x) => {
      if (x <= threshold.value) return x;
      return threshold.value * Math.pow(x / threshold.value, powerP.value);
    },
  },
  {
    key: 'log',
    label: `log  ·  threshold + ${logK.value.toFixed(0)} · log₁₀(x − threshold + 1)`,
    color: '#d97a7a',
    visible: showLog.value,
    fn: (x) => {
      if (x <= threshold.value) return x;
      return threshold.value + logK.value * Math.log10(x - threshold.value + 1);
    },
  },
  {
    key: 'piecewise',
    label: `piecewise  ·  slope drops to ${piecewiseSlope2.value.toFixed(2)} at threshold`,
    color: '#c08acb',
    visible: showPiecewise.value,
    fn: (x) => {
      if (x <= threshold.value) return x;
      return threshold.value + piecewiseSlope2.value * (x - threshold.value);
    },
  },
]);

const W = 720;
const H = 360;
const PAD = { l: 64, r: 16, t: 14, b: 36 };
const PW = W - PAD.l - PAD.r;
const PH = H - PAD.t - PAD.b;

interface Tick {
  label: string;
  y: number;
}
interface YScale {
  toY: (v: number) => number;
  ticks: Tick[];
}

const yScale = computed<YScale>(() => {
  const visible = curves.value.filter((c) => c.visible);
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < N_SAMPLES; i++) {
    const x = (i / (N_SAMPLES - 1)) * xMax.value;
    for (const c of visible) {
      const v = c.fn(x);
      if (!Number.isFinite(v)) continue;
      if (v < min) min = v;
      if (v > max) max = v;
    }
  }
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) {
    return { toY: () => PAD.t + PH / 2, ticks: [] };
  }
  if (logScale.value) {
    if (min <= 0) min = Math.max(1e-3, max / 1e6);
    const lmin = Math.log10(min);
    const lmax = Math.log10(max);
    const span = lmax - lmin;
    const toY = (v: number): number => {
      const safe = v > 0 && Number.isFinite(v) ? v : min;
      return PAD.t + (1 - (Math.log10(safe) - lmin) / span) * PH;
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
  // 0-anchored linear so the threshold line is meaningful
  const yMin = 0;
  const yMax = max * 1.05;
  const span = yMax - yMin;
  const toY = (v: number): number => PAD.t + (1 - (v - yMin) / span) * PH;
  const ticks: Tick[] = [
    { label: format(yMax), y: PAD.t },
    { label: format(yMin + span * 0.5), y: PAD.t + PH * 0.5 },
    { label: '0', y: PAD.t + PH },
  ];
  return { toY, ticks };
});

function pathFor(c: Curve): string {
  const xStep = PW / (N_SAMPLES - 1);
  const parts: string[] = [];
  for (let i = 0; i < N_SAMPLES; i++) {
    const x = (i / (N_SAMPLES - 1)) * xMax.value;
    const y = c.fn(x);
    if (!Number.isFinite(y)) continue;
    const px = PAD.l + i * xStep;
    const py = yScale.value.toY(y);
    parts.push((parts.length === 0 ? 'M' : 'L') + px.toFixed(1) + ' ' + py.toFixed(1));
  }
  return parts.join(' ');
}

const pathByKey = computed(() => {
  const m: Record<string, string> = {};
  for (const c of curves.value) m[c.key] = pathFor(c);
  return m;
});

const thresholdX = computed(() => PAD.l + (threshold.value / xMax.value) * PW);

const X_TICKS = computed(() => {
  const xm = xMax.value;
  return [0, xm * 0.25, xm * 0.5, xm * 0.75, xm].map((v) => Math.round(v));
});
function xTickPos(n: number): number {
  return PAD.l + (n / xMax.value) * PW;
}
</script>

<template>
  <div class="demo scs">
    <div class="scs-controls">
      <label>
        <span class="demo-label">x range = 0..{{ xMax.toFixed(0) }}</span>
        <input type="range" v-model.number="xMax" min="100" max="100000" step="100" />
      </label>
      <label>
        <span class="demo-label">threshold = {{ threshold.toFixed(0) }}</span>
        <input type="range" v-model.number="threshold" :min="10" :max="xMax" step="1" />
      </label>
      <label>
        <span class="demo-label">root order n = {{ rootN.toFixed(1) }}</span>
        <input type="range" v-model.number="rootN" min="1.5" max="6" step="0.1" />
      </label>
      <label>
        <span class="demo-label">power p = {{ powerP.toFixed(2) }}</span>
        <input type="range" v-model.number="powerP" min="0.1" max="0.95" step="0.01" />
      </label>
      <label>
        <span class="demo-label">log strength k = {{ logK.toFixed(0) }}</span>
        <input type="range" v-model.number="logK" min="1" max="500" step="1" />
      </label>
      <label>
        <span class="demo-label">piecewise post-slope = {{ piecewiseSlope2.toFixed(2) }}</span>
        <input type="range" v-model.number="piecewiseSlope2" min="0" max="1" step="0.01" />
      </label>
      <label class="scs-toggle">
        <input type="checkbox" v-model="logScale" />
        log y-scale
      </label>
    </div>

    <div class="scs-legend">
      <label v-for="c in curves" :key="c.key" class="scs-legend-item">
        <input type="checkbox" :checked="c.visible" @change="
          c.key === 'linear' ? (showLinear = !showLinear) :
          c.key === 'root' ? (showRoot = !showRoot) :
          c.key === 'power' ? (showPower = !showPower) :
          c.key === 'log' ? (showLog = !showLog) :
          (showPiecewise = !showPiecewise)
        " />
        <span class="scs-swatch" :style="{ background: c.color }" />
        <span>{{ c.label }}</span>
      </label>
    </div>

    <svg :viewBox="`0 0 ${W} ${H}`" class="scs-chart" role="img" aria-label="Softcap shape comparison">
      <line :x1="PAD.l" :y1="PAD.t" :x2="PAD.l" :y2="PAD.t + PH" class="scs-axis" />
      <line :x1="PAD.l" :y1="PAD.t + PH" :x2="W - PAD.r" :y2="PAD.t + PH" class="scs-axis" />
      <g>
        <g v-for="t in yScale.ticks" :key="t.label">
          <line :x1="PAD.l" :y1="t.y" :x2="W - PAD.r" :y2="t.y" class="scs-grid" />
          <text :x="PAD.l - 8" :y="t.y + 3" text-anchor="end" class="scs-tick">{{ t.label }}</text>
        </g>
      </g>
      <g>
        <text v-for="nx in X_TICKS" :key="nx" :x="xTickPos(nx)" :y="H - PAD.b + 16" text-anchor="middle" class="scs-tick">{{ nx }}</text>
      </g>
      <text :x="PAD.l + PW / 2" :y="H - 4" text-anchor="middle" class="scs-tick">x (input value)</text>

      <line
        :x1="thresholdX"
        :x2="thresholdX"
        :y1="PAD.t"
        :y2="PAD.t + PH"
        class="scs-threshold"
      />
      <text :x="thresholdX + 4" :y="PAD.t + 12" class="scs-threshold-label">threshold</text>

      <path
        v-for="c in curves"
        v-show="c.visible"
        :key="c.key"
        :d="pathByKey[c.key]"
        class="scs-line"
        :style="{ stroke: c.color }"
      />
    </svg>
  </div>
</template>

<style scoped>
.scs-controls {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--gap);
}
.scs-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.9em;
  color: var(--color-text-muted);
  align-self: end;
}
.scs-toggle input {
  width: auto;
}
.scs-legend {
  display: flex;
  flex-wrap: wrap;
  gap: var(--gap);
  font-size: 0.8em;
  color: var(--color-text-muted);
  margin-block: var(--gap);
  font-family: var(--font-mono);
}
.scs-legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}
.scs-legend-item input {
  width: auto;
  margin: 0;
}
.scs-swatch {
  display: inline-block;
  width: 16px;
  height: 3px;
  border-radius: 2px;
}
.scs-chart {
  width: 100%;
  height: auto;
  display: block;
  font-family: var(--font-mono);
}
.scs-axis {
  stroke: var(--color-border);
  stroke-width: 1;
}
.scs-grid {
  stroke: var(--color-border);
  stroke-width: 0.5;
  stroke-dasharray: 2 3;
  opacity: 0.6;
}
.scs-tick {
  fill: var(--color-text-muted);
  font-size: 11px;
}
.scs-line {
  fill: none;
  stroke-width: 1.75;
  vector-effect: non-scaling-stroke;
}
.scs-threshold {
  stroke: var(--color-text-muted);
  stroke-width: 0.75;
  stroke-dasharray: 4 3;
  opacity: 0.6;
}
.scs-threshold-label {
  fill: var(--color-text-muted);
  font-size: 10px;
  letter-spacing: 0.04em;
}
</style>
