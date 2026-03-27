<script setup>
defineProps({
  reports: {
    type: Array,
    required: true,
  },
  activeIndex: {
    type: Number,
    required: true,
  },
});

defineEmits(['select']);
</script>

<template>
  <nav class="project-tabs" role="tablist">
    <button
      v-for="(report, i) in reports"
      :key="report.repoName"
      role="tab"
      class="project-tab"
      :class="{ 'project-tab--active': i === activeIndex }"
      :aria-selected="i === activeIndex"
      @click="$emit('select', i)"
    >
      {{ report.repoName }}
    </button>
  </nav>
</template>
