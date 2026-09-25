<script setup lang="ts">
import { ref, computed } from 'vue';
import { format } from '../lib/decimal';
import { seriesColor } from '../lib/series-colors';

// Three autobuy policies running on the same three-tier toy economy.
// Each tier i produces currency at rate owned[i] * rate[i]. There is no
// cascade to keep the curve-shape comparison legible — what differs is
// the policy that turns currency back into owned counts. Priority is a
// 0..1 bias toward the highest tier when picking which generator to buy
// this tick.

const N_TIERS = 3;
const RATES = [1, 8, 64];
const BASE_COSTS = [10, 100, 1000];
const COST_MULT = 1.15;

const simSeconds = ref(120);
const startCurrency = ref(50);
const thresholdMult = ref(10); // policy 3: only buy if currency >= mult * cost
const priority = ref(0); // 0 = pure low-tier-first; 1 = pure high-tier-first
const logScale = ref(false);

const showAffordable = ref(true);
const showBuyMax = ref(true);
const showThreshold = ref(true);

const DT = 0.1;

interface Run {
  series: { t: number; production: number; currency: number; owned: number[] }[];
  finalOwned: number[];
}

function costOf(tier: number, owned: number): number {
  return BASE_COSTS[tier] * Math.pow(COST_MULT, owned);
}

function pickTier(
  owned: number[],
  currency: number,
  prio: number,
  thresholdGate: (tier: number, owned: number, currency: number) => boolean,
): number {
  // Walk tiers in priority order. priority=0 → low first; priority=1 → high first.
  // We linearly interpolate by alternating walk direction for fractional priority.
  const order =
    prio >= 0.5 ? [N_TIERS - 1, N_TIERS - 2, 0].slice(0, N_TIERS) : [0, 1, 2].slice(0, N_TIERS);
  // Optional bias: at priority>0.5 try high first, but if owned[high]==0 and we can
  // afford a low tier, take it. Implemented implicitly by falling through.
  for (const t of order) {
    if (thresholdGate(t, owned[t], currency)) return t;
  }
  return -1;
}

function runPolicy(policy: 'affordable' | 'buymax' | 'threshold'): Run {
  const owned = [0, 0, 0];
  let currency = startCurrency.value;
  const series: Run['series'] = [];
  const steps = Math.ceil(simSeconds.value / DT);
  const sampleEvery = Math.max(1, Math.floor(steps / 240));

  for (let i = 0; i <= steps; i++) {
    const t = i * DT;
    const production = owned[0] * RATES[0] + owned[1] * RATES[1] + owned[2] * RATES[2];

    if (i % sampleEvery === 0 || i === steps) {
      series.push({ t, production, currency, owned: [...owned] });
    }

    currency += production * DT;

    // Apply policy.
    if (policy === 'affordable') {
      const tier = pickTier(owned, currency, priority.value, (t2, ow, cur) => {
        return cur >= costOf(t2, ow);
      });
      if (tier >= 0) {
        currency -= costOf(tier, owned[tier]);
        owned[tier] += 1;
      }
    } else if (policy === 'buymax') {
      // Drain budget: while anything affordable, buy cheapest (low tier first).
      // This is the "buy-max-each-tick" shape: tends to overweight low tiers.
      let bought = true;
      let safety = 200;
      while (bought && safety-- > 0) {
        bought = false;
        for (let t2 = 0; t2 < N_TIERS; t2++) {
          if (currency >= costOf(t2, owned[t2])) {
            currency -= costOf(t2, owned[t2]);
            owned[t2] += 1;
            bought = true;
            break;
          }
        }
      }
    } else if (policy === 'threshold') {
      const tier = pickTier(owned, currency, priority.value, (t2, ow, cur) => {
        return cur >= thresholdMult.value * costOf(t2, ow);
      });
      if (tier >= 0) {
        currency -= costOf(tier, owned[tier]);
        owned[tier] += 1;
      }
    }
  }

  return { series, finalOwned: owned };
}

