<template>
  <section class="xhs-workspace">
    <section class="overview-intro">
      <div>
        <p class="eyebrow">个人连接</p>
        <h1>小红书工作台</h1>
        <p>先查找灵感，再一起打磨图文或视频稿件；创建发布动作后，仍需你最后确认才会实际发布。</p>
      </div>
      <el-tag :type="authStatus && authStatus.loggedIn ? 'success' : 'info'" effect="plain">
        {{ authStatus && authStatus.loggedIn ? '已连接' : '未连接' }}
      </el-tag>
    </section>

    <div v-if="loading" class="overview-page__loading"><i class="el-icon-loading" /> 正在检查小红书连接</div>
    <section v-else-if="connectionError" class="xhs-connection-state">
      <PageState type="error" :title="connectionErrorTitle" :description="connectionError.message" @retry="loadAuthStatus" />
      <el-button v-if="connectionError.status === 404" type="primary" size="small" @click="$router.push('/app/connections')">前往我的连接</el-button>
    </section>

    <template v-else>
      <section class="surface-panel xhs-panel">
        <header class="panel-heading">
          <div><p class="eyebrow">灵感参考</p><h2>搜索并查看笔记</h2></div>
        </header>
        <div class="xhs-search">
          <el-input v-model="searchQuery" size="small" placeholder="输入关键词，例如：周末露营穿搭" @keyup.enter.native="searchNotes" />
          <el-button type="primary" size="small" :loading="searching" :disabled="!searchQuery.trim()" @click="searchNotes">搜索</el-button>
        </div>
        <p v-if="searchError" class="xhs-error">{{ searchError }}</p>
        <ul v-if="searchResults.length" class="xhs-note-list">
          <li v-for="note in searchResults" :key="note.noteId || note.link">
            <img v-if="note.coverUrl" :src="note.coverUrl" alt="" class="xhs-note-list__cover">
            <div class="xhs-note-list__body"><strong>{{ note.title || '无标题笔记' }}</strong><p>{{ note.authorName || '小红书用户' }}</p></div>
            <el-button size="mini" type="text" :loading="detailLoadingUrl !== null && detailLoadingUrl === note.link" :disabled="!note.link" @click="showDetail(note.link)">查看</el-button>
          </li>
        </ul>
        <p v-else-if="searched && !searching" class="xhs-muted">没有找到匹配笔记，换一个更具体的关键词试试。</p>
      </section>

      <section class="surface-panel xhs-panel">
        <header class="panel-heading">
          <div><p class="eyebrow">创作沟通</p><h2>从想法到可发布稿件</h2></div>
          <el-button size="mini" :disabled="mediaUploading" @click="resetDraft">重新开始</el-button>
        </header>
        <el-steps :active="creationStep - 1" align-center size="small" class="xhs-steps">
          <el-step title="沟通目标" />
          <el-step title="打磨稿件" />
          <el-step title="确认发布" />
        </el-steps>
        <div class="xhs-creator">
          <div>
            <ul class="chat-messages">
              <li v-for="(message, index) in messages" :key="index" :class="['chat-message', message.role === 'user' ? 'chat-message--user' : 'chat-message--ai']">
                <div class="chat-message__bubble">{{ message.text }}</div>
              </li>
            </ul>
            <div class="chat-suggestions">
              <el-button size="mini" plain @click="setType('image')">我要发图文</el-button>
              <el-button size="mini" plain @click="setType('video')">我要发视频</el-button>
              <el-button size="mini" plain @click="focusDraft">帮我检查稿件</el-button>
            </div>
            <div class="chat-input">
              <el-input v-model="chatDraft" size="small" placeholder="说说主题、受众、想传达的感受或想修改的方向" @keyup.enter.native="sendMessage" />
              <el-button type="primary" size="small" :disabled="!chatDraft.trim()" @click="sendMessage">发送</el-button>
            </div>
          </div>

          <div ref="draftPanel" class="xhs-draft">
            <el-form label-position="top" size="small">
              <el-form-item label="发布形式">
                <el-radio-group v-model="draft.type" :disabled="Boolean(publishAction) || mediaUploading">
                  <el-radio-button label="image">图文</el-radio-button>
                  <el-radio-button label="video">视频</el-radio-button>
                </el-radio-group>
              </el-form-item>
              <el-form-item label="标题">
                <el-input v-model="draft.title" maxlength="20" show-word-limit :disabled="Boolean(publishAction)" placeholder="用清楚、有记忆点的标题说重点" />
              </el-form-item>
              <el-form-item label="正文">
                <el-input v-model="draft.content" type="textarea" :rows="6" maxlength="1000" show-word-limit :disabled="Boolean(publishAction)" placeholder="先给结论，再补充真实体验、细节和有用信息。" />
              </el-form-item>
              <el-form-item label="媒体文件">
                <el-upload
                  ref="mediaUpload"
                  class="xhs-media-upload"
                  action="/api/v1/clipping/materials"
                  :accept="mediaAccept"
                  :before-upload="validateMediaFile"
                  :disabled="Boolean(publishAction) || mediaUploading"
                  :http-request="uploadMediaFile"
                  :multiple="draft.type === 'image'"
                  :show-file-list="false"
                >
                  <el-button size="mini" type="primary" plain :loading="mediaUploading" :disabled="Boolean(publishAction) || mediaUploading">上传{{ draft.type === 'video' ? '视频' : '图片' }}</el-button>
                </el-upload>
                <div class="xhs-media-actions"><span>{{ mediaRequirement }}</span><span v-if="mediaUploading">上传中… {{ mediaUploadProgress }}%</span></div>
                <p v-if="mediaUploadError" class="xhs-error">{{ mediaUploadError }}</p>
                <ul v-if="mediaFiles.length" class="xhs-media-preview">
                  <li v-for="media in mediaFiles" :key="media.path" class="xhs-media-preview__item">
                    <img v-if="isImageMedia(media)" :src="media.previewUrl" :alt="media.name" class="xhs-media-preview__visual">
                    <video v-else :src="media.previewUrl" class="xhs-media-preview__visual" controls preload="metadata">你的浏览器不支持视频预览。</video>
                    <div class="xhs-media-preview__info"><strong :title="media.name">{{ media.name }}</strong><span>{{ formatFileSize(media.size) }}</span></div>
                    <el-button v-if="!publishAction" type="text" size="mini" class="xhs-media-preview__remove" title="移除文件" @click="removeMediaFile(media)"><i class="el-icon-delete" /><span class="sr-only">移除 {{ media.name }}</span></el-button>
                  </li>
                </ul>
              </el-form-item>
              <el-form-item label="话题标签">
                <el-input v-model="tagsInput" :disabled="Boolean(publishAction)" placeholder="用空格、逗号或换行分隔，例如 #露营 #周末" />
              </el-form-item>
            </el-form>
            <div class="xhs-advice"><strong>当前建议</strong><ul><li v-for="item in advice" :key="item">{{ item }}</li></ul></div>
            <el-button v-if="!publishAction" type="primary" size="small" :loading="creatingAction" :disabled="!canCreateAction" @click="createPublishAction">创建待确认发布</el-button>
            <section v-else class="xhs-confirm-card">
              <div><el-tag type="warning" effect="plain">L2 待确认</el-tag><strong>{{ publishAction.title }}</strong><p>{{ publishAction.description }}</p></div>
              <el-button v-if="publishAction.status === 'pending'" type="danger" size="small" :loading="confirming" @click="confirmPublish">确认并发布</el-button>
              <el-tag v-else type="success" effect="plain">已发布</el-tag>
            </section>
          </div>
        </div>
      </section>
    </template>

    <AppDialog v-model="detailVisible" title="笔记详情" width="620px">
      <div v-if="noteDetail" class="xhs-note-detail"><h2>{{ noteDetail.title }}</h2><p class="xhs-note-detail__content">{{ noteDetail.content }}</p><div v-if="noteDetail.images.length" class="xhs-note-detail__images"><img v-for="image in noteDetail.images" :key="image" :src="image" alt="笔记图片"></div></div>
    </AppDialog>
  </section>
