<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { getPregnancy, getSetting } from './utils/db.js'
import TabBar from './components/TabBar.vue'
import PinLock from './components/PinLock.vue'
import Toast from './components/Toast.vue'

const router = useRouter()
const route = useRoute()
const ready = ref(false)
const locked = ref(false)
const toastMsg = ref('')

function showToast(msg) {
  toastMsg.value = msg
  setTimeout(() => { toastMsg.value = '' }, 2600)
}

// expose globally for child components
window.__showToast = showToast

onMounted(async () => {
  const pregnancy = await getPregnancy()
  if (!pregnancy && route.name !== 'setup') {
    router.replace('/setup')
  }
  const pinEnabled = await getSetting('pinEnabled', false)
  if (pinEnabled) locked.value = true
  ready.value = true
})

function onUnlocked() { locked.value = false }
</script>

<template>
  <PinLock v-if="locked" @unlocked="onUnlocked" />
  <template v-else-if="ready">
    <router-view />
    <TabBar v-if="route.name !== 'setup'" />
  </template>
  <Toast v-if="toastMsg" :message="toastMsg" />
</template>