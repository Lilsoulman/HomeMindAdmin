import { request } from '../utils/request'

export function listConfirmations({ homeId, riskLevel, status }) {
  return request
    .get(`/api/v1/homes/${homeId}/confirmations`, {
      params: cleanParams({ riskLevel, status })
    })
    .then((items) => (Array.isArray(items) ? items.map(toConfirmation) : []))
}

export function confirmConfirmation({ homeId, id, idempotencyKey }) {
  return request
    .post(`/api/v1/homes/${homeId}/confirmations/${id}/confirm`, { idempotencyKey })
    .then(toConfirmation)
}

export function denyConfirmation({ homeId, id, reason }) {
  return request
    .post(`/api/v1/homes/${homeId}/confirmations/${id}/deny`, { reason })
    .then(toConfirmation)
}

export function batchConfirmConfirmations({ homeId, ids, idempotencyKey }) {
  return request
    .post(`/api/v1/homes/${homeId}/confirmations/batch-confirm`, {
      confirmationIds: ids,
      idempotencyKey
    })
    .then(toBatchResult)
}

function cleanParams(params) {
  return Object.entries(params).reduce((result, [key, value]) => {
    if (value != null && value !== '') result[key] = value
    return result
  }, {})
}

function toConfirmation(dto = {}) {
  return {
    id: dto.Id,
    activityId: dto.ActivityId,
    riskLevel: dto.RiskLevel,
    title: dto.Title,
    description: dto.Description,
    impactSummary: dto.ImpactSummary,
    suggestedAction: dto.SuggestedAction,
    status: dto.Status,
    expiresAt: dto.ExpiresAt,
    confirmedAt: dto.ConfirmedAt,
    deniedAt: dto.DeniedAt,
    expiredAt: dto.ExpiredAt,
    updatedAt: dto.UpdatedAt
  }
}

function toBatchResult(dto = {}) {
  return {
    confirmedCount: dto.ConfirmedCount || 0,
    items: Array.isArray(dto.Items) ? dto.Items.map(toConfirmation) : []
  }
}
