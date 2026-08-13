import { shallowMount } from '@vue/test-utils'
import MySkills from '../../src/views/app/MySkills.vue'
import * as skillApi from '../../src/api/skill'

jest.mock('../../src/api/skill', () => ({ listSkills: jest.fn(), getSkill: jest.fn() }))

const flushPromises = () => new Promise((resolve) => setTimeout(resolve))
const stubs = {
  PageState: { props: ['title', 'description'], template: '<section><h3>{{ title }}</h3><button class="retry-btn" @click="$emit(\'retry\')">重试</button></section>' },
  'el-button': { template: '<button @click="$emit(\'click\')"><slot /></button>' },
  'el-tag': { template: '<span><slot /></span>' },
  'el-dialog': { template: '<div><slot /><slot name="footer" /></div>' }
}

describe('MySkills view', () => {
  afterEach(() => jest.clearAllMocks())

  it('loads only the current user skill scope', async () => {
    skillApi.listSkills.mockResolvedValue([{ id: 5, name: '我的技能', status: 'enabled', updatedAt: null }])
    const wrapper = shallowMount(MySkills, { stubs })
    await flushPromises()
    expect(skillApi.listSkills).toHaveBeenCalledWith({ scope: 'mine' })
    expect(wrapper.text()).toContain('我的技能')
    wrapper.destroy()
  })

  it('loads prompt only in the personal skill detail', async () => {
    skillApi.listSkills.mockResolvedValue([{ id: 5, name: '我的技能', status: 'enabled' }])
    skillApi.getSkill.mockResolvedValue({ id: 5, name: '我的技能', status: 'enabled', prompt: '仅本人可见' })
    const wrapper = shallowMount(MySkills, { stubs })
    await flushPromises()
    await wrapper.find('li').trigger('click')
    await flushPromises()
    expect(skillApi.getSkill).toHaveBeenCalledWith({ id: 5 })
    expect(wrapper.text()).toContain('仅本人可见')
    wrapper.destroy()
  })
})
