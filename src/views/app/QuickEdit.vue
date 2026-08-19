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
          <MediaFileUpload @available="onMaterialsAvailable" @uploaded="onUploaded" @removed="onRemoved" />
          <div class="media-source__path">
            <el-input v-model="pathInput" size="small" placeholder="本机/NAS 素材路径，例如 /nas/videos/探店.mp4" />
            <el-button size="small" :disabled="!pathInput.trim()" @click="addPath">添加路径</el-button>
          </div>
          <ul v-if="materialPaths.length" class="media-source__paths">
            <li v-for="path in materialPaths" :key="path">{{ path }}</li>
          </ul>
        </div>
      </template>

      <section v-if="!run" class="quick-edit-engine-options" aria-label="可选生成引擎">
        <el-checkbox v-model="useSeedance">使用 Seedance 生成补充画面（可选）</el-checkbox>
        <p v-if="useSeedance">此项可能产生额外费用；未完成确认时不会启用。</p>
        <el-checkbox v-if="useSeedance" v-model="seedanceCostConfirmed">我已确认可能产生额外费用</el-checkbox>
      </section>

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

        <section v-if="engineProgress.length || engineFeedbackNotice" class="quick-edit-progress" aria-label="剪辑引擎进度">
          <p class="eyebrow">引擎进度</p>
          <ul v-if="engineProgress.length" class="quick-edit-engine-list">
            <li v-for="stage in engineProgress" :key="stage.key">
              <strong>{{ stage.label }}</strong>
              <el-tag size="mini" effect="plain" :type="engineStatusTagType(stage.status)">{{ engineStatusLabel(stage.status) }}</el-tag>
              <span v-if="stage.message">{{ stage.message }}</span>
            </li>
          </ul>
          <p v-if="engineFeedbackNotice" class="quick-edit-progress__notice">{{ engineFeedbackNotice }}</p>
          <p v-if="engineCapabilityNotice" class="quick-edit-progress__notice">{{ engineCapabilityNotice }}</p>
        </section>

        <template v-if="actions.length">
          <header class="panel-heading run-section-heading"><div><p class="eyebrow">方案时间线</p><h2>剪辑方案</h2></div></header>
          <PlanTimeline :plan="firstActionPlan" />
          <section v-if="versionHistory.length" class="quick-edit-history" aria-label="修改历史">
            <p class="eyebrow">修改历史</p>
            <ul>
              <li v-for="item in versionHistory" :key="item.version">
                <el-tag size="mini" effect="plain">{{ versionLabel(item.version) }}</el-tag>
                <span>{{ item.description || '方案已更新' }}</span>
                <time v-if="item.createdAt">{{ formatTime(item.createdAt) }}</time>
              </li>
            </ul>
          </section>
          <div v-if="canRevise" class="quick-edit-revise-shortcuts">
            <el-button v-for="shortcut in reviseShortcuts" :key="shortcut" size="mini" plain :disabled="revising || confirmingId !== null" @click="openReviseDialog(shortcut)">{{ shortcut }}</el-button>
          </div>
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
                <el-button size="mini" :disabled="revising || confirmingId !== null" @click="openReviseDialog()">修改方案</el-button>
              </div>
            </li>
          </ul>
        </template>

        <section v-if="rendering || mp4FileId" class="quick-edit-preview" aria-label="粗剪视频预览">
          <header class="panel-heading run-section-heading"><div><p class="eyebrow">粗剪结果</p><h2>视频预览</h2></div></header>
          <p v-if="rendering">正在渲染预览…</p>
          <template v-else>
            <video v-if="previewUrl" class="quick-edit-preview__video" controls preload="metadata" :src="previewUrl" aria-label="粗剪视频预览" />
            <p v-else-if="preparingPreview">正在生成安全的视频链接…</p>
            <p v-else-if="previewError">视频预览链接暂不可用，请重试。</p>
            <p v-else>正在准备视频预览…</p>
            <el-button v-if="previewError" size="small" :loading="preparingPreview" @click="prepareMp4Preview">重试获取预览</el-button>
            <el-button type="primary" size="small" :loading="downloadingMp4" :disabled="!previewUrl" @click="downloadMp4">下载 mp4</el-button>
          </template>
        </section>

        <section v-if="renderFailed" class="quick-edit-render-failure" aria-label="粗剪渲染状态">
          <p>粗剪渲染未完成，视频未生成。你可以修改方案后重试。</p>
          <el-button size="small" type="primary" :disabled="revising || confirmingId !== null" @click="openReviseDialog()">修改方案后重试</el-button>
        </section>

        <template v-if="draftFileId">
          <header class="panel-heading run-section-heading"><div><p class="eyebrow">剪辑结果</p><h2>草稿下载</h2></div></header>
          <p>{{ confirmMessage || '草稿已生成，打开剪映即可编辑。' }}</p>
          <el-button type="primary" size="small" :loading="downloading" @click="downloadDraft">进阶：去剪映精剪（下载 .draft）</el-button>
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

      <el-dialog title="修改剪辑方案" :visible.sync="reviseDialogVisible" width="480px">
        <el-input v-model="reviseInstruction" type="textarea" :rows="3" placeholder="例如：调整为横屏 60 秒，加配乐" />
        <span slot="footer">
          <el-button size="small" @click="reviseDialogVisible = false">取消</el-button>
          <el-button size="small" type="primary" :loading="revising" :disabled="!reviseInstruction.trim()" @click="revisePlan">提交修改</el-button>
        </span>
      </el-dialog>
    </section>
  </section>
