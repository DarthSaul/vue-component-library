<script setup>
defineOptions({ inheritAttrs: false })

defineProps({
  /**
   * The native HTML button type attribute.
   * @values button, submit, reset
   */
  type: {
    type: String,
    default: 'button',
    validator: (v) => ['button', 'submit', 'reset'].includes(v),
  },
})
</script>

<template>
  <!-- @slot Button content -->
  <button :type="type" v-bind="$attrs"><slot /></button>
</template>
