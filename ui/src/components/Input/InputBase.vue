<script setup>
/**
 * Minimal v-model input wrapper with an optional label.
 */
defineProps({
	/**
	 * The bound value of the input (v-model).
	 */
	modelValue: {
		type: [String, Number],
		default: '',
	},
	/**
	 * Label text rendered above the input. Hidden when empty.
	 */
	label: {
		type: String,
		default: '',
	},
});

defineEmits(['update:modelValue']);
</script>

<template>
	<div class="input-base">
		<label v-if="label" class="input-base__label">{{ label }}</label>
		<input
			class="input-base__input"
			:value="modelValue"
			@input="$emit('update:modelValue', $event.target.value)"
		/>
	</div>
</template>
