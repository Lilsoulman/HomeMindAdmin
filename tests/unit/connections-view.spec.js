import { shallowMount } from '@vue/test-utils'
import Connections from '../../src/views/app/Connections.vue'
import * as connectorApi from '../../src/api/connector'

jest.mock('../../src/api/connector', () => ({
  getMyConnections: jest.fn(),
  listProviders: jest.fn(),
  startPersonalAuthorization: jest.fn(),
  revokePersonalAuthorization: jest.fn()
}))

const flushPromises = () => new Promise((resolve) => setTimeout(resolve))

const mocks = {
  $store: { state: { auth: { role: 'owner' } } },
  $message: { success: jest.fn(), warning: jest.fn(), error: jest.fn() },
  $confirm: jest.fn()
}

const stubs = {
  PageState: {
    props: ['title', 'description'],
    template: '<section class="page-state"><h3>{{ title }}</h3><p>{{ description }}</p><button class="retry-btn" @click="$emit(\'retry\')">重试</button></section>'
  },
  'el-button': { template: '<button @click="$emit(\'click\')"><slot /></button>' },
  'el-tag': { template: '<span><slot /></span>' },
  'el-dialog': { template: '<div><slot /><slot name="footer" /></div>' }
}

const connectedItem = {
  connectorId: 8, providerId: 1, providerCode: 'mock_oauth', providerName: 'Mock OAuth（开发验证）',
  name: '我的日历', status: 'connected', authStatus: 'connected', lastSyncAt: null,
  lastHealthAt: '2026-08-07T09:00:00Z', lastSessionId: 101, lastSessionStatus: 'completed', lastSessionExpiresAt: null
}

const revokedItem = {
  ...connectedItem, connectorId: 9, name: '已撤销日历', status: 'disconnected', authStatus: 'revoked',
  lastSessionStatus: 'revoked'
}

const pendingItem = {
  ...connectedItem, connectorId: 10, name: '待授权日历', authStatus: 'pending',
  lastSessionStatus: 'pending', lastSessionExpiresAt: '2099-01-01T00:00:00Z'
}

const findButton = (wrapper, text) => wrapper.findAll('button').wrappers.find((w) => w.text().includes(text))

