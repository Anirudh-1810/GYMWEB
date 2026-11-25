import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildBrandingCreatePayload,
  buildBrandingUpdatePayload,
  buildMemberCreatePayload,
  buildMemberMessagedUpdatePayload,
  buildMemberQuickPayUpdatePayload,
  buildMemberUpdatePayload,
  buildUserProfileCreatePayload,
  buildUserProfileUpdatePayload,
  mapAuthErrorToMessage,
  sanitizeDocumentId,
} from './firestorePayloads';
import { Member } from './memberLogic';

const SERVER_TS = { __token: 'serverTimestamp' };
const DELETE_FIELD = { __token: 'deleteField' };

const sampleMember: Member = {
  id: 'mem-101',
  name: '  Aarav Sharma  ',
  phone: ' +91 98765 43210 ',
  email: '',
  plan: '1 Month',
  fees: 1500,
  amountPaid: 1000,
  paymentMode: 'UPI',
  manualStatus: 'active',
  paidDate: '2026-11-01',
  renewalDate: '2026-12-01',
  joinedDate: '2026-11-01',
  notes: '',
};

describe('firestorePayloads', () => {
  it('omits optional empty fields on user profile create and uses deleteField on update', () => {
    const created = buildUserProfileCreatePayload(
      {
        uid: 'owner_abc123',
        displayName: 'Anirudh Sharma',
        email: 'anirudh@example.com',
        photoURL: '',
      },
      SERVER_TS
    );
    assert.equal(created.uid, 'owner_abc123');
    assert.equal(created.displayName, 'Anirudh Sharma');
    assert.equal(created.email, 'anirudh@example.com');
    assert.equal('photoURL' in created, false);
    assert.equal(created.createdAt, SERVER_TS);
    assert.equal(created.updatedAt, SERVER_TS);

    const updated = buildUserProfileUpdatePayload(
      {
        uid: 'owner_abc123',
        displayName: 'Anirudh Sharma',
        email: 'anirudh@example.com',
        photoURL: null,
      },
      SERVER_TS,
      DELETE_FIELD
    );
    assert.equal(updated.photoURL, DELETE_FIELD);
    assert.equal('uid' in updated, false);
    assert.equal('createdAt' in updated, false);
  });

  it('builds branding create/update payloads respecting 48-char limit and optional logo deletion', () => {
    const created = buildBrandingCreatePayload(
      'owner_1',
      {
        gymName: 'A'.repeat(80),
        currency: 'USD',
      },
      SERVER_TS
    );
    assert.equal((created.gymName as string).length, 48);
    assert.equal(created.currency, 'USD');
    assert.equal('logoUrl' in created, false);

    const updated = buildBrandingUpdatePayload(
      {
        gymName: 'Titan Gym',
        currency: 'INR',
      },
      SERVER_TS,
      DELETE_FIELD
    );
    assert.equal(updated.gymName, 'Titan Gym');
    assert.equal(updated.logoUrl, DELETE_FIELD);
    assert.equal('ownerId' in updated, false);
  });

  it('sanitizes member create payload and clamps amountPaid <= fees while omitting empty optionals', () => {
    const created = buildMemberCreatePayload(
      'owner_1',
      {
        ...sampleMember,
        fees: 1500,
        amountPaid: 5000, // exceeds fees; must clamp to 1500
      },
      SERVER_TS
    );
    assert.equal(created.id, 'mem-101');
    assert.equal(created.ownerId, 'owner_1');
    assert.equal(created.name, 'Aarav Sharma');
    assert.equal(created.fees, 1500);
    assert.equal(created.amountPaid, 1500);
    assert.equal('email' in created, false);
    assert.equal('notes' in created, false);
    assert.equal('avatarUrl' in created, false);
    assert.equal('lastMessagedAt' in created, false);
  });

  it('builds action-specific member update payloads without immutable keys', () => {
    const fullUpdate = buildMemberUpdatePayload(sampleMember, SERVER_TS, DELETE_FIELD);
    assert.equal('id' in fullUpdate, false);
    assert.equal('ownerId' in fullUpdate, false);
    assert.equal('createdAt' in fullUpdate, false);
    assert.equal(fullUpdate.email, DELETE_FIELD);
    assert.equal(fullUpdate.notes, DELETE_FIELD);

    const quickPay = buildMemberQuickPayUpdatePayload(
      {
        paidDate: '2026-11-25',
        renewalDate: '2026-12-25',
        paymentMode: 'Cash',
        amountPaid: 1500,
        fees: 1500,
        manualStatus: 'active',
      },
      SERVER_TS
    );
    assert.deepEqual(Object.keys(quickPay).sort(), [
      'amountPaid',
      'manualStatus',
      'paidDate',
      'paymentMode',
      'renewalDate',
      'updatedAt',
    ]);

    const messaged = buildMemberMessagedUpdatePayload('2026-11-25T10:00:00.000Z', SERVER_TS);
    assert.deepEqual(Object.keys(messaged).sort(), ['lastMessagedAt', 'updatedAt']);
  });

  it('sanitizes unsafe document IDs and maps Firebase Auth errors to clear guidance', () => {
    assert.equal(sanitizeDocumentId('mem 123/bad!'), 'mem-123-bad-');
    assert.match(
      mapAuthErrorToMessage({ code: 'auth/popup-blocked' }),
      /blocked the Google sign-in popup/i
    );
    assert.match(
      mapAuthErrorToMessage({ code: 'auth/popup-closed-by-user' }),
      /closed before completing/i
    );
  });
});
