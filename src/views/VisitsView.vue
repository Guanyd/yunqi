<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { db, getPregnancy } from '../utils/db.js'
import { gaSnapshot, recordGALabel } from '../utils/pregnancy.js'

const router = useRouter()
const visits = ref([])
const pregnancy = ref(null)
const showForm = ref(false)
const form = ref({ date: '', hospital: '', department: '', doctor: '', purpose: '', doctorNotes: '', notes: '', nextAppointment: '' })
const editingId = ref(null)

onMounted(async () => {
  pregnancy.value = await getPregnancy()
  await load()
})

async function load() {
  visits.value = (await db.visits.orderBy('date').reverse().toArray()).map(v => ({
    ...v,
    gaLabel: recordGALabel(v, pregnancy.value?.lmp)
  }))
}

function openNew() {
  editingId.value = null
  form.value = { date: new Date().toISOString().slice(0, 10), hospital: '', department: '', doctor: '', purpose: '', doctorNotes: '', notes: '', nextAppointment: '' }
  showForm.value = true
}

function openEdit(v) {
  editingId.value = v.id
  form.value = { date: v.date, hospital: v.hospital || '', department: v.department || '', doctor: v.doctor || '', purpose: v.purpose || '', doctorNotes: v.doctorNotes || '', notes: v.notes || '', nextAppointment: v.nextAppointment || '' }
  showForm.value = true
}

async function save() {
  if (!form.value.date) return
  const data = { ...form.value, updatedAt: new Date().toISOString() }
  // 保存当天的孕周快照：以后改预产期不会把这条记录的孕周改掉（PRD 5.2）
  if (pregnancy.value?.lmp) {
    Object.assign(data, gaSnapshot(pregnancy.value.lmp, data.date))
  }
  if (editingId.value) {
    await db.visits.update(editingId.value, data)
  } else {
    data.createdAt = new Date().toISOString()
    await db.visits.add(data)
  }
  showForm.value = false
  await load()
  window.__showToast?.(editingId.value ? '已更新' : '已添加')
}

async function remove(id) {
  if (!confirm('删除这次产检？关联的检查单、照片和费用也会一并删除。')) return
  const exams = await db.exams.where('visitId').equals(id).toArray()
  for (const ex of exams) {
    await db.photos.where('examId').equals(ex.id).delete()
  }
  await db.exams.where('visitId').equals(id).delete()
  await db.expenses.where('visitId').equals(id).delete()
  await db.visits.delete(id)
  await load()
  window.__showToast?.('已删除')
}
</script>

<template>
  <div class="page">
    <header class="page-head">
      <div>
        <p class="eyebrow">Prenatal Visits</p>
        <h1 class="page-title">产检记录</h1>
        <p class="page-sub">共 {{ visits.length }} 次记录 · 每一次都值得留存</p>
      </div>
      <button class="btn btn-primary btn-sm" @click="openNew">+ 新增</button>
    </header>

    <div v-if="visits.length === 0" class="empty-state">
      <span class="empty-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path d="M8.5 4.6H6.6A1.6 1.6 0 0 0 5 6.2v12.2A1.6 1.6 0 0 0 6.6 20h10.8a1.6 1.6 0 0 0 1.6-1.6V6.2a1.6 1.6 0 0 0-1.6-1.6h-1.9" />
          <path d="M9 3.4h6a1 1 0 0 1 1 1v2H8v-2a1 1 0 0 1 1-1zM12 10.4v5.2M9.4 13h5.2" />
        </svg>
      </span>
      <p>还没有产检记录</p>
      <button class="btn btn-primary mt-12" @click="openNew">记第一次产检</button>
    </div>

    <div v-for="v in visits" :key="v.id" class="card visit-card" @click="router.push('/visits/' + v.id)">
      <div class="visit-date" aria-hidden="true">
        <span class="visit-day">{{ v.date.slice(8) }}</span>
        <span class="visit-ym">{{ v.date.slice(0, 7).replace('-', '.') }}</span>
      </div>

      <div class="visit-info">
        <div class="visit-line">
          <strong>{{ v.hospital || '未填医院' }}</strong>
          <span class="visit-ga">{{ v.gaLabel }}</span>
        </div>
        <p v-if="v.purpose" class="visit-purpose">{{ v.purpose }}</p>
        <p v-if="v.department || v.doctor" class="visit-doctor">{{ [v.department, v.doctor].filter(Boolean).join(' · ') }}</p>
        <p v-if="v.nextAppointment" class="mt-8">
          <span class="badge badge-middle">下次 {{ v.nextAppointment.slice(5).replace('-', '/') }}</span>
        </p>
      </div>

      <div class="visit-actions" @click.stop>
        <button class="icon-btn" title="编辑" aria-label="编辑" @click="openEdit(v)">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 20h4.2L19.3 8.9a2 2 0 0 0 0-2.8l-1.4-1.4a2 2 0 0 0-2.8 0L4 15.8z" />
            <path d="M14.5 6.3l3.2 3.2" />
          </svg>
        </button>
        <button class="icon-btn" title="删除" aria-label="删除" @click="remove(v.id)">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4.5 7h15M9 7V4.8A1.3 1.3 0 0 1 10.3 3.5h3.4A1.3 1.3 0 0 1 15 4.8V7M6.5 7l.8 12.2a1.6 1.6 0 0 0 1.6 1.5h6.2a1.6 1.6 0 0 0 1.6-1.5L17.5 7M10 11v6M14 11v6" />
          </svg>
        </button>
      </div>
    </div>

    <!-- form sheet -->
    <div v-if="showForm" class="modal-overlay" @click.self="showForm = false">
      <div class="modal-sheet">
        <div class="modal-handle"></div>
        <p class="eyebrow is-plain">Prenatal Visit</p>
        <h2 class="mb-16" style="font-size:1.32rem;letter-spacing:-0.03em">{{ editingId ? '编辑产检' : '新增产检' }}</h2>

        <div class="section-head"><h2>就诊信息</h2></div>
        <div class="detail-grid">
          <div class="form-group"><label class="form-label">日期 *</label><input v-model="form.date" type="date" class="form-input" /></div>
          <div class="form-group"><label class="form-label">医院</label><input v-model="form.hospital" class="form-input" placeholder="市妇幼保健院" /></div>
        </div>
        <div class="detail-grid">
          <div class="form-group"><label class="form-label">科室</label><input v-model="form.department" class="form-input" placeholder="产科" /></div>
          <div class="form-group"><label class="form-label">医生</label><input v-model="form.doctor" class="form-input" /></div>
        </div>
        <div class="form-group"><label class="form-label">就诊目的</label><input v-model="form.purpose" class="form-input" placeholder="如：NT 检查" /></div>

        <div class="divider"></div>
        <div class="section-head"><h2>医嘱与备注</h2></div>
        <div class="form-group"><label class="form-label">医嘱</label><textarea v-model="form.doctorNotes" class="form-textarea" placeholder="医生怎么说"></textarea></div>
        <div class="form-group"><label class="form-label">备注</label><textarea v-model="form.notes" class="form-textarea"></textarea></div>

        <div class="divider"></div>
        <div class="form-group"><label class="form-label">下次预约日期</label><input v-model="form.nextAppointment" type="date" class="form-input" /></div>

        <button class="btn btn-primary btn-block" @click="save">保存记录</button>
        <button class="btn btn-outline btn-block mt-8" @click="showForm = false">取消</button>
      </div>
    </div>
  </div>
</template>
