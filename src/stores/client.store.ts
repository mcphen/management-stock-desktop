import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Client } from '../electron.d'

export const useClientStore = defineStore('clients', () => {
  const clients     = ref<Client[]>([])
  const total       = ref(0)
  const isLoading   = ref(false)
  const currentPage = ref(1)
  const perPage     = ref(50)

  async function fetch(params: Record<string, unknown> = {}): Promise<void> {
    isLoading.value = true
    try {
      const result = await window.electron.clients.list({
        page:     currentPage.value,
        per_page: perPage.value,
        ...params,
      })
      clients.value = result.data
      total.value   = result.total
    } finally {
      isLoading.value = false
    }
  }

  async function create(data: Partial<Client>): Promise<Client> {
    const created = await window.electron.clients.create(data)
    clients.value.unshift(created)
    total.value++
    return created
  }

  async function update(id: number, data: Partial<Client>): Promise<Client> {
    const updated = await window.electron.clients.update(id, data)
    const index   = clients.value.findIndex((c) => c.id === id)
    if (index !== -1) clients.value[index] = updated
    return updated
  }

  async function remove(id: number): Promise<void> {
    await window.electron.clients.delete(id)
    clients.value = clients.value.filter((c) => c.id !== id)
    total.value--
  }

  return { clients, total, isLoading, currentPage, perPage, fetch, create, update, remove }
})
