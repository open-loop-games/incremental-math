<script setup lang="ts">
import { ref, computed } from 'vue';
import RatePlot from './RatePlot.vue';
import type { Annotation } from './RatePlot.vue';

// Four canonical softcap shapes plotted on a shared input axis. Operates on
// JS Number directly — the lesson is the curve shape, not big-number arithmetic.

const xMax = ref(1000);
const threshold = ref(100);
const rootN = ref(2); // root softcap exponent (1/n)
const powerP = ref(0.7); // power softcap exponent (< 1)
const logK = ref(40); // log softcap post-threshold strength
const piecewiseSlope2 = ref(0.1); // piecewise post-threshold slope ratio

const showLinear = ref(true);
const showRoot = ref(true);
const showPower = ref(true);
const showLog = ref(true);
const showPiecewise = ref(true);
const logScale = ref(false);

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

const visibleSeries = computed(() =>
  curves.value.filter((c) => c.visible).map((c) => ({ fn: c.fn, label: c.label, stroke: c.color })),
);

const domain = computed<[number, number]>(() => [0, xMax.value]);

const annotations = computed<Annotation[]>(() => [
  { type: 'vline', x: threshold.value, label: 'threshold' },
]);

function toggle(key: string): void {
  if (key === 'linear') showLinear.value = !showLinear.value;
  else if (key === 'root') showRoot.value = !showRoot.value;
  else if (key === 'power') showPower.value = !showPower.value;
  else if (key === 'log') showLog.value = !showLog.value;
  else if (key === 'piecewise') showPiecewise.value = !showPiecewise.value;
}
</script>

<template>
  <div class="demo scs">
    <div class="scs-controls">
      <label>
        <span class="demo-label">x range = 0..{{ xMax.toFixed(0) }}</span>
        <input
          v-model.number="xMax"
          type="range"
          min="100"
          max="100000"
          step="100"
        >
      </label>
      <label>
        <span class="demo-label">threshold = {{ threshold.toFixed(0) }}</span>
        <input
          v-model.number="threshold"
          type="range"
          :min="10"
          :max="xMax"
          step="1"
        >
      </label>
      <label>
        <span class="demo-label">root order n = {{ rootN.toFixed(1) }}</span>
        <input
          v-model.number="rootN"
          type="range"
          min="1.5"
          max="6"
          step="0.1"
        >
      </label>
      <label>
        <span class="demo-label">power p = {{ powerP.toFixed(2) }}</span>
        <input
          v-model.number="powerP"
          type="range"
          min="0.1"
          max="0.95"
          step="0.01"
        >
      </label>
      <label>
        <span class="demo-label">log strength k = {{ logK.toFixed(0) }}</span>
        <input
          v-model.number="logK"
          type="range"
          min="1"
          max="500"
          step="1"
        >
      </label>
      <label>
        <span class="demo-label">piecewise post-slope = {{ piecewiseSlope2.toFixed(2) }}</span>
        <input
          v-model.number="piecewiseSlope2"
          type="range"
          min="0"
          max="1"
          step="0.01"
        >
      </label>
      <label class="scs-toggle">
        <input
          v-model="logScale"
          type="checkbox"
        >
        log y-scale
      </label>
    </div>

    <div class="scs-legend">
      <label
        v-for="c in curves"
        :key="c.key"
        class="scs-legend-item"
      >
        <input
          type="checkbox"
          :checked="c.visible"
          @change="toggle(c.key)"
        >
        <span
          class="scs-swatch"
          :style="{ background: c.color }"
        />
        <span>{{ c.label }}</span>
      </label>
    </div>

    <RatePlot
      :series="visibleSeries"
      :domain="domain"
      :height="360"
      :y-scale="logScale ? 'log' : 'linear'"
      :annotations="annotations"
      :deps="[threshold, rootN, powerP, logK, piecewiseSlope2]"
      x-label="x (input value)"
      y-label="y"
    />
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
</style>
