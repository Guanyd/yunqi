<script setup>
import { useRoute } from 'vue-router'

const route = useRoute()

/**
 * 底部导航图标：统一 24×24 线性图标，1.7 描边、圆角端点。
 * 全部手工绘制，避免 emoji 在不同系统上形状/颜色不一致。
 */
const tabs = [
  {
    name: 'home', path: '/', label: '首页',
    paths: [
      'M3.6 10.7 12 4.2l8.4 6.5',
      'M5.6 9.6V18a1.8 1.8 0 0 0 1.8 1.8h9.2A1.8 1.8 0 0 0 18.4 18V9.6',
      'M9.8 19.8v-5.2a1.2 1.2 0 0 1 1.2-1.2h2a1.2 1.2 0 0 1 1.2 1.2v5.2'
    ]
  },
  {
    name: 'visits', path: '/visits', label: '产检',
    paths: [
      'M8.5 4.6H6.6A1.6 1.6 0 0 0 5 6.2v12.2A1.6 1.6 0 0 0 6.6 20h10.8a1.6 1.6 0 0 0 1.6-1.6V6.2a1.6 1.6 0 0 0-1.6-1.6h-1.9',
      'M9 3.4h6a1 1 0 0 1 1 1v2H8v-2a1 1 0 0 1 1-1z',
      'M12 10.4v5.2',
      'M9.4 13h5.2'
    ]
  },
  {
    name: 'expenses', path: '/expenses', label: '花费',
    paths: [
      'M3.5 8.2V6.6a2.1 2.1 0 0 1 2.1-2.1h10.8',
      'M3.5 8.2h14.4a2.1 2.1 0 0 1 2.1 2.1v7.6a2.1 2.1 0 0 1-2.1 2.1H5.6a2.1 2.1 0 0 1-2.1-2.1z',
      'M20 12.1h-3.6a2 2 0 0 0 0 4H20',
      'M16.9 14.1h.01'
    ]
  },
  {
    name: 'stages', path: '/stages', label: '阶段',
    paths: [
      'M12 3.8 3.8 8l8.2 4.2L20.2 8z',
      'M3.8 12.2l8.2 4.2 8.2-4.2',
      'M3.8 16.2l8.2 4.2 8.2-4.2'
    ]
  },
  {
    name: 'settings', path: '/settings', label: '我的',
    paths: [
      'M12 12.2a3.8 3.8 0 1 0 0-7.6 3.8 3.8 0 0 0 0 7.6z',
      'M4.9 20c0-3.6 3.2-6.4 7.1-6.4s7.1 2.8 7.1 6.4'
    ]
  }
]

function isActive(tab) {
  if (tab.name === 'visits') return route.path.startsWith('/visits')
  return route.name === tab.name
}
</script>

<template>
  <nav class="tab-dock" role="navigation" aria-label="主导航">
    <router-link
      v-for="tab in tabs" :key="tab.name"
      :to="tab.path"
      class="tab-dock-item"
      :class="{ active: isActive(tab) }"
      :aria-label="tab.label"
      :aria-current="isActive(tab) ? 'page' : undefined"
    >
      <span class="tab-indicator" aria-hidden="true"></span>
      <span class="tab-glyph" aria-hidden="true">
        <svg viewBox="0 0 24 24" focusable="false">
          <path v-for="(d, i) in tab.paths" :key="i" :d="d" />
        </svg>
      </span>
      <span class="tab-label">{{ tab.label }}</span>
    </router-link>
  </nav>
</template>
