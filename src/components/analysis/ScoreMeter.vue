<script setup>
import { computed } from 'vue'

import { getScoreClass } from '@/utils/format'

const props = defineProps({
  label: {
    type: String,
    required: true
  },
  score: {
    type: Number,
    default: 0
  }
})

const clampedScore = computed(() => Math.min(100, Math.max(0, props.score)))
</script>

<template>
  <div class="score-meter">
    <div class="score-meter-head">
      <span class="score-meter-label">{{ label }}</span>

      <strong class="score-meter-value" :class="getScoreClass(clampedScore)">
        {{ clampedScore }}
      </strong>
    </div>

    <div
      class="score-meter-track"
      role="progressbar"
      :aria-label="label"
      :aria-valuenow="clampedScore"
      aria-valuemin="0"
      aria-valuemax="100"
    >
      <div
        class="score-meter-fill"
        :class="getScoreClass(clampedScore)"
        :style="{ width: `${clampedScore}%` }"
      ></div>
    </div>
  </div>
</template>
