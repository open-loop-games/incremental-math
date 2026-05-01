<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import uPlot from 'uplot';
import type { Options, AlignedData } from 'uplot';
import 'uplot/dist/uPlot.min.css';
import { SERIES_ORDER, seriesColor } from '../lib/series-colors';

interface Series {
  fn: (x: number) => number;
  stroke?: string;
  label?: string;
  dash?: number[];
  width?: number;
}

export type Annotation =
  | {
      type: 'vline';
      x: number;
      stroke?: string;
      dash?: number[];
      label?: string;
      width?: number;
      /** Pixel offset from the top of the plot area for the label anchor. Use to
       *  stagger labels when two vlines sit close on the x-axis. Default 2. */
      labelOffset?: number;
    }
  | { type: 'hline'; y: number; stroke?: string; dash?: number[]; label?: string; width?: number }
  | { type: 'vband'; x0: number; x1: number; fill?: string }
  | { type: 'hband'; y0: number; y1: number; fill?: string }
  | { type: 'point'; x: number; y: number; fill?: string; stroke?: string; radius?: number };

interface Props {
  fn?: (x: number) => number;
  /** Multi-series alternative to `fn`. When set, takes precedence. */
  series?: Series[];
  domain: [number, number];
  samples?: number;
  yScale?: 'linear' | 'log';
  height?: number;
  label?: string;
  stroke?: string;
  xLabel?: string;
  yLabel?: string;
  /** Reactive values the function closes over. Triggers data refresh. Use when fn is a stable
   *  closure rather than a `computed` that returns a fresh function. */
  deps?: readonly unknown[];
  optsOverrides?: Partial<Options>;
  /** Overlay annotations drawn after the series — vlines, hlines, bands, points. */
  annotations?: readonly Annotation[];
  /** Custom y-axis tick label formatter. Use for unit-bearing or transformed axes. */
  yTickFormat?: (v: number) => string;
  /** Lock the y-scale to a fixed range (e.g. when raw data spikes off-screen). */
  yRange?: [number, number];
}

const props = withDefaults(defineProps<Props>(), {
  fn: undefined,
  series: undefined,
  samples: 256,
  yScale: 'linear',
  height: 200,
  label: 'y',
  stroke: '',
  xLabel: 'x',
  yLabel: '',
  deps: () => [],
  optsOverrides: () => ({}),
  annotations: () => [],
  yTickFormat: undefined,
  yRange: undefined,
});

const containerRef = ref<HTMLDivElement | null>(null);
let plot: uPlot | null = null;
let ro: ResizeObserver | null = null;
// Captured by the draw hook so prop updates can repaint without rebuilding the plot.
const annotationsRef = ref<readonly Annotation[]>(props.annotations);

function cssVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

function activeSeries(): Series[] {
  if (props.series && props.series.length > 0) return props.series;
  if (props.fn) return [{ fn: props.fn, label: props.label }];
  return [];
}

function buildData(): AlignedData {
  const [x0, x1] = props.domain;
  const n = props.samples;
  const xs = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    xs[i] = x0 + ((x1 - x0) * i) / (n - 1);
  }
  const sList = activeSeries();
  const cols: Float64Array[] = sList.map(({ fn }) => {
    const ys = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const y = fn(xs[i]);
      ys[i] = Number.isFinite(y) ? y : NaN;
    }
    return ys;
  });
  return [xs, ...cols] as unknown as AlignedData;
}

function drawAnnotations(u: uPlot): void {
  const list = annotationsRef.value;
  if (!list || list.length === 0) return;
  const ctx = u.ctx;
  const muted = cssVar('--color-text-muted', '#a89784');
  const { left, top, width, height } = u.bbox;
  ctx.save();
  // Clip to plot area so bands/lines don't bleed into axis gutters.
  ctx.beginPath();
  ctx.rect(left, top, width, height);
  ctx.clip();
  for (const a of list) {
    if (a.type === 'vline') {
      const px = u.valToPos(a.x, 'x', true);
      if (!Number.isFinite(px)) continue;
      ctx.beginPath();
      ctx.strokeStyle = a.stroke ?? muted;
      ctx.lineWidth = a.width ?? 0.75;
      const dash = a.dash ?? [4, 3];
      ctx.setLineDash(dash);
      ctx.globalAlpha = 0.7;
      ctx.moveTo(px + 0.5, top);
      ctx.lineTo(px + 0.5, top + height);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      if (a.label) {
        ctx.fillStyle = a.stroke ?? muted;
        ctx.font = '10px ui-monospace, monospace';
        ctx.textBaseline = 'top';
        ctx.fillText(a.label, px + 4, top + (a.labelOffset ?? 2));
      }
    } else if (a.type === 'hline') {
      const py = u.valToPos(a.y, 'y', true);
      if (!Number.isFinite(py)) continue;
      ctx.beginPath();
      ctx.strokeStyle = a.stroke ?? muted;
      ctx.lineWidth = a.width ?? 0.75;
      ctx.setLineDash(a.dash ?? [4, 3]);
      ctx.globalAlpha = 0.7;
      ctx.moveTo(left, py + 0.5);
      ctx.lineTo(left + width, py + 0.5);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      if (a.label) {
        ctx.fillStyle = a.stroke ?? muted;
        ctx.font = '10px ui-monospace, monospace';
        ctx.textBaseline = 'bottom';
        ctx.fillText(a.label, left + 4, py - 2);
      }
    } else if (a.type === 'vband') {
      const px0 = u.valToPos(a.x0, 'x', true);
      const px1 = u.valToPos(a.x1, 'x', true);
      ctx.fillStyle = a.fill ?? muted;
      ctx.globalAlpha = 0.12;
      ctx.fillRect(Math.min(px0, px1), top, Math.abs(px1 - px0), height);
      ctx.globalAlpha = 1;
    } else if (a.type === 'hband') {
      const py0 = u.valToPos(a.y0, 'y', true);
      const py1 = u.valToPos(a.y1, 'y', true);
      ctx.fillStyle = a.fill ?? muted;
      ctx.globalAlpha = 0.12;
      ctx.fillRect(left, Math.min(py0, py1), width, Math.abs(py1 - py0));
      ctx.globalAlpha = 1;
    } else if (a.type === 'point') {
      const px = u.valToPos(a.x, 'x', true);
      const py = u.valToPos(a.y, 'y', true);
      if (!Number.isFinite(px) || !Number.isFinite(py)) continue;
      ctx.beginPath();
      ctx.arc(px, py, a.radius ?? 3.5, 0, Math.PI * 2);
      ctx.fillStyle = a.fill ?? muted;
      ctx.fill();
      if (a.stroke) {
        ctx.lineWidth = 1;
        ctx.strokeStyle = a.stroke;
        ctx.stroke();
      }
    }
  }
  ctx.restore();
}

