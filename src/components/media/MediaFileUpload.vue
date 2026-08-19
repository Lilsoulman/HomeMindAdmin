<template>
  <div class="media-upload">
    <el-upload
      :http-request="uploadFile"
      :show-file-list="false"
      :disabled="uploading"
      accept="video/*,audio/*"
      class="media-upload__picker"
    >
      <el-button size="mini" :loading="uploading" :disabled="uploading" type="primary" plain>上传素材</el-button>
    </el-upload>
    <p v-if="uploading" class="media-upload__hint">上传中… {{ progress }}%</p>
    <p v-if="error" class="media-upload__hint media-upload__hint--error">{{ error }}</p>
    <div v-if="loading" class="media-upload__hint">正在同步素材，自动发现的文件会显示在下方。</div>
    <div v-else-if="loadError" class="media-upload__hint media-upload__hint--error">
      {{ loadError }}
      <el-button size="mini" type="text" @click="loadMaterials">重试</el-button>
    </div>

    <section v-if="manualMaterials.length" class="media-upload__group" aria-label="手动添加的素材">
      <p class="media-upload__group-title">手动添加</p>
      <ul class="media-upload__cards">
        <li v-for="material in manualMaterials" :key="material.id" class="material-card">
          <div class="material-card__body">
            <strong class="material-card__name" :title="material.fileName">{{ material.fileName }}</strong>
            <p class="material-card__meta">
              <span v-if="material.durationSeconds">时长 {{ material.durationSeconds }} 秒</span>
              <span v-if="material.width && material.height">{{ material.width }}×{{ material.height }}</span>
              <span>{{ formatSize(material.fileSize) }}</span>
            </p>
          </div>
          <el-button size="mini" type="text" :disabled="removingId === material.id" @click="remove(material)">移除</el-button>
        </li>
      </ul>
    </section>
    <section v-if="scannedMaterials.length" class="media-upload__group" aria-label="自动发现的素材">
      <p class="media-upload__group-title">自动发现 <span>素材目录扫描后自动登记，仅自己可见。</span></p>
      <ul class="media-upload__cards">
        <li v-for="material in scannedMaterials" :key="material.id" class="material-card">
          <div class="material-card__body">
            <strong class="material-card__name" :title="material.fileName">{{ material.fileName }}</strong>
            <p class="material-card__meta">
              <span v-if="material.durationSeconds">时长 {{ material.durationSeconds }} 秒</span>
              <span v-if="material.width && material.height">{{ material.width }}×{{ material.height }}</span>
              <span>{{ formatSize(material.fileSize) }}</span>
            </p>
          </div>
          <el-button size="mini" type="text" :disabled="removingId === material.id" @click="remove(material)">移除</el-button>
        </li>
      </ul>
    </section>
  </div>
</template>

<script>
import { deleteClippingMaterial, listClippingMaterials, uploadClippingMaterial } from '../../api/skill'

export default {
  name: 'MediaFileUpload',
  data() {
    return {
      materials: [],
      loading: true,
      loadError: '',
      uploading: false,
      progress: 0,
      removingId: null,
      error: ''
    }
  },
  computed: {
    manualMaterials() {
      return this.materials.filter((material) => material.sourceType !== 'scan')
    },
    scannedMaterials() {
      return this.materials.filter((material) => material.sourceType === 'scan')
    }
  },
  created() {
    this.loadMaterials()
  },
  methods: {
    async loadMaterials() {
      this.loading = true
      this.loadError = ''
      try {
        const materials = await listClippingMaterials()
        this.materials = materials
        this.$emit('available', materials)
      } catch (error) {
        this.loadError = error.message || '素材列表加载失败，请重试。'
      } finally {
        this.loading = false
      }
    },
    async uploadFile({ file }) {
      this.uploading = true
      this.progress = 0
      this.error = ''
      try {
        const material = await uploadClippingMaterial({
          file,
          onProgress: (event) => {
            if (event && event.total) this.progress = Math.round((event.loaded / event.total) * 100)
          }
        })
        this.materials = [material, ...this.materials.filter((item) => item.id !== material.id)]
        this.$emit('uploaded', material)
      } catch (uploadError) {
        this.error = uploadError.message || '素材上传失败，请重试。'
        this.$message.error(this.error)
      } finally {
        this.uploading = false
      }
    },
    async remove(material) {
      this.removingId = material.id
      try {
        await deleteClippingMaterial({ id: material.id })
        this.materials = this.materials.filter((item) => item.id !== material.id)
        this.$emit('removed', material.id, material)
      } catch (error) {
        this.$message.error(error.message || '素材移除失败，请重试。')
      } finally {
        this.removingId = null
      }
    },
    formatSize(bytes) {
      if (!bytes) return ''
      if (bytes < 1024) return `${bytes} B`
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
      return `${(bytes / 1024 / 1024).toFixed(1)} MB`
    }
  }
}
</script>
