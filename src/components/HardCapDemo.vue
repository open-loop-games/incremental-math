<script setup lang="ts">
import { ref, computed } from 'vue';
import { format } from '../lib/decimal';
import RatePlot from './RatePlot.vue';
import type { Annotation } from './RatePlot.vue';
import { seriesColor } from '../lib/series-colors';

// One-curve hard-cap demo: gain accrues at rate × pct up to cap hours,
// then flat. The lesson is the discontinuous slope at the cap.

const hoursMax = ref(48);
const ratePerHour = ref(1000);
const offlineCap = ref(8);
const offlinePct = ref(50);

const SOFT = seriesColor('teal');
const LINEAR = seriesColor('gray');

function capped(t: number): number {
  return ratePerHour.value * (offlinePct.value / 100) * Math.min(t, offlineCap.value);
}

function uncapped(t: number): number {
  return ratePerHour.value * t;
}

const series = computed(() => [
  { fn: uncapped, label: 'uncapped', stroke: LINEAR, dash: [4, 3], width: 1.5 },
  { fn: capped, label: 'hard-capped', stroke: SOFT },
]);

const domain = computed<[number, number]>(() => [0, hoursMax.value]);

const annotations = computed<Annotation[]>(() => {
  if (offlineCap.value >= hoursMax.value) return [];
  return [{ type: 'vline', x: offlineCap.value, label: 'cap' }];
});

const earnedAtCap = computed(() => capped(offlineCap.value));
const earnedFullSpan = computed(() => capped(hoursMax.value));
</script>

<template>
  <div class="demo hcd">
    <div class="hcd-controls">
      <label>
        <span class="demo-label">x range = 0..{{ hoursMax.toFixed(0) }} h away</span>
        <input
          v-model.number="hoursMax"
          type="range"
          min="3"
          max="168"
          step="1"
        >
      </label>
      <label>
        <span class="demo-label">online rate = {{ format(ratePerHour) }} / h</span>
        <input
          v-model.number="ratePerHour"
          type="range"
          min="100"
          max="100000"
          step="100"
        >
      </label>
      <label>
        <span class="demo-label">offline cap = {{ offlineCap.toFixed(1) }} h</span>
        <input
          v-model.number="offlineCap"
          type="range"
          min="0.5"
          max="72"
          step="0.5"
        >
      </label>
      <label>
        <span class="demo-label">offline rate = {{ offlinePct.toFixed(0) }} % of online</span>
        <input
          v-model.number="offlinePct"
          type="range"
          min="5"
          max="100"
          step="1"
        >
      </label>
    </div>
    <p class="hcd-readout">
      At the cap: <strong>{{ format(earnedAtCap) }}</strong>. Across the full {{ hoursMax.toFixed(0) }} h window:
      <strong>{{ format(earnedFullSpan) }}</strong> — same number; the slope dies at the cap.
    </p>
    <RatePlot
      :series="series"
      :domain="domain"
      :height="300"
      :annotations="annotations"
      :deps="[hoursMax, ratePerHour, offlineCap, offlinePct]"
      x-label="hours away"
      y-label="gain"
    />
  </div>
</template>

<style scoped>
.hcd-controls {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--gap);
}
.hcd-readout {
  font-family: var(--font-mono);
  font-size: 0.9em;
  color: var(--color-text-muted);
  margin: var(--gap) 0;
}
</style>
