<script setup lang="ts">
import { ref, computed } from 'vue';
import RatePlot from '../RatePlot.vue';

// Rational / hyperbolic rate: r(x) = a / (b + x)^p.
// For p ≠ 1: R(x) = a · ((b+x)^(1−p) − b^(1−p)) / (1 − p).
// For p = 1: R(x) = a · ln((b+x)/b).
// First passage (p ≠ 1): T(C) = (b^(1−p) + (1−p)C/a)^(1/(1−p)) − b.
// For p > 1, the cumulative is bounded — total resource has a finite ceiling.

const a = ref(1);
const b = ref(1);
const p = ref(2);
const xMax = ref(50);
const cMax = ref(2);

const r = (x: number): number => a.value / Math.pow(b.value + x, p.value);
const R = (x: number): number => {
  const bp = b.value;
  const pp = p.value;
  const ap = a.value;
  if (Math.abs(pp - 1) < 1e-9) return ap * Math.log((bp + x) / bp);
  return (ap * (Math.pow(bp + x, 1 - pp) - Math.pow(bp, 1 - pp))) / (1 - pp);
};

const ceiling = computed<number | null>(() => {
  if (p.value <= 1) return null;
  // R(∞) = a · b^(1−p) / (p − 1) when p > 1.
  return (a.value * Math.pow(b.value, 1 - p.value)) / (p.value - 1);
});

const T = (C: number): number => {
  const bp = b.value;
  const pp = p.value;
  const ap = a.value;
  if (Math.abs(pp - 1) < 1e-9) return bp * (Math.exp(C / ap) - 1);
  // For p > 1, T(C) only defined for C < ceiling.
  if (ceiling.value !== null && C >= ceiling.value) return NaN;
  const inside = Math.pow(bp, 1 - pp) + ((1 - pp) * C) / ap;
  if (inside <= 0) return NaN;
  return Math.pow(inside, 1 / (1 - pp)) - bp;
};

const xDomain = computed<[number, number]>(() => [0, xMax.value]);
const cDomain = computed<[number, number]>(() => {
  if (ceiling.value === null) return [0, cMax.value];
  return [0, Math.min(cMax.value, ceiling.value * 0.99)];
});
</script>

<template>
  <div class="demo">
    <div class="demo-controls">
      <label>
        <span class="demo-label">a = {{ a.toFixed(2) }}</span>
        <input
          v-model.number="a"
          type="range"
          min="0.1"
          max="3"
          step="0.05"
        >
      </label>
      <label>
        <span class="demo-label">b (offset) = {{ b.toFixed(2) }}</span>
        <input
          v-model.number="b"
          type="range"
          min="0.1"
          max="5"
          step="0.05"
        >
      </label>
      <label>
        <span class="demo-label">p = {{ p.toFixed(2) }}</span>
        <input
          v-model.number="p"
          type="range"
          min="0.3"
          max="3"
          step="0.05"
        >
      </label>
      <label>
        <span class="demo-label">x range = 0..{{ xMax.toFixed(0) }}</span>
        <input
          v-model.number="xMax"
          type="range"
          min="10"
          max="200"
          step="5"
        >
      </label>
      <label>
        <span class="demo-label">C range = 0..{{ cMax.toFixed(2) }}</span>
        <input
          v-model.number="cMax"
          type="range"
          min="0.5"
          max="20"
          step="0.1"
        >
      </label>
    </div>

    <div class="triptych">
      <div class="triptych-panel">
        <span class="triptych-panel-label">r(x) = a / (b + x)^p</span>
        <RatePlot
          :fn="r"
          :domain="xDomain"
          :deps="[a, b, p]"
          x-label="x"
          y-label="r"
        />
      </div>
      <div class="triptych-panel">
        <span class="triptych-panel-label">R(x) — cumulative</span>
        <RatePlot
          :fn="R"
          :domain="xDomain"
          :deps="[a, b, p]"
          x-label="x"
          y-label="R"
        />
      </div>
      <div class="triptych-panel">
        <span class="triptych-panel-label">T(C) — first-passage</span>
        <RatePlot
          :fn="T"
          :domain="cDomain"
          :deps="[a, b, p]"
          x-label="C"
          y-label="T"
        />
      </div>
    </div>

    <p
      v-if="ceiling !== null"
      class="demo-note"
    >
      With <code>p &gt; 1</code> the cumulative is bounded —
      <code>R(∞) = a · b^(1−p) / (p − 1) ≈ {{ ceiling.toFixed(3) }}</code>. Any threshold <code>C ≥ R(∞)</code> is unreachable; <code>T(C) → ∞</code> as
      <code>C → R(∞)</code>. This is the cleanest math for a soft cap with a real ceiling: the rate
      never hits zero, but the integral does.
    </p>
    <p
      v-else
      class="demo-note"
    >
      With <code>p ≤ 1</code> the cumulative is unbounded but grows sublinearly. The boundary case
      <code>p = 1</code> integrates to <code>a · ln((b+x)/b)</code>; the first-passage becomes the
      inverse <code>T(C) = b · (e^(C/a) − 1)</code>.
    </p>
  </div>
</template>

<style scoped>
.demo-controls {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
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
