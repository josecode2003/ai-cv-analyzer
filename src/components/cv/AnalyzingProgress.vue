<script setup>
import { onMounted, onUnmounted, ref } from 'vue'

import AppIcon from '@/components/icons/AppIcon.vue'

/*
 * El backend resuelve el análisis en una única petición HTTP de entre 20 y
 * 60 segundos, sin progreso real que reportar. Las fases avanzan por tiempo
 * estimado; la última se queda activa hasta que el padre desmonta este
 * componente al recibir la respuesta.
 */
const PHASES = [
  { label: 'Leyendo el PDF', at: 0 },
  { label: 'Identificando tu profesión', at: 3500 },
  { label: 'Aplicando el baremo de tu profesión', at: 10000 },
  { label: 'Calculando tu puntuación', at: 20000 }
]

const currentIndex = ref(0)
const timers = []

onMounted(() => {
  PHASES.forEach((phase, index) => {
    if (index === 0) {
      return
    }

    timers.push(
      setTimeout(() => {
        currentIndex.value = index
      }, phase.at)
    )
  })
})

onUnmounted(() => {
  timers.forEach(clearTimeout)
})
</script>

<template>
  <div class="analyzing" role="status" aria-live="polite">
    <ul class="analyzing-phases">
      <li
        v-for="(phase, index) in PHASES"
        :key="phase.label"
        class="analyzing-phase"
        :class="{
          done: index < currentIndex,
          active: index === currentIndex
        }"
      >
        <span class="phase-icon">
          <AppIcon v-if="index < currentIndex" name="check" />
          <span v-else-if="index === currentIndex" class="phase-spinner"></span>
          <span v-else class="phase-dot"></span>
        </span>

        <span class="phase-label">{{ phase.label }}</span>
      </li>
    </ul>

    <p class="analyzing-note">
      Puede tardar hasta un minuto. No cierres esta pestaña.
    </p>
  </div>
</template>

<style scoped>
.analyzing {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-5);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
}

.analyzing-phases {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.analyzing-phase {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  color: var(--color-text-tertiary);
  transition: color var(--duration-slow) var(--ease-out);
}

.analyzing-phase.done {
  color: var(--color-text-secondary);
}

.analyzing-phase.active {
  color: var(--color-text);
  font-weight: 500;
}

.phase-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  color: var(--color-success);
}

.analyzing-phase.active .phase-icon {
  color: var(--accent-strong);
}

.phase-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--color-border-strong);
}

.phase-spinner {
  width: 15px;
  height: 15px;
  border-radius: 50%;
  border: 2px solid var(--accent-soft);
  border-top-color: var(--accent-strong);
  animation: phase-spin 0.8s linear infinite;
}

@keyframes phase-spin {
  to {
    transform: rotate(360deg);
  }
}

.analyzing-note {
  font-size: 0.82rem;
  color: var(--color-text-tertiary);
}

@media (prefers-reduced-motion: reduce) {
  .phase-spinner {
    animation-duration: 1.6s;
  }
}
</style>
