<template>
  <section class="courier-page">
    <section class="overview-intro">
      <div><p class="eyebrow">家庭空间 · 快递管家</p><h1>快递管家</h1><p>登记个人运单，查看物流状态与需要关注的异常；完整运单号只在当前登记会话中使用。</p></div>
      <el-button v-if="canWrite" type="primary" size="small" @click="openCreate">登记运单</el-button>
    </section>
    <div v-if="loading" class="overview-page__loading"><i class="el-icon-loading" /> 正在加载快递数据</div>
    <PageState v-else-if="error" type="error" :title="errorTitle" :description="error.message" @retry="load" />
    <template v-else>
      <section class="courier-grid">
        <article class="surface-panel"><header class="panel-heading"><div><p class="eyebrow">我的运单</p><h2>物流状态</h2></div><el-tag size="small" effect="plain">{{ shipments.length }} 件</el-tag></header>
          <PageState v-if="!shipments.length" title="暂无登记运单" description="登记运单后，物流状态会显示在这里。" />
          <ul v-else class="courier-list"><li v-for="shipment in shipments" :key="shipment.id"><div class="courier-list__body"><div class="courier-list__head"><strong>{{ shipment.label || shipment.trackingNumberMasked }}</strong><el-tag size="mini" effect="plain" :type="statusType(shipment.latestStatus)">{{ statusLabel(shipment.latestStatus) }}</el-tag></div><p>{{ shipment.trackingNumberMasked }}<span v-if="shipment.carrier"> · {{ shipment.carrier }}</span><span v-if="shipment.latestLocation"> · {{ shipment.latestLocation }}</span></p><p v-if="shipment.latestDescription">{{ shipment.latestDescription }}</p><p v-if="shipment.latestEventAt" class="courier-muted">最近更新 {{ formatDate(shipment.latestEventAt) }}</p></div><el-button size="mini" plain :loading="refreshingId === shipment.id" :disabled="refreshingId !== null" @click="refresh(shipment)">刷新</el-button></li></ul>
        </article>
        <article class="surface-panel"><header class="panel-heading"><div><p class="eyebrow">主动发现</p><h2>异常建议</h2></div><router-link to="/app/confirmations">确认中心 <i class="el-icon-right" /></router-link></header>
          <PageState v-if="!anomalies.length" title="暂无异常建议" description="物流停滞、派送无人签收或生鲜超时会在这里提示。" />
          <ul v-else class="courier-anomaly-list"><li v-for="item in anomalies" :key="`${item.shipmentId}-${item.type}`"><el-tag size="mini" type="warning" effect="plain">建议</el-tag><div><strong>{{ item.title }}</strong><p>{{ item.description }}</p><p class="courier-muted">建议：{{ item.suggestedAction }}</p><router-link v-if="item.confirmationId" :to="`/app/confirmations?focus=${item.confirmationId}`">查看确认卡</router-link></div></li></ul>
        </article>
      </section>
    </template>
    <AppDialog v-model="dialog.visible" title="登记运单" width="460px" :close-on-click-modal="false">
      <el-form label-width="92px" size="small"><el-form-item label="运单号" required><el-input v-model="dialog.trackingNumber" maxlength="64" show-word-limit /></el-form-item><el-form-item label="承运商"><el-input v-model="dialog.carrier" maxlength="64" /></el-form-item><el-form-item label="家庭标签"><el-input v-model="dialog.label" maxlength="128" /></el-form-item><el-form-item><el-checkbox v-model="dialog.isFreshFood">生鲜包裹</el-checkbox></el-form-item><el-form-item label="预计送达"><el-date-picker v-model="dialog.expectedDeliveryAt" type="datetime" value-format="yyyy-MM-ddTHH:mm:ssZ" style="width: 100%" /></el-form-item></el-form>
      <template #footer><el-button size="small" @click="dialog.visible = false">取消</el-button><el-button type="primary" size="small" :loading="dialog.submitting" :disabled="!dialog.trackingNumber.trim()" @click="create">登记</el-button></template>
    </AppDialog>
  </section>
