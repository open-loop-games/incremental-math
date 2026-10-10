<script setup lang="ts">
import { ref, computed } from 'vue';
import RatePlot from '../RatePlot.vue';

// Two-regime piecewise geometric: pre-threshold ratio m₁, post-threshold ratio m₂, glued
// continuously at x = t. Models Realm Grinder's pre/post-Ascension cost shift and similar
// "gear-shift" patterns.
//
//   Cost(n) = base · m₁^n                   for n ≤ t
//           = base · m₁^t · m₂^(n − t)     for n > t
//   Sum  S_n = base · (m₁^(n+1) − 1)/(m₁ − 1)              for n ≤ t
//           = (sum up to t) + base · m₁^t · (m₂^(n−t+1) − m₂)/(m₂ − 1)   for n > t
// First-passage in budget C: piecewise inversion.

const base = ref(1);
const m1 = ref(1.15);
const m2 = ref(1.03);
const t = ref(40);
const xMax = ref(120);
const cMax = ref(2e5);

function rate(x: number): number {
  if (x <= t.value) return base.value * Math.pow(m1.value, x);
  return base.value * Math.pow(m1.value, t.value) * Math.pow(m2.value, x - t.value);
}

function geomSum(b: number, m: number, n: number): number {
  // Sum_{k=0}^{n} b · m^k = b · (m^(n+1) − 1)/(m − 1).
  if (Math.abs(m - 1) < 1e-9) return b * (n + 1);
  return (b * (Math.pow(m, n + 1) - 1)) / (m - 1);
}

function cumulative(x: number): number {
  if (x <= t.value) return geomSum(base.value, m1.value, x);
  const head = geomSum(base.value, m1.value, t.value);
  const baseAfter = base.value * Math.pow(m1.value, t.value) * m2.value;
  return head + geomSum(baseAfter, m2.value, x - t.value - 1);
}

const cumulativeAtT = computed(() => geomSum(base.value, m1.value, t.value));

function firstPassage(C: number): number {
  if (C <= 0) return 0;
  if (C <= cumulativeAtT.value) {
    const arg = (C * (m1.value - 1)) / base.value + 1;
    if (arg <= 0) return NaN;
    return Math.log(arg) / Math.log(m1.value) - 1;
  }
  const remaining = C - cumulativeAtT.value;
  const baseAfter = base.value * Math.pow(m1.value, t.value) * m2.value;
  const arg = (remaining * (m2.value - 1)) / baseAfter + 1;
  if (arg <= 0) return NaN;
  return t.value + 1 + Math.log(arg) / Math.log(m2.value);
}

const xDomain = computed<[number, number]>(() => [0, xMax.value]);
const cDomain = computed<[number, number]>(() => [1, cMax.value]);
</script>

<template>
  <div class="demo">
    <div class="demo-controls">
      <label>
        <span class="demo-label">base = {{ base.toFixed(2) }}</span>
        <input v-model.number="base" type="range" min="0.5" max="5" step="0.05" />
      </label>
      <label>
        <span class="demo-label">m₁ (pre-threshold) = {{ m1.toFixed(3) }}</span>
        <input v-model.number="m1" type="range" min="1.02" max="1.5" step="0.005" />
      </label>
      <label>
        <span class="demo-label">m₂ (post-threshold) = {{ m2.toFixed(3) }}</span>
        <input v-model.number="m2" type="range" min="1.001" max="1.5" step="0.001" />
      </label>
      <label>
        <span class="demo-label">threshold t = {{ t.toFixed(0) }}</span>
        <input v-model.number="t" type="range" min="5" :max="xMax * 0.8" step="1" />
      </label>
      <label>
        <span class="demo-label">x range = 0..{{ xMax.toFixed(0) }}</span>
        <input v-model.number="xMax" type="range" min="20" max="500" step="10" />
      </label>
      <label>
        <span class="demo-label">C range = 0..{{ (cMax / 1000).toFixed(0) }}k</span>
        <input v-model.number="cMax" type="range" min="1000" max="1e7" step="1000" />
      </label>
    </div>

    <div class="triptych">
      <div class="triptych-panel">
        <span class="triptych-panel-label">r(x) — piecewise rate</span>
        <RatePlot
          :fn="rate"
          :domain="xDomain"
          y-scale="log"
          :deps="[base, m1, m2, t]"
          x-label="x"
          y-label="r"
        />
      </div>
      <div class="triptych-panel">
        <span class="triptych-panel-label">R(x) — cumulative</span>
        <RatePlot
          :fn="cumulative"
          :domain="xDomain"
          :deps="[base, m1, m2, t]"
          x-label="x"
          y-label="R"
        />
      </div>
      <div class="triptych-panel">
        <span class="triptych-panel-label">T(C) — piecewise first-passage</span>
        <RatePlot
          :fn="firstPassage"
          :domain="cDomain"
          :deps="[base, m1, m2, t]"
          x-label="C"
          y-label="T"
        />
      </div>
    </div>

    <p class="demo-note">
      Cumulative through threshold
      <code
        >R(t) ≈
        {{ cumulativeAtT < 1e6 ? cumulativeAtT.toFixed(0) : cumulativeAtT.toExponential(2) }}</code
      >. The rate panel is on log y-scale because the post-threshold geometric is still exponential
      — the kink at <code>x = t</code> is the slope change in log space, which is the only place a
      piecewise splice of two geometrics is visually a "break" rather than a vanishingly small
      inflection.
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
