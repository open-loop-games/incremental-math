<script setup lang="ts">
import { ref, computed } from 'vue';
import RatePlot from '../RatePlot.vue';

// Linear rate: r(x) = a + b·x.
// Cumulative: R(x) = a·x + b·x²/2.
// First passage: T(C) = (-a + √(a² + 2bC)) / b for b > 0; T = C/a when b = 0.

const a = ref(1);
const b = ref(0.05);
const xMax = ref(100);
const cMax = ref(500);

const r = (x: number): number => a.value + b.value * x;
const R = (x: number): number => a.value * x + (b.value * x * x) / 2;
const T = (C: number): number => {
  if (b.value === 0) return C / a.value;
  const disc = a.value * a.value + 2 * b.value * C;
  if (disc < 0) return NaN;
  return (-a.value + Math.sqrt(disc)) / b.value;
};

const xDomain = computed<[number, number]>(() => [0, xMax.value]);
const cDomain = computed<[number, number]>(() => [0, cMax.value]);
</script>

<template>
  <div class="demo">
    <div class="demo-controls">
      <label>
        <span class="demo-label">a (intercept) = {{ a.toFixed(2) }}</span>
        <input v-model.number="a" type="range" min="0" max="5" step="0.05" />
      </label>
      <label>
        <span class="demo-label">b (slope) = {{ b.toFixed(3) }}</span>
        <input v-model.number="b" type="range" min="0" max="0.5" step="0.005" />
      </label>
      <label>
        <span class="demo-label">x range = 0..{{ xMax.toFixed(0) }}</span>
        <input v-model.number="xMax" type="range" min="20" max="500" step="10" />
      </label>
      <label>
        <span class="demo-label">C range (first-passage) = 0..{{ cMax.toFixed(0) }}</span>
        <input v-model.number="cMax" type="range" min="50" max="5000" step="50" />
      </label>
    </div>

    <div class="triptych">
      <div class="triptych-panel">
        <span class="triptych-panel-label">r(x) = a + b·x</span>
        <RatePlot :fn="r" :domain="xDomain" :deps="[a, b]" x-label="x" y-label="r" />
      </div>
      <div class="triptych-panel">
        <span class="triptych-panel-label">R(x) = a·x + b·x²/2</span>
        <RatePlot :fn="R" :domain="xDomain" :deps="[a, b]" x-label="x" y-label="R" />
      </div>
      <div class="triptych-panel">
        <span class="triptych-panel-label">T(C) = (−a + √(a² + 2bC)) / b</span>
        <RatePlot :fn="T" :domain="cDomain" :deps="[a, b]" x-label="C" y-label="T" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.demo-controls {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--gap);
}
</style>
