<script setup lang="ts">
import { ref, computed } from 'vue';
import { Decimal, format } from '../lib/decimal';

// Defaults transcribed from sheet 3a (Idle Game Models — GDC Talk).
const SHEET = {
  baseIncome: 20,
  startCost: 4,
  costMult: 1.05,
  tickSec: 30,
  prestigeDivisor: 1e5,
  prestigeMultPerUnit: 0.01, // +1% production per prestige currency unit
  firstPrestigeMin: 50,
  // (count threshold, multiplier-at-this-threshold). Cumulative product as crossings stack.
  milestones: [
    [25, 2],
    [50, 2],
    [100, 4],
    [200, 4],
    [300, 8],
    [400, 8],
    [500, 16],
    [600, 16],
    [700, 32],
  ] as ReadonlyArray<readonly [number, number]>,
} as const;

// Sliders.
const costMult = ref(SHEET.costMult);
const prestigeExp = ref(0.5);
const prestigeRatio = ref(0.5); // prestige when pending would multiply current by ≥ (1 + this)
const firstPrestige = ref(SHEET.firstPrestigeMin);
const showLog = ref(false);

const N_TICKS = 600; // 600 * 30s = 5 hours sim time

interface Sample {
  tick: number;
  timeMin: number;
  count: number; // generator count
  income: Decimal; // per second
  lifetime: Decimal;
  prestige: Decimal;
  pending: number;
  resetThisTick: boolean;
}

function milestoneBonus(count: number): number {
  // Cumulative product over crossed thresholds.
  let bonus = 1;
  for (const [thr, factor] of SHEET.milestones) {
    if (count >= thr) bonus *= factor;
    else break;
  }
  return bonus;
}

// Closed-form max-affordable from Part I's geometric series, with the
// cost-multiplier r and starting cost B5.
//   F(n) = B5 * (r^k - r^(k+n)) / (1 - r)
//   n_max = floor(log_r(r^k - balance*(1-r)/B5) - k)
function maxAffordable(balance: Decimal, count: number, r: number): number {
  const onesMinusR = 1 - r;
  // arg = r^count - balance*(1-r)/startCost. With r > 1, (1-r) < 0, so we add to r^count.
  const rk = Math.pow(r, count);
  const arg = rk - balance.toNumber() * (onesMinusR / SHEET.startCost);
  if (!Number.isFinite(arg) || arg <= 0) return 0;
  const n = Math.floor(Math.log(arg) / Math.log(r) - count);
  return n > 0 ? n : 0;
}

function bulkCost(count: number, n: number, r: number): Decimal {
  if (n <= 0) return new Decimal(0);
  // F = startCost * (r^count - r^(count+n)) / (1 - r)
  const rk = Math.pow(r, count);
  const rkn = Math.pow(r, count + n);
  const f = (SHEET.startCost * (rk - rkn)) / (1 - r);
  return new Decimal(f);
}

