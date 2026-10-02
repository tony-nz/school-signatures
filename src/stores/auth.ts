import { acceptHMRUpdate, defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { api, type User } from '../lib/api'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const loaded = ref(false)
  let loading: Promise<void> | null = null

  const isAdmin = computed(() => user.value?.role === 'admin')

  // Fetches the session once; later calls reuse the same request
  function load(): Promise<void> {
    loading ??= api<{ user: User | null }>('/auth/me')
      .then((r) => { user.value = r.user })
      .catch(() => { user.value = null })
      .finally(() => { loaded.value = true })
    return loading
  }

  async function login(email: string, password: string) {
    const r = await api<{ user: User }>('/auth/login', { method: 'POST', body: { email, password } })
    user.value = r.user
  }

  // Returns the new account's status; 'approved' means the user is now logged in
  async function signup(input: { email: string; password: string; businessName: string; contactName: string }) {
    const r = await api<{ user: User | null; status?: string }>('/auth/signup', { method: 'POST', body: input })
    user.value = r.user
    return r.user ? 'approved' : (r.status ?? 'pending')
  }

  async function logout() {
    await api('/auth/logout', { method: 'POST' }).catch(() => {})
    user.value = null
  }

  async function updateAccount(input: { businessName?: string; contactName?: string; logo?: string; showBusinessName?: boolean; tagline?: string }) {
    const r = await api<{ user: User }>('/account', { method: 'PUT', body: input })
    user.value = r.user
  }

  async function changePassword(currentPassword: string, newPassword: string) {
    await api('/account/password', { method: 'POST', body: { currentPassword, newPassword } })
  }

  return { user, loaded, isAdmin, load, login, signup, logout, updateAccount, changePassword }
})

// Lets Vite hot-reload this store in dev without a page refresh
if (import.meta.hot) import.meta.hot.accept(acceptHMRUpdate(useAuthStore, import.meta.hot))
