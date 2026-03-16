<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { baseProps } from './Dropdown.meta.js'

defineOptions({ inheritAttrs: false })

const props = defineProps(baseProps)
const emit = defineEmits(['update:modelValue'])

const isOpen = ref(false)
const dropdownRef = ref(null)

const selectedLabel = computed(() => {
  if (props.modelValue == null) return ''
  const match = props.options.find((opt) => opt.value === props.modelValue)
  return match ? match.label : ''
})

function toggle() {
  if (!props.disabled) {
    isOpen.value = !isOpen.value
  }
}

function selectOption(option) {
  emit('update:modelValue', option.value)
  isOpen.value = false
}

function handleClickOutside(event) {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target)) {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div
    ref="dropdownRef"
    class="dropdown-base"
    :class="[
      `dropdown-base--${size}`,
      {
        'dropdown-base--open': isOpen,
        'dropdown-base--disabled': disabled,
      },
    ]"
  >
    <slot
      name="trigger"
      :selected-label="selectedLabel"
      :placeholder="placeholder"
      :toggle="toggle"
      :is-open="isOpen"
    >
      <button
        type="button"
        class="dropdown-base__trigger"
        :disabled="disabled"
        v-bind="$attrs"
        @click="toggle"
      >
        <span v-if="selectedLabel" class="dropdown-base__selected">{{ selectedLabel }}</span>
        <span v-else class="dropdown-base__placeholder">{{ placeholder }}</span>
      </button>
    </slot>
    <ul v-show="isOpen" class="dropdown-base__menu" role="listbox">
      <li
        v-for="option in options"
        :key="option.value"
        class="dropdown-base__option"
        :class="{ 'dropdown-base__option--selected': option.value === modelValue }"
        role="option"
        :aria-selected="option.value === modelValue"
        @click="selectOption(option)"
      >
        {{ option.label }}
      </li>
      <li v-if="options.length === 0" class="dropdown-base__empty">
        No options available
      </li>
    </ul>
  </div>
</template>
