<script setup lang="ts">
import { ref, computed } from 'vue';

// Eight AD-style normal challenges. Each is a name + the rule mutation
// (paraphrased) and the reward the bit unlocks. Toggling a button flips
// one bit. Order doesn't matter; rewards stack additively in the readout.

interface Slot {
  id: number;
  name: string;
  rule: string;
  reward: string;
}

const SLOTS: Slot[] = [
  { id: 0, name: 'C1', rule: 'first dimension cost +50%', reward: 'autobuyer slot 1' },
  { id: 1, name: 'C2', rule: '1D production halts on 2D upgrade', reward: 'autobuyer slot 2' },
  { id: 2, name: 'C3', rule: 'cost scaling much steeper', reward: 'galaxy autobuyer' },
  { id: 3, name: 'C4', rule: 'higher dimension erases lower', reward: 'tickspeed autobuyer' },
  { id: 4, name: 'C5', rule: 'tickspeed cost +30%', reward: 'sacrifice autobuyer' },
  { id: 5, name: 'C6', rule: 'sacrifice replaced with sum', reward: 'big-crunch autobuyer' },
  { id: 6, name: 'C7', rule: 'production divided by IP', reward: 'eternity-mult autobuyer' },
  { id: 7, name: 'C8', rule: '8D capped at 1', reward: 'replicanti autobuyer' },
];

const completed = ref<boolean[]>(SLOTS.map(() => false));

function toggle(id: number) {
  completed.value[id] = !completed.value[id];
}

const completedBits = computed(() => {
  let bits = 0;
  for (const s of SLOTS) if (completed.value[s.id]) bits |= 1 << s.id;
  return bits;
});

const binary = computed(() => completedBits.value.toString(2).padStart(8, '0'));

const unlockedRewards = computed(() =>
  SLOTS.filter((s) => completed.value[s.id]).map((s) => s.reward),
);

function clearAll() {
  for (const s of SLOTS) completed.value[s.id] = false;
}
function fillAll() {
  for (const s of SLOTS) completed.value[s.id] = true;
}
</script>

<template>
  <div class="demo cbm">
    <div class="cbm-grid">
      <button
        v-for="s in SLOTS"
        :key="s.id"
        class="cbm-slot"
        :class="{ 'cbm-slot--on': completed[s.id] }"
        @click="toggle(s.id)"
      >
        <span class="cbm-name">{{ s.name }}</span>
        <span class="cbm-bit">bit {{ s.id }}</span>
        <span class="cbm-rule">{{ s.rule }}</span>
      </button>
    </div>
    <div class="cbm-actions">
      <button
        class="cbm-btn"
        @click="clearAll"
      >
        clear
      </button>
      <button
        class="cbm-btn"
        @click="fillAll"
      >
        complete all
      </button>
    </div>
    <div class="cbm-readout">
      <p>
        <code>completedBits</code> = <strong>{{ completedBits }}</strong> &nbsp;·&nbsp; binary
        <code>0b{{ binary }}</code>
      </p>
      <p class="cbm-rewards">
        Permanent rewards unlocked ({{ unlockedRewards.length }} / {{ SLOTS.length }}):
        <span
          v-if="unlockedRewards.length === 0"
          class="cbm-empty"
        >— none —</span>
        <span
          v-for="r in unlockedRewards"
          :key="r"
          class="cbm-reward"
        >{{ r }}</span>
      </p>
      <p class="cbm-note">
        Order doesn't matter — completion is one int with one bit per challenge. Once a bit is set
        the reward stays. The whole "challenge slot" interface is this number plus a switch
        statement.
      </p>
    </div>
  </div>
</template>

<style scoped>
.cbm-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: var(--gap);
}
.cbm-slot {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-text);
  font-family: var(--font-mono);
  cursor: pointer;
  text-align: left;
  border-radius: 4px;
  gap: 4px;
}
.cbm-slot:hover {
  border-color: var(--color-text-muted);
}
.cbm-slot--on {
  background: rgba(168, 195, 154, 0.12);
  border-color: var(--series-sage);
}
.cbm-name {
  font-weight: 600;
  font-size: 0.95em;
}
.cbm-bit {
  font-size: 0.7em;
  color: var(--color-text-muted);
  letter-spacing: 0.05em;
}
.cbm-rule {
  font-size: 0.75em;
  color: var(--color-text-muted);
  line-height: 1.3;
}
.cbm-actions {
  display: flex;
  gap: var(--gap);
  margin: var(--gap) 0;
}
.cbm-btn {
  font-family: var(--font-mono);
  font-size: 0.8em;
  padding: 4px 10px;
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  border-radius: 3px;
}
.cbm-btn:hover {
  color: var(--color-text);
}
.cbm-readout {
  font-family: var(--font-mono);
  font-size: 0.9em;
  color: var(--color-text-muted);
  border-top: 1px solid var(--color-border);
  padding-top: var(--gap);
}
.cbm-readout p {
  margin: 0.4em 0;
}
.cbm-rewards {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: baseline;
}
.cbm-reward {
  display: inline-block;
  padding: 1px 6px;
  background: rgba(168, 195, 154, 0.15);
  border-radius: 2px;
  font-size: 0.85em;
}
.cbm-empty {
  font-style: italic;
}
.cbm-note {
  font-style: italic;
  font-size: 0.85em;
}
</style>