const runs = computed(() => ({
  affordable: runPolicy('affordable'),
  buymax: runPolicy('buymax'),
  threshold: runPolicy('threshold'),
}));

const POLICIES = [
  {
    key: 'affordable' as const,
    label: 'buy-when-affordable',
    color: seriesColor('gray'),
    visibleRef: showAffordable,
  },
  {
    key: 'buymax' as const,
    label: 'buy-max-each-tick',
    color: seriesColor('teal'),
    visibleRef: showBuyMax,
  },
  {
    key: 'threshold' as const,
    label: 'threshold-based',
    color: seriesColor('sage'),
    visibleRef: showThreshold,
  },
];

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
  let max = 0;
  for (const p of POLICIES) {
    if (!p.visibleRef.value) continue;
    for (const pt of runs.value[p.key].series) {
      if (pt.production > max) max = pt.production;
    }
  }
  if (max <= 0) return { toY: () => PAD.t + PH / 2, ticks: [] as Tick[] };
  if (logScale.value) {
    const lmax = Math.log10(max);
    const lmin = Math.max(0, lmax - 6);
    const span = lmax - lmin;
    const toY = (v: number) => {
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
  const toY = (v: number) => PAD.t + (1 - v / yMax) * PH;
  const ticks: Tick[] = [
    { label: format(yMax), y: PAD.t },
    { label: format(yMax * 0.5), y: PAD.t + PH * 0.5 },
    { label: '0', y: PAD.t + PH },
  ];
  return { toY, ticks };
});

function pathFor(key: 'affordable' | 'buymax' | 'threshold'): string {
  const s = runs.value[key].series;
  if (s.length === 0) return '';
  const tMax = simSeconds.value;
  const parts: string[] = [];
  for (let i = 0; i < s.length; i++) {
    const px = PAD.l + (s[i].t / tMax) * PW;
    const py = yScale.value.toY(s[i].production);
    parts.push((parts.length === 0 ? 'M' : 'L') + px.toFixed(1) + ' ' + py.toFixed(1));
  }
  return parts.join(' ');
}

const pathByKey = computed(() => ({
  affordable: pathFor('affordable'),
  buymax: pathFor('buymax'),
  threshold: pathFor('threshold'),
}));

const X_TICKS = computed(() => {
  const xm = simSeconds.value;
  return [0, xm * 0.25, xm * 0.5, xm * 0.75, xm].map((v) => Math.round(v));
});
function xTickPos(n: number): number {
  return PAD.l + (n / simSeconds.value) * PW;
}

const finalSummary = computed(() =>
  POLICIES.map((p) => ({
    key: p.key,
    label: p.label,
    color: p.color,
    owned: runs.value[p.key].finalOwned,
    finalProd: runs.value[p.key].series[runs.value[p.key].series.length - 1].production,
  })),
);
</script>

