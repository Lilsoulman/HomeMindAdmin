<template>
  <section class="connections-page">
    <div v-if="loading" class="overview-page__loading"><i class="el-icon-loading" /> 正在加载我的连接</div>
    <PageState v-else-if="error" type="error" :title="errorTitle" :description="error.message" @retry="load" />

    <template v-else>
      <section class="overview-intro">
        <div>
          <p class="eyebrow">个人空间</p>
          <h1>我的连接</h1>
          <p>家庭已授权的服务连接。此处不显示任何凭据、地址或内部信息。</p>
        </div>
        <el-button v-if="canAuthorize" type="primary" @click="openDialog">添加个人连接</el-button>
      </section>

      <section class="surface-panel connections-panel">
        <PageState v-if="!items.length" title="暂无连接" description="家庭管理员配置连接后，已授权给你的服务会显示在这里。" />
        <ul v-else class="connection-list">
          <li v-for="item in items" :key="item.connectorId">
            <div class="connection-list__head">
              <strong>{{ item.name }}</strong>
              <div class="connection-list__actions">
                <el-button v-if="canRevoke(item)" size="mini" type="text" @click="revoke(item)">撤销</el-button>
                <el-button v-if="canReauthorize(item)" size="mini" type="text" @click="startAuthorization(item.providerCode)">重新授权</el-button>
                <el-tag :type="statusTagType(item.status)" effect="plain" size="small">{{ statusLabel(item.status) }}</el-tag>
              </div>
            </div>
            <p>{{ item.providerName }}</p>
            <div class="connection-list__meta">
              <span>授权：{{ authStatusLabel(item) }}</span>
              <span>最后同步：{{ formatTime(item.lastSyncAt) || '—' }}</span>
              <span>健康检查：{{ formatTime(item.lastHealthAt) || '—' }}</span>
            </div>
            <p v-if="authHint(item)" class="connection-list__hint">{{ authHint(item) }}</p>
          </li>
        </ul>
      </section>

      <el-dialog title="添加个人连接" :visible.sync="dialogVisible" width="520px" :close-on-click-modal="false">
        <div class="provider-grid">
          <button
            v-for="provider in providers"
            :key="provider.id"
            type="button"
            class="provider-card"
            :class="{ 'provider-card--selected': selectedProviderId === provider.id }"
            @click="selectedProviderId = provider.id"
          >
            <strong>{{ provider.name }}</strong>
            <p>{{ provider.description || '个人级服务连接' }}</p>
            <span>{{ typeLabel(provider.connectorType) }}</span>
          </button>
        </div>
        <span slot="footer">
          <el-button :disabled="submitting" @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="submitting" :disabled="!selectedProvider" @click="confirmAdd">前往授权</el-button>
        </span>
      </el-dialog>
    </template>
  </section>
</template>

<script>
import { getMyConnections, listProviders, revokePersonalAuthorization, startPersonalAuthorization } from '../../api/connector'
import { hasPermission } from '../../utils/permission'
import PageState from '../../components/common/PageState.vue'

const statusLabels = { connected: '已连接', disconnected: '未连接', error: '异常' }
const statusTagTypes = { connected: 'success', disconnected: 'info', error: 'danger' }

export default {
  components: { PageState },
  data() {
    return {
      loading: true,
      error: null,
      items: [],
      pageAlive: true,
      dialogVisible: false,
      providers: [],
      selectedProviderId: null,
      submitting: false
    }
  },
  computed: {
    errorTitle() {
      return this.error && this.error.status === 403 ? '暂无连接查看权限' : '连接暂不可用'
    },
    canAuthorize() {
      return hasPermission(this.$store.state.auth.role, 'connector.authorize')
    },
    selectedProvider() {
      return this.providers.find((provider) => provider.id === this.selectedProviderId) || null
    }
  },
  created() {
    this.load()
  },
  destroyed() {
    this.pageAlive = false
  },
  methods: {
    async load() {
      this.loading = true
      this.error = null
      try {
        this.items = await getMyConnections()
      } catch (error) {
        if (this.pageAlive) this.error = error
      } finally {
        if (this.pageAlive) this.loading = false
      }
    },
    authStatusLabel(item) {
      if (item.lastSessionStatus === 'pending' && item.lastSessionExpiresAt && new Date(item.lastSessionExpiresAt) > new Date()) {
        return '等待完成授权'
      }
      return { connected: '已授权', pending: '授权中', revoked: '已撤销', expired: '已过期' }[item.authStatus] || item.authStatus || '—'
    },
    authHint(item) {
      if (item.lastSessionStatus === 'pending' && item.lastSessionExpiresAt && new Date(item.lastSessionExpiresAt) > new Date()) {
        return '请在授权页面完成该连接的授权流程。'
      }
      if (item.lastSessionStatus === 'revoked' || item.authStatus === 'revoked') {
        return '该连接授权已撤销，可点击重新授权。'
      }
      return ''
    },
    statusLabel(status) { return statusLabels[status] || status },
    statusTagType(status) { return statusTagTypes[status] || 'info' },
    formatTime(value) {
      if (!value) return ''
      return new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
    },
    canRevoke(item) {
      return this.canAuthorize && item.lastSessionId && item.authStatus !== 'revoked'
    },
    canReauthorize(item) {
      return this.canAuthorize && item.authStatus === 'revoked'
    },
    openDialog() {
      this.dialogVisible = true
      this.selectedProviderId = null
      if (!this.providers.length) this.loadProviders()
    },
    async loadProviders() {
      try {
        this.providers = await listProviders()
      } catch (error) {
        this.$message.error(error.message || 'Provider 目录暂不可用，请重试。')
      }
    },
    async confirmAdd() {
      if (!this.selectedProvider) return
      this.submitting = true
      try {
        await this.startAuthorization(this.selectedProvider.code)
        this.dialogVisible = false
      } finally {
        this.submitting = false
      }
    },
    async startAuthorization(providerCode) {
      try {
        const session = await startPersonalAuthorization({
          providerCode,
          redirectUri: `${window.location.origin}/oauth/callback`
        })
        window.sessionStorage.setItem('oauthSessionId', String(session.sessionId))
        window.location.href = session.authorizationUrl
      } catch (error) {
        if (error.status === 503) {
          this.$message.error(error.message || '安全凭据托管尚未启用（Secret Vault），暂无法发起个人授权。')
        } else if (error.status === 422) {
          this.$message.error(error.message || '回调地址不在服务端白名单内，请联系管理员配置。')
        } else {
          this.$message.error(error.message || '发起授权失败，请重试。')
        }
      }
    },
    revoke(item) {
      this.$confirm('撤销后将断开该个人连接并终止凭据可用性，是否继续？', '撤销授权', {
        confirmButtonText: '撤销',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(async () => {
        try {
          await revokePersonalAuthorization({ id: item.lastSessionId })
          this.$message.success('授权已撤销。')
          this.load()
        } catch (error) {
          this.$message.error(error.message || '撤销失败，请重试。')
        }
      }).catch(() => {})
    },
    typeLabel(type) {
      return { smart_home: '智能家居', calendar: '日历', productivity: '效率工具' }[type] || type
    }
  }
}
</script>
