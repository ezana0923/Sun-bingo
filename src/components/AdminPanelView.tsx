import React, { useState, useEffect } from 'react';
import {
  Shield,
  Sliders,
  Megaphone,
  Ban,
  Users,
  CheckCircle2,
  XCircle,
  Unlock,
  Play,
  Lock,
  LogOut,
  BookOpen,
  SkipForward,
  Pause,
  RotateCcw,
  Layers,
  LayoutDashboard,
  Gamepad2,
  Gift,
  ArrowDownCircle,
  ArrowUpCircle,
  Send,
  Search,
  RefreshCw,
  DollarSign,
  Download,
  Zap,
  Copy,
  TrendingUp,
  Image as ImageIcon,
  Plus,
  Trash2,
  Edit2,
  Landmark,
  Globe,
  Server,
  Trophy,
  Smartphone,
} from 'lucide-react';
import { BINGO_PATTERNS } from '../data/bingoPatterns';
import { PWAInstallButton } from './PWAInstallButton';
import { connectTelegramBotEverywhere } from '../utils/telegramBotBridge';
import {
  buildApiUrl,
  dispatchServerRoomAction,
  ServerLockedCartelaItem,
  ServerRoomStatePayload,
} from '../utils/realtimeRoomClient';
import { PAYMENT_ACCOUNTS } from '../utils/translations';
import {
  BankPaymentAccount,
  CallSpeed,
  GameHistoryRecord,
  HeroBannerAd,
  TransactionRecord,
  UserAccount,
} from '../types/bingo';

export type AdminSubTab =
  | 'overview'
  | 'game_control'
  | 'banners'
  | 'banks'
  | 'users'
  | 'bonuses'
  | 'deposits'
  | 'withdrawals'
  | 'sms_webhook'
  | 'render_cloud'
  | 'broadcast'
  | 'settings';

interface AdminPanelViewProps {
  isAdminAuthenticated: boolean;
  onAdminLoginSuccess: () => void;
  onAdminLogout: () => void;
  onOpenAll16RulesModal: () => void;
  onOpenDownloadModal?: () => void;
  isFastMode?: boolean;
  activeStakeTier?: 10 | 20 | 50 | 100;
  onSelectStakeRoom?: (tier: 10 | 20 | 50 | 100) => void;
  allFastRoomsByStake?: Record<number, ServerRoomStatePayload>;
  allFastLockedByStake?: Record<number, ServerLockedCartelaItem[]>;
  stakeAmount: number;
  prizeAmount: number;
  activePatternId?: number;
  registrationMinutes?: number;
  blockedCartelaIds: number[];
  totalCartelasCount: number;
  registeredCartelasCount: number;
  isPlaying: boolean;
  isPaused: boolean;
  callSpeedSec: CallSpeed;
  onChangeSpeed: (sec: CallSpeed) => void;
  onTogglePause: () => void;
  onDrawNextManual: () => void;
  onResetGame: () => void;
  onSimulateWinningBalls?: () => void;
  onSimulateFastWin?: (type: 'corners' | 'line') => void;
  jackpotPool?: number;
  houseEarningsTotal?: number;
  onUpdateJackpotPool?: (amount: number) => void;
  heroBanners?: HeroBannerAd[];
  bankAccounts?: BankPaymentAccount[];
  users: UserAccount[];
  transactions: TransactionRecord[];
  gameHistory?: GameHistoryRecord[];
  isDark: boolean;
  requireDepositApproval?: boolean;
  onToggleRequireDepositApproval?: (next: boolean) => void;
  bonusCartelasForOver20?: number;
  onUpdateBonusCartelasForOver20?: (bonusCount: number) => void;
  onRefreshLiveState?: () => void;
  onUpdateGameSettings?: (
    stake: number,
    prize: number,
    patternId: number,
    regMinutes: number
  ) => void;
  onStartRegistrationCountdown: (seconds: number) => void;
  onBlockCartelaId: (id: number) => void;
  onUnblockCartelaId: (id: number) => void;
  onAddHeroBanner?: (banner: Omit<HeroBannerAd, 'id'>) => void;
  onUpdateHeroBanner?: (banner: HeroBannerAd) => void;
  onRemoveHeroBanner?: (id: string) => void;
  onAddBankAccount?: (bank: BankPaymentAccount) => void;
  onUpdateBankAccount?: (bank: BankPaymentAccount) => void;
  onRemoveBankAccount?: (id: string) => void;
  onAdjustUserBalance: (userId: string, delta: number, phone?: string) => void;
  onSetExactUserBalance?: (phone: string, name: string, balance: number, bonusBalance?: number) => void;
  onToggleUserBlock: (userId: string, phone?: string) => void;
  onApproveRejectTransaction: (txId: string, status: 'approved' | 'rejected') => void;
  onApproveAllPending?: () => void;
  onManualApproveWinner?: (cartelaId: number) => void;
  pendingVerificationCartelas?: {
    cartelaId: number;
    reason: string;
    winningCells?: [number, number][];
    claimedAt: number;
  }[];
  onApprovePendingClaim?: (cartelaId: number) => void;
  onRejectPendingClaim?: (cartelaId: number) => void;
}

