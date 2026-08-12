import { request } from '../utils/request'

const basePath = '/api/v1/connector-providers/xhs'

export function getXhsAuthStatus() {
  return request.get(`${basePath}/auth-status`).then(toAuthStatus)
}

export function searchXhsNotes({ query, limit = 10 }) {
  return request
    .get(`${basePath}/notes/search`, { params: { query, limit } })
    .then((items) => (Array.isArray(items) ? items.map(toNoteSummary) : []))
}

export function getXhsNoteDetail({ url }) {
  return request.get(`${basePath}/notes/detail`, { params: { url } }).then(toNoteDetail)
}

export function createXhsPublishAction({ idempotencyKey, type, title, content, mediaPaths, tags }) {
  return request
    .post(`${basePath}/notes/publish`, { idempotencyKey, type, title, content, mediaPaths, tags })
    .then(toPublishAction)
}

export function confirmXhsPublishAction({ actionId, idempotencyKey }) {
  return request
    .post(`${basePath}/publish-actions/${actionId}/confirm`, { idempotencyKey })
    .then(toPublishResult)
}

function toAuthStatus(dto = {}) {
  return {
    loggedIn: Boolean(dto.LoggedIn),
    message: dto.Message || ''
  }
}

function toNoteSummary(dto = {}) {
  const noteId = dto.NoteId !== undefined ? dto.NoteId : dto.noteId
  const link = dto.Link || dto.Url || dto.link || dto.url
  return {
    noteId,
    title: dto.Title !== undefined ? dto.Title : dto.title,
    coverUrl: dto.CoverUrl !== undefined ? dto.CoverUrl : dto.coverUrl,
    authorName: dto.AuthorName !== undefined ? dto.AuthorName : dto.authorName,
    link: link || (noteId ? `https://www.xiaohongshu.com/explore/${encodeURIComponent(noteId)}` : '')
  }
}

function toNoteDetail(dto = {}) {
  return {
    noteId: dto.NoteId !== undefined ? dto.NoteId : dto.noteId,
    title: dto.Title !== undefined ? dto.Title : dto.title,
    content: dto.Content !== undefined ? dto.Content : dto.content,
    images: Array.isArray(dto.Images) ? dto.Images : (Array.isArray(dto.images) ? dto.images : []),
    link: dto.Link || dto.Url || dto.link || dto.url || ''
  }
}

function toPublishAction(dto = {}) {
  return {
    actionId: dto.ActionId,
    actionType: dto.ActionType,
    status: dto.Status,
    title: dto.Title,
    description: dto.Description,
    riskLevel: dto.RiskLevel
  }
}

function toPublishResult(dto = {}) {
  return {
    actionId: dto.ActionId !== undefined ? dto.ActionId : dto.actionId,
    status: dto.Status !== undefined ? dto.Status : dto.status,
    message: dto.Message || dto.message,
    noteId: dto.NoteId !== undefined ? dto.NoteId : dto.noteId
  }
}
