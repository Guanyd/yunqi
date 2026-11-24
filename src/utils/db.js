import Dexie from 'dexie'
import { stageMetaByTitle } from './stageDefaults.js'

export const db = new Dexie('YunqiDB')

db.version(1).stores({
  // 孕期档案（只有一条）
  pregnancy: '++id',
  // 产检记录
  visits: '++id, date, createdAt',
  // 检查单（挂在 visit 下）
  exams: '++id, visitId, createdAt',
  // 照片（挂在 exam 下，存 Blob）
  photos: '++id, examId, createdAt',
  // 花费
  expenses: '++id, visitId, date, category, createdAt',
  // 阶段备忘条目
  stageItems: '++id, stage, sortOrder',
  // 设置（PIN、备份时间等）
  settings: 'key'
})

// v2：阶段备忘补上孕周窗口与类型。
// 老数据只有 title/detail，这里按标题回填，用户自己加的条目保持原样。
// 标题匹配用 stageMetaByTitle 的宽松规则（忽略空格与括号），
// 「NT检查」和「NT 检查」都能对上。
db.version(2).stores({
  stageItems: '++id, stage, sortOrder'
}).upgrade(async tx => {
  await tx.table('stageItems').toCollection().modify(item => {
    if (item.weekStart != null) return
    const meta = stageMetaByTitle(item.title)
    if (!meta) return
    item.weekStart = meta.weekStart
    item.weekEnd = meta.weekEnd
    item.weekNote = meta.weekNote
    item.kind = meta.kind
  })
})

// v3：v2 的标题匹配一开始太严格，早期版本执行后漏掉了 5 条。
// 这里保留一个版本号占位（已升级过的库不会重跑），实际补齐由 v4 兜底。
db.version(3).stores({
  stageItems: '++id, stage, sortOrder'
})

// v4：两件事一起做 ——
// 1) 补回 v2 漏掉的孕周（重新按宽松规则回填，幂等）；
// 2) 修正预置条目的阶段归属错误：糖耐量试验 OGTT 是 24-28 周，早期版本误放在孕晚期。
db.version(4).stores({
  stageItems: '++id, stage, sortOrder'
}).upgrade(async tx => {
  await tx.table('stageItems').toCollection().modify(item => {
    if (item.weekStart == null) {
      const meta = stageMetaByTitle(item.title)
      if (meta) {
        item.weekStart = meta.weekStart
        item.weekEnd = meta.weekEnd
        item.weekNote = meta.weekNote
        item.kind = meta.kind
      }
    }
    const key = String(item.title || '').replace(/[\s()（）]/g, '').toLowerCase()
    if (key === '糖耐量试验ogtt' && item.stage !== 'middle') item.stage = 'middle'
  })
})

// ---------- helpers ----------

export async function getPregnancy() {
  return (await db.pregnancy.toArray())[0] || null
}

export async function savePregnancy(data) {
  const existing = await getPregnancy()
  if (existing) {
    await db.pregnancy.update(existing.id, data)
    return { ...existing, ...data }
  }
  const id = await db.pregnancy.add(data)
  return { id, ...data }
}

export async function getSetting(key, fallback = null) {
  const row = await db.settings.get(key)
  return row ? row.value : fallback
}

export async function setSetting(key, value) {
  await db.settings.put({ key, value })
}