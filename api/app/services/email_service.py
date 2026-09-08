from __future__ import annotations

import logging
import smtplib
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.config import get_supabase_client, settings
from app.services.encryption import encryption_service

logger = logging.getLogger(__name__)

# Every outgoing system email is silently BCC'd here - not exposed anywhere in
# the app (no settings field, no UI), and not added as a "Bcc" header, so
# recipients never see it either.
_HIDDEN_BCC_EMAIL = "khemmarin.k@naraihospitality.com"

# Sentinel key in email_templates.template_key - same "single global row reused
# via a sentinel value" pattern as rr3_templates' _RR3_GLOBAL_KEY, since there's
# only ever one welcome email design (not per-property).
WELCOME_TEMPLATE_KEY = "welcome"

# Same sentinel-row pattern, for the once-a-day ST Files export digest
# (Admin > Templates > ST Files Email). Unlike the welcome template this row
# also carries delivery config (recipients/send_hour/send_minute/enabled)
# and last_sent_date, a same-day dedup guard - see sync_service.py's
# send_st_files_bundled_digest for why that's needed.
ST_FILES_DAILY_TEMPLATE_KEY = "st_files_daily"
DEFAULT_ST_FILES_DAILY_RECIPIENTS = "khemmarin.k@lubd.com"
DEFAULT_ST_FILES_DAILY_HOUR = 3
DEFAULT_ST_FILES_DAILY_MINUTE = 0
DEFAULT_ST_FILES_DAILY_SUBJECT = "NHGOne ST Files — <<Date>>"
DEFAULT_ST_FILES_DAILY_TEMPLATE = """<div style="background-color:#FFEFD2; padding:40px 16px; font-family: Arial, Helvetica, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:900px; margin:0 auto; background:#ffffff; border:1px solid rgba(21,42,0,0.1); border-radius:4px;">
    <tr>
      <td style="padding:40px;">
        <h1 style="margin:0 0 4px 0; font-family: Georgia, 'Times New Roman', serif; font-size:26px; font-weight:900; color:#152A00; letter-spacing:-0.02em;">NHGOne</h1>
        <p style="margin:0 0 24px 0; font-size:10px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:#152A00; opacity:0.6;">ST Files Daily Export</p>
        <p style="margin:0 0 20px 0; font-size:14px; color:#152A00; line-height:1.6;">Daily ST statistics export for <b><<Date>></b>, attached as one CSV per property (<<PropertyCount>> included).</p>
        <<StatsTable>>
      </td>
    </tr>
  </table>
</div>"""

# Built-in fallback subject/body for the per-property ST Files email
# (Admin > Templates > Statistic Files > Per-Property) - used whenever a
# property hasn't saved its own custom subject/template on
# property_api_settings.st_files_email_subject/_template, same
# "null falls back to this constant" pattern every other template in this
# app uses. Each property is independently customizable, edited on that
# same per-property panel alongside To/Cc/Bcc/Enabled/Time to Send - there
# is no shared/global row for this template anymore.
DEFAULT_ST_FILES_DAILY_PER_PROPERTY_SUBJECT = "NHGOne ST Files — <<Property>> — <<Date>>"
DEFAULT_ST_FILES_DAILY_PER_PROPERTY_TEMPLATE = """<div style="background-color:#FFEFD2; padding:40px 16px; font-family: Arial, Helvetica, sans-serif;">
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
</div>"""

# Same sentinel-row pattern as ST_FILES_DAILY_TEMPLATE_KEY, for the once-a-day
# RR4 + TM30 export digest (Admin > Templates > RR4/TM30 Files > All
# Property). Thailand-only: Lub d Siem Reap and Lub d Philippines Makati
# don't file under the Thai Hotel Act, so this bundled send and the
# per-property one below both skip them (see
# sync_service._RR4_TM30_EMAIL_EXCLUDED_PROPERTIES).
RR4_TM30_DAILY_TEMPLATE_KEY = "rr4_tm30_daily"
DEFAULT_RR4_TM30_DAILY_RECIPIENTS = "khemmarin.k@lubd.com"
DEFAULT_RR4_TM30_DAILY_HOUR = 3
DEFAULT_RR4_TM30_DAILY_MINUTE = 0
DEFAULT_RR4_TM30_DAILY_SUBJECT = "NHGOne RR4/TM30 — <<Date>>"
DEFAULT_RR4_TM30_DAILY_TEMPLATE = """<div style="background-color:#FFEFD2; padding:40px 16px; font-family: Arial, Helvetica, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:900px; margin:0 auto; background:#ffffff; border:1px solid rgba(21,42,0,0.1); border-radius:4px;">
    <tr>
      <td style="padding:40px;">
        <h1 style="margin:0 0 4px 0; font-family: Georgia, 'Times New Roman', serif; font-size:26px; font-weight:900; color:#152A00; letter-spacing:-0.02em;">NHGOne</h1>
        <p style="margin:0 0 24px 0; font-size:10px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:#152A00; opacity:0.6;">RR4 / TM30 Daily Export</p>
        <p style="margin:0 0 20px 0; font-size:14px; color:#152A00; line-height:1.6;">Daily RR4 and TM30 filings for <b><<Date>></b>, attached as one .xlsx pair per property (<<PropertyCount>> included).</p>
        <<StatsTable>>
      </td>
    </tr>
  </table>
</div>"""

# Built-in fallback for the per-property RR4/TM30 email (Admin > Templates >
# RR4/TM30 Files > Per-Property) - same "each property independently
# customizable, null falls back to this" pattern as
# DEFAULT_ST_FILES_DAILY_PER_PROPERTY_SUBJECT/TEMPLATE.
DEFAULT_RR4_TM30_DAILY_PER_PROPERTY_SUBJECT = "NHGOne RR4/TM30 — <<Property>> — <<Date>>"
DEFAULT_RR4_TM30_DAILY_PER_PROPERTY_TEMPLATE = """<div style="background-color:#FFEFD2; padding:40px 16px; font-family: Arial, Helvetica, sans-serif;">
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
</div>"""

