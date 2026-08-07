import { shallowMount } from '@vue/test-utils'
import Confirmations from '../../src/views/app/Confirmations.vue'
import * as confirmationApi from '../../src/api/confirmation'

jest.mock('../../src/api/confirmation', () => ({
  listConfirmations: jest.fn(),
  confirmConfirmation: jest.fn(),
  denyConfirmation: jest.fn(),
  batchConfirmConfirmations: jest.fn()
}))

jest.mock('../../src/utils/idempotency', () => ({
  createIdempotencyKey: jest.fn(() => 'test-uuid-0001')
}))

const flushPromises = () => new Promise((resolve) => setTimeout(resolve))

const mocks = {
  $store: { state: { auth: { tenantId: 14, role: 'owner' } } },
  $message: { success: jest.fn(), warning: jest.fn(), error: jest.fn() },
  $confirm: jest.fn()
}

const tableStubs = {
  PageState: {
    props: ['title', 'description'],
    template: '<section class="page-state"><h3>{{ title }}</h3><p>{{ description }}</p><button class="retry-btn" @click="$emit(\'retry\')">重试</button></section>'
  },
  'el-table': { template: '<div><slot /></div>' },
  'el-table-column': { template: '<div />' },
  'el-select': { template: '<div><slot /></div>' },
  'el-option': { template: '<div><slot /></div>' },
  'el-button': { template: '<button @click="$emit(\'click\')"><slot /></button>' },
  'el-tag': { template: '<span><slot /></span>' },
  'el-dialog': { template: '<div><slot /><slot name="footer" /></div>' },
  'el-input': { template: '<input />' }
}

const pendingItem = {
  id: 101, riskLevel: 'L2', title: '调低热水器温度', impactSummary: '影响热水器设置',
  suggestedAction: '确认后执行', status: 'pending', expiresAt: '2026-08-08T10:00:00Z'
}

describe('Confirmations view', () => {
  afterEach(() => jest.clearAllMocks())

  it('shows loading while fetching', async () => {
    confirmationApi.listConfirmations.mockReturnValue(new Promise(() => {}))
    const wrapper = shallowMount(Confirmations, { mocks, stubs: tableStubs, directives: { loading: () => {} } })
    expect(wrapper.text()).toContain('正在加载确认事项')
    wrapper.destroy()
  })

  it('shows error state with retry that reloads', async () => {
    confirmationApi.listConfirmations.mockRejectedValueOnce({ status: 0, message: '网络连接异常，请稍后重试。' })
    const wrapper = shallowMount(Confirmations, { mocks, stubs: tableStubs, directives: { loading: () => {} } })
    await flushPromises()
    expect(wrapper.text()).toContain('确认事项暂不可用')

    confirmationApi.listConfirmations.mockResolvedValueOnce([pendingItem])
    await wrapper.find('.retry-btn').trigger('click')
    await flushPromises()
    expect(confirmationApi.listConfirmations).toHaveBeenCalledTimes(2)
    wrapper.destroy()
  })

  it('shows empty state when no items', async () => {
    confirmationApi.listConfirmations.mockResolvedValue([])
    const wrapper = shallowMount(Confirmations, { mocks, stubs: tableStubs, directives: { loading: () => {} } })
    await flushPromises()
    expect(wrapper.text()).toContain('暂无确认事项')
    wrapper.destroy()
  })

  it('uses a new idempotency key when confirming a pending item', async () => {
    confirmationApi.listConfirmations.mockResolvedValue([pendingItem])
    confirmationApi.confirmConfirmation.mockResolvedValue({ ...pendingItem, status: 'confirmed' })
    const wrapper = shallowMount(Confirmations, { mocks, stubs: tableStubs, directives: { loading: () => {} } })
    await flushPromises()

    wrapper.vm.confirmOne(pendingItem)
    await flushPromises()

    expect(confirmationApi.confirmConfirmation).toHaveBeenCalledWith({
      homeId: 14, id: 101, idempotencyKey: 'test-uuid-0001'
    })
    expect(mocks.$message.success).toHaveBeenCalled()
    wrapper.destroy()
  })

  it('refreshes the list after a 409 conflict', async () => {
    confirmationApi.listConfirmations.mockResolvedValue([pendingItem])
    confirmationApi.confirmConfirmation.mockRejectedValue({ status: 409, message: '该确认项已处于终态。' })
    const wrapper = shallowMount(Confirmations, { mocks, stubs: tableStubs, directives: { loading: () => {} } })
    await flushPromises()
    expect(confirmationApi.listConfirmations).toHaveBeenCalledTimes(1)

    wrapper.vm.confirmOne(pendingItem)
    await flushPromises()

    expect(mocks.$message.warning).toHaveBeenCalled()
    expect(confirmationApi.listConfirmations).toHaveBeenCalledTimes(2)
    wrapper.destroy()
  })
})
