<script setup lang="ts">
import { ref, computed } from 'vue';
import { seriesColor } from '../../../lib/series-colors';

// Eight-node prereq DAG with per-node {cost, effect}.  Player clicks to
// build a loadout; the demo reports the score of the current selection,
// the greedy-optimum, and the exhaustive-optimum for the same budget.
//
// Greedy here is "by effect/cost ratio, pick if prereqs met and budget
// allows."  Exhaustive sweeps all 2^8 subsets — fine at this size, and
// the comparison is the headline.

interface Node {
  id: string;
  label: string;
  x: number;
  y: number;
  cost: number;
  effect: number;
  prereqs: string[];
}

const NODES: Node[] = [
  { id: 'A', label: 'Root', x: 60, y: 160, cost: 0, effect: 0, prereqs: [] },
  { id: 'B', label: 'B', x: 160, y: 80, cost: 2, effect: 4, prereqs: ['A'] },
  { id: 'C', label: 'C', x: 160, y: 240, cost: 3, effect: 5, prereqs: ['A'] },
  { id: 'D', label: 'D', x: 270, y: 40, cost: 4, effect: 6, prereqs: ['B'] },
  { id: 'E', label: 'E', x: 270, y: 160, cost: 5, effect: 10, prereqs: ['B', 'C'] },
  { id: 'F', label: 'F', x: 270, y: 280, cost: 4, effect: 7, prereqs: ['C'] },
  { id: 'G', label: 'G', x: 380, y: 100, cost: 8, effect: 11, prereqs: ['D', 'E'] },
  { id: 'H', label: 'H', x: 380, y: 240, cost: 9, effect: 14, prereqs: ['E', 'F'] },
];

const NODE_BY_ID: Map<string, Node> = new Map(NODES.map((n) => [n.id, n]));

const EDGES: Array<{ from: string; to: string }> = NODES.flatMap((n) =>
  n.prereqs.map((p) => ({ from: p, to: n.id })),
);

const budget = ref(20);
// Root is always selected (cost 0, gates the tree).
const selected = ref<Set<string>>(new Set(['A']));

function toggle(id: string): void {
  if (id === 'A') return;
  const next = new Set(selected.value);
  if (next.has(id)) {
    next.delete(id);
    // Also deselect anything that depended on this node, recursively.
    let changed = true;
    while (changed) {
      changed = false;
      for (const n of NODES) {
        if (next.has(n.id) && n.prereqs.some((p) => !next.has(p))) {
          next.delete(n.id);
          changed = true;
        }
      }
    }
  } else {
    // Auto-select prereqs along the way.
    const queue = [id];
    while (queue.length > 0) {
      const cur = queue.pop()!;
      if (next.has(cur)) continue;
      next.add(cur);
      const node = NODE_BY_ID.get(cur);
      if (!node) continue;
      for (const p of node.prereqs) {
        if (!next.has(p)) queue.push(p);
      }
    }
  }
  selected.value = next;
}

function reset(): void {
  selected.value = new Set(['A']);
}

const userScore = computed(() => {
  let cost = 0;
  let effect = 0;
  for (const id of selected.value) {
    const n = NODE_BY_ID.get(id)!;
    cost += n.cost;
    effect += n.effect;
  }
  return { cost, effect };
});

const overBudget = computed(() => userScore.value.cost > budget.value);

function isValidSubset(subset: Set<string>): boolean {
  for (const id of subset) {
    const n = NODE_BY_ID.get(id)!;
    for (const p of n.prereqs) {
      if (!subset.has(p)) return false;
    }
  }
  return true;
}

function subsetScore(subset: Set<string>): { cost: number; effect: number } {
  let cost = 0;
  let effect = 0;
  for (const id of subset) {
    const n = NODE_BY_ID.get(id)!;
    cost += n.cost;
    effect += n.effect;
  }
  return { cost, effect };
}

