<script setup lang="ts">
import { ref, computed } from 'vue';
import RatePlot from '../RatePlot.vue';

// Logistic / saturating growth.
//   ODE:                  dx/dt = r · x · (1 − x/K)
//   Closed-form trajectory: x(t) = K / (1 + ((K − x₀)/x₀) · e^(−rt))
//   First-passage:        T(C) = (1/r) · ln( ((K − x₀)/x₀) · (C / (K − C)) ) for 0 < C < K.
// Unique among the catalog's sigmoids: the only one whose first-passage is fully elementary.

const rcoef = ref(0.3);
const K = ref(100);
const x0 = ref(1);
const tMax = ref(40);

const rateOfState = (x: number): number => rcoef.value * x * (1 - x / K.value);
const trajectory = (t: number): number => {
  const A = (K.value - x0.value) / x0.value;
  return K.value / (1 + A * Math.exp(-rcoef.value * t));
};
const firstPassage = (C: number): number => {
  if (C <= 0 || C >= K.value) return NaN;
  const A = (K.value - x0.value) / x0.value;
  return (1 / rcoef.value) * Math.log(A * (C / (K.value - C)));
};

const xDomain = computed<[number, number]>(() => [0, K.value]);
const tDomain = computed<[number, number]>(() => [0, tMax.value]);
const cDomain = computed<[number, number]>(() => [x0.value * 1.01, K.value * 0.99]);

const inflectionT = computed(() => {
  const A = (K.value - x0.value) / x0.value;
  return Math.log(A) / rcoef.value;
});
</script>

<template>
  <div class="demo">
    <div class="demo-controls">
      <label>
        <span class="demo-label">r (intrinsic rate) = {{ rcoef.toFixed(3) }}</span>
        <input
          v-model.number="rcoef"
          type="range"
          min="0.05"
          max="1"
          step="0.01"
        >
      </label>
      <label>
        <span class="demo-label">K (carrying capacity) = {{ K.toFixed(0) }}</span>
        <input
          v-model.number="K"
          type="range"
          min="20"
          max="500"
          step="5"
        >
      </label>
      <label>
        <span class="demo-label">x₀ (initial state) = {{ x0.toFixed(2) }}</span>
        <input
          v-model.number="x0"
          type="range"
          min="0.1"
          :max="K * 0.4"
          step="0.1"
        >
      </label>
      <label>
        <span class="demo-label">t range = 0..{{ tMax.toFixed(0) }}</span>
        <input
          v-model.number="tMax"
          type="range"
          min="10"
          max="200"
          step="2"
        >
      </label>
    </div>

    <div class="triptych">
      <div class="triptych-panel">
        <span class="triptych-panel-label">dx/dt = r · x · (1 − x/K)</span>
        <RatePlot
          :fn="rateOfState"
          :domain="xDomain"
          :deps="[rcoef, K]"
          x-label="x"
          y-label="ẋ"
        />
      </div>
      <div class="triptych-panel">
        <span class="triptych-panel-label">x(t) — trajectory</span>
        <RatePlot
          :fn="trajectory"
          :domain="tDomain"
          :deps="[rcoef, K, x0]"
          x-label="t"
          y-label="x"
        />
      </div>
      <div class="triptych-panel">
        <span class="triptych-panel-label">T(C) — first-passage</span>
        <RatePlot
          :fn="firstPassage"
          :domain="cDomain"
          :deps="[rcoef, K, x0]"
          x-label="C"
          y-label="T"
        />
      </div>
    </div>

    <p class="demo-note">
      The rate panel is a parabola — it peaks at <code>x = K/2</code> with maximum
      <code>r · K / 4</code>, then falls back toward zero as the state approaches the carrying
      capacity. The trajectory's inflection point sits at the same <code>x = K/2</code>, which
      occurs at <code>t ≈ {{ inflectionT.toFixed(2) }}</code> for the current parameters.
      First-passage diverges at <code>C = K</code>; the carrying capacity is approached but never
      reached.
    </p>
  </div>
</template>

<style scoped>
.demo-controls {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--gap);
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
