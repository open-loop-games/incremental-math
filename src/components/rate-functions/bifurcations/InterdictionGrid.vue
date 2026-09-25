<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';

// Shortest-path network interdiction on a small open field.  The follower
// re-solves its own shortest path (BFS) after every wall; the player is the
// leader, spending a wall budget to maximize that path.
//
// Three reference strategies for the same budget:
//   greedy    — place the single wall with the best immediate gain, stop at zero
//   lookahead — when no single wall gains, try pairs (the plateau patch)
//   exact     — branch on the incumbent shortest path.  Complete, because any
//               strictly-improving blocker set must block the standing path:
//               if it doesn't, that path survives and the length is unchanged.
//
// Board: rocks are fixed terrain, S spawn, E exit.  Tuned so that no single
// wall gains anything (greedy stalls at the base length), the pair patch breaks
// the first plateau, and from budget 3 on the exact search finds strictly more
// than the patch — later plateaus are wider than the patch anticipates.
const ROWS = [
  '....#....',
  '....#..#.',
  '.........',
  'S.#.....E',
  '.........',
  '....#..#.',
  '....#....',
] as const;

const W = ROWS[0].length;
const H = ROWS.length;
const CELL = 34;
const MAX_BUDGET = 5;

const rock = new Set<number>();
let START = 0;
let GOAL = 0;
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = y * W + x;
    const c = ROWS[y][x];
    if (c === '#') rock.add(i);
    if (c === 'S') START = i;
    if (c === 'E') GOAL = i;
  }
}

const NBRS: number[][] = [];
for (let i = 0; i < W * H; i++) {
  const x = i % W;
  const y = Math.floor(i / W);
  const a: number[] = [];
  if (x > 0) a.push(i - 1);
  if (x < W - 1) a.push(i + 1);
  if (y > 0) a.push(i - W);
  if (y < H - 1) a.push(i + W);
  NBRS.push(a.filter((n) => !rock.has(n)));
}

interface Solution {
  len: number;
  path: number[];
}

const distBuf = new Int32Array(W * H);

/** The follower's problem: shortest path S→E, or null if the walls seal it. */
function solve(walls: Set<number>): Solution | null {
  distBuf.fill(-1);
  distBuf[START] = 0;
  const queue = [START];
  for (let head = 0; head < queue.length; head++) {
    const c = queue[head];
    for (const n of NBRS[c]) {
      if (distBuf[n] !== -1 || walls.has(n)) continue;
      distBuf[n] = distBuf[c] + 1;
      queue.push(n);
    }
  }
  if (distBuf[GOAL] === -1) return null;
  const path: number[] = [];
  let c = GOAL;
  while (c !== START) {
    path.push(c);
    c = NBRS[c].find((n) => distBuf[n] === distBuf[c] - 1 && distBuf[n] !== -1)!;
  }
  path.push(START);
  path.reverse();
  return { len: distBuf[GOAL], path };
}

/** Cells of the standing path that a blocker may occupy. */
function blockable(path: number[]): number[] {
  return path.filter((c) => c !== START && c !== GOAL);
}

interface Plan {
  len: number;
  walls: number[];
}

function runGreedy(budget: number, pairs: boolean): Plan {
  const walls = new Set<number>();
  let cur = solve(walls)!;
  while (walls.size < budget) {
    let best: { len: number; cells: number[] } | null = null;
    for (const c of blockable(cur.path)) {
      walls.add(c);
      const r = solve(walls);
      if (r && (!best || r.len > best.len)) best = { len: r.len, cells: [c] };
      walls.delete(c);
    }
    // The patch: only when no single wall gains, and only if two fit.
    if (pairs && (!best || best.len <= cur.len) && walls.size + 2 <= budget) {
      for (const a of blockable(cur.path)) {
        walls.add(a);
        const after = solve(walls);
        if (after) {
          for (const b of blockable(after.path)) {
            walls.add(b);
            const r = solve(walls);
            if (r && (!best || r.len > best.len)) best = { len: r.len, cells: [a, b] };
            walls.delete(b);
          }
        }
        walls.delete(a);
      }
    }
    if (!best || best.len <= cur.len) break;
    for (const c of best.cells) walls.add(c);
    cur = solve(walls)!;
  }
  return { len: cur.len, walls: [...walls] };
}

