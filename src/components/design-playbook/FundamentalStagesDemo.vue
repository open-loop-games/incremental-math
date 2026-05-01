<script setup lang="ts">
import { computed, ref } from 'vue';
import RatePlot from '../RatePlot.vue';
import type { Annotation } from '../RatePlot.vue';
import { SERIES_ORDER, seriesColor } from '../../lib/series-colors';

// Fundamental's six-stage cost ladder. Per-purchase cost multiplier is constant
// within each stage and changes at stage boundaries. Beat time T(n) = T₀ · Π mᵢ
// over the multipliers for the stages crossed; within stage i the curve is a
// straight line on log y with slope ln(mᵢ) per purchase.
//
//   stage 1: 1.40   moderate
//   stage 2: 2.00   moderate-aggressive
//   stage 3: 10.0   harsh — peak wall
//   stage 4: 1.70   moderate-high
//   stage 5: 1.11   gentle — valley
//   stage 6: 1.40   moderate
//
// The "valley reads as a breather *because* the peak existed" claim is what the
// log y-axis makes visible: stage 5's slope is so much shallower than stage 3's
// that the line nearly flattens, and the contrast against the recently-crossed
// peak is the felt experience.

interface StageDef {
  label: string;
  feel: string;
  defaultMult: number;
  hue: string;
}

const STAGE_DEFS: StageDef[] = [
  { label: 'I', feel: 'moderate', defaultMult: 1.4, hue: seriesColor(SERIES_ORDER[0]) },
  { label: 'II', feel: 'moderate-aggressive', defaultMult: 2.0, hue: seriesColor(SERIES_ORDER[1]) },
  { label: 'III', feel: 'harsh — peak', defaultMult: 10.0, hue: seriesColor(SERIES_ORDER[2]) },
  { label: 'IV', feel: 'moderate-high', defaultMult: 1.7, hue: seriesColor(SERIES_ORDER[3]) },
  { label: 'V', feel: 'gentle — valley', defaultMult: 1.11, hue: seriesColor(SERIES_ORDER[4]) },
  { label: 'VI', feel: 'moderate', defaultMult: 1.4, hue: seriesColor(SERIES_ORDER[0]) },
];

const mults = ref<number[]>(STAGE_DEFS.map((d) => d.defaultMult));
const perStage = ref(8);
const baseBeat = ref(1);

const totalPurchases = computed(() => STAGE_DEFS.length * perStage.value);

// Cumulative log T at the start of each stage, then interpolate linearly in log
// space within. Continuous-x evaluation makes uPlot happy.
const stageStartLog = computed(() => {
  const out: number[] = new Array(STAGE_DEFS.length + 1);
  out[0] = Math.log(baseBeat.value);
  for (let i = 0; i < STAGE_DEFS.length; i++) {
    out[i + 1] = out[i] + perStage.value * Math.log(mults.value[i]);
  }
  return out;
});

function beatTime(x: number): number {
  if (!Number.isFinite(x) || x < 0) return NaN;
  const stride = perStage.value;
  let stageIdx = Math.floor(x / stride);
  if (stageIdx >= STAGE_DEFS.length) stageIdx = STAGE_DEFS.length - 1;
  if (stageIdx < 0) stageIdx = 0;
  const within = x - stageIdx * stride;
  const logT = stageStartLog.value[stageIdx] + within * Math.log(mults.value[stageIdx]);
  return Math.exp(logT);
}

const series = computed(() => [
  {
    fn: beatTime,
    label: 'beat time',
    stroke: seriesColor('amber'),
    width: 2,
  },
]);

const domain = computed<[number, number]>(() => [0, totalPurchases.value]);

// Alternating soft fills to read stage boundaries, plus a vline at each.
const annotations = computed<Annotation[]>(() => {
  const stride = perStage.value;
  const out: Annotation[] = [];
  for (let i = 0; i < STAGE_DEFS.length; i++) {
    out.push({
      type: 'vband',
      x0: i * stride,
      x1: (i + 1) * stride,
      fill: STAGE_DEFS[i].hue,
    });
  }
  for (let i = 1; i < STAGE_DEFS.length; i++) {
    out.push({
      type: 'vline',
      x: i * stride,
      stroke: 'rgba(255,255,255,0.15)',
      dash: [3, 3],
      width: 0.75,
    });
  }
  return out;
});

const finalBeat = computed(() => beatTime(totalPurchases.value));

const peakLevel = computed(() => {
  // Pull the steepest stage slope and its position in log time.
  let bestIdx = 0;
  for (let i = 1; i < STAGE_DEFS.length; i++) {
    if (mults.value[i] > mults.value[bestIdx]) bestIdx = i;
  }
  return { idx: bestIdx, mult: mults.value[bestIdx] };
});

const valleyLevel = computed(() => {
  let bestIdx = 0;
  for (let i = 1; i < STAGE_DEFS.length; i++) {
    if (mults.value[i] < mults.value[bestIdx]) bestIdx = i;
  }
  return { idx: bestIdx, mult: mults.value[bestIdx] };
});

function resetDefaults(): void {
  mults.value = STAGE_DEFS.map((d) => d.defaultMult);
}