const samples = computed<Sample[]>(() => {
  const r = costMult.value;
  const out: Sample[] = [];

  let count = 1;
  let bal = new Decimal(0);
  let life = new Decimal(0);
  let prestige = 0;
  let prevIncomePerSec = new Decimal(SHEET.baseIncome);
  let prevPending = 0;

  out.push({
    tick: 0,
    timeMin: 0,
    count,
    income: prevIncomePerSec,
    lifetime: life,
    prestige: new Decimal(prestige),
    pending: 0,
    resetThisTick: false,
  });

  for (let t = 1; t <= N_TICKS; t++) {
    // Step 1: bank previous tick's production into balance + lifetime.
    const tickIncome = prevIncomePerSec.mul(SHEET.tickSec);
    bal = bal.add(tickIncome);
    life = life.add(tickIncome);

    // Step 2: prestige condition checked against prev tick's pending — sheet 3a's
    // L column: trigger when pending ≥ first-prestige threshold AND pending would
    // multiply current prestige by ≥ (1 + ratio).
    const triggers =
      prevPending >= firstPrestige.value && prevPending / (prestige + 1) > 1 + prestigeRatio.value;

    let resetThisTick = false;
    if (triggers) {
      prestige += prevPending;
      bal = new Decimal(0);
      count = 1;
      resetThisTick = true;
    }

    // Step 3: spend everything affordable on generators (closed-form bulk-buy).
    const affordable = maxAffordable(bal, count, r);
    if (affordable > 0) {
      const cost = bulkCost(count, affordable, r);
      bal = bal.sub(cost);
      count += affordable;
    }

    // Step 4: compute new income/sec for this tick.
    const milestone = milestoneBonus(count);
    const prestigeMult = 1 + prestige * SHEET.prestigeMultPerUnit;
    prevIncomePerSec = new Decimal(SHEET.baseIncome).mul(count).mul(milestone).mul(prestigeMult);

    // Step 5: pending prestige currency from lifetime — Pecorella's sqrt-of-lifetime formula.
    const lifeNum = life.toNumber();
    const totalPrestigeOwed = Math.floor(
      Math.pow(Math.max(lifeNum, 0) / SHEET.prestigeDivisor, prestigeExp.value),
    );
    const pending = Math.max(0, totalPrestigeOwed - prestige);
    prevPending = pending;

    out.push({
      tick: t,
      timeMin: (t * SHEET.tickSec) / 60,
      count,
      income: prevIncomePerSec,
      lifetime: life,
      prestige: new Decimal(prestige),
      pending,
      resetThisTick,
    });
  }
  return out;
});

const resetCount = computed(() => samples.value.filter((s) => s.resetThisTick).length);
const finalPrestige = computed(() => samples.value[samples.value.length - 1].prestige);
const finalCount = computed(() => samples.value[samples.value.length - 1].count);

const cursor = ref(N_TICKS);
const cursorSample = computed(() => samples.value[Math.min(cursor.value, N_TICKS)]);

const W = 720;
const H = 320;
const PAD = { l: 60, r: 16, t: 14, b: 38 };
const PW = W - PAD.l - PAD.r;
const PH = H - PAD.t - PAD.b;

const T_MAX_MIN = computed(() => samples.value[samples.value.length - 1].timeMin);

interface YScale {
  toY: (v: number) => number;
  ticks: { label: string; y: number }[];
}

const yScale = computed<YScale>(() => {
  let max = 1;
  for (const s of samples.value) if (s.count > max) max = s.count;
  if (showLog.value) {
    const lmax = Math.log10(max);
    const lmin = 0;
    const span = Math.max(1, lmax - lmin);
    const toY = (v: number): number => {
      const safe = v < 1 ? 1 : v;
      return PAD.t + (1 - (Math.log10(safe) - lmin) / span) * PH;
    };
    const ticks: { label: string; y: number }[] = [];
    const hi = Math.ceil(lmax);
    for (let p = 0; p <= hi; p++) {
      ticks.push({ label: p === 0 ? '1' : `10^${p}`, y: toY(Math.pow(10, p)) });
    }
    return { toY, ticks };
  }
  const span = max;
  const toY = (v: number): number => PAD.t + (1 - v / span) * PH;
  const ticks = [
    { label: String(max), y: PAD.t },
    { label: String(Math.round(max * 0.5)), y: PAD.t + PH * 0.5 },
    { label: '0', y: PAD.t + PH },
  ];
  return { toY, ticks };
});

function xToPx(timeMin: number): number {
  return PAD.l + (timeMin / T_MAX_MIN.value) * PW;
}

const fullPath = computed(() => {
  const parts: string[] = [];
  let started = false;
  for (const s of samples.value) {
    if (s.resetThisTick && started) {
      // Break the line at reset boundaries — the drop to 1 is information, not noise.
      parts.push('M' + xToPx(s.timeMin).toFixed(1) + ' ' + yScale.value.toY(s.count).toFixed(1));
      continue;
    }
    const x = xToPx(s.timeMin);
    const y = yScale.value.toY(s.count);
    parts.push((started ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1));
    started = true;
  }
  return parts.join(' ');
});

