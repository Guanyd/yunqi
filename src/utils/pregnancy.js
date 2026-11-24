/**
 * 预产期 & 孕周计算
 * 所有日期用 YYYY-MM-DD 字符串，按本地日历计算，不跨时区。
 */

const MS_PER_DAY = 86400000

/** 解析 YYYY-MM-DD 为本地 Date（零点） */
export function parseDate(str) {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Date → YYYY-MM-DD */
export function formatDate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** 今天 YYYY-MM-DD */
export function today() {
  return formatDate(new Date())
}

/** 两个日期之间相差天数（b - a） */
export function daysBetween(a, b) {
  const da = typeof a === 'string' ? parseDate(a) : a
  const db = typeof b === 'string' ? parseDate(b) : b
  return Math.round((db - da) / MS_PER_DAY)
}

/** 日期加 n 天 */
export function addDays(dateStr, n) {
  const d = parseDate(dateStr)
  d.setDate(d.getDate() + n)
  return formatDate(d)
}

// ---- 三种建立方式 ----

/** 方式1：末次月经第一天 → 预产期 = LMP + 280 */
export function dueDateFromLMP(lmpDate) {
  return addDays(lmpDate, 280)
}

/** 方式2：已知今天孕 W 周 D 天 → 倒推 LMP → 预产期 */
export function dueDateFromCurrentGA(weeks, days, referenceDate = today()) {
  const totalDays = weeks * 7 + days
  const lmp = addDays(referenceDate, -totalDays)
  return { lmp, dueDate: addDays(lmp, 280) }
}

/** 方式3：医院给的预产期 → 反推 LMP */
export function lmpFromDueDate(dueDate) {
  return addDays(dueDate, -280)
}

// ---- 孕周计算 ----

/**
 * 给定 LMP 和参考日期，返回 { weeks, days, totalDays, trimester, daysRemaining }
 * trimester: 'early' | 'middle' | 'late'
 */
export function gestationalAge(lmpDate, referenceDate = today()) {
  const totalDays = daysBetween(lmpDate, referenceDate)
  if (totalDays < 0) return { weeks: 0, days: 0, totalDays: 0, trimester: 'early', daysRemaining: 280 }
  const weeks = Math.floor(totalDays / 7)
  const days = totalDays % 7
  const dueDate = addDays(lmpDate, 280)
  const daysRemaining = Math.max(0, daysBetween(referenceDate, dueDate))
  let trimester = 'early'
  if (weeks >= 28) trimester = 'late'
  else if (weeks >= 14) trimester = 'middle'
  return { weeks, days, totalDays, trimester, daysRemaining, dueDate }
}

/** 格式化孕周显示："X周+Y天" */
export function formatGA(ga) {
  return `${ga.weeks}周+${ga.days}天`
}

/** 阶段中文名 */
export function trimesterLabel(t) {
  return { early: '孕早期', middle: '孕中期', late: '孕晚期' }[t] || t
}

/**
 * 产检记录保存当天的孕周快照。
 * PRD 5.2：改预产期不能把旧记录的孕周重算乱，所以每次保存时把孕周存进记录。
 */
export function gaSnapshot(lmpDate, recordDate) {
  const ga = gestationalAge(lmpDate, recordDate)
  return { gaWeeks: ga.weeks, gaDays: ga.days }
}

/**
 * 读取一条记录上的孕周快照并格式化。
 * 早期版本存下的记录没有快照字段，退回用当前 LMP 现算，避免显示空白。
 */
export function recordGALabel(record, lmpDate) {
  if (!record) return ''
  if (Number.isFinite(record.gaWeeks) && Number.isFinite(record.gaDays)) {
    return formatGA({ weeks: record.gaWeeks, days: record.gaDays })
  }
  if (!lmpDate || !record.date) return ''
  return formatGA(gestationalAge(lmpDate, record.date))
}

// ---- 校验 ----

/** 检查 LMP 是否在合理范围：今天-300 ~ 今天 */
export function isValidLMP(lmpDate, ref = today()) {
  const diff = daysBetween(lmpDate, ref)
  return diff >= 0 && diff <= 300
}

/** 检查预产期是否合理：今天+140 ~ 今天+300 */
export function isValidDueDate(dueDate, ref = today()) {
  const diff = daysBetween(ref, dueDate)
  return diff >= 140 && diff <= 300
}