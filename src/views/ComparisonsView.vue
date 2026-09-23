<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

import AppIcon from '@/components/icons/AppIcon.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import { useSession } from '../stores/session'
import { deleteComparison } from '../services/comparisonService'
import { getScoreClass, formatDate } from '../utils/format'

const router = useRouter()
const { state, loadComparisons } = useSession()

const deletingComparisonId = ref(null)
const pendingDeleteId = ref(null)

onMounted(loadComparisons)

function openSavedComparison(id) {
  router.push({ name: 'comparison-result', params: { id } })
}

function goToAnalyses() {
  router.push('/analyses')
}

function requestDelete(id) {
  pendingDeleteId.value = id
}

async function confirmDelete() {
  const id = pendingDeleteId.value
  pendingDeleteId.value = null
  deletingComparisonId.value = id

  try {
    await deleteComparison(id)
    await loadComparisons()
  } catch (error) {
    console.error('Error eliminando comparación:', error)
    state.comparisonError =
      error.message || 'No se pudo eliminar la comparación.'
  } finally {
    deletingComparisonId.value = null
  }
}
</script>

<template>
  <section class="comparisons-page container">
    <div class="page-heading fade-in-up">
      <div>
        <span class="badge">Matching inteligente</span>
        <h1>Mis comparaciones</h1>
        <p>Historial de compatibilidad entre tus CV y ofertas.</p>
      </div>

      <button class="btn btn-primary" @click="goToAnalyses">Ver mis CV</button>
    </div>

    <p v-if="state.comparisonError" class="error-message" role="alert">
      {{ state.comparisonError }}
    </p>

    <div
      v-if="state.loadingComparisons"
      class="comparisons-list"
      aria-hidden="true"
    >
      <div v-for="n in 3" :key="n" class="skeleton skeleton-card"></div>
    </div>

    <div
      v-else-if="state.comparisons.length === 0"
      class="empty-state fade-in-up"
    >
      <span class="empty-icon"><AppIcon name="target" /></span>
      <h2>Todavía no tienes comparaciones</h2>
      <p>Abre uno de tus CV y compáralo con una oferta de empleo.</p>

      <button class="btn btn-primary" @click="goToAnalyses">
        Ir a mis análisis
      </button>
    </div>

    <TransitionGroup v-else name="list-item" tag="div" class="comparisons-list">
      <article
        v-for="(item, index) in state.comparisons"
        :key="item.id"
        class="comparison-history-card fade-in-up"
        :style="{ animationDelay: `${Math.min(index, 6) * 45}ms` }"
      >
        <span class="comparison-history-icon"><AppIcon name="target" /></span>

        <div class="comparison-history-info">
          <span>{{ item.job_title || 'Oferta sin título' }}</span>
          <strong>CV #{{ item.cv_analysis_id }}</strong>
          <small>{{ formatDate(item.created_at) }}</small>
        </div>

        <div
          class="comparison-history-score"
          :class="getScoreClass(item.compatibility_score)"
        >
          <span>Compatibilidad</span>
          <strong>{{ item.compatibility_score }}</strong>
          <small>/100</small>
        </div>

        <div class="history-actions">
          <button
            class="btn btn-secondary btn-sm"
            @click="openSavedComparison(item.id)"
          >
            Ver
          </button>

          <button
            class="btn-icon"
            :disabled="deletingComparisonId === item.id"
            aria-label="Eliminar comparación"
            @click="requestDelete(item.id)"
          >
            <AppIcon name="trash" />
          </button>
        </div>
      </article>
    </TransitionGroup>

    <ConfirmDialog
      :open="pendingDeleteId !== null"
      title="Eliminar comparación"
      description="Esta acción no se puede deshacer."
      @confirm="confirmDelete"
      @cancel="pendingDeleteId = null"
    />
  </section>
</template>

<style scoped>
.comparisons-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.page-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-4);
  flex-wrap: wrap;
}

.page-heading h1 {
  font-size: 1.9rem;
  margin-top: var(--space-2);
}

.page-heading p {
  color: var(--color-text-secondary);
  margin-top: var(--space-1);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  text-align: center;
  padding: var(--space-8) var(--space-4);
  border-radius: var(--radius-lg);
  border: 1px dashed var(--color-border-strong);
}

.empty-icon {
  display: inline-flex;
  width: 52px;
  height: 52px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--accent-soft);
  color: var(--accent-strong);
}

.comparisons-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.skeleton-card {
  height: 88px;
  border-radius: var(--radius-lg);
}

.comparison-history-card {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  transition:
    border-color var(--duration-base) var(--ease-out),
    transform var(--duration-fast) var(--ease-out);
}

@media (hover: hover) and (pointer: fine) {
  .comparison-history-card:hover {
    border-color: var(--color-border-strong);
    transform: translateY(-1px);
  }
}

.comparison-history-icon {
  display: inline-flex;
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  background: var(--accent-soft);
  color: var(--accent-strong);
}

.comparison-history-info {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  flex: 1;
  min-width: 0;
}

.comparison-history-info span {
  font-size: 0.95rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.comparison-history-info strong {
  font-size: 0.82rem;
  color: var(--color-text-secondary);
  font-weight: 400;
}

.comparison-history-info small {
  font-size: 0.76rem;
  color: var(--color-text-tertiary);
}

.comparison-history-score {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.1rem;
  flex-shrink: 0;
  min-width: 90px;
}

.comparison-history-score span {
  font-size: 0.72rem;
  color: var(--color-text-tertiary);
}

.comparison-history-score strong {
  font-family: var(--font-display);
  font-size: 1.4rem;
}

.comparison-history-score.score-bad strong {
  color: var(--score-bad);
}

.comparison-history-score.score-warn strong {
  color: var(--score-warn);
}

.comparison-history-score.score-good strong {
  color: var(--score-good);
}

.comparison-history-score.score-excellent strong {
  color: var(--score-excellent);
}

.comparison-history-score small {
  font-size: 0.72rem;
  color: var(--color-text-tertiary);
}

.history-actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-shrink: 0;
}

.list-item-enter-active,
.list-item-leave-active {
  transition:
    opacity var(--duration-base) var(--ease-out),
    transform var(--duration-base) var(--ease-out);
}

.list-item-enter-from,
.list-item-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

.list-item-leave-active {
  position: absolute;
}

@media (max-width: 640px) {
  .comparison-history-card {
    flex-wrap: wrap;
  }

  .history-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
