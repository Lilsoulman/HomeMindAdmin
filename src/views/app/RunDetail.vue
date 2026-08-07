<template>
  <section class="run-detail-page">
    <div v-if="loading" class="overview-page__loading"><i class="el-icon-loading" /> 正在加载运行记录</div>
    <PageState v-else-if="error" type="error" :title="errorTitle" :description="error.message" @retry="load" />

    <template v-else-if="run">
      <section class="overview-intro">
        <div>
          <p class="eyebrow">家庭空间</p>
          <h1>运行详情</h1>
          <p>{{ runStatusHint }}</p>
        </div>
        <el-tag :type="statusTagType(run.status)" effect="plain">{{ statusLabel(run.status) }}</el-tag>
      </section>

      <section class="surface-panel run-panel">
        <dl class="activity-detail-dl">
          <div><dt>创建时间</dt><dd>{{ formatTime(run.createdAt) }}</dd></div>
          <div v-if="run.startedAt"><dt>开始时间</dt><dd>{{ formatTime(run.startedAt) }}</dd></div>
          <div v-if="run.finishedAt"><dt>结束时间</dt><dd>{{ formatTime(run.finishedAt) }}</dd></div>
          <div><dt>来源</dt><dd>{{ sourceLabel(run.sourceType) }}</dd></div>
          <div v-if="run.resultSummary"><dt>结果摘要</dt><dd>{{ run.resultSummary }}</dd></div>
          <div><dt>积分</dt><dd>{{ run.actualCredits || 0 }} / 预估 {{ run.estimatedCredits || 0 }}</dd></div>
        </dl>

        <template v-if="actions.length">
          <header class="panel-heading run-section-heading"><div><p class="eyebrow">待办动作</p><h2>Action</h2></div></header>
          <ul class="run-action-list">
            <li v-for="action in actions" :key="action.id">
              <div class="run-action-list__head">
                <strong>{{ action.title || '设备动作' }}</strong>
                <el-tag :type="actionTagType(action.status)" effect="plain" size="small">{{ actionStatusLabel(action.status) }}</el-tag>
              </div>
              <p>{{ action.description || `${action.deviceName || '设备'} · ${action.capability || ''}` }}</p>
              <p v-if="action.targetValue !== undefined && action.targetValue !== null" class="run-action-list__target">目标值：{{ JSON.stringify(action.targetValue) }}</p>
              <el-button
                v-if="action.status === 'pending'"
                size="mini"
                type="primary"
                :loading="confirmingId === action.id"
                :disabled="confirmingId !== null"
                @click="confirmAction(action)"
              >
                确认执行
              </el-button>
            </li>
          </ul>
        </template>

        <header class="panel-heading run-section-heading"><div><p class="eyebrow">进展</p><h2>事件时间线</h2></div></header>
        <PageState v-if="!events.length" title="暂无事件" description="运行开始后会在这里显示可理解的进展。" />
        <ul v-else class="run-event-list">
          <li v-for="event in events" :key="event.id || event.sequence">
            <span class="activity-dot" />
            <div>
              <strong>{{ eventTypeLabel(event.eventType) }}</strong>
              <p v-if="event.message">{{ event.message }}</p>
            </div>
            <time>{{ formatTime(event.createdAt) }}</time>
          </li>
        </ul>
      </section>
    </template>
  </section>
</template>

<script>
import { confirmRunAction, getRun, getRunActions, getRunEvents } from '../../api/expert'
import { createIdempotencyKey } from '../../utils/idempotency'
import PageState from '../../components/common/PageState.vue'

const statusLabels = { draft: '草稿', queued: '排队中', planning: '规划中', running: '运行中', completed: '已完成', failed: '失败', cancelled: '已取消' }
const statusTagTypes = { draft: 'info', queued: 'info', planning: 'warning', running: 'warning', completed: 'success', failed: 'danger', cancelled: 'info' }
const actionStatusLabels = { pending: '待确认', confirmed: '已确认', rejected: '已拒绝', executing: '执行中', executed: '已执行', failed: '失败', cancelled: '已取消' }
const actionTagTypes = { pending: 'warning', confirmed: 'info', rejected: 'info', executing: 'warning', executed: 'success', failed: 'danger', cancelled: 'info' }

