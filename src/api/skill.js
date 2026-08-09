import { request } from '../utils/request'

// ─── Skill 独立运行（快速剪辑 B24/B25/B31）───

export function createSkillRun({ skillCode, inputJson, idempotencyKey }) {
  return request
    .post(`/api/v1/skills/${skillCode}/runs`, { idempotencyKey, inputJson })
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

export function chatClipping({ message, context }) {
  return request
    .post('/api/v1/clipping/chat', { message, context })
    .then(toChat)
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
    context: toChatContext(dto.Context)
  }
}

function toChatContext(dto = {}) {
  return {
    step: dto.Step,
    materials: Array.isArray(dto.Materials) ? dto.Materials : null,
    goal: dto.Goal,
    planGenerated: dto.PlanGenerated
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
