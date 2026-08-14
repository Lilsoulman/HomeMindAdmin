import { request } from '../utils/request'

export function listLearningMemories({ scope, kind, status, query, limit = 20, cursor } = {}) {
  return request.get('/api/v1/memories', { params: cleanParams({ scope, kind, status, query, limit, cursor }) }).then(toPage)
}

function cleanParams(params) {
  return Object.entries(params).reduce((result, [key, value]) => {
    if (value != null && value !== '') result[key] = value
    return result
  }, {})
}

function toPage(dto = {}) {
  return { items: Array.isArray(dto.Items) ? dto.Items.map(toMemory) : [], cursor: dto.NextCursor || null }
}

function toMemory(dto = {}) {
  return { id: dto.Id, summary: dto.Summary, kind: dto.Kind, visibility: dto.Visibility, stability: dto.Stability, status: dto.Status, learnedAt: dto.LearnedAt, expiresAt: dto.ExpiresAt, sourceReferences: Array.isArray(dto.SourceReferences) ? dto.SourceReferences.map((item) => ({ type: item.Type, id: item.Id })) : [], restrictedReferenceCount: dto.RestrictedReferenceCount || 0, resolutionSummary: dto.ResolutionSummary }
}
