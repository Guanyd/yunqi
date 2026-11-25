<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { db, getPregnancy } from '../utils/db.js'
import { recordGALabel } from '../utils/pregnancy.js'
import { compressPhoto, checkStorage, blobToUrl, revokeUrls } from '../utils/photo.js'

const route = useRoute()
const router = useRouter()
const visitId = Number(route.params.id)
const visit = ref(null)
const exams = ref([])
const expenses = ref([])
const gaLabel = ref('')
const photoUrls = ref({}) // examId -> [{id, url}]
const viewerUrl = ref(null)
const uploading = ref(false)
const uploadProgress = ref(0)

// exam form
const showExamForm = ref(false)
const examForm = ref({ name: '', description: '', status: 'pending', result: '' })
const editingExamId = ref(null)

// expense form
const showExpForm = ref(false)
const expForm = ref({ amount: '', category: '检查', date: '', notes: '' })

onMounted(async () => {
  visit.value = await db.visits.get(visitId)
  if (!visit.value) { router.replace('/visits'); return }
  const preg = await getPregnancy()
  gaLabel.value = recordGALabel(visit.value, preg?.lmp)
  await loadExams()
  await loadExpenses()
})

async function loadExams() {
  // 重建列表前先释放上一批 URL，避免反复刷新导致内存持续增长
  revokeUrls(photoUrls.value)
  photoUrls.value = {}
  exams.value = await db.exams.where('visitId').equals(visitId).toArray()
  for (const ex of exams.value) {
    const photos = await db.photos.where('examId').equals(ex.id).toArray()
    photoUrls.value[ex.id] = photos.map(p => ({ id: p.id, url: blobToUrl(p.blob) }))
  }
}

onUnmounted(() => {
  revokeUrls(photoUrls.value)
  photoUrls.value = {}
})

async function loadExpenses() {
  expenses.value = await db.expenses.where('visitId').equals(visitId).toArray()
}

// ---- exams ----
function openNewExam() {
  editingExamId.value = null
  examForm.value = { name: '', description: '', status: 'pending', result: '' }
  showExamForm.value = true
}
function openEditExam(ex) {
  editingExamId.value = ex.id
  examForm.value = { name: ex.name, description: ex.description || '', status: ex.status, result: ex.result || '' }
  showExamForm.value = true
}
async function saveExam() {
  if (!examForm.value.name) return
  const data = { ...examForm.value, visitId, updatedAt: new Date().toISOString() }
  if (editingExamId.value) {
    await db.exams.update(editingExamId.value, data)
  } else {
    data.createdAt = new Date().toISOString()
    await db.exams.add(data)
  }
  showExamForm.value = false
  await loadExams()
}
async function removeExam(id) {
  if (!confirm('删除这张检查单及其照片？')) return
  await db.photos.where('examId').equals(id).delete()
  await db.exams.delete(id)
  await loadExams()
}

// ---- photos ----
async function addPhotos(examId, event) {
  const files = Array.from(event.target.files || [])
  if (!files.length) return
  const ok = await checkStorage(files.length * 2 * 1024 * 1024)
  if (!ok) { window.__showToast?.('存储空间不足，请先导出备份再清理'); return }
  uploading.value = true
  uploadProgress.value = 0
  let fallbackCount = 0
  for (let i = 0; i < files.length; i++) {
    try {
      const blob = await compressPhoto(files[i])
      await db.photos.add({ examId, blob, createdAt: new Date().toISOString() })
    } catch (e) {
      // 压缩失败（如浏览器不支持 HEIC 解码）时回退存原图，并明确提示体积较大
      await db.photos.add({ examId, blob: files[i], createdAt: new Date().toISOString() })
      fallbackCount++
    }
    uploadProgress.value = Math.round(((i + 1) / files.length) * 100)
  }
  uploading.value = false
  event.target.value = ''
  await loadExams()
  if (fallbackCount > 0) {
    window.__showToast?.(`${fallbackCount} 张照片未能压缩，已按原图保存，占用空间较大`)
  }
}

async function removePhoto(photoId, examId) {
  if (!confirm('删除这张照片？')) return
  await db.photos.delete(photoId)
  await loadExams()
}

// ---- expenses ----
function openNewExp() {
  expForm.value = { amount: '', category: '检查', date: visit.value.date, notes: '' }
  showExpForm.value = true
}
async function saveExp() {
  const amt = parseFloat(expForm.value.amount)
  if (!amt || amt <= 0) return
  await db.expenses.add({ ...expForm.value, amount: amt, visitId, createdAt: new Date().toISOString() })
  showExpForm.value = false
  await loadExpenses()
}
async function removeExp(id) {
  if (!confirm('删除这笔费用？')) return
  await db.expenses.delete(id)
  await loadExpenses()
}

