/* =========================================================
   PUNTUACIONES — 0-49 malo · 50-69 regular · 70-84 bueno · 85-100 excelente
   ========================================================= */

export function getScoreClass(score) {
  const value = Number(score) || 0

  if (value >= 85) {
    return 'score-excellent'
  }

  if (value >= 70) {
    return 'score-good'
  }

  if (value >= 50) {
    return 'score-warn'
  }

  return 'score-bad'
}

/* Etiqueta textual redundante al color, para no depender solo del color
   (accesibilidad) al comunicar el nivel de una puntuación. */
export function getScoreLabel(score) {
  const value = Number(score) || 0

  if (value >= 85) {
    return 'Excelente'
  }

  if (value >= 70) {
    return 'Bueno'
  }

  if (value >= 50) {
    return 'Regular'
  }

  return 'Bajo'
}

export function getPriorityClass(priority) {
  if (priority === 'high') {
    return 'priority-high'
  }

  if (priority === 'medium') {
    return 'priority-medium'
  }

  return 'priority-low'
}

export function getPriorityText(priority) {
  if (priority === 'high') {
    return 'Prioridad alta'
  }

  if (priority === 'medium') {
    return 'Prioridad media'
  }

  return 'Prioridad baja'
}

export function formatFileSize(size) {
  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))} KB`
  }

  return `${(size / 1024 / 1024).toFixed(1).replace('.', ',')} MB`
}

export function formatDate(date) {
  if (!date) {
    return ''
  }

  try {
    return new Intl.DateTimeFormat('es-ES', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(date))
  } catch {
    return date
  }
}

export function formatShortDate(date) {
  if (!date) {
    return ''
  }

  try {
    return new Intl.DateTimeFormat('es-ES', {
      dateStyle: 'long'
    }).format(new Date(date))
  } catch {
    return date
  }
}

export function formatComparisonScore(score) {
  if (typeof score !== 'number') {
    return 0
  }

  return Math.round(score)
}

/* =========================================================
   DESGLOSE DE PUNTUACIÓN POR CATEGORÍA
   Los análisis nuevos usan `certifications`/`presentation` sin `projects`;
   los antiguos guardados usan `projects` en su lugar. Se pintan solo las
   categorías presentes en el registro, cada una con su etiqueta correcta.
   ========================================================= */

export const CATEGORY_LABELS = {
  experience: 'Experiencia',
  skills: 'Habilidades',
  education: 'Formación reglada',
  certifications: 'Cursos y certificaciones',
  presentation: 'Presentación',
  projects: 'Logros'
}

export function getCategoryLabel(key) {
  return CATEGORY_LABELS[key] || key
}

export function getScoreBreakdown(score) {
  if (!score) {
    return []
  }

  return Object.keys(CATEGORY_LABELS)
    .filter(key => typeof score[key] === 'number')
    .map(key => ({
      key,
      label: getCategoryLabel(key),
      score: score[key]
    }))
}

/* =========================================================
   BAREMO DE PROFESIÓN (evaluation.criteria)
   ========================================================= */

const STATUS_META = {
  met: { icon: 'check-circle', label: 'Cumple', className: 'status-met' },
  partial: {
    icon: 'dot-circle',
    label: 'Parcial',
    className: 'status-partial'
  },
  missing: {
    icon: 'x-circle',
    label: 'No cumple',
    className: 'status-missing'
  }
}

export function getStatusMeta(status) {
  return STATUS_META[status] || STATUS_META.missing
}

const WEIGHT_META = {
  1: 'Complemento',
  2: 'Importante',
  3: 'Esencial'
}

export function getWeightLabel(weight) {
  return WEIGHT_META[weight] || 'Complemento'
}

/* =========================================================
   MERCADO LABORAL
   ========================================================= */

const DEMAND_META = {
  alta: {
    label: 'Demanda alta',
    icon: 'trending-up',
    className: 'demand-alta'
  },
  media: {
    label: 'Demanda media',
    icon: 'minus',
    className: 'demand-media'
  },
  baja: {
    label: 'Demanda baja',
    icon: 'trending-down',
    className: 'demand-baja'
  },
  sin_datos: {
    label: 'Sin datos suficientes',
    icon: 'minus',
    className: 'demand-sin-datos'
  }
}

export function getDemandMeta(level) {
  return DEMAND_META[level] || DEMAND_META.sin_datos
}
