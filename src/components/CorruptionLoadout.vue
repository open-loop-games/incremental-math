<script setup lang="ts">
import { ref, computed } from 'vue';

// Synergism corruption loadout. Difficulty score is faithful (400 + 16·Σlevel²);
// per-corruption score multiplier is a placeholder linear-in-level curve
// (real Synergism formulas are tier-specific and not the lesson here).

interface Corruption {
  key: string;
  name: string;
}

const CORRUPTIONS: Corruption[] = [
  { key: 'viscosity', name: 'Viscosity' },
  { key: 'deflation', name: 'Deflation' },
  { key: 'dilation', name: 'Dilation' },
  { key: 'hyperchallenge', name: 'Hyperchallenge' },
  { key: 'illiteracy', name: 'Illiteracy' },
  { key: 'drought', name: 'Drought' },
  { key: 'recession', name: 'Recession' },
  { key: 'extinction', name: 'Extinction' },
];

const MAX_LEVEL = 15;
const levels = ref<Record<string, number>>(Object.fromEntries(CORRUPTIONS.map((c) => [c.key, 0])));

function scoreMultPerLevel(level: number): number {
  // Placeholder concave-up curve so high levels reward more per step but
  // not absurdly so. Real Synergism formulas vary per corruption.
  return 1 + 0.4 * level + 0.05 * level * level;
}

const difficultyScore = computed(() => {
  let sumSq = 0;
  for (const c of CORRUPTIONS) sumSq += levels.value[c.key] ** 2;
  return 400 + 16 * sumSq;
});

const totalScoreMult = computed(() => {
  let p = 1;
  for (const c of CORRUPTIONS) p *= scoreMultPerLevel(levels.value[c.key]);
  return p;
});

const totalLevels = computed(() => {
  let s = 0;
  for (const c of CORRUPTIONS) s += levels.value[c.key];
  return s;
});

function fmtMult(v: number): string {
  if (v < 1000) return v.toFixed(2) + '×';
  return v.toExponential(2) + '×';
}

function reset() {
  for (const c of CORRUPTIONS) levels.value[c.key] = 0;
}
function fillEqual(level: number) {
  for (const c of CORRUPTIONS) levels.value[c.key] = level;
}
</script>

<template>
  <div class="demo cl">
    <div class="cl-sliders">
      <label v-for="c in CORRUPTIONS" :key="c.key" class="cl-row">
        <span class="cl-name">{{ c.name }}</span>
        <input v-model.number="levels[c.key]" type="range" :min="0" :max="MAX_LEVEL" step="1" />
        <span class="cl-level">{{ levels[c.key] }}</span>
        <span class="cl-mult">×{{ scoreMultPerLevel(levels[c.key]).toFixed(2) }}</span>
      </label>
    </div>
    <div class="cl-actions">
      <button class="cl-btn" @click="reset">reset</button>
      <button class="cl-btn" @click="fillEqual(5)">all → 5</button>
      <button class="cl-btn" @click="fillEqual(10)">all → 10</button>
      <button class="cl-btn" @click="fillEqual(MAX_LEVEL)">all → {{ MAX_LEVEL }}</button>
    </div>
    <div class="cl-readout">
      <p>
        <strong>Difficulty score</strong>
        <code>= 400 + 16 · Σ level²</code> = <strong>{{ difficultyScore.toLocaleString() }}</strong>
      </p>
      <p>
        <strong>Total score multiplier</strong>
        <code>= Π scoreMult(level)</code> = <strong>{{ fmtMult(totalScoreMult) }}</strong>
      </p>
      <p class="cl-note">
        Σ level<sup>2</sup> means a few high-level corruptions dwarf many low ones — push
        <em>extinction</em> from 0 → 15 alone and difficulty jumps
        {{ (16 * 15 * 15).toLocaleString() }} points. The score multiplier is a product across the
        ladder, structurally identical to the modifier-chain product. Sum of
        {{ totalLevels }} levels gives a {{ fmtMult(totalScoreMult) }} reward against difficulty
        {{ difficultyScore.toLocaleString() }}.
      </p>
    </div>
  </div>
</template>

<style scoped>
.cl-sliders {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 6px var(--gap);
}
.cl-row {
  display: grid;
  grid-template-columns: 110px 1fr 24px 56px;
  align-items: center;
  gap: 8px;
  font-family: var(--font-mono);
  font-size: 0.85em;
}
.cl-name {
  color: var(--color-text);
}
.cl-level {
  text-align: right;
  color: var(--color-text-muted);
}
.cl-mult {
  text-align: right;
  color: var(--color-text-muted);
  font-size: 0.85em;
}
.cl-actions {
  display: flex;
  gap: var(--gap);
  margin: var(--gap) 0;
  flex-wrap: wrap;
}
.cl-btn {
  font-family: var(--font-mono);
  font-size: 0.8em;
  padding: 4px 10px;
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  border-radius: 3px;
}
.cl-btn:hover {
  color: var(--color-text);
}
.cl-readout {
  font-family: var(--font-mono);
  font-size: 0.9em;
  color: var(--color-text-muted);
  border-top: 1px solid var(--color-border);
  padding-top: var(--gap);
}
.cl-readout p {
  margin: 0.4em 0;
}
.cl-note {
  font-style: italic;
  font-size: 0.85em;
}
</style>
