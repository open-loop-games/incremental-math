<script setup lang="ts">
import { ref, computed } from 'vue';
import { seriesPalette, seriesColor } from '../lib/series-colors';

// Iterated power-root model: layer-k currency at game time t is t^(alpha^k).
// Plotted on log-log axes, each layer is a straight line whose slope is alpha^k.
// alpha < 1 — sqrt is alpha=0.5, cube root 0.333, AD's IP formula ~0.003.
// The pedagogical point is the slope-thinning at higher layers, not absolute
// magnitude — multiplicative constants per layer (AD's "0.75" offset, etc.) are
// dropped on purpose so the lines stay anchored at (1, 1).

const PRESETS = [
  { id: 'sqrt', label: 'square root', alpha: 0.5 },
  { id: 'cube', label: 'cube root', alpha: 1 / 3 },
  { id: 'ad', label: 'AD-style (1/308)', alpha: 1 / 308 },
] as const;

const layerCount = ref(4);
const alphaIdx = ref(0); // index into PRESETS
const tMaxExp = ref(20);
const cursorExp = ref(15);

const alpha = computed(() => PRESETS[alphaIdx.value].alpha);

const W = 720;
const H = 360;
const PAD = { l: 64, r: 144, t: 14, b: 42 };
const PW = W - PAD.l - PAD.r;
const PH = H - PAD.t - PAD.b;

const N_T = 160;
const tExps = computed<number[]>(() => {
  const a = 0;
  const b = tMaxExp.value;
  return Array.from({ length: N_T }, (_, i) => a + ((b - a) * i) / (N_T - 1));
});

interface Series {
  k: number;
  alphaK: number;
  pts: { tExp: number; vExp: number }[];
}

const series = computed<Series[]>(() => {
  const out: Series[] = [];
  for (let k = 0; k <= layerCount.value; k++) {
    const alphaK = Math.pow(alpha.value, k);
    out.push({
      k,
      alphaK,
      pts: tExps.value.map((te) => ({ tExp: te, vExp: te * alphaK })),
    });
  }
  return out;
});

const yMaxExp = computed(() => Math.max(1, tMaxExp.value));

function xToPx(tExp: number): number {
  return PAD.l + (tExp / Math.max(1e-9, tMaxExp.value)) * PW;
}
function yToPx(vExp: number): number {
  const clamped = Math.max(0, Math.min(vExp, yMaxExp.value));
  return PAD.t + (1 - clamped / yMaxExp.value) * PH;
}

function pathFor(s: Series): string {
  const parts: string[] = [];
  for (let i = 0; i < s.pts.length; i++) {
    const p = s.pts[i];
    const x = xToPx(p.tExp);
    const y = yToPx(p.vExp);
    parts.push((i === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1));
  }
  return parts.join(' ');
}

const xTicks = computed(() => {
  const m = tMaxExp.value;
  const step = m <= 6 ? 1 : m <= 12 ? 2 : m <= 24 ? 4 : 6;
  const out: number[] = [];
  for (let v = 0; v <= m + 1e-9; v += step) out.push(v);
  return out;
});

const yTicks = computed(() => {
  const m = yMaxExp.value;
  const step = m <= 6 ? 1 : m <= 12 ? 2 : m <= 24 ? 4 : 6;
  const out: number[] = [];
  for (let v = 0; v <= m + 1e-9; v += step) out.push(v);
  return out;
});

const cursorVals = computed(() => {
  const te = Math.min(cursorExp.value, tMaxExp.value);
  return series.value.map((s) => ({
    k: s.k,
    alphaK: s.alphaK,
    tExp: te,
    vExp: te * s.alphaK,
  }));
});

const COLORS = [...seriesPalette(5), seriesColor('gray')];

function fmtExp(e: number): string {
  if (e < 0.005) return '~1';
  if (e < 1) return `10^${e.toFixed(2)}`;
  return `10^${e.toFixed(1)}`;
}

function fmtAlphaK(a: number): string {
  if (a >= 0.01) return a.toFixed(3);
  return a.toExponential(1);
}
</script>

