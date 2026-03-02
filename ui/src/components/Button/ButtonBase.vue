<script setup>
import { baseProps } from './Button.meta.js'

defineOptions({ inheritAttrs: false })
defineProps(baseProps)
</script>

<template>
  <button
    :type="type"
    :class="['btn', `btn--${variant}`, `btn--${size}`]"
    :disabled="disabled"
    v-bind="$attrs"
  >
    <slot />
  </button>
</template>
