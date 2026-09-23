<script setup>
import { onMounted, ref } from 'vue'

import AppIcon from '@/components/icons/AppIcon.vue'
import { getMarketAnalysis } from '@/services/marketService'
import { formatShortDate, getDemandMeta } from '@/utils/format'

const props = defineProps({
  cvId: {
    type: [String, Number],
    required: true
  }
})

const status = ref('loading')
const unavailableMessage = ref('')
const market = ref(null)

async function loadMarketAnalysis() {
  status.value = 'loading'

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
    status.value = 'ready'
  } catch (fetchError) {
    console.error('Error obteniendo el análisis de mercado:', fetchError)
    status.value = 'error'
  }
}

onMounted(loadMarketAnalysis)
</script>

<template>
  <div class="analysis-section market-analysis-section">
    <div class="section-heading">
      <span class="section-icon"><AppIcon name="bar-chart" /></span>
      <h3>Mercado laboral en España</h3>
    </div>

    <div v-if="status === 'loading'" class="market-skeleton" aria-hidden="true">
      <div class="skeleton" style="height: 22px; width: 60%"></div>
      <div class="skeleton" style="height: 14px; width: 100%"></div>
      <div class="skeleton" style="height: 14px; width: 90%"></div>
      <div
        class="skeleton"
        style="height: 90px; width: 100%; margin-top: 8px"
      ></div>
    </div>

    <p v-else-if="status === 'error'" class="error-message" role="alert">
      No se pudo cargar el análisis de mercado laboral.

      <button type="button" class="retry-link" @click="loadMarketAnalysis">
        Reintentar
      </button>
    </p>

    <p v-else-if="status === 'unavailable'" class="empty-text">
      {{ unavailableMessage }}
    </p>

    <div v-else-if="market" class="market-report">
      <!-- SITUACIÓN GENERAL -->
      <div v-if="market.general" class="market-block general-block">
        <h4>{{ market.general.headline || 'Situación general' }}</h4>
        <p>{{ market.general.summary }}</p>

        <div v-if="market.general.keyFigures?.length" class="key-figures">
          <div
            v-for="(figure, index) in market.general.keyFigures"
            :key="index"
            class="key-figure"
          >
            <strong>{{ figure.value }}</strong>
            <span>{{ figure.label }}</span>
            <small v-if="figure.period">{{ figure.period }}</small>
          </div>
        </div>

        <ul v-if="market.general.highlights?.length" class="highlights-list">
          <li
            v-for="(highlight, index) in market.general.highlights"
            :key="index"
          >
            {{ highlight }}
          </li>
        </ul>

        <p v-if="market.general.updatedAt" class="market-updated-at">
          Datos generales actualizados:
          {{ formatShortDate(market.general.updatedAt) }}
        </p>
      </div>

      <!-- NOTICIA -->
      <a
        v-if="market.general?.news"
        class="news-card"
        :href="market.general.news.url"
        target="_blank"
        rel="noopener noreferrer"
      >
        <span class="news-icon"><AppIcon name="newspaper" /></span>

        <div class="news-body">
          <span class="news-label">Última noticia</span>
          <strong>{{ market.general.news.title }}</strong>
          <span class="news-meta">
            {{ market.general.news.publisher }}
            <template v-if="market.general.news.publishedAt">
              · {{ formatShortDate(market.general.news.publishedAt) }}
            </template>
          </span>
        </div>

        <AppIcon name="external-link" class="news-external" />
      </a>

      <!-- PROFESIÓN -->
      <div v-if="market.profession" class="market-block profession-block">
        <div class="profession-head">
          <h4>Demanda para {{ market.profession.occupation }}</h4>

          <span
            class="demand-badge"
            :class="getDemandMeta(market.profession.demandLevel).className"
          >
            <AppIcon
              :name="getDemandMeta(market.profession.demandLevel).icon"
            />
            {{ getDemandMeta(market.profession.demandLevel).label }}
          </span>
        </div>

        <p v-if="market.profession.note">{{ market.profession.note }}</p>

        <div
          v-if="market.profession.skillsInDemand?.length"
          class="skill-group"
        >
          <h4>Competencias más demandadas</h4>

          <div class="tag-list">
            <span
              v-for="skill in market.profession.skillsInDemand"
              :key="skill"
              class="skill-tag soft"
            >
              {{ skill }}
            </span>
          </div>
        </div>
      </div>

      <p v-if="!market.general && !market.profession" class="empty-text">
        No hay datos de mercado disponibles para este perfil en este momento.
      </p>
    </div>
  </div>
</template>

<style scoped>
.market-skeleton {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.market-report {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.market-block {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.market-block h4 {
  font-size: 1rem;
}

.market-block p {
  color: var(--color-text-secondary);
  font-size: 0.92rem;
}

.key-figures {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: var(--space-3);
}

.key-figure {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  padding: var(--space-3);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-surface-hover);
}

.key-figure strong {
  font-family: var(--font-display);
  font-size: 1.4rem;
  color: var(--accent-strong);
}

.key-figure span {
  font-size: 0.82rem;
}

.key-figure small {
  font-size: 0.72rem;
  color: var(--color-text-tertiary);
}

.highlights-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.highlights-list li {
  position: relative;
  padding-left: var(--space-4);
  font-size: 0.88rem;
  color: var(--color-text-secondary);
}

.highlights-list li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0.5em;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
}

.market-updated-at {
  font-size: 0.76rem;
  color: var(--color-text-tertiary);
}

.news-card {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-surface-hover);
  transition:
    border-color var(--duration-base) var(--ease-out),
    transform var(--duration-fast) var(--ease-out);
}

@media (hover: hover) and (pointer: fine) {
  .news-card:hover {
    border-color: var(--accent-border);
    transform: translateY(-1px);
  }
}

.news-icon {
  display: inline-flex;
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  background: var(--accent-soft);
  color: var(--accent-strong);
}

.news-body {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  flex: 1;
  min-width: 0;
}

.news-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-tertiary);
}

.news-body strong {
  font-size: 0.92rem;
}

.news-meta {
  font-size: 0.78rem;
  color: var(--color-text-tertiary);
}

.news-external {
  width: 18px;
  height: 18px;
  color: var(--color-text-tertiary);
  flex-shrink: 0;
}

.profession-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.demand-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: 0.35rem 0.8rem;
  border-radius: var(--radius-full);
  font-size: 0.8rem;
  font-weight: 500;
}

.demand-badge svg {
  width: 15px;
  height: 15px;
}

.demand-badge.demand-alta {
  background: var(--score-good-bg);
  color: var(--score-good);
}

.demand-badge.demand-media {
  background: var(--score-warn-bg);
  color: var(--score-warn);
}

.demand-badge.demand-baja {
  background: var(--score-bad-bg);
  color: var(--score-bad);
}

.demand-badge.demand-sin-datos {
  background: var(--color-surface-hover);
  color: var(--color-text-tertiary);
}

.retry-link {
  text-decoration: underline;
  margin-left: var(--space-2);
}
</style>
