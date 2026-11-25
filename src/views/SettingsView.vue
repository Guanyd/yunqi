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
  <div class="page settings-page">
    <header class="page-head">
      <div>
        <p class="eyebrow">PROFILE &amp; SETTINGS</p>
        <h1 class="page-title">我的</h1>
        <p class="page-sub">记录、备份与隐私，都留在这台设备上</p>
      </div>
    </header>

    <!-- pregnancy info -->
    <section v-if="pregnancy" class="card profile-card">
      <div class="profile-head">
        <div class="profile-avatar" aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false">
            <path d="M12 20.5C7.5 17 4.5 14.1 4.5 10.8A4.3 4.3 0 0 1 12 8.3a4.3 4.3 0 0 1 7.5 2.5c0 3.3-3 6.2-7.5 9.7Z" />
            <path d="M12 3.5v3" />
          </svg>
        </div>
        <div class="flex-1">
          <p class="eyebrow is-plain is-muted">PREGNANCY PROFILE</p>
          <p class="profile-name">{{ pregnancy.nickname }}</p>
          <p class="profile-caption">孕期档案</p>
        </div>
        <button class="icon-btn is-lg" @click="openEditPreg" aria-label="编辑孕期档案">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M4 20h4l10-10-4-4L4 16v4Z" />
            <path d="M13.5 6.5l4 4" />
          </svg>
        </button>
      </div>

      <div class="detail-grid">
        <div class="detail-item">
          <span class="detail-label">末次月经</span>
          <span class="detail-value display-num">{{ pregnancy.lmp }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">预产期</span>
          <span class="detail-value display-num">{{ pregnancy.dueDate }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">推算来源</span>
          <span class="detail-value">{{ {lmp:'末次月经推算',ga:'当前孕周推算',hospital:'医院给定'}[pregnancy.source] }}</span>
        </div>
        <div v-if="pregnancy.hospitalOverride" class="detail-item">
          <span class="detail-label">校正方式</span>
          <span class="detail-value text-accent">以医院预产期为准</span>
        </div>
      </div>
    </section>

    <div class="section-head"><h2>数据与备份</h2><span class="text-sm text-muted">本地优先</span></div>

    <!-- backup -->
    <section class="card setting-card">
      <div class="setting-row">
        <div class="setting-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false">
            <path d="M4 8.5h16v10a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-10Z" />
            <path d="M3 5h18v3.5H3z" />
            <path d="M12 5v15" />
          </svg>
        </div>
        <div class="setting-body">
          <p class="setting-title">备份记录</p>
          <p class="setting-desc">导出 ZIP 文件存到电脑或 U 盘，换设备时可再导入恢复。</p>
          <div class="setting-actions">
            <button class="btn btn-primary btn-sm" @click="doExport" :disabled="exporting">
              <svg class="btn-ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M12 16V4" /><path d="M8 8l4-4 4 4" /><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
              </svg>
              {{ exporting ? '导出中…' : '导出备份' }}
            </button>
            <button class="btn btn-outline btn-sm" @click="triggerImport" :disabled="importing">
              <svg class="btn-ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M12 4v12" /><path d="M8 12l4 4 4-4" /><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
              </svg>
              {{ importing ? '导入中…' : '导入备份' }}
            </button>
          </div>
        </div>
      </div>
      <input id="import-input" type="file" accept=".zip" hidden @change="doImport" />
    </section>

    <div class="section-head"><h2>安全与隐私</h2></div>

    <!-- PIN -->
    <section class="card setting-card">
      <div class="setting-row">
        <div class="setting-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false">
            <rect x="4.5" y="10.4" width="15" height="9.6" rx="2.4" />
            <path d="M8.2 10.4V7.6a3.8 3.8 0 0 1 7.6 0v2.8" />
            <path d="M12 14.2v2.2" />
          </svg>
        </div>
        <div class="setting-body">
          <p class="setting-title">锁屏密码</p>
          <p class="setting-desc">四位数字密码，仅防随手翻阅，不防技术破解。</p>
          <div class="setting-actions">
            <template v-if="pinEnabled">
              <span class="pin-state">
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <circle cx="12" cy="12" r="9" /><path d="M8.2 12.3l2.6 2.6 5.1-5.3" />
                </svg>
                已开启
              </span>
              <button class="btn btn-sm btn-outline" @click="disablePin">关闭锁屏</button>
            </template>
            <template v-else>
              <button class="btn btn-sm btn-outline" @click="openPinSetup">开启锁屏</button>
            </template>
          </div>
        </div>
      </div>
    </section>

    <div class="section-head"><h2 class="text-danger">危险操作</h2></div>

    <!-- danger zone -->
    <section class="card setting-card is-danger-card">
      <div class="setting-row">
        <div class="setting-icon is-danger" aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false">
            <path d="M12 4.5 21 19.5H3L12 4.5Z" />
            <path d="M12 10v4" /><path d="M12 16.8h.01" />
          </svg>
        </div>
        <div class="setting-body">
          <p class="setting-title text-danger">清空全部数据</p>
          <p class="setting-desc">记录、照片与设置会被永久删除，请先导出备份。</p>
          <div class="setting-actions">
            <button class="btn btn-danger btn-sm" @click="clearAll">清空全部数据</button>
          </div>
        </div>
      </div>
    </section>

    <!-- PIN setup modal -->
    <div v-if="showPinSetup" class="modal-overlay" @click.self="showPinSetup=false">
      <div class="modal-sheet">
        <div class="modal-handle"></div>
        <p class="eyebrow is-plain is-muted">SECURITY</p>
        <h2 class="mb-12">设置锁屏密码</h2>
        <p class="text-sm text-muted mb-12 setting-warning">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M12 4.5 21 19.5H3L12 4.5Z" /><path d="M12 10v4" /><path d="M12 16.8h.01" />
          </svg>
          仅 10000 种组合，安全性有限。忘记密码只能清空数据后从备份恢复。
        </p>
        <div class="form-group"><label class="form-label">4 位数字密码</label><input v-model="newPin" type="password" inputmode="numeric" maxlength="4" class="form-input" /></div>
        <div class="form-group"><label class="form-label">确认密码</label><input v-model="confirmPin" type="password" inputmode="numeric" maxlength="4" class="form-input" /></div>
        <p v-if="pinError" class="text-danger text-sm">{{ pinError }}</p>
        <button class="btn btn-primary btn-block mt-8" @click="savePin">开启</button>
        <button class="btn btn-outline btn-block mt-8" @click="showPinSetup=false">取消</button>
      </div>
    </div>

    <!-- edit pregnancy modal -->
    <div v-if="showEditPreg" class="modal-overlay" @click.self="showEditPreg=false">
      <div class="modal-sheet">
        <div class="modal-handle"></div>
        <p class="eyebrow is-plain is-muted">PREGNANCY PROFILE</p>
        <h2 class="mb-12">编辑孕期档案</h2>
        <div class="form-group"><label class="form-label">昵称</label><input v-model="editForm.nickname" class="form-input" /></div>
        <div class="form-group"><label class="form-label">末次月经</label><input v-model="editForm.lmp" type="date" class="form-input" :max="today()" /></div>
        <div class="form-group"><label class="form-label">预产期（改这里会以医院为准）</label><input v-model="editForm.dueDate" type="date" class="form-input" /></div>
        <button class="btn btn-primary btn-block" @click="savePreg">保存</button>
        <button class="btn btn-outline btn-block mt-8" @click="showEditPreg=false">取消</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-page .page-head { margin-bottom: 18px; }
.settings-page .section-head { margin-top: 22px; }

.profile-card { padding: 20px 18px; }
.profile-card .detail-grid { padding-top: 14px; border-top: 1px solid var(--line-soft); }

.setting-card { padding: 4px 18px 8px; }
.is-danger-card { border-color: rgba(180, 73, 59, 0.28); }

.btn-ico {
  width: 15px; height: 15px; flex: none;
  fill: none; stroke: currentColor; stroke-width: 1.7;
  stroke-linecap: round; stroke-linejoin: round;
}

.pin-state {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 0.8rem; font-weight: 650; color: var(--success);
  padding: 6px 10px; border-radius: 10px; background: var(--surface-2);
}
.pin-state svg {
  width: 15px; height: 15px; flex: none;
  fill: none; stroke: currentColor; stroke-width: 1.8;
  stroke-linecap: round; stroke-linejoin: round;
}

.setting-warning { display: flex; align-items: flex-start; gap: 7px; }
.setting-warning svg {
  width: 16px; height: 16px; flex: none; margin-top: 1px;
  fill: none; stroke: currentColor; stroke-width: 1.7;
  stroke-linecap: round; stroke-linejoin: round;
}
</style>
