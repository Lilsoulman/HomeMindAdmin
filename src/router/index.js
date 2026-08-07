import Vue from 'vue'
import Router from 'vue-router'
import store from '../store'
import { hasPermission } from '../utils/permission'
import { routes } from './routes'

Vue.use(Router)

const router = new Router({
  mode: 'history',
  base: process.env.BASE_URL,
  routes,
  scrollBehavior: () => ({ x: 0, y: 0 })
})

router.beforeEach(async (to, from, next) => {
  if (!store.state.auth.initialized) {
    await store.dispatch('auth/bootstrap')
  }

  const isPublic = to.matched.some((record) => record.meta.public)
  if (!isPublic && !store.state.auth.accessToken) {
    next({ name: 'login', query: { redirect: to.fullPath } })
    return
  }

  const record = [...to.matched].reverse().find((item) => item.meta.permission)
  if (record && !hasPermission(store.state.auth.role, record.meta.permission)) {
    next({ name: 'forbidden' })
    return
  }

  document.title = `${to.meta.title || 'NexusMind'} | NexusMind`
  next()
})

export default router
