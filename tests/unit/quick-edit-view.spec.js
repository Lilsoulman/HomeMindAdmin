import { shallowMount } from '@vue/test-utils'
import QuickEdit from '../../src/views/app/QuickEdit.vue'
import * as skillApi from '../../src/api/skill'
import * as expertApi from '../../src/api/expert'

jest.mock('../../src/api/skill', () => ({
  createSkillRun: jest.fn(),
  confirmSkillAction: jest.fn(),
  getFileReadToken: jest.fn(),
  reviseSkillRun: jest.fn(),
  chatClipping: jest.fn(),
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
  $message: { success: jest.fn(), warning: jest.fn(), error: jest.fn() }
}

const stubs = {
  'el-steps': { template: '<div><slot /></div>' },
  'el-step': { template: '<div />' },
  'el-dialog': { props: ['visible'], template: '<div v-if="visible"><slot /><slot name="footer" /></div>' },
  'el-input': { props: ['value', 'placeholder'], template: '<input :value="value" @input="$emit(\'input\', $event.target.value)" />' },
  'el-button': { props: ['disabled', 'loading', 'type', 'plain', 'size'], template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>' },
  'el-tag': { template: '<span><slot /></span>' },
  MediaFileUpload: { template: '<div class="media-upload-stub" />' },
  PlanTimeline: { template: '<div class="plan-timeline-stub" />' }
}

const runningRun = { id: 55, status: 'pending_actions', resultSummary: '快速剪辑方案已生成：素材「探店.mp4」', createdAt: '2026-08-09T03:00:00Z' }
const completedRun = { id: 55, status: 'completed', resultSummary: '草稿已生成，打开剪映即可编辑。', createdAt: '2026-08-09T03:00:00Z', finishedAt: '2026-08-09T03:01:00Z' }
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

    expect(skillApi.chatClipping).toHaveBeenCalledWith({ message: '帮我剪视频', context: null })
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
      idempotencyKey: 'test-uuid-0001'
    })
    expect(wrapper.vm.run).toEqual(runningRun)
    expect(wrapper.vm.activeStep).toBe(3)
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

    await findButton(wrapper, '重新生成方案').trigger('click')
    await flushPromises()

    expect(skillApi.reviseSkillRun).toHaveBeenCalledWith({ runId: 55, instruction: '竖屏 60 秒', idempotencyKey: 'test-uuid-0001' })
    expect(wrapper.vm.reviseDialogVisible).toBe(false)
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

    await findButton(wrapper, '下载 .draft 草稿').trigger('click')
    await flushPromises()
    expect(skillApi.getFileReadToken).toHaveBeenCalledWith({ fileId: 901 })
    expect(window.open).toHaveBeenCalledWith('https://cdn.example/draft?token=x', '_blank')
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
