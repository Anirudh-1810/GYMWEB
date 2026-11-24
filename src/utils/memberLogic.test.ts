import test from 'node:test';
import assert from 'node:assert/strict';
import {
  Member,
  addMonthsToIsoDate,
  buildMailtoUrl,
  buildWhatsAppUrl,
  calculateRenewalFromPaidDate,
  computeDashboardMetrics,
  computeMemberStatus,
  computeRenewalProgress,
  extendRenewalDate,
  filterAndSortMembers,
  formatCurrency,
  formatRelativeRenewal,
  getDaysUntilRenewal,
  getMemberInitials,
  getPlanCycleDays,
  getPlanMonths,
  migrateStoredMember,
  normalizeMembershipPlan,
  validateMemberInput,
} from './memberLogic';

const REF_DATE = new Date(2026, 10, 21); // Nov 21, 2026

const SAMPLE_MEMBERS: Member[] = [
  {
    id: '1',
    name: 'Marcus Reyes',
    phone: '+1 310 555 0142',
    email: 'marcus@gym.io',
    plan: '12 Months',
    fees: 12000,
    manualStatus: 'active',
    paidDate: '2025-11-24',
    renewalDate: '2026-11-24', // +3 days -> expiring_soon
    joinedDate: '2025-11-24',
  },
  {
    id: '2',
    name: 'Darius Cole',
    phone: '+1 213 555 0194',
    email: 'darius@gym.io',
    plan: '1 Month',
    fees: 1500,
    manualStatus: 'active',
    paidDate: '2026-10-17',
    renewalDate: '2026-11-17', // -4 days -> expired
    joinedDate: '2026-06-17',
  },
  {
    id: '3',
    name: 'Hannah Lindqvist',
    phone: '+1 310 555 0167',
    plan: '3 Months',
    fees: 4000,
    manualStatus: 'active',
    paidDate: '2026-11-15',
    renewalDate: '2027-02-15', // +86 days -> active (no email)
    joinedDate: '2026-08-15',
  },
  {
    id: '4',
    name: 'Nadia Al-Mansoor',
    phone: '+1 213 555 0155',
    email: 'nadia@gym.io',
    plan: '1 Month',
    fees: 1000,
    manualStatus: 'paused',
    paidDate: '2026-10-10',
    renewalDate: '2026-11-10', // past date, but manually paused -> paused
    joinedDate: '2026-05-10',
  },
];

test('plan helpers map 1/2/3/6/12 month plans and compute due date from paid date', () => {
  assert.equal(getPlanMonths('1 Month'), 1);
  assert.equal(getPlanMonths('2 Months'), 2);
  assert.equal(getPlanMonths('3 Months'), 3);
  assert.equal(getPlanMonths('6 Months'), 6);
  assert.equal(getPlanMonths('12 Months'), 12);

  assert.equal(calculateRenewalFromPaidDate('2026-11-24', '1 Month'), '2026-12-24');
  assert.equal(calculateRenewalFromPaidDate('2026-11-24', '2 Months'), '2027-01-24');
  assert.equal(calculateRenewalFromPaidDate('2026-11-24', '3 Months'), '2027-02-24');
  assert.equal(calculateRenewalFromPaidDate('2026-11-24', '6 Months'), '2027-05-24');
  assert.equal(calculateRenewalFromPaidDate('2026-11-24', '12 Months'), '2027-11-24');
  // Month-end clamping
  assert.equal(addMonthsToIsoDate('2027-01-31', 1), '2027-02-28');

  assert.equal(normalizeMembershipPlan('Annual Pro'), '12 Months');
  assert.equal(normalizeMembershipPlan('Quarterly Flex'), '3 Months');
  assert.equal(normalizeMembershipPlan('6m'), '6 Months');
  assert.equal(normalizeMembershipPlan('2 Months'), '2 Months');
  assert.equal(normalizeMembershipPlan('Monthly Unlimited'), '1 Month');

  assert.equal(formatCurrency(1000), '₹1,000');
  assert.equal(formatCurrency(1500), '₹1,500');
});

test('getDaysUntilRenewal calculates exact local calendar day deltas', () => {
  assert.equal(getDaysUntilRenewal('2026-11-21', REF_DATE), 0);
  assert.equal(getDaysUntilRenewal('2026-11-24', REF_DATE), 3);
  assert.equal(getDaysUntilRenewal('2026-11-17', REF_DATE), -4);
});

test('computeMemberStatus classifies active, expiring_soon, expired, and paused accurately', () => {
  assert.equal(computeMemberStatus(SAMPLE_MEMBERS[0], REF_DATE), 'expiring_soon');
  assert.equal(computeMemberStatus(SAMPLE_MEMBERS[1], REF_DATE), 'expired');
  assert.equal(computeMemberStatus(SAMPLE_MEMBERS[2], REF_DATE), 'active');
  assert.equal(computeMemberStatus(SAMPLE_MEMBERS[3], REF_DATE), 'paused');

  assert.equal(
    computeMemberStatus({ renewalDate: '2026-11-28', manualStatus: 'active' }, REF_DATE),
    'expiring_soon'
  );
  assert.equal(
    computeMemberStatus({ renewalDate: '2026-11-29', manualStatus: 'active' }, REF_DATE),
    'active'
  );
});

test('computeDashboardMetrics aggregates counts and active standing rate', () => {
  const metrics = computeDashboardMetrics(SAMPLE_MEMBERS, REF_DATE);
  assert.equal(metrics.total, 4);
  assert.equal(metrics.active, 1);
  assert.equal(metrics.expiringSoon, 1);
  assert.equal(metrics.expired, 1);
  assert.equal(metrics.paused, 1);
  assert.equal(metrics.activeStanding, 2);
  assert.equal(metrics.activeRate, 50);
});

