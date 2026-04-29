<script setup lang="ts">
import { ref, computed } from 'vue';
import { format } from '../lib/decimal';

// Offline-gain-vs-time-away curves for the four families described in the
// page. Operates on JS Number — the lesson is curve shape, not big-number
// arithmetic. Hours on x; effective production "received" on y.

const hoursMax = ref(72);
const ratePerHour = ref(1000);     // baseline online production rate
const offlineCap = ref(3);         // hours where full-rate (or simulated) gain applies
const offlinePct = ref(50);        // "% of active rate" applied while away
const trickleFrac = ref(0.1);      // fraction of rate that keeps trickling past the cap
const tickRateGrowth = ref(0.04);  // tick-sim: per-hour rate growth from auto-purchases

const showLinear = ref(true);
const showHardCap = ref(true);
const showTrickle = ref(true);
const showTickSim = ref(true);
const showBanked = ref(true);
const logScale = ref(false);

const N_SAMPLES = 240;

interface Curve {
  key: string;
  label: string;
  color: string;
  visible: boolean;
  fn: (t: number) => number;
}

// Tick-sim closed-form: rate compounds at growth g per hour for the
// portion that runs (clamped to cap), then stops. Mirrors a fixed-budget
// simulator (Synergism's 200-tick window, AD's tick clamp): the sim
// captures rate growth up to its budget, beyond which nothing accrues.
function tickSimGain(t: number): number {
  const tEff = Math.min(t, offlineCap.value);
  const g = tickRateGrowth.value;
  if (g <= 0) return ratePerHour.value * tEff;
  return (ratePerHour.value / Math.log(1 + g)) * (Math.pow(1 + g, tEff) - 1);
}

const curves = computed<Curve[]>(() => [
  {
    key: 'linear',
    label: 'uncapped extrapolation  ·  rate × t',
    color: '#9aa0a6',
    visible: showLinear.value,
    fn: (t) => ratePerHour.value * t,
  },
  {
    key: 'hardcap',
    label: `hard cap at ${offlineCap.value.toFixed(1)} h, ${offlinePct.value.toFixed(0)} % rate`,
    color: '#d97a7a',
    visible: showHardCap.value,
    fn: (t) => ratePerHour.value * (offlinePct.value / 100) * Math.min(t, offlineCap.value),
  },
  {
    key: 'trickle',
    label: `cap + ${(trickleFrac.value * 100).toFixed(0)} % trickle past cap (Cookie shape)`,
    color: '#c08acb',
    visible: showTrickle.value,
    fn: (t) => {
      const inside = Math.min(t, offlineCap.value);
      const past = Math.max(0, t - offlineCap.value);
      return ratePerHour.value * (offlinePct.value / 100) * (inside + trickleFrac.value * past);
    },
  },
  {
    key: 'ticksim',
    label: `tick simulation  ·  rate compounds at ${(tickRateGrowth.value * 100).toFixed(1)} %/h until cap`,
    color: '#6ec07a',
    visible: showTickSim.value,
    fn: tickSimGain,
  },
  {
    key: 'banked',
    label: 'banking  ·  active payout = 0; t banked, spent later as 2× speed',
    color: '#4f9de0',
    visible: showBanked.value,
    fn: () => 0,
  },
]);

const W = 760;
const H = 380;
const PAD = { l: 72, r: 16, t: 14, b: 40 };
const PW = W - PAD.l - PAD.r;
const PH = H - PAD.t - PAD.b;

interface Tick {
  label: string;
  y: number;
}

