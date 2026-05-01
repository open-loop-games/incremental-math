<script setup lang="ts">
import { ref, computed } from 'vue';

type Depth = 1 | 2 | 3 | 4;
const depth = ref<Depth>(2);
const t = ref(0);

interface Frame {
  t: number;
  tiers: number[];
  currency: number;
  newbornThisStep: number[];
  currencyDelta: number;
  fromExisting: number;
  fromNewborn: number;
}

function factorial(n: number): number {
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

function simulate(d: Depth, upToT: number): Frame[] {
  const tiers = new Array(d + 1).fill(0);
  tiers[d] = 1;
  let currency = 0;
  const frames: Frame[] = [
    {
      t: 0,
      tiers: tiers.slice(),
      currency: 0,
      newbornThisStep: new Array(d + 1).fill(0),
      currencyDelta: 0,
      fromExisting: 0,
      fromNewborn: 0,
    },
  ];
  for (let step = 1; step <= upToT; step++) {
    const newborn = new Array(d + 1).fill(0);
    for (let i = d - 1; i >= 1; i--) {
      newborn[i] = tiers[i + 1] + 0.5 * newborn[i + 1];
    }
    const fromExisting = tiers[1];
    const fromNewborn = 0.5 * newborn[1];
    const currencyDelta = fromExisting + fromNewborn;
    for (let i = 1; i <= d; i++) tiers[i] += newborn[i];
    currency += currencyDelta;
    frames.push({
      t: step,
      tiers: tiers.slice(),
      currency,
      newbornThisStep: newborn.slice(),
      currencyDelta,
      fromExisting,
      fromNewborn,
    });
  }
  return frames;
}

const T_MAX = 8;
const frames = computed(() => simulate(depth.value, T_MAX));
const current = computed(() => frames.value[Math.min(t.value, T_MAX)]);
const theoretical = computed(() => {
  const tt = t.value;
  return Math.pow(tt, depth.value) / factorial(depth.value);
});

function step() {
  if (t.value < T_MAX) t.value++;
}
function reset() {
  t.value = 0;
}
function setDepth(d: Depth) {
  depth.value = d;
  t.value = 0;
}

function tierLabel(i: number): string {
  return i === 0 ? 'currency' : `Gen ${i}`;
}

function renderCount(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(2).replace(/\.?0+$/, '');
}
</script>

<template>
  <div class="demo dst">
    <div class="dst-controls">
      <div class="dst-depth">
        <span class="demo-label">depth</span>
        <label
          v-for="d in [1, 2, 3, 4] as const"
          :key="d"
        >
          <input
            type="radio"
            :value="d"
            :checked="depth === d"
            @change="setDepth(d)"
          >
          {{ d }}
        </label>
      </div>
      <div class="dst-stepper">
        <button
          type="button"
          class="dst-btn"
          @click="reset"
        >
          reset
        </button>
        <button
          type="button"
          class="dst-btn dst-btn-primary"
          :disabled="t >= T_MAX"
          @click="step"
        >
          step → t = {{ t + 1 }}
        </button>
      </div>
    </div>

    <div class="dst-time">
      t = <strong>{{ current.t }}</strong>
    </div>

    <div class="dst-stack">
      <div
        v-for="i in depth + 1"
        :key="depth + 1 - i"
        class="dst-tier"
      >
        <div class="dst-tier-label">
          {{ tierLabel(depth + 1 - i) }}
          <span
            v-if="depth + 1 - i === depth"
            class="dst-tier-fixed"
          >(seed)</span>
        </div>
        <div class="dst-tier-count">
          <span class="dst-existing">
            {{ renderCount(current.tiers[depth + 1 - i] - current.newbornThisStep[depth + 1 - i]) }}
          </span>
          <span
            v-if="current.newbornThisStep[depth + 1 - i] > 0"
            class="dst-newborn"
          >
            + {{ renderCount(current.newbornThisStep[depth + 1 - i]) }} new
          </span>
        </div>
      </div>

      <div class="dst-tier dst-tier-currency">
        <div class="dst-tier-label">
          currency
        </div>
        <div class="dst-tier-count">
          <span class="dst-currency-val">{{ renderCount(current.currency) }}</span>
          <span
            v-if="current.currencyDelta > 0"
            class="dst-currency-breakdown"
          >
            (+{{ renderCount(current.fromExisting) }} from existing
            <span v-if="current.fromNewborn > 0">
              + {{ renderCount(current.fromNewborn) }} from new ½ </span>)
          </span>
        </div>
      </div>
    </div>

    <div class="dst-compare">
      <div class="dst-compare-row">
        <span class="dst-compare-label">simulated currency</span>
        <span class="dst-compare-val">{{ renderCount(current.currency) }}</span>
      </div>
      <div class="dst-compare-row">
        <span class="dst-compare-label">
          theoretical
          <span class="dst-formula">t<sup>{{ depth }}</sup> / {{ factorial(depth) }}</span>
        </span>
        <span class="dst-compare-val">{{ theoretical.toFixed(4).replace(/\.?0+$/, '') }}</span>
      </div>
      <div
        v-if="depth === 2"
        class="dst-compare-note"
      >
        At depth 2 the half-on-creation rule lands the discrete simulation exactly on
        <code>t² / 2</code> at every integer t.
      </div>
      <div
        v-else-if="depth === 1"
        class="dst-compare-note"
      >
        Linear growth — no newborn correction needed; the discrete and theoretical track exactly.
      </div>
      <div
        v-else
        class="dst-compare-note"
      >
        At depth ≥ 3 the half-on-creation rule is no longer exact (the layer above is no longer
        linear in t), so the discrete simulation drifts off
        <code>t<sup>{{ depth }}</sup>/{{ factorial(depth) }}</code>
        at integer t.
      </div>
    </div>
  </div>
</template>

<style scoped>
.dst-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--gap);
  justify-content: space-between;
  margin-bottom: var(--gap);
}