test('filterAndSortMembers filters by name/email/plan/phone/fees and sorts cleanly', () => {
  const byName = filterAndSortMembers(
    SAMPLE_MEMBERS,
    { query: 'marcus', statusFilter: 'all', sortBy: 'renewal_soonest' },
    REF_DATE
  );
  assert.equal(byName.length, 1);
  assert.equal(byName[0].id, '1');

  const byFees = filterAndSortMembers(
    SAMPLE_MEMBERS,
    { query: '1500', statusFilter: 'all', sortBy: 'renewal_soonest' },
    REF_DATE
  );
  assert.equal(byFees.length, 1);
  assert.equal(byFees[0].id, '2');

  const sortedSoonest = filterAndSortMembers(
    SAMPLE_MEMBERS,
    { query: '', statusFilter: 'all', sortBy: 'renewal_soonest' },
    REF_DATE
  );
  assert.deepEqual(
    sortedSoonest.map((m) => m.id),
    ['2', '1', '3', '4']
  );
});

test('validateMemberInput requires name/phone/fees/paidDate and treats email as optional', () => {
  const emptyResult = validateMemberInput({
    name: '',
    phone: '',
    email: '',
    plan: '1 Month',
    fees: 0,
    manualStatus: 'active',
    paidDate: '',
  });
  assert.equal(emptyResult.valid, false);
  assert.ok(emptyResult.errors.name);
  assert.ok(emptyResult.errors.phone);
  assert.equal(emptyResult.errors.email, undefined); // email is optional!
  assert.ok(emptyResult.errors.fees);
  assert.ok(emptyResult.errors.paidDate);

  // Blank email is valid when other required fields are valid
  const validNoEmail = validateMemberInput({
    name: 'Rohan Verma',
    phone: '+91 98765 43210',
    email: '',
    plan: '1 Month',
    fees: 1000,
    manualStatus: 'active',
    paidDate: '2026-11-24',
  });
  assert.equal(validNoEmail.valid, true);
  assert.deepEqual(validNoEmail.errors, {});

  // Non-empty invalid email is rejected
  const invalidEmail = validateMemberInput({
    name: 'Elena Vance',
    phone: '+1 555 890 1234',
    email: 'not-an-email',
    plan: '12 Months',
    fees: 1500,
    manualStatus: 'active',
    paidDate: '2026-11-24',
  });
  assert.equal(invalidEmail.valid, false);
  assert.ok(invalidEmail.errors.email);
});

test('buildWhatsAppUrl and buildMailtoUrl sanitize and encode properly', () => {
  const wa = buildWhatsAppUrl('+1 (310) 555-0142', 'Hey Marcus, renew today!');
  assert.equal(
    wa,
    'https://wa.me/13105550142?text=Hey%20Marcus%2C%20renew%20today!'
  );

  const mail = buildMailtoUrl(
    'marcus@gym.io',
    'Renewal Reminder',
    'See you at 6 AM!'
  );
  assert.equal(
    mail,
    'mailto:marcus@gym.io?subject=Renewal%20Reminder&body=See%20you%20at%206%20AM%21'
  );
});

test('extendRenewalDate extends from current date if expired, or from renewalDate if active', () => {
  assert.equal(extendRenewalDate('2026-11-10', 1, REF_DATE), '2026-12-21');
  assert.equal(extendRenewalDate('2026-12-15', 3, REF_DATE), '2027-03-15');
  assert.equal(extendRenewalDate('2027-01-31', 1, REF_DATE), '2027-02-28');
});

test('formatRelativeRenewal and getMemberInitials produce clean copy', () => {
  assert.equal(formatRelativeRenewal('2026-11-21', 'expiring_soon', REF_DATE), 'Due today');
  assert.equal(formatRelativeRenewal('2026-11-17', 'expired', REF_DATE), '4 days overdue');
  assert.equal(formatRelativeRenewal('2026-11-17', 'paused', REF_DATE), 'Membership on hold');
  assert.equal(getMemberInitials('Marcus Reyes'), 'MR');
  assert.equal(getMemberInitials('Sienna'), 'SI');
});

test('computeRenewalProgress fills toward 100% as payment date approaches', () => {
  assert.equal(getPlanCycleDays('1 Month'), 30);
  assert.equal(getPlanCycleDays('2 Months'), 60);
  assert.equal(getPlanCycleDays('3 Months'), 90);
  assert.equal(getPlanCycleDays('6 Months'), 180);
  assert.equal(getPlanCycleDays('12 Months'), 365);

  assert.equal(
    computeRenewalProgress(
      { plan: '1 Month', renewalDate: '2026-11-21', manualStatus: 'active' },
      REF_DATE
    ),
    100
  );
  assert.equal(
    computeRenewalProgress(
      { plan: '1 Month', renewalDate: '2026-11-24', manualStatus: 'active' },
      REF_DATE
    ),
    90
  );
  assert.equal(
    computeRenewalProgress(
      { plan: '1 Month', renewalDate: '2026-12-18', manualStatus: 'active' },
      REF_DATE
    ),
    10
  );
});

test('migrateStoredMember cleanly upgrades legacy localStorage records', () => {
  const migrated = migrateStoredMember({
    id: 'old-1',
    name: 'Legacy Client',
    phone: '+1 555 000 1111',
    email: '',
    plan: 'Quarterly Flex',
    manualStatus: 'active',
    renewalDate: '2027-02-24',
  });
  assert.equal(migrated.plan, '3 Months');
  assert.equal(migrated.paidDate, '2026-11-24');
  assert.equal(migrated.fees, 4000);
  assert.equal(migrated.email, undefined);
});
