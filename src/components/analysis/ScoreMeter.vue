<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'

import { getScoreClass } from '@/utils/format'

const props = defineProps({
  label: {
    type: String,
    required: true
  },
  score: {
    type: Number,
    default: 0
  },
  delay: {
    type: Number,
    default: 0
  }
})

const clampedScore = computed(() => Math.min(100, Math.max(0, props.score)))
const fillWidth = ref(0)

let timer = null

onMounted(() => {
  timer = setTimeout(() => {
    fillWidth.value = clampedScore.value
  }, props.delay)
})

onUnmounted(() => clearTimeout(timer))
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
        :style="{ width: `${fillWidth}%` }"
      ></div>
    </div>
  </div>
</template>

<style scoped>
.score-meter {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.score-meter-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.score-meter-label {
  font-size: 0.88rem;
  color: var(--color-text-secondary);
}

.score-meter-value {
  font-family: var(--font-display);
  font-size: 1.05rem;
}

.score-meter-track {
  height: 8px;
  border-radius: var(--radius-full);
  background: var(--color-surface-hover);
  border: 1px solid var(--color-border);
  overflow: hidden;
}

.score-meter-fill {
  height: 100%;
  border-radius: inherit;
  transition: width 0.9s var(--ease-out);
}

.score-meter-fill.score-bad {
  background: var(--score-bad);
}

.score-meter-fill.score-warn {
  background: var(--score-warn);
}

.score-meter-fill.score-good {
  background: var(--score-good);
}

.score-meter-fill.score-excellent {
  background: var(--score-excellent);
}

@media (prefers-reduced-motion: reduce) {
  .score-meter-fill {
    transition: none;
  }
}
</style>
