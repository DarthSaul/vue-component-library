// .figmaexportrc.js
import svgstore from '@figma-export/output-components-as-svgstore';
import transformSvg from '@figma-export/transform-svg-with-svgo';

export default {
	commands: [
		[
			'components',
			{
				fileId: 'your-figma-file-id',
				onlyFromPages: ['Icons'],
				transformers: [
					transformSvg({
						plugins: [
							{
								name: 'preset-default',
							},
							{
								name: 'convertColors',
								params: {
									currentColor: true,
								},
							},
						],
					}),
				],
				outputters: [
					svgstore({
						output: './dist',
						getIconId: ({
							componentName,
						}) => {
							const kebab =
								componentName
									.replace(
										/([a-z0-9])([A-Z])/g,
										'$1-$2',
									)
									.replace(
										/([A-Z]+)([A-Z][a-z])/g,
										'$1-$2',
									)
									.toLowerCase();
							return `icon-${kebab}`;
						},
					}),
				],
			},
		],
	],
};
