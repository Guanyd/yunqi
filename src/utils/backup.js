/**
 * 备份导出/导入：ZIP（JSON + 独立图片文件）
 *
 * 导入原则（PRD 11.1）：先完整解压并校验，全部通过后才动数据库；
 * 事务内只做写入，不 await 任何 ZIP/网络/文件异步操作，
 * 保证「校验失败或写入失败时，现有数据一条都不动」。
 */
import JSZip from 'jszip'
import { db } from './db.js'
import { TABLES, validateData, validatePhotoMeta } from './backupValidate.js'

const ALL_STORES = [...TABLES, 'photos']

export async function exportBackup() {
  const zip = new JSZip()

  // gather all data
  const data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    pregnancy: await db.pregnancy.toArray(),
    visits: await db.visits.toArray(),
    exams: await db.exams.toArray(),
    expenses: await db.expenses.toArray(),
    stageItems: await db.stageItems.toArray(),
    settings: await db.settings.toArray()
  }
  zip.file('data.json', JSON.stringify(data, null, 2))

  // photos as separate files
  const photos = await db.photos.toArray()
  const photoMeta = []
  for (const p of photos) {
    const filename = `photos/${p.id}.jpg`
    zip.file(filename, p.blob)
    photoMeta.push({ id: p.id, examId: p.examId, createdAt: p.createdAt, file: filename })
  }
  zip.file('photos.json', JSON.stringify(photoMeta, null, 2))

  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' })
  return blob
}

/** 读取并校验照片清单与图片二进制；全部在事务之前完成 */
async function readPhotos(zip) {
  const metaFile = zip.file('photos.json')
  if (!metaFile) return []

  let meta
  try {
    meta = JSON.parse(await metaFile.async('string'))
  } catch {
    throw new Error('photos.json 解析失败，文件可能已损坏')
  }
  validatePhotoMeta(meta)

  const photos = []
  for (const m of meta) {
    const imgFile = zip.file(m.file)
    if (!imgFile) throw new Error(`照片清单指向的图片不存在：${m.file}`)

    let blob
    try {
      blob = await imgFile.async('blob')
    } catch {
      throw new Error(`图片无法解压：${m.file}`)
    }
    if (!blob || blob.size === 0) throw new Error(`图片为空：${m.file}`)

    photos.push({ id: m.id, examId: m.examId, createdAt: m.createdAt, blob })
  }
  return photos
}

export async function importBackup(file) {
  let zip
  try {
    zip = await JSZip.loadAsync(file)
  } catch {
    throw new Error('无法读取备份文件，请确认是有效的 ZIP 格式')
  }

  const dataFile = zip.file('data.json')
  if (!dataFile) throw new Error('备份文件缺少 data.json，格式不正确')

  let raw
  try {
    raw = JSON.parse(await dataFile.async('string'))
  } catch {
    throw new Error('data.json 解析失败，文件可能已损坏')
  }

  // 1) 先全部校验（任何问题都在动数据库之前抛出）
  const data = validateData(raw)
  const photos = await readPhotos(zip)

  // 2) 事务内只做写入：所有请求同一 tick 入队，任一失败 Dexie 整体 abort
  await db.transaction('rw', ALL_STORES.map(k => db[k]), () => {
    const ops = ALL_STORES.map(key => db[key].clear())
    ops.push(db.pregnancy.bulkAdd(data.pregnancy))
    if (data.visits.length) ops.push(db.visits.bulkAdd(data.visits))
    if (data.exams.length) ops.push(db.exams.bulkAdd(data.exams))
    if (data.expenses.length) ops.push(db.expenses.bulkAdd(data.expenses))
    if (data.stageItems.length) ops.push(db.stageItems.bulkAdd(data.stageItems))
    if (data.settings.length) ops.push(db.settings.bulkAdd(data.settings))
    if (photos.length) ops.push(db.photos.bulkAdd(photos))
    return Promise.all(ops)
  })

  return data
}

/** 触发浏览器下载 */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}
