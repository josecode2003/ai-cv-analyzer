<script setup>
import { ref, computed, onMounted } from 'vue'

import LoginForm from './components/auth/LoginForm.vue'
import RegisterForm from './components/auth/RegisterForm.vue'
import CVUploader from './components/cv/CVUploader.vue'
import AnalysisDetail from './components/analysis/AnalysisDetail.vue'

import {
  checkApiHealth,
  isAuthenticated
} from './services/api'

import {
  loginUser,
  registerUser,
  getCurrentUser,
  logoutUser
} from './services/authService'

import { uploadCV } from './services/cvService'

import {
  getAnalyses,
  getAnalysisById,
  deleteAnalysis
} from './services/analysisService'

import {
  compareCVWithJobOffer,
  getComparisons,
  getComparisonById,
  deleteComparison
} from './services/comparisonService'


/* =========================================================
   AUTENTICACIÓN
   ========================================================= */

const authMode = ref('login')

const currentUser = ref(null)

const authLoading = ref(false)

const authError = ref('')

const authSuccess = ref('')


/* =========================================================
   APLICACIÓN
   ========================================================= */

const currentView = ref('home')

const apiStatus = ref('checking')


/* =========================================================
   CV
   ========================================================= */

const selectedFile = ref(null)

const errorMessage = ref('')

const uploadStatus = ref('idle')

const uploadMessage = ref('')

const analysis = ref(null)

const currentAnalysisId = ref(null)

const analyses = ref([])

const loadingAnalyses = ref(false)

const loadingAnalysis = ref(false)

const deletingAnalysisId = ref(null)

const analysisError = ref('')

const cvUploader = ref(null)

const MAX_FILE_SIZE = 5 * 1024 * 1024


/* =========================================================
   COMPARACIONES
   ========================================================= */

const comparisons = ref([])

const comparison = ref(null)

const loadingComparisons = ref(false)

const loadingComparison = ref(false)

const creatingComparison = ref(false)

const deletingComparisonId = ref(null)

const comparisonError = ref('')

const comparisonForm = ref({
  jobTitle: '',
  jobOfferText: ''
})


/* =========================================================
   COMPUTED
   ========================================================= */

const isLoggedIn = computed(() => {
  return Boolean(currentUser.value)
})

const analysesCount = computed(() => {
  return analyses.value.length
})

const comparisonsCount = computed(() => {
  return comparisons.value.length
})


/* =========================================================
   API HEALTH
   ========================================================= */

async function checkBackend() {
  try {
    await checkApiHealth()

    apiStatus.value = 'online'
  } catch {
    apiStatus.value = 'offline'
  }
}


/* =========================================================
   SESIÓN
   ========================================================= */

async function restoreSession() {
  if (!isAuthenticated()) {
    return
  }

  try {
    const response = await getCurrentUser()

    currentUser.value = response.user

    await loadAnalyses()
    await loadComparisons()
  } catch (error) {
    console.error(
      'Sesión no válida:',
      error
    )

    currentUser.value = null
  }
}


/* =========================================================
   LOGIN
   ========================================================= */

async function handleLogin(credentials) {
  authError.value = ''
  authSuccess.value = ''
  authLoading.value = true

  try {
    const response = await loginUser({
      email: credentials.email,
      password: credentials.password
    })

    currentUser.value = response.user

    authSuccess.value =
      'Sesión iniciada correctamente.'

    currentView.value = 'home'

    await loadAnalyses()
    await loadComparisons()
  } catch (error) {
    console.error(
      'Error iniciando sesión:',
      error
    )

    authError.value =
      error.message ||
      'No se pudo iniciar sesión.'
  } finally {
    authLoading.value = false
  }
}


/* =========================================================
   REGISTRO
   ========================================================= */

async function handleRegister(credentials) {
  authError.value = ''
  authSuccess.value = ''
  authLoading.value = true

  try {
    const response = await registerUser({
      name: credentials.name,
      email: credentials.email,
      password: credentials.password
    })

    currentUser.value = response.user

    authSuccess.value =
      'Cuenta creada correctamente.'

    currentView.value = 'home'

    await loadAnalyses()
    await loadComparisons()
  } catch (error) {
    console.error(
      'Error registrando usuario:',
      error
    )

    authError.value =
      error.message ||
      'No se pudo crear la cuenta.'
  } finally {
    authLoading.value = false
  }
}


