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

export function createExpert(payload) {
  return request
    .post('/api/v1/experts', payload)
    .then(toDetail)
}

export function updateExpert({ id, payload }) {
  return request
    .put(`/api/v1/experts/${id}`, payload)
    .then(toDetail)
}

export function removeExpert({ id }) {
  return request.delete(`/api/v1/experts/${id}`)
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
    rowVersion: dto.RowVersion,
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
    conversationId: dto.ConversationId,
    engineStage: dto.EngineStage,
    version: dto.Version,
    versionHistory: Array.isArray(dto.VersionHistory) ? dto.VersionHistory.map(toVersionHistoryItem) : []
  }
}

function toRunEvent(dto = {}) {
  const progress = toEngineProgress(dto.Payload)
  return {
    id: dto.id !== undefined ? dto.id : dto.Id,
    sequence: dto.Sequence !== undefined ? dto.Sequence : dto.sequence,
    eventType: dto.EventType || dto.Type,
    stage: progress.stage,
    status: progress.status,
    message: progress.message || dto.Message || '',
    createdAt: progress.occurredAt || dto.CreatedAt
  }
}

function toEngineProgress(payload) {
  if (!payload) return {}
  try {
    const parsed = JSON.parse(payload)
    return {
      stage: parsed.stage || parsed.Stage,
      status: parsed.status || parsed.Status,
      message: parsed.message || parsed.Message || '',
      occurredAt: parsed.occurredAt || parsed.OccurredAt
    }
  } catch (error) {
    return {}
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
    targetValue: dto.TargetValue,
    // B30 快速剪辑方案结构化视图：片段序列/配乐/总时长（时间线渲染）
    plan: {
      segments: Array.isArray(dto.Segments) ? dto.Segments.map(toPlanSegment) : [],
      audio: dto.Audio,
      totalDuration: dto.TotalDuration
    }
  }
}

function toPlanSegment(dto = {}) {
  return {
    index: dto.Index,
    source: dto.Source,
    duration: dto.Duration
  }
}

function toVersionHistoryItem(dto = {}) {
  return {
    version: dto.Version !== undefined ? dto.Version : dto.version,
    description: dto.Description || dto.ChangeDescription || dto.description || '',
    createdAt: dto.CreatedAt || dto.createdAt
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
