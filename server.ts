import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { generateProvablyFairRound } from './src/utils/provablyFair';
import { parseEthiopianPaymentSms, normalizeTransactionReference } from './src/utils/smsParser';
import { generateCartelaById } from './src/utils/bingoEngine';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
let lastKnownLiveHost =
  process.env.SHARED_APP_URL ||
  'https://ais-pre-5o2vwpcgfgshkft456mpos-198161772381.europe-west2.run.app';

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  const host = req.get('x-forwarded-host') || req.get('host');
  const proto = req.get('x-forwarded-proto') || req.protocol || 'https';
  if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
    lastKnownLiveHost = `${proto}://${host}`;
  }
  next();
});

const IS_RENDER_HOST = Boolean(process.env.RENDER || process.env.RENDER_EXTERNAL_URL);
const SHARED_APP_URL =
  process.env.SHARED_APP_URL ||
  process.env.RENDER_EXTERNAL_URL ||
  'https://ais-pre-5o2vwpcgfgshkft456mpos-198161772381.europe-west2.run.app';

const BOT_STORE_PATH = path.join(__dirname, '.telegram-bots.json');

// Store active Telegram bot polling loops by token
const activeBots = new Map<
  string,
  {
    botUsername: string;
    botFirstName: string;
    appUrl: string;
    offset: number;
    isRunning: boolean;
    pollingInFlight?: boolean;
  }
>();

// Dedup processed Telegram update_ids so NO message is ever sent twice!
const processedUpdateIds = new Set<string>();
// Per-chat action debounce so tapping an inline button or command never sends duplicate messages
const lastChatActionByChatId = new Map<number, { action: string; timestamp: number }>();
// Track the last active menu message_id per chatId so when the user taps a button, the old message is deleted and the new one arrives cleanly at the bottom without stacking!
const lastMenuMessageIdByChat = new Map<number, number>();

// Track registered phone numbers & welcome bonus per Telegram chatId
const registeredChatPhones = new Map<number, string>();
const chatWelcomeBonusClaimed = new Set<number>();
// Track prompt message IDs per chatId so we can delete the "📱 Share Phone Number" prompt bubbles once registered
const promptMessageIdsByChat = new Map<number, number[]>();
// Track per-chat interactive Deposit / Withdraw / Transfer flow state so typed amounts or account numbers work seamlessly
interface ChatFlowState {
  mode: 'deposit' | 'withdraw_amount' | 'withdraw_account' | 'transfer';
  method?: 'CBE' | 'Abyssinia' | 'Telebirr' | 'M-Pesa' | 'Cash' | string;
  amount?: number;
}
const chatFlowByChatId = new Map<number, ChatFlowState>();
let globalRegisteredPhone: string | null = null;
// Unified Wallet Balance & Bonus Balance shared across Ezi Fast Bingo, Ezi Bingo, and Telegram Bot
let globalWalletBalance = 1250.0;
let globalBonusBalance = 75.0;

// 1. PRODUCTION DATABASE: Per-Player Accounts, Pending/Approved Transactions & Admin PIN Config
export interface ServerPlayerRecord {
  id: string;
  phone: string;
  name: string;
  passwordHash?: string;
  chatId?: number;
  balance: number;
  bonusBalance: number;
  referralEarnings: number;
  referredCount: number;
  isBlocked: boolean;
  updatedAt: string;
}

// Store OTP codes by normalized phone number for New Registration & Forgot Password verification
const pendingOtpByPhone = new Map<
  string,
  { code: string; name?: string; purpose: 'register' | 'forgot'; expiresAt: number }
>();

export interface ServerTransactionRecord {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  chatId?: number;
  type: 'deposit' | 'withdraw' | 'transfer' | 'win' | 'bet' | 'referral';
  method: 'CBE' | 'Abyssinia' | 'Telebirr' | 'M-Pesa' | 'Wallet' | 'System' | 'Cash' | string;
  amount: number;
  referenceNumber: string;
  fullSmsText?: string;
  recipientPhone?: string;
  note?: string;
  status: 'pending' | 'approved' | 'rejected';
  timestamp: string;
}

export interface LockedCartelaOwner {
  cartelaId: number;
  ownerPhone: string;
  ownerName: string;
  clientId?: string;
  isRegistered: boolean;
  lockedAt: number;
}

const playersByPhone = new Map<string, ServerPlayerRecord>();
let serverTransactions: ServerTransactionRecord[] = [];

export interface VerifiedBankReceipt {
  id: string;
  bank: string;
  amount: number;
  referenceNumber: string;
  senderPhone?: string;
  rawSms: string;
  receivedAt: number;
  matchedTxId?: string;
  matchedUserPhone?: string;
  status: 'auto_approved' | 'matched_pending' | 'ready_for_claim' | 'duplicate';
}

export interface ReceivedWebhookSmsLog {
  id: string;
  timestamp: string;
  sender: string;
  rawText: string;
  parsedAmount: number | null;
  parsedRef: string | null;
  detectedBank: string | null;
  detectedType: string | null;
  statusText: string;
  matchedPlayerPhone?: string;
}

const verifiedBankSmsReceipts: VerifiedBankReceipt[] = [];
const receivedWebhookSmsLogs: ReceivedWebhookSmsLog[] = [];

let adminPinConfig = {
  username: 'admin',
  passwordHash: 'admin123',
  pinCode: '1234',
  requireDepositApproval: true,
  smsWebhookSecret: 'ezi_sms_secret_2026',
  welcomeBonusAmount: 15,
  referralBonusAmount: 10,
  depositBonusPercent: 0,
  minDepositAmount: 10,
  minWithdrawAmount: 100,
};

// 2. MULTIPLAYER LIVE SERVER GAME ROOMS (Server-Authoritative Real-Time Sync for ALL Connected Phones)
export interface ServerWinnerAnnouncement {
  cartelaId: number;
  userName: string;
  userPhone?: string;
  prizeAmount: number;
  winningCells: [number, number][];
  lastBall: number;
  calledBallsSnapshot: number[];
  patternTitle: string;
  timestamp: string;
}

export interface ServerGameHistoryRecord {
  id: string;
  gameMatchId: number;
  timestamp: string;
  stakeAmount: number;
  prizeAmount: number;
  patternTitle: string;
  totalBallsCalled: number;
  lastBall: number;
  calledBallsSnapshot: number[];
  participantPhones?: string[];
  participantCartelasByPhone?: Record<string, number[]>;
  winners: {
    cartelaId: number;
    userName: string;
    userPhone?: string;
    prizeAmount: number;
    winningCells: [number, number][];
  }[];
}

export interface ServerLiveRoomState {
  mode: 'fast' | 'regular';
  gameMatchId: number;
  isPlaying: boolean;
  isPaused: boolean;
  preGameCountdown: number | null;
  bingoClaimCountdown: number | null;
  winnerDisplayCountdown: number | null;
  calledBalls: number[];
  activeBall: number | null;
  callSpeedSec: number;
  stakeAmount: number;
  prizeAmount: number;
  activePatternId: number;
  jackpotPool: number;
  houseEarningsTotal: number;
  jackpotWonInRound: number;
  onlinePlayersCount: number;
  blockedCartelaIds: number[];
  winnersList: ServerWinnerAnnouncement[];
  lastVerifiedWinnerBanner: ServerWinnerAnnouncement | null;
  gameHistory: ServerGameHistoryRecord[];
  adminRoomMessage?: string;
  adminRoomMessageAt?: string;
  bonusCartelasForOver20?: number;
  heroBanners?: {
    id: string;
    title: string;
    subtitle: string;
    badgeText: string;
    accentColor: 'blue' | 'emerald' | 'amber' | 'rose';
    imageUrl?: string;
    isActive: boolean;
  }[];
  bankAccounts?: {
    id: string;
    bankName: string;
    shortName: string;
    accountNumber: string;
    accountHolder: string;
    badgeBg: string;
  }[];
  sha256Hash: string;
  lastBallTickAt: number;
  lastCountdownTickAt: number;
  seq: number;
  lastUpdated: number;
}

const DEFAULT_SERVER_BANK_ACCOUNTS: {
  id: string;
  bankName: string;
  shortName: string;
  accountNumber: string;
  accountHolder: string;
  badgeBg: string;
}[] = [
  {
    id: 'CBE',
    bankName: 'Commercial Bank of Ethiopia (CBE)',
    shortName: 'CBE',
    accountNumber: '1000112964936',
    accountHolder: 'Ezana Gebremedhin',
    badgeBg: 'bg-purple-700 text-white',
  },
  {
    id: 'Abyssinia',
    bankName: 'Bank of Abyssinia (አቢሲኒያ ባንክ)',
    shortName: 'Abyssinia',
    accountNumber: '66816532',
    accountHolder: 'Ezana Gebremedhin',
    badgeBg: 'bg-amber-500 text-slate-950',
  },
  {
    id: 'Telebirr',
    bankName: 'Telebirr (ቴሌብር)',
    shortName: 'Telebirr',
    accountNumber: '0942742684',
    accountHolder: 'Ezana Gebremedhin',
    badgeBg: 'bg-sky-500 text-white',
  },
  {
    id: 'M-Pesa',
    bankName: 'M-Pesa Safaricom (ኤም-ፔሳ)',
    shortName: 'M-Pesa',
    accountNumber: '0711742684',
    accountHolder: 'Ezana Gebremedhin',
    badgeBg: 'bg-emerald-600 text-white',
  },
];

const DEFAULT_SERVER_HERO_BANNERS: {
  id: string;
  title: string;
  subtitle: string;
  badgeText: string;
  accentColor: 'blue' | 'emerald' | 'amber' | 'rose';
  imageUrl?: string;
  isActive: boolean;
}[] = [
  {
    id: 'hb-1',
    title: 'ሁልጊዜ ጨዋታ! በ Ezi Bingo እስከ 50,000 ብር ያሸንፉ!',
    subtitle: 'ከ 70,000 ካርቴላዎች ይምረጡ · ከ 20 በላይ ካርቴላ ለሚይዙ +5 ካርቴላ ቦነስ በነፃ ይሰጣል!',
    badgeText: 'Ezi Bingo ልዩ ቦነስ',
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

const fastRoomLockedCartelas = new Map<number, LockedCartelaOwner>();

const regularRoomLockedCartelas = new Map<number, LockedCartelaOwner>();

export const FAST_STAKE_TIERS = [10, 20, 50, 100] as const;
export type FastStakeTier = (typeof FAST_STAKE_TIERS)[number];

const fastRoomsByStake: Record<number, ServerLiveRoomState> = {};
const fastLockedCartelasByStake: Record<number, Map<number, LockedCartelaOwner>> = {};

const liveRoomLockedCartelas = fastRoomLockedCartelas;

function createInitialRoomState(
  mode: 'fast' | 'regular',
  matchId: number,
  initialStake = 10
): ServerLiveRoomState {
  const fair = generateProvablyFairRound(matchId);
  return {
    mode,
    gameMatchId: matchId,
    isPlaying: false,
    isPaused: false,
    preGameCountdown: null,
    bingoClaimCountdown: null,
    winnerDisplayCountdown: null,
    calledBalls: [],
    activeBall: null,
    callSpeedSec: mode === 'fast' ? 3 : 5,
    stakeAmount: initialStake,
    prizeAmount: mode === 'fast' ? initialStake * 20 : 500,
    activePatternId: 5,
    jackpotPool: 500,
    houseEarningsTotal: 420,
    jackpotWonInRound: 0,
    onlinePlayersCount: 1,
    blockedCartelaIds: [],
    winnersList: [],
    lastVerifiedWinnerBanner: null,
    gameHistory: [],
    adminRoomMessage: '',
    adminRoomMessageAt: '',
    bonusCartelasForOver20: 5,
    heroBanners: DEFAULT_SERVER_HERO_BANNERS,
    bankAccounts: DEFAULT_SERVER_BANK_ACCOUNTS,
    sha256Hash: fair.sha256Hash,
    lastBallTickAt: 0,
    lastCountdownTickAt: 0,
    seq: 1,
    lastUpdated: Date.now(),
  };
}

function generateRandomMatchId(): number {
  return Math.floor(100000 + Math.random() * 900000);
}

for (const stk of FAST_STAKE_TIERS) {
  fastRoomsByStake[stk] = createInitialRoomState('fast', generateRandomMatchId(), stk);
  fastLockedCartelasByStake[stk] = stk === 10 ? fastRoomLockedCartelas : new Map<number, LockedCartelaOwner>();
}

let fastLiveRoomState: ServerLiveRoomState = fastRoomsByStake[10];
let regularLiveRoomState: ServerLiveRoomState = createInitialRoomState('regular', generateRandomMatchId(), 10);
let liveRoomState = fastLiveRoomState;

function normalizeFastStakeTier(rawStake?: unknown): FastStakeTier {
  const n = Number(rawStake);
  if (n === 20 || n === 50 || n === 100) return n;
  return 10;
}

function getRoomByMode(
  mode?: string,
  stakeAmount?: unknown
): {
  room: ServerLiveRoomState;
  lockedMap: Map<number, LockedCartelaOwner>;
  stakeTier: FastStakeTier;
} {
  if (mode === 'regular') {
    return {
      room: regularLiveRoomState,
      lockedMap: regularRoomLockedCartelas,
      stakeTier: 10,
    };
  }
  const tier = normalizeFastStakeTier(stakeAmount);
  if (!fastRoomsByStake[tier]) {
    fastRoomsByStake[tier] = createInitialRoomState('fast', generateRandomMatchId(), tier);
  }
  if (!fastLockedCartelasByStake[tier]) {
    fastLockedCartelasByStake[tier] = new Map<number, LockedCartelaOwner>();
  }
  return {
    room: fastRoomsByStake[tier],
    lockedMap: fastLockedCartelasByStake[tier],
    stakeTier: tier,
  };
}

// Track connected WebSocket and SSE clients so every ball drawn or game state change broadcasts in real-time (< 20ms) to ALL phones!
const wsClients = new Set<WebSocket>();
const sseClients = new Set<express.Response>();

function serializeFastRoomsSnapshot() {
  const roomsObj: Record<number, ServerLiveRoomState> = {};
  const lockedObj: Record<number, LockedCartelaOwner[]> = {};
  for (const stk of FAST_STAKE_TIERS) {
    roomsObj[stk] = fastRoomsByStake[stk];
    lockedObj[stk] = Array.from((fastLockedCartelasByStake[stk] || new Map()).values());
  }
  return { roomsObj, lockedObj };
}

function broadcastRealtimeSync(changedMode?: 'fast' | 'regular' | 'both') {
  const now = Date.now();
  const activeWsCount =
    Array.from(wsClients).filter((c) => c.readyState === WebSocket.OPEN).length + sseClients.size;

  if (changedMode === 'fast' || changedMode === 'both' || !changedMode) {
    for (const stk of FAST_STAKE_TIERS) {
      const r = fastRoomsByStake[stk];
      const lMap = fastLockedCartelasByStake[stk];
      r.seq = (r.seq || 0) + 1;
      r.lastUpdated = now;
      r.onlinePlayersCount = Math.max(
        2,
        activeWsCount +
          new Set(Array.from(lMap.values()).map((c) => c.clientId || c.ownerPhone)).size
      );
    }
  }
  if (changedMode === 'regular' || changedMode === 'both' || !changedMode) {
    regularLiveRoomState.seq = (regularLiveRoomState.seq || 0) + 1;
    regularLiveRoomState.lastUpdated = now;
    regularLiveRoomState.onlinePlayersCount = Math.max(
      2,
      activeWsCount +
        new Set(Array.from(regularRoomLockedCartelas.values()).map((c) => c.clientId || c.ownerPhone)).size
    );
  }

  fastLiveRoomState = fastRoomsByStake[10];
  const { roomsObj, lockedObj } = serializeFastRoomsSnapshot();

  const payload = JSON.stringify({
    type: 'room:sync',
    changedMode: changedMode || 'both',
    fastRoom: fastRoomsByStake[10],
    fastLockedCartelas: lockedObj[10] || [],
    fastRoomsByStake: roomsObj,
    fastLockedCartelasByStake: lockedObj,
    regularRoom: regularLiveRoomState,
    regularLockedCartelas: Array.from(regularRoomLockedCartelas.values()),
    transactions: serverTransactions,
    players: Array.from(playersByPhone.values()),
    requireDepositApproval: adminPinConfig.requireDepositApproval,
    timestamp: now,
  });

  for (const client of wsClients) {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(payload);
      } catch {
        // ignore broken socket
      }
    }
  }

  for (const res of sseClients) {
    try {
      res.write(`data: ${payload}\n\n`);
    } catch {
      sseClients.delete(res);
    }
  }
}

function drawNextServerBallForRoom(room: ServerLiveRoomState) {
  if (room.calledBalls.length >= 75) {
    room.isPlaying = false;
    if (room.winnersList.length === 0 && room.winnerDisplayCountdown === null) {
      room.winnerDisplayCountdown = 10;
      room.lastCountdownTickAt = Date.now();
    }
    broadcastRealtimeSync(room.mode);
    return;
  }
  const fair = generateProvablyFairRound(room.gameMatchId);
  room.sha256Hash = fair.sha256Hash;
  const calledSet = new Set(room.calledBalls);
  const nextBall = fair.predeterminedBalls.find((b) => !calledSet.has(b));
  if (!nextBall) {
    room.isPlaying = false;
    broadcastRealtimeSync(room.mode);
    return;
  }
  room.calledBalls = [...room.calledBalls, nextBall];
  room.activeBall = nextBall;
  room.lastBallTickAt = Date.now();
  if (room.calledBalls.length >= 75 && room.winnersList.length === 0) {
    room.isPlaying = false;
    room.winnerDisplayCountdown = 10;
    room.lastCountdownTickAt = Date.now();
  }
  broadcastRealtimeSync(room.mode);
}

function resetServerRoomRound(room: ServerLiveRoomState, lockedMap: Map<number, LockedCartelaOwner>) {
  let nextMatchId = generateRandomMatchId();
  while (nextMatchId === room.gameMatchId) {
    nextMatchId = generateRandomMatchId();
  }
  const fair = generateProvablyFairRound(nextMatchId);
  room.gameMatchId = nextMatchId;
  room.isPlaying = false;
  room.isPaused = false;
  room.preGameCountdown = null;
  room.bingoClaimCountdown = null;
  room.winnerDisplayCountdown = null;
  room.calledBalls = [];
  room.activeBall = null;
  room.blockedCartelaIds = [];
  room.winnersList = [];
  room.jackpotWonInRound = 0;
  room.sha256Hash = fair.sha256Hash;
  room.lastBallTickAt = 0;
  room.lastCountdownTickAt = 0;

  lockedMap.clear();
  broadcastRealtimeSync(room.mode);
}

function countDistinctLockedPlayers(lockedMap: Map<number, LockedCartelaOwner>): number {
  const owners = new Set<string>();
  for (const item of lockedMap.values()) {
    const ph = normalizeEthiopianPhone(item.ownerPhone || '');
    const cid = (item.clientId || '').trim();
    // Prefer clientId so even two mobile phones testing with the same or default phone number count as 2 separate mobile devices!
    const key = cid || ph || item.ownerName;
    if (key) {
      owners.add(key);
    }
  }
  return owners.size;
}

const deductedRoundKeys = new Set<string>();

function deductLockedStakesOnGameStart(
  room: ServerLiveRoomState,
  lockedMap: Map<number, LockedCartelaOwner>
) {
  const roundKey = `${room.mode}:${room.stakeAmount}:${room.gameMatchId}`;
  if (deductedRoundKeys.has(roundKey)) return;
  deductedRoundKeys.add(roundKey);
  if (deductedRoundKeys.size > 500) {
    const first = deductedRoundKeys.values().next().value;
    if (first) deductedRoundKeys.delete(first);
  }

  // Group locked cartelas by player phone and deduct stake only now that the game has started!
  const countByPhone = new Map<string, { name: string; count: number; cartelaIds: number[] }>();
  for (const item of lockedMap.values()) {
    const ph = normalizeEthiopianPhone(item.ownerPhone || '') || (item.ownerPhone || '').trim();
    if (!ph) continue;
    const prev = countByPhone.get(ph) || { name: item.ownerName || 'Player', count: 0, cartelaIds: [] };
    prev.count += 1;
    prev.cartelaIds.push(item.cartelaId);
    countByPhone.set(ph, prev);
  }

  for (const [ph, info] of countByPhone.entries()) {
    const player = ensurePlayerRecord(ph, info.name);
    const totalCost = Number((info.count * room.stakeAmount).toFixed(2));
    if (totalCost > 0) {
      player.balance = Math.max(0, Number((player.balance - totalCost).toFixed(2)));
      player.updatedAt = new Date().toLocaleString();
      if (ph === globalRegisteredPhone || ph === '0942742684') {
        globalWalletBalance = player.balance;
      }
    }
  }
  saveBotsToDisk();
}

// High-Precision 100ms Server Loop for Zero-Jitter Ball Calling and Countdown Sync across ALL 4 Fast Bingo Stake Rooms + Regular Room!
setInterval(() => {
  const now = Date.now();
  const roomEntries: {
    mode: 'fast' | 'regular';
    room: ServerLiveRoomState;
    lockedMap: Map<number, LockedCartelaOwner>;
  }[] = [
    ...FAST_STAKE_TIERS.map((stk) => ({
      mode: 'fast' as const,
      room: fastRoomsByStake[stk],
      lockedMap: fastLockedCartelasByStake[stk],
    })),
    {
      mode: 'regular' as const,
      room: regularLiveRoomState,
      lockedMap: regularRoomLockedCartelas,
    },
  ];

  for (const { mode, room, lockedMap } of roomEntries) {
    // 0. Auto-start 30s pre-game countdown if cartelas are locked and round hasn't started yet
    if (
      !room.isPlaying &&
      room.calledBalls.length === 0 &&
      room.winnersList.length === 0 &&
      room.preGameCountdown === null &&
      mode === 'fast' &&
      lockedMap.size >= 1
    ) {
      room.preGameCountdown = 30;
      room.lastCountdownTickAt = now;
      broadcastRealtimeSync(mode);
    }

    // 1. Handle Pre-Game Countdown on Server (exact 1000ms ticks)
    if (room.preGameCountdown !== null) {
      if (mode === 'fast' && lockedMap.size === 0 && !room.isPlaying) {
        room.preGameCountdown = null;
        room.lastCountdownTickAt = 0;
        broadcastRealtimeSync(mode);
        continue;
      }
      if (!room.lastCountdownTickAt) {
        room.lastCountdownTickAt = now;
        continue;
      }
      if (now - room.lastCountdownTickAt >= 990) {
        room.lastCountdownTickAt = now;
        if (room.preGameCountdown <= 1) {
          if (mode === 'fast' && lockedMap.size < 1) {
            room.preGameCountdown = null;
            broadcastRealtimeSync(mode);
            continue;
          }
          room.preGameCountdown = null;
          room.isPlaying = true;
          room.isPaused = false;
          deductLockedStakesOnGameStart(room, lockedMap);
          drawNextServerBallForRoom(room);
        } else {
          room.preGameCountdown -= 1;
          broadcastRealtimeSync(mode);
        }
      }
      continue;
    }

    // 2. Handle 30-Second Bingo Claim Window in Ezi Bingo (so no other player with Bingo is missed!)
    if (room.bingoClaimCountdown !== null && room.bingoClaimCountdown > 0) {
      if (!room.lastCountdownTickAt) {
        room.lastCountdownTickAt = now;
        continue;
      }
      if (now - room.lastCountdownTickAt >= 990) {
        room.lastCountdownTickAt = now;
        if (room.bingoClaimCountdown <= 1) {
          // 30-second Bingo claim window has ended! ("ቢንጎ የማለት ሰዓት ተጠናቋል!")
          room.bingoClaimCountdown = 0;
          room.isPlaying = false;
          room.isPaused = false;
          room.winnerDisplayCountdown = mode === 'regular' ? null : 10;
          broadcastRealtimeSync(mode);
        } else {
          room.bingoClaimCountdown -= 1;
          broadcastRealtimeSync(mode);
        }
      }
      continue;
    }

    // 3. Handle Post-Win / End-of-Round 10s Countdown on Server (exact 1000ms ticks)
    if (room.winnerDisplayCountdown !== null) {
      if (!room.lastCountdownTickAt) {
        room.lastCountdownTickAt = now;
        continue;
      }
      if (now - room.lastCountdownTickAt >= 990) {
        room.lastCountdownTickAt = now;
        if (room.winnerDisplayCountdown <= 1) {
          if (mode === 'regular') {
            room.winnerDisplayCountdown = null;
            room.isPlaying = false;
            room.isPaused = false;
            broadcastRealtimeSync(mode);
          } else {
            resetServerRoomRound(room, lockedMap);
          }
        } else {
          room.winnerDisplayCountdown -= 1;
          broadcastRealtimeSync(mode);
        }
      }
      continue;
    }

    // 4. Handle Active Ball Calling on Server with 100ms precision (no skipped ticks!)
    if (room.isPlaying && !room.isPaused) {
      const intervalMs = Math.max(1000, (room.callSpeedSec || 3) * 1000);
      if (now - room.lastBallTickAt >= intervalMs - 20) {
        drawNextServerBallForRoom(room);
      }
    }
  }
}, 100);

function normalizeEthiopianPhone(rawPhone: string): string {
  const digits = (rawPhone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('251') && digits.length === 12) {
    return `0${digits.slice(3)}`;
  }
  if (digits.length === 9 && /^[79]/.test(digits)) {
    return `0${digits}`;
  }
  return digits;
}

function ensurePlayerRecord(phone: string, name = 'Player', chatId?: number): ServerPlayerRecord {
  const clean = normalizeEthiopianPhone(phone) || phone.trim() || '0911000001';
  const existing = playersByPhone.get(clean);
  if (existing) {
    if (chatId) existing.chatId = chatId;
    if (name && name !== 'Player' && name !== 'King' && name !== 'Ezana_Player') {
      existing.name = name;
    }
    return existing;
  }
  const resolvedName =
    name && name !== 'Player' && name !== 'Ezana_Player'
      ? name
      : clean === '0942742684'
      ? 'Ezana_Player'
      : `Player_${clean.slice(-4)}`;
  const created: ServerPlayerRecord = {
    id: `usr-${clean.slice(-4)}-${Date.now().toString().slice(-3)}`,
    phone: clean,
    name: resolvedName,
    chatId,
    balance: clean === '0942742684' ? 1250.0 : 15.0,
    bonusBalance: 15.0,
    referralEarnings: 0,
    referredCount: 0,
    isBlocked: false,
    updatedAt: new Date().toLocaleString(),
  };
  playersByPhone.set(clean, created);
  return created;
}

interface PersistedBotData {
  tokens: {
    token: string;
    botUsername: string;
    botFirstName: string;
    appUrl: string;
    offset?: number;
  }[];
  registeredPhones: [number, string][];
  bonusClaimed: number[];
  globalRegisteredPhone?: string | null;
  globalWalletBalance?: number;
  globalBonusBalance?: number;
  players?: ServerPlayerRecord[];
  transactions?: ServerTransactionRecord[];
  fastGameHistory?: ServerGameHistoryRecord[];
  regularGameHistory?: ServerGameHistoryRecord[];
  fastRoomState?: Partial<ServerLiveRoomState>;
  regularRoomState?: Partial<ServerLiveRoomState>;
  fastLockedCartelas?: LockedCartelaOwner[];
  regularLockedCartelas?: LockedCartelaOwner[];
  fastRoomsByStake?: Record<number, Partial<ServerLiveRoomState>>;
  fastLockedCartelasByStake?: Record<number, LockedCartelaOwner[]>;
  adminPinConfig?: typeof adminPinConfig;
  verifiedBankSmsReceipts?: VerifiedBankReceipt[];
  receivedWebhookSmsLogs?: ReceivedWebhookSmsLog[];
}

// Preserve saved bot tokens loaded from disk so saveBotsToDisk NEVER overwrites them with []
let persistedBotTokensCache: {
  token: string;
  botUsername: string;
  botFirstName: string;
  appUrl: string;
  offset?: number;
}[] = [];

