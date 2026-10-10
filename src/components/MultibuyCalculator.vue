<script setup lang="ts">
import { ref, computed } from 'vue';
import { Decimal, format } from '../lib/decimal';
import { exponentialCostSum, exponentialMaxAffordable } from '../lib/formula';

const baseCost = ref(20);
const rateGrowth = ref(1.05);
const currentlyOwned = ref(10);
const cashExp = ref(2.6);
const currentCash = computed(() => Math.pow(10, cashExp.value));

const N_TO_BUY = [1, 2, 3, 5, 10, 25, 100];

interface Row {
  n: number;
  cost: Decimal;
  affordable: boolean;
}

const rows = computed<Row[]>(() => {
  const cash = new Decimal(currentCash.value);
  return N_TO_BUY.map((n) => {
    const cost = exponentialCostSum(currentlyOwned.value, n, baseCost.value, rateGrowth.value);
    return { n, cost, affordable: cost.lte(cash) };
  });
});

const maxAffordable = computed(() =>
  exponentialMaxAffordable(
    currentlyOwned.value,
    currentCash.value,
    baseCost.value,
    rateGrowth.value,
  ),
);

const maxAffordableCost = computed(() => {
  const n = maxAffordable.value;
  if (n === 0) return new Decimal(0);
  return exponentialCostSum(currentlyOwned.value, n, baseCost.value, rateGrowth.value);
});
</script>

<template>
  <div class="demo mbc">
    <div class="mbc-controls">
      <label>
        <span class="demo-label">base cost = {{ baseCost.toFixed(0) }}</span>
        <input v-model.number="baseCost" type="range" min="5" max="100" step="1" />
      </label>
      <label>
        <span class="demo-label">cost ratio = {{ rateGrowth.toFixed(3) }}</span>
        <input v-model.number="rateGrowth" type="range" min="1.01" max="1.20" step="0.001" />
      </label>
      <label>
        <span class="demo-label">currently owned = {{ currentlyOwned }}</span>
        <input v-model.number="currentlyOwned" type="range" min="0" max="500" step="1" />
      </label>
      <label>
        <span class="demo-label">current currency = {{ format(currentCash) }}</span>
        <input v-model.number="cashExp" type="range" min="0" max="9" step="0.05" />
      </label>
    </div>

    <table class="mbc-table">
      <thead>
        <tr>
          <th>n to buy</th>
          <th>cumulative cost</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="r in rows" :key="r.n" :class="{ 'mbc-row-ok': r.affordable }">
          <td>{{ r.n }}</td>
          <td>{{ format(r.cost) }}</td>
        </tr>
        <tr class="mbc-row-max">
          <td>max ({{ maxAffordable }})</td>
          <td>{{ format(maxAffordableCost) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.mbc-controls {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--gap);
  margin-bottom: var(--gap);
}

.mbc-table {
  width: 100%;
  border-collapse: collapse;
  font-family: var(--font-mono);
  font-size: 0.92em;
}

.mbc-table th,
.mbc-table td {
  padding: 6px var(--gap-sm);
  text-align: left;
  border-bottom: 1px solid var(--color-border);
}

.mbc-table th {
  font-weight: 600;
  color: var(--color-text-muted);
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.mbc-table td:first-child {
  width: 30%;
  color: var(--color-text-muted);
}

.mbc-row-ok td {
  color: var(--color-text);
}

.mbc-row-ok td:first-child {
  color: var(--color-primary);
  font-weight: 600;
}

.mbc-row-max td {
  border-top: 1px solid var(--color-border);
  border-bottom: none;
  color: var(--color-text);
  font-weight: 600;
  padding-top: var(--gap-sm);
}

.mbc-row-max td:first-child {
  color: var(--color-primary);
}
</style>
