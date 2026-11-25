<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { savePregnancy } from '../utils/db.js'
import { dueDateFromLMP, dueDateFromCurrentGA, lmpFromDueDate, isValidLMP, isValidDueDate, today } from '../utils/pregnancy.js'

const router = useRouter()
const mode = ref('lmp') // lmp | ga | hospital
const lmpDate = ref('')
const gaWeeks = ref(0)
const gaDays = ref(0)
const hospitalDue = ref('')
const nickname = ref('')
const error = ref('')
const saving = ref(false)

async function submit() {
  error.value = ''
  let lmp, dueDate, source
  if (mode.value === 'lmp') {
    if (!lmpDate.value) { error.value = '请选择末次月经日期'; return }
    if (!isValidLMP(lmpDate.value)) { error.value = '日期超出合理范围（今天往前300天内）'; return }
    lmp = lmpDate.value
    dueDate = dueDateFromLMP(lmp)
    source = 'lmp'
  } else if (mode.value === 'ga') {
    const w = Number(gaWeeks.value), d = Number(gaDays.value)
    if (w < 0 || w > 42 || d < 0 || d > 6) { error.value = '孕周范围 0-42 周，天数 0-6'; return }
    const result = dueDateFromCurrentGA(w, d)
    lmp = result.lmp; dueDate = result.dueDate; source = 'ga'
  } else {
    if (!hospitalDue.value) { error.value = '请选择预产期'; return }
    if (!isValidDueDate(hospitalDue.value)) { error.value = '预产期超出合理范围'; return }
    dueDate = hospitalDue.value
    lmp = lmpFromDueDate(dueDate)
    source = 'hospital'
  }
  saving.value = true
  try {
    await savePregnancy({ nickname: nickname.value || '宝宝', lmp, dueDate, source, hospitalOverride: source === 'hospital', createdAt: new Date().toISOString() })

    // iOS 上 <input type="date"> 会拉起系统日期选择器，键盘/选择器的附件条属于原生层。
    // 如果它还在焦点状态就切路由，原生遮罩会残留在 webview 上，导致新页面整个点不动，
    // 只能杀掉 App 重开才恢复。所以导航前先主动失焦。
    if (document.activeElement && typeof document.activeElement.blur === 'function') {
      document.activeElement.blur()
    }
    // 让失焦（键盘收起）先发生一帧，再换页
    await new Promise((resolve) => setTimeout(resolve, 0))

    router.replace('/')
  } catch (e) {
    error.value = '保存失败：' + (e && e.message ? e.message : '请重试')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="page setup-page">
    <header class="setup-intro">
      <p class="eyebrow is-center">WELCOME</p>

      <div class="intro-art" aria-hidden="true">
        <span class="art-ring"></span>
        <span class="art-ring art-ring--inner"></span>
        <span class="art-dot art-dot--a"></span>
        <span class="art-dot art-dot--b"></span>
        <svg class="art-glyph" viewBox="0 0 48 48" focusable="false">
          <path d="M24 38 V21" />
          <path d="M24 30 C24 23 17 18 11 19 C11 27 17 31 24 30 Z" />
          <path d="M24 25 C24 18 31 13 37 14 C37 22 31 26 24 25 Z" />
          <path d="M15 38 Q24 43 33 38" />
        </svg>
      </div>

      <h1 class="page-title">建立孕期档案</h1>
      <p class="page-sub">
        选择一种方式计算预产期，之后可以改成医院给的日期。<br />
        从此刻起，一起温柔地记录这段旅程。
      </p>
    </header>

    <div class="card setup-card">
      <p class="eyebrow is-plain is-muted setup-step">STEP 01 · 基本信息</p>

      <div class="form-group">
        <label class="form-label">昵称（可选）</label>
        <input v-model="nickname" class="form-input" placeholder="比如：小橘子" />
      </div>

      <label class="form-label">预产期计算方式</label>
      <div class="segmented" role="group" aria-label="预产期计算方式">
        <button type="button" :class="{ active: mode==='lmp' }" @click="mode='lmp'">末次月经</button>
        <button type="button" :class="{ active: mode==='ga' }" @click="mode='ga'">当前孕周</button>
        <button type="button" :class="{ active: mode==='hospital' }" @click="mode='hospital'">医院预产期</button>
      </div>

      <template v-if="mode==='lmp'">
        <div class="form-group">
          <label class="form-label">末次月经第一天</label>
          <input v-model="lmpDate" type="date" class="form-input" :max="today()" />
        </div>
      </template>
      <template v-else-if="mode==='ga'">
        <div class="flex gap-8">
          <div class="form-group" style="flex:1">
            <label class="form-label">孕周</label>
            <input v-model.number="gaWeeks" type="number" min="0" max="42" class="form-input" />
          </div>
          <div class="form-group" style="flex:1">
            <label class="form-label">天</label>
            <input v-model.number="gaDays" type="number" min="0" max="6" class="form-input" />
          </div>
        </div>
      </template>
      <template v-else>
        <div class="form-group">
          <label class="form-label">医院给的预产期</label>
          <input v-model="hospitalDue" type="date" class="form-input" />
        </div>
      </template>

      <p v-if="error" class="text-danger text-sm setup-error">
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7.5v5" />
          <path d="M12 16h.01" />
        </svg>
        {{ error }}
      </p>

      <button class="btn btn-primary btn-block mt-12 setup-submit" @click="submit" :disabled="saving">
        <span>{{ saving ? '保存中…' : '开始记录' }}</span>
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M5 12h13" />
          <path d="M13 6l6 6-6 6" />
        </svg>
      </button>

      <p class="setup-foot">
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <rect x="5" y="10.5" width="14" height="9.5" rx="2.2" />
          <path d="M8.2 10.5V7.8a3.8 3.8 0 0 1 7.6 0v2.7" />
        </svg>
        所有记录只保存在这台设备上
      </p>
    </div>
  </div>
</template>

<style scoped>
.setup-page {
  padding-top: clamp(30px, 6vh, 56px);
}

.setup-intro {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 30px;
}
.setup-intro .page-title { margin-top: 6px; }
.setup-intro .page-sub { max-width: 400px; margin-top: 10px; text-wrap: balance; }

.intro-art {
  position: relative;
  width: 132px;
  height: 132px;
  margin: 22px auto 4px;
  display: grid;
  place-items: center;
}
.art-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 1px solid var(--accent-line);
  background: var(--accent-soft);
  box-shadow: var(--shadow-sm);
}
.art-ring--inner {
  inset: 15px;
  background: transparent;
  border-style: dashed;
  box-shadow: none;
  opacity: 0.85;
}
.art-dot {
  position: absolute;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: var(--shadow-sm);
}
.art-dot--a { top: 8px; left: 24px; }
.art-dot--b { bottom: 14px; right: 16px; width: 4px; height: 4px; opacity: 0.7; }
.art-glyph {
  position: relative;
  z-index: 1;
  width: 58px;
  height: 58px;
  color: var(--accent-deep);
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.setup-card { padding: 22px 20px 20px; }
.setup-step { margin-bottom: 18px; }

.setup-error {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 2px 0 0;
}
.setup-error svg {
  width: 16px;
  height: 16px;
  flex: none;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.setup-submit { margin-top: 18px; }
.setup-submit svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.setup-foot {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 16px;
  font-size: 0.72rem;
  color: var(--ink-3);
  letter-spacing: 0.02em;
}
.setup-foot svg {
  width: 14px;
  height: 14px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linecap: round;
  stroke-linejoin: round;
}
</style>
