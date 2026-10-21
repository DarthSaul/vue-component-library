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
import { computed, onBeforeUnmount, ref } from 'vue';
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
		// Matched against the query: "check circle" finds checkmark-circle-filled.
		searchText: `${name} ${componentName}`.toLowerCase(),
	};
});

const query = ref('');

// Every word of the query must appear somewhere in the name, in any order.
const filtered = computed(() => {
	const words = query.value.toLowerCase().split(/[\s-]+/).filter(Boolean);
	if (!words.length) return entries;
	return entries.filter((entry) => words.every((word) => entry.searchText.includes(word)));
});

const countText = computed(() => {
	if (!query.value.trim()) return `${entries.length} icons. Click an icon to copy its import.`;
	const n = filtered.value.length;
	return `${n} of ${entries.length} icons match "${query.value.trim()}".`;
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
		<div class="icon-registry__search">
			<label for="icon-registry-search">Search icons</label>
			<input
				id="icon-registry-search"
				v-model="query"
				type="search"
				placeholder="e.g. check, bell, arrow"
				autocomplete="off"
				spellcheck="false"
			/>
		</div>

		<p class="icon-registry__count" aria-live="polite">{{ countText }}</p>

		<p v-if="!filtered.length" class="icon-registry__empty">
			No icons match. Try a shorter or different word.
		</p>

		<ul v-else class="icon-registry__grid">
			<li v-for="entry in filtered" :key="entry.name">
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
