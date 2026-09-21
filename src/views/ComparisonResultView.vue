<script setup>
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

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
  <section class="comparison-page">
    <div class="analysis-page-header">
      <button class="back-button" @click="backToComparisons">
        ← Volver a comparaciones
      </button>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>

      <p>Recuperando comparación...</p>
    </div>

    <div v-else-if="error" class="error-message page-error">
      {{ error }}
    </div>

    <div v-else-if="comparison" class="comparison-result">
      <div class="comparison-result-header">
        <div>
          <span class="badge"> Comparación completada </span>

          <h1>
            {{ comparison.job_title || 'Comparación de CV' }}
          </h1>

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
          <span> Compatibilidad </span>

          <strong>
            {{
              formatComparisonScore(
                comparison.compatibility_score ??
                  comparison.result?.compatibilityScore
              )
            }}
          </strong>

          <small> /100 </small>
        </div>
      </div>

      <div v-if="comparison.result?.summary" class="comparison-summary">
        <span> RESUMEN </span>

        <p>
          {{ comparison.result.summary }}
        </p>
      </div>

      <div class="comparison-grid">
        <!-- MATCHING -->

        <div class="comparison-section comparison-success">
          <div class="comparison-section-header">
            <span class="comparison-section-icon"> ✅ </span>

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

        <!-- MISSING -->

        <div class="comparison-section comparison-warning">
          <div class="comparison-section-header">
            <span class="comparison-section-icon"> ⚠️ </span>

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

        <!-- STRENGTHS -->

        <div class="comparison-section">
          <div class="comparison-section-header">
            <span class="comparison-section-icon"> 💪 </span>

            <div>
              <h3>Fortalezas</h3>

              <p>Aspectos que juegan a favor del candidato.</p>
            </div>
          </div>

          <ul
            v-if="comparison.result?.strengths?.length"
            class="comparison-list"
          >
            <li v-for="strength in comparison.result.strengths" :key="strength">
              {{ strength }}
            </li>
          </ul>
        </div>

        <!-- GAPS -->

        <div class="comparison-section">
          <div class="comparison-section-header">
            <span class="comparison-section-icon"> 📌 </span>

            <div>
              <h3>Brechas</h3>

              <p>Factores que reducen la compatibilidad.</p>
            </div>
          </div>

          <ul v-if="comparison.result?.gaps?.length" class="comparison-list">
            <li v-for="gap in comparison.result.gaps" :key="gap">
              {{ gap }}
            </li>
          </ul>
        </div>

        <!-- KEYWORDS -->

        <div class="comparison-section full-width">
          <div class="comparison-section-header">
            <span class="comparison-section-icon"> 🔑 </span>

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
        </div>

        <!-- RECOMMENDATIONS -->

        <div class="comparison-section full-width recommendation-section">
          <div class="comparison-section-header">
            <span class="comparison-section-icon"> 🚀 </span>

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
              <span>
                {{ index + 1 }}
              </span>

              <p>
                {{ recommendation }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div class="analysis-bottom-actions">
        <button class="secondary-button" @click="backToComparisons">
          ← Mis comparaciones
        </button>

        <button class="primary-button" @click="openComparisonForm">
          Comparar de nuevo
        </button>
      </div>
    </div>
  </section>
</template>
