# ICON_COMPONENT & Icon System Refactoring — Jira Tickets

---

## Epic: Icon System Modernization

**Epic Name:** ICON_COMPONENT Refactoring & SVG Sprite Architecture

**Summary:** Replace the current icon system — which relies on raw SVG file imports, a legacy FontAwesome integration, and the `font-awesome` prop — with a modern SVG sprite sheet architecture. The new system will allow consuming apps to use icons by string name (`<ICON_COMPONENT icon="check-circle" />`), eliminate the need for per-icon imports, and remove the FontAwesome dependency from Core.scss.

**Business Value:**
The current icon architecture is the single largest source of friction for consuming teams adopting DESIGN_SYSTEM_NAME. Every icon usage requires a raw SVG import and a non-obvious `:font-awesome="false"` prop. The SVG file library itself has accumulated significant tech debt — duplicate filenames across nested folders, inconsistent naming conventions, and no canonical registry. Modernizing this system reduces integration complexity for consumers, removes the FontAwesome CSS/font payload from the bundle, and establishes a maintainable, scalable icon pipeline.

**Scope:**

- Audit and deduplicate the existing SVG icon library. Establish a canonical, flat, kebab-case icon registry.
- Implement an automated build step (e.g., `svg-sprite`) that generates an SVG sprite sheet from the canonical icon set.
- Refactor `ICON_COMPONENT` to support a string-based `icon` prop that references sprite symbols by ID.
- Deprecate the raw SVG import pattern (`:icon="ImportedSvg"`) and the `font-awesome` prop with dev-mode console warnings.
- Remove all internal FontAwesome usage within the DESIGN_SYSTEM_NAME component library (estimated ~12 or fewer instances).
- Maintain backward compatibility for two releases via dual-mode API detection, then drop the legacy API in a major version.
- Provide a migration guide for consuming teams.

**Out of Scope:**

- Tree-shakeable or subset sprite loading (full sprite sheet is the default; splitting is a future optimization if needed).
- Runtime icon loading or lazy sprite injection.
- Redesigning or redrawing any icons — this is a delivery/architecture change, not a visual refresh.

**Acceptance Criteria:**

- [ ] All SVG icons consolidated into a flat, deduplicated, kebab-case-named directory.
- [ ] Automated sprite generation integrated into the DESIGN_SYSTEM_NAME build pipeline.
- [ ] `ICON_COMPONENT` supports `<ICON_COMPONENT icon="check-circle" />` (string-based sprite lookup).
- [ ] `ICON_COMPONENT` retains backward compatibility with raw SVG imports and `:font-awesome` for two releases.
- [ ] Dev-mode deprecation warnings emitted for legacy API usage.
- [ ] All internal FontAwesome references within DESIGN_SYSTEM_NAME replaced with sprite-based SVG icons.
- [ ] FontAwesome CSS/font removed from Core.scss.
- [ ] Migration guide published for consuming teams.
- [ ] Net bundle size does not increase (and is expected to decrease with FontAwesome removal).

---

## IP Sprint Story: Icon Sprite POC & Icon Audit

**Story Title:** [IP][Spike] SVG sprite sheet POC and icon library audit

**Type:** Spike / Proof of Concept

**Sprint:** Innovation & Planning (PI [X] IP Sprint)

**Parent Epic:** ICON_COMPONENT Refactoring & SVG Sprite Architecture

**Summary:** Prove out the SVG sprite sheet approach for the icon system by building a working prototype of sprite generation and a refactored ICON_COMPONENT that consumes it. In parallel, audit and flatten the existing SVG icon library to produce a canonical, deduplicated icon set — a prerequisite for any sprite generation.

**Context:**
This is an IP sprint spike. The goal is to validate the sprite-based architecture, identify technical risks, and produce the clean icon source directory that execution-sprint work will build on. There is no expectation of production readiness.

**Approach:**

### Part 1: Icon Library Audit & Deduplication

- Run the SVG flattening script (provided) against `icons/Icons/` to move all nested SVGs into a single flat directory, routing filename collisions to a `duplicates/` folder.
- Manually review the duplicates folder:
     - Identify true duplicates (visually identical files that happen to live in different folders) — keep one, discard the rest.
     - Identify false duplicates (different icons that share a filename) — rename to disambiguate and move into the canonical set.
