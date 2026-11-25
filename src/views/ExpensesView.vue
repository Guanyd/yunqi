<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { db } from '../utils/db.js'

const expenses = ref([])
const showForm = ref(false)
const form = ref({ amount: '', category: '用品', date: '', notes: '', visitId: null })
const filterMonth = ref('')
const filterCategory = ref('')

onMounted(async () => { await load() })

async function load() {
  expenses.value = (await db.expenses.orderBy('date').reverse().toArray())
}

const total = computed(() => expenses.value.reduce((s, e) => s + e.amount, 0))

/** 月份筛选后的记录：分类分布图和分类选项都基于它，保证「看到什么就能点什么」 */
const byMonth = computed(() =>
  filterMonth.value ? expenses.value.filter(e => e.date.startsWith(filterMonth.value)) : expenses.value
)

const byCategory = computed(() => {
  const map = {}
  for (const e of byMonth.value) {
    const cat = e.category || '其他'
    map[cat] = (map[cat] || 0) + e.amount
  }
  return Object.entries(map).sort((a, b) => b[1] - a[1])
})
/** 分类条形图以最高的一项为 100% */
const maxCatAmt = computed(() => byCategory.value.length ? byCategory.value[0][1] : 1)
const months = computed(() => [...new Set(expenses.value.map(e => e.date.slice(0, 7)))].sort().reverse())

/** 分类筛选项：只列出当前月份里真实出现过的分类，附带笔数 */
const categoryOptions = computed(() => {
  const map = {}
  for (const e of byMonth.value) {
    const cat = e.category || '其他'
    map[cat] = (map[cat] || 0) + 1
  }
  return byCategory.value.map(([cat, amt]) => ({ cat, amt, count: map[cat] }))
})

const filtered = computed(() =>
  byMonth.value.filter(e => !filterCategory.value || (e.category || '其他') === filterCategory.value)
)
const filteredTotal = computed(() => filtered.value.reduce((s, e) => s + e.amount, 0))
const hasFilter = computed(() => !!filterMonth.value || !!filterCategory.value)

/** 切换月份后，若已选分类在新月份里不存在，自动退回「全部分类」，避免筛出空列表 */
watch(byMonth, () => {
  if (!filterCategory.value) return
  if (!byMonth.value.some(e => (e.category || '其他') === filterCategory.value)) {
    filterCategory.value = ''
  }
})

function toggleCategory(cat) {
  filterCategory.value = filterCategory.value === cat ? '' : cat
}
function clearFilters() {
  filterMonth.value = ''
  filterCategory.value = ''
}

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
        <span v-if="hasFilter"> · 筛选后 ¥{{ filteredTotal.toFixed(2) }}（{{ filtered.length }} 笔）</span>
      </p>
    </section>

    <!-- 分类分布：点一下即按该分类筛选，再点一下取消 -->
    <section class="card">
      <div class="list-card-head">
        <small>按分类{{ filterMonth ? ` · ${filterMonth.slice(5)} 月` : '' }}</small>
        <small v-if="filterCategory" class="cat-clear-hint">再点一次取消</small>
        <small v-else-if="categoryOptions.length" class="cat-clear-hint">点分类可筛选</small>
      </div>
      <button
        v-for="row in categoryOptions"
        :key="row.cat"
        type="button"
        class="cat-row cat-row-btn"
        :class="{ 'is-active': filterCategory === row.cat }"
        :aria-pressed="filterCategory === row.cat"
        @click="toggleCategory(row.cat)"
      >
        <span class="cat-name">{{ row.cat }}</span>
        <span class="cat-bar"><span :style="{ width: (row.amt / maxCatAmt * 100) + '%' }"></span></span>
        <span class="cat-amt">¥{{ row.amt.toFixed(2) }}</span>
      </button>
      <p v-if="categoryOptions.length === 0" class="text-muted text-sm">暂无记录</p>
    </section>

    <!-- 明细 -->
    <div class="section-head">
      <h2>明细</h2>
      <span class="text-sm text-muted">{{ filtered.length }} 笔 · ¥{{ filteredTotal.toFixed(2) }}</span>
    </div>

    <!-- 月份筛选 -->
    <div class="chip-row mb-12">
      <button class="chip" :class="{ active: !filterMonth }" @click="filterMonth = ''">全部月份</button>
      <button v-for="m in months" :key="m" class="chip" :class="{ active: filterMonth === m }" @click="filterMonth = m">
        {{ m.slice(5) }} 月
      </button>
    </div>

    <!-- 当前筛选条件 -->
    <div v-if="hasFilter" class="filter-bar">
      <span class="filter-text">
        <span v-if="filterMonth">{{ filterMonth }}</span>
        <span v-else>全部月份</span>
        <span class="filter-sep">·</span>
        <span>{{ filterCategory || '全部分类' }}</span>
      </span>
      <button class="filter-clear" @click="clearFilters">清除筛选</button>
    </div>

    <div v-if="filtered.length === 0" class="empty-state">
      <span class="empty-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path d="M3.5 8.2V6.6a2.1 2.1 0 0 1 2.1-2.1h10.8M3.5 8.2h14.4a2.1 2.1 0 0 1 2.1 2.1v7.6a2.1 2.1 0 0 1-2.1 2.1H5.6a2.1 2.1 0 0 1-2.1-2.1z" />
          <path d="M20 12.1h-3.6a2 2 0 0 0 0 4H20M16.9 14.1h.01" />
        </svg>
      </span>
      <p v-if="hasFilter">没有符合筛选条件的记录</p>
      <p v-else>还没有花费记录</p>
      <button v-if="hasFilter" class="btn btn-outline mt-12" @click="clearFilters">清除筛选</button>
      <button v-else class="btn btn-primary mt-12" @click="openNew">记第一笔</button>
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
