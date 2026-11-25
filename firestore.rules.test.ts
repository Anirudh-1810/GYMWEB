import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const rulesSource = readFileSync(resolve(process.cwd(), 'firestore.rules'), 'utf8');
const blueprint = JSON.parse(
  readFileSync(resolve(process.cwd(), 'firebase-blueprint.json'), 'utf8')
) as {
  entities: Record<string, { required: string[]; properties: Record<string, unknown> }>;
};

describe('firestore.rules security invariants (Dirty Dozen static contract)', () => {
  it('enforces Pillar 4.1 default-deny catch-all at root', () => {
    assert.match(rulesSource, /match \/\{document=\*\*\}\s*\{\s*allow read, write: if false;\s*\}/);
  });

  it('enforces verified Google auth and strict email anti-spoofing on user profiles', () => {
    assert.match(rulesSource, /request\.auth\.token\.email_verified == true/);
    assert.match(rulesSource, /data\.email == request\.auth\.token\.email/);
    assert.match(rulesSource, /match \/users\/\{userId\}[\s\S]*?allow list: if false;/);
  });

  it('enforces Pillar 2 strict allow-listing (hasAll + hasOnly) matching blueprint required fields', () => {
    for (const [entityName, entity] of Object.entries(blueprint.entities)) {
      for (const field of entity.required) {
        assert.ok(
          rulesSource.includes(`'${field}'`),
          `Expected required field '${field}' of ${entityName} to be validated in firestore.rules`
        );
      }
    }
    const hasAllMatches = rulesSource.match(/\.keys\(\)\.hasAll\(/g) ?? [];
    const hasOnlyMatches = rulesSource.match(/\.keys\(\)\.hasOnly\(/g) ?? [];
    assert.equal(hasAllMatches.length, 3, 'All 3 entities must enforce keys().hasAll(...)');
    assert.equal(hasOnlyMatches.length, 3, 'All 3 entities must enforce keys().hasOnly(...)');
  });

  it('blocks shadow updates, server-time spoofing, and orphaned writes on subcollections', () => {
    assert.match(rulesSource, /incoming\(\)\.createdAt == request\.time/);
    assert.match(rulesSource, /incoming\(\)\.updatedAt == request\.time/);
    assert.match(rulesSource, /incoming\(\)\.createdAt == existing\(\)\.createdAt/);
    assert.match(rulesSource, /ownerProfileExists\(userId\)/);
  });

  it('validates numeric bounds (0 <= amountPaid <= fees) and enum whitelists', () => {
    assert.match(rulesSource, /data\.fees > 0/);
    assert.match(rulesSource, /data\.amountPaid >= 0/);
    assert.match(rulesSource, /data\.amountPaid <= data\.fees/);
    assert.match(rulesSource, /data\.paymentMode in \['Cash', 'UPI', 'Card'\]/);
    assert.match(
      rulesSource,
      /data\.plan in \['1 Month', '2 Months', '3 Months', '6 Months', '12 Months'\]/
    );
  });

  it('enforces Pillar 8 owner-scoped list query on members without get/exists inside allow list', () => {
    const listLineMatch = rulesSource.match(/match \/members\/\{memberId\}[\s\S]*?(allow list:[^;]+;)/);
    assert.ok(listLineMatch, 'Expected allow list rule on /members/{memberId}');
    const listRule = listLineMatch[1];
    assert.match(listRule, /isOwner\(userId\)/);
    assert.match(listRule, /resource\.data\.ownerId == request\.auth\.uid/);
    assert.doesNotMatch(listRule, /exists\(|get\(/);
  });
});
