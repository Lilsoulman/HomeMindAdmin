import axios from 'axios'
import { getAccessToken } from './storage'

let refreshSession = null
let isRefreshing = false
let waitingRequests = []

export const request = axios.create({
  baseURL: process.env.VUE_APP_API_BASE_URL || '',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json; charset=utf-8' }
})

export function configureSessionRefresh(handler) {
  refreshSession = handler
}

request.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

request.interceptors.response.use(
  (response) => unwrap(response),
  async (error) => {
    const original = error.config || {}
    if (shouldRefresh(error, original)) {
      return retryAfterRefresh(original)
    }
    return Promise.reject(toApiError(error))
  }
)

function unwrap(response) {
  const body = response.data
  if (body && Object.prototype.hasOwnProperty.call(body, 'Code')) {
    if (body.Code !== 0) {
      return Promise.reject(toApiError({ response, message: body.Msg }))
    }
    return body.Data
  }
  return body
}

function shouldRefresh(error, config) {
  const code = error.response && error.response.data && error.response.data.Code
  return error.response && error.response.status === 401 && code === 20001 && !config.__retried && refreshSession
}

function retryAfterRefresh(config) {
  config.__retried = true
  if (!isRefreshing) {
    isRefreshing = true
    refreshSession()
      .then(() => settleWaitingRequests())
      .catch((error) => settleWaitingRequests(error))
      .finally(() => { isRefreshing = false })
  }

  return new Promise((resolve, reject) => {
    waitingRequests.push({ resolve, reject, config })
  })
}

function settleWaitingRequests(error) {
  const pending = waitingRequests
  waitingRequests = []
  pending.forEach(({ resolve, reject, config }) => {
    if (error) {
      reject(error)
    } else {
      resolve(request(config))
    }
  })
}

export function toApiError(error) {
  const response = error.response
  const body = response && response.data
  return {
    status: response ? response.status : 0,
    code: body && body.Code ? body.Code : 0,
    message: (body && body.Msg) || error.message || '网络连接异常，请稍后重试。',
    retryable: !response || response.status >= 500
  }
}
