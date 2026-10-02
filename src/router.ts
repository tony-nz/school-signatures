import { createRouter, createWebHistory } from 'vue-router'
import EditorView from './views/EditorView.vue'
import { useAuthStore } from './stores/auth'

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    requiresAdmin?: boolean
  }
}

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: EditorView, meta: { requiresAuth: true } },
    { path: '/login', component: () => import('./views/LoginView.vue') },
    { path: '/signup', component: () => import('./views/SignupView.vue') },
    { path: '/account', component: () => import('./views/AccountView.vue'), meta: { requiresAuth: true } },
    { path: '/admin', component: () => import('./views/AdminView.vue'), meta: { requiresAuth: true, requiresAdmin: true } },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  await auth.load()
  if (to.meta.requiresAuth && !auth.user) return { path: '/login', query: { redirect: to.fullPath } }
  if (to.meta.requiresAdmin && !auth.isAdmin) return '/'
  if ((to.path === '/login' || to.path === '/signup') && auth.user) return '/'
})
