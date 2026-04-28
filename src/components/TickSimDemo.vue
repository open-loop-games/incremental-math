<script setup lang="ts">
import { ref, computed } from 'vue';
import { format } from 'open-loop-engine/primitives';

// Tick-sim vs flat-extrapolation: same baseline rate; tick-sim compounds
// at growth-per-hour while the sim runs (clamped to budget). The flat
// extrapolation is what naive "rate × elapsed" gives you. The gap is the
// rate-growth the sim captured.

const hoursMax = ref(24);
const ratePerHour = ref(1000);
const tickRateGrowth = ref(0.08);
const simBudget = ref(12);

const N_SAMPLES = 240;

function flat(t: number): number {
  return ratePerHour.value * t;
}

function tickSim(t: number): number {
  const tEff = Math.min(t, simBudget.value);
  const g = tickRateGrowth.value;
  if (g <= 0) return ratePerHour.value * tEff;
  return (ratePerHour.value / Math.log(1 + g)) * (Math.pow(1 + g, tEff) - 1);
}

const W = 680;
const H = 300;
const PAD = { l: 70, r: 14, t: 12, b: 36 };
const PW = W - PAD.l - PAD.r;
const PH = H - PAD.t - PAD.b;

interface Tick {
  label: string;
  y: number;
}

const yScale = computed(() => {
  let max = 0;
  for (let i = 0; i < N_SAMPLES; i++) {
    const t = (i / (N_SAMPLES - 1)) * hoursMax.value;
    const v = Math.max(flat(t), tickSim(t));
    if (v > max) max = v;
  }
  if (max <= 0) return { toY: () => PAD.t + PH / 2, ticks: [] as Tick[] };
  const yMax = max * 1.05;
  const toY = (v: number): number => PAD.t + (1 - v / yMax) * PH;
  const ticks: Tick[] = [
    { label: format(yMax), y: PAD.t },
    { label: format(yMax * 0.5), y: PAD.t + PH * 0.5 },
    { label: '0', y: PAD.t + PH },
  ];
  return { toY, ticks };
});

function pathFor(curveFn: (t: number) => number): string {
  const xStep = PW / (N_SAMPLES - 1);
  const parts: string[] = [];
  for (let i = 0; i < N_SAMPLES; i++) {
    const t = (i / (N_SAMPLES - 1)) * hoursMax.value;
    const v = curveFn(t);
    if (!Number.isFinite(v)) continue;
    parts.push(
      (parts.length === 0 ? 'M' : 'L') +
        (PAD.l + i * xStep).toFixed(1) +
        ' ' +
        yScale.value.toY(v).toFixed(1),
    );
  }
  return parts.join(' ');
}

const pathFlat = computed(() => pathFor(flat));
const pathSim = computed(() => pathFor(tickSim));
const budgetX = computed(
  () => PAD.l + (Math.min(simBudget.value, hoursMax.value) / hoursMax.value) * PW,
);
const X_TICKS = computed(() => [0, hoursMax.value * 0.5, hoursMax.value].map((v) => Math.round(v)));
function xTickPos(n: number): number {
  return PAD.l + (n / hoursMax.value) * PW;
}

const ratioAtBudget = computed(() => {
  const f = flat(simBudget.value);
  if (f <= 0) return 1;
  return tickSim(simBudget.value) / f;
});
</script>

