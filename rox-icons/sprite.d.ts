/**
 * Type declarations for src/icons/sprite.js.
 * Hand-maintained; copied into dist/icons/ alongside the compiled module so
 * TypeScript consumers get types without Roxbury adopting a TS toolchain.
 */

/** Stable id on the injected sprite root; the idempotency key. */
export declare const SPRITE_ID: 'roxbury-icon-sprite';

/**
 * Ensure the sprite is present in the DOM. Idempotent. Returns false (and
 * does nothing) when no DOM is available.
 */
export declare function ensureIconSprite(): boolean;

/**
 * Explicit, eager injection — optional; CnbIcon injects on its own.
 */
export declare function installIconSprite(): boolean;

/**
 * Vue plugin form of installIconSprite(), for `app.use(RoxburyIconSprite)`.
 */
export declare const RoxburyIconSprite: {
	install(): void;
};
