<script setup lang="ts">
import { ref, computed } from 'vue';
import { seriesColor } from '../../../lib/series-colors';

// Five-node supply graph: S → {A, B} → {with bridge A↔B} → T.
// Capacities are user-tuned; max-flow is computed via Edmonds-Karp on each
// change.  Min-cut is the set of saturated edges leaving the source-reachable
// subgraph in the residual.

interface Edge {
  id: string;
  from: number;
  to: number;
  capacity: number;
}

const NODE_COUNT = 4;
const NODE_LABELS = ['S', 'A', 'B', 'T'] as const;
const NODE_POS: Array<{ x: number; y: number }> = [
  { x: 50, y: 150 },
  { x: 200, y: 70 },
  { x: 200, y: 230 },
  { x: 350, y: 150 },
];

const edges = ref<Edge[]>([
  { id: 'SA', from: 0, to: 1, capacity: 10 },
  { id: 'SB', from: 0, to: 2, capacity: 10 },
  { id: 'AB', from: 1, to: 2, capacity: 5 },
  { id: 'AT', from: 1, to: 3, capacity: 8 },
  { id: 'BT', from: 2, to: 3, capacity: 8 },
]);

interface FlowResult {
  flow: Map<string, number>;
  total: number;
  cutSide: Set<number>;
  cutEdges: Set<string>;
}

function maxFlow(): FlowResult {
  // Build residual capacity matrix indexed by (from, to).
  const cap: number[][] = Array.from({ length: NODE_COUNT }, () => Array(NODE_COUNT).fill(0));
  for (const e of edges.value) {
    cap[e.from][e.to] += e.capacity;
  }
  const residual: number[][] = cap.map((row) => row.slice());
  // Augmenting-path search via BFS.
  const parent = new Array<number>(NODE_COUNT).fill(-1);
  const SOURCE = 0;
  const SINK = NODE_COUNT - 1;
  let total = 0;
  while (true) {
    parent.fill(-1);
    parent[SOURCE] = SOURCE;
    const queue = [SOURCE];
    let found = false;
    while (queue.length > 0) {
      const u = queue.shift()!;
      if (u === SINK) {
        found = true;
        break;
      }
      for (let v = 0; v < NODE_COUNT; v++) {
        if (parent[v] === -1 && residual[u][v] > 0) {
          parent[v] = u;
          queue.push(v);
        }
      }
    }
    if (!found) break;
    // Bottleneck along the path.
    let bottleneck = Infinity;
    for (let v = SINK; v !== SOURCE; v = parent[v]) {
      const u = parent[v];
      bottleneck = Math.min(bottleneck, residual[u][v]);
    }
    for (let v = SINK; v !== SOURCE; v = parent[v]) {
      const u = parent[v];
      residual[u][v] -= bottleneck;
      residual[v][u] += bottleneck;
    }
    total += bottleneck;
  }
  // Per-edge net flow = original capacity − residual.
  const flow = new Map<string, number>();
  for (const e of edges.value) {
    flow.set(e.id, e.capacity - residual[e.from][e.to]);
  }
  // Min-cut: nodes reachable from source in the residual graph.
  const cutSide = new Set<number>();
  const stack = [SOURCE];
  while (stack.length > 0) {
    const u = stack.pop()!;
    if (cutSide.has(u)) continue;
    cutSide.add(u);
    for (let v = 0; v < NODE_COUNT; v++) {
      if (!cutSide.has(v) && residual[u][v] > 0) stack.push(v);
    }
  }
  const cutEdges = new Set<string>();
  for (const e of edges.value) {
    if (cutSide.has(e.from) && !cutSide.has(e.to)) cutEdges.add(e.id);
  }
  return { flow, total, cutSide, cutEdges };
}

const result = computed(() => maxFlow());

// Centroid of the four nodes — used to push labels to the *outside* of each edge.
const GRAPH_CENTROID = { x: 200, y: 150 };
const LABEL_OFFSET = 16;

function edgePath(e: Edge): {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  lx: number;
  ly: number;
} {
  const a = NODE_POS[e.from];
  const b = NODE_POS[e.to];
  // Trim endpoints to the node radius (18).
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  const ux = dx / len;
  const uy = dy / len;
  const r = 18;
  const mx = a.x + dx * 0.5;
  const my = a.y + dy * 0.5;
  // Perpendicular unit vector; flip sign so it points away from the graph
  // centroid (label sits on the outside of each edge).  For the vertical
  // A↔B edge whose midpoint coincides with the centroid, default to +x.
  let px = -uy;
  let py = ux;
  const outX = mx - GRAPH_CENTROID.x;
  const outY = my - GRAPH_CENTROID.y;
  const dot = px * outX + py * outY;
  if (dot < 0) {
    px = -px;
    py = -py;
  } else if (Math.abs(dot) < 1e-6) {
    // Degenerate (midpoint at centroid) — push horizontally.
    px = 1;
    py = 0;
  }
  return {
    x1: a.x + ux * r,
    y1: a.y + uy * r,
    x2: b.x - ux * r,
    y2: b.y - uy * r,
    lx: mx + px * LABEL_OFFSET,
    ly: my + py * LABEL_OFFSET,
  };
}

const totalFlow = computed(() => result.value.total);

const cutCapacity = computed(() => {
  let sum = 0;
  for (const e of edges.value) {
    if (result.value.cutEdges.has(e.id)) sum += e.capacity;
  }
  return sum;
});

const cutDescription = computed(() => {
  const ids = Array.from(result.value.cutEdges).sort();
  if (ids.length === 0) return 'none';
  return ids.join(', ');
});

