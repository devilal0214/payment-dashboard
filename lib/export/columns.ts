/**
 * lib/export/columns.ts
 *
 * Full 59 Payment Team Columns Metadata Specification.
 * Safe to import in both Client and Server components (0 Node.js dependencies).
 */

export interface ColumnSpec {
  id: string;
  label: string;
  dbCol: string; // SQL column name or expression
  defaultVisible: boolean;
  type: 'text' | 'date' | 'currency' | 'badge' | 'boolean' | 'link' | 'json';
}

export const PAYMENT_TEAM_COLUMNS: ColumnSpec[] = [
  { id: 'ticket_id', label: 'Ticket Id', dbCol: 'ticket_id', defaultVisible: true, type: 'text' },
  { id: 'requested_date', label: 'Requested Date', dbCol: 'requested_date', defaultVisible: true, type: 'date' },
  { id: 'ticket_status', label: 'Ticket Status', dbCol: 'ticket_status', defaultVisible: true, type: 'badge' },
  { id: 'claim_status', label: 'Claim Status', dbCol: 'claim_status', defaultVisible: true, type: 'badge' },
  { id: 'claim_number', label: 'Claim Number', dbCol: 'claim_number', defaultVisible: true, type: 'text' },
  { id: 'first_name', label: 'First Name', dbCol: 'first_name', defaultVisible: true, type: 'text' },
  { id: 'last_name', label: 'Last Name', dbCol: 'last_name', defaultVisible: true, type: 'text' },
  { id: 'email', label: 'Email', dbCol: 'email', defaultVisible: true, type: 'text' },
  { id: 'airline', label: 'Airline', dbCol: 'airline', defaultVisible: true, type: 'text' },
  { id: 'flight_number', label: 'Flight Number', dbCol: 'flight_number', defaultVisible: true, type: 'text' },
  { id: 'scheduled_date', label: 'Scheduled Date', dbCol: 'scheduled_date', defaultVisible: true, type: 'date' },
  { id: 'compensation_amount', label: 'Compensation Amount', dbCol: 'compensation_amount', defaultVisible: true, type: 'currency' },
  { id: 'amount_received', label: 'Amount Received', dbCol: 'amount_received', defaultVisible: true, type: 'currency' },
  { id: 'need_payment_details', label: 'Need Payment Details', dbCol: 'need_payment_details', defaultVisible: true, type: 'boolean' },
  { id: 'need_resign', label: 'Need Re-Sign', dbCol: 'need_resign', defaultVisible: true, type: 'boolean' },
  { id: 'dashboard_status', label: 'Dashboard Status', dbCol: 'dashboard_status', defaultVisible: true, type: 'badge' },
  { id: 'source', label: 'Source', dbCol: 'source', defaultVisible: true, type: 'badge' },
  { id: 'assignee', label: 'Assignee', dbCol: 'assignee', defaultVisible: true, type: 'text' },

  // Additional 41 Payment Team Columns (Total 59)
  { id: 'jurisdiction_1st', label: '1st Jurisdiction', dbCol: 'jurisdiction_1st', defaultVisible: false, type: 'text' },
  { id: 'jurisdiction_2nd', label: '2nd Jurisdiction', dbCol: 'jurisdiction_2nd', defaultVisible: false, type: 'text' },
  { id: 'address', label: 'Address', dbCol: 'address', defaultVisible: false, type: 'text' },
  { id: 'airline_country', label: 'Airline Country', dbCol: 'airline_country', defaultVisible: false, type: 'text' },
  { id: 'airline_rejection_reason', label: 'Airline Rejection Reason', dbCol: 'airline_rejection_reason', defaultVisible: false, type: 'text' },
  { id: 'assignment_form', label: 'Assignment Form', dbCol: 'assignment_form', defaultVisible: false, type: 'link' },
  { id: 'boarding_pass', label: 'Boarding Pass Or E-Ticket', dbCol: 'boarding_pass', defaultVisible: false, type: 'link' },
  { id: 'passport', label: 'Passport', dbCol: 'passport', defaultVisible: false, type: 'link' },
  { id: 'signature', label: 'Signature', dbCol: 'signature', defaultVisible: false, type: 'link' },
  { id: 'booking_reference_number', label: 'Booking Reference Number', dbCol: 'booking_reference_number', defaultVisible: false, type: 'text' },
  { id: 'call_status', label: 'Call Status', dbCol: 'call_status', defaultVisible: false, type: 'text' },
  { id: 'claim_acceptance_date', label: 'Claim Acceptance Date', dbCol: 'claim_acceptance_date', defaultVisible: false, type: 'date' },
  { id: 'closure_reason', label: 'Closure Reason', dbCol: 'closure_reason', defaultVisible: false, type: 'text' },
  { id: 'departure_airport_iata', label: 'Departure Airport Iata', dbCol: 'departure_airport_iata', defaultVisible: false, type: 'text' },
  { id: 'departure_country', label: 'Departure Country', dbCol: 'departure_country', defaultVisible: false, type: 'text' },
  { id: 'destination_airport_iata', label: 'Destination Airport Iata', dbCol: 'destination_airport_iata', defaultVisible: false, type: 'text' },
  { id: 'destination_country', label: 'Destination Country', dbCol: 'destination_country', defaultVisible: false, type: 'text' },
  { id: 'disruption', label: 'Disruption', dbCol: 'disruption', defaultVisible: false, type: 'text' },
  { id: 'post_id', label: 'External Id', dbCol: 'post_id', defaultVisible: false, type: 'text' },
  { id: 'fbclid', label: 'Fbclid', dbCol: 'fbclid', defaultVisible: false, type: 'text' },
  { id: 'gclid', label: 'Gclid', dbCol: 'gclid', defaultVisible: false, type: 'text' },
  { id: 'is_dashboard_completed', label: 'Is Dashboard Completed', dbCol: 'is_dashboard_completed', defaultVisible: false, type: 'boolean' },
  { id: 'latest_update', label: 'Latest Update', dbCol: 'latest_update', defaultVisible: false, type: 'text' },
  { id: 'latest_update_by_requester', label: 'Latest Update By Requester', dbCol: 'latest_update_by_requester', defaultVisible: false, type: 'text' },
  { id: 'legal_fee_to_be_charged', label: 'Legal Fee To Be Charged', dbCol: 'legal_fee_to_be_charged', defaultVisible: false, type: 'text' },
  { id: 'linked_data', label: 'Linked Data', dbCol: 'linked_data', defaultVisible: false, type: 'json' },
  { id: 'missing_documents', label: 'Missing Documents', dbCol: 'missing_documents', defaultVisible: false, type: 'text' },
  { id: 'money_received_date', label: 'Money Received Date', dbCol: 'money_received_date', defaultVisible: false, type: 'date' },
  { id: 'original_claim_language', label: 'Original Claim Language', dbCol: 'original_claim_language', defaultVisible: false, type: 'text' },
  { id: 'payment_info', label: 'Payment Info', dbCol: 'payment_info', defaultVisible: false, type: 'text' },
  { id: 'phone_number', label: 'Phone Number', dbCol: 'phone_number', defaultVisible: false, type: 'text' },
  { id: 'preferred_language', label: 'Preferred Language Of Communication', dbCol: 'preferred_language', defaultVisible: false, type: 'text' },
  { id: 'problem_reason', label: 'Problem Reason', dbCol: 'problem_reason', defaultVisible: false, type: 'text' },
  { id: 'refly_rejection_reasons', label: 'Refly Rejection Reasons', dbCol: 'refly_rejection_reasons', defaultVisible: false, type: 'text' },
  { id: 'requester', label: 'Requester', dbCol: 'requester', defaultVisible: false, type: 'text' },
  { id: 'solved_date', label: 'Solved Date', dbCol: 'solved_date', defaultVisible: false, type: 'date' },
  { id: 'dashboard_link', label: 'Step Link', dbCol: 'dashboard_link', defaultVisible: false, type: 'link' },
  { id: 'submitted_lawyer_statuses', label: 'Submitted Lawyer Statuses', dbCol: 'submitted_lawyer_statuses', defaultVisible: false, type: 'json' },
  { id: 'tags', label: 'Tags', dbCol: 'tags', defaultVisible: false, type: 'text' },
  { id: 'total_passengers_number', label: 'Total Passengers Number', dbCol: 'total_passengers_number', defaultVisible: false, type: 'text' },
  { id: 'utm', label: 'UTM', dbCol: "CONCAT_WS(' / ', NULLIF(utm_source,''), NULLIF(utm_medium,''), NULLIF(utm_campaign,''))", defaultVisible: false, type: 'text' },
  { id: 'where_did_you_hear_about_refly', label: 'Where Did You Hear About Refly', dbCol: 'where_did_you_hear_about_refly', defaultVisible: false, type: 'text' },
  { id: 'complete_route', label: 'Complete Route', dbCol: "COALESCE(complete_route, CONCAT_WS(' → ', NULLIF(departure_airport,''), NULLIF(destination_airport,'')))", defaultVisible: false, type: 'text' },
];