</template>

<script>
import { confirmXhsPublishAction, createXhsPublishAction, getXhsAuthStatus, getXhsNoteDetail, searchXhsNotes } from '../../api/xhs'
import { deleteClippingMaterial, uploadClippingMaterial } from '../../api/skill'
import { createIdempotencyKey } from '../../utils/idempotency'
import { hasPermission } from '../../utils/permission'
import PageState from '../../components/common/PageState.vue'

const initialMessage = '你好，我会和你一起把想法打磨成小红书稿件。先告诉我：想分享什么、给谁看，以及更适合图文还是视频？'

export default {
  components: { PageState },
  data() {
    return {
      loading: true,
      connectionError: null,
      authStatus: null,
      searchQuery: '',
      searching: false,
      searched: false,
      searchError: '',
      searchResults: [],
      detailVisible: false,
      detailLoadingUrl: null,
      noteDetail: null,
      chatDraft: '',
      messages: [{ role: 'ai', text: initialMessage }],
      draft: { type: 'image', title: '', content: '', mediaPaths: [] },
      mediaFiles: [],
      mediaUploadPendingCount: 0,
      mediaUploadProgress: 0,
      mediaUploadError: '',
      tagsInput: '',
      creatingAction: false,
      publishAction: null,
      confirming: false,
      pageAlive: true
    }
  },
  computed: {
    connectionErrorTitle() {
      return this.connectionError && this.connectionError.status === 404 ? '尚未连接小红书' : '小红书暂不可用'
    },
    canPublish() {
      const role = this.$store.state.auth.role
      return hasPermission(role, 'ai.run') && hasPermission(role, 'connector.write')
    },
    creationStep() {
      if (this.publishAction) return 3
      return this.draft.title || this.draft.content || this.draft.mediaPaths.length ? 2 : 1
    },
    mediaRequirement() {
      return this.draft.type === 'video' ? '视频笔记需要恰好 1 个文件。' : `图文笔记最多 18 张图片，当前 ${this.draft.mediaPaths.length} 张。`
    },
    mediaAccept() {
      return this.draft.type === 'video' ? 'video/*' : 'image/*'
    },
    mediaUploading() {
      return this.mediaUploadPendingCount > 0
    },
    canCreateAction() {
      const validMediaCount = this.draft.type === 'video' ? this.draft.mediaPaths.length === 1 : this.draft.mediaPaths.length > 0 && this.draft.mediaPaths.length <= 18
      return this.canPublish && this.draft.title.trim() && this.draft.content.trim() && validMediaCount
    },
    advice() {
      const items = []
      if (!this.draft.title.trim()) items.push('先写一个不超过 20 字、能说清收益或场景的标题。')
      else if (this.draft.title.trim().length < 8) items.push('标题可以再具体一些：补充场景、结果或最有价值的亮点。')
      else items.push('标题长度合适，发布前再确认它与首图或视频开头一致。')
      if (!this.draft.content.trim()) items.push('正文建议按“结论 → 过程/细节 → 可执行建议”组织。')
      else if (this.draft.content.trim().length < 80) items.push('正文还比较短，补充一次真实体验、适用人群或避坑点会更有帮助。')
      else items.push('正文已有足够信息；请检查事实、价格和地点等是否准确。')
      if (!this.draft.mediaPaths.length) items.push(this.draft.type === 'video' ? '准备一个能在前 3 秒说明主题的视频文件。' : '建议选 3–9 张连贯、明亮且能说明细节的图片。')
      else items.push(this.draft.type === 'video' ? '确认视频首帧能清晰表达主题，且只保留一个视频文件。' : '检查图片顺序：首图抓重点，中间展示细节，最后图补充总结或行动建议。')
      return items
    }
  },
  created() {
    this.loadAuthStatus()
  },
  unmounted() {
    this.pageAlive = false
    this.releaseMediaPreviews()
  },
  methods: {
    async loadAuthStatus() {
      this.loading = true
      this.connectionError = null
      try {
        this.authStatus = await getXhsAuthStatus()
        if (!this.authStatus.loggedIn) this.connectionError = { status: 404, message: this.authStatus.message || '请先在“我的连接”中完成小红书扫码登录。' }
      } catch (error) {
        if (this.pageAlive) this.connectionError = error
      } finally {
        if (this.pageAlive) this.loading = false
      }
    },
    async searchNotes() {
      const query = this.searchQuery.trim()
      if (!query || this.searching) return
      this.searching = true
      this.searchError = ''
      this.searched = true
      try {
        this.searchResults = await searchXhsNotes({ query, limit: 10 })
      } catch (error) {
        this.searchError = error.message || '搜索笔记失败，请稍后重试。'
        this.searchResults = []
      } finally {
        this.searching = false
      }
    },
    async showDetail(url) {
      if (!url || this.detailLoadingUrl !== null) return
      this.detailLoadingUrl = url
      try {
        this.noteDetail = await getXhsNoteDetail({ url })
        this.detailVisible = true
      } catch (error) {
        this.$message.error(error.message || '加载笔记详情失败，请稍后重试。')
      } finally {
        this.detailLoadingUrl = null
      }
    },
    setType(type) {
      if (this.publishAction) return
      if (type !== this.draft.type && this.draft.mediaPaths.length) {
        this.clearMediaFiles()
        this.$message.warning('已按新的发布形式清空原有媒体，请重新上传。')
      }
      this.draft.type = type
      this.messages.push({ role: 'user', text: type === 'image' ? '我想发图文。' : '我想发视频。' })
      this.messages.push({ role: 'ai', text: type === 'image' ? '图文适合把体验和细节说清楚。建议先准备 3–9 张同一主题的图片，再用首图突出最重要的信息。' : '视频适合展示过程、变化或氛围。请准备一个视频文件，并让前 3 秒先说清主题。' })
    },
    sendMessage() {
      const text = this.chatDraft.trim()
      if (!text) return
      this.chatDraft = ''
      this.messages.push({ role: 'user', text })
      this.messages.push({ role: 'ai', text: this.composeReply() })
      this.focusDraft()
    },
    composeReply() {
      const missing = []
      if (!this.draft.title.trim()) missing.push('标题')
      if (!this.draft.content.trim()) missing.push('正文')
      if (!this.draft.mediaPaths.length) missing.push('媒体文件')
      if (missing.length) return `这个方向很清楚。接下来请在右侧补齐${missing.join('、')}；${this.advice[0]}`
      return `已记下你的调整方向。右侧稿件可以继续直接修改；当前最值得检查的是：${this.advice[0]}`
    },
    focusDraft() {
      this.$nextTick(() => {
        if (this.$refs.draftPanel && this.$refs.draftPanel.scrollIntoView) this.$refs.draftPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      })
    },
    validateMediaFile(file) {
      if (this.publishAction) return false
      const expectedType = this.draft.type === 'video' ? 'video/' : 'image/'
      if (!file.type || !file.type.startsWith(expectedType)) {
        this.$message.error(this.draft.type === 'video' ? '请上传视频文件。' : '请上传图片文件。')
        return false
      }
      const mediaCount = this.draft.mediaPaths.length + this.mediaUploadPendingCount
      if (this.draft.type === 'video' && mediaCount) {
        this.$message.warning('视频笔记只能保留一个视频文件。')
        return false
      }
      if (this.draft.type === 'image' && mediaCount >= 18) {
        this.$message.warning('图文笔记最多可上传 18 张图片。')
        return false
      }
      this.mediaUploadPendingCount += 1
      return true
    },
    async uploadMediaFile({ file }) {
      this.mediaUploadProgress = 0
      this.mediaUploadError = ''
      try {
        const material = await uploadClippingMaterial({
          file,
          onProgress: (event) => {
            if (event && event.total) this.mediaUploadProgress = Math.round((event.loaded / event.total) * 100)
          }
        })
        const path = material.storagePath
        if (!path) throw new Error('上传完成，但未获取到媒体存储路径。')
        const media = {
          id: material.id,
          name: material.fileName || file.name,
          path,
          previewUrl: URL.createObjectURL(file),
          size: material.fileSize || file.size,
          type: material.contentType || file.type
        }
        this.mediaFiles.push(media)
        this.draft.mediaPaths.push(path)
      } catch (error) {
        this.mediaUploadError = error.message || '媒体上传失败，请稍后重试。'
        this.$message.error(this.mediaUploadError)
      } finally {
        this.mediaUploadPendingCount = Math.max(0, this.mediaUploadPendingCount - 1)
      }
    },
    async removeMediaFile(media) {
      try {
        if (media.id !== undefined && media.id !== null) await deleteClippingMaterial({ id: media.id })
        this.removeLocalMediaFile(media)
      } catch (error) {
        this.$message.error(error.message || '媒体移除失败，请稍后重试。')
      }
    },
    removeLocalMediaFile(media) {
      if (media.previewUrl) URL.revokeObjectURL(media.previewUrl)
      this.mediaFiles = this.mediaFiles.filter((item) => item.path !== media.path)
      this.draft.mediaPaths = this.draft.mediaPaths.filter((path) => path !== media.path)
    },
    clearMediaFiles() {
      const mediaFiles = this.mediaFiles.slice()
      mediaFiles.forEach((media) => {
        this.removeLocalMediaFile(media)
        if (media.id !== undefined && media.id !== null) deleteClippingMaterial({ id: media.id }).catch(() => {})
      })
      this.draft.mediaPaths = []
    },
    releaseMediaPreviews() {
      this.mediaFiles.forEach((media) => {
        if (media.previewUrl) URL.revokeObjectURL(media.previewUrl)
      })
    },
    isImageMedia(media) {
      return media.type && media.type.startsWith('image/')
    },
    formatFileSize(bytes) {
      if (!bytes) return ''
      if (bytes < 1024) return `${bytes} B`
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
      return `${(bytes / 1024 / 1024).toFixed(1)} MB`
    },
    async createPublishAction() {
      if (!this.canPublish) {
        this.$message.error('你没有创建小红书发布动作的权限。')
        return
      }
      if (!this.canCreateAction || this.creatingAction) return
      this.creatingAction = true
      try {
        this.publishAction = await createXhsPublishAction({
          idempotencyKey: createIdempotencyKey(),
          type: this.draft.type,
          title: this.draft.title.trim(),
          content: this.draft.content.trim(),
          mediaPaths: this.draft.mediaPaths,
          tags: this.parseTags()
        })
        this.messages.push({ role: 'ai', text: '稿件已创建为 L2 待确认发布动作。我不会自动发布；请再次核对内容和媒体，确认后才会发送到你的小红书账号。' })
      } catch (error) {
        this.$message.error(error.message || '创建待确认发布失败，请稍后重试。')
      } finally {
        this.creatingAction = false
      }
    },
    confirmPublish() {
      this.$confirm(`确认发布「${this.publishAction.title}」到已连接的小红书账号？发布后将对外可见。`, '确认发布小红书笔记', {
        confirmButtonText: '确认发布', cancelButtonText: '暂不发布', type: 'warning'
      }).then(async () => {
        this.confirming = true
        try {
          const result = await confirmXhsPublishAction({ actionId: this.publishAction.actionId, idempotencyKey: createIdempotencyKey() })
          this.publishAction = Object.assign({}, this.publishAction, { status: result.status })
          this.$message.success(result.message || '小红书笔记发布成功。')
          this.messages.push({ role: 'ai', text: result.message || '小红书笔记发布成功。' })
        } catch (error) {
          if (error.status === 409) this.$message.warning('该发布动作状态已变化，请刷新后查看结果。')
          else this.$message.error(error.message || '发布失败，请稍后重试。')
        } finally {
          this.confirming = false
        }
      }).catch(() => {})
    },
    parseTags() {
      return this.tagsInput.split(/[\s,，]+/).map((tag) => tag.trim()).filter(Boolean)
    },
    resetDraft() {
      this.releaseMediaPreviews()
      this.draft = { type: 'image', title: '', content: '', mediaPaths: [] }
      this.mediaFiles = []
      this.mediaUploadError = ''
      this.tagsInput = ''
      this.publishAction = null
      this.messages = [{ role: 'ai', text: initialMessage }]
    }
  }
}
</script>
