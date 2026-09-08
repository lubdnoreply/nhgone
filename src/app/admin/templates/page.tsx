"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import PageHeader from "@/components/PageHeader";

type TemplateType =
  | "billing"
  | "rr3"
  | "email"
  | "internal_welcome_email"
  | "password_reset_email"
  | "google_signin_notice_email"
  | "approved_email"
  | "st_compare_email"
  | "rr4_compare_email"
  | "st_files_email"
  | "st_files_email_per_property"
  | "rr4_tm30_email"
  | "rr4_tm30_email_per_property";

// Top-level tab groups - "System Email" bundles the account-lifecycle
// emails (welcome/reset/approved/etc) and "Statistic Files" bundles the 2
// ST Files email tabs (bundled + per-property), each under one umbrella
// pill instead of every member getting its own top-level tab, so the row
// doesn't grow a new pill every time another one is added. Groups with a
// single child behave exactly like a plain tab (no sub-tab row for them).
type TemplateGroup = "billing" | "rr3" | "system_email" | "statistic_files" | "rr4_tm30_files";

const GROUP_CONFIG: Record<TemplateGroup, { label: string; children: TemplateType[] }> = {
  billing: { label: "Billing", children: ["billing"] },
  rr3: { label: "RR3", children: ["rr3"] },
  system_email: {
    label: "System Email",
    children: ["email", "internal_welcome_email", "password_reset_email", "google_signin_notice_email", "approved_email", "st_compare_email", "rr4_compare_email"],
  },
  statistic_files: {
    label: "Statistic Files",
    children: ["st_files_email", "st_files_email_per_property"],
  },
  rr4_tm30_files: {
    label: "RR4 / TM30 Files",
    children: ["rr4_tm30_email", "rr4_tm30_email_per_property"],
  },
};

const groupOf = (t: TemplateType): TemplateGroup =>
  (Object.keys(GROUP_CONFIG) as TemplateGroup[]).find((g) => GROUP_CONFIG[g].children.includes(t)) || "billing";

interface TokenDoc {
  name: string;
  description: string;
}

const BILLING_TOKENS: TokenDoc[] = [
  { name: "InvoiceNoF", description: "Bill/invoice number" },
  { name: "DateF", description: "Issued date (DD/MM/YYYY)" },
  { name: "OwnerName", description: "Guest or company name" },
  { name: "AddressLine1", description: "Address line 1 (through AddressLine5)" },
  { name: "PostCode", description: "Postal code" },
  { name: "TAXID", description: "Guest/company Tax ID (not the property's own)" },
  { name: "No1", description: "Line item row number (through No5)" },
  { name: "Description1", description: "Line item description (through Description5)" },
  { name: "AmountP1", description: "Line item amount (through AmountP5)" },
  { name: "BahtTextE", description: "Total spelled out in Thai" },
  { name: "SubTotal", description: "Net amount before taxes" },
  { name: "VATC", description: "VAT rate (always 7%)" },
  { name: "VAT", description: "VAT amount (7% only, provincial tax excluded)" },
  { name: "PTC", description: "Provincial tax rate, e.g. 1%" },
  { name: "PT", description: "Provincial tax amount (separated from VAT, like the MEWS bill)" },
  { name: "NetAmount", description: "Total amount" },
  { name: "CH", description: "Cash payment checkbox (☑/☐)" },
  { name: "CD", description: "Credit card payment checkbox" },
  { name: "BT", description: "Bank transfer payment checkbox" },
  { name: "CK", description: "Cheque payment checkbox" },
  { name: "BankTransferDateF", description: "Bank transfer date" },
  { name: "BankTransferRef", description: "Bank transfer reference" },
  { name: "BankName", description: "Cheque bank name" },
  { name: "Branch", description: "Cheque bank branch" },
  { name: "CNo", description: "Cheque number" },
  { name: "CDateF", description: "Cheque date" },
];

const RR3_TOKENS: TokenDoc[] = [
  { name: "HotelName", description: "Hotel name in Thai (on the card title line)" },
  { name: "FirstName", description: "Guest first name" },
  { name: "LastName", description: "Guest surname" },
  { name: "IdBoxes", description: "Thai ID card number as 13 digit boxes (pre-built HTML)" },
  { name: "IdentityCardNumber", description: "Thai ID card number as plain text" },
  { name: "AlienBook", description: "Alien registration book no." },
  { name: "PassportNumber", description: "Passport no." },
  { name: "Occupation", description: "Occupation (default นักธุรกิจ)" },
  { name: "NationalityName", description: "Nationality (Thai name)" },
  { name: "NationalityCode", description: "Nationality country code, e.g. GB" },
  { name: "AddressDetails", description: "Current address" },
  { name: "Telephone", description: "Telephone no." },
  { name: "Email", description: "Guest email" },
  { name: "Departure", description: "Place of departure (1.2, blank by default)" },
  { name: "Destination", description: "Next destination (2.2, blank by default)" },
  { name: "CheckIn", description: "Arrival date (DD/MM/YYYY)" },
  { name: "CheckInTime", description: "Arrival time (HH:MM)" },
  { name: "CheckOut", description: "Expected departure date" },
  { name: "CheckOutTime", description: "Expected departure time" },
  { name: "RoomNumber", description: "Room no." },
  { name: "GuestSign", description: "Guest full name (under the signature line)" },
  { name: "ReservationsNumber", description: "MEWS reservation/confirmation number" },
];

const EMAIL_TOKENS: TokenDoc[] = [
  { name: "FullName", description: "New user's full name (falls back to their email if blank)" },
  { name: "Email", description: "New user's email - also the Google account they should sign in with" },
  { name: "AppLink", description: "The app's sign-in URL (the button and the plain-text link both use this)" },
];

const INTERNAL_WELCOME_EMAIL_TOKENS: TokenDoc[] = [
  { name: "FullName", description: "New user's full name (falls back to their email if blank)" },
  { name: "Email", description: "New user's email - also the Internal Users login they should sign in with" },
  { name: "SetPasswordLink", description: "Single-use Supabase link that lets them choose their password - must stay in the button's href. Removing it sends an email with no way in." },
];

const PASSWORD_RESET_EMAIL_TOKENS: TokenDoc[] = [
  { name: "FullName", description: "Account holder's full name (falls back to their email if blank)" },
  { name: "ResetLink", description: "Single-use Supabase link that lets them choose a new password - must stay in the button's href. Removing it sends an email with no way in." },
];

const GOOGLE_SIGNIN_NOTICE_EMAIL_TOKENS: TokenDoc[] = [
  { name: "FullName", description: "Account holder's full name (falls back to their email if blank)" },
  { name: "AppLink", description: "The app's sign-in URL (the button and the plain-text link both use this)" },
];

const APPROVED_EMAIL_TOKENS: TokenDoc[] = [
  { name: "FullName", description: "The approved user's full name (falls back to their email if blank)" },
  { name: "Role", description: "The role picked in the Approve dialog (e.g. Front Office, Finance)" },
  { name: "Email", description: "The approved user's email - also the Google account they should sign in with" },
  { name: "AppLink", description: "The app's sign-in URL (the button and the plain-text link both use this)" },
];

const ST_FILES_EMAIL_TOKENS: TokenDoc[] = [
  { name: "Date", description: "Report date (DD/MM/YYYY)" },
  { name: "PropertyCount", description: "Number of properties included in this email" },
  { name: "PropertyList", description: "Comma-separated list of included property names" },
  { name: "StatsTable", description: "Pre-built HTML table, one row per property: Property, Code, Spaces, Occupied, House Uses, Out of Order, Availability, Customers, Arrivals, Departures, Complimentary, No. of Day" },
];

// Mirrors DEFAULT_ST_FILES_DAILY_PER_PROPERTY_SUBJECT/TEMPLATE in
// api/app/services/email_service.py exactly - the built-in fallback shown
// when a property hasn't saved its own custom Subject/HTML yet (Admin >
// Templates > Statistic Files > Per-Property panel).
const DEFAULT_ST_FILES_EMAIL_PER_PROPERTY_SUBJECT = "NHGOne ST Files — <<Property>> — <<Date>>";
const DEFAULT_ST_FILES_EMAIL_PER_PROPERTY_TEMPLATE = `<div style="background-color:#FFEFD2; padding:40px 16px; font-family: Arial, Helvetica, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:900px; margin:0 auto; background:#ffffff; border:1px solid rgba(21,42,0,0.1); border-radius:4px;">
    <tr>
      <td style="padding:40px;">
        <h1 style="margin:0 0 4px 0; font-family: Georgia, 'Times New Roman', serif; font-size:26px; font-weight:900; color:#152A00; letter-spacing:-0.02em;">NHGOne</h1>
        <p style="margin:0 0 24px 0; font-size:10px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:#152A00; opacity:0.6;">ST Files Daily Export</p>
        <p style="margin:0 0 20px 0; font-size:14px; color:#152A00; line-height:1.6;">Daily ST statistics export for <b><<Property>></b> (<<PropertyCode>>), <b><<Date>></b>, attached as a CSV.</p>
        <<StatsTable>>
      </td>
    </tr>
  </table>
</div>`;

