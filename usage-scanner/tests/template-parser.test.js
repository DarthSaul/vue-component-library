import { describe, it, expect } from 'vitest';
import { normalizeTagName, countComponentTags } from '../src/parsers/template-parser.js';

// ---------------------------------------------------------------------------
// normalizeTagName
// ---------------------------------------------------------------------------

describe('normalizeTagName', () => {
	it('leaves PascalCase unchanged', () => {
		expect(normalizeTagName('Button')).toBe('Button');
	});

	it('does not mangle multi-word PascalCase', () => {
		expect(normalizeTagName('ButtonGroup')).toBe('ButtonGroup');
	});

	it('converts simple kebab-case to PascalCase', () => {
		expect(normalizeTagName('pre-button')).toBe('PreButton');
	});

	it('converts multi-segment kebab-case', () => {
		expect(normalizeTagName('check-circle')).toBe('CheckCircle');
	});

	it('handles single-word kebab (no hyphen) unchanged', () => {
		expect(normalizeTagName('button')).toBe('button');
	});
});

// ---------------------------------------------------------------------------
// countComponentTags
// ---------------------------------------------------------------------------

describe('countComponentTags', () => {
	it('returns empty Map for empty string', () => {
		expect(countComponentTags('')).toEqual(new Map());
	});

	it('returns empty Map for whitespace-only string', () => {
		expect(countComponentTags('   ')).toEqual(new Map());
	});

	it('returns empty Map for unparseable input', () => {
		expect(countComponentTags('<<<<')).toEqual(new Map());
	});

	it('counts a single component tag', () => {
		const template = `<div><Button /></div>`;
		expect(countComponentTags(template)).toEqual(new Map([['Button', 1]]));
	});

	it('counts multiple uses of the same component', () => {
		const template = `<div><Button /><Button /><Button /></div>`;
		expect(countComponentTags(template)).toEqual(new Map([['Button', 3]]));
	});

	it('does NOT count native HTML tags', () => {
		const template = `<div><button /><span /><input /></div>`;
		expect(countComponentTags(template)).toEqual(new Map());
	});

	it('does not count a native <button> even when a component named Button exists', () => {
		const template = `<div><Button /><button /></div>`;
		const counts = countComponentTags(template);
		expect(counts.get('Button')).toBe(1);
		expect(counts.size).toBe(1);
	});

	it('normalizes kebab-case tags to PascalCase', () => {
		const template = `<div><my-button /></div>`;
		expect(countComponentTags(template)).toEqual(new Map([['MyButton', 1]]));
	});

	it('collapses kebab and PascalCase usage of the same component', () => {
		const template = `<div><my-button /><MyButton /></div>`;
		expect(countComponentTags(template)).toEqual(new Map([['MyButton', 2]]));
	});

	it('counts self-closing tags', () => {
		const template = `<Button />`;
		expect(countComponentTags(template)).toEqual(new Map([['Button', 1]]));
	});

	it('counts deeply nested component tags', () => {
		const template = `
			<div>
				<section>
					<Card>
						<Button />
					</Card>
				</section>
			</div>
		`;
		const counts = countComponentTags(template);
		expect(counts.get('Card')).toBe(1);
		expect(counts.get('Button')).toBe(1);
	});

	it('counts components inside <template> and <slot> subtrees', () => {
		const template = `
			<div>
				<template v-if="show">
					<Button />
				</template>
				<slot>
					<Input />
				</slot>
			</div>
		`;
		const counts = countComponentTags(template);
		expect(counts.get('Button')).toBe(1);
		expect(counts.get('Input')).toBe(1);
	});

	it('counts a v-for component once (source occurrence, not runtime count)', () => {
		const template = `<div><Button v-for="i in 10" :key="i" /></div>`;
		expect(countComponentTags(template)).toEqual(new Map([['Button', 1]]));
	});

	it('counts multiple distinct components', () => {
		const template = `<div><Button /><Input /><Dropdown /><Button /></div>`;
		const counts = countComponentTags(template);
		expect(counts.get('Button')).toBe(2);
		expect(counts.get('Input')).toBe(1);
		expect(counts.get('Dropdown')).toBe(1);
	});
});
