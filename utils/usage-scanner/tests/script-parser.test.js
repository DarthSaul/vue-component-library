import { describe, it, expect } from 'vitest';
import { extractImportsFromScript } from '../src/parsers/script-parser.js';

const PACKAGE = '@pvt-scope/pkg-name';

describe('extractImportsFromScript', () => {
	it('detects named imports', () => {
		const code = `import { Button, Input } from '@pvt-scope/pkg-name';`;
		const result = extractImportsFromScript(code, {
			packageName: PACKAGE,
		});

		expect(result).toEqual([
			{ componentName: 'Button', localName: 'Button' },
			{ componentName: 'Input', localName: 'Input' },
		]);
	});

	it('detects renamed imports', () => {
		const code = `import { Button as PreButton } from '@pvt-scope/pkg-name';`;
		const result = extractImportsFromScript(code, {
			packageName: PACKAGE,
		});

		expect(result).toEqual([
			{ componentName: 'Button', localName: 'PreButton' },
		]);
	});

	it('detects deep/path imports', () => {
		const code = `import Button from '@pvt-scope/pkg-name/components/Button';`;
		const result = extractImportsFromScript(code, {
			packageName: PACKAGE,
		});

		expect(result).toEqual([
			{ componentName: 'Button', localName: 'Button' },
		]);
	});

	it('detects default import from package root', () => {
		const code = `import LibName from '@pvt-scope/pkg-name';`;
		const result = extractImportsFromScript(code, {
			packageName: PACKAGE,
		});

		expect(result).toEqual([
			{ componentName: 'LibName', localName: 'LibName' },
		]);
	});

	it('detects namespace imports', () => {
		const code = `import * as LibName from '@pvt-scope/pkg-name';`;
		const result = extractImportsFromScript(code, {
			packageName: PACKAGE,
		});

		expect(result).toEqual([
			{ componentName: '*', localName: 'LibName' },
		]);
	});

	it('ignores imports from other packages', () => {
		const code = `
      import { ref } from 'vue';
      import { Button } from '@pvt-scope/pkg-name';
      import axios from 'axios';
    `;
		const result = extractImportsFromScript(code, {
			packageName: PACKAGE,
		});

		expect(result).toEqual([
			{ componentName: 'Button', localName: 'Button' },
		]);
	});

	it('handles TypeScript files', () => {
		const code = `
      import type { ButtonProps } from '@pvt-scope/pkg-name';
      import { Button } from '@pvt-scope/pkg-name';
    `;
		const result = extractImportsFromScript(code, {
			packageName: PACKAGE,
			isTS: true,
		});

		// type-only imports are still ImportDeclarations in the AST
		expect(result).toEqual([
			{
				componentName: 'ButtonProps',
				localName: 'ButtonProps',
			},
			{ componentName: 'Button', localName: 'Button' },
		]);
	});

	it('returns empty array for unparseable code', () => {
		const code = `this is not valid javascript {{{`;
		const result = extractImportsFromScript(code, {
			packageName: PACKAGE,
		});

		expect(result).toEqual([]);
	});

	it('handles multiple import statements from the same package', () => {
		const code = `
      import { Button } from '@pvt-scope/pkg-name';
      import { Input, Dropdown } from '@pvt-scope/pkg-name';
    `;
		const result = extractImportsFromScript(code, {
			packageName: PACKAGE,
		});

		expect(result).toEqual([
			{ componentName: 'Button', localName: 'Button' },
			{ componentName: 'Input', localName: 'Input' },
			{ componentName: 'Dropdown', localName: 'Dropdown' },
		]);
	});
});
