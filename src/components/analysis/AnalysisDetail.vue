<script setup>
defineProps({
  analysis: {
    type: Object,
    required: true
  }
})

const emit = defineEmits([
  'back',
  'compare',
  'analyze-another'
])

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
</script>

<template>

  <div class="analysis-preview">

    <div class="analysis-header">

      <div>

        <span class="badge">
          Análisis completado
        </span>

        <h2>
          {{
            analysis.personalInfo?.name ||
            'CV analizado'
          }}
        </h2>

        <p>
          {{ analysis.summary }}
        </p>

      </div>

      <div class="score-card">

        <span class="score-label">
          CV Score
        </span>

        <strong
          :class="
            getScoreClass(
              analysis.score?.overall
            )
          "
        >
          {{ analysis.score?.overall ?? 0 }}
        </strong>

        <span>
          /100
        </span>

      </div>

    </div>


    <div
      v-if="analysis.overallAssessment"
      class="assessment-card"
    >

      <div>

        <span class="assessment-label">
          PERFIL DETECTADO
        </span>

        <h3>
          {{
            analysis.overallAssessment.profile
          }}
        </h3>

        <p>
          Nivel:
          <strong>
            {{
              analysis.overallAssessment.level
            }}
          </strong>
        </p>

      </div>

      <div
        class="priority-badge"
        :class="
          getPriorityClass(
            analysis.overallAssessment.priority
          )
        "
      >
        {{
          getPriorityText(
            analysis.overallAssessment.priority
          )
        }}
      </div>

    </div>


    <div
      v-if="analysis.overallAssessment"
      class="main-issue-card"
    >

      <span>
        PRINCIPAL ASPECTO A MEJORAR
      </span>

      <h3>
        {{
          analysis.overallAssessment.mainIssue
        }}
      </h3>

    </div>


    <div class="score-grid">

      <div class="score-item">
        <span>Experiencia</span>
        <strong
          :class="
            getScoreClass(
              analysis.score?.experience
            )
          "
        >
          {{ analysis.score?.experience ?? 0 }}
        </strong>
      </div>

      <div class="score-item">
        <span>Skills</span>
        <strong
          :class="
            getScoreClass(
              analysis.score?.skills
            )
          "
        >
          {{ analysis.score?.skills ?? 0 }}
        </strong>
      </div>

      <div class="score-item">
        <span>Educación</span>
        <strong
          :class="
            getScoreClass(
              analysis.score?.education
            )
          "
        >
          {{ analysis.score?.education ?? 0 }}
        </strong>
      </div>

      <div class="score-item">
        <span>Proyectos</span>
        <strong
          :class="
            getScoreClass(
              analysis.score?.projects
            )
          "
        >
          {{ analysis.score?.projects ?? 0 }}
        </strong>
      </div>

      <div class="score-item">
        <span>Presentación</span>
        <strong
          :class="
            getScoreClass(
              analysis.score?.presentation
            )
          "
        >
          {{ analysis.score?.presentation ?? 0 }}
        </strong>
      </div>

    </div>


    <div class="analysis-section">

      <h3>
        👤 Información personal
      </h3>

      <div class="info-grid">

        <div>
          <span>Nombre</span>
          <strong>
            {{
              analysis.personalInfo?.name ||
              'No indicado'
            }}
          </strong>
        </div>

        <div>
          <span>Email</span>
          <strong>
            {{
              analysis.personalInfo?.email ||
              'No indicado'
            }}
          </strong>
        </div>

        <div>
          <span>Teléfono</span>
          <strong>
            {{
              analysis.personalInfo?.phone ||
              'No indicado'
            }}
          </strong>
        </div>

        <div>
          <span>Ubicación</span>
          <strong>
            {{
              analysis.personalInfo?.location ||
              'No indicada'
            }}
          </strong>
        </div>

        <div>
          <span>LinkedIn</span>
          <strong>
            {{
              analysis.personalInfo?.linkedin ||
              'No indicado'
            }}
          </strong>
        </div>

        <div>
          <span>GitHub</span>
          <strong>
            {{
              analysis.personalInfo?.github ||
              'No indicado'
            }}
          </strong>
        </div>

      </div>

    </div>


    <div class="analysis-section">

      <h3>
        💼 Experiencia profesional
      </h3>

      <div
        v-if="analysis.experience?.length"
        class="timeline"
      >

        <div
          v-for="experience in analysis.experience"
          :key="
            experience.company +
            experience.position
          "
          class="timeline-item"
        >

          <h4>
            {{ experience.position }}
          </h4>

          <strong>
            {{ experience.company }}
          </strong>

          <span>

            {{ experience.startDate }}

            <template
              v-if="experience.endDate"
            >
              —
              {{ experience.endDate }}
            </template>

            <template v-else>
              — Actualidad
            </template>

          </span>

          <p>
            {{ experience.description }}
          </p>

        </div>

      </div>

      <p
        v-else
        class="empty-text"
      >
        No se ha encontrado experiencia profesional.
      </p>

    </div>


    <div class="analysis-section">

      <h3>
        🎓 Formación
      </h3>

      <div
        v-if="analysis.education?.length"
        class="education-list"
      >

        <div
          v-for="education in analysis.education"
          :key="
            education.degree +
            education.startDate
          "
          class="education-item"
        >

          <div>

            <h4>
              {{ education.degree }}
            </h4>

            <strong>
              {{
                education.institution ||
                'Institución no indicada'
              }}
            </strong>

          </div>

          <span>

            {{ education.startDate }}

            <template
              v-if="education.endDate"
            >
              —
              {{ education.endDate }}
            </template>

          </span>

        </div>

      </div>

      <p
        v-else
        class="empty-text"
      >
        No se ha encontrado formación.
      </p>

    </div>


    <div class="analysis-section">

      <h3>
        🛠️ Habilidades
      </h3>

      <div class="skill-group">

        <h4>
          Tecnologías
        </h4>

        <div class="tag-list">

          <span
            v-for="skill in analysis.skills?.technical || []"
            :key="skill"
            class="skill-tag"
          >
            {{ skill }}
          </span>

        </div>

      </div>


      <div class="skill-group">

        <h4>
          Competencias
        </h4>

        <div class="tag-list">

          <span
            v-for="skill in analysis.skills?.soft || []"
            :key="skill"
            class="skill-tag soft"
          >
            {{ skill }}
          </span>

        </div>

      </div>


      <div
        v-if="analysis.skills?.languages?.length"
        class="skill-group"
      >

        <h4>
          Idiomas
        </h4>

        <div class="tag-list">

          <span
            v-for="language in analysis.skills.languages"
            :key="language.language"
            class="skill-tag language"
          >
            {{ language.language }}
            ·
            {{ language.level }}
          </span>

        </div>

      </div>

    </div>


    <div class="analysis-section">

      <h3>
        🚀 Proyectos
      </h3>

      <div
        v-if="analysis.projects?.length"
        class="projects-grid"
      >

        <div
          v-for="project in analysis.projects"
          :key="project.name"
          class="project-card"
        >

          <h4>
            {{ project.name }}
          </h4>

          <p>
            {{ project.description }}
          </p>

          <div class="tag-list">

            <span
              v-for="technology in project.technologies || []"
              :key="technology"
              class="skill-tag"
            >
              {{ technology }}
            </span>

          </div>

        </div>

      </div>


      <div
        v-else
        class="empty-projects"
      >

        <strong>
          No se han detectado proyectos
        </strong>

        <p>
          Añadir proyectos demostrables puede mejorar
          considerablemente la valoración de un CV junior.
        </p>

      </div>

    </div>


    <div
      v-if="analysis.certifications?.length"
      class="analysis-section"
    >

      <h3>
        📜 Formación complementaria
      </h3>

      <div class="certifications-list">

        <div
          v-for="certification in analysis.certifications"
          :key="certification.name"
          class="certification-item"
        >

          <h4>
            {{ certification.name }}
          </h4>

          <span>
            {{ certification.platform }}
            ·
            {{ certification.date }}
          </span>

          <p>
            {{ certification.description }}
          </p>

        </div>

      </div>

    </div>


    <div
      v-if="analysis.analysis"
      class="insights-grid"
    >

      <div class="insight-card strengths">

        <div class="insight-icon">
          💪
        </div>

        <h3>
          Fortalezas
        </h3>

        <ul>

          <li
            v-for="strength in analysis.analysis.strengths || []"
            :key="strength"
          >
            {{ strength }}
          </li>

        </ul>

      </div>


      <div class="insight-card weaknesses">

        <div class="insight-icon">
          ⚠️
        </div>

        <h3>
          Aspectos a mejorar
        </h3>

        <ul>

          <li
            v-for="weakness in analysis.analysis.weaknesses || []"
            :key="weakness"
          >
            {{ weakness }}
          </li>

        </ul>

      </div>

    </div>


    <div
      v-if="analysis.analysis?.recommendations?.length"
      class="analysis-section recommendation-section"
    >

      <h3>
        🚀 Recomendaciones
      </h3>

      <div class="recommendation-list">

        <div
          v-for="(
            recommendation,
            index
          ) in analysis.analysis.recommendations"
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


    <div class="compare-cta">

      <div>

        <span>
          NUEVA FUNCIONALIDAD
        </span>

        <h3>
          ¿Encaja este CV con una oferta?
        </h3>

        <p>
          Compara este CV con cualquier oferta de empleo
          y descubre coincidencias, carencias y recomendaciones.
        </p>

      </div>

      <button
        class="primary-button compare-button"
        @click="emit('compare')"
      >
        Comparar con oferta
      </button>

    </div>


    <div class="analysis-bottom-actions">

      <button
        class="secondary-button"
        @click="emit('back')"
      >
        ← Mis análisis
      </button>

      <button
        class="primary-button"
        @click="emit('analyze-another')"
      >
        Analizar otro CV
      </button>

    </div>

  </div>

</template>