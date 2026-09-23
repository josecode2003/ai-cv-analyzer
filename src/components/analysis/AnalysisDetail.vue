<script setup>
import { computed } from 'vue'

import CriteriaBoard from './CriteriaBoard.vue'
import MarketAnalysis from './MarketAnalysis.vue'
import ScoreGauge from './ScoreGauge.vue'
import ScoreMeter from './ScoreMeter.vue'
import AppIcon from '@/components/icons/AppIcon.vue'
import {
  getPriorityClass,
  getPriorityText,
  getScoreBreakdown
} from '@/utils/format'

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

const overallScore = computed(() => props.analysis?.score?.overall ?? 0)

const scoreBreakdown = computed(() => getScoreBreakdown(props.analysis?.score))

const evaluatedAs = computed(() => {
  const evaluation = props.analysis?.evaluation

  if (evaluation?.occupation) {
    return [evaluation.occupation, evaluation.sector]
      .filter(Boolean)
      .join(' · ')
  }

  return props.analysis?.overallAssessment?.profile || ''
})

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
     HERO
     ===================================================== -->

    <div class="analysis-header fade-in-up">
      <div class="analysis-header-text">
        <span class="badge">Análisis completado</span>

        <h2>{{ analysis.personalInfo?.name || 'CV analizado' }}</h2>

        <p v-if="evaluatedAs" class="evaluated-as">
          Evaluado como: <strong>{{ evaluatedAs }}</strong>
        </p>

        <p>
          {{ analysis.summary || 'No se ha generado un resumen para este CV.' }}
        </p>

        <div v-if="analysis.overallAssessment" class="assessment-row">
          <span>
            Nivel:
            <strong>{{
              analysis.overallAssessment.level || 'No indicado'
            }}</strong>
          </span>

          <span
            v-if="analysis.overallAssessment.priority"
            class="priority-badge"
            :class="getPriorityClass(analysis.overallAssessment.priority)"
          >
            {{ getPriorityText(analysis.overallAssessment.priority) }}
          </span>
        </div>
      </div>

      <div class="score-card">
        <span class="score-label">Puntuación global</span>
        <ScoreGauge :score="overallScore" />
      </div>
    </div>

    <div
      v-if="analysis.evaluation?.caps?.length"
      class="caps-banner-top fade-in-up"
    >
      <AppIcon name="alert-triangle" />
      <div>
        <p v-for="(cap, index) in analysis.evaluation.caps" :key="index">
          Nota limitada a {{ cap.limit }}: {{ cap.reason }}
        </p>
      </div>
    </div>

    <div
      v-if="analysis.overallAssessment?.mainIssue"
      class="main-issue-card fade-in-up"
    >
      <span>Principal aspecto a mejorar</span>
      <h3>{{ analysis.overallAssessment.mainIssue }}</h3>
    </div>

    <!-- =====================================================
     PUNTUACIONES POR CATEGORÍA
     ===================================================== -->

    <div class="score-meters fade-in-up">
      <ScoreMeter
        v-for="(item, index) in scoreBreakdown"
        :key="item.key"
        :label="item.label"
        :score="item.score"
        :delay="index * 90"
      />
    </div>

    <!-- =====================================================
     BAREMO DE TU PROFESIÓN
     ===================================================== -->

    <div v-if="analysis.evaluation?.criteria?.length" class="analysis-section">
      <div class="section-heading">
        <span class="section-icon"><AppIcon name="scale" /></span>
        <h3>Baremo de tu profesión</h3>
      </div>

      <CriteriaBoard :evaluation="analysis.evaluation" />
    </div>

    <!-- =====================================================
     FORTALEZAS / DEBILIDADES
     ===================================================== -->

    <div v-if="analysis.analysis" class="insights-grid">
      <div class="analysis-section insight-card">
        <div class="section-heading">
          <span class="section-icon strengths"
            ><AppIcon name="thumbs-up"
          /></span>
          <h3>Fortalezas</h3>
        </div>

        <ul v-if="analysis.analysis.strengths?.length" class="insight-list">
          <li
            v-for="(strength, index) in analysis.analysis.strengths"
            :key="index"
          >
            {{ strength }}
          </li>
        </ul>

        <p v-else class="empty-text">
          No se han detectado fortalezas específicas.
        </p>
      </div>

      <div class="analysis-section insight-card">
        <div class="section-heading">
          <span class="section-icon weaknesses"
            ><AppIcon name="alert-triangle"
          /></span>
          <h3>Aspectos a mejorar</h3>
        </div>

        <ul v-if="analysis.analysis.weaknesses?.length" class="insight-list">
          <li
            v-for="(weakness, index) in analysis.analysis.weaknesses"
            :key="index"
          >
            {{ weakness }}
          </li>
        </ul>

        <p v-else class="empty-text">
          No se han detectado aspectos específicos a mejorar.
        </p>
      </div>
    </div>

    <div
      v-if="analysis.analysis?.recommendations?.length"
      class="analysis-section"
    >
      <div class="section-heading">
        <span class="section-icon"><AppIcon name="rocket" /></span>
        <h3>Recomendaciones</h3>
      </div>

      <div class="recommendation-list">
        <div
          v-for="(recommendation, index) in analysis.analysis.recommendations"
          :key="index"
          class="recommendation-item"
        >
          <span>{{ index + 1 }}</span>
          <p>{{ recommendation }}</p>
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
            :key="index"
            class="profile-list-item"
          >
            <strong>{{ profile.occupation }}</strong>
            <span v-if="profile.sector">{{ profile.sector }}</span>
          </div>
        </div>
      </template>

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
          <strong>{{ analysis.personalInfo?.name || 'No indicado' }}</strong>
        </div>

        <div>
          <span>Email</span>
          <strong>{{ analysis.personalInfo?.email || 'No indicado' }}</strong>
        </div>

        <div>
          <span>Teléfono</span>
          <strong>{{ analysis.personalInfo?.phone || 'No indicado' }}</strong>
        </div>

        <div>
          <span>Ubicación</span>
          <strong>{{
            analysis.personalInfo?.location || 'No indicada'
          }}</strong>
        </div>

        <div>
          <span>LinkedIn</span>
          <strong>{{
            analysis.personalInfo?.linkedin || 'No indicado'
          }}</strong>
        </div>

        <div>
          <span>GitHub</span>
          <strong>{{ analysis.personalInfo?.github || 'No indicado' }}</strong>
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
          :key="index"
          class="timeline-item"
        >
          <h4>{{ experience.position || 'Puesto no indicado' }}</h4>
          <strong>{{ experience.company || 'Empresa no indicada' }}</strong>

          <span>
            {{ experience.startDate || 'Fecha no indicada' }}
            <template v-if="experience.endDate">
              — {{ experience.endDate }}</template
            >
            <template v-else> — Actualidad</template>
          </span>

          <p v-if="experience.description">{{ experience.description }}</p>
        </div>
      </div>

      <p v-else class="empty-text">
        No se ha encontrado experiencia profesional en este CV.
      </p>
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
          :key="index"
          class="education-item"
        >
          <div>
            <h4>{{ education.degree || 'Formación no indicada' }}</h4>
            <strong>{{
              education.institution || 'Institución no indicada'
            }}</strong>
          </div>

          <span>
            {{ education.startDate || 'Fecha no indicada' }}
            <template v-if="education.endDate">
              — {{ education.endDate }}</template
            >
          </span>
        </div>
      </div>

      <p v-else class="empty-text">No se ha encontrado formación en este CV.</p>
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
            :key="index"
            class="skill-tag language"
          >
            {{ language.language || 'Idioma' }} ·
            {{ language.level || 'Nivel no indicado' }}
          </span>
        </div>
      </div>
    </div>

    <!-- =====================================================
     TRABAJOS DESTACADOS
     ===================================================== -->

    <div class="analysis-section">
      <div class="section-heading">
        <span class="section-icon"><AppIcon name="trophy" /></span>
        <h3>Trabajos destacados</h3>
      </div>

      <div v-if="analysis.projects?.length" class="projects-grid">
        <div
          v-for="(project, index) in analysis.projects"
          :key="index"
          class="project-card"
        >
          <h4>{{ project.name || 'Sin nombre' }}</h4>
          <p v-if="project.description">{{ project.description }}</p>

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
        <strong>No se han detectado trabajos destacados</strong>
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
          :key="index"
          class="certification-item"
        >
          <h4>{{ certification.name || 'Certificación sin nombre' }}</h4>

          <span v-if="certification.platform || certification.date">
            {{
              [certification.platform, certification.date]
                .filter(Boolean)
                .join(' · ')
            }}
          </span>

          <p v-if="certification.description">
            {{ certification.description }}
          </p>
        </div>
      </div>
    </div>

    <!-- =====================================================
     MERCADO LABORAL
     ===================================================== -->

    <MarketAnalysis v-if="profileEntries.length" :cv-id="cvId" />

    <!-- =====================================================
     CTA COMPARACIÓN
     ===================================================== -->

    <div class="compare-cta">
      <div>
        <span>Nueva funcionalidad</span>
        <h3>¿Encaja este CV con una oferta?</h3>
        <p>
          Compara este CV con cualquier oferta de empleo y descubre
          coincidencias, carencias y recomendaciones.
        </p>
      </div>

      <button type="button" class="btn btn-primary" @click="compareCV">
        Comparar con oferta
      </button>
    </div>

    <!-- =====================================================
     ACCIONES FINALES
     ===================================================== -->

    <div class="analysis-bottom-actions">
      <button type="button" class="btn btn-secondary" @click="goBack">
        <AppIcon name="arrow-left" />
        Mis análisis
      </button>

      <button type="button" class="btn btn-primary" @click="analyzeAnother">
        Analizar otro CV
      </button>
    </div>
  </div>
