<template>
  <section class="schedule-page" v-loading="loading">
    <section class="overview-intro">
      <div><p class="eyebrow">家庭空间 · 日程协同</p><h1>家庭日程协同</h1><p>汇总全体成员的日程，发现冲突和共同空档；证件提醒仅保存家庭展示名称和到期日。</p></div>
      <el-button v-if="canWrite" type="primary" size="small" @click="openDeadlineDialog">新增证件提醒</el-button>
    </section>
    <div v-if="loading" class="overview-page__loading"><i class="el-icon-loading" /> 正在加载家庭日程</div>
    <PageState v-else-if="error" type="error" :title="errorTitle" :description="error.message" @retry="load" />
    <template v-else>
      <section class="metric-grid">
        <article class="metric-card"><p>日程安排</p><strong>{{ events.length }}</strong><span class="metric-card__neutral">未来七天的家庭事件</span></article>
        <article class="metric-card"><p>时间冲突</p><strong>{{ conflicts.length }}</strong><span :class="conflicts.length ? 'metric-card__warning' : 'metric-card__success'">{{ conflicts.length ? '建议协调安排' : '暂无时间冲突' }}</span></article>
        <article class="metric-card"><p>到期提醒</p><strong>{{ reminders.length }}</strong><span :class="reminders.length ? 'metric-card__warning' : 'metric-card__success'">{{ reminders.length ? '请提前安排处理' : '近期暂无到期事项' }}</span></article>
      </section>

      <section class="schedule-toolbar surface-panel">
        <div><p class="eyebrow">协同窗口</p><strong>查看未来七天的家庭安排</strong></div>
        <div class="schedule-toolbar__actions"><el-select v-model="durationMinutes" size="small" @change="load"><el-option label="30 分钟空档" :value="30" /><el-option label="60 分钟空档" :value="60" /><el-option label="90 分钟空档" :value="90" /><el-option label="120 分钟空档" :value="120" /></el-select><el-button size="small" plain :loading="refreshing" @click="load">刷新</el-button></div>
      </section>

      <section class="schedule-grid">
        <article class="surface-panel schedule-panel--wide"><header class="panel-heading"><div><p class="eyebrow">家庭日历</p><h2>成员安排</h2></div><el-tag size="small" effect="plain">{{ events.length }} 项</el-tag></header>
          <PageState v-if="!events.length" title="未来七天暂无家庭日程" description="成员创建日历事项后，会在此汇总显示。" />
          <ul v-else class="schedule-list"><li v-for="event in events" :key="event.id"><el-tag size="mini" effect="plain">{{ event.memberName || '家庭成员' }}</el-tag><div><strong>{{ event.title }}</strong><p>{{ eventTime(event) }}</p></div></li></ul>
        </article>

        <article class="surface-panel"><header class="panel-heading"><div><p class="eyebrow">明日预览</p><h2>{{ formatDate(preview.date) }}</h2></div></header>
          <PageState v-if="!preview.events.length && !preview.reminders.length" title="明日暂无安排" description="明日事件与到期提醒会显示在这里。" />
          <ul v-else class="schedule-list"><li v-for="event in preview.events" :key="`tomorrow-event-${event.id}`"><el-tag size="mini" type="info" effect="plain">日程</el-tag><div><strong>{{ event.title }}</strong><p>{{ eventTime(event) }}</p></div></li><li v-for="item in preview.reminders" :key="`tomorrow-reminder-${item.type}-${item.sourceId}`"><el-tag size="mini" type="warning" effect="plain">到期</el-tag><div><strong>{{ item.title }}</strong><router-link v-if="item.confirmationId" :to="`/app/confirmations?focus=${item.confirmationId}`">查看确认卡</router-link></div></li></ul>
        </article>

        <article class="surface-panel"><header class="panel-heading"><div><p class="eyebrow">冲突发现</p><h2>需要协调</h2></div></header>
          <PageState v-if="!conflicts.length" title="暂无时间冲突" description="重叠的家庭成员日程会在此提示。" />
          <ul v-else class="schedule-list"><li v-for="(item, index) in conflicts" :key="`conflict-${index}`"><el-tag size="mini" type="warning" effect="plain">冲突</el-tag><div><strong>{{ item.first.title }} · {{ item.second.title }}</strong><p>{{ formatDateTime(item.overlapStartAt) }} 至 {{ formatTime(item.overlapEndAt) }}</p></div></li></ul>
        </article>

        <article class="surface-panel"><header class="panel-heading"><div><p class="eyebrow">共同空档</p><h2>可安排时段</h2></div></header>
          <PageState v-if="!availability.length" title="暂无符合条件的空档" description="调整空档时长或待成员日程更新后再查看。" />
          <ul v-else class="schedule-list"><li v-for="(item, index) in availability" :key="`availability-${index}`"><el-tag size="mini" type="success" effect="plain">空闲</el-tag><div><strong>{{ formatDate(item.startAt) }}</strong><p>{{ formatTime(item.startAt) }} 至 {{ formatTime(item.endAt) }}</p></div></li></ul>
        </article>

        <article class="surface-panel"><header class="panel-heading"><div><p class="eyebrow">主动提醒</p><h2>缴费与证件到期</h2></div><router-link to="/app/confirmations">确认中心 <i class="el-icon-right" /></router-link></header>
          <PageState v-if="!reminders.length" title="暂无近期提醒" description="缴费和证件临近到期时会在这里提醒。" />
          <ul v-else class="schedule-list"><li v-for="item in reminders" :key="`${item.type}-${item.sourceId}`"><el-tag size="mini" type="warning" effect="plain">{{ reminderLabel(item.type) }}</el-tag><div><strong>{{ item.title }}</strong><p>还有 {{ item.daysRemaining }} 天</p><router-link v-if="item.confirmationId" :to="`/app/confirmations?focus=${item.confirmationId}`">查看确认卡</router-link></div></li></ul>
        </article>

        <article class="surface-panel"><header class="panel-heading"><div><p class="eyebrow">证件到期</p><h2>家庭提醒记录</h2></div></header>
          <PageState v-if="!deadlines.length" title="暂无证件提醒" description="可添加展示名称和到期日期，不保存证件号码或原件。" />
          <ul v-else class="schedule-list"><li v-for="item in deadlines" :key="item.id"><el-tag size="mini" effect="plain">{{ documentLabel(item.documentType) }}</el-tag><div><strong>{{ item.displayName }}</strong><p>到期 {{ formatDate(item.expiresOn) }}<span v-if="item.holderName"> · {{ item.holderName }}</span></p></div></li></ul>
        </article>
      </section>
    </template>

    <AppDialog v-model="deadlineDialog.visible" title="新增证件到期提醒" width="440px" :close-on-click-modal="false">
      <p class="schedule-hint">仅填写家庭内展示名称和到期日期；请勿填写证件号码、照片链接或证件原文。</p><el-form label-width="90px" size="small"><el-form-item label="证件类型" required><el-select v-model="deadlineDialog.documentType" style="width: 100%"><el-option label="身份证" value="identity_card" /><el-option label="护照" value="passport" /><el-option label="驾驶证" value="driver_license" /><el-option label="居住证" value="residence_permit" /><el-option label="其他" value="other" /></el-select></el-form-item><el-form-item label="展示名称" required><el-input v-model="deadlineDialog.displayName" maxlength="128" placeholder="如：小王的护照续期" /></el-form-item><el-form-item label="到期日" required><el-date-picker v-model="deadlineDialog.expiresOn" type="date" value-format="yyyy-MM-dd" style="width: 100%" /></el-form-item></el-form>
      <template #footer><el-button size="small" @click="deadlineDialog.visible = false">取消</el-button><el-button size="small" type="primary" :loading="deadlineDialog.submitting" :disabled="!deadlineDialog.displayName.trim() || !deadlineDialog.expiresOn" @click="createDeadline">保存</el-button></template>
    </AppDialog>
  </section>
