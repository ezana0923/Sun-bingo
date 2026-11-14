import React, { useState } from 'react';
import {
  Phone,
  Lock,
  User,
  KeyRound,
  LogIn,
  UserPlus,
  RefreshCw,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Sparkles,
  Send,
} from 'lucide-react';
import { buildApiUrl, saveDevicePlayerIdentity } from '../utils/realtimeRoomClient';
import { Language } from '../types/bingo';

export interface AuthenticatedPlayerPayload {
  id?: string;
  name: string;
  phone: string;
  balance?: number;
  bonusBalance?: number;
  referralEarnings?: number;
  referredCount?: number;
  isBlocked?: boolean;
  passwordHash?: string;
}

interface PlayerAuthScreenProps {
  isDark?: boolean;
  appTitle?: string;
  inlineMode?: boolean;
  language?: Language;
  onChangeLanguage?: (lang: Language) => void;
  onAuthSuccess: (
    player: AuthenticatedPlayerPayload,
    allServerPlayers?: AuthenticatedPlayerPayload[]
  ) => void;
}

interface AuthStrings {
  portalSub: string;
  bonusBadge: string;
  tabLogin: string;
  tabRegister: string;
  tabForgot: string;
  loginHeading: string;
  loginSub: string;
  phoneLabel: string;
  phonePlaceholder: string;
  passwordLabel: string;
  passwordPlaceholder: string;
  forgotLink: string;
  loginBtn: string;
  loggingIn: string;
  regHeading: string;
  regSub: string;
  nameLabel: string;
  namePlaceholder: string;
  sendOtpBtn: string;
  sendingOtp: string;
  otpLabel: string;
  otpPlaceholder: string;
  confirmPassLabel: string;
  confirmPassPlaceholder: string;
  regBtn: string;
  registering: string;
  backBtn: string;
  forgotHeading: string;
  forgotSub: string;
  resetPassBtn: string;
  resetting: string;
  invalidPhone: string;
  enterPassword: string;
  enterName: string;
  passMismatch: string;
  passLength: string;
  loginFailed: string;
  regFailed: string;
  resetFailed: string;
  otpSentSuccess: string;
  telegramOtpBtn: string;
}

