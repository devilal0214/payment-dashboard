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

// Section toggle state
type Section = 'claim' | 'customer' | 'flight' | 'payment' | 'dashboard' | 'documents' | 'marketing' | 'zendesk' | 'advanced';

function Field({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <p className="text-xs text-text-muted">{label}</p>
      <p className="text-sm text-text-primary mt-0.5">{value ?? <span className="text-text-muted">—</span>}</p>
    </div>
  );
}

function SectionHeader({
  title, section, open, onToggle,
}: { title: string; section: Section; open: boolean; onToggle: (s: Section) => void }) {
  return (
    <button
      onClick={() => onToggle(section)}
      className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-surface-3 transition-colors"
    >
      <span className="text-sm font-semibold text-text-primary">{title}</span>
      <svg
        className={`w-4 h-4 text-text-muted transition-transform ${open ? 'rotate-180' : ''}`}
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

  // Close on Escape
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
      <div className="drawer-panel w-[640px] max-w-full animate-slide-in-right" id="detail-drawer">
        {/* Header */}
        <div className="sticky top-0 bg-surface-1 border-b border-border px-5 py-4 flex items-start justify-between z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-sm font-bold text-text-primary">
                {str('claim_number') || `Ticket #${ticketId}`}
              </h2>
              {str('claim_status') && (
                <StatusBadge type="claim" value={str('claim_status')!} />
              )}
            </div>
            <p className="text-xs text-text-muted">
              {[str('first_name'), str('last_name')].filter(Boolean).join(' ')} · {str('airline')} {str('flight_number')}
            </p>
          </div>
          <button
            id="detail-drawer-close"
            onClick={onClose}
            className="text-text-muted hover:text-text-primary mt-0.5 shrink-0"
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
          <div className="p-6 text-center text-text-secondary text-sm">{error}</div>
        ) : t ? (
          <div className="divide-y divide-border">

            {/* ── 1. Claim ────────────────────────────────── */}
            <div>
              <SectionHeader title="1. Claim" section="claim" open={openSections.has('claim')} onToggle={toggleSection} />
              {openSections.has('claim') && (
                <div className="px-5 pb-5 grid grid-cols-2 gap-4">
                  <Field label="Claim Number" value={str('claim_number')} />
                  <Field label="Claim Status" value={str('claim_status')} />
                  <Field label="Closure Reason" value={str('closure_reason')} />
                  <Field label="Source" value={str('source')} />
                  <Field label="Post ID" value={str('post_id')} />
                  <Field label="Ticket ID" value={str('ticket_id')} />
                </div>
              )}
            </div>

            {/* ── 2. Customer ─────────────────────────────── */}
            <div>
              <SectionHeader title="2. Customer" section="customer" open={openSections.has('customer')} onToggle={toggleSection} />
              {openSections.has('customer') && (
                <div className="px-5 pb-5 grid grid-cols-2 gap-4">
                  <Field label="First Name" value={str('first_name')} />
                  <Field label="Last Name" value={str('last_name')} />
                  <Field label="Email" value={str('email')} />
                  <Field label="Phone" value={str('phone_number')} />
                  <div className="col-span-2"><Field label="Address" value={str('address')} /></div>
                  <Field label="Preferred Language" value={str('preferred_language')} />
                  <Field label="Original Claim Language" value={str('original_claim_language')} />
                </div>
              )}
            </div>

            {/* ── 3. Flight ────────────────────────────────── */}
            <div>
              <SectionHeader title="3. Flight" section="flight" open={openSections.has('flight')} onToggle={toggleSection} />
              {openSections.has('flight') && (
                <div className="px-5 pb-5 grid grid-cols-2 gap-4">
                  <Field label="Airline" value={str('airline')} />
                  <Field label="Airline Country" value={str('airline_country')} />
                  <Field label="Flight Number" value={str('flight_number')} />
                  <Field label="Scheduled Date" value={str('scheduled_date')} />
                  <Field label="Departure Airport" value={str('departure_airport')} />
                  <Field label="Departure IATA" value={str('departure_airport_iata')} />
                  <Field label="Destination Airport" value={str('destination_airport')} />
                  <Field label="Destination IATA" value={str('destination_airport_iata')} />
                  <Field label="Departure Country" value={str('departure_country')} />
                  <Field label="Destination Country" value={str('destination_country')} />
                  <div className="col-span-2"><Field label="Complete Route" value={str('complete_route')} /></div>
                  <Field label="Disruption" value={str('disruption')} />
                  <Field label="Problem Reason" value={str('problem_reason')} />
                  <Field label="Booking Reference" value={str('booking_reference_number')} />
                  <Field label="Total Passengers" value={str('total_passengers_number')} />
                </div>
              )}
            </div>

            {/* ── 4. Payment ───────────────────────────────── */}
            <div>
              <SectionHeader title="4. Payment" section="payment" open={openSections.has('payment')} onToggle={toggleSection} />
              {openSections.has('payment') && (
                <div className="px-5 pb-5 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-text-muted">Compensation Amount</p>
                    <p className="text-sm font-semibold text-teal-400 mt-0.5">
                      {t.compensation_amount != null ? `€${Number(t.compensation_amount).toLocaleString()}` : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-text-muted">Amount Received</p>
                    <p className="text-sm font-semibold text-green-400 mt-0.5">
                      {t.amount_received != null ? `€${Number(t.amount_received).toLocaleString()}` : '—'}
                    </p>
                  </div>
                  <Field label="Claim Acceptance Date" value={str('claim_acceptance_date')} />
                  <Field label="Money Received Date" value={str('money_received_date')} />
                  <div className="col-span-2"><Field label="Legal Fee to be Charged" value={str('legal_fee_to_be_charged')} /></div>
                  <div className="col-span-2"><Field label="Payment Info" value={str('payment_info')} /></div>
                  <div>
                    <p className="text-xs text-text-muted mb-1">Need Payment Details</p>
                    <BooleanBadge value={bool('need_payment_details')} trueLabel="Needed" falseLabel="OK" />
                  </div>
                  <div>
                    <p className="text-xs text-text-muted mb-1">Need Re-sign</p>
                    <BooleanBadge value={bool('need_resign')} trueLabel="Needed" falseLabel="OK" />
                  </div>
                </div>
              )}
            </div>

            {/* ── 5. Dashboard ─────────────────────────────── */}
            <div>
              <SectionHeader title="5. Dashboard" section="dashboard" open={openSections.has('dashboard')} onToggle={toggleSection} />
              {openSections.has('dashboard') && (
                <div className="px-5 pb-5 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-text-muted">Dashboard Status</p>
                    <div className="mt-1"><StatusBadge type="dashboard" value={str('dashboard_status') ?? ''} /></div>
                  </div>
                  <div>
                    <p className="text-xs text-text-muted mb-1">Dashboard Completed</p>
                    <BooleanBadge value={bool('is_dashboard_completed')} trueLabel="Completed" falseLabel="Not Done" />
                  </div>
                  {str('dashboard_link') && (
                    <div className="col-span-2">
                      <p className="text-xs text-text-muted mb-1">Dashboard Link</p>
                      <a
                        href={str('dashboard_link')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-brand-400 hover:text-brand-300 underline-offset-2 hover:underline break-all"
                      >
                        {str('dashboard_link')}
                      </a>
                    </div>
                  )}
                  <Field label="Call Status" value={str('call_status')} />
                  <div>
                    <p className="text-xs text-text-muted mb-1">Acceptance Date Mandatory</p>
                    <BooleanBadge value={bool('acceptance_date_mandatory')} />
                  </div>
                </div>
              )}
            </div>

            {/* ── 6. Documents ─────────────────────────────── */}
            <div>
              <SectionHeader title="6. Documents" section="documents" open={openSections.has('documents')} onToggle={toggleSection} />
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
                      <p className="text-xs text-text-muted mb-1">Missing Documents</p>
                      <p className="text-sm text-rose-400">{str('missing_documents')}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── 7. Marketing ─────────────────────────────── */}
            <div>
              <SectionHeader title="7. Marketing" section="marketing" open={openSections.has('marketing')} onToggle={toggleSection} />
              {openSections.has('marketing') && (
                <div className="px-5 pb-5 grid grid-cols-2 gap-4">
                  <Field label="Source" value={str('source')} />
                  <Field label="FBCLID" value={str('fbclid')} />
                  <Field label="GCLID" value={str('gclid')} />
                  <Field label="UTM Source" value={str('utm_source')} />
                  <Field label="UTM Medium" value={str('utm_medium')} />
                  <Field label="UTM Campaign" value={str('utm_campaign')} />
                  <Field label="UTM Content" value={str('utm_content')} />
                  <Field label="UTM ID" value={str('utm_id')} />
                  <div className="col-span-2">
                    <Field label="Where did you hear about ReFly?" value={str('where_did_you_hear_about_refly')} />
                  </div>
                </div>
              )}
            </div>

            {/* ── 8. Zendesk Ticket ────────────────────────── */}
            <div>
              <SectionHeader title="8. Zendesk Ticket" section="zendesk" open={openSections.has('zendesk')} onToggle={toggleSection} />
              {openSections.has('zendesk') && (
                <div className="px-5 pb-5 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-text-muted">Ticket Status</p>
                    <div className="mt-1"><StatusBadge type="ticket" value={str('ticket_status') ?? ''} /></div>
                  </div>
                  <Field label="Requester" value={str('requester')} />
                  <Field label="Assignee" value={str('assignee')} />
                  <Field label="Requested Date" value={str('requested_date')} />
                  <Field label="Solved Date" value={str('solved_date')} />
                  <div className="col-span-2">
                    <Field label="Latest Update" value={str('latest_update')} />
                  </div>
                  <div className="col-span-2">
                    <Field label="Latest Update By Requester" value={str('latest_update_by_requester')} />
                  </div>
                </div>
              )}
            </div>

            {/* ── 9. Advanced Data (collapsed by default) ─── */}
            <div>
              <SectionHeader title="9. Advanced Data" section="advanced" open={openSections.has('advanced')} onToggle={toggleSection} />
              {openSections.has('advanced') && (
                <div className="px-5 pb-5 space-y-4">
                  <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                    ⚠️ Raw JSON fields. This data is logged as accessed.
                  </p>
                  <JsonViewer label="payload_json" value={t.payload_json} />
                  <JsonViewer label="previous_meta_json" value={t.previous_meta_json} />
                  <JsonViewer label="zendesk_payload_json" value={t.zendesk_payload_json} />
                  <JsonViewer label="linked_data" value={t.linked_data} />
                  <JsonViewer label="submitted_lawyer_statuses" value={t.submitted_lawyer_statuses} />
                  <JsonViewer label="refly_rejection_reasons" value={t.refly_rejection_reasons} />
                  <JsonViewer label="airline_rejection_reason" value={t.airline_rejection_reason} />
                </div>
              )}
            </div>

          </div>
        ) : null}
      </div>
    </>
  );
}
