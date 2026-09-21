<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

import { useSession } from '../stores/session'
import { deleteAnalysis } from '../services/analysisService'
import { getScoreClass, formatDate } from '../utils/format'

const router = useRouter()
const { state, loadAnalyses } = useSession()

const deletingAnalysisId = ref(null)

onMounted(loadAnalyses)

function openAnalysis(id) {
  router.push({ name: 'analysis', params: { id } })
}

function analyzeAnotherCV() {
  router.push('/')
}

async function removeAnalysis(id) {
  const confirmed = window.confirm(
    '¿Seguro que quieres eliminar este análisis?'
  )

  if (!confirmed) {
    return
  }

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
  <section class="analyses-page">
    <div class="page-heading">
      <div>
        <span class="badge"> Historial </span>

        <h1>Mis análisis</h1>

        <p>Todos tus CV analizados y guardados en PostgreSQL.</p>
      </div>

      <button class="primary-button" @click="analyzeAnotherCV">
        + Analizar nuevo CV
      </button>
    </div>

    <div v-if="state.analysisError" class="error-message page-error">
      {{ state.analysisError }}
    </div>

    <div v-if="state.loadingAnalyses" class="loading-state">
      <div class="loading-spinner"></div>

      <p>Cargando tus análisis...</p>
    </div>

    <div v-else-if="state.analyses.length === 0" class="empty-state">
      <div class="empty-icon">📊</div>

      <h2>Todavía no tienes análisis</h2>

      <p>Analiza tu primer CV y aparecerá aquí automáticamente.</p>

      <button class="primary-button" @click="analyzeAnotherCV">
        Analizar mi primer CV
      </button>
    </div>

    <div v-else class="analyses-list">
      <article
        v-for="item in state.analyses"
        :key="item.id"
        class="analysis-history-card"
      >
        <div class="history-file-icon">📄</div>

        <div class="history-info">
          <h3>
            {{ item.candidate_name || 'Candidato sin nombre' }}
          </h3>

          <strong>
            {{ item.original_filename }}
          </strong>

          <span>
            {{ item.profile || 'Perfil no indicado' }}
          </span>

          <small>
            {{ item.level || 'Nivel no indicado' }}

            ·

            {{ formatDate(item.created_at) }}
          </small>
        </div>

        <div class="history-score">
          <span> CV Score </span>

          <strong :class="getScoreClass(item.score)">
            {{ item.score ?? 0 }}
          </strong>

          <small> /100 </small>
        </div>

        <div class="history-actions">
          <button class="view-button" @click="openAnalysis(item.id)">
            Ver análisis
          </button>

          <button
            class="delete-button"
            :disabled="deletingAnalysisId === item.id"
            @click="removeAnalysis(item.id)"
          >
            {{ deletingAnalysisId === item.id ? 'Eliminando...' : 'Eliminar' }}
          </button>
        </div>
      </article>
    </div>
  </section>
</template>
