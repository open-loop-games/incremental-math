<script setup lang="ts">
import { ref, computed } from 'vue';

// AD-style scaling-past-threshold cost. Math is faithful to
// AntimatterDimensionsSourceCode/src/core/math.js:380-385 — it runs entirely in
// log10 space, which is the substrate trick the big-numbers page covers.
//
// Pure exponential:
//   log10(cost) = n * log10(mult) + log10(base)
//
// AD scaling-past-threshold (excess = n − threshold):
//   log10(cost) = n * log10(mult) + log10(base) + 0.5 * excess * (excess+1) * log10(scale)
//
// Both curves share their first segment; the parabolic term only fires past
// the threshold. We never construct the actual cost as a number — the chart is
// log10 versus purchases, which is the whole point.

const baseCost = ref(10); // matches AD1's first-cost
const mult = ref(1000); // matches AD1's per-purchase multiplier (1e3)
const costScale = ref(10); // AD's default dimensionMultDecrease
const threshold = ref(40); // pre-scaling purchases — small for demo readability
const showAccel = ref(true);
const cursorN = ref(60);

const N_MAX = 120;

interface Sample {
  n: number;
  logFlat: number;
  logAccel: number;
}

const samples = computed<Sample[]>(() => {
  const logBase = Math.log10(baseCost.value);
  const logMult = Math.log10(mult.value);
  const logScale = Math.log10(costScale.value);
  const t = threshold.value;
  const out: Sample[] = [];
  for (let n = 0; n <= N_MAX; n++) {
    const logFlat = n * logMult + logBase;
    const excess = n - t;
    const logAccel =
      excess > 0 ? logFlat + 0.5 * excess * (excess + 1) * logScale : logFlat;
    out.push({ n, logFlat, logAccel });
  }
  return out;
});

const cursorSample = computed<Sample>(() => {
  const i = Math.min(N_MAX, Math.max(0, cursorN.value));
  return samples.value[i];
});

const W = 640;
const H = 360;
const PAD = { l: 64, r: 16, t: 14, b: 36 };
const PW = W - PAD.l - PAD.r;
const PH = H - PAD.t - PAD.b;

const yRange = computed(() => {
  let max = 0;
  for (const s of samples.value) {
    const v = showAccel.value ? Math.max(s.logFlat, s.logAccel) : s.logFlat;
    if (Number.isFinite(v) && v > max) max = v;
  }
  // Snap upward so y-axis ticks land on whole exponents.
  const snapped = Math.max(10, Math.ceil(max / 50) * 50);
  return { min: 0, max: snapped };
});

function toY(logV: number): number {
  const r = yRange.value;
  const span = r.max - r.min;
  const clamped = Math.min(r.max, Math.max(r.min, logV));
  return PAD.t + (1 - (clamped - r.min) / span) * PH;
}

function toX(n: number): number {
  return PAD.l + (n / N_MAX) * PW;
}

function buildPath(pick: 'flat' | 'accel'): string {
  const r = yRange.value;
  const parts: string[] = [];
  let started = false;
  for (const s of samples.value) {
    const v = pick === 'flat' ? s.logFlat : s.logAccel;
    if (!Number.isFinite(v)) continue;
    const x = toX(s.n);
    const y = toY(v);
    parts.push((started ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1));
    started = true;
    // Stop drawing once we've gone off-chart at the top — keeps the parabola
    // from re-entering the plot when log10(cost) wraps past the y-axis cap.
    if (v > r.max) break;
  }
  return parts.join(' ');
}

const flatPath = computed(() => buildPath('flat'));
const accelPath = computed(() => buildPath('accel'));

const yTicks = computed<{ label: string; y: number }[]>(() => {
  const { min, max } = yRange.value;
  const span = max - min;
  const steps = 6;
  const step = Math.ceil(span / steps / 5) * 5;
  const out: { label: string; y: number }[] = [];
  for (let v = min; v <= max + 0.5; v += step) {
    out.push({ label: `1e${v}`, y: toY(v) });
  }
  return out;
});

const X_TICKS = [0, 30, 60, 90, 120];

const thresholdX = computed(() => toX(threshold.value));
const cursorX = computed(() => toX(cursorN.value));
const cursorYFlat = computed(() => toY(cursorSample.value.logFlat));
const cursorYAccel = computed(() => toY(cursorSample.value.logAccel));

function fmtLog(logV: number): string {
  if (!Number.isFinite(logV)) return '∞';
  if (logV < 6) return Math.pow(10, logV).toExponential(2);
  // For larger values, "1eN" form reads more directly than "X.YeN".
  const exp = Math.floor(logV);
  const m = Math.pow(10, logV - exp);
  return `${m.toFixed(2)}e${exp}`;
}
</script>

