<script setup lang="ts">
import { ref, computed } from 'vue';
import RatePlot from './RatePlot.vue';
import type { Annotation } from './RatePlot.vue';
import { seriesColor } from '../lib/series-colors';

// Design-playbook demo for design-playbook/prestige.mdx.
// Lets the reader drag the polynomial exponent e and watch the resulting
// time-reduction curve slide between linear (e=1) and approaching log (e→0).
// A log10 reference curve is always shown so the reader can see where the
// polynomial family ends and the log family takes over.

const e = ref(0.5);
const logRT = ref(6); // log10(R / T), default 1e6

const POLY = seriesColor('amber');
const LOG = seriesColor('teal');
const TICK = seriesColor('gray');

const polyMultiplier = computed(() => Math.pow(10, e.value * logRT.value));
const logMultiplier = computed(() => Math.max(logRT.value, 1));
const polyReduction = computed(() => 1 - 1 / polyMultiplier.value);
const logReduction = computed(() => 1 - 1 / logMultiplier.value);

const strengthLabel = computed(() => {
  const v = e.value;
  if (v >= 0.95) return { name: 'none — linear', detail: 'no compression; H grows with C' };
  if (v >= 0.6) return { name: 'weak', detail: 'shallow polynomial' };
  if (v >= 0.4) return { name: 'moderate — square root', detail: 'AdVenture Capitalist territory' };
  if (v >= 0.28) return { name: 'moderate — cube root', detail: 'Cookie Clicker territory' };
  if (v >= 0.1) return { name: 'strong', detail: 'aggressive polynomial' };
  return { name: 'very strong — approaching log', detail: 'log family is the limit' };
});

const series = computed(() => [
  {
    fn: (x: number) => 1 - 1 / Math.pow(10, e.value * x),
    label: `polynomial e = ${e.value.toFixed(2)}`,
    stroke: POLY,
    width: 2,
  },
  {
    fn: (x: number) => 1 - 1 / Math.max(x, 1),
    label: 'log10 reference',
    stroke: LOG,
    dash: [4, 3],
    width: 1.5,
  },
]);

const domain: [number, number] = [0, 30];

const annotations = computed<Annotation[]>(() => [
  { type: 'vline', x: logRT.value, label: `R/T = 10^${logRT.value}`, stroke: TICK },
  { type: 'point', x: logRT.value, y: polyReduction.value, fill: POLY, radius: 4 },
  { type: 'point', x: logRT.value, y: logReduction.value, fill: LOG, radius: 4 },
]);

function setExponent(v: number) {
  e.value = v;
}

function fmtMultiplier(v: number): string {
  if (!Number.isFinite(v)) return '∞';
  if (v < 1000) return v.toFixed(2);
  const exp = Math.floor(Math.log10(v));
  const mant = v / Math.pow(10, exp);
  return `${mant.toFixed(2)}e${exp}`;
}
</script>

<template>
  <div class="demo cc">
    <div class="cc-controls">
      <label>
        <span class="demo-label">exponent e = {{ e.toFixed(2) }}</span>
        <input
          v-model.number="e"
          type="range"
          min="0.05"
          max="1.0"
          step="0.01"
        >
        <span class="cc-ticks">
          <button
            type="button"
            class="cc-tick"
            @click="setExponent(0.33)"
          >cube root (0.33)</button>
          <button
            type="button"
            class="cc-tick"
            @click="setExponent(0.5)"
          >sqrt (0.5)</button>
          <button
            type="button"
            class="cc-tick"
            @click="setExponent(1.0)"
          >linear (1.0)</button>
        </span>
      </label>
      <label>
        <span class="demo-label">resource ratio R/T = 10<sup>{{ logRT.toFixed(0) }}</sup></span>
        <input
          v-model.number="logRT"
          type="range"
          min="1"
          max="30"
          step="1"
        >
      </label>
    </div>

    <div class="cc-readout">
      <div class="cc-cell">
        <span class="cc-cell-label">polynomial H</span>
        <code>(R/T)<sup>e</sup> = {{ fmtMultiplier(polyMultiplier) }}</code>
      </div>
      <div class="cc-cell">
        <span class="cc-cell-label">log H (reference)</span>
        <code>log₁₀(R/T) = {{ fmtMultiplier(logMultiplier) }}</code>
      </div>
      <div class="cc-cell">
        <span class="cc-cell-label">time reduction (poly)</span>
        <code>{{ (polyReduction * 100).toFixed(1) }}%</code>
      </div>
      <div class="cc-cell">
        <span class="cc-cell-label">strength</span>
        <code>{{ strengthLabel.name }}</code>
        <span class="cc-cell-detail">{{ strengthLabel.detail }}</span>
      </div>
    </div>

    <RatePlot
      :series="series"
      :domain="domain"
      :height="240"
      :annotations="annotations"
      :deps="[e, logRT]"
      :y-range="[0, 1]"
      :y-tick-format="(v) => `${Math.round(v * 100)}%`"
      x-label="log₁₀(R / T)"
      y-label="time reduction"
    />

    <p class="cc-legend">
      <span class="cc-swatch cc-poly-swatch" /> polynomial (R/T)<sup>e</sup>
      <span class="cc-swatch cc-log-swatch" /> log₁₀(R/T) reference
    </p>
  </div>
</template>

<style scoped>
.cc-controls {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: var(--gap);
}
.cc-ticks {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 4px;
}
.cc-tick {
  font-family: var(--font-mono);
  font-size: 0.75em;
  background: transparent;
  color: var(--color-text-muted);
  border: 1px solid var(--color-border);
  border-radius: 3px;
  padding: 2px 6px;
  cursor: pointer;
}
.cc-tick:hover {
  background: var(--color-surface);
  color: var(--color-text);
}
.cc-readout {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--gap);
  margin: var(--gap) 0;
  font-family: var(--font-mono);
  font-size: 0.85em;
}
.cc-cell {
  display: flex;
  flex-direction: column;
}
.cc-cell-label {
  color: var(--color-text-muted);
  font-size: 0.85em;
}
.cc-cell-detail {
  color: var(--color-text-muted);
  font-size: 0.8em;
  font-style: italic;
}
.cc-legend {
  font-family: var(--font-mono);
  font-size: 0.8em;
  color: var(--color-text-muted);
  display: flex;
  gap: var(--gap);
  margin-top: calc(var(--gap) / 2);
}
.cc-swatch {
  display: inline-block;
  width: 16px;
  height: 3px;
  border-radius: 2px;
  margin-right: 4px;
  vertical-align: middle;
}
.cc-poly-swatch {
  background: var(--series-amber);
}
.cc-log-swatch {
  background: var(--series-teal);
}
</style>
