import { shallowMount } from '@vue/test-utils'
import Overview from '../../src/views/app/Overview.vue'
import * as householdApi from '../../src/api/household'
import * as smartHomeApi from '../../src/api/smartHome'

jest.mock('../../src/api/household', () => ({ getHouseholdState: jest.fn() }))
jest.mock('../../src/api/smartHome', () => ({ getMockBootstrap: jest.fn() }))

const bootstrap = { isMock: true, disclaimer: '仅用于开发', generatedAt: '2026-08-24T00:00:00Z', spaces: [{ id: -1, name: '客厅', summary: '舒适', deviceCount: 1 }], devices: [], scenes: [], deviceHealth: { total: 1, healthy: 1, degraded: 0, offline: 0, lowBattery: 0 } }
const household = { homeId: 14, context: 'Family', members: [{ id: 1 }], devices: [], degradedReasons: [] }
const stubs = {
  PageState: { props: ['title', 'description'], template: '<section class="page-state"><h3>{{ title }}</h3><p>{{ description }}</p><button @click="$emit(\'retry\')">重试</button></section>' },
  'el-tag': { template: '<span><slot /></span>' },
  'router-link': { template: '<a><slot /></a>' }
}
const mocks = { $store: { state: { auth: { tenantId: 14 } } } }
const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('Overview', () => {
  beforeEach(() => {
    smartHomeApi.getMockBootstrap.mockResolvedValue(bootstrap)
    householdApi.getHouseholdState.mockResolvedValue(household)
  })
  afterEach(() => jest.clearAllMocks())

  it('loads mock bootstrap and household context', async () => {
    const wrapper = shallowMount(Overview, { mocks, stubs })
    await flushPromises()
    expect(smartHomeApi.getMockBootstrap).toHaveBeenCalled()
    expect(householdApi.getHouseholdState).toHaveBeenCalledWith({ homeId: 14 })
    expect(wrapper.text()).toContain('开发期模拟数据')
    expect(wrapper.text()).toContain('客厅')
  })

  it('shows retry state when bootstrap fails', async () => {
    smartHomeApi.getMockBootstrap.mockRejectedValue({ message: '服务不可用' })
    const wrapper = shallowMount(Overview, { mocks, stubs })
    await flushPromises()
    expect(wrapper.find('.page-state').text()).toContain('服务不可用')
  })
})
