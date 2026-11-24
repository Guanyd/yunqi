<script setup>
defineProps({ message: String })
</script>
<template>
  <div class="toast" role="status">{{ message }}</div>
</template>