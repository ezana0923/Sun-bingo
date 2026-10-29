import { GameHistoryRecord, TransactionRecord, WinnerAnnouncement } from '../types/bingo';

export interface ServerLockedCartelaItem {
  cartelaId: number;
  ownerPhone: string;
  ownerName: string;
  clientId?: string;
  isRegistered: boolean;
  lockedAt: number;
}

export interface ServerRoomStatePayload {
  mode: 'fast' | 'regular';
  gameMatchId: number;
  isPlaying: boolean;
  isPaused: boolean;
  preGameCountdown: number | null;
  bingoClaimCountdown?: number | null;
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
  registeredCartelasCount?: number;
  blockedCartelaIds: number[];
  winnersList: WinnerAnnouncement[];
  lastVerifiedWinnerBanner: WinnerAnnouncement | null;
  gameHistory?: GameHistoryRecord[];
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
  seq?: number;
  lastUpdated: number;
}

export interface RealtimeRoomSyncMessage {
  type: 'room:sync';
  changedMode: 'fast' | 'regular' | 'both';
  fastRoom: ServerRoomStatePayload;
  fastLockedCartelas: ServerLockedCartelaItem[];
  fastRoomsByStake?: Record<number, ServerRoomStatePayload>;
  fastLockedCartelasByStake?: Record<number, ServerLockedCartelaItem[]>;
  regularRoom: ServerRoomStatePayload;
  regularLockedCartelas: ServerLockedCartelaItem[];
  transactions?: TransactionRecord[];
  players?: {
    id: string;
    phone: string;
    name: string;
    balance: number;
    bonusBalance: number;
    referralEarnings: number;
    referredCount: number;
    isBlocked: boolean;
  }[];
  requireDepositApproval?: boolean;
  timestamp: number;
}

export type RealtimeRoomSyncListener = (
  msg: RealtimeRoomSyncMessage,
  isConnected: boolean
) => void;

const SHARED_BACKEND_BASE =
  typeof window !== 'undefined' &&
  (window.location.protocol === 'file:' ||
    !window.location.host ||
    window.location.origin === 'null')
    ? 'https://ais-pre-5o2vwpcgfgshkft456mpos-198161772381.europe-west2.run.app'
    : '';

export function getDeviceClientId(): string {
  if (typeof window === 'undefined') return 'srv-node';
  try {
    let cid = localStorage.getItem('ezi_device_client_id');
    if (!cid) {
      cid = `dev-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36).slice(-4)}`;
      localStorage.setItem('ezi_device_client_id', cid);
    }
    return cid;
  } catch {
    return 'dev-default';
  }
}

export function getOrCreateDevicePlayerIdentity(): {
  id: string;
  name: string;
  phone: string;
  referralCode: string;
} {
  if (typeof window === 'undefined') {
    return { id: 'u-srv', name: 'Player', phone: '0900000000', referralCode: 'SUN000' };
  }
  const params = new URLSearchParams(window.location.search);
  const urlPhone = params.get('phone')?.trim();
  const urlName = params.get('name')?.trim();

  const tgUser = (
    window as unknown as {
      Telegram?: {
        WebApp?: {
          initDataUnsafe?: {
            user?: { id?: number; first_name?: string; username?: string };
          };
        };
      };
    }
  ).Telegram?.WebApp?.initDataUnsafe?.user;

  try {
    const savedRaw = localStorage.getItem('ezi_device_player_identity_v2');
    if (savedRaw) {
      const parsed = JSON.parse(savedRaw);
      if (parsed && parsed.phone && parsed.name) {
        if (urlPhone && urlPhone !== parsed.phone) {
          parsed.phone = urlPhone;
        }
        if (tgUser?.first_name && parsed.name.startsWith('Player_')) {
          parsed.name = tgUser.first_name;
        }
        localStorage.setItem('ezi_device_player_identity_v2', JSON.stringify(parsed));
        return parsed;
      }
    }
  } catch {
    // ignore
  }

  const cid = getDeviceClientId();
  // Generate a unique 4-digit suffix from the device client ID so every phone gets its own separate account!
  let hash = 0;
  for (let i = 0; i < cid.length; i++) {
    hash = (hash * 31 + cid.charCodeAt(i)) % 900000;
  }
  const sixDigits = String(100000 + Math.abs(hash)).slice(0, 6);
  const shortFour = sixDigits.slice(-4);

  const savedRegPhone = localStorage.getItem('ezi_registered_phone')?.trim();
  const phone =
    urlPhone ||
    (savedRegPhone && savedRegPhone !== '0942742684' ? savedRegPhone : '') ||
    `0911${sixDigits}`;

  const name =
    urlName ||
    tgUser?.first_name ||
    tgUser?.username ||
    `Player_${shortFour}`;

  const identity = {
    id: `u-${cid}`,
    name,
    phone,
    referralCode: `SUN${shortFour}`,
  };

  try {
    localStorage.setItem('ezi_device_player_identity_v2', JSON.stringify(identity));
  } catch {
    // ignore
  }
  return identity;
}

