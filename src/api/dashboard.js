import { request } from '../utils/request'

export function getDashboard() {
  return request.get('/api/v1/dashboard').then(toDashboardViewModel)
}

function toDashboardViewModel(dto) {
  return {
    generatedAt: dto.GeneratedAt,
    partialFailure: dto.PartialFailure,
    home: toModule(dto.Home, toHome),
    confirmations: toModule(dto.PendingConfirmations, toConfirmation),
    activities: toModule(dto.StewardActivities, toActivity),
    todos: toModule(dto.Todos, toTodo)
  }
}

function toModule(dto = {}, itemMapper) {
  const data = dto.Data || []
  return {
    status: dto.Status,
    message: dto.Message,
    updatedAt: dto.UpdatedAt,
    data: Array.isArray(data) ? data.map(itemMapper) : itemMapper(data)
  }
}

function toHome(dto = {}) {
  return {
    name: dto.Name || dto.HomeName,
    onlineDeviceCount: dto.OnlineDeviceCount || 0,
    offlineDeviceCount: dto.OfflineDeviceCount || 0,
    degradedDeviceCount: dto.DegradedDeviceCount || 0
  }
}

function toConfirmation(dto) {
  return {
    id: dto.Id,
    riskLevel: dto.RiskLevel,
    title: dto.Title,
    impactSummary: dto.ImpactSummary,
    expiresAt: dto.ExpiresAt
  }
}

function toActivity(dto) {
  return {
    id: dto.Id,
    title: dto.Title,
    status: dto.Status,
    resultSummary: dto.ResultSummary,
    createdAt: dto.CreatedAt
  }
}

function toTodo(dto) {
  return { id: dto.Id, title: dto.Title }
}
