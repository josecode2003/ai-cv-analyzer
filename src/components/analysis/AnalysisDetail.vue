<script setup>
import { computed } from 'vue'

import MarketAnalysis from './MarketAnalysis.vue'
import ScoreGauge from './ScoreGauge.vue'
import ScoreMeter from './ScoreMeter.vue'
import AppIcon from '@/components/icons/AppIcon.vue'
import { getPriorityClass, getPriorityText } from '@/utils/format'

const props = defineProps({
  analysis: {
    type: Object,
    required: true
  },
  cvId: {
    type: [String, Number],
    required: true
  }
})

const emit = defineEmits(['back', 'compare', 'analyze-another'])

/* =========================================================
   SCORE
   ========================================================= */

const overallScore = computed(() => {
  return props.analysis?.score?.overall ?? 0
})

const scoreBreakdown = computed(() => [
  {
    key: 'experience',
    label: 'Experiencia',
    score: props.analysis?.score?.experience ?? 0
  },
  { key: 'skills', label: 'Skills', score: props.analysis?.score?.skills ?? 0 },
  {
    key: 'education',
    label: 'Educación',
    score: props.analysis?.score?.education ?? 0
  },
  {
    key: 'projects',
    label: 'Logros',
    score: props.analysis?.score?.projects ?? 0
  },
  {
    key: 'presentation',
    label: 'Presentación',
    score: props.analysis?.score?.presentation ?? 0
  }
])

/* =========================================================
   PERFIL PROFESIONAL DETECTADO
   ========================================================= */

// `detectedProfiles` es nuevo en el backend. Los análisis antiguos guardados
// solo tienen `occupation`/`sector` sueltos: se normalizan aquí a la misma
// forma para no tener que ramificar el resto del componente por versión de dato.
const profileEntries = computed(() => {
  const profile = props.analysis?.professionalProfile

  if (!profile) {
    return []
  }

  if (profile.detectedProfiles?.length) {
    return profile.detectedProfiles
  }

  if (profile.occupation) {
    return [
      {
        occupation: profile.occupation,
        sector: profile.sector,
        relevance: 'primary'
      }
    ]
  }

  return []
})

const profileType = computed(() => {
  const explicitType = props.analysis?.professionalProfile?.profileType

  if (explicitType) {
    return explicitType
  }

  if (profileEntries.value.length >= 3) {
    return 'multi'
  }

  if (profileEntries.value.length === 2) {
    return 'hybrid'
  }

  return 'single'
})

const primaryProfile = computed(
  () =>
    profileEntries.value.find(entry => entry.relevance === 'primary') ||
    profileEntries.value[0]
)

const secondaryProfiles = computed(() =>
  profileEntries.value.filter(entry => entry !== primaryProfile.value)
)

/* =========================================================
   ACCIONES
   ========================================================= */

function goBack() {
  emit('back')
}

function compareCV() {
  emit('compare')
}

function analyzeAnother() {
  emit('analyze-another')
}
</script>

