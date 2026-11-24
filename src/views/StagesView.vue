<script setup>
import { ref, onMounted, computed } from 'vue'
import { db, getPregnancy } from '../utils/db.js'
import { gestationalAge, trimesterLabel } from '../utils/pregnancy.js'
import { defaultStageItems } from '../utils/stageDefaults.js'

const pregnancy = ref(null)
const currentTrimester = ref('early')
const items = ref([])
const showForm = ref(false)
const form = ref({ title: '', detail: '', stage: 'early' })
const editingId = ref(null)
const activeTab = ref('early')

onMounted(async () => {
  pregnancy.value = await getPregnancy()
  if (pregnancy.value) {
    const ga = gestationalAge(pregnancy.value.lmp)
    currentTrimester.value = ga.trimester
    activeTab.value = ga.trimester
  }
  // seed defaults if empty
  const count = await db.stageItems.count()
  if (count === 0) {
    await db.stageItems.bulkAdd(defaultStageItems.map(d => ({ ...d, createdAt: new Date().toISOString() })))
  }
  await load()
})

async function load() {
  items.value = await db.stageItems.orderBy('sortOrder').toArray()
}

const filtered = computed(() => items.value.filter(i => i.stage === activeTab.value))

async function toggleStatus(item) {
  const next = item.status === 'done' ? 'pending' : item.status === 'skipped' ? 'pending' : 'done'
  await db.stageItems.update(item.id, { status: next })
  await load()
}
async function markSkipped(item) {
  await db.stageItems.update(item.id, { status: item.status === 'skipped' ? 'pending' : 'skipped' })
  await load()
}

function openNew() {
  editingId.value = null
  form.value = { title: '', detail: '', stage: activeTab.value }
  showForm.value = true
}
function openEdit(item) {
  editingId.value = item.id
  form.value = { title: item.title, detail: item.detail || '', stage: item.stage }
  showForm.value = true
}
async function save() {
  if (!form.value.title) return
  const maxSort = Math.max(0, ...items.value.filter(i => i.stage === form.value.stage).map(i => i.sortOrder))
  const data = { ...form.value, sortOrder: editingId.value ? undefined : maxSort + 1, updatedAt: new Date().toISOString() }
  if (editingId.value) {
    delete data.sortOrder
    await db.stageItems.update(editingId.value, data)
  } else {
    data.status = 'pending'
    data.createdAt = new Date().toISOString()
    await db.stageItems.add(data)
  }
  showForm.value = false
  await load()
}
async function remove(id) {
  if (!confirm('删除这条备忘？')) return
  await db.stageItems.delete(id)
  await load()
}

const tabs = [
  { key: 'early', label: '孕早期' },
  { key: 'middle', label: '孕中期' },
  { key: 'late', label: '孕晚期' }
]
</script>

<template>
  <div class="page">
    <div class="flex justify-between items-center mb-12">
      <h1>阶段备忘</h1>
      <button class="btn btn-primary btn-sm" @click="openNew">+ 添加</button>
    </div>
    <p class="text-muted text-sm mb-12">⚠️ 仅为常见节奏参考，不替代医生安排。以你们医院医嘱为准。</p>

    <div class="flex gap-8 mb-12">
      <button v-for="t in tabs" :key="t.key" class="btn btn-sm" :class="activeTab===t.key?'btn-primary':'btn-outline'" @click="activeTab=t.key">
        {{ t.label }}{{ t.key===currentTrimester ? ' ●' : '' }}
      </button>
    </div>

    <div v-if="filtered.length===0" class="empty-state"><p>这个阶段暂无条目</p></div>

    <div v-for="item in filtered" :key="item.id" class="card" :style="{ opacity: item.status==='skipped' ? 0.5 : 1 }">
      <div class="flex justify-between items-center">
        <strong :style="{ textDecoration: item.status==='done' ? 'line-through' : 'none' }">{{ item.title }}</strong>
        <span v-if="item.status==='done'" class="badge badge-early">已做</span>
        <span v-else-if="item.status==='skipped'" class="badge badge-late">本院不查</span>
      </div>
      <p v-if="item.detail" class="text-sm text-muted mt-8">{{ item.detail }}</p>
      <div class="flex gap-8 mt-8">
        <button class="btn btn-sm btn-outline" @click="toggleStatus(item)">{{ item.status==='done' ? '取消完成' : '标记已做' }}</button>
        <button class="btn btn-sm btn-outline" @click="markSkipped(item)">{{ item.status==='skipped' ? '恢复' : '本院不查' }}</button>
        <button class="btn btn-sm btn-outline" @click="openEdit(item)">编辑</button>
        <button class="btn btn-sm btn-outline text-danger" @click="remove(item.id)">删除</button>
      </div>
    </div>

    <!-- form -->
    <div v-if="showForm" class="modal-overlay" @click.self="showForm=false">
      <div class="modal-sheet">
        <div class="modal-handle"></div>
        <h2 class="mb-12">{{ editingId ? '编辑条目' : '添加条目' }}</h2>
        <div class="form-group"><label class="form-label">标题 *</label><input v-model="form.title" class="form-input" /></div>
        <div class="form-group"><label class="form-label">详细说明</label><textarea v-model="form.detail" class="form-textarea"></textarea></div>
        <div class="form-group"><label class="form-label">所属阶段</label>
          <select v-model="form.stage" class="form-select">
            <option value="early">孕早期</option><option value="middle">孕中期</option><option value="late">孕晚期</option>
          </select>
        </div>
        <button class="btn btn-primary btn-block" @click="save">保存</button>
      </div>
    </div>
  </div>
</template>