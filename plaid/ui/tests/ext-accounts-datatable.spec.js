import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import Datatable from '../ext-accounts-datatable.vue';

const ACCOUNTS = [
  {
    id: 'acc_1',
    institutionId: 'ins_wf',
    institutionName: 'Wells Fargo',
    plaidAccountId: 'plaid_1',
    accountMask: '4321',
    accountType: 'checking',
    status: 'active',
    linkedAt: '2026-04-12T14:22:00Z',
  },
];

function mountWith(props) {
  return mount(Datatable, {
    props: { accounts: [], loading: false, error: null, ...props },
  });
}

describe('ext-accounts-datatable — states', () => {
  it('renders a loading state and no table while loading', () => {
    const wrapper = mountWith({ loading: true });

    expect(wrapper.text()).toContain('Loading');
    expect(wrapper.find('.ds-datatable').exists()).toBe(false);
  });

  it('renders the error message and no table on error', () => {
    const wrapper = mountWith({ error: 'Could not load accounts' });

    expect(wrapper.text()).toContain('Could not load accounts');
    expect(wrapper.find('.ds-datatable').exists()).toBe(false);
  });

  it('renders an empty state and no table when there are no accounts', () => {
    const wrapper = mountWith({ accounts: [] });

    expect(wrapper.text()).toContain('No external accounts');
    expect(wrapper.find('.ds-datatable').exists()).toBe(false);
  });

  it('renders the table and no loading/empty text when populated', () => {
    const wrapper = mountWith({ accounts: ACCOUNTS });

    expect(wrapper.find('.ds-datatable').exists()).toBe(true);
    expect(wrapper.text()).not.toContain('Loading');
    expect(wrapper.text()).not.toContain('No external accounts');
  });
});

describe('ext-accounts-datatable — populated rows', () => {
  it('shows the institution name and masked account number', () => {
    const wrapper = mountWith({ accounts: ACCOUNTS });

    expect(wrapper.text()).toContain('Wells Fargo');
    expect(wrapper.text()).toContain('4321');
  });

  it('renders the status via the chip', () => {
    const wrapper = mountWith({ accounts: ACCOUNTS });

    const chip = wrapper.find('.ds-chip');
    expect(chip.exists()).toBe(true);
    expect(chip.text()).toBe('Active');
  });
});
