import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FastBingoStandaloneApp } from './components/FastBingoStandaloneApp';
import { RegularBingoStandaloneApp } from './components/RegularBingoStandaloneApp';
import { AdminLoginModal } from './components/AdminLoginModal';
import { AdminPanelView } from './components/AdminPanelView';
import { PlayerAuthScreen, AuthenticatedPlayerPayload } from './components/PlayerAuthScreen';
import {
  getOrCreateDevicePlayerIdentity,
  saveDevicePlayerIdentity,
  buildApiUrl,
  dispatchServerRoomAction,
  hasDeviceRegisteredPhone,
} from './utils/realtimeRoomClient';
import {
  Language,
  TransactionRecord,
  UserAccount,
  BankPaymentAccount,
  HeroBannerAd,
  CallSpeed,
} from './types/bingo';
import { PAYMENT_ACCOUNTS } from './utils/translations';
import {
  Zap,
  Gamepad2,
  Sliders,
  Sun,
  Moon,
  Lock,
  LogOut,
  Globe,
  ChevronDown,
  Shield,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';

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

  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const langDropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(e.target as Node)) {
        setIsLangDropdownOpen(false);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleUpdateLanguage = (lang: Language) => {
    setLanguage(lang);
    setIsLangDropdownOpen(false);
    try {
      localStorage.setItem('ezi_selected_language', lang);
      localStorage.setItem('ezi_fast_language', lang);
      localStorage.setItem('ezi_regular_language', lang);
    } catch {}
  };

  // 1. Unified Authentication State (Fast Bingo and Regular Bingo share the exact same login/logout)
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const reg = localStorage.getItem('ezi_phone_registered_v2');
      if (reg === 'true') return true;
      if (reg === 'false') return false;
      return hasDeviceRegisteredPhone();
    }
    return false;
  });

  // 2. Dedicated Admin Authentication & View Mode Separation
  // Defaults strictly to false so regular players never see admin controls!
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ezi_admin_authenticated_v2');
      return saved === 'true';
    }
    return false;
  });

  const [viewMode, setViewMode] = useState<'game' | 'admin'>('game');
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('ezi_admin_authenticated_v2', String(isAdminAuthenticated));
    } catch {}
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
    } catch {}
  };

  // 3. Persistent Bank Accounts (Fetched from server /api/bank-accounts, saved to disk, and kept in sync)
  const [bankAccounts, setBankAccounts] = useState<BankPaymentAccount[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('ezi_bank_accounts_v2');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return PAYMENT_ACCOUNTS;
  });

  useEffect(() => {
    fetch(buildApiUrl('/api/bank-accounts'))
      .then((r) => r.json())
      .then((data) => {
        if (data?.ok && Array.isArray(data.bankAccounts) && data.bankAccounts.length > 0) {
          setBankAccounts(data.bankAccounts);
          try {
            localStorage.setItem('ezi_bank_accounts_v2', JSON.stringify(data.bankAccounts));
          } catch {}
        }
      })
      .catch(() => {});
  }, []);

  const handleSaveBankAccounts = useCallback((nextList: BankPaymentAccount[]) => {
    setBankAccounts(nextList);
    try {
      localStorage.setItem('ezi_bank_accounts_v2', JSON.stringify(nextList));
    } catch {}
    fetch(buildApiUrl('/api/bank-accounts'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bankAccounts: nextList }),
    }).catch(() => {});

    dispatchServerRoomAction({
      mode: 'fast',
      action: 'set_bank_accounts',
      bankAccounts: nextList,
    } as unknown as Parameters<typeof dispatchServerRoomAction>[0]);
    dispatchServerRoomAction({
      mode: 'regular',
      action: 'set_bank_accounts',
      bankAccounts: nextList,
    } as unknown as Parameters<typeof dispatchServerRoomAction>[0]);
  }, []);

  const handleAddBankAccount = useCallback(
    (bank: BankPaymentAccount) => {
      setBankAccounts((prev) => {
        const uniqueId = prev.some((b) => b.id === bank.id)
          ? `${bank.id}_${Date.now().toString().slice(-4)}`
          : bank.id;
        const next = [...prev, { ...bank, id: uniqueId }];
        handleSaveBankAccounts(next);
        return next;
      });
    },
    [handleSaveBankAccounts]
  );

  const handleUpdateBankAccount = useCallback(
    (bank: BankPaymentAccount) => {
      setBankAccounts((prev) => {
        const next = prev.map((b) => (b.id === bank.id ? bank : b));
        handleSaveBankAccounts(next);
        return next;
      });
    },
    [handleSaveBankAccounts]
  );

  const handleRemoveBankAccount = useCallback(
    (id: string) => {
      setBankAccounts((prev) => {
        const next = prev.filter((b) => b.id !== id);
        handleSaveBankAccounts(next);
        return next;
      });
    },
    [handleSaveBankAccounts]
  );

  // Dedicated Secret Admin Route: /admin0923 or #admin0923 (as requested: Sunbingo.onrender.com/admin0923)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const checkAdminRouteAndHash = () => {
      const path = window.location.pathname.toLowerCase();
      const h = window.location.hash.toLowerCase();
      const p = new URLSearchParams(window.location.search);

      // Save referral code if user clicked an invite link
      const refCode = p.get('ref') || p.get('invite');
      if (refCode) {
        try {
          localStorage.setItem('sun_referral_code', refCode);
        } catch {}
      }

      // Check strictly for dedicated secret admin path or hash: /admin0923 or #admin0923
      const isSecretAdminRoute =
        path.includes('/admin0923') ||
        path.endsWith('admin0923') ||
        h.includes('admin0923');

      if (isSecretAdminRoute) {
        const saved = localStorage.getItem('ezi_admin_authenticated_v2');
        if (saved === 'true') {
          setIsAdminAuthenticated(true);
          setViewMode('admin');
        } else {
          setIsAdminModalOpen(true);
        }
      }
    };
    checkAdminRouteAndHash();
    window.addEventListener('hashchange', checkAdminRouteAndHash);
    window.addEventListener('popstate', checkAdminRouteAndHash);
    return () => {
      window.removeEventListener('hashchange', checkAdminRouteAndHash);
      window.removeEventListener('popstate', checkAdminRouteAndHash);
    };
  }, []);

  // Shared Birr Wallet and Users
  const [sharedUsers, setSharedUsers] = useState<UserAccount[]>(() => {
    const devIdentity = getOrCreateDevicePlayerIdentity();
    return [
      {
        id: devIdentity.id,
        name: devIdentity.name || 'Sun Player',
        phone: devIdentity.phone || '0942742684',
        passwordHash: '****',
        balance: 500.0,
        bonusBalance: 15.0,
        referralCode: devIdentity.referralCode,
        referredCount: 0,
        referralEarnings: 0,
        isBlocked: false,
        isAdmin: false,
        joinedAt: new Date().toISOString().slice(0, 10),
      },
    ];
  });

  const [sharedTransactions, setSharedTransactions] = useState<TransactionRecord[]>([]);

  // Unified Logout Function
  const handleLogout = () => {
    try {
      localStorage.setItem('ezi_phone_registered_v2', 'false');
      localStorage.removeItem('ezi_player_auth_session');
    } catch {}
    setIsLoggedIn(false);
    setViewMode('game');
  };

  // Unified Auth Success Function
  const handleAuthSuccess = (
    player: AuthenticatedPlayerPayload,
    allPlayers?: AuthenticatedPlayerPayload[]
  ) => {
    try {
      localStorage.setItem('ezi_phone_registered_v2', 'true');
    } catch {}
    saveDevicePlayerIdentity(player.name, player.phone);
    setIsLoggedIn(true);

    setSharedUsers((prev) => {
      const me = prev[0];
      const updatedMe: UserAccount = {
        ...(me || {
          id: player.id || `u-${player.phone}`,
          referralCode: `SUN${player.phone.slice(-4)}`,
          referredCount: 0,
          referralEarnings: 0,
          isBlocked: false,
          isAdmin: false,
          joinedAt: new Date().toISOString().slice(0, 10),
        }),
        name: player.name,
        phone: player.phone,
        passwordHash: player.passwordHash || me?.passwordHash || '****',
        balance: typeof player.balance === 'number' ? player.balance : me?.balance ?? 500,
        bonusBalance:
          typeof player.bonusBalance === 'number' ? player.bonusBalance : me?.bonusBalance ?? 15,
      };

      if (allPlayers && Array.isArray(allPlayers) && allPlayers.length > 0) {
        const others = allPlayers
          .filter((p) => p.phone !== player.phone)
          .map((p, idx) => ({
            id: p.id || `u-${p.phone || idx}`,
            name: p.name || `User_${idx}`,
            phone: p.phone || `091100000${idx}`,
            passwordHash: '****',
            balance: typeof p.balance === 'number' ? p.balance : 0,
            bonusBalance: typeof p.bonusBalance === 'number' ? p.bonusBalance : 0,
            referralCode: `SUN${(p.phone || '0000').slice(-4)}`,
            referredCount: 0,
            referralEarnings: 0,
            isBlocked: !!p.isBlocked,
            isAdmin: false,
            joinedAt: new Date().toISOString().slice(0, 10),
          }));
        return [updatedMe, ...others];
      }
      return prev.map((u, i) => (i === 0 ? updatedMe : u));
    });
  };

  // Admin Panel states
  const [adminCallSpeed, setAdminCallSpeed] = useState<CallSpeed>(3);
  const [adminIsPlaying, setAdminIsPlaying] = useState<boolean>(false);
  const [adminIsPaused, setAdminIsPaused] = useState<boolean>(false);

  const languagesList: { code: Language; label: string; flag: string }[] = [
    { code: 'am', label: 'አማርኛ', flag: '🇪🇹' },
    { code: 'ti', label: 'ትግርኛ', flag: '🇪🇹' },
    { code: 'om', label: 'Afaan Oromoo', flag: '🇪🇹' },
    { code: 'en', label: 'English', flag: '🇬🇧' },
  ];

  return (
    <div
      className={`min-h-screen font-sans flex flex-col transition-colors ${
        isDark
          ? 'bg-[#050B16] text-slate-100 selection:bg-amber-500 selection:text-slate-950'
          : 'bg-slate-100 text-slate-900 selection:bg-blue-500 selection:text-white'
      }`}
    >
      {/* =========================================================================
          TOP NAVIGATION BAR
          Rules per user request:
          1. When LOGGED OUT (!isLoggedIn):
             Hide ALL game switchers (Fast/Regular), settings, cartelas.
             Keep ONLY Logo + Language Selector + Light/Dark Theme toggle.
          2. When LOGGED IN (isLoggedIn) in Game Mode:
             Show Game Switcher (Fast/Regular), Theme, Language, Settings, Logout.
          3. When in ADMIN MODE (viewMode === 'admin'):
             Show "Back to Game" (ወደ ጨዋታው ተመለስ), Admin Logout, Language, Theme.
         ========================================================================= */}
      <nav
        className={`px-3 sm:px-5 py-2 flex items-center justify-between z-40 backdrop-blur-md sticky top-0 border-b transition-colors shadow-sm ${
          isDark
            ? 'bg-slate-950/95 border-slate-800/80 text-slate-100'
            : 'bg-white/95 border-slate-200 text-slate-900'
        }`}
      >
        {/* Left: App Logo & Admin Portal Indicator */}
        <div className="flex items-center gap-2 shrink-0">
          <div
            className={`font-black text-sm sm:text-base tracking-tight flex items-center gap-1.5 transition-colors select-none ${
              isDark ? 'text-amber-400' : 'text-slate-900'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            <span>Sun Bingo</span>
          </div>

          {viewMode === 'admin' ? (
            <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-400 text-[11px] font-black flex items-center gap-1">
              <Shield className="w-3 h-3" />
              <span>{language === 'am' ? 'አድሚን ፖርታል' : 'Admin Portal'}</span>
            </span>
          ) : isLoggedIn ? (
            <span
              className={`text-xs hidden sm:inline ${
                isDark ? 'text-slate-600' : 'text-slate-300'
              }`}
            >
              |
            </span>
          ) : null}
        </div>

        {/* Center / Right Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* A. If ADMIN MODE: Prominent "Back to Game" Button */}
          {viewMode === 'admin' && (
            <button
              type="button"
              onClick={() => setViewMode('game')}
              className="px-3 py-1 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 hover:from-emerald-400 hover:to-teal-400 flex items-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-95"
            >
              <Gamepad2 className="w-3.5 h-3.5 fill-slate-950" />
              <span>ወደ ጨዋታው ተመለስ</span>
            </button>
          )}

          {/* B. If LOGGED IN and in Game Mode: Show Fast Bingo / Regular Bingo switcher */}
          {isLoggedIn && viewMode === 'game' && (
            <div
              className={`flex items-center p-0.5 rounded-xl border transition-colors shadow-inner ${
                isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-200/80 border-slate-300'
              }`}
            >
              <button
                type="button"
                onClick={() => handleSwitchMode('fast')}
                className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-[11px] sm:text-xs font-black flex items-center gap-1 transition-all cursor-pointer ${
                  gameMode === 'fast'
                    ? isDark
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/20'
                      : 'bg-amber-500 text-slate-950 shadow-xs'
                    : isDark
                    ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-300/50'
                }`}
              >
                <Zap
                  className={`w-3 h-3 ${
                    gameMode === 'fast'
                      ? 'fill-slate-950 text-slate-950'
                      : isDark
                      ? 'text-amber-400'
                      : 'text-amber-600'
                  }`}
                />
                <span>Fast Bingo</span>
              </button>

              <button
                type="button"
                onClick={() => handleSwitchMode('regular')}
                className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-[11px] sm:text-xs font-black flex items-center gap-1 transition-all cursor-pointer ${
                  gameMode === 'regular'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20'
                    : isDark
                    ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-300/50'
                }`}
              >
                <Gamepad2 className="w-3 h-3" />
                <span>Regular Bingo</span>
              </button>
            </div>
          )}

          {/* C. ALWAYS VISIBLE: Language Selector (ቋንቋ እንዳይጠፋ) */}
          <div className="relative" ref={langDropdownRef}>
            <button
              type="button"
              onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
              className={`px-2 py-1 rounded-xl text-xs font-black flex items-center gap-1 border transition-all cursor-pointer shadow-xs active:scale-95 ${
                isDark
                  ? 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200'
                  : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-800'
              }`}
              title="ቋንቋ ምረጥ (Select Language)"
            >
              <Globe className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="text-[11px] font-extrabold uppercase">{language}</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {isLangDropdownOpen && (
              <div
                className={`absolute right-0 mt-1.5 w-36 rounded-2xl border shadow-xl py-1 z-50 overflow-hidden ${
                  isDark
                    ? 'bg-slate-900 border-slate-700 text-slate-100'
                    : 'bg-white border-slate-200 text-slate-900'
                }`}
              >
                {languagesList.map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => handleUpdateLanguage(l.code)}
                    className={`w-full px-3 py-1.5 text-xs font-bold text-left flex items-center justify-between cursor-pointer transition-colors ${
                      language === l.code
                        ? 'bg-amber-500/20 text-amber-400 font-black'
                        : isDark
                        ? 'hover:bg-slate-800 text-slate-300'
                        : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <span>{l.label}</span>
                    <span className="text-[10px]">{l.flag}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* D. ALWAYS VISIBLE: Light / Dark Mode Toggle (ብርሃን እና ጨለማ እንዳይጠፉ) */}
          <button
            type="button"
            onClick={handleToggleTheme}
            className={`p-1.5 sm:px-2 sm:py-1 rounded-xl text-xs font-black flex items-center gap-1 border transition-all cursor-pointer shadow-xs active:scale-95 ${
              isDark
                ? 'bg-slate-900 hover:bg-slate-800 border-slate-700 hover:border-amber-400 text-amber-400'
                : 'bg-white hover:bg-slate-100 border-slate-300 hover:border-slate-400 text-slate-700'
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

          {/* E. Settings Button (Only when Logged In) */}
          {isLoggedIn && viewMode === 'game' && (
            <button
              type="button"
              onClick={() => setOpenSettingsTrigger((prev) => prev + 1)}
              className={`p-1.5 sm:px-2.5 sm:py-1 rounded-xl text-xs font-black flex items-center gap-1 border transition-all cursor-pointer shadow-xs active:scale-95 ${
                isDark
                  ? 'bg-slate-900 hover:bg-slate-800 border-slate-700 hover:border-amber-400 text-amber-400'
                  : 'bg-white hover:bg-slate-100 border-slate-300 hover:border-slate-400 text-slate-700'
              }`}
              title="ቅንብር (Settings)"
            >
              <Sliders className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">ቅንብር</span>
            </button>
          )}



          {/* G. Admin Mode Exit / Logout */}
          {viewMode === 'admin' && (
            <button
              type="button"
              onClick={() => {
                setIsAdminAuthenticated(false);
                setViewMode('game');
                try {
                  localStorage.setItem('ezi_admin_authenticated_v2', 'false');
                } catch {}
              }}
              className="px-2.5 py-1 rounded-xl text-xs font-black bg-rose-500/20 border border-rose-500/40 text-rose-400 hover:bg-rose-500 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
              title="ከአድሚን ውጣ (Logout Admin)"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">አድሚን ውጣ</span>
            </button>
          )}
        </div>
      </nav>

      {/* =========================================================================
          MAIN BODY CONTAINER
         ========================================================================= */}
      <div className="flex-1 flex flex-col relative z-10">
        {/* 1. LOGGED-OUT STATE: ONLY Auth Card (Login, Register with OTP, Forgot Password with OTP) */}
        {!isLoggedIn && viewMode !== 'admin' ? (
          <div className="flex-1 flex flex-col items-center justify-center p-3 sm:p-6 my-auto">
            <PlayerAuthScreen
              inlineMode={true}
              isDark={isDark}
              appTitle="Sun Bingo"
              language={language}
              onChangeLanguage={handleUpdateLanguage}
              onAuthSuccess={handleAuthSuccess}
            />
          </div>
        ) : viewMode === 'admin' ? (
          /* 2. DEDICATED ADMIN PORTAL VIEW (Strictly separated from normal player game) */
          <div className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-orange-500/10 to-amber-500/20 border border-amber-500/40">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black">
                  👑
                </div>
                <div>
                  <h1 className="text-sm sm:text-base font-black text-amber-400">
                    Sun Bingo — ዋና የአድሚን ማዕከል (Admin Control Center)
                  </h1>
                  <p className="text-xs text-slate-400">
                    ባንኮች፣ ተጠቃሚዎች፣ የገንዘብ እንቅስቃሴ እና የጨዋታ ቁጥጥር በዚህ ማዕከል ይተዳደራሉ።
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setViewMode('game')}
                className="px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 hover:from-emerald-400 hover:to-teal-400 flex items-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-95"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>ወደ ጨዋታው ተመለስ (Back to Game)</span>
              </button>
            </div>

            <AdminPanelView
              isAdminAuthenticated={isAdminAuthenticated}
              isFastMode={gameMode === 'fast'}
              stakeAmount={10}
              prizeAmount={80}
              blockedCartelaIds={[]}
              totalCartelasCount={100}
              registeredCartelasCount={15}
              isPlaying={adminIsPlaying}
              isPaused={adminIsPaused}
              callSpeedSec={adminCallSpeed}
              onChangeSpeed={(sec) => setAdminCallSpeed(sec)}
              onTogglePause={() => setAdminIsPaused(!adminIsPaused)}
              onDrawNextManual={() => {}}
              onResetGame={() => {}}
              bankAccounts={bankAccounts}
              onAddBankAccount={handleAddBankAccount}
              onUpdateBankAccount={handleUpdateBankAccount}
              onRemoveBankAccount={handleRemoveBankAccount}
              users={sharedUsers}
              transactions={sharedTransactions}
              isDark={isDark}
              onAdjustUserBalance={(uid, delta) => {
                setSharedUsers((prev) =>
                  prev.map((u) =>
                    u.id === uid ? { ...u, balance: Math.max(0, u.balance + delta) } : u
                  )
                );
              }}
              onToggleUserBlock={(uid) => {
                setSharedUsers((prev) =>
                  prev.map((u) => (u.id === uid ? { ...u, isBlocked: !u.isBlocked } : u))
                );
              }}
              onApproveRejectTransaction={(txId, status) => {
                setSharedTransactions((prev) =>
                  prev.map((tx) => (tx.id === txId ? { ...tx, status } : tx))
                );
              }}
              onStartRegistrationCountdown={() => {}}
              onBlockCartelaId={() => {}}
              onUnblockCartelaId={() => {}}
            />
          </div>
        ) : (
          /* 3. LOGGED-IN GAMEPLAY VIEW (Fast Bingo or Regular Bingo) */
          gameMode === 'fast' ? (
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
              onLogout={handleLogout}
              onOpenAdminPortal={() => {
                if (isAdminAuthenticated) {
                  setViewMode('admin');
                } else {
                  setIsAdminModalOpen(true);
                }
              }}
              bankAccounts={bankAccounts}
              onAddBankAccount={handleAddBankAccount}
              onUpdateBankAccount={handleUpdateBankAccount}
              onRemoveBankAccount={handleRemoveBankAccount}
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
              onLogout={handleLogout}
              onOpenAdminPortal={() => {
                if (isAdminAuthenticated) {
                  setViewMode('admin');
                } else {
                  setIsAdminModalOpen(true);
                }
              }}
              bankAccounts={bankAccounts}
              onAddBankAccount={handleAddBankAccount}
              onUpdateBankAccount={handleUpdateBankAccount}
              onRemoveBankAccount={handleRemoveBankAccount}
            />
          )
        )}
      </div>

      {/* Secret Admin Login Modal (Unlocked via PIN 1234 or 7788) */}
      <AdminLoginModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        isDark={isDark}
        isAdminAuthenticated={isAdminAuthenticated}
        onSuccess={() => {
          setIsAdminAuthenticated(true);
          setViewMode('admin');
          try {
            localStorage.setItem('ezi_admin_authenticated_v2', 'true');
          } catch {}
          window.location.hash = '#admin0923';
        }}
        onLogout={() => {
          setIsAdminAuthenticated(false);
          setViewMode('game');
          try {
            localStorage.setItem('ezi_admin_authenticated_v2', 'false');
          } catch {}
          window.location.hash = '';
        }}
      />
    </div>
  );
}
