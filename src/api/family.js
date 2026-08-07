import { request } from '../utils/request'

// ─── 家庭成员 ───

export function listMembers({ homeId }) {
  return request
    .get(`/api/v1/homes/${homeId}/members`)
    .then((items) => (Array.isArray(items) ? items.map(toMember) : []))
}

export function createMember({ homeId, payload }) {
  return request
    .post(`/api/v1/homes/${homeId}/members`, payload)
    .then(toMember)
}

export function updateMember({ homeId, id, payload }) {
  return request
    .put(`/api/v1/homes/${homeId}/members/${id}`, payload)
    .then(toMember)
}

export function correctMember({ homeId, id, memberStatus, reason }) {
  return request
    .post(`/api/v1/homes/${homeId}/members/${id}/correction`, { memberStatus, reason })
    .then(toMember)
}

// ─── 家庭知识 ───

export function listKnowledge({ homeId, category }) {
  return request
    .get(`/api/v1/homes/${homeId}/knowledge`, { params: cleanParams({ category }) })
    .then((items) => (Array.isArray(items) ? items.map(toKnowledge) : []))
}

export function writeKnowledge({ homeId, payload }) {
  return request
    .post(`/api/v1/homes/${homeId}/knowledge`, payload)
    .then(toWriteResult)
}

export function deleteKnowledge({ homeId, id }) {
  return request.delete(`/api/v1/homes/${homeId}/knowledge/${id}`)
}

// ─── 家庭决策 ───

const DEFAULT_LIMIT = 20

export function listDecisions({ homeId, memberId, limit = DEFAULT_LIMIT, cursor }) {
  return request
    .get(`/api/v1/homes/${homeId}/decisions`, {
      params: cleanParams({ memberId, limit, cursor })
    })
    .then(toPage)
}

export function recordDecision({ homeId, payload }) {
  return request
    .post(`/api/v1/homes/${homeId}/decisions`, payload)
    .then(toDecision)
}

function cleanParams(params) {
  return Object.entries(params).reduce((result, [key, value]) => {
    if (value != null && value !== '') result[key] = value
    return result
  }, {})
}

function toMember(dto = {}) {
  return {
    id: dto.Id,
    name: dto.Name,
    relation: dto.Relation,
    birthday: dto.Birthday,
    isElderly: Boolean(dto.IsElderly),
    isChild: Boolean(dto.IsChild),
    isPrimary: Boolean(dto.IsPrimary),
    memberStatus: dto.MemberStatus,
    preferences: dto.Preferences,
    createdAt: dto.CreatedAt,
    updatedAt: dto.UpdatedAt
  }
}

function toKnowledge(dto = {}) {
  return {
    id: dto.Id,
    category: dto.Category,
    key: dto.Key,
    value: dto.Value,
    notes: dto.Notes,
    sourceType: dto.SourceType,
    sourceMemberId: dto.SourceMemberId,
    confidenceScore: dto.ConfidenceScore,
    conflictResolutionStrategy: dto.ConflictResolutionStrategy,
    resolutionSummary: dto.ResolutionSummary,
    createdAt: dto.CreatedAt,
    updatedAt: dto.UpdatedAt
  }
}

function toWriteResult(dto = {}) {
  return {
    knowledge: toKnowledge(dto.Knowledge),
    resolution: dto.Resolution ? {
      knowledgeId: dto.Resolution.KnowledgeId,
      conflictKey: dto.Resolution.ConflictKey,
      strategy: dto.Resolution.Strategy,
      resolutionSummary: dto.Resolution.ResolutionSummary,
      conflictingIds: Array.isArray(dto.Resolution.ConflictingIds) ? dto.Resolution.ConflictingIds : []
    } : null
  }
}

function toDecision(dto = {}) {
  return {
    id: dto.Id,
    scenario: dto.Scenario,
    decisionMade: dto.DecisionMade,
    rationale: dto.Rationale,
    alternatives: dto.Alternatives,
    madeByMemberId: dto.MadeByMemberId,
    decidedAt: dto.DecidedAt,
    updatedAt: dto.UpdatedAt
  }
}

function toPage(dto = {}) {
  return {
    items: Array.isArray(dto.Items) ? dto.Items.map(toDecision) : [],
    cursor: dto.Cursor || null
  }
}
