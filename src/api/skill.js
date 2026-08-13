import { request } from '../utils/request'

// ─── Skill 目录（B34） ──────────────────────────────────────────────────────

export function listSkills({ scope } = {}) {
  return request
    .get('/api/v1/skills', { params: cleanParams({ scope }) })
    .then((items) => (Array.isArray(items) ? items.map(toSkillCatalogItem) : []))
}

export function getSkill({ id }) {
  return request
    .get(`/api/v1/skills/${id}`)
    .then(toSkillDetail)
}

// ─── Skill 独立运行（快速剪辑 B24/B25/B31）───

export function createSkillRun({ skillCode, inputJson, idempotencyKey, taskId }) {
  return request
    .post(`/api/v1/skills/${skillCode}/runs`, { idempotencyKey, inputJson, taskId: taskId || null })
    .then(toSkillRun)
}

export function createMindmapRun({ markdown, idempotencyKey }) {
  return request
    .post('/api/v1/skills/mindmap/runs', { idempotencyKey, markdown })
    .then(toSkillRun)
}

export function reviseSkillRun({ runId, instruction, idempotencyKey }) {
  return request
    .post(`/api/v1/skills/runs/${runId}/revise`, { instruction, idempotencyKey })
    .then(toSkillRun)
}

export function confirmSkillAction({ runId, actionId, idempotencyKey }) {
  return request
    .post(`/api/v1/skills/runs/${runId}/actions/${actionId}/confirm`, { idempotencyKey })
    .then(toExecution)
}

export function getFileReadToken({ fileId }) {
  return request
    .post(`/api/v1/expert-files/${fileId}/read-token`, null, { params: { purpose: 'download' } })
    .then(toReadToken)
}

// ─── 素材登记（B29）───

export function uploadClippingMaterial({ file, onProgress }) {
  const formData = new FormData()
  formData.append('file', file)
  return request
    .post('/api/v1/clipping/materials', formData, {
      headers: { 'Content-Type': undefined }, // 移除默认 JSON header，由浏览器自动生成 multipart boundary
      timeout: 120000,
      onUploadProgress: onProgress
    })
    .then(toMaterial)
}

export function deleteClippingMaterial({ id }) {
  return request.delete(`/api/v1/clipping/materials/${id}`)
}

// ─── 剪辑对话引导（B32，无状态 context 回传）───

export function chatClipping({ message, context, taskId }) {
  return request
    .post('/api/v1/clipping/chat', { message, context, taskId: taskId || null })
    .then(toChat)
}

export function getClippingTask({ taskId }) {
  return request
    .get(`/api/v1/clipping/tasks/${taskId}`)
    .then(toClippingTask)
}

function toSkillRun(dto = {}) {
  return {
    id: dto.Id !== undefined ? dto.Id : dto.id,
    status: dto.Status !== undefined ? dto.Status : dto.status,
    resultSummary: dto.ResultSummary,
    createdAt: dto.CreatedAt,
    finishedAt: dto.FinishedAt
  }
}

function cleanParams(params) {
  return Object.entries(params).reduce((result, [key, value]) => {
    if (value != null && value !== '') result[key] = value
    return result
  }, {})
}

function toSkillCatalogItem(dto = {}) {
  return {
    id: dto.Id,
    source: dto.Source,
    key: dto.Key || dto.Code,
    name: dto.Name,
    category: dto.Category,
    riskLevel: dto.RiskLevel,
    requiredPermissions: Array.isArray(dto.RequiredPermissions) ? dto.RequiredPermissions : [],
    inputSchema: dto.InputSchema,
    memberName: dto.MemberName,
    status: dto.Status,
    updatedAt: dto.UpdatedAt
  }
}

function toSkillDetail(dto = {}) {
  return {
    id: dto.Id,
    key: dto.Key || dto.Code,
    name: dto.Name,
    category: dto.Category,
    status: dto.Status,
    updatedAt: dto.UpdatedAt,
    description: dto.Description,
    prompt: dto.Prompt,
    inputSchema: dto.InputSchema,
    outputSchema: dto.OutputSchema
  }
}

function toMaterial(dto = {}) {
  return {
    id: dto.Id,
    fileName: dto.FileName,
    contentType: dto.ContentType,
    fileSize: dto.FileSize,
    durationSeconds: dto.DurationSeconds,
    width: dto.Width,
    height: dto.Height,
    storagePath: dto.StoragePath,
    createdAt: dto.CreatedAt
  }
}

function toChat(dto = {}) {
  return {
    reply: dto.Reply,
    suggestions: Array.isArray(dto.Suggestions) ? dto.Suggestions : [],
    context: toChatContext(dto.Context),
    taskId: dto.TaskId
  }
}

function toChatContext(dto = {}) {
  return {
    step: dto.Step,
    materials: Array.isArray(dto.Materials) ? dto.Materials : null,
    goal: dto.Goal,
    planGenerated: dto.PlanGenerated,
    taskId: dto.TaskId
  }
}

function toClippingTask(dto = {}) {
  return {
    id: dto.Id,
    runId: dto.RunId,
    status: dto.Status,
    engineStage: dto.EngineStage,
    materials: Array.isArray(dto.Materials) ? dto.Materials : [],
    goal: dto.Goal,
    currentPlan: dto.CurrentPlan,
    versionHistory: Array.isArray(dto.VersionHistory) ? dto.VersionHistory.map(toVersionHistoryItem) : [],
    createdAt: dto.CreatedAt,
    updatedAt: dto.UpdatedAt
  }
}

function toVersionHistoryItem(dto = {}) {
  return {
    version: dto.Version,
    plan: dto.Plan,
    description: dto.Change,
    createdAt: dto.ModifiedAt
  }
}

function toExecution(dto = {}) {
  return {
    actionId: dto.actionId !== undefined ? dto.actionId : dto.ActionId,
    status: dto.status !== undefined ? dto.status : dto.Status,
    message: dto.message || dto.Message,
    fileId: dto.fileId !== undefined ? dto.fileId : dto.FileId
  }
}

function toReadToken(dto = {}) {
  return {
    readToken: dto.ReadToken,
    readUrl: dto.ReadUrl
  }
}
