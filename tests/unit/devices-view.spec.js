import { shallowMount } from '@vue/test-utils'
import Devices from '../../src/views/app/Devices.vue'
import * as smartHomeApi from '../../src/api/smartHome'

jest.mock('../../src/api/smartHome', () => ({ getMockBootstrap: jest.fn() }))

const bootstrap = { isMock: true, disclaimer: '仅用于开发', spaces: [{ id: -1, name: '客厅' }, { id: -2, name: '卧室' }], devices: [{ id: -3, spaceId: -1, name: '主灯', onlineStatus: 'online', healthStatus: 'healthy', stateSummary: '已开启' }, { id: -4, spaceId: -2, name: '空调', onlineStatus: 'offline', healthStatus: 'offline', stateSummary: '已关闭' }] }
const stubs = {
  PageState: { props: ['title', 'description'], template: '<section class="page-state"><h3>{{ title }}</h3><p>{{ description }}</p></section>' },
  'el-tag': { template: '<span><slot /></span>' },
  'el-select': { props: ['value'], template: '<select />' },
  'el-option': { template: '<option />' },
  'el-table': { props: ['data'], template: '<div class="devices-table"><slot /></div>' },
  'el-table-column': { template: '<div />' }
}
const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('Devices', () => {
  beforeEach(() => smartHomeApi.getMockBootstrap.mockResolvedValue(bootstrap))
  afterEach(() => jest.clearAllMocks())

  it('loads devices and filters by space', async () => {
    const wrapper = shallowMount(Devices, { stubs })
    await flushPromises()
    expect(wrapper.text()).toContain('设备管理')
    expect(wrapper.vm.filteredDevices).toHaveLength(2)
    wrapper.setData({ spaceFilter: '-2' })
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.filteredDevices.map((device) => device.name)).toEqual(['空调'])
  })
})