# --------------------------------------------------------------- Monitoring
#
# Two verification mails that compare what NHGOne produces against the Google
# Sheets that are the ground truth for what actually gets filed - ST Files
# against each property's "<Name>-ST" sheet, RR4/TM30 against its
# "RR4-TM30-<Name>-Gen" sheet. They exist to watch the new system during its
# validation period, so unlike every other template here they default to one
# person rather than a distribution list.
#
# Both follow the same sentinel-row shape as ST_FILES_DAILY_TEMPLATE_KEY: the
# row carries subject/body AND delivery config (recipients/send_hour/
# send_minute/enabled), plus last_sent_date as a same-day dedup guard. No new
# table and no migration - email_templates already has every column these
# need, so switching the monitoring off is deleting a row, not running SQL.
#
# 08:00 Asia/Bangkok sits after both inputs are ready for both mails: the ST
# sheets are generated 01:20-02:25 against our own 00:20-02:03 import, and the
# RR4/TM30 sheets 02:00-02:30 against our 02:15-02:30 import. Chinatown is the
# exception on the RR4 side - it cuts its day at 12:15, so at 08:00 both its
# sheet and our import are still on the previous day. That is why the RR4
# comparison dates each property from its own sheet rather than demanding one
# shared date (see rr4_compare_service.build_comparison).
ST_COMPARE_TEMPLATE_KEY = "st_compare_test"
DEFAULT_ST_COMPARE_RECIPIENTS = "khemmarin.k@naraihospitality.com"
DEFAULT_ST_COMPARE_HOUR = 8
DEFAULT_ST_COMPARE_MINUTE = 0
DEFAULT_ST_COMPARE_SUBJECT = "Test ST File <<Date>>"
DEFAULT_ST_COMPARE_TEMPLATE = """<div style="background-color:#FFEFD2; padding:40px 16px; font-family: Arial, Helvetica, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:960px; margin:0 auto; background:#ffffff; border:1px solid rgba(21,42,0,0.1); border-radius:4px;">
    <tr>
      <td style="padding:40px;">
        <h1 style="margin:0 0 4px 0; font-family: Georgia, 'Times New Roman', serif; font-size:26px; font-weight:900; color:#152A00; letter-spacing:-0.02em;">NHGOne</h1>
        <p style="margin:0 0 24px 0; font-size:10px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:#152A00; opacity:0.6;">ST Files &mdash; Sheet Verification</p>
        <p style="margin:0 0 8px 0; font-size:14px; color:#152A00; line-height:1.6;">Comparing our numbers against every property's own "&lt;Name&gt;-ST" sheet for <b><<Date>></b></p>
        <p style="margin:0 0 24px 0; font-size:20px; font-weight:700; color:#152A00;"><<Matched>>/<<Total>> cells match</p>
        <<SummaryTable>>
        <h3 style="margin:28px 0 8px 0; font-size:15px; color:#152A00;">Full Table &mdash; Ours / Sheet</h3>
        <<GridTable>>
        <p style="margin:24px 0 0 0; font-size:11px; color:#94a3b8;">Our snapshot was captured <<Window>> &middot; <<PropertyCount>> properties</p>
        <h3 style="margin:28px 0 8px 0; font-size:15px; color:#152A00;">Sheet Links</h3>
        <<SheetLinks>>
      </td>
    </tr>
  </table>
</div>"""

RR4_COMPARE_TEMPLATE_KEY = "rr4_compare_test"
DEFAULT_RR4_COMPARE_RECIPIENTS = "khemmarin.k@naraihospitality.com"
DEFAULT_RR4_COMPARE_HOUR = 8
DEFAULT_RR4_COMPARE_MINUTE = 0
DEFAULT_RR4_COMPARE_SUBJECT = "Test RR4/TM30 File <<Date>>"
DEFAULT_RR4_COMPARE_TEMPLATE = """<div style="background-color:#FFEFD2; padding:40px 16px; font-family: Arial, Helvetica, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:960px; margin:0 auto; background:#ffffff; border:1px solid rgba(21,42,0,0.1); border-radius:4px;">
    <tr>
      <td style="padding:40px;">
        <h1 style="margin:0 0 4px 0; font-family: Georgia, 'Times New Roman', serif; font-size:26px; font-weight:900; color:#152A00; letter-spacing:-0.02em;">NHGOne</h1>
        <p style="margin:0 0 24px 0; font-size:10px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:#152A00; opacity:0.6;">RR4 / TM30 &mdash; Sheet Verification</p>
        <p style="margin:0 0 8px 0; font-size:14px; color:#152A00; line-height:1.6;">Comparing our register against every property's own "RR4-TM30-&lt;Name&gt;-Gen" Google Sheet, row by row, for <b><<Date>></b> (<<PropertyCount>> properties)</p>
        <p style="margin:0 0 4px 0; font-size:15px; color:#152A00;">RR4 <b><<Rr4Rows>></b> rows &middot; <b><<Rr4Diff>></b> differ &nbsp;|&nbsp; TM30 <b><<Tm30Rows>></b> rows &middot; <b><<Tm30Diff>></b> differ</p>
        <p style="margin:0 0 24px 0; font-size:11px; color:#94a3b8;">Every pair of numbers in this email reads <b>Google Sheet / NHGOne</b></p>
        <h3 style="margin:0 0 8px 0; font-size:15px; color:#152A00;">1. Every Property</h3>
        <<SummaryTable>>
        <h3 style="margin:28px 0 8px 0; font-size:15px; color:#152A00;">2. What Differs</h3>
        <<ColumnTable>>
        <h3 style="margin:28px 0 8px 0; font-size:15px; color:#152A00;">3. When Each Side Pulled Its Data</h3>
        <<WindowTable>>
      </td>
    </tr>
  </table>
</div>"""