<template>
  <div class="demo tsd">
    <div class="tsd-controls">
      <label>
        <span class="demo-label">x range = 0..{{ hoursMax.toFixed(0) }} h</span>
        <input
          v-model.number="hoursMax"
          type="range"
          min="3"
          max="168"
          step="1"
        >
      </label>
      <label>
        <span class="demo-label">baseline rate = {{ format(ratePerHour) }} / h</span>
        <input
          v-model.number="ratePerHour"
          type="range"
          min="100"
          max="100000"
          step="100"
        >
      </label>
      <label>
        <span class="demo-label">rate growth = {{ (tickRateGrowth * 100).toFixed(1) }} %/h</span>
        <input
          v-model.number="tickRateGrowth"
          type="range"
          min="0"
          max="0.5"
          step="0.005"
        >
      </label>
      <label>
        <span class="demo-label">sim budget = {{ simBudget.toFixed(1) }} h</span>
        <input
          v-model.number="simBudget"
          type="range"
          :min="0.5"
          :max="hoursMax"
          step="0.5"
        >
      </label>
    </div>
    <p class="tsd-readout">
      At the budget mark, the sim has accrued
      <strong>{{ ratioAtBudget.toFixed(2) }}×</strong> what flat-extrapolation gives — that's the
      rate growth the simulator caught and the naive estimate didn't. Past the budget, the sim line
      goes flat: the simulator stopped running.
    </p>
    <svg
      :viewBox="`0 0 ${W} ${H}`"
      class="tsd-chart"
      role="img"
      aria-label="Tick simulation vs flat extrapolation"
    >
      <line
        :x1="PAD.l"
        :y1="PAD.t"
        :x2="PAD.l"
        :y2="PAD.t + PH"
        class="tsd-axis"
      />
      <line
        :x1="PAD.l"
        :y1="PAD.t + PH"
        :x2="W - PAD.r"
        :y2="PAD.t + PH"
        class="tsd-axis"
      />
      <g
        v-for="t in yScale.ticks"
        :key="t.label"
      >
        <line
          :x1="PAD.l"
          :y1="t.y"
          :x2="W - PAD.r"
          :y2="t.y"
          class="tsd-grid"
        />
        <text
          :x="PAD.l - 8"
          :y="t.y + 3"
          text-anchor="end"
          class="tsd-tick"
        >{{ t.label }}</text>
      </g>
      <text
        v-for="nx in X_TICKS"
        :key="nx"
        :x="xTickPos(nx)"
        :y="H - PAD.b + 16"
        text-anchor="middle"
        class="tsd-tick"
      >
        {{ nx }}
      </text>
      <text
        :x="PAD.l + PW / 2"
        :y="H - 4"
        text-anchor="middle"
        class="tsd-tick"
      >hours away</text>
      <line
        v-if="simBudget < hoursMax"
        :x1="budgetX"
        :x2="budgetX"
        :y1="PAD.t"
        :y2="PAD.t + PH"
        class="tsd-budget"
      />
      <text
        v-if="simBudget < hoursMax"
        :x="budgetX + 4"
        :y="PAD.t + 12"
        class="tsd-budget-label"
      >
        sim budget
      </text>
      <path
        :d="pathFlat"
        class="tsd-line tsd-flat"
      />
      <path
        :d="pathSim"
        class="tsd-line tsd-sim"
      />
    </svg>
    <p class="tsd-legend">
      <span class="tsd-swatch tsd-sim-swatch" /> tick simulation
      <span class="tsd-swatch tsd-flat-swatch" /> flat <code>rate × t</code>
    </p>
  </div>
</template>

<style scoped>
.tsd-controls {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--gap);
}
.tsd-readout {
  font-family: var(--font-mono);
  font-size: 0.9em;
  color: var(--color-text-muted);
  margin: var(--gap) 0;
}
.tsd-chart {
  width: 100%;
  height: auto;
  display: block;
  font-family: var(--font-mono);
}
.tsd-axis {
  stroke: var(--color-border);
  stroke-width: 1;
}
.tsd-grid {
  stroke: var(--color-border);
  stroke-width: 0.5;
  stroke-dasharray: 2 3;
  opacity: 0.6;
}
.tsd-tick {
  fill: var(--color-text-muted);
  font-size: 11px;
}
.tsd-line {
  fill: none;
  stroke-width: 1.75;
  vector-effect: non-scaling-stroke;
}
.tsd-sim {
  stroke: #6ec07a;
}
.tsd-flat {
  stroke: #9aa0a6;
  stroke-dasharray: 4 3;
  opacity: 0.7;
}
.tsd-budget {
  stroke: var(--color-text-muted);
  stroke-width: 0.75;
  stroke-dasharray: 4 3;
  opacity: 0.6;
}
.tsd-budget-label {
  fill: var(--color-text-muted);
  font-size: 10px;
  letter-spacing: 0.04em;
}
.tsd-legend {
  font-family: var(--font-mono);
  font-size: 0.8em;
  color: var(--color-text-muted);
  display: flex;
  gap: var(--gap);
  margin-top: calc(var(--gap) / 2);
}
.tsd-swatch {
  display: inline-block;
  width: 16px;
  height: 3px;
  border-radius: 2px;
  margin-right: 4px;
  vertical-align: middle;
}
.tsd-sim-swatch {
  background: #6ec07a;
}
.tsd-flat-swatch {
  background: #9aa0a6;
}
</style>
