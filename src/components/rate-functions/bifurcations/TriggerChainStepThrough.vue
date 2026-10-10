<script setup lang="ts">
import { ref, computed } from 'vue';
import { seriesColor } from '../../../lib/series-colors';

// Five-card plan against an inert dummy: a scaling buff, an ATK-scaled hit,
// a flat hit, a next-hit rider, and a finisher with a precondition.  Each card
// reads and writes (ATK, mark, enemy HP); Execute fizzles unless an earlier
// prefix has already brought HP to EXECUTE_THRESHOLD, the way a planner skips
// an action whose precondition fails.
//
// Per fixed order the damage sums; across the 5! = 120 orders the optimum is a
// search.  Greedy "hardest hit now" leaves HP one above the threshold, so its
// Execute fizzles; the optimum opens with Hone, which is what makes Execute legal.

type CardId = 'Bash' | 'Hone' | 'Smite' | 'Mark' | 'Execute';

interface Card {
  id: CardId;
  name: string;
  description: string;
}

const CARDS: Record<CardId, Card> = {
  Bash: {
    id: 'Bash',
    name: 'Bash',
    description: 'Deal 2 × ATK + mark damage. Consume mark.',
  },
  Hone: {
    id: 'Hone',
    name: 'Hone',
    description: 'ATK += 2 (persists for the rest of the sequence).',
  },
  Smite: {
    id: 'Smite',
    name: 'Smite',
    description: 'Deal 5 + mark damage. Consume mark.',
  },
  Mark: {
    id: 'Mark',
    name: 'Mark',
    description: 'mark := 3 (overwrites any existing mark).',
  },
  Execute: {
    id: 'Execute',
    name: 'Execute',
    description: 'Requires enemy HP ≤ 28, else fizzles. Deal 2 × ATK + 3 × mark. Consume mark.',
  },
};

const DEFAULT_ORDER: CardId[] = ['Bash', 'Hone', 'Smite', 'Mark', 'Execute'];
const order = ref<CardId[]>([...DEFAULT_ORDER]);

const INITIAL_ATK = 3;
const INITIAL_HP = 40;
const EXECUTE_THRESHOLD = 28;

interface Step {
  card: CardId;
  atkBefore: number;
  atkAfter: number;
  markBefore: number;
  markAfter: number;
  damage: number;
  hpAfter: number;
  fizzled: boolean;
}

interface RunResult {
  steps: Step[];
  finalHp: number;
  totalDamage: number;
}

interface State {
  atk: number;
  mark: number;
  hp: number;
}

function playCard(st: State, id: CardId): { next: State; step: Step } {
  let { atk, mark, hp } = st;
  let dmg = 0;
  let fizzled = false;
  if (id === 'Bash') {
    dmg = 2 * atk + mark;
    mark = 0;
  } else if (id === 'Hone') {
    atk += 2;
  } else if (id === 'Smite') {
    dmg = 5 + mark;
    mark = 0;
  } else if (id === 'Mark') {
    mark = 3;
  } else if (hp <= EXECUTE_THRESHOLD) {
    dmg = 2 * atk + 3 * mark;
    mark = 0;
  } else {
    fizzled = true;
  }
  hp = Math.max(0, hp - dmg);
  return {
    next: { atk, mark, hp },
    step: {
      card: id,
      atkBefore: st.atk,
      atkAfter: atk,
      markBefore: st.mark,
      markAfter: mark,
      damage: dmg,
      hpAfter: hp,
      fizzled,
    },
  };
}

const START: State = { atk: INITIAL_ATK, mark: 0, hp: INITIAL_HP };

function runSequence(seq: CardId[]): RunResult {
  let st = START;
  const steps: Step[] = [];
  for (const id of seq) {
    const { next, step } = playCard(st, id);
    steps.push(step);
    st = next;
  }
  return { steps, finalHp: st.hp, totalDamage: INITIAL_HP - st.hp };
}

