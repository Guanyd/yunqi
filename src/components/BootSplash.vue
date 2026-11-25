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
    <div class="boot-mark">
      <svg viewBox="0 0 48 48" role="presentation" focusable="false">
        <circle cx="24" cy="24" r="20" />
        <path d="M24 34 C17 29 13 25 13 20.5 C13 17 15.6 14.5 18.8 14.5 C21 14.5 22.8 15.7 24 17.5 C25.2 15.7 27 14.5 29.2 14.5 C32.4 14.5 35 17 35 20.5 C35 25 31 29 24 34 Z" />
        <circle class="mark-dot" cx="24" cy="4" r="1.5" />
        <circle class="mark-dot" cx="24" cy="44" r="1.5" />
      </svg>
    </div>
    <p class="boot-title display-num">孕期记录</p>
    <p class="boot-sub">一段温柔的旅程</p>
    <div class="boot-rule" aria-hidden="true"><span></span><i></i><span></span></div>
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
  background: var(--bg);
  transition: opacity 0.28s ease;
}
.boot-splash.is-fading {
  opacity: 0;
  pointer-events: none;
}
.boot-mark {
  width: 104px;
  height: 104px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--accent-soft);
  border: 1px solid var(--accent-line);
  color: var(--accent-deep);
  box-shadow: var(--shadow-sm), inset 0 1px 0 var(--surface);
  animation: boot-rise 0.65s cubic-bezier(0.22, 0.85, 0.32, 1) both;
}
.boot-mark svg {
  width: 62px;
  height: 62px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.boot-mark .mark-dot { fill: var(--accent); stroke: none; }
.boot-title {
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 600;
  letter-spacing: 0.14em;
  line-height: 1.3;
  color: var(--ink);
  animation: boot-rise 0.65s cubic-bezier(0.22, 0.85, 0.32, 1) 0.1s both;
}
.boot-sub {
  font-size: 0.74rem;
  color: var(--ink-3);
  letter-spacing: 0.24em;
  animation: boot-rise 0.65s cubic-bezier(0.22, 0.85, 0.32, 1) 0.18s both;
}
.boot-rule {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
  opacity: 0.75;
  animation: boot-rise 0.65s cubic-bezier(0.22, 0.85, 0.32, 1) 0.26s both;
}
.boot-rule span { width: 22px; height: 1px; background: var(--accent-line); }
.boot-rule i { width: 4px; height: 4px; border-radius: 50%; background: var(--accent); }

@keyframes boot-rise {
  from { opacity: 0; transform: translateY(10px) scale(0.98); }
  to { opacity: 1; transform: none; }
}
</style>
