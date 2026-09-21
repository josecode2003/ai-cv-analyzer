<script setup>
import { onMounted } from 'vue'

import AppLayout from './layouts/AppLayout.vue'
import { useSession } from './stores/session'

const { checkBackend, loadAnalyses, loadComparisons } = useSession()

onMounted(() => {
  checkBackend()
  loadAnalyses()
  loadComparisons()
})
</script>

<template>
  <AppLayout>
    <RouterView />
  </AppLayout>
</template>
