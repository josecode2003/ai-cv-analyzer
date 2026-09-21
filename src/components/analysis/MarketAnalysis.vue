<script setup>
import { onMounted, onUnmounted, ref } from 'vue'

import MarketEvidence from './MarketEvidence.vue'
import { getMarketAnalysis } from '@/services/marketService'
import { formatDate } from '@/utils/format'

const props = defineProps({
  cvId: {
    type: [String, Number],
    required: true
  }
})

const status = ref('loading')
const loadingMessage = ref('Identificando tu perfil profesional...')
const unavailableMessage = ref('')
const market = ref(null)
const generatedAt = ref(null)

const LOADING_MESSAGES = [
  'Identificando tu perfil profesional...',
  'Analizando el mercado laboral de tu sector en España...',
  'Preparando tu informe...'
]

let loadingInterval = null

function cycleLoadingMessages() {
  let index = 0

  loadingInterval = setInterval(() => {
    index = (index + 1) % LOADING_MESSAGES.length
    loadingMessage.value = LOADING_MESSAGES[index]
  }, 2200)
}

async function loadMarketAnalysis() {
  status.value = 'loading'
  loadingMessage.value = LOADING_MESSAGES[0]
  cycleLoadingMessages()

  try {
    const response = await getMarketAnalysis(props.cvId)

    if (!response.available) {
      status.value = 'unavailable'
      unavailableMessage.value =
        response.message ||
        'No se pudo obtener el análisis de mercado laboral en este momento.'
      return
    }

    market.value = response.marketAnalysis
    generatedAt.value = response.generatedAt
    status.value = 'ready'
  } catch (fetchError) {
    console.error('Error obteniendo el análisis de mercado:', fetchError)
    status.value = 'error'
  } finally {
    clearInterval(loadingInterval)
  }
}

onMounted(loadMarketAnalysis)

onUnmounted(() => {
  clearInterval(loadingInterval)
})

const dataSufficiencyText = {
  sufficient: 'Se han encontrado datos actuales suficientes para este perfil.',
  partial:
    'Solo se han encontrado datos parciales para este perfil: algunos indicadores pueden no estar disponibles.',
  insufficient:
    'No se han encontrado datos fiables suficientes para este perfil profesional en este momento.'
}
</script>

<template>
  <div class="analysis-section market-analysis-section">
    <h3>📊 Situación del mercado laboral</h3>

    <p class="market-disclaimer">
      Basado en fuentes públicas y verificables (SEPE, INE, Ministerio de
      Trabajo, EURES, Eurostat, observatorios de empleo e informes laborales
      reconocidos), no en el conocimiento general del modelo de IA.
    </p>

    <div v-if="status === 'loading'" class="loading-state market-loading">
      <div class="loading-spinner"></div>
      <p>{{ loadingMessage }}</p>
    </div>

    <div v-else-if="status === 'error'" class="error-message">
      No se pudo cargar el análisis de mercado laboral.

      <button type="button" class="retry-link" @click="loadMarketAnalysis">
        Reintentar
      </button>
    </div>

    <div
      v-else-if="status === 'unavailable'"
      class="empty-text market-unavailable"
    >
      {{ unavailableMessage }}
    </div>

    <div v-else-if="market" class="market-report">
      <p class="data-sufficiency-note">
        {{
          dataSufficiencyText[market.dataSufficiency] ||
          dataSufficiencyText.insufficient
        }}
      </p>

      <!-- SITUACIÓN ACTUAL -->
      <div class="market-block">
        <h4>Situación actual</h4>
        <p>
          {{
            market.situacionActual?.summary ||
            'No hay datos suficientes para estimar este indicador.'
          }}
        </p>
        <MarketEvidence v-bind="market.situacionActual" />
      </div>

      <!-- DEMANDA -->
      <div class="market-header">
        <div>
          <span>Demanda</span>
          <strong>{{
            market.demand?.explanation ||
            'No hay datos suficientes para estimar este indicador.'
          }}</strong>
        </div>

        <div class="demand-badge" :class="`demand-${market.demand?.level}`">
          {{
            market.demand?.level === 'sin_datos_suficientes' ||
            !market.demand?.level
              ? 'Sin datos suficientes'
              : `Demanda ${market.demand.level}`
          }}
        </div>
      </div>
      <MarketEvidence v-bind="market.demand" />

      <!-- SALARIO -->
      <div class="market-block">
        <h4>Rango salarial</h4>
        <p>
          {{
            market.salary?.range ||
            'No hay datos suficientes para estimar este indicador.'
          }}
          <template
            v-if="
              market.salary?.range &&
              market.salary?.period &&
              market.salary.period !== 'sin_datos_suficientes'
            "
          >
            ({{ market.salary.period }})
          </template>
        </p>
        <MarketEvidence v-bind="market.salary" />
      </div>

      <!-- TENDENCIAS -->
      <div v-if="market.trends?.length" class="market-block">
        <h4>Tendencias</h4>

        <div
          v-for="(trend, index) in market.trends"
          :key="index"
          class="market-item"
        >
          <p>{{ trend.statement }}</p>
          <MarketEvidence v-bind="trend" />
        </div>
      </div>

      <!-- SECTORES / PUESTOS / COMPETENCIAS -->
      <div v-if="market.sectorsHiring?.length" class="skill-group">
        <h4>Sectores que más contratan</h4>
        <div class="tag-list">
          <span
            v-for="item in market.sectorsHiring"
            :key="item"
            class="skill-tag"
            >{{ item }}</span
          >
        </div>
      </div>

      <div v-if="market.relatedRoles?.length" class="skill-group">
        <h4>Puestos relacionados</h4>
        <div class="tag-list">
          <span
            v-for="item in market.relatedRoles"
            :key="item"
            class="skill-tag"
            >{{ item }}</span
          >
        </div>
      </div>

      <div v-if="market.skillsInDemand?.length" class="skill-group">
        <h4>Competencias más demandadas</h4>
        <div class="tag-list">
          <span
            v-for="item in market.skillsInDemand"
            :key="item"
            class="skill-tag soft"
            >{{ item }}</span
          >
        </div>
      </div>

      <!-- DISTRIBUCIÓN GEOGRÁFICA -->
      <div v-if="market.geographicDistribution?.length" class="market-block">
        <h4>Distribución geográfica</h4>

        <div
          v-for="(region, index) in market.geographicDistribution"
          :key="index"
          class="market-item"
        >
          <p>
            <strong>{{ region.region }}</strong> — {{ region.note }}
          </p>
          <MarketEvidence v-bind="region" />
        </div>
      </div>

      <!-- RECOMENDACIONES -->
      <div v-if="market.recommendations?.length" class="skill-group">
        <h4>Recomendaciones para este mercado</h4>

        <div class="recommendation-list">
          <div
            v-for="(tip, index) in market.recommendations"
            :key="index"
            class="recommendation-item"
          >
            <span>{{ index + 1 }}</span>
            <p>{{ tip }}</p>
          </div>
        </div>
      </div>

      <!-- FUENTES -->
      <div v-if="market.sourcesUsed?.length" class="market-sources">
        <h4>Fuentes consultadas</h4>

        <ul>
          <li v-for="(source, index) in market.sourcesUsed" :key="index">
            <a :href="source.url" target="_blank" rel="noopener noreferrer">
              {{ source.title }}
            </a>
            — {{ source.publisher }} ({{ source.date }})
          </li>
        </ul>
      </div>

      <p v-if="generatedAt" class="market-generated-at">
        Informe generado: {{ formatDate(generatedAt) }}
      </p>
    </div>
  </div>
</template>
