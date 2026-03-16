/**
 * @typedef {Object} PropDefinition
 * @property {Function|Function[]} type - Vue prop type constructor(s) (e.g. String, Boolean, Array)
 * @property {*} [default] - Default value for the prop
 * @property {function(*): boolean} [validator] - Returns true if the value is valid
 * @property {string} description - Human-readable description for docs tooling
 * @property {Array<*>} [options] - Enumerated allowed values; used to populate select controls
 * @property {'select'|'boolean'|'text'|'number'} [control] - Control type hint for docs/Storybook
 */

// v-model binding — maps to the implicit modelValue prop + update:modelValue emit
/** @type {Record<string, PropDefinition>} */
export const model = {
  modelValue: {
    type: [String, Number],
    default: '',
    description: 'The bound value — the primary v-model binding.',
  },
}

// Input's own props
/** @type {Record<string, PropDefinition>} */
export const props = {
  label: {
    type: String,
    default: '',
    description: 'Label text rendered above the input field.',
  },
  placeholder: {
    type: String,
    default: '',
    description: 'Placeholder text shown when the field is empty.',
  },
  type: {
    type: String,
    default: 'text',
    validator: (v) => ['text', 'email', 'password', 'number', 'tel', 'url'].includes(v),
    description: 'The native HTML input type.',
    options: ['text', 'email', 'password', 'number', 'tel', 'url'],
    control: 'select',
  },
  disabled: {
    type: Boolean,
    default: false,
    description: 'Disables the input and applies a dimmed visual state.',
  },
  helpText: {
    type: String,
    default: '',
    description: 'Helper text displayed below the input field.',
  },
}