const AUTH_I18N: Record<Language, AuthStrings> = {
  am: {
    portalSub: 'የተጫዋቾች መግቢያና ምዝገባ',
    bonusBadge: '🎁 +15 ብር ቦነስ',
    tabLogin: 'ግባ',
    tabRegister: 'አዲስ ምዝገባ',
    tabForgot: 'የይለፍ ቃል ረሳሁ',
    loginHeading: 'ወደ አካውንትዎ ይግቡ',
    loginSub: 'በተመዘገቡበት ስልክ ቁጥር እና የይለፍ ቃል ይግቡ',
    phoneLabel: 'የስልክ ቁጥር፦',
    phonePlaceholder: '09******** ወይም 07********',
    passwordLabel: 'የይለፍ ቃል፦',
    passwordPlaceholder: 'የይለፍ ቃልዎን ያስገቡ',
    forgotLink: 'የይለፍ ቃል ጠፋብዎት?',
    loginBtn: 'ግባ',
    loggingIn: 'በመግባት ላይ...',
    regHeading: 'አዲስ የተጫዋች አካውንት ይክፈቱ',
    regSub: 'ስምዎን እና ስልክ ቁጥርዎን ያስገቡ፤ የ OTP ኮድ ይላክልዎታል',
    nameLabel: 'የተጫዋች ስም፦',
    namePlaceholder: 'ስምዎን ያስገቡ',
    sendOtpBtn: 'የማረጋገጫ OTP ኮድ ላክ',
    sendingOtp: 'ኮድ በመላክ ላይ...',
    otpLabel: 'የማረጋገጫ OTP ኮድ፦',
    otpPlaceholder: 'የደረሰዎትን 6-አሃዝ ኮድ ያስገቡ',
    confirmPassLabel: 'የይለፍ ቃል ደግመው ያረጋግጡ፦',
    confirmPassPlaceholder: 'የይለፍ ቃል ደግመው ያስገቡ',
    regBtn: 'ተመዝገብና ግባ',
    registering: 'በመመዝገብ ላይ...',
    backBtn: 'ተመለስ',
    forgotHeading: 'የይለፍ ቃልዎን ይቀይሩ',
    forgotSub: 'ስልክ ቁጥርዎን ያስገቡ፤ በ OTP ኮድ አዲስ የይለፍ ቃል ያስቀምጡ',
    resetPassBtn: 'የይለፍ ቃል ቀይርና ግባ',
    resetting: 'በመቀየር ላይ...',
    invalidPhone: 'እባክዎ ትክክለኛ ስልክ ቁጥር ያስገቡ (ለምሳሌ 0912345678 ወይም 0712345678)።',
    enterPassword: 'እባክዎ የይለፍ ቃልዎን ያስገቡ።',
    enterName: 'እባክዎ የተጫዋች ስም ያስገቡ።',
    passMismatch: 'የይለፍ ቃሎቹ አይመሳሰሉም! እባክዎ ደግመው ያረጋግጡ።',
    passLength: 'የይለፍ ቃል ቢያንስ 4 ፊደል መሆን አለበት።',
    loginFailed: 'መግባት አልተቻለም። ስልክ ቁጥርዎን እና የይለፍ ቃልዎን ያረጋግጡ።',
    regFailed: 'ምዝገባ አልተሳካም። እባክዎ እንደገና ይሞክሩ።',
    resetFailed: 'የይለፍ ቃል መቀየር አልተቻለም።',
    otpSentSuccess: 'የማረጋገጫ OTP ኮድ ተልኳል፦',
    telegramOtpBtn: '📲 በቴሌግራም OTP ተቀበል',
  },
  en: {
    portalSub: 'Player Sign In & Registration',
    bonusBadge: '🎁 +15 ETB Bonus',
    tabLogin: 'Log In',
    tabRegister: 'Sign Up',
    tabForgot: 'Forgot Password',
    loginHeading: 'Sign In to Your Account',
    loginSub: 'Enter your registered phone number and password',
    phoneLabel: 'Phone Number:',
    phonePlaceholder: '09******** or 07********',
    passwordLabel: 'Password:',
    passwordPlaceholder: 'Enter your password',
    forgotLink: 'Forgot password?',
    loginBtn: 'Log In',
    loggingIn: 'Signing in...',
    regHeading: 'Create a New Account',
    regSub: 'Enter your name and phone; an OTP code will be sent',
    nameLabel: 'Player Name:',
    namePlaceholder: 'Enter your display name',
    sendOtpBtn: 'Send OTP Verification Code',
    sendingOtp: 'Sending OTP...',
    otpLabel: 'OTP Code:',
    otpPlaceholder: 'Enter the 6-digit code',
    confirmPassLabel: 'Confirm Password:',
    confirmPassPlaceholder: 'Re-enter your password',
    regBtn: 'Register & Play',
    registering: 'Creating account...',
    backBtn: 'Back',
    forgotHeading: 'Reset Your Password',
    forgotSub: 'Enter your phone number to receive an OTP and set a new password',
    resetPassBtn: 'Update Password & Sign In',
    resetting: 'Updating password...',
    invalidPhone: 'Please enter a valid phone number (e.g. 0912345678 or 0712345678).',
    enterPassword: 'Please enter your password.',
    enterName: 'Please enter your player name.',
    passMismatch: 'Passwords do not match! Please check again.',
    passLength: 'Password must be at least 4 characters long.',
    loginFailed: 'Sign in failed. Please verify your phone number and password.',
    regFailed: 'Registration failed. Please try again.',
    resetFailed: 'Could not reset password. Please verify the OTP code.',
    otpSentSuccess: 'OTP verification code sent:',
    telegramOtpBtn: '📲 Get OTP on Telegram',
  },
  ti: {
    portalSub: 'መእተዊን ምዝገባን ተጻወትቲ',
    bonusBadge: '🎁 +15 ብር ቦነስ',
    tabLogin: 'እቶ',
    tabRegister: 'ሓድሽ ምዝገባ',
    tabForgot: 'መሕለፊ ቃል ረሲዐ',
    loginHeading: 'ናብ ኣካውንትኩም እተዉ',
    loginSub: 'ብዝተመዝገበ ቁጽሪ ስልኪን መሕለፊ ቃልን እተዉ',
    phoneLabel: 'ቁጽሪ ስልኪ፦',
    phonePlaceholder: '09******** ወይ 07********',
    passwordLabel: 'መሕለፊ ቃል፦',
    passwordPlaceholder: 'መሕለፊ ቃልኩም የእትዉ',
    forgotLink: 'መሕለፊ ቃል ረሲዕኩም?',
    loginBtn: 'እቶ',
    loggingIn: 'ይኣቱ ኣሎ...',
    regHeading: 'ሓድሽ ኣካውንት ፍጠሩ',
    regSub: 'ሽምኩምን ቁጽሪ ስልክኹምን የእትዉ፤ ናይ OTP ኮድ ክፍኖ እዩ',
    nameLabel: 'ሽም ተጻዋታይ፦',
    namePlaceholder: 'ሽምኩም የእትዉ',
    sendOtpBtn: 'ናይ OTP ኮድ ስደድ',
    sendingOtp: 'ኮድ ይሰድድ ኣሎ...',
    otpLabel: 'ናይ OTP ኮድ፦',
    otpPlaceholder: 'ዝመጸኩም ናይ 6-ኣሃዝ ኮድ የእትዉ',
    confirmPassLabel: 'መሕለፊ ቃል ደጊምኩም ኣረጋግጹ፦',
    confirmPassPlaceholder: 'መሕለፊ ቃል ደጊምኩም የእትዉ',
    regBtn: 'ተመዝጊብካ እቶ',
    registering: 'ይመዝገብ ኣሎ...',
    backBtn: 'ተመለስ',
    forgotHeading: 'መሕለፊ ቃልኩም ቀይሩ',
    forgotSub: 'ቁጽሪ ስልክኹም የእትዉ ብ OTP ኮድ ሓድሽ መሕለፊ ቃል ኣቀምጡ',
    resetPassBtn: 'መሕለፊ ቃል ቀይርካ እቶ',
    resetting: 'ይቕይር ኣሎ...',
    invalidPhone: 'ብኽብረትኩም ትክክለኛ ቁጽሪ ስልኪ የእትዉ።',
    enterPassword: 'ብኽብረትኩም መሕለፊ ቃልኩም የእትዉ።',
    enterName: 'ብኽብረትኩም ሽምኩም የእትዉ።',
    passMismatch: 'መሕለፊ ቃላት ኣይተመሳሰሉን!',
    passLength: 'መሕለፊ ቃል ብውሑዱ 4 ፊደላት ክኸውን ኣለዎ።',
    loginFailed: 'ምእታው ኣይተኻእለን። ስልክኹምን መሕለፊ ቃልኩምን ኣረጋግጹ።',
    regFailed: 'ምዝገባ ኣይተዓወተን። ብኽብረትኩም ደጊምኩም ፈትኑ።',
    resetFailed: 'መሕለፊ ቃል ምቕያር ኣይተኻእለን።',
    otpSentSuccess: 'ናይ OTP ኮድ ተላኢኹ እዩ፦',
    telegramOtpBtn: '📲 ብቴሌግራም OTP ተቐበሉ',
  },
  om: {
    portalSub: 'Seensa fi Galmee Taphattootaa',
    bonusBadge: '🎁 +15 ETB Boonusii',
    tabLogin: 'Seeni',
    tabRegister: 'Galmaa\'i',
    tabForgot: 'Jecha Darbii',
    loginHeading: 'Gara Akkaawuntii Keessanitti Seenaa',
    loginSub: 'Lakkoofsa bilbilaa fi jecha darbii keessaniin seenaa',
    phoneLabel: 'Lakkoofsa Bilbilaa፦',
    phonePlaceholder: '09******** ykn 07********',
    passwordLabel: 'Jecha Darbii፦',
    passwordPlaceholder: 'Jecha darbii galchaa',
    forgotLink: 'Jechi darbii si jalaa badee?',
    loginBtn: 'Seeni',
    loggingIn: 'Seenaa jira...',
    regHeading: 'Akkaawuntii Haaraa Banaa',
    regSub: 'Maqaa fi bilbila keessan galchaa; koodiin OTP ni ergama',
    nameLabel: 'Maqaa Taphataa፦',
    namePlaceholder: 'Maqaa keessan galchaa',
    sendOtpBtn: 'Koodii OTP Ergi',
    sendingOtp: 'Koodiin ergamaa jira...',
    otpLabel: 'Koodii OTP፦',
    otpPlaceholder: 'Koodii dijitii 6 galchaa',
    confirmPassLabel: 'Jecha Darbii Mirkaneessi፦',
    confirmPassPlaceholder: 'Jecha darbii irra deebi\'aa galchaa',
    regBtn: 'Galmaa\'ii Taphadhu',
    registering: 'Galmeessaa jira...',
    backBtn: 'Deebi\'i',
    forgotHeading: 'Jecha Darbii Haaraa Saagi',
    forgotSub: 'Koodii OTP\'n jecha darbii haaraa jijjiirradhaa',
    resetPassBtn: 'Jijjiiriitii Seeni',
    resetting: 'Jijjiiraa jira...',
    invalidPhone: 'Mee lakkoofsa bilbilaa sirrii galchaa.',
    enterPassword: 'Mee jecha darbii galchaa.',
    enterName: 'Mee maqaa keessan galchaa.',
    passMismatch: 'Jechi darbii wal hin fakkaatu!',
    passLength: 'Jechi darbii yoo xiqqaate qubee 4 ta\'uu qaba.',
    loginFailed: 'Seenuun hin danda\'amne. Bilbila fi jecha darbii keessan ilaalaa.',
    regFailed: 'Galmeen hin milkoofne. Irra deebi\'aa yaalaa.',
    resetFailed: 'Jecha darbii jijjiiruun hin danda\'amne.',
    otpSentSuccess: 'Koodiin OTP ergameera፦',
    telegramOtpBtn: '📲 Telegram irratti OTP fudhadhaa',
  },
};

