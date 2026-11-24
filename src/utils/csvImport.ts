import {
  ManualStatus,
  MemberFormInput,
  addMonthsToIsoDate,
  calculateRenewalFromPaidDate,
  getPlanMonths,
  normalizeMembershipPlan,
  parseIsoDate,
  toIsoDateString,
  validateMemberInput,
} from './memberLogic';

export interface CsvInvalidRow {
  rowNumber: number; // 1-based line number in the CSV (including header = row 1)
  rawName: string;
  reasons: string[];
}

export interface CsvParseResult {
  validRows: MemberFormInput[];
  invalidRows: CsvInvalidRow[];
  fileError?: string;
}

/**
 * RFC-4180 compliant CSV tokenizer supporting quoted fields, embedded commas,
 * escaped quotes (""), CRLF/LF newlines, and UTF-8 BOM stripping.
 */
export function parseCsvMatrix(rawText: string): string[][] {
  const cleaned = rawText.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  for (let i = 0; i < cleaned.length; i += 1) {
    const ch = cleaned[i];
    const next = cleaned[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        currentCell += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        currentCell += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      currentRow.push(currentCell.trim());
      currentCell = '';
    } else if (ch === '\r' && next === '\n') {
      currentRow.push(currentCell.trim());
      rows.push(currentRow);
      currentRow = [];
      currentCell = '';
      i += 1;
    } else if (ch === '\n' || ch === '\r') {
      currentRow.push(currentCell.trim());
      rows.push(currentRow);
      currentRow = [];
      currentCell = '';
    } else {
      currentCell += ch;
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    rows.push(currentRow);
  }

  return rows.filter((row) => row.some((cell) => cell.length > 0));
}

/**
 * Normalizes common spreadsheet date strings (YYYY-MM-DD, YYYY/MM/DD, MM/DD/YYYY)
 * into strict YYYY-MM-DD format. Returns empty string if unparseable.
 */
export function normalizeCsvDate(rawDate: string): string {
  const trimmed = rawDate.trim();
  if (!trimmed) return '';

  // Strict YYYY-MM-DD
  if (parseIsoDate(trimmed)) {
    return trimmed;
  }

  // YYYY/MM/DD
  const ymdSlash = trimmed.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (ymdSlash) {
    const candidate = `${ymdSlash[1]}-${ymdSlash[2].padStart(2, '0')}-${ymdSlash[3].padStart(2, '0')}`;
    return parseIsoDate(candidate) ? candidate : '';
  }

  // MM/DD/YYYY or M/D/YYYY
  const mdySlash = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (mdySlash) {
    const candidate = `${mdySlash[3]}-${mdySlash[1].padStart(2, '0')}-${mdySlash[2].padStart(2, '0')}`;
    return parseIsoDate(candidate) ? candidate : '';
  }

  return '';
}

/**
 * Parses numeric fee cells such as "1500", "₹1,500", "Rs 1000", or "$50".
 */
export function parseCsvFee(rawFee: string): number {
  const cleaned = rawFee.replace(/[₹$€£,\s]|rs\.?/gi, '').trim();
  if (!cleaned || !/^\d+(\.\d+)?$/.test(cleaned)) {
    return Number.NaN;
  }
  return Number(cleaned);
}

function normalizeManualStatus(rawStatus: string): ManualStatus {
  const lower = rawStatus.trim().toLowerCase();
  if (lower.includes('pause') || lower.includes('hold') || lower.includes('freeze')) {
    return 'paused';
  }
  return 'active';
}

function findColumnIndex(headers: string[], aliases: string[]): number {
  const normalizedHeaders = headers.map((h) =>
    h
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
  );
  for (const alias of aliases) {
    const idx = normalizedHeaders.indexOf(alias);
    if (idx !== -1) return idx;
  }
  return -1;
}

/**
 * Parses and validates a gym member CSV string into ready-to-import members and
 * row-level error diagnostics. Supports optional Email, per-member Fees, and
 * Paid Date (or legacy Due Date / Renewal Date).
 */
export function parseMembersCsv(rawCsv: string): CsvParseResult {
  const matrix = parseCsvMatrix(rawCsv);
  if (matrix.length === 0) {
    return {
      validRows: [],
      invalidRows: [],
      fileError: 'The CSV file is empty.',
    };
  }

  const headerRow = matrix[0];
  const nameIdx = findColumnIndex(headerRow, [
    'name',
    'full name',
    'client name',
    'member',
    'member name',
  ]);
  const phoneIdx = findColumnIndex(headerRow, [
    'phone',
    'whatsapp',
    'whatsapp phone',
    'phone number',
    'mobile',
    'cell',
    'contact',
  ]);
  const emailIdx = findColumnIndex(headerRow, ['email', 'email address', 'e mail']);
  const planIdx = findColumnIndex(headerRow, [
    'plan',
    'membership',
    'membership plan',
    'duration',
    'tier',
  ]);
  const feesIdx = findColumnIndex(headerRow, [
    'fees',
    'fee',
    'amount',
    'price',
    'monthly fee',
    'membership fee',
    'paid amount',
    'dues',
  ]);
  const paidDateIdx = findColumnIndex(headerRow, [
    'paid date',
    'payment date',
    'paid on',
    'paid',
    'start date',
  ]);
  const dueDateIdx = findColumnIndex(headerRow, [
    'renewal date',
    'due date',
    'renewal',
    'due',
    'expires',
    'expiry',
    'expiry date',
    'next payment',
  ]);
  const statusIdx = findColumnIndex(headerRow, [
    'status',
    'standing',
    'account standing',
    'state',
  ]);
  const notesIdx = findColumnIndex(headerRow, ['notes', 'note', 'comments', 'memo']);

  const missingHeaders: string[] = [];
  if (nameIdx === -1) missingHeaders.push('Name');
  if (phoneIdx === -1) missingHeaders.push('Phone');
  if (feesIdx === -1) missingHeaders.push('Fees');
  if (paidDateIdx === -1 && dueDateIdx === -1) {
    missingHeaders.push('Paid Date (or Due Date)');
  }

  if (missingHeaders.length > 0) {
    return {
      validRows: [],
      invalidRows: [],
      fileError: `Missing required column header${missingHeaders.length > 1 ? 's' : ''}: ${missingHeaders.join(', ')}.`,
    };
  }

  if (matrix.length === 1) {
    return {
      validRows: [],
      invalidRows: [],
      fileError: 'CSV has headers but no member rows to import.',
    };
  }

  const validRows: MemberFormInput[] = [];
  const invalidRows: CsvInvalidRow[] = [];

  for (let i = 1; i < matrix.length; i += 1) {
    const row = matrix[i];
    const rawName = row[nameIdx] ?? '';
    const rawPhone = row[phoneIdx] ?? '';
    const rawEmail = emailIdx !== -1 ? row[emailIdx] ?? '' : '';
    const rawPlan = planIdx !== -1 ? row[planIdx] ?? '' : '';
    const rawFees = row[feesIdx] ?? '';
    const rawPaidDate = paidDateIdx !== -1 ? row[paidDateIdx] ?? '' : '';
    const rawDueDate = dueDateIdx !== -1 ? row[dueDateIdx] ?? '' : '';
    const rawStatus = statusIdx !== -1 ? row[statusIdx] ?? '' : '';
    const rawNotes = notesIdx !== -1 ? row[notesIdx] ?? '' : '';

    const plan = normalizeMembershipPlan(rawPlan);
    const fees = parseCsvFee(rawFees);

    let paidDate = normalizeCsvDate(rawPaidDate);
    let renewalDate = normalizeCsvDate(rawDueDate);

    if (paidDate && !renewalDate) {
      renewalDate = calculateRenewalFromPaidDate(paidDate, plan);
    } else if (!paidDate && renewalDate) {
      paidDate = addMonthsToIsoDate(renewalDate, -getPlanMonths(plan));
    }

    const candidate: MemberFormInput = {
      name: rawName.trim(),
      phone: rawPhone.trim(),
      email: rawEmail.trim() || undefined,
      plan,
      fees,
      manualStatus: normalizeManualStatus(rawStatus),
      paidDate,
      renewalDate: renewalDate || undefined,
      notes: rawNotes.trim() || undefined,
    };

    const validation = validateMemberInput(candidate);
    if (validation.valid) {
      validRows.push(candidate);
    } else {
      const reasons = Object.values(validation.errors).filter(
        (msg): msg is string => Boolean(msg)
      );
      invalidRows.push({
        rowNumber: i + 1,
        rawName: rawName.trim() || `Row ${i + 1}`,
        reasons,
      });
    }
  }

  return { validRows, invalidRows };
}

/**
 * Generates a ready-to-use sample CSV string anchored to the current date so gym
 * owners can download a working template immediately.
 */
export function buildSampleMembersCsv(referenceDate: Date = new Date()): string {
  const offset = (days: number) => {
    const d = new Date(
      referenceDate.getFullYear(),
      referenceDate.getMonth(),
      referenceDate.getDate() + days
    );
    return toIsoDateString(d);
  };

  return [
    'Name,Phone,Email,Plan,Fees,Paid Date,Status,Notes',
    `Liam Carter,+91 98765 11223,liam.carter@fitmail.io,1 Month,1000,${offset(-12)},Active,Morning strength block`,
    `Aisha Mensah,+91 98111 44556,,3 Months,4000,${offset(-86)},Active,"Prefers 7 AM sessions, barbell focus"`,
    `Devon Brooks,+91 99000 77889,devon.brooks@outlook.com,1 Month,1500,${offset(-33)},Active,Renewal follow-up`,
  ].join('\n');
}
