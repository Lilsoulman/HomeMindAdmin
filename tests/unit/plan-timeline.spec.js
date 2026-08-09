import { shallowMount } from '@vue/test-utils'
import PlanTimeline from '../../src/components/media/PlanTimeline.vue'

describe('PlanTimeline', () => {
  it('renders segments with index, source and duration, plus total', () => {
    const plan = {
      segments: [
        { index: 1, source: '探店.mp4', duration: 30 }
      ],
      audio: null,
      totalDuration: 30
    }
    const wrapper = shallowMount(PlanTimeline, { propsData: { plan } })

    expect(wrapper.text()).toContain('探店.mp4')
    expect(wrapper.text()).toContain('片段时长 30 秒')
    expect(wrapper.text()).toContain('总时长约 30 秒')
    wrapper.destroy()
  })

  it('renders empty state when plan has no segments', () => {
    const wrapper = shallowMount(PlanTimeline, { propsData: { plan: { segments: [], audio: null, totalDuration: null } } })

    expect(wrapper.text()).toContain('暂无方案数据')
    wrapper.destroy()
  })
})