const ST_FILES_EMAIL_PER_PROPERTY_TOKENS: TokenDoc[] = [
  { name: "Date", description: "Report date (DD/MM/YYYY)" },
  { name: "Property", description: "This email's one property name" },
  { name: "PropertyCode", description: "This property's ST Property Code" },
  { name: "StatsTable", description: "Same pre-built HTML table as the bundled email, but with just this one property's row" },
];

const RR4_TM30_EMAIL_TOKENS: TokenDoc[] = [
  { name: "Date", description: "Report date (DD/MM/YYYY)" },
  { name: "PropertyCount", description: "Number of properties included in this email" },
  { name: "PropertyList", description: "Comma-separated list of included property names" },
  { name: "StatsTable", description: "Pre-built HTML table, one row per property: Property, Code, RR4 Guests, TM30 Arrivals" },
];

// Mirrors DEFAULT_RR4_TM30_DAILY_PER_PROPERTY_SUBJECT/TEMPLATE in
// api/app/services/email_service.py exactly - same fallback-when-unsaved
// reasoning as DEFAULT_ST_FILES_EMAIL_PER_PROPERTY_SUBJECT/TEMPLATE above.
const DEFAULT_RR4_TM30_EMAIL_PER_PROPERTY_SUBJECT = "NHGOne RR4/TM30 — <<Property>> — <<Date>>";
const DEFAULT_RR4_TM30_EMAIL_PER_PROPERTY_TEMPLATE = `<div style="background-color:#FFEFD2; padding:40px 16px; font-family: Arial, Helvetica, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:900px; margin:0 auto; background:#ffffff; border:1px solid rgba(21,42,0,0.1); border-radius:4px;">
    <tr>
      <td style="padding:40px;">
        <h1 style="margin:0 0 4px 0; font-family: Georgia, 'Times New Roman', serif; font-size:26px; font-weight:900; color:#152A00; letter-spacing:-0.02em;">NHGOne</h1>
        <p style="margin:0 0 24px 0; font-size:10px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:#152A00; opacity:0.6;">RR4 / TM30 Daily Export</p>
        <p style="margin:0 0 20px 0; font-size:14px; color:#152A00; line-height:1.6;">Daily RR4 and TM30 filings for <b><<Property>></b> (<<PropertyCode>>), <b><<Date>></b>, attached as two .xlsx files.</p>
        <<StatsTable>>
      </td>
    </tr>
  </table>
</div>`;

const RR4_TM30_EMAIL_PER_PROPERTY_TOKENS: TokenDoc[] = [
  { name: "Date", description: "Report date (DD/MM/YYYY)" },
  { name: "Property", description: "This email's one property name" },
  { name: "PropertyCode", description: "This property's ST Property Code" },
  { name: "StatsTable", description: "Same pre-built HTML table as the bundled email, but with just this one property's row" },
];

// The two verification mails compare what NHGOne produced against the Google
// Sheets that are the ground truth for what actually gets filed. Their tables
// arrive pre-built rather than as loose values: an edit here changes the
// wording around the check, never the numbers inside it.
const ST_COMPARE_TOKENS: TokenDoc[] = [
  { name: "Date", description: "The date the sheets are holding (DD/MM/YYYY) - read from the sheets, not from today's clock" },
  { name: "Matched", description: "How many cells matched, e.g. 68" },
  { name: "Total", description: "How many cells were compared, e.g. 72 (9 metrics x 8 properties)" },
  { name: "Summary", description: "One-line verdict, e.g. \"ตรงกัน 68/72 ช่อง\" - usable in the Subject too" },
  { name: "PropertyCount", description: "How many properties were compared" },
  { name: "Window", description: "When our own snapshots were captured, earliest to latest" },
  { name: "SummaryTable", description: "Pre-built HTML: per-metric \"ตรง X/8\" summary with a Notes column naming which properties differ and a Remark column explaining why that kind of gap can happen at all (e.g. read straight from MEWS vs calculated here)" },
  { name: "GridTable", description: "Pre-built HTML: every property x every metric, ours / sheet, mismatches highlighted - each property name links to that property's own sheet" },
  { name: "SheetLinks", description: "Pre-built HTML: a bulleted list of all 8 properties, each linking to its own \"<Name>-ST\" Google Sheet" },
];

const RR4_COMPARE_TOKENS: TokenDoc[] = [
  { name: "Date", description: "The date most properties' sheets are holding (DD/MM/YYYY) - each property is still compared at its own sheet's date" },
  { name: "Rr4Rows", description: "Total RR4 rows, Google Sheet / NHGOne" },
  { name: "Tm30Rows", description: "Total TM30 rows, Google Sheet / NHGOne" },
  { name: "Rr4Diff", description: "RR4 rows differing on at least one column, known drift excluded" },
  { name: "Tm30Diff", description: "TM30 rows differing on at least one column, known drift excluded" },
  { name: "Summary", description: "One-line verdict, e.g. \"8 rows need review\" - usable in the Subject too" },
  { name: "PropertyCount", description: "How many properties could be compared (of the 6 Thai ones)" },
  { name: "SummaryTable", description: "Table 1 - pre-built HTML: every property, RR4 and TM30 as Google Sheet / NHGOne, green tick when they agree and red cross when they don't" },
  { name: "ColumnTable", description: "Table 2 - pre-built HTML: every difference behind table 1, naming the guests; red needs review, amber is already-explained known drift or a configured-window shortfall" },
  { name: "WindowTable", description: "Table 3 - pre-built HTML: the time each side started sweeping its day (sheet vs ours, RR4 and TM30 separately) and when our own import ran" },
  // SampleTable is deliberately absent: its example rows are part of
  // ColumnTable now. The backend still substitutes it as an empty string so a
  // template saved before that change renders nothing there rather than the
  // literal text "<<SampleTable>>", but there is no reason to offer it here.
];