// Greedy "hardest hit now": each turn, play the remaining card that deals the most
// damage this turn (ties to the earlier card in DEFAULT_ORDER).
const greedy = computed(() => {
  let st = START;
  let left = [...DEFAULT_ORDER];
  const seq: CardId[] = [];
  while (left.length > 0) {
    let best = left[0];
    let bestDmg = -1;
    for (const id of left) {
      const dmg = playCard(st, id).step.damage;
      if (dmg > bestDmg) {
        best = id;
        bestDmg = dmg;
      }
    }
    seq.push(best);
    st = playCard(st, best).next;
    left = left.filter((id) => id !== best);
  }
  return { order: seq, damage: INITIAL_HP - st.hp };
});

const userRun = computed(() => runSequence(order.value));

// Exhaustive search over 5! = 120 orderings.  Tiny — no need for memoization.
const optimal = computed(() => {
  let best: { order: CardId[]; damage: number } = { order: [...DEFAULT_ORDER], damage: 0 };
  const perms: CardId[][] = [];
  function permute(arr: CardId[], start: number): void {
    if (start === arr.length) {
      perms.push([...arr]);
      return;
    }
    for (let i = start; i < arr.length; i++) {
      [arr[start], arr[i]] = [arr[i], arr[start]];
      permute(arr, start + 1);
      [arr[start], arr[i]] = [arr[i], arr[start]];
    }
  }
  permute([...DEFAULT_ORDER], 0);
  for (const p of perms) {
    const r = runSequence(p);
    if (r.totalDamage > best.damage) best = { order: p, damage: r.totalDamage };
  }
  return best;
});

const damageGap = computed(() => optimal.value.damage - userRun.value.totalDamage);
const isOptimal = computed(() => damageGap.value === 0);

function moveLeft(i: number): void {
  if (i <= 0) return;
  const next = [...order.value];
  [next[i - 1], next[i]] = [next[i], next[i - 1]];
  order.value = next;
}

function moveRight(i: number): void {
  if (i >= order.value.length - 1) return;
  const next = [...order.value];
  [next[i], next[i + 1]] = [next[i + 1], next[i]];
  order.value = next;
}

function applyOptimal(): void {
  order.value = [...optimal.value.order];
}

function reset(): void {
  order.value = [...DEFAULT_ORDER];
}

const colorBuff = seriesColor('teal');
const colorAttack = seriesColor('amber');
const colorMark = seriesColor('mauve');

function cardClass(id: CardId): string {
  if (id === 'Hone' || id === 'Mark') return 'buff';
  return 'attack';
}

function cardColor(id: CardId): string {
  if (id === 'Hone') return colorBuff;
  if (id === 'Mark') return colorMark;
  return colorAttack;
}
</script>

