import { ChangeEvent, DragEvent, FormEvent, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  CalendarPlus,
  Camera,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  FEE_PRESETS,
  MEMBERSHIP_PLANS,
  ManualStatus,
  Member,
  MemberFormInput,
  MembershipPlan,
  ValidationResult,
  calculateRenewalFromPaidDate,
  extendRenewalDate,
  formatCurrency,
  formatDisplayDate,
  getMemberInitials,
  toIsoDateString,
  validateMemberInput,
} from '../utils/memberLogic';
import {
  CsvParseResult,
  buildSampleMembersCsv,
  parseMembersCsv,
} from '../utils/csvImport';

interface MemberFormModalProps {
  isOpen: boolean;
  initialMode?: 'single' | 'csv';
  editingMember: Member | null;
  onClose: () => void;
  onSave: (input: MemberFormInput, editingId: string | null) => void;
  onBulkImport?: (inputs: MemberFormInput[]) => void;
  onQuickRenew?: (memberId: string, months: number) => void;
  onDelete?: (memberId: string) => void;
}

export function MemberFormModal({
  isOpen,
  initialMode = 'single',
  editingMember,
  onClose,
  onSave,
  onBulkImport,
  onQuickRenew,
  onDelete,
}: MemberFormModalProps) {
  const [mode, setMode] = useState<'single' | 'csv'>(initialMode);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [plan, setPlan] = useState<MembershipPlan>('1 Month');
  const [feesInput, setFeesInput] = useState('');
  const [manualStatus, setManualStatus] = useState<ManualStatus>('active');
  const [paidDate, setPaidDate] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<ValidationResult['errors']>({});
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [csvResult, setCsvResult] = useState<CsvParseResult | null>(null);
  const [isDraggingCsv, setIsDraggingCsv] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setMode(editingMember ? 'single' : initialMode);
    setCsvFileName(null);
    setCsvResult(null);
    setIsDraggingCsv(false);
    if (editingMember) {
      setName(editingMember.name);
      setPhone(editingMember.phone);
      setEmail(editingMember.email ?? '');
      setPlan(editingMember.plan);
      setFeesInput(String(editingMember.fees));
      setManualStatus(editingMember.manualStatus);
      setPaidDate(editingMember.paidDate);
      setAvatarUrl(editingMember.avatarUrl);
      setNotes(editingMember.notes ?? '');
    } else {
      setName('');
      setPhone('');
      setEmail('');
      setPlan('1 Month');
      setFeesInput('');
      setManualStatus('active');
      setPaidDate(toIsoDateString(new Date()));
      setAvatarUrl(undefined);
      setNotes('');
    }
    setErrors({});
    setConfirmingDelete(false);
  }, [isOpen, editingMember, initialMode]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const calculatedDueDate = paidDate
    ? calculateRenewalFromPaidDate(paidDate, plan)
    : '';

  const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (!result) return;
      const img = new Image();
      img.onload = () => {
        const size = 256;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setAvatarUrl(result);
          return;
        }
        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;
        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
        setAvatarUrl(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  const readCsvFile = (file: File) => {
    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === 'string' ? reader.result : '';
      setCsvResult(parseMembersCsv(content));
    };
    reader.onerror = () => {
      setCsvResult({
        validRows: [],
        invalidRows: [],
        fileError: 'Could not read the selected file. Please try another CSV file.',
      });
    };
    reader.readAsText(file);
  };

  const handleCsvInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      readCsvFile(file);
    }
  };

  const handleCsvDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDraggingCsv(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      readCsvFile(file);
    }
  };

  const handleDownloadSampleCsv = () => {
    const csvContent = buildSampleMembersCsv();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ironpulse-members-template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleConfirmCsvImport = () => {
    if (!csvResult || csvResult.validRows.length === 0 || !onBulkImport) return;
    onBulkImport(csvResult.validRows);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const parsedFees = feesInput.trim() ? Number(feesInput.trim()) : Number.NaN;
    const computedRenewal = calculateRenewalFromPaidDate(paidDate, plan);
    const input: MemberFormInput = {
      name,
      phone,
      email: email.trim() || undefined,
      plan,
      fees: parsedFees,
      manualStatus,
      paidDate,
      renewalDate: computedRenewal,
      avatarUrl,
      notes,
    };
    const validation = validateMemberInput(input);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }
    onSave(
      {
        ...input,
        name: input.name.trim(),
        phone: input.phone.trim(),
        email: input.email?.trim() || undefined,
        fees: Math.round(parsedFees),
        paidDate: input.paidDate.trim(),
        renewalDate: computedRenewal,
        avatarUrl,
        notes: input.notes?.trim() || undefined,
      },
      editingMember ? editingMember.id : null
    );
  };

  const isCsvMode = !editingMember && mode === 'csv';
  const validImportCount = csvResult?.validRows.length ?? 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/55 dark:bg-black/75 backdrop-blur-sm p-0 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="member-form-title"
        className="w-full sm:max-w-lg max-h-[92vh] flex flex-col rounded-t-2xl sm:rounded-2xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-[#11151B] shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 dark:border-white/[0.08] px-5 py-4 sm:px-6">
          <div>
            <h2
              id="member-form-title"
              className="font-display text-2xl font-bold tracking-wide text-slate-950 dark:text-[#F3F5F7]"
            >
              {editingMember
                ? 'Manage Member'
                : isCsvMode
                  ? 'Import Members from CSV'
                  : 'Add New Member'}
            </h2>
            <p className="text-xs text-slate-600 dark:text-[#8A97AB] mt-0.5">
              {editingMember
                ? 'Update plan duration, fees, paid date, or renew membership.'
                : isCsvMode
                  ? 'Upload a spreadsheet (.csv) to bulk-add clients, fees, and paid dates.'
                  : 'Select plan duration, fees, and paid date to track due dates automatically.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close member form"
            className="flex h-11 w-11 -mr-2 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-950 dark:text-[#8A97AB] dark:hover:bg-white/[0.06] dark:hover:text-[#F3F5F7] transition-colors"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Mode Switch (Single Member vs CSV Bulk Import — Add Mode Only) */}
        {!editingMember && onBulkImport && (
          <div className="px-5 pt-4 sm:px-6">
            <div
              role="tablist"
              aria-label="Add member method"
              className="grid grid-cols-2 gap-1.5 rounded-lg border border-slate-200 dark:border-white/[0.08] bg-slate-100 dark:bg-[#0B0E13] p-1"
            >
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'single'}
                onClick={() => setMode('single')}
                className={`min-h-[40px] rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                  mode === 'single'
                    ? 'bg-slate-950 text-[#C8FF00] dark:bg-[#1D2430] dark:text-[#C8FF00]'
                    : 'text-slate-600 hover:text-slate-950 dark:text-[#8A97AB] dark:hover:text-[#F3F5F7]'
                }`}
              >
                Single Member
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'csv'}
                onClick={() => setMode('csv')}
                className={`inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                  mode === 'csv'
                    ? 'bg-slate-950 text-[#C8FF00] dark:bg-[#1D2430] dark:text-[#C8FF00]'
                    : 'text-slate-600 hover:text-slate-950 dark:text-[#8A97AB] dark:hover:text-[#F3F5F7]'
                }`}
              >
                <FileSpreadsheet className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>Import CSV</span>
              </button>
            </div>
          </div>
        )}

        {/* Scrollable Body */}
        <div className="overflow-y-auto px-5 py-5 sm:px-6 space-y-5">
          {isCsvMode ? (
            <div className="space-y-4">
              {/* Dropzone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingCsv(true);
                }}
                onDragLeave={() => setIsDraggingCsv(false)}
                onDrop={handleCsvDrop}
                className={`rounded-xl border border-dashed px-5 py-7 text-center transition-colors ${
                  isDraggingCsv
                    ? 'border-slate-950 bg-slate-100 dark:border-[#C8FF00] dark:bg-[#C8FF00]/10'
                    : 'border-slate-300 bg-slate-50 dark:border-white/[0.15] dark:bg-[#0B0E13]'
                }`}
              >
                <Upload
                  className="mx-auto h-7 w-7 text-slate-600 dark:text-[#C8FF00]"
                  aria-hidden="true"
                />
                <p className="mt-2.5 text-sm font-semibold text-slate-950 dark:text-[#F3F5F7]">
                  {csvFileName ? csvFileName : 'Drop your CSV file here'}
                </p>
                <p className="mt-1 text-xs text-slate-600 dark:text-[#8A97AB]">
                  Required: Name, Phone, Fees, Paid Date (optional: Email, Plan, Status, Notes)
                </p>

                <input
                  ref={csvInputRef}
                  id="csv-file-input"
                  aria-label="Upload CSV file"
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleCsvInputChange}
                  className="sr-only"
                />

                <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => csvInputRef.current?.click()}
                    className="inline-flex min-h-[42px] items-center gap-2 rounded-lg bg-slate-950 text-[#C8FF00] hover:bg-slate-800 dark:bg-[#C8FF00] dark:text-[#090B0E] dark:hover:bg-[#D6FF3D] px-4 py-2 text-xs font-bold transition-colors whitespace-nowrap"
                  >
                    <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{csvFileName ? 'Choose Different CSV' : 'Choose .csv File'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadSampleCsv}
                    className="inline-flex min-h-[42px] items-center gap-1.5 rounded-lg border border-slate-300 dark:border-white/[0.12] bg-white dark:bg-[#161C25] px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-[#CBD5E1] hover:border-slate-950 dark:hover:border-[#C8FF00]/60 dark:hover:text-[#C8FF00] transition-colors whitespace-nowrap"
                  >
                    <Download className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Sample CSV</span>
                  </button>
                </div>
              </div>

              {/* File-level error */}
              {csvResult?.fileError && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 rounded-lg border border-rose-300 dark:border-rose-500/35 bg-rose-50 dark:bg-rose-500/10 px-3.5 py-3 text-xs text-rose-800 dark:text-rose-200"
                >
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" aria-hidden="true" />
                  <span>{csvResult.fileError}</span>
                </div>
              )}

              {/* Parsed Summary & Preview */}
              {csvResult && !csvResult.fileError && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span className="tabular-nums">
                        {csvResult.validRows.length}{' '}
                        {csvResult.validRows.length === 1 ? 'member' : 'members'} ready to import
                      </span>
                    </div>
                    {csvResult.invalidRows.length > 0 && (
                      <span className="font-semibold text-amber-700 dark:text-amber-400 tabular-nums">
                        {csvResult.invalidRows.length}{' '}
                        {csvResult.invalidRows.length === 1 ? 'row' : 'rows'} skipped
                      </span>
                    )}
                  </div>

                  {csvResult.validRows.length > 0 && (
                    <div
                      data-testid="csv-valid-preview"
                      className="max-h-44 overflow-y-auto rounded-lg border border-slate-200 dark:border-white/[0.08] divide-y divide-slate-200 dark:divide-white/[0.07] bg-white dark:bg-[#0B0E13]"
                    >
                      {csvResult.validRows.map((row, idx) => {
                        const dueDate =
                          row.renewalDate ||
                          calculateRenewalFromPaidDate(row.paidDate, row.plan);
                        return (
                          <div
                            key={`${row.phone}-${idx}`}
                            className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-xs"
                          >
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-950 dark:text-[#F3F5F7] truncate">
                                {row.name}
                              </p>
                              <p className="text-[11px] text-slate-600 dark:text-[#8A97AB] truncate tabular-nums">
                                {row.plan} · {formatCurrency(row.fees)} · {row.phone}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="block font-mono font-semibold text-slate-900 dark:text-[#F3F5F7] tabular-nums">
                                {formatDisplayDate(dueDate)}
                              </span>
                              <span className="text-[11px] text-slate-500 dark:text-[#7E8B9E]">
                                {row.manualStatus === 'paused' ? 'Paused' : 'Due Date'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {csvResult.invalidRows.length > 0 && (
                    <div
                      role="alert"
                      data-testid="csv-invalid-list"
                      className="rounded-lg border border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-3 space-y-1.5"
                    >
                      <p className="text-xs font-semibold text-amber-900 dark:text-amber-300">
                        Skipped rows with missing or invalid data:
                      </p>
                      <ul className="space-y-1 text-[11px] text-amber-800 dark:text-amber-200/90">
                        {csvResult.invalidRows.map((bad) => (
                          <li key={bad.rowNumber}>
                            <strong className="font-semibold">Row {bad.rowNumber}</strong> ({bad.rawName}):{' '}
                            {bad.reasons.join(' ')}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Quick Renewal Bar (Edit Mode Only) */}
              {editingMember && onQuickRenew && (
                <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-[#0D1117] p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-950 dark:text-[#F3F5F7]">
                      <CalendarPlus className="h-4 w-4 text-lime-700 dark:text-[#C8FF00]" aria-hidden="true" />
                      <span>Quick Renew Membership</span>
                    </div>
                    <span className="font-mono text-xs text-slate-600 dark:text-[#8A97AB] tabular-nums">
                      Due: {formatDisplayDate(editingMember.renewalDate)}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { label: '+1 Month', months: 1 },
                      { label: '+3 Months', months: 3 },
                      { label: '+6 Months', months: 6 },
                      { label: '+12 Months', months: 12 },
                    ].map((opt) => (
                      <button
                        key={opt.months}
                        type="button"
                        onClick={() => onQuickRenew(editingMember.id, opt.months)}
                        title={`Extend to ${formatDisplayDate(extendRenewalDate(editingMember.renewalDate, opt.months))}`}
                        className="min-h-[42px] rounded-lg border border-slate-300 dark:border-white/[0.1] bg-white dark:bg-[#161C25] px-2.5 py-2 text-xs font-semibold text-slate-900 dark:text-[#F3F5F7] transition-colors hover:border-slate-950 hover:bg-slate-950 hover:text-[#C8FF00] dark:hover:border-[#C8FF00]/60 dark:hover:bg-[#161C25] dark:hover:text-[#C8FF00] whitespace-nowrap"
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <form id="member-form" onSubmit={handleSubmit} noValidate className="space-y-4">
                {/* Optional Photo Upload Row */}
                <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-[#0B0E13] px-3.5 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="Member preview"
                        referrerPolicy="no-referrer"
                        className="h-12 w-12 shrink-0 rounded-lg object-cover object-top border border-slate-300 dark:border-white/[0.12]"
                      />
                    ) : (
                      <div
                        aria-hidden="true"
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-[#141922] font-display text-lg font-bold text-slate-700 dark:text-[#94A3B8]"
                      >
                        {name.trim() ? getMemberInitials(name) : 'IP'}
                      </div>
                    )}
                    <div className="min-w-0">
                      <span className="block text-xs font-medium text-slate-900 dark:text-[#CBD5E1]">
                        Member Photo{' '}
                        <span className="text-slate-500 dark:text-[#64748B] font-normal">(optional)</span>
                      </span>
                      <span className="block text-[11px] text-slate-600 dark:text-[#7E8B9E] truncate">
                        Shown on the right side of the client card
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <input
                      ref={fileInputRef}
                      id="member-photo"
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="sr-only"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-300 dark:border-white/[0.12] bg-white dark:bg-[#161C25] px-3 py-1.5 text-xs font-semibold text-slate-900 dark:text-[#F3F5F7] transition-colors hover:border-slate-950 dark:hover:border-[#C8FF00]/60 dark:hover:text-[#C8FF00] whitespace-nowrap"
                    >
                      <Camera className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{avatarUrl ? 'Change' : 'Upload'}</span>
                    </button>
                    {avatarUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setAvatarUrl(undefined);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="min-h-[38px] rounded-lg px-2.5 text-xs font-medium text-slate-600 hover:text-rose-700 dark:text-[#8A97AB] dark:hover:text-rose-400"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>

                {/* Full Name */}
                <div>
                  <label
                    htmlFor="member-name"
                    className="block text-xs font-medium text-slate-800 dark:text-[#CBD5E1] mb-1.5"
                  >
                    Full Name
                  </label>
                  <input
                    id="member-name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    placeholder="e.g. Rohan Verma"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
                    }}
                    aria-invalid={Boolean(errors.name)}
                    className="w-full min-h-[44px] rounded-lg border border-slate-300 dark:border-white/[0.12] bg-white dark:bg-[#0B0E13] px-3.5 py-2.5 text-sm text-slate-950 dark:text-[#F3F5F7] placeholder:text-slate-400 dark:placeholder:text-[#64748B] focus:border-slate-950 dark:focus:border-[#C8FF00] focus:outline-none"
                  />
                  {errors.name && (
                    <p role="alert" className="mt-1.5 text-xs font-medium text-rose-700 dark:text-rose-400">
                      {errors.name}
                    </p>
                  )}
                </div>

                {/* Phone + Optional Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="member-phone"
                      className="block text-xs font-medium text-slate-800 dark:text-[#CBD5E1] mb-1.5"
                    >
                      WhatsApp / Phone
                    </label>
                    <input
                      id="member-phone"
                      name="phone"
                      type="tel"
                      autoComplete="tel"
                      placeholder="+91 98765 43210"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        if (errors.phone) setErrors((prev) => ({ ...prev, phone: undefined }));
                      }}
                      aria-invalid={Boolean(errors.phone)}
                      className="w-full min-h-[44px] rounded-lg border border-slate-300 dark:border-white/[0.12] bg-white dark:bg-[#0B0E13] px-3.5 py-2.5 font-mono text-sm text-slate-950 dark:text-[#F3F5F7] placeholder:text-slate-400 dark:placeholder:text-[#64748B] focus:border-slate-950 dark:focus:border-[#C8FF00] focus:outline-none"
                    />
                    {errors.phone && (
                      <p role="alert" className="mt-1.5 text-xs font-medium text-rose-700 dark:text-rose-400">
                        {errors.phone}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="member-email"
                      className="block text-xs font-medium text-slate-800 dark:text-[#CBD5E1] mb-1.5"
                    >
                      Email Address{' '}
                      <span className="text-slate-500 dark:text-[#64748B] font-normal">(optional)</span>
                    </label>
                    <input
                      id="member-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      placeholder="member@example.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                      }}
                      aria-invalid={Boolean(errors.email)}
                      className="w-full min-h-[44px] rounded-lg border border-slate-300 dark:border-white/[0.12] bg-white dark:bg-[#0B0E13] px-3.5 py-2.5 text-sm text-slate-950 dark:text-[#F3F5F7] placeholder:text-slate-400 dark:placeholder:text-[#64748B] focus:border-slate-950 dark:focus:border-[#C8FF00] focus:outline-none"
                    />
                    {errors.email && (
                      <p role="alert" className="mt-1.5 text-xs font-medium text-rose-700 dark:text-rose-400">
                        {errors.email}
                      </p>
                    )}
                  </div>
                </div>

                {/* Membership Plan Duration Sections: 1, 2, 3, 6, 12 Months */}
                <div>
                  <span className="block text-xs font-medium text-slate-800 dark:text-[#CBD5E1] mb-1.5">
                    Membership Plan
                  </span>
                  <div
                    role="group"
                    aria-label="Membership plan duration"
                    className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 rounded-lg border border-slate-200 dark:border-white/[0.08] bg-slate-100 dark:bg-[#0B0E13] p-1"
                  >
                    {MEMBERSHIP_PLANS.map((planOption) => {
                      const isSelected = plan === planOption;
                      return (
                        <button
                          key={planOption}
                          type="button"
                          onClick={() => setPlan(planOption)}
                          aria-pressed={isSelected}
                          className={`min-h-[40px] rounded-md px-2 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap tabular-nums ${
                            isSelected
                              ? 'bg-slate-950 text-[#C8FF00] dark:bg-[#C8FF00] dark:text-[#090B0E]'
                              : 'text-slate-700 hover:text-slate-950 hover:bg-white/70 dark:text-[#94A3B8] dark:hover:text-[#F3F5F7] dark:hover:bg-white/[0.05]'
                          }`}
                        >
                          {planOption}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Fees + Paid Date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="member-fees"
                      className="block text-xs font-medium text-slate-800 dark:text-[#CBD5E1] mb-1.5"
                    >
                      Membership Fees (₹)
                    </label>
                    <div className="relative">
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-sm font-semibold text-slate-500 dark:text-[#8A97AB]"
                      >
                        ₹
                      </span>
                      <input
                        id="member-fees"
                        name="fees"
                        type="number"
                        inputMode="numeric"
                        min={1}
                        step={1}
                        placeholder="e.g. 1000 or 1500"
                        value={feesInput}
                        onChange={(e) => {
                          setFeesInput(e.target.value);
                          if (errors.fees) setErrors((prev) => ({ ...prev, fees: undefined }));
                        }}
                        aria-invalid={Boolean(errors.fees)}
                        className="w-full min-h-[44px] rounded-lg border border-slate-300 dark:border-white/[0.12] bg-white dark:bg-[#0B0E13] pl-8 pr-3.5 py-2.5 font-mono text-sm font-semibold tabular-nums text-slate-950 dark:text-[#F3F5F7] placeholder:font-normal placeholder:text-slate-400 dark:placeholder:text-[#64748B] focus:border-slate-950 dark:focus:border-[#C8FF00] focus:outline-none"
                      />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {FEE_PRESETS.map((preset) => {
                        const isMatch = Number(feesInput) === preset;
                        return (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => {
                              setFeesInput(String(preset));
                              if (errors.fees) setErrors((prev) => ({ ...prev, fees: undefined }));
                            }}
                            className={`rounded-md border px-2 py-1 font-mono text-[11px] font-semibold tabular-nums transition-colors whitespace-nowrap ${
                              isMatch
                                ? 'border-slate-950 bg-slate-950 text-[#C8FF00] dark:border-[#C8FF00]/70 dark:bg-[#C8FF00]/15 dark:text-[#C8FF00]'
                                : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-400 dark:border-white/[0.1] dark:bg-[#0B0E13] dark:text-[#94A3B8] dark:hover:border-white/25 dark:hover:text-[#F3F5F7]'
                            }`}
                          >
                            {formatCurrency(preset)}
                          </button>
                        );
                      })}
                    </div>
                    {errors.fees && (
                      <p role="alert" className="mt-1.5 text-xs font-medium text-rose-700 dark:text-rose-400">
                        {errors.fees}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="member-paid-date"
                      className="block text-xs font-medium text-slate-800 dark:text-[#CBD5E1] mb-1.5"
                    >
                      Paid Date
                    </label>
                    <input
                      id="member-paid-date"
                      name="paidDate"
                      type="date"
                      value={paidDate}
                      onChange={(e) => {
                        setPaidDate(e.target.value);
                        if (errors.paidDate) {
                          setErrors((prev) => ({ ...prev, paidDate: undefined }));
                        }
                      }}
                      aria-invalid={Boolean(errors.paidDate)}
                      className="w-full min-h-[44px] rounded-lg border border-slate-300 dark:border-white/[0.12] bg-white dark:bg-[#0B0E13] px-3.5 py-2.5 font-mono text-sm text-slate-950 dark:text-[#F3F5F7] focus:border-slate-950 dark:focus:border-[#C8FF00] focus:outline-none"
                    />
                    {errors.paidDate && (
                      <p role="alert" className="mt-1.5 text-xs font-medium text-rose-700 dark:text-rose-400">
                        {errors.paidDate}
                      </p>
                    )}

                    {/* Auto-calculated Due Date preview */}
                    {calculatedDueDate && (
                      <div
                        data-testid="calculated-due-date"
                        className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-[#0B0E13] px-3 py-2 text-xs"
                      >
                        <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-[#8A97AB] whitespace-nowrap">
                          <Calendar className="h-3.5 w-3.5 text-lime-700 dark:text-[#C8FF00] shrink-0" aria-hidden="true" />
                          <span>Next Due</span>
                        </span>
                        <span className="font-mono font-bold tabular-nums text-slate-950 dark:text-[#F3F5F7] whitespace-nowrap">
                          {formatDisplayDate(calculatedDueDate)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Account State (Active vs Paused) */}
                <div>
                  <span className="block text-xs font-medium text-slate-800 dark:text-[#CBD5E1] mb-1.5">
                    Account Standing
                  </span>
                  <div className="grid grid-cols-2 gap-2 p-1 rounded-lg border border-slate-200 dark:border-white/[0.08] bg-slate-100 dark:bg-[#0B0E13]">
                    <button
                      type="button"
                      onClick={() => setManualStatus('active')}
                      aria-pressed={manualStatus === 'active'}
                      className={`min-h-[40px] rounded-md text-xs font-semibold transition-colors ${
                        manualStatus === 'active'
                          ? 'bg-slate-950 text-[#C8FF00] dark:bg-[#1D2430] dark:text-[#C8FF00]'
                          : 'text-slate-600 hover:text-slate-950 dark:text-[#8A97AB] dark:hover:text-[#F3F5F7]'
                      }`}
                    >
                      Active Tracking
                    </button>
                    <button
                      type="button"
                      onClick={() => setManualStatus('paused')}
                      aria-pressed={manualStatus === 'paused'}
                      className={`min-h-[40px] rounded-md text-xs font-semibold transition-colors ${
                        manualStatus === 'paused'
                          ? 'bg-slate-950 text-white dark:bg-[#1D2430] dark:text-[#F3F5F7]'
                          : 'text-slate-600 hover:text-slate-950 dark:text-[#8A97AB] dark:hover:text-[#F3F5F7]'
                      }`}
                    >
                      Paused / On Hold
                    </button>
                  </div>
                  <p className="mt-1.5 text-[11px] text-slate-600 dark:text-[#7E8B9E]">
                    Due date is auto-calculated from Paid Date + {plan}. Accounts flag Expiring Soon within 7 days.
                  </p>
                </div>

                {/* Optional Notes */}
                <div>
                  <label
                    htmlFor="member-notes"
                    className="block text-xs font-medium text-slate-800 dark:text-[#CBD5E1] mb-1.5"
                  >
                    Notes{' '}
                    <span className="text-slate-500 dark:text-[#64748B] font-normal">(optional)</span>
                  </label>
                  <input
                    id="member-notes"
                    name="notes"
                    type="text"
                    placeholder="Training goals, preferred schedule, coach notes..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full min-h-[44px] rounded-lg border border-slate-300 dark:border-white/[0.12] bg-white dark:bg-[#0B0E13] px-3.5 py-2.5 text-sm text-slate-950 dark:text-[#F3F5F7] placeholder:text-slate-400 dark:placeholder:text-[#64748B] focus:border-slate-950 dark:focus:border-[#C8FF00] focus:outline-none"
                  />
                </div>
              </form>

              {/* Delete Member Section (Edit Mode Only) */}
              {editingMember && onDelete && (
                <div className="border-t border-slate-200 dark:border-white/[0.08] pt-4">
                  {!confirmingDelete ? (
                    <button
                      type="button"
                      onClick={() => setConfirmingDelete(true)}
                      className="inline-flex min-h-[40px] items-center gap-2 text-xs font-semibold text-rose-700 hover:text-rose-800 dark:text-rose-400 dark:hover:text-rose-300 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                      <span>Remove member from roster</span>
                    </button>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rose-300 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 px-3.5 py-2.5">
                      <span className="text-xs font-medium text-rose-900 dark:text-rose-200">
                        Remove {editingMember.name} permanently?
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setConfirmingDelete(false)}
                          className="min-h-[36px] rounded-md px-3 text-xs font-medium text-slate-700 hover:bg-slate-200/70 dark:text-[#CBD5E1] dark:hover:bg-white/[0.06]"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(editingMember.id)}
                          className="min-h-[36px] rounded-md bg-rose-600 px-3 text-xs font-semibold text-white hover:bg-rose-700 dark:bg-rose-500 dark:hover:bg-rose-400"
                        >
                          Confirm Remove
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-[#0D1117] px-5 py-4 sm:px-6 pb-safe">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] rounded-lg border border-slate-300 dark:border-white/[0.1] bg-white dark:bg-transparent px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100 dark:text-[#CBD5E1] dark:hover:bg-white/[0.05] dark:hover:text-white transition-colors whitespace-nowrap"
          >
            Cancel
          </button>
          {isCsvMode ? (
            <button
              type="button"
              disabled={validImportCount === 0}
              onClick={handleConfirmCsvImport}
              className="min-h-[44px] rounded-lg bg-slate-950 text-[#C8FF00] hover:bg-slate-800 dark:bg-[#C8FF00] dark:text-[#090B0E] dark:hover:bg-[#D6FF3D] disabled:opacity-40 disabled:cursor-not-allowed px-5 py-2 text-sm font-bold transition-colors whitespace-nowrap"
            >
              {validImportCount > 0
                ? `Import ${validImportCount} ${validImportCount === 1 ? 'Member' : 'Members'}`
                : 'Import Members'}
            </button>
          ) : (
            <button
              type="submit"
              form="member-form"
              className="min-h-[44px] rounded-lg bg-slate-950 text-[#C8FF00] hover:bg-slate-800 dark:bg-[#C8FF00] dark:text-[#090B0E] dark:hover:bg-[#D6FF3D] px-5 py-2 text-sm font-bold transition-colors whitespace-nowrap"
            >
              {editingMember ? 'Save Changes' : 'Add Member'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
