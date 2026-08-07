<template>
  <section class="authorizations-page">
    <section class="overview-intro">
      <div>
        <p class="eyebrow">开发控制台</p>
        <h1>成员授权</h1>
        <p>为家庭成员配置各连接器的可用范围。保存即替换该成员的全部现有范围。</p>
      </div>
    </section>

    <div class="authorizations-grid">
      <section class="surface-panel auth-members-panel">
        <header class="panel-heading">
          <div><p class="eyebrow">成员</p><h2>选择成员</h2></div>
        </header>
        <div v-if="membersLoading" class="overview-page__loading"><i class="el-icon-loading" /> 正在加载成员</div>
        <PageState v-else-if="membersError" type="error" title="成员列表暂不可用" :description="membersError.message" @retry="loadMembers" />
        <PageState v-else-if="!members.length" title="暂无成员" description="当前家庭没有可授权的成员。" />
        <ul v-else class="auth-member-list">
          <li
            v-for="member in members"
            :key="member.userId"
            :class="{ 'auth-member-list__item--active': selectedMember && selectedMember.userId === member.userId }"
            @click="selectedMember = member"
          >
            <strong>{{ member.displayName }}</strong>
            <span>{{ roleLabel(member.role) }}</span>
            <el-tag v-if="member.status !== 'active'" size="small" type="info" effect="plain">已停用</el-tag>
          </li>
        </ul>
      </section>

      <section class="surface-panel auth-config-panel">
        <header class="panel-heading">
          <div><p class="eyebrow">范围配置</p><h2>{{ selectedMember ? selectedMember.displayName + ' 的授权' : '未选择成员' }}</h2></div>
        </header>

        <PageState v-if="!selectedMember" title="请先选择成员" description="从左侧选择成员后，在这里配置其连接器范围。" />
        <template v-else>
          <div v-if="connectorsError" class="authorizations-error">
            <p>{{ connectorsError.message }}</p>
            <el-button size="small" @click="loadConnectors">重试</el-button>
          </div>
          <template v-else>
            <PageState v-if="!connectors.length" title="暂无连接器" description="请先在家庭连接器页创建实例。" />
            <el-form v-else label-width="100px" size="small" class="auth-config-form">
              <el-form-item label="连接器" required>
                <el-select v-model="selectedConnectorId" placeholder="选择连接器" style="width: 100%">
                  <el-option
                    v-for="connector in connectors"
                    :key="connector.id"
                    :label="`${connector.name}（${connector.providerName}）`"
                    :value="connector.id"
                  />
                </el-select>
              </el-form-item>
              <el-form-item label="范围" required>
                <el-input
                  v-model="scopesText"
                  type="textarea"
                  :rows="3"
                  placeholder="范围以逗号分隔，例如 smart_home.read, smart_home.light.write（1-32 个）"
                />
              </el-form-item>
              <el-form-item>
                <el-button
                  type="primary"
                  :loading="submitting"
                  :disabled="!selectedConnectorId || !scopesText.trim() || selectedMember.status !== 'active'"
                  @click="save"
                >
                  保存授权
                </el-button>
              </el-form-item>
            </el-form>
          </template>
        </template>
      </section>
    </div>
  </section>
</template>

<script>
import { listConnectors, updateMemberAuthorization } from '../../api/connector'
import { listTenantMembers } from '../../api/tenant'
import PageState from '../../components/common/PageState.vue'

export default {
  components: { PageState },
  data() {
    return {
      members: [],
      membersLoading: true,
      membersError: null,
      connectors: [],
      connectorsLoading: true,
      connectorsError: null,
      selectedMember: null,
      selectedConnectorId: null,
      scopesText: '',
      submitting: false,
      pageAlive: true
    }
  },
  created() {
    this.loadMembers()
    this.loadConnectors()
  },
  destroyed() {
    this.pageAlive = false
  },
  methods: {
    async loadMembers() {
      this.membersLoading = true
      this.membersError = null
      try {
        this.members = await listTenantMembers({ homeId: this.$store.state.auth.tenantId })
      } catch (error) {
        if (this.pageAlive) this.membersError = error
      } finally {
        if (this.pageAlive) this.membersLoading = false
      }
    },
    async loadConnectors() {
      this.connectorsLoading = true
      this.connectorsError = null
      try {
        this.connectors = await listConnectors()
      } catch (error) {
        if (this.pageAlive) this.connectorsError = error
      } finally {
        if (this.pageAlive) this.connectorsLoading = false
      }
    },
    async save() {
      const scopes = this.scopesText
        .split(',')
        .map((scope) => scope.trim())
        .filter((scope) => scope && scope.length <= 128)
      if (!scopes.length || scopes.length > 32) {
        this.$message.warning('范围数量需为 1-32 个。')
        return
      }
      this.submitting = true
      try {
        await updateMemberAuthorization({ id: this.selectedConnectorId, memberUserId: this.selectedMember.userId, scopes })
        this.$message.success(`已保存「${this.selectedMember.displayName}」在所选连接器的授权。`)
        this.scopesText = ''
      } catch (error) {
        if (error.status === 422) {
          this.$message.error(error.message || '范围格式不符合要求。')
        } else if (error.status === 403) {
          this.$message.error('你没有执行该操作的权限。')
        } else {
          this.$message.error(error.message || '保存失败，请重试。')
        }
      } finally {
        this.submitting = false
      }
    },
    roleLabel(role) { return { owner: '户主', admin: '管理员', member: '成员', viewer: '只读' }[role] || role }
  }
}
</script>
