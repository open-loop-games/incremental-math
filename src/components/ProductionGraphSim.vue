<script setup lang="ts">
import { ref, computed } from 'vue';
import { format } from 'open-loop-engine/primitives';

// Production-graph dynamics on a 4-node directed graph. Three preset
// topologies (chain, DAG-converge, cycle) drive different regimes:
// chain = Pecorella's t^d/d!, DAG = polynomial superposition, cycle =
// runaway unless a softcap pins the feedback. Each preset shares the
// same seed model: top-of-graph nodes receive a baseSeed flux per tick;
// every directed edge i->j adds A[i][j] * N_i * dt to N_j.

type TopologyKey = 'chain' | 'dag' | 'cycle';

interface Topology {
  key: TopologyKey;
  label: string;
  description: string;
  // edges[i][j] = rate at which node i produces node j per unit time
  edges: number[][];
  // which nodes receive baseSeed flux from outside the graph
  sources: number[];
}

const NODE_COUNT = 4;
const NODE_LABELS = ['A', 'B', 'C', 'D'];
const NODE_COLORS = ['#9aa0a6', '#c08acb', '#6ec07a', '#d97a7a'];

const topologies: Record<TopologyKey, Topology> = {
  chain: {
    key: 'chain',
    label: 'chain  ·  A → B → C → D',
    description:
      'Pecorella Part II: each tier produces the one below at rate r. ' +
      'D(t) ≈ baseSeed · r³ · t⁴ / 4! at the bottom — chain length d gives tᵈ/d!.',
    edges: [
      [0, 1, 0, 0],
      [0, 0, 1, 0],
      [0, 0, 0, 1],
      [0, 0, 0, 0],
    ],
    sources: [0],
  },
  dag: {
    key: 'dag',
    label: 'DAG  ·  A,B → C → D',
    description:
      'Two independent sources A and B both feed C, which feeds D. Same total ' +
      'edge weight as the chain, but C grows from the sum of both feeds — D ends ' +
      'higher despite no longer rates being changed.',
    edges: [
      [0, 0, 1, 0],
      [0, 0, 1, 0],
      [0, 0, 0, 1],
      [0, 0, 0, 0],
    ],
    sources: [0, 1],
  },
  cycle: {
    key: 'cycle',
    label: 'cycle  ·  A ↔ B → C → D',
    description:
      'B feeds back into A. Without a damping term the loop diverges exponentially. ' +
      'A softcap on the feedback edge bounds it to a fixed point and the downstream ' +
      'chain settles into linear-in-t growth instead.',
    edges: [
      [0, 1, 0, 0],
      [0.4, 0, 1, 0],
      [0, 0, 0, 1],
      [0, 0, 0, 0],
    ],
    sources: [0],
  },
};

const activeKey = ref<TopologyKey>('chain');
const baseSeed = ref(1.0);
const tMax = ref(40);
const softcapEnabled = ref(false);
const softcapK = ref(50);
const showLog = ref(true);

const N_SAMPLES = 200;

interface Trajectory {
  t: number[];
  values: number[][]; // [nodeIndex][sampleIndex]
}

// Forward-Euler integration of dN_i/dt = sum_j A[j][i] * effRate(j,i) * N_j
// + seedFlux_i.  Softcap, when enabled, multiplies any feedback edge
// (i.e. edge into a strictly-earlier node) by 1/(1 + N_target/k) — the
// canonical sqrt-style damping rewritten as the diminishing-returns shape
// the genre uses to tame loops.
function simulate(): Trajectory {
  const topo = topologies[activeKey.value];
  const n = NODE_COUNT;
  const N = new Array<number>(n).fill(0);
  const dt = tMax.value / N_SAMPLES;
  const seed = baseSeed.value;
  const k = softcapK.value;
  const cap = softcapEnabled.value;

  const t: number[] = [];
  const values: number[][] = Array.from({ length: n }, () => []);

  for (let s = 0; s <= N_SAMPLES; s++) {
    t.push(s * dt);
    for (let i = 0; i < n; i++) values[i].push(N[i]);

    const dN = new Array<number>(n).fill(0);
    // External seed flux into source nodes
    for (const src of topo.sources) dN[src] += seed;
    // Edge contributions
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const rate = topo.edges[i][j];
        if (rate === 0) continue;
        let r = rate;
        if (cap && j < i) {
          // feedback edge: damp by target population
          r = rate / (1 + N[j] / k);
        }
        dN[j] += r * N[i];
      }
    }
    for (let i = 0; i < n; i++) N[i] += dN[i] * dt;
  }
  return { t, values };
}

