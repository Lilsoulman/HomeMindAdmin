<template>
  <section class="pets-page">
    <section class="overview-intro">
      <div><p class="eyebrow">家庭空间 · 宠物管家</p><h1>宠物管家</h1><p>集中查看宠物档案、照护日历与用品余量；提醒只协助安排，不会替你下单或提供医疗建议。</p></div>
      <el-button v-if="canWrite" type="primary" size="small" @click="openPetDialog">新增宠物</el-button>
    </section>
    <div v-if="loading" class="overview-page__loading"><i class="el-icon-loading" /> 正在加载宠物照护数据</div>
    <PageState v-else-if="error" type="error" :title="errorTitle" :description="error.message" @retry="load" />
    <template v-else>
      <section class="metric-grid">
        <article class="metric-card"><p>家庭宠物</p><strong>{{ pets.length }}</strong><span class="metric-card__neutral">在用宠物档案</span></article>
        <article class="metric-card"><p>近七天提醒</p><strong>{{ alerts.length }}</strong><span :class="alerts.length ? 'metric-card__warning' : 'metric-card__success'">{{ alerts.length ? '请查看照护与补货安排' : '暂无近期提醒' }}</span></article>
        <article class="metric-card"><p>当前用品</p><strong>{{ supplies.length }}</strong><span class="metric-card__neutral">所选宠物的库存记录</span></article>
      </section>

      <section class="pets-grid">
        <article class="surface-panel">
          <header class="panel-heading"><div><p class="eyebrow">宠物档案</p><h2>家庭成员</h2></div><el-select v-if="pets.length" v-model="selectedPetId" size="small" class="pets-selector" @change="loadPetDetails"><el-option v-for="pet in pets" :key="pet.id" :label="pet.name" :value="pet.id" /></el-select></header>
          <PageState v-if="!pets.length" title="暂无宠物档案" description="新增宠物后，可建立照护日历和用品记录。" />
          <div v-else-if="selectedPet" class="pet-profile"><strong>{{ selectedPet.name }}</strong><p>{{ selectedPet.species }}<span v-if="selectedPet.breed"> · {{ selectedPet.breed }}</span><span v-if="selectedPet.birthDate"> · 出生于 {{ formatDate(selectedPet.birthDate) }}</span></p><p class="pets-hint">仅展示家庭照护所需信息，不替代兽医诊断或保存医疗原件。</p></div>
        </article>

        <article class="surface-panel">
          <header class="panel-heading"><div><p class="eyebrow">主动提醒</p><h2>近期照护与补货</h2></div><router-link to="/app/confirmations">确认中心 <i class="el-icon-right" /></router-link></header>
          <PageState v-if="!alerts.length" title="暂无近期提醒" description="七天内的照护安排和低库存用品会显示在这里。" />
          <ul v-else class="pets-list"><li v-for="alert in alerts" :key="`${alert.petId}-${alert.type}-${alert.title}`"><el-tag size="mini" type="warning" effect="plain">{{ alertLabel(alert.type) }}</el-tag><div><strong>{{ alert.title }}</strong><p>{{ alertMeta(alert) }}</p><router-link v-if="alert.confirmationId" :to="`/app/confirmations?focus=${alert.confirmationId}`">查看确认卡</router-link></div></li></ul>
        </article>

        <article class="surface-panel">
          <header class="panel-heading"><div><p class="eyebrow">照护日历</p><h2>{{ selectedPet ? selectedPet.name : '宠物' }}的安排</h2></div><el-button v-if="canWrite && selectedPet" size="small" type="primary" @click="openCareDialog">新增安排</el-button></header>
          <PageState v-if="!selectedPet" title="请先选择宠物" description="选择宠物档案后，查看疫苗和驱虫安排。" />
          <PageState v-else-if="detailsLoading" title="正在加载照护安排" description="请稍候。" />
          <PageState v-else-if="detailsError" type="error" title="照护数据暂不可用" :description="detailsError.message" @retry="loadPetDetails" />
          <PageState v-else-if="!careEvents.length" title="暂无照护安排" description="可添加疫苗或驱虫的到期日期。" />
          <ul v-else class="pets-list"><li v-for="item in careEvents" :key="item.id"><el-tag size="mini" effect="plain">{{ careLabel(item.careType) }}</el-tag><div><strong>{{ item.title }}</strong><p>到期 {{ formatDate(item.dueDate) }}</p></div></li></ul>
        </article>

        <article class="surface-panel">
          <header class="panel-heading"><div><p class="eyebrow">用品余量</p><h2>补货预测</h2></div><el-button v-if="canWrite && selectedPet" size="small" type="primary" @click="openSupplyDialog">更新用品</el-button></header>
          <PageState v-if="!selectedPet" title="请先选择宠物" description="选择宠物档案后，查看用品余量。" />
          <PageState v-else-if="detailsLoading" title="正在加载用品余量" description="请稍候。" />
          <PageState v-else-if="detailsError" type="error" title="用品数据暂不可用" :description="detailsError.message" @retry="loadPetDetails" />
          <PageState v-else-if="!supplies.length" title="暂无用品记录" description="记录库存和日均用量后，可收到低库存提醒。" />
          <ul v-else class="pets-list"><li v-for="item in supplies" :key="item.id"><el-tag size="mini" :type="item.daysRemaining <= 7 ? 'warning' : 'info'" effect="plain">{{ daysLabel(item.daysRemaining) }}</el-tag><div><strong>{{ item.itemName }}</strong><p>库存 {{ item.quantity }} {{ item.unit }} · 日均 {{ item.dailyUsage }} {{ item.unit }}</p><router-link v-if="item.confirmationId" :to="`/app/confirmations?focus=${item.confirmationId}`">查看确认卡</router-link></div></li></ul>
        </article>
      </section>
    </template>

    <AppDialog v-model="petDialog.visible" title="新增宠物档案" width="440px" :close-on-click-modal="false"><el-form label-width="88px" size="small"><el-form-item label="名称" required><el-input v-model="petDialog.name" maxlength="64" /></el-form-item><el-form-item label="种类" required><el-input v-model="petDialog.species" maxlength="32" placeholder="如：猫、狗" /></el-form-item><el-form-item label="品种"><el-input v-model="petDialog.breed" maxlength="64" /></el-form-item><el-form-item label="出生日期"><el-date-picker v-model="petDialog.birthDate" type="date" value-format="yyyy-MM-dd" style="width: 100%" /></el-form-item></el-form><template #footer><el-button size="small" @click="petDialog.visible = false">取消</el-button><el-button size="small" type="primary" :loading="petDialog.submitting" :disabled="!petDialog.name.trim() || !petDialog.species.trim()" @click="createPetProfile">保存</el-button></template></AppDialog>
    <AppDialog v-model="careDialog.visible" title="新增照护安排" width="440px" :close-on-click-modal="false"><el-form label-width="88px" size="small"><el-form-item label="类型" required><el-select v-model="careDialog.careType" style="width: 100%"><el-option label="疫苗" value="vaccine" /><el-option label="驱虫" value="deworming" /></el-select></el-form-item><el-form-item label="事项" required><el-input v-model="careDialog.title" maxlength="128" /></el-form-item><el-form-item label="到期日" required><el-date-picker v-model="careDialog.dueDate" type="date" value-format="yyyy-MM-dd" style="width: 100%" /></el-form-item></el-form><template #footer><el-button size="small" @click="careDialog.visible = false">取消</el-button><el-button size="small" type="primary" :loading="careDialog.submitting" :disabled="!careDialog.title.trim() || !careDialog.dueDate" @click="createCareEvent">保存</el-button></template></AppDialog>
    <AppDialog v-model="supplyDialog.visible" title="更新用品余量" width="440px" :close-on-click-modal="false"><p class="pets-hint">仅记录家庭库存与估算用量，不会自动购买。</p><el-form label-width="88px" size="small"><el-form-item label="用品" required><el-input v-model="supplyDialog.itemName" maxlength="128" /></el-form-item><el-form-item label="当前库存" required><el-input-number v-model="supplyDialog.quantity" :min="0" :precision="2" /></el-form-item><el-form-item label="日均用量" required><el-input-number v-model="supplyDialog.dailyUsage" :min="0.01" :precision="2" /></el-form-item><el-form-item label="单位" required><el-input v-model="supplyDialog.unit" maxlength="16" /></el-form-item></el-form><template #footer><el-button size="small" @click="supplyDialog.visible = false">取消</el-button><el-button size="small" type="primary" :loading="supplyDialog.submitting" :disabled="!supplyDialog.itemName.trim() || !supplyDialog.dailyUsage || !supplyDialog.unit.trim()" @click="saveSupply">保存</el-button></template></AppDialog>
  </section>
