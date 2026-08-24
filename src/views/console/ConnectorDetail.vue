<template>
  <section class="connector-detail-page">
    <div v-if="loading" class="overview-page__loading"><i class="el-icon-loading" /> 正在加载连接器</div>
    <PageState v-else-if="error" type="error" :title="errorTitle" :description="error.message" @retry="load" />

    <template v-else-if="connector">
      <section class="overview-intro">
        <div>
          <p class="eyebrow">开发控制台</p>
          <h1>{{ connector.name }}</h1>
          <p>{{ connector.providerName }} · 不显示任何凭据或内部地址。</p>
        </div>
        <el-button @click="$router.push('/console/connectors')">返回列表</el-button>
      </section>

      <section class="surface-panel connector-detail-panel">
        <dl class="connector-detail-dl">
          <div><dt>状态</dt><dd><el-tag :type="statusTagType(connector.status)" effect="plain" size="small">{{ statusLabel(connector.status) }}</el-tag></dd></div>
          <div><dt>Provider</dt><dd>{{ connector.providerName }}</dd></div>
          <div><dt>范围</dt><dd>{{ connector.bindingScope === 'personal' ? '个人' : '家庭' }}</dd></div>
          <div><dt>健康检查</dt><dd>{{ formatTime(connector.lastHealthAt) || '—' }}</dd></div>
          <div><dt>最后同步</dt><dd>{{ formatTime(connector.lastSyncAt) || '—' }}</dd></div>
          <div v-if="myAuthorization"><dt>我的范围</dt><dd>{{ myAuthorization.scopes.join('、') || '未授权' }}</dd></div>
        </dl>

        <div v-if="canWrite" class="connector-actions">
          <el-button size="small" :loading="acting === 'test'" :disabled="acting !== null" @click="runAction('test')">测试连接</el-button>
          <el-button size="small" :loading="acting === 'discovery'" :disabled="acting !== null" @click="runAction('discovery')">设备发现</el-button>
          <el-button size="small" type="primary" :loading="acting === 'sync' || syncRunning" :disabled="acting !== null || syncRunning" @click="startSync">同步状态</el-button>
        </div>
        <div v-if="syncJob" class="connector-sync-status">
          同步任务：<el-tag :type="syncTagType(syncJob.status)" size="small" effect="plain">{{ syncStatusLabel(syncJob.status) }}</el-tag>
          <span v-if="syncJob.status === 'queued' || syncJob.status === 'running'">（自动轮询中…）</span>
          <span v-else-if="syncJob.status === 'failed'">{{ syncJob.reason }}</span>
        </div>
      </section>

      <section v-if="canWrite" class="surface-panel connector-auth-panel">
        <header class="panel-heading">
          <div><p class="eyebrow">家庭授权</p><h2>成员范围配置</h2></div>
          <p class="connector-auth-hint">为成员授予 1-32 个范围；保存即替换其全部现有范围。</p>
        </header>

        <PageState v-if="membersError" type="error" title="成员列表暂不可用" :description="membersError.message" @retry="loadMembers" />
        <template v-else>
          <PageState v-if="!members.length" title="暂无成员" description="成员列表加载后将在这里配置授权。" />
          <ul v-else class="member-auth-list">
            <li v-for="member in members" :key="member.userId">
              <div class="member-auth-list__info">
                <strong>{{ member.displayName }}</strong>
                <el-tag size="small" effect="plain">{{ roleLabel(member.role) }}</el-tag>
                <span>{{ member.status === 'active' ? '已启用' : '已停用' }}</span>
              </div>
              <div class="member-auth-list__form">
                <el-input
                  v-model="scopeTexts[member.userId]"
                  size="small"
                  placeholder="范围以逗号分隔，例如 smart_home.read, smart_home.light.write"
                  :disabled="member.status !== 'active'"
                />
                <el-button
                  size="small"
                  type="primary"
                  :loading="savingUserId === member.userId"
                  :disabled="savingUserId !== null || member.status !== 'active'"
                  @click="saveAuthorization(member)"
                >
                  保存
                </el-button>
              </div>
            </li>
          </ul>
        </template>
      </section>
    </template>
  </section>
</template>

<script>
import { discoverConnector, getMyAuthorization, getSyncJob, listConnectors, syncConnector, testConnector, updateMemberAuthorization } from '../../api/connector'
import { listTenantMembers } from '../../api/tenant'
import { hasPermission } from '../../utils/permission'
import PageState from '../../components/common/PageState.vue'

const statusLabels = { connected: '已连接', disconnected: '未连接', error: '异常' }
const statusTagTypes = { connected: 'success', disconnected: 'info', error: 'danger' }
const syncLabels = { queued: '排队中', running: '运行中', completed: '已完成', failed: '失败' }

