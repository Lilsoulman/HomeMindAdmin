<template>
  <section class="my-experts-page">
    <div v-if="loading" class="overview-page__loading"><i class="el-icon-loading" /> 正在加载我的专家</div>
    <PageState v-else-if="error" type="error" :title="errorTitle" :description="error.message" @retry="load" />

    <template v-else>
      <section class="overview-intro">
        <div>
          <p class="eyebrow">个人空间</p>
          <h1>我的专家</h1>
          <p>仅创建者本人可见的自建专家。提示词不会在此页面回显。</p>
        </div>
        <el-button v-if="canWrite" type="primary" @click="openCreate">新建专家</el-button>
      </section>

      <section class="surface-panel experts-panel">
        <PageState v-if="!items.length" title="暂无专家" description="创建你的第一个自建专家，仅你自己可见。" />
        <ul v-else class="expert-list">
          <li v-for="item in items" :key="item.id">
            <div class="expert-list__head">
              <strong>{{ item.name }}</strong>
              <el-tag size="small" type="success" effect="plain">自建</el-tag>
              <span class="expert-list__credits">预估 {{ item.estimatedCredits }} 积分</span>
            </div>
            <p>{{ item.description || '暂无描述。' }}</p>
            <div class="expert-list__meta"><span>分类：{{ item.category || '—' }}</span><span>编码：{{ item.code }}</span></div>
            <div v-if="canWrite" class="expert-list__actions">
              <el-button size="mini" @click="openEdit(item)">编辑</el-button>
              <el-button size="mini" type="danger" plain @click="confirmDelete(item)">删除</el-button>
            </div>
          </li>
        </ul>
      </section>

      <el-dialog :title="dialog.isEdit ? '编辑专家' : '新建专家'" :visible.sync="dialog.visible" width="560px" :close-on-click-modal="false">
        <div v-if="dialog.loading" class="overview-page__loading"><i class="el-icon-loading" /> 正在加载详情</div>
        <el-form v-else label-width="96px" size="small">
          <el-form-item label="名称" required>
            <el-input v-model="dialog.name" maxlength="128" placeholder="例如：我的旅行助手" />
          </el-form-item>
          <el-form-item label="分类" required>
            <el-input v-model="dialog.category" placeholder="例如：travel" />
          </el-form-item>
          <el-form-item label="说明" required>
            <el-input v-model="dialog.description" type="textarea" :rows="2" placeholder="简短说明该专家的用途" />
          </el-form-item>
          <el-form-item label="角色设定" required>
            <el-input v-model="dialog.persona" type="textarea" :rows="3" placeholder="例如：你是我的旅行助手，擅长行程规划……" />
          </el-form-item>
          <el-form-item label="方法论">
            <el-input v-model="dialog.methodology" type="textarea" :rows="2" placeholder="可选，例如：分步骤给出建议" />
          </el-form-item>
          <el-form-item label="能力策略">
            <el-input v-model="dialog.toolPolicyJson" type="textarea" :rows="2" placeholder="JSON，可选，例如 {&quot;skills&quot;:[]}" />
          </el-form-item>
          <el-form-item label="提示词" required>
            <el-input v-model="dialog.promptTemplate" type="textarea" :rows="3" :placeholder="dialog.isEdit ? '为保护内容，编辑时需重新输入提示词' : '系统提示词，仅用于创建与更新，不会回显'" />
          </el-form-item>
        </el-form>
        <span slot="footer">
          <el-button size="small" @click="dialog.visible = false">取消</el-button>
          <el-button
            size="small"
            type="primary"
            :loading="dialog.submitting"
            :disabled="!dialog.name.trim() || !dialog.category.trim() || !dialog.description.trim() || !dialog.persona.trim() || !dialog.promptTemplate.trim() || !validToolPolicy(dialog.toolPolicyJson)"
            @click="save"
          >保存</el-button>
        </span>
      </el-dialog>
    </template>
  </section>
</template>