<template>
  <div class="demo lpc">
    <div class="lpc-controls">
      <label>
        <span class="demo-label">layers shown = {{ layerCount }}</span>
        <input v-model.number="layerCount" type="range" min="1" max="5" step="1" />
      </label>
      <label>
        <span class="demo-label">
          per-layer formula:
          <strong>{{ PRESETS[alphaIdx].label }}</strong>
          (α = {{ fmtAlphaK(alpha) }})
        </span>
        <div class="lpc-presets">
          <button
            v-for="(p, i) in PRESETS"
            :key="p.id"
            type="button"
            class="lpc-preset"
            :class="{ 'lpc-preset-active': alphaIdx === i }"
            @click="alphaIdx = i"
          >
            {{ p.label }}
          </button>
        </div>
      </label>
      <label>
        <span class="demo-label">total game time = 10^{{ tMaxExp }}</span>
        <input v-model.number="tMaxExp" type="range" min="6" max="30" step="1" />
      </label>
      <label>
        <span class="demo-label">slice at t = 10^{{ cursorExp.toFixed(0) }}</span>
        <input v-model.number="cursorExp" type="range" min="0" :max="tMaxExp" step="1" />
      </label>
    </div>

    <svg
      :viewBox="`0 0 ${W} ${H}`"
      class="lpc-chart"
      role="img"
      aria-label="Layer-k currency vs total game time on log-log axes"
    >
      <line :x1="PAD.l" :y1="PAD.t" :x2="PAD.l" :y2="PAD.t + PH" class="lpc-axis" />
      <line :x1="PAD.l" :y1="PAD.t + PH" :x2="PAD.l + PW" :y2="PAD.t + PH" class="lpc-axis" />

      <g>
        <g v-for="t in yTicks" :key="`y-${t}`">
          <line :x1="PAD.l" :y1="yToPx(t)" :x2="PAD.l + PW" :y2="yToPx(t)" class="lpc-grid" />
          <text :x="PAD.l - 8" :y="yToPx(t) + 3" text-anchor="end" class="lpc-tick">
            10^{{ t }}
          </text>
        </g>
      </g>

      <g>
        <g v-for="t in xTicks" :key="`x-${t}`">
          <line :x1="xToPx(t)" :y1="PAD.t" :x2="xToPx(t)" :y2="PAD.t + PH" class="lpc-grid" />
          <text :x="xToPx(t)" :y="PAD.t + PH + 16" text-anchor="middle" class="lpc-tick">
            10^{{ t }}
          </text>
        </g>
      </g>

      <text :x="PAD.l + PW / 2" :y="H - 6" text-anchor="middle" class="lpc-axis-label">
        total game time
      </text>
      <text
        :x="14"
        :y="PAD.t + PH / 2"
        text-anchor="middle"
        class="lpc-axis-label"
        :transform="`rotate(-90 14 ${PAD.t + PH / 2})`"
      >
        currency at this layer
      </text>

      <g>
        <path
          v-for="s in series"
          :key="s.k"
          :d="pathFor(s)"
          :stroke="COLORS[s.k % COLORS.length]"
          class="lpc-line"
        />
      </g>

      <line
        :x1="xToPx(cursorExp)"
        :y1="PAD.t"
        :x2="xToPx(cursorExp)"
        :y2="PAD.t + PH"
        class="lpc-slice"
      />
      <g>
        <circle
          v-for="v in cursorVals"
          :key="`d-${v.k}`"
          :cx="xToPx(v.tExp)"
          :cy="yToPx(v.vExp)"
          r="3.5"
          :fill="COLORS[v.k % COLORS.length]"
          stroke="var(--color-bg)"
          stroke-width="1"
        />
      </g>

      <g>
        <g
          v-for="(v, i) in cursorVals"
          :key="`l-${v.k}`"
          :transform="`translate(${PAD.l + PW + 12} ${PAD.t + 8 + i * 22})`"
        >
          <line
            x1="0"
            x2="14"
            y1="-4"
            y2="-4"
            :stroke="COLORS[v.k % COLORS.length]"
            stroke-width="2.5"
          />
          <text x="20" y="0" class="lpc-legend-name">layer {{ v.k }}</text>
          <text x="20" y="12" class="lpc-legend-y">{{ fmtExp(v.vExp) }}</text>
        </g>
      </g>
    </svg>

    <p class="lpc-readout">
      Each layer's slope on log-log axes is α<sup>k</sup>. With α =
      {{ fmtAlphaK(alpha) }}, layer 1 has slope {{ fmtAlphaK(alpha) }} and layer
      {{ layerCount }} has slope {{ fmtAlphaK(Math.pow(alpha, layerCount)) }} — the higher you
      climb, the more total game time it takes to push the line up by a single decade.
    </p>
  </div>
</template>

<style scoped>
.lpc-controls {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--gap);
  margin-bottom: var(--gap);
}

.lpc-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 4px;
}

.lpc-preset {
  padding: 3px 10px;
  font-size: 0.78em;
  font-family: var(--font-mono);
  background: transparent;
  color: var(--color-text-muted);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  cursor: pointer;
}

.lpc-preset:hover {
  color: var(--color-text);
}

.lpc-preset-active {
  color: var(--color-text);
  border-color: var(--color-text);
}

.lpc-chart {
  width: 100%;
  height: auto;
  display: block;
  font-family: var(--font-mono);
}

.lpc-axis {
  stroke: var(--color-border);
  stroke-width: 1;
}

.lpc-grid {
  stroke: var(--color-border);
  stroke-width: 0.5;
  stroke-dasharray: 2 3;
  opacity: 0.5;
}

.lpc-tick {
  fill: var(--color-text-muted);
  font-size: 11px;
}

.lpc-axis-label {
  fill: var(--color-text-muted);
  font-size: 11px;
}

.lpc-line {
  fill: none;
  stroke-width: 1.75;
  vector-effect: non-scaling-stroke;
}

.lpc-slice {
  stroke: var(--color-text-muted);
  stroke-width: 1;
  stroke-dasharray: 3 3;
  opacity: 0.6;
}

.lpc-legend-name {
  fill: var(--color-text);
  font-size: 11px;
  font-weight: 600;
}

.lpc-legend-y {
  fill: var(--color-text-muted);
  font-size: 10px;
}

.lpc-readout {
  margin-top: var(--gap-sm);
  font-family: var(--font-mono);
  font-size: 0.85em;
  color: var(--color-text-muted);
}
</style>