const colorFlow = seriesColor('amber');
const colorCut = seriesColor('mauve');
const colorIdle = seriesColor('gray');
</script>

<template>
  <div class="demo">
    <div class="demo-controls">
      <label v-for="(e, i) in edges" :key="e.id">
        <span class="demo-label">
          {{ NODE_LABELS[e.from] }} → {{ NODE_LABELS[e.to] }} cap = {{ e.capacity }}
        </span>
        <input v-model.number="edges[i].capacity" type="range" min="0" max="20" step="1" />
      </label>
    </div>

    <div class="graph-wrap">
      <svg viewBox="0 0 400 300" class="graph">
        <defs>
          <marker
            id="arrow-flow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" :fill="colorFlow" />
          </marker>
          <marker
            id="arrow-cut"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" :fill="colorCut" />
          </marker>
          <marker
            id="arrow-idle"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" :fill="colorIdle" />
          </marker>
        </defs>

        <g v-for="e in edges" :key="e.id">
          <line
            :x1="edgePath(e).x1"
            :y1="edgePath(e).y1"
            :x2="edgePath(e).x2"
            :y2="edgePath(e).y2"
            :stroke="
              result.cutEdges.has(e.id)
                ? colorCut
                : (result.flow.get(e.id) ?? 0) > 0
                  ? colorFlow
                  : colorIdle
            "
            :stroke-width="
              Math.max(
                1,
                Math.min(8, ((result.flow.get(e.id) ?? 0) / Math.max(1, e.capacity)) * 6 + 1),
              )
            "
            :stroke-dasharray="(result.flow.get(e.id) ?? 0) === 0 ? '4 4' : ''"
            :marker-end="
              result.cutEdges.has(e.id)
                ? 'url(#arrow-cut)'
                : (result.flow.get(e.id) ?? 0) > 0
                  ? 'url(#arrow-flow)'
                  : 'url(#arrow-idle)'
            "
          />
          <text
            :x="edgePath(e).lx"
            :y="edgePath(e).ly"
            text-anchor="middle"
            dominant-baseline="middle"
            class="edge-label"
          >
            {{ result.flow.get(e.id) ?? 0 }} / {{ e.capacity }}
          </text>
        </g>

        <g v-for="(p, i) in NODE_POS" :key="i">
          <circle
            :cx="p.x"
            :cy="p.y"
            r="18"
            :class="{
              source: i === 0,
              sink: i === NODE_COUNT - 1,
              'cut-side': result.cutSide.has(i) && i !== 0,
            }"
          />
          <text :x="p.x" :y="p.y + 4" text-anchor="middle" class="node-label">
            {{ NODE_LABELS[i] }}
          </text>
        </g>
      </svg>
    </div>

    <div class="readouts">
      <div>
        <span class="r-label">max flow S → T</span>
        <code>{{ totalFlow }}</code>
      </div>
      <div>
        <span class="r-label">min-cut capacity</span>
        <code>{{ cutCapacity }}</code>
      </div>
      <div class="span-2">
        <span class="r-label">cut edges</span>
        <code>{{ cutDescription }}</code>
      </div>
    </div>

    <p class="demo-note">
      Edge thickness is proportional to its flow share; dashed grey edges carry no flow. The min-cut
      — the set of saturated edges separating the source-reachable subgraph from <code>T</code> — is
      highlighted in mauve, and its total capacity equals the max flow (the
      <a
        href="https://en.wikipedia.org/wiki/Max-flow_min-cut_theorem"
        target="_blank"
        rel="noopener noreferrer"
        >max-flow / min-cut theorem</a
      >). Bumping a cut edge's capacity raises the throughput one-for-one until the cut shifts
      elsewhere; bumping a non-cut edge does nothing. Notice that adding capacity to
      <code>A → B</code> can <em>increase</em> total throughput by letting the bridge re-route flow,
      even though the direct edges from <code>S</code> are unchanged — the rate-function catalog has
      no vocabulary for this. Industry Idle's building graph computes shipping throughput exactly
      this way.
    </p>
  </div>
</template>

<style scoped>
.demo-controls {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--gap);
}
.graph-wrap {
  margin-top: var(--gap);
  background: var(--color-bg);
  border-radius: var(--radius-sm);
  padding: var(--gap);
}
.graph {
  width: 100%;
  max-height: 320px;
  display: block;
}
.graph circle {
  fill: var(--color-surface);
  stroke: var(--color-text-muted);
  stroke-width: 1.5;
}
.graph circle.source {
  fill: var(--color-surface-hover);
  stroke: var(--series-amber);
  stroke-width: 2;
}
.graph circle.sink {
  fill: var(--color-surface-hover);
  stroke: var(--series-teal);
  stroke-width: 2;
}
.graph circle.cut-side {
  stroke: var(--series-amber);
  stroke-width: 1.5;
  stroke-dasharray: 3 2;
}
.node-label {
  font-family: var(--font-mono);
  font-size: 14px;
  font-weight: 600;
  fill: var(--color-text);
  pointer-events: none;
}
.edge-label {
  font-family: var(--font-mono);
  font-size: 11px;
  fill: var(--color-text-muted);
  pointer-events: none;
  /* Halo against the bg colour so any near-line label still reads cleanly. */
  paint-order: stroke fill;
  stroke: var(--color-bg);
  stroke-width: 3px;
  stroke-linejoin: round;
}
.readouts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
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
.readouts .span-2 {
  grid-column: span 2;
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
.demo-note a {
  color: var(--color-primary);
}
@media (max-width: 880px) {
  .readouts .span-2 {
    grid-column: span 1;
  }
}
</style>
