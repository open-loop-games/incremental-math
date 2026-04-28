<script setup lang="ts">
import { ref, computed } from 'vue';
import { format } from 'open-loop-engine/primitives';

// Knapsack-flavored continuous allocator.
//
// Four activities each with a concave yield curve y_i(m_i) = a_i * sqrt(m_i),
// budget T fixed. Score = Σ y_i(m_i) subject to Σ m_i ≤ T.
// The Lagrangian optimum has equal marginal yield: a_i / (2 sqrt(m_i)) = λ.
// Solving: m_i* = (a_i / 2λ)^2, normalize so Σ m_i* = T.
//
// Why concave: linear yields would be a degenerate knapsack (put everything
// on the best activity). Concavity is what makes the allocation interesting,
// and it matches how progression actually feels in time-loop games — the
// first ten minutes on a skill are far more valuable than the last ten.

interface Activity {
  name: string;
  coef: number; // a_i in y = a_i * sqrt(m)
  minutes: number;
  color: string;
}

const T = ref(1440); // total minutes (Groundhog Life default: 24h)
const activities = ref<Activity[]>([
  { name: 'Train (combat)', coef: 8, minutes: 360, color: '#4f9de0' },
  { name: 'Study (magic)', coef: 6, minutes: 360, color: '#6ec07a' },
  { name: 'Earn (income)', coef: 5, minutes: 360, color: '#d97a7a' },
  { name: 'Rest (regen)', coef: 3, minutes: 360, color: '#c08acb' },
]);

const yieldOf = (a: Activity): number => (a.minutes > 0 ? a.coef * Math.sqrt(a.minutes) : 0);
const marginalOf = (a: Activity): number =>
  a.minutes > 0 ? a.coef / (2 * Math.sqrt(a.minutes)) : Infinity;

const totalAllocated = computed(() => activities.value.reduce((s, a) => s + a.minutes, 0));
const totalScore = computed(() => activities.value.reduce((s, a) => s + yieldOf(a), 0));
const remaining = computed(() => T.value - totalAllocated.value);

// Optimal allocation by Lagrangian: m_i* = (a_i)^2 / Σ(a_j)^2 · T
const optimal = computed<number[]>(() => {
  const sumSq = activities.value.reduce((s, a) => s + a.coef * a.coef, 0);
  return activities.value.map((a) => (a.coef * a.coef * T.value) / sumSq);
});
const optimalScore = computed(() => {
  let s = 0;
  for (let i = 0; i < activities.value.length; i++) {
    const m = optimal.value[i];
    s += activities.value[i].coef * Math.sqrt(m);
  }
  return s;
});

// Drag handler: moving slider i to a new value, clamp to remaining budget.
function setMinutes(i: number, raw: number): void {
  const a = activities.value[i];
  const others = totalAllocated.value - a.minutes;
  const cap = T.value - others;
  a.minutes = Math.max(0, Math.min(raw, cap));
}

function applyOptimal(): void {
  for (let i = 0; i < activities.value.length; i++) {
    activities.value[i].minutes = Math.round(optimal.value[i]);
  }
  // round-off correction so totals match
  const drift = totalAllocated.value - T.value;
  if (drift !== 0) activities.value[0].minutes -= drift;
}

const efficiency = computed(() =>
  optimalScore.value > 0 ? (totalScore.value / optimalScore.value) * 100 : 0,
);

// Sparkline path for each activity's yield curve over [0, T].
const W = 720;
const H = 320;
const PAD = { l: 56, r: 16, t: 14, b: 36 };
const PW = W - PAD.l - PAD.r;
const PH = H - PAD.t - PAD.b;
const N = 128;

const yMax = computed(() => {
  let m = 0;
  for (const a of activities.value) m = Math.max(m, a.coef * Math.sqrt(T.value));
  return m * 1.05;
});

function pathFor(a: Activity): string {
  const parts: string[] = [];
  for (let i = 0; i < N; i++) {
    const m = (i / (N - 1)) * T.value;
    const y = a.coef * Math.sqrt(m);
    const px = PAD.l + (m / T.value) * PW;
    const py = PAD.t + (1 - y / yMax.value) * PH;
    parts.push((parts.length === 0 ? 'M' : 'L') + px.toFixed(1) + ' ' + py.toFixed(1));
  }
  return parts.join(' ');
}

function dotFor(a: Activity): { x: number; y: number } {
  const m = a.minutes;
  const y = a.coef * Math.sqrt(m);
  return {
    x: PAD.l + (m / T.value) * PW,
    y: PAD.t + (1 - y / yMax.value) * PH,
  };
}

const X_TICKS = computed(() => {
  const t = T.value;
  return [0, t * 0.25, t * 0.5, t * 0.75, t].map((v) => Math.round(v));
});
function xTickPos(n: number): number {
  return PAD.l + (n / T.value) * PW;
}
</script>

