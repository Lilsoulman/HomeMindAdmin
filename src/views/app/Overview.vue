<template>
  <section v-loading="loading" class="overview-page">
    <div v-if="loading" class="overview-page__loading"><i class="el-icon-loading" /> 正在加载家庭状态</div>
    <PageState v-else-if="error" type="error" title="家庭状态暂不可用" :description="error.message" @retry="load" />
    <template v-else>
      <section class="overview-intro">
        <div><p class="eyebrow">家庭空间</p><h1>家庭状态</h1><p>{{ formatTime(bootstrap.generatedAt) || '刚刚' }} 更新；状态来源为开发期模拟家庭数据。</p></div>
        <el-tag type="warning" effect="plain">开发期模拟数据</el-tag>
      </section>
      <section class="surface-panel mock-notice" aria-live="polite"><i class="el-icon-info" /><span>{{ bootstrap.disclaimer }}</span></section>
      <section class="metric-grid" aria-label="家庭摘要">
        <article v-for="metric in metrics" :key="metric.label" class="metric-card"><p>{{ metric.label }}</p><strong>{{ metric.value }}</strong><span :class="metric.tone">{{ metric.detail }}</span></article>
      </section>
      <section class="overview-grid">
        <article class="surface-panel surface-panel--priority">
          <header class="panel-heading"><div><p class="eyebrow">家庭状态</p><h2>空间概览</h2></div><router-link to="/app/devices">管理设备 <i class="el-icon-right" /></router-link></header>
          <el-empty v-if="!bootstrap.spaces.length" description="Core 尚未返回可展示的空间。" />
          <ul v-else class="state-list"><li v-for="space in bootstrap.spaces" :key="space.id"><div><strong>{{ space.name }}</strong><p>{{ space.summary || '暂无摘要' }}</p></div><span>{{ space.deviceCount }} 台设备</span></li></ul>
        </article>
        <article class="surface-panel">
          <header class="panel-heading"><div><p class="eyebrow">设备健康</p><h2>健康摘要</h2></div></header>
          <div class="health-summary"><div><strong>{{ bootstrap.deviceHealth.healthy }}</strong><span>健康</span></div><div><strong>{{ bootstrap.deviceHealth.degraded }}</strong><span>降级</span></div><div><strong>{{ bootstrap.deviceHealth.offline }}</strong><span>离线</span></div><div><strong>{{ bootstrap.deviceHealth.lowBattery }}</strong><span>低电量</span></div></div>
        </article>
        <article class="surface-panel">
          <header class="panel-heading"><div><p class="eyebrow">状态来源</p><h2>家庭上下文</h2></div></header>
          <template v-if="household">
            <p class="context-value">{{ contextLabel }}</p><p class="context-meta">{{ household.devices.length }} 台家庭设备 · {{ household.members.length }} 位成员</p>
            <ul v-if="household.degradedReasons.length" class="degraded-list"><li v-for="reason in household.degradedReasons" :key="reason">{{ reasonLabel(reason) }}</li></ul>
          </template>
          <PageState v-else title="家庭上下文暂不可用" description="设备摘要仍可查看；家庭状态接口返回后会自动补充。" />
        </article>
      </section>
    </template>
  </section>
</template>

<script>
import { getHouseholdState } from '../../api/household'
import { getMockBootstrap } from '../../api/smartHome'
import PageState from '../../components/common/PageState.vue'

export default {
  components: { PageState },
  data() { return { loading: true, error: null, bootstrap: null, household: null, pageAlive: true } },
  computed: {
    metrics() {
      const health = this.bootstrap.deviceHealth
      return [
        { label: '设备总数', value: health.total, detail: '开发期样例', tone: 'metric-card__neutral' },
        { label: '健康设备', value: health.healthy, detail: '可继续关注状态', tone: 'metric-card__success' },
        { label: '需要关注', value: health.degraded + health.offline + health.lowBattery, detail: '降级、离线或低电量', tone: 'metric-card__warning' }
      ]
    },
    contextLabel() { return { Personal: '个人上下文', Family: '家庭上下文', Anonymous: '匿名上下文' }[this.household.context] || this.household.context }
  },
  created() { this.load() },
  unmounted() { this.pageAlive = false },
  methods: {
    async load() {
      this.loading = true
      this.error = null
      this.household = null
      try {
        this.bootstrap = await getMockBootstrap()
        const tenantId = this.$store.state.auth.tenantId
        if (tenantId) {
          try { this.household = await getHouseholdState({ homeId: tenantId }) } catch (error) { if (this.pageAlive) this.household = null }
        }
      } catch (error) {
        if (this.pageAlive) this.error = error
      } finally {
        if (this.pageAlive) this.loading = false
      }
    },
    formatTime(value) {
      if (!value) return ''
      return new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
    },
    reasonLabel(reason) {
      return { family_members_unavailable: '家庭成员数据暂不可用', spaces_unavailable: '空间数据暂不可用', devices_unavailable: '设备状态暂不可用', scene_health_unavailable: '场景健康暂不可用', member_identity_ambiguous: '成员身份存在歧义' }[reason] || reason
    }
  }
}
</script>