export function hasDeviceRegisteredPhone(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('registered') === '1' || params.get('phone')) {
      localStorage.setItem('ezi_phone_registered_v2', 'true');
      return true;
    }
    return localStorage.getItem('ezi_phone_registered_v2') === 'true';
  } catch {
    return false;
  }
}

export function saveDevicePlayerIdentity(name: string, phone: string) {
  if (typeof window === 'undefined') return;
  const current = getOrCreateDevicePlayerIdentity();
  const updated = {
    ...current,
    name: name.trim() || current.name,
    phone: phone.trim() || current.phone,
  };
  try {
    localStorage.setItem('ezi_device_player_identity_v2', JSON.stringify(updated));
    localStorage.setItem('ezi_registered_phone', updated.phone);
    localStorage.setItem('ezi_phone_registered_v2', 'true');
  } catch {
    // ignore
  }
}

export function buildApiUrl(path: string): string {
  if (SHARED_BACKEND_BASE) {
    return `${SHARED_BACKEND_BASE}${path}`;
  }
  return path;
}

const listeners = new Set<RealtimeRoomSyncListener>();
let wsInstance: WebSocket | null = null;
let sseInstance: EventSource | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let isWsConnected = false;
let isSseConnected = false;
let lastRealtimePushAt = 0;
let lastFastSeqByStake: Record<number, number> = {};
let lastRegularSeq = 0;
let lastStateFingerprint = '';
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let lastSyncMessage: RealtimeRoomSyncMessage | null = null;