const trajectory = computed<Trajectory>(() => {
  // depend on reactive params
  void activeKey.value;
  void baseSeed.value;
  void tMax.value;
  void softcapEnabled.value;
  void softcapK.value;
  return simulate();
});

const W = 760;
const H = 360;
const PAD = { l: 72, r: 16, t: 14, b: 40 };
const PW = W - PAD.l - PAD.r;
const PH = H - PAD.t - PAD.b;

interface Tick {
  label: string;
  y: number;
}

const yScale = computed(() => {
  let max = 0;
  for (const arr of trajectory.value.values) {
    for (const v of arr) if (Number.isFinite(v) && v > max) max = v;
  }
  if (max <= 0) return { toY: () => PAD.t + PH / 2, ticks: [] as Tick[] };
  if (showLog.value) {
    const lmax = Math.log10(Math.max(1, max));
    const lmin = -1;
    const span = Math.max(1, lmax - lmin);
    const toY = (v: number): number => {
      const safe = v > 0.1 ? Math.log10(v) : lmin;
      return PAD.t + (1 - (safe - lmin) / span) * PH;
    };
    const ticks: Tick[] = [];
    const lo = Math.ceil(lmin);
    const hi = Math.floor(lmax);
    const step = Math.max(1, Math.ceil((hi - lo + 1) / 6));
    for (let p = lo; p <= hi; p += step) {
      ticks.push({ label: `10^${p}`, y: PAD.t + (1 - (p - lmin) / span) * PH });
    }
    return { toY, ticks };
  }
  const yMax = max * 1.05;
  const toY = (v: number): number => PAD.t + (1 - v / yMax) * PH;
  const ticks: Tick[] = [
    { label: format(yMax), y: PAD.t },
    { label: format(yMax * 0.5), y: PAD.t + PH * 0.5 },
    { label: '0', y: PAD.t + PH },
  ];
  return { toY, ticks };
});

function pathFor(nodeIdx: number): string {
  const traj = trajectory.value;
  const xStep = PW / N_SAMPLES;
  const parts: string[] = [];
  for (let i = 0; i < traj.t.length; i++) {
    const v = traj.values[nodeIdx][i];
    if (!Number.isFinite(v)) continue;
    const px = PAD.l + i * xStep;
    const py = yScale.value.toY(v);
    parts.push((parts.length === 0 ? 'M' : 'L') + px.toFixed(1) + ' ' + py.toFixed(1));
  }
  return parts.join(' ');
}

const X_TICKS = computed(() => {
  const xm = tMax.value;
  return [0, xm * 0.25, xm * 0.5, xm * 0.75, xm].map((v) => Math.round(v * 10) / 10);
});
function xTickPos(n: number): number {
  return PAD.l + (n / tMax.value) * PW;
}

// Final values for a small readout
const finals = computed(() => {
  const traj = trajectory.value;
  return traj.values.map((arr) => arr[arr.length - 1]);
});

// Node graph diagram positions (laid out for readability per topology)
interface NodePos {
  x: number;
  y: number;
}
const nodePos: Record<TopologyKey, NodePos[]> = {
  chain: [
    { x: 60, y: 60 },
    { x: 160, y: 60 },
    { x: 260, y: 60 },
    { x: 360, y: 60 },
  ],
  dag: [
    { x: 60, y: 30 },
    { x: 60, y: 100 },
    { x: 220, y: 65 },
    { x: 360, y: 65 },
  ],
  cycle: [
    { x: 80, y: 65 },
    { x: 200, y: 65 },
    { x: 300, y: 65 },
    { x: 380, y: 65 },
  ],
};
const DIAGRAM_W = 420;
const DIAGRAM_H = 140;

