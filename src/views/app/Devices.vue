<template>
  <section v-loading="loading" class="devices-page">
    <div v-if="loading" class="overview-page__loading"><i class="el-icon-loading" /> 正在加载设备目录</div>
    <PageState v-else-if="error" type="error" title="设备目录暂不可用" :description="error.message" @retry="load" />
    <template v-else>
      <section class="overview-intro">
        <div><p class="eyebrow">家庭空间</p><h1>设备管理</h1><p>仅展示 Core 归一化设备信息，不显示 Home Assistant 地址、令牌或原始实体标识。</p></div>
        <el-tag type="warning" effect="plain">开发期模拟数据</el-tag>
      </section>
      <section class="surface-panel mock-notice"><i class="el-icon-info" /><span>{{ bootstrap.disclaimer }}</span></section>
      <section class="surface-panel devices-toolbar">
        <div><p class="eyebrow">设备范围</p><strong>{{ filteredDevices.length }} / {{ bootstrap.devices.length }} 台设备</strong></div>
        <el-select v-model="spaceFilter" clearable placeholder="全部空间" size="small" aria-label="按空间筛选">
          <el-option v-for="space in bootstrap.spaces" :key="space.id" :label="space.name" :value="String(space.id)" />
        </el-select>
      </section>
      <section class="surface-panel devices-panel">
        <el-empty v-if="!filteredDevices.length" description="当前筛选条件下没有可展示的设备。" />
        <el-table v-else :data="filteredDevices" stripe class="devices-table" aria-label="设备列表">
          <el-table-column prop="name" label="设备" min-width="180" />
          <el-table-column label="空间" min-width="120"><template #default="scope">{{ spaceName(scope.row.spaceId) }}</template></el-table-column>
          <el-table-column label="状态" min-width="120"><template #default="scope"><StatusTag :status="scope.row.onlineStatus">{{ onlineLabel(scope.row.onlineStatus) }}</StatusTag></template></el-table-column>
          <el-table-column label="健康" min-width="120"><template #default="scope"><StatusTag :status="scope.row.healthStatus">{{ healthLabel(scope.row.healthStatus) }}</StatusTag></template></el-table-column>
          <el-table-column label="最近摘要" min-width="240"><template #default="scope"><span>{{ scope.row.stateSummary || '暂无状态摘要' }}</span><small v-if="scope.row.stateUpdatedAt">{{ formatTime(scope.row.stateUpdatedAt) }}</small></template></el-table-column>
        </el-table>
      </section>
    </template>
  </section>
</template>

<script>
import { getMockBootstrap } from '../../api/smartHome'
import PageState from '../../components/common/PageState.vue'
import StatusTag from '../../components/common/StatusTag.vue'

export default {
  components: { PageState, StatusTag },
  data() { return { loading: true, error: null, bootstrap: null, spaceFilter: '', pageAlive: true } },
  computed: {
    filteredDevices() {
      if (!this.bootstrap) return []
      return this.spaceFilter ? this.bootstrap.devices.filter((device) => String(device.spaceId) === this.spaceFilter) : this.bootstrap.devices
    }
  },
  created() { this.load() },
  unmounted() { this.pageAlive = false },
  methods: {
    async load() {
      this.loading = true
      this.error = null
      try { this.bootstrap = await getMockBootstrap() } catch (error) { if (this.pageAlive) this.error = error } finally { if (this.pageAlive) this.loading = false }
    },
    spaceName(spaceId) { return (this.bootstrap.spaces.find((space) => space.id === spaceId) || {}).name || '未分组' },
    onlineLabel(status) { return { online: '在线', offline: '离线' }[status] || status || '未知' },
    healthLabel(status) { return { healthy: '健康', degraded: '降级', offline: '离线', low_battery: '低电量' }[status] || '未知' },
    formatTime(value) {
      if (!value) return ''
      return new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
    }
  }
}
</script>
