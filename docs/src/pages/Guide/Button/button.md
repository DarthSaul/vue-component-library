<script setup>
import { Button, ButtonBaseProps, ButtonProps, metaToRows } from '@darthsaul/vue-component-library-ui'
import PropsTableNEW from '@/components/PropsTableNEW.vue'

const propRows = metaToRows({ ...ButtonBaseProps, ...ButtonProps })
</script>

# Button

Triggers an action or event.

## Import

```js
import { Button } from '@darthsaul/vue-component-library'
import '@darthsaul/vue-component-library/css/Button'
```

## Basic usage

<!-- ButtonBasic live example -->

## Props

<PropsTableNEW type="props" :rows="propRows" />

## Events

<PropsTableNEW type="events" :rows="[{ name: 'click', description: 'Emitted when the button is clicked.' }]" />
