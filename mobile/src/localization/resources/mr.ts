import type { Translations } from './en';

/**
 * Marathi. Technician/helper labels are the prototype's own; login, owner and
 * setup labels were translated for the app shell and still need review by a
 * native speaker (the prototype shows those screens in English only).
 */
export const mr: Translations = {
  common: {
    appName: 'कामसेतु',
    tagline: 'काम सोपे। हिशोब सोपा। व्यवसाय सोपा।',
    retry: 'पुन्हा प्रयत्न करा',
    cancel: 'रद्द करा',
    loading: 'लोड होत आहे…',
    comingSoonTitle: 'लवकरच येत आहे',
    comingSoonBody: 'ॲपचा हा भाग अजून तयार होत आहे.',
  },
  language: {
    label: 'भाषा',
  },
  auth: {
    loginTitle: 'लॉग इन',
    phoneHeading: 'तुमचा मोबाइल नंबर टाका',
    phoneHint: 'आम्ही SMS ने 6 अंकी कोड पाठवू.',
    phoneLabel: 'मोबाइल नंबर',
    phonePlaceholder: '10 अंकी नंबर',
    phoneInvalid: 'नंबर 10 अंकी असावा',
    sendCode: 'कोड पाठवा',
    otpTitle: 'कोड टाका',
    otpHeading: '{{phone}} वर पाठवलेला 6 अंकी कोड टाका',
    otpLabel: '6 अंकी कोड',
    otpInvalid: 'कोड 6 अंकी असतो',
    continue: 'पुढे',
    resend: 'कोड पुन्हा पाठवा',
    resendIn: '{{seconds}} सेकंदांनी पुन्हा पाठवा',
    changeNumber: 'नंबर बदला',
  },
  roles: {
    OWNER: 'मालक',
    SENIOR_TECHNICIAN: 'सीनियर टेक्निशियन',
    HELPER: 'हेल्पर',
  },
  owner: {
    home: 'होम',
    jobs: 'कामे',
    customers: 'ग्राहक',
    billing: 'बिल',
    more: 'अजून',
  },
  field: {
    myWork: 'माझे काम',
    history: 'जुनी कामे',
    profile: 'प्रोफाइल',
    noJobs: 'आज काम नाही',
    noJobsSub: 'मालकाकडून नवीन काम इथे दिसेल.',
  },
  helper: {
    todaysWork: 'आजचे काम',
    helperNote: 'कामाचा रिपोर्ट सीनियर भरतील. तुम्हाला काही भरायचे नाही.',
  },
  profile: {
    title: 'प्रोफाइल',
    me: 'मी',
    logout: 'लॉग आउट',
    logoutTitle: 'लॉग आउट करायचे?',
    logoutUnsent:
      'सेव्ह केलेले {{count}} बदल अजून मालकाकडे पोहोचले नाहीत. आत्ता लॉग आउट केल्यास ते हरवतील.',
    logoutConfirm: 'लॉग आउट',
  },
  setup: {
    title: 'तुमचा व्यवसाय',
    heading: 'तुमचा व्यवसाय सेट करा',
    body: 'व्यवसाय सेट करण्याची सोय लवकरच येत आहे. तुम्ही एखाद्या व्यवसायात काम करत असाल, तर मालकाला तुमचा मोबाइल नंबर जोडायला सांगा.',
  },
  sync: {
    saved: 'फोनमध्ये सेव्ह',
    sending: 'पाठवत आहे…',
    sent: 'पाठवले',
    attention: 'लक्ष द्या',
  },
  errors: {
    NETWORK_ERROR: 'इंटरनेट नाही. कनेक्शन तपासून पुन्हा प्रयत्न करा.',
    OTP_INVALID: 'कोड चुकीचा आहे. तपासून पुन्हा टाका.',
    OTP_EXPIRED: 'या कोडची वेळ संपली. नवीन कोड मागवा.',
    OTP_TOO_MANY_ATTEMPTS: 'खूप वेळा चुकीचा कोड टाकला. नवीन कोड मागवा.',
    OTP_SEND_LIMIT: 'खूप कोड पाठवले गेले. 15 मिनिटांनी पुन्हा प्रयत्न करा.',
    TOO_MANY_REQUESTS: 'खूप वेळा प्रयत्न झाले. एका मिनिटाने पुन्हा करा.',
    ACCOUNT_DISABLED: 'हे खाते चालू नाही. व्यवसायाच्या मालकाशी बोला.',
    SMS_NOT_CONFIGURED: 'आत्ता SMS जाऊ शकत नाही. नंतर प्रयत्न करा.',
    UNAUTHENTICATED: 'कृपया पुन्हा लॉग इन करा.',
    VALIDATION_FAILED: 'जे भरले आहे ते एकदा तपासा.',
    generic: 'काहीतरी चुकले. पुन्हा प्रयत्न करा.',
  },
};
