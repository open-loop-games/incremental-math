<script setup lang="ts">
import { ref, computed } from 'vue';
import RatePlot from '../../RatePlot.vue';
import type { Annotation } from '../../RatePlot.vue';
import { seriesColor } from '../../../lib/series-colors';

// Three named distribution families that cover most of the genre's stochastic territory:
//   - Geometric: trials-until-first-success on {1,2,...}.  pmf(n) = (1-p)^(n-1) · p.
//                Models gacha pulls without pity.  CV² = 1 - p ∈ [0,1).
//   - Geometric with pity at K: same pmf for n < K; mass (1-p)^(K-1) lumped at n = K.
//                Models gacha pulls with a guaranteed-by-K rule. Variance collapses sharply.
//   - Erlang-k: sum of k iid exponentials, rate λ.  pdf(x) = λ^k · x^(k-1) · e^(-λx) / (k-1)!.
//                Phase-type with k identical stages.  CV = 1/√k.
//   - Hyperexponential-2: mixture q · Exp(λ₁) + (1-q) · Exp(λ₂).
//                CV can exceed 1 — the genre's "rare big-payout, frequent small-wait" shape.
//
// The pedagogy: distribution shape carries design intent.  Same mean, very different feel.

type Family = 'geometric' | 'erlang' | 'hyperexp';

const family = ref<Family>('erlang');

// Geometric controls
const geomP = ref(0.05);
const pityOn = ref(false);
const pityK = ref(40);

// Erlang controls
const erlangK = ref(4);
const erlangLambda = ref(0.04);

// Hyperexponential controls
const hexpL1 = ref(0.2);
const hexpL2 = ref(0.01);
const hexpQ = ref(0.7);

function factorial(n: number): number {
  let acc = 1;
  for (let i = 2; i <= n; i++) acc *= i;
  return acc;
}

// pdf/pmf as a piecewise-constant function over reals, suitable for RatePlot.
// For discrete families we return the pmf at the nearest integer; the resulting
// step plot reads as a histogram bar at each integer support point.
const density = computed<(x: number) => number>(() => {
  if (family.value === 'geometric') {
    const p = geomP.value;
    const pity = pityOn.value;
    const K = pityK.value;
    return (x) => {
      if (x < 0.5) return 0;
      const n = Math.floor(x + 0.5);
      if (pity && n > K) return 0;
      if (pity && n === K) return Math.pow(1 - p, K - 1);
      return Math.pow(1 - p, n - 1) * p;
    };
  }
  if (family.value === 'erlang') {
    const k = erlangK.value;
    const lambda = erlangLambda.value;
    const denom = factorial(k - 1);
    return (x) => {
      if (x <= 0) return 0;
      return (Math.pow(lambda, k) * Math.pow(x, k - 1) * Math.exp(-lambda * x)) / denom;
    };
  }
  const l1 = hexpL1.value;
  const l2 = hexpL2.value;
  const q = hexpQ.value;
  return (x) => {
    if (x <= 0) return 0;
    return q * l1 * Math.exp(-l1 * x) + (1 - q) * l2 * Math.exp(-l2 * x);
  };
});

// Closed-form moments per family.
const stats = computed(() => {
  if (family.value === 'geometric') {
    const p = geomP.value;
    if (!pityOn.value) {
      const mean = 1 / p;
      const variance = (1 - p) / (p * p);
      const sd = Math.sqrt(variance);
      const cv = Math.sqrt(1 - p);
      // Median of geometric on {1,2,...} is ⌈-1/log2(1-p)⌉ for p < 1.
      const median = Math.ceil(-1 / Math.log2(1 - p));
      return { mean, median, sd, cv };
    }
    // With pity at K: truncate and re-distribute the tail mass to n = K.
    const K = pityK.value;
    let mean = 0;
    let m2 = 0;
    let cdf = 0;
    let median = 1;
    let medianFound = false;
    for (let n = 1; n < K; n++) {
      const pmf = Math.pow(1 - p, n - 1) * p;
      mean += n * pmf;
      m2 += n * n * pmf;
      cdf += pmf;
      if (!medianFound && cdf >= 0.5) {
        median = n;
        medianFound = true;
      }
    }
    const tail = Math.pow(1 - p, K - 1);
    mean += K * tail;
    m2 += K * K * tail;
    cdf += tail;
    if (!medianFound && cdf >= 0.5) median = K;
    const variance = m2 - mean * mean;
    const sd = Math.sqrt(Math.max(0, variance));
    return { mean, median, sd, cv: sd / mean };
  }
  if (family.value === 'erlang') {
    const k = erlangK.value;
    const lambda = erlangLambda.value;
    const mean = k / lambda;
    const variance = k / (lambda * lambda);
    const sd = Math.sqrt(variance);
    const cv = 1 / Math.sqrt(k);
    // No closed form for Erlang median; numerical bisection on the cdf.
    const median = erlangMedian(k, lambda, mean);
    return { mean, median, sd, cv };
  }
  const l1 = hexpL1.value;
  const l2 = hexpL2.value;
  const q = hexpQ.value;
  const mean = q / l1 + (1 - q) / l2;
  // E[X²] = q · 2/λ₁² + (1-q) · 2/λ₂²; Var = E[X²] - mean².
  const m2 = (q * 2) / (l1 * l1) + ((1 - q) * 2) / (l2 * l2);
  const variance = m2 - mean * mean;
  const sd = Math.sqrt(Math.max(0, variance));
  const median = hexpMedian(l1, l2, q, mean);
  return { mean, median, sd, cv: sd / mean };
});