const terminalStatuses = ['completed', 'failed', 'cancelled']

export default {
  components: { PageState },
  data() {
    return {
      loading: true,
      error: null,
      run: null,
      events: [],
      actions: [],
      confirmingId: null,
      timer: null,
      pageAlive: true
    }
  },
  computed: {
    runId() {
      return Number(this.$route.params.id)
    },
    polling() {
      return this.run && !terminalStatuses.includes(this.run.status)
    },
    runStatusHint() {
      return this.polling ? '运行进行中，页面将自动刷新进展。' : '本页仅显示可公开的阶段、动作与结果。'
    },
    errorTitle() {
      if (this.error && this.error.status === 404) return '运行记录不存在'
      return this.error && this.error.status === 403 ? '暂无运行查看权限' : '运行记录暂不可用'
    }
  },
  created() {
    this.load()
  },
  destroyed() {
    this.pageAlive = false
    this.stopPolling()
  },
  methods: {
    async load() {
      this.loading = true
      this.error = null
      try {
        await Promise.all([this.fetchRun(), this.fetchEvents(), this.fetchActions()])
        this.startPollingIfNeeded()
      } catch (error) {
        if (this.pageAlive) this.error = error
      } finally {
        if (this.pageAlive) this.loading = false
      }
    },
    async fetchRun() {
      const run = await getRun({ id: this.runId })
      if (this.pageAlive) this.run = run
      return run
    },
    async fetchEvents() {
      const events = await getRunEvents({ id: this.runId })
      if (this.pageAlive) this.events = events
      return events
    },
    async fetchActions() {
      const result = await getRunActions({ id: this.runId })
      if (this.pageAlive) {
        if (result.events.length) this.events = result.events
        this.actions = result.actions
      }
      return result
    },
    startPollingIfNeeded() {
      this.stopPolling()
      if (!this.run || terminalStatuses.includes(this.run.status)) return
      this.timer = setInterval(async () => {
        if (!this.pageAlive) { this.stopPolling(); return }
        try {
          const run = await this.fetchRun()
          await this.fetchEvents()
          await this.fetchActions()
          if (terminalStatuses.includes(run.status)) {
            this.stopPolling()
            this.$message.success('运行已完成。')
          }
        } catch (error) {
          this.stopPolling()
          this.$message.error(error.message || '刷新运行状态失败。')
        }
      }, 2500)
    },
    stopPolling() {
      if (this.timer) {
        clearInterval(this.timer)
        this.timer = null
      }
    },
    async confirmAction(action) {
      this.confirmingId = action.id
      try {
        const result = await confirmRunAction({ runId: this.runId, actionId: action.id, idempotencyKey: createIdempotencyKey() })
        this.$message.success(result.message || '动作已确认执行。')
        await this.fetchActions()
      } catch (error) {
        if (error.status === 409) {
          this.$message.warning('该动作状态已变化（已刷新）。')
          await this.fetchActions()
        } else if (error.status === 422) {
          this.$message.error(error.message || '确认请求不符合要求。')
        } else if (error.status === 503) {
          this.$message.error('配置或密钥错误，动作暂不可执行。')
        } else if (error.status === 502) {
          this.$message.error('目标设备服务故障，请稍后重试。')
        } else if (error.status === 403) {
          this.$message.error('你没有执行该操作的权限。')
        } else {
          this.$message.error(error.message || '操作失败，请重试。')
        }
      } finally {
        this.confirmingId = null
      }
    },
    statusLabel(status) { return statusLabels[status] || status },
    statusTagType(status) { return statusTagTypes[status] || 'info' },
    actionStatusLabel(status) { return actionStatusLabels[status] || status },
    actionTagType(status) { return actionTagTypes[status] || 'info' },
    eventTypeLabel(type) { return { queued: '已排队', started: '已开始', planning: '规划中', action: '动作', completed: '完成', failed: '失败', cancelled: '已取消' }[type] || type },
    sourceLabel(type) { return type === 'expert_group' ? '专家团队' : '专家' },
    formatTime(value) {
      if (!value) return ''
      return new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
    }
  }
}
</script>
