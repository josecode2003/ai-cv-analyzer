<script setup>
import { computed } from 'vue'

import MarketAnalysis from './MarketAnalysis.vue'
import {
  getScoreClass,
  getPriorityClass,
  getPriorityText
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

const overallScore = computed(() => {
  return props.analysis?.score?.overall ?? 0
})

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
        <span class="score-label"> CV Score </span>

        <strong :class="getScoreClass(overallScore)">
          {{ overallScore }}
        </strong>

        <span> /100 </span>
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

    <div class="score-grid">
      <div class="score-item">
        <span> Experiencia </span>

        <strong :class="getScoreClass(analysis.score?.experience ?? 0)">
          {{ analysis.score?.experience ?? 0 }}
        </strong>
      </div>

      <div class="score-item">
        <span> Skills </span>

        <strong :class="getScoreClass(analysis.score?.skills ?? 0)">
          {{ analysis.score?.skills ?? 0 }}
        </strong>
      </div>

      <div class="score-item">
        <span> Educación </span>

        <strong :class="getScoreClass(analysis.score?.education ?? 0)">
          {{ analysis.score?.education ?? 0 }}
        </strong>
      </div>

      <div class="score-item">
        <span> Logros </span>

        <strong :class="getScoreClass(analysis.score?.projects ?? 0)">
          {{ analysis.score?.projects ?? 0 }}
        </strong>
      </div>

      <div class="score-item">
        <span> Presentación </span>

        <strong :class="getScoreClass(analysis.score?.presentation ?? 0)">
          {{ analysis.score?.presentation ?? 0 }}
        </strong>
      </div>
    </div>

    <!-- =====================================================
     INFORMACIÓN PERSONAL
     ===================================================== -->

    <div class="analysis-section">
      <h3>👤 Información personal</h3>

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
      <h3>💼 Experiencia profesional</h3>

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

      <p v-else class="empty-text">
        No se ha encontrado experiencia profesional.
      </p>
    </div>

    <!-- =====================================================
     FORMACIÓN
     ===================================================== -->

    <div class="analysis-section">
      <h3>🎓 Formación</h3>

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

      <p v-else class="empty-text">No se ha encontrado formación.</p>
    </div>

    <!-- =====================================================
     HABILIDADES
     ===================================================== -->

    <div class="analysis-section">
      <h3>🛠️ Habilidades</h3>

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
      <h3>🏆 Logros y trabajos destacados</h3>

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
      <h3>📜 Formación complementaria</h3>

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

    <div
      v-if="analysis.professionalProfile?.occupation"
      class="analysis-section"
    >
      <h3>🧭 Perfil profesional detectado</h3>

      <div class="info-grid">
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

    <MarketAnalysis
      v-if="analysis.professionalProfile?.occupation"
      :cv-id="cvId"
    />

    <!-- =====================================================
     FORTALEZAS / DEBILIDADES
     ===================================================== -->

    <div v-if="analysis.analysis" class="insights-grid">
      <div class="insight-card strengths">
        <div class="insight-icon">💪</div>

        <h3>Fortalezas</h3>

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
        <div class="insight-icon">⚠️</div>

        <h3>Aspectos a mejorar</h3>

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
      <h3>🚀 Recomendaciones</h3>

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
