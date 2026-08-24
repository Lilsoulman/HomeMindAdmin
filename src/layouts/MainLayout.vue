<template>
  <el-container class="main-layout">
    <aside class="main-layout__sidebar">
      <router-link class="product-name" to="/app/dashboard">
        <span class="product-name__mark">H</span>
        <span>HomeMind</span>
      </router-link>
      <p class="main-layout__area">{{ area }}</p>
      <el-menu :default-active="$route.path" router class="main-layout__menu">
        <el-menu-item v-for="item in visibleItems" :key="item.index" :index="item.index">
          <i :class="item.icon" />
          <span>{{ item.label }}</span>
        </el-menu-item>
      </el-menu>
      <div class="main-layout__bottom">
        <div class="profile-link">
          <el-avatar :size="32">{{ avatarText }}</el-avatar>
          <span>{{ displayName }}</span>
        </div>
        <el-button class="icon-button" icon="el-icon-switch-button" type="text" title="退出登录" @click="handleSignOut" />
      </div>
    </aside>
    <el-container class="main-layout__body">
      <header class="main-layout__header">
        <div>
          <p class="eyebrow">{{ area }}</p>
          <h2>{{ $route.meta.title }}</h2>
        </div>
      </header>
      <main class="main-layout__page">
        <router-view />
      </main>
    </el-container>
  </el-container>
</template>

<script>
import { hasPermission } from '../utils/permission'

export default {
  props: {
    items: { type: Array, required: true },
    area: { type: String, required: true }
  },
  computed: {
    visibleItems() {
      return this.items.filter((item) => hasPermission(this.$store.state.auth.role, item.permission))
    },
    displayName() {
      return (this.$store.state.auth.user && this.$store.state.auth.user.displayName) || '当前成员'
    },
    avatarText() {
      return this.displayName.slice(0, 1)
    },
  },
  methods: {
    async handleSignOut() {
      await this.$store.dispatch('auth/signOut')
      this.$router.replace({ name: 'login' })
    }
  }
}
</script>
