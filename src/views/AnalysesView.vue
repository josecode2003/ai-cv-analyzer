<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

import AppIcon from '@/components/icons/AppIcon.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import { useSession } from '../stores/session'
import { deleteAnalysis } from '../services/analysisService'
import { getScoreClass, formatDate } from '../utils/format'

const router = useRouter()
const { state, loadAnalyses } = useSession()

const deletingAnalysisId = ref(null)
const pendingDeleteId = ref(null)

onMounted(loadAnalyses)

function openAnalysis(id) {
  router.push({ name: 'analysis', params: { id } })
}

function analyzeAnotherCV() {
  router.push('/')
}

function requestDelete(id) {
  pendingDeleteId.value = id
}

async function confirmDelete() {
  const id = pendingDeleteId.value
  pendingDeleteId.value = null
  deletingAnalysisId.value = id

  try {
    await deleteAnalysis(id)
    await loadAnalyses()
  } catch (error) {
    console.error('Error eliminando análisis:', error)
    state.analysisError = error.message || 'No se pudo eliminar el análisis.'
  } finally {
    deletingAnalysisId.value = null
  }
}
</script>

<template>
  <section class="analyses-page container">
    <div class="page-heading fade-in-up">
      <div>
        <span class="badge">Historial</span>
        <h1>Mis análisis</h1>
        <p>Todos tus CV analizados y guardados.</p>
      </div>

      <button class="btn btn-primary" @click="analyzeAnotherCV">
        <AppIcon name="plus" />
        Analizar nuevo CV
      </button>
    </div>

    <p v-if="state.analysisError" class="error-message" role="alert">
      {{ state.analysisError }}
    </p>

    <div v-if="state.loadingAnalyses" class="analyses-list" aria-hidden="true">
      <div v-for="n in 3" :key="n" class="skeleton skeleton-card"></div>
    </div>

    <div v-else-if="state.analyses.length === 0" class="empty-state fade-in-up">
      <span class="empty-icon"><AppIcon name="bar-chart" /></span>
      <h2>Todavía no tienes análisis</h2>
      <p>Analiza tu primer CV y aparecerá aquí automáticamente.</p>

      <button class="btn btn-primary" @click="analyzeAnotherCV">
        Analizar mi primer CV
      </button>
    </div>

    <TransitionGroup v-else name="list-item" tag="div" class="analyses-list">
      <article
        v-for="(item, index) in state.analyses"
        :key="item.id"
        class="analysis-history-card fade-in-up"
        :style="{ animationDelay: `${Math.min(index, 6) * 45}ms` }"
      >
        <span class="history-file-icon"><AppIcon name="file-text" /></span>

        <div class="history-info">
          <h3>{{ item.candidate_name || 'Candidato sin nombre' }}</h3>
          <strong>{{ item.original_filename }}</strong>
          <span>{{ item.profile || 'Perfil no indicado' }}</span>
          <small>
            {{ item.level || 'Nivel no indicado' }} ·
            {{ formatDate(item.created_at) }}
          </small>
        </div>

        <div class="history-score">
          <span>Puntuación</span>
          <strong :class="getScoreClass(item.score)">{{
            item.score ?? 0
          }}</strong>
          <small>/100</small>
        </div>

        <div class="history-actions">
          <button
            class="btn btn-secondary btn-sm"
            @click="openAnalysis(item.id)"
          >
            Ver análisis
          </button>

          <button
            class="btn-icon"
            :disabled="deletingAnalysisId === item.id"
            aria-label="Eliminar análisis"
            @click="requestDelete(item.id)"
          >
            <AppIcon name="trash" />
          </button>
        </div>
      </article>
    </TransitionGroup>

    <ConfirmDialog
      :open="pendingDeleteId !== null"
      title="Eliminar análisis"
      description="Esta acción no se puede deshacer. El análisis se eliminará de forma permanente."
      @confirm="confirmDelete"
      @cancel="pendingDeleteId = null"
    />
  </section>
</template>

<style scoped>
.analyses-page {
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

.analyses-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.skeleton-card {
  height: 96px;
  border-radius: var(--radius-lg);
}

.analysis-history-card {
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
  .analysis-history-card:hover {
    border-color: var(--color-border-strong);
    transform: translateY(-1px);
  }
}

.history-file-icon {
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

.history-info {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  flex: 1;
  min-width: 0;
}

.history-info h3 {
  font-size: 0.98rem;
}

.history-info strong {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  font-weight: 400;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-info span,
.history-info small {
  font-size: 0.78rem;
  color: var(--color-text-tertiary);
}

.history-score {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.1rem;
  flex-shrink: 0;
  min-width: 70px;
}

.history-score span {
  font-size: 0.72rem;
  color: var(--color-text-tertiary);
}

.history-score strong {
  font-family: var(--font-display);
  font-size: 1.4rem;
}

.history-score small {
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
  .analysis-history-card {
    flex-wrap: wrap;
  }

  .history-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
