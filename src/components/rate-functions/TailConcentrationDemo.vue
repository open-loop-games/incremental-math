<script setup lang="ts">
import { computed, ref } from 'vue';
import { seriesColor } from '../../lib/series-colors';

// Asymptotic concentration of a geometric cumulative.
//   aₙ = a · mⁿ; the last K of N levels carry
//     ratio(N, K) = (mᴺ − m^(N−K)) / (mᴺ − 1)  →  1 − m⁻ᴷ as N → ∞.
// The bar chart makes this self-evident: at any sane m, the last few bars dwarf
// everything left of them, regardless of N. The slider lets the reader choose
// how many trailing bars to shade and watch the share update.

const m = ref(1.15);
const N = ref(50);
const K = ref(5);

const TAIL = seriesColor('amber');
const HEAD = seriesColor('gray');
const ASYMPTOTE_HUE = seriesColor('teal');

const heights = computed(() => {
  // Bar h_n = mⁿ, normalized to the tallest bar so the SVG stays in [0,1].
  const ratio = m.value;
  const top = Math.pow(ratio, N.value - 1);
  const out: number[] = new Array(N.value);
  for (let n = 0; n < N.value; n++) {
    out[n] = Math.pow(ratio, n) / top;
  }
  return out;
});

const exactShare = computed(() => {
  // (mᴺ − m^(N−K)) / (mᴺ − 1).  Compute in log space to avoid overflow at large N.
  const ratio = m.value;
  const Nv = N.value;
  const Kv = Math.min(K.value, Nv);
  if (ratio <= 1) return Kv / Nv; // degenerate; constant bars
  // Numerically stable form: 1 − (m^(N−K) − 1) / (mᴺ − 1)
  // For large Nv mᴺ dominates 1, so this approaches 1 − m⁻ᴷ.
  const num = Math.pow(ratio, Nv - Kv) - 1;
  const den = Math.pow(ratio, Nv) - 1;
  if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) {
    return 1 - Math.pow(ratio, -Kv);
  }
  return 1 - num / den;
});

const asymptoticShare = computed(() => 1 - Math.pow(m.value, -K.value));

const doublingTime = computed(() => Math.log(2) / Math.log(m.value));

// Layout: 50 bars at ~10px each = ~500px; we'll render a viewBox and let it scale.
const VB_W = 600;
const VB_H = 200;
const PAD_BOTTOM = 24;
const PAD_TOP = 8;
const PAD_LEFT = 8;
const PAD_RIGHT = 8;

const barLayout = computed(() => {
  const inner = VB_W - PAD_LEFT - PAD_RIGHT;
  const innerH = VB_H - PAD_TOP - PAD_BOTTOM;
  const slot = inner / N.value;
  const barW = Math.max(1, slot * 0.85);
  return heights.value.map((h, n) => {
    const isTail = n >= N.value - K.value;
    return {
      n,
      x: PAD_LEFT + n * slot + (slot - barW) / 2,
      y: PAD_TOP + (1 - h) * innerH,
      w: barW,
      h: h * innerH,
      fill: isTail ? TAIL : HEAD,
    };
  });
});

const tickPositions = computed(() => {
  // Sparse n-axis labels so the bottom doesn't get crowded.
  const inner = VB_W - PAD_LEFT - PAD_RIGHT;
  const slot = inner / N.value;
  const stride = N.value <= 20 ? 5 : N.value <= 60 ? 10 : 25;
  const labels: { x: number; label: string }[] = [];
  for (let n = 0; n <= N.value; n += stride) {
    labels.push({ x: PAD_LEFT + n * slot, label: String(n) });
  }
  // Always include final n = N − 1 marker if not on a stride.
  const last = N.value - 1;
  if (last % stride !== 0)
    labels.push({ x: PAD_LEFT + last * slot + slot / 2, label: String(last) });
  return labels;
});