/** Exact max-min for every budget up to `budget`, in one branching pass. */
function runExact(budget: number): Plan[] {
  const base = solve(new Set())!.len;
  const best: Plan[] = Array.from({ length: budget + 1 }, () => ({ len: base, walls: [] }));
  const walls = new Set<number>();
  const seen = new Set<string>();
  const visit = (left: number): void => {
    const cur = solve(walls);
    if (!cur) return;
    for (let size = walls.size; size <= budget; size++) {
      if (cur.len > best[size].len) best[size] = { len: cur.len, walls: [...walls] };
    }
    if (left === 0) return;
    for (const c of blockable(cur.path)) {
      walls.add(c);
      const key = [...walls].sort((a, b) => a - b).join(',');
      if (!seen.has(key)) {
        seen.add(key);
        visit(left - 1);
      }
      walls.delete(c);
    }
  };
  visit(budget);
  return best;
}

type Strategy = 'you' | 'greedy' | 'lookahead' | 'exact';

const budget = ref(2);
const strategy = ref<Strategy>('you');
const yourWalls = ref<Set<number>>(new Set());
const rejected = ref<number | null>(null);

// Solver reference plans are functions of the budget alone, so one pass at
// mount covers every slider position.
const plans = ref<Record<Exclude<Strategy, 'you'>, Plan[]> | null>(null);
onMounted(() => {
  const exact = runExact(MAX_BUDGET);
  const greedy: Plan[] = [];
  const lookahead: Plan[] = [];
  for (let b = 0; b <= MAX_BUDGET; b++) {
    greedy.push(runGreedy(b, false));
    lookahead.push(runGreedy(b, true));
  }
  plans.value = { greedy, lookahead, exact };
});

const baseLength = solve(new Set())!.len;

function planFor(s: Exclude<Strategy, 'you'>): Plan {
  return plans.value?.[s][budget.value] ?? { len: baseLength, walls: [] };
}

const yourPlan = computed<Plan>(() => {
  const r = solve(yourWalls.value);
  return { len: r ? r.len : baseLength, walls: [...yourWalls.value] };
});

const shownWalls = computed<Set<number>>(() =>
  strategy.value === 'you' ? yourWalls.value : new Set(planFor(strategy.value).walls),
);

const shownSolution = computed(() => solve(shownWalls.value));

const overBudget = computed(() => strategy.value === 'you' && yourWalls.value.size > budget.value);

function toggleCell(i: number): void {
  if (rock.has(i) || i === START || i === GOAL) return;
  strategy.value = 'you';
  const next = new Set(yourWalls.value);
  if (next.has(i)) {
    next.delete(i);
  } else {
    next.add(i);
    // GemCraft's rule: a placement that seals the route is refused outright.
    if (!solve(next)) {
      rejected.value = i;
      window.setTimeout(() => {
        if (rejected.value === i) rejected.value = null;
      }, 900);
      return;
    }
  }
  rejected.value = null;
  yourWalls.value = next;
}

function clearWalls(): void {
  yourWalls.value = new Set();
  rejected.value = null;
}

function copyPlan(s: Exclude<Strategy, 'you'>): void {
  yourWalls.value = new Set(planFor(s).walls);
  strategy.value = 'you';
}

const cx = (i: number) => (i % W) * CELL + CELL / 2;
const cy = (i: number) => Math.floor(i / W) * CELL + CELL / 2;

const pathLine = computed(() => {
  const sol = shownSolution.value;
  if (!sol) return '';
  return sol.path.map((c, k) => `${k === 0 ? 'M' : 'L'} ${cx(c)} ${cy(c)}`).join(' ');
});

const CELLS = Array.from({ length: W * H }, (_, i) => i);

// Refusal chip sits above the rejected cell, clamped inside the board.
const rejectChip = computed(() => {
  const i = rejected.value ?? 0;
  return {
    x: Math.min(Math.max(cx(i), 36), W * CELL - 36),
    y: Math.max(14, cy(i) - CELL / 2 - 4),
  };
});

