import { request } from '../utils/request'

export function listProviders() {
  return request
    .get('/api/v1/connector-providers')
    .then((items) => (Array.isArray(items) ? items.map(toProvider) : []))
}

export function listConnectors() {
  return request
    .get('/api/v1/connectors')
    .then((items) => (Array.isArray(items) ? items.map(toConnector) : []))
}

export function createConnector(payload) {
  return request
    .post('/api/v1/connectors', payload)
    .then(toConnector)
}

export function testConnector({ id }) {
  return request
    .post(`/api/v1/connectors/${id}/test`)
    .then(toOperation)
}

export function discoverConnector({ id }) {
  return request
    .post(`/api/v1/connectors/${id}/discovery`)
    .then(toOperation)
}

export function syncConnector({ id }) {
  return request
    .post(`/api/v1/connectors/${id}/sync`)
    .then(toSyncJob)
}

export function getSyncJob({ jobId }) {
  return request
    .get(`/api/v1/connectors/sync-jobs/${jobId}`)
    .then(toSyncJob)
}

export function getMyAuthorization({ id }) {
  return request
    .get(`/api/v1/connectors/${id}/authorization`)
    .then(toAuthorization)
}

export function updateMemberAuthorization({ id, memberUserId, scopes }) {
  return request
    .put(`/api/v1/connectors/${id}/authorizations/${memberUserId}`, { scopes })
    .then(toAuthorization)
}

export function getMyConnections() {
  return request
    .get('/api/v1/connector-authorizations/my')
    .then((items) => (Array.isArray(items) ? items.map(toMyConnection) : []))
}

export function startPersonalAuthorization({ providerCode, redirectUri }) {
  return request
    .post(`/api/v1/connector-providers/${providerCode}/authorizations`, { redirectUri })
    .then(toAuthorizationSession)
}

export function getAuthorizationSession({ id }) {
  return request
    .get(`/api/v1/connector-authorizations/${id}`)
    .then(toAuthorizationSession)
}

export function pollAuthorization({ id }) {
  return request
    .post(`/api/v1/connector-authorizations/${id}/poll`)
    .then(toAuthorizationSession)
}

export function revokePersonalAuthorization({ id }) {
  return request
    .delete(`/api/v1/connector-authorizations/${id}`)
    .then(toAuthorizationSession)
}

function toProvider(dto = {}) {
  return {
    id: dto.Id,
    code: dto.Code,
    name: dto.Name,
    connectorType: dto.ConnectorType,
    description: dto.Description
  }
}

function toConnector(dto = {}) {
  return {
    id: dto.Id,
    providerId: dto.ProviderId,
    providerCode: dto.ProviderCode,
    providerName: dto.ProviderName,
    name: dto.Name,
    status: dto.Status,
    lastSyncAt: dto.LastSyncAt,
    lastHealthAt: dto.LastHealthAt,
    createdAt: dto.CreatedAt,
    updatedAt: dto.UpdatedAt,
    bindingScope: dto.BindingScope || 'household',
    isCurrentUserOwner: Boolean(dto.IsCurrentUserOwner)
  }
}

function toOperation(dto = {}) {
  return {
    connectorId: dto.ConnectorId,
    status: dto.Status,
    deviceCount: dto.DeviceCount || 0,
    lastHealthAt: dto.LastHealthAt,
    lastSyncAt: dto.LastSyncAt
  }
}

function toSyncJob(dto = {}) {
  return {
    id: dto.Id,
    connectorId: dto.ConnectorId,
    status: dto.Status,
    reason: dto.Reason,
    attemptNo: dto.AttemptNo || 0,
    availableAt: dto.AvailableAt,
    completedAt: dto.CompletedAt,
    updatedAt: dto.UpdatedAt
  }
}

function toAuthorization(dto = {}) {
  return {
    connectorId: dto.ConnectorId,
    userId: dto.UserId,
    scopes: Array.isArray(dto.Scopes) ? dto.Scopes : [],
    updatedAt: dto.UpdatedAt
  }
}

function toAuthorizationSession(dto = {}) {
  return {
    sessionId: dto.SessionId,
    providerCode: dto.ProviderCode,
    providerName: dto.ProviderName,
    status: dto.Status,
    expiresAt: dto.ExpiresAt,
    authorizationUrl: dto.AuthorizationUrl,
    qrContent: dto.QrContent
  }
}

function toMyConnection(dto = {}) {
  return {
    connectorId: dto.ConnectorId,
    providerId: dto.ProviderId,
    providerCode: dto.ProviderCode,
    providerName: dto.ProviderName,
    name: dto.Name,
    status: dto.Status,
    authStatus: dto.AuthStatus,
    lastSyncAt: dto.LastSyncAt,
    lastHealthAt: dto.LastHealthAt,
    lastSessionId: dto.LastSessionId,
    lastSessionStatus: dto.LastSessionStatus,
    lastSessionExpiresAt: dto.LastSessionExpiresAt
  }
}