const optimal = computed(() => {
  // Exhaustive over the non-root nodes; include the root always.
  const nonRoot = NODES.filter((n) => n.id !== 'A');
  let best: { effect: number; cost: number; ids: string[] } = {
    effect: 0,
    cost: 0,
    ids: ['A'],
  };
  const total = 1 << nonRoot.length;
  for (let mask = 0; mask < total; mask++) {
    const ids = new Set<string>(['A']);
    for (let i = 0; i < nonRoot.length; i++) {
      if (mask & (1 << i)) ids.add(nonRoot[i].id);
    }
    if (!isValidSubset(ids)) continue;
    const s = subsetScore(ids);
    if (s.cost > budget.value) continue;
    if (s.effect > best.effect) {
      best = { effect: s.effect, cost: s.cost, ids: Array.from(ids).sort() };
    }
  }
  return best;
});

const greedy = computed(() => {
  // Pick highest effect/cost ratio among nodes whose prereqs are met and
  // whose addition fits in the remaining budget.  Repeat until stuck.
  const picked = new Set<string>(['A']);
  while (true) {
    const candidates = NODES.filter(
      (n) =>
        !picked.has(n.id) &&
        n.prereqs.every((p) => picked.has(p)) &&
        subsetScore(picked).cost + n.cost <= budget.value,
    );
    if (candidates.length === 0) break;
    candidates.sort(
      (a, b) => b.effect / Math.max(0.001, b.cost) - a.effect / Math.max(0.001, a.cost),
    );
    picked.add(candidates[0].id);
  }
  const s = subsetScore(picked);
  return { effect: s.effect, cost: s.cost, ids: Array.from(picked).sort() };
});

const greedyMatches = computed(() => greedy.value.effect === optimal.value.effect);

function nodeClass(n: Node): Record<string, boolean> {
  return {
    selected: selected.value.has(n.id),
    locked: !n.prereqs.every((p) => selected.value.has(p)) && !selected.value.has(n.id),
    root: n.id === 'A',
  };
}

const colorPicked = seriesColor('amber');

function pathFor(from: string, to: string): string {
  const a = NODE_BY_ID.get(from)!;
  const b = NODE_BY_ID.get(to)!;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  const ux = dx / len;
  const uy = dy / len;
  const r = 22;
  const x1 = a.x + ux * r;
  const y1 = a.y + uy * r;
  const x2 = b.x - ux * r;
  const y2 = b.y - uy * r;
  return `M ${x1} ${y1} L ${x2} ${y2}`;
}

function edgeActive(from: string, to: string): boolean {
  return selected.value.has(from) && selected.value.has(to);
}
</script>

