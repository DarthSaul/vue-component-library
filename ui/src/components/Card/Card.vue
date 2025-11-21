<template>
  <div :class="['card', { 'card--elevated': elevated }]">
    <div v-if="$slots.header" class="card__header">
      <slot name="header" />
    </div>
    <div class="card__body">
      <slot />
    </div>
    <div v-if="$slots.footer" class="card__footer">
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  elevated?: boolean
}>()
</script>

<style scoped>
.card {
  border: 1px solid #dee2e6;
  border-radius: 0.5rem;
  overflow: hidden;
  background-color: white;
}

.card--elevated {
  box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);
  border: none;
}

.card__header {
  padding: 1rem;
  border-bottom: 1px solid #dee2e6;
  background-color: #f8f9fa;
}

.card__body {
  padding: 1rem;
}

.card__footer {
  padding: 1rem;
  border-top: 1px solid #dee2e6;
  background-color: #f8f9fa;
}
</style>
