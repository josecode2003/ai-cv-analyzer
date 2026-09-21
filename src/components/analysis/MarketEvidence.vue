<script setup>
import { getConfidenceLabel, getConfidenceClass } from '@/utils/format'

const props = defineProps({
  confidence: {
    type: String,
    default: 'sin_datos_suficientes'
  },
  source: {
    type: String,
    default: ''
  },
  sourceUrl: {
    type: String,
    default: ''
  },
  dataDate: {
    type: String,
    default: ''
  }
})
</script>

<template>
  <div class="market-evidence" :class="getConfidenceClass(props.confidence)">
    <span class="confidence-tag">
      {{ getConfidenceLabel(props.confidence) }}
    </span>

    <span v-if="props.source" class="evidence-source">
      Fuente:

      <a
        v-if="props.sourceUrl"
        :href="props.sourceUrl"
        target="_blank"
        rel="noopener noreferrer"
      >
        {{ props.source }}
      </a>

      <template v-else>
        {{ props.source }}
      </template>
    </span>

    <span v-if="props.dataDate" class="evidence-date">
      Fecha: {{ props.dataDate }}
    </span>
  </div>
</template>
