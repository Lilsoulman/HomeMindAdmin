import { confirmRunAction, createExpert, getExpert, getRun, getRunActions, getRunEvents, listExperts, listRuns, removeExpert, updateExpert } from '../../src/api/expert'

jest.mock('../../src/utils/request', () => ({
  request: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() }
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

  it('maps detail with rowVersion but never prompt template', async () => {
    request.get.mockResolvedValue({
      Id: 1, Code: 'writing-coach', Name: 'Writing coach', Category: 'writing', Description: '写作辅导',
      PrivacyScope: null, Source: 'basic', VersionId: 4, Version: 4, RowVersion: 7, Persona: '你是写作教练',
      Methodology: '分步骤反馈', PromptTemplate: 'system: you are...', ToolPolicy: '{"tools":["web.search"]}',
      OutputSchema: '{"type":"object"}', EstimatedCredits: 1
    })

    const detail = await getExpert({ id: 1, type: 'expert' })

    expect(request.get).toHaveBeenCalledWith('/api/v1/experts/1', { params: { type: 'expert' } })
    expect(detail.name).toBe('Writing coach')
    expect(detail.version).toBe(4)
    expect(detail.rowVersion).toBe(7)
    expect(detail.persona).toBe('你是写作教练')
    expect(detail.toolPolicy).toBe('{"tools":["web.search"]}')
    expect(detail).not.toHaveProperty('promptTemplate')
  })

  it('posts create expert payload', async () => {
    request.post.mockResolvedValue({
      Id: 2, Code: 'custom-abc', Source: 'mine', Version: 1, Name: '我的助手',
      Category: 'travel', Description: '旅行助手', Persona: '你是我的旅行助手', RowVersion: 1
    })

    const expert = await createExpert({
      name: '我的助手', category: 'travel', description: '旅行助手',
      persona: '你是我的旅行助手', methodology: undefined, promptTemplate: 'system: you are...', toolPolicyJson: '{"skills":[]}'
    })

    expect(request.post).toHaveBeenCalledWith('/api/v1/experts', {
      name: '我的助手', category: 'travel', description: '旅行助手',
      persona: '你是我的旅行助手', methodology: undefined, promptTemplate: 'system: you are...', toolPolicyJson: '{"skills":[]}'
    })
    expect(expert.id).toBe(2)
    expect(expert.source).toBe('mine')
    expect(expert.version).toBe(1)
    expect(expert.rowVersion).toBe(1)
  })

  it('puts update with rowVersion', async () => {
    request.put.mockResolvedValue({ Id: 1, Name: '改过的助手', Version: 2, RowVersion: 2 })

    const expert = await updateExpert({ id: 1, payload: { name: '改过的助手', rowVersion: 1 } })

    expect(request.put).toHaveBeenCalledWith('/api/v1/experts/1', { name: '改过的助手', rowVersion: 1 })
    expect(expert.name).toBe('改过的助手')
    expect(expert.version).toBe(2)
    expect(expert.rowVersion).toBe(2)
  })

  it('deletes expert by id', async () => {
    request.delete.mockResolvedValue(undefined)

    await removeExpert({ id: 3 })

    expect(request.delete).toHaveBeenCalledWith('/api/v1/experts/3')
  })

  it('maps run view without raw input or result', async () => {
    request.get.mockResolvedValue({
      id: 9, SourceType: 'expert', status: 'completed', Input: '{"messages":[...]}', Result: '{"internal":"hidden"}', mp4_file_id: 902,
      ResultSummary: '已生成建议', EstimatedCredits: 1, ActualCredits: 1, CreatedAt: '2026-08-02T03:11:22Z',
      StartedAt: '2026-08-02T03:11:23Z', FinishedAt: '2026-08-02T03:12:00Z', ConversationId: 5,
      EngineStage: 'packaging', Version: 3, VersionHistory: [{ Version: 3, ChangeDescription: '调整片头', CreatedAt: '2026-08-02T03:11:30Z' }]
    })

    const run = await getRun({ id: 9 })

    expect(request.get).toHaveBeenCalledWith('/api/v1/expert-runs/9')
    expect(run.status).toBe('completed')
    expect(run.resultSummary).toBe('已生成建议')
    expect(run.engineStage).toBe('packaging')
    expect(run.mp4FileId).toBe(902)
    expect(run.versionHistory).toEqual([{ version: 3, description: '调整片头', createdAt: '2026-08-02T03:11:30Z' }])
    expect(run).not.toHaveProperty('input')
    expect(run).not.toHaveProperty('result')
  })

  it('lists skill runs with sourceType and maps mp4 file ids', async () => {
    request.get.mockResolvedValue([
      { Id: 10, SourceType: 'skill', Status: 'completed', Result: '{"skill_run":"quick_edit","status":"completed","mp4_file_id":902}', ResultSummary: '粗剪视频已生成，可预览或下载。', CreatedAt: '2026-08-14T03:00:00Z', FinishedAt: '2026-08-14T03:01:00Z' },
      { Id: 9, SourceType: 'skill', Status: 'failed', ResultSummary: '草稿生成失败。', CreatedAt: '2026-08-13T03:00:00Z' }
    ])

    const runs = await listRuns({ sourceType: 'skill', limit: 50 })

    expect(request.get).toHaveBeenCalledWith('/api/v1/expert-runs', { params: { sourceType: 'skill', limit: 50 } })
    expect(runs).toHaveLength(2)
    expect(runs[0].mp4FileId).toBe(902)
    expect(runs[1].mp4FileId).toBeUndefined()
  })

  it('falls back to mp4_file_id inside Result JSON when no top-level field', async () => {
    request.get.mockResolvedValue({
      id: 10, SourceType: 'skill', status: 'completed',
      Result: '{"skill_run":"quick_edit","status":"completed","mp4_file_id":902,"size_bytes":12345}',
      ResultSummary: '粗剪视频已生成，可预览或下载。', CreatedAt: '2026-08-14T03:00:00Z', FinishedAt: '2026-08-14T03:01:00Z'
    })

    const run = await getRun({ id: 10 })

    expect(run.mp4FileId).toBe(902)
  })

  it('maps only public engine progress fields from event payload', async () => {
    request.get.mockResolvedValue([
      { id: 1, sequence: 1, EventType: 'queued', Payload: '{"stage":"video_use","status":"running","message":"素材分析中","occurredAt":"2026-08-02T03:11:23Z","command":"hidden"}', CreatedAt: '2026-08-02T03:11:22Z' },
      { id: 2, sequence: 2, EventType: 'planning', Payload: '{"thinking":"hidden"}', CreatedAt: '2026-08-02T03:11:25Z' }
    ])

    const events = await getRunEvents({ id: 9 })

    expect(events[0]).toMatchObject({ stage: 'video_use', status: 'running', message: '素材分析中', createdAt: '2026-08-02T03:11:23Z' })
    expect(events[0].command).toBeUndefined()
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
      deviceId: 5, deviceName: '阳台灯', capability: 'power', targetValue: { on: true },
      plan: { segments: [], audio: undefined, totalDuration: undefined }
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
