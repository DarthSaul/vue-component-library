import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import Modal from '../ext-accounts-results-modal.vue';
import { copyForAccountRejection } from '../../rejectionUI';

const ACCOUNT_LEVEL_REASONS = [
  'DUPLICATE_ACCOUNT',
  'DUPLICATE_AWAITING_VERIFICATION',
  'DUPLICATE_VERIFICATION_IN_PROGRESS',
  'UNSUPPORTED_ACCOUNT_TYPE',
  'UNKNOWN',
];

function linkedResult(institutionName, accountMask, plaidAccountId = 'plaid_1') {
  return {
    plaidAccountId,
    outcome: 'linked',
    account: { plaidAccountId, institutionName, accountMask },
  };
}

function rejectedResult(reason, plaidAccountId = 'plaid_x') {
  return { plaidAccountId, outcome: 'rejected', reason, message: 'raw backend message' };
}

describe('ext-accounts-results-modal — linked section', () => {
  it('renders institution and mask for each linked result', () => {
    const wrapper = mount(Modal, {
      props: {
        linked: [
          linkedResult('Wells Fargo', '4321', 'plaid_1'),
          linkedResult('Chase', '8899', 'plaid_2'),
        ],
        rejected: [],
      },
    });

    expect(wrapper.text()).toContain('Linked successfully');
    expect(wrapper.text()).toContain('Wells Fargo');
    expect(wrapper.text()).toContain('4321');
    expect(wrapper.text()).toContain('Chase');
    expect(wrapper.text()).toContain('8899');
  });

  it('hides the linked section when there are no linked results', () => {
    const wrapper = mount(Modal, {
      props: { linked: [], rejected: [rejectedResult('UNKNOWN')] },
    });

    expect(wrapper.text()).not.toContain('Linked successfully');
  });
});

describe('ext-accounts-results-modal — rejected section', () => {
  it.each(ACCOUNT_LEVEL_REASONS)(
    'renders the mapped title AND body for reason %s',
    (reason) => {
      const wrapper = mount(Modal, {
        props: { linked: [], rejected: [rejectedResult(reason)] },
      });
      const copy = copyForAccountRejection(reason);

      expect(wrapper.text()).toContain("Couldn't be connected");
      expect(wrapper.text()).toContain(copy.title);
      expect(wrapper.text()).toContain(copy.body);
      // The raw backend message is never shown — copy comes from the map.
      expect(wrapper.text()).not.toContain('raw backend message');
    },
  );

  it('hides the rejected section when there are no rejected results', () => {
    const wrapper = mount(Modal, {
      props: { linked: [linkedResult('Wells Fargo', '4321')], rejected: [] },
    });

    expect(wrapper.text()).not.toContain("Couldn't be connected");
  });
});

describe('ext-accounts-results-modal — dismissal', () => {
  it('emits close when the footer button is clicked', async () => {
    const wrapper = mount(Modal, {
      props: { linked: [linkedResult('Wells Fargo', '4321')], rejected: [] },
    });

    await wrapper.find('button').trigger('click');

    expect(wrapper.emitted('close')).toBeTruthy();
  });
});
