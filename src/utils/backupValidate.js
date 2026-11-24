/**
 * 备份文件校验（纯函数，不依赖数据库，便于单测）
 *
 * 设计目标：任何结构问题都必须在校验阶段抛出具原因的错误，
 * 调用方只有在全部校验通过后才允许改动现有数据（PRD 11.1）。
 */

export const TABLES = ['pregnancy', 'visits', 'exams', 'expenses', 'stageItems', 'settings']

function fail(msg) {
  throw new Error(msg)
}

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
}

/** 必须是数组；缺省视为空数组 */
function asArray(data, key) {
  const v = data[key]
  if (v === undefined || v === null) return []
  if (!Array.isArray(v)) fail(`备份数据结构不完整：${key} 应为数组`)
  return v
}

function requireString(obj, key, label, where) {
  if (typeof obj[key] !== 'string' || !obj[key]) fail(`${where} 缺少字段 ${key}（${label}）`)
}

function requireNumber(obj, key, label, where) {
  if (typeof obj[key] !== 'number' || !Number.isFinite(obj[key])) {
    fail(`${where} 缺少有效数字 ${key}（${label}）`)
  }
}

function requireId(obj, where) {
  requireNumber(obj, 'id', '编号', where)
}

function requireDate(obj, key, label, where) {
  requireString(obj, key, label, where)
  if (Number.isNaN(Date.parse(obj[key]))) fail(`${where} 的 ${key} 不是合法日期：${obj[key]}`)
}

/** 校验 data.json 内容，返回归一化后的数据 */
export function validateData(raw) {
  if (!isPlainObject(raw)) fail('备份数据结构不完整：data.json 根节点应为对象')
  if (raw.version === undefined || raw.version === null) fail('备份数据结构不完整：缺少 version')
  if (Number(raw.version) !== 1) fail(`备份版本不受支持：${raw.version}（本应用仅支持版本 1）`)

  const data = {}
  for (const key of TABLES) data[key] = asArray(raw, key)

  if (data.pregnancy.length === 0) fail('备份数据结构不完整：没有孕期档案')
  if (data.pregnancy.length > 1) fail('备份数据结构不完整：孕期档案多于一条')

  data.pregnancy.forEach((p, i) => {
    const where = `孕期档案第 ${i + 1} 条`
    if (!isPlainObject(p)) fail(`${where} 格式不正确`)
    requireId(p, where)
    requireDate(p, 'lmp', '末次月经', where)
    requireDate(p, 'dueDate', '预产期', where)
  })

  data.visits.forEach((v, i) => {
    const where = `产检记录第 ${i + 1} 条`
    if (!isPlainObject(v)) fail(`${where} 格式不正确`)
    requireId(v, where)
    requireDate(v, 'date', '产检日期', where)
  })

  data.exams.forEach((e, i) => {
    const where = `检查单第 ${i + 1} 条`
    if (!isPlainObject(e)) fail(`${where} 格式不正确`)
    requireId(e, where)
    requireNumber(e, 'visitId', '所属产检', where)
    requireString(e, 'name', '检查项名称', where)
  })

  data.expenses.forEach((x, i) => {
    const where = `花费第 ${i + 1} 条`
    if (!isPlainObject(x)) fail(`${where} 格式不正确`)
    requireId(x, where)
    requireNumber(x, 'amount', '金额', where)
    if (x.amount < 0) fail(`${where} 的金额为负数`)
  })

  data.stageItems.forEach((s, i) => {
    const where = `阶段备忘第 ${i + 1} 条`
    if (!isPlainObject(s)) fail(`${where} 格式不正确`)
    requireId(s, where)
    requireString(s, 'stage', '所属阶段', where)
    requireString(s, 'title', '标题', where)
    if (!['early', 'middle', 'late'].includes(s.stage)) fail(`${where} 的 stage 无效：${s.stage}`)
  })

  data.settings.forEach((s, i) => {
    const where = `设置第 ${i + 1} 条`
    if (!isPlainObject(s)) fail(`${where} 格式不正确`)
    requireString(s, 'key', '键名', where)
  })

  // 引用完整性：检查单必须挂在存在的产检下
  const visitIds = new Set(data.visits.map(v => v.id))
  data.exams.forEach((e, i) => {
    if (!visitIds.has(e.visitId)) {
      fail(`检查单第 ${i + 1} 条引用了不存在的产检（visitId=${e.visitId}）`)
    }
  })

  return data
}

/** 校验照片清单条目（图片二进制由调用方读取） */
export function validatePhotoMeta(meta) {
  if (!Array.isArray(meta)) fail('备份数据结构不完整：photos.json 应为数组')
  meta.forEach((m, i) => {
    const where = `照片清单第 ${i + 1} 条`
    if (!isPlainObject(m)) fail(`${where} 格式不正确`)
    requireId(m, where)
    requireNumber(m, 'examId', '所属检查单', where)
    requireString(m, 'file', '文件名', where)
  })
  return meta
}