const TEMPLATE_CONFIG: Record<TemplateType, {
  label: string;
  // Absent for tabs whose editor isn't driven by this generic fetch/save
  // system at all - currently just st_files_email_per_property, whose
  // Subject/HTML are edited per-property instead (see hasPerPropertyRecipients).
  endpoint?: string;
  tokens: TokenDoc[];
  defaultNote: string;
  tokenNote: string;
  perProperty: boolean;
  hasSubject?: boolean;
  previewable?: boolean;
  // Recipients/Time to Send/Enabled fields + a "Send Test Now" button -
  // only the ST Files Email tab is a scheduled digest rather than a
  // triggered-by-an-action template, so these stay optional or every
  // other tab would need to carry unused schedule fields too.
  hasScheduleFields?: boolean;
  // Cc/Bcc fields alongside To - only the two compare/verification mails
  // (Test ST File, Test RR4/TM30 File) have them. The ST/RR4 Files daily
  // digest tabs share hasScheduleFields but not this, so they keep the
  // plain single-recipient row they've always had.
  hasCcBcc?: boolean;
  // Backend route this tab's own "Send Test Now" posts to. Required whenever
  // hasScheduleFields is set - it used to be hardcoded to the ST Files digest,
  // which meant the RR4/TM30 tab's button sent the ST Files email instead of
  // its own.
  sendNowEndpoint?: string;
  // Per-property Enabled/To/Cc/Bcc/Subject/HTML panel (each property fully
  // independent), edited on this tab instead of the generic single-endpoint
  // fetch/save system below - see hasOwnEditor. Currently ST Files Email
  // (Per-Property) and RR4/TM30 Files (Per-Property) both use this, driven
  // by the perProperty* fields beneath it so the two tabs share one editor
  // implementation instead of each carrying its own copy.
  hasPerPropertyRecipients?: boolean;
  // True for tabs whose whole editor (Subject/Preview/Code/Save) is
  // replaced by their own bespoke UI - skips the generic fetchTemplate
  // effect and the generic Subject/Preview/Code/Save block entirely.
  hasOwnEditor?: boolean;
  // The property_api_settings column prefix this tab's per-property panel
  // reads/writes - e.g. "st_files_email" -> st_files_email_enabled,
  // st_files_email_recipients, ..._cc, ..._bcc, ..._hour, ..._minute,
  // ..._subject, ..._template. Required whenever hasPerPropertyRecipients
  // is set.
  perPropertyPrefix?: string;
  // Backend route this tab's own "Send Test Now" button posts to.
  perPropertySendNowEndpoint?: string;
  // Fallback Subject/HTML shown (and saved as the live value) whenever a
  // property hasn't customized its own yet - mirrors the backend's own
  // DEFAULT_..._PER_PROPERTY_SUBJECT/TEMPLATE fallback constants exactly.
  perPropertyDefaultSubject?: string;
  perPropertyDefaultTemplate?: string;
  // Sample token values for this tab's own preview iframe, one property's
  // worth (StatsTable already scoped to a single row).
  perPropertySampleBuilder?: (property: string) => Record<string, string>;
}> = {
  billing: {
    label: "Billing",
    endpoint: "/bills/template",
    tokens: BILLING_TOKENS,
    defaultNote: "This property has no saved billing template yet - showing the generic default. Edit the placeholder company details below and save.",
    tokenNote: "Company name/address/Tax ID are not tokens - type them directly since they're fixed per property.",
    perProperty: true,
    previewable: true,
  },
  rr3: {
    label: "RR3",
    endpoint: "/rr3/template",
    tokens: RR3_TOKENS,
    defaultNote: "No RR3 template saved yet - showing the official-form default. Save to customize it.",
    tokenNote: "Include the <style> block: it controls fonts, the A4 card frame, and page breaks.",
    // The RR3 card is a single fixed government form used by every property -
    // no per-property selector, unlike Billing where each property has its own
    // invoice design.
    perProperty: false,
    previewable: true,
  },
  email: {
    label: "Welcome Email",
    endpoint: "/admin/email-template",
    tokens: EMAIL_TOKENS,
    defaultNote: "No welcome email template saved yet - showing the built-in default. Save to customize it.",
    tokenNote: "Sent when a new Google-auth user is created (Admin > Users > Create New User).",
    perProperty: false,
    hasSubject: true,
    previewable: true,
  },
  internal_welcome_email: {
    label: "Internal Welcome",
    endpoint: "/admin/email-template/internal-welcome",
    tokens: INTERNAL_WELCOME_EMAIL_TOKENS,
    defaultNote: "No Internal Welcome template saved yet - showing the built-in default. Save to customize it.",
    tokenNote: "Sent when a new Internal Auth user is created - carries a single-use set-password link, not a password.",
    perProperty: false,
    hasSubject: true,
    previewable: true,
  },
  password_reset_email: {
    label: "Password Reset",
    endpoint: "/admin/email-template/password-reset",
    tokens: PASSWORD_RESET_EMAIL_TOKENS,
    defaultNote: "No Password Reset template saved yet - showing the built-in default. Save to customize it.",
    tokenNote: "Sent by the login page's \"Forgot password\" link, Internal Auth accounts only.",
    perProperty: false,
    hasSubject: true,
    previewable: true,
  },
  google_signin_notice_email: {
    label: "Google Sign-in Notice",
    endpoint: "/admin/email-template/google-signin-notice",
    tokens: GOOGLE_SIGNIN_NOTICE_EMAIL_TOKENS,
    defaultNote: "No Google Sign-in Notice template saved yet - showing the built-in default. Save to customize it.",
    tokenNote: "Sent instead of a reset link when \"Forgot password\" is used on a Google-auth account.",
    perProperty: false,
    hasSubject: true,
    previewable: true,
  },
  approved_email: {
    label: "Approved",
    endpoint: "/admin/email-template/approved",
    tokens: APPROVED_EMAIL_TOKENS,
    defaultNote: "No Approved template saved yet - showing the built-in default. Save to customize it.",
    tokenNote: "Sent by Admin > Users > Approve, for a pending self-registered signup.",
    perProperty: false,
    hasSubject: true,
    previewable: true,
  },
  st_compare_email: {
    label: "Test ST File",
    endpoint: "/admin/email-template/st-compare",
    tokens: ST_COMPARE_TOKENS,
    defaultNote: "No Test ST File email configured yet - showing the built-in default. Save to customize it.",
    tokenNote: "Sent once a day (Time to Send below) comparing our ST Files numbers against each property's own \"<Name>-ST\" Google Sheet, with every property's ST export CSV attached. Monitoring for the new system's validation period - untick Enabled to stop it. Nothing is sent on a day the sheets aren't in a comparable state, so a stale \"all matched\" can never go out.",
    perProperty: false,
    hasSubject: true,
    previewable: true,
    hasScheduleFields: true,
    hasCcBcc: true,
    sendNowEndpoint: "/admin/email-template/st-compare/send-now",
  },
  rr4_compare_email: {
    label: "Test RR4/TM30 File",
    endpoint: "/admin/email-template/rr4-compare",
    tokens: RR4_COMPARE_TOKENS,
    defaultNote: "No Test RR4/TM30 File email configured yet - showing the built-in default. Save to customize it.",
    tokenNote: "Sent once a day (Time to Send below) comparing our RR4 and TM30 registers row by row against each Thai property's own \"RR4-TM30-<Name>-Gen\" Google Sheet. Lub d Siem Reap and Lub d Philippines Makati are never included - they don't file under the Thai Hotel Act and have no generator sheet.",
    perProperty: false,
    hasSubject: true,
    previewable: true,
    hasScheduleFields: true,
    hasCcBcc: true,
    sendNowEndpoint: "/admin/email-template/rr4-compare/send-now",
  },
  st_files_email: {
    label: "All Property",
    endpoint: "/admin/email-template/st-files-daily",
    tokens: ST_FILES_EMAIL_TOKENS,
    defaultNote: "No ST Files daily email configured yet - showing the built-in default. Save to customize it.",
    tokenNote: "Sent once a day (Time to Send below) with every ready property's ST Files export CSV attached.",
    perProperty: false,
    hasSubject: true,
    previewable: true,
    hasScheduleFields: true,
    sendNowEndpoint: "/admin/email-template/st-files-daily/send-now",
  },
  st_files_email_per_property: {
    label: "Per-Property",
    tokens: ST_FILES_EMAIL_PER_PROPERTY_TOKENS,
    defaultNote: "",
    tokenNote: "Each property below has its own independent Subject/HTML, not a shared template - a property with Enabled turned on gets its own separate email instead of joining the bundled All Property email for that day's send.",
    perProperty: false,
    hasPerPropertyRecipients: true,
    hasOwnEditor: true,
    perPropertyPrefix: "st_files_email",
    perPropertySendNowEndpoint: "/admin/email-template/st-files-daily-per-property/send-now",
    perPropertyDefaultSubject: DEFAULT_ST_FILES_EMAIL_PER_PROPERTY_SUBJECT,
    perPropertyDefaultTemplate: DEFAULT_ST_FILES_EMAIL_PER_PROPERTY_TEMPLATE,
    perPropertySampleBuilder: (property) => ({
      Date: "06/08/2026",
      Property: property || "Property Name",
      PropertyCode: "XX",
      StatsTable: buildStFilesStatsTableSample(1),
    }),
  },
  rr4_tm30_email: {
    label: "All Property",
    endpoint: "/admin/email-template/rr4-tm30-daily",
    tokens: RR4_TM30_EMAIL_TOKENS,
    defaultNote: "No RR4/TM30 daily email configured yet - showing the built-in default. Save to customize it.",
    tokenNote: "Sent once a day (Time to Send below) with every ready Thai property's RR4 + TM30 .xlsx pair attached. Lub d Siem Reap and Lub d Philippines Makati are never included - they don't file under the Thai Hotel Act.",
    perProperty: false,
    hasSubject: true,
    previewable: true,
    hasScheduleFields: true,
    sendNowEndpoint: "/admin/email-template/rr4-tm30-daily/send-now",
  },
  rr4_tm30_email_per_property: {
    label: "Per-Property",
    tokens: RR4_TM30_EMAIL_PER_PROPERTY_TOKENS,
    defaultNote: "",
    tokenNote: "Each property below has its own independent Subject/HTML, not a shared template - a property with Enabled turned on gets its own separate email instead of joining the bundled All Property email for that day's send.",
    perProperty: false,
    hasPerPropertyRecipients: true,
    hasOwnEditor: true,
    perPropertyPrefix: "rr4_tm30_email",
    perPropertySendNowEndpoint: "/admin/email-template/rr4-tm30-daily-per-property/send-now",
    perPropertyDefaultSubject: DEFAULT_RR4_TM30_EMAIL_PER_PROPERTY_SUBJECT,
    perPropertyDefaultTemplate: DEFAULT_RR4_TM30_EMAIL_PER_PROPERTY_TEMPLATE,
    perPropertySampleBuilder: (property) => ({
      Date: "06/08/2026",
      Property: property || "Property Name",
      PropertyCode: "XX",
      StatsTable: buildRr4Tm30StatsTableSample(1),
    }),
  },
};

