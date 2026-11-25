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
  computeRevenueSummary,
  extendRenewalDate,
  filterAndSortMembers,
  formatCurrency,
  formatRelativeRenewal,
  getDaysUntilRenewal,
  getMemberBalanceDue,
  getMemberInitials,
  getMessageTemplates,
  getPlanCycleDays,
  getPlanMonths,
  migrateStoredMember,
  normalizeMembershipPlan,
  normalizePaymentMode,
  recordQuickPayment,
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
    amountPaid: 12000,
    paymentMode: 'Card',
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
    amountPaid: 1000, // 500 balance due
    paymentMode: 'Cash',
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
    amountPaid: 3000, // 1000 balance due, paid in Nov 2026
    paymentMode: 'UPI',
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
    amountPaid: 1000,
    paymentMode: 'UPI',
    manualStatus: 'paused',
    paidDate: '2026-11-05', // paid in Nov 2026
    renewalDate: '2026-11-10', // past date, but manually paused -> paused
    joinedDate: '2026-05-10',
  },
];

test('plan and payment mode helpers normalize and calculate due dates cleanly', () => {
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
  assert.equal(addMonthsToIsoDate('2027-01-31', 1), '2027-02-28');

  assert.equal(normalizeMembershipPlan('Annual Pro'), '12 Months');
  assert.equal(normalizeMembershipPlan('Quarterly Flex'), '3 Months');
  assert.equal(normalizeMembershipPlan('6m'), '6 Months');
  assert.equal(normalizePaymentMode('cash'), 'Cash');
  assert.equal(normalizePaymentMode('Credit Card'), 'Card');
  assert.equal(normalizePaymentMode('gpay'), 'UPI');

  assert.equal(formatCurrency(1000, 'INR'), '₹1,000');
  assert.equal(formatCurrency(1500, 'USD'), '$1,500');
});

