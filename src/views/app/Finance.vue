<template>
  <section class="finance-page">
    <section class="overview-intro">
      <div>
        <p class="eyebrow">家庭空间 · 财务</p>
        <h1>家庭财务工作台</h1>
        <p>导入本地账单，看清近期支出；缴费仅登记已完成记录，不会发起支付。</p>
      </div>
      <el-tag effect="plain" type="info">家庭数据隔离</el-tag>
    </section>

    <div v-if="loading" class="overview-page__loading"><i class="el-icon-loading" /> 正在加载财务数据</div>
    <PageState v-else-if="error" type="error" :title="errorTitle" :description="error.message" @retry="load" />
    <template v-else>
      <section class="metric-grid">
        <article class="metric-card"><p>分析窗口支出</p><strong>{{ money(summary.totalAmount) }}</strong><span class="metric-card__neutral">{{ summary.transactionCount }} 笔流水</span></article>
        <article class="metric-card"><p>缴费账户</p><strong>{{ accounts.length }}</strong><span class="metric-card__neutral">按下一到期日排序</span></article>
        <article class="metric-card"><p>待关注提醒</p><strong>{{ reminders.length }}</strong><span :class="reminders.length ? 'metric-card__warning' : 'metric-card__success'">{{ reminders.length ? '建议查看确认中心' : '暂无近期到期' }}</span></article>
      </section>

      <section class="finance-grid">
        <article class="surface-panel">
          <header class="panel-heading"><div><p class="eyebrow">支出分析</p><h2>流水与汇总</h2></div></header>
          <div class="finance-toolbar">
            <el-date-picker v-model="filters.from" type="date" value-format="yyyy-MM-dd" size="small" placeholder="开始日期" @change="reloadTransactions" />
            <el-date-picker v-model="filters.to" type="date" value-format="yyyy-MM-dd" size="small" placeholder="结束日期" @change="reloadTransactions" />
            <el-select v-model="filters.category" size="small" clearable placeholder="全部分类" @change="reloadTransactions"><el-option v-for="item in categories" :key="item" :label="item" :value="item" /></el-select>
          </div>
          <div class="finance-summary"><span>总额 <strong>{{ money(summary.totalAmount) }}</strong></span><span>分类数 <strong>{{ summary.categories.length }}</strong></span></div>
          <PageState v-if="!transactions.length" title="暂无账单流水" description="导入本地 CSV 后，家庭支出会显示在这里。" />
          <ul v-else class="finance-list">
            <li v-for="item in transactions" :key="item.id"><div><strong>{{ item.merchant }}</strong><p>{{ item.category }} · {{ formatDate(item.transactionDate) }}</p></div><span class="finance-amount">{{ money(item.amount, item.currency) }}</span></li>
          </ul>
          <div v-if="summary.suggestions.length" class="finance-suggestions"><p class="eyebrow">省钱建议（仅供确认）</p><p v-for="item in summary.suggestions" :key="item">{{ item }}</p></div>
        </article>

        <article class="surface-panel">
          <header class="panel-heading"><div><p class="eyebrow">本地导入</p><h2>CSV 账单</h2></div></header>
          <p class="finance-hint">只提交结构化 CSV 文本；不会上传原始票据、账户号码或凭据。</p>
          <input ref="csvFile" class="finance-file" type="file" accept=".csv,text/csv" @change="readCsvFile">
          <el-input v-model="csv" type="textarea" :rows="7" placeholder="date,merchant,amount,currency,category,notes\n2026-08-01,超市,120,CNY,日用" />
          <p v-if="csvRows.length" class="finance-preview">预览 {{ csvRows.length }} 行：{{ csvRows.slice(0, 3).join('；') }}<span v-if="csvRows.length > 3"> 等</span></p>
          <div class="finance-actions"><el-button size="small" :disabled="!canWrite || !csv.trim()" :loading="importing" type="primary" @click="importCsv">导入账单</el-button><span v-if="!canWrite" class="finance-hint">当前角色仅可查看</span></div>
          <el-alert v-if="importResult" type="success" :closable="false" :title="`导入完成：新增 ${importResult.imported} 行，跳过 ${importResult.skipped} 行`" />
        </article>

        <article class="surface-panel">
          <header class="panel-heading"><div><p class="eyebrow">缴费日历</p><h2>缴费账户</h2></div><el-button v-if="canWrite" size="small" type="primary" @click="openAccount">新增账户</el-button></header>
          <PageState v-if="!accounts.length" title="暂无缴费账户" description="建立水电燃气等账户后，可在到期前查看提醒。" />
          <ul v-else class="finance-list">
            <li v-for="account in accounts" :key="account.id"><div><strong>{{ account.label }}</strong><p>{{ account.provider }} · {{ billingTypeLabel(account.billingType) }} · 下次到期 {{ formatDate(account.nextDueDate) }}</p></div><el-button v-if="canWrite" size="mini" plain @click="openPayment(account)">登记已缴</el-button></li>
          </ul>
        </article>

        <article class="surface-panel">
          <header class="panel-heading"><div><p class="eyebrow">到期提醒</p><h2>近期提醒</h2></div><router-link to="/app/confirmations">确认中心 <i class="el-icon-right" /></router-link></header>
          <PageState v-if="!reminders.length" title="暂无近期提醒" description="服务端会在提前 3 天或 1 天时生成站内提醒。" />
          <ul v-else class="finance-list"><li v-for="item in reminders" :key="`${item.billingAccountId}-${item.dueDate}`"><div><strong>{{ item.label }}</strong><p>{{ formatDate(item.dueDate) }} · 还有 {{ item.daysUntilDue }} 天</p></div><el-tag size="small" type="warning" effect="plain">{{ item.level === 'one_day' ? '提前1天' : '提前3天' }}</el-tag></li></ul>
        </article>

        <article class="surface-panel">
          <header class="panel-heading"><div><p class="eyebrow">年度趋势</p><h2>{{ trend.year || currentYear }} 年缴费</h2></div><el-select v-model="trendYear" size="small" style="width: 110px" @change="loadTrend"><el-option v-for="year in yearOptions" :key="year" :label="`${year} 年`" :value="year" /></el-select></header>
          <p class="trend-total">年度合计 <strong>{{ money(trend.totalAmount) }}</strong></p>
          <PageState v-if="!trend.months.length" title="暂无缴费趋势" description="登记已缴记录后会按月份聚合。" />
          <ul v-else class="trend-list"><li v-for="item in trend.months" :key="item.month"><span>{{ item.month }} 月</span><el-progress :percentage="trendPercent(item.amount)" :show-text="false" /><strong>{{ money(item.amount) }}</strong></li></ul>
        </article>
      </section>
    </template>

    <AppDialog v-model="accountDialog.visible" title="新增缴费账户" width="460px" :close-on-click-modal="false">
      <el-form label-width="92px" size="small"><el-form-item label="类型" required><el-select v-model="accountDialog.billingType" style="width: 100%"><el-option v-for="item in billingTypes" :key="item.value" :label="item.label" :value="item.value" /></el-select></el-form-item><el-form-item label="机构" required><el-input v-model="accountDialog.provider" maxlength="128" /></el-form-item><el-form-item label="家庭标签" required><el-input v-model="accountDialog.label" maxlength="128" /></el-form-item><el-form-item label="下次到期" required><el-date-picker v-model="accountDialog.nextDueDate" type="date" value-format="yyyy-MM-dd" style="width: 100%" /></el-form-item><el-form-item label="预计金额"><el-input-number v-model="accountDialog.expectedAmount" :min="0" :precision="2" /></el-form-item></el-form>
      <span slot="footer"><el-button size="small" @click="accountDialog.visible = false">取消</el-button><el-button size="small" type="primary" :loading="accountDialog.submitting" :disabled="!accountDialog.provider.trim() || !accountDialog.label.trim() || !accountDialog.nextDueDate" @click="createAccount">保存</el-button></span>
    </AppDialog>

    <AppDialog v-model="paymentDialog.visible" title="登记已完成缴费" width="420px" :close-on-click-modal="false">
      <p class="finance-hint">仅登记已完成的线下/第三方缴费，不会触发支付。</p><el-form label-width="82px" size="small"><el-form-item label="缴费金额" required><el-input-number v-model="paymentDialog.amount" :min="0.01" :precision="2" /></el-form-item><el-form-item label="到期日"><el-date-picker v-model="paymentDialog.dueDate" type="date" value-format="yyyy-MM-dd" style="width: 100%" /></el-form-item><el-form-item label="缴费日期"><el-date-picker v-model="paymentDialog.paidAt" type="date" value-format="yyyy-MM-dd" style="width: 100%" /></el-form-item></el-form>
      <span slot="footer"><el-button size="small" @click="paymentDialog.visible = false">取消</el-button><el-button size="small" type="primary" :loading="paymentDialog.submitting" :disabled="!paymentDialog.amount" @click="recordPayment">登记</el-button></span>
    </AppDialog>
  </section>
