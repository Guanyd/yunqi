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
  await savePregnancy({ nickname: nickname.value || '宝宝', lmp, dueDate, source, hospitalOverride: source === 'hospital', createdAt: new Date().toISOString() })
  router.replace('/')
}
</script>

<template>
  <div class="page">
    <h1 style="margin-bottom:8px">建立孕期档案</h1>
    <p class="text-muted text-sm mb-12">选择一种方式计算预产期，之后可以改成医院给的日期。</p>

    <div class="card">
      <div class="form-group">
        <label class="form-label">昵称（可选）</label>
        <input v-model="nickname" class="form-input" placeholder="比如：小橘子" />
      </div>

      <div class="flex gap-8 mb-12">
        <button class="btn btn-sm" :class="mode==='lmp'?'btn-primary':'btn-outline'" @click="mode='lmp'">末次月经</button>
        <button class="btn btn-sm" :class="mode==='ga'?'btn-primary':'btn-outline'" @click="mode='ga'">当前孕周</button>
        <button class="btn btn-sm" :class="mode==='hospital'?'btn-primary':'btn-outline'" @click="mode='hospital'">医院预产期</button>
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

      <p v-if="error" class="text-danger text-sm">{{ error }}</p>
      <button class="btn btn-primary btn-block mt-12" @click="submit" :disabled="saving">
        {{ saving ? '保存中…' : '开始记录' }}
      </button>
    </div>
  </div>
</template>