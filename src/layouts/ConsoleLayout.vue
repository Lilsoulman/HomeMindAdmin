<template>
  <MainLayout :items="items" area="开发控制台" />
</template>

<script>
import MainLayout from './MainLayout.vue'

export default {
  components: { MainLayout },
  data() {
    return {
      items: [
        { index: '/console/setup', label: '首次部署', icon: 'el-icon-setting', permission: 'connector.write' },
        { index: '/console/connectors', label: '家庭连接器', icon: 'el-icon-connection', permission: 'connector.read' },
        { index: '/console/authorizations', label: '成员授权', icon: 'el-icon-key', permission: 'connector.write' },
        { index: '/console/automations', label: '自动化', icon: 'el-icon-magic-stick', permission: 'automation.read' },
        { index: '/console/experts', label: '专家与 Skill', icon: 'el-icon-cpu', permission: 'ai.read' },
        { index: '/console/audit', label: '家庭审计', icon: 'el-icon-notebook-2', permission: 'family.read' }
      ]
    }
  }
}
</script>