const resetMarkers = computed(() =>
  samples.value.filter((s) => s.resetThisTick).map((s) => ({ x: xToPx(s.timeMin), tick: s.tick })),
);

const X_TICKS = computed(() => {
  const m = T_MAX_MIN.value;
  const candidates = [60, 90, 120, 180, 240, 300];
  for (const c of candidates) {
    if (m / c >= 3 && m / c <= 6)
      return Array.from({ length: Math.floor(m / c) + 1 }, (_, i) => i * c);
  }
  return [0, m * 0.25, m * 0.5, m * 0.75, m];
});
</script>

<template>
  <div class="demo pl">
    <div class="pl-controls">
      <label>
        <span class="demo-label">cost mult = {{ costMult.toFixed(3) }}</span>
        <input v-model.number="costMult" type="range" min="1.03" max="1.10" step="0.001" />
      </label>
      <label>
        <span class="demo-label">prestige exponent = {{ prestigeExp.toFixed(2) }}</span>
        <input v-model.number="prestigeExp" type="range" min="0.33" max="0.7" step="0.01" />
      </label>
      <label>
        <span class="demo-label"
          >prestige when gaining ≥ {{ (prestigeRatio * 100).toFixed(0) }}% more</span
        >
        <input v-model.number="prestigeRatio" type="range" min="0.1" max="2" step="0.05" />
      </label>
      <label>
        <span class="demo-label">first-prestige threshold = {{ firstPrestige }}</span>
        <input v-model.number="firstPrestige" type="range" min="5" max="200" step="5" />
      </label>
      <label class="pl-toggle">
        <input v-model="showLog" type="checkbox" />
        log y axis
      </label>
    </div>

    <svg
      :viewBox="`0 0 ${W} ${H}`"
      class="pl-chart"
      role="img"
      aria-label="Generator count over time with prestige resets visible as drops"
    >
      <line :x1="PAD.l" :y1="PAD.t" :x2="PAD.l" :y2="PAD.t + PH" class="pl-axis" />
      <line :x1="PAD.l" :y1="PAD.t + PH" :x2="PAD.l + PW" :y2="PAD.t + PH" class="pl-axis" />

      <g>
        <g v-for="t in yScale.ticks" :key="`y-${t.label}`">
          <line :x1="PAD.l" :y1="t.y" :x2="PAD.l + PW" :y2="t.y" class="pl-grid" />
          <text :x="PAD.l - 8" :y="t.y + 3" text-anchor="end" class="pl-tick">{{ t.label }}</text>
        </g>
      </g>

      <g>
        <text
          v-for="t in X_TICKS"
          :key="`x-${t}`"
          :x="xToPx(t)"
          :y="PAD.t + PH + 16"
          text-anchor="middle"
          class="pl-tick"
        >
          {{ Math.round(t) }}
        </text>
      </g>
      <text :x="PAD.l + PW / 2" :y="H - 6" text-anchor="middle" class="pl-axis-label">
        time (minutes)
      </text>
      <text
        :x="14"
        :y="PAD.t + PH / 2"
        text-anchor="middle"
        class="pl-axis-label"
        :transform="`rotate(-90 14 ${PAD.t + PH / 2})`"
      >
        generators owned
      </text>

      <g>
        <line
          v-for="m in resetMarkers"
          :key="`r-${m.tick}`"
          :x1="m.x"
          :y1="PAD.t"
          :x2="m.x"
          :y2="PAD.t + PH"
          class="pl-reset"
        />
      </g>

      <path :d="fullPath" class="pl-line" />

      <line
        :x1="xToPx(cursorSample.timeMin)"
        :y1="PAD.t"
        :x2="xToPx(cursorSample.timeMin)"
        :y2="PAD.t + PH"
        class="pl-cursor"
      />
      <circle
        :cx="xToPx(cursorSample.timeMin)"
        :cy="yScale.toY(cursorSample.count)"
        r="4"
        class="pl-cursor-dot"
      />
    </svg>

    <div class="pl-scrub">
      <input v-model.number="cursor" type="range" min="0" :max="N_TICKS" step="1" />
      <span class="pl-clock">t = {{ cursorSample.timeMin.toFixed(1) }} min</span>
    </div>

    <div class="pl-readout">
      <div class="pl-cell">
        <span class="pl-cell-label">generators at cursor</span>
        <span class="pl-cell-val">{{ cursorSample.count }}</span>
      </div>
      <div class="pl-cell">
        <span class="pl-cell-label">income / sec</span>
        <span class="pl-cell-val">{{ format(cursorSample.income) }}</span>
      </div>
      <div class="pl-cell">
        <span class="pl-cell-label">lifetime</span>
        <span class="pl-cell-val">{{ format(cursorSample.lifetime) }}</span>
      </div>
      <div class="pl-cell">
        <span class="pl-cell-label">prestige currency</span>
        <span class="pl-cell-val">{{ format(cursorSample.prestige) }}</span>
      </div>
      <div class="pl-cell">
        <span class="pl-cell-label">pending</span>
        <span class="pl-cell-val">{{ cursorSample.pending }}</span>
      </div>
    </div>

    <div class="pl-summary">
      <span
        >{{ resetCount }} prestige reset{{ resetCount === 1 ? '' : 's' }} over
        {{ T_MAX_MIN.toFixed(0) }} simulated minutes</span
      >
      <span>final: {{ finalCount }} gens, {{ format(finalPrestige) }} prestige</span>
    </div>
  </div>
