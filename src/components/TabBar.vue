<script setup>
import { useRoute } from 'vue-router'
const route = useRoute()
const tabs = [
  { name: 'home', path: '/', icon: '🏠', label: '首页' },
  { name: 'visits', path: '/visits', icon: '📋', label: '产检' },
  { name: 'expenses', path: '/expenses', icon: '💰', label: '花费' },
  { name: 'stages', path: '/stages', icon: '📖', label: '阶段' },
  { name: 'settings', path: '/settings', icon: '⚙️', label: '我的' }
]
function isActive(tab) {
  if (tab.name === 'visits') return route.path.startsWith('/visits')
  return route.name === tab.name
}
</script>

<template>
  <nav class="tab-bar" role="navigation" aria-label="主导航">
    <router-link
      v-for="tab in tabs" :key="tab.name"
      :to="tab.path"
      class="tab-item"
      :class="{ active: isActive(tab) }"
      :aria-current="isActive(tab) ? 'page' : undefined"
    >
      <span class="tab-icon">{{ tab.icon }}</span>
      <span>{{ tab.label }}</span>
    </router-link>
  </nav>
</template>