// Length-vs-budget strip: the three solver curves over the whole slider range.
const STRIP_W = 420;
const STRIP_H = 150;
const PAD = { l: 34, r: 62, t: 12, b: 24 };
const SERIES = [
  { key: 'greedy', label: 'greedy' },
  { key: 'lookahead', label: '2-step' },
  { key: 'exact', label: 'exact' },
] as const;

const stripX = (b: number) => PAD.l + (b / MAX_BUDGET) * (STRIP_W - PAD.l - PAD.r);

const strip = computed(() => {
  const all = plans.value;
  if (!all) return null;
  const lens = SERIES.map((s) => all[s.key].map((p) => p.len));
  const lo = Math.min(...lens.flat());
  const hi = Math.max(...lens.flat());
  const y = (v: number) =>
    STRIP_H - PAD.b - ((v - lo) / Math.max(1, hi - lo)) * (STRIP_H - PAD.t - PAD.b);
  return {
    lo,
    hi,
    yLo: y(lo),
    yHi: y(hi),
    series: SERIES.map((s, idx) => ({
      key: s.key,
      label: s.label,
      d: lens[idx].map((v, b) => `${b === 0 ? 'M' : 'L'} ${stripX(b)} ${y(v)}`).join(' '),
      dots: lens[idx].map((v, b) => ({ x: stripX(b), y: y(v), b })),
      labelY: y(lens[idx][MAX_BUDGET]),
      atBudget: lens[idx][budget.value],
    })),
  };
});

const budgetTicks = Array.from({ length: MAX_BUDGET + 1 }, (_, b) => ({ b, x: stripX(b) }));

const readouts = computed(() => [
  { key: 'you' as const, label: 'your walls', len: yourPlan.value.len, used: yourWalls.value.size },
  {
    key: 'greedy' as const,
    label: 'greedy (1 wall at a time)',
    len: planFor('greedy').len,
    used: planFor('greedy').walls.length,
  },
  {
    key: 'lookahead' as const,
    label: '+ 2-step lookahead',
    len: planFor('lookahead').len,
    used: planFor('lookahead').walls.length,
  },
  {
    key: 'exact' as const,
    label: 'exact max-min',
    len: planFor('exact').len,
    used: planFor('exact').walls.length,
  },
]);
</script>

