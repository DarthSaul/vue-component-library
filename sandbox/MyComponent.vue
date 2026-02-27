<script setup>
import { computed } from 'vue';

const props = defineProps({
	secure: {
		type: Boolean,
		default: false,
	},
	secureToggleBtn: {
		type: Boolean,
		default: false,
	},
});

const emit = defineEmits(['update:secure']);

const inputType = computed(() => (props.secure ? 'password' : 'text'));
</script>

<template>
	<div class="cnb-input-wrapper">
		<input :type="inputType" v-bind="$attrs" />
		<button
			v-if="secureToggleBtn"
			@click="emit('update:secure', !props.secure)"
		>
			<EyeOpenIcon v-if="props.secure" />
			<EyeClosedIcon v-else />
		</button>
	</div>
</template>
