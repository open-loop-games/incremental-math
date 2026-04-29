<script setup lang="ts">
import { ref, computed } from 'vue';
import { format } from '../lib/decimal';

const xMax = ref(1000);
const threshold = ref(300);
const slope1 = ref(1);
const slope2 = ref(0.15);

const N_SAMPLES = 256;

function fn(x: number): number {
  if (x <= threshold.value) return slope1.value * x;
  return slope1.value * threshold.value + slope2.value * (x - threshold.value);
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
    const v = Math.max(fn(x), slope1.value * x);
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
const pathLinear = computed(() => pathFor((x) => slope1.value * x));
const thresholdX = computed(() => PAD.l + (threshold.value / xMax.value) * PW);
const jointX = computed(() => thresholdX.value);
const jointY = computed(() => yScale.value.toY(slope1.value * threshold.value));
const X_TICKS = computed(() => [0, xMax.value * 0.5, xMax.value].map((v) => Math.round(v)));
function xTickPos(n: number): number {
  return PAD.l + (n / xMax.value) * PW;
}
</script>

<template>
  <div class="demo psd">
    <div class="psd-controls">
      <label>
        <span class="demo-label">x range = 0..{{ xMax.toFixed(0) }}</span>
        <input v-model.number="xMax" type="range" min="100" max="100000" step="100" />
      </label>
      <label>
        <span class="demo-label">threshold = {{ threshold.toFixed(0) }}</span>
        <input v-model.number="threshold" type="range" :min="10" :max="xMax" step="1" />
      </label>
      <label>
        <span class="demo-label">pre-slope m₁ = {{ slope1.toFixed(2) }}</span>
        <input v-model.number="slope1" type="range" min="0.1" max="2" step="0.05" />
      </label>
      <label>
        <span class="demo-label">post-slope m₂ = {{ slope2.toFixed(2) }}</span>
        <input v-model.number="slope2" type="range" min="0" max="1" step="0.01" />
      </label>
    </div>
    <p class="psd-formula">
      <code>y = m₁·x</code> for <code>x ≤ threshold</code>, else
      <code>m₁·threshold + m₂·(x − threshold)</code>
      <span class="psd-aside"
        >continuous at the joint, slope drops from {{ slope1.toFixed(2) }} to
        {{ slope2.toFixed(2) }}</span
      >
    </p>
    <svg :viewBox="`0 0 ${W} ${H}`" class="psd-chart" role="img" aria-label="Piecewise softcap">
      <line :x1="PAD.l" :y1="PAD.t" :x2="PAD.l" :y2="PAD.t + PH" class="psd-axis" />
      <line :x1="PAD.l" :y1="PAD.t + PH" :x2="W - PAD.r" :y2="PAD.t + PH" class="psd-axis" />
      <g v-for="t in yScale.ticks" :key="t.label">
        <line :x1="PAD.l" :y1="t.y" :x2="W - PAD.r" :y2="t.y" class="psd-grid" />
        <text :x="PAD.l - 8" :y="t.y + 3" text-anchor="end" class="psd-tick">{{ t.label }}</text>
      </g>
      <text
        v-for="nx in X_TICKS"
        :key="nx"
        :x="xTickPos(nx)"
        :y="H - PAD.b + 16"
        text-anchor="middle"
        class="psd-tick"
      >
        {{ nx }}
      </text>
      <line :x1="thresholdX" :x2="thresholdX" :y1="PAD.t" :y2="PAD.t + PH" class="psd-threshold" />
      <text :x="thresholdX + 4" :y="PAD.t + 12" class="psd-threshold-label">threshold</text>
      <path :d="pathLinear" class="psd-line psd-linear" />
      <path :d="pathSoft" class="psd-line psd-soft" />
      <circle :cx="jointX" :cy="jointY" r="3.5" class="psd-joint" />
    </svg>
    <p class="psd-legend">
      <span class="psd-swatch psd-soft-swatch" /> piecewise
      <span class="psd-swatch psd-linear-swatch" /> pre-threshold slope continued
    </p>
  </div>
</template>

<style scoped>
.psd-controls {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--gap);
}
.psd-formula {
  font-family: var(--font-mono);
  font-size: 0.9em;
  color: var(--color-text-muted);
  margin: var(--gap) 0 calc(var(--gap) / 2);
}
.psd-aside {
  margin-left: 0.6em;
  font-style: italic;
}
.psd-chart {
  width: 100%;
  height: auto;
  display: block;
  font-family: var(--font-mono);
}
.psd-axis {
  stroke: var(--color-border);
  stroke-width: 1;
}
.psd-grid {
  stroke: var(--color-border);
  stroke-width: 0.5;
  stroke-dasharray: 2 3;
  opacity: 0.6;
}
.psd-tick {
  fill: var(--color-text-muted);
  font-size: 11px;
}
.psd-line {
  fill: none;
  stroke-width: 1.75;
  vector-effect: non-scaling-stroke;
}
.psd-soft {
  stroke: #c08acb;
}
.psd-linear {
  stroke: #9aa0a6;
  stroke-dasharray: 4 3;
  opacity: 0.6;
}
.psd-threshold {
  stroke: var(--color-text-muted);
  stroke-width: 0.75;
  stroke-dasharray: 4 3;
  opacity: 0.6;
}
.psd-threshold-label {
  fill: var(--color-text-muted);
  font-size: 10px;
  letter-spacing: 0.04em;
}
.psd-joint {
  fill: #c08acb;
  stroke: var(--color-bg, #0a0a0a);
  stroke-width: 1;
}
.psd-legend {
  font-family: var(--font-mono);
  font-size: 0.8em;
  color: var(--color-text-muted);
  display: flex;
  gap: var(--gap);
  margin-top: calc(var(--gap) / 2);
}
.psd-swatch {
  display: inline-block;
  width: 16px;
  height: 3px;
  border-radius: 2px;
  margin-right: 4px;
  vertical-align: middle;
}
.psd-soft-swatch {
  background: #c08acb;
}
.psd-linear-swatch {
  background: #9aa0a6;
}
</style>