interface Edge {
  from: number;
  to: number;
  rate: number;
  feedback: boolean;
}
const activeEdges = computed<Edge[]>(() => {
  const topo = topologies[activeKey.value];
  const out: Edge[] = [];
  for (let i = 0; i < NODE_COUNT; i++) {
    for (let j = 0; j < NODE_COUNT; j++) {
      const r = topo.edges[i][j];
      if (r > 0) out.push({ from: i, to: j, rate: r, feedback: j < i });
    }
  }
  return out;
});

function arcPath(e: Edge): string {
  const p = nodePos[activeKey.value];
  const a = p[e.from];
  const b = p[e.to];
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const r = 18; // node radius
  // shorten endpoints so arrowhead doesn't overlap node
  const ux = dx / dist;
  const uy = dy / dist;
  const sx = a.x + ux * r;
  const sy = a.y + uy * r;
  const ex = b.x - ux * r;
  const ey = b.y - uy * r;
  if (e.feedback) {
    // arc below for feedback edges
    const mx = (sx + ex) / 2;
    const my = (sy + ey) / 2 + 32;
    return `M ${sx} ${sy} Q ${mx} ${my} ${ex} ${ey}`;
  }
  return `M ${sx} ${sy} L ${ex} ${ey}`;
}
</script>

<template>
  <div class="demo pgs">
    <div class="pgs-controls">
      <fieldset class="pgs-presets">
        <legend class="demo-label">
          topology
        </legend>
        <label
          v-for="t in Object.values(topologies) as Topology[]"
          :key="t.key"
        >
          <input
            v-model="activeKey"
            type="radio"
            :value="t.key"
          >
          {{ t.label }}
        </label>
      </fieldset>
      <label>
        <span class="demo-label">base seed = {{ baseSeed.toFixed(2) }} / tick</span>
        <input
          v-model.number="baseSeed"
          type="range"
          min="0.1"
          max="3"
          step="0.05"
        >
      </label>
      <label>
        <span class="demo-label">t range = 0..{{ tMax }}</span>
        <input
          v-model.number="tMax"
          type="range"
          min="10"
          max="120"
          step="5"
        >
      </label>
      <label class="pgs-toggle">
        <input
          v-model="softcapEnabled"
          type="checkbox"
          :disabled="activeKey !== 'cycle'"
        >
        softcap on feedback edges
      </label>
      <label v-if="softcapEnabled && activeKey === 'cycle'">
        <span class="demo-label">softcap k = {{ softcapK.toFixed(0) }}</span>
        <input
          v-model.number="softcapK"
          type="range"
          min="5"
          max="500"
          step="5"
        >
      </label>
      <label class="pgs-toggle">
        <input
          v-model="showLog"
          type="checkbox"
        >
        log y-scale
      </label>
    </div>

    <div class="pgs-diagram-wrap">
      <svg
        :viewBox="`0 0 ${DIAGRAM_W} ${DIAGRAM_H}`"
        class="pgs-diagram"
        role="img"
        aria-label="graph topology"
      >
        <defs>
          <marker
            id="pgs-arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path
              d="M 0 0 L 10 5 L 0 10 z"
              fill="var(--color-text-muted)"
            />
          </marker>
        </defs>
        <g>
          <path
            v-for="(e, idx) in activeEdges"
            :key="idx"
            :d="arcPath(e)"
            class="pgs-edge"
            :class="{ 'pgs-edge-feedback': e.feedback }"
            marker-end="url(#pgs-arrow)"
          />
        </g>
        <g>
          <g
            v-for="(p, i) in nodePos[activeKey]"
            :key="i"
          >
            <circle
              :cx="p.x"
              :cy="p.y"
              r="18"
              :fill="NODE_COLORS[i]"
              class="pgs-node"
            />
            <text
              :x="p.x"
              :y="p.y + 4"
              text-anchor="middle"
              class="pgs-node-label"
            >
              {{ NODE_LABELS[i] }}
            </text>
          </g>
        </g>
      </svg>
      <p class="pgs-description">
        {{ topologies[activeKey].description }}
      </p>
    </div>

    <svg
      :viewBox="`0 0 ${W} ${H}`"
      class="pgs-chart"
      role="img"
      aria-label="Production over time"
    >
      <line
        :x1="PAD.l"
        :y1="PAD.t"
        :x2="PAD.l"
        :y2="PAD.t + PH"
        class="pgs-axis"
      />
      <line
        :x1="PAD.l"
        :y1="PAD.t + PH"
        :x2="W - PAD.r"
        :y2="PAD.t + PH"
        class="pgs-axis"
      />
      <g>
        <g
          v-for="t in yScale.ticks"
          :key="t.label"
        >
          <line
            :x1="PAD.l"
            :y1="t.y"
            :x2="W - PAD.r"
            :y2="t.y"
            class="pgs-grid"
          />
          <text
            :x="PAD.l - 8"
            :y="t.y + 3"
            text-anchor="end"
            class="pgs-tick"
          >{{ t.label }}</text>
        </g>
      </g>
      <g>
        <text
          v-for="nx in X_TICKS"
          :key="nx"
          :x="xTickPos(nx)"
          :y="H - PAD.b + 16"
          text-anchor="middle"
          class="pgs-tick"
        >
          {{ nx }}
        </text>
      </g>
      <text
        :x="PAD.l + PW / 2"
        :y="H - 6"
        text-anchor="middle"
        class="pgs-tick"
      >
        simulation time
      </text>
      <text
        :x="14"
        :y="PAD.t + PH / 2"
        text-anchor="middle"
        class="pgs-tick"
        :transform="`rotate(-90 14 ${PAD.t + PH / 2})`"
      >
        node population
      </text>

      <path
        v-for="i in NODE_COUNT"
        :key="i - 1"
        :d="pathFor(i - 1)"
        class="pgs-line"
        :style="{ stroke: NODE_COLORS[i - 1] }"
      />
    </svg>

    <div class="pgs-legend">
      <span
        v-for="(c, i) in NODE_COLORS"
        :key="i"
        class="pgs-legend-item"
      >
        <span
          class="pgs-swatch"
          :style="{ background: c }"
        />
        <span>{{ NODE_LABELS[i] }} = {{ format(finals[i] ?? 0) }}</span>
      </span>
    </div>
  </div>
