<script setup lang="ts">
import { computed, ref } from 'vue';
import RatePlot from '../RatePlot.vue';
import { seriesColor } from '../../lib/series-colors';

// Same set of modifier values, two compositions.
//
//   Right (split layers, the AD pattern):
//     final = base × (1 + Σ aᵢ) × Π mⱼ
//   Wrong (multipliers degraded to additive bonuses, all stacking together):
//     final = base × (1 + Σ aᵢ + Σ(mⱼ − 1))
//
// Both are linear in additive sources by definition; the divergence is in the
// multiplicative half. With N sources of value m the right form scales as mᴺ,
// the wrong form as 1 + (m−1)·N. Log-y exposes the gap as a straight line vs
// a curve that flattens.

const N = ref(15);
const m = ref(1.5);
const adds = ref(4);

const RIGHT = seriesColor('amber');
const WRONG = seriesColor('mauve');

// Per-upgrade-count series. x = number of multiplicative sources active.
const rightCurve = (n: number): number => (1 + 0.5 * adds.value) * Math.pow(m.value, n);
const wrongCurve = (n: number): number => 1 + 0.5 * adds.value + (m.value - 1) * n;

const series = computed(() => [
  {
    fn: rightCurve,
    label: 'right: (1+Σa)·Πm',
    stroke: RIGHT,
    width: 2,
  },
  {
    fn: wrongCurve,
    label: 'wrong: 1 + Σa + Σ(m−1)',
    stroke: WRONG,
    width: 2,
    dash: [5, 4],
  },
]);

const domain = computed<[number, number]>(() => [1, N.value]);

const finalRight = computed(() => rightCurve(N.value));
const finalWrong = computed(() => wrongCurve(N.value));
const ratio = computed(() => finalRight.value / finalWrong.value);
</script>

<template>
  <div class="demo">
    <div class="demo-controls">
      <label>
        <span class="demo-label">multiplier sources N = {{ N }}</span>
        <input v-model.number="N" type="range" min="1" max="25" step="1" />
      </label>
      <label>
        <span class="demo-label">per-source multiplier m = {{ m.toFixed(2) }}</span>
        <input v-model.number="m" type="range" min="1.10" max="2.50" step="0.05" />
      </label>
      <label>
        <span class="demo-label">additive sources (each +0.5) = {{ adds }}</span>
        <input v-model.number="adds" type="range" min="0" max="10" step="1" />
      </label>
    </div>

    <RatePlot
      :series="series"
      :domain="domain"
      :height="240"
      :deps="[N, m, adds]"
      x-label="multiplier sources active (1..N)"
      y-label="production ×"
      y-scale="log"
    />

    <dl class="readout">
      <div>
        <dt>right at N</dt>
        <dd :style="{ color: RIGHT }">×{{ finalRight.toFixed(1) }}</dd>
      </div>
      <div>
        <dt>wrong at N</dt>
        <dd :style="{ color: WRONG }">×{{ finalWrong.toFixed(1) }}</dd>
      </div>
      <div>
        <dt>gap (right ÷ wrong)</dt>
        <dd class="headline">{{ ratio.toFixed(1) }}×</dd>
      </div>
    </dl>

    <p class="demo-note">
      Same set of modifier values; only the composition rule differs. The right form is exponential
      in <code>N</code> and reads as a straight line on log <code>y</code>. The wrong form — every
      multiplier degraded to a flat additive contribution sharing the additive category — is linear
      in <code>N</code> and curls flat. The gap is the late-game obsolescence problem: at
      <code>N = 15, m = 1.5</code> the correctly-composed pipeline outruns the additive-stack
      version by three orders of magnitude. Each individual <code>×1.5</code> still feels like
      "+50%" when you read the tooltip; the compounding is what the architecture either preserves or
      throws away.
    </p>
  </div>
</template>

<style scoped>
.demo-controls {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--gap);
  margin-bottom: var(--gap);
}
.readout {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: var(--gap);
  margin: var(--gap) 0 0;
  font-family: var(--font-mono);
  font-size: 0.9em;
}
.readout > div {
  display: flex;
  flex-direction: column;
}
.readout dt {
  color: var(--color-text-muted);
  font-size: 0.82em;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.readout dd {
  margin: 0;
  color: var(--color-text);
}
.readout .headline {
  color: var(--color-primary);
  font-weight: 600;
  font-size: 1.1em;
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
