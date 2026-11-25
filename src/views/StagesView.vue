<script setup>
import { ref, onMounted, computed } from 'vue'
import { db, getPregnancy } from '../utils/db.js'
import { gestationalAge } from '../utils/pregnancy.js'
import { defaultStageItems, STAGE_KINDS } from '../utils/stageDefaults.js'

const pregnancy = ref(null)
const currentTrimester = ref('early')
const currentWeeks = ref(0)
const items = ref([])
const showForm = ref(false)
const form = ref({ title: '', detail: '', stage: 'early', weekStart: null, weekEnd: null, kind: 'exam' })
const editingId = ref(null)
const activeTab = ref('early')
// 展开详情的条目 id（点击卡片切换）
const expandedId = ref(null)

onMounted(async () => {
  pregnancy.value = await getPregnancy()
  if (pregnancy.value) {
    const ga = gestationalAge(pregnancy.value.lmp)
    currentTrimester.value = ga.trimester
    currentWeeks.value = ga.weeks
    activeTab.value = ga.trimester
  }
  // 首次进入时铺预置条目
  const count = await db.stageItems.count()
  if (count === 0) {
    await db.stageItems.bulkAdd(
      defaultStageItems.map(d => ({ ...d, createdAt: new Date().toISOString() }))
    )
  }
  await load()
})

async function load() {
  items.value = await db.stageItems.orderBy('sortOrder').toArray()
}

const filtered = computed(() => items.value.filter(i => i.stage === activeTab.value))

/** 按类型分组，组内按孕周先后排；空组不显示 */
const groups = computed(() => {
  return STAGE_KINDS
    .map(kind => ({
      ...kind,
      items: filtered.value
        .filter(i => (i.kind || 'exam') === kind.key)
        .sort((a, b) => (a.weekStart ?? 99) - (b.weekStart ?? 99) || a.sortOrder - b.sortOrder)
    }))
    .filter(g => g.items.length > 0)
})

const doneCount = computed(() => filtered.value.filter(i => i.status === 'done' && !isCaution(i)).length)

/** 当前阶段共几条、已做几条，用于顶部进度（注意事项不参与统计） */
const progressText = computed(() => {
  const total = filtered.value.filter(i => !isCaution(i)).length
  if (!total) return ''
  return `已做 ${doneCount.value} / ${total}`
})

/** 条目相对当前孕周的位置：now 正在窗口内 / past 已过窗口 / future 还没到 */
function timingOf(item) {
  if (item.weekStart == null) return ''
  const w = currentWeeks.value
  if (w > item.weekEnd) return 'past'
  if (w < item.weekStart) return 'future'
  return 'now'
}

function weekLabel(item) {
  if (item.weekStart == null) return ''
  const end = item.weekEnd != null ? `-${item.weekEnd}` : ''
  return `${item.weekStart}${end}周${item.weekNote || ''}`
}

/** 状态文案，只在「正在进行」的窗口上提示，避免每张卡都挂一堆字。
 *  注意事项（caution）是持续提醒，不是待办任务，所以不套用「可以做」的说法。 */
function timingLabel(item) {
  const t = timingOf(item)
  if (!t) return ''
  if ((item.kind || 'exam') === 'caution') {
    // 提醒只在窗口内提示一次，过了就不再唠叨
    return t === 'now' ? '这段时间注意' : ''
  }
  if (t === 'now') return '现在可以做'
  if (t === 'past') return '已过窗口'
  return ''
}

async function toggleStatus(item) {
  const next = item.status === 'done' ? 'pending' : 'done'
  await db.stageItems.update(item.id, { status: next })
  await load()
}

async function markSkipped(item) {
  const next = item.status === 'skipped' ? 'pending' : 'skipped'
  await db.stageItems.update(item.id, { status: next })
  await load()
}

/** 注意事项属于持续提醒，没有「做完」这个概念，不参与完成度统计 */
function isCaution(item) {
  return (item.kind || 'exam') === 'caution'
}

