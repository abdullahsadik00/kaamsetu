/**
 * Public pages Google sign-in needs before the app can be published (home,
 * privacy policy, terms), and DPDP expects (a clear privacy notice). Plain
 * HTML served by the API so they need no extra hosting.
 *
 * Keep the privacy text true to what the code does; update it in the same
 * commit as any change to what data is collected or where it goes.
 */

export const POLICY_DATE = '20 November 2026';

export type SiteSettings = {
  /** Where people write for privacy requests and support (SUPPORT_EMAIL). */
  supportEmail?: string;
  /** Google Search Console HTML-tag verification code (GOOGLE_SITE_VERIFICATION). */
  googleVerification?: string;
};

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function contact(s: SiteSettings): string {
  return s.supportEmail
    ? `<a href="mailto:${esc(s.supportEmail)}">${esc(s.supportEmail)}</a>`
    : 'the email address shown in the KaamSetu app';
}

function layout(title: string, body: string, s: SiteSettings, extraHead = ''): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
${extraHead}
<style>
  :root { --teal:#0F766E; --paper:#F7F5F0; --ink:#14213D; --slate:#4A5468; --line:#E4E0D6; }
  body { margin:0; background:var(--paper); color:var(--ink);
         font: 17px/1.6 "Noto Sans", "Noto Sans Devanagari", system-ui, sans-serif; }
  main { max-width: 760px; margin: 0 auto; padding: 24px 16px 48px; }
  header { background: var(--teal); color: #fff; padding: 20px 16px; }
  header .in { max-width: 760px; margin: 0 auto; }
  header a { color:#fff; text-decoration:none; font-weight:700; font-size:22px; }
  h1 { font-size: 28px; line-height: 1.25; margin: 8px 0 4px; }
  h2 { font-size: 20px; margin: 28px 0 8px; }
  .muted { color: var(--slate); font-size: 15px; }
  .card { background:#fff; border:1px solid var(--line); border-radius:12px; padding:16px; margin:16px 0; }
  a { color: var(--teal); }
  nav a { margin-right: 16px; }
  footer { border-top:1px solid var(--line); margin-top:40px; padding-top:16px; }
</style>
</head>
<body>
<header><div class="in"><a href="/">KaamSetu <span lang="hi">कामसेतु</span></a></div></header>
<main>
${body}
<footer class="muted">
  <nav><a href="/">Home</a><a href="/privacy">Privacy policy</a><a href="/terms">Terms</a></nav>
  <p>KaamSetu by Vyapaar Labs · Contact: ${contact(s)}</p>
</footer>
</main>
</body>
</html>`;
}

export function homePage(s: SiteSettings): string {
  const verify = s.googleVerification
    ? `<meta name="google-site-verification" content="${esc(s.googleVerification)}">`
    : '';
  return layout(
    'KaamSetu — AC service jobs and bills, made simple',
    `<h1>Simple jobs and billing for AC service businesses</h1>
<p lang="hi"><strong>काम आसान। हिसाब आसान। कारोबार आसान।</strong></p>
<p>KaamSetu is an Android app for small AC service and repair businesses in India.
The owner keeps enquiries, jobs, teams and bills in one place; senior technicians
and helpers see their work for the day and can keep working without internet.</p>
<div class="card">
  <strong>Early access.</strong> KaamSetu is in a pilot with a small number of businesses.
  New businesses get a 30-day free trial. Staff join a business only when the owner
  invites them.
</div>
<h2>Who it is for</h2>
<p>Owners of AC service businesses, their senior technicians and helpers.</p>
<h2>Your data</h2>
<p>We sign you in with your Google account and never see your Google password.
We do not sell data or show ads. Read the <a href="/privacy">privacy policy</a>
and the <a href="/terms">terms of use</a>.</p>`,
    s,
    verify,
  );
}

export function privacyPage(s: SiteSettings): string {
  return layout(
    'KaamSetu — Privacy policy',
    `<h1>Privacy policy</h1>
<p class="muted">Last updated ${POLICY_DATE}</p>

<p>This policy explains what personal data the KaamSetu app and service collect,
why, where it is kept, and the choices you have. KaamSetu is run by Vyapaar Labs
("we"). It is written with India's Digital Personal Data Protection Act, 2023 in mind.</p>

<div class="card" lang="hi"><strong>सारांश:</strong> हम आपका नाम, मोबाइल नंबर और Google ईमेल
सिर्फ़ ऐप चलाने के लिए रखते हैं। आपका Google पासवर्ड हमें कभी नहीं मिलता। हम डेटा बेचते नहीं,
विज्ञापन नहीं दिखाते और आपकी लोकेशन ट्रैक नहीं करते। डेटा हटवाने या सुधारने के लिए हमें लिखें: ${contact(s)}।</div>

<h2>Two kinds of data</h2>
<ul>
  <li><strong>Your account.</strong> For the data about you as a KaamSetu user (owner,
  senior technician or helper), we decide how it is used and are responsible for it.</li>
  <li><strong>A business's work data.</strong> Customers, addresses, ACs, jobs, photos, bills
  and payments that a business enters belong to that business. The business decides what
  it records about its customers; we store and process it only to run the app for them.</li>
</ul>

<h2>What we collect</h2>
<ul>
  <li><strong>Sign-in:</strong> your Google account's ID, email address and name, received from
  Google when you choose "Continue with Google". We never receive your Google password.</li>
  <li><strong>Profile:</strong> your name, mobile number and role in a business (owner, senior
  technician or helper); your chosen app language.</li>
  <li><strong>Business details</strong> (owners): business name, business mobile number, city,
  whether it gives GST bills, and GSTIN if entered.</li>
  <li><strong>Staff records</strong> (owners): names, mobile numbers and roles of the people they
  add, and whether each has joined.</li>
  <li><strong>Devices and sessions:</strong> your phone's model name and platform, and login
  sessions, so we can keep you signed in and sign out a lost phone.</li>
  <li><strong>Work data</strong> entered by a business, as those features arrive (customers, jobs,
  photos, bills, payments).</li>
  <li><strong>Technical logs:</strong> request time, route, result and a request ID. Logs do not
  contain one-time codes, sign-in tokens, addresses or full phone numbers.</li>
</ul>
<p>We do <strong>not</strong> collect Aadhaar or other identity documents, contacts, location
history, or advertising identifiers, and the app has no ads.</p>

<h2>Why we use it</h2>
<ul>
  <li>To sign you in and keep your account secure.</li>
  <li>To show each person only the work and business they belong to.</li>
  <li>To keep work saved on the phone when there is no internet and send it later.</li>
  <li>To support you, fix problems and keep backups.</li>
</ul>
<p>We do not sell personal data, use it for advertising, or share it with other businesses
on KaamSetu. Each business's data is kept separate from every other business.</p>

<h2>Where it is kept and who helps us</h2>
<ul>
  <li><strong>Database:</strong> Supabase (PostgreSQL), Mumbai region, India.</li>
  <li><strong>App server:</strong> Render, Singapore region. Data passes through it to and from the database.</li>
  <li><strong>Sign-in:</strong> Google, for "Continue with Google".</li>
  <li><strong>Backups:</strong> an encrypted copy of the database is made every night and kept
  for 14 days in our GitHub account. It can only be opened with our private passphrase.</li>
  <li><strong>App builds:</strong> Expo (EAS) builds the Android app; it does not receive your data.</li>
  <li><strong>Uptime check:</strong> UptimeRobot checks every few minutes that the server is up;
  it does not receive personal data.</li>
</ul>
<p>All traffic between the app and the server is encrypted (HTTPS). On the phone, sign-in
tokens are kept in the Android Keystore.</p>

<h2>How long we keep it</h2>
<p>We keep your data while you or your business use KaamSetu. If you leave a business, the
owner can remove you; your sign-in stops at once, and the business keeps its own work
records. When an account or business is deleted, we remove its data within 30 days;
encrypted backups expire within a further 14 days.</p>

<h2>Your choices and rights</h2>
<p>You can ask us to show, correct or delete your personal data, or tell us about a
problem with how it is handled, by writing to ${contact(s)}. Staff can also ask their
business owner, who can correct or remove their record in the app. We answer within
30 days. If you are not satisfied, you may complain to the Data Protection Board of India.</p>

<h2>Children</h2>
<p>KaamSetu is meant for people working in a business and is not for anyone under 18.</p>

<h2>Changes</h2>
<p>If we change this policy, we will update the date above and, for important changes,
tell users in the app.</p>`,
    s,
  );
}

export function termsPage(s: SiteSettings): string {
  return layout(
    'KaamSetu — Terms of use',
    `<h1>Terms of use</h1>
<p class="muted">Last updated ${POLICY_DATE}</p>

<p>These terms apply to the KaamSetu app and service, run by Vyapaar Labs ("we").
By using KaamSetu you agree to them.</p>

<h2>Early access and free trial</h2>
<p>KaamSetu is in early access. A new business gets a 30-day free trial. We will tell you
before any paid plan starts; nothing is charged without your agreement. Features may
change while we learn from early users.</p>

<h2>Accounts</h2>
<ul>
  <li>You sign in with your own Google account and keep it secure.</li>
  <li>The owner who sets up a business is responsible for who they invite and for removing
  people who leave.</li>
  <li>Each person may belong to one business at a time.</li>
</ul>

<h2>The business's data</h2>
<p>A business owns the work data it enters (customers, jobs, bills). The business is
responsible for having a valid reason to record its customers' details and for the
accuracy of its bills, tax and GST information. KaamSetu helps keep records; it does not
give legal, tax or accounting advice.</p>

<h2>Fair use</h2>
<p>Do not use KaamSetu for anything unlawful, to send spam, to access another business's
data, or to disrupt the service.</p>

<h2>Availability</h2>
<p>We work to keep KaamSetu available and your data safe, including nightly encrypted
backups, but during early access the service is provided "as is" without guarantees of
uninterrupted availability. Work saved on a phone without internet is sent when the
phone is back online.</p>

<h2>Ending use</h2>
<p>You can stop using KaamSetu at any time and ask us to delete your data
(see the <a href="/privacy">privacy policy</a>). We may suspend accounts that break
these terms.</p>

<h2>Law</h2>
<p>These terms are governed by the laws of India.</p>

<h2>Contact</h2>
<p>${contact(s)}</p>`,
    s,
  );
}
