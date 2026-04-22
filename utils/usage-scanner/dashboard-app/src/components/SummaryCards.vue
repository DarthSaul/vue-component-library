<script setup>
defineProps({
  summary: {
    type: Object,
    required: true,
  },
});
</script>

<template>
  <div class="summary-cards">
    <div class="card">
      <span class="card-value">{{ summary.uniqueComponents }}</span>
      <span class="card-label">Unique Components</span>
    </div>
    <div class="card">
      <span class="card-value">{{ summary.totalComponentImports }}</span>
      <span class="card-label">Component Imports</span>
    </div>
    <div class="card">
      <span class="card-value">{{ summary.uniqueIcons }}</span>
      <span class="card-label">Unique Icons</span>
    </div>
    <div class="card">
      <span class="card-value">{{ summary.totalIconImports }}</span>
      <span class="card-label">Icon Imports</span>
    </div>
  </div>
</template>
