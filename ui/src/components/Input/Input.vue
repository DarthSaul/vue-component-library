<script setup>
/**
 * Full-featured text field built on top of InputBase.
 * Adds placeholder, type, disabled state, and help text.
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
	/**
	 * Native input placeholder text.
	 */
	placeholder: {
		type: String,
		default: '',
	},
	/**
	 * Native input type.
	 * @values text, email, password, number, tel, url
	 */
	type: {
		type: String,
		default: 'text',
		validator: (v) => ['text', 'email', 'password', 'number', 'tel', 'url'].includes(v),
	},
	/**
	 * When true, the input is non-interactive.
	 */
	disabled: {
		type: Boolean,
		default: false,
	},
	/**
	 * Helper text displayed below the input.
	 */
	helpText: {
		type: String,
		default: '',
	},
});

defineEmits(['update:modelValue']);
</script>

<template>
	<div class="input" :class="{ 'input--disabled': disabled }">
		<label v-if="label" class="input__label">{{ label }}</label>
		<input
			class="input__input"
			:value="modelValue"
			:type="type"
			:placeholder="placeholder"
			:disabled="disabled"
			@input="$emit('update:modelValue', $event.target.value)"
		/>
		<span v-if="helpText" class="input__help-text">{{ helpText }}</span>
	</div>
</template>
