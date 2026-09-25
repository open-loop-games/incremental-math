<script setup lang="ts">
import { ref, computed } from 'vue';
import RatePlot from './RatePlot.vue';
import type { Annotation } from './RatePlot.vue';
import { seriesColor } from '../lib/series-colors';

const xMax = ref(10000);
const threshold = ref(1000);
const logK = ref(40);

const SOFT = seriesColor('teal');
const LINEAR = seriesColor('gray');

function softcap(x: number): number {
  if (x <= threshold.value) return x;
  return threshold.value + logK.value * Math.log10(x - threshold.value + 1);
}

const series = computed(() => [
  { fn: (x: number) => x, label: 'uncapped y = x', stroke: LINEAR, dash: [4, 3], width: 1.5 },
  { fn: softcap, label: 'log softcap', stroke: SOFT },
]);

const domain = computed<[number, number]>(() => [0, xMax.value]);

const annotations = computed<Annotation[]>(() => [
  { type: 'vline', x: threshold.value, label: 'threshold' },
]);
</script>

<template>
  <div class="demo lsd">
    <div class="lsd-controls">
      <label>
        <span class="demo-label">x range = 0..{{ xMax.toFixed(0) }}</span>
        <input v-model.number="xMax" type="range" min="1000" max="1000000" step="1000" />
      </label>
      <label>
        <span class="demo-label">threshold = {{ threshold.toFixed(0) }}</span>
        <input v-model.number="threshold" type="range" :min="100" :max="xMax" step="10" />
      </label>
      <label>
        <span class="demo-label">log strength k = {{ logK.toFixed(0) }}</span>
        <input v-model.number="logK" type="range" min="1" max="500" step="1" />
      </label>
    </div>
    <p class="lsd-formula">
      <code>y = threshold + {{ logK.toFixed(0) }} · log₁₀(x − threshold + 1)</code>
      <span class="lsd-aside">past threshold; below it, <code>y = x</code></span>
    </p>
    <RatePlot
      :series="series"
      :domain="domain"
      :height="280"
      :annotations="annotations"
      :deps="[threshold, logK]"
      x-label="x"
      y-label="y"
    />
    <p class="lsd-legend">
      <span class="lsd-swatch lsd-soft-swatch" /> log softcap
      <span class="lsd-swatch lsd-linear-swatch" /> uncapped <code>y = x</code> reference
    </p>
  </div>
</template>

<style scoped>
.lsd-controls {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--gap);
}
.lsd-formula {
  font-family: var(--font-mono);
  font-size: 0.9em;
  color: var(--color-text-muted);
  margin: var(--gap) 0 calc(var(--gap) / 2);
}
.lsd-aside {
  margin-left: 0.6em;
  font-style: italic;
}
.lsd-legend {
  font-family: var(--font-mono);
  font-size: 0.8em;
  color: var(--color-text-muted);
  display: flex;
  gap: var(--gap);
  margin-top: calc(var(--gap) / 2);
}
.lsd-swatch {
  display: inline-block;
  width: 16px;
  height: 3px;
  border-radius: 2px;
  margin-right: 4px;
  vertical-align: middle;
}
.lsd-soft-swatch {
  background: var(--series-teal);
}
.lsd-linear-swatch {
  background: var(--series-gray);
}
</style>
