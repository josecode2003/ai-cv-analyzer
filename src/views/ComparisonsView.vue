<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

import { useSession } from '../stores/session'
import { deleteComparison } from '../services/comparisonService'
import { getScoreClass, formatDate } from '../utils/format'

const router = useRouter()
const { state, loadComparisons } = useSession()

const deletingComparisonId = ref(null)

onMounted(loadComparisons)

function openSavedComparison(id) {
  router.push({ name: 'comparison-result', params: { id } })
}

function goToAnalyses() {
  router.push('/analyses')
}

async function removeComparison(id) {
  const confirmed = window.confirm(
    '¿Seguro que quieres eliminar esta comparación?'
  )

  if (!confirmed) {
    return
  }

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
  <section class="comparisons-page">
    <div class="page-heading">
      <div>
        <span class="badge"> Matching inteligente </span>

        <h1>Mis comparaciones</h1>

        <p>Historial de compatibilidad entre tus CV y ofertas.</p>
      </div>

      <button class="primary-button" @click="goToAnalyses">Ver mis CV</button>
    </div>

    <div v-if="state.comparisonError" class="error-message page-error">
      {{ state.comparisonError }}
    </div>

    <div v-if="state.loadingComparisons" class="loading-state">
      <div class="loading-spinner"></div>

      <p>Cargando comparaciones...</p>
    </div>

    <div v-else-if="state.comparisons.length === 0" class="empty-state">
      <div class="empty-icon">🎯</div>

      <h2>Todavía no tienes comparaciones</h2>

      <p>Abre uno de tus CV y compáralo con una oferta de empleo.</p>

      <button class="primary-button" @click="goToAnalyses">
        Ir a mis análisis
      </button>
    </div>

    <div v-else class="comparisons-list">
      <article
        v-for="item in state.comparisons"
        :key="item.id"
        class="comparison-history-card"
      >
        <div class="comparison-history-icon">🎯</div>

        <div class="comparison-history-info">
          <span>
            {{ item.job_title || 'Oferta sin título' }}
          </span>

          <strong> CV #{{ item.cv_analysis_id }} </strong>

          <small>
            {{ formatDate(item.created_at) }}
          </small>
        </div>

        <div
          class="comparison-history-score"
          :class="getScoreClass(item.compatibility_score)"
        >
          <span> Compatibilidad </span>

          <strong>
            {{ item.compatibility_score }}
          </strong>

          <small> /100 </small>
        </div>

        <div class="history-actions">
          <button class="view-button" @click="openSavedComparison(item.id)">
            Ver
          </button>

          <button
            class="delete-button"
            :disabled="deletingComparisonId === item.id"
            @click="removeComparison(item.id)"
          >
            {{
              deletingComparisonId === item.id ? 'Eliminando...' : 'Eliminar'
            }}
          </button>
        </div>
      </article>
    </div>
  </section>
</template>
