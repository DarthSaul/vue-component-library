<script setup>
import { ref } from 'vue'
import { Input } from '@darthsaul/vue-component-library-ui'

const value = ref('')
</script>

<template>
  <div style="display: flex; flex-direction: column; gap: 1.5rem; max-width: 24rem;">
    <Input
      v-model="value"
      label="Name"
      placeholder="Enter your name"
      help-text="This is a help text example."
    />
    <Input
      label="Email"
      type="email"
      placeholder="you@example.com"
    />
    <Input
      label="Password"
      type="password"
      placeholder="••••••••"
    />
    <Input
      label="Disabled field"
      model-value="Cannot edit this"
      disabled
    />
    <p style="font-size: 0.875rem; color: #6c757d;">Bound value: {{ value }}</p>
  </div>
</template>
