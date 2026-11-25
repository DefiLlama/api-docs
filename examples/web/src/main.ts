import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'

import App from './App.vue'
import { upgradeLegacyAnchor } from './legacy-anchor'
import { routes } from './routes'
import './style.css'

upgradeLegacyAnchor()

const router = createRouter({
  history: createWebHistory(),
  routes,
})

createApp(App).use(router).mount('#app')
