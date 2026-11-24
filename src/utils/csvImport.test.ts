import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSampleMembersCsv,
  normalizeCsvDate,
  parseCsvFee,
  parseCsvMatrix,
  parseMembersCsv,
} from './csvImport';

test('parseCsvMatrix handles quoted commas, escaped quotes, BOM, and CRLF', () => {
  const raw =
    '\uFEFFName,Phone,Notes\r\n"Smith, Alex",+1 555 123 4567,"Prefers ""heavy"" squats, mornings"\r\n\r\nSam Lee,+1 555 987 6543,Evening crew';
  const matrix = parseCsvMatrix(raw);
  assert.equal(matrix.length, 3);
  assert.deepEqual(matrix[0], ['Name', 'Phone', 'Notes']);
  assert.deepEqual(matrix[1], [
    'Smith, Alex',
    '+1 555 123 4567',
    'Prefers "heavy" squats, mornings',
  ]);
  assert.deepEqual(matrix[2], ['Sam Lee', '+1 555 987 6543', 'Evening crew']);
});

test('normalizeCsvDate and parseCsvFee parse dates and currency safely', () => {
  assert.equal(normalizeCsvDate('2026-12-15'), '2026-12-15');
  assert.equal(normalizeCsvDate('2026/12/5'), '2026-12-05');
  assert.equal(normalizeCsvDate('1/9/2027'), '2027-01-09');
  assert.equal(normalizeCsvDate('02/30/2027'), '');
  assert.equal(normalizeCsvDate('not-a-date'), '');

  assert.equal(parseCsvFee('1500'), 1500);
  assert.equal(parseCsvFee('₹1,000'), 1000);
  assert.equal(parseCsvFee('Rs 2,500'), 2500);
  assert.ok(Number.isNaN(parseCsvFee('free')));
});

test('parseMembersCsv parses optional email, custom fees, paid date, and 1/2/3/6/12 month plans', () => {
  const csv = [
    'Full Name,WhatsApp,Email Address,Plan,Fees,Paid Date,Status,Notes',
    'Elena Vance,+91 98765 11223,,6 Months,7000,2026-11-24,Active,"VIP, morning lifter"',
    'Carlos Ruiz,+91 98111 22334,carlos@gym.io,1 Month,"₹1,500",11/10/2026,Paused,Recovering knee',
    'Bad Email,+91 99000 33445,not-an-email,2 Months,2500,2026-11-20,Active,',
    'Missing Fee,+91 99000 44556,,3 Months,0,invalid-date,Active,',
  ].join('\n');

  const result = parseMembersCsv(csv);
  assert.equal(result.fileError, undefined);
  assert.equal(result.validRows.length, 2);
  assert.equal(result.invalidRows.length, 2);

  assert.equal(result.validRows[0].name, 'Elena Vance');
  assert.equal(result.validRows[0].email, undefined);
  assert.equal(result.validRows[0].plan, '6 Months');
  assert.equal(result.validRows[0].fees, 7000);
  assert.equal(result.validRows[0].paidDate, '2026-11-24');
  assert.equal(result.validRows[0].renewalDate, '2027-05-24');
  assert.equal(result.validRows[0].notes, 'VIP, morning lifter');

  assert.equal(result.validRows[1].name, 'Carlos Ruiz');
  assert.equal(result.validRows[1].plan, '1 Month');
  assert.equal(result.validRows[1].fees, 1500);
  assert.equal(result.validRows[1].renewalDate, '2026-12-10');
  assert.equal(result.validRows[1].manualStatus, 'paused');

  assert.equal(result.invalidRows[0].rowNumber, 4);
  assert.equal(result.invalidRows[0].rawName, 'Bad Email');
  assert.equal(result.invalidRows[1].rowNumber, 5);
  assert.ok(result.invalidRows[1].reasons.length >= 2);
});

test('parseMembersCsv reports missing headers and empty files clearly', () => {
  const empty = parseMembersCsv('   \n  ');
  assert.ok(empty.fileError);
  assert.equal(empty.validRows.length, 0);

  const missingCols = parseMembersCsv('Name,Notes\nAlex,Hello');
  assert.ok(missingCols.fileError?.includes('Phone'));
  assert.ok(missingCols.fileError?.includes('Fees'));
  assert.ok(missingCols.fileError?.includes('Paid Date'));
  assert.equal(missingCols.validRows.length, 0);
});

test('buildSampleMembersCsv produces a valid importable template', () => {
  const sample = buildSampleMembersCsv(new Date(2026, 10, 24));
  const parsed = parseMembersCsv(sample);
  assert.equal(parsed.fileError, undefined);
  assert.equal(parsed.validRows.length, 3);
  assert.equal(parsed.invalidRows.length, 0);
});
