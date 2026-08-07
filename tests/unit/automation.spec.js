import { createAutomationRule, listAutomationRules, updateAutomationRule } from '../../src/api/automation'

jest.mock('../../src/utils/request', () => ({
  request: { get: jest.fn(), post: jest.fn(), patch: jest.fn() }
}))

import { request } from '../../src/utils/request'

describe('automation api mapping', () => {
  afterEach(() => jest.clearAllMocks())

  it('maps rule list keeping json payloads and rowVersion', async () => {
    request.get.mockResolvedValue([
      {
        Id: 1, Name: '日落后回家照明', TriggerType: 'time_schedule',
        Trigger: { kind: 'sun', event: 'sunset', offsetMinutes: 5 },
        Conditions: [], Actions: [{ sceneKey: 'arrive_home' }],
        ApprovalPolicy: 'manual_confirmation', Enabled: true,
        LastTriggeredAt: null, UpdatedAt: '2026-08-04T10:00:00Z', RowVersion: 3
      }
    ])

    const items = await listAutomationRules()

    expect(request.get).toHaveBeenCalledWith('/api/v1/automation-rules')
    expect(items[0]).toEqual({
      id: 1, name: '日落后回家照明', triggerType: 'time_schedule',
      trigger: { kind: 'sun', event: 'sunset', offsetMinutes: 5 },
      conditions: [], actions: [{ sceneKey: 'arrive_home' }],
      approvalPolicy: 'manual_confirmation', enabled: true,
      lastTriggeredAt: null, updatedAt: '2026-08-04T10:00:00Z', rowVersion: 3
    })
  })

  it('posts create rule payload', async () => {
    request.post.mockResolvedValue({ Id: 2, Name: '新规则', TriggerType: 'time_schedule', Enabled: true })

    const rule = await createAutomationRule({
      name: '新规则', triggerType: 'time_schedule',
      trigger: { kind: 'fixed_time', time: '21:30' }, conditions: [], actions: [{ sceneKey: 'goodnight' }],
      approvalPolicy: 'manual_confirmation', enabled: true
    })

    expect(request.post).toHaveBeenCalledWith('/api/v1/automation-rules', {
      name: '新规则', triggerType: 'time_schedule',
      trigger: { kind: 'fixed_time', time: '21:30' }, conditions: [], actions: [{ sceneKey: 'goodnight' }],
      approvalPolicy: 'manual_confirmation', enabled: true
    })
    expect(rule.id).toBe(2)
  })

  it('patches update with rowVersion', async () => {
    request.patch.mockResolvedValue({ Id: 1, Name: '改过的规则', Enabled: false, RowVersion: 4 })

    const rule = await updateAutomationRule({ id: 1, payload: { enabled: false, rowVersion: 3 } })

    expect(request.patch).toHaveBeenCalledWith('/api/v1/automation-rules/1', { enabled: false, rowVersion: 3 })
    expect(rule.enabled).toBe(false)
    expect(rule.rowVersion).toBe(4)
  })
})
