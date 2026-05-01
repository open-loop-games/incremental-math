<script setup lang="ts">
import { ref, computed } from 'vue';
import RatePlot from './RatePlot.vue';
import type { Annotation } from './RatePlot.vue';
import { seriesColor } from '../lib/series-colors';

const xMax = ref(1000);
const threshold = ref(300);
const slope1 = ref(1);
const slope2 = ref(0.15);

const SOFT = seriesColor('mauve');
const LINEAR = seriesColor('gray');

function softcap(x: number): number {
  if (x <= threshold.value) return slope1.value * x;
  return slope1.value * threshold.value + slope2.value * (x - threshold.value);
}

const series = computed(() => [
  {
    fn: (x: number) => slope1.value * x,
    label: 'pre-threshold slope continued',
    stroke: LINEAR,
    dash: [4, 3],
    width: 1.5,
  },
  { fn: softcap, label: 'piecewise', stroke: SOFT },
]);

const domain = computed<[number, number]>(() => [0, xMax.value]);

const annotations = computed<Annotation[]>(() => [
  { type: 'vline', x: threshold.value, label: 'threshold' },
  {
    type: 'point',
    x: threshold.value,
    y: slope1.value * threshold.value,
    fill: SOFT,
    stroke: 'var(--color-bg, #0a0a0a)',
  },
]);
</script>

<template>
  <div class="demo psd">
    <div class="psd-controls">
      <label>
        <span class="demo-label">x range = 0..{{ xMax.toFixed(0) }}</span>
        <input v-model.number="xMax" type="range" min="100" max="100000" step="100" />
      </label>
      <label>
        <span class="demo-label">threshold = {{ threshold.toFixed(0) }}</span>
        <input v-model.number="threshold" type="range" :min="10" :max="xMax" step="1" />
      </label>
      <label>
        <span class="demo-label">pre-slope m₁ = {{ slope1.toFixed(2) }}</span>
        <input v-model.number="slope1" type="range" min="0.1" max="2" step="0.05" />
      </label>
      <label>
        <span class="demo-label">post-slope m₂ = {{ slope2.toFixed(2) }}</span>
        <input v-model.number="slope2" type="range" min="0" max="1" step="0.01" />
      </label>
    </div>
    <p class="psd-formula">
      <code>y = m₁·x</code> for <code>x ≤ threshold</code>, else
      <code>m₁·threshold + m₂·(x − threshold)</code>
      <span class="psd-aside"
        >continuous at the joint, slope drops from {{ slope1.toFixed(2) }} to
        {{ slope2.toFixed(2) }}</span
      >
    </p>
    <RatePlot
      :series="series"
      :domain="domain"
      :height="280"
      :annotations="annotations"
      :deps="[threshold, slope1, slope2]"
      x-label="x"
      y-label="y"
    />
    <p class="psd-legend">
      <span class="psd-swatch psd-soft-swatch" /> piecewise
      <span class="psd-swatch psd-linear-swatch" /> pre-threshold slope continued
    </p>
  </div>
</template>

<style scoped>
.psd-controls {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--gap);
}
.psd-formula {
  font-family: var(--font-mono);
  font-size: 0.9em;
  color: var(--color-text-muted);
  margin: var(--gap) 0 calc(var(--gap) / 2);
}
.psd-aside {
  margin-left: 0.6em;
  font-style: italic;
}
.psd-legend {
  font-family: var(--font-mono);
  font-size: 0.8em;
  color: var(--color-text-muted);
  display: flex;
  gap: var(--gap);
  margin-top: calc(var(--gap) / 2);
}
.psd-swatch {
  display: inline-block;
  width: 16px;
  height: 3px;
  border-radius: 2px;
  margin-right: 4px;
  vertical-align: middle;
}
.psd-soft-swatch {
  background: var(--series-mauve);
}
.psd-linear-swatch {
  background: var(--series-gray);
}
</style>
