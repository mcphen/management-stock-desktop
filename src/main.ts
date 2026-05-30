import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router'
import { installRendererErrorBoundary, showRendererError } from './renderer-error-boundary'
import './assets/main.css'

installRendererErrorBoundary()

const app = createApp(App)
app.config.errorHandler = (error) => showRendererError(error)
app.use(createPinia())
app.use(router)
app.mount('#app')