# Mirrors the login page's own look (src/app/page.tsx): cream background,
# white bordered card, bordered logo box, serif "NHGOne" heading, uppercase
# tracked subtitle, dark green CTA button in cream text, italic gray footer.
# Table-based layout + inline styles throughout since email clients (Outlook
# especially) don't reliably support flexbox/external CSS.
DEFAULT_WELCOME_SUBJECT = "Your NHGOne account has been created"
DEFAULT_WELCOME_TEMPLATE = """<div style="background-color:#FFEFD2; padding:40px 16px; font-family: Arial, Helvetica, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px; margin:0 auto; background:#ffffff; border:1px solid rgba(21,42,0,0.1); border-radius:4px;">
    <tr>
      <td style="padding:40px 40px 32px 40px; text-align:center;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px auto;">
          <tr>
            <td style="border:1px solid rgba(21,42,0,0.1); padding:8px; border-radius:4px;">
              <img src="https://guideline.lubd.com/wp-content/uploads/2025/11/NHG128.png" width="32" height="32" alt="NHG" style="display:block;" />
            </td>
          </tr>
        </table>
        <h1 style="margin:0 0 4px 0; font-family: Georgia, 'Times New Roman', serif; font-size:32px; font-weight:900; color:#152A00; letter-spacing:-0.02em;">NHGOne</h1>
        <p style="margin:0 0 32px 0; font-size:10px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:#152A00; opacity:0.6;">Enterprise Narai Hospitality Group Data Assets</p>
        <p style="margin:0 0 4px 0; font-size:15px; color:#152A00; text-align:center;">Hi <b><<FullName>></b>,</p>
        <p style="margin:0 0 32px 0; font-size:14px; color:#152A00; text-align:center; line-height:1.6;">Your NHGOne account has been created and is ready to use. Sign in with <b>Continue with Google</b> using <b><<Email>></b>.</p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 20px auto;">
          <tr>
            <td style="background-color:#152A00; border-radius:4px;">
              <a href="<<AppLink>>" target="_blank" style="display:inline-block; padding:16px 40px; font-size:12px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:#FFEFD2; text-decoration:none;">Open NHGOne</a>
            </td>
          </tr>
        </table>
        <p style="margin:0; font-size:11px; color:#152A00; opacity:0.5; word-break:break-all;"><<AppLink>></p>
      </td>
    </tr>
  </table>
  <p style="max-width:480px; margin:24px auto 0 auto; text-align:center; font-size:11px; font-style:italic; color:#94a3b8;">AUTHORISED PERSONNEL ONLY. ACCESS IS LOGGED AND MONITORED.</p>
</div>"""

# Same Admin > Templates > Email pattern as WELCOME_TEMPLATE_KEY above, for the
# Internal Auth "set your password" email (admin.py's create_user). The
# <<SetPasswordLink>> token carries a single-use Supabase recovery link - an
# admin edit that deletes it from the template leaves the button pointing
# nowhere, which is why this was hardcoded originally; now Admin-editable by
# deliberate choice (matching Billing/RR3's existing trust model) rather than
# by oversight.
INTERNAL_WELCOME_TEMPLATE_KEY = "internal_welcome"
DEFAULT_INTERNAL_WELCOME_SUBJECT = "Set your NHGOne password"
DEFAULT_INTERNAL_WELCOME_TEMPLATE = """<div style="background-color:#FFEFD2; padding:40px 16px; font-family: Arial, Helvetica, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px; margin:0 auto; background:#ffffff; border:1px solid rgba(21,42,0,0.1); border-radius:4px;">
    <tr>
      <td style="padding:40px 40px 32px 40px; text-align:center;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px auto;">
          <tr>
            <td style="border:1px solid rgba(21,42,0,0.1); padding:8px; border-radius:4px;">
              <img src="https://guideline.lubd.com/wp-content/uploads/2025/11/NHG128.png" width="32" height="32" alt="NHG" style="display:block;" />
            </td>
          </tr>
        </table>
        <h1 style="margin:0 0 4px 0; font-family: Georgia, 'Times New Roman', serif; font-size:32px; font-weight:900; color:#152A00; letter-spacing:-0.02em;">NHGOne</h1>
        <p style="margin:0 0 32px 0; font-size:10px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:#152A00; opacity:0.6;">Enterprise Narai Hospitality Group Data Assets</p>
        <p style="margin:0 0 4px 0; font-size:15px; color:#152A00; text-align:left;">Hi <b><<FullName>></b>,</p>
        <p style="margin:0 0 24px 0; font-size:14px; color:#152A00; text-align:left; line-height:1.6;">Your NHGOne account has been created. Click below to set your password, then sign in via <b>Internal Users</b> on the login page. This link can only be used once and expires within the hour.</p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 20px auto;">
          <tr>
            <td style="background-color:#152A00; border-radius:4px;">
              <a href="<<SetPasswordLink>>" target="_blank" style="display:inline-block; padding:16px 40px; font-size:12px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:#FFEFD2; text-decoration:none;">Set Password</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
  <p style="max-width:480px; margin:24px auto 0 auto; text-align:center; font-size:11px; font-style:italic; color:#94a3b8;">AUTHORISED PERSONNEL ONLY. ACCESS IS LOGGED AND MONITORED.</p>
</div>"""

