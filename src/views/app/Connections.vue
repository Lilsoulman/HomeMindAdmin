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
      </section>

      <section class="surface-panel connections-panel">
        <PageState v-if="!items.length" title="暂无连接" description="家庭管理员配置连接后，已授权给你的服务会显示在这里。" />
        <ul v-else class="connection-list">
          <li v-for="item in items" :key="item.connectorId">
            <div class="connection-list__head">
              <strong>{{ item.name }}</strong>
              <el-tag :type="statusTagType(item.status)" effect="plain" size="small">{{ statusLabel(item.status) }}</el-tag>
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
    </template>
  </section>
</template>

<script>
import { getMyConnections } from '../../api/connector'
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
      pageAlive: true
    }
  },
  computed: {
    errorTitle() {
      return this.error && this.error.status === 403 ? '暂无连接查看权限' : '连接暂不可用'
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
        return '该连接授权已撤销；重新授权入口将在个人 OAuth 服务发布后开放。'
      }
      return ''
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
