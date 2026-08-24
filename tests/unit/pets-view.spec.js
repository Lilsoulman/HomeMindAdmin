import { shallowMount } from '@vue/test-utils'
import Pets from '../../src/views/app/Pets.vue'
import * as petApi from '../../src/api/pet'

jest.mock('../../src/api/pet', () => ({ addPetCareEvent: jest.fn(), createPet: jest.fn(), listPetAlerts: jest.fn(), listPetCareEvents: jest.fn(), listPetSupplies: jest.fn(), listPets: jest.fn(), upsertPetSupply: jest.fn() }))

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0))
const stubs = {
  PageState: { props: ['title'], template: '<div class="page-state-stub">{{ title }}</div>' },
  'el-tag': { template: '<span><slot /></span>' }, 'el-button': { props: ['disabled', 'loading'], template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>' },
  'el-input': { props: ['value'], template: '<input :value="value" @input="$emit(\'input\', $event.target.value)">' }, 'el-input-number': { props: ['value'], template: '<input :value="value">' },
  'el-date-picker': { props: ['value'], template: '<input :value="value">' }, 'el-select': { props: ['value'], template: '<select :value="value" @change="$emit(\'input\', $event.target.value); $emit(\'change\', $event.target.value)"><slot /></select>' }, 'el-option': { template: '<option><slot /></option>' },
  'el-form': { template: '<form><slot /></form>' }, 'el-form-item': { template: '<div><slot /></div>' }, 'el-dialog': { props: ['visible'], template: '<div v-if="visible"><slot /><slot name="footer" /></div>' }, 'router-link': { template: '<a><slot /></a>' }
}
const mocks = { $store: { state: { auth: { tenantId: 8, role: 'owner' } } }, $message: { success: jest.fn(), error: jest.fn() } }

describe('Pets view', () => {
  beforeEach(() => { petApi.listPets.mockResolvedValue([]); petApi.listPetAlerts.mockResolvedValue([]); petApi.listPetCareEvents.mockResolvedValue([]); petApi.listPetSupplies.mockResolvedValue([]) })
  afterEach(() => jest.clearAllMocks())

  it('loads household data and prevents duplicate profile submissions', async () => {
    const wrapper = shallowMount(Pets, { mocks, stubs }); await flushPromises()
    expect(petApi.listPets).toHaveBeenCalledWith({ homeId: 8 }); expect(petApi.listPetAlerts).toHaveBeenCalledWith({ homeId: 8 })
    wrapper.setData({ petDialog: { visible: true, name: '豆豆', species: 'cat', breed: '', birthDate: null, submitting: false } })
    petApi.createPet.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve({ id: 3, name: '豆豆' }), 5)))
    await Promise.all([wrapper.vm.createPetProfile(), wrapper.vm.createPetProfile()])
    expect(petApi.createPet).toHaveBeenCalledTimes(1); wrapper.destroy()
  })

  it('keeps a viewer read-only', async () => {
    const wrapper = shallowMount(Pets, { mocks: { ...mocks, $store: { state: { auth: { tenantId: 8, role: 'viewer' } } } }, stubs }); await flushPromises(); expect(wrapper.vm.canWrite).toBe(false); wrapper.destroy()
  })
})
