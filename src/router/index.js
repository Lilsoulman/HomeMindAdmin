import { createRouter, createWebHistory } from 'vue-router'
import store from '../store'
import { hasPermission } from '../utils/permission'
import { routes } from './routes'

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes,
  scrollBehavior: () => ({ left: 0, top: 0 })
})

router.beforeEach(async (to) => {
  if (!store.state.auth.initialized) {
    await store.dispatch('auth/bootstrap')
  }

  const isPublic = to.matched.some((record) => record.meta.public)
  if (!isPublic && !store.state.auth.accessToken) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  const record = [...to.matched].reverse().find((item) => item.meta.permission)
  if (record && !hasPermission(store.state.auth.role, record.meta.permission)) {
    return { name: 'forbidden' }
  }

  document.title = `${to.meta.title || 'HomeMind'} | HomeMind`
})

export default router
