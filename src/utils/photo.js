/**
 * 照片压缩：Canvas API，长边 ≤ 1600px，JPEG quality 0.8
 * 自动校正 EXIF 旋转（createImageBitmap 带 imageOrientation）
 */

const MAX_EDGE = 1600
const QUALITY = 0.8

export async function compressPhoto(file) {
  let bitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    // fallback for browsers without imageOrientation support
    bitmap = await createImageBitmap(file)
  }
  const { width, height } = bitmap
  let w = width, h = height
  if (Math.max(w, h) > MAX_EDGE) {
    const scale = MAX_EDGE / Math.max(w, h)
    w = Math.round(w * scale)
    h = Math.round(h * scale)
  }
  const canvas = new OffscreenCanvas(w, h)
  const ctx = canvas.getContext('2d')
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close()
  const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: QUALITY })
  return blob
}

/** 检查存储空间是否足够（估算） */
export async function checkStorage(neededBytes = 5 * 1024 * 1024) {
  if (navigator.storage && navigator.storage.estimate) {
    const { usage, quota } = await navigator.storage.estimate()
    if (quota - usage < neededBytes) return false
  }
  return true
}

/** Blob → object URL（用完记得 revoke） */
export function blobToUrl(blob) {
  return URL.createObjectURL(blob)
}