<template>
  <div class="demo">
    <p class="setup-note">
      Initial state: <code>ATK = {{ INITIAL_ATK }}</code
      >, <code>mark = 0</code>, enemy <code>HP = {{ INITIAL_HP }}</code
      >. Reorder the five cards. Each card runs in sequence and mutates
      <code>(ATK, mark, HP)</code>; <code>Execute</code> fizzles unless HP is already at
      <code>{{ EXECUTE_THRESHOLD }}</code> or below. Total damage is the sum across the five turns.
      Search space: <code>5! = 120</code> orderings.
    </p>

    <div class="dual">
      <div class="seq-panel">
        <div class="seq-header">
          <span class="panel-label">play order</span>
          <div class="seq-actions">
            <button type="button" class="action-btn" @click="reset">reset</button>
            <button type="button" class="action-btn primary" @click="applyOptimal">
              apply optimum
            </button>
          </div>
        </div>
        <ol class="cards">
          <li
            v-for="(id, i) in order"
            :key="`${id}-${i}`"
            class="card"
            :class="cardClass(id)"
            :style="{ '--card-color': cardColor(id) }"
          >
            <div class="card-header">
              <span class="card-pos">{{ i + 1 }}</span>
              <span class="card-name">{{ CARDS[id].name }}</span>
            </div>
            <p class="card-desc">
              {{ CARDS[id].description }}
            </p>
            <div class="card-buttons">
              <button type="button" :disabled="i === 0" aria-label="move left" @click="moveLeft(i)">
                ◀
              </button>
              <button
                type="button"
                :disabled="i === order.length - 1"
                aria-label="move right"
                @click="moveRight(i)"
              >
                ▶
              </button>
            </div>
          </li>
        </ol>
      </div>

      <div class="sim-panel">
        <span class="panel-label">step-by-step</span>
        <div class="steps">
          <div class="step header">
            <span class="step-i">#</span>
            <span class="step-card">card</span>
            <span class="step-atk">ATK</span>
            <span class="step-mark">mark</span>
            <span class="step-dmg">dmg</span>
            <span class="step-hp">HP</span>
          </div>
          <div class="step initial">
            <span class="step-i">·</span>
            <span class="step-card">(start)</span>
            <span class="step-atk">{{ INITIAL_ATK }}</span>
            <span class="step-mark">0</span>
            <span class="step-dmg">—</span>
            <span class="step-hp">{{ INITIAL_HP }}</span>
          </div>
          <div
            v-for="(s, i) in userRun.steps"
            :key="i"
            class="step"
            :class="[cardClass(s.card), { fizzled: s.fizzled }]"
          >
            <span class="step-i">{{ i + 1 }}</span>
            <span class="step-card">{{ s.card }}</span>
            <span class="step-atk">
              {{ s.atkAfter }}
              <span v-if="s.atkAfter !== s.atkBefore" class="delta">
                (+{{ s.atkAfter - s.atkBefore }})
              </span>
            </span>
            <span class="step-mark">
              {{ s.markAfter }}
              <span v-if="s.markAfter !== s.markBefore" class="delta">
                ({{ s.markAfter > s.markBefore ? '+' : '' }}{{ s.markAfter - s.markBefore }})
              </span>
            </span>
            <span class="step-dmg">{{
              s.fizzled ? 'fizzles' : s.damage > 0 ? s.damage : '—'
            }}</span>
            <span class="step-hp">{{ s.hpAfter }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="readouts">
      <div :class="{ optimal: isOptimal }">
        <span class="r-label">your total damage</span>
        <code>{{ userRun.totalDamage }}</code>
      </div>
      <div>
        <span class="r-label">enemy HP remaining</span>
        <code>{{ userRun.finalHp }}</code>
      </div>
      <div :class="{ ok: isOptimal, bad: !isOptimal }">
        <span class="r-label">gap to optimum</span>
        <code>{{ isOptimal ? 'matches' : `−${damageGap}` }}</code>
      </div>
      <div class="opt-cell">
        <span class="r-label">greedy, hardest hit now</span>
        <code>{{ greedy.damage }} ({{ greedy.order.join(' → ') }})</code>
      </div>
      <div class="opt-cell">
        <span class="r-label">exhaustive optimum</span>
        <code>{{ optimal.damage }} ({{ optimal.order.join(' → ') }})</code>
      </div>
    </div>

    <p class="demo-note">
      The catalog's algebra is fine inside one ordering — sum the per-turn damage, no surprises.
      Across orderings, the optimum is a search over a permutation space. <code>Hone</code> and
      <code>Mark</code> deal zero damage on their turn but raise damage on a later turn
      <em>if</em> they're scheduled before the right attack; played last they're wasted.
      <code>Execute</code> adds a precondition: whether it fires at all depends on what the prefix
      did to HP. Greedy plays <code>Bash</code> and <code>Smite</code> first for the biggest
      immediate hits, stops one HP short of the threshold, and its <code>Execute</code> fizzles. The
      optimum opens with <code>Hone</code>, which turns <code>Bash</code> into the hit that makes
      <code>Execute</code> legal. Real action queues add repeat counts and many more actions, and
      the search outgrows enumeration fast.
    </p>
  </div>
</template>

<style scoped>
.setup-note {
  font-size: 0.92em;
  color: var(--color-text-muted);
  margin-bottom: var(--gap);
  line-height: 1.5;
}
.setup-note code {
  background: var(--color-bg);
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 0.95em;
}
.dual {
  display: flex;
  flex-direction: column;
  gap: var(--gap);
}
.seq-panel,
.sim-panel {
  background: var(--color-bg);
  border-radius: var(--radius-sm);
  padding: var(--gap);
  min-width: 0;
}
.panel-label {
  display: block;
  font-family: var(--font-mono);
  font-size: 0.78rem;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: var(--gap-sm);
}
.seq-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: var(--gap-sm);
}
.seq-actions {
  display: flex;
  gap: var(--gap-sm);
}
.action-btn {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  color: var(--color-text-muted);
  font-family: var(--font-mono);
  font-size: 0.78em;
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  cursor: pointer;
}
.action-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-text);
}
.action-btn.primary {
  border-color: var(--color-primary);
  color: var(--color-primary);
}
.cards {
  list-style: none;
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: var(--gap-sm);
  margin: 0;
  padding: 0;
}
@media (max-width: 640px) {
  .cards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
.card {
  display: flex;
  flex-direction: column;
  background: var(--color-surface);
  border-radius: var(--radius-sm);
  padding: var(--gap-sm) var(--gap-sm) var(--gap-sm) var(--gap);
  border-left: 3px solid var(--card-color);
}
.card-header {
  display: flex;
  gap: var(--gap-sm);
  align-items: center;
}
.card .card-buttons {
  margin-top: auto;
  align-self: flex-end;
}
.card-pos {
  font-family: var(--font-mono);
  font-size: 0.78em;
  color: var(--color-text-muted);
  background: var(--color-bg);
  width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}
.card-name {
  font-family: var(--font-mono);
  font-weight: 600;
  color: var(--card-color);
}
.card-buttons {
  display: flex;
  gap: 2px;
}
.card-buttons button {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  color: var(--color-text-muted);
  font-size: 0.7em;
  width: 22px;
  height: 22px;
  cursor: pointer;
  border-radius: var(--radius-sm);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.card-buttons button:hover:not(:disabled) {
  border-color: var(--color-primary);
  color: var(--color-text);
}
.card-buttons button:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
.card-desc {
  margin-top: 4px;
  font-size: 0.85em;
  color: var(--color-text-muted);
  line-height: 1.4;
}
.steps {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-family: var(--font-mono);
  font-size: 0.85em;
}
.step {
  display: grid;
  grid-template-columns: 24px minmax(72px, 1fr) 80px 70px 64px 50px;
  gap: var(--gap-sm);
  padding: 4px 6px;
  border-radius: var(--radius-sm);
  align-items: baseline;
}
.step.header {
  color: var(--color-text-muted);
  font-size: 0.78em;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: var(--gap-sm);
  margin-bottom: var(--gap-sm);
}
.step.initial {
  color: var(--color-text-muted);
}
.step.attack {
  background: rgba(212, 165, 116, 0.06);
}
.step.buff {
  background: rgba(126, 192, 182, 0.06);
}
.step.fizzled {
  background: none;
  outline: 1px dashed var(--color-border);
  outline-offset: -1px;
}
.step.fizzled .step-card,
.step.fizzled .step-dmg {
  color: var(--color-text-muted);
}
.delta {
  color: var(--color-primary);
  font-size: 0.85em;
  margin-left: 2px;
}
.step-card {
  font-weight: 600;
}
.step.attack .step-card {
  color: var(--series-amber);
}
.step.buff .step-card {
  color: var(--series-teal);
}
.step-dmg,
.step-hp,
.step-atk,
.step-mark {
  text-align: right;
  color: var(--color-text);
}
.step-dmg {
  color: var(--series-amber);
}
.step.header .step-dmg,
.step.header .step-hp,
.step.header .step-atk,
.step.header .step-mark,
.step.header .step-card,
.step.initial .step-dmg,
.step.initial .step-hp,
.step.initial .step-atk,
.step.initial .step-mark,
.step.initial .step-card {
  color: var(--color-text-muted);
  font-weight: 400;
}
.readouts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--gap);
  margin-top: var(--gap);
  font-family: var(--font-mono);
  font-size: 0.88em;
}
.readouts > div {
  background: var(--color-bg);
  border-radius: var(--radius-sm);
  padding: var(--gap-sm) var(--gap);
}
.readouts .opt-cell {
  grid-column: 1 / -1;
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
}
.readouts .optimal code {
  color: var(--series-teal);
  font-weight: 600;
}
.ok code {
  color: var(--series-teal);
}
.bad code {
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
@media (max-width: 880px) {
  .dual {
    grid-template-columns: minmax(0, 1fr);
  }
}
@media (max-width: 640px) {
  .step {
    grid-template-columns: 14px minmax(0, 1fr) 52px 52px 56px 28px;
    gap: 4px;
  }
}
</style>
