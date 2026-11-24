import {
  Member,
  addMonthsToIsoDate,
  toIsoDateString,
} from '../utils/memberLogic';

function offsetIsoDate(daysOffset: number, baseDate: Date = new Date()): string {
  const date = new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    baseDate.getDate() + daysOffset
  );
  return toIsoDateString(date);
}

/**
 * Generates deterministic, realistic initial gym members anchored to the current date
 * so Active, Expiring Soon, Expired, and Paused views are immediately useful on first load,
 * showcasing 1/2/3/6/12 Month plans, custom fees (e.g. ₹1,000 and ₹1,500), and optional emails.
 */
export function createSeedMembers(referenceDate: Date = new Date()): Member[] {
  const makeDates = (daysUntilDue: number, planMonths: number) => {
    const renewalDate = offsetIsoDate(daysUntilDue, referenceDate);
    const paidDate = addMonthsToIsoDate(renewalDate, -planMonths);
    return { paidDate, renewalDate };
  };

  const m101 = makeDates(2, 12);
  const m102 = makeDates(5, 3);
  const m103 = makeDates(-4, 1);
  const m104 = makeDates(148, 6);
  const m105 = makeDates(34, 2);
  const m106 = makeDates(-11, 1);
  const m107 = makeDates(92, 12);
  const m108 = makeDates(21, 3);
  const m109 = makeDates(0, 1);
  const m110 = makeDates(26, 2);

  return [
    {
      id: 'mem-101',
      name: 'Marcus Reyes',
      phone: '+1 310 555 0142',
      email: 'marcus.reyes@ironmail.co',
      plan: '12 Months',
      fees: 12000,
      manualStatus: 'active',
      paidDate: m101.paidDate,
      renewalDate: m101.renewalDate,
      joinedDate: m101.paidDate,
      avatarUrl: '/src/assets/images/avatar_marcus_reyes_1795282114059.jpg',
      notes: '6 AM strength crew · prefers barbell programming',
    },
    {
      id: 'mem-102',
      name: 'Priya Nair',
      phone: '+1 415 555 0189',
      email: 'priya.nair@gmail.com',
      plan: '3 Months',
      fees: 4000,
      manualStatus: 'active',
      paidDate: m102.paidDate,
      renewalDate: m102.renewalDate,
      joinedDate: m102.paidDate,
      avatarUrl: '/src/assets/images/avatar_priya_nair_1795282115730.jpg',
      notes: 'Trains Tue/Thu with Coach Devon',
    },
    {
      id: 'mem-103',
      name: 'Darius Cole',
      phone: '+1 213 555 0194',
      email: 'darius.cole@outlook.com',
      plan: '1 Month',
      fees: 1500,
      manualStatus: 'active',
      paidDate: m103.paidDate,
      renewalDate: m103.renewalDate,
      joinedDate: offsetIsoDate(-124, referenceDate),
      avatarUrl: '/src/assets/images/avatar_darius_cole_1795282120022.jpg',
      notes: 'Asked about switching to 3 Months plan',
    },
    {
      id: 'mem-104',
      name: 'Hannah Lindqvist',
      phone: '+1 310 555 0167',
      email: 'hannah.lind@proton.me',
      plan: '6 Months',
      fees: 7000,
      manualStatus: 'active',
      paidDate: m104.paidDate,
      renewalDate: m104.renewalDate,
      joinedDate: offsetIsoDate(-217, referenceDate),
      notes: 'Marathon prep block',
    },
    {
      id: 'mem-105',
      name: 'Mateo Silva',
      phone: '+1 323 555 0118',
      plan: '2 Months',
      fees: 2800,
      manualStatus: 'active',
      paidDate: m105.paidDate,
      renewalDate: m105.renewalDate,
      joinedDate: m105.paidDate,
      notes: 'Evening conditioning classes',
    },
    {
      id: 'mem-106',
      name: 'Chloe Brooks',
      phone: '+1 424 555 0173',
      email: 'chloe.brooks@gmail.com',
      plan: '1 Month',
      fees: 1000,
      manualStatus: 'active',
      paidDate: m106.paidDate,
      renewalDate: m106.renewalDate,
      joinedDate: offsetIsoDate(-191, referenceDate),
      avatarUrl: '/src/assets/images/avatar_chloe_brooks_1795282135907.jpg',
      notes: 'Missed last payment reminder',
    },
    {
      id: 'mem-107',
      name: 'Kenji Takahashi',
      phone: '+1 310 555 0131',
      email: 'kenji.takahashi@fastmail.com',
      plan: '12 Months',
      fees: 14000,
      manualStatus: 'active',
      paidDate: m107.paidDate,
      renewalDate: m107.renewalDate,
      joinedDate: m107.paidDate,
      notes: 'Powerlifting platform regular',
    },
    {
      id: 'mem-108',
      name: 'Nadia Al-Mansoor',
      phone: '+1 213 555 0155',
      email: 'nadia.almansoor@gmail.com',
      plan: '3 Months',
      fees: 3500,
      manualStatus: 'paused',
      paidDate: m108.paidDate,
      renewalDate: m108.renewalDate,
      joinedDate: offsetIsoDate(-140, referenceDate),
      notes: 'Traveling abroad until next month',
    },
    {
      id: 'mem-109',
      name: 'Jordan Patel',
      phone: '+1 415 555 0126',
      plan: '1 Month',
      fees: 1500,
      manualStatus: 'active',
      paidDate: m109.paidDate,
      renewalDate: m109.renewalDate,
      joinedDate: m109.paidDate,
      avatarUrl: '/src/assets/images/avatar_jordan_patel_1795282113745.jpg',
      notes: 'First-month renewal due today',
    },
    {
      id: 'mem-110',
      name: 'Sienna Morales',
      phone: '+1 323 555 0180',
      email: 'sienna.morales@gmail.com',
      plan: '2 Months',
      fees: 2500,
      manualStatus: 'active',
      paidDate: m110.paidDate,
      renewalDate: m110.renewalDate,
      joinedDate: m110.paidDate,
      notes: 'Post-rehab mobility & strength',
    },
  ];
}
