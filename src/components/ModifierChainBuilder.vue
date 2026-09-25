<script setup lang="ts">
import { ref, computed } from 'vue';
import { Decimal, format } from '../lib/decimal';

// Anchor demo for the modifier-chains page. Six modifiers in a fixed order,
// each toggleable; the live breakdown shows the running value at each enabled
// step, and a code panel shows the equivalent createSequentialModifier shape
// for the active set. Raw Decimal math — the engine's modifier-chain
// abstraction is what the demo is about, not what computes the demo.

interface Step {
  id: string;
  type: 'add' | 'mul' | 'exp';
  /** Display label for this step. */
  label: string;
  /** Static numeric value, or a getter that derives one from a slider. */
  value: () => number;
  /** Pretty-printed source for the value (shown in the code panel). */
  valueSource: () => string;
  /** Pretty-printed operation for the breakdown table. */
  operationDisplay: () => string;
  enabled: boolean;
}

const base = ref(1);
const upgrades = ref(3);
const softcapExp = ref(0.9);

const steps = ref<Step[]>([
  {
    id: 'starter',
    type: 'add',
    label: 'Base bonus',
    value: () => 10,
    valueSource: () => '10',
    operationDisplay: () => '+10',
    enabled: true,
  },
  {
    id: 'per-upgrade',
    type: 'add',
    label: 'Per upgrade',
    value: () => 5 * upgrades.value,
    valueSource: () => `5 * upgrades.value`,
    operationDisplay: () => `+${5 * upgrades.value}`,
    enabled: true,
  },
  {
    id: 'prestige',
    type: 'mul',
    label: 'Prestige',
    value: () => 2,
    valueSource: () => '2',
    operationDisplay: () => '×2',
    enabled: true,
  },
  {
    id: 'achievements',
    type: 'mul',
    label: 'Achievements',
    value: () => 1.5,
    valueSource: () => '1.5',
    operationDisplay: () => '×1.5',
    enabled: true,
  },
  {
    id: 'active-buff',
    type: 'mul',
    label: 'Active buff',
    value: () => 3,
    valueSource: () => '3',
    operationDisplay: () => '×3',
    enabled: false,
  },
  {
    id: 'softcap',
    type: 'exp',
    label: 'Softcap',
    value: () => softcapExp.value,
    valueSource: () => `softcapExp.value`,
    operationDisplay: () => `^${softcapExp.value.toFixed(2)}`,
    enabled: false,
  },
]);

function applyStep(v: Decimal, s: Step): Decimal {
  const x = s.value();
  if (s.type === 'add') return v.add(x);
  if (s.type === 'mul') return v.times(x);
  return v.pow(x);
}

interface TraceRow {
  index: number;
  label: string;
  op: string;
  before: string;
  after: string;
}

const trace = computed<TraceRow[]>(() => {
  const out: TraceRow[] = [];
  let v = new Decimal(base.value);
  out.push({
    index: 0,
    label: 'base',
    op: '—',
    before: '',
    after: format(v, 3),
  });
  let i = 1;
  for (const s of steps.value) {
    if (!s.enabled) continue;
    const before = v;
    v = applyStep(v, s);
    out.push({
      index: i++,
      label: s.label,
      op: s.operationDisplay(),
      before: format(before, 3),
      after: format(v, 3),
    });
  }
  return out;
});

const finalValue = computed(() => trace.value[trace.value.length - 1].after);

const codePanel = computed(() => {
  const lines: string[] = ['createSequentialModifier(() => ['];
  for (const s of steps.value) {
    if (!s.enabled) continue;
    if (s.type === 'add') {
      lines.push(
        `  createAdditiveModifier({ addend: ${s.valueSource()}, description: '${s.label}' }),`,
      );
    } else if (s.type === 'mul') {
      lines.push(
        `  createMultiplicativeModifier({ multiplier: ${s.valueSource()}, description: '${s.label}' }),`,
      );
    } else {
      lines.push(
        `  createExponentialModifier({ exponent: ${s.valueSource()}, description: '${s.label}' }),`,
      );
    }
  }
  lines.push(']);');
  return lines.join('\n');
});

const opSymbol = (s: Step): string => (s.type === 'add' ? '+' : s.type === 'mul' ? '×' : '^');
</script>