test('computeRevenueSummary aggregates monthly collected, pending/overdue, plan breakdown, and payment modes', () => {
  const rev = computeRevenueSummary(SAMPLE_MEMBERS, REF_DATE);
  assert.equal(rev.monthLabel, 'Nov 2026');
  // Paid in Nov 2026: Hannah (3000) + Nadia (1000) = 4000
  assert.equal(rev.monthlyCollected, 4000);
  assert.equal(rev.monthlyPaymentsCount, 2);
  // Total collected across all members: 12000 + 1000 + 3000 + 1000 = 17000
  assert.equal(rev.totalCollectedAll, 17000);
  // Partial balances due: Darius (500) + Hannah (1000) = 1500
  assert.equal(rev.balanceDueTotal, 1500);
  assert.equal(rev.balanceDueCount, 2);
  // Overdue renewals: Darius (expired, fee 1500)
  assert.equal(rev.overdueRenewalTotal, 1500);
  assert.equal(rev.overdueRenewalCount, 1);
  assert.equal(rev.pendingAndOverdueTotal, 3000);

  // Breakdown by plan has all 5 durations
  assert.equal(rev.byPlan.length, 5);
  const oneMonth = rev.byPlan.find((p) => p.plan === '1 Month')!;
  assert.equal(oneMonth.memberCount, 2);
  assert.equal(oneMonth.collected, 2000);
  assert.equal(oneMonth.balanceDue, 500);

  const twelveMonth = rev.byPlan.find((p) => p.plan === '12 Months')!;
  assert.equal(twelveMonth.memberCount, 1);
  assert.equal(twelveMonth.collected, 12000);

  // Breakdown by payment mode has Cash, UPI, Card
  assert.equal(rev.byPaymentMode.length, 3);
  assert.equal(rev.byPaymentMode.find((m) => m.mode === 'Cash')!.collected, 1000);
  assert.equal(rev.byPaymentMode.find((m) => m.mode === 'UPI')!.collected, 4000);
  assert.equal(rev.byPaymentMode.find((m) => m.mode === 'Card')!.collected, 12000);
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

test('filterAndSortMembers filters by balanceOnly, paymentMode, fees, and search query', () => {
  const withBalance = filterAndSortMembers(
    SAMPLE_MEMBERS,
    { query: '', statusFilter: 'all', sortBy: 'renewal_soonest', balanceOnly: true },
    REF_DATE
  );
  assert.deepEqual(
    withBalance.map((m) => m.id),
    ['2', '3']
  );

  const cashOnly = filterAndSortMembers(
    SAMPLE_MEMBERS,
    { query: '', statusFilter: 'all', sortBy: 'renewal_soonest', paymentModeFilter: 'Cash' },
    REF_DATE
  );
  assert.equal(cashOnly.length, 1);
  assert.equal(cashOnly[0].id, '2');

  assert.equal(getMemberBalanceDue(SAMPLE_MEMBERS[1]), 500);
  assert.equal(getMemberBalanceDue(SAMPLE_MEMBERS[0]), 0);
});

test('validateMemberInput validates partial amountPaid bounds and treats email as optional', () => {
  const overpaid = validateMemberInput({
    name: 'Rohan Verma',
    phone: '+91 98765 43210',
    email: '',
    plan: '1 Month',
    fees: 1000,
    amountPaid: 1200,
    paymentMode: 'Cash',
    manualStatus: 'active',
    paidDate: '2026-11-24',
  });
  assert.equal(overpaid.valid, false);
  assert.ok(overpaid.errors.amountPaid);

  const partialValid = validateMemberInput({
    name: 'Rohan Verma',
    phone: '+91 98765 43210',
    email: '',
    plan: '3 Months',
    fees: 3500,
    amountPaid: 2000,
    paymentMode: 'UPI',
    manualStatus: 'active',
    paidDate: '2026-11-24',
  });
  assert.equal(partialValid.valid, true);
  assert.deepEqual(partialValid.errors, {});
});

test('getMessageTemplates includes balance reminder and respects custom gym name & currency', () => {
  const templates = getMessageTemplates(
    SAMPLE_MEMBERS[1],
    'expired',
    REF_DATE,
    { gymName: 'Titan Gym', currency: 'USD' }
  );
  assert.equal(templates[0].id, 'balance');
  assert.ok(templates[0].body.includes('$500'));
  assert.ok(templates[0].body.includes('Titan Gym'));
});

test('buildWhatsAppUrl, buildMailtoUrl, extendRenewalDate, formatRelativeRenewal, and renewal progress work cleanly', () => {
  assert.equal(
    buildWhatsAppUrl('+1 (310) 555-0142', 'Hi'),
    'https://wa.me/13105550142?text=Hi'
  );
  assert.equal(
    buildMailtoUrl('marcus@gym.io', 'Hi', 'Body'),
    'mailto:marcus@gym.io?subject=Hi&body=Body'
  );
  assert.equal(extendRenewalDate('2026-11-10', 1, REF_DATE), '2026-12-21');
  assert.equal(formatRelativeRenewal('2026-11-21', 'expiring_soon', REF_DATE), 'Due today');
  assert.equal(getMemberInitials('Marcus Reyes'), 'MR');
  assert.equal(getPlanCycleDays('6 Months'), 180);
  assert.equal(
    computeRenewalProgress(
      { plan: '1 Month', renewalDate: '2026-11-21', manualStatus: 'active' },
      REF_DATE
    ),
    100
  );
});

test('migrateStoredMember cleanly upgrades legacy localStorage records with paymentMode and amountPaid', () => {
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
  assert.equal(migrated.amountPaid, 4000);
  assert.equal(migrated.paymentMode, 'UPI');
  assert.equal(migrated.email, undefined);
});

test('recordQuickPayment resets expired or active cycle, clears balance, and sorts funds by Cash/UPI', () => {
  // Expired member with partial balance (due Nov 16, ref date Nov 21) -> paid via UPI (+1 month)
  const renewedExpired = recordQuickPayment(SAMPLE_MEMBERS[1], 'UPI', 1, REF_DATE);
  assert.equal(renewedExpired.paidDate, '2026-11-21');
  assert.equal(renewedExpired.renewalDate, '2026-12-21');
  assert.equal(renewedExpired.paymentMode, 'UPI');
  assert.equal(renewedExpired.amountPaid, renewedExpired.fees);
  assert.equal(renewedExpired.manualStatus, 'active');
  assert.equal(getMemberBalanceDue(renewedExpired), 0);
  assert.equal(computeMemberStatus(renewedExpired, REF_DATE), 'active');

  // Active member (due Feb 15, 2027, 3 Months plan) -> paid via Cash (default plan cycle = +3 months)
  const renewedActive = recordQuickPayment(SAMPLE_MEMBERS[2], 'Cash', undefined, REF_DATE);
  assert.equal(renewedActive.paidDate, '2026-11-21');
  assert.equal(renewedActive.renewalDate, '2027-05-15');
  assert.equal(renewedActive.paymentMode, 'Cash');
  assert.equal(renewedActive.amountPaid, renewedActive.fees);

  // Verify funds sort into Cash and UPI buckets cleanly in computeRevenueSummary
  const summary = computeRevenueSummary([renewedExpired, renewedActive], REF_DATE);
  const cashMode = summary.byPaymentMode.find((m) => m.mode === 'Cash');
  const upiMode = summary.byPaymentMode.find((m) => m.mode === 'UPI');
  assert.equal(cashMode?.collected, 4000);
  assert.equal(upiMode?.collected, 1500);
});
