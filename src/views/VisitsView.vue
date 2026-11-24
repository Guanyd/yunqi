<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { db, getPregnancy } from '../utils/db.js'
import { gestationalAge, formatGA } from '../utils/pregnancy.js'

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
    gaLabel: pregnancy.value ? formatGA(gestationalAge(pregnancy.value.lmp, v.date)) : ''
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
    <div class="flex justify-between items-center mb-12">
      <h1>产检记录</h1>
      <button class="btn btn-primary btn-sm" @click="openNew">+ 新增</button>
    </div>

    <div v-if="visits.length === 0" class="empty-state">
      <p>还没有产检记录</p>
      <button class="btn btn-primary mt-12" @click="openNew">记第一次产检</button>
    </div>

    <div v-for="v in visits" :key="v.id" class="card" style="cursor:pointer" @click="router.push('/visits/' + v.id)">
      <div class="flex justify-between items-center">
        <div>
          <strong>{{ v.date }}</strong>
          <span class="text-muted text-sm" style="margin-left:8px">{{ v.gaLabel }}</span>
        </div>
        <div class="flex gap-8" @click.stop>
          <button class="btn btn-sm btn-outline" @click="openEdit(v)">编辑</button>
          <button class="btn btn-sm btn-outline text-danger" @click="remove(v.id)">删除</button>
        </div>
      </div>
      <p v-if="v.hospital" class="text-sm text-muted mt-8">{{ v.hospital }}{{ v.doctor ? ' · ' + v.doctor : '' }}</p>
      <p v-if="v.purpose" class="text-sm mt-8">{{ v.purpose }}</p>
    </div>

    <!-- form sheet -->
    <div v-if="showForm" class="modal-overlay" @click.self="showForm=false">
      <div class="modal-sheet">
        <div class="modal-handle"></div>
        <h2 class="mb-12">{{ editingId ? '编辑产检' : '新增产检' }}</h2>
        <div class="form-group"><label class="form-label">日期 *</label><input v-model="form.date" type="date" class="form-input" /></div>
        <div class="form-group"><label class="form-label">医院</label><input v-model="form.hospital" class="form-input" placeholder="如：市妇幼保健院" /></div>
        <div class="form-group"><label class="form-label">科室</label><input v-model="form.department" class="form-input" placeholder="如：产科" /></div>
        <div class="form-group"><label class="form-label">医生</label><input v-model="form.doctor" class="form-input" /></div>
        <div class="form-group"><label class="form-label">就诊目的</label><input v-model="form.purpose" class="form-input" placeholder="如：NT检查" /></div>
        <div class="form-group"><label class="form-label">医嘱</label><textarea v-model="form.doctorNotes" class="form-textarea" placeholder="医生怎么说"></textarea></div>
        <div class="form-group"><label class="form-label">备注</label><textarea v-model="form.notes" class="form-textarea"></textarea></div>
        <div class="form-group"><label class="form-label">下次预约日期</label><input v-model="form.nextAppointment" type="date" class="form-input" /></div>
        <button class="btn btn-primary btn-block" @click="save">保存</button>
      </div>
    </div>
  </div>
</template>