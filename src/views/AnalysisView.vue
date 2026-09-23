<script setup>
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import AnalysisDetail from '../components/analysis/AnalysisDetail.vue'
import AppIcon from '@/components/icons/AppIcon.vue'
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
  <section class="analysis-page container">
    <button class="btn btn-ghost back-button" @click="goToAnalyses">
      <AppIcon name="arrow-left" />
      Volver a mis análisis
    </button>

    <div
      v-if="loading"
      class="analysis-skeleton"
      aria-live="polite"
      aria-busy="true"
    >
      <div class="skeleton" style="height: 180px"></div>
      <div class="skeleton" style="height: 90px"></div>
      <div class="skeleton" style="height: 220px"></div>
      <div class="skeleton" style="height: 220px"></div>
    </div>

    <p v-else-if="error" class="error-message" role="alert">
      {{ error }}
    </p>

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

<style scoped>
.analysis-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.back-button {
  align-self: flex-start;
}

.analysis-skeleton {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
</style>