- Normalize all filenames to kebab-case.
- Document the final canonical icon list.
- Establish a `currentColor` convention: icons intended to be consumer-colorable should use `currentColor` for their fill/stroke values. Multi-color icons retain hardcoded fills.

### Part 2: Sprite Generation POC

- Evaluate and select a sprite generation tool. Recommended starting point: [`svg-sprite`](https://github.com/svg-sprite/svg-sprite) (Node.js, actively maintained, supports `<symbol>` mode which is what we need).
- Configure the tool to generate a `<symbol>`-based sprite sheet from the canonical flat icon directory.
- Integrate the sprite generation as a build script in the `ui` workspace (or as a pre-build step).
- Validate that multi-color icons and `currentColor` icons both render correctly from the sprite.

### Part 3: ICON_COMPONENT Prototype

- Create a prototype branch with a refactored `ICON_COMPONENT` that supports dual-mode operation:
     - **New API:** `icon` prop is a `String` → renders `<svg><use href="#icon-{name}" /></svg>`.
     - **Legacy API:** `icon` prop is an `Object`/`Component` (raw SVG import) → renders using existing logic.
     - **FontAwesome (deprecated):** `font-awesome` prop is `true` → renders using existing FontAwesome logic with a dev-mode `console.warn` deprecation notice.
- Validate that existing wrapping styles (path/fill overrides) work with the sprite `<use>` approach.
- Document any CSS specificity changes required for `<use>` references (shadow DOM boundary behavior).

**Acceptance Criteria:**

- [ ] SVG flattening script run successfully; all icons consolidated to a flat directory.
- [ ] Duplicates reviewed — true duplicates removed, false duplicates renamed.
- [ ] All icon filenames follow kebab-case convention.
- [ ] Sprite generation tool selected and configured; sprite sheet generated from canonical icon set.
- [ ] Prototype ICON_COMPONENT renders icons via string name from the sprite.
- [ ] Prototype ICON_COMPONENT retains backward compatibility with raw SVG import usage.
- [ ] Dev-mode console warning fires for `:font-awesome` and raw SVG import patterns.
- [ ] Color override behavior validated: `currentColor` icons respond to CSS `color`; multi-color icons render correctly.
- [ ] Spike findings documented: tool choice rationale, known gotchas, `<use>` + CSS interaction notes, recommended execution plan.

**Out of Scope for this story:**

- Production-ready ICON_COMPONENT refactor.
- FontAwesome removal from internal component library usages (separate story).
- Migration guide authoring.
- Sprite injection strategy for consuming apps (how the sprite gets into the DOM).
- Build pipeline integration beyond a local proof-of-concept script.

**Story Points:** [Team to estimate]

**Notes:**

- The `<use>` element references symbols inside the sprite. CSS `fill` and `color` inheritance works across `<use>` boundaries, but only for properties not explicitly set on the source SVG elements. This means icons that hardcode `fill="#000"` on their paths will not respond to CSS color overrides — they need `fill="currentColor"` instead. The audit step should flag icons that need this change.
- The sprite file itself will be small. Even hundreds of SVG symbols compress well under gzip/brotli — expect 30-80KB compressed, which is smaller than the FontAwesome CSS + font files being removed.
- `svg-sprite` is recommended over `fantasticon` because fantasticon generates icon fonts (single-color, `.eot`/`.woff`), whereas `svg-sprite` generates SVG sprite sheets that preserve multi-color fills and render sharply at all sizes.

---

```js
// scripts/build-sprite.js
import SVGSpriter from 'svg-sprite';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import fg from 'fast-glob';

const icons = fg.sync('icons/flat/**/*.svg');

const spriter = new SVGSpriter({
	shape: {
		transform: ['svgo'],
		id: {
			generator: (name) => {
				const stem = basename(name, '.svg');
				return `icon-${stem}`;
			},
		},
	},
	mode: {
		symbol: {
			sprite: 'icons-sprite.svg',
			example: true,
		},
	},
});

for (const file of icons) {
	const filePath = resolve(file);
	spriter.add(filePath, basename(file), readFileSync(filePath, 'utf-8'));
}

const { result } = await spriter.compileAsync();

mkdirSync('dist', { recursive: true });
writeFileSync('dist/icons-sprite.svg', result.symbol.sprite.contents);
console.log(`Sprite generated: dist/icons-sprite.svg (${icons.length} icons)`);
```
