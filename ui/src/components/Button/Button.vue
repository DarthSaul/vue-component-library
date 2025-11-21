<template>
  <button :class="['btn', `btn--${variant}`]" @click="handleClick">
    <slot />
  </button>
</template>

<script setup lang="ts">
defineProps<{
  variant?: 'primary' | 'secondary' | 'tertiary'
}>()

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const handleClick = (event: MouseEvent) => {
  emit('click', event)
}
</script>

<style scoped>
.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.2s;
}

.btn--primary {
  background-color: #007bff;
  color: white;
}

.btn--primary:hover {
  background-color: #0056b3;
}

.btn--secondary {
  background-color: #6c757d;
  color: white;
}

.btn--secondary:hover {
  background-color: #545b62;
}

.btn--tertiary {
  background-color: transparent;
  color: #007bff;
  border: 1px solid #007bff;
}

.btn--tertiary:hover {
  background-color: #007bff;
  color: white;
}
</style>
