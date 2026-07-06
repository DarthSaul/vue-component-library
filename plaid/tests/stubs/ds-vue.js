// Test-only stand-in for the `@ds/vue` design-system package (not installed
// in this reference repo). Aliased in vitest.config.js. Each stub renders the
// minimum real DOM needed to assert on user-visible output; tests that care
// about toasts vi.mock('@ds/vue') to replace useDsToast with spies.
import { defineComponent, h } from 'vue';

export const DsButton = defineComponent({
  name: 'DsButton',
  props: { disabled: { type: Boolean, default: false } },
  emits: ['click'],
  setup(props, { slots, emit }) {
    return () =>
      h(
        'button',
        {
          disabled: props.disabled,
          onClick: (e) => emit('click', e),
        },
        slots.default?.(),
      );
  },
});

export const DsModal = defineComponent({
  name: 'DsModal',
  emits: ['close'],
  setup(_props, { slots }) {
    return () =>
      h('div', { class: 'ds-modal', role: 'dialog' }, [
        h('div', { class: 'ds-modal__header' }, slots.header?.()),
        h('div', { class: 'ds-modal__body' }, slots.body?.()),
        h('div', { class: 'ds-modal__footer' }, slots.footer?.()),
      ]);
  },
});

// Renders rows through the column config, honoring `#cell:<key>` scoped slots
// exactly like the real datatable would, so tests assert on the cell output
// the component actually produces.
export const DsDatatable = defineComponent({
  name: 'DsDatatable',
  props: {
    columns: { type: Array, required: true },
    rows: { type: Array, required: true },
  },
  setup(props, { slots }) {
    return () =>
      h('table', { class: 'ds-datatable' }, [
        h(
          'tbody',
          props.rows.map((row, rowIndex) =>
            h(
              'tr',
              { key: rowIndex },
              props.columns.map((col) => {
                const slot = slots[`cell:${col.key}`];
                return h(
                  'td',
                  { key: col.key, 'data-col': col.key },
                  slot ? slot({ row }) : String(row[col.key] ?? ''),
                );
              }),
            ),
          ),
        ),
      ]);
  },
});

export const DsChip = defineComponent({
  name: 'DsChip',
  props: { variant: { type: String, default: 'neutral' } },
  setup(props, { slots }) {
    return () =>
      h(
        'span',
        { class: 'ds-chip', 'data-variant': props.variant },
        slots.default?.(),
      );
  },
});

export const DsToast = defineComponent({
  name: 'DsToast',
  setup: () => () => h('div', { class: 'ds-toast' }),
});

// Real fallback so components that call it outside a mock don't crash. Tests
// that assert on toast behavior replace this via vi.mock('@ds/vue').
export function useDsToast() {
  return {
    success: () => '',
    danger: () => '',
    dismiss: () => {},
  };
}
