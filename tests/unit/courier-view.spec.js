import { shallowMount } from '@vue/test-utils'
import Courier from '../../src/views/app/Courier.vue'
import * as courierApi from '../../src/api/courier'

jest.mock('../../src/api/courier', () => ({ createShipment: jest.fn(), listCourierAnomalies: jest.fn(), listShipments: jest.fn(), refreshShipment: jest.fn() }))

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0))
const stubs = {
  PageState: { props: ['title'], template: '<div class="page-state-stub">{{ title }}</div>' },
  'el-tag': { template: '<span><slot /></span>' },
  'el-button': { props: ['disabled', 'loading'], template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>' },
  'el-input': { props: ['value'], template: '<input :value="value" @input="$emit(\'input\', $event.target.value)" />' },
  'el-checkbox': { props: ['value'], template: '<input type="checkbox" :checked="value" @change="$emit(\'input\', $event.target.checked)" />' },
  'el-date-picker': { props: ['value'], template: '<input :value="value" @input="$emit(\'input\', $event.target.value)" />' },
  'el-form': { template: '<form><slot /></form>' }, 'el-form-item': { template: '<div><slot /></div>' },
  'el-dialog': { props: ['visible'], template: '<div v-if="visible"><slot /><slot name="footer" /></div>' },
  'router-link': { template: '<a><slot /></a>' }
}
const mocks = { $store: { state: { auth: { tenantId: 8, role: 'owner' } } }, $message: { success: jest.fn(), error: jest.fn() } }

describe('Courier view', () => {
  beforeEach(() => { courierApi.listShipments.mockResolvedValue([]); courierApi.listCourierAnomalies.mockResolvedValue([]) })
  afterEach(() => jest.clearAllMocks())

  it('loads data and prevents duplicate refresh', async () => {
    const wrapper = shallowMount(Courier, { mocks, stubs }); await flushPromises()
    expect(courierApi.listShipments).toHaveBeenCalledWith({ homeId: 8 })
    const shipment = { id: 3, trackingNumberMasked: '******1234', latestStatus: 'in_transit' }
    wrapper.setData({ shipments: [shipment] })
    courierApi.refreshShipment.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve({ shipment: { ...shipment, latestStatus: 'delivered' }, anomalies: [] }), 5)))
    await Promise.all([wrapper.vm.refresh(shipment), wrapper.vm.refresh(shipment)])
    expect(courierApi.refreshShipment).toHaveBeenCalledTimes(1)
    wrapper.destroy()
  })

  it('keeps viewer read-only', async () => {
    const wrapper = shallowMount(Courier, { mocks: { ...mocks, $store: { state: { auth: { tenantId: 8, role: 'viewer' } } } }, stubs }); await flushPromises(); expect(wrapper.vm.canWrite).toBe(false); wrapper.destroy()
  })
})
