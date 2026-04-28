<script setup lang="ts">
import { ref, computed } from 'vue';

// Anchor demo for the synergy-multipliers page. Five buildings, each with
// a base value; pair-synergy bonuses fire when both members of a pair are
// selected. The point: the value of a subset is not the sum of individual
// values — pair bonuses make this a genuine set function, not a chain.
//
// Greedy and exhaustive subset search are both shown for any cardinality
// budget the player picks. With supermodular pockets (the pair bonuses)
// greedy can miss; the demo surfaces the gap.

interface Building {
  id: string;
  name: string;
  base: number;
}

interface Pair {
  a: string;
  b: string;
  bonus: number;
  label: string;
}

const buildings: Building[] = [
  { id: 'farm', name: 'Farm', base: 10 },
  { id: 'mine', name: 'Mine', base: 14 },
  { id: 'factory', name: 'Factory', base: 20 },
  { id: 'shipment', name: 'Shipment', base: 26 },
  { id: 'temple', name: 'Temple', base: 6 },
];

// Pair bonuses. Tuned so a few non-obvious pairs (Temple + something) reward
// "buy a low-base building to unlock a synergy" — the supermodular pocket.
const pairs: Pair[] = [
  { a: 'farm', b: 'mine', bonus: 8, label: 'Crop rotation' },
  { a: 'mine', b: 'factory', bonus: 12, label: 'Ore pipeline' },
  { a: 'factory', b: 'shipment', bonus: 18, label: 'Logistics' },
  { a: 'farm', b: 'temple', bonus: 22, label: 'Harvest blessing' },
  { a: 'temple', b: 'shipment', bonus: 28, label: 'Pilgrim trade' },
];

const selected = ref<Record<string, boolean>>({
  farm: true,
  mine: false,
  factory: false,
  shipment: false,
  temple: false,
});

const budget = ref(3);

function valueOf(set: Set<string>): number {
  let sum = 0;
  for (const id of set) {
    const b = buildings.find((x) => x.id === id);
    if (b) sum += b.base;
  }
  for (const p of pairs) {
    if (set.has(p.a) && set.has(p.b)) sum += p.bonus;
  }
  return sum;
}

function baseOnlyOf(set: Set<string>): number {
  let sum = 0;
  for (const id of set) {
    const b = buildings.find((x) => x.id === id);
    if (b) sum += b.base;
  }
  return sum;
}

const selectedSet = computed(() => {
  const s = new Set<string>();
  for (const id in selected.value) {
    if (selected.value[id]) s.add(id);
  }
  return s;
});

const selectedCount = computed(() => selectedSet.value.size);

const totalWithSynergies = computed(() => valueOf(selectedSet.value));
const totalBaseOnly = computed(() => baseOnlyOf(selectedSet.value));

const activePairs = computed(() => {
  const s = selectedSet.value;
  return pairs.filter((p) => s.has(p.a) && s.has(p.b));
});

// Marginal gain for each unselected item: f(S ∪ {i}) − f(S).
const marginals = computed(() => {
  const s = selectedSet.value;
  const current = valueOf(s);
  return buildings.map((b) => {
    if (s.has(b.id)) return { id: b.id, name: b.name, marginal: null as number | null };
    const trial = new Set(s);
    trial.add(b.id);
    return { id: b.id, name: b.name, marginal: valueOf(trial) - current };
  });
});

// Greedy subset of size k: at each step add the item with the largest
// marginal value, starting empty.
function greedySubset(k: number): Set<string> {
  const s = new Set<string>();
  for (let step = 0; step < k && step < buildings.length; step++) {
    let bestId = '';
    let bestMarginal = -Infinity;
    for (const b of buildings) {
      if (s.has(b.id)) continue;
      const trial = new Set(s);
      trial.add(b.id);
      const m = valueOf(trial) - valueOf(s);
      if (m > bestMarginal) {
        bestMarginal = m;
        bestId = b.id;
      }
    }
    if (bestId) s.add(bestId);
  }
  return s;
}

