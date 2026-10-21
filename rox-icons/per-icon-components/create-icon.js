/**
 * createIcon
 *
 * Builds the Vue component for one icon. Every generated icon module calls
 * this with its compiled SVG data, so the icon API (props, classes,
 * accessibility, coloring) lives in one place instead of 300 generated files.
 * Prop types are declared in create-icon.d.ts; keep the two in sync.
 *
 * Internal: not exported from @cnodigital/roxbury/icons.
 */
import { defineComponent, h } from 'vue';

/**
 * Sizes map to `cnb-icon--<size>` classes in styles/src/components/_Icon.scss.
 * Same names and pixel values as CnbIcon's `size` prop, so usage carries over.
 */
const SIZES = ['xsmall', 'small', 'medium', 'large', '2x', '3x', '5x', '7x', '10x'];

/**
 * Semantic colors. Each sets --rox-icon-svg-color on the icon, so the prop and
 * the CSS variable are one mechanism, and a prop always wins over a value
 * inherited from an ancestor. Fill in from Roxbury's color tokens.
 */
const COLORS = {
	primary: 'var(--rox-primary-color)',
	// secondary: 'var(--rox-secondary-color)',
	// muted: 'var(--rox-text-muted-color)',
	// inverse: 'var(--rox-text-inverse-color)',
	current: 'currentColor', // match the surrounding text color
};

/** check-circle → CheckCircleIcon (kept in sync with build-components.js) */
function toComponentName(name) {
	return `${name
		.split('-')
		.map((part) => part[0].toUpperCase() + part.slice(1))
		.join('')}Icon`;
}

/** [tag, attrs, children?] → vnode. Strings are text content (e.g. <style>). */
function renderNode(node) {
	if (typeof node === 'string') return node;
	const [tag, attrs, children] = node;
	return h(tag, attrs, children?.map(renderNode));
}

/**
 * @param {string} name             Icon name, e.g. "check-circle"
 * @param {Record<string, string>} svgAttrs  Root <svg> attributes (viewBox, fill, ...)
 * @param {Array} children          Compiled child nodes
 */
export function createIcon(name, svgAttrs, children) {
	return defineComponent({
		name: toComponentName(name),
		props: {
			/**
			 * Accessible name. Omit for decorative icons (the common case: the
			 * icon sits beside visible text). Provide it when the icon carries
			 * meaning on its own, e.g. an icon-only status indicator.
			 */
			label: { type: String, default: undefined },
			/** Fixed size. Omit to scale with the surrounding font size (1em). */
			size: {
				type: String,
				default: undefined,
				validator: (value) => SIZES.includes(value),
			},
			/**
			 * Semantic color. Omit for the default (primary). Fixed-color icons
			 * such as danger, warning and success ignore it.
			 */
			color: {
				type: String,
				default: undefined,
				validator: (value) => value in COLORS,
			},
		},
		setup(props, { attrs }) {
			return () => {
				// A consumer-supplied aria-label/labelledby also counts as labelled.
				const labelled = props.label || attrs['aria-label'] || attrs['aria-labelledby'];

				// Class, style, listeners and other attrs fall through to the <svg>
				// and merge with these; consumer values override the defaults.
				return h(
					'svg',
					{
						...svgAttrs,
						class: ['cnb-icon', props.size && `cnb-icon--${props.size}`],
						style: props.color ? { '--rox-icon-svg-color': COLORS[props.color] } : undefined,
						'data-icon': name,
						focusable: 'false',
						...(labelled ? { role: 'img' } : { 'aria-hidden': 'true' }),
						...(props.label && { 'aria-label': props.label }),
					},
					children.map(renderNode),
				);
			};
		},
	});
}
