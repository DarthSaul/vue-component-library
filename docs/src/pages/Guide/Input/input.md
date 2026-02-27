<script setup>
import { Input, InputBase } from '@darthsaul/vue-component-library-ui'
import PropsTable from '@/components/PropsTable.vue'
</script>

# Input

A flexible text field with label, placeholder, type, disabled state, and help text. `InputBase` is a minimal v-model wrapper for when you only need label + value binding.

## Import

```js
import { Input, InputBase } from '@darthsaul/vue-component-library'
import '@darthsaul/vue-component-library/css/Input'
```

## Basic usage

<!-- InputBasic live example -->

## Props — InputBase

<PropsTable :component="InputBase" />

## Props — Input

<PropsTable :component="Input" />