// Brute force: enumerate all subsets of exact size k, return the best.
function optimalSubset(k: number): Set<string> {
  const n = buildings.length;
  let best = new Set<string>();
  let bestValue = -Infinity;
  for (let mask = 0; mask < 1 << n; mask++) {
    let popcount = 0;
    for (let i = 0; i < n; i++) if (mask & (1 << i)) popcount++;
    if (popcount !== k) continue;
    const s = new Set<string>();
    for (let i = 0; i < n; i++) if (mask & (1 << i)) s.add(buildings[i].id);
    const v = valueOf(s);
    if (v > bestValue) {
      bestValue = v;
      best = s;
    }
  }
  return best;
}

const greedyResult = computed(() => {
  const s = greedySubset(budget.value);
  return {
    set: s,
    value: valueOf(s),
    labels: [...s].map((id) => buildings.find((b) => b.id === id)!.name),
  };
});

const optimalResult = computed(() => {
  const s = optimalSubset(budget.value);
  return {
    set: s,
    value: valueOf(s),
    labels: [...s].map((id) => buildings.find((b) => b.id === id)!.name),
  };
});

const greedyGap = computed(() => optimalResult.value.value - greedyResult.value.value);

function applyGreedy() {
  const s = greedyResult.value.set;
  for (const b of buildings) selected.value[b.id] = s.has(b.id);
}
function applyOptimal() {
  const s = optimalResult.value.set;
  for (const b of buildings) selected.value[b.id] = s.has(b.id);
}
function clearAll() {
  for (const b of buildings) selected.value[b.id] = false;
}
</script>

<template>
  <div class="demo">
    <div class="demo-controls">
      <p class="demo-help">
        Pick any subset of buildings. Pair bonuses fire when both members of a pair are selected —
        that's the synergy.
      </p>
    </div>

    <table class="syn-table">
      <thead>
        <tr>
          <th />
          <th>building</th>
          <th>base</th>
          <th>marginal if added</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="b in buildings"
          :key="b.id"
          :class="{ 'syn-row-on': selected[b.id] }"
        >
          <td class="syn-toggle">
            <input
              :id="`syn-${b.id}`"
              v-model="selected[b.id]"
              type="checkbox"
            >
          </td>
          <td>
            <label :for="`syn-${b.id}`">{{ b.name }}</label>
          </td>
          <td>{{ b.base }}</td>
          <td class="syn-marginal">
            <template
              v-for="m in marginals"
              :key="m.id"
            >
              <span v-if="m.id === b.id">
                <span v-if="m.marginal !== null">+{{ m.marginal }}</span>
                <span
                  v-else
                  class="syn-muted"
                >— (selected)</span>
              </span>
            </template>
          </td>
        </tr>
      </tbody>
    </table>

    <div class="syn-section">
      <h4>Synergy graph</h4>
      <table class="syn-pairs">
        <thead>
          <tr>
            <th>pair</th>
            <th>bonus</th>
            <th>active?</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="p in pairs"
            :key="p.a + '-' + p.b"
            :class="{ 'syn-row-on': selectedSet.has(p.a) && selectedSet.has(p.b) }"
          >
            <td>
              {{ buildings.find((x) => x.id === p.a)!.name }}
              ×
              {{ buildings.find((x) => x.id === p.b)!.name }}
              <span class="syn-pair-label">({{ p.label }})</span>
            </td>
            <td>+{{ p.bonus }}</td>
            <td class="syn-active">
              <span v-if="selectedSet.has(p.a) && selectedSet.has(p.b)">●</span>
              <span
                v-else
                class="syn-muted"
              >○</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="syn-section">
      <h4>Score</h4>
      <table class="syn-score">
        <tbody>
          <tr>
            <td>base sum (selected items only)</td>
            <td class="syn-num">
              {{ totalBaseOnly }}
            </td>
          </tr>
          <tr>
            <td>+ pair bonuses ({{ activePairs.length }} active)</td>
            <td class="syn-num">
              +{{ totalWithSynergies - totalBaseOnly }}
            </td>
          </tr>
          <tr class="syn-total-row">
            <td>total f(S)</td>
            <td class="syn-num">
              {{ totalWithSynergies }}
            </td>
          </tr>
          <tr>
            <td class="syn-muted">
              |S| = {{ selectedCount }}
            </td>
            <td />
          </tr>
        </tbody>
      </table>
    </div>

    <div class="syn-section">
      <h4>Greedy vs optimal</h4>
      <label class="syn-budget-label">
        Budget: pick at most
        <input
          v-model.number="budget"
          type="range"
          :min="1"
          :max="5"
        >
        <strong>{{ budget }}</strong> buildings
      </label>
      <table class="syn-compare">
        <thead>
          <tr>
            <th>strategy</th>
            <th>chosen</th>
            <th>value</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>greedy (largest marginal first)</td>
            <td>{{ greedyResult.labels.join(', ') || '∅' }}</td>
            <td class="syn-num">
              {{ greedyResult.value }}
            </td>
          </tr>
          <tr>
            <td>optimal (brute-force over all subsets)</td>
            <td>{{ optimalResult.labels.join(', ') || '∅' }}</td>
            <td class="syn-num">
              {{ optimalResult.value }}
            </td>
          </tr>
          <tr>
            <td class="syn-muted">
              gap (optimal − greedy)
            </td>
            <td />
            <td
              class="syn-num"
              :class="{ 'syn-gap-positive': greedyGap > 0 }"
            >
              {{ greedyGap > 0 ? '+' : '' }}{{ greedyGap }}
            </td>
          </tr>
        </tbody>
      </table>
      <div class="syn-buttons">
        <button @click="applyGreedy">
          Apply greedy
        </button>
        <button @click="applyOptimal">
          Apply optimal
        </button>
        <button @click="clearAll">
          Clear
        </button>
      </div>
      <p class="syn-caption">
        Greedy picks one item at a time by largest marginal value. With the Temple-related pair
        bonuses, the largest single-item marginals can send greedy down a path that misses an
        unlocked synergy further along — the gap row shows when that happens. With purely additive
        items (no pairs), greedy and optimal would always tie.
      </p>
    </div>
  </div>