<template>
  <div class="demo zstb">
    <div class="zstb-controls">
      <label>
        <span class="demo-label">budget T = {{ T }} min</span>
        <input
          v-model.number="T"
          type="range"
          min="60"
          max="2880"
          step="10"
        >
      </label>
      <button
        class="zstb-optimal"
        @click="applyOptimal"
      >
        apply optimal allocation
      </button>
    </div>

    <div class="zstb-readout">
      <span>allocated: {{ totalAllocated }}/{{ T }} min</span>
      <span :class="{ 'zstb-bad': remaining < 0 }">remaining: {{ remaining }}</span>
      <span>score: {{ format(totalScore) }}</span>
      <span>optimum: {{ format(optimalScore) }} ({{ efficiency.toFixed(1) }}% efficient)</span>
    </div>

    <div class="zstb-rows">
      <div
        v-for="(a, i) in activities"
        :key="a.name"
        class="zstb-row"
      >
        <div
          class="zstb-name"
          :style="{ color: a.color }"
        >
          {{ a.name }}
        </div>
        <div class="zstb-coef">
          a = {{ a.coef }}
        </div>
        <input
          type="range"
          :min="0"
          :max="T"
          :step="1"
          :value="a.minutes"
          @input="(e) => setMinutes(i, Number((e.target as HTMLInputElement).value))"
        >
        <div class="zstb-min">
          {{ a.minutes }} min
        </div>
        <div class="zstb-yield">
          y = {{ format(yieldOf(a)) }}
        </div>
        <div class="zstb-marg">
          ∂y = {{ marginalOf(a).toFixed(3) }}
        </div>
      </div>
    </div>

    <svg
      :viewBox="`0 0 ${W} ${H}`"
      class="zstb-chart"
      role="img"
      aria-label="Yield curves"
    >
      <line
        :x1="PAD.l"
        :y1="PAD.t"
        :x2="PAD.l"
        :y2="PAD.t + PH"
        class="zstb-axis"
      />
      <line
        :x1="PAD.l"
        :y1="PAD.t + PH"
        :x2="W - PAD.r"
        :y2="PAD.t + PH"
        class="zstb-axis"
      />
      <text
        :x="PAD.l - 8"
        :y="PAD.t + 4"
        text-anchor="end"
        class="zstb-tick"
      >
        {{ format(yMax) }}
      </text>
      <text
        :x="PAD.l - 8"
        :y="PAD.t + PH + 4"
        text-anchor="end"
        class="zstb-tick"
      >0</text>
      <text
        v-for="nx in X_TICKS"
        :key="nx"
        :x="xTickPos(nx)"
        :y="H - PAD.b + 16"
        text-anchor="middle"
        class="zstb-tick"
      >
        {{ nx }}
      </text>
      <text
        :x="PAD.l + PW / 2"
        :y="H - 4"
        text-anchor="middle"
        class="zstb-tick"
      >
        minutes spent on activity
      </text>

      <path
        v-for="a in activities"
        :key="a.name"
        :d="pathFor(a)"
        class="zstb-line"
        :style="{ stroke: a.color }"
      />
      <circle
        v-for="a in activities"
        :key="`dot-${a.name}`"
        :cx="dotFor(a).x"
        :cy="dotFor(a).y"
        r="4"
        :fill="a.color"
        :stroke="'var(--color-bg)'"
        stroke-width="1.5"
      />
    </svg>

    <p class="zstb-note">
      Each curve is <code>y_i = a_i · √m_i</code>: concave, so the first minute on an activity is
      worth more than the last. The optimal split equalizes the marginal slope
      <code>∂y_i/∂m_i = a_i / (2√m_i)</code> across activities — high-coefficient activities deserve
      proportionally more time, but never <em>all</em> of it. Closed-form:
      <code>m_i* = (a_i² / Σa_j²) · T</code>.
    </p>
  </div>
</template>

<style scoped>
.zstb-controls {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: var(--gap);
  align-items: end;
}
.zstb-optimal {
  font-family: var(--font-mono);
  font-size: 0.85em;
  padding: 6px 10px;
  background: var(--color-bg-subtle, #1a1a1a);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: 3px;
  cursor: pointer;
}
.zstb-optimal:hover {
  border-color: var(--color-text-muted);
}
.zstb-readout {
  display: flex;
  flex-wrap: wrap;
  gap: calc(var(--gap) * 1.5);
  font-family: var(--font-mono);
  font-size: 0.85em;
  color: var(--color-text-muted);
  margin-block: var(--gap);
  padding-block: 6px;
  border-block: 1px dashed var(--color-border);
}
.zstb-bad {
  color: #d97a7a;
  font-weight: 600;
}
.zstb-rows {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-block: var(--gap);
}
.zstb-row {
  display: grid;
  grid-template-columns: 130px 60px 1fr 80px 110px 110px;
  gap: 8px;
  align-items: center;
  font-family: var(--font-mono);
  font-size: 0.8em;
}
.zstb-name {
  font-weight: 600;
}
.zstb-coef,
.zstb-min,
.zstb-yield,
.zstb-marg {
  color: var(--color-text-muted);
}
.zstb-chart {
  width: 100%;
  height: auto;
  display: block;
  font-family: var(--font-mono);
  margin-top: var(--gap);
}
.zstb-axis {
  stroke: var(--color-border);
  stroke-width: 1;
}
.zstb-tick {
  fill: var(--color-text-muted);
  font-size: 11px;
}
.zstb-line {
  fill: none;
  stroke-width: 1.75;
  vector-effect: non-scaling-stroke;
  opacity: 0.85;
}
.zstb-note {
  font-size: 0.85em;
  color: var(--color-text-muted);
  margin-top: var(--gap);
}
.zstb-note code {
  font-size: 0.95em;
}
@media (max-width: 720px) {
  .zstb-row {
    grid-template-columns: 1fr 1fr;
    grid-template-areas:
      'name coef'
      'slider slider'
      'min yield'
      'marg marg';
  }
  .zstb-name {
    grid-area: name;
  }
  .zstb-coef {
    grid-area: coef;
    text-align: right;
  }
  .zstb-row input {
    grid-area: slider;
  }
  .zstb-min {
    grid-area: min;
  }
  .zstb-yield {
    grid-area: yield;
    text-align: right;
  }
  .zstb-marg {
    grid-area: marg;
  }
}
</style>
