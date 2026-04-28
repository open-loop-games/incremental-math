<script setup lang="ts">
import { ref, computed } from 'vue';
import { Decimal, format } from 'open-loop-engine/primitives';
import { Formula } from 'open-loop-engine/core';

interface GenConfig {
  name: string;
  baseIncome: number;
  startingCost: number;
  rateGrowth: number;
}

const GENERATORS: ReadonlyArray<GenConfig> = [
  { name: 'Gen 1', baseIncome: 1.67, startingCost: 4.0, rateGrowth: 1.07 },
  { name: 'Gen 2', baseIncome: 20, startingCost: 60, rateGrowth: 1.15 },
  { name: 'Gen 3', baseIncome: 90, startingCost: 720, rateGrowth: 1.14 },
  { name: 'Gen 4', baseIncome: 360, startingCost: 8640, rateGrowth: 1.13 },
  { name: 'Gen 5', baseIncome: 2160, startingCost: 103680, rateGrowth: 1.12 },
];

type MilestoneMode = 'none' | 'global' | 'individual';

// Milestone schedules transcribed from sheets 1d (global) and 1e (individual).
// The sheets label the column "Bonus (not cumulative)" but that refers to the
// input format — each cell is the per-milestone bonus, not a running product.
// The calc sheet builds a cumulative lookup (E_n = E_{n-1} * B_n), so bonuses
// stack multiplicatively as the player crosses each milestone. Same semantics
// as 1a, which Pecorella describes as "(stacking) x2 multiplier".
const MILESTONE_OWNED = [25, 50, 100, 200, 300, 400, 500, 600, 1000];
const MILESTONE_GLOBAL = [5, 5, 2, 2, 3, 4, 2, 3, 4];
// rows = milestones, cols = generators (G1..G5)
const MILESTONE_INDIVIDUAL: ReadonlyArray<ReadonlyArray<number>> = [
  [3, 5, 4, 2, 1.5],
  [2, 10, 8, 2, 2],
  [10, 3, 4, 3, 2],
  [3, 2, 2, 2, 2],
  [2, 2, 2, 2, 2],
  [2, 2, 2, 2, 2],
  [2, 2, 2, 2, 2],
  [2, 2, 2, 2, 2],
  [2, 2, 2, 2, 2],
];

function bonusAt(owned: number, genIdx: number, mode: MilestoneMode): number {
  if (mode === 'none') return 1;
  let bonus = 1;
  for (let m = 0; m < MILESTONE_OWNED.length; m++) {
    if (owned >= MILESTONE_OWNED[m]) {
      bonus *= mode === 'global' ? MILESTONE_GLOBAL[m] : MILESTONE_INDIVIDUAL[m][genIdx];
    } else {
      break;
    }
  }
  return bonus;
}

const cashExp = ref(2);
const cash = computed(() => Math.pow(10, cashExp.value));
const owned = ref<number[]>([1, 0, 0, 0, 0]);
const milestoneMode = ref<MilestoneMode>('none');

interface GenRow {
  cfg: GenConfig;
  owned: number;
  bonus: number;
  contribution: Decimal;
  nextCost: Decimal;
  score: number;
  affordable: boolean;
  isBest: boolean;
}

const totalIncome = computed(() => {
  let total = new Decimal(0);
  for (let i = 0; i < GENERATORS.length; i++) {
    const b = bonusAt(owned.value[i], i, milestoneMode.value);
    total = total.add(new Decimal(GENERATORS[i].baseIncome).mul(owned.value[i]).mul(b));
  }
  return total;
});

const rows = computed<GenRow[]>(() => {
  const inc = totalIncome.value;
  const incNum = inc.toNumber();
  const cashNum = cash.value;
  const mode = milestoneMode.value;
  const partial = GENERATORS.map((cfg, i) => {
    const o = owned.value[i];
    const currentBonus = bonusAt(o, i, mode);
    const nextBonus = bonusAt(o + 1, i, mode);
    const contribution = new Decimal(cfg.baseIncome).mul(o).mul(currentBonus);
    const formula = Formula.exponential(o + 1, cfg.startingCost, cfg.rateGrowth);
    const nextCost = new Decimal(formula.evaluate());
    const nextCostNum = nextCost.toNumber();
    const effectiveItemIncome = cfg.baseIncome * nextBonus;
    const score =
      incNum > 0
        ? nextCostNum / incNum + nextCostNum / effectiveItemIncome
        : Number.POSITIVE_INFINITY;
    return {
      cfg,
      owned: o,
      bonus: currentBonus,
      contribution,
      nextCost,
      score,
      affordable: nextCostNum <= cashNum,
    };
  });
  let bestIdx = -1;
  let bestScore = Number.POSITIVE_INFINITY;
  for (let i = 0; i < partial.length; i++) {
    if (partial[i].score < bestScore) {
      bestScore = partial[i].score;
      bestIdx = i;
    }
  }
  return partial.map((r, i) => ({ ...r, isBest: i === bestIdx }));
});
</script>

