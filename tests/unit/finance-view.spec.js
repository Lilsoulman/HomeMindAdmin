import { shallowMount } from '@vue/test-utils'
import Finance from '../../src/views/app/Finance.vue'
import * as financeApi from '../../src/api/finance'

jest.mock('../../src/api/finance', () => ({
  createBillingAccount: jest.fn(), getBillingTrend: jest.fn(), getFinanceSummary: jest.fn(), importTransactions: jest.fn(), listBillingAccounts: jest.fn(), listBillingReminders: jest.fn(), listTransactions: jest.fn(), recordBillingPayment: jest.fn()
}))

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0))
const stubs = {
  PageState: { props: ['title'], template: '<div class="page-state-stub">{{ title }}</div>' },
  'el-tag': { template: '<span><slot /></span>' },
  'el-button': { props: ['disabled', 'loading'], template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>' },
  'el-input': { props: ['value'], template: '<textarea :value="value" @input="$emit(\'input\', $event.target.value)" />' },
  'el-date-picker': { props: ['value'], template: '<input :value="value" @input="$emit(\'input\', $event.target.value)" />' },
  'el-select': { props: ['value'], template: '<select :value="value" @change="$emit(\'input\', $event.target.value); $emit(\'change\', $event.target.value)"><slot /></select>' },
  'el-option': { template: '<option><slot /></option>' },
  'el-form': { template: '<form><slot /></form>' },
  'el-form-item': { template: '<div><slot /></div>' },
  'el-input-number': { props: ['value'], template: '<input :value="value" />' },
  'el-dialog': { props: ['visible'], template: '<div v-if="visible"><slot /><slot name="footer" /></div>' },
  'el-alert': { template: '<div><slot /></div>' },
  'el-progress': { template: '<div />' },
  'router-link': { template: '<a><slot /></a>' }
}

const mocks = { $store: { state: { auth: { tenantId: 8, role: 'owner' } } }, $message: { success: jest.fn(), error: jest.fn() } }

describe('Finance view', () => {
  beforeEach(() => {
    financeApi.listTransactions.mockResolvedValue([])
    financeApi.getFinanceSummary.mockResolvedValue({ totalAmount: 0, transactionCount: 0, categories: [], suggestions: [] })
    financeApi.listBillingAccounts.mockResolvedValue([])
    financeApi.listBillingReminders.mockResolvedValue([])
    financeApi.getBillingTrend.mockResolvedValue({ year: 2026, totalAmount: 0, months: [] })
  })
  afterEach(() => jest.clearAllMocks())

  it('loads the family data and prevents duplicate CSV submissions', async () => {
    const wrapper = shallowMount(Finance, { mocks, stubs })
    await flushPromises()
    expect(financeApi.listTransactions).toHaveBeenCalledWith({ homeId: 8, from: '', to: '', category: '' })
    wrapper.setData({ csv: 'date,merchant,amount,currency,category\n2026-08-01,超市,10,CNY,日用' })
    financeApi.importTransactions.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve({ imported: 1, skipped: 0 }), 5)))
    const first = wrapper.vm.importCsv()
    const second = wrapper.vm.importCsv()
    await Promise.all([first, second])
    expect(financeApi.importTransactions).toHaveBeenCalledTimes(1)
    wrapper.destroy()
  })

  it('marks viewer as read-only', async () => {
    const wrapper = shallowMount(Finance, { mocks: { ...mocks, $store: { state: { auth: { tenantId: 8, role: 'viewer' } } } }, stubs })
    await flushPromises()
    expect(wrapper.vm.canWrite).toBe(false)
    wrapper.destroy()
  })
})
