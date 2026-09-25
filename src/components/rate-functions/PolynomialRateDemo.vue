<script setup lang="ts">
import { ref, computed } from 'vue';
import RatePlot from '../RatePlot.vue';

// Polynomial rate: r(x) = a · x^p, p ≠ -1.
// Cumulative: R(x) = a · x^(p+1) / (p+1).
// First passage: T(C) = ((p+1) C / a)^(1/(p+1)).
// p = 1 reproduces a linear-rate-with-zero-intercept; p = 2 is quadratic; p ∈ (-1, 0)
// is sub-linear (declining rate, i.e. diminishing returns).

const a = ref(1);
const p = ref(0.5);
const xMax = ref(100);
const cMax = ref(500);

const r = (x: number): number => a.value * Math.pow(x, p.value);
const R = (x: number): number => (a.value * Math.pow(x, p.value + 1)) / (p.value + 1);
const T = (C: number): number => {
  // Defined for p > -1; p = -1 integrates to a·ln x and is handled by the log entry.
  if (p.value <= -1) return NaN;
  return Math.pow(((p.value + 1) * C) / a.value, 1 / (p.value + 1));
};

const xDomain = computed<[number, number]>(() => [0.001, xMax.value]);
const cDomain = computed<[number, number]>(() => [0.001, cMax.value]);
</script>

<template>
  <div class="demo">
    <div class="demo-controls">
      <label>
        <span class="demo-label">a (coefficient) = {{ a.toFixed(2) }}</span>
        <input v-model.number="a" type="range" min="0.1" max="3" step="0.05" />
      </label>
      <label>
        <span class="demo-label">p (exponent) = {{ p.toFixed(2) }}</span>
        <input v-model.number="p" type="range" min="-0.9" max="2.5" step="0.05" />
      </label>
      <label>
        <span class="demo-label">x range = 0..{{ xMax.toFixed(0) }}</span>
        <input v-model.number="xMax" type="range" min="20" max="500" step="10" />
      </label>
      <label>
        <span class="demo-label">C range = 0..{{ cMax.toFixed(0) }}</span>
        <input v-model.number="cMax" type="range" min="50" max="5000" step="50" />
      </label>
    </div>

    <div class="triptych">
      <div class="triptych-panel">
        <span class="triptych-panel-label">r(x) = a · x^p</span>
        <RatePlot :fn="r" :domain="xDomain" :deps="[a, p]" x-label="x" y-label="r" />
      </div>
      <div class="triptych-panel">
        <span class="triptych-panel-label">R(x) = a · x^(p+1) / (p+1)</span>
        <RatePlot :fn="R" :domain="xDomain" :deps="[a, p]" x-label="x" y-label="R" />
      </div>
      <div class="triptych-panel">
        <span class="triptych-panel-label">T(C) = ((p+1)C/a)^(1/(p+1))</span>
        <RatePlot :fn="T" :domain="cDomain" :deps="[a, p]" x-label="C" y-label="T" />
      </div>
    </div>

    <p class="demo-note">
      <code>p = 1</code> recovers the linear rate (with zero intercept). <code>p &gt; 1</code> is
      power-law growth — first-passage time scales as <code>C^(1/(p+1))</code>, sublinear in
      <code>C</code>. <code>p ∈ (−1, 0)</code> is the diminishing-returns regime: the rate itself
      <em>decreases</em> in <code>x</code>, which produces a sublinear cumulative and a super-linear
      first-passage. <code>p = −1</code> is the boundary where the integral becomes
      <code>a · ln x</code> instead of a polynomial — that case lives on the log page.
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
