<template>
	<div :class="['alert', `alert--${type}`]" role="alert">
		<div class="alert__icon">
			<svg
				v-if="type === 'success'"
				viewBox="0 0 24 24"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
			>
				<path
					d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			</svg>
			<svg
				v-else-if="type === 'danger'"
				viewBox="0 0 24 24"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
			>
				<path
					d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			</svg>
			<svg
				v-else-if="type === 'warning'"
				viewBox="0 0 24 24"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
			>
				<path
					d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			</svg>
			<svg
				v-else-if="type === 'info'"
				viewBox="0 0 24 24"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
			>
				<path
					d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			</svg>
		</div>
		<div class="alert__content">
			<div v-if="title || $slots.title" class="alert__title">
				<slot name="title">{{ title }}</slot>
			</div>
			<div v-if="message || $slots.default" class="alert__message">
				<slot>{{ message }}</slot>
			</div>
		</div>
		<button
			v-if="closable"
			class="alert__close"
			@click="handleClose"
			aria-label="Close alert"
		>
			<svg
				viewBox="0 0 24 24"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
			>
				<path
					d="M6 18L18 6M6 6l12 12"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			</svg>
		</button>
	</div>
</template>

<script setup>
defineProps({
	/**
	 * Semantic type of the alert, controls color and icon.
	 * @values success, danger, warning, info
	 */
	type: {
		type: String,
		default: 'info',
		validator: (value) =>
			['success', 'danger', 'warning', 'info'].includes(
				value,
			),
	},
	/**
	 * Optional bold heading displayed above the message.
	 */
	title: {
		type: String,
		default: '',
	},
	/**
	 * Main body text of the alert.
	 */
	message: {
		type: String,
		default: '',
	},
	/**
	 * When true, renders a close button that emits the `close` event.
	 */
	closable: {
		type: Boolean,
		default: false,
	},
});

const emit = defineEmits(['close']);

const handleClose = () => {
	emit('close');
};
</script>
