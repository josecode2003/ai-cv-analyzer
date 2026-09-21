<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

import CVUploader from '../components/cv/CVUploader.vue'
import { uploadCV } from '../services/cvService'
import { useSession } from '../stores/session'
import { getScoreClass, formatDate } from '../utils/format'

const router = useRouter()
const { state, loadAnalyses } = useSession()

const cvUploader = ref(null)

async function uploadSelectedCV(file) {
  if (!file) {
    return
  }

  try {
    const response = await uploadCV(file)

    cvUploader.value?.setUploadState({
      status: 'success',
      message: response.message
    })

    await loadAnalyses()
  } catch (error) {
    console.error('Error analizando CV:', error)

    cvUploader.value?.setUploadState({
      status: 'error',
      message: error.message || 'No se pudo analizar el CV.'
    })
  }
}

function openAnalysis(id) {
  router.push({ name: 'analysis', params: { id } })
}
</script>

<template>
  <section class="home-page">
    <div class="hero">
      <span class="badge"> IA para tu carrera profesional </span>

      <h1>
        Analiza tu CV con

        <span class="highlight"> Inteligencia Artificial </span>
      </h1>

      <p class="description">
        Analiza tus habilidades, experiencia y formación. Comprueba tu
        compatibilidad con una oferta de empleo y descubre qué puedes mejorar.
      </p>

      <CVUploader ref="cvUploader" @upload="uploadSelectedCV" />

      <div v-if="state.analyses.length" class="recent-analysis">
        <div class="recent-header">
          <div>
            <span> ÚLTIMO ANÁLISIS </span>

            <h3>
              {{ state.analyses[0].candidate_name }}
            </h3>
          </div>

          <button class="secondary-button" @click="router.push('/analyses')">
            Ver todos
          </button>
        </div>

        <div class="recent-card">
          <div class="recent-file-icon">📄</div>

          <div class="recent-info">
            <strong>
              {{ state.analyses[0].original_filename }}
            </strong>

            <span>
              {{ state.analyses[0].profile }}
            </span>

            <small>
              {{ formatDate(state.analyses[0].created_at) }}
            </small>
          </div>

          <div
            class="mini-score"
            :class="getScoreClass(state.analyses[0].score)"
          >
            {{ state.analyses[0].score }}
          </div>

          <button
            class="view-button"
            @click="openAnalysis(state.analyses[0].id)"
          >
            Ver
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
