<template>
  <section class="my-skills-page">
    <div v-if="loading" class="overview-page__loading"><i class="el-icon-loading" /> 正在加载我的技能</div>
    <PageState v-else-if="error" type="error" :title="errorTitle" :description="error.message" @retry="load" />
    <template v-else>
      <section class="overview-intro">
        <div><p class="eyebrow">个人空间</p><h1>我的技能</h1><p>仅展示你的用户级技能。此处只读；提示词仅在本人详情中可见。</p></div>
      </section>
      <section class="surface-panel experts-panel">
        <PageState v-if="!items.length" title="暂无技能" description="当前没有可查看的个人技能。" />
        <ul v-else class="expert-list">
          <li v-for="item in items" :key="item.id" tabindex="0" role="button" @click="openDetail(item)" @keyup.enter="openDetail(item)">
            <div class="expert-list__head"><strong>{{ item.name }}</strong><el-tag size="small" effect="plain">{{ statusLabel(item.status) }}</el-tag></div>
            <div class="expert-list__meta"><span>更新时间：{{ formatTime(item.updatedAt) }}</span></div>
          </li>
        </ul>
      </section>
      <AppDialog v-model="detailDialog.visible" title="技能详情" width="560px">
        <div v-if="detailDialog.loading" class="overview-page__loading"><i class="el-icon-loading" /> 正在加载</div>
        <PageState v-else-if="detailDialog.error" type="error" title="详情暂不可用" :description="detailDialog.error.message" @retry="openDetail(detailDialog.item)" />
        <dl v-else-if="detailDialog.detail" class="activity-detail-dl">
          <div><dt>名称</dt><dd>{{ detailDialog.detail.name }}</dd></div>
          <div><dt>分类</dt><dd>{{ detailDialog.detail.category || '—' }}</dd></div>
          <div><dt>状态</dt><dd>{{ statusLabel(detailDialog.detail.status) }}</dd></div>
          <div v-if="detailDialog.detail.description"><dt>说明</dt><dd>{{ detailDialog.detail.description }}</dd></div>
          <div v-if="detailDialog.detail.prompt"><dt>提示词</dt><dd><pre class="expert-detail__json">{{ detailDialog.detail.prompt }}</pre></dd></div>
        </dl>
        <span slot="footer"><el-button size="small" @click="detailDialog.visible = false">关闭</el-button></span>
      </AppDialog>
    </template>
  </section>
</template>

<script>
import { getSkill, listSkills } from '../../api/skill'
import PageState from '../../components/common/PageState.vue'

export default {
  components: { PageState },
  data() { return { loading: true, error: null, items: [], detailDialog: { visible: false, item: null, detail: null, loading: false, error: null }, pageAlive: true } },
  computed: { errorTitle() { return this.error && this.error.status === 403 ? '暂无我的技能权限' : '我的技能暂不可用' } },
  created() { this.load() },
  unmounted() { this.pageAlive = false },
  methods: {
    async load() {
      this.loading = true; this.error = null
      try { this.items = await listSkills({ scope: 'mine' }) } catch (error) { if (this.pageAlive) this.error = error } finally { if (this.pageAlive) this.loading = false }
    },
    async openDetail(item) {
      this.detailDialog = { visible: true, item, detail: null, loading: true, error: null }
      try { this.detailDialog.detail = await getSkill({ id: item.id }) } catch (error) { if (this.pageAlive) this.detailDialog.error = error } finally { if (this.pageAlive) this.detailDialog.loading = false }
    },
    statusLabel(status) { return { enabled: '已启用', disabled: '已停用' }[status] || status || '—' },
    formatTime(value) { return value ? new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value)) : '—' }
  }
}
</script>
