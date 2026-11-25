<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { db, getPregnancy, getSetting } from '../utils/db.js'
import { gestationalAge, formatGA, trimesterLabel, today, daysBetween, recordGALabel } from '../utils/pregnancy.js'

const router = useRouter()
const pregnancy = ref(null)
const ga = ref(null)
const nextVisit = ref(null)
const lastVisit = ref(null)
const totalExpense = ref(0)
const monthExpense = ref(0)
const lastBackup = ref(null)
const visitCountSinceBackup = ref(0)
const loading = ref(true)

const showBackupReminder = computed(() => {
  if (!lastBackup.value) return true
  const daysSince = daysBetween(lastBackup.value, today())
  return daysSince > 7 || visitCountSinceBackup.value >= 3
})

/** 最近一次产检的孕周标注（优先用记录里保存的当日孕周） */
const lastVisitGA = computed(() => {
  if (!lastVisit.value || !pregnancy.value) return ''
  return recordGALabel(lastVisit.value, pregnancy.value.lmp)
})

/** 距上次产检过了多少天 */
const lastVisitDaysAgo = computed(() => {
  if (!lastVisit.value) return null
  return daysBetween(lastVisit.value.date, today())
})

/** 40 周旅程进度，用于圆环与刻度 */
const progressPct = computed(() => {
  if (!ga.value) return 0
  return Math.min(100, Math.max(0, ((ga.value.weeks + ga.value.days / 7) / 40) * 100))
})
const progressRounded = computed(() => Math.round(progressPct.value))

/** 从末次月经算起已经走过的天数 */
const elapsedDays = computed(() => {
  if (!pregnancy.value) return 0
  return Math.max(0, daysBetween(pregnancy.value.lmp, today()))
})

const todayLabel = new Date().toLocaleDateString('zh-CN', {
  month: 'long', day: 'numeric', weekday: 'long'
})

onMounted(async () => {
  pregnancy.value = await getPregnancy()
  if (!pregnancy.value) { router.replace('/setup'); return }
  ga.value = gestationalAge(pregnancy.value.lmp)

  // visits: 按日期升序
  const visits = await db.visits.orderBy('date').toArray()
  const t = today()
  // 下次产检：最早一条未来的预约日期
  nextVisit.value = visits.find(v => v.nextAppointment && v.nextAppointment >= t)?.nextAppointment || null
  // 最近一次产检：日期不晚于今天的最后一条
  lastVisit.value = visits.filter(v => v.date <= t).pop() || null

  // expenses
  const expenses = await db.expenses.toArray()
  totalExpense.value = expenses.reduce((s, e) => s + e.amount, 0)
  const monthPrefix = t.slice(0, 7)
  monthExpense.value = expenses.filter(e => e.date.startsWith(monthPrefix)).reduce((s, e) => s + e.amount, 0)

  // backup reminder
  lastBackup.value = await getSetting('lastBackupDate', null)
  if (lastBackup.value) {
    visitCountSinceBackup.value = visits.filter(v => v.createdAt > lastBackup.value).length
  } else {
    visitCountSinceBackup.value = visits.length
  }
  loading.value = false
})

function fmtMoney(n) { return n.toFixed(2) }
</script>

