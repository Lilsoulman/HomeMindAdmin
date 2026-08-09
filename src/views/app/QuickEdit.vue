<template>
  <section class="quick-edit-page">
    <section class="overview-intro">
      <div>
        <p class="eyebrow">个人空间</p>
        <h1>快速剪辑</h1>
        <p>上传素材或填入路径，告诉创作目标，由 Skill 生成剪辑方案与 .draft 草稿。素材位置由服务端校验。</p>
      </div>
    </section>

    <section class="surface-panel run-panel">
      <el-steps :active="activeStep - 1" align-center class="quick-edit-steps" size="small">
        <el-step title="素材" />
        <el-step title="创作目标" />
        <el-step title="方案确认" />
        <el-step title="导出" />
      </el-steps>

      <ul class="chat-messages">
        <li v-for="(message, index) in messages" :key="index" :class="['chat-message', message.role === 'user' ? 'chat-message--user' : 'chat-message--ai']">
          <div class="chat-message__bubble">{{ message.text }}</div>
        </li>
        <li v-if="chatThinking" class="chat-message chat-message--ai">
          <div class="chat-message__bubble">正在思考…</div>
        </li>
      </ul>

      <div v-if="suggestions.length" class="chat-suggestions">
        <el-button v-for="suggestion in suggestions" :key="suggestion" size="mini" plain @click="applySuggestion(suggestion)">{{ suggestion }}</el-button>
      </div>

      <div class="chat-input">
        <el-input v-model="draft" size="small" placeholder="告诉我怎么剪，例如：竖屏 30 秒，加字幕" @keyup.enter.native="send" />
        <el-button type="primary" size="small" :loading="chatThinking" :disabled="!draft.trim() || chatThinking" @click="send">发送</el-button>
      </div>

      <template v-if="activeStep === 1">
        <header class="panel-heading run-section-heading"><div><p class="eyebrow">素材</p><h2>上传或填入素材</h2></div></header>
        <div class="media-source">
          <MediaFileUpload @uploaded="onUploaded" @removed="onRemoved" />
          <div class="media-source__path">
            <el-input v-model="pathInput" size="small" placeholder="本机/NAS 素材路径，例如 /nas/videos/探店.mp4" />
            <el-button size="small" :disabled="!pathInput.trim()" @click="addPath">添加路径</el-button>
          </div>
          <ul v-if="materialPaths.length" class="media-source__paths">
            <li v-for="path in materialPaths" :key="path">{{ path }}</li>
          </ul>
        </div>
      </template>

      <template v-if="run">
        <div class="panel-heading">
          <el-tag :type="statusTagType(run.status)" effect="plain">{{ statusLabel(run.status) }}</el-tag>
          <el-button size="mini" @click="reset">重新剪辑</el-button>
        </div>
        <dl class="activity-detail-dl">
          <div v-if="run.resultSummary"><dt>剪辑方案</dt><dd>{{ run.resultSummary }}</dd></div>
          <div><dt>创建时间</dt><dd>{{ formatTime(run.createdAt) }}</dd></div>
          <div v-if="run.finishedAt"><dt>结束时间</dt><dd>{{ formatTime(run.finishedAt) }}</dd></div>
        </dl>

        <template v-if="actions.length">
          <header class="panel-heading run-section-heading"><div><p class="eyebrow">方案时间线</p><h2>剪辑方案</h2></div></header>
          <PlanTimeline :plan="firstActionPlan" />
          <ul class="run-action-list">
            <li v-for="action in actions" :key="action.id">
              <div class="run-action-list__head">
                <strong>{{ action.title || '生成剪辑草稿' }}</strong>
                <el-tag :type="actionTagType(action.status)" effect="plain" size="small">{{ actionStatusLabel(action.status) }}</el-tag>
              </div>
              <p>{{ action.description }}</p>
              <div v-if="action.status === 'pending'" class="run-action-list__actions">
                <el-button size="mini" type="primary" :loading="confirmingId === action.id" :disabled="confirmingId !== null" @click="confirmAction(action)">
                  确认生成草稿
                </el-button>
                <el-button size="mini" :disabled="revising || confirmingId !== null" @click="openReviseDialog">修改目标重新生成</el-button>
              </div>
            </li>
          </ul>
        </template>

        <template v-if="draftFileId">
          <header class="panel-heading run-section-heading"><div><p class="eyebrow">剪辑结果</p><h2>草稿下载</h2></div></header>
          <p>{{ confirmMessage || '草稿已生成，打开剪映即可编辑。' }}</p>
          <el-button type="primary" size="small" :loading="downloading" @click="downloadDraft">下载 .draft 草稿</el-button>
        </template>

        <header class="panel-heading run-section-heading"><div><p class="eyebrow">进展</p><h2>事件时间线</h2></div></header>
        <ul v-if="events.length" class="run-event-list">
          <li v-for="event in events" :key="event.id || event.sequence">
            <span class="activity-dot" />
            <div>
              <strong>{{ eventTypeLabel(event.eventType) }}</strong>
              <p v-if="event.message">{{ event.message }}</p>
            </div>
            <time>{{ formatTime(event.createdAt) }}</time>
          </li>
        </ul>
        <p v-else>暂无事件。</p>
      </template>

      <el-dialog title="修改创作目标" :visible.sync="reviseDialogVisible" width="480px">
        <el-input v-model="reviseInstruction" type="textarea" :rows="3" placeholder="例如：改成横屏 60 秒，加配乐" />
        <span slot="footer">
          <el-button size="small" @click="reviseDialogVisible = false">取消</el-button>
          <el-button size="small" type="primary" :loading="revising" :disabled="!reviseInstruction.trim()" @click="revisePlan">重新生成方案</el-button>
        </span>
      </el-dialog>
    </section>
  </section>
