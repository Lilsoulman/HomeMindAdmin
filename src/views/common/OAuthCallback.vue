<template>
  <section class="oauth-callback-page">
    <div class="overview-page__loading"><i class="el-icon-loading" /> 正在完成授权，即将返回我的连接</div>
  </section>
</template>

<script>
import { getAuthorizationSession } from '../../api/connector'

export default {
  name: 'OAuthCallback',
  data() {
    return { pageAlive: true }
  },
  created() {
    const sessionId = window.sessionStorage.getItem('oauthSessionId')
    const finish = () => {
      window.sessionStorage.removeItem('oauthSessionId')
      if (this.pageAlive) this.$router.replace('/app/connections')
    }
    if (!sessionId) {
      finish()
      return
    }
    getAuthorizationSession({ id: Number(sessionId) })
      .catch(() => {})
      .finally(finish)
  },
  unmounted() {
    this.pageAlive = false
  }
}
</script>
