import { describe, it, expect } from 'vitest'
import { validateData, validatePhotoMeta } from '../src/utils/backupValidate.js'

const base = () => ({
  version: 1,
  exportedAt: '2026-11-24T00:00:00.000Z',
  pregnancy: [{ id: 1, nickname: '宝宝', lmp: '2026-08-29', dueDate: '2027-06-05', source: 'lmp' }],
  visits: [{ id: 1, date: '2026-11-24', hospital: '市妇幼' }],
  exams: [{ id: 1, visitId: 1, name: 'NT超声', status: 'pending' }],
  expenses: [{ id: 1, visitId: 1, amount: 180.5, category: '检查', date: '2026-11-24' }],
  stageItems: [{ id: 1, stage: 'early', sortOrder: 1, title: '建档', status: 'pending' }],
  settings: [{ key: 'pinEnabled', value: false }]
})

describe('validateData', () => {
  it('接受合法的备份数据', () => {
    const d = validateData(base())
    expect(d.pregnancy).toHaveLength(1)
    expect(d.visits[0].hospital).toBe('市妇幼')
  })

  it('缺省的可选表按空数组处理', () => {
    const raw = base()
    delete raw.expenses
    delete raw.settings
    const d = validateData(raw)
    expect(d.expenses).toEqual([])
    expect(d.settings).toEqual([])
  })

  it('拒绝非对象根节点', () => {
    expect(() => validateData([])).toThrow(/根节点应为对象/)
    expect(() => validateData(null)).toThrow(/根节点应为对象/)
  })

  it('拒绝缺少 version', () => {
    const raw = base()
    delete raw.version
    expect(() => validateData(raw)).toThrow(/缺少 version/)
  })

  it('拒绝不支持的版本号', () => {
    expect(() => validateData({ ...base(), version: 2 })).toThrow(/备份版本不受支持/)
  })

  it('拒绝 pregnancy 不是数组（缺陷 A 回归）', () => {
    expect(() => validateData({ ...base(), pregnancy: { id: 1 } })).toThrow(/pregnancy 应为数组/)
  })

  it('拒绝没有孕期档案', () => {
    expect(() => validateData({ ...base(), pregnancy: [] })).toThrow(/没有孕期档案/)
  })

  it('拒绝多条孕期档案', () => {
    const raw = base()
    raw.pregnancy.push({ id: 2, lmp: '2026-08-29', dueDate: '2027-06-05' })
    expect(() => validateData(raw)).toThrow(/孕期档案多于一条/)
  })

  it('拒绝缺 lmp 的孕期档案', () => {
    expect(() => validateData({ ...base(), pregnancy: [{ id: 1, dueDate: '2027-06-05' }] }))
      .toThrow(/缺少字段 lmp/)
  })

  it('拒绝非法日期', () => {
    expect(() => validateData({ ...base(), visits: [{ id: 1, date: '不是日期' }] }))
      .toThrow(/不是合法日期/)
  })

  it('拒绝检查单引用不存在的产检', () => {
    expect(() => validateData({ ...base(), exams: [{ id: 1, visitId: 99, name: '孤儿' }] }))
      .toThrow(/引用了不存在的产检/)
  })

  it('拒绝负数金额', () => {
    expect(() => validateData({ ...base(), expenses: [{ id: 1, amount: -1 }] }))
      .toThrow(/金额为负数/)
  })

  it('拒绝无效的 stage', () => {
    expect(() => validateData({ ...base(), stageItems: [{ id: 1, stage: 'unknown', title: 'x' }] }))
      .toThrow(/stage 无效/)
  })

  it('拒绝缺少 key 的设置项', () => {
    expect(() => validateData({ ...base(), settings: [{ value: 1 }] })).toThrow(/缺少字段 key/)
  })
})

describe('validatePhotoMeta', () => {
  it('接受合法的照片清单', () => {
    const meta = [{ id: 1, examId: 1, file: 'photos/1.jpg' }]
    expect(validatePhotoMeta(meta)).toHaveLength(1)
  })

  it('拒绝非数组', () => {
    expect(() => validatePhotoMeta({})).toThrow(/应为数组/)
  })

  it('拒绝缺少 file', () => {
    expect(() => validatePhotoMeta([{ id: 1, examId: 1 }])).toThrow(/缺少字段 file/)
  })

  it('拒绝 examId 不是数字', () => {
    expect(() => validatePhotoMeta([{ id: 1, examId: '1', file: 'a.jpg' }]))
      .toThrow(/有效数字 examId/)
  })
})