function erlangCdf(k: number, lambda: number, x: number): number {
  // Regularized lower incomplete gamma γ(k, λx)/Γ(k) — for integer k, sum form.
  if (x <= 0) return 0;
  let term = Math.exp(-lambda * x);
  let acc = term;
  for (let n = 1; n < k; n++) {
    term *= (lambda * x) / n;
    acc += term;
  }
  return 1 - acc;
}

function erlangMedian(k: number, lambda: number, mean: number): number {
  let lo = 0;
  let hi = mean * 6;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (erlangCdf(k, lambda, mid) < 0.5) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

function hexpMedian(l1: number, l2: number, q: number, mean: number): number {
  const cdf = (x: number) => 1 - q * Math.exp(-l1 * x) - (1 - q) * Math.exp(-l2 * x);
  let lo = 0;
  let hi = mean * 6;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (cdf(mid) < 0.5) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

const xMax = computed(() => {
  // Plot to ~4× the mean for continuous, ~3× the mean for discrete (with at least 50 bins).
  if (family.value === 'geometric') {
    const m = stats.value.mean;
    return Math.max(50, Math.ceil(m * 3));
  }
  return Math.max(20, stats.value.mean * 4);
});

const domain = computed<[number, number]>(() => [0, xMax.value]);

const annotations = computed<Annotation[]>(() => {
  const { mean, median } = stats.value;
  return [
    {
      type: 'vline',
      x: mean,
      stroke: seriesColor('amber'),
      label: `mean ${mean.toFixed(1)}`,
      width: 1.25,
      labelOffset: 2,
    },
    {
      type: 'vline',
      x: median,
      stroke: seriesColor('teal'),
      label: `median ${median.toFixed(1)}`,
      width: 1.25,
      labelOffset: 16,
    },
  ];
});

const samples = computed(() =>
  family.value === 'geometric' ? Math.min(800, xMax.value + 1) : 400,
);

const cvLabel = computed(() => {
  const cv = stats.value.cv;
  if (!Number.isFinite(cv)) return '—';
  return cv.toFixed(2);
});
</script>

<template>
  <div class="demo">
    <div class="family-tabs">
      <button
        type="button"
        :class="{ active: family === 'geometric' }"
        @click="family = 'geometric'"
      >
        Geometric
      </button>
      <button type="button" :class="{ active: family === 'erlang' }" @click="family = 'erlang'">
        Erlang-k
      </button>
      <button type="button" :class="{ active: family === 'hyperexp' }" @click="family = 'hyperexp'">
        Hyperexp-2
      </button>
    </div>

    <div v-if="family === 'geometric'" class="demo-controls">
      <label>
        <span class="demo-label">p (success per trial) = {{ geomP.toFixed(3) }}</span>
        <input v-model.number="geomP" type="range" min="0.005" max="0.5" step="0.005" />
      </label>
      <label class="checkbox-row">
        <input v-model="pityOn" type="checkbox" />
        <span class="demo-label">pity at K (forced success)</span>
      </label>
      <label v-if="pityOn">
        <span class="demo-label">K = {{ pityK }}</span>
        <input v-model.number="pityK" type="range" min="5" max="200" step="1" />
      </label>
    </div>

    <div v-else-if="family === 'erlang'" class="demo-controls">
      <label>
        <span class="demo-label">k (number of stages) = {{ erlangK }}</span>
        <input v-model.number="erlangK" type="range" min="1" max="20" step="1" />
      </label>
      <label>
        <span class="demo-label">λ (per-stage rate) = {{ erlangLambda.toFixed(3) }}</span>
        <input v-model.number="erlangLambda" type="range" min="0.005" max="0.5" step="0.005" />
      </label>
    </div>

    <div v-else class="demo-controls">
      <label>
        <span class="demo-label">λ₁ (fast rate) = {{ hexpL1.toFixed(3) }}</span>
        <input v-model.number="hexpL1" type="range" min="0.05" max="1" step="0.005" />
      </label>
      <label>
        <span class="demo-label">λ₂ (slow rate) = {{ hexpL2.toFixed(4) }}</span>
        <input v-model.number="hexpL2" type="range" min="0.001" max="0.1" step="0.001" />
      </label>
      <label>
        <span class="demo-label">q (mix on fast) = {{ hexpQ.toFixed(2) }}</span>
        <input v-model.number="hexpQ" type="range" min="0.05" max="0.95" step="0.01" />
      </label>
    </div>

    <div class="plot-row">
      <div class="plot-panel">
        <span class="triptych-panel-label">{{
          family === 'geometric' ? 'pmf — wait until success' : 'pdf — wait time density'
        }}</span>
        <RatePlot
          :fn="density"
          :domain="domain"
          :deps="[family, geomP, pityOn, pityK, erlangK, erlangLambda, hexpL1, hexpL2, hexpQ]"
          :samples="samples"
          x-label="t (trials or time)"
          y-label="density"
          :annotations="annotations"
          :height="220"
        />
      </div>

      <dl class="stats">
        <div>
          <dt>mean</dt>
          <dd>{{ stats.mean.toFixed(2) }}</dd>
        </div>
        <div>
          <dt>median</dt>
          <dd>{{ stats.median.toFixed(2) }}</dd>
        </div>
        <div>
          <dt>std dev</dt>
          <dd>{{ stats.sd.toFixed(2) }}</dd>
        </div>
        <div class="cv-cell">
          <dt>CV (σ/μ)</dt>
          <dd>{{ cvLabel }}</dd>
        </div>
      </dl>
    </div>

    <p class="demo-note">
      <span v-if="family === 'geometric' && !pityOn">
        Pure geometric: <code>CV → 1</code> as <code>p</code> shrinks. The mass on the left is
        heavy, the tail is long, and median sits well below the mean. The "I pulled 200 times and
        got nothing" stories live in this tail.
      </span>
      <span v-else-if="family === 'geometric' && pityOn">
        Pity at <code>K = {{ pityK }}</code> truncates the tail and lumps its mass at
        <code>n = K</code>. CV collapses; the mean barely moves. Same average wait, fundamentally
        different player feel — the floor lifts off the floor.
      </span>
      <span v-else-if="family === 'erlang'">
        Erlang-{{ erlangK }} is <code>{{ erlangK }}</code> exponential stages in series.
        <code>CV = 1/√k</code> — at <code>k = 1</code> this is the memoryless exponential (CV 1,
        peaked at 0); at <code>k = 10</code>
        the shape is nearly Gaussian, peaked near the mean. Phase-type distributions extend this to
        mixtures of stages with different rates.
      </span>
      <span v-else>
        Hyperexponential mixes a fast and a slow exponential. <code>CV > 1</code>
        is achievable — the design knob for "most pulls are quick, occasional ones drag."
        Wire-market-style stochasticity. Mean and median diverge sharply; the median can be tens of
        times smaller than the mean when
        <code>q</code> is high.
      </span>
    </p>
  </div>
</template>

<style scoped>
.family-tabs {
  display: flex;
  gap: var(--gap-sm);
  margin-bottom: var(--gap);
}
.family-tabs button {
  flex: 1;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  color: var(--color-text-muted);
  font-family: var(--font-mono);
  font-size: 0.85em;
  padding: var(--gap-sm) var(--gap);
  border-radius: var(--radius-sm);
  cursor: pointer;
}
.family-tabs button.active {
  background: var(--color-surface-hover);
  color: var(--color-text);
  border-color: var(--color-primary);
}
.demo-controls {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--gap);
}
.checkbox-row {
  display: flex;
  align-items: center;
  gap: var(--gap-sm);
}
.checkbox-row input[type='checkbox'] {
  width: auto;
  margin: 0;
}
.checkbox-row .demo-label {
  margin: 0;
}
.plot-row {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(140px, 1fr);
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
  font-size: 0.9em;
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
  font-size: 0.85em;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.stats dd {
  color: var(--color-text);
}
.stats .cv-cell dd {
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
