import { shallowMount } from '@vue/test-utils'
import Schedule from '../../src/views/app/Schedule.vue'
import * as scheduleApi from '../../src/api/schedule'

jest.mock('../../src/api/schedule', () => ({ createDocumentDeadline: jest.fn(), getTomorrowSchedulePreview: jest.fn(), listDocumentDeadlines: jest.fn(), listScheduleAvailability: jest.fn(), listScheduleConflicts: jest.fn(), listScheduleEvents: jest.fn(), listScheduleReminders: jest.fn() }))

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0))
const stubs = {
  PageState: { props: ['title'], template: '<div class="page-state-stub">{{ title }}</div>' },
  'el-tag': { template: '<span><slot /></span>' }, 'el-button': { props: ['disabled', 'loading'], template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>' },
  'el-select': { props: ['value'], template: '<select :value="value" @change="$emit(\'input\', $event.target.value); $emit(\'change\', $event.target.value)"><slot /></select>' }, 'el-option': { template: '<option><slot /></option>' },
  'el-input': { props: ['value'], template: '<input :value="value" @input="$emit(\'input\', $event.target.value)">' }, 'el-date-picker': { props: ['value'], template: '<input :value="value">' },
  'el-form': { template: '<form><slot /></form>' }, 'el-form-item': { template: '<div><slot /></div>' }, 'el-dialog': { props: ['visible'], template: '<div v-if="visible"><slot /><slot name="footer" /></div>' }, 'router-link': { template: '<a><slot /></a>' }
}
const mocks = { $store: { state: { auth: { tenantId: 8, role: 'owner' } } }, $message: { success: jest.fn(), error: jest.fn() } }

describe('Schedule view', () => {
  beforeEach(() => { scheduleApi.listScheduleEvents.mockResolvedValue([]); scheduleApi.listScheduleConflicts.mockResolvedValue([]); scheduleApi.listScheduleAvailability.mockResolvedValue([]); scheduleApi.listDocumentDeadlines.mockResolvedValue([]); scheduleApi.listScheduleReminders.mockResolvedValue([]); scheduleApi.getTomorrowSchedulePreview.mockResolvedValue({ date: null, events: [], conflicts: [], reminders: [] }) })
  afterEach(() => jest.clearAllMocks())

  it('loads all family coordination data and prevents duplicate deadline submissions', async () => {
    const wrapper = shallowMount(Schedule, { mocks, stubs }); await flushPromises()
    expect(scheduleApi.listScheduleEvents).toHaveBeenCalledWith(expect.objectContaining({ homeId: 8 }))
    expect(scheduleApi.listScheduleAvailability).toHaveBeenCalledWith(expect.objectContaining({ homeId: 8, durationMinutes: 60 }))
    expect(scheduleApi.getTomorrowSchedulePreview).toHaveBeenCalledWith({ homeId: 8 })
    wrapper.setData({ deadlineDialog: { visible: true, documentType: 'passport', displayName: '护照续期', expiresOn: '2026-12-01', submitting: false } })
    scheduleApi.createDocumentDeadline.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 5)))
    await Promise.all([wrapper.vm.createDeadline(), wrapper.vm.createDeadline()])
    expect(scheduleApi.createDocumentDeadline).toHaveBeenCalledTimes(1); wrapper.destroy()
  })

  it('keeps a viewer read-only', async () => {
    const wrapper = shallowMount(Schedule, { mocks: { ...mocks, $store: { state: { auth: { tenantId: 8, role: 'viewer' } } } }, stubs }); await flushPromises(); expect(wrapper.vm.canWrite).toBe(false); wrapper.destroy()
  })
})