function notifyListeners(msg: RealtimeRoomSyncMessage, fromStream = false) {
  if (!msg) return;
  const fRoom = msg.fastRoom;
  const rRoom = msg.regularRoom;

  // Reject stale out-of-order HTTP responses that have an older sequence number than already received across all stake rooms!
  if (msg.fastRoomsByStake) {
    let anyStale = false;
    for (const stk of [10, 20, 50, 100]) {
      const rm = msg.fastRoomsByStake[stk];
      const prevSeq = lastFastSeqByStake[stk] || 0;
      if (rm?.seq && rm.seq < prevSeq) {
        anyStale = true;
      }
    }
    if (anyStale && !fromStream) {
      return;
    }
    for (const stk of [10, 20, 50, 100]) {
      const rm = msg.fastRoomsByStake[stk];
      if (rm?.seq && rm.seq >= (lastFastSeqByStake[stk] || 0)) {
        lastFastSeqByStake[stk] = rm.seq;
      }
    }
  } else if (fRoom?.seq) {
    const stk = fRoom.stakeAmount || 10;
    if (!fromStream && fRoom.seq < (lastFastSeqByStake[stk] || 0)) {
      return;
    }
    lastFastSeqByStake[stk] = fRoom.seq;
  }

  if (rRoom?.seq && !fromStream && rRoom.seq < lastRegularSeq) {
    return;
  }
  if (rRoom?.seq) lastRegularSeq = rRoom.seq;

  // Deduplicate identical messages arriving simultaneously over WebSocket + SSE + HTTP Poll
  const txSummary = Array.isArray(msg.transactions)
    ? `${msg.transactions.length}:${msg.transactions[0]?.id || ''}:${msg.transactions.filter((t) => t.status === 'pending').length}`
    : '';
  const playersSummary = Array.isArray(msg.players)
    ? msg.players
        .map(
          (p) =>
            `${p.phone}:${p.name}:${p.balance}:${p.bonusBalance}:${p.isBlocked}:${p.referredCount}`
        )
        .join(',')
    : '';
  const allFastSummary = msg.fastRoomsByStake
    ? [10, 20, 50, 100]
        .map((stk) => {
          const rm = msg.fastRoomsByStake?.[stk];
          const lk = msg.fastLockedCartelasByStake?.[stk];
          const lkSig = Array.isArray(lk) ? lk.map((x) => `${x.cartelaId}:${x.clientId || x.ownerPhone}`).join(',') : '';
          return `${stk}:${rm?.gameMatchId || 0}:${rm?.calledBalls?.length || 0}:${rm?.activeBall}:${rm?.preGameCountdown}:${rm?.winnerDisplayCountdown}:${rm?.isPlaying}:${rm?.isPaused}:${lkSig}:${rm?.gameHistory?.length || 0}:${rm?.adminRoomMessage || ''}:${rm?.bonusCartelasForOver20 ?? 5}:${rm?.heroBanners?.length ?? 0}`;
        })
        .join(';')
    : `${fRoom?.gameMatchId}:${fRoom?.calledBalls?.length || 0}:${fRoom?.activeBall}:${fRoom?.preGameCountdown}:${fRoom?.winnerDisplayCountdown}:${fRoom?.isPlaying}:${fRoom?.isPaused}:${msg.fastLockedCartelas?.length || 0}:${fRoom?.gameHistory?.length || 0}:${fRoom?.adminRoomMessage || ''}:${fRoom?.bonusCartelasForOver20 ?? 5}`;

  const bannerSig = Array.isArray((rRoom || fRoom)?.heroBanners)
    ? (rRoom || fRoom)!.heroBanners!.map((b) => `${b.id}:${b.title}:${b.imageUrl ? b.imageUrl.length : 0}`).join(',')
    : '';
  const bankSig = Array.isArray((rRoom || fRoom)?.bankAccounts)
    ? (rRoom || fRoom)!.bankAccounts!.map((b) => `${b.id}:${b.shortName}:${b.accountNumber}`).join(',')
    : '';
  const fingerprint = `${allFastSummary}|${rRoom?.gameMatchId}:${rRoom?.calledBalls?.length || 0}:${rRoom?.activeBall}:${rRoom?.preGameCountdown}:${rRoom?.bingoClaimCountdown}:${rRoom?.winnerDisplayCountdown}:${rRoom?.isPlaying}:${rRoom?.isPaused}:${rRoom?.winnersList?.length || 0}:${rRoom?.blockedCartelaIds?.length || 0}:${rRoom?.stakeAmount || 10}:${rRoom?.prizeAmount || 500}:${rRoom?.activePatternId || 5}:${rRoom?.gameHistory?.length || 0}:${rRoom?.adminRoomMessage || ''}:${rRoom?.bonusCartelasForOver20 ?? 5}:${bannerSig}:${bankSig}|${txSummary}:${playersSummary}:${msg.requireDepositApproval}`;
  if (fingerprint === lastStateFingerprint) {
    return;
  }
  lastStateFingerprint = fingerprint;

  if (fromStream) {
    lastRealtimePushAt = Date.now();
  }

  lastSyncMessage = msg;
  listeners.forEach((cb) => {
    try {
      cb(msg, true);
    } catch {
      // ignore listener errors
    }
  });
}

function connectEventSource() {
  if (typeof window === 'undefined' || typeof EventSource === 'undefined') return;
  if (sseInstance && sseInstance.readyState !== EventSource.CLOSED) return;

  try {
    const sseUrl = buildApiUrl('/api/live-room/stream');
    const es = new EventSource(sseUrl);
    sseInstance = es;

    es.onopen = () => {
      isSseConnected = true;
      isWsConnected = true;
      lastRealtimePushAt = Date.now();
    };

    es.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as RealtimeRoomSyncMessage;
        if (parsed && parsed.type === 'room:sync') {
          isSseConnected = true;
          isWsConnected = true;
          notifyListeners(parsed, true);
        }
      } catch {
        // ignore
      }
    };

    es.onerror = () => {
      isSseConnected = false;
      es.close();
      sseInstance = null;
      setTimeout(() => {
        if (listeners.size > 0) connectEventSource();
      }, 2000);
    };
  } catch {
    // ignore
  }
}

