const { config, VueWrapper } = require('@vue/test-utils')

const mockMountedWrappers = new Set()

const mockNormalizeMountOptions = (options = {}) => {
  const normalized = { ...options }
  const legacyMocks = normalized.mocks
  const legacyStubs = normalized.stubs
  const legacyProps = normalized.propsData
  delete normalized.mocks
  delete normalized.stubs
  delete normalized.propsData
  if (legacyProps) normalized.props = { ...(normalized.props || {}), ...legacyProps }
  const normalizedStubs = Object.entries(legacyStubs || {}).reduce((result, [name, stub]) => {
    if (!stub || !stub.template) {
      result[name] = stub
      return result
    }
    const emitted = [...stub.template.matchAll(/\$emit\(['"]([^'"]+)/g)]
      .map((match) => match[1])
      .filter((eventName) => !(name === 'PageState' && eventName === 'retry'))
    result[name] = {
      ...stub,
      emits: [...new Set([...(stub.emits || []), ...emitted])],
      template: stub.template.replace('$listeners.retry', '$attrs.onRetry')
    }
    return result
  }, {})
  if (normalizedStubs['el-dialog'] && !normalizedStubs.AppDialog) {
    const dialogStub = normalizedStubs['el-dialog']
    normalizedStubs.AppDialog = {
      ...dialogStub,
      props: (dialogStub.props || []).map((prop) => (prop === 'visible' ? 'modelValue' : prop)),
      template: dialogStub.template.replace(/\bvisible\b/g, 'modelValue')
    }
  }
  normalized.global = {
    ...(normalized.global || {}),
    mocks: { ...((normalized.global || {}).mocks || {}), ...(legacyMocks || {}) },
    stubs: { ...((normalized.global || {}).stubs || {}), ...normalizedStubs }
  }
  return normalized
}

jest.mock('@vue/test-utils', () => {
  const actual = jest.requireActual('@vue/test-utils')
  const track = (wrapper) => {
    mockMountedWrappers.add(wrapper)
    return wrapper
  }
  return {
    ...actual,
    mount: (component, options) => track(actual.mount(component, mockNormalizeMountOptions(options))),
    shallowMount: (component, options) => track(actual.shallowMount(component, mockNormalizeMountOptions(options)))
  }
})

if (!VueWrapper.prototype.destroy) VueWrapper.prototype.destroy = VueWrapper.prototype.unmount

const originalFindAll = VueWrapper.prototype.findAll
VueWrapper.prototype.findAll = function findAllWithLegacyWrappers(...args) {
  const wrappers = originalFindAll.call(this, ...args)
  if (!Object.prototype.hasOwnProperty.call(wrappers, 'wrappers')) {
    Object.defineProperty(wrappers, 'wrappers', { get: () => Array.from(wrappers) })
  }
  return wrappers
}

config.global.stubs = {
  AppDialog: { template: '<section class="app-dialog"><slot /><slot name="footer" /></section>' },
  StatusTag: { template: '<span class="status-tag"><slot /></span>' }
}
config.global.directives = { loading: () => {} }

afterEach(() => {
  mockMountedWrappers.forEach((wrapper) => wrapper.unmount())
  mockMountedWrappers.clear()
})
