import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Gamepad2,
  Wallet,
  User,
  Shield,
  Sliders,
  Sun,
  Moon,
  Plus,
  Columns2,
  Columns3,
  Trophy,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  BellRing,
  Bell,
  RotateCcw,
  History,
  Eye,
  Trash2,
  CheckSquare,
  Square,
  ArrowUpDown,
  Zap,
  BookOpen,
  X,
  Download,
  Share2,
  Play,
  Lock,
  LogOut,
  Ban,
  Unlock,
  ChevronUp,
  ChevronDown,
  Phone,
  Layers,
  Volume2,
  VolumeX,
  ArrowLeft,
} from 'lucide-react';
import { EziBingoLogo } from './EziBingoLogo';
import { FAST_BINGO_RULE_PATTERN } from '../data/bingoPatterns';
import {
  generateCartelaById,
  getCartelaSortMetrics,
  getLetterForBall,
  formatWinnerPhone,
  verifyCartelaBingo,
  getShapeBadge,
  countCompletedSquares,
  countCompletedRectangles,
  countCompletedCrosses,
  countCompletedTShapes,
  getMarkedMatrix,
} from '../utils/bingoEngine';
import { soundFX } from '../utils/soundAndVoice';
import { FAST_BINGO_TERMS_BY_LANG, PAYMENT_ACCOUNTS, TRANSLATIONS } from '../utils/translations';
import { connectTelegramBotEverywhere } from '../utils/telegramBotBridge';
import {
  AppAccentColor,
  BankPaymentAccount,
  CallSpeed,
  CartelaCard,
  DaubColor,
  GameHistoryRecord,
  HeroBannerAd,
  Language,
  NotificationPreference,
  TransactionRecord,
  UnregisteredWhenStartedMode,
  UserAccount,
  VerificationFailureInfo,
  WinnerAnnouncement,
} from '../types/bingo';
import { MasterBoard75 } from './MasterBoard75';
import { CartelaCardView } from './CartelaCardView';
import { CartelaSelectorModal } from './CartelaSelectorModal';
import { FastCartela500GridPicker, OtherPlayerLockedCartela } from './FastCartela500GridPicker';
import { WinnerCartelaInspectorModal } from './WinnerCartelaInspectorModal';
import { GameHistoryModal } from './GameHistoryModal';
import { WalletView } from './WalletView';
import { ProfileAndSettingsView } from './ProfileAndSettingsView';
import { LeaderboardView } from './LeaderboardView';
import { GameHistoryView } from './GameHistoryView';
import { OfflineIndicator } from './OfflineIndicator';
import { PWAInstallButton } from './PWAInstallButton';
import { PlayerAuthScreen } from './PlayerAuthScreen';
import { ProvablyFairModal } from './ProvablyFairModal';
import { AdminPanelView } from './AdminPanelView';
import { generateProvablyFairRound } from '../utils/provablyFair';
import {
  buildApiUrl,
  dispatchServerRoomAction,
  getDeviceClientId,
  getOrCreateDevicePlayerIdentity,
  hasDeviceRegisteredPhone,
  saveDevicePlayerIdentity,
  ServerLockedCartelaItem,
  ServerRoomStatePayload,
  subscribeRealtimeRoomSync,
} from '../utils/realtimeRoomClient';

type FastSortMode =
  | 'default'
  | 'by_fast_win'
  | 'by_lines'
  | 'by_corners'
  | 'by_called'
  | 'by_square'
  | 'by_rect'
  | 'by_cross'
  | 'by_t';

interface FastBingoStandaloneAppProps {
  onSwitchToRegularApp?: () => void;
  isStandaloneFastOnly?: boolean;
  language?: Language;
  onChangeLanguage?: (lang: Language) => void;
  sharedUsers?: UserAccount[];
  onUpdateSharedUsers?: React.Dispatch<React.SetStateAction<UserAccount[]>>;
  sharedTransactions?: TransactionRecord[];
  onUpdateSharedTransactions?: React.Dispatch<React.SetStateAction<TransactionRecord[]>>;
  isAdminAuthenticated?: boolean;
  onToggleAdminAuthenticated?: (val: boolean) => void;
  openSettingsTrigger?: number;
  isDark?: boolean;
  onToggleTheme?: () => void;
}

const BINGO_LETTERS = [
  { char: 'B', bg: 'bg-emerald-600 text-white' },
  { char: 'I', bg: 'bg-rose-600 text-white' },
  { char: 'N', bg: 'bg-sky-600 text-white' },
  { char: 'G', bg: 'bg-blue-600 text-white' },
  { char: 'O', bg: 'bg-amber-500 text-white' },
];

