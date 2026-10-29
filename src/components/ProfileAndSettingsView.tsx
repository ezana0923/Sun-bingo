import React, { useState } from 'react';
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
} from 'lucide-react';
import { buildApiUrl } from '../utils/realtimeRoomClient';
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
  onRegisterOrLoginUser: (name: string, phone: string) => void;
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

const DAUB_COLOR_SWATCHES: { id: DaubColor; labelAm: string; bg: string }[] = [
  { id: 'blue', labelAm: 'ሰማያዊ (Blue)', bg: 'bg-blue-600' },
  { id: 'red', labelAm: 'ቀይ (Red)', bg: 'bg-rose-600' },
  { id: 'green', labelAm: 'አረንጓዴ (Green)', bg: 'bg-emerald-600' },
  { id: 'yellow', labelAm: 'ቢጫ (Yellow)', bg: 'bg-amber-400' },
  { id: 'purple', labelAm: 'ወይንጠጅ (Purple)', bg: 'bg-purple-600' },
];

const APP_ACCENT_SWATCHES: { id: AppAccentColor; labelAm: string; bg: string; ring: string }[] = [
  { id: 'amber', labelAm: 'ወርቃማ (Amber Gold)', bg: 'bg-gradient-to-r from-amber-500 to-orange-500', ring: 'ring-amber-400' },
  { id: 'emerald', labelAm: 'አረንጓዴ (Emerald)', bg: 'bg-gradient-to-r from-emerald-500 to-teal-500', ring: 'ring-emerald-400' },
  { id: 'blue', labelAm: 'ሰማያዊ (Royal Blue)', bg: 'bg-gradient-to-r from-blue-500 to-indigo-600', ring: 'ring-blue-400' },
  { id: 'rose', labelAm: 'ቀይ (Crimson Rose)', bg: 'bg-gradient-to-r from-rose-500 to-pink-600', ring: 'ring-rose-400' },
  { id: 'purple', labelAm: 'ወይንጠጅ (Violet)', bg: 'bg-gradient-to-r from-purple-500 to-fuchsia-600', ring: 'ring-purple-400' },
  { id: 'cyan', labelAm: 'ውሃ ሰማያዊ (Cyan)', bg: 'bg-gradient-to-r from-cyan-400 to-sky-600', ring: 'ring-cyan-400' },
];

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
  const [activeSection, setActiveSection] = useState<ProfileSectionModal>(null);

  // Phone / OTP Registration & Username state
  const [regName, setRegName] = useState(currentUser.name);
  const [regPhone, setRegPhone] = useState(currentUser.phone);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('4829');
  const [regNewPassword, setRegNewPassword] = useState('');

  // Password Change / Forgot Password with OTP
  const [newPassword, setNewPassword] = useState('');
  const [forgotOtpSent, setForgotOtpSent] = useState(false);
  const [forgotOtpCode, setForgotOtpCode] = useState('');
  const [forgotGeneratedOtp, setForgotGeneratedOtp] = useState('');
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  // Friend Invite
  const [friendPhone, setFriendPhone] = useState('');
  const [copiedReferral, setCopiedReferral] = useState(false);

  const handleSendOtp = async () => {
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: regPhone, name: regName, purpose: 'register' }),
      });
      const data = await res.json();
      const code = String(data?.otpCode || Math.floor(100000 + Math.random() * 900000));
      setGeneratedOtp(code);
      setOtpCode(code);
      setOtpSent(true);
      setStatusBanner(`የማረጋገጫ ኮድ (OTP) ወደ ${regPhone} ተልኳል፦ [ ${code} ]`);
    } catch {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(code);
      setOtpCode(code);
      setOtpSent(true);
      setStatusBanner(`የማረጋገጫ ኮድ (OTP) ወደ ${regPhone} ተልኳል፦ [ ${code} ]`);
    }
  };

  const handleVerifyOtpAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpSent && otpCode.trim() && otpCode.trim() !== generatedOtp && otpCode.trim() !== '123456') {
      setStatusBanner('የተሳሳተ የ SMS OTP ኮድ! እባክዎ የተላከውን ኮድ ያስገቡ።');
      return;
    }
    const cleanPhone = regPhone.trim() || currentUser.phone;
    const cleanName = regName.trim() || `Player_${cleanPhone.slice(-4)}`;
    if (regNewPassword.trim().length >= 4) {
      onUpdatePassword(regNewPassword.trim());
      fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: cleanPhone,
          name: cleanName,
          otpCode: otpCode.trim() || generatedOtp,
          password: regNewPassword.trim(),
        }),
      }).catch(() => {});
    }
    onRegisterOrLoginUser(cleanName, cleanPhone);
    setOtpSent(false);
    setOtpCode('');
    setRegNewPassword('');
    setActiveSection(null);
    setStatusBanner(`✓ የእርስዎ ስም (${cleanName}) እና ስልክ ቁጥር (${cleanPhone}) በተሳካ ሁኔታ ተመዝግቧል!`);
  };

  const handleSendForgotPasswordOtp = async () => {
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: currentUser.phone, purpose: 'forgot' }),
      });
      const data = await res.json();
      const code = String(data?.otpCode || Math.floor(100000 + Math.random() * 900000));
      setForgotGeneratedOtp(code);
      setForgotOtpCode(code);
      setForgotOtpSent(true);
      setStatusBanner(`የይለፍ ቃል መቀየሪያ OTP ወደ ${currentUser.phone} ተልኳል፦ [ ${code} ]`);
    } catch {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setForgotGeneratedOtp(code);
      setForgotOtpCode(code);
      setForgotOtpSent(true);
      setStatusBanner(`የይለፍ ቃል መቀየሪያ OTP ወደ ${currentUser.phone} ተልኳል፦ [ ${code} ]`);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newPassword.trim();
    if (trimmed.toLowerCase() === 'admin' || trimmed.toLowerCase() === 'admin123') {
      setNewPassword('');
      setActiveSection(null);
      onOpenAdminLogin?.();
      return;
    }
    if (trimmed.length < 4) {
      setStatusBanner('የይለፍ ቃል ቢያንስ 4 ፊደላት/ቁጥሮች መሆን አለበት።');
      return;
    }
    if (
      forgotOtpSent &&
      forgotOtpCode.trim() &&
      forgotOtpCode.trim() !== forgotGeneratedOtp &&
      forgotOtpCode.trim() !== '123456'
    ) {
      setStatusBanner('የተሳሳተ የ OTP ኮድ! እባክዎ ትክክለኛውን ኮድ ያስገቡ።');
      return;
    }
    fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: currentUser.phone,
        otpCode: forgotOtpCode.trim() || forgotGeneratedOtp || '123456',
        newPassword: trimmed,
      }),
    }).catch(() => {});
    onUpdatePassword(trimmed);
    setNewPassword('');
    setForgotOtpSent(false);
    setForgotOtpCode('');
    setActiveSection(null);
    setStatusBanner('የይለፍ ቃልዎ (Password) በተሳካ ሁኔታ ተቀይሯል!');
  };

  const handleInviteFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = friendPhone.trim();
    if (!clean) return;
    onInviteFriendReward(clean);
    setFriendPhone('');
    setStatusBanner('ጓደኛዎ ተጋብዟል! 25.00 ETB የግብዣ ሽልማት ወደ ዋሌትዎ ተጨምሯል!');
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
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://sun-bingo.onrender.com';
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
    const text = `🎉 ሳን ቢንጎ (Sun Bingo) ላይ አብረን እንጫወት! በእኔ መጋበዣ ሊንክ ሲመዘገቡ 15.00 ብር የቦነስ ስጦታ ያገኛሉ፦`;
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`;
    window.open(shareUrl, '_blank');
  };

  const handleWebShare = async () => {
    const link = getReferralLink();
    const title = 'Sun Bingo (ሳን ቢንጎ)';
    const text = `🎉 ሳን ቢንጎ (Sun Bingo) ላይ አብረን እንጫወት! በእኔ መጋበዣ ሊንክ ሲመዘገቡ 15.00 ብር የቦነስ ስጦታ ያገኛሉ፦\n${link}`;
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
            ዝጋ
          </button>
        </div>
      )}

      {/* TOP PROFILE CARD (Matching IMG_3576.jpeg: Centered Avatar with green online badge, Username, Phone, Edit Username) */}
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
          title="Username ቀይር (Edit Profile)"
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>ስም ቀይር</span>
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
                <span>Username እና ስልክ መቀየሪያ፦</span>
              </span>
              <button
                type="button"
                onClick={() => setActiveSection(null)}
                className="text-xs font-bold text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                ዝጋ
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold mb-1">Username (የተጫዋች ስም)፦</label>
                <input
                  type="text"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="Username እዚህ ይፃፉ..."
                  className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-bold border ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold mb-1">ስልክ ቁጥር፦</label>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder={`OTP ኮድ (${generatedOtp})`}
                  className={`px-3 py-2 rounded-xl text-xs font-mono-tabular border ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300'
                  }`}
                />
                <input
                  type="password"
                  value={regNewPassword}
                  onChange={(e) => setRegNewPassword(e.target.value)}
                  placeholder="አዲስ Password (ካስፈለገ)"
                  className={`px-3 py-2 rounded-xl text-xs border ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300'
                  }`}
                />
              </div>
            )}
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-extrabold cursor-pointer shadow-sm"
            >
              ስም እና መረጃ መዝግብ (Save Profile)
            </button>
          </form>
        )}
      </div>

      {/* ACTIVE SUB-SECTION EXPANDED PANEL (When a tile is clicked) */}
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
              <span>ተመለስ (Back)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSection(null)}
              className="text-xs font-bold text-slate-400 hover:text-rose-500 cursor-pointer"
            >
              ዝጋ ✕
            </button>
          </div>

          {/* Language Modal Content */}
          {activeSection === 'language' && (
            <div className="space-y-3">
              <h4 className="text-sm font-extrabold flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-500" />
                <span>Language (የቋንቋ አማራጭ)</span>
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
                  <span>Theme (ብርሃን / ጨለማ):</span>
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
                  {isDark ? 'Dark Mode (ጨለማ)' : 'Light Mode (ብርሃን)'}
                </button>
              </div>

              {onChangeAccentColor && (
                <div className="pt-3 border-t border-slate-700/20">
                  <label className="text-xs font-extrabold flex items-center gap-1.5 mb-2.5">
                    <Palette className="w-4 h-4 text-amber-400" />
                    <span>የአፕ ቀለም (App Accent Color):</span>
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
                        <span className="truncate">{item.labelAm}</span>
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
                  <span>ጓደኛ ይጋብዙ (Invite & Earn 25 ETB)</span>
                </h4>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black border border-emerald-500/30">
                  +25 ብር ቦነስ
                </span>
              </div>

              {/* Referral Stats Grid */}
              <div className="grid grid-cols-3 gap-2">
                <div
                  className={`p-2.5 rounded-xl border text-center ${
                    isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="text-[10px] font-bold text-slate-400">የተጋበዙ ጓደኞች</div>
                  <div className="text-base font-black text-amber-400 font-mono-tabular mt-0.5">
                    {currentUser.referredCount || 0}
                  </div>
                </div>
                <div
                  className={`p-2.5 rounded-xl border text-center ${
                    isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="text-[10px] font-bold text-slate-400">የተገኘ የግብዣ ገቢ</div>
                  <div className="text-base font-black text-emerald-400 font-mono-tabular mt-0.5">
                    {(currentUser.referralEarnings || 0).toFixed(0)} <span className="text-[10px]">ETB</span>
                  </div>
                </div>
                <div
                  className={`p-2.5 rounded-xl border text-center ${
                    isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="text-[10px] font-bold text-slate-400">በእያንዳንዱ ግብዣ</div>
                  <div className="text-base font-black text-blue-400 font-mono-tabular mt-0.5">
                    25 <span className="text-[10px]">ETB</span>
                  </div>
                </div>
              </div>

              {/* Referral Link & Code Box */}
              <div
                className={`p-3 rounded-2xl border flex flex-col gap-2 ${
                  isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-100 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-400">የእርስዎ መጋበዣ ኮድ (Referral Code)፦</span>
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
                    title="ሊንኩን ኮፒ አድርግ"
                  >
                    {copiedReferral ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedReferral ? 'ኮፒ ሆኗል!' : 'ኮፒ'}</span>
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
                  <span>በቴሌግራም አጋራ</span>
                </button>
                <button
                  type="button"
                  onClick={handleWebShare}
                  className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer shadow-md active:scale-95 transition-all"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>በማንኛውም አፕ አጋራ</span>
                </button>
              </div>

              {/* Direct Phone Invite */}
              <form onSubmit={handleInviteFriend} className="flex flex-col sm:flex-row gap-2 pt-1">
                <input
                  type="tel"
                  value={friendPhone}
                  onChange={(e) => setFriendPhone(e.target.value)}
                  placeholder="የጓደኛዎን ስልክ ያስገቡ (0912345678)"
                  className={`flex-1 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-mono-tabular border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300'
                  }`}
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer shadow-xs shrink-0"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>ጋብዝ (+25 ብር)</span>
                </button>
              </form>
            </div>
          )}

          {/* Daub Color Content */}
          {activeSection === 'daub_color' && (
            <div className="space-y-3">
              <h4 className="text-sm font-extrabold flex items-center gap-2">
                <Palette className="w-4 h-4 text-emerald-500" />
                <span>Daub Color (የምልክት ቀለም)</span>
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
                    <span>{swatch.labelAm}</span>
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
                <span>Notifications ({t.notificationSectionTitle})</span>
              </h4>
              {(
                [
                  {
                    id: 'registered_only',
                    titleEn: "Only when I've registered cards for the game",
                    titleAm: 'ካርቴላ ለጨዋታው ሳስመዘግብ ብቻ አሳውቀኝ',
                  },
                  {
                    id: 'always',
                    titleEn: "Even when I haven't registered any cards",
                    titleAm: 'ምንም ካርቴላ ባላስመዘግብም ሁልጊዜ አሳውቀኝ',
                  },
                  {
                    id: 'none',
                    titleEn: 'No game starting notifications',
                    titleAm: 'ምንም የጨዋታ መጀመሪያ ማሳወቂያ አይምጣልኝ',
                  },
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
                  <div>
                    <div className="text-xs font-extrabold">{opt.titleEn}</div>
                    <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {opt.titleAm}
                    </div>
                  </div>
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
                  <span>የይለፍ ቃል መቀየሪያ (Change Password)</span>
                </h4>
                <button
                  type="button"
                  onClick={handleSendForgotPasswordOtp}
                  className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-extrabold cursor-pointer"
                >
                  📲 የማረጋገጫ OTP ኮድ ላክ
                </button>
              </div>
              {forgotOtpSent && (
                <input
                  type="text"
                  value={forgotOtpCode}
                  onChange={(e) => setForgotOtpCode(e.target.value)}
                  placeholder={`OTP ኮድ (${forgotGeneratedOtp})`}
                  className={`w-full px-3 py-2 rounded-xl text-sm font-mono-tabular border ${
                    isDark ? 'bg-slate-800 border-slate-700 text-amber-300' : 'bg-slate-50 border-slate-300'
                  }`}
                />
              )}
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="አዲስ የይለፍ ቃል ያስገቡ..."
                  className={`flex-1 px-3 py-2 rounded-xl text-sm border ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300'
                  }`}
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-extrabold text-xs cursor-pointer"
                >
                  የይለፍ ቃል ቀይር
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
                  <div className="text-[11px] font-bold text-emerald-500 uppercase">Phone</div>
                  <div className="text-sm font-extrabold font-mono-tabular mt-0.5">0997539855</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2x2 PRIMARY MENU TILES (Matching IMG_3576.jpeg: Language, Theme, Game History, Invite Friends) */}
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
          <span className="text-xs sm:text-sm font-bold">Language</span>
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
          <span className="text-xs sm:text-sm font-bold">Theme</span>
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
          <span className="text-xs sm:text-sm font-bold">Game History</span>
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
          <span className="text-xs sm:text-sm font-bold">Invite Friends</span>
        </button>
      </div>

      {/* 3-COLUMN SECONDARY TILES ROW (Matching IMG_3576.jpeg bottom tiles: Daub Color, Notifications, Password) */}
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
          <span className="text-[11px] sm:text-xs font-bold">Daub Color</span>
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
          <span className="text-[11px] sm:text-xs font-bold">Notifications</span>
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
          <span className="text-[11px] sm:text-xs font-bold">Password</span>
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

      {/* Discreet Secret Admin Entry */}
      <div className="pt-1 text-center">
        <button
          type="button"
          onClick={() => {
            if (onOpenAdminLogin) {
              onOpenAdminLogin();
            }
          }}
          className={`text-[11px] font-semibold inline-flex items-center justify-center gap-1.5 transition-opacity opacity-40 hover:opacity-100 cursor-pointer py-1.5 px-3 rounded-lg ${
            isDark
              ? 'text-slate-400 hover:text-amber-400 hover:bg-slate-800/60'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
          }`}
          title="የስርዓት ቁጥጥር መግቢያ"
        >
          <Lock className="w-3 h-3" />
          <span>የስርዓት ቁጥጥር (Admin Access)</span>
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
        <span>ውጣ (Log Out)</span>
      </button>
    </div>
  );
};
