import type { Translations } from './en';

/**
 * Hindi. Technician/helper labels are the prototype's own; login, owner and
 * setup labels were translated for the app shell and still need review by a
 * native speaker (the prototype shows those screens in English only).
 */
export const hi: Translations = {
  common: {
    appName: 'कामसेतु',
    tagline: 'काम आसान। हिसाब आसान। कारोबार आसान।',
    retry: 'फिर से कोशिश करें',
    cancel: 'रद्द करें',
    loading: 'लोड हो रहा है…',
    comingSoonTitle: 'जल्द आ रहा है',
    comingSoonBody: 'ऐप का यह हिस्सा अभी बन रहा है।',
  },
  language: {
    label: 'भाषा',
  },
  auth: {
    loginTitle: 'लॉग इन',
    phoneHeading: 'अपना मोबाइल नंबर डालें',
    phoneHint: 'हम SMS से 6 अंकों का कोड भेजेंगे।',
    phoneLabel: 'मोबाइल नंबर',
    phonePlaceholder: '10 अंकों का नंबर',
    phoneInvalid: 'नंबर 10 अंकों का होना चाहिए',
    sendCode: 'कोड भेजें',
    otpTitle: 'कोड डालें',
    otpHeading: '{{phone}} पर भेजा गया 6 अंकों का कोड डालें',
    otpLabel: '6 अंकों का कोड',
    otpInvalid: 'कोड 6 अंकों का होता है',
    continue: 'आगे बढ़ें',
    resend: 'कोड फिर से भेजें',
    resendIn: '{{seconds}} सेकंड में फिर भेजें',
    changeNumber: 'नंबर बदलें',
  },
  roles: {
    OWNER: 'मालिक',
    SENIOR_TECHNICIAN: 'सीनियर टेक्नीशियन',
    HELPER: 'हेल्पर',
  },
  owner: {
    home: 'होम',
    jobs: 'काम',
    customers: 'ग्राहक',
    billing: 'बिल',
    more: 'और',
  },
  field: {
    myWork: 'मेरा काम',
    history: 'पुराने काम',
    profile: 'प्रोफ़ाइल',
    noJobs: 'आज कोई काम नहीं',
    noJobsSub: 'मालिक से नया काम यहाँ दिखेगा।',
  },
  helper: {
    todaysWork: 'आज का काम',
    helperNote: 'काम की रिपोर्ट सीनियर भरेंगे। आपको कुछ नहीं भरना है।',
  },
  profile: {
    title: 'प्रोफ़ाइल',
    me: 'मैं',
    logout: 'लॉग आउट',
    logoutTitle: 'लॉग आउट करें?',
    logoutUnsent:
      'सेव किए गए {{count}} बदलाव अभी मालिक तक नहीं पहुँचे हैं। अभी लॉग आउट करने पर वे मिट जाएंगे।',
    logoutConfirm: 'लॉग आउट',
  },
  setup: {
    title: 'आपका कारोबार',
    heading: 'अपना कारोबार सेट करें',
    body: 'कारोबार सेट करने की सुविधा जल्द आ रही है। अगर आप किसी कारोबार में काम करते हैं, तो मालिक से अपना मोबाइल नंबर जुड़वाएं।',
  },
  sync: {
    saved: 'फ़ोन में सेव',
    sending: 'भेज रहे हैं…',
    sent: 'भेज दिया',
    attention: 'ध्यान दें',
  },
  errors: {
    NETWORK_ERROR: 'इंटरनेट नहीं है। कनेक्शन देखकर फिर से कोशिश करें।',
    OTP_INVALID: 'कोड गलत है। देखकर फिर से डालें।',
    OTP_EXPIRED: 'इस कोड का समय खत्म हो गया। नया कोड मंगाएं।',
    OTP_TOO_MANY_ATTEMPTS: 'बहुत बार गलत कोड डाला गया। नया कोड मंगाएं।',
    OTP_SEND_LIMIT: 'बहुत सारे कोड भेजे गए। 15 मिनट बाद फिर से कोशिश करें।',
    TOO_MANY_REQUESTS: 'बहुत बार कोशिश हुई। एक मिनट बाद फिर से करें।',
    ACCOUNT_DISABLED: 'यह खाता चालू नहीं है। कारोबार के मालिक से बात करें।',
    SMS_NOT_CONFIGURED: 'अभी SMS नहीं जा सकता। बाद में कोशिश करें।',
    UNAUTHENTICATED: 'कृपया फिर से लॉग इन करें।',
    VALIDATION_FAILED: 'जो भरा है उसे एक बार देख लें।',
    generic: 'कुछ गड़बड़ हो गई। फिर से कोशिश करें।',
  },
};