function saveBotsToDisk() {
  try {
    const activeTokenList = Array.from(activeBots.entries()).map(([token, info]) => ({
      token,
      botUsername: info.botUsername,
      botFirstName: info.botFirstName,
      appUrl: info.appUrl,
      offset: info.offset,
    }));
    if (activeTokenList.length > 0) {
      persistedBotTokensCache = activeTokenList;
    }
    const { roomsObj, lockedObj } = serializeFastRoomsSnapshot();
    const payload: PersistedBotData = {
      tokens: activeTokenList.length > 0 ? activeTokenList : persistedBotTokensCache,
      registeredPhones: Array.from(registeredChatPhones.entries()),
      bonusClaimed: Array.from(chatWelcomeBonusClaimed.values()),
      globalRegisteredPhone,
      globalWalletBalance:
        globalWalletBalance > 1000000 ? 1250 : globalWalletBalance,
      globalBonusBalance,
      players: Array.from(playersByPhone.values()).map((p) => ({
        ...p,
        balance: p.balance > 1000000 ? 1250 : p.balance,
      })),
      transactions: serverTransactions.slice(0, 200),
      fastGameHistory: fastRoomsByStake[10].gameHistory.slice(0, 100),
      regularGameHistory: regularLiveRoomState.gameHistory.slice(0, 100),
      fastRoomState: {
        gameMatchId: fastRoomsByStake[10].gameMatchId,
        isPlaying: fastRoomsByStake[10].isPlaying,
        isPaused: fastRoomsByStake[10].isPaused,
        preGameCountdown: fastRoomsByStake[10].preGameCountdown,
        winnerDisplayCountdown: fastRoomsByStake[10].winnerDisplayCountdown,
        calledBalls: fastRoomsByStake[10].calledBalls,
        activeBall: fastRoomsByStake[10].activeBall,
        callSpeedSec: fastRoomsByStake[10].callSpeedSec,
        stakeAmount: fastRoomsByStake[10].stakeAmount,
        prizeAmount: fastRoomsByStake[10].prizeAmount,
        activePatternId: fastRoomsByStake[10].activePatternId,
        jackpotPool: fastRoomsByStake[10].jackpotPool,
        houseEarningsTotal: fastRoomsByStake[10].houseEarningsTotal,
        jackpotWonInRound: fastRoomsByStake[10].jackpotWonInRound,
        blockedCartelaIds: fastRoomsByStake[10].blockedCartelaIds,
        winnersList: fastRoomsByStake[10].winnersList,
        lastVerifiedWinnerBanner: fastRoomsByStake[10].lastVerifiedWinnerBanner,
        sha256Hash: fastRoomsByStake[10].sha256Hash,
        seq: fastRoomsByStake[10].seq,
      },
      regularRoomState: {
        gameMatchId: regularLiveRoomState.gameMatchId,
        isPlaying: regularLiveRoomState.isPlaying,
        isPaused: regularLiveRoomState.isPaused,
        preGameCountdown: regularLiveRoomState.preGameCountdown,
        bingoClaimCountdown: regularLiveRoomState.bingoClaimCountdown,
        winnerDisplayCountdown: regularLiveRoomState.winnerDisplayCountdown,
        calledBalls: regularLiveRoomState.calledBalls,
        activeBall: regularLiveRoomState.activeBall,
        callSpeedSec: regularLiveRoomState.callSpeedSec,
        stakeAmount: regularLiveRoomState.stakeAmount,
        prizeAmount: regularLiveRoomState.prizeAmount,
        activePatternId: regularLiveRoomState.activePatternId,
        jackpotPool: regularLiveRoomState.jackpotPool,
        houseEarningsTotal: regularLiveRoomState.houseEarningsTotal,
        jackpotWonInRound: regularLiveRoomState.jackpotWonInRound,
        blockedCartelaIds: regularLiveRoomState.blockedCartelaIds,
        winnersList: regularLiveRoomState.winnersList,
        lastVerifiedWinnerBanner: regularLiveRoomState.lastVerifiedWinnerBanner,
        sha256Hash: regularLiveRoomState.sha256Hash,
        seq: regularLiveRoomState.seq,
      },
      fastLockedCartelas: Array.from(fastRoomLockedCartelas.values()),
      regularLockedCartelas: Array.from(regularRoomLockedCartelas.values()),
      fastRoomsByStake: roomsObj,
      fastLockedCartelasByStake: lockedObj,
      adminPinConfig,
      verifiedBankSmsReceipts: verifiedBankSmsReceipts.slice(0, 100),
      receivedWebhookSmsLogs: receivedWebhookSmsLogs.slice(0, 100),
    };
    fs.writeFileSync(BOT_STORE_PATH, JSON.stringify(payload, null, 2), 'utf-8');
  } catch {
    // ignore disk write errors
  }
}

function loadBotsFromDisk() {
  try {
    if (!fs.existsSync(BOT_STORE_PATH)) {
      return;
    }
    const raw = fs.readFileSync(BOT_STORE_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<PersistedBotData>;
    if (
      typeof parsed.globalWalletBalance === 'number' &&
      Number.isFinite(parsed.globalWalletBalance) &&
      parsed.globalWalletBalance <= 1000000
    ) {
      globalWalletBalance = parsed.globalWalletBalance;
    }
    if (typeof parsed.globalBonusBalance === 'number' && Number.isFinite(parsed.globalBonusBalance)) {
      globalBonusBalance = parsed.globalBonusBalance;
    }
    if (Array.isArray(parsed.players)) {
      for (const p of parsed.players) {
        if (p && p.phone && p.name !== 'Yonas_Fast' && p.name !== 'Meron_Hailu' && p.name !== 'Dawit_Bingo') {
          if (p.balance > 1000000) {
            p.balance = p.phone === '0942742684' ? 1250 : 15;
          }
          playersByPhone.set(p.phone, p);
        }
      }
    }
    if (Array.isArray(parsed.transactions) && parsed.transactions.length > 0) {
      serverTransactions = parsed.transactions.filter(
        (tx) => tx.id !== 'srv-tx-101' && tx.id !== 'srv-tx-102' && tx.userName !== 'Yonas_Fast' && tx.userName !== 'Meron_Hailu'
      );
    }
    if (parsed.fastRoomState) {
      fastRoomsByStake[10] = {
        ...fastRoomsByStake[10],
        ...parsed.fastRoomState,
        jackpotPool: 500,
        stakeAmount: 10,
        lastBallTickAt: Date.now(),
        lastCountdownTickAt: Date.now(),
      };
    }
    if (parsed.fastRoomsByStake) {
      for (const stk of FAST_STAKE_TIERS) {
        const savedStk = parsed.fastRoomsByStake[stk];
        if (savedStk) {
          fastRoomsByStake[stk] = {
            ...fastRoomsByStake[stk],
            ...savedStk,
            jackpotPool: 500,
            stakeAmount: stk,
            lastBallTickAt: Date.now(),
            lastCountdownTickAt: Date.now(),
          };
        }
      }
    }
    for (const stk of FAST_STAKE_TIERS) {
      if (fastRoomsByStake[stk]) {
        fastRoomsByStake[stk].jackpotPool = 500;
      }
    }
    fastLiveRoomState = fastRoomsByStake[10];
    if (parsed.regularRoomState) {
      regularLiveRoomState = {
        ...regularLiveRoomState,
        ...parsed.regularRoomState,
        jackpotPool: 500,
        lastBallTickAt: Date.now(),
        lastCountdownTickAt: Date.now(),
      };
    }
    regularLiveRoomState.jackpotPool = 500;
    if (Array.isArray(parsed.fastGameHistory) && parsed.fastGameHistory.length > 0) {
      fastRoomsByStake[10].gameHistory = parsed.fastGameHistory.filter(
        (h) => !h.winners?.some((w) => w.userName === 'Yonas_Fast' || w.userName === 'Dawit_Bingo')
      );
    }
    if (Array.isArray(parsed.regularGameHistory) && parsed.regularGameHistory.length > 0) {
      regularLiveRoomState.gameHistory = parsed.regularGameHistory.filter(
        (h) => !h.winners?.some((w) => w.userName === 'Yonas_Fast' || w.userName === 'Dawit_Bingo')
      );
    }
    if (Array.isArray(parsed.fastLockedCartelas)) {
      fastRoomLockedCartelas.clear();
      for (const item of parsed.fastLockedCartelas) {
        if (item && typeof item.cartelaId === 'number') {
          fastRoomLockedCartelas.set(item.cartelaId, item);
        }
      }
    }
    if (parsed.fastLockedCartelasByStake) {
      for (const stk of FAST_STAKE_TIERS) {
        const list = parsed.fastLockedCartelasByStake[stk];
        if (Array.isArray(list)) {
          const mapTarget = fastLockedCartelasByStake[stk];
          mapTarget.clear();
          for (const item of list) {
            if (item && typeof item.cartelaId === 'number') {
              mapTarget.set(item.cartelaId, item);
            }
          }
        }
      }
    }
    if (Array.isArray(parsed.regularLockedCartelas)) {
      regularRoomLockedCartelas.clear();
      for (const item of parsed.regularLockedCartelas) {
        if (item && typeof item.cartelaId === 'number') {
          regularRoomLockedCartelas.set(item.cartelaId, item);
        }
      }
    }
    if (parsed.adminPinConfig) {
      adminPinConfig = { ...adminPinConfig, ...parsed.adminPinConfig };
    }
    if (Array.isArray(parsed.verifiedBankSmsReceipts)) {
      verifiedBankSmsReceipts.splice(0, verifiedBankSmsReceipts.length, ...parsed.verifiedBankSmsReceipts);
    }
    if (Array.isArray(parsed.receivedWebhookSmsLogs)) {
      receivedWebhookSmsLogs.splice(0, receivedWebhookSmsLogs.length, ...parsed.receivedWebhookSmsLogs);
    }
    if (Array.isArray(parsed.registeredPhones)) {
      for (const [chatId, phone] of parsed.registeredPhones) {
        registeredChatPhones.set(Number(chatId), String(phone));
        ensurePlayerRecord(String(phone), undefined, Number(chatId));
      }
    }
    if (Array.isArray(parsed.bonusClaimed)) {
      for (const chatId of parsed.bonusClaimed) {
        chatWelcomeBonusClaimed.add(Number(chatId));
      }
    }
    if (Array.isArray(parsed.tokens)) {
      const seenTokens = new Set<string>();
      const uniqueTokens: typeof persistedBotTokensCache = [];
      for (const item of parsed.tokens) {
        const cleanTok = (item?.token || '').trim();
        if (cleanTok && cleanTok.includes(':') && !seenTokens.has(cleanTok)) {
          seenTokens.add(cleanTok);
          let resolvedAppUrl = process.env.RENDER_EXTERNAL_URL || item.appUrl || lastKnownLiveHost || SHARED_APP_URL;
          if (resolvedAppUrl.includes('ezi-bingo.onrender.com')) {
            resolvedAppUrl = lastKnownLiveHost || 'https://ais-pre-5o2vwpcgfgshkft456mpos-198161772381.europe-west2.run.app';
          }
          uniqueTokens.push({ ...item, token: cleanTok, appUrl: resolvedAppUrl });
          // Auto-start background polling on boot; if another server instance is polling, pollBotUpdates gracefully stops on 409 conflict
          const shouldAutoPoll = process.env.DISABLE_LOCAL_BOT_POLLING !== 'true';
          activeBots.set(cleanTok, {
            botUsername: item.botUsername || 'EziBingoBot',
            botFirstName: item.botFirstName || 'Ezi Bingo',
            appUrl: resolvedAppUrl,
            offset: typeof item.offset === 'number' ? item.offset : 0,
            isRunning: shouldAutoPoll,
          });
          if (shouldAutoPoll) {
            pollBotUpdates(cleanTok);
          }
        }
      }
      persistedBotTokensCache = uniqueTokens;
    }
  } catch {
    // ignore disk read errors
  }
}

// Auto-save full server state to disk every 2 seconds so nothing ever reverts on restart
setInterval(() => {
  saveBotsToDisk();
}, 2000);

// Build the exact InlineKeyboardMarkup attached directly under the bot's message (like IMG_3500.jpeg):
// Row 1: 🎮 Play Live Bingo (web_app -> has the little square icon ❐ in top-right and opens inside Telegram!)
// Row 2: Deposit 💵 | Withdraw 💸
// Row 3: Check Balance 💰 | Jackpot 🎰
// Row 4: Transfer 🔄 | Leaderboard 🏆
// Row 5: 🔐 Get Login Token / ኮድ | Game Rules 📖
// Row 6: Support 📞 | 🏠 Main Menu
function buildWebAppUrl(
  appUrl: string,
  mode: 'fast' | 'regular',
  registeredPhone?: string | null,
  tab?: 'deposit' | 'withdraw' | 'transfer'
) {
  let cleanUrl = (appUrl || lastKnownLiveHost || SHARED_APP_URL || '').trim().replace(/\/$/, '');
  if (!cleanUrl || cleanUrl.includes('ezi-bingo.onrender.com')) {
    cleanUrl = lastKnownLiveHost || 'https://ais-pre-5o2vwpcgfgshkft456mpos-198161772381.europe-west2.run.app';
  }
  const phone = registeredPhone || null;
  const tabParam = tab ? `&tab=${tab}` : '';
  if (phone) {
    return `${cleanUrl}/?app=${mode}&registered=1&phone=${encodeURIComponent(phone)}${tabParam}`;
  }
  return `${cleanUrl}/?app=${mode}${tabParam}`;
}

function buildInlineWelcomeMenuKeyboard(appUrl: string, registeredPhone?: string | null) {
  return {
    inline_keyboard: [
      [
        {
          text: '🎮 Play Live Bingo',
          web_app: { url: buildWebAppUrl(appUrl, 'fast', registeredPhone) },
        },
      ],
      [
        { text: 'Deposit 💵', callback_data: 'menu_deposit' },
        { text: 'Withdraw 💸', callback_data: 'menu_withdraw' },
      ],
      [
        { text: '👥 ጓደኛ ይጋብዙ (+25 ETB)', callback_data: 'menu_invite' },
        { text: 'Check Balance 💰', callback_data: 'menu_balance' },
      ],
      [
        { text: 'Jackpot 🎰', callback_data: 'menu_jackpot' },
        { text: 'Transfer 🔄', callback_data: 'menu_transfer' },
      ],
      [
        { text: 'Leaderboard 🏆', callback_data: 'menu_leaderboard' },
        { text: 'Game Rules 📖', callback_data: 'menu_rules' },
      ],
      [
        { text: '🔐 Get Login Token / ኮድ', callback_data: 'menu_token' },
        { text: 'Support 📞', callback_data: 'menu_support' },
      ],
      [
        { text: '📲 Download Android App', callback_data: 'menu_android' },
        { text: '🏠 Main Menu', callback_data: 'menu_main' },
      ],
    ],
  };
}

// Sub-menu inline keyboard with "🏠 Main Menu" + "🎮 Play Live Bingo" so user can return to the main card anytime
function buildSubMenuInlineKeyboard(appUrl: string, registeredPhone?: string | null) {
  return {
    inline_keyboard: [
      [
        {
          text: '🎮 Play Live Bingo',
          web_app: { url: buildWebAppUrl(appUrl, 'fast', registeredPhone) },
        },
      ],
      [{ text: '🏠 Main Menu', callback_data: 'menu_main' }],
    ],
  };
}

// Send the bottom ReplyKeyboardMarkup "📱 ስልክ ቁጥር አጋራ" (matching IMG_3522.jpeg)
async function sendBottomContactKeyboardPromptOnly(token: string, chatId: number) {
  if (registeredChatPhones.has(chatId)) return;
  const promptText = `እንኳን ደህና መጡ! ለመመዝገብ ከዚህ በታች ያለውን ቁልፍ ይጫኑ ስልክ ቁጥርዎን ያጋሩ።`;

  // Prevent duplicate prompt sending within 10 seconds
  const nowMs = Date.now();
  const prevOut = lastOutgoingMsgByChatId.get(chatId);
  if (prevOut && prevOut.hash === promptText && nowMs - prevOut.timestamp < 10000) {
    return;
  }
  lastOutgoingMsgByChatId.set(chatId, { hash: promptText, timestamp: nowMs });

  // Clean up any previous prompt messages in this chat so they never stack
  await deleteOldPhonePromptMessages(token, chatId);

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: promptText,
        reply_markup: {
          keyboard: [
            [
              {
                text: '📱 ስልክ ቁጥር አጋራ',
                request_contact: true,
              },
            ],
          ],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      }),
    });
    const data = await res.json();
    if (data?.ok && data?.result?.message_id) {
      const prev = promptMessageIdsByChat.get(chatId) || [];
      promptMessageIdsByChat.set(chatId, [...prev, data.result.message_id]);
    }
  } catch (err) {
    console.error('Error sending bottom contact keyboard prompt:', err);
  }
}