</template>

<script>
import { createDocumentDeadline, getTomorrowSchedulePreview, listDocumentDeadlines, listScheduleAvailability, listScheduleConflicts, listScheduleEvents, listScheduleReminders } from '../../api/schedule'
import { hasPermission } from '../../utils/permission'
import PageState from '../../components/common/PageState.vue'

export default {
  components: { PageState },
  data() { return { loading: true, refreshing: false, error: null, durationMinutes: 60, events: [], conflicts: [], availability: [], deadlines: [], reminders: [], preview: this.emptyPreview(), deadlineDialog: this.emptyDeadlineDialog() } },
  computed: { homeId() { return this.$store.state.auth.tenantId }, canWrite() { return hasPermission(this.$store.state.auth.role, 'calendar.write') }, errorTitle() { return this.error && this.error.status === 403 ? '暂无家庭日程访问权限' : '家庭日程暂不可用' } },
  created() { this.load() },
  methods: {
    emptyPreview() { return { date: null, events: [], conflicts: [], reminders: [] } },
    emptyDeadlineDialog() { return { visible: false, documentType: 'passport', displayName: '', expiresOn: null, submitting: false } },
    windowParams() { const start = new Date(); start.setHours(0, 0, 0, 0); const end = new Date(start); end.setDate(end.getDate() + 7); return { from: start.toISOString(), to: end.toISOString() } },
    async load() { if (this.refreshing) return; this.refreshing = true; this.error = null; try { const window = this.windowParams(); const [events, conflicts, availability, deadlines, reminders, preview] = await Promise.all([listScheduleEvents({ homeId: this.homeId, ...window }), listScheduleConflicts({ homeId: this.homeId, ...window }), listScheduleAvailability({ homeId: this.homeId, ...window, durationMinutes: this.durationMinutes }), listDocumentDeadlines({ homeId: this.homeId }), listScheduleReminders({ homeId: this.homeId }), getTomorrowSchedulePreview({ homeId: this.homeId })]); this.events = events; this.conflicts = conflicts; this.availability = availability; this.deadlines = deadlines; this.reminders = reminders; this.preview = preview } catch (error) { this.error = error } finally { this.loading = false; this.refreshing = false } },
    openDeadlineDialog() { this.deadlineDialog = this.emptyDeadlineDialog(); this.deadlineDialog.visible = true },
    async createDeadline() { if (this.deadlineDialog.submitting || !this.deadlineDialog.displayName.trim() || !this.deadlineDialog.expiresOn) return; this.deadlineDialog.submitting = true; try { await createDocumentDeadline({ homeId: this.homeId, ...this.deadlineDialog, displayName: this.deadlineDialog.displayName.trim() }); this.deadlineDialog.visible = false; await this.load(); this.$message.success('证件到期提醒已保存') } catch (error) { this.$message.error(error.message) } finally { this.deadlineDialog.submitting = false } },
    reminderLabel(type) { return type === 'billing' ? '缴费' : type === 'document' ? '证件' : '提醒' },
    documentLabel(type) { return { identity_card: '身份证', passport: '护照', driver_license: '驾驶证', residence_permit: '居住证', other: '其他' }[type] || '证件' },
    eventTime(event) { return event.allDay ? `${formatDateValue(event.startAt)} 全天` : `${this.formatDateTime(event.startAt)} 至 ${event.endAt ? this.formatTime(event.endAt) : '待定'}` },
    formatDate(value) { return formatDateValue(value) },
    formatDateTime(value) { return value ? new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—' },
    formatTime(value) { return value ? new Intl.DateTimeFormat('zh-CN', { timeStyle: 'short' }).format(new Date(value)) : '—' }
  }
}

function formatDateValue(value) { return value ? new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium' }).format(new Date(value)) : '—' }
</script>

<style scoped>
.schedule-toolbar { align-items: center; display: flex; justify-content: space-between; margin-bottom: 20px; min-height: auto; }.schedule-toolbar p { margin-bottom: 4px; }.schedule-toolbar__actions { display: flex; gap: 10px; }.schedule-toolbar__actions .el-select { width: 142px; }.schedule-grid { display: grid; gap: 20px; grid-template-columns: repeat(2, minmax(0, 1fr)); }.schedule-panel--wide { grid-row: span 2; }.schedule-list { list-style: none; margin: 0; padding: 0; }.schedule-list li { align-items: flex-start; border-top: 1px solid var(--nm-line); display: flex; gap: 10px; padding: 13px 0; }.schedule-list li:first-child { border-top: 0; padding-top: 0; }.schedule-list strong { font-weight: 600; }.schedule-list p, .schedule-hint { color: var(--nm-muted); font-size: 13px; margin: 5px 0 0; }.schedule-list a { display: inline-block; font-size: 12px; margin-top: 5px; }.schedule-hint { margin-bottom: 16px; }
@media (max-width: 900px) { .schedule-grid { grid-template-columns: 1fr; }.schedule-panel--wide { grid-row: auto; } }
@media (max-width: 680px) { .schedule-toolbar { align-items: stretch; flex-direction: column; gap: 12px; }.schedule-toolbar__actions { justify-content: space-between; } }
</style>
