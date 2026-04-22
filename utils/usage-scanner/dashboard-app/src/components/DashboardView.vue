<script setup>
import SummaryCards from './SummaryCards.vue';
import UsageTable from './UsageTable.vue';

const props = defineProps({
  report: {
    type: Object,
    required: true,
  },
});
</script>

<template>
  <div class="dashboard">
    <div class="dashboard-meta">
      <div class="meta-item">
        <span class="meta-label">Repo</span>
        <span class="meta-value">{{ report.repoName }}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Package</span>
        <span class="meta-value meta-value--mono">{{ report.packageName }}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Scanned</span>
        <span class="meta-value">{{ new Date(report.scannedAt).toLocaleString() }}</span>
      </div>
    </div>

    <SummaryCards :summary="report.summary" />

    <section class="dashboard-section">
      <h2 class="section-title">Components</h2>
      <UsageTable :entries="report.components" empty-message="No components found." />
    </section>

    <section class="dashboard-section">
      <h2 class="section-title">Icons</h2>
      <UsageTable :entries="report.icons" empty-message="No icons found." />
    </section>
  </div>
</template>
