<template>
  <section class="family-page">
    <section class="overview-intro">
      <div>
        <p class="eyebrow">家庭空间</p>
        <h1>家庭成员与知识</h1>
        <p>维护家庭成员档案、家庭知识与决策记录。成员进入终态必须说明原因。</p>
      </div>
    </section>

    <el-tabs v-model="activeTab" class="family-tabs" @tab-click="handleTabClick">
      <!-- ─── 成员 ─── -->
      <el-tab-pane label="家庭成员" name="members">
        <div v-if="members.loading" class="overview-page__loading"><i class="el-icon-loading" /> 正在加载成员</div>
        <PageState v-else-if="members.error" type="error" :title="members.errorTitle" :description="members.error.message" @retry="loadMembers" />
        <template v-else>
          <div v-if="canWrite" class="family-toolbar">
            <el-button size="small" type="primary" @click="openCreateMember">新增成员</el-button>
          </div>
          <PageState v-if="!members.items.length" title="暂无家庭成员" description="创建家庭成员后，这里会显示家庭档案。" />
          <ul v-else class="member-list">
            <li v-for="member in members.items" :key="member.id" class="member-card">
              <div class="member-card__head">
                <strong>{{ member.name }}</strong>
                <el-tag :type="memberTagType(member.memberStatus)" effect="plain" size="small">{{ memberStatusLabel(member.memberStatus) }}</el-tag>
              </div>
              <p class="member-card__meta">
                <span>关系：{{ member.relation }}</span>
                <span v-if="member.birthday">生日：{{ formatDate(member.birthday) }}</span>
                <span v-if="member.isElderly">老人</span>
                <span v-if="member.isChild">儿童</span>
                <span v-if="member.isPrimary">家庭主用户</span>
              </p>
              <div v-if="canWrite" class="member-card__actions">
                <el-button size="mini" @click="openEditMember(member)">编辑</el-button>
                <el-button size="mini" type="danger" plain @click="openCorrection(member)">终态更正</el-button>
              </div>
            </li>
          </ul>
        </template>
      </el-tab-pane>

      <!-- ─── 家庭知识 ─── -->
      <el-tab-pane label="家庭知识" name="knowledge">
        <div v-if="knowledge.loading" class="overview-page__loading"><i class="el-icon-loading" /> 正在加载知识</div>
        <PageState v-else-if="knowledge.error" type="error" :title="knowledge.errorTitle" :description="knowledge.error.message" @retry="loadKnowledge" />
        <template v-else>
          <div class="family-toolbar">
            <el-select v-model="knowledge.category" placeholder="全部分类" size="small" @change="loadKnowledge">
              <el-option v-for="item in knowledgeCategories" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
            <el-button v-if="canWrite" size="small" type="primary" @click="openWriteKnowledge">新增知识</el-button>
          </div>
          <PageState v-if="!knowledge.items.length" title="暂无家庭知识" description="当前分类下没有知识条目。" />
          <ul v-else class="knowledge-list">
            <li v-for="item in knowledge.items" :key="item.id">
              <div class="knowledge-list__head">
                <el-tag size="small" effect="plain">{{ categoryLabel(item.category) }}</el-tag>
                <strong>{{ item.key }}</strong>
                <span v-if="item.confidenceScore != null" class="knowledge-list__confidence">置信 {{ Math.round(item.confidenceScore * 100) }}%</span>
              </div>
              <p>{{ item.value }}</p>
              <p v-if="item.notes" class="knowledge-list__notes">{{ item.notes }}</p>
              <div v-if="canWrite" class="knowledge-list__actions">
                <el-button size="mini" type="danger" plain @click="confirmDeleteKnowledge(item)">删除</el-button>
              </div>
            </li>
          </ul>
        </template>
      </el-tab-pane>

      <!-- ─── 决策记录 ─── -->
      <el-tab-pane label="决策记录" name="decisions">
        <div v-if="decisions.loading" class="overview-page__loading"><i class="el-icon-loading" /> 正在加载决策记录</div>
        <PageState v-else-if="decisions.error" type="error" :title="decisions.errorTitle" :description="decisions.error.message" @retry="loadDecisions" />
        <template v-else>
          <div v-if="canWrite" class="family-toolbar">
            <el-button size="small" type="primary" @click="openRecordDecision">记录决策</el-button>
          </div>
          <PageState v-if="!decisions.items.length" title="暂无决策记录" description="家庭的重要决策会在这里留痕。" />
          <ul v-else class="decision-list">
            <li v-for="item in decisions.items" :key="item.id">
              <div class="decision-list__head"><strong>{{ item.scenario }}</strong><time>{{ formatTime(item.decidedAt) }}</time></div>
              <p>{{ item.decisionMade }}</p>
              <p v-if="item.rationale" class="decision-list__rationale">理由：{{ item.rationale }}</p>
            </li>
          </ul>
          <div v-if="decisions.cursor" class="activities-panel__more">
            <el-button size="small" :loading="decisions.loadingMore" @click="loadMoreDecisions">加载更多</el-button>
          </div>
        </template>
      </el-tab-pane>
    </el-tabs>

    <!-- 成员：新增/编辑 -->
    <AppDialog v-model="memberDialog.visible" :title="memberDialog.isEdit ? '编辑成员' : '新增成员'" width="460px" :close-on-click-modal="false">
      <el-form label-width="86px" size="small">
        <el-form-item label="名称" required>
          <el-input v-model="memberDialog.name" maxlength="128" />
        </el-form-item>
        <el-form-item label="关系" required>
          <el-input v-model="memberDialog.relation" maxlength="64" placeholder="例如：户主、配偶、子女" />
        </el-form-item>
        <el-form-item label="生日">
          <el-date-picker v-model="memberDialog.birthday" type="date" value-format="yyyy-MM-dd" placeholder="选择日期" style="width: 100%" />
        </el-form-item>
        <el-form-item label="标记">
          <el-checkbox v-model="memberDialog.isElderly">老人</el-checkbox>
          <el-checkbox v-model="memberDialog.isChild">儿童</el-checkbox>
          <el-checkbox v-model="memberDialog.isPrimary">家庭主用户</el-checkbox>
        </el-form-item>
      </el-form>
      <span slot="footer">
        <el-button size="small" @click="memberDialog.visible = false">取消</el-button>
        <el-button size="small" type="primary" :loading="memberDialog.submitting" :disabled="!memberDialog.name.trim() || !memberDialog.relation.trim()" @click="saveMember">保存</el-button>
      </span>
    </AppDialog>

    <!-- 成员：终态更正 -->
    <AppDialog v-model="correctionDialog.visible" title="终态更正" width="460px" :close-on-click-modal="false">
      <p class="deny-dialog__hint">更正成员生命周期状态并写入审计；进入终态必须填写原因。</p>
      <el-form label-width="86px" size="small">
        <el-form-item label="目标状态">
          <el-select v-model="correctionDialog.memberStatus" style="width: 100%">
            <el-option v-for="item in correctionStatuses" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="原因" required>
          <el-input v-model="correctionDialog.reason" type="textarea" :rows="3" maxlength="512" show-word-limit placeholder="说明更正原因（1-512 字符）" />
        </el-form-item>
      </el-form>
      <span slot="footer">
        <el-button size="small" @click="correctionDialog.visible = false">取消</el-button>
        <el-button
          size="small"
          type="danger"
          :loading="correctionDialog.submitting"
          :disabled="!correctionDialog.memberStatus || !correctionDialog.reason.trim()"
          @click="submitCorrection"
        >确认更正</el-button>
      </span>
    </AppDialog>

    <!-- 知识：新增 -->
    <AppDialog v-model="knowledgeDialog.visible" title="新增家庭知识" width="480px" :close-on-click-modal="false">
      <el-form label-width="86px" size="small">
        <el-form-item label="分类" required>
          <el-select v-model="knowledgeDialog.category" style="width: 100%">
            <el-option v-for="item in knowledgeCategories" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="键" required>
          <el-input v-model="knowledgeDialog.key" maxlength="256" placeholder="例如：wifi_guest_password" />
        </el-form-item>
        <el-form-item label="值" required>
          <el-input v-model="knowledgeDialog.value" type="textarea" :rows="2" placeholder="知识内容" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="knowledgeDialog.notes" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="置信度">
          <el-input-number v-model="knowledgeDialog.confidenceScore" :min="0" :max="1" :step="0.1" style="width: 140px" />
        </el-form-item>
        <el-form-item label="冲突策略">
          <el-select v-model="knowledgeDialog.conflictResolutionStrategy" style="width: 100%">
            <el-option label="最新优先（latest）" value="latest" />
            <el-option label="权威优先（authority）" value="authority" />
            <el-option label="多数优先（majority）" value="majority" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="hasMembers" label="来源成员">
          <el-select v-model="knowledgeDialog.sourceMemberId" style="width: 100%" placeholder="选择提供该知识的成员">
            <el-option v-for="member in members.items" :key="member.id" :label="member.name" :value="member.id" />
          </el-select>
        </el-form-item>
        <p v-else class="deny-dialog__hint">暂无成员档案，该知识将以系统来源记录。</p>
      </el-form>
      <span slot="footer">
        <el-button size="small" @click="knowledgeDialog.visible = false">取消</el-button>
        <el-button
          size="small"
          type="primary"
          :loading="knowledgeDialog.submitting"
          :disabled="!knowledgeDialog.category || !knowledgeDialog.key.trim() || !knowledgeDialog.value.trim()"
          @click="saveKnowledge"
        >保存</el-button>
      </span>
    </AppDialog>

    <!-- 决策：记录 -->
    <AppDialog v-model="decisionDialog.visible" title="记录家庭决策" width="480px" :close-on-click-modal="false">
      <el-form label-width="86px" size="small">
        <el-form-item label="场景" required>
          <el-input v-model="decisionDialog.scenario" maxlength="128" placeholder="例如：宽带续费方案" />
        </el-form-item>
        <el-form-item label="决策" required>
          <el-input v-model="decisionDialog.decisionMade" type="textarea" :rows="2" placeholder="最终决定" />
        </el-form-item>
        <el-form-item label="理由">
          <el-input v-model="decisionDialog.rationale" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <span slot="footer">
        <el-button size="small" @click="decisionDialog.visible = false">取消</el-button>
        <el-button
          size="small"
          type="primary"
          :loading="decisionDialog.submitting"
          :disabled="!decisionDialog.scenario.trim() || !decisionDialog.decisionMade.trim()"
          @click="saveDecision"
        >记录</el-button>
      </span>
    </AppDialog>
  </section>
