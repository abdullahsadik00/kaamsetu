/**
 * English strings. This object defines the key structure; `hi` and `mr`
 * must provide every key (checked by the `Translations` type).
 * Technician/helper wording comes from the clickable prototype (docs/design).
 */
export const en = {
  common: {
    appName: 'KaamSetu',
    tagline: 'Work made easier. Accounts made easier. Business made easier.',
    retry: 'Try again',
    cancel: 'Cancel',
    loading: 'Loading…',
    comingSoonTitle: 'Coming soon',
    comingSoonBody: 'This part of the app is being built.',
  },
  language: {
    label: 'Language',
  },
  auth: {
    loginTitle: 'Log in',
    phoneHeading: 'Enter your mobile number',
    phoneHint: 'We will send a 6-digit code by SMS.',
    phoneLabel: 'Mobile number',
    phonePlaceholder: '10 digit number',
    phoneInvalid: 'Number should have 10 digits',
    sendCode: 'Send code',
    otpTitle: 'Enter code',
    otpHeading: 'Enter the 6-digit code sent to {{phone}}',
    otpLabel: '6-digit code',
    otpInvalid: 'The code has 6 digits',
    continue: 'Continue',
    resend: 'Send code again',
    resendIn: 'Send again in {{seconds}} s',
    changeNumber: 'Change number',
  },
  roles: {
    OWNER: 'Owner',
    SENIOR_TECHNICIAN: 'Senior technician',
    HELPER: 'Helper',
  },
  owner: {
    home: 'Home',
    jobs: 'Jobs',
    customers: 'Customers',
    billing: 'Billing',
    more: 'More',
  },
  field: {
    myWork: 'My Work',
    history: 'History',
    profile: 'Profile',
    noJobs: 'No jobs today',
    noJobsSub: 'New jobs from the owner appear here.',
  },
  helper: {
    todaysWork: "Today's work",
    helperNote: "Your senior fills in the job report. You don't need to fill anything.",
  },
  profile: {
    title: 'Profile',
    me: 'Me',
    logout: 'Log out',
    logoutTitle: 'Log out?',
    logoutUnsent:
      '{{count}} saved changes have not reached the owner yet. If you log out now, they will be lost.',
    logoutConfirm: 'Log out',
  },
  setup: {
    title: 'Your business',
    heading: 'Set up your business',
    body: 'Business setup is coming soon. If you work for a business, ask the owner to add your mobile number.',
  },
  sync: {
    saved: 'Saved on phone',
    sending: 'Sending…',
    sent: 'Sent',
    attention: 'Needs attention',
  },
  errors: {
    NETWORK_ERROR: 'No internet. Check your connection and try again.',
    OTP_INVALID: 'Wrong code. Please check and try again.',
    OTP_EXPIRED: 'This code has expired. Ask for a new one.',
    OTP_TOO_MANY_ATTEMPTS: 'Too many wrong codes. Ask for a new one.',
    OTP_SEND_LIMIT: 'Too many codes sent. Please wait 15 minutes and try again.',
    TOO_MANY_REQUESTS: 'Too many tries. Please wait a minute and try again.',
    ACCOUNT_DISABLED: 'This account is not active. Contact the business owner.',
    SMS_NOT_CONFIGURED: 'SMS is not available right now. Please try later.',
    UNAUTHENTICATED: 'Please log in again.',
    VALIDATION_FAILED: 'Please check what you entered.',
    generic: 'Something went wrong. Please try again.',
  },
};

type DeepStrings<T> = { [K in keyof T]: T[K] extends string ? string : DeepStrings<T[K]> };
export type Translations = DeepStrings<typeof en>;
