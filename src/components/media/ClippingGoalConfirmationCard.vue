<template>
  <article class="clipping-goal-confirmation" aria-live="polite">
    <div class="clipping-goal-confirmation__body">
      <p class="eyebrow">一句话解析</p>
      <h2>{{ confirmation.title || '已理解' }}</h2>
      <p v-if="confirmation.summary" class="clipping-goal-confirmation__summary">{{ confirmation.summary }}</p>
      <ul v-if="confirmation.parameters.length" class="clipping-goal-confirmation__parameters">
        <li v-for="parameter in confirmation.parameters" :key="parameter">{{ parameter }}</li>
      </ul>
    </div>
    <div class="clipping-goal-confirmation__actions">
      <el-button size="small" :disabled="confirming" @click="$emit('edit')">修改需求</el-button>
      <el-button type="primary" size="small" :loading="confirming" @click="$emit('confirm')">确认并生成方案</el-button>
    </div>
  </article>
</template>

<script>
export default {
  name: 'ClippingGoalConfirmationCard',
  props: {
    confirmation: {
      type: Object,
      required: true
    },
    confirming: {
      type: Boolean,
      default: false
    }
  },
  emits: ['edit', 'confirm']
}
</script>
