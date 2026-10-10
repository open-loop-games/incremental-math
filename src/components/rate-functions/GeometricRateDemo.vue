<script setup lang="ts">
import { ref, computed } from 'vue';
import RatePlot from '../RatePlot.vue';

// Geometric / exponential rate.
//   Discrete:    aₙ = a · mⁿ; Sₙ = a · (m^(n+1) − 1) / (m − 1).  N(C) = log_m((C(m−1)/a) + 1) − 1.
//   Continuous:  r(x) = a · e^(b·x); R(x) = (a/b)·(e^(b·x) − 1); T(C) = (1/b)·ln(1 + bC/a).
// Equivalence: m = e^b. The continuous form is plotted; the m readout shows the discrete
// notation for the same curve so per-purchase reasoning lines up with calculus reasoning.

const a = ref(1);
const m = ref(1.15);
const xMax = ref(60);
const cMax = ref(2000);
const logY = ref(false);

const b = computed(() => Math.log(m.value));

const r = (x: number): number => a.value * Math.exp(b.value * x);
const R = (x: number): number => (a.value / b.value) * (Math.exp(b.value * x) - 1);
const T = (C: number): number => (1 / b.value) * Math.log(1 + (b.value * C) / a.value);

const xDomain = computed<[number, number]>(() => [0, xMax.value]);
const cDomain = computed<[number, number]>(() => [1, cMax.value]);
</script>

<template>
  <div class="demo">
    <div class="demo-controls">
      <label>
        <span class="demo-label">a (base) = {{ a.toFixed(2) }}</span>
        <input v-model.number="a" type="range" min="0.5" max="5" step="0.05" />
      </label>
      <label>
        <span class="demo-label">m (cost ratio) = {{ m.toFixed(3) }}</span>
        <input v-model.number="m" type="range" min="1.02" max="1.5" step="0.005" />
      </label>
      <label>
        <span class="demo-label">⇨ continuous b = ln(m) = {{ b.toFixed(4) }}</span>
        <input type="range" :value="b" disabled min="0" max="0.5" step="0.001" />
      </label>
      <label>
        <span class="demo-label">x range = 0..{{ xMax.toFixed(0) }}</span>
        <input v-model.number="xMax" type="range" min="10" max="200" step="2" />
      </label>
      <label>
        <span class="demo-label">C range = 0..{{ cMax.toFixed(0) }}</span>
        <input v-model.number="cMax" type="range" min="50" max="50000" step="50" />
      </label>
      <label class="demo-toggle">
        <input v-model="logY" type="checkbox" />
        log y-scale on rate
      </label>
    </div>

    <div class="triptych">
      <div class="triptych-panel">
        <span class="triptych-panel-label">r(x) = a · m^x</span>
        <RatePlot
          :fn="r"
          :domain="xDomain"
          :y-scale="logY ? 'log' : 'linear'"
          :deps="[a, m]"
          x-label="x"
          y-label="r"
        />
      </div>
      <div class="triptych-panel">
        <span class="triptych-panel-label">R(x) = (a/ln m)·(m^x − 1)</span>
        <RatePlot :fn="R" :domain="xDomain" :deps="[a, m]" x-label="x" y-label="R" />
      </div>
      <div class="triptych-panel">
        <span class="triptych-panel-label">T(C) = log_m(1 + (C ln m)/a)</span>
        <RatePlot :fn="T" :domain="cDomain" :deps="[a, m]" x-label="C" y-label="T" />
      </div>
    </div>

    <p class="demo-note">
      Doubling time in <code>x</code>: <code>(ln 2)/ln(m) ≈ {{ (Math.LN2 / b).toFixed(2) }}</code
      >. Past <code>x ≈</code> a few doubling times, <code>R(x)</code> is dominated by the last term
      — about <code>1 − m⁻ᴷ</code> of the cumulative sits in the last <code>K</code> purchases. For
      <code>m = 1.15</code>, the last 10 purchases carry ≈ 75% of the integral; this is the
      exponential family's signature concentration of total work near the end.
    </p>
  </div>
</template>

<style scoped>
.demo-controls {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--gap);
}
.demo-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.9em;
  color: var(--color-text-muted);
  align-self: end;
}
.demo-toggle input {
  width: auto;
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