<template>
  <div class="demo apol">
    <div class="apol-controls">
      <label>
        <span class="demo-label">sim duration = {{ simSeconds }} s</span>
        <input v-model.number="simSeconds" type="range" min="30" max="600" step="10" />
      </label>
      <label>
        <span class="demo-label">starting currency = {{ format(startCurrency) }}</span>
        <input v-model.number="startCurrency" type="range" min="10" max="1000" step="10" />
      </label>
      <label>
        <span class="demo-label">threshold multiple = {{ thresholdMult.toFixed(0) }}× cost</span>
        <input v-model.number="thresholdMult" type="range" min="1" max="50" step="1" />
      </label>
      <label>
        <span class="demo-label">priority bias = {{ priority.toFixed(2) }} (low→high)</span>
        <input v-model.number="priority" type="range" min="0" max="1" step="0.05" />
      </label>
      <label class="apol-toggle">
        <input v-model="logScale" type="checkbox" />
        log y-scale
      </label>
    </div>

    <div class="apol-legend">
      <label v-for="p in POLICIES" :key="p.key" class="apol-legend-item">
        <input v-model="p.visibleRef.value" type="checkbox" />
        <span class="apol-swatch" :style="{ background: p.color }" />
        <span>{{ p.label }}</span>
      </label>
    </div>

    <svg :viewBox="`0 0 ${W} ${H}`" class="apol-chart" role="img" aria-label="Policy comparison">
      <line :x1="PAD.l" :y1="PAD.t" :x2="PAD.l" :y2="PAD.t + PH" class="apol-axis" />
      <line :x1="PAD.l" :y1="PAD.t + PH" :x2="W - PAD.r" :y2="PAD.t + PH" class="apol-axis" />
      <g v-for="t in yScale.ticks" :key="t.label">
        <line :x1="PAD.l" :y1="t.y" :x2="W - PAD.r" :y2="t.y" class="apol-grid" />
        <text :x="PAD.l - 8" :y="t.y + 3" text-anchor="end" class="apol-tick">{{ t.label }}</text>
      </g>
      <g>
        <text
          v-for="nx in X_TICKS"
          :key="nx"
          :x="xTickPos(nx)"
          :y="H - PAD.b + 16"
          text-anchor="middle"
          class="apol-tick"
        >
          {{ nx }}
        </text>
      </g>
      <text :x="PAD.l + PW / 2" :y="H - 6" text-anchor="middle" class="apol-tick">
        simulated seconds
      </text>
      <text
        :x="14"
        :y="PAD.t + PH / 2"
        text-anchor="middle"
        class="apol-tick"
        :transform="`rotate(-90 14 ${PAD.t + PH / 2})`"
      >
        production rate
      </text>

      <path
        v-for="p in POLICIES"
        v-show="p.visibleRef.value"
        :key="p.key"
        :d="pathByKey[p.key]"
        class="apol-line"
        :style="{ stroke: p.color }"
      />
    </svg>

    <table class="apol-summary">
      <thead>
        <tr>
          <th>policy</th>
          <th>G1</th>
          <th>G2</th>
          <th>G3</th>
          <th>final rate</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="r in finalSummary" :key="r.key">
          <td><span class="apol-swatch" :style="{ background: r.color }" /> {{ r.label }}</td>
          <td>{{ r.owned[0] }}</td>
          <td>{{ r.owned[1] }}</td>
          <td>{{ r.owned[2] }}</td>
          <td>{{ format(r.finalProd) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.apol-controls {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--gap);
}
.apol-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.9em;
  color: var(--color-text-muted);
  align-self: end;
}
.apol-toggle input {
  width: auto;
}
.apol-legend {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.8em;
  color: var(--color-text-muted);
  margin-block: var(--gap);
  font-family: var(--font-mono);
}
.apol-legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}
.apol-legend-item input {
  width: auto;
  margin: 0;
}
.apol-swatch {
  display: inline-block;
  width: 16px;
  height: 3px;
  border-radius: 2px;
}
.apol-chart {
  width: 100%;
  height: auto;
  display: block;
  font-family: var(--font-mono);
}
.apol-axis {
  stroke: var(--color-border);
  stroke-width: 1;
}
.apol-grid {
  stroke: var(--color-border);
  stroke-width: 0.5;
  stroke-dasharray: 2 3;
  opacity: 0.6;
}
.apol-tick {
  fill: var(--color-text-muted);
  font-size: 11px;
}
.apol-line {
  fill: none;
  stroke-width: 1.75;
  vector-effect: non-scaling-stroke;
}
.apol-summary {
  margin-top: var(--gap);
  width: 100%;
  border-collapse: collapse;
  font-family: var(--font-mono);
  font-size: 0.85em;
}
.apol-summary th,
.apol-summary td {
  padding: 4px 8px;
  text-align: right;
  border-bottom: 1px solid var(--color-border);
}
.apol-summary th:first-child,
.apol-summary td:first-child {
  text-align: left;
}
</style>
