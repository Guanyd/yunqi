<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { db, getPregnancy, savePregnancy, getSetting, setSetting } from '../utils/db.js'
import { exportBackup, importBackup, downloadBlob } from '../utils/backup.js'
import { dueDateFromLMP, lmpFromDueDate, isValidLMP, isValidDueDate, today } from '../utils/pregnancy.js'
import { sha256Hex } from '../utils/crypto.js'

const router = useRouter()
const pregnancy = ref(null)
const pinEnabled = ref(false)
const showPinSetup = ref(false)
const newPin = ref('')
const confirmPin = ref('')
const pinError = ref('')
const exporting = ref(false)
const importing = ref(false)
const importFile = ref(null)
const showEditPreg = ref(false)
const editForm = ref({ nickname: '', lmp: '', dueDate: '' })

onMounted(async () => {
  pregnancy.value = await getPregnancy()
  pinEnabled.value = await getSetting('pinEnabled', false)
})

// ---- backup ----
async function doExport() {
  exporting.value = true
  try {
    const blob = await exportBackup()
    const date = today().replace(/-/g, '')
    downloadBlob(blob, `孕期备份_${date}.zip`)
    await setSetting('lastBackupDate', new Date().toISOString())
    window.__showToast?.('备份已导出')
  } catch (e) {
    window.__showToast?.('导出失败：' + e.message)
  }
  exporting.value = false
}

function triggerImport() { importFile.value?.$el?.click?.() || document.getElementById('import-input').click() }

async function doImport(event) {
  const file = event.target.files?.[0]
  if (!file) return
  if (!confirm('导入将覆盖当前所有记录。确定继续？建议先导出当前数据。')) { event.target.value = ''; return }
  importing.value = true
  try {
    await importBackup(file)
    window.__showToast?.('导入成功，即将刷新')
    setTimeout(() => location.reload(), 1000)
  } catch (e) {
    window.__showToast?.('导入失败：' + e.message)
  }
  importing.value = false
  event.target.value = ''
}

// ---- PIN ----
async function sha256(str) {
  return sha256Hex(str)
}

function openPinSetup() {
  newPin.value = ''; confirmPin.value = ''; pinError.value = ''
  showPinSetup.value = true
}

async function savePin() {
  if (!/^\d{4}$/.test(newPin.value)) { pinError.value = '请输入4位数字'; return }
  if (newPin.value !== confirmPin.value) { pinError.value = '两次输入不一致'; return }
  const hash = await sha256(newPin.value)
  await setSetting('pinHash', hash)
  await setSetting('pinEnabled', true)
  pinEnabled.value = true
  showPinSetup.value = false
  window.__showToast?.('锁屏已开启')
}

async function disablePin() {
  if (!confirm('关闭锁屏？')) return
  await setSetting('pinEnabled', false)
  await setSetting('pinHash', null)
  pinEnabled.value = false
  window.__showToast?.('锁屏已关闭')
}

// ---- edit pregnancy ----
function openEditPreg() {
  editForm.value = { nickname: pregnancy.value.nickname || '', lmp: pregnancy.value.lmp, dueDate: pregnancy.value.dueDate }
  showEditPreg.value = true
}
async function savePreg() {
  const data = { ...pregnancy.value }
  data.nickname = editForm.value.nickname
  if (editForm.value.dueDate !== pregnancy.value.dueDate) {
    if (!isValidDueDate(editForm.value.dueDate)) { window.__showToast?.('预产期超出合理范围'); return }
    data.dueDate = editForm.value.dueDate
    data.lmp = lmpFromDueDate(editForm.value.dueDate)
    data.hospitalOverride = true
    data.source = 'hospital'
  } else if (editForm.value.lmp !== pregnancy.value.lmp) {
    if (!isValidLMP(editForm.value.lmp)) { window.__showToast?.('末次月经日期超出合理范围'); return }
    data.lmp = editForm.value.lmp
    data.dueDate = dueDateFromLMP(editForm.value.lmp)
  }
  await savePregnancy(data)
  pregnancy.value = data
  showEditPreg.value = false
  window.__showToast?.('已更新')
}

// ---- clear ----
async function clearAll() {
  if (!confirm('⚠️ 清空所有数据？此操作不可恢复！\n请先确认已导出备份。')) return
  if (!confirm('再次确认：真的要清空全部记录、照片和设置吗？')) return
  await db.delete()
  location.reload()
}
</script>

