import { confirmRunAction, getExpert, getRun, getRunActions, getRunEvents, listExperts } from '../../src/api/expert'

jest.mock('../../src/utils/request', () => ({
  request: { get: jest.fn(), post: jest.fn() }
}))

import { request } from '../../src/utils/request'

describe('expert api mapping', () => {
  afterEach(() => jest.clearAllMocks())

  it('maps expert catalog items', async () => {
    request.get.mockResolvedValue([
      { Id: 1, CatalogType: 'expert', Source: 'basic', Code: 'writing-coach', Name: 'Writing coach', Category: 'writing', Description: '写作辅导', EstimatedCredits: 1 }
    ])

    const items = await listExperts({ query: 'coach', type: 'expert', scope: 'basic' })

    expect(request.get).toHaveBeenCalledWith('/api/v1/experts', { params: { query: 'coach', type: 'expert', scope: 'basic' } })
    expect(items[0]).toEqual({
      id: 1, catalogType: 'expert', source: 'basic', code: 'writing-coach', name: 'Writing coach',
      category: 'writing', description: '写作辅导', estimatedCredits: 1
    })
  })

  it('omits empty expert filters', async () => {
    request.get.mockResolvedValue([])

    await listExperts({ query: '', type: '', scope: null })

    expect(request.get).toHaveBeenCalledWith('/api/v1/experts', { params: {} })
  })

  it('maps detail without prompt template', async () => {
    request.get.mockResolvedValue({
      Id: 1, Code: 'writing-coach', Name: 'Writing coach', Category: 'writing', Description: '写作辅导',
      PrivacyScope: null, Source: 'basic', VersionId: 4, Version: 4, Persona: '你是写作教练',
      Methodology: '分步骤反馈', PromptTemplate: 'system: you are...', ToolPolicy: '{"tools":["web.search"]}',
      OutputSchema: '{"type":"object"}', EstimatedCredits: 1
    })

    const detail = await getExpert({ id: 1, type: 'expert' })

    expect(request.get).toHaveBeenCalledWith('/api/v1/experts/1', { params: { type: 'expert' } })
    expect(detail.name).toBe('Writing coach')
    expect(detail.version).toBe(4)
    expect(detail.persona).toBe('你是写作教练')
    expect(detail.toolPolicy).toBe('{"tools":["web.search"]}')
    expect(detail).not.toHaveProperty('promptTemplate')
  })

  it('maps run view without raw input or result', async () => {
    request.get.mockResolvedValue({
      id: 9, SourceType: 'expert', status: 'completed', Input: '{"messages":[...]}', Result: '{"raw":true}',
      ResultSummary: '已生成建议', EstimatedCredits: 1, ActualCredits: 1, CreatedAt: '2026-08-02T03:11:22Z',
      StartedAt: '2026-08-02T03:11:23Z', FinishedAt: '2026-08-02T03:12:00Z', ConversationId: 5
    })

    const run = await getRun({ id: 9 })

    expect(request.get).toHaveBeenCalledWith('/api/v1/expert-runs/9')
    expect(run.status).toBe('completed')
    expect(run.resultSummary).toBe('已生成建议')
    expect(run).not.toHaveProperty('input')
    expect(run).not.toHaveProperty('result')
  })

  it('extracts readable message from event payload only', async () => {
    request.get.mockResolvedValue([
      { id: 1, sequence: 1, EventType: 'queued', Payload: '{"message":"Run queued"}', CreatedAt: '2026-08-02T03:11:22Z' },
      { id: 2, sequence: 2, EventType: 'planning', Payload: '{"thinking":"hidden"}', CreatedAt: '2026-08-02T03:11:25Z' }
    ])

    const events = await getRunEvents({ id: 9 })

    expect(events[0].message).toBe('Run queued')
    expect(events[1].message).toBe('')
    expect(events[0].eventType).toBe('queued')
  })

  it('maps run actions view with events and actions', async () => {
    request.get.mockResolvedValue({
      Events: [{ Sequence: 1, Type: 'queued', Message: '已排队', CreatedAt: '2026-08-02T03:11:22Z' }],
      Actions: [
        {
          Id: 78, ActionType: 'smart_home_device', Status: 'pending', Title: '开阳台灯', Description: '打开阳台灯',
          DeviceId: 5, DeviceName: '阳台灯', Capability: 'power', TargetValue: { on: true }
        }
      ]
    })

    const result = await getRunActions({ id: 9 })

    expect(request.get).toHaveBeenCalledWith('/api/v1/expert-runs/9/actions')
    expect(result.actions[0]).toEqual({
      id: 78, actionType: 'smart_home_device', status: 'pending', title: '开阳台灯', description: '打开阳台灯',
      deviceId: 5, deviceName: '阳台灯', capability: 'power', targetValue: { on: true }
    })
    expect(result.events[0].message).toBe('已排队')
  })

  it('posts action confirm with idempotency key', async () => {
    request.post.mockResolvedValue({ ActionId: 78, Status: 'executed', Message: '设备行动已执行。', UpdatedAt: '2026-08-04T10:02:00Z' })

    const result = await confirmRunAction({ runId: 9, actionId: 78, idempotencyKey: 'key-1' })

    expect(request.post).toHaveBeenCalledWith('/api/v1/expert-runs/9/actions/78/confirm', { idempotencyKey: 'key-1' })
    expect(result.status).toBe('executed')
    expect(result.message).toBe('设备行动已执行。')
  })
})
