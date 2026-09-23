<script setup>
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import AppIcon from '@/components/icons/AppIcon.vue'
import { getComparisonById } from '../services/comparisonService'
import { getScoreClass, formatComparisonScore } from '../utils/format'

const route = useRoute()
const router = useRouter()

const comparison = ref(null)
const loading = ref(false)
const error = ref('')

async function fetchComparison(id) {
  loading.value = true
  error.value = ''
  comparison.value = null

  try {
    const response = await getComparisonById(id)
    comparison.value = response.comparison
  } catch (fetchError) {
    console.error('Error obteniendo comparación:', fetchError)
    error.value = fetchError.message || 'No se pudo cargar la comparación.'
  } finally {
    loading.value = false
  }
}

fetchComparison(route.params.id)

watch(
  () => route.params.id,
  id => {
    if (id) {
      fetchComparison(id)
    }
  }
)

function backToComparisons() {
  router.push('/comparisons')
}

function openComparisonForm() {
  if (comparison.value?.cv_analysis_id) {
    router.push({
      name: 'compare',
      params: { id: comparison.value.cv_analysis_id }
    })
  }
}
</script>

<template>
  <section class="comparison-page container">
    <button class="btn btn-ghost back-button" @click="backToComparisons">
      <AppIcon name="arrow-left" />
      Volver a comparaciones
    </button>

    <div
      v-if="loading"
      class="comparison-skeleton"
      aria-live="polite"
      aria-busy="true"
    >
      <div class="skeleton" style="height: 140px"></div>
      <div class="skeleton" style="height: 260px"></div>
    </div>

    <p v-else-if="error" class="error-message" role="alert">{{ error }}</p>

    <div v-else-if="comparison" class="comparison-result">
      <div class="comparison-result-header fade-in-up">
        <div>
          <span class="badge">Comparación completada</span>
          <h1>{{ comparison.job_title || 'Comparación de CV' }}</h1>
          <p>Comparación realizada con tu CV guardado.</p>
        </div>

        <div
          class="compatibility-score-card"
          :class="
            getScoreClass(
              comparison.compatibility_score ??
                comparison.result?.compatibilityScore
            )
          "
        >
          <span>Compatibilidad</span>
          <strong>
            {{
              formatComparisonScore(
                comparison.compatibility_score ??
                  comparison.result?.compatibilityScore
              )
            }}
          </strong>
          <small>/100</small>
        </div>
      </div>

      <div
        v-if="comparison.result?.summary"
        class="comparison-summary fade-in-up"
      >
        <span>Resumen</span>
        <p>{{ comparison.result.summary }}</p>
      </div>

      <div class="comparison-grid">
        <div class="analysis-section comparison-success">
          <div class="section-heading">
            <span class="section-icon strengths"
              ><AppIcon name="check-circle"
            /></span>
            <div>
              <h3>Habilidades coincidentes</h3>
              <p>Lo que tu CV ya cubre.</p>
            </div>
          </div>

          <div
            v-if="comparison.result?.matchingSkills?.length"
            class="tag-list"
          >
            <span
              v-for="skill in comparison.result.matchingSkills"
              :key="skill"
              class="comparison-tag success"
            >
              {{ skill }}
            </span>
          </div>

          <p v-else class="empty-text">
            No se han detectado coincidencias explícitas.
          </p>
        </div>

        <div class="analysis-section comparison-warning">
          <div class="section-heading">
            <span class="section-icon weaknesses"
              ><AppIcon name="alert-triangle"
            /></span>
            <div>
              <h3>Habilidades faltantes</h3>
              <p>Requisitos no encontrados explícitamente.</p>
            </div>
          </div>

          <div v-if="comparison.result?.missingSkills?.length" class="tag-list">
            <span
              v-for="skill in comparison.result.missingSkills"
              :key="skill"
              class="comparison-tag warning"
            >
              {{ skill }}
            </span>
          </div>

          <p v-else class="empty-text">
            No se han detectado habilidades faltantes.
          </p>
        </div>

        <div class="analysis-section">
          <div class="section-heading">
            <span class="section-icon"><AppIcon name="thumbs-up" /></span>
            <div>
              <h3>Fortalezas</h3>
              <p>Aspectos que juegan a favor del candidato.</p>
            </div>
          </div>

          <ul v-if="comparison.result?.strengths?.length" class="insight-list">
            <li v-for="strength in comparison.result.strengths" :key="strength">
              {{ strength }}
            </li>
          </ul>

          <p v-else class="empty-text">
            No se han detectado fortalezas específicas.
          </p>
        </div>

        <div class="analysis-section">
          <div class="section-heading">
            <span class="section-icon"><AppIcon name="target" /></span>
            <div>
              <h3>Brechas</h3>
              <p>Factores que reducen la compatibilidad.</p>
            </div>
          </div>

          <ul v-if="comparison.result?.gaps?.length" class="insight-list">
            <li v-for="gap in comparison.result.gaps" :key="gap">{{ gap }}</li>
          </ul>

          <p v-else class="empty-text">
            No se han detectado brechas específicas.
          </p>
        </div>

        <div class="analysis-section full-width">
          <div class="section-heading">
            <span class="section-icon"><AppIcon name="sparkles" /></span>
            <div>
              <h3>Keywords detectadas</h3>
              <p>Términos relevantes de la oferta.</p>
            </div>
          </div>

          <div v-if="comparison.result?.keywords?.length" class="tag-list">
            <span
              v-for="keyword in comparison.result.keywords"
              :key="keyword"
              class="comparison-tag"
            >
              {{ keyword }}
            </span>
          </div>

          <p v-else class="empty-text">
            No se han detectado keywords específicas.
          </p>
        </div>

        <div class="analysis-section full-width">
          <div class="section-heading">
            <span class="section-icon"><AppIcon name="rocket" /></span>
            <div>
              <h3>Recomendaciones</h3>
              <p>Qué puedes mejorar para esta candidatura.</p>
            </div>
          </div>

          <div
            v-if="comparison.result?.recommendations?.length"
            class="recommendation-list"
          >
            <div
              v-for="(recommendation, index) in comparison.result
                .recommendations"
              :key="recommendation"
              class="recommendation-item"
            >
              <span>{{ index + 1 }}</span>
              <p>{{ recommendation }}</p>
            </div>
          </div>

          <p v-else class="empty-text">No se han generado recomendaciones.</p>
        </div>
      </div>

      <div class="analysis-bottom-actions">
        <button class="btn btn-secondary" @click="backToComparisons">
          <AppIcon name="arrow-left" />
          Mis comparaciones
        </button>

        <button class="btn btn-primary" @click="openComparisonForm">
          Comparar de nuevo
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.comparison-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.back-button {
  align-self: flex-start;
}

