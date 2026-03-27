<script setup>
import { ref, onMounted } from 'vue';
import ProjectTabs from './components/ProjectTabs.vue';
import DashboardView from './components/DashboardView.vue';

const reports = ref([]);
const activeIndex = ref(0);
const error = ref(null);
const loading = ref(true);

onMounted(async () => {
  try {
    const manifestRes = await fetch('/report-data/manifest.json');
    if (!manifestRes.ok) throw new Error('Could not load manifest.json');
    const filenames = await manifestRes.json();

    if (filenames.length === 0) {
      error.value = 'No reports found in manifest.json. Run npm run build-manifest after adding report files.';
      return;
    }

    const results = await Promise.all(
      filenames.map(async (filename) => {
        const res = await fetch(`/report-data/${filename}`);
        if (!res.ok) throw new Error(`Could not load ${filename}: ${res.status}`);
        return res.json();
      }),
    );

    reports.value = results;
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="app">
    <header class="app-header">
      <h1 class="app-title">Usage Scanner Dashboard</h1>
    </header>

    <main class="app-main">
      <p v-if="loading" class="status-message">Loading reports...</p>
      <p v-else-if="error" class="error-message">{{ error }}</p>
      <template v-else>
        <ProjectTabs
          :reports="reports"
          :active-index="activeIndex"
          @select="activeIndex = $event"
        />
        <DashboardView :report="reports[activeIndex]" />
      </template>
    </main>
  </div>
</template>
