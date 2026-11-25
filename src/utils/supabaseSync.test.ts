import test from 'node:test';
import assert from 'node:assert/strict';
import {
  brandingToDbRow,
  dbRowToBranding,
  dbRowToMember,
  getUserDisplayInfo,
  getUserStorageKeys,
  isMissingTableError,
  memberToDbRow,
  normalizeSupabaseUrl,
  sanitizeAuthError,
} from './supabaseSync';
import type { Member } from './memberLogic';

test('normalizeSupabaseUrl strips accidental /rest/v1/ and trailing slashes', () => {
  assert.equal(
    normalizeSupabaseUrl('https://yvgbpkmgkcixzrsuouwq.supabase.co/rest/v1/'),
    'https://yvgbpkmgkcixzrsuouwq.supabase.co'
  );
  assert.equal(
    normalizeSupabaseUrl('https://yvgbpkmgkcixzrsuouwq.supabase.co/auth/v1'),
    'https://yvgbpkmgkcixzrsuouwq.supabase.co'
  );
  assert.equal(
    normalizeSupabaseUrl('  https://yvgbpkmgkcixzrsuouwq.supabase.co/  '),
    'https://yvgbpkmgkcixzrsuouwq.supabase.co'
  );
  assert.equal(normalizeSupabaseUrl(''), '');
});

const sampleMember: Member = {
  id: 'mem-101',
  name: 'Rohan Mehta',
  phone: '+91 98765 43210',
  email: 'rohan@example.com',
  plan: '3 Months',
  fees: 4000,
  amountPaid: 2500,
  paymentMode: 'UPI',
  manualStatus: 'active',
  paidDate: '2026-11-01',
  renewalDate: '2027-02-01',
  joinedDate: '2026-08-01',
  notes: 'Morning strength batch',
};

test('getUserStorageKeys isolates different user IDs strictly', () => {
  const userA = getUserStorageKeys('user-aaa-111');
  const userB = getUserStorageKeys('user-bbb-222');
  assert.notEqual(userA.membersKey, userB.membersKey);
  assert.notEqual(userA.brandingKey, userB.brandingKey);
  assert.match(userA.membersKey, /user-aaa-111$/);
  assert.throws(() => getUserStorageKeys('   '));
});

test('memberToDbRow and dbRowToMember round-trip cleanly with user_id binding', () => {
  const row = memberToDbRow(sampleMember, 'uid-owner-1');
  assert.equal(row.user_id, 'uid-owner-1');
  assert.equal(row.amount_paid, 2500);
  assert.equal(row.payment_mode, 'UPI');
  assert.equal(row.paid_date, '2026-11-01');
  assert.equal(row.renewal_date, '2027-02-01');

  const restored = dbRowToMember(row as unknown as Record<string, unknown>);
  assert.equal(restored.id, sampleMember.id);
  assert.equal(restored.name, sampleMember.name);
  assert.equal(restored.fees, 4000);
  assert.equal(restored.amountPaid, 2500);
  assert.equal(restored.paymentMode, 'UPI');
  assert.equal(restored.plan, '3 Months');
  assert.equal(restored.notes, 'Morning strength batch');
});

test('brandingToDbRow and dbRowToBranding round-trip with currency and logo', () => {
  const row = brandingToDbRow(
    {
      gymName: 'Apex Barbell Club',
      currency: 'USD',
      logoUrl: 'https://example.com/logo.png',
    },
    'uid-owner-2'
  );
  assert.equal(row.user_id, 'uid-owner-2');
  assert.equal(row.gym_name, 'Apex Barbell Club');
  assert.equal(row.currency, 'USD');

  const restored = dbRowToBranding(row as unknown as Record<string, unknown>);
  assert.equal(restored.gymName, 'Apex Barbell Club');
  assert.equal(restored.currency, 'USD');
  assert.equal(restored.logoUrl, 'https://example.com/logo.png');
});

test('isMissingTableError detects missing PostgreSQL / PostgREST tables only', () => {
  assert.equal(isMissingTableError({ code: '42P01', message: 'relation "public.members" does not exist' }), true);
  assert.equal(isMissingTableError({ code: 'PGRST205', message: "Could not find the table 'public.members'" }), true);
  assert.equal(isMissingTableError({ code: '23505', message: 'duplicate key value' }), false);
  assert.equal(isMissingTableError(null), false);
});

test('sanitizeAuthError returns clean user-facing messages without raw internals', () => {
  assert.match(
    sanitizeAuthError({ message: 'Unsupported provider: provider is not enabled' }),
    /Google sign-in is not enabled/i
  );
  assert.match(
    sanitizeAuthError({ message: 'Invalid redirect_uri_mismatch' }),
    /URL Configuration/i
  );
  assert.doesNotMatch(
    sanitizeAuthError({ message: 'SQLSTATE 42000 stack trace at pg_auth' }),
    /SQLSTATE/i
  );
});

test('getUserDisplayInfo extracts name, safe https avatar, and initials', () => {
  const info = getUserDisplayInfo({
    id: 'uid-1',
    email: 'anirudh@ironpulse.in',
    user_metadata: {
      full_name: 'Anirudh Sharma',
      avatar_url: 'https://lh3.googleusercontent.com/a/photo',
    },
  });
  assert.equal(info.displayName, 'Anirudh Sharma');
  assert.equal(info.email, 'anirudh@ironpulse.in');
  assert.equal(info.initials, 'AS');
  assert.equal(info.avatarUrl, 'https://lh3.googleusercontent.com/a/photo');

  const unsafeAvatar = getUserDisplayInfo({
    id: 'uid-2',
    email: 'coach@gym.com',
    user_metadata: {
      avatar_url: 'javascript:alert(1)',
    },
  });
  assert.equal(unsafeAvatar.avatarUrl, undefined);
  assert.equal(unsafeAvatar.displayName, 'coach');
});
