import React, { useState, useEffect } from 'react';
import {
  User,
  Phone,
  Lock,
  LogOut,
  Share2,
  Bell,
  Palette,
  Sun,
  Moon,
  Globe,
  ShieldAlert,
  ShieldCheck,
  MessageCircle,
  Copy,
  Check,
  KeyRound,
  History,
  UserPlus,
  Edit3,
  ArrowLeft,
  Send,
  QrCode,
  Download,
  Sparkles,
} from 'lucide-react';
import QRCode from 'qrcode';
import {
  buildApiUrl,
  saveDevicePlayerIdentity,
  saveSignedAccountToken,
} from '../utils/realtimeRoomClient';
import {
  AppAccentColor,
  DaubColor,
  Language,
  NotificationPreference,
  UserAccount,
} from '../types/bingo';
import {
  FAST_BINGO_TERMS_BY_LANG,
  TERMS_AND_CONDITIONS_BY_LANG,
  TRANSLATIONS,
} from '../utils/translations';

interface ProfileAndSettingsViewProps {
  currentUser: UserAccount;
  language: Language;
  isDark: boolean;
  isFastBingo?: boolean;
  daubColor: DaubColor;
  accentColor?: AppAccentColor;
  notificationPref: NotificationPreference;
  onChangeLanguage: (lang: Language) => void;
  onToggleTheme: () => void;
  onChangeDaubColor: (color: DaubColor) => void;
  onChangeAccentColor?: (accent: AppAccentColor) => void;
  onChangeNotificationPref: (pref: NotificationPreference) => void;
  onInviteFriendReward: (friendPhone: string) => void;
  onUpdatePassword: (newPass: string) => void;
  onRegisterOrLoginUser?: (name: string, phone: string) => void;
  onSignOut: () => void;
  onOpenGameHistory?: () => void;
  onOpenAdminLogin?: () => void;
}

type ProfileSectionModal =
  | null
  | 'edit_username'
  | 'language'
  | 'theme'
  | 'invite'
  | 'daub_color'
  | 'notifications'
  | 'password'
  | 'terms'
  | 'contact';

const DAUB_COLOR_SWATCHES: { id: DaubColor; label: Record<Language, string>; bg: string }[] = [
  { id: 'blue', label: { am: 'ሰማያዊ', ti: 'ሰማያዊ', om: 'Cuquliisa', en: 'Blue' }, bg: 'bg-blue-600' },
  { id: 'red', label: { am: 'ቀይ', ti: 'ቀይሕ', om: 'Diimaa', en: 'Red' }, bg: 'bg-rose-600' },
  { id: 'green', label: { am: 'አረንጓዴ', ti: 'ቀጠልያ', om: 'Magariisa', en: 'Green' }, bg: 'bg-emerald-600' },
  { id: 'yellow', label: { am: 'ቢጫ', ti: 'ብጫ', om: 'Keelloo', en: 'Yellow' }, bg: 'bg-amber-400' },
  { id: 'purple', label: { am: 'ወይንጠጅ', ti: 'ሊላ', om: 'Dhiilgee', en: 'Purple' }, bg: 'bg-purple-600' },
];

const APP_ACCENT_SWATCHES: { id: AppAccentColor; label: Record<Language, string>; bg: string; ring: string }[] = [
  { id: 'amber', label: { am: 'ወርቃማ', ti: 'ወርቃዊ', om: 'Warqii', en: 'Amber Gold' }, bg: 'bg-gradient-to-r from-amber-500 to-orange-500', ring: 'ring-amber-400' },
  { id: 'emerald', label: { am: 'አረንጓዴ', ti: 'ቀጠልያ', om: 'Magariisa', en: 'Emerald' }, bg: 'bg-gradient-to-r from-emerald-500 to-teal-500', ring: 'ring-emerald-400' },
  { id: 'blue', label: { am: 'ሰማያዊ', ti: 'ሰማያዊ', om: 'Cuquliisa', en: 'Royal Blue' }, bg: 'bg-gradient-to-r from-blue-500 to-indigo-600', ring: 'ring-blue-400' },
  { id: 'rose', label: { am: 'ቀይ', ti: 'ቀይሕ', om: 'Diimaa', en: 'Crimson Rose' }, bg: 'bg-gradient-to-r from-rose-500 to-pink-600', ring: 'ring-rose-400' },
  { id: 'purple', label: { am: 'ወይንጠጅ', ti: 'ሊላ', om: 'Dhiilgee', en: 'Violet' }, bg: 'bg-gradient-to-r from-purple-500 to-fuchsia-600', ring: 'ring-purple-400' },
  { id: 'cyan', label: { am: 'ውሃ ሰማያዊ', ti: 'ሰማያዊ ማይ', om: 'Bishaanii', en: 'Cyan' }, bg: 'bg-gradient-to-r from-cyan-400 to-sky-600', ring: 'ring-cyan-400' },
];

const PROFILE_EXTRA: Record<
  Language,
  {
    closeWord: string;
    backWord: string;
    editProfileBtn: string;
    editSectionTitle: string;
    usernameLabel: string;
    usernamePlaceholder: string;
    phoneLabel: string;
    receiveOtpBtn: string;
    otpPlaceholder: string;
    optionalPassPlaceholder: string;
    saveProfileBtn: string;
    languageTitle: string;
    themeLabel: string;
    darkModeBtn: string;
    lightModeBtn: string;
    appAccentLabel: string;
    inviteTitle: string;
    inviteBadge: string;
    invitedCountLabel: string;
    inviteEarningsLabel: string;
    perInviteLabel: string;
    yourReferralQr: string;
    qrGenerating: string;
    qrFailed: string;
    copiedWord: string;
    copyLinkBtn: string;
    copyWord: string;
    yourReferralCodeLabel: string;
    shareTelegram: string;
    shareAnyApp: string;
    friendPhonePlaceholder: string;
    inviteSubmitBtn: string;
    daubColorTitle: string;
    notificationsTitle: string;
    notifRegisteredOnly: string;
    notifAlways: string;
    notifNone: string;
    passwordSectionTitle: string;
    sendOtpBtn: string;
    newPassPlaceholder: string;
    changePassBtn: string;
    phoneContactLabel: string;
    menuLanguage: string;
    menuTheme: string;
    menuHistory: string;
    menuInvite: string;
    menuDaubColor: string;
    menuNotifications: string;
    menuPassword: string;
    errOtpSend: string;
    errNetwork: string;
    errEnterOtpForPass: string;
    errInvalidOtp: string;
    errMinPass: string;
    errClickSendOtpFirst: string;
    okOtpSent: string;
    okForgotOtpSent: string;
    okProfileUpdated: (name: string) => string;
    okPasswordChanged: string;
    okInviteReward: string;
    shareText: string;
    appBrandTitle: string;
  }
