<script setup>
import InputBase from './InputBase.vue'

defineProps({
  /**
   * The current value of the input (use with v-model).
   */
  modelValue: { type: [String, Number], default: '' },
  /**
   * Label displayed above the input field.
   */
  label: { type: String, default: '' },
  /**
   * Placeholder text shown when the input is empty.
   */
  placeholder: { type: String, default: '' },
  /**
   * The native HTML input type.
   * @values text, email, password, number, tel, url
   */
  type: {
    type: String,
    default: 'text',
    validator: (v) => ['text', 'email', 'password', 'number', 'tel', 'url'].includes(v),
  },
  /**
   * When true, the input is non-interactive and visually dimmed.
   */
  disabled: { type: Boolean, default: false },
  /**
   * Helper text displayed below the input field.
   */
  helpText: { type: String, default: '' },
})

defineEmits(['update:modelValue'])
</script>

<template>
  <div class="input" :class="{ 'input--disabled': disabled }">
    <InputBase
      :model-value="modelValue"
      :label="label"
      :type="type"
      :placeholder="placeholder"
      :disabled="disabled"
      @update:model-value="$emit('update:modelValue', $event)"
    />
    <span v-if="helpText" class="input__help-text">{{ helpText }}</span>
  </div>
</template>
