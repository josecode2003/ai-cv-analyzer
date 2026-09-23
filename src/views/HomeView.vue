<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

import CVUploader from '../components/cv/CVUploader.vue'
import AppIcon from '@/components/icons/AppIcon.vue'
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

    if (response.saved?.id) {
      router.push({ name: 'analysis', params: { id: response.saved.id } })
    }
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
  <section class="home-page container">
    <div class="hero fade-in-up">
      <span class="badge">
        <AppIcon name="sparkles" />
        IA para tu carrera profesional
      </span>

      <h1>
        Analiza tu CV con
        <span class="highlight">inteligencia artificial</span>
      </h1>

      <p class="description">
        Sube tu currículum y obtén una puntuación por categorías, el baremo
        específico de tu profesión y una comparación directa con cualquier
        oferta de empleo.
      </p>
    </div>

    <div class="hero-upload fade-in-up" style="animation-delay: 80ms">
      <CVUploader ref="cvUploader" @upload="uploadSelectedCV" />
    </div>

    <div
      v-if="state.analyses.length"
      class="recent-analysis fade-in-up"
      style="animation-delay: 160ms"
    >
      <div class="recent-header">
        <div>
          <span class="eyebrow">Último análisis</span>
          <h3>{{ state.analyses[0].candidate_name || 'Candidato' }}</h3>
        </div>

        <button class="btn btn-ghost" @click="router.push('/analyses')">
          Ver todos
        </button>
      </div>

      <button class="recent-card" @click="openAnalysis(state.analyses[0].id)">
        <span class="recent-file-icon"><AppIcon name="file-text" /></span>

        <div class="recent-info">
          <strong>{{ state.analyses[0].original_filename }}</strong>
          <span>{{ state.analyses[0].profile }}</span>
          <small>{{ formatDate(state.analyses[0].created_at) }}</small>
        </div>

        <div class="mini-score" :class="getScoreClass(state.analyses[0].score)">
          {{ state.analyses[0].score }}
        </div>
      </button>
    </div>
  </section>
</template>

<style scoped>
.home-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-7);
  text-align: center;
  padding-block: var(--space-6);
}

.hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
  max-width: 640px;
}

.hero h1 {
  font-size: clamp(2rem, 5vw, 3.1rem);
}

.highlight {
  background: var(--accent-gradient);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.description {
  color: var(--color-text-secondary);
  font-size: 1.05rem;
  max-width: 52ch;
}

.hero-upload {
  width: 100%;
  max-width: 480px;
}

.recent-analysis {
  width: 100%;
  max-width: 640px;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  text-align: left;
}

.recent-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.eyebrow {
  display: block;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-text-tertiary);
  margin-bottom: 0.2rem;
}

.recent-header h3 {
  font-size: 1.1rem;
}

.recent-card {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  width: 100%;
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  text-align: left;
  transition:
    border-color var(--duration-base) var(--ease-out),
    transform var(--duration-fast) var(--ease-out);
}

@media (hover: hover) and (pointer: fine) {
  .recent-card:hover {
    border-color: var(--color-border-strong);
    transform: translateY(-2px);
  }
}

.recent-file-icon {
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

.recent-info {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  flex: 1;
  min-width: 0;
}

.recent-info strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recent-info span {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
}

.recent-info small {
  font-size: 0.76rem;
  color: var(--color-text-tertiary);
}

.mini-score {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 46px;
  border-radius: 50%;
  font-family: var(--font-display);
  font-weight: 600;
  flex-shrink: 0;
}

.mini-score.score-bad {
  background: var(--score-bad-bg);
  color: var(--score-bad);
}

.mini-score.score-warn {
  background: var(--score-warn-bg);
  color: var(--score-warn);
}

.mini-score.score-good {
  background: var(--score-good-bg);
  color: var(--score-good);
}

.mini-score.score-excellent {
  background: var(--score-excellent-bg);
  color: var(--score-excellent);
}
</style>
