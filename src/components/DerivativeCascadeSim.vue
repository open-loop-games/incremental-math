<script setup lang="ts">
import { ref, computed, onUnmounted, watch } from 'vue';
import { Decimal, format } from '../lib/decimal';

// Defaults transcribed from sheet 2a (Idle Game Models GDC Talk).
// tiers[0] is the currency generator (Tier 1); higher tiers produce the tier below.
const SHEET_RATES_DEFAULT: ReadonlyArray<number> = [0.1, 10, 3, 1];
const SHEET_BASE_INCOME = 5;

const depth = ref(5);
const topSeedExp = ref(0);
const topSeed = computed(() => Math.pow(10, topSeedExp.value));
const rateScaleExp = ref(0);
const rateScale = computed(() => Math.pow(10, rateScaleExp.value));
const baseIncome = ref(SHEET_BASE_INCOME);
const logScale = ref(true);

const T_MAX = 200;

interface Sample {
  t: number;
  tiers: Decimal[];
  income: Decimal;
  totalCurrency: Decimal;
}

const samples = computed<Sample[]>(() => {
  const d = depth.value;
  const tiers: Decimal[] = new Array(d).fill(0).map(() => new Decimal(0));
  if (d > 0) tiers[d - 1] = new Decimal(topSeed.value);
  const out: Sample[] = [];
  let totalCurrency = new Decimal(0);
  out.push({
    t: 0,
    tiers: tiers.slice(),
    income: tiers[0].mul(baseIncome.value),
    totalCurrency,
  });
  for (let step = 1; step <= T_MAX; step++) {
    const next = tiers.slice();
    for (let i = 0; i < d - 1; i++) {
      const rate =
        (SHEET_RATES_DEFAULT[i] ?? SHEET_RATES_DEFAULT[SHEET_RATES_DEFAULT.length - 1]) *
        rateScale.value;
      next[i] = tiers[i].add(tiers[i + 1].mul(rate));
    }
    for (let i = 0; i < d; i++) tiers[i] = next[i];
    const income = tiers[0].mul(baseIncome.value);
    totalCurrency = totalCurrency.add(income);
    out.push({ t: step, tiers: tiers.slice(), income, totalCurrency });
  }
  return out;
});

const now = ref(T_MAX);
const playing = ref(false);
let timer: ReturnType<typeof setInterval> | null = null;
function play() {
  if (playing.value) return;
  playing.value = true;
  if (now.value >= T_MAX) now.value = 0;
  timer = setInterval(() => {
    if (now.value >= T_MAX) {
      pause();
      return;
    }
    now.value++;
  }, 40);
}
function pause() {
  playing.value = false;
  if (timer != null) {
    clearInterval(timer);
    timer = null;
  }
}
function rewind() {
  pause();
  now.value = 0;
}
onUnmounted(pause);
watch([depth, topSeedExp, rateScaleExp, baseIncome], () => {
  pause();
  now.value = T_MAX;
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
    const v = s.totalCurrency.toNumber();
    if (!Number.isFinite(v)) continue;
    if (v > 0 && v < min) min = v;
    if (v > max) max = v;
  }
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= 0) {
    return { toY: () => PAD.t + PH / 2, ticks: [] };
  }
  if (log) {
    if (min <= 0 || !Number.isFinite(min)) min = Math.max(1, max * 1e-9);
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
      ticks.push({
        label: `10^${p}`,
        y: PAD.t + (1 - (p - lmin) / span) * PH,
      });
    }
    return { toY, ticks };
  }
  const span = max;
  const toY = (v: Decimal): number => PAD.t + (1 - v.toNumber() / span) * PH;
  const ticks: Tick[] = [
    { label: format(max), y: PAD.t },
    { label: format(span * 0.5), y: PAD.t + PH * 0.5 },
    { label: '0', y: PAD.t + PH },
  ];
  return { toY, ticks };
}

const yScale = computed(() => buildScale(samples.value, logScale.value));