</template>

<script>
import { addPetCareEvent, createPet, listPetAlerts, listPetCareEvents, listPetSupplies, listPets, upsertPetSupply } from '../../api/pet'
import { hasPermission } from '../../utils/permission'
import PageState from '../../components/common/PageState.vue'

export default {
  components: { PageState },
  data() { return { loading: true, detailsLoading: false, error: null, detailsError: null, pets: [], alerts: [], careEvents: [], supplies: [], selectedPetId: null, petDialog: this.emptyPetDialog(), careDialog: this.emptyCareDialog(), supplyDialog: this.emptySupplyDialog() } },
  computed: { homeId() { return this.$store.state.auth.tenantId }, canWrite() { return hasPermission(this.$store.state.auth.role, 'pet.write') }, selectedPet() { return this.pets.find((item) => item.id === this.selectedPetId) || null }, errorTitle() { return this.error && this.error.status === 403 ? '暂无宠物访问权限' : '宠物照护数据暂不可用' } },
  created() { this.load() },
  methods: {
    emptyPetDialog() { return { visible: false, name: '', species: '', breed: '', birthDate: null, submitting: false } },
    emptyCareDialog() { return { visible: false, careType: 'vaccine', title: '', dueDate: null, submitting: false } },
    emptySupplyDialog() { return { visible: false, itemName: '', quantity: 0, dailyUsage: 1, unit: '份', submitting: false } },
    async load() { this.loading = true; this.error = null; try { const [pets, alerts] = await Promise.all([listPets({ homeId: this.homeId }), listPetAlerts({ homeId: this.homeId })]); this.pets = pets; this.alerts = alerts; this.selectedPetId = pets.some((item) => item.id === this.selectedPetId) ? this.selectedPetId : (pets[0] && pets[0].id); await this.loadPetDetails() } catch (error) { this.error = error } finally { this.loading = false } },
    async loadPetDetails() { if (!this.selectedPetId) { this.careEvents = []; this.supplies = []; this.detailsError = null; return } this.detailsLoading = true; this.detailsError = null; try { const [careEvents, supplies] = await Promise.all([listPetCareEvents({ homeId: this.homeId, petId: this.selectedPetId }), listPetSupplies({ homeId: this.homeId, petId: this.selectedPetId })]); this.careEvents = careEvents; this.supplies = supplies } catch (error) { this.detailsError = error } finally { this.detailsLoading = false } },
    openPetDialog() { this.petDialog = this.emptyPetDialog(); this.petDialog.visible = true },
    openCareDialog() { this.careDialog = this.emptyCareDialog(); this.careDialog.visible = true },
    openSupplyDialog() { this.supplyDialog = this.emptySupplyDialog(); this.supplyDialog.visible = true },
    async createPetProfile() { if (this.petDialog.submitting || !this.petDialog.name.trim() || !this.petDialog.species.trim()) return; this.petDialog.submitting = true; try { const pet = await createPet({ homeId: this.homeId, ...this.petDialog }); this.petDialog.visible = false; await this.load(); this.selectedPetId = pet.id; await this.loadPetDetails(); this.$message.success('宠物档案已创建') } catch (error) { this.$message.error(error.message) } finally { this.petDialog.submitting = false } },
    async createCareEvent() { if (this.careDialog.submitting || !this.careDialog.title.trim() || !this.careDialog.dueDate) return; this.careDialog.submitting = true; try { await addPetCareEvent({ homeId: this.homeId, petId: this.selectedPetId, ...this.careDialog }); this.careDialog.visible = false; await this.load(); this.$message.success('照护安排已保存') } catch (error) { this.$message.error(error.message) } finally { this.careDialog.submitting = false } },
    async saveSupply() { if (this.supplyDialog.submitting || !this.supplyDialog.itemName.trim() || !this.supplyDialog.dailyUsage || !this.supplyDialog.unit.trim()) return; this.supplyDialog.submitting = true; try { await upsertPetSupply({ homeId: this.homeId, petId: this.selectedPetId, ...this.supplyDialog }); this.supplyDialog.visible = false; await this.load(); this.$message.success('用品余量已更新') } catch (error) { this.$message.error(error.message) } finally { this.supplyDialog.submitting = false } },
    careLabel(type) { return type === 'vaccine' ? '疫苗' : type === 'deworming' ? '驱虫' : '照护' },
    alertLabel(type) { return type === 'supply_low' ? '补货' : this.careLabel(type) },
    alertMeta(alert) { return alert.dueDate ? `到期 ${this.formatDate(alert.dueDate)} · 还有 ${alert.daysRemaining} 天` : `预计剩余 ${alert.daysRemaining} 天` },
    daysLabel(days) { return days === undefined || days === null ? '余量待估算' : `约剩 ${days} 天` },
    formatDate(value) { return value ? new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium' }).format(new Date(value)) : '—' }
  }
}
</script>

<style scoped>
.pets-grid { display: grid; gap: 20px; grid-template-columns: repeat(2, minmax(0, 1fr)); }.pets-selector { width: 140px; }.pet-profile strong { font-size: 20px; font-weight: 600; }.pet-profile p, .pets-list p, .pets-hint { color: var(--nm-muted); font-size: 13px; margin: 6px 0 0; }.pets-list { list-style: none; margin: 0; padding: 0; }.pets-list li { align-items: flex-start; border-top: 1px solid var(--nm-line); display: flex; gap: 10px; padding: 13px 0; }.pets-list li:first-child { border-top: 0; padding-top: 0; }.pets-list strong { font-weight: 600; }.pets-list a { display: inline-block; font-size: 12px; margin-top: 5px; }
@media (max-width: 900px) { .pets-grid { grid-template-columns: 1fr; } }
</style>