function startPollingBackup() {
  if (typeof window === 'undefined' || pollTimer) return;
  const fetchLatest = (force = false) => {
    if (listeners.size === 0) return;
    // Only skip HTTP poll if a real-time WebSocket/SSE event arrived within the last 550ms
    if (!force && Date.now() - lastRealtimePushAt < 550) {
      return;
    }
    const devIdentity = getOrCreateDevicePlayerIdentity();
    fetch(
      buildApiUrl(
        `/api/live-room/state?mode=fast&clientId=${encodeURIComponent(
          getDeviceClientId()
        )}&phone=${encodeURIComponent(devIdentity.phone)}&name=${encodeURIComponent(devIdentity.name)}&_t=${Date.now()}`
      ),
      { cache: 'no-store' }
    )
      .then((r) => r.json())
      .then((data) => {
        if (data?.ok && (data.fastRoom || data.regularRoom)) {
          isWsConnected = true;
          notifyListeners(
            {
              type: 'room:sync',
              changedMode: 'both',
              fastRoom: data.fastRoom || data.room,
              fastLockedCartelas: data.fastLockedCartelas || data.lockedCartelas || [],
              fastRoomsByStake: data.fastRoomsByStake,
              fastLockedCartelasByStake: data.fastLockedCartelasByStake,
              regularRoom: data.regularRoom || data.room,
              regularLockedCartelas: data.regularLockedCartelas || [],
              transactions: data.transactions,
              players: data.players,
              requireDepositApproval: data.requireDepositApproval,
              timestamp: Date.now(),
            },
            false
          );
        }
      })
      .catch(() => {
        // ignore
      });
  };
  fetchLatest(true);
  pollTimer = setInterval(() => fetchLatest(false), 600);
}

function connectWebSocket() {
  if (typeof window === 'undefined') return;
  connectEventSource();
  startPollingBackup();

  if (
    wsInstance &&
    (wsInstance.readyState === WebSocket.OPEN ||
      wsInstance.readyState === WebSocket.CONNECTING)
  ) {
    return;
  }

  try {
    const wsUrl = SHARED_BACKEND_BASE
      ? `${SHARED_BACKEND_BASE.replace(/^http/, 'ws')}/ws/bingo`
      : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/bingo`;
    const ws = new WebSocket(wsUrl);
    wsInstance = ws;

    ws.onopen = () => {
      isWsConnected = true;
      lastRealtimePushAt = Date.now();
    };

    ws.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as RealtimeRoomSyncMessage;
        if (parsed && parsed.type === 'room:sync') {
          isWsConnected = true;
          notifyListeners(parsed, true);
        }
      } catch {
        // ignore invalid json
      }
    };

    ws.onclose = () => {
      wsInstance = null;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(() => {
        if (listeners.size > 0) {
          connectWebSocket();
        }
      }, 1500);
    };

    ws.onerror = () => {
      // SSE and 950ms polling keep real-time sync active
    };
  } catch {
    // SSE and 950ms polling keep real-time sync active
  }
}

export function subscribeRealtimeRoomSync(listener: RealtimeRoomSyncListener): () => void {
  listeners.add(listener);
  connectWebSocket();
  if (lastSyncMessage) {
    listener(lastSyncMessage, isWsConnected);
  }
  return () => {
    listeners.delete(listener);
  };
}

export async function dispatchServerRoomAction(
  payload: Record<string, unknown>
): Promise<{
  ok: boolean;
  room?: ServerRoomStatePayload;
  fastRoom?: ServerRoomStatePayload;
  fastRoomsByStake?: Record<number, ServerRoomStatePayload>;
  fastLockedCartelasByStake?: Record<number, ServerLockedCartelaItem[]>;
  regularRoom?: ServerRoomStatePayload;
}> {
  try {
    const res = await fetch(buildApiUrl('/api/live-room/action'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        clientId: getDeviceClientId(),
      }),
    });
    const data = await res.json();
    if (data && (data.fastRoom || data.regularRoom)) {
      notifyListeners({
        type: 'room:sync',
        changedMode: (payload.mode as 'fast' | 'regular') || 'both',
        fastRoom: data.fastRoom,
        fastLockedCartelas: data.fastLockedCartelas || [],
        fastRoomsByStake: data.fastRoomsByStake,
        fastLockedCartelasByStake: data.fastLockedCartelasByStake,
        regularRoom: data.regularRoom,
        regularLockedCartelas: data.regularLockedCartelas || [],
        players: data.players,
        transactions: data.transactions,
        timestamp: Date.now(),
      });
    }
    return data;
  } catch {
    return { ok: false };
  }
}
