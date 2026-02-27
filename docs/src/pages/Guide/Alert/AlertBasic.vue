<script setup>
import { Alert } from '@darthsaul/vue-component-library-ui'
</script>

<template>
  <div style="display: flex; flex-direction: column; gap: 1rem;">
    <Alert type="info">This is an info alert.</Alert>
    <Alert type="success">This is a success alert.</Alert>
    <Alert type="warning">This is a warning alert.</Alert>
    <Alert type="error">This is an error alert.</Alert>
  </div>
</template>
