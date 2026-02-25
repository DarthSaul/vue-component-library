import * as Shared from '@/lib/shared.js';

export const InputBaseProps = [
	{
		name: 'modelValue',
		type: 'String | Number',
		description: 'The bound value of the input (v-model).',
		default: "''",
	},
	Shared.label,
];

export const InputBaseAPI = {
	name: 'InputBase',
	props: [...InputBaseProps],
	slots: [],
	events: [{ name: 'update:modelValue', description: 'Emitted on every keystroke with the current input value.' }],
};

export const InputExtendedAPI = {
	name: 'Input',
	props: [
		...InputBaseAPI.props,
		{
			name: 'placeholder',
			type: 'String',
			description: 'Native input placeholder text.',
			default: "''",
		},
		{
			name: 'type',
			type: 'String',
			description: 'Native input type. One of: text, email, password, number, tel, url.',
			default: "'text'",
		},
		{
			name: 'disabled',
			type: 'Boolean',
			description: 'When true, the input is non-interactive.',
			default: 'false',
		},
		Shared.helpText,
	],
	slots: [],
	events: [{ name: 'update:modelValue', description: 'Emitted on every keystroke with the current input value.' }],
};
