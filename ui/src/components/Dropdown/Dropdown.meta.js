/**
 * @typedef {Object} PropDefinition
 * @property {Function|Function[]} type - Vue prop type constructor(s) (e.g. String, Boolean, Array)
 * @property {*} [default] - Default value for the prop
 * @property {function(*): boolean} [validator] - Returns true if the value is valid
 * @property {string} description - Human-readable description for docs tooling
 * @property {Array<*>} [options] - Enumerated allowed values; used to populate select controls
 * @property {'select'|'boolean'|'text'|'number'} [control] - Control type hint for docs/Storybook
 */

// DropdownBase's props — primitive trigger + menu behavior
/** @type {Record<string, PropDefinition>} */
export const baseProps = {
  options: {
    type: Array,
    default: () => [],
    description: 'Array of option objects, each with a `label` (String) and `value` (any) property.',
  },
  modelValue: {
    type: [String, Number],
    default: null,
    description: 'The currently selected value (v-model binding).',
  },
  placeholder: {
    type: String,
    default: 'Select an option',
    description: 'Placeholder text shown when no option is selected.',
  },
  disabled: {
    type: Boolean,
    default: false,
    description: 'Disables the dropdown trigger and prevents interaction.',
  },
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md', 'lg'].includes(v),
    description: 'Controls the size of the dropdown trigger.',
    options: ['sm', 'md', 'lg'],
    control: 'select',
  },
}

// Dropdown wrapper's own props — compositional/behavioral concerns
/** @type {Record<string, PropDefinition>} */
export const props = {
  label: {
    type: String,
    default: '',
    description: 'Label text rendered above the dropdown.',
  },
  helpText: {
    type: String,
    default: '',
    description: 'Helper text displayed below the dropdown.',
  },
  searchable: {
    type: Boolean,
    default: false,
    description: 'When true, the trigger becomes a text input that filters options (combobox pattern).',
  },
  clearable: {
    type: Boolean,
    default: false,
    description: 'When true, renders a clear button to reset the selection.',
  },
  value: {
    type: [String, Number],
    default: undefined,
    description: 'Legacy v-model:value binding for Vue 2 migration compatibility.',
  },
}
