import * as authApi from '../../api/auth'
import { configureSessionRefresh } from '../../utils/request'
import { getAccessToken, getInstallationId, getTenantId, setAccessToken, setTenantId } from '../../utils/storage'

let refreshToken = null

const state = {
  accessToken: getAccessToken(),
  tenantId: getTenantId(),
  user: null,
  role: '',
  initialized: false
}

const mutations = {
  SET_SESSION(currentState, session) {
    currentState.accessToken = session.accessToken
    currentState.tenantId = session.tenantId != null ? session.tenantId : getTenantId()
    refreshToken = session.refreshToken
    setAccessToken(session.accessToken)
    setTenantId(currentState.tenantId)
  },
  SET_USER(currentState, user) {
    currentState.user = user
    currentState.role = (user && user.role) || ''
  },
  SET_INITIALIZED(currentState, initialized) {
    currentState.initialized = initialized
  },
  CLEAR_SESSION(currentState) {
    currentState.accessToken = null
    currentState.tenantId = null
    currentState.user = null
    currentState.role = ''
    refreshToken = null
    setAccessToken(null)
    setTenantId(null)
  }
}

const actions = {
  async signIn({ dispatch }, credentials) {
    const session = await authApi.login({
      ...credentials,
      installationId: getInstallationId(),
      platform: 'web'
    })
    await dispatch('applySession', session)
  },
  async applySession({ commit }, session) {
    commit('SET_SESSION', session)
    const user = await authApi.getCurrentUser()
    commit('SET_USER', user)
  },
  async bootstrap({ state: currentState, commit }) {
    if (!currentState.accessToken) {
      commit('SET_INITIALIZED', true)
      return
    }
    try {
      const user = await authApi.getCurrentUser()
      commit('SET_USER', user)
    } catch (error) {
      commit('CLEAR_SESSION')
    } finally {
      commit('SET_INITIALIZED', true)
    }
  },
  async refresh({ dispatch, commit }) {
    if (!refreshToken) {
      commit('CLEAR_SESSION')
      return Promise.reject(new Error('会话已过期，请重新登录。'))
    }
    const session = await authApi.refresh(refreshToken)
    await dispatch('applySession', session)
  },
  async signOut({ commit }) {
    try {
      await authApi.logout()
    } finally {
      commit('CLEAR_SESSION')
    }
  }
}

const auth = { namespaced: true, state, mutations, actions }

export function installAuthRefresh(store) {
  configureSessionRefresh(() => store.dispatch('auth/refresh'))
}

export default auth
