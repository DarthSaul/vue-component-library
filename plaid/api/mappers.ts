// Pure functions, no side effects, easily unit-tested. Mappers are the
// seam where the backend's wire vocabulary (snake_case `*Dto` shapes)
// stops and the app's domain vocabulary begins. This is the ONLY place
// a `*Dto` is allowed to be read outside of api.ts and the mocks.
import type {
  PlaidSuccessMetadata,
  ExchangeRequest,
  ExternalTransferAccountDto,
  LinkedAccount,
  AccountResultDto,
  AccountResult,
} from '../types';

// Plaid SDK → wire request.
// Maps ALL selected accounts — Plaid can return more than one per Link
// session. Throws on empty, which should be impossible: onSuccess only
// fires once the user has selected at least one account.
export function toExchangeRequest(
  publicToken: string,
  metadata: PlaidSuccessMetadata,
): ExchangeRequest {
  if (metadata.accounts.length === 0) {
    throw new Error('Plaid onSuccess returned no accounts');
  }
  return {
    publicToken,
    institutionId: metadata.institution?.institution_id ?? null,
    institutionName: metadata.institution?.name ?? null,
    selectedAccounts: metadata.accounts.map((account) => ({
      plaidAccountId: account.id,
      mask: account.mask,
      type: account.type,
      subtype: account.subtype,
    })),
    linkSessionId: metadata.link_session_id,
  };
}

// Wire DTO → domain. Field-by-field on purpose: if the backend renames
// or drops a field, this stops compiling instead of silently producing
// a half-populated LinkedAccount.
export function fromExternalTransferAccountDto(
  dto: ExternalTransferAccountDto,
): LinkedAccount {
  return {
    id: dto.id,
    institutionId: dto.institution_id,
    institutionName: dto.institution_name,
    plaidAccountId: dto.plaid_account_id,
    accountMask: dto.account_number_suffix,
    accountType: dto.account_type,
    status: dto.current_status,
    linkedAt: dto.linked_at,
  };
}

export function fromExternalTransferAccountDtoList(
  dtos: ExternalTransferAccountDto[],
): LinkedAccount[] {
  return dtos.map(fromExternalTransferAccountDto);
}

// Wire DTO → domain, per-account result. Every branch is constructed
// EXPLICITLY field-by-field — no `return dto` pass-through, no `as`
// assertions — so any drift between the wire and domain unions produces
// a compile error here rather than leaking a DTO into the UI.
export function fromAccountResultDto(dto: AccountResultDto): AccountResult {
  switch (dto.outcome) {
    case 'linked':
      return {
        plaidAccountId: dto.plaidAccountId,
        outcome: 'linked',
        account: fromExternalTransferAccountDto(dto.account),
      };
    case 'pending':
      return {
        plaidAccountId: dto.plaidAccountId,
        outcome: 'pending',
        verificationId: dto.verificationId,
      };
    case 'rejected':
      return {
        plaidAccountId: dto.plaidAccountId,
        outcome: 'rejected',
        reason: dto.reason,
        message: dto.message,
      };
  }
}
