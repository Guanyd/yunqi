<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { getPregnancy, getSetting } from './utils/db.js'
import TabBar from './components/TabBar.vue'
import PinLock from './components/PinLock.vue'
import Toast from './components/Toast.vue'
import BootSplash from './components/BootSplash.vue'

const router = useRouter()
const route = useRoute()
const ready = ref(false)
const locked = ref(false)
const toastMsg = ref('')

// 启动层：ready 之后再做一次淡出，避免首帧闪白。
// 同时设一个最短展示时间，免得快机器上一闪而过显得抖动。
const SPLASH_MIN_MS = 420
// 兜底：IndexedDB 万一读不出来，启动层也不能一直盖着
const SPLASH_MAX_MS = 3000
const splashVisible = ref(true)
const splashFading = ref(false)
let splashHidden = false

function hideSplash(startedAt) {
  if (splashHidden) return
  splashHidden = true
  const wait = Math.max(0, SPLASH_MIN_MS - (Date.now() - startedAt))
  setTimeout(() => {
    splashFading.value = true
    setTimeout(() => { splashVisible.value = false }, 300)
  }, wait)
}

function showToast(msg) {
  toastMsg.value = msg
  setTimeout(() => { toastMsg.value = '' }, 2600)
}

// expose globally for child components
window.__showToast = showToast

onMounted(async () => {
  const startedAt = Date.now()
  // 兜底：IndexedDB 万一卡住，启动层也不能永久盖住界面。
  // 只撤掉启动层，不置 ready —— 没读到 PIN 设置前绝不渲染正文。
  setTimeout(() => hideSplash(startedAt), SPLASH_MAX_MS)

  const pregnancy = await getPregnancy()
  if (!pregnancy && route.name !== 'setup') {
    router.replace('/setup')
  }
  const pinEnabled = await getSetting('pinEnabled', false)
  if (pinEnabled) locked.value = true
  ready.value = true
  hideSplash(startedAt)
})

function onUnlocked() { locked.value = false }
</script>

<template>
  <BootSplash v-if="splashVisible" :fading="splashFading" />
  <PinLock v-if="locked" @unlocked="onUnlocked" />
  <template v-else-if="ready">
    <router-view />
    <TabBar v-if="route.name !== 'setup'" />
  </template>
  <Toast v-if="toastMsg" :message="toastMsg" />
</template>