</template>

<script>
import { chatClipping, confirmSkillAction, createSkillRun, getFileReadToken, reviseSkillRun } from '../../api/skill'
import { getRun, getRunActions, getRunEvents } from '../../api/expert'
import { createIdempotencyKey } from '../../utils/idempotency'
import MediaFileUpload from '../../components/media/MediaFileUpload.vue'
import PlanTimeline from '../../components/media/PlanTimeline.vue'

const statusLabels = { draft: '草稿', queued: '排队中', planning: '规划中', running: '运行中', completed: '已完成', failed: '失败', cancelled: '已取消' }
const statusTagTypes = { draft: 'info', queued: 'info', planning: 'warning', running: 'warning', completed: 'success', failed: 'danger', cancelled: 'info' }
const actionStatusLabels = { pending: '待确认', confirmed: '已确认', rejected: '已拒绝', executing: '执行中', executed: '已执行', failed: '失败', cancelled: '已取消' }
const actionTagTypes = { pending: 'warning', confirmed: 'info', rejected: 'info', executing: 'warning', executed: 'success', failed: 'danger', cancelled: 'info' }

const terminalStatuses = ['completed', 'failed', 'cancelled']

const ACTION_SUGGESTIONS = {
  生成方案: 'generatePlan',
  确认方案: 'confirmPending',
  修改目标重新生成: 'openReviseDialog',
  重新剪辑: 'reset'
}

