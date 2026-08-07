import { shallowMount } from '@vue/test-utils'
import ConnectorDetail from '../../src/views/console/ConnectorDetail.vue'
import * as connectorApi from '../../src/api/connector'
import * as tenantApi from '../../src/api/tenant'

jest.mock('../../src/api/connector', () => ({
  listConnectors: jest.fn(),
  getMyAuthorization: jest.fn(),
  syncConnector: jest.fn(),
  getSyncJob: jest.fn(),
  testConnector: jest.fn(),
  discoverConnector: jest.fn(),
  updateMemberAuthorization: jest.fn()
}))

jest.mock('../../src/api/tenant', () => ({
  listTenantMembers: jest.fn()
}))

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0))
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const mocks = {
  $store: { state: { auth: { tenantId: 14, role: 'owner' } } },
  $message: { success: jest.fn(), warning: jest.fn(), error: jest.fn() },
  $route: { params: { id: '8' } },
  $router: { push: jest.fn() }
}

const stubs = {
  PageState: {
    props: ['title', 'description'],
    template: '<section class="page-state"><h3>{{ title }}</h3><p>{{ description }}</p><button class="retry-btn" @click="$emit(\'retry\')">重试</button></section>'
  },
  'el-button': { template: '<button @click="$emit(\'click\')"><slot /></button>' },
  'el-tag': { template: '<span><slot /></span>' },
  'el-input': { template: '<input />' }
}

function findButton(wrapper, text) {
  return wrapper.findAll('button').wrappers.find((item) => item.text().includes(text))
}

const connector = {
  id: 8, providerId: 1, providerName: 'Home Assistant', name: '我家HA', status: 'connected',
  lastHealthAt: null, lastSyncAt: null, bindingScope: 'household'
}

describe('ConnectorDetail sync polling', () => {
  beforeEach(() => {
    connectorApi.listConnectors.mockResolvedValue([connector])
    connectorApi.getMyAuthorization.mockRejectedValue({ status: 403 })
    tenantApi.listTenantMembers.mockResolvedValue([])
  })

  afterEach(() => jest.clearAllMocks())

  const mountView = async () => {
    const wrapper = shallowMount(ConnectorDetail, { mocks, stubs, propsData: { pollInterval: 10 } })
    await flushPromises()
    return wrapper
  }

  it('polls the sync job and stops on terminal status', async () => {
    connectorApi.syncConnector.mockResolvedValue({ id: 21, connectorId: 8, status: 'queued' })
    connectorApi.getSyncJob.mockResolvedValue({ id: 21, connectorId: 8, status: 'completed' })

    const wrapper = await mountView()
    await findButton(wrapper, '同步状态').trigger('click')
    await flushPromises()

    expect(connectorApi.syncConnector).toHaveBeenCalledWith({ id: 8 })
    expect(connectorApi.getSyncJob).not.toHaveBeenCalled()

    await sleep(60)
    expect(connectorApi.getSyncJob).toHaveBeenCalledWith({ jobId: 21 })
    expect(mocks.$message.success).toHaveBeenCalledWith('同步完成。')

    const callsAfterTerminal = connectorApi.getSyncJob.mock.calls.length
    await sleep(80)
    expect(connectorApi.getSyncJob.mock.calls.length).toBe(callsAfterTerminal)
    wrapper.destroy()
  })

  it('stops polling when leaving the page', async () => {
    connectorApi.syncConnector.mockResolvedValue({ id: 21, connectorId: 8, status: 'running' })
    connectorApi.getSyncJob.mockResolvedValue({ id: 21, connectorId: 8, status: 'running' })

    const wrapper = await mountView()
    await findButton(wrapper, '同步状态').trigger('click')
    await flushPromises()

    await sleep(30)
    expect(connectorApi.getSyncJob.mock.calls.length).toBeGreaterThan(0)

    wrapper.destroy()
    const callsAfterDestroy = connectorApi.getSyncJob.mock.calls.length
    await sleep(60)
    expect(connectorApi.getSyncJob.mock.calls.length).toBe(callsAfterDestroy)
  })

  it('stops polling and reports failure on failed job', async () => {
    connectorApi.syncConnector.mockResolvedValue({ id: 21, connectorId: 8, status: 'queued' })
    connectorApi.getSyncJob.mockResolvedValue({ id: 21, connectorId: 8, status: 'failed', reason: '上游超时' })

    const wrapper = await mountView()
    await findButton(wrapper, '同步状态').trigger('click')
    await flushPromises()

    await sleep(60)
    expect(mocks.$message.error).toHaveBeenCalledWith('上游超时')

    const callsAfterFailure = connectorApi.getSyncJob.mock.calls.length
    await sleep(80)
    expect(connectorApi.getSyncJob.mock.calls.length).toBe(callsAfterFailure)
    wrapper.destroy()
  })
})
