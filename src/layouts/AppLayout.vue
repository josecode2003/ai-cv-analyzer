<script setup>
import { useRouter, useRoute } from 'vue-router'

import { useSession } from '../stores/session'

const router = useRouter()
const route = useRoute()

const { state, analysesCount, comparisonsCount } = useSession()
</script>

<template>
  <div class="app">
    <header class="header">
      <button class="logo" @click="router.push('/')">
        <span class="logo-icon"> AI </span>

        <span> CV Analyzer </span>
      </button>

      <nav class="navigation">
        <button
          :class="{ active: route.name === 'home' }"
          @click="router.push('/')"
        >
          Inicio
        </button>

        <button
          :class="{
            active: ['analyses', 'analysis', 'compare'].includes(route.name)
          }"
          @click="router.push('/analyses')"
        >
          Mis análisis

          <span v-if="analysesCount" class="nav-count">
            {{ analysesCount }}
          </span>
        </button>

        <button
          :class="{
            active: ['comparisons', 'comparison-result'].includes(route.name)
          }"
          @click="router.push('/comparisons')"
        >
          Comparaciones

          <span v-if="comparisonsCount" class="nav-count">
            {{ comparisonsCount }}
          </span>
        </button>
      </nav>

      <div class="header-user">
        <div class="api-status">
          <span class="status-dot" :class="state.apiStatus"></span>

          <span>
            {{
              state.apiStatus === 'online'
                ? 'API conectada'
                : state.apiStatus === 'offline'
                  ? 'API desconectada'
                  : 'Conectando...'
            }}
          </span>
        </div>
      </div>
    </header>

    <main class="main">
      <slot />
    </main>

    <footer class="footer">
      <p>AI CV Analyzer · Proyecto de portfolio</p>
    </footer>
  </div>
</template>