export default {
  components: { PageState },
  props: {
    pollInterval: { type: Number, default: 2000 }
  },
  data() {
    return {
      loading: true,
      error: null,
      connector: null,
      myAuthorization: null,
      acting: null,
      syncJob: null,
      syncTimer: null,
      members: [],
      membersError: null,
      scopeTexts: {},
      savingUserId: null,
      pageAlive: true
    }
  },
  computed: {
    connectorId() {
      return Number(this.$route.params.id)
    },
    canWrite() {
      return hasPermission(this.$store.state.auth.role, 'connector.write')
    },
    syncRunning() {
      return this.syncJob && (this.syncJob.status === 'queued' || this.syncJob.status === 'running')
    },
    errorTitle() {
      return this.error && this.error.status === 403 ? '暂无连接器权限' : '连接器暂不可用'
    }
  },
  created() {
    this.load()
  },
  unmounted() {
    this.pageAlive = false
    this.stopSyncPolling()
  },
  methods: {
    async load() {
      this.loading = true
      this.error = null
      try {
        const items = await listConnectors()
        this.connector = items.find((item) => item.id === this.connectorId) || null
        if (!this.connector) {
          this.error = { status: 404, message: '连接器不存在或无权访问。' }
          return
        }
        this.loadMyAuthorization()
        if (this.canWrite) this.loadMembers()
      } catch (error) {
        if (this.pageAlive) this.error = error
      } finally {
        if (this.pageAlive) this.loading = false
      }
    },
    async loadMyAuthorization() {
      try {
        this.myAuthorization = await getMyAuthorization({ id: this.connectorId })
      } catch (error) {
        this.myAuthorization = null
      }
    },
    async loadMembers() {
      this.membersError = null
      try {
        this.members = await listTenantMembers({ homeId: this.$store.state.auth.tenantId })
        this.members.forEach((member) => {
          if (this.scopeTexts[member.userId] === undefined) this.scopeTexts[member.userId] = ''
        })
      } catch (error) {
        if (this.pageAlive) this.membersError = error
      }
    },
    async runAction(action) {
      this.acting = action
      try {
        let result
        if (action === 'test') result = await testConnector({ id: this.connectorId })
        else result = await discoverConnector({ id: this.connectorId })
        this.$message.success(`${action === 'test' ? '连接测试' : '设备发现'}完成：${this.statusLabel(result.status)}，设备 ${result.deviceCount} 台。`)
        this.connector = { ...this.connector, status: result.status, lastHealthAt: result.lastHealthAt, lastSyncAt: result.lastSyncAt }
      } catch (error) {
        this.handleOperationError(error)
      } finally {
        this.acting = null
      }
    },
    async startSync() {
      this.acting = 'sync'
      try {
        this.syncJob = await syncConnector({ id: this.connectorId })
        this.$message.success('同步任务已提交。')
        this.pollSyncJob()
      } catch (error) {
        this.handleOperationError(error)
      } finally {
        this.acting = null
      }
    },
    pollSyncJob() {
      this.stopSyncPolling()
      this.syncTimer = setInterval(async () => {
        if (!this.pageAlive) { this.stopSyncPolling(); return }
        try {
          const job = await getSyncJob({ jobId: this.syncJob.id })
          this.syncJob = job
          if (job.status === 'completed') {
            this.stopSyncPolling()
            this.$message.success('同步完成。')
            this.load()
          } else if (job.status === 'failed') {
            this.stopSyncPolling()
            this.$message.error(job.reason || '同步失败，请稍后重试。')
          }
        } catch (error) {
          this.stopSyncPolling()
          this.$message.error(error.message || '查询同步任务失败。')
        }
      }, this.pollInterval)
    },
    stopSyncPolling() {
      if (this.syncTimer) {
        clearInterval(this.syncTimer)
        this.syncTimer = null
      }
    },
    async saveAuthorization(member) {
      const scopes = (this.scopeTexts[member.userId] || '')
        .split(',')
        .map((scope) => scope.trim())
        .filter((scope) => scope && scope.length <= 128)
      if (!scopes.length) {
        this.$message.warning('请至少填写一个范围。')
        return
      }
      this.savingUserId = member.userId
      try {
        await updateMemberAuthorization({ id: this.connectorId, memberUserId: member.userId, scopes })
        this.$message.success(`已更新「${member.displayName}」的授权范围。`)
      } catch (error) {
        this.handleOperationError(error)
      } finally {
        this.savingUserId = null
      }
    },
    handleOperationError(error) {
      if (!this.pageAlive) return
      if (error.status === 502) {
        this.$message.error('目标服务不可达或拒绝了请求，请检查配置后重试。')
      } else if (error.status === 503) {
        this.$message.error(error.message || '安全凭据托管暂不可用。')
      } else if (error.status === 422) {
        this.$message.error(error.message || '提交内容不符合要求。')
      } else if (error.status === 403) {
        this.$message.error('你没有执行该操作的权限。')
      } else {
        this.$message.error(error.message || '操作失败，请重试。')
      }
    },
    roleLabel(role) { return { owner: '户主', admin: '管理员', member: '成员', viewer: '只读' }[role] || role },
    statusLabel(status) { return statusLabels[status] || status },
    statusTagType(status) { return statusTagTypes[status] || 'info' },
    syncStatusLabel(status) { return syncLabels[status] || status },
    syncTagType(status) { return status === 'completed' ? 'success' : status === 'failed' ? 'danger' : 'warning' },
    formatTime(value) {
      if (!value) return ''
      return new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
    }
  }
}
</script>
