import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  brandingToSupabaseRow,
  isMissingTableError,
  mapSupabaseAuthError,
  memberToSupabaseRow,
  parseOAuthCallbackParams,
  sanitizeRowId,
  supabaseRowToBranding,
  supabaseRowToMember,
} from './supabasePayloads';
import { Member } from './memberLogic';

const OWNER_UUID = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';

const sampleMember: Member = {
  id: 'mem-42',
  name: '  Rohan Verma  ',
  phone: ' +91 98765 00001 ',
  email: '',
  plan: '3 Months',
  fees: 4000,
  amountPaid: 9999, // exceeds fees; must clamp to 4000
  paymentMode: 'UPI',
  manualStatus: 'active',
  paidDate: '2026-11-01',
  renewalDate: '2027-02-01',
  joinedDate: '2026-11-01',
  notes: '',
};

describe('supabasePayloads', () => {
  it('maps Member to snake_case Supabase row and back cleanly with clamping', () => {
    const row = memberToSupabaseRow(OWNER_UUID, sampleMember);
    assert.equal(row.id, 'mem-42');
    assert.equal(row.owner_id, OWNER_UUID);
    assert.equal(row.name, 'Rohan Verma');
    assert.equal(row.fees, 4000);
    assert.equal(row.amount_paid, 4000);
    assert.equal(row.email, null);
    assert.equal(row.notes, null);
    assert.equal(row.avatar_url, null);

    const parsed = supabaseRowToMember(row as unknown as Record<string, unknown>);
    assert.equal(parsed.id, 'mem-42');
    assert.equal(parsed.name, 'Rohan Verma');
    assert.equal(parsed.amountPaid, 4000);
    assert.equal(parsed.paymentMode, 'UPI');
    assert.equal(parsed.email, undefined);
  });

  it('maps GymBranding to Supabase row and back enforcing 48-char gym_name', () => {
    const row = brandingToSupabaseRow(OWNER_UUID, {
      gymName: 'B'.repeat(70),
      currency: 'USD',
    });
    assert.equal(row.owner_id, OWNER_UUID);
    assert.equal(row.gym_name.length, 48);
    assert.equal(row.currency, 'USD');
    assert.equal(row.logo_url, null);

    const branding = supabaseRowToBranding(row as unknown as Record<string, unknown>);
    assert.equal(branding.gymName.length, 48);
    assert.equal(branding.currency, 'USD');
    assert.equal(branding.logoUrl, undefined);
  });

  it('parses PKCE code and implicit tokens from OAuth callback URLs', () => {
    const pkce = parseOAuthCallbackParams('?code=abc123&state=xyz', '');
    assert.equal(pkce.code, 'abc123');
    assert.equal(pkce.error, null);

    const implicit = parseOAuthCallbackParams('', '#access_token=at1&refresh_token=rt1');
    assert.equal(implicit.accessToken, 'at1');
    assert.equal(implicit.refreshToken, 'rt1');

    const err = parseOAuthCallbackParams('?error=access_denied&error_description=User+canceled', '');
    assert.equal(err.error, 'access_denied');
    assert.equal(err.errorDescription, 'User canceled');
  });

  it('detects missing Postgres/PostgREST tables and maps provider errors cleanly', () => {
    assert.equal(isMissingTableError({ code: 'PGRST205', message: 'Could not find the table' }), true);
    assert.equal(isMissingTableError({ code: '42P01', message: 'relation does not exist' }), true);
    assert.equal(isMissingTableError({ code: '23505', message: 'duplicate key' }), false);

    assert.match(
      mapSupabaseAuthError({ message: 'Unsupported provider: provider is not enabled' }),
      /not enabled yet in your Supabase project/i
    );
    assert.equal(sanitizeRowId('bad id/!'), 'bad-id--');
  });
});
