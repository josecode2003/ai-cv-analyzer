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
    <RouterView v-slot="{ Component, route }">
      <Transition name="route-fade" mode="out-in">
        <component :is="Component" :key="route.path" />
      </Transition>
    </RouterView>
  </AppLayout>
</template>
