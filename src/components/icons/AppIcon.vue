<script setup>
import { computed } from 'vue'

const props = defineProps({
  name: {
    type: String,
    required: true
  }
})

/*
 * Set de iconos propio en trazo (estilo "stroke"), para no depender de una
 * librería externa ni de emojis como iconografía de sección.
 */
const ICONS = {
  user: '<circle cx="12" cy="8" r="4"></circle><path d="M4 20a8 8 0 0 1 16 0"></path>',
  briefcase:
    '<rect x="2.5" y="7" width="19" height="13" rx="2"></rect><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><path d="M2.5 13h19"></path>',
  'graduation-cap':
    '<path d="M2 8 12 3l10 5-10 5-10-5Z"></path><path d="M6 10.5V16c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5v-5.5"></path><path d="M22 8v6"></path>',
  tool: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.4-3.4a6 6 0 0 1-7.9 7.9l-6.6 6.6a2.1 2.1 0 0 1-3-3l6.6-6.6a6 6 0 0 1 7.9-7.9Z"></path>',
  trophy:
    '<path d="M7 4h10v4a5 5 0 0 1-10 0V4Z"></path><path d="M7 5H4.5A2.5 2.5 0 0 0 7 9.5"></path><path d="M17 5h2.5A2.5 2.5 0 0 1 17 9.5"></path><path d="M12 13v4"></path><path d="M8 21h8"></path>',
  award:
    '<circle cx="12" cy="8" r="6"></circle><path d="m8.5 13.5-1.3 8.3 4.8-2.9 4.8 2.9-1.3-8.3"></path>',
  compass:
    '<circle cx="12" cy="12" r="10"></circle><path d="m15.5 8.5-2 5-5 2 2-5Z"></path>',
  users:
    '<path d="M16 21v-1.5a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4V21"></path><circle cx="9" cy="8" r="3.5"></circle><path d="M22 21v-1.5a4 4 0 0 0-3-3.9"></path><path d="M15.5 4.6a3.5 3.5 0 0 1 0 6.8"></path>',
  'thumbs-up':
    '<path d="M7 21H4a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1h3Z"></path><path d="M7 11l3.5-7a2 2 0 0 1 2 2v4h4.6a2 2 0 0 1 2 2.4l-1.2 6A2 2 0 0 1 16 20H7Z"></path>',
  'alert-triangle':
    '<path d="M10.3 3.9 2 18a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"></path><path d="M12 9v4"></path><path d="M12 17h.01"></path>',
  rocket:
    '<path d="M13.5 2.5c2.4 1.8 4 4.9 4 8 0 1.8-.8 3.7-1.8 4.9l-1.7 1.9-1.7-1.9c-1-1.2-1.8-3.1-1.8-4.9 0-3.1 1.6-6.2 4-8Z"></path><path d="m9 15-2.5 2.5.6 3.4 3.4-.6"></path><path d="m15 15 2.5 2.5-.6 3.4-3.4-.6"></path><circle cx="13.5" cy="9.5" r="1.5"></circle>',
  'bar-chart':
    '<path d="M4 20V10"></path><path d="M12 20V4"></path><path d="M20 20v-7"></path>'
}

const markup = computed(() => ICONS[props.name] || '')
</script>

<template>
  <!-- Contenido fijo definido en ICONS (no proviene de datos de usuario). -->
  <!-- eslint-disable vue/no-v-html -->
  <svg
    class="app-icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
    v-html="markup"
  ></svg>
  <!-- eslint-enable vue/no-v-html -->
</template>
