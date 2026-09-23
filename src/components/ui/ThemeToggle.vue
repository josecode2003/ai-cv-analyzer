<script setup>
import { ref } from 'vue'

import AppIcon from '@/components/icons/AppIcon.vue'
import { applyTheme, getInitialTheme, persistTheme } from '@/utils/theme'

const theme = ref(getInitialTheme())

function toggleTheme() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
  applyTheme(theme.value)
  persistTheme(theme.value)
}
</script>

<template>
  <button
    type="button"
    class="theme-toggle"
    :aria-pressed="theme === 'light'"
    :aria-label="
      theme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro'
    "
    @click="toggleTheme"
  >
    <Transition name="theme-icon" mode="out-in">
      <AppIcon v-if="theme === 'dark'" key="moon" name="moon" />
      <AppIcon v-else key="sun" name="sun" />
    </Transition>
  </button>
</template>

<style scoped>
.theme-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: var(--radius-full);
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  transition:
    background-color var(--duration-base) var(--ease-out),
    color var(--duration-base) var(--ease-out),
    border-color var(--duration-base) var(--ease-out),
    transform var(--duration-fast) var(--ease-out);
}

@media (hover: hover) and (pointer: fine) {
  .theme-toggle:hover {
    color: var(--color-text);
    border-color: var(--color-border-strong);
  }
}

.theme-toggle:active {
  transform: scale(0.92);
}

.theme-icon-enter-active,
.theme-icon-leave-active {
  transition:
    opacity var(--duration-base) var(--ease-out),
    transform var(--duration-base) var(--ease-out);
}

.theme-icon-enter-from {
  opacity: 0;
  transform: rotate(-45deg) scale(0.6);
}

.theme-icon-leave-to {
  opacity: 0;
  transform: rotate(45deg) scale(0.6);
}

@media (prefers-reduced-motion: reduce) {
  .theme-icon-enter-from,
  .theme-icon-leave-to {
    transform: none;
  }
}
</style>
