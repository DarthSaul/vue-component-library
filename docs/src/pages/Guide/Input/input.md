<script setup>
import { Input, InputModel, InputProps, metaToRows } from '@darthsaul/vue-component-library-ui'
import PropsTableNEW from '@/components/PropsTableNEW.vue'

const propRows = metaToRows({ ...InputModel, ...InputProps })
</script>

# Input

A flexible text field with label, placeholder, type, disabled state, and help text.

## Import

```js
import { Input } from '@darthsaul/vue-component-library'
import '@darthsaul/vue-component-library/css/Input'
```

## Basic usage

<!-- InputBasic live example -->

## Props

<PropsTableNEW type="props" :rows="propRows" />

## Events

<PropsTableNEW type="events" :rows="[{ name: 'update:modelValue', description: 'Emitted when the input value changes. Consumed automatically by v-model.' }]" />