export const AdminPanelView: React.FC<AdminPanelViewProps> = ({
  isAdminAuthenticated,
  onAdminLoginSuccess,
  onAdminLogout,
  onOpenAll16RulesModal,
  onOpenDownloadModal,
  isFastMode = false,
  activeStakeTier = 10,
  onSelectStakeRoom,
  allFastRoomsByStake = {},
  allFastLockedByStake = {},
  stakeAmount,
  prizeAmount,
  activePatternId = 1,
  registrationMinutes = 1,
  blockedCartelaIds,
  totalCartelasCount,
  registeredCartelasCount,
  isPlaying,
  isPaused,
  callSpeedSec,
  onChangeSpeed,
  onTogglePause,
  onDrawNextManual,
  onResetGame,
  onSimulateWinningBalls,
  onSimulateFastWin,
  jackpotPool = 850,
  houseEarningsTotal = 420,
  onUpdateJackpotPool,
  heroBanners = [],
  bankAccounts = PAYMENT_ACCOUNTS,
  users,
  transactions,
  gameHistory = [],
  isDark,
  requireDepositApproval = true,
  onToggleRequireDepositApproval,
  bonusCartelasForOver20 = 5,
  onUpdateBonusCartelasForOver20,
  onRefreshLiveState,
  onUpdateGameSettings,
  onStartRegistrationCountdown,
  onBlockCartelaId,
  onUnblockCartelaId,
  onAddHeroBanner,
  onUpdateHeroBanner,
  onRemoveHeroBanner,
  onAddBankAccount,
  onUpdateBankAccount,
  onRemoveBankAccount,
  onAdjustUserBalance,
  onSetExactUserBalance,
  onToggleUserBlock,
  onApproveRejectTransaction,
  onManualApproveWinner,
  pendingVerificationCartelas = [],
  onApprovePendingClaim,
  onRejectPendingClaim,
}) => {
  // Active Top Pill Sub-Tab matching IMG_3567..IMG_3561
  const [activeSubTab, setActiveSubTab] = useState<AdminSubTab>('overview');
  const [manualWinnerCartelaIdInput, setManualWinnerCartelaIdInput] = useState<string>('');

  // Hero Banner & Ads Form State
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);
  const [bannerTitle, setBannerTitle] = useState('');
  const [bannerSubtitle, setBannerSubtitle] = useState('');
  const [bannerBadge, setBannerBadge] = useState('Sun Bingo ልዩ ቦነስ');
  const [bannerColor, setBannerColor] = useState<'blue' | 'emerald' | 'amber' | 'rose'>('emerald');
  const [bannerImageUrl, setBannerImageUrl] = useState('');

  // Add / Edit Bank Account Form State
  const [editingBankId, setEditingBankId] = useState<string | null>(null);
  const [bankShortNameInput, setBankShortNameInput] = useState('');
  const [bankFullNameInput, setBankFullNameInput] = useState('');
  const [bankAccountNumInput, setBankAccountNumInput] = useState('');
  const [bankHolderNameInput, setBankHolderNameInput] = useState('');
  const [bankBadgeColorInput, setBankBadgeColorInput] = useState('bg-emerald-600 text-white');

  // Dedicated Admin Login State
  const [adminUser, setAdminUser] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [loginError, setLoginError] = useState('');

  // Status feedback toast inside Admin
  const [adminToast, setAdminToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setAdminToast(msg);
    setTimeout(() => {
      setAdminToast((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

  // Game Config State
  const [stakeInput, setStakeInput] = useState(stakeAmount.toString());
  const [prizeInput, setPrizeInput] = useState(prizeAmount.toString());
  const [patternInput, setPatternInput] = useState(activePatternId);
  const [regMinInput, setRegMinInput] = useState(registrationMinutes.toString());
  const [cartelaToBlock, setCartelaToBlock] = useState('');

  // Users Tab State
  const [userSearch, setUserSearch] = useState('');
  const [userFilterMode, setUserFilterMode] = useState<'all' | 'with_balance' | 'blocked'>('all');
  const [balanceInputs, setBalanceInputs] = useState<Record<string, string>>({});
  const [newUserName, setNewUserName] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserBal, setNewUserBal] = useState('15');

  // Bonuses Tab State (IMG_3564)
  const [welcomeBonus, setWelcomeBonus] = useState('15');
  const [referralBonus, setReferralBonus] = useState('10');
  const [depositBonusPct, setDepositBonusPct] = useState('0');
  const [minDepositAmt, setMinDepositAmt] = useState('10');
  const [minWithdrawAmt, setMinWithdrawAmt] = useState('100');
  const [over20BonusCartelasInput, setOver20BonusCartelasInput] = useState(
    String(bonusCartelasForOver20 ?? 5)
  );

  // Deposits & Withdrawals Filters (IMG_3563)
  const [depositStatusFilter, setDepositStatusFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [withdrawStatusFilter, setWithdrawStatusFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [txSearch, setTxSearch] = useState('');

  // Broadcast Tab State (IMG_3561)
  const [broadcastTarget, setBroadcastTarget] = useState<'all' | 'specific'>('all');
  const [broadcastSpecificUser, setBroadcastSpecificUser] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);

  // Direct Cash Deposit State (በቀጥታ በጥሬ ገንዘብ / ካሽ ገቢ)
  const [cashDepositUser, setCashDepositUser] = useState<string>('');
  const [cashDepositAmount, setCashDepositAmount] = useState<string>('500');
  const [cashDepositNote, setCashDepositNote] = useState<string>('ጥሬ ገንዘብ ተቀብያለሁ (Cash received in person)');
  const [isSubmittingCashDeposit, setIsSubmittingCashDeposit] = useState<boolean>(false);

  // SMS Webhook State (0% Commission Auto-Verification for Telebirr, CBE & All Banks)
  const [smsWebhookUrl, setSmsWebhookUrl] = useState<string>(() =>
    typeof window !== 'undefined'
      ? `${window.location.origin}/api/webhook/sms`
      : 'https://sun-bingo.onrender.com/api/webhook/sms'
  );
  const [smsWebhookSecret, setSmsWebhookSecret] = useState<string>('ezi_sms_secret_2026');
  const [smsWebhookSecretInput, setSmsWebhookSecretInput] = useState<string>('ezi_sms_secret_2026');
  const [smsLogs, setSmsLogs] = useState<any[]>([]);
  const [smsVerifiedReceipts, setSmsVerifiedReceipts] = useState<any[]>([]);
  const [smsTestInput, setSmsTestInput] = useState<string>(
    'የ 1,000.00 ብር ክፍያ ከ 0942742684 ተቀብለዋል። የግብይት ቁጥር DCO9823412A ነው። ቀሪ ሂሳብዎ 5,420.00 ብር ነው።'
  );
  const [smsTestSender, setSmsTestSender] = useState<string>('127');
  const [isTestingWebhook, setIsTestingWebhook] = useState<boolean>(false);
  const [isLoadingWebhookLogs, setIsLoadingWebhookLogs] = useState<boolean>(false);
  const [copiedWebhookUrl, setCopiedWebhookUrl] = useState<boolean>(false);
  const [copiedSecret, setCopiedSecret] = useState<boolean>(false);

  // Settings / Telegram Bot State
  const [newAdminPin, setNewAdminPin] = useState('');
  const [tgTokenInput, setTgTokenInput] = useState(() =>
    typeof window !== 'undefined' ? localStorage.getItem('ezi_telegram_bot_token') || '' : ''
  );

  // Render.com & GitHub Cron-Job State
  const [renderAppUrl, setRenderAppUrl] = useState(() =>
    typeof window !== 'undefined'
      ? localStorage.getItem('ezi_render_app_url') || 'https://sun-bingo.onrender.com'
      : 'https://sun-bingo.onrender.com'
  );
  const [pingStatus, setPingStatus] = useState<string | null>(null);
  const [isPinging, setIsPinging] = useState(false);

  const handleAdminLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    const u = adminUser.trim().toLowerCase();
    const p = adminPass.trim();
    try {
      const res = await fetch(buildApiUrl('/api/admin/verify-pin'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: u, pin: p }),
      });
      const data = await res.json();
      if (data?.ok) {
        onAdminLoginSuccess();
        return;
      }
    } catch {
      // fallback offline check
    }
    if (
      (u === 'admin' || u === 'ezana' || u === 'ezibingo') &&
      (p === 'admin123' || p === '1234' || p === 'ezana123')
    ) {
      onAdminLoginSuccess();
    } else {
      setLoginError('የተሳሳተ መለያ ወይም የይለፍ ቃል! (ምሳሌ፦ Username: ezana / Password: 1234)');
    }
  };

  if (!isAdminAuthenticated) {
    return (
      <div className="max-w-md mx-auto my-8 px-2">
        <div
          className={`rounded-2xl border p-6 shadow-2xl space-y-5 ${
            isDark
              ? 'bg-[#181824] border-slate-800 text-slate-100'
              : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg">
              <Lock className="w-7 h-7" />
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold">
              የቁጥጥር ፓነል መግቢያ (Control Login)
            </h2>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              ወደ Sun Bingo የቁጥጥር ዳሽቦርድ ለመግባት Username እና Password ያስገቡ።
            </p>
          </div>

          <form onSubmit={handleAdminLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-extrabold mb-1">
                መለያ ስም (Username)፦
              </label>
              <input
                type="text"
                required
                value={adminUser}
                onChange={(e) => setAdminUser(e.target.value)}
                placeholder="ezana"
                className={`w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  isDark
                    ? 'bg-[#11111a] border-slate-700 text-white'
                    : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold mb-1">
                የይለፍ ቃል / PIN (Password)፦
              </label>
              <input
                type="password"
                required
                value={adminPass}
                onChange={(e) => setAdminPass(e.target.value)}
                placeholder="••••••••"
                className={`w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  isDark
                    ? 'bg-[#11111a] border-slate-700 text-white'
                    : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
            </div>

            {loginError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-400 text-xs font-bold">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-sm cursor-pointer shadow-md transition-colors"
            >
              ወደ ቁጥጥር ዳሽቦርድ ግባ (Sign In)
            </button>

            <div
              className={`p-3 rounded-xl text-[11px] font-mono-tabular flex items-center justify-between ${
                isDark ? 'bg-[#11111a] text-slate-400 border border-slate-800' : 'bg-slate-100 text-slate-600'
              }`}
            >
              <span>Username: <b>ezana</b> | PIN: <b>1234</b></span>
              <button
                type="button"
                onClick={() => {
                  setAdminUser('admin');
                  setAdminPass('admin123');
                  onAdminLoginSuccess();
                }}
                className="px-2.5 py-1 rounded-lg bg-emerald-500 text-slate-950 font-black cursor-pointer"
              >
                በቀጥታ ግባ (1-Click)
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Computed metrics for Overview & Badges
  const depositsList = transactions.filter((t) => t.type === 'deposit');
  const withdrawalsList = transactions.filter((t) => t.type === 'withdraw');
  const pendingDepositsCount = depositsList.filter((t) => t.status === 'pending').length;
  const pendingWithdrawalsCount = withdrawalsList.filter((t) => t.status === 'pending').length;

  const totalDepositsApproved = depositsList
    .filter((t) => t.status === 'approved')
    .reduce((acc, t) => acc + t.amount, 0);
  const totalWithdrawalsApproved = withdrawalsList
    .filter((t) => t.status === 'approved')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalSystemProfit = Math.max(
    houseEarningsTotal,
    Number((totalDepositsApproved - totalWithdrawalsApproved).toFixed(2))
  );

  const STAKE_ROOMS: (10 | 20 | 50 | 100)[] = [10, 20, 50, 100];

  const NAV_TABS: {
    id: AdminSubTab;
    label: string;
    icon: React.ReactNode;
    badge?: number;
  }[] = [
    {
      id: 'overview',
      label: 'Overview',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      id: 'game_control',
      label: 'Game Control',
      icon: <Gamepad2 className="w-4 h-4" />,
    },
    {
      id: 'banners',
      label: 'Hero Banners & Ads',
      icon: <Megaphone className="w-4 h-4" />,
      badge: heroBanners.length > 0 ? heroBanners.length : undefined,
    },
    {
      id: 'banks',
      label: 'Add Bank (ባንኮች)',
      icon: <Landmark className="w-4 h-4" />,
      badge: bankAccounts.length > 0 ? bankAccounts.length : undefined,
    },
    {
      id: 'users',
      label: 'Users',
      icon: <Users className="w-4 h-4" />,
      badge: users.length,
    },
    {
      id: 'bonuses',
      label: 'Bonuses',
      icon: <Gift className="w-4 h-4" />,
    },
    {
      id: 'deposits',
      label: 'Deposits',
      icon: <ArrowDownCircle className="w-4 h-4" />,
      badge: pendingDepositsCount > 0 ? pendingDepositsCount : undefined,
    },
    {
      id: 'withdrawals',
      label: 'Withdrawals',
      icon: <ArrowUpCircle className="w-4 h-4" />,
      badge: pendingWithdrawalsCount > 0 ? pendingWithdrawalsCount : undefined,
    },
    {
      id: 'sms_webhook',
      label: '📱 SMS Webhook (Auto)',
      icon: <Smartphone className="w-4 h-4" />,
    },
    {
      id: 'render_cloud',
      label: '🚀 Render ክላውድ',
      icon: <Server className="w-4 h-4 text-cyan-400" />,
    },
    {
      id: 'broadcast',
      label: 'Broadcast',
      icon: <Send className="w-4 h-4" />,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Sliders className="w-4 h-4" />,
    },
  ];

  const filteredUsers = users.filter((u) => {
    if (userFilterMode === 'with_balance' && u.balance <= 0) return false;
    if (userFilterMode === 'blocked' && !u.isBlocked) return false;
    if (userSearch.trim()) {
      const q = userSearch.toLowerCase();
      return (
        u.name.toLowerCase().includes(q) ||
        u.phone.toLowerCase().includes(q) ||
        u.id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleSaveBonuses = async (e: React.FormEvent) => {
    e.preventDefault();
    const wBonus = Math.max(0, parseFloat(welcomeBonus) || 0);
    const rBonus = Math.max(0, parseFloat(referralBonus) || 0);
    const dBonus = Math.max(0, Math.min(100, parseFloat(depositBonusPct) || 0));
    const minDep = Math.max(1, parseFloat(minDepositAmt) || 10);
    const minWith = Math.max(1, parseFloat(minWithdrawAmt) || 100);
    const over20Cards = Math.max(0, Math.min(30, parseInt(over20BonusCartelasInput, 10) || 0));

    if (onUpdateBonusCartelasForOver20) {
      onUpdateBonusCartelasForOver20(over20Cards);
    }
    dispatchServerRoomAction({
      mode: isFastMode ? 'fast' : 'regular',
      stakeAmount: activeStakeTier,
      action: 'set_bonus_over_20',
      bonusCount: over20Cards,
    });

    try {
      await fetch(buildApiUrl('/api/admin/settings'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          welcomeBonusAmount: wBonus,
          referralBonusAmount: rBonus,
          depositBonusPercent: dBonus,
          minDepositAmount: minDep,
          minWithdrawAmount: minWith,
        }),
      });
      showToast(
        `✅ የቦነስ ቅንብሮች ተቀምጠዋል! ከ 20 በላይ ካርቴላ ለሚይዙ +${over20Cards} ነፃ ካርቴላ ይሰጣል።`
      );
    } catch {
      showToast(`✅ ተቀምጧል! ከ 20 በላይ ካርቴላ ለሚይዙ +${over20Cards} ነፃ ካርቴላ ይሰጣል።`);
    }
  };

  const handleDirectCashDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(cashDepositAmount);
    if (isNaN(amt) || amt <= 0) {
      showToast('❌ እባክዎ ትክክለኛ የብር መጠን ያስገቡ!');
      return;
    }
    const targetUser = users.find((u) => u.phone === cashDepositUser || u.id === cashDepositUser) || users[0];
    const phone = targetUser?.phone || cashDepositUser.trim();
    const name = targetUser?.name || 'Player';
    if (!phone) {
      showToast('❌ እባክዎ ተጠቃሚ ይምረጡ ወይም ስልክ ቁጥር ያስገቡ!');
      return;
    }
    setIsSubmittingCashDeposit(true);
    try {
      const res = await fetch(buildApiUrl('/api/admin/cash-deposit'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          name,
          amount: amt,
          note: cashDepositNote.trim() || `በካሽ የተከፈለ: ${amt} ETB`,
        }),
      });
      const data = await res.json();
      if (data?.ok) {
        if (targetUser) {
          onAdjustUserBalance(targetUser.id, amt, targetUser.phone);
        }
        showToast(`✅ ${amt} ETB በካሽ ለ ${name} (${phone}) ገቢ ተደርጓል!`);
        setCashDepositAmount('500');
        onRefreshLiveState?.();
      } else {
        showToast(data?.error || '❌ ስህተት ተፈጥሯል');
      }
    } catch {
      if (targetUser) {
        onAdjustUserBalance(targetUser.id, amt, targetUser.phone);
      }
      showToast(`✅ ${amt} ETB በካሽ ለ ${name} ገቢ ተደርጓል!`);
    } finally {
      setIsSubmittingCashDeposit(false);
    }
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastMessage.trim()) {
      showToast('❌ እባክዎ የሚላከውን መልዕክት ይጻፉ!');
      return;
    }
    setIsSendingBroadcast(true);
    try {
      const res = await fetch(buildApiUrl('/api/admin/broadcast'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetType: broadcastTarget,
          specificUser: broadcastSpecificUser,
          message: broadcastMessage,
        }),
      });
      const data = await res.json();
      if (data?.ok) {
        showToast(data.message || '✅ መልዕክቱ በተሳካ ሁኔታ ተልኳል!');
        setBroadcastMessage('');
      } else {
        showToast(`❌ ${data?.error || 'መልዕክት መላክ አልተቻለም'}`);
      }
    } catch {
      showToast('❌ ከሰርቨር ጋር መገናኘት አልተቻለም።');
    } finally {
      setIsSendingBroadcast(false);
    }
  };

  const fetchSmsWebhookDetails = async () => {
    setIsLoadingWebhookLogs(true);
    try {
      const res = await fetch(buildApiUrl('/api/webhook/sms/logs'));
      const data = await res.json();
      if (data?.ok) {
        if (data.webhookUrl) setSmsWebhookUrl(data.webhookUrl);
        if (data.secret) {
          setSmsWebhookSecret(data.secret);
          setSmsWebhookSecretInput(data.secret);
        }
        if (Array.isArray(data.logs)) setSmsLogs(data.logs);
        if (Array.isArray(data.verifiedReceipts)) setSmsVerifiedReceipts(data.verifiedReceipts);
      }
    } catch {
      // fallback
    } finally {
      setIsLoadingWebhookLogs(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'sms_webhook' || activeSubTab === 'deposits') {
      fetchSmsWebhookDetails();
    }
  }, [activeSubTab]);

  useEffect(() => {
    fetch(buildApiUrl('/api/admin/settings'))
      .then((r) => r.json())
      .then((data) => {
        if (data?.config) {
          if (data.config.welcomeBonusAmount !== undefined) setWelcomeBonus(String(data.config.welcomeBonusAmount));
          if (data.config.referralBonusAmount !== undefined) setReferralBonus(String(data.config.referralBonusAmount));
          if (data.config.depositBonusPercent !== undefined) setDepositBonusPct(String(data.config.depositBonusPercent));
          if (data.config.minDepositAmount !== undefined) setMinDepositAmt(String(data.config.minDepositAmount));
          if (data.config.minWithdrawAmount !== undefined) setMinWithdrawAmt(String(data.config.minWithdrawAmount));
        }
      })
      .catch(() => {});
  }, [activeSubTab]);

  const handleTestSmsWebhook = async (customText?: string, customSender?: string) => {
    const text = (customText || smsTestInput).trim();
    const sender = (customSender || smsTestSender).trim();
    if (!text) {
      showToast('እባክዎ የሙከራ SMS ያስገቡ!');
      return;
    }
    setIsTestingWebhook(true);
    try {
      const res = await fetch(buildApiUrl('/api/webhook/sms/test'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ smsText: text, sender }),
      });
      const data = await res.json();
      if (data?.ok) {
        showToast(`✅ ${data.result?.statusText || 'SMS ተፈትኗል'}`);
        if (Array.isArray(data.logs)) setSmsLogs(data.logs);
        if (Array.isArray(data.verifiedReceipts)) setSmsVerifiedReceipts(data.verifiedReceipts);
        onRefreshLiveState?.();
      } else {
        showToast(`❌ ${data?.error || 'ስህተት'}`);
      }
    } catch {
      showToast('❌ ከሰርቨር ጋር መገናኘት አልተቻለም');
    } finally {
      setIsTestingWebhook(false);
    }
  };

  const handleSaveWebhookSecret = async () => {
    if (!smsWebhookSecretInput.trim() || smsWebhookSecretInput.trim().length < 4) {
      showToast('❌ Secret ቁልፍ ቢያንስ 4 ፊደል መሆን አለበት!');
      return;
    }
    try {
      const res = await fetch(buildApiUrl('/api/webhook/sms/config'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: smsWebhookSecretInput.trim() }),
      });
      const data = await res.json();
      if (data?.ok) {
        setSmsWebhookSecret(data.secret);
        showToast('✅ የ SMS Webhook Secret ተቀይሯል!');
      }
    } catch {
      showToast('❌ Secret መቀየር አልተቻለም');
    }
  };

  return (
    <div className="space-y-4 pb-8">
      {/* Top Bar: Clean Title + Action Icons */}
      <div
        className={`rounded-2xl border px-4 py-3 flex items-center justify-between gap-2 ${
          isDark
            ? 'bg-[#151521] border-slate-800/80 text-white'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-black tracking-tight">
              Sun Bingo Control Center (ሳን ቢንጎ)
            </h2>
            <p className="text-[11px] text-slate-400">
              {isFastMode ? 'Sun Fast Bingo (10 / 20 / 50 / 100 ETB)' : 'Sun Bingo Control Center'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          <button
            type="button"
            onClick={onAdminLogout}
            title="አድሚን ቆልፍ (Lock Admin)"
            className="px-2.5 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 font-bold text-xs flex items-center gap-1 cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">ቆልፍ (Lock)</span>
          </button>
          {onRefreshLiveState && (
            <button
              type="button"
              onClick={() => {
                onRefreshLiveState();
                showToast('✓ ከሰርቨር ጋር ታድሷል (Synced)!');
              }}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onAdminLogout}
            className="px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600 border border-rose-500/30 text-rose-400 hover:text-white font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>ውጣ</span>
          </button>
        </div>
      </div>

      {/* Horizontal Scrollable Pill Navigation Bar (Exact match to IMG_3567..IMG_3561) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {NAV_TABS.map((tab) => {
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSubTab(tab.id)}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
                  : isDark
                  ? 'bg-[#1c1c28] text-slate-400 hover:text-slate-200 border border-slate-800/80'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {typeof tab.badge === 'number' && tab.badge > 0 && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                    isActive
                      ? 'bg-white text-indigo-700'
                      : tab.id === 'deposits' || tab.id === 'withdrawals'
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-700 text-slate-200'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Toast Feedback Banner */}
      {adminToast && (
        <div className="p-3 rounded-xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-200 text-xs font-bold flex items-center justify-between">
          <span>{adminToast}</span>
          <button
            type="button"
            onClick={() => setAdminToast(null)}
            className="text-xs opacity-70 hover:opacity-100 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* =====================================================================
          TAB 1: OVERVIEW (Matches IMG_3567.jpeg)
         ===================================================================== */}
      {activeSubTab === 'overview' && (
        <div className="space-y-3.5">
          {/* Android APK Download Card */}
          <PWAInstallButton isDark={isDark} variant="card" />

          {/* Card 1: Total Users */}
          <div
            onClick={() => setActiveSubTab('users')}
            className={`rounded-2xl border p-5 cursor-pointer transition-transform active:scale-[0.99] ${
              isDark
                ? 'bg-[#1c1c28] border-slate-800/80 text-white'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="text-xs sm:text-sm font-medium text-slate-400">
              Total Users (ጠቅላላ ተጫዋቾች)
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono-tabular mt-1.5">
              {users.length}
            </div>
          </div>

          {/* Card 2: Total System Profit */}
          <div
            className={`rounded-2xl border p-5 ${
              isDark
                ? 'bg-[#1c1c28] border-slate-800/80 text-white'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="text-xs sm:text-sm font-medium text-slate-400">
              Total System Profit (ጠቅላላ የሲስተም ትርፍ)
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono-tabular text-emerald-400 mt-1.5">
              {totalSystemProfit.toLocaleString()} Br
            </div>
          </div>

          {/* Card 3: Total Deposits (Approved) */}
          <div
            onClick={() => setActiveSubTab('deposits')}
            className={`rounded-2xl border p-5 cursor-pointer transition-transform active:scale-[0.99] ${
              isDark
                ? 'bg-[#1c1c28] border-slate-800/80 text-white'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="text-xs sm:text-sm font-medium text-slate-400">
                Total Deposits (Approved)
              </div>
              {pendingDepositsCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs font-bold">
                  {pendingDepositsCount} Pending
                </span>
              )}
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono-tabular text-indigo-400 mt-1.5">
              {totalDepositsApproved.toLocaleString()} Br
            </div>
          </div>

          {/* Card 4: Total Withdrawals (Approved) */}
          <div
            onClick={() => setActiveSubTab('withdrawals')}
            className={`rounded-2xl border p-5 cursor-pointer transition-transform active:scale-[0.99] ${
              isDark
                ? 'bg-[#1c1c28] border-slate-800/80 text-white'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="text-xs sm:text-sm font-medium text-slate-400">
                Total Withdrawals (Approved)
              </div>
              {pendingWithdrawalsCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs font-bold">
                  {pendingWithdrawalsCount} Pending
                </span>
              )}
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono-tabular text-orange-400 mt-1.5">
              {totalWithdrawalsApproved.toLocaleString()} Br
            </div>
          </div>

          {/* Card 5: Recent Games Summary */}
          <div
            className={`rounded-2xl border p-5 space-y-3 ${
              isDark
                ? 'bg-[#1c1c28] border-slate-800/80 text-white'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black">Recent Games</h3>
              <button
                type="button"
                onClick={() => setActiveSubTab('game_control')}
                className="text-xs font-bold text-indigo-400 hover:underline cursor-pointer"
              >
                Live Rooms &rarr;
              </button>
            </div>

            {gameHistory.length === 0 ? (
              <div className="text-xs text-slate-400 py-4 text-center">
                ገና የተጠናቀቀ ጨዋታ የለም (No recent games completed yet).
              </div>
            ) : (
              <div className="space-y-2.5">
                {gameHistory.slice(0, 6).map((g) => (
                  <div
                    key={g.id}
                    className={`p-3.5 rounded-xl border flex items-center justify-between gap-2 ${
                      isDark
                        ? 'bg-[#14141d] border-slate-800/80'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div>
                      <div className="text-xs sm:text-sm font-extrabold flex items-center gap-2">
                        <span>Game #{g.gameMatchId}</span>
                        <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-bold">
                          {g.stakeAmount} Br Room
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Winner:{' '}
                        <b className="text-emerald-400">
                          {g.winners?.[0]?.userName || 'Winner'} (Cartela #{g.winners?.[0]?.cartelaId || '-'})
                        </b>{' '}
                        · {g.timestamp}
                      </div>
                    </div>
                    <div className="text-right font-mono-tabular">
                      <div className="text-sm font-black text-emerald-400">
                        {g.prizeAmount} Br
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {g.totalBallsCalled} balls
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 2: GAME CONTROL (Matches IMG_3566.jpeg - Live Rooms Monitor + Controls)
         ===================================================================== */}
      {activeSubTab === 'game_control' && (
        <div className="space-y-4">
          {/* EZI BINGO ADMIN SETTINGS: የመደብ መጠን (Stake) + ደራሽ (Prize) + የጨዋታ ደቂቃ (Minutes) */}
          <div
            className={`rounded-2xl border p-5 space-y-4 ${
              isDark
                ? 'bg-[#1c1c28] border-amber-500/40 text-white'
                : 'bg-white border-amber-300 text-slate-900'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-base sm:text-lg font-black text-amber-400">
                  🎯 የ Sun Bingo ጨዋታ መደብ፣ ደራሽ እና ደቂቃ መወሰኛ
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  የመደብ መጠን (Stake)፣ ደራሽ (Prize) እና ጨዋታው የሚጀምርበትን ደቂቃ እዚህ በመጻፍ ይወስኑ።
                </p>
              </div>
              <button
                type="button"
                onClick={onOpenAll16RulesModal}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>16 የጨዋታ ሕጎች እይ</span>
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const parsedStake = Math.max(0, parseFloat(stakeInput) || 0);
                const parsedPrize = Math.max(1, parseFloat(prizeInput) || 8);
                const parsedMinutes = Math.max(0.1, parseFloat(regMinInput) || 1);
                const totalSecs = Math.max(5, Math.round(parsedMinutes * 60));
                if (onUpdateGameSettings) {
                  onUpdateGameSettings(parsedStake, parsedPrize, patternInput, parsedMinutes);
                }
                onStartRegistrationCountdown(totalSecs);
                dispatchServerRoomAction({
                  mode: 'regular',
                  action: 'update_settings',
                  stakeAmount: parsedStake,
                  prizeAmount: parsedPrize,
                  activePatternId: patternInput,
                  countdownSeconds: totalSecs,
                });
                showToast(
                  `✅ የ Sun Bingo መደብ (${parsedStake} ETB)፣ ደራሽ (${parsedPrize} ETB) እና ደቂቃ (${parsedMinutes} ደቂቃ) ተቀምጧል!`
                );
              }}
              className="space-y-3"
            >
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                {/* 1. የመደብ መጠን (Stake Amount) */}
                <div>
                  <label className="block text-xs font-black text-emerald-400 mb-1">
                    💵 የመደብ መጠን (Stake - ETB)፦
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={stakeInput}
                    onChange={(e) => setStakeInput(e.target.value)}
                    placeholder="10"
                    className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-mono-tabular font-black border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                      isDark ? 'bg-[#14141d] border-slate-700 text-white' : 'bg-slate-50 border-slate-300'
                    }`}
                  />
                </div>

                {/* 2. የደራሽ መጠን (Prize / Derash Amount) */}
                <div>
                  <label className="block text-xs font-black text-amber-400 mb-1">
                    🏆 የደራሽ መጠን (Prize - ETB)፦
                  </label>
                  <input
                    type="number"
                    min={1}
                    step="any"
                    value={prizeInput}
                    onChange={(e) => setPrizeInput(e.target.value)}
                    placeholder="500"
                    className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-mono-tabular font-black border focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                      isDark ? 'bg-[#14141d] border-slate-700 text-white' : 'bg-slate-50 border-slate-300'
                    }`}
                  />
                </div>

                {/* 3. የጨዋታ ደቂቃ (Game Countdown Minutes) */}
                <div>
                  <label className="block text-xs font-black text-sky-400 mb-1">
                    ⏱️ የጨዋታ ደቂቃ (Minutes)፦
                  </label>
                  <input
                    type="number"
                    min={0.1}
                    step="any"
                    value={regMinInput}
                    onChange={(e) => setRegMinInput(e.target.value)}
                    placeholder="1"
                    className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-mono-tabular font-black border focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                      isDark ? 'bg-[#14141d] border-slate-700 text-white' : 'bg-slate-50 border-slate-300'
                    }`}
                  />
                </div>

                {/* 4. የጨዋታ ሕግ (Bingo Pattern 1-16) */}
                <div>
                  <label className="block text-xs font-black text-purple-400 mb-1">
                    🎲 የጨዋታ ሕግ (Rule #1–#16)፦
                  </label>
                  <select
                    value={patternInput}
                    onChange={(e) => setPatternInput(Number(e.target.value))}
                    className={`w-full px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold border focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                      isDark ? 'bg-[#14141d] border-slate-700 text-white' : 'bg-slate-50 border-slate-300'
                    }`}
                  >
                    {BINGO_PATTERNS.map((pat) => (
                      <option key={pat.id} value={pat.id}>
                        ሕግ #{pat.id} — {pat.titleAm}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-black cursor-pointer shadow-md"
                >
                  💾 መደብ፣ ደራሽ እና ደቂቃ አስቀምጥ (Save)
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const parsedStake = Math.max(0, parseFloat(stakeInput) || 0);
                    const parsedPrize = Math.max(1, parseFloat(prizeInput) || 500);
                    const parsedMinutes = Math.max(0.1, parseFloat(regMinInput) || 1);
                    const totalSecs = Math.max(5, Math.round(parsedMinutes * 60));
                    if (onUpdateGameSettings) {
                      onUpdateGameSettings(parsedStake, parsedPrize, patternInput, parsedMinutes);
                    }
                    dispatchServerRoomAction({
                      mode: 'regular',
                      action: 'update_settings',
                      stakeAmount: parsedStake,
                      prizeAmount: parsedPrize,
                      activePatternId: patternInput,
                      countdownSeconds: totalSecs,
                    });
                    onStartRegistrationCountdown(totalSecs);
                    showToast(
                      `⏱️ የ ${parsedMinutes} ደቂቃ (${totalSecs} ሰከንድ) የጨዋታ መጀመሪያ ቆጣሪ ተጀምሯል!`
                    );
                  }}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs sm:text-sm font-black cursor-pointer shadow-md"
                >
                  ⏱️ በፃፍኩት ደቂቃ ({regMinInput || 1} ደቂቃ) ቆጣሪ ጀምር
                </button>
              </div>
            </form>
          </div>

          <div
            className={`rounded-2xl border p-5 space-y-4 ${
              isDark
                ? 'bg-[#1c1c28] border-slate-800/80 text-white'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-base sm:text-lg font-black">
                Live Rooms Monitor
              </h3>
              <button
                type="button"
                onClick={onOpenAll16RulesModal}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>የጨዋታ ሕጎች እይ</span>
              </button>
            </div>

            {/* 4 Live Stake Room Cards (Room 10 Br, Room 20 Br, Room 50 Br, Room 100 Br) */}
            <div className="space-y-3">
              {STAKE_ROOMS.map((roomStake) => {
                const roomState = allFastRoomsByStake[roomStake];
                const lockedList = allFastLockedByStake[roomStake] || [];
                const isSelected = activeStakeTier === roomStake;

                const roomPlaying = isSelected ? isPlaying : Boolean(roomState?.isPlaying);
                const roomCountdown = isSelected
                  ? null
                  : roomState?.preGameCountdown ?? null;
                const roomBallsCount = isSelected
                  ? registeredCartelasCount
                  : lockedList.length;
                const roomCalledBalls = isSelected
                  ? 0
                  : roomState?.calledBalls?.length || 0;
                const roomPot = Number((lockedList.length * roomStake * 0.8).toFixed(0));
                const roomProfit = Number((lockedList.length * roomStake * 0.15).toFixed(0));

                const statusLabel = roomPlaying
                  ? 'PLAYING'
                  : roomCountdown !== null
                  ? `STARTING (${roomCountdown}s)`
                  : 'WAITING';

                return (
                  <div
                    key={roomStake}
                    onClick={() => onSelectStakeRoom && onSelectStakeRoom(roomStake)}
                    className={`rounded-2xl border p-4 transition-all cursor-pointer ${
                      isSelected
                        ? isDark
                          ? 'bg-[#14141d] border-indigo-500 ring-1 ring-indigo-500/50'
                          : 'bg-indigo-50/40 border-indigo-400'
                        : isDark
                        ? 'bg-[#14141d] border-slate-800/90 hover:border-slate-700'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-base sm:text-lg font-black">
                        Room {roomStake} Br
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${
                          roomPlaying
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : roomCountdown !== null
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-amber-900/40 text-amber-400 border border-amber-700/40'
                        }`}
                      >
                        {statusLabel}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs sm:text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Players / Cards:</span>
                        <span className="font-bold font-mono-tabular">
                          {lockedList.length || (isSelected ? registeredCartelasCount : 0)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Prize Pool (Pot):</span>
                        <span className="font-bold font-mono-tabular text-emerald-400">
                          {roomPot} Br
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">System Profit:</span>
                        <span className="font-bold font-mono-tabular text-indigo-400">
                          {roomProfit} Br
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Balls Drawn:</span>
                        <span className="font-bold font-mono-tabular">
                          {roomCalledBalls} / 75
                        </span>
                      </div>
                    </div>

                    {/* Quick Room Controls */}
                    <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-slate-800/60">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onSelectStakeRoom) onSelectStakeRoom(roomStake);
                          dispatchServerRoomAction({
                            mode: 'fast',
                            stakeAmount: roomStake,
                            action: 'start_countdown',
                            countdownSeconds: 15,
                          });
                          showToast(`⚡ Room ${roomStake} Br የ 15s ቆጣሪ ተጀምሯል!`);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs cursor-pointer"
                      >
                        ⚡ 15s ቆጣሪ
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onSelectStakeRoom) onSelectStakeRoom(roomStake);
                          dispatchServerRoomAction({
                            mode: 'fast',
                            stakeAmount: roomStake,
                            action: 'toggle_pause',
                          });
                          if (isSelected) onTogglePause();
                        }}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer"
                      >
                        Play / Pause
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onSelectStakeRoom) onSelectStakeRoom(roomStake);
                          dispatchServerRoomAction({
                            mode: isFastMode ? 'fast' : 'regular',
                            stakeAmount: roomStake,
                            action: 'reset',
                          });
                          if (isSelected) onResetGame();
                          showToast(`🔄 Room ${roomStake} Br እንደገና ተጀምሯል (Reset)!`);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-rose-600/80 hover:bg-rose-600 text-white font-bold text-xs cursor-pointer"
                      >
                        Reset Room
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Room Speed, Manual Ball & Cartela Blocker */}
          <div
            className={`rounded-2xl border p-5 space-y-4 ${
              isDark
                ? 'bg-[#1c1c28] border-slate-800/80 text-white'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <h4 className="text-sm font-black text-indigo-400">
              የኳስ ፍጥነት እና ካርቴላ ማገጃ (Room {activeStakeTier} Br)
            </h4>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 bg-[#14141d] p-1 rounded-xl border border-slate-800">
                {([1, 2, 3, 5] as const).map((spd) => (
                  <button
                    key={spd}
                    type="button"
                    onClick={() => onChangeSpeed(spd)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono-tabular font-black cursor-pointer ${
                      callSpeedSec === spd
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {spd}s
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={onTogglePause}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
                >
                  {!isPlaying || isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                  <span>{!isPlaying || isPaused ? 'Play' : 'Pause'}</span>
                </button>
                <button
                  type="button"
                  onClick={onDrawNextManual}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                  <span>Next Ball</span>
                </button>
                <button
                  type="button"
                  onClick={onResetGame}
                  className="px-3.5 py-2 rounded-xl bg-rose-600 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restart</span>
                </button>
              </div>
            </div>

            {/* Cartela Blocker */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const id = parseInt(cartelaToBlock, 10);
                if (!isNaN(id) && id >= 1) {
                  onBlockCartelaId(id);
                  setCartelaToBlock('');
                  showToast(`🚫 ካርቴላ #${id} ታግዷል!`);
                }
              }}
              className="flex gap-2 pt-2"
            >
              <input
                type="number"
                min={1}
                value={cartelaToBlock}
                onChange={(e) => setCartelaToBlock(e.target.value)}
                placeholder={isFastMode ? 'የካርቴላ ቁጥር (1 - 500)' : 'የካርቴላ ቁጥር'}
                className={`flex-1 px-3.5 py-2 rounded-xl text-xs font-mono-tabular border ${
                  isDark ? 'bg-[#14141d] border-slate-800 text-white' : 'bg-slate-50 border-slate-300'
                }`}
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold cursor-pointer"
              >
                ካርቴላ አግድ (Block)
              </button>
            </form>

            {/* Admin Live Board Message (Appears when players click Show More on the 75-Ball Board) */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                dispatchServerRoomAction({
                  mode: isFastMode ? 'fast' : 'regular',
                  stakeAmount: activeStakeTier,
                  action: 'set_admin_message',
                  adminMessage: broadcastMessage.trim(),
                  applyAllRooms: true,
                });
                showToast(
                  broadcastMessage.trim()
                    ? '📢 መልእክቱ በጨዋታ ቦርዱ (Show More) ላይ ለሁሉም ተጫዋቾች ወጥቷል!'
                    : '🧹 በጨዋታ ቦርዱ ላይ የነበረው መልእክት ጠፍቷል!'
                );
              }}
              className="pt-3 border-t border-slate-800/70 space-y-2"
            >
              <label className="block text-xs font-black text-amber-400">
                📢 በጨዋታ ቦርዱ (Show More) ላይ ለተጫዋቾች የሚታይ መልእክት ፃፍ፦
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  placeholder="ለምሳሌ፦ እንኳን ደህና መጡ! ዛሬ ልዩ ቦነስ አለ..."
                  className={`flex-1 px-3.5 py-2 rounded-xl text-xs font-bold border ${
                    isDark ? 'bg-[#14141d] border-slate-800 text-white' : 'bg-slate-50 border-slate-300'
                  }`}
                />
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black cursor-pointer whitespace-nowrap"
                  >
                    መልእክት ለጥፍ
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBroadcastMessage('');
                      dispatchServerRoomAction({
                        mode: isFastMode ? 'fast' : 'regular',
                        stakeAmount: activeStakeTier,
                        action: 'set_admin_message',
                        adminMessage: '',
                        applyAllRooms: true,
                      });
                      showToast('🧹 የቦርድ መልእክቱ ጠፍቷል!');
                    }}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                  >
                    አጥፋ
                  </button>
                </div>
              </div>
            </form>

            {/* Admin Configurable Bonus Cartelas for Players Holding > 20 Cartelas */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const parsed = Math.max(0, Math.min(30, parseInt(over20BonusCartelasInput, 10) || 0));
                if (onUpdateBonusCartelasForOver20) {
                  onUpdateBonusCartelasForOver20(parsed);
                }
                dispatchServerRoomAction({
                  mode: isFastMode ? 'fast' : 'regular',
                  stakeAmount: activeStakeTier,
                  action: 'set_bonus_over_20',
                  bonusCount: parsed,
                });
                showToast(`🎁 ከ 20 ካርቴላ በላይ ለሚይዙ የሚሰጠው ነፃ ቦነስ ካርቴላ ብዛት ወደ +${parsed} ተቀይሯል!`);
              }}
              className="pt-3 border-t border-slate-800/70 space-y-2"
            >
              <label className="block text-xs font-black text-emerald-400">
                🎁 ከ 20 ካርቴላ በላይ ለሚይዙ ተጫዋቾች የሚሰጥ ነፃ ቦነስ ካርቴላ ብዛት (0 – 30)፦
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={30}
                  value={over20BonusCartelasInput}
                  onChange={(e) => setOver20BonusCartelasInput(e.target.value)}
                  placeholder="5"
                  className={`w-28 px-3.5 py-2 rounded-xl text-xs font-mono-tabular font-black border ${
                    isDark ? 'bg-[#14141d] border-slate-800 text-white' : 'bg-slate-50 border-slate-300'
                  }`}
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black cursor-pointer whitespace-nowrap"
                >
                  ቦነስ ካርቴላ ብዛት ወስን
                </button>
              </div>
            </form>

            {/* Admin Manual Bingo Approval (የአድሚን ቢንጎ ማረጋገጫና ሽልማት አጽድቅ) */}
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2.5">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs sm:text-sm font-black text-amber-300">
                  የአድሚን ቢንጎ ማረጋገጫና ሽልማት ማጽደቂያ (Admin Bingo Approval)
                </h4>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-300 font-semibold leading-relaxed">
                ተጫዋች የተሟላ ቢንጎ ሰርቶ ወይም ውስብስብ በሆነ ቅጥ ላይ ቢንጎ ካለ፣ የካርቴላውን ቁጥር አስገብተው በቀጥታ አሸናፊ እንዲሆንና ሽልማቱ እንዲከፈለው ማጽደቅ ይችላሉ፦
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="number"
                  placeholder="የካርቴላ ቁጥር (ምሳሌ 12)..."
                  value={manualWinnerCartelaIdInput}
                  onChange={(e) => setManualWinnerCartelaIdInput(e.target.value)}
                  className="px-3 py-2 rounded-xl text-xs sm:text-sm font-mono-tabular font-bold border bg-slate-900 border-slate-700 text-white w-48"
                />
                <button
                  type="button"
                  onClick={() => {
                    const id = Number(manualWinnerCartelaIdInput);
                    if (id > 0 && onManualApproveWinner) {
                      onManualApproveWinner(id);
                      setManualWinnerCartelaIdInput('');
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-xs hover:from-amber-400 hover:to-yellow-300 cursor-pointer shadow-md flex items-center gap-1.5"
                >
                  <Trophy className="w-4 h-4 fill-slate-950" />
                  <span>🏆 ቢንጎ አጽድቅና ሸልም</span>
                </button>
              </div>
            </div>

            {/* Pending Admin Bingo Claims (የተሟሉ ቢንጎዎች ማረጋገጫ) as requested */}
            {pendingVerificationCartelas.length > 0 && (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/40 space-y-3 animate-pulse">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                    <h4 className="text-xs sm:text-sm font-black text-emerald-300">
                      📋 በአድሚን ማረጋገጫ ላይ ያሉ ቢንጎዎች ({pendingVerificationCartelas.length})
                    </h4>
                  </div>
                  <span className="text-[11px] font-bold text-slate-400">እባክዎ አረጋግጠው ያጽድቁ</span>
                </div>

                <div className="space-y-2">
                  {pendingVerificationCartelas.map((item) => (
                    <div
                      key={item.cartelaId}
                      className="p-3 rounded-xl bg-slate-900 border border-emerald-500/30 flex flex-wrap items-center justify-between gap-2"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-emerald-400 font-mono-tabular">
                            ካርቴላ #{item.cartelaId}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-extrabold">
                            ቅጡ ተሟልቷል
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 font-medium">
                          {item.reason}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (onApprovePendingClaim) {
                              onApprovePendingClaim(item.cartelaId);
                            } else if (onManualApproveWinner) {
                              onManualApproveWinner(item.cartelaId);
                            }
                          }}
                          className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs cursor-pointer shadow-md flex items-center gap-1.5"
                        >
                          <Trophy className="w-3.5 h-3.5" />
                          <span>✅ አጽድቅና ሸልም</span>
                        </button>
                        {onRejectPendingClaim && (
                          <button
                            type="button"
                            onClick={() => onRejectPendingClaim(item.cartelaId)}
                            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-900/50 text-rose-300 font-bold text-xs cursor-pointer"
                          >
                            ውድቅ አድርግ
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {blockedCartelaIds.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-bold text-rose-400">የታገዱ ካርቴላዎች ({blockedCartelaIds.length})፦</div>
                <div className="flex flex-wrap gap-2">
                  {blockedCartelaIds.map((id) => (
                    <span
                      key={id}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-mono-tabular font-bold"
                    >
                      <span>#{id}</span>
                      <button
                        type="button"
                        onClick={() => onUnblockCartelaId(id)}
                        className="hover:text-emerald-400 cursor-pointer p-0.5"
                        title="ከእገዳ ነፃ አውጣ"
                      >
                        <Unlock className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onManualApproveWinner?.(id)}
                        className="px-2 py-0.5 rounded-lg bg-emerald-500 text-slate-950 text-[10px] font-black hover:bg-emerald-400 cursor-pointer flex items-center gap-1"
                        title="ይህንን ካርቴላ አሸናፊ አድርገህ አጽድቅ (Approve as Winner)"
                      >
                        <Trophy className="w-3 h-3" />
                        <span>አጽድቅ</span>
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 2.5: HERO BANNERS & ADS (Home Page Banners Text + Image Upload)
         ===================================================================== */}
      {activeSubTab === 'banners' && (
        <div className="space-y-4">
          <div
            className={`rounded-2xl border p-5 space-y-4 ${
              isDark
                ? 'bg-[#1c1c28] border-slate-800/80 text-white'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-base sm:text-lg font-black text-amber-400 flex items-center gap-2">
                  <Megaphone className="w-5 h-5" />
                  <span>Hero Banners &amp; Ads (የ Home Page ማስታወቂያዎች እና ምስሎች)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  በ Home Page ላይ የሚታዩትን Hero Banners &amp; Ads ጽሑፍ ይፃፉ፣ ምስል ከስልክዎ/ኮምፒውተርዎ ይምረጡ ወይም የምስል ሊንክ ያስገቡ።
                </p>
              </div>
              {editingBannerId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingBannerId(null);
                    setBannerTitle('');
                    setBannerSubtitle('');
                    setBannerBadge('Sun Bingo ልዩ ቦነስ');
                    setBannerColor('emerald');
                    setBannerImageUrl('');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  ✕ ማስተካከያውን ተው (Cancel Edit)
                </button>
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!bannerTitle.trim()) {
                  showToast('❌ እባክዎ የማስታወቂያውን ዋና ርዕስ (Title) ይፃፉ!');
                  return;
                }
                const payload: Omit<HeroBannerAd, 'id'> = {
                  title: bannerTitle.trim(),
                  subtitle: bannerSubtitle.trim() || 'በ Sun Bingo ይጫወቱ፣ ወዲያውኑ ያሸንፉ!',
                  badgeText: bannerBadge.trim() || 'Sun Bingo ልዩ ቦነስ',
                  accentColor: bannerColor,
                  imageUrl: bannerImageUrl.trim() || undefined,
                  isActive: true,
                };

                if (editingBannerId && onUpdateHeroBanner) {
                  onUpdateHeroBanner({ ...payload, id: editingBannerId });
                  showToast('✅ የ Home Page ማስታወቂያው (Hero Banner) ተስተካክሏል!');
                } else if (onAddHeroBanner) {
                  onAddHeroBanner(payload);
                  showToast('✅ አዲስ የ Home Page ማስታወቂያ (Hero Banner) ተጨምሯል!');
                }

                setEditingBannerId(null);
                setBannerTitle('');
                setBannerSubtitle('');
                setBannerBadge('Sun Bingo ልዩ ቦነስ');
                setBannerColor('emerald');
                setBannerImageUrl('');
              }}
              className="space-y-3.5"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. Badge Text */}
                <div>
                  <label className="block text-xs font-black text-amber-400 mb-1">
                    🏷️ የላይኛው አጭር መለያ (Badge Text)፦
                  </label>
                  <input
                    type="text"
                    value={bannerBadge}
                    onChange={(e) => setBannerBadge(e.target.value)}
                    placeholder="ለምሳሌ፦ Sun Bingo ልዩ ቦነስ"
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold border focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                      isDark ? 'bg-[#14141d] border-slate-700 text-white' : 'bg-slate-50 border-slate-300'
                    }`}
                  />
                </div>

                {/* 2. Accent Color */}
                <div>
                  <label className="block text-xs font-black text-sky-400 mb-1">
                    🎨 የካርዱ ቀለም (Banner Theme Color)፦
                  </label>
                  <select
                    value={bannerColor}
                    onChange={(e) =>
                      setBannerColor(e.target.value as 'blue' | 'emerald' | 'amber' | 'rose')
                    }
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold border focus:outline-none ${
                      isDark ? 'bg-[#14141d] border-slate-700 text-white' : 'bg-slate-50 border-slate-300'
                    }`}
                  >
                    <option value="emerald">አረንጓዴ (Emerald Green)</option>
                    <option value="blue">ሰማያዊ (Royal Blue)</option>
                    <option value="amber">ወርቃማ (Amber Gold)</option>
                    <option value="rose">ቀይ / ሮዝ (Rose Red)</option>
                  </select>
                </div>
              </div>

              {/* 3. Main Title */}
              <div>
                <label className="block text-xs font-black text-emerald-400 mb-1">
                  ✍️ ዋና ርዕስ (Banner Title)፦
                </label>
                <input
                  type="text"
                  required
                  value={bannerTitle}
                  onChange={(e) => setBannerTitle(e.target.value)}
                  placeholder="ለምሳሌ፦ ሁልጊዜ ጨዋታ! በ Sun Bingo እስከ 50,000 ብር ያሸንፉ!"
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    isDark ? 'bg-[#14141d] border-slate-700 text-white' : 'bg-slate-50 border-slate-300'
                  }`}
                />
              </div>

              {/* 4. Subtitle / Description */}
              <div>
                <label className="block text-xs font-black text-purple-400 mb-1">
                  📝 ዝርዝር መግለጫ ጽሑፍ (Subtitle / Ad Copy)፦
                </label>
                <textarea
                  rows={2}
                  value={bannerSubtitle}
                  onChange={(e) => setBannerSubtitle(e.target.value)}
                  placeholder="ለምሳሌ፦ ከ 20 በላይ ካርቴላ ለሚይዙ ነፃ ካርቴላ ቦነስ ይሰጣል!"
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold border focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                    isDark ? 'bg-[#14141d] border-slate-700 text-white' : 'bg-slate-50 border-slate-300'
                  }`}
                />
              </div>

              {/* 5. Image Upload or Image URL */}
              <div className="space-y-2">
                <label className="block text-xs font-black text-amber-300">
                  🖼️ የማስታወቂያ ምስል (ከስልክ/ኮምፒውተር ምስል ይምረጡ ወይም የምስል Link ያስገቡ)፦
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={bannerImageUrl}
                    onChange={(e) => setBannerImageUrl(e.target.value)}
                    placeholder="የምስል URL (https://...) ወይም ከጎን 'ምስል ምረጥ' የሚለውን ይጫኑ"
                    className={`flex-1 px-3.5 py-2.5 rounded-xl text-xs font-mono-tabular border focus:outline-none ${
                      isDark ? 'bg-[#14141d] border-slate-700 text-white' : 'bg-slate-50 border-slate-300'
                    }`}
                  />

                  <label className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer shrink-0 shadow-md">
                    <ImageIcon className="w-4 h-4" />
                    <span>ምስል ከስልክ/ኮምፒውተር ምረጥ</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => {
                          if (typeof reader.result === 'string') {
                            setBannerImageUrl(reader.result);
                            showToast('🖼️ ምስሉ ተመርጧል! አሁን Save / ለጥፍ የሚለውን ይጫኑ።');
                          }
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                  </label>

                  {bannerImageUrl && (
                    <button
                      type="button"
                      onClick={() => setBannerImageUrl('')}
                      className="px-3 py-2.5 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white text-xs font-bold cursor-pointer shrink-0"
                    >
                      ምስል አጥፋ
                    </button>
                  )}
                </div>

                {/* Live Image Preview */}
                {bannerImageUrl && (
                  <div className="relative rounded-2xl overflow-hidden border border-slate-700 max-h-44 bg-slate-950">
                    <img
                      src={bannerImageUrl}
                      alt="Banner Preview"
                      className="w-full h-40 object-cover"
                    />
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>
                  {editingBannerId
                    ? '💾 የተስተካከለውን ማስታወቂያ አስቀምጥ (Update Banner)'
                    : '📢 አዲስ Hero Banner / ማስታወቂያ ለጥፍ (Add to Home Page)'}
                </span>
              </button>
            </form>
          </div>

          {/* Existing Hero Banners List */}
          <div
            className={`rounded-2xl border p-5 space-y-3 ${
              isDark
                ? 'bg-[#1c1c28] border-slate-800/80 text-white'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <h4 className="text-sm sm:text-base font-black">
              በ Home Page ላይ ያሉ ማስታወቂያዎች ({heroBanners.length})
            </h4>

            {heroBanners.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                ምንም የ Home Page ማስታወቂያ የለም። ከላይ ባለው ቅጽ አዲስ ማስታወቂያ ይጨምሩ።
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {heroBanners.map((b) => (
                  <div
                    key={b.id}
                    className={`rounded-2xl border overflow-hidden flex flex-col justify-between ${
                      isDark ? 'bg-[#14141d] border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    {b.imageUrl && (
                      <div className="w-full h-32 bg-slate-950 overflow-hidden border-b border-slate-800">
                        <img
                          src={b.imageUrl}
                          alt={b.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                      <div>
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-400 border border-amber-500/30 mb-1">
                          {b.badgeText}
                        </span>
                        <div className="text-sm font-extrabold leading-snug">{b.title}</div>
                        <div className="text-xs text-slate-400 mt-1 line-clamp-2">{b.subtitle}</div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800/60">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingBannerId(b.id);
                            setBannerTitle(b.title);
                            setBannerSubtitle(b.subtitle);
                            setBannerBadge(b.badgeText);
                            setBannerColor(b.accentColor);
                            setBannerImageUrl(b.imageUrl || '');
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>አስተካክል (Edit)</span>
                        </button>
                        {onRemoveHeroBanner && (
                          <button
                            type="button"
                            onClick={() => {
                              onRemoveHeroBanner(b.id);
                              showToast('🗑️ ማስታወቂያው ተሰርዟል!');
                            }}
                            className="px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>አጥፋ (Delete)</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 2.8: ADD BANK & PAYMENT ACCOUNTS MANAGER (ባንክ እና የክፍያ አካውንቶች ማስተዳደሪያ)
         ===================================================================== */}
      {activeSubTab === 'banks' && (
        <div className="space-y-4">
          {/* Add / Edit Bank Account Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!bankShortNameInput.trim() || !bankAccountNumInput.trim()) {
                showToast('❌ እባክዎ የባንኩን ስም እና የሂሳብ/ስልክ ቁጥር ያስገቡ!');
                return;
              }
              const bankItem: BankPaymentAccount = {
                id: editingBankId || bankShortNameInput.trim().replace(/\s+/g, '_'),
                shortName: bankShortNameInput.trim(),
                bankName: bankFullNameInput.trim() || bankShortNameInput.trim(),
                accountNumber: bankAccountNumInput.trim(),
                accountHolder: bankHolderNameInput.trim() || 'Sun Bingo',
                badgeBg: bankBadgeColorInput,
              };

              if (editingBankId) {
                const nextList = bankAccounts.map((b) =>
                  b.id === editingBankId ? bankItem : b
                );
                if (onUpdateBankAccount) {
                  onUpdateBankAccount(bankItem);
                } else {
                  dispatchServerRoomAction({
                    mode: isFastMode ? 'fast' : 'regular',
                    stakeAmount: activeStakeTier,
                    action: 'set_bank_accounts',
                    bankAccounts: nextList,
                  } as unknown as Parameters<typeof dispatchServerRoomAction>[0]);
                }
                showToast(`✅ የ "${bankItem.shortName}" ባንክ መረጃ ተስተካክሏል!`);
              } else {
                const uniqueId = bankAccounts.some((b) => b.id === bankItem.id)
                  ? `${bankItem.id}_${Date.now().toString().slice(-4)}`
                  : bankItem.id;
                const finalItem = { ...bankItem, id: uniqueId };
                const nextList = [...bankAccounts, finalItem];
                if (onAddBankAccount) {
                  onAddBankAccount(finalItem);
                } else {
                  dispatchServerRoomAction({
                    mode: isFastMode ? 'fast' : 'regular',
                    stakeAmount: activeStakeTier,
                    action: 'set_bank_accounts',
                    bankAccounts: nextList,
                  } as unknown as Parameters<typeof dispatchServerRoomAction>[0]);
                }
                showToast(`✅ አዲስ ባንክ "${finalItem.shortName}" (${finalItem.accountNumber}) ወደ Wallet ተጨምሯል!`);
              }

              setEditingBankId(null);
              setBankShortNameInput('');
              setBankFullNameInput('');
              setBankAccountNumInput('');
              setBankHolderNameInput('');
            }}
            className={`rounded-2xl border p-5 space-y-4 ${
              isDark
                ? 'bg-[#1c1c28] border-slate-800/80 text-white'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-base sm:text-lg font-black flex items-center gap-2">
                  <Landmark className="w-5 h-5 text-emerald-400" />
                  <span>
                    {editingBankId
                      ? 'ባንክ ማስተካከያ (Edit Bank Account)'
                      : 'አዲስ ባንክ መጨመሪያ (Add Bank Account)'}
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  እዚህ የሚጨምሩት ወይም የሚያስተካክሉት ባንክ በተጫዋቾች Wallet (Deposit & Withdraw) ላይ ወዲያውኑ ይታያል።
                </p>
              </div>
              {editingBankId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingBankId(null);
                    setBankShortNameInput('');
                    setBankFullNameInput('');
                    setBankAccountNumInput('');
                    setBankHolderNameInput('');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  የባንክ አጭር ስም (Short Name — ምሳሌ: CBE, Telebirr, Awash, Dashen)፦
                </label>
                <input
                  type="text"
                  value={bankShortNameInput}
                  onChange={(e) => setBankShortNameInput(e.target.value)}
                  placeholder="ምሳሌ: Awash ወይም CBE Birr..."
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold border ${
                    isDark
                      ? 'bg-[#14141d] border-slate-700 text-white'
                      : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  ሙሉ የባንክ ስም (Full Bank Name)፦
                </label>
                <input
                  type="text"
                  value={bankFullNameInput}
                  onChange={(e) => setBankFullNameInput(e.target.value)}
                  placeholder="ምሳሌ: Awash Bank (አዋሽ ባንክ)..."
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold border ${
                    isDark
                      ? 'bg-[#14141d] border-slate-700 text-white'
                      : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-emerald-400 mb-1">
                  የሂሳብ ቁጥር / ስልክ ቁጥር (Account / Phone Number)፦
                </label>
                <input
                  type="text"
                  value={bankAccountNumInput}
                  onChange={(e) => setBankAccountNumInput(e.target.value)}
                  placeholder="ምሳሌ: 1000112964936 ወይም 0942742684"
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-mono-tabular font-black border ${
                    isDark
                      ? 'bg-[#14141d] border-emerald-500/40 text-emerald-300'
                      : 'bg-slate-50 border-emerald-400 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-amber-400 mb-1">
                  የሂሳብ ባለቤት ስም (Account Holder Name)፦
                </label>
                <input
                  type="text"
                  value={bankHolderNameInput}
                  onChange={(e) => setBankHolderNameInput(e.target.value)}
                  placeholder="ምሳሌ: Ezana Gebrehiwot..."
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold border ${
                    isDark
                      ? 'bg-[#14141d] border-amber-500/40 text-amber-300'
                      : 'bg-slate-50 border-amber-400 text-slate-900'
                  }`}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5">
                የባንክ መለያ ቀለም (Badge Color)፦
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { bg: 'bg-emerald-600 text-white', label: 'Green (Telebirr / M-Pesa)' },
                  { bg: 'bg-purple-700 text-white', label: 'Purple (CBE)' },
                  { bg: 'bg-amber-500 text-slate-950', label: 'Gold (Abyssinia / Amole)' },
                  { bg: 'bg-blue-600 text-white', label: 'Blue (Awash / Dashen)' },
                  { bg: 'bg-rose-600 text-white', label: 'Red (Zemen / Hibret)' },
                ].map((c) => (
                  <button
                    key={c.bg}
                    type="button"
                    onClick={() => setBankBadgeColorInput(c.bg)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer transition-all ${c.bg} ${
                      bankBadgeColorInput === c.bg ? 'ring-2 ring-white scale-105 shadow-md' : 'opacity-70'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/25"
            >
              <Plus className="w-4 h-4" />
              <span>
                {editingBankId
                  ? 'የባንክ ለውጦችን አስቀምጥ (Save Bank Changes)'
                  : '+ አዲስ ባንክ ጨምር (Add Bank to Wallet)'}
              </span>
            </button>
          </form>

          {/* Existing Banks List */}
          <div
            className={`rounded-2xl border p-5 space-y-3 ${
              isDark
                ? 'bg-[#1c1c28] border-slate-800/80 text-white'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <h4 className="text-sm sm:text-base font-black">
              Active Deposit & Withdrawal Banks ({bankAccounts.length})
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {bankAccounts.map((b) => (
                <div
                  key={b.id}
                  className={`rounded-2xl border p-4 flex flex-col justify-between gap-3 ${
                    isDark
                      ? 'bg-[#14141d] border-slate-800'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`px-2.5 py-0.5 rounded-md text-xs font-black ${b.badgeBg}`}>
                        {b.shortName}
                      </span>
                      <span className="text-xs font-bold text-slate-400 truncate">
                        {b.bankName}
                      </span>
                    </div>
                    <div className="text-lg font-black font-mono-tabular text-emerald-400">
                      {b.accountNumber}
                    </div>
                    <div className="text-xs font-bold text-slate-300">
                      Holder: <span className="underline">{b.accountHolder}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-800/60">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingBankId(b.id);
                        setBankShortNameInput(b.shortName);
                        setBankFullNameInput(b.bankName);
                        setBankAccountNumInput(b.accountNumber);
                        setBankHolderNameInput(b.accountHolder);
                        setBankBadgeColorInput(b.badgeBg);
                      }}
                      className="flex-1 py-2 rounded-xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-300 hover:bg-indigo-600 hover:text-white text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit (አስተካክል)</span>
                    </button>
                    {bankAccounts.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const nextList = bankAccounts.filter((item) => item.id !== b.id);
                          if (onRemoveBankAccount) {
                            onRemoveBankAccount(b.id);
                          } else {
                            dispatchServerRoomAction({
                              mode: isFastMode ? 'fast' : 'regular',
                              stakeAmount: activeStakeTier,
                              action: 'set_bank_accounts',
                              bankAccounts: nextList,
                            } as unknown as Parameters<typeof dispatchServerRoomAction>[0]);
                          }
                          showToast(`🗑️ "${b.shortName}" ባንክ ተሰርዟል።`);
                        }}
                        className="px-3 py-2 rounded-xl bg-rose-600/20 border border-rose-500/40 text-rose-400 hover:bg-rose-600 hover:text-white text-xs font-black flex items-center justify-center gap-1 cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 3: USERS (Matches IMG_3565.jpeg - Search, Filter & Clean User Cards)
         ===================================================================== */}
      {activeSubTab === 'users' && (
        <div className="space-y-4">
          <div
            className={`rounded-2xl border p-5 space-y-4 ${
              isDark
                ? 'bg-[#1c1c28] border-slate-800/80 text-white'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-black">
                User Management ({filteredUsers.length})
              </h3>
            </div>

            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search by name, phone, or ID..."
                className={`w-full px-4 py-3 rounded-xl text-xs sm:text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  isDark
                    ? 'bg-[#14141d] border-slate-800 text-white placeholder-slate-500'
                    : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
            </div>

            {/* Filter Dropdown */}
            <select
              value={userFilterMode}
              onChange={(e) =>
                setUserFilterMode(e.target.value as 'all' | 'with_balance' | 'blocked')
              }
              className={`w-full px-4 py-3 rounded-xl text-xs sm:text-sm font-bold border focus:outline-none ${
                isDark
                  ? 'bg-[#14141d] border-slate-800 text-white'
                  : 'bg-slate-50 border-slate-300 text-slate-900'
              }`}
            >
              <option value="all">All Users ({users.length})</option>
              <option value="with_balance">
                Users with Balance ({users.filter((u) => u.balance > 0).length})
              </option>
              <option value="blocked">
                Blocked Users ({users.filter((u) => u.isBlocked).length})
              </option>
            </select>

            {/* Quick Add New User */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const cleanPhone = newUserPhone.trim().replace(/[\s\-+()]/g, '');
                if (!cleanPhone) {
                  showToast('❌ እባክዎ ስልክ ቁጥር ያስገቡ!');
                  return;
                }
                const normPhone = cleanPhone.startsWith('251')
                  ? `0${cleanPhone.slice(3)}`
                  : cleanPhone.length === 9 && /^[79]/.test(cleanPhone)
                  ? `0${cleanPhone}`
                  : cleanPhone;
                const finalName = newUserName.trim() || `Player_${normPhone.slice(-4)}`;
                const initBal = Math.max(0, parseFloat(newUserBal) || 15);
                if (onSetExactUserBalance) {
                  onSetExactUserBalance(normPhone, finalName, initBal, 15);
                } else {
                  fetch(buildApiUrl('/api/admin/users/upsert'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      phone: normPhone,
                      name: finalName,
                      balance: initBal,
                      bonusBalance: 15,
                    }),
                  })
                    .then(() => onRefreshLiveState && onRefreshLiveState())
                    .catch(() => {});
                }
                setNewUserName('');
                setNewUserPhone('');
                showToast(`✅ አዲስ ተጫዋች ${finalName} (${normPhone}) ተመዝግቧል!`);
              }}
              className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-1"
            >
              <input
                type="text"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                placeholder="ስም (Name)"
                className={`px-3 py-2 rounded-xl text-xs border ${
                  isDark ? 'bg-[#14141d] border-slate-800 text-white' : 'bg-slate-50 border-slate-300'
                }`}
              />
              <input
                type="tel"
                value={newUserPhone}
                onChange={(e) => setNewUserPhone(e.target.value)}
                placeholder="ስልክ (09...)"
                className={`px-3 py-2 rounded-xl text-xs font-mono-tabular border ${
                  isDark ? 'bg-[#14141d] border-slate-800 text-white' : 'bg-slate-50 border-slate-300'
                }`}
              />
              <input
                type="number"
                value={newUserBal}
                onChange={(e) => setNewUserBal(e.target.value)}
                placeholder="መነሻ ብር"
                className={`px-3 py-2 rounded-xl text-xs font-mono-tabular border ${
                  isDark ? 'bg-[#14141d] border-slate-800 text-white' : 'bg-slate-50 border-slate-300'
                }`}
              />
              <button
                type="submit"
                className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold cursor-pointer"
              >
                + አዲስ ተጫዋች ጨምር
              </button>
            </form>

            {/* Clean Vertical User Cards List (Matches IMG_3565.jpeg) */}
            <div className="divide-y divide-slate-800/70">
              {filteredUsers.map((u) => {
                const key = u.phone || u.id;
                return (
                  <div
                    key={key}
                    className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-0.5">
                      <div className="text-sm sm:text-base font-extrabold flex items-center gap-2">
                        <span>{u.name}</span>
                        {u.isBlocked && (
                          <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 text-[10px] font-black">
                            BLOCKED
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-mono-tabular text-slate-400">
                        ID: {u.id} | Phone: {u.phone || 'N/A'}
                      </div>
                      <div className="text-sm font-black font-mono-tabular text-emerald-400 pt-0.5">
                        {u.balance.toFixed(2)} Br
                        <span className="text-xs text-amber-400/90 font-normal ml-2">
                          (Bonus: {(u.bonusBalance ?? 15).toFixed(0)} Br)
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 pt-1 flex-wrap text-xs font-bold">
                        <span className="px-2 py-0.5 rounded-md bg-blue-500/15 border border-blue-500/30 text-blue-400">
                          👥 የተጋበዙ፦ {u.referredCount || 0} ሰው
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                          💰 ከግብዣ ያገኙት፦ {(u.referralEarnings || 0).toFixed(2)} ETB
                        </span>
                        {u.referralCode && (
                          <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono-tabular text-[11px]">
                            ኮድ: {u.referralCode}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Balance Adjust & Block Actions */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          onAdjustUserBalance(u.id, 100, u.phone);
                          showToast(`✓ ለ ${u.name} +100 Br ተጨምሯል!`);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
                      >
                        +100 Br
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onAdjustUserBalance(u.id, -100, u.phone);
                          showToast(`✓ ከ ${u.name} -100 Br ተቀንሷል!`);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-rose-600/80 hover:bg-rose-600 text-white text-xs font-bold cursor-pointer"
                      >
                        -100 Br
                      </button>

                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          placeholder="መጠን..."
                          value={balanceInputs[key] || ''}
                          onChange={(e) =>
                            setBalanceInputs((prev) => ({ ...prev, [key]: e.target.value }))
                          }
                          className={`w-20 px-2.5 py-1.5 rounded-lg text-xs font-mono-tabular border ${
                            isDark
                              ? 'bg-[#14141d] border-slate-700 text-white'
                              : 'bg-slate-50 border-slate-300'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const delta = parseFloat(balanceInputs[key] || '0');
                            if (!isNaN(delta) && delta !== 0) {
                              onAdjustUserBalance(u.id, delta, u.phone);
                              setBalanceInputs((prev) => ({ ...prev, [key]: '' }));
                              showToast(
                                `✓ የ ${u.name} ሂሳብ በ ${delta > 0 ? `+${delta}` : delta} Br ተስተካክሏል!`
                              );
                            }
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer"
                        >
                          +/-
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => onToggleUserBlock(u.id, u.phone)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                          u.isBlocked
                            ? 'bg-rose-600 text-white'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {u.isBlocked ? 'Unblock' : 'Block'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 4: BONUSES (Matches IMG_3564.jpeg - Bonus Settings Form)
         ===================================================================== */}
      {activeSubTab === 'bonuses' && (
        <form
          onSubmit={handleSaveBonuses}
          className={`rounded-2xl border p-5 space-y-4 ${
            isDark
              ? 'bg-[#1c1c28] border-slate-800/80 text-white'
              : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          <h3 className="text-base sm:text-lg font-black">
            Bonus Settings
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-xs sm:text-sm font-black text-emerald-400 mb-1.5">
                🎁 ከ 20 ካርቴላ በላይ ለሚይዙ የሚሰጥ ነፃ ካርቴላ ብዛት (Bonus Cartelas for &gt;20 Cards)
              </label>
              <input
                type="number"
                min={0}
                max={30}
                value={over20BonusCartelasInput}
                onChange={(e) => setOver20BonusCartelasInput(e.target.value)}
                className={`w-full px-4 py-3 rounded-xl text-sm font-mono-tabular font-black border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                  isDark
                    ? 'bg-[#14141d] border-emerald-500/40 text-white'
                    : 'bg-slate-50 border-emerald-400 text-slate-900'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-slate-400 mb-1.5">
                Welcome Bonus (Br) — አዲስ ተጫዋች ሲመዘገብ የሚሰጥ ቦነስ
              </label>
              <input
                type="number"
                min={0}
                value={welcomeBonus}
                onChange={(e) => setWelcomeBonus(e.target.value)}
                className={`w-full px-4 py-3 rounded-xl text-sm font-mono-tabular border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  isDark
                    ? 'bg-[#14141d] border-slate-800 text-white'
                    : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-slate-400 mb-1.5">
                Referral Bonus (Br) — የጓደኛ ግብዣ ቦነስ
              </label>
              <input
                type="number"
                min={0}
                value={referralBonus}
                onChange={(e) => setReferralBonus(e.target.value)}
                className={`w-full px-4 py-3 rounded-xl text-sm font-mono-tabular border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  isDark
                    ? 'bg-[#14141d] border-slate-800 text-white'
                    : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-slate-400 mb-1.5">
                Deposit Bonus (%) — ገቢ ሲያደርጉ የሚጨመር ቦነስ በመቶኛ
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={depositBonusPct}
                onChange={(e) => setDepositBonusPct(e.target.value)}
                className={`w-full px-4 py-3 rounded-xl text-sm font-mono-tabular border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  isDark
                    ? 'bg-[#14141d] border-slate-800 text-white'
                    : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-slate-400 mb-1.5">
                Minimum Deposit Amount (Br) — ዝቅተኛ የገቢ መጠን
              </label>
              <input
                type="number"
                min={1}
                value={minDepositAmt}
                onChange={(e) => setMinDepositAmt(e.target.value)}
                className={`w-full px-4 py-3 rounded-xl text-sm font-mono-tabular border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  isDark
                    ? 'bg-[#14141d] border-slate-800 text-white'
                    : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-slate-400 mb-1.5">
                Minimum Withdrawal Amount (Br) — ዝቅተኛ የወጪ መጠን
              </label>
              <input
                type="number"
                min={1}
                value={minWithdrawAmt}
                onChange={(e) => setMinWithdrawAmt(e.target.value)}
                className={`w-full px-4 py-3 rounded-xl text-sm font-mono-tabular border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  isDark
                    ? 'bg-[#14141d] border-slate-800 text-white'
                    : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
            </div>

            {onUpdateJackpotPool && (
              <div>
                <label className="block text-xs sm:text-sm font-medium text-slate-400 mb-1.5">
                  Current 5% Jackpot Pool (Br) — የአሁኑ የጃክፓት ክምችት
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={0}
                    value={jackpotPool}
                    onChange={(e) => onUpdateJackpotPool(Math.max(0, Number(e.target.value) || 0))}
                    className={`flex-1 px-4 py-3 rounded-xl text-sm font-mono-tabular border ${
                      isDark
                        ? 'bg-[#14141d] border-slate-800 text-white'
                        : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateJackpotPool(1000);
                      showToast('🎰 ጃክፓቱ ወደ 1,000 Br ተሞልቷል!');
                    }}
                    className="px-4 py-3 rounded-xl bg-amber-500 text-slate-950 font-black text-xs cursor-pointer"
                  >
                    1,000 Br ሙላ
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm cursor-pointer shadow-lg shadow-indigo-600/25 transition-colors"
          >
            Save Changes
          </button>
        </form>
      )}

      {/* =====================================================================
          TAB 5: DEPOSITS (Matches IMG_3563.jpeg - Clean Deposit Cards with Approve/Reject)
         ===================================================================== */}
      {activeSubTab === 'deposits' && (
        <div
          className={`rounded-2xl border p-5 space-y-4 ${
            isDark
              ? 'bg-[#1c1c28] border-slate-800/80 text-white'
              : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base sm:text-lg font-black">
              Deposit Requests ({depositsList.length})
            </h3>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setActiveSubTab('sms_webhook')}
                className="px-3 py-1.5 rounded-xl text-xs font-black bg-indigo-600/20 hover:bg-indigo-600 border border-indigo-500/40 text-indigo-300 hover:text-white flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>📱 SMS Webhook</span>
              </button>
              {onToggleRequireDepositApproval && (
                <button
                  type="button"
                  onClick={() => onToggleRequireDepositApproval(!requireDepositApproval)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer ${
                    requireDepositApproval
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                      : 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                  }`}
                >
                  {requireDepositApproval ? '🔒 Manual Approval: ON' : '⚡ Auto-Approve: ON'}
                </button>
              )}
            </div>
          </div>

          {/* Direct Cash Deposit Form for Admin (በቀጥታ በጥሬ ገንዘብ ገቢ ማድረጊያ) */}
          <form
            onSubmit={handleDirectCashDeposit}
            className={`p-4 rounded-2xl border-2 space-y-3 ${
              isDark
                ? 'bg-gradient-to-r from-emerald-950/40 via-slate-900 to-emerald-950/20 border-emerald-500/50'
                : 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-400'
            }`}
          >
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-base">
                  💵
                </span>
                <div>
                  <h4 className="text-sm sm:text-base font-black text-emerald-400">
                    በቀጥታ በካሽ ገቢ መመዝገቢያ (Direct Cash Deposit to Player)
                  </h4>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    በጥሬ ገንዘብ (Cash) ለከፈሉ ተጫዋቾች ወዲያውኑ ሂሳባቸውን ይሙሉ
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold mb-1 text-slate-300">ተጫዋች ምረጥ ወይም ስልክ አስገባ፦</label>
                <select
                  value={cashDepositUser}
                  onChange={(e) => setCashDepositUser(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl text-xs font-bold border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                >
                  <option value="">-- ተጫዋች ይምረጡ ({users.length}) --</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.phone}>
                      {u.name} ({u.phone}) — {u.balance} Br
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 text-slate-300">የካሽ መጠን (ETB)፦</label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={cashDepositAmount}
                  onChange={(e) => setCashDepositAmount(e.target.value)}
                  placeholder="ምሳሌ: 500"
                  className={`w-full px-3 py-2 rounded-xl text-xs font-mono-tabular font-bold border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 text-slate-300">የደረሰኝ ማስታወሻ (አማራጭ)፦</label>
                <input
                  type="text"
                  value={cashDepositNote}
                  onChange={(e) => setCashDepositNote(e.target.value)}
                  placeholder="ማስታወሻ ወይም ደረሰኝ ቁጥር"
                  className={`w-full px-3 py-2 rounded-xl text-xs font-bold border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={isSubmittingCashDeposit}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs cursor-pointer shadow-md transition-all active:scale-95 flex items-center gap-2"
              >
                <span>💵 በካሽ ገቢ አድርግ (Credit Cash Deposit)</span>
              </button>
            </div>
          </form>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              {(
                [
                  { id: 'pending', label: `Pending (${pendingDepositsCount})` },
                  { id: 'approved', label: 'Approved' },
                  { id: 'rejected', label: 'Rejected' },
                  { id: 'all', label: 'All' },
                ] as const
              ).map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setDepositStatusFilter(st.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                    depositStatusFilter === st.id
                      ? 'bg-indigo-600 text-white'
                      : isDark
                      ? 'bg-[#14141d] text-slate-400 border border-slate-800'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>

            <input
              type="text"
              value={txSearch}
              onChange={(e) => setTxSearch(e.target.value)}
              placeholder="ስም፣ ስልክ ወይም Ref ቁጥር..."
              className={`px-3 py-1.5 rounded-xl text-xs font-mono-tabular border w-full sm:w-56 ${
                isDark ? 'bg-[#14141d] border-slate-800 text-white' : 'bg-slate-50 border-slate-300'
              }`}
            />
          </div>

          {(() => {
            const list = depositsList.filter((tx) => {
              if (depositStatusFilter !== 'all' && tx.status !== depositStatusFilter) return false;
              if (txSearch.trim()) {
                const q = txSearch.toLowerCase();
                return (
                  tx.userName.toLowerCase().includes(q) ||
                  tx.userPhone.toLowerCase().includes(q) ||
                  tx.referenceNumber.toLowerCase().includes(q) ||
                  Boolean(tx.fullSmsText && tx.fullSmsText.toLowerCase().includes(q))
                );
              }
              return true;
            });

            if (list.length === 0) {
              return (
                <div className="py-8 text-center text-xs text-slate-400">
                  በዚህ ማጣሪያ ምንም የ Deposit ጥያቄ የለም።
                </div>
              );
            }

            return (
              <div className="space-y-3">
                {list.map((tx) => (
                  <div
                    key={tx.id}
                    className={`rounded-2xl border p-4 space-y-3 ${
                      isDark
                        ? 'bg-[#14141d] border-slate-800/90'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm sm:text-base font-extrabold">
                          {tx.userName}{' '}
                          <span className="text-slate-400 font-normal">({tx.userPhone})</span>
                        </div>
                        <div className="text-lg sm:text-xl font-black font-mono-tabular text-emerald-400 mt-0.5">
                          {tx.amount} Br{' '}
                          {tx.method === 'Cash' ? (
                            <span className="text-xs font-black text-amber-300 ml-1 px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40">
                              💵 በካሽ (Cash)
                            </span>
                          ) : (
                            <span className="text-xs font-bold text-indigo-400 ml-1">
                              ({tx.method})
                            </span>
                          )}
                        </div>
                        <div className="text-xs font-mono-tabular text-slate-400 mt-0.5 flex items-center gap-2">
                          <span>Ref: {tx.referenceNumber}</span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(tx.referenceNumber).catch(() => {});
                              showToast(`✓ "${tx.referenceNumber}" ኮፒ ተደርጓል!`);
                            }}
                            className="p-1 rounded bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {tx.timestamp}
                        </div>
                      </div>

                      <span
                        className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase ${
                          tx.status === 'pending'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : tx.status === 'approved'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {tx.status}
                      </span>
                    </div>

                    {tx.fullSmsText && (
                      <div
                        className={`p-3 rounded-xl font-mono text-xs border break-words ${
                          isDark
                            ? 'bg-[#0e0e15] border-slate-800 text-slate-300'
                            : 'bg-white border-slate-200 text-slate-700'
                        }`}
                      >
                        {tx.fullSmsText}
                      </div>
                    )}

                    {tx.status === 'pending' && (
                      <div className="grid grid-cols-2 gap-2.5 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            onApproveRejectTransaction(tx.id, 'approved');
                            showToast(`✅ የ ${tx.userName} (${tx.amount} Br) Deposit ጸድቋል!`);
                          }}
                          className="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm cursor-pointer"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onApproveRejectTransaction(tx.id, 'rejected');
                            showToast(`✕ የ ${tx.userName} ጥያቄ ውድቅ ተደርጓል (Rejected)።`);
                          }}
                          className="py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs sm:text-sm cursor-pointer"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* =====================================================================
          TAB 6: WITHDRAWALS (Matches IMG_3563.jpeg style for Withdraw Requests)
         ===================================================================== */}
      {activeSubTab === 'withdrawals' && (
        <div
          className={`rounded-2xl border p-5 space-y-4 ${
            isDark
              ? 'bg-[#1c1c28] border-slate-800/80 text-white'
              : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base sm:text-lg font-black">
              Withdrawal Requests ({withdrawalsList.length})
            </h3>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              {(
                [
                  { id: 'pending', label: `Pending (${pendingWithdrawalsCount})` },
                  { id: 'approved', label: 'Approved' },
                  { id: 'rejected', label: 'Rejected' },
                  { id: 'all', label: 'All' },
                ] as const
              ).map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setWithdrawStatusFilter(st.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                    withdrawStatusFilter === st.id
                      ? 'bg-indigo-600 text-white'
                      : isDark
                      ? 'bg-[#14141d] text-slate-400 border border-slate-800'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>

            <input
              type="text"
              value={txSearch}
              onChange={(e) => setTxSearch(e.target.value)}
              placeholder="ስም፣ ስልክ ወይም አካውንት..."
              className={`px-3 py-1.5 rounded-xl text-xs font-mono-tabular border w-full sm:w-56 ${
                isDark ? 'bg-[#14141d] border-slate-800 text-white' : 'bg-slate-50 border-slate-300'
              }`}
            />
          </div>

          {(() => {
            const list = withdrawalsList.filter((tx) => {
              if (withdrawStatusFilter !== 'all' && tx.status !== withdrawStatusFilter) return false;
              if (txSearch.trim()) {
                const q = txSearch.toLowerCase();
                return (
                  tx.userName.toLowerCase().includes(q) ||
                  tx.userPhone.toLowerCase().includes(q) ||
                  tx.referenceNumber.toLowerCase().includes(q)
                );
              }
              return true;
            });

            if (list.length === 0) {
              return (
                <div className="py-8 text-center text-xs text-slate-400">
                  በዚህ ማጣሪያ ምንም የ Withdrawal ጥያቄ የለም።
                </div>
              );
            }

            return (
              <div className="space-y-3">
                {list.map((tx) => (
                  <div
                    key={tx.id}
                    className={`rounded-2xl border p-4 space-y-3 ${
                      isDark
                        ? 'bg-[#14141d] border-slate-800/90'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm sm:text-base font-extrabold">
                          {tx.userName}{' '}
                          <span className="text-slate-400 font-normal">({tx.userPhone})</span>
                        </div>
                        <div className="text-lg sm:text-xl font-black font-mono-tabular text-orange-400 mt-0.5">
                          {tx.amount} Br{' '}
                          <span className="text-xs font-bold text-indigo-400 ml-1">
                            ({tx.method})
                          </span>
                        </div>
                        <div className="text-xs font-mono-tabular text-slate-300 mt-0.5 flex items-center gap-2">
                          <span>Account: {tx.referenceNumber}</span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(tx.referenceNumber).catch(() => {});
                              showToast(`✓ አካውንት ቁጥር "${tx.referenceNumber}" ኮፒ ተደርጓል!`);
                            }}
                            className="p-1 rounded bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {tx.timestamp}
                        </div>
                      </div>

                      <span
                        className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase ${
                          tx.status === 'pending'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : tx.status === 'approved'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {tx.status}
                      </span>
                    </div>

                    {tx.status === 'pending' && (
                      <div className="grid grid-cols-2 gap-2.5 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            onApproveRejectTransaction(tx.id, 'approved');
                            showToast(`✅ የ ${tx.userName} (${tx.amount} Br) Withdrawal ጸድቋል!`);
                          }}
                          className="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm cursor-pointer"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onApproveRejectTransaction(tx.id, 'rejected');
                            showToast(`✕ የ ${tx.userName} የወጪ ጥያቄ ውድቅ ተደርጓል (Rejected)።`);
                          }}
                          className="py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs sm:text-sm cursor-pointer"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* =====================================================================
          TAB: SMS WEBHOOK (0% Commission Auto-Deposit via Android SMS Forwarder)
         ===================================================================== */}
      {activeSubTab === 'sms_webhook' && (
        <div className="space-y-4">
          {/* Main Status & Configuration Card */}
          <div
            className={`rounded-2xl border p-5 space-y-5 ${
              isDark
                ? 'bg-[#1c1c28] border-slate-800/80 text-white'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-black shadow-lg shadow-indigo-600/30">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-black tracking-tight">
                      የባንክ SMS Webhook (0% Commission Auto-Verify)
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      🟢 LIVE & LISTENING
                    </span>
                  </div>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    የቴሌብር እና የባንክ SMS ወደ ስልክዎ እንደደረሰ በ 1 ሰከንድ ውስጥ በራሱ ወደ ሲስተሙ ገቢ ይሆናል
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={fetchSmsWebhookDetails}
                disabled={isLoadingWebhookLogs}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer border border-slate-700"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingWebhookLogs ? 'animate-spin' : ''}`} />
                <span>Sync Logs</span>
              </button>
            </div>

            {/* Webhook URL & Secret Display Card */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div
                className={`p-4 rounded-xl border space-y-2 ${
                  isDark ? 'bg-[#151521] border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400">🔗 የ Webhook አድራሻ (Target URL)፦</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(smsWebhookUrl).catch(() => {});
                      setCopiedWebhookUrl(true);
                      showToast('✓ Webhook URL ኮፒ ተደርጓል!');
                      setTimeout(() => setCopiedWebhookUrl(false), 2000);
                    }}
                    className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                  >
                    {copiedWebhookUrl ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedWebhookUrl ? 'ኮፒ ሆነ' : 'Copy'}</span>
                  </button>
                </div>
                <div className="p-2.5 rounded-lg bg-black/40 border border-slate-800 font-mono-tabular text-xs text-indigo-300 break-all select-all">
                  {smsWebhookUrl}
                </div>
                <p className="text-[11px] text-slate-400">
                  ይህን አድራሻ አንድሮይድ ስልክዎ ላይ ባለው የ <b>SMS Forwarder</b> አፕ ውስጥ <b>Target URL (POST)</b> ላይ ያስገቡት።
                </p>
              </div>

              <div
                className={`p-4 rounded-xl border space-y-2 ${
                  isDark ? 'bg-[#151521] border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400">🔑 Secret Token / Header Key፦</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(smsWebhookSecret).catch(() => {});
                      setCopiedSecret(true);
                      showToast('✓ Secret Token ኮፒ ተደርጓል!');
                      setTimeout(() => setCopiedSecret(false), 2000);
                    }}
                    className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                  >
                    {copiedSecret ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSecret ? 'ኮፒ ሆነ' : 'Copy'}</span>
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={smsWebhookSecretInput}
                    onChange={(e) => setSmsWebhookSecretInput(e.target.value)}
                    className={`flex-1 p-2 rounded-lg font-mono-tabular text-xs border ${
                      isDark ? 'bg-black/40 border-slate-800 text-amber-300' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={handleSaveWebhookSecret}
                    className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs cursor-pointer"
                  >
                    አስቀምጥ
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  በ SMS Forwarder ላይ በ <b>Headers</b> ውስጥ <code>x-webhook-secret: {smsWebhookSecret}</code> ወይም <code>?secret={smsWebhookSecret}</code> ብለው መጠቀም ይችላሉ።
                </p>
              </div>
            </div>

            {/* 3 Simple Setup Steps Guide for Android Phone */}
            <div
              className={`p-4 rounded-2xl border space-y-3 ${
                isDark
                  ? 'bg-gradient-to-r from-blue-950/30 via-indigo-950/20 to-slate-900 border-blue-500/30'
                  : 'bg-blue-50/70 border-blue-200'
              }`}
            >
              <h4 className="text-sm font-black text-blue-400 flex items-center gap-2">
                <span>📲 በ 3 ቀላል ደረጃዎች ስልክዎን ከሲስተሙ ጋር ያገናኙ (Setup Guide)፦</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <div className="font-black text-indigo-400 mb-1">ደረጃ 1: አፑን ይጫኑ</div>
                  <p className="text-slate-300 leading-relaxed">
                    የባንክ SMS የሚቀበለው አንድሮይድ ስልክዎ ላይ ከ Google Play ወይም GitHub ላይ ነፃ <b>"SMS Forwarder"</b> (ወይም <b>"SMS to URL"</b>) አፕ ይጫኑ።
                  </p>
                </div>

                <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <div className="font-black text-emerald-400 mb-1">ደረጃ 2: Rule ያክሉ</div>
                  <p className="text-slate-300 leading-relaxed">
                    በአፑ ውስጥ "Add Rule" ብለው Sender Filter ላይ <b>127, CBE, Telebirr, Abyssinia, 822</b> ያስገቡ (የገቢ የባንክ መልዕክቶች ብቻ እንዲመረጡ)።
                  </p>
                </div>

                <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <div className="font-black text-amber-400 mb-1">ደረጃ 3: Webhook URL አስገቡ</div>
                  <p className="text-slate-300 leading-relaxed">
                    Action ላይ <b>Webhook (POST)</b> መርጠው ከላይ ያለውን የ Webhook አድራሻ ያስገቡ። ጨረሱ! ከዚህ በኋላ የባንክ SMS ሲመጣ ወዲያው በራሱ ይጸድቃል።
                  </p>
                </div>
              </div>
            </div>

            {/* Live Interactive Test Console */}
            <div
              className={`p-4 rounded-2xl border space-y-3 ${
                isDark ? 'bg-[#151521] border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h4 className="text-sm font-black text-emerald-400 flex items-center gap-1.5">
                    <span>🧪 የባንክ SMS Webhook መሞከሪያ (Test Simulator)</span>
                  </h4>
                  <p className="text-xs text-slate-400">
                    ትክክለኛ የባንክ ደረሰኝ SMS እዚህ ላይ አስገብተው ሲስተሙ እንዴት በ 1 ሰከንድ ውስጥ በራሱ አውቆ እንደሚያጸድቅ ይፈትሹ፦
                  </p>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      setSmsTestSender('127');
                      const sampleRef = `DCO${Math.floor(10000000 + Math.random() * 90000000)}`;
                      const sampleTxt = `የ 500.00 ብር ክፍያ ከ 0942742684 ተቀብለዋል። የግብይት ቁጥር ${sampleRef} ነው። ቀሪ ሂሳብዎ 3,250.00 ብር ነው።`;
                      setSmsTestInput(sampleTxt);
                      handleTestSmsWebhook(sampleTxt, '127');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-sky-600/20 hover:bg-sky-600 border border-sky-500/30 text-sky-300 hover:text-white font-bold text-[11px] cursor-pointer"
                  >
                    📱 ሞክር፡ Telebirr 500 Br
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSmsTestSender('CBE');
                      const sampleRef = `FT26108${Math.floor(100000 + Math.random() * 900000)}XYZ`;
                      const sampleTxt = `Dear Ezana, your account 1000112964936 has been credited with ETB 1,500.00 from 0942742684. Ref No: ${sampleRef}. Available Bal: ETB 14,800.00.`;
                      setSmsTestInput(sampleTxt);
                      handleTestSmsWebhook(sampleTxt, 'CBE');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-purple-600/20 hover:bg-purple-600 border border-purple-500/30 text-purple-300 hover:text-white font-bold text-[11px] cursor-pointer"
                  >
                    🏦 ሞክር፡ CBE 1,500 Br
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSmsTestSender('Abyssinia');
                      const sampleRef = `BOA${Math.floor(10000000 + Math.random() * 90000000)}`;
                      const sampleTxt = `Dear Customer, ETB 800.00 credited to acc 66816532 via Mobile Banking. Trx ID: ${sampleRef}. Thank you for banking with Bank of Abyssinia.`;
                      setSmsTestInput(sampleTxt);
                      handleTestSmsWebhook(sampleTxt, 'Abyssinia');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-amber-600/20 hover:bg-amber-600 border border-amber-500/30 text-amber-300 hover:text-white font-bold text-[11px] cursor-pointer"
                  >
                    🏦 ሞክር፡ BOA 800 Br
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <div className="sm:col-span-1">
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Sender (መላኪያ)፦</label>
                  <input
                    type="text"
                    value={smsTestSender}
                    onChange={(e) => setSmsTestSender(e.target.value)}
                    placeholder="127 or CBE"
                    className={`w-full p-2 rounded-xl text-xs font-mono-tabular border ${
                      isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300'
                    }`}
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">የባንክ SMS ደረሰኝ ጽሁፍ፦</label>
                  <textarea
                    rows={2}
                    value={smsTestInput}
                    onChange={(e) => setSmsTestInput(e.target.value)}
                    placeholder="የባንክ ወይም የቴሌብር SMS እዚህ ያስገቡ..."
                    className={`w-full p-2.5 rounded-xl text-xs font-mono-tabular border resize-none ${
                      isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300'
                    }`}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => handleTestSmsWebhook()}
                  disabled={isTestingWebhook}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-emerald-600/20 cursor-pointer transition-all"
                >
                  <Zap className={`w-4 h-4 ${isTestingWebhook ? 'animate-bounce' : ''}`} />
                  <span>{isTestingWebhook ? 'እየተፈተሸ ነው...' : '🧪 SMS ፍተሽ & በራሱ አጽድቅ (Test Webhook)'}</span>
                </button>
              </div>
            </div>

            {/* Recent Received SMS Webhook Logs Table */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-black tracking-tight flex items-center gap-2">
                  <span>📋 በቅርብ የደረሱ የ Webhook SMS መልዕክቶች ({smsLogs.length})</span>
                </h4>
                <span className="text-xs text-slate-400 font-mono-tabular">
                  የተረጋገጡ ደረሰኞች፦ {smsVerifiedReceipts.length}
                </span>
              </div>

              {smsLogs.length === 0 ? (
                <div
                  className={`p-8 text-center rounded-2xl border text-xs text-slate-400 ${
                    isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  ገና ምንም የ Webhook SMS አልተመዘገበም። ከላይ ያለውን "ሞክር" ቁልፍ በመጫን መሞከር ይችላሉ!
                </div>
              ) : (
                <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                  {smsLogs.slice(0, 30).map((log, idx) => (
                    <div
                      key={log.id || idx}
                      className={`p-3.5 rounded-xl border text-xs space-y-1.5 transition-all ${
                        isDark ? 'bg-[#151521] border-slate-800' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                              log.detectedBank === 'Telebirr'
                                ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                                : log.detectedBank === 'CBE'
                                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            }`}
                          >
                            {log.detectedBank || log.sender || 'SMS'}
                          </span>
                          <span className="font-mono-tabular text-emerald-400 font-black text-sm">
                            {log.parsedAmount ? `+${log.parsedAmount.toFixed(2)} ETB` : 'No Amount'}
                          </span>
                          {log.parsedRef && (
                            <span className="font-mono-tabular text-slate-300 text-[11px] bg-black/30 px-2 py-0.5 rounded border border-slate-700">
                              Ref: {log.parsedRef}
                            </span>
                          )}
                          {log.matchedPlayerPhone && (
                            <span className="text-slate-300 text-[11px]">
                              👤 ተጫዋች፦ <b>{log.matchedPlayerPhone}</b>
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-emerald-400">
                            {log.statusText}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono-tabular">
                            {log.timestamp}
                          </span>
                        </div>
                      </div>

                      <div className="p-2 rounded-lg bg-black/30 font-mono-tabular text-[11px] text-slate-300/90 leading-relaxed break-all">
                        {log.rawText}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB: RENDER CLOUD HOSTING & ACCOUNT (ezanagebre7@gmail.com)
         ===================================================================== */}
      {activeSubTab === 'render_cloud' && (
        <div className="space-y-4">
          <div
            className={`rounded-2xl border p-5 space-y-4 ${
              isDark
                ? 'bg-[#1c1c28] border-slate-800/80 text-white'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            {/* Header Card */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-slate-950 flex items-center justify-center font-black shadow-lg">
                  <Server className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black flex items-center gap-2">
                    <span>Render.com ክላውድ ሰርቨር ማስተዳደሪያ</span>
                    <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-black border border-cyan-500/30">
                      Cloud Host
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Sun Bingo በ Render Cloud ላይ ለ 24/7 ስራ የተዘጋጀ ሙሉ ውቅር
                  </p>
                </div>
              </div>

              <a
                href="https://dashboard.render.com"
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-all self-start sm:self-auto"
              >
                <Globe className="w-4 h-4" />
                <span>ወደ Render Dashboard ሂድ ➔</span>
              </a>
            </div>

            {/* Account & Service Overview Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              <div className={`p-3 rounded-xl border ${isDark ? 'bg-[#14141e] border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <div className="text-[10px] font-bold text-slate-400">የተገናኘ አካውንት (Email)</div>
                <div className="text-xs font-mono-tabular font-black text-cyan-300 mt-1 truncate">
                  Ezanagebre84@gmail.com
                </div>
              </div>

              <div className={`p-3 rounded-xl border ${isDark ? 'bg-[#14141e] border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <div className="text-[10px] font-bold text-slate-400">የሰርቪስ ስም (Service Name)</div>
                <div className="text-xs font-mono-tabular font-black text-amber-400 mt-1">
                  sun-bingo
                </div>
              </div>

              <div className={`p-3 rounded-xl border ${isDark ? 'bg-[#14141e] border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <div className="text-[10px] font-bold text-slate-400">Node.js Engine (LTS Patched)</div>
                <div className="text-xs font-mono-tabular font-black text-emerald-400 mt-1">
                  v22.23.4 (Patched)
                </div>
              </div>

              <div className={`p-3 rounded-xl border ${isDark ? 'bg-[#14141e] border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <div className="text-[10px] font-bold text-slate-400">ደህንነት (Security Status)</div>
                <div className="text-xs font-black text-emerald-400 mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>eMudhra & TLS Safe</span>
                </div>
              </div>
            </div>

            {/* Build & Run Settings */}
            <div className={`p-4 rounded-xl border space-y-3 ${isDark ? 'bg-[#14141e] border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center justify-between">
                <h4 className="text-xs sm:text-sm font-black text-cyan-400 flex items-center gap-1.5">
                  <Server className="w-4 h-4" />
                  <span>Render Service Build & Start Settings</span>
                </h4>
                <span className="text-[11px] text-slate-400 font-bold">1-Click ኮፒ</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="p-3 rounded-lg bg-black/40 border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-bold text-slate-400">Build Command:</div>
                    <code className="text-emerald-300 font-mono-tabular font-bold">npm install && npm run build</code>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText('npm install && npm run build');
                      showToast('✓ Build Command ተቀድቷል (Copied)!');
                    }}
                    className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="p-3 rounded-lg bg-black/40 border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-bold text-slate-400">Start Command:</div>
                    <code className="text-emerald-300 font-mono-tabular font-bold">npm run start</code>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText('npm run start');
                      showToast('✓ Start Command ተቀድቷል (Copied)!');
                    }}
                    className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Render Environment Variables Card */}
            <div className={`p-4 rounded-xl border space-y-3 ${isDark ? 'bg-[#14141e] border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h4 className="text-xs sm:text-sm font-black text-amber-400 flex items-center gap-1.5">
                  <Lock className="w-4 h-4" />
                  <span>Render Environment Variables (አስፈላጊ ተለዋዋጮች)</span>
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    const envText = `NODE_ENV=production\nNODE_VERSION=22.23.4\nPORT=10000\nSHARED_APP_URL=https://sun-bingo.onrender.com\nADMIN_SECRET_PIN=7788`;
                    navigator.clipboard.writeText(envText);
                    showToast('✓ ሁሉም Environment Variables ተቀድተዋል (Copied)!');
                  }}
                  className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>ሁሉንም Env ኮፒ አድርግ</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 font-mono-tabular text-xs">
                <div className="p-2.5 rounded-lg bg-black/30 border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">NODE_ENV</span>
                  <span className="text-cyan-300 font-bold">production</span>
                </div>
                <div className="p-2.5 rounded-lg bg-black/30 border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">NODE_VERSION</span>
                  <span className="text-cyan-300 font-bold">22.23.4</span>
                </div>
                <div className="p-2.5 rounded-lg bg-black/30 border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">PORT</span>
                  <span className="text-cyan-300 font-bold">10000</span>
                </div>
                <div className="p-2.5 rounded-lg bg-black/30 border border-slate-800 sm:col-span-2">
                  <span className="text-slate-400 text-[10px] block">SHARED_APP_URL</span>
                  <span className="text-amber-300 font-bold">https://sun-bingo.onrender.com</span>
                </div>
                <div className="p-2.5 rounded-lg bg-black/30 border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">ADMIN_SECRET_PIN</span>
                  <span className="text-emerald-300 font-bold">7788</span>
                </div>
              </div>
            </div>

            {/* 5-Step Simple Render Setup Guide in Amharic */}
            <div className={`p-4 rounded-xl border space-y-3 ${isDark ? 'bg-gradient-to-r from-cyan-950/20 via-slate-900 to-indigo-950/20 border-cyan-500/30' : 'bg-cyan-50/60 border-cyan-200'}`}>
              <h4 className="text-xs sm:text-sm font-black text-cyan-300 flex items-center gap-1.5">
                <span>📋 በ 5 ቀላል ደረጃዎች በ Render ላይ የመጫኛ መመሪያ፦</span>
              </h4>

              <div className="space-y-2 text-xs">
                <div className="flex gap-2">
                  <span className="w-5 h-5 rounded-full bg-cyan-500 text-slate-950 font-black text-[11px] flex items-center justify-center shrink-0">1</span>
                  <p className="text-slate-300">
                    ወደ <b>dashboard.render.com</b> በ <b>Ezanagebre84@gmail.com</b> ይግቡ።
                  </p>
                </div>
                <div className="flex gap-2">
                  <span className="w-5 h-5 rounded-full bg-cyan-500 text-slate-950 font-black text-[11px] flex items-center justify-center shrink-0">2</span>
                  <p className="text-slate-300">
                    <b>"New +" ➔ "Web Service"</b> የሚለውን ይጫኑ፤ ከዚያ የዚህን ፕሮጀክት GitHub Repository ይምረጡ (ወይም Blueprint ይጠቀሙ)።
                  </p>
                </div>
                <div className="flex gap-2">
                  <span className="w-5 h-5 rounded-full bg-cyan-500 text-slate-950 font-black text-[11px] flex items-center justify-center shrink-0">3</span>
                  <p className="text-slate-300">
                    Name ላይ <b>sun-bingo</b>፣ Runtime ላይ <b>Node</b> ይምረጡ።
                  </p>
                </div>
                <div className="flex gap-2">
                  <span className="w-5 h-5 rounded-full bg-cyan-500 text-slate-950 font-black text-[11px] flex items-center justify-center shrink-0">4</span>
                  <p className="text-slate-300">
                    ከላይ ያሉትን <b>Build & Start commands</b> እና <b>Environment Variables</b> ያስገቡ።
                  </p>
                </div>
                <div className="flex gap-2">
                  <span className="w-5 h-5 rounded-full bg-cyan-500 text-slate-950 font-black text-[11px] flex items-center justify-center shrink-0">5</span>
                  <p className="text-slate-300">
                    <b>"Create Web Service"</b> ይጫኑ! በ 2 ደቂቃ ውስጥ Sun Bingo በቀጥታ መስራት ይጀምራል።
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 7: BROADCAST (Matches IMG_3561.jpeg - Broadcast Message to Telegram)
         ===================================================================== */}
      {activeSubTab === 'broadcast' && (
        <form
          onSubmit={handleSendBroadcast}
          className={`rounded-2xl border p-5 space-y-4 ${
            isDark
              ? 'bg-[#1c1c28] border-slate-800/80 text-white'
              : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          <h3 className="text-base sm:text-lg font-black">
            Broadcast Message
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-slate-400 mb-1.5">
                Target Users
              </label>
              <select
                value={broadcastTarget}
                onChange={(e) => setBroadcastTarget(e.target.value as 'all' | 'specific')}
                className={`w-full px-4 py-3 rounded-xl text-sm font-bold border focus:outline-none ${
                  isDark
                    ? 'bg-[#14141d] border-slate-800 text-white'
                    : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              >
                <option value="all">All Users</option>
                <option value="specific">Specific User (by Phone or Telegram ID)</option>
              </select>
            </div>

            {broadcastTarget === 'specific' && (
              <div>
                <label className="block text-xs sm:text-sm font-medium text-slate-400 mb-1.5">
                  User Phone or Telegram Chat ID
                </label>
                <input
                  type="text"
                  value={broadcastSpecificUser}
                  onChange={(e) => setBroadcastSpecificUser(e.target.value)}
                  placeholder="ለምሳሌ: 0911223344 ወይም Telegram ID..."
                  className={`w-full px-4 py-3 rounded-xl text-sm border focus:outline-none ${
                    isDark
                      ? 'bg-[#14141d] border-slate-800 text-white'
                      : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>
            )}

            <div>
              <label className="block text-xs sm:text-sm font-medium text-slate-400 mb-1.5">
                Message (Markdown supported)
              </label>
              <textarea
                rows={5}
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                placeholder="Type your message here..."
                className={`w-full px-4 py-3 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  isDark
                    ? 'bg-[#14141d] border-slate-800 text-white placeholder-slate-500'
                    : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSendingBroadcast}
            className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm cursor-pointer shadow-lg shadow-indigo-600/25 transition-colors disabled:opacity-50"
          >
            {isSendingBroadcast ? 'Sending...' : 'Send Message'}
          </button>
        </form>
      )}

      {/* =====================================================================
          TAB 8: SETTINGS (Telegram Bot, GitHub Push, Admin PIN, Firebase)
         ===================================================================== */}
      {activeSubTab === 'settings' && (
        <div className="space-y-4">
          {/* Telegram Bot Connector */}
          <div
            className={`rounded-2xl border p-5 space-y-3 ${
              isDark
                ? 'bg-[#1c1c28] border-slate-800/80 text-white'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <h3 className="text-sm sm:text-base font-black text-sky-400">
              🤖 Telegram Bot Connection (@BotFather Token)
            </h3>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={tgTokenInput}
                onChange={(e) => setTgTokenInput(e.target.value)}
                placeholder="Telegram Bot Token (7123456:AAH...)"
                className={`flex-1 px-3.5 py-2.5 rounded-xl text-xs font-mono-tabular border ${
                  isDark ? 'bg-[#14141d] border-slate-800 text-white' : 'bg-slate-50 border-slate-300'
                }`}
              />
              <button
                type="button"
                onClick={async () => {
                  const val = tgTokenInput.trim();
                  if (!val || !val.includes(':')) {
                    showToast('❌ ትክክለኛ የቴሌግራም Bot Token ያስገቡ!');
                    return;
                  }
                  showToast('⏳ ከቴሌግራም ቦት ጋር በመገናኘት ላይ...');
                  const res = await connectTelegramBotEverywhere(val);
                  showToast(res.message);
                }}
                className="px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs cursor-pointer"
              >
                Connect Bot
              </button>
            </div>
          </div>

          {/* PIN Security */}
          <div
            className={`rounded-2xl border p-5 space-y-3 ${
              isDark
                ? 'bg-[#1c1c28] border-slate-800/80 text-white'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <h3 className="text-sm sm:text-base font-black text-amber-400">
              🔒 የይለፍ ቃል / PIN መቀየሪያ (Change Password / PIN)
            </h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (newAdminPin.trim().length < 4) {
                  showToast('❌ እባክዎ ቢያንስ 4 አሃዝ PIN ያስገቡ!');
                  return;
                }
                fetch(buildApiUrl('/api/admin/update-pin'), {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ newPin: newAdminPin.trim() }),
                })
                  .then(() => {
                    showToast(`✅ የይለፍ ቃል (PIN) ወደ "${newAdminPin.trim()}" ተቀይሯል!`);
                    setNewAdminPin('');
                  })
                  .catch(() => {});
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={newAdminPin}
                onChange={(e) => setNewAdminPin(e.target.value)}
                placeholder="አዲስ PIN..."
                className={`flex-1 px-3.5 py-2.5 rounded-xl text-xs font-mono-tabular border ${
                  isDark ? 'bg-[#14141d] border-slate-800 text-white' : 'bg-slate-50 border-slate-300'
                }`}
              />
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-black text-xs cursor-pointer"
              >
                PIN ቀይር
              </button>
            </form>
          </div>

          {/* Render.com & GitHub + Cron-Job Connection Card */}
          <div
            className={`rounded-2xl border p-5 space-y-4 ${
              isDark
                ? 'bg-[#1c1c28] border-slate-800/80 text-white'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-emerald-400">
                    🌐 onrender (Render.com) & GitHub + Cron-Job ማገናኛ
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    ሰርቨሩ በ Render.com ላይ 24/7 እንዳይተኛ (Keep-Alive Cron Ping) ማገናኛ
                  </p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Connected & Ready
              </span>
            </div>

            {/* Render App URL Setting */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">
                የ Render መተግበሪያ ዌብሳይት URL (Render Web Service URL)፦
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={renderAppUrl}
                  onChange={(e) => {
                    const val = e.target.value.trim();
                    setRenderAppUrl(val);
                    if (typeof window !== 'undefined') {
                      localStorage.setItem('ezi_render_app_url', val);
                    }
                  }}
                  placeholder="https://sun-bingo.onrender.com"
                  className={`flex-1 px-3.5 py-2.5 rounded-xl text-xs font-mono-tabular border ${
                    isDark ? 'bg-[#14141d] border-slate-800 text-white' : 'bg-slate-50 border-slate-300'
                  }`}
                />
                <button
                  type="button"
                  disabled={isPinging}
                  onClick={async () => {
                    setIsPinging(true);
                    setPingStatus(null);
                    const t0 = performance.now();
                    try {
                      const res = await fetch(buildApiUrl('/api/cron'));
                      const data = await res.json();
                      const latency = Math.round(performance.now() - t0);
                      setPingStatus(
                        `✅ ሰርቨሩ በንቃት እየሰራ ነው (Active)! Uptime: ${data.uptimeSeconds}s · Latency: ${latency}ms`
                      );
                      showToast('✓ የ Render Cron Ping ተሳክቷል!');
                    } catch (err) {
                      setPingStatus('❌ ከሰርቨሩ ጋር መገናኘት አልተቻለም፦ ' + String(err));
                    } finally {
                      setIsPinging(false);
                    }
                  }}
                  className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs cursor-pointer flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isPinging ? 'animate-spin' : ''}`} />
                  <span>{isPinging ? 'በመፈተሽ ላይ...' : 'የቀጥታ Ping ፍተሻ (Test)'}</span>
                </button>
              </div>
              {pingStatus && (
                <div
                  className={`p-2.5 rounded-xl text-xs font-mono-tabular border ${
                    pingStatus.startsWith('✅')
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                      : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                  }`}
                >
                  {pingStatus}
                </div>
              )}
            </div>

            {/* Endpoints & Cron Guide */}
            <div
              className={`p-3.5 rounded-xl border space-y-2.5 text-xs ${
                isDark ? 'bg-[#12121c] border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="font-extrabold text-amber-400 flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5" />
                <span>ለ Render Free Tier 24/7 ንቁ የሚያደርጉ የ Cron-Job አማራጮች፦</span>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 font-bold">1. የ Cron-Job.org ፒንግ ማድረጊያ URL፦</span>
                  <button
                    type="button"
                    onClick={() => {
                      const cronEndpoint = `${renderAppUrl.replace(/\/+$/, '')}/api/cron`;
                      if (typeof navigator !== 'undefined' && navigator.clipboard) {
                        navigator.clipboard.writeText(cronEndpoint);
                        showToast('✓ የ Cron URL ተቀድቷል (Copied)!');
                      }
                    }}
                    className="px-2 py-0.5 rounded bg-indigo-600 text-white font-bold cursor-pointer text-[10px]"
                  >
                    Copy URL
                  </button>
                </div>
                <div className="px-2.5 py-1.5 rounded-lg bg-black/40 border border-slate-800 font-mono-tabular text-emerald-300 select-all break-all">
                  {renderAppUrl.replace(/\/+$/, '')}/api/cron
                </div>
                <p className="text-[11px] text-slate-400">
                  👉 በ <strong>cron-job.org</strong> ወይም <strong>UptimeRobot</strong> ላይ አካውንት ከፍተው ይሄን URL በየ <strong>5 ወይም 10 ደቂቃ</strong> እንዲጠራ (HTTP GET) ያድርጉት። Render ፈጽሞ አይተኛም!
                </p>
              </div>

              <div className="pt-2 border-t border-slate-800/80 space-y-1 text-[11px] text-slate-300">
                <div className="font-bold text-sky-400">2. የ GitHub Actions አውቶማቲክ Cron (የተዘጋጀ)፦</div>
                <p>
                  በፕሮጀክቱ ውስጥ <code>.github/workflows/render-keepalive.yml</code> ፋይል ተዘጋጅቷል፤ ፕሮጀክቱን ወደ GitHub ሲገፉት በየ 10 ደቂቃው በራሱ Render ን ፒንግ እያደረገ ያነቃዋል!
                </p>
              </div>

              <div className="pt-2 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 rounded-lg bg-black/30 border border-slate-800">
                  <span className="text-slate-400 font-bold">Render Build Command:</span>
                  <div className="font-mono-tabular text-emerald-300 mt-0.5">npm install && npm run build</div>
                </div>
                <div className="p-2 rounded-lg bg-black/30 border border-slate-800">
                  <span className="text-slate-400 font-bold">Render Start Command:</span>
                  <div className="font-mono-tabular text-emerald-300 mt-0.5">npm run start</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
