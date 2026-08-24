<template>
  <section class="media-clips-page">
    <section class="overview-intro">
      <div>
        <p class="eyebrow">个人空间</p>
        <h1>历史剪辑</h1>
        <p>查看过去快速剪辑生成的成片，可在线预览或下载后导入剪映精剪。</p>
      </div>
    </section>

    <section class="surface-panel clips-panel">
      <div v-if="loading" class="overview-page__loading"><i class="el-icon-loading" /> 正在加载历史剪辑</div>
      <PageState v-else-if="error" type="error" :title="errorTitle" :description="error.message" @retry="load" />
      <PageState v-else-if="!items.length" title="暂无历史剪辑" description="在快速剪辑页完成一次剪辑后，成片会在这里出现。" />
      <template v-else>
        <ul class="clips-list">
          <li v-for="run in items" :key="run.id" class="clips-card">
            <div class="clips-card__head">
              <strong>剪辑 #{{ run.id }}</strong>
              <el-tag size="mini" effect="plain" :type="statusTagType(run.status)">{{ statusLabel(run.status) }}</el-tag>
            </div>
            <p v-if="run.resultSummary" class="clips-card__summary">{{ run.resultSummary }}</p>
            <div class="clips-card__meta">
              <time>{{ formatTime(run.createdAt) }}</time>
              <el-button size="mini" type="text" @click="openRun(run.id)">查看运行</el-button>
            </div>
            <div v-if="run.mp4FileId" class="clips-card__actions">
              <el-button size="mini" :loading="previewingRunId === run.id" @click="togglePreview(run)">
                {{ previewingRunId === run.id ? '收起预览' : '预览' }}
              </el-button>
              <el-button size="mini" type="primary" :loading="downloadingRunId === run.id" @click="downloadMp4(run)">下载 mp4</el-button>
            </div>
            <div v-if="previewingRunId === run.id" class="clips-card__preview">
              <video v-if="previewUrl" class="clips-card__video" controls preload="metadata" :src="previewUrl" />
              <p v-else-if="previewError">视频预览加载失败，请重试。</p>
              <p v-else>正在加载预览…</p>
            </div>
          </li>
        </ul>
      </template>
    </section>
  </section>
</template>

<script>
import { listRuns } from '../../api/expert'
import { fetchFileContent, getFileReadToken } from '../../api/skill'
import { triggerDownload } from '../../utils/download'
import PageState from '../../components/common/PageState.vue'

const statusLabels = { draft: '草稿', queued: '排队中', planning: '规划中', running: '运行中', completed: '已完成', failed: '失败', cancelled: '已取消' }
const statusTagTypes = { draft: 'info', queued: 'info', planning: 'warning', running: 'warning', completed: 'success', failed: 'danger', cancelled: 'info' }

export default {
  components: { PageState },
  data() {
    return {
      loading: true,
      error: null,
      items: [],
      previewingRunId: null,
      previewUrl: '',
      previewError: false,
      downloadingRunId: null,
      pageAlive: true
    }
  },
  computed: {
    errorTitle() {
      return this.error && this.error.status === 403 ? '暂无历史剪辑权限' : '历史剪辑暂不可用'
    }
  },
  created() {
    this.load()
  },
  unmounted() {
    this.pageAlive = false
    this.revokePreview()
  },
  methods: {
    async load() {
      this.loading = true
      this.error = null
      try {
        const items = await listRuns({ sourceType: 'skill', limit: 50 })
        if (this.pageAlive) this.items = items
      } catch (error) {
        if (this.pageAlive) this.error = error
      } finally {
        if (this.pageAlive) this.loading = false
      }
    },
    async togglePreview(run) {
      if (this.previewingRunId === run.id) {
        this.revokePreview()
        return
      }
      this.revokePreview()
      this.previewingRunId = run.id
      this.previewError = false
      try {
        const { readUrl } = await getFileReadToken({ fileId: run.mp4FileId })
        const blobUrl = await fetchFileContent({ readUrl })
        if (this.pageAlive && this.previewingRunId === run.id) {
          this.revokePreview()
          this.previewUrl = blobUrl
          this.previewingRunId = run.id
        }
      } catch (error) {
        if (this.pageAlive && this.previewingRunId === run.id) this.previewError = true
      }
    },
    async downloadMp4(run) {
      if (!run.mp4FileId || this.downloadingRunId) return
      this.downloadingRunId = run.id
      try {
        const { readUrl } = await getFileReadToken({ fileId: run.mp4FileId })
        const blobUrl = await fetchFileContent({ readUrl })
        triggerDownload(blobUrl, 'quick-edit.mp4')
      } catch (error) {
        this.$message.error(error.message || '视频下载失败，请重试。')
      } finally {
        if (this.pageAlive) this.downloadingRunId = null
      }
    },
    revokePreview() {
      if (this.previewUrl) URL.revokeObjectURL(this.previewUrl)
      this.previewUrl = ''
      this.previewError = false
      this.previewingRunId = null
    },
    openRun(id) {
      this.$router.push(`/app/runs/${id}`)
    },
    statusLabel(status) { return statusLabels[status] || status },
    statusTagType(status) { return statusTagTypes[status] || 'info' },
    formatTime(value) {
      if (!value) return ''
      return new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
    }
  }
}
</script>

<style scoped>
.clips-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; }
.clips-card { border: 1px solid var(--border-color, #ebeef5); border-radius: 10px; padding: 16px; }
.clips-card__head, .clips-card__meta, .clips-card__actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.clips-card__head { justify-content: space-between; }
.clips-card__meta { color: #909399; font-size: 13px; margin-top: 8px; }
.clips-card__summary { margin: 10px 0 0; color: #606266; }
.clips-card__actions { margin-top: 12px; }
.clips-card__preview { margin-top: 12px; }
.clips-card__video { width: 100%; max-width: 480px; border-radius: 8px; background: #000; }
</style>