export default {
  components: { MediaFileUpload, PlanTimeline },
  props: {
    pollInterval: { type: Number, default: 2500 }
  },
  data() {
    return {
      draft: '',
      messages: [
        { role: 'ai', text: '你好，我是快速剪辑助手。上传素材或填入素材路径，然后告诉我想要的剪辑效果，我来帮你生成剪辑方案与剪映草稿。' }
      ],
      chatContext: null,
      chatThinking: false,
      suggestions: [],
      pathInput: '',
      materialPaths: [],
      run: null,
      submitting: false,
      events: [],
      actions: [],
      confirmingId: null,
      revising: false,
      reviseDialogVisible: false,
      reviseInstruction: '',
      draftFileId: null,
      confirmMessage: '',
      downloading: false,
      timer: null,
      pageAlive: true
    }
  },
  computed: {
    polling() {
      return this.run && !terminalStatuses.includes(this.run.status)
    },
    activeStep() {
      if (this.draftFileId) return 4
      if (this.run) return 3
      if (this.chatContext && this.chatContext.step === 'generating_plan') return 2
      return 1
    },
    firstActionPlan() {
      const action = this.actions.find((item) => item.plan && item.plan.segments && item.plan.segments.length)
      return action ? action.plan : { segments: [], audio: null, totalDuration: null }
    }
  },
  destroyed() {
    this.pageAlive = false
    this.stopPolling()
  },
  methods: {
    async send() {
      const message = this.draft.trim()
      if (!message || this.chatThinking) return
      this.draft = ''
      this.messages.push({ role: 'user', text: message })
      this.chatThinking = true
      try {
        const response = await chatClipping({ message, context: this.chatContext })
        if (!this.pageAlive) return
        this.chatContext = response.context
        this.suggestions = response.suggestions || []
        this.messages.push({ role: 'ai', text: response.reply })
      } catch (error) {
        if (this.pageAlive) {
          this.messages.push({ role: 'ai', text: error.message || '对话失败，请重试。' })
          this.suggestions = []
        }
      } finally {
        if (this.pageAlive) this.chatThinking = false
      }
    },
    applySuggestion(suggestion) {
      const action = ACTION_SUGGESTIONS[suggestion]
      if (action && this[action]) {
        this[action]()
      } else {
        this.draft = suggestion
        this.send()
      }
    },
    onUploaded(material) {
      this.materialPaths = [...new Set([...this.materialPaths, material.storagePath])]
      this.syncChatContext()
    },
    onRemoved() {
      // 素材卡片移除不改变已回填路径（路径已进入 Skill 输入），仅重推上下文保留现状
      this.syncChatContext()
    },
    addPath() {
      const path = this.pathInput.trim()
      if (!path) return
      this.materialPaths = [...new Set([...this.materialPaths, path])]
      this.pathInput = ''
      this.syncChatContext()
    },
    syncChatContext() {
      this.chatContext = Object.assign({}, this.chatContext, { step: 'collecting_materials', materials: this.materialPaths })
    },
    generatePlan() {
      if (!this.materialPaths.length) {
        this.$message.warning('请先上传素材或填写素材路径。')
        return
      }
      if (this.submitting) return
      this.submitting = true
      const instruction = this.chatContext && this.chatContext.goal
      const inputJson = JSON.stringify(instruction ? { media_location: this.materialPaths[0], instruction } : { media_location: this.materialPaths[0] })
      createSkillRun({ skillCode: 'quick-edit', inputJson, idempotencyKey: createIdempotencyKey() })
        .then((run) => {
          if (!this.pageAlive) return
          this.run = run
          this.suggestions = []
          return this.refreshRunParts()
        })
        .then(() => this.startPollingIfNeeded())
        .catch((error) => {
          if (this.pageAlive) {
            if (error.status === 422) {
              this.$message.error(error.message || '素材位置必填且格式正确。')
            } else {
              this.$message.error(error.message || '提交失败，请重试。')
            }
          }
        })
        .finally(() => {
          if (this.pageAlive) this.submitting = false
        })
    },
    async refreshRunParts() {
      await Promise.all([this.fetchEvents(), this.fetchActions()])
    },
    async fetchEvents() {
      const events = await getRunEvents({ id: this.run.id })
      if (this.pageAlive) this.events = events
    },
    async fetchActions() {
      const result = await getRunActions({ id: this.run.id })
      if (this.pageAlive) {
        if (result.events.length) this.events = result.events
        this.actions = result.actions
      }
    },
    startPollingIfNeeded() {
      this.stopPolling()
      if (!this.run || terminalStatuses.includes(this.run.status)) return
      this.timer = setInterval(async () => {
        if (!this.pageAlive) { this.stopPolling(); return }
        try {
          const run = await getRun({ id: this.run.id })
          if (!this.pageAlive) return
          this.run = run
          await this.refreshRunParts()
          if (terminalStatuses.includes(run.status)) {
            this.stopPolling()
            this.$message.success('运行已完成。')
          }
        } catch (error) {
          this.stopPolling()
          this.$message.error(error.message || '刷新运行状态失败。')
        }
      }, this.pollInterval)
    },
    stopPolling() {
      if (this.timer) {
        clearInterval(this.timer)
        this.timer = null
      }
    },
    confirmPending() {
      const pending = this.actions.find((action) => action.status === 'pending')
      if (pending) this.confirmAction(pending)
    },
    async confirmAction(action) {
      this.confirmingId = action.id
      try {
        const result = await confirmSkillAction({ runId: this.run.id, actionId: action.id, idempotencyKey: createIdempotencyKey() })
        this.confirmMessage = result.message || '草稿已生成，打开剪映即可编辑。'
        if (result.fileId) this.draftFileId = result.fileId
        this.$message.success(this.confirmMessage)
        await this.fetchActions()
        const run = await getRun({ id: this.run.id })
        if (this.pageAlive) {
          this.run = run
          if (terminalStatuses.includes(run.status)) this.stopPolling()
        }
      } catch (error) {
        if (error.status === 409) {
          this.$message.warning('该动作状态已变化（已刷新）。')
          await this.fetchActions()
        } else if (error.status === 502) {
          this.$message.error('草稿生成失败，请稍后重试。')
        } else if (error.status === 422) {
          this.$message.error(error.message || '确认请求不符合要求。')
        } else if (error.status === 404) {
          this.$message.error('动作不存在或已失效。')
        } else if (error.status === 403) {
          this.$message.error('你没有执行该操作的权限。')
        } else {
          this.$message.error(error.message || '操作失败，请重试。')
        }
      } finally {
        this.confirmingId = null
      }
    },
    openReviseDialog() {
      this.reviseInstruction = (this.chatContext && this.chatContext.goal) || ''
      this.reviseDialogVisible = true
    },
    async revisePlan() {
      const instruction = this.reviseInstruction.trim()
      if (!instruction || this.revising) return
      this.revising = true
      try {
        const run = await reviseSkillRun({ runId: this.run.id, instruction, idempotencyKey: createIdempotencyKey() })
        if (!this.pageAlive) return
        this.run = run
        await this.refreshRunParts()
        this.$message.success('剪辑方案已按新目标重新生成。')
        this.startPollingIfNeeded()
        this.reviseDialogVisible = false
        if (this.chatContext) {
          this.chatContext = Object.assign({}, this.chatContext, { step: 'reviewing', goal: instruction, planGenerated: true })
        }
      } catch (error) {
        if (error.status === 409) {
          this.$message.warning('方案已确认或运行已终态，不能再次修订。')
        } else {
          this.$message.error(error.message || '方案修订失败，请重试。')
        }
      } finally {
        this.revising = false
      }
    },
    async downloadDraft() {
      if (!this.draftFileId) return
      this.downloading = true
      try {
        const { readUrl } = await getFileReadToken({ fileId: this.draftFileId })
        // 服务端签发相对路径（如 api/v1/expert-files/2/content?readToken=...），需拼接 API 基址后在浏览器打开。
        const target = readUrl.startsWith('http') ? readUrl : `${process.env.VUE_APP_API_BASE_URL || ''}/${readUrl.replace(/^\/+/, '')}`
        window.open(target, '_blank')
      } catch (error) {
        this.$message.error(error.message || '草稿下载链接生成失败，请重试。')
      } finally {
        this.downloading = false
      }
    },
    reset() {
      this.stopPolling()
      this.run = null
      this.events = []
      this.actions = []
      this.draftFileId = null
      this.confirmMessage = ''
      this.suggestions = []
      this.chatContext = null
      this.materialPaths = []
    },
    statusLabel(status) { return statusLabels[status] || status },
    statusTagType(status) { return statusTagTypes[status] || 'info' },
    actionStatusLabel(status) { return actionStatusLabels[status] || status },
    actionTagType(status) { return actionTagTypes[status] || 'info' },
    eventTypeLabel(type) {
      return { queued: '已排队', started: '已开始', planning: '规划中', action: '动作', completed: '完成', failed: '失败', cancelled: '已取消', plan_revised: '方案已修订' }[type] || type
    },
    formatTime(value) {
      if (!value) return ''
      return new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
    }
  }
}
</script>
