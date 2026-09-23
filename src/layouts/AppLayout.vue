<script setup>
import { ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'

import AppIcon from '@/components/icons/AppIcon.vue'
import ThemeToggle from '@/components/ui/ThemeToggle.vue'
import { useSession } from '../stores/session'

const router = useRouter()
const route = useRoute()

const { state, analysesCount, comparisonsCount } = useSession()

const mobileMenuOpen = ref(false)

watch(
  () => route.fullPath,
  () => {
    mobileMenuOpen.value = false
  }
)

function go(path) {
  router.push(path)
}

const apiStatusText = {
  online: 'API conectada',
  offline: 'API desconectada',
  checking: 'Conectando…'
}
</script>

<template>
  <div class="app">
    <a class="skip-link" href="#main-content">Saltar al contenido</a>

    <header class="header">
      <div class="header-inner container">
        <button class="logo" @click="go('/')">
          <span class="logo-mark">AI</span>
          <span class="logo-text">CV Analyzer</span>
        </button>

        <nav class="navigation" aria-label="Navegación principal">
          <button
            :class="{ active: route.name === 'home' }"
            :aria-current="route.name === 'home' ? 'page' : undefined"
            @click="go('/')"
          >
            Inicio
          </button>

          <button
            :class="{
              active: ['analyses', 'analysis', 'compare'].includes(route.name)
            }"
            :aria-current="
              ['analyses', 'analysis', 'compare'].includes(route.name)
                ? 'page'
                : undefined
            "
            @click="go('/analyses')"
          >
            Mis análisis
            <span v-if="analysesCount" class="nav-count">{{
              analysesCount
            }}</span>
          </button>

          <button
            :class="{
              active: ['comparisons', 'comparison-result'].includes(route.name)
            }"
            :aria-current="
              ['comparisons', 'comparison-result'].includes(route.name)
                ? 'page'
                : undefined
            "
            @click="go('/comparisons')"
          >
            Comparaciones
            <span v-if="comparisonsCount" class="nav-count">{{
              comparisonsCount
            }}</span>
          </button>
        </nav>

        <div class="header-actions">
          <div class="api-status" :class="state.apiStatus">
            <span class="status-dot"></span>
            <span>{{ apiStatusText[state.apiStatus] }}</span>
          </div>

          <ThemeToggle />

          <button
            type="button"
            class="btn-icon menu-toggle"
            :aria-expanded="mobileMenuOpen"
            aria-controls="mobile-nav"
            :aria-label="mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'"
            @click="mobileMenuOpen = !mobileMenuOpen"
          >
            <AppIcon :name="mobileMenuOpen ? 'x' : 'menu'" />
          </button>
        </div>
      </div>

      <Transition name="mobile-nav">
        <nav
          v-if="mobileMenuOpen"
          id="mobile-nav"
          class="mobile-nav"
          aria-label="Navegación móvil"
        >
          <button :class="{ active: route.name === 'home' }" @click="go('/')">
            Inicio
          </button>
          <button
            :class="{
              active: ['analyses', 'analysis', 'compare'].includes(route.name)
            }"
            @click="go('/analyses')"
          >
            Mis análisis
          </button>
          <button
            :class="{
              active: ['comparisons', 'comparison-result'].includes(route.name)
            }"
            @click="go('/comparisons')"
          >
            Comparaciones
          </button>
        </nav>
      </Transition>
    </header>

    <main id="main-content" class="main">
      <slot />
    </main>

    <footer class="footer">
      <p>AI CV Analyzer · Proyecto de portfolio</p>
    </footer>
  </div>
</template>

<style scoped>
.app {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
}

.header {
  position: sticky;
  top: 0;
  z-index: var(--z-header);
  background: color-mix(in srgb, var(--color-bg) 82%, transparent);
  backdrop-filter: blur(14px);
  border-bottom: 1px solid var(--color-border);
}

.header-inner {
  display: flex;
  align-items: center;
  gap: var(--space-5);
  height: 68px;
}

.logo {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 1.05rem;
  flex-shrink: 0;
}

.logo-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: var(--radius-sm);
  background: var(--accent-gradient);
  color: #fff;
  font-size: 0.72rem;
  letter-spacing: 0.02em;
}

.navigation {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  margin-inline: auto;
}

.navigation button {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: 0.5rem 0.9rem;
  border-radius: var(--radius-full);
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  transition:
    color var(--duration-base) var(--ease-out),
    background-color var(--duration-base) var(--ease-out);
}

.navigation button:hover {
  color: var(--color-text);
  background: var(--color-surface-hover);
}

.navigation button.active {
  color: var(--color-text);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
}

.nav-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding-inline: 0.35rem;
  border-radius: var(--radius-full);
  background: var(--accent-soft);
  color: var(--accent-strong);
  font-size: 0.72rem;
  font-weight: 600;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-shrink: 0;
}

.api-status {
  display: none;
  align-items: center;
  gap: var(--space-2);
  font-size: 0.78rem;
  color: var(--color-text-tertiary);
}

@media (min-width: 900px) {
  .api-status {
    display: inline-flex;
  }
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-text-tertiary);
}

.api-status.online .status-dot {
  background: var(--color-success);
  box-shadow: 0 0 0 3px var(--score-good-bg);
}

.api-status.offline .status-dot {
  background: var(--color-danger);
  box-shadow: 0 0 0 3px var(--score-bad-bg);
}

.menu-toggle {
  display: inline-flex;
}

@media (min-width: 760px) {
  .menu-toggle {
    display: none;
  }

  .mobile-nav {
    display: none;
  }
}

@media (max-width: 759px) {
  .navigation {
    display: none;
  }
}

.mobile-nav {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--space-2) var(--gutter) var(--space-4);
  border-top: 1px solid var(--color-border);
}

.mobile-nav button {
  text-align: left;
  padding: 0.75rem var(--space-3);
  border-radius: var(--radius-md);
  font-size: 0.95rem;
  color: var(--color-text-secondary);
}

.mobile-nav button.active {
  color: var(--color-text);
  background: var(--color-surface);
}

.mobile-nav-enter-active,
.mobile-nav-leave-active {
  transition:
    opacity var(--duration-base) var(--ease-out),
    transform var(--duration-base) var(--ease-out);
  transform-origin: top;
}

.mobile-nav-enter-from,
.mobile-nav-leave-to {
  opacity: 0;
  transform: scaleY(0.96) translateY(-4px);
}

@media (prefers-reduced-motion: reduce) {
  .mobile-nav-enter-from,
  .mobile-nav-leave-to {
    transform: none;
  }
}

.main {
  flex: 1;
  padding-block: var(--space-7);
}

.footer {
  border-top: 1px solid var(--color-border);
  padding: var(--space-5) var(--gutter);
  text-align: center;
  color: var(--color-text-tertiary);
  font-size: 0.85rem;
}
</style>
