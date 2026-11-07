import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Dices,
  Trophy,
  RotateCcw,
  Sparkles,
  ArrowLeft,
  Wallet,
  Users,
  Crown,
  Play,
  Plus,
  Smartphone,
  Settings,
  User,
  History,
  Volume2,
  VolumeX,
  Music,
  Vibrate,
  Shield,
  Trash2,
  Cpu,
  CheckCircle2,
  Clock,
  Copy,
  Filter,
  Award,
  Coins,
  PlusCircle,
  ArrowUpRight,
  ArrowDownLeft,
  Flame,
  Radio,
  RefreshCw,
  DoorOpen,
  Share2,
} from 'lucide-react';
import { KidameGamesLogo } from './KidameGamesLogo';
import { soundFX } from '../utils/soundAndVoice';
import { TransactionRecord, UserAccount } from '../types/bingo';

export type LudoColor = 'red' | 'green' | 'yellow' | 'blue';
export type LudoSubScreen =
  | 'home'
  | 'open-rooms'
  | 'board'
  | 'create-room'
  | 'offline-setup'
  | 'settings'
  | 'profile'
  | 'wallet'
  | 'history'
  | 'leaderboard'
  | 'control-panel';

export interface OpenLudoRoom {
  id: string;
  code: string;
  hostName: string;
  hostColor: LudoColor;
  stakeBirr: number;
  playerCount: 2 | 3 | 4;
  currentPlayers: number;
  kingGoal: 1 | 2 | 3 | 4;
  isPrivate?: boolean;
  status: 'waiting' | 'in_progress';
  createdAt: string;
}

interface LudoToken {
  id: number; // 0..3
  color: LudoColor;
  step: number; // -1 = yard, 0..50 = outer track, 51..55 = home stretch, 56 = crowned/kinged
}

export interface LudoMatchHistoryItem {
  id: string;
  timestamp: string;
  modeLabel: string;
  playerCount: 2 | 3 | 4;
  kingGoal: 1 | 2 | 3 | 4;
  stakeBirr: number;
  prizeBirr: number;
  winnerName: string;
  winnerColor: LudoColor;
  standings: { rank: 1 | 2 | 3 | 4; name: string; color: LudoColor; crownedCount: number; statusLabel: string }[];
}

interface LudoMasterGameProps {
  balanceBirr: number;
  onAdjustBalance: (delta: number, label: string) => void;
  onBackToLobby: () => void;
  sharedUsers?: UserAccount[];
  onUpdateSharedUsers?: React.Dispatch<React.SetStateAction<UserAccount[]>>;
  sharedTransactions?: TransactionRecord[];
  onUpdateSharedTransactions?: React.Dispatch<React.SetStateAction<TransactionRecord[]>>;
}

// 52-cell clockwise outer loop coordinates on a 15x15 Ludo board
const OUTER_TRACK_COORDS: [number, number][] = [
  // Red bottom-left start going right along row 6
  [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],
  // Up col 6
  [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],
  // Top turn
  [0, 7], [0, 8],
  // Down col 8 (Green starts at index 13 -> [1, 8])
  [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],
  // Right along row 6
  [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],
  // Right turn
  [7, 14], [8, 14],
  // Left along row 8 (Yellow starts at index 26 -> [8, 13])
  [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],
  // Down col 8
  [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8],
  // Bottom turn
  [14, 7], [14, 6],
  // Up col 6 (Blue starts at index 39 -> [13, 6])
  [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],
  // Left along row 8
  [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0],
  // Left turn
  [7, 0], [6, 0],
];

const START_TRACK_INDEX: Record<LudoColor, number> = {
  red: 0,
  green: 13,
  yellow: 26,
  blue: 39,
};

const HOME_STRETCH_COORDS: Record<LudoColor, [number, number][]> = {
  red: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],
  green: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]],
  yellow: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]],
  blue: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]],
};

const HOME_GOAL_COORD: Record<LudoColor, [number, number]> = {
  red: [7, 6],
  green: [6, 7],
  yellow: [7, 8],
  blue: [8, 7],
};

const BASE_YARD_SLOTS: Record<LudoColor, [number, number][]> = {
  red: [[1, 1], [1, 4], [4, 1], [4, 4]],
  green: [[1, 10], [1, 13], [4, 10], [4, 13]],
  yellow: [[10, 10], [10, 13], [13, 10], [13, 13]],
  blue: [[10, 1], [10, 4], [13, 1], [13, 4]],
};

// 8 Safe Star Squares on the 52-cell outer loop
const SAFE_OUTER_INDICES = new Set<number>([0, 8, 13, 21, 26, 34, 39, 47]);

const COLOR_CONFIG: Record<
  LudoColor,
  {
    amName: string;
    enName: string;
    badgeBg: string;
    border: string;
    text: string;
    tokenGrad: string;
    glow: string;
  }
> = {
  red: {
    amName: 'ቀይ ቤት',
    enName: 'Red House',
    badgeBg: 'bg-rose-600',
    border: 'border-rose-400',
    text: 'text-rose-400',
    tokenGrad: 'from-rose-300 via-rose-600 to-rose-950',
    glow: 'shadow-[0_0_20px_rgba(244,63,94,0.75)]',
  },
  green: {
    amName: 'አረንጓዴ ቤት',
    enName: 'Green House',
    badgeBg: 'bg-emerald-600',
    border: 'border-emerald-400',
    text: 'text-emerald-400',
    tokenGrad: 'from-emerald-300 via-emerald-600 to-emerald-950',
    glow: 'shadow-[0_0_20px_rgba(16,185,129,0.75)]',
  },
  yellow: {
    amName: 'ቢጫ ቤት',
    enName: 'Yellow House',
    badgeBg: 'bg-amber-500',
    border: 'border-amber-300',
    text: 'text-amber-400',
    tokenGrad: 'from-amber-200 via-amber-500 to-amber-900',
    glow: 'shadow-[0_0_20px_rgba(245,158,11,0.8)]',
  },
  blue: {
    amName: 'ሰማያዊ ቤት',
    enName: 'Blue House',
    badgeBg: 'bg-sky-600',
    border: 'border-sky-400',
    text: 'text-sky-400',
    tokenGrad: 'from-sky-300 via-sky-600 to-sky-950',
    glow: 'shadow-[0_0_20px_rgba(14,165,233,0.75)]',
  },
};

function getActiveColorsForCount(count: 2 | 3 | 4): LudoColor[] {
  if (count === 2) return ['red', 'yellow'];
  if (count === 3) return ['red', 'green', 'yellow'];
  return ['red', 'green', 'yellow', 'blue'];
}

function getTokenGridCoord(token: LudoToken): [number, number] {
  if (token.step === -1) {
    return BASE_YARD_SLOTS[token.color][token.id];
  }
  if (token.step >= 0 && token.step <= 50) {
    const outerIdx = (START_TRACK_INDEX[token.color] + token.step) % 52;
    return OUTER_TRACK_COORDS[outerIdx];
  }
  if (token.step >= 51 && token.step <= 55) {
    return HOME_STRETCH_COORDS[token.color][token.step - 51];
  }
  return HOME_GOAL_COORD[token.color];
}

function getOuterTrackIndex(token: LudoToken): number | null {
  if (token.step < 0 || token.step > 50) return null;
  return (START_TRACK_INDEX[token.color] + token.step) % 52;
}

function canMoveToken(token: LudoToken, dice: number): boolean {
  if (token.step === 56) return false;
  if (token.step === -1) {
    return dice === 6;
  }
  return token.step + dice <= 56;
}

