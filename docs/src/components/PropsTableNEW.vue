<script setup>
defineProps({
  type: {
    type: String,
    required: true,
    validator: (v) => ['props', 'slots', 'events'].includes(v),
  },
  rows: {
    type: Array,
    required: true,
  },
})
</script>

<template>
  <table class="props-table-new">
    <thead>
      <tr v-if="type === 'props'">
        <th>Name</th><th>Type</th><th>Default</th><th>Options</th><th>Description</th>
      </tr>
      <tr v-else>
        <th>Name</th><th>Description</th>
      </tr>
    </thead>
    <tbody>
      <template v-if="type === 'props'">
        <tr v-for="row in rows" :key="row.name">
          <td><code>{{ row.name }}</code></td>
          <td><code>{{ row.type ?? '—' }}</code></td>
          <td><code>{{ row.default ?? '—' }}</code></td>
          <td>{{ row.options?.length ? row.options.join(', ') : '—' }}</td>
          <td>{{ row.description ?? '' }}</td>
        </tr>
      </template>
      <template v-else>
        <tr v-for="row in rows" :key="row.name">
          <td><code>{{ row.name }}</code></td>
          <td>{{ row.description ?? '' }}</td>
        </tr>
      </template>
    </tbody>
  </table>
</template>
