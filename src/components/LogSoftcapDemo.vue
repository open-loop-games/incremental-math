<script setup lang="ts">
import { ref, computed } from 'vue';
import { format } from 'open-loop-engine/primitives';

const xMax = ref(10000);
const threshold = ref(1000);
const logK = ref(40);

const N_SAMPLES = 256;

function fn(x: number): number {
  if (x <= threshold.value) return x;
  return threshold.value + logK.value * Math.log10(x - threshold.value + 1);
}

const W = 640;
const H = 280;
const PAD = { l: 60, r: 14, t: 12, b: 32 };
const PW = W - PAD.l - PAD.r;
const PH = H - PAD.t - PAD.b;

interface Tick {
  label: string;
  y: number;
}

const yScale = computed(() => {
  let max = 0;
  for (let i = 0; i < N_SAMPLES; i++) {
    const x = (i / (N_SAMPLES - 1)) * xMax.value;
    const v = Math.max(fn(x), x);
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

function pathFor(curveFn: (x: number) => number): string {
  const xStep = PW / (N_SAMPLES - 1);
  const parts: string[] = [];
  for (let i = 0; i < N_SAMPLES; i++) {
    const x = (i / (N_SAMPLES - 1)) * xMax.value;
    const y = curveFn(x);
    if (!Number.isFinite(y)) continue;
    parts.push(
      (parts.length === 0 ? 'M' : 'L') +
        (PAD.l + i * xStep).toFixed(1) +
        ' ' +
        yScale.value.toY(y).toFixed(1),
    );
  }
  return parts.join(' ');
}

const pathSoft = computed(() => pathFor(fn));
const pathLinear = computed(() => pathFor((x) => x));
const thresholdX = computed(() => PAD.l + (threshold.value / xMax.value) * PW);
const X_TICKS = computed(() => [0, xMax.value * 0.5, xMax.value].map((v) => Math.round(v)));
function xTickPos(n: number): number {
  return PAD.l + (n / xMax.value) * PW;
}
</script>

<template>
  <div class="demo lsd">
    <div class="lsd-controls">
      <label>
        <span class="demo-label">x range = 0..{{ xMax.toFixed(0) }}</span>
        <input
          v-model.number="xMax"
          type="range"
          min="1000"
          max="1000000"
          step="1000"
        >
      </label>
      <label>
        <span class="demo-label">threshold = {{ threshold.toFixed(0) }}</span>
        <input
          v-model.number="threshold"
          type="range"
          :min="100"
          :max="xMax"
          step="10"
        >
      </label>
      <label>
        <span class="demo-label">log strength k = {{ logK.toFixed(0) }}</span>
        <input
          v-model.number="logK"
          type="range"
          min="1"
          max="500"
          step="1"
        >
      </label>
    </div>
    <p class="lsd-formula">
      <code>y = threshold + {{ logK.toFixed(0) }} · log₁₀(x − threshold + 1)</code>
      <span class="lsd-aside">past threshold; below it, <code>y = x</code></span>
    </p>
    <svg
      :viewBox="`0 0 ${W} ${H}`"
      class="lsd-chart"
      role="img"
      aria-label="Log softcap"
    >
      <line
        :x1="PAD.l"
        :y1="PAD.t"
        :x2="PAD.l"
        :y2="PAD.t + PH"
        class="lsd-axis"
      />
      <line
        :x1="PAD.l"
        :y1="PAD.t + PH"
        :x2="W - PAD.r"
        :y2="PAD.t + PH"
        class="lsd-axis"
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
          class="lsd-grid"
        />
        <text
          :x="PAD.l - 8"
          :y="t.y + 3"
          text-anchor="end"
          class="lsd-tick"
        >{{ t.label }}</text>
      </g>
      <text
        v-for="nx in X_TICKS"
        :key="nx"
        :x="xTickPos(nx)"
        :y="H - PAD.b + 16"
        text-anchor="middle"
        class="lsd-tick"
      >
        {{ nx }}
      </text>
      <line
        :x1="thresholdX"
        :x2="thresholdX"
        :y1="PAD.t"
        :y2="PAD.t + PH"
        class="lsd-threshold"
      />
      <text
        :x="thresholdX + 4"
        :y="PAD.t + 12"
        class="lsd-threshold-label"
      >threshold</text>
      <path
        :d="pathLinear"
        class="lsd-line lsd-linear"
      />
      <path
        :d="pathSoft"
        class="lsd-line lsd-soft"
      />
    </svg>
    <p class="lsd-legend">
      <span class="lsd-swatch lsd-soft-swatch" /> log softcap
      <span class="lsd-swatch lsd-linear-swatch" /> uncapped <code>y = x</code> reference
    </p>
  </div>
</template>

<style scoped>
.lsd-controls {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--gap);
}
.lsd-formula {
  font-family: var(--font-mono);
  font-size: 0.9em;
  color: var(--color-text-muted);
  margin: var(--gap) 0 calc(var(--gap) / 2);
}
.lsd-aside {
  margin-left: 0.6em;
  font-style: italic;
}
.lsd-chart {
  width: 100%;
  height: auto;
  display: block;
  font-family: var(--font-mono);
}
.lsd-axis {
  stroke: var(--color-border);
  stroke-width: 1;
}
.lsd-grid {
  stroke: var(--color-border);
  stroke-width: 0.5;
  stroke-dasharray: 2 3;
  opacity: 0.6;
}
.lsd-tick {
  fill: var(--color-text-muted);
  font-size: 11px;
}
.lsd-line {
  fill: none;
  stroke-width: 1.75;
  vector-effect: non-scaling-stroke;
}
.lsd-soft {
  stroke: #d97a7a;
}
.lsd-linear {
  stroke: #9aa0a6;
  stroke-dasharray: 4 3;
  opacity: 0.7;
}
.lsd-threshold {
  stroke: var(--color-text-muted);
  stroke-width: 0.75;
  stroke-dasharray: 4 3;
  opacity: 0.6;
}
.lsd-threshold-label {
  fill: var(--color-text-muted);
  font-size: 10px;
  letter-spacing: 0.04em;
}
.lsd-legend {
  font-family: var(--font-mono);
  font-size: 0.8em;
  color: var(--color-text-muted);
  display: flex;
  gap: var(--gap);
  margin-top: calc(var(--gap) / 2);
}
.lsd-swatch {
  display: inline-block;
  width: 16px;
  height: 3px;
  border-radius: 2px;
  margin-right: 4px;
  vertical-align: middle;
}
.lsd-soft-swatch {
  background: #d97a7a;
}
.lsd-linear-swatch {
  background: #9aa0a6;
}
</style>
