import { reactive, computed } from 'vue'

import { checkApiHealth } from '../services/api'
import { getAnalyses } from '../services/analysisService'
import { getComparisons } from '../services/comparisonService'

/*
 * Store de sesión ligero, sin dependencias externas
 * (Pinia/Vuex). Un objeto reactive a nivel de módulo
 * actúa como singleton compartido por toda la app.
 *
 * No hay login ni registro: el backend identifica al
 * visitante mediante una sesión anónima por cookie, así
 * que los análisis y comparaciones se cargan directamente.
 */

const state = reactive({
  apiStatus: 'checking',
  analyses: [],
  comparisons: [],
  loadingAnalyses: false,
  loadingComparisons: false,
  analysisError: '',
  comparisonError: ''
})

const analysesCount = computed(() => state.analyses.length)
const comparisonsCount = computed(() => state.comparisons.length)

async function checkBackend() {
  try {
    await checkApiHealth()
    state.apiStatus = 'online'
  } catch {
    state.apiStatus = 'offline'
  }
}

async function loadAnalyses() {
  state.loadingAnalyses = true
  state.analysisError = ''

  try {
    const response = await getAnalyses()
    state.analyses = response.analyses || []
  } catch (error) {
    console.error('Error cargando análisis:', error)
    state.analysisError = error.message || 'No se pudieron cargar los análisis.'
  } finally {
    state.loadingAnalyses = false
  }
}

async function loadComparisons() {
  state.loadingComparisons = true
  state.comparisonError = ''

  try {
    const response = await getComparisons()
    state.comparisons = response.comparisons || []
  } catch (error) {
    console.error('Error cargando comparaciones:', error)
    state.comparisonError =
      error.message || 'No se pudieron cargar las comparaciones.'
  } finally {
    state.loadingComparisons = false
  }
}

export function useSession() {
  return {
    state,
    analysesCount,
    comparisonsCount,
    checkBackend,
    loadAnalyses,
    loadComparisons
  }
}
