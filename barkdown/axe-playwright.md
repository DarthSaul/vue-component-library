# Introduction to Playwright Accessibility Testing

Playwright can be used to test apps or components for many types of accessibility issues. There are many different plugins the Playwright browser engine can support; the examples on [Playwright's documentation](https://playwright.dev/docs/accessibility-testing) use the `@axe-core/playwright` package which adds support for running the [axe accessibility testing engine](https://www.deque.com/axe/) .

## What `@axe-core/playwright` actually is

It's a thin integration layer that injects the [axe-core](https://github.com/dequelabs/axe-core) accessibility engine into whatever page Playwright currently has open, runs the audit against the live DOM, and returns a structured results object. The key thing to understand is that axe-core runs in the browser context — it inspects the actual rendered DOM, computed styles, ARIA attributes, color contrast, etc. It's not static analysis; it's runtime analysis of what's actually on screen.

The `AxeBuilder` class gives you a builder pattern to configure what axe scans and which rules it applies before calling `.analyze()`.

## Storybook iframe details that matter

When you run Playwright against a Storybook story, you're testing against something like:

```text
http://localhost:6006/iframe.html?id=components-button--primary
```

That iframe URL renders the story in isolation — no Storybook chrome, no sidebar, just your component. This is actually **ideal** for axe scanning because you're testing your component's markup in isolation without Storybook's own UI polluting the results.

## Implementation walkthrough

1: Install

```bash
npm install -D @axe-core/playwright
```

2: Create a shared fixture

```js
// e2e/fixtures/axe-test.js
import { test as base, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

export const test = base.extend({
	makeAxeBuilder: async ({ page }, use) => {
		const makeAxeBuilder = () =>
			new AxeBuilder({ page }).withTags([
				'wcag2a',
				'wcag2aa',
				'wcag21a',
				'wcag21aa',
			]);

		await use(makeAxeBuilder);
	},
});

export { expect };
```

A few notes on this:

- `withTags` scopes axe to only WCAG 2.1 Level A and AA rules. This is the standard compliance target for most organizations, and it filters out axe's "best practice" rules that aren't tied to any WCAG criterion. You can always tighten this later.
- No global `.exclude()` yet. Start clean. Add exclusions only when you encounter verified false positives or third-party DOM you don't control. Every exclusion is tech debt.
- The fixture returns a factory function, not an instance. This lets each test add its own `.include()`, `.exclude()`, or `.disableRules()` on top of the shared config.

3: Write a11y tests for your story iframes

```js
// e2e/tests/button.a11y.spec.js
import { test, expect } from '../fixtures/axe-test.js';

const STORYBOOK_URL = process.env.STORYBOOK_URL || 'http://localhost:6006';

function storyUrl(storyId) {
	return `${STORYBOOK_URL}/iframe.html?id=${storyId}`;
}

test.describe('Button accessibility', () => {
	test('primary variant has no a11y violations', async ({
		page,
		makeAxeBuilder,
	}) => {
		await page.goto(storyUrl('components-button--primary'));
		// Wait for the component to be fully rendered
		await page.locator('#storybook-root > *').first().waitFor();

		const results = await makeAxeBuilder().analyze();

		expect(results.violations).toEqual([]);
	});

	test('disabled variant has no a11y violations', async ({
		page,
		makeAxeBuilder,
	}) => {
		await page.goto(storyUrl('components-button--disabled'));
		await page.locator('#storybook-root > *').first().waitFor();

		const results = await makeAxeBuilder().analyze();

		expect(results.violations).toEqual([]);
	});
});
```

The `waitFor()` call matters. Axe analyzes the DOM at the instant you call `.analyze()`. If your component hasn't finished rendering (async data, transitions, lazy slots), axe will audit an incomplete DOM and either miss violations or report false positives.

4: Scale with a Story-driven pattern

```js
// e2e/tests/a11y-scan.spec.js
import { test, expect } from '../fixtures/axe-test.js';

const STORYBOOK_URL = process.env.STORYBOOK_URL || 'http://localhost:6006';

const stories = [
	'components-button--primary',
	'components-button--secondary',
	'components-button--disabled',
	'components-input--default',
	'components-input--with-error',
	'components-dropdown--default',
	'components-dropdown--open',
	// ...
];

for (const storyId of stories) {
	test(`${storyId} has no a11y violations`, async ({
		page,
		makeAxeBuilder,
	}) => {
		await page.goto(`${STORYBOOK_URL}/iframe.html?id=${storyId}`);
		await page.locator('#storybook-root > *').first().waitFor();

		const results = await makeAxeBuilder().analyze();

		expect(results.violations).toEqual([]);
	});
}
```

This loop pattern gives us one test per story in Playwright's reporter, so failures are clearly attributable. We can dynamically attain the full array of stories via Storybook's `stories.json` endpoint (or `/index.json`, depending on SB version), but an explicit declaration is a solid starting point.

5: Attach results to report for debugging

```js
test('primary button a11y', async ({ page, makeAxeBuilder }, testInfo) => {
	await page.goto(storyUrl('components-button--primary'));
	await page.locator('#storybook-root > *').first().waitFor();

	const results = await makeAxeBuilder().analyze();

	await testInfo.attach('a11y-results', {
		body: JSON.stringify(results, null, 2),
		contentType: 'application/json',
	});

	expect(results.violations).toEqual([]);
});
```

This attaches to Playwright's HTML reporter, so in CI you can download the report and inspect every violation's affected nodes, the rule description, and the WCAG criterion it maps to.
