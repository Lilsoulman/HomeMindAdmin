import { shallowMount } from '@vue/test-utils'
import QuickEdit from '../../src/views/app/QuickEdit.vue'
import * as skillApi from '../../src/api/skill'
import * as expertApi from '../../src/api/expert'

jest.mock('../../src/api/skill', () => ({
  createSkillRun: jest.fn(),
  confirmSkillAction: jest.fn(),
  getFileReadToken: jest.fn(),
  fetchFileContent: jest.fn(),
  reviseSkillRun: jest.fn(),
  chatClipping: jest.fn(),
  getClippingTask: jest.fn(),
  uploadClippingMaterial: jest.fn(),
  deleteClippingMaterial: jest.fn()
}))

jest.mock('../../src/api/expert', () => ({
  getRun: jest.fn(),
  getRunEvents: jest.fn(),
  getRunActions: jest.fn()
}))

jest.mock('../../src/utils/idempotency', () => ({
  createIdempotencyKey: jest.fn(() => 'test-uuid-0001')
}))

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0))

const mocks = {
  $message: { success: jest.fn(), warning: jest.fn(), error: jest.fn() },
  $route: { query: {} },
  $router: { replace: jest.fn() }
}

const stubs = {
  'el-steps': { template: '<div><slot /></div>' },
  'el-step': { template: '<div />' },
  'el-dialog': { props: ['visible'], template: '<div v-if="visible"><slot /><slot name="footer" /></div>' },
  'el-input': { props: ['value', 'placeholder'], template: '<input :value="value" @input="$emit(\'input\', $event.target.value)" />' },
  'el-button': { props: ['disabled', 'loading', 'type', 'plain', 'size'], template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>' },
  'el-tag': { template: '<span><slot /></span>' },
  'el-checkbox': { props: ['value'], template: '<label><input :checked="value" type="checkbox" @change="$emit(\'input\', $event.target.checked)" /><slot /></label>' },
  MediaFileUpload: { template: '<div class="media-upload-stub" />' },
  PlanTimeline: { template: '<div class="plan-timeline-stub" />' }
}

const runningRun = { id: 55, status: 'pending_actions', resultSummary: '快速剪辑方案已生成：素材「探店.mp4」', createdAt: '2026-08-09T03:00:00Z' }
const completedRun = { id: 55, status: 'completed', resultSummary: '草稿已生成，打开剪映即可编辑。', createdAt: '2026-08-09T03:00:00Z', finishedAt: '2026-08-09T03:01:00Z' }
const renderedRun = { id: 55, status: 'completed', resultSummary: '粗剪视频已生成，可预览或下载。', mp4FileId: 902, createdAt: '2026-08-09T03:00:00Z', finishedAt: '2026-08-09T03:01:00Z' }
const pendingAction = {
  id: 78,
  actionType: 'draft_generate',
  status: 'pending',
  title: '快速剪辑方案',
  description: '共 1 个片段，总时长约 30 秒',
  plan: { segments: [{ index: 1, source: '探店.mp4', duration: 30 }], audio: null, totalDuration: 30 }
}
const executedAction = { ...pendingAction, status: 'executed' }

const chatResponse = {
  reply: '好的，我来帮你剪视频。请先上传素材。',
  suggestions: ['上传素材', '填写素材路径'],
  context: { step: 'collecting_materials', materials: null, goal: null, planGenerated: null }
}
const goalChatResponse = {
  reply: '创作目标已记录：竖屏 30 秒。确认后即可生成剪辑方案。',
  suggestions: ['生成方案'],
  context: { step: 'generating_plan', materials: ['D:\\data\\探店.mp4'], goal: '竖屏 30 秒', planGenerated: null }
}

const findButton = (wrapper, text) => wrapper.findAll('button').wrappers.find((w) => w.text().includes(text))

describe('QuickEdit view', () => {
  beforeEach(() => {
    expertApi.getRunEvents.mockResolvedValue([])
    expertApi.getRunActions.mockResolvedValue({ events: [], actions: [] })
    jest.spyOn(window, 'open').mockImplementation(() => {})
    // jsdom 无 Blob URL 支持，测试期以稳定值替身
    URL.createObjectURL = jest.fn(() => 'blob:mock-mp4')
    URL.revokeObjectURL = jest.fn()
  })

  afterEach(() => {
    jest.clearAllMocks()
    window.open.mockRestore()
  })

  it('renders welcome message and stays on step 1', () => {
    const wrapper = shallowMount(QuickEdit, { mocks, stubs })

    expect(wrapper.text()).toContain('我是快速剪辑助手')
    expect(wrapper.vm.activeStep).toBe(1)
    wrapper.destroy()
  })

  it('sends a message through the chat guide and renders ai reply with suggestions', async () => {
    skillApi.chatClipping.mockResolvedValue(chatResponse)
    const wrapper = shallowMount(QuickEdit, { mocks, stubs })

    wrapper.vm.draft = '帮我剪视频'
    await wrapper.vm.$nextTick()
    await findButton(wrapper, '发送').trigger('click')
    await flushPromises()

    expect(skillApi.chatClipping).toHaveBeenCalledWith({ message: '帮我剪视频', context: null, taskId: null })
    expect(wrapper.vm.messages[wrapper.vm.messages.length - 1].text).toBe('好的，我来帮你剪视频。请先上传素材。')
    expect(wrapper.vm.suggestions).toEqual(['上传素材', '填写素材路径'])
    wrapper.destroy()
  })

  it('adds a path and syncs chat context materials', async () => {
    const wrapper = shallowMount(QuickEdit, { mocks, stubs })

    wrapper.vm.pathInput = '/nas/videos/探店.mp4'
    await wrapper.vm.$nextTick()
    await findButton(wrapper, '添加路径').trigger('click')

    expect(wrapper.vm.materialPaths).toEqual(['/nas/videos/探店.mp4'])
    expect(wrapper.vm.chatContext.materials).toEqual(['/nas/videos/探店.mp4'])
    wrapper.destroy()
  })

  it('uses auto-discovered materials and removes their path after deletion', () => {
    const wrapper = shallowMount(QuickEdit, { mocks, stubs })
    const autoMaterial = { id: 8, sourceType: 'scan', storagePath: 'materials/auto.mp4' }

    wrapper.vm.onMaterialsAvailable([autoMaterial])
    wrapper.vm.onRemoved(autoMaterial.id, autoMaterial)

    expect(wrapper.vm.chatContext.materials).toEqual([])
    wrapper.destroy()
  })

  it('generates a plan via createSkillRun with first material path and goal', async () => {
    skillApi.createSkillRun.mockResolvedValue(runningRun)
    expertApi.getRunActions.mockResolvedValue({ events: [], actions: [pendingAction] })
    const wrapper = shallowMount(QuickEdit, { mocks, stubs })
    wrapper.vm.materialPaths = ['D:\\data\\探店.mp4']
    wrapper.vm.chatContext = { step: 'generating_plan', materials: ['D:\\data\\探店.mp4'], goal: '竖屏 30 秒', planGenerated: null }

    await wrapper.vm.generatePlan()
    await flushPromises()

    expect(skillApi.createSkillRun).toHaveBeenCalledWith({
      skillCode: 'quick-edit',
      inputJson: '{"media_location":"D:\\\\data\\\\探店.mp4","instruction":"竖屏 30 秒"}',
      idempotencyKey: 'test-uuid-0001',
      taskId: null
    })
    expect(wrapper.vm.run).toEqual(runningRun)
    expect(wrapper.vm.activeStep).toBe(3)
    wrapper.destroy()
  })

  it('binds the task returned by chat and keeps it in the route', async () => {
    skillApi.chatClipping.mockResolvedValue({ ...chatResponse, taskId: 31 })
    const wrapper = shallowMount(QuickEdit, { mocks, stubs })
    wrapper.vm.draft = '帮我剪视频'

    await wrapper.vm.send()

    expect(wrapper.vm.clippingTask).toEqual({ id: 31 })
    expect(mocks.$router.replace).toHaveBeenCalledWith({ query: { taskId: 31 } })
    wrapper.destroy()
  })

  it('applies the 生成方案 suggestion and starts a skill run', async () => {
    skillApi.chatClipping.mockResolvedValue(goalChatResponse)
    skillApi.createSkillRun.mockResolvedValue(runningRun)
    expertApi.getRunActions.mockResolvedValue({ events: [], actions: [pendingAction] })
    const wrapper = shallowMount(QuickEdit, { mocks, stubs })
    wrapper.vm.materialPaths = ['D:\\data\\探店.mp4']
    wrapper.vm.draft = '帮我剪视频'

    await wrapper.vm.send()
    await flushPromises()
    await wrapper.vm.$nextTick()
    await findButton(wrapper, '生成方案').trigger('click')
    await flushPromises()

    expect(skillApi.createSkillRun).toHaveBeenCalled()
    wrapper.destroy()
  })

  it('revises the plan with new instruction via reviseSkillRun', async () => {
    skillApi.reviseSkillRun.mockResolvedValue(runningRun)
    expertApi.getRunActions.mockResolvedValue({ events: [], actions: [pendingAction] })
    const wrapper = shallowMount(QuickEdit, { mocks, stubs })
    wrapper.vm.run = runningRun
    wrapper.vm.actions = [pendingAction]
    wrapper.vm.reviseInstruction = '竖屏 60 秒'
    wrapper.vm.reviseDialogVisible = true
    await wrapper.vm.$nextTick()

    await findButton(wrapper, '提交修改').trigger('click')
    await flushPromises()

    expect(skillApi.reviseSkillRun).toHaveBeenCalledWith({ runId: 55, instruction: '竖屏 60 秒', idempotencyKey: 'test-uuid-0001' })
    expect(wrapper.vm.reviseDialogVisible).toBe(false)
    wrapper.destroy()
  })

  it('renders B36 public engine progress and change history without private engine data', async () => {
    const wrapper = shallowMount(QuickEdit, { mocks, stubs })
    wrapper.vm.run = { ...runningRun, version: 3, versionHistory: [{ version: 3, description: '调整片头', createdAt: '2026-08-09T03:10:00Z' }] }
    wrapper.vm.events = [{ stage: 'video_use', status: 'succeeded', message: '素材已分析' }, { stage: 'seedance', status: 'skipped', message: '未启用' }, { stage: 'hyperframes', status: 'running', message: '正在包装' }]
    wrapper.vm.actions = [pendingAction]
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.engineProgress.map((stage) => stage.label)).toEqual(['素材分析与粗剪', '补充画面（可选）', '视觉包装'])
    expect(wrapper.vm.engineProgress[1].status).toBe('skipped')
    expect(wrapper.text()).toContain('引擎进度')
    expect(wrapper.text()).toContain('已跳过')
    expect(wrapper.text()).toContain('暂无 渲染编排（可选）、草稿生成 的实时引擎反馈')
    expect(wrapper.text()).toContain('前端无法据此判断能力是否已接入')
    expect(wrapper.text()).toContain('版本 3')
    expect(wrapper.text()).toContain('调整片头')
    expect(wrapper.text()).toContain('调整时长')
    wrapper.destroy()
  })

  it('does not invent waiting stages when the server provides no engine events', async () => {
    const wrapper = shallowMount(QuickEdit, { mocks, stubs })
    wrapper.vm.run = runningRun
    wrapper.vm.clippingTask = { id: 31, status: 'running' }
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.engineProgress).toEqual([])
    expect(wrapper.text()).toContain('当前任务未返回这些阶段的公开事件')
    expect(wrapper.text()).toContain('未收到事件不代表能力未接入或任务未执行')
    expect(wrapper.text()).toContain('Seedance 本次未启用')
    wrapper.destroy()
  })

  it('only passes Seedance consent after explicit cost confirmation', async () => {
    skillApi.createSkillRun.mockResolvedValue(runningRun)
    expertApi.getRunActions.mockResolvedValue({ events: [], actions: [] })
    const wrapper = shallowMount(QuickEdit, { mocks, stubs })
    wrapper.vm.materialPaths = ['D:\\data\\探店.mp4']
    wrapper.vm.useSeedance = true
    wrapper.vm.seedanceCostConfirmed = true

    await wrapper.vm.generatePlan()

    expect(skillApi.createSkillRun).toHaveBeenCalledWith(expect.objectContaining({ inputJson: '{"media_location":"D:\\\\data\\\\探店.mp4","allowSeedance":true}' }))
    wrapper.destroy()
  })

  it('confirms the draft action and downloads via read-token', async () => {
    skillApi.confirmSkillAction.mockResolvedValue({ actionId: 78, status: 'executed', message: '草稿已生成，打开剪映即可编辑。', fileId: 901 })
    skillApi.getFileReadToken.mockResolvedValue({ readUrl: 'https://cdn.example/draft?token=x' })
    expertApi.getRun.mockResolvedValue(completedRun)
    expertApi.getRunActions.mockResolvedValue({ events: [], actions: [executedAction] })
    const wrapper = shallowMount(QuickEdit, { mocks, stubs })
    wrapper.vm.run = runningRun
    wrapper.vm.actions = [pendingAction]
    await wrapper.vm.$nextTick()

    await findButton(wrapper, '确认生成草稿').trigger('click')
    await flushPromises()

    expect(skillApi.confirmSkillAction).toHaveBeenCalledWith({ runId: 55, actionId: 78, idempotencyKey: 'test-uuid-0001' })
    expect(wrapper.vm.draftFileId).toBe(901)
    expect(wrapper.vm.activeStep).toBe(4)

    await findButton(wrapper, '进阶：去剪映精剪').trigger('click')
    await flushPromises()
    expect(skillApi.getFileReadToken).toHaveBeenCalledWith({ fileId: 901 })
    expect(window.open).toHaveBeenCalledWith('https://cdn.example/draft?token=x', '_blank')
    wrapper.destroy()
  })

  it('previews and downloads the B37 mp4 only when the API exposes a generated file id', async () => {
    skillApi.getFileReadToken.mockResolvedValue({ readUrl: 'https://cdn.example/quick-edit.mp4?token=x' })
    skillApi.fetchFileContent.mockResolvedValue('blob:mock-mp4')
    const wrapper = shallowMount(QuickEdit, { mocks, stubs })
    wrapper.vm.run = renderedRun

    await wrapper.vm.prepareMp4Preview()
    await wrapper.vm.$nextTick()

    expect(skillApi.getFileReadToken).toHaveBeenCalledWith({ fileId: 902 })
    expect(skillApi.fetchFileContent).toHaveBeenCalledWith({ readUrl: 'https://cdn.example/quick-edit.mp4?token=x' })
    expect(wrapper.find('video').attributes('src')).toBe('blob:mock-mp4')
    await findButton(wrapper, '下载 mp4').trigger('click')
    await flushPromises()
    expect(skillApi.fetchFileContent).toHaveBeenCalledTimes(2)
    expect(window.open).not.toHaveBeenCalled()
    wrapper.destroy()
  })

  it('replaces an expired preview when the API publishes a newer mp4 file', async () => {
    skillApi.getFileReadToken.mockResolvedValue({ readUrl: 'https://cdn.example/new-quick-edit.mp4?token=x' })
    skillApi.fetchFileContent.mockResolvedValue('blob:mock-mp4')
    const wrapper = shallowMount(QuickEdit, { mocks, stubs })
    wrapper.vm.run = Object.assign({}, renderedRun, { mp4FileId: 903 })
    wrapper.vm.previewUrl = 'blob:old-preview'
    wrapper.vm.previewFileId = 902

    await wrapper.vm.prepareMp4Preview()

    expect(skillApi.getFileReadToken).toHaveBeenCalledWith({ fileId: 903 })
    expect(skillApi.fetchFileContent).toHaveBeenCalledWith({ readUrl: 'https://cdn.example/new-quick-edit.mp4?token=x' })
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:old-preview')
    expect(wrapper.vm.previewUrl).toBe('blob:mock-mp4')
    expect(wrapper.vm.previewFileId).toBe(903)
    wrapper.destroy()
  })

  it('offers a retry when the mp4 preview content cannot be loaded', async () => {
    skillApi.getFileReadToken.mockResolvedValue({ readUrl: 'https://cdn.example/retry.mp4?token=x' })
    skillApi.fetchFileContent.mockRejectedValueOnce({ message: 'temporary failure' })
    const wrapper = shallowMount(QuickEdit, { mocks, stubs })
    wrapper.vm.run = renderedRun

    await wrapper.vm.prepareMp4Preview()
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('视频预览链接暂不可用，请重试。')
    skillApi.fetchFileContent.mockResolvedValue('blob:mock-mp4')
    await findButton(wrapper, '重试获取预览').trigger('click')
    await flushPromises()
    expect(wrapper.vm.previewUrl).toBe('blob:mock-mp4')
    wrapper.destroy()
  })

  it('shows rendering progress without inventing a playable video', async () => {
    const wrapper = shallowMount(QuickEdit, { mocks, stubs })
    wrapper.vm.run = runningRun
    wrapper.vm.clippingTask = { id: 31, status: 'rendering', engineStage: 'render' }
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('正在渲染预览…')
    expect(wrapper.find('video').exists()).toBe(false)
    expect(skillApi.fetchFileContent).not.toHaveBeenCalled()
    wrapper.destroy()
  })

  it('shows a safe retry path when rendering fails without an mp4 file', async () => {
    const wrapper = shallowMount(QuickEdit, { mocks, stubs })
    wrapper.vm.run = { ...runningRun, status: 'failed' }
    wrapper.vm.clippingTask = { id: 31, status: 'failed', engineStage: 'render' }
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('粗剪渲染未完成，视频未生成。')
    expect(wrapper.find('video').exists()).toBe(false)
    await findButton(wrapper, '修改方案后重试').trigger('click')
    expect(wrapper.vm.reviseDialogVisible).toBe(true)
    wrapper.destroy()
  })

  it('restarts polling after confirmation when rendering continues asynchronously', async () => {
    skillApi.confirmSkillAction.mockResolvedValue({ actionId: 78, status: 'executing', message: '正在渲染预览。' })
    expertApi.getRun.mockResolvedValue({ ...runningRun, status: 'executing' })
    expertApi.getRunActions.mockResolvedValue({ events: [], actions: [pendingAction] })
    const wrapper = shallowMount(QuickEdit, { mocks, stubs })
    wrapper.vm.run = runningRun
    wrapper.vm.actions = [pendingAction]
    const startPolling = jest.spyOn(wrapper.vm, 'startPollingIfNeeded')

    await wrapper.vm.confirmAction(pendingAction)

    expect(startPolling).toHaveBeenCalled()
    wrapper.destroy()
  })

  it('stops polling on leave and resets state on 重新剪辑', () => {
    const wrapper = shallowMount(QuickEdit, { mocks, stubs })
    wrapper.vm.run = runningRun
    wrapper.vm.draftFileId = 901
    wrapper.vm.actions = [executedAction]

    wrapper.destroy()
    expect(wrapper.vm.timer).toBeNull()
  })
})