const yScale = computed(() => {
  const visible = curves.value.filter((c) => c.visible && c.key !== 'banked');
  let max = 0;
  for (let i = 0; i < N_SAMPLES; i++) {
    const t = (i / (N_SAMPLES - 1)) * hoursMax.value;
    for (const c of visible) {
      const v = c.fn(t);
      if (Number.isFinite(v) && v > max) max = v;
    }
  }
  if (max <= 0) return { toY: () => PAD.t + PH / 2, ticks: [] as Tick[] };
  if (logScale.value) {
    const lmax = Math.log10(max);
    const lmin = Math.max(0, lmax - 6);
    const span = lmax - lmin;
    const toY = (v: number): number => {
      const safe = v > 0 ? Math.log10(v) : lmin;
      return PAD.t + (1 - (safe - lmin) / span) * PH;
    };
    const ticks: Tick[] = [];
    const lo = Math.ceil(lmin);
    const hi = Math.floor(lmax);
    const step = Math.max(1, Math.ceil((hi - lo + 1) / 6));
    for (let p = lo; p <= hi; p += step) {
      ticks.push({ label: `10^${p}`, y: PAD.t + (1 - (p - lmin) / span) * PH });
    }
    return { toY, ticks };
  }
  const yMax = max * 1.05;
  const toY = (v: number): number => PAD.t + (1 - v / yMax) * PH;
  const ticks: Tick[] = [
    { label: format(yMax), y: PAD.t },
    { label: format(yMax * 0.5), y: PAD.t + PH * 0.5 },
    { label: '0', y: PAD.t + PH },
  ];
  return { toY, ticks };
});

function pathFor(c: Curve): string {
  const xStep = PW / (N_SAMPLES - 1);
  const parts: string[] = [];
  for (let i = 0; i < N_SAMPLES; i++) {
    const t = (i / (N_SAMPLES - 1)) * hoursMax.value;
    const v = c.fn(t);
    if (!Number.isFinite(v)) continue;
    const px = PAD.l + i * xStep;
    const py = yScale.value.toY(v);
    parts.push((parts.length === 0 ? 'M' : 'L') + px.toFixed(1) + ' ' + py.toFixed(1));
  }
  return parts.join(' ');
}

const pathByKey = computed(() => {
  const m: Record<string, string> = {};
  for (const c of curves.value) m[c.key] = pathFor(c);
  return m;
});

const capX = computed(() => PAD.l + (Math.min(offlineCap.value, hoursMax.value) / hoursMax.value) * PW);

const X_TICKS = computed(() => {
  const xm = hoursMax.value;
  return [0, xm * 0.25, xm * 0.5, xm * 0.75, xm].map((v) => Math.round(v * 10) / 10);
});
function xTickPos(n: number): number {
  return PAD.l + (n / hoursMax.value) * PW;
}

// Banking readout: at t hours away, you banked t hours of speed-up time.
// Expected total over a full active session that burns the bank at 2× is
// rate × (online_hours + banked_t) — shown as a separate readout, not on
// the main chart axis (units don't match).
const bankedReadout = computed(() => {
  const tBanked = Math.min(hoursMax.value, hoursMax.value); // for legend label
  return tBanked;
});

function setVisible(key: string, value: boolean) {
  if (key === 'linear') showLinear.value = value;
  else if (key === 'hardcap') showHardCap.value = value;
  else if (key === 'trickle') showTrickle.value = value;
  else if (key === 'ticksim') showTickSim.value = value;
  else if (key === 'banked') showBanked.value = value;
}
</script>

