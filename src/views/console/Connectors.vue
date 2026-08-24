<template>
  <section class="connectors-page">
    <div v-if="loading" class="overview-page__loading"><i class="el-icon-loading" /> 正在加载家庭连接器</div>
    <PageState v-else-if="error" type="error" :title="errorTitle" :description="error.message" @retry="load" />

    <template v-else>
      <section class="overview-intro">
        <div>
          <p class="eyebrow">开发控制台</p>
          <h1>家庭连接器</h1>
          <p>管理家庭级服务连接。凭据由服务端安全托管，浏览器不接触任何令牌。</p>
        </div>
        <el-button v-if="canWrite" type="primary" @click="$router.push('/console/setup')">新建连接器</el-button>
      </section>

      <section class="surface-panel connectors-panel">
        <PageState v-if="!items.length" title="暂无连接器" description="首次使用时请先完成部署向导。" />
        <el-table v-else :data="items" class="connectors-table" @row-click="openDetail">
          <el-table-column label="名称" min-width="180">
            <template #default="{ row }">
              <div class="connector-cell">
                <strong>{{ row.name }}</strong>
                <p>{{ row.providerName }}</p>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="statusTagType(row.status)" effect="plain" size="small">{{ statusLabel(row.status) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="范围" width="90">
            <template #default="{ row }">
              <el-tag size="small" effect="plain">{{ row.bindingScope === 'personal' ? '个人' : '家庭' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="健康检查" width="150">
            <template #default="{ row }">{{ formatTime(row.lastHealthAt) || '—' }}</template>
          </el-table-column>
          <el-table-column label="最后同步" width="150">
            <template #default="{ row }">{{ formatTime(row.lastSyncAt) || '—' }}</template>
          </el-table-column>
          <el-table-column label="操作" width="90" align="right">
            <template #default="{ row }">
              <el-button size="mini" type="text" @click.stop="openDetail(row)">详情</el-button>
            </template>
          </el-table-column>
        </el-table>
      </section>
    </template>
  </section>
</template>

<script>
import { listConnectors } from '../../api/connector'
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
      pageAlive: true
    }
  },
  computed: {
    canWrite() {
      return hasPermission(this.$store.state.auth.role, 'connector.write')
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
  },
  methods: {
    async load() {
      this.loading = true
      this.error = null
      try {
        this.items = await listConnectors()
      } catch (error) {
        if (this.pageAlive) this.error = error
      } finally {
        if (this.pageAlive) this.loading = false
      }
    },
    openDetail(row) {
      this.$router.push(`/console/connectors/${row.id}`)
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
