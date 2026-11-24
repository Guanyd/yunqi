<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { db, getPregnancy } from '../utils/db.js'
import { gestationalAge, formatGA } from '../utils/pregnancy.js'
import { compressPhoto, checkStorage, blobToUrl } from '../utils/photo.js'

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
  if (preg) gaLabel.value = formatGA(gestationalAge(preg.lmp, visit.value.date))
  await loadExams()
  await loadExpenses()
})

async function loadExams() {
  exams.value = await db.exams.where('visitId').equals(visitId).toArray()
  for (const ex of exams.value) {
    const photos = await db.photos.where('examId').equals(ex.id).toArray()
    photoUrls.value[ex.id] = photos.map(p => ({ id: p.id, url: blobToUrl(p.blob) }))
  }
}

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
  for (let i = 0; i < files.length; i++) {
    try {
      const blob = await compressPhoto(files[i])
      await db.photos.add({ examId, blob, createdAt: new Date().toISOString() })
    } catch (e) {
      // fallback: store original
      await db.photos.add({ examId, blob: files[i], createdAt: new Date().toISOString() })
    }
    uploadProgress.value = Math.round(((i + 1) / files.length) * 100)
  }
  uploading.value = false
  event.target.value = ''
  await loadExams()
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
    <div class="flex items-center gap-8 mb-12">
      <button class="btn btn-sm btn-outline" @click="router.back()">← 返回</button>
      <h1 style="font-size:1.2rem">{{ visit.date }} <span class="text-muted text-sm">{{ gaLabel }}</span></h1>
    </div>

    <div class="card">
      <p v-if="visit.hospital"><strong>医院：</strong>{{ visit.hospital }}</p>
      <p v-if="visit.doctor"><strong>医生：</strong>{{ visit.doctor }}</p>
      <p v-if="visit.purpose"><strong>目的：</strong>{{ visit.purpose }}</p>
      <p v-if="visit.doctorNotes" class="mt-8"><strong>医嘱：</strong>{{ visit.doctorNotes }}</p>
      <p v-if="visit.notes" class="mt-8 text-muted">{{ visit.notes }}</p>
      <p v-if="visit.nextAppointment" class="mt-8 text-accent">下次预约：{{ visit.nextAppointment }}</p>
    </div>

    <!-- exams -->
    <div class="flex justify-between items-center mt-16 mb-8">
      <h2>检查单</h2>
      <button class="btn btn-sm btn-primary" @click="openNewExam">+ 添加</button>
    </div>
    <div v-if="exams.length===0" class="text-muted text-sm mb-12">暂无检查单</div>
    <div v-for="ex in exams" :key="ex.id" class="card">
      <div class="flex justify-between items-center">
        <strong>{{ ex.name }}</strong>
        <span class="badge" :class="ex.status==='done'?'badge-early':ex.status==='skipped'?'badge-late':'badge-middle'">{{ statusLabel(ex.status) }}</span>
      </div>
      <p v-if="ex.description" class="text-sm text-muted mt-8">{{ ex.description }}</p>
      <p v-if="ex.result" class="text-sm mt-8">结果：{{ ex.result }}</p>
      <!-- photos -->
      <div class="flex gap-8 mt-8" style="flex-wrap:wrap">
        <div v-for="p in (photoUrls[ex.id]||[])" :key="p.id" style="position:relative;width:72px;height:72px">
          <img :src="p.url" style="width:72px;height:72px;object-fit:cover;border-radius:8px;cursor:pointer" @click="viewerUrl=p.url" />
          <button style="position:absolute;top:-4px;right:-4px;width:20px;height:20px;border-radius:50%;background:var(--danger);color:#fff;border:none;font-size:12px;cursor:pointer" @click="removePhoto(p.id, ex.id)">×</button>
        </div>
        <label class="btn btn-sm btn-outline" style="width:72px;height:72px;display:flex;align-items:center;justify-content:center;cursor:pointer">
          📷
          <input type="file" accept="image/*" multiple hidden @change="addPhotos(ex.id, $event)" />
        </label>
      </div>
      <div v-if="uploading" class="progress-bar mt-8"><div class="progress-fill" :style="{width: uploadProgress+'%'}"></div></div>
      <div class="flex gap-8 mt-8">
        <button class="btn btn-sm btn-outline" @click="openEditExam(ex)">编辑</button>
        <button class="btn btn-sm btn-outline text-danger" @click="removeExam(ex.id)">删除</button>
      </div>
    </div>

    <!-- expenses -->
    <div class="flex justify-between items-center mt-16 mb-8">
      <h2>本次花费 <span class="text-accent">¥{{ totalExp().toFixed(2) }}</span></h2>
      <button class="btn btn-sm btn-primary" @click="openNewExp">+ 记一笔</button>
    </div>
    <div v-for="e in expenses" :key="e.id" class="card flex justify-between items-center">
      <div>
        <strong>¥{{ e.amount.toFixed(2) }}</strong>
        <span class="text-muted text-sm" style="margin-left:8px">{{ e.category }} · {{ e.date }}</span>
        <p v-if="e.notes" class="text-sm text-muted">{{ e.notes }}</p>
      </div>
      <button class="btn btn-sm btn-outline text-danger" @click="removeExp(e.id)">删除</button>
    </div>

    <!-- exam form modal -->
    <div v-if="showExamForm" class="modal-overlay" @click.self="showExamForm=false">
      <div class="modal-sheet">
        <div class="modal-handle"></div>
        <h2 class="mb-12">{{ editingExamId ? '编辑检查单' : '新增检查单' }}</h2>
        <div class="form-group"><label class="form-label">项目名 *</label><input v-model="examForm.name" class="form-input" placeholder="如：NT超声" /></div>
        <div class="form-group"><label class="form-label">开单说明</label><input v-model="examForm.description" class="form-input" /></div>
        <div class="form-group"><label class="form-label">状态</label>
          <select v-model="examForm.status" class="form-select">
            <option value="pending">待做</option><option value="done">已做</option><option value="skipped">本院不查</option>
          </select>
        </div>
        <div class="form-group"><label class="form-label">结果文字</label><textarea v-model="examForm.result" class="form-textarea" placeholder="原样记录，不做解读"></textarea></div>
        <button class="btn btn-primary btn-block" @click="saveExam">保存</button>
      </div>
    </div>

    <!-- expense form modal -->
    <div v-if="showExpForm" class="modal-overlay" @click.self="showExpForm=false">
      <div class="modal-sheet">
        <div class="modal-handle"></div>
        <h2 class="mb-12">记一笔费用</h2>
        <div class="form-group"><label class="form-label">金额（元）*</label><input v-model="expForm.amount" type="number" step="0.01" min="0" class="form-input" inputmode="decimal" /></div>
        <div class="form-group"><label class="form-label">分类</label>
          <select v-model="expForm.category" class="form-select">
            <option>挂号</option><option>检查</option><option>药品</option><option>其他</option>
          </select>
        </div>
        <div class="form-group"><label class="form-label">日期</label><input v-model="expForm.date" type="date" class="form-input" /></div>
        <div class="form-group"><label class="form-label">备注</label><input v-model="expForm.notes" class="form-input" /></div>
        <button class="btn btn-primary btn-block" @click="saveExp">保存</button>
      </div>
    </div>

    <!-- photo viewer -->
    <div v-if="viewerUrl" class="photo-viewer" @click="viewerUrl=null">
      <img :src="viewerUrl" @click.stop />
      <button class="photo-close" @click="viewerUrl=null">×</button>
    </div>
  </div>
</template>