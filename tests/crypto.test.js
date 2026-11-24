import { describe, it, expect } from 'vitest'
import { sha256Fallback } from '../src/utils/crypto.js'

// 纯 JS 的 SHA-256 回退实现：crypto.subtle 只在安全上下文可用，
// 局域网 http:// 访问时它是 undefined，PIN 校验必须还能工作。
describe('sha256Fallback', () => {
  it('空串', () => {
    expect(sha256Fallback('')).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
    )
  })

  it('4 位 PIN 与 crypto.subtle 结果一致', () => {
    expect(sha256Fallback('1234')).toBe(
      '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4'
    )
  })

  it('ASCII 短语', () => {
    expect(sha256Fallback('hello world')).toBe(
      'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9'
    )
  })

  it('UTF-8 中文按字节摘要', () => {
    expect(sha256Fallback('孕期记录')).toBe(
      'b92c782660a1781d80fdda192893ff7ccbf12a6b364fa0c24c2e2077a6ea59fe'
    )
  })

  it('跨过 55/56/64 字节的 padding 边界', () => {
    expect(sha256Fallback('a'.repeat(55))).toMatch(/^[0-9a-f]{64}$/)
    expect(sha256Fallback('a'.repeat(56))).toMatch(/^[0-9a-f]{64}$/)
    expect(sha256Fallback('a'.repeat(64))).toMatch(/^[0-9a-f]{64}$/)
    // 已知值：'a' × 64
    expect(sha256Fallback('a'.repeat(64))).toBe(
      'ffe054fe7ae0cb6dc65c3af9b61d5209f439851db43d0ba5997337df154668eb'
    )
  })

  it('长输入（多块）', () => {
    expect(sha256Fallback('0123456789abcdef'.repeat(10))).toBe(
      'c84e5648e5bd3dd9e37b57ecb80fc505e3324f53487e07532c9020e5b9e4e76d'
    )
  })
})
