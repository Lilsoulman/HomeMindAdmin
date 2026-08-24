import { request } from '../utils/request'

const basePath = (homeId) => `/api/v1/homes/${homeId}/schedule`

export function listScheduleEvents({ homeId, from, to } = {}) {
  return request.get(`${basePath(homeId)}/events`, { params: compact({ from, to }) }).then(toEvents)
}

export function listScheduleConflicts({ homeId, from, to } = {}) {
  return request.get(`${basePath(homeId)}/conflicts`, { params: compact({ from, to }) }).then((items) => (Array.isArray(items) ? items : []).map(toConflict))
}

export function listScheduleAvailability({ homeId, from, to, durationMinutes = 60 } = {}) {
  return request.get(`${basePath(homeId)}/availability`, { params: compact({ from, to, durationMinutes }) }).then((items) => (Array.isArray(items) ? items : []).map(toAvailability))
}

export function createDocumentDeadline({ homeId, documentType, displayName, holderUserId = null, expiresOn }) {
  return request.post(`${basePath(homeId)}/document-deadlines`, { documentType, displayName, holderUserId: holderUserId || null, expiresOn }).then(toDocumentDeadline)
}

export function listDocumentDeadlines({ homeId } = {}) {
  return request.get(`${basePath(homeId)}/document-deadlines`).then((items) => (Array.isArray(items) ? items : []).map(toDocumentDeadline))
}

export function listScheduleReminders({ homeId, asOf } = {}) {
  return request.get(`${basePath(homeId)}/reminders`, { params: compact({ asOf }) }).then((items) => (Array.isArray(items) ? items : []).map(toReminder))
}

export function getTomorrowSchedulePreview({ homeId, asOf } = {}) {
  return request.get(`${basePath(homeId)}/tomorrow-preview`, { params: compact({ asOf }) }).then(toTomorrowPreview)
}

function compact(values) {
  return Object.keys(values).reduce((result, key) => {
    if (values[key] !== undefined && values[key] !== null && values[key] !== '') result[key] = values[key]
    return result
  }, {})
}

function toEvents(items) {
  return (Array.isArray(items) ? items : []).map(toEvent)
}

function toEvent(dto = {}) {
  return { id: dto.Id, userId: dto.UserId, memberName: dto.MemberName, title: dto.Title, startAt: dto.StartAt, endAt: dto.EndAt, allDay: dto.AllDay }
}

function toConflict(dto = {}) {
  return { first: toEvent(dto.First), second: toEvent(dto.Second), overlapStartAt: dto.OverlapStartAt, overlapEndAt: dto.OverlapEndAt }
}

function toAvailability(dto = {}) {
  return { startAt: dto.StartAt, endAt: dto.EndAt }
}

function toDocumentDeadline(dto = {}) {
  return { id: dto.Id, documentType: dto.DocumentType, displayName: dto.DisplayName, holderUserId: dto.HolderUserId, holderName: dto.HolderName, expiresOn: dto.ExpiresOn, isActive: dto.IsActive }
}

function toReminder(dto = {}) {
  return { type: dto.Type, sourceId: dto.SourceId, title: dto.Title, dueDate: dto.DueDate, daysRemaining: dto.DaysRemaining, confirmationId: dto.ConfirmationId }
}

function toTomorrowPreview(dto = {}) {
  return { date: dto.Date, events: toEvents(dto.Events), conflicts: (Array.isArray(dto.Conflicts) ? dto.Conflicts : []).map(toConflict), reminders: (Array.isArray(dto.Reminders) ? dto.Reminders : []).map(toReminder) }
}
