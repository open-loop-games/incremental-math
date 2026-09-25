<script setup lang="ts">
import { ref, computed } from 'vue';
import RatePlot from '../RatePlot.vue';
import { lambertW0 } from '../../lib/lambert';

// Logarithmic rate: r(x) = a · ln(b · x) for x > 1/b.
// Cumulative: R(x) = a · (x · ln(b·x) − x + 1/b)  (constant chosen so R(1/b) = 0).
// First-passage: solve a · (x · ln(b·x) − x + 1/b) = C for x.
//   u := b·x  ⇒  u · ln(u) − u + 1 = b·C/a  ⇒  u · (ln(u) − 1) = b·C/a − 1.
//   Let v = ln(u) − 1; then u = e^(v+1) and v · e^v = (b·C/a − 1)/e.
//   So v = W₀((b·C/a − 1)/e), and T(C) = u/b = e · e^v / b.

const a = ref(1);
const b = ref(1);
const xMax = ref(20);
const cMax = ref(80);

const r = (x: number): number => {
  if (x <= 1 / b.value) return 0;
  return a.value * Math.log(b.value * x);
};
const R = (x: number): number => {
  if (x <= 0) return 0;
  // Antiderivative ∫ a ln(b·x) dx = a (x ln(b x) − x) + const, anchored at x = 1/b.
  return a.value * (x * Math.log(b.value * x) - x + 1 / b.value);
};
const T = (C: number): number => {
  if (C <= 0) return 1 / b.value;
  const k = (b.value * C) / a.value - 1;
  // For tiny C, k ≈ -1; the W₀ branch returns -1 only at exactly k = -1 (the cusp at C → 0).
  // Past that the branch is regular.
  const arg = k / Math.E;
  if (arg < -1 / Math.E) return NaN;
  const v = lambertW0(arg);
  const u = Math.exp(v + 1);
  return u / b.value;
};

const xDomain = computed<[number, number]>(() => [1.001 / b.value, xMax.value]);
const cDomain = computed<[number, number]>(() => [0.5, cMax.value]);
</script>

<template>
  <div class="demo">
    <div class="demo-controls">
      <label>
        <span class="demo-label">a (strength) = {{ a.toFixed(2) }}</span>
        <input v-model.number="a" type="range" min="0.1" max="3" step="0.05" />
      </label>
      <label>
        <span class="demo-label">b (scale) = {{ b.toFixed(2) }}</span>
        <input v-model.number="b" type="range" min="0.1" max="3" step="0.05" />
      </label>
      <label>
        <span class="demo-label">x range = 0..{{ xMax.toFixed(0) }}</span>
        <input v-model.number="xMax" type="range" min="5" max="200" step="2" />
      </label>
      <label>
        <span class="demo-label">C range = 0..{{ cMax.toFixed(0) }}</span>
        <input v-model.number="cMax" type="range" min="5" max="500" step="5" />
      </label>
    </div>

    <div class="triptych">
      <div class="triptych-panel">
        <span class="triptych-panel-label">r(x) = a · ln(b·x)</span>
        <RatePlot :fn="r" :domain="xDomain" :deps="[a, b]" x-label="x" y-label="r" />
      </div>
      <div class="triptych-panel">
        <span class="triptych-panel-label">R(x) = a·(x·ln(b·x) − x + 1/b)</span>
        <RatePlot :fn="R" :domain="xDomain" :deps="[a, b]" x-label="x" y-label="R" />
      </div>
      <div class="triptych-panel">
        <span class="triptych-panel-label">T(C) — via Lambert W</span>
        <RatePlot :fn="T" :domain="cDomain" :deps="[a, b]" x-label="C" y-label="T" />
      </div>
    </div>

    <p class="demo-note">
      The first-passage panel is computed via the
      <code>lambertW0</code> implementation in <code>src/lib/lambert.ts</code> (Halley iteration).
      It is closed-form in the formal sense — a named function with stable properties — but the
      curve cannot be read off directly the way the elementary entries' first-passage curves can.
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
