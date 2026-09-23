<script setup>
import { onMounted, onUnmounted, ref, watch } from 'vue'

const props = defineProps({
  open: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  confirmLabel: {
    type: String,
    default: 'Eliminar'
  }
})

const emit = defineEmits(['confirm', 'cancel'])

const dialogRef = ref(null)

watch(
  () => props.open,
  isOpen => {
    if (isOpen) {
      requestAnimationFrame(() => {
        dialogRef.value?.querySelector('button')?.focus()
      })
    }
  }
)

function handleKeydown(event) {
  if (event.key === 'Escape' && props.open) {
    emit('cancel')
  }
}

onMounted(() => window.addEventListener('keydown', handleKeydown))
onUnmounted(() => window.removeEventListener('keydown', handleKeydown))
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog-fade">
      <div v-if="open" class="dialog-overlay" @mousedown.self="emit('cancel')">
        <div
          ref="dialogRef"
          class="dialog-panel"
          role="alertdialog"
          aria-modal="true"
          :aria-label="title"
        >
          <h2>{{ title }}</h2>

          <p v-if="description">{{ description }}</p>

          <div class="dialog-actions">
            <button
              type="button"
              class="btn btn-secondary"
              @click="emit('cancel')"
            >
              Cancelar
            </button>

            <button
              type="button"
              class="btn btn-danger"
              @click="emit('confirm')"
            >
              {{ confirmLabel }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
  background: rgba(4, 3, 10, 0.55);
  backdrop-filter: blur(6px);
}

.dialog-panel {
  width: 100%;
  max-width: 400px;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.dialog-panel h2 {
  font-size: 1.15rem;
}

.dialog-panel p {
  color: var(--color-text-secondary);
  font-size: 0.92rem;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
  margin-top: var(--space-2);
}

.dialog-fade-enter-active,
.dialog-fade-leave-active {
  transition: opacity var(--duration-base) var(--ease-out);
}

.dialog-fade-enter-active .dialog-panel,
.dialog-fade-leave-active .dialog-panel {
  transition:
    transform var(--duration-base) var(--ease-out),
    opacity var(--duration-base) var(--ease-out);
}

.dialog-fade-enter-from,
.dialog-fade-leave-to {
  opacity: 0;
}

.dialog-fade-enter-from .dialog-panel {
  transform: scale(0.96);
  opacity: 0;
}

.dialog-fade-leave-to .dialog-panel {
  transform: scale(0.98);
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .dialog-fade-enter-from .dialog-panel,
  .dialog-fade-leave-to .dialog-panel {
    transform: none;
  }
}
</style>