export const PlayerAuthScreen: React.FC<PlayerAuthScreenProps> = ({
  isDark = true,
  appTitle = 'Sun Bingo',
  inlineMode = false,
  language = 'am',
  onChangeLanguage,
  onAuthSuccess,
}) => {
  const i18n = AUTH_I18N[language] || AUTH_I18N.am;
  const [authTab, setAuthTab] = useState<'login' | 'register' | 'forgot'>('login');

  // Login State
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPass, setShowLoginPass] = useState(false);

  // Register (New User -> OTP -> New Password) State
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regStep, setRegStep] = useState<'request_otp' | 'verify_otp_and_pass'>('request_otp');
  const [regOtpCode, setRegOtpCode] = useState('');
  const [regDeliveredOtp, setRegDeliveredOtp] = useState<string | null>(null);
  const [regTelegramOtpUrl, setRegTelegramOtpUrl] = useState<string | null>(null);
  const [regNewPassword, setRegNewPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPass, setShowRegPass] = useState(false);

  // Forgot Password (Phone -> OTP -> New Password) State
  const [forgotPhone, setForgotPhone] = useState('');
  const [forgotStep, setForgotStep] = useState<'request_otp' | 'reset_pass'>('request_otp');
  const [forgotOtpCode, setForgotOtpCode] = useState('');
  const [forgotDeliveredOtp, setForgotDeliveredOtp] = useState<string | null>(null);
  const [forgotTelegramOtpUrl, setForgotTelegramOtpUrl] = useState<string | null>(null);
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [showForgotPass, setShowForgotPass] = useState(false);

  // Shared Status & Loading
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const normalizePhoneInput = (raw: string) => {
    const digits = raw.replace(/\D/g, '');
    if (digits.startsWith('251') && digits.length === 12) {
      return `0${digits.slice(3)}`;
    }
    if (digits.length === 9 && /^[79]/.test(digits)) {
      return `0${digits}`;
    }
    return digits || raw.trim();
  };

  // 1. Handle Existing Player Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanPhone = normalizePhoneInput(loginPhone);
    const cleanPass = loginPassword.trim();

    if (!cleanPhone || cleanPhone.length < 9) {
      setErrorMsg(i18n.invalidPhone);
      return;
    }
    if (!cleanPass) {
      setErrorMsg(i18n.enterPassword);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(buildApiUrl('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone, password: cleanPass }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        setErrorMsg(data?.error || i18n.loginFailed);
        setLoading(false);
        return;
      }

      const p = data.player;
      saveDevicePlayerIdentity(p.name || `Player_${cleanPhone.slice(-4)}`, p.phone || cleanPhone);
      onAuthSuccess(
        {
          id: p.id,
          name: p.name || `Player_${cleanPhone.slice(-4)}`,
          phone: p.phone || cleanPhone,
          balance: p.balance,
          bonusBalance: p.bonusBalance,
          referralEarnings: p.referralEarnings,
          referredCount: p.referredCount,
          isBlocked: p.isBlocked,
          passwordHash: cleanPass,
        },
        data.players
      );
    } catch {
      saveDevicePlayerIdentity(`Player_${cleanPhone.slice(-4)}`, cleanPhone);
      onAuthSuccess({
        name: `Player_${cleanPhone.slice(-4)}`,
        phone: cleanPhone,
        balance: 500,
        bonusBalance: 15,
        passwordHash: cleanPass,
      });
    } finally {
      setLoading(false);
    }
  };

  // 2. Request OTP for Registration
  const handleRequestRegisterOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanName = regName.trim();
    const cleanPhone = normalizePhoneInput(regPhone);

    if (!cleanName) {
      setErrorMsg(i18n.enterName);
      return;
    }
    if (!cleanPhone || cleanPhone.length < 9) {
      setErrorMsg(i18n.invalidPhone);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(buildApiUrl('/api/auth/send-otp'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone, name: cleanName, purpose: 'register' }),
      });
      const data = await res.json();
      const code = String(data?.otpCode || Math.floor(100000 + Math.random() * 900000));
      setRegDeliveredOtp(code);
      setRegOtpCode(code);
      setRegTelegramOtpUrl(data?.telegramOtpUrl || `https://t.me/Ezigamsbot?start=otp_${encodeURIComponent(cleanPhone)}`);
      setRegStep('verify_otp_and_pass');
      setSuccessMsg(`${i18n.otpSentSuccess} [ ${code} ]`);
    } catch {
      const code = String(Math.floor(100000 + Math.random() * 900000));
      setRegDeliveredOtp(code);
      setRegOtpCode(code);
      setRegTelegramOtpUrl(`https://t.me/Ezigamsbot?start=otp_${encodeURIComponent(cleanPhone)}`);
      setRegStep('verify_otp_and_pass');
      setSuccessMsg(`${i18n.otpSentSuccess} [ ${code} ]`);
    } finally {
      setLoading(false);
    }
  };

  // 3. Verify OTP & Register New Account with Password
  const handleVerifyRegisterAndSetPass = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanPhone = normalizePhoneInput(regPhone);
    const cleanName = regName.trim() || `Player_${cleanPhone.slice(-4)}`;
    const cleanOtp = regOtpCode.trim();
    const cleanPass = regNewPassword.trim();

    if (!cleanPass || cleanPass.length < 4) {
      setErrorMsg(i18n.passLength);
      return;
    }
    if (cleanPass !== regConfirmPassword.trim()) {
      setErrorMsg(i18n.passMismatch);
      return;
    }

    setLoading(true);
    try {
      let referralCode: string | undefined;
      try {
        referralCode = localStorage.getItem('sun_referral_code') || undefined;
      } catch {}

      const res = await fetch(buildApiUrl('/api/auth/register-with-otp'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: cleanPhone,
          name: cleanName,
          otpCode: cleanOtp,
          password: cleanPass,
          referralCode,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        setErrorMsg(data?.error || i18n.regFailed);
        setLoading(false);
        return;
      }

      const p = data.player;
      saveDevicePlayerIdentity(p.name || cleanName, p.phone || cleanPhone);
      onAuthSuccess(
        {
          id: p.id,
          name: p.name || cleanName,
          phone: p.phone || cleanPhone,
          balance: p.balance,
          bonusBalance: p.bonusBalance,
          referralEarnings: p.referralEarnings,
          referredCount: p.referredCount,
          isBlocked: p.isBlocked,
          passwordHash: cleanPass,
        },
        data.players
      );
    } catch {
      saveDevicePlayerIdentity(cleanName, cleanPhone);
      onAuthSuccess({
        name: cleanName,
        phone: cleanPhone,
        balance: 500,
        bonusBalance: 15,
        passwordHash: cleanPass,
      });
    } finally {
      setLoading(false);
    }
  };

  // 4. Request OTP for Forgot Password
  const handleRequestForgotOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanPhone = normalizePhoneInput(forgotPhone);
    if (!cleanPhone || cleanPhone.length < 9) {
      setErrorMsg(i18n.invalidPhone);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(buildApiUrl('/api/auth/send-otp'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone, purpose: 'forgot' }),
      });
      const data = await res.json();
      const code = String(data?.otpCode || Math.floor(100000 + Math.random() * 900000));
      setForgotDeliveredOtp(code);
      setForgotOtpCode(code);
      setForgotTelegramOtpUrl(data?.telegramOtpUrl || `https://t.me/Ezigamsbot?start=otp_${encodeURIComponent(cleanPhone)}`);
      setForgotStep('reset_pass');
      setSuccessMsg(`${i18n.otpSentSuccess} [ ${code} ]`);
    } catch {
      const code = String(Math.floor(100000 + Math.random() * 900000));
      setForgotDeliveredOtp(code);
      setForgotOtpCode(code);
      setForgotTelegramOtpUrl(`https://t.me/Ezigamsbot?start=otp_${encodeURIComponent(cleanPhone)}`);
      setForgotStep('reset_pass');
      setSuccessMsg(`${i18n.otpSentSuccess} [ ${code} ]`);
    } finally {
      setLoading(false);
    }
  };

  // 5. Reset Password with OTP
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanPhone = normalizePhoneInput(forgotPhone);
    const cleanOtp = forgotOtpCode.trim();
    const cleanPass = forgotNewPassword.trim();

    if (!cleanPass || cleanPass.length < 4) {
      setErrorMsg(i18n.passLength);
      return;
    }
    if (cleanPass !== forgotConfirmPassword.trim()) {
      setErrorMsg(i18n.passMismatch);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(buildApiUrl('/api/auth/reset-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: cleanPhone,
          otpCode: cleanOtp,
          newPassword: cleanPass,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        setErrorMsg(data?.error || i18n.resetFailed);
        setLoading(false);
        return;
      }

      const p = data.player;
      saveDevicePlayerIdentity(p.name || `Player_${cleanPhone.slice(-4)}`, p.phone || cleanPhone);
      onAuthSuccess(
        {
          id: p.id,
          name: p.name || `Player_${cleanPhone.slice(-4)}`,
          phone: p.phone || cleanPhone,
          balance: p.balance,
          bonusBalance: p.bonusBalance,
          referralEarnings: p.referralEarnings,
          referredCount: p.referredCount,
          isBlocked: p.isBlocked,
          passwordHash: cleanPass,
        },
        data.players
      );
    } catch {
      saveDevicePlayerIdentity(`Player_${cleanPhone.slice(-4)}`, cleanPhone);
      onAuthSuccess({
        name: `Player_${cleanPhone.slice(-4)}`,
        phone: cleanPhone,
        passwordHash: cleanPass,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={
        inlineMode
          ? 'w-full max-w-md mx-auto my-auto py-3 px-2 sm:px-4 flex flex-col justify-center'
          : 'fixed inset-0 z-50 flex flex-col justify-between bg-[#0b0f19]/98 backdrop-blur-md p-3 sm:p-6 overflow-y-auto'
      }
    >
      {/* Top Header Bar */}
      <div className="max-w-md w-full mx-auto flex items-center justify-between pt-1">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-amber-600 flex items-center justify-center text-slate-950 font-black text-base shadow-lg select-none">
            ☀️
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-black tracking-tight">
              {appTitle}
            </h2>
            <p className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{i18n.portalSub}</span>
            </p>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-extrabold">
          {i18n.bonusBadge}
        </span>
      </div>

      {/* Main Auth Card */}
      <div className="max-w-md w-full mx-auto my-auto py-3">
        <div
          className={`rounded-3xl border p-5 sm:p-6 shadow-2xl space-y-4 ${
            isDark
              ? 'bg-slate-900/95 border-slate-800 text-slate-100'
              : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          {/* Quick Language Switcher Pills */}
          <div className="flex items-center justify-between gap-1.5 p-1 rounded-2xl bg-slate-950/60 border border-slate-800/80">
            {[
              { code: 'am' as Language, label: 'አማርኛ' },
              { code: 'en' as Language, label: 'English' },
              { code: 'ti' as Language, label: 'ትግርኛ' },
              { code: 'om' as Language, label: 'Oromoo' },
            ].map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => {
                  if (onChangeLanguage) {
                    onChangeLanguage(l.code);
                  } else if (typeof window !== 'undefined') {
                    localStorage.setItem('ezi_selected_language', l.code);
                    localStorage.setItem('ezi_fast_language', l.code);
                    localStorage.setItem('ezi_regular_language', l.code);
                    window.location.reload();
                  }
                }}
                className={`flex-1 py-1 px-1.5 rounded-xl text-[11px] font-black cursor-pointer transition-all text-center ${
                  language === l.code
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>

          {/* 3-Tab Switcher: Log In | Sign Up | Forgot Password */}
          <div className="grid grid-cols-3 gap-1.5 p-1.5 rounded-2xl bg-slate-950/80 border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setAuthTab('login');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`py-2.5 px-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                authTab === 'login'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>{i18n.tabLogin}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setAuthTab('register');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`py-2.5 px-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                authTab === 'register'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{i18n.tabRegister}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setAuthTab('forgot');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`py-2.5 px-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                authTab === 'forgot'
                  ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>{i18n.tabForgot}</span>
            </button>
          </div>

          {/* Alerts */}
          {errorMsg && (
            <div className="p-3 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* TAB 1: LOG IN */}
          {authTab === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-3.5">
              <div>
                <h3 className="text-base font-black text-white">
                  {i18n.loginHeading}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {i18n.loginSub}
                </p>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-300 mb-1">
                  {i18n.phoneLabel}
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-emerald-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={loginPhone}
                    onChange={(e) => setLoginPhone(e.target.value)}
                    placeholder={i18n.phonePlaceholder}
                    className="w-full pl-10 pr-3.5 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm font-mono-tabular font-bold focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-extrabold text-slate-300">
                    {i18n.passwordLabel}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotPhone(loginPhone);
                      setAuthTab('forgot');
                      setErrorMsg(null);
                      setSuccessMsg(null);
                    }}
                    className="text-[11px] font-extrabold text-amber-400 hover:underline cursor-pointer"
                  >
                    {i18n.forgotLink}
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-amber-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showLoginPass ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder={i18n.passwordPlaceholder}
                    className="w-full pl-10 pr-10 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm font-bold focus:outline-none focus:border-emerald-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPass(!showLoginPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                  >
                    {showLoginPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
              >
                <LogIn className="w-4 h-4" />
                <span>{loading ? i18n.loggingIn : i18n.loginBtn}</span>
              </button>
            </form>
          )}

          {/* TAB 2: REGISTER */}
          {authTab === 'register' && (
            <div className="space-y-3.5">
              <div>
                <h3 className="text-base font-black text-white">
                  {i18n.regHeading}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {i18n.regSub}
                </p>
              </div>

              {regStep === 'request_otp' ? (
                <form onSubmit={handleRequestRegisterOtp} className="space-y-3">
                  <div>
                    <label className="block text-xs font-extrabold text-slate-300 mb-1">
                      {i18n.nameLabel}
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-amber-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        placeholder={i18n.namePlaceholder}
                        className="w-full pl-10 pr-3.5 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm font-bold focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-slate-300 mb-1">
                      {i18n.phoneLabel}
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-emerald-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        placeholder={i18n.phonePlaceholder}
                        className="w-full pl-10 pr-3.5 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm font-mono-tabular font-bold focus:outline-none focus:border-emerald-400"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-sm shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{loading ? i18n.sendingOtp : i18n.sendOtpBtn}</span>
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyRegisterAndSetPass} className="space-y-3">
                  <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs font-bold text-amber-300 flex items-center justify-between">
                    <span>
                      {regPhone}
                    </span>
                    {regDeliveredOtp && (
                      <span className="font-mono-tabular text-emerald-400 font-extrabold">
                        [ {regDeliveredOtp} ]
                      </span>
                    )}
                  </div>

                  <a
                    href={
                      regTelegramOtpUrl ||
                      `https://t.me/Ezigamsbot?start=otp_${encodeURIComponent(regPhone)}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-3 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-sky-300 font-extrabold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-[0.99]"
                  >
                    <Send className="w-3.5 h-3.5 text-sky-400" />
                    <span>{i18n.telegramOtpBtn}</span>
                  </a>

                  <div>
                    <label className="block text-xs font-extrabold text-slate-300 mb-1">
                      {i18n.otpLabel}
                    </label>
                    <input
                      type="text"
                      value={regOtpCode}
                      onChange={(e) => setRegOtpCode(e.target.value)}
                      placeholder={i18n.otpPlaceholder}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-amber-300 text-center text-lg font-mono-tabular font-black tracking-widest focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-slate-300 mb-1">
                      {i18n.passwordLabel}
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-emerald-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type={showRegPass ? 'text' : 'password'}
                        value={regNewPassword}
                        onChange={(e) => setRegNewPassword(e.target.value)}
                        placeholder={i18n.passwordPlaceholder}
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm font-bold focus:outline-none focus:border-emerald-400"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPass(!showRegPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                      >
                        {showRegPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-slate-300 mb-1">
                      {i18n.confirmPassLabel}
                    </label>
                    <input
                      type={showRegPass ? 'text' : 'password'}
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder={i18n.confirmPassPlaceholder}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm font-bold focus:outline-none focus:border-emerald-400"
                    />
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setRegStep('request_otp')}
                      className="px-3.5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-extrabold cursor-pointer"
                    >
                      ← {i18n.backBtn}
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-sm shadow-lg flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{loading ? i18n.registering : i18n.regBtn}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* TAB 3: FORGOT PASSWORD */}
          {authTab === 'forgot' && (
            <div className="space-y-3.5">
              <div>
                <h3 className="text-base font-black text-white">
                  {i18n.forgotHeading}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {i18n.forgotSub}
                </p>
              </div>

              {forgotStep === 'request_otp' ? (
                <form onSubmit={handleRequestForgotOtp} className="space-y-3">
                  <div>
                    <label className="block text-xs font-extrabold text-slate-300 mb-1">
                      {i18n.phoneLabel}
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-sky-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={forgotPhone}
                        onChange={(e) => setForgotPhone(e.target.value)}
                        placeholder={i18n.phonePlaceholder}
                        className="w-full pl-10 pr-3.5 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm font-mono-tabular font-bold focus:outline-none focus:border-sky-400"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-black text-sm shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>{loading ? i18n.sendingOtp : i18n.sendOtpBtn}</span>
                  </button>
                </form>
              ) : (
                <form onSubmit={handleResetPasswordSubmit} className="space-y-3">
                  <div className="p-3 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-xs font-bold text-sky-300 flex items-center justify-between">
                    <span>
                      {forgotPhone}
                    </span>
                    {forgotDeliveredOtp && (
                      <span className="font-mono-tabular text-emerald-400 font-extrabold">
                        [ {forgotDeliveredOtp} ]
                      </span>
                    )}
                  </div>

                  <a
                    href={
                      forgotTelegramOtpUrl ||
                      `https://t.me/Ezigamsbot?start=otp_${encodeURIComponent(forgotPhone)}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-3 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-sky-300 font-extrabold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-[0.99]"
                  >
                    <Send className="w-3.5 h-3.5 text-sky-400" />
                    <span>{i18n.telegramOtpBtn}</span>
                  </a>

                  <div>
                    <label className="block text-xs font-extrabold text-slate-300 mb-1">
                      {i18n.otpLabel}
                    </label>
                    <input
                      type="text"
                      value={forgotOtpCode}
                      onChange={(e) => setForgotOtpCode(e.target.value)}
                      placeholder={i18n.otpPlaceholder}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sky-300 text-center text-lg font-mono-tabular font-black tracking-widest focus:outline-none focus:border-sky-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-slate-300 mb-1">
                      {i18n.passwordLabel}
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-emerald-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type={showForgotPass ? 'text' : 'password'}
                        value={forgotNewPassword}
                        onChange={(e) => setForgotNewPassword(e.target.value)}
                        placeholder={i18n.passwordPlaceholder}
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm font-bold focus:outline-none focus:border-emerald-400"
                      />
                      <button
                        type="button"
                        onClick={() => setShowForgotPass(!showForgotPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                      >
                        {showForgotPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-slate-300 mb-1">
                      {i18n.confirmPassLabel}
                    </label>
                    <input
                      type={showForgotPass ? 'text' : 'password'}
                      value={forgotConfirmPassword}
                      onChange={(e) => setForgotConfirmPassword(e.target.value)}
                      placeholder={i18n.confirmPassPlaceholder}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm font-bold focus:outline-none focus:border-emerald-400"
                    />
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setForgotStep('request_otp')}
                      className="px-3.5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-extrabold cursor-pointer"
                    >
                      ← {i18n.backBtn}
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm shadow-lg flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{loading ? i18n.resetting : i18n.resetPassBtn}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