const sharePercent = computed(() => `${(exactShare.value * 100).toFixed(1)}%`);
const asymptotePercent = computed(() => `${(asymptoticShare.value * 100).toFixed(1)}%`);
</script>

<template>
  <div class="demo">
    <div class="demo-controls">
      <label>
        <span class="demo-label">m (per-level multiplier) = {{ m.toFixed(3) }}</span>
        <input v-model.number="m" type="range" min="1.02" max="1.50" step="0.005" />
      </label>
      <label>
        <span class="demo-label">N (total levels) = {{ N }}</span>
        <input v-model.number="N" type="range" min="10" max="100" step="1" />
      </label>
      <label>
        <span class="demo-label">K (trailing levels shaded) = {{ K }}</span>
        <input v-model.number="K" type="range" min="1" :max="N" step="1" />
      </label>
    </div>

    <svg
      class="bars"
      :viewBox="`0 0 ${VB_W} ${VB_H}`"
      preserveAspectRatio="none"
      role="img"
      aria-label="Per-level cost bar chart with the last K bars shaded"
    >
      <!-- baseline -->
      <line
        :x1="PAD_LEFT"
        :x2="VB_W - PAD_RIGHT"
        :y1="VB_H - PAD_BOTTOM"
        :y2="VB_H - PAD_BOTTOM"
        class="axis-line"
      />
      <rect
        v-for="bar in barLayout"
        :key="bar.n"
        :x="bar.x"
        :y="bar.y"
        :width="bar.w"
        :height="bar.h"
        :fill="bar.fill"
      />
      <!-- n-axis ticks -->
      <g class="ticks">
        <text
          v-for="tick in tickPositions"
          :key="tick.label"
          :x="tick.x"
          :y="VB_H - PAD_BOTTOM + 14"
          text-anchor="middle"
        >
          {{ tick.label }}
        </text>
      </g>
    </svg>

    <dl class="readout">
      <div>
        <dt>last K share</dt>
        <dd class="headline">
          {{ sharePercent }}
        </dd>
      </div>
      <div>
        <dt>asymptote 1 − m⁻ᴷ</dt>
        <dd :style="{ color: ASYMPTOTE_HUE }">
          {{ asymptotePercent }}
        </dd>
      </div>
      <div>
        <dt>doubling time</dt>
        <dd>{{ doublingTime.toFixed(1) }} levels</dd>
      </div>
    </dl>

    <p class="demo-note">
      Bar height is per-level cost <code>aₙ = mⁿ</code> on a linear axis; the last
      <code>K = {{ K }}</code> bars are shaded. The exact share of the cumulative they carry is
      <code>(mᴺ − m^(N−K)) / (mᴺ − 1)</code>, which converges to
      <code>1 − m⁻ᴷ = {{ asymptotePercent }}</code> as <code>N</code> grows past a few doubling
      times. Slide <code>N</code> from 20 to 100 — the percentage barely moves once the sum is
      dominated by its tail.
    </p>
  </div>
</template>

<style scoped>
.demo-controls {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--gap);
  margin-bottom: var(--gap);
}
.bars {
  width: 100%;
  height: 220px;
  display: block;
  background: var(--color-bg);
  border-radius: var(--radius-sm);
}
.axis-line {
  stroke: var(--color-border);
  stroke-width: 0.75;
}
.ticks text {
  fill: var(--color-text-muted);
  font-family: var(--font-mono);
  font-size: 10px;
}
.readout {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: var(--gap);
  margin: var(--gap) 0 0;
  font-family: var(--font-mono);
  font-size: 0.9em;
}
.readout > div {
  display: flex;
  flex-direction: column;
}
.readout dt {
  color: var(--color-text-muted);
  font-size: 0.82em;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.readout dd {
  margin: 0;
  color: var(--color-text);
}
.readout .headline {
  color: var(--color-primary);
  font-weight: 600;
  font-size: 1.1em;
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