</template>

<style scoped>
.pl-controls {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--gap);
  margin-bottom: var(--gap);
}

.pl-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.9em;
  color: var(--color-text-muted);
  align-self: end;
}

.pl-toggle input {
  width: auto;
}

.pl-chart {
  width: 100%;
  height: auto;
  display: block;
  font-family: var(--font-mono);
}

.pl-axis {
  stroke: var(--color-border);
  stroke-width: 1;
}

.pl-grid {
  stroke: var(--color-border);
  stroke-width: 0.5;
  stroke-dasharray: 2 3;
  opacity: 0.5;
}

.pl-tick {
  fill: var(--color-text-muted);
  font-size: 11px;
}

.pl-axis-label {
  fill: var(--color-text-muted);
  font-size: 11px;
}

.pl-line {
  fill: none;
  stroke: var(--color-primary);
  stroke-width: 1.5;
  vector-effect: non-scaling-stroke;
}

.pl-reset {
  stroke: var(--color-text-muted);
  stroke-width: 1;
  stroke-dasharray: 2 3;
  opacity: 0.35;
}

.pl-cursor {
  stroke: var(--color-text-muted);
  stroke-width: 1;
  stroke-dasharray: 3 3;
  opacity: 0.6;
}

.pl-cursor-dot {
  fill: var(--color-primary);
  stroke: var(--color-bg);
  stroke-width: 2;
}

.pl-scrub {
  display: flex;
  align-items: center;
  gap: var(--gap-sm);
  margin-top: var(--gap-sm);
  font-family: var(--font-mono);
  font-size: 0.85em;
}

.pl-scrub input {
  flex: 1;
}

.pl-clock {
  color: var(--color-text-muted);
  min-width: 8em;
  text-align: right;
}

.pl-readout {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 6px;
  margin-top: var(--gap);
  font-family: var(--font-mono);
  font-size: 0.85em;
}

.pl-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px 8px;
  background: var(--color-surface);
  border-left: 2px solid var(--color-primary);
}

.pl-cell-label {
  color: var(--color-text-muted);
  font-size: 0.8em;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.pl-cell-val {
  color: var(--color-text);
  font-weight: 600;
}

.pl-summary {
  display: flex;
  justify-content: space-between;
  margin-top: var(--gap-sm);
  font-family: var(--font-mono);
  font-size: 0.82em;
  color: var(--color-text-muted);
}
</style>