</template>

<script>
import { chatClipping, confirmSkillAction, createSkillRun, fetchFileContent, getClippingTask, getFileReadToken, reviseSkillRun } from '../../api/skill'
import { getRun, getRunActions, getRunEvents } from '../../api/expert'
import { createIdempotencyKey } from '../../utils/idempotency'
import { triggerDownload } from '../../utils/download'
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

const REVISE_SHORTCUTS = ['调整时长', '更换风格', '编辑片头', '调整顺序', '删除片段', '新增素材', '重新生成']
const ENGINE_STAGES = [
  { key: 'video_use', label: '素材分析与粗剪' },
  { key: 'seedance', label: '补充画面（可选）' },
  { key: 'hyperframes', label: '视觉包装' },
  { key: 'remotion', label: '渲染编排（可选）' },
  { key: 'draft', label: '草稿生成' }
]

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
      clippingTask: null,
      chatThinking: false,
      suggestions: [],
      pathInput: '',
      materialPaths: [],
      useSeedance: false,
      seedanceCostConfirmed: false,
      run: null,
      submitting: false,
      events: [],
      actions: [],
      confirmingId: null,
      revising: false,
      reviseDialogVisible: false,
      reviseInstruction: '',
      draftFileId: null,
      previewUrl: '',
      previewFileId: null,
      previewError: false,
      preparingPreview: false,
      downloadingMp4: false,
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
    mp4FileId() {
      return (this.run && this.run.mp4FileId) || (this.clippingTask && this.clippingTask.mp4FileId) || null
    },
    rendering() {
      return this.clippingTask && this.clippingTask.status === 'rendering'
    },
    renderFailed() {
      return (this.clippingTask && this.clippingTask.status === 'failed') || (this.run && this.run.status === 'failed')
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
    },
    canRevise() {
      return this.run && this.run.status !== 'completed' && this.run.status !== 'cancelled'
    },
    reviseShortcuts() {
      return REVISE_SHORTCUTS
    },
    versionHistory() {
      const history = this.run && Array.isArray(this.run.versionHistory) ? this.run.versionHistory : []
      if (history.length) return history
      return this.run && this.run.version ? [{ version: this.run.version, description: '当前方案', createdAt: this.run.createdAt }] : []
    },
    engineProgress() {
      const latestEvents = this.events.reduce((result, event) => {
        if (event.stage && ENGINE_STAGES.some((stage) => stage.key === event.stage)) result[event.stage] = event
        return result
      }, {})
      const taskStage = this.clippingTask && this.clippingTask.engineStage
      return ENGINE_STAGES.reduce((result, stage) => {
        const event = latestEvents[stage.key]
        if (event) result.push(Object.assign({}, stage, event))
        else if (taskStage === stage.key) result.push(Object.assign({}, stage, { status: 'running', message: '任务当前公开阶段' }))
        return result
      }, [])
    },
    unreportedEngineStages() {
      const reported = this.engineProgress.map((stage) => stage.key)
      return ENGINE_STAGES.filter((stage) => !reported.includes(stage.key))
    },
    engineFeedbackNotice() {
      if (!this.unreportedEngineStages.length) return ''
      const names = this.unreportedEngineStages.map((stage) => stage.label).join('、')
      const taskStage = this.clippingTask && this.clippingTask.engineStage
      const detail = taskStage && !ENGINE_STAGES.some((stage) => stage.key === taskStage)
        ? `当前任务仅返回“${taskStage}”阶段。`
        : '当前任务未返回这些阶段的公开事件。'
      return `暂无 ${names} 的实时引擎反馈：${detail} 未收到事件不代表能力未接入或任务未执行。`
    },
    engineCapabilityNotice() {
      const seedanceStatus = this.useSeedance ? 'Seedance 本次已请求，等待服务端事件确认。' : 'Seedance 本次未启用。'
      if (!this.unreportedEngineStages.length) return seedanceStatus
      return `${seedanceStatus} 其他引擎的接入、配置和可用性状态当前接口未提供，前端无法据此判断能力是否已接入。`
    }
  },
  watch: {
    useSeedance(enabled) {
      if (!enabled) this.seedanceCostConfirmed = false
    },
    mp4FileId(fileId) {
      if (!fileId) {
        this.clearMp4Preview()
        return
      }
      if (fileId !== this.previewFileId) this.prepareMp4Preview()
    }
  },
  mounted() {
    this.restoreTaskFromRoute()
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
        const response = await chatClipping({ message, context: this.chatContext, taskId: this.clippingTask && this.clippingTask.id })
        if (!this.pageAlive) return
        this.chatContext = response.context
        if (response.taskId) {
          this.clippingTask = Object.assign({}, this.clippingTask, { id: response.taskId })
          this.syncTaskRoute(response.taskId)
        }
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
    onMaterialsAvailable(materials = []) {
      const paths = materials.map((material) => material.storagePath).filter(Boolean)
      this.materialPaths = [...new Set([...this.materialPaths, ...paths])]
      this.syncChatContext()
    },
    onRemoved(id, material) {
      if (id && material && material.storagePath) {
        this.materialPaths = this.materialPaths.filter((path) => path !== material.storagePath)
      }
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
      if (this.useSeedance && !this.seedanceCostConfirmed) {
        this.$message.warning('请先确认 Seedance 可能产生的额外费用，或取消该选项。')
        return
      }
      this.submitting = true
      const instruction = this.chatContext && this.chatContext.goal
      const input = instruction ? { media_location: this.materialPaths[0], instruction } : { media_location: this.materialPaths[0] }
      if (this.useSeedance && this.seedanceCostConfirmed) input.allowSeedance = true
      const inputJson = JSON.stringify(input)
      createSkillRun({ skillCode: 'quick-edit', inputJson, idempotencyKey: createIdempotencyKey(), taskId: this.clippingTask && this.clippingTask.id })
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
      await Promise.all([this.fetchEvents(), this.fetchActions(), this.fetchClippingTask()])
    },
    async fetchClippingTask() {
      if (!this.clippingTask || !this.clippingTask.id) return
      const task = await getClippingTask({ taskId: this.clippingTask.id })
      if (!this.pageAlive) return
      this.clippingTask = task
      this.materialPaths = task.materials
      this.chatContext = Object.assign({}, this.chatContext, { materials: task.materials, goal: task.goal })
      const runHistory = this.run && Array.isArray(this.run.versionHistory) ? this.run.versionHistory : []
      if (this.run && !runHistory.length && task.versionHistory.length) {
        this.run = Object.assign({}, this.run, { engineStage: task.engineStage, versionHistory: task.versionHistory, mp4FileId: task.mp4FileId || this.run.mp4FileId })
      } else if (this.run && task.mp4FileId && !this.run.mp4FileId) {
        this.run = Object.assign({}, this.run, { mp4FileId: task.mp4FileId })
      }
      if (task.mp4FileId) this.prepareMp4Preview()
    },
    async restoreTaskFromRoute() {
      const taskId = Number(this.$route && this.$route.query.taskId)
      if (!Number.isSafeInteger(taskId) || taskId <= 0) return
      this.clippingTask = { id: taskId }
      try {
        await this.fetchClippingTask()
        if (this.clippingTask.runId) {
          this.run = await getRun({ id: this.clippingTask.runId })
          await this.refreshRunParts()
          this.startPollingIfNeeded()
        }
      } catch (error) {
        this.clippingTask = null
        this.$message.error(error.status === 404 ? '剪辑任务不存在或你无权访问。' : (error.message || '恢复剪辑任务失败，请重试。'))
      }
    },
    syncTaskRoute(taskId) {
      if (!this.$router || !this.$route || String(this.$route.query.taskId) === String(taskId)) return
      this.$router.replace({ query: Object.assign({}, this.$route.query, { taskId }) })
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
          if (run.mp4FileId) this.prepareMp4Preview()
          await this.refreshRunParts()
          if (terminalStatuses.includes(run.status)) {
            this.stopPolling()
            if (run.status === 'completed') this.$message.success('运行已完成。')
            else this.$message.error('运行未完成，请修改方案后重试。')
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
          if (run.mp4FileId) this.prepareMp4Preview()
          if (terminalStatuses.includes(run.status)) this.stopPolling()
          else this.startPollingIfNeeded()
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
    openReviseDialog(shortcut) {
      this.reviseInstruction = shortcut ? `${shortcut}：` : ''
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
        this.$message.success('修改已提交，正在更新剪辑方案。')
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
    async prepareMp4Preview() {
      const fileId = this.mp4FileId
      if (!fileId || this.preparingPreview || (this.previewUrl && this.previewFileId === fileId)) return
      if (this.previewFileId !== fileId) {
        this.revokePreviewUrl()
        this.previewFileId = null
      }
      this.previewError = false
      this.preparingPreview = true
      try {
        const { readUrl } = await getFileReadToken({ fileId })
        const blobUrl = await fetchFileContent({ readUrl })
        if (this.pageAlive && this.mp4FileId === fileId) {
          this.revokePreviewUrl()
          this.previewUrl = blobUrl
          this.previewFileId = fileId
        }
      } catch (error) {
        if (this.pageAlive && this.mp4FileId === fileId) {
          this.previewError = true
          this.$message.error(error.message || '视频预览加载失败，请重试。')
        }
      } finally {
        if (this.pageAlive) this.preparingPreview = false
      }
    },
    async downloadMp4() {
      if (!this.mp4FileId) return
      this.downloadingMp4 = true
      try {
        const { readUrl } = await getFileReadToken({ fileId: this.mp4FileId })
        const blobUrl = await fetchFileContent({ readUrl })
        triggerDownload(blobUrl, 'quick-edit.mp4')
      } catch (error) {
        this.$message.error(error.message || '视频下载失败，请重试。')
      } finally {
        this.downloadingMp4 = false
      }
    },
    revokePreviewUrl() {
      if (this.previewUrl) {
        URL.revokeObjectURL(this.previewUrl)
        this.previewUrl = ''
      }
    },
    clearMp4Preview() {
      this.revokePreviewUrl()
      this.previewFileId = null
      this.previewError = false
      this.preparingPreview = false
      this.downloadingMp4 = false
    },
    reset() {
      this.stopPolling()
      this.run = null
      this.events = []
      this.actions = []
      this.draftFileId = null
      this.clearMp4Preview()
      this.confirmMessage = ''
      this.suggestions = []
      this.chatContext = null
      this.clippingTask = null
      this.materialPaths = []
      this.useSeedance = false
      this.seedanceCostConfirmed = false
      if (this.$router && this.$route && this.$route.query.taskId) {
        const query = Object.assign({}, this.$route.query)
        delete query.taskId
        this.$router.replace({ query })
      }
    },
    statusLabel(status) { return statusLabels[status] || status },
    statusTagType(status) { return statusTagTypes[status] || 'info' },
    actionStatusLabel(status) { return actionStatusLabels[status] || status },
    actionTagType(status) { return actionTagTypes[status] || 'info' },
    eventTypeLabel(type) {
      return { queued: '已排队', started: '已开始', planning: '规划中', action: '动作', completed: '完成', failed: '失败', cancelled: '已取消', plan_revised: '方案已修订' }[type] || type
    },
    engineStatusLabel(status) {
      return { waiting: '待执行', queued: '已排队', running: '运行中', skipped: '已跳过', succeeded: '已完成', failed: '失败' }[status] || '待更新'
    },
    engineStatusTagType(status) {
      return { running: 'warning', succeeded: 'success', failed: 'danger', skipped: 'info' }[status] || 'info'
    },
    versionLabel(version) { return `版本 ${version || '—'}` },
    formatTime(value) {
      if (!value) return ''
      return new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
    }
  }
}
</script>
