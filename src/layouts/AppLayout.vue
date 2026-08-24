<template>
  <MainLayout :items="items" area="家庭控制" />
</template>

<script>
import MainLayout from './MainLayout.vue'

export default {
  components: { MainLayout },
  data() {
    return {
      items: [
        { index: '/app/dashboard', label: '仪表盘', icon: 'el-icon-data-analysis', permission: 'smart_home.read' },
        { index: '/app/devices', label: '设备管理', icon: 'el-icon-setting', permission: 'smart_home.read' },
        { index: '/app/scenes', label: '场景配置', icon: 'el-icon-magic-stick', permission: 'smart_home.read' },
        { index: '/app/memories', label: '记忆管理', icon: 'el-icon-collection-tag', permission: 'memory.read' },
        { index: '/app/settings', label: '系统设置', icon: 'el-icon-tools', permission: 'smart_home.write' }
      ]
    }
  }
}
</script>
