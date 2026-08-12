<template>
  <MainLayout :items="items" area="家庭空间" />
</template>

<script>
import MainLayout from './MainLayout.vue'

export default {
  components: { MainLayout },
  data() {
    return {
      items: [
        { index: '/app/overview', label: '家庭概览', icon: 'el-icon-data-analysis', permission: 'smart_home.read' },
        { index: '/app/confirmations', label: '确认中心', icon: 'el-icon-finished', permission: 'confirmation.read' },
        { index: '/app/activities', label: '管家动态', icon: 'el-icon-time', permission: 'steward.activity.read' },
        { index: '/app/family', label: '家庭成员与知识', icon: 'el-icon-user', permission: 'family.read' },
        { index: '/app/life/favorites', label: '我的偏好', icon: 'el-icon-star-off', permission: 'life.favorite.read' },
        { index: '/app/connections', label: '我的连接', icon: 'el-icon-connection', permission: 'connector.read' },
        { index: '/app/experts', label: '我的专家', icon: 'el-icon-magic-stick', permission: 'ai.read' },
        { index: '/app/media/quick-edit', label: '快速剪辑', icon: 'el-icon-video-camera', permission: 'media.read' },
        { index: '/app/connections/xhs', label: '小红书工作台', icon: 'el-icon-edit-outline', permission: 'connector.read' }
      ]
    }
  }
}
</script>
