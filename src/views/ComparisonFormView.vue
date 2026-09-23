<script setup>
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import AppIcon from '@/components/icons/AppIcon.vue'
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
  <section class="comparison-page container">
    <button class="btn btn-ghost back-button" @click="backToAnalysis">
      <AppIcon name="arrow-left" />
      Volver al análisis
    </button>

    <div class="page-heading fade-in-up">
      <span class="badge">Comparación inteligente</span>
      <h1>Compara tu CV con una oferta</h1>
      <p>
        La IA analizará el nivel de compatibilidad entre tu CV y los requisitos
        de la oferta.
      </p>
    </div>

    <div class="comparison-form-card fade-in-up">
      <div class="comparison-selected-cv">
        <span class="selected-cv-icon"><AppIcon name="file-text" /></span>

        <div>
          <span>CV seleccionado</span>
          <strong>{{
            analysis?.personalInfo?.name ||
            (loadingAnalysis ? 'Cargando…' : 'CV actual')
          }}</strong>
        </div>
      </div>

      <form class="comparison-form" @submit.prevent="submitComparison">
        <div class="form-group">
          <label for="job-title">
            Título del puesto
            <span>Opcional</span>
          </label>

          <input
            id="job-title"
            v-model="form.jobTitle"
            type="text"
            maxlength="255"
            placeholder="Ej. Oficial de electricidad"
          />
        </div>

        <div class="form-group">
          <div class="textarea-label">
            <label for="job-offer">Oferta de empleo</label>
            <span>{{ form.jobOfferText.length }}/30.000</span>
          </div>

          <textarea
            id="job-offer"
            v-model="form.jobOfferText"
            rows="14"
            maxlength="30000"
            placeholder="Pega aquí el texto completo de la oferta de empleo..."
          ></textarea>
        </div>

        <p v-if="error" class="error-message" role="alert">{{ error }}</p>

        <button
          type="submit"
          class="btn btn-primary comparison-submit"
          :disabled="creating"
        >
          <AppIcon name="sparkles" />
          {{ creating ? 'Comparando con IA…' : 'Comparar CV con oferta' }}
        </button>
      </form>
    </div>
  </section>
</template>

<style scoped>
.comparison-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  max-width: 760px;
}

.back-button {
  align-self: flex-start;
}

.page-heading {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.page-heading h1 {
  font-size: 1.8rem;
  margin-top: var(--space-2);
}

.page-heading p {
  color: var(--color-text-secondary);
}

.comparison-form-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  padding: var(--space-6);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
}

.comparison-selected-cv {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  background: var(--accent-soft);
  border: 1px solid var(--accent-border);
}

.selected-cv-icon {
  display: inline-flex;
  width: 36px;
  height: 36px;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--accent-strong);
  flex-shrink: 0;
}

.comparison-selected-cv > div {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.comparison-selected-cv span {
  font-size: 0.74rem;
  color: var(--color-text-tertiary);
}

.comparison-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.form-group label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.88rem;
  font-weight: 500;
}

.form-group label span {
  font-weight: 400;
  color: var(--color-text-tertiary);
  font-size: 0.78rem;
}

.textarea-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.textarea-label span {
  font-size: 0.78rem;
  color: var(--color-text-tertiary);
}

input,
textarea {
  width: 100%;
  padding: 0.75rem var(--space-4);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-surface-hover);
  color: var(--color-text);
  transition: border-color var(--duration-base) var(--ease-out);
  resize: vertical;
}

input::placeholder,
textarea::placeholder {
  color: var(--color-text-tertiary);
}

input:focus,
textarea:focus {
  outline: none;
  border-color: var(--accent-border);
}

.comparison-submit {
  align-self: flex-start;
}

@media (max-width: 640px) {
  .comparison-submit {
    width: 100%;
  }
}
</style>