export const FastBingoStandaloneApp: React.FC<FastBingoStandaloneAppProps> = ({
  onSwitchToRegularApp,
  isStandaloneFastOnly = false,
  language: externalLanguage,
  onChangeLanguage: onExternalChangeLanguage,
  sharedUsers,
  onUpdateSharedUsers,
  sharedTransactions,
  onUpdateSharedTransactions,
  isAdminAuthenticated: externalIsAdminAuthenticated,
  onToggleAdminAuthenticated,
  openSettingsTrigger,
  isDark: externalIsDark,
  onToggleTheme: externalOnToggleTheme,
}) => {
  const [activeTab, setActiveTab] = useState<'game' | 'history' | 'leaderboard' | 'wallet' | 'profile' | 'admin'>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      const t = p.get('tab');
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      if (
        t === 'admin' ||
        p.get('admin') === '1' ||
        p.get('admin') === 'true' ||
        path === '/admin' ||
        path.endsWith('/admin') ||
        hash === '#admin' ||
        hash === '#/admin'
      ) {
        return 'admin';
      }
      if (t === 'deposit' || t === 'withdraw' || t === 'transfer') return 'wallet';
    }
    return 'game';
  });
  const [walletSubTab, setWalletSubTab] = useState<'deposit' | 'withdraw' | 'transfer' | 'history'>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      const t = p.get('tab');
      if (t === 'deposit' || t === 'withdraw' || t === 'transfer') return t;
    }
    return 'deposit';
  });
  const [isAdminAuthenticatedLocal, setIsAdminAuthenticatedLocal] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ezi_admin_authenticated_v2');
      if (saved === 'false') return false;
      return true; // Default to true for Admin access
    }
    return true;
  });

  const isAdminAuthenticated =
    externalIsAdminAuthenticated !== undefined
      ? externalIsAdminAuthenticated
      : isAdminAuthenticatedLocal;

  const setIsAdminAuthenticated = (val: boolean | ((prev: boolean) => boolean)) => {
    const nextVal = typeof val === 'function' ? val(isAdminAuthenticated) : val;
    setIsAdminAuthenticatedLocal(nextVal);
    if (onToggleAdminAuthenticated) {
      onToggleAdminAuthenticated(nextVal);
    }
    try {
      localStorage.setItem('ezi_admin_authenticated_v2', String(nextVal));
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('ezi_admin_authenticated_v2', String(isAdminAuthenticated));
    } catch {
      // ignore
    }
  }, [isAdminAuthenticated]);

  // Listen for URL #admin hash change or Ctrl+Shift+A shortcut to open Admin Panel
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleHashChange = () => {
      const h = window.location.hash.toLowerCase();
      const p = new URLSearchParams(window.location.search);
      if (
        h === '#admin' ||
        h === '#/admin' ||
        h === '#fast-admin' ||
        h.includes('admin') ||
        p.get('tab') === 'admin' ||
        p.get('admin') === '1' ||
        p.get('admin') === 'true'
      ) {
        setIsAdminAuthenticated(true);
        setActiveTab('admin');
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setIsAdminAuthenticated(true);
        setActiveTab('admin');
      }
    };
    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const lastSettingsTriggerRef = useRef(openSettingsTrigger || 0);
  useEffect(() => {
    if (
      openSettingsTrigger &&
      openSettingsTrigger > 0 &&
      openSettingsTrigger !== lastSettingsTriggerRef.current
    ) {
      lastSettingsTriggerRef.current = openSettingsTrigger;
      setIsSettingsModalOpen(true);
    }
  }, [openSettingsTrigger]);
  const [logoTapCount, setLogoTapCount] = useState<number>(0);

  const [localLanguage, setLocalLanguage] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const s = localStorage.getItem('ezi_pref_lang');
      if (s === 'am' || s === 'ti' || s === 'om' || s === 'en') return s;
    }
    return 'am';
  });
  const language = externalLanguage ?? localLanguage;
  const setLanguage = useCallback(
    (nextLang: Language) => {
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('ezi_pref_lang', nextLang);
        } catch {
          // ignore
        }
      }
      if (onExternalChangeLanguage) {
        onExternalChangeLanguage(nextLang);
      } else {
        setLocalLanguage(nextLang);
      }
    },
    [onExternalChangeLanguage]
  );
  const [internalIsDark, setInternalIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const s = localStorage.getItem('ezi_pref_dark');
      if (s !== null) return s === 'true';
    }
    return true;
  });
  const isDark = externalIsDark !== undefined ? externalIsDark : internalIsDark;
  const setIsDark = (val: boolean | ((prev: boolean) => boolean)) => {
    if (externalOnToggleTheme) {
      externalOnToggleTheme();
    } else {
      setInternalIsDark(val);
      try {
        const next = typeof val === 'function' ? val(isDark) : val;
        localStorage.setItem('ezi_pref_dark', String(next));
      } catch {}
    }
  };
  const [daubColor, setDaubColor] = useState<DaubColor>(() => {
    if (typeof window !== 'undefined') {
      const s = localStorage.getItem('ezi_pref_daub_color') as DaubColor;
      if (s) return s;
    }
    return 'green';
  });
  const [accentColor, setAccentColor] = useState<AppAccentColor>(() => {
    if (typeof window !== 'undefined') {
      const s = localStorage.getItem('ezi_pref_accent_color') as AppAccentColor;
      if (s) return s;
    }
    return 'amber';
  });
  const [unregisteredWhenStartedMode, setUnregisteredWhenStartedMode] = useState<UnregisteredWhenStartedMode>(() => {
    if (typeof window !== 'undefined') {
      const s = localStorage.getItem('ezi_pref_unreg_started_mode') as UnregisteredWhenStartedMode;
      if (s === 'hide' || s === 'dim') return s;
    }
    return 'hide';
  });
  const [autoDaub, setAutoDaub] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('ezi_pref_auto_daub') === 'true';
    }
    return false;
  });
  const [gridColumns, setGridColumns] = useState<2 | 3>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('ezi_pref_grid_cols') === '3' ? 3 : 2;
    }
    return 2;
  });
  const [sortMode, setSortMode] = useState<FastSortMode>(() => {
    if (typeof window !== 'undefined') {
      const s = localStorage.getItem('ezi_pref_fast_sort_mode') as FastSortMode;
      if (s) return s;
    }
    return 'by_fast_win';
  });
  const [notificationPref, setNotificationPref] = useState<NotificationPreference>(() => {
    if (typeof window !== 'undefined') {
      const s = localStorage.getItem('ezi_pref_notif') as NotificationPreference;
      if (s) return s;
    }
    return 'always';
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('ezi_pref_dark', String(isDark));
      localStorage.setItem('ezi_pref_daub_color', daubColor);
      localStorage.setItem('ezi_pref_accent_color', accentColor);
      localStorage.setItem('ezi_pref_unreg_started_mode', unregisteredWhenStartedMode);
      localStorage.setItem('ezi_pref_auto_daub', String(autoDaub));
      localStorage.setItem('ezi_pref_grid_cols', String(gridColumns));
      localStorage.setItem('ezi_pref_fast_sort_mode', sortMode);
      localStorage.setItem('ezi_pref_notif', notificationPref);
    } catch {
      // ignore
    }
  }, [isDark, daubColor, accentColor, unregisteredWhenStartedMode, autoDaub, gridColumns, sortMode, notificationPref]);

  // Modals
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [isRuleModalOpen, setIsRuleModalOpen] = useState<boolean>(false);
  const [isSelectorModalOpen, setIsSelectorModalOpen] = useState<boolean>(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState<boolean>(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState<boolean>(false);
  const [isProvablyFairModalOpen, setIsProvablyFairModalOpen] = useState<boolean>(false);
  const [clientSeed, setClientSeed] = useState<string>('EZI-FAST-PUBLIC-SEED');
  const [inspectedWinner, setInspectedWinner] = useState<WinnerAnnouncement | null>(null);
  const [winnerDisplayCountdown, setWinnerDisplayCountdown] = useState<number | null>(null);
  const [showFullCartelasSection, setShowFullCartelasSection] = useState<boolean>(true);
  const [bonusCartelasForOver20, setBonusCartelasForOver20] = useState<number>(5);
  const [isPhoneRegistered, setIsPhoneRegistered] = useState<boolean>(() =>
    hasDeviceRegisteredPhone()
  );
  const [quickPhoneInput, setQuickPhoneInput] = useState<string>('');
  const [quickNameInput, setQuickNameInput] = useState<string>('');

  // Sync phone registration status with backend & Telegram WebApp per device (each phone has its own separate account!)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const devIdentity = getOrCreateDevicePlayerIdentity();
    setUsers((prev) =>
      prev.map((u, i) =>
        i === 0
          ? {
              ...u,
              id: devIdentity.id,
              name: devIdentity.name,
              phone: devIdentity.phone,
              referralCode: devIdentity.referralCode,
            }
          : u
      )
    );

    const tgUser = (
      window as unknown as {
        Telegram?: { WebApp?: { initDataUnsafe?: { user?: { id?: number; first_name?: string } } } };
      }
    ).Telegram?.WebApp?.initDataUnsafe?.user;
    const queryParams = new URLSearchParams();
    if (tgUser?.id) queryParams.set('chatId', String(tgUser.id));
    if (hasDeviceRegisteredPhone() && devIdentity.phone) {
      queryParams.set('phone', devIdentity.phone);
    }

    fetch(buildApiUrl(`/api/telegram/user-status?${queryParams.toString()}`))
      .then((r) => r.json())
      .then((data) => {
        if (data?.ok && data?.registered && data?.phone) {
          saveDevicePlayerIdentity(data.name || devIdentity.name, String(data.phone));
          setIsPhoneRegistered(true);
          setUsers((prev) =>
            prev.map((u, i) =>
              i === 0
                ? {
                    ...u,
                    name: data?.name ? String(data.name) : u.name,
                    phone: String(data.phone),
                  }
                : u
            )
          );
        } else if (data?.ok && data?.registered === false && tgUser?.id) {
          localStorage.removeItem('ezi_phone_registered_v2');
          setIsPhoneRegistered(false);
        }
      })
      .catch(() => {
        // ignore offline errors
      });
  }, []);

  // Fast Bingo Game State (Rule is ALWAYS: 1 Line Horizontal, Vertical, Diagonal OR 4 Corners)
  // 4 Independent Live Rooms by Stake: 10, 20, 50, 100 ETB
  // When selectedStakeRoom is null, the player sees the 4-Room Lobby (like IMG_3525.png)
  // When selectedStakeRoom is 10, 20, 50, or 100, the player enters that room's 1-500 cartela board & plays!
  const [selectedStakeRoom, setSelectedStakeRoom] = useState<10 | 20 | 50 | 100 | null>(null);
  const [stakeAmount, setStakeAmount] = useState<number>(10);
  const activeStakeTier: 10 | 20 | 50 | 100 =
    selectedStakeRoom ??
    (stakeAmount === 20 || stakeAmount === 50 || stakeAmount === 100 ? stakeAmount : 10);

  const [allFastRoomsByStake, setAllFastRoomsByStake] = useState<
    Record<number, ServerRoomStatePayload>
  >({});
  const [allFastLockedByStake, setAllFastLockedByStake] = useState<
    Record<number, ServerLockedCartelaItem[]>
  >({});

  const [gameMatchId, setGameMatchId] = useState<number>(() =>
    Math.floor(100000 + Math.random() * 900000)
  );
  const [otherPlayersRegisteredCount, setOtherPlayersRegisteredCount] = useState<number>(0);
  const [jackpotPool, setJackpotPool] = useState<number>(500);
  const [houseEarningsTotal, setHouseEarningsTotal] = useState<number>(420);
  const [jackpotWonInRound, setJackpotWonInRound] = useState<number>(0);

  const [calledBalls, setCalledBalls] = useState<number[]>([]);
  const [activeBall, setActiveBall] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [callSpeedSec, setCallSpeedSec] = useState<CallSpeed>(3);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const s = localStorage.getItem('ezi_pref_voice');
      if (s !== null) return s === 'true';
    }
    return true;
  });
  const [sfxEnabled, setSfxEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const s = localStorage.getItem('ezi_pref_sfx');
      if (s !== null) return s === 'true';
    }
    return true;
  });
  const [preGameCountdown, setPreGameCountdown] = useState<number | null>(null);

  useEffect(() => {
    soundFX.setVoiceEnabled(voiceEnabled);
  }, [voiceEnabled]);

  useEffect(() => {
    soundFX.setSfxEnabled(sfxEnabled);
  }, [sfxEnabled]);

  // Separate Player Cartelas per Stake Room (10, 20, 50, 100 ETB) from 1 - 500 pool
  const [cartelasByStake, setCartelasByStake] = useState<Record<number, CartelaCard[]>>(() => {
    const createDefaultRoomCards = () => [
      { ...generateCartelaById(21), isRegistered: false },
      { ...generateCartelaById(145), isRegistered: false },
      { ...generateCartelaById(289), isRegistered: false },
      { ...generateCartelaById(412), isRegistered: false },
    ];
    if (typeof window !== 'undefined') {
      try {
        const savedMulti = localStorage.getItem('ezi_fast_cartelas_by_stake_v1');
        if (savedMulti) {
          const parsed = JSON.parse(savedMulti);
          if (parsed && typeof parsed === 'object') {
            return {
              10: Array.isArray(parsed[10]) ? parsed[10] : createDefaultRoomCards(),
              20: Array.isArray(parsed[20]) ? parsed[20] : createDefaultRoomCards(),
              50: Array.isArray(parsed[50]) ? parsed[50] : createDefaultRoomCards(),
              100: Array.isArray(parsed[100]) ? parsed[100] : createDefaultRoomCards(),
            };
          }
        }
      } catch {
        // ignore
      }
    }
    return {
      10: createDefaultRoomCards(),
      20: createDefaultRoomCards(),
      50: createDefaultRoomCards(),
      100: createDefaultRoomCards(),
    };
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('ezi_fast_cartelas_by_stake_v1', JSON.stringify(cartelasByStake));
    } catch {
      // ignore
    }
  }, [cartelasByStake]);

  const cartelas = useMemo(
    () => cartelasByStake[activeStakeTier] || [],
    [cartelasByStake, activeStakeTier]
  );

  const setCartelas = useCallback(
    (updater: React.SetStateAction<CartelaCard[]>) => {
      setCartelasByStake((prevMap) => {
        const currentList = prevMap[activeStakeTier] || [];
        const nextList =
          typeof updater === 'function'
            ? (updater as (prev: CartelaCard[]) => CartelaCard[])(currentList)
            : updater;
        if (nextList === currentList) return prevMap;
        return {
          ...prevMap,
          [activeStakeTier]: nextList,
        };
      });
    },
    [activeStakeTier]
  );
  const [selectedCartelaIds, setSelectedCartelaIds] = useState<number[]>([]);
  const [blockedCartelaIds, setBlockedCartelaIds] = useState<number[]>([]);
  const [winnersList, setWinnersList] = useState<WinnerAnnouncement[]>([]);

  // Pinned Winner Banner for Fast Bingo
  const [lastVerifiedWinnerBanner, setLastVerifiedWinnerBanner] = useState<WinnerAnnouncement | null>(null);

  // Fast Bingo Game History
  const [gameHistory, setGameHistory] = useState<GameHistoryRecord[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('ezi_fast_game_history_v1');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            return parsed.filter(
              (h: GameHistoryRecord) =>
                !h.winners?.some((w) => w.userName === 'Yonas_Fast' || w.userName === 'Dawit_Bingo')
            );
          }
        }
      } catch {
        // ignore
      }
    }
    return [];
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('ezi_fast_game_history_v1', JSON.stringify(gameHistory));
    } catch {
      // ignore
    }
  }, [gameHistory]);

  const [verificationFailure, setVerificationFailure] = useState<VerificationFailureInfo | null>(null);
  const [showConfetti, setShowConfetti] = useState<boolean>(false);
  const [bonusBannerText, setBonusBannerText] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [bingoCountdown, setBingoCountdown] = useState<number | null>(null);
  const [gameFinishedAt, setGameFinishedAt] = useState<number | null>(null);
  const [isPostTwoMinutes, setIsPostTwoMinutes] = useState<boolean>(false);

  useEffect(() => {
    if (bingoCountdown === null) return;
    if (bingoCountdown <= 0) return;
    const timer = setTimeout(() => {
      setBingoCountdown((prev) => (prev && prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearTimeout(timer);
  }, [bingoCountdown]);

  useEffect(() => {
    if (!gameFinishedAt) {
      setIsPostTwoMinutes(false);
      return;
    }
    const interval = setInterval(() => {
      if (Date.now() - gameFinishedAt >= 120000) {
        setIsPostTwoMinutes(true);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [gameFinishedAt]);

  useEffect(() => {
    if (winnersList.length > 0 || (calledBalls.length >= 75 && !isPlaying)) {
      if (gameFinishedAt === null) {
        setGameFinishedAt(Date.now());
        setBingoCountdown(30);
      }
    }
  }, [winnersList.length, calledBalls.length, isPlaying, gameFinishedAt]);
  const [isSelectModeActive, setIsSelectModeActive] = useState<boolean>(false);
  const [downloadStatus, setDownloadStatus] = useState<string | null>(null);
  const [botTokenInput, setBotTokenInput] = useState<string>(() =>
    typeof window !== 'undefined' ? localStorage.getItem('ezi_telegram_bot_token') || '' : ''
  );
  const [isConnectingBot, setIsConnectingBot] = useState<boolean>(false);

  // Control Login Form State & PIN Security
  const [adminUser, setAdminUser] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [adminLoginError, setAdminLoginError] = useState('');
  const [cartelaToBlock, setCartelaToBlock] = useState('');
  const [newAdminPinInput, setNewAdminPinInput] = useState('');
  const [requireDepositApproval, setRequireDepositApproval] = useState<boolean>(true);
  const [approvalTypeFilter, setApprovalTypeFilter] = useState<'all' | 'deposit' | 'withdraw'>('all');
  const [approvalStatusFilter, setApprovalStatusFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [approvalSearch, setApprovalSearch] = useState<string>('');
  const [userMgmtSearch, setUserMgmtSearch] = useState<string>('');
  const [newUserNameInput, setNewUserNameInput] = useState<string>('');
  const [newUserPhoneInput, setNewUserPhoneInput] = useState<string>('');
  const [newUserBalanceInput, setNewUserBalanceInput] = useState<string>('15');
  const [customBalanceInputs, setCustomBalanceInputs] = useState<Record<string, string>>({});
  const [otherPlayersLockedCartelas, setOtherPlayersLockedCartelas] = useState<OtherPlayerLockedCartela[]>([]);
  const [onlinePlayersCount, setOnlinePlayersCount] = useState<number>(1);

  // Unified Users & Wallet State (per device)
  const [localUsers, setLocalUsers] = useState<UserAccount[]>(() => {
    const devIdentity = getOrCreateDevicePlayerIdentity();
    return [
      {
        id: devIdentity.id,
        name: devIdentity.name,
        phone: devIdentity.phone,
        passwordHash: '****',
        balance: 15.0,
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

  const [localTransactions, setLocalTransactions] = useState<TransactionRecord[]>([]);

  const users = sharedUsers ?? localUsers;
  const setUsers = onUpdateSharedUsers ?? setLocalUsers;
  const transactions = sharedTransactions ?? localTransactions;
  const setTransactions = onUpdateSharedTransactions ?? setLocalTransactions;

  const currentUser = users[0];

  const [heroBanners, setHeroBanners] = useState<HeroBannerAd[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('ezi_hero_banners_v2');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {
        // ignore
      }
    }
    return [
      {
        id: 'hb-1',
        title: 'ሁልጊዜ ጨዋታ! በ Sun Bingo እስከ 50,000 ብር ያሸንፉ!',
        subtitle:
          'ከ 20 በላይ ካርቴላ ለሚይዙ +5 ካርቴላ ቦነስ በነፃ ይሰጣል!',
        badgeText: 'Sun Bingo ልዩ ቦነስ',
        accentColor: 'emerald',
        isActive: true,
      },
      {
        id: 'hb-2',
        title: 'በየቀኑ 4 ጊዜ የነፃ ቢንጎ ጨዋታዎች (2:00፣ 8:00፣ 12:00፣ 4:30)',
        subtitle: 'ጓደኛዎን ይጋብዙ እና በእያንዳንዱ ተጋባዥ ጓደኛ ወዲያውኑ የ 25 ብር ሽልማት ያግኙ!',
        badgeText: 'የነፃ ጨዋታ መርሃ-ግብር',
        accentColor: 'blue',
        isActive: true,
      },
    ];
  });

  const [bankAccounts, setBankAccounts] = useState<BankPaymentAccount[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('ezi_bank_accounts_v2');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {
        // ignore
      }
    }
    return PAYMENT_ACCOUNTS;
  });

  // Real-time Server Room Sync (WebSocket + SSE + HTTP Polling):
  // Every ball called, game start, countdown, and winner is synchronized across ALL phones simultaneously!
  const [isServerRealtimeConnected, setIsServerRealtimeConnected] = useState<boolean>(false);
  const lastSpokenBallByStakeRef = useRef<Record<number, number | null>>({});
  const lastSpokenBallCountByStakeRef = useRef<Record<number, number>>({});
  const lastAppliedSeqByStakeRef = useRef<Record<number, number>>({});
  const lastSyncedMatchIdByStakeRef = useRef<Record<number, number>>({});
  const lastWinKeyByStakeRef = useRef<Record<number, string | null>>({});
  const last30sAlertedMatchByStakeRef = useRef<Record<number, number>>({});
  const hasRun10sCountdownMatchRef = useRef<Record<number, number>>({});

  // Sound-only 6-second notification when 30 seconds remain before the game starts
  useEffect(() => {
    if (
      preGameCountdown !== null &&
      preGameCountdown <= 30 &&
      preGameCountdown >= 25 &&
      last30sAlertedMatchByStakeRef.current[activeStakeTier] !== gameMatchId
    ) {
      last30sAlertedMatchByStakeRef.current[activeStakeTier] = gameMatchId;
      const hasReg = cartelas.some((c) => c.isRegistered);
      if (
        notificationPref === 'always' ||
        (notificationPref === 'registered_only' && hasReg)
      ) {
        soundFX.playSixSecondCountdownAlert(language);
      }
    }
  }, [preGameCountdown, activeStakeTier, gameMatchId, cartelas, notificationPref, language]);

  const applyServerFastRoomSnapshot = useCallback(
    (room: ServerRoomStatePayload, allLocked?: ServerLockedCartelaItem[]) => {
      if (!room) return;
      const roomStake =
        room.stakeAmount === 20 || room.stakeAmount === 50 || room.stakeAmount === 100
          ? room.stakeAmount
          : 10;
      const prevSeq = lastAppliedSeqByStakeRef.current[roomStake] || 0;
      if (room.seq && room.seq < prevSeq) {
        return;
      }
      if (room.seq) {
        lastAppliedSeqByStakeRef.current[roomStake] = room.seq;
      }

      const myPhone = (currentUser?.phone || '').trim();
      const myClientId = getDeviceClientId();

      if (Array.isArray(allLocked)) {
        const myLocked = allLocked.filter((item) =>
          item.clientId ? item.clientId === myClientId : item.ownerPhone === myPhone
        );
        if (myLocked.length > 0) {
          const myIds = new Set(myLocked.map((item) => item.cartelaId));
          setCartelasByStake((prevMap) => {
            const prev = prevMap[roomStake] || [];
            const existingIds = new Set(prev.map((c) => c.id));
            const next = prev.map((c) =>
              myIds.has(c.id) && !c.isRegistered ? { ...c, isRegistered: true } : c
            );
            for (const m of myLocked) {
              if (!existingIds.has(m.cartelaId)) {
                next.push({ ...generateCartelaById(m.cartelaId), isRegistered: true });
              }
            }
            const changed =
              next.length !== prev.length ||
              next.some((c, idx) => c.isRegistered !== prev[idx]?.isRegistered);
            return changed ? { ...prevMap, [roomStake]: next } : prevMap;
          });
        }

        const others = allLocked
          .filter((item) =>
            item.clientId ? item.clientId !== myClientId : item.ownerPhone !== myPhone
          )
          .map((item) => ({
            cartelaId: item.cartelaId,
            ownerName: item.ownerName,
            ownerPhone: item.ownerPhone,
            clientId: item.clientId,
            isRegistered: Boolean(item.isRegistered ?? true),
          }));
        setOtherPlayersLockedCartelas((prev) =>
          prev.length === others.length &&
          prev.every((p, idx) => p.cartelaId === others[idx]?.cartelaId)
            ? prev
            : others
        );
        setOtherPlayersRegisteredCount(others.length);
      }

      if (typeof room.onlinePlayersCount === 'number') {
        setOnlinePlayersCount(room.onlinePlayersCount);
      }

      const prevMatchId = lastSyncedMatchIdByStakeRef.current[roomStake] || 0;
      // First sync after load -> adopt server gameMatchId without wiping local cartelas
      if (prevMatchId === 0) {
        lastSyncedMatchIdByStakeRef.current[roomStake] = room.gameMatchId;
        setGameMatchId(room.gameMatchId);
      } else if (room.gameMatchId !== prevMatchId) {
        // Detect round reset on server -> reset local cartelas to unregistered for the new round
        lastSyncedMatchIdByStakeRef.current[roomStake] = room.gameMatchId;
        lastSpokenBallByStakeRef.current[roomStake] = null;
        lastSpokenBallCountByStakeRef.current[roomStake] = 0;
        lastWinKeyByStakeRef.current[roomStake] = null;
        setGameMatchId(room.gameMatchId);
        setVerificationFailure(null);
        setShowConfetti(false);
        setInspectedWinner(null);
        setCartelasByStake((prevMap) => ({
          ...prevMap,
          [roomStake]: (prevMap[roomStake] || []).map((c) => ({
            ...c,
            isRegistered: false,
            isBlocked: false,
            manualMarks: Array.from({ length: 5 }, (_, r) =>
              Array.from({ length: 5 }, (__, col) => r === 2 && col === 2)
            ),
          })),
        }));
      } else {
        setGameMatchId(room.gameMatchId);
      }

      const nextBalls = room.calledBalls || [];
      if (nextBalls.length === 0) {
        lastSpokenBallByStakeRef.current[roomStake] = null;
        lastSpokenBallCountByStakeRef.current[roomStake] = 0;
      }

      setIsPlaying(room.isPlaying);
      setIsPaused(room.isPaused);
      setPreGameCountdown(room.preGameCountdown);
      setWinnerDisplayCountdown(room.winnerDisplayCountdown);
      setCalledBalls((prev) =>
        prev.length === nextBalls.length &&
        prev[prev.length - 1] === nextBalls[nextBalls.length - 1]
          ? prev
          : nextBalls
      );
      setActiveBall(room.activeBall);

      const lastCount = lastSpokenBallCountByStakeRef.current[roomStake] || 0;
      const lastBallSpoken = lastSpokenBallByStakeRef.current[roomStake] ?? null;
      const latestBall = nextBalls.length > 0 ? nextBalls[nextBalls.length - 1] : room.activeBall;
      if (
        selectedStakeRoom === roomStake &&
        latestBall !== null &&
        nextBalls.length > lastCount &&
        latestBall !== lastBallSpoken
      ) {
        lastSpokenBallCountByStakeRef.current[roomStake] = nextBalls.length;
        lastSpokenBallByStakeRef.current[roomStake] = latestBall;
        soundFX.speakBall(
          latestBall,
          voiceEnabled,
          language,
          (room.callSpeedSec as CallSpeed) || callSpeedSec,
          `fast-${roomStake}-${room.gameMatchId}`
        );
      }

      if (typeof room.callSpeedSec === 'number') {
        setCallSpeedSec(room.callSpeedSec as CallSpeed);
      }
      setStakeAmount(roomStake);
      if (typeof room.jackpotPool === 'number') {
        setJackpotPool(room.jackpotPool);
      }
      if (typeof room.houseEarningsTotal === 'number') {
        setHouseEarningsTotal(room.houseEarningsTotal);
      }
      if (typeof room.jackpotWonInRound === 'number') {
        setJackpotWonInRound(room.jackpotWonInRound);
      }
      if (typeof room.bonusCartelasForOver20 === 'number') {
        setBonusCartelasForOver20(room.bonusCartelasForOver20);
      }
      if (Array.isArray(room.heroBanners) && room.heroBanners.length > 0) {
        setHeroBanners(room.heroBanners);
      }
      if (Array.isArray(room.bankAccounts) && room.bankAccounts.length > 0) {
        setBankAccounts(room.bankAccounts);
      }
      if (Array.isArray(room.blockedCartelaIds)) {
        const nextBlocked = room.blockedCartelaIds;
        setBlockedCartelaIds((prev) =>
          prev.length === nextBlocked.length &&
          prev[prev.length - 1] === nextBlocked[nextBlocked.length - 1]
            ? prev
            : nextBlocked
        );
      }
      if (Array.isArray(room.winnersList)) {
        const nextWinners = room.winnersList;
        setWinnersList((prev) =>
          prev.length === nextWinners.length &&
          prev[prev.length - 1]?.cartelaId === nextWinners[nextWinners.length - 1]?.cartelaId
            ? prev
            : nextWinners
        );
        if (nextWinners.length > 0) {
          const topWinner = nextWinners[nextWinners.length - 1];
          const winKey = `${room.gameMatchId}-${topWinner.cartelaId}-${topWinner.lastBall}`;
          if (lastWinKeyByStakeRef.current[roomStake] !== winKey) {
            lastWinKeyByStakeRef.current[roomStake] = winKey;
            setLastVerifiedWinnerBanner(topWinner);
            if (selectedStakeRoom === roomStake) {
              setInspectedWinner(topWinner);
              setShowConfetti(true);
              soundFX.playVictoryFanfare();
            }
            setGameHistory((prev) => {
              if (prev.some((h) => h.gameMatchId === room.gameMatchId)) return prev;
              return [
                {
                  id: `fgh-${room.gameMatchId}-${Date.now()}`,
                  gameMatchId: room.gameMatchId,
                  timestamp: topWinner.timestamp || new Date().toLocaleString(),
                  stakeAmount: roomStake,
                  prizeAmount: topWinner.prizeAmount,
                  patternTitle: topWinner.patternTitle,
                  totalBallsCalled:
                    topWinner.calledBallsSnapshot?.length || room.calledBalls.length,
                  lastBall: topWinner.lastBall,
                  calledBallsSnapshot: topWinner.calledBallsSnapshot || room.calledBalls,
                  winners: nextWinners.map((w) => ({
                    cartelaId: w.cartelaId,
                    userName: w.userName,
                    prizeAmount: w.prizeAmount,
                    winningCells: w.winningCells,
                  })),
                },
                ...prev,
              ];
            });
          }
        }
      }
      if (room.lastVerifiedWinnerBanner) {
        setLastVerifiedWinnerBanner(room.lastVerifiedWinnerBanner);
      }
      if (Array.isArray(room.gameHistory) && room.gameHistory.length > 0) {
        setGameHistory((prev) => {
          const mapByRound = new Map<number, GameHistoryRecord>();
          for (const item of room.gameHistory!) {
            mapByRound.set(item.gameMatchId, item);
          }
          for (const item of prev) {
            if (!mapByRound.has(item.gameMatchId)) {
              mapByRound.set(item.gameMatchId, item);
            }
          }
          const merged = Array.from(mapByRound.values()).sort(
            (a, b) => b.gameMatchId - a.gameMatchId
          );
          if (
            merged.length === prev.length &&
            merged[0]?.gameMatchId === prev[0]?.gameMatchId &&
            merged[0]?.winners.length === prev[0]?.winners.length
          ) {
            return prev;
          }
          return merged;
        });
      }
    },
    [currentUser?.phone, selectedStakeRoom, voiceEnabled, language, callSpeedSec]
  );

  const mergeServerTransactions = useCallback(
    (srvTxs?: TransactionRecord[]) => {
      if (!Array.isArray(srvTxs) || srvTxs.length === 0) return;
      setTransactions((prev) => {
        const byRefOrId = new Map<string, TransactionRecord>();
        for (const stx of srvTxs) {
          const key = `${stx.type}:${stx.userPhone}:${stx.recipientPhone || ''}:${stx.referenceNumber}:${stx.amount}`;
          byRefOrId.set(key, stx);
        }
        const combined: TransactionRecord[] = [...srvTxs];
        for (const ltx of prev) {
          const key = `${ltx.type}:${ltx.userPhone}:${ltx.recipientPhone || ''}:${ltx.referenceNumber}:${ltx.amount}`;
          if (!byRefOrId.has(key) && !srvTxs.some((s) => s.id === ltx.id)) {
            combined.push(ltx);
          }
        }
        const prevSig = prev.map((t) => `${t.id}:${t.status}`).join('|');
        const nextSig = combined.map((t) => `${t.id}:${t.status}`).join('|');
        return prevSig === nextSig ? prev : combined;
      });
    },
    [setTransactions]
  );

  const mergeServerPlayers = useCallback(
    (
      srvPlayers?: {
        id: string;
        phone: string;
        name: string;
        balance: number;
        bonusBalance: number;
        referralEarnings: number;
        referredCount: number;
        isBlocked: boolean;
        updatedAt?: string;
      }[]
    ) => {
      if (!Array.isArray(srvPlayers) || srvPlayers.length === 0) return;
      setUsers((prev) => {
        const me = prev[0];
        const prevByPhone = new Map<string, UserAccount>();
        for (const u of prev) {
          if (u.phone) prevByPhone.set(u.phone.trim(), u);
        }

        const srvByPhone = new Map<string, (typeof srvPlayers)[number]>();
        for (const sp of srvPlayers) {
          if (sp && sp.phone) {
            srvByPhone.set(sp.phone.trim(), sp);
          }
        }

        const nextList: UserAccount[] = [];
        // Keep current device user at index 0
        if (me) {
          const myPhone = me.phone.trim();
          const srvMe = srvByPhone.get(myPhone);
          if (srvMe) {
            nextList.push({
              ...me,
              name:
                srvMe.name && !srvMe.name.startsWith('Player_') ? srvMe.name : me.name || srvMe.name,
              balance: typeof srvMe.balance === 'number' ? srvMe.balance : me.balance,
              bonusBalance:
                typeof srvMe.bonusBalance === 'number' ? srvMe.bonusBalance : me.bonusBalance,
              referredCount:
                typeof srvMe.referredCount === 'number' ? srvMe.referredCount : me.referredCount,
              referralEarnings:
                typeof srvMe.referralEarnings === 'number'
                  ? srvMe.referralEarnings
                  : me.referralEarnings,
              isBlocked: typeof srvMe.isBlocked === 'boolean' ? srvMe.isBlocked : me.isBlocked,
            });
            srvByPhone.delete(myPhone);
          } else {
            nextList.push(me);
          }
        }

        // Add all other registered players from server (newest first)
        const remainingServerPlayers = Array.from(srvByPhone.values()).reverse();
        for (const sp of remainingServerPlayers) {
          const cleanPh = sp.phone.trim();
          const existingLocal = prevByPhone.get(cleanPh);
          nextList.push({
            id: existingLocal?.id || sp.id || `u-${cleanPh}`,
            name: sp.name || existingLocal?.name || `Player_${cleanPh.slice(-4)}`,
            phone: cleanPh,
            passwordHash: existingLocal?.passwordHash || '****',
            balance: typeof sp.balance === 'number' ? sp.balance : existingLocal?.balance ?? 15,
            bonusBalance:
              typeof sp.bonusBalance === 'number'
                ? sp.bonusBalance
                : existingLocal?.bonusBalance ?? 15,
            referralCode: existingLocal?.referralCode || `EZI${cleanPh.slice(-4)}`,
            referredCount:
              typeof sp.referredCount === 'number'
                ? sp.referredCount
                : existingLocal?.referredCount ?? 0,
            referralEarnings:
              typeof sp.referralEarnings === 'number'
                ? sp.referralEarnings
                : existingLocal?.referralEarnings ?? 0,
            isBlocked:
              typeof sp.isBlocked === 'boolean' ? sp.isBlocked : existingLocal?.isBlocked ?? false,
            isAdmin: existingLocal?.isAdmin ?? false,
            joinedAt:
              existingLocal?.joinedAt ||
              (sp.updatedAt ? sp.updatedAt.slice(0, 10) : new Date().toISOString().slice(0, 10)),
          });
        }

        // Preserve any local-only users not yet on server
        for (let i = 1; i < prev.length; i++) {
          const lu = prev[i];
          if (lu && lu.phone && !nextList.some((x) => x.phone === lu.phone.trim())) {
            nextList.push(lu);
          }
        }

        const prevSig = prev
          .map((u) => `${u.phone}:${u.name}:${u.balance}:${u.bonusBalance}:${u.isBlocked}`)
          .join('|');
        const nextSig = nextList
          .map((u) => `${u.phone}:${u.name}:${u.balance}:${u.bonusBalance}:${u.isBlocked}`)
          .join('|');
        return prevSig === nextSig ? prev : nextList;
      });
    },
    [setUsers]
  );

  // Subscribe to instant WebSocket / SSE / Polling broadcasts from server
  useEffect(() => {
    const unsubscribe = subscribeRealtimeRoomSync((msg, connected) => {
      setIsServerRealtimeConnected(connected);
      if (msg.fastRoomsByStake) {
        setAllFastRoomsByStake(msg.fastRoomsByStake);
      }
      if (msg.fastLockedCartelasByStake) {
        setAllFastLockedByStake(msg.fastLockedCartelasByStake);
      }
      const targetRoom =
        msg.fastRoomsByStake?.[activeStakeTier] || msg.fastRoom;
      const targetLocked =
        msg.fastLockedCartelasByStake?.[activeStakeTier] || msg.fastLockedCartelas;
      if (targetRoom) {
        applyServerFastRoomSnapshot(targetRoom, targetLocked);
      }
      if (Array.isArray(msg.transactions)) {
        mergeServerTransactions(msg.transactions);
      }
      if (Array.isArray(msg.players) && msg.players.length > 0) {
        mergeServerPlayers(msg.players);
      }
      if (typeof msg.requireDepositApproval === 'boolean') {
        setRequireDepositApproval(msg.requireDepositApproval);
      }
    });
    return unsubscribe;
  }, [activeStakeTier, applyServerFastRoomSnapshot, mergeServerTransactions, mergeServerPlayers]);

  const refreshLiveServerRoomState = useCallback(
    (overrideStake?: number) => {
      const targetStake = overrideStake ?? activeStakeTier;
      const phoneParam = encodeURIComponent(currentUser?.phone || '0942742684');
      const clientIdParam = encodeURIComponent(getDeviceClientId());
      fetch(
        buildApiUrl(
          `/api/live-room/state?mode=fast&stake=${targetStake}&phone=${phoneParam}&clientId=${clientIdParam}`
        )
      )
        .then((r) => r.json())
        .then((data) => {
          if (data?.ok) {
            setIsServerRealtimeConnected(true);
            if (data.fastRoomsByStake) {
              setAllFastRoomsByStake(data.fastRoomsByStake);
            }
            if (data.fastLockedCartelasByStake) {
              setAllFastLockedByStake(data.fastLockedCartelasByStake);
            }
            const rm =
              data.fastRoomsByStake?.[targetStake] || data.fastRoom || data.room;
            const lk =
              data.fastLockedCartelasByStake?.[targetStake] ||
              data.fastLockedCartelas ||
              data.lockedCartelas;
            if (rm) {
              applyServerFastRoomSnapshot(rm, lk);
            }
            if (Array.isArray(data.transactions)) {
              mergeServerTransactions(data.transactions);
            }
            if (Array.isArray(data.players)) {
              mergeServerPlayers(data.players);
            }
            if (typeof data.requireDepositApproval === 'boolean') {
              setRequireDepositApproval(data.requireDepositApproval);
            }
          }
        })
        .catch(() => {
          setIsServerRealtimeConnected(false);
        });
    },
    [activeStakeTier, currentUser?.phone, applyServerFastRoomSnapshot, mergeServerTransactions, mergeServerPlayers]
  );

  useEffect(() => {
    refreshLiveServerRoomState();
  }, [refreshLiveServerRoomState]);

  const handleEnterStakeRoom = useCallback(
    (tier: 10 | 20 | 50 | 100) => {
      const cachedRoom = allFastRoomsByStake[tier];
      const cachedLocked = allFastLockedByStake[tier];
      if (cachedRoom) {
        const existingBalls = cachedRoom.calledBalls || [];
        lastSpokenBallCountByStakeRef.current[tier] = existingBalls.length;
        lastSpokenBallByStakeRef.current[tier] =
          existingBalls.length > 0
            ? existingBalls[existingBalls.length - 1]
            : cachedRoom.activeBall ?? null;
      }
      setSelectedStakeRoom(tier);
      setStakeAmount(tier);
      setSelectedCartelaIds([]);
      setVerificationFailure(null);
      if (cachedRoom) {
        lastAppliedSeqByStakeRef.current[tier] = 0;
        applyServerFastRoomSnapshot(cachedRoom, cachedLocked);
      }
      refreshLiveServerRoomState(tier);
    },
    [allFastRoomsByStake, allFastLockedByStake, applyServerFastRoomSnapshot, refreshLiveServerRoomState]
  );

  const lockOrUnlockCartelaOnServer = useCallback(
    (cartelaId: number, action: 'lock' | 'unlock') => {
      fetch(buildApiUrl('/api/live-room/lock-cartela'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'fast',
          stakeAmount: activeStakeTier,
          cartelaId,
          phone: currentUser?.phone || '0942742684',
          name: currentUser?.name || 'Ezana_Player',
          clientId: getDeviceClientId(),
          action,
        }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data?.lockedByOther) {
            soundFX.playErrorBuzzer();
            setStatusNotice(
              data.error || `ካርቴላ #${cartelaId} በሌላ ተጫዋች ተይዟል! እባክዎ ሌላ ቁጥር ይምረጡ።`
            );
          }
          if (data?.ok && data.room) {
            setIsServerRealtimeConnected(true);
            if (data.fastRoomsByStake) setAllFastRoomsByStake(data.fastRoomsByStake);
            if (data.fastLockedCartelasByStake) setAllFastLockedByStake(data.fastLockedCartelasByStake);
            applyServerFastRoomSnapshot(data.room, data.lockedCartelas);
          } else {
            refreshLiveServerRoomState();
          }
        })
        .catch(() => {});
    },
    [activeStakeTier, currentUser?.phone, currentUser?.name, applyServerFastRoomSnapshot, refreshLiveServerRoomState]
  );

  const t = TRANSLATIONS[language];

  const FAST_MAX_POOL_CARTELAS = 500;
  const JACKPOT_TARGET_BIRR = 500;

  const registeredCartelasCount = cartelas.filter((c) => c.isRegistered).length;
  // Distinct other mobile devices / players who have registered at least 1 cartela
  const distinctOtherPlayersCount = useMemo(() => {
    const owners = new Set<string>();
    for (const item of otherPlayersLockedCartelas) {
      const key = (item.clientId || item.ownerPhone || item.ownerName || '').trim();
      if (key) {
        owners.add(key);
      }
    }
    return owners.size;
  }, [otherPlayersLockedCartelas]);
  // Distinct joined players in the round (1 for self if registered + distinct other players)
  const totalJoinedPlayersCount =
    distinctOtherPlayersCount + (registeredCartelasCount > 0 ? 1 : 0);
  const activePlayersCartelasCount = otherPlayersRegisteredCount + registeredCartelasCount;
  const totalCollectedBirr = Math.max(1, activePlayersCartelasCount) * stakeAmount;
  const prizeAmount = Number((totalCollectedBirr * 0.8).toFixed(2)); // 80% ለተጫዋች (ደራሽ)
  const houseShareBirr = Number((totalCollectedBirr * 0.15).toFixed(2)); // 15% ለቤቱ
  const jackpotContributionBirr = Number((totalCollectedBirr * 0.05).toFixed(2)); // 5% ለጃክፓት
  const projectedJackpotTotal = Number((jackpotPool + jackpotContributionBirr).toFixed(2));
  const isJackpotReadyToDrop = projectedJackpotTotal >= JACKPOT_TARGET_BIRR;

  // Sorted Cartelas for Fast Bingo (1 Line / 4 Corners / 2x2 Square / 3x2 Rect / Cross / T)
  const sortedCartelas = useMemo(() => {
    if (sortMode === 'default') return cartelas;
    const copy = [...cartelas];
    copy.sort((a, b) => {
      if (sortMode === 'by_square') {
        const sqA = countCompletedSquares(getMarkedMatrix(a, calledBalls, autoDaub));
        const sqB = countCompletedSquares(getMarkedMatrix(b, calledBalls, autoDaub));
        if (sqB !== sqA) return sqB - sqA;
      }
      if (sortMode === 'by_rect') {
        const rA = countCompletedRectangles(getMarkedMatrix(a, calledBalls, autoDaub));
        const rB = countCompletedRectangles(getMarkedMatrix(b, calledBalls, autoDaub));
        if (rB !== rA) return rB - rA;
      }
      if (sortMode === 'by_cross') {
        const crA = countCompletedCrosses(getMarkedMatrix(a, calledBalls, autoDaub));
        const crB = countCompletedCrosses(getMarkedMatrix(b, calledBalls, autoDaub));
        if (crB !== crA) return crB - crA;
      }
      if (sortMode === 'by_t') {
        const tA = countCompletedTShapes(getMarkedMatrix(a, calledBalls, autoDaub));
        const tB = countCompletedTShapes(getMarkedMatrix(b, calledBalls, autoDaub));
        if (tB !== tA) return tB - tA;
      }
      const mA = getCartelaSortMetrics(a, calledBalls, autoDaub);
      const mB = getCartelaSortMetrics(b, calledBalls, autoDaub);
      if (sortMode === 'by_fast_win') return mB.fastScore - mA.fastScore;
      if (sortMode === 'by_lines') return mB.lineScore - mA.lineScore;
      if (sortMode === 'by_corners') return mB.cornerScore - mA.cornerScore;
      if (sortMode === 'by_called') return mB.calledCount - mA.calledCount;
      return mB.calledCount - mA.calledCount;
    });
    return copy;
  }, [cartelas, calledBalls, autoDaub, sortMode]);

  // Provably Fair SHA-256 Round Commitment & Predetermined 75-Ball Sequence
  const roundFairData = useMemo(
    () => generateProvablyFairRound(gameMatchId, undefined, clientSeed),
    [gameMatchId, clientSeed]
  );

  // Draw next ball from Provably Fair SHA-256 locked sequence (Server-Authoritative with Offline Fallback)
  const drawNextBall = useCallback(() => {
    if (isServerRealtimeConnected) {
      dispatchServerRoomAction({ mode: 'fast', stakeAmount: activeStakeTier, action: 'draw_next' });
      return;
    }
    setCalledBalls((prev) => {
      if (prev.length >= 75) {
        setIsPlaying(false);
        return prev;
      }
      const calledSet = new Set(prev);
      const nextBall = roundFairData.predeterminedBalls.find((b) => !calledSet.has(b));
      if (!nextBall) return prev;
      setActiveBall(nextBall);
      soundFX.speakBall(nextBall, voiceEnabled, language, callSpeedSec);
      return [...prev, nextBall];
    });
  }, [isServerRealtimeConnected, activeStakeTier, roundFairData, voiceEnabled, language, callSpeedSec]);

  // Automatic Ball Caller Interval (Only runs locally if offline from server; when online, server broadcasts to all phones simultaneously)
  useEffect(() => {
    if (isServerRealtimeConnected) return;
    if (!isPlaying || isPaused) return;
    const interval = setInterval(() => {
      drawNextBall();
    }, callSpeedSec * 1000);
    return () => clearInterval(interval);
  }, [isServerRealtimeConnected, isPlaying, isPaused, callSpeedSec, drawNextBall]);

  // Pre-Game Countdown Timer (Offline fallback only; when connected to server, server ticks down for all phones simultaneously!)
  useEffect(() => {
    if (isServerRealtimeConnected) return;
    if (preGameCountdown === null) return;
    if (totalJoinedPlayersCount < 2 || registeredCartelasCount < 1) {
      setPreGameCountdown(null);
      return;
    }
    if (preGameCountdown <= 0) {
      setPreGameCountdown(null);
      setIsPlaying(true);
      setIsPaused(false);
      drawNextBall();
      return;
    }
    const timer = setTimeout(() => {
      setPreGameCountdown((c) => (c !== null ? c - 1 : null));
    }, 1000);
    return () => clearTimeout(timer);
  }, [isServerRealtimeConnected, preGameCountdown, totalJoinedPlayersCount, registeredCartelasCount, drawNextBall]);

  // Offline-only fallback to start 30-second countdown when >= 2 players join (when online, server starts countdown automatically on lock-cartela without client thrashing!)
  useEffect(() => {
    if (isServerRealtimeConnected) return;
    if (
      !isPlaying &&
      calledBalls.length === 0 &&
      winnersList.length === 0 &&
      preGameCountdown === null &&
      registeredCartelasCount >= 1
    ) {
      setPreGameCountdown(30);
    }
  }, [
    isServerRealtimeConnected,
    isPlaying,
    calledBalls.length,
    winnersList.length,
    preGameCountdown,
    registeredCartelasCount,
  ]);

  // Blocked Cartela Verification Failure (no seconds countdown)

  // Reset Fast Bingo Game Round -> Broadcasts reset to ALL connected phones in this stake room via shared server!
  const handleResetGame = useCallback(() => {
    dispatchServerRoomAction({ mode: 'fast', stakeAmount: activeStakeTier, action: 'reset_round' });
    setIsPlaying(false);
    setIsPaused(false);
    setCalledBalls([]);
    setActiveBall(null);
    setWinnersList([]);
    setJackpotWonInRound(0);
    setVerificationFailure(null);
    setShowConfetti(false);
    setBlockedCartelaIds([]);
    setGameFinishedAt(null);
    setIsPostTwoMinutes(false);
    setBingoCountdown(null);
    setWinnerDisplayCountdown(null);
    setGameMatchId((prevId) => {
      let nextId = Math.floor(100000 + Math.random() * 900000);
      while (nextId === prevId) {
        nextId = Math.floor(100000 + Math.random() * 900000);
      }
      return nextId;
    });
    setCartelas((prev) =>
      prev.map((c) => ({
        ...c,
        isRegistered: false,
        isBlocked: false,
        manualMarks: Array.from({ length: 5 }, (_, r) =>
          Array.from({ length: 5 }, (__, col) => r === 2 && col === 2)
        ),
      }))
    );
    setStatusNotice(`አዲስ የ ${activeStakeTier} ብር ፈጣን ቢንጎ ዙር ተዘጋጅቷል! እባክዎ ለቀጣዩ ዙር ካርቴላዎን አስመዝግበው ይጫወቱ።`);
  }, [activeStakeTier, setCartelas]);

  // Auto-restart Fast Bingo 10 seconds after game finishes as requested:
  // "Fast Bingo 10ሰከንዱ አንድ ጊዜ ብቻ እንዲቆጥር"
  useEffect(() => {
    if (isPlaying) {
      return;
    }
    const isRoundDone = winnersList.length > 0 || calledBalls.length >= 75;
    if (!isRoundDone) {
      return;
    }
    // Prevent looping: count down 10 seconds exactly ONCE per gameMatchId
    if (hasRun10sCountdownMatchRef.current[activeStakeTier] === gameMatchId && winnerDisplayCountdown === null) {
      return;
    }

    if (winnerDisplayCountdown === null) {
      hasRun10sCountdownMatchRef.current[activeStakeTier] = gameMatchId;
      setWinnerDisplayCountdown(10);
      return;
    }
    if (winnerDisplayCountdown <= 0) {
      setWinnerDisplayCountdown(null);
      handleResetGame();
      return;
    }
    const timer = setTimeout(() => {
      setWinnerDisplayCountdown((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearTimeout(timer);
  }, [isPlaying, winnersList.length, calledBalls.length, winnerDisplayCountdown, handleResetGame, activeStakeTier, gameMatchId]);

  const handleStartPreGameCountdown = (seconds = 15) => {
    setIsPlaying(false);
    setIsPaused(false);
    setCalledBalls([]);
    setActiveBall(null);
    setWinnersList([]);
    setJackpotWonInRound(0);
    setVerificationFailure(null);
    setShowConfetti(false);
    setPreGameCountdown(seconds);
    soundFX.playNotificationChime();
    dispatchServerRoomAction({
      mode: 'fast',
      stakeAmount: activeStakeTier,
      action: 'start_countdown',
      countdownSeconds: seconds,
    });
  };

  // Deduct the stake amount ONLY when the game actually starts (isPlaying || calledBalls.length > 0)!
  // Before the game starts, registering/selecting cartelas only reserves them without cutting wallet balance.
  const deductedRoundMatchIdByStakeRef = useRef<Record<number, number>>({});

  useEffect(() => {
    const gameHasStarted = isPlaying || calledBalls.length > 0;
    if (!gameHasStarted) return;
    if (deductedRoundMatchIdByStakeRef.current[activeStakeTier] === gameMatchId) return;

    const paidRegisteredCards = cartelas.filter((c) => c.isRegistered && !c.isBonus);
    if (paidRegisteredCards.length === 0) return;

    deductedRoundMatchIdByStakeRef.current[activeStakeTier] = gameMatchId;
    const totalCost = paidRegisteredCards.length * stakeAmount;

    if (totalCost > 0) {
      setUsers((prev) =>
        prev.map((u, i) =>
          i === 0
            ? { ...u, balance: Math.max(0, Number((u.balance - totalCost).toFixed(2))) }
            : u
        )
      );
      if (typeof window !== 'undefined') {
        try {
          const prevPlayed = JSON.parse(localStorage.getItem('ezi_played_rounds_by_match_v1') || '{}');
          prevPlayed[gameMatchId] = cartelas.filter((c) => c.isRegistered).map((c) => c.id);
          localStorage.setItem('ezi_played_rounds_by_match_v1', JSON.stringify(prevPlayed));
        } catch {
          // ignore
        }
      }
      setTransactions((prev) => [
        {
          id: `ftx-bet-${gameMatchId}-${Date.now()}`,
          userId: currentUser?.id || 'u-1',
          userName: currentUser?.name || 'Player',
          userPhone: currentUser?.phone || '0942742684',
          type: 'bet',
          method: 'Wallet',
          amount: totalCost,
          referenceNumber: `FAST-${activeStakeTier}-RND-${gameMatchId}`,
          status: 'approved',
          timestamp: new Date().toLocaleString(),
        },
        ...prev,
      ]);
    }
  }, [
    isPlaying,
    calledBalls.length,
    activeStakeTier,
    gameMatchId,
    cartelas,
    stakeAmount,
    currentUser?.id,
    currentUser?.name,
    currentUser?.phone,
    setUsers,
    setTransactions,
  ]);

  // Mark Selected Handlers
  const handleToggleSelectCartela = (cartelaId: number) => {
    setSelectedCartelaIds((prev) =>
      prev.includes(cartelaId)
        ? prev.filter((id) => id !== cartelaId)
        : [...prev, cartelaId]
    );
  };

  const handleSelectAllCartelas = () => {
    setIsSelectModeActive(true);
    setSelectedCartelaIds(cartelas.filter((c) => !c.isRegistered).map((c) => c.id));
  };

  const handleClearSelection = () => {
    setSelectedCartelaIds([]);
    setIsSelectModeActive(false);
  };

  // Helper: Award free bonus cartelas ONLY when the player has REGISTERED > 20 paid cartelas
  const awardBonusCartelasIfRegisteredOver20 = useCallback(
    (cards: CartelaCard[]): { updatedCards: CartelaCard[]; newlyAddedBonusIds: number[]; removedBonusIds: number[] } => {
      const registeredNonBonusCount = cards.filter((c) => c.isRegistered && !c.isBonus).length;
      const currentBonusCards = cards.filter((c) => c.isBonus);

      // If registered paid cartelas dropped to <= 20, remove any previously awarded bonus cartelas
      if (registeredNonBonusCount <= 20) {
        if (currentBonusCards.length > 0) {
          return {
            updatedCards: cards.filter((c) => !c.isBonus),
            newlyAddedBonusIds: [],
            removedBonusIds: currentBonusCards.map((c) => c.id),
          };
        }
        return { updatedCards: cards, newlyAddedBonusIds: [], removedBonusIds: [] };
      }

      if (bonusCartelasForOver20 <= 0 || currentBonusCards.length >= bonusCartelasForOver20) {
        return { updatedCards: cards, newlyAddedBonusIds: [], removedBonusIds: [] };
      }

      const existingIds = new Set(cards.map((c) => c.id));
      const blockedSet = new Set(blockedCartelaIds);
      const otherLockedSet = new Set(otherPlayersLockedCartelas.map((o) => o.cartelaId));
      const nextCards = [...cards];
      const newlyAddedBonusIds: number[] = [];

      const pickUniqueId = () => {
        let candidate = Math.floor(Math.random() * FAST_MAX_POOL_CARTELAS) + 1;
        let attempts = 0;
        while (
          (existingIds.has(candidate) || blockedSet.has(candidate) || otherLockedSet.has(candidate)) &&
          attempts < 500
        ) {
          candidate = Math.floor(Math.random() * FAST_MAX_POOL_CARTELAS) + 1;
          attempts++;
        }
        existingIds.add(candidate);
        return candidate;
      };

      const bonusToGive = Math.min(
        bonusCartelasForOver20 - currentBonusCards.length,
        30 + bonusCartelasForOver20 - nextCards.length
      );
      for (let b = 0; b < bonusToGive; b++) {
        const bonusId = pickUniqueId();
        newlyAddedBonusIds.push(bonusId);
        nextCards.push({
          ...generateCartelaById(bonusId),
          isRegistered: true,
          isBonus: true,
        });
      }

      if (newlyAddedBonusIds.length > 0) {
        setBonusBannerText(
          `🎁 ከ20 በላይ (21+) ካርቴላ ስላስመዘገቡ +${newlyAddedBonusIds.length} ነፃ ቦነስ ካርቴላ ተሰጥቶዎታል!`
        );
      }

      return { updatedCards: nextCards, newlyAddedBonusIds, removedBonusIds: [] };
    },
    [FAST_MAX_POOL_CARTELAS, blockedCartelaIds, bonusCartelasForOver20, otherPlayersLockedCartelas]
  );

  const handleRegisterSelectedCartelas = () => {
    if (isPlaying || calledBalls.length > 0) {
      setStatusNotice('ጨዋታ ከጀመረ በኋላ ካርቴላ ማስመዝገብ አይቻልም!');
      return;
    }
    const targets = cartelas.filter(
      (c) => selectedCartelaIds.includes(c.id) && !c.isRegistered && !c.isBlocked
    );
    if (targets.length === 0) {
      setStatusNotice('ከተመረጡት ውስጥ ያልተመዘገበ ካርቴላ የለም!');
      return;
    }
    const alreadyRegisteredPaidCount = cartelas.filter((c) => c.isRegistered && !c.isBonus).length;
    const newPaidCount = targets.filter((c) => !c.isBonus).length;
    const requiredTotal = (alreadyRegisteredPaidCount + newPaidCount) * stakeAmount;
    if (currentUser.balance < requiredTotal) {
      soundFX.playErrorBuzzer();
      setStatusNotice(
        `የተመረጡትን (${targets.length}) ካርቴላዎች ለማስመዝገብ ${requiredTotal} ETB ያስፈልጋል፤ በቂ ሂሳብ የለዎትም!`
      );
      return;
    }
    const targetIdSet = new Set(targets.map((c) => c.id));
    let bonusIdsToLock: number[] = [];
    setCartelas((prev) => {
      const marked = prev.map((c) => (targetIdSet.has(c.id) ? { ...c, isRegistered: true } : c));
      const { updatedCards, newlyAddedBonusIds } = awardBonusCartelasIfRegisteredOver20(marked);
      bonusIdsToLock = newlyAddedBonusIds;
      return updatedCards;
    });
    setSelectedCartelaIds([]);
    fetch(buildApiUrl('/api/live-room/lock-cartela'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'fast',
        stakeAmount: activeStakeTier,
        action: 'register_all',
        cartelaIds: [...targets.map((c) => c.id), ...bonusIdsToLock],
        phone: currentUser?.phone || '0942742684',
        name: currentUser?.name || 'Ezana_Player',
        clientId: getDeviceClientId(),
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data?.ok && data.room) {
          if (data.fastRoomsByStake) setAllFastRoomsByStake(data.fastRoomsByStake);
          if (data.fastLockedCartelasByStake) setAllFastLockedByStake(data.fastLockedCartelasByStake);
          applyServerFastRoomSnapshot(data.room, data.lockedCartelas);
        } else {
          refreshLiveServerRoomState();
        }
      })
      .catch(() => {});
    setStatusNotice(
      `✓ የተመረጡት ${targets.length} ካርቴላዎች ተመዝግበዋል! ብሩ (${newPaidCount * stakeAmount} ETB) የሚቆረጠው ጨዋታው ሲጀምር ብቻ ነው።`
    );
  };

  const handleDeleteSelectedCartelas = () => {
    if (selectedCartelaIds.length === 0) return;
    if (isPlaying || calledBalls.length > 0) {
      setStatusNotice('ጨዋታ ከጀመረ በኋላ የተመዘገበ ካርቴላ መሰረዝ አይቻልም!');
      return;
    }
    const toRemove = cartelas.filter((c) => selectedCartelaIds.includes(c.id));
    toRemove.forEach((c) => {
      if (c.isRegistered) {
        lockOrUnlockCartelaOnServer(c.id, 'unlock');
      }
    });
    const removeSet = new Set(selectedCartelaIds);
    let droppedBonusIds: number[] = [];
    setCartelas((prev) => {
      const remaining = prev.filter((c) => !removeSet.has(c.id));
      const { updatedCards, removedBonusIds } = awardBonusCartelasIfRegisteredOver20(remaining);
      droppedBonusIds = removedBonusIds;
      return updatedCards;
    });
    droppedBonusIds.forEach((bId) => lockOrUnlockCartelaOnServer(bId, 'unlock'));
    setSelectedCartelaIds([]);
    setStatusNotice(`የተመረጡት ${toRemove.length} ካርቴላዎች ተሰርዘዋል።`);
  };

  const handleAddBatchCartelas = (requestedCount: number) => {
    setCartelas((prev) => {
      const existingIds = new Set(prev.map((c) => c.id));
      const blockedSet = new Set(blockedCartelaIds);
      const newCards: CartelaCard[] = [...prev];

      const pickUniqueId = () => {
        let candidate = Math.floor(Math.random() * FAST_MAX_POOL_CARTELAS) + 1;
        let attempts = 0;
        while ((existingIds.has(candidate) || blockedSet.has(candidate)) && attempts < 500) {
          candidate = Math.floor(Math.random() * FAST_MAX_POOL_CARTELAS) + 1;
          attempts++;
        }
        existingIds.add(candidate);
        return candidate;
      };

      const isFree = activeStakeTier === 0 || stakeAmount === 0;
      const limit = isFree ? 10 : 30;
      const slotsAvailable = Math.max(0, limit - newCards.filter((c) => !c.isBonus).length);
      const toAddPaid = Math.min(requestedCount, slotsAvailable);

      for (let i = 0; i < toAddPaid; i++) {
        const id = pickUniqueId();
        newCards.push({
          ...generateCartelaById(id),
          isRegistered: false,
          isBonus: false,
        });
      }

      return newCards;
    });
  };

  const handleAddSpecificCartela = (id: number) => {
    const isFree = activeStakeTier === 0 || stakeAmount === 0;
    const limit = isFree ? 10 : 30;
    if (cartelas.filter((c) => !c.isBonus).length >= limit) {
      if (isFree) {
        setStatusNotice('በነፃ ጨዋታ አንድ ተጫዋች እስከ 10 ካርቴላ ብቻ ነው የሚፈቀደው!');
      } else {
        setStatusNotice('ከፍተኛው የካርቴላ መጠን (30) ደርሷል!');
      }
      return;
    }
    setCartelas((prev) => {
      if (prev.some((c) => c.id === id)) return prev;
      return [
        ...prev,
        {
          ...generateCartelaById(id),
          isRegistered: false,
          isBonus: false,
        },
      ];
    });
  };

  const handleToggleRegisterCartela = (cartelaId: number) => {
    const target = cartelas.find((c) => c.id === cartelaId);
    if (!target) return;
    if (isPlaying || calledBalls.length > 0) {
      setStatusNotice('ጨዋታ ከጀመረ በኋላ ካርቴላ ምዝገባ መቀየር አይቻልም!');
      return;
    }

    // Before game starts, tapping a registered cartela simply unregisters & unlocks it (no money was deducted yet!)
    if (target.isRegistered) {
      let droppedBonusIds: number[] = [];
      setCartelas((prev) => {
        const unmarked = prev.map((c) => (c.id === cartelaId ? { ...c, isRegistered: false } : c));
        const { updatedCards, removedBonusIds } = awardBonusCartelasIfRegisteredOver20(unmarked);
        droppedBonusIds = removedBonusIds;
        return updatedCards;
      });
      lockOrUnlockCartelaOnServer(cartelaId, 'unlock');
      droppedBonusIds.forEach((bId) => lockOrUnlockCartelaOnServer(bId, 'unlock'));
      setStatusNotice(`ካርቴላ #${cartelaId} ምዝገባው ተነስቷል።`);
      return;
    }

    const alreadyRegisteredPaidCount = cartelas.filter((c) => c.isRegistered && !c.isBonus).length;
    const cost = target.isBonus ? 0 : stakeAmount;
    const requiredTotal = alreadyRegisteredPaidCount * stakeAmount + cost;
    if (currentUser.balance < requiredTotal) {
      soundFX.playErrorBuzzer();
      setStatusNotice(`በቂ ቀሪ ሂሳብ የለዎትም! ካርቴላ #${cartelaId} ለማስመዝገብ ${requiredTotal} ETB ያስፈልጋል።`);
      return;
    }
    let bonusIdsToLock: number[] = [];
    setCartelas((prev) => {
      const marked = prev.map((c) => (c.id === cartelaId ? { ...c, isRegistered: true } : c));
      const { updatedCards, newlyAddedBonusIds } = awardBonusCartelasIfRegisteredOver20(marked);
      bonusIdsToLock = newlyAddedBonusIds;
      return updatedCards;
    });
    setSelectedCartelaIds((prev) => prev.filter((id) => id !== cartelaId));
    lockOrUnlockCartelaOnServer(cartelaId, 'lock');
    bonusIdsToLock.forEach((bId) => lockOrUnlockCartelaOnServer(bId, 'lock'));
    setStatusNotice(
      `🔒 ካርቴላ #${cartelaId} ተመዝግቧል! ብሩ (${cost} ETB) የሚቆረጠው ጨዋታው ሲጀምር ብቻ ነው።`
    );
  };

  const handleRegisterAllCartelas = () => {
    if (isPlaying || calledBalls.length > 0) {
      setStatusNotice('ጨዋታ ከጀመረ በኋላ ካርቴላ ማስመዝገብ አይቻልም!');
      return;
    }
    const unregistered = cartelas.filter((c) => !c.isRegistered && !c.isBlocked);
    if (unregistered.length === 0) {
      setStatusNotice('ሁሉም ካርቴላዎች ቀድሞውኑ ተመዝግበዋል!');
      return;
    }
    const alreadyRegisteredPaidCount = cartelas.filter((c) => c.isRegistered && !c.isBonus).length;
    const paidCount = unregistered.filter((c) => !c.isBonus).length;
    const totalCost = (alreadyRegisteredPaidCount + paidCount) * stakeAmount;
    if (currentUser.balance < totalCost) {
      soundFX.playErrorBuzzer();
      setStatusNotice(`ሁሉንም (${unregistered.length}) ካርቴላዎች ለማስመዝገብ ${totalCost} ETB ያስፈልጋል!`);
      return;
    }
    let bonusIdsToLock: number[] = [];
    setCartelas((prev) => {
      const marked = prev.map((c) => (!c.isBlocked ? { ...c, isRegistered: true } : c));
      const { updatedCards, newlyAddedBonusIds } = awardBonusCartelasIfRegisteredOver20(marked);
      bonusIdsToLock = newlyAddedBonusIds;
      return updatedCards;
    });
    fetch(buildApiUrl('/api/live-room/lock-cartela'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'fast',
        stakeAmount: activeStakeTier,
        action: 'register_all',
        cartelaIds: [...unregistered.map((c) => c.id), ...bonusIdsToLock],
        phone: currentUser?.phone || '0911000001',
        name: currentUser?.name || 'Player',
        clientId: getDeviceClientId(),
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data?.ok && data.room) {
          if (data.fastRoomsByStake) setAllFastRoomsByStake(data.fastRoomsByStake);
          if (data.fastLockedCartelasByStake) setAllFastLockedByStake(data.fastLockedCartelasByStake);
          applyServerFastRoomSnapshot(data.room, data.lockedCartelas);
        } else {
          refreshLiveServerRoomState();
        }
      })
      .catch(() => {});
    setStatusNotice(
      `✓ ${unregistered.length} ካርቴላዎች ለ ${activeStakeTier} ብር ፈጣን ቢንጎ ተመዝግበዋል! ብሩ (${paidCount * stakeAmount} ETB) የሚቆረጠው ጨዋታው ሲጀምር ብቻ ነው።`
    );
  };

  const handleRemoveCartela = (cartelaId: number) => {
    if (isPlaying || calledBalls.length > 0) {
      setStatusNotice(`🔒 ጨዋታ ከጀመረ በኋላ ካርቴላ መመለስ አይቻልም።`);
      return;
    }
    const target = cartelas.find((c) => c.id === cartelaId);
    if (target?.isRegistered) {
      lockOrUnlockCartelaOnServer(cartelaId, 'unlock');
    }
    let droppedBonusIds: number[] = [];
    setCartelas((prev) => {
      const remaining = prev.filter((c) => c.id !== cartelaId);
      const { updatedCards, removedBonusIds } = awardBonusCartelasIfRegisteredOver20(remaining);
      droppedBonusIds = removedBonusIds;
      return updatedCards;
    });
    droppedBonusIds.forEach((bId) => lockOrUnlockCartelaOnServer(bId, 'unlock'));
    setSelectedCartelaIds((prev) => prev.filter((id) => id !== cartelaId));
  };

  // Synchronized Manual Daub across all player cartelas
  const handleToggleCellDaub = (cartelaId: number, row: number, col: number) => {
    if (row === 2 && col === 2) return;
    const sourceCard = cartelas.find((c) => c.id === cartelaId);
    if (!sourceCard) return;

    const clickedNumber = sourceCard.numbers[row][col];
    const targetMarkState = !sourceCard.manualMarks[row][col];
    soundFX.playDaubClick();

    setCartelas((prev) =>
      prev.map((card) => {
        const nextMarks = card.manualMarks.map((rArr, rIdx) =>
          rArr.map((currentVal, cIdx) => {
            if (rIdx === 2 && cIdx === 2) return true;
            if (card.numbers[rIdx][cIdx] === clickedNumber) {
              return targetMarkState;
            }
            return currentVal;
          })
        );
        return { ...card, manualMarks: nextMarks };
      })
    );
  };

  const handleResetDaubMarks = () => {
    setCartelas((prev) =>
      prev.map((card) => ({
        ...card,
        manualMarks: Array.from({ length: 5 }, (_, r) =>
          Array.from({ length: 5 }, (__, c) => r === 2 && c === 2)
        ),
      }))
    );
    soundFX.playClick();
    setStatusNotice('ምልክት የተደረጉ የጠቆሩ ቁጥሮች በሙሉ ጠፍተዋል (All marks reset)!');
  };

  // Strict Claim Verification for Fast Bingo (1 Line Horizontal/Vertical/Diagonal OR 4 Corners)
  // Plus 80% Derash + 15% House + 5% Jackpot (if Jackpot reaches >= 1000 ETB, the final winner takes it!)
  const handleClaimBingo = (cartela: CartelaCard) => {
    if (cartela.isBlocked || blockedCartelaIds.includes(cartela.id)) return;

    if (!isPlaying && calledBalls.length === 0) {
      setStatusNotice('ጨዋታው ገና አልጀመረም! ጨዋታ ሳይጀምር ካርቴላ አይታገድም።');
      return;
    }

    if (!cartela.isRegistered) {
      setStatusNotice(`ካርቴላ #${cartela.id} ለዚህ ዙር አልተመዘገበም! እባክዎ ያስመዝግቡ።`);
      return;
    }

    const result = verifyCartelaBingo(
      cartela,
      calledBalls,
      activeBall,
      FAST_BINGO_RULE_PATTERN
    );

    if (result.isValid && activeBall) {
      setIsPaused(true);
      setIsPlaying(false);
      soundFX.playVictoryFanfare();
      setShowConfetti(true);
      setVerificationFailure(null);

      // Calculate round jackpot accumulation (5% of total collected) and check 1000 Birr threshold
      const updatedJackpot = Number((jackpotPool + jackpotContributionBirr).toFixed(2));
      const didWinJackpot = updatedJackpot >= JACKPOT_TARGET_BIRR;
      const jackpotAward = didWinJackpot ? updatedJackpot : 0;
      const totalWinnerPayout = Number((prizeAmount + jackpotAward).toFixed(2));

      if (winnersList.length === 0) {
        setHouseEarningsTotal((prev) => Number((prev + houseShareBirr).toFixed(2)));
        if (didWinJackpot) {
          setJackpotWonInRound(jackpotAward);
          setJackpotPool(0);
          setStatusNotice(
            `🎉 ታላቅ የጃክፓት አሸናፊ! ጃክፓት ${jackpotAward.toFixed(0)} ብር ስለሞላ ከደራሹ (${prizeAmount.toFixed(0)} ETB) ጋር ጠቅላላ ${totalWinnerPayout.toFixed(0)} ETB አሸንፈዋል!`
          );
        } else {
          setJackpotWonInRound(0);
          setJackpotPool(updatedJackpot);
        }
      }

      const nowStr = new Date().toLocaleString();
      const nextWinnersCount = winnersList.some((w) => w.cartelaId === cartela.id)
        ? winnersList.length
        : winnersList.length + 1;
      const equalSharePrize = Number((totalWinnerPayout / nextWinnersCount).toFixed(2));

      const winnerObj: WinnerAnnouncement = {
        cartelaId: cartela.id,
        userName: currentUser.name,
        prizeAmount: equalSharePrize,
        winningCells: result.winningCells,
        lastBall: activeBall,
        calledBallsSnapshot: [...calledBalls],
        patternTitle: didWinJackpot
          ? `${FAST_BINGO_RULE_PATTERN.titleAm} + 🎰 ጃክፓት (${jackpotAward.toFixed(0)} ETB)`
          : FAST_BINGO_RULE_PATTERN.titleAm,
        timestamp: nowStr,
      };

      setLastVerifiedWinnerBanner(winnerObj);
      setGameFinishedAt(Date.now());
      // In Fast Bingo, count down exactly 10s from the very first bingo:
      // "በfast bingo ከመጀመርያዉ ቢንጎ ጀምሮ 10 ሰከንድ ብቻ ይቁጠር"
      if (winnerDisplayCountdown === null) {
        setWinnerDisplayCountdown(10);
      }
      setBingoCountdown(null);

      setUsers((prev) =>
        prev.map((u, idx) =>
          idx === 0 ? { ...u, balance: Number((u.balance + equalSharePrize).toFixed(2)) } : u
        )
      );

      dispatchServerRoomAction({
        mode: 'fast',
        stakeAmount: activeStakeTier,
        action: 'claim_win',
        winner: winnerObj,
        winnerPhone: currentUser?.phone || '0942742684',
        houseShareBirr,
        jackpotWonInRound: jackpotAward,
        updatedJackpotPool: didWinJackpot ? 0 : updatedJackpot,
      }).then((res) => {
        if (res && Array.isArray((res as { players?: unknown[] }).players)) {
          mergeServerPlayers((res as { players?: Parameters<typeof mergeServerPlayers>[0] }).players);
        }
        if (res && Array.isArray((res as { transactions?: TransactionRecord[] }).transactions)) {
          mergeServerTransactions((res as { transactions?: TransactionRecord[] }).transactions);
        }
      });

      setWinnersList((prev) => {
        const alreadyWon = prev.some((w) => w.cartelaId === cartela.id);
        const nextWinnersCount = alreadyWon ? prev.length : prev.length + 1;
        const equalSharePrize = Number((totalWinnerPayout / nextWinnersCount).toFixed(2));
        return alreadyWon
          ? prev
          : [
              ...prev.map((w) => ({ ...w, prizeAmount: equalSharePrize })),
              { ...winnerObj, prizeAmount: equalSharePrize },
            ];
      });

      setGameHistory((prev) => [
        {
          id: `fgh-${Date.now()}`,
          gameMatchId,
          timestamp: nowStr,
          stakeAmount,
          prizeAmount: totalWinnerPayout,
          patternTitle: winnerObj.patternTitle,
          totalBallsCalled: calledBalls.length,
          lastBall: activeBall,
          calledBallsSnapshot: [...calledBalls],
          winners: [
            {
              cartelaId: cartela.id,
              userName: currentUser.name,
              prizeAmount: totalWinnerPayout,
              winningCells: result.winningCells,
            },
          ],
        },
        ...prev,
      ]);
    } else {
      soundFX.playErrorBuzzer();
      dispatchServerRoomAction({
        mode: 'fast',
        stakeAmount: activeStakeTier,
        action: 'block_cartela',
        cartelaId: cartela.id,
      });
      setBlockedCartelaIds((prev) =>
        prev.includes(cartela.id) ? prev : [...prev, cartela.id]
      );
      setCartelas((prev) =>
        prev.map((c) => (c.id === cartela.id ? { ...c, isBlocked: true } : c))
      );
      setVerificationFailure({
        cartelaId: cartela.id,
        reasonAm: result.reasonAm,
        missingNumbers: result.missingNumbers,
        lastBallIncluded: result.lastBallIncluded,
        countdownSeconds: 30,
      });
    }
  };

  // Simulate Fast Bingo Win (either 4 Corners or 1 Horizontal Line)
  const handleSimulateFastWin = (mode: 'corners' | 'line') => {
    const firstActive = cartelas.find((c) => !c.isBlocked && c.isRegistered) || cartelas[0];
    if (!firstActive) return;
    if (!firstActive.isRegistered) {
      setCartelas((prev) =>
        prev.map((c) => (c.id === firstActive.id ? { ...c, isRegistered: true } : c))
      );
      lockOrUnlockCartelaOnServer(firstActive.id, 'lock');
    }

    const neededBalls: number[] =
      mode === 'corners'
        ? [
            firstActive.numbers[0][0],
            firstActive.numbers[0][4],
            firstActive.numbers[4][0],
            firstActive.numbers[4][4],
          ]
        : [
            firstActive.numbers[2][0],
            firstActive.numbers[2][1],
            firstActive.numbers[2][3],
            firstActive.numbers[2][4],
          ];

    const lastActive = neededBalls[neededBalls.length - 1];
    dispatchServerRoomAction({
      mode: 'fast',
      stakeAmount: activeStakeTier,
      action: 'force_balls',
      forcedBalls: neededBalls,
      lastBall: lastActive,
    });
    setIsPlaying(true);
    setCalledBalls((prev) => Array.from(new Set([...prev, ...neededBalls])));
    setActiveBall(lastActive);
    soundFX.speakBall(lastActive, voiceEnabled, language, callSpeedSec);
    setActiveTab('game');
  };

  // Generate & Download Combined 2-in-1 App HTML File (Ezi-All-In-One-Bingo-App.html) that includes BOTH Fast Bingo & Regular Bingo
  const handleDownloadCombinedBothAppsFile = async () => {
    setDownloadStatus('ሁለቱም ጨዋታዎች (ፈጣን ቢንጎ + መደበኛ ኢዚ ቢንጎ) አንድ ላይ ያሉበትን ፋይል በማዘጋጀት ላይ...');
    try {
      let baseHtml = '';
      try {
        const res = await fetch(buildApiUrl('/Ezi-Bingo-App.html'), { cache: 'no-store' });
        if (res.ok) {
          const text = await res.text();
          if (text && text.length > 50000) baseHtml = text;
        }
      } catch {
        // fallback to current document
      }
      if (!baseHtml) {
        baseHtml = '<!DOCTYPE html>\n' + document.documentElement.outerHTML;
      }
      const combinedHtml = baseHtml
        .replace('window.__EZI_FAST_BINGO_ONLY__ = true;', 'window.__EZI_FAST_BINGO_ONLY__ = false;')
        .replace(/<title>.*?<\/title>/i, '<title>Ezi Bingo & Fast Bingo (ሁለቱም አንድ ላይ)</title>');

      const blob = new Blob([combinedHtml], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Ezi-All-In-One-Bingo-App.html';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setDownloadStatus(
        '✓ ሁለቱም አንድ ላይ ያሉበት ፋይል (Ezi-All-In-One-Bingo-App.html) ወርዷል! በቴሌግራም (📎 File) ሲልኩት ተጫዋቾች ከላይ ባለው ቁልፍ ፈጣን ቢንጎን እና መደበኛ ኢዚ ቢንጎን እየቀያየሩ መጫወት ይችላሉ!'
      );
    } catch {
      setDownloadStatus('ፋይሉን ማውረድ አልተቻለም።');
    }
  };

  // Generate & Download Standalone Fast Bingo App HTML File (Ezi-Fast-Bingo-App.html)
  const handleDownloadFastBingoStandaloneFile = async () => {
    setDownloadStatus('የፈጣን ቢንጎ አፕ ፋይል በማዘጋጀት ላይ...');
    try {
      let baseHtml = '';
      try {
        const res = await fetch(buildApiUrl('/Ezi-Bingo-App.html'), { cache: 'no-store' });
        if (res.ok) {
          const text = await res.text();
          if (text && text.length > 50000) baseHtml = text;
        }
      } catch {
        // fallback to current document
      }
      if (!baseHtml) {
        baseHtml = '<!DOCTYPE html>\n' + document.documentElement.outerHTML;
      }
      const fastBootScript = `<script>window.__EZI_FAST_BINGO_ONLY__ = true;</script>`;
      const customizedHtml = baseHtml
        .replace('<head>', `<head>\n${fastBootScript}`)
        .replace(/<title>.*?<\/title>/i, '<title>Ezi Fast Bingo (ኢዚ ፈጣን ቢንጎ)</title>');

      const blob = new Blob([customizedHtml], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Ezi-Fast-Bingo-App.html';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setDownloadStatus(
        '✓ ራሱን የቻለው የፈጣን ቢንጎ አፕ ፋይል (Ezi-Fast-Bingo-App.html) ወርዷል! በቴሌግራም፣ ዋትስአፕ ወይም ብሉቱዝ ለሌላ ስልክ መላክ ይችላሉ!'
      );
    } catch {
      setDownloadStatus('ፋይሉን ማውረድ አልተቻለም።');
    }
  };

  const accentTheme = useMemo(() => {
    switch (accentColor) {
      case 'emerald':
        return {
          headerBorder: isDark ? 'border-emerald-500/30' : 'border-emerald-300',
          logoBg: 'from-emerald-400 via-teal-500 to-cyan-600 shadow-emerald-500/20',
          titleGrad: 'from-emerald-400 via-teal-400 to-cyan-400',
          badgeBg: 'bg-emerald-500 text-slate-950',
          settingsBtn: isDark
            ? 'bg-slate-800 border-emerald-500/40 text-emerald-400 hover:bg-slate-700'
            : 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100',
        };
      case 'blue':
        return {
          headerBorder: isDark ? 'border-blue-500/30' : 'border-blue-300',
          logoBg: 'from-blue-400 via-indigo-500 to-purple-600 shadow-blue-500/20',
          titleGrad: 'from-blue-400 via-indigo-400 to-purple-400',
          badgeBg: 'bg-blue-500 text-white',
          settingsBtn: isDark
            ? 'bg-slate-800 border-blue-500/40 text-blue-400 hover:bg-slate-700'
            : 'bg-blue-50 border-blue-300 text-blue-800 hover:bg-blue-100',
        };
      case 'rose':
        return {
          headerBorder: isDark ? 'border-rose-500/30' : 'border-rose-300',
          logoBg: 'from-rose-400 via-pink-500 to-red-600 shadow-rose-500/20',
          titleGrad: 'from-rose-400 via-pink-400 to-red-400',
          badgeBg: 'bg-rose-500 text-white',
          settingsBtn: isDark
            ? 'bg-slate-800 border-rose-500/40 text-rose-400 hover:bg-slate-700'
            : 'bg-rose-50 border-rose-300 text-rose-800 hover:bg-rose-100',
        };
      case 'purple':
        return {
          headerBorder: isDark ? 'border-purple-500/30' : 'border-purple-300',
          logoBg: 'from-purple-400 via-fuchsia-500 to-indigo-600 shadow-purple-500/20',
          titleGrad: 'from-purple-400 via-fuchsia-400 to-indigo-400',
          badgeBg: 'bg-purple-500 text-white',
          settingsBtn: isDark
            ? 'bg-slate-800 border-purple-500/40 text-purple-400 hover:bg-slate-700'
            : 'bg-purple-50 border-purple-300 text-purple-800 hover:bg-purple-100',
        };
      case 'cyan':
        return {
          headerBorder: isDark ? 'border-cyan-500/30' : 'border-cyan-300',
          logoBg: 'from-cyan-400 via-sky-500 to-blue-600 shadow-cyan-500/20',
          titleGrad: 'from-cyan-400 via-sky-400 to-blue-400',
          badgeBg: 'bg-cyan-400 text-slate-950',
          settingsBtn: isDark
            ? 'bg-slate-800 border-cyan-500/40 text-cyan-400 hover:bg-slate-700'
            : 'bg-cyan-50 border-cyan-300 text-cyan-800 hover:bg-cyan-100',
        };
      default:
        return {
          headerBorder: isDark ? 'border-amber-500/30' : 'border-slate-300',
          logoBg: isDark
            ? 'from-amber-400 via-orange-500 to-rose-600 shadow-amber-500/20'
            : 'from-amber-500 via-orange-500 to-amber-600 shadow-sm',
          titleGrad: isDark
            ? 'from-amber-400 via-orange-400 to-rose-400'
            : 'from-slate-900 via-slate-800 to-amber-800',
          badgeBg: isDark
            ? 'bg-amber-500 text-slate-950'
            : 'bg-amber-100 text-amber-900 border border-amber-300',
          settingsBtn: isDark
            ? 'bg-slate-800 border-amber-500/40 text-amber-400 hover:bg-slate-700'
            : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-100 shadow-2xs',
        };
    }
  }, [accentColor, isDark]);

  useEffect(() => {
    if (!statusNotice) return;
    const timer = setTimeout(() => {
      setStatusNotice(null);
    }, 10000);
    return () => clearTimeout(timer);
  }, [statusNotice]);

  useEffect(() => {
    if (!bonusBannerText) return;
    const timer = setTimeout(() => {
      setBonusBannerText(null);
    }, 10000);
    return () => clearTimeout(timer);
  }, [bonusBannerText]);

  return (
    <div
      className={`min-h-screen pb-24 transition-colors ${
        isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'
      }`}
    >
      {/* Top 10-Second Notification Toast Banner (ማሳወቂያ ከላይ ለ10 ሰከንድ እንዲታይ) */}
      {(statusNotice || bonusBannerText) && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-lg space-y-2 pointer-events-auto">
          {statusNotice && (
            <div className="rounded-2xl border-2 border-amber-400 bg-slate-950/95 text-white px-4 py-2.5 shadow-2xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-2 text-xs sm:text-sm font-extrabold text-amber-300 min-w-0">
                <Bell className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="break-words">{statusNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => setStatusNotice(null)}
                className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer shrink-0"
              >
                ✕
              </button>
            </div>
          )}

          {bonusBannerText && (
            <div className="rounded-2xl border-2 border-emerald-400 bg-slate-950/95 text-white px-4 py-2.5 shadow-2xl flex items-center justify-between gap-3">
              <div className="text-xs sm:text-sm font-extrabold text-emerald-300">
                {bonusBannerText}
              </div>
              <button
                type="button"
                onClick={() => setBonusBannerText(null)}
                className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer shrink-0"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      )}
      {/* Dedicated Fast Bingo Top Sticky Header */}
      <header
        className={`sticky top-0 z-30 border-b backdrop-blur-md px-3 sm:px-6 py-2.5 ${
          isDark ? 'bg-slate-900/95' : 'bg-white/95'
        } ${accentTheme.headerBorder}`}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          {/* Brand Logo for Ezi Fast Bingo (Tap logo 5 times to open Fast Bingo Admin) */}
          <div
            onClick={() => {
              setActiveTab('game');
            }}
            className="cursor-pointer flex items-center gap-2.5 select-none"
          >
            <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${accentTheme.logoBg} text-slate-950 flex items-center justify-center font-black shadow-md`}>
              <Zap className="w-6 h-6 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className={`text-base sm:text-lg font-black tracking-tight bg-gradient-to-r ${accentTheme.titleGrad} bg-clip-text text-transparent`}>
                  Sun Fast Bingo
                </span>
                <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${accentTheme.badgeBg}`}>
                  {t.fastBingoBadge}
                </span>
              </div>
              <div className="text-[10px] font-bold opacity-75 hidden sm:block">
                {isPostTwoMinutes ? 'ገና አልተሰየመም' : t.fastRuleSubtitle}
              </div>
            </div>
          </div>

          {/* Right Header Controls (All in 1 single line) */}
          <div className="flex items-center gap-1 sm:gap-1.5 whitespace-nowrap overflow-x-auto no-scrollbar">
            {onSwitchToRegularApp && !isStandaloneFastOnly && (
              <button
                type="button"
                onClick={onSwitchToRegularApp}
                className={`px-2 py-1 rounded-lg border text-[11px] font-extrabold flex items-center gap-1 cursor-pointer transition-colors shrink-0 ${
                  isDark
                    ? 'bg-slate-800 border-slate-700 text-emerald-400 hover:bg-slate-700'
                    : 'bg-slate-100 border-slate-200 text-emerald-700 hover:bg-slate-200'
                }`}
                title="ወደ መደበኛው Sun Bingo ተመለስ"
              >
                <Gamepad2 className="w-3.5 h-3.5" />
                <span className="hidden md:inline">{t.regularAppBtn}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsProvablyFairModalOpen(true)}
              className={`px-2 py-1 rounded-lg border text-[11px] font-extrabold flex items-center gap-1 cursor-pointer transition-colors shrink-0 ${
                isDark
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-400 hover:bg-emerald-900/50'
                  : 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100'
              }`}
              title="Provably Fair (SHA-256)"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>{t.fairBtn}</span>
            </button>


            <button
              type="button"
              onClick={() => setIsSettingsModalOpen(true)}
              className={`px-2 py-1 rounded-lg border text-[11px] font-extrabold flex items-center gap-1 cursor-pointer transition-colors shrink-0 ${accentTheme.settingsBtn}`}
              title={t.settings}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>{t.settings}</span>
            </button>

            {isPhoneRegistered && (
              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem('ezi_phone_registered_v2');
                  setIsPhoneRegistered(false);
                  setActiveTab('game');
                }}
                className={`px-2 py-1 rounded-lg border text-[11px] font-extrabold flex items-center gap-1 cursor-pointer transition-colors shrink-0 ${
                  isDark
                    ? 'bg-rose-950/60 border-rose-500/40 text-rose-400 hover:bg-rose-900/50'
                    : 'bg-rose-50 border-rose-300 text-rose-800 hover:bg-rose-100'
                }`}
                title={t.logoutBtn}
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{t.logoutBtn}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsDark(!isDark)}
              className={`p-1.5 rounded-lg border transition-colors cursor-pointer shrink-0 ${
                isDark
                  ? 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700'
                  : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-6 pt-3 space-y-4">
        {/* Player Auth Screen (Log In / Sign Up with OTP + Password / Forgot Password) */}
        {!isPhoneRegistered && activeTab !== 'admin' && !isAdminAuthenticated && (
          <PlayerAuthScreen
            isDark={isDark}
            appTitle={`${t.appName} (${t.fastBingoBadge})`}
            onAuthSuccess={(player, allPlayers) => {
              setIsPhoneRegistered(true);
              setUsers((prev) => {
                const me = prev[0];
                const updatedMe: UserAccount = {
                  ...(me || {
                    id: player.id || `u-${player.phone}`,
                    referralCode: `EZI${player.phone.slice(-4)}`,
                    referredCount: 0,
                    referralEarnings: 0,
                    isBlocked: false,
                    isAdmin: false,
                    joinedAt: new Date().toISOString().slice(0, 10),
                  }),
                  name: player.name,
                  phone: player.phone,
                  passwordHash: player.passwordHash || me?.passwordHash || '****',
                  balance: typeof player.balance === 'number' ? player.balance : me?.balance ?? 15,
                  bonusBalance:
                    typeof player.bonusBalance === 'number'
                      ? player.bonusBalance
                      : me?.bonusBalance ?? 15,
                };
                return [updatedMe, ...prev.slice(1).filter((u) => u.phone !== player.phone)];
              });
              if (Array.isArray(allPlayers) && allPlayers.length > 0) {
                mergeServerPlayers(
                  allPlayers.map((p) => ({
                    id: p.id || `u-${p.phone}`,
                    phone: p.phone,
                    name: p.name,
                    balance: p.balance ?? 15,
                    bonusBalance: p.bonusBalance ?? 15,
                    referralEarnings: p.referralEarnings ?? 0,
                    referredCount: p.referredCount ?? 0,
                    isBlocked: p.isBlocked ?? false,
                  }))
                );
              }
              refreshLiveServerRoomState();
              soundFX.playVictoryFanfare();
              setStatusNotice(`🎉 ${player.name} (${player.phone})!`);
            }}
            onOpenAdminPortal={() => {
              if (
                typeof window !== 'undefined' &&
                localStorage.getItem('ezi_admin_authenticated_v2') === 'true'
              ) {
                setIsAdminAuthenticated(true);
              }
              setActiveTab('admin');
            }}
          />
        )}

        {/* VIEW 1: FAST BINGO GAME ARENA (4-ROOM LOBBY OR SELECTED STAKE ROOM) */}
        {activeTab === 'game' && (
          <div className="space-y-4">
            {selectedStakeRoom === null ? (
              /* 4 INDEPENDENT STAKE ROOMS LOBBY (10, 20, 50, 100 ETB) - WITH EZI BINGO HERO BANNER CARD */
              <div className="max-w-xl mx-auto space-y-4 py-2">
                {/* Ezi Bingo Hero Banner Card (Configurable via Admin Hero Banners & Ads with Text & Image) */}
                {(() => {
                  const activeBanner =
                    heroBanners.find((b) => b.isActive) || heroBanners[0];
                  return (
                    <div className="relative overflow-hidden rounded-3xl border border-blue-500/30 bg-gradient-to-br from-[#14204b] via-[#0d1636] to-[#070b19] p-4 sm:p-5 text-white shadow-2xl flex items-center justify-between gap-3">
                      {activeBanner?.imageUrl && (
                        <div className="absolute inset-0 z-0">
                          <img
                            src={activeBanner.imageUrl}
                            alt={activeBanner.title}
                            className="w-full h-full object-cover opacity-35"
                          />
                          <div className="absolute inset-0 bg-gradient-to-r from-[#0d1636]/95 via-[#0d1636]/75 to-transparent" />
                        </div>
                      )}

                      {/* Left: Badge, Title, and Subtitle */}
                      <div className="relative z-10 space-y-1.5 min-w-0 flex-1">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-400 text-[11px] sm:text-xs font-extrabold">
                          <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>{activeBanner?.badgeText || t.heroBadge75Ball}</span>
                        </div>
                        <h2 className="text-lg sm:text-xl font-black tracking-tight text-white truncate">
                          {activeBanner?.title || t.heroTitleLive}
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-300/90 font-semibold leading-snug line-clamp-2">
                          {activeBanner?.subtitle || t.heroSubLive}
                        </p>
                      </div>

                      {/* Right: Custom Uploaded Image Thumbnail OR 3D Ezi Bingo Metallic Emblem */}
                      {activeBanner?.imageUrl ? (
                        <div className="relative z-10 shrink-0 w-24 h-20 sm:w-28 sm:h-24 rounded-2xl overflow-hidden border-2 border-white/30 shadow-xl">
                          <img
                            src={activeBanner.imageUrl}
                            alt={activeBanner.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="relative z-10 shrink-0 flex flex-col items-center justify-center select-none pl-1">
                          <div className="flex items-center gap-1.5 tracking-tight font-black italic leading-none text-2xl sm:text-3xl">
                            <span
                              className="px-2.5 py-1 rounded-xl bg-gradient-to-b from-amber-300 via-amber-500 to-amber-700 text-white shadow-lg border-2 border-white"
                              style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}
                            >
                              Sun
                            </span>
                            <span
                              className="px-2.5 py-1 rounded-xl bg-gradient-to-b from-emerald-400 via-green-500 to-green-700 text-white shadow-lg border-2 border-white"
                              style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}
                            >
                              Bingo
                            </span>
                          </div>
                          <div className="flex items-center w-full gap-1.5 mt-2 px-1">
                            <div className="h-1 flex-1 rounded-full bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.8)]" />
                            <div className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.9)]" />
                            <div className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.9)]" />
                            <div className="h-1 flex-1 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* 4 Independent Stake Room Rows (10, 20, 50, 100 ETB) with Individual Bottom ቦነስ Bar */}
                <div className="space-y-3">
                  {([10, 20, 50, 100] as const).map((tier) => {
                    const rm = allFastRoomsByStake[tier];
                    const lk = allFastLockedByStake[tier] || [];
                    const myCardsInTier = (cartelasByStake[tier] || []).filter(
                      (c) => c.isRegistered
                    ).length;
                    const myClientId = getDeviceClientId();
                    const myPhone = (currentUser?.phone || '').trim();
                    const othersInTier = lk.filter((item) => {
                      const isMe =
                        (item.clientId && item.clientId === myClientId) ||
                        (myPhone && item.ownerPhone && item.ownerPhone.trim() === myPhone);
                      return !isMe;
                    }).length;
                    const totalCardsInTier = Math.max(
                      rm?.registeredCartelasCount ?? 0,
                      othersInTier + myCardsInTier
                    );
                    const isTierPlaying = Boolean(rm?.isPlaying);
                    const tierCountdown = rm?.preGameCountdown ?? null;
                    const tierBallsCount = rm?.calledBalls?.length ?? 0;

                    // Independent Bonus / Jackpot progress per stake room (10, 20, 50, 100) - 0 to 500 ETB
                    const baseTierBonusMap: Record<10 | 20 | 50 | 100, number> = {
                      10: 380,
                      20: 290,
                      50: 170,
                      100: 360,
                    };
                    const tierBonusGoal = 500;
                    const tierLiveContribution = Number((totalCardsInTier * tier * 0.05).toFixed(0));
                    const tierBonusAmount = Math.min(
                      tierBonusGoal,
                      baseTierBonusMap[tier] + tierLiveContribution
                    );
                    const tierBonusPct = Math.max(
                      4,
                      Math.min(100, (tierBonusAmount / tierBonusGoal) * 100)
                    );

                    const rowGradient =
                      tier === 10
                        ? 'from-purple-900/90 via-indigo-950/95 to-slate-900 border-purple-500/50 hover:border-purple-400'
                        : tier === 20
                        ? 'from-fuchsia-900/90 via-purple-950/95 to-slate-900 border-fuchsia-500/50 hover:border-fuchsia-400'
                        : tier === 50
                        ? 'from-indigo-900/90 via-violet-950/95 to-slate-900 border-indigo-400/50 hover:border-indigo-300'
                        : 'from-amber-900/90 via-purple-950/95 to-slate-900 border-amber-400/60 hover:border-amber-300';

                    return (
                      <div
                        key={tier}
                        onClick={() => handleEnterStakeRoom(tier)}
                        className={`group relative overflow-hidden rounded-2xl border-2 bg-gradient-to-r ${rowGradient} text-white shadow-xl transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer`}
                      >
                        {/* Top Main Row Content */}
                        <div className="p-4 grid grid-cols-3 items-center gap-2">
                          {/* Left: Stake Amount */}
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex flex-col items-center justify-center shadow-inner">
                              <span className="text-lg font-black font-mono-tabular leading-none text-amber-300">
                                {tier}
                              </span>
                              <span className="text-[9px] font-extrabold uppercase opacity-80 mt-0.5">
                                {t.currencyBirr}
                              </span>
                            </div>
                            <div>
                              <div className="text-sm sm:text-base font-black">
                                {t.stakeTierTitle
                                  ? `${t.stakeTierTitle} ${tier} ${t.currencyBirr}`
                                  : `${tier} ${t.currencyBirr}`}
                              </div>
                              <div className="text-[11px] text-purple-200/80 font-bold">
                                500 {t.cartela} · ({totalCardsInTier} {t.registered})
                              </div>
                            </div>
                          </div>

                          {/* Center: Live Status (Active / Countdown / Waiting) */}
                          <div className="flex flex-col items-center justify-center text-center">
                            {isTierPlaying ? (
                              <span className="px-2.5 py-1 rounded-lg bg-rose-500/25 border border-rose-400/50 text-rose-300 text-xs font-black font-mono-tabular">
                                Active ({tierBallsCount}/75)
                              </span>
                            ) : tierCountdown !== null ? (
                              <span className="px-2.5 py-1 rounded-lg bg-amber-500/25 border border-amber-400 text-amber-300 text-xs font-black font-mono-tabular">
                                00:{String(tierCountdown).padStart(2, '0')}s
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-extrabold">
                                {t.roomOpenStatus}
                              </span>
                            )}
                            {myCardsInTier > 0 && (
                              <span className="text-[10px] text-amber-300 font-extrabold mt-1">
                                {t.yourCardsLabel}: {myCardsInTier} {t.cartela}
                              </span>
                            )}
                          </div>

                          {/* Right: Play Button */}
                          <div className="flex items-center justify-end">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEnterStakeRoom(tier);
                              }}
                              className="px-4 py-2 rounded-xl bg-gradient-to-b from-amber-300 via-amber-400 to-orange-500 hover:from-amber-200 hover:to-orange-400 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-lg cursor-pointer shrink-0"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                              <span>Play</span>
                            </button>
                          </div>
                        </div>

                        {/* Bottom Attached Individual ቦነስ Progress Bar Strip */}
                        <div className="relative h-6 w-full bg-slate-950/80 border-t border-amber-500/30 overflow-hidden flex items-center justify-center">
                          {/* Yellow/Amber Filled Progress Bar */}
                          <div
                            className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-400 transition-all duration-500"
                            style={{ width: `${tierBonusPct}%` }}
                          />
                          {/* Centered Label: ቦነስ: X / 1000 ETB */}
                          <div
                            className="relative z-10 flex items-center gap-1.5 text-[11px] sm:text-xs font-black tracking-wide text-white"
                            style={{ textShadow: '0 1px 3px rgba(0,0,0,0.95)' }}
                          >
                            <Sparkles className="w-3.5 h-3.5 text-amber-200 shrink-0 drop-shadow" />
                            <span>{t.bonusWord}:</span>
                            <span className="font-mono-tabular">
                              {tierBonusAmount} / {tierBonusGoal} ETB
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* INSIDE SELECTED STAKE ROOM (10, 20, 50, or 100 ETB): 500 CARTELAS + STICKY CALLER BOARD WHEN GAME STARTS */
              <div className="relative space-y-3">
                {/* Overlaid Floating Back Icon Button (ተደርባ ትሁን — takes zero vertical space!) */}
                <button
                  type="button"
                  onClick={() => {
                    // Simply navigate back to the rooms lobby WITHOUT forfeiting or clearing registered cartelas!
                    setSelectedStakeRoom(null);
                  }}
                  className={`fixed top-14 left-2 sm:left-4 z-40 w-8 h-8 rounded-full border flex items-center justify-center cursor-pointer transition-all shadow-lg backdrop-blur-md active:scale-95 ${
                    isDark
                      ? 'bg-slate-900/85 border-amber-500/50 text-amber-400 hover:bg-slate-800'
                      : 'bg-white/90 border-slate-300 text-slate-800 hover:bg-slate-100'
                  }`}
                  title="ተመለስ (Back)"
                  aria-label="ተመለስ (Back)"
                >
                  <ArrowLeft className="w-4 h-4 stroke-[2.75]" />
                </button>

                {/* Pre-Game ቦነስ Progress Bar (Shown ONLY before the game starts; disappears once the game starts!) */}
                {!isPlaying && calledBalls.length === 0 && (
                  <div
                    className={`rounded-2xl border pl-10 pr-3 sm:px-4 py-2 flex items-center justify-between gap-2.5 shadow-md ${
                      isDark
                        ? 'bg-[#171c28] border-amber-500/30 text-amber-400'
                        : 'bg-slate-900 border-amber-500/40 text-amber-400'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 shrink-0 font-black text-xs sm:text-sm">
                      <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>{t.bonusWord}</span>
                    </div>

                    <div className="flex-1 h-2.5 rounded-full bg-slate-950 border border-amber-500/25 relative overflow-hidden flex items-center px-0.5">
                      <div
                        className="h-1.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-300"
                        style={{
                          width: `${Math.max(
                            3,
                            Math.min(100, (projectedJackpotTotal / 1000) * 100)
                          )}%`,
                        }}
                      />
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)] shrink-0 -ml-1" />
                    </div>

                    <div className="font-mono-tabular font-black text-xs sm:text-sm text-amber-400 shrink-0">
                      {Math.round(projectedJackpotTotal)} / 1000 ETB
                    </div>
                  </div>
                )}

                {/* 1 TO 500 CARTELA NUMBER PICKER BOARD - SHOWN BEFORE THE GAME STARTS, HIDDEN ONCE THE GAME STARTS! */}
                {!isPlaying && calledBalls.length === 0 && (
                  <FastCartela500GridPicker
                    maxCartelas={FAST_MAX_POOL_CARTELAS}
                    language={language}
                    selectedCartelaIds={cartelas.map((c) => c.id)}
                    registeredCartelaIds={cartelas.filter((c) => c.isRegistered).map((c) => c.id)}
                    blockedCartelaIds={blockedCartelaIds}
                    otherPlayersLockedCartelas={otherPlayersLockedCartelas}
                    onlinePlayersCount={onlinePlayersCount}
                    preGameCountdown={preGameCountdown}
                    activePlayersCount={totalJoinedPlayersCount}
                    isPlaying={isPlaying}
                    isAdminMode={isAdminAuthenticated}
                    onToggleCartelaNumber={(num) => {
                      const lockedByOther = otherPlayersLockedCartelas.find(
                        (item) => item.cartelaId === num
                      );
                      if (lockedByOther) {
                        soundFX.playErrorBuzzer();
                        return;
                      }
                      const existingCard = cartelas.find((c) => c.id === num);
                      if (existingCard) {
                        if (isPlaying || calledBalls.length > 0) {
                          return;
                        }
                        handleRemoveCartela(num);
                        lockOrUnlockCartelaOnServer(num, 'unlock');
                      } else {
                        handleAddSpecificCartela(num);
                      }
                    }}
                    onRefreshBoard={() => {
                      refreshLiveServerRoomState();
                    }}
                    onConfirmSelectNumbers={() => {
                      if (cartelas.length === 0) {
                        return;
                      }
                      handleRegisterAllCartelas();
                    }}
                    onSimulateOtherPlayerLock={() => {
                      fetch(buildApiUrl('/api/live-room/simulate-other-player'), {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ stakeAmount: activeStakeTier }),
                      })
                        .then((r) => r.json())
                        .then((data) => {
                          if (data?.ok) {
                            refreshLiveServerRoomState();
                          }
                        })
                        .catch(() => {});
                    }}
                    onStartGame={() => {
                      if (activePlayersCartelasCount < 2) {
                        return;
                      }
                      setPreGameCountdown(null);
                      setIsPlaying(true);
                      setIsPaused(false);
                      dispatchServerRoomAction({
                        mode: 'fast',
                        stakeAmount: activeStakeTier,
                        action: 'play',
                      });
                    }}
                  />
                )}

                {/* STICKY GAME HEADER + 75-BALL MASTER BOARD:
                    - Appears ONLY when the game starts (isPlaying || calledBalls.length > 0)
                    - Pinned/Sticky at the top (sticky top-[54px] z-20) so it does not slide up/down when scrolling;
                      instead, the cartela cards scroll smoothly underneath it!
                    - Show More / Show Less works right inside this sticky board. */}
                {(isPlaying || calledBalls.length > 0) && (
                  <div
                    className={`sticky top-[42px] sm:top-[44px] z-30 pt-1 pb-1.5 space-y-2 shadow-lg transition-colors ${
                      isDark ? 'bg-[#050B16] border-b border-slate-800/80' : 'bg-slate-100 border-b border-slate-200'
                    }`}
                  >
                    {/* Compact Game Status Header Card (#RND-10 | (Win) 16 | መመሪያ | 2 players | 10 stake | 2 Balls Out) */}
                    <div
                      className={`rounded-2xl border pl-9 pr-2 sm:px-3 py-1.5 shadow-lg ${
                        isDark
                          ? 'bg-[#171c28] border-slate-800/90 text-slate-100'
                          : 'bg-slate-900 border-slate-800 text-slate-100'
                      }`}
                    >
                      <div className="grid grid-cols-6 items-center divide-x divide-slate-800/90 text-center">
                        {/* 1. #RND-10 */}
                        <div className="px-1 flex flex-col items-center justify-center">
                          <span className="text-[9px] font-semibold text-slate-400 leading-tight">
                            {t.gameLabel}
                          </span>
                          <span className="text-[10px] sm:text-xs font-extrabold font-mono-tabular text-white leading-tight truncate max-w-full">
                            #RND-{activeStakeTier}
                          </span>
                        </div>

                        {/* 2. (Win) 16 */}
                        <div className="px-1 flex flex-col items-center justify-center">
                          <span className="text-[9px] font-semibold text-slate-400 leading-none">
                            (Win)
                          </span>
                          <span className="text-[11px] sm:text-xs font-extrabold font-mono-tabular text-amber-400 leading-tight mt-0.5">
                            {Math.round(prizeAmount)}
                          </span>
                        </div>

                        {/* 3. መመሪያ */}
                        <div className="px-1 flex flex-col items-center justify-center">
                          <button
                            type="button"
                            onClick={() => setIsRuleModalOpen(true)}
                            className="flex flex-col items-center justify-center cursor-pointer group"
                            title={t.rulesGuideLabel}
                          >
                            <span className="text-[9px] font-extrabold text-amber-400 leading-tight">
                              {t.rulesGuideLabel}
                            </span>
                            <span className="mt-0.5 w-5 h-5 rounded-lg bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400 group-hover:bg-amber-500/25 transition-colors">
                              <Sparkles className="w-3 h-3" />
                            </span>
                          </button>
                        </div>

                        {/* 4. 2 players */}
                        <div className="px-1 flex flex-col items-center justify-center">
                          <span className="text-[11px] sm:text-xs font-extrabold font-mono-tabular text-white leading-tight">
                            {activePlayersCartelasCount}
                          </span>
                          <span className="text-[9px] font-semibold text-slate-400 leading-none">
                            players
                          </span>
                        </div>

                        {/* 5. 10 stake */}
                        <div className="px-1 flex flex-col items-center justify-center">
                          <span className="text-[11px] sm:text-xs font-extrabold font-mono-tabular text-white leading-tight">
                            {stakeAmount}
                          </span>
                          <span className="text-[9px] font-semibold text-slate-400 leading-none">
                            stake
                          </span>
                        </div>

                        {/* 6. Balls Out / ተጠናቋል */}
                        <div className="px-1 flex flex-col items-center justify-center">
                          {winnersList.length > 0 || calledBalls.length >= 75 ? (
                            <>
                              <span className="text-[10px] sm:text-[11px] font-black text-emerald-400 leading-tight">
                                ተጠናቋል!
                              </span>
                              <span className="text-[8px] sm:text-[8.5px] font-semibold text-slate-400 leading-none whitespace-nowrap">
                                {calledBalls.length} Balls
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="text-[11px] sm:text-xs font-extrabold font-mono-tabular text-amber-400 leading-tight">
                                {calledBalls.length}
                              </span>
                              <span className="text-[8.5px] sm:text-[9px] font-semibold text-slate-400 leading-none whitespace-nowrap">
                                Balls Out
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 75-BALL MASTER BOARD (Shown ONLY when game starts, pinned inside the sticky top container with Show More / Show Less!) */}
                    <MasterBoard75
                      calledBalls={calledBalls}
                      activeBall={activeBall}
                      isPlaying={isPlaying}
                      isPaused={isPaused}
                      callSpeedSec={callSpeedSec}
                      isFastBingoMode={true}
                      voiceEnabled={voiceEnabled}
                      sfxEnabled={sfxEnabled}
                      autoDaub={autoDaub}
                      isSelectModeActive={false}
                      selectedCartelasCount={0}
                      isAdminMode={isAdminAuthenticated}
                      language={language}
                      isDark={isDark}
                      currentUserName={currentUser?.name}
                      adminRoomMessage={allFastRoomsByStake[activeStakeTier]?.adminRoomMessage || ''}
                      adminRoomMessageAt={allFastRoomsByStake[activeStakeTier]?.adminRoomMessageAt || ''}
                      gamePatternName={isPostTwoMinutes ? 'ገና አልተሰየመም' : 'ፈጣን ቢንጎ'}
                      isGameFinished={Boolean(winnersList.length > 0 || (calledBalls.length >= 75 && !isPlaying) || gameFinishedAt !== null)}
                      winningCartelaIds={winnersList.map((w) => w.cartelaId)}
                      blockedCartelaIds={blockedCartelaIds}
                      bingoCountdown={bingoCountdown}
                      onUpdateAdminRoomMessage={(msgText) => {
                        dispatchServerRoomAction({
                          mode: 'fast',
                          stakeAmount: activeStakeTier,
                          action: 'set_admin_message',
                          adminMessage: msgText,
                          applyAllRooms: true,
                        });
                      }}
                      onToggleVoice={() => {
                        const next = !voiceEnabled;
                        setVoiceEnabled(next);
                        soundFX.setVoiceEnabled(next);
                      }}
                      onToggleSfx={() => {
                        const next = !sfxEnabled;
                        setSfxEnabled(next);
                        soundFX.setSfxEnabled(next);
                      }}
                      onToggleAutoDaub={() => setAutoDaub(!autoDaub)}
                      onRefreshState={() => {
                        refreshLiveServerRoomState();
                        setStatusNotice(`${activeStakeTier} ${t.currencyBirr} - ${t.refreshBtn}!`);
                      }}
                      onChangeSpeed={(spd) => {
                        setCallSpeedSec(spd);
                        dispatchServerRoomAction({
                          mode: 'fast',
                          stakeAmount: activeStakeTier,
                          action: 'set_speed',
                          callSpeedSec: spd,
                        });
                      }}
                      onTogglePause={() => {
                        if (!isPlaying) {
                          setPreGameCountdown(null);
                          setIsPlaying(true);
                          setIsPaused(false);
                          dispatchServerRoomAction({
                            mode: 'fast',
                            stakeAmount: activeStakeTier,
                            action: 'play',
                          });
                        } else {
                          setIsPaused(!isPaused);
                          dispatchServerRoomAction({
                            mode: 'fast',
                            stakeAmount: activeStakeTier,
                            action: 'toggle_pause',
                          });
                        }
                      }}
                      onDrawNextManual={() => drawNextBall()}
                      onResetGame={handleResetGame}
                    />
                  </div>
                )}

                {/* ACTIVE ROUND WINNING CELEBRATION BANNER */}
                {winnersList.length > 0 && (
                  <div className="relative overflow-hidden rounded-2xl border-2 border-amber-400 bg-gradient-to-r from-emerald-900 via-teal-900 to-amber-900 p-4 sm:p-5 text-white shadow-2xl space-y-3">
                    {showConfetti && (
                      <div className="flex items-center justify-between text-xs font-extrabold text-amber-300">
                        <span>🎉 FAST BINGO VICTORY ({activeStakeTier} ETB)! እንኳን ደስ አለዎት! 🎉</span>
                        <button
                          type="button"
                          onClick={() => setShowConfetti(false)}
                          className="underline text-white cursor-pointer"
                        >
                          ዝጋ
                        </button>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="space-y-2">
                        {/* Winner Identity Card matching IMG_3782_7fb1d730.jpeg */}
                        <div className="p-3 sm:p-4 rounded-2xl bg-slate-950/85 border-2 border-amber-400/80 shadow-xl space-y-1">
                          <div className="text-[11px] sm:text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-2">
                            <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
                            <span>🏆 አሸናፊ ተጫዋች (Winner)</span>
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/25 text-emerald-300 font-mono-tabular font-extrabold text-[11px] border border-emerald-500/40">
                              ካርቴላ {winnersList.map((w) => `#${w.cartelaId}`).join(', ')}
                            </span>
                          </div>

                          {/* Large Bold Username on top - exactly like IMG_3782_7fb1d730.jpeg */}
                          <div className="text-2xl sm:text-3xl font-black text-white tracking-wide truncate">
                            {winnersList[0].userName}
                          </div>

                          {/* Clean Monospace Phone Number with Bullet right underneath */}
                          <div className="text-base sm:text-lg font-mono-tabular font-bold text-slate-300 flex items-center gap-2">
                            <span className="text-amber-400">📱</span>
                            <span className="tracking-widest text-slate-100 font-extrabold">
                              {formatWinnerPhone(winnersList[0].userPhone)}
                            </span>
                            <span className="text-slate-400 font-black">•</span>
                          </div>
                        </div>

                        <p className="text-xs sm:text-sm text-emerald-200 font-bold flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>
                            ሕግ፦ {winnersList[0].patternTitle} · የመጨረሻ ኳስ፦{' '}
                            <span className="px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 font-black font-mono-tabular">
                              {getLetterForBall(winnersList[0].lastBall)}-{winnersList[0].lastBall}
                            </span>
                          </span>
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <div className="text-right">
                          <div className="text-xs uppercase font-bold text-amber-300">
                            {jackpotWonInRound > 0
                              ? `80% ደራሽ (${prizeAmount.toFixed(0)}) + 🎰 ጃክፓት (${jackpotWonInRound.toFixed(0)} ETB)`
                              : 'የተሸለሙት ብር (80% ደራሽ)'}
                          </div>
                          <div className="text-2xl sm:text-3xl font-extrabold font-mono-tabular text-amber-400">
                            +{winnersList[0].prizeAmount.toFixed(2)} ETB
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={handleResetGame}
                          className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer shadow-md"
                        >
                          <RotateCcw className="w-4 h-4" />
                          <span>
                            {winnerDisplayCountdown !== null
                              ? `በ ${winnerDisplayCountdown}s ውስጥ አዲስ ጨዋታ በራሱ ይጀምራል (ወይም አሁኑኑ ጀምር)`
                              : 'ለቀጣይ ዙር እንደገና ካርቴላ አስመዝግበህ ተጫወት'}
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Single-line Pre-Game Hash inside Winning Banner */}
                    <div className="pt-2 border-t border-white/15 flex items-center justify-between gap-2 whitespace-nowrap overflow-hidden">
                      <span className="text-[11px] sm:text-xs font-extrabold text-emerald-300 flex items-center gap-1 shrink-0">
                        <Shield className="w-3.5 h-3.5 shrink-0" />
                        <span>{t.preGameHashLabel}</span>
                      </span>
                      <div
                        className="flex-1 min-w-0 px-2.5 py-1 rounded-lg bg-slate-950/70 border border-emerald-400/30 font-mono-tabular text-[11px] text-emerald-200 truncate select-all"
                        title={roundFairData.sha256Hash}
                      >
                        {roundFairData.sha256Hash}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            if (typeof navigator !== 'undefined' && navigator.clipboard) {
                              navigator.clipboard.writeText(roundFairData.sha256Hash).catch(() => {});
                              setStatusNotice('✓ SHA-256 Hash Copied!');
                            }
                          }}
                          className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] sm:text-[11px] font-extrabold cursor-pointer"
                        >
                          Copy
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsProvablyFairModalOpen(true)}
                          className="px-2 py-1 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-emerald-400/40 text-emerald-300 text-[10px] sm:text-[11px] font-extrabold cursor-pointer"
                        >
                          Verify
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* FALSE BINGO VERIFICATION FAILURE (No seconds countdown!) */}
                {verificationFailure && (
                  <div className="rounded-2xl border-2 border-rose-500 bg-rose-950/90 text-white p-4 shadow-xl space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-rose-300 font-extrabold text-sm sm:text-base">
                        <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                        <span>
                          {t.cartela} #{verificationFailure.cartelaId} (Auto-Blocked)
                        </span>
                      </div>
                    </div>
                    <p className="text-xs sm:text-sm font-semibold text-rose-100">
                      {verificationFailure.reasonAm}
                    </p>
                  </div>
                )}

                {/* Cartela Cards Grid (scrolls smoothly underneath the sticky MasterBoard75!) */}
                {showFullCartelasSection && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2 px-1">
                      <div className="flex items-center gap-2 flex-nowrap">
                        <div className={`flex items-center p-0.5 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-300'}`}>
                          <button
                            type="button"
                            onClick={() => setGridColumns(2)}
                            className={`p-1.5 sm:px-2.5 sm:py-1 rounded-lg text-xs font-black flex items-center justify-center transition-all cursor-pointer ${
                              gridColumns === 2
                                ? 'bg-blue-600 text-white shadow-xs'
                                : isDark
                                ? 'text-slate-400 hover:text-white'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                            title="2 ዓምዶች (2 Columns)"
                            aria-label="2 Columns"
                          >
                            <Columns2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setGridColumns(3)}
                            className={`p-1.5 sm:px-2.5 sm:py-1 rounded-lg text-xs font-black flex items-center justify-center transition-all cursor-pointer ${
                              gridColumns === 3
                                ? 'bg-blue-600 text-white shadow-xs'
                                : isDark
                                ? 'text-slate-400 hover:text-white'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                            title="3 ዓምዶች (3 Columns)"
                            aria-label="3 Columns"
                          >
                            <Columns3 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Au (ON / OFF) Toggle Button placed right next to it on the exact same line */}
                        <button
                          type="button"
                          onClick={() => setAutoDaub(!autoDaub)}
                          className={`px-2.5 py-1 rounded-xl text-xs font-black flex items-center gap-1.5 border transition-all cursor-pointer shadow-xs active:scale-95 whitespace-nowrap ${
                            autoDaub
                              ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-500/20'
                              : isDark
                              ? 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                              : 'bg-white text-slate-600 border-slate-300 hover:text-slate-900'
                          }`}
                          title={autoDaub ? 'Au በራሱ ምልክት (ON)' : 'Au በእጅ ምልክት (OFF)'}
                        >
                          <span className="font-mono-tabular font-black text-[10px] px-1 py-0.2 rounded bg-black/20">
                            Au
                          </span>
                          <span>{autoDaub ? 'Au (ON)' : 'Au (OFF)'}</span>
                        </button>
                      </div>
                    </div>

                    <div
                      className={`grid ${
                        gridColumns === 3 ? 'grid-cols-3 gap-1.5 sm:gap-2.5' : 'grid-cols-2 gap-2 sm:gap-3'
                      }`}
                    >
                      {sortedCartelas
                      .filter((cartela) => {
                        const gameStarted = isPlaying || calledBalls.length > 0;
                        if (
                          gameStarted &&
                          !cartela.isRegistered &&
                          unregisteredWhenStartedMode === 'hide'
                        ) {
                          return false;
                        }
                        return true;
                      })
                      .map((cartela) => {
                        const gameStarted = isPlaying || calledBalls.length > 0;
                        const isDimmedUnreg =
                          gameStarted &&
                          !cartela.isRegistered &&
                          unregisteredWhenStartedMode === 'dim';
                        return (
                          <CartelaCardView
                            key={cartela.id}
                            cartela={cartela}
                            calledBalls={calledBalls}
                            activeBall={activeBall}
                            autoDaub={autoDaub}
                            daubColor={daubColor}
                            language={language}
                            isDark={isDark}
                            isGameStarted={gameStarted}
                            isGameFinished={Boolean(winnersList.length > 0 || (calledBalls.length >= 75 && !isPlaying) || gameFinishedAt !== null)}
                            isFastBingoMode={true}
                            isCompact3Col={gridColumns === 3}
                            shapeBadge={getShapeBadge(cartela, calledBalls, autoDaub, sortMode)}
                            isSelected={!gameStarted && selectedCartelaIds.includes(cartela.id)}
                            isDimmedUnregistered={isDimmedUnreg}
                            showSelectCheckbox={!gameStarted && (isSelectModeActive || selectedCartelaIds.length > 0)}
                            onToggleSelect={handleToggleSelectCartela}
                            onToggleRegister={handleToggleRegisterCartela}
                            onRemoveCartela={handleRemoveCartela}
                            onToggleCellDaub={handleToggleCellDaub}
                            onClaimBingo={handleClaimBingo}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Blocked Cartelas Footer (Hidden while game is actively playing unless a cartela is blocked) */}
                {(!isPlaying || blockedCartelaIds.length > 0) && (
                  <div
                    className={`rounded-2xl border p-3.5 flex flex-wrap items-center justify-between gap-2 ${
                      isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-extrabold text-rose-500">{t.blockedCartelas}</span>
                      {blockedCartelaIds.length === 0 ? (
                        <span className="text-xs text-slate-400">
                          {t.noBlockedCartelas}
                        </span>
                      ) : (
                        blockedCartelaIds.map((id) => (
                          <span
                            key={id}
                            className="px-2.5 py-0.5 rounded-lg bg-rose-600 text-white font-mono-tabular text-xs font-extrabold"
                          >
                            #{id}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* ቅድመ-ጨዋታ የተቆለፈ SHA-256 ሃሽ፦ #[roundId] - መጨረሻ ታች ይሁን */}
                <div
                  className={`rounded-2xl border px-3 py-2.5 flex items-center justify-between gap-2 whitespace-nowrap overflow-hidden shadow-sm ${
                    isDark
                      ? 'bg-slate-900/95 border-emerald-500/40 text-slate-100'
                      : 'bg-emerald-50/70 border-emerald-300 text-slate-900'
                  }`}
                >
                  <span className="text-[11px] sm:text-xs font-extrabold text-emerald-400 flex items-center gap-1.5 shrink-0">
                    <Shield className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span>ቅድመ-ጨዋታ የተቆለፈ SHA-256 ሃሽ፦ #{gameMatchId}</span>
                  </span>
                  <div
                    className={`flex-1 min-w-0 px-2.5 py-1 rounded-xl font-mono-tabular text-[11px] truncate border select-all ${
                      isDark
                        ? 'bg-slate-950 border-slate-800 text-emerald-300'
                        : 'bg-white border-emerald-200 text-emerald-900'
                    }`}
                    title={roundFairData.sha256Hash}
                  >
                    {roundFairData.sha256Hash}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        if (typeof navigator !== 'undefined' && navigator.clipboard) {
                          navigator.clipboard.writeText(roundFairData.sha256Hash).catch(() => {});
                          setStatusNotice(`✓ የዙር #${gameMatchId} SHA-256 ሃሽ ተገልብጧል!`);
                        }
                      }}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-extrabold cursor-pointer active:scale-95 transition-all shadow-sm"
                    >
                      {t.copyBtn || 'ኮፒ'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsProvablyFairModalOpen(true)}
                      className={`px-2.5 py-1 rounded-lg border text-[11px] font-extrabold cursor-pointer active:scale-95 transition-all shadow-sm ${
                        isDark
                          ? 'bg-slate-800 border-emerald-500/40 text-emerald-400 hover:bg-slate-700'
                          : 'bg-white border-emerald-300 text-emerald-800 hover:bg-emerald-100'
                      }`}
                    >
                      {t.verifyBtn || 'አረጋግጥ'}
                    </button>
                  </div>
                </div>

              </div>
            )}
          </div>
        )}

        {/* VIEW 2: WALLET */}
        {activeTab === 'wallet' && (
          <WalletView
            currentUser={currentUser}
            transactions={transactions}
            language={language}
            isDark={isDark}
            initialSubTab={walletSubTab}
            requireAdminApproval={requireDepositApproval}
            bankAccounts={bankAccounts}
            onSubmitDeposit={(method, amount, refNumber, fullSms) => {
              const txStatus: 'pending' | 'approved' = requireDepositApproval ? 'pending' : 'approved';
              const tempId = `ftx-${Date.now()}`;
              const newTx: TransactionRecord = {
                id: tempId,
                userId: currentUser.id,
                userName: currentUser.name,
                userPhone: currentUser.phone,
                type: 'deposit',
                method,
                amount,
                referenceNumber: refNumber,
                fullSmsText: fullSms,
                status: txStatus,
                timestamp: new Date().toLocaleString(),
              };
              setTransactions((prev) => [newTx, ...prev]);
              if (txStatus === 'approved') {
                setUsers((prev) =>
                  prev.map((u, i) => (i === 0 ? { ...u, balance: u.balance + amount } : u))
                );
              } else {
                setStatusNotice(
                  `⏳ የ ${amount} ETB Deposit ጥያቄዎ ተልኳል! ከባንክ SMS ጋር ተመሳክሮ ሲጸድቅ ወደ ዋሌትዎ ይገባል።`
                );
              }
              fetch(buildApiUrl('/api/transactions/submit'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  userId: currentUser.id,
                  userName: currentUser.name,
                  userPhone: currentUser.phone,
                  type: 'deposit',
                  method,
                  amount,
                  referenceNumber: refNumber,
                  fullSmsText: fullSms,
                }),
              })
                .then((r) => r.json())
                .then((data) => {
                  if (!data?.ok) {
                    setTransactions((prev) => prev.filter((t) => t.id !== tempId));
                    if (txStatus === 'approved') {
                      setUsers((prev) =>
                        prev.map((u, i) => (i === 0 ? { ...u, balance: Math.max(0, u.balance - amount) } : u))
                      );
                    }
                    setStatusNotice(
                      data?.error || '❌ የተደገመ የክፍያ ደረሰኝ (Duplicate Transaction) ተቀባይነት የለውም!'
                    );
                    return;
                  }
                  if (Array.isArray(data.transactions)) {
                    mergeServerTransactions(data.transactions);
                  }
                })
                .catch(() => {});
            }}
            onSubmitWithdraw={(method, amount, accountNumber) => {
              const txStatus: 'pending' | 'approved' = requireDepositApproval ? 'pending' : 'approved';
              const tempId = `ftx-${Date.now()}`;
              const newTx: TransactionRecord = {
                id: tempId,
                userId: currentUser.id,
                userName: currentUser.name,
                userPhone: currentUser.phone,
                type: 'withdraw',
                method,
                amount,
                referenceNumber: accountNumber,
                status: txStatus,
                timestamp: new Date().toLocaleString(),
              };
              setTransactions((prev) => [newTx, ...prev]);
              if (txStatus === 'approved') {
                setUsers((prev) =>
                  prev.map((u, i) => (i === 0 ? { ...u, balance: u.balance - amount } : u))
                );
              } else {
                setStatusNotice(
                  `⏳ የ ${amount} ETB Withdraw ጥያቄዎ እየተጣራ ነው (Pending Approval)።`
                );
              }
              fetch(buildApiUrl('/api/transactions/submit'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  userId: currentUser.id,
                  userName: currentUser.name,
                  userPhone: currentUser.phone,
                  type: 'withdraw',
                  method,
                  amount,
                  referenceNumber: accountNumber,
                }),
              })
                .then((r) => r.json())
                .then((data) => {
                  if (!data?.ok) {
                    setTransactions((prev) => prev.filter((t) => t.id !== tempId));
                    if (txStatus === 'approved') {
                      setUsers((prev) =>
                        prev.map((u, i) => (i === 0 ? { ...u, balance: u.balance + amount } : u))
                      );
                    }
                    setStatusNotice(
                      data?.error || '❌ የተደገመ የወጪ ጥያቄ ተቀባይነት የለውም!'
                    );
                    return;
                  }
                  if (Array.isArray(data.transactions)) {
                    mergeServerTransactions(data.transactions);
                  }
                })
                .catch(() => {});
            }}
            onSubmitTransfer={(recipientPhone, amount) => {
              const rawDigits = recipientPhone.replace(/\D/g, '');
              const normalizedRecipient =
                rawDigits.startsWith('251') && rawDigits.length === 12
                  ? `0${rawDigits.slice(3)}`
                  : rawDigits.length === 9 && /^[79]/.test(rawDigits)
                  ? `0${rawDigits}`
                  : rawDigits || recipientPhone.trim();
              const refCode = `TR-${Date.now().toString().slice(-6)}`;
              const newTx: TransactionRecord = {
                id: `ftx-${Date.now()}`,
                userId: currentUser.id,
                userName: currentUser.name,
                userPhone: currentUser.phone,
                type: 'transfer',
                method: 'Wallet',
                amount,
                referenceNumber: refCode,
                recipientPhone: normalizedRecipient,
                fullSmsText: `Transfer ${amount.toFixed(2)} ETB from ${currentUser.phone} (${currentUser.name}) to ${normalizedRecipient}`,
                status: 'approved',
                timestamp: new Date().toLocaleString(),
              };
              setTransactions((prev) => [newTx, ...prev]);
              setUsers((prev) => {
                let recipientFound = false;
                const updated = prev.map((u, i) => {
                  if (i === 0) {
                    return { ...u, balance: Math.max(0, Number((u.balance - amount).toFixed(2))) };
                  }
                  if (u.phone.trim() === normalizedRecipient) {
                    recipientFound = true;
                    return { ...u, balance: Number((u.balance + amount).toFixed(2)) };
                  }
                  return u;
                });
                if (!recipientFound && normalizedRecipient) {
                  updated.push({
                    id: `u-${normalizedRecipient}`,
                    name: `Player_${normalizedRecipient.slice(-4)}`,
                    phone: normalizedRecipient,
                    passwordHash: '****',
                    balance: Number((15 + amount).toFixed(2)),
                    bonusBalance: 15,
                    referralCode: `EZI${normalizedRecipient.slice(-4)}`,
                    referredCount: 0,
                    referralEarnings: 0,
                    isBlocked: false,
                    isAdmin: false,
                    joinedAt: new Date().toISOString().slice(0, 10),
                  });
                }
                return updated;
              });
              setStatusNotice(
                `✅ ${amount.toFixed(2)} ETB ወደ ${normalizedRecipient} ዋሌት በተሳካ ሁኔታ ተልኳል!`
              );
              fetch(buildApiUrl('/api/transactions/submit'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  userId: currentUser.id,
                  userName: currentUser.name,
                  userPhone: currentUser.phone,
                  type: 'transfer',
                  method: 'Wallet',
                  amount,
                  referenceNumber: refCode,
                  recipientPhone: normalizedRecipient,
                }),
              })
                .then((r) => r.json())
                .then((data) => {
                  if (data?.ok) {
                    if (Array.isArray(data.transactions)) {
                      mergeServerTransactions(data.transactions);
                    }
                    if (Array.isArray(data.players)) {
                      mergeServerPlayers(data.players);
                    }
                  }
                })
                .catch(() => {});
            }}
          />
        )}

        {/* VIEW 3: PROFILE */}
        {activeTab === 'profile' && (
          <ProfileAndSettingsView
            currentUser={currentUser}
            language={language}
            isDark={isDark}
            isFastBingo={true}
            daubColor={daubColor}
            accentColor={accentColor}
            notificationPref={notificationPref}
            onChangeLanguage={(lang) => setLanguage(lang)}
            onToggleTheme={() => setIsDark(!isDark)}
            onChangeDaubColor={(col) => setDaubColor(col)}
            onChangeAccentColor={(acc) => setAccentColor(acc)}
            onChangeNotificationPref={(pref) => setNotificationPref(pref)}
            onInviteFriendReward={() => {
              setUsers((prev) =>
                prev.map((u, i) =>
                  i === 0
                    ? {
                        ...u,
                        balance: u.balance + 25,
                        bonusBalance: u.bonusBalance + 25,
                        referredCount: u.referredCount + 1,
                        referralEarnings: u.referralEarnings + 25,
                      }
                    : u
                )
              );
            }}
            onUpdatePassword={(newPass) => {
              setUsers((prev) =>
                prev.map((u, i) => (i === 0 ? { ...u, passwordHash: newPass } : u))
              );
            }}
            onRegisterOrLoginUser={(name, phone) => {
              saveDevicePlayerIdentity(name, phone);
              setIsPhoneRegistered(true);
              setUsers((prev) =>
                prev.map((u, i) => (i === 0 ? { ...u, name, phone } : u))
              );
              fetch(buildApiUrl('/api/telegram/register-phone'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, phone }),
              })
                .then((r) => r.json())
                .then(() => refreshLiveServerRoomState())
                .catch(() => {});
            }}
            onSignOut={() => {
              localStorage.removeItem('ezi_phone_registered_v2');
              setIsPhoneRegistered(false);
              setActiveTab('game');
            }}
            onOpenGameHistory={() => setActiveTab('history')}
            onOpenAdminLogin={() => setActiveTab('admin')}
          />
        )}

        {/* VIEW 3.5: GAME HISTORY (የጨዋታ ታሪክ) */}
        {activeTab === 'history' && (
          <GameHistoryView
            history={gameHistory}
            language={language}
            isDark={isDark}
            currentUserName={currentUser?.name}
            currentUserPhone={currentUser?.phone}
            onRefreshHistory={() => refreshLiveServerRoomState()}
            onInspectWinnerCartela={(w) => setInspectedWinner(w)}
          />
        )}

        {/* VIEW 3.6: LEADERBOARD */}
        {activeTab === 'leaderboard' && (
          <LeaderboardView
            users={users}
            history={gameHistory}
            currentUserPhone={currentUser?.phone}
            language={language}
            isDark={isDark}
          />
        )}

        {/* VIEW 4: DEDICATED FAST BINGO ADMIN PANEL */}
        {activeTab === 'admin' && (
          <div className="space-y-3">
            {onSwitchToRegularApp && !isStandaloneFastOnly && (
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-emerald-400">⚡ Fast Bingo Admin (ፈጣን ቢንጎ)</span>
                </div>
                <button
                  type="button"
                  onClick={onSwitchToRegularApp}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black text-xs hover:from-emerald-400 hover:to-teal-500 transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
                >
                  <Gamepad2 className="w-3.5 h-3.5" />
                  <span>ወደ Regular Bingo Admin ቀይር ➔</span>
                </button>
              </div>
            )}
            <AdminPanelView
            isAdminAuthenticated={isAdminAuthenticated}
            onManualApproveWinner={(cartelaId) => {
              let targetCard = cartelas.find((c) => c.id === cartelaId);
              if (!targetCard) {
                targetCard = generateCartelaById(cartelaId);
              }
              const cardId = targetCard ? targetCard.id : cartelaId;
              const winBall = activeBall || (calledBalls.length > 0 ? calledBalls[calledBalls.length - 1] : 1);
              setBlockedCartelaIds((prev) => prev.filter((b) => b !== cartelaId));
              setIsPlaying(false);
              soundFX.playVictoryFanfare();
              const winnerObj: WinnerAnnouncement = {
                cartelaId: cardId,
                userName: `Cartela #${cardId} (Admin Verified)`,
                prizeAmount: prizeAmount,
                winningCells: [],
                lastBall: winBall,
                calledBallsSnapshot: [...calledBalls],
                patternTitle: `${FAST_BINGO_RULE_PATTERN.titleAm} (በአድሚን የተረጋገጠ)`,
                timestamp: new Date().toLocaleString(),
              };
              setWinnersList((prev) => {
                if (prev.some((w) => w.cartelaId === cartelaId)) return prev;
                return [...prev, winnerObj];
              });
              setInspectedWinner(winnerObj);
              setStatusNotice(`🏆 ካርቴላ #${cartelaId} በአድሚን ውሳኔ አሸናፊ ሆኖ ፀድቋል!`);
              dispatchServerRoomAction({
                mode: 'fast',
                stakeAmount: activeStakeTier,
                action: 'claim_win',
                winner: winnerObj,
                winnerPhone: currentUser?.phone || '0942742684',
              });
            }}
            onAdminLoginSuccess={() => {
              setIsAdminAuthenticated(true);
              setAdminLoginError('');
            }}
            onAdminLogout={() => {
              setIsAdminAuthenticated(false);
              setActiveTab('game');
            }}
            onOpenAll16RulesModal={() => setIsRuleModalOpen(true)}
            onOpenDownloadModal={() => setIsDownloadModalOpen(true)}
            isFastMode={true}
            activeStakeTier={activeStakeTier}
            onSelectStakeRoom={(tier) => handleEnterStakeRoom(tier)}
            allFastRoomsByStake={allFastRoomsByStake}
            allFastLockedByStake={allFastLockedByStake}
            stakeAmount={stakeAmount}
            prizeAmount={prizeAmount}
            blockedCartelaIds={blockedCartelaIds}
            totalCartelasCount={cartelas.length}
            registeredCartelasCount={registeredCartelasCount}
            isPlaying={isPlaying}
            isPaused={isPaused}
            callSpeedSec={callSpeedSec}
            onChangeSpeed={(spd) => {
              setCallSpeedSec(spd);
              dispatchServerRoomAction({
                mode: 'fast',
                stakeAmount: activeStakeTier,
                action: 'set_speed',
                callSpeedSec: spd,
              });
            }}
            onTogglePause={() => {
              dispatchServerRoomAction({
                mode: 'fast',
                stakeAmount: activeStakeTier,
                action: 'toggle_pause',
              });
              if (!isPlaying) {
                setIsPlaying(true);
                setIsPaused(false);
                if (calledBalls.length === 0) drawNextBall();
              } else {
                setIsPaused(!isPaused);
              }
            }}
            onDrawNextManual={() => drawNextBall()}
            onResetGame={handleResetGame}
            onSimulateFastWin={(type) => handleSimulateFastWin(type)}
            jackpotPool={jackpotPool}
            houseEarningsTotal={houseEarningsTotal}
            onUpdateJackpotPool={(nextJp) => {
              setJackpotPool(nextJp);
              dispatchServerRoomAction({
                mode: 'fast',
                action: 'update_settings',
                jackpotPool: nextJp,
              });
            }}
            heroBanners={heroBanners}
            bankAccounts={bankAccounts}
            onAddHeroBanner={(banner) => {
              setHeroBanners((prev) => {
                const next = [{ ...banner, id: `hb-${Date.now()}` }, ...prev];
                dispatchServerRoomAction({
                  mode: 'fast',
                  stakeAmount: activeStakeTier,
                  action: 'set_hero_banners',
                  heroBanners: next,
                } as unknown as Parameters<typeof dispatchServerRoomAction>[0]);
                return next;
              });
            }}
            onUpdateHeroBanner={(updated) => {
              setHeroBanners((prev) => {
                const next = prev.map((b) => (b.id === updated.id ? updated : b));
                dispatchServerRoomAction({
                  mode: 'fast',
                  stakeAmount: activeStakeTier,
                  action: 'set_hero_banners',
                  heroBanners: next,
                } as unknown as Parameters<typeof dispatchServerRoomAction>[0]);
                return next;
              });
            }}
            onRemoveHeroBanner={(id) => {
              setHeroBanners((prev) => {
                const next = prev.filter((b) => b.id !== id);
                dispatchServerRoomAction({
                  mode: 'fast',
                  stakeAmount: activeStakeTier,
                  action: 'set_hero_banners',
                  heroBanners: next,
                } as unknown as Parameters<typeof dispatchServerRoomAction>[0]);
                return next;
              });
            }}
            onAddBankAccount={(newBank) => {
              setBankAccounts((prev) => {
                const next = [...prev, newBank];
                dispatchServerRoomAction({
                  mode: 'fast',
                  stakeAmount: activeStakeTier,
                  action: 'set_bank_accounts',
                  bankAccounts: next,
                } as unknown as Parameters<typeof dispatchServerRoomAction>[0]);
                return next;
              });
            }}
            onUpdateBankAccount={(updatedBank) => {
              setBankAccounts((prev) => {
                const next = prev.map((b) => (b.id === updatedBank.id ? updatedBank : b));
                dispatchServerRoomAction({
                  mode: 'fast',
                  stakeAmount: activeStakeTier,
                  action: 'set_bank_accounts',
                  bankAccounts: next,
                } as unknown as Parameters<typeof dispatchServerRoomAction>[0]);
                return next;
              });
            }}
            onRemoveBankAccount={(bankId) => {
              setBankAccounts((prev) => {
                const next = prev.filter((b) => b.id !== bankId);
                dispatchServerRoomAction({
                  mode: 'fast',
                  stakeAmount: activeStakeTier,
                  action: 'set_bank_accounts',
                  bankAccounts: next,
                } as unknown as Parameters<typeof dispatchServerRoomAction>[0]);
                return next;
              });
            }}
            users={users}
            transactions={transactions}
            gameHistory={gameHistory}
            isDark={isDark}
            requireDepositApproval={requireDepositApproval}
            onToggleRequireDepositApproval={(nextState) => {
              setRequireDepositApproval(nextState);
              fetch(buildApiUrl('/api/admin/update-pin'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requireDepositApproval: nextState }),
              }).catch(() => {});
            }}
            bonusCartelasForOver20={bonusCartelasForOver20}
            onUpdateBonusCartelasForOver20={(nextCount) => {
              setBonusCartelasForOver20(nextCount);
            }}
            onRefreshLiveState={refreshLiveServerRoomState}
            onStartRegistrationCountdown={(secs) => handleStartPreGameCountdown(secs)}
            onBlockCartelaId={(id) => {
              dispatchServerRoomAction({
                mode: 'fast',
                action: 'block_cartela',
                cartelaId: id,
              });
              setBlockedCartelaIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
              setCartelas((prev) =>
                prev.map((c) => (c.id === id ? { ...c, isBlocked: true } : c))
              );
            }}
            onUnblockCartelaId={(id) => {
              dispatchServerRoomAction({
                mode: 'fast',
                action: 'unblock_cartela',
                cartelaId: id,
              });
              setBlockedCartelaIds((prev) => prev.filter((x) => x !== id));
              setCartelas((prev) =>
                prev.map((c) => (c.id === id ? { ...c, isBlocked: false } : c))
              );
            }}
            onAdjustUserBalance={(userId, delta, phone) => {
              setUsers((prev) =>
                prev.map((item) => {
                  if (item.id === userId || (phone && item.phone === phone)) {
                    const nextBal = Math.max(0, item.balance + delta);
                    fetch(buildApiUrl('/api/wallet/sync'), {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        phone: item.phone,
                        name: item.name,
                        balance: nextBal,
                        bonusBalance: item.bonusBalance,
                      }),
                    }).catch(() => {});
                    return { ...item, balance: nextBal };
                  }
                  return item;
                })
              );
            }}
            onSetExactUserBalance={(phone, name, balance, bonusBalance = 15) => {
              fetch(buildApiUrl('/api/admin/users/upsert'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  phone,
                  name,
                  balance,
                  bonusBalance,
                }),
              })
                .then((r) => r.json())
                .then((data) => {
                  if (data?.ok && Array.isArray(data.players)) {
                    mergeServerPlayers(data.players);
                  }
                })
                .catch(() => {});
            }}
            onToggleUserBlock={(userId, phone) => {
              setUsers((prev) =>
                prev.map((item) => {
                  if (item.id === userId || (phone && item.phone === phone)) {
                    const nextBlocked = !item.isBlocked;
                    fetch(buildApiUrl('/api/wallet/sync'), {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        phone: item.phone,
                        name: item.name,
                        balance: item.balance,
                        bonusBalance: item.bonusBalance,
                        isBlocked: nextBlocked,
                      }),
                    }).catch(() => {});
                    return { ...item, isBlocked: nextBlocked };
                  }
                  return item;
                })
              );
            }}
            onApproveRejectTransaction={(txId, status) => {
              const targetTx = transactions.find((t) => t.id === txId);
              setTransactions((prev) =>
                prev.map((item) => (item.id === txId ? { ...item, status } : item))
              );
              if (targetTx && targetTx.status === 'pending' && status === 'approved') {
                setUsers((prev) =>
                  prev.map((u) => {
                    if (u.id === targetTx.userId || u.phone === targetTx.userPhone) {
                      const delta =
                        targetTx.type === 'deposit' ? targetTx.amount : -targetTx.amount;
                      return { ...u, balance: Math.max(0, u.balance + delta) };
                    }
                    return u;
                  })
                );
              }
              fetch(buildApiUrl('/api/transactions/approve'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  txId,
                  status,
                  referenceNumber: targetTx?.referenceNumber,
                  userPhone: targetTx?.userPhone,
                }),
              }).catch(() => {});
            }}
          />
          </div>
        )}
      </main>

      {/* FLOATING "+" BUTTON FOR ADDING CARTELAS (Hidden once the game starts) */}
      {activeTab === 'game' && selectedStakeRoom !== null && !isPlaying && calledBalls.length === 0 && (
        <button
          type="button"
          onClick={() => setIsSelectorModalOpen(true)}
          className="fixed bottom-20 right-5 z-40 w-14 h-14 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-2xl flex items-center justify-center transition-transform active:scale-95 cursor-pointer border-2 border-white"
          title="ካርቴላ ጨምር (+)"
        >
          <Plus className="w-8 h-8 stroke-[3]" />
        </button>
      )}

      {/* FIXED BOTTOM NAVIGATION BAR FOR FAST BINGO APP (ፈጣን ጨዋታ, ዋሌት, የጨዋታ ታሪክ, Leaderboard, ፕሮፋይል + Admin when authenticated) */}
      <nav
        className={`fixed bottom-0 left-0 right-0 z-40 border-t backdrop-blur-md ${
          isDark
            ? 'bg-slate-900/95 border-slate-800 text-slate-400'
            : 'bg-white/95 border-slate-200 text-slate-600'
        }`}
      >
        <div
          className={`max-w-xl mx-auto grid items-center h-16 ${
            isAdminAuthenticated ? 'grid-cols-6' : 'grid-cols-5'
          }`}
        >
          <button
            type="button"
            onClick={() => {
              if (activeTab === 'game') {
                setSelectedStakeRoom(null);
              } else {
                setActiveTab('game');
              }
            }}
            className={`flex flex-col items-center justify-center h-full cursor-pointer transition-colors ${
              activeTab === 'game' ? 'text-amber-500 font-extrabold' : ''
            }`}
          >
            <Zap className="w-5 h-5" />
            <span className="text-[10px] sm:text-[11px] mt-1 whitespace-nowrap">{t.fastGameTab}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('leaderboard')}
            className={`flex flex-col items-center justify-center h-full cursor-pointer transition-colors ${
              activeTab === 'leaderboard' ? 'text-amber-500 font-extrabold' : ''
            }`}
          >
            <Trophy className="w-5 h-5" />
            <span className="text-[10px] sm:text-[11px] mt-1 whitespace-nowrap">{t.leaderboard}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('wallet')}
            className={`flex flex-col items-center justify-center h-full cursor-pointer transition-colors ${
              activeTab === 'wallet' ? 'text-amber-500 font-extrabold' : ''
            }`}
          >
            <Wallet className="w-5 h-5" />
            <span className="text-[10px] sm:text-[11px] mt-1 whitespace-nowrap">{t.wallet}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex flex-col items-center justify-center h-full cursor-pointer transition-colors ${
              activeTab === 'history' ? 'text-amber-500 font-extrabold' : ''
            }`}
          >
            <History className="w-5 h-5" />
            <span className="text-[10px] sm:text-[11px] mt-1 whitespace-nowrap">{t.gameHistory}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center justify-center h-full cursor-pointer transition-colors ${
              activeTab === 'profile' ? 'text-amber-500 font-extrabold' : ''
            }`}
          >
            <User className="w-5 h-5" />
            <span className="text-[10px] sm:text-[11px] mt-1 whitespace-nowrap">{t.profile}</span>
          </button>

          {isAdminAuthenticated && (
            <button
              type="button"
              onClick={() => setActiveTab('admin')}
              className={`flex flex-col items-center justify-center h-full cursor-pointer transition-colors ${
                activeTab === 'admin' ? 'text-amber-500 font-extrabold' : ''
              }`}
            >
              <Shield className="w-5 h-5" />
              <span className="text-[10px] sm:text-[11px] mt-1 whitespace-nowrap">{t.admin} ✓</span>
            </button>
          )}
        </div>
      </nav>

      {/* MODAL 1: FAST BINGO EXCLUSIVE RULE VISUALIZER (Horizontal, Vertical, Diagonal, 4 Corners) */}
      {isRuleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-sm overflow-y-auto">
          <div
            className={`w-full max-w-5xl max-h-[90vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden ${
              isDark
                ? 'bg-slate-900 border-amber-500/40 text-slate-100'
                : 'bg-white border-amber-300 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-700/30">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black">
                  <Zap className="w-5 h-5 fill-current" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-extrabold">
                    የፈጣን ቢንጎ ሕግና አሸናፊ ቅጦች (Fast Bingo Winning Rule)
                  </h2>
                  <p className="text-xs text-amber-400 font-bold">
                    {FAST_BINGO_RULE_PATTERN.titleAm}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsRuleModalOpen(false)}
                className="px-3 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-extrabold flex items-center gap-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
                <span>ዝጋ</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {/* Full Fast Bingo Game Rules (🎯 መጫወቻ ካርድ, 🎯 ጨዋታ, 🎯 አሸናፊ) */}
              <div className="space-y-3">
                <h3 className="text-sm sm:text-base font-extrabold text-amber-500">
                  {t.fastTermsTitle}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {(FAST_BINGO_TERMS_BY_LANG[language] || FAST_BINGO_TERMS_BY_LANG.am).map(
                    (sec, idx) => (
                      <div
                        key={idx}
                        className={`p-3.5 rounded-xl border space-y-2 ${
                          isDark
                            ? 'bg-slate-950 border-slate-800 text-slate-100'
                            : 'bg-slate-50 border-slate-200 text-slate-900'
                        }`}
                      >
                        <div className="text-xs sm:text-sm font-extrabold text-amber-400">
                          {sec.title}
                        </div>
                        <ul className="space-y-1.5 text-xs font-semibold leading-relaxed">
                          {sec.items.map((line, lIdx) => (
                            <li key={lIdx} className="flex items-start gap-2">
                              <span className="text-amber-400 font-black mt-0.5">•</span>
                              <span>{line}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )
                  )}
                </div>
              </div>

              <div
                className={`p-3.5 rounded-xl border text-xs sm:text-sm font-bold ${
                  isDark
                    ? 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                    : 'bg-amber-50 border-amber-300 text-amber-950'
                }`}
              >
                {FAST_BINGO_RULE_PATTERN.descAm}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
                {FAST_BINGO_RULE_PATTERN.variations.map((v) => (
                  <div
                    key={v.id}
                    className={`rounded-xl border p-2.5 flex flex-col items-center ${
                      v.id === 'fast-corners'
                        ? isDark
                          ? 'bg-amber-950/40 border-amber-500 ring-1 ring-amber-400'
                          : 'bg-amber-50 border-amber-400'
                        : isDark
                        ? 'bg-slate-950 border-slate-800'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="w-full text-[11px] font-extrabold mb-2 text-center truncate">
                      {v.label}
                    </div>
                    <div className="grid grid-cols-5 gap-1 w-full mb-1">
                      {BINGO_LETTERS.map((l) => (
                        <div
                          key={l.char}
                          className={`h-5 rounded text-[10px] font-extrabold flex items-center justify-center ${l.bg}`}
                        >
                          {l.char}
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-5 gap-1 w-full">
                      {v.grid.map((row, rIdx) =>
                        row.map((isHit, cIdx) => {
                          const isCenterFree = rIdx === 2 && cIdx === 2;
                          return (
                            <div
                              key={`${rIdx}-${cIdx}`}
                              className={`aspect-square rounded-full flex items-center justify-center text-[10px] font-extrabold ${
                                isCenterFree && isHit
                                  ? 'bg-emerald-500 text-white ring-2 ring-amber-400'
                                  : isCenterFree
                                  ? 'bg-emerald-600/80 text-white'
                                  : isHit
                                  ? v.id === 'fast-corners'
                                    ? 'bg-amber-500 text-slate-950 ring-2 ring-white scale-105'
                                    : 'bg-blue-600 text-white scale-105'
                                  : isDark
                                  ? 'bg-slate-800 text-slate-500 border border-slate-700'
                                  : 'bg-white text-slate-400 border border-slate-200'
                              }`}
                            >
                              {isCenterFree ? 'F' : isHit ? '✓' : ''}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: FAST BINGO SETTINGS (ቅንብር) */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-sm overflow-y-auto">
          <div
            className={`w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border p-4 sm:p-5 shadow-2xl space-y-3.5 ${
              isDark
                ? 'bg-slate-900 border-slate-700 text-slate-100'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-700/30">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center select-none">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-extrabold">
                    {t.settings}
                  </h2>
                  <p className="text-[11px] opacity-70">
                    {t.settingsDesc}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsSettingsModalOpen(false)}
                  className="p-1.5 rounded-xl bg-rose-600 text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* ምልክት የተደረጉ የጠቆሩ አጥፉ (Reset Marks) */}
            <div className="flex items-center justify-between p-3 rounded-2xl border border-rose-500/30 bg-rose-500/10">
              <div>
                <div className="text-xs font-black text-rose-400">
                  ምልክት የተደረጉ አጥፉ (Reset Marks)
                </div>
                <div className="text-[11px] text-rose-300/80">
                  በካርቴላዎች ላይ የጠቆሩ ምልክቶችን በሙሉ ያጸዳል
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  handleResetDaubMarks();
                  setIsSettingsModalOpen(false);
                }}
                className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>አጥፉ (Reset)</span>
              </button>
            </div>


            {/* 1. ሁሉንም ምረጥ (Select) & ሁሉንም አስመዝግብ */}
            <div
              className={`rounded-2xl border p-3.5 space-y-2.5 ${
                isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-extrabold text-amber-500">
                <span>{t.cartelaSelectionSection}</span>
                <span>
                  {selectedCartelaIds.length} / {cartelas.length}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (isSelectModeActive || selectedCartelaIds.length > 0) {
                      handleClearSelection();
                    } else {
                      setIsSelectModeActive(true);
                      handleSelectAllCartelas();
                    }
                  }}
                  className={`px-3 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 border cursor-pointer ${
                    isSelectModeActive || selectedCartelaIds.length > 0
                      ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                      : isDark
                      ? 'bg-slate-900 border-slate-700 text-slate-200'
                      : 'bg-white border-slate-300 text-slate-800'
                  }`}
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>
                    {isSelectModeActive || selectedCartelaIds.length > 0
                      ? t.unselectBtn
                      : t.selectBtn}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleRegisterAllCartelas();
                    setIsSettingsModalOpen(false);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{t.registerAllBtn}</span>
                </button>

                {selectedCartelaIds.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        handleRegisterSelectedCartelas();
                        setIsSettingsModalOpen(false);
                      }}
                      className="px-3 py-2 rounded-xl text-xs font-extrabold bg-emerald-600 text-white flex items-center gap-1 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>
                        {t.registerSelectedBtn} ({selectedCartelaIds.length})
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleDeleteSelectedCartelas();
                        setIsSettingsModalOpen(false);
                      }}
                      className="px-3 py-2 rounded-xl text-xs font-extrabold bg-rose-600 text-white flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>
                        {t.deleteSelectedBtn} ({selectedCartelaIds.length})
                      </span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* 2. 2 ጎን ለጎን | 3 ጎን ለጎን | Show Less (ሰብስብ) */}
            <div
              className={`rounded-2xl border p-3.5 space-y-2.5 ${
                isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="text-xs font-extrabold text-amber-400">
                {t.cartelaViewSection}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setGridColumns(2)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold border cursor-pointer transition-colors ${
                    gridColumns === 2
                      ? 'bg-amber-500 text-slate-950 border-amber-400'
                      : isDark
                      ? 'bg-slate-900 border-slate-700 text-slate-300'
                      : 'bg-white border-slate-300 text-slate-700'
                  }`}
                >
                  <Columns2 className="w-4 h-4" />
                  <span>{t.twoSideBySide}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setGridColumns(3)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold border cursor-pointer transition-colors ${
                    gridColumns === 3
                      ? 'bg-amber-500 text-slate-950 border-amber-400'
                      : isDark
                      ? 'bg-slate-900 border-slate-700 text-slate-300'
                      : 'bg-white border-slate-300 text-slate-700'
                  }`}
                >
                  <Columns3 className="w-4 h-4" />
                  <span>{t.threeSideBySide}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowFullCartelasSection(!showFullCartelasSection)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold border cursor-pointer transition-colors ${
                    isDark
                      ? 'bg-slate-900 text-rose-400 hover:bg-slate-800 border-slate-700'
                      : 'bg-rose-50 text-rose-600 hover:bg-rose-100 border-rose-200'
                  }`}
                >
                  {showFullCartelasSection ? (
                    <>
                      <ChevronUp className="w-4 h-4" />
                      <span>{t.showLess}</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4" />
                      <span>{t.showMore}</span>
                    </>
                  )}
                </button>
              </div>

              {/* ጨዋታ ከተጀመረ ያልተመዘገበ ካርቴላ፦ ይጥፋ (Hide) | ደብዝዝ (Dim) */}
              <div className="pt-2.5 border-t border-slate-700/20 space-y-1.5">
                <div className="text-[11px] font-extrabold text-amber-400">
                  {t.whenGameStartsUnregLabel}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setUnregisteredWhenStartedMode('hide')}
                    className={`px-3 py-2 rounded-xl text-xs font-extrabold border cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                      unregisteredWhenStartedMode === 'hide'
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                        : isDark
                        ? 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                        : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>{t.hideUnregBtn}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setUnregisteredWhenStartedMode('dim')}
                    className={`px-3 py-2 rounded-xl text-xs font-extrabold border cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                      unregisteredWhenStartedMode === 'dim'
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                        : isDark
                        ? 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                        : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>{t.dimUnregBtn}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 3. የፈጣን ቢንጎ አደራደር */}
            <div
              className={`rounded-2xl border p-3.5 space-y-2.5 ${
                isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-amber-400">
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span>{t.sortingSection}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    { id: 'by_square', label: 'በስኴር (2በ2)' },
                    { id: 'by_rect', label: 'በሬክታንግል (3በ2/2በ3)' },
                    { id: 'by_cross', label: 'በ + (3በ3 መስቀል)' },
                    { id: 'by_t', label: 'በ T (3በ3)' },
                    { id: 'by_fast_win', label: t.sortFastWin },
                    { id: 'by_corners', label: t.sortCorners },
                    { id: 'by_lines', label: t.sortLines },
                    { id: 'by_called', label: t.sortCalled },
                    { id: 'default', label: t.sortDefault },
                  ] as const
                ).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSortMode(s.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-colors cursor-pointer border ${
                      sortMode === s.id
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-xs'
                        : isDark
                        ? 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                        : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. ቋንቋ (አማ, ትግ, OM, EN) & Auto daub */}
            <div
              className={`rounded-2xl border p-3.5 space-y-3 ${
                isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-xs font-extrabold text-amber-400">{t.languageLabel}</div>
                  <div
                    className={`inline-flex items-center rounded-xl p-0.5 border ${
                      isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'
                    }`}
                  >
                    {(
                      [
                        { id: 'am', label: 'አማ' },
                        { id: 'ti', label: 'ትግ' },
                        { id: 'om', label: 'OM' },
                        { id: 'en', label: 'EN' },
                      ] as const
                    ).map((l) => (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => setLanguage(l.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-colors cursor-pointer ${
                          language === l.id
                            ? 'bg-amber-500 text-slate-950 shadow-2xs'
                            : 'opacity-70 hover:opacity-100'
                        }`}
                      >
                        {l.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-xs font-extrabold text-amber-400">Auto daub (Au):</div>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <span className="text-xs font-extrabold">
                      {autoDaub ? t.autoDaub : `${t.manualDaub}`}
                    </span>
                    <button
                      type="button"
                      onClick={() => setAutoDaub(!autoDaub)}
                      className={`w-11 h-6 rounded-full transition-colors p-0.5 flex items-center cursor-pointer ${
                        autoDaub ? 'bg-emerald-600 justify-end' : 'bg-slate-600 justify-start'
                      }`}
                    >
                      <span className="w-5 h-5 rounded-full bg-white shadow-sm" />
                    </button>
                  </label>
                </div>
              </div>

              {/* Sound Controls moved into ቅንብር (Settings): ጠሪ ON/OFF & ድምጽ ON/OFF */}
              <div className="pt-2.5 border-t border-slate-700/20 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-extrabold text-amber-400">
                  {t.soundColLabel} (Voice & SFX):
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const next = !voiceEnabled;
                      setVoiceEnabled(next);
                      soundFX.setVoiceEnabled(next);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold border transition-colors cursor-pointer ${
                      voiceEnabled
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                        : isDark
                        ? 'bg-slate-900 text-slate-400 border-slate-700'
                        : 'bg-white text-slate-600 border-slate-300'
                    }`}
                  >
                    {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                    <span>{voiceEnabled ? 'ጠሪ ON' : 'ጠሪ OFF'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const next = !sfxEnabled;
                      setSfxEnabled(next);
                      soundFX.setSfxEnabled(next);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold border transition-colors cursor-pointer ${
                      sfxEnabled
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-xs'
                        : isDark
                        ? 'bg-slate-900 text-slate-400 border-slate-700'
                        : 'bg-white text-slate-600 border-slate-300'
                    }`}
                  >
                    {sfxEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                    <span>{sfxEnabled ? 'ድምጽ ON' : 'ድምጽ OFF'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 5 & 6. Admin-Only Tools (Hidden from regular players unless logged in as Admin) */}
            {isAdminAuthenticated && (
              <div
                className={`rounded-2xl border p-3.5 space-y-2.5 ${
                  isDark ? 'bg-slate-800/60 border-amber-500/40' : 'bg-amber-50/70 border-amber-200'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-extrabold text-amber-400 flex items-center gap-1.5">
                    <Shield className="w-4 h-4" />
                    <span>🛡️ የቁጥጥር ፓነል (Control Panel)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSettingsModalOpen(false);
                      setActiveTab('admin');
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>ወደ መቆጣጠሪያ ግባ</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 3: DOWNLOAD STANDALONE FAST BINGO APP & TELEGRAM MINI APP SETUP */}
      {isDownloadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-sm overflow-y-auto">
          <div
            className={`w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border p-5 shadow-2xl space-y-4 ${
              isDark
                ? 'bg-slate-900 border-amber-500/40 text-slate-100'
                : 'bg-white border-amber-300 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between border-b pb-3 border-slate-700/40">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black">
                  <Zap className="w-5 h-5 fill-current" />
                </div>
                <div>
                  <h3 className="text-base font-black">
                    በቴሌግራም (Telegram) መጫኛ እና ማጋሪያ
                  </h3>
                  <p className="text-[11px] text-amber-400 font-bold">
                    Sun Fast Bingo · 500 ካርቴላ · 80% ደራሽ · ጃክፓት
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDownloadModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Method 1: Telegram Bot / Mini App (@BotFather) - BOTH APPS TOGETHER */}
            <div
              className={`p-3.5 rounded-xl border space-y-2.5 ${
                isDark ? 'bg-slate-800/70 border-sky-500/40' : 'bg-sky-50 border-sky-200'
              }`}
            >
              <div className="text-xs sm:text-sm font-black text-sky-400">
                ዘዴ 1፦ በ @BotFather ውስጥ URL (ሊንክ) እንዲጠይቅዎት የሚከተሉትን ቅደም-ተከተሎች ይጫኑ፦
              </div>
              <p className="text-xs opacity-90 leading-relaxed">
                በ <strong>@BotFather</strong> ላይ ቦት ሲፈጥሩ (<code>/newbot</code>) መጀመሪያ ስም ብቻ ነው የሚጠይቀው፤ <strong>ወዲያውኑ URL አይጠይቅም!</strong> ሊንኩን እንዲጠይቅዎት ይህን ያድርጉ፦
              </p>
              <ol className="text-xs space-y-1.5 list-decimal list-inside opacity-90 leading-relaxed">
                <li>
                  ለ <strong>@BotFather</strong> ይህን ትዕዛዝ ይላኩለት፦ <code>/setmenubutton</code> (ወይም <code>/mybots</code> ብለው ቦትዎን ይንኩ)።
                </li>
                <li>
                  ከሚመጣልዎት ዝርዝር ውስጥ የፈጠሩትን <strong>የቦት ስም (@...bot)</strong> ይንኩት።
                </li>
                <li>
                  በመቀጠል <strong>Bot Settings</strong> &rarr; <strong>Menu Button</strong> &rarr; <strong>Configure menu button</strong> የሚለውን ይንኩ።
                </li>
                <li>
                  ያኔ <em>&ldquo;Please send me the URL...&rdquo;</em> ብሎ <strong>URL ይጠይቅዎታል!</strong> ከታች ያለውን ሊንክ Copy አድርገው ይላኩለት፦
                </li>
                <li>
                  ከዚያ የቁልፉን ስም ሲጠይቅዎት፦ <code>🎲 ቢንጎ ተጫወት (Play Bingo)</code> ብለው ይላኩለት!
                </li>
              </ol>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  readOnly
                  value="https://ais-pre-5o2vwpcgfgshkft456mpos-198161772381.europe-west2.run.app"
                  className={`flex-1 px-3 py-2 rounded-xl text-xs font-mono-tabular border ${
                    isDark ? 'bg-slate-950 border-slate-700 text-amber-300' : 'bg-white border-slate-300'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => {
                    const shareUrl = 'https://ais-pre-5o2vwpcgfgshkft456mpos-198161772381.europe-west2.run.app';
                    if (typeof window !== 'undefined' && navigator.clipboard) {
                      navigator.clipboard.writeText(shareUrl);
                      setDownloadStatus('✓ የሁለቱም ጨዋታዎች ዋና የቴሌግራም ሊንክ ኮፒ ተደርጓል! @BotFather ላይ Paste ያድርጉት።');
                    }
                  }}
                  className="px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs cursor-pointer whitespace-nowrap"
                >
                  የሁለቱንም ሊንክ Copy
                </button>
              </div>

              {/* Automatic 1-Click Bot Token Connector (No need to search for URL prompt in @BotFather!) */}
              <div className="pt-2 border-t border-sky-500/20 space-y-2">
                <div className="text-xs font-black text-emerald-400">
                  ✨ ወይም በቀላሉ፦ @BotFather የሰጠዎትን Bot Token እዚህ ያስገቡ (ራሱ ወዲያውኑ ይጭነዋል!)
                </div>
                <p className="text-[11px] opacity-85">
                  በ @BotFather ውስጥ URL መፈለግ ካስቸገረዎት፣ ቦቱን ሲፈጥሩ @BotFather የሰጠዎትን ረጅም <strong>HTTP API Token</strong> (ምሳሌ፦ <code>7123456:AAH...</code>) እዚህ ያስገቡና ቁልፉን ይጫኑ፤ ሁለቱንም ጨዋታዎች በራሱ በቦትዎ ላይ ይጭንልዎታል!
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={botTokenInput}
                    onChange={(e) => setBotTokenInput(e.target.value)}
                    placeholder="የቦትዎን Token እዚህ Paste ያድርጉ (ለምሳሌ: 712345:AAH...)"
                    className={`flex-1 px-3 py-2 rounded-xl text-xs font-mono-tabular border ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300'
                    }`}
                  />
                  <button
                    type="button"
                    disabled={isConnectingBot || !botTokenInput.trim()}
                    onClick={async () => {
                      setIsConnectingBot(true);
                      setDownloadStatus('ከቴሌግራም ቦትዎ ጋር በማገናኘት ላይ...');
                      const result = await connectTelegramBotEverywhere(botTokenInput);
                      setDownloadStatus(result.message);
                      setIsConnectingBot(false);
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs cursor-pointer disabled:opacity-50 whitespace-nowrap"
                  >
                    {isConnectingBot ? 'በመጫን ላይ...' : 'በቦቴ ላይ ጫን (Auto-Setup)'}
                  </button>
                </div>

                {/* Copyable @BotFather /setcommands list for the menu items */}
                <div className="pt-2 border-t border-sky-500/20 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-extrabold text-amber-300">
                      📋 የቴሌግራም ሜኑ ዝርዝር (ለ @BotFather /setcommands)፦
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const cmdList = `menu - 🏠 Main Menu\nplay - 🎮 Play Live Bingo\ndeposit - Deposit 💵\nwithdraw - Withdraw 💸\nbalance - Check Balance 💰\njackpot - Jackpot 🎰\ntransfer - Transfer 🔄\nleaderboard - Leaderboard 🏆\ntoken - 🔐 Get Login Token / ኮድ\nrules - Game Rules 📖\nsupport - Support 📞`;
                        if (typeof window !== 'undefined' && navigator.clipboard) {
                          navigator.clipboard.writeText(cmdList);
                          setDownloadStatus('✓ ሁሉም የቦት ትዕዛዞች (ከ Main Menu ጋር) ኮፒ ተደርገዋል! @BotFather ላይ /setcommands ብለው Paste ያድርጉት።');
                        }
                      }}
                      className="px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 font-black text-[11px] cursor-pointer"
                    >
                      ሁሉንም Copy አድርግ
                    </button>
                  </div>
                  <pre className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono-tabular text-emerald-300 overflow-x-auto leading-relaxed">
{`menu - 🏠 Main Menu
play - 🎮 Play Live Bingo
deposit - Deposit 💵
withdraw - Withdraw 💸
balance - Check Balance 💰
jackpot - Jackpot 🎰
transfer - Transfer 🔄
leaderboard - Leaderboard 🏆
token - 🔐 Get Login Token / ኮድ
rules - Game Rules 📖
support - Support 📞`}
                  </pre>
                </div>
              </div>
            </div>

            {/* Method 2: Direct Telegram File / Channel Share & Full Project ZIP */}
            <div
              className={`p-3.5 rounded-xl border space-y-2.5 ${
                isDark ? 'bg-slate-800/70 border-amber-500/40' : 'bg-amber-50 border-amber-200'
              }`}
            >
              <div className="text-xs sm:text-sm font-black text-amber-400">
                ዘዴ 2፦ ሙሉውን የሰርቨር ፕሮጀክት (.ZIP) አውርዶ በራስ ሰርቨር ላይ መጫን
              </div>
              <p className="text-xs leading-relaxed opacity-90">
                ⚠️ <strong>ልብ ይበሉ፦</strong> ነጠላ <code>.html</code> ፋይል ብቻውን የ Frontend መልክ ብቻ ነው (ሰርቨር የለውም)። በ Railway፣ Render ወይም VPS ላይ ለመጫንና ለዲቨሎፐር ለመስጠት የግድ <strong>ሙሉውን .ZIP ፕሮጀክት (Ezi-Bingo-Full-Project.zip)</strong> ያውርዱ፦
              </p>


              <a
                href="/Ezi-Bingo-Full-Project.zip"
                download="Ezi-Bingo-Full-Project.zip"
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-sky-500 hover:from-amber-400 hover:to-sky-400 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg cursor-pointer no-underline"
              >
                <Download className="w-4 h-4 stroke-[2.5]" />
                <span>📦 ሙሉ ሰርቨር + Source Code አውርድ (Ezi-Bingo-Full-Project.zip)</span>
              </a>
            </div>

            {downloadStatus && (
              <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-extrabold">
                {downloadStatus}
              </div>
            )}
          </div>
        </div>
      )}

      <CartelaSelectorModal
        isOpen={isSelectorModalOpen}
        onClose={() => setIsSelectorModalOpen(false)}
        currentCount={cartelas.length}
        maxCartelas={stakeAmount === 0 || activeStakeTier === 0 ? 10 : 30}
        maxPoolId={FAST_MAX_POOL_CARTELAS}
        blockedCartelaIds={blockedCartelaIds}
        existingCartelaIds={cartelas.map((c) => c.id)}
        bonusCartelasForOver20={bonusCartelasForOver20}
        isDark={isDark}
        onAddBatchCartelas={handleAddBatchCartelas}
        onAddSpecificCartela={handleAddSpecificCartela}
      />

      <GameHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        history={gameHistory}
        isDark={isDark}
        currentUserName={currentUser?.name}
        currentUserPhone={currentUser?.phone}
        onInspectWinnerCartela={(w) => {
          setIsHistoryModalOpen(false);
          setInspectedWinner(w);
        }}
      />

      <WinnerCartelaInspectorModal
        winner={inspectedWinner}
        countdownSeconds={winnerDisplayCountdown}
        preGameHash={roundFairData.sha256Hash}
        onOpenVerifyModal={() => setIsProvablyFairModalOpen(true)}
        onClose={() => {
          setWinnerDisplayCountdown(null);
          setInspectedWinner(null);
        }}
        isDark={isDark}
      />

      <ProvablyFairModal
        isOpen={isProvablyFairModalOpen}
        onClose={() => setIsProvablyFairModalOpen(false)}
        isDark={isDark}
        roundId={gameMatchId}
        isPlaying={isPlaying}
        calledBalls={calledBalls}
        hasWinnerOrEnded={winnersList.length > 0 || calledBalls.length >= 75}
        clientSeed={clientSeed}
        onChangeClientSeed={(s) => setClientSeed(s)}
        roundFairData={roundFairData}
        history={gameHistory}
      />

      <OfflineIndicator />
    </div>
  );
};
