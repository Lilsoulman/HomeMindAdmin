<template>
  <section class="experts-page">
    <div v-if="loading" class="overview-page__loading"><i class="el-icon-loading" /> 正在加载专家目录</div>
    <PageState v-else-if="error" type="error" :title="errorTitle" :description="error.message" @retry="load" />

    <template v-else>
      <section class="overview-intro">
        <div>
          <p class="eyebrow">开发控制台</p>
          <h1>专家与 Skill</h1>
          <p>专家目录与版本详情。提示词与思考链不会出现在任何页面。</p>
        </div>
      </section>

      <section class="surface-panel experts-panel">
        <div class="confirmations-toolbar">
          <el-input v-model="query" size="small" placeholder="搜索名称或描述" clearable style="width: 220px" @keyup.enter.native="load" @clear="load" />
          <el-select v-model="type" placeholder="全部类型" size="small" @change="load">
            <el-option v-for="item in types" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
          <el-select v-model="scope" placeholder="全部来源" size="small" @change="load">
            <el-option v-for="item in scopes" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
          <el-button size="small" type="primary" @click="load">查询</el-button>
        </div>

        <PageState v-if="!items.length" title="暂无专家" description="当前筛选条件下没有专家条目。" />
        <ul v-else class="expert-list">
          <li v-for="item in items" :key="item.id" tabindex="0" role="button" @click="openDetail(item)" @keyup.enter="openDetail(item)">
            <div class="expert-list__head">
              <strong>{{ item.name }}</strong>
              <el-tag size="small" effect="plain">{{ item.catalogType === 'group' ? '团队' : '专家' }}</el-tag>
              <el-tag v-if="item.source === 'mine'" size="small" type="success" effect="plain">自建</el-tag>
              <span class="expert-list__credits">预估 {{ item.estimatedCredits }} 积分</span>
            </div>
            <p>{{ item.description || '暂无描述。' }}</p>
            <div class="expert-list__meta"><span>分类：{{ item.category || '—' }}</span><span>编码：{{ item.code }}</span></div>
          </li>
        </ul>
      </section>

      <el-dialog title="专家详情" :visible.sync="detailDialog.visible" width="560px">
        <div v-if="detailDialog.loading" class="overview-page__loading"><i class="el-icon-loading" /> 正在加载</div>
        <PageState v-else-if="detailDialog.error" type="error" title="详情暂不可用" :description="detailDialog.error.message" @retry="openDetail(detailDialog.item)" />
        <div v-else-if="detailDialog.detail" class="expert-detail">
          <div class="expert-detail__head">
            <h3>{{ detailDialog.detail.name }}</h3>
            <p>{{ detailDialog.detail.description }}</p>
          </div>
          <dl class="activity-detail-dl">
            <div><dt>版本</dt><dd>v{{ detailDialog.detail.version }}（版本 ID {{ detailDialog.detail.versionId }}）</dd></div>
            <div><dt>分类</dt><dd>{{ detailDialog.detail.category }}</dd></div>
            <div><dt>来源</dt><dd>{{ detailDialog.detail.source === 'mine' ? '本人自建' : '平台基础' }}</dd></div>
            <div v-if="detailDialog.detail.privacyScope"><dt>隐私范围</dt><dd>{{ detailDialog.detail.privacyScope }}</dd></div>
            <div v-if="detailDialog.detail.persona"><dt>角色设定</dt><dd>{{ detailDialog.detail.persona }}</dd></div>
            <div v-if="detailDialog.detail.methodology"><dt>方法论</dt><dd>{{ detailDialog.detail.methodology }}</dd></div>
            <div v-if="detailDialog.detail.toolPolicy"><dt>能力策略</dt><dd><pre class="expert-detail__json">{{ detailDialog.detail.toolPolicy }}</pre></dd></div>
            <div v-if="detailDialog.detail.outputSchema"><dt>输出结构</dt><dd><pre class="expert-detail__json">{{ detailDialog.detail.outputSchema }}</pre></dd></div>
            <div><dt>预估积分</dt><dd>{{ detailDialog.detail.estimatedCredits }}</dd></div>
          </dl>
        </div>
        <span slot="footer">
          <el-button size="small" @click="detailDialog.visible = false">关闭</el-button>
        </span>
      </el-dialog>
    </template>
  </section>
</template>

<script>
import { getExpert, listExperts } from '../../api/expert'
import PageState from '../../components/common/PageState.vue'

export default {
  components: { PageState },
  data() {
    return {
      loading: true,
      error: null,
      items: [],
      query: '',
      type: '',
      scope: '',
      detailDialog: { visible: false, item: null, detail: null, loading: false, error: null },
      pageAlive: true
    }
  },
  computed: {
    types() {
      return [
        { value: '', label: '全部类型' },
        { value: 'expert', label: '专家' },
        { value: 'group', label: '团队' }
      ]
    },
    scopes() {
      return [
        { value: '', label: '全部来源' },
        { value: 'basic', label: '平台基础' },
        { value: 'mine', label: '本人自建' },
        { value: 'all', label: '基础+自建' }
      ]
    },
    errorTitle() {
      return this.error && this.error.status === 403 ? '暂无专家目录权限' : '专家目录暂不可用'
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
        this.items = await listExperts({ query: this.query, type: this.type, scope: this.scope })
      } catch (error) {
        if (this.pageAlive) this.error = error
      } finally {
        if (this.pageAlive) this.loading = false
      }
    },
    async openDetail(item) {
      this.detailDialog = { visible: true, item, detail: null, loading: true, error: null }
      try {
        this.detailDialog.detail = await getExpert({ id: item.id, type: item.catalogType })
      } catch (error) {
        if (this.pageAlive) this.detailDialog.error = error
      } finally {
        if (this.pageAlive) this.detailDialog.loading = false
      }
    }
  }
}
</script>
