<script setup>
import ButtonBase from './ButtonBase.vue'
import { props } from './Button.meta.js'

defineProps(props)
defineEmits(['click'])
</script>

<template>
  <ButtonBase
    :class="{ 'btn--outline': outline, 'btn--loading': loading }"
    @click="$emit('click', $event)"
  >
    <slot />
  </ButtonBase>
</template>