</template>

<style scoped>
.analysis-preview {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.analysis-header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-6);
  padding: var(--space-6);
  border-radius: var(--radius-xl);
  border: 1px solid var(--color-border);
  background: var(--accent-gradient-soft);
}

.analysis-header-text {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  flex: 1;
  min-width: 260px;
}

.analysis-header-text .badge {
  align-self: flex-start;
}

.analysis-header-text h2 {
  font-size: 1.7rem;
  margin-top: var(--space-2);
}

.evaluated-as {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
}

.analysis-header-text > p:not(.evaluated-as) {
  color: var(--color-text-secondary);
  max-width: 60ch;
}

.assessment-row {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  flex-wrap: wrap;
  font-size: 0.88rem;
  color: var(--color-text-secondary);
  margin-top: var(--space-1);
}

.priority-badge {
  padding: 0.3rem 0.8rem;
  border-radius: var(--radius-full);
  font-size: 0.78rem;
  font-weight: 600;
}

.priority-badge.priority-high {
  background: var(--score-bad-bg);
  color: var(--score-bad);
}

.priority-badge.priority-medium {
  background: var(--score-warn-bg);
  color: var(--score-warn);
}

.priority-badge.priority-low {
  background: var(--score-good-bg);
  color: var(--score-good);
}

.score-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  flex-shrink: 0;
}

