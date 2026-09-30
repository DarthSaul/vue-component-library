/**
 * Roxbury icon sprite injection.
 *
 * Puts the SVG <symbol> sprite into document.body exactly once so that
 * `<use href="#icon-…">` references in CnbIcon resolve. Owned here, not in
 * the component — CnbIcon only calls ensureIconSprite().
 *
 * See docs/adr/0001-icon-sprite-injection.md for the rationale.
 */

// `?raw` is resolved at Roxbury's build; consumers receive a plain string
// and need no bundler support. Adjust the relative path (or use a Vite alias)
// to point at the committed, drift-checked sprite in icons/generated/.
import spriteMarkup from '../../icons/generated/icons-sprite.svg?raw';

/**
 * Stable id on the injected sprite root. This is the idempotency key: the
 * DOM lookup on it is the single source of truth for "already injected".
 * (A module-level flag is deliberately not used — it goes stale under HMR
 * and is blind to a second copy of the library in the same page.)
 */
export const SPRITE_ID = 'roxbury-icon-sprite';

function hasDOM() {
	return typeof document !== 'undefined' && typeof DOMParser !== 'undefined';
}

/**
 * Parse the sprite into an <svg> owned by the current document.
 *
 * DOMParser is used deliberately instead of innerHTML: innerHTML is a
 * Trusted Types sink and throws under `require-trusted-types-for 'script'`,
 * which some consuming apps enforce. parseFromString produces an inert
 * document with no script execution.
 *
 * @returns {SVGSVGElement}
 */
function parseSprite() {
	const doc = new DOMParser().parseFromString(spriteMarkup, 'image/svg+xml');
	const root = doc.documentElement;

	if (!root || root.nodeName === 'parsererror' || root.querySelector('parsererror')) {
		throw new Error('[Roxbury] icon sprite markup failed to parse as SVG.');
	}

	return /** @type {SVGSVGElement} */ (document.importNode(root, true));
}

/**
 * Make the sprite root invisible and inert without using `display: none`,
 * which can break gradients/masks/patterns referenced from inside symbols.
 *
 * @param {SVGSVGElement} svg
 */
function hideSpriteRoot(svg) {
	svg.id = SPRITE_ID;
	svg.setAttribute('aria-hidden', 'true');
	svg.setAttribute('focusable', 'false');
	svg.setAttribute('width', '0');
	svg.setAttribute('height', '0');
	svg.style.position = 'absolute';
	svg.style.width = '0';
	svg.style.height = '0';
	svg.style.overflow = 'hidden';
}

/**
 * @param {SVGSVGElement} svg
 */
function appendToBody(svg) {
	// Append (not prepend) so consumer CSS relying on `body > :first-child`
	// is unaffected.
	if (document.body) {
		document.body.appendChild(svg);
		return;
	}
	// Only reachable if called from a non-deferred script in <head>.
	document.addEventListener(
		'DOMContentLoaded',
		() => {
			if (!document.getElementById(SPRITE_ID)) document.body.appendChild(svg);
		},
		{ once: true },
	);
}

/**
 * Ensure the sprite is present in the DOM.
 *
 * Idempotent and cheap: safe to call from every CnbIcon setup(). Checks the
 * DOM, not just module state, so it stays correct under HMR, duplicated
 * library copies, and micro-frontends. No-op outside a browser (SSR, Node
 * test runners).
 *
 * @returns {boolean} true if the sprite is present (or scheduled) after the call
 */
export function ensureIconSprite() {
	if (!hasDOM()) return false;
	if (document.getElementById(SPRITE_ID)) return true;

	const svg = parseSprite();
	hideSpriteRoot(svg);
	appendToBody(svg);
	return true;
}

/**
 * Explicit, eager injection for consumers who want the sprite present before
 * any icon mounts (e.g. from the app entry). Optional — CnbIcon injects on
 * its own. Also the supported client-side path if an SSR consumer appears.
 *
 * @returns {boolean}
 */
export function installIconSprite() {
	return ensureIconSprite();
}

/**
 * Vue plugin form of installIconSprite(), for `app.use(RoxburyIconSprite)`.
 * Purely a convenience; behaviour is identical.
 */
export const RoxburyIconSprite = {
	install() {
		installIconSprite();
	},
};
