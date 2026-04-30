<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import uPlot from 'uplot';
import type { Options, AlignedData } from 'uplot';
import 'uplot/dist/uPlot.min.css';

interface Series {
  fn: (x: number) => number;
  stroke?: string;
  label?: string;
  dash?: number[];
  width?: number;
}

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
});

const containerRef = ref<HTMLDivElement | null>(null);
let plot: uPlot | null = null;
let ro: ResizeObserver | null = null;

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

function buildOptions(width: number): Options {
  const stroke = props.stroke || cssVar('--color-primary', '#4a9eff');
  const grid = cssVar('--color-border', '#2a3a5c');
  const text = cssVar('--color-text-muted', '#8892a4');
  const base: Options = {
    width,
    height: props.height,
    cursor: { drag: { x: false, y: false }, points: { size: 6 } },
    legend: { show: false },
    scales: {
      x: { time: false },
      y: props.yScale === 'log' ? { distr: 3 } : {},
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
      },
    ],
    series: [
      {},
      ...activeSeries().map((s, i) => ({
        label: s.label ?? (i === 0 ? props.label : `y${i + 1}`),
        stroke: s.stroke ?? (i === 0 ? stroke : cssVar(`--series-${i}`, stroke)),
        width: s.width ?? 1.75,
        dash: s.dash,
        points: { show: false },
      })),
    ],
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
  () => [props.yScale, props.label, props.stroke, props.xLabel, props.yLabel, props.series?.length],
  () => rebuild(),
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
