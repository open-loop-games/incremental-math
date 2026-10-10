<script setup lang="ts">
import { ref, computed } from 'vue';
import RatePlot from './RatePlot.vue';
import type { Annotation } from './RatePlot.vue';
import { seriesColor } from '../lib/series-colors';

// AD-style scaling-past-threshold cost. Math is faithful to
// AntimatterDimensionsSourceCode/src/core/math.js:380-385 — it runs entirely in
// log10 space, which is the substrate trick the big-numbers page covers.
//
// Pure exponential:
//   log10(cost) = n * log10(mult) + log10(base)
//
// AD scaling-past-threshold (excess = n − threshold):
//   log10(cost) = n * log10(mult) + log10(base) + 0.5 * excess * (excess+1) * log10(scale)
//
// Both curves share their first segment; the parabolic term only fires past
// the threshold. We never construct the actual cost as a number — the chart is
// log10 versus purchases, which is the whole point.

const baseCost = ref(10);
const mult = ref(1000);
const costScale = ref(10);
const threshold = ref(40);
const showAccel = ref(true);
const cursorN = ref(60);

const N_MAX = 120;
const FLAT_COLOR = 'var(--color-primary)';
const ACCEL_COLOR = seriesColor('teal');

function logFlat(n: number): number {
  return n * Math.log10(mult.value) + Math.log10(baseCost.value);
}

function logAccelRaw(n: number): number {
  const excess = n - threshold.value;
  if (excess <= 0) return logFlat(n);
  return logFlat(n) + 0.5 * excess * (excess + 1) * Math.log10(costScale.value);
}

const yMaxSnapped = computed(() => {
  let max = 0;
  for (let n = 0; n <= N_MAX; n++) {
    const v = showAccel.value ? Math.max(logFlat(n), logAccelRaw(n)) : logFlat(n);
    if (Number.isFinite(v) && v > max) max = v;
  }
  return Math.max(10, Math.ceil(max / 50) * 50);
});

const yRange = computed<[number, number]>(() => [0, yMaxSnapped.value]);

// Clip values past the snapped y-max to NaN so the parabolic tail doesn't
// distort autoscale or draw across the top of the plot.
function clip(v: number): number {
  return v > yMaxSnapped.value ? NaN : v;
}

const series = computed(() => {
  const out: { fn: (n: number) => number; label: string; stroke: string }[] = [
    { fn: (n) => clip(logFlat(n)), label: 'pure exponential', stroke: 'var(--color-primary)' },
  ];
  if (showAccel.value) {
    out.push({
      fn: (n) => clip(logAccelRaw(n)),
      label: 'scaling past threshold',
      stroke: ACCEL_COLOR,
    });
  }
  return out;
});

const domain: [number, number] = [0, N_MAX];

const cursorSample = computed(() => {
  const i = Math.min(N_MAX, Math.max(0, cursorN.value));
  return { n: i, logFlat: logFlat(i), logAccel: logAccelRaw(i) };
});

const annotations = computed<Annotation[]>(() => {
  const list: Annotation[] = [
    { type: 'vline', x: threshold.value, label: 'threshold' },
    { type: 'vline', x: cursorN.value, dash: [2, 4], width: 0.5 },
    {
      type: 'point',
      x: cursorSample.value.n,
      y: clip(cursorSample.value.logFlat),
      fill: getCssVar('--color-primary', '#d4a574'),
    },
  ];
  if (showAccel.value) {
    list.push({
      type: 'point',
      x: cursorSample.value.n,
      y: clip(cursorSample.value.logAccel),
      fill: ACCEL_COLOR,
    });
  }
  return list;
});

function getCssVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

function fmtLog(logV: number): string {
  if (!Number.isFinite(logV)) return '∞';
  if (logV < 6) return Math.pow(10, logV).toExponential(2);
  const exp = Math.floor(logV);
  const m = Math.pow(10, logV - exp);
  return `${m.toFixed(2)}e${exp}`;
}

