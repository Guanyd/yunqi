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
/** 分类条形图以最高的一项为 100% */
const maxCatAmt = computed(() => byCategory.value.length ? byCategory.value[0][1] : 1)
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
    <header class="page-head">
      <div>
        <p class="eyebrow">Expenses</p>
        <h1 class="page-title">花费记录</h1>
        <p class="page-sub">共 {{ expenses.length }} 笔 · 把每一笔都记得清清楚楚</p>
      </div>
      <button class="btn btn-primary btn-sm" @click="openNew">+ 记一笔</button>
    </header>

    <section class="summary-card">
      <p class="summary-label">TOTAL SPENT · 累计花费</p>
      <p class="summary-value"><span class="cur">¥</span>{{ total.toFixed(2) }}</p>
      <p class="summary-foot">
        {{ months.length ? `覆盖 ${months.length} 个月` : '还没有记录' }}
        <span v-if="filterMonth"> · 当前 {{ filterMonth }} 合计 ¥{{ filteredTotal.toFixed(2) }}</span>
      </p>
    </section>

    <!-- 分类分布 -->
    <section class="card">
      <div class="list-card-head"><small>按分类</small></div>
      <div v-for="[cat, amt] in byCategory" :key="cat" class="cat-row">
        <span class="cat-name">{{ cat }}</span>
        <span class="cat-bar"><span :style="{ width: (amt / maxCatAmt * 100) + '%' }"></span></span>
        <span class="cat-amt">¥{{ amt.toFixed(2) }}</span>
      </div>
      <p v-if="byCategory.length === 0" class="text-muted text-sm">暂无记录</p>
    </section>

    <!-- 月份筛选 -->
    <div class="section-head"><h2>明细</h2><span class="text-sm text-muted">{{ filtered.length }} 笔</span></div>
    <div class="chip-row mb-12">
      <button class="chip" :class="{ active: !filterMonth }" @click="filterMonth = ''">全部</button>
      <button v-for="m in months" :key="m" class="chip" :class="{ active: filterMonth === m }" @click="filterMonth = m">
        {{ m.slice(5) }} 月
      </button>
    </div>

    <div v-if="filtered.length === 0" class="empty-state">
      <span class="empty-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path d="M3.5 8.2V6.6a2.1 2.1 0 0 1 2.1-2.1h10.8M3.5 8.2h14.4a2.1 2.1 0 0 1 2.1 2.1v7.6a2.1 2.1 0 0 1-2.1 2.1H5.6a2.1 2.1 0 0 1-2.1-2.1z" />
          <path d="M20 12.1h-3.6a2 2 0 0 0 0 4H20M16.9 14.1h.01" />
        </svg>
      </span>
      <p>{{ filterMonth ? '这个月还没有记录' : '还没有花费记录' }}</p>
      <button class="btn btn-primary mt-12" @click="openNew">记第一笔</button>
    </div>

    <div v-for="e in filtered" :key="e.id" class="card expense-row">
      <span class="expense-avatar" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path d="M5 3.5h9.5L19 8v12.5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-16a1 1 0 0 1 1-1z" />
          <path d="M14 3.5V8h5M8 12h8M8 16h5" />
        </svg>
      </span>
      <div class="expense-main">
        <div class="flex items-center gap-8">
          <span class="expense-amount">¥{{ e.amount.toFixed(2) }}</span>
          <span v-if="e.visitId" class="badge badge-middle">产检</span>
        </div>
        <p class="expense-meta">{{ e.category }} · {{ e.date }}</p>
        <p v-if="e.notes" class="expense-notes">{{ e.notes }}</p>
      </div>
      <button class="icon-btn" title="删除" aria-label="删除" @click="remove(e.id)">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4.5 7h15M9 7V4.8A1.3 1.3 0 0 1 10.3 3.5h3.4A1.3 1.3 0 0 1 15 4.8V7M6.5 7l.8 12.2a1.6 1.6 0 0 0 1.6 1.5h6.2a1.6 1.6 0 0 0 1.6-1.5L17.5 7M10 11v6M14 11v6" />
        </svg>
      </button>
    </div>

    <!-- form -->
    <div v-if="showForm" class="modal-overlay" @click.self="showForm = false">
      <div class="modal-sheet">
        <div class="modal-handle"></div>
        <p class="eyebrow is-plain">New Expense</p>
        <h2 class="mb-16" style="font-size:1.32rem;letter-spacing:-0.03em">记一笔花费</h2>
        <div class="form-group"><label class="form-label">金额（元）*</label><input v-model="form.amount" type="number" step="0.01" min="0" class="form-input" inputmode="decimal" placeholder="0.00" /></div>
        <div class="detail-grid">
          <div class="form-group"><label class="form-label">分类</label>
            <select v-model="form.category" class="form-select">
              <option>孕妇枕</option><option>待产包</option><option>衣服</option><option>营养品</option><option>用品</option><option>其他</option>
            </select>
          </div>
          <div class="form-group"><label class="form-label">日期</label><input v-model="form.date" type="date" class="form-input" /></div>
        </div>
        <div class="form-group"><label class="form-label">备注</label><input v-model="form.notes" class="form-input" placeholder="如：XX 牌孕妇枕" /></div>
        <button class="btn btn-primary btn-block" @click="save">保存记录</button>
        <button class="btn btn-outline btn-block mt-8" @click="showForm = false">取消</button>
      </div>
    </div>
  </div>
</template>
