module.exports = {
  devServer: {
    port: 8080,
    proxy: process.env.VUE_APP_API_PROXY_TARGET
      ? {
          '/api': {
            target: process.env.VUE_APP_API_PROXY_TARGET,
            changeOrigin: true
          }
        }
      : undefined
  },
  css: {
    sourceMap: process.env.NODE_ENV !== 'production'
  }
}
