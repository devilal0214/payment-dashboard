'use client';

import { useEffect, useState } from 'react';
import BooleanBadge from '@/components/tickets/BooleanBadge';
import StatusBadge from '@/components/tickets/StatusBadge';
import JsonViewer from './JsonViewer';
import DocumentLink from './DocumentLink';

interface DetailDrawerProps {
  ticketId: number;
  onClose: () => void;
}

type Section = 'claim' | 'customer' | 'flight' | 'payment' | 'dashboard' | 'documents' | 'marketing' | 'zendesk' | 'advanced';

function Field({ label, value, isMono = false }: { label: string; value?: string | number | null; isMono?: boolean }) {
  return (
    <div>
      <p className="text-[11px] uppercase font-mono font-semibold text-zinc-400 tracking-wider">{label}</p>
      <p className={`text-xs text-zinc-900 mt-0.5 font-medium ${isMono ? 'font-mono' : ''}`}>
        {value ?? <span className="text-zinc-400 font-normal">—</span>}
      </p>
    </div>
  );
}

function SectionHeader({
  title, section, open, onToggle,
}: { title: string; section: Section; open: boolean; onToggle: (s: Section) => void }) {
  return (
    <button
      onClick={() => onToggle(section)}
      className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-zinc-50 transition-colors border-t border-zinc-100 first:border-0 select-none"
    >
      <span className="text-xs font-bold text-zinc-900 uppercase tracking-wider font-mono">{title}</span>
      <svg
        className={`w-4 h-4 text-zinc-400 transition-transform ${open ? 'rotate-180' : ''}`}
        fill="none" stroke="currentColor" viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  );
}

