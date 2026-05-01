<script setup lang="ts">
import { ref, computed } from 'vue';
import RatePlot from './RatePlot.vue';
import type { Annotation } from './RatePlot.vue';
import { seriesColor } from '../lib/series-colors';

const xMax = ref(1000);
const threshold = ref(100);
const rootN = ref(2);

const SOFT = seriesColor('amber');
const LINEAR = seriesColor('gray');

function softcap(x: number): number {
  if (x <= threshold.value) return x;
  return threshold.value + Math.pow(x - threshold.value, 1 / rootN.value);
}

const series = computed(() => [
  { fn: (x: number) => x, label: 'uncapped y = x', stroke: LINEAR, dash: [4, 3], width: 1.5 },
  { fn: softcap, label: 'root softcap', stroke: SOFT },
]);

const domain = computed<[number, number]>(() => [0, xMax.value]);

const annotations = computed<Annotation[]>(() => [
  { type: 'vline', x: threshold.value, label: 'threshold' },
]);
</script>

<template>
  <div class="demo sqd">
    <div class="sqd-controls">
      <label>
        <span class="demo-label">x range = 0..{{ xMax.toFixed(0) }}</span>
        <input v-model.number="xMax" type="range" min="100" max="100000" step="100" />
      </label>
      <label>
        <span class="demo-label">threshold = {{ threshold.toFixed(0) }}</span>
        <input v-model.number="threshold" type="range" :min="10" :max="xMax" step="1" />
      </label>
      <label>
        <span class="demo-label">root order n = {{ rootN.toFixed(1) }}</span>
        <input v-model.number="rootN" type="range" min="1.5" max="6" step="0.1" />
      </label>
    </div>
    <p class="sqd-formula">
      <code>y = threshold + (x − threshold)^(1/{{ rootN.toFixed(1) }})</code>
      <span class="sqd-aside">past threshold; below it, <code>y = x</code></span>
    </p>
    <RatePlot
      :series="series"
      :domain="domain"
      :height="280"
      :annotations="annotations"
      :deps="[threshold, rootN]"
      x-label="x"
      y-label="y"
    />
    <p class="sqd-legend">
      <span class="sqd-swatch sqd-soft-swatch" /> root softcap
      <span class="sqd-swatch sqd-linear-swatch" /> uncapped <code>y = x</code> reference
    </p>
  </div>
</template>

<style scoped>
.sqd-controls {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--gap);
}
.sqd-formula {
  font-family: var(--font-mono);
  font-size: 0.9em;
  color: var(--color-text-muted);
  margin: var(--gap) 0 calc(var(--gap) / 2);
}
.sqd-aside {
  margin-left: 0.6em;
  font-style: italic;
}
.sqd-legend {
  font-family: var(--font-mono);
  font-size: 0.8em;
  color: var(--color-text-muted);
  display: flex;
  gap: var(--gap);
  margin-top: calc(var(--gap) / 2);
}
.sqd-swatch {
  display: inline-block;
  width: 16px;
  height: 3px;
  border-radius: 2px;
  margin-right: 4px;
  vertical-align: middle;
}
.sqd-soft-swatch {
  background: var(--series-amber);
}
.sqd-linear-swatch {
  background: var(--series-gray);
}
</style>
