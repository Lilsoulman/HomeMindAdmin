import { shallowMount } from '@vue/test-utils'
import XhsWorkspace from '../../src/views/app/XhsWorkspace.vue'
import * as xhsApi from '../../src/api/xhs'
import * as skillApi from '../../src/api/skill'

jest.mock('../../src/api/xhs', () => ({
  getXhsAuthStatus: jest.fn(),
  searchXhsNotes: jest.fn(),
  getXhsNoteDetail: jest.fn(),
  createXhsPublishAction: jest.fn(),
  confirmXhsPublishAction: jest.fn()
}))

jest.mock('../../src/utils/idempotency', () => ({ createIdempotencyKey: jest.fn(() => 'test-uuid-0001') }))

jest.mock('../../src/api/skill', () => ({
  uploadClippingMaterial: jest.fn(),
  deleteClippingMaterial: jest.fn()
}))

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0))

const stubs = {
  PageState: { template: '<div><slot /></div>' },
  'el-tag': { template: '<span><slot /></span>' },
  'el-button': { props: ['disabled', 'loading'], template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>' },
  'el-input': { props: ['value'], template: '<input :value="value" @input="$emit(\'input\', $event.target.value)" />' },
  'el-steps': { template: '<div><slot /></div>' },
  'el-step': { template: '<div />' },
  'el-radio-group': { template: '<div><slot /></div>' },
  'el-radio-button': { template: '<span><slot /></span>' },
  'el-form': { template: '<form><slot /></form>' },
  'el-form-item': { template: '<div><slot /></div>' },
  'el-upload': { props: ['action'], template: '<div :data-action="action"><slot /></div>' },
  'el-dialog': { props: ['visible'], template: '<div v-if="visible"><slot /></div>' }
}

const mocks = {
  $message: { success: jest.fn(), warning: jest.fn(), error: jest.fn() },
  $confirm: jest.fn(() => Promise.resolve()),
  $router: { push: jest.fn() },
  $store: { state: { auth: { role: 'owner' } } }
}

describe('XhsWorkspace view', () => {
  beforeEach(() => {
    xhsApi.getXhsAuthStatus.mockResolvedValue({ loggedIn: true, message: '已登录' })
    URL.createObjectURL = jest.fn(() => 'blob:preview-media')
    URL.revokeObjectURL = jest.fn()
  })
  afterEach(() => jest.clearAllMocks())

  it('guides creation and validates media counts before creating a pending action', async () => {
    const wrapper = shallowMount(XhsWorkspace, { mocks, stubs })
    await flushPromises()
    expect(wrapper.find('[data-action]').attributes('data-action')).toBe('/api/v1/clipping/materials')
    wrapper.vm.setType('video')
    skillApi.uploadClippingMaterial.mockResolvedValue({ id: 7, fileName: 'video.mp4', contentType: 'video/mp4', fileSize: 2048, storagePath: 'D:\\materials\\video.mp4' })
    await wrapper.vm.uploadMediaFile({ file: new File(['video'], 'video.mp4', { type: 'video/mp4' }) })
    wrapper.vm.draft.title = '周末露营记录'
    wrapper.vm.draft.content = '记录这次露营的准备、路线和实际体验。'
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.canCreateAction).toBe(true)
    expect(wrapper.vm.messages.map((item) => item.role)).toContain('user')
    xhsApi.createXhsPublishAction.mockResolvedValue({ actionId: 88, status: 'pending', title: '周末露营记录', description: '视频', riskLevel: 'L2' })
    await wrapper.vm.createPublishAction()

    expect(wrapper.find('video').attributes('src')).toBe('blob:preview-media')
    expect(xhsApi.createXhsPublishAction).toHaveBeenCalledWith(expect.objectContaining({ type: 'video', mediaPaths: ['D:\\materials\\video.mp4'], idempotencyKey: 'test-uuid-0001' }))
    expect(wrapper.vm.publishAction.status).toBe('pending')
    expect(xhsApi.confirmXhsPublishAction).not.toHaveBeenCalled()
    wrapper.destroy()
  })

  it('validates media types and removes uploaded media with its preview', async () => {
    const wrapper = shallowMount(XhsWorkspace, { mocks, stubs })
    await flushPromises()

    expect(wrapper.vm.validateMediaFile(new File(['image'], 'cover.jpg', { type: 'image/jpeg' }))).toBe(true)
    expect(wrapper.vm.validateMediaFile(new File(['video'], 'video.mp4', { type: 'video/mp4' }))).toBe(false)
    expect(mocks.$message.error).toHaveBeenCalledWith('请上传图片文件。')

    wrapper.setData({
      draft: { type: 'image', title: '', content: '', mediaPaths: ['D:\\materials\\cover.jpg'] },
      mediaFiles: [{ id: 12, path: 'D:\\materials\\cover.jpg', name: 'cover.jpg', previewUrl: 'blob:cover', size: 1024, type: 'image/jpeg' }]
    })
    skillApi.deleteClippingMaterial.mockResolvedValue(null)
    await wrapper.vm.removeMediaFile(wrapper.vm.mediaFiles[0])

    expect(skillApi.deleteClippingMaterial).toHaveBeenCalledWith({ id: 12 })
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:cover')
    expect(wrapper.vm.draft.mediaPaths).toEqual([])
    wrapper.destroy()
  })

  it('searches notes and presents the selected note detail', async () => {
    xhsApi.searchXhsNotes.mockResolvedValue([{ noteId: '1', title: '露营', coverUrl: '', authorName: '小明', link: 'https://xhs.example/1' }])
    xhsApi.getXhsNoteDetail.mockResolvedValue({ noteId: '1', title: '露营', content: '正文', images: [], link: 'https://xhs.example/1' })
    const wrapper = shallowMount(XhsWorkspace, { mocks, stubs })
    await flushPromises()
    wrapper.vm.searchQuery = '露营'
    await wrapper.vm.searchNotes()
    await wrapper.vm.showDetail('https://xhs.example/1')

    expect(xhsApi.searchXhsNotes).toHaveBeenCalledWith({ query: '露营', limit: 10 })
    expect(wrapper.vm.noteDetail.title).toBe('露营')
    expect(wrapper.vm.detailVisible).toBe(true)
    expect(wrapper.vm.detailLoadingUrl).toBeNull()
    wrapper.destroy()
  })

  it('does not treat notes without a link as loading', async () => {
    const wrapper = shallowMount(XhsWorkspace, { mocks, stubs })
    await flushPromises()

    await wrapper.vm.showDetail('')

    expect(xhsApi.getXhsNoteDetail).not.toHaveBeenCalled()
    expect(wrapper.vm.detailLoadingUrl).toBeNull()
    wrapper.destroy()
  })
})