function toggleExpand(item) {
  expandedId.value = expandedId.value === item.id ? null : item.id
}

function openNew() {
  editingId.value = null
  form.value = { title: '', detail: '', stage: activeTab.value, weekStart: null, weekEnd: null, kind: 'exam' }
  showForm.value = true
}
function openEdit(item) {
  editingId.value = item.id
  form.value = {
    title: item.title,
    detail: item.detail || '',
    stage: item.stage,
    weekStart: item.weekStart ?? null,
    weekEnd: item.weekEnd ?? null,
    kind: item.kind || 'exam'
  }
  showForm.value = true
}
async function save() {
  if (!form.value.title) return
  const maxSort = Math.max(0, ...items.value.filter(i => i.stage === form.value.stage).map(i => i.sortOrder))
  const data = {
    ...form.value,
    weekStart: form.value.weekStart === '' || form.value.weekStart == null ? null : Number(form.value.weekStart),
    weekEnd: form.value.weekEnd === '' || form.value.weekEnd == null ? null : Number(form.value.weekEnd),
    updatedAt: new Date().toISOString()
  }
  if (editingId.value) {
    await db.stageItems.update(editingId.value, data)
  } else {
    data.sortOrder = maxSort + 1
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
  expandedId.value = null
  await load()
}

const tabs = [
  { key: 'early', label: '孕早期' },
  { key: 'middle', label: '孕中期' },
  { key: 'late', label: '孕晚期' }
]
</script>

<template>
  <div class="page stages-page">
    <header class="page-head">
      <div>
        <p class="eyebrow">STAGE NOTES</p>
        <h1 class="page-title">阶段备忘</h1>
        <p class="page-sub">仅为常见节奏参考，不替代医生安排，以你们医院医嘱为准。</p>
      </div>
      <button class="btn btn-primary btn-sm" @click="openNew">
        <svg class="btn-ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M12 5v14M5 12h14" />
        </svg>
        添加
      </button>
    </header>

    <div class="segmented stage-tabs" role="tablist">
      <button
        v-for="t in tabs" :key="t.key"
        class="stage-tab" :class="{ active: activeTab === t.key }"
        role="tab" :aria-selected="activeTab === t.key"
        @click="activeTab = t.key"
      >
        {{ t.label }}
        <span v-if="t.key === currentTrimester" class="seg-dot">当前</span>
      </button>
    </div>

    <div v-if="progressText" class="card stage-progress">
      <div class="stage-progress-head">
        <span class="stage-progress-count display-num">{{ progressText }}</span>
        <span class="text-sm text-muted">当前孕周 {{ currentWeeks }} 周</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: (doneCount / Math.max(1, filtered.filter(i => !isCaution(i)).length) * 100) + '%' }"></div>
      </div>
    </div>

    <div v-if="filtered.length === 0" class="empty-state">
      <span class="empty-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" focusable="false">
          <rect x="5" y="4" width="14" height="17" rx="2.5" />
          <path d="M9 4V2.8h6V4" />
          <path d="M8.5 10h7M8.5 14h4.5" />
        </svg>
      </span>
      <p>这个阶段暂无条目</p>
      <p class="text-sm text-muted">点右上角「添加」记一条属于你的备忘。</p>
    </div>

    <section v-for="g in groups" :key="g.key" class="stage-group">
      <div class="section-head">
        <h2>{{ g.label }}</h2>
        <span class="stage-group-count">
          <template v-if="g.key === 'caution'">{{ g.items.length }} 条</template>
          <template v-else>{{ g.items.filter(i => i.status === 'done').length }}/{{ g.items.length }}</template>
        </span>
      </div>

      <div class="card stage-card">
        <ul class="stage-list">
          <li
            v-for="item in g.items" :key="item.id"
            class="stage-item"
            :class="[`is-${item.status}`, timingOf(item) && `timing-${timingOf(item)}`, { expanded: expandedId === item.id }]"
          >
            <button
              v-if="!isCaution(item)"
              class="stage-check" :class="`is-${item.status}`"
              @click.stop="toggleStatus(item)"
              :aria-label="item.status === 'done' ? '取消完成' : '标记已做'"
            >
              <svg v-if="item.status === 'done'" viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
                <path d="M3 8.5l3.2 3.2L13 5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
              <svg v-else-if="item.status === 'skipped'" viewBox="0 0 16 16" width="10" height="10" aria-hidden="true">
                <path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" />
              </svg>
            </button>
            <!-- 注意事项没有「做完了」这一说，用一个小圆点占位保持左边对齐 -->
            <span v-else class="stage-dot" aria-hidden="true"></span>

            <div class="stage-body" @click="toggleExpand(item)">
              <div class="stage-line">
                <span class="stage-title">{{ item.title }}</span>
                <span v-if="weekLabel(item)" class="stage-week">{{ weekLabel(item) }}</span>
              </div>
              <div v-if="timingLabel(item) || item.status === 'skipped'" class="stage-meta">
                <span v-if="timingLabel(item)" class="stage-hint" :class="`is-${timingOf(item)}`">{{ timingLabel(item) }}</span>
                <span v-if="item.status === 'skipped'" class="stage-hint is-skipped">本院不查</span>
              </div>
            </div>

            <button class="stage-more" @click.stop="toggleExpand(item)" :aria-expanded="expandedId === item.id" aria-label="展开详情">
              <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" :style="{ transform: expandedId === item.id ? 'rotate(180deg)' : 'none' }">
                <path d="M4 6.5l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>

            <div v-if="expandedId === item.id" class="stage-detail">
              <p v-if="item.detail">{{ item.detail }}</p>
              <div class="stage-actions">
                <template v-if="!isCaution(item)">
                  <button class="btn btn-sm btn-outline" @click="toggleStatus(item)">
                    {{ item.status === 'done' ? '取消完成' : '标记已做' }}
                  </button>
                  <button class="btn btn-sm btn-outline" @click="markSkipped(item)">
                    {{ item.status === 'skipped' ? '恢复待做' : '本院不查' }}
                  </button>
                </template>
                <button class="btn btn-sm btn-outline" @click="openEdit(item)">编辑</button>
                <button class="btn btn-sm btn-outline text-danger" @click="remove(item.id)">删除</button>
              </div>
            </div>
          </li>
        </ul>
      </div>
    </section>

    <!-- form -->
    <div v-if="showForm" class="modal-overlay" @click.self="showForm = false">
      <div class="modal-sheet">
        <div class="modal-handle"></div>
        <p class="eyebrow is-plain is-muted">{{ editingId ? 'EDIT NOTE' : 'NEW NOTE' }}</p>
        <h2 class="mb-12">{{ editingId ? '编辑条目' : '添加条目' }}</h2>
        <div class="form-group">
          <label class="form-label">标题 *</label>
          <input v-model="form.title" class="form-input" />
        </div>
        <div class="form-group">
          <label class="form-label">详细说明</label>
          <textarea v-model="form.detail" class="form-textarea"></textarea>
        </div>
        <div class="form-group">
          <label class="form-label">类型</label>
          <select v-model="form.kind" class="form-select">
            <option v-for="k in STAGE_KINDS" :key="k.key" :value="k.key">{{ k.label }}</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">建议孕周（留空表示不限）</label>
          <div class="flex gap-8 items-center">
            <input v-model="form.weekStart" class="form-input" type="number" min="0" max="42" placeholder="从" />
            <span class="text-muted">—</span>
            <input v-model="form.weekEnd" class="form-input" type="number" min="0" max="42" placeholder="到" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">所属阶段</label>
          <select v-model="form.stage" class="form-select">
            <option value="early">孕早期</option>
            <option value="middle">孕中期</option>
            <option value="late">孕晚期</option>
          </select>
        </div>
        <button class="btn btn-primary btn-block" @click="save">保存</button>
        <button class="btn btn-outline btn-block mt-8" @click="showForm = false">取消</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stages-page .page-head { margin-bottom: 18px; }
