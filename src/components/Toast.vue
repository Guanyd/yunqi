<script setup>
defineProps({ message: String })
</script>
<template>
  <div
    class="toast"
    :class="(message || '').includes('失败') || (message || '').includes('错误') || (message || '').includes('不足') ? 'is-error' : ((message || '').includes('成功') || (message || '').includes('已') ? 'is-success' : 'is-info')"
    role="status"
  >
    <span class="toast-icon" aria-hidden="true">
      <svg class="ico ico-info" viewBox="0 0 24 24" focusable="false">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11.2v5" />
        <path d="M12 7.8h.01" />
      </svg>
      <svg class="ico ico-success" viewBox="0 0 24 24" focusable="false">
        <circle cx="12" cy="12" r="9" />
        <path d="M8.2 12.3l2.6 2.6 5.1-5.3" />
      </svg>
      <svg class="ico ico-error" viewBox="0 0 24 24" focusable="false">
        <circle cx="12" cy="12" r="9" />
        <path d="M9.3 9.3l5.4 5.4" />
        <path d="M14.7 9.3l-5.4 5.4" />
      </svg>
    </span>
    <span class="toast-text">{{ message }}</span>
  </div>
</template>

<style scoped>
.toast {
  display: flex;
  align-items: center;
  gap: 9px;
}
.toast-icon {
  width: 20px;
  height: 20px;
  flex: none;
  display: grid;
  place-items: center;
  border-radius: var(--r-sm);
  animation: toast-pop 0.42s cubic-bezier(0.22, 0.9, 0.3, 1) 0.06s both;
}
.toast-icon svg {
  width: 20px;
  height: 20px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.toast .ico { display: none; grid-area: 1 / 1; }
.toast.is-info .ico-info { display: block; }
.toast.is-success .ico-success { display: block; }
.toast.is-error .ico-error { display: block; }
.toast-text { min-width: 0; }

@keyframes toast-pop {
  from { opacity: 0; transform: scale(0.55); }
  to { opacity: 1; transform: scale(1); }
}
</style>
