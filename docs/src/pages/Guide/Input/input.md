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

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `modelValue` | `String \| Number` | `''` | Bound value (v-model) |
| `label` | `String` | `''` | Label text; hidden when empty |

## Props — Input

Inherits all `InputBase` props plus:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `placeholder` | `String` | `''` | Native input placeholder |
| `type` | `String` | `'text'` | Input type: `text`, `email`, `password`, `number`, `tel`, `url` |
| `disabled` | `Boolean` | `false` | Makes the field non-interactive |
| `helpText` | `String` | `''` | Helper text displayed below the input |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `update:modelValue` | `String` | Emitted on every keystroke |
