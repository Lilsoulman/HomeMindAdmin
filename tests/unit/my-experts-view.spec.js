import { shallowMount } from '@vue/test-utils'
import MyExperts from '../../src/views/app/MyExperts.vue'
import * as expertApi from '../../src/api/expert'

jest.mock('../../src/api/expert', () => ({
  listExperts: jest.fn(),
  getExpert: jest.fn(),
  createExpert: jest.fn(),
  updateExpert: jest.fn(),
  removeExpert: jest.fn()
}))

const flushPromises = () => new Promise((resolve) => setTimeout(resolve))

const mocks = {
  $store: { state: { auth: { role: 'owner' } } },
  $message: { success: jest.fn(), warning: jest.fn(), error: jest.fn() },
  $confirm: jest.fn().mockResolvedValue(true)
}

const stubs = {
  PageState: {
    props: ['title', 'description'],
    template: '<section class="page-state"><h3>{{ title }}</h3><p>{{ description }}</p><button class="retry-btn" @click="$emit(\'retry\')">重试</button></section>'
  },
  'el-button': { template: '<button @click="$emit(\'click\')"><slot /></button>' },
  'el-tag': { template: '<span><slot /></span>' },
  'el-dialog': { template: '<div><slot /><slot name="footer" /></div>' },
  'el-form': { template: '<div><slot /></div>' },
  'el-form-item': { template: '<div><label><slot /></label></div>' },
  'el-input': { props: ['value'], template: '<input :value="value" @input="$emit(\'input\', $event.target.value)" />' }
}

const mineItem = {
  id: 11, catalogType: 'expert', source: 'mine', code: 'custom-abc',
  name: '我的旅行助手', category: 'travel', description: '旅行行程规划', estimatedCredits: 2
}

const findButton = (wrapper, text) => wrapper.findAll('button').wrappers.find((w) => w.text().includes(text))

function fillRequired(wrapper) {
  wrapper.vm.dialog.name = '我的助手'
  wrapper.vm.dialog.category = 'travel'
  wrapper.vm.dialog.description = '旅行行程助手'
  wrapper.vm.dialog.persona = '你是我的旅行助手'
  wrapper.vm.dialog.promptTemplate = 'system: you are...'
}