.dst-depth {
  display: flex;
  align-items: center;
  gap: var(--gap-sm);
  font-family: var(--font-mono);
  font-size: 0.9em;
}

.dst-depth label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
}

.dst-depth input[type='radio'] {
  width: auto;
  margin: 0;
}

.dst-stepper {
  display: flex;
  gap: var(--gap-sm);
}

.dst-btn {
  font-family: var(--font-mono);
  font-size: 0.88em;
  padding: 6px var(--gap);
  background: var(--color-surface);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  cursor: pointer;
}

.dst-btn:hover:not(:disabled) {
  border-color: var(--color-primary);
}

.dst-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.dst-btn-primary {
  background: var(--color-primary);
  color: var(--color-bg);
  border-color: var(--color-primary);
}

.dst-time {
  font-family: var(--font-mono);
  font-size: 1.05em;
  margin-bottom: var(--gap-sm);
  color: var(--color-text-muted);
}

.dst-time strong {
  color: var(--color-text);
  font-weight: 700;
}

.dst-stack {
  display: grid;
  gap: 6px;
  font-family: var(--font-mono);
  font-size: 0.9em;
  margin-bottom: var(--gap);
}

.dst-tier {
  display: grid;
  grid-template-columns: 110px 1fr;
  gap: var(--gap);
  padding: 8px var(--gap-sm);
  border-left: 3px solid var(--color-border);
  background: var(--color-surface);
}

.dst-tier-currency {
  border-left-color: var(--color-primary);
  background: color-mix(in oklab, var(--color-primary) 8%, var(--color-surface));
}

.dst-tier-label {
  color: var(--color-text-muted);
  font-size: 0.85em;
}

.dst-tier-fixed {
  display: inline-block;
  margin-left: 4px;
  font-size: 0.75em;
  opacity: 0.7;
}

.dst-tier-count {
  color: var(--color-text);
}

.dst-existing {
  font-weight: 600;
}

.dst-newborn {
  color: var(--series-teal);
  margin-left: 6px;
  font-size: 0.92em;
}

.dst-currency-val {
  font-weight: 700;
  color: var(--color-primary);
}

.dst-currency-breakdown {
  margin-left: 6px;
  color: var(--color-text-muted);
  font-size: 0.85em;
}

.dst-compare {
  display: grid;
  gap: var(--gap-sm);
  padding: var(--gap);
  border: 1px dashed var(--color-border);
  border-radius: 4px;
  background: var(--color-surface);
}

.dst-compare-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-family: var(--font-mono);
  font-size: 0.92em;
}

.dst-compare-label {
  color: var(--color-text-muted);
}

.dst-formula {
  color: var(--color-text);
  margin-left: 4px;
}

.dst-compare-val {
  font-weight: 600;
  color: var(--color-text);
}

.dst-compare-note {
  font-size: 0.85em;
  color: var(--color-text-muted);
  line-height: 1.5;
  margin-top: 4px;
}

.dst-compare-note code {
  font-family: var(--font-mono);
  background: color-mix(in oklab, var(--color-text) 8%, transparent);
  padding: 1px 4px;
  border-radius: 3px;
}
</style>