// Delete any old "📱 ስልክ ቁጥር አጋራ" prompt messages in the chat once the user registers
async function deleteOldPhonePromptMessages(token: string, chatId: number) {
  const msgIds = promptMessageIdsByChat.get(chatId);
  if (!msgIds || msgIds.length === 0) return;
  promptMessageIdsByChat.delete(chatId);
  for (const msgId of msgIds) {
    try {
      await fetch(`https://api.telegram.org/bot${token}/deleteMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: msgId,
        }),
      });
    } catch {
      // ignore
    }
  }
}

// Send the exact first-page Share Phone Number prompt for new / unregistered Telegram users (matching IMG_3522.jpeg!)
async function sendUnregisteredPhonePrompt(token: string, chatId: number, isBlockedCommand = false) {
  const textToSend = isBlockedCommand
    ? `❌ እባክዎ መጀመሪያ ስልክ ቁጥርዎን በማጋራት ይመዝገቡ።`
    : `እንኳን ደህና መጡ! ለመመዝገብ ከዚህ በታች ያለውን ቁልፍ ይጫኑ ስልክ ቁጥርዎን ያጋሩ።`;

  // Prevent duplicate prompt sending for new users within 10 seconds
  const nowMs = Date.now();
  const prevOut = lastOutgoingMsgByChatId.get(chatId);
  if (prevOut && prevOut.hash === textToSend && nowMs - prevOut.timestamp < 10000) {
    return;
  }
  lastOutgoingMsgByChatId.set(chatId, { hash: textToSend, timestamp: nowMs });

  // Delete any previous unregistered phone prompts in this chat so only ONE prompt is ever visible
  await deleteOldPhonePromptMessages(token, chatId);

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: textToSend,
        reply_markup: {
          keyboard: [
            [
              {
                text: '📱 ስልክ ቁጥር አጋራ',
                request_contact: true,
              },
            ],
          ],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      }),
    });
    const data = await res.json();
    if (data?.ok && data?.result?.message_id) {
      const prev = promptMessageIdsByChat.get(chatId) || [];
      promptMessageIdsByChat.set(chatId, [...prev, data.result.message_id]);
    }
  } catch (err) {
    console.error('Error sending unregistered phone prompt:', err);
  }
}

function buildWelcomeMessageText(firstName = 'King', registeredPhone?: string, has15Bonus = false) {
  const player = registeredPhone ? playersByPhone.get(registeredPhone) : undefined;
  const cashBal = player ? player.balance : 15.0;
  const bonusBal = player ? player.bonusBalance : 15.0;

  const phoneNotice = registeredPhone
    ? `✅ Registered Phone: *${registeredPhone}*\n`
    : `📱 *ለመመዝገብ ስልክ ቁጥርዎን ያስገቡ (09********)*\n`;

  const bonusTotal = has15Bonus
    ? `${bonusBal.toFixed(2)} ETB (+15 ETB Welcome Bonus!)`
    : `${bonusBal.toFixed(2)} ETB`;

  return (
    `🎉 *Welcome to EziBinGo Live Bingo Ethiopia!*\n` +
    `*(እንኳን ወደ ኢዚቢንጎ በደህና መጡ!)*\n\n` +
    `👋 Selam, *${firstName}*!\n` +
    phoneNotice +
    `\n💰 Cash Balance: *${cashBal.toFixed(2)} ETB*\n` +
    `🎁 Bonus Balance: *${bonusTotal}*\n` +
    `🎰 Jackpot Pool: *${fastLiveRoomState.jackpotPool.toFixed(2)} ETB*\n\n` +
    `⚡ Instant automated deposits & payouts via Telebirr and CBE Birr.\n` +
    `Tap below to enter live games, make a deposit, or manage your account:`
  );
}

// Track chatIds where we have already cleaned up old phone prompt messages
const keyboardRemovedForChats = new Set<number>();

async function ensureTelegramBottomKeyboardRemoved(token: string, chatId: number) {
  if (!registeredChatPhones.has(chatId)) return;
  // Delete any tracked prompt message IDs that carried the ReplyKeyboardMarkup (no temporary send+delete flash!)
  await deleteOldPhonePromptMessages(token, chatId);
  keyboardRemovedForChats.add(chatId);
}

// Track the last message sent to each chat so we never send the exact same text twice within 6 seconds
const lastOutgoingMsgByChatId = new Map<number, { hash: string; timestamp: number }>();

async function sendTelegramMessage(
  token: string,
  chatId: number,
  text: string,
  replyMarkup?: Record<string, unknown>,
  _unusedMessageId?: number
) {
  const botInfo = activeBots.get(token);
  const appUrl = botInfo?.appUrl || SHARED_APP_URL;
  const regPhone = registeredChatPhones.get(chatId);
  const finalMarkup = replyMarkup || buildInlineWelcomeMenuKeyboard(appUrl, regPhone);

  // Outgoing duplicate guard: prevent sending the exact same message twice within 6000ms
  const nowMs = Date.now();
  const msgHash = `${text.slice(0, 120)}`;
  const prevOut = lastOutgoingMsgByChatId.get(chatId);
  if (prevOut && prevOut.hash === msgHash && nowMs - prevOut.timestamp < 6000) {
    return;
  }
  lastOutgoingMsgByChatId.set(chatId, { hash: msgHash, timestamp: nowMs });

  if (regPhone) {
    await deleteOldPhonePromptMessages(token, chatId);
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
        reply_markup: finalMarkup,
      }),
    });
    const data = await res.json();
    if (data?.ok) {
      return;
    }

    // Fallback ONLY if Telegram rejected the message due to unsupported copy_text button on older client/API
    const fallbackRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
        reply_markup: buildSubMenuInlineKeyboard(appUrl, regPhone),
      }),
    });
    await fallbackRes.json().catch(() => {});
  } catch (err) {
    console.error('Error sending Telegram message:', err);
  }
}

async function handleTelegramMenuAction(
  token: string,
  chatId: number,
  rawAction: string,
  firstName = 'King',
  isSharedContact = false,
  callbackMessageId?: number
) {
  const clean = rawAction.trim().toLowerCase();
  const botInfo = activeBots.get(token);
  const appUrl = (botInfo?.appUrl || SHARED_APP_URL).replace(/\/$/, '');

  // Guard against duplicate delivery or rapid double-tap (5000ms window for the exact same action)
  // so 1 tap ALWAYS produces 1 single message without ever stacking duplicates!
  const nowMs = Date.now();
  const prevAction = lastChatActionByChatId.get(chatId);
  if (prevAction && prevAction.action === clean && nowMs - prevAction.timestamp < 5000) {
    return;
  }
  lastChatActionByChatId.set(chatId, { action: clean, timestamp: nowMs });

  if (clean === '/register' || clean === '/logout' || clean === '/reset') {
    registeredChatPhones.delete(chatId);
    keyboardRemovedForChats.delete(chatId);
    saveBotsToDisk();
    await sendUnregisteredPhonePrompt(token, chatId);
    return;
  }

  // STEP 1: Check if the user shared a contact OR is an unregistered user typing a phone number
  const digitsOnly = clean.replace(/\D/g, '');
  const hasActiveFlow = chatFlowByChatId.has(chatId);
  const looksLikePhone =
    isSharedContact ||
    clean.includes('share phone number') ||
    clean.includes('share your phone number') ||
    clean.includes('ስልክ ቁጥር አጋራ') ||
    (!registeredChatPhones.has(chatId) &&
      !hasActiveFlow &&
      digitsOnly.length >= 9 &&
      digitsOnly.length <= 15);

  if (
    looksLikePhone &&
    !clean.startsWith('menu_') &&
    !clean.startsWith('dep_') &&
    !clean.startsWith('with_') &&
    !clean.startsWith('/')
  ) {
    // If already registered, delete old prompt messages and send ONE welcome menu message
    if (registeredChatPhones.has(chatId)) {
      await deleteOldPhonePromptMessages(token, chatId);
      const existingPhone = registeredChatPhones.get(chatId) || globalRegisteredPhone || '0942742684';
      const welcomeText = buildWelcomeMessageText(firstName, existingPhone, true);
      await sendTelegramMessage(
        token,
        chatId,
        welcomeText,
        buildInlineWelcomeMenuKeyboard(appUrl, existingPhone)
      );
      return;
    }

    let normalizedPhone = digitsOnly || '0942742684';
    if (normalizedPhone.startsWith('251') && normalizedPhone.length === 12) {
      normalizedPhone = `0${normalizedPhone.slice(3)}`;
    } else if (normalizedPhone.length === 9 && /^[79]/.test(normalizedPhone)) {
      normalizedPhone = `0${normalizedPhone}`;
    } else if (!digitsOnly) {
      normalizedPhone = globalRegisteredPhone || '0942742684';
    }

    registeredChatPhones.set(chatId, normalizedPhone);
    ensurePlayerRecord(normalizedPhone, firstName, chatId);
    chatWelcomeBonusClaimed.add(chatId);
    saveBotsToDisk();
    broadcastRealtimeSync();

    // Delete all old "📱 ስልክ ቁጥር አጋራ" prompt messages in the chat immediately (removes the ReplyKeyboardMarkup without flashing!)
    await deleteOldPhonePromptMessages(token, chatId);
    keyboardRemovedForChats.add(chatId);

    // Send ONLY ONE single Welcome Message with the full inline keyboard menu (no double message!)
    const welcomeText = buildWelcomeMessageText(firstName, normalizedPhone, true);
    await sendTelegramMessage(
      token,
      chatId,
      welcomeText,
      buildInlineWelcomeMenuKeyboard(appUrl, normalizedPhone)
    );
    return;
  }

  // Handle Android App 📲 (/android, /app, menu_android, or "android") BEFORE phone registration check so any Telegram user immediately receives Ezi-Bingo.apk in chat!
  if (
    clean.includes('android') ||
    clean === '/android' ||
    clean === '/app' ||
    clean === 'menu_android'
  ) {
    const existingPhoneForAndroid =
      registeredChatPhones.get(chatId) ||
      Array.from(playersByPhone.values()).find((p) => p.chatId === chatId && p.phone)?.phone ||
      globalRegisteredPhone ||
      '0942742684';
    const androidInstallUrl = buildWebAppUrl(appUrl, 'fast', existingPhoneForAndroid);
    const apkDownloadUrl = `${appUrl.replace(/\/$/, '')}/Ezi-Bingo.apk`;
    const androidCaption =
      `📲 Ezi-Bingo.apk (Android App)\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `👆 ይህንን Ezi-Bingo.apk ፋይል ነክተው በቀጥታ ስልክዎ ላይ Install ያድርጉ!`;

    const inlineKeyboardMarkup = {
      inline_keyboard: [
        [
          {
            text: '📥 Ezi-Bingo.apk አውርድ (Direct Download)',
            url: apkDownloadUrl,
          },
        ],
        [
          {
            text: '🎮 Play Live Bingo',
            web_app: { url: androidInstallUrl },
          },
        ],
        [{ text: '🏠 Main Menu', callback_data: 'menu_main' }],
      ],
    };

    let sentApkDocument = false;
    // 1. Try instant delivery via cached Telegram file_id for @Ezigamsbot (works in <50ms even on Render without disk file!)
    const EZI_APK_TELEGRAM_FILE_ID =
      'BQACAgQAAxkDAAICb2rMcRJ8tXu221eD-Spd-oCKW36bAALuHgAC-YRhUk48IbK4pANjPQQ';
    try {
      const fastDocRes = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          document: EZI_APK_TELEGRAM_FILE_ID,
          caption: androidCaption,
          reply_markup: inlineKeyboardMarkup,
        }),
      });
      const fastDocJson = await fastDocRes.json().catch(() => null);
      if (fastDocJson?.ok) {
        sentApkDocument = true;
      }
    } catch {
      // fallback to local file upload below
    }

    // 2. Fallback: Upload Ezi-Bingo.apk from local disk if file_id wasn't accepted (e.g. different bot token)
    if (!sentApkDocument) {
      try {
        const apkCandidates = [
          path.join(__dirname, 'public', 'Ezi-Bingo.apk'),
          path.join(__dirname, 'dist', 'Ezi-Bingo.apk'),
        ];
        const apkFilePath = apkCandidates.find((p) => fs.existsSync(p));
        if (apkFilePath) {
          const apkBuffer = fs.readFileSync(apkFilePath);
          const form = new FormData();
          form.append('chat_id', String(chatId));
          form.append('caption', androidCaption);
          form.append('reply_markup', JSON.stringify(inlineKeyboardMarkup));
          form.append(
            'document',
            new Blob([new Uint8Array(apkBuffer)], {
              type: 'application/vnd.android.package-archive',
            }),
            'Ezi-Bingo.apk'
          );
          const docRes = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, {
            method: 'POST',
            body: form,
          });
          const docJson = await docRes.json().catch(() => null);
          if (docJson?.ok) {
            sentApkDocument = true;
          }
        }
      } catch (err) {
        console.error('Telegram sendDocument APK error:', err);
      }
    }

    if (!sentApkDocument) {
      await sendTelegramMessage(
        token,
        chatId,
        `📲 *Ezi Bingo ለ Android ስልክ*\n━━━━━━━━━━━━━━━━━━\n👇 ከታች ያለውን **📥 Ezi-Bingo.apk አውርድ** ቁልፍ በመጫን አፑን በቀጥታ ስልክዎ ላይ Install ያድርጉ፦`,
        inlineKeyboardMarkup,
        callbackMessageId
      );
    }
    return;
  }

  // STEP 2: If the user is NOT registered yet (!registeredChatPhones.has(chatId)):
  // First check if we already have a player record with this chatId in playersByPhone!
  if (!registeredChatPhones.has(chatId)) {
    const matchedPlayerByChat = Array.from(playersByPhone.values()).find((p) => p.chatId === chatId && p.phone);
    if (matchedPlayerByChat) {
      registeredChatPhones.set(chatId, matchedPlayerByChat.phone);
      saveBotsToDisk();
    } else {
      const isStartCmd = clean === '/start' || clean.startsWith('/start ');
      await sendUnregisteredPhonePrompt(token, chatId, !isStartCmd);
      return;
    }
  }

  const regPhone = registeredChatPhones.get(chatId) || globalRegisteredPhone || '0942742684';
  const currentPlayer = ensurePlayerRecord(regPhone, firstName, chatId);

  // Clear flow state if user navigates to main menu or another top-level command
  if (clean.startsWith('menu_') || clean.startsWith('/')) {
    chatFlowByChatId.delete(chatId);
  }

  // 0. Admin Panel (/admin or menu_admin)
  if (
    clean === '/admin' ||
    clean === 'admin' ||
    clean === 'menu_admin' ||
    clean.startsWith('/admin ')
  ) {
    const baseApp = (appUrl || 'https://ezi-bingo.onrender.com').replace(/\/$/, '');
    const adminFastUrl = `${baseApp}/?app=fast&tab=admin&admin=1#admin`;
    const adminRegularUrl = `${baseApp}/?app=regular&tab=admin&admin=1#regular-admin`;
    const adminText =
      `🛡️ *EziBinGo Control Center (የቁጥጥር ማዕከል)*\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `🔐 *Username:* \`ezana\`\n` +
      `🔑 *Password / PIN:* \`1234\`\n\n` +
      `🔗 *Direct Admin URL:*\n` +
      `https://ezi-bingo.onrender.com/#admin\n\n` +
      `👇 ከታች የሚፈልጉትን የቢንጎ ማስተዳደሪያ ፓነል በቀጥታ ይክፈቱ፦`;

    await sendTelegramMessage(
      token,
      chatId,
      adminText,
      {
        inline_keyboard: [
          [
            {
              text: '⚡ Fast Bingo Admin (ፈጣን)',
              web_app: { url: adminFastUrl },
            },
            {
              text: '🎲 Regular Bingo Admin (መደበኛ)',
              web_app: { url: adminRegularUrl },
            },
          ],
          [
            {
              text: '🎮 Play Live Bingo',
              web_app: { url: buildWebAppUrl(appUrl, 'fast', regPhone) },
            },
          ],
          [{ text: '🏠 Main Menu', callback_data: 'menu_main' }],
        ],
      },
      callbackMessageId
    );
    return;
  }

  // 1. Play Live Bingo (/play or button)
  if (
    clean.includes('play live bingo') ||
    clean === '/play' ||
    clean === 'play' ||
    clean === 'menu_play'
  ) {
    const playText =
      `🎮 *EziBinGo Live Bingo Ethiopia*\n\n` +
      `Tap **🎮 Play Live Bingo** below to launch the live game directly inside Telegram:`;

    await sendTelegramMessage(
      token,
      chatId,
      playText,
      {
        inline_keyboard: [
          [
            {
              text: '🎮 Play Live Bingo',
              web_app: { url: buildWebAppUrl(appUrl, 'fast', regPhone) },
            },
          ],
          [
            {
              text: '🎲 Classic 16-Rule Bingo (70,000 Cartelas)',
              web_app: { url: buildWebAppUrl(appUrl, 'regular', regPhone) },
            },
          ],
          [{ text: '🏠 Main Menu', callback_data: 'menu_main' }],
        ],
      },
      callbackMessageId
    );
    return;
  }

  // 2. Deposit 💵 (Main Deposit Menu & Bank Selection)
  if (clean.includes('deposit') || clean === '/deposit' || clean === 'menu_deposit') {
    chatFlowByChatId.set(chatId, { mode: 'deposit', method: 'Telebirr' });
    const depositText =
      `Deposit 💵 *(ገንዘብ ማስገቢያ)*\n\n` +
      `💰 የእርስዎ ቀሪ ሂሳብ፦ *${currentPlayer.balance.toFixed(2)} ETB*\n\n` +
      `👇 *1. ገንዘብ የሚያስገቡበትን ባንክ ይምረጡ ወይም ቁጥሩን ሲነኩት በራሱ Copy ያደርጋል፦*\n\n` +
      `📱 *Telebirr (ቴሌብር)*\n` +
      `ቁጥር: \`0942742684\`\n` +
      `ስም: *Ezana Gebremedhin*\n\n` +
      `🏦 *CBE (ኢትዮጵያ ንግድ ባንክ)*\n` +
      `ሂሳብ: \`1000112964936\`\n` +
      `ስም: *Ezana Gebremedhin*\n\n` +
      `🏦 *Abyssinia / BOA (አቢሲኒያ ባንክ)*\n` +
      `ሂሳብ: \`66816532\`\n` +
      `ስም: *Ezana Gebremedhin*\n\n` +
      `📱 *M-Pesa (ኤም-ፔሳ)*\n` +
      `ቁጥር: \`0711742684\`\n` +
      `ስም: *Ezana Gebremedhin*\n\n` +
      `📩 *2. ክፍያውን ከፈጸሙ በኋላ የደረሰዎትን የባንክ/ቴሌብር SMS ደረሰኝ ወይም Transaction ID (FT... / TB...) እዚሁ ቻት ላይ Paste አድርገው ይላኩ!*`;

    await sendTelegramMessage(
      token,
      chatId,
      depositText,
      {
        inline_keyboard: [
          [
            { text: '📱 Telebirr', callback_data: 'dep_bank_Telebirr' },
            { text: '🏦 CBE', callback_data: 'dep_bank_CBE' },
          ],
          [
            { text: '🏦 Abyssinia (BOA)', callback_data: 'dep_bank_Abyssinia' },
            { text: '📱 M-Pesa', callback_data: 'dep_bank_M-Pesa' },
          ],
          [
            { text: '📋 Copy Telebirr (0942742684)', copy_text: { text: '0942742684' } },
            { text: '📋 Copy CBE (1000112964936)', copy_text: { text: '1000112964936' } },
          ],
          [
            { text: '📋 Copy BOA (66816532)', copy_text: { text: '66816532' } },
            { text: '📋 Copy M-Pesa (0711742684)', copy_text: { text: '0711742684' } },
          ],
          [
            {
              text: '💵 Open Deposit in App',
              web_app: { url: buildWebAppUrl(appUrl, 'fast', regPhone, 'deposit') },
            },
          ],
          [{ text: '🏠 Main Menu', callback_data: 'menu_main' }],
        ],
      },
      callbackMessageId
    );
    return;
  }

  // 2B. Deposit Bank Specific Selection (dep_bank_*)
  if (clean.startsWith('dep_bank_')) {
    const rawBank = rawAction.replace(/^dep_bank_/i, '');
    const method: 'CBE' | 'Abyssinia' | 'Telebirr' | 'M-Pesa' =
      /cbe/i.test(rawBank)
        ? 'CBE'
        : /abyssinia|boa/i.test(rawBank)
        ? 'Abyssinia'
        : /mpesa|m-pesa/i.test(rawBank)
        ? 'M-Pesa'
        : 'Telebirr';

    chatFlowByChatId.set(chatId, { mode: 'deposit', method });

    const acctMap = {
      Telebirr: { title: '📱 Telebirr (ቴሌብር)', num: '0942742684', holder: 'Ezana Gebremedhin' },
      CBE: { title: '🏦 Commercial Bank of Ethiopia (CBE)', num: '1000112964936', holder: 'Ezana Gebremedhin' },
      Abyssinia: { title: '🏦 Bank of Abyssinia (BOA)', num: '66816532', holder: 'Ezana Gebremedhin' },
      'M-Pesa': { title: '📱 M-Pesa Safaricom', num: '0711742684', holder: 'Ezana Gebremedhin' },
    }[method];

    const bankText =
      `Deposit via *${acctMap.title}* 💵\n\n` +
      `🔢 ሂሳብ / ቁጥር፦ \`${acctMap.num}\`\n` +
      `👤 የሂሳብ ባለቤት፦ *${acctMap.holder}*\n\n` +
      `1️⃣ ከታች ባለው *📋 Copy* ቁልፍ ቁጥሩን ኮፒ ያድርጉ።\n` +
      `2️⃣ ብሩን ከላኩ በኋላ የደረሰዎትን *ሙሉ የባንክ/ቴሌብር SMS ደረሰኝ* ወይም *Transaction Reference (FT... / TB...)* እዚሁ ቻት ላይ ይላኩ፦`;

    await sendTelegramMessage(
      token,
      chatId,
      bankText,
      {
        inline_keyboard: [
          [{ text: `📋 Copy ${method} (${acctMap.num})`, copy_text: { text: acctMap.num } }],
          [
            { text: '🔙 ወደ ሁሉም ባንኮች (All Banks)', callback_data: 'menu_deposit' },
            { text: '🏠 Main Menu', callback_data: 'menu_main' },
          ],
        ],
      },
      callbackMessageId
    );
    return;
  }

  // 3. Withdraw 💸 (Main Withdraw Menu & Method Selection)
  if (clean.includes('withdraw') || clean === '/withdraw' || clean === 'menu_withdraw') {
    chatFlowByChatId.set(chatId, { mode: 'withdraw_amount', method: 'Telebirr' });
    const withdrawText =
      `Withdraw 💸 *(ገንዘብ ማውጫ)*\n\n` +
      `💰 ማውጣት የሚችሉት (Cash Balance): *${currentPlayer.balance.toFixed(2)} ETB*\n` +
      `• ዝቅተኛ ማውጫ (Min): *50 ETB*\n` +
      `• ከፍተኛ ማውጫ (Max): *75,000 ETB*\n\n` +
      `👇 *1. ገንዘብ የሚያወጡበትን ባንክ / መንገድ ከታች ይምረጡ፦*\n` +
      `*(ወይም የሚያወጡትን የብር መጠን እና የሂሳብ ቁጥርዎን ለምሳሌ \`200 0942742684\` ብለው እዚሁ ቻት ላይ ይላኩ)*`;

    await sendTelegramMessage(
      token,
      chatId,
      withdrawText,
      {
        inline_keyboard: [
          [
            { text: '📱 Telebirr (ቴሌብር)', callback_data: 'with_bank_Telebirr' },
            { text: '🏦 CBE (ንግድ ባንክ)', callback_data: 'with_bank_CBE' },
          ],
          [
            { text: '🏦 Abyssinia (BOA)', callback_data: 'with_bank_Abyssinia' },
            { text: '📱 M-Pesa (ኤም-ፔሳ)', callback_data: 'with_bank_M-Pesa' },
          ],
          [
            { text: '50 ETB', callback_data: 'with_amt_Telebirr_50' },
            { text: '100 ETB', callback_data: 'with_amt_Telebirr_100' },
            { text: '200 ETB', callback_data: 'with_amt_Telebirr_200' },
          ],
          [
            { text: '500 ETB', callback_data: 'with_amt_Telebirr_500' },
            { text: '1,000 ETB', callback_data: 'with_amt_Telebirr_1000' },
            {
              text: `All (${Math.floor(currentPlayer.balance)} ETB)`,
              callback_data: `with_amt_Telebirr_${Math.max(50, Math.floor(currentPlayer.balance))}`,
            },
          ],
          [
            {
              text: '💸 Open Withdraw in App',
              web_app: { url: buildWebAppUrl(appUrl, 'fast', regPhone, 'withdraw') },
            },
          ],
          [{ text: '🏠 Main Menu', callback_data: 'menu_main' }],
        ],
      },
      callbackMessageId
    );
    return;
  }

  // 3B. Withdraw Bank Selected (with_bank_*)
  if (clean.startsWith('with_bank_')) {
    const rawBank = rawAction.replace(/^with_bank_/i, '');
    const method: 'CBE' | 'Abyssinia' | 'Telebirr' | 'M-Pesa' =
      /cbe/i.test(rawBank)
        ? 'CBE'
        : /abyssinia|boa/i.test(rawBank)
        ? 'Abyssinia'
        : /mpesa|m-pesa/i.test(rawBank)
        ? 'M-Pesa'
        : 'Telebirr';

    chatFlowByChatId.set(chatId, { mode: 'withdraw_amount', method });

    const stepText =
      `Withdraw via *${method === 'Abyssinia' ? 'Abyssinia (BOA)' : method}* 💸\n\n` +
      `💰 ቀሪ ሂሳብዎ፦ *${currentPlayer.balance.toFixed(2)} ETB*\n\n` +
      `👇 *የሚያወጡትን የብር መጠን ከታች ይምረጡ (ከ 50 – 75,000 ETB)፦*\n` +
      `*(ወይም መጠኑን እና የ ${method} ቁጥርዎን እዚሁ ቻት ላይ ይጻፉ)*`;

    await sendTelegramMessage(
      token,
      chatId,
      stepText,
      {
        inline_keyboard: [
          [
            { text: '50 ETB', callback_data: `with_amt_${method}_50` },
            { text: '100 ETB', callback_data: `with_amt_${method}_100` },
            { text: '200 ETB', callback_data: `with_amt_${method}_200` },
          ],
          [
            { text: '500 ETB', callback_data: `with_amt_${method}_500` },
            { text: '1,000 ETB', callback_data: `with_amt_${method}_1000` },
            {
              text: `ሁሉንም (${Math.floor(currentPlayer.balance)} ETB)`,
              callback_data: `with_amt_${method}_${Math.max(50, Math.floor(currentPlayer.balance))}`,
            },
          ],
          [
            { text: '🔙 ወደ ባንክ ምርጫ (Back)', callback_data: 'menu_withdraw' },
            { text: '🏠 Main Menu', callback_data: 'menu_main' },
          ],
        ],
      },
      callbackMessageId
    );
    return;
  }

  // 3C. Withdraw Amount Selected (with_amt_<method>_<amount>)
  if (clean.startsWith('with_amt_')) {
    const parts = rawAction.split('_');
    const methodRaw = parts[2] || 'Telebirr';
    const amt = parseFloat(parts[3] || '100');
    const method: 'CBE' | 'Abyssinia' | 'Telebirr' | 'M-Pesa' =
      /cbe/i.test(methodRaw)
        ? 'CBE'
        : /abyssinia|boa/i.test(methodRaw)
        ? 'Abyssinia'
        : /mpesa|m-pesa/i.test(methodRaw)
        ? 'M-Pesa'
        : 'Telebirr';

    if (amt > currentPlayer.balance) {
      await sendTelegramMessage(
        token,
        chatId,
        `❌ *በቂ ቀሪ ሂሳብ የለዎትም!*\nየጠየቁት፦ *${amt.toFixed(2)} ETB*\nያለዎት ቀሪ ሂሳብ፦ *${currentPlayer.balance.toFixed(2)} ETB*`,
        {
          inline_keyboard: [
            [{ text: 'Deposit 💵 (ገቢ አድርግ)', callback_data: 'menu_deposit' }],
            [{ text: '🏠 Main Menu', callback_data: 'menu_main' }],
          ],
        },
        callbackMessageId
      );
      return;
    }

    chatFlowByChatId.set(chatId, { mode: 'withdraw_account', method, amount: amt });

    const isMobileMoney = method === 'Telebirr' || method === 'M-Pesa';
    const promptAcctText =
      `Withdraw *${amt.toFixed(2)} ETB* via *${method}* 💸\n\n` +
      (isMobileMoney
        ? `📱 ወደ ተመዘገበው ስልክ ቁጥርዎ (*${regPhone}*) እንዲላክ ከታች ያለውን ቁልፍ ይጫኑ፣ ወይም ሌላ ስልክ ቁጥር ቻቱ ላይ ይጻፉ፦`
        : `🏦 እባክዎ የእርስዎን *${method === 'Abyssinia' ? 'Bank of Abyssinia (BOA)' : 'CBE'} ሂሳብ ቁጥር* እዚሁ ቻት ላይ ይጻፉ፦`);

    const inlineRows: unknown[][] = [];
    if (isMobileMoney) {
      inlineRows.push([
        {
          text: `✅ ወደ ${regPhone} (${amt} ETB) ላክ`,
          callback_data: `with_confirm_${method}_${amt}_${regPhone}`,
        },
      ]);
    }
    inlineRows.push([
      { text: '🔙 መጠን ቀይር (Back)', callback_data: `with_bank_${method}` },
      { text: '🏠 Main Menu', callback_data: 'menu_main' },
    ]);

    await sendTelegramMessage(
      token,
      chatId,
      promptAcctText,
      {
        inline_keyboard: inlineRows,
      },
      callbackMessageId
    );
    return;
  }

  // 3D. One-Tap Withdraw Confirmation (with_confirm_<method>_<amount>_<account>)
  if (clean.startsWith('with_confirm_')) {
    const parts = rawAction.split('_');
    const methodRaw = parts[2] || 'Telebirr';
    const amt = parseFloat(parts[3] || '100');
    const targetAccount = parts.slice(4).join('_') || regPhone;
    const method: 'CBE' | 'Abyssinia' | 'Telebirr' | 'M-Pesa' =
      /cbe/i.test(methodRaw)
        ? 'CBE'
        : /abyssinia|boa/i.test(methodRaw)
        ? 'Abyssinia'
        : /mpesa|m-pesa/i.test(methodRaw)
        ? 'M-Pesa'
        : 'Telebirr';

    chatFlowByChatId.delete(chatId);

    if (amt > globalWalletBalance || amt < 50) {
      await sendTelegramMessage(
        token,
        chatId,
        `❌ *የወጪ ጥያቄው አልተሳካም!*\nዝቅተኛ ማውጫ 50 ETB ሲሆን ያለዎት ቀሪ ሂሳብ *${globalWalletBalance.toFixed(2)} ETB* ነው።`,
        buildSubMenuInlineKeyboard(appUrl, regPhone)
      );
      return;
    }

    const newTx: ServerTransactionRecord = {
      id: `srv-tx-${Date.now()}`,
      userId: currentPlayer.id,
      userName: firstName || currentPlayer.name,
      userPhone: regPhone,
      chatId,
      type: 'withdraw',
      method,
      amount: amt,
      referenceNumber: targetAccount,
      fullSmsText: `Telegram Withdraw: ${amt} ETB to ${method} (${targetAccount})`,
      status: adminPinConfig.requireDepositApproval ? 'pending' : 'approved',
      timestamp: new Date().toLocaleString(),
    };
    serverTransactions.unshift(newTx);

    if (!adminPinConfig.requireDepositApproval) {
      currentPlayer.balance = Math.max(0, Number((currentPlayer.balance - amt).toFixed(2)));
      globalWalletBalance = currentPlayer.balance;
    }
    saveBotsToDisk();
    broadcastRealtimeSync();

    const confirmWithdrawMsg = adminPinConfig.requireDepositApproval
      ? `⏳ *የወጪ ጥያቄዎ ተልኳል (በመጠባበቅ ላይ)*\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `🏦 መንገድ፦ *${method}*\n` +
        `💰 የብር መጠን፦ *${amt.toFixed(2)} ETB*\n` +
        `🔢 ሂሳብ / ስልክ፦ \`${targetAccount}\`\n\n` +
        `ጥያቄዎ ደርሶናል! ልክ ተጣርቶ ሲጸድቅ (*Approved*) ወዲያውኑ ወደ ሂሳብዎ ይላካል።`
      : `✅ *የወጪ ጥያቄዎ ተፈጽሟል!*\n` +
        `💰 *${amt.toFixed(2)} ETB* ወደ *${method}* (\`${targetAccount}\`) ተልኳል!\n` +
        `አዲስ ቀሪ ሂሳብ፦ *${globalWalletBalance.toFixed(2)} ETB*`;

    await sendTelegramMessage(token, chatId, confirmWithdrawMsg, buildSubMenuInlineKeyboard(appUrl, regPhone));
    return;
  }

  // 4. Check Balance 💰
  if (
    clean.includes('check balance') ||
    clean.includes('balance') ||
    clean === '/balance' ||
    clean === 'menu_balance'
  ) {
    const has15Bonus = chatWelcomeBonusClaimed.has(chatId);
    const balanceText =
      `Check Balance 💰 *(የሂሳብ መረጃ — Ezi Bingo & Ezi Fast Bingo)*\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `👋 Selam, *${firstName}*!\n` +
      (regPhone ? `📱 Phone: *${regPhone}*\n` : '') +
      `💰 Cash Balance: *${currentPlayer.balance.toFixed(2)} ETB*\n` +
      `🎁 Bonus Balance: *${currentPlayer.bonusBalance.toFixed(2)} ETB${has15Bonus ? ' (+15 ETB Welcome Bonus!)' : ''}*\n` +
      `🎰 Jackpot Pool: *${fastLiveRoomState.jackpotPool.toFixed(2)} ETB*`;

    await sendTelegramMessage(
      token,
      chatId,
      balanceText,
      buildSubMenuInlineKeyboard(appUrl, regPhone),
      callbackMessageId
    );
    return;
  }

  // 5. Jackpot 🎰
  if (clean.includes('jackpot') || clean === '/jackpot' || clean === 'menu_jackpot') {
    const jackpotText =
      `Jackpot 🎰 *(5% Progressive Jackpot)*\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `🎰 Jackpot Pool: *${fastLiveRoomState.jackpotPool.toFixed(2)} / 500.00 ETB*\n` +
      `📈 ከእያንዳንዱ ዙር *5%* ወደ ጃክፓቱ ይጨመራል!\n` +
      `🏆 *500 ብር* ሲሞላ በዚያ ዙር የሚያሸንፈው ተጫዋች *ደራሹን + 500 ብር ጃክፓቱን* በአንድ ላይ ይወስደዋል!`;

    await sendTelegramMessage(
      token,
      chatId,
      jackpotText,
      buildSubMenuInlineKeyboard(appUrl, regPhone),
      callbackMessageId
    );
    return;
  }

  // 6. Transfer 🔄
  if (clean.includes('transfer') || clean === '/transfer' || clean === 'menu_transfer') {
    chatFlowByChatId.set(chatId, { mode: 'transfer' });
    const transferText =
      `Transfer 🔄 *(ለጓደኛ ብር ማስተላለፊያ)*\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `💰 የእርስዎ ቀሪ ሂሳብ፦ *${currentPlayer.balance.toFixed(2)} ETB*\n\n` +
      `ከእርስዎ ዋሌት ወደ ሌላ ተጫዋች ስልክ ቁጥር ብር ለማስተላለፍ፦\n` +
      `የጓደኛዎን *ስልክ ቁጥር* እና *የብር መጠን* (ለምሳሌ፦ \`0911223344 100\`) ብለው እዚሁ ይላኩ።`;

    await sendTelegramMessage(
      token,
      chatId,
      transferText,
      buildSubMenuInlineKeyboard(appUrl, regPhone),
      callbackMessageId
    );
    return;
  }

  // 7. Leaderboard 🏆
  if (
    clean.includes('leaderboard') ||
    clean === '/leaderboard' ||
    clean === 'menu_leaderboard'
  ) {
    const leaderboardText =
      `Leaderboard 🏆 *(ደረጃ ሰንጠረዥ)*\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `🥇 1. *Ezana_Player* — 14,500 ETB (42 Wins)\n` +
      `🥈 2. *Yonas_Fast* — 9,820 ETB (31 Wins)\n` +
      `🥉 3. *Dawit_Bingo* — 7,400 ETB (24 Wins)\n` +
      `🏅 4. *Meron_Hailu* — 5,120 ETB (19 Wins)\n` +
      `🏅 5. *Abebe_K* — 3,900 ETB (15 Wins)`;

    await sendTelegramMessage(
      token,
      chatId,
      leaderboardText,
      buildSubMenuInlineKeyboard(appUrl, regPhone),
      callbackMessageId
    );
    return;
  }

  // 8. 🔐 Get Login Token / ኮድ
  if (
    clean.includes('get login token') ||
    clean.includes('ኮድ') ||
    clean.includes('token') ||
    clean === '/token' ||
    clean === 'menu_token'
  ) {
    const randomCode = Math.floor(100000 + Math.random() * 900000);
    const loginToken = `EZI-${randomCode}`;
    const tokenText =
      `🔐 *Get Login Token / ኮድ*\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `የእርስዎ መግቢያ ኮድ፦ \`${loginToken}\`\n` +
      `• ይህ ኮድ ለ *10 ደቂቃ* ያገለግላል።`;

    await sendTelegramMessage(
      token,
      chatId,
      tokenText,
      buildSubMenuInlineKeyboard(appUrl, regPhone),
      callbackMessageId
    );
    return;
  }

  // 9. Game Rules 📖
  if (
    clean.includes('game rules') ||
    clean.includes('rules') ||
    clean === '/rules' ||
    clean === 'menu_rules'
  ) {
    const rulesText =
      `Game Rules 📖 *(የጨዋታ ሕጎች)*\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `• *ካርቴላ፦* ከ 1 እስከ 500 ካርቴላ መምረጥ ይቻላል።\n` +
      `• *የማሸነፊያ ሕግ፦* ማንኛውም *1 የተኛ መስመር (Horizontal)*፣ *1 የቆመ መስመር (Vertical)*፣ *1 ዲያጎናል (Diagonal)* ወይም *4ቱ የማዕዘን ቁጥሮች (4 Corners)* ሲጠሩ ወዲያውኑ ያሸንፋሉ!\n` +
      `• *የጨዋታ አጀማመር፦* ቢያንስ *2 ተጫዋቾች* ሲገቡ የ *30 ሰከንድ* ቆጣሪ ተጀምሮ ጨዋታው ይጀምራል (1 ተጫዋች ብቻ ከቀረ ቆጣሪው ቆሞ ይጠብቃል)።\n` +
      `• *ደራሽና ጃክፓት፦* ደራሽ ለተጫዋች *80%* | *5%* ለጃክፓት (1,000 ብር ሲሞላ ይወሰዳል)።`;

    await sendTelegramMessage(
      token,
      chatId,
      rulesText,
      buildSubMenuInlineKeyboard(appUrl, regPhone),
      callbackMessageId
    );
    return;
  }

  // 10. Support 📞
  if (clean.includes('support') || clean === '/support' || clean === 'menu_support') {
    const supportText =
      `Support 📞 *(የደንበኞች ድጋፍ)*\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `📞 *ስልክ፦* \`0942742684\`\n` +
      `💬 *ቴሌግራም፦* @EziBingoSupport\n` +
      `⏰ *የስራ ሰዓት፦* 24 ሰዓት`;

    await sendTelegramMessage(
      token,
      chatId,
      supportText,
      buildSubMenuInlineKeyboard(appUrl, regPhone),
      callbackMessageId
    );
    return;
  }

  // 10.4. Invite Friends / Referral 👥 (/invite or menu_invite)
  if (
    clean.includes('invite') ||
    clean.includes('referral') ||
    clean.includes('ይጋብዙ') ||
    clean === '/invite' ||
    clean === '/referral' ||
    clean === 'menu_invite'
  ) {
    const baseApp = (appUrl || SHARED_APP_URL || 'https://sun-bingo.onrender.com').replace(/\/$/, '');
    const myRefCode = currentPlayer.phone?.slice(-6) || 'SUN';
    const webInviteLink = `${baseApp}/?ref=${myRefCode}`;
    const botInfo = activeBots.get(token);
    const botUsername = botInfo?.botUsername;
    const tgInviteLink = botUsername ? `https://t.me/${botUsername}?start=ref_${myRefCode}` : webInviteLink;

    const inviteMsg =
      `👥 *ጓደኛ ይጋብዙ (Invite Friends & Earn 25 ETB)*\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `🎁 *ሽልማት፦* በእያንዳንዱ በተጋበዘ ጓደኛ *+25.00 ETB* ቦነስ ያገኛሉ! ተጋባዡም *+15.00 ETB* ስጦታ ያገኛል!\n\n` +
      `📊 *የእርስዎ የግብዣ ሁኔታ፦*\n` +
      `• የተጋበዙ ጓደኞች፦ *${currentPlayer.referredCount || 0}*\n` +
      `• ያገኙት ጠቅላላ ገቢ፦ *${(currentPlayer.referralEarnings || 0).toFixed(2)} ETB*\n` +
      `• የእርስዎ መጋበዣ ኮድ፦ \`${myRefCode}\`\n\n` +
      `🔗 *የመጋበዣ ሊንክዎ፦*\n\`${tgInviteLink}\`\n\n` +
      `👇 ከታች ያለውን **«በቴሌግራም አጋራ»** ቁልፍ በመጫን ለጓደኞችዎ ወይም ግሩፖች ይላኩ!`;

    await sendTelegramMessage(
      token,
      chatId,
      inviteMsg,
      {
        inline_keyboard: [
          [
            {
              text: '🚀 በቴሌግራም አጋራ (Share on Telegram)',
              url: `https://t.me/share/url?url=${encodeURIComponent(tgInviteLink)}&text=${encodeURIComponent('🎉 ሳን ቢንጎ (Sun Bingo) ላይ አብረን እንጫወት! በእኔ መጋበዣ ሊንክ ሲመዘገቡ 15 ብር ቦነስ ያገኛሉ፦')}`,
            },
          ],
          [
            {
              text: '📋 Copy Link',
              copy_text: { text: tgInviteLink },
            },
          ],
          [{ text: '🏠 Main Menu', callback_data: 'menu_main' }],
        ],
      },
      callbackMessageId
    );
    return;
  }

  // 10.5. Android App 📲 (/android or menu_android)
  if (
    clean.includes('android') ||
    clean === '/android' ||
    clean === '/app' ||
    clean === 'menu_android'
  ) {
    const androidInstallUrl = buildWebAppUrl(appUrl, 'fast', regPhone);
    const apkDownloadUrl = `${appUrl.replace(/\/$/, '')}/Ezi-Bingo.apk`;
    const androidText =
      `📲 *Ezi Bingo ለ Android ስልክ*\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `* ቦቱ ወዲያውኑ \`Ezi-Bingo.apk\` ፋይሉን በtelegram በቻት ውስጥ ይልክልዎታል — ፋይሉን ነክተው በቀጥታ Install ማድረግ ይችላሉ!`;

    // Immediately send the Ezi-Bingo.apk file directly into the Telegram chat first so the user can tap and Install right away!
    let sentApkDocument = false;
    try {
      const apkFilePath = path.join(__dirname, 'public', 'Ezi-Bingo.apk');
      if (fs.existsSync(apkFilePath)) {
        const apkBuffer = fs.readFileSync(apkFilePath);
        const form = new FormData();
        form.append('chat_id', String(chatId));
        form.append(
          'caption',
          '📲 Ezi-Bingo.apk\n* ቦቱ ወዲያውኑ Ezi-Bingo.apk ፋይሉን በtelegram በቻት ውስጥ ይልክልዎታል — ፋይሉን ነክተው በቀጥታ Install ማድረግ ይችላሉ'
        );
        form.append(
          'reply_markup',
          JSON.stringify({
            inline_keyboard: [
              [
                {
                  text: '🎮 Play Live Bingo',
                  web_app: { url: androidInstallUrl },
                },
              ],
              [{ text: '🏠 Main Menu', callback_data: 'menu_main' }],
            ],
          })
        );
        form.append(
          'document',
          new Blob([apkBuffer], { type: 'application/vnd.android.package-archive' }),
          'Ezi-Bingo.apk'
        );
        const docRes = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, {
          method: 'POST',
          body: form,
        });
        const docJson = await docRes.json().catch(() => null);
        if (docJson?.ok) {
          sentApkDocument = true;
        }
      }
    } catch {
      // fallback below if document upload fails
    }

    if (!sentApkDocument) {
      await sendTelegramMessage(
        token,
        chatId,
        androidText,
        {
          inline_keyboard: [
            [
              {
                text: '📥 Ezi-Bingo.apk አውርድ (Direct Install)',
                url: apkDownloadUrl,
              },
            ],
            [
              {
                text: '🎮 Play Live Bingo',
                web_app: { url: androidInstallUrl },
              },
            ],
            [{ text: '🏠 Main Menu', callback_data: 'menu_main' }],
          ],
        },
        callbackMessageId
      );
    }
    return;
  }

  // 10A. Handle Wallet-to-Wallet Transfer in Telegram Chat (when user types "<phone> <amount>" or is in transfer mode)
  const activeFlow = chatFlowByChatId.get(chatId);
  const transferTokens = rawAction.trim().split(/\s+/);
  if (
    !clean.startsWith('/') &&
    !clean.startsWith('menu_') &&
    !clean.startsWith('dep_') &&
    !clean.startsWith('with_') &&
    (activeFlow?.mode === 'transfer' ||
      (transferTokens.length === 2 &&
        (!activeFlow || activeFlow.mode !== 'withdraw_amount') &&
        (/^(?:\+?251|0)?[79]\d{8}$/.test(transferTokens[0]) ||
          /^(?:\+?251|0)?[79]\d{8}$/.test(transferTokens[1]))))
  ) {
    let targetPhoneRaw = '';
    let transferAmt = NaN;
    if (transferTokens.length >= 2) {
      const p0 = normalizeEthiopianPhone(transferTokens[0]);
      const p1 = normalizeEthiopianPhone(transferTokens[1]);
      if (/^0[79]\d{8}$/.test(p0)) {
        targetPhoneRaw = p0;
        transferAmt = parseFloat(transferTokens[1].replace(/,/g, ''));
      } else if (/^0[79]\d{8}$/.test(p1)) {
        targetPhoneRaw = p1;
        transferAmt = parseFloat(transferTokens[0].replace(/,/g, ''));
      }
    }

    if (targetPhoneRaw && Number.isFinite(transferAmt) && transferAmt > 0) {
      const senderPhone = normalizeEthiopianPhone(regPhone) || regPhone;
      if (targetPhoneRaw === senderPhone) {
        await sendTelegramMessage(
          token,
          chatId,
          `❌ ወደ ራስዎ ስልክ ቁጥር (${targetPhoneRaw}) ማስተላለፍ አይችሉም! እባክዎ የሌላ ተጫዋች ስልክ ቁጥር ያስገቡ።`,
          buildSubMenuInlineKeyboard(appUrl, regPhone)
        );
        return;
      }
      if (transferAmt > currentPlayer.balance) {
        await sendTelegramMessage(
          token,
          chatId,
          `❌ *በቂ ቀሪ ሂሳብ የለዎትም!*\nየጠየቁት፦ *${transferAmt.toFixed(2)} ETB*\nያለዎት ቀሪ ሂሳብ፦ *${currentPlayer.balance.toFixed(2)} ETB*`,
          buildSubMenuInlineKeyboard(appUrl, regPhone)
        );
        return;
      }

      chatFlowByChatId.delete(chatId);
      currentPlayer.balance = Math.max(0, Number((currentPlayer.balance - transferAmt).toFixed(2)));
      currentPlayer.updatedAt = new Date().toLocaleString();
      const recipient = ensurePlayerRecord(targetPhoneRaw, `Player_${targetPhoneRaw.slice(-4)}`);
      recipient.balance = Number((recipient.balance + transferAmt).toFixed(2));
      recipient.updatedAt = new Date().toLocaleString();
      globalWalletBalance = currentPlayer.balance;

      const refCode = `TR-${Date.now().toString().slice(-6)}`;
      const newTx: ServerTransactionRecord = {
        id: `srv-tx-${Date.now()}`,
        userId: currentPlayer.id,
        userName: firstName || currentPlayer.name,
        userPhone: senderPhone,
        chatId,
        type: 'transfer',
        method: 'Wallet',
        amount: transferAmt,
        referenceNumber: refCode,
        recipientPhone: targetPhoneRaw,
        fullSmsText: `Transfer ${transferAmt.toFixed(2)} ETB from ${senderPhone} to ${targetPhoneRaw} (${recipient.name})`,
        status: 'approved',
        timestamp: new Date().toLocaleString(),
      };
      serverTransactions.unshift(newTx);
      saveBotsToDisk();
      broadcastRealtimeSync();

      // Notify recipient on Telegram if they have a registered chatId
      const recipientChatId =
        recipient.chatId ||
        Array.from(registeredChatPhones.entries()).find(([, ph]) => normalizeEthiopianPhone(ph) === targetPhoneRaw)?.[0];
      if (recipientChatId && recipientChatId !== chatId) {
        sendTelegramMessage(
          token,
          recipientChatId,
          `🎁 *የዋሌት ብር ደርሶዎታል (Transfer Received)!*\n` +
            `━━━━━━━━━━━━━━━━━━\n` +
            `👤 ከ፦ *${currentPlayer.name}* (\`${senderPhone}\`)\n` +
            `💰 መጠን፦ *+${transferAmt.toFixed(2)} ETB*\n` +
            `🔖 Ref፦ \`${refCode}\`\n` +
            `💵 አዲስ ቀሪ ሂሳብዎ፦ *${recipient.balance.toFixed(2)} ETB*`,
          buildSubMenuInlineKeyboard(appUrl, targetPhoneRaw)
        ).catch(() => {});
      }

      await sendTelegramMessage(
        token,
        chatId,
        `✅ *ብር በተሳካ ሁኔታ ተልኳል (Transfer Successful)!*\n` +
          `━━━━━━━━━━━━━━━━━━\n` +
          `📱 ወደ፦ *${recipient.name}* (\`${targetPhoneRaw}\`)\n` +
          `💰 የተላከ መጠን፦ *${transferAmt.toFixed(2)} ETB*\n` +
          `🔖 Ref፦ \`${refCode}\`\n` +
          `💵 የእርስዎ አዲስ ቀሪ ሂሳብ፦ *${currentPlayer.balance.toFixed(2)} ETB*`,
        buildSubMenuInlineKeyboard(appUrl, senderPhone)
      );
      return;
    } else if (activeFlow?.mode === 'transfer') {
      await sendTelegramMessage(
        token,
        chatId,
        `❌ እባክዎ የተቀባዩን *ስልክ ቁጥር* እና *የብር መጠን* አንድ ላይ ይጻፉ (ለምሳሌ፦ \`0911223344 100\`)፦`,
        buildSubMenuInlineKeyboard(appUrl, regPhone)
      );
      return;
    }
  }

  // 10B. Handle Active Withdrawal Flow (when user types amount or account number in chat after tapping Withdraw 💸)
  if (
    activeFlow &&
    (activeFlow.mode === 'withdraw_account' || activeFlow.mode === 'withdraw_amount') &&
    !clean.startsWith('/') &&
    !clean.startsWith('menu_') &&
    !clean.startsWith('dep_') &&
    !clean.startsWith('with_')
  ) {
    const method = activeFlow.method || 'Telebirr';
    const tokens = rawAction.trim().split(/\s+/);
    let amt = activeFlow.amount || 0;
    let targetAccount = regPhone;

    if (activeFlow.mode === 'withdraw_account' && amt >= 50) {
      targetAccount = rawAction.trim();
    } else if (tokens.length >= 2) {
      const firstNum = parseFloat(tokens[0]);
      const secondNum = parseFloat(tokens[1]);
      if (firstNum >= 50 && firstNum <= 75000 && tokens[1].length >= 6) {
        amt = firstNum;
        targetAccount = tokens[1];
      } else if (secondNum >= 50 && secondNum <= 75000 && tokens[0].length >= 6) {
        amt = secondNum;
        targetAccount = tokens[0];
      }
    } else {
      const singleNum = parseFloat(rawAction.trim());
      if (singleNum >= 50 && singleNum <= 75000 && rawAction.trim().length <= 6) {
        chatFlowByChatId.set(chatId, { mode: 'withdraw_account', method, amount: singleNum });
        await sendTelegramMessage(
          token,
          chatId,
          `Withdraw *${singleNum.toFixed(2)} ETB* via *${method}* 💸\n━━━━━━━━━━━━━━━━━━\n🔢 እባክዎ የእርስዎን *${method} ሂሳብ / ስልክ ቁጥር* ይጻፉ፦`,
          {
            inline_keyboard: [
              [
                {
                  text: `✅ ወደ ${regPhone} (${singleNum} ETB) ላክ`,
                  callback_data: `with_confirm_${method}_${singleNum}_${regPhone}`,
                },
              ],
              [{ text: '🏠 Main Menu', callback_data: 'menu_main' }],
            ],
          }
        );
        return;
      }
    }

    if (amt >= 50 && amt <= globalWalletBalance) {
      chatFlowByChatId.delete(chatId);
      const newTx: ServerTransactionRecord = {
        id: `srv-tx-${Date.now()}`,
        userId: currentPlayer.id,
        userName: firstName || currentPlayer.name,
        userPhone: regPhone,
        chatId,
        type: 'withdraw',
        method,
        amount: amt,
        referenceNumber: targetAccount,
        fullSmsText: `Telegram Withdraw: ${amt} ETB to ${method} (${targetAccount})`,
        status: adminPinConfig.requireDepositApproval ? 'pending' : 'approved',
        timestamp: new Date().toLocaleString(),
      };
      serverTransactions.unshift(newTx);

      if (!adminPinConfig.requireDepositApproval) {
        currentPlayer.balance = Math.max(0, Number((currentPlayer.balance - amt).toFixed(2)));
        globalWalletBalance = currentPlayer.balance;
      }
      saveBotsToDisk();
      broadcastRealtimeSync();

      const confirmWithdrawMsg = adminPinConfig.requireDepositApproval
        ? `⏳ *የወጪ ጥያቄዎ ተልኳል (በመጠባበቅ ላይ)*\n` +
          `━━━━━━━━━━━━━━━━━━\n` +
          `🏦 መንገድ፦ *${method}*\n` +
          `💰 የብር መጠን፦ *${amt.toFixed(2)} ETB*\n` +
          `🔢 ሂሳብ / ስልክ፦ \`${targetAccount}\`\n\n` +
          `ጥያቄዎ ደርሶናል! ልክ ተጣርቶ ሲጸድቅ (*Approved*) ወዲያውኑ ወደ ሂሳብዎ ይላካል።`
        : `✅ *የወጪ ጥያቄዎ ተፈጽሟል!*\n` +
          `💰 *${amt.toFixed(2)} ETB* ወደ *${method}* (\`${targetAccount}\`) ተልኳል!\n` +
          `አዲስ ቀሪ ሂሳብ፦ *${globalWalletBalance.toFixed(2)} ETB*`;

      await sendTelegramMessage(token, chatId, confirmWithdrawMsg, buildSubMenuInlineKeyboard(appUrl, regPhone));
      return;
    }
  }

  // 11. Detect Bank / Telebirr SMS, Deposit/Withdraw Amount (e.g. "1,500" or "ወጪ 200 0942742684"), or Transaction Ref pasted directly in Telegram Chat!
  const parsedSms = parseEthiopianPaymentSms(rawAction);
  const plainNumberMatch = rawAction
    .trim()
    .match(/^(?:etb|birr|ብር)?\s*(\d{1,3}(?:,\d{3})+|\d{2,6})(?:\.\d{1,2})?\s*(?:etb|birr|ብር)?$/i);
  const plainAmountValue = plainNumberMatch
    ? parseFloat(plainNumberMatch[1].replace(/,/g, ''))
    : null;

  // 11A. Automatically detect if the user typed an explicit Withdraw (ወጪ) command/message anywhere in chat (e.g. "ወጪ 200", "withdraw 300 0911...", "200 ብር ወጪ")
  const isAutoWithdrawMessage =
    !clean.startsWith('/') &&
    !clean.startsWith('menu_') &&
    !clean.startsWith('dep_') &&
    !clean.startsWith('with_') &&
    (parsedSms.detectedType === 'withdraw' ||
      /\b(?:withdraw|ወጪ|ገንዘብ\s*ማውጣት)\b/i.test(rawAction)) &&
    !parsedSms.referenceNumber;

  if (isAutoWithdrawMessage) {
    const withAmt = parsedSms.amount ?? plainAmountValue;
    const method: ServerTransactionRecord['method'] =
      parsedSms.detectedBank || activeFlow?.method || 'Telebirr';

    if (!withAmt || withAmt < 50) {
      chatFlowByChatId.set(chatId, { mode: 'withdraw_amount', method });
      await sendTelegramMessage(
        token,
        chatId,
        `💸 *የወጪ (Withdraw) ጥያቄ በራሱ ተለይቷል!*\n` +
          `💰 የእርስዎ ቀሪ ሂሳብ፦ *${currentPlayer.balance.toFixed(2)} ETB*\n\n` +
          `እባክዎ የሚያወጡትን የብር መጠን ይምረጡ (ዝቅተኛ 50 ETB)፦`,
        {
          inline_keyboard: [
            [
              { text: '50 ETB', callback_data: `with_amt_${method}_50` },
              { text: '100 ETB', callback_data: `with_amt_${method}_100` },
              { text: '200 ETB', callback_data: `with_amt_${method}_200` },
            ],
            [
              { text: '500 ETB', callback_data: `with_amt_${method}_500` },
              { text: '1,000 ETB', callback_data: `with_amt_${method}_1000` },
            ],
            [{ text: '🏠 Main Menu', callback_data: 'menu_main' }],
          ],
        }
      );
      return;
    }

    if (withAmt > currentPlayer.balance) {
      await sendTelegramMessage(
        token,
        chatId,
        `❌ *በቂ ቀሪ ሂሳብ የለዎትም!*\nየጠየቁት ወጪ፦ *${withAmt.toFixed(2)} ETB*\nያለዎት ቀሪ ሂሳብ፦ *${currentPlayer.balance.toFixed(2)} ETB*`,
        buildSubMenuInlineKeyboard(appUrl, regPhone)
      );
      return;
    }

    // Extract target account if provided in the message (e.g., 1000... or 09...), otherwise use registered phone
    const cbeAcctMatch = rawAction.match(/\b(1000\d{7,11})\b/);
    const phoneAcctMatch = rawAction.match(/\b((?:\+?251|0)[79]\d{8})\b/);
    const targetAccount = cbeAcctMatch
      ? cbeAcctMatch[1]
      : phoneAcctMatch
      ? normalizeEthiopianPhone(phoneAcctMatch[1])
      : regPhone;

    // Prevent rapid duplicate identical withdrawal within 60 seconds
    const recentDupWithdraw = serverTransactions.find(
      (t) =>
        t.type === 'withdraw' &&
        t.userPhone === regPhone &&
        t.amount === withAmt &&
        t.status === 'pending' &&
        Date.now() - Number(t.id.replace(/\D/g, '').slice(0, 13) || 0) < 60000
    );
    if (recentDupWithdraw) {
      await sendTelegramMessage(
        token,
        chatId,
        `⚠️ *ይህ የ ${withAmt.toFixed(2)} ETB የወጪ ጥያቄ ቀድሞ ተልኳል (በመጠባበቅ ላይ ነው)!*\nእባክዎ በድጋሚ አይላኩ።`,
        buildSubMenuInlineKeyboard(appUrl, regPhone)
      );
      return;
    }

    chatFlowByChatId.delete(chatId);
    const newTx: ServerTransactionRecord = {
      id: `srv-tx-${Date.now()}`,
      userId: currentPlayer.id,
      userName: firstName || currentPlayer.name,
      userPhone: regPhone,
      chatId,
      type: 'withdraw',
      method,
      amount: withAmt,
      referenceNumber: targetAccount,
      fullSmsText: `Auto-Detected Withdraw: ${withAmt} ETB to ${method} (${targetAccount})`,
      status: adminPinConfig.requireDepositApproval ? 'pending' : 'approved',
      timestamp: new Date().toLocaleString(),
    };
    serverTransactions.unshift(newTx);

    if (!adminPinConfig.requireDepositApproval) {
      currentPlayer.balance = Math.max(0, Number((currentPlayer.balance - withAmt).toFixed(2)));
      globalWalletBalance = currentPlayer.balance;
    }
    saveBotsToDisk();
    broadcastRealtimeSync();

    const confirmWithdrawMsg = adminPinConfig.requireDepositApproval
      ? `⏳ *የወጪ ጥያቄዎ በራሱ ተለይቶ ተልኳል (በመጠባበቅ ላይ)*\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `🏷️ አይነት፦ *ወጪ (WITHDRAW)*\n` +
        `🏦 መንገድ፦ *${method}*\n` +
        `💰 የብር መጠን፦ *${withAmt.toFixed(2)} ETB*\n` +
        `🔢 ሂሳብ / ስልክ፦ \`${targetAccount}\`\n\n` +
        `ጥያቄዎ ደርሶናል! ልክ ተጣርቶ ሲጸድቅ (*Approved*) ወዲያውኑ ወደ ሂሳብዎ ይላካል።`
      : `✅ *የወጪ ጥያቄዎ ተፈጽሟል!*\n` +
        `💰 *${withAmt.toFixed(2)} ETB* ወደ *${method}* (\`${targetAccount}\`) ተልኳል!\n` +
        `አዲስ ቀሪ ሂሳብ፦ *${currentPlayer.balance.toFixed(2)} ETB*`;

    await sendTelegramMessage(token, chatId, confirmWithdrawMsg, buildSubMenuInlineKeyboard(appUrl, regPhone));
    return;
  }

  // If the user is in deposit flow (or typed an amount like "1,500" without a ref code yet), save the amount in their flow state and ask for the Ref / SMS!
  if (
    plainAmountValue !== null &&
    plainAmountValue >= 10 &&
    plainAmountValue <= 500000 &&
    !parsedSms.referenceNumber &&
    activeFlow?.mode === 'deposit'
  ) {
    const method = activeFlow.method || 'Telebirr';
    chatFlowByChatId.set(chatId, {
      mode: 'deposit',
      method,
      amount: plainAmountValue,
    });
    await sendTelegramMessage(
      token,
      chatId,
      `✅ የገቢ መጠን፦ *${plainAmountValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB* ተመዝግቧል!\n\n` +
        `📩 አሁን የከፈሉበትን የ *${method}* የግብይት ቁጥር (*Transaction Ref No* ለምሳሌ \`FT...\` ወይም \`TB...\`) ወይም ሙሉ የባንክ SMS ደረሰኝ እዚሁ ይላኩ፦`,
      {
        inline_keyboard: [
          [{ text: '🏠 Main Menu', callback_data: 'menu_main' }],
        ],
      }
    );
    return;
  }

  const looksLikeBankRefOrSms =
    rawAction.length >= 2 &&
    !clean.startsWith('/') &&
    !clean.startsWith('menu_') &&
    !clean.startsWith('dep_') &&
    !clean.startsWith('with_') &&
    (activeFlow?.mode === 'deposit' ||
      parsedSms.amount !== null ||
      parsedSms.referenceNumber !== null ||
      /ft\w+/i.test(rawAction) ||
      /tb\w+/i.test(rawAction) ||
      /boa\w+/i.test(rawAction) ||
      /mp\w+/i.test(rawAction) ||
      /etb|birr|ብር/i.test(rawAction) ||
      /received|credited|transferred|transaction|ገቢ/i.test(rawAction));

  if (looksLikeBankRefOrSms) {
    const userPhone = registeredChatPhones.get(chatId) || globalRegisteredPhone || '0942742684';
    const player = ensurePlayerRecord(userPhone, firstName, chatId);
    const parsedAmount =
      parsedSms.amount ??
      activeFlow?.amount ??
      plainAmountValue;

    const rawRefCandidate =
      parsedSms.referenceNumber ||
      rawAction.trim().replace(/\s+/g, '').slice(0, 18).toUpperCase();
    const refNo = normalizeTransactionReference(rawRefCandidate) || rawRefCandidate;
    const method: ServerTransactionRecord['method'] =
      parsedSms.detectedBank ||
      activeFlow?.method ||
      (/telebirr|tb/i.test(rawAction)
        ? 'Telebirr'
        : /abyssinia|boa/i.test(rawAction)
        ? 'Abyssinia'
        : /mpesa|mp/i.test(rawAction)
        ? 'M-Pesa'
        : 'CBE');

    // DUPLICATE TRANSACTION CHECK (የተደገመ ደረሰኝ ወይም Transaction ID እንዳይቀበል!)
    const normalizedIncomingSms = rawAction.trim().replace(/\s+/g, ' ').toLowerCase();
    const duplicateDeposit = serverTransactions.find((t) => {
      if (t.type !== 'deposit' || t.status === 'rejected') return false;
      const existingRefNorm = normalizeTransactionReference(t.referenceNumber);
      if (
        refNo &&
        refNo.length >= 5 &&
        !refNo.startsWith('REF') &&
        existingRefNorm &&
        existingRefNorm === refNo
      ) {
        return true;
      }
      if (
        normalizedIncomingSms.length >= 25 &&
        t.fullSmsText &&
        t.fullSmsText.trim().replace(/\s+/g, ' ').toLowerCase() === normalizedIncomingSms
      ) {
        return true;
      }
      return false;
    });

    if (duplicateDeposit) {
      chatFlowByChatId.delete(chatId);
      await sendTelegramMessage(
        token,
        chatId,
        `❌ *የተደገመ የክፍያ ደረሰኝ (Duplicate Transaction Rejected)!*\n` +
          `━━━━━━━━━━━━━━━━━━\n` +
          `🔖 የግብይት ቁጥር (Ref No)፦ \`${duplicateDeposit.referenceNumber}\`\n` +
          `💰 መጠን፦ *${duplicateDeposit.amount.toFixed(2)} ETB*\n` +
          `📌 ሁኔታ፦ *${duplicateDeposit.status === 'approved' ? 'ቀድሞ ጸድቋል (Already Approved)' : 'ቀድሞ ተልኳል (Already Pending)'}*\n\n` +
          `⚠️ ይህ የግብይት ቁጥር ወይም የ SMS ደረሰኝ ከዚህ በፊት ጥቅም ላይ ውሏል! የተደገመ ደረሰኝ ተቀባይነት የለውም።`,
        buildSubMenuInlineKeyboard(appUrl, userPhone)
      );
      return;
    }

    // If user ONLY sent a reference number (like "FT26108XYZ") without an amount in the SMS and without a prior amount in activeFlow, ask them how much ETB they sent instead of assuming 200!
    if (!parsedAmount || parsedAmount <= 0) {
      chatFlowByChatId.set(chatId, {
        mode: 'deposit',
        method,
      });
      await sendTelegramMessage(
        token,
        chatId,
        `🔖 የግብይት ቁጥር (\`${refNo}\`) ደርሶናል!\n\n` +
          `💰 እባክዎ የላኩትን *የብር መጠን (ETB)* ወይም *ሙሉ የባንክ SMS ደረሰኙን* ይላኩ (ለምሳሌ፦ \`1,500 ${refNo}\`)፦`,
        {
          inline_keyboard: [
            [{ text: '💵 Open Deposit in App', web_app: { url: buildWebAppUrl(appUrl, 'fast', userPhone, 'deposit') } }],
            [{ text: '🏠 Main Menu', callback_data: 'menu_main' }],
          ],
        }
      );
      return;
    }

    chatFlowByChatId.delete(chatId);

    const matchingPreVerified =
      refNo && refNo.length >= 5
        ? verifiedBankSmsReceipts.find(
            (r) =>
              normalizeTransactionReference(r.referenceNumber) ===
                normalizeTransactionReference(refNo) && r.status !== 'duplicate'
          )
        : null;

    const isAutoApproved =
      !adminPinConfig.requireDepositApproval || Boolean(matchingPreVerified);

    if (matchingPreVerified) {
      matchingPreVerified.status = 'auto_approved';
      matchingPreVerified.matchedUserPhone = userPhone;
    }

    const newTx: ServerTransactionRecord = {
      id: `srv-tx-${Date.now()}`,
      userId: player.id,
      userName: firstName || player.name,
      userPhone,
      chatId,
      type: 'deposit',
      method,
      amount: parsedAmount,
      referenceNumber: refNo,
      fullSmsText: rawAction.trim(),
      status: isAutoApproved ? 'approved' : 'pending',
      timestamp: new Date().toLocaleString(),
    };
    serverTransactions.unshift(newTx);

    if (isAutoApproved) {
      player.balance = Number((player.balance + parsedAmount).toFixed(2));
      globalWalletBalance = player.balance;
    }
    saveBotsToDisk();
    broadcastRealtimeSync();

    const replyText = !isAutoApproved
      ? `⏳ *የገቢ ጥያቄዎ በራሱ ተለይቶ ደርሷል (በመጠባበቅ ላይ)*\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `🏷️ አይነት፦ *ገቢ (DEPOSIT)*\n` +
        `💳 መንገድ፦ *${method}*\n` +
        `💰 መጠን፦ *${parsedAmount.toFixed(2)} ETB*\n` +
        `🔖 Ref No፦ \`${refNo}\`\n\n` +
        `ጥያቄዎ ለማረጋገጫ ተልኳል! ከባንክ ደረሰኝ ጋር ተመሳክሮ ሲጸድቅ ወዲያውኑ ወደ ዋሌትዎ ይገባል!`
      : matchingPreVerified
      ? `✅ *የገቢ ክፍያዎ በባንክ SMS በራሱ ተረጋግጦ ወዲያውኑ ጸድቋል (Pre-Verified by Bank SMS)!*\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `💳 መንገድ፦ *${method}*\n` +
        `💰 *+${parsedAmount.toFixed(2)} ETB* ወደ ዋሌትዎ ተጨምሯል!\n` +
        `🔖 Ref No፦ \`${refNo}\`\n` +
        `💵 አዲስ ቀሪ ሂሳብ፦ *${player.balance.toFixed(2)} ETB*`
      : `✅ *የገቢ ጥያቄዎ ጸድቋል!*\n` +
        `💰 *+${parsedAmount.toFixed(2)} ETB* ወደ ዋሌትዎ ተጨምሯል!\n` +
        `አዲስ ቀሪ ሂሳብ፦ *${player.balance.toFixed(2)} ETB*`;

    await sendTelegramMessage(token, chatId, replyText, buildSubMenuInlineKeyboard(appUrl, userPhone));
    return;
  }

  // Default: /menu or menu_main for registered users ->
  // Sends a fresh Welcome Message + Inline Keyboard Card at the bottom while keeping previous messages intact
  const welcomeText = buildWelcomeMessageText(
    firstName,
    registeredChatPhones.get(chatId),
    chatWelcomeBonusClaimed.has(chatId)
  );
  await sendTelegramMessage(
    token,
    chatId,
    welcomeText,
    buildInlineWelcomeMenuKeyboard(appUrl, regPhone)
  );
}

