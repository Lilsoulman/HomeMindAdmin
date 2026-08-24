<template>
  <section class="placeholder-page" aria-live="polite">
    <el-empty description="等待 Core API 契约发布" />
    <p class="eyebrow">受控不可用</p>
    <h1>{{ $route.meta.title }}</h1>
    <p>{{ $route.meta.feature }}需要字段级 Swagger 契约后才能接入。当前不会请求旧接口或展示模拟数据。</p>
  </section>
</template>
