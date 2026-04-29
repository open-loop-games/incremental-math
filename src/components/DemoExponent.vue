<script setup lang="ts">
import { ref, computed } from 'vue';
import { Decimal, format } from '../lib/decimal';

const props = withDefaults(
  defineProps<{
    base?: number;
    initialN?: number;
    minN?: number;
    maxN?: number;
  }>(),
  {
    base: 2,
    initialN: 10,
    minN: 0,
    maxN: 100,
  },
);

const n = ref(props.initialN);
const result = computed(() => format(new Decimal(props.base).pow(n.value)));
</script>

<template>
  <div class="demo">
    <div class="demo-controls">
      <label>
        <span class="demo-label">n = {{ n }}</span>
        <input
          v-model.number="n"
          type="range"
          :min="minN"
          :max="maxN"
        >
      </label>
    </div>
    <div class="demo-output">
      <code>{{ base }}<sup>{{ n }}</sup> = {{ result }}</code>
    </div>
  </div>
</template>