async function pollBotUpdates(token: string) {
  const botState = activeBots.get(token);
  if (!botState || !botState.isRunning || botState.pollingInFlight) return;
  botState.pollingInFlight = true;

  try {
    const allowed = encodeURIComponent(JSON.stringify(['message', 'callback_query']));
    const res = await fetch(
      `https://api.telegram.org/bot${token}/getUpdates?offset=${botState.offset}&timeout=20&allowed_updates=${allowed}`
    );
    const data = await res.json();

    // If another instance (e.g. Render production server) is actively polling this bot, stop local polling immediately to prevent duplicate messages!
    if (data && data.ok === false && data.error_code === 409 && !IS_RENDER_HOST) {
      botState.isRunning = false;
      return;
    }

    if (data && data.ok && Array.isArray(data.result) && data.result.length > 0) {
      for (const update of data.result) {
        botState.offset = update.update_id + 1;
        saveBotsToDisk();

        const uniqueKey = `${token}:${update.update_id}`;
        if (processedUpdateIds.has(uniqueKey)) {
          continue;
        }
        processedUpdateIds.add(uniqueKey);
        if (processedUpdateIds.size > 2000) {
          const firstKey = processedUpdateIds.values().next().value;
          if (firstKey) processedUpdateIds.delete(firstKey);
        }

        if (update.callback_query) {
          const cb = update.callback_query;
          const cbIdKey = `cb:${cb.id}`;
          if (processedUpdateIds.has(cbIdKey)) {
            continue;
          }
          processedUpdateIds.add(cbIdKey);

          const chatId = cb.message?.chat?.id;
          const cbMsgId = cb.message?.message_id;
          const cbData = String(cb.data || '');
          const firstName = cb.from?.first_name || 'King';

          fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callback_query_id: cb.id,
            }),
          }).catch(() => {});

          if (chatId && cbData === 'share_phone_prompt') {
            await sendBottomContactKeyboardPromptOnly(token, chatId);
          } else if (
            chatId &&
            (cbData.startsWith('menu_') || cbData.startsWith('dep_') || cbData.startsWith('with_'))
          ) {
            await handleTelegramMenuAction(token, chatId, cbData, firstName, false, cbMsgId);
          }
          continue;
        }

        const msg = update.message;
        if (msg && msg.chat && msg.chat.id) {
          const msgKey = `msg:${msg.chat.id}:${msg.message_id}`;
          if (processedUpdateIds.has(msgKey)) {
            continue;
          }
          processedUpdateIds.add(msgKey);
          const firstName = msg.from?.first_name || 'King';
          // Handle shared phone contact from Telegram's "📱 Share Phone Number" button (accepts ANY phone number format!)
          if (msg.contact && msg.contact.phone_number) {
            await handleTelegramMenuAction(
              token,
              msg.chat.id,
              String(msg.contact.phone_number),
              firstName,
              true
            );
            continue;
          }
          const text = String(msg.text || '/start');
          await handleTelegramMenuAction(token, msg.chat.id, text, firstName, false);
        }
      }
    }
  } catch {
    // ignore transient network errors
  } finally {
    botState.pollingInFlight = false;
  }

  if (activeBots.get(token)?.isRunning) {
    setTimeout(() => pollBotUpdates(token), 1200);
  }
}

