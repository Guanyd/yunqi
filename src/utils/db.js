import Dexie from 'dexie'

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