<script>
import { createExpert, getExpert, listExperts, removeExpert, updateExpert } from '../../api/expert'
import { hasPermission } from '../../utils/permission'
import PageState from '../../components/common/PageState.vue'

export default {
  components: { PageState },
  data() {
    return {
      loading: true,
      error: null,
      items: [],
      dialog: { visible: false, loading: false, isEdit: false, id: null, name: '', category: '', description: '', persona: '', methodology: '', toolPolicyJson: '{"skills":[]}', promptTemplate: '', rowVersion: null, submitting: false },
      pageAlive: true
    }
  },
  computed: {
    canWrite() {
      return hasPermission(this.$store.state.auth.role, 'expert.mine.write')
    },
    errorTitle() {
      return this.error && this.error.status === 403 ? '暂无我的专家权限' : '我的专家暂不可用'
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
        this.items = await listExperts({ scope: 'mine' })
      } catch (error) {
        if (this.pageAlive) this.error = error
      } finally {
        if (this.pageAlive) this.loading = false
      }
    },
    openCreate() {
      this.dialog = { visible: true, loading: false, isEdit: false, id: null, name: '', category: '', description: '', persona: '', methodology: '', toolPolicyJson: '{"skills":[]}', promptTemplate: '', rowVersion: null, submitting: false }
    },
    async openEdit(item) {
      this.dialog = { visible: true, loading: true, isEdit: true, id: item.id, name: '', category: '', description: '', persona: '', methodology: '', toolPolicyJson: '', promptTemplate: '', rowVersion: null, submitting: false }
      try {
        const detail = await getExpert({ id: item.id, type: 'expert' })
        if (!this.pageAlive) return
        this.dialog = {
          ...this.dialog, loading: false,
          name: detail.name, category: detail.category || '', description: detail.description || '',
          persona: detail.persona || '', methodology: detail.methodology || '',
          toolPolicyJson: detail.toolPolicy || '', rowVersion: detail.rowVersion
        }
      } catch (error) {
        if (this.pageAlive) {
          this.$message.error(error.message || '详情暂不可用，请重试。')
          this.dialog.visible = false
        }
      }
    },
    validToolPolicy(text) {
      if (!text || !text.trim()) return true
      try {
        JSON.parse(text)
        return true
      } catch (error) {
        return false
      }
    },
    async save() {
      this.dialog.submitting = true
      const payload = {
        name: this.dialog.name.trim(),
        category: this.dialog.category.trim(),
        description: this.dialog.description.trim(),
        persona: this.dialog.persona.trim(),
        methodology: this.dialog.methodology.trim() || undefined,
        promptTemplate: this.dialog.promptTemplate.trim()
      }
      if (this.dialog.toolPolicyJson.trim()) payload.toolPolicyJson = this.dialog.toolPolicyJson.trim()
      try {
        if (this.dialog.isEdit) {
          payload.rowVersion = this.dialog.rowVersion
          await updateExpert({ id: this.dialog.id, payload })
          this.$message.success('专家已更新。')
        } else {
          await createExpert(payload)
          this.$message.success('专家已创建。')
        }
        this.dialog.visible = false
        await this.load()
      } catch (error) {
        this.handleWriteError(error)
      } finally {
        this.dialog.submitting = false
      }
    },
    confirmDelete(item) {
      this.$confirm(`确认删除专家「${item.name}」？删除后将无法恢复。`, '删除专家', {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(async () => {
        try {
          await removeExpert({ id: item.id })
          this.$message.success('专家已删除。')
          await this.load()
        } catch (error) {
          this.handleWriteError(error)
        }
      }).catch(() => {})
    },
    handleWriteError(error) {
      if (!this.pageAlive) return
      if (error.status === 409) {
        this.$message.warning((error.message || '专家已被其他会话修改。') + '（已刷新）')
        this.load()
      } else if (error.status === 403) {
        this.$message.error(error.message || '你没有执行该操作的权限。')
      } else if (error.status === 422) {
        this.$message.error(error.message || '提交内容不符合要求。')
      } else {
        this.$message.error(error.message || '操作失败，请重试。')
      }
    }
  }
}
</script>
