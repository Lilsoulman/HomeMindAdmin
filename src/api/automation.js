import { request } from '../utils/request'

export function listAutomationRules() {
  return request
    .get('/api/v1/automation-rules')
    .then((items) => (Array.isArray(items) ? items.map(toRule) : []))
}

export function createAutomationRule(payload) {
  return request
    .post('/api/v1/automation-rules', payload)
    .then(toRule)
}

export function updateAutomationRule({ id, payload }) {
  return request
    .patch(`/api/v1/automation-rules/${id}`, payload)
    .then(toRule)
}

function toRule(dto = {}) {
  return {
    id: dto.Id,
    name: dto.Name,
    triggerType: dto.TriggerType,
    trigger: dto.Trigger,
    conditions: dto.Conditions,
    actions: dto.Actions,
    approvalPolicy: dto.ApprovalPolicy,
    enabled: Boolean(dto.Enabled),
    lastTriggeredAt: dto.LastTriggeredAt,
    updatedAt: dto.UpdatedAt,
    rowVersion: dto.RowVersion
  }
}