</template>

<style scoped>
.pgs-controls {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--gap);
  align-items: end;
}
.pgs-presets {
  display: flex;
  flex-direction: column;
  gap: 4px;
  border: 1px solid var(--color-border);
  padding: 6px 10px;
  font-size: 0.85em;
  font-family: var(--font-mono);
  color: var(--color-text-muted);
}
.pgs-presets legend {
  padding-inline: 4px;
}
.pgs-presets label {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}
.pgs-presets input {
  width: auto;
  margin: 0;
}
.pgs-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.9em;
  color: var(--color-text-muted);
  align-self: end;
}
.pgs-toggle input {
  width: auto;
}
.pgs-diagram-wrap {
  margin-block: var(--gap);
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
}
.pgs-diagram {
  width: 100%;
  max-width: 460px;
  height: auto;
  font-family: var(--font-mono);
}
.pgs-edge {
  stroke: var(--color-text-muted);
  stroke-width: 1.5;
  fill: none;
}
.pgs-edge-feedback {
  stroke-dasharray: 3 3;
}
.pgs-node {
  opacity: 0.85;
}
.pgs-node-label {
  font-size: 13px;
  font-weight: 600;
  fill: var(--color-bg);
}
.pgs-description {
  font-size: 0.85em;
  color: var(--color-text-muted);
  font-style: italic;
  text-align: center;
  margin: 0;
  max-width: 600px;
}
.pgs-chart {
  width: 100%;
  height: auto;
  display: block;
  font-family: var(--font-mono);
}
.pgs-axis {
  stroke: var(--color-border);
  stroke-width: 1;
}
.pgs-grid {
  stroke: var(--color-border);
  stroke-width: 0.5;
  stroke-dasharray: 2 3;
  opacity: 0.6;
}
.pgs-tick {
  fill: var(--color-text-muted);
  font-size: 11px;
}
.pgs-line {
  fill: none;
  stroke-width: 1.75;
  vector-effect: non-scaling-stroke;
}
.pgs-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: var(--gap);
  font-size: 0.85em;
  color: var(--color-text-muted);
  font-family: var(--font-mono);
}
.pgs-legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.pgs-swatch {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 50%;
}
</style>
