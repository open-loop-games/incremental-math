<script setup lang="ts">
import { ref, computed } from 'vue';
import RatePlot from './RatePlot.vue';
import { seriesColor, SERIES_ORDER } from '../lib/series-colors';

const tMax = ref(40);
const expGrowth = ref(1.07);
const expBase = ref(1);
const logScale = ref(true);
const showExp = ref(true);

const DEPTHS = [1, 2, 3, 4, 5] as const;
type Depth = (typeof DEPTHS)[number];
const visibleDepths = ref<Record<Depth, boolean>>({ 1: true, 2: true, 3: true, 4: true, 5: true });

const COLORS: Record<Depth, string> = Object.fromEntries(
  DEPTHS.map((d, i) => [d, seriesColor(SERIES_ORDER[i])]),
) as Record<Depth, string>;
const FACTORIALS: Record<Depth, number> = { 1: 1, 2: 2, 3: 6, 4: 24, 5: 120 };
const EXP_COLOR = seriesColor('gray');

function polyFn(d: Depth): (t: number) => number {
  const fact = FACTORIALS[d];
  return (t) => Math.pow(t, d) / fact;
}

const series = computed(() => {
  const out: { fn: (t: number) => number; label: string; stroke: string; dash?: number[] }[] = [];
  for (const d of DEPTHS) {
    if (!visibleDepths.value[d]) continue;
    out.push({ fn: polyFn(d), label: `depth ${d}`, stroke: COLORS[d] });
  }
  if (showExp.value) {
    const base = expBase.value;
    const r = expGrowth.value;
    out.push({
      fn: (t) => base * Math.pow(r, t),
      label: `${expBase.value} × ${expGrowth.value.toFixed(3)}^t`,
      stroke: EXP_COLOR,
      dash: [5, 3],
    });
  }
  return out;
});

const domain = computed<[number, number]>(() => [0, tMax.value]);
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

    <RatePlot
      :series="series"
      :domain="domain"
      :height="360"
      :y-scale="logScale ? 'log' : 'linear'"
      :deps="[expGrowth, expBase]"
      x-label="t (seconds)"
      y-label="value"
    />
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
</style>
