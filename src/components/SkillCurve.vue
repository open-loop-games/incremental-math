<script setup lang="ts">
import { ref, computed } from 'vue';
import RatePlot from './RatePlot.vue';
import type { Annotation } from './RatePlot.vue';
import { seriesColor } from '../lib/series-colors';

// XP → level → mechanical effect, rendered as a floored staircase against the
// continuous curve it discretizes. Two leveling families:
//  - polynomial: L(X) = floor(a · X^p)   (p = 0.5 → quadratic XP spacing)
//  - exponential: L(X) = floor(log_b(X/a + 1))
// The mechanical output is μ(L) = 1 + c·L; plotting it stepped vs smooth shows
// the quasi-continuous gap a floor introduces. JS Number — bounded teaching domain.

const mode = ref<'polynomial' | 'exponential'>('polynomial');
const a = ref(0.05); // scale constant
const p = ref(0.5); // polynomial exponent
const b = ref(2); // exponential base
const c = ref(0.1); // per-level mechanical effect
const xMax = ref(2000);

function rawLevel(x: number): number {
  if (x <= 0) return 0;
  if (mode.value === 'polynomial') return a.value * Math.pow(x, p.value);
  return Math.log(x * a.value + 1) / Math.log(b.value);
}

// X at which level k begins — inverse of rawLevel, used to mark the steps.
function levelUpAt(k: number): number {
  if (mode.value === 'polynomial') return Math.pow(k / a.value, 1 / p.value);
  return (Math.pow(b.value, k) - 1) / a.value;
}

const series = computed(() => [
  {
    fn: (x: number) => 1 + c.value * Math.floor(rawLevel(x)),
    label: 'effect μ(L) — delivered (stepped)',
    stroke: seriesColor('amber'),
  },
  {
    fn: (x: number) => 1 + c.value * rawLevel(x),
    label: 'effect μ(L) — continuous curve',
    stroke: seriesColor('teal'),
    dash: [5, 4],
  },
]);

const domain = computed<[number, number]>(() => [0, xMax.value]);

const annotations = computed<Annotation[]>(() => {
  const out: Annotation[] = [];
  const top = Math.floor(rawLevel(xMax.value));
  // Mark the first handful of level-up thresholds; geometric/quadratic spacing
  // is the visible payoff (steps bunch up early, stretch out late).
  for (let k = 1; k <= Math.min(top, 8); k++) {
    const x = levelUpAt(k);
    if (x > 0 && x < xMax.value) out.push({ type: 'vline', x, label: `L${k}` });
  }
  return out;
});
</script>

<template>
  <div class="demo skc">
    <div class="skc-controls">
      <label class="skc-mode">
        <span class="demo-label">leveling curve</span>
        <select v-model="mode">
          <option value="polynomial">polynomial · L = ⌊a·X^p⌋</option>
          <option value="exponential">exponential · L = ⌊log_b(a·X + 1)⌋</option>
        </select>
      </label>
      <label>
        <span class="demo-label">scale a = {{ a.toFixed(3) }}</span>
        <input
          v-model.number="a"
          type="range"
          min="0.005"
          max="0.5"
          step="0.005"
        >
      </label>
      <label v-if="mode === 'polynomial'">
        <span class="demo-label">exponent p = {{ p.toFixed(2) }}</span>
        <input
          v-model.number="p"
          type="range"
          min="0.3"
          max="1"
          step="0.01"
        >
      </label>
      <label v-else>
        <span class="demo-label">base b = {{ b.toFixed(1) }}</span>
        <input
          v-model.number="b"
          type="range"
          min="1.2"
          max="4"
          step="0.1"
        >
      </label>
      <label>
        <span class="demo-label">per-level effect c = {{ c.toFixed(2) }}</span>
        <input
          v-model.number="c"
          type="range"
          min="0.01"
          max="0.5"
          step="0.01"
        >
      </label>
      <label>
        <span class="demo-label">XP range = 0..{{ xMax.toFixed(0) }}</span>
        <input
          v-model.number="xMax"
          type="range"
          min="200"
          max="20000"
          step="100"
        >
      </label>
    </div>

    <p class="skc-readout">
      The level is a floored function of accumulated XP, so a continuous effect arrives as a
      staircase. With <code>p = 0.5</code> the level is the square root of XP — equivalently, the XP
      for level <em>L</em> is quadratic — so the step widths grow as the player climbs.
    </p>

    <RatePlot
      :series="series"
      :domain="domain"
      :height="340"
      :annotations="annotations"
      :deps="[mode, a, p, b, c]"
      x-label="X (accumulated XP)"
      y-label="μ (effect)"
    />
  </div>
</template>

<style scoped>
.skc-controls {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--gap);
  align-items: end;
}
.skc-mode select {
  width: 100%;
}
.skc-readout {
  font-size: 0.9em;
  color: var(--color-text-muted);
  margin-block: var(--gap);
}
</style>