// Sample values so the Preview tab shows something readable instead of the
// literal <<Token>> placeholders - real prints/sends substitute the actual
// reservation/guest/user data. IdBoxes mirrors src/lib/rr3Template.ts's own
// digit-box HTML since real templates insert it unescaped, not through
// <<Token>> text substitution.
const PREVIEW_SAMPLE_BUILDERS: Record<TemplateType, () => Record<string, string>> = {
  billing: () => ({
    InvoiceNoF: "INV-2026-001234",
    DateF: "03/08/2026",
    OwnerName: "John Doe",
    AddressLine1: "123 Sukhumvit Road, Khlong Toei",
    AddressLine2: "", AddressLine3: "", AddressLine4: "", AddressLine5: "",
    PostCode: "10110",
    TAXID: "1-2345-67890-12-3",
    No1: "1", Description1: "Room Charge - Deluxe Room", AmountP1: "2,500.00",
    No2: "2", Description2: "Breakfast", AmountP2: "300.00",
    No3: "", Description3: "", AmountP3: "",
    No4: "", Description4: "", AmountP4: "",
    No5: "", Description5: "", AmountP5: "",
    BahtTextE: "สองพันแปดร้อยบาทถ้วน",
    SubTotal: "2,616.82",
    VATC: "7%",
    VAT: "183.18",
    PTC: "1%",
    PT: "26.17",
    NetAmount: "2,800.00",
    CH: "☑", CD: "☐", BT: "☐", CK: "☐",
    BankTransferDateF: "", BankTransferRef: "",
    BankName: "", Branch: "", CNo: "", CDateF: "",
  }),
  rr3: () => ({
    // Matches sync_service.py's real _RR3_PROPERTY_THAI_NAMES["Lub d Bangkok
    // Chinatown"] exactly - the actual value get_rr3_cards uses when
    // printing a real card, not an independently-typed placeholder.
    HotelName: "หลับดี แบงค็อก เยาวราช",
    FirstName: "John",
    LastName: "Doe",
    IdBoxes: "1234567890123".split("").map((d) => `<span class="s4">${d}</span>`).join(""),
    IdentityCardNumber: "1234567890123",
    AlienBook: "",
    PassportNumber: "AA1234567",
    Occupation: "นักธุรกิจ",
    NationalityName: "อังกฤษ",
    NationalityCode: "GB",
    AddressDetails: "123 Sukhumvit Road, Bangkok",
    Telephone: "081-234-5678",
    Email: "john.doe@example.com",
    Departure: "",
    Destination: "",
    CheckIn: "03/08/2026", CheckInTime: "14:00",
    CheckOut: "05/08/2026", CheckOutTime: "12:00",
    RoomNumber: "306",
    GuestSign: "John Doe",
    ReservationsNumber: "10234567",
    // Not in RR3_TOKENS above (that list documents the guest-data tokens an
    // admin would want to reference) but the real template also uses these
    // checkbox tokens, filled in by the print page's own regCard state, not
    // by a simple <<Token>> lookup - included here purely so Preview doesn't
    // show leftover literal placeholders for them.
    DepartureCurrentChk: "X", DepartureOtherChk: "", DepartureDetail: "",
    DestinationCurrentChk: "X", DestinationOtherChk: "", DestinationDetail: "",
    MarketingConsentChk: "X",
  }),
  email: () => ({
    FullName: "John Doe",
    Email: "john.doe@example.com",
    AppLink: typeof window !== "undefined" ? window.location.origin : "https://one.naraihospitalitygroup.com",
  }),
  internal_welcome_email: () => ({
    FullName: "John Doe",
    Email: "john.doe@example.com",
    SetPasswordLink: "https://one.naraihospitalitygroup.com/reset-password#token=sample",
  }),
  password_reset_email: () => ({
    FullName: "John Doe",
    ResetLink: "https://one.naraihospitalitygroup.com/reset-password#token=sample",
  }),
  google_signin_notice_email: () => ({
    FullName: "John Doe",
    AppLink: typeof window !== "undefined" ? window.location.origin : "https://one.naraihospitalitygroup.com",
  }),
  approved_email: () => ({
    FullName: "John Doe",
    Role: "Front Office",
    Email: "john.doe@example.com",
    AppLink: typeof window !== "undefined" ? window.location.origin : "https://one.naraihospitalitygroup.com",
  }),
  st_compare_email: () => ({
    Date: "25/08/2026",
    Matched: "68",
    Total: "72",
    Summary: "ตรงกัน 68/72 ช่อง",
    PropertyCount: "8",
    Window: "26 Aug 01:20 – 26 Aug 02:03",
    SummaryTable: buildCompareSampleTable(
      ["Column", "Matched", "Notes", "Remark"],
      [["Spaces", "8/8", "✅", "Read directly from MEWS. A difference means a room or category was added, removed or reassigned after the sheet was pasted."],
       ["Occupied", "8/8", "✅", "Read directly from MEWS. A difference means a booking changed after the sheet was pasted - not something calculated here."],
       ["Arrivals", "6/8", "Samui +3, Siem Reap +10", "MEWS has no Arrivals figure to read - this is calculated here from each reservation's own check-in time."]],
    ),
    GridTable: buildCompareSampleTable(
      ["Property", "Spaces", "Occupied", "Arrivals", "Departures"],
      [["<a href=\"#\">Chinatown</a>", "✓ 176", "✓ 150", "✓ 30", "✓ 28"],
       ["<a href=\"#\">Samui</a>", "✓ 60", "✓ 55", "87 / 84", "✓ 9"]],
    ),
    SheetLinks: '<ul style="margin:4px 0;padding-left:18px;font-size:13px">'
      + ["Chinatown", "Siam", "Samui", "Koh Tao", "Makati", "Patong", "Siem Reap", "Marasca"]
        .map((n) => `<li><a href="#">${n}</a></li>`).join("")
      + "</ul>",
  }),
  // Mirrors rr4_compare_service's three render_* tables - same column order,
  // same "Google Sheet / NHGOne" reading direction, same green-tick /
  // red-cross / amber-known-drift treatment - so the Preview tab shows the
  // shape the 08:00 mail actually sends rather than a generic placeholder.
  rr4_compare_email: () => ({
    Date: "02/09/2026",
    Rr4Rows: "832 / 832",
    Tm30Rows: "239 / 230",
    Rr4Diff: "0",
    Tm30Diff: "0",
    Summary: "9 rows need review",
    PropertyCount: "6",
    SummaryTable: buildCompareSampleTable(
      ["Property", "Date", "RR4 — Sheet / NHGOne", "TM30 — Sheet / NHGOne"],
      [["Chinatown", "2026-09-01", ok("✓ 132 (2 known drift)"),
        bad("✗ 32 / 26 (6 only in the sheet, as our 12:15 window intends)")],
       ["Siam", "2026-09-02", ok("✓ 86"), ok("✓ 20 (1 known drift)")],
       ["Patong", "2026-09-02", ok("✓ 166 (3 known drift)"),
        bad("✗ 42 / 39 (3 only in the sheet, as our 02:05 window intends)")]],
    ),
    ColumnTable: buildCompareSampleTable(
      ["Property", "Register", "What differs", "Guest", "Google Sheet", "NHGOne", "Why"],
      [["Siam", "TM30", "nationality<br><small>2 rows</small>", "Nikolaos Pantotis · AP1234567",
        "GRL", "GRC", bad("Needs review")],
       ["Chinatown", "TM30", "Guest only in the sheet<br><small>6 rows</small>",
        "Marco Rossi · YB9912345", "present", "missing",
        amber("Expected — our TM30 day starts at 12:15, so a guest arriving before that is filed on the previous day")],
       ["Samui", "RR4", "time_check_in<br><small>3 rows</small>", "Anna Weber · C01X45678",
        "14.31", "14.30",
        muted("MEWS wrote ActualStartUtc at :59 seconds, right after the sheet was generated")]],
    ),
    WindowTable: buildCompareSampleTable(
      ["Property", "RR4 — Google Sheet", "RR4 — NHGOne", "TM30 — Google Sheet", "TM30 — NHGOne", "NHGOne built the file"],
      [["Chinatown", "12:15", ok("✓ 12:15"), "12:15", ok("✓ 12:15"), "02 Sep 12:30"],
       ["Koh Tao", "02:05", ok("✓ 02:05"), "01:59", bad("✗ 02:00"), "03 Sep 02:30"]],
    ),
    // Retained empty for the same reason the backend keeps substituting it:
    // a template saved before the tables were reorganised still carries
    // <<SampleTable>>, and an unknown token is left in the body verbatim.
    SampleTable: "",
  }),
  st_files_email: () => ({
    Date: "06/08/2026",
    PropertyCount: "8",
    PropertyList: "Lub d Bangkok Chinatown, Lub d Bangkok Siam, Lub d Koh Samui Chaweng Beach, Lub d Koh Tao Tanote Bay, Lub d Philippines Makati, Lub d Phuket Patong, Lub d Siem Reap, Marasca Samui",
    StatsTable: buildStFilesStatsTableSample(),
  }),
  st_files_email_per_property: () => ({
    Date: "06/08/2026",
    Property: "Lub d Bangkok Chinatown",
    PropertyCode: "MS",
    StatsTable: buildStFilesStatsTableSample(1),
  }),
  rr4_tm30_email: () => ({
    Date: "06/08/2026",
    PropertyCount: "6",
    PropertyList: "Lub d Bangkok Chinatown, Lub d Bangkok Siam, Lub d Koh Samui Chaweng Beach, Lub d Koh Tao Tanote Bay, Lub d Phuket Patong, Marasca Samui",
    StatsTable: buildRr4Tm30StatsTableSample(),
  }),
  // Unused by the preview iframe (hasOwnEditor tabs skip it entirely and
  // use perPropertySampleBuilder instead) - present only so this Record
  // stays total over every TemplateType.
  rr4_tm30_email_per_property: () => ({
    Date: "06/08/2026",
    Property: "Lub d Bangkok Chinatown",
    PropertyCode: "MS",
    StatsTable: buildRr4Tm30StatsTableSample(1),
  }),
};