<template>
  <div class="page">
    <h1 class="mb-12">我的</h1>

    <!-- pregnancy info -->
    <div class="card" v-if="pregnancy">
      <div class="flex justify-between items-center">
        <h3>孕期档案</h3>
        <button class="btn btn-sm btn-outline" @click="openEditPreg">编辑</button>
      </div>
      <p class="mt-8"><strong>{{ pregnancy.nickname }}</strong></p>
      <p class="text-sm text-muted">末次月经：{{ pregnancy.lmp }}</p>
      <p class="text-sm text-muted">预产期：{{ pregnancy.dueDate }}{{ pregnancy.hospitalOverride ? '（医院校正）' : '' }}</p>
      <p class="text-sm text-muted">来源：{{ {lmp:'末次月经推算',ga:'当前孕周推算',hospital:'医院给定'}[pregnancy.source] }}</p>
    </div>

    <!-- backup -->
    <div class="card">
      <h3 class="mb-8">备份</h3>
      <p class="text-sm text-muted mb-12">导出 ZIP 文件存到电脑或 U 盘，防丢用。</p>
      <div class="flex gap-8">
        <button class="btn btn-primary" @click="doExport" :disabled="exporting">{{ exporting ? '导出中…' : '📦 导出备份' }}</button>
        <button class="btn btn-outline" @click="triggerImport" :disabled="importing">{{ importing ? '导入中…' : '📥 导入备份' }}</button>
      </div>
      <input id="import-input" type="file" accept=".zip" hidden @change="doImport" />
    </div>

    <!-- PIN -->
    <div class="card">
      <h3 class="mb-8">锁屏</h3>
      <p class="text-sm text-muted mb-8">四位数字密码，仅防随手翻阅，不防技术破解。</p>
      <template v-if="pinEnabled">
        <p class="text-sm" style="color:var(--success)">✅ 已开启</p>
        <button class="btn btn-sm btn-outline mt-8" @click="disablePin">关闭锁屏</button>
      </template>
      <template v-else>
        <button class="btn btn-sm btn-outline" @click="openPinSetup">开启锁屏</button>
      </template>
    </div>

    <!-- danger zone -->
    <div class="card" style="border-color:var(--danger)">
      <h3 class="text-danger mb-8">危险操作</h3>
      <button class="btn btn-danger btn-sm" @click="clearAll">清空全部数据</button>
    </div>

    <!-- PIN setup modal -->
    <div v-if="showPinSetup" class="modal-overlay" @click.self="showPinSetup=false">
      <div class="modal-sheet">
        <div class="modal-handle"></div>
        <h2 class="mb-12">设置锁屏密码</h2>
        <p class="text-sm text-muted mb-12">⚠️ 仅10000种组合，安全性有限。忘记密码只能清空数据后从备份恢复。</p>
        <div class="form-group"><label class="form-label">4位数字密码</label><input v-model="newPin" type="password" inputmode="numeric" maxlength="4" class="form-input" /></div>
        <div class="form-group"><label class="form-label">确认密码</label><input v-model="confirmPin" type="password" inputmode="numeric" maxlength="4" class="form-input" /></div>
        <p v-if="pinError" class="text-danger text-sm">{{ pinError }}</p>
        <button class="btn btn-primary btn-block mt-8" @click="savePin">开启</button>
      </div>
    </div>

    <!-- edit pregnancy modal -->
    <div v-if="showEditPreg" class="modal-overlay" @click.self="showEditPreg=false">
      <div class="modal-sheet">
        <div class="modal-handle"></div>
        <h2 class="mb-12">编辑孕期档案</h2>
        <div class="form-group"><label class="form-label">昵称</label><input v-model="editForm.nickname" class="form-input" /></div>
        <div class="form-group"><label class="form-label">末次月经</label><input v-model="editForm.lmp" type="date" class="form-input" :max="today()" /></div>
        <div class="form-group"><label class="form-label">预产期（改这里会以医院为准）</label><input v-model="editForm.dueDate" type="date" class="form-input" /></div>
        <button class="btn btn-primary btn-block" @click="savePreg">保存</button>
      </div>
    </div>
  </div>
</template>