import React, { useState, useEffect, useRef } from 'react';
import { FastBingoStandaloneApp } from './components/FastBingoStandaloneApp';
import { RegularBingoStandaloneApp } from './components/RegularBingoStandaloneApp';
import { AdminLoginModal } from './components/AdminLoginModal';
import { getOrCreateDevicePlayerIdentity } from './utils/realtimeRoomClient';
import { Language, TransactionRecord, UserAccount } from './types/bingo';
import { Zap, Gamepad2, Sliders, Sun, Moon, Lock } from 'lucide-react';

export default function App() {
  const [openSettingsTrigger, setOpenSettingsTrigger] = useState<number>(0);
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ezi_pref_dark');
      if (saved !== null) return saved === 'true';
    }
    return true;
  });

  const handleToggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('ezi_pref_dark', String(next));
      } catch {}
      return next;
    });
  };
  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const saved =
        localStorage.getItem('ezi_selected_language') ||
        localStorage.getItem('ezi_fast_language') ||
        localStorage.getItem('ezi_regular_language');
      if (saved === 'am' || saved === 'ti' || saved === 'om' || saved === 'en') return saved;
    }
    return 'am';
  });

  const handleUpdateLanguage = (lang: Language) => {
    setLanguage(lang);
    try {
      localStorage.setItem('ezi_selected_language', lang);
      localStorage.setItem('ezi_fast_language', lang);
      localStorage.setItem('ezi_regular_language', lang);
    } catch {}
  };

  // Admin authentication state: defaults to saved state or true
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ezi_admin_authenticated_v2');
      if (saved === 'false') return false;
      return true; // Default to true so admin has full initial access
    }
    return true;
  });

  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const logoClicksRef = useRef<number>(0);
  const logoClickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleLogoSecretTap = () => {
    logoClicksRef.current += 1;
    if (logoClickTimerRef.current) {
      clearTimeout(logoClickTimerRef.current);
    }
    if (logoClicksRef.current >= 3) {
      logoClicksRef.current = 0;
      setIsAdminModalOpen(true);
      return;
    }
    logoClickTimerRef.current = setTimeout(() => {
      logoClicksRef.current = 0;
    }, 1500);
  };

  useEffect(() => {
    try {
      localStorage.setItem('ezi_admin_authenticated_v2', String(isAdminAuthenticated));
    } catch {
      // ignore
    }
  }, [isAdminAuthenticated]);

  // Active game mode: defaults to 'fast' (Fast Bingo)
  const [gameMode, setGameMode] = useState<'fast' | 'regular'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const mode = params.get('mode') || params.get('app');
      if (mode === 'regular') return 'regular';
      if (mode === 'fast') return 'fast';

      const saved = localStorage.getItem('ezi_bingo_active_mode');
      if (saved === 'regular' || saved === 'fast') return saved;
    }
    return 'fast';
  });

  const handleSwitchMode = (mode: 'fast' | 'regular') => {
    setOpenSettingsTrigger(0);
    setGameMode(mode);
    try {
      localStorage.setItem('ezi_bingo_active_mode', mode);
      const url = new URL(window.location.href);
      url.searchParams.set('mode', mode);
      window.history.replaceState({}, '', url.toString());
    } catch {
      // ignore
    }
  };

  // Listen for #admin, #regular-admin, #fast-admin, or ?ref=, ?tab=admin hash changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const checkHash = () => {
      const h = window.location.hash.toLowerCase();
      const p = new URLSearchParams(window.location.search);

      // Save referral code if user clicked an invite link
      const refCode = p.get('ref') || p.get('invite');
      if (refCode) {
        try {
          localStorage.setItem('sun_referral_code', refCode);
        } catch {}
      }

      if (
        h.includes('admin') ||
        p.get('tab') === 'admin' ||
        p.get('admin') === 'true' ||
        p.get('admin') === '1'
      ) {
        setIsAdminAuthenticated(true);
        try {
          localStorage.setItem('ezi_admin_authenticated_v2', 'true');
        } catch {}
      }
      if (p.get('admin') === 'login') {
        setIsAdminModalOpen(true);
      }
      if (h === '#regular-admin' || h === '#regular') {
        setGameMode('regular');
      } else if (h === '#fast-admin' || h === '#fast') {
        setGameMode('fast');
      }
    };
    checkHash();
    window.addEventListener('hashchange', checkHash);
    return () => window.removeEventListener('hashchange', checkHash);
  }, []);

  // Shared Birr Wallet and Users with Admin privileges
  const [sharedUsers, setSharedUsers] = useState<UserAccount[]>(() => {
    const devIdentity = getOrCreateDevicePlayerIdentity();
    return [
      {
        id: devIdentity.id,
        name: devIdentity.name || 'Ezana (Admin)',
        phone: devIdentity.phone || '0942742684',
        passwordHash: '****',
        balance: 500.0,
        bonusBalance: 15.0,
        referralCode: devIdentity.referralCode,
        referredCount: 0,
        referralEarnings: 0,
        isBlocked: false,
        isAdmin: true,
        joinedAt: new Date().toISOString().slice(0, 10),
      },
    ];
  });

  const [sharedTransactions, setSharedTransactions] = useState<TransactionRecord[]>([]);

  return (
    <div
      className={`min-h-screen font-sans flex flex-col transition-colors ${
        isDark
          ? 'bg-[#050B16] text-slate-100 selection:bg-amber-500 selection:text-slate-950'
          : 'bg-slate-100 text-slate-900 selection:bg-blue-500 selection:text-white'
      }`}
    >
      {/* Top Global Mode Navigation Bar */}
      <nav
        className={`px-2 sm:px-4 py-1.5 flex items-center justify-between z-40 backdrop-blur-md sticky top-0 border-b transition-colors shadow-sm ${
          isDark
            ? 'bg-slate-950/95 border-slate-800/80 text-slate-100'
            : 'bg-white/95 border-slate-200 text-slate-900'
        }`}
      >
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleLogoSecretTap}
            title="Sun Bingo — (3 ጊዜ ሲነኩት የአድሚን መግቢያ ይከፈታል)"
            className={`font-black text-xs sm:text-sm tracking-tight flex items-center gap-1 transition-colors cursor-pointer select-none active:scale-95 ${
              isDark ? 'text-amber-400 hover:text-amber-300' : 'text-slate-900 hover:text-slate-700'
            }`}
          >
            <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>Sun Bingo</span>
          </button>
          <span className={`text-xs hidden sm:inline ${isDark ? 'text-slate-600' : 'text-slate-300'}`}>|</span>
          <span className={`text-[11px] hidden sm:inline ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            ጨዋታ ምረጥ
          </span>
        </div>

        {/* Switcher Tabs, Theme Toggle & Admin Settings */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          {/* Compact Switcher Container (Fast Bingo / Regular Bingo አነስ እንዲሉ) */}
          <div
            className={`flex items-center p-0.5 rounded-xl border transition-colors shadow-inner ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-200/80 border-slate-300'
            }`}
          >
            <button
              type="button"
              onClick={() => handleSwitchMode('fast')}
              className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-[11px] sm:text-xs font-black flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer ${
                gameMode === 'fast'
                  ? isDark
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/20 scale-[1.02]'
                    : 'bg-amber-500 text-slate-950 shadow-xs font-black scale-[1.02]'
                  : isDark
                  ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-300/50'
              }`}
            >
              <Zap
                className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${
                  gameMode === 'fast'
                    ? 'fill-slate-950 text-slate-950'
                    : isDark
                    ? 'text-amber-400'
                    : 'text-amber-600'
                }`}
              />
              <span>Fast Bingo</span>
              <span
                className={`text-[9px] sm:text-[10px] px-1 py-0.2 rounded font-extrabold ${
                  gameMode === 'fast'
                    ? 'bg-black/20 text-slate-950'
                    : isDark
                    ? 'bg-amber-500/15 text-amber-400'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                ፈጣን
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleSwitchMode('regular')}
              className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-[11px] sm:text-xs font-black flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer ${
                gameMode === 'regular'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20 scale-[1.02]'
                  : isDark
                  ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-300/50'
              }`}
            >
              <Gamepad2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>Regular Bingo</span>
              <span
                className={`text-[9px] sm:text-[10px] px-1 py-0.2 rounded font-extrabold ${
                  gameMode === 'regular'
                    ? 'bg-black/20 text-white'
                    : isDark
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                መደበኛ
              </span>
            </button>
          </div>

          {/* Theme (ብርሃን / ጨለማ) Toggle Button - Right Next to Settings (ከ ቅንብር ጎን) */}
          <button
            type="button"
            onClick={handleToggleTheme}
            className={`p-1 sm:px-2 sm:py-1 rounded-xl text-xs font-black flex items-center gap-1 border transition-all cursor-pointer shadow-xs active:scale-95 ${
              isDark
                ? 'bg-slate-900 hover:bg-slate-800 border-slate-700 hover:border-amber-400 text-amber-400 hover:text-amber-300'
                : 'bg-white hover:bg-slate-100 border-slate-300 hover:border-slate-400 text-slate-700 hover:text-slate-900'
            }`}
            title={isDark ? 'ወደ ብርሃን ገጽታ ቀይር (Light Mode)' : 'ወደ ጨለማ ገጽታ ቀይር (Dark Mode)'}
            aria-label="Toggle Theme"
          >
            {isDark ? (
              <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-slate-700 shrink-0" />
            )}
            <span className="hidden md:inline">{isDark ? 'ብርሃን' : 'ጨለማ'}</span>
          </button>

          {/* Settings (ቅንብር) Button */}
          <button
            type="button"
            onClick={() => setOpenSettingsTrigger((prev) => prev + 1)}
            className={`px-2 sm:px-2.5 py-1 rounded-xl text-xs font-black flex items-center gap-1 border transition-all cursor-pointer shadow-xs active:scale-95 ${
              isDark
                ? 'bg-slate-900 hover:bg-slate-800 border-slate-700 hover:border-amber-400 text-amber-400 hover:text-amber-300'
                : 'bg-white hover:bg-slate-100 border-slate-300 hover:border-slate-400 text-slate-700 hover:text-slate-900'
            }`}
            title="ቅንብር (Settings)"
          >
            <Sliders className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">ቅንብር</span>
          </button>
        </div>
      </nav>

      {/* Main Game Container */}
      <div className="flex-1 flex flex-col relative z-10">
        {gameMode === 'fast' ? (
          <FastBingoStandaloneApp
            onSwitchToRegularApp={() => handleSwitchMode('regular')}
            language={language}
            onChangeLanguage={handleUpdateLanguage}
            sharedUsers={sharedUsers}
            onUpdateSharedUsers={setSharedUsers}
            sharedTransactions={sharedTransactions}
            onUpdateSharedTransactions={setSharedTransactions}
            isAdminAuthenticated={isAdminAuthenticated}
            onToggleAdminAuthenticated={setIsAdminAuthenticated}
            openSettingsTrigger={openSettingsTrigger}
            isDark={isDark}
            onToggleTheme={handleToggleTheme}
          />
        ) : (
          <RegularBingoStandaloneApp
            onSwitchToFastApp={() => handleSwitchMode('fast')}
            language={language}
            onChangeLanguage={handleUpdateLanguage}
            sharedUsers={sharedUsers}
            onUpdateSharedUsers={setSharedUsers}
            sharedTransactions={sharedTransactions}
            onUpdateSharedTransactions={setSharedTransactions}
            isAdminAuthenticated={isAdminAuthenticated}
            onToggleAdminAuthenticated={setIsAdminAuthenticated}
            openSettingsTrigger={openSettingsTrigger}
            isDark={isDark}
            onToggleTheme={handleToggleTheme}
          />
        )}
      </div>

      {/* Secret Admin Login Modal */}
      <AdminLoginModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        isDark={isDark}
        isAdminAuthenticated={isAdminAuthenticated}
        onSuccess={() => {
          setIsAdminAuthenticated(true);
          try {
            localStorage.setItem('ezi_admin_authenticated_v2', 'true');
          } catch {}
          window.location.hash = '#admin';
        }}
        onLogout={() => {
          setIsAdminAuthenticated(false);
          try {
            localStorage.setItem('ezi_admin_authenticated_v2', 'false');
          } catch {}
          window.location.hash = '';
        }}
      />
    </div>
  );
}