</template>

<script>
import { createBillingAccount, getBillingTrend, getFinanceSummary, importTransactions, listBillingAccounts, listBillingReminders, listTransactions, recordBillingPayment } from '../../api/finance'
import { hasPermission } from '../../utils/permission'
import PageState from '../../components/common/PageState.vue'

export default {
  components: { PageState },
  data() {
    return { loading: true, error: null, transactions: [], summary: { totalAmount: 0, transactionCount: 0, categories: [], suggestions: [] }, accounts: [], reminders: [], trend: { year: new Date().getFullYear(), totalAmount: 0, months: [] }, trendYear: new Date().getFullYear(), filters: { from: '', to: '', category: '' }, csv: '', importing: false, importResult: null, accountDialog: this.emptyAccountDialog(), paymentDialog: { visible: false, account: null, amount: null, dueDate: '', paidAt: '', submitting: false } }
  },
  computed: {
    homeId() { return this.$store.state.auth.tenantId },
    canWrite() { return hasPermission(this.$store.state.auth.role, 'finance.write') },
    errorTitle() { return this.error && this.error.status === 403 ? '暂无财务访问权限' : '财务数据暂不可用' },
    categories() { return Array.from(new Set(this.transactions.map((item) => item.category).filter(Boolean))) },
    csvRows() { return this.csv.split(/\r?\n/).slice(1).map((row) => row.trim()).filter(Boolean) },
    currentYear() { return new Date().getFullYear() },
    yearOptions() { return [this.currentYear - 1, this.currentYear, this.currentYear + 1] },
    billingTypes() { return [{ value: 'water', label: '水费' }, { value: 'electricity', label: '电费' }, { value: 'gas', label: '燃气费' }, { value: 'property', label: '物业费' }, { value: 'mobile', label: '话费' }, { value: 'insurance', label: '保险费' }, { value: 'other', label: '其他' }] }
  },
  created() { this.load() },
  methods: {
    emptyAccountDialog() { return { visible: false, billingType: 'water', provider: '', label: '', nextDueDate: '', expectedAmount: null, submitting: false } },
    async load() {
      this.loading = true; this.error = null
      try { await Promise.all([this.reloadTransactions(), this.loadAccounts(), this.loadReminders(), this.loadTrend()]) } catch (error) { this.error = error } finally { this.loading = false }
    },
    async reloadTransactions() { const [transactions, summary] = await Promise.all([listTransactions({ homeId: this.homeId, ...this.filters }), getFinanceSummary({ homeId: this.homeId, from: this.filters.from, to: this.filters.to })]); this.transactions = transactions; this.summary = summary },
    async loadAccounts() { this.accounts = await listBillingAccounts({ homeId: this.homeId }) },
    async loadReminders() { this.reminders = await listBillingReminders({ homeId: this.homeId }) },
    async loadTrend() { this.trend = await getBillingTrend({ homeId: this.homeId, year: this.trendYear }) },
    readCsvFile(event) { const file = event.target.files && event.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => { this.csv = String(reader.result || '') }; reader.readAsText(file) },
    async importCsv() { if (this.importing || !this.csv.trim()) return; this.importing = true; this.importResult = null; try { this.importResult = await importTransactions({ homeId: this.homeId, csv: this.csv }); await this.reloadTransactions(); this.$message.success('账单导入完成。') } catch (error) { this.$message.error(error.message) } finally { this.importing = false } },
    openAccount() { this.accountDialog = this.emptyAccountDialog(); this.accountDialog.visible = true },
    async createAccount() { if (this.accountDialog.submitting) return; this.accountDialog.submitting = true; try { await createBillingAccount({ homeId: this.homeId, billingType: this.accountDialog.billingType, provider: this.accountDialog.provider, label: this.accountDialog.label, nextDueDate: this.accountDialog.nextDueDate, expectedAmount: this.accountDialog.expectedAmount }); this.accountDialog.visible = false; await Promise.all([this.loadAccounts(), this.loadReminders()]); this.$message.success('缴费账户已建立。') } catch (error) { this.$message.error(error.message) } finally { this.accountDialog.submitting = false } },
    openPayment(account) { this.paymentDialog = { visible: true, account, amount: account.expectedAmount || null, dueDate: account.nextDueDate, paidAt: new Date().toISOString().slice(0, 10), submitting: false } },
    async recordPayment() { if (this.paymentDialog.submitting) return; this.paymentDialog.submitting = true; try { await recordBillingPayment({ homeId: this.homeId, accountId: this.paymentDialog.account.id, amount: this.paymentDialog.amount, dueDate: this.paymentDialog.dueDate, paidAt: this.paymentDialog.paidAt, sourceType: 'manual' }); this.paymentDialog.visible = false; await Promise.all([this.reloadTransactions(), this.loadAccounts(), this.loadReminders(), this.loadTrend()]); this.$message.success('缴费记录已登记。') } catch (error) { if (error.status === 409) await this.loadAccounts(); this.$message.error(error.message) } finally { this.paymentDialog.submitting = false } },
    money(value, currency = 'CNY') { return `${Number(value || 0).toFixed(2)} ${currency}` },
    formatDate(value) { return value ? new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'numeric', day: 'numeric' }).format(new Date(value)) : '—' },
    billingTypeLabel(value) { const item = this.billingTypes.find((type) => type.value === value); return item ? item.label : value },
    trendPercent(value) { const max = Math.max(...this.trend.months.map((item) => item.amount), 1); return Math.round(Number(value || 0) / max * 100) }
  }
}
</script>