.comparison-skeleton {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.comparison-result {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.comparison-result-header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-5);
  padding: var(--space-6);
  border-radius: var(--radius-xl);
  border: 1px solid var(--color-border);
  background: var(--accent-gradient-soft);
}

.comparison-result-header h1 {
  font-size: 1.7rem;
  margin-top: var(--space-2);
}

.comparison-result-header p {
  color: var(--color-text-secondary);
  margin-top: var(--space-1);
}

.compatibility-score-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.1rem;
  padding: var(--space-4) var(--space-5);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  min-width: 130px;
}

.compatibility-score-card span {
  font-size: 0.75rem;
  color: var(--color-text-tertiary);
}

.compatibility-score-card strong {
  font-family: var(--font-display);
  font-size: 2rem;
}

.compatibility-score-card.score-bad strong {
  color: var(--score-bad);
}

.compatibility-score-card.score-warn strong {
  color: var(--score-warn);
}

.compatibility-score-card.score-good strong {
  color: var(--score-good);
}

.compatibility-score-card.score-excellent strong {
  color: var(--score-excellent);
}

.compatibility-score-card small {
  font-size: 0.72rem;
  color: var(--color-text-tertiary);
}

.comparison-summary {
  padding: var(--space-5);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
}

.comparison-summary span {
  display: block;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-tertiary);
  margin-bottom: var(--space-2);
}

.comparison-summary p {
  color: var(--color-text-secondary);
}

.comparison-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--space-4);
}

.comparison-grid .full-width {
  grid-column: 1 / -1;
}

.comparison-grid .section-heading p {
  font-size: 0.8rem;
  color: var(--color-text-tertiary);
  margin-top: 0.1rem;
}

.comparison-tag {
  display: inline-flex;
  align-items: center;
  padding: 0.4rem 0.85rem;
  border-radius: var(--radius-full);
  background: var(--color-surface-hover);
  border: 1px solid var(--color-border);
  font-size: 0.85rem;
  color: var(--color-text-secondary);
}

.comparison-tag.success {
  color: var(--score-good);
  background: var(--score-good-bg);
  border-color: rgba(74, 222, 128, 0.3);
}

.comparison-tag.warning {
  color: var(--score-warn);
  background: var(--score-warn-bg);
  border-color: rgba(251, 191, 36, 0.3);
}

.insight-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.insight-list li {
  position: relative;
  padding-left: var(--space-4);
  font-size: 0.88rem;
  color: var(--color-text-secondary);
}

.insight-list li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0.55em;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  opacity: 0.5;
}

.recommendation-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.recommendation-item {
  display: flex;
  gap: var(--space-3);
  align-items: flex-start;
}

.recommendation-item span {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--accent-soft);
  color: var(--accent-strong);
  font-size: 0.8rem;
  font-weight: 600;
}

.recommendation-item p {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  padding-top: 0.15rem;
}

.analysis-bottom-actions {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
  flex-wrap: wrap;
}
</style>