/* =========================================================
   LOGOUT
   ========================================================= */

function handleLogout() {
  logoutUser()

  currentUser.value = null

  currentView.value = 'home'

  selectedFile.value = null

  analysis.value = null

  currentAnalysisId.value = null

  analyses.value = []

  comparisons.value = []

  comparison.value = null

  uploadStatus.value = 'idle'

  uploadMessage.value = ''

  errorMessage.value = ''

  analysisError.value = ''

  comparisonError.value = ''

  authError.value = ''

  authSuccess.value = ''
}


/* =========================================================
   CAMBIAR LOGIN / REGISTRO
   ========================================================= */

function showLogin() {
  authMode.value = 'login'

  authError.value = ''

  authSuccess.value = ''
}

function showRegister() {
  authMode.value = 'register'

  authError.value = ''

  authSuccess.value = ''
}


/* =========================================================
   CARGAR ANÁLISIS
   ========================================================= */

async function loadAnalyses() {
  if (!currentUser.value) {
    return
  }

  loadingAnalyses.value = true

  analysisError.value = ''

  try {
    const response = await getAnalyses()

    analyses.value =
      response.analyses || []
  } catch (error) {
    console.error(
      'Error cargando análisis:',
      error
    )

    analysisError.value =
      error.message ||
      'No se pudieron cargar los análisis.'
  } finally {
    loadingAnalyses.value = false
  }
}


/* =========================================================
   CARGAR COMPARACIONES
   ========================================================= */

async function loadComparisons() {
  if (!currentUser.value) {
    return
  }

  loadingComparisons.value = true

  comparisonError.value = ''

  try {
    const response =
      await getComparisons()

    comparisons.value =
      response.comparisons || []
  } catch (error) {
    console.error(
      'Error cargando comparaciones:',
      error
    )

    comparisonError.value =
      error.message ||
      'No se pudieron cargar las comparaciones.'
  } finally {
    loadingComparisons.value = false
  }
}


/* =========================================================
   NAVEGACIÓN
   ========================================================= */

function goHome() {
  currentView.value = 'home'

  analysis.value = null

  currentAnalysisId.value = null

  comparison.value = null

  selectedFile.value = null

  errorMessage.value = ''

  uploadMessage.value = ''

  uploadStatus.value = 'idle'

  analysisError.value = ''

  comparisonError.value = ''
}


async function goToAnalyses() {
  if (!isLoggedIn.value) {
    return
  }

  currentView.value = 'analyses'

  analysis.value = null

  currentAnalysisId.value = null

  comparison.value = null

  await loadAnalyses()
}


async function goToComparisons() {
  if (!isLoggedIn.value) {
    return
  }

  currentView.value = 'comparisons'

  analysis.value = null

  currentAnalysisId.value = null

  comparison.value = null

  await loadComparisons()
}


function analyzeAnotherCV() {
  currentView.value = 'home'

  analysis.value = null

  currentAnalysisId.value = null

  selectedFile.value = null

  errorMessage.value = ''

  uploadMessage.value = ''

  uploadStatus.value = 'idle'
}


/* =========================================================
   SELECCIONAR CV
   ========================================================= */

function handleFile(event) {
  const file = event.target.files[0]

  selectedFile.value = null

  errorMessage.value = ''

  uploadMessage.value = ''

  uploadStatus.value = 'idle'

  analysis.value = null

  currentAnalysisId.value = null

  if (!file) {
    return
  }

  if (file.type !== 'application/pdf') {
    errorMessage.value =
      'El archivo debe estar en formato PDF.'

    return
  }

  if (file.size > MAX_FILE_SIZE) {
    errorMessage.value =
      'El archivo no puede superar los 5 MB.'

    return
  }

  selectedFile.value = file
}


/* =========================================================
   ANALIZAR CV
   ========================================================= */

