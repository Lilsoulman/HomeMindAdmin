<template>
  <section class="favorites-page">
    <div v-if="loading" class="overview-page__loading"><i class="el-icon-loading" /> 正在加载收藏</div>
    <PageState v-else-if="error" type="error" :title="errorTitle" :description="error.message" @retry="load" />

    <template v-else>
      <section class="overview-intro">
        <div>
          <p class="eyebrow">个人空间</p>
          <h1>我的偏好</h1>
          <p>餐厅、旅行与素材收藏。私密收藏仅你自己可见。</p>
        </div>
      </section>

      <section class="surface-panel favorites-panel">
        <div class="confirmations-toolbar">
          <el-select v-model="category" placeholder="全部分类" size="small" @change="load">
            <el-option v-for="item in categories" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
          <el-select v-model="visibility" placeholder="全部可见性" size="small" @change="load">
            <el-option v-for="item in visibilities" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
          <el-button v-if="canWrite" size="small" type="primary" @click="openCreate">新增收藏</el-button>
        </div>

        <PageState v-if="!items.length" title="暂无收藏" description="当前筛选条件下没有收藏内容。" />
        <ul v-else class="favorite-list">
          <li v-for="item in items" :key="item.id">
            <div class="favorite-list__head">
              <el-tag size="small" effect="plain">{{ categoryLabel(item.category) }}</el-tag>
              <strong>{{ item.name }}</strong>
              <el-tag :type="visibilityTagType(item.visibility)" size="small">{{ visibilityLabel(item.visibility) }}</el-tag>
            </div>
            <p v-if="detailSummary(item)" class="favorite-list__detail">{{ detailSummary(item) }}</p>
            <div v-if="canWrite" class="favorite-list__actions">
              <el-button size="mini" @click="openEdit(item)">编辑</el-button>
              <el-button size="mini" type="danger" plain @click="confirmDelete(item)">删除</el-button>
            </div>
          </li>
        </ul>
      </section>

      <AppDialog v-model="dialog.visible" :title="dialog.isEdit ? '编辑收藏' : '新增收藏'" width="480px" :close-on-click-modal="false">
        <el-form label-width="86px" size="small">
          <el-form-item label="分类" required>
            <el-select v-model="dialog.category" style="width: 100%">
              <el-option v-for="item in categoryOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="名称" required>
            <el-input v-model="dialog.name" maxlength="128" placeholder="店铺、地点或素材名称" />
          </el-form-item>
          <el-form-item label="可见性" required>
            <el-radio-group v-model="dialog.visibility">
              <el-radio label="private">仅自己</el-radio>
              <el-radio label="family">家庭成员</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="详情 JSON">
            <el-input v-model="dialog.detailJson" type="textarea" :rows="3" placeholder="可选，例如 {&quot;cuisine&quot;:&quot;面食&quot;,&quot;tags&quot;:[&quot;面&quot;],&quot;note&quot;:&quot;常去&quot;}" />
          </el-form-item>
        </el-form>
        <span slot="footer">
          <el-button size="small" @click="dialog.visible = false">取消</el-button>
          <el-button
            size="small"
            type="primary"
            :loading="dialog.submitting"
            :disabled="!dialog.category || !dialog.name.trim()"
            @click="save"
          >保存</el-button>
        </span>
      </AppDialog>
    </template>
  </section>
</template>

<script>
import { createFavorite, listFavorites, removeFavorite, updateFavorite } from '../../api/favorite'
import { hasPermission } from '../../utils/permission'
import PageState from '../../components/common/PageState.vue'

const categoryLabels = { restaurant: '餐厅', travel: '旅行', material: '素材' }

export default {
  components: { PageState },
  data() {
    return {
      loading: true,
      error: null,
      category: '',
      visibility: '',
      items: [],
      dialog: { visible: false, isEdit: false, id: null, category: 'restaurant', name: '', visibility: 'private', detailJson: '', submitting: false },
      pageAlive: true
    }
  },
  computed: {
    canWrite() {
      return hasPermission(this.$store.state.auth.role, 'life.favorite.write')
    },
    categories() {
      return [
        { value: '', label: '全部分类' },
        { value: 'restaurant', label: '餐厅' },
        { value: 'travel', label: '旅行' },
        { value: 'material', label: '素材' }
      ]
    },
    categoryOptions() {
      return this.categories.filter((item) => item.value)
    },
    visibilities() {
      return [
        { value: '', label: '全部可见性' },
        { value: 'private', label: '仅自己' },
        { value: 'family', label: '家庭成员' }
      ]
    },
    errorTitle() {
      return this.error && this.error.status === 403 ? '暂无收藏权限' : '收藏暂不可用'
    }
  },
  created() {
    this.load()
  },
  unmounted() {
    this.pageAlive = false
  },
  methods: {
    async load() {
      this.loading = true
      this.error = null
      try {
        this.items = await listFavorites({ category: this.category, visibility: this.visibility })
      } catch (error) {
        if (this.pageAlive) this.error = error
      } finally {
        if (this.pageAlive) this.loading = false
      }
    },
    openCreate() {
      this.dialog = { visible: true, isEdit: false, id: null, category: 'restaurant', name: '', visibility: 'private', detailJson: '', submitting: false }
    },
    openEdit(item) {
      this.dialog = {
        visible: true, isEdit: true, id: item.id, category: item.category, name: item.name,
        visibility: item.visibility || 'private', detailJson: item.detailJson || '', submitting: false
      }
    },
    async save() {
      this.dialog.submitting = true
      const payload = {
        category: this.dialog.category,
        name: this.dialog.name.trim(),
        visibility: this.dialog.visibility,
        detailJson: this.dialog.detailJson.trim() || null
      }
      try {
        if (this.dialog.isEdit) {
          await updateFavorite({ id: this.dialog.id, payload })
          this.$message.success('收藏已更新。')
        } else {
          await createFavorite(payload)
          this.$message.success('收藏已创建。')
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
      this.$confirm(`确认删除收藏「${item.name}」？删除后将无法恢复。`, '删除收藏', {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(async () => {
        try {
          await removeFavorite({ id: item.id })
          this.$message.success('收藏已删除。')
          await this.load()
        } catch (error) {
          this.handleWriteError(error)
        }
      }).catch(() => {})
    },
    handleWriteError(error) {
      if (!this.pageAlive) return
      if (error.status === 409) {
        this.$message.warning((error.message || '收藏状态已变化。') + '（已刷新）')
        this.load()
      } else if (error.status === 403) {
        this.$message.error(error.message || '仅本人或家庭管理员可修改该收藏。')
      } else if (error.status === 422) {
        this.$message.error(error.message || '提交内容不符合要求。')
      } else {
        this.$message.error(error.message || '操作失败，请重试。')
      }
    },
    detailSummary(item) {
      if (!item.detailJson) return ''
      try {
        const parsed = JSON.parse(item.detailJson)
        const parts = []
        if (parsed.note) parts.push(parsed.note)
        if (Array.isArray(parsed.tags)) parts.push(parsed.tags.join('、'))
        return parts.join(' · ') || item.detailJson
      } catch (error) {
        return ''
      }
    },
    categoryLabel(category) { return categoryLabels[category] || category },
    visibilityLabel(visibility) { return visibility === 'family' ? '家庭成员' : '仅自己' },
    visibilityTagType(visibility) { return visibility === 'family' ? 'success' : 'info' }
  }
}
</script>