function buildOptions(width: number): Options {
  const stroke = props.stroke || cssVar('--color-primary', '#d4a574');
  const grid = cssVar('--color-border', '#4a423c');
  const text = cssVar('--color-text-muted', '#a89784');
  const base: Options = {
    width,
    height: props.height,
    cursor: { drag: { x: false, y: false }, points: { size: 6 } },
    legend: { show: false },
    scales: {
      x: { time: false },
      y: {
        ...(props.yScale === 'log' ? { distr: 3 } : {}),
        ...(props.yRange ? { range: () => props.yRange! } : {}),
      },
    },
    axes: [
      {
        stroke: text,
        grid: { stroke: grid, width: 0.5, dash: [2, 3] },
        ticks: { stroke: grid, width: 0.5 },
        label: props.xLabel,
        labelSize: props.xLabel ? 24 : 0,
        labelGap: 4,
        font: '11px ui-monospace, monospace',
        labelFont: '11px ui-monospace, monospace',
      },
      {
        stroke: text,
        grid: { stroke: grid, width: 0.5, dash: [2, 3] },
        ticks: { stroke: grid, width: 0.5 },
        label: props.yLabel,
        labelSize: props.yLabel ? 28 : 0,
        labelGap: 4,
        size: 56,
        font: '11px ui-monospace, monospace',
        labelFont: '11px ui-monospace, monospace',
        ...(props.yTickFormat
          ? { values: (_self, splits) => splits.map((v) => props.yTickFormat!(v)) }
          : {}),
      },
    ],
    series: [
      {},
      ...activeSeries().map((s, i) => ({
        label: s.label ?? (i === 0 ? props.label : `y${i + 1}`),
        stroke: s.stroke ?? (i === 0 ? stroke : seriesColor(SERIES_ORDER[i % SERIES_ORDER.length])),
        width: s.width ?? 1.75,
        dash: s.dash,
        points: { show: false },
      })),
    ],
    hooks: {
      draw: [drawAnnotations],
    },
    ...props.optsOverrides,
  };
  return base;
}

function mount(): void {
  if (!containerRef.value) return;
  const width = containerRef.value.clientWidth || 320;
  const opts = buildOptions(width);
  plot = new uPlot(opts, buildData(), containerRef.value);
}

function rebuild(): void {
  if (!containerRef.value) return;
  plot?.destroy();
  plot = null;
  mount();
}

onMounted(() => {
  mount();
  ro = new ResizeObserver(() => {
    if (!containerRef.value || !plot) return;
    const w = containerRef.value.clientWidth;
    if (w > 0) plot.setSize({ width: w, height: props.height });
  });
  if (containerRef.value) ro.observe(containerRef.value);
});

onBeforeUnmount(() => {
  ro?.disconnect();
  ro = null;
  plot?.destroy();
  plot = null;
});

watch(
  () => [props.fn, props.domain[0], props.domain[1], props.samples, ...props.deps],
  () => {
    if (plot) plot.setData(buildData());
  },
);

watch(
  () => [
    props.yScale,
    props.label,
    props.stroke,
    props.xLabel,
    props.yLabel,
    props.series?.length,
    props.yTickFormat,
    props.yRange?.[0],
    props.yRange?.[1],
  ],
  () => rebuild(),
);

watch(
  () => props.annotations,
  (next) => {
    annotationsRef.value = next;
    // redraw(false, true): keep cached series paths, repaint overlays.
    plot?.redraw(false, true);
  },
);
</script>

<template>
  <div
    ref="containerRef"
    class="rate-plot"
  />
</template>

<style scoped>
.rate-plot {
  width: 100%;
}
:deep(.u-legend) {
  display: none;
}
:deep(.u-axis text),
:deep(.u-axis tspan) {
  fill: var(--color-text-muted);
}
</style>
