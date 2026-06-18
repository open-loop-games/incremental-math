<script setup lang="ts">
import { ref, computed } from 'vue';
import RatePlot from './RatePlot.vue';
import type { Annotation } from './RatePlot.vue';
import { seriesColor } from '../lib/series-colors';

// Two views of achievement math, switched by `mode`:
//  - cadence: a stat S(t) = e^{rt} crossing geometrically-spaced thresholds
//    Tᵢ = ρ^i lands milestones at a constant real-time interval Δt = ln(ρ)/r.
//  - reward: the global multiplier as a function of achievement count, for the
//    additive (1 + cN) vs product ((1+c)^N) coupling.
// JS Number throughout — the lesson is the spacing/shape, not big-number range.

const mode = ref<'cadence' | 'reward'>('cadence');
const r = ref(0.5); // exponential growth rate of the watched stat
const ratio = ref(10); // threshold spacing ρ: each milestone is ρ× the last
const count = ref(8); // number of milestones / achievements
const c = ref(0.15); // reward strength per achievement
const logScale = ref(true);

const lnRatio = computed(() => Math.log(ratio.value));
const dt = computed(() => lnRatio.value / r.value); // Δt = ln(ρ)/r

const domain = computed<[number, number]>(() =>
  mode.value === 'cadence' ? [0, dt.value * (count.value + 0.5)] : [0, count.value],
);

const series = computed(() => {
  if (mode.value === 'cadence') {
    return [
      {
        fn: (t: number) => Math.exp(r.value * t),
        label: 'stat S(t) = e^{rt}',
        stroke: seriesColor('amber'),
      },
    ];
  }
  return [
    {
      fn: (n: number) => 1 + c.value * n,
      label: 'additive · μ = 1 + cN',
      stroke: seriesColor('teal'),
    },
    {
      fn: (n: number) => Math.pow(1 + c.value, n),
      label: 'product · μ = (1+c)^N',
      stroke: seriesColor('mauve'),
    },
  ];
});

const annotations = computed<Annotation[]>(() => {
  if (mode.value !== 'cadence') return [];
  // A vline at each milestone hit-time tᵢ = i·Δt — evenly spaced by construction.
  const out: Annotation[] = [];
  for (let i = 1; i <= count.value; i++) {
    const ti = i * dt.value;
    out.push({ type: 'vline', x: ti, label: i === 1 || i === count.value ? `T${i}` : undefined });
  }
  return out;
});

const xLabel = computed(() =>
  mode.value === 'cadence' ? 't (real time)' : 'N (achievements unlocked)',
);
const yLabel = computed(() => (mode.value === 'cadence' ? 'stat value' : 'multiplier'));
</script>

<template>
  <div class="demo ach">
    <div class="ach-controls">
      <label class="ach-mode">
        <span class="demo-label">view</span>
        <select v-model="mode">
          <option value="cadence">cadence — milestones in real time</option>
          <option value="reward">reward — multiplier vs count</option>
        </select>
      </label>

      <template v-if="mode === 'cadence'">
        <label>
          <span class="demo-label">growth rate r = {{ r.toFixed(2) }}</span>
          <input
            v-model.number="r"
            type="range"
            min="0.1"
            max="2"
            step="0.05"
          >
        </label>
        <label>
          <span class="demo-label">threshold spacing ρ = {{ ratio.toFixed(0) }}×</span>
          <input
            v-model.number="ratio"
            type="range"
            min="2"
            max="100"
            step="1"
          >
        </label>
        <label>
          <span class="demo-label">milestones = {{ count }}</span>
          <input
            v-model.number="count"
            type="range"
            min="2"
            max="20"
            step="1"
          >
        </label>
      </template>

      <template v-else>
        <label>
          <span class="demo-label">reward strength c = {{ c.toFixed(2) }}</span>
          <input
            v-model.number="c"
            type="range"
            min="0.01"
            max="1"
            step="0.01"
          >
        </label>
        <label>
          <span class="demo-label">achievements = {{ count }}</span>
          <input
            v-model.number="count"
            type="range"
            min="2"
            max="20"
            step="1"
          >
        </label>
      </template>

      <label class="ach-toggle">
        <input
          v-model="logScale"
          type="checkbox"
        >
        log y-scale
      </label>
    </div>

    <p
      v-if="mode === 'cadence'"
      class="ach-readout"
    >
      Geometric thresholds under exponential growth fire every
      <strong>Δt = ln(ρ)/r ≈ {{ dt.toFixed(2) }}</strong> — a constant real-time interval,
      regardless of how large the numbers get.
    </p>
    <p
      v-else
      class="ach-readout"
    >
      Additive coupling flattens: the {{ count }}th achievement adds the same
      <strong>c = {{ c.toFixed(2) }}</strong> it always did, a shrinking share of the total. Product
      coupling keeps every unlock proportional.
    </p>

    <RatePlot
      :series="series"
      :domain="domain"
      :height="340"
      :y-scale="logScale ? 'log' : 'linear'"
      :annotations="annotations"
      :deps="[mode, r, ratio, count, c]"
      :x-label="xLabel"
      :y-label="yLabel"
    />
  </div>
</template>

<style scoped>
.ach-controls {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--gap);
  align-items: end;
}
.ach-mode select {
  width: 100%;
}
.ach-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.9em;
  color: var(--color-text-muted);
}
.ach-toggle input {
  width: auto;
}
.ach-readout {
  font-size: 0.9em;
  color: var(--color-text-muted);
  margin-block: var(--gap);
}
</style>
