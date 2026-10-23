/**
 * Stories for the per-icon components (BellIcon, AccessIcon, …).
 *
 * Lives in the icons workspace, next to the code it documents. Storybook picks
 * it up through the `stories` glob in .storybook/main.js. It renders from
 * source, so the generated components must exist (`npm run generate -w icons`).
 */
import * as icons from './index.js';

const { iconNames } = icons;

const SIZES = ['xsmall', 'small', 'medium', 'large', '2x', '3x', '5x', '7x', '10x'];
const COLORS = ['primary', 'current'];
const DEFAULT_ICON = iconNames.includes('bell') ? 'bell' : iconNames[0];

/** check-circle → CheckCircleIcon (same rule as build-components.js) */
function toComponentName(name) {
	return `${name
		.split('-')
		.map((part) => part[0].toUpperCase() + part.slice(1))
		.join('')}Icon`;
}

function iconFor(name) {
	return icons[toComponentName(name)];
}

export default {
	title: 'Icons/Icon components',
	tags: ['autodocs'],
	argTypes: {
		icon: {
			control: 'select',
			options: iconNames,
			description: 'Icon to render. Not a real prop: each icon is its own component.',
			table: { category: 'Story' },
		},
		size: {
			control: 'select',
			options: [undefined, ...SIZES],
			description: 'Fixed size. Omit to scale with the surrounding font size (1em).',
			table: { type: { summary: SIZES.map((size) => `'${size}'`).join(' | ') } },
		},
		color: {
			control: 'select',
			options: [undefined, ...COLORS],
			description:
				'Semantic color. Omit to use --rox-icon-svg-color from an ancestor, or primary. Fixed-color icons ignore it.',
			table: {
				type: { summary: COLORS.map((color) => `'${color}'`).join(' | ') },
				defaultValue: { summary: 'primary (via CSS)' },
			},
		},
		label: {
			control: 'text',
			description: 'Accessible name. Omit for decorative icons (rendered with aria-hidden="true").',
			table: { type: { summary: 'string' } },
		},
	},
	args: {
		icon: DEFAULT_ICON,
		size: 'large',
		color: undefined,
		label: '',
	},
	render: ({ icon, ...props }) => ({
		setup: () => ({ Icon: iconFor(icon), props }),
		template: '<component :is="Icon" v-bind="props" :label="props.label || undefined" />',
	}),
	parameters: {
		docs: {
			description: {
				component:
					"Every icon is its own Vue component, so apps ship only the icons they import:\n\n```js\nimport BellIcon from '@cnodigital/roxbury/rox-icons/bell';\n```",
			},
		},
	},
};

export const Default = {};

export const Labelled = {
	args: { label: 'Notifications' },
	parameters: {
		docs: {
			description: {
				story: 'With `label`, the icon is announced as an image with that name (`role="img"` + `aria-label`).',
			},
		},
	},
};

export const Sizes = {
	argTypes: { size: { control: false } },
	render: ({ icon, color }) => ({
		setup: () => ({ Icon: iconFor(icon), color, sizes: SIZES }),
		template: `
			<div style="display: flex; align-items: end; gap: 1.5rem; flex-wrap: wrap;">
				<figure v-for="size in sizes" :key="size" style="margin: 0; text-align: center;">
					<component :is="Icon" :size="size" :color="color" />
					<figcaption style="font-size: 0.75rem;">{{ size }}</figcaption>
				</figure>
				<figure style="margin: 0; text-align: center; font-size: 2rem;">
					<component :is="Icon" :color="color" />
					<figcaption style="font-size: 0.75rem;">unset (1em)</figcaption>
				</figure>
			</div>
		`,
	}),
};

export const Colors = {
	argTypes: { color: { control: false } },
	render: ({ icon, size }) => ({
		setup: () => ({ Icon: iconFor(icon), size }),
		template: `
			<div style="display: grid; gap: 1rem;">
				<p><component :is="Icon" :size="size" /> Unset: primary, or inherited from an ancestor</p>
				<p><component :is="Icon" :size="size" color="primary" /> color="primary"</p>
				<p style="color: #b42318;"><component :is="Icon" :size="size" color="current" /> color="current" follows the text color</p>
				<p><component :is="Icon" :size="size" style="--rox-icon-svg-color: #0b6e4f;" /> --rox-icon-svg-color on the icon</p>
				<p style="--rox-icon-svg-color: #6941c6;"><component :is="Icon" :size="size" /> --rox-icon-svg-color on an ancestor</p>
			</div>
		`,
	}),
	parameters: {
		docs: {
			description: {
				story:
					'For colors outside the `color` prop, set the `--rox-icon-svg-color` CSS variable on the icon or any ancestor. Leave `color` unset so the variable can be inherited.',
			},
		},
	},
};

export const InlineWithText = {
	argTypes: { size: { control: false } },
	render: ({ icon, color }) => ({
		setup: () => ({ Icon: iconFor(icon), color }),
		template: `
			<div style="display: grid; gap: 0.5rem;">
				<p style="font-size: 0.875rem;"><component :is="Icon" :color="color" /> Small text</p>
				<p style="font-size: 1rem;"><component :is="Icon" :color="color" /> Body text</p>
				<h2 style="font-size: 1.5rem; margin: 0;"><component :is="Icon" :color="color" /> Heading</h2>
			</div>
		`,
	}),
	parameters: {
		docs: {
			description: { story: 'Without `size`, icons are 1em and scale with the surrounding text.' },
		},
	},
};

export const AllIcons = {
	argTypes: { icon: { control: false }, label: { control: false } },
	render: ({ size, color }) => ({
		setup: () => ({
			entries: iconNames.map((name) => ({ name, Icon: iconFor(name) })),
			size,
			color,
		}),
		template: `
			<ul style="display: grid; grid-template-columns: repeat(auto-fill, minmax(8rem, 1fr)); gap: 0.75rem; margin: 0; padding: 0; list-style: none;">
				<li v-for="entry in entries" :key="entry.name" style="display: flex; flex-direction: column; align-items: center; gap: 0.5rem; padding: 0.75rem; text-align: center; font-size: 0.75rem; overflow-wrap: anywhere;">
					<component :is="entry.Icon" :size="size" :color="color" />
					{{ entry.name }}
				</li>
			</ul>
		`,
	}),
};
