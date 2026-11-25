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
  <div class="page pin-lock" role="dialog" aria-label="解锁">
    <header class="pin-head">
      <div class="pin-badge" aria-hidden="true">
        <svg viewBox="0 0 24 24" focusable="false">
          <rect x="4.5" y="10.4" width="15" height="9.6" rx="2.4" />
          <path d="M8.2 10.4V7.6a3.8 3.8 0 0 1 7.6 0v2.8" />
          <path d="M12 14.2v2.2" />
        </svg>
      </div>
      <p class="eyebrow is-center">WELCOME BACK</p>
      <h1 class="page-title">输入密码</h1>
      <p class="page-sub">输入 4 位数字密码，继续记录这段旅程</p>
    </header>

    <div class="pin-display">
      <div class="pin-dots" :class="{ 'has-error': error }" aria-hidden="true">
        <span v-for="n in 4" :key="n" class="pin-dot" :class="{ filled: pin.length >= n }"></span>
      </div>
      <input
        v-model="pin" type="password" inputmode="numeric" maxlength="4" pattern="[0-9]*"
        class="form-input pin-input"
        placeholder="····" autofocus @keyup.enter="submit"
        :disabled="remaining() > 0"
      />
    </div>

    <div class="pin-feedback">
      <p v-if="error" class="text-danger text-sm mt-8">{{ error }}</p>
      <p v-if="remaining() > 0" class="text-muted text-sm mt-8">{{ remaining() }}秒后可重试</p>
    </div>

    <div class="pin-keypad">
      <button v-for="n in 9" :key="n" type="button" class="key" :disabled="remaining() > 0"
        @click="pin = (pin + n).slice(0, 4)">{{ n }}</button>
      <span class="key key--deco" aria-hidden="true">
        <svg viewBox="0 0 24 24" focusable="false">
          <circle cx="12" cy="12" r="7" />
          <circle cx="12" cy="12" r="2.2" />
        </svg>
      </span>
      <button type="button" class="key" :disabled="remaining() > 0"
        @click="pin = (pin + '0').slice(0, 4)">0</button>
      <button type="button" class="key key--ghost" :disabled="remaining() > 0"
        @click="pin = pin.slice(0, -1)" aria-label="删除一位">
        <svg viewBox="0 0 24 24" focusable="false">
          <path d="M9 5.5h10a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9L3 12z" />
          <path d="M12 9.5l4 5" />
          <path d="M16 9.5l-4 5" />
        </svg>
      </button>
    </div>

    <button class="btn btn-primary mt-16 pin-submit" @click="submit" :disabled="remaining() > 0">
      <span>解锁</span>
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M5 12h13" />
        <path d="M13 6l6 6-6 6" />
      </svg>
    </button>
  </div>
</template>

<style scoped>
.pin-lock {
  position: fixed;
  inset: 0;
  z-index: 350;
  max-width: none;
  margin: 0;
  padding: 30px 22px 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  overflow-y: auto;
  background: var(--bg);
}

.pin-head {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 8px;
}
.pin-badge {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  margin-bottom: 6px;
  background: var(--accent-soft);
  border: 1px solid var(--accent-line);
  color: var(--accent-deep);
  box-shadow: var(--shadow-sm);
}
.pin-badge svg {
  width: 30px;
  height: 30px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.pin-head .page-sub { max-width: 280px; margin-top: 2px; }

.pin-display {
  position: relative;
  width: 220px;
  max-width: 80%;
  margin: 4px 0 2px;
}
.pin-dots {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 18px;
  height: 34px;
  pointer-events: none;
}
.pin-dot {
  width: 13px;
  height: 13px;
  border-radius: 50%;
  background: transparent;
  border: 1.5px solid var(--accent-line);
  transition: background 0.2s, border-color 0.2s, transform 0.2s, box-shadow 0.2s;
}
.pin-dot.filled {
  background: var(--accent);
  border-color: var(--accent);
  transform: scale(1.08);
  box-shadow: var(--shadow-accent);
}
.pin-dots.has-error .pin-dot.filled {
  background: var(--danger);
  border-color: var(--danger);
  box-shadow: none;
}
.pin-input {
  position: absolute;
  inset: 0;
  z-index: 1;
  width: 100%;
  height: 100%;
  opacity: 0;
  border: 0;
  padding: 0;
  background: transparent;
  box-shadow: none;
  font-size: 1.5rem;
  letter-spacing: 12px;
  text-align: center;
  cursor: default;
}
.pin-input:focus {
  border: 0;
  background: transparent;
  box-shadow: none;
}

.pin-feedback { min-height: 22px; text-align: center; }

.pin-keypad {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  width: 100%;
  max-width: 300px;
}
.key {
  height: 58px;
  display: grid;
  place-items: center;
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  background: var(--surface);
  box-shadow: var(--shadow-sm);
  color: var(--ink);
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 600;
  font-variant-numeric: lining-nums tabular-nums;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: transform 0.16s, background 0.2s, border-color 0.2s, box-shadow 0.2s;
}
.key:active {
  transform: scale(0.94);
  background: var(--accent-soft);
  border-color: var(--accent-line);
}
.key:disabled { opacity: 0.45; pointer-events: none; box-shadow: none; }
.key:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.key--deco {
  border: 0;
  background: transparent;
  box-shadow: none;
  color: var(--accent-line);
  cursor: default;
}
.key--deco svg {
  width: 26px;
  height: 26px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.key--ghost { color: var(--ink-2); }
.key--ghost svg {
  width: 24px;
  height: 24px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.pin-submit { margin-bottom: auto; min-width: 180px; padding-left: 28px; padding-right: 28px; letter-spacing: 0.06em; }
.pin-submit svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linecap: round;
  stroke-linejoin: round;
}
</style>