// Compact y-tick formatter: log scale produces values like 1, 10, ..., 1e15;
// rendering them comma-grouped overruns the axis gutter. Use 10ⁿ shorthand
// past 1e4, plain decimal below.
const SUPER = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];
function toSuper(n: number): string {
  return String(Math.round(n))
    .split('')
    .map((c) => (c === '-' ? '⁻' : (SUPER[Number(c)] ?? c)))
    .join('');
}
function fmtY(v: number): string {
  if (!Number.isFinite(v)) return '';
  if (v === 0) return '0';
  const av = Math.abs(v);
  if (av >= 1e4) {
    const exp = Math.log10(av);
    if (Math.abs(exp - Math.round(exp)) < 1e-6) return `10${toSuper(exp)}`;
    return v.toExponential(1);
  }
  return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
}
</script>

<template>
  <div class="demo">
    <div class="stages">
      <div
        v-for="(def, i) in STAGE_DEFS"
        :key="def.label"
        class="stage"
        :style="{ '--hue': def.hue }"
      >
        <div class="stage-head">
          <span class="stage-name">stage {{ def.label }}</span>
          <span class="stage-feel">{{ def.feel }}</span>
        </div>
        <label>
          <span class="stage-mult">m = {{ mults[i].toFixed(2) }}</span>
          <input
            v-model.number="mults[i]"
            type="range"
            min="1.02"
            max="15"
            step="0.01"
          >
        </label>
      </div>
    </div>

    <div class="globals">
      <label>
        <span class="demo-label">purchases per stage = {{ perStage }}</span>
        <input
          v-model.number="perStage"
          type="range"
          min="4"
          max="15"
          step="1"
        >
      </label>
      <button
        type="button"
        class="reset"
        @click="resetDefaults"
      >
        reset to Fundamental
      </button>
    </div>

    <RatePlot
      :series="series"
      :domain="domain"
      :height="260"
      :deps="[...mults, perStage, baseBeat]"
      :annotations="annotations"
      :y-tick-format="fmtY"
      x-label="purchase n"
      y-label="beat time T(n)"
      y-scale="log"
    />

    <dl class="readout">
      <div>
        <dt>peak slope</dt>
        <dd>stage {{ STAGE_DEFS[peakLevel.idx].label }} (m = {{ peakLevel.mult.toFixed(2) }})</dd>
      </div>
      <div>
        <dt>valley slope</dt>
        <dd>
          stage {{ STAGE_DEFS[valleyLevel.idx].label }} (m = {{ valleyLevel.mult.toFixed(2) }})
        </dd>
      </div>
      <div>
        <dt>final beat time</dt>
        <dd class="headline">
          {{ finalBeat < 1000 ? finalBeat.toFixed(2) : finalBeat.toExponential(2) }}
        </dd>
      </div>
    </dl>

    <p class="demo-note">
      Each stage is a straight line on log <code>y</code>; the slope is <code>ln(mᵢ)</code> per
      purchase. Stage III's slope at <code>m = 10</code> is <code>≈ 2.30</code> per purchase — about
      16× steeper than the genre-default <code>m = 1.15</code>. Stage V at <code>m = 1.11</code> has
      slope <code>≈ 0.10</code>, shallower than the genre default and visibly flat against the
      recently-crossed wall. The non-monotonic shape only reads as designed if the peak and valley
      are both legible: try collapsing stage III's multiplier toward stage IV's and watch the
      valley's "breather" feeling disappear.
    </p>
  </div>
</template>

<style scoped>
.stages {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: var(--gap);
  margin-bottom: var(--gap);
}
.stage {
  border-left: 3px solid var(--hue);
  padding: 0 var(--gap);
}
.stage-head {
  display: flex;
  flex-direction: column;
  font-family: var(--font-mono);
  font-size: 0.85em;
  margin-bottom: 4px;
}
.stage-name {
  color: var(--hue);
  font-weight: 600;
  letter-spacing: 0.04em;
}
.stage-feel {
  color: var(--color-text-muted);
  font-size: 0.92em;
}
.stage-mult {
  display: block;
  font-family: var(--font-mono);
  font-size: 0.85em;
  color: var(--color-text-muted);
  margin-bottom: 2px;
}
.globals {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  gap: var(--gap);
  margin-bottom: var(--gap);
}
.globals label {
  flex: 1;
  min-width: 220px;
}
.reset {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  color: var(--color-text-muted);
  font-family: var(--font-mono);
  font-size: 0.82em;
  padding: var(--gap-sm) var(--gap);
  border-radius: var(--radius-sm);
  cursor: pointer;
}
.reset:hover {
  color: var(--color-text);
  border-color: var(--color-primary);
}
.readout {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--gap);
  margin: var(--gap) 0 0;
  font-family: var(--font-mono);
  font-size: 0.9em;
}
.readout > div {
  display: flex;
  flex-direction: column;
}
.readout dt {
  color: var(--color-text-muted);
  font-size: 0.82em;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.readout dd {
  margin: 0;
  color: var(--color-text);
}
.readout .headline {
  color: var(--color-primary);
  font-weight: 600;
  font-size: 1.1em;
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
