import { shallowMount } from '@vue/test-utils'
import ClippingGoalConfirmationCard from '../../src/components/media/ClippingGoalConfirmationCard.vue'

const stubs = {
  'el-button': { props: ['disabled', 'loading'], template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>' }
}

describe('ClippingGoalConfirmationCard', () => {
  it('shows only the public parsing summary and emits confirmation actions', async () => {
    const wrapper = shallowMount(ClippingGoalConfirmationCard, {
      stubs,
      propsData: {
        confirmation: {
          title: '已理解',
          summary: '30 秒竖屏快节奏，添加字幕',
          parameters: ['时长：30 秒', '画幅：竖屏', '风格：快节奏', '字幕：添加']
        }
      }
    })

    expect(wrapper.text()).toContain('30 秒竖屏快节奏，添加字幕')
    expect(wrapper.text()).toContain('时长：30 秒')
    await wrapper.findAll('button').at(0).trigger('click')
    await wrapper.findAll('button').at(1).trigger('click')
    expect(wrapper.emitted('edit')).toHaveLength(1)
    expect(wrapper.emitted('confirm')).toHaveLength(1)
  })
})
