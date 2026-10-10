<script setup lang="ts">
import { ref, computed } from 'vue';
import RatePlot from '../../RatePlot.vue';
import type { Annotation } from '../../RatePlot.vue';
import { seriesColor } from '../../../lib/series-colors';

// Stylised prestige cycle:
//   Within-run currency grows exponentially:  C(t) = e^(r·t),  with C(0) = 1.
//   Player resets when C reaches threshold C* = e^u (u = log-threshold).
//   Time to reach the threshold:              τ(u) = u / r.
//   Reward at reset is the compressed form:   H(u) = (C*)^β = e^(β·u).
//   Long-run reward rate                      ρ(u) = H(u) / τ(u) = r · e^(β·u) / u.
//
// d/du [e^(βu)/u] = e^(βu)·(βu − 1)/u²  ⇒  optimum at u* = 1/β.
// ρ(u*) = r · β · e ;   the optimum log-threshold depends only on β,
// the optimal rate scales linearly with r.
//
// Pedagogy: the curve has a single interior peak.  Reset too early, the
// reward H is small and the cycle wastes potential.  Reset too late, the
// time τ swallows the reward.  The threshold *is* the decision; algebra
// tells you the peak, but the felt experience is the slope to either side.

const beta = ref(0.5);
const r = ref(0.3);
const u = ref(2.0);

const uOpt = computed(() => 1 / beta.value);
const rhoOpt = computed(() => r.value * beta.value * Math.E);

const rho = (uVal: number): number => {
  if (uVal <= 0.001) return 0;
  return (r.value * Math.exp(beta.value * uVal)) / uVal;
};

const rhoUser = computed(() => rho(u.value));
const efficiency = computed(() => rhoUser.value / rhoOpt.value);

const tauUser = computed(() => u.value / r.value);
const rewardUser = computed(() => Math.exp(beta.value * u.value));

const domain = computed<[number, number]>(() => {
  // Plot wide enough to show the peak and the slow-falloff regime past it.
  return [0.2, Math.max(8, uOpt.value * 3)];
});

const annotations = computed<Annotation[]>(() => {
  return [
    {
      type: 'vline',
      x: uOpt.value,
      stroke: seriesColor('teal'),
      label: `u* = 1/β = ${uOpt.value.toFixed(2)}`,
      width: 1.25,
      labelOffset: 2,
    },
    {
      type: 'vline',
      x: u.value,
      stroke: seriesColor('amber'),
      label: 'your choice',
      width: 1.5,
      dash: [],
      labelOffset: 16,
    },
    {
      type: 'point',
      x: uOpt.value,
      y: rhoOpt.value,
      fill: seriesColor('teal'),
      radius: 4,
    },
    {
      type: 'point',
      x: u.value,
      y: rhoUser.value,
      fill: seriesColor('amber'),
      radius: 4,
    },
  ];
});

const cyclesPerHour = computed(() => 3600 / tauUser.value);
</script>

<template>
  <div class="demo">
    <div class="demo-controls">
      <label>
        <span class="demo-label">β (prestige compression) = {{ beta.toFixed(2) }}</span>
        <input v-model.number="beta" type="range" min="0.1" max="0.95" step="0.01" />
      </label>
      <label>
        <span class="demo-label">r (within-run growth rate) = {{ r.toFixed(2) }}</span>
        <input v-model.number="r" type="range" min="0.05" max="1" step="0.01" />
      </label>
      <label>
        <span class="demo-label">u (log-threshold) = {{ u.toFixed(2) }}</span>
        <input v-model.number="u" type="range" min="0.3" max="10" step="0.05" />
      </label>
    </div>

    <div class="plot-row">
      <div class="plot-panel">
        <span class="triptych-panel-label">long-run reward rate ρ(u) = r · e^(β·u) / u</span>
        <RatePlot
          :fn="rho"
          :domain="domain"
          :deps="[beta, r]"
          x-label="u (log-threshold)"
          y-label="ρ"
          :annotations="annotations"
          :height="240"
        />
      </div>

      <dl class="stats">
        <div>
          <dt>your u</dt>
          <dd>{{ u.toFixed(2) }}</dd>
        </div>
        <div>
          <dt>optimum u*</dt>
          <dd>{{ uOpt.toFixed(2) }}</dd>
        </div>
        <div>
          <dt>run length τ</dt>
          <dd>{{ tauUser.toFixed(1) }}</dd>
        </div>
        <div>
          <dt>reward / run</dt>
          <dd>{{ rewardUser < 1e6 ? rewardUser.toFixed(1) : rewardUser.toExponential(2) }}</dd>
        </div>
        <div class="rate-cell">
          <dt>your ρ</dt>
          <dd>{{ rhoUser.toFixed(3) }}</dd>
        </div>
        <div>
          <dt>optimal ρ</dt>
          <dd>{{ rhoOpt.toFixed(3) }}</dd>
        </div>
        <div class="eff-cell">
          <dt>efficiency</dt>
          <dd>{{ (efficiency * 100).toFixed(0) }}%</dd>
        </div>
        <div>
          <dt>runs / hour</dt>
          <dd>{{ cyclesPerHour < 1 ? cyclesPerHour.toFixed(2) : cyclesPerHour.toFixed(0) }}</dd>
        </div>
      </dl>
    </div>

    <p class="demo-note">
      Threshold reset model — within-run currency grows as
      <code>C(t) = e^(r·t)</code>; player resets at <code>C* = e^u</code>; prestige reward is
      <code>(C*)^β</code>. The closed form <code>u* = 1/β</code> drops out of one derivative, but
      the curve does the teaching: shallow on the left of the peak (early resets waste the run),
      steep on the right (late resets waste the player's clock). At <code>β = 0.5</code> the optimum
      is <code>u* = 2</code>; at <code>β = 0.95</code> the curve flattens and pushing past the peak
      barely costs efficiency. This is why some games can afford to ship vague autobuyer thresholds
      while others (high <code>β</code> early prestige) are tighter.
    </p>
  </div>
</template>

<style scoped>
.demo-controls {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--gap);
}
.plot-row {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(160px, 1fr);
  gap: var(--gap);
  margin-top: var(--gap);
  align-items: start;
}
.plot-panel {
  min-width: 0;
}
.stats {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--gap-sm);
  font-family: var(--font-mono);
  font-size: 0.88em;
  background: var(--color-bg);
  border-radius: var(--radius-sm);
  padding: var(--gap);
}
.stats > div {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}
.stats dt {
  color: var(--color-text-muted);
  font-size: 0.82em;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.stats dd {
  color: var(--color-text);
}
.stats .rate-cell dd {
  color: var(--series-amber);
}
.stats .eff-cell dd {
  color: var(--color-primary);
  font-weight: 600;
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
@media (max-width: 880px) {
  .plot-row {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
