<script setup lang="ts">
import { ref, computed } from 'vue';
import RatePlot from './RatePlot.vue';
import type { Annotation } from './RatePlot.vue';
import { seriesColor } from '../lib/series-colors';

// Inverts the doubling-time framing: given (target beat time, base beat time,
// target level), back out the cost multiplier that lands the curve there.
// m = (T_target / T_base)^(1/(n-1))

const targetBeat = ref(60); // seconds
const baseBeat = ref(10); // seconds
const targetLevel = ref(10);

const CURVE = seriesColor('amber');
const TARGET = seriesColor('mauve');

const m = computed(() => {
  const ratio = targetBeat.value / baseBeat.value;
  if (targetLevel.value <= 1 || ratio <= 0) return NaN;
  return Math.pow(ratio, 1 / (targetLevel.value - 1));
});

const doublingTime = computed(() => {
  if (!Number.isFinite(m.value) || m.value <= 1) return Infinity;
  return Math.log(2) / Math.log(m.value);
});

// T(n) = baseBeat × m^(n-1)
const series = computed(() => [
  {
    fn: (x: number) => baseBeat.value * Math.pow(m.value, x - 1),
    label: `T(n) at m = ${m.value.toFixed(3)}`,
    stroke: CURVE,
    width: 2,
  },
]);

const domain = computed<[number, number]>(() => [1, Math.max(targetLevel.value + 5, 15)]);

const annotations = computed<Annotation[]>(() => [
  { type: 'hline', y: targetBeat.value, label: `target = ${targetBeat.value}s`, stroke: TARGET },
  {
    type: 'point',
    x: targetLevel.value,
    y: targetBeat.value,
    fill: TARGET,
    radius: 4,
  },
]);

const channelLabel = computed(() => {
  const t = targetBeat.value;
  if (t < 30) return 'arousal (under 30s)';
  if (t < 120) return 'flow (30s – 2 min)';
  if (t < 300) return 'flow upper (2 – 5 min)';
  if (t < 900) return 'boredom (5 – 15 min)';
  if (t < 3600) return 'frustration (15 – 60 min)';
  return 'breakdown (over 1 hour)';
});
</script>

<template>
  <div class="demo btw">
    <div class="btw-controls">
      <label>
        <span class="demo-label">target beat time = {{ targetBeat }}s</span>
        <input
          v-model.number="targetBeat"
          type="range"
          min="5"
          max="600"
          step="1"
        >
      </label>
      <label>
        <span class="demo-label">base beat time T(1) = {{ baseBeat }}s</span>
        <input
          v-model.number="baseBeat"
          type="range"
          min="1"
          max="60"
          step="1"
        >
      </label>
      <label>
        <span class="demo-label">target level n = {{ targetLevel }}</span>
        <input
          v-model.number="targetLevel"
          type="range"
          min="3"
          max="50"
          step="1"
        >
      </label>
    </div>

    <p class="btw-formula">
      <code>m = (T_target / T_base)^(1 / (n − 1)) = ({{ targetBeat }} / {{ baseBeat }})<sup>1/{{ targetLevel - 1 }}</sup></code>
    </p>

    <div class="btw-readout">
      <div class="btw-cell btw-headline">
        <span class="btw-cell-label">cost multiplier</span>
        <code>m = {{ Number.isFinite(m) ? m.toFixed(3) : '—' }}</code>
      </div>
      <div class="btw-cell">
        <span class="btw-cell-label">doubling time</span>
        <code>{{
          Number.isFinite(doublingTime) ? `${doublingTime.toFixed(1)} purchases` : '—'
        }}</code>
      </div>
      <div class="btw-cell">
        <span class="btw-cell-label">channel at target</span>
        <code>{{ channelLabel }}</code>
      </div>
    </div>

    <RatePlot
      :series="series"
      :domain="domain"
      :height="220"
      :annotations="annotations"
      :deps="[m, baseBeat, targetBeat, targetLevel]"
      x-label="purchase n"
      y-label="seconds"
      y-scale="log"
    />
  </div>
</template>

<style scoped>
.btw-controls {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--gap);
}
.btw-formula {
  font-family: var(--font-mono);
  font-size: 0.85em;
  color: var(--color-text-muted);
  margin: var(--gap) 0 calc(var(--gap) / 2);
}
.btw-readout {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--gap);
  margin: var(--gap) 0;
  font-family: var(--font-mono);
  font-size: 0.9em;
}
.btw-cell {
  display: flex;
  flex-direction: column;
}
.btw-cell-label {
  color: var(--color-text-muted);
  font-size: 0.85em;
}
.btw-headline code {
  font-size: 1.1em;
  color: var(--color-primary);
}
</style>
