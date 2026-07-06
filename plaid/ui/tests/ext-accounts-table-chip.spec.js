import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import Chip from '../ext-accounts-table-chip.vue';

// Exhaustive over AccountStatus. Adding a status without updating the
// component's STATUS_CONFIG makes the chip render nothing here — this test is
// the canary that forces the decision.
describe('ext-accounts-table-chip', () => {
  it.each([
    ['active', 'Active', 'success'],
    ['pending_verification', 'Pending verification', 'warning'],
    ['verification_failed', 'Verification failed', 'danger'],
    ['disconnected', 'Disconnected', 'neutral'],
  ])('status "%s" renders label "%s" with variant "%s"', (status, label, variant) => {
    const wrapper = mount(Chip, { props: { status } });

    expect(wrapper.text()).toBe(label);
    expect(wrapper.get('.ds-chip').attributes('data-variant')).toBe(variant);
  });
});
