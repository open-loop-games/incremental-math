<script setup lang="ts">
import { ref, computed } from 'vue';
import { format } from '../lib/decimal';

// One-curve hard-cap demo: gain accrues at rate × pct up to cap hours,
// then flat. The lesson is the discontinuous slope at the cap.

const hoursMax = ref(48);
const ratePerHour = ref(1000);
const offlineCap = ref(8);
const offlinePct = ref(50);

const N_SAMPLES = 240;

function fn(t: number): number {
  return ratePerHour.value * (offlinePct.value / 100) * Math.min(t, offlineCap.value);
}

function uncapped(t: number): number {
  return ratePerHour.value * t;
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
    const v = Math.max(fn(t), uncapped(t));
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

const pathSoft = computed(() => pathFor(fn));
const pathLinear = computed(() => pathFor(uncapped));
const capX = computed(
  () => PAD.l + (Math.min(offlineCap.value, hoursMax.value) / hoursMax.value) * PW,
);
const X_TICKS = computed(() => [0, hoursMax.value * 0.5, hoursMax.value].map((v) => Math.round(v)));
function xTickPos(n: number): number {
  return PAD.l + (n / hoursMax.value) * PW;
}

const earnedAtCap = computed(() => fn(offlineCap.value));
const earnedFullSpan = computed(() => fn(hoursMax.value));
</script>

<template>
  <div class="demo hcd">
    <div class="hcd-controls">
      <label>
        <span class="demo-label">x range = 0..{{ hoursMax.toFixed(0) }} h away</span>
        <input
          v-model.number="hoursMax"
          type="range"
          min="3"
          max="168"
          step="1"
        >
      </label>
      <label>
        <span class="demo-label">online rate = {{ format(ratePerHour) }} / h</span>
        <input
          v-model.number="ratePerHour"
          type="range"
          min="100"
          max="100000"
          step="100"
        >
      </label>
      <label>
        <span class="demo-label">offline cap = {{ offlineCap.toFixed(1) }} h</span>
        <input
          v-model.number="offlineCap"
          type="range"
          min="0.5"
          max="72"
          step="0.5"
        >
      </label>
      <label>
        <span class="demo-label">offline rate = {{ offlinePct.toFixed(0) }} % of online</span>
        <input
          v-model.number="offlinePct"
          type="range"
          min="5"
          max="100"
          step="1"
        >
      </label>
    </div>
    <p class="hcd-readout">
      At the cap: <strong>{{ format(earnedAtCap) }}</strong>. Across the full {{ hoursMax.toFixed(0) }} h window:
      <strong>{{ format(earnedFullSpan) }}</strong> — same number; the slope dies at the cap.
    </p>
    <svg
      :viewBox="`0 0 ${W} ${H}`"
      class="hcd-chart"
      role="img"
      aria-label="Hard-cap offline gain"
    >
      <line
        :x1="PAD.l"
        :y1="PAD.t"
        :x2="PAD.l"
        :y2="PAD.t + PH"
        class="hcd-axis"
      />
      <line
        :x1="PAD.l"
        :y1="PAD.t + PH"
        :x2="W - PAD.r"
        :y2="PAD.t + PH"
        class="hcd-axis"
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
          class="hcd-grid"
        />
        <text
          :x="PAD.l - 8"
          :y="t.y + 3"
          text-anchor="end"
          class="hcd-tick"
        >{{ t.label }}</text>
      </g>
      <text
        v-for="nx in X_TICKS"
        :key="nx"
        :x="xTickPos(nx)"
        :y="H - PAD.b + 16"
        text-anchor="middle"
        class="hcd-tick"
      >
        {{ nx }}
      </text>
      <text
        :x="PAD.l + PW / 2"
        :y="H - 4"
        text-anchor="middle"
        class="hcd-tick"
      >hours away</text>
      <line
        v-if="offlineCap < hoursMax"
        :x1="capX"
        :x2="capX"
        :y1="PAD.t"
        :y2="PAD.t + PH"
        class="hcd-cap"
      />
      <text
        v-if="offlineCap < hoursMax"
        :x="capX + 4"
        :y="PAD.t + 12"
        class="hcd-cap-label"
      >
        cap
      </text>
      <path
        :d="pathLinear"
        class="hcd-line hcd-linear"
      />
      <path
        :d="pathSoft"
        class="hcd-line hcd-soft"
      />
    </svg>
  </div>
</template>

<style scoped>
.hcd-controls {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--gap);
}
.hcd-readout {
  font-family: var(--font-mono);
  font-size: 0.9em;
  color: var(--color-text-muted);
  margin: var(--gap) 0;
}
.hcd-chart {
  width: 100%;
  height: auto;
  display: block;
  font-family: var(--font-mono);
}
.hcd-axis {
  stroke: var(--color-border);
  stroke-width: 1;
}
.hcd-grid {
  stroke: var(--color-border);
  stroke-width: 0.5;
  stroke-dasharray: 2 3;
  opacity: 0.6;
}
.hcd-tick {
  fill: var(--color-text-muted);
  font-size: 11px;
}
.hcd-line {
  fill: none;
  stroke-width: 1.75;
  vector-effect: non-scaling-stroke;
}
.hcd-soft {
  stroke: #d97a7a;
}
.hcd-linear {
  stroke: #9aa0a6;
  stroke-dasharray: 4 3;
  opacity: 0.6;
}
.hcd-cap {
  stroke: var(--color-text-muted);
  stroke-width: 0.75;
  stroke-dasharray: 4 3;
  opacity: 0.6;
}
.hcd-cap-label {
  fill: var(--color-text-muted);
  font-size: 10px;
  letter-spacing: 0.04em;
}
</style>
