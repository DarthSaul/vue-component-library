<template>
  <button :class="['btn', `btn--${variant}`]" @click="handleClick">
    <slot />
  </button>
</template>

<script setup>
defineProps({
  /**
   * Visual style variant of the button.
   * @values primary, secondary, tertiary
   */
  variant: {
    type: String,
    default: 'primary',
    validator: (value) => ['primary', 'secondary', 'tertiary'].includes(value)
  }
})

const emit = defineEmits(['click'])

const handleClick = (event) => {
  emit('click', event)
}
</script>
