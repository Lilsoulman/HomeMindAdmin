<template>
  <section class="activities-page">
    <div v-if="loading" class="overview-page__loading"><i class="el-icon-loading" /> 正在加载管家动态</div>
    <PageState v-else-if="error" type="error" :title="errorTitle" :description="error.message" @retry="load" />

    <template v-else>
      <section class="overview-intro">
        <div>
          <p class="eyebrow">家庭空间</p>
          <h1>管家动态</h1>
          <p>已完成的动态可撤销时，会提供撤销入口。</p>
        </div>
      </section>

      <section class="surface-panel activities-panel">
        <PageState v-if="!items.length" title="暂无管家动态" description="已完成的建议和家庭变更会在这里显示。" />
        <template v-else>
          <ul class="activity-detail-list">
            <li v-for="item in items" :key="item.id">
              <span class="activity-dot" />
              <div class="activity-detail-list__body">
                <div class="activity-detail-list__head">
                  <strong>{{ item.title }}</strong>
                  <el-tag :type="statusTagType(item.status)" effect="plain" size="small">{{ statusLabel(item.status) }}</el-tag>
                </div>
                <p>{{ item.resultSummary || item.description || '暂无结果摘要。' }}</p>
                <div class="activity-detail-list__meta">
                  <span>{{ categoryLabel(item.category) }}</span>
                  <span v-if="item.riskLevel" class="risk-badge" :class="`risk-badge--${item.riskLevel}`">{{ item.riskLevel }}</span>
                  <time>{{ formatTime(item.createdAt) }}</time>
                </div>
              </div>
              <div class="activity-detail-list__actions">
                <el-button size="mini" @click="openDetail(item)">详情</el-button>
                <el-button
                  v-if="canUndo(item)"
                  size="mini"
                  type="danger"
                  plain
                  :loading="isUndoing(item.id)"
                  :disabled="isUndoing(item.id)"
                  @click="confirmUndo(item)"
                >
                  撤销
                </el-button>
              </div>
            </li>
          </ul>

          <div v-if="hasMore" class="activities-panel__more">
            <el-button size="small" :loading="loadingMore" @click="loadMore">加载更多</el-button>
          </div>
        </template>
      </section>

      <AppDialog v-model="detailDialog.visible" title="动态详情" width="520px">
        <div v-if="detailDialog.loading" class="overview-page__loading"><i class="el-icon-loading" /> 正在加载</div>
        <PageState v-else-if="detailDialog.error" type="error" title="详情暂不可用" :description="detailDialog.error.message" @retry="openDetail(detailDialog.item)" />
        <dl v-else-if="detailDialog.detail" class="activity-detail-dl">
          <div><dt>标题</dt><dd>{{ detailDialog.detail.title }}</dd></div>
          <div><dt>分类</dt><dd>{{ categoryLabel(detailDialog.detail.category) }}</dd></div>
          <div><dt>状态</dt><dd>{{ statusLabel(detailDialog.detail.status) }}</dd></div>
          <div v-if="detailDialog.detail.riskLevel"><dt>风险</dt><dd>{{ detailDialog.detail.riskLevel }}</dd></div>
          <div v-if="detailDialog.detail.description"><dt>说明</dt><dd>{{ detailDialog.detail.description }}</dd></div>
          <div v-if="detailDialog.detail.resultSummary"><dt>结果</dt><dd>{{ detailDialog.detail.resultSummary }}</dd></div>
          <div><dt>创建时间</dt><dd>{{ formatTime(detailDialog.detail.createdAt) }}</dd></div>
          <div v-if="detailDialog.detail.undoneAt"><dt>撤销时间</dt><dd>{{ formatTime(detailDialog.detail.undoneAt) }}</dd></div>
        </dl>
        <span slot="footer">
          <el-button
            v-if="detailDialog.detail.runId"
            size="small"
            type="primary"
            plain
            @click="$router.push(`/app/runs/${detailDialog.detail.runId}`)"
          >查看运行详情</el-button>
          <el-button size="small" @click="detailDialog.visible = false">关闭</el-button>
        </span>
      </AppDialog>
    </template>
  </section>
