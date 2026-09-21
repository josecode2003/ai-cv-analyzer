import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'home',
    component: () => import('../views/HomeView.vue')
  },
  {
    path: '/analyses',
    name: 'analyses',
    component: () => import('../views/AnalysesView.vue')
  },
  {
    path: '/analyses/:id',
    name: 'analysis',
    component: () => import('../views/AnalysisView.vue')
  },
  {
    path: '/analyses/:id/compare',
    name: 'compare',
    component: () => import('../views/ComparisonFormView.vue')
  },
  {
    path: '/comparisons',
    name: 'comparisons',
    component: () => import('../views/ComparisonsView.vue')
  },
  {
    path: '/comparisons/:id',
    name: 'comparison-result',
    component: () => import('../views/ComparisonResultView.vue')
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
