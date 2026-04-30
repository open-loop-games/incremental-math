<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue';
import uPlot from 'uplot';
import type { Options, AlignedData } from 'uplot';
import 'uplot/dist/uPlot.min.css';

// Three mechanics, each with growth rate g_i. Strength at time t is exp(g_i · t).
//
// Disjoint sum:           total_rate = Σ exp(g_i t).         share_i(t) = exp(g_i t) / total_rate.
// Multiplicative blend:   total_mult = Π exp(g_i t).         log-share_i(t) = g_i · t / Σ g_j · t = g_i / Σ g_j.
//
// The blended log-shares are independent of t — strictly proportional to the growth-rate vector.
// The disjoint shares evolve and the largest g converges to share 1.

const g1 = ref(0.06);
const g2 = ref(0.1);
const g3 = ref(0.16);
const tMax = ref(60);

const N = 200;

const COLOR_A = '#4a9eff';
const COLOR_B = '#6ec07a';
const COLOR_C = '#d97a7a';
const FILL_A = 'rgba(74, 158, 255, 0.55)';
const FILL_B = 'rgba(110, 192, 122, 0.55)';
const FILL_C = 'rgba(217, 122, 122, 0.55)';

function buildDisjoint(): AlignedData {
  const xs = new Float64Array(N);
  const top1 = new Float64Array(N);
  const top2 = new Float64Array(N);
  const top3 = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    const t = (i / (N - 1)) * tMax.value;
    xs[i] = t;
    const e1 = Math.exp(g1.value * t);
    const e2 = Math.exp(g2.value * t);
    const e3 = Math.exp(g3.value * t);
    const total = e1 + e2 + e3;
    const s1 = e1 / total;
    const s2 = e2 / total;
    top1[i] = s1;
    top2[i] = s1 + s2;
    top3[i] = 1;
  }
  return [xs, top1, top2, top3] as unknown as AlignedData;
}

function buildBlended(): AlignedData {
  const xs = new Float64Array(N);
  const top1 = new Float64Array(N);
  const top2 = new Float64Array(N);
  const top3 = new Float64Array(N);
  // log-share is g_i / Σ g_j, independent of t for t > 0.
  // At t = 0 all multipliers are 1, log-total is 0, shares are undefined; show even-thirds.
  const sum = g1.value + g2.value + g3.value || 1;
  const s1 = g1.value / sum;
  const s2 = g2.value / sum;
  for (let i = 0; i < N; i++) {
    const t = (i / (N - 1)) * tMax.value;
    xs[i] = t;
    top1[i] = s1;
    top2[i] = s1 + s2;
    top3[i] = 1;
  }
  return [xs, top1, top2, top3] as unknown as AlignedData;
}

function buildOpts(width: number, title: string): Options {
  return {
    width,
    height: 220,
    title,
    cursor: { drag: { x: false, y: false }, points: { size: 4 } },
    legend: { show: false },
    scales: {
      x: { time: false, range: [0, tMax.value] },
      y: { range: [0, 1] },
    },
    axes: [
      {
        stroke: '#8892a4',
        grid: { stroke: '#2a3a5c', width: 0.5, dash: [2, 3] },
        ticks: { stroke: '#2a3a5c', width: 0.5 },
        label: 't',
        labelSize: 24,
        font: '11px ui-monospace, monospace',
        labelFont: '11px ui-monospace, monospace',
      },
      {
        stroke: '#8892a4',
        grid: { stroke: '#2a3a5c', width: 0.5, dash: [2, 3] },
        ticks: { stroke: '#2a3a5c', width: 0.5 },
        label: 'share',
        labelSize: 28,
        size: 56,
        values: (_u, vals) => vals.map((v) => v.toFixed(1)),
        font: '11px ui-monospace, monospace',
        labelFont: '11px ui-monospace, monospace',
      },
    ],
    series: [
      {},
      { stroke: COLOR_A, fill: FILL_A, width: 1.2, points: { show: false } },
      { stroke: COLOR_B, fill: FILL_B, width: 1.2, points: { show: false } },
      { stroke: COLOR_C, fill: FILL_C, width: 1.2, points: { show: false } },
    ],
    bands: [
      { series: [3, 2], fill: FILL_C },
      { series: [2, 1], fill: FILL_B },
      // Innermost layer fills from layer-1 top down to zero (uplot's implicit zero baseline).
    ],
  };
}

const disjointRef = ref<HTMLDivElement | null>(null);
const blendedRef = ref<HTMLDivElement | null>(null);
let disjointPlot: uPlot | null = null;
let blendedPlot: uPlot | null = null;
let ro: ResizeObserver | null = null;

