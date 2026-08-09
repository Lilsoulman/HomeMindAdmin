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

    <ul v-if="materials.length" class="media-upload__cards">
      <li v-for="material in materials" :key="material.id" class="material-card">
        <div class="material-card__body">
          <strong class="material-card__name" :title="material.fileName">{{ material.fileName }}</strong>
          <p class="material-card__meta">
            <span v-if="material.durationSeconds">时长 {{ material.durationSeconds }} 秒</span>
            <span v-if="material.width && material.height">{{ material.width }}×{{ material.height }}</span>
            <span>{{ formatSize(material.fileSize) }}</span>
          </p>
        </div>
        <el-button size="mini" type="text" :disabled="removingId === material.id" @click="remove(material.id)">移除</el-button>
      </li>
    </ul>
  </div>
</template>

<script>
import { deleteClippingMaterial, uploadClippingMaterial } from '../../api/skill'

export default {
  name: 'MediaFileUpload',
  data() {
    return {
      materials: [],
      uploading: false,
      progress: 0,
      removingId: null,
      error: ''
    }
  },
  methods: {
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
        this.materials.push(material)
        this.$emit('uploaded', material)
      } catch (uploadError) {
        this.error = uploadError.message || '素材上传失败，请重试。'
        this.$message.error(this.error)
      } finally {
        this.uploading = false
      }
    },
    async remove(id) {
      this.removingId = id
      try {
        await deleteClippingMaterial({ id })
        this.materials = this.materials.filter((material) => material.id !== id)
        this.$emit('removed', id)
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