async function uploadSelectedCV(file) {
  if (!file) {
    return
  }

  uploadStatus.value = 'uploading'

  uploadMessage.value = ''

  errorMessage.value = ''

  analysis.value = null

  currentAnalysisId.value = null

  try {
    const response = await uploadCV(file)

    uploadStatus.value = 'success'

    uploadMessage.value =
      response.message

    analysis.value =
      response.analysis

    cvUploader.value?.setUploadState({
      status: 'success',
      message: response.message
    })

    await loadAnalyses()
  } catch (error) {
    console.error(
      'Error analizando CV:',
      error
    )

    uploadStatus.value = 'error'

    uploadMessage.value =
      error.message ||
      'No se pudo analizar el CV.'

    cvUploader.value?.setUploadState({
      status: 'error',
      message:
        error.message ||
        'No se pudo analizar el CV.'
    })
  }
}


/* =========================================================
   ELIMINAR ARCHIVO
   ========================================================= */

function removeFile() {
  selectedFile.value = null

  errorMessage.value = ''

  uploadMessage.value = ''

  uploadStatus.value = 'idle'
}


/* =========================================================
   ABRIR ANÁLISIS
   ========================================================= */

async function openAnalysis(id) {
  currentAnalysisId.value = id

  loadingAnalysis.value = true

  analysisError.value = ''

  currentView.value = 'analysis'

  analysis.value = null

  try {
    const response =
      await getAnalysisById(id)

    analysis.value =
      response.analysis.analysis
  } catch (error) {
    console.error(
      'Error obteniendo análisis:',
      error
    )

    analysisError.value =
      error.message ||
      'No se pudo cargar el análisis.'
  } finally {
    loadingAnalysis.value = false
  }
}


/* =========================================================
   ELIMINAR ANÁLISIS
   ========================================================= */

async function removeAnalysis(id) {
  const confirmed = window.confirm(
    '¿Seguro que quieres eliminar este análisis?'
  )

  if (!confirmed) {
    return
  }

  deletingAnalysisId.value = id

  analysisError.value = ''

  try {
    await deleteAnalysis(id)

    await loadAnalyses()

    if (currentView.value === 'analysis') {
      currentView.value = 'analyses'

      analysis.value = null

      currentAnalysisId.value = null
    }
  } catch (error) {
    console.error(
      'Error eliminando análisis:',
      error
    )

    analysisError.value =
      error.message ||
      'No se pudo eliminar el análisis.'
  } finally {
    deletingAnalysisId.value = null
  }
}


/* =========================================================
   ABRIR FORMULARIO DE COMPARACIÓN
   ========================================================= */

function openComparisonForm() {
  if (
    !analysis.value ||
    !currentAnalysisId.value
  ) {
    comparisonError.value =
      'No se ha seleccionado un CV válido.'

    return
  }

  comparison.value = null

  comparisonError.value = ''

  comparisonForm.value = {
    jobTitle: '',
    jobOfferText: ''
  }

  currentView.value = 'comparison'
}


/* =========================================================
   CREAR COMPARACIÓN
   ========================================================= */

async function submitComparison() {
  if (!analysis.value) {
    comparisonError.value =
      'No hay un CV seleccionado para comparar.'

    return
  }

  const jobTitle =
    comparisonForm.value.jobTitle.trim()

  const jobOfferText =
    comparisonForm.value.jobOfferText.trim()

  if (!jobOfferText) {
    comparisonError.value =
      'Pega la oferta de empleo antes de continuar.'

    return
  }

  if (jobOfferText.length < 50) {
    comparisonError.value =
      'La oferta debe tener al menos 50 caracteres.'

    return
  }

  if (jobOfferText.length > 30000) {
    comparisonError.value =
      'La oferta no puede superar los 30.000 caracteres.'

    return
  }

  if (jobTitle.length > 255) {
    comparisonError.value =
      'El título no puede superar los 255 caracteres.'

    return
  }

  if (!currentAnalysisId.value) {
    comparisonError.value =
      'No se ha podido identificar el CV seleccionado.'

    return
  }

  creatingComparison.value = true

  comparisonError.value = ''

  comparison.value = null

  try {
    const response =
      await compareCVWithJobOffer({
        cvId: currentAnalysisId.value,
        jobTitle,
        jobOfferText
      })

    comparison.value =
      response.comparison

    currentView.value =
      'comparison-result'

    try {
      await loadComparisons()
    } catch (historyError) {
      console.error(
        'La comparación se creó, pero no se pudo actualizar el historial:',
        historyError
      )
    }
  } catch (error) {
    console.error(
      'Error comparando CV:',
      error
    )

    comparisonError.value =
      error.message ||
      'No se pudo comparar el CV con la oferta.'
  } finally {
    creatingComparison.value = false
  }
}