</template>

<style scoped>
.syn-table,
.syn-pairs,
.syn-score,
.syn-compare {
  width: 100%;
  border-collapse: collapse;
  font-family: var(--font-mono);
  font-size: 0.85em;
}

.syn-table th,
.syn-pairs th,
.syn-compare th,
.syn-table td,
.syn-pairs td,
.syn-score td,
.syn-compare td {
  padding: 6px var(--gap-sm);
  border-bottom: 1px solid var(--color-border);
  text-align: left;
}

.syn-table th,
.syn-pairs th,
.syn-compare th {
  font-weight: 600;
  color: var(--color-text-muted);
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.syn-row-on {
  background: var(--color-surface-2, rgba(255, 255, 255, 0.03));
}

.syn-toggle {
  width: 2em;
}

.syn-marginal {
  color: var(--color-text-muted);
}

.syn-muted {
  color: var(--color-text-muted);
  opacity: 0.7;
}

.syn-pair-label {
  color: var(--color-text-muted);
  font-size: 0.85em;
  margin-left: 0.4em;
}

.syn-active {
  text-align: center;
  width: 4em;
}

.syn-num {
  text-align: right;
  font-variant-numeric: tabular-nums;
  width: 6em;
}

.syn-total-row td {
  font-weight: 600;
  border-top: 2px solid var(--color-border);
}

.syn-budget-label {
  display: block;
  margin-bottom: var(--gap-sm);
  font-family: var(--font-mono);
  font-size: 0.85em;
}

.syn-budget-label input[type='range'] {
  vertical-align: middle;
  margin: 0 0.6em;
}

.syn-gap-positive {
  color: var(--color-accent, #d97706);
}

.syn-buttons {
  display: flex;
  gap: var(--gap-sm);
  margin: var(--gap-sm) 0;
}

.syn-buttons button {
  font-family: var(--font-mono);
  font-size: 0.8em;
  padding: 4px 10px;
  background: transparent;
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: 3px;
  cursor: pointer;
}

.syn-buttons button:hover {
  background: var(--color-surface-2, rgba(255, 255, 255, 0.05));
}

.syn-section {
  margin-top: var(--gap-md);
}

.syn-section h4 {
  font-size: 0.85em;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-muted);
  margin-bottom: var(--gap-sm);
}

.syn-caption {
  margin-top: var(--gap-sm);
  font-size: 0.85em;
  color: var(--color-text-muted);
  line-height: 1.5;
}

.demo-help {
  font-size: 0.9em;
  color: var(--color-text-muted);
  margin-bottom: var(--gap-sm);
}
</style>