.stages-page .page-sub { max-width: 360px; text-wrap: balance; }
.btn-ico {
  width: 15px; height: 15px; flex: none;
  fill: none; stroke: currentColor; stroke-width: 1.9;
  stroke-linecap: round; stroke-linejoin: round;
}

.stage-tabs { margin-bottom: 16px; }
.stage-tabs > button { position: relative; }

.stage-progress { padding: 15px 17px 16px; margin-bottom: 6px; }
.stage-progress-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.stage-progress-count { font-size: 1.06rem; font-weight: 650; letter-spacing: -0.01em; }

.stage-group .section-head { margin: 20px 2px 10px; }
.stage-group-count {
  font-size: 0.74rem; font-weight: 650; font-variant-numeric: tabular-nums;
  color: var(--ink-3); background: var(--surface-2);
  padding: 4px 10px; border-radius: 999px;
}

.stage-card { padding: 4px 17px; }
.stage-list { list-style: none; margin: 0; padding: 0; }
.stage-item {
  display: grid;
  grid-template-columns: 26px minmax(0, 1fr) 24px;
  align-items: start;
  gap: 11px;
  padding: 13px 0;
  border-bottom: 1px solid var(--line-soft);
  transition: opacity 0.2s;
}
.stage-item:last-child { border-bottom: 0; }
.stage-item.timing-past { opacity: 0.72; }

