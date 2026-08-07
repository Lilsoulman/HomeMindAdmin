<template>
  <section class="automations-page">
    <div v-if="loading" class="overview-page__loading"><i class="el-icon-loading" /> 正在加载自动化规则</div>
    <PageState v-else-if="error" type="error" :title="errorTitle" :description="error.message" @retry="load" />

    <template v-else>
      <section class="overview-intro">
        <div>
          <p class="eyebrow">开发控制台</p>
          <h1>自动化</h1>
          <p>规则触发后按审批策略生成待确认动作或自动执行。</p>
        </div>
        <el-button v-if="canWrite" type="primary" @click="openCreate">新建规则</el-button>
      </section>

      <section class="surface-panel automations-panel">
        <PageState v-if="!items.length" title="暂无自动化规则" description="创建规则后，家庭会在满足条件时自动触发。" />
        <ul v-else class="automation-list">
          <li v-for="rule in items" :key="rule.id">
            <div class="automation-list__head">
              <strong>{{ rule.name }}</strong>
              <el-tag size="small" effect="plain">{{ triggerTypeLabel(rule.triggerType) }}</el-tag>
              <el-tag size="small" :type="rule.approvalPolicy === 'manual_confirmation' ? 'warning' : 'info'" effect="plain">{{ policyLabel(rule.approvalPolicy) }}</el-tag>
              <el-switch
                v-if="canWrite"
                :value="rule.enabled"
                :disabled="togglingId === rule.id"
                @change="(value) => toggleRule(rule, value)"
              />
            </div>
            <p>{{ actionsPreview(rule.actions) }}</p>
            <div class="automation-list__meta">
              <span>最后触发：{{ formatTime(rule.lastTriggeredAt) || '—' }}</span>
              <span v-if="!rule.enabled">（已停用）</span>
            </div>
            <div v-if="canWrite" class="automation-list__actions">
              <el-button size="mini" @click="openEdit(rule)">编辑</el-button>
            </div>
          </li>
        </ul>
      </section>

      <el-dialog :title="dialog.isEdit ? '编辑规则' : '新建规则'" :visible.sync="dialog.visible" width="560px" :close-on-click-modal="false">
        <el-form label-width="96px" size="small">
          <el-form-item label="名称" required>
            <el-input v-model="dialog.name" maxlength="128" placeholder="例如：日落后回家照明" />
          </el-form-item>
          <el-form-item label="触发类型" required>
            <el-select v-model="dialog.triggerType" style="width: 100%">
              <el-option v-for="item in triggerTypes" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="触发配置" required>
            <el-input v-model="dialog.trigger" type="textarea" :rows="4" placeholder="JSON 对象，例如 {&quot;kind&quot;:&quot;sun&quot;,&quot;event&quot;:&quot;sunset&quot;,&quot;offsetMinutes&quot;:5}" />
          </el-form-item>
          <el-form-item label="条件">
            <el-input v-model="dialog.conditions" type="textarea" :rows="3" placeholder="JSON 数组，可留空，例如 [{&quot;deviceId&quot;:1,&quot;capability&quot;:&quot;motion&quot;}]" />
          </el-form-item>
          <el-form-item label="动作" required>
            <el-input v-model="dialog.actions" type="textarea" :rows="3" placeholder="JSON 数组，仅内置场景键，例如 [{&quot;sceneKey&quot;:&quot;arrive_home&quot;}]" />
          </el-form-item>
          <el-form-item label="审批策略" required>
            <el-radio-group v-model="dialog.approvalPolicy">
              <el-radio label="manual_confirmation">手动确认</el-radio>
              <el-radio label="auto_execute">自动执行</el-radio>
            </el-radio-group>
            <p class="setup-form__hint">{{ policyHint }}</p>
          </el-form-item>
          <el-form-item v-if="dialog.isEdit" label="启用">
            <el-switch v-model="dialog.enabled" />
          </el-form-item>
        </el-form>
        <span slot="footer">
          <el-button size="small" @click="dialog.visible = false">取消</el-button>
          <el-button
            size="small"
            type="primary"
            :loading="dialog.submitting"
            :disabled="!dialog.name.trim() || !validJson(dialog.trigger) || !validJson(dialog.actions)"
            @click="save"
          >保存</el-button>
        </span>
      </el-dialog>
    </template>
  </section>
</template>

<script>
import { createAutomationRule, listAutomationRules, updateAutomationRule } from '../../api/automation'
import { hasPermission } from '../../utils/permission'
import PageState from '../../components/common/PageState.vue'

const triggerLabels = { time_schedule: '时间计划', device_state_change: '设备状态', scene_completed: '场景完成', sync_completed: '同步完成' }

