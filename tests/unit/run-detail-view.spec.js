import { shallowMount } from '@vue/test-utils'
import RunDetail from '../../src/views/app/RunDetail.vue'
import * as expertApi from '../../src/api/expert'

jest.mock('../../src/api/expert', () => ({
  getRun: jest.fn(),
  getRunEvents: jest.fn(),
  getRunActions: jest.fn(),
  confirmRunAction: jest.fn()
}))

jest.mock('../../src/utils/idempotency', () => ({
  createIdempotencyKey: jest.fn(() => 'test-uuid-0001')
}))

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0))
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const mocks = {
  $store: { state: { auth: { tenantId: 14, role: 'member' } } },
  $message: { success: jest.fn(), warning: jest.fn(), error: jest.fn() },
  $route: { params: { id: '9' } }
}

const stubs = {
  PageState: {
    props: ['title', 'description'],
    template: '<section class="page-state"><h3>{{ title }}</h3><p>{{ description }}</p><button class="retry-btn" @click="$emit(\'retry\')">重试</button></section>'
  },
  'el-tag': { template: '<span><slot /></span>' },
  'el-button': { template: '<button @click="$emit(\'click\')"><slot /></button>' }
}

const completedRun = { id: 9, status: 'completed', resultSummary: '已生成建议', createdAt: '2026-08-02T03:11:22Z' }
const runningRun = { id: 9, status: 'running', resultSummary: null, createdAt: '2026-08-02T03:11:22Z' }
const pendingAction = { id: 78, actionType: 'smart_home_device', status: 'pending', title: '开阳台灯', deviceName: '阳台灯', capability: 'power', targetValue: { on: true } }

describe('RunDetail polling', () => {
  beforeEach(() => {
    expertApi.getRunEvents.mockResolvedValue([])
    expertApi.getRunActions.mockResolvedValue({ events: [], actions: [] })
  })

  afterEach(() => jest.clearAllMocks())

  it('does not poll when the run is already terminal', async () => {
    expertApi.getRun.mockResolvedValue(completedRun)
    const wrapper = shallowMount(RunDetail, { mocks, stubs, propsData: { pollInterval: 10 } })
    await flushPromises()

    expect(expertApi.getRun).toHaveBeenCalledTimes(1)
    await sleep(80)
    expect(expertApi.getRun).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('已完成')
    wrapper.destroy()
  })

  it('polls while running and stops at terminal status', async () => {
    expertApi.getRun.mockResolvedValueOnce(runningRun).mockResolvedValueOnce(runningRun).mockResolvedValue(completedRun)
    const wrapper = shallowMount(RunDetail, { mocks, stubs, propsData: { pollInterval: 10 } })
    await flushPromises()

    expect(expertApi.getRun).toHaveBeenCalledTimes(1)
    await sleep(60)
    expect(expertApi.getRun.mock.calls.length).toBeGreaterThan(1)

    await sleep(60)
    const callsAfterTerminal = expertApi.getRun.mock.calls.length
    await sleep(80)
    expect(expertApi.getRun.mock.calls.length).toBe(callsAfterTerminal)
    wrapper.destroy()
  })

  it('stops polling when leaving the page', async () => {
    expertApi.getRun.mockResolvedValue(runningRun)
    const wrapper = shallowMount(RunDetail, { mocks, stubs, propsData: { pollInterval: 10 } })
    await flushPromises()

    await sleep(30)
    expect(expertApi.getRun.mock.calls.length).toBeGreaterThan(1)

    wrapper.destroy()
    const callsAfterDestroy = expertApi.getRun.mock.calls.length
    await sleep(60)
    expect(expertApi.getRun.mock.calls.length).toBe(callsAfterDestroy)
  })

  it('confirms a pending action with a new idempotency key', async () => {
    expertApi.getRun.mockResolvedValue(completedRun)
    expertApi.getRunActions.mockResolvedValue({ events: [], actions: [pendingAction] })
    expertApi.confirmRunAction.mockResolvedValue({ actionId: 78, status: 'executed', message: '设备行动已执行。' })
    const wrapper = shallowMount(RunDetail, { mocks, stubs, propsData: { pollInterval: 10 } })
    await flushPromises()

    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(expertApi.confirmRunAction).toHaveBeenCalledWith({ runId: 9, actionId: 78, idempotencyKey: 'test-uuid-0001' })
    expect(mocks.$message.success).toHaveBeenCalledWith('设备行动已执行。')
    wrapper.destroy()
  })
})