function yTickFormat(v: number): string {
  return `1e${v.toFixed(0)}`;
}

// Reference flat color via the same fallback the chart uses.
const flatSwatch = computed(() => `background: ${FLAT_COLOR};`);
const accelSwatch = computed(() => `background: ${ACCEL_COLOR};`);
</script>

<template>
  <div class="demo cac">
    <div class="cac-controls">
      <label>
        <span class="demo-label">base cost = {{ baseCost }}</span>
        <input v-model.number="baseCost" type="range" min="1" max="1000" step="1" />
      </label>
      <label>
        <span class="demo-label">cost ratio = {{ mult }}×</span>
        <input v-model.number="mult" type="range" min="2" max="10000" step="1" />
      </label>
      <label>
        <span class="demo-label">scaling factor = {{ costScale }}×</span>
        <input v-model.number="costScale" type="range" min="1.5" max="100" step="0.5" />
      </label>
      <label>
        <span class="demo-label">threshold (purchases before scaling) = {{ threshold }}</span>
        <input v-model.number="threshold" type="range" min="0" :max="N_MAX" step="1" />
      </label>
      <label>
        <span class="demo-label">cursor at n = {{ cursorN }}</span>
        <input v-model.number="cursorN" type="range" min="0" :max="N_MAX" step="1" />
      </label>
      <label class="cac-toggle">
        <input v-model="showAccel" type="checkbox" />
        show scaling curve
      </label>
    </div>

    <div class="cac-legend">
      <span class="cac-legend-item"
        ><span class="cac-swatch" :style="flatSwatch" /> pure exponential (Pecorella)</span
      >
      <span v-if="showAccel" class="cac-legend-item"
        ><span class="cac-swatch" :style="accelSwatch" /> scaling past threshold (AD)</span
      >
      <span class="cac-legend-item cac-legend-threshold"
        ><span class="cac-swatch cac-swatch-threshold" /> threshold</span
      >
    </div>

    <RatePlot
      :series="series"
      :domain="domain"
      :height="360"
      :annotations="annotations"
      :y-range="yRange"
      :y-tick-format="yTickFormat"
      :deps="[baseCost, mult, costScale, threshold, cursorN, showAccel]"
      x-label="purchases (n)"
      y-label="cost"
    />

    <div class="cac-readout">
      <div>
        <span class="cac-readout-label">at n = {{ cursorN }}, pure exponential cost:</span>
        <code>{{ fmtLog(cursorSample.logFlat) }}</code>
      </div>
      <div v-if="showAccel">
        <span class="cac-readout-label">at n = {{ cursorN }}, with scaling:</span>
        <code>{{ fmtLog(cursorSample.logAccel) }}</code>
        <span v-if="cursorN > threshold" class="cac-readout-ratio">
          ({{ fmtLog(cursorSample.logAccel - cursorSample.logFlat) }}× more)
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cac-controls {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--gap);
}
.cac-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.9em;
  color: var(--color-text-muted);
  align-self: end;
}
.cac-toggle input {
  width: auto;
}
.cac-legend {
  display: flex;
  flex-wrap: wrap;
  gap: var(--gap-lg);
  font-size: 0.85em;
  color: var(--color-text-muted);
  margin-block: var(--gap);
}
.cac-legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.cac-swatch {
  display: inline-block;
  width: 16px;
  height: 3px;
  border-radius: 2px;
}
.cac-swatch-threshold {
  height: 14px;
  width: 1px;
  border-left: 1px dashed var(--color-text-muted);
  background: transparent;
  border-radius: 0;
}
.cac-readout {
  margin-top: var(--gap);
  font-family: var(--font-mono);
  font-size: 0.85em;
  display: grid;
  gap: 4px;
}
.cac-readout-label {
  color: var(--color-text-muted);
  margin-right: 0.5em;
}
.cac-readout-ratio {
  color: var(--color-text-muted);
  margin-left: 0.5em;
}
</style>
