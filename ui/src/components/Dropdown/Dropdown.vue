<script setup>
import { ref, computed, watch } from 'vue'
import DropdownBase from './DropdownBase.vue'
import { baseProps, props as wrapperProps } from './Dropdown.meta.js'

const props = defineProps({ ...baseProps, ...wrapperProps })
const emit = defineEmits(['update:modelValue', 'update:value'])

// --- Dual v-model: support both v-model and v-model:value ---
const internalValue = ref(props.modelValue ?? props.value ?? null)

watch(
  () => props.modelValue,
  (newVal) => {
    if (newVal !== internalValue.value) {
      internalValue.value = newVal
    }
  },
)

watch(
  () => props.value,
  (newVal) => {
    if (newVal !== internalValue.value) {
      internalValue.value = newVal
    }
  },
)

function onSelect(val) {
  internalValue.value = val
  emit('update:modelValue', val)
  emit('update:value', val)
}

// --- Searchable (combobox) logic ---
const searchQuery = ref('')
const searchInputRef = ref(null)

const filteredOptions = computed(() => {
  if (!props.searchable || !searchQuery.value) {
    return props.options
  }
  const query = searchQuery.value.toLowerCase()
  return props.options.filter((opt) => opt.label.toLowerCase().includes(query))
})

const displayText = computed(() => {
  if (props.modelValue == null && props.value == null) return ''
  const match = props.options.find((opt) => opt.value === internalValue.value)
  return match ? match.label : ''
})

function onSearchTriggerClick(toggle) {
  toggle()
  searchQuery.value = ''
  // Focus the input after the menu opens
  if (searchInputRef.value) {
    searchInputRef.value.focus()
  }
}

function onSearchSelect(val) {
  onSelect(val)
  searchQuery.value = ''
}

// --- Clearable logic ---
function clear() {
  onSelect(null)
  searchQuery.value = ''
}
</script>

<template>
  <div class="dropdown" :class="{ 'dropdown--disabled': disabled }">
    <label v-if="label" class="dropdown__label">{{ label }}</label>
    <div class="dropdown__control">
      <DropdownBase
        :options="filteredOptions"
        :model-value="internalValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :size="size"
        @update:model-value="searchable ? onSearchSelect($event) : onSelect($event)"
      >
        <template v-if="searchable" #trigger="{ selectedLabel, placeholder: ph, toggle, isOpen }">
          <input
            ref="searchInputRef"
            type="text"
            class="dropdown-base__trigger dropdown__search"
            :class="{ 'dropdown-base__trigger--open': isOpen }"
            :value="isOpen ? searchQuery : displayText"
            :placeholder="selectedLabel || ph"
            :disabled="disabled"
            v-bind="$attrs"
            @click="onSearchTriggerClick(toggle)"
            @input="searchQuery = $event.target.value"
          />
        </template>
      </DropdownBase>
      <button
        v-if="clearable && internalValue != null"
        type="button"
        class="dropdown__clear"
        aria-label="Clear selection"
        @click.stop="clear"
      >
        &times;
      </button>
    </div>
    <span v-if="helpText" class="dropdown__help-text">{{ helpText }}</span>
  </div>
</template>
