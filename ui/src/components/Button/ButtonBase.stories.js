import ButtonBase from './ButtonBase.vue'
import { baseProps } from './Button.meta.js'
import { metaToArgTypes } from '../../utils/metaToArgTypes.js'

export default {
  component: ButtonBase,
  argTypes: metaToArgTypes(baseProps),
}

export const Default = {
  args: { type: 'button', variant: 'primary', size: 'md', disabled: false },
}