function mount(): void {
  if (disjointRef.value) {
    const w = disjointRef.value.clientWidth || 320;
    disjointPlot = new uPlot(
      buildOpts(w, 'Disjoint sum (additive contributions)'),
      buildDisjoint(),
      disjointRef.value,
    );
  }
  if (blendedRef.value) {
    const w = blendedRef.value.clientWidth || 320;
    blendedPlot = new uPlot(
      buildOpts(w, 'Shared modifier (multiplicative blend)'),
      buildBlended(),
      blendedRef.value,
    );
  }
}

function rebuild(): void {
  disjointPlot?.destroy();
  blendedPlot?.destroy();
  disjointPlot = null;
  blendedPlot = null;
  mount();
}

onMounted(() => {
  mount();
  ro = new ResizeObserver(() => {
    if (disjointPlot && disjointRef.value) {
      const w = disjointRef.value.clientWidth;
      if (w > 0) disjointPlot.setSize({ width: w, height: 220 });
    }
    if (blendedPlot && blendedRef.value) {
      const w = blendedRef.value.clientWidth;
      if (w > 0) blendedPlot.setSize({ width: w, height: 220 });
    }
  });
  if (disjointRef.value) ro.observe(disjointRef.value);
  if (blendedRef.value) ro.observe(blendedRef.value);
});

onBeforeUnmount(() => {
  ro?.disconnect();
  ro = null;
  disjointPlot?.destroy();
  blendedPlot?.destroy();
  disjointPlot = null;
  blendedPlot = null;
});

watch(
  () => [g1.value, g2.value, g3.value],
  () => {
    if (disjointPlot) disjointPlot.setData(buildDisjoint());
    if (blendedPlot) blendedPlot.setData(buildBlended());
  },
);

watch(
  () => tMax.value,
  () => rebuild(),
);

const blendedSharesText = computed(() => {
  const sum = g1.value + g2.value + g3.value || 1;
  return `${((g1.value / sum) * 100).toFixed(0)}% · ${((g2.value / sum) * 100).toFixed(0)}% · ${((g3.value / sum) * 100).toFixed(0)}%`;
});
</script>

<template>
  <div class="demo">
    <div class="demo-controls">
      <label>
        <span class="demo-label"><span class="dot dot-a" /> mechanic A growth = {{ g1.toFixed(3) }}</span>
        <input
          v-model.number="g1"
          type="range"
          min="0.01"
          max="0.3"
          step="0.005"
        >
      </label>
      <label>
        <span class="demo-label"><span class="dot dot-b" /> mechanic B growth = {{ g2.toFixed(3) }}</span>
        <input
          v-model.number="g2"
          type="range"
          min="0.01"
          max="0.3"
          step="0.005"
        >
      </label>
      <label>
        <span class="demo-label"><span class="dot dot-c" /> mechanic C growth = {{ g3.toFixed(3) }}</span>
        <input
          v-model.number="g3"
          type="range"
          min="0.01"
          max="0.3"
          step="0.005"
        >
      </label>
      <label>
        <span class="demo-label">time horizon = {{ tMax.toFixed(0) }}</span>
        <input
          v-model.number="tMax"
          type="range"
          min="20"
          max="200"
          step="5"
        >
      </label>
    </div>

    <div class="charts">
      <div
        ref="disjointRef"
        class="chart"
      />
      <div
        ref="blendedRef"
        class="chart"
      />
    </div>

    <p class="demo-note">
      Right-panel shares are exactly <code>{{ blendedSharesText }}</code> at every
      <code>t &gt; 0</code> — independent of how long the run goes. Left-panel shares evolve toward
      the fastest-growing mechanic; in the long run the slowest one's share collapses to under 1%
      regardless of where it started. The architectural difference is one symbol:
      <code>+</code> versus <code>×</code>.
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
.charts {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--gap);
}
@media (max-width: 880px) {
  .charts {
    grid-template-columns: 1fr;
  }
}
.chart {
  min-width: 0;
}
.dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 4px;
  vertical-align: middle;
}
.dot-a {
  background: #4a9eff;
}
.dot-b {
  background: #6ec07a;
}
.dot-c {
  background: #d97a7a;
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
:deep(.u-title) {
  color: var(--color-text-muted);
  font-family: var(--font-mono);
  font-size: 0.78rem;
  letter-spacing: 0.04em;
  text-align: center;
  padding: 4px 0 6px;
  text-transform: uppercase;
}
</style>
