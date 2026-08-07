<template>
  <section class="page-state" :class="`page-state--${type}`">
    <i :class="icon" />
    <h3>{{ title }}</h3>
    <p>{{ description }}</p>
    <el-button v-if="$listeners.retry" type="primary" size="small" @click="$emit('retry')">重试</el-button>
  </section>
</template>

<script>
export default {
  props: {
    type: { type: String, default: 'empty' },
    title: { type: String, required: true },
    description: { type: String, required: true }
  },
  computed: {
    icon() {
      return this.type === 'error' ? 'el-icon-warning-outline' : 'el-icon-folder-opened'
    }
  }
}
</script>
