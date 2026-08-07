<template>
  <section class="login-card">
    <div class="login-card__heading">
      <p class="eyebrow">NexusMind</p>
      <h2>登录控制台</h2>
      <p>使用你的家庭账户继续。</p>
    </div>
    <el-alert v-if="errorMessage" :title="errorMessage" type="error" :closable="false" show-icon />
    <el-form ref="form" :model="form" :rules="rules" label-position="top" @submit.native.prevent="submit">
      <el-form-item label="手机号" prop="phone">
        <el-input v-model.trim="form.phone" autocomplete="username" placeholder="请输入手机号" />
      </el-form-item>
      <el-form-item label="密码" prop="password">
        <el-input v-model="form.password" type="password" autocomplete="current-password" show-password placeholder="请输入密码" />
      </el-form-item>
      <el-button class="login-card__submit" type="primary" native-type="submit" :loading="submitting">登录</el-button>
    </el-form>
    <p class="login-card__notice">请勿在非受信任设备上保持登录状态。</p>
  </section>
</template>

<script>
export default {
  data() {
    return {
      form: { phone: '', password: '' },
      submitting: false,
      errorMessage: '',
      rules: {
        phone: [{ required: true, message: '请输入手机号', trigger: 'blur' }],
        password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
      }
    }
  },
  methods: {
    submit() {
      this.$refs.form.validate(async (valid) => {
        if (!valid) return
        this.submitting = true
        this.errorMessage = ''
        try {
          await this.$store.dispatch('auth/signIn', this.form)
          this.$router.replace(this.$route.query.redirect || '/app/overview').catch(() => {})
        } catch (error) {
          this.errorMessage = error.message || '登录失败，请检查账号和密码。'
        } finally {
          this.submitting = false
        }
      })
    }
  }
}
</script>
