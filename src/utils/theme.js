const STORAGE_KEY = 'ai-cv-analyzer:theme'

/* =========================================================
   PERSISTENCIA DE TEMA
   El acceso a localStorage puede fallar (modo privado,
   almacenamiento bloqueado por el navegador, etc.), así que
   siempre se envuelve en try/catch y se degrada con
   normalidad si no está disponible.
   ========================================================= */

export function getStoredTheme() {
  try {
    return window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function setStoredTheme(theme) {
  try {
    window.localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // Almacenamiento no disponible: el tema simplemente no persiste.
  }
}

function getSystemTheme() {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return 'dark'
  }

  return window.matchMedia('(prefers-color-scheme: light)').matches
    ? 'light'
    : 'dark'
}

export function getInitialTheme() {
  return getStoredTheme() || getSystemTheme()
}

export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme)
}

export function persistTheme(theme) {
  setStoredTheme(theme)
}