/* =========================================================
   ABRIR COMPARACIÓN GUARDADA
   ========================================================= */

async function openSavedComparison(id) {
  loadingComparison.value = true

  comparisonError.value = ''

  comparison.value = null

  currentView.value =
    'comparison-result'

  try {
    const response =
      await getComparisonById(id)

    comparison.value =
      response.comparison
  } catch (error) {
    console.error(
      'Error obteniendo comparación:',
      error
    )

    comparisonError.value =
      error.message ||
      'No se pudo cargar la comparación.'
  } finally {
    loadingComparison.value = false
  }
}


/* =========================================================
   ELIMINAR COMPARACIÓN
   ========================================================= */

async function removeComparison(id) {
  const confirmed = window.confirm(
    '¿Seguro que quieres eliminar esta comparación?'
  )

  if (!confirmed) {
    return
  }

  deletingComparisonId.value = id

  comparisonError.value = ''

  try {
    await deleteComparison(id)

    await loadComparisons()

    if (
      currentView.value ===
      'comparison-result'
    ) {
      currentView.value =
        'comparisons'

      comparison.value = null
    }
  } catch (error) {
    console.error(
      'Error eliminando comparación:',
      error
    )

    comparisonError.value =
      error.message ||
      'No se pudo eliminar la comparación.'
  } finally {
    deletingComparisonId.value = null
  }
}


/* =========================================================
   VOLVER A UNA VISTA
   ========================================================= */

function backToAnalysis() {
  currentView.value = 'analysis'
}


function backToComparisons() {
  currentView.value = 'comparisons'

  comparison.value = null
}


/* =========================================================
   UTILIDADES
   ========================================================= */

function getScoreClass(score) {
  if (score >= 80) {
    return 'score-excellent'
  }

  if (score >= 60) {
    return 'score-good'
  }

  if (score >= 40) {
    return 'score-medium'
  }

  return 'score-low'
}


function getPriorityClass(priority) {
  if (priority === 'high') {
    return 'priority-high'
  }

  if (priority === 'medium') {
    return 'priority-medium'
  }

  return 'priority-low'
}


function getPriorityText(priority) {
  if (priority === 'high') {
    return 'Prioridad alta'
  }

  if (priority === 'medium') {
    return 'Prioridad media'
  }

  return 'Prioridad baja'
}


function formatFileSize(size) {
  return (
    size /
    1024 /
    1024
  ).toFixed(2)
}


function formatDate(date) {
  if (!date) {
    return ''
  }

  try {
    return new Intl.DateTimeFormat(
      'es-ES',
      {
        dateStyle: 'medium',
        timeStyle: 'short'
      }
    ).format(
      new Date(date)
    )
  } catch {
    return date
  }
}


function formatComparisonScore(score) {
  if (
    typeof score !==
    'number'
  ) {
    return 0
  }

  return Math.round(score)
}


/* =========================================================
   INICIO
   ========================================================= */

onMounted(async () => {
  await checkBackend()

  await restoreSession()
})
</script>

<template>

  <div class="app">

