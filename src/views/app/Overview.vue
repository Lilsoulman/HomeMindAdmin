<template>
  <section class="overview-page">
    <div v-if="loading" class="overview-page__loading"><i class="el-icon-loading" /> 正在加载家庭状态</div>
    <PageState v-else-if="error" type="error" title="家庭状态暂不可用" :description="error.message" @retry="load" />
    <template v-else>
      <section class="overview-intro">
        <div>
          <p class="eyebrow">家庭空间</p>
          <h1>{{ homeName }}</h1>
          <p>{{ generatedAt }} 更新。先处理需要确认的事项，再查看家庭状态。</p>
        </div>
        <el-tag :type="hasPartialFailure ? 'warning' : 'success'" effect="plain">{{ hasPartialFailure ? '部分数据暂不可用' : '数据同步正常' }}</el-tag>
      </section>

      <section class="metric-grid" aria-label="家庭摘要">
        <article v-for="metric in metrics" :key="metric.label" class="metric-card">
          <p>{{ metric.label }}</p>
          <strong>{{ metric.value }}</strong>
          <span :class="metric.tone">{{ metric.detail }}</span>
        </article>
      </section>

      <section class="overview-grid">
        <article class="surface-panel surface-panel--priority">
          <header class="panel-heading">
            <div>
              <p class="eyebrow">优先处理</p>
              <h2>待确认事项</h2>
            </div>
            <router-link to="/app/confirmations">查看全部 <i class="el-icon-right" /></router-link>
          </header>
          <PageState v-if="!confirmations.length" title="暂无待确认事项" description="新的建议需要你的确认时会出现在这里。" />
          <ul v-else class="confirmation-list">
            <li v-for="item in confirmations" :key="item.id">
              <span class="risk-badge" :class="`risk-badge--${item.riskLevel}`">{{ item.riskLevel }}</span>
              <div>
                <strong>{{ item.title }}</strong>
                <p>{{ item.impactSummary || '请查看影响范围后决定。' }}</p>
              </div>
              <time>{{ formatTime(item.expiresAt) }}</time>
            </li>
          </ul>
        </article>

        <article class="surface-panel">
          <header class="panel-heading">
            <div>
              <p class="eyebrow">家庭状态</p>
              <h2>设备健康</h2>
            </div>
          </header>
          <div class="health-summary">
            <div><strong>{{ homeData.onlineDeviceCount }}</strong><span>在线</span></div>
            <div><strong>{{ homeData.offlineDeviceCount }}</strong><span>离线</span></div>
            <div><strong>{{ homeData.degradedDeviceCount }}</strong><span>需关注</span></div>
          </div>
        </article>

        <article class="surface-panel">
          <header class="panel-heading">
            <div>
              <p class="eyebrow">最新进展</p>
              <h2>管家动态</h2>
            </div>
            <router-link to="/app/activities">全部动态 <i class="el-icon-right" /></router-link>
          </header>
          <PageState v-if="!activities.length" title="暂时没有动态" description="已完成的建议和家庭变更会在这里显示。" />
          <ul v-else class="activity-list">
            <li v-for="item in activities" :key="item.id">
              <span class="activity-dot" />
              <div><strong>{{ item.title }}</strong><p>{{ item.resultSummary || item.status }}</p></div>
              <time>{{ formatTime(item.createdAt) }}</time>
            </li>
          </ul>
        </article>
      </section>
    </template>
  </section>
</template>

<script>
import { getDashboard } from '../../api/dashboard'
import PageState from '../../components/common/PageState.vue'

export default {
  components: { PageState },
  data() {
    return { loading: true, error: null, dashboard: {} }
  },
  computed: {
    homeData() { return this.dashboard.home && this.dashboard.home.data ? this.dashboard.home.data : {} },
    homeName() { return this.homeData.name || '我的家庭' },
    confirmations() { return (this.dashboard.confirmations && this.dashboard.confirmations.data) || [] },
    activities() { return (this.dashboard.activities && this.dashboard.activities.data) || [] },
    hasPartialFailure() { return Boolean(this.dashboard.partialFailure) },
    generatedAt() { return this.formatTime(this.dashboard.generatedAt) || '刚刚' },
    metrics() {
      return [
        { label: '待确认', value: this.confirmations.length, detail: '需要你的决定', tone: 'metric-card__warning' },
        { label: '在线设备', value: this.homeData.onlineDeviceCount || 0, detail: '家庭设备', tone: 'metric-card__success' },
        { label: '待办事项', value: ((this.dashboard.todos || {}).data || []).length, detail: '今天计划', tone: 'metric-card__neutral' }
      ]
    }
  },
  created() { this.load() },
  methods: {
    async load() {
      this.loading = true
      this.error = null
      try {
        this.dashboard = await getDashboard()
      } catch (error) {
        this.error = error
      } finally {
        this.loading = false
      }
    },
    formatTime(value) {
      if (!value) return ''
      return new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
    }
  }
}
</script>