const statusLabel = s => ({ pending: '待做', done: '已做', skipped: '本院不查' }[s] || s)
const totalExp = () => expenses.value.reduce((s, e) => s + e.amount, 0)
</script>

<template>
  <div class="page" v-if="visit">
    <header class="page-head">
      <div>
        <p class="eyebrow">Visit Detail</p>
        <h1 class="page-title">{{ visit.date }}</h1>
        <p class="page-sub">{{ gaLabel }} · {{ visit.hospital || '未填医院' }}</p>
      </div>
      <button class="icon-btn is-lg" title="返回" aria-label="返回" @click="router.back()">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 5.5 8 12l6.5 6.5" /></svg>
      </button>
    </header>

    <section class="card">
      <div class="list-card-head"><small>本次就诊</small></div>
      <div class="detail-grid">
        <div v-if="visit.hospital" class="detail-item"><span class="detail-label">医院</span><span class="detail-value">{{ visit.hospital }}</span></div>
        <div v-if="visit.department" class="detail-item"><span class="detail-label">科室</span><span class="detail-value">{{ visit.department }}</span></div>
        <div v-if="visit.doctor" class="detail-item"><span class="detail-label">医生</span><span class="detail-value">{{ visit.doctor }}</span></div>
        <div v-if="visit.purpose" class="detail-item"><span class="detail-label">就诊目的</span><span class="detail-value">{{ visit.purpose }}</span></div>
      </div>
      <template v-if="visit.doctorNotes || visit.notes || visit.nextAppointment">
        <div class="divider"></div>
        <div v-if="visit.doctorNotes" class="detail-item"><span class="detail-label">医嘱</span><span class="detail-value" style="font-weight:500">{{ visit.doctorNotes }}</span></div>
        <p v-if="visit.notes" class="text-sm text-muted mt-8">{{ visit.notes }}</p>
        <p v-if="visit.nextAppointment" class="mt-12"><span class="badge badge-middle">下次预约 {{ visit.nextAppointment }}</span></p>
      </template>
    </section>

    <!-- exams -->
    <div class="section-head">
      <h2>检查单 <span class="text-sm text-muted">{{ exams.length }} 项</span></h2>
      <button class="btn btn-sm btn-primary" @click="openNewExam">+ 添加</button>
    </div>
    <div v-if="exams.length===0" class="empty-state">
      <span class="empty-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24"><path d="M5 3.5h9.5L19 8v12.5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-16a1 1 0 0 1 1-1z" /><path d="M14 3.5V8h5M8 12h8M8 16h5" /></svg>
      </span>
      <p>还没有检查单</p>
      <button class="btn btn-sm btn-outline mt-12" @click="openNewExam">添加第一项</button>
    </div>
    <div v-for="ex in exams" :key="ex.id" class="card">
      <div class="flex justify-between items-center">
        <strong>{{ ex.name }}</strong>
        <span class="badge" :class="ex.status==='done'?'badge-early':ex.status==='skipped'?'badge-late':'badge-middle'">{{ statusLabel(ex.status) }}</span>
      </div>
      <p v-if="ex.description" class="text-sm text-muted mt-8">{{ ex.description }}</p>
      <p v-if="ex.result" class="text-sm mt-8">结果：{{ ex.result }}</p>
      <!-- photos -->
      <div class="flex gap-8 mt-12" style="flex-wrap:wrap">
        <div v-for="p in (photoUrls[ex.id]||[])" :key="p.id" style="position:relative;width:72px;height:72px;flex:none">
          <img class="photo-thumb" :src="p.url" @click="viewerUrl=p.url" />
          <button class="photo-del" title="删除照片" aria-label="删除照片" @click="removePhoto(p.id, ex.id)">×</button>
        </div>
        <label class="photo-add" title="添加照片">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 7.5h3l1.5-2h7L17 7.5h3a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 20 19.5H4A1.5 1.5 0 0 1 2.5 18V9A1.5 1.5 0 0 1 4 7.5z" />
            <circle cx="12" cy="13.5" r="3.2" /><path d="M17.5 10.5h.01" />
          </svg>
          <input type="file" accept="image/*" multiple hidden @change="addPhotos(ex.id, $event)" />
        </label>
      </div>
      <div v-if="uploading" class="progress-bar mt-8"><div class="progress-fill" :style="{width: uploadProgress+'%'}"></div></div>
      <div class="flex gap-8 mt-12">
        <button class="btn btn-sm btn-outline" @click="openEditExam(ex)">编辑</button>
        <button class="btn btn-sm btn-outline text-danger" @click="removeExam(ex.id)">删除</button>
      </div>
    </div>

    <!-- expenses -->
    <div class="section-head">
      <h2>本次花费</h2>
      <button class="btn btn-sm btn-primary" @click="openNewExp">+ 记一笔</button>
    </div>
    <p class="text-sm text-muted mb-12">合计 <span class="text-accent" style="font-weight:700">¥{{ totalExp().toFixed(2) }}</span> · {{ expenses.length }} 笔</p>
    <div v-if="expenses.length===0" class="text-muted text-sm mb-12">本次就诊还没有关联费用</div>
    <div v-for="e in expenses" :key="e.id" class="card expense-row">
      <span class="expense-avatar" aria-hidden="true">
        <svg viewBox="0 0 24 24"><path d="M5 3.5h9.5L19 8v12.5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-16a1 1 0 0 1 1-1z" /><path d="M14 3.5V8h5M8 12h8M8 16h5" /></svg>
      </span>
      <div class="expense-main">
        <span class="expense-amount">¥{{ e.amount.toFixed(2) }}</span>
        <p class="expense-meta">{{ e.category }} · {{ e.date }}</p>
        <p v-if="e.notes" class="expense-notes">{{ e.notes }}</p>
      </div>
      <button class="icon-btn" title="删除" aria-label="删除" @click="removeExp(e.id)">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 7h15M9 7V4.8A1.3 1.3 0 0 1 10.3 3.5h3.4A1.3 1.3 0 0 1 15 4.8V7M6.5 7l.8 12.2a1.6 1.6 0 0 0 1.6 1.5h6.2a1.6 1.6 0 0 0 1.6-1.5L17.5 7M10 11v6M14 11v6" /></svg>
      </button>
    </div>

    <!-- exam form modal -->
    <div v-if="showExamForm" class="modal-overlay" @click.self="showExamForm=false">
      <div class="modal-sheet">
        <div class="modal-handle"></div>
        <p class="eyebrow is-plain">Examination</p>
        <h2 class="mb-16" style="font-size:1.32rem;letter-spacing:-0.03em">{{ editingExamId ? '编辑检查单' : '新增检查单' }}</h2>
        <div class="form-group"><label class="form-label">项目名 *</label><input v-model="examForm.name" class="form-input" placeholder="如：NT 超声" /></div>
        <div class="form-group"><label class="form-label">开单说明</label><input v-model="examForm.description" class="form-input" /></div>
        <div class="form-group"><label class="form-label">状态</label>
          <select v-model="examForm.status" class="form-select">
            <option value="pending">待做</option><option value="done">已做</option><option value="skipped">本院不查</option>
          </select>
        </div>
        <div class="form-group"><label class="form-label">结果文字</label><textarea v-model="examForm.result" class="form-textarea" placeholder="原样记录，不做解读"></textarea></div>
        <button class="btn btn-primary btn-block" @click="saveExam">保存检查单</button>
        <button class="btn btn-outline btn-block mt-8" @click="showExamForm=false">取消</button>
      </div>
    </div>

    <!-- expense form modal -->
    <div v-if="showExpForm" class="modal-overlay" @click.self="showExpForm=false">
      <div class="modal-sheet">
        <div class="modal-handle"></div>
        <p class="eyebrow is-plain">Expense</p>
        <h2 class="mb-16" style="font-size:1.32rem;letter-spacing:-0.03em">记一笔费用</h2>
        <div class="form-group"><label class="form-label">金额（元）*</label><input v-model="expForm.amount" type="number" step="0.01" min="0" class="form-input" inputmode="decimal" placeholder="0.00" /></div>
        <div class="detail-grid">
          <div class="form-group"><label class="form-label">分类</label>
            <select v-model="expForm.category" class="form-select">
              <option>挂号</option><option>检查</option><option>药品</option><option>其他</option>
            </select>
          </div>
          <div class="form-group"><label class="form-label">日期</label><input v-model="expForm.date" type="date" class="form-input" /></div>
        </div>
        <div class="form-group"><label class="form-label">备注</label><input v-model="expForm.notes" class="form-input" /></div>
        <button class="btn btn-primary btn-block" @click="saveExp">保存费用</button>
        <button class="btn btn-outline btn-block mt-8" @click="showExpForm=false">取消</button>
      </div>
    </div>

    <!-- photo viewer -->
    <div v-if="viewerUrl" class="photo-viewer" @click="viewerUrl=null">
      <img :src="viewerUrl" @click.stop />
      <button class="photo-close" @click="viewerUrl=null">×</button>
    </div>
  </div>
</template>