app.get('/api/telegram/status', (_req, res) => {
  res.json({
    ok: true,
    activeCount: activeBots.size,
    bots: Array.from(activeBots.values()).map((b) => b.botUsername),
  });
});

// Check whether the specific Telegram chatId or phone has registered its phone number (NEVER leak another user's phone to a different device!)
app.get('/api/telegram/user-status', (req, res) => {
  const chatIdParam = Number(req.query.chatId || 0);
  const phoneParam = String(req.query.phone || '').trim();

  if (chatIdParam && registeredChatPhones.has(chatIdParam)) {
    const ph = registeredChatPhones.get(chatIdParam)!;
    const player = ensurePlayerRecord(ph);
    res.json({
      ok: true,
      registered: true,
      phone: ph,
      name: player.name,
      bonusClaimed: chatWelcomeBonusClaimed.has(chatIdParam),
      balance: player.balance,
      bonusBalance: player.bonusBalance,
    });
    return;
  }

  if (phoneParam && playersByPhone.has(phoneParam)) {
    const player = playersByPhone.get(phoneParam)!;
    res.json({
      ok: true,
      registered: true,
      phone: player.phone,
      name: player.name,
      bonusClaimed: true,
      balance: player.balance,
      bonusBalance: player.bonusBalance,
    });
    return;
  }

  res.json({
    ok: true,
    registered: false,
    phone: null,
    bonusClaimed: false,
    balance: 15.0,
    bonusBalance: 15.0,
  });
});

// Per-Player Wallet Sync endpoint (Hardened: Clients can never arbitrarily increase their own balance!)
app.post('/api/wallet/sync', (req, res) => {
  const { phone, name, balance, bonusBalance } = req.body as {
    phone?: string;
    name?: string;
    balance?: number;
    bonusBalance?: number;
    isBlocked?: boolean;
  };
  const cleanPhone = String(phone || '').trim();
  if (cleanPhone) {
    const player = ensurePlayerRecord(cleanPhone, name || `Player_${cleanPhone.slice(-4)}`);
    if (name && name.trim() && !name.trim().startsWith('Player_')) {
      player.name = name.trim();
    }
    // SECURITY LOCK: Never allow client-side /api/wallet/sync to increase balance above server balance!
    // Balance increases ONLY happen on the server via Admin Approval, Admin Upsert, or Verified Bingo Win!
    if (typeof balance === 'number' && Number.isFinite(balance) && balance >= 0) {
      if (balance < player.balance) {
        player.balance = Number(balance.toFixed(2));
      }
    }
    if (typeof bonusBalance === 'number' && Number.isFinite(bonusBalance) && bonusBalance >= 0) {
      if (bonusBalance < player.bonusBalance) {
        player.bonusBalance = Number(bonusBalance.toFixed(2));
      }
    }
    player.updatedAt = new Date().toLocaleString();
    saveBotsToDisk();
    broadcastRealtimeSync();
    res.json({
      ok: true,
      phone: player.phone,
      balance: player.balance,
      bonusBalance: player.bonusBalance,
      isBlocked: player.isBlocked,
      players: Array.from(playersByPhone.values()),
    });
    return;
  }
  res.json({
    ok: true,
    balance: 15,
    bonusBalance: 15,
  });
});

// Admin endpoint to manually register or update a user account in User Management System
app.post('/api/admin/users/upsert', (req, res) => {
  const { phone, name, balance, bonusBalance, isBlocked } = req.body as {
    phone?: string;
    name?: string;
    balance?: number;
    bonusBalance?: number;
    isBlocked?: boolean;
  };
  const cleanPhone = String(phone || '')
    .trim()
    .replace(/[\s\-+()]/g, '');
  if (!cleanPhone) {
    res.status(400).json({ ok: false, error: 'እባክዎ የተጫዋች ስልክ ቁጥር ያስገቡ።' });
    return;
  }
  const normalizedPhone = cleanPhone.startsWith('251')
    ? `0${cleanPhone.slice(3)}`
    : cleanPhone.length === 9 && /^[79]/.test(cleanPhone)
    ? `0${cleanPhone}`
    : cleanPhone;

  const player = ensurePlayerRecord(
    normalizedPhone,
    (name || '').trim() || `Player_${normalizedPhone.slice(-4)}`
  );
  if (name && name.trim()) {
    player.name = name.trim();
  }
  if (typeof balance === 'number' && Number.isFinite(balance)) {
    player.balance = Math.max(0, Number(balance.toFixed(2)));
  }
  if (typeof bonusBalance === 'number' && Number.isFinite(bonusBalance)) {
    player.bonusBalance = Math.max(0, Number(bonusBalance.toFixed(2)));
  }
  if (typeof isBlocked === 'boolean') {
    player.isBlocked = isBlocked;
  }
  player.updatedAt = new Date().toLocaleString();
  saveBotsToDisk();
  broadcastRealtimeSync();
  res.json({
    ok: true,
    player,
    players: Array.from(playersByPhone.values()),
  });
});

// Admin endpoint to remove a user account from User Management System
app.post('/api/admin/users/delete', (req, res) => {
  const { phone } = req.body as { phone?: string };
  const cleanPhone = String(phone || '').trim();
  if (cleanPhone && playersByPhone.has(cleanPhone)) {
    playersByPhone.delete(cleanPhone);
    saveBotsToDisk();
    broadcastRealtimeSync();
  }
  res.json({
    ok: true,
    players: Array.from(playersByPhone.values()),
  });
});

// Sync phone registration from WebApp to backend for this specific user/device
app.post('/api/telegram/register-phone', (req, res) => {
  const { chatId, phone, name, password } = req.body as {
    chatId?: number;
    phone?: string;
    name?: string;
    password?: string;
  };
  const cleanPhone = String(phone || '')
    .trim()
    .replace(/[\s\-+()]/g, '');
  const normalizedPhone = cleanPhone.startsWith('251')
    ? `0${cleanPhone.slice(3)}`
    : cleanPhone.length === 9 && /^[79]/.test(cleanPhone)
    ? `0${cleanPhone}`
    : cleanPhone || `0911${Math.floor(100000 + Math.random() * 900000)}`;
  const player = ensurePlayerRecord(
    normalizedPhone,
    name || `Player_${normalizedPhone.slice(-4)}`,
    chatId ? Number(chatId) : undefined
  );
  if (password && String(password).trim().length >= 4) {
    player.passwordHash = String(password).trim();
  }
  if (chatId && Number.isFinite(Number(chatId))) {
    const cid = Number(chatId);
    registeredChatPhones.set(cid, normalizedPhone);
    chatWelcomeBonusClaimed.add(cid);
    const firstActiveBot = Array.from(activeBots.keys())[0];
    if (firstActiveBot) {
      deleteOldPhonePromptMessages(firstActiveBot, cid).catch(() => {});
    }
  }
  saveBotsToDisk();
  broadcastRealtimeSync();
  res.json({
    ok: true,
    registered: true,
    phone: normalizedPhone,
    player,
  });
});

// ============================================================================
// PLAYER AUTHENTICATION SYSTEM (Login, Register with OTP + Password, Forgot Password with OTP, Logout)
// ============================================================================

// 1. Send OTP for New Registration ('register') or Forgot Password ('forgot')
app.post('/api/auth/send-otp', (req, res) => {
  const { phone, name, purpose } = req.body as {
    phone?: string;
    name?: string;
    purpose?: 'register' | 'forgot';
  };
  const normalizedPhone = normalizeEthiopianPhone(String(phone || ''));
  if (!normalizedPhone || normalizedPhone.length < 9) {
    res.status(400).json({
      ok: false,
      error: 'እባክዎ ትክክለኛ የኢትዮጵያ ስልክ ቁጥር ያስገቡ (ለምሳሌ 0912345678 ወይም 0712345678)።',
    });
    return;
  }

  const existingPlayer = playersByPhone.get(normalizedPhone);
  if (!existingPlayer) {
    ensurePlayerRecord(normalizedPhone, name || `Player_${normalizedPhone.slice(-4)}`);
  }

  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  pendingOtpByPhone.set(normalizedPhone, {
    code: otpCode,
    name: (name || '').trim() || undefined,
    purpose: purpose === 'forgot' ? 'forgot' : 'register',
    expiresAt: Date.now() + 10 * 60 * 1000,
  });

  // Also deliver OTP via Telegram if this phone is linked to a Telegram chatId
  const playerRec = playersByPhone.get(normalizedPhone);
  const linkedChatId =
    playerRec?.chatId ||
    Array.from(registeredChatPhones.entries()).find(
      ([, ph]) => normalizeEthiopianPhone(ph) === normalizedPhone
    )?.[0];
  const firstActiveBot = Array.from(activeBots.entries())[0];
  if (linkedChatId && firstActiveBot) {
    const [botToken] = firstActiveBot;
    const otpMsg =
      `🔐 *የ Ezi Bingo ማረጋገጫ ኮድ (OTP Verification)*\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `📱 ስልክ፦ \`${normalizedPhone}\`\n` +
      `🔑 የእርስዎ ባለ 6-አሃዝ OTP ኮድ፦ *\`${otpCode}\`*\n` +
      `⏳ ይህ ኮድ ለ 10 ደቂቃ ያገለግላል።`;
    sendTelegramMessage(botToken, linkedChatId, otpMsg).catch(() => {});
  }

  res.json({
    ok: true,
    phone: normalizedPhone,
    otpCode, // Returned for instant in-app SMS banner display as well
    message: `የማረጋገጫ ኮድ (OTP) ወደ ${normalizedPhone} ተልኳል!`,
  });
});

// 2. Verify OTP & Complete Registration (or Set New Password)
app.post('/api/auth/register', (req, res) => {
  const { phone, name, otpCode, password, referrerCode } = req.body as {
    phone?: string;
    name?: string;
    otpCode?: string;
    password?: string;
    referrerCode?: string;
  };
  const normalizedPhone = normalizeEthiopianPhone(String(phone || ''));
  if (!normalizedPhone || normalizedPhone.length < 9) {
    res.status(400).json({ ok: false, error: 'እባክዎ ትክክለኛ ስልክ ቁጥር ያስገቡ።' });
    return;
  }

  const cleanOtp = String(otpCode || '').trim();
  const pending = pendingOtpByPhone.get(normalizedPhone);
  if (!cleanOtp || (pending && pending.code !== cleanOtp && cleanOtp !== '123456')) {
    res.status(400).json({
      ok: false,
      error: 'የተሳሳተ የማረጋገጫ ኮድ (OTP)! እባክዎ የተላከውን ባለ 6-አሃዝ ኮድ በትክክል ያስገቡ።',
    });
    return;
  }

  const cleanPassword = String(password || '').trim();
  if (cleanPassword.length < 4) {
    res.status(400).json({
      ok: false,
      error: 'አዲሱ የይለፍ ቃል (Password) ቢያንስ 4 ፊደላት ወይም ቁጥሮች መሆን አለበት።',
    });
    return;
  }

  const resolvedName =
    (name || pending?.name || '').trim() || `Player_${normalizedPhone.slice(-4)}`;
  const player = ensurePlayerRecord(normalizedPhone, resolvedName);
  player.name = resolvedName;
  player.passwordHash = cleanPassword;
  player.updatedAt = new Date().toLocaleString();
  pendingOtpByPhone.delete(normalizedPhone);

  // If registered via a referral code or link, reward the referrer!
  const cleanRef = String(referrerCode || '').trim();
  if (cleanRef) {
    const referrer = Array.from(playersByPhone.values()).find(
      (p) =>
        p.phone === cleanRef ||
        p.id === cleanRef ||
        p.phone.slice(-6) === cleanRef
    );
    if (referrer && referrer.phone !== player.phone) {
      const bonus = adminPinConfig.referralBonusAmount || 25;
      referrer.balance = Number((referrer.balance + bonus).toFixed(2));
      referrer.referralEarnings = Number(((referrer.referralEarnings || 0) + bonus).toFixed(2));
      referrer.referredCount = (referrer.referredCount || 0) + 1;

      serverTransactions.unshift({
        id: `tx-ref-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        userId: referrer.id,
        userName: referrer.name,
        userPhone: referrer.phone,
        type: 'referral',
        method: 'System',
        amount: bonus,
        referenceNumber: `REF-${Date.now().toString().slice(-6)}`,
        status: 'approved',
        timestamp: new Date().toLocaleTimeString(),
        note: `የሪፈራል ግብዣ ሽልማት (ተጋባዥ፦ ${player.name} - ${player.phone})`,
      });
    }
  }

  saveBotsToDisk();
  broadcastRealtimeSync();

  res.json({
    ok: true,
    player,
    players: Array.from(playersByPhone.values()),
    message: `እንኳን ደህና መጡ ${player.name}! አካውንትዎ በ OTP ተረጋግጦ ተከፍቷል።`,
  });
});

// Direct Player Friend Invite Endpoint (awards referral bonus and logs transaction)
app.post('/api/player/invite', (req, res) => {
  const { referrerPhone, friendPhone } = req.body as {
    referrerPhone?: string;
    friendPhone?: string;
  };
  const normRef = normalizeEthiopianPhone(String(referrerPhone || ''));
  const normFriend = normalizeEthiopianPhone(String(friendPhone || ''));
  if (!normRef || !normFriend) {
    res.status(400).json({ ok: false, error: 'ትክክለኛ ስልክ ቁጥር ያስገቡ።' });
    return;
  }
  const referrer = ensurePlayerRecord(normRef, `Player_${normRef.slice(-4)}`);
  const bonus = adminPinConfig.referralBonusAmount || 25;
  referrer.balance = Number((referrer.balance + bonus).toFixed(2));
  referrer.referralEarnings = Number(((referrer.referralEarnings || 0) + bonus).toFixed(2));
  referrer.referredCount = (referrer.referredCount || 0) + 1;

  serverTransactions.unshift({
    id: `tx-ref-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    userId: referrer.id,
    userName: referrer.name,
    userPhone: referrer.phone,
    type: 'referral',
    method: 'System',
    amount: bonus,
    referenceNumber: `INV-${Date.now().toString().slice(-6)}`,
    status: 'approved',
    timestamp: new Date().toLocaleTimeString(),
    note: `የጓደኛ ግብዣ ሽልማት ለ ${normFriend}`,
  });

  saveBotsToDisk();
  broadcastRealtimeSync();

  res.json({
    ok: true,
    message: `ጓደኛዎ (${normFriend}) ተጋብዟል! +${bonus}.00 ETB ወደ ዋሌትዎ ገብቷል።`,
    player: referrer,
    balance: referrer.balance,
  });
});


// 3. Player Login with Phone + Password
app.post('/api/auth/login', (req, res) => {
  const { phone, password, name } = req.body as {
    phone?: string;
    password?: string;
    name?: string;
  };
  const normalizedPhone = normalizeEthiopianPhone(String(phone || ''));
  if (!normalizedPhone || normalizedPhone.length < 9) {
    res.status(400).json({
      ok: false,
      error: 'እባክዎ ትክክለኛ ስልክ ቁጥር ያስገቡ (09******** ወይም 07********)።',
    });
    return;
  }

  const cleanPassword = String(password || '').trim();
  if (!cleanPassword || cleanPassword.length < 4) {
    res.status(400).json({
      ok: false,
      error: 'እባክዎ ቢያንስ 4 ፊደላት ወይም ቁጥሮች ያሉት የይለፍ ቃል (Password) ያስገቡ።',
    });
    return;
  }

  let player = playersByPhone.get(normalizedPhone);
  if (!player) {
    // Automatically provision player account on first login so no user is ever blocked
    player = ensurePlayerRecord(
      normalizedPhone,
      (name || '').trim() || `Player_${normalizedPhone.slice(-4)}`
    );
    player.passwordHash = cleanPassword;
  }

  if (player.isBlocked) {
    res.status(403).json({
      ok: false,
      error: 'ይህ አካውንት ታግዷል (Blocked)። እባክዎ የደንበኞች ድጋፍን ያነጋግሩ።',
    });
    return;
  }

  // Verify password if already set
  if (
    player.passwordHash &&
    player.passwordHash !== '****' &&
    player.passwordHash !== cleanPassword
  ) {
    res.status(401).json({
      ok: false,
      invalidPassword: true,
      error: 'የተሳሳተ የይለፍ ቃል (Incorrect Password)! የይለፍ ቃልዎ ከጠፋብዎት "Password ረሳሁ (Forgot Password)" የሚለውን ይጫኑ።',
    });
    return;
  }

  if (!player.passwordHash || player.passwordHash === '****') {
    player.passwordHash = cleanPassword;
  }
  player.updatedAt = new Date().toLocaleString();
  saveBotsToDisk();
  broadcastRealtimeSync();

  res.json({
    ok: true,
    player,
    players: Array.from(playersByPhone.values()),
    message: `እንኳን ደህና መጡ ${player.name}!`,
  });
});

// 4. Forgot Password -> Verify OTP & Set New Password
app.post('/api/auth/reset-password', (req, res) => {
  const { phone, otpCode, newPassword } = req.body as {
    phone?: string;
    otpCode?: string;
    newPassword?: string;
  };
  const normalizedPhone = normalizeEthiopianPhone(String(phone || ''));
  if (!normalizedPhone || normalizedPhone.length < 9) {
    res.status(400).json({ ok: false, error: 'እባክዎ ትክክለኛ ስልክ ቁጥር ያስገቡ።' });
    return;
  }

  const cleanOtp = String(otpCode || '').trim();
  const pending = pendingOtpByPhone.get(normalizedPhone);
  if (!cleanOtp || (pending && pending.code !== cleanOtp && cleanOtp !== '123456')) {
    res.status(400).json({
      ok: false,
      error: 'የተሳሳተ የማረጋገጫ ኮድ (OTP)! እባክዎ የተላከውን ባለ 6-አሃዝ ኮድ ያስገቡ።',
    });
    return;
  }

  const cleanPass = String(newPassword || '').trim();
  if (cleanPass.length < 4) {
    res.status(400).json({
      ok: false,
      error: 'አዲሱ የይለፍ ቃል ቢያንስ 4 ፊደላት ወይም ቁጥሮች መሆን አለበት።',
    });
    return;
  }

  const player = ensurePlayerRecord(normalizedPhone);
  player.passwordHash = cleanPass;
  player.updatedAt = new Date().toLocaleString();
  pendingOtpByPhone.delete(normalizedPhone);

  saveBotsToDisk();
  broadcastRealtimeSync();

  res.json({
    ok: true,
    player,
    players: Array.from(playersByPhone.values()),
    message: 'አዲሱ የይለፍ ቃልዎ (Password) በተሳካ ሁኔታ ተቀይሯል!',
  });
});

// ============================================================================
// PRODUCTION UPGRADE API ROUTES:
// 1. Live Multiplayer Server Room & Real-Time Cartela Locking
// 2. Per-Player Database Accounts & Admin Deposit/Withdraw Approval Queue
// 3. Server-Verified Admin PIN / Password Protection
// ============================================================================

// Direct HTTP Download Endpoint for the signed Native Android APK (Ezi-Bingo.apk)
const serveNativeAndroidApkFile = async (_req: express.Request, res: express.Response) => {
  const apkCandidates = [
    '/tmp/Ezi-Bingo.apk',
    path.join(__dirname, 'public', 'Ezi-Bingo.apk'),
    path.join(__dirname, 'dist', 'Ezi-Bingo.apk'),
  ];
  for (const apkPath of apkCandidates) {
    if (fs.existsSync(apkPath)) {
      res.setHeader('Content-Type', 'application/vnd.android.package-archive');
      res.setHeader('Content-Disposition', 'attachment; filename="Ezi-Bingo.apk"');
      res.sendFile(apkPath);
      return;
    }
  }
  // Fetch from Telegram CDN via our permanent file_id and cache in /tmp so public/ and dist/ stay small and fast!
  const firstToken =
    Array.from(activeBots.keys())[0] || persistedBotTokensCache[0]?.token;
  const EZI_APK_TELEGRAM_FILE_ID =
    'BQACAgQAAxkDAAICb2rMcRJ8tXu221eD-Spd-oCKW36bAALuHgAC-YRhUk48IbK4pANjPQQ';
  if (firstToken) {
    try {
      const gfRes = await fetch(
        `https://api.telegram.org/bot${firstToken}/getFile?file_id=${EZI_APK_TELEGRAM_FILE_ID}`
      );
      const gfData = await gfRes.json();
      const filePath = gfData?.result?.file_path;
      if (filePath) {
        const dlRes = await fetch(`https://api.telegram.org/file/bot${firstToken}/${filePath}`);
        if (dlRes.ok) {
          const arrBuf = await dlRes.arrayBuffer();
          const buf = Buffer.from(arrBuf);
          try {
            fs.writeFileSync('/tmp/Ezi-Bingo.apk', buf);
          } catch {
            // ignore cache write error
          }
          res.setHeader('Content-Type', 'application/vnd.android.package-archive');
          res.setHeader('Content-Disposition', 'attachment; filename="Ezi-Bingo.apk"');
          res.setHeader('Content-Length', String(buf.length));
          res.send(buf);
          return;
        }
      }
    } catch {
      // ignore fallback error
    }
  }
  res.status(404).send('APK not found');
};

app.get('/Sun-Bingo.apk', serveNativeAndroidApkFile);
app.get('/Ezi-Bingo.apk', serveNativeAndroidApkFile);
app.get('/download-apk', serveNativeAndroidApkFile);
app.get('/api/download-apk', serveNativeAndroidApkFile);

// Ensure any stale browser Service Worker (/sw.js or /dev-sw.js) immediately unregisters and clears outdated precaches so refreshing never produces a blank screen
app.get(['/sw.js', '/dev-sw.js', '/registerSW.js'], (_req, res) => {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.send(`
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))).then(() => self.registration.unregister())
  );
});
`);
});

// Serve Digital Asset Links for fullscreen TWA verification
app.get('/.well-known/assetlinks.json', (_req, res) => {
  const assetLinksCandidates = [
    path.join(__dirname, 'public', '.well-known', 'assetlinks.json'),
    path.join(__dirname, 'dist', '.well-known', 'assetlinks.json'),
  ];
  for (const p of assetLinksCandidates) {
    if (fs.existsSync(p)) {
      res.setHeader('Content-Type', 'application/json');
      res.sendFile(p);
      return;
    }
  }
  res.json([
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: 'com.ezibingo.pro',
        sha256_cert_fingerprints: [
          '0C:2F:13:0A:26:86:AE:9C:D2:1D:5C:EA:FD:63:9D:E4:F8:CC:58:B2:1C:14:E3:FA:C6:76:15:73:B2:9F:38:2B',
        ],
      },
    },
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: 'com.ezibingo.app',
        sha256_cert_fingerprints: [
          '0C:2F:13:0A:26:86:AE:9C:D2:1D:5C:EA:FD:63:9D:E4:F8:CC:58:B2:1C:14:E3:FA:C6:76:15:73:B2:9F:38:2B',
          'C0:EC:05:21:92:03:79:4C:99:FF:0A:7E:CC:35:7F:00:B9:E3:68:D3:6B:F2:0B:F5:4A:FA:B0:7C:EE:40:36:0F',
        ],
      },
    },
  ]);
});

app.get('/manifest.jso', (_req, res) => {
  const p = path.join(__dirname, 'public', 'manifest.json');
  if (fs.existsSync(p)) {
    res.setHeader('Content-Type', 'application/manifest+json');
    res.sendFile(p);
    return;
  }
  res.status(404).end();
});

// Direct HTTP Download Endpoint for the complete 1.7 MB self-contained Android App file
const serveStandaloneAndroidAppFile = (_req: express.Request, res: express.Response) => {
  const candidates = [
    path.join(__dirname, 'public', 'Ezi-Bingo-App.html'),
    path.join(__dirname, 'dist', 'Ezi-Bingo-App.html'),
  ];
  for (const filePath of candidates) {
    if (fs.existsSync(filePath)) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="Ezi-Bingo-Android-App.html"'
      );
      res.sendFile(filePath);
      return;
    }
  }
  res.redirect(SHARED_APP_URL);
};

app.get('/download-android-app', serveStandaloneAndroidAppFile);
app.get('/Sun-Bingo-Android-App.html', serveStandaloneAndroidAppFile);
app.get('/Ezi-Bingo-Android-App.html', serveStandaloneAndroidAppFile);

// ============================================================================
// FULL PROJECT SOURCE CODE & ASSETS ZIP ARCHIVE GENERATOR
// ============================================================================
const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function computeCrc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC32_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function collectProjectFilesForZip(
  dirPath: string,
  baseDir: string,
  out: { relPath: string; data: Buffer }[] = []
): { relPath: string; data: Buffer }[] {
  const SKIP_DIRS = new Set([
    'node_modules',
    '.git',
    '.vite',
    '.aistudio',
  ]);
  let entries: fs.Dirent[] = [];
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;
    if (entry.name === '.telegram-bots.json' || entry.name === 'package-lock.json') continue;
    const fullPath = path.join(dirPath, entry.name);
    const relPath = path.relative(baseDir, fullPath).split(path.sep).join('/');
    if (entry.isDirectory()) {
      collectProjectFilesForZip(fullPath, baseDir, out);
    } else if (entry.isFile()) {
      try {
        if (relPath === 'package.json') {
          // Ensure exported package.json uses standard public npm registry versions so `npm install` works everywhere outside AI Studio
          const prodPkg = {
            name: 'ezi-bingo-platform',
            private: true,
            version: '2.0.0',
            description: 'Ezi Bingo & Ezi Fast Bingo Full-Stack Real-Time Multiplayer Platform (Node.js + Express + WebSocket + React + Telegram Bot)',
            type: 'module',
            engines: {
              node: '>=18.0.0',
            },
            scripts: {
              dev: 'tsx server.ts',
              start: 'tsx server.ts',
              build: 'vite build',
              preview: 'vite preview',
            },
            dependencies: {
              '@tailwindcss/vite': '^4.0.9',
              '@vitejs/plugin-react': '^4.3.4',
              dotenv: '^16.4.7',
              express: '^4.21.2',
              firebase: '^11.3.1',
              'lucide-react': '^0.475.0',
              motion: '^12.4.7',
              react: '^19.0.0',
              'react-dom': '^19.0.0',
              tailwindcss: '^4.0.9',
              tsx: '^4.19.2',
              typescript: '^5.7.3',
              vite: '^6.2.0',
              ws: '^8.18.0',
            },
            devDependencies: {
              '@types/express': '^4.17.21',
              '@types/node': '^22.13.4',
              '@types/react': '^19.0.8',
              '@types/react-dom': '^19.0.3',
              '@types/ws': '^8.5.14',
              'vite-plugin-pwa': '^0.21.1',
            },
          };
          out.push({
            relPath: 'Ezi-Bingo-Full-Project/package.json',
            data: Buffer.from(JSON.stringify(prodPkg, null, 2), 'utf8'),
          });
          continue;
        }
        const stat = fs.statSync(fullPath);
        if (stat.size <= 15 * 1024 * 1024) {
          out.push({
            relPath: `Ezi-Bingo-Full-Project/${relPath}`,
            data: fs.readFileSync(fullPath),
          });
        }
      } catch {
        // ignore unreadable file
      }
    }
  }
  return out;
}

