import { shallowMount } from '@vue/test-utils'
import Connections from '../../src/views/app/Connections.vue'
import * as connectorApi from '../../src/api/connector'
import * as qrcode from 'qrcode'

jest.mock('../../src/api/connector', () => ({
  getMyConnections: jest.fn(),
  listProviders: jest.fn(),
  startPersonalAuthorization: jest.fn(),
  pollAuthorization: jest.fn(),
  revokePersonalAuthorization: jest.fn()
}))

jest.mock('../../src/utils/permission', () => ({
  hasPermission: jest.fn(() => true)
}))

jest.mock('qrcode', () => ({
  toDataURL: jest.fn(() => Promise.resolve('data:image/png;base64,QR'))
}))

const flushAll = async () => {
  for (let i = 0; i < 5; i += 1) await Promise.resolve()
}

const stubs = {
  'el-dialog': {
    props: ['visible', 'title'],
    template: '<div class="el-dialog-stub" @click="$emit(\'close\')"><div class="el-dialog-stub__title">{{ title }}</div><slot /><slot name="footer" /></div>'
  },
  'el-button': {
    props: ['disabled', 'loading', 'type', 'plain', 'size'],
    template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>'
  },
  'el-tag': { template: '<span><slot /></span>' }
}

function mockLocation() {
  const store = { href: '', origin: 'http://localhost:8080' }
  const original = window.location
  Object.defineProperty(window, 'location', {
    configurable: true,
    get: () => store,
    set: () => {}
  })
  return {
    store,
    restore() {
      Object.defineProperty(window, 'location', { configurable: true, value: original })
    }
  }
}

describe('Connections view - QR auth flow', () => {
  let location
  let wrapper

  beforeEach(() => {
    jest.useFakeTimers()
    location = mockLocation()
    connectorApi.getMyConnections.mockResolvedValue([])
    connectorApi.listProviders.mockResolvedValue([])
    connectorApi.pollAuthorization.mockResolvedValue({ sessionId: 2, status: 'pending' })
    wrapper = shallowMount(Connections, {
      mocks: {
        $message: { success: jest.fn(), error: jest.fn(), warning: jest.fn() },
        $store: { state: { auth: { role: 'owner' } } }
      },
      stubs
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
    jest.useRealTimers()
    location.restore()
    wrapper.destroy()
  })

  const start = async (providerCode) => {
    await wrapper.vm.startAuthorization(providerCode)
    await flushAll()
  }

  it('redirects when authorizationUrl is present and never opens the QR dialog', async () => {
    connectorApi.startPersonalAuthorization.mockResolvedValue({
      sessionId: 1,
      status: 'pending',
      authorizationUrl: 'https://auth.example.com/authorize',
      qrContent: null
    })

    await start('weibo')

    expect(location.store.href).toBe('https://auth.example.com/authorize')
    expect(wrapper.vm.qrDialogVisible).toBe(false)
    expect(connectorApi.pollAuthorization).not.toHaveBeenCalled()
  })

  it('opens QR dialog and starts polling when authorizationUrl is null', async () => {
    connectorApi.startPersonalAuthorization.mockResolvedValue({
      sessionId: 2,
      status: 'pending',
      authorizationUrl: null,
      qrContent: 'mock-qr://xhs-login'
    })

    await start('xhs')

    expect(location.store.href).toBe('')
    expect(wrapper.vm.qrDialogVisible).toBe(true)
    expect(wrapper.vm.qrPolling).toBe(true)
    expect(qrcode.toDataURL).toHaveBeenCalledWith('mock-qr://xhs-login', { width: 180, margin: 1 })
    const qrImg = wrapper.find('.qr-auth-qr')
    expect(qrImg.exists()).toBe(true)
    expect(qrImg.attributes('src')).toBe('data:image/png;base64,QR')

    jest.advanceTimersByTime(3000)
    await flushAll()
    expect(connectorApi.pollAuthorization).toHaveBeenCalledWith({ id: 2 })
  })

  it('renders a QR image response directly without re-encoding it', async () => {
    connectorApi.startPersonalAuthorization.mockResolvedValue({
      sessionId: 2,
      status: 'pending',
      authorizationUrl: null,
      qrContent: 'data:image/png;base64,QR'
    })

    await start('xhs')

    expect(wrapper.find('.qr-auth-qr').attributes('src')).toBe('data:image/png;base64,QR')
    expect(qrcode.toDataURL).not.toHaveBeenCalled()
  })

  it('shows a placeholder and skips QR rendering when qrContent is empty', async () => {
    connectorApi.startPersonalAuthorization.mockResolvedValue({
      sessionId: 3,
      status: 'pending',
      authorizationUrl: null,
      qrContent: ''
    })

    await start('xhs')

    expect(wrapper.vm.qrDialogVisible).toBe(true)
    expect(wrapper.find('.qr-auth-qr').exists()).toBe(false)
    expect(wrapper.find('.qr-auth-placeholder').text()).toBe('二维码生成失败，请关闭窗口后重新发起授权。')
    expect(qrcode.toDataURL).not.toHaveBeenCalled()
  })

  it('stops polling, closes dialog, refreshes list and notifies on completed', async () => {
    connectorApi.startPersonalAuthorization.mockResolvedValue({
      sessionId: 2,
      status: 'pending',
      authorizationUrl: null,
      qrContent: 'mock-qr://xhs-login'
    })
    connectorApi.pollAuthorization.mockResolvedValue({ sessionId: 2, status: 'completed' })

    await start('xhs')
    expect(connectorApi.getMyConnections).toHaveBeenCalledTimes(1)

    jest.advanceTimersByTime(3000)
    await flushAll()

    expect(wrapper.vm.qrDialogVisible).toBe(false)
    expect(wrapper.vm.qrPolling).toBe(false)
    expect(wrapper.vm.$message.success).toHaveBeenCalledWith('授权完成。')
    expect(connectorApi.getMyConnections).toHaveBeenCalledTimes(2)

    jest.advanceTimersByTime(6000)
    await flushAll()
    expect(connectorApi.pollAuthorization).toHaveBeenCalledTimes(1)
  })

  it('stops polling and notifies error when poll rejects (409 session ended)', async () => {
    connectorApi.startPersonalAuthorization.mockResolvedValue({
      sessionId: 2,
      status: 'pending',
      authorizationUrl: null,
      qrContent: 'mock-qr://xhs-login'
    })
    connectorApi.pollAuthorization.mockRejectedValue({ status: 409, message: '授权会话已结束，请重新发起。' })

    await start('xhs')

    jest.advanceTimersByTime(3000)
    await flushAll()

    expect(wrapper.vm.qrDialogVisible).toBe(false)
    expect(wrapper.vm.qrPolling).toBe(false)
    expect(wrapper.vm.$message.error).toHaveBeenCalledWith('授权会话已结束，请重新发起。')

    jest.advanceTimersByTime(6000)
    await flushAll()
    expect(connectorApi.pollAuthorization).toHaveBeenCalledTimes(1)
  })

  it('stops polling when the user closes the QR dialog', async () => {
    connectorApi.startPersonalAuthorization.mockResolvedValue({
      sessionId: 2,
      status: 'pending',
      authorizationUrl: null,
      qrContent: 'mock-qr://xhs-login'
    })

    await start('xhs')

    wrapper.findAll('.el-dialog-stub').at(1).trigger('click')
    await flushAll()

    expect(wrapper.vm.qrPolling).toBe(false)
    jest.advanceTimersByTime(6000)
    await flushAll()
    expect(connectorApi.pollAuthorization).not.toHaveBeenCalled()
  })
})