// Render 3D-style pips inside Dice face
const DiceFacePips: React.FC<{ value: number | null; isRolling: boolean }> = ({ value, isRolling }) => {
  if (isRolling) {
    return <Dices className="w-10 h-10 text-slate-950 animate-spin" />;
  }
  if (!value) {
    return <Dices className="w-10 h-10 text-slate-950" />;
  }
  const pipPositions: Record<number, number[]> = {
    1: [4],
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8],
  };
  const activeCells = new Set(pipPositions[value] || [4]);
  return (
    <div className="grid grid-cols-3 grid-rows-3 gap-1.5 w-12 h-12 p-1">
      {Array.from({ length: 9 }).map((_, idx) => (
        <div key={idx} className="flex items-center justify-center">
          {activeCells.has(idx) && (
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                value === 6 ? 'bg-rose-600 ring-1 ring-white' : 'bg-slate-950'
              } shadow-sm`}
            />
          )}
        </div>
      ))}
    </div>
  );
};

export const LudoMasterGame: React.FC<LudoMasterGameProps> = ({
  balanceBirr,
  onAdjustBalance,
  onBackToLobby,
  sharedUsers,
  onUpdateSharedUsers,
  sharedTransactions,
  onUpdateSharedTransactions,
}) => {
  const [subScreen, setSubScreen] = useState<LudoSubScreen>('home');

  // Game Setup State (No Bots — Real Human Players Only!)
  const [playerCount, setPlayerCount] = useState<2 | 3 | 4>(2);
  const [kingGoal, setKingGoal] = useState<1 | 2 | 3 | 4>(2); // 👑 1, 2, 3, or 4 ካስ ማንገስ
  const [stakeBirr, setStakeBirr] = useState<number>(50);
  const [roomCode, setRoomCode] = useState<string>('KDM-7721');
  const [joinCodeInput, setJoinCodeInput] = useState<string>('');
  const [modeType, setModeType] = useState<'online-room' | 'offline-pass'>('online-room');
  const [myChosenColor, setMyChosenColor] = useState<LudoColor>('red');

  // Live Open Rooms matching Ethiopian Telegram/Web Ludo lobby (Replaces any 3rd party design with ቅዳሜ LUDO)
  const [openRooms, setOpenRooms] = useState<OpenLudoRoom[]>([
    {
      id: 'r-1',
      code: 'KDM-4912',
      hostName: 'ዳዊት ጌታቸው',
      hostColor: 'red',
      stakeBirr: 50,
      playerCount: 2,
      currentPlayers: 1,
      kingGoal: 1,
      status: 'waiting',
      createdAt: 'ከ2 ደቂቃ በፊት',
    },
    {
      id: 'r-2',
      code: 'KDM-8820',
      hostName: 'ቤዛዊት ተፈራ',
      hostColor: 'green',
      stakeBirr: 100,
      playerCount: 4,
      currentPlayers: 2,
      kingGoal: 2,
      status: 'waiting',
      createdAt: 'ከ5 ደቂቃ በፊት',
    },
    {
      id: 'r-3',
      code: 'KDM-3104',
      hostName: 'ሳሙኤል በቀለ',
      hostColor: 'blue',
      stakeBirr: 20,
      playerCount: 2,
      currentPlayers: 1,
      kingGoal: 1,
      status: 'waiting',
      createdAt: 'ከ1 ደቂቃ በፊት',
    },
    {
      id: 'r-4',
      code: 'KDM-7745',
      hostName: 'ዮናስ ታደሰ',
      hostColor: 'yellow',
      stakeBirr: 200,
      playerCount: 4,
      currentPlayers: 3,
      kingGoal: 4,
      status: 'waiting',
      createdAt: 'ከ7 ደቂቃ በፊት',
    },
    {
      id: 'r-5',
      code: 'KDM-9510',
      hostName: 'ሄኖክ አለሙ',
      hostColor: 'red',
      stakeBirr: 50,
      playerCount: 3,
      currentPlayers: 2,
      kingGoal: 2,
      status: 'waiting',
      createdAt: 'ከ3 ደቂቃ በፊት',
    },
    {
      id: 'r-6',
      code: 'KDM-2309',
      hostName: 'ሩት መንግስቱ',
      hostColor: 'green',
      stakeBirr: 500,
      playerCount: 2,
      currentPlayers: 1,
      kingGoal: 2,
      status: 'waiting',
      createdAt: 'ከ4 ደቂቃ በፊት',
    },
  ]);
  const [openRoomsFilter, setOpenRoomsFilter] = useState<'all' | '20' | '50' | '100' | '200+' | '2p' | '4p'>('all');

  // Real Players Names per House
  const [playerNames, setPlayerNames] = useState<Record<LudoColor, string>>({
    red: 'ተጫዋች 1 (ቀይ)',
    green: 'ተጫዋች 2 (አረንጓዴ)',
    yellow: 'ተጫዋች 3 (ቢጫ)',
    blue: 'ተጫዋች 4 (ሰማያዊ)',
  });
  const [profilePhone, setProfilePhone] = useState<string>('0942742684');

  // Audio & Haptics Settings
  const [sfxEnabled, setSfxEnabled] = useState<boolean>(true);
  const [bgMusicEnabled, setBgMusicEnabled] = useState<boolean>(false);
  const [vibrationEnabled, setVibrationEnabled] = useState<boolean>(true);
  const bgMusicIntervalRef = useRef<number | null>(null);

  // Active Match State
  const [isMatchActive, setIsMatchActive] = useState<boolean>(false);
  const [turnIndex, setTurnIndex] = useState<number>(0);
  const [turnSecondsLeft, setTurnSecondsLeft] = useState<number>(20);
  const [diceValue, setDiceValue] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [hasRolledThisTurn, setHasRolledThisTurn] = useState<boolean>(false);
  const [statusBanner, setStatusBanner] = useState<string>(
    '«ቅዳሜ Games — የሉዶ ማስተር» — ተጫዋቾች ብቻ የሚጫወቱበት ትክክለኛ የሉዶ ውድድር!'
  );

  // Winner & Final Standings State (1st place ends game immediately; 2nd, 3rd, 4th ranked)
  const [matchResult, setMatchResult] = useState<LudoMatchHistoryItem | null>(null);

  // Match History & Wallet Filter State
  const [matchHistory, setMatchHistory] = useState<LudoMatchHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('kidame_ludo_history_v1');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [
      {
        id: 'LM-9081',
        timestamp: new Date(Date.now() - 3600_000).toLocaleString(),
        modeLabel: '2 ተጫዋቾች · 👑 2 ካሶች ማንገስ',
        playerCount: 2,
        kingGoal: 2,
        stakeBirr: 50,
        prizeBirr: 90,
        winnerName: 'ተጫዋች 1 (ቀይ)',
        winnerColor: 'red',
        standings: [
          { rank: 1, name: 'ተጫዋች 1 (ቀይ)', color: 'red', crownedCount: 2, statusLabel: '1ኛ ደረጃ 🏆 አሸናፊ' },
          { rank: 2, name: 'ተጫዋች 3 (ቢጫ)', color: 'yellow', crownedCount: 1, statusLabel: '2ኛ ደረጃ (ተበልቷል)' },
        ],
      },
    ];
  });
  const [historyFilter, setHistoryFilter] = useState<'all' | '2p' | '3p' | '4p'>('all');
  const [walletAmountInput, setWalletAmountInput] = useState<string>('100');
  const [walletRefInput, setWalletRefInput] = useState<string>('');
  const [newPlayerNameInput, setNewPlayerNameInput] = useState<string>('');
  const [newPlayerPhoneInput, setNewPlayerPhoneInput] = useState<string>('');
  const [newPlayerBirrInput, setNewPlayerBirrInput] = useState<string>('100');

  const activeColors = useMemo(() => getActiveColorsForCount(playerCount), [playerCount]);
  const currentTurnColor: LudoColor = activeColors[turnIndex % activeColors.length] || 'red';

  const [tokens, setTokens] = useState<LudoToken[]>(() => {
    const list: LudoToken[] = [];
    (['red', 'green', 'yellow', 'blue'] as LudoColor[]).forEach((color) => {
      for (let i = 0; i < 4; i++) {
        list.push({ id: i, color, step: i === 0 ? 0 : -1 });
      }
    });
    return list;
  });

  const totalPrizeBirr = useMemo(
    () => Math.round(stakeBirr * playerCount * 0.9),
    [stakeBirr, playerCount]
  );

  // Save Ludo History
  useEffect(() => {
    try {
      localStorage.setItem('kidame_ludo_history_v1', JSON.stringify(matchHistory));
    } catch {
      // ignore
    }
  }, [matchHistory]);

  // Ambient WebAudio Background Music Synthesizer when enabled
  useEffect(() => {
    if (!bgMusicEnabled) {
      if (bgMusicIntervalRef.current) {
        window.clearInterval(bgMusicIntervalRef.current);
        bgMusicIntervalRef.current = null;
      }
      return;
    }
    const playSoftChord = () => {
      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const freqs = [261.63, 329.63, 392.0, 523.25];
        freqs.forEach((f, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.value = f;
          gain.gain.setValueAtTime(0.015, ctx.currentTime + idx * 0.12);
          gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.4);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + idx * 0.12);
          osc.stop(ctx.currentTime + 1.45);
        });
      } catch {
        // ignore
      }
    };
    playSoftChord();
    bgMusicIntervalRef.current = window.setInterval(playSoftChord, 2800);
    return () => {
      if (bgMusicIntervalRef.current) {
        window.clearInterval(bgMusicIntervalRef.current);
        bgMusicIntervalRef.current = null;
      }
    };
  }, [bgMusicEnabled]);

  const triggerHaptic = useCallback(
    (pattern: number | number[] = 40) => {
      if (!vibrationEnabled) return;
      try {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(pattern);
        }
      } catch {
        // ignore
      }
    },
    [vibrationEnabled]
  );

  // Advance to next human player's turn and reset 20-second turn timer
  const advanceToNextPlayerTurn = useCallback(
    (reasonMessage?: string) => {
      setTurnIndex((prevIdx) => {
        const nextIdx = (prevIdx + 1) % activeColors.length;
        const nextColor = activeColors[nextIdx];
        setStatusBanner(
          reasonMessage ||
            `🎲 የተጫዋች ተራ ተቀይሯል — የ${playerNames[nextColor]} (${COLOR_CONFIG[nextColor].amName}) ተራ ነው! (20 ሰከንድ)`
        );
        return nextIdx;
      });
      setTurnSecondsLeft(20);
      setHasRolledThisTurn(false);
      setDiceValue(null);
    },
    [activeColors, playerNames]
  );

  // Strict 20-Second Turn Timer per Player with Auto-Turn Change when 20s expires
  useEffect(() => {
    if (!isMatchActive || matchResult) return;
    const timer = window.setInterval(() => {
      setTurnSecondsLeft((prev) => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isMatchActive, matchResult]);

  useEffect(() => {
    if (!isMatchActive || matchResult) return;
    if (turnSecondsLeft === 0) {
      triggerHaptic([60, 40, 60]);
      if (sfxEnabled) soundFX.playErrorBuzzer();
      advanceToNextPlayerTurn(
        `⏰ 20 ሰከንድ አልቋል! ተራው በራሱ ወደ ቀጣዩ ተጫዋች ተላልፏል።`
      );
    }
  }, [turnSecondsLeft, isMatchActive, matchResult, advanceToNextPlayerTurn, sfxEnabled, triggerHaptic]);

  // Start a new Ludo Master match with the chosen playerCount (2/3/4) & kingGoal (1/2/3/4)
  const handleStartMatch = (customMode?: 'online-room' | 'offline-pass') => {
    const activeMode = customMode || modeType;
    if (balanceBirr < stakeBirr) {
      setStatusBanner(`⚠️ በቂ የብር ቀሪ ሂሳብ የለዎትም! (${stakeBirr} ETB ያስፈልጋል)`);
      setSubScreen('wallet');
      return;
    }

    onAdjustBalance(
      -stakeBirr,
      `ቅዳሜ Games — የሉዶ ማስተር መደብ (${playerCount} ተጫዋቾች · 👑 ${kingGoal} ካስ)`
    );

    const colors = getActiveColorsForCount(playerCount);
    const initialTokens: LudoToken[] = [];
    colors.forEach((col) => {
      for (let i = 0; i < 4; i++) {
        // First pawn starts at track entrance (step 0) so players can immediately race, 3 in base
        initialTokens.push({ id: i, color: col, step: i === 0 ? 0 : -1 });
      }
    });

    setTokens(initialTokens);
    setTurnIndex(0);
    setTurnSecondsLeft(20);
    setDiceValue(null);
    setHasRolledThisTurn(false);
    setMatchResult(null);
    setIsMatchActive(true);
    setModeType(activeMode);
    setSubScreen('board');
    triggerHaptic(50);
    if (sfxEnabled) soundFX.playClick();

    const firstColor = colors[0];
    setStatusBanner(
      `🎮 ጨዋታው ተጀምሯል! የ${playerNames[firstColor]} ተራ ነው — በ20 ሰከንድ ውስጥ ዳይስ ይወርውሩ!`
    );
  };

  // Join a live open room directly from the lobby (Replaces 3rd party designs with official ቅዳሜ LUDO)
  const handleJoinOpenRoom = (room: OpenLudoRoom) => {
    if (balanceBirr < room.stakeBirr) {
      setStatusBanner(`⚠️ በቂ የብር ቀሪ ሂሳብ የለዎትም! (${room.stakeBirr} ETB ያስፈልጋል)`);
      setSubScreen('wallet');
      return;
    }
    setPlayerCount(room.playerCount);
    setKingGoal(room.kingGoal);
    setStakeBirr(room.stakeBirr);
    setRoomCode(room.code);

    const colors = getActiveColorsForCount(room.playerCount);
    const availableOther = colors.filter((c) => c !== room.hostColor);
    const myCol = availableOther[0] || (room.hostColor === 'red' ? 'yellow' : 'red');
    setMyChosenColor(myCol);

    setPlayerNames((prev) => {
      const updated = { ...prev };
      updated[room.hostColor] = `${room.hostName} (አስተናጋጅ)`;
      updated[myCol] = 'እርስዎ (ተጫዋች)';
      colors.forEach((c, idx) => {
        if (c !== room.hostColor && c !== myCol) {
          updated[c] = `ተጫዋች ${idx + 1}`;
        }
      });
      return updated;
    });

    onAdjustBalance(
      -room.stakeBirr,
      `ቅዳሜ LUDO — ክፍል #${room.code} ተቀላቅለዋል (${room.hostName} · ${room.stakeBirr} ETB)`
    );

    const initialTokens: LudoToken[] = [];
    colors.forEach((col) => {
      for (let i = 0; i < 4; i++) {
        initialTokens.push({ id: i, color: col, step: i === 0 ? 0 : -1 });
      }
    });

    setTokens(initialTokens);
    setTurnIndex(0);
    setTurnSecondsLeft(20);
    setDiceValue(null);
    setHasRolledThisTurn(false);
    setMatchResult(null);
    setIsMatchActive(true);
    setModeType('online-room');
    setSubScreen('board');
    triggerHaptic(50);
    if (sfxEnabled) soundFX.playClick();

    const firstColor = colors[0];
    setStatusBanner(
      `🚪 ክፍል #${room.code} ገብተዋል! ${room.hostName} vs እርስዎ — የ${firstColor === room.hostColor ? room.hostName : 'እርስዎ'} ተራ ነው (20 ሰከንድ)!`
    );
  };

  // Move a specific token and check captures, crowning (kingGoal), or bonus turn
  const executeTokenMove = useCallback(
    (selectedToken: LudoToken, rolled: number) => {
      let capturedOpponent = false;
      let newlyCrowned = false;

      const nextStep = selectedToken.step === -1 ? 0 : selectedToken.step + rolled;
      if (nextStep === 56) {
        newlyCrowned = true;
      }

      const movedToken: LudoToken = { ...selectedToken, step: nextStep };
      const movedOuterIdx = getOuterTrackIndex(movedToken);

      const updatedTokens = tokens.map((t) => {
        if (t.color === selectedToken.color && t.id === selectedToken.id) {
          return movedToken;
        }
        // Check capture on non-safe outer cell
        if (
          t.color !== selectedToken.color &&
          movedOuterIdx !== null &&
          !SAFE_OUTER_INDICES.has(movedOuterIdx)
        ) {
          const oppOuterIdx = getOuterTrackIndex(t);
          if (oppOuterIdx === movedOuterIdx) {
            capturedOpponent = true;
            return { ...t, step: -1 };
          }
        }
        return t;
      });

      setTokens(updatedTokens);
      triggerHaptic(capturedOpponent ? [80, 40, 100] : 35);
      if (sfxEnabled) {
        if (capturedOpponent) {
          soundFX.playNotificationChime();
        } else {
          soundFX.playDaubClick();
        }
      }

      // Check how many tokens this player has crowned (step === 56)
      const myCrownedCount = updatedTokens.filter(
        (t) => t.color === selectedToken.color && t.step === 56
      ).length;

      // 5. WINNER SCREEN RULE: 1st place finisher ends the game immediately!
      // Remaining players are ranked 2nd, 3rd, and 4th (የተቀሩት ተጫዋቾች በ2ኛ፣ 3ኛ እና 4ኛ ደረጃ ይበላሉ)
      if (myCrownedCount >= kingGoal) {
        setIsMatchActive(false);
        if (sfxEnabled) soundFX.playVictoryFanfare();
        triggerHaptic([120, 60, 160, 60, 220]);

        onAdjustBalance(
          totalPrizeBirr,
          `🏆 የሉዶ ማስተር 1ኛ ደረጃ አሸናፊ (${playerNames[selectedToken.color]})`
        );

        // Rank remaining active players by crowned count + total progress steps
        const otherColors = activeColors.filter((c) => c !== selectedToken.color);
        const scoredOthers = otherColors
          .map((c) => {
            const cTokens = updatedTokens.filter((t) => t.color === c);
            const crowned = cTokens.filter((t) => t.step === 56).length;
            const stepSum = cTokens.reduce((acc, t) => acc + Math.max(0, t.step), 0);
            return { color: c, crowned, stepSum };
          })
          .sort((a, b) => b.crowned - a.crowned || b.stepSum - a.stepSum);

        const standings: LudoMatchHistoryItem['standings'] = [
          {
            rank: 1,
            name: playerNames[selectedToken.color],
            color: selectedToken.color,
            crownedCount: myCrownedCount,
            statusLabel: `1ኛ ደረጃ 🏆 አሸናፊ (+${totalPrizeBirr} ብር)`,
          },
          ...scoredOthers.map((item, idx) => {
            const rankNum = (idx + 2) as 2 | 3 | 4;
            return {
              rank: rankNum,
              name: playerNames[item.color],
              color: item.color,
              crownedCount: item.crowned,
              statusLabel: `${rankNum}ኛ ደረጃ — ተበልቷል`,
            };
          }),
        ];

        const resultRecord: LudoMatchHistoryItem = {
          id: `LM-${Math.floor(1000 + Math.random() * 9000)}`,
          timestamp: new Date().toLocaleString(),
          modeLabel: `${playerCount} ተጫዋቾች · 👑 ${kingGoal} ካስ ማንገስ`,
          playerCount,
          kingGoal,
          stakeBirr,
          prizeBirr: totalPrizeBirr,
          winnerName: playerNames[selectedToken.color],
          winnerColor: selectedToken.color,
          standings,
        };

        setMatchResult(resultRecord);
        setMatchHistory((prev) => [resultRecord, ...prev]);
        setStatusBanner(
          `🏆 ${playerNames[selectedToken.color]} 1ኛ ደረጃ ይዞ ስለጨረሰ ጨዋታው ወዲያውኑ አብቅቷል! +${totalPrizeBirr} ETB አሸንፏል!`
        );
        return;
      }

      // Bonus turn on rolling 6, capturing an opponent, or crowning a pawn
      const getsBonusTurn = rolled === 6 || capturedOpponent || newlyCrowned;
      if (getsBonusTurn) {
        setTurnSecondsLeft(20);
        setHasRolledThisTurn(false);
        setDiceValue(null);
        setStatusBanner(
          capturedOpponent
            ? `⚔️ ተቃዋሚ ካስ በልተዋል! ለ${playerNames[selectedToken.color]} ተጨማሪ የዳይስ እድል ተሰጥቷል (20s)!`
            : newlyCrowned
            ? `👑 1 ካስ ነግሷል! ለ${playerNames[selectedToken.color]} ተጨማሪ የዳይስ እድል ተሰጥቷል (20s)!`
            : `🎲 6 ወጥቷል! ለ${playerNames[selectedToken.color]} ተጨማሪ የዳይስ እድል ተሰጥቷል (20s)!`
        );
      } else {
        advanceToNextPlayerTurn();
      }
    },
    [
      activeColors,
      advanceToNextPlayerTurn,
      kingGoal,
      onAdjustBalance,
      playerCount,
      playerNames,
      sfxEnabled,
      stakeBirr,
      tokens,
      totalPrizeBirr,
      triggerHaptic,
    ]
  );

  // Roll Dice Handler with Animation + Vibration API + Sound
  const handleRollDice = () => {
    if (!isMatchActive || isRolling || hasRolledThisTurn || matchResult) return;
    setIsRolling(true);
    triggerHaptic([35, 30, 55]);
    if (sfxEnabled) soundFX.playClick();

    window.setTimeout(() => {
      const rolled = Math.floor(Math.random() * 6) + 1;
      setDiceValue(rolled);
      setIsRolling(false);
      setHasRolledThisTurn(true);

      const movable = tokens.filter(
        (t) => t.color === currentTurnColor && canMoveToken(t, rolled)
      );

      if (movable.length === 0) {
        setStatusBanner(
          `🎲 ${playerNames[currentTurnColor]} ${rolled} አውጥቷል — የሚንቀሳቀስ ካስ ስለሌለ ተራው ይዞራል...`
        );
        window.setTimeout(() => {
          advanceToNextPlayerTurn();
        }, 900);
        return;
      }

      // If only 1 token can legally move, move it automatically for snappy gameplay
      if (movable.length === 1) {
        window.setTimeout(() => {
          executeTokenMove(movable[0], rolled);
        }, 320);
        return;
      }

      setStatusBanner(
        `🎲 ${rolled} ወጥቷል! የሚያንቀሳቅሱትን የ${COLOR_CONFIG[currentTurnColor].amName} ካስ ይንኩ!`
      );
    }, 420);
  };

  // Filtered match history
  const filteredHistory = useMemo(() => {
    if (historyFilter === 'all') return matchHistory;
    const countMap = { '2p': 2, '3p': 3, '4p': 4 } as const;
    return matchHistory.filter((m) => m.playerCount === countMap[historyFilter]);
  }, [matchHistory, historyFilter]);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Brand Header: «ቅዳሜ Games — የሉዶ ማስተር» */}
      <div className="rounded-2xl border border-amber-500/35 bg-[#081326]/95 px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (subScreen !== 'home') {
                setSubScreen('home');
              } else {
                onBackToLobby();
              }
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-extrabold border border-slate-700 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{subScreen !== 'home' ? 'ወደ ሉዶ መነሻ' : 'ወደ ቅዳሜ Games'}</span>
          </button>

          <div className="flex items-center gap-3">
            <div className="relative">
              <KidameGamesLogo variant="icon" size="xs" scheme="royal-gold" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 text-slate-950 text-[10px] font-black uppercase tracking-wider shadow-sm">
                  ቅዳሜ LUDO
                </span>
                <span className="text-[11px] text-emerald-400 font-extrabold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                  ኦፊሴላዊ መድረክ
                </span>
              </div>
              <h1 className="text-base sm:text-xl font-black tracking-tight text-white flex items-center gap-2 mt-0.5">
                <span>ቅዳሜ Games — የሉዶ ማስተር</span>
              </h1>
              <p className="text-[11px] sm:text-xs text-amber-400 font-bold">
                ትክክለኛ ተጫዋቾች ብቻ · 20 ሰከንድ ቆጣሪ · በብር (ETB) የሚካሄድ ውድድር · ቦቶች የሉም
              </p>
            </div>
          </div>
        </div>

        {/* Right Quick Actions & Birr Balance */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-emerald-500/40">
            <Wallet className="w-4 h-4 text-emerald-400" />
            <span className="font-mono font-black text-xs sm:text-sm text-emerald-400">
              {balanceBirr.toFixed(2)} ብር (ETB)
            </span>
          </div>

          <button
            onClick={() => setSubScreen('open-rooms')}
            className={`px-3 py-2 rounded-xl text-xs font-extrabold border cursor-pointer flex items-center gap-1.5 transition-all ${
              subScreen === 'open-rooms'
                ? 'bg-amber-500 text-slate-950 border-amber-300'
                : 'bg-slate-800/90 text-amber-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            <DoorOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">ክፍት ክፍሎች ({openRooms.length})</span>
          </button>

          <button
            onClick={() => setSubScreen('leaderboard')}
            className={`px-3 py-2 rounded-xl text-xs font-extrabold border cursor-pointer flex items-center gap-1.5 ${
              subScreen === 'leaderboard'
                ? 'bg-amber-500 text-slate-950 border-amber-300'
                : 'bg-slate-800/90 text-amber-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">ደረጃ ሰንጠረዥ</span>
          </button>

          <button
            onClick={() => setSubScreen('control-panel')}
            className={`px-3 py-2 rounded-xl text-xs font-extrabold border cursor-pointer flex items-center gap-1.5 ${
              subScreen === 'control-panel'
                ? 'bg-emerald-500 text-slate-950 border-emerald-300'
                : 'bg-slate-800/90 text-emerald-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">የቁጥጥር ክፍል</span>
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 1. HOME SCREEN (የመጀመሪያ ገጽ & ሁሉም አዝራሮች + የተጫዋች እና የካስ ብዛት ምርጫ) */}
      {/* ===================================================================== */}
      {subScreen === 'home' && (
        <div className="space-y-8">
          {/* Quick Setup Strip: Player Count (2/3/4) + King Pawn Selection (1/2/3/4) + Stake (ETB) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 7 Cols: Main 7 Home Action Buttons */}
            <div className="lg:col-span-7 rounded-2xl border border-slate-800 bg-[#091428]/95 p-6 space-y-5 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-white">
                    ቅዳሜ Games — የሉዶ ማስተር ዋና ማውጫ
                  </h2>
                  <p className="text-xs text-slate-400">
                    ቦቶች የሉም — ከ2 እስከ 4 ትክክለኛ ተጫዋቾች በ20 ሰከንድ ቆጣሪ ይጫወታሉ
                  </p>
                </div>
                <span className="px-3 py-1 rounded-lg bg-amber-500/15 border border-amber-400/40 text-amber-300 font-mono text-xs font-black">
                  ደራሽ፦ {totalPrizeBirr} ETB
                </span>
              </div>

              {/* Primary Action Buttons Required by Spec */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <button
                  onClick={() => handleStartMatch('online-room')}
                  className="sm:col-span-2 py-4 px-5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-base shadow-lg shadow-amber-500/20 flex items-center justify-between cursor-pointer transition-all"
                >
                  <span className="flex items-center gap-3">
                    <Play className="w-6 h-6 fill-current" />
                    <span>🎮 ጨዋታውን ጀምር (Play Game)</span>
                  </span>
                  <span className="text-xs font-mono bg-slate-950/20 px-3 py-1 rounded-lg">
                    {playerCount} ተጫዋቾች · 👑 {kingGoal} ካስ · {stakeBirr} ብር
                  </span>
                </button>

                <button
                  onClick={() => {
                    setRoomCode(`KDM-${Math.floor(1000 + Math.random() * 9000)}`);
                    setSubScreen('create-room');
                  }}
                  className="p-4 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-left transition-all cursor-pointer flex items-center gap-3.5"
                >
                  <div className="w-11 h-11 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black shrink-0">
                    <Plus className="w-6 h-6 stroke-[3]" />
                  </div>
                  <div>
                    <div className="font-black text-sm text-white">➕ ክፍል ፍጠር (Create Room)</div>
                    <div className="text-[11px] text-slate-400">የክፍል ኮድ በመፍጠር ጓደኞችዎን ይጋብዙ</div>
                  </div>
                </button>

                <button
                  onClick={() => setSubScreen('offline-setup')}
                  className="p-4 rounded-2xl border border-sky-500/40 bg-sky-500/10 hover:bg-sky-500/20 text-left transition-all cursor-pointer flex items-center gap-3.5"
                >
                  <div className="w-11 h-11 rounded-xl bg-sky-400 text-slate-950 flex items-center justify-center font-black shrink-0">
                    <Smartphone className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="font-black text-sm text-white">
                      📱 ከመስመር ውጭ ማጫዎቻ (Offline / Pass & Play)
                    </div>
                    <div className="text-[11px] text-slate-400">በአንድ ስልክ 2፣ 3 ወይም 4 ተጫዋቾች</div>
                  </div>
                </button>

                <button
                  onClick={() => setSubScreen('wallet')}
                  className="p-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-left transition-all cursor-pointer flex items-center gap-3.5"
                >
                  <div className="w-11 h-11 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shrink-0">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-black text-sm text-white">
                      💵 የብር እና ሽልማቶች አስተዳደር (Wallet / Birr)
                    </div>
                    <div className="text-[11px] text-amber-300 font-mono">
                      ቀሪ፦ {balanceBirr.toFixed(2)} ETB
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setSubScreen('history')}
                  className="p-4 rounded-2xl border border-purple-500/40 bg-purple-500/10 hover:bg-purple-500/20 text-left transition-all cursor-pointer flex items-center gap-3.5"
                >
                  <div className="w-11 h-11 rounded-xl bg-purple-400 text-slate-950 flex items-center justify-center font-black shrink-0">
                    <History className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-black text-sm text-white">
                      📜 የጨዋታ ታሪክ (Game History)
                    </div>
                    <div className="text-[11px] text-slate-400">
                      ያለፉት ውጤቶች እና የብር እንቅስቃሴዎች
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setSubScreen('settings')}
                  className="p-4 rounded-2xl border border-slate-700 bg-slate-900/90 hover:bg-slate-800 text-left transition-all cursor-pointer flex items-center gap-3.5"
                >
                  <div className="w-11 h-11 rounded-xl bg-slate-800 text-amber-400 flex items-center justify-center font-black shrink-0 border border-slate-700">
                    <Settings className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-black text-sm text-white">⚙️ ማስተካከያዎች (Settings)</div>
                    <div className="text-[11px] text-slate-400">ድምፅ፣ ሙዚቃ እና ንዝረት (Vibration)</div>
                  </div>
                </button>

                <button
                  onClick={() => setSubScreen('profile')}
                  className="p-4 rounded-2xl border border-slate-700 bg-slate-900/90 hover:bg-slate-800 text-left transition-all cursor-pointer flex items-center gap-3.5"
                >
                  <div className="w-11 h-11 rounded-xl bg-slate-800 text-emerald-400 flex items-center justify-center font-black shrink-0 border border-slate-700">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-black text-sm text-white">👤 መገለጫ (Profile)</div>
                    <div className="text-[11px] text-slate-400">የተጫዋች ስም፣ ስልክ እና ስታቲስቲክስ</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Right 5 Cols: 2. Player Count (20s Timer) & 3. Pawn/King Selection */}
            <div className="lg:col-span-5 rounded-2xl border border-slate-800 bg-[#091428]/95 p-6 space-y-6 shadow-xl">
              {/* Section 2: Player Count & 20s Turn Timer */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>2. የተጫዋች ብዛት እና የ20 ሰከንድ ቆጣሪ</span>
                  </label>
                  <span className="text-[11px] text-emerald-400 font-bold">ቦቶች የሉም (No Bots)</span>
                </div>

                <div className="space-y-2">
                  {(
                    [
                      { count: 2 as const, label: '2 ተጫዋቾች (2 Players) — ለእያንዳንዱ ተጫዋች 20 ሰከንድ ቆጣሪ' },
                      { count: 3 as const, label: '3 ተጫዋቾች (3 Players) — ለእያንዳንዱ ተጫዋች 20 ሰከንድ ቆጣሪ' },
                      { count: 4 as const, label: '4 ተጫዋቾች (4 Players) — ለእያንዳንዱ ተጫዋች 20 ሰከንድ ቆጣሪ' },
                    ]
                  ).map((opt) => (
                    <button
                      key={opt.count}
                      onClick={() => setPlayerCount(opt.count)}
                      className={`w-full p-3 rounded-xl border text-left text-xs font-extrabold flex items-center justify-between transition-all cursor-pointer ${
                        playerCount === opt.count
                          ? 'border-amber-400 bg-amber-500/15 text-white'
                          : 'border-slate-800 bg-slate-900/70 text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>{opt.label}</span>
                      {playerCount === opt.count && (
                        <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Section 3: Pawn / Token King Selection (1, 2, 3, 4) */}
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <label className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                  <Crown className="w-4 h-4" />
                  <span>3. የካስ / ቆጣሪ ብዛት ምርጫ (Pawn Selection)</span>
                </label>

                <div className="grid grid-cols-2 gap-2.5">
                  {(
                    [
                      { goal: 1 as const, label: '👑 1 ካስ ማንገስ', sub: 'ፈጣን ጨዋታ' },
                      { goal: 2 as const, label: '👑 2 ካሶች ማንገስ', sub: 'ተወዳጅ ምርጫ' },
                      { goal: 3 as const, label: '👑 3 ካሶች ማንገስ', sub: 'መካከለኛ ውድድር' },
                      { goal: 4 as const, label: '👑 4 ካሶች ማንገስ', sub: 'ክላሲክ ሉዶ' },
                    ]
                  ).map((k) => (
                    <button
                      key={k.goal}
                      onClick={() => setKingGoal(k.goal)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        kingGoal === k.goal
                          ? 'border-emerald-400 bg-emerald-500/15 text-white'
                          : 'border-slate-800 bg-slate-900/70 text-slate-400 hover:text-white'
                      }`}
                    >
                      <div className="font-black text-xs sm:text-sm">{k.label}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{k.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Stake Birr Selection (Birr Only — No Coins) */}
              <div className="space-y-2.5 pt-2 border-t border-slate-800">
                <label className="text-xs font-black uppercase tracking-wider text-amber-300 block">
                  የውድድር መደብ በብር (Birr / ETB Stake)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[20, 50, 100, 200].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setStakeBirr(amt)}
                      className={`py-2.5 rounded-xl font-mono font-black text-xs border cursor-pointer ${
                        stakeBirr === amt
                          ? 'border-amber-400 bg-amber-500 text-slate-950'
                          : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      {amt} ብር
                    </button>
                  ))}
                </div>
              </div>

              {/* Player Token / Pawn Color Preference */}
              <div className="space-y-2.5 pt-2 border-t border-slate-800">
                <label className="text-xs font-black uppercase tracking-wider text-sky-400 flex items-center justify-between">
                  <span>የእርስዎ ካስ ቀለም (Your Pawn Color)</span>
                  <span className="text-[10px] text-slate-400 font-bold">
                    {COLOR_CONFIG[myChosenColor].amName}
                  </span>
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['red', 'green', 'yellow', 'blue'] as LudoColor[]).map((c) => (
                    <button
                      key={c}
                      onClick={() => setMyChosenColor(c)}
                      className={`py-2 rounded-xl text-xs font-black border flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                        myChosenColor === c
                          ? `${COLOR_CONFIG[c].badgeBg} text-white ring-2 ring-amber-300 border-white`
                          : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-white shadow" />
                      <span>{c === 'red' ? 'ቀይ' : c === 'green' ? 'አረንጓዴ' : c === 'yellow' ? 'ቢጫ' : 'ሰማያዊ'}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ===================================================================== */}
          {/* OPEN ROOMS LIVE LOBBY (🚪 ክፍት ክፍሎች — Replaces 3rd Party Design with ቅዳሜ LUDO) */}
          {/* ===================================================================== */}
          <div className="rounded-3xl border border-slate-800 bg-[#071124]/95 p-6 sm:p-7 space-y-6 shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/40 text-amber-300 flex items-center justify-center font-black">
                  <DoorOpen className="w-6 h-6 stroke-[2.5]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-black uppercase tracking-wider">
                      ቅዳሜ LUDO LIVE
                    </span>
                    <span className="text-xs text-emerald-400 font-bold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                      {openRooms.length} ክፍት ክፍሎች ተጋጣሚ እየጠበቁ ናቸው
                    </span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-white mt-0.5">
                    🚪 ክፍት ክፍሎች (Open Rooms) — በቀጥታ ተቀላቀሉ
                  </h3>
                </div>
              </div>

              {/* Action Buttons: Create Room & Refresh */}
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => {
                    setRoomCode(`KDM-${Math.floor(1000 + Math.random() * 9000)}`);
                    setSubScreen('create-room');
                  }}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>➕ ክፍል ፍጠር</span>
                </button>

                <button
                  onClick={() => {
                    triggerHaptic(25);
                    if (sfxEnabled) soundFX.playClick();
                    setStatusBanner('🔄 ክፍት ክፍሎች ተዘምነዋል!');
                  }}
                  className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 cursor-pointer"
                  title="አድስ (Refresh)"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Room Filter Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-bold scrollbar-none">
              <span className="text-slate-400 text-xs shrink-0 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-amber-400" />
                <span>ማጣሪያ፦</span>
              </span>
              {[
                { id: 'all', label: 'ሁሉንም ክፍሎች (All)' },
                { id: '20', label: '20 ETB' },
                { id: '50', label: '50 ETB' },
                { id: '100', label: '100 ETB' },
                { id: '200+', label: '200+ ETB' },
                { id: '2p', label: '2 ተጫዋቾች (2P)' },
                { id: '4p', label: '4 ተጫዋቾች (4P)' },
              ].map((chip) => (
                <button
                  key={chip.id}
                  onClick={() => setOpenRoomsFilter(chip.id as typeof openRoomsFilter)}
                  className={`px-3 py-1.5 rounded-xl border shrink-0 transition-all cursor-pointer ${
                    openRoomsFilter === chip.id
                      ? 'border-amber-400 bg-amber-500 text-slate-950 font-black'
                      : 'border-slate-800 bg-slate-900/80 text-slate-300 hover:text-white'
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {/* Room Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {openRooms
                .filter((r) => {
                  if (openRoomsFilter === '20') return r.stakeBirr === 20;
                  if (openRoomsFilter === '50') return r.stakeBirr === 50;
                  if (openRoomsFilter === '100') return r.stakeBirr === 100;
                  if (openRoomsFilter === '200+') return r.stakeBirr >= 200;
                  if (openRoomsFilter === '2p') return r.playerCount === 2;
                  if (openRoomsFilter === '4p') return r.playerCount === 4;
                  return true;
                })
                .map((room) => {
                  const prize = Math.round(room.stakeBirr * room.playerCount * 0.9);
                  return (
                    <div
                      key={room.id}
                      className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5 space-y-4 hover:border-amber-500/50 transition-all relative overflow-hidden group shadow-lg"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                            #{room.code}
                          </span>
                          <span className="text-[10px] text-slate-400">{room.createdAt}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          ተጋጣሚ እየጠበቀ
                        </span>
                      </div>

                      {/* Host & Rule Info */}
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-11 h-11 rounded-xl ${COLOR_CONFIG[room.hostColor].badgeBg} flex items-center justify-center text-white font-black text-base shadow-md`}
                        >
                          👑
                        </div>
                        <div>
                          <div className="font-black text-sm text-white flex items-center gap-1.5">
                            <span>{room.hostName}</span>
                            <span className="text-[11px] text-slate-400 font-normal">
                              ({COLOR_CONFIG[room.hostColor].amName})
                            </span>
                          </div>
                          <div className="text-xs text-amber-300 font-bold mt-0.5">
                            {room.playerCount} ተጫዋቾች (20s) · 👑 {room.kingGoal} ካስ ማንገስ
                          </div>
                        </div>
                      </div>

                      {/* Stake & Prize Info */}
                      <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-2.5 flex items-center justify-between text-xs">
                        <div>
                          <span className="text-slate-400">መደብ፦ </span>
                          <span className="font-mono font-black text-white">{room.stakeBirr} ETB</span>
                        </div>
                        <div className="text-right">
                          <span className="text-slate-400">ደራሽ፦ </span>
                          <span className="font-mono font-black text-amber-300">+{prize} ETB</span>
                        </div>
                      </div>

                      {/* Join Button */}
                      <button
                        onClick={() => handleJoinOpenRoom(room)}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-amber-500/20 transition-all"
                      >
                        <Play className="w-4 h-4 fill-current" />
                        <span>ተቀላቀል (Join Room)</span>
                      </button>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* DEDICATED OPEN ROOMS FULL SCREEN (subScreen === 'open-rooms') */}
      {/* ===================================================================== */}
      {subScreen === 'open-rooms' && (
        <div className="max-w-5xl mx-auto rounded-3xl border border-slate-800 bg-[#071124] p-6 sm:p-8 space-y-6 shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 text-[10px] font-black uppercase">
                  ቅዳሜ LUDO
                </span>
                <span className="text-xs text-emerald-400 font-bold">ኦፊሴላዊ የክፍሎች ዝርዝር</span>
              </div>
              <h2 className="text-2xl font-black text-white mt-1">
                🚪 ሁሉም ክፍት ክፍሎች (All Open Rooms)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                እያንዳንዱ ክፍል በ20 ሰከንድ ቆጣሪ እና ያለ ቦቶች በትክክለኛ ተጫዋቾች ይካሄዳል
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setRoomCode(`KDM-${Math.floor(1000 + Math.random() * 9000)}`);
                  setSubScreen('create-room');
                }}
                className="px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 cursor-pointer shadow-lg"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>➕ ክፍል ፍጠር</span>
              </button>

              <button
                onClick={() => setSubScreen('home')}
                className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-extrabold text-xs cursor-pointer"
              >
                ወደ ዋና ማውጫ
              </button>
            </div>
          </div>

          {/* Rooms Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {openRooms.map((room) => {
              const prize = Math.round(room.stakeBirr * room.playerCount * 0.9);
              return (
                <div
                  key={room.id}
                  className="rounded-2xl border border-slate-800 bg-slate-950 p-5 space-y-4 hover:border-amber-400/60 transition-all shadow-xl"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-black text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded border border-amber-500/20">
                      #{room.code}
                    </span>
                    <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      ክፍት
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-xl ${COLOR_CONFIG[room.hostColor].badgeBg} flex items-center justify-center text-white text-xl font-black`}
                    >
                      👑
                    </div>
                    <div>
                      <div className="font-black text-sm text-white">{room.hostName}</div>
                      <div className="text-xs text-slate-400">
                        {room.playerCount} ተጫዋቾች (20s) · 👑 {room.kingGoal} ካስ
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <div className="text-slate-400 text-[10px]">መደብ</div>
                      <div className="font-mono font-black text-white">{room.stakeBirr} ETB</div>
                    </div>
                    <div className="text-right">
                      <div className="text-slate-400 text-[10px]">1ኛ ደረጃ ደራሽ</div>
                      <div className="font-mono font-black text-amber-300">+{prize} ETB</div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleJoinOpenRoom(room)}
                    className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-amber-500/20"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>ተቀላቀል (Join Room)</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* CREATE ROOM SCREEN (➕ ክፍል ፍጠር) */}
      {/* ===================================================================== */}
      {subScreen === 'create-room' && (
        <div className="max-w-2xl mx-auto rounded-2xl border border-slate-800 bg-[#091428] p-6 sm:p-8 space-y-6 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-xl font-black text-white">➕ የሉዶ ማስተር ክፍል መፍጠሪያ (Create Room)</h2>
              <p className="text-xs text-slate-400 mt-1">
                የክፍል ኮድዎን ለጓደኞችዎ ያጋሩ ወይም የጓደኛዎን ክፍል ኮድ ያስገቡ
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-amber-500/40 bg-slate-950 p-5 flex items-center justify-between gap-4">
            <div>
              <div className="text-xs text-slate-400 font-bold">የእርስዎ የክፍል ኮድ (Room Code)</div>
              <div className="text-2xl sm:text-3xl font-mono font-black text-amber-400 tracking-wider mt-1">
                {roomCode}
              </div>
              <div className="text-xs text-emerald-400 mt-1 font-bold">
                {playerCount} ተጫዋቾች · 👑 {kingGoal} ካስ ማንገስ · መደብ {stakeBirr} ብር · ደራሽ {totalPrizeBirr} ብር
              </div>
            </div>
            <button
              onClick={() => {
                if (navigator.clipboard) {
                  navigator.clipboard.writeText(roomCode);
                }
              }}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Copy className="w-4 h-4" />
              <span>ኮድ ኮፒ አድርግ</span>
            </button>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-extrabold text-slate-300 block">
              ወይም የጓደኛ ክፍል ኮድ ያስገቡ (Join Existing Room)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={joinCodeInput}
                onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                placeholder="ምሳሌ፦ KDM-4510"
                className="flex-1 px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono font-bold text-white"
              />
              <button
                onClick={() => handleStartMatch('online-room')}
                className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm cursor-pointer"
              >
                ክፍል ግባና ጀምር
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={() => {
                const newRoom: OpenLudoRoom = {
                  id: `r-${Date.now()}`,
                  code: roomCode,
                  hostName: 'እርስዎ (አስተናጋጅ)',
                  hostColor: myChosenColor,
                  stakeBirr,
                  playerCount,
                  currentPlayers: 1,
                  kingGoal,
                  status: 'waiting',
                  createdAt: 'አሁን',
                };
                setOpenRooms((prev) => [newRoom, ...prev]);
                setStatusBanner(`🎉 ክፍል #${roomCode} በተሳካ ሁኔታ በክፍት ክፍሎች ላይ ተለቋል!`);
                setSubScreen('open-rooms');
              }}
              className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs sm:text-sm shadow-lg cursor-pointer flex items-center justify-center gap-2"
            >
              <Share2 className="w-4 h-4 stroke-[2.5]" />
              <span>📢 በክፍት ክፍሎች ላይ ልቀቅ (Publish Room)</span>
            </button>

            <button
              onClick={() => handleStartMatch('online-room')}
              className="flex-1 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm shadow-lg cursor-pointer flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>🎮 ጨዋታውን አሁኑኑ ጀምር</span>
            </button>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* OFFLINE / PASS & PLAY SETUP (📱 ከመስመር ውጭ ማጫዎቻ) */}
      {/* ===================================================================== */}
      {subScreen === 'offline-setup' && (
        <div className="max-w-2xl mx-auto rounded-2xl border border-slate-800 bg-[#091428] p-6 sm:p-8 space-y-6 shadow-2xl">
          <div>
            <h2 className="text-xl font-black text-white">
              📱 ከመስመር ውጭ ማጫዎቻ (Offline / Pass & Play)
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              የተጫዋቾቹን ስም ያስገቡ — እያንዳንዱ ተጫዋች የ20 ሰከንድ ቆጣሪ ይኖረዋል
            </p>
          </div>

          <div className="space-y-3">
            {activeColors.map((col, idx) => (
              <div key={col} className="flex items-center gap-3">
                <span
                  className={`w-28 py-2.5 px-3 rounded-xl text-xs font-black text-white text-center ${COLOR_CONFIG[col].badgeBg}`}
                >
                  {COLOR_CONFIG[col].amName}
                </span>
                <input
                  type="text"
                  value={playerNames[col]}
                  onChange={(e) =>
                    setPlayerNames((prev) => ({ ...prev, [col]: e.target.value }))
                  }
                  placeholder={`ተጫዋች ${idx + 1}`}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm font-bold text-white"
                />
              </div>
            ))}
          </div>

          <button
            onClick={() => handleStartMatch('offline-pass')}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black text-sm shadow-lg cursor-pointer"
          >
            🎮 የPass & Play ጨዋታ ጀምር ({playerCount} ተጫዋቾች · 👑 {kingGoal} ካስ)
          </button>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 4 & 5. LUDO MASTER GAME BOARD, GLOWING DICE, 20s TIMER & WINNER SCREEN */}
      {/* ===================================================================== */}
      {subScreen === 'board' && (
        <div className="space-y-6">
          {/* Winner Screen Overlay Banner (5. 1st place ends game immediately; 2nd, 3rd, 4th ranked) */}
          {matchResult && (
            <div className="rounded-3xl border-2 border-amber-400 bg-gradient-to-br from-[#0F241D] via-[#091428] to-[#1F1209] p-6 shadow-2xl space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center text-3xl font-black shadow-lg">
                    🏆
                  </div>
                  <div>
                    <div className="text-xs font-black uppercase tracking-wider text-amber-400">
                      1ኛ ደረጃ አሸናፊ ተለይቷል — ጨዋታው ወዲያውኑ አብቅቷል!
                    </div>
                    <h3 className="text-2xl font-black text-white mt-0.5">
                      {matchResult.winnerName} — +{matchResult.prizeBirr} ብር (ETB) አሸንፏል!
                    </h3>
                  </div>
                </div>

                <button
                  onClick={() => handleStartMatch(modeType)}
                  className="px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm cursor-pointer flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>አዲስ ዙር እንደገና ጀምር</span>
                </button>
              </div>

              {/* Standings Table: 1st Winner + 2nd, 3rd, 4th Defeated */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {matchResult.standings.map((st) => (
                  <div
                    key={st.color}
                    className={`rounded-2xl border p-4 ${
                      st.rank === 1
                        ? 'border-amber-400 bg-amber-500/15'
                        : 'border-slate-800 bg-slate-900/80'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-sm text-white">{st.name}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-black text-white ${
                          COLOR_CONFIG[st.color].badgeBg
                        }`}
                      >
                        {st.rank}ኛ ደረጃ
                      </span>
                    </div>
                    <div className="text-xs font-bold text-amber-300 mt-2">{st.statusLabel}</div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      የነገሱ ካሶች፦ 👑 {st.crownedCount} / {matchResult.kingGoal}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left 7 Columns: 15x15 Ludo Board with Red, Green, Yellow, Blue Houses, Safe Stars & Finish Crown */}
            <div className="lg:col-span-7 flex flex-col items-center">
              <div className="w-full max-w-[560px] aspect-square rounded-3xl border-4 border-amber-500/70 bg-[#060E1E] p-2.5 sm:p-3.5 shadow-2xl">
                <div className="w-full h-full grid grid-cols-15 grid-rows-15 border border-slate-700 rounded-2xl overflow-hidden bg-[#0B172E]">
                  {Array.from({ length: 15 }).map((_, r) =>
                    Array.from({ length: 15 }).map((__, c) => {
                      const isRedYard = r < 6 && c < 6;
                      const isGreenYard = r < 6 && c > 8;
                      const isBlueYard = r > 8 && c < 6;
                      const isYellowYard = r > 8 && c > 8;
                      const isCenterGoal = r >= 6 && r <= 8 && c >= 6 && c <= 8;

                      const isRedHomePath = r === 7 && c >= 1 && c <= 5;
                      const isGreenHomePath = c === 7 && r >= 1 && r <= 5;
                      const isYellowHomePath = r === 7 && c >= 9 && c <= 13;
                      const isBlueHomePath = c === 7 && r >= 9 && r <= 13;

                      const isRedStart = r === 6 && c === 1;
                      const isGreenStart = r === 1 && c === 8;
                      const isYellowStart = r === 8 && c === 13;
                      const isBlueStart = r === 13 && c === 6;

                      const outerIdx = OUTER_TRACK_COORDS.findIndex(
                        ([or, oc]) => or === r && oc === c
                      );
                      const isSafeStar = outerIdx !== -1 && SAFE_OUTER_INDICES.has(outerIdx);

                      let cellClass = 'bg-[#0F1E3A] border-[0.5px] border-slate-800/80';
                      if (isRedYard) cellClass = 'bg-rose-950/80 border-rose-900/40';
                      if (isGreenYard) cellClass = 'bg-emerald-950/80 border-emerald-900/40';
                      if (isBlueYard) cellClass = 'bg-sky-950/80 border-sky-900/40';
                      if (isYellowYard) cellClass = 'bg-amber-950/80 border-amber-900/40';

                      if (isRedHomePath || isRedStart)
                        cellClass = 'bg-rose-600/85 border-[0.5px] border-rose-300/60';
                      if (isGreenHomePath || isGreenStart)
                        cellClass = 'bg-emerald-600/85 border-[0.5px] border-emerald-300/60';
                      if (isYellowHomePath || isYellowStart)
                        cellClass = 'bg-amber-500/85 border-[0.5px] border-amber-200/60';
                      if (isBlueHomePath || isBlueStart)
                        cellClass = 'bg-sky-600/85 border-[0.5px] border-sky-300/60';

                      if (isCenterGoal) {
                        cellClass =
                          'bg-gradient-to-br from-rose-600/50 via-amber-500/50 to-emerald-600/50 border border-amber-300/60';
                      }

                      const cellTokens = tokens.filter((t) => {
                        if (!activeColors.includes(t.color)) return false;
                        const [tr, tc] = getTokenGridCoord(t);
                        return tr === r && tc === c;
                      });

                      return (
                        <div
                          key={`${r}-${c}`}
                          className={`relative flex items-center justify-center select-none ${cellClass}`}
                        >
                          {/* ⭐ Safe Star Cell Marker */}
                          {isSafeStar && cellTokens.length === 0 && (
                            <span className="text-[11px] sm:text-xs text-amber-300 font-black drop-shadow">
                              ⭐
                            </span>
                          )}

                          {/* Center Finish Crown */}
                          {r === 7 && c === 7 && (
                            <Crown className="w-5 h-5 text-amber-300 drop-shadow" />
                          )}

                          {/* Render Pawns on this cell */}
                          {cellTokens.map((tok, idx) => {
                            const canClick =
                              isMatchActive &&
                              hasRolledThisTurn &&
                              diceValue !== null &&
                              tok.color === currentTurnColor &&
                              canMoveToken(tok, diceValue);

                            return (
                              <button
                                key={`${tok.color}-${tok.id}`}
                                disabled={!canClick}
                                onClick={() => {
                                  if (canClick && diceValue !== null) {
                                    executeTokenMove(tok, diceValue);
                                  }
                                }}
                                style={{
                                  transform:
                                    cellTokens.length > 1
                                      ? `translate(${(idx - 0.5) * 4}px, ${(idx - 0.5) * -4}px)`
                                      : undefined,
                                }}
                                className={`w-4/5 h-4/5 rounded-full bg-gradient-to-b ${
                                  COLOR_CONFIG[tok.color].tokenGrad
                                } border-2 border-white shadow-md flex items-center justify-center transition-transform ${
                                  canClick
                                    ? 'ring-4 ring-amber-300 scale-115 animate-bounce cursor-pointer z-20'
                                    : 'z-10'
                                }`}
                              >
                                {tok.step === 56 ? (
                                  <span className="text-[9px]">👑</span>
                                ) : (
                                  <span className="w-1.5 h-1.5 rounded-full bg-white/95" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Right 5 Columns: 20s Turn Countdown, Glowing Dice Button, and Active Houses Progress */}
            <div className="lg:col-span-5 space-y-5 rounded-2xl border border-slate-800 bg-[#091428]/95 p-6 shadow-xl">
              {/* Status Banner */}
              <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 p-3.5 text-xs sm:text-sm font-extrabold text-amber-200 flex items-center gap-2.5">
                <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
                <span>{statusBanner}</span>
              </div>

              {/* 20-Second Turn Timer Bar */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-black text-white">
                      የተራ ቆጣሪ (20s Turn Timer)፦ {playerNames[currentTurnColor]}
                    </span>
                  </div>
                  <span
                    className={`font-mono text-base font-black px-2.5 py-0.5 rounded-lg ${
                      turnSecondsLeft <= 5
                        ? 'bg-rose-600 text-white animate-pulse'
                        : 'bg-amber-500/20 text-amber-300'
                    }`}
                  >
                    00:{String(turnSecondsLeft).padStart(2, '0')}s
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-900 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-500 transition-all duration-500"
                    style={{ width: `${(turnSecondsLeft / 20) * 100}%` }}
                  />
                </div>
              </div>

              {/* Glowing Ludo Master Dice Roller */}
              <div className="rounded-2xl border border-amber-500/40 bg-[#060E1F] p-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div
                    onClick={handleRollDice}
                    className={`w-20 h-20 rounded-2xl border-2 flex items-center justify-center cursor-pointer transition-all ${
                      COLOR_CONFIG[currentTurnColor].glow
                    } ${
                      isRolling
                        ? 'scale-110 border-white bg-amber-400'
                        : 'border-amber-300 bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 hover:scale-105'
                    }`}
                  >
                    <DiceFacePips value={diceValue} isRolling={isRolling} />
                  </div>

                  <div>
                    <div className="text-xs font-bold text-amber-300">
                      {playerNames[currentTurnColor]} ({COLOR_CONFIG[currentTurnColor].amName})
                    </div>
                    <div className="text-lg font-black text-white mt-0.5">
                      {diceValue ? `የወጣ ቁጥር፦ ${diceValue}` : 'ዳይሱን ይወርውሩ'}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      👑 ግብ፦ {kingGoal} ካስ ማንገስ · ደራሽ {totalPrizeBirr} ETB
                    </div>
                  </div>
                </div>

                <button
                  disabled={!isMatchActive || isRolling || hasRolledThisTurn || Boolean(matchResult)}
                  onClick={handleRollDice}
                  className="px-5 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-amber-500/30 cursor-pointer shrink-0"
                >
                  🎲 ዳይስ ወርውር
                </button>
              </div>

              {/* Active Players Progress Cards */}
              <div className="grid grid-cols-2 gap-2.5">
                {activeColors.map((col) => {
                  const crowned = tokens.filter((t) => t.color === col && t.step === 56).length;
                  const isTurn = currentTurnColor === col && isMatchActive;
                  return (
                    <div
                      key={col}
                      className={`rounded-xl border p-3 transition-all ${
                        isTurn
                          ? `${COLOR_CONFIG[col].border} bg-slate-900 shadow-md`
                          : 'border-slate-800 bg-slate-950/70 opacity-80'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-black ${COLOR_CONFIG[col].text}`}>
                          {playerNames[col]}
                        </span>
                        {isTurn && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 text-[10px] font-black">
                            ተራ
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-mono font-black text-white mt-1.5">
                        👑 {crowned} / {kingGoal} ነግሷል
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* ⚙️ SETTINGS SCREEN (ድምፅ፣ የጀርባ ሙዚቃ እና ንዝረት) */}
      {/* ===================================================================== */}
      {subScreen === 'settings' && (
        <div className="max-w-2xl mx-auto rounded-2xl border border-slate-800 bg-[#091428] p-6 sm:p-8 space-y-5 shadow-2xl">
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-amber-400" />
            <span>⚙️ ማስተካከያዎች (Ludo Master Settings)</span>
          </h2>

          <div className="space-y-3">
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-950 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {sfxEnabled ? (
                  <Volume2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <VolumeX className="w-5 h-5 text-slate-500" />
                )}
                <div>
                  <div className="font-bold text-sm text-white">
                    የዳይስ፣ የካስ መሄጃ እና የማሸነፊያ ድምፅ (Sound Effects)
                  </div>
                  <div className="text-xs text-slate-400">
                    ዳይስ ሲወረወር፣ ተቃዋሚ ሲበላ እና 1ኛ ወጥተው ሲያሸንፉ የሚሰማ ድምፅ
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSfxEnabled(!sfxEnabled)}
                className={`px-4 py-2 rounded-xl text-xs font-black cursor-pointer ${
                  sfxEnabled ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {sfxEnabled ? 'በርቷል (ON)' : 'ጠፍቷል (OFF)'}
              </button>
            </div>

            <div className="p-4 rounded-xl border border-slate-800 bg-slate-950 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Music className="w-5 h-5 text-amber-400" />
                <div>
                  <div className="font-bold text-sm text-white">የጀርባ ሙዚቃ (Background Music)</div>
                  <div className="text-xs text-slate-400">ለስላሳ የሉዶ ማስተር የጀርባ ሙዚቃ</div>
                </div>
              </div>
              <button
                onClick={() => setBgMusicEnabled(!bgMusicEnabled)}
                className={`px-4 py-2 rounded-xl text-xs font-black cursor-pointer ${
                  bgMusicEnabled ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {bgMusicEnabled ? 'በርቷል (ON)' : 'ጠፍቷል (OFF)'}
              </button>
            </div>

            <div className="p-4 rounded-xl border border-slate-800 bg-slate-950 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Vibrate className="w-5 h-5 text-sky-400" />
                <div>
                  <div className="font-bold text-sm text-white">ንዝረት (Vibration API)</div>
                  <div className="text-xs text-slate-400">ዳይስ ሲወረወር እና ካስ ሲበላ ስልኩ እንዲነዝር</div>
                </div>
              </div>
              <button
                onClick={() => setVibrationEnabled(!vibrationEnabled)}
                className={`px-4 py-2 rounded-xl text-xs font-black cursor-pointer ${
                  vibrationEnabled ? 'bg-sky-400 text-slate-950' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {vibrationEnabled ? 'በርቷል (ON)' : 'ጠፍቷል (OFF)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 👤 PROFILE SCREEN (መገለጫ) */}
      {/* ===================================================================== */}
      {subScreen === 'profile' && (
        <div className="max-w-2xl mx-auto rounded-2xl border border-slate-800 bg-[#091428] p-6 sm:p-8 space-y-6 shadow-2xl">
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <User className="w-5 h-5 text-emerald-400" />
            <span>👤 የተጫዋች መገለጫ (Player Profile)</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1">ዋና የተጫዋች ስም</label>
              <input
                type="text"
                value={playerNames.red}
                onChange={(e) =>
                  setPlayerNames((prev) => ({ ...prev, red: e.target.value }))
                }
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm font-bold text-white"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1">ስልክ ቁጥር</label>
              <input
                type="text"
                value={profilePhone}
                onChange={(e) => setProfilePhone(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono font-bold text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-center">
              <div className="text-xs text-slate-400">ጠቅላላ ጨዋታዎች</div>
              <div className="text-xl font-black font-mono text-white mt-1">
                {matchHistory.length}
              </div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-center">
              <div className="text-xs text-slate-400">ቀሪ ሂሳብ (Birr)</div>
              <div className="text-xl font-black font-mono text-emerald-400 mt-1">
                {balanceBirr.toFixed(0)} ETB
              </div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-center">
              <div className="text-xs text-slate-400">የተመረጠ ህግ</div>
              <div className="text-xl font-black text-amber-400 mt-1">👑 {kingGoal} ካስ</div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 💵 WALLET & BIRR SYSTEM (የሳንቲም አጠቃቀም ሙሉ በሙሉ ተሰርዞ በብር ETB ብቻ) */}
      {/* ===================================================================== */}
      {subScreen === 'wallet' && (
        <div className="max-w-3xl mx-auto rounded-2xl border border-slate-800 bg-[#091428] p-6 sm:p-8 space-y-6 shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-xl font-black text-white">
                💵 የብር እና ሽልማቶች አስተዳደር (Birr Wallet & Rewards)
              </h2>
              <p className="text-xs text-amber-400 font-bold mt-0.5">
                የሳንቲም (Coin) አጠቃቀም ሙሉ በሙሉ ተሰርዞ ሁሉም ውድድሮች እና ሽልማቶች በብር (ETB) ብቻ ይሰራሉ።
              </p>
            </div>
            <div className="px-4 py-2.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-right">
              <div className="text-[11px] text-emerald-300">ጠቅላላ የብር ሂሳብ</div>
              <div className="text-2xl font-mono font-black text-emerald-400">
                {balanceBirr.toFixed(2)} ETB
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 space-y-3">
              <div className="font-black text-sm text-emerald-400 flex items-center gap-2">
                <ArrowDownLeft className="w-4 h-4" />
                <span>ብር ወደ ዋሌት አስገባ (Deposit Birr)</span>
              </div>
              <input
                type="number"
                value={walletAmountInput}
                onChange={(e) => setWalletAmountInput(e.target.value)}
                placeholder="የብር መጠን (ETB)"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm font-mono font-bold text-white"
              />
              <input
                type="text"
                value={walletRefInput}
                onChange={(e) => setWalletRefInput(e.target.value)}
                placeholder="የቴሌብር / CBE ደረሰኝ ቁጥር (Reference)"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-white"
              />
              <button
                onClick={() => {
                  const amt = Math.max(10, Number(walletAmountInput) || 0);
                  onAdjustBalance(amt, `የብር ዲፖዚት ተጨምሯል (+${amt} ETB)`);
                  setWalletRefInput('');
                }}
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs cursor-pointer"
              >
                + ብር ወደ ዋሌት ጨምር (ETB)
              </button>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 space-y-3">
              <div className="font-black text-sm text-amber-400 flex items-center gap-2">
                <ArrowUpRight className="w-4 h-4" />
                <span>የሽልማት ብር አውጣ (Withdraw Birr)</span>
              </div>
              <input
                type="number"
                value={walletAmountInput}
                onChange={(e) => setWalletAmountInput(e.target.value)}
                placeholder="የሚወጣ የብር መጠን (ETB)"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm font-mono font-bold text-white"
              />
              <button
                onClick={() => {
                  const amt = Math.max(10, Number(walletAmountInput) || 0);
                  if (balanceBirr >= amt) {
                    onAdjustBalance(-amt, `የብር ወጪ ጥያቄ (-${amt} ETB)`);
                  }
                }}
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs cursor-pointer"
              >
                በቴሌብር / CBE ወጪ አድርግ (ETB)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 📜 GAME HISTORY SCREEN (ያለፉት ጨዋታዎች እና የብር እንቅስቃሴዎች ማጣሪያ) */}
      {/* ===================================================================== */}
      {subScreen === 'history' && (
        <div className="rounded-2xl border border-slate-800 bg-[#091428] p-6 space-y-5 shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <History className="w-5 h-5 text-purple-400" />
                <span>📜 የጨዋታ ታሪክ እና የብር እንቅስቃሴዎች (Game & Birr History)</span>
              </h2>
            </div>

            {/* Filter Buttons */}
            <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
              {(
                [
                  { id: 'all', label: 'ሁሉም (All)' },
                  { id: '2p', label: '2 ተጫዋቾች' },
                  { id: '3p', label: '3 ተጫዋቾች' },
                  { id: '4p', label: '4 ተጫዋቾች' },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  onClick={() => setHistoryFilter(f.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black cursor-pointer ${
                    historyFilter === f.id
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {filteredHistory.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-slate-800 bg-slate-950 p-4 flex flex-wrap items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-black text-amber-400">#{item.id}</span>
                    <span className="text-sm font-black text-white">{item.modeLabel}</span>
                  </div>
                  <div className="text-xs text-emerald-400 font-bold mt-1">
                    🏆 1ኛ አሸናፊ፦ {item.winnerName} (+{item.prizeBirr} ETB)
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{item.timestamp}</div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {item.standings.map((s) => (
                    <span
                      key={s.color}
                      className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-bold text-slate-300"
                    >
                      {s.rank}ኛ: {s.name} (👑{s.crownedCount})
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 🏆 LEADERBOARD SCREEN (የደረጃ ሰንጠረዥ) */}
      {/* ===================================================================== */}
      {subScreen === 'leaderboard' && (
        <div className="rounded-2xl border border-slate-800 bg-[#091428] p-6 space-y-5 shadow-2xl">
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <span>🏆 የ«ቅዳሜ Games — የሉዶ ማስተር» ከፍተኛ አሸናፊዎች ደረጃ ሰንጠረዥ</span>
          </h2>

          <div className="space-y-2.5">
            {(sharedUsers && sharedUsers.length > 0
              ? sharedUsers
              : [
                  {
                    id: 'u-1',
                    name: playerNames.red,
                    phone: profilePhone,
                    balance: balanceBirr,
                    bonusBalance: 0,
                    passwordHash: '',
                    referralCode: 'KDM1',
                    referredCount: 3,
                    referralEarnings: 75,
                    isBlocked: false,
                    isAdmin: false,
                    joinedAt: '2026-10-12',
                  },
                ]
            )
              .slice()
              .sort((a, b) => b.balance - a.balance)
              .map((u, idx) => (
                <div
                  key={u.id}
                  className="rounded-xl border border-slate-800 bg-slate-950 p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${
                        idx === 0
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      #{idx + 1}
                    </span>
                    <div>
                      <div className="font-black text-sm text-white">{u.name}</div>
                      <div className="text-[11px] font-mono text-slate-400">{u.phone}</div>
                    </div>
                  </div>
                  <div className="font-mono font-black text-sm text-emerald-400">
                    {u.balance.toFixed(2)} ETB
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 7. CONTROL PANEL & TECH ARCHITECTURE (Delete Player, Birr Flow, Flutter+Firebase & Unity+Photon) */}
      {/* ===================================================================== */}
      {subScreen === 'control-panel' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-[#091428] p-6 space-y-5 shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  <Shield className="w-5 h-5 text-emerald-400" />
                  <span>7. የቁጥጥር ክፍል — የተጫዋቾች፣ የብር ሂሳብ እና የገንዘብ ፍሰት መቆጣጠሪያ</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  ተጫዋቾችን ከሲስተሙ ማጥፋት (Delete Player)፣ የብር ሂሳብ ማስተካከል እና የገንዘብ ፍሰት መቆጣጠር
                </p>
              </div>
            </div>

            {/* Add New Player */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 bg-slate-950 p-4 rounded-xl border border-slate-800">
              <input
                type="text"
                value={newPlayerNameInput}
                onChange={(e) => setNewPlayerNameInput(e.target.value)}
                placeholder="የተጫዋች ስም"
                className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs font-bold text-white"
              />
              <input
                type="text"
                value={newPlayerPhoneInput}
                onChange={(e) => setNewPlayerPhoneInput(e.target.value)}
                placeholder="ስልክ (09...)"
                className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-white"
              />
              <input
                type="number"
                value={newPlayerBirrInput}
                onChange={(e) => setNewPlayerBirrInput(e.target.value)}
                placeholder="መነሻ ብር (ETB)"
                className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-white"
              />
              <button
                onClick={() => {
                  if (!newPlayerNameInput.trim() || !onUpdateSharedUsers) return;
                  const newUser: UserAccount = {
                    id: `u-${Date.now()}`,
                    name: newPlayerNameInput.trim(),
                    phone: newPlayerPhoneInput.trim() || '0911000000',
                    passwordHash: '****',
                    balance: Number(newPlayerBirrInput) || 0,
                    bonusBalance: 0,
                    referralCode: `KDM${Math.floor(100 + Math.random() * 900)}`,
                    referredCount: 0,
                    referralEarnings: 0,
                    isBlocked: false,
                    isAdmin: false,
                    joinedAt: new Date().toISOString().slice(0, 10),
                  };
                  onUpdateSharedUsers((prev) => [newUser, ...prev]);
                  setNewPlayerNameInput('');
                  setNewPlayerPhoneInput('');
                }}
                className="px-4 py-2 rounded-lg bg-emerald-500 text-slate-950 font-black text-xs cursor-pointer"
              >
                + ተጫዋች ጨምር
              </button>
            </div>

            {/* Players List with Delete Player & Birr Adjustment */}
            <div className="space-y-2.5">
              {(sharedUsers || []).map((u) => (
                <div
                  key={u.id}
                  className="rounded-xl border border-slate-800 bg-slate-950 p-4 flex flex-wrap items-center justify-between gap-3"
                >
                  <div>
                    <div className="font-black text-sm text-white">{u.name}</div>
                    <div className="text-xs font-mono text-slate-400">
                      {u.phone} · ቀሪ፦ <span className="text-emerald-400 font-bold">{u.balance.toFixed(2)} ETB</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (!onUpdateSharedUsers) return;
                        onUpdateSharedUsers((prev) =>
                          prev.map((item) =>
                            item.id === u.id ? { ...item, balance: item.balance + 100 } : item
                          )
                        );
                      }}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-black cursor-pointer"
                    >
                      +100 ETB
                    </button>
                    <button
                      onClick={() => {
                        if (!onUpdateSharedUsers) return;
                        onUpdateSharedUsers((prev) =>
                          prev.map((item) =>
                            item.id === u.id
                              ? { ...item, balance: Math.max(0, item.balance - 100) }
                              : item
                          )
                        );
                      }}
                      className="px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black cursor-pointer"
                    >
                      -100 ETB
                    </button>
                    <button
                      onClick={() => {
                        if (!onUpdateSharedUsers) return;
                        onUpdateSharedUsers((prev) => prev.filter((item) => item.id !== u.id));
                      }}
                      className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-black flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>አጥፋ (Delete Player)</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tech Architecture Specification Card (Flutter + Firebase & Unity + Photon Multiplayer) */}
          <div className="rounded-2xl border border-slate-800 bg-[#091428] p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-black text-amber-400 flex items-center gap-2">
              <Cpu className="w-5 h-5" />
              <span>የቴክኖሎጂ መረጃ (Tech Architecture — Flutter + Firebase & Unity + Photon)</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs leading-relaxed text-slate-300">
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-2">
                <div className="font-black text-sm text-emerald-400">
                  1. Flutter + Firebase Real-Time Wallet & Auth Layer
                </div>
                <p>
                  • የተጫዋቾች ምዝገባ፣ የብር (ETB) ዋሌት ሂሳብ፣ የ20 ሰከንድ ተራ ማመሳከሪያ እና የጨዋታ ታሪክ በReal-Time Database እና WebSocket ሲስተም ይመሳከራሉ።
                </p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-2">
                <div className="font-black text-sm text-sky-400">
                  2. Unity + Photon Deterministic Multiplayer State Engine
                </div>
                <p>
                  • የ2፣ 3 እና 4 ተጫዋቾች የሉዶ ክፍሎች (Room Matchmaking)፣ የዳይስ ቁጥር ስርጭት፣ የካስ ንግሥና (👑 1–4 ካስ) እና 1ኛ የወጣ ወዲያውኑ ጨዋታውን የሚያጠናቅቅበት ሞተር።
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LudoMasterGame;