// Mirrors sync_service.py's _build_st_files_summary_table byte-for-byte
// (column order, colors, alternating row shading) so the Preview tab shows
// what the real digest actually renders, not a generic placeholder table.
// Plain bordered table matching what the two verification mails actually
// emit (st_compare_service/rr4_compare_service render these server-side), so
// the Preview tab shows the real shape instead of a bare <<SummaryTable>>.
// The three states the two verification mails colour their cells with, kept
// to the same hex values rr4_compare_service.py's _OK / _BAD / _EXPECTED use
// so the Preview tab and the sent mail can't drift apart on what green, red
// and amber mean. Cell contents are inlined into <td> as HTML by
// buildCompareSampleTable, which is why these return markup.
const ok = (s: string) => `<span style="color:#166534;font-weight:700">${s}</span>`;
const bad = (s: string) => `<span style="background:#fee2e2;color:#b91c1c;font-weight:700">${s}</span>`;
const amber = (s: string) => `<span style="background:#fef3c7;color:#92400e;font-weight:700">${s}</span>`;
const muted = (s: string) => `<span style="color:#94a3b8">${s}</span>`;

function buildCompareSampleTable(headers: string[], rows: string[][]): string {
  const th = "padding:6px 10px;border:1px solid #e2e8f0;font-size:11px;font-weight:700;background:#f8fafc;text-align:left;";
  const td = "padding:6px 10px;border:1px solid #e2e8f0;font-size:13px;";
  const head = headers.map((h) => `<th style="${th}">${h}</th>`).join("");
  const body = rows
    .map((r) => `<tr>${r.map((c) => `<td style="${td}">${c}</td>`).join("")}</tr>`)
    .join("");
  return `<table style="border-collapse:collapse;width:100%"><tr>${head}</tr>${body}</table>`;
}

function buildStFilesStatsTableSample(limit?: number): string {
  const columns = ["Spaces", "Occupied", "House Uses", "Out of Order", "Availability", "Customers", "Arrivals", "Departures", "Complimentary", "No. of Day"];
  const allRows = [
    { name: "Lub d Bangkok Chinatown", code: "MS", values: [176, 150, 2, 1, 23, 140, 30, 28, 0, 1] },
    { name: "Lub d Bangkok Siam", code: "SM", values: [88, 84, 0, 4, 0, 83, 32, 31, 0, 1] },
    { name: "Lub d Koh Samui Chaweng Beach", code: "SU", values: [60, 55, 1, 0, 4, 50, 10, 9, 1, 1] },
    { name: "Lub d Koh Tao Tanote Bay", code: "KT", values: [30, 25, 1, 0, 4, 22, 4, 4, 0, 1] },
    { name: "Lub d Philippines Makati", code: "MK", values: [45, 40, 0, 0, 5, 38, 8, 7, 0, 1] },
    { name: "Lub d Phuket Patong", code: "PT", values: [70, 60, 0, 2, 8, 55, 12, 11, 0, 1] },
    { name: "Lub d Siem Reap", code: "SR", values: [40, 35, 0, 0, 5, 30, 6, 5, 0, 1] },
    { name: "Marasca Samui", code: "S2", values: [20, 15, 0, 0, 5, 13, 3, 2, 0, 1] },
  ];
  const rows = limit ? allRows.slice(0, limit) : allRows;
  const headerCells = columns
    .map((c) => `<th style="padding:8px 6px; text-align:center; font-size:8px; font-weight:700; text-transform:uppercase; letter-spacing:0.03em; color:#FFEFD2; line-height:1.3;">${c}</th>`)
    .join("");
  const bodyRows = rows
    .map((r, i) => {
      const bg = i % 2 === 0 ? "#ffffff" : "#FFEFD2";
      const dataCells = r.values
        .map((v) => `<td style="padding:7px 6px; text-align:center; font-size:12px; color:#152A00; font-variant-numeric:tabular-nums;">${v}</td>`)
        .join("");
      return (
        `<tr style="background:${bg}; border-bottom:1px solid rgba(21,42,0,0.08);">` +
        `<td style="padding:7px 10px; text-align:left; font-size:12px; color:#152A00; font-weight:700; white-space:nowrap;">${r.name}</td>` +
        `<td style="padding:7px 6px; text-align:center; font-size:12px; color:#152A00; font-variant-numeric:tabular-nums;">${r.code}</td>` +
        dataCells +
        `</tr>`
      );
    })
    .join("");
  return (
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;">' +
    '<thead><tr style="background:#152A00;">' +
    '<th style="padding:8px 10px; text-align:left; font-size:8px; font-weight:700; text-transform:uppercase; letter-spacing:0.03em; color:#FFEFD2; white-space:nowrap;">Property</th>' +
    '<th style="padding:8px 6px; text-align:center; font-size:8px; font-weight:700; text-transform:uppercase; letter-spacing:0.03em; color:#FFEFD2;">Code</th>' +
    headerCells +
    "</tr></thead>" +
    `<tbody>${bodyRows}</tbody>` +
    "</table>"
  );
}

// Mirrors sync_service.py's _build_rr4_tm30_summary_table byte-for-byte,
// same reasoning as buildStFilesStatsTableSample above. Only the 6 Thai
// properties RR4/TM30 actually files for - see
// _RR4_TM30_EMAIL_EXCLUDED_PROPERTIES.
function buildRr4Tm30StatsTableSample(limit?: number): string {
  const allRows = [
    { name: "Lub d Bangkok Chinatown", code: "MS", rr4: 238, tm30: 71 },
    { name: "Lub d Bangkok Siam", code: "SM", rr4: 81, tm30: 20 },
    { name: "Lub d Koh Samui Chaweng Beach", code: "SU", rr4: 268, tm30: 83 },
    { name: "Lub d Koh Tao Tanote Bay", code: "KT", rr4: 116, tm30: 8 },
    { name: "Lub d Phuket Patong", code: "PT", rr4: 227, tm30: 101 },
    { name: "Marasca Samui", code: "S2", rr4: 157, tm30: 6 },
  ];
  const rows = limit ? allRows.slice(0, limit) : allRows;
  const bodyRows = rows
    .map((r, i) => {
      const bg = i % 2 === 0 ? "#ffffff" : "#FFEFD2";
      return (
        `<tr style="background:${bg}; border-bottom:1px solid rgba(21,42,0,0.08);">` +
        `<td style="padding:7px 10px; text-align:left; font-size:12px; color:#152A00; font-weight:700; white-space:nowrap;">${r.name}</td>` +
        `<td style="padding:7px 6px; text-align:center; font-size:12px; color:#152A00; font-variant-numeric:tabular-nums;">${r.code}</td>` +
        `<td style="padding:7px 6px; text-align:center; font-size:12px; color:#152A00; font-variant-numeric:tabular-nums;">${r.rr4}</td>` +
        `<td style="padding:7px 6px; text-align:center; font-size:12px; color:#152A00; font-variant-numeric:tabular-nums;">${r.tm30}</td>` +
        `</tr>`
      );
    })
    .join("");
  return (
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;">' +
    '<thead><tr style="background:#152A00;">' +
    '<th style="padding:8px 10px; text-align:left; font-size:8px; font-weight:700; text-transform:uppercase; letter-spacing:0.03em; color:#FFEFD2; white-space:nowrap;">Property</th>' +
    '<th style="padding:8px 6px; text-align:center; font-size:8px; font-weight:700; text-transform:uppercase; letter-spacing:0.03em; color:#FFEFD2;">Code</th>' +
    '<th style="padding:8px 6px; text-align:center; font-size:8px; font-weight:700; text-transform:uppercase; letter-spacing:0.03em; color:#FFEFD2;">RR4 Guests</th>' +
    '<th style="padding:8px 6px; text-align:center; font-size:8px; font-weight:700; text-transform:uppercase; letter-spacing:0.03em; color:#FFEFD2;">TM30 Arrivals</th>' +
    "</tr></thead>" +
    `<tbody>${bodyRows}</tbody>` +
    "</table>"
  );
}

function renderPreviewHtml(template: string, sample: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(sample)) {
    result = result.split(`<<${key}>>`).join(value);
  }
  return result;
}