function buildPath(rows: Sample[], y: YScale): string {
  const xStep = PW / T_MAX;
  const parts: string[] = [];
  for (let i = 0; i < rows.length; i++) {
    const x = PAD.l + i * xStep;
    const yy = y.toY(rows[i].totalCurrency);
    parts.push((i === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + yy.toFixed(1));
  }
  return parts.join(' ');
}

const fullPath = computed(() => buildPath(samples.value, yScale.value));

const X_TICKS = [0, 50, 100, 150, 200];
function xTickPos(t: number): number {
  return PAD.l + (t / T_MAX) * PW;
}

const nowSample = computed(() => samples.value[Math.min(now.value, T_MAX)]);
const nowX = computed(() => PAD.l + (now.value / T_MAX) * PW);
const nowY = computed(() => yScale.value.toY(nowSample.value.totalCurrency));

const tierLabels = computed(() => {
  const d = depth.value;
  const labels: string[] = [];
  for (let i = 0; i < d; i++) {
    labels.push(`Tier ${i + 1}`);
  }
  return labels;
});
</script>

<template>
  <div class="demo dcs">
    <div class="dcs-controls">
      <label>
        <span class="demo-label">depth = {{ depth }} tier{{ depth === 1 ? '' : 's' }}</span>
        <input v-model.number="depth" type="range" min="1" max="5" step="1" />
      </label>
      <label>
        <span class="demo-label">top-tier seed = {{ format(topSeed) }}</span>
        <input v-model.number="topSeedExp" type="range" min="-2" max="6" step="0.05" />
      </label>
      <label>
        <span class="demo-label">rate scale = ×{{ rateScale.toFixed(rateScale < 1 ? 3 : 2) }}</span>
        <input v-model.number="rateScaleExp" type="range" min="-2" max="2" step="0.02" />
      </label>
      <label>
        <span class="demo-label">base production = {{ baseIncome.toFixed(2) }} / sec</span>
        <input v-model.number="baseIncome" type="range" min="0.5" max="50" step="0.5" />
      </label>
      <label class="dcs-toggle">
        <input v-model="logScale" type="checkbox" />
        log scale
      </label>
    </div>

    <div class="dcs-playback">
      <button type="button" class="dcs-btn" @click="rewind">⟲ rewind</button>
      <button type="button" class="dcs-btn dcs-btn-primary" @click="playing ? pause() : play()">
        {{ playing ? '⏸ pause' : '▶ play' }}
      </button>
      <input
        v-model.number="now"
        type="range"
        class="dcs-scrub"
        min="0"
        :max="T_MAX"
        step="1"
        @input="pause"
      />
      <span class="dcs-clock">t = {{ now }}</span>
    </div>

    <svg :viewBox="`0 0 ${W} ${H}`" class="dcs-chart" role="img" aria-label="Currency over time">
      <line :x1="PAD.l" :y1="PAD.t" :x2="PAD.l" :y2="PAD.t + PH" class="dcs-axis" />
      <line :x1="PAD.l" :y1="PAD.t + PH" :x2="W - PAD.r" :y2="PAD.t + PH" class="dcs-axis" />
      <g>
        <g v-for="t in yScale.ticks" :key="t.label">
          <line :x1="PAD.l" :y1="t.y" :x2="W - PAD.r" :y2="t.y" class="dcs-grid" />
          <text :x="PAD.l - 8" :y="t.y + 3" text-anchor="end" class="dcs-tick">{{ t.label }}</text>
        </g>
      </g>
      <g>
        <text
          v-for="tx in X_TICKS"
          :key="tx"
          :x="xTickPos(tx)"
          :y="H - PAD.b + 16"
          text-anchor="middle"
          class="dcs-tick"
        >
          {{ tx }}
        </text>
      </g>
      <text :x="PAD.l + PW / 2" :y="H - 4" text-anchor="middle" class="dcs-tick">t (seconds)</text>

      <path :d="fullPath" class="dcs-line" />
      <line :x1="nowX" :y1="PAD.t" :x2="nowX" :y2="PAD.t + PH" class="dcs-now-line" />
      <circle :cx="nowX" :cy="nowY" r="4" class="dcs-now-dot" />
    </svg>

    <div class="dcs-readout">
      <div class="dcs-readout-row">
        <span class="dcs-readout-label">currency at t = {{ nowSample.t }}</span>
        <span class="dcs-readout-val">{{ format(nowSample.totalCurrency) }}</span>
      </div>
      <div class="dcs-readout-row">
        <span class="dcs-readout-label">production / sec</span>
        <span class="dcs-readout-val">{{ format(nowSample.income) }}</span>
      </div>
      <div class="dcs-tier-grid">
        <div v-for="(label, i) in tierLabels" :key="i" class="dcs-tier-cell">
          <span class="dcs-tier-name">{{ label }}</span>
          <span class="dcs-tier-val">{{ format(nowSample.tiers[i]) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dcs-controls {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--gap);
  margin-bottom: var(--gap);
}

.dcs-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.9em;
  color: var(--color-text-muted);
  align-self: end;
}

.dcs-toggle input {
  width: auto;
}

.dcs-playback {
  display: flex;
  align-items: center;
  gap: var(--gap-sm);
  margin-bottom: var(--gap-sm);
  font-family: var(--font-mono);
  font-size: 0.88em;
}

.dcs-btn {
  font-family: var(--font-mono);
  font-size: 0.85em;
  padding: 4px 10px;
  background: var(--color-surface);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  cursor: pointer;
}

.dcs-btn:hover {
  border-color: var(--color-primary);
}

.dcs-btn-primary {
  background: var(--color-primary);
  color: var(--color-bg);
  border-color: var(--color-primary);
}

.dcs-scrub {
  flex: 1;
  min-width: 100px;
}

.dcs-clock {
  color: var(--color-text-muted);
  min-width: 5em;
  text-align: right;
}

.dcs-chart {
  width: 100%;
  height: auto;
  display: block;
  font-family: var(--font-mono);
}

.dcs-axis {
  stroke: var(--color-border);
  stroke-width: 1;
}

.dcs-grid {
  stroke: var(--color-border);
  stroke-width: 0.5;
  stroke-dasharray: 2 3;
  opacity: 0.6;
}

.dcs-tick {
  fill: var(--color-text-muted);
  font-size: 11px;
}

.dcs-line {
  fill: none;
  stroke: var(--color-primary);
  stroke-width: 1.75;
  vector-effect: non-scaling-stroke;
}

.dcs-now-line {
  stroke: var(--color-text-muted);
  stroke-width: 1;
  stroke-dasharray: 3 3;
  opacity: 0.5;
}

.dcs-now-dot {
  fill: var(--color-primary);
  stroke: var(--color-bg);
  stroke-width: 2;
}

.dcs-readout {
  margin-top: var(--gap);
  font-family: var(--font-mono);
  font-size: 0.88em;
}

.dcs-readout-row {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  border-bottom: 1px solid var(--color-border);
}

.dcs-readout-label {
  color: var(--color-text-muted);
}

.dcs-readout-val {
  color: var(--color-text);
  font-weight: 600;
}

.dcs-tier-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
  gap: 6px;
  margin-top: var(--gap-sm);
}

.dcs-tier-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px 8px;
  background: var(--color-surface);
  border-left: 2px solid var(--color-primary);
}

.dcs-tier-name {
  color: var(--color-text-muted);
  font-size: 0.78em;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.dcs-tier-val {
  color: var(--color-text);
  font-weight: 600;
}
</style>
