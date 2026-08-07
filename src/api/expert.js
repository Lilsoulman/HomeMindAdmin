import { request } from '../utils/request'

// ─── 专家目录 ───

export function listExperts({ query, category, type, scope } = {}) {
  return request
    .get('/api/v1/experts', { params: cleanParams({ query, category, type, scope }) })
    .then((items) => (Array.isArray(items) ? items.map(toCatalogItem) : []))
}

export function getExpert({ id, type }) {
  return request
    .get(`/api/v1/experts/${id}`, { params: cleanParams({ type }) })
    .then(toDetail)
}

// ─── Run ───

export function getRun({ id }) {
  return request
    .get(`/api/v1/expert-runs/${id}`)
    .then(toRun)
}

export function getRunEvents({ id }) {
  return request
    .get(`/api/v1/expert-runs/${id}/events`)
    .then((items) => (Array.isArray(items) ? items.map(toRunEvent) : []))
}

export function getRunActions({ id }) {
  return request
    .get(`/api/v1/expert-runs/${id}/actions`)
    .then(toActions)
}

export function confirmRunAction({ runId, actionId, idempotencyKey }) {
  return request
    .post(`/api/v1/expert-runs/${runId}/actions/${actionId}/confirm`, { idempotencyKey })
    .then(toExecution)
}

function cleanParams(params) {
  return Object.entries(params).reduce((result, [key, value]) => {
    if (value != null && value !== '') result[key] = value
    return result
  }, {})
}

function toCatalogItem(dto = {}) {
  return {
    id: dto.Id,
    catalogType: dto.CatalogType,
    source: dto.Source,
    code: dto.Code,
    name: dto.Name,
    category: dto.Category,
    description: dto.Description,
    estimatedCredits: dto.EstimatedCredits
  }
}

function toDetail(dto = {}) {
  return {
    id: dto.Id,
    code: dto.Code,
    name: dto.Name,
    category: dto.Category,
    description: dto.Description,
    privacyScope: dto.PrivacyScope,
    source: dto.Source,
    versionId: dto.VersionId,
    version: dto.Version,
    persona: dto.Persona,
    methodology: dto.Methodology,
    toolPolicy: dto.ToolPolicy,
    outputSchema: dto.OutputSchema,
    estimatedCredits: dto.EstimatedCredits
  }
}

function toRun(dto = {}) {
  return {
    id: dto.Id !== undefined ? dto.Id : dto.id,
    sourceType: dto.SourceType,
    status: dto.Status !== undefined ? dto.Status : dto.status,
    resultSummary: dto.ResultSummary,
    estimatedCredits: dto.EstimatedCredits,
    actualCredits: dto.ActualCredits,
    createdAt: dto.CreatedAt,
    startedAt: dto.StartedAt,
    finishedAt: dto.FinishedAt,
    conversationId: dto.ConversationId
  }
}

function toRunEvent(dto = {}) {
  return {
    id: dto.id !== undefined ? dto.id : dto.Id,
    sequence: dto.Sequence !== undefined ? dto.Sequence : dto.sequence,
    eventType: dto.EventType || dto.Type,
    message: readablePayload(dto.Payload) || dto.Message || '',
    createdAt: dto.CreatedAt
  }
}

function readablePayload(payload) {
  if (!payload) return ''
  try {
    const parsed = JSON.parse(payload)
    return parsed.message || parsed.Message || ''
  } catch (error) {
    return ''
  }
}

function toActions(dto = {}) {
  return {
    events: Array.isArray(dto.Events) ? dto.Events.map(toRunEvent) : [],
    actions: Array.isArray(dto.Actions) ? dto.Actions.map(toRunAction) : []
  }
}

function toRunAction(dto = {}) {
  return {
    id: dto.Id,
    actionType: dto.ActionType,
    status: dto.Status,
    title: dto.Title,
    description: dto.Description,
    deviceId: dto.DeviceId,
    deviceName: dto.DeviceName,
    capability: dto.Capability,
    targetValue: dto.TargetValue
  }
}

function toExecution(dto = {}) {
  return {
    actionId: dto.ActionId,
    status: dto.Status,
    message: dto.Message,
    updatedAt: dto.UpdatedAt
  }
}