export default function DetailDrawer({ ticketId, onClose }: DetailDrawerProps) {
  const [ticket, setTicket] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openSections, setOpenSections] = useState<Set<Section>>(
    new Set(['claim', 'customer', 'flight', 'payment', 'dashboard', 'documents', 'marketing', 'zendesk']),
  );

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/tickets/${ticketId}`);
        if (!res.ok) throw new Error('Failed to load');
        const json = await res.json();
        setTicket(json.data);
      } catch {
        setError('Failed to load claim details. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [ticketId]);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  function toggleSection(s: Section) {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s); else next.add(s);
      return next;
    });
  }

  const t = ticket as Record<string, unknown> | null;
  const str = (key: string) => t?.[key] != null ? String(t[key]) : undefined;
  const bool = (key: string) => !!(t?.[key]);

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer-panel w-[640px] max-w-full animate-slide-in-right flex flex-col bg-white" id="detail-drawer">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-zinc-200 px-5 py-4 flex items-start justify-between z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-base font-bold text-zinc-950 font-mono">
                {str('claim_number') || `Record #${ticketId}`}
              </h2>
              {str('claim_status') && (
                <StatusBadge type="claim" value={str('claim_status')!} />
              )}
            </div>
            <p className="text-xs text-zinc-500 font-mono">
              {[str('first_name'), str('last_name')].filter(Boolean).join(' ')} · {str('airline')} {str('flight_number')}
            </p>
          </div>
          <button
            id="detail-drawer-close"
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-950 p-1 shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="p-6 space-y-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="skeleton h-6 rounded" style={{ width: `${60 + (i % 3) * 15}%` }} />
            ))}
          </div>
        ) : error ? (
          <div className="p-6 text-center text-zinc-500 text-sm font-medium">{error}</div>
        ) : t ? (
          <div className="flex-1 overflow-y-auto divide-y divide-zinc-100">

            {/* 1. Claim */}
            <div>
              <SectionHeader title="1. Claim Details" section="claim" open={openSections.has('claim')} onToggle={toggleSection} />
              {openSections.has('claim') && (
                <div className="px-5 pb-5 grid grid-cols-2 gap-4">
                  <Field label="Claim Number" value={str('claim_number')} isMono />
                  <Field label="Claim Status" value={str('claim_status')} />
                  <Field label="Closure Reason" value={str('closure_reason')} />
                  <Field label="Source" value={str('source')} />
                  <Field label="Post ID" value={str('post_id')} isMono />
                  <Field label="Ticket ID" value={str('ticket_id')} isMono />
                </div>
              )}
            </div>

            {/* 2. Customer */}
            <div>
              <SectionHeader title="2. Customer Profile" section="customer" open={openSections.has('customer')} onToggle={toggleSection} />
              {openSections.has('customer') && (
                <div className="px-5 pb-5 grid grid-cols-2 gap-4">
                  <Field label="First Name" value={str('first_name')} />
                  <Field label="Last Name" value={str('last_name')} />
                  <Field label="Email" value={str('email')} isMono />
                  <Field label="Phone" value={str('phone_number')} isMono />
                  <div className="col-span-2"><Field label="Address" value={str('address')} /></div>
                  <Field label="Preferred Language" value={str('preferred_language')} />
                  <Field label="Original Claim Language" value={str('original_claim_language')} />
                </div>
              )}
            </div>

            {/* 3. Flight */}
            <div>
              <SectionHeader title="3. Flight Information" section="flight" open={openSections.has('flight')} onToggle={toggleSection} />
              {openSections.has('flight') && (
                <div className="px-5 pb-5 grid grid-cols-2 gap-4">
                  <Field label="Airline" value={str('airline')} />
                  <Field label="Airline Country" value={str('airline_country')} />
                  <Field label="Flight Number" value={str('flight_number')} isMono />
                  <Field label="Scheduled Date" value={str('scheduled_date')} isMono />
                  <Field label="Departure Airport" value={str('departure_airport')} />
                  <Field label="Departure IATA" value={str('departure_airport_iata')} isMono />
                  <Field label="Destination Airport" value={str('destination_airport')} />
                  <Field label="Destination IATA" value={str('destination_airport_iata')} isMono />
                  <Field label="Departure Country" value={str('departure_country')} />
                  <Field label="Destination Country" value={str('destination_country')} />
                  <div className="col-span-2"><Field label="Complete Route" value={str('complete_route')} /></div>
                  <Field label="Disruption" value={str('disruption')} />
                  <Field label="Problem Reason" value={str('problem_reason')} />
                  <Field label="Booking Reference" value={str('booking_reference_number')} isMono />
                  <Field label="Total Passengers" value={str('total_passengers_number')} isMono />
                </div>
              )}
            </div>

            {/* 4. Payment */}
            <div>
              <SectionHeader title="4. Financial Breakdown" section="payment" open={openSections.has('payment')} onToggle={toggleSection} />
              {openSections.has('payment') && (
                <div className="px-5 pb-5 grid grid-cols-2 gap-4">
                  <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-md">
                    <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500">Compensation Amount</p>
                    <p className="text-base font-mono font-bold text-zinc-950 mt-1">
                      {t.compensation_amount != null ? `€${Number(t.compensation_amount).toLocaleString()}` : '—'}
                    </p>
                  </div>
                  <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-md">
                    <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500">Amount Received</p>
                    <p className="text-base font-mono font-bold text-emerald-700 mt-1">
                      {t.amount_received != null ? `€${Number(t.amount_received).toLocaleString()}` : '—'}
                    </p>
                  </div>
                  <Field label="Claim Acceptance Date" value={str('claim_acceptance_date')} isMono />
                  <Field label="Money Received Date" value={str('money_received_date')} isMono />
                  <div className="col-span-2"><Field label="Legal Fee to be Charged" value={str('legal_fee_to_be_charged')} /></div>
                  <div className="col-span-2"><Field label="Payment Info" value={str('payment_info')} /></div>
                  <div>
                    <p className="text-[11px] font-mono font-semibold uppercase text-zinc-400 mb-1">Need Payment Details</p>
                    <BooleanBadge value={bool('need_payment_details')} trueLabel="Needed" falseLabel="OK" />
                  </div>
                  <div>
                    <p className="text-[11px] font-mono font-semibold uppercase text-zinc-400 mb-1">Need Re-sign</p>
                    <BooleanBadge value={bool('need_resign')} trueLabel="Needed" falseLabel="OK" />
                  </div>
                </div>
              )}
            </div>

            {/* 5. Dashboard */}
            <div>
              <SectionHeader title="5. Dashboard State" section="dashboard" open={openSections.has('dashboard')} onToggle={toggleSection} />
              {openSections.has('dashboard') && (
                <div className="px-5 pb-5 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[11px] font-mono font-semibold uppercase text-zinc-400 mb-1">Dashboard Status</p>
                    <StatusBadge type="dashboard" value={str('dashboard_status') ?? ''} />
                  </div>
                  <div>
                    <p className="text-[11px] font-mono font-semibold uppercase text-zinc-400 mb-1">Dashboard Completed</p>
                    <BooleanBadge value={bool('is_dashboard_completed')} trueLabel="Completed" falseLabel="Not Done" />
                  </div>
                  {str('dashboard_link') && (
                    <div className="col-span-2">
                      <p className="text-[11px] font-mono font-semibold uppercase text-zinc-400 mb-1">Dashboard Link</p>
                      <a
                        href={str('dashboard_link')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-mono text-zinc-900 underline hover:text-zinc-600 break-all"
                      >
                        {str('dashboard_link')}
                      </a>
                    </div>
                  )}
                  <Field label="Call Status" value={str('call_status')} />
                  <div>
                    <p className="text-[11px] font-mono font-semibold uppercase text-zinc-400 mb-1">Acceptance Date Mandatory</p>
                    <BooleanBadge value={bool('acceptance_date_mandatory')} />
                  </div>
                </div>
              )}
            </div>

            {/* 6. Documents */}
            <div>
              <SectionHeader title="6. Document Verification" section="documents" open={openSections.has('documents')} onToggle={toggleSection} />
              {openSections.has('documents') && (
                <div className="px-5 pb-5 space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <DocumentLink label="Assignment Form" url={str('assignment_form')} />
                    <DocumentLink label="Boarding Pass" url={str('boarding_pass')} />
                    <DocumentLink label="Passport" url={str('passport')} />
                    <DocumentLink label="Signature" url={str('signature')} />
                    <DocumentLink label="Documents" url={str('documents')} />
                  </div>
                  {str('missing_documents') && (
                    <div>
                      <p className="text-[11px] font-mono font-semibold uppercase text-zinc-400 mb-1">Missing Documents</p>
                      <p className="text-xs text-rose-600 font-mono">{str('missing_documents')}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 7. Marketing */}
            <div>
              <SectionHeader title="7. Marketing & Attribution" section="marketing" open={openSections.has('marketing')} onToggle={toggleSection} />
              {openSections.has('marketing') && (
                <div className="px-5 pb-5 grid grid-cols-2 gap-4">
                  <Field label="Source" value={str('source')} />
                  <Field label="FBCLID" value={str('fbclid')} isMono />
                  <Field label="GCLID" value={str('gclid')} isMono />
                  <Field label="UTM Source" value={str('utm_source')} />
                  <Field label="UTM Medium" value={str('utm_medium')} />
                  <Field label="UTM Campaign" value={str('utm_campaign')} />
                  <Field label="UTM Content" value={str('utm_content')} />
                  <Field label="UTM ID" value={str('utm_id')} isMono />
                </div>
              )}
            </div>

            {/* 8. Zendesk */}
            <div>
              <SectionHeader title="8. Zendesk Ticket Data" section="zendesk" open={openSections.has('zendesk')} onToggle={toggleSection} />
              {openSections.has('zendesk') && (
                <div className="px-5 pb-5 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[11px] font-mono font-semibold uppercase text-zinc-400 mb-1">Ticket Status</p>
                    <StatusBadge type="ticket" value={str('ticket_status') ?? ''} />
                  </div>
                  <Field label="Requester" value={str('requester')} />
                  <Field label="Assignee" value={str('assignee')} />
                  <Field label="Requested Date" value={str('requested_date')} isMono />
                  <Field label="Solved Date" value={str('solved_date')} isMono />
                </div>
              )}
            </div>

            {/* 9. Advanced */}
            <div>
              <SectionHeader title="9. Advanced Metadata (JSON)" section="advanced" open={openSections.has('advanced')} onToggle={toggleSection} />
              {openSections.has('advanced') && (
                <div className="px-5 pb-5 space-y-3">
                  <p className="text-[11px] font-mono text-zinc-600 bg-zinc-100 border border-zinc-200 rounded px-3 py-2">
                    🔒 Access to raw metadata payloads is restricted and logged.
                  </p>
                  <JsonViewer label="payload_json" value={t.payload_json} />
                  <JsonViewer label="previous_meta_json" value={t.previous_meta_json} />
                  <JsonViewer label="zendesk_payload_json" value={t.zendesk_payload_json} />
                </div>
              )}
            </div>

          </div>
        ) : null}
      </div>
    </>
  );
}
