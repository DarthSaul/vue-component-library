<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  entries: {
    type: Object,
    default: () => ({}),
  },
  emptyMessage: {
    type: String,
    default: 'No entries found.',
  },
  showTemplateUses: {
    type: Boolean,
    default: false,
  },
});

const search = ref('');
const expandedRows = ref(new Set());

const rows = computed(() => {
  return Object.entries(props.entries ?? {})
    .filter(([name]) =>
      name.toLowerCase().includes(search.value.toLowerCase()),
    )
    .map(([name, usage]) => ({ name, ...usage }));
});

function toggleRow(name) {
  if (expandedRows.value.has(name)) {
    expandedRows.value.delete(name);
  } else {
    expandedRows.value.add(name);
  }
}
</script>

<template>
  <div class="usage-table-wrapper">
    <div class="table-toolbar">
      <input
        v-model="search"
        class="search-input"
        type="search"
        placeholder="Filter by name..."
        aria-label="Filter entries"
      />
      <span class="table-count">{{ rows.length }} entries</span>
    </div>

    <p v-if="rows.length === 0" class="empty-message">
      {{ search ? 'No matches.' : emptyMessage }}
    </p>

    <table v-else class="usage-table">
      <thead>
        <tr>
          <th class="col-name">Name</th>
          <th class="col-count">Imports</th>
          <th v-if="showTemplateUses" class="col-count">Uses</th>
          <th class="col-files">Files</th>
        </tr>
      </thead>
      <tbody>
        <template v-for="row in rows" :key="row.name">
          <tr
            class="row-summary"
            :class="{ 'row-summary--expanded': expandedRows.has(row.name) }"
            @click="toggleRow(row.name)"
          >
            <td class="col-name">
              <span class="expand-indicator" aria-hidden="true">
                {{ expandedRows.has(row.name) ? '▾' : '▸' }}
              </span>
              {{ row.name }}
            </td>
            <td class="col-count">{{ row.count }}</td>
            <td v-if="showTemplateUses" class="col-count col-uses">{{ row.templateUses ?? 0 }}</td>
            <td class="col-files">{{ row.files.length }} file{{ row.files.length !== 1 ? 's' : '' }}</td>
          </tr>
          <tr v-if="expandedRows.has(row.name)" class="row-detail">
            <td :colspan="showTemplateUses ? 4 : 3">
              <ul class="file-list">
                <li v-for="file in row.files" :key="file.path + file.localName" class="file-item">
                  <code class="file-path">{{ file.path }}</code>
                  <span v-if="file.localName !== row.name" class="file-alias">
                    as <code>{{ file.localName }}</code>
                  </span>
                  <span v-if="showTemplateUses && file.templateUses > 0" class="file-uses">
                    used {{ file.templateUses }}×
                  </span>
                </li>
              </ul>
            </td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>
