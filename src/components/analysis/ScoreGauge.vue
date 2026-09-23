<script setup>
import { computed, onMounted, ref } from 'vue'

import { getScoreClass, getScoreLabel } from '@/utils/format'

const props = defineProps({
  score: {
    type: Number,
    default: 0
  },
  size: {
    type: Number,
    default: 152
  },
  strokeWidth: {
    type: Number,
    default: 11
  }
})

const clampedScore = computed(() => Math.min(100, Math.max(0, props.score)))
const radius = computed(() => (props.size - props.strokeWidth) / 2)
const circumference = computed(() => 2 * Math.PI * radius.value)

const reduceMotion =
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

const displayedScore = ref(reduceMotion ? clampedScore.value : 0)
const dashOffset = ref(
  reduceMotion
    ? circumference.value * (1 - clampedScore.value / 100)
    : circumference.value
)

onMounted(() => {
  if (reduceMotion) {
    return
  }

  // Deja pintar el círculo en su estado inicial (offset completo) antes de
  // animar, para que la transición CSS del stroke-dashoffset se dispare.
  requestAnimationFrame(() => {
    dashOffset.value = circumference.value * (1 - clampedScore.value / 100)
  })

  const duration = 1100
  const start = performance.now()

  function tick(now) {
    const progress = Math.min(1, (now - start) / duration)
    const eased = 1 - Math.pow(1 - progress, 3)
    displayedScore.value = Math.round(clampedScore.value * eased)

    if (progress < 1) {
      requestAnimationFrame(tick)
    }
  }

  requestAnimationFrame(tick)
})
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
        <strong>{{ displayedScore }}</strong>
        <span>/100</span>
      </div>
    </div>

    <span class="score-gauge-label" :class="getScoreClass(clampedScore)">
      {{ getScoreLabel(clampedScore) }}
    </span>
  </div>
</template>

<style scoped>
.score-gauge-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
}

.score-gauge {
  position: relative;
  display: inline-flex;
}

.score-gauge svg {
  transform: rotate(-90deg);
}

.score-gauge-track {
  stroke: var(--color-border);
}

.score-gauge-value {
  stroke: currentColor;
  stroke-linecap: round;
  transition: stroke-dashoffset 1.1s var(--ease-out);
}

.score-gauge.score-bad {
  color: var(--score-bad);
}

.score-gauge.score-warn {
  color: var(--score-warn);
}

.score-gauge.score-good {
  color: var(--score-good);
}

.score-gauge.score-excellent {
  color: var(--score-excellent);
}

.score-gauge-text {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.score-gauge-text strong {
  font-family: var(--font-display);
  font-size: 2.1rem;
  line-height: 1;
  color: var(--color-text);
}

.score-gauge-text span {
  font-size: 0.75rem;
  color: var(--color-text-tertiary);
}

.score-gauge-label {
  font-size: 0.85rem;
  font-weight: 600;
  padding: 0.3rem 0.8rem;
  border-radius: var(--radius-full);
}

.score-gauge-label.score-bad {
  color: var(--score-bad);
  background: var(--score-bad-bg);
}

.score-gauge-label.score-warn {
  color: var(--score-warn);
  background: var(--score-warn-bg);
}

.score-gauge-label.score-good {
  color: var(--score-good);
  background: var(--score-good-bg);
}

.score-gauge-label.score-excellent {
  color: var(--score-excellent);
  background: var(--score-excellent-bg);
}

@media (prefers-reduced-motion: reduce) {
  .score-gauge-value {
    transition: none;
  }
}
</style>
