import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createIcon } from '../create-icon.js';

// Shapes match what build-components.js emits: root attrs plus nested
// [tag, attrs, children?] arrays.
const CheckCircleIcon = createIcon('check-circle', { viewBox: '0 0 24 24', fill: 'currentColor' }, [
	['path', { d: 'M12 2a10 10 0 1 0 0 20' }],
	['g', { 'clip-path': 'url(#cnb-check-circle-a)' }, [['circle', { cx: '12', cy: '12', r: '4' }]]],
]);

const StrokeIcon = createIcon('arrow-right', { viewBox: '0 0 24 24', fill: 'none' }, [
	['path', { d: 'M5 12h14', stroke: 'currentColor', 'stroke-width': '2' }],
]);

const DangerIcon = createIcon('danger', { viewBox: '0 0 24 24', fill: 'currentColor' }, [
	['circle', { cx: '12', cy: '12', r: '10', fill: '#d32f2f' }],
	['path', { d: 'M11 7h2v6h-2z', fill: '#fff' }],
]);

const StyledIcon = createIcon('styled', { viewBox: '0 0 24 24' }, [['style', {}, ['.a{opacity:.5}']]]);

function svgOf(wrapper) {
	return wrapper.find('svg');
}

describe('createIcon', () => {
	describe('component', () => {
		it('names the component <Pascal>Icon', () => {
			expect(CheckCircleIcon.name).toBe('CheckCircleIcon');
			expect(createIcon('checkmark-circle-filled', {}, []).name).toBe('CheckmarkCircleFilledIcon');
		});

		it('renders an svg with the icon name, class and focusable="false"', () => {
			const svg = svgOf(mount(CheckCircleIcon));

			expect(svg.attributes('data-icon')).toBe('check-circle');
			expect(svg.classes()).toEqual(['cnb-icon']);
			expect(svg.attributes('focusable')).toBe('false');
		});
	});

	describe('geometry', () => {
		it('applies the root svg attributes', () => {
			expect(svgOf(mount(CheckCircleIcon)).attributes('viewBox')).toBe('0 0 24 24');
		});

		it('renders nested children with their attributes', () => {
			const svg = svgOf(mount(CheckCircleIcon));

			expect(svg.find('path').attributes('d')).toBe('M12 2a10 10 0 1 0 0 20');
			expect(svg.find('g').attributes('clip-path')).toBe('url(#cnb-check-circle-a)');
			expect(svg.find('g > circle').attributes('r')).toBe('4');
		});

		it('renders string children as text content', () => {
			expect(svgOf(mount(StyledIcon)).find('style').text()).toBe('.a{opacity:.5}');
		});
	});

	describe('fill', () => {
		it('keeps the root fill="currentColor" set by the build', () => {
			expect(svgOf(mount(CheckCircleIcon)).attributes('fill')).toBe('currentColor');
		});

		it('keeps fill="none" on stroke icons', () => {
			const svg = svgOf(mount(StrokeIcon));

			expect(svg.attributes('fill')).toBe('none');
			expect(svg.find('path').attributes('stroke')).toBe('currentColor');
		});

		it('keeps hardcoded child fills on fixed-color icons, even with a color prop', () => {
			const svg = svgOf(mount(DangerIcon, { props: { color: 'current' } }));

			expect(svg.find('circle').attributes('fill')).toBe('#d32f2f');
			expect(svg.find('path').attributes('fill')).toBe('#fff');
		});
	});

	describe('accessibility', () => {
		it('is hidden from assistive technology by default', () => {
			const svg = svgOf(mount(CheckCircleIcon));

			expect(svg.attributes('aria-hidden')).toBe('true');
			expect(svg.attributes('role')).toBeUndefined();
			expect(svg.attributes('aria-label')).toBeUndefined();
		});

		it('is a named image when label is set', () => {
			const svg = svgOf(mount(CheckCircleIcon, { props: { label: 'Done' } }));

			expect(svg.attributes('role')).toBe('img');
			expect(svg.attributes('aria-label')).toBe('Done');
			expect(svg.attributes('aria-hidden')).toBeUndefined();
		});

		it('treats a consumer aria-label as labelled', () => {
			const svg = svgOf(mount(CheckCircleIcon, { attrs: { 'aria-label': 'Done' } }));

			expect(svg.attributes('role')).toBe('img');
			expect(svg.attributes('aria-label')).toBe('Done');
			expect(svg.attributes('aria-hidden')).toBeUndefined();
		});

		it('treats a consumer aria-labelledby as labelled', () => {
			const svg = svgOf(mount(CheckCircleIcon, { attrs: { 'aria-labelledby': 'status-heading' } }));

			expect(svg.attributes('role')).toBe('img');
			expect(svg.attributes('aria-labelledby')).toBe('status-heading');
			expect(svg.attributes('aria-hidden')).toBeUndefined();
		});

		it('lets a consumer role override the default', () => {
			const svg = svgOf(mount(CheckCircleIcon, { props: { label: 'Done' }, attrs: { role: 'presentation' } }));

			expect(svg.attributes('role')).toBe('presentation');
		});
	});

	describe('size', () => {
		it('scales with font size (no size class) when size is omitted', () => {
			expect(svgOf(mount(CheckCircleIcon)).classes()).toEqual(['cnb-icon']);
		});

		it.each(['xsmall', 'small', 'medium', 'large', '2x', '3x', '5x', '7x', '10x'])(
			'adds cnb-icon--%s for size="%s"',
			(size) => {
				expect(svgOf(mount(CheckCircleIcon, { props: { size } })).classes()).toEqual([
					'cnb-icon',
					`cnb-icon--${size}`,
				]);
			},
		);

		it('accepts only the supported sizes', () => {
			const { validator } = CheckCircleIcon.props.size;

			expect(validator('large')).toBe(true);
			expect(validator('lg')).toBe(false);
			expect(validator('huge')).toBe(false);
		});

		it('warns in development for an unsupported size', () => {
			const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

			mount(CheckCircleIcon, { props: { size: 'huge' } });

			const messages = warn.mock.calls.map(([message]) => message);
			warn.mockRestore();

			expect(messages).toContainEqual(expect.stringMatching(/Invalid prop.*"size"/));
		});
	});

	describe('color', () => {
		it('sets no inline color when color is omitted, so ancestors can set it', () => {
			expect(svgOf(mount(CheckCircleIcon)).attributes('style')).toBeUndefined();
		});

		it.each([
			['primary', 'var(--rox-primary-color)'],
			['current', 'currentColor'],
		])('sets --rox-icon-svg-color for color="%s"', (color, value) => {
			const svg = svgOf(mount(CheckCircleIcon, { props: { color } }));

			expect(svg.element.style.getPropertyValue('--rox-icon-svg-color')).toBe(value);
		});

		it('merges with a consumer style', () => {
			const svg = svgOf(mount(CheckCircleIcon, { props: { color: 'current' }, attrs: { style: 'opacity: 0.5' } }));

			expect(svg.element.style.getPropertyValue('--rox-icon-svg-color')).toBe('currentColor');
			expect(svg.element.style.opacity).toBe('0.5');
		});

		it('accepts only the supported colors', () => {
			const { validator } = CheckCircleIcon.props.color;

			expect(validator('primary')).toBe(true);
			expect(validator('current')).toBe(true);
			expect(validator('red')).toBe(false);
			expect(validator('toString')).toBe(false);
		});
	});

	describe('attribute fallthrough', () => {
		it('merges a consumer class with the icon classes', () => {
			const svg = svgOf(mount(CheckCircleIcon, { props: { size: 'large' }, attrs: { class: 'my-icon' } }));

			expect(svg.classes()).toEqual(['cnb-icon', 'cnb-icon--large', 'my-icon']);
		});

		it('passes data-* attributes and listeners through to the svg', async () => {
			const onClick = vi.fn();
			const wrapper = mount(CheckCircleIcon, { attrs: { 'data-testid': 'done-icon', onClick } });

			expect(svgOf(wrapper).attributes('data-testid')).toBe('done-icon');
			await svgOf(wrapper).trigger('click');
			expect(onClick).toHaveBeenCalledOnce();
		});
	});
});
