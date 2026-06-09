// Pure functions, no side effects, easily unit-tested.
// Mappers are the seam where Plaid's vocabulary stops and CNB's begins.
import type {
  PlaidSuccessMetadata,
  ExchangeRequest,
} from './types';

// Plaid SDK → CNB API
// metadata.accounts can have multiple entries if Account Select is off
// or set to multi. For V1, confirm with backend whether we lock Link to
// single-account selection (recommended) or handle a chosen index here.
export function toExchangeRequest(
  publicToken: string,
  metadata: PlaidSuccessMetadata,
): ExchangeRequest {
  const account = metadata.accounts[0];
  if (!account) {
    throw new Error('Plaid onSuccess returned no accounts');
  }
  return {
    publicToken,
    institutionId: metadata.institution?.institution_id ?? null,
    institutionName: metadata.institution?.name ?? null,
    selectedAccount: {
      plaidAccountId: account.id,
      mask: account.mask,
      type: account.type,
      subtype: account.subtype,
    },
    linkSessionId: metadata.link_session_id,
  };
}
