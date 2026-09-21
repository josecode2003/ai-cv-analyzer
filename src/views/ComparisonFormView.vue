<script setup>
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { getAnalysisById } from '../services/analysisService'
import { compareCVWithJobOffer } from '../services/comparisonService'
import { useSession } from '../stores/session'

const route = useRoute()
const router = useRouter()
const { loadComparisons } = useSession()

const cvId = route.params.id

const analysis = ref(null)
const loadingAnalysis = ref(false)

const form = reactive({
  jobTitle: '',
  jobOfferText: ''
})

const creating = ref(false)
const error = ref('')

async function loadCv() {
  loadingAnalysis.value = true

  try {
    const response = await getAnalysisById(cvId)
    analysis.value = response.analysis.analysis
  } catch (fetchError) {
    console.error('Error obteniendo análisis:', fetchError)
    error.value = 'No se pudo cargar el CV seleccionado.'
  } finally {
    loadingAnalysis.value = false
  }
}

loadCv()

async function submitComparison() {
  error.value = ''

  const jobTitle = form.jobTitle.trim()
  const jobOfferText = form.jobOfferText.trim()

  if (!jobOfferText) {
    error.value = 'Pega la oferta de empleo antes de continuar.'
    return
  }

  if (jobOfferText.length < 50) {
    error.value = 'La oferta debe tener al menos 50 caracteres.'
    return
  }

  if (jobOfferText.length > 30000) {
    error.value = 'La oferta no puede superar los 30.000 caracteres.'
    return
  }

  if (jobTitle.length > 255) {
    error.value = 'El título no puede superar los 255 caracteres.'
    return
  }

  creating.value = true

  try {
    const response = await compareCVWithJobOffer({
      cvId,
      jobTitle,
      jobOfferText
    })

    try {
      await loadComparisons()
    } catch (historyError) {
      console.error(
        'La comparación se creó, pero no se pudo actualizar el historial:',
        historyError
      )
    }

    router.push({
      name: 'comparison-result',
      params: { id: response.comparison.id }
    })
  } catch (submitError) {
    console.error('Error comparando CV:', submitError)
    error.value =
      submitError.message || 'No se pudo comparar el CV con la oferta.'
  } finally {
    creating.value = false
  }
}

function backToAnalysis() {
  router.push({ name: 'analysis', params: { id: cvId } })
}
</script>

<template>
  <section class="comparison-page">
    <div class="page-heading">
      <div>
        <button class="back-button" @click="backToAnalysis">
          ← Volver al análisis
        </button>

        <span class="badge"> Comparación inteligente </span>

        <h1>Compara tu CV con una oferta</h1>

        <p>
          La IA analizará el nivel de compatibilidad entre tu CV y los
          requisitos de la oferta.
        </p>
      </div>
    </div>

    <div class="comparison-form-card">
      <div class="comparison-selected-cv">
        <div class="selected-cv-icon">📄</div>

        <div>
          <span> CV seleccionado </span>

          <strong>
            {{ analysis?.personalInfo?.name || 'CV actual' }}
          </strong>
        </div>
      </div>

      <form class="comparison-form" @submit.prevent="submitComparison">
        <div class="form-group">
          <label>
            Título del puesto

            <span> Opcional </span>
          </label>

          <input
            v-model="form.jobTitle"
            type="text"
            maxlength="255"
            placeholder="Ej. Desarrollador Web Junior"
          />
        </div>

        <div class="form-group">
          <div class="textarea-label">
            <label> Oferta de empleo </label>

            <span> {{ form.jobOfferText.length }}/30.000 </span>
          </div>

          <textarea
            v-model="form.jobOfferText"
            rows="14"
            maxlength="30000"
            placeholder="Pega aquí el texto completo de la oferta de empleo..."
          ></textarea>
        </div>

        <div v-if="error" class="error-message">
          {{ error }}
        </div>

        <button
          type="submit"
          class="primary-button comparison-submit"
          :disabled="creating"
        >
          {{ creating ? 'Comparando con IA...' : 'Comparar CV con oferta' }}
        </button>
      </form>
    </div>
  </section>
</template>
