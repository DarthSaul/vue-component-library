<script setup>
import ButtonBase from './ButtonBase.vue'

defineProps({
  /**
   * Controls the visual style of the button.
   * @values primary, secondary, tertiary
   */
  variant: {
    type: String,
    default: 'primary',
    validator: (v) => ['primary', 'secondary', 'tertiary'].includes(v),
  },
  /**
   * Controls the size of the button.
   * @values sm, md, lg
   */
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md', 'lg'].includes(v),
  },
  /**
   * When true, the button is non-interactive and visually dimmed.
   */
  disabled: {
    type: Boolean,
    default: false,
  },
  /**
   * When true, renders the button with an outline style instead of filled.
   */
  outline: {
    type: Boolean,
    default: false,
  },
})

defineEmits(['click'])
</script>

<template>
  <ButtonBase
    :class="['btn', `btn--${variant}`, `btn--${size}`, { 'btn--outline': outline }]"
    :disabled="disabled"
    @click="$emit('click', $event)"
  >
    <!-- @slot Default button content -->
    <slot />
  </ButtonBase>
</template>
