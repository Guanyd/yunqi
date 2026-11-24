<script setup>
import { ref, onMounted, computed } from 'vue'
import { db } from '../utils/db.js'

const expenses = ref([])
const showForm = ref(false)
const form = ref({ amount: '', category: '用品', date: '', notes: '', visitId: null })
const filterMonth = ref('')

onMounted(async () => { await load() })

async function load() {
  expenses.value = (await db.expenses.orderBy('date').reverse().toArray())
}

const total = computed(() => expenses.value.reduce((s, e) => s + e.amount, 0))
const byCategory = computed(() => {
  const map = {}
  for (const e of expenses.value) map[e.category] = (map[e.category] || 0) + e.amount
  return Object.entries(map).sort((a, b) => b[1] - a[1])
})
const months = computed(() => [...new Set(expenses.value.map(e => e.date.slice(0, 7)))].sort().reverse())
const filtered = computed(() => filterMonth.value ? expenses.value.filter(e => e.date.startsWith(filterMonth.value)) : expenses.value)
const filteredTotal = computed(() => filtered.value.reduce((s, e) => s + e.amount, 0))

function openNew() {
  form.value = { amount: '', category: '用品', date: new Date().toISOString().slice(0, 10), notes: '', visitId: null }
  showForm.value = true
}
async function save() {
  const amt = parseFloat(form.value.amount)
  if (!amt || amt <= 0) return
  await db.expenses.add({ ...form.value, amount: amt, createdAt: new Date().toISOString() })
  showForm.value = false
  await load()
  window.__showToast?.('已记录')
}
async function remove(id) {
  if (!confirm('删除这笔费用？')) return
  await db.expenses.delete(id)
  await load()
}
</script>

<template>
  <div class="page">
    <div class="flex justify-between items-center mb-12">
      <h1>花费</h1>
      <button class="btn btn-primary btn-sm" @click="openNew">+ 记一笔</button>
    </div>

    <div class="card" style="text-align:center">
      <small class="text-muted">总计</small>
      <p style="font-size:1.8rem;font-weight:700;color:var(--accent)">¥{{ total.toFixed(2) }}</p>
    </div>

    <!-- by category -->
    <div class="card">
      <h3 class="mb-8">按分类</h3>
      <div v-for="[cat, amt] in byCategory" :key="cat" class="flex justify-between" style="padding:4px 0">
        <span>{{ cat }}</span><strong>¥{{ amt.toFixed(2) }}</strong>
      </div>
      <p v-if="byCategory.length===0" class="text-muted text-sm">暂无记录</p>
    </div>

    <!-- month filter -->
    <div class="flex gap-8 items-center mb-12" style="flex-wrap:wrap">
      <button class="btn btn-sm" :class="!filterMonth?'btn-primary':'btn-outline'" @click="filterMonth=''">全部</button>
      <button v-for="m in months" :key="m" class="btn btn-sm" :class="filterMonth===m?'btn-primary':'btn-outline'" @click="filterMonth=m">{{ m }}</button>
    </div>
    <p v-if="filterMonth" class="text-sm text-muted mb-8">{{ filterMonth }} 合计：¥{{ filteredTotal.toFixed(2) }}</p>

    <div v-for="e in filtered" :key="e.id" class="card flex justify-between items-center">
      <div>
        <strong>¥{{ e.amount.toFixed(2) }}</strong>
        <span class="text-muted text-sm" style="margin-left:8px">{{ e.category }} · {{ e.date }}</span>
        <span v-if="e.visitId" class="badge badge-middle" style="margin-left:6px">产检</span>
        <span v-else class="badge badge-early" style="margin-left:6px">用品</span>
        <p v-if="e.notes" class="text-sm text-muted">{{ e.notes }}</p>
      </div>
      <button class="btn btn-sm btn-outline text-danger" @click="remove(e.id)">删除</button>
    </div>

    <!-- form -->
    <div v-if="showForm" class="modal-overlay" @click.self="showForm=false">
      <div class="modal-sheet">
        <div class="modal-handle"></div>
        <h2 class="mb-12">记一笔用品花费</h2>
        <div class="form-group"><label class="form-label">金额（元）*</label><input v-model="form.amount" type="number" step="0.01" min="0" class="form-input" inputmode="decimal" /></div>
        <div class="form-group"><label class="form-label">分类</label>
          <select v-model="form.category" class="form-select">
            <option>孕妇枕</option><option>待产包</option><option>衣服</option><option>营养品</option><option>用品</option><option>其他</option>
          </select>
        </div>
        <div class="form-group"><label class="form-label">日期</label><input v-model="form.date" type="date" class="form-input" /></div>
        <div class="form-group"><label class="form-label">备注</label><input v-model="form.notes" class="form-input" placeholder="如：XX牌孕妇枕" /></div>
        <button class="btn btn-primary btn-block" @click="save">保存</button>
      </div>
    </div>
  </div>
</template>