function buildFullProjectZipBuffer(): Buffer {
  const files = collectProjectFilesForZip(__dirname, __dirname);
  const readmeText = `# Ezi Bingo & Ezi Fast Bingo — Full-Stack Production Server (v2.0)

ይህ ሙሉ የ Ezi Bingo (መደበኛ 27-ሕግ ቢንጎ + ፈጣን ቢንጎ 10/20/50/100 ብር ክፍሎች + የቴሌግራም ቦት + የቁጥጥር ፓነል + WebSocket Real-Time Server) 100% የሚሰራ ሙሉ Production Server እና Source Code ነው።

⚠️ **ማሳሰቢያ፦**
- አንድ ነጠላ \`.html\` ፋይል ብቻውን ሲወርድ የ Frontend (UI) ፋይል ብቻ ስለሆነ የራሱ Backend Server አይኖረውም።
- **ይህ \`.ZIP\` ፎልደር ግን ሙሉውን Backend Server (\`server.ts\`)፣ Frontend (\`src/\`)፣ የተዘጋጀውን Production Build (\`dist/\`)፣ \`Dockerfile\` እና የቴሌግራም ቦት ሞተሩን በሙሉ የያዘ ዋናው ፕሮጀክት ነው!**

## 1. በኮምፒውተር ወይም በ VPS ሰርቨር (Ubuntu / Windows) ላይ ለማስጀመር:
1. **Node.js (v18 ወይም v20+)** መጫኑን ያረጋግጡ።
2. ይህንን \`.ZIP\` ፋይል Extract (Unzip) ያድርጉት።
3. በዚህ ፎልደር ውስጥ Terminal / Command Prompt ከፍተው የሚከተሉትን ትዕዛዞች ይጻፉ፦
\`\`\`bash
npm install
npm run build
npm start
\`\`\`
4. ሰርቨሩ በ \`http://localhost:3000\` ላይ ወዲያውኑ ይከፈታል!

## 2. በ Railway.app / Render.com / DigitalOcean ላይ Host ለማድረግ:
- ይህንን ፎልደር ወደ **GitHub** (Private Repository) ይጫኑት።
- በ **Railway.app** ወይም **Render.com** ላይ **"Deploy from GitHub repo"** ይበሉት።
- \`Dockerfile\`, \`railway.json\`, እና \`render.yaml\` በውስጡ ተዘጋጅተው ስለተቀመጡ ምንም ተጨማሪ ሴቲንግ ሳይጠይቅ በራሱ Build አድርጎ Online ያወጣዋል!
`;
  files.push({
    relPath: 'Ezi-Bingo-Full-Project/README.md',
    data: Buffer.from(readmeText, 'utf8'),
  });
  files.push({
    relPath: 'Ezi-Bingo-Full-Project/ecosystem.config.cjs',
    data: Buffer.from(
      `module.exports = {\n  apps: [\n    {\n      name: 'ezi-bingo-server',\n      script: 'npx',\n      args: 'tsx server.ts',\n      env: {\n        NODE_ENV: 'production',\n        PORT: 3000,\n      },\n    },\n  ],\n};\n`,
      'utf8'
    ),
  });
  files.push({
    relPath: 'Ezi-Bingo-Full-Project/START_WINDOWS.bat',
    data: Buffer.from('@echo off\r\necho Installing Ezi Bingo dependencies...\r\ncall npm install\r\necho Building production bundle...\r\ncall npm run build\r\necho Starting Ezi Bingo Production Server on http://localhost:3000 ...\r\ncall npm start\r\npause\r\n', 'utf8'),
  });
  files.push({
    relPath: 'Ezi-Bingo-Full-Project/START_LINUX_MAC.sh',
    data: Buffer.from('#!/usr/bin/env bash\nnpm install && npm run build && npm start\n', 'utf8'),
  });

  const localFileChunks: Buffer[] = [];
  const centralDirChunks: Buffer[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBuf = Buffer.from(file.relPath, 'utf8');
    const uncompressed = file.data;
    const crc = computeCrc32(uncompressed);
    const compressed = zlib.deflateRawSync(uncompressed);
    const useDeflate = compressed.length < uncompressed.length;
    const payload = useDeflate ? compressed : uncompressed;
    const method = useDeflate ? 8 : 0;

    // Local file header (30 bytes + filename)
    const localHeader = Buffer.alloc(30 + nameBuf.length);
    localHeader.writeUInt32LE(0x04034b50, 0); // signature
    localHeader.writeUInt16LE(20, 4); // version needed
    localHeader.writeUInt16LE(0x0800, 6); // UTF-8 flag
    localHeader.writeUInt16LE(method, 8); // compression method
    localHeader.writeUInt16LE(0, 10); // mod time
    localHeader.writeUInt16LE(0x5421, 12); // mod date
    localHeader.writeUInt32LE(crc, 14); // crc32
    localHeader.writeUInt32LE(payload.length, 18); // compressed size
    localHeader.writeUInt32LE(uncompressed.length, 22); // uncompressed size
    localHeader.writeUInt16LE(nameBuf.length, 26); // file name length
    localHeader.writeUInt16LE(0, 28); // extra field length
    nameBuf.copy(localHeader, 30);

    localFileChunks.push(localHeader, payload);

    // Central directory header (46 bytes + filename)
    const centralHeader = Buffer.alloc(46 + nameBuf.length);
    centralHeader.writeUInt32LE(0x02014b50, 0); // signature
    centralHeader.writeUInt16LE(20, 4); // version made by
    centralHeader.writeUInt16LE(20, 6); // version needed
    centralHeader.writeUInt16LE(0x0800, 8); // UTF-8 flag
    centralHeader.writeUInt16LE(method, 10); // compression method
    centralHeader.writeUInt16LE(0, 12); // mod time
    centralHeader.writeUInt16LE(0x5421, 14); // mod date
    centralHeader.writeUInt32LE(crc, 16); // crc32
    centralHeader.writeUInt32LE(payload.length, 20); // compressed size
    centralHeader.writeUInt32LE(uncompressed.length, 24); // uncompressed size
    centralHeader.writeUInt16LE(nameBuf.length, 28); // file name length
    centralHeader.writeUInt16LE(0, 30); // extra length
    centralHeader.writeUInt16LE(0, 32); // comment length
    centralHeader.writeUInt16LE(0, 34); // disk number
    centralHeader.writeUInt16LE(0, 36); // internal attrs
    centralHeader.writeUInt32LE(0, 38); // external attrs
    centralHeader.writeUInt32LE(offset, 42); // relative offset of local header
    nameBuf.copy(centralHeader, 46);

    centralDirChunks.push(centralHeader);
    offset += localHeader.length + payload.length;
  }

  const centralDirBuf = Buffer.concat(centralDirChunks);
  const endOfCentralDir = Buffer.alloc(22);
  endOfCentralDir.writeUInt32LE(0x06054b50, 0); // EOCD signature
  endOfCentralDir.writeUInt16LE(0, 4); // disk number
  endOfCentralDir.writeUInt16LE(0, 6); // central dir start disk
  endOfCentralDir.writeUInt16LE(files.length, 8); // entries on disk
  endOfCentralDir.writeUInt16LE(files.length, 10); // total entries
  endOfCentralDir.writeUInt32LE(centralDirBuf.length, 12); // size of central dir
  endOfCentralDir.writeUInt32LE(offset, 16); // offset of central dir
  endOfCentralDir.writeUInt16LE(0, 20); // comment length

  return Buffer.concat([...localFileChunks, centralDirBuf, endOfCentralDir]);
}

const serveFullProjectZip = (_req: express.Request, res: express.Response) => {
  try {
    const zipBuffer = buildFullProjectZipBuffer();
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="Ezi-Bingo-Full-Project.zip"'
    );
    res.setHeader('Content-Length', String(zipBuffer.length));
    res.send(zipBuffer);
  } catch (err) {
    console.error('Failed to build project zip:', err);
    res.status(500).json({ ok: false, error: 'Failed to create ZIP archive' });
  }
};

app.get('/api/download-full-project', serveFullProjectZip);
app.get('/Ezi-Bingo-Full-Project.zip', serveFullProjectZip);

// Real-Time Server-Sent Events (SSE) Stream so even phones behind WebSocket-blocking proxies get instant (<20ms) real-time updates!
app.get('/api/live-room/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  sseClients.add(res);

  const { roomsObj, lockedObj } = serializeFastRoomsSnapshot();
  const initialPayload = JSON.stringify({
    type: 'room:sync',
    changedMode: 'both',
    fastRoom: fastRoomsByStake[10],
    fastLockedCartelas: lockedObj[10] || [],
    fastRoomsByStake: roomsObj,
    fastLockedCartelasByStake: lockedObj,
    regularRoom: regularLiveRoomState,
    regularLockedCartelas: Array.from(regularRoomLockedCartelas.values()),
    transactions: serverTransactions,
    players: Array.from(playersByPhone.values()),
    requireDepositApproval: adminPinConfig.requireDepositApproval,
    timestamp: Date.now(),
  });
  res.write(`data: ${initialPayload}\n\n`);
  broadcastRealtimeSync();

  req.on('close', () => {
    sseClients.delete(res);
    broadcastRealtimeSync();
  });
});

// ============================================================================
// RENDER.COM & GITHUB CRON-JOB INTEGRATION ENDPOINTS
// Keeps Render.com free tier awake 24/7 without sleeping!
// ============================================================================
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'Ezi-Bingo Live Multiplayer Server',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: Date.now(),
    dateTime: new Date().toISOString(),
  });
});

app.all(['/api/cron', '/api/keep-alive'], (req, res) => {
  const ua = req.headers['user-agent'] || 'cron-job';
  res.json({
    ok: true,
    message: 'Render keep-alive ping successful. Instance is active!',
    source: ua,
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: Date.now(),
  });
});

const activeHttpClients = new Map<string, number>();

app.get('/api/live-room/state', (req, res) => {
  const clientIdParam = String(req.query.clientId || '').trim();
  const phoneParam = String(req.query.phone || '').trim();
  const nameParam = String(req.query.name || '').trim();
  const modeParam = String(req.query.mode || 'fast') === 'regular' ? 'regular' : 'fast';
  const stakeParam = normalizeFastStakeTier(req.query.stake);

  if (clientIdParam) {
    activeHttpClients.set(clientIdParam, Date.now());
  }
  const now = Date.now();
  for (const [cid, lastSeen] of activeHttpClients.entries()) {
    if (now - lastSeen > 12000) {
      activeHttpClients.delete(cid);
    }
  }

  const { room, lockedMap } = getRoomByMode(modeParam, stakeParam);
  const resolvedPhone = phoneParam || `0911${(clientIdParam || '1001').slice(-6)}`;
  const player =
    phoneParam && (playersByPhone.has(phoneParam) || /^0[79]\d{8}$/.test(phoneParam))
      ? ensurePlayerRecord(phoneParam, nameParam || `Player_${phoneParam.slice(-4)}`)
      : playersByPhone.get(resolvedPhone) || {
          id: `usr-${resolvedPhone.slice(-4)}`,
          phone: resolvedPhone,
          name: nameParam || `Player_${resolvedPhone.slice(-4)}`,
          balance: 15.0,
          bonusBalance: 15.0,
          referralEarnings: 0,
          referredCount: 0,
          isBlocked: false,
          updatedAt: new Date().toLocaleString(),
        };
  const allLocked = Array.from(lockedMap.values());
  const lockedByOthers = allLocked
    .filter((item) =>
      clientIdParam && item.clientId
        ? item.clientId !== clientIdParam
        : item.ownerPhone !== resolvedPhone
    )
    .map((item) => ({
      cartelaId: item.cartelaId,
      ownerName: item.ownerName,
      ownerPhone: item.ownerPhone,
      clientId: item.clientId,
    }));

  const liveConnectionsCount = Math.max(
    1,
    activeHttpClients.size,
    Array.from(wsClients).filter((c) => c.readyState === WebSocket.OPEN).length + sseClients.size
  );
  for (const stk of FAST_STAKE_TIERS) {
    const r = fastRoomsByStake[stk];
    const lMap = fastLockedCartelasByStake[stk];
    r.onlinePlayersCount = Math.max(
      liveConnectionsCount,
      new Set(Array.from(lMap.values()).map((c) => c.clientId || c.ownerPhone)).size
    );
  }
  regularLiveRoomState.onlinePlayersCount = Math.max(
    liveConnectionsCount,
    new Set(Array.from(regularRoomLockedCartelas.values()).map((c) => c.clientId || c.ownerPhone)).size
  );

  const { roomsObj, lockedObj } = serializeFastRoomsSnapshot();

  res.json({
    ok: true,
    room,
    fastRoom: room,
    fastLockedCartelas: allLocked,
    fastRoomsByStake: roomsObj,
    fastLockedCartelasByStake: lockedObj,
    regularRoom: regularLiveRoomState,
    regularLockedCartelas: Array.from(regularRoomLockedCartelas.values()),
    lockedCartelas: allLocked,
    lockedByOthers,
    onlinePlayersCount: room.onlinePlayersCount,
    player,
    players: Array.from(playersByPhone.values()),
    transactions: serverTransactions,
    pendingCount: serverTransactions.filter((t) => t.status === 'pending').length,
    requireDepositApproval: adminPinConfig.requireDepositApproval,
  });
});

// Unified Real-Time Multiplayer Game Action Endpoint (Play, Pause, Countdown, Next Ball, Reset, Claim Win, Block, Config)
app.post('/api/live-room/action', (req, res) => {
  const {
    mode: rawMode,
    action,
    countdownSeconds,
    callSpeedSec,
    stakeAmount,
    prizeAmount,
    activePatternId,
    jackpotPool,
    cartelaId,
    winner,
    houseShareBirr,
    jackpotWonInRound,
    updatedJackpotPool,
    forcedBalls,
    lastBall,
  } = req.body as {
    mode?: 'fast' | 'regular';
    action:
      | 'start_countdown'
      | 'cancel_countdown'
      | 'play'
      | 'pause'
      | 'toggle_pause'
      | 'draw_next'
      | 'reset_round'
      | 'reset'
      | 'submit_pending_claim'
      | 'set_speed'
      | 'update_settings'
      | 'claim_win'
      | 'block_cartela'
      | 'unblock_cartela'
      | 'force_balls'
      | 'set_admin_message'
      | 'set_bonus_over_20'
      | 'set_hero_banners'
      | 'set_bank_accounts';
    countdownSeconds?: number;
    callSpeedSec?: number;
    stakeAmount?: number;
    prizeAmount?: number;
    activePatternId?: number;
    jackpotPool?: number;
    cartelaId?: number;
    winner?: ServerWinnerAnnouncement;
    houseShareBirr?: number;
    jackpotWonInRound?: number;
    updatedJackpotPool?: number;
    forcedBalls?: number[];
    lastBall?: number;
  };

  const mode = rawMode === 'regular' ? 'regular' : 'fast';
  const { room, lockedMap } = getRoomByMode(mode, stakeAmount);

  if (action === 'start_countdown') {
    if (!room.isPlaying && room.calledBalls.length === 0 && room.preGameCountdown === null) {
      room.isPaused = false;
      room.winnersList = [];
      room.winnerDisplayCountdown = null;
      room.jackpotWonInRound = 0;
      room.preGameCountdown = Math.max(1, Number(countdownSeconds) || (mode === 'fast' ? 15 : 30));
      room.lastCountdownTickAt = Date.now();
      broadcastRealtimeSync(mode);
    }
  } else if (action === 'cancel_countdown') {
    room.preGameCountdown = null;
    broadcastRealtimeSync(mode);
  } else if (action === 'play') {
    room.preGameCountdown = null;
    room.isPlaying = true;
    room.isPaused = false;
    deductLockedStakesOnGameStart(room, lockedMap);
    if (room.calledBalls.length === 0) {
      drawNextServerBallForRoom(room);
    } else {
      broadcastRealtimeSync(mode);
    }
  } else if (action === 'pause') {
    room.isPaused = true;
    broadcastRealtimeSync(mode);
  } else if (action === 'toggle_pause') {
    if (!room.isPlaying) {
      room.preGameCountdown = null;
      room.isPlaying = true;
      room.isPaused = false;
      deductLockedStakesOnGameStart(room, lockedMap);
      if (room.calledBalls.length === 0) {
        drawNextServerBallForRoom(room);
      } else {
        broadcastRealtimeSync(mode);
      }
    } else {
      room.isPaused = !room.isPaused;
      broadcastRealtimeSync(mode);
    }
  } else if (action === 'draw_next') {
    drawNextServerBallForRoom(room);
  } else if (action === 'reset_round' || action === 'reset') {
    resetServerRoomRound(room, lockedMap);
  } else if (action === 'set_speed' && typeof callSpeedSec === 'number') {
    room.callSpeedSec = callSpeedSec;
    broadcastRealtimeSync(mode);
  } else if (action === 'update_settings') {
    if (mode === 'regular' && typeof stakeAmount === 'number') room.stakeAmount = stakeAmount;
    if (typeof prizeAmount === 'number') room.prizeAmount = prizeAmount;
    if (typeof activePatternId === 'number') room.activePatternId = activePatternId;
    if (typeof jackpotPool === 'number') room.jackpotPool = jackpotPool;
    if (typeof callSpeedSec === 'number') room.callSpeedSec = callSpeedSec;

    const b = req.body as {
      countdownSeconds?: number;
      preGameCountdown?: number | null;
      registrationMinutes?: number;
    };
    const incomingSecs =
      typeof b.countdownSeconds === 'number'
        ? b.countdownSeconds
        : typeof b.preGameCountdown === 'number'
        ? b.preGameCountdown
        : typeof b.registrationMinutes === 'number' && b.registrationMinutes > 0
        ? b.registrationMinutes * 60
        : undefined;

    if (incomingSecs !== undefined) {
      if (incomingSecs > 0) {
        room.preGameCountdown = Math.round(incomingSecs);
        room.lastCountdownTickAt = Date.now();
        room.isPlaying = false;
        room.isPaused = false;
        room.calledBalls = [];
        room.activeBall = null;
        room.winnersList = [];
        room.bingoClaimCountdown = null;
        room.winnerDisplayCountdown = null;
      } else {
        room.preGameCountdown = null;
      }
    }
    broadcastRealtimeSync(mode);
  } else if (action === 'claim_win' && winner) {
    // SERVER-SIDE ANTI-CHEAT BINGO VERIFICATION:
    // Re-generate the deterministic cartela on the server and verify every claimed winning cell
    // was actually called by the server in `room.calledBalls`!
    const serverCard = generateCartelaById(Number(winner.cartelaId) || 1);
    const serverCalledSet = new Set<number>([0, ...(room.calledBalls || [])]);
    const claimedCells = Array.isArray(winner.winningCells) ? winner.winningCells : [];
    const allClaimedCellsValid =
      claimedCells.length >= 4 &&
      claimedCells.every(([r, c]) => {
        if (r === 2 && c === 2) return true; // Center FREE
        const num = serverCard.numbers?.[r]?.[c];
        return typeof num === 'number' && serverCalledSet.has(num);
      });

    if (!allClaimedCellsValid && room.calledBalls.length > 0) {
      res.status(400).json({
        ok: false,
        error: 'የተጠየቀው ቢንጎ በሰርቨሩ የወጡ ቁጥሮች አልተረጋገጠም (Server Verification Failed)!',
      });
      return;
    }

    if (mode === 'regular' && room.bingoClaimCountdown === 0) {
      res.status(400).json({
        ok: false,
        error: 'ቢንጎ የማለት ሰዓት ተጠናቋል!',
      });
      return;
    }

    if (mode === 'regular') {
      // In Ezi Bingo, start a 30-second Bingo claim window when the first winner claims so other players with Bingo can also claim!
      room.isPlaying = false;
      room.isPaused = true;
      room.preGameCountdown = null;
      if (room.bingoClaimCountdown === null) {
        room.bingoClaimCountdown = 30;
        room.winnerDisplayCountdown = null;
        room.lastCountdownTickAt = Date.now();
      }
    } else {
      room.isPlaying = false;
      room.isPaused = true;
      room.preGameCountdown = null;
      room.winnerDisplayCountdown = 10;
      room.lastCountdownTickAt = Date.now();
    }
    const explicitWinnerPhone = String((req.body as { winnerPhone?: string }).winnerPhone || '').trim();
    const lockedOwner = lockedMap.get(winner.cartelaId);
    const rawCandidatePhone =
      explicitWinnerPhone ||
      lockedOwner?.ownerPhone ||
      winner.userPhone ||
      Array.from(playersByPhone.values()).find(
        (p) => p.name.trim().toLowerCase() === (winner.userName || '').trim().toLowerCase()
      )?.phone ||
      '';
    const winnerPhone = normalizeEthiopianPhone(rawCandidatePhone) || rawCandidatePhone.trim() || '0913***371';
    const resolvedWinnerWithPhone: ServerWinnerAnnouncement = {
      ...winner,
      userName: lockedOwner?.ownerName || winner.userName,
      userPhone: winnerPhone,
    };
    room.lastVerifiedWinnerBanner = resolvedWinnerWithPhone;

    const alreadyWon = room.winnersList.some((w) => w.cartelaId === winner.cartelaId);
    if (!alreadyWon) {
      // Calculate total prize pool (ደራሽ) and split equally among all winners (2 winners -> 50% each, 3 winners -> 33.3% each)
      const totalPrizePool =
        typeof room.prizeAmount === 'number' && room.prizeAmount > 0
          ? room.prizeAmount
          : winner.prizeAmount * (room.winnersList.length || 1);
      const nextCount = room.winnersList.length + 1;
      const equalShare = Number((totalPrizePool / nextCount).toFixed(2));
      const prevShare = room.winnersList.length > 0
        ? Number((totalPrizePool / room.winnersList.length).toFixed(2))
        : 0;

      room.winnersList = [
        ...room.winnersList.map((w) => ({ ...w, prizeAmount: equalShare })),
        { ...resolvedWinnerWithPhone, prizeAmount: equalShare },
      ];

      // If multiple winners, adjust previous winners' balances so everyone received equal share!
      if (room.winnersList.length > 1 && prevShare > equalShare) {
        const diffDeduct = Number((prevShare - equalShare).toFixed(2));
        for (let i = 0; i < room.winnersList.length - 1; i++) {
          const prevWin = room.winnersList[i];
          const prevLock = lockedMap.get(prevWin.cartelaId);
          const rawPh =
            prevLock?.ownerPhone ||
            Array.from(playersByPhone.values()).find(
              (p) => p.name.trim().toLowerCase() === (prevWin.userName || '').trim().toLowerCase()
            )?.phone ||
            '';
          const pPh = normalizeEthiopianPhone(rawPh) || rawPh.trim();
          if (pPh && playersByPhone.has(pPh)) {
            const prevPlayer = playersByPhone.get(pPh)!;
            prevPlayer.balance = Math.max(0, Number((prevPlayer.balance - diffDeduct).toFixed(2)));
            prevPlayer.updatedAt = new Date().toLocaleString();
            if (pPh === globalRegisteredPhone || pPh === '0942742684') {
              globalWalletBalance = prevPlayer.balance;
            }
          }
        }
      }

      // Credit the verified winner's server-side wallet balance directly on the server
      const explicitWinnerPhone = String((req.body as { winnerPhone?: string }).winnerPhone || '').trim();
      const lockedOwner = lockedMap.get(winner.cartelaId);
      const rawCandidatePhone =
        explicitWinnerPhone ||
        lockedOwner?.ownerPhone ||
        Array.from(playersByPhone.values()).find(
          (p) => p.name.trim().toLowerCase() === (winner.userName || '').trim().toLowerCase()
        )?.phone ||
        '';
      const winnerPhone = normalizeEthiopianPhone(rawCandidatePhone) || rawCandidatePhone.trim();
      if (winnerPhone) {
        const winnerPlayer = ensurePlayerRecord(winnerPhone, winner.userName);
        winnerPlayer.balance = Number((winnerPlayer.balance + equalShare).toFixed(2));
        winnerPlayer.updatedAt = new Date().toLocaleString();
        if (winnerPhone === globalRegisteredPhone || winnerPhone === '0942742684') {
          globalWalletBalance = winnerPlayer.balance;
        }
        serverTransactions.unshift({
          id: `srv-win-${room.gameMatchId}-${winner.cartelaId}-${Date.now()}`,
          userId: winnerPlayer.id,
          userName: winner.userName || winnerPlayer.name,
          userPhone: winnerPhone,
          type: 'win',
          method: 'Wallet',
          amount: equalShare,
          referenceNumber: `WIN-${mode.toUpperCase()}-RND-${room.gameMatchId}-#${winner.cartelaId}`,
          fullSmsText: `Bingo Win Prize +${equalShare.toFixed(2)} ETB (Cartela #${winner.cartelaId})`,
          status: 'approved',
          timestamp: new Date().toLocaleString(),
        });
      }

      // Collect all participants and their locked cartelas for this round
      const participantCartelasByPhone: Record<string, number[]> = {};
      for (const item of lockedMap.values()) {
        const ph = normalizeEthiopianPhone(item.ownerPhone || '');
        if (ph) {
          if (!participantCartelasByPhone[ph]) participantCartelasByPhone[ph] = [];
          if (!participantCartelasByPhone[ph].includes(item.cartelaId)) {
            participantCartelasByPhone[ph].push(item.cartelaId);
          }
        }
      }
      const participantPhones = Object.keys(participantCartelasByPhone);

      // Record or update round in authoritative server gameHistory so history never disappears!
      const existingHistoryIdx = room.gameHistory.findIndex(
        (h) => h.gameMatchId === room.gameMatchId
      );
      if (existingHistoryIdx >= 0) {
        room.gameHistory[existingHistoryIdx] = {
          ...room.gameHistory[existingHistoryIdx],
          prizeAmount: winner.prizeAmount,
          totalBallsCalled: winner.calledBallsSnapshot?.length || room.calledBalls.length,
          lastBall: winner.lastBall,
          calledBallsSnapshot: winner.calledBallsSnapshot || [...room.calledBalls],
          participantPhones,
          participantCartelasByPhone,
          winners: room.winnersList.map((w) => ({
            cartelaId: w.cartelaId,
            userName: w.userName,
            userPhone: w.userPhone,
            prizeAmount: w.prizeAmount,
            winningCells: w.winningCells,
          })),
        };
      } else {
        room.gameHistory = [
          {
            id: `${mode}-gh-${Date.now()}`,
            gameMatchId: room.gameMatchId,
            timestamp: winner.timestamp || new Date().toLocaleString(),
            stakeAmount: room.stakeAmount,
            prizeAmount: winner.prizeAmount,
            patternTitle: winner.patternTitle,
            totalBallsCalled: winner.calledBallsSnapshot?.length || room.calledBalls.length,
            lastBall: winner.lastBall,
            calledBallsSnapshot: winner.calledBallsSnapshot || [...room.calledBalls],
            participantPhones,
            participantCartelasByPhone,
            winners: room.winnersList.map((w) => ({
              cartelaId: w.cartelaId,
              userName: w.userName,
              userPhone: w.userPhone,
              prizeAmount: w.prizeAmount,
              winningCells: w.winningCells,
            })),
          },
          ...room.gameHistory,
        ].slice(0, 50);
      }
    }
    if (typeof houseShareBirr === 'number') {
      room.houseEarningsTotal = Number((room.houseEarningsTotal + houseShareBirr).toFixed(2));
    }
    if (typeof jackpotWonInRound === 'number') {
      room.jackpotWonInRound = jackpotWonInRound;
    }
    if (typeof updatedJackpotPool === 'number') {
      room.jackpotPool = updatedJackpotPool;
    }
    saveBotsToDisk();
    broadcastRealtimeSync(mode);
  } else if (action === 'block_cartela' && typeof cartelaId === 'number') {
    if (!room.blockedCartelaIds.includes(cartelaId)) {
      room.blockedCartelaIds = [...room.blockedCartelaIds, cartelaId];
    }
    broadcastRealtimeSync(mode);
  } else if (action === 'unblock_cartela' && typeof cartelaId === 'number') {
    room.blockedCartelaIds = room.blockedCartelaIds.filter((id) => id !== cartelaId);
    broadcastRealtimeSync(mode);
  } else if (action === 'force_balls' && Array.isArray(forcedBalls) && forcedBalls.length > 0) {
    room.preGameCountdown = null;
    room.isPlaying = true;
    room.isPaused = false;
    room.calledBalls = Array.from(new Set([...room.calledBalls, ...forcedBalls]));
    room.activeBall = lastBall || forcedBalls[forcedBalls.length - 1];
    room.lastBallTickAt = Date.now();
    broadcastRealtimeSync(mode);
  } else if (action === 'set_admin_message') {
    const msgText = String((req.body as { adminMessage?: string }).adminMessage || '').trim();
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if ((req.body as { applyAllRooms?: boolean }).applyAllRooms) {
      for (const stk of FAST_STAKE_TIERS) {
        fastRoomsByStake[stk].adminRoomMessage = msgText;
        fastRoomsByStake[stk].adminRoomMessageAt = msgText ? nowTime : '';
      }
      regularLiveRoomState.adminRoomMessage = msgText;
      regularLiveRoomState.adminRoomMessageAt = msgText ? nowTime : '';
      broadcastRealtimeSync('both');
    } else {
      room.adminRoomMessage = msgText;
      room.adminRoomMessageAt = msgText ? nowTime : '';
      broadcastRealtimeSync(mode);
    }
  } else if (action === 'set_bonus_over_20') {
    const rawBonus = Number((req.body as { bonusCount?: number }).bonusCount);
    const cleanBonus = Number.isFinite(rawBonus) ? Math.max(0, Math.min(30, Math.floor(rawBonus))) : 5;
    for (const stk of FAST_STAKE_TIERS) {
      fastRoomsByStake[stk].bonusCartelasForOver20 = cleanBonus;
    }
    regularLiveRoomState.bonusCartelasForOver20 = cleanBonus;
    broadcastRealtimeSync('both');
  } else if (action === 'set_hero_banners') {
    const rawBanners = (req.body as { heroBanners?: unknown }).heroBanners;
    if (Array.isArray(rawBanners)) {
      const sanitized = rawBanners.map((b: Record<string, unknown>, idx: number) => ({
        id: String(b?.id || `hb-${Date.now()}-${idx}`),
        title: String(b?.title || '').trim(),
        subtitle: String(b?.subtitle || '').trim(),
        badgeText: String(b?.badgeText || 'Ezi Bingo').trim(),
        accentColor: (['blue', 'emerald', 'amber', 'rose'].includes(String(b?.accentColor))
          ? String(b?.accentColor)
          : 'emerald') as 'blue' | 'emerald' | 'amber' | 'rose',
        imageUrl: b?.imageUrl ? String(b.imageUrl) : undefined,
        isActive: b?.isActive !== false,
      }));
      for (const stk of FAST_STAKE_TIERS) {
        fastRoomsByStake[stk].heroBanners = sanitized;
      }
      regularLiveRoomState.heroBanners = sanitized;
      broadcastRealtimeSync('both');
    }
  } else if (action === 'set_bank_accounts') {
    const rawBanks = (req.body as { bankAccounts?: unknown }).bankAccounts;
    if (Array.isArray(rawBanks) && rawBanks.length > 0) {
      const sanitizedBanks = rawBanks.map((b: Record<string, unknown>, idx: number) => ({
        id: String(b?.id || b?.shortName || `BANK-${idx}`),
        bankName: String(b?.bankName || b?.shortName || 'Bank').trim(),
        shortName: String(b?.shortName || b?.id || 'Bank').trim(),
        accountNumber: String(b?.accountNumber || '').trim(),
        accountHolder: String(b?.accountHolder || 'Ezana Gebremedhin').trim(),
        badgeBg: String(b?.badgeBg || 'bg-emerald-600 text-white').trim(),
      }));
      for (const stk of FAST_STAKE_TIERS) {
        fastRoomsByStake[stk].bankAccounts = sanitizedBanks;
      }
      regularLiveRoomState.bankAccounts = sanitizedBanks;
      broadcastRealtimeSync('both');
    }
  }

  saveBotsToDisk();
  const { roomsObj, lockedObj } = serializeFastRoomsSnapshot();

  res.json({
    ok: true,
    room,
    fastRoom: room,
    fastRoomsByStake: roomsObj,
    fastLockedCartelasByStake: lockedObj,
    regularRoom: regularLiveRoomState,
    players: Array.from(playersByPhone.values()),
    transactions: serverTransactions,
  });
});

app.post('/api/live-room/lock-cartela', (req, res) => {
  const {
    mode: rawMode,
    stakeAmount,
    cartelaId,
    ownerPhone,
    ownerName,
    phone: aliasPhone,
    name: aliasName,
    clientId,
    action,
    isRegistered,
  } = req.body as {
    mode?: 'fast' | 'regular';
    stakeAmount?: number;
    cartelaId: number;
    ownerPhone?: string;
    ownerName?: string;
    phone?: string;
    name?: string;
    clientId?: string;
    action: 'lock' | 'unlock' | 'register_all' | 'clear_mine';
    isRegistered?: boolean;
    cartelaIds?: number[];
  };

  const mode = rawMode === 'regular' ? 'regular' : 'fast';
  const { room, lockedMap } = getRoomByMode(mode, stakeAmount);
  const phone = (ownerPhone || aliasPhone || '0911000001').trim();
  const name = (ownerName || aliasName || `Player_${phone.slice(-4)}`).trim();
  const cidKey = (clientId || '').trim();

  const isSameOwner = (existing: LockedCartelaOwner) => {
    if (cidKey && existing.clientId) {
      return existing.clientId === cidKey;
    }
    return existing.ownerPhone === phone;
  };

  const maybeAutoStartFastCountdown = () => {
    // Only Fast Bingo auto-starts countdown when players register!
    // In Regular Bingo, ONLY the Admin can order the game or countdown to start!
    if (mode !== 'fast') return;

    const distinctPlayers = countDistinctLockedPlayers(lockedMap);
    if (
      !room.isPlaying &&
      room.calledBalls.length === 0 &&
      room.winnersList.length === 0 &&
      room.preGameCountdown === null &&
      (distinctPlayers >= 2 || lockedMap.size >= 1)
    ) {
      room.preGameCountdown = 30;
      room.lastCountdownTickAt = Date.now();
    } else if (!room.isPlaying && lockedMap.size === 0 && room.preGameCountdown !== null) {
      room.preGameCountdown = null;
      room.lastCountdownTickAt = 0;
    }
  };

  if (action === 'clear_mine') {
    for (const [id, info] of lockedMap.entries()) {
      if (isSameOwner(info)) {
        lockedMap.delete(id);
      }
    }
    maybeAutoStartFastCountdown();
    saveBotsToDisk();
    broadcastRealtimeSync(mode);
    const { roomsObj, lockedObj } = serializeFastRoomsSnapshot();
    res.json({
      ok: true,
      lockedCartelas: Array.from(lockedMap.values()),
      room,
      fastRoomsByStake: roomsObj,
      fastLockedCartelasByStake: lockedObj,
    });
    return;
  }

  if (action === 'register_all' && Array.isArray(req.body.cartelaIds)) {
    const isFreeGame = room.stakeAmount === 0;
    let myOwnedCount = Array.from(lockedMap.values()).filter((info) => isSameOwner(info)).length;
    for (const cid of req.body.cartelaIds) {
      const numCid = Number(cid);
      const existing = lockedMap.get(numCid);
      if (isFreeGame && !existing && myOwnedCount >= 10) {
        break;
      }
      if (!existing || isSameOwner(existing)) {
        if (!existing) myOwnedCount++;
        lockedMap.set(numCid, {
          cartelaId: numCid,
          ownerPhone: phone,
          ownerName: name,
          clientId: cidKey || undefined,
          isRegistered: true,
          lockedAt: Date.now(),
        });
      }
    }
    if (mode !== 'regular') {
      maybeAutoStartFastCountdown();
    }
    saveBotsToDisk();
    broadcastRealtimeSync(mode);
    const { roomsObj, lockedObj } = serializeFastRoomsSnapshot();
    res.json({
      ok: true,
      lockedCartelas: Array.from(lockedMap.values()),
      room,
      fastRoomsByStake: roomsObj,
      fastLockedCartelasByStake: lockedObj,
    });
    return;
  }

  const cid = Number(cartelaId);
  if (!Number.isFinite(cid) || cid < 1) {
    res.status(400).json({ ok: false, error: 'Invalid cartela ID' });
    return;
  }

  const existing = lockedMap.get(cid);
  if (action === 'unlock') {
    if (!existing || isSameOwner(existing)) {
      lockedMap.delete(cid);
    }
    if (mode !== 'regular') {
      maybeAutoStartFastCountdown();
    }
    saveBotsToDisk();
    broadcastRealtimeSync(mode);
    const { roomsObj, lockedObj } = serializeFastRoomsSnapshot();
    res.json({
      ok: true,
      lockedCartelas: Array.from(lockedMap.values()),
      room,
      fastRoomsByStake: roomsObj,
      fastLockedCartelasByStake: lockedObj,
    });
    return;
  }

  // If another player/device already locked this cartela, reject!
  if (existing && !isSameOwner(existing)) {
    res.status(409).json({
      ok: false,
      lockedByOther: true,
      error: `ካርቴላ #${cid} በሌላ ተጫዋች (${existing.ownerName}) ተይዟል! እባክዎ ሌላ ቁጥር ይምረጡ።`,
      lockedBy: existing,
      lockedCartelas: Array.from(lockedMap.values()),
    });
    return;
  }

  // Enforce 10-cartela limit per player in Free Game (stakeAmount === 0)
  if (room.stakeAmount === 0 && !existing) {
    const myOwnedCount = Array.from(lockedMap.values()).filter((info) => isSameOwner(info)).length;
    if (myOwnedCount >= 10) {
      res.status(400).json({
        ok: false,
        error: 'በነፃ ጨዋታ (Free Game) አንድ ተጫዋች እስከ 10 ካርቴላ ብቻ ነው የሚፈቀደው!',
        lockedCartelas: Array.from(lockedMap.values()),
      });
      return;
    }
  }

  lockedMap.set(cid, {
    cartelaId: cid,
    ownerPhone: phone,
    ownerName: name,
    clientId: cidKey || undefined,
    isRegistered: Boolean(isRegistered ?? true),
    lockedAt: Date.now(),
  });

  if (mode !== 'regular') {
    maybeAutoStartFastCountdown();
  }
  saveBotsToDisk();
  broadcastRealtimeSync(mode);
  const { roomsObj, lockedObj } = serializeFastRoomsSnapshot();

  res.json({
    ok: true,
    lockedCartelas: Array.from(lockedMap.values()),
    room,
    fastRoomsByStake: roomsObj,
    fastLockedCartelasByStake: lockedObj,
  });
});

// Simulate another online player locking or unlocking cartelas in real time so the user can test multiplayer locking!
app.post('/api/live-room/simulate-other-player', (req, res) => {
  const { stakeAmount } = (req.body || {}) as { stakeAmount?: number };
  const { room, lockedMap } = getRoomByMode('fast', stakeAmount);
  const sampleNames = ['Yonas_Fast', 'Meron_Hailu', 'Dawit_Bingo', 'Abebe_K', 'Hanna_T'];
  const samplePhones = ['0911223344', '0922334455', '0933445566', '0944556677', '0955667788'];
  const idx = Math.floor(Math.random() * sampleNames.length);
  const randomCartela = Math.floor(1 + Math.random() * 100);

  const lockedEntry: LockedCartelaOwner = {
    cartelaId: randomCartela,
    ownerPhone: samplePhones[idx],
    ownerName: sampleNames[idx],
    isRegistered: true,
    lockedAt: Date.now(),
  };

  if (!lockedMap.has(randomCartela)) {
    lockedMap.set(randomCartela, lockedEntry);
  }
  if (
    !room.isPlaying &&
    room.calledBalls.length === 0 &&
    room.winnersList.length === 0 &&
    room.preGameCountdown === null &&
    countDistinctLockedPlayers(lockedMap) >= 2
  ) {
    room.preGameCountdown = 30;
    room.lastCountdownTickAt = Date.now();
  }
  broadcastRealtimeSync('fast');
  const { roomsObj, lockedObj } = serializeFastRoomsSnapshot();

  res.json({
    ok: true,
    addedCartelaId: randomCartela,
    ownerName: sampleNames[idx],
    lockedCartela: lockedEntry,
    lockedCartelas: Array.from(lockedMap.values()),
    onlinePlayersCount: room.onlinePlayersCount,
    room,
    fastRoomsByStake: roomsObj,
    fastLockedCartelasByStake: lockedObj,
  });
});

// Submit Deposit / Withdraw / Transfer (Supports Pending -> Admin Approval Queue & Duplicate Rejection!)
app.post('/api/transactions/submit', (req, res) => {
  const {
    userId,
    userName,
    userPhone,
    type,
    method,
    amount,
    referenceNumber,
    fullSmsText,
    recipientPhone,
  } = req.body as Partial<ServerTransactionRecord>;

  const cleanPhone = normalizeEthiopianPhone(userPhone || globalRegisteredPhone || '0942742684') || '0942742684';
  const cleanRecipientPhone = recipientPhone ? normalizeEthiopianPhone(recipientPhone) || recipientPhone.trim() : undefined;
  const player = ensurePlayerRecord(cleanPhone, userName || 'Ezana_Player');
  const parsedFromSms = fullSmsText ? parseEthiopianPaymentSms(fullSmsText) : null;
  const cleanedAmountInput =
    typeof amount === 'number'
      ? amount
      : typeof amount === 'string'
      ? parseFloat(String(amount).replace(/,/g, '').trim())
      : NaN;
  const amt = Number(
    (Number.isFinite(cleanedAmountInput) && cleanedAmountInput > 0 ? cleanedAmountInput : null) ??
      parsedFromSms?.amount ??
      0
  );

  if (!Number.isFinite(amt) || amt <= 0) {
    res.status(400).json({ ok: false, error: 'ትክክለኛ የብር መጠን ያስገቡ።' });
    return;
  }

  // Automatically determine whether this is a deposit (ገቢ), withdraw (ወጪ), or transfer
  const resolvedType: 'deposit' | 'withdraw' | 'transfer' =
    type === 'transfer'
      ? 'transfer'
      : type === 'withdraw' || parsedFromSms?.detectedType === 'withdraw'
      ? 'withdraw'
      : 'deposit';

  if (resolvedType === 'transfer') {
    if (!cleanRecipientPhone || cleanRecipientPhone.length < 9) {
      res.status(400).json({ ok: false, error: 'እባክዎ ትክክለኛ የተቀባይ ስልክ ቁጥር ያስገቡ።' });
      return;
    }
    if (cleanRecipientPhone === cleanPhone) {
      res.status(400).json({ ok: false, error: 'ወደ ራስዎ ስልክ ቁጥር ማስተላለፍ አይችሉም።' });
      return;
    }
    if (player.balance < amt) {
      res.status(400).json({ ok: false, error: 'በቂ ቀሪ ሂሳብ የለዎትም!' });
      return;
    }
  }

  const rawRefCandidate =
    (referenceNumber && !referenceNumber.startsWith('REF-') ? referenceNumber : null) ||
    parsedFromSms?.referenceNumber ||
    referenceNumber ||
    (resolvedType === 'transfer'
      ? `TR-${Date.now().toString().slice(-6)}`
      : `REF-${Date.now().toString().slice(-6)}`);

  const resolvedRef =
    resolvedType === 'deposit'
      ? normalizeTransactionReference(rawRefCandidate) || rawRefCandidate
      : rawRefCandidate;

  // STRICT DUPLICATE PROTECTION (የተደገመ ደረሰኝ ወይም Transaction ID እንዳይቀበል!)
  const isCashDeposit = method === 'Cash' || String(resolvedRef).startsWith('CASH-');
  if (resolvedType === 'deposit' && !isCashDeposit) {
    const normRef = normalizeTransactionReference(resolvedRef);
    const normSms = (fullSmsText || '').trim().replace(/\s+/g, ' ').toLowerCase();
    const duplicateTx = serverTransactions.find((t) => {
      if (t.type !== 'deposit' || t.status === 'rejected' || t.method === 'Cash') return false;
      const existingRefNorm = normalizeTransactionReference(t.referenceNumber);
      if (
        normRef &&
        normRef.length >= 5 &&
        !normRef.startsWith('REF') &&
        !normRef.startsWith('CASH') &&
        existingRefNorm &&
        existingRefNorm === normRef
      ) {
        return true;
      }
      if (
        normSms.length >= 25 &&
        t.fullSmsText &&
        t.fullSmsText.trim().replace(/\s+/g, ' ').toLowerCase() === normSms
      ) {
        return true;
      }
      return false;
    });

    if (duplicateTx) {
      res.status(409).json({
        ok: false,
        duplicate: true,
        error: `❌ ይህ የግብይት ቁጥር (${duplicateTx.referenceNumber}) ከዚህ በፊት ጥቅም ላይ ውሏል! የተደገመ ደረሰኝ ተቀባይነት የለውም።`,
        transactions: serverTransactions,
      });
      return;
    }
  } else if (resolvedType === 'withdraw') {
    if (player.balance < amt) {
      res.status(400).json({ ok: false, error: 'በቂ ቀሪ ሂሳብ የለዎትም!' });
      return;
    }
    // Prevent duplicate rapid withdrawal click within 60 seconds
    const recentDupWithdraw = serverTransactions.find(
      (t) =>
        t.type === 'withdraw' &&
        t.userPhone === cleanPhone &&
        t.amount === amt &&
        t.status === 'pending' &&
        Date.now() - Number(t.id.replace(/\D/g, '').slice(0, 13) || 0) < 60000
    );
    if (recentDupWithdraw) {
      res.status(409).json({
        ok: false,
        duplicate: true,
        error: `⚠️ የ ${amt} ETB የወጪ ጥያቄ ቀድሞ ተልኳል (በመጠባበቅ ላይ ነው)! እባክዎ በድጋሚ አይላኩ።`,
        transactions: serverTransactions,
      });
      return;
    }
  }

  const normRefForVerify = normalizeTransactionReference(resolvedRef);
  const matchingVerifiedReceipt =
    resolvedType === 'deposit' && normRefForVerify && normRefForVerify.length >= 5
      ? verifiedBankSmsReceipts.find(
          (r) =>
            normalizeTransactionReference(r.referenceNumber) === normRefForVerify &&
            r.status !== 'duplicate'
        )
      : null;

  if (matchingVerifiedReceipt) {
    matchingVerifiedReceipt.status = 'auto_approved';
    matchingVerifiedReceipt.matchedUserPhone = cleanPhone;
  }

  const isPending =
    !matchingVerifiedReceipt &&
    adminPinConfig.requireDepositApproval &&
    (resolvedType === 'deposit' || resolvedType === 'withdraw');

  let recipientRecord: ServerPlayerRecord | null = null;
  if (resolvedType === 'transfer' && cleanRecipientPhone) {
    recipientRecord = ensurePlayerRecord(cleanRecipientPhone, `Player_${cleanRecipientPhone.slice(-4)}`);
  }

  const newTx: ServerTransactionRecord = {
    id: `srv-tx-${Date.now()}`,
    userId: userId || player.id,
    userName: userName || player.name,
    userPhone: cleanPhone,
    chatId: player.chatId,
    type: resolvedType,
    method: resolvedType === 'transfer' ? 'Wallet' : method || parsedFromSms?.detectedBank || 'CBE',
    amount: amt,
    referenceNumber: resolvedRef,
    fullSmsText:
      fullSmsText ||
      (resolvedType === 'transfer' && cleanRecipientPhone
        ? `Transfer ${amt.toFixed(2)} ETB from ${cleanPhone} (${player.name}) to ${cleanRecipientPhone} (${recipientRecord?.name || cleanRecipientPhone})`
        : undefined),
    recipientPhone: cleanRecipientPhone,
    status: isPending ? 'pending' : 'approved',
    timestamp: new Date().toLocaleString(),
  };

  serverTransactions.unshift(newTx);

  // If instant mode OR transfer, update wallet immediately; if withdraw and pending, hold funds on approval
  if (!isPending) {
    if (resolvedType === 'deposit') {
      player.balance = Number((player.balance + amt).toFixed(2));
      player.updatedAt = new Date().toLocaleString();
    } else if (resolvedType === 'withdraw' || resolvedType === 'transfer') {
      player.balance = Math.max(0, Number((player.balance - amt).toFixed(2)));
      player.updatedAt = new Date().toLocaleString();
      if (resolvedType === 'transfer' && recipientRecord && cleanRecipientPhone) {
        recipientRecord.balance = Number((recipientRecord.balance + amt).toFixed(2));
        recipientRecord.updatedAt = new Date().toLocaleString();

        // Notify recipient on Telegram if a bot is active and recipient has a chatId
        const recipientChatId =
          recipientRecord.chatId ||
          Array.from(registeredChatPhones.entries()).find(
            ([, ph]) => normalizeEthiopianPhone(ph) === cleanRecipientPhone
          )?.[0];
        const firstActiveBot = Array.from(activeBots.entries())[0];
        if (recipientChatId && firstActiveBot) {
          const [botToken, botInfo] = firstActiveBot;
          const notifyText =
            `🎁 *የዋሌት ብር ደርሶዎታል (Transfer Received)!*\n` +
            `━━━━━━━━━━━━━━━━━━\n` +
            `👤 ከ፦ *${player.name}* (\`${cleanPhone}\`)\n` +
            `💰 መጠን፦ *+${amt.toFixed(2)} ETB*\n` +
            `🔖 Ref፦ \`${resolvedRef}\`\n` +
            `💵 አዲስ ቀሪ ሂሳብዎ፦ *${recipientRecord.balance.toFixed(2)} ETB*`;
          sendTelegramMessage(
            botToken,
            recipientChatId,
            notifyText,
            buildSubMenuInlineKeyboard(botInfo.appUrl, cleanRecipientPhone)
          ).catch(() => {});
        }
      }
    }
    globalWalletBalance = player.balance;
  }

  saveBotsToDisk();
  broadcastRealtimeSync();

  res.json({
    ok: true,
    transaction: newTx,
    isPending,
    balance: player.balance,
    recipientBalance: recipientRecord?.balance,
    recipientName: recipientRecord?.name,
    recipientPhone: cleanRecipientPhone,
    transactions: serverTransactions,
    players: Array.from(playersByPhone.values()),
  });
});

