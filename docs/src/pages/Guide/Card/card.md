<script setup>
import { Card } from '@darthsaul/vue-component-library-ui'
import PropsTable from '@/components/PropsTable.vue'
</script>

# Card

A surface for grouping related content.

## Import

```js
import { CnbCard } from '@darthsaul/vue-component-library'
import '@darthsaul/vue-component-library/css/Card'
```

## Basic usage

<!-- CardBasic live example -->

## Props

<PropsTable :component="Card" />

## Slots

| Slot | Description |
|------|-------------|
| `header` | Card header area |
| `default` | Card body content |
| `footer` | Card footer area |