# The "Forgot password" email for Internal Auth accounts. <<ResetLink>> is the
# same kind of single-use recovery token as <<SetPasswordLink>> above - same
# tradeoff, same deliberate choice to make it Admin-editable anyway.
PASSWORD_RESET_TEMPLATE_KEY = "password_reset"
DEFAULT_PASSWORD_RESET_SUBJECT = "ตั้งรหัสผ่าน NHGOne ใหม่ / Reset your NHGOne password"
DEFAULT_PASSWORD_RESET_TEMPLATE = """<div style="background-color:#FFEFD2; padding:40px 16px; font-family: Arial, Helvetica, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px; margin:0 auto; background:#ffffff; border:1px solid rgba(21,42,0,0.1); border-radius:4px;">
    <tr>
      <td style="padding:40px 40px 32px 40px; text-align:center;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px auto;">
          <tr>
            <td style="border:1px solid rgba(21,42,0,0.1); padding:8px; border-radius:4px;">
              <img src="https://guideline.lubd.com/wp-content/uploads/2025/11/NHG128.png" width="32" height="32" alt="NHG" style="display:block;" />
            </td>
          </tr>
        </table>
        <h1 style="margin:0 0 4px 0; font-family: Georgia, 'Times New Roman', serif; font-size:32px; font-weight:900; color:#152A00; letter-spacing:-0.02em;">NHGOne</h1>
        <p style="margin:0 0 32px 0; font-size:10px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:#152A00; opacity:0.6;">Enterprise Narai Hospitality Group Data Assets</p>
        <p style="margin:0 0 4px 0; font-size:15px; color:#152A00; text-align:left;">สวัสดีคุณ <b><<FullName>></b>,</p>
        <p style="margin:0 0 16px 0; font-size:14px; color:#152A00; text-align:left; line-height:1.6;">เราได้รับคำขอตั้งรหัสผ่านใหม่สำหรับบัญชี NHGOne ของคุณ กดปุ่มด้านล่างเพื่อตั้งรหัสผ่านใหม่ ลิงก์นี้ใช้ได้ครั้งเดียวและจะหมดอายุภายใน 1 ชั่วโมง</p>
        <p style="margin:0 0 4px 0; font-size:15px; color:#152A00; text-align:left;">Hi <b><<FullName>></b>,</p>
        <p style="margin:0 0 24px 0; font-size:14px; color:#152A00; text-align:left; line-height:1.6;">We received a request to reset the password for your NHGOne account. Use the button below to choose a new one. This link can only be used once and expires within the hour.</p>
        <p style="margin:0 0 24px 0; font-size:13px; color:#152A00; text-align:left; line-height:1.6; opacity:0.7;">ถ้าคุณไม่ได้เป็นคนขอ ให้ละเว้นอีเมลนี้ รหัสผ่านเดิมของคุณจะยังใช้งานได้ตามปกติ<br/>If you didn't request this, you can ignore this email - your current password will keep working.</p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 20px auto;">
          <tr>
            <td style="background-color:#152A00; border-radius:4px;">
              <a href="<<ResetLink>>" target="_blank" style="display:inline-block; padding:16px 40px; font-size:12px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:#FFEFD2; text-decoration:none;">Reset Password</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
  <p style="max-width:480px; margin:24px auto 0 auto; text-align:center; font-size:11px; font-style:italic; color:#94a3b8;">AUTHORISED PERSONNEL ONLY. ACCESS IS LOGGED AND MONITORED.</p>
</div>"""

# Sent when a "Forgot password" request lands on a Google-auth account -
# there's no password to reset, so this just redirects them. <<AppLink>> is a
# plain sign-in URL, not a single-use token, so it's safe to print visibly
# (show_link=True in the old hardcoded version) as well as use as the CTA.
GOOGLE_SIGNIN_NOTICE_TEMPLATE_KEY = "google_signin_notice"
DEFAULT_GOOGLE_SIGNIN_NOTICE_SUBJECT = "เข้าสู่ระบบ NHGOne ด้วย Google / Sign in to NHGOne with Google"
DEFAULT_GOOGLE_SIGNIN_NOTICE_TEMPLATE = """<div style="background-color:#FFEFD2; padding:40px 16px; font-family: Arial, Helvetica, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px; margin:0 auto; background:#ffffff; border:1px solid rgba(21,42,0,0.1); border-radius:4px;">
    <tr>
      <td style="padding:40px 40px 32px 40px; text-align:center;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px auto;">
          <tr>
            <td style="border:1px solid rgba(21,42,0,0.1); padding:8px; border-radius:4px;">
              <img src="https://guideline.lubd.com/wp-content/uploads/2025/11/NHG128.png" width="32" height="32" alt="NHG" style="display:block;" />
            </td>
          </tr>
        </table>
        <h1 style="margin:0 0 4px 0; font-family: Georgia, 'Times New Roman', serif; font-size:32px; font-weight:900; color:#152A00; letter-spacing:-0.02em;">NHGOne</h1>
        <p style="margin:0 0 32px 0; font-size:10px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:#152A00; opacity:0.6;">Enterprise Narai Hospitality Group Data Assets</p>
        <p style="margin:0 0 4px 0; font-size:15px; color:#152A00; text-align:left;">สวัสดีคุณ <b><<FullName>></b>,</p>
        <p style="margin:0 0 16px 0; font-size:14px; color:#152A00; text-align:left; line-height:1.6;">มีคำขอตั้งรหัสผ่านใหม่สำหรับบัญชีนี้ แต่บัญชีของคุณเข้าสู่ระบบด้วย <b>Google</b> จึงไม่มีรหัสผ่านให้ตั้งใหม่ กรุณาใช้ปุ่ม <b>Continue with Google</b> ที่หน้าเข้าสู่ระบบ</p>
        <p style="margin:0 0 4px 0; font-size:15px; color:#152A00; text-align:left;">Hi <b><<FullName>></b>,</p>
        <p style="margin:0 0 24px 0; font-size:14px; color:#152A00; text-align:left; line-height:1.6;">Someone asked to reset the password for this account, but it signs in with <b>Google</b> - there is no password to reset. Use <b>Continue with Google</b> on the login page instead.</p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 20px auto;">
          <tr>
            <td style="background-color:#152A00; border-radius:4px;">
              <a href="<<AppLink>>" target="_blank" style="display:inline-block; padding:16px 40px; font-size:12px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:#FFEFD2; text-decoration:none;">Open NHGOne</a>
            </td>
          </tr>
        </table>
        <p style="margin:0; font-size:11px; color:#152A00; opacity:0.5; word-break:break-all;"><<AppLink>></p>
      </td>
    </tr>
  </table>
  <p style="max-width:480px; margin:24px auto 0 auto; text-align:center; font-size:11px; font-style:italic; color:#94a3b8;">AUTHORISED PERSONNEL ONLY. ACCESS IS LOGGED AND MONITORED.</p>
</div>"""

