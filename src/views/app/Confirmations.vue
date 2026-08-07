<template>
  <section class="confirmations-page">
    <div v-if="loading" class="overview-page__loading"><i class="el-icon-loading" /> 正在加载确认事项</div>
    <PageState v-else-if="error" type="error" :title="errorTitle" :description="error.message" @retry="load" />

    <template v-else>
      <section class="overview-intro">
        <div>
          <p class="eyebrow">家庭空间</p>
          <h1>确认中心</h1>
          <p>低风险事项可批量确认，中高风险事项始终逐项决定。</p>
        </div>
      </section>

      <section class="surface-panel confirmations-panel">
        <div class="confirmations-toolbar">
          <el-select v-model="riskLevel" placeholder="全部风险" size="small" @change="load">
            <el-option v-for="level in riskLevels" :key="level.value" :label="level.label" :value="level.value" />
          </el-select>
          <el-select v-model="status" placeholder="全部状态" size="small" @change="load">
            <el-option v-for="item in statuses" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
          <el-button
            v-if="batchEnabled && selectedIds.length"
            size="small"
            type="primary"
            :loading="batchSubmitting"
            :disabled="batchSubmitting"
            @click="batchConfirm"
          >
            批量确认（{{ selectedIds.length }}）
          </el-button>
        </div>

        <PageState v-if="!items.length" title="暂无确认事项" description="当前筛选条件下没有需要处理的事项。" />
        <el-table v-else v-loading="refreshing" :data="items" @selection-change="onSelectionChange">
          <el-table-column v-if="batchEnabled" type="selection" width="44" />
          <el-table-column label="事项" min-width="220">
            <template #default="{ row }">
              <div class="confirmation-cell">
                <span class="risk-badge" :class="`risk-badge--${row.riskLevel}`">{{ row.riskLevel }}</span>
                <div>
                  <strong>{{ row.title }}</strong>
                  <p>{{ row.impactSummary || row.description || '暂无影响范围描述。' }}</p>
                  <p v-if="row.suggestedAction" class="confirmation-cell__action">建议：{{ row.suggestedAction }}</p>
                </div>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="90">
            <template #default="{ row }">
              <el-tag :type="statusTagType(row.status)" effect="plain" size="small">{{ statusLabel(row.status) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="过期时间" width="110">
            <template #default="{ row }">{{ formatTime(row.expiresAt) || '—' }}</template>
          </el-table-column>
          <el-table-column v-if="hasPending" label="操作" width="150" align="right">
            <template #default="{ row }">
              <template v-if="row.status === 'pending'">
                <el-button
                  size="mini"
                  type="primary"
                  :loading="isSubmitting(row.id, 'confirm')"
                  :disabled="isSubmitting(row.id)"
                  @click="confirmOne(row)"
                >
                  确认
                </el-button>
                <el-button
                  size="mini"
                  :loading="isSubmitting(row.id, 'deny')"
                  :disabled="isSubmitting(row.id)"
                  @click="openDeny(row)"
                >
                  拒绝
                </el-button>
              </template>
            </template>
          </el-table-column>
        </el-table>
      </section>

      <el-dialog title="拒绝确认事项" :visible.sync="denyDialog.visible" width="440px" :close-on-click-modal="false">
        <p class="deny-dialog__hint">请说明拒绝原因（1-512 字符），将写入家庭审计记录。</p>
        <el-input
          v-model="denyDialog.reason"
          type="textarea"
          :rows="4"
          maxlength="512"
          show-word-limit
          placeholder="例如：当前时段不适合执行，请改天再试。"
        />
        <span slot="footer">
          <el-button size="small" @click="denyDialog.visible = false">取消</el-button>
          <el-button
            size="small"
            type="primary"
            :loading="denyDialog.submitting"
            :disabled="denyDialog.submitting || !denyDialog.reason.trim()"
            @click="denyOne"
          >确认拒绝</el-button>
        </span>
      </el-dialog>
    </template>
  </section>
</template>

<script>
import { batchConfirmConfirmations, confirmConfirmation, denyConfirmation, listConfirmations } from '../../api/confirmation'
import { createIdempotencyKey } from '../../utils/idempotency'
import PageState from '../../components/common/PageState.vue'

const statusLabels = {
  pending: '待确认',
  confirmed: '已确认',
  denied: '已拒绝',
  expired: '已过期',
  cancelled: '已取消'
}

const statusTagTypes = {
  pending: 'warning',
  confirmed: 'success',
  denied: 'danger',
  expired: 'info',
  cancelled: 'info'
}

export default {
  components: { PageState },
  data() {
    return {
      loading: true,
      refreshing: false,
      error: null,
      riskLevel: '',
      status: 'pending',
      items: [],
      submitting: new Map(),
      batchSubmitting: false,
      selectedIds: [],
      denyDialog: { visible: false, item: null, reason: '', submitting: false },
      pageAlive: true
    }
  },
  computed: {
    riskLevels() {
      return [
        { value: '', label: '全部风险' },
        { value: 'L1', label: 'L1 低风险' },
        { value: 'L2', label: 'L2 中风险' },
        { value: 'L3', label: 'L3 高风险' }
      ]
    },
    statuses() {
      return [
        { value: 'pending', label: '待确认' },
        { value: 'confirmed', label: '已确认' },
        { value: 'denied', label: '已拒绝' },
        { value: 'expired', label: '已过期' },
        { value: 'cancelled', label: '已取消' }
      ]
    },
    // 仅 L1 + pending 视图允许批量勾选（同家庭未过期 pending 由服务端复核）
    batchEnabled() {
      return this.riskLevel === 'L1' && this.status === 'pending'
    },
    hasPending() {
      return this.items.some((item) => item.status === 'pending')
    },
    errorTitle() {
      return this.error && this.error.status === 403 ? '暂无确认中心权限' : '确认事项暂不可用'
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
        await this.fetchItems()
      } catch (error) {
        if (this.pageAlive) this.error = error
      } finally {
        if (this.pageAlive) this.loading = false
      }
    },
    async fetchItems() {
      const homeId = this.homeId
      const items = await listConfirmations({ homeId, riskLevel: this.riskLevel, status: this.status })
      if (this.pageAlive) this.items = items
      return items
    },
    homeId() {
      return this.$store.state.auth.tenantId
    },
    isSubmitting(id, action) {
      return this.submitting.has(id) && (action ? this.submitting.get(id) === action : true)
    },
    async confirmOne(row) {
      this.submitting.set(row.id, 'confirm')
      try {
        await confirmConfirmation({ homeId: this.homeId, id: row.id, idempotencyKey: createIdempotencyKey() })
        this.$message.success(`已确认：${row.title}`)
        await this.reloadAfterChange()
      } catch (error) {
        this.handleWriteError(error)
      } finally {
        this.submitting.delete(row.id)
      }
    },
    openDeny(row) {
      this.denyDialog = { visible: true, item: row, reason: '', submitting: false }
    },
    async denyOne() {
      const reason = this.denyDialog.reason.trim()
      if (reason.length < 1 || reason.length > 512) return
      this.denyDialog.submitting = true
      try {
        await denyConfirmation({ homeId: this.homeId, id: this.denyDialog.item.id, reason })
        this.denyDialog.visible = false
        this.$message.success('已拒绝该事项。')
        await this.reloadAfterChange()
      } catch (error) {
        this.handleWriteError(error)
      } finally {
        this.denyDialog.submitting = false
      }
    },
    async batchConfirm() {
      if (!this.selectedIds.length) return
      this.batchSubmitting = true
      try {
        const result = await batchConfirmConfirmations({
          homeId: this.homeId,
          ids: this.selectedIds,
          idempotencyKey: createIdempotencyKey()
        })
        this.$message.success(`已批量确认 ${result.confirmedCount} 项。`)
        await this.reloadAfterChange()
      } catch (error) {
        this.handleWriteError(error)
      } finally {
        this.batchSubmitting = false
      }
    },
    onSelectionChange(rows) {
      this.selectedIds = rows.map((row) => row.id)
    },
    async reloadAfterChange() {
      try {
        await this.fetchItems()
      } catch (error) {
        this.handleWriteError(error)
      }
    },
    handleWriteError(error) {
      if (!this.pageAlive) return
      if (error.status === 409) {
        this.$message.warning((error.message || '该事项状态已变化，请查看最新状态。') + '（已刷新）')
        this.fetchItems()
      } else if (error.status === 422) {
        this.$message.error(error.message || '提交内容不符合要求。')
      } else if (error.status === 403) {
        this.$message.error('你没有执行该操作的权限。')
      } else {
        this.$message.error(error.message || '操作失败，请重试。')
      }
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
