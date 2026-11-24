import { useEffect, useState } from 'react';
import { Check, Copy, ExternalLink, Mail, MessageCircle, X } from 'lucide-react';
import {
  Member,
  buildMailtoUrl,
  buildWhatsAppUrl,
  computeMemberStatus,
  formatDisplayDate,
  getMessageTemplates,
  getStatusLabel,
} from '../utils/memberLogic';

interface MessageComposerModalProps {
  member: Member | null;
  initialChannel: 'whatsapp' | 'email';
  onClose: () => void;
  onMarkMessaged: (memberId: string) => void;
}

export function MessageComposerModal({
  member,
  initialChannel,
  onClose,
  onMarkMessaged,
}: MessageComposerModalProps) {
  const [channel, setChannel] = useState<'whatsapp' | 'email'>(initialChannel);
  const [activeTemplateId, setActiveTemplateId] = useState<string>('renewal');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!member) return;
    const status = computeMemberStatus(member);
    const templates = getMessageTemplates(member, status);
    const defaultTemplate =
      status === 'paused'
        ? templates[2]
        : status === 'active'
          ? templates[1]
          : templates[0];

    const memberHasEmail = Boolean(member.email?.trim());
    setChannel(initialChannel === 'email' && !memberHasEmail ? 'whatsapp' : initialChannel);
    setActiveTemplateId(defaultTemplate.id);
    setSubject(defaultTemplate.subject);
    setBody(defaultTemplate.body);
    setCopied(false);
  }, [member, initialChannel]);

  useEffect(() => {
    if (!member) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [member, onClose]);

  if (!member) return null;

  const hasEmail = Boolean(member.email?.trim());
  const status = computeMemberStatus(member);
  const templates = getMessageTemplates(member, status);
  const whatsappUrl = buildWhatsAppUrl(member.phone, body);
  const mailtoUrl = hasEmail
    ? buildMailtoUrl(member.email ?? '', subject, body)
    : '#';

  const handleSelectTemplate = (templateId: string) => {
    const selected = templates.find((t) => t.id === templateId);
    if (!selected) return;
    setActiveTemplateId(selected.id);
    setSubject(selected.subject);
    setBody(selected.body);
  };

  const handleCopy = async () => {
    const textToCopy =
      channel === 'email' ? `Subject: ${subject}\n\n${body}` : body;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      onMarkMessaged(member.id);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

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
        aria-labelledby="message-composer-title"
        className="w-full sm:max-w-lg max-h-[92vh] flex flex-col rounded-t-2xl sm:rounded-2xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-[#11151B] shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 dark:border-white/[0.08] px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2
              id="message-composer-title"
              className="font-display text-2xl font-bold tracking-wide text-slate-950 dark:text-[#F3F5F7] truncate"
            >
              Message {member.name}
            </h2>
            <p className="mt-0.5 text-xs text-slate-600 dark:text-[#8A97AB] truncate">
              {status === 'expired'
                ? `Expired ${formatDisplayDate(member.renewalDate)}`
                : status === 'paused'
                  ? `Paused · Due ${formatDisplayDate(member.renewalDate)}`
                  : `${getStatusLabel(status)} · Due ${formatDisplayDate(member.renewalDate)}`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close message composer"
            className="flex h-11 w-11 -mr-2 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-950 dark:text-[#8A97AB] dark:hover:bg-white/[0.06] dark:hover:text-[#F3F5F7] transition-colors"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-5 py-5 sm:px-6 space-y-4">
          {/* Channel Segmented Selector */}
          <div
            role="tablist"
            aria-label="Messaging channel"
            className="grid grid-cols-2 gap-1.5 rounded-lg border border-slate-200 dark:border-white/[0.08] bg-slate-100 dark:bg-[#0B0E13] p-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={channel === 'whatsapp'}
              onClick={() => setChannel('whatsapp')}
              className={`flex min-h-[42px] items-center justify-center gap-2 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                channel === 'whatsapp'
                  ? 'bg-emerald-700 text-white dark:bg-[#17261E] dark:text-emerald-300'
                  : 'text-slate-600 hover:text-slate-950 dark:text-[#8A97AB] dark:hover:text-[#F3F5F7]'
              }`}
            >
              <MessageCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>WhatsApp</span>
            </button>

            <button
              type="button"
              role="tab"
              disabled={!hasEmail}
              aria-selected={channel === 'email'}
              onClick={() => {
                if (hasEmail) setChannel('email');
              }}
              className={`flex min-h-[42px] items-center justify-center gap-2 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                !hasEmail
                  ? 'text-slate-400 dark:text-[#4B5563] cursor-not-allowed'
                  : channel === 'email'
                    ? 'bg-slate-950 text-[#C8FF00] dark:bg-[#1C2330] dark:text-[#C8FF00]'
                    : 'text-slate-600 hover:text-slate-950 dark:text-[#8A97AB] dark:hover:text-[#F3F5F7]'
              }`}
            >
              <Mail className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{hasEmail ? 'Email' : 'No Email'}</span>
            </button>
          </div>

          {/* Recipient Destination Line */}
          <div className="flex items-center justify-between gap-2 text-xs text-slate-600 dark:text-[#8A97AB] border-b border-slate-200 dark:border-white/[0.07] pb-3">
            <span>Recipient</span>
            <span className="font-mono text-slate-950 dark:text-[#F3F5F7] truncate">
              {channel === 'whatsapp' ? member.phone : member.email || 'Not provided'}
            </span>
          </div>

          {/* Quick Templates */}
          <div>
            <span className="block text-xs font-medium text-slate-800 dark:text-[#CBD5E1] mb-2">
              Quick Templates
            </span>
            <div className="flex flex-wrap gap-2">
              {templates.map((tpl) => {
                const isActive = activeTemplateId === tpl.id;
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => handleSelectTemplate(tpl.id)}
                    className={`min-h-[38px] rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                      isActive
                        ? 'border-slate-950 bg-slate-950 text-[#C8FF00] dark:border-[#C8FF00]/60 dark:bg-[#C8FF00]/10 dark:text-[#C8FF00]'
                        : 'border-slate-300 bg-white text-slate-700 hover:text-slate-950 dark:border-white/[0.09] dark:bg-[#0B0E13] dark:text-[#94A3B8] dark:hover:text-[#F3F5F7]'
                    }`}
                  >
                    {tpl.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Email Subject */}
          {channel === 'email' && (
            <div>
              <label
                htmlFor="composer-subject"
                className="block text-xs font-medium text-slate-800 dark:text-[#CBD5E1] mb-1.5"
              >
                Subject
              </label>
              <input
                id="composer-subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full min-h-[44px] rounded-lg border border-slate-300 dark:border-white/[0.12] bg-white dark:bg-[#0B0E13] px-3.5 py-2.5 text-sm text-slate-950 dark:text-[#F3F5F7] focus:border-slate-950 dark:focus:border-[#C8FF00] focus:outline-none"
              />
            </div>
          )}

          {/* Message Body */}
          <div>
            <label
              htmlFor="composer-message"
              className="block text-xs font-medium text-slate-800 dark:text-[#CBD5E1] mb-1.5"
            >
              Message
            </label>
            <textarea
              id="composer-message"
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-white/[0.12] bg-white dark:bg-[#0B0E13] px-3.5 py-2.5 text-sm leading-relaxed text-slate-950 dark:text-[#F3F5F7] focus:border-slate-950 dark:focus:border-[#C8FF00] focus:outline-none resize-none"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-[#0D1117] px-5 py-4 sm:px-6 pb-safe">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-slate-300 dark:border-white/[0.1] bg-white dark:bg-transparent px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-100 dark:text-[#CBD5E1] dark:hover:bg-white/[0.06] dark:hover:text-white transition-colors whitespace-nowrap"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-emerald-700 dark:text-[#C8FF00]" aria-hidden="true" />
                <span className="text-emerald-700 dark:text-[#C8FF00]">Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" aria-hidden="true" />
                <span>Copy Text</span>
              </>
            )}
          </button>

          {channel === 'whatsapp' ? (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => onMarkMessaged(member.id)}
              className="inline-flex min-h-[44px] flex-1 sm:flex-none items-center justify-center gap-2 rounded-lg bg-slate-950 text-[#C8FF00] hover:bg-slate-800 dark:bg-[#C8FF00] dark:text-[#090B0E] dark:hover:bg-[#D6FF3D] px-5 py-2 text-sm font-bold transition-colors whitespace-nowrap"
            >
              <MessageCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Open in WhatsApp</span>
              <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            </a>
          ) : (
            <a
              href={mailtoUrl}
              onClick={() => onMarkMessaged(member.id)}
              className="inline-flex min-h-[44px] flex-1 sm:flex-none items-center justify-center gap-2 rounded-lg bg-slate-950 text-[#C8FF00] hover:bg-slate-800 dark:bg-[#C8FF00] dark:text-[#090B0E] dark:hover:bg-[#D6FF3D] px-5 py-2 text-sm font-bold transition-colors whitespace-nowrap"
            >
              <Mail className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Open Email App</span>
              <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
