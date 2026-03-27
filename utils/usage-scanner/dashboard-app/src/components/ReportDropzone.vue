<script setup>
import { ref } from 'vue';

const emit = defineEmits(['report-loaded', 'error']);

const isDragging = ref(false);

function handleDragOver(e) {
  e.preventDefault();
  isDragging.value = true;
}

function handleDragLeave() {
  isDragging.value = false;
}

function handleDrop(e) {
  e.preventDefault();
  isDragging.value = false;
  const file = e.dataTransfer.files[0];
  if (file) loadFile(file);
}

function handleFileInput(e) {
  const file = e.target.files[0];
  if (file) loadFile(file);
}

function loadFile(file) {
  if (!file.name.endsWith('.json')) {
    emit('error', 'Please load a JSON report file.');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      validateReport(data);
      emit('report-loaded', data);
    } catch (err) {
      emit('error', `Invalid report: ${err.message}`);
    }
  };
  reader.readAsText(file);
}

function validateReport(data) {
  if (!data.repoName || !data.packageName || !data.summary) {
    throw new Error('Missing required fields (repoName, packageName, summary).');
  }
}
</script>

<template>
  <div
    class="dropzone"
    :class="{ 'dropzone--active': isDragging }"
    @dragover="handleDragOver"
    @dragleave="handleDragLeave"
    @drop="handleDrop"
  >
    <div class="dropzone-inner">
      <div class="dropzone-icon" aria-hidden="true">JSON</div>
      <p class="dropzone-label">Drop a scan report here</p>
      <p class="dropzone-hint">or</p>
      <label class="btn-browse">
        Browse file
        <input
          type="file"
          accept=".json"
          class="visually-hidden"
          @change="handleFileInput"
        />
      </label>
    </div>
  </div>
</template>
