import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Home,
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
  RotateCcw,
  History,
  Eye,
  Trash2,
  CheckSquare,
  Square,
  BookOpen,
  ArrowUpDown,
  Zap,
  Play,
  ChevronUp,
  ChevronDown,
  Phone,
  ArrowLeft,
} from 'lucide-react';
import { EziBingoLogo } from './EziBingoLogo';
import { RulesAndPatternsModal } from './RulesAndPatternsModal';
import { GameSettingsModal } from './GameSettingsModal';
import { WinnerCartelaInspectorModal } from './WinnerCartelaInspectorModal';
import { BlockedCartelaInspectorModal } from './BlockedCartelaInspectorModal';
import { GameHistoryModal } from './GameHistoryModal';
import { MasterBoard75 } from './MasterBoard75';
import { CartelaCardView } from './CartelaCardView';
import { CartelaSelectorModal } from './CartelaSelectorModal';
import { FastCartela500GridPicker, OtherPlayerLockedCartela } from './FastCartela500GridPicker';
import { WalletView } from './WalletView';
import { ProfileAndSettingsView } from './ProfileAndSettingsView';
import { AdminPanelView } from './AdminPanelView';
import { FreeGameScheduleView } from './FreeGameScheduleView';
import { LeaderboardView } from './LeaderboardView';
import { GameHistoryView } from './GameHistoryView';
import { OfflineIndicator } from './OfflineIndicator';
import { PWAInstallButton } from './PWAInstallButton';
import { PlayerAuthScreen } from './PlayerAuthScreen';
import { ProvablyFairModal } from './ProvablyFairModal';
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
import { BINGO_PATTERNS, getRuleTitleByLang, getRuleDescByLang } from '../data/bingoPatterns';
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
import { PAYMENT_ACCOUNTS, TRANSLATIONS } from '../utils/translations';
import {
  AppAccentColor,
  BankPaymentAccount,
  CallSpeed,
  CartelaCard,
  CartelaSortMode,
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

interface RegularBingoStandaloneAppProps {
  onSwitchToFastApp?: () => void;
  onBackToLobby?: () => void;
  language: Language;
  onChangeLanguage: (lang: Language) => void;
  sharedUsers: UserAccount[];
  onUpdateSharedUsers: React.Dispatch<React.SetStateAction<UserAccount[]>>;
  sharedTransactions: TransactionRecord[];
  onUpdateSharedTransactions: React.Dispatch<React.SetStateAction<TransactionRecord[]>>;
  isAdminAuthenticated?: boolean;
  onToggleAdminAuthenticated?: (val: boolean) => void;
  openSettingsTrigger?: number;
  isDark?: boolean;
  onToggleTheme?: () => void;
}

export const RegularBingoStandaloneApp: React.FC<RegularBingoStandaloneAppProps> = ({
  onSwitchToFastApp,
  onBackToLobby,
  language,
  onChangeLanguage,
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
  const [activeTab, setActiveTab] = useState<
    'home' | 'play' | 'history' | 'leaderboard' | 'wallet' | 'profile' | 'admin'
  >(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      const t = p.get('tab');
      const hash = window.location.hash.toLowerCase();
      if (
        t === 'admin' ||
        p.get('admin') === '1' ||
        p.get('admin') === 'true' ||
        hash === '#admin' ||
        hash === '#/admin' ||
        hash === '#regular-admin' ||
        hash.includes('admin')
      ) {
        return 'admin';
      }
      if (t === 'history') return 'history';
      if (t === 'wallet') return 'wallet';
      if (t === 'leaderboard') return 'leaderboard';
      if (t === 'profile') return 'profile';
    }
    return 'play';
  });
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
  const [daubColor, setDaubColor] = useState<DaubColor>('green');
  const [accentColor, setAccentColor] = useState<AppAccentColor>('emerald');
  const [unregisteredWhenStartedMode, setUnregisteredWhenStartedMode] =
    useState<UnregisteredWhenStartedMode>('hide');
  const [autoDaub, setAutoDaub] = useState<boolean>(false);
  const [gridColumns, setGridColumns] = useState<2 | 3>(2);
  const [sortMode, setSortMode] = useState<CartelaSortMode>('default');
  const [notificationPref, setNotificationPref] = useState<NotificationPreference>('always');
  const [registrationMinutes, setRegistrationMinutes] = useState<number | null>(null);
  const [isPatternExplicitlySelected, setIsPatternExplicitlySelected] = useState<boolean>(true);

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

  // Listen for #admin URL hash or Ctrl+Shift+A keyboard shortcut
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleHash = () => {
      const h = window.location.hash.toLowerCase();
      const p = new URLSearchParams(window.location.search);
      if (
        h === '#admin' ||
        h === '#/admin' ||
        h === '#regular-admin' ||
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
    handleHash();
    window.addEventListener('hashchange', handleHash);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('hashchange', handleHash);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Modals
  const [isRulesModalOpen, setIsRulesModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [isSelectorModalOpen, setIsSelectorModalOpen] = useState<boolean>(false);

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
  const [isProvablyFairModalOpen, setIsProvablyFairModalOpen] = useState<boolean>(false);
  const [inspectedWinner, setInspectedWinner] = useState<WinnerAnnouncement | null>(null);
  const [inspectedBlockedId, setInspectedBlockedId] = useState<number | null>(null);
  const [customPrizeAmount, setCustomPrizeAmount] = useState<number | null>(null);
  const [showFullCartelasSection, setShowFullCartelasSection] = useState<boolean>(true);

  const users = sharedUsers;
  const setUsers = onUpdateSharedUsers;
  const transactions = sharedTransactions;
  const setTransactions = onUpdateSharedTransactions;
  const currentUser = users[0];

  // Regular 27-Rule Bingo State
  const [activePatternId, setActivePatternId] = useState<number>(1);
  const [stakeAmount, setStakeAmount] = useState<number>(10);
  const [gameMatchId, setGameMatchId] = useState<number>(() =>
    Math.floor(100000 + Math.random() * 900000)
  );
  const [calledBalls, setCalledBalls] = useState<number[]>([]);
  const [activeBall, setActiveBall] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [callSpeedSec, setCallSpeedSec] = useState<CallSpeed>(3);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(true);
  const [sfxEnabled, setSfxEnabled] = useState<boolean>(true);
  const [voiceGender, setVoiceGender] = useState<'female' | 'male'>(() => soundFX.getVoiceGender());
  const [vibrationEnabled, setVibrationEnabled] = useState<boolean>(() => soundFX.isVibrationEnabled());

  const handleToggleVoiceGender = (gender: 'female' | 'male') => {
    setVoiceGender(gender);
    soundFX.setVoiceGender(gender);
  };

  const handleToggleVibration = () => {
    const next = !vibrationEnabled;
    setVibrationEnabled(next);
    soundFX.setVibrationEnabled(next);
    if (next) soundFX.vibrate(200);
  };
  const [isServerRealtimeConnected, setIsServerRealtimeConnected] = useState<boolean>(false);
  const [preGameCountdown, setPreGameCountdown] = useState<number | null>(null);
  const [winnerDisplayCountdown, setWinnerDisplayCountdown] = useState<number | null>(null);

  const [cartelas, setCartelas] = useState<CartelaCard[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('ezi_regular_cartelas_v3');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.map((item: { id: number; isRegistered?: boolean; isBonus?: boolean; isBlocked?: boolean; manualMarks?: boolean[][] }) => {
              const fullCard = generateCartelaById(item.id);
              return {
                ...fullCard,
                isRegistered: Boolean(item.isRegistered),
                isBonus: Boolean(item.isBonus),
                isBlocked: Boolean(item.isBlocked),
                manualMarks: Array.isArray(item.manualMarks)
                  ? item.manualMarks
                  : fullCard.manualMarks,
              };
            });
          }
        }
      } catch {
        // ignore
      }
    }
    return [
      { ...generateCartelaById(7), isRegistered: false },
      { ...generateCartelaById(21), isRegistered: false },
      { ...generateCartelaById(84), isRegistered: false },
      { ...generateCartelaById(142), isRegistered: false },
    ];
  });

  // Save cartelas to localStorage so registered cartela is never erased when leaving and returning!
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const toSave = cartelas.map((c) => ({
        id: c.id,
        isRegistered: c.isRegistered,
        isBonus: c.isBonus,
        isBlocked: c.isBlocked,
        manualMarks: c.manualMarks,
      }));
      localStorage.setItem('ezi_regular_cartelas_v3', JSON.stringify(toSave));
    } catch {
      // ignore
    }
  }, [cartelas]);
  const [selectedCartelaIds, setSelectedCartelaIds] = useState<number[]>([]);
  const [blockedCartelaIds, setBlockedCartelaIds] = useState<number[]>([]);
  const [blockedReasonsMap, setBlockedReasonsMap] = useState<Record<number, string>>({});
  const [serverSha256Hash, setServerSha256Hash] = useState<string | null>(null);
  const [otherPlayersLockedCartelas, setOtherPlayersLockedCartelas] = useState<
    OtherPlayerLockedCartela[]
  >([]);
  const [onlinePlayersCount, setOnlinePlayersCount] = useState<number>(1);
  const [winnersList, setWinnersList] = useState<WinnerAnnouncement[]>([]);
  const [verificationFailure, setVerificationFailure] = useState<VerificationFailureInfo | null>(
    null
  );
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [pendingVerificationCartelas, setPendingVerificationCartelas] = useState<
    { cartelaId: number; reason: string; winningCells?: [number, number][]; claimedAt: number }[]
  >([]);
  const [gameHistory, setGameHistory] = useState<GameHistoryRecord[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('ezi_regular_game_history_v1');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch {}
    }
    return [];
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('ezi_regular_game_history_v1', JSON.stringify(gameHistory.slice(0, 100)));
    } catch {}
  }, [gameHistory]);

  const [bingoCountdown, setBingoCountdown] = useState<number | null>(null);
  const [gameFinishedAt, setGameFinishedAt] = useState<number | null>(null);
  const [isPostTwoMinutes, setIsPostTwoMinutes] = useState<boolean>(false);
  const hasTriggered30sAlarmRef = useRef(false);
  const localUnregisteredIdsRef = useRef<Set<number>>(new Set());

  // Pre-game registration countdown timer (synchronized with server)
  useEffect(() => {
    if (preGameCountdown === null) {
      hasTriggered30sAlarmRef.current = false;
      return;
    }
    // Sound alarm and announce when exactly 30s remain
    if (preGameCountdown === 30 && !hasTriggered30sAlarmRef.current) {
      hasTriggered30sAlarmRef.current = true;
      soundFX.playSixSecondCountdownAlert(language);
      setStatusNotice('⚠️ ማሳወቂያ! ጨዋታው ሊጀምር 30 ሰከንድ ቀርቷል! እባክዎ ካርቴላዎን ያስመዝግቡ።');
    }
    if (preGameCountdown <= 0) {
      setPreGameCountdown(null);
      hasTriggered30sAlarmRef.current = false;
      setIsPlaying(true);
      return;
    }
    // Standalone / offline fallback tick when not receiving server ticks
    if (!isServerRealtimeConnected) {
      const timer = setTimeout(() => {
        setPreGameCountdown((prev) => (prev !== null && prev > 0 ? prev - 1 : null));
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [preGameCountdown, language, isServerRealtimeConnected]);

  useEffect(() => {
    if (bingoCountdown === null) return;
    if (bingoCountdown <= 0) return;
    if (!isServerRealtimeConnected) {
      const timer = setTimeout(() => {
        setBingoCountdown((prev) => (prev && prev > 1 ? prev - 1 : 0));
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [bingoCountdown, isServerRealtimeConnected]);

  const handleResetGame = useCallback(() => {
    localUnregisteredIdsRef.current.clear();
    dispatchServerRoomAction({ mode: 'regular', action: 'reset_round' });
    setIsPlaying(false);
    setIsPaused(false);
    setCalledBalls([]);
    setActiveBall(null);
    setWinnersList([]);
    setVerificationFailure(null);
    setBlockedCartelaIds([]);
    setBlockedReasonsMap({});
    setGameFinishedAt(null);
    setIsPostTwoMinutes(false);
    setBingoCountdown(null);
    setPendingVerificationCartelas([]);
    setCartelas((prev) => prev.map((c) => ({ ...c, isRegistered: false, isBlocked: false })));
  }, []);

  // Auto-restart Regular Bingo 2 minutes (120 seconds) after round finishes as requested:
  // "በRegular bingo ጨዋታ ካለቀ ከ 2 ደቂቃ በሀላ አዲስ ጨዋታ ለመጀመር restarts ያርግ"
  useEffect(() => {
    if (!gameFinishedAt) {
      setIsPostTwoMinutes(false);
      return;
    }
    const interval = setInterval(() => {
      if (Date.now() - gameFinishedAt >= 120000) {
        setGameFinishedAt(null);
        setIsPostTwoMinutes(false);
        setIsPatternExplicitlySelected(false);
        handleResetGame();
        setStatusNotice(
          language === 'am'
            ? '⏱️ የ 2 ደቂቃ እረፍት ተጠናቋል! አዲስ የቢንጎ ዙር ተዘጋጅቷል፤ እባክዎ ካርቴላዎን ያስመዝግቡ።'
            : language === 'ti'
            ? '⏱️ ናይ 2 ደቒቕ ዕረፍቲ ተወዲኡ! ሓድሽ ዙር ጸወታ ተጀሚሩ፤ ብኽብረትኩም ካርቴላኹም ኣመዝግቡ።'
            : language === 'om'
            ? '⏱️ Boqonnaan daqiiqaa 2 xumurameera! Marsaan haaraan eegaleera; kaartelaa keessan galmeessaa.'
            : '⏱️ 2-minute break completed! A fresh round is ready; please register your cartela.'
        );
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [gameFinishedAt, handleResetGame, language]);

  useEffect(() => {
    if (winnersList.length > 0 || (calledBalls.length >= 75 && !isPlaying)) {
      if (gameFinishedAt === null) {
        setGameFinishedAt(Date.now());
        if (bingoCountdown === null) {
          setBingoCountdown(15);
        }
      }
    }
  }, [winnersList.length, calledBalls.length, isPlaying, gameFinishedAt, bingoCountdown]);

  // Regular Bingo: Game is only finished when the bingo claim countdown has ended!
  // During bingoCountdown (while > 0), other players can still claim bingo.
  const isRegularGameFinished = Boolean(
    (winnersList.length > 0 && bingoCountdown === 0) ||
    (calledBalls.length >= 75 && !isPlaying) ||
    (gameFinishedAt !== null && bingoCountdown === 0)
  );

  const [heroBanners, setHeroBanners] = useState<HeroBannerAd[]>([
    {
      id: 'hb-reg-1',
      title: 'Sun Bingo — መደበኛ ቢንጎ ከአሸናፊ ቅጦች ጋር!',
      subtitle: 'የአማርኛ ድምፅ ጥሪ · 80% ደራሽ!',
      badgeText: 'ልዩ ቦነስ',
      accentColor: 'emerald',
      isActive: true,
    },
  ]);
  const [bankAccounts, setBankAccounts] = useState<BankPaymentAccount[]>(PAYMENT_ACCOUNTS);
  const [requireDepositApproval, setRequireDepositApproval] = useState<boolean>(true);
  const [bonusCartelasForOver20, setBonusCartelasForOver20] = useState<number>(5);

  const t = TRANSLATIONS[language];
  const activePattern = useMemo(
    () => BINGO_PATTERNS.find((p) => p.id === activePatternId) || BINGO_PATTERNS[0],
    [activePatternId]
  );
  const localizedPatternName = !isPatternExplicitlySelected
    ? language === 'am'
      ? 'አልተቀመጠም'
      : language === 'ti'
      ? 'ኣይተወሰነን'
      : language === 'om'
      ? 'Hinkiilamne'
      : 'Not Set'
    : getRuleTitleByLang(activePattern, language);

  const registeredCartelasCount = cartelas.filter((c) => c.isRegistered).length;
  const activePlayersCartelasCount =
    otherPlayersLockedCartelas.length + registeredCartelasCount;
  const prizeAmount =
    customPrizeAmount !== null
      ? customPrizeAmount
      : Number((Math.max(1, activePlayersCartelasCount) * stakeAmount * 0.8).toFixed(2));

  const roundFairData = useMemo(() => generateProvablyFairRound(gameMatchId), [gameMatchId]);

  // Subscribe to Server Regular Room Sync
  const applyServerRegularRoom = useCallback(
    (room?: ServerRoomStatePayload, lockedList?: ServerLockedCartelaItem[]) => {
      if (!room) return;
      setIsPlaying(room.isPlaying);
      setIsPaused(room.isPaused);
      if (typeof room.preGameCountdown === 'number' || room.preGameCountdown === null) {
        setPreGameCountdown(room.preGameCountdown);
      }
      if (typeof room.bingoClaimCountdown === 'number' || room.bingoClaimCountdown === null) {
        setBingoCountdown(room.bingoClaimCountdown);
      }
      setWinnerDisplayCountdown(room.winnerDisplayCountdown);
      const nextBalls = room.calledBalls || [];
      setCalledBalls(nextBalls);
      setActiveBall(room.activeBall);
      if (typeof room.activePatternId === 'number') {
        setActivePatternId(room.activePatternId);
      }
      if (typeof room.stakeAmount === 'number') {
        setStakeAmount(room.stakeAmount);
      }
      if (typeof room.prizeAmount === 'number' && room.prizeAmount > 0) {
        setCustomPrizeAmount(room.prizeAmount);
      }
      if (Array.isArray(room.winnersList)) {
        setWinnersList(room.winnersList);
      }
      if (Array.isArray(room.blockedCartelaIds)) {
        setBlockedCartelaIds(room.blockedCartelaIds);
      }
      if (room.sha256Hash) {
        setServerSha256Hash(room.sha256Hash);
      }
      if (room.gameMatchId) {
        setGameMatchId(room.gameMatchId);
      }
      if (Array.isArray(room.gameHistory) && room.gameHistory.length > 0) {
        setGameHistory((prev) => {
          const map = new Map<number, GameHistoryRecord>();
          for (const item of room.gameHistory!) {
            map.set(item.gameMatchId, {
              id: item.id || `rgh-${item.gameMatchId}`,
              gameMatchId: item.gameMatchId,
              timestamp: item.timestamp,
              stakeAmount: item.stakeAmount,
              prizeAmount: item.prizeAmount,
              patternTitle: item.patternTitle || activePattern.titleAm,
              totalBallsCalled: item.totalBallsCalled || 0,
              lastBall: item.lastBall || 0,
              calledBallsSnapshot: item.calledBallsSnapshot || [],
              winners: item.winners || [],
              provablyFairHash: item.provablyFairHash,
              participantPhones: item.participantPhones,
              participantCartelasByPhone: item.participantCartelasByPhone,
            });
          }
          for (const item of prev) {
            if (!map.has(item.gameMatchId)) {
              map.set(item.gameMatchId, item);
            }
          }
          return Array.from(map.values()).sort((a, b) => b.gameMatchId - a.gameMatchId);
        });
      }
      if (Array.isArray(lockedList)) {
        const myClientId = getDeviceClientId();
        const myPhone = (currentUser?.phone || '').trim();
        const others = lockedList
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
        setOtherPlayersLockedCartelas(others);

        // Keep and restore my own registered cartelas so they never get deleted on exit / reload
        const mine = lockedList.filter((item) =>
          item.clientId ? item.clientId === myClientId : item.ownerPhone === myPhone
        );
        if (mine.length > 0) {
          setCartelas((prev) => {
            const mineMap = new Map(mine.map((m) => [m.cartelaId, m]));
            let changed = false;
            const updated = prev.map((card) => {
              if (mineMap.has(card.id) && !localUnregisteredIdsRef.current.has(card.id)) {
                if (!card.isRegistered) {
                  changed = true;
                  return { ...card, isRegistered: true };
                }
              }
              return card;
            });
            const existingIds = new Set(prev.map((c) => c.id));
            for (const m of mine) {
              if (!existingIds.has(m.cartelaId) && !localUnregisteredIdsRef.current.has(m.cartelaId)) {
                changed = true;
                updated.push({
                  ...generateCartelaById(m.cartelaId),
                  isRegistered: true,
                  isBonus: false,
                });
              }
            }
            return changed ? updated : prev;
          });
        }
      }
    },
    [currentUser?.phone]
  );

  useEffect(() => {
    const unsub = subscribeRealtimeRoomSync((msg, connected) => {
      setIsServerRealtimeConnected(connected);
      if (msg.regularRoom) {
        applyServerRegularRoom(msg.regularRoom, msg.regularLockedCartelas);
      }
    });
    return unsub;
  }, [applyServerRegularRoom]);

  const refreshRegularRoomState = useCallback(() => {
    fetch(buildApiUrl('/api/live-room/state?mode=regular'))
      .then((r) => r.json())
      .then((data) => {
        if (data?.ok && data.regularRoom) {
          setIsServerRealtimeConnected(true);
          applyServerRegularRoom(data.regularRoom, data.regularLockedCartelas);
        }
      })
      .catch(() => setIsServerRealtimeConnected(false));
  }, [applyServerRegularRoom]);

  useEffect(() => {
    refreshRegularRoomState();
  }, [refreshRegularRoomState]);

  const lockOrUnlockRegularCartela = useCallback(
    (cartelaId: number, action: 'lock' | 'unlock') => {
      fetch(buildApiUrl('/api/live-room/lock-cartela'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'regular',
          stakeAmount,
          cartelaId,
          phone: currentUser?.phone || '0942742684',
          name: currentUser?.name || 'Player',
          clientId: getDeviceClientId(),
          action,
        }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data?.ok && data.room) {
            applyServerRegularRoom(data.room, data.lockedCartelas);
          }
        })
        .catch(() => {});
    },
    [stakeAmount, currentUser?.phone, currentUser?.name, applyServerRegularRoom]
  );

  const drawNextBall = useCallback(() => {
    if (isServerRealtimeConnected) {
      dispatchServerRoomAction({ mode: 'regular', action: 'draw_next' });
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
  }, [isServerRealtimeConnected, roundFairData, voiceEnabled, language, callSpeedSec]);

  const handleTogglePause = useCallback(() => {
    dispatchServerRoomAction({
      mode: 'regular',
      action: 'toggle_pause',
    });
    if (!isPlaying) {
      setPreGameCountdown(null);
      setIsPlaying(true);
      setIsPaused(false);
      if (calledBalls.length === 0) {
        drawNextBall();
      }
    } else {
      setIsPaused((prev) => !prev);
    }
  }, [isPlaying, calledBalls.length, drawNextBall]);

  const handleChangeSpeed = useCallback((spd: CallSpeed) => {
    setCallSpeedSec(spd);
    dispatchServerRoomAction({
      mode: 'regular',
      action: 'set_speed',
      callSpeedSec: spd,
    });
  }, []);

  const handleDrawNextManual = useCallback(() => {
    dispatchServerRoomAction({
      mode: 'regular',
      action: 'draw_next',
    });
    drawNextBall();
  }, [drawNextBall]);

  const REGULAR_MAX_POOL_CARTELAS = 70000;

  // Automatic bonus cartelas for over 20 registered:
  // "ቦነስ እየሰጠ አደለም ከ 20 በላይ ላስመዘገበ ብቻ"
  const applyBonusIfApplicable = useCallback(
    (cards: CartelaCard[]): CartelaCard[] => {
      const regularRegistered = cards.filter((c) => !c.isBonus && c.isRegistered);
      const currentBonus = cards.filter((c) => c.isBonus);

      // Only give bonus if strictly MORE THAN 20 cartelas are registered (> 20)
      if (regularRegistered.length <= 20) {
        if (currentBonus.length > 0) {
          currentBonus.forEach((b) => lockOrUnlockRegularCartela(b.id, 'unlock'));
          return cards.filter((c) => !c.isBonus);
        }
        return cards;
      }

      // If > 20 registered, grant +bonusCartelasForOver20 (default 5) bonus cards
      const targetBonusCount = bonusCartelasForOver20 || 5;
      if (currentBonus.length >= targetBonusCount) {
        return cards;
      }

      const existingIds = new Set(cards.map((c) => c.id));
      const newlyAdded: CartelaCard[] = [];
      let candidate = 101;
      while (
        newlyAdded.length < targetBonusCount - currentBonus.length &&
        candidate <= REGULAR_MAX_POOL_CARTELAS
      ) {
        if (!existingIds.has(candidate)) {
          existingIds.add(candidate);
          const bonusCard: CartelaCard = {
            ...generateCartelaById(candidate),
            isRegistered: true,
            isBonus: true,
          };
          newlyAdded.push(bonusCard);
          lockOrUnlockRegularCartela(candidate, 'lock');
        }
        candidate++;
      }

      if (newlyAdded.length > 0) {
        setStatusNotice(
          `🎁 ከ20 በላይ (21+) ካርቴላ ስላስመዘገቡ +${newlyAdded.length} ነፃ ቦነስ ካርቴላ ተሰጥቶዎታል!`
        );
        return [...cards, ...newlyAdded];
      }
      return cards;
    },
    [bonusCartelasForOver20, lockOrUnlockRegularCartela]
  );

  const handleToggleRegister = (cid: number) => {
    if (isPlaying || calledBalls.length > 0) return;
    setCartelas((prev) => {
      const target = prev.find((c) => c.id === cid);
      if (!target) return prev;
      const willBeRegistered = !target.isRegistered;
      if (willBeRegistered) {
        localUnregisteredIdsRef.current.delete(cid);
      } else {
        localUnregisteredIdsRef.current.add(cid);
      }
      lockOrUnlockRegularCartela(cid, willBeRegistered ? 'lock' : 'unlock');
      const updated = prev.map((c) =>
        c.id === cid ? { ...c, isRegistered: willBeRegistered } : c
      );
      return applyBonusIfApplicable(updated);
    });
  };

  const handleAddBatchCartelas = (requestedCount: number) => {
    setCartelas((prev) => {
      const existingIds = new Set(prev.map((c) => c.id));
      const blockedSet = new Set(blockedCartelaIds);
      const newCards: CartelaCard[] = [...prev];

      const pickUniqueId = () => {
        let candidate = Math.floor(Math.random() * REGULAR_MAX_POOL_CARTELAS) + 1;
        let attempts = 0;
        while ((existingIds.has(candidate) || blockedSet.has(candidate)) && attempts < 1000) {
          candidate = Math.floor(Math.random() * REGULAR_MAX_POOL_CARTELAS) + 1;
          attempts++;
        }
        existingIds.add(candidate);
        return candidate;
      };

      const limit = stakeAmount === 0 ? 10 : 30;
      const slotsAvailable = Math.max(0, limit - newCards.filter((c) => !c.isBonus).length);
      const toAddPaid = Math.min(requestedCount, slotsAvailable);

      for (let i = 0; i < toAddPaid; i++) {
        const id = pickUniqueId();
        localUnregisteredIdsRef.current.add(id);
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
    const limit = stakeAmount === 0 ? 10 : 30;
    if (cartelas.filter((c) => !c.isBonus).length >= limit) {
      if (stakeAmount === 0) {
        setStatusNotice('በነፃ ጨዋታ አንድ ተጫዋች እስከ 10 ካርቴላ ብቻ ነው የሚፈቀደው!');
      }
      return;
    }
    localUnregisteredIdsRef.current.add(id);
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

  const handleClaimBingo = (cartela: CartelaCard) => {
    if (!isPlaying && calledBalls.length === 0) {
      setStatusNotice('ጨዋታው ገና አልጀመረም!');
      return;
    }
    const result = verifyCartelaBingo(cartela, calledBalls, activeBall, activePattern);
    if (result.isValid) {
      setIsPlaying(false);
      soundFX.playVictoryFanfare();
      const nextCount = winnersList.some((w) => w.cartelaId === cartela.id)
        ? winnersList.length
        : winnersList.length + 1;
      const equalShare = Number((prizeAmount / nextCount).toFixed(2));
      const winningBall = activeBall || (calledBalls.length > 0 ? calledBalls[calledBalls.length - 1] : 1);
      const winnerObj: WinnerAnnouncement = {
        cartelaId: cartela.id,
        userName: currentUser?.name || 'Player',
        prizeAmount: equalShare,
        winningCells: result.winningCells,
        lastBall: winningBall,
        calledBallsSnapshot: [...calledBalls],
        patternTitle: activePattern.titleAm,
        timestamp: new Date().toLocaleString(),
      };
      setWinnersList((prev) => {
        if (prev.some((w) => w.cartelaId === winnerObj.cartelaId)) return prev;
        return [...prev.map((w) => ({ ...w, prizeAmount: equalShare })), winnerObj];
      });
      setInspectedWinner(winnerObj);

      const histRecord: GameHistoryRecord = {
        id: `rgh-${Date.now()}`,
        gameMatchId,
        timestamp: new Date().toLocaleString(),
        stakeAmount,
        prizeAmount: equalShare,
        patternTitle: activePattern.titleAm,
        totalBallsCalled: calledBalls.length,
        lastBall: winningBall,
        calledBallsSnapshot: [...calledBalls],
        playedByCurrentUser: true,
        myRegisteredCartelaIds: cartelas.filter((c) => c.isRegistered).map((c) => c.id),
        provablyFairHash: serverSha256Hash || roundFairData.sha256Hash,
        winners: [
          {
            cartelaId: cartela.id,
            userName: currentUser?.name || 'Player',
            prizeAmount: equalShare,
            winningCells: result.winningCells,
          },
        ],
      };
      setGameHistory((prev) => [histRecord, ...prev.filter((h) => h.gameMatchId !== gameMatchId)]);
      if (!gameFinishedAt) {
        setGameFinishedAt(Date.now());
      }
      // One single 30s countdown: do not reset when 2nd or 3rd claim occurs!
      setBingoCountdown((prev) => (prev !== null && prev > 0 ? prev : 30));
      setUsers((prev) =>
        prev.map((u, idx) => (idx === 0 ? { ...u, balance: Number((u.balance + equalShare).toFixed(2)) } : u))
      );
      dispatchServerRoomAction({
        mode: 'regular',
        action: 'claim_win',
        winner: winnerObj,
        winnerPhone: currentUser?.phone || '0942742684',
      });
    } else if (result.needsAdminVerification || result.isPatternComplete) {
      // Completed pattern across complex or multi-way winning rule:
      // Route to Admin Verification as requested: "ባንተ ሚፀድቀዉ ዉስብ ስብ ከሆነብህ admin እንዲያረጋግጠዉ አርግ"
      soundFX.playNotificationChime();
      const pendingReason =
        result.reasonAm ||
        'የተሟላ ቢንጎ ሰርቷል! አድሚን እንዲያረጋግጠው ተልኳል።';
      setStatusNotice(
        `📋 ካርቴላ #${cartela.id} ቅጡን አሟልቷል! አድሚን እንዲያረጋግጠው ተልኳል (Pending Admin Verification)`
      );
      setPendingVerificationCartelas((prev) => [
        ...prev.filter((p) => p.cartelaId !== cartela.id),
        {
          cartelaId: cartela.id,
          reason: pendingReason,
          winningCells: result.winningCells,
          claimedAt: Date.now(),
        },
      ]);
      dispatchServerRoomAction({
        mode: 'regular',
        action: 'submit_pending_claim',
        cartelaId: cartela.id,
        reason: pendingReason,
        winningCells: result.winningCells,
      });
    } else {
      soundFX.playErrorBuzzer();
      const blockReason =
        result.reasonAm ||
        'የተሳሳተ ቢንጎ! ምንም የተሟላ ቅጥ የለም።';

      // Automatically block the cartela when false bingo with no completed pattern occurs
      setBlockedCartelaIds((prev) => (prev.includes(cartela.id) ? prev : [...prev, cartela.id]));
      setBlockedReasonsMap((prev) => ({ ...prev, [cartela.id]: blockReason }));
      setCartelas((prev) =>
        prev.map((c) => (c.id === cartela.id ? { ...c, isBlocked: true } : c))
      );
      setVerificationFailure({
        cartelaId: cartela.id,
        reasonAm: blockReason,
        missingNumbers: result.missingNumbers,
        lastBallIncluded: result.lastBallIncluded,
        countdownSeconds: 15,
      });
      dispatchServerRoomAction({
        mode: 'regular',
        action: 'block_cartela',
        cartelaId: cartela.id,
        reason: blockReason,
      });
    }
  };

  const handleManualApproveWinner = useCallback((cartelaId: number) => {
    let targetCard = cartelas.find((c) => c.id === cartelaId);
    if (!targetCard) {
      targetCard = generateCartelaById(cartelaId);
    }
    // Unblock if blocked
    setBlockedCartelaIds((prev) => prev.filter((b) => b !== cartelaId));
    setCartelas((prev) => prev.map((c) => (c.id === cartelaId ? { ...c, isBlocked: false, isRegistered: true } : c)));

    setIsPlaying(false);
    soundFX.playVictoryFanfare();
    const winningBall = activeBall || (calledBalls.length > 0 ? calledBalls[calledBalls.length - 1] : 1);
    const winnerObj: WinnerAnnouncement = {
      cartelaId: targetCard.id,
      userName: `Cartela #${targetCard.id} (Admin Verified)`,
      prizeAmount: prizeAmount,
      winningCells: [],
      lastBall: winningBall,
      calledBallsSnapshot: [...calledBalls],
      patternTitle: `${activePattern.titleAm} (በአድሚን የተረጋገጠ)`,
      timestamp: new Date().toLocaleString(),
    };
    setWinnersList((prev) => {
      if (prev.some((w) => w.cartelaId === cartelaId)) return prev;
      return [...prev, winnerObj];
    });
    setInspectedWinner(winnerObj);
    if (!gameFinishedAt) {
      setGameFinishedAt(Date.now());
    }
    setBingoCountdown(30);
    setStatusNotice(`🏆 ካርቴላ #${cartelaId} በአድሚን ውሳኔ አሸናፊ ሆኖ ፀድቋል!`);
    dispatchServerRoomAction({
      mode: 'regular',
      action: 'claim_win',
      winner: winnerObj,
      winnerPhone: currentUser?.phone || '0942742684',
    });
  }, [cartelas, activeBall, calledBalls, prizeAmount, activePattern.titleAm, gameFinishedAt, currentUser?.phone]);

  const handleSelectPattern = (patternId: number) => {
    setActivePatternId(patternId);
    setIsPatternExplicitlySelected(true);
    setIsPostTwoMinutes(false);
    const chosen = BINGO_PATTERNS.find((p) => p.id === patternId);
    if (chosen) {
      setStatusNotice(`🎯 የተመረጠው ጨዋታ፦ ${chosen.titleAm}`);
    }
    dispatchServerRoomAction({
      mode: 'regular',
      action: 'update_settings',
      activePatternId: patternId,
    });
  };

  const handleApprovePendingClaim = useCallback(
    (cartelaId: number) => {
      setPendingVerificationCartelas((prev) => prev.filter((p) => p.cartelaId !== cartelaId));
      handleManualApproveWinner(cartelaId);
    },
    [handleManualApproveWinner]
  );

  const handleRejectPendingClaim = useCallback((cartelaId: number) => {
    setPendingVerificationCartelas((prev) => prev.filter((p) => p.cartelaId !== cartelaId));
    setStatusNotice(`ካርቴላ #${cartelaId} በአድሚን ውድቅ ተደርጓል።`);
  }, []);

  const handleSetRegistrationMinutes = (minutes: number) => {
    setRegistrationMinutes(minutes);
    setIsPlaying(false);
    setCalledBalls([]);
    setActiveBall(null);
    setWinnersList([]);
    setGameFinishedAt(null);
    setBingoCountdown(null);
    setIsPostTwoMinutes(false);
    hasTriggered30sAlarmRef.current = false;
    if (minutes > 0) {
      setPreGameCountdown(minutes * 60);
      setStatusNotice(`⏱️ የ ${minutes} ደቂቃ የምዝገባ ሰዓት ተጀምሯል! እባክዎ ካርቴላዎን ያስመዝግቡ።`);
    } else {
      setPreGameCountdown(null);
    }
    dispatchServerRoomAction({
      mode: 'regular',
      action: 'update_settings',
      registrationMinutes: minutes,
      countdownSeconds: minutes > 0 ? minutes * 60 : 0,
      preGameCountdown: minutes > 0 ? minutes * 60 : null,
      isPlaying: false,
    });
  };

  // Sorted cartelas according to sortMode (including new by_square, by_rect, by_cross, by_t)
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
      if (sortMode === 'by_lines') return mB.lineScore - mA.lineScore;
      if (sortMode === 'by_called') return mB.calledCount - mA.calledCount;
      if (sortMode === 'by_squares') return mB.squareScore - mA.squareScore;
      return mB.calledCount - mA.calledCount;
    });
    return copy;
  }, [cartelas, calledBalls, autoDaub, sortMode]);

  return (
    <div className={`min-h-screen pb-24 ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'}`}>
      <main className="max-w-7xl mx-auto px-3 sm:px-6 pt-3 space-y-4">
        {activeTab === 'home' && (
          <FreeGameScheduleView
            heroBanners={heroBanners}
            activePatternId={activePatternId}
            language={language}
            isDark={isDark}
            onGoToPlay={() => setActiveTab('play')}
            onStartFastBingo={onSwitchToFastApp}
            onOpenRulesModal={() => setIsRulesModalOpen(true)}
            onTriggerFreeDemoGame={() => {
              setStakeAmount(0);
              setActiveTab('play');
            }}
          />
        )}

        {activeTab === 'play' && (
          <div className="space-y-4">
            {/* STICKY MASTER BOARD: pinned at top so cartela cards scroll smoothly underneath without jumping */}
            <div
              className={`sticky top-[42px] sm:top-[44px] z-30 pt-1 pb-1.5 space-y-2 shadow-lg transition-colors ${
                isDark ? 'bg-[#050B16] border-b border-slate-800/80' : 'bg-slate-100 border-b border-slate-200'
              }`}
            >
              <MasterBoard75
                calledBalls={calledBalls}
                activeBall={activeBall}
                isPlaying={isPlaying}
                isPaused={isPaused}
                callSpeedSec={callSpeedSec}
                isFastBingoMode={false}
                voiceEnabled={voiceEnabled}
                sfxEnabled={sfxEnabled}
                autoDaub={autoDaub}
                isSelectModeActive={false}
                selectedCartelasCount={0}
                isAdminMode={isAdminAuthenticated}
                language={language}
                isDark={isDark}
                gamePatternName={localizedPatternName}
                gameMatchId={gameMatchId}
                stakeAmount={stakeAmount}
                prizeAmount={prizeAmount}
                registeredCount={registeredCartelasCount}
                heldCartelasCount={cartelas.length}
                preGameCountdown={preGameCountdown}
                isGameFinished={isRegularGameFinished}
                winningCartelaIds={winnersList.map((w) => w.cartelaId)}
                blockedCartelaIds={blockedCartelaIds}
                bingoCountdown={bingoCountdown}
                onInspectWinnerCartela={(cid) => {
                  const found = winnersList.find((w) => w.cartelaId === cid);
                  if (found) {
                    setInspectedWinner(found);
                  } else {
                    setInspectedWinner({
                      cartelaId: cid,
                      userName: 'Player',
                      prizeAmount,
                      winningCells: [],
                      lastBall: activeBall || (calledBalls.length > 0 ? calledBalls[calledBalls.length - 1] : 1),
                      calledBallsSnapshot: [...calledBalls],
                      patternTitle: activePattern.titleAm,
                      timestamp: new Date().toLocaleString(),
                    });
                  }
                }}
                onInspectBlockedCartela={(cid) => {
                  setInspectedBlockedId(cid);
                }}
                onOpenRulesModal={() => setIsRulesModalOpen(true)}
                onToggleVoice={() => setVoiceEnabled(!voiceEnabled)}
                onToggleSfx={() => setSfxEnabled(!sfxEnabled)}
                onToggleAutoDaub={() => setAutoDaub(!autoDaub)}
                onRefreshState={refreshRegularRoomState}
                onChangeSpeed={handleChangeSpeed}
                onTogglePause={handleTogglePause}
                onDrawNextManual={handleDrawNextManual}
                onResetGame={handleResetGame}
              />
            </div>

            {/* ACTIVE ROUND WINNING CELEBRATION BANNER FOR REGULAR BINGO */}
            {winnersList.length > 0 && (
              <div className="relative overflow-hidden rounded-2xl border-2 border-amber-400 bg-gradient-to-r from-emerald-950 via-slate-900 to-amber-950 p-4 sm:p-5 text-white shadow-2xl space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-2">
                    {/* Winner Identity Card - matching IMG_3782_7fb1d730.jpeg */}
                    <div className="p-3 sm:p-4 rounded-2xl bg-slate-950/85 border-2 border-amber-400/80 shadow-xl space-y-1">
                      <div className="text-[11px] sm:text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>🏆 አሸናፊ ተጫዋች (Winner)</span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/25 text-emerald-300 font-mono-tabular font-extrabold text-[11px] border border-emerald-500/40">
                          ካርቴላ {winnersList.map((w) => `#${w.cartelaId}`).join(', ')}
                        </span>
                      </div>

                      {/* Large Bold Username on top */}
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
                        የተሸለሙት ብር (80% ደራሽ)
                      </div>
                      <div className="text-2xl sm:text-3xl font-extrabold font-mono-tabular text-amber-400">
                        +{winnersList[0].prizeAmount.toFixed(2)} ETB
                      </div>
                    </div>
                    {bingoCountdown !== null && bingoCountdown > 0 ? (
                      <div className="px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-400/50 text-amber-300 font-mono-tabular text-xs font-bold animate-pulse">
                        ቢንጎ የማለት ሰዓት {bingoCountdown}s ይቀራል...
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResetGame}
                        className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer shadow-md"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span>አዲስ ዙር ጀምር</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Quick Layout Switcher (Icon-only: 2-col, 3-col) + Au (ON / OFF) on exact same single line */}
            <div className="flex items-center justify-between gap-2 px-1 py-0.5">
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

                {/* Au (ON / OFF) Toggle Button placed right next to column icons on the exact same line */}
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

              <div className="text-[11px] font-mono-tabular font-extrabold text-amber-400">
                {cartelas.length} {t.cartela}
              </div>
            </div>

            <div className={`grid ${gridColumns === 3 ? 'grid-cols-3 gap-1.5 sm:gap-2.5' : 'grid-cols-2 gap-2 sm:gap-3'}`}>
              {sortedCartelas.map((card) => (
                <CartelaCardView
                  key={card.id}
                  cartela={card}
                  shapeBadge={getShapeBadge(card, calledBalls, autoDaub, sortMode)}
                  calledBalls={calledBalls}
                  activeBall={activeBall}
                  autoDaub={autoDaub}
                  daubColor={daubColor}
                  language={language}
                  isDark={isDark}
                  isGameStarted={isPlaying || calledBalls.length > 0}
                  isGameFinished={isRegularGameFinished}
                  isDimmedUnregistered={(isPlaying || calledBalls.length > 0) && !card.isRegistered}
                  isPostTwoMinutes={isPostTwoMinutes}
                  isCompact3Col={gridColumns === 3}
                  isSelected={selectedCartelaIds.includes(card.id)}
                  showSelectCheckbox={false}
                  onToggleSelect={() => {}}
                  onToggleRegister={handleToggleRegister}
                  onRemoveCartela={(cid) => {
                    if (isPlaying || calledBalls.length > 0) return;
                    setCartelas((prev) => prev.filter((c) => c.id !== cid));
                  }}
                  onToggleCellDaub={(cid, r, col) => {
                    if (r === 2 && col === 2) return;
                    if ((isPlaying || calledBalls.length > 0) && !card.isRegistered) return;
                    const tappedNum = card.numbers[r][col];
                    const nextVal = !card.manualMarks[r][col];
                    // "Regular bingo አንዱ ላይ ስነካ ሁሉም ጋር እንዲነካ"
                    // Mark/toggle tappedNum across ALL cartelas holding this number!
                    setCartelas((prev) =>
                      prev.map((c) => {
                        let containsNum = false;
                        const nextMarks = c.manualMarks.map((rowArr, rIdx) =>
                          rowArr.map((val, cIdx) => {
                            if (rIdx === 2 && cIdx === 2) return true;
                            if (c.numbers[rIdx][cIdx] === tappedNum) {
                              containsNum = true;
                              return nextVal;
                            }
                            return val;
                          })
                        );
                        return containsNum ? { ...c, manualMarks: nextMarks } : c;
                      })
                    );
                  }}
                  onClaimBingo={handleClaimBingo}
                />
              ))}
            </div>

            {/* ቅድመ-ጨዋታ የተቆለፈ SHA-256 ሃሽ፦ #[roundId] - መጨረሻ ታች ይሁን */}
            <div
              className={`rounded-2xl border px-3 py-2.5 flex items-center justify-between gap-2 whitespace-nowrap overflow-hidden shadow-sm mt-3 ${
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
                title={serverSha256Hash || roundFairData.sha256Hash}
              >
                {serverSha256Hash || roundFairData.sha256Hash}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const hashToCopy = serverSha256Hash || roundFairData.sha256Hash;
                    if (typeof navigator !== 'undefined' && navigator.clipboard) {
                      navigator.clipboard.writeText(hashToCopy).catch(() => {});
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

        {activeTab === 'wallet' && (
          <WalletView
            currentUser={currentUser}
            transactions={transactions}
            language={language}
            isDark={isDark}
            requireAdminApproval={requireDepositApproval}
            bankAccounts={bankAccounts}
            onSubmitDeposit={(method, amount, refNumber, fullSms) => {
              const newTx: TransactionRecord = {
                id: `tx-${Date.now()}`,
                userId: currentUser.id,
                userName: currentUser.name,
                userPhone: currentUser.phone,
                type: 'deposit',
                method,
                amount,
                referenceNumber: refNumber,
                fullSmsText: fullSms,
                status: 'approved',
                timestamp: new Date().toLocaleString(),
              };
              setTransactions((prev) => [newTx, ...prev]);
              setUsers((prev) =>
                prev.map((u, idx) => (idx === 0 ? { ...u, balance: u.balance + amount } : u))
              );
            }}
            onSubmitWithdraw={(method, amount, accountNumber) => {
              const newTx: TransactionRecord = {
                id: `tx-${Date.now()}`,
                userId: currentUser.id,
                userName: currentUser.name,
                userPhone: currentUser.phone,
                type: 'withdraw',
                method,
                amount,
                referenceNumber: accountNumber,
                status: 'approved',
                timestamp: new Date().toLocaleString(),
              };
              setTransactions((prev) => [newTx, ...prev]);
              setUsers((prev) =>
                prev.map((u, idx) =>
                  idx === 0 ? { ...u, balance: Math.max(0, u.balance - amount) } : u
                )
              );
            }}
            onSubmitTransfer={(recipientPhone, amount) => {
              setUsers((prev) =>
                prev.map((u, idx) =>
                  idx === 0 ? { ...u, balance: Math.max(0, u.balance - amount) } : u
                )
              );
            }}
          />
        )}

        {activeTab === 'history' && (
          <GameHistoryView
            history={gameHistory}
            language={language}
            isDark={isDark}
            currentUserName={currentUser?.name}
            currentUserPhone={currentUser?.phone}
            onRefreshHistory={refreshRegularRoomState}
            onInspectWinnerCartela={(w) => setInspectedWinner(w)}
          />
        )}

        {activeTab === 'leaderboard' && (
          <LeaderboardView
            users={users}
            history={gameHistory}
            currentUserPhone={currentUser?.phone}
            language={language}
            isDark={isDark}
          />
        )}

        {activeTab === 'profile' && (
          <ProfileAndSettingsView
            currentUser={currentUser}
            language={language}
            isDark={isDark}
            daubColor={daubColor}
            accentColor={accentColor}
            notificationPref={notificationPref}
            onChangeLanguage={onChangeLanguage}
            onToggleTheme={() => setIsDark(!isDark)}
            onChangeDaubColor={setDaubColor}
            onChangeAccentColor={setAccentColor}
            onChangeNotificationPref={setNotificationPref}
            onInviteFriendReward={() => {}}
            onUpdatePassword={() => {}}
            onRegisterOrLoginUser={() => {}}
            onSignOut={() => {}}
            onOpenGameHistory={() => setActiveTab('history')}
            onOpenAdminLogin={() => setActiveTab('admin')}
          />
        )}

        {activeTab === 'admin' && (
          <div className="space-y-3">
            {onSwitchToFastApp && (
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-amber-400">🛡️ Regular Bingo Admin (መደበኛ ቢንጎ)</span>
                </div>
                <button
                  type="button"
                  onClick={onSwitchToFastApp}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-xs hover:from-amber-400 hover:to-amber-500 transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
                >
                  <Zap className="w-3.5 h-3.5 fill-slate-950" />
                  <span>ወደ Fast Bingo Admin ቀይር ➔</span>
                </button>
              </div>
            )}
            <AdminPanelView
            isAdminAuthenticated={isAdminAuthenticated}
            onManualApproveWinner={handleManualApproveWinner}
            pendingVerificationCartelas={pendingVerificationCartelas}
            onApprovePendingClaim={handleApprovePendingClaim}
            onRejectPendingClaim={handleRejectPendingClaim}
            onAdminLoginSuccess={() => setIsAdminAuthenticated(true)}
            onAdminLogout={() => {
              setIsAdminAuthenticated(false);
              setActiveTab('play');
            }}
            onOpenAll16RulesModal={() => setIsRulesModalOpen(true)}
            isFastMode={false}
            activePatternId={activePatternId}
            onUpdateGameSettings={(stake, prize, patternId, regMinutes) => {
              if (typeof stake === 'number' && stake >= 0) {
                setStakeAmount(stake);
              }
              if (typeof prize === 'number' && prize > 0) {
                setCustomPrizeAmount(prize);
              }
              if (patternId !== undefined) {
                setActivePatternId(patternId);
                setIsPatternExplicitlySelected(true);
                setIsPostTwoMinutes(false);
              }
              const totalSecs = typeof regMinutes === 'number' && regMinutes > 0 ? Math.round(regMinutes * 60) : null;
              if (totalSecs !== null) {
                setPreGameCountdown(totalSecs);
                setRegistrationMinutes(regMinutes);
                setIsPlaying(false);
                setIsPaused(false);
                setCalledBalls([]);
                setActiveBall(null);
                setWinnersList([]);
                setGameFinishedAt(null);
                setBingoCountdown(null);
                hasTriggered30sAlarmRef.current = false;
                setStatusNotice(`⏱️ የ ${regMinutes} ደቂቃ የምዝገባ ሰዓት ተጀምሯል! እባክዎ ካርቴላዎን ያስመዝግቡ።`);
              }
              dispatchServerRoomAction({
                mode: 'regular',
                action: 'update_settings',
                stakeAmount: stake,
                prizeAmount: prize,
                activePatternId: patternId,
                countdownSeconds: totalSecs !== null ? totalSecs : undefined,
                preGameCountdown: totalSecs,
                isPlaying: false,
              });
            }}
            stakeAmount={stakeAmount}
            prizeAmount={prizeAmount}
            blockedCartelaIds={blockedCartelaIds}
            totalCartelasCount={cartelas.length}
            registeredCartelasCount={registeredCartelasCount}
            isPlaying={isPlaying}
            isPaused={isPaused}
            callSpeedSec={callSpeedSec}
            onChangeSpeed={handleChangeSpeed}
            onTogglePause={handleTogglePause}
            onDrawNextManual={handleDrawNextManual}
            onResetGame={handleResetGame}
            heroBanners={heroBanners}
            bankAccounts={bankAccounts}
            onAddHeroBanner={(b) =>
              setHeroBanners((prev) => [{ ...b, id: `hb-${Date.now()}` }, ...prev])
            }
            onUpdateHeroBanner={(b) =>
              setHeroBanners((prev) => prev.map((x) => (x.id === b.id ? b : x)))
            }
            onRemoveHeroBanner={(id) =>
              setHeroBanners((prev) => prev.filter((x) => x.id !== id))
            }
            onAddBankAccount={(acc) => setBankAccounts((prev) => [...prev, acc])}
            onUpdateBankAccount={(acc) =>
              setBankAccounts((prev) => prev.map((x) => (x.id === acc.id ? acc : x)))
            }
            onRemoveBankAccount={(id) =>
              setBankAccounts((prev) => prev.filter((x) => x.id !== id))
            }
            users={users}
            transactions={transactions}
            gameHistory={gameHistory}
            isDark={isDark}
            requireDepositApproval={requireDepositApproval}
            onToggleRequireDepositApproval={setRequireDepositApproval}
            bonusCartelasForOver20={bonusCartelasForOver20}
            onUpdateBonusCartelasForOver20={setBonusCartelasForOver20}
            onRefreshLiveState={refreshRegularRoomState}
            onStartRegistrationCountdown={(secs) => setPreGameCountdown(secs)}
            onBlockCartelaId={(id) => setBlockedCartelaIds((prev) => [...prev, id])}
            onUnblockCartelaId={(id) =>
              setBlockedCartelaIds((prev) => prev.filter((x) => x !== id))
            }
            onAdjustUserBalance={(uid, delta) => {
              setUsers((prev) =>
                prev.map((u) => (u.id === uid ? { ...u, balance: Math.max(0, u.balance + delta) } : u))
              );
            }}
            onToggleUserBlock={(uid) => {
              setUsers((prev) =>
                prev.map((u) => (u.id === uid ? { ...u, isBlocked: !u.isBlocked } : u))
              );
            }}
            onApproveRejectTransaction={(txId, status) => {
              setTransactions((prev) =>
                prev.map((tx) => (tx.id === txId ? { ...tx, status } : tx))
              );
            }}
          />
          </div>
        )}
      </main>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-800 bg-slate-900/95 backdrop-blur-md text-slate-400">
        <div className="max-w-xl mx-auto grid grid-cols-6 items-center h-16">
          <button
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center justify-center h-full cursor-pointer ${
              activeTab === 'home' ? 'text-emerald-400 font-extrabold' : ''
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-[10px] mt-1">{t.home}</span>
          </button>
          <button
            onClick={() => setActiveTab('play')}
            className={`flex flex-col items-center justify-center h-full cursor-pointer ${
              activeTab === 'play' ? 'text-emerald-400 font-extrabold' : ''
            }`}
          >
            <Gamepad2 className="w-5 h-5" />
            <span className="text-[10px] mt-1">{t.game}</span>
          </button>
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`flex flex-col items-center justify-center h-full cursor-pointer ${
              activeTab === 'leaderboard' ? 'text-emerald-400 font-extrabold' : ''
            }`}
          >
            <Trophy className="w-5 h-5" />
            <span className="text-[10px] mt-1">{t.leaderboard}</span>
          </button>
          <button
            onClick={() => setActiveTab('wallet')}
            className={`flex flex-col items-center justify-center h-full cursor-pointer ${
              activeTab === 'wallet' ? 'text-emerald-400 font-extrabold' : ''
            }`}
          >
            <Wallet className="w-5 h-5" />
            <span className="text-[10px] mt-1">{t.wallet}</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex flex-col items-center justify-center h-full cursor-pointer ${
              activeTab === 'history' ? 'text-emerald-400 font-extrabold' : ''
            }`}
          >
            <History className="w-5 h-5" />
            <span className="text-[10px] mt-1">{t.gameHistory}</span>
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center justify-center h-full cursor-pointer ${
              activeTab === 'profile' ? 'text-emerald-400 font-extrabold' : ''
            }`}
          >
            <User className="w-5 h-5" />
            <span className="text-[10px] mt-1">{t.profile}</span>
          </button>
        </div>
      </nav>

      {/* FLOATING "+" BUTTON FOR ADDING CARTELAS */}
      {activeTab === 'play' && !isPlaying && (
        <button
          type="button"
          onClick={() => setIsSelectorModalOpen(true)}
          className="fixed bottom-20 right-4 sm:right-6 z-50 w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black shadow-[0_10px_25px_rgba(245,158,11,0.6)] border-2 border-white cursor-pointer active:scale-90 hover:scale-105 transition-all flex items-center justify-center"
          title="ካርቴላ ጨምር (+)"
          aria-label="ካርቴላ ጨምር"
        >
          <Plus className="w-8 h-8 stroke-[3]" />
        </button>
      )}

      {/* Cartela Selector Modal for 1 to 70,000 Cartelas */}
      <CartelaSelectorModal
        isOpen={isSelectorModalOpen}
        onClose={() => setIsSelectorModalOpen(false)}
        currentCount={cartelas.length}
        maxCartelas={stakeAmount === 0 ? 10 : 30}
        maxPoolId={REGULAR_MAX_POOL_CARTELAS}
        blockedCartelaIds={blockedCartelaIds}
        existingCartelaIds={cartelas.map((c) => c.id)}
        bonusCartelasForOver20={bonusCartelasForOver20}
        isDark={isDark}
        onAddBatchCartelas={handleAddBatchCartelas}
        onAddSpecificCartela={handleAddSpecificCartela}
      />

      <RulesAndPatternsModal
        isOpen={isRulesModalOpen}
        onClose={() => setIsRulesModalOpen(false)}
        activePatternId={activePatternId}
        isAdminAuthenticated={isAdminAuthenticated}
        onSelectPattern={handleSelectPattern}
        registrationMinutes={registrationMinutes}
        onSetRegistrationMinutes={handleSetRegistrationMinutes}
        language={language}
        isDark={isDark}
      />

      {/* Winner Cartela Details Inspector Modal (Opens when tapping Bingo Cards badge) */}
      <WinnerCartelaInspectorModal
        winner={inspectedWinner}
        roundId={gameMatchId}
        preGameHash={serverSha256Hash || roundFairData.sha256Hash}
        countdownSeconds={bingoCountdown}
        onOpenVerifyModal={() => setIsProvablyFairModalOpen(true)}
        onClose={() => setInspectedWinner(null)}
        isDark={isDark}
      />

      {/* Blocked Cartela Details Inspector Modal (Opens when tapping Blocked badge) */}
      <BlockedCartelaInspectorModal
        isOpen={inspectedBlockedId !== null}
        cartelaId={inspectedBlockedId}
        reason={
          inspectedBlockedId
            ? blockedReasonsMap[inspectedBlockedId] ||
              'የተሳሳተ ቢንጎ! አሸናፊ ቁጥር በቅጡ ውስጥ የለም ወይም ቅጡ አልተሟላም።'
            : null
        }
        calledBalls={calledBalls}
        onClose={() => setInspectedBlockedId(null)}
        isDark={isDark}
      />

      {/* Provably Fair SHA-256 Verification Modal */}
      <ProvablyFairModal
        isOpen={isProvablyFairModalOpen}
        onClose={() => setIsProvablyFairModalOpen(false)}
        isDark={isDark}
        roundId={gameMatchId}
        isPlaying={isPlaying}
        calledBalls={calledBalls}
        hasWinnerOrEnded={isRegularGameFinished}
        clientSeed={roundFairData.clientSeed}
        onChangeClientSeed={() => {}}
        roundFairData={roundFairData}
        history={gameHistory}
      />

      <GameSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        isDark={isDark}
        totalCartelas={cartelas.length}
        selectedCartelaIds={selectedCartelaIds}
        stakeAmount={stakeAmount}
        roundId={gameMatchId}
        prizeAmount={prizeAmount}
        activePlayersCount={activePlayersCartelasCount}
        calledBallsCount={calledBalls.length}
        sortMode={sortMode}
        gridColumns={gridColumns}
        autoDaub={autoDaub}
        voiceEnabled={voiceEnabled}
        sfxEnabled={sfxEnabled}
        voiceGender={voiceGender}
        onChangeVoiceGender={handleToggleVoiceGender}
        vibrationEnabled={vibrationEnabled}
        onToggleVibration={handleToggleVibration}
        language={language}
        showFullCartelasSection={showFullCartelasSection}
        unregisteredWhenStartedMode={unregisteredWhenStartedMode}
        onChangeUnregisteredWhenStartedMode={setUnregisteredWhenStartedMode}
        onChangeLanguage={onChangeLanguage}
        onToggleShowFullCartelas={() => setShowFullCartelasSection(!showFullCartelasSection)}
        onRegisterAll={() => {
          setCartelas((prev) => {
            prev.forEach((c) => {
              if (!c.isRegistered) lockOrUnlockRegularCartela(c.id, 'lock');
            });
            const allReg = prev.map((c) => ({ ...c, isRegistered: true }));
            return applyBonusIfApplicable(allReg);
          });
        }}
        onOpenFastBingoApp={onSwitchToFastApp}
        onOpenAdminLogin={() => {
          setIsSettingsModalOpen(false);
          setActiveTab('admin');
        }}
        onSelectAllCartelas={() => setSelectedCartelaIds(cartelas.map((c) => c.id))}
        onClearSelection={() => setSelectedCartelaIds([])}
        onRegisterSelected={() => {}}
        onDeleteSelected={() => {}}
        onChangeSortMode={setSortMode}
        onChangeGridColumns={setGridColumns}
        onToggleAutoDaub={() => setAutoDaub(!autoDaub)}
        onToggleVoice={() => setVoiceEnabled(!voiceEnabled)}
        onToggleSfx={() => setSfxEnabled(!sfxEnabled)}
        onOpenPatternVisualizer={() => {
          setIsSettingsModalOpen(false);
          setIsRulesModalOpen(true);
        }}
        onResetMarks={() => {
          setCartelas((prev) =>
            prev.map((c) => ({
              ...c,
              manualMarks: Array.from({ length: 5 }, (_, r) =>
                Array.from({ length: 5 }, (__, col) => r === 2 && col === 2)
              ),
            }))
          );
          soundFX.playClick();
        }}
      />
    </div>
  );
};

export default RegularBingoStandaloneApp;