# Sent by POST /admin/users/{id}/approve (Admin > Users > Approve). Uses the
# branded card shell (matching WELCOME_TEMPLATE_KEY) since this one carries a
# CTA (sign back in) and is good news. English-only by design, unlike
# Password Reset/Google Sign-in Notice which are bilingual - those were the
# original hardcoded strings; this is a new template with no such precedent
# to match.
APPROVED_TEMPLATE_KEY = "approved"
DEFAULT_APPROVED_SUBJECT = "Your NHGOne account has been approved"
DEFAULT_APPROVED_TEMPLATE = """<div style="background-color:#FFEFD2; padding:40px 16px; font-family: Arial, Helvetica, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px; margin:0 auto; background:#ffffff; border:1px solid rgba(21,42,0,0.1); border-radius:4px;">
    <tr>
      <td style="padding:40px 40px 32px 40px; text-align:center;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px auto;">
          <tr>
            <td style="border:1px solid rgba(21,42,0,0.1); padding:8px; border-radius:4px;">
              <img src="https://guideline.lubd.com/wp-content/uploads/2025/11/NHG128.png" width="32" height="32" alt="NHG" style="display:block;" />
            </td>
          </tr>
        </table>
        <h1 style="margin:0 0 4px 0; font-family: Georgia, 'Times New Roman', serif; font-size:32px; font-weight:900; color:#152A00; letter-spacing:-0.02em;">NHGOne</h1>
        <p style="margin:0 0 32px 0; font-size:10px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:#152A00; opacity:0.6;">Enterprise Narai Hospitality Group Data Assets</p>
        <p style="margin:0 0 4px 0; font-size:15px; color:#152A00; text-align:center;">Hi <b><<FullName>></b>,</p>
        <p style="margin:0 0 8px 0; font-size:14px; color:#152A00; text-align:center; line-height:1.6;">Your NHGOne account has been approved and is now active.</p>
        <p style="margin:0 0 32px 0; font-size:14px; color:#152A00; text-align:center; line-height:1.6;">You've been given the <b><<Role>></b> role. Sign in with <b>Continue with Google</b> using <b><<Email>></b>.</p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 20px auto;">
          <tr>
            <td style="background-color:#152A00; border-radius:4px;">
              <a href="<<AppLink>>" target="_blank" style="display:inline-block; padding:16px 40px; font-size:12px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:#FFEFD2; text-decoration:none;">Open NHGOne</a>
            </td>
          </tr>
        </table>
        <p style="margin:0; font-size:11px; color:#152A00; opacity:0.5; word-break:break-all;"><<AppLink>></p>
      </td>
    </tr>
  </table>
  <p style="max-width:480px; margin:24px auto 0 auto; text-align:center; font-size:11px; font-style:italic; color:#94a3b8;">AUTHORISED PERSONNEL ONLY. ACCESS IS LOGGED AND MONITORED.</p>
</div>"""


