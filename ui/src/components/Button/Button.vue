<script setup>
import ButtonBase from './ButtonBase.vue'
import { baseProps, props } from './Button.meta.js'

defineProps({ ...baseProps, ...props })
defineEmits(['click'])
</script>

<template>
  <ButtonBase
    :type="type"
    :variant="variant"
    :size="size"
    :disabled="disabled"
    :class="{ 'btn--outline': outline, 'btn--loading': loading }"
    @click="$emit('click', $event)"
  >
    <slot />
  </ButtonBase>
</template>