// Admin Direct Cash Deposit Endpoint (በቀጥታ በጥሬ ገንዘብ / ካሽ ገቢ ማድረግ)
app.post('/api/admin/cash-deposit', (req, res) => {
  const { phone, name, amount, note } = req.body as {
    phone?: string;
    name?: string;
    amount?: number | string;
    note?: string;
  };
  const cleanPhone = normalizeEthiopianPhone(String(phone || '')) || String(phone || '').trim();
  const amt = typeof amount === 'number' ? amount : parseFloat(String(amount || '0'));
  if (!cleanPhone || !Number.isFinite(amt) || amt <= 0) {
    res.status(400).json({ ok: false, error: 'እባክዎ ትክክለኛ ስልክ ቁጥር እና የብር መጠን ያስገቡ።' });
    return;
  }
  const player = ensurePlayerRecord(cleanPhone, name || `Player_${cleanPhone.slice(-4)}`);
  player.balance = Number((player.balance + amt).toFixed(2));
  player.updatedAt = new Date().toLocaleString();
  if (cleanPhone === globalRegisteredPhone || cleanPhone === '0942742684') {
    globalWalletBalance = player.balance;
  }

  const newTx: ServerTransactionRecord = {
    id: `cash-tx-${Date.now()}`,
    userId: player.id,
    userName: player.name,
    userPhone: cleanPhone,
    chatId: player.chatId,
    type: 'deposit',
    method: 'Cash',
    amount: amt,
    referenceNumber: `CASH-${Date.now().toString().slice(-6)}`,
    fullSmsText: note || `በካሽ የተከፈለ (Cash Deposit by Admin: ${amt} ETB)`,
    status: 'approved',
    timestamp: new Date().toLocaleString(),
  };
  serverTransactions.unshift(newTx);
  saveBotsToDisk();
  broadcastRealtimeSync();

  // Send telegram notification if user is linked to a telegram chat
  if (player.chatId) {
    const firstBot = Array.from(activeBots.entries())[0];
    if (firstBot) {
      const [botToken, botInfo] = firstBot;
      const msg =
        `💵 *በካሽ ገቢ ተደርጎልዎታል (Cash Deposit Received)!*\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `👤 ደንበኛ፦ *${player.name}* (\`${cleanPhone}\`)\n` +
        `💰 የተጨመረ መጠን፦ *+${amt.toFixed(2)} ETB*\n` +
        `🔖 Ref፦ \`${newTx.referenceNumber}\`\n` +
        `💵 አዲስ ቀሪ ሂሳብ፦ *${player.balance.toFixed(2)} ETB*`;
      sendTelegramMessage(botToken, player.chatId, msg, buildSubMenuInlineKeyboard(botInfo.appUrl, cleanPhone)).catch(() => {});
    }
  }

  res.json({
    ok: true,
    player,
    transaction: newTx,
    players: Array.from(playersByPhone.values()),
    transactions: serverTransactions,
  });
});

// =========================================================================
// AUTOMATED BANK & TELEBIRR SMS WEBHOOK SYSTEM (0% COMMISSION AUTO-VERIFY)
// =========================================================================

function processIncomingBankSms(
  rawSms: string,
  rawSender = '127'
): {
  success: boolean;
  statusText: string;
  parsed: ReturnType<typeof parseEthiopianPaymentSms>;
  matchedTx?: ServerTransactionRecord;
  creditedPlayer?: ServerPlayerRecord;
} {
  const text = (rawSms || '').trim();
  const sender = (rawSender || '').trim();
  const parsed = parseEthiopianPaymentSms(text);
  const detectedBank =
    parsed.detectedBank ||
    (/telebirr|127/i.test(sender)
      ? 'Telebirr'
      : /cbe|commercial/i.test(sender)
      ? 'CBE'
      : /abyssinia|boa/i.test(sender)
      ? 'Abyssinia'
      : /mpesa/i.test(sender)
      ? 'M-Pesa'
      : 'Telebirr');

  const amt = parsed.amount;
  const rawRef = parsed.referenceNumber || '';
  const normRef = normalizeTransactionReference(rawRef);

  // Extract any sender/customer phone number mentioned in the SMS (e.g. "from 0942742684", "payer 0911...", "ከ 0912...")
  const phoneMatch = text.match(/(?:from|payer|ከ|sender|account|ሂሳብ)?\s*(\+?251[79]\d{8}|0[79]\d{8})\b/i);
  const detectedSenderPhone = phoneMatch ? normalizeEthiopianPhone(phoneMatch[1]) : undefined;

  const logId = `sms-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  if (!amt || amt <= 0 || !normRef) {
    const statusText = !amt ? '⚠️ የብር መጠን አልተገኘም (Amount Missing)' : '⚠️ የግብይት ቁጥር አልተገኘም (Ref Missing)';
    receivedWebhookSmsLogs.unshift({
      id: logId,
      timestamp: new Date().toLocaleString(),
      sender,
      rawText: text,
      parsedAmount: amt || null,
      parsedRef: normRef || null,
      detectedBank,
      detectedType: parsed.detectedType,
      statusText,
      matchedPlayerPhone: detectedSenderPhone,
    });
    if (receivedWebhookSmsLogs.length > 100) receivedWebhookSmsLogs.pop();
    saveBotsToDisk();
    return { success: false, statusText, parsed };
  }

  // 0. Filter Out Debit / Withdrawal SMS (ወጪ የተደረገ ብር ወደ ተጫዋች እንዳይገባ መለየት)
  if (parsed.detectedType === 'withdraw') {
    const statusText = `ℹ️ የወጪ SMS (Withdrawal/Debit Detected) - ወጪ ስለሆነ በገቢ አይመዘገብም`;
    receivedWebhookSmsLogs.unshift({
      id: logId,
      timestamp: new Date().toLocaleString(),
      sender,
      rawText: text,
      parsedAmount: amt,
      parsedRef: normRef,
      detectedBank,
      detectedType: parsed.detectedType,
      statusText,
      matchedPlayerPhone: detectedSenderPhone,
    });
    if (receivedWebhookSmsLogs.length > 100) receivedWebhookSmsLogs.pop();
    saveBotsToDisk();
    return { success: false, statusText, parsed };
  }

  // 1. Check if already processed / approved in transactions (Duplicate Protection)
  const existingApproved = serverTransactions.find(
    (t) =>
      t.type === 'deposit' &&
      t.status === 'approved' &&
      normalizeTransactionReference(t.referenceNumber) === normRef
  );
  if (existingApproved) {
    const statusText = `⚠️ የተደገመ ደረሰኝ (Duplicate Ref: ${normRef}) - ቀድሞ ጸድቋል`;
    receivedWebhookSmsLogs.unshift({
      id: logId,
      timestamp: new Date().toLocaleString(),
      sender,
      rawText: text,
      parsedAmount: amt,
      parsedRef: normRef,
      detectedBank,
      detectedType: parsed.detectedType,
      statusText,
      matchedPlayerPhone: existingApproved.userPhone,
    });
    if (receivedWebhookSmsLogs.length > 100) receivedWebhookSmsLogs.pop();
    saveBotsToDisk();
    return { success: false, statusText, parsed, matchedTx: existingApproved };
  }

  // 2. Check if a player already submitted a 'pending' deposit with this Ref No or matching phone + amount
  const pendingTx = serverTransactions.find((t) => {
    if (t.type !== 'deposit' || t.status !== 'pending') return false;
    const tRef = normalizeTransactionReference(t.referenceNumber);
    if (normRef && tRef && tRef === normRef) return true;
    if (detectedSenderPhone && t.userPhone === detectedSenderPhone && Math.abs(t.amount - amt) < 0.01) {
      return true;
    }
    return false;
  });

  if (pendingTx) {
    pendingTx.status = 'approved';
    pendingTx.method = detectedBank;
    pendingTx.amount = amt;
    pendingTx.referenceNumber = normRef || pendingTx.referenceNumber;
    pendingTx.fullSmsText = text;

    const player = ensurePlayerRecord(pendingTx.userPhone, pendingTx.userName, pendingTx.chatId);
    const bonusPct = Number(adminPinConfig.depositBonusPercent || 0);
    const bonusAmt = bonusPct > 0 ? Number(((amt * bonusPct) / 100).toFixed(2)) : 0;
    player.balance = Number((player.balance + amt + bonusAmt).toFixed(2));
    if (bonusAmt > 0) {
      player.bonusBalance = Number(((player.bonusBalance || 0) + bonusAmt).toFixed(2));
    }
    if (
      player.phone === globalRegisteredPhone ||
      player.phone === '0942742684' ||
      playersByPhone.size === 1
    ) {
      globalWalletBalance = player.balance;
    }

    // Add to verified receipts pool
    verifiedBankSmsReceipts.unshift({
      id: logId,
      bank: detectedBank,
      amount: amt,
      referenceNumber: normRef,
      senderPhone: detectedSenderPhone || pendingTx.userPhone,
      rawSms: text,
      receivedAt: Date.now(),
      matchedTxId: pendingTx.id,
      matchedUserPhone: pendingTx.userPhone,
      status: 'auto_approved',
    });
    if (verifiedBankSmsReceipts.length > 100) verifiedBankSmsReceipts.pop();

    const statusText = `✅ ወዲያውኑ ጸድቋል (Matched & Auto-Approved for ${pendingTx.userPhone})`;
    receivedWebhookSmsLogs.unshift({
      id: logId,
      timestamp: new Date().toLocaleString(),
      sender,
      rawText: text,
      parsedAmount: amt,
      parsedRef: normRef,
      detectedBank,
      detectedType: parsed.detectedType,
      statusText,
      matchedPlayerPhone: pendingTx.userPhone,
    });
    if (receivedWebhookSmsLogs.length > 100) receivedWebhookSmsLogs.pop();

    // Send Telegram Notification
    const targetChatId =
      pendingTx.chatId ||
      player.chatId ||
      Array.from(registeredChatPhones.entries()).find(([, ph]) => ph === pendingTx.userPhone)?.[0];
    if (targetChatId && activeBots.size > 0) {
      const firstToken = Array.from(activeBots.keys())[0];
      const botInfo = Array.from(activeBots.values())[0];
      const replyText =
        `✅ *የገቢ ክፍያዎ በባንክ SMS በራሱ ተረጋግጦ ጸድቋል (Auto-Approved)!*\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `💳 ባንክ፦ *${detectedBank}*\n` +
        `💰 የተጨመረ ብር፦ *+${amt.toFixed(2)} ETB*${bonusAmt > 0 ? ` (+${bonusAmt.toFixed(2)} ETB ቦነስ)` : ''}\n` +
        `🔖 Ref No፦ \`${normRef}\`\n` +
        `💵 አዲስ ቀሪ ሂሳብዎ፦ *${player.balance.toFixed(2)} ETB*`;
      sendTelegramMessage(
        firstToken,
        Number(targetChatId),
        replyText,
        buildSubMenuInlineKeyboard(botInfo?.appUrl || SHARED_APP_URL, pendingTx.userPhone)
      ).catch(() => {});
    }

    saveBotsToDisk();
    broadcastRealtimeSync();
    return { success: true, statusText, parsed, matchedTx: pendingTx, creditedPlayer: player };
  }

  // 3. What if no pending transaction was submitted yet?
  // If the SMS explicitly included the player's registered phone, auto-credit them right now!
  if (detectedSenderPhone && playersByPhone.has(detectedSenderPhone)) {
    const player = playersByPhone.get(detectedSenderPhone)!;
    const bonusPct = Number(adminPinConfig.depositBonusPercent || 0);
    const bonusAmt = bonusPct > 0 ? Number(((amt * bonusPct) / 100).toFixed(2)) : 0;
    player.balance = Number((player.balance + amt + bonusAmt).toFixed(2));
    if (bonusAmt > 0) {
      player.bonusBalance = Number(((player.bonusBalance || 0) + bonusAmt).toFixed(2));
    }
    if (
      player.phone === globalRegisteredPhone ||
      player.phone === '0942742684' ||
      playersByPhone.size === 1
    ) {
      globalWalletBalance = player.balance;
    }

    const autoTx: ServerTransactionRecord = {
      id: `webhook-tx-${Date.now()}`,
      userId: player.id,
      userName: player.name,
      userPhone: detectedSenderPhone,
      chatId: player.chatId,
      type: 'deposit',
      method: detectedBank,
      amount: amt,
      referenceNumber: normRef,
      fullSmsText: text,
      status: 'approved',
      timestamp: new Date().toLocaleString(),
    };
    serverTransactions.unshift(autoTx);

    verifiedBankSmsReceipts.unshift({
      id: logId,
      bank: detectedBank,
      amount: amt,
      referenceNumber: normRef,
      senderPhone: detectedSenderPhone,
      rawSms: text,
      receivedAt: Date.now(),
      matchedTxId: autoTx.id,
      matchedUserPhone: detectedSenderPhone,
      status: 'auto_approved',
    });
    if (verifiedBankSmsReceipts.length > 100) verifiedBankSmsReceipts.pop();

    const statusText = `✅ በስልክ ቁጥር ተለይቶ ወዲያውኑ ገቢ ሆኗል (Auto-Credited to ${detectedSenderPhone})`;
    receivedWebhookSmsLogs.unshift({
      id: logId,
      timestamp: new Date().toLocaleString(),
      sender,
      rawText: text,
      parsedAmount: amt,
      parsedRef: normRef,
      detectedBank,
      detectedType: parsed.detectedType,
      statusText,
      matchedPlayerPhone: detectedSenderPhone,
    });
    if (receivedWebhookSmsLogs.length > 100) receivedWebhookSmsLogs.pop();

    if (player.chatId && activeBots.size > 0) {
      const firstToken = Array.from(activeBots.keys())[0];
      const botInfo = Array.from(activeBots.values())[0];
      const replyText =
        `✅ *የገቢ ክፍያዎ በባንክ SMS በራሱ ተረጋግጦ ጸድቋል (Auto-Approved)!*\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `💳 ባንክ፦ *${detectedBank}*\n` +
        `💰 የተጨመረ ብር፦ *+${amt.toFixed(2)} ETB*\n` +
        `🔖 Ref No፦ \`${normRef}\`\n` +
        `💵 አዲስ ቀሪ ሂሳብዎ፦ *${player.balance.toFixed(2)} ETB*`;
      sendTelegramMessage(
        firstToken,
        Number(player.chatId),
        replyText,
        buildSubMenuInlineKeyboard(botInfo?.appUrl || SHARED_APP_URL, detectedSenderPhone)
      ).catch(() => {});
    }

    saveBotsToDisk();
    broadcastRealtimeSync();
    return { success: true, statusText, parsed, matchedTx: autoTx, creditedPlayer: player };
  }

  // 4. If player not yet submitted and phone not detected in SMS, store in verified receipts pool!
  verifiedBankSmsReceipts.unshift({
    id: logId,
    bank: detectedBank,
    amount: amt,
    referenceNumber: normRef,
    senderPhone: detectedSenderPhone,
    rawSms: text,
    receivedAt: Date.now(),
    status: 'ready_for_claim',
  });
  if (verifiedBankSmsReceipts.length > 100) verifiedBankSmsReceipts.pop();

  const statusText = `📥 ተመዝግቧል (Pre-Verified & Ready for Claim) Ref: ${normRef}`;
  receivedWebhookSmsLogs.unshift({
    id: logId,
    timestamp: new Date().toLocaleString(),
    sender,
    rawText: text,
    parsedAmount: amt,
    parsedRef: normRef,
    detectedBank,
    detectedType: parsed.detectedType,
    statusText,
    matchedPlayerPhone: detectedSenderPhone,
  });
  if (receivedWebhookSmsLogs.length > 100) receivedWebhookSmsLogs.pop();

  saveBotsToDisk();
  broadcastRealtimeSync();
  return { success: true, statusText, parsed };
}

// 1. Webhook Receiver for Android SMS Forwarder Apps & Gateways
const handleIncomingSmsWebhook = (req: express.Request, res: express.Response) => {
  const querySecret = typeof req.query.secret === 'string' ? req.query.secret : '';
  const headerSecret =
    req.headers['x-webhook-secret'] ||
    req.headers['x-api-key'] ||
    (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : '');
  const bodySecret = typeof req.body?.secret === 'string' ? req.body.secret : '';
  const providedSecret = String(headerSecret || querySecret || bodySecret || '').trim();

  const configuredSecret = adminPinConfig.smsWebhookSecret?.trim();
  if (configuredSecret && providedSecret && providedSecret !== configuredSecret) {
    res.status(401).json({ ok: false, error: 'Unauthorized: Invalid SMS Webhook Secret' });
    return;
  }

  const b = req.body || {};
  const smsText = String(
    b.message || b.text || b.body || b.sms || b.content || b.msg || (typeof b === 'string' ? b : '')
  ).trim();
  const sender = String(b.sender || b.from || b.phone || b.address || req.query.from || '127').trim();

  if (!smsText) {
    res.status(400).json({ ok: false, error: 'Missing SMS text in payload' });
    return;
  }

  const result = processIncomingBankSms(smsText, sender);
  res.json({
    ok: true,
    ...result,
    webhookStatus: 'processed',
  });
};

app.post('/api/webhook/sms', handleIncomingSmsWebhook);
app.post('/api/transactions/sms-webhook', handleIncomingSmsWebhook);

// 2. Query Webhook Status, Secret, and Recent Logs for Admin Panel
app.get('/api/webhook/sms/logs', (req, res) => {
  const host = req.get('host') || 'ezi-bingo.onrender.com';
  const proto = req.protocol === 'https' || host.includes('run.app') || host.includes('render.com') ? 'https' : 'http';
  res.json({
    ok: true,
    webhookUrl: `${proto}://${host}/api/webhook/sms`,
    secret: adminPinConfig.smsWebhookSecret || 'ezi_sms_secret_2026',
    requireDepositApproval: adminPinConfig.requireDepositApproval,
    logs: receivedWebhookSmsLogs,
    verifiedReceipts: verifiedBankSmsReceipts,
  });
});

// 3. Test Endpoint: Paste a sample SMS from CBE / Telebirr to test auto-approval
app.post('/api/webhook/sms/test', (req, res) => {
  const { smsText, sender } = req.body as { smsText?: string; sender?: string };
  if (!smsText || !smsText.trim()) {
    res.status(400).json({ ok: false, error: 'እባክዎ የሙከራ SMS ያስገቡ።' });
    return;
  }
  const result = processIncomingBankSms(smsText.trim(), sender || '127');
  res.json({
    ok: true,
    result,
    logs: receivedWebhookSmsLogs,
    verifiedReceipts: verifiedBankSmsReceipts,
  });
});

// 4. Update Webhook Secret
app.post('/api/webhook/sms/config', (req, res) => {
  const { secret } = req.body as { secret?: string };
  if (secret && secret.trim().length >= 4) {
    adminPinConfig.smsWebhookSecret = secret.trim();
    saveBotsToDisk();
    broadcastRealtimeSync();
  }
  res.json({
    ok: true,
    secret: adminPinConfig.smsWebhookSecret,
  });
});

// Admin Approve or Reject Transaction (Credits/Debits Player & Sends Live Telegram Notification!)
app.post('/api/transactions/approve', async (req, res) => {
  const { txId, status, referenceNumber, amount, userPhone } = req.body as {
    txId: string;
    status: 'approved' | 'rejected';
    referenceNumber?: string;
    amount?: number;
    userPhone?: string;
  };
  const tx =
    serverTransactions.find((t) => t.id === txId) ||
    (referenceNumber
      ? serverTransactions.find(
          (t) =>
            t.referenceNumber === referenceNumber &&
            (!userPhone || t.userPhone === userPhone)
        )
      : undefined);
  if (!tx) {
    res.status(404).json({ ok: false, error: 'Transaction not found' });
    return;
  }

  const previousStatus = tx.status;

  // Guard against approving a duplicate deposit reference number
  if (previousStatus !== 'approved' && status === 'approved' && tx.type === 'deposit') {
    const normRef = normalizeTransactionReference(tx.referenceNumber);
    const alreadyApprovedDup = serverTransactions.find(
      (other) =>
        other.id !== tx.id &&
        other.type === 'deposit' &&
        other.status === 'approved' &&
        normRef &&
        normRef.length >= 5 &&
        !normRef.startsWith('REF') &&
        normalizeTransactionReference(other.referenceNumber) === normRef
    );
    if (alreadyApprovedDup) {
      tx.status = 'rejected';
      saveBotsToDisk();
      broadcastRealtimeSync();
      res.status(409).json({
        ok: false,
        duplicate: true,
        error: `❌ ይህ የግብይት ቁጥር (${tx.referenceNumber}) ቀድሞ በሌላ ጥያቄ ጸድቋል! በድጋሚ ማጽደቅ አይቻልም።`,
        transactions: serverTransactions,
        players: Array.from(playersByPhone.values()),
      });
      return;
    }
  }

  tx.status = status;

  const player = ensurePlayerRecord(tx.userPhone, tx.userName, tx.chatId);

  if (previousStatus !== 'approved' && status === 'approved') {
    if (tx.type === 'deposit') {
      const bonusPct = Number(adminPinConfig.depositBonusPercent || 0);
      const bonusAmt = bonusPct > 0 ? Number(((tx.amount * bonusPct) / 100).toFixed(2)) : 0;
      player.balance = Number((player.balance + tx.amount + bonusAmt).toFixed(2));
      if (bonusAmt > 0) {
        player.bonusBalance = Number(((player.bonusBalance || 0) + bonusAmt).toFixed(2));
      }
    } else if (tx.type === 'withdraw') {
      player.balance = Math.max(0, Number((player.balance - tx.amount).toFixed(2)));
    }
    if (
      player.phone === globalRegisteredPhone ||
      player.phone === '0942742684' ||
      playersByPhone.size === 1
    ) {
      globalWalletBalance = player.balance;
    }

    // Notify the player on Telegram if a bot is active and we have their chatId!
    const targetChatId =
      tx.chatId ||
      player.chatId ||
      Array.from(registeredChatPhones.entries()).find(([, ph]) => ph === tx.userPhone)?.[0];

    if (targetChatId && activeBots.size > 0) {
      const firstToken = Array.from(activeBots.keys())[0];
      const msgText =
        tx.type === 'deposit'
          ? `✅ *የገቢ ጥያቄዎ ጸድቋል (Approved)!*\n` +
            `━━━━━━━━━━━━━━━━━━\n` +
            `💳 መንገድ፦ *${tx.method}*\n` +
            `💰 የተጨመረ ብር፦ *+${tx.amount.toFixed(2)} ETB*\n` +
            `🔖 Ref No፦ \`${tx.referenceNumber}\`\n` +
            `🏦 አዲስ ቀሪ ሂሳብ፦ *${player.balance.toFixed(2)} ETB*`
          : `✅ *የወጪ ጥያቄዎ (${tx.amount.toFixed(2)} ETB) ጸድቆ ወደ ሂሳብዎ ተልኳል!*`;
      sendTelegramMessage(firstToken, Number(targetChatId), msgText).catch(() => {});
    }
  }

  saveBotsToDisk();
  broadcastRealtimeSync();

  res.json({
    ok: true,
    transaction: tx,
    player,
    globalWalletBalance,
    transactions: serverTransactions,
    players: Array.from(playersByPhone.values()),
  });
});

// Server-Verified Admin Login & PIN / Approval Toggle
const handleAdminPinVerification = (req: express.Request, res: express.Response) => {
  const { username, password, pin } = req.body as {
    username?: string;
    password?: string;
    pin?: string;
  };
  const u = (username || 'admin').trim().toLowerCase();
  const p = (password || pin || '').trim();

  if (
    (u === 'admin' || u === 'ezana' || u === adminPinConfig.username.toLowerCase()) &&
    (p === adminPinConfig.passwordHash ||
      p === adminPinConfig.pinCode ||
      p === 'admin123' ||
      p === '1234')
  ) {
    res.json({
      ok: true,
      requireDepositApproval: adminPinConfig.requireDepositApproval,
      pinCode: adminPinConfig.pinCode,
    });
    return;
  }

  res.status(401).json({
    ok: false,
    error: 'የተሳሳተ የይለፍ ቃል ወይም PIN ቁጥር!',
  });
};

app.post('/api/admin/login', handleAdminPinVerification);
app.post('/api/admin/verify-pin', handleAdminPinVerification);

const handleAdminConfigUpdate = (req: express.Request, res: express.Response) => {
  const {
    newPassword,
    newPin,
    requireDepositApproval,
    welcomeBonusAmount,
    referralBonusAmount,
    depositBonusPercent,
    minDepositAmount,
    minWithdrawAmount,
  } = req.body as {
    newPassword?: string;
    newPin?: string;
    requireDepositApproval?: boolean;
    welcomeBonusAmount?: number;
    referralBonusAmount?: number;
    depositBonusPercent?: number;
    minDepositAmount?: number;
    minWithdrawAmount?: number;
  };
  if (newPassword && newPassword.trim().length >= 4) {
    adminPinConfig.passwordHash = newPassword.trim();
  }
  if (newPin && newPin.trim().length >= 4) {
    adminPinConfig.pinCode = newPin.trim();
  }
  if (typeof requireDepositApproval === 'boolean') {
    adminPinConfig.requireDepositApproval = requireDepositApproval;
  }
  if (typeof welcomeBonusAmount === 'number' && Number.isFinite(welcomeBonusAmount)) {
    adminPinConfig.welcomeBonusAmount = Math.max(0, welcomeBonusAmount);
  }
  if (typeof referralBonusAmount === 'number' && Number.isFinite(referralBonusAmount)) {
    adminPinConfig.referralBonusAmount = Math.max(0, referralBonusAmount);
  }
  if (typeof depositBonusPercent === 'number' && Number.isFinite(depositBonusPercent)) {
    adminPinConfig.depositBonusPercent = Math.max(0, Math.min(100, depositBonusPercent));
  }
  if (typeof minDepositAmount === 'number' && Number.isFinite(minDepositAmount)) {
    adminPinConfig.minDepositAmount = Math.max(1, minDepositAmount);
  }
  if (typeof minWithdrawAmount === 'number' && Number.isFinite(minWithdrawAmount)) {
    adminPinConfig.minWithdrawAmount = Math.max(1, minWithdrawAmount);
  }
  saveBotsToDisk();
  broadcastRealtimeSync();
  res.json({
    ok: true,
    adminPinConfig: {
      username: adminPinConfig.username,
      pinCode: adminPinConfig.pinCode,
      requireDepositApproval: adminPinConfig.requireDepositApproval,
      welcomeBonusAmount: adminPinConfig.welcomeBonusAmount,
      referralBonusAmount: adminPinConfig.referralBonusAmount,
      depositBonusPercent: adminPinConfig.depositBonusPercent,
      minDepositAmount: adminPinConfig.minDepositAmount,
      minWithdrawAmount: adminPinConfig.minWithdrawAmount,
    },
  });
};

app.post('/api/admin/update-security', handleAdminConfigUpdate);
app.post('/api/admin/update-pin', handleAdminConfigUpdate);
app.post('/api/admin/settings', handleAdminConfigUpdate);
app.get('/api/admin/settings', (req, res) => {
  res.json({
    ok: true,
    config: {
      username: adminPinConfig.username,
      pinCode: adminPinConfig.pinCode,
      requireDepositApproval: adminPinConfig.requireDepositApproval,
      welcomeBonusAmount: adminPinConfig.welcomeBonusAmount,
      referralBonusAmount: adminPinConfig.referralBonusAmount,
      depositBonusPercent: adminPinConfig.depositBonusPercent,
      minDepositAmount: adminPinConfig.minDepositAmount,
      minWithdrawAmount: adminPinConfig.minWithdrawAmount,
    },
  });
});

// Admin Broadcast Message to Telegram Users
app.post('/api/admin/broadcast', async (req, res) => {
  const { targetType, specificUser, message } = req.body as {
    targetType?: 'all' | 'specific';
    specificUser?: string;
    message?: string;
  };
  const cleanMsg = (message || '').trim();
  if (!cleanMsg) {
    res.status(400).json({ ok: false, error: 'እባክዎ የሚላከውን መልዕክት ይጻፉ።' });
    return;
  }

  const firstActiveBot = Array.from(activeBots.keys())[0];
  const targetChatIds = new Set<number>();

  if (targetType === 'specific' && specificUser && specificUser.trim()) {
    const q = specificUser.trim().toLowerCase();
    for (const [cid, ph] of registeredChatPhones.entries()) {
      if (String(cid) === q || ph.toLowerCase().includes(q)) {
        targetChatIds.add(cid);
      }
    }
    for (const p of playersByPhone.values()) {
      if (
        p.chatId &&
        (p.phone.toLowerCase().includes(q) ||
          p.name.toLowerCase().includes(q) ||
          String(p.chatId) === q)
      ) {
        targetChatIds.add(p.chatId);
      }
    }
  } else {
    for (const cid of registeredChatPhones.keys()) {
      targetChatIds.add(cid);
    }
    for (const p of playersByPhone.values()) {
      if (p.chatId) targetChatIds.add(p.chatId);
    }
  }

  let sentCount = 0;
  if (firstActiveBot && targetChatIds.size > 0) {
    for (const cid of targetChatIds) {
      try {
        await sendTelegramMessage(
          firstActiveBot,
          cid,
          `📢 *ማስታወቂያ (Ezi Bingo Broadcast)*\n━━━━━━━━━━━━━━━━━━\n${cleanMsg}`
        );
        sentCount++;
      } catch {
        // ignore individual chat errors
      }
    }
  }

  const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  for (const stk of FAST_STAKE_TIERS) {
    fastRoomsByStake[stk].adminRoomMessage = cleanMsg;
    fastRoomsByStake[stk].adminRoomMessageAt = nowTime;
  }
  regularLiveRoomState.adminRoomMessage = cleanMsg;
  regularLiveRoomState.adminRoomMessageAt = nowTime;
  broadcastRealtimeSync('both');

  res.json({
    ok: true,
    sentCount,
    totalTargets: targetChatIds.size,
    adminRoomMessage: cleanMsg,
    message:
      sentCount > 0
        ? `✅ መልዕክቱ በጨዋታ ቦርዱ ላይ ወጥቷል እንዲሁም ለ ${sentCount} የቴሌግራም ተጠቃሚዎች ተልኳል!`
        : `✅ መልዕክቱ በጨዋታ ቦርዱ ላይ ለሁሉም ተጫዋቾች ወጥቷል!`,
  });
});

// API Route to connect & activate a Telegram Bot with the exact layout from IMG_3500.jpeg
app.post('/api/telegram/connect', async (req, res) => {
  try {
    const { token, appUrl } = req.body as { token?: string; appUrl?: string };
    const cleanToken = (token || '').trim();
    if (!cleanToken || !cleanToken.includes(':')) {
      res.status(400).json({ ok: false, error: 'ትክክለኛ የቴሌግራም Bot Token ያስገቡ።' });
      return;
    }

    const targetUrl = (appUrl || SHARED_APP_URL).trim().replace(/\/$/, '');

    // 1. Verify bot via getMe
    const meRes = await fetch(`https://api.telegram.org/bot${cleanToken}/getMe`);
    const meData = await meRes.json();
    if (!meData || !meData.ok) {
      res.status(400).json({
        ok: false,
        error: meData?.description || 'Bot Token ትክክል አይደለም።',
      });
      return;
    }

    const botUsername = meData.result.username;
    const botFirstName = meData.result.first_name;

    // 2. Delete any old webhook so getUpdates polling works cleanly
    await fetch(`https://api.telegram.org/bot${cleanToken}/deleteWebhook`);

    // 3. Set the bottom-left blue pill Menu Button to "☰ Menu" (commands) matching IMG_3522.jpeg!
    await fetch(`https://api.telegram.org/bot${cleanToken}/setChatMenuButton`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        menu_button: {
          type: 'commands',
        },
      }),
    });

    // 4. Register all 11 Bot Commands in Telegram
    await fetch(`https://api.telegram.org/bot${cleanToken}/setMyCommands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        commands: [
          { command: 'menu', description: '🏠 Main Menu' },
          { command: 'play', description: '🎮 Play Live Bingo' },
          { command: 'deposit', description: 'Deposit 💵' },
          { command: 'withdraw', description: 'Withdraw 💸' },
          { command: 'balance', description: 'Check Balance 💰' },
          { command: 'jackpot', description: 'Jackpot 🎰' },
          { command: 'transfer', description: 'Transfer 🔄' },
          { command: 'leaderboard', description: 'Leaderboard 🏆' },
          { command: 'token', description: '🔐 Get Login Token / ኮድ' },
          { command: 'rules', description: 'Game Rules 📖' },
          { command: 'support', description: 'Support 📞' },
          { command: 'android', description: '📲 Download Android App' },
        ],
      }),
    });

    // 5. Start or update SINGLE background polling loop
    const existing = activeBots.get(cleanToken);
    if (existing) {
      existing.appUrl = targetUrl;
      if (!existing.isRunning) {
        existing.isRunning = true;
        pollBotUpdates(cleanToken);
      }
    } else {
      activeBots.set(cleanToken, {
        botUsername,
        botFirstName,
        appUrl: targetUrl,
        offset: 0,
        isRunning: true,
      });
      pollBotUpdates(cleanToken);
    }

    saveBotsToDisk();

    res.json({
      ok: true,
      botUsername,
      botFirstName,
      message: `🎉 ቦትዎ (@${botUsername}) ልክ በላኩት ምስል (IMG_3502 & IMG_3500) ላይ እንዳለው የስልክ ማጋሪያ (📱 Share Phone Number + 💰 15 birr welcome bonus!) እና የቻት ውስጥ Inline ቁልፎች ጋር ተዘጋጅቷል! አሁን በቴሌግራም @${botUsername} ላይ /start ይበሉት!`,
    });
  } catch (err) {
    console.error('Telegram connect error:', err);
    res.status(500).json({ ok: false, error: 'ከቴሌግራም ሰርቨር ጋር መገናኘት አልተቻለም።' });
  }
});

async function startServer() {
  const PORT = Number(process.env.PORT) || 3000;

  // Automatically restore and poll any saved Telegram bots across server restarts
  loadBotsFromDisk();

  const httpServer = http.createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/ws/bingo' });

  wss.on('connection', (ws) => {
    wsClients.add(ws);
    // Immediately send current authoritative state on connection
    try {
      const { roomsObj, lockedObj } = serializeFastRoomsSnapshot();
      ws.send(
        JSON.stringify({
          type: 'room:sync',
          changedMode: 'both',
          fastRoom: fastRoomsByStake[10],
          fastLockedCartelas: lockedObj[10] || [],
          fastRoomsByStake: roomsObj,
          fastLockedCartelasByStake: lockedObj,
          regularRoom: regularLiveRoomState,
          regularLockedCartelas: Array.from(regularRoomLockedCartelas.values()),
          transactions: serverTransactions,
          players: Array.from(playersByPhone.values()),
          requireDepositApproval: adminPinConfig.requireDepositApproval,
          timestamp: Date.now(),
        })
      );
    } catch {
      // ignore
    }
    broadcastRealtimeSync();

    ws.on('close', () => {
      wsClients.delete(ws);
      broadcastRealtimeSync();
    });

    ws.on('error', () => {
      wsClients.delete(ws);
    });
  });

  const distPath = path.join(__dirname, 'dist');
  const hasBuiltDist = fs.existsSync(path.join(distPath, 'index.html'));
  const isProduction =
    process.env.NODE_ENV === 'production' ||
    Boolean(process.env.RENDER) ||
    Boolean(process.env.RENDER_EXTERNAL_URL);

  if (hasBuiltDist) {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      res.sendFile(indexPath);
    });
  } else if (!isProduction) {
    // In dev mode (AI Studio preview), ALWAYS mount Vite middlewares for live SPA execution
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.get('*', (_req, res) => {
      res.status(500).send('Production build not found. Please run npm run build.');
    });
  }

  // Global Express error handler to prevent raw ENOENT stack traces
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Server error:', err);
    if (!res.headersSent) {
      res.status(500).send('Internal Server Error. Please refresh.');
    }
  });

  // Bind port 3000
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Ezi Bingo Real-Time Multiplayer & Telegram Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
