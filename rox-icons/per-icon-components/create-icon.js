/**
 * createIcon
 *
 * Builds the Vue component for one icon. Every generated icon module calls
 * this with its compiled SVG data, so behaviour (classes, accessibility,
 * coloring) lives in one place instead of 300 generated files.
 *
 * Internal: not exported from @cnodigital/roxbury/icons.
 */
import { defineComponent, h } from 'vue';

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
		},
		setup(props, { attrs }) {
			return () => {
				// A consumer-supplied aria-label/labelledby also counts as labelled.
				const labelled = props.label || attrs['aria-label'] || attrs['aria-labelledby'];

				// Class, style, listeners and other attrs fall through to the <svg>
				// automatically; consumer values override these defaults.
				return h(
					'svg',
					{
						...svgAttrs,
						class: 'cnb-icon',
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
