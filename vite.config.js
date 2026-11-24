import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

// 部署在 GitHub Pages 的项目站（https://guanyd.github.io/yunqi/），
// 所有资源与 PWA 的 start_url / scope 都必须带这个子路径前缀。
const BASE = '/yunqi/'

export default defineConfig({
  base: BASE,
  // 默认缓存目录是 node_modules/.vite，某些受限环境（沙箱、只读依赖目录）
  // 无法在其中创建临时目录，会导致依赖预构建失败、页面 504。
  // 改到项目根下，构建产物与依赖目录都不受影响。
  cacheDir: '.vite-cache',
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: '孕期记录',
        short_name: '孕期记录',
        description: '本地孕期产检与花费记录',
        lang: 'zh-CN',
        theme_color: '#f8f5f0',
        background_color: '#f8f5f0',
        display: 'standalone',
        orientation: 'portrait',
        start_url: BASE,
        scope: BASE,
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-192-maskable.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: 'icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        runtimeCaching: []
      }
    })
  ],
  test: {
    environment: 'node'
  }
})
