<script setup>
/**
 * 启动画面（开屏层）。
 *
 * iOS 装到主屏幕后由 index.html 里的 apple-touch-startup-image 负责系统级开屏；
 * 但从点开到首帧渲染之间仍有一段空白（读 IndexedDB、路由重定向），
 * 桌面浏览器 / Android 则完全没有系统开屏。这一层用来盖住这段空窗期。
 */
defineProps({
  fading: { type: Boolean, default: false }
})
</script>

<template>
  <div class="boot-splash" :class="{ 'is-fading': fading }" aria-hidden="true">
    <div class="boot-icon">
      <svg viewBox="0 0 64 64" width="100%" height="100%" role="presentation">
        <rect width="64" height="64" rx="14" fill="#d4856a" />
        <path
          fill="#ffffff"
          transform="translate(32 34) scale(1.55) translate(-16 -13)"
          d="M16 27.5 3.2 14.7a7.2 7.2 0 0 1 0-10.2 7.2 7.2 0 0 1 10.2 0L16 7.1l2.6-2.6a7.2 7.2 0 0 1 10.2 0 7.2 7.2 0 0 1 0 10.2z"
        />
      </svg>
    </div>
    <p class="boot-title">孕期记录</p>
  </div>
</template>

<style scoped>
.boot-splash {
  position: fixed;
  inset: 0;
  z-index: 500;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 18px;
  background: var(--bg, #f8f5f0);
  transition: opacity 0.28s ease;
}
.boot-splash.is-fading {
  opacity: 0;
  pointer-events: none;
}
.boot-icon {
  width: 96px;
  height: 96px;
  border-radius: 22%;
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(212, 133, 106, 0.28);
}
.boot-title {
  font-size: 1.05rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: var(--text, #2c2c2c);
}
</style>