<template>
  <div class="demo ogc">
    <div class="ogc-controls">
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
      <label>
        <span class="demo-label">trickle past cap = {{ (trickleFrac * 100).toFixed(0) }} %</span>
        <input
          v-model.number="trickleFrac"
          type="range"
          min="0"
          max="0.5"
          step="0.01"
        >
      </label>
      <label>
        <span class="demo-label">tick-sim rate growth = {{ (tickRateGrowth * 100).toFixed(1) }} %/h</span>
        <input
          v-model.number="tickRateGrowth"
          type="range"
          min="0"
          max="0.5"
          step="0.005"
        >
      </label>
      <label class="ogc-toggle">
        <input
          v-model="logScale"
          type="checkbox"
        >
        log y-scale
      </label>
    </div>

    <div class="ogc-legend">
      <label
        v-for="c in curves"
        :key="c.key"
        class="ogc-legend-item"
      >
        <input
          type="checkbox"
          :checked="c.visible"
          @change="setVisible(c.key, ($event.target as HTMLInputElement).checked)"
        >
        <span
          class="ogc-swatch"
          :style="{ background: c.color }"
        />
        <span>{{ c.label }}</span>
      </label>
    </div>

    <svg
      :viewBox="`0 0 ${W} ${H}`"
      class="ogc-chart"
      role="img"
      aria-label="Offline gain comparison"
    >
      <line
        :x1="PAD.l"
        :y1="PAD.t"
        :x2="PAD.l"
        :y2="PAD.t + PH"
        class="ogc-axis"
      />
      <line
        :x1="PAD.l"
        :y1="PAD.t + PH"
        :x2="W - PAD.r"
        :y2="PAD.t + PH"
        class="ogc-axis"
      />
      <g>
        <g
          v-for="t in yScale.ticks"
          :key="t.label"
        >
          <line
            :x1="PAD.l"
            :y1="t.y"
            :x2="W - PAD.r"
            :y2="t.y"
            class="ogc-grid"
          />
          <text
            :x="PAD.l - 8"
            :y="t.y + 3"
            text-anchor="end"
            class="ogc-tick"
          >{{ t.label }}</text>
        </g>
      </g>
      <g>
        <text
          v-for="nx in X_TICKS"
          :key="nx"
          :x="xTickPos(nx)"
          :y="H - PAD.b + 16"
          text-anchor="middle"
          class="ogc-tick"
        >{{ nx }}</text>
      </g>
      <text
        :x="PAD.l + PW / 2"
        :y="H - 6"
        text-anchor="middle"
        class="ogc-tick"
      >hours away</text>
      <text
        :x="14"
        :y="PAD.t + PH / 2"
        text-anchor="middle"
        class="ogc-tick"
        :transform="`rotate(-90 14 ${PAD.t + PH / 2})`"
      >production received on return</text>

      <line
        v-if="offlineCap < hoursMax"
        :x1="capX"
        :x2="capX"
        :y1="PAD.t"
        :y2="PAD.t + PH"
        class="ogc-cap"
      />
      <text
        v-if="offlineCap < hoursMax"
        :x="capX + 4"
        :y="PAD.t + 12"
        class="ogc-cap-label"
      >cap</text>

      <path
        v-for="c in curves"
        v-show="c.visible && c.key !== 'banked'"
        :key="c.key"
        :d="pathByKey[c.key]"
        class="ogc-line"
        :style="{ stroke: c.color }"
      />

      <line
        v-if="showBanked"
        :x1="PAD.l"
        :x2="W - PAD.r"
        :y1="PAD.t + PH"
        :y2="PAD.t + PH"
        class="ogc-line ogc-banked"
      />
    </svg>

    <p class="ogc-note">
      Banking sits flat on this chart by design — the active payout on return is
      zero. The {{ bankedReadout.toFixed(0) }} h you spent away becomes a
      spendable balance you burn at, say, 2× speed during the next active
      session. The other curves answer "what hit my balance"; banking answers
      "how much faster does the next hour of <em>active</em> play go."
    </p>
  </div>
</template>

<style scoped>
.ogc-controls {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--gap);
}
.ogc-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.9em;
  color: var(--color-text-muted);
  align-self: end;
}
.ogc-toggle input {
  width: auto;
}
.ogc-legend {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.8em;
  color: var(--color-text-muted);
  margin-block: var(--gap);
  font-family: var(--font-mono);
}
.ogc-legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}
.ogc-legend-item input {
  width: auto;
  margin: 0;
}
.ogc-swatch {
  display: inline-block;
  width: 16px;
  height: 3px;
  border-radius: 2px;
}
.ogc-chart {
  width: 100%;
  height: auto;
  display: block;
  font-family: var(--font-mono);
}
.ogc-axis {
  stroke: var(--color-border);
  stroke-width: 1;
}
.ogc-grid {
  stroke: var(--color-border);
  stroke-width: 0.5;
  stroke-dasharray: 2 3;
  opacity: 0.6;
}
.ogc-tick {
  fill: var(--color-text-muted);
  font-size: 11px;
}
.ogc-line {
  fill: none;
  stroke-width: 1.75;
  vector-effect: non-scaling-stroke;
}
.ogc-banked {
  stroke: #4f9de0;
  stroke-dasharray: 6 4;
  opacity: 0.7;
}
.ogc-cap {
  stroke: var(--color-text-muted);
  stroke-width: 0.75;
  stroke-dasharray: 4 3;
  opacity: 0.6;
}
.ogc-cap-label {
  fill: var(--color-text-muted);
  font-size: 10px;
  letter-spacing: 0.04em;
}
.ogc-note {
  margin-top: var(--gap);
  font-size: 0.9em;
  color: var(--color-text-muted);
  font-style: italic;
}
</style>
