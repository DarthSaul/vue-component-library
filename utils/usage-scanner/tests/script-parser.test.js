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
			{ componentName: 'Button', localName: 'Button', source: '@pvt-scope/pkg-name' },
			{ componentName: 'Input', localName: 'Input', source: '@pvt-scope/pkg-name' },
		]);
	});

	it('detects renamed imports', () => {
		const code = `import { Button as PreButton } from '@pvt-scope/pkg-name';`;
		const result = extractImportsFromScript(code, {
			packageName: PACKAGE,
		});

		expect(result).toEqual([
			{ componentName: 'Button', localName: 'PreButton', source: '@pvt-scope/pkg-name' },
		]);
	});

	it('detects deep/path imports', () => {
		const code = `import Button from '@pvt-scope/pkg-name/components/Button';`;
		const result = extractImportsFromScript(code, {
			packageName: PACKAGE,
		});

		expect(result).toEqual([
			{ componentName: 'Button', localName: 'Button', source: '@pvt-scope/pkg-name/components/Button' },
		]);
	});

	it('detects default import from package root', () => {
		const code = `import LibName from '@pvt-scope/pkg-name';`;
		const result = extractImportsFromScript(code, {
			packageName: PACKAGE,
		});

		expect(result).toEqual([
			{ componentName: 'LibName', localName: 'LibName', source: '@pvt-scope/pkg-name' },
		]);
	});

	it('detects namespace imports', () => {
		const code = `import * as LibName from '@pvt-scope/pkg-name';`;
		const result = extractImportsFromScript(code, {
			packageName: PACKAGE,
		});

		expect(result).toEqual([
			{ componentName: '*', localName: 'LibName', source: '@pvt-scope/pkg-name' },
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
			{ componentName: 'Button', localName: 'Button', source: '@pvt-scope/pkg-name' },
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
				source: '@pvt-scope/pkg-name',
			},
			{ componentName: 'Button', localName: 'Button', source: '@pvt-scope/pkg-name' },
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
			{ componentName: 'Button', localName: 'Button', source: '@pvt-scope/pkg-name' },
			{ componentName: 'Input', localName: 'Input', source: '@pvt-scope/pkg-name' },
			{ componentName: 'Dropdown', localName: 'Dropdown', source: '@pvt-scope/pkg-name' },
		]);
	});

	it('includes source for icon subpath imports', () => {
		const code = `import { CheckCircle } from '@pvt-scope/pkg-name/icons';`;
		const result = extractImportsFromScript(code, {
			packageName: PACKAGE,
		});

		expect(result).toEqual([
			{ componentName: 'CheckCircle', localName: 'CheckCircle', source: '@pvt-scope/pkg-name/icons' },
		]);
	});

	it('includes source for styles subpath imports', () => {
		const code = `import '@pvt-scope/pkg-name/styles/Button';`;
		const result = extractImportsFromScript(code, {
			packageName: PACKAGE,
		});

		// side-effect import has no specifiers — nothing pushed
		expect(result).toEqual([]);
	});
});
