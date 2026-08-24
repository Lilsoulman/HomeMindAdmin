import { chatClipping, confirmSkillAction, createMindmapRun, createSkillRun, deleteClippingMaterial, fetchFileContent, getClippingTask, getFileReadToken, getSkill, listClippingMaterials, listSkills, reviseSkillRun, uploadClippingMaterial } from '../../src/api/skill'

jest.mock('../../src/utils/request', () => ({
  request: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() }
}))

import { request } from '../../src/utils/request'

describe('skill api mapping', () => {
  afterEach(() => jest.clearAllMocks())

  it('lists B34 skills with scope and maps only catalog fields', async () => {
    request.get.mockResolvedValue([{ Id: 3, Source: 'platform', Key: 'calendar.create', Name: '创建日历', Category: 'life', RiskLevel: 'L1', RequiredPermissions: ['calendar.write'], InputSchema: '{"title":"string"}', Prompt: 'must not leak' }])

    const skills = await listSkills({ scope: 'all' })

    expect(request.get).toHaveBeenCalledWith('/api/v1/skills', { params: { scope: 'all' } })
    expect(skills).toEqual([{ id: 3, source: 'platform', key: 'calendar.create', name: '创建日历', category: 'life', riskLevel: 'L1', requiredPermissions: ['calendar.write'], inputSchema: '{"title":"string"}', memberName: undefined, status: undefined, updatedAt: undefined }])
    expect(skills[0].prompt).toBeUndefined()
  })

  it('gets a personally visible skill detail', async () => {
    request.get.mockResolvedValue({ Id: 4, Key: 'mine.note', Name: '我的笔记', Status: 'enabled', Prompt: 'private prompt' })

    const skill = await getSkill({ id: 4 })

    expect(request.get).toHaveBeenCalledWith('/api/v1/skills/4')
    expect(skill).toMatchObject({ id: 4, key: 'mine.note', name: '我的笔记', status: 'enabled', prompt: 'private prompt' })
  })

  it('creates a skill run with inputJson string and idempotency key', async () => {
    request.post.mockResolvedValue({
      Id: 55, Status: 'running', ResultSummary: null, CreatedAt: '2026-08-09T03:00:00Z', FinishedAt: null
    })

    const run = await createSkillRun({
      skillCode: 'quick-edit',
      inputJson: '{"media_location":"/nas/videos/1.mp4","instruction":"竖屏 30 秒"}',
      idempotencyKey: 'test-uuid', taskId: 31
    })

    expect(request.post).toHaveBeenCalledWith('/api/v1/skills/quick-edit/runs', {
      idempotencyKey: 'test-uuid',
      inputJson: '{"media_location":"/nas/videos/1.mp4","instruction":"竖屏 30 秒"}', taskId: 31
    })
    expect(run).toEqual({ id: 55, status: 'running', resultSummary: null, createdAt: '2026-08-09T03:00:00Z', finishedAt: null })
  })

  it('creates a mindmap run with Markdown and an idempotency key', async () => {
    request.post.mockResolvedValue({ Id: 56, Status: 'completed', CreatedAt: '2026-08-12T03:00:00Z' })

    const run = await createMindmapRun({ markdown: '# 家庭计划', idempotencyKey: 'test-uuid' })

    expect(request.post).toHaveBeenCalledWith('/api/v1/skills/mindmap/runs', { idempotencyKey: 'test-uuid', markdown: '# 家庭计划' })
    expect(run).toMatchObject({ id: 56, status: 'completed' })
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

  it('fetches file content as a blob object URL for preview and download', async () => {
    const blob = new Blob(['video-bytes'], { type: 'video/mp4' })
    request.get.mockResolvedValue(blob)
    URL.createObjectURL = jest.fn(() => 'blob:file-902')

    const url = await fetchFileContent({ readUrl: 'api/v1/expert-files/902/content?readToken=tok-1' })

    expect(request.get).toHaveBeenCalledWith('api/v1/expert-files/902/content?readToken=tok-1', { responseType: 'blob', timeout: 120000 })
    expect(URL.createObjectURL).toHaveBeenCalledWith(blob)
    expect(url).toBe('blob:file-902')
  })

  it('maps scanned clipping materials without exposing the directory key', async () => {
    request.get.mockResolvedValue([{ Id: 14, FileName: 'auto.mp4', SourceType: 'scan', FileSize: 2048, StoragePath: 'materials/auto.mp4', DirectoryKey: 'internal-key' }])

    const materials = await listClippingMaterials()

    expect(request.get).toHaveBeenCalledWith('/api/v1/clipping/materials')
    expect(materials).toEqual([{ id: 14, fileName: 'auto.mp4', contentType: undefined, fileSize: 2048, durationSeconds: undefined, width: undefined, height: undefined, storagePath: 'materials/auto.mp4', sourceType: 'scan', createdAt: undefined }])
    expect(materials[0]).not.toHaveProperty('directoryKey')
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
    expect(material).toEqual({ id: 7, fileName: 'a.mp4', contentType: 'video/mp4', fileSize: 1024, durationSeconds: 15, width: 1920, height: 1080, storagePath: 'D:\\data\\a.mp4', sourceType: 'upload', createdAt: '2026-08-09T03:00:00Z' })
  })

  it('deletes a material by id', async () => {
    request.delete.mockResolvedValue(null)

    await deleteClippingMaterial({ id: 7 })

    expect(request.delete).toHaveBeenCalledWith('/api/v1/clipping/materials/7')
  })

  it('maps the B39 confirmation card without consuming unpublished AI fields', async () => {
    request.post.mockResolvedValue({
      Reply: '好的，我来帮你剪视频。',
      Suggestions: ['上传素材', '填写素材路径'],
      Context: { Step: 'generating_plan', Materials: ['D:\\data\\a.mp4'], Goal: '竖屏 30 秒', PlanGenerated: false },
      TaskId: 31,
      Confirmation: { Title: '已理解', Summary: '30 秒竖屏快节奏，添加字幕', Parameters: ['时长：30 秒', '画幅：竖屏', '风格：快节奏', '字幕：添加'] }
    })

    const response = await chatClipping({ message: '帮我剪视频', context: null, taskId: 31 })

    expect(request.post).toHaveBeenCalledWith('/api/v1/clipping/chat', { message: '帮我剪视频', context: null, taskId: 31 })
    expect(response).toEqual({
      reply: '好的，我来帮你剪视频。',
      suggestions: ['上传素材', '填写素材路径'],
      context: { step: 'generating_plan', materials: ['D:\\data\\a.mp4'], goal: '竖屏 30 秒', planGenerated: false, taskId: undefined },
      taskId: 31,
      confirmation: { title: '已理解', summary: '30 秒竖屏快节奏，添加字幕', parameters: ['时长：30 秒', '画幅：竖屏', '风格：快节奏', '字幕：添加'] }
    })
  })

  it('gets a clipping task with presentation-safe recovery fields', async () => {
    request.get.mockResolvedValue({ Id: 31, RunId: 55, Status: 'done', EngineStage: 'render', mp4_file_id: 902, Materials: ['D:\\data\\a.mp4'], Goal: '竖屏 30 秒', CurrentPlan: { totalDuration: 30 }, VersionHistory: [{ Version: 1, Plan: { totalDuration: 30 }, Change: '初始方案', ModifiedAt: '2026-08-13T03:00:00Z' }] })

    const task = await getClippingTask({ taskId: 31 })

    expect(request.get).toHaveBeenCalledWith('/api/v1/clipping/tasks/31')
    expect(task).toMatchObject({ id: 31, runId: 55, engineStage: 'render', mp4FileId: 902, materials: ['D:\\data\\a.mp4'], versionHistory: [{ version: 1, description: '初始方案' }] })
  })
})