</template>

<script>
import { getActivity, listActivities, undoActivity } from '../../api/activity'
import PageState from '../../components/common/PageState.vue'

const statusLabels = {
  pending: '待处理',
  confirmed: '已确认',
  cancelled: '已取消',
  completed: '已完成',
  failed: '失败'
}

const statusTagTypes = {
  pending: 'warning',
  confirmed: 'info',
  cancelled: 'info',
  completed: 'success',
  failed: 'danger'
}

export default {
  components: { PageState },
  data() {
    return {
      loading: true,
      error: null,
      items: [],
      cursor: null,
      loadingMore: false,
      undoing: new Set(),
      detailDialog: { visible: false, item: null, detail: null, loading: false, error: null },
      pageAlive: true
    }
  },
  computed: {
    homeId() {
      return this.$store.state.auth.tenantId
    },
    hasMore() {
      return Boolean(this.cursor)
    },
    errorTitle() {
      return this.error && this.error.status === 403 ? '暂无管家动态权限' : '管家动态暂不可用'
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
      this.items = []
      this.cursor = null
      try {
        await this.fetchPage(null)
      } catch (error) {
        if (this.pageAlive) this.error = error
      } finally {
        if (this.pageAlive) this.loading = false
      }
    },
    async fetchPage(cursor) {
      const page = await listActivities({ homeId: this.homeId, cursor })
      if (!this.pageAlive) return page
      this.items = cursor ? this.items.concat(page.items) : page.items
      this.cursor = page.cursor
      return page
    },
    async loadMore() {
      if (!this.cursor || this.loadingMore) return
      this.loadingMore = true
      try {
        await this.fetchPage(this.cursor)
      } catch (error) {
        this.$message.error(error.message || '加载更多失败，请重试。')
      } finally {
        this.loadingMore = false
      }
    },
    canUndo(item) {
      return item.undoable && item.status === 'completed' && !item.undoneAt
    },
    isUndoing(id) {
      return this.undoing.has(id)
    },
    confirmUndo(item) {
      this.$confirm('撤销后将回滚该动态对应的本地状态并写入审计，是否继续？', '撤销动态', {
        confirmButtonText: '撤销',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => this.undo(item)).catch(() => {})
    },
    async undo(item) {
      this.undoing.add(item.id)
      try {
        const updated = await undoActivity({ homeId: this.homeId, id: item.id })
        this.$message.success('已撤销该动态。')
        this.items = this.items.map((entry) => (entry.id === updated.id ? updated : entry))
      } catch (error) {
        if (error.status === 409) {
          this.$message.warning((error.message || '该动态已撤销。') + '（已刷新）')
          this.refreshItem(item.id)
        } else if (error.status === 422) {
          this.$message.error(error.message || '该动态当前不可撤销。')
        } else if (error.status === 403) {
          this.$message.error('你没有执行该操作的权限。')
        } else {
          this.$message.error(error.message || '撤销失败，请重试。')
        }
      } finally {
        this.undoing.delete(item.id)
      }
    },
    async refreshItem(id) {
      try {
        const updated = await getActivity({ homeId: this.homeId, id })
        this.items = this.items.map((entry) => (entry.id === updated.id ? updated : entry))
      } catch (error) {
        this.$message.error(error.message || '刷新动态失败。')
      }
    },
    async openDetail(item) {
      this.detailDialog = { visible: true, item, detail: null, loading: true, error: null }
      try {
        this.detailDialog.detail = await getActivity({ homeId: this.homeId, id: item.id })
      } catch (error) {
        if (this.pageAlive) this.detailDialog.error = error
      } finally {
        if (this.pageAlive) this.detailDialog.loading = false
      }
    },
    statusLabel(status) { return statusLabels[status] || status },
    statusTagType(status) { return statusTagTypes[status] || 'info' },
    categoryLabel(category) {
      if (!category) return '动态'
      return { reporting: '报告', action: '操作', confirmation: '确认', reminder: '提醒', system: '系统' }[category] || category
    },
    formatTime(value) {
      if (!value) return ''
      return new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
    }
  }
}
</script>