<template>
  <div class="page" v-if="!loading && pregnancy">
    <header class="page-head">
      <div>
        <p class="eyebrow">{{ todayLabel }}</p>
        <h1 class="page-title">你好，{{ pregnancy.nickname || '准妈妈' }}</h1>
        <p class="page-sub">今天也好好记录，慢慢等 ta 长大。</p>
      </div>
    </header>

    <!-- 孕期旅程 -->
    <section class="hero-card" aria-label="当前孕期进度">
      <div class="hero-top">
        <span class="eyebrow is-plain">Pregnancy Journey</span>
        <span class="badge" :class="'badge-' + ga.trimester">{{ trimesterLabel(ga.trimester) }}</span>
      </div>

      <div class="hero-main">
        <div class="hero-copy">
          <p class="hero-kicker">当前孕周</p>
          <p class="hero-number">
            {{ ga.weeks }}<span class="hero-unit">周</span><span class="hero-plus">+{{ ga.days }}天</span>
          </p>
          <p class="hero-note">距离见面还有 <strong>{{ ga.daysRemaining }}</strong> 天</p>
        </div>
        <div class="hero-ring" aria-hidden="true">
          <svg viewBox="0 0 100 100">
            <circle class="ring-track" cx="50" cy="50" r="44" pathLength="100" />
            <circle class="ring-fill" cx="50" cy="50" r="44" pathLength="100"
                    stroke-dasharray="100" :stroke-dashoffset="100 - progressPct" />
          </svg>
          <div class="hero-ring-text"><b>{{ ga.weeks }}</b><span>OF 40</span></div>
        </div>
      </div>

      <div class="hero-track">
        <div class="hero-track-bar">
          <span class="hero-track-fill" :style="{ width: progressPct + '%' }"></span>
          <span class="hero-track-knob" :style="{ left: progressPct + '%' }"></span>
        </div>
        <div class="hero-track-labels">
          <span style="left:0">0 周</span>
          <span style="left:30%">12</span>
          <span style="left:70%">28</span>
          <span style="right:0">40 周</span>
        </div>
      </div>

      <div class="hero-foot">
        <div>
          <span class="hero-foot-label">预产期</span>
          <span class="hero-foot-value">{{ ga.dueDate }}</span>
        </div>
        <div class="hero-foot-sep"></div>
        <div>
          <span class="hero-foot-label">已走过 · {{ progressRounded }}%</span>
          <span class="hero-foot-value">{{ elapsedDays }} 天</span>
        </div>
      </div>
    </section>

    <!-- 最近一次产检 -->
    <section class="card">
      <div class="list-card-head">
        <small>最近一次产检</small>
        <router-link to="/visits" class="text-link">全部记录</router-link>
      </div>
      <template v-if="lastVisit">
        <p style="font-size:1.05rem;font-weight:650">{{ lastVisit.hospital || '未填医院' }}</p>
        <p class="text-sm text-muted mt-8">
          {{ lastVisit.date }} · {{ lastVisitGA }}
          <span v-if="lastVisitDaysAgo === 0"> · 今天</span>
          <span v-else-if="lastVisitDaysAgo === 1"> · 昨天</span>
          <span v-else-if="lastVisitDaysAgo > 1"> · {{ lastVisitDaysAgo }} 天前</span>
        </p>
        <p v-if="lastVisit.purpose" class="text-sm mt-8" style="color:var(--ink-2)">目的：{{ lastVisit.purpose }}</p>
        <router-link :to="'/visits/' + lastVisit.id" class="btn btn-sm btn-outline mt-12">查看详情</router-link>
      </template>
      <p v-else class="text-muted text-sm">还没有产检记录</p>
    </section>

    <!-- 两张摘要卡 -->
    <div class="stat-grid">
      <router-link to="/visits" class="stat-card">
        <span class="stat-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <rect x="3.5" y="5.5" width="17" height="15" rx="2.5" />
            <path d="M3.5 10h17M8 3.5v4M16 3.5v4M12 14v3.5M10.2 15.8h3.6" />
          </svg>
        </span>
        <span class="stat-label">下次产检</span>
        <span class="stat-value">{{ nextVisit ? nextVisit.slice(5).replace('-', '/') : '未设置' }}</span>
        <span class="stat-sub">{{ nextVisit ? '记得提前准备' : '去产检页添加预约' }}</span>
        <span class="stat-link">查看安排 ›</span>
      </router-link>

      <router-link to="/expenses" class="stat-card">
        <span class="stat-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M3.5 8.2V6.6a2.1 2.1 0 0 1 2.1-2.1h10.8M3.5 8.2h14.4a2.1 2.1 0 0 1 2.1 2.1v7.6a2.1 2.1 0 0 1-2.1 2.1H5.6a2.1 2.1 0 0 1-2.1-2.1z" />
            <path d="M20 12.1h-3.6a2 2 0 0 0 0 4H20M16.9 14.1h.01" />
          </svg>
        </span>
        <span class="stat-label">累计花费</span>
        <span class="stat-value">¥{{ fmtMoney(totalExpense) }}</span>
        <span class="stat-sub">本月 ¥{{ fmtMoney(monthExpense) }}</span>
        <span class="stat-link">查看明细 ›</span>
      </router-link>
    </div>

    <!-- 备份提醒 -->
    <div v-if="showBackupReminder" class="notice">
      <span class="notice-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path d="M12 3.5 4.8 6.4v5.2c0 4.2 2.9 7.6 7.2 9 4.3-1.4 7.2-4.8 7.2-9V6.4z" />
          <path d="M12 9v5M12 17h.01" />
        </svg>
      </span>
      <div class="notice-body">
        <p class="notice-title">该备份一下了</p>
        <p class="notice-text">{{ lastBackup ? '距上次已超 7 天，或有新的产检记录' : '还没有导出过备份文件' }}</p>
      </div>
      <router-link to="/settings" class="btn btn-sm btn-primary">去备份</router-link>
    </div>
  </div>
</template>