describe('MyExperts view', () => {
  afterEach(() => jest.clearAllMocks())

  it('shows loading while fetching', async () => {
    expertApi.listExperts.mockReturnValue(new Promise(() => {}))
    const wrapper = shallowMount(MyExperts, { mocks, stubs })
    expect(wrapper.text()).toContain('正在加载我的专家')
    wrapper.destroy()
  })

  it('shows error state with retry that reloads', async () => {
    expertApi.listExperts.mockRejectedValueOnce({ status: 0, message: '网络连接异常，请稍后重试。' })
    const wrapper = shallowMount(MyExperts, { mocks, stubs })
    await flushPromises()
    expect(wrapper.text()).toContain('我的专家暂不可用')

    expertApi.listExperts.mockResolvedValueOnce([])
    await wrapper.find('.retry-btn').trigger('click')
    await flushPromises()
    expect(expertApi.listExperts).toHaveBeenCalledTimes(2)
    wrapper.destroy()
  })

  it('shows empty state when no items', async () => {
    expertApi.listExperts.mockResolvedValue([])
    const wrapper = shallowMount(MyExperts, { mocks, stubs })
    await flushPromises()
    expect(wrapper.text()).toContain('暂无专家')
    wrapper.destroy()
  })

  it('loads only my experts with scope=mine', async () => {
    expertApi.listExperts.mockResolvedValue([mineItem])
    const wrapper = shallowMount(MyExperts, { mocks, stubs })
    await flushPromises()
    expect(expertApi.listExperts).toHaveBeenCalledWith({ scope: 'mine' })
    expect(wrapper.text()).toContain('我的旅行助手')
    expect(wrapper.text()).toContain('自建')
    expect(wrapper.text()).toContain('custom-abc')
    wrapper.destroy()
  })

  it('creates expert with required fields', async () => {
    expertApi.listExperts.mockResolvedValue([])
    const wrapper = shallowMount(MyExperts, { mocks, stubs })
    await flushPromises()

    await findButton(wrapper, '新建专家').trigger('click')
    fillRequired(wrapper)
    await wrapper.vm.$nextTick()

    expertApi.createExpert.mockResolvedValue({ Id: 2, Name: '我的助手' })
    await findButton(wrapper, '保存').trigger('click')
    await flushPromises()

    expect(expertApi.createExpert).toHaveBeenCalledWith({
      name: '我的助手', category: 'travel', description: '旅行行程助手',
      persona: '你是我的旅行助手', methodology: undefined, promptTemplate: 'system: you are...',
      toolPolicyJson: '{"skills":[]}'
    })
    expect(mocks.$message.success).toHaveBeenCalledWith('专家已创建。')
    expect(expertApi.listExperts).toHaveBeenCalledTimes(2)
    wrapper.destroy()
  })

  it('edits expert without echoing prompt template and saves with rowVersion', async () => {
    expertApi.listExperts.mockResolvedValue([mineItem])
    expertApi.getExpert.mockResolvedValue({
      id: 11, name: '我的旅行助手', category: 'travel', description: '旅行行程规划',
      persona: '你是我的旅行助手', methodology: '分步骤建议', toolPolicy: '{"skills":["web"]}',
      rowVersion: 5, promptTemplate: 'SECRET PROMPT'
    })
    const wrapper = shallowMount(MyExperts, { mocks, stubs })
    await flushPromises()

    await findButton(wrapper, '编辑').trigger('click')
    await flushPromises()

    expect(expertApi.getExpert).toHaveBeenCalledWith({ id: 11, type: 'expert' })
    expect(wrapper.vm.dialog.promptTemplate).toBe('')
    expect(wrapper.vm.dialog.toolPolicyJson).toBe('{"skills":["web"]}')
    expect(wrapper.vm.dialog.rowVersion).toBe(5)

    wrapper.vm.dialog.promptTemplate = 'system: new prompt'
    await wrapper.vm.$nextTick()
    expertApi.updateExpert.mockResolvedValue({ Id: 11, RowVersion: 6 })
    await findButton(wrapper, '保存').trigger('click')
    await flushPromises()

    expect(expertApi.updateExpert).toHaveBeenCalledWith({
      id: 11,
      payload: {
        name: '我的旅行助手', category: 'travel', description: '旅行行程规划',
        persona: '你是我的旅行助手', methodology: '分步骤建议', promptTemplate: 'system: new prompt',
        toolPolicyJson: '{"skills":["web"]}', rowVersion: 5
      }
    })
    expect(mocks.$message.success).toHaveBeenCalledWith('专家已更新。')
    wrapper.destroy()
  })

  it('warns and reloads list on 409', async () => {
    expertApi.listExperts.mockResolvedValue([])
    const wrapper = shallowMount(MyExperts, { mocks, stubs })
    await flushPromises()

    await findButton(wrapper, '新建专家').trigger('click')
    fillRequired(wrapper)
    await wrapper.vm.$nextTick()

    expertApi.createExpert.mockRejectedValueOnce({ status: 409, message: '专家已被其他会话修改。' })
    await findButton(wrapper, '保存').trigger('click')
    await flushPromises()

    expect(mocks.$message.warning).toHaveBeenCalledWith(expect.stringContaining('已刷新'))
    expect(expertApi.listExperts).toHaveBeenCalledTimes(2)
    wrapper.destroy()
  })

  it('asks confirmation before deleting', async () => {
    expertApi.listExperts.mockResolvedValue([mineItem])
    const wrapper = shallowMount(MyExperts, { mocks, stubs })
    await flushPromises()

    await findButton(wrapper, '删除').trigger('click')
    await flushPromises()

    expect(mocks.$confirm).toHaveBeenCalledTimes(1)
    expect(expertApi.removeExpert).toHaveBeenCalledWith({ id: 11 })
    expect(mocks.$message.success).toHaveBeenCalledWith('专家已删除。')
    expect(expertApi.listExperts).toHaveBeenCalledTimes(2)
    wrapper.destroy()
  })

  it('hides write actions without expert.mine.write', async () => {
    const viewerMocks = { ...mocks, $store: { state: { auth: { role: 'viewer' } } } }
    expertApi.listExperts.mockResolvedValue([mineItem])
    const wrapper = shallowMount(MyExperts, { mocks: viewerMocks, stubs })
    await flushPromises()

    expect(findButton(wrapper, '新建专家')).toBeUndefined()
    expect(findButton(wrapper, '编辑')).toBeUndefined()
    expect(findButton(wrapper, '删除')).toBeUndefined()
    wrapper.destroy()
  })
})
