<script setup lang="ts">
import { ref, computed } from 'vue';
import RatePlot from '../RatePlot.vue';
import { seriesColor } from '../../lib/series-colors';

const BASE_STROKE = seriesColor('gray');
const MOD_STROKE = seriesColor('amber');

// Modifier-product: r(x) = r_base(x) · μ, with μ constant in x. The cumulative is rescaled
// linearly; the first-passage threshold is rescaled inversely. The base shape is preserved
// — modifiers are coordinate changes on rate, not shape changes.

const a = ref(1);
const m = ref(1.15);
const mod = ref(2);
const xMax = ref(60);
const cMax = ref(2000);

const baseRate = (x: number): number => a.value * Math.pow(m.value, x);
const baseR = (x: number): number => (a.value / Math.log(m.value)) * (Math.pow(m.value, x) - 1);
const baseT = (C: number): number =>
  Math.log(1 + (C * Math.log(m.value)) / a.value) / Math.log(m.value);

const modRate = (x: number): number => mod.value * baseRate(x);
const modR = (x: number): number => mod.value * baseR(x);
const modT = (C: number): number => baseT(C / mod.value);

const xDomain = computed<[number, number]>(() => [0, xMax.value]);
const cDomain = computed<[number, number]>(() => [1, cMax.value]);

const rateSeries = computed(() => [
  { fn: baseRate, label: 'base', stroke: BASE_STROKE, dash: [4, 3], width: 1.25 },
  { fn: modRate, label: 'modified', stroke: MOD_STROKE, width: 1.75 },
]);
const RSeries = computed(() => [
  { fn: baseR, label: 'base', stroke: BASE_STROKE, dash: [4, 3], width: 1.25 },
  { fn: modR, label: 'modified', stroke: MOD_STROKE, width: 1.75 },
]);
const TSeries = computed(() => [
  { fn: baseT, label: 'base', stroke: BASE_STROKE, dash: [4, 3], width: 1.25 },
  { fn: modT, label: 'modified', stroke: MOD_STROKE, width: 1.75 },
]);
</script>

<template>
  <div class="demo">
    <div class="demo-controls">
      <label>
        <span class="demo-label">a (base) = {{ a.toFixed(2) }}</span>
        <input v-model.number="a" type="range" min="0.5" max="3" step="0.05" />
      </label>
      <label>
        <span class="demo-label">m (per purchase) = {{ m.toFixed(3) }}</span>
        <input v-model.number="m" type="range" min="1.05" max="1.4" step="0.005" />
      </label>
      <label>
        <span class="demo-label">μ (modifier) = {{ mod.toFixed(2) }}×</span>
        <input v-model.number="mod" type="range" min="0.25" max="10" step="0.05" />
      </label>
      <label>
        <span class="demo-label">x range = 0..{{ xMax.toFixed(0) }}</span>
        <input v-model.number="xMax" type="range" min="10" max="200" step="2" />
      </label>
      <label>
        <span class="demo-label">C range = 0..{{ cMax.toFixed(0) }}</span>
        <input v-model.number="cMax" type="range" min="50" max="50000" step="50" />
      </label>
    </div>

    <div class="legend">
      <span><span class="swatch swatch-base" /> base</span>
      <span><span class="swatch swatch-mod" /> modified (× μ)</span>
    </div>

    <div class="triptych">
      <div class="triptych-panel">
        <span class="triptych-panel-label">r(x) and μ · r(x)</span>
        <RatePlot
          :series="rateSeries"
          :domain="xDomain"
          y-scale="log"
          :deps="[a, m, mod]"
          x-label="x"
          y-label="r"
        />
      </div>
      <div class="triptych-panel">
        <span class="triptych-panel-label">R(x) and μ · R(x)</span>
        <RatePlot :series="RSeries" :domain="xDomain" :deps="[a, m, mod]" x-label="x" y-label="R" />
      </div>
      <div class="triptych-panel">
        <span class="triptych-panel-label">T(C) — modifier rescales the target</span>
        <RatePlot :series="TSeries" :domain="cDomain" :deps="[a, m, mod]" x-label="C" y-label="T" />
      </div>
    </div>

    <p class="demo-note">
      The modifier <code>μ</code> rescales the rate and the cumulative by the same constant factor —
      both base curves and modified curves are the same shape, vertically scaled. In the
      first-passage panel the modifier's effect inverts: <code>T_mod(C) = T_base(C / μ)</code>,
      which on the plotted axis looks like a horizontal scaling of the base curve. Multiplicative
      modifiers buy you <em>time</em>, not <em>shape</em>.
    </p>
  </div>
</template>

<style scoped>
.demo-controls {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--gap);
}
.legend {
  display: flex;
  gap: var(--gap-lg);
  font-family: var(--font-mono);
  font-size: 0.85em;
  color: var(--color-text-muted);
  margin-top: var(--gap-sm);
}
.swatch {
  display: inline-block;
  width: 18px;
  height: 3px;
  margin-right: 6px;
  vertical-align: middle;
}
.swatch-base {
  background: var(--series-gray);
}
.swatch-mod {
  background: var(--series-amber);
}
.demo-note {
  margin-top: var(--gap);
  font-size: 0.92em;
  color: var(--color-text-muted);
}
.demo-note code {
  background: none;
  padding: 0;
  font-size: 0.95em;
}
</style>