<template>
  <div class="analysis-preview">
    <!-- =====================================================
     CABECERA
     ===================================================== -->

    <div class="analysis-header">
      <div>
        <span class="badge"> Análisis completado </span>

        <h2>
          {{ analysis.personalInfo?.name || 'CV analizado' }}
        </h2>

        <p>
          {{ analysis.summary || 'No se ha generado un resumen para este CV.' }}
        </p>
      </div>

      <div class="score-card">
        <span class="score-label"> Puntuación global </span>

        <ScoreGauge :score="overallScore" />
      </div>
    </div>

    <!-- =====================================================
     VALORACIÓN GENERAL
     ===================================================== -->

    <div v-if="analysis.overallAssessment" class="assessment-card">
      <div>
        <span class="assessment-label"> PERFIL DETECTADO </span>

        <h3>
          {{ analysis.overallAssessment.profile || 'Perfil no determinado' }}
        </h3>

        <p>
          Nivel:

          <strong>
            {{ analysis.overallAssessment.level || 'No indicado' }}
          </strong>
        </p>
      </div>

      <div
        class="priority-badge"
        :class="getPriorityClass(analysis.overallAssessment.priority)"
      >
        {{ getPriorityText(analysis.overallAssessment.priority) }}
      </div>
    </div>

    <!-- =====================================================
     PRINCIPAL ASPECTO A MEJORAR
     ===================================================== -->

    <div v-if="analysis.overallAssessment?.mainIssue" class="main-issue-card">
      <span> PRINCIPAL ASPECTO A MEJORAR </span>

      <h3>
        {{ analysis.overallAssessment.mainIssue }}
      </h3>
    </div>

    <!-- =====================================================
     PUNTUACIONES
     ===================================================== -->

    <div class="score-meters">
      <ScoreMeter
        v-for="item in scoreBreakdown"
        :key="item.key"
        :label="item.label"
        :score="item.score"
      />
    </div>

    <!-- =====================================================
     INFORMACIÓN PERSONAL
     ===================================================== -->

    <div class="analysis-section">
      <div class="section-heading">
        <span class="section-icon"><AppIcon name="user" /></span>
        <h3>Información personal</h3>
      </div>

      <div class="info-grid">
        <div>
          <span>Nombre</span>

          <strong>
            {{ analysis.personalInfo?.name || 'No indicado' }}
          </strong>
        </div>

        <div>
          <span>Email</span>

          <strong>
            {{ analysis.personalInfo?.email || 'No indicado' }}
          </strong>
        </div>

        <div>
          <span>Teléfono</span>

          <strong>
            {{ analysis.personalInfo?.phone || 'No indicado' }}
          </strong>
        </div>

        <div>
          <span>Ubicación</span>

          <strong>
            {{ analysis.personalInfo?.location || 'No indicada' }}
          </strong>
        </div>

        <div>
          <span>LinkedIn</span>

          <strong>
            {{ analysis.personalInfo?.linkedin || 'No indicado' }}
          </strong>
        </div>

        <div>
          <span>GitHub</span>

          <strong>
            {{ analysis.personalInfo?.github || 'No indicado' }}
          </strong>
        </div>
      </div>
    </div>

    <!-- =====================================================
     EXPERIENCIA
     ===================================================== -->

    <div class="analysis-section">
      <div class="section-heading">
        <span class="section-icon"><AppIcon name="briefcase" /></span>
        <h3>Experiencia profesional</h3>
      </div>

      <div v-if="analysis.experience?.length" class="timeline">
        <div
          v-for="(experience, index) in analysis.experience"
          :key="`${experience.company || 'company'}-${experience.position || 'position'}-${index}`"
          class="timeline-item"
        >
          <h4>
            {{ experience.position || 'Puesto no indicado' }}
          </h4>

          <strong>
            {{ experience.company || 'Empresa no indicada' }}
          </strong>

          <span>
            {{ experience.startDate || 'Fecha no indicada' }}

            <template v-if="experience.endDate">
              —
              {{ experience.endDate }}
            </template>

            <template v-else> — Actualidad </template>
          </span>

          <p>
            {{ experience.description || 'Sin descripción disponible.' }}
          </p>
        </div>
      </div>

      <div v-else class="empty-block">
        <p>No se ha encontrado experiencia profesional en este CV.</p>
      </div>
    </div>

    <!-- =====================================================
     FORMACIÓN
     ===================================================== -->

    <div class="analysis-section">
      <div class="section-heading">
        <span class="section-icon"><AppIcon name="graduation-cap" /></span>
        <h3>Formación</h3>
      </div>

      <div v-if="analysis.education?.length" class="education-list">
        <div
          v-for="(education, index) in analysis.education"
          :key="`${education.degree || 'degree'}-${education.institution || 'institution'}-${index}`"
          class="education-item"
        >
          <div>
            <h4>
              {{ education.degree || 'Formación no indicada' }}
            </h4>

            <strong>
              {{ education.institution || 'Institución no indicada' }}
            </strong>
          </div>

          <span>
            {{ education.startDate || 'Fecha no indicada' }}

            <template v-if="education.endDate">
              —
              {{ education.endDate }}
            </template>
          </span>
        </div>
      </div>

      <div v-else class="empty-block">
        <p>No se ha encontrado formación en este CV.</p>
      </div>
    </div>

    <!-- =====================================================
     HABILIDADES
     ===================================================== -->

    <div class="analysis-section">
      <div class="section-heading">
        <span class="section-icon"><AppIcon name="tool" /></span>
        <h3>Habilidades</h3>
      </div>

      <div class="skill-group">
        <h4>Habilidades técnicas</h4>

        <div v-if="analysis.skills?.technical?.length" class="tag-list">
          <span
            v-for="skill in analysis.skills.technical"
            :key="skill"
            class="skill-tag"
          >
            {{ skill }}
          </span>
        </div>

        <p v-else class="empty-text">
          No se han detectado habilidades técnicas.
        </p>
      </div>

      <div class="skill-group">
        <h4>Competencias</h4>

        <div v-if="analysis.skills?.soft?.length" class="tag-list">
          <span
            v-for="skill in analysis.skills.soft"
            :key="skill"
            class="skill-tag soft"
          >
            {{ skill }}
          </span>
        </div>

        <p v-else class="empty-text">No se han detectado competencias.</p>
      </div>

      <div v-if="analysis.skills?.languages?.length" class="skill-group">
        <h4>Idiomas</h4>

        <div class="tag-list">
          <span
            v-for="(language, index) in analysis.skills.languages"
            :key="`${language.language || 'language'}-${index}`"
            class="skill-tag language"
          >
            {{ language.language || 'Idioma' }}

            ·

            {{ language.level || 'Nivel no indicado' }}
          </span>
        </div>
      </div>
    </div>

    <!-- =====================================================
     PROYECTOS
     ===================================================== -->

    <div class="analysis-section">
      <div class="section-heading">
        <span class="section-icon"><AppIcon name="trophy" /></span>
        <h3>Logros y trabajos destacados</h3>
      </div>

      <div v-if="analysis.projects?.length" class="projects-grid">
        <div
          v-for="(project, index) in analysis.projects"
          :key="`${project.name || 'project'}-${index}`"
          class="project-card"
        >
          <h4>
            {{ project.name || 'Sin nombre' }}
          </h4>

          <p>
            {{ project.description || 'Sin descripción disponible.' }}
          </p>

          <div v-if="project.technologies?.length" class="tag-list">
            <span
              v-for="technology in project.technologies"
              :key="technology"
              class="skill-tag"
            >
              {{ technology }}
            </span>
          </div>
        </div>
      </div>

      <div v-else class="empty-projects">
        <strong> No se han detectado logros o trabajos destacados </strong>

        <p>
          Añadir trabajos, obras o logros concretos puede mejorar
          considerablemente la valoración de tu CV.
        </p>
      </div>
    </div>

    <!-- =====================================================
     CERTIFICACIONES
     ===================================================== -->

    <div v-if="analysis.certifications?.length" class="analysis-section">
      <div class="section-heading">
        <span class="section-icon"><AppIcon name="award" /></span>
        <h3>Formación complementaria</h3>
      </div>

      <div class="certifications-list">
        <div
          v-for="(certification, index) in analysis.certifications"
          :key="`${certification.name || 'certification'}-${index}`"
          class="certification-item"
        >
          <h4>
            {{ certification.name || 'Certificación sin nombre' }}
          </h4>

          <span>
            {{ certification.platform || 'Plataforma no indicada' }}

            ·

            {{ certification.date || 'Fecha no indicada' }}
          </span>

          <p>
            {{ certification.description || 'Sin descripción disponible.' }}
          </p>
        </div>
      </div>
    </div>

    <!-- =====================================================
     PERFIL PROFESIONAL DETECTADO
     ===================================================== -->

    <div v-if="profileEntries.length" class="analysis-section">
      <div class="section-heading">
        <span class="section-icon"><AppIcon name="compass" /></span>
        <h3>Perfil profesional detectado</h3>
      </div>

      <!-- PERFIL ÚNICO (o datos antiguos sin detectedProfiles) -->
      <div v-if="profileType === 'single'" class="info-grid">
        <div>
          <span>Ocupación</span>
          <strong>{{ analysis.professionalProfile.occupation }}</strong>
        </div>

        <div v-if="analysis.professionalProfile.sector">
          <span>Sector</span>
          <strong>{{ analysis.professionalProfile.sector }}</strong>
        </div>

        <div v-if="analysis.professionalProfile.subsector">
          <span>Subsector</span>
          <strong>{{ analysis.professionalProfile.subsector }}</strong>
        </div>

        <div v-if="analysis.professionalProfile.seniority">
          <span>Senioridad</span>
          <strong>{{ analysis.professionalProfile.seniority }}</strong>
        </div>

        <div v-if="analysis.professionalProfile.location">
          <span>Ubicación</span>
          <strong>{{ analysis.professionalProfile.location }}</strong>
        </div>
      </div>

      <!-- PERFIL HÍBRIDO: dos ocupaciones, principal y secundaria -->
      <template v-else-if="profileType === 'hybrid'">
        <span class="profile-type-badge hybrid">Perfil híbrido</span>

        <div class="profile-dual">
          <div class="profile-card primary">
            <span class="profile-card-tag">Perfil principal</span>
            <strong>{{ primaryProfile?.occupation }}</strong>
            <span v-if="primaryProfile?.sector" class="profile-card-sector">
              {{ primaryProfile.sector }}
            </span>
          </div>

          <div class="profile-card secondary">
            <span class="profile-card-tag">Perfil secundario</span>
            <strong>{{ secondaryProfiles[0]?.occupation }}</strong>
            <span
              v-if="secondaryProfiles[0]?.sector"
              class="profile-card-sector"
            >
              {{ secondaryProfiles[0].sector }}
            </span>
          </div>
        </div>
      </template>

      <!-- PERFIL MULTIDISCIPLINAR: principal destacado + resto en lista -->
      <template v-else>
        <span class="profile-type-badge multi">Perfil multidisciplinar</span>

        <div class="profile-list">
          <div class="profile-card primary">
            <span class="profile-card-tag">Perfil principal</span>
            <strong>{{ primaryProfile?.occupation }}</strong>
            <span v-if="primaryProfile?.sector" class="profile-card-sector">
              {{ primaryProfile.sector }}
            </span>
          </div>

          <div
            v-for="(profile, index) in secondaryProfiles"
            :key="`${profile.occupation}-${index}`"
            class="profile-list-item"
          >
            <strong>{{ profile.occupation }}</strong>
            <span v-if="profile.sector">{{ profile.sector }}</span>
          </div>
        </div>
      </template>

      <!-- Datos compartidos del perfil, independientes de cuántas
           ocupaciones se hayan detectado -->
      <div
        v-if="profileType !== 'single'"
        class="info-grid profile-common-info"
      >
        <div v-if="analysis.professionalProfile.subsector">
          <span>Subsector</span>
          <strong>{{ analysis.professionalProfile.subsector }}</strong>
        </div>

        <div v-if="analysis.professionalProfile.seniority">
          <span>Senioridad</span>
          <strong>{{ analysis.professionalProfile.seniority }}</strong>
        </div>

        <div v-if="analysis.professionalProfile.location">
          <span>Ubicación</span>
          <strong>{{ analysis.professionalProfile.location }}</strong>
        </div>
      </div>

      <div
        v-if="analysis.professionalProfile.relatedOccupations?.length"
        class="skill-group"
      >
        <h4>Ocupaciones relacionadas</h4>

        <div class="tag-list">
          <span
            v-for="related in analysis.professionalProfile.relatedOccupations"
            :key="related"
            class="skill-tag"
          >
            {{ related }}
          </span>
        </div>
      </div>
    </div>

    <!-- =====================================================
     MERCADO LABORAL EN ESPAÑA
     ===================================================== -->

    <MarketAnalysis v-if="profileEntries.length" :cv-id="cvId" />

    <!-- =====================================================
     FORTALEZAS / DEBILIDADES
     ===================================================== -->

    <div v-if="analysis.analysis" class="insights-grid">
      <div class="insight-card strengths">
        <div class="section-heading">
          <span class="section-icon strengths"
            ><AppIcon name="thumbs-up"
          /></span>
          <h3>Fortalezas</h3>
        </div>

        <ul>
          <li
            v-for="(strength, index) in analysis.analysis.strengths || []"
            :key="`${strength}-${index}`"
          >
            {{ strength }}
          </li>
        </ul>

        <p v-if="!analysis.analysis.strengths?.length" class="empty-text">
          No se han detectado fortalezas específicas.
        </p>
      </div>

      <div class="insight-card weaknesses">
        <div class="section-heading">
          <span class="section-icon weaknesses"
            ><AppIcon name="alert-triangle"
          /></span>
          <h3>Aspectos a mejorar</h3>
        </div>

        <ul>
          <li
            v-for="(weakness, index) in analysis.analysis.weaknesses || []"
            :key="`${weakness}-${index}`"
          >
            {{ weakness }}
          </li>
        </ul>

        <p v-if="!analysis.analysis.weaknesses?.length" class="empty-text">
          No se han detectado aspectos específicos a mejorar.
        </p>
      </div>
    </div>

    <!-- =====================================================
     RECOMENDACIONES
     ===================================================== -->

    <div
      v-if="analysis.analysis?.recommendations?.length"
      class="analysis-section recommendation-section"
    >
      <div class="section-heading">
        <span class="section-icon"><AppIcon name="rocket" /></span>
        <h3>Recomendaciones</h3>
      </div>

      <div class="recommendation-list">
        <div
          v-for="(recommendation, index) in analysis.analysis.recommendations"
          :key="`${recommendation}-${index}`"
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

    <!-- =====================================================
     CTA COMPARACIÓN
     ===================================================== -->

    <div class="compare-cta">
      <div>
        <span> NUEVA FUNCIONALIDAD </span>

        <h3>¿Encaja este CV con una oferta?</h3>

        <p>
          Compara este CV con cualquier oferta de empleo y descubre
          coincidencias, carencias y recomendaciones.
        </p>
      </div>

      <button
        type="button"
        class="primary-button compare-button"
        @click="compareCV"
      >
        Comparar con oferta
      </button>
    </div>

    <!-- =====================================================
     ACCIONES FINALES
     ===================================================== -->

    <div class="analysis-bottom-actions">
      <button type="button" class="secondary-button" @click="goBack">
        ← Mis análisis
      </button>

      <button type="button" class="primary-button" @click="analyzeAnother">
        Analizar otro CV
      </button>
    </div>
  </div>
</template>
