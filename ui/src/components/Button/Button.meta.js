// ButtonBase's props — primitive styling + native behavior
export const baseProps = {
  type: {
    type: String,
    default: 'button',
    validator: (v) => ['button', 'submit', 'reset'].includes(v),
    description: 'The native HTML button type attribute.',
    options: ['button', 'submit', 'reset'],
    control: 'select',
  },
  variant: {
    type: String,
    default: 'primary',
    validator: (v) => ['primary', 'secondary', 'tertiary'].includes(v),
    description: 'Controls the visual style of the button.',
    options: ['primary', 'secondary', 'tertiary'],
    control: 'select',
  },
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md', 'lg'].includes(v),
    description: 'Controls the size of the button.',
    options: ['sm', 'md', 'lg'],
    control: 'select',
  },
  disabled: {
    type: Boolean,
    default: false,
    description: 'Disables interaction and applies a dimmed visual state.',
  },
}

// Button wrapper's own props — compositional/behavioral concerns
export const props = {
  outline: {
    type: Boolean,
    default: false,
    description: 'Renders the button with an outline style instead of filled.',
  },
  loading: {
    type: Boolean,
    default: false,
    description: 'Shows a loading indicator and disables interaction.',
  },
  router: {
    type: Boolean,
    default: false,
    description: 'When true, renders as a <router-link> instead of a native button.',
  },
  link: {
    type: String,
    default: '',
    description: 'The URL or route path to navigate to (used with router=true).',
  },
  chevron: {
    type: String,
    default: '',
    validator: (v) => ['', 'start', 'end'].includes(v),
    description: 'Adds a chevron icon at the specified position.',
    options: ['', 'start', 'end'],
    control: 'select',
  },
}