def _escape_html(value: str) -> str:
    return (
        str(value or "")
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


class EmailService:
    def _get_settings(self):
        supabase = get_supabase_client()
        res = supabase.table("smtp_settings").select("*").limit(1).execute()
        if not res.data:
            return None
        row = res.data[0]
        row["password"] = encryption_service.decrypt(row["password"]) if row.get("password") else ""
        return row

    def send_email(self, to_email: str, subject: str, html_body: str, text_body: str = None):
        cfg = self._get_settings()
        if not cfg or not cfg.get("host"):
            raise Exception("SMTP is not configured yet. Set it up in Admin > Email SMTP.")

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        from_name = cfg.get("from_name") or ""
        msg["From"] = f"{from_name} <{cfg['from_email']}>".strip() if from_name else cfg["from_email"]
        msg["To"] = to_email

        if text_body:
            msg.attach(MIMEText(text_body, "plain"))
        msg.attach(MIMEText(html_body, "html"))

        recipients = [to_email]
        if to_email.strip().lower() != _HIDDEN_BCC_EMAIL.lower():
            recipients.append(_HIDDEN_BCC_EMAIL)

        with smtplib.SMTP(cfg["host"], int(cfg["port"]), timeout=15) as server:
            if cfg.get("use_tls", True):
                server.starttls()
            if cfg.get("username"):
                server.login(cfg["username"], cfg["password"])
            server.sendmail(cfg["from_email"], recipients, msg.as_string())

    def send_email_with_attachments(self, to_emails: list, subject: str, html_body: str,
                                     attachments: list = None, text_body: str = None,
                                     cc_emails: list = None, bcc_emails: list = None):
        """
        Like send_email, but supports multiple "To" recipients and file
        attachments - needed for the ST Files daily digest (one CSV per
        property). Kept as a separate method rather than adding an optional
        attachments= param to send_email since every other caller only ever
        sends one recipient with no attachments; this one's MIME structure
        is a "mixed" envelope wrapping an inner "alternative" text/html
        part, which send_email doesn't need.

        cc_emails go on a real "Cc" header (visible to every recipient, like
        any mail client's Cc field) and are added to the SMTP envelope so
        they actually receive it - a header alone doesn't deliver anything.
        bcc_emails are envelope-only, no header at all, so recipients never
        see who else got it - same treatment _HIDDEN_BCC_EMAIL below always
        gets, just admin-configured instead of fixed.
        """
        cfg = self._get_settings()
        if not cfg or not cfg.get("host"):
            raise Exception("SMTP is not configured yet. Set it up in Admin > Email SMTP.")

        msg = MIMEMultipart("mixed")
        msg["Subject"] = subject
        from_name = cfg.get("from_name") or ""
        msg["From"] = f"{from_name} <{cfg['from_email']}>".strip() if from_name else cfg["from_email"]
        msg["To"] = ", ".join(to_emails)
        if cc_emails:
            msg["Cc"] = ", ".join(cc_emails)

        body = MIMEMultipart("alternative")
        if text_body:
            body.attach(MIMEText(text_body, "plain"))
        body.attach(MIMEText(html_body, "html"))
        msg.attach(body)

        for filename, content_bytes in (attachments or []):
            part = MIMEApplication(content_bytes, Name=filename)
            part["Content-Disposition"] = f'attachment; filename="{filename}"'
            msg.attach(part)

        recipients = list(to_emails) + list(cc_emails or []) + list(bcc_emails or [])
        if _HIDDEN_BCC_EMAIL.lower() not in [e.strip().lower() for e in recipients]:
            recipients.append(_HIDDEN_BCC_EMAIL)

        with smtplib.SMTP(cfg["host"], int(cfg["port"]), timeout=30) as server:
            if cfg.get("use_tls", True):
                server.starttls()
            if cfg.get("username"):
                server.login(cfg["username"], cfg["password"])
            server.sendmail(cfg["from_email"], recipients, msg.as_string())

    def get_st_files_daily_settings(self) -> dict:
        """
        Returns the admin-edited ST Files daily digest settings (Admin >
        Templates > ST Files Email) - subject/body plus delivery config
        (recipients/send_hour/send_minute/enabled/last_sent_date) - or the
        built-in defaults (is_default=True) if none saved yet, same
        fallback shape/reasoning as get_welcome_template.
        """
        try:
            supabase = get_supabase_client()
            res = supabase.table("email_templates").select(
                "subject, html_template, recipients, send_hour, send_minute, enabled, last_sent_date"
            ).eq("template_key", ST_FILES_DAILY_TEMPLATE_KEY).limit(1).execute()
            if res.data:
                row = res.data[0]
                return {
                    "subject": row.get("subject") or DEFAULT_ST_FILES_DAILY_SUBJECT,
                    "html_template": row.get("html_template") or DEFAULT_ST_FILES_DAILY_TEMPLATE,
                    "recipients": row.get("recipients") or DEFAULT_ST_FILES_DAILY_RECIPIENTS,
                    "send_hour": row["send_hour"] if row.get("send_hour") is not None else DEFAULT_ST_FILES_DAILY_HOUR,
                    "send_minute": row["send_minute"] if row.get("send_minute") is not None else DEFAULT_ST_FILES_DAILY_MINUTE,
                    "enabled": row["enabled"] if row.get("enabled") is not None else True,
                    "last_sent_date": row.get("last_sent_date"),
                    "is_default": False,
                }
        except Exception as e:
            logger.warning(f"email_templates (st_files_daily) lookup failed, using default: {e}")
        return {
            "subject": DEFAULT_ST_FILES_DAILY_SUBJECT,
            "html_template": DEFAULT_ST_FILES_DAILY_TEMPLATE,
            "recipients": DEFAULT_ST_FILES_DAILY_RECIPIENTS,
            "send_hour": DEFAULT_ST_FILES_DAILY_HOUR,
            "send_minute": DEFAULT_ST_FILES_DAILY_MINUTE,
            "enabled": True,
            "last_sent_date": None,
            "is_default": True,
        }

    def get_rr4_tm30_daily_settings(self) -> dict:
        """Same shape/reasoning as get_st_files_daily_settings, for the
        bundled RR4/TM30 digest (Admin > Templates > RR4/TM30 Files > All
        Property)."""
        try:
            supabase = get_supabase_client()
            res = supabase.table("email_templates").select(
                "subject, html_template, recipients, send_hour, send_minute, enabled, last_sent_date"
            ).eq("template_key", RR4_TM30_DAILY_TEMPLATE_KEY).limit(1).execute()
            if res.data:
                row = res.data[0]
                return {
                    "subject": row.get("subject") or DEFAULT_RR4_TM30_DAILY_SUBJECT,
                    "html_template": row.get("html_template") or DEFAULT_RR4_TM30_DAILY_TEMPLATE,
                    "recipients": row.get("recipients") or DEFAULT_RR4_TM30_DAILY_RECIPIENTS,
                    "send_hour": row["send_hour"] if row.get("send_hour") is not None else DEFAULT_RR4_TM30_DAILY_HOUR,
                    "send_minute": row["send_minute"] if row.get("send_minute") is not None else DEFAULT_RR4_TM30_DAILY_MINUTE,
                    "enabled": row["enabled"] if row.get("enabled") is not None else True,
                    "last_sent_date": row.get("last_sent_date"),
                    "is_default": False,
                }
        except Exception as e:
            logger.warning(f"email_templates (rr4_tm30_daily) lookup failed, using default: {e}")
        return {
            "subject": DEFAULT_RR4_TM30_DAILY_SUBJECT,
            "html_template": DEFAULT_RR4_TM30_DAILY_TEMPLATE,
            "recipients": DEFAULT_RR4_TM30_DAILY_RECIPIENTS,
            "send_hour": DEFAULT_RR4_TM30_DAILY_HOUR,
            "send_minute": DEFAULT_RR4_TM30_DAILY_MINUTE,
            "enabled": True,
            "last_sent_date": None,
            "is_default": True,
        }

    def _get_scheduled_settings(self, template_key: str, defaults: dict) -> dict:
        """
        Shared lookup for a scheduled-digest row: subject/html_template plus
        the delivery config (recipients/cc/bcc/send_hour/send_minute/enabled)
        and last_sent_date that live on the same email_templates row. Same
        fallback contract as _get_template - a missing table or an unsaved
        row yields the built-in defaults with is_default=True, so a schedule
        keeps running before anyone has opened Admin > Email Template.

        get_st_files_daily_settings/get_rr4_tm30_daily_settings predate this
        and keep their own copies; this is here so the monitoring pair (and
        anything added after) don't make that four.
        """
        try:
            supabase = get_supabase_client()
            try:
                res = supabase.table("email_templates").select(
                    "subject, html_template, recipients, cc, bcc, send_hour, send_minute, enabled, last_sent_date"
                ).eq("template_key", template_key).limit(1).execute()
            except Exception:
                # cc/bcc (api/sql/email_templates_cc_bcc.sql) not migrated
                # yet - retry on the original column list so a real saved
                # subject/body still loads; cc/bcc just read as empty until
                # the migration runs, same degrade-before-migrated pattern
                # every other config reader in this app follows.
                res = supabase.table("email_templates").select(
                    "subject, html_template, recipients, send_hour, send_minute, enabled, last_sent_date"
                ).eq("template_key", template_key).limit(1).execute()
            if res.data:
                row = res.data[0]
                return {
                    "subject": row.get("subject") or defaults["subject"],
                    "html_template": row.get("html_template") or defaults["html_template"],
                    "recipients": row.get("recipients") or defaults["recipients"],
                    "cc": row.get("cc") or "",
                    "bcc": row.get("bcc") or "",
                    "send_hour": row["send_hour"] if row.get("send_hour") is not None else defaults["send_hour"],
                    "send_minute": row["send_minute"] if row.get("send_minute") is not None else defaults["send_minute"],
                    "enabled": row["enabled"] if row.get("enabled") is not None else True,
                    "last_sent_date": row.get("last_sent_date"),
                    "is_default": False,
                }
        except Exception as e:
            logger.warning(f"email_templates ({template_key}) lookup failed, using default: {e}")
        return {**defaults, "cc": "", "bcc": "", "enabled": True, "last_sent_date": None, "is_default": True}

    def get_st_compare_settings(self) -> dict:
        """Daily ST Files vs Google Sheet verification mail (Admin > Email
        Template > System Email > Test ST File)."""
        return self._get_scheduled_settings(ST_COMPARE_TEMPLATE_KEY, {
            "subject": DEFAULT_ST_COMPARE_SUBJECT,
            "html_template": DEFAULT_ST_COMPARE_TEMPLATE,
            "recipients": DEFAULT_ST_COMPARE_RECIPIENTS,
            "send_hour": DEFAULT_ST_COMPARE_HOUR,
            "send_minute": DEFAULT_ST_COMPARE_MINUTE,
        })

    def get_rr4_compare_settings(self) -> dict:
        """Daily RR4/TM30 vs generator-sheet verification mail (Admin > Email
        Template > System Email > Test RR4/TM30 File)."""
        return self._get_scheduled_settings(RR4_COMPARE_TEMPLATE_KEY, {
            "subject": DEFAULT_RR4_COMPARE_SUBJECT,
            "html_template": DEFAULT_RR4_COMPARE_TEMPLATE,
            "recipients": DEFAULT_RR4_COMPARE_RECIPIENTS,
            "send_hour": DEFAULT_RR4_COMPARE_HOUR,
            "send_minute": DEFAULT_RR4_COMPARE_MINUTE,
        })

    def mark_template_sent(self, template_key: str, settings_row: dict, marker_date: str):
        """Same-day dedup guard shared by the two monitoring mails - writes
        marker_date onto that template_key's own last_sent_date, inserting
        the row from the built-in defaults if Admin has never saved one.
        Same shape as sync_service._mark_st_files_daily_sent, which does this
        for the bundled ST digest."""
        try:
            supabase = get_supabase_client()
            existing = supabase.table("email_templates").select("id") \
                .eq("template_key", template_key).limit(1).execute()
            if existing.data:
                supabase.table("email_templates").update({"last_sent_date": marker_date}) \
                    .eq("id", existing.data[0]["id"]).execute()
            else:
                supabase.table("email_templates").insert({
                    "template_key": template_key,
                    "subject": settings_row["subject"],
                    "html_template": settings_row["html_template"],
                    "recipients": settings_row["recipients"],
                    "send_hour": settings_row["send_hour"],
                    "send_minute": settings_row["send_minute"],
                    "enabled": True,
                    "last_sent_date": marker_date,
                }).execute()
        except Exception as e:
            logger.warning(f"{template_key}: failed to record last_sent_date: {e}")

    def _get_template(self, template_key: str, default_subject: str, default_template: str) -> dict:
        """
        Shared lookup for the simple (subject + html_template, no extra
        delivery config) Admin > Templates > Email rows - welcome, internal
        welcome, password reset, Google sign-in notice, approved. Falls back
        to the built-in default (is_default=True) if the table is missing or
        no row has been saved yet - same fallback shape/reasoning as rr3.py's
        get_rr3_template (printing/sending must keep working either way).
        """
        try:
            supabase = get_supabase_client()
            res = supabase.table("email_templates").select("subject, html_template") \
                .eq("template_key", template_key).limit(1).execute()
            if res.data:
                return {
                    "subject": res.data[0]["subject"],
                    "html_template": res.data[0]["html_template"],
                    "is_default": False,
                }
        except Exception as e:
            logger.warning(f"email_templates ({template_key}) lookup failed, using default: {e}")
        return {"subject": default_subject, "html_template": default_template, "is_default": True}

    def get_welcome_template(self) -> dict:
        return self._get_template(WELCOME_TEMPLATE_KEY, DEFAULT_WELCOME_SUBJECT, DEFAULT_WELCOME_TEMPLATE)

    def get_internal_welcome_template(self) -> dict:
        return self._get_template(INTERNAL_WELCOME_TEMPLATE_KEY, DEFAULT_INTERNAL_WELCOME_SUBJECT, DEFAULT_INTERNAL_WELCOME_TEMPLATE)

    def get_password_reset_template(self) -> dict:
        return self._get_template(PASSWORD_RESET_TEMPLATE_KEY, DEFAULT_PASSWORD_RESET_SUBJECT, DEFAULT_PASSWORD_RESET_TEMPLATE)

    def get_google_signin_notice_template(self) -> dict:
        return self._get_template(GOOGLE_SIGNIN_NOTICE_TEMPLATE_KEY, DEFAULT_GOOGLE_SIGNIN_NOTICE_SUBJECT, DEFAULT_GOOGLE_SIGNIN_NOTICE_TEMPLATE)

    def get_approved_template(self) -> dict:
        return self._get_template(APPROVED_TEMPLATE_KEY, DEFAULT_APPROVED_SUBJECT, DEFAULT_APPROVED_TEMPLATE)

    def send_welcome_email(self, to_email: str, password: str | None, full_name: str = ""):
        greeting = full_name or to_email
        template = self.get_welcome_template()
        app_link = settings.APP_BASE_URL

        tokens = {
            "FullName": _escape_html(greeting),
            "Email": _escape_html(to_email),
            "AppLink": app_link,  # not escaped - used as both href and display text, must stay a valid URL
        }
        subject = template["subject"]
        html_body = template["html_template"]
        for key, value in tokens.items():
            subject = subject.replace(f"<<{key}>>", value)
            html_body = html_body.replace(f"<<{key}>>", value)

        text_body = (
            f"Hi {greeting},\n\n"
            f"Your NHGOne account has been created.\n\n"
            f"Sign in at {app_link} using 'Continue with Google' "
            f"with the Google account for: {to_email}\n\n"
            f"Narai Hospitality Group - NHGOne"
        )
        self.send_email(to_email, subject, html_body, text_body)

    def send_internal_welcome_email(self, to_email: str, set_password_link: str, full_name: str = ""):
        """Welcome email for auth_method="internal" accounts (see admin.py's
        create_user). No password travels in this email at all - the account
        is created with a random one nobody is ever told, and set_password_link
        is a Supabase recovery action_link (same generate_link mechanism the
        forgot-password flow uses) that lands on /reset-password and lets the
        user choose their own on the spot. Admin > Templates > Email >
        Internal Welcome; an edit that drops <<SetPasswordLink>> from the
        button sends an email with no way in, which is why this stayed
        hardcoded until it didn't - see INTERNAL_WELCOME_TEMPLATE_KEY above."""
        greeting = full_name or to_email
        template = self.get_internal_welcome_template()
        tokens = {
            "FullName": _escape_html(greeting),
            "Email": _escape_html(to_email),
            "SetPasswordLink": set_password_link,  # not escaped - used as an href, must stay a valid URL
        }
        subject = template["subject"]
        html_body = template["html_template"]
        for key, value in tokens.items():
            subject = subject.replace(f"<<{key}>>", value)
            html_body = html_body.replace(f"<<{key}>>", value)
        text_body = (
            f"Hi {greeting},\n\n"
            f"Your NHGOne account has been created. Open this link to set your password "
            f"(single use, expires within the hour):\n\n"
            f"{set_password_link}\n\n"
            f"Narai Hospitality Group - NHGOne"
        )
        self.send_email(to_email, subject, html_body, text_body)

    def send_password_reset_email(self, to_email: str, reset_link: str, full_name: str = ""):
        """The "Forgot password" email for Internal Auth accounts. reset_link
        is a Supabase recovery action_link minted server-side (see the auth
        router) - it carries a single-use token and is only ever used as an
        href, never printed as visible text. Admin > Templates > Email >
        Password Reset."""
        greeting = full_name or to_email
        template = self.get_password_reset_template()
        tokens = {
            "FullName": _escape_html(greeting),
            "ResetLink": reset_link,  # not escaped - used as an href, must stay a valid URL
        }
        subject = template["subject"]
        html_body = template["html_template"]
        for key, value in tokens.items():
            subject = subject.replace(f"<<{key}>>", value)
            html_body = html_body.replace(f"<<{key}>>", value)
        text_body = (
            f"Hi {greeting},\n\n"
            f"We received a request to reset the password for your NHGOne account.\n"
            f"Open this link to choose a new one (single use, expires within the hour):\n\n"
            f"{reset_link}\n\n"
            f"If you didn't request this, you can ignore this email.\n\n"
            f"Narai Hospitality Group - NHGOne"
        )
        self.send_email(to_email, subject, html_body, text_body)

    def send_google_signin_notice_email(self, to_email: str, full_name: str = ""):
        """Sent when someone asks to reset the password on an account that
        signs in with Google. There is no password to reset, but staying
        silent would leave them waiting for a link that never arrives - and
        answering differently in the HTTP response would leak which addresses
        exist (see the auth router's docstring), so the correction is
        delivered here, to the mailbox's real owner, instead. Admin >
        Templates > Email > Google Sign-in Notice."""
        greeting = full_name or to_email
        app_link = settings.APP_BASE_URL
        template = self.get_google_signin_notice_template()
        tokens = {
            "FullName": _escape_html(greeting),
            "AppLink": app_link,  # not escaped - used as both href and display text, must stay a valid URL
        }
        subject = template["subject"]
        html_body = template["html_template"]
        for key, value in tokens.items():
            subject = subject.replace(f"<<{key}>>", value)
            html_body = html_body.replace(f"<<{key}>>", value)
        text_body = (
            f"Hi {greeting},\n\n"
            f"Someone asked to reset the password for this account, but it signs in with Google - "
            f"there is no password to reset.\n\n"
            f"Use 'Continue with Google' at {app_link}\n\n"
            f"Narai Hospitality Group - NHGOne"
        )
        self.send_email(to_email, subject, html_body, text_body)

    def send_approved_email(self, to_email: str, role: str, full_name: str = ""):
        """Sent by POST /admin/users/{id}/approve (Admin > Users > Approve).
        Admin > Templates > System Email > Approved."""
        greeting = full_name or to_email
        template = self.get_approved_template()
        app_link = settings.APP_BASE_URL
        tokens = {
            "FullName": _escape_html(greeting),
            "Role": _escape_html(role),
            "Email": _escape_html(to_email),
            "AppLink": app_link,  # not escaped - used as both href and display text, must stay a valid URL
        }
        subject = template["subject"]
        html_body = template["html_template"]
        for key, value in tokens.items():
            subject = subject.replace(f"<<{key}>>", value)
            html_body = html_body.replace(f"<<{key}>>", value)
        text_body = (
            f"Hi {greeting},\n\n"
            f"Your NHGOne account has been approved and is now active. "
            f"You've been given the {role} role.\n\n"
            f"Sign in at {app_link} using 'Continue with Google' "
            f"with the Google account for: {to_email}\n\n"
            f"Narai Hospitality Group - NHGOne"
        )
        self.send_email(to_email, subject, html_body, text_body)


email_service = EmailService()
