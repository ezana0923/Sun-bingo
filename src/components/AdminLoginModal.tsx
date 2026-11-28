import React, { useState } from 'react';
import { Lock, ShieldCheck, X, Eye, EyeOff, KeyRound } from 'lucide-react';
import { buildApiUrl } from '../utils/realtimeRoomClient';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  isDark: boolean;
  isAdminAuthenticated: boolean;
  onLogout: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  isDark,
  isAdminAuthenticated,
  onLogout,
}) => {
  const [pinOrPass, setPinOrPass] = useState('');
  const [username, setUsername] = useState('');
  const [usePinMode, setUsePinMode] = useState(true);
  const [showPass, setShowPass] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const cleanInput = pinOrPass.trim();
    if (!cleanInput) {
      setErrorMsg('እባክዎ የአድሚን PIN ወይም የይለፍ ቃል ያስገቡ!');
      return;
    }
    if (!usePinMode && !username.trim()) {
      setErrorMsg('እባክዎ መለያ ስም ያስገቡ!');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(buildApiUrl('/api/admin/verify-pin'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: usePinMode ? 'pin' : 'password',
          username: usePinMode ? undefined : username.trim(),
          pin: cleanInput,
          password: cleanInput,
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) {
        onSuccess();
        setPinOrPass('');
        setUsername('');
        setShowPass(false);
        onClose();
      } else {
        setErrorMsg(data?.error || 'የተሳሳተ የአድሚን መለያ፣ PIN ወይም የይለፍ ቃል!');
      }
    } catch {
      setErrorMsg('ከሰርቨር ጋር መገናኘት አልተቻለም። እባክዎ ቆይተው ይሞክሩ።');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[260000] flex items-center justify-center p-3 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`w-full max-w-sm rounded-3xl border shadow-2xl p-5 sm:p-6 relative space-y-4 ${
          isDark
            ? 'bg-slate-900 border-slate-700/80 text-white shadow-amber-500/10'
            : 'bg-white border-slate-200 text-slate-900 shadow-slate-400/20'
        }`}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className={`absolute top-4 right-4 p-1.5 rounded-full transition-colors cursor-pointer ${
            isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
          }`}
          title="ዝጋ"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-2 pt-1">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 flex items-center justify-center mx-auto shadow-md">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black tracking-tight">
              የስርዓት አድሚን መግቢያ
            </h3>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              የ Sun Bingo ቁጥጥር ዳሽቦርድ መዳረሻ
            </p>
          </div>
        </div>

        {isAdminAuthenticated ? (
          <div className="space-y-4 text-center py-2">
            <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center justify-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              <span>በአሁኑ ሰዓት እንደ አድሚን ገብተዋል!</span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  onSuccess();
                  onClose();
                }}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs cursor-pointer shadow-xs"
              >
                ወደ አድሚን ፓነል ሂድ ➔
              </button>
              <button
                type="button"
                onClick={() => {
                  onLogout();
                  onClose();
                }}
                className="py-2.5 px-4 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/40 font-bold text-xs cursor-pointer"
              >
                ቆልፈህ ውጣ
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5" autoComplete="off">
            {/* Mode switch: PIN vs Username/Password */}
            <div className="flex p-0.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs">
              <button
                type="button"
                onClick={() => {
                  setUsePinMode(true);
                  setErrorMsg(null);
                }}
                className={`flex-1 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  usePinMode
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                ፈጣን PIN
              </button>
              <button
                type="button"
                onClick={() => {
                  setUsePinMode(false);
                  setErrorMsg(null);
                }}
                className={`flex-1 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  !usePinMode
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Username & Password
              </button>
            </div>

            {!usePinMode && (
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">
                  መለያ ስም፦
                </label>
                <input
                  type="text"
                  autoComplete="off"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="መለያ ስም ያስገቡ"
                  className={`w-full px-3 py-2 rounded-xl text-xs font-semibold border focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300'
                  }`}
                />
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">
                {usePinMode ? 'የአድሚን ሚስጥር PIN፦' : 'የይለፍ ቃል፦'}
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  autoComplete="new-password"
                  inputMode={usePinMode ? 'numeric' : 'text'}
                  required
                  value={pinOrPass}
                  onChange={(e) => setPinOrPass(e.target.value)}
                  placeholder={usePinMode ? '••••' : '••••••••'}
                  className={`w-full px-3.5 py-2.5 pr-10 rounded-xl text-sm font-mono-tabular border focus:outline-none focus:ring-2 focus:ring-amber-500 tracking-wider ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                  title={showPass ? 'ደብቅ' : 'አሳይ'}
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-bold">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-97 disabled:opacity-60"
            >
              <KeyRound className="w-4 h-4" />
              <span>{isSubmitting ? 'በማረጋገጥ ላይ...' : 'አረጋግጥ እና ግባ'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