<template>
  <div class="demo cac">
    <div class="cac-controls">
      <label>
        <span class="demo-label">base cost = {{ baseCost }}</span>
        <input type="range" v-model.number="baseCost" min="1" max="1000" step="1" />
      </label>
      <label>
        <span class="demo-label">per-purchase multiplier = {{ mult }}×</span>
        <input type="range" v-model.number="mult" min="2" max="10000" step="1" />
      </label>
      <label>
        <span class="demo-label">scaling factor = {{ costScale }}×</span>
        <input type="range" v-model.number="costScale" min="1.5" max="100" step="0.5" />
      </label>
      <label>
        <span class="demo-label">threshold (purchases before scaling) = {{ threshold }}</span>
        <input type="range" v-model.number="threshold" min="0" :max="N_MAX" step="1" />
      </label>
      <label>
        <span class="demo-label">cursor at n = {{ cursorN }}</span>
        <input type="range" v-model.number="cursorN" min="0" :max="N_MAX" step="1" />
      </label>
      <label class="cac-toggle">
        <input type="checkbox" v-model="showAccel" />
        show scaling curve
      </label>
    </div>

    <div class="cac-legend">
      <span class="cac-legend-item"><span class="cac-swatch cac-swatch-flat" /> pure exponential (Pecorella)</span>
      <span v-if="showAccel" class="cac-legend-item"><span class="cac-swatch cac-swatch-accel" /> scaling past threshold (AD)</span>
      <span class="cac-legend-item cac-legend-threshold"><span class="cac-swatch cac-swatch-threshold" /> threshold</span>
    </div>

    <svg :viewBox="`0 0 ${W} ${H}`" class="cac-chart" role="img" aria-label="Pure exponential vs scaling-past-threshold cost curves">
      <line :x1="PAD.l" :y1="PAD.t" :x2="PAD.l" :y2="PAD.t + PH" class="cac-axis" />
      <line :x1="PAD.l" :y1="PAD.t + PH" :x2="W - PAD.r" :y2="PAD.t + PH" class="cac-axis" />
      <g>
        <g v-for="t in yTicks" :key="t.label">
          <line :x1="PAD.l" :y1="t.y" :x2="W - PAD.r" :y2="t.y" class="cac-grid" />
          <text :x="PAD.l - 8" :y="t.y + 3" text-anchor="end" class="cac-tick">{{ t.label }}</text>
        </g>
      </g>
      <g>
        <text v-for="nx in X_TICKS" :key="nx" :x="toX(nx)" :y="H - PAD.b + 16" text-anchor="middle" class="cac-tick">{{ nx }}</text>
      </g>
      <text :x="PAD.l + PW / 2" :y="H - 4" text-anchor="middle" class="cac-tick">purchases (n)</text>

      <line
        :x1="thresholdX"
        :y1="PAD.t"
        :x2="thresholdX"
        :y2="PAD.t + PH"
        class="cac-threshold"
      />

      <path :d="flatPath" class="cac-line cac-line-flat" />
      <path v-if="showAccel" :d="accelPath" class="cac-line cac-line-accel" />

      <g class="cac-cursor">
        <line :x1="cursorX" :y1="PAD.t" :x2="cursorX" :y2="PAD.t + PH" />
        <circle :cx="cursorX" :cy="cursorYFlat" r="3.5" class="cac-dot cac-dot-flat" />
        <circle v-if="showAccel" :cx="cursorX" :cy="cursorYAccel" r="3.5" class="cac-dot cac-dot-accel" />
      </g>
    </svg>

    <div class="cac-readout">
      <div>
        <span class="cac-readout-label">at n = {{ cursorN }}, pure exponential cost:</span>
        <code>{{ fmtLog(cursorSample.logFlat) }}</code>
      </div>
      <div v-if="showAccel">
        <span class="cac-readout-label">at n = {{ cursorN }}, with scaling:</span>
        <code>{{ fmtLog(cursorSample.logAccel) }}</code>
        <span v-if="cursorN > threshold" class="cac-readout-ratio">
          ({{ fmtLog(cursorSample.logAccel - cursorSample.logFlat) }}× more)
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cac-controls {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--gap);
}
.cac-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.9em;
  color: var(--color-text-muted);
  align-self: end;
}
.cac-toggle input {
  width: auto;
}
.cac-legend {
  display: flex;
  flex-wrap: wrap;
  gap: var(--gap-lg);
  font-size: 0.85em;
  color: var(--color-text-muted);
  margin-block: var(--gap);
}
.cac-legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.cac-swatch {
  display: inline-block;
  width: 16px;
  height: 3px;
  border-radius: 2px;
}
.cac-swatch-flat {
  background: var(--color-primary);
}
.cac-swatch-accel {
  background: #e07b6c;
}
.cac-swatch-threshold {
  height: 14px;
  width: 1px;
  border-left: 1px dashed var(--color-text-muted);
  background: transparent;
  border-radius: 0;
}
.cac-chart {
  width: 100%;
  height: auto;
  display: block;
  font-family: var(--font-mono);
}
.cac-axis {
  stroke: var(--color-border);
  stroke-width: 1;
}
.cac-grid {
  stroke: var(--color-border);
  stroke-width: 0.5;
  stroke-dasharray: 2 3;
  opacity: 0.6;
}
.cac-tick {
  fill: var(--color-text-muted);
  font-size: 11px;
}
.cac-line {
  fill: none;
  stroke-width: 1.75;
  vector-effect: non-scaling-stroke;
}
.cac-line-flat {
  stroke: var(--color-primary);
}
.cac-line-accel {
  stroke: #e07b6c;
}
.cac-threshold {
  stroke: var(--color-text-muted);
  stroke-width: 0.75;
  stroke-dasharray: 4 4;
  opacity: 0.6;
}
.cac-cursor line {
  stroke: var(--color-text-muted);
  stroke-width: 0.5;
  stroke-dasharray: 2 4;
  opacity: 0.8;
}
.cac-dot-flat {
  fill: var(--color-primary);
}
.cac-dot-accel {
  fill: #e07b6c;
}
.cac-readout {
  margin-top: var(--gap);
  font-family: var(--font-mono);
  font-size: 0.85em;
  display: grid;
  gap: 4px;
}
.cac-readout-label {
  color: var(--color-text-muted);
  margin-right: 0.5em;
}
.cac-readout-ratio {
  color: var(--color-text-muted);
  margin-left: 0.5em;
}
</style>
