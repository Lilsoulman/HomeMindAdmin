<template>
  <section class="setup-page">
    <div v-if="loading" class="overview-page__loading"><i class="el-icon-loading" /> 正在加载 Provider 目录</div>
    <PageState v-else-if="error" type="error" :title="errorTitle" :description="error.message" @retry="load" />

    <template v-else>
      <section class="overview-intro">
        <div>
          <p class="eyebrow">开发控制台</p>
          <h1>首次部署向导</h1>
          <p>选择服务提供方，创建家庭级连接器。凭据以服务端托管引用形式提供。</p>
        </div>
      </section>

      <section class="surface-panel setup-panel">
        <p class="eyebrow">第 1 步 · 选择提供方</p>
        <div class="provider-grid">
          <button
            v-for="provider in providers"
            :key="provider.id"
            type="button"
            class="provider-card"
            :class="{ 'provider-card--selected': selected === provider.id }"
            @click="selected = provider.id"
          >
            <strong>{{ provider.name }}</strong>
            <p>{{ provider.description || '家庭级服务连接' }}</p>
            <span>{{ typeLabel(provider.connectorType) }}</span>
          </button>
        </div>

        <template v-if="selectedProvider">
          <p class="eyebrow setup-step">第 2 步 · 配置实例</p>
          <el-form label-width="110px" size="small" class="setup-form">
            <el-form-item label="实例名称" required>
              <el-input v-model="form.name" maxlength="128" placeholder="例如：我家 Home Assistant" />
            </el-form-item>
            <el-form-item label="凭据引用" required>
              <el-input v-model="form.credentialRef" placeholder="vault://tenants/12/secrets/home-assistant" />
              <p class="setup-form__hint">仅接受服务端已托管的凭据引用（credentialRef）。浏览器不录入原始令牌或第三方 Key。</p>
            </el-form-item>
            <el-form-item label="绑定范围">
              <el-radio-group v-model="form.bindingScope" :disabled="true">
                <el-radio label="household">家庭级</el-radio>
              </el-radio-group>
              <p class="setup-form__hint">个人级连接（OAuth）将在对应服务发布后开放。</p>
            </el-form-item>
            <el-form-item>
              <el-button
                type="primary"
                :loading="submitting"
                :disabled="!form.name.trim() || !form.credentialRef.trim()"
                @click="create"
              >
                创建并进入详情
              </el-button>
              <el-button :disabled="submitting" @click="$router.push('/console/connectors')">取消</el-button>
            </el-form-item>
          </el-form>
        </template>
      </section>
    </template>
  </section>
</template>

<script>
import { createConnector, listProviders } from '../../api/connector'
import PageState from '../../components/common/PageState.vue'

export default {
  components: { PageState },
  data() {
    return {
      loading: true,
      error: null,
      providers: [],
      selected: null,
      form: { name: '', credentialRef: '', bindingScope: 'household' },
      submitting: false,
      pageAlive: true
    }
  },
  computed: {
    selectedProvider() {
      return this.providers.find((provider) => provider.id === this.selected) || null
    },
    errorTitle() {
      return this.error && this.error.status === 403 ? '暂无连接器权限' : 'Provider 目录暂不可用'
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
        this.providers = await listProviders()
      } catch (error) {
        if (this.pageAlive) this.error = error
      } finally {
        if (this.pageAlive) this.loading = false
      }
    },
    async create() {
      this.submitting = true
      try {
        const connector = await createConnector({
          providerId: this.selectedProvider.id,
          name: this.form.name.trim(),
          credentialRef: this.form.credentialRef.trim(),
          bindingScope: this.form.bindingScope
        })
        this.$message.success('连接器已创建。')
        this.$router.push(`/console/connectors/${connector.id}`)
      } catch (error) {
        if (error.status === 503) {
          this.$message.error(error.message || '安全凭据托管尚未启用（Secret Vault），暂不可创建连接器。')
        } else if (error.status === 422) {
          this.$message.error(error.message || '请检查实例名称与凭据引用格式。')
        } else {
          this.$message.error(error.message || '创建失败，请重试。')
        }
      } finally {
        this.submitting = false
      }
    },
    typeLabel(type) {
      return { smart_home: '智能家居', calendar: '日历', productivity: '效率工具' }[type] || type
    }
  }
}
</script>
