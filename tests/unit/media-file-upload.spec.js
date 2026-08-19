import { shallowMount } from '@vue/test-utils'
import MediaFileUpload from '../../src/components/media/MediaFileUpload.vue'
import * as skillApi from '../../src/api/skill'

jest.mock('../../src/api/skill', () => ({
  listClippingMaterials: jest.fn(),
  uploadClippingMaterial: jest.fn(),
  deleteClippingMaterial: jest.fn()
}))

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0))

const mocks = { $message: { success: jest.fn(), warning: jest.fn(), error: jest.fn() } }

const stubs = {
  'el-upload': { template: '<div @click="$emit(\'change\')"><slot /></div>' },
  'el-button': { props: ['disabled', 'loading', 'type', 'plain', 'size'], template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>' }
}

const materialView = {
  id: 7,
  fileName: '探店.mp4',
  contentType: 'video/mp4',
  fileSize: 2048,
  durationSeconds: 30,
  width: 1920,
  height: 1080,
  storagePath: 'D:\\data\\materials\\探店.mp4',
  createdAt: '2026-08-09T03:00:00Z'
}

const scannedMaterial = Object.assign({}, materialView, { id: 8, fileName: 'auto.mp4', sourceType: 'scan' })

describe('MediaFileUpload', () => {
  beforeEach(() => {
    skillApi.listClippingMaterials.mockResolvedValue([])
  })

  afterEach(() => jest.clearAllMocks())

  it('uploads a file and emits uploaded with the material view', async () => {
    skillApi.uploadClippingMaterial.mockResolvedValue(materialView)
    const wrapper = shallowMount(MediaFileUpload, { mocks, stubs })

    await wrapper.vm.uploadFile({ file: new File(['bytes'], '探店.mp4') })
    await flushPromises()

    expect(skillApi.uploadClippingMaterial).toHaveBeenCalled()
    expect(wrapper.emitted('uploaded')[0][0]).toEqual(materialView)
    expect(wrapper.text()).toContain('探店.mp4')
    expect(wrapper.text()).toContain('时长 30 秒')
    expect(wrapper.text()).toContain('1920×1080')
    wrapper.destroy()
  })

  it('shows error message and no card when upload fails', async () => {
    skillApi.uploadClippingMaterial.mockRejectedValue({ status: 500, message: '素材上传失败，请重试。' })
    const wrapper = shallowMount(MediaFileUpload, { mocks, stubs })

    await wrapper.vm.uploadFile({ file: new File(['bytes'], 'a.mp4') })
    await flushPromises()

    expect(wrapper.emitted('uploaded')).toBeUndefined()
    expect(mocks.$message.error).toHaveBeenCalledWith('素材上传失败，请重试。')
    wrapper.destroy()
  })

  it('removes a material and emits removed', async () => {
    skillApi.deleteClippingMaterial.mockResolvedValue(null)
    const wrapper = shallowMount(MediaFileUpload, { mocks, stubs })
    wrapper.setData({ materials: [materialView] })
    await wrapper.vm.$nextTick()

    await wrapper.vm.remove(materialView)
    await flushPromises()

    expect(skillApi.deleteClippingMaterial).toHaveBeenCalledWith({ id: 7 })
    expect(wrapper.vm.materials).toEqual([])
    expect(wrapper.emitted('removed')[0][0]).toBe(7)
    wrapper.destroy()
  })

  it('groups auto-discovered materials and makes them available to the editor', async () => {
    skillApi.listClippingMaterials.mockResolvedValue([materialView, scannedMaterial])
    const wrapper = shallowMount(MediaFileUpload, { mocks, stubs })

    await flushPromises()

    expect(skillApi.listClippingMaterials).toHaveBeenCalledTimes(1)
    expect(wrapper.vm.manualMaterials).toEqual([materialView])
    expect(wrapper.vm.scannedMaterials).toEqual([scannedMaterial])
    expect(wrapper.emitted('available')[0][0]).toEqual([materialView, scannedMaterial])
    wrapper.destroy()
  })

  it('shows a retryable error when materials cannot be listed', async () => {
    skillApi.listClippingMaterials.mockRejectedValueOnce({ message: 'temporary failure' })
    const wrapper = shallowMount(MediaFileUpload, { mocks, stubs })

    await flushPromises()

    expect(wrapper.text()).toContain('temporary failure')
    skillApi.listClippingMaterials.mockResolvedValue([])
    await wrapper.vm.loadMaterials()
    expect(skillApi.listClippingMaterials).toHaveBeenCalledTimes(2)
    wrapper.destroy()
  })
})
