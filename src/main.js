import '@fontsource-variable/geist'
import '@fontsource-variable/space-grotesk'
import './app.css'

import { createApp } from 'vue'

import App from './App.vue'
import router from './router'
import { applyTheme, getInitialTheme } from './utils/theme'

applyTheme(getInitialTheme())

createApp(App).use(router).mount('#app')
