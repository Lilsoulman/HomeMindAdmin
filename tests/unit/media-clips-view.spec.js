import { shallowMount } from '@vue/test-utils'
import MediaClips from '../../src/views/app/MediaClips.vue'
import * as expertApi from '../../src/api/expert'
import * as skillApi from '../../src/api/skill'

jest.mock('../../src/api/expert', () => ({
  listRuns: jest.fn()
}))

jest.mock('../../src/api/skill', () => ({
  getFileReadToken: jest.fn(),
  fetchFileContent: jest.fn()
}))

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0))

const mocks = {
  $message: { success: jest.fn(), warning: jest.fn(), error: jest.fn() },
  $router: { push: jest.fn() }
}

const stubs = {
  'el-tag': { template: '<span><slot /></span>' },
  'el-button': { props: ['disabled', 'loading', 'type', 'plain', 'size'], template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>' },
  PageState: { props: ['title', 'description', 'type'], template: '<div class="page-state-stub">{{ title }} {{ description }}</div>' }
}

const findButton = (wrapper, text) => wrapper.findAll('button').wrappers.find((w) => w.text().includes(text))

const clips = [
  { id: 55, sourceType: 'skill', status: 'completed', resultSummary: '粗剪视频已生成，可预览或下载。', mp4FileId: 902, createdAt: '2026-08-14T03:00:00Z', finishedAt: '2026-08-14T03:01:00Z' },
  { id: 54, sourceType: 'skill', status: 'failed', resultSummary: '草稿生成失败：剪辑服务不可用。', createdAt: '2026-08-13T03:00:00Z' }
]

describe('MediaClips view', () => {
  beforeEach(() => {
    URL.createObjectURL = jest.fn(() => 'blob:mock-mp4')
    URL.revokeObjectURL = jest.fn()
    jest.spyOn(window, 'open').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.clearAllMocks()
    window.open.mockRestore()
  })

  it('lists skill runs and only shows actions for runs with an mp4 file', async () => {
    expertApi.listRuns.mockResolvedValue(clips)
    const wrapper = shallowMount(MediaClips, { mocks, stubs })

    await flushPromises()

    expect(expertApi.listRuns).toHaveBeenCalledWith({ sourceType: 'skill', limit: 50 })
    expect(wrapper.vm.items).toHaveLength(2)
    expect(wrapper.text()).toContain('剪辑 #55')
    expect(wrapper.text()).toContain('剪辑 #54')
    expect(wrapper.text()).toContain('粗剪视频已生成，可预览或下载。')
    expect(wrapper.text()).toContain('已完成')
    expect(wrapper.text()).toContain('失败')
    expect(findButton(wrapper, '下载 mp4')).toBeTruthy()
    expect(wrapper.findAll('button').wrappers.filter((w) => w.text().includes('下载 mp4'))).toHaveLength(1)
    wrapper.destroy()
  })

  it('shows an empty state when there are no history clips', async () => {
    expertApi.listRuns.mockResolvedValue([])
    const wrapper = shallowMount(MediaClips, { mocks, stubs })

    await flushPromises()

    expect(wrapper.text()).toContain('暂无历史剪辑')
    wrapper.destroy()
  })

  it('shows an error state and retries', async () => {
    expertApi.listRuns.mockRejectedValue({ status: 500, message: '服务暂时不可用。' })
    const wrapper = shallowMount(MediaClips, { mocks, stubs })

    await flushPromises()

    expect(wrapper.text()).toContain('历史剪辑暂不可用')
    expertApi.listRuns.mockResolvedValue(clips)
    await wrapper.vm.load()
    expect(wrapper.vm.items).toHaveLength(2)
    wrapper.destroy()
  })

  it('shows a permission error title for 403', async () => {
    expertApi.listRuns.mockRejectedValue({ status: 403, message: '无权访问。' })
    const wrapper = shallowMount(MediaClips, { mocks, stubs })

    await flushPromises()

    expect(wrapper.text()).toContain('暂无历史剪辑权限')
    wrapper.destroy()
  })

  it('previews the mp4 via blob url and revokes it when collapsed', async () => {
    expertApi.listRuns.mockResolvedValue(clips)
    skillApi.getFileReadToken.mockResolvedValue({ readUrl: 'api/v1/expert-files/902/content?readToken=tok-1' })
    skillApi.fetchFileContent.mockResolvedValue('blob:mock-mp4')
    const wrapper = shallowMount(MediaClips, { mocks, stubs })

    await flushPromises()
    await findButton(wrapper, '预览').trigger('click')
    await flushPromises()

    expect(skillApi.getFileReadToken).toHaveBeenCalledWith({ fileId: 902 })
    expect(skillApi.fetchFileContent).toHaveBeenCalledWith({ readUrl: 'api/v1/expert-files/902/content?readToken=tok-1' })
    expect(wrapper.find('video').attributes('src')).toBe('blob:mock-mp4')

    await findButton(wrapper, '收起预览').trigger('click')
    expect(wrapper.find('video').exists()).toBe(false)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-mp4')
    wrapper.destroy()
  })

  it('downloads the mp4 as a blob without opening a window', async () => {
    expertApi.listRuns.mockResolvedValue(clips)
    skillApi.getFileReadToken.mockResolvedValue({ readUrl: 'api/v1/expert-files/902/content?readToken=tok-1' })
    skillApi.fetchFileContent.mockResolvedValue('blob:mock-mp4')
    const wrapper = shallowMount(MediaClips, { mocks, stubs })

    await flushPromises()
    await findButton(wrapper, '下载 mp4').trigger('click')
    await flushPromises()

    expect(skillApi.fetchFileContent).toHaveBeenCalledWith({ readUrl: 'api/v1/expert-files/902/content?readToken=tok-1' })
    expect(window.open).not.toHaveBeenCalled()
    wrapper.destroy()
  })

  it('navigates to the run detail page', async () => {
    expertApi.listRuns.mockResolvedValue(clips)
    const wrapper = shallowMount(MediaClips, { mocks, stubs })

    await flushPromises()
    await findButton(wrapper, '查看运行').trigger('click')

    expect(mocks.$router.push).toHaveBeenCalledWith('/app/runs/55')
    wrapper.destroy()
  })
})
