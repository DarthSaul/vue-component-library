<script setup>
/**
 * CnbIcon
 *
 * Mode is decided by which prop is set and its type:
 *
 *   name="check-circle"        → sprite            <svg><use href="#icon-check-circle"/></svg>
 *   icon="check"   (String)    → font-awesome      <i class="fa-check">       (legacy)
 *   :icon="ImportedSvg" (Obj)  → raw SVG component <component :is="…">       (legacy)
 *
 * FontAwesome: CnbIcon applies ONLY `fa-${icon}`. Every other FA class
 * (base/style class, fa-spin, fa-rotate-90, fa-fw, …) is passed by the
 * consumer as a normal `class` and reaches the <i> via attribute fallthrough.
 * The consuming app is responsible for loading the FontAwesome stylesheet.
 *
 * Both legacy modes are removed in the major that retires the legacy API.
 */
import { computed, watchEffect } from 'vue';
import { ensureIconSprite, getSymbolHref, iconNames } from '@roxbury/icons';

defineOptions({ name: 'CnbIcon' });

const props = defineProps({
	/** Roxbury sprite icon name (kebab-case, from the icon registry). */
	name: {
		type: String,
		default: undefined,
	},
	/**
	 * @deprecated Use `name`.
	 * String → FontAwesome icon name (rendered as `fa-${icon}`).
	 * Object → imported raw SVG component.
	 */
	icon: {
		type: [String, Object],
		default: undefined,
	},
	/**
	 * @deprecated No longer affects rendering — mode is detected from the type
	 * of `icon`. Declared only so existing `:font-awesome="false"` usage is
	 * consumed as a prop instead of falling through as a DOM attribute.
	 * Removed with the rest of the legacy API.
	 */
	fontAwesome: {
		type: Boolean,
		default: undefined,
	},
	/**
	 * Accessible name. Omit for decorative icons (the common case — the icon
	 * sits beside visible text). Provide it when the icon carries meaning on
	 * its own, e.g. an icon-only status indicator.
	 */
	label: {
		type: String,
		default: undefined,
	},
});

// Vite lib mode statically replaces import.meta.env.* at Roxbury's build, so
// it would always be false for consumers. process.env.NODE_ENV survives lib
// mode and is replaced by the consumer's bundler (same pattern Vue uses).
const isDev = process.env.NODE_ENV !== 'production';

const knownIcons = new Set(iconNames);

const mode = computed(() => {
	if (props.name) return 'sprite';
	if (typeof props.icon === 'string' && props.icon) return 'font-awesome';
	if (props.icon && typeof props.icon === 'object') return 'raw-svg';
	return 'none';
});

// First run is synchronous during setup, so the sprite is in the DOM before
// the first <use> paints. Only sprite mode injects; legacy-only consumers
// never get the sprite in their DOM. ensureIconSprite() is idempotent and a
// no-op without a DOM.
watchEffect(() => {
	if (mode.value === 'sprite') ensureIconSprite();
});

const href = computed(() => (mode.value === 'sprite' ? getSymbolHref(props.name) : undefined));

const faClass = computed(() => (mode.value === 'font-awesome' ? `fa-${props.icon}` : undefined));

if (isDev) {
	watchEffect(() => {
		if (props.name && props.icon) {
			console.warn('[CnbIcon] Both "name" and "icon" were provided; "name" wins. Pass only one.');
		}
		if (mode.value === 'sprite' && !knownIcons.has(props.name)) {
			console.warn(
				`[CnbIcon] Unknown icon name "${props.name}". It will render empty. ` +
					'Check it against iconNames from @cnodigital/roxbury/icons.',
			);
		}
		// Story 5 deprecation warnings for `icon` / `fontAwesome` belong here.
	});
}

// Decorative by default; a named image when `label` is set. Same behaviour
// in every mode so legacy usage gets the a11y upgrade too.
const a11yAttrs = computed(() =>
	props.label ? { role: 'img', 'aria-label': props.label } : { 'aria-hidden': 'true' },
);
</script>

<template>
	<svg v-if="mode === 'sprite'" class="cnb-icon cnb-icon--svg" focusable="false" v-bind="a11yAttrs">
		<use :href="href" />
	</svg>

	<i v-else-if="mode === 'font-awesome'" :class="['cnb-icon', faClass]" v-bind="a11yAttrs" />

	<component
		:is="icon"
		v-else-if="mode === 'raw-svg'"
		class="cnb-icon cnb-icon--svg"
		focusable="false"
		v-bind="a11yAttrs"
	/>
</template>

<!--
  If component styles live in the styles/ workspace by convention, move this
  there — but keep `fill: currentColor` on the SVG host; it is what lets CSS
  `color` reach the sprite symbols. Sizing is scoped to SVG modes so it can't
  fight FontAwesome's own glyph sizing (fa-fw, fa-lg, …).
-->
<style>
.cnb-icon--svg {
	display: inline-block;
	width: 1em;
	height: 1em;
	flex-shrink: 0;
	vertical-align: -0.125em;
	fill: currentColor;
}
</style>