</template>

<script>
import { correctMember, createMember, deleteKnowledge, listDecisions, listKnowledge, listMembers, recordDecision, updateMember, writeKnowledge } from '../../api/family'
import { hasPermission } from '../../utils/permission'
import PageState from '../../components/common/PageState.vue'

const memberStatusLabels = { active: '在家', away: '外出', permanently_left: '已离开', deceased: '已故' }
const memberTagTypes = { active: 'success', away: 'warning', permanently_left: 'info', deceased: 'danger' }

export default {
  components: { PageState },
  data() {
    return {
      activeTab: 'members',
      pageAlive: true,
      members: { loading: true, error: null, items: [] },
      knowledge: { loading: false, error: null, items: [], category: '', loaded: false },
      decisions: { loading: false, error: null, items: [], cursor: null, loadingMore: false, loaded: false },
      memberDialog: { visible: false, isEdit: false, id: null, name: '', relation: '', birthday: '', isElderly: false, isChild: false, isPrimary: false, submitting: false },
      correctionDialog: { visible: false, id: null, name: '', memberStatus: 'permanently_left', reason: '', submitting: false },
      knowledgeDialog: { visible: false, category: 'other', key: '', value: '', notes: '', confidenceScore: 1, conflictResolutionStrategy: 'latest', sourceType: 'member', sourceMemberId: null, submitting: false },
      decisionDialog: { visible: false, scenario: '', decisionMade: '', rationale: '', submitting: false }
    }
  },
  computed: {
    homeId() {
      return this.$store.state.auth.tenantId
    },
    canWrite() {
      return hasPermission(this.$store.state.auth.role, 'family.write')
    },
    hasMembers() {
      return this.members.items.length > 0
    },
    correctionStatuses() {
      return [
        { value: 'permanently_left', label: '已离开（permanently_left）' },
        { value: 'deceased', label: '已故（deceased）' },
        { value: 'active', label: '恢复为在家（active）' },
        { value: 'away', label: '恢复为外出（away）' }
      ]
    },
    knowledgeCategories() {
      return [
        { value: '', label: '全部分类' },
        { value: 'property', label: '房产' },
        { value: 'wifi', label: '网络' },
        { value: 'repair', label: '维修' },
        { value: 'cleaning', label: '清洁' },
        { value: 'insurance', label: '保险' },
        { value: 'travel', label: '出行' },
        { value: 'other', label: '其他' }
      ]
    }
  },
  created() {
    this.loadMembers()
  },
  unmounted() {
    this.pageAlive = false
  },
  methods: {
    handleTabClick(tab) {
      if (tab.name === 'knowledge' && !this.knowledge.loaded) this.loadKnowledge()
      if (tab.name === 'decisions' && !this.decisions.loaded) this.loadDecisions()
    },
    // ─── 成员 ───
    async loadMembers() {
      this.members.loading = true
      this.members.error = null
      try {
        this.members.items = await listMembers({ homeId: this.homeId })
      } catch (error) {
        if (this.pageAlive) this.members.error = error
      } finally {
        if (this.pageAlive) this.members.loading = false
      }
    },
    openCreateMember() {
      this.memberDialog = { visible: true, isEdit: false, id: null, name: '', relation: '', birthday: '', isElderly: false, isChild: false, isPrimary: false, submitting: false }
    },
    openEditMember(member) {
      this.memberDialog = {
        visible: true, isEdit: true, id: member.id, name: member.name, relation: member.relation,
        birthday: member.birthday ? String(member.birthday).slice(0, 10) : '', isElderly: member.isElderly,
        isChild: member.isChild, isPrimary: member.isPrimary, submitting: false
      }
    },
    async saveMember() {
      this.memberDialog.submitting = true
      const payload = {
        name: this.memberDialog.name.trim(),
        relation: this.memberDialog.relation.trim(),
        birthday: this.memberDialog.birthday || null,
        isElderly: this.memberDialog.isElderly,
        isChild: this.memberDialog.isChild,
        isPrimary: this.memberDialog.isPrimary
      }
      try {
        if (this.memberDialog.isEdit) {
          await updateMember({ homeId: this.homeId, id: this.memberDialog.id, payload })
          this.$message.success('成员已更新。')
        } else {
          await createMember({ homeId: this.homeId, payload })
          this.$message.success('成员已创建。')
        }
        this.memberDialog.visible = false
        await this.loadMembers()
      } catch (error) {
        this.handleWriteError(error)
      } finally {
        this.memberDialog.submitting = false
      }
    },
    openCorrection(member) {
      this.correctionDialog = { visible: true, id: member.id, name: member.name, memberStatus: 'permanently_left', reason: '', submitting: false }
    },
    async submitCorrection() {
      this.$confirm(`确认将「${this.correctionDialog.name}」更正为「${this.memberStatusLabel(this.correctionDialog.memberStatus)}」？此操作将写入家庭审计。`, '终态更正确认', {
        confirmButtonText: '确认更正',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(async () => {
        this.correctionDialog.submitting = true
        try {
          await correctMember({ homeId: this.homeId, id: this.correctionDialog.id, memberStatus: this.correctionDialog.memberStatus, reason: this.correctionDialog.reason.trim() })
          this.$message.success('成员状态已更正。')
          this.correctionDialog.visible = false
          await this.loadMembers()
        } catch (error) {
          this.handleWriteError(error)
        } finally {
          this.correctionDialog.submitting = false
        }
      }).catch(() => {})
    },
    // ─── 知识 ───
    async loadKnowledge() {
      this.knowledge.loading = true
      this.knowledge.error = null
      try {
        this.knowledge.items = await listKnowledge({ homeId: this.homeId, category: this.knowledge.category })
        this.knowledge.loaded = true
      } catch (error) {
        if (this.pageAlive) this.knowledge.error = error
      } finally {
        if (this.pageAlive) this.knowledge.loading = false
      }
    },
    openWriteKnowledge() {
      this.knowledgeDialog = {
        visible: true, category: 'other', key: '', value: '', notes: '', confidenceScore: 1,
        conflictResolutionStrategy: 'latest', sourceType: this.hasMembers ? 'member' : 'system_ai',
        sourceMemberId: this.hasMembers ? this.members.items[0].id : null, submitting: false
      }
    },
    async saveKnowledge() {
      this.knowledgeDialog.submitting = true
      try {
        const result = await writeKnowledge({
          homeId: this.homeId,
          payload: {
            category: this.knowledgeDialog.category,
            key: this.knowledgeDialog.key.trim(),
            value: this.knowledgeDialog.value.trim(),
            notes: this.knowledgeDialog.notes.trim() || null,
            confidenceScore: this.knowledgeDialog.confidenceScore,
            conflictResolutionStrategy: this.knowledgeDialog.conflictResolutionStrategy,
            sourceType: this.knowledgeDialog.sourceType,
            sourceMemberId: this.knowledgeDialog.sourceMemberId
          }
        })
        this.knowledgeDialog.visible = false
        const conflict = result.resolution && result.resolution.conflictingIds.length ? `（冲突按 ${result.resolution.strategy} 解决）` : ''
        this.$message.success(`知识已保存${conflict}。`)
        await this.loadKnowledge()
      } catch (error) {
        this.handleWriteError(error)
      } finally {
        this.knowledgeDialog.submitting = false
      }
    },
    confirmDeleteKnowledge(item) {
      this.$confirm(`确认删除知识「${item.key}」？删除将写入审计。`, '删除知识', {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(async () => {
        try {
          await deleteKnowledge({ homeId: this.homeId, id: item.id })
          this.$message.success('知识已删除。')
          await this.loadKnowledge()
        } catch (error) {
          this.handleWriteError(error)
        }
      }).catch(() => {})
    },
    // ─── 决策 ───
    async loadDecisions() {
      this.decisions.loading = true
      this.decisions.error = null
      this.decisions.items = []
      this.decisions.cursor = null
      try {
        await this.fetchDecisionPage(null)
        this.decisions.loaded = true
      } catch (error) {
        if (this.pageAlive) this.decisions.error = error
      } finally {
        if (this.pageAlive) this.decisions.loading = false
      }
    },
    async fetchDecisionPage(cursor) {
      const page = await listDecisions({ homeId: this.homeId, cursor })
      if (!this.pageAlive) return page
      this.decisions.items = cursor ? this.decisions.items.concat(page.items) : page.items
      this.decisions.cursor = page.cursor
      return page
    },
    async loadMoreDecisions() {
      if (!this.decisions.cursor || this.decisions.loadingMore) return
      this.decisions.loadingMore = true
      try {
        await this.fetchDecisionPage(this.decisions.cursor)
      } catch (error) {
        this.$message.error(error.message || '加载更多失败，请重试。')
      } finally {
        this.decisions.loadingMore = false
      }
    },
    openRecordDecision() {
      this.decisionDialog = { visible: true, scenario: '', decisionMade: '', rationale: '', submitting: false }
    },
    async saveDecision() {
      this.decisionDialog.submitting = true
      try {
        await recordDecision({
          homeId: this.homeId,
          payload: {
            scenario: this.decisionDialog.scenario.trim(),
            decisionMade: this.decisionDialog.decisionMade.trim(),
            rationale: this.decisionDialog.rationale.trim() || null
          }
        })
        this.$message.success('决策已记录。')
        this.decisionDialog.visible = false
        await this.loadDecisions()
      } catch (error) {
        this.handleWriteError(error)
      } finally {
        this.decisionDialog.submitting = false
      }
    },
    // ─── 通用 ───
    handleWriteError(error) {
      if (!this.pageAlive) return
      if (error.status === 409) {
        this.$message.warning((error.message || '数据已被他人修改。') + '（已刷新）')
        this.loadMembers()
        this.loadKnowledge()
      } else if (error.status === 422) {
        this.$message.error(error.message || '提交内容不符合要求。')
      } else if (error.status === 403) {
        this.$message.error('你没有执行该操作的权限。')
      } else {
        this.$message.error(error.message || '操作失败，请重试。')
      }
    },
    memberStatusLabel(status) { return memberStatusLabels[status] || status },
    memberTagType(status) { return memberTagTypes[status] || 'info' },
    categoryLabel(category) {
      const found = this.knowledgeCategories.find((item) => item.value === category)
      return found ? found.label : category
    },
    formatDate(value) {
      if (!value) return ''
      return String(value).slice(0, 10)
    },
    formatTime(value) {
      if (!value) return ''
      return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
    }
  }
}
</script>
