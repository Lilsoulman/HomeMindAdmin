<template>
  <section class="mindmap-page">
    <section class="overview-intro">
      <div>
        <p class="eyebrow">个人工具</p>
        <h1>思维导图</h1>
        <p>粘贴 Markdown 或读取本地 .md 文件，在浏览器中生成可缩放、可折叠的导图。</p>
      </div>
    </section>

    <section class="surface-panel mindmap-panel">
      <div class="mindmap-toolbar">
        <el-upload action="#" accept=".md,text/markdown,text/plain" :show-file-list="false" :before-upload="readFile">
          <el-button size="small" plain>读取本地 .md</el-button>
        </el-upload>
        <el-button size="small" :disabled="!markdown.trim() || loading" :loading="loading" @click="generate">生成导图</el-button>
        <el-button size="small" :disabled="!map" @click="fit">适配视图</el-button>
      </div>
      <el-input v-model="markdown" class="mindmap-input" type="textarea" :rows="10" maxlength="100000" show-word-limit placeholder="# 中心主题\n\n## 分支一\n- 要点" />
      <p v-if="error" class="mindmap-error">{{ error }}</p>

      <div v-if="map" class="mindmap-export" aria-label="思维导图导出">
        <el-button size="small" plain @click="exportSvg">导出 SVG</el-button>
        <el-button size="small" plain @click="exportPng">导出 PNG</el-button>
        <el-button size="small" plain @click="exportHtml">导出自包含 HTML</el-button>
        <span v-if="run" class="mindmap-run">已记录运行 #{{ run.id }}</span>
      </div>
      <div class="mindmap-canvas" :class="{ 'mindmap-canvas--empty': !map }">
        <svg ref="svg" aria-label="思维导图" />
        <p v-if="!map">输入 Markdown 后生成导图。</p>
      </div>
    </section>
  </section>
</template>

<script>
import { createMindmapRun } from '../../api/skill'
import { createIdempotencyKey } from '../../utils/idempotency'

const MAX_MARKDOWN_LENGTH = 100000

export default {
  data() {
    return { markdown: '', map: null, root: null, run: null, loading: false, error: '' }
  },
  beforeUnmount() {
    if (this.map) this.map.destroy()
  },
  methods: {
    readFile(file) {
      if (!file || !/\.md$/i.test(file.name)) {
        this.$message.warning('请选择 .md 文件。')
        return false
      }
      if (file.size > MAX_MARKDOWN_LENGTH) {
        this.$message.warning('Markdown 不能超过 100000 个字符。')
        return false
      }
      const reader = new FileReader()
      reader.onload = () => { this.markdown = String(reader.result || '').slice(0, MAX_MARKDOWN_LENGTH) }
      reader.onerror = () => { this.$message.error('读取文件失败，请重试。') }
      reader.readAsText(file)
      return false
    },
    async generate() {
      const markdown = this.markdown.trim()
      if (!markdown || this.loading) return
      if (!window.markmap || !window.markmap.Transformer || !window.markmap.Markmap) {
        this.error = '思维导图资源未加载，请刷新页面后重试。'
        return
      }
      this.loading = true
      this.error = ''
      try {
        const transformer = new window.markmap.Transformer([])
        const transformed = transformer.transform(markdown)
        this.root = transformed.root
        await this.$nextTick()
        if (this.map) this.map.destroy()
        this.map = window.markmap.Markmap.create(this.$refs.svg, { autoFit: true, duration: 0 }, this.root)
        this.run = await createMindmapRun({ markdown, idempotencyKey: createIdempotencyKey() })
      } catch (error) {
        this.error = error.message || '生成导图失败，请重试。'
        this.map = null
      } finally {
        this.loading = false
      }
    },
    fit() { if (this.map) this.map.fit() },
    exportSvg() {
      if (!this.map) return
      const source = new XMLSerializer().serializeToString(this.$refs.svg)
      this.download('mindmap.svg', new Blob([source], { type: 'image/svg+xml;charset=utf-8' }))
    },
    exportPng() {
      if (!this.map) return
      const svg = new XMLSerializer().serializeToString(this.$refs.svg)
      const image = new Image()
      image.onload = () => {
        const box = this.$refs.svg.getBoundingClientRect()
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(box.width * 2))
        canvas.height = Math.max(1, Math.round(box.height * 2))
        const context = canvas.getContext('2d')
        context.scale(2, 2)
        context.fillStyle = '#ffffff'
        context.fillRect(0, 0, box.width, box.height)
        context.drawImage(image, 0, 0, box.width, box.height)
        canvas.toBlob((blob) => this.download('mindmap.png', blob), 'image/png')
      }
      image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
    },
    async exportHtml() {
      if (!this.root) return
      try {
        const base = process.env.BASE_URL || '/'
        const [d3, lib, view] = await Promise.all([
          `${base}vendor/markmap/d3.min.js`,
          `${base}vendor/markmap/markmap-lib.js`,
          `${base}vendor/markmap/markmap-view.js`
        ].map((url) => fetch(url).then((response) => {
          if (!response.ok) throw new Error('资源读取失败')
          return response.text()
        })))
        const data = JSON.stringify(this.root).replace(/</g, '\\u003c')
        const closingScript = '</' + 'script>'
        const html = `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>思维导图</title><style>html,body,svg{height:100%;margin:0;width:100%}</style><body><svg id="mindmap"></svg><script>${d3}${closingScript}<script>${lib}${closingScript}<script>${view}${closingScript}<script>markmap.Markmap.create(document.getElementById('mindmap'),{autoFit:true},${data})${closingScript}</body></html>`
        this.download('mindmap.html', new Blob([html], { type: 'text/html;charset=utf-8' }))
      } catch (error) {
        this.$message.error('导出自包含 HTML 失败，请重试。')
      }
    },
    download(name, blob) {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = name
      anchor.click()
      URL.revokeObjectURL(url)
    }
  }
}
</script>