<template>
  <div class="demo interdiction">
    <div class="demo-controls">
      <label>
        <span class="demo-label">blocker budget = {{ budget }}</span>
        <input v-model.number="budget" type="range" min="0" :max="MAX_BUDGET" step="1" />
      </label>
      <div class="strategy-picker">
        <span class="demo-label">showing</span>
        <div class="seg">
          <button
            v-for="r in readouts"
            :key="r.key"
            type="button"
            :class="{ on: strategy === r.key }"
            @click="strategy = r.key"
          >
            {{ r.key === 'you' ? 'you' : r.key === 'lookahead' ? '2-step' : r.key }}
          </button>
        </div>
      </div>
    </div>

    <div class="board-wrap">
      <svg
        :viewBox="`0 0 ${W * CELL} ${H * CELL}`"
        class="board"
        role="img"
        aria-label="Grid with spawn, exit, terrain and player-placed blockers"
      >
        <defs>
          <pattern id="rock-hatch" width="6" height="6" patternUnits="userSpaceOnUse">
            <path d="M -1 1 L 1 -1 M 0 6 L 6 0 M 5 7 L 7 5" class="hatch" />
          </pattern>
        </defs>
        <g v-for="i in CELLS" :key="i">
          <rect
            :x="(i % W) * CELL + 1"
            :y="Math.floor(i / W) * CELL + 1"
            :width="CELL - 2"
            :height="CELL - 2"
            rx="3"
            class="cell"
            :class="{
              rock: rock.has(i),
              wall: shownWalls.has(i),
              ghost: strategy !== 'you' && shownWalls.has(i),
              endpoint: i === START || i === GOAL,
              rejected: rejected === i,
              clickable: !rock.has(i) && i !== START && i !== GOAL,
            }"
            @click="toggleCell(i)"
          />
        </g>

        <path :d="pathLine" class="follower-path" fill="none" />

        <text :x="cx(START)" :y="cy(START) + 4" class="endpoint-label">S</text>
        <text :x="cx(GOAL)" :y="cy(GOAL) + 4" class="endpoint-label">E</text>
        <g v-if="rejected !== null">
          <rect
            :x="rejectChip.x - 34"
            :y="rejectChip.y - 12"
            width="68"
            height="17"
            rx="3"
            class="reject-chip"
          />
          <text :x="rejectChip.x" :y="rejectChip.y" class="reject-label">would seal</text>
        </g>
      </svg>

      <div class="strip-col">
        <svg
          v-if="strip"
          :viewBox="`0 0 ${STRIP_W} ${STRIP_H}`"
          class="strip"
          role="img"
          aria-label="Path length against blocker budget for the three strategies"
        >
          <line
            :x1="stripX(budget)"
            :y1="PAD.t - 4"
            :x2="stripX(budget)"
            :y2="STRIP_H - PAD.b"
            class="strip-mark"
          />
          <text
            v-for="t in budgetTicks"
            :key="`t-${t.b}`"
            :x="t.x"
            :y="STRIP_H - PAD.b + 13"
            class="strip-axis"
            text-anchor="middle"
            :class="{ current: t.b === budget }"
          >
            {{ t.b }}
          </text>
          <text :x="PAD.l - 8" :y="strip.yHi + 3" class="strip-axis" text-anchor="end">
            {{ strip.hi }}
          </text>
          <text :x="PAD.l - 8" :y="strip.yLo + 3" class="strip-axis" text-anchor="end">
            {{ strip.lo }}
          </text>
          <g v-for="s in strip.series" :key="s.key">
            <path :d="s.d" :class="['strip-curve', s.key]" fill="none" />
            <circle
              v-for="dot in s.dots"
              :key="`${s.key}-${dot.b}`"
              :cx="dot.x"
              :cy="dot.y"
              :r="dot.b === budget ? 3.5 : 2"
              :class="['strip-dot', s.key]"
            />
            <text :x="STRIP_W - PAD.r + 8" :y="s.labelY + 3" :class="['strip-label', s.key]">
              {{ s.label }}
            </text>
          </g>
        </svg>
        <p class="strip-caption">path length (vertical) against blocker budget (horizontal)</p>
      </div>
    </div>

    <div class="readouts">
      <div
        v-for="r in readouts"
        :key="r.key"
        :class="{ active: strategy === r.key, over: r.key === 'you' && overBudget }"
      >
        <span class="r-label">{{ r.label }}</span>
        <code>path {{ r.len }} · {{ r.used }} wall{{ r.used === 1 ? '' : 's' }}</code>
        <button
          v-if="r.key !== 'you'"
          type="button"
          class="copy-btn"
          @click="copyPlan(r.key as 'greedy' | 'lookahead' | 'exact')"
        >
          place these
        </button>
        <span v-else-if="overBudget" class="warn">over budget</span>
      </div>
    </div>

    <div class="demo-controls">
      <button type="button" class="reset-btn" @click="clearWalls">clear walls</button>
    </div>

    <p class="demo-note">
      Click a cell to wall it; the follower re-solves its shortest path immediately. A placement
      that would leave no route at all is refused, the way a maze-builder refuses to let you seal
      the board &mdash; try boxing the spawn in. Base path is
      <code>{{ baseLength }}</code
      >, and the leader's problem is to buy the longest path the budget affords. On this board
      <em>no single wall lengthens the path at all</em>: every wall you place alone gets bypassed at
      equal cost, so the greedy that stops when the best marginal gain hits zero never spends a
      coin. Pairs break the first plateau, which is why the lookahead patch moves at all &mdash; but
      a patch is not a bound: from budget 3 onward the exact search, branching on the standing path,
      finds strictly more, and by budget 5 it is four cells of path ahead. That gap is the whole
      reason the spec is the max-min problem statement and the greedy is only the fast solver.
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
.strategy-picker .seg {
  display: flex;
  gap: 2px;
  margin-top: 2px;
}
.seg button,
.reset-btn,
.copy-btn {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  color: var(--color-text-muted);
  font-family: var(--font-mono);
  font-size: 0.8em;
  padding: var(--gap-sm) var(--gap);
  border-radius: var(--radius-sm);
  cursor: pointer;
}
.seg button:hover,
.reset-btn:hover,
.copy-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-text);
}
.seg button.on {
  border-color: var(--series-amber);
  color: var(--color-text);
  background: var(--color-surface-hover);
}
.reset-btn {
  height: fit-content;
  width: fit-content;
}
.copy-btn {
  margin-top: 4px;
  padding: 2px var(--gap-sm);
  font-size: 0.75em;
}
.board-wrap {
  display: grid;
  grid-template-columns: minmax(240px, 1.1fr) minmax(240px, 1fr);
  gap: var(--gap-lg);
  align-items: center;
  margin-top: var(--gap);
  background: var(--color-bg);
  border-radius: var(--radius-sm);
  padding: var(--gap);
}
@media (max-width: 640px) {
  .board-wrap {
    grid-template-columns: 1fr;
  }
}
.board,
.strip {
  width: 100%;
  display: block;
}
.cell {
  fill: var(--color-surface);
  stroke: none;
  transition:
    fill 0.12s,
    stroke 0.12s;
}
.cell.clickable {
  cursor: pointer;
}
.cell.clickable:hover {
  fill: var(--color-surface-hover);
}
.cell.rock {
  fill: url(#rock-hatch);
  stroke: var(--color-border);
  stroke-width: 1;
}
.hatch {
  stroke: var(--color-border);
  stroke-width: 1.4;
}
.cell.wall {
  fill: var(--series-amber);
}
.cell.ghost {
  fill: none;
  stroke: var(--series-amber);
  stroke-width: 2;
  stroke-dasharray: 4 3;
}
.cell.endpoint {
  fill: var(--color-surface-hover);
  stroke: var(--series-slate);
  stroke-width: 1.5;
}
.cell.rejected {
  fill: var(--series-mauve);
}
.follower-path {
  stroke: var(--series-teal);
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 7 5;
  pointer-events: none;
  animation: crawl 2.4s linear infinite;
}
@keyframes crawl {
  to {
    stroke-dashoffset: -24;
  }
}
@media (prefers-reduced-motion: reduce) {
  .follower-path {
    animation: none;
  }
}
.endpoint-label {
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 600;
  fill: var(--color-text);
  text-anchor: middle;
  pointer-events: none;
}
.reject-label {
  font-family: var(--font-mono);
  font-size: 11px;
  fill: var(--series-mauve);
  text-anchor: middle;
  pointer-events: none;
}
.reject-chip {
  fill: var(--color-bg);
  stroke: var(--series-mauve);
  stroke-width: 1;
  pointer-events: none;
}
.strip-curve {
  stroke-width: 2;
}
.strip-curve.greedy {
  stroke: var(--series-mauve);
}
.strip-curve.lookahead {
  stroke: var(--series-slate);
}
.strip-curve.exact {
  stroke: var(--series-teal);
}
.strip-dot.greedy {
  fill: var(--series-mauve);
}
.strip-dot.lookahead {
  fill: var(--series-slate);
}
.strip-dot.exact {
  fill: var(--series-teal);
}
.strip-label {
  font-family: var(--font-mono);
  font-size: 14px;
}
.strip-label.greedy {
  fill: var(--series-mauve);
}
.strip-label.lookahead {
  fill: var(--series-slate);
}
.strip-label.exact {
  fill: var(--series-teal);
}
.strip-axis {
  font-family: var(--font-mono);
  font-size: 13px;
  fill: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
}
.strip-axis.current {
  fill: var(--color-text);
}
.strip-caption {
  margin-top: var(--gap-sm);
  font-family: var(--font-mono);
  font-size: 0.72em;
  color: var(--color-text-muted);
  text-align: center;
}
.strip-mark {
  stroke: var(--color-border);
  stroke-width: 1;
}
.readouts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(146px, 1fr));
  gap: var(--gap);
  margin-top: var(--gap);
  font-family: var(--font-mono);
  font-size: 0.86em;
}
.readouts > div {
  background: var(--color-bg);
  border-radius: var(--radius-sm);
  padding: var(--gap-sm) var(--gap);
  border: 1px solid transparent;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
}
.readouts > div.active {
  border-color: var(--series-amber);
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
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.readouts .over code {
  color: var(--series-mauve);
}
.warn {
  display: block;
  color: var(--series-mauve);
  font-size: 0.78em;
  margin-top: 2px;
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
