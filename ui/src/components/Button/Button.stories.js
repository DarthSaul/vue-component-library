import Button from './Button.vue'
import { baseProps, props } from './Button.meta.js'
import { metaToArgTypes } from '../../utils/metaToArgTypes.js'

const allProps = { ...baseProps, ...props }

export default {
  component: Button,
  argTypes: metaToArgTypes(allProps),
}

export const Default = {
  args: {
    variant: 'primary', size: 'md', disabled: false,
    outline: false, loading: false,
  },
}
