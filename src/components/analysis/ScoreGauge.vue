<script setup>
import { computed } from 'vue'

import { getScoreClass, getScoreLabel } from '@/utils/format'

const props = defineProps({
  score: {
    type: Number,
    default: 0
  },
  size: {
    type: Number,
    default: 136
  },
  strokeWidth: {
    type: Number,
    default: 11
  }
})

const clampedScore = computed(() => Math.min(100, Math.max(0, props.score)))
const radius = computed(() => (props.size - props.strokeWidth) / 2)
const circumference = computed(() => 2 * Math.PI * radius.value)
const dashOffset = computed(
  () => circumference.value * (1 - clampedScore.value / 100)
)
</script>

<template>
  <div class="score-gauge-wrapper">
    <div
      class="score-gauge"
      :class="getScoreClass(clampedScore)"
      role="img"
      :aria-label="`Puntuación global: ${clampedScore} sobre 100 (${getScoreLabel(clampedScore)})`"
    >
      <svg :width="size" :height="size" :viewBox="`0 0 ${size} ${size}`">
        <circle
          class="score-gauge-track"
          :cx="size / 2"
          :cy="size / 2"
          :r="radius"
          :stroke-width="strokeWidth"
          fill="none"
        />

        <circle
          class="score-gauge-value"
          :cx="size / 2"
          :cy="size / 2"
          :r="radius"
          :stroke-width="strokeWidth"
          fill="none"
          :stroke-dasharray="circumference"
          :stroke-dashoffset="dashOffset"
        />
      </svg>

      <div class="score-gauge-text">
        <strong>{{ clampedScore }}</strong>
        <span>/100</span>
      </div>
    </div>

    <span class="score-gauge-label" :class="getScoreClass(clampedScore)">
      {{ getScoreLabel(clampedScore) }}
    </span>
  </div>
</template>
