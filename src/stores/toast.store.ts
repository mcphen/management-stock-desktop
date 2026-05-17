import { defineStore } from 'pinia'
import { ref } from 'vue'

export type ToastType = 'success' | 'error' | 'info'

export interface Toast {
  id: number
  message: string
  type: ToastType
}

let _id = 0

export const useToastStore = defineStore('toast', () => {
  const toasts = ref<Toast[]>([])

  function show(message: string, type: ToastType = 'success', duration = 3200) {
    const id = ++_id
    toasts.value.push({ id, message, type })
    setTimeout(() => remove(id), duration)
  }

  function remove(id: number) {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }

  return { toasts, show, remove }
})
