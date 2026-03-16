<script setup>
import { computed } from 'vue'
import componentMeta from 'virtual:component-meta'

const props = defineProps({
  component: { type: Object, required: true },
})

const meta = computed(() => componentMeta[props.component.__name] ?? {})
const propsList = computed(() => meta.value.props?.filter(p => !p.global) ?? [])
const eventsList = computed(() => meta.value.events ?? [])
const slotsList = computed(() => meta.value.slots ?? [])
</script>

<template>
  <div class="props-table">
    <table v-if="propsList.length">
      <thead>
        <tr>
          <th>Prop</th>
          <th>Type</th>
          <th>Default</th>
          <th>Description</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="prop in propsList" :key="prop.name">
          <td><code>{{ prop.name }}</code></td>
          <td><code>{{ prop.type?.text ?? '—' }}</code></td>
          <td><code>{{ prop.default ?? '—' }}</code></td>
          <td>{{ prop.description ?? '' }}</td>
        </tr>
      </tbody>
    </table>

    <template v-if="eventsList.length">
      <h3>Events</h3>
      <table>
        <thead>
          <tr>
            <th>Event</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="event in eventsList" :key="event.name">
            <td><code>{{ event.name }}</code></td>
            <td>{{ event.description ?? '' }}</td>
          </tr>
        </tbody>
      </table>
    </template>

    <template v-if="slotsList.length">
      <h3>Slots</h3>
      <table>
        <thead>
          <tr>
            <th>Slot</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="slot in slotsList" :key="slot.name">
            <td><code>{{ slot.name }}</code></td>
            <td>{{ slot.description ?? '' }}</td>
          </tr>
        </tbody>
      </table>
    </template>
  </div>
</template>
