import { describe, it, expect } from 'vitest'
import {
  parseDate, formatDate, addDays, daysBetween,
  dueDateFromLMP, dueDateFromCurrentGA, lmpFromDueDate,
  gestationalAge, formatGA, trimesterLabel,
  isValidLMP, isValidDueDate
} from '../src/utils/pregnancy.js'

describe('date helpers', () => {
  it('parseDate / formatDate roundtrip', () => {
    expect(formatDate(parseDate('2026-03-15'))).toBe('2026-03-15')
  })
  it('addDays crosses month boundary', () => {
    expect(addDays('2026-01-30', 3)).toBe('2026-02-02')
  })
  it('daysBetween', () => {
    expect(daysBetween('2026-01-01', '2026-01-10')).toBe(9)
  })
})

describe('due date calculations', () => {
  it('LMP + 280 = due date', () => {
    expect(dueDateFromLMP('2026-01-01')).toBe('2026-10-08')
  })
  it('current GA → LMP → due date', () => {
    // 今天 2026-11-24，孕 12 周 +3 天 = 87 天前 LMP = 2026-08-29
    const { lmp, dueDate } = dueDateFromCurrentGA(12, 3, '2026-11-24')
    expect(lmp).toBe('2026-08-29')
    expect(dueDate).toBe('2027-06-05')
  })
  it('hospital due date → LMP', () => {
    expect(lmpFromDueDate('2027-06-05')).toBe('2026-08-29')
  })
})

describe('gestational age', () => {
  it('LMP day = 0w+0d', () => {
    const ga = gestationalAge('2026-11-24', '2026-11-24')
    expect(ga.weeks).toBe(0)
    expect(ga.days).toBe(0)
    expect(ga.trimester).toBe('early')
  })
  it('14 weeks = middle trimester', () => {
    const lmp = addDays('2026-11-24', -98) // 14*7
    const ga = gestationalAge(lmp, '2026-11-24')
    expect(ga.weeks).toBe(14)
    expect(ga.trimester).toBe('middle')
  })
  it('28 weeks = late trimester', () => {
    const lmp = addDays('2026-11-24', -196)
    const ga = gestationalAge(lmp, '2026-11-24')
    expect(ga.weeks).toBe(28)
    expect(ga.trimester).toBe('late')
  })
  it('formatGA', () => {
    expect(formatGA({ weeks: 12, days: 3 })).toBe('12周+3天')
  })
  it('trimesterLabel', () => {
    expect(trimesterLabel('early')).toBe('孕早期')
    expect(trimesterLabel('middle')).toBe('孕中期')
    expect(trimesterLabel('late')).toBe('孕晚期')
  })
})

describe('validation', () => {
  it('valid LMP within 300 days', () => {
    expect(isValidLMP('2026-08-29', '2026-11-24')).toBe(true)
  })
  it('future LMP invalid', () => {
    expect(isValidLMP('2026-12-01', '2026-11-24')).toBe(false)
  })
  it('LMP > 300 days ago invalid', () => {
    expect(isValidLMP('2025-01-01', '2026-11-24')).toBe(false)
  })
  it('valid due date range', () => {
    expect(isValidDueDate('2027-06-05', '2026-11-24')).toBe(true)
  })
  it('due date too soon invalid', () => {
    expect(isValidDueDate('2026-12-01', '2026-11-24')).toBe(false)
  })
})