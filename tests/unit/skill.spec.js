import { chatClipping, confirmSkillAction, createSkillRun, deleteClippingMaterial, getFileReadToken, reviseSkillRun, uploadClippingMaterial } from '../../src/api/skill'

jest.mock('../../src/utils/request', () => ({
  request: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() }
}))

import { request } from '../../src/utils/request'

describe('skill api mapping', () => {
  afterEach(() => jest.clearAllMocks())

  it('creates a skill run with inputJson string and idempotency key', async () => {
    request.post.mockResolvedValue({
      Id: 55, Status: 'running', ResultSummary: null, CreatedAt: '2026-08-09T03:00:00Z', FinishedAt: null
    })

    const run = await createSkillRun({
      skillCode: 'quick-edit',
      inputJson: '{"media_location":"/nas/videos/1.mp4","instruction":"竖屏 30 秒"}',
      idempotencyKey: 'test-uuid'
    })

    expect(request.post).toHaveBeenCalledWith('/api/v1/skills/quick-edit/runs', {
      idempotencyKey: 'test-uuid',
      inputJson: '{"media_location":"/nas/videos/1.mp4","instruction":"竖屏 30 秒"}'
    })
    expect(run).toEqual({ id: 55, status: 'running', resultSummary: null, createdAt: '2026-08-09T03:00:00Z', finishedAt: null })
  })

  it('confirms a skill action and maps camelCase fileId', async () => {
    request.post.mockResolvedValue({ actionId: 78, status: 'executed', message: '草稿已生成，打开剪映即可编辑。', fileId: 901 })

    const result = await confirmSkillAction({ runId: 55, actionId: 78, idempotencyKey: 'test-uuid' })

    expect(request.post).toHaveBeenCalledWith('/api/v1/skills/runs/55/actions/78/confirm', { idempotencyKey: 'test-uuid' })
    expect(result).toEqual({ actionId: 78, status: 'executed', message: '草稿已生成，打开剪映即可编辑。', fileId: 901 })
  })

  it('requests a download read-token with purpose param', async () => {
    request.post.mockResolvedValue({ ReadToken: 'tok-1', ReadUrl: 'https://cdn.example/quick_edit_55.draft.json?token=x' })

    const token = await getFileReadToken({ fileId: 901 })

    expect(request.post).toHaveBeenCalledWith('/api/v1/expert-files/901/read-token', null, { params: { purpose: 'download' } })
    expect(token).toEqual({ readToken: 'tok-1', readUrl: 'https://cdn.example/quick_edit_55.draft.json?token=x' })
  })

  it('revises a skill run plan with instruction and idempotency key', async () => {
    request.post.mockResolvedValue({ Id: 55, Status: 'pending_actions', ResultSummary: '快速剪辑方案已生成', CreatedAt: '2026-08-09T03:00:00Z', FinishedAt: null })

    const run = await reviseSkillRun({ runId: 55, instruction: '竖屏 60 秒', idempotencyKey: 'test-uuid' })

    expect(request.post).toHaveBeenCalledWith('/api/v1/skills/runs/55/revise', { instruction: '竖屏 60 秒', idempotencyKey: 'test-uuid' })
    expect(run.status).toBe('pending_actions')
  })

  it('uploads a material with FormData and no JSON content-type header', async () => {
    request.post.mockResolvedValue({ Id: 7, FileName: 'a.mp4', ContentType: 'video/mp4', FileSize: 1024, DurationSeconds: 15, Width: 1920, Height: 1080, StoragePath: 'D:\\data\\a.mp4', CreatedAt: '2026-08-09T03:00:00Z' })
    const file = new File(['bytes'], 'a.mp4', { type: 'video/mp4' })

    const material = await uploadClippingMaterial({ file, onProgress: jest.fn() })

    const [url, body, options] = request.post.mock.calls[0]
    expect(url).toBe('/api/v1/clipping/materials')
    expect(body).toBeInstanceOf(FormData)
    expect(options.headers).toEqual({ 'Content-Type': undefined })
    expect(material).toEqual({ id: 7, fileName: 'a.mp4', contentType: 'video/mp4', fileSize: 1024, durationSeconds: 15, width: 1920, height: 1080, storagePath: 'D:\\data\\a.mp4', createdAt: '2026-08-09T03:00:00Z' })
  })

  it('deletes a material by id', async () => {
    request.delete.mockResolvedValue(null)

    await deleteClippingMaterial({ id: 7 })

    expect(request.delete).toHaveBeenCalledWith('/api/v1/clipping/materials/7')
  })

  it('chats with clipping guide and maps reply/suggestions/context to camelCase', async () => {
    request.post.mockResolvedValue({
      Reply: '好的，我来帮你剪视频。',
      Suggestions: ['上传素材', '填写素材路径'],
      Context: { Step: 'collecting_materials', Materials: ['D:\\data\\a.mp4'], Goal: '竖屏 30 秒', PlanGenerated: null }
    })

    const response = await chatClipping({ message: '帮我剪视频', context: null })

    expect(request.post).toHaveBeenCalledWith('/api/v1/clipping/chat', { message: '帮我剪视频', context: null })
    expect(response).toEqual({
      reply: '好的，我来帮你剪视频。',
      suggestions: ['上传素材', '填写素材路径'],
      context: { step: 'collecting_materials', materials: ['D:\\data\\a.mp4'], goal: '竖屏 30 秒', planGenerated: null }
    })
  })
})
