<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { db, getPregnancy, getSetting } from '../utils/db.js'
import { gestationalAge, formatGA, trimesterLabel, today, daysBetween } from '../utils/pregnancy.js'

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

/** 最近一次产检的孕周标注 */
const lastVisitGA = computed(() => {
  if (!lastVisit.value || !pregnancy.value) return ''
  return formatGA(gestationalAge(pregnancy.value.lmp, lastVisit.value.date))
})

/** 距上次产检过了多少天 */
const lastVisitDaysAgo = computed(() => {
  if (!lastVisit.value) return null
  return daysBetween(lastVisit.value.date, today())
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
    <!-- GA hero -->
    <div class="card" style="text-align:center;padding:24px 16px">
      <span class="badge" :class="'badge-' + ga.trimester">{{ trimesterLabel(ga.trimester) }}</span>
      <h1 style="font-size:2rem;margin:8px 0">{{ formatGA(ga) }}</h1>
      <p class="text-muted">预产期 {{ ga.dueDate }} · 还剩 {{ ga.daysRemaining }} 天</p>
    </div>

    <!-- last visit -->
    <div class="card">
      <div class="flex justify-between items-center">
        <small class="text-muted">最近一次产检</small>
        <router-link to="/visits" class="text-sm text-accent">全部记录 ›</router-link>
      </div>
      <template v-if="lastVisit">
        <p style="font-weight:600;margin-top:4px">{{ lastVisit.hospital || '未填医院' }}</p>
        <p class="text-sm text-muted">
          {{ lastVisit.date }} · {{ lastVisitGA }}
          <span v-if="lastVisitDaysAgo === 0"> · 今天</span>
          <span v-else-if="lastVisitDaysAgo === 1"> · 昨天</span>
          <span v-else-if="lastVisitDaysAgo > 1"> · {{ lastVisitDaysAgo }} 天前</span>
        </p>
        <p v-if="lastVisit.purpose" class="text-sm" style="margin-top:4px">目的：{{ lastVisit.purpose }}</p>
        <router-link :to="'/visits/' + lastVisit.id" class="btn btn-sm btn-outline mt-8">查看详情</router-link>
      </template>
      <p v-else class="text-muted" style="margin-top:4px">还没有产检记录</p>
    </div>

    <!-- next visit -->
    <div class="card flex justify-between items-center">
      <div>
        <small class="text-muted">下次产检</small>
        <p v-if="nextVisit" style="font-weight:600">{{ nextVisit }}</p>
        <p v-else class="text-muted">未设置</p>
      </div>
      <router-link to="/visits" class="btn btn-sm btn-outline">查看</router-link>
    </div>

    <!-- expense summary -->
    <div class="card flex justify-between items-center">
      <div>
        <small class="text-muted">总花费</small>
        <p style="font-weight:600;font-size:1.2rem">¥{{ fmtMoney(totalExpense) }}</p>
      </div>
      <div style="text-align:right">
        <small class="text-muted">本月</small>
        <p style="font-weight:600">¥{{ fmtMoney(monthExpense) }}</p>
      </div>
    </div>

    <!-- backup reminder -->
    <div v-if="showBackupReminder" class="card" style="border-color:var(--accent);background:var(--accent-light)">
      <p style="font-size:0.9rem">📦 建议导出备份{{ lastBackup ? '（距上次已超7天或有新记录）' : '（尚未备份过）' }}</p>
      <router-link to="/settings" class="btn btn-sm btn-primary mt-8">去备份</router-link>
    </div>
  </div>
</template>