import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Router } from 'vue-router'

interface User {
  id: number
  name: string
  email: string
}

export const useAuthStore = defineStore('auth', () => {
  const user        = ref<User | null>(null)
  const isLoading   = ref(false)
  const error       = ref<string | null>(null)

  const isAuthenticated = computed(() => user.value !== null)

  async function init(): Promise<void> {
    const session = await window.electron.auth.getSession()
    if (session) {
      user.value = session.user
    }
  }

  async function login(email: string, password: string): Promise<void> {
    isLoading.value = true
    error.value     = null

    try {
      const result = await window.electron.auth.login(email, password, 'desktop-windows')
      user.value   = result.user
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur de connexion.'
      try {
        error.value = JSON.parse(msg)?.message ?? msg
      } catch {
        error.value = msg
      }
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function logout(router?: Router): Promise<void> {
    await window.electron.auth.logout()
    user.value = null
    router?.push('/login')
  }

  return { user, isLoading, error, isAuthenticated, init, login, logout }
})