</template>

<script>
import { createShipment, listCourierAnomalies, listShipments, refreshShipment } from '../../api/courier'
import { hasPermission } from '../../utils/permission'
import PageState from '../../components/common/PageState.vue'

export default {
  components: { PageState },
  data() { return { loading: true, error: null, shipments: [], anomalies: [], refreshingId: null, dialog: this.emptyDialog() } },
  computed: { homeId() { return this.$store.state.auth.tenantId }, canWrite() { return hasPermission(this.$store.state.auth.role, 'connector.write') }, errorTitle() { return this.error && this.error.status === 403 ? '暂无快递访问权限' : '快递数据暂不可用' } },
  created() { this.load() },
  methods: {
    emptyDialog() { return { visible: false, trackingNumber: '', carrier: '', label: '', isFreshFood: false, expectedDeliveryAt: null, submitting: false } },
    async load() { this.loading = true; this.error = null; try { const [shipments, anomalies] = await Promise.all([listShipments({ homeId: this.homeId }), listCourierAnomalies({ homeId: this.homeId })]); this.shipments = shipments; this.anomalies = anomalies } catch (error) { this.error = error } finally { this.loading = false } },
    openCreate() { this.dialog = this.emptyDialog(); this.dialog.visible = true },
    async create() { if (this.dialog.submitting || !this.dialog.trackingNumber.trim()) return; this.dialog.submitting = true; try { await createShipment({ homeId: this.homeId, ...this.dialog }); this.dialog.visible = false; await this.load(); this.$message.success('运单登记成功') } catch (error) { this.$message.error(error.message) } finally { this.dialog.submitting = false } },
    async refresh(shipment) { if (this.refreshingId !== null) return; this.refreshingId = shipment.id; try { const result = await refreshShipment({ homeId: this.homeId, shipmentId: shipment.id }); const index = this.shipments.findIndex((item) => item.id === shipment.id); if (index >= 0) this.$set(this.shipments, index, result.shipment); this.anomalies = result.anomalies; await this.loadAnomalies(); this.$message.success('物流状态已更新') } catch (error) { this.$message.error(error.message) } finally { this.refreshingId = null } },
    async loadAnomalies() { this.anomalies = await listCourierAnomalies({ homeId: this.homeId }) },
    statusLabel(status) { return { delivered: '已送达', in_transit: '运输中', out_for_delivery: '派送中', exception: '异常' }[status] || '待查询' },
    statusType(status) { return status === 'delivered' ? 'success' : status === 'exception' ? 'danger' : 'info' },
    formatDate(value) { return value ? new Intl.DateTimeFormat('zh-CN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : '—' }
  }
}
</script>

<style scoped>
.courier-grid { display: grid; gap: 20px; grid-template-columns: minmax(0, 1.4fr) minmax(300px, 1fr); }.courier-list, .courier-anomaly-list { list-style: none; margin: 0; padding: 0; }.courier-list li { align-items: flex-start; border-top: 1px solid var(--nm-line); display: flex; gap: 12px; justify-content: space-between; padding: 14px 0; }.courier-list li:first-child, .courier-anomaly-list li:first-child { border-top: 0; padding-top: 0; }.courier-list__body { min-width: 0; }.courier-list__head { align-items: center; display: flex; gap: 8px; }.courier-list__head strong { font-weight: 600; }.courier-list p, .courier-anomaly-list p { color: var(--nm-muted); font-size: 13px; margin: 4px 0 0; }.courier-muted { font-size: 12px !important; }.courier-anomaly-list li { align-items: flex-start; border-top: 1px solid var(--nm-line); display: flex; gap: 10px; padding: 14px 0; }.courier-anomaly-list strong { font-weight: 600; }.courier-anomaly-list a { display: inline-block; font-size: 12px; margin-top: 6px; }
@media (max-width: 900px) { .courier-grid { grid-template-columns: 1fr; } }
</style>
