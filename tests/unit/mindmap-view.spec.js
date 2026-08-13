import { shallowMount } from '@vue/test-utils'
import Mindmap from '../../src/views/app/Mindmap.vue'
import * as skillApi from '../../src/api/skill'

jest.mock('../../src/api/skill', () => ({ createMindmapRun: jest.fn() }))
jest.mock('../../src/utils/idempotency', () => ({ createIdempotencyKey: jest.fn(() => 'test-uuid') }))

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0))
const mocks = { $message: { warning: jest.fn(), error: jest.fn() } }
const stubs = {
  'el-upload': { template: '<div><slot /></div>' },
  'el-button': { props: ['disabled', 'loading'], template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>' },
  'el-input': { props: ['value'], template: '<textarea :value="value" @input="$emit(\'input\', $event.target.value)" />' }
}

describe('Mindmap view', () => {
  const originalMarkmap = window.markmap

  beforeEach(() => {
    window.markmap = {
      Transformer: jest.fn(() => ({ transform: jest.fn(() => ({ root: { content: '主题', children: [] } })) })),
      Markmap: { create: jest.fn(() => ({ destroy: jest.fn(), fit: jest.fn() })) }
    }
    skillApi.createMindmapRun.mockResolvedValue({ id: 12, status: 'completed' })
  })

  afterEach(() => {
    window.markmap = originalMarkmap
    jest.clearAllMocks()
  })

  it('renders markdown locally then records a run with an idempotency key', async () => {
    const wrapper = shallowMount(Mindmap, { mocks, stubs })
    wrapper.vm.markdown = '# 家庭计划'

    await wrapper.vm.generate()

    expect(window.markmap.Transformer).toHaveBeenCalledWith([])
    expect(window.markmap.Markmap.create).toHaveBeenCalled()
    expect(skillApi.createMindmapRun).toHaveBeenCalledWith({ markdown: '# 家庭计划', idempotencyKey: 'test-uuid' })
    expect(wrapper.vm.run).toEqual({ id: 12, status: 'completed' })
    wrapper.destroy()
  })

  it('does not create a run when the local vendor resources are unavailable', async () => {
    window.markmap = null
    const wrapper = shallowMount(Mindmap, { mocks, stubs })
    wrapper.vm.markdown = '# 家庭计划'

    await wrapper.vm.generate()

    expect(wrapper.vm.error).toContain('资源未加载')
    expect(skillApi.createMindmapRun).not.toHaveBeenCalled()
    wrapper.destroy()
  })

  it('rejects non-Markdown local files', () => {
    const wrapper = shallowMount(Mindmap, { mocks, stubs })
    const result = wrapper.vm.readFile({ name: 'notes.txt', size: 12 })

    expect(result).toBe(false)
    expect(mocks.$message.warning).toHaveBeenCalledWith('请选择 .md 文件。')
    wrapper.destroy()
  })

  it('calls markmap fit for the fit control', async () => {
    const wrapper = shallowMount(Mindmap, { mocks, stubs })
    wrapper.vm.markdown = '# 家庭计划'
    await wrapper.vm.generate()

    wrapper.vm.fit()

    expect(wrapper.vm.map.fit).toHaveBeenCalled()
    await flushPromises()
    wrapper.destroy()
  })
})
