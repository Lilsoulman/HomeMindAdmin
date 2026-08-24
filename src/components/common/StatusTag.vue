<template>
  <el-tag :type="tagType" effect="plain" :size="size"><slot>{{ label }}</slot></el-tag>
</template>

<script>
const typeByStatus = { healthy: 'success', online: 'success', active: 'success', completed: 'success', degraded: 'warning', low_battery: 'warning', pending: 'warning', offline: 'danger', failed: 'danger', error: 'danger' }

export default {
  props: {
    status: { type: String, default: '' },
    label: { type: String, default: '' },
    size: { type: String, default: 'small' }
  },
  computed: {
    tagType() { return typeByStatus[this.status] || 'info' }
  }
}
</script>
