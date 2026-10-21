<script setup>
/**
 * IconRegistry
 *
 * Docs gallery of every Roxbury icon. Each tile shows the icon and its name;
 * clicking a tile copies the path import for that icon, e.g.
 *
 *   import CheckCircleIcon from '@cnodigital/roxbury/rox-icons/check-circle';
 *
 * Imports the whole barrel on purpose: the docs page renders every icon, so
 * tree-shaking doesn't apply here. Consumer apps should use path imports.
 */
import { onBeforeUnmount, ref } from 'vue';
import * as icons from '@cnodigital/roxbury/rox-icons';

const PACKAGE = '@cnodigital/roxbury/rox-icons';
const COPIED_MS = 1500;

/** check-circle → CheckCircleIcon (same rule as build-components.js) */
function toComponentName(name) {
	return `${name
		.split('-')
		.map((part) => part[0].toUpperCase() + part.slice(1))
		.join('')}Icon`;
}

const entries = icons.iconNames.map((name) => {
	const componentName = toComponentName(name);
	return {
		name,
		componentName,
		component: icons[componentName],
		importLine: `import ${componentName} from '${PACKAGE}/${name}';`,
	};
});

if (process.env.NODE_ENV !== 'production') {
	const missing = entries.filter((entry) => !entry.component).map((entry) => entry.name);
	if (missing.length) {
		console.warn(`[IconRegistry] No component exported for: ${missing.join(', ')}`);
	}
}

const copied = ref(null);
const status = ref('');
let resetTimer;

async function copyImport(entry) {
	try {
		await navigator.clipboard.writeText(entry.importLine);
		copied.value = entry.name;
		status.value = `Copied import for ${entry.componentName}`;
	} catch {
		copied.value = null;
		status.value = `Couldn't copy. Import: ${entry.importLine}`;
	}
	clearTimeout(resetTimer);
	resetTimer = setTimeout(() => {
		copied.value = null;
	}, COPIED_MS);
}

onBeforeUnmount(() => clearTimeout(resetTimer));
</script>

<template>
	<div class="icon-registry">
		<p class="icon-registry__count">{{ entries.length }} icons. Click an icon to copy its import.</p>

		<ul class="icon-registry__grid">
			<li v-for="entry in entries" :key="entry.name">
				<button
					type="button"
					class="icon-registry__tile"
					:class="{ 'icon-registry__tile--copied': copied === entry.name }"
					:title="entry.importLine"
					@click="copyImport(entry)"
				>
					<component :is="entry.component" v-if="entry.component" size="large" />
					<span class="icon-registry__name">{{ entry.name }}</span>
					<span class="icon-registry__hint" aria-hidden="true">
						{{ copied === entry.name ? 'Copied!' : entry.componentName }}
					</span>
				</button>
			</li>
		</ul>

		<p class="icon-registry__status" role="status" aria-live="polite">{{ status }}</p>
	</div>
</template>
