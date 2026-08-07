import { request } from '../utils/request'

const DEFAULT_LIMIT = 20

export function listActivities({ homeId, limit = DEFAULT_LIMIT, cursor }) {
  return request
    .get(`/api/v1/homes/${homeId}/activities`, {
      params: cleanParams({ limit, cursor })
    })
    .then(toPage)
}

export function getActivity({ homeId, id }) {
  return request
    .get(`/api/v1/homes/${homeId}/activities/${id}`)
    .then(toActivity)
}

export function undoActivity({ homeId, id }) {
  return request
    .post(`/api/v1/homes/${homeId}/activities/${id}/undo`)
    .then(toActivity)
}

function cleanParams(params) {
  return Object.entries(params).reduce((result, [key, value]) => {
    if (value != null && value !== '') result[key] = value
    return result
  }, {})
}

function toPage(dto = {}) {
  return {
    items: Array.isArray(dto.Items) ? dto.Items.map(toActivity) : [],
    cursor: dto.Cursor || null
  }
}

function toActivity(dto = {}) {
  return {
    id: dto.Id,
    runId: dto.RunId,
    category: dto.Category,
    title: dto.Title,
    description: dto.Description,
    riskLevel: dto.RiskLevel,
    status: dto.Status,
    resultSummary: dto.ResultSummary,
    undoable: Boolean(dto.Undoable),
    undoneAt: dto.UndoneAt,
    createdAt: dto.CreatedAt,
    updatedAt: dto.UpdatedAt
  }
}