<template>
  <div class="demo oct">
    <div class="oct-controls">
      <label>
        <span class="demo-label">cash = {{ format(cash) }}</span>
        <input
          v-model.number="cashExp"
          type="range"
          min="0"
          max="12"
          step="0.05"
        >
      </label>
      <div class="oct-owned-grid">
        <label
          v-for="(_, i) in GENERATORS"
          :key="i"
        >
          <span class="demo-label">{{ GENERATORS[i].name }} owned = {{ owned[i] }}</span>
          <input
            v-model.number="owned[i]"
            type="range"
            min="0"
            max="200"
            step="1"
          >
        </label>
      </div>
    </div>

    <div class="oct-summary">
      <span>milestones:</span>
      <label><input
        v-model="milestoneMode"
        type="radio"
        value="none"
      > none</label>
      <label><input
        v-model="milestoneMode"
        type="radio"
        value="global"
      > global (1d)</label>
      <label><input
        v-model="milestoneMode"
        type="radio"
        value="individual"
      > individual (1e)</label>
      <span class="oct-summary-spacer">·</span>
      total income = <strong>{{ format(totalIncome) }}</strong> / sec
    </div>

    <table class="oct-table">
      <thead>
        <tr>
          <th>generator</th>
          <th>owned</th>
          <th>bonus</th>
          <th>contributes / sec</th>
          <th>next cost</th>
          <th>score (lower = better)</th>
          <th />
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(r, i) in rows"
          :key="i"
          :class="{ 'oct-row-best': r.isBest, 'oct-row-poor': !r.affordable }"
        >
          <td>{{ r.cfg.name }}</td>
          <td>{{ r.owned }}</td>
          <td>{{ r.bonus === 1 ? '—' : '×' + r.bonus }}</td>
          <td>{{ format(r.contribution) }}</td>
          <td>{{ format(r.nextCost) }}</td>
          <td>{{ Number.isFinite(r.score) ? r.score.toFixed(2) : '—' }}</td>
          <td>{{ r.isBest ? 'best buy' : '' }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.oct-controls {
  display: grid;
  gap: var(--gap);
  margin-bottom: var(--gap);
}

.oct-owned-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: var(--gap-sm);
}

.oct-summary {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--gap-sm);
  font-family: var(--font-mono);
  font-size: 0.88em;
  color: var(--color-text-muted);
  margin-bottom: var(--gap-sm);
}

.oct-summary label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
}

.oct-summary input[type='radio'] {
  width: auto;
  margin: 0;
}

.oct-summary-spacer {
  opacity: 0.4;
  margin: 0 var(--gap-sm);
}

.oct-summary strong {
  color: var(--color-text);
  font-weight: 600;
}

.oct-table {
  width: 100%;
  border-collapse: collapse;
  font-family: var(--font-mono);
  font-size: 0.88em;
}

.oct-table th,
.oct-table td {
  padding: 6px var(--gap-sm);
  text-align: left;
  border-bottom: 1px solid var(--color-border);
}

.oct-table th {
  font-weight: 600;
  color: var(--color-text-muted);
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.oct-table td:nth-child(2),
.oct-table td:nth-child(3),
.oct-table td:nth-child(4),
.oct-table td:nth-child(5),
.oct-table td:nth-child(6) {
  text-align: right;
}

.oct-row-best td {
  color: var(--color-primary);
  font-weight: 600;
}

.oct-row-poor td {
  color: var(--color-text-muted);
  opacity: 0.6;
}

.oct-row-best.oct-row-poor td {
  color: var(--color-primary);
  opacity: 1;
}
</style>