<style scoped>
.finance-grid { display: grid; gap: 20px; grid-template-columns: minmax(0, 1.4fr) minmax(320px, 1fr); }
.finance-grid .surface-panel { min-height: 260px; }
.finance-toolbar { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
.finance-toolbar .el-select { width: 130px; }
.finance-summary { display: flex; gap: 28px; margin-bottom: 12px; }
.finance-summary span, .trend-total { color: var(--nm-muted); font-size: 13px; }
.finance-summary strong, .trend-total strong { color: var(--nm-text); font-size: 20px; margin-left: 5px; }
.finance-list, .trend-list { list-style: none; margin: 0; padding: 0; }
.finance-list li { align-items: center; border-top: 1px solid var(--nm-line); display: flex; gap: 10px; justify-content: space-between; padding: 11px 0; }
.finance-list li:first-child { border-top: 0; }
.finance-list p { color: var(--nm-muted); font-size: 12px; margin: 2px 0 0; }
.finance-amount { font-weight: 600; white-space: nowrap; }
.finance-hint, .finance-preview { color: var(--nm-muted); font-size: 12px; }
.finance-file { display: block; font-size: 12px; margin-bottom: 8px; }
.finance-actions { align-items: center; display: flex; gap: 10px; margin-top: 10px; }
.finance-suggestions { border-top: 1px solid var(--nm-line); margin-top: 14px; padding-top: 12px; }
.finance-suggestions p:not(.eyebrow) { font-size: 13px; margin: 5px 0; }
.trend-list li { align-items: center; display: flex; gap: 10px; margin: 10px 0; }
.trend-list li > span { flex: 0 0 32px; font-size: 12px; }
.trend-list .el-progress { flex: 1; }
.trend-list strong { flex: 0 0 100px; font-size: 12px; text-align: right; }
@media (max-width: 900px) { .finance-grid { grid-template-columns: 1fr; } }
</style>