.score-label {
  font-size: 0.8rem;
  color: var(--color-text-tertiary);
}

.caps-banner-top {
  display: flex;
  gap: var(--space-3);
  padding: var(--space-4);
  border-radius: var(--radius-md);
  background: var(--score-warn-bg);
  border: 1px solid rgba(251, 191, 36, 0.3);
  color: var(--score-warn);
  font-size: 0.88rem;
}

.caps-banner-top svg {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.caps-banner-top p {
  margin: 0;
  font-weight: 500;
}

.main-issue-card {
  padding: var(--space-4) var(--space-5);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
}

.main-issue-card span {
  display: block;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-tertiary);
  margin-bottom: var(--space-1);
}

.main-issue-card h3 {
  font-size: 1rem;
}

.score-meters {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--space-4);
  padding: var(--space-5);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
}

.insights-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: var(--space-4);
}

.insight-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.insight-list li {
  position: relative;
  padding-left: var(--space-4);
  font-size: 0.9rem;
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

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: var(--space-4);
}

.info-grid > div {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.info-grid span {
  font-size: 0.76rem;
  color: var(--color-text-tertiary);
}

.info-grid strong {
  font-size: 0.92rem;
  overflow-wrap: anywhere;
}

.profile-type-badge {
  display: inline-flex;
  align-self: flex-start;
  padding: 0.3rem 0.8rem;
  border-radius: var(--radius-full);
  font-size: 0.78rem;
  font-weight: 600;
  background: var(--accent-soft);
  color: var(--accent-strong);
}

.profile-dual,
.profile-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--space-3);
}