> = {
  am: {
    closeWord: 'ዝጋ',
    backWord: 'ተመለስ',
    editProfileBtn: 'ስም ቀይር',
    editSectionTitle: 'የተጫዋች ስም እና ስልክ መቀየሪያ፦',
    usernameLabel: 'የተጫዋች ስም፦',
    usernamePlaceholder: 'ስም እዚህ ይፃፉ...',
    phoneLabel: 'ስልክ ቁጥር፦',
    receiveOtpBtn: '📲 በቴሌግራም OTP ተቀበል (@Sungamsbot)',
    otpPlaceholder: 'ከ Telegram የተላከ 6-አሃዝ OTP ኮድ',
    optionalPassPlaceholder: 'አዲስ የይለፍ ቃል (ካስፈለገ)',
    saveProfileBtn: 'ስም እና መረጃ መዝግብ',
    languageTitle: 'የቋንቋ አማራጭ',
    themeLabel: 'ገጽታ (ብርሃን / ጨለማ)፦',
    darkModeBtn: 'ጨለማ ገጽታ',
    lightModeBtn: 'ብርሃን ገጽታ',
    appAccentLabel: 'የአፕ ቀለም፦',
    inviteTitle: 'ጓደኛ ይጋብዙ · 25 ብር ያግኙ',
    inviteBadge: '+25 ብር ቦነስ',
    invitedCountLabel: 'የተጋበዙ ጓደኞች',
    inviteEarningsLabel: 'የተገኘ የግብዣ ገቢ',
    perInviteLabel: 'በእያንዳንዱ ግብዣ',
    yourReferralQr: 'የእርስዎ መጋበዣ QR ኮድ',
    qrGenerating: 'QR በማመንጨት ላይ...',
    qrFailed: 'QR ማመንጨት አልተቻለም',
    copiedWord: 'ተገልብጧል!',
    copyLinkBtn: 'ሊንክ ኮፒ',
    copyWord: 'ኮፒ',
    yourReferralCodeLabel: 'የእርስዎ መጋበዣ ኮድ፦',
    shareTelegram: 'በቴሌግራም አጋራ',
    shareAnyApp: 'በማንኛውም አፕ አጋራ',
    friendPhonePlaceholder: 'የጓደኛዎን ስልክ ያስገቡ (0912345678)',
    inviteSubmitBtn: 'ጋብዝ (+25 ብር)',
    daubColorTitle: 'የምልክት ቀለም',
    notificationsTitle: 'ማሳወቂያዎች',
    notifRegisteredOnly: 'ካርቴላ ለጨዋታው ሳስመዘግብ ብቻ አሳውቀኝ',
    notifAlways: 'ምንም ካርቴላ ባላስመዘግብም ሁልጊዜ አሳውቀኝ',
    notifNone: 'ምንም የጨዋታ መጀመሪያ ማሳወቂያ አይምጣልኝ',
    passwordSectionTitle: 'የይለፍ ቃል መቀየሪያ',
    sendOtpBtn: '📲 የማረጋገጫ OTP ኮድ ላክ',
    newPassPlaceholder: 'አዲስ የይለፍ ቃል ያስገቡ...',
    changePassBtn: 'የይለፍ ቃል ቀይር',
    phoneContactLabel: 'ስልክ',
    menuLanguage: 'ቋንቋ',
    menuTheme: 'ገጽታ',
    menuHistory: 'የጨዋታ ታሪክ',
    menuInvite: 'ጓደኛ ጋብዝ',
    menuDaubColor: 'የምልክት ቀለም',
    menuNotifications: 'ማሳወቂያዎች',
    menuPassword: 'የይለፍ ቃል',
    errOtpSend: '❌ OTP መላክ አልተቻለም። እባክዎ ትክክለኛ ስልክ ያስገቡ።',
    errNetwork: '❌ ከሰርቨር ጋር መገናኘት አልተቻለም። እባክዎ እንደገና ይሞክሩ።',
    errEnterOtpForPass: '❌ የይለፍ ቃል ለመቀየር በ Telegram የተላከውን ባለ 6-አሃዝ OTP ኮድ ያስገቡ።',
    errInvalidOtp: '❌ የተሳሳተ የ OTP ኮድ! እባክዎ ትክክለኛውን ኮድ ያስገቡ።',
    errMinPass: 'የይለፍ ቃል ቢያንስ 4 ፊደላት ወይም ቁጥሮች መሆን አለበት።',
    errClickSendOtpFirst: '❌ መጀመሪያ የማረጋገጫ OTP ኮድ ላክ የሚለውን ይጫኑ።',
    okOtpSent: '📲 የማረጋገጫ ኮድ በ Telegram (@Sungamsbot) ተልኳል።',
    okForgotOtpSent: '📲 የይለፍ ቃል መቀየሪያ OTP በ Telegram (@Sungamsbot) ተልኳል።',
    okProfileUpdated: (name) => `✓ ስምዎ (${name}) በሁሉም ጨዋታዎች ላይ ተስተካክሏል!`,
    okPasswordChanged: '✓ የይለፍ ቃልዎ በተሳካ ሁኔታ ተቀይሯል!',
    okInviteReward: 'ጓደኛዎ ተጋብዟል! 25.00 ብር የግብዣ ሽልማት ወደ ዋሌትዎ ተጨምሯል!',
    shareText: '🎉 ሳን ቢንጎ ላይ አብረን እንጫወት! በእኔ መጋበዣ ሊንክ ሲመዘገቡ 15.00 ብር የቦነስ ስጦታ ያገኛሉ፦',
    appBrandTitle: 'ሳን ቢንጎ',
  },
  ti: {
    closeWord: 'ዕጸው',
    backWord: 'ተመለስ',
    editProfileBtn: 'ስም ቀይር',
    editSectionTitle: 'ስም ተጻዋታይን ስልክን መቀየሪ፦',
    usernameLabel: 'ስም ተጻዋታይ፦',
    usernamePlaceholder: 'ስም ኣብዚ ጽሓፉ...',
    phoneLabel: 'ቁጽሪ ስልኪ፦',
    receiveOtpBtn: '📲 ብቴሌግራም OTP ተቀበል (@Sungamsbot)',
    otpPlaceholder: 'ካብ Telegram ዝተላእከ 6-ኣሃዝ OTP',
    optionalPassPlaceholder: 'ሓድሽ መሕለፊ ቃል (ኣድላዪ እንተኾይኑ)',
    saveProfileBtn: 'ስምን ሓበሬታን መዝግብ',
    languageTitle: 'ምርጫ ቋንቋ',
    themeLabel: 'ቅርጺ (ብርሃን / ጸልማት)፦',
    darkModeBtn: 'ጸልማት',
    lightModeBtn: 'ብርሃን',
    appAccentLabel: 'ሕብሪ ኣፕ፦',
    inviteTitle: 'ዓርኪ ዓድም · 25 ብር ረኸብ',
    inviteBadge: '+25 ብር ቦነስ',
    invitedCountLabel: 'ዝተዓደሙ ኣዕሩኽ',
    inviteEarningsLabel: 'ኣታዊ ዕድመ',
    perInviteLabel: 'ብነፍሲ ወከፍ ዕድመ',
    yourReferralQr: 'ናይ ዕድመ QR ኮድኩም',
    qrGenerating: 'QR ይስራሕ ኣሎ...',
    qrFailed: 'QR ምስራሕ ኣይተኻእለን',
    copiedWord: 'ተቀዲሑ!',
    copyLinkBtn: 'ሊንክ ቅዳሕ',
    copyWord: 'ቅዳሕ',
    yourReferralCodeLabel: 'ናይ ዕድመ ኮድኩም፦',
    shareTelegram: 'ብቴሌግራም ኣካፍል',
    shareAnyApp: 'ብኻልእ ኣፕ ኣካፍል',
    friendPhonePlaceholder: 'ቁጽሪ ስልኪ ዓርክኹም ኣእትዉ (0912345678)',
    inviteSubmitBtn: 'ዓድም (+25 ብር)',
    daubColorTitle: 'ሕብሪ ምልክት',
    notificationsTitle: 'መፍለጢታት',
    notifRegisteredOnly: 'ካርቴላ ንጸወታ እንተመዝገብኩ ጥራይ ኣፍልጠኒ',
    notifAlways: 'ምንም ካርቴላ እንተዘይመዝገብኩ’ውን ኩሉ ግዜ ኣፍልጠኒ',
    notifNone: 'ምንም መፍለጢ ምጅማር ጸወታ ኣይትስደደለይ',
    passwordSectionTitle: 'መቀየሪ መሕለፊ ቃል',
    sendOtpBtn: '📲 መረጋገጺ OTP ኮድ ስደድ',
    newPassPlaceholder: 'ሓድሽ መሕለፊ ቃል ኣእትዉ...',
    changePassBtn: 'መሕለፊ ቃል ቀይር',
    phoneContactLabel: 'ስልኪ',
    menuLanguage: 'ቋንቋ',
    menuTheme: 'ቅርጺ',
    menuHistory: 'ታሪኽ ጸወታ',
    menuInvite: 'ዓርኪ ዓድም',
    menuDaubColor: 'ሕብሪ ምልክት',
    menuNotifications: 'መፍለጢታት',
    menuPassword: 'መሕለፊ ቃል',
    errOtpSend: '❌ OTP ምስዳድ ኣይተኻእለን። ትኽክለኛ ስልኪ ኣእትዉ።',
    errNetwork: '❌ ምስ ሰርቨር ምርኻብ ኣይተኻእለን። ደጊምኩም ፈትኑ።',
    errEnterOtpForPass: '❌ መሕለፊ ቃል ንምቅያር ብ Telegram ዝተላእከ 6-ኣሃዝ OTP ኣእትዉ።',
    errInvalidOtp: '❌ ዝተጋገየ OTP ኮድ! ትኽክለኛ ኮድ ኣእትዉ።',
    errMinPass: 'መሕለፊ ቃል ብውሑዱ 4 ፊደላት ወይ ቁጽርታት ክኸውን ኣለዎ።',
    errClickSendOtpFirst: '❌ መጀመርታ መረጋገጺ OTP ኮድ ስደድ ዝብል ጠውቑ።',
    okOtpSent: '📲 መረጋገጺ ኮድ ብ Telegram (@Sungamsbot) ተላኢኹ ኣሎ።',
    okForgotOtpSent: '📲 መቀየሪ OTP ብ Telegram (@Sungamsbot) ተላኢኹ ኣሎ።',
    okProfileUpdated: (name) => `✓ ስምኩም (${name}) ኣብ ኩሎም ጸወታታት ተመዝጊቡ!`,
    okPasswordChanged: '✓ መሕለፊ ቃልኩም ብዓወት ተቀይሩ!',
    okInviteReward: 'ዓርክኹም ተዓዲሙ! 25.00 ብር ሽልማት ናብ ዋሌትኩም ተወሲኹ!',
    shareText: '🎉 ኣብ ሳን ቢንጎ ብሓባር ንጻወት! ብናተይ መጋበዚ ሊንክ እንተተመዝጊብኩም 15.00 ብር ቦነስ ክትረኽቡ ኢኹም፦',
    appBrandTitle: 'ሳን ቢንጎ',
  },
  om: {
    closeWord: 'Cufi',
    backWord: 'Deebi’i',
    editProfileBtn: 'Maqaa Jijjiiri',
    editSectionTitle: 'Jijjiirraa Maqaa fi Bilbilaa:',
    usernameLabel: 'Maqaa Taphataa:',
    usernamePlaceholder: 'Maqaa asitti barreessi...',
    phoneLabel: 'Lakkoofsa Bilbilaa:',
    receiveOtpBtn: '📲 Telegram Irratti OTP Argadhu (@Sungamsbot)',
    otpPlaceholder: 'Koodii OTP diijitii-6 Telegram irraa',
    optionalPassPlaceholder: 'Jecha Darbii Haaraa (yoo barbaachise)',
    saveProfileBtn: 'Maqaa fi Odeeffannoo Olkaa’i',
    languageTitle: 'Filannoo Afaanii',
    themeLabel: 'Bifa (Ifaa / Dukkana):',
    darkModeBtn: 'Dukkana',
    lightModeBtn: 'Ifaa',
    appAccentLabel: 'Halluu Appii:',
    inviteTitle: 'Hiriyaa Afeeri · Birr 25 Argadhu',
    inviteBadge: '+25 Birr Boonasii',
    invitedCountLabel: 'Hiriyoota Afeeraman',
    inviteEarningsLabel: 'Galii Afeerraa',
    perInviteLabel: 'Afeerraa Tokkoon',
    yourReferralQr: 'Koodii QR Afeerraa Keessan',
    qrGenerating: 'QR uumamaa jira...',
    qrFailed: 'QR uumuun hin danda’amne',
    copiedWord: 'Garagalfame!',
    copyLinkBtn: 'Liinkii Garagalchi',
    copyWord: 'Garagalchi',
    yourReferralCodeLabel: 'Koodii Afeerraa Keessan:',
    shareTelegram: 'Telegram Irratti Qoodi',
    shareAnyApp: 'Appii Biraan Qoodi',
    friendPhonePlaceholder: 'Bilbila hiriyaa galchi (0912345678)',
    inviteSubmitBtn: 'Afeeri (+25 Birr)',
    daubColorTitle: 'Halluu Mallattoo',
    notificationsTitle: 'Beeksisa',
    notifRegisteredOnly: 'Yoon kaarteelaa tapha kanaaf galmeesse qofa na beeksisi',
    notifAlways: 'Kaarteelaa galmeessuu baadhus yeroo hunda na beeksisi',
    notifNone: 'Beeksisa eegaluu taphaa hin ergin',
    passwordSectionTitle: 'Jijjiirraa Jecha Darbii',
    sendOtpBtn: '📲 Koodii OTP Ergi',
    newPassPlaceholder: 'Jecha darbii haaraa galchi...',
    changePassBtn: 'Jecha Darbii Jijjiiri',
    phoneContactLabel: 'Bilbila',
    menuLanguage: 'Afaan',
    menuTheme: 'Bifa',
    menuHistory: 'Seenaa Taphaa',
    menuInvite: 'Hiriyaa Afeeri',
    menuDaubColor: 'Halluu Mallattoo',
    menuNotifications: 'Beeksisa',
    menuPassword: 'Jecha Darbii',
    errOtpSend: '❌ OTP erguun hin danda’amne. Lakkoofsa bilbilaa sirrii galchi.',
    errNetwork: '❌ Sarvarii waliin walqunnamuun hin danda’amne.',
    errEnterOtpForPass: '❌ Jecha darbii jijjiiruuf OTP diijitii-6 Telegram irraa galchi.',
    errInvalidOtp: '❌ Koodiin OTP sirrii miti! Maaloo koodii sirrii galchi.',
    errMinPass: 'Jechi darbii yoo xiqqaate qubee ykn lakkoofsa 4 ta’uu qaba.',
    errClickSendOtpFirst: '❌ Dura "Koodii OTP Ergi" jedhu cuqaasi.',
    okOtpSent: '📲 Koodiin mirkaneessaa Telegram (@Sungamsbot) irratti ergameera.',
    okForgotOtpSent: '📲 OTP jijjiirraa Telegram (@Sungamsbot) irratti ergameera.',
    okProfileUpdated: (name) => `✓ Maqaan keessan (${name}) taphoota hunda irratti haaromfameera!`,
    okPasswordChanged: '✓ Jechi darbii keessan milkaa’inaan jijjiirameera!',
    okInviteReward: 'Hiriyaan keessan afeerameera! Badhaasni 25.00 Birr gara waaleetii dabalamera!',
    shareText: '🎉 Kottaa Sun Bingo waliin taphannaa! Liinkii kootiin yoo galmooftan boonasii Birr 15.00 argattu:',
    appBrandTitle: 'Sun Bingo',
  },
  en: {
    closeWord: 'Close',
    backWord: 'Back',
    editProfileBtn: 'Edit Name',
    editSectionTitle: 'Edit Username & Phone:',
    usernameLabel: 'Player Name:',
    usernamePlaceholder: 'Enter player name...',
    phoneLabel: 'Phone Number:',
    receiveOtpBtn: '📲 Get OTP via Telegram (@Sungamsbot)',
    otpPlaceholder: '6-digit OTP from Telegram',
    optionalPassPlaceholder: 'New password (optional)',
    saveProfileBtn: 'Save Profile',
    languageTitle: 'Language Options',
    themeLabel: 'Theme (Light / Dark):',
    darkModeBtn: 'Dark Mode',
    lightModeBtn: 'Light Mode',
    appAccentLabel: 'App Accent Color:',
    inviteTitle: 'Invite & Earn 25 ETB',
    inviteBadge: '+25 ETB Bonus',
    invitedCountLabel: 'Invited Friends',
    inviteEarningsLabel: 'Referral Earnings',
    perInviteLabel: 'Per Referral',
    yourReferralQr: 'Your Referral QR Code',
    qrGenerating: 'Generating QR...',
    qrFailed: 'Failed to generate QR',
    copiedWord: 'Copied!',
    copyLinkBtn: 'Copy Link',
    copyWord: 'Copy',
    yourReferralCodeLabel: 'Your Referral Code:',
    shareTelegram: 'Share on Telegram',
    shareAnyApp: 'Share via Apps',
    friendPhonePlaceholder: "Enter friend's phone (0912345678)",
    inviteSubmitBtn: 'Invite (+25 ETB)',
    daubColorTitle: 'Daub Color',
    notificationsTitle: 'Notifications',
    notifRegisteredOnly: "Only when I've registered cards for the game",
    notifAlways: "Even when I haven't registered any cards",
    notifNone: 'No game starting notifications',
    passwordSectionTitle: 'Change Password',
    sendOtpBtn: '📲 Send Verification OTP',
    newPassPlaceholder: 'Enter new password...',
    changePassBtn: 'Change Password',
    phoneContactLabel: 'Phone',
    menuLanguage: 'Language',
    menuTheme: 'Theme',
    menuHistory: 'Game History',
    menuInvite: 'Invite Friends',
    menuDaubColor: 'Daub Color',
    menuNotifications: 'Notifications',
    menuPassword: 'Password',
    errOtpSend: '❌ Could not send OTP. Please enter a valid phone number.',
    errNetwork: '❌ Could not connect to server. Please try again.',
    errEnterOtpForPass: '❌ Enter the 6-digit Telegram OTP code to update your password.',
    errInvalidOtp: '❌ Invalid OTP code! Please enter the exact code sent via Telegram.',
    errMinPass: 'Password must be at least 4 characters.',
    errClickSendOtpFirst: '❌ Please tap "Send Verification OTP" first.',
    okOtpSent: '📲 Verification OTP sent via Telegram (@Sungamsbot).',
    okForgotOtpSent: '📲 Password reset OTP sent via Telegram (@Sungamsbot).',
    okProfileUpdated: (name) => `✓ Your name (${name}) is now updated across all games!`,
    okPasswordChanged: '✓ Your password has been changed successfully!',
    okInviteReward: 'Friend invited! 25.00 ETB reward added to your wallet!',
    shareText: '🎉 Join me on Sun Bingo! Register with my invite link to get a 15.00 ETB welcome bonus:',
    appBrandTitle: 'Sun Bingo',
  },
};