.stage-check {
  width: 24px; height: 24px; margin-top: 1px;
  border: 1.6px solid var(--line); border-radius: 8px;
  background: var(--surface); color: transparent;
  display: grid; place-items: center; cursor: pointer;
  transition: background 0.2s, border-color 0.2s, transform 0.16s;
}
.stage-check:active { transform: scale(0.9); }
.stage-check.is-done { background: var(--accent); border-color: var(--accent); color: #fffdfb; }
.stage-check.is-skipped { background: var(--surface-2); border-color: transparent; color: var(--ink-3); }

.stage-dot {
  width: 8px; height: 8px; margin: 9px auto 0;
  border-radius: 50%; background: var(--accent); opacity: 0.55;
}

.stage-body { min-width: 0; cursor: pointer; }
.stage-line { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; }
.stage-title { font-size: 0.9rem; font-weight: 600; line-height: 1.45; color: var(--ink); }
.stage-item.is-done .stage-title { color: var(--ink-3); text-decoration: line-through; text-decoration-color: var(--line); }
.stage-item.is-skipped .stage-title { color: var(--ink-3); }
.stage-week {
  flex: none; font-size: 0.7rem; font-weight: 600;
  color: var(--ink-2); background: var(--surface-2);
  padding: 3px 8px; border-radius: 8px; white-space: nowrap;
}
.stage-item.timing-now .stage-week { background: var(--accent-soft); color: var(--accent-deep); }

.stage-meta { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
.stage-hint {
  font-size: 0.7rem; font-weight: 600;
  padding: 2px 8px; border-radius: 7px;
  background: var(--surface-2); color: var(--ink-3);
}
.stage-hint.is-now { background: var(--accent-soft); color: var(--accent-deep); }
.stage-hint.is-skipped { background: transparent; padding-left: 0; }

.stage-more {
  width: 24px; height: 24px; margin-top: 1px;
  border: 0; background: transparent; color: var(--ink-3);
  display: grid; place-items: center; cursor: pointer;
  border-radius: 8px; transition: color 0.2s, background 0.2s;
}
.stage-more:hover { color: var(--accent-deep); background: var(--accent-soft); }
.stage-more svg { transition: transform 0.24s; }

.stage-detail {
  grid-column: 1 / -1; margin-top: 2px;
  background: var(--surface-2); border-radius: var(--r-md);
  padding: 12px 13px;
}
.stage-detail > p { font-size: 0.82rem; line-height: 1.65; color: var(--ink-2); margin-bottom: 10px; }
.stage-actions { display: flex; flex-wrap: wrap; gap: 7px; }
.stage-actions .btn { padding: 7px 11px; font-size: 0.78rem; }
</style>
