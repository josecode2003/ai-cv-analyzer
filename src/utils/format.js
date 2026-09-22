export function getScoreClass(score) {
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

/* Etiqueta textual redundante al color, para no depender solo del color
   (accesibilidad) al comunicar el nivel de una puntuación. */
export function getScoreLabel(score) {
  if (score >= 80) {
    return 'Excelente'
  }

  if (score >= 60) {
    return 'Bueno'
  }

  if (score >= 40) {
    return 'Mejorable'
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
  return (size / 1024 / 1024).toFixed(2)
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

/* =========================================================
   MARKET ANALYSIS — NIVEL DE CONFIANZA DE UN DATO
   ========================================================= */

const CONFIDENCE_LABELS = {
  dato_oficial: 'Dato oficial',
  otra_fuente: 'Otra fuente',
  estimacion: 'Estimación',
  sin_datos_suficientes: 'Sin datos suficientes'
}

const CONFIDENCE_CLASSES = {
  dato_oficial: 'confidence-official',
  otra_fuente: 'confidence-source',
  estimacion: 'confidence-estimate',
  sin_datos_suficientes: 'confidence-none'
}

export function getConfidenceLabel(confidence) {
  return CONFIDENCE_LABELS[confidence] || 'Sin datos suficientes'
}

export function getConfidenceClass(confidence) {
  return CONFIDENCE_CLASSES[confidence] || 'confidence-none'
}

export function formatComparisonScore(score) {
  if (typeof score !== 'number') {
    return 0
  }

  return Math.round(score)
}