```
<!-- =====================================================
     AUTH
     ===================================================== -->

<section
  v-if="!isLoggedIn"
  class="auth-page"
>

  <div class="auth-card">

    <div class="auth-brand">

      <div class="auth-logo">
        AI
      </div>

      <h1>
        CV Analyzer
      </h1>

      <p>
        Analiza y compara tu CV con ofertas de empleo.
      </p>

    </div>


    <!-- LOGIN -->

    <LoginForm
      v-if="authMode === 'login'"
      @login="handleLogin"
      @show-register="showRegister"
    />


    <!-- REGISTER -->

    <RegisterForm
      v-else
      @register="handleRegister"
      @show-login="showLogin"
    />

  </div>

</section>


<!-- =====================================================
     APP AUTENTICADA
     ===================================================== -->

<template v-else>

  <header class="header">

    <button
      class="logo"
      @click="goHome"
    >

      <span class="logo-icon">
        AI
      </span>

      <span>
        CV Analyzer
      </span>

    </button>


    <nav class="navigation">

      <button
        :class="{
          active:
            currentView === 'home'
        }"
        @click="goHome"
      >
        Inicio
      </button>


      <button
        :class="{
          active:
            currentView === 'analyses' ||
            currentView === 'analysis' ||
            currentView === 'comparison'
        }"
        @click="goToAnalyses"
      >

        Mis análisis

        <span
          v-if="analysesCount"
          class="nav-count"
        >
          {{ analysesCount }}
        </span>

      </button>


      <button
        :class="{
          active:
            currentView === 'comparisons' ||
            currentView === 'comparison-result'
        }"
        @click="goToComparisons"
      >

        Comparaciones

        <span
          v-if="comparisonsCount"
          class="nav-count"
        >
          {{ comparisonsCount }}
        </span>

      </button>

    </nav>


    <div class="header-user">

      <div class="api-status">

        <span
          class="status-dot"
          :class="apiStatus"
        ></span>

        <span>
          {{
            apiStatus === 'online'
              ? 'API conectada'
              : apiStatus === 'offline'
                ? 'API desconectada'
                : 'Conectando...'
          }}
        </span>

      </div>


      <div class="user-info">

        <span>
          Hola,
        </span>

        <strong>
          {{ currentUser.name }}
        </strong>

      </div>


      <button
        class="logout-button"
        @click="handleLogout"
      >
        Cerrar sesión
      </button>

    </div>

  </header>


  <main class="main">


    <!-- =================================================
         HOME
         ================================================= -->

    <section
      v-if="currentView === 'home'"
      class="home-page"
    >

      <div class="hero">

        <span class="badge">
          IA para tu carrera profesional
        </span>


        <h1>
          Analiza tu CV con

          <span class="highlight">
            Inteligencia Artificial
          </span>
        </h1>


        <p class="description">

          Analiza tus habilidades, experiencia y formación.
          Comprueba tu compatibilidad con una oferta de empleo
          y descubre qué puedes mejorar.

        </p>

        <CVUploader
          ref="cvUploader"
          @upload="uploadSelectedCV"
        />


        <div
          v-if="analyses.length"
          class="recent-analysis"
        >

          <div class="recent-header">

            <div>

              <span>
                ÚLTIMO ANÁLISIS
              </span>

              <h3>
                {{ analyses[0].candidate_name }}
              </h3>

            </div>


            <button
              class="secondary-button"
              @click="goToAnalyses"
            >
              Ver todos
            </button>

          </div>


          <div class="recent-card">

            <div class="recent-file-icon">
              📄
            </div>


            <div class="recent-info">

              <strong>
                {{ analyses[0].original_filename }}
              </strong>

              <span>
                {{ analyses[0].profile }}
              </span>

              <small>
                {{
                  formatDate(
                    analyses[0].created_at
                  )
                }}
              </small>

            </div>


            <div
              class="mini-score"
              :class="
                getScoreClass(
                  analyses[0].score
                )
              "
            >
              {{ analyses[0].score }}
            </div>


            <button
              class="view-button"
              @click="
                openAnalysis(
                  analyses[0].id
                )
              "
            >
              Ver
            </button>

          </div>

        </div>

      </div>

    </section>


    <!-- =================================================
         MIS ANÁLISIS
         ================================================= -->

    <section
      v-else-if="
        currentView === 'analyses'
      "
      class="analyses-page"
    >

      <div class="page-heading">

        <div>

          <span class="badge">
            Historial
          </span>

          <h1>
            Mis análisis
          </h1>

          <p>
            Todos tus CV analizados y guardados en PostgreSQL.
          </p>

        </div>


        <button
          class="primary-button"
          @click="analyzeAnotherCV"
        >
          + Analizar nuevo CV
        </button>

      </div>


      <div
        v-if="analysisError"
        class="error-message page-error"
      >
        {{ analysisError }}
      </div>


      <div
        v-if="loadingAnalyses"
        class="loading-state"
      >

        <div class="loading-spinner"></div>

        <p>
          Cargando tus análisis...
        </p>

      </div>


      <div
        v-else-if="
          analyses.length === 0
        "
        class="empty-state"
      >

        <div class="empty-icon">
          📊
        </div>

        <h2>
          Todavía no tienes análisis
        </h2>

        <p>
          Analiza tu primer CV y aparecerá aquí automáticamente.
        </p>

        <button
          class="primary-button"
          @click="analyzeAnotherCV"
        >
          Analizar mi primer CV
        </button>

      </div>


      <div
        v-else
        class="analyses-list"
      >

        <article
          v-for="item in analyses"
          :key="item.id"
          class="analysis-history-card"
        >

          <div class="history-file-icon">
            📄
          </div>


          <div class="history-info">

            <h3>
              {{
                item.candidate_name ||
                'Candidato sin nombre'
              }}
            </h3>


            <strong>
              {{ item.original_filename }}
            </strong>


            <span>
              {{
                item.profile ||
                'Perfil no indicado'
              }}
            </span>


            <small>
              {{
                item.level ||
                'Nivel no indicado'
              }}

              ·

              {{
                formatDate(
                  item.created_at
                )
              }}
            </small>

          </div>


          <div class="history-score">

            <span>
              CV Score
            </span>

            <strong
              :class="
                getScoreClass(
                  item.score
                )
              "
            >
              {{ item.score ?? 0 }}
            </strong>

            <small>
              /100
            </small>

          </div>


          <div class="history-actions">

            <button
              class="view-button"
              :disabled="loadingAnalysis"
              @click="
                openAnalysis(
                  item.id
                )
              "
            >
              Ver análisis
            </button>


            <button
              class="delete-button"
              :disabled="
                deletingAnalysisId ===
                item.id
              "
              @click="
                removeAnalysis(
                  item.id
                )
              "
            >

              {{
                deletingAnalysisId ===
                item.id
                  ? 'Eliminando...'
                  : 'Eliminar'
              }}

            </button>

          </div>

        </article>

      </div>

    </section>


    <!-- =================================================
         ANÁLISIS
         ================================================= -->

    <section
      v-else-if="
        currentView === 'analysis'
      "
      class="analysis-page"
    >

      <div class="analysis-page-header">

        <button
          class="back-button"
          @click="goToAnalyses"
        >
          ← Volver a Mis análisis
        </button>

      </div>


      <div
        v-if="loadingAnalysis"
        class="loading-state"
      >

        <div class="loading-spinner"></div>

        <p>
          Recuperando análisis...
        </p>

      </div>


      <div
        v-else-if="analysisError"
        class="error-message page-error"
      >
        {{ analysisError }}
      </div>


      <AnalysisDetail
        v-else-if="analysis"
        :analysis="analysis"
        @back="goToAnalyses"
        @compare="openComparisonForm"
        @analyze-another="analyzeAnotherCV"
      />

    </section>


    <!-- =================================================
         COMPARAR CV CON OFERTA
         ================================================= -->

    <section
      v-else-if="
        currentView === 'comparison'
      "
      class="comparison-page"
    >

      <div class="page-heading">

        <div>

          <button
            class="back-button"
            @click="backToAnalysis"
          >
            ← Volver al análisis
          </button>


          <span class="badge">
            Comparación inteligente
          </span>


          <h1>
            Compara tu CV con una oferta
          </h1>


          <p>
            La IA analizará el nivel de compatibilidad entre
            tu CV y los requisitos de la oferta.
          </p>

        </div>

      </div>


      <div class="comparison-form-card">

        <div class="comparison-selected-cv">

          <div class="selected-cv-icon">
            📄
          </div>


          <div>

            <span>
              CV seleccionado
            </span>

            <strong>
              {{
                analysis?.personalInfo?.name ||
                'CV actual'
              }}
            </strong>

          </div>

        </div>


        <form
          class="comparison-form"
          @submit.prevent="submitComparison"
        >

          <div class="form-group">

            <label>
              Título del puesto

              <span>
                Opcional
              </span>
            </label>


            <input
              v-model="
                comparisonForm.jobTitle
              "
              type="text"
              maxlength="255"
              placeholder="Ej. Desarrollador Web Junior"
            />

          </div>


          <div class="form-group">

            <div class="textarea-label">

              <label>
                Oferta de empleo
              </label>

              <span>
                {{ comparisonForm.jobOfferText.length }}/30.000
              </span>

            </div>


            <textarea
              v-model="
                comparisonForm.jobOfferText
              "
              rows="14"
              maxlength="30000"
              placeholder="Pega aquí el texto completo de la oferta de empleo..."
            ></textarea>

          </div>


          <div
            v-if="comparisonError"
            class="error-message"
          >
            {{ comparisonError }}
          </div>


          <button
            type="submit"
            class="primary-button comparison-submit"
            :disabled="creatingComparison"
          >

            {{
              creatingComparison
                ? 'Comparando con IA...'
                : 'Comparar CV con oferta'
            }}

          </button>

        </form>

      </div>

    </section>


    <!-- =================================================
         RESULTADO COMPARACIÓN
         ================================================= -->

    <section
      v-else-if="
        currentView === 'comparison-result'
      "
      class="comparison-page"
    >

      <div class="analysis-page-header">

        <button
          class="back-button"
          @click="backToComparisons"
        >
          ← Volver a comparaciones
        </button>

      </div>


      <div
        v-if="loadingComparison"
        class="loading-state"
      >

        <div class="loading-spinner"></div>

        <p>
          Recuperando comparación...
        </p>

      </div>


      <div
        v-else-if="comparisonError"
        class="error-message page-error"
      >
        {{ comparisonError }}
      </div>


      <div
        v-else-if="comparison"
        class="comparison-result"
      >

        <div class="comparison-result-header">

          <div>

            <span class="badge">
              Comparación completada
            </span>


            <h1>
              {{
                comparison.job_title ||
                'Comparación de CV'
              }}
            </h1>


            <p>
              Comparación realizada con tu CV guardado.
            </p>

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

            <span>
              Compatibilidad
            </span>


            <strong>
              {{
                formatComparisonScore(
                  comparison.compatibility_score ??
                  comparison.result?.compatibilityScore
                )
              }}
            </strong>


            <small>
              /100
            </small>

          </div>

        </div>


        <div
          v-if="
            comparison.result?.summary
          "
          class="comparison-summary"
        >

          <span>
            RESUMEN
          </span>


          <p>
            {{ comparison.result.summary }}
          </p>

        </div>


        <div class="comparison-grid">


          <!-- MATCHING -->

          <div class="comparison-section comparison-success">

            <div class="comparison-section-header">

              <span class="comparison-section-icon">
                ✅
              </span>

              <div>

                <h3>
                  Habilidades coincidentes
                </h3>

                <p>
                  Lo que tu CV ya cubre.
                </p>

              </div>

            </div>


            <div
              v-if="
                comparison.result?.matchingSkills?.length
              "
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


            <p
              v-else
              class="empty-text"
            >
              No se han detectado coincidencias explícitas.
            </p>

          </div>


          <!-- MISSING -->

          <div class="comparison-section comparison-warning">

            <div class="comparison-section-header">

              <span class="comparison-section-icon">
                ⚠️
              </span>

              <div>

                <h3>
                  Habilidades faltantes
                </h3>

                <p>
                  Requisitos no encontrados explícitamente.
                </p>

              </div>

            </div>


            <div
              v-if="
                comparison.result?.missingSkills?.length
              "
              class="tag-list"
            >

              <span
                v-for="skill in comparison.result.missingSkills"
                :key="skill"
                class="comparison-tag warning"
              >
                {{ skill }}
              </span>

            </div>


            <p
              v-else
              class="empty-text"
            >
              No se han detectado habilidades faltantes.
            </p>

          </div>


          <!-- STRENGTHS -->

          <div class="comparison-section">

            <div class="comparison-section-header">

              <span class="comparison-section-icon">
                💪
              </span>

              <div>

                <h3>
                  Fortalezas
                </h3>

                <p>
                  Aspectos que juegan a favor del candidato.
                </p>

              </div>

            </div>


            <ul
              v-if="
                comparison.result?.strengths?.length
              "
              class="comparison-list"
            >

              <li
                v-for="strength in comparison.result.strengths"
                :key="strength"
              >
                {{ strength }}
              </li>

            </ul>

          </div>


          <!-- GAPS -->

          <div class="comparison-section">

            <div class="comparison-section-header">

              <span class="comparison-section-icon">
                📌
              </span>

              <div>

                <h3>
                  Brechas
                </h3>

                <p>
                  Factores que reducen la compatibilidad.
                </p>

              </div>

            </div>


            <ul
              v-if="
                comparison.result?.gaps?.length
              "
              class="comparison-list"
            >

              <li
                v-for="gap in comparison.result.gaps"
                :key="gap"
              >
                {{ gap }}
              </li>

            </ul>

          </div>


          <!-- KEYWORDS -->

          <div class="comparison-section full-width">

            <div class="comparison-section-header">

              <span class="comparison-section-icon">
                🔑
              </span>

              <div>

                <h3>
                  Keywords detectadas
                </h3>

                <p>
                  Términos relevantes de la oferta.
                </p>

              </div>

            </div>


            <div
              v-if="
                comparison.result?.keywords?.length
              "
              class="tag-list"
            >

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

          <div
            class="comparison-section full-width recommendation-section"
          >

            <div class="comparison-section-header">

              <span class="comparison-section-icon">
                🚀
              </span>

              <div>

                <h3>
                  Recomendaciones
                </h3>

                <p>
                  Qué puedes mejorar para esta candidatura.
                </p>

              </div>

            </div>


            <div
              v-if="
                comparison.result?.recommendations?.length
              "
              class="recommendation-list"
            >

              <div
                v-for="(
                  recommendation,
                  index
                ) in comparison.result.recommendations"
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

          <button
            class="secondary-button"
            @click="backToComparisons"
          >
            ← Mis comparaciones
          </button>


          <button
            class="primary-button"
            @click="openComparisonForm"
          >
            Comparar de nuevo
          </button>

        </div>

      </div>

    </section>


    <!-- =================================================
         MIS COMPARACIONES
         ================================================= -->

    <section
      v-else-if="
        currentView === 'comparisons'
      "
      class="comparisons-page"
    >

      <div class="page-heading">

        <div>

          <span class="badge">
            Matching inteligente
          </span>

          <h1>
            Mis comparaciones
          </h1>

          <p>
            Historial de compatibilidad entre tus CV y ofertas.
          </p>

        </div>


        <button
          class="primary-button"
          @click="goToAnalyses"
        >
          Ver mis CV
        </button>

      </div>


      <div
        v-if="comparisonError"
        class="error-message page-error"
      >
        {{ comparisonError }}
      </div>


      <div
        v-if="loadingComparisons"
        class="loading-state"
      >

        <div class="loading-spinner"></div>

        <p>
          Cargando comparaciones...
        </p>

      </div>


      <div
        v-else-if="
          comparisons.length === 0
        "
        class="empty-state"
      >

        <div class="empty-icon">
          🎯
        </div>

        <h2>
          Todavía no tienes comparaciones
        </h2>

        <p>
          Abre uno de tus CV y compáralo con una oferta de empleo.
        </p>

        <button
          class="primary-button"
          @click="goToAnalyses"
        >
          Ir a mis análisis
        </button>

      </div>


      <div
        v-else
        class="comparisons-list"
      >

        <article
          v-for="item in comparisons"
          :key="item.id"
          class="comparison-history-card"
        >

          <div class="comparison-history-icon">
            🎯
          </div>


          <div class="comparison-history-info">

            <span>
              {{
                item.job_title ||
                'Oferta sin título'
              }}
            </span>


            <strong>
              CV #{{ item.cv_analysis_id }}
            </strong>


            <small>
              {{
                formatDate(
                  item.created_at
                )
              }}
            </small>

          </div>


          <div
            class="comparison-history-score"
            :class="
              getScoreClass(
                item.compatibility_score
              )
            "
          >

            <span>
              Compatibilidad
            </span>

            <strong>
              {{ item.compatibility_score }}
            </strong>

            <small>
              /100
            </small>

          </div>


          <div class="history-actions">

            <button
              class="view-button"
              :disabled="
                loadingComparison
              "
              @click="
                openSavedComparison(
                  item.id
                )
              "
            >
              Ver
            </button>


            <button
              class="delete-button"
              :disabled="
                deletingComparisonId ===
                item.id
              "
              @click="
                removeComparison(
                  item.id
                )
              "
            >

              {{
                deletingComparisonId ===
                item.id
                  ? 'Eliminando...'
                  : 'Eliminar'
              }}

            </button>

          </div>

        </article>

      </div>

    </section>


  </main>


  <footer class="footer">

    <p>
      AI CV Analyzer · Proyecto de portfolio
    </p>

  </footer>

</template>
```

  </div>

</template>