describe('Connections view', () => {
  afterEach(() => {
    jest.clearAllMocks()
    window.sessionStorage.clear()
  })

  it('shows loading while fetching', async () => {
    connectorApi.getMyConnections.mockReturnValue(new Promise(() => {}))
    const wrapper = shallowMount(Connections, { mocks, stubs })
    expect(wrapper.text()).toContain('正在加载我的连接')
    wrapper.destroy()
  })

  it('shows error state with retry that reloads', async () => {
    connectorApi.getMyConnections.mockRejectedValueOnce({ status: 0, message: '网络连接异常，请稍后重试。' })
    const wrapper = shallowMount(Connections, { mocks, stubs })
    await flushPromises()
    expect(wrapper.text()).toContain('连接暂不可用')

    connectorApi.getMyConnections.mockResolvedValueOnce([])
    await wrapper.find('.retry-btn').trigger('click')
    await flushPromises()
    expect(connectorApi.getMyConnections).toHaveBeenCalledTimes(2)
    wrapper.destroy()
  })

  it('shows empty state when no items', async () => {
    connectorApi.getMyConnections.mockResolvedValue([])
    const wrapper = shallowMount(Connections, { mocks, stubs })
    await flushPromises()
    expect(wrapper.text()).toContain('暂无连接')
    wrapper.destroy()
  })

  it('renders connections with masked status only', async () => {
    connectorApi.getMyConnections.mockResolvedValue([connectedItem])
    const wrapper = shallowMount(Connections, { mocks, stubs })
    await flushPromises()
    expect(wrapper.text()).toContain('我的日历')
    expect(wrapper.text()).toContain('已连接')
    expect(wrapper.text()).toContain('已授权')
    wrapper.destroy()
  })

  it('shows pending hint for an in-progress session', async () => {
    connectorApi.getMyConnections.mockResolvedValue([pendingItem])
    const wrapper = shallowMount(Connections, { mocks, stubs })
    await flushPromises()
    expect(wrapper.text()).toContain('等待完成授权')
    expect(wrapper.text()).toContain('请在授权页面完成该连接的授权流程。')
    wrapper.destroy()
  })

  it('starts authorization from the provider dialog', async () => {
    connectorApi.getMyConnections.mockResolvedValue([])
    connectorApi.listProviders.mockResolvedValue([
      { id: 1, code: 'mock_oauth', name: 'Mock OAuth', connectorType: 'calendar', description: '开发验证' }
    ])
    connectorApi.startPersonalAuthorization.mockResolvedValue({
      sessionId: 101, providerCode: 'mock_oauth', providerName: 'Mock OAuth', status: 'pending',
      expiresAt: '2099-01-01T00:00:00Z', authorizationUrl: 'http://localhost:5280/api/v1/connector-providers/mock_oauth/authorize?state=abc'
    })

    Object.defineProperty(window, 'location', { writable: true, value: { href: '', origin: 'http://localhost:8080' } })

    const wrapper = shallowMount(Connections, { mocks, stubs })
    await flushPromises()

    await findButton(wrapper, '添加个人连接').trigger('click')
    await flushPromises()
    await wrapper.find('.provider-card').trigger('click')
    await findButton(wrapper, '前往授权').trigger('click')
    await flushPromises()

    expect(connectorApi.startPersonalAuthorization).toHaveBeenCalledWith({
      providerCode: 'mock_oauth',
      redirectUri: 'http://localhost:8080/oauth/callback'
    })
    expect(window.sessionStorage.getItem('oauthSessionId')).toBe('101')
    expect(window.location.href).toBe('http://localhost:5280/api/v1/connector-providers/mock_oauth/authorize?state=abc')
    wrapper.destroy()
  })

  it('reauthorizes a revoked connection', async () => {
    connectorApi.getMyConnections.mockResolvedValue([revokedItem])
    connectorApi.startPersonalAuthorization.mockResolvedValue({
      sessionId: 102, providerCode: 'mock_oauth', providerName: 'Mock OAuth', status: 'pending',
      expiresAt: '2099-01-01T00:00:00Z', authorizationUrl: 'http://localhost:5280/api/v1/connector-providers/mock_oauth/authorize?state=def'
    })

    Object.defineProperty(window, 'location', { writable: true, value: { href: '', origin: 'http://localhost:8080' } })

    const wrapper = shallowMount(Connections, { mocks, stubs })
    await flushPromises()
    expect(wrapper.text()).toContain('可点击重新授权')

    await findButton(wrapper, '重新授权').trigger('click')
    await flushPromises()

    expect(connectorApi.startPersonalAuthorization).toHaveBeenCalledWith({
      providerCode: 'mock_oauth',
      redirectUri: 'http://localhost:8080/oauth/callback'
    })
    expect(window.location.href).toBe('http://localhost:5280/api/v1/connector-providers/mock_oauth/authorize?state=def')
    wrapper.destroy()
  })

  it('revokes after confirmation and reloads', async () => {
    connectorApi.getMyConnections.mockResolvedValue([connectedItem])
    connectorApi.revokePersonalAuthorization.mockResolvedValue({
      sessionId: 101, providerCode: 'mock_oauth', providerName: 'Mock OAuth', status: 'revoked',
      expiresAt: null, authorizationUrl: null
    })
    mocks.$confirm.mockResolvedValue()

    const wrapper = shallowMount(Connections, { mocks, stubs })
    await flushPromises()

    await findButton(wrapper, '撤销').trigger('click')
    await flushPromises()

    expect(mocks.$confirm).toHaveBeenCalled()
    expect(connectorApi.revokePersonalAuthorization).toHaveBeenCalledWith({ id: 101 })
    expect(connectorApi.getMyConnections).toHaveBeenCalledTimes(2)
    expect(mocks.$message.success).toHaveBeenCalled()
    wrapper.destroy()
  })

  it('skips revocation when confirmation is cancelled', async () => {
    connectorApi.getMyConnections.mockResolvedValue([connectedItem])
    mocks.$confirm.mockRejectedValue()

    const wrapper = shallowMount(Connections, { mocks, stubs })
    await flushPromises()

    await findButton(wrapper, '撤销').trigger('click')
    await flushPromises()

    expect(connectorApi.revokePersonalAuthorization).not.toHaveBeenCalled()
    wrapper.destroy()
  })
})