.profile-card {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding: var(--space-4);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-surface-hover);
}

.profile-card.primary {
  border-color: var(--accent-border);
  background: var(--accent-soft);
}

.profile-card-tag {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text-tertiary);
}

.profile-card-sector {
  font-size: 0.82rem;
  color: var(--color-text-secondary);
}

.profile-list-item {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
}

.profile-list-item span {
  font-size: 0.8rem;
  color: var(--color-text-tertiary);
}

.profile-common-info {
  padding-top: var(--space-2);
  border-top: 1px solid var(--color-border);
}

.skill-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.skill-group h4 {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.timeline {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.timeline-item {
  position: relative;
  padding-left: var(--space-5);
  border-left: 2px solid var(--color-border);
}

.timeline-item::before {
  content: '';
  position: absolute;
  left: -5px;
  top: 0.3rem;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent);
}

.timeline-item h4 {
  font-size: 0.98rem;
}

.timeline-item strong {
  display: block;
  font-size: 0.86rem;
  color: var(--color-text-secondary);
  font-weight: 400;
  margin-top: 0.1rem;
}

.timeline-item span {
  display: block;
  font-size: 0.78rem;
  color: var(--color-text-tertiary);
  margin: 0.3rem 0 0.5rem;
}

.timeline-item p {
  font-size: 0.88rem;
  color: var(--color-text-secondary);
}

.education-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.education-item {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-3);
  padding-bottom: var(--space-3);
  border-bottom: 1px solid var(--color-border);
}

.education-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.education-item h4 {
  font-size: 0.94rem;
}

.education-item strong {
  display: block;
  font-size: 0.82rem;
  color: var(--color-text-secondary);
  font-weight: 400;
  margin-top: 0.1rem;
}

.education-item span {
  font-size: 0.78rem;
  color: var(--color-text-tertiary);
  white-space: nowrap;
}

.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--space-4);
}

.project-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-4);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-surface-hover);
}

.project-card h4 {
  font-size: 0.94rem;
}

.project-card p {
  font-size: 0.86rem;
  color: var(--color-text-secondary);
}

.empty-projects {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--space-4);
  border-radius: var(--radius-md);
  border: 1px dashed var(--color-border-strong);
}

.empty-projects p {
  font-size: 0.86rem;
  color: var(--color-text-tertiary);
}

.certifications-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.certification-item h4 {
  font-size: 0.92rem;
}

.certification-item span {
  font-size: 0.78rem;
  color: var(--color-text-tertiary);
}

.certification-item p {
  font-size: 0.86rem;
  color: var(--color-text-secondary);
  margin-top: 0.2rem;
}

.compare-cta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-6);
  border-radius: var(--radius-lg);
  background: var(--accent-gradient);
  color: #fff;
}

.compare-cta span {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  opacity: 0.85;
}

.compare-cta h3 {
  font-size: 1.3rem;
  margin-top: var(--space-1);
}

.compare-cta p {
  margin-top: var(--space-2);
  max-width: 50ch;
  opacity: 0.9;
}

.compare-cta .btn-primary {
  background: #fff;
  color: var(--accent-strong);
  box-shadow: none;
}

.analysis-bottom-actions {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
  flex-wrap: wrap;
}
</style>