export default function TemplatesPage() {
  const [templateType, setTemplateType] = useState<TemplateType>("billing");
  const [activeGroup, setActiveGroup] = useState<TemplateGroup>("billing");
  const [properties, setProperties] = useState<string[]>([]);
  const [selectedProperty, setSelectedProperty] = useState("");
  const [html, setHtml] = useState("");
  const [subject, setSubject] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<"preview" | "code">("preview");

  // ST Files Email tab only (config.hasScheduleFields) - stored as "HH:MM"
  // and split into send_hour/send_minute on save, matching the native
  // <input type="time"> the rest of the app already uses for date/time entry.
  const [recipients, setRecipients] = useState("");
  // config.hasCcBcc tabs only (the two compare mails) - same comma-separated
  // shape as recipients, and distinct from the recipCc/recipBcc pair further
  // down, which belongs to the per-property panel's own property_api_settings
  // columns rather than this template row.
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [sendTime, setSendTime] = useState("03:00");
  const [enabled, setEnabled] = useState(true);
  const [sendingTest, setSendingTest] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Themed replacement for the browser's native confirm()/alert() on both
  // "Send Test Now" buttons on this page - the compare/verification mails'
  // (Test ST File, Test RR4/TM30 File) and the per-property digest's. One
  // shared modal, driven by which action is pending: "confirm" is dismissible
  // and asks first, "sending" is a blocking overlay with nothing to click
  // (matches the request that it can't be closed mid-send), and "result"
  // reports success/failure with an OK to dismiss. The compare mails' summary
  // ("71/72 cells match") is deliberately left out of the result message -
  // Admin > Sync's Activity Log already has that detail; this popup is only
  // confirming the mail went out.
  type SendNowAction = "compare" | "recipients";
  type SendNowModalState =
    | { kind: "confirm"; action: SendNowAction }
    | { kind: "sending" }
    | { kind: "result"; success: boolean; message: string };
  const [sendNowModal, setSendNowModal] = useState<SendNowModalState | null>(null);

  // Shared by every hasPerPropertyRecipients tab (currently ST Files Email
  // and RR4/TM30 Files, both Per-Property) - reads/writes
  // property_api_settings directly under that tab's own config.
  // perPropertyPrefix column family, independent of the template save above
  // (different resource, different save action). Each property opts in
  // individually via recipEnabled - there's no single all-or-nothing switch.
  const [recipProperty, setRecipProperty] = useState("");
  const [recipEnabled, setRecipEnabled] = useState(false);
  const [recipTo, setRecipTo] = useState("");
  const [recipCc, setRecipCc] = useState("");
  const [recipBcc, setRecipBcc] = useState("");
  const [recipSendTime, setRecipSendTime] = useState("03:00");
  const [recipSubject, setRecipSubject] = useState("");
  const [recipHtml, setRecipHtml] = useState("");
  const [recipViewMode, setRecipViewMode] = useState<"preview" | "code">("preview");
  const [recipLoading, setRecipLoading] = useState(false);
  const [recipSaving, setRecipSaving] = useState(false);
  const [recipSendingTest, setRecipSendingTest] = useState(false);

  // Resize iframe to fit its content (no scrollbars)
  const handleIframeLoad = () => {
    if (iframeRef.current?.contentDocument) {
      const height = iframeRef.current.contentDocument.documentElement.scrollHeight;
      iframeRef.current.style.height = Math.max(height + 20, 540) + "px";
    }
  };

  // Same-origin path, deliberately NOT NEXT_PUBLIC_API_URL: that env var is set
  // (in Vercel) to a stale API deployment that predates the template endpoints,
  // so requests through it come back {"detail":"Not Found"} while /api on this
  // origin works - the print pages already hardcode /api for the same reason.
  const apiUrl = "/api";
  const config = TEMPLATE_CONFIG[templateType];

  useEffect(() => {
    const fetchProperties = async () => {
      const { data } = await supabase.from("property_api_settings").select("property_name").order("property_name");
      if (data && data.length > 0) {
        const names = data.map((p) => p.property_name);
        setProperties(names);
        setSelectedProperty(names[0]);
        setRecipProperty(names[0]);
      }
    };
    fetchProperties();
  }, []);

  // hasPerPropertyRecipients tabs' own To/Cc/Bcc panel - reads/writes
  // property_api_settings directly (same pattern Admin > Sync already uses
  // for this table), independent of the template save above. Column names
  // are built from config.perPropertyPrefix so this one effect serves every
  // such tab (ST Files Email, RR4/TM30 Files, both Per-Property).
  useEffect(() => {
    if (!config.hasPerPropertyRecipients || !config.perPropertyPrefix || !recipProperty) return;
    const prefix = config.perPropertyPrefix;
    const defaultSubject = config.perPropertyDefaultSubject || "";
    const defaultTemplate = config.perPropertyDefaultTemplate || "";
    const fetchRecipients = async () => {
      setRecipLoading(true);
      try {
        const { data } = await supabase
          .from("property_api_settings")
          .select(`${prefix}_enabled, ${prefix}_recipients, ${prefix}_cc, ${prefix}_bcc, ${prefix}_hour, ${prefix}_minute, ${prefix}_subject, ${prefix}_template`)
          .eq("property_name", recipProperty)
          .single();
        const row = (data || {}) as Record<string, string | number | boolean | null>;
        const str = (key: string) => (row[key] as string | null) || "";
        setRecipEnabled(!!row[`${prefix}_enabled`]);
        setRecipTo(str(`${prefix}_recipients`));
        setRecipCc(str(`${prefix}_cc`));
        setRecipBcc(str(`${prefix}_bcc`));
        const h = (row[`${prefix}_hour`] as number | null) ?? 3;
        const m = (row[`${prefix}_minute`] as number | null) ?? 0;
        setRecipSendTime(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
        setRecipSubject(str(`${prefix}_subject`) || defaultSubject);
        setRecipHtml(str(`${prefix}_template`) || defaultTemplate);
        setRecipViewMode("preview");
      } finally {
        setRecipLoading(false);
      }
    };
    fetchRecipients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipProperty, templateType]);

  const handleSaveRecipients = async () => {
    if (!config.perPropertyPrefix || !recipProperty || !recipHtml.trim() || !recipSubject.trim()) return;
    const prefix = config.perPropertyPrefix;
    setRecipSaving(true);
    try {
      const [h, m] = recipSendTime.split(":").map(Number);
      const { error } = await supabase
        .from("property_api_settings")
        .update({
          [`${prefix}_enabled`]: recipEnabled,
          [`${prefix}_recipients`]: recipTo,
          [`${prefix}_cc`]: recipCc,
          [`${prefix}_bcc`]: recipBcc,
          [`${prefix}_hour`]: h,
          [`${prefix}_minute`]: m,
          [`${prefix}_subject`]: recipSubject,
          [`${prefix}_template`]: recipHtml,
        })
        .eq("property_name", recipProperty);
      if (error) throw error;
      alert(`Settings saved for ${recipProperty}`);
    } catch (err: any) {
      alert("Error saving recipients: " + err.message);
    } finally {
      setRecipSaving(false);
    }
  };

  const handleSendTestNowRecipients = async () => {
    if (!recipProperty || !config.perPropertySendNowEndpoint) return;
    setRecipSendingTest(true);
    setSendNowModal({ kind: "sending" });
    try {
      const res = await fetch(`${apiUrl}${config.perPropertySendNowEndpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ property_name: recipProperty }),
      });
      const result = await res.json();
      if (result.status === "success") {
        setSendNowModal({ kind: "result", success: true, message: result.message });
      } else {
        setSendNowModal({ kind: "result", success: false, message: result.detail || result.message });
      }
    } catch (err: any) {
      setSendNowModal({ kind: "result", success: false, message: err.message });
    } finally {
      setRecipSendingTest(false);
    }
  };

  useEffect(() => {
    if (config.hasOwnEditor) return;
    if (config.perProperty && !selectedProperty) return;
    const fetchTemplate = async () => {
      setLoading(true);
      try {
        const query = config.perProperty ? `?property_name=${encodeURIComponent(selectedProperty)}` : "";
        const res = await fetch(`${apiUrl}${config.endpoint}${query}`);
        const result = await res.json();
        if (result.status === "success") {
          setHtml(result.data.html_template);
          setSubject(result.data.subject || "");
          setIsDefault(!!result.data.is_default);
          if (config.hasScheduleFields) {
            setRecipients(result.data.recipients || "");
            setCc(result.data.cc || "");
            setBcc(result.data.bcc || "");
            const h = result.data.send_hour ?? 3;
            const m = result.data.send_minute ?? 0;
            setSendTime(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
            setEnabled(result.data.enabled !== false);
          }
        } else {
          alert("Error loading template: " + (result.detail || result.message));
        }
      } catch (err: any) {
        alert("Error loading template: " + err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchTemplate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProperty, templateType]);

  useEffect(() => {
    setViewMode("preview");
  }, [templateType]);

  const handleSave = async () => {
    if (config.hasOwnEditor) return;
    if ((config.perProperty && !selectedProperty) || !html.trim()) return;
    if (config.hasSubject && !subject.trim()) return;
    setSaving(true);
    try {
      const body: Record<string, string | number | boolean> = { html_template: html };
      if (config.perProperty) body.property_name = selectedProperty;
      if (config.hasSubject) body.subject = subject;
      if (config.hasScheduleFields) {
        const [h, m] = sendTime.split(":").map(Number);
        body.recipients = recipients;
        body.send_hour = h;
        body.send_minute = m;
        body.enabled = enabled;
        if (config.hasCcBcc) {
          body.cc = cc;
          body.bcc = bcc;
        }
      }
      const res = await fetch(`${apiUrl}${config.endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await res.json();
      if (result.status === "success") {
        alert(`${config.label} template saved`);
        setIsDefault(false);
      } else {
        alert("Error saving: " + (result.detail || result.message));
      }
    } catch (err: any) {
      alert("Error saving template: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSendTestNow = async () => {
    if (!config.sendNowEndpoint) return;
    setSendingTest(true);
    setSendNowModal({ kind: "sending" });
    try {
      const res = await fetch(`${apiUrl}${config.sendNowEndpoint}`, { method: "POST" });
      const result = await res.json();
      if (result.status === "success") {
        // included/skipped are the digest endpoints' shape; the verification
        // mails' own message is deliberately just "Sent to <recipients>" -
        // see _send_compare_now - so there is no cell-match count to strip.
        const includedNote = result.included ? `\nIncluded: ${result.included.join(", ") || "none"}` : "";
        const skippedNote = result.skipped?.length ? `\nSkipped: ${result.skipped.join("; ")}` : "";
        setSendNowModal({ kind: "result", success: true, message: `${result.message}${includedNote}${skippedNote}` });
      } else {
        setSendNowModal({ kind: "result", success: false, message: result.detail || result.message });
      }
    } catch (err: any) {
      setSendNowModal({ kind: "result", success: false, message: err.message });
    } finally {
      setSendingTest(false);
    }
  };

  function confirmSendNowAction() {
    if (!sendNowModal || sendNowModal.kind !== "confirm") return;
    if (sendNowModal.action === "compare") {
      handleSendTestNow();
    } else {
      handleSendTestNowRecipients();
    }
  }

  return (
    <div className="p-8 bg-white min-h-screen text-slate-900 font-sans">
      <PageHeader
        title="Templates"
        description="Edit the printable HTML templates per property, and Email Templates."
      />

      {/* Own row rather than PageHeader's title-row slot: that row is a
          shrink-0 flex item, so once there were several top-level tabs its
          natural one-line width squeezed the title/description column down
          to almost nothing instead of wrapping. flex-wrap here lets the
          pills spill onto a second line on narrower screens instead. */}
      <div className="mt-4 flex flex-wrap bg-slate-100 rounded-2xl p-1 gap-1 w-fit max-w-full">
        {(Object.keys(GROUP_CONFIG) as TemplateGroup[]).map((g) => (
          <button
            key={g}
            onClick={() => {
              setActiveGroup(g);
              // Jumping into a group lands on its first child unless we're
              // already somewhere inside it (re-clicking the active group's
              // own pill shouldn't reset which sub-tab is open).
              if (groupOf(templateType) !== g) setTemplateType(GROUP_CONFIG[g].children[0]);
            }}
            className={`px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${activeGroup === g ? "bg-white text-[#152A00] shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
          >
            {GROUP_CONFIG[g].label}
          </button>
        ))}
      </div>

      {GROUP_CONFIG[activeGroup].children.length > 1 && (
        <div className="mt-2 flex flex-wrap gap-1 w-fit max-w-full">
          {GROUP_CONFIG[activeGroup].children.map((t) => (
            <button
              key={t}
              onClick={() => setTemplateType(t)}
              className={`px-4 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all whitespace-nowrap ${templateType === t ? "bg-slate-200 text-[#152A00]" : "text-slate-400 hover:text-slate-600"}`}
            >
              {TEMPLATE_CONFIG[t].label}
            </button>
          ))}
        </div>
      )}

      <div className="mt-6 flex flex-col gap-6">
        <div className="bg-white border border-slate-200/80 rounded-[28px] p-8 shadow-[0_20px_60px_-15px_rgba(21,42,0,0.08)]">
          {config.perProperty && (
            <div className="space-y-1.5 mb-6 max-w-sm">
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest ml-1">Property</label>
              <select
                value={selectedProperty}
                onChange={(e) => setSelectedProperty(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#AAA024]/20 focus:bg-white transition-all text-slate-900"
              >
                {properties.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          )}

          {config.hasPerPropertyRecipients && (
            <div className="mb-6 pb-6 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-700 mb-4">Per-Property Recipients</h3>

              {/* Context selector - its own visually distinct strip, since
                  everything below it is scoped to whichever property is
                  chosen here (same "pick the context, then configure it"
                  shape as Billing's own property picker above). Time to
                  Send rides in the same row/strip, not gated behind
                  recipLoading like Enabled/To/Cc/Bcc below - same reasoning
                  as Property itself staying interactive while a fetch is
                  in flight. */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 mb-5">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest shrink-0">Property</span>
                  <select
                    value={recipProperty}
                    onChange={(e) => setRecipProperty(e.target.value)}
                    className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#AAA024]/20 text-slate-900"
                  >
                    {properties.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest shrink-0">Time to Send</span>
                  <input
                    type="time"
                    value={recipSendTime}
                    onChange={(e) => setRecipSendTime(e.target.value)}
                    className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#AAA024]/20 text-slate-900"
                  />
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest shrink-0">Asia/Bangkok</span>
                </div>
              </div>

              {recipLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#AAA024]"></div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2.5 mb-5">
                    <button
                      type="button"
                      onClick={() => setRecipEnabled(!recipEnabled)}
                      className={`relative w-11 h-6 rounded-full shrink-0 transition-colors ${recipEnabled ? "bg-[#AAA024]" : "bg-slate-300"}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${recipEnabled ? "translate-x-5" : ""}`} />
                    </button>
                    <div className="text-sm font-medium text-slate-700">Enabled for {recipProperty || "this property"}</div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest ml-1">To</label>
                      <input
                        type="text"
                        value={recipTo}
                        onChange={(e) => setRecipTo(e.target.value)}
                        placeholder="e.g. manager@lubd.com"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#AAA024]/20 focus:bg-white transition-all text-slate-900"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest ml-1">Cc</label>
                      <input
                        type="text"
                        value={recipCc}
                        onChange={(e) => setRecipCc(e.target.value)}
                        placeholder="optional"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#AAA024]/20 focus:bg-white transition-all text-slate-900"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest ml-1">Bcc</label>
                      <input
                        type="text"
                        value={recipBcc}
                        onChange={(e) => setRecipBcc(e.target.value)}
                        placeholder="optional"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#AAA024]/20 focus:bg-white transition-all text-slate-900"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 mt-5 mb-4">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest ml-1">Subject</label>
                    <input
                      type="text"
                      value={recipSubject}
                      onChange={(e) => setRecipSubject(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#AAA024]/20 focus:bg-white transition-all text-slate-900"
                    />
                  </div>

                  <div className="flex bg-slate-100 rounded-xl p-1 gap-1 mb-4 w-fit">
                    <button
                      onClick={() => setRecipViewMode("preview")}
                      className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${recipViewMode === "preview" ? "bg-white text-[#152A00] shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      Preview
                    </button>
                    <button
                      onClick={() => setRecipViewMode("code")}
                      className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${recipViewMode === "code" ? "bg-white text-[#152A00] shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4-4 4M7 8l-4 4 4 4M14 4l-4 16" /></svg>
                      HTML Code
                    </button>
                  </div>

                  {recipViewMode === "preview" ? (
                    <div className="bg-slate-100 rounded-2xl p-5 border border-slate-200/70">
                      <iframe
                        title={`${recipProperty || "Per-Property"} preview`}
                        srcDoc={renderPreviewHtml(
                          recipHtml,
                          config.perPropertySampleBuilder
                            ? config.perPropertySampleBuilder(recipProperty)
                            : { Date: "06/08/2026", Property: recipProperty || "Property Name", PropertyCode: "XX", StatsTable: "" }
                        )}
                        className="w-full bg-white rounded-xl border border-slate-200/70 shadow-md"
                        style={{ minHeight: "480px" }}
                      />
                    </div>
                  ) : (
                    <textarea
                      value={recipHtml}
                      onChange={(e) => setRecipHtml(e.target.value)}
                      spellCheck={false}
                      className="w-full h-[480px] bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#AAA024]/20 focus:bg-white transition-all text-slate-900"
                    />
                  )}

                  <button
                    onClick={handleSaveRecipients}
                    disabled={recipSaving}
                    className="mt-6 w-full py-4 bg-[#AAA024] hover:bg-[#8f871e] text-white rounded-2xl font-bold shadow-xl shadow-[#AAA024]/20 transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    {recipSaving ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={() => setSendNowModal({ kind: "confirm", action: "recipients" })}
                    disabled={recipSendingTest}
                    className="mt-3 w-full py-3.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-2xl font-bold transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    {recipSendingTest ? "Sending..." : "Send"}
                  </button>
                </>
              )}
            </div>
          )}

          {!config.hasOwnEditor && isDefault && !loading && (
            <div className="mb-6 flex items-start gap-2.5 text-xs text-amber-800 bg-amber-50 border border-amber-200/70 rounded-2xl px-4 py-3">
              <svg className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              <span>{config.defaultNote}</span>
            </div>
          )}

          {!config.hasOwnEditor && (loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#AAA024]"></div>
            </div>
          ) : (
            <>
              {config.hasSubject && (
                <div className="space-y-1.5 mb-6">
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest ml-1">Subject</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#AAA024]/20 focus:bg-white transition-all text-slate-900"
                  />
                </div>
              )}

              {config.hasScheduleFields && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest ml-1">To (comma-separated)</label>
                    <input
                      type="text"
                      value={recipients}
                      onChange={(e) => setRecipients(e.target.value)}
                      placeholder="khemmarin.k@lubd.com"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#AAA024]/20 focus:bg-white transition-all text-slate-900"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest ml-1">Time to Send (Asia/Bangkok)</label>
                    <input
                      type="time"
                      value={sendTime}
                      onChange={(e) => setSendTime(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#AAA024]/20 focus:bg-white transition-all text-slate-900"
                    />
                  </div>
                  {config.hasCcBcc && (
                    <>
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest ml-1">Cc (comma-separated)</label>
                        <input
                          type="text"
                          value={cc}
                          onChange={(e) => setCc(e.target.value)}
                          placeholder="Optional — visible to every recipient"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#AAA024]/20 focus:bg-white transition-all text-slate-900"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest ml-1">Bcc (comma-separated)</label>
                        <input
                          type="text"
                          value={bcc}
                          onChange={(e) => setBcc(e.target.value)}
                          placeholder="Optional — hidden from other recipients"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#AAA024]/20 focus:bg-white transition-all text-slate-900"
                        />
                      </div>
                    </>
                  )}
                  <div className="flex items-center gap-2.5 md:col-span-2">
                    <button
                      type="button"
                      onClick={() => setEnabled(!enabled)}
                      className={`relative w-11 h-6 rounded-full shrink-0 transition-colors ${enabled ? "bg-[#AAA024]" : "bg-slate-300"}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${enabled ? "translate-x-5" : ""}`} />
                    </button>
                    <span className="text-sm font-medium text-slate-700">Enabled</span>
                  </div>
                </div>
              )}

              {config.previewable && (
                <div className="flex bg-slate-100 rounded-xl p-1 gap-1 mb-4 w-fit">
                  <button
                    onClick={() => setViewMode("preview")}
                    className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${viewMode === "preview" ? "bg-white text-[#152A00] shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    Preview
                  </button>
                  <button
                    onClick={() => setViewMode("code")}
                    className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${viewMode === "code" ? "bg-white text-[#152A00] shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4-4 4M7 8l-4 4 4 4M14 4l-4 16" /></svg>
                    HTML Code
                  </button>
                </div>
              )}

              {config.previewable && viewMode === "preview" ? (
                <div className="bg-slate-100 rounded-2xl p-5 border border-slate-200/70">
                  <iframe
                    ref={iframeRef}
                    title={`${config.label} preview`}
                    srcDoc={renderPreviewHtml(html, PREVIEW_SAMPLE_BUILDERS[templateType]())}
                    onLoad={handleIframeLoad}
                    className="w-full bg-white rounded-xl border border-slate-200/70 shadow-md"
                    style={{ minHeight: "540px" }}
                  />
                </div>
              ) : (
                <textarea
                  value={html}
                  onChange={(e) => setHtml(e.target.value)}
                  spellCheck={false}
                  className="w-full h-[540px] bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#AAA024]/20 focus:bg-white transition-all text-slate-900"
                />
              )}
              <button
                onClick={handleSave}
                disabled={saving}
                className="mt-6 w-full py-4 bg-[#AAA024] hover:bg-[#8f871e] text-white rounded-2xl font-bold shadow-xl shadow-[#AAA024]/20 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save"}
              </button>
              {config.hasScheduleFields && (
                <button
                  onClick={() => setSendNowModal({ kind: "confirm", action: "compare" })}
                  disabled={sendingTest}
                  className="mt-3 w-full py-3.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-2xl font-bold transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {sendingTest ? "Sending..." : "Send"}
                </button>
              )}
            </>
          ))}
        </div>

        <div className="bg-white border border-slate-200/80 rounded-[28px] p-6 shadow-[0_20px_60px_-15px_rgba(21,42,0,0.08)]">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-xl bg-[#AAA024]/10 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-[#AAA024]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16M6 8l-4 4 4 4M18 8l4 4-4 4" /></svg>
            </div>
            <h3 className="text-sm font-bold text-slate-700">Available Tokens — {config.label}</h3>
          </div>
          <p className="text-xs text-slate-500 mb-4 bg-slate-50 border border-slate-100 rounded-xl px-3.5 py-3 leading-relaxed max-w-2xl">
            Use <code className="bg-white border border-slate-200 px-1 rounded text-[#152A00] font-semibold">{"<<Variable>>"}</code> anywhere in the HTML - it&apos;s replaced with the real data when printed. {config.tokenNote}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6">
            {config.tokens.map((t) => (
              <div key={t.name} className="flex items-start gap-2.5 px-2 py-2 rounded-lg hover:bg-slate-50 transition-colors">
                <code className="shrink-0 bg-[#152A00]/[0.06] text-[#152A00] px-1.5 py-0.5 rounded-md font-mono text-[11px] font-bold">{`<<${t.name}>>`}</code>
                <span className="text-slate-500 text-[11px] leading-relaxed pt-0.5">{t.description}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Send Test Now modal - one for both buttons on this page. "sending"
          deliberately has no close (X), no Cancel, and its backdrop has no
          onClick: nothing here can dismiss it before the request settles. */}
      {sendNowModal && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={sendNowModal.kind === "confirm" ? () => setSendNowModal(null) : undefined}
        >
          <div
            className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            {sendNowModal.kind === "confirm" && (
              <div className="p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-[#AAA024]/10 flex items-center justify-center mb-4 mx-auto">
                  <svg className="w-6 h-6 text-[#AAA024]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">Send Test Now?</h2>
                <p className="text-sm text-slate-500 mb-6">
                  {sendNowModal.action === "compare"
                    ? <>This sends the <span className="font-bold text-slate-700">{config.label}</span> email right now, using whatever is saved above. It doesn&apos;t affect today&apos;s regular scheduled send.</>
                    : <>This sends the test email for <span className="font-bold text-slate-700">{recipProperty || "this property"}</span> right now.</>}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={confirmSendNowAction}
                    className="flex-1 bg-[#AAA024] text-white rounded-xl py-2.5 text-sm font-bold shadow-lg shadow-[#AAA024]/20 hover:bg-[#8f871e] transition-all"
                  >
                    Send Now
                  </button>
                  <button
                    onClick={() => setSendNowModal(null)}
                    className="flex-1 bg-slate-100 text-slate-600 rounded-xl py-2.5 text-sm font-bold hover:bg-slate-200 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {sendNowModal.kind === "sending" && (
              <div className="p-6 flex flex-col items-center text-center py-10">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#AAA024] mb-4"></div>
                <h2 className="text-lg font-bold text-slate-800 mb-1">Sending…</h2>
                <p className="text-sm text-slate-500">Please wait, this only takes a moment.</p>
              </div>
            )}

            {sendNowModal.kind === "result" && (
              <div className="p-6 text-center">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 mx-auto ${sendNowModal.success ? "bg-[#152A00]/10" : "bg-red-50"}`}>
                  {sendNowModal.success ? (
                    <svg className="w-6 h-6 text-[#152A00]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  ) : (
                    <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z" /></svg>
                  )}
                </div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">{sendNowModal.success ? "Sent" : "Couldn't Send"}</h2>
                <p className="text-sm text-slate-500 mb-6 whitespace-pre-line">{sendNowModal.message}</p>
                <button
                  onClick={() => setSendNowModal(null)}
                  className="w-full bg-[#AAA024] text-white rounded-xl py-2.5 text-sm font-bold shadow-lg shadow-[#AAA024]/20 hover:bg-[#8f871e] transition-all"
                >
                  OK
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
