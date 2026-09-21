<script setup>
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import AnalysisDetail from '../components/analysis/AnalysisDetail.vue'
import { getAnalysisById } from '../services/analysisService'

const route = useRoute()
const router = useRouter()

const analysis = ref(null)
const loading = ref(false)
const error = ref('')

async function fetchAnalysis(id) {
  loading.value = true
  error.value = ''
  analysis.value = null

  try {
    const response = await getAnalysisById(id)
    analysis.value = response.analysis.analysis
  } catch (fetchError) {
    console.error('Error obteniendo análisis:', fetchError)
    error.value = fetchError.message || 'No se pudo cargar el análisis.'
  } finally {
    loading.value = false
  }
}

fetchAnalysis(route.params.id)

watch(
  () => route.params.id,
  id => {
    if (id) {
      fetchAnalysis(id)
    }
  }
)

function goToAnalyses() {
  router.push('/analyses')
}

function openComparisonForm() {
  router.push({ name: 'compare', params: { id: route.params.id } })
}

function analyzeAnotherCV() {
  router.push('/')
}
</script>

<template>
  <section class="analysis-page">
    <div class="analysis-page-header">
      <button class="back-button" @click="goToAnalyses">
        ← Volver a Mis análisis
      </button>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>

      <p>Recuperando análisis...</p>
    </div>

    <div v-else-if="error" class="error-message page-error">
      {{ error }}
    </div>

    <AnalysisDetail
      v-else-if="analysis"
      :analysis="analysis"
      :cv-id="route.params.id"
      @back="goToAnalyses"
      @compare="openComparisonForm"
      @analyze-another="analyzeAnotherCV"
    />
  </section>
</template>
