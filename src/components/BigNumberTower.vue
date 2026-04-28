<script setup lang="ts">
import { ref, computed } from 'vue';
import { Decimal } from 'open-loop-engine/primitives';

// We use Decimal.toString() rather than the engine's `format` for this demo because
// the lesson is the layer structure itself — toString renders layer-N as a stack of
// `e`s ("ee10" = 10^10^10, "eee10" = 10^10^10^10), which is the genre's canonical
// big-number visual. eternal_notations' default presentation hides the structure
// behind letter-pair glyphs that are unreadable for this teaching purpose.

const props = withDefaults(
  defineProps<{
    maxStep?: number;
    initialStep?: number;
    seed?: number;
  }>(),
  {
    maxStep: 8,
    initialStep: 5,
    seed: 10,
  },
);

const step = ref(props.initialStep);

interface BI {
  /** Mantissa in [1, 10). */
  m: number;
  /** Exponent (base-10), itself a JS Number — this is what break_infinity actually overflows. */
  e: number;
  dead: boolean;
}

function biSeed(x: number): BI {
  const e = Math.floor(Math.log10(x));
  return { m: x / Math.pow(10, e), e, dead: false };
}

function biPow10(x: BI): BI {
  if (x.dead) return x;
  if (x.e > 308) return { m: NaN, e: Infinity, dead: true };
  const newE = x.m * Math.pow(10, x.e);
  if (!isFinite(newE)) return { m: NaN, e: Infinity, dead: true };
  return { m: 1, e: newE, dead: false };
}

function biFormat(x: BI): string {
  if (x.dead) return '∞ (overflow)';
  if (x.e < 6) return (x.m * Math.pow(10, x.e)).toExponential(2);
  if (x.e < 1000) return `${x.m.toFixed(2)}e${Math.round(x.e)}`;
  return `${x.m.toFixed(2)}e${x.e.toExponential(2)}`;
}

function nativeFormat(x: number): string {
  if (!isFinite(x)) return '∞ (overflow)';
  if (x < 1e6) return x.toLocaleString();
  return x.toExponential(2);
}

interface Row {
  step: number;
  native: string;
  bi: string;
  be: string;
  beLayer: number;
}

function beRow(be: Decimal): { be: string; beLayer: number } {
  return { be: be.toString(), beLayer: be.layer ?? 0 };
}

const rows = computed<Row[]>(() => {
  const out: Row[] = [];
  let nat = props.seed;
  let bi = biSeed(props.seed);
  let be = new Decimal(props.seed);
  out.push({
    step: 0,
    native: nativeFormat(nat),
    bi: biFormat(bi),
    ...beRow(be),
  });
  for (let s = 1; s <= step.value; s++) {
    nat = Math.pow(10, nat);
    bi = biPow10(bi);
    be = Decimal.pow(10, be);
    out.push({
      step: s,
      native: nativeFormat(nat),
      bi: biFormat(bi),
      ...beRow(be),
    });
  }
  return out;
});

const dyings = computed(() => {
  let nat = -1;
  let bi = -1;
  for (const r of rows.value) {
    if (nat < 0 && r.native.startsWith('∞')) nat = r.step;
    if (bi < 0 && r.bi.startsWith('∞')) bi = r.step;
  }
  return { nat, bi };
});
</script>

<template>
  <div class="demo">
    <div class="demo-controls">
      <label>
        <span class="demo-label">tower depth = {{ step }}</span>
        <input type="range" v-model.number="step" :min="0" :max="maxStep" />
      </label>
      <p class="tower-caption">
        Each row applies <code>10<sup>x</sup></code> to the previous row, starting at
        <code>x = {{ seed }}</code>. The three columns are the same arithmetic in three different number
        representations.
      </p>
    </div>
    <table class="tower-table">
      <thead>
        <tr>
          <th>step</th>
          <th>native JS Number</th>
          <th>break_infinity (simulated)</th>
          <th>break_eternity (real)</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="r in rows"
          :key="r.step"
          :class="{
            'tower-row-dead-native': dyings.nat >= 0 && r.step >= dyings.nat,
            'tower-row-dead-bi': dyings.bi >= 0 && r.step >= dyings.bi,
          }"
        >
          <td>{{ r.step }}</td>
          <td :class="{ 'tower-cell-dead': r.native.startsWith('∞') }">{{ r.native }}</td>
          <td :class="{ 'tower-cell-dead': r.bi.startsWith('∞') }">{{ r.bi }}</td>
          <td>
            {{ r.be }}
            <span class="tower-layer">L{{ r.beLayer }}</span>
          </td>
        </tr>
      </tbody>
    </table>
    <div class="tower-summary">
      <span v-if="dyings.nat >= 0">
        Native dies at step {{ dyings.nat }}.
      </span>
      <span v-else>Native still alive at step {{ step }}.</span>
      {{ ' ' }}
      <span v-if="dyings.bi >= 0">
        break_infinity dies at step {{ dyings.bi }}.
      </span>
      <span v-else>break_infinity still alive at step {{ step }}.</span>
      {{ ' ' }}
      <span>break_eternity continues; storage cost is one extra layer per ~step.</span>
    </div>
  </div>
</template>

<style scoped>
.tower-caption {
  font-size: 0.85em;
  color: var(--color-text-muted);
  margin-block: var(--gap-sm) 0;
}

.tower-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: var(--gap);
  font-family: var(--font-mono);
  font-size: 0.85em;
}

.tower-table th,
.tower-table td {
  padding: 4px var(--gap-sm);
  border-bottom: 1px solid var(--color-border);
  text-align: left;
}

.tower-table th {
  font-weight: 600;
  color: var(--color-text-muted);
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.tower-table td:first-child {
  width: 3em;
  text-align: right;
  color: var(--color-text-muted);
}

.tower-cell-dead {
  color: #d97a7a;
}

.tower-layer {
  display: inline-block;
  margin-left: 6px;
  padding: 1px 6px;
  font-size: 0.75em;
  color: var(--color-text-muted);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  vertical-align: middle;
}

.tower-summary {
  margin-top: var(--gap);
  font-size: 0.85em;
  color: var(--color-text-muted);
  font-family: var(--font-mono);
}
</style>
