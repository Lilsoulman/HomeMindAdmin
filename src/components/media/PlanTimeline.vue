<template>
  <div class="plan-timeline">
    <ul v-if="segments.length" class="plan-timeline__segments">
      <li v-for="segment in segments" :key="segment.index" class="plan-timeline__segment">
        <span class="plan-timeline__badge">{{ segment.index }}</span>
        <div class="plan-timeline__info">
          <strong>{{ segment.source }}</strong>
          <p>片段时长 {{ segment.duration }} 秒</p>
        </div>
      </li>
    </ul>
    <p v-else class="plan-timeline__empty">暂无方案数据。</p>
    <p v-if="totalDuration" class="plan-timeline__total">总时长约 {{ totalDuration }} 秒</p>
  </div>
</template>

<script>
export default {
  name: 'PlanTimeline',
  props: {
    plan: { type: Object, default: () => ({ segments: [], audio: null, totalDuration: null }) }
  },
  computed: {
    segments() {
      return Array.isArray(this.plan && this.plan.segments) ? this.plan.segments : []
    },
    totalDuration() {
      return this.plan && this.plan.totalDuration
    }
  }
}
</script>
