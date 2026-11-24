<script setup>
import { ref } from 'vue'
import { getSetting } from '../utils/db.js'
import { sha256Hex } from '../utils/crypto.js'

const emit = defineEmits(['unlocked'])
const pin = ref('')
const error = ref('')
const attempts = ref(0)
const lockUntil = ref(0)
const now = ref(Date.now())

// tick for countdown
let timer = null
function startTick() {
  timer = setInterval(() => { now.value = Date.now() }, 1000)
}
startTick()

async function sha256(str) {
  return sha256Hex(str)
}

async function submit() {
  if (Date.now() < lockUntil.value) return
  if (pin.value.length !== 4) { error.value = '请输入4位数字'; return }
  let hash
  try {
    hash = await sha256(pin.value)
  } catch {
    error.value = '校验失败，请刷新页面重试'
    return
  }
  const stored = await getSetting('pinHash')
  if (hash === stored) {
    clearInterval(timer)
    emit('unlocked')
  } else {
    attempts.value++
    pin.value = ''
    if (attempts.value >= 5) {
      lockUntil.value = Date.now() + 60000
      attempts.value = 0
      error.value = '错误次数过多，请60秒后再试'
    } else {
      error.value = `密码错误（${attempts.value}/5）`
    }
  }
}

const remaining = () => Math.max(0, Math.ceil((lockUntil.value - now.value) / 1000))
</script>

<template>
  <div class="page" style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100dvh">
    <h2 style="margin-bottom:24px">🔒 输入密码</h2>
    <input
      v-model="pin" type="password" inputmode="numeric" maxlength="4" pattern="[0-9]*"
      class="form-input" style="width:180px;text-align:center;font-size:1.5rem;letter-spacing:12px"
      placeholder="····" autofocus @keyup.enter="submit"
      :disabled="remaining() > 0"
    />
    <p v-if="error" class="text-danger text-sm mt-8">{{ error }}</p>
    <p v-if="remaining() > 0" class="text-muted text-sm mt-8">{{ remaining() }}秒后可重试</p>
    <button class="btn btn-primary mt-16" @click="submit" :disabled="remaining() > 0">解锁</button>
  </div>
</template>