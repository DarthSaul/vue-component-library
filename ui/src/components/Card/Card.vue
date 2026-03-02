<template>
  <div :class="['card', { 'card--elevated': elevated }]">
    <div v-if="$slots.header" class="card__header">
      <!-- @slot Card header area -->
      <slot name="header" />
    </div>
    <div class="card__body">
      <!-- @slot Card body content -->
      <slot />
    </div>
    <div v-if="$slots.footer" class="card__footer">
      <!-- @slot Card footer area -->
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup>
defineProps({
  /**
   * When true, applies a drop shadow to give the card a raised appearance.
   */
  elevated: {
    type: Boolean,
    default: false
  }
})
</script>
