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

export function formatComparisonScore(score) {
  if (typeof score !== 'number') {
    return 0
  }

  return Math.round(score)
}