<template>
  <div class="demo">
    <div class="demo-controls">
      <label>
        <span class="demo-label">budget = {{ budget }}</span>
        <input v-model.number="budget" type="range" min="5" max="40" step="1" />
      </label>
      <button type="button" class="reset-btn" @click="reset">reset selection</button>
    </div>

    <div class="dag-wrap">
      <svg viewBox="0 0 460 320" class="dag">
        <g v-for="e in EDGES" :key="`${e.from}-${e.to}`">
          <path
            :d="pathFor(e.from, e.to)"
            :stroke="edgeActive(e.from, e.to) ? colorPicked : 'var(--color-border)'"
            :stroke-width="edgeActive(e.from, e.to) ? 2 : 1"
            fill="none"
          />
        </g>
        <g v-for="n in NODES" :key="n.id" class="node-group" @click="toggle(n.id)">
          <circle :cx="n.x" :cy="n.y" r="22" :class="nodeClass(n)" />
          <text :x="n.x" :y="n.y - 1" text-anchor="middle" class="node-label">{{ n.label }}</text>
          <text :x="n.x" :y="n.y + 12" text-anchor="middle" class="node-cost">
            {{ n.cost }}c/{{ n.effect }}e
          </text>
        </g>
      </svg>
    </div>

    <div class="readouts">
      <div :class="{ over: overBudget }">
        <span class="r-label">your selection</span>
        <code>cost {{ userScore.cost }} / budget {{ budget }} · effect {{ userScore.effect }}</code>
        <span v-if="overBudget" class="warn">over budget</span>
      </div>
      <div>
        <span class="r-label">greedy (effect / cost)</span>
        <code
          >effect {{ greedy.effect }} ·
          {{ greedy.ids.filter((x) => x !== 'A').join('') || '∅' }}</code
        >
      </div>
      <div class="optimal">
        <span class="r-label">exhaustive optimum</span>
        <code
          >effect {{ optimal.effect }} ·
          {{ optimal.ids.filter((x) => x !== 'A').join('') || '∅' }}</code
        >
      </div>
      <div>
        <span class="r-label">greedy matches optimum?</span>
        <code :class="{ ok: greedyMatches, bad: !greedyMatches }">
          {{ greedyMatches ? 'yes' : 'no — greedy fell short' }}
        </code>
      </div>
    </div>

    <p class="demo-note">
      Each node has a cost (currency) and an effect (score). Edges encode prerequisites; a node only
      becomes pickable when all its prereqs are taken. Click to toggle. The catalog's
      per-fixed-selection algebra closes — sum the costs, sum the effects — but the optimization
      across selections lives in the bifurcations row. At small <em>N</em> we just enumerate all
      <code>2^N</code> subsets; in shipped games (Time Studies' prerequisite tree, loadouts with
      exclusive slots) the search space explodes and players reach for branch-and-bound or
      constraint propagation. Notice the greedy heuristic doesn't always match the exhaustive
      optimum: the by-ratio rule can lock the budget into a cheap-but-prereq-blocked path. Try
      budget 18 or 19 — greedy and optimum diverge.
    </p>
  </div>
</template>

<style scoped>
.demo-controls {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--gap);
  align-items: end;
}
.reset-btn {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  color: var(--color-text-muted);
  font-family: var(--font-mono);
  font-size: 0.85em;
  padding: var(--gap-sm) var(--gap);
  border-radius: var(--radius-sm);
  cursor: pointer;
  height: fit-content;
}
.reset-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-text);
}
.dag-wrap {
  margin-top: var(--gap);
  background: var(--color-bg);
  border-radius: var(--radius-sm);
  padding: var(--gap);
}
.dag {
  width: 100%;
  max-height: 360px;
  display: block;
}
.node-group {
  cursor: pointer;
}
.dag circle {
  fill: var(--color-surface);
  stroke: var(--color-text-muted);
  stroke-width: 1.5;
  transition:
    fill 0.1s,
    stroke 0.1s;
}
.dag circle.selected {
  fill: var(--color-surface-hover);
  stroke: var(--series-amber);
  stroke-width: 2.5;
}
.dag circle.locked {
  fill: var(--color-bg);
  stroke: var(--color-border);
  stroke-dasharray: 3 3;
}
.dag circle.root {
  fill: var(--color-surface-hover);
  stroke: var(--series-teal);
  stroke-width: 2;
}
.node-label {
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 600;
  fill: var(--color-text);
  pointer-events: none;
}
.node-cost {
  font-family: var(--font-mono);
  font-size: 9px;
  fill: var(--color-text-muted);
  pointer-events: none;
}
.readouts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--gap);
  margin-top: var(--gap);
  font-family: var(--font-mono);
  font-size: 0.86em;
}
.readouts > div {
  background: var(--color-bg);
  border-radius: var(--radius-sm);
  padding: var(--gap-sm) var(--gap);
}
.r-label {
  display: block;
  color: var(--color-text-muted);
  font-size: 0.78em;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 2px;
}
.readouts code {
  background: none;
  padding: 0;
  color: var(--color-text);
  font-size: 0.95em;
}
.readouts .over code {
  color: var(--series-mauve);
}
.readouts .optimal code {
  color: var(--color-primary);
  font-weight: 600;
}
.warn {
  display: block;
  color: var(--series-mauve);
  font-size: 0.78em;
  margin-top: 2px;
}
.ok {
  color: var(--series-teal);
}
.bad {
  color: var(--series-mauve);
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