export default {
  components: { PageState },
  data() {
    return {
      loading: true,
      error: null,
      items: [],
      togglingId: null,
      dialog: { visible: false, isEdit: false, id: null, name: '', triggerType: 'time_schedule', trigger: '', conditions: '', actions: '', approvalPolicy: 'manual_confirmation', enabled: true, rowVersion: null, submitting: false },
      pageAlive: true
    }
  },
  computed: {
    canWrite() {
      return hasPermission(this.$store.state.auth.role, 'automation.write')
    },
    triggerTypes() {
      return [
        { value: 'time_schedule', label: '时间计划（time_schedule）' },
        { value: 'device_state_change', label: '设备状态变化（device_state_change）' },
        { value: 'scene_completed', label: '场景完成（scene_completed）' },
        { value: 'sync_completed', label: '同步完成（sync_completed）' }
      ]
    },
    policyHint() {
      return this.dialog.approvalPolicy === 'manual_confirmation'
        ? '规则触发后生成待确认动作，需家庭成员确认后才执行，风险更可控。'
        : '满足条件后自动执行（使用规则所有者的授权），请确认影响范围与风险。'
    },
    errorTitle() {
      return this.error && this.error.status === 403 ? '暂无自动化权限' : '自动化暂不可用'
    }
  },
  created() {
    this.load()
  },
  destroyed() {
    this.pageAlive = false
  },
  methods: {
    async load() {
      this.loading = true
      this.error = null
      try {
        this.items = await listAutomationRules()
      } catch (error) {
        if (this.pageAlive) this.error = error
      } finally {
        if (this.pageAlive) this.loading = false
      }
    },
    openCreate() {
      this.dialog = { visible: true, isEdit: false, id: null, name: '', triggerType: 'time_schedule', trigger: '', conditions: '', actions: '', approvalPolicy: 'manual_confirmation', enabled: true, rowVersion: null, submitting: false }
    },
    openEdit(rule) {
      this.dialog = {
        visible: true, isEdit: true, id: rule.id, name: rule.name, triggerType: rule.triggerType,
        trigger: stringifyJson(rule.trigger), conditions: stringifyJson(rule.conditions),
        actions: stringifyJson(rule.actions), approvalPolicy: rule.approvalPolicy,
        enabled: rule.enabled, rowVersion: rule.rowVersion, submitting: false
      }
    },
    validJson(text) {
      if (!text || !text.trim()) return false
      try {
        JSON.parse(text)
        return true
      } catch (error) {
        return false
      }
    },
    parseJson(text) {
      if (!text || !text.trim()) return undefined
      return JSON.parse(text)
    },
    async save() {
      this.dialog.submitting = true
      try {
        const payload = {
          name: this.dialog.name.trim(),
          triggerType: this.dialog.triggerType,
          trigger: this.parseJson(this.dialog.trigger),
          conditions: this.parseJson(this.dialog.conditions) || [],
          actions: this.parseJson(this.dialog.actions),
          approvalPolicy: this.dialog.approvalPolicy
        }
        if (this.dialog.isEdit) {
          payload.enabled = this.dialog.enabled
          payload.rowVersion = this.dialog.rowVersion
          await updateAutomationRule({ id: this.dialog.id, payload })
          this.$message.success('规则已更新。')
        } else {
          payload.enabled = true
          await createAutomationRule(payload)
          this.$message.success('规则已创建。')
        }
        this.dialog.visible = false
        await this.load()
      } catch (error) {
        this.handleWriteError(error)
      } finally {
        this.dialog.submitting = false
      }
    },
    async toggleRule(rule, enabled) {
      this.togglingId = rule.id
      try {
        await updateAutomationRule({ id: rule.id, payload: { enabled, rowVersion: rule.rowVersion } })
        this.$message.success(enabled ? '规则已启用。' : '规则已停用。')
        await this.load()
      } catch (error) {
        this.handleWriteError(error)
      } finally {
        this.togglingId = null
      }
    },
    handleWriteError(error) {
      if (!this.pageAlive) return
      if (error.status === 409) {
        this.$message.warning('规则已被其他会话修改（已刷新）。')
        this.load()
      } else if (error.status === 422) {
        this.$message.error(error.message || '请检查规则配置。')
      } else if (error.status === 403) {
        this.$message.error('你没有执行该操作的权限。')
      } else {
        this.$message.error(error.message || '操作失败，请重试。')
      }
    },
    actionsPreview(actions) {
      if (!Array.isArray(actions)) return ''
      return actions.map((action) => `场景 ${action.sceneKey || '?'}`).join('、')
    },
    triggerTypeLabel(type) { return triggerLabels[type] || type },
    policyLabel(policy) { return policy === 'manual_confirmation' ? '手动确认' : '自动执行' },
    formatTime(value) {
      if (!value) return ''
      return new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
    }
  }
}

function stringifyJson(value) {
  if (value === undefined || value === null) return ''
  return JSON.stringify(value, null, 2)
}
</script>
