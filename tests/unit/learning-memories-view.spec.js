import { shallowMount } from '@vue/test-utils'
import LearningMemories from '../../src/views/app/LearningMemories.vue'
import * as memoryApi from '../../src/api/memory'

jest.mock('../../src/api/memory', () => ({ listLearningMemories: jest.fn() }))

const flushPromises = () => new Promise((resolve) => setTimeout(resolve))

const mocks = { $message: { error: jest.fn() }, $router: { push: jest.fn() } }
const stubs = {
  PageState: { props: ['title', 'description'], template: '<section><h3>{{ title }}</h3><p>{{ description }}</p><button v-if="$listeners.retry" class="retry-btn" @click="$emit(\'retry\')">重试</button></section>' },
  'el-select': { props: ['value'], template: '<select :value="value" @change="$emit(\'input\', $event.target.value)"><slot /></select>' },
  'el-option': { props: ['label'], template: '<option>{{ label }}</option>' },
  'el-input': { props: ['value'], template: '<input :value="value" @input="$emit(\'input\', $event.target.value)" />' },
  'el-button': { template: '<button @click="$emit(\'click\')"><slot /></button>' },
  'el-tag': { template: '<span><slot /></span>' }
}

const memoryItem = {
  id: 7, summary: '妈妈偏好清晨煮粥', kind: 'preference', visibility: 'family', stability: 0.92,
  status: 'active', learnedAt: '2026-08-14T02:00:00Z', expiresAt: null,
  sourceReferences: [{ type: 'run', id: 101 }], restrictedReferenceCount: 1,
  resolutionSummary: '已按候选决议写入家庭知识'
}

describe('LearningMemories view', () => {
  beforeEach(() => {
    memoryApi.listLearningMemories.mockResolvedValue({ items: [], cursor: null })
  })

  afterEach(() => jest.clearAllMocks())

  it('loads accepted memories with default scope on mount and renders cards safely', async () => {
    memoryApi.listLearningMemories.mockResolvedValue({ items: [memoryItem], cursor: null })
    const wrapper = shallowMount(LearningMemories, { mocks, stubs })
    await flushPromises()

    expect(memoryApi.listLearningMemories).toHaveBeenCalledWith({ scope: 'all', kind: '', status: '', query: '', cursor: null })
    expect(wrapper.text()).toContain('妈妈偏好清晨煮粥')
    expect(wrapper.text()).toContain('偏好')
    expect(wrapper.text()).toContain('家庭可见')
    expect(wrapper.text()).toContain('稳定性 92%')
    expect(wrapper.text()).toContain('含 1 项受限引用')
    expect(wrapper.find('video').exists()).toBe(false)
    wrapper.destroy()
  })

  it('shows a permission error state for 403 with a retry path', async () => {
    memoryApi.listLearningMemories.mockRejectedValue({ status: 403, message: '无权访问' })
    const wrapper = shallowMount(LearningMemories, { mocks, stubs })
    await flushPromises()

    expect(wrapper.text()).toContain('暂无学习记忆权限')

    memoryApi.listLearningMemories.mockResolvedValue({ items: [memoryItem], cursor: null })
    await wrapper.find('.retry-btn').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('妈妈偏好清晨煮粥')
    wrapper.destroy()
  })

  it('shows a generic error state with retry for other failures', async () => {
    memoryApi.listLearningMemories.mockRejectedValue({ message: '服务暂不可用' })
    const wrapper = shallowMount(LearningMemories, { mocks, stubs })
    await flushPromises()

    expect(wrapper.text()).toContain('学习记忆暂不可用')
    expect(wrapper.text()).toContain('服务暂不可用')
    wrapper.destroy()
  })

  it('renders an empty state without a retry button when nothing is learned yet', async () => {
    const wrapper = shallowMount(LearningMemories, { mocks, stubs })
    await flushPromises()

    expect(wrapper.text()).toContain('暂无已学习记忆')
    expect(wrapper.find('.retry-btn').exists()).toBe(false)
    wrapper.destroy()
  })

  it('reloads with the selected scope when filters change', async () => {
    const wrapper = shallowMount(LearningMemories, { mocks, stubs })
    await flushPromises()

    wrapper.setData({ filters: { scope: 'personal', kind: 'fact', status: 'active', query: '剪映' } })
    await wrapper.vm.$nextTick()
    wrapper.vm.load()
    await flushPromises()

    expect(memoryApi.listLearningMemories).toHaveBeenLastCalledWith({ scope: 'personal', kind: 'fact', status: 'active', query: '剪映', cursor: null })
    wrapper.destroy()
  })

  it('appends pages with cursor pagination until the list is exhausted', async () => {
    const pageA = { items: [memoryItem], cursor: 'cursor-2' }
    const pageB = { items: [{ ...memoryItem, id: 8, summary: '爸爸常去老字号面馆' }], cursor: null }
    memoryApi.listLearningMemories.mockResolvedValueOnce(pageA).mockResolvedValueOnce(pageB)
    const wrapper = shallowMount(LearningMemories, { mocks, stubs })
    await flushPromises()
    expect(wrapper.text()).toContain('妈妈偏好清晨煮粥')

    await wrapper.vm.loadMore()
    await flushPromises()

    expect(memoryApi.listLearningMemories).toHaveBeenLastCalledWith({ scope: 'all', kind: '', status: '', query: '', cursor: 'cursor-2' })
    expect(wrapper.vm.items).toHaveLength(2)
    expect(wrapper.text()).toContain('爸爸常去老字号面馆')
    expect(wrapper.vm.cursor).toBeNull()
    wrapper.destroy()
  })

  it('opens a visible source run without revealing restricted references', async () => {
    memoryApi.listLearningMemories.mockResolvedValue({ items: [memoryItem], cursor: null })
    const wrapper = shallowMount(LearningMemories, { mocks, stubs })
    await flushPromises()

    wrapper.vm.openSource({ type: 'run', id: 101 })

    expect(mocks.$router.push).toHaveBeenCalledWith('/app/runs/101')
    expect(wrapper.text()).toContain('查看来源运行')
    expect(wrapper.text()).not.toContain('sourceReferences')
    wrapper.destroy()
  })
})
