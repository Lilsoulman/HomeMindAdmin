const ACCESS_TOKEN_KEY = 'nexusmind.admin.access-token'
const TENANT_ID_KEY = 'nexusmind.admin.tenant-id'
const INSTALLATION_ID_KEY = 'nexusmind.admin.installation-id'

export function getAccessToken() {
  return window.sessionStorage.getItem(ACCESS_TOKEN_KEY)
}

export function setAccessToken(token) {
  if (token) {
    window.sessionStorage.setItem(ACCESS_TOKEN_KEY, token)
  } else {
    window.sessionStorage.removeItem(ACCESS_TOKEN_KEY)
  }
}

export function getTenantId() {
  const value = window.sessionStorage.getItem(TENANT_ID_KEY)
  return value ? Number(value) : null
}

export function setTenantId(tenantId) {
  if (tenantId != null) {
    window.sessionStorage.setItem(TENANT_ID_KEY, String(tenantId))
  } else {
    window.sessionStorage.removeItem(TENANT_ID_KEY)
  }
}

export function getInstallationId() {
  let installationId = window.localStorage.getItem(INSTALLATION_ID_KEY)
  if (!installationId) {
    installationId = createUuid()
    window.localStorage.setItem(INSTALLATION_ID_KEY, installationId)
  }
  return installationId
}

function createUuid() {
  if (window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16)
    const value = character === 'x' ? random : (random & 0x3) | 0x8
    return value.toString(16)
  })
}
