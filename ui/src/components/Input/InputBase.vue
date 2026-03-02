<script setup>
defineOptions({ inheritAttrs: false })

defineProps({
  /**
   * The current value of the input (use with v-model).
   */
  modelValue: { type: [String, Number], default: '' },
  /**
   * Label displayed above the input field.
   */
  label: { type: String, default: '' },
})

defineEmits(['update:modelValue'])
</script>

<template>
  <div class="input-base">
    <label v-if="label" class="input-base__label">{{ label }}</label>
    <input
      class="input-base__input"
      :value="modelValue"
      @input="$emit('update:modelValue', $event.target.value)"
      v-bind="$attrs"
    />
  </div>
</template>