export const ProfileAndSettingsView: React.FC<ProfileAndSettingsViewProps> = ({
  currentUser,
  language,
  isDark,
  isFastBingo = false,
  daubColor,
  accentColor = 'amber',
  notificationPref,
  onChangeLanguage,
  onToggleTheme,
  onChangeDaubColor,
  onChangeAccentColor,
  onChangeNotificationPref,
  onInviteFriendReward,
  onUpdatePassword,
  onRegisterOrLoginUser,
  onSignOut,
  onOpenGameHistory,
  onOpenAdminLogin,
}) => {
  const t = TRANSLATIONS[language];
  const pt = PROFILE_EXTRA[language] || PROFILE_EXTRA.am;
  const [activeSection, setActiveSection] = useState<ProfileSectionModal>(null);

  // Phone / Telegram-OTP Registration & Username state
  const [regName, setRegName] = useState(currentUser.name);
  const [regPhone, setRegPhone] = useState(currentUser.phone);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [regTelegramOtpUrl, setRegTelegramOtpUrl] = useState<string | null>(null);
  const [regNewPassword, setRegNewPassword] = useState('');

  // Password Change / Forgot Password with Telegram OTP
  const [newPassword, setNewPassword] = useState('');
  const [forgotOtpSent, setForgotOtpSent] = useState(false);
  const [forgotOtpCode, setForgotOtpCode] = useState('');
  const [forgotTelegramOtpUrl, setForgotTelegramOtpUrl] = useState<string | null>(null);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  // Friend Invite
  const [friendPhone, setFriendPhone] = useState('');
  const [copiedReferral, setCopiedReferral] = useState(false);

  const handleSendOtp = async () => {
    try {
      const res = await fetch(buildApiUrl('/api/auth/send-otp'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: regPhone, name: regName, purpose: 'register' }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        setStatusBanner(data?.error || pt.errOtpSend);
        return;
      }
      setOtpCode('');
      setRegTelegramOtpUrl(
        data?.telegramOtpUrl ||
          `https://t.me/${data?.botUsername || 'Sungamsbot'}?start=otp_${encodeURIComponent(regPhone)}`
      );
      setOtpSent(true);
      setStatusBanner(data?.message || pt.okOtpSent);
    } catch {
      setStatusBanner(pt.errNetwork);
    }
  };

  const handleVerifyOtpAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = regPhone.trim() || currentUser.phone;
    const cleanName = regName.trim() || `Player_${cleanPhone.slice(-4)}`;
    if (regNewPassword.trim().length >= 4) {
      if (!otpCode.trim() || otpCode.trim().length < 4) {
        setStatusBanner(pt.errEnterOtpForPass);
        return;
      }
      try {
        const res = await fetch(buildApiUrl('/api/auth/register'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: cleanPhone,
            name: cleanName,
            otpCode: otpCode.trim(),
            password: regNewPassword.trim(),
          }),
        });
        const data = await res.json();
        if (!res.ok || !data?.ok) {
          setStatusBanner(data?.error || pt.errInvalidOtp);
          return;
        }
        if (data.accountToken) {
          saveSignedAccountToken(cleanPhone, data.accountToken);
        }
        onUpdatePassword(regNewPassword.trim());
      } catch {
        setStatusBanner(pt.errNetwork);
        return;
      }
    } else {
      try {
        const res = await fetch(buildApiUrl('/api/player/update-profile'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: cleanPhone, name: cleanName }),
        });
        const data = await res.json();
        if (data?.ok && data.accountToken) {
          saveSignedAccountToken(cleanPhone, data.accountToken);
        }
      } catch {
        // fallback to local identity update below
      }
    }
    saveDevicePlayerIdentity(cleanName, cleanPhone);
    if (onRegisterOrLoginUser) {
      onRegisterOrLoginUser(cleanName, cleanPhone);
    }
    setOtpSent(false);
    setOtpCode('');
    setRegNewPassword('');
    setActiveSection(null);
    setStatusBanner(pt.okProfileUpdated(cleanName));
  };

  const handleSendForgotPasswordOtp = async () => {
    try {
      const res = await fetch(buildApiUrl('/api/auth/send-otp'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: currentUser.phone, purpose: 'forgot' }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        setStatusBanner(data?.error || pt.errOtpSend);
        return;
      }
      setForgotOtpCode('');
      setForgotTelegramOtpUrl(
        data?.telegramOtpUrl ||
          `https://t.me/${data?.botUsername || 'Sungamsbot'}?start=otp_${encodeURIComponent(currentUser.phone)}`
      );
      setForgotOtpSent(true);
      setStatusBanner(data?.message || pt.okForgotOtpSent);
    } catch {
      setStatusBanner(pt.errNetwork);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newPassword.trim();
    if (trimmed.toLowerCase() === 'admin' || trimmed.toLowerCase() === 'admin123') {
      setNewPassword('');
      setActiveSection(null);
      onOpenAdminLogin?.();
      return;
    }
    if (trimmed.length < 4) {
      setStatusBanner(pt.errMinPass);
      return;
    }
    if (!forgotOtpCode.trim() || forgotOtpCode.trim().length < 4) {
      setStatusBanner(pt.errClickSendOtpFirst);
      return;
    }
    try {
      const res = await fetch(buildApiUrl('/api/auth/reset-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: currentUser.phone,
          otpCode: forgotOtpCode.trim(),
          newPassword: trimmed,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        setStatusBanner(data?.error || pt.errInvalidOtp);
        return;
      }
      if (data.accountToken) {
        saveSignedAccountToken(currentUser.phone, data.accountToken);
      }
    } catch {
      setStatusBanner(pt.errNetwork);
      return;
    }
    onUpdatePassword(trimmed);
    setNewPassword('');
    setForgotOtpSent(false);
    setForgotOtpCode('');
    setActiveSection(null);
    setStatusBanner(pt.okPasswordChanged);
  };

  const handleInviteFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = friendPhone.trim();
    if (!clean) return;
    onInviteFriendReward(clean);
    setFriendPhone('');
    setStatusBanner(pt.okInviteReward);
    try {
      await fetch(buildApiUrl('/api/player/invite'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referrerPhone: currentUser.phone,
          friendPhone: clean,
        }),
      });
    } catch {
      // already rewarded in local state
    }
  };

  const getReferralLink = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://sun-bingo-faap.onrender.com';
    return `${origin}/?ref=${encodeURIComponent(currentUser.referralCode || currentUser.phone || 'SUN')}`;
  };

  const copyReferralLink = () => {
    const link = getReferralLink();
    navigator.clipboard.writeText(link).catch(() => {});
    setCopiedReferral(true);
    setTimeout(() => setCopiedReferral(false), 2000);
  };

  const handleTelegramShare = () => {
    const link = getReferralLink();
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(pt.shareText)}`;
    window.open(shareUrl, '_blank');
  };

  const handleWebShare = async () => {
    const link = getReferralLink();
    const title = pt.appBrandTitle;
    const text = `${pt.shareText}\n${link}`;
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url: link });
        return;
      } catch {
        // fallback to clipboard
      }
    }
    copyReferralLink();
  };

  const [referralQrDataUrl, setReferralQrDataUrl] = useState<string>('');
  const [isGeneratingQr, setIsGeneratingQr] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    const link = getReferralLink();
    setIsGeneratingQr(true);
    QRCode.toDataURL(link, {
      width: 320,
      margin: 1.5,
      color: {
        dark: '#020617',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then((url) => {
        if (isMounted) {
          setReferralQrDataUrl(url);
          setIsGeneratingQr(false);
        }
      })
      .catch(() => {
        if (isMounted) setIsGeneratingQr(false);
      });
    return () => {
      isMounted = false;
    };
  }, [currentUser.referralCode, currentUser.phone]);

  const handleDownloadQr = () => {
    if (!referralQrDataUrl) return;
    const a = document.createElement('a');
    a.href = referralQrDataUrl;
    a.download = `sunbingo-invite-${currentUser.referralCode || 'code'}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const tileBaseClass = `rounded-2xl border p-4 flex flex-col items-center justify-center gap-2 text-center transition-all cursor-pointer active:scale-97 shadow-xs ${
    isDark
      ? 'bg-slate-900 border-slate-800 hover:bg-slate-800/90 text-slate-100'
      : 'bg-white border-slate-200/80 hover:bg-slate-50 text-slate-800'
  }`;

  return (
    <div className="max-w-xl mx-auto space-y-3 pb-6">
      {statusBanner && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-500 text-xs sm:text-sm font-bold flex items-center justify-between">
          <span>{statusBanner}</span>
          <button
            type="button"
            onClick={() => setStatusBanner(null)}
            className="text-xs underline ml-2 cursor-pointer"
          >
            {pt.closeWord}
          </button>
        </div>
      )}

      {/* TOP PROFILE CARD */}
      <div
        className={`rounded-3xl border p-6 flex flex-col items-center text-center shadow-xs relative ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/80'
        }`}
      >
        {/* Edit Username button in top-right corner */}
        <button
          type="button"
          onClick={() => {
            setRegName(currentUser.name);
            setRegPhone(currentUser.phone);
            setActiveSection(activeSection === 'edit_username' ? null : 'edit_username');
          }}
          className={`absolute top-4 right-4 px-2.5 py-1.5 rounded-xl border text-[11px] font-extrabold flex items-center gap-1 cursor-pointer transition-colors ${
            isDark
              ? 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700'
              : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
          }`}
          title={pt.editProfileBtn}
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>{pt.editProfileBtn}</span>
        </button>

        {/* Circular Avatar + Green Online Indicator Dot */}
        <div className="relative mb-3">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-100 via-teal-50 to-amber-100 border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-md overflow-hidden select-none">
            <div className="w-20 h-20 rounded-full bg-gradient-to-b from-slate-700 to-slate-900 text-white flex items-center justify-center font-black text-2xl tracking-tight">
              {currentUser.name.slice(0, 2).toUpperCase()}
            </div>
          </div>
          <span
            className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-emerald-500 border-3 border-white dark:border-slate-900 shadow-sm"
            title="Online"
          />
        </div>

        {/* Centered Username */}
        <h2
          className={`text-lg sm:text-xl font-black tracking-tight ${
            isDark ? 'text-white' : 'text-slate-900'
          }`}
        >
          {currentUser.name}
        </h2>

        {/* Centered Phone Number */}
        <p
          className={`text-xs sm:text-sm font-mono-tabular font-semibold mt-0.5 ${
            isDark ? 'text-slate-400' : 'text-slate-500'
          }`}
        >
          {currentUser.phone.startsWith('+') ? currentUser.phone : `+251${currentUser.phone.replace(/^0/, '')}`}
        </p>

        {/* Referral Code & Quick QR Code Badge */}
        <div
          className={`mt-3 px-4 py-2.5 rounded-2xl border flex items-center justify-between gap-2.5 w-full max-w-sm ${
            isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <QrCode className="w-4 h-4" />
            </div>
            <div className="text-left min-w-0">
              <div className="text-[10px] font-bold text-slate-400">
                {language === 'am'
                  ? 'የእርስዎ መጋበዣ ኮድ'
                  : language === 'ti'
                  ? 'ናይ ዕድመ ኮድኩም'
                  : language === 'om'
                  ? 'Koodii Afeerraa Keessan'
                  : 'Referral Code'}
              </div>
              <div className="font-mono-tabular font-black text-xs sm:text-sm text-emerald-400 truncate">
                {currentUser.referralCode || currentUser.phone?.slice(-6) || 'SUN'}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActiveSection('invite')}
            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[11px] flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all shrink-0"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>
              {language === 'am'
                ? 'QR ኮድ አሳይ'
                : language === 'ti'
                ? 'QR ኮድ ኣርኢ'
                : language === 'om'
                ? 'QR Agarsiisi'
                : 'Show QR'}
            </span>
          </button>
        </div>

        {/* Inline Edit Username / Account Form when toggled */}
        {activeSection === 'edit_username' && (
          <form
            onSubmit={handleVerifyOtpAndSave}
            className={`w-full mt-4 pt-4 border-t text-left space-y-3 ${
              isDark ? 'border-slate-800' : 'border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-amber-500 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                <span>{pt.editSectionTitle}</span>
              </span>
              <button
                type="button"
                onClick={() => setActiveSection(null)}
                className="text-xs font-bold text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                {pt.closeWord}
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold mb-1">{pt.usernameLabel}</label>
                <input
                  type="text"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder={pt.usernamePlaceholder}
                  className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-bold border ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold mb-1">{pt.phoneLabel}</label>
                <div className="flex gap-1.5">
                  <input
                    type="tel"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="09********"
                    className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-mono-tabular font-bold border ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    className="px-2.5 py-2 rounded-xl bg-blue-600 text-white text-[11px] font-extrabold whitespace-nowrap cursor-pointer"
                  >
                    OTP
                  </button>
                </div>
              </div>
            </div>
            {otpSent && (
              <div className="space-y-2">
                <a
                  href={
                    regTelegramOtpUrl ||
                    `https://t.me/Sungamsbot?start=otp_${encodeURIComponent(regPhone)}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2 px-3 rounded-xl bg-sky-500/20 border border-sky-400/40 text-sky-400 font-extrabold text-xs flex items-center justify-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{pt.receiveOtpBtn}</span>
                </a>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder={pt.otpPlaceholder}
                    className={`px-3 py-2 rounded-xl text-xs font-mono-tabular border ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300'
                    }`}
                  />
                  <input
                    type="password"
                    value={regNewPassword}
                    onChange={(e) => setRegNewPassword(e.target.value)}
                    placeholder={pt.optionalPassPlaceholder}
                    className={`px-3 py-2 rounded-xl text-xs border ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300'
                    }`}
                  />
                </div>
              </div>
            )}
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-extrabold cursor-pointer shadow-sm"
            >
              {pt.saveProfileBtn}
            </button>
          </form>
        )}
      </div>

      {/* ACTIVE SUB-SECTION EXPANDED PANEL */}
      {activeSection && activeSection !== 'edit_username' && (
        <div
          className={`rounded-2xl border p-4 sm:p-5 space-y-4 shadow-md ${
            isDark ? 'bg-slate-900 border-blue-500/40 text-slate-100' : 'bg-white border-blue-300 text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between border-b pb-2.5 border-slate-700/20">
            <button
              type="button"
              onClick={() => setActiveSection(null)}
              className="text-xs font-extrabold text-blue-500 flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{pt.backWord}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSection(null)}
              className="text-xs font-bold text-slate-400 hover:text-rose-500 cursor-pointer"
            >
              {pt.closeWord} ✕
            </button>
          </div>

          {/* Language Modal Content */}
          {activeSection === 'language' && (
            <div className="space-y-3">
              <h4 className="text-sm font-extrabold flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-500" />
                <span>{pt.languageTitle}</span>
              </h4>
              <div className="grid grid-cols-2 gap-2.5">
                {(
                  [
                    { id: 'am', label: 'አማርኛ' },
                    { id: 'ti', label: 'ትግርኛ' },
                    { id: 'om', label: 'Afaan Oromoo' },
                    { id: 'en', label: 'English' },
                  ] as const
                ).map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => {
                      onChangeLanguage(l.id);
                      setActiveSection(null);
                    }}
                    className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-extrabold border transition-colors cursor-pointer ${
                      language === l.id
                        ? 'bg-blue-600 text-white border-blue-500 shadow-xs'
                        : isDark
                        ? 'bg-slate-800 text-slate-300 border-slate-700'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Theme Modal Content */}
          {activeSection === 'theme' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-extrabold flex items-center gap-1.5">
                  {isDark ? <Moon className="w-4 h-4 text-amber-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
                  <span>{pt.themeLabel}</span>
                </span>
                <button
                  type="button"
                  onClick={onToggleTheme}
                  className={`px-4 py-2 rounded-xl text-xs font-extrabold border cursor-pointer ${
                    isDark
                      ? 'bg-slate-800 text-amber-400 border-slate-700'
                      : 'bg-slate-100 text-slate-900 border-slate-300'
                  }`}
                >
                  {isDark ? pt.darkModeBtn : pt.lightModeBtn}
                </button>
              </div>

              {onChangeAccentColor && (
                <div className="pt-3 border-t border-slate-700/20">
                  <label className="text-xs font-extrabold flex items-center gap-1.5 mb-2.5">
                    <Palette className="w-4 h-4 text-amber-400" />
                    <span>{pt.appAccentLabel}</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {APP_ACCENT_SWATCHES.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onChangeAccentColor(item.id)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-extrabold border transition-all cursor-pointer ${
                          accentColor === item.id
                            ? `ring-2 ${item.ring} scale-[1.02] border-transparent ${
                                isDark ? 'bg-slate-800 text-white' : 'bg-white text-slate-950 shadow-sm'
                              }`
                            : isDark
                            ? 'bg-slate-800/70 border-slate-700 text-slate-300'
                            : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        <span className={`w-4 h-4 rounded-full shrink-0 ${item.bg}`} />
                        <span className="truncate">{item.label[language] || item.label.am}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Invite Friends Content */}
          {activeSection === 'invite' && (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-extrabold flex items-center gap-2 text-emerald-500">
                  <UserPlus className="w-4 h-4" />
                  <span>{pt.inviteTitle}</span>
                </h4>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black border border-emerald-500/30">
                  {pt.inviteBadge}
                </span>
              </div>

              {/* Referral Stats Grid */}
              <div className="grid grid-cols-3 gap-2">
                <div
                  className={`p-2.5 rounded-xl border text-center ${
                    isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="text-[10px] font-bold text-slate-400">{pt.invitedCountLabel}</div>
                  <div className="text-base font-black text-amber-400 font-mono-tabular mt-0.5">
                    {currentUser.referredCount || 0}
                  </div>
                </div>
                <div
                  className={`p-2.5 rounded-xl border text-center ${
                    isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="text-[10px] font-bold text-slate-400">{pt.inviteEarningsLabel}</div>
                  <div className="text-base font-black text-emerald-400 font-mono-tabular mt-0.5">
                    {(currentUser.referralEarnings || 0).toFixed(0)} <span className="text-[10px]">ETB</span>
                  </div>
                </div>
                <div
                  className={`p-2.5 rounded-xl border text-center ${
                    isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="text-[10px] font-bold text-slate-400">{pt.perInviteLabel}</div>
                  <div className="text-base font-black text-blue-400 font-mono-tabular mt-0.5">
                    25 <span className="text-[10px]">ETB</span>
                  </div>
                </div>
              </div>

              {/* QR Code Presentation Card */}
              <div
                className={`p-4 rounded-2xl border flex flex-col items-center justify-center text-center gap-3 shadow-md ${
                  isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs sm:text-sm font-black tracking-tight">
                    {pt.yourReferralQr}
                  </span>
                </div>

                <div className="relative p-3.5 bg-white rounded-2xl shadow-lg border-2 border-emerald-500/40 inline-flex flex-col items-center justify-center">
                  {referralQrDataUrl ? (
                    <img
                      src={referralQrDataUrl}
                      alt="Sun Bingo Referral QR Code"
                      className="w-44 h-44 sm:w-52 sm:h-52 object-contain rounded-lg"
                    />
                  ) : (
                    <div className="w-44 h-44 sm:w-52 sm:h-52 flex items-center justify-center text-slate-400">
                      <span className="animate-pulse text-xs font-bold">
                        {isGeneratingQr ? pt.qrGenerating : pt.qrFailed}
                      </span>
                    </div>
                  )}

                  <div className="mt-1.5 px-3 py-0.5 rounded-full bg-slate-950 text-amber-400 text-[10px] font-black tracking-widest uppercase border border-amber-400/40 shadow-xs">
                    Sun Bingo
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-xs font-bold text-slate-400">
                    {language === 'am'
                      ? 'አዲስ ተጫዋቾች በስልካቸው ካሜራ ስካን በማድረግ በቀጥታ ይቀላቀላሉ'
                      : language === 'ti'
                      ? 'ሓደሽቲ ተጻወትቲ ብካሜራ ስልኮም ስካን ብምግባር ብቐጥታ ይጽንበሩ'
                      : language === 'om'
                      ? 'Taphataan haaraan kaameeraa bilbilaatiin iskaan gochuun makama'
                      : 'New players can scan with their phone camera to join directly'}
                  </div>
                  <div className="text-xs sm:text-sm font-black font-mono-tabular text-emerald-400">
                    {language === 'am' ? 'ኮድ፦' : language === 'ti' ? 'ኮድ፦' : language === 'om' ? 'Koodii:' : 'Code:'}{' '}
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-emerald-300">
                      {currentUser.referralCode || currentUser.phone?.slice(-6) || 'SUN'}
                    </span>
                  </div>
                </div>

                {/* QR Actions */}
                <div className="flex items-center gap-2 w-full max-w-xs pt-1">
                  <button
                    type="button"
                    onClick={handleDownloadQr}
                    className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer border border-slate-700 shadow-xs active:scale-95 transition-all"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    <span>
                      {language === 'am'
                        ? 'QR አውርድ'
                        : language === 'ti'
                        ? 'QR ኣውርድ'
                        : language === 'om'
                        ? 'QR Buufadhu'
                        : 'Download QR'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={copyReferralLink}
                    className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all"
                  >
                    {copiedReferral ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedReferral ? pt.copiedWord : pt.copyLinkBtn}</span>
                  </button>
                </div>
              </div>

              {/* Referral Link & Code Box */}
              <div
                className={`p-3 rounded-2xl border flex flex-col gap-2 ${
                  isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-100 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-400">{pt.yourReferralCodeLabel}</span>
                  <span className="font-mono-tabular font-black text-sm text-emerald-400 px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30">
                    {currentUser.referralCode || currentUser.phone?.slice(-6) || 'SUN'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 overflow-hidden">
                  <div
                    className={`flex-1 px-3 py-2 rounded-xl text-xs font-mono-tabular truncate select-all border ${
                      isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-300 text-slate-700'
                    }`}
                  >
                    {getReferralLink()}
                  </div>
                  <button
                    type="button"
                    onClick={copyReferralLink}
                    className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1 shrink-0 cursor-pointer shadow-xs"
                    title={pt.copyLinkBtn}
                  >
                    {copiedReferral ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedReferral ? pt.copiedWord : pt.copyWord}</span>
                  </button>
                </div>
              </div>

              {/* Instant Social Share Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleTelegramShare}
                  className="py-2.5 px-3 rounded-xl bg-[#229ED9] hover:bg-[#1E8CC0] text-white text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer shadow-md active:scale-95 transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{pt.shareTelegram}</span>
                </button>
                <button
                  type="button"
                  onClick={handleWebShare}
                  className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer shadow-md active:scale-95 transition-all"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>{pt.shareAnyApp}</span>
                </button>
              </div>

              {/* Direct Phone Invite */}
              <form onSubmit={handleInviteFriend} className="flex flex-col sm:flex-row gap-2 pt-1">
                <input
                  type="tel"
                  value={friendPhone}
                  onChange={(e) => setFriendPhone(e.target.value)}
                  placeholder={pt.friendPhonePlaceholder}
                  className={`flex-1 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-mono-tabular border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300'
                  }`}
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer shadow-xs shrink-0"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{pt.inviteSubmitBtn}</span>
                </button>
              </form>
            </div>
          )}

          {/* Daub Color Content */}
          {activeSection === 'daub_color' && (
            <div className="space-y-3">
              <h4 className="text-sm font-extrabold flex items-center gap-2">
                <Palette className="w-4 h-4 text-emerald-500" />
                <span>{pt.daubColorTitle}</span>
              </h4>
              <div className="flex flex-wrap gap-2">
                {DAUB_COLOR_SWATCHES.map((swatch) => (
                  <button
                    key={swatch.id}
                    type="button"
                    onClick={() => {
                      onChangeDaubColor(swatch.id);
                      setActiveSection(null);
                    }}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      daubColor === swatch.id
                        ? 'ring-2 ring-blue-500 font-extrabold scale-105'
                        : 'opacity-85 hover:opacity-100'
                    } ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}
                  >
                    <span className={`w-4 h-4 rounded-full ${swatch.bg}`} />
                    <span>{swatch.label[language] || swatch.label.am}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Notifications Content */}
          {activeSection === 'notifications' && (
            <div className="space-y-2.5">
              <h4 className="text-sm font-extrabold flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-500" />
                <span>{pt.notificationsTitle}</span>
              </h4>
              {(
                [
                  { id: 'registered_only', label: pt.notifRegisteredOnly },
                  { id: 'always', label: pt.notifAlways },
                  { id: 'none', label: pt.notifNone },
                ] as const
              ).map((opt) => (
                <label
                  key={opt.id}
                  onClick={() => onChangeNotificationPref(opt.id)}
                  className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-colors ${
                    notificationPref === opt.id
                      ? isDark
                        ? 'bg-blue-950/40 border-blue-500'
                        : 'bg-blue-50 border-blue-600'
                      : isDark
                      ? 'bg-slate-800/50 border-slate-700'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="notifPref"
                    checked={notificationPref === opt.id}
                    onChange={() => onChangeNotificationPref(opt.id)}
                    className="mt-1"
                  />
                  <div className="text-xs font-extrabold">{opt.label}</div>
                </label>
              ))}
            </div>
          )}

          {/* Password Change Content */}
          {activeSection === 'password' && (
            <form onSubmit={handlePasswordSubmit} className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-xs sm:text-sm font-extrabold text-amber-500 flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4" />
                  <span>{pt.passwordSectionTitle}</span>
                </h4>
                <button
                  type="button"
                  onClick={handleSendForgotPasswordOtp}
                  className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-extrabold cursor-pointer"
                >
                  {pt.sendOtpBtn}
                </button>
              </div>
              {forgotOtpSent && (
                <div className="space-y-2">
                  <a
                    href={
                      forgotTelegramOtpUrl ||
                      `https://t.me/Sungamsbot?start=otp_${encodeURIComponent(currentUser.phone)}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2 px-3 rounded-xl bg-sky-500/20 border border-sky-400/40 text-sky-400 font-extrabold text-xs flex items-center justify-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{pt.receiveOtpBtn}</span>
                  </a>
                  <input
                    type="text"
                    value={forgotOtpCode}
                    onChange={(e) => setForgotOtpCode(e.target.value)}
                    placeholder={pt.otpPlaceholder}
                    className={`w-full px-3 py-2 rounded-xl text-sm font-mono-tabular border ${
                      isDark ? 'bg-slate-800 border-slate-700 text-amber-300' : 'bg-slate-50 border-slate-300'
                    }`}
                  />
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={pt.newPassPlaceholder}
                  className={`flex-1 px-3 py-2 rounded-xl text-sm border ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300'
                  }`}
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-extrabold text-xs cursor-pointer"
                >
                  {pt.changePassBtn}
                </button>
              </div>
            </form>
          )}

          {/* Terms and Conditions Content */}
          {activeSection === 'terms' && (
            <div className="space-y-3">
              <h4 className="text-sm font-extrabold text-amber-500 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4" />
                <span>{isFastBingo ? t.fastTermsTitle : t.termsTitle}</span>
              </h4>
              {isFastBingo
                ? (FAST_BINGO_TERMS_BY_LANG[language] || FAST_BINGO_TERMS_BY_LANG.am).map(
                    (sec, idx) => (
                      <div
                        key={idx}
                        className={`p-3.5 rounded-xl border space-y-2 ${
                          isDark
                            ? 'bg-slate-800/60 border-slate-700 text-slate-100'
                            : 'bg-slate-50 border-slate-200 text-slate-900'
                        }`}
                      >
                        <div className="text-xs sm:text-sm font-extrabold text-amber-500">
                          {sec.title}
                        </div>
                        <ul className="space-y-1.5 text-xs sm:text-sm font-semibold leading-relaxed">
                          {sec.items.map((line, lIdx) => (
                            <li key={lIdx} className="flex items-start gap-2">
                              <span className="text-amber-400 font-black mt-0.5">•</span>
                              <span>{line}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )
                  )
                : (TERMS_AND_CONDITIONS_BY_LANG[language] || TERMS_AND_CONDITIONS_BY_LANG.am).map(
                    (ruleText, i) => (
                      <div
                        key={i}
                        className={`p-3 rounded-xl text-xs sm:text-sm font-semibold leading-relaxed border ${
                          isDark
                            ? 'bg-slate-800/60 border-slate-700 text-slate-200'
                            : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      >
                        {ruleText}
                      </div>
                    )
                  )}
            </div>
          )}

          {/* Contact Us Content */}
          {activeSection === 'contact' && (
            <div className="space-y-3">
              <h4 className="text-sm font-extrabold text-emerald-500 flex items-center gap-1.5">
                <MessageCircle className="w-4 h-4" />
                <span>{t.contactUs}</span>
              </h4>
              <div className="grid grid-cols-2 gap-2.5">
                <div
                  className={`p-3 rounded-xl border ${
                    isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="text-[11px] font-bold text-sky-500 uppercase">Telegram</div>
                  <div className="text-sm font-extrabold mt-0.5">Ezi bingo</div>
                </div>
                <div
                  className={`p-3 rounded-xl border ${
                    isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="text-[11px] font-bold text-pink-500 uppercase">TikTok</div>
                  <div className="text-sm font-extrabold mt-0.5">Ezi bingo</div>
                </div>
                <div
                  className={`p-3 rounded-xl border ${
                    isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="text-[11px] font-bold text-blue-500 uppercase">Facebook</div>
                  <div className="text-sm font-extrabold mt-0.5">Ezi bingo</div>
                </div>
                <div
                  className={`p-3 rounded-xl border ${
                    isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="text-[11px] font-bold text-emerald-500 uppercase">{pt.phoneContactLabel}</div>
                  <div className="text-sm font-extrabold font-mono-tabular mt-0.5">0997539855</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2x2 PRIMARY MENU TILES */}
      <div className="grid grid-cols-2 gap-3">
        {/* Tile 1: Language */}
        <button
          type="button"
          onClick={() => setActiveSection(activeSection === 'language' ? null : 'language')}
          className={tileBaseClass}
        >
          <div
            className={`w-11 h-11 rounded-full flex items-center justify-center ${
              isDark ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-700'
            }`}
          >
            <Globe className="w-5 h-5" />
          </div>
          <span className="text-xs sm:text-sm font-bold">{pt.menuLanguage}</span>
        </button>

        {/* Tile 2: Theme */}
        <button
          type="button"
          onClick={() => setActiveSection(activeSection === 'theme' ? null : 'theme')}
          className={tileBaseClass}
        >
          <div
            className={`w-11 h-11 rounded-full flex items-center justify-center ${
              isDark ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-700'
            }`}
          >
            {isDark ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </div>
          <span className="text-xs sm:text-sm font-bold">{pt.menuTheme}</span>
        </button>

        {/* Tile 3: Game History */}
        <button
          type="button"
          onClick={() => {
            if (onOpenGameHistory) {
              onOpenGameHistory();
            }
          }}
          className={tileBaseClass}
        >
          <div
            className={`w-11 h-11 rounded-full flex items-center justify-center ${
              isDark ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-700'
            }`}
          >
            <History className="w-5 h-5" />
          </div>
          <span className="text-xs sm:text-sm font-bold">{pt.menuHistory}</span>
        </button>

        {/* Tile 4: Invite Friends */}
        <button
          type="button"
          onClick={() => setActiveSection(activeSection === 'invite' ? null : 'invite')}
          className={tileBaseClass}
        >
          <div
            className={`w-11 h-11 rounded-full flex items-center justify-center ${
              isDark ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-700'
            }`}
          >
            <UserPlus className="w-5 h-5" />
          </div>
          <span className="text-xs sm:text-sm font-bold">{pt.menuInvite}</span>
        </button>
      </div>

      {/* 3-COLUMN SECONDARY TILES ROW */}
      <div className="grid grid-cols-3 gap-2.5">
        <button
          type="button"
          onClick={() => setActiveSection(activeSection === 'daub_color' ? null : 'daub_color')}
          className={tileBaseClass}
        >
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center ${
              isDark ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-700'
            }`}
          >
            <Palette className="w-4 h-4" />
          </div>
          <span className="text-[11px] sm:text-xs font-bold">{pt.menuDaubColor}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection(activeSection === 'notifications' ? null : 'notifications')}
          className={tileBaseClass}
        >
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center ${
              isDark ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-700'
            }`}
          >
            <Bell className="w-4 h-4" />
          </div>
          <span className="text-[11px] sm:text-xs font-bold">{pt.menuNotifications}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection(activeSection === 'password' ? null : 'password')}
          className={tileBaseClass}
        >
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center ${
              isDark ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-700'
            }`}
          >
            <Lock className="w-4 h-4" />
          </div>
          <span className="text-[11px] sm:text-xs font-bold">{pt.menuPassword}</span>
        </button>
      </div>

      {/* Terms & Contact Row + Log Out */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <button
          type="button"
          onClick={() => setActiveSection(activeSection === 'terms' ? null : 'terms')}
          className={tileBaseClass}
        >
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center ${
              isDark ? 'bg-slate-800 text-amber-400' : 'bg-amber-50 text-amber-600'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold">{isFastBingo ? t.fastTermsTitle : t.termsTitle}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection(activeSection === 'contact' ? null : 'contact')}
          className={tileBaseClass}
        >
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center ${
              isDark ? 'bg-slate-800 text-emerald-400' : 'bg-emerald-50 text-emerald-600'
            }`}
          >
            <MessageCircle className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold">{t.contactUs}</span>
        </button>
      </div>

      {/* Sign Out Button */}
      <button
        type="button"
        onClick={onSignOut}
        className={`w-full py-3 rounded-2xl border font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors ${
          isDark
            ? 'bg-rose-950/40 border-rose-500/40 text-rose-400 hover:bg-rose-900/50'
            : 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100'
        }`}
      >
        <LogOut className="w-4 h-4" />
        <span>{t.signOutBtn}</span>
      </button>
    </div>
  );
};
