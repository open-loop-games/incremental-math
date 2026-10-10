<script setup lang="ts">
import { ref, computed } from 'vue';
import RatePlot from './RatePlot.vue';
import type { Annotation } from './RatePlot.vue';
import { seriesColor } from '../lib/series-colors';

// Csikszentmihalyi's flow channels mapped to incremental beat-time bands.
// Boundaries from the closed-form-progression case study (flow-channel-thresholds.md).

const m = ref(1.15);
const baseBeat = ref(10);
const targetLevel = ref(10);

const CURVE = seriesColor('amber');

// Band definitions, in seconds. Lower bound inclusive.
interface Channel {
  name: string;
  short: string;
  lower: number;
  upper: number;
  fill: string;
}

const CHANNELS: Channel[] = [
  { name: 'arousal', short: 'arousal', lower: 0, upper: 30, fill: seriesColor('sage') },
  { name: 'flow', short: 'flow', lower: 30, upper: 120, fill: seriesColor('amber') },
  { name: 'flow upper', short: 'flow upper', lower: 120, upper: 300, fill: seriesColor('teal') },
  { name: 'boredom', short: 'boredom', lower: 300, upper: 900, fill: seriesColor('slate') },
  {
    name: 'frustration',
    short: 'frustration',
    lower: 900,
    upper: 3600,
    fill: seriesColor('mauve'),
  },
  { name: 'breakdown', short: 'breakdown', lower: 3600, upper: 86400, fill: seriesColor('gray') },
];

function classify(t: number): Channel {
  for (const c of CHANNELS) {
    if (t >= c.lower && t < c.upper) return c;
  }
  return CHANNELS[CHANNELS.length - 1];
}

const beatAtTarget = computed(() => baseBeat.value * Math.pow(m.value, targetLevel.value - 1));
const currentChannel = computed(() => classify(beatAtTarget.value));

// For the target level to land in a given channel, m must be in this range.
// T(n) = T_1 * m^(n-1) → m = (T / T_1)^(1/(n-1))
function multiplierForBeat(t: number): number {
  if (targetLevel.value <= 1 || baseBeat.value <= 0) return NaN;
  return Math.pow(t / baseBeat.value, 1 / (targetLevel.value - 1));
}

const targetChannelRange = computed(() => {
  const c = currentChannel.value;
  return {
    lower: multiplierForBeat(Math.max(c.lower, 0.001)),
    upper: multiplierForBeat(c.upper),
  };
});

const series = computed(() => [
  {
    fn: (x: number) => baseBeat.value * Math.pow(m.value, x - 1),
    label: `T(n) at m = ${m.value.toFixed(2)}`,
    stroke: CURVE,
    width: 2,
  },
]);

const domain = computed<[number, number]>(() => [1, Math.max(targetLevel.value + 5, 25)]);

const annotations = computed<Annotation[]>(() => {
  const out: Annotation[] = [];
  // Channel band overlays (skip arousal/breakdown so the chart edges stay clean).
  for (const c of CHANNELS) {
    if (c.lower === 0 || c.upper >= 86400) continue;
    out.push({ type: 'hband', y0: c.lower, y1: c.upper, fill: c.fill });
  }
  // Boundary lines with labels.
  for (const c of CHANNELS) {
    if (c.lower === 0) continue;
    out.push({
      type: 'hline',
      y: c.lower,
      label: `${c.short} ▶ ${formatSeconds(c.lower)}`,
      stroke: c.fill,
      dash: [3, 3],
    });
  }
  // Target-level marker.
  out.push({
    type: 'point',
    x: targetLevel.value,
    y: beatAtTarget.value,
    fill: currentChannel.value.fill,
    stroke: CURVE,
    radius: 5,
  });
  return out;
});

function formatSeconds(s: number | null | undefined): string {
  if (s == null || !Number.isFinite(s)) return '';
  if (s < 1) return `${s.toFixed(2)}s`;
  if (s < 60) return `${Math.round(s)}s`;
  if (s < 3600) return `${Math.round(s / 60)}m`;
  return `${Math.round(s / 3600)}h`;
}

function fmtMultiplier(v: number): string {
  if (!Number.isFinite(v) || v <= 0) return '—';
  return v.toFixed(3);
}

function setMultiplier(v: number) {
  m.value = v;
}
</script>

<template>
  <div class="demo fc">
    <div class="fc-controls">
      <label>
        <span class="demo-label">cost ratio m = {{ m.toFixed(2) }}</span>
        <input v-model.number="m" type="range" min="1.02" max="3.0" step="0.01" />
        <span class="fc-ticks">
          <button type="button" class="fc-tick" @click="setMultiplier(1.07)">1.07</button>
          <button type="button" class="fc-tick" @click="setMultiplier(1.15)">1.15</button>
          <button type="button" class="fc-tick" @click="setMultiplier(1.4)">1.40</button>
          <button type="button" class="fc-tick" @click="setMultiplier(2.0)">2.00</button>
        </span>
      </label>
      <label>
        <span class="demo-label">base beat time T(1) = {{ baseBeat }}s</span>
        <input v-model.number="baseBeat" type="range" min="1" max="60" step="1" />
      </label>
      <label>
        <span class="demo-label">target purchase count n = {{ targetLevel }}</span>
        <input v-model.number="targetLevel" type="range" min="3" max="50" step="1" />
      </label>
    </div>

    <div class="fc-readout">
      <div class="fc-cell fc-headline" :style="{ borderColor: currentChannel.fill }">
        <span class="fc-cell-label">at purchase {{ targetLevel }}</span>
        <code>{{ formatSeconds(beatAtTarget) }} — {{ currentChannel.name }}</code>
      </div>
      <div class="fc-cell">
        <span class="fc-cell-label"
          >to keep purchase {{ targetLevel }} in {{ currentChannel.name }}</span
        >
        <code
          >m ∈ [{{ fmtMultiplier(targetChannelRange.lower) }},
          {{ fmtMultiplier(targetChannelRange.upper) }}]</code
        >
      </div>
    </div>

    <RatePlot
      :series="series"
      :domain="domain"
      :height="280"
      :annotations="annotations"
      :deps="[m, baseBeat, targetLevel]"
      x-label="purchase n"
      y-label="seconds"
      y-scale="log"
      :y-tick-format="formatSeconds"
    />
  </div>
</template>

<style scoped>
.fc-controls {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--gap);
}
.fc-ticks {
  display: flex;
  gap: 6px;
  margin-top: 4px;
  flex-wrap: wrap;
}
.fc-tick {
  font-family: var(--font-mono);
  font-size: 0.75em;
  background: transparent;
  color: var(--color-text-muted);
  border: 1px solid var(--color-border);
  border-radius: 3px;
  padding: 2px 6px;
  cursor: pointer;
}
.fc-tick:hover {
  background: var(--color-surface);
  color: var(--color-text);
}
.fc-readout {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: var(--gap);
  margin: var(--gap) 0;
  font-family: var(--font-mono);
  font-size: 0.9em;
}
.fc-cell {
  display: flex;
  flex-direction: column;
}
.fc-cell-label {
  color: var(--color-text-muted);
  font-size: 0.85em;
}
.fc-headline {
  border-left: 3px solid var(--color-text-muted);
  padding-left: 8px;
}
.fc-headline code {
  font-size: 1.05em;
  color: var(--color-primary);
}
</style>
