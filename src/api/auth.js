import { request } from '../utils/request'

export function login(payload) {
  return request.post('/api/v1/auth/login', payload).then(toSession)
}

export function refresh(refreshToken) {
  return request.post('/api/v1/auth/refresh', { refreshToken }).then(toSession)
}

export function getCurrentUser() {
  return request.get('/api/v1/auth/me').then(toUser)
}

export function logout() {
  return request.post('/api/v1/auth/logout')
}

function toSession(dto) {
  return {
    accessToken: dto.AccessToken,
    refreshToken: dto.RefreshToken,
    userId: dto.UserId,
    tenantId: dto.TenantId
  }
}

function toUser(dto) {
  return {
    id: dto.Id || dto.id,
    displayName: dto.DisplayName || dto.displayName,
    avatarUrl: dto.AvatarUrl || dto.avatarUrl,
    status: dto.Status || dto.status,
    timezone: dto.Timezone || dto.timezone,
    locale: dto.Locale || dto.locale,
    role: dto.Role || dto.role || '',
    createdAt: dto.CreatedAt || dto.createdAt
  }
}