<template>
  <div class="demo">
    <div class="demo-controls">
      <label>
        <span class="demo-label">base = {{ base }}</span>
        <input v-model.number="base" type="range" :min="1" :max="100" />
      </label>
    </div>

    <table class="chain-table">
      <thead>
        <tr>
          <th />
          <th>op</th>
          <th>label</th>
          <th>value</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="s in steps" :key="s.id" :class="{ 'chain-row-off': !s.enabled }">
          <td class="chain-toggle">
            <input :id="`chain-${s.id}`" v-model="s.enabled" type="checkbox" />
          </td>
          <td class="chain-op">
            <label :for="`chain-${s.id}`">
              <span class="chain-symbol">{{ opSymbol(s) }}</span>
            </label>
          </td>
          <td class="chain-label">
            <label :for="`chain-${s.id}`">{{ s.label }}</label>
          </td>
          <td class="chain-value">
            <template v-if="s.id === 'per-upgrade'">
              <span class="chain-formula">5 × </span>
              <input
                v-model.number="upgrades"
                type="range"
                :min="0"
                :max="20"
                class="chain-inline-range"
                :disabled="!s.enabled"
              />
              <span class="chain-formula"> = {{ 5 * upgrades }}</span>
            </template>
            <template v-else-if="s.id === 'softcap'">
              <input
                v-model.number="softcapExp"
                type="range"
                :min="0.5"
                :max="1"
                :step="0.01"
                class="chain-inline-range"
                :disabled="!s.enabled"
              />
              <span class="chain-formula"> = {{ softcapExp.toFixed(2) }}</span>
            </template>
            <template v-else>
              {{ s.value() }}
            </template>
          </td>
        </tr>
      </tbody>
    </table>

    <div class="chain-section">
      <h4>Breakdown</h4>
      <table class="trace-table">
        <thead>
          <tr>
            <th>step</th>
            <th>contribution</th>
            <th>op</th>
            <th>running value</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in trace" :key="r.index">
            <td>{{ r.index }}</td>
            <td>{{ r.label }}</td>
            <td class="trace-op">
              {{ r.op }}
            </td>
            <td class="trace-after">
              {{ r.after }}
            </td>
          </tr>
        </tbody>
      </table>
      <p class="chain-final">final = {{ finalValue }}</p>
    </div>

    <div class="chain-section">
      <h4>Same chain as data</h4>
      <pre class="code-panel"><code>{{ codePanel }}</code></pre>
      <p class="chain-caption">
        Toggle a row above and the array above gains or loses an entry — the chain is what the
        engine evaluates. Each modifier carries its own description and (in real code) a reactive
        <code>enabled</code> predicate, so a UI panel can render the breakdown without the calling
        code typing it out.
      </p>
    </div>
  </div>
</template>

<style scoped>
.chain-table,
.trace-table {
  width: 100%;
  border-collapse: collapse;
  font-family: var(--font-mono);
  font-size: 0.85em;
}

.chain-table th,
.trace-table th,
.chain-table td,
.trace-table td {
  padding: 6px var(--gap-sm);
  border-bottom: 1px solid var(--color-border);
  text-align: left;
}

.chain-table th,
.trace-table th {
  font-weight: 600;
  color: var(--color-text-muted);
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.chain-toggle {
  width: 2.2em;
}

.chain-op {
  width: 2.5em;
}

.chain-symbol {
  display: inline-block;
  width: 1.6em;
  text-align: center;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  padding: 1px 0;
  color: var(--color-primary);
}

.chain-label label {
  cursor: pointer;
}

.chain-row-off {
  opacity: 0.45;
}

.chain-value {
  text-align: right;
  color: var(--color-text-muted);
}

.chain-formula {
  color: var(--color-text-muted);
}

.chain-inline-range {
  vertical-align: middle;
  width: 8em;
}

.chain-section {
  margin-top: var(--gap-lg);
}

.chain-section h4 {
  margin: 0 0 var(--gap-sm) 0;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-muted);
  font-weight: 600;
}

.trace-op {
  color: var(--color-primary);
  width: 4em;
}

.trace-after {
  text-align: right;
  font-weight: 600;
}

.chain-final {
  margin-top: var(--gap-sm);
  font-family: var(--font-mono);
  font-weight: 600;
}

.code-panel {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  padding: var(--gap-sm) var(--gap);
  font-size: 0.8em;
  overflow-x: auto;
  margin: 0;
}

.chain-caption {
  font-size: 0.85em;
  color: var(--color-text-muted);
  margin-top: var(--gap-sm);
}
</style>
