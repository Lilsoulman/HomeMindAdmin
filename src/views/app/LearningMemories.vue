<template>
  <section class="learning-memories-page">
    <section class="overview-intro"><div><p class="eyebrow">AI 学习</p><h1>学习记忆库</h1><p>展示已审核并可被 AI 召回的记忆，不展示完整会话、证据或提示词。</p></div></section>
    <section class="surface-panel memory-panel">
      <div class="memory-panel__filters"><el-select v-model="filters.scope" size="small" @change="load"><el-option label="全部可见记忆" value="all" /><el-option label="我的记忆" value="personal" /><el-option label="家庭记忆" value="family" /></el-select><el-select v-model="filters.kind" clearable placeholder="全部类型" size="small" @change="load"><el-option label="偏好" value="preference" /><el-option label="事实" value="fact" /><el-option label="决策" value="decision" /></el-select><el-select v-model="filters.status" clearable placeholder="全部状态" size="small" @change="load"><el-option label="可召回" value="active" /><el-option label="已归档" value="archived" /><el-option label="已失效" value="expired" /></el-select><el-input v-model="filters.query" clearable size="small" placeholder="搜索摘要" @keyup.enter.native="load"><i slot="prefix" class="el-icon-search" /></el-input><el-button size="small" @click="load">查询</el-button></div>
      <div v-if="loading" class="overview-page__loading"><i class="el-icon-loading" /> 正在加载学习记忆</div>
      <PageState v-else-if="error" type="error" :title="errorTitle" :description="error.message" @retry="load" />
      <PageState v-else-if="!items.length" title="暂无已学习记忆" description="审核通过的记忆会在这里出现；待审核内容请前往家庭成员与知识页处理。" />
      <template v-else><ul class="memory-list"><li v-for="item in items" :key="item.id" class="memory-card"><div class="memory-card__head"><strong>{{ item.summary }}</strong><el-tag size="mini" effect="plain" :type="statusType(item.status)">{{ statusLabel(item.status) }}</el-tag></div><div class="memory-card__meta"><el-tag size="mini">{{ kindLabel(item.kind) }}</el-tag><el-tag size="mini" type="info">{{ visibilityLabel(item.visibility) }}</el-tag><span>稳定性 {{ percent(item.stability) }}</span><time>学习于 {{ formatTime(item.learnedAt) }}</time></div><p v-if="item.resolutionSummary">{{ item.resolutionSummary }}</p><div class="memory-card__sources"><span v-if="item.restrictedReferenceCount">含 {{ item.restrictedReferenceCount }} 项受限引用</span><el-button v-for="source in item.sourceReferences" :key="`${source.type}-${source.id}`" type="text" size="mini" @click="openSource(source)">查看来源运行</el-button></div></li></ul><div v-if="cursor" class="activities-panel__more"><el-button size="small" :loading="loadingMore" @click="loadMore">加载更多</el-button></div></template>
    </section>
  </section>
</template>

<script>
import { listLearningMemories } from '../../api/memory'
import PageState from '../../components/common/PageState.vue'

export default {
  components: { PageState },
  data() { return { loading: true, loadingMore: false, error: null, items: [], cursor: null, pageAlive: true, filters: { scope: 'all', kind: '', status: '', query: '' } } },
  computed: { errorTitle() { return this.error && this.error.status === 403 ? '暂无学习记忆权限' : '学习记忆暂不可用' } },
  created() { this.load() },
  unmounted() { this.pageAlive = false },
  methods: {
    async load() { this.loading = true; this.error = null; this.items = []; this.cursor = null; try { await this.fetchPage(null) } catch (error) { if (this.pageAlive) this.error = error } finally { if (this.pageAlive) this.loading = false } },
    async fetchPage(cursor) { const page = await listLearningMemories({ ...this.filters, cursor }); if (!this.pageAlive) return; this.items = cursor ? this.items.concat(page.items) : page.items; this.cursor = page.cursor },
    async loadMore() { if (!this.cursor || this.loadingMore) return; this.loadingMore = true; try { await this.fetchPage(this.cursor) } catch (error) { this.$message.error(error.message || '加载更多失败，请重试。') } finally { this.loadingMore = false } },
    openSource(source) { if (source.type === 'run') this.$router.push(`/app/runs/${source.id}`) },
    percent(value) { return `${Math.round(Number(value || 0) * 100)}%` },
    kindLabel(value) { return ({ preference: '偏好', fact: '事实', decision: '决策' })[value] || value },
    visibilityLabel(value) { return value === 'family' ? '家庭可见' : '仅自己' },
    statusLabel(value) { return ({ active: '可召回', archived: '已归档', expired: '已失效' })[value] || value },
    statusType(value) { return value === 'active' ? 'success' : value === 'expired' ? 'info' : 'warning' },
    formatTime(value) { return value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '未知时间' }
  }
}
</script>

<style scoped>
.memory-panel__filters { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 18px; }
.memory-panel__filters .el-select { width: 142px; }
.memory-panel__filters .el-input { width: 220px; }
.memory-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; }
.memory-card { border: 1px solid var(--border-color, #ebeef5); border-radius: 10px; padding: 16px; }
.memory-card__head, .memory-card__meta, .memory-card__sources { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.memory-card__head { justify-content: space-between; }
.memory-card__meta, .memory-card__sources { color: #909399; font-size: 13px; margin-top: 10px; }
.memory-card p { margin: 10px 0 0; color: #606266; }
@media (max-width: 700px) { .memory-panel__filters .el-select, .memory-panel__filters .el-input { width: 100%; } }
</style>
