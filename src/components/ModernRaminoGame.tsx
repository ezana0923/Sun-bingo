import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Users,
  Sparkles,
  RotateCcw,
  HelpCircle,
  ArrowLeft,
  Lock,
  ShieldCheck,
  Mic,
  MicOff,
  Headphones,
  AlertCircle,
  Key,
  ArrowDownCircle,
  X,
  Play,
  Copy,
  Check,
  Ban,
  Share2,
  Link2,
  UserPlus,
  Settings,
  Volume2,
  VolumeX,
  Globe,
  Smartphone,
  Palette,
  BookOpen,
} from 'lucide-react';
import { Language, UserAccount } from '../types/bingo';
import { buildApiUrl, getDeviceClientId } from '../utils/realtimeRoomClient';
import { applyTelegramSwipeLock, scrollAppToTop } from '../utils/telegramViewport';

interface RaminoPrivateRoomSnapshot {
  code: string;
  hostId?: string;
  hostName: string;
  maxPlayers: 2 | 3 | 4 | 5;
  stake: number;
  players: { id?: string; name: string; isHost: boolean; joinedAt: number }[];
  status: 'waiting' | 'started';
  voiceAccessKey?: string;
}

/* ========================================================
   1. TYPES & CARD DEFINITIONS
   ======================================================== */
export type SuitSymbol = '♠' | '♣' | '♦' | '♥' | '🃏';
export type CardColor = 'black' | 'red' | 'gold';
export type TableTheme = 'emerald' | 'mahogany' | 'midnight';

export interface PlayingCard {
  id: string;
  rank: string; // '2'-'10', 'J', 'Q', 'K', 'A', 'JOKER'
  suit: SuitSymbol;
  suitName: 'spades' | 'clubs' | 'diamonds' | 'hearts' | 'joker';
  color: CardColor;
  value: number; // 2..10, J/Q/K=10, A=11 or 1, JOKER=0
  points: number;
  isJoker: boolean;
  isPrintedJoker?: boolean;
}

export interface MeldGroup {
  id: string;
  cards: PlayingCard[];
  type: 'run' | 'set';
  suit?: SuitSymbol;
  rank?: string;
  ownerId: string;
  ownerColor: string;
  meldTurnSeq: number;
}

export interface ClosedSetBadge {
  id: string;
  rank: string;
  ownerId: string;
  ownerColor: string;
}

export interface RaminoOpponent {
  id: string;
  name: string;
  avatarLetter: string;
  cardCount: number;
  hand?: PlayingCard[];
  isDealer?: boolean;
  hasMelded?: boolean;
  isSuspended?: boolean;
  avatarColor: string;
}

export interface RaminoRoom {
  id: string;
  name: string;
  creator: string;
  stake: number;
  max: 2 | 3 | 4 | 5;
  current: number;
  duration: number;
  timeRemaining: number;
  isPrivate?: boolean;
  code?: string;
  isUserCreated?: boolean;
  avatarColor?: string;
  avatarLetter?: string;
}

export interface ModernRaminoGameProps {
  language?: Language;
  onChangeLanguage?: (lang: Language) => void;
  isDark?: boolean;
  sharedUsers?: UserAccount[];
  onUpdateSharedUsers?: React.Dispatch<React.SetStateAction<UserAccount[]>>;
  onBackToLobby?: () => void;
  onOpenWallet?: (tab?: 'deposit' | 'withdraw' | 'transfer' | 'history') => void;
  onRecordWalletTx?: (delta: number, reason: string) => void;
}

const SUITS: { symbol: SuitSymbol; name: 'spades' | 'clubs' | 'diamonds' | 'hearts'; color: CardColor }[] = [
  { symbol: '♠', name: 'spades', color: 'black' },
  { symbol: '♥', name: 'hearts', color: 'red' },
  { symbol: '♣', name: 'clubs', color: 'black' },
  { symbol: '♦', name: 'diamonds', color: 'red' },
];

const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

const RANK_VALUES: Record<string, number> = {
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  J: 10,
  Q: 10,
  K: 10,
  A: 11,
  JOKER: 0,
};

const CUT_RANK_ORDER: Record<string, number> = {
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14,
};

const SEAT_DURATION_MAP: Record<2 | 3 | 4 | 5, number> = {
  2: 60,
  3: 180,
  4: 240,
  5: 300,
};

const BOT_PROFILES: { id: string; name: string; avatarLetter: string; avatarColor: string }[] = [
  { id: 'hana', name: 'Hana', avatarLetter: 'H', avatarColor: 'bg-sky-500' },
  { id: 'robel', name: 'Robel', avatarLetter: 'R', avatarColor: 'bg-rose-500' },
  { id: 'kalkidan', name: 'Kalkidan', avatarLetter: 'K', avatarColor: 'bg-emerald-500' },
  { id: 'bethlehem', name: 'Bethlehem', avatarLetter: 'B', avatarColor: 'bg-purple-500' },
];

/* ========================================================
   WEB AUDIO SYNTHESIZER
   ======================================================== */
class RaminoAudioFX {
  private ctx: AudioContext | null = null;
  private muted = false;

  public setMuted(m: boolean) {
    this.muted = m;
  }

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public playCardSnap() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.08);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  public playDraw() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.12);
    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  public playVictory() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;
    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const now = this.ctx!.currentTime + i * 0.12;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(now);
      osc.stop(now + 0.3);
    });
  }

  public playBuzzer() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  public playSwap() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.15);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  }
}

const raminoAudio = new RaminoAudioFX();

/* ========================================================
   2. DECK & MELD EVALUATION HELPERS
   ======================================================== */
function buildShuffledDeck(deckCount: 1 | 2): PlayingCard[] {
  const cards: PlayingCard[] = [];
  let seq = 0;
  for (let d = 0; d < deckCount; d++) {
    for (const s of SUITS) {
      for (const r of RANKS) {
        seq++;
        cards.push({
          id: `card_${d}_${r}_${s.name}_${seq}`,
          rank: r,
          suit: s.symbol,
          suitName: s.name,
          color: s.color,
          value: RANK_VALUES[r] || 10,
          points: RANK_VALUES[r] || 10,
          isJoker: false,
        });
      }
    }
    // 2 Printed Jokers per 54-card deck
    for (let j = 0; j < 2; j++) {
      seq++;
      cards.push({
        id: `card_${d}_joker_${j}_${seq}`,
        rank: 'JOKER',
        suit: '🃏',
        suitName: 'joker',
        color: 'gold',
        value: 0,
        points: 0,
        isJoker: true,
        isPrintedJoker: true,
      });
    }
  }
  // Cryptographically strong Fisher-Yates shuffle
  const randInt = (maxExclusive: number) => {
    if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
      const buf = new Uint32Array(1);
      window.crypto.getRandomValues(buf);
      return buf[0] % maxExclusive;
    }
    return Math.floor(Math.random() * maxExclusive);
  };
  for (let i = cards.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

function isValidSet(cards: PlayingCard[]): boolean {
  if (cards.length < 3 || cards.length > 4) return false;
  const nonJokers = cards.filter((c) => !c.isJoker);
  if (nonJokers.length === 0) return false;
  const targetRank = nonJokers[0].rank;
  if (!nonJokers.every((c) => c.rank === targetRank)) return false;
  const suits = new Set(nonJokers.map((c) => c.suit));
  return suits.size === nonJokers.length;
}

function isAllFourSuitsClosedSet(cards: PlayingCard[]): boolean {
  if (cards.length !== 4) return false;
  const nonJokers = cards.filter((c) => !c.isJoker);
  if (nonJokers.length !== 4) return false;
  const rank = nonJokers[0].rank;
  if (!nonJokers.every((c) => c.rank === rank)) return false;
  const suits = new Set(nonJokers.map((c) => c.suit));
  return suits.size === 4;
}

function isValidRun(cards: PlayingCard[]): boolean {
  if (cards.length < 3) return false;
  const nonJokers = cards.filter((c) => !c.isJoker);
  if (nonJokers.length <= 1) return nonJokers.length === 1 && cards.length >= 3;
  const suit = nonJokers[0].suit;
  if (!nonJokers.every((c) => c.suit === suit)) return false;

  const testSequence = (ranksList: string[]) => {
    const jokersAvailable = cards.length - nonJokers.length;
    const indices = nonJokers
      .map((c) => ranksList.indexOf(c.rank))
      .filter((idx) => idx !== -1)
      .sort((a, b) => a - b);

    if (indices.length !== nonJokers.length) return false;
    for (let i = 0; i < indices.length - 1; i++) {
      if (indices[i] === indices[i + 1]) return false;
    }
    let gaps = 0;
    for (let i = 0; i < indices.length - 1; i++) {
      gaps += indices[i + 1] - indices[i] - 1;
    }
    return jokersAvailable >= gaps;
  };

  const aceLowOrder = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const aceHighOrder = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  return testSequence(aceLowOrder) || testSequence(aceHighOrder);
}

function getGroupPoints(cards: PlayingCard[]): number {
  // Check if Ace-low run (A-2-3), Ace = 1 point
  const nonJokers = cards.filter((c) => !c.isJoker);
  const isAceLowRun =
    isValidRun(cards) &&
    nonJokers.some((c) => c.rank === 'A') &&
    nonJokers.some((c) => c.rank === '2' || c.rank === '3');

  return cards.reduce((sum, c) => {
    if (c.isJoker) {
      // Wildcard takes the value of the card it replaces (~10 or rank value)
      if (nonJokers.length > 0 && isValidSet(cards)) {
        return sum + (RANK_VALUES[nonJokers[0].rank] || 10);
      }
      return sum + 10;
    }
    if (c.rank === 'A') return sum + (isAceLowRun ? 1 : 11);
    return sum + (RANK_VALUES[c.rank] || 10);
  }, 0);
}

interface PartitionedMeld {
  type: 'set' | 'run';
  cards: PlayingCard[];
  points: number;
}

// Exact optimal partition of cards into disjoint valid Sets and Runs (minimizes remaining cards, maximizes totalPoints)
function partitionValidMelds(cards: PlayingCard[]): {
  melds: PartitionedMeld[];
  remaining: PlayingCard[];
  totalPoints: number;
} {
  const n = cards.length;
  if (n < 3) {
    return { melds: [], remaining: [...cards], totalPoints: 0 };
  }

  interface CandidateMeld {
    mask: number;
    count: number;
    type: 'set' | 'run';
    cards: PlayingCard[];
    points: number;
  }

  const candidatesByMask = new Map<number, CandidateMeld>();
  const addCandidate = (type: 'set' | 'run', grpCards: PlayingCard[], indices: number[]) => {
    let mask = 0;
    for (const idx of indices) mask |= 1 << idx;
    const pts = getGroupPoints(grpCards);
    const existing = candidatesByMask.get(mask);
    if (!existing || pts > existing.points) {
      candidatesByMask.set(mask, {
        mask,
        count: indices.length,
        type,
        cards: grpCards,
        points: pts,
      });
    }
  };

  const jokerIndices: number[] = [];
  const naturalIndices: number[] = [];
  cards.forEach((c, idx) => {
    if (c.isJoker) jokerIndices.push(idx);
    else naturalIndices.push(idx);
  });

  // Helper to expand index combinations when duplicate card copies or multiple Jokers exist
  const jokerCombos = (countNeeded: number): number[][] => {
    if (countNeeded === 0) return [[]];
    if (jokerIndices.length < countNeeded) return [];
    if (countNeeded === 1) return jokerIndices.map((j) => [j]);
    const res: number[][] = [];
    for (let a = 0; a < jokerIndices.length; a++) {
      for (let b = a + 1; b < jokerIndices.length; b++) {
        res.push([jokerIndices[a], jokerIndices[b]]);
      }
    }
    return res;
  };

  // 1. Generate all valid Set candidates (3-4 cards, distinct suits, 0..2 Jokers)
  const byRankIdx: Record<string, number[]> = {};
  for (const idx of naturalIndices) {
    const r = cards[idx].rank;
    if (!byRankIdx[r]) byRankIdx[r] = [];
    byRankIdx[r].push(idx);
  }
  for (const rankIdxs of Object.values(byRankIdx)) {
    const m = rankIdxs.length;
    for (let sub = 1; sub < (1 << m); sub++) {
      const chosen: number[] = [];
      const seenSuits = new Set<string>();
      let validSuitSet = true;
      for (let b = 0; b < m; b++) {
        if (sub & (1 << b)) {
          const ci = rankIdxs[b];
          const s = cards[ci].suit;
          if (seenSuits.has(s)) {
            validSuitSet = false;
            break;
          }
          seenSuits.add(s);
          chosen.push(ci);
        }
      }
      if (!validSuitSet || chosen.length > 4) continue;
      if (chosen.length >= 3) {
        addCandidate('set', chosen.map((i) => cards[i]), chosen);
      }
      for (let jkCount = 1; jkCount <= Math.min(2, jokerIndices.length); jkCount++) {
        const totalLen = chosen.length + jkCount;
        if (totalLen >= 3 && totalLen <= 4 && chosen.length >= 1) {
          for (const jks of jokerCombos(jkCount)) {
            const allIdx = [...chosen, ...jks];
            addCandidate('set', allIdx.map((i) => cards[i]), allIdx);
          }
        }
      }
    }
  }

  // 2. Generate all valid Run candidates (same suit consecutive 3..7 cards, 0..2 Jokers)
  const runOrders = [
    ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'],
    ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'],
  ];
  for (const s of SUITS) {
    const suitNatural = naturalIndices.filter((idx) => cards[idx].suit === s.symbol);
    if (suitNatural.length === 0) continue;
    for (const order of runOrders) {
      const byPos = new Map<number, number[]>();
      for (const idx of suitNatural) {
        const pos = order.indexOf(cards[idx].rank);
        if (pos !== -1) {
          const list = byPos.get(pos) || [];
          list.push(idx);
          byPos.set(pos, list);
        }
      }
      for (let start = 0; start < order.length; start++) {
        for (let len = 3; len <= Math.min(7, order.length - start); len++) {
          let natLists: number[][] = [[]];
          let missing = 0;
          for (let p = start; p < start + len; p++) {
            const foundList = byPos.get(p);
            if (foundList && foundList.length > 0) {
              const nextLists: number[][] = [];
              for (const base of natLists) {
                for (const optIdx of foundList) {
                  nextLists.push([...base, optIdx]);
                }
              }
              natLists = nextLists.slice(0, 8);
            } else {
              missing++;
            }
          }
          if (missing <= Math.min(2, jokerIndices.length)) {
            for (const natChosen of natLists) {
              if (natChosen.length < 2) continue;
              for (const jks of jokerCombos(missing)) {
                const allIdx = [...natChosen, ...jks];
                const orderedRun = normalizeRunCardsOrder(
                  allIdx.map((i) => cards[i]),
                  false
                );
                addCandidate('run', orderedRun, allIdx);
              }
            }
          }
        }
      }
    }
  }

  const candidates = Array.from(candidatesByMask.values()).sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return b.points - a.points;
  });

  let bestUsed = 0;
  let bestPoints = 0;
  let bestChoice: CandidateMeld[] = [];
  let steps = 0;
  const currentChoice: CandidateMeld[] = [];

  const search = (candStart: number, usedMask: number, usedCount: number, curPoints: number) => {
    if (steps > 4500) return;
    steps++;

    if (
      usedCount > bestUsed ||
      (usedCount === bestUsed && curPoints > bestPoints)
    ) {
      bestUsed = usedCount;
      bestPoints = curPoints;
      bestChoice = [...currentChoice];
    }

    if (usedCount === n) return;
    if (usedCount + (n - usedCount) < bestUsed) return;

    for (let i = candStart; i < candidates.length; i++) {
      const c = candidates[i];
      if ((usedMask & c.mask) !== 0) continue;
      // Upper bound check: even using all remaining unmasked cards can't beat bestUsed
      let availAfter = 0;
      for (let b = 0; b < n; b++) {
        if ((usedMask & (1 << b)) === 0) availAfter++;
      }
      if (usedCount + availAfter < bestUsed) break;

      currentChoice.push(c);
      search(i + 1, usedMask | c.mask, usedCount + c.count, curPoints + c.points);
      currentChoice.pop();
    }
  };

  search(0, 0, 0, 0);

  let finalMask = 0;
  bestChoice.forEach((m) => {
    finalMask |= m.mask;
  });

  const melds: PartitionedMeld[] = bestChoice.map((m) => ({
    type: m.type,
    cards: m.cards,
    points: m.points,
  }));
  const remaining = cards.filter((_, idx) => (finalMask & (1 << idx)) === 0);
  const totalPoints = melds.reduce((sum, m) => sum + m.points, 0);

  return { melds, remaining, totalPoints };
}

// Detect contiguous formed groups inside playerHand (used for visual highlight & whole-group tap elevation)
interface ContiguousGroupInfo {
  groupId: string;
  type: 'set' | 'run' | 'pair';
  cardIds: string[];
  colorClass: string;
  label: string;
}

function detectContiguousGroupsInHand(hand: PlayingCard[]): {
  cardToGroupMap: Map<string, ContiguousGroupInfo>;
  firstCardOfGroupMap: Map<string, { info: ContiguousGroupInfo; span: number }>;
} {
  const cardToGroupMap = new Map<string, ContiguousGroupInfo>();
  const firstCardOfGroupMap = new Map<string, { info: ContiguousGroupInfo; span: number }>();
  const claimed = new Array<boolean>(hand.length).fill(false);

  // Pass 1: Detect contiguous Sets (ትሪስ) & Runs (ካትሪስ) of length >= 3
  let i = 0;
  let gIdx = 0;
  while (i < hand.length) {
    let matchedLen = 0;
    let matchedType: 'set' | 'run' = 'set';

    for (let len = Math.min(6, hand.length - i); len >= 3; len--) {
      const slice = hand.slice(i, i + len);
      if (len <= 4 && isValidSet(slice)) {
        matchedLen = len;
        matchedType = 'set';
        break;
      }
      if (isStrictlyOrderedRun(slice)) {
        matchedLen = len;
        matchedType = 'run';
        break;
      }
    }

    if (matchedLen >= 3) {
      const slice = hand.slice(i, i + matchedLen);
      const isCycleEven = gIdx % 2 === 0;
      const info: ContiguousGroupInfo = {
        groupId: `grp_${i}_${matchedLen}`,
        type: matchedType,
        cardIds: slice.map((c) => c.id),
        colorClass:
          matchedType === 'run'
            ? 'border-t-sky-400 shadow-[0_-4px_12px_rgba(56,189,248,0.65)]'
            : isCycleEven
            ? 'border-t-emerald-400 shadow-[0_-4px_12px_rgba(52,211,153,0.65)]'
            : 'border-t-cyan-400 shadow-[0_-4px_12px_rgba(34,211,238,0.65)]',
        label: matchedType === 'run' ? 'ካትሪስ' : 'ትሪስ',
      };
      for (let k = i; k < i + matchedLen; k++) claimed[k] = true;
      slice.forEach((c) => cardToGroupMap.set(c.id, info));
      firstCardOfGroupMap.set(slice[0].id, { info, span: matchedLen });
      gIdx++;
      i += matchedLen;
    } else {
      i++;
    }
  }

  // Pass 2: Detect contiguous identical 2-card Pairs (ጥንድ) among unclaimed adjacent cards
  let p = 0;
  let pIdx = 0;
  while (p < hand.length - 1) {
    if (!claimed[p] && !claimed[p + 1]) {
      const a = hand[p];
      const b = hand[p + 1];
      const isIdenticalPair =
        (!a.isJoker && !b.isJoker && a.rank === b.rank && a.suit === b.suit) ||
        (Boolean(a.isJoker) && Boolean(b.isJoker));
      if (isIdenticalPair) {
        const isPairEven = pIdx % 2 === 0;
        const info: ContiguousGroupInfo = {
          groupId: `pair_${p}`,
          type: 'pair',
          cardIds: [a.id, b.id],
          colorClass: isPairEven
            ? 'border-t-fuchsia-400 shadow-[0_-4px_12px_rgba(232,121,249,0.65)]'
            : 'border-t-amber-400 shadow-[0_-4px_12px_rgba(251,191,36,0.65)]',
          label: 'ጥንድ',
        };
        claimed[p] = true;
        claimed[p + 1] = true;
        cardToGroupMap.set(a.id, info);
        cardToGroupMap.set(b.id, info);
        firstCardOfGroupMap.set(a.id, { info, span: 2 });
        pIdx++;
        p += 2;
        continue;
      }
    }
    p++;
  }

  return { cardToGroupMap, firstCardOfGroupMap };
}

// Check if 10 remaining cards form 5 valid pairs (2 identical cards like 10♠ 10♠, or card + Joker)
function canFormFivePairs(rem10: PlayingCard[], allowSameRankPairs = false): boolean {
  if (rem10.length !== 10) return false;
  const counts: Record<string, number> = {};
  let jokers = 0;

  for (const c of rem10) {
    if (c.isJoker || c.rank === 'JOKER') {
      jokers++;
    } else {
      const key = allowSameRankPairs ? c.rank : `${c.rank}|${c.suit}`;
      counts[key] = (counts[key] || 0) + 1;
    }
  }

  let odds = 0;
  for (const cnt of Object.values(counts)) {
    if (cnt % 2 === 1) odds++;
  }

  return jokers >= odds && (jokers - odds) % 2 === 0;
}

// Check exact 13-card Dopey: strictly 5 identical pairs (10 cards) + 1 valid Tris (3-card Set, min 2 naturals, NEVER a Run)
function isExact13CardDopey(cards13: PlayingCard[], _allowSameRankPairs = false): boolean {
  if (cards13.length !== 13) return false;

  for (let i = 0; i < 11; i++) {
    for (let j = i + 1; j < 12; j++) {
      for (let k = j + 1; k < 13; k++) {
        const triple = [cards13[i], cards13[j], cards13[k]];
        const natCount = triple.filter((c) => !c.isJoker && c.rank !== 'JOKER').length;
        if (natCount < 2 || !isValidSet(triple)) continue;

        const rem10: PlayingCard[] = [];
        for (let m = 0; m < 13; m++) {
          if (m !== i && m !== j && m !== k) rem10.push(cards13[m]);
        }
        if (canFormFivePairs(rem10, false)) {
          return true;
        }
      }
    }
  }

  return false;
}

// Check Dopey: 5 pairs + 1 tris (13 cards total, or 14 cards with 1 closing/discard card)
function checkDopey(
  hand: PlayingCard[],
  closingCard?: PlayingCard | null,
  allowSameRankPairs = false
): { isDopey: boolean; isJokerFinished: boolean } {
  if (closingCard) {
    const is13 = hand.length === 13 && isExact13CardDopey(hand, allowSameRankPairs);
    if (!is13) return { isDopey: false, isJokerFinished: false };
    return {
      isDopey: true,
      isJokerFinished: Boolean(closingCard.isJoker || closingCard.rank === 'JOKER'),
    };
  }
  if (hand.length !== 13 && hand.length !== 14) return { isDopey: false, isJokerFinished: false };
  if (hand.length === 13) {
    const ok = isExact13CardDopey(hand, allowSameRankPairs);
    return { isDopey: ok, isJokerFinished: false };
  }
  // 14-card hand: check if dropping a Joker closes exact 13-card Dopey -> 3x!
  const jokerDropCloses = hand.some(
    (c, dropIdx) =>
      (c.isJoker || c.rank === 'JOKER') &&
      isExact13CardDopey(hand.filter((__, idx) => idx !== dropIdx), allowSameRankPairs)
  );
  if (jokerDropCloses) return { isDopey: true, isJokerFinished: true };
  const anyDropCloses = hand.some((_, dropIdx) =>
    isExact13CardDopey(hand.filter((__, idx) => idx !== dropIdx), allowSameRankPairs)
  );
  return { isDopey: anyDropCloses, isJokerFinished: false };
}

type WinnerShowcaseGroup = {
  label: 'tris' | 'catris' | 'pair' | 'meld';
  cards: PlayingCard[];
};

function buildDopeyShowcaseGroups(cards13: PlayingCard[]): WinnerShowcaseGroup[] {
  if (cards13.length !== 13) {
    return cards13.length > 0 ? [{ label: 'meld', cards: [...cards13] }] : [];
  }
  for (let i = 0; i < 11; i++) {
    for (let j = i + 1; j < 12; j++) {
      for (let k = j + 1; k < 13; k++) {
        const triple = [cards13[i], cards13[j], cards13[k]];
        const natCount = triple.filter((c) => !c.isJoker && c.rank !== 'JOKER').length;
        if (natCount < 2 || !isValidSet(triple)) continue;
        const rem10: PlayingCard[] = [];
        for (let m = 0; m < 13; m++) {
          if (m !== i && m !== j && m !== k) rem10.push(cards13[m]);
        }
        if (!canFormFivePairs(rem10, false)) continue;

        const out: WinnerShowcaseGroup[] = [{ label: 'tris', cards: triple }];
        const byKey = new Map<string, PlayingCard[]>();
        const jokers: PlayingCard[] = [];
        for (const c of rem10) {
          if (c.isJoker || c.rank === 'JOKER') {
            jokers.push(c);
          } else {
            const key = `${c.rank}|${c.suit}`;
            const list = byKey.get(key) || [];
            list.push(c);
            byKey.set(key, list);
          }
        }
        const singles: PlayingCard[] = [];
        for (const list of byKey.values()) {
          while (list.length >= 2) {
            out.push({ label: 'pair', cards: [list.shift()!, list.shift()!] });
          }
          if (list.length === 1) singles.push(list[0]);
        }
        for (const s of singles) {
          if (jokers.length > 0) out.push({ label: 'pair', cards: [s, jokers.shift()!] });
        }
        while (jokers.length >= 2) {
          out.push({ label: 'pair', cards: [jokers.shift()!, jokers.shift()!] });
        }
        return out;
      }
    }
  }
  return [{ label: 'meld', cards: [...cards13] }];
}

function extractLocalWinnerShowcaseGroups({
  winnerId,
  winnerHand,
  tableMelds,
  closedSetBadges,
  finishMode,
  closingCard,
}: {
  winnerId: string;
  winnerHand: PlayingCard[];
  tableMelds: MeldGroup[];
  closedSetBadges: ClosedSetBadge[];
  finishMode: string;
  closingCard?: PlayingCard | null;
}): {
  winnerCards: PlayingCard[];
  winnerGroups: WinnerShowcaseGroup[];
  winnerClosingCard: PlayingCard | null;
} {
  if (
    finishMode === 'dopey' ||
    finishMode === 'dopey_joker' ||
    finishMode === 'bottom_dopey' ||
    finishMode === 'bottom_dopey_joker'
  ) {
    let cards13 = [...winnerHand];
    if ((finishMode === 'bottom_dopey' || finishMode === 'bottom_dopey_joker') && closingCard) {
      if (winnerHand.length === 12) {
        cards13 = [...winnerHand, closingCard];
      } else if (winnerHand.length === 13) {
        const dropIdx = winnerHand.findIndex((_, idx) =>
          isExact13CardDopey([...winnerHand.filter((__, i) => i !== idx), closingCard], false)
        );
        if (dropIdx !== -1) {
          cards13 = [...winnerHand.filter((__, i) => i !== dropIdx), closingCard];
        }
      }
    } else if (cards13.length === 14) {
      const dropIdx = cards13.findIndex((_, idx) =>
        isExact13CardDopey(cards13.filter((__, i) => i !== idx), false)
      );
      if (dropIdx !== -1) cards13 = cards13.filter((__, i) => i !== dropIdx);
    }
    return {
      winnerCards: cards13,
      winnerGroups: buildDopeyShowcaseGroups(cards13),
      winnerClosingCard: closingCard || null,
    };
  }

  if (finishMode === 'bottom_normal' && closingCard) {
    let meldPool = [...winnerHand, closingCard];
    const directPart = partitionValidMelds(meldPool);
    if (directPart.remaining.length > 0 && winnerHand.length >= 12) {
      const foundDrop = winnerHand.findIndex((_, dropIdx) => {
        const sub = [...winnerHand.filter((__, i) => i !== dropIdx), closingCard];
        const p = partitionValidMelds(sub);
        return p.remaining.length === 0 && p.melds.length > 0 && p.totalPoints >= 41;
      });
      if (foundDrop !== -1) {
        meldPool = [...winnerHand.filter((__, i) => i !== foundDrop), closingCard];
      }
    }
    const part = partitionValidMelds(meldPool);
    const groups: WinnerShowcaseGroup[] =
      part.melds.length > 0
        ? part.melds.map((m) => ({
            label: m.type === 'run' ? 'catris' : 'tris',
            cards: m.type === 'run' ? normalizeRunCardsOrder(m.cards, false) : m.cards,
          }))
        : [{ label: 'meld', cards: meldPool }];
    return {
      winnerCards: meldPool,
      winnerGroups: groups,
      winnerClosingCard: closingCard,
    };
  }

  const groups: WinnerShowcaseGroup[] = [];
  for (const b of closedSetBadges) {
    if (b.ownerId !== winnerId) continue;
    groups.push({
      label: 'tris',
      cards: SUITS.map((s, idx) => ({
        id: `closed_vis_${b.id}_${idx}`,
        rank: b.rank,
        suit: s.symbol,
        suitName: s.name,
        color: s.color,
        value: 0,
        points: 0,
        isJoker: false,
      })),
    });
  }
  for (const m of tableMelds) {
    if (m.ownerId !== winnerId) continue;
    groups.push({
      label: m.type === 'run' ? 'catris' : 'tris',
      cards: [...m.cards],
    });
  }
  const collected = groups.flatMap((g) => g.cards);
  if (groups.length === 0 && winnerHand.length > 0) {
    groups.push({ label: 'meld', cards: [...winnerHand] });
    collected.push(...winnerHand);
  }
  return {
    winnerCards: collected,
    winnerGroups: groups,
    winnerClosingCard: closingCard || null,
  };
}

// Check if a card matches any existing table melds (Illegal Discard Rule)
function doesCardMatchTableMelds(card: PlayingCard, melds: MeldGroup[]): boolean {
  if (card.isJoker) return false;
  for (const m of melds) {
    if (m.type === 'set') {
      const nonJokers = m.cards.filter((c) => !c.isJoker);
      const targetRank = m.rank || nonJokers[0]?.rank;
      if (card.rank === targetRank && !nonJokers.some((c) => c.suit === card.suit) && m.cards.length < 4) {
        return true;
      }
    } else if (m.type === 'run' && m.suit === card.suit) {
      if (isValidRun([...m.cards, card])) {
        return true;
      }
    }
  }
  return false;
}

function getRunOrderForMeld(cards: PlayingCard[]): string[] {
  const aceLowOrder = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const aceHighOrder = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const nonJokers = cards.filter((c) => !c.isJoker);
  const hasA = nonJokers.some((c) => c.rank === 'A');
  const hasHighRoyals = nonJokers.some((c) => ['K', 'Q', 'J', '10'].includes(c.rank));
  const prefersAceLow =
    !hasHighRoyals &&
    (hasA || nonJokers.some((c) => c.rank === '2' || c.rank === '3')) &&
    Boolean(getOrderedRunSequence(cards, aceLowOrder));
  if (
    prefersAceLow ||
    (!getOrderedRunSequence(cards, aceHighOrder) && Boolean(getOrderedRunSequence(cards, aceLowOrder)))
  ) {
    return aceLowOrder;
  }
  return aceHighOrder;
}

function getOrderedRunSequence(cards: PlayingCard[], order: string[]): PlayingCard[] | null {
  const nonJokers = cards.filter((c) => !c.isJoker);
  const jokers = cards.filter((c) => c.isJoker);
  if (nonJokers.length === 0) return null;

  const sortedNaturals = [...nonJokers].sort(
    (a, b) => order.indexOf(a.rank) - order.indexOf(b.rank)
  );
  for (let i = 0; i < sortedNaturals.length; i++) {
    const idx = order.indexOf(sortedNaturals[i].rank);
    if (idx === -1) return null;
    if (i > 0 && idx === order.indexOf(sortedNaturals[i - 1].rank)) return null;
  }

  let gaps = 0;
  for (let i = 1; i < sortedNaturals.length; i++) {
    gaps += order.indexOf(sortedNaturals[i].rank) - order.indexOf(sortedNaturals[i - 1].rank) - 1;
  }
  if (jokers.length < gaps) return null;

  const arranged: PlayingCard[] = [sortedNaturals[0]];
  let jCursor = 0;
  for (let i = 1; i < sortedNaturals.length; i++) {
    const gapCount =
      order.indexOf(sortedNaturals[i].rank) - order.indexOf(sortedNaturals[i - 1].rank) - 1;
    for (let g = 0; g < gapCount && jCursor < jokers.length; g++) {
      arranged.push(jokers[jCursor++]);
    }
    arranged.push(sortedNaturals[i]);
  }

  let highIdx = order.indexOf(sortedNaturals[sortedNaturals.length - 1].rank);
  let lowIdx = order.indexOf(sortedNaturals[0].rank);
  while (jCursor < jokers.length) {
    if (highIdx < order.length - 1) {
      arranged.push(jokers[jCursor++]);
      highIdx++;
    } else if (lowIdx > 0) {
      arranged.unshift(jokers[jCursor++]);
      lowIdx--;
    } else {
      break;
    }
  }
  return arranged;
}

function isStrictlyOrderedRun(cards: PlayingCard[]): boolean {
  if (!isValidRun(cards)) return false;
  const order = getRunOrderForMeld(cards);
  const arranged = getOrderedRunSequence(cards, order);
  if (!arranged) return false;
  const idsAsc = arranged.map((c) => c.id).join('|');
  const idsDesc = [...arranged].reverse().map((c) => c.id).join('|');
  const idsInput = cards.map((c) => c.id).join('|');
  return idsInput === idsAsc || idsInput === idsDesc;
}

function normalizeRunCardsOrder(cards: PlayingCard[], preserveDescending = true): PlayingCard[] {
  const order = getRunOrderForMeld(cards);
  const arranged = getOrderedRunSequence(cards, order);
  if (!arranged) return cards;
  if (preserveDescending) {
    const origNatIndices = cards
      .filter((c) => !c.isJoker)
      .map((c) => order.indexOf(c.rank));
    const isDescNaturals =
      origNatIndices.length >= 2 &&
      origNatIndices.every((v, i) => i === 0 || origNatIndices[i - 1] > v);
    if (isDescNaturals) {
      return [...arranged].reverse();
    }
  }
  return arranged;
}

function isDescendingRunCards(cards: PlayingCard[], order: string[]): boolean {
  const natIndices = cards.filter((c) => !c.isJoker).map((c) => order.indexOf(c.rank));
  return natIndices.length >= 2 && natIndices[0] > natIndices[1];
}

function getTableMeldJokerInfo(
  meld: MeldGroup,
  cardIdx: number
): { rank: string; suit: SuitSymbol | null } | null {
  if (meld.type === 'set') {
    const nonJokers = meld.cards.filter((c) => !c.isJoker);
    const rank = meld.rank || nonJokers[0]?.rank;
    if (!rank) return null;
    const usedSuits = new Set(nonJokers.map((c) => c.suit));
    const missingSuit = SUITS.find((s) => !usedSuits.has(s.symbol))?.symbol || null;
    return { rank, suit: missingSuit };
  }

  const order = getRunOrderForMeld(meld.cards);
  const isDesc = isDescendingRunCards(meld.cards, order);
  const seq = isDesc ? [...meld.cards].reverse() : meld.cards;
  const targetIdx = isDesc ? meld.cards.length - 1 - cardIdx : cardIdx;

  const firstNatPos = seq.findIndex((c) => !c.isJoker);
  if (firstNatPos === -1) return null;
  const firstNatOrderIdx = order.indexOf(seq[firstNatPos].rank);
  if (firstNatOrderIdx === -1) return null;
  const startOrderIdx = firstNatOrderIdx - firstNatPos;
  const targetRank = order[startOrderIdx + targetIdx];
  const suit = meld.suit || seq[firstNatPos].suit;
  return targetRank ? { rank: targetRank, suit } : null;
}

function insertCardIntoRunMeld(
  cards: PlayingCard[],
  newCard: PlayingCard,
  clickedIdx: number
): PlayingCard[] | null {
  if (cards.length >= 13) return null;

  const order = getRunOrderForMeld(cards);
  const isDesc = isDescendingRunCards(cards, order);
  const ascCards = isDesc ? [...cards].reverse() : cards;
  const ascClickedIdx = isDesc ? cards.length - 1 - clickedIdx : clickedIdx;

  if (newCard.isJoker) {
    const firstNatPos = ascCards.findIndex((c) => !c.isJoker);
    if (firstNatPos === -1) {
      const next = [...ascCards, newCard];
      return isDesc ? next.reverse() : next;
    }
    const firstNatOrderIdx = order.indexOf(ascCards[firstNatPos].rank);
    if (firstNatOrderIdx === -1) {
      const next = [...ascCards, newCard];
      return isDesc ? next.reverse() : next;
    }
    const startOrderIdx = firstNatOrderIdx - firstNatPos;
    const endOrderIdx = startOrderIdx + ascCards.length - 1;
    const canPrepend = startOrderIdx > 0;
    const canAppend = endOrderIdx < order.length - 1;
    if (!canPrepend && !canAppend) return null;
    let nextAsc: PlayingCard[];
    if (ascClickedIdx === 0 && canPrepend) nextAsc = [newCard, ...ascCards];
    else if (canAppend) nextAsc = [...ascCards, newCard];
    else nextAsc = [newCard, ...ascCards];
    return isDesc ? nextAsc.reverse() : nextAsc;
  }

  const candidate = [...ascCards, newCard];
  if (!isValidRun(candidate)) return null;

  const candOrder = getRunOrderForMeld(candidate);
  const nonJokers = candidate
    .filter((c) => !c.isJoker)
    .sort((a, b) => candOrder.indexOf(a.rank) - candOrder.indexOf(b.rank));
  const jokers = candidate.filter((c) => c.isJoker);

  if (nonJokers.length === 0) return candidate;

  // Build sorted sequence filling interior gaps with Jokers first
  const arranged: PlayingCard[] = [nonJokers[0]];
  let jokerCursor = 0;
  for (let i = 1; i < nonJokers.length; i++) {
    const prevIdx = candOrder.indexOf(nonJokers[i - 1].rank);
    const currIdx = candOrder.indexOf(nonJokers[i].rank);
    const gapCount = currIdx - prevIdx - 1;
    for (let g = 0; g < gapCount && jokerCursor < jokers.length; g++) {
      arranged.push(jokers[jokerCursor++]);
    }
    arranged.push(nonJokers[i]);
  }

  // Place any leftover Jokers cleanly on the right end (or left end if already at top rank)
  let highIdx = candOrder.indexOf(nonJokers[nonJokers.length - 1].rank);
  let lowIdx = candOrder.indexOf(nonJokers[0].rank);
  while (jokerCursor < jokers.length) {
    if (ascClickedIdx === 0 && lowIdx > 0) {
      arranged.unshift(jokers[jokerCursor++]);
      lowIdx--;
    } else if (highIdx < candOrder.length - 1) {
      arranged.push(jokers[jokerCursor++]);
      highIdx++;
    } else if (lowIdx > 0) {
      arranged.unshift(jokers[jokerCursor++]);
      lowIdx--;
    } else {
      break;
    }
  }

  return isDesc ? arranged.reverse() : arranged;
}

const RAMINO_T: Record<Language, any> = {
  am: {
    brandTitle: 'SUN ራሚኖ',
    brandSub: 'የ SUN ራሚኖ ሎቢ',
    exitBtn: 'መውጫ',
    backBtn: 'መመለሻ',
    rulesTooltip: 'ህግጋት',
    playersCardLabel: 'ተጫዋቾች',
    liveStreamSub: 'ቀጥታ ስርጭት',
    openRoomsCardLabel: 'ክፍት ክፍሎች',
    activeRoomsSub: 'ንቁ ክፍሎች',
    balanceCardLabel: 'ቀሪ ሂሳብ',
    walletSub: 'ዋሌት',
    depositShort: 'ገቢ',
    withdrawShort: 'ወጪ',
    openWalletBtn: 'ዋሌት (ገቢ እና ወጪ)',
    openRoomsHeader: (count: number) => `ክፍት ክፍሎች (${count})`,
    refreshBtn: 'አድስ',
    roomsRefreshed: 'የክፍሎች ዝርዝር ታድሷል!',
    noOpenRooms: 'ምንም ክፍት ክፍል የለም፤ ከታች አዲስ ክፍል ይፍጠሩ!',
    yoursTag: 'የእርስዎ',
    playersWord: 'ተጫዋቾች',
    oneDeckShort: '1 ዴክ',
    twoDecksShort: '2 ዴክ',
    oneDeckDesc: '1 ዴክ (54 ካርታ)',
    twoDecksDesc: '2 ዴኮች (108 ካርታ)',
    cancelRefundBtn: 'ሰርዝ እና መልስ',
    cancelRefundTip: 'ክፍሉን ሰርዝ እና ብር መልስ',
    startBtn: 'ጀምር',
    joinBtn: 'ግባ',
    choosePlayersLabel: 'የተጫዋቾች ብዛት ይምረጡ:',
    seatOptionLabel: (n: number) => `${n} ተጫዋቾች`,
    seatDeckLabel: (cards: number) => `${cards} ካርታ`,
    stakeLabel: 'የውርርድ መጠን ያስገቡ ወይም ይምረጡ:',
    stakePlaceholder: 'የብር መጠን በቁጥር ያስገቡ',
    createRoomBtn: (stake: number, seats: number) => `ክፍል ፍጠር (${stake} ብር • ${seats} ተጫዋቾች)`,
    privateRoomBtn: 'የግል ክፍል',
    joinByCodeBtn: 'በኮድ ተቀላቀል',
    micOpen: 'ድምፅ ክፍት',
    micOpenBtn: 'ማይክ ክፈት',
    deafenOpenTip: 'ድምፅ ዝግ ነው — ክፈት',
    deafenMuteTip: 'የጓደኞችን ድምፅ ዝጋ',
    voiceStageBtn: 'የድምፅ መድረክ',
    voiceStageTitle: 'የግል የድምፅ መድረክ',
    voiceE2eeBadge: '🔒 E2EE የማይጠለፍ',
    voiceHdBadge: 'HD 48kHz ጥራት',
    voiceHoldToTalk: 'ተጭነው ያውሩ',
    voiceReleaseToMute: 'ለመዝጋት ይልቀቁ',
    voiceTapToSpeak: 'ማይክ ክፈት',
    voiceMicLive: 'በቀጥታ እያወሩ',
    voiceMutePeer: 'ድምፁን ዝጋ',
    voiceUnmutePeer: 'ድምፁን ክፈት',
    voiceSpeakingNow: 'በማውራት ላይ',
    voiceListening: 'በማዳመጥ ላይ',
    voiceUntappableNote: 'የግል ድምፅ በቀጥታ ከተጫዋቾች መካከል ብቻ በDTLS-SRTP የተመሰጠረ ነው — አድሚንም ሆነ ማንም ሊጠልፈው አይችልም።',
    voiceParticipantsLabel: 'በመድረኩ ላይ ያሉ ተሳታፊዎች',
    ceremonyTitle: (seats: number) => `ማን ያከፋፍላል? ከፍተኛ ካርድ (${seats} ተጫዋቾች • ${seats} ካርታ)`,
    dealerBadge: 'አከፋፋይ 👑',
    ceremonyWinnerBanner: (dealer: string, cardStr: string) => `👑 ${dealer} ያከፋፍላሉ • ${cardStr} — ወደ ጨዋታ በመግባት ላይ...`,
    ceremonyRevealing: (curr: number, total: number) => `ካርታዎቹ በየተራ በመከፈት ላይ ናቸው... (${curr}/${total})`,
    streakLabel: (n: number) => `🔥 ${n} ተከታታይ ድል${n >= 3 ? ' • 2x እጥፍ' : ' (በ3ኛው 2x)'}`,
    roundWord: 'ዙር',
    postDayBtn: '🪑 ፖስት ዴይ',
    postDayTip: 'ከ 5 ጨዋታ በኋላ ሁሉም አዲስ ወንበር እንዲያገኙ ፖስት ዴይ ይበሉ',
    meldedBadge: 'ወርዷል',
    cardWord: 'ካርድ',
    cardsWord: 'ካርዶች',
    bottomCardTip: (cardStr: string) => `የታችኛው ካርድ (${cardStr})`,
    drawDeckTip: 'የሚነሳበት ካርታ',
    discardPileTip: 'የተጣለውን ካርድ አንሳ',
    closedSetsTip: 'ገቢ የሌላቸው የተዘጉ 4-ካርዶች',
    hereMarker: '▼ እዚህ',
    dopeyBtn: '👑 ዶፔይ / ሞንቴ • 2x',
    dopeyJokerBtn: '👑 ጎልደን • 3x',
    meldBtn: (pts: number) => `ውረድ • ${pts}`,
    sortBtn: 'ደርድር',
    returnBtn: 'መልስ',
    discardLockedBtn: 'ጣል (ውረድ ወይም መልስ)',
    discardBtn: 'ጣል',
    bannedTitle: 'ከጨዋታው ታግደዋል!',
    bannedDesc: 'በተሰጠው 90 ሰከንድ የማሰቢያ ጊዜ እና 30 ሰከንድ ማስጠንቀቂያ ውስጥ ካርታ ባለመሳብዎ ወይም ባለማንሳትዎ ከጨዋታው ተሰርዘዋል።',
    bannedSpectatorDesc: 'በተሰጠው የማሰቢያና ማስጠንቀቂያ ሰዓት ውስጥ ባለመጫወትዎ ከዚህ ዙር ታግደዋል። ሆኖም የተቀሩት ተጫዋቾች ሲጫወቱ ጨዋታውን በቀጥታ መከታተል ይችላሉ።',
    watchGameBtn: '👁️ ጨዋታውን ተከታተል',
    suspendedBadge: 'ታግዷል',
    spectatorBanner: '🚫 ሰዓትዎ ስላለቀ በዚህ ዙር ታግደዋል — ጨዋታውን በቀጥታ እየተከታተሉ ነው 👁️',
    notifyPlayerSuspended: (name: string) => `🚫 ${name} ሰዓቱ ስላለቀበት ታግዷል፤ ጨዋታውን እየተከታተለ ነው።`,
    backToLobbyBtn: 'ወደ ሎቢ ተመለስ',
    privateModalTitle: 'የግል ክፍል ፍጠር',
    chooseFriendsStep: '1. የሚጫወቷቸው ጓደኞች ብዛት ይምረጡ:',
    seatSummary: (seats: number, friends: number) => `${seats} ተጫዋች (${friends} ጓደኛ)`,
    seatPersonCount: (seats: number) => `${seats} ሰው`,
    friendSingle: '1 ጓደኛ',
    friendPlural: (f: number) => `${f} ጓደኞች`,
    roomCodeStep: '2. የክፍል ኮድ:',
    newCodeBtn: 'አዲስ ኮድ',
    copiedBtn: 'ተቀድቷል',
    copyCodeBtn: 'ኮድ ኮፒ',
    inviteLinkStep: '3. ለጓደኞች የሚላክ ሊንክ (ቴሌግራም / ዋትስአፕ):',
    copyLinkBtn: 'ሊንክ ኮፒ',
    sendTelegramBtn: 'በቴሌግራም ላክ',
    sendWhatsappBtn: 'በዋትስአፕ ላክ',
    shareFullInviteBtn: 'ሙሉ ግብዣውን አጋራ',
    joinedFriendsHeader: (curr: number, max: number) => `የተቀላቀሉ ጓደኞች (${curr}/${max})`,
    voiceChannelReady: 'የግል ድምፅ ቻናል ዝግጁ',
    waitingFriendSlot: (idx: number) => `ጓደኛ #${idx} በመጠበቅ ላይ...`,
    privateStakeStep: '2. የዚህ የግል ክፍል መደብ (ብር):',
    waitingRoomTitle: (priv: boolean) => (priv ? 'የግል ክፍል መጠበቂያ' : 'የጠረጴዛ መጠበቂያ'),
    waitingPlayersNeeded: 'ጨዋታውን ለመጀመር ቢያንስ 2 እውነተኛ ተጫዋቾች መግባት አለባቸው',
    waitingHostStartBtn: (stake: number, curr: number) => `▶️ አሁኑኑ ጀምር (${curr} ተጫዋቾች • ${stake} ብር)`,
    waitingForHostMsg: 'ጋባዡ ወይም የተቀሩት ተጫዋቾች ሲገቡ ጨዋታው በራሱ ይጀምራል...',
    cancelLeaveRefundBtn: 'ውጣ እና ብር መልስ',
    startPrivateRoomBtn: (stake: number, seats: number) => `ክፍሉን ጀምር (${stake} ብር • ${seats} ተጫዋቾች)`,
    joinModalTitle: 'በኮድ ወይም በሊንክ ተቀላቀል',
    enterCodeLabel: 'የክፍሉን ኮድ ያስገቡ:',
    codePlaceholder: 'ምሳሌ: RAMINO-7714',
    hostLabel: 'ጋባዥ:',
    playersLabel: 'ተጫዋቾች:',
    voiceLabel: 'ድምፅ:',
    joinRoomSubmit: (preview: { stake: number; maxPlayers: number } | null) =>
      preview ? `ተቀላቀል (${preview.stake} ብር • ${preview.maxPlayers} ሰው)` : 'ተቀላቀል',
    potAmountLabel: 'የድስት መጠን:',
    rakeLabel: 'የ SUN 10% ኮሚሽን:',
    dopeyMultLabel: 'ዶፔይ / ሞንቴ (2x):',
    goldenMultLabel: '👑 ጎልደን (3x):',
    penaltyDeductedLabel: '💸 ከዋሌትዎ የተቆረጠ:',
    jokerFinishMultLabel: '🃏 ዶፔይ / ሞንቴ (በጆከር):',
    streakMultLabel: (n: number) => `🔥 ተከታታይ ድል (${n}ኛ):`,
    streakTimes: (m: number) => `${m}x (${m >= 3 ? 'ጎልደን' : 'ዶፔይ / ሞንቴ'})`,
    streakProgress: (n: number) => `🔥 ተከታታይ ድል: ${n}/3 (ከ3 ተከታታይ ድል በኋላ በጆከር ጎልደን 3x!)`,
    netWonLabel: 'የተጣራ ገቢ:',
    nextDealerLabel: '👑 ቀጣይ ካርታ የሚያከፋፍለው:',
    nextRoundBtn: (dealer: string, extra: string) => `🔄 ቀጣይ ዙር ጀምር (${dealer} ያከፋፍላል${extra})`,
    postDayWinnerBtn: '🪑 ፖስት ዴይ (ሁሉም ተቀብለው ወንበር ይመርጣሉ)',
    backToLobbyResetBtn: 'ወደ ሎቢ ተመለስ',
    resumeBannerTitle: 'ንቁ የራሚኖ ጨዋታ አለዎት!',
    resumeBannerSub: (stake: number, secs: number) => `🪙 ${stake} ብር • ሰዓቱ ከማለቁ በፊት ተመልሰው መቀጠል ይችላሉ (⏳ ${secs}s)`,
    resumeReturnBtn: '▶️ ወደ ጨዋታው ተመለስ',
    resumeForfeitBtn: 'ጨዋታውን ውጣ',
    notifySavedCanReturn: '⏳ ጨዋታዎ ክፍት ነው — ሰዓቱ እስካላለቀ ድረስ ተመልሰው መግባት ይችላሉ!',
    postDayModalTitle: 'ፖስት ዴይ — የወንበር መቀየሪያ ጥያቄ',
    postDayModalDesc: (name: string) => `${name} ፖስት ዴይ ጠይቋል — ሁሉም 1 ካርታ ወስደው ከፍተኛው ቅድሚያ ወንበር ይመርጣል`,
    acceptedBadge: '✓ ተቀብሏል',
    waitingAcceptBadge: '⏳ በመጠበቅ ላይ...',
    acceptPostDayBtn: '✓ ጥያቄውን ተቀበል',
    closeBtn: 'ዝጋ',
    allAcceptedPostDay: '✅ ሁሉም ተቀብለዋል! የወንበር መምረጫ ካርታ በመታደል ላይ...',
    waitingAllPostDay: '⏳ የሁሉም ተጫዋቾች መቀበል በመጠበቅ ላይ...',
    postDayPickTitle: (seats: number) => `🪑 ፖስት ዴይ — የወንበር መምረጫ (${seats} ተጫዋቾች)`,
    postDayPickYourTurn: '🎯 የእርስዎ ተራ ነው — ከታች የሚፈልጉትን ወንበር ይምረጡ!',
    postDayPickOtherTurn: (name: string) => `⏳ አሁን ${name} ወንበር እየመረጡ ነው...`,
    postDayPickDone: '✅ ሁሉም ወንበራቸውን መርጠዋል! ወደ ጠረጴዛ በመግባት ላይ...',
    postDaySeatLabel: (n: number) => `ወንበር #${n}`,
    postDayPickOpenSeat: 'ክፍት ወንበር (ምረጥ)',
    rulesModalTitle: 'የ SUN ራሚኖ ህግጋት',
    understoodCloseBtn: 'ተረድቻለሁ',
    rule1Title: '1. ሰዓት (90 ሰከንድ + 30 ሰከንድ ማስጠንቀቂያ)',
    rule1Desc: 'ተቃራኒ ተጫዋች ካርታ ሲጥልልዎ 90 ሰከንድ የማሰቢያ ጊዜ ይጀምራል፤ ካለቀ በቀይ 30 ሰከንድ ማስጠንቀቂያ ይሰጣል። ካርታ ካልሳቡ ከጨዋታ ይታገዳሉ።',
    rule2Title: '2. መውረድ (41 ነጥብ) እና ከተጣለ ካርታ ማንሳት',
    rule2Desc: 'ለመውረድ ቢያንስ 41 ነጥብ በትክክለኛ ትሪስ ወይም ካትሪስ መሰራት አለበት። ለመጀመሪያ ሳትወርድ ከተጣለ ካርታ ከወሰድክ «ውረድ ወይም መልስ» ግዴታ ነው (ሳትወርድ ገቢ አይቻልም)፤ ከወረድክ በኋላ ግን እንደፈለግክ መጫወት ትችላለህ።',
    rule3Title: '3. የታችኛው ካርድ፣ ጆከር መጨረሻ እና ዶፔይ ማሸነፊያ',
    rule3Desc: 'ያልወረደ ተጫዋች ሁሉንም ካርዶቹን በቡድን ከሰበሰበ እና ለመጨረስ የታችኛው ካርድ ብቻ የሚያስፈልገው ከሆነ በወርቃማ ብርሃን ይበራል። በራሚኖ ጆከር ጥለው ከጨረሱ 2x (ከ3 ተከታታይ ድል በኋላ 3x)፤ በዶፔይ / ሞንቴ (5 ጥንድ + 1 ትሪስ) 2x ሲሆን ጆከር ጥለው ከዘጉ 3x እጥፍ ይሰጣል።',
    rule4Title: '4. አንድ ካርታ መጣል እና የሚገጥም ካርድ ክልከላ',
    rule4Desc: 'በአንድ ተራ ከአንድ በላይ ካርታ መጣል የተከለከለ ነው። በጠረጴዛው ላይ ካለ ቡድን ጋር የሚገጥም ካርድ መጣል አይቻልም።',
    rule5Title: '5. መደቡ ሲያልቅ',
    rule5Desc: 'መደቡ ሲያልቅ፦ የተጣሉት ካርዶች ተቀላቅለው አዲስ መደብ ይሆናሉ፤ አንድ ሰው እስኪያሸንፍ ድረስ የሚያስፈልገውን ያህል ጊዜ።',
    rule6Title: '6. ፖስት ዴይ',
    rule6Desc: 'በግል ጠረጴዛ ላይ ወንበሮች ከጨዋታ ወደ ጨዋታ አይቀየሩም። ከ 5 ጨዋታ በኋላ ማንኛውም ተጫዋች ፖስት ዴይ ማለት ይችላል፤ ሁሉም አዲስ ወንበር ያገኛል።',
    roomPrefix: 'ክፍል #',
    currencyUnit: 'ብር',
    notifyMicUnsupported: '❌ ይህ መሳሪያ ወይም ብራውዘር ማይክሮፎን አይደግፍም።',
    notifyMicDenied: '❌ የማይክሮፎን ፈቃድ አልተሰጠም! እባክዎ የብራውዘርዎን ማይክ ፈቃድ ይፍቀዱ።',
    notifyMicOpened: '🎙️ ማይክሮፎንዎ ተከፍቷል — ጓደኞችዎ ሊሰሙዎት ይችላሉ!',
    notifyStreakResetLeft: '⚠️ ተጫዋች ከጠረጴዛው ስለወጣ ተከታታይ ድል እንደገና ከ 0 ተጀምሯል!',
    notifyPostDayAsked: (req: string) => `🪑 ${req} ፖስት ዴይ (አዲስ ወንበር) ጠይቋል!`,
    notifyAdminClosedRoom: '🛡️ አድሚን ይህን የግል ክፍል ዘግቶታል።',
    notifyAdminResetGame: '🔄 አድሚን ጨዋታውን ከአዲስ ጀምሮታል።',
    notifyJoinLookupErr: 'በዚህ ኮድ የተፈጠረ ክፍል አልተገኘም ወይም ሊንኩን በትክክል ያረጋግጡ።',
    notifyRoomExpired: (name: string, refund: number) => `⏰ ${name} ሰዓቱ ስላለቀ ተዘግቷል፤ ${refund} ብር ወደ ዋሌትዎ ተመልሷል!`,
    notifyDealerStarted: (dealer: string) => `👑 ${dealer} (አከፋፋይ • 14 ካርታ) ጨዋታውን በመጣል ይጀምራል!`,
    notifyDealerFirstDiscard: (dealer: string) => `👑 ${dealer} (14 ካርታ ወስደዋል) — 1 ካርታ በመጣል ጨዋታውን ይጀምሩ!`,
    discardSlotLabel: 'መጣያ',
    notifyDealtSelf: 'ካርታ ተከፋፍሏል! ከመደቡ ወይም ከተጣለው ካርታ ይሳቡ።',
    notifyDealerOpp: (dealer: string) => `👑 ${dealer} (14 ካርታ) በመጣል ይጀምራል!`,
    notifyYourTurnStart: (dealer: string) => `👑 ${dealer} ካርታ አከፋፍሏል! የእርስዎ ተራ ነው።`,
    notifyWarning30s: '⚠️ 30 ሰከንድ ማስጠንቀቂያ! ካርታ ካልሳቡ ከጨዋታ ይታገዳሉ!',
    notifyBottomNotReady: 'የታችኛው ካርድ ማሸነፊያ ገና አልተሟላም! ተራዎ ሲደርስ ሁሉንም ካርታዎች በቡድን መያዝ አለብዎት።',
    winBottomJokerDopey: (s: string) => `👑 ጎልደን በታችኛው ጆከር (${s}) አሸናፊ! (3x)`,
    winBottomDopey: (c: string) => `🔥 ዶፔይ / ሞንቴ በታችኛው ካርድ (${c}) አሸናፊ! (2x)`,
    winBottomNormal: (c: string) => `🏆 በታችኛው ካርድ (${c}) አሸናፊ!`,
    notifyReshuffled: '🔄 መደቡ ስላለቀ የተጣሉት ካርዶች ተቀላቅለው አዲስ መደብ ሆነዋል!',
    notifyPostDayApplied: '🪑 ሁሉም ተጫዋቾች ወንበራቸውን መርጠዋል! አዲስ ቦታ ተይዟል።',
    notifyInsufficientNext: '❌ ለቀጣይ ዙር በቂ ቀሪ ሂሳብ የለም!',
    notifyWaitTurn: 'እባክዎን ተራዎን ይጠብቁ!',
    notifyAlreadyDrawn: 'አስቀድመው ካርታ ስበዋል፤ የሚጥሉት ካርታ ይምረጡ!',
    notifyDeckEmpty: 'መደቡም መጣያውም ባዶ ሆኗል!',
    notifyCardDrawn: (c: string) => `ካርታ ${c} ተስቧል! ሲጨርሱ 1 ካርታ ይጣሉ።`,
    notifyDiscardPickedNeedMeld: (c: string) => `ከተጣለው ${c} አንስተዋል! መጀመሪያ ግድ መውረድ ወይም "መልስ" መጫን አለብዎት።`,
    notifyDiscardPickedFree: (c: string) => `ከተጣለው ${c} አንስተዋል! ከወረዱ በኋላ እንደፈለጉ መጫወት ይችላሉ።`,
    notifyReturnedDiscard: (c: string) => `ካርታ ${c} ወደ መጣያው ተመልሷል፤ አሁን ከመደቡ መሳብ ይችላሉ።`,
    notifyMeldTurnOnly: 'እባክዎን በተራዎ ብቻ ይውረዱ!',
    notifyMeldNeed41: (pts: number) => `ለመውረድ ቢያንስ 41 ነጥብ በትክክለኛ ትሪስ ወይም ካትሪስ መሰራት አለበት! (${pts}/41)`,
    notifyMeldedOk: (pts: number) => `✨ ድንቅ ነው! በ${pts} ነጥብ ወርደዋል።`,
    notifyLayoffBeforeMeld: '🚫 ሳትወርድ ገቢ አይቻልም! መጀመሪያ ቢያንስ በ41 ነጥብ መውረድ አለብዎት!',
    notifySetFull4: 'ይህ ትሪስ ቀድሞውኑ 4 ካርድ ሞልቷል!',
    notifyNoMoreJokersRun: 'በዚህ ካትሪስ ላይ ተጨማሪ ጆከር መጨመር አይቻልም!',
    notifyJokerLaidOff: '🃏 ጆከሩ በወረዱት ካርዶች ላይ ገቢ ተደርጓል!',
    notifyJokerSwapped: '✨ ጆከሩን በትክክለኛ ካርድ ቀይረው ወደ እጅዎ ወስደዋል!',
    notifyMismatchGroup: 'ይህ ካርድ ከዚህ ቡድን ጋር አይገጥምም!',
    notifyCardLaidOff: (c: string) => `ካርታ ${c} ወደ ጠረጴዛው ገቢ ተደርጓል!`,
    notifyNeedSwapNatural: (lbl: string) => `ይህን ጆከር ለመቀየር ትክክለኛው ${lbl} በእጅዎ ሊኖር ይገባል!`,
    winTitleDopeyJoker: '👑 ጎልደን አሸናፊ! (3x)',
    winTitleDopey: '🔥 ዶፔይ / ሞንቴ አሸናፊ! (2x)',
    winTitleJokerFinish: '🃏 ዶፔይ / ሞንቴ በጆከር አሸናፊ! (2x)',
    winTitleStreakJoker: (n: number) => `👑 ጎልደን (${n}ኛ ተከታታይ ድል በጆከር)! (3x)`,
    winTitleStreak: (n: number) => `🔥 ዶፔይ / ሞንቴ (${n}ኛ ተከታታይ ድል)! (2x)`,
    winTitleNormal: '🎉 እንኳን ደስ አለዎት! አሸንፈዋል!',
    winTitleTimeout: '🏆 ተጋጣሚዎችዎ የተሰጣቸውን ሰዓት በአግባቡ ባለመጠቀማቸው እርስዎ የጨዋታው አሸናፊ ሆነዋል!',
    loseTitleTimeout: (w: string) => `⏳ የተሰጠው የመጫወቻ ሰዓት በመጠናቀቁ ${w} የጨዋታው አሸናፊ ሆነዋል!`,
    loseTitle: (w: string, mult?: number) =>
      mult && mult >= 3
        ? `😔 ${w} ጎልደን (3x) አሸንፏል!`
        : mult === 2
        ? `😔 ${w} ዶፔይ / ሞንቴ (2x) አሸንፏል!`
        : `😔 ${w} ይህን ዙር አሸንፏል!`,
    notifyYourTurnFull: 'የእርስዎ ተራ ነው! (90 ሰከንድ ማሰቢያ + 30 ሰከንድ ማስጠንቀቂያ)',
    notifyOppMelded: (name: string, pts: number) => `${name} በ${pts} ነጥብ ወረደ!`,
    notifyAlreadyDiscarded: '🚫 በዚህ ተራ ውስጥ አስቀድመው ካርታ ጥለዋል፤ በድጋሜ መጣል አይቻልም!',
    notifyNotYourTurn: 'ይህ የእርስዎ ተራ አይደለም፤ እባክዎን ይጠብቁ!',
    notifyMustDrawFirst: 'ከመጣልዎ በፊት መጀመሪያ ከመደቡ ወይም ከተጣለው ካርታ ይሳቡ!',
    notifyMustMeldOrReturn: '🚫 መጀመሪያ ከተጣለ ካርታ ስለወሰዱ ግድ መውረድ ወይም "መልስ" መጫን አለብዎት!',
    notifyIllegalMatchingDiscard: '🚫 የሚገጥም ካርድ መጣል አይቻልም! ይህ ካርድ በጠረጴዛው ላይ ካለ ቡድን ጋር ይገጥማል።',
    notifyDiscarded: (c: string) => `ካርታ ${c} ተጥሏል! ተራው አልቋል።`,
    notifyAutoSorted: 'ትሪስና ካትሪሶች በአንድነት ከፊት ተደርድረዋል!',
    notifyCardReordered: 'ካርታው በፈለጉበት ቦታ ተሰክቷል!',
    notifyInsufficientStake: (s: number) => `❌ ቀሪ ሂሳብዎ በቂ አይደለም (${s} ብር ያስፈልጋል)!`,
    notifyRoomCreated: (n: number, s: number) => `ክፍል #${n} ተፈጥሯል! (${s} ብር ተይዟል፤ ከመጀመሩ በፊት "ሰርዝ" ማለት ይቻላል)`,
    notifyRoomCancelled: (name: string, s: number) => `✅ ${name} ተሰርዟል፤ ${s} ብር ወደ ዋሌትዎ ተመልሷል!`,
    notifyInsufficientJoin: (s: number) => `❌ ለመቀላቀል ${s} ብር በዋሌትዎ ሊኖር ይገባል!`,
    notifyInviteCopied: 'የመጋበዣ ሊንክ እና ኮድ ተቀድቷል! ለጓደኞችዎ ይላኩ።',
    notifyLinkCopied: 'የመጋበዣ ሊንክ ተቀድቷል!',
    notifyInsufficientWallet: '❌ ቀሪ ሂሳብዎ በቂ አይደለም!',
    notifyEnterValidCode: 'እባክዎን ትክክለኛ የክፍል ኮድ ያስገቡ!',
    notifyRoomFull: 'ክፍሉ ሞልቷል!',
    notifyJoinedPrivateCode: (code: string) => `🎉 በኮድ ${code} ወደ የግል ክፍሉ ገብተዋል!`,
    settingsBtn: 'ቅንብር',
    rulesBtn: 'ህግጋት',
    settingsTitle: 'የራሚኖ ቅንብር',
    languageSettingLabel: 'ቋንቋ ይምረጡ',
    soundFxLabel: 'የካርታ እና የድል ድምፆች',
    soundOn: 'በርቷል',
    soundOff: 'ጠፍቷል',
    tableColorLabel: 'የጠረጴዛ መልክ',
    themeEmerald: 'አረንጓዴ ቬልቬት',
    themeMahogany: 'ጥቁር ቡናማ ንጉሳዊ',
    themeMidnight: 'ሰማያዊ ለሊት',
    groupHintsLabel: 'የተሰሩ ቡድኖችን በቀለም አሳይ',
    groupHintsDesc: 'በእጅዎ ያሉ ትሪስ እና ካትሪሶችን ከላይ በቀለም መስመር ይለያል',
    landscapeLockLabel: 'ስክሪን ወደ ጎን አዙር',
    landscapeLockDesc: 'ጨዋታ ሲጀመር ስክሪኑን በራስ-ሰር ሰፊ ያደርገዋል',
    openRulesFromSettings: 'ሙሉ የራሚኖ ጨዋታ ህግጋትን እይ',
    backToHomeHubBtn: 'ወደ ዋናው ገጽ ውጣ',
    rulesQuickValuesTitle: 'የካርዶች ነጥብ መለኪያ',
    rulesValNum: '2 – 10 = በቁጥሩ ልክ ነጥብ',
    rulesValFace: 'J, Q, K = 10 ነጥብ እያንዳንዳቸው',
    rulesValAce: 'A = 11 ነጥብ (Q-K-A ወይም ትሪስ) / 1 ነጥብ (A-2-3)',
    rulesValJoker: '🃏 ጆከር = የጎደለውን ማንኛውም ካርድ ይተካል',
    rulesExamplesTitle: 'ትክክለኛ የመውረጃ ምሳሌዎች',
    rulesTrisLabel: 'ትሪስ (ተመሳሳይ ቁጥር • የተለያየ ምልክት)',
    rulesCatrisLabel: 'ካትሪስ (ተከታታይ ቁጥር • አንድ አይነት ምልክት)',
    rulesProTipTitle: 'ጠቃሚ ምክር',
    rulesProTipBody: 'ካርታዎቹን በጣትዎ ጎትተው ወደ ፈለጉት ቦታ ማስገባት ወይም «ደርድር» በመጫን ትሪስና ካትሪሶችን በአንድ ጊዜ ማስተካከል ይችላሉ!',
    rulesBadgeQuick: 'ቀላል መመሪያ',
    rulesWinMultiTitle: '7. በተከታታይ ማሸነፍ እና አከፋፋይ',
    rulesWinMultiDesc: 'ዙሩን ያሸነፈው ተጫዋች በቀጣዩ ዙር ካርታ ያከፋፍላል። በአንድ ጠረጴዛ ላይ 3 ጊዜ በተከታታይ ካሸነፉ እስኪሸነፉ ድረስ 2x እጥፍ ይከፈልዎታል (ተጫዋች ከወጣ ግን ከ 0 ይጀምራል)።',
    shareTelegramLabel: 'በቴሌግራም ላክ',
    shareWhatsappLabel: 'በዋትስአፕ ላክ',
    inviteTextHeader: '🎮 የ SUN ራሚኖ የግል ክፍል ግብዣ!',
    notifyDopeyHoldGolden: '✨ 5 ጥንድ + 1 ትሪስ ይዘዋል! ጆከር ሲመጣ በጎልደን (3x) መዝጋት ወይም ተራዎ ሲደርስ "ዶፔይ" መዝጋት ይችላሉ።',
    winnerCardsHeader: '🃏 የአሸናፊው ካርታዎች',
    winnerCardsTrustNote: 'ለሁሉም ተጫዋቾች ታማኝነት በጠረጴዛው ላይ ታይቷል',
    winnerGroupPair: 'ጥንድ',
    winnerGroupTris: 'ትሪስ',
    winnerGroupCatris: 'ካትሪስ',
    winnerGroupClosing: 'መዝጊያ',
    viewTableCardsBtn: '👁️ ጠረጴዛው ላይ እይ',
    openWinSummaryBtn: '🏆 ውጤት ክፈት',
  },
  ti: {
    brandTitle: 'SUN ራሚኖ',
    brandSub: 'SUN ራሚኖ ሎቢ',
    exitBtn: 'መውጽኢ',
    backBtn: 'ተመለስ',
    rulesTooltip: 'ሕግታት',
    playersCardLabel: 'ተጻወትቲ',
    liveStreamSub: 'ቀጥታ ስርጭት',
    openRoomsCardLabel: 'ክፉታት ክፍልታት',
    activeRoomsSub: 'ንጡፋት ክፍልታት',
    balanceCardLabel: 'ቀሪ ሕሳብ',
    walletSub: 'ዋሌት',
    depositShort: 'ኣታዊ',
    withdrawShort: 'ወጻኢ',
    openWalletBtn: 'ዋሌት (ኣታዊን ወጻኢን)',
    openRoomsHeader: (count: number) => `ክፉታት ክፍልታት (${count})`,
    refreshBtn: 'ኣሐድስ',
    roomsRefreshed: 'ዝርዝር ክፍልታት ተሓዲሱ!',
    noOpenRooms: 'ዝኾነ ክፉት ክፍሊ የለን፤ ካብ ታሕቲ ሓድሽ ክፍሊ ፍጠሩ!',
    yoursTag: 'ናትኩም',
    playersWord: 'ተጻወትቲ',
    oneDeckShort: '1 ዴክ',
    twoDecksShort: '2 ዴክ',
    oneDeckDesc: '1 ዴክ (54 ካርታ)',
    twoDecksDesc: '2 ዴካት (108 ካርታ)',
    cancelRefundBtn: 'ሰርዝ እሞ ምለስ',
    cancelRefundTip: 'ክፍሊ ሰርዝ እሞ ብር ምለስ',
    startBtn: 'ጀምር',
    joinBtn: 'እቶ',
    choosePlayersLabel: 'ብዝሒ ተጻወትቲ ምረጹ:',
    seatOptionLabel: (n: number) => `${n} ተጻወትቲ`,
    seatDeckLabel: (cards: number) => `${cards} ካርታ`,
    stakeLabel: 'መጠን መወራረዲ ብር ኣእትዉ ወይ ምረጹ:',
    stakePlaceholder: 'መጠን ብር ብቍጽሪ ኣእትዉ',
    createRoomBtn: (stake: number, seats: number) => `ክፍሊ ፍጠር (${stake} ብር • ${seats} ተጻወትቲ)`,
    privateRoomBtn: 'ብሕታዊ ክፍሊ',
    joinByCodeBtn: 'ብኮድ ተጸንበር',
    micOpen: 'ድምጺ ክፉት',
    micOpenBtn: 'ማይክ ክፈት',
    deafenOpenTip: 'ድምጺ ተዓጽዩ — ክፈት',
    deafenMuteTip: 'ድምጺ ኣዕሩኽ ዕጾ',
    voiceStageBtn: 'መድረኽ ድምጺ',
    voiceStageTitle: 'ብሕታዊ መድረኽ ድምጺ',
    voiceE2eeBadge: '🔒 E2EE ዘይጥለፍ',
    voiceHdBadge: 'HD 48kHz ጽሬት',
    voiceHoldToTalk: 'ተጸቒጥኩም ተዛረቡ',
    voiceReleaseToMute: 'ንምዕጻው ልቀቑ',
    voiceTapToSpeak: 'ማይክ ክፈት',
    voiceMicLive: 'ብቀጥታ ትዛረቡ',
    voiceMutePeer: 'ድምጺ ዕጾ',
    voiceUnmutePeer: 'ድምጺ ክፈት',
    voiceSpeakingNow: 'ይዛረብ ኣሎ',
    voiceListening: 'ይሰምዕ ኣሎ',
    voiceUntappableNote: 'እዚ ብሕታዊ ድምጺ ብDTLS-SRTP ዝተመስጠረ እዩ — ኣድሚን ይኹን ሳልሳይ ኣካል ክሰምዖ ኣይክእልን።',
    voiceParticipantsLabel: 'ኣብ መድረኽ ዘለዉ ተሳተፍቲ',
    ceremonyTitle: (seats: number) => `መን የከፋፍል? ዝለዓለ ካርታ (${seats} ተጻወትቲ • ${seats} ካርታ)`,
    dealerBadge: 'ኣከፋፋሊ 👑',
    ceremonyWinnerBanner: (dealer: string, cardStr: string) => `👑 ${dealer} የከፋፍሉ • ${cardStr} — ናብ ጸወታ ይኣቱ ኣሎ...`,
    ceremonyRevealing: (curr: number, total: number) => `ካርታታት በብተራ ይኽፈቱ ኣለዉ... (${curr}/${total})`,
    streakLabel: (n: number) => `🔥 ${n} ተኸታታሊ ዓወት${n >= 3 ? ' • 2x ዕጽፊ' : ' (ኣብ 3ይ 2x)'}`,
    roundWord: 'ዙር',
    postDayBtn: '🪑 ፖስት ዴይ',
    postDayTip: 'ድሕሪ 5 ጸወታ ኩሎም ሓድሽ ወንበር ንምርካብ ፖስት ዴይ በሉ',
    meldedBadge: 'ወሪዱ',
    cardWord: 'ካርታ',
    cardsWord: 'ካርታታት',
    bottomCardTip: (cardStr: string) => `ናይ ታሕቲ ካርታ (${cardStr})`,
    drawDeckTip: 'ዝስሓብ ካርታ',
    discardPileTip: 'ዝተደርበየ ካርታ ኣልዕል',
    closedSetsTip: 'ዝተዓጽዉ 4-ካርታታት',
    hereMarker: '▼ ኣብዚ',
    dopeyBtn: '👑 ዶፔይ / ሞንቴ • 2x',
    dopeyJokerBtn: '👑 ጎልደን • 3x',
    meldBtn: (pts: number) => `ውረድ • ${pts}`,
    sortBtn: 'ደርድር',
    returnBtn: 'ምለስ',
    discardLockedBtn: 'ደርቢ (ውረድ ወይ ምለስ)',
    discardBtn: 'ደርቢ',
    bannedTitle: 'ካብ ጸወታ ተኣጊድኩም!',
    bannedDesc: 'ኣብ ዝተዋህበ 90 ሰከንድ መሕሰቢን 30 ሰከንድ መጠንቀቕታን ካርታ ብዘይምስሓብኩም ካብ ጸወታ ወጺእኩም።',
    bannedSpectatorDesc: 'ኣብ ዝተዋህበ ሰዓት ብዘይምጽዋትኩም ኣብዚ ዙር ተኣጊድኩም። ዝተረፉ ተጻወትቲ ክጻወቱ እንከለዉ ግን ጸወታ ብቐጥታ ክትከታተሉ ትኽእሉ ኢኹም።',
    watchGameBtn: '👁️ ጸወታ ተኸታተል',
    suspendedBadge: 'ተኣጊዱ',
    spectatorBanner: '🚫 ግዜኹም ስለዝተወድአ ኣብዚ ዙር ተኣጊድኩም — ጸወታ ብቐጥታ ትከታተሉ ኣለኹም 👁️',
    notifyPlayerSuspended: (name: string) => `🚫 ${name} ሰዓቱ ስለዝተወድአ ተኣጊዱ፤ ጸወታ ይከታተል ኣሎ።`,
    backToLobbyBtn: 'ናብ ሎቢ ተመለስ',
    privateModalTitle: 'ብሕታዊ ክፍሊ ፍጠር',
    chooseFriendsStep: '1. ብዝሒ ዝጻወቱ ኣዕሩኽ ምረጹ:',
    seatSummary: (seats: number, friends: number) => `${seats} ተጻዋታይ (${friends} ዓርኪ)`,
    seatPersonCount: (seats: number) => `${seats} ሰብ`,
    friendSingle: '1 ዓርኪ',
    friendPlural: (f: number) => `${f} ኣዕሩኽ`,
    roomCodeStep: '2. ኮድ ክፍሊ:',
    newCodeBtn: 'ሓድሽ ኮድ',
    copiedBtn: 'ተቐዲሑ',
    copyCodeBtn: 'ኮድ ቅዳሕ',
    inviteLinkStep: '3. ንኣዕሩኽ ዝለኣኽ ሊንክ (ቴሌግራም / ዋትስኣፕ):',
    copyLinkBtn: 'ሊንክ ቅዳሕ',
    sendTelegramBtn: 'ብቴሌግራም ስደድ',
    sendWhatsappBtn: 'ብዋትስኣፕ ስደድ',
    shareFullInviteBtn: 'ምሉእ ዕድመ ኣካፍል',
    joinedFriendsHeader: (curr: number, max: number) => `ዝተጸንበሩ ኣዕሩኽ (${curr}/${max})`,
    voiceChannelReady: 'ናይ ብሕቲ ድምጺ ድሉው',
    waitingFriendSlot: (idx: number) => `ዓርኪ #${idx} ይጽበ ኣሎ...`,
    privateStakeStep: '2. ናይዚ ብሕታዊ ክፍሊ መወራረዲ (ብር):',
    waitingRoomTitle: (priv: boolean) => (priv ? 'መጸበዪ ብሕታዊ ክፍሊ' : 'መጸበዪ ጠረጴዛ'),
    waitingPlayersNeeded: 'ጸወታ ንምጅማር ብውሑዱ 2 ናይ ብሓቂ ተጻወትቲ ክኣትዉ ኣለዎም',
    waitingHostStartBtn: (stake: number, curr: number) => `▶️ ሕጂ ጀምር (${curr} ተጻወትቲ • ${stake} ብር)`,
    waitingForHostMsg: 'ዓዳሚ ወይ ዝተረፉ ተጻወትቲ ምስ ኣተዉ ጸወታ ብቀጥታ ክጅምር እዩ...',
    cancelLeaveRefundBtn: 'ውጻእ እሞ ብር ምለስ',
    startPrivateRoomBtn: (stake: number, seats: number) => `ክፍሊ ጀምር (${stake} ብር • ${seats} ተጻወትቲ)`,
    joinModalTitle: 'ብኮድ ወይ ብሊንክ ተጸንበር',
    enterCodeLabel: 'ኮድ ክፍሊ ኣእትዉ:',
    codePlaceholder: 'ኣብነት: RAMINO-7714',
    hostLabel: 'ዓዳሚ:',
    playersLabel: 'ተጻወትቲ:',
    voiceLabel: 'ድምጺ:',
    joinRoomSubmit: (preview: { stake: number; maxPlayers: number } | null) =>
      preview ? `ተጸንበር (${preview.stake} ብር • ${preview.maxPlayers} ሰብ)` : 'ተጸንበር',
    potAmountLabel: 'ጠቕላላ ድስቲ:',
    rakeLabel: 'ናይ SUN 10% ኮሚሽን:',
    dopeyMultLabel: 'ዶፔይ / ሞንቴ (2x):',
    goldenMultLabel: '👑 ጎልደን (3x):',
    penaltyDeductedLabel: '💸 ካብ ዋሌትኩም ዝተቘርጸ:',
    jokerFinishMultLabel: '🃏 ዶፔይ / ሞንቴ (ብጆከር):',
    streakMultLabel: (n: number) => `🔥 ተኸታታሊ ዓወት (${n}ይ):`,
    streakTimes: (m: number) => `${m}x (${m >= 3 ? 'ጎልደን' : 'ዶፔይ / ሞንቴ'})`,
    streakProgress: (n: number) => `🔥 ተኸታታሊ ዓወት: ${n}/3 (ድሕሪ 3 ተኸታታሊ ዓወት ብጆከር ጎልደን 3x!)`,
    netWonLabel: 'ዝተጻረየ እቶት:',
    nextDealerLabel: '👑 ቀጻሊ ካርታ ዘከፋፍል:',
    nextRoundBtn: (dealer: string, extra: string) => `🔄 ቀጻሊ ዙር ጀምር (${dealer} የከፋፍል${extra})`,
    postDayWinnerBtn: '🪑 ፖስት ዴይ (ኩሎም ተቐቢሎም ወንበር ይመርጹ)',
    backToLobbyResetBtn: 'ናብ ሎቢ ተመለስ',
    resumeBannerTitle: 'ንቑ ጸወታ ራሚኖ ኣለኩም!',
    resumeBannerSub: (stake: number, secs: number) => `🪙 ${stake} ብር • ሰዓት ከይተወድአ ተመሊስኩም ክትቅጽሉ ትኽእሉ (⏳ ${secs}s)`,
    resumeReturnBtn: '▶️ ናብ ጸወታ ተመለስ',
    resumeForfeitBtn: 'ጸወታ ግደፍ',
    notifySavedCanReturn: '⏳ ጸወታኹም ክፉት እዩ — ሰዓቱ ከይተወድአ ክትምለሱ ትኽእሉ!',
    postDayModalTitle: 'ፖስት ዴይ — ሕቶ መቐየሪ ወንበር',
    postDayModalDesc: (name: string) => `${name} ፖስት ዴይ ሓቲቱ — ኩሎም 1 ካርታ ወሲዶም ዝለዓለ ቅድምያ ወንበር ይመርጽ`,
    acceptedBadge: '✓ ተቐቢሉ',
    waitingAcceptBadge: '⏳ ይጽበ ኣሎ...',
    acceptPostDayBtn: '✓ ሕቶ ተቐበል',
    closeBtn: 'ዕጾ',
    allAcceptedPostDay: '✅ ኩሎም ተቐቢሎም! ናይ ወንበር መምረጺ ካርታ ይዕደል ኣሎ...',
    waitingAllPostDay: '⏳ ምቕባል ኩሎም ተጻወትቲ ይጽበ ኣሎ...',
    postDayPickTitle: (seats: number) => `🪑 ፖስት ዴይ — መምረጺ ወንበር (${seats} ተጻወትቲ)`,
    postDayPickYourTurn: '🎯 ተራኹም እዩ — ካብ ታሕቲ ዝደለኹምዎ ወንበር ምረጹ!',
    postDayPickOtherTurn: (name: string) => `⏳ ሕጂ ${name} ወንበር ይመርጽ ኣሎ...`,
    postDayPickDone: '✅ ኩሎም ወንበሮም መሪጾም! ናብ ጠረጴዛ ይኣቱ ኣሎ...',
    postDaySeatLabel: (n: number) => `ወንበር #${n}`,
    postDayPickOpenSeat: 'ክፉት ወንበር (ምረጽ)',
    rulesModalTitle: 'ሕግታት SUN ራሚኖ',
    understoodCloseBtn: 'ተረዲአዮ',
    rule1Title: '1. ሰዓት (90 ሰከንድ + 30 ሰከንድ መጠንቀቕታ)',
    rule1Desc: 'ተጻራሪ ተጻዋታይ ካርታ ምስ ደርበየልኩም 90 ሰከንድ መሕሰቢ ይጅምር፤ ምስ ተወድአ ብቐይሕ 30 ሰከንድ መጠንቀቕታ ይወሃብ። ካርታ እንተዘይስሒብኩም ትእገዱ።',
    rule2Title: '2. ምውራድ (41 ነጥቢ)ን ካብ ዝተደርበየ ምልዓልን',
    rule2Desc: 'ንምውራድ ብውሑዱ 41 ነጥቢ ብትሪስ ወይ ካትሪስ ክስራሕ ኣለዎ። ንመጀመርያ ከይወረድኩም ካብ ዝተደርበየ ካርታ እንተልዒልኩም ግድን ክትወርዱ ወይ ክትመልሱ ኣለኩም።',
    rule3Title: '3. ናይ ታሕቲ ካርታ፣ ጆከር ምዝዛምን ዶፔይን ዓወት',
    rule3Desc: 'ዘይወረደ ተጻዋታይ ካርታታቱ ብጉጅለ ኣኪቡ ናይ ታሕቲ ካርታ ጥራይ ዝተርፎ እንተኾይኑ ብወርቃዊ ብርሃን ይበርህ። ብጆከር እንተወዲእኩም 2x (ድሕሪ 3 ተኸታታሊ ዓወት 3x)፤ 5 ጽምድታት + 1 ትሪስ 2x ብጆከር እንተተዓጽዩ 3x ዕጽፊ ይህብ።',
    rule4Title: '4. ሓደ ካርታ ምድርባይን ዝገጥም ካርታ ምኽልካልን',
    rule4Desc: 'ኣብ ሓደ ተራ ሓደ ካርታ ጥራይ ይድርበ። ኣብ ጠረጴዛ ምስ ዘሎ ጉጅለ ዝገጥም ካርታ ምድርባይ ኣይከኣልን።',
    rule5Title: '5. መደብ ምስ ተወድአ',
    rule5Desc: 'ዝተደርበዩ ካርታታት ተሓዋዊሶም ሓድሽ መደብ ይኾኑ።',
    rule6Title: '6. ፖስት ዴይ',
    rule6Desc: 'ኣብ ብሕታዊ ጠረጴዛ ድሕሪ 5 ጸወታ ኩሎም ተጻወትቲ ተሰማሚዖም ሓድሽ ወንበር ክወሃቦም ይኽእሉ።',
    roomPrefix: 'ክፍሊ #',
    currencyUnit: 'ብር',
    notifyMicUnsupported: '❌ እዚ መሳርሒ ማይክሮፎን ኣይድግፍን።',
    notifyMicDenied: '❌ ፍቓድ ማይክሮፎን ኣይተዋህበን!',
    notifyMicOpened: '🎙️ ማይክሮፎንኩም ተኸፊቱ — ኣዕሩኽኩም ክሰምዑኹም ይኽእሉ!',
    notifyStreakResetLeft: '⚠️ ተጻዋታይ ካብ ጠረጴዛ ስለዝወጸ ተኸታታሊ ድል ናብ 0 ተመሊሱ!',
    notifyPostDayAsked: (req: string) => `🪑 ${req} ፖስት ዴይ (ሓድሽ ወንበር) ሓቲቱ!`,
    notifyAdminClosedRoom: '🛡️ ኣድሚን ነዚ ብሕታዊ ክፍሊ ዓጽይዎ።',
    notifyAdminResetGame: '🔄 ኣድሚን ጸወታ ካብ ሓድሽ ጀሚሩዎ።',
    notifyJoinLookupErr: 'ብዚ ኮድ ዝተፈጥረ ክፍሊ ኣይተረኽበን።',
    notifyRoomExpired: (name: string, refund: number) => `⏰ ${name} ግዜኡ ስለዝኣኸለ ተዓጽዩ፤ ${refund} ብር ናብ ዋሌትኩም ተመሊሱ!`,
    notifyDealerStarted: (dealer: string) => `👑 ${dealer} (ኣከፋፋሊ • 14 ካርታ) ብምድርባይ ይጅምር!`,
    notifyDealerFirstDiscard: (dealer: string) => `👑 ${dealer} (14 ካርታ ወሲድኩም) — 1 ካርታ ብምድርባይ ጸወታ ጀምሩ!`,
    discardSlotLabel: 'መደርበዪ',
    notifyDealtSelf: 'ካርታ ተኸፋፊሉ! ካብ መደብ ወይ ዝተደርበየ ስሓቡ።',
    notifyDealerOpp: (dealer: string) => `👑 ${dealer} (14 ካርታ) ብምድርባይ ይጅምር!`,
    notifyYourTurnStart: (dealer: string) => `👑 ${dealer} ካርታ ኣከፋፊሉ! ተራኹም እዩ።`,
    notifyWarning30s: '⚠️ 30 ሰከንድ መጠንቀቕታ! ካርታ እንተዘይስሒብኩም ክትእገዱ ኢኹም!',
    notifyBottomNotReady: 'ናይ ታሕቲ ካርታ መሸነፊ ገና ኣይተማልአን።',
    winBottomJokerDopey: (s: string) => `👑 ጎልደን ብናይ ታሕቲ ጆከር (${s}) ተዓዋቲ! (3x)`,
    winBottomDopey: (c: string) => `🔥 ዶፔይ / ሞንቴ ብናይ ታሕቲ ካርታ (${c}) ተዓዋቲ! (2x)`,
    winBottomNormal: (c: string) => `🏆 ብናይ ታሕቲ ካርታ (${c}) ተዓዋቲ!`,
    notifyReshuffled: '🔄 መደብ ስለዝተወድአ ዝተደርበዩ ካርታታት ተሓዋዊሶም!',
    notifyPostDayApplied: '🪑 ኩሎም ተጻወትቲ ወንበሮም መሪጾም! ሓድሽ ቦታ ተታሒዙ።',
    notifyInsufficientNext: '❌ ንቀጻሊ ዙር እኹል ቀሪ ሕሳብ የለን!',
    notifyWaitTurn: 'በጃኹም ተራኹም ተጸበዩ!',
    notifyAlreadyDrawn: 'ኣቐዲምኩም ካርታ ስሒብኩም፤ ትድርብይዎ ካርታ ምረጹ!',
    notifyDeckEmpty: 'መደብን መደርበይን ባዶ ኮይኑ!',
    notifyCardDrawn: (c: string) => `ካርታ ${c} ተሳሒቡ! ምስ ወዳእኩም 1 ካርታ ደርብዩ።`,
    notifyDiscardPickedNeedMeld: (c: string) => `ዝተደርበየ ${c} ኣልዒልኩም! መጀመርያ ውረዱ ወይ "ምለስ" ጠውቑ።`,
    notifyDiscardPickedFree: (c: string) => `ዝተደርበየ ${c} ኣልዒልኩም! ድሕሪ ምውራድ ከም ድላይኩም ተጻወቱ።`,
    notifyReturnedDiscard: (c: string) => `ካርታ ${c} ተመሊሱ፤ ሕጂ ካብ መደብ ስሓቡ።`,
    notifyMeldTurnOnly: 'በጃኹም ብተራኹም ጥራይ ውረዱ!',
    notifyMeldNeed41: (pts: number) => `ንምውራድ ብውሑዱ 41 ነጥቢ የድሊ! (${pts}/41)`,
    notifyMeldedOk: (pts: number) => `✨ ጽቡቕ! ብ${pts} ነጥቢ ወሪድኩም።`,
    notifyLayoffBeforeMeld: '🚫 ከይወረድኩም ምእታው ኣይከኣልን! መጀመርያ ብ41 ነጥቢ ውረዱ!',
    notifySetFull4: 'እዚ ትሪስ 4 ካርታ መሊኡ እዩ!',
    notifyNoMoreJokersRun: 'ኣብዚ ካትሪስ ተወሳኺ ጆከር ምውሳኽ ኣይከኣልን!',
    notifyJokerLaidOff: '🃏 ጆከር ኣብ ዝወረዱ ካርታታት ኣትዩ!',
    notifyJokerSwapped: '✨ ጆከር ብትኽክለኛ ካርታ ቀዪርኩም ወሲድኩም!',
    notifyMismatchGroup: 'እዚ ካርታ ምስዚ ጉጅለ ኣይገጥምን!',
    notifyCardLaidOff: (c: string) => `ካርታ ${c} ናብ ጠረጴዛ ኣትዩ!`,
    notifyNeedSwapNatural: (lbl: string) => `ነዚ ጆከር ንምቕያር ትኽክለኛ ${lbl} ክህልወኩም ኣለዎ!`,
    winTitleDopeyJoker: '👑 ጎልደን ተዓዋቲ! (3x)',
    winTitleDopey: '🔥 ዶፔይ / ሞንቴ ተዓዋቲ! (2x)',
    winTitleJokerFinish: '🃏 ዶፔይ / ሞንቴ ብጆከር ተዓዋቲ! (2x)',
    winTitleStreakJoker: (n: number) => `👑 ጎልደን (${n}ይ ተኸታታሊ ዓወት ብጆከር)! (3x)`,
    winTitleStreak: (n: number) => `🔥 ዶፔይ / ሞንቴ (${n}ይ ተኸታታሊ ዓወት)! (2x)`,
    winTitleNormal: '🎉 እንቋዕ ሓጎሰኩም! ተዓዊትኩም!',
    winTitleTimeout: '🏆 ተወዳደርትኹም ዝተዋህቦም ሰዓት ብግቡእ ብዘይምጥቃሞም ንስኹም ተዓዋቲ ናይዚ ጸወታ ኾይንኩም!',
    loseTitleTimeout: (w: string) => `⏳ ዝተዋህበ ሰዓት ስለዝተወድአ ${w} ተዓዋቲ ኾይኖም!`,
    loseTitle: (w: string, mult?: number) =>
      mult && mult >= 3
        ? `😔 ${w} ጎልደን (3x) ተዓዊቱ!`
        : mult === 2
        ? `😔 ${w} ዶፔይ / ሞንቴ (2x) ተዓዊቱ!`
        : `😔 ${w} ነዚ ዙር ተዓዊቱ!`,
    notifyYourTurnFull: 'ተራኹም እዩ! (90 ሰከንድ መሕሰቢ + 30 ሰከንድ መጠንቀቕታ)',
    notifyOppMelded: (name: string, pts: number) => `${name} ብ${pts} ነጥቢ ወሪዱ!`,
    notifyAlreadyDiscarded: '🚫 ኣብዚ ተራ ኣቐዲምኩም ደርቢኹም ኢኹም!',
    notifyNotYourTurn: 'ተራኹም ኣይኮነን፤ በጃኹም ተጸበዩ!',
    notifyMustDrawFirst: 'ቅድሚ ምድርባይ ካርታ ስሓቡ!',
    notifyMustMeldOrReturn: '🚫 ካብ ዝተደርበየ ስለዘልዓልኩም ውረዱ ወይ "ምለስ" ጠውቑ!',
    notifyIllegalMatchingDiscard: '🚫 ምስ ጠረጴዛ ዝገጥም ካርታ ምድርባይ ኣይከኣልን!',
    notifyDiscarded: (c: string) => `ካርታ ${c} ተደርብዩ! ተራ ተወዲኡ።`,
    notifyAutoSorted: 'ትሪስን ካትሪስን ብቅደም ተኸተል ተሰሪዖም!',
    notifyCardReordered: 'ካርታ ኣብ ዝደለኹምዎ ቦታ ተቐሚጡ!',
    notifyInsufficientStake: (s: number) => `❌ ቀሪ ሕሳብኩም እኹል ኣይኮነን (${s} ብር የድሊ)!`,
    notifyRoomCreated: (n: number, s: number) => `ክፍሊ #${n} ተፈጢሩ! (${s} ብር ተታሒዙ)`,
    notifyRoomCancelled: (name: string, s: number) => `✅ ${name} ተሰሪዙ፤ ${s} ብር ናብ ዋሌትኩም ተመሊሱ!`,
    notifyInsufficientJoin: (s: number) => `❌ ንምጽንባር ${s} ብር የድሊ!`,
    notifyInviteCopied: 'ሊንክን ኮድን ተቐዲሑ! ንኣዕሩኽኩም ስደዱ።',
    notifyLinkCopied: 'ናይ ዕድመ ሊንክ ተቐዲሑ!',
    notifyInsufficientWallet: '❌ ቀሪ ሕሳብኩም እኹል ኣይኮነን!',
    notifyEnterValidCode: 'በጃኹም ትኽክለኛ ኮድ ኣእትዉ!',
    notifyRoomFull: 'ክፍሊ መሊኡ እዩ!',
    notifyJoinedPrivateCode: (code: string) => `🎉 ብኮድ ${code} ናብ ብሕታዊ ክፍሊ ኣቲኹም!`,
    settingsBtn: 'ቅንብር',
    rulesBtn: 'ሕግታት',
    settingsTitle: 'ቅንብር ራሚኖ',
    languageSettingLabel: 'ቋንቋ ምረጹ',
    soundFxLabel: 'ድምጽታት ካርታን ዓወትን',
    soundOn: 'ክፉት',
    soundOff: 'ዕጹው',
    tableColorLabel: 'ሕብሪ ጠረጴዛ',
    themeEmerald: 'ሓምለዋይ ቬልቬት',
    themeMahogany: 'ቡናዊ ንጉሳዊ',
    themeMidnight: 'ሰማያዊ ለይቲ',
    groupHintsLabel: 'ዝተሰርሑ ጉጅለታት ብሕብሪ ኣርኢ',
    groupHintsDesc: 'ኣብ ኢድኩም ዘለዉ ትሪስን ካትሪስን ብመስመር የርኢ',
    landscapeLockLabel: 'ስክሪን ናብ ጎኒ ኣዙር',
    landscapeLockDesc: 'ጸወታ ክጅምር ከሎ ስክሪን ብቐጥታ ሰፊሕ ይኸውን',
    openRulesFromSettings: 'ምሉእ ሕግታት ራሚኖ ርአ',
    backToHomeHubBtn: 'ናብ ዋና ገጽ ውጻእ',
    rulesQuickValuesTitle: 'ነጥቢ ካርታታት',
    rulesValNum: '2 – 10 = ብቍጽሩ ነጥቢ',
    rulesValFace: 'J, Q, K = 10 ነጥቢ',
    rulesValAce: 'A = 11 ነጥቢ (Q-K-A ወይ ትሪስ) / 1 ነጥቢ (A-2-3)',
    rulesValJoker: '🃏 ጆከር = ዝጎደለ ዝኾነ ካርታ ይትክእ',
    rulesExamplesTitle: 'ትኽክለኛ ኣብነታት ምውራድ',
    rulesTrisLabel: 'ትሪስ (ሓደ ቍጽሪ • ዝተፈላለየ ምልክት)',
    rulesCatrisLabel: 'ካትሪስ (ተኸታታሊ ቍጽሪ • ሓደ ምልክት)',
    rulesProTipTitle: 'ጠቓሚ ምኽሪ',
    rulesProTipBody: 'ካርታታት ብኣጻብዕኩም ስሒብኩም ክትድርድሩ ወይ "ደርድር" ብምጥዋቕ ብቀሊሉ ከተተዓራርዩ ትኽእሉ!',
    rulesBadgeQuick: 'ቀሊል መምርሒ',
    rulesWinMultiTitle: '7. ተኸታታሊ ዓወትን ኣከፋፋሊን',
    rulesWinMultiDesc: 'ተዓዋቲ ተጻዋታይ ኣብ ቀጻሊ ዙር ካርታ የከፋፍል። ብተኸታታሊ 3 ግዜ እንተተዓዊትኩም ክሳብ ትስዕሩ 2x ዕጽፊ ትረኽቡ።',
    shareTelegramLabel: 'ብቴሌግራም ስደድ',
    shareWhatsappLabel: 'ብዋትስኣፕ ስደድ',
    inviteTextHeader: '🎮 ብሕታዊ ክፍሊ SUN ራሚኖ ዕድመ!',
    notifyDopeyHoldGolden: '✨ 5 ጽምዲ + 1 ትሪስ ሒዝኩም ኣለኹም! ጆከር ምስ መጸ ብጎልደን (3x) ወይ ብተራኹም "ዶፔይ" ክትዓጽዉ ትኽእሉ።',
    winnerCardsHeader: '🃏 ካርታታት ተዓዋቲ',
    winnerCardsTrustNote: 'ንተጻወትቲ ተኣማንነት ኣብ ጠረጴዛ ቀሪቡ ኣሎ',
    winnerGroupPair: 'ጽምዲ',
    winnerGroupTris: 'ትሪስ',
    winnerGroupCatris: 'ካትሪስ',
    winnerGroupClosing: 'መዕጸዊ',
    viewTableCardsBtn: '👁️ ኣብ ጠረጴዛ ርአ',
    openWinSummaryBtn: '🏆 ውጽኢት ክፈት',
  },
  om: {
    brandTitle: 'SUN Raaminoo',
    brandSub: 'Galma SUN Raaminoo',
    exitBtn: 'Bahi',
    backBtn: 'Deebi\'i',
    rulesTooltip: 'Seera',
    playersCardLabel: 'Taphattoota',
    liveStreamSub: 'Kallattiin',
    openRoomsCardLabel: 'Kutaalee Banaa',
    activeRoomsSub: 'Kutaalee Qophii',
    balanceCardLabel: 'Haftee Qarshii',
    walletSub: 'Waaletii',
    depositShort: 'Galii',
    withdrawShort: 'Baasii',
    openWalletBtn: 'Waaletii (Galii fi Baasii)',
    openRoomsHeader: (count: number) => `Kutaalee Banaa (${count})`,
    refreshBtn: 'Haaromsi',
    roomsRefreshed: 'Tarreen kutaalee haaromfameera!',
    noOpenRooms: 'Kutaan banaa hin jiru; gadi irraa kutaa haaraa uumi!',
    yoursTag: 'Kan Kee',
    playersWord: 'Taphattoota',
    oneDeckShort: 'Tuutaa 1',
    twoDecksShort: 'Tuutaa 2',
    oneDeckDesc: 'Tuutaa 1 (Kaardii 54)',
    twoDecksDesc: 'Tuutaa 2 (Kaardii 108)',
    cancelRefundBtn: 'Haqi & Deebisi',
    cancelRefundTip: 'Kutaa haqii qarshii deebisi',
    startBtn: 'Jalqabi',
    joinBtn: 'Seeni',
    choosePlayersLabel: 'Baay\'ina taphattootaa filadhu:',
    seatOptionLabel: (n: number) => `Taphattoota ${n}`,
    seatDeckLabel: (cards: number) => `Kaardii ${cards}`,
    stakeLabel: 'Hamma qabsiisaa galchi ykn filadhu:',
    stakePlaceholder: 'Hamma qarshii lakkoofsaan galchi',
    createRoomBtn: (stake: number, seats: number) => `Kutaa Uumi (${stake} ETB • Taphattoota ${seats})`,
    privateRoomBtn: 'Kutaa Dhuunfaa',
    joinByCodeBtn: 'Koodiidhaan Seeni',
    micOpen: 'Sagalee Banaa',
    micOpenBtn: 'Maayikii Bani',
    deafenOpenTip: 'Sagaleen cufaamaadha — bani',
    deafenMuteTip: 'Sagalee hiriyootaa cufi',
    voiceStageBtn: 'Waltajjii Sagalee',
    voiceStageTitle: 'Waltajjii Sagalee Dhuunfaa',
    voiceE2eeBadge: '🔒 E2EE Kan Hin Dhaga\'amne',
    voiceHdBadge: 'Qulqullina HD 48kHz',
    voiceHoldToTalk: 'Qabii Dubbadhu',
    voiceReleaseToMute: 'Cufuuf Gadhiisi',
    voiceTapToSpeak: 'Maayikii Bani',
    voiceMicLive: 'Kallattiin Dubbachaa',
    voiceMutePeer: 'Sagalee Cufi',
    voiceUnmutePeer: 'Sagalee Bani',
    voiceSpeakingNow: 'Dubbachaa Jira',
    voiceListening: 'Dhaggeeffachaa Jira',
    voiceUntappableNote: 'Sagaleen dhuunfaa kun DTLS-SRTP dhaan icciitii qaba — bulchaan ykn namni biraa dhaga\'uu hin danda\'u.',
    voiceParticipantsLabel: 'Hirmaattota Waltajjii Irra Jiran',
    ceremonyTitle: (seats: number) => `Eenyutu Raabsa? Kaardii Ol\'aanaa (Taphattoota ${seats})`,
    dealerBadge: 'Raabsaa 👑',
    ceremonyWinnerBanner: (dealer: string, cardStr: string) => `👑 ${dealer} ni raabsu • ${cardStr} — Gara taphaatti seenaa jira...`,
    ceremonyRevealing: (curr: number, total: number) => `Kaardiiwwan tokko tokkoon banamaa jiru... (${curr}/${total})`,
    streakLabel: (n: number) => `🔥 Injifannoo walitti aansee ${n}${n >= 3 ? ' • 2x Dachaa' : ' (3ffaa irratti 2x)'}`,
    roundWord: 'Marsaa',
    postDayBtn: '🪑 Poost Deey',
    postDayTip: 'Tapha 5 booda teessoo haaraa argachuuf Poost Deey tuqi',
    meldedBadge: 'Bu\'eera',
    cardWord: 'Kaardii',
    cardsWord: 'Kaardiiwwan',
    bottomCardTip: (cardStr: string) => `Kaardii jalaa (${cardStr})`,
    drawDeckTip: 'Kaardii Harkisi',
    discardPileTip: 'Kaardii gatame fudhu',
    closedSetsTip: 'Kaardii 4 cufame',
    hereMarker: '▼ Asitti',
    dopeyBtn: '👑 Dooppey • 2x',
    dopeyJokerBtn: '👑 Dooppey Jookeraan • 3x',
    meldBtn: (pts: number) => `Bu\'i • ${pts}`,
    sortBtn: 'Tartiibsi',
    returnBtn: 'Deebisi',
    discardLockedBtn: 'Gati (Bu\'i ykn Deebisi)',
    discardBtn: 'Gati',
    bannedTitle: 'Tapha irraa dhorkamtaniittu!',
    bannedDesc: 'Yeroo sekondii 90 fi of eeggannoo sekondii 30 keessatti kaardii waan hin harkisneef taphaa baataniittu.',
    bannedSpectatorDesc: 'Yeroo kenname keessatti waan hin taphanneef marsaa kana dhorkamtaniittu. Haa ta\'u malee taphattoonni hafan yoo taphatan kallattiin hordofuu ni dandeessu.',
    watchGameBtn: '👁️ Tapha Hordofi',
    suspendedBadge: 'Dhorkame',
    spectatorBanner: '🚫 Yeroon keessan waan dhumeef marsaa kana dhorkamtaniittu — tapha kallattiin hordofaa jirtu 👁️',
    notifyPlayerSuspended: (name: string) => `🚫 ${name} yeroon isaa waan dhumeef dhorkameera; tapha hordofaa jira.`,
    backToLobbyBtn: 'Gara Galmaatti Deebi\'i',
    privateModalTitle: 'Kutaa Dhuunfaa Uumi',
    chooseFriendsStep: '1. Baay\'ina hiriyootaa filadhu:',
    seatSummary: (seats: number, friends: number) => `Taphataa ${seats} (Hiriyaa ${friends})`,
    seatPersonCount: (seats: number) => `Nama ${seats}`,
    friendSingle: 'Hiriyaa 1',
    friendPlural: (f: number) => `Hiriyoota ${f}`,
    roomCodeStep: '2. Koodii Kutaa:',
    newCodeBtn: 'Koodii Haaraa',
    copiedBtn: 'Waraabameera',
    copyCodeBtn: 'Koodii Waraabi',
    inviteLinkStep: '3. Liinkii hiriyootaaf ergamu (Telegram / WhatsApp):',
    copyLinkBtn: 'Liinkii Waraabi',
    sendTelegramBtn: 'Telegram dhaan Ergi',
    sendWhatsappBtn: 'WhatsApp dhaan Ergi',
    shareFullInviteBtn: 'Afeerraa Guutuu Qoodi',
    joinedFriendsHeader: (curr: number, max: number) => `Hiriyoota seenan (${curr}/${max})`,
    voiceChannelReady: 'Sararri sagalee dhuunfaa qophiidha',
    waitingFriendSlot: (idx: number) => `Hiriyaa #${idx} eegaa jira...`,
    privateStakeStep: '2. Hamma Qabsiisaa Kutaa Dhuunfaa (ETB):',
    waitingRoomTitle: (priv: boolean) => (priv ? 'Kutaa Eeggannoo Dhuunfaa' : 'Kutaa Eeggannoo'),
    waitingPlayersNeeded: 'Tapha jalqabuuf yoo xiqqaate taphattoonni dhugaa 2 seenuu qabu',
    waitingHostStartBtn: (stake: number, curr: number) => `▶️ Amma Jalqabi (Taphattoota ${curr} • ${stake} ETB)`,
    waitingForHostMsg: 'Yeroo hundi seenan ykn abbaan kutaa jalqabu taphni kallattiin ni jalqaba...',
    cancelLeaveRefundBtn: 'Bahi & Qarshii Deebisi',
    startPrivateRoomBtn: (stake: number, seats: number) => `Kutaa Jalqabi (${stake} ETB • Taphattoota ${seats})`,
    joinModalTitle: 'Koodii ykn Liinkiidhaan Seeni',
    enterCodeLabel: 'Koodii kutaa galchi:',
    codePlaceholder: 'Fkn: RAMINO-7714',
    hostLabel: 'Afeeraa:',
    playersLabel: 'Taphattoota:',
    voiceLabel: 'Sagalee:',
    joinRoomSubmit: (preview: { stake: number; maxPlayers: number } | null) =>
      preview ? `Seeni (${preview.stake} ETB • Nama ${preview.maxPlayers})` : 'Seeni',
    potAmountLabel: 'Qabeenya Waliigalaa:',
    rakeLabel: 'Koomishinii 10%:',
    dopeyMultLabel: 'Dooppey / Monte (2x):',
    goldenMultLabel: '👑 Golden (3x):',
    penaltyDeductedLabel: '💸 Waaletii kee irraa cite:',
    jokerFinishMultLabel: '🃏 Dooppey / Monte (Jookeraan):',
    streakMultLabel: (n: number) => `🔥 Injifannoo walitti aansee (${n}ffaa):`,
    streakTimes: (m: number) => `${m}x (${m >= 3 ? 'Golden' : 'Dooppey / Monte'})`,
    streakProgress: (n: number) => `🔥 Walitti aansee: ${n}/3 (3ffaa booda jookeraan Golden 3x!)`,
    netWonLabel: 'Galii Qulqulluu:',
    nextDealerLabel: '👑 Kan itti aansee raabsu:',
    nextRoundBtn: (dealer: string, extra: string) => `🔄 Marsaa itti aanu jalqabi (${dealer} ni raabsa${extra})`,
    postDayWinnerBtn: '🪑 Poost Deey (Hundi fudhatanii teessoo filatu)',
    backToLobbyResetBtn: 'Gara Galmaatti Deebi\'i',
    resumeBannerTitle: 'Taphni Raaminoo Jiru Jira!',
    resumeBannerSub: (stake: number, secs: number) => `🪙 ${stake} ETB • Yeroon osoo hin dhumiin itti deebi\'uu dandeessa (⏳ ${secs}s)`,
    resumeReturnBtn: '▶️ Gara Taphaatti Deebi\'i',
    resumeForfeitBtn: 'Tapha Dhiisi',
    notifySavedCanReturn: '⏳ Taphni kee banaadha — yeroon osoo hin dhumiin deebi\'uu dandeessa!',
    postDayModalTitle: 'Poost Deey — Gaaffii Jijjiirraa Teessoo',
    postDayModalDesc: (name: string) => `${name} Poost Deey gaafateera — hundi kaardii 1 fudhatanii ol\'aanaan dursa teessoo filata`,
    acceptedBadge: '✓ Fudhatameera',
    waitingAcceptBadge: '⏳ Eegaa jira...',
    acceptPostDayBtn: '✓ Gaaffii Fudhadhu',
    closeBtn: 'Cufi',
    allAcceptedPostDay: '✅ Hundi fudhataniiru! Kaardiin filannoo teessoo raabsamaa jira...',
    waitingAllPostDay: '⏳ Hundi akka fudhatan eegaa jira...',
    postDayPickTitle: (seats: number) => `🪑 Poost Deey — Filannoo Teessoo (Taphattoota ${seats})`,
    postDayPickYourTurn: '🎯 Dabaree keeti — teessoo barbaaddu gadi irraa filadhu!',
    postDayPickOtherTurn: (name: string) => `⏳ Amma ${name} teessoo filachaa jira...`,
    postDayPickDone: '✅ Hundi teessoo filataniiru! Gara gabatee seenaa jira...',
    postDaySeatLabel: (n: number) => `Teessoo #${n}`,
    postDayPickOpenSeat: 'Teessoo Banaa (Filadhu)',
    rulesModalTitle: 'Seera SUN Raaminoo',
    understoodCloseBtn: 'Hubadheera',
    rule1Title: '1. Sa\'aatii (Sekondii 90 + Sekondii 30 of eeggannoo)',
    rule1Desc: 'Taphataan kaardii yoo gatu sekondii 90 keessatti harkisuu qabda; yoo darbe sekondii 30 of eeggannoo booda ni dhorkamta.',
    rule2Title: '2. Bu\'uu (Qabxii 41) fi Kaardii gatame kaasuun',
    rule2Desc: 'Bu\'uuf yoo xiqqaate qabxii 41 garee sirriidhaan qabaachuu qabda. Osoo hin bu\'iin kaardii gatame yoo kaaste bu\'uu ykn deebisuu qabda.',
    rule3Title: '3. Kaardii Jalaa, Jookera fi Dooppey',
    rule3Desc: 'Kaardiiwwan hunda gareedhaan qabattee kaardii jalaa qofa yoo si hafe ifa warqee ibsa. Jookeraan yoo xumurte 2x (injifannoo 3 booda 3x); Cimdii 5 + 1 tiriis 2x yoo jookeraan cufame 3x kenna.',
    rule4Title: '4. Kaardii Tokko Gatuu',
    rule4Desc: 'Marsaa tokko keessatti kaardii tokko qofa gatuun danda\'ama. Kaardii gabatee irratti galu gatuun hin danda\'amu.',
    rule5Title: '5. Yeroo tuutaan dhumu',
    rule5Desc: 'Kaardiiwwan gataman walitti makamanii tuutaa haaraa ta\'u.',
    rule6Title: '6. Poost Deey',
    rule6Desc: 'Gabatee dhuunfaa irratti tapha 5 booda waliigalteen teessoon haaraa kennamuu danda\'a.',
    roomPrefix: 'Kutaa #',
    currencyUnit: 'ETB',
    notifyMicUnsupported: '❌ Meeshaan kun maayikiroofoonii hin deeggaru.',
    notifyMicDenied: '❌ Hayyamni maayikiroofoonii hin kennamne!',
    notifyMicOpened: '🎙️ Maayikiroofooniin banameera — hiriyoonni si dhaga\'uu danda\'u!',
    notifyStreakResetLeft: '⚠️ Taphataan gabatee irraa waan baheef walitti aansiin 0 irratti deebi\'e!',
    notifyPostDayAsked: (req: string) => `🪑 ${req} Poost Deey gaafateera!`,
    notifyAdminClosedRoom: '🛡️ Bulchaan kutaa dhuunfaa kana cufeera.',
    notifyAdminResetGame: '🔄 Bulchaan tapha haaraa jalqabeera.',
    notifyJoinLookupErr: 'Kutaan koodii kanaan uumame hin argamne.',
    notifyRoomExpired: (name: string, refund: number) => `⏰ ${name} yeroon isaa waan xumurameef cufameera; ${refund} ETB deebi\'eera!`,
    notifyDealerStarted: (dealer: string) => `👑 ${dealer} (Raabsaa • Kaardii 14) gatuudhaan jalqaba!`,
    notifyDealerFirstDiscard: (dealer: string) => `👑 ${dealer} (Kaardii 14 fudhatteetta) — kaardii 1 gatuun tapha jalqabi!`,
    discardSlotLabel: 'Gataa',
    notifyDealtSelf: 'Kaardiin raabsameera! Tuutaa ykn gatame irraa harkisi.',
    notifyDealerOpp: (dealer: string) => `👑 ${dealer} (Kaardii 14) gatuun jalqaba!`,
    notifyYourTurnStart: (dealer: string) => `👑 ${dealer} raabseera! Dabaan kan keeti.`,
    notifyWarning30s: '⚠️ Of eeggannoo sekondii 30! Kaardii yoo hin harkisne ni dhorkamta!',
    notifyBottomNotReady: 'Kaardiin jalaa ammallee qophii miti.',
    winBottomJokerDopey: (s: string) => `👑 Golden jookera jalaa (${s}) dhaan injifate! (3x)`,
    winBottomDopey: (c: string) => `🔥 Dooppey / Monte kaardii jalaa (${c}) dhaan injifate! (2x)`,
    winBottomNormal: (c: string) => `🏆 Kaardii jalaa (${c}) dhaan injifate!`,
    notifyReshuffled: '🔄 Tuutaan waan dhumeef kaardiiwwan walitti makamaniiru!',
    notifyPostDayApplied: '🪑 Hundi teessoo haaraa filataniiru!',
    notifyInsufficientNext: '❌ Marsaa itti aanuuf hafteen qarshii hin ga\'u!',
    notifyWaitTurn: 'Mee dabaree kee eegi!',
    notifyAlreadyDrawn: 'Dursee kaardii harkisteetta; kan gattu filadhu!',
    notifyDeckEmpty: 'Tuutaa fi bakki gataa duwwaa ta\'eera!',
    notifyCardDrawn: (c: string) => `Kaardii ${c} harkisteetta! Yoo xumurte kaardii 1 gati.`,
    notifyDiscardPickedNeedMeld: (c: string) => `Kan gatame ${c} kaasteetta! Jalqaba bu\'i ykn "Deebisi" tuqi.`,
    notifyDiscardPickedFree: (c: string) => `Kan gatame ${c} kaasteetta! Erga buutee booda akka barbaadde taphadhu.`,
    notifyReturnedDiscard: (c: string) => `Kaardii ${c} deebi\'eera; amma tuutaa irraa harkisi.`,
    notifyMeldTurnOnly: 'Dabaree kee qofa irratti bu\'i!',
    notifyMeldNeed41: (pts: number) => `Bu\'uuf yoo xiqqaate qabxii 41 barbaachisa! (${pts}/41)`,
    notifyMeldedOk: (pts: number) => `✨ Gaariidha! Qabxii ${pts} n buuteetta.`,
    notifyLayoffBeforeMeld: '🚫 Osoo hin bu\'iin galchuun hin danda\'amu! Jalqaba qabxii 41 n bu\'i!',
    notifySetFull4: 'Tiriisiin kun duraanuu kaardii 4 guuteera!',
    notifyNoMoreJokersRun: 'Kaatriisii kana irratti jookera dabalataa dabaluun hin danda\'amu!',
    notifyJokerLaidOff: '🃏 Jookeriin kaardiiwwan bu\'an irratti galfameera!',
    notifyJokerSwapped: '✨ Jookera kaardii sirriidhaan jijjiirtee fudhatteetta!',
    notifyMismatchGroup: 'Kaardiin kun garee kana waliin hin galu!',
    notifyCardLaidOff: (c: string) => `Kaardii ${c} gara gabateetti galfameera!`,
    notifyNeedSwapNatural: (lbl: string) => `Jookera kana jijjiiruuf ${lbl} harka kee keessa qabaachuu qabda!`,
    winTitleDopeyJoker: '👑 Golden Injifate! (3x)',
    winTitleDopey: '🔥 Dooppey / Monte Injifate! (2x)',
    winTitleJokerFinish: '🃏 Dooppey / Monte Jookeraan Injifate! (2x)',
    winTitleStreakJoker: (n: number) => `👑 Golden (Injifannoo ${n}ffaa Jookeraan)! (3x)`,
    winTitleStreak: (n: number) => `🔥 Dooppey / Monte (Injifannoo ${n}ffaa)! (2x)`,
    winTitleNormal: '🎉 Baga Gammaddan! Injifattaniittu!',
    winTitleTimeout: '🏆 Mormitoonni keessan yeroo kennameef sirnaan waan hin fayyadamneef isin injifataa tapha kanaa taataniittu!',
    loseTitleTimeout: (w: string) => `⏳ Yeroon taphaa waan dhumeef ${w} injifataa ta\'eera!`,
    loseTitle: (w: string, mult?: number) =>
      mult && mult >= 3
        ? `😔 ${w} Golden (3x) injifateera!`
        : mult === 2
        ? `😔 ${w} Dooppey / Monte (2x) injifateera!`
        : `😔 ${w} marsaa kana injifateera!`,
    notifyYourTurnFull: 'Dabaree keeti! (Sekondii 90 yaaduu + sekondii 30 of eeggannoo)',
    notifyOppMelded: (name: string, pts: number) => `${name} qabxii ${pts} n bu\'eera!`,
    notifyAlreadyDiscarded: '🚫 Marsaa kana keessatti dursee kaardii gatteetta!',
    notifyNotYourTurn: 'Dabaree kee miti; mee eegi!',
    notifyMustDrawFirst: 'Gatuu kee dura jalqaba kaardii harkisi!',
    notifyMustMeldOrReturn: '🚫 Kaardii gatame waan kaasteef bu\'i ykn "Deebisi" tuqi!',
    notifyIllegalMatchingDiscard: '🚫 Kaardii garee gabatee waliin galu gatuun hin danda\'amu!',
    notifyDiscarded: (c: string) => `Kaardii ${c} gatameera! Dabareen xumurameera.`,
    notifyAutoSorted: 'Tiriisii fi kaatriisii tartiibaan dura kaa\'amaniiru!',
    notifyCardReordered: 'Kaardiin bakka barbaaddetti kaa\'ameera!',
    notifyInsufficientStake: (s: number) => `❌ Hafteen qarshii keetii hin ga\'u (${s} ETB barbaachisa)!`,
    notifyRoomCreated: (n: number, s: number) => `Kutaa #${n} uumameera! (${s} ETB qabameera)`,
    notifyRoomCancelled: (name: string, s: number) => `✅ ${name} haqameera; ${s} ETB gara waaleetii keetii deebi\'eera!`,
    notifyInsufficientJoin: (s: number) => `❌ Seenuuf ${s} ETB waaleetii keessa jiraachuu qaba!`,
    notifyInviteCopied: 'Liinkii fi koodiin afeerraa waraabameera!',
    notifyLinkCopied: 'Liinkiin afeerraa waraabameera!',
    notifyInsufficientWallet: '❌ Hafteen qarshii keetii hin ga\'u!',
    notifyEnterValidCode: 'Mee koodii kutaa sirrii galchi!',
    notifyRoomFull: 'Kutaan guuteera!',
    notifyJoinedPrivateCode: (code: string) => `🎉 Koodii ${code} n kutaa dhuunfaa seenteetta!`,
    settingsBtn: 'Qindaa\'ina',
    rulesBtn: 'Seera',
    settingsTitle: 'Qindaa\'ina Raaminoo',
    languageSettingLabel: 'Afaan Filadhu',
    soundFxLabel: 'Sagalee Kaardii fi Injifannoo',
    soundOn: 'Banaa',
    soundOff: 'Cufaa',
    tableColorLabel: 'Bifa Gabatee',
    themeEmerald: 'Magariisa',
    themeMahogany: 'Magaala',
    themeMidnight: 'Cuquliisa Halkanii',
    groupHintsLabel: 'Gareewwan uumaman halluun agarsiisi',
    groupHintsDesc: 'Tiriisii fi kaatriisii harka kee keessaa sararaan adda baasa',
    landscapeLockLabel: 'Iskiriinii Dalga Naannessi',
    landscapeLockDesc: 'Yeroo taphni jalqabu iskiriinii ofumaan bal\'isa',
    openRulesFromSettings: 'Seera Raaminoo Guutuu Ilaali',
    backToHomeHubBtn: 'Gara Fuula Jalqabaatti Deebi\'i',
    rulesQuickValuesTitle: 'Qabxii Kaardiiwwanii',
    rulesValNum: '2 – 10 = Qabxii lakkoofsa isaa',
    rulesValFace: 'J, Q, K = Qabxii 10',
    rulesValAce: 'A = Qabxii 11 (Q-K-A ykn tiriisii) / Qabxii 1 (A-2-3)',
    rulesValJoker: '🃏 Jookeraa = Kaardii barbaachisu hunda bakka bu\'a',
    rulesExamplesTitle: 'Fakkeenya Bu\'uu Sirrii',
    rulesTrisLabel: 'Tiriisii (Lakkoofsa tokko • Mallattoo garaagaraa)',
    rulesCatrisLabel: 'Kaatriisii (Walitti aanu • Mallattoo tokko)',
    rulesProTipTitle: 'Gorsa Gaarii',
    rulesProTipBody: 'Kaardiiwwan harkisanii bakka barbaadan kaa\'uu ykn "Tartiibsi" tuquun saffisaan qopheessuu dandeessu!',
    rulesBadgeQuick: 'Qajeelfama Salphaa',
    rulesWinMultiTitle: '7. Injifannoo Walitti Aanu fi Raabsaa',
    rulesWinMultiDesc: 'Namni injifate marsaa itti aanu ni raabsa. Gabatee tokkorratti yeroo 3 walitti aansitee yoo moote hanga mootamutti dachaa 2x argatta.',
    shareTelegramLabel: 'Telegram dhaan Ergi',
    shareWhatsappLabel: 'WhatsApp dhaan Ergi',
    inviteTextHeader: '🎮 Afeerraa Kutaa Dhuunfaa SUN Raaminoo!',
    notifyDopeyHoldGolden: '✨ Cimdii 5 + Tiriisii 1 qabatteetta! Jookera (Golden 3x) eeggachuu ykn dabaree keetti "Dooppey" cufuu dandeessa.',
    winnerCardsHeader: '🃏 Kaardiiwwan Injifataa',
    winnerCardsTrustNote: 'Amantaa taphattootaaf gabatee irratti mul\'ateera',
    winnerGroupPair: 'Cimdii',
    winnerGroupTris: 'Tiriisii',
    winnerGroupCatris: 'Kaatriisii',
    winnerGroupClosing: 'Cufaa',
    viewTableCardsBtn: '👁️ Gabatee Ilaali',
    openWinSummaryBtn: '🏆 Bu\'aa Bani',
  },
  en: {
    brandTitle: 'SUN Ramino',
    brandSub: 'SUN Ramino Lobby',
    exitBtn: 'Exit',
    backBtn: 'Back',
    rulesTooltip: 'Rules',
    playersCardLabel: 'Players',
    liveStreamSub: 'Live Online',
    openRoomsCardLabel: 'Open Rooms',
    activeRoomsSub: 'Active Tables',
    balanceCardLabel: 'Balance',
    walletSub: 'Wallet',
    depositShort: 'Deposit',
    withdrawShort: 'Withdraw',
    openWalletBtn: 'Wallet (Deposit & Withdraw)',
    openRoomsHeader: (count: number) => `Open Rooms (${count})`,
    refreshBtn: 'Refresh',
    roomsRefreshed: 'Rooms list refreshed!',
    noOpenRooms: 'No open rooms yet; create a new table below!',
    yoursTag: 'Yours',
    playersWord: 'Players',
    oneDeckShort: '1 Deck',
    twoDecksShort: '2 Decks',
    oneDeckDesc: '1 Deck (54 Cards)',
    twoDecksDesc: '2 Decks (108 Cards)',
    cancelRefundBtn: 'Cancel & Refund',
    cancelRefundTip: 'Cancel room and refund stake',
    startBtn: 'Start',
    joinBtn: 'Join',
    choosePlayersLabel: 'Choose Number of Players:',
    seatOptionLabel: (n: number) => `${n} Players`,
    seatDeckLabel: (cards: number) => `${cards} Cards`,
    stakeLabel: 'Enter or Select Stake Amount (ETB):',
    stakePlaceholder: 'Enter stake amount (e.g. 250)',
    createRoomBtn: (stake: number, seats: number) => `Create Room (${stake} ETB | ${seats} Players)`,
    privateRoomBtn: 'Private Room',
    joinByCodeBtn: 'Join by Code',
    micOpen: 'Mic Open',
    micOpenBtn: 'Open Mic',
    deafenOpenTip: 'Audio muted — unmute',
    deafenMuteTip: 'Mute friends audio',
    voiceStageBtn: 'Voice Stage',
    voiceStageTitle: 'Private Voice Stage',
    voiceE2eeBadge: '🔒 E2EE Encrypted',
    voiceHdBadge: 'HD 48kHz Studio',
    voiceHoldToTalk: 'Hold to Talk',
    voiceReleaseToMute: 'Release to Mute',
    voiceTapToSpeak: 'Open Mic',
    voiceMicLive: 'Speaking Live',
    voiceMutePeer: 'Mute User',
    voiceUnmutePeer: 'Unmute User',
    voiceSpeakingNow: 'Speaking',
    voiceListening: 'Listening',
    voiceUntappableNote: 'Peer-to-peer voice encrypted with DTLS-SRTP — neither admins nor outsiders can tap into this room.',
    voiceParticipantsLabel: 'Participants on Stage',
    ceremonyTitle: (seats: number) => `Who Deals First? High Card (${seats} Players • ${seats} Cards)`,
    dealerBadge: 'DEALER 👑',
    ceremonyWinnerBanner: (dealer: string, cardStr: string) => `👑 ${dealer} Deals First • ${cardStr} — Entering Table...`,
    ceremonyRevealing: (curr: number, total: number) => `Revealing cut cards sequentially... (${curr}/${total})`,
    streakLabel: (n: number) => `🔥 ${n} Win Streak${n >= 3 ? ' • 2x Active' : ' (3=2x)'}`,
    roundWord: 'Round',
    postDayBtn: '🪑 Post Day',
    postDayTip: 'After 5 rounds, ask everyone to accept new seats (Post Day)',
    meldedBadge: 'Down',
    cardWord: 'Cards',
    cardsWord: 'Cards',
    bottomCardTip: (cardStr: string) => `Bottom Card (${cardStr})`,
    drawDeckTip: 'Draw Deck',
    discardPileTip: 'Pick up top discard card',
    closedSetsTip: 'Closed 4-card sets',
    hereMarker: '▼ Here',
    dopeyBtn: '👑 Dopey / Monte • 2x',
    dopeyJokerBtn: '👑 Golden • 3x',
    meldBtn: (pts: number) => `Meld • ${pts}`,
    sortBtn: 'Sort',
    returnBtn: 'Return',
    discardLockedBtn: 'Discard (Meld/Return)',
    discardBtn: 'Discard',
    bannedTitle: 'Removed From Table!',
    bannedDesc: 'You did not draw within the 90s turn timer and 30s warning, so you have been removed from the table.',
    bannedSpectatorDesc: 'Your turn timer and warning expired, so you are suspended for this round. You can stay at the table and watch the remaining players live!',
    watchGameBtn: '👁️ Watch Game Live',
    suspendedBadge: 'Suspended',
    spectatorBanner: '🚫 Your turn time expired — you are suspended for this round and watching live 👁️',
    notifyPlayerSuspended: (name: string) => `🚫 ${name} timed out and is now watching as a spectator.`,
    backToLobbyBtn: 'Back to Lobby',
    privateModalTitle: 'Create Private Room',
    chooseFriendsStep: '1. Select Number of Friends:',
    seatSummary: (seats: number, friends: number) => `${seats} Players (${friends} Friends)`,
    seatPersonCount: (seats: number) => `${seats} Seats`,
    friendSingle: '1 Friend',
    friendPlural: (f: number) => `${f} Friends`,
    roomCodeStep: '2. Room Code:',
    newCodeBtn: 'New Code',
    copiedBtn: 'Copied',
    copyCodeBtn: 'Copy Code',
    inviteLinkStep: '3. Invite Link (Telegram / WhatsApp):',
    copyLinkBtn: 'Copy Link',
    sendTelegramBtn: 'Send Telegram',
    sendWhatsappBtn: 'Send WhatsApp',
    shareFullInviteBtn: 'Share Full Invite',
    joinedFriendsHeader: (curr: number, max: number) => `Joined Friends (${curr}/${max})`,
    voiceChannelReady: 'Private Voice Channel Ready',
    waitingFriendSlot: (idx: number) => `Waiting for Friend #${idx}...`,
    privateStakeStep: '2. Private Room Stake (ETB):',
    waitingRoomTitle: (priv: boolean) => (priv ? 'Private Room Waiting Area' : 'Table Waiting Room'),
    waitingPlayersNeeded: 'At least 2 real players must join to start the match',
    waitingHostStartBtn: (stake: number, curr: number) => `▶️ Start Now (${curr} Players • ${stake} ETB)`,
    waitingForHostMsg: 'Game starts automatically once friends join or host starts...',
    cancelLeaveRefundBtn: 'Leave & Refund Stake',
    startPrivateRoomBtn: (stake: number, seats: number) => `Start Room (${stake} ETB • ${seats} Players)`,
    joinModalTitle: 'Join by Code or Invite Link',
    enterCodeLabel: 'Enter Room Code:',
    codePlaceholder: 'e.g. RAMINO-7714',
    hostLabel: 'Host:',
    playersLabel: 'Players:',
    voiceLabel: 'Voice:',
    joinRoomSubmit: (preview: { stake: number; maxPlayers: number } | null) =>
      preview ? `Join (${preview.stake} ETB • ${preview.maxPlayers} Seats)` : 'Join Room',
    potAmountLabel: 'Total Pot:',
    rakeLabel: 'House Commission (10%):',
    dopeyMultLabel: 'Dopey / Monte (2x):',
    goldenMultLabel: '👑 Golden (3x):',
    penaltyDeductedLabel: '💸 Deducted From Wallet:',
    jokerFinishMultLabel: '🃏 Dopey / Monte (Joker):',
    streakMultLabel: (n: number) => `🔥 Win Streak (${n}):`,
    streakTimes: (m: number) => `${m}x (${m >= 3 ? 'Golden' : 'Dopey / Monte'})`,
    streakProgress: (n: number) => `🔥 Win Streak: ${n}/3 (After 3 wins, Joker finish pays Golden 3x!)`,
    netWonLabel: 'Net Winnings:',
    nextDealerLabel: '👑 Next Round Dealer:',
    nextRoundBtn: (dealer: string, extra: string) => `🔄 Start Next Round (${dealer} deals${extra})`,
    postDayWinnerBtn: '🪑 Post Day (All Accept & Pick Seats)',
    backToLobbyResetBtn: 'Back to Lobby',
    resumeBannerTitle: 'Active Ramino Game Found!',
    resumeBannerSub: (stake: number, secs: number) => `🪙 ${stake} ETB • Return to your active table before time expires (⏳ ${secs}s)`,
    resumeReturnBtn: '▶️ Return to Game',
    resumeForfeitBtn: 'Leave Table',
    notifySavedCanReturn: '⏳ Your game stays open — you can return before the timer runs out!',
    postDayModalTitle: 'Post Day — Reseat Request',
    postDayModalDesc: (name: string) => `${name} requested Post Day — all players draw 1 card and pick seats from highest to lowest`,
    acceptedBadge: '✓ Accepted',
    waitingAcceptBadge: '⏳ Waiting...',
    acceptPostDayBtn: '✓ Accept Request',
    closeBtn: 'Close',
    allAcceptedPostDay: '✅ Everyone accepted! Dealing seat-pick cut cards...',
    waitingAllPostDay: '⏳ Waiting for all players to accept...',
    postDayPickTitle: (seats: number) => `🪑 Post Day — Seat Selection (${seats} Players)`,
    postDayPickYourTurn: '🎯 Your Turn — Choose your seat below!',
    postDayPickOtherTurn: (name: string) => `⏳ ${name} is choosing a seat...`,
    postDayPickDone: '✅ All seats chosen! Returning to table...',
    postDaySeatLabel: (n: number) => `Seat #${n}`,
    postDayPickOpenSeat: 'Open Seat (Pick)',
    rulesModalTitle: 'SUN Ramino Rules',
    understoodCloseBtn: 'Got It',
    rule1Title: '1. Turn Timer (90s + 30s Warning)',
    rule1Desc: 'Once the previous player discards, you have 90s to think plus a 30s red warning. Failing to draw removes you from the table.',
    rule2Title: '2. Opening Meld (41 Points) & Discard Pickup',
    rule2Desc: 'Your opening meld must total at least 41 points in valid sets or runs. If you pick up from the discard pile before your opening meld, you must either meld immediately or return it before discarding.',
    rule3Title: '3. Bottom Card, Joker Finish & Dopey Payouts',
    rule3Desc: 'If you have not melded and all remaining cards form complete melds/Dopey only with the Bottom Card, it glows gold — tap it to win! Closing by discarding a Joker pays 2x (3x after 3 consecutive wins). Dopey (5 pairs + 1 set) pays 2x, or 3x when closed with a Joker.',
    rule4Title: '4. Single Discard & No Matching Discard',
    rule4Desc: 'Discard exactly 1 card per turn. You cannot discard a card that cleanly lays off onto an existing table meld.',
    rule5Title: '5. When the Deck Runs Out',
    rule5Desc: 'Discarded cards are reshuffled into a fresh draw deck as many times as needed until someone wins.',
    rule6Title: '6. Post Day',
    rule6Desc: 'Seats remain fixed on private tables across games. After 5 games, any player can propose Post Day to reshuffle all seats.',
    roomPrefix: 'Room #',
    currencyUnit: 'ETB',
    notifyMicUnsupported: '❌ Microphone access is not supported on this browser.',
    notifyMicDenied: '❌ Microphone permission denied! Please allow microphone access.',
    notifyMicOpened: '🎙️ Microphone opened — your friends can hear you now!',
    notifyStreakResetLeft: '⚠️ A player left the table, so win streak reset to 0!',
    notifyPostDayAsked: (req: string) => `🪑 ${req} requested Post Day (New Seats)!`,
    notifyAdminClosedRoom: '🛡️ Admin closed this Private Room.',
    notifyAdminResetGame: '🔄 Admin reset the game.',
    notifyJoinLookupErr: 'No private room found for that code — please check the code or link.',
    notifyRoomExpired: (name: string, refund: number) => `⏰ ${name} expired and closed; ${refund} ETB refunded to your wallet!`,
    notifyDealerStarted: (dealer: string) => `👑 ${dealer} (Dealer • 14 cards) opens by discarding!`,
    notifyDealerFirstDiscard: (dealer: string) => `👑 ${dealer} (14 cards dealt) — discard 1 card to start play!`,
    discardSlotLabel: 'Discard',
    notifyDealtSelf: 'Cards dealt! Draw from the deck or discard pile.',
    notifyDealerOpp: (dealer: string) => `👑 ${dealer} (14 cards) opens by discarding!`,
    notifyYourTurnStart: (dealer: string) => `👑 ${dealer} dealt! It is your turn.`,
    notifyWarning30s: '⚠️ 30s Warning! Draw a card now or you will be removed!',
    notifyBottomNotReady: 'Bottom card win condition is not complete yet.',
    winBottomJokerDopey: (s: string) => `👑 Golden Bottom Joker Win (${s})! (3x)`,
    winBottomDopey: (c: string) => `🔥 Dopey / Monte Bottom Card Win (${c})! (2x)`,
    winBottomNormal: (c: string) => `🏆 Bottom Card Finisher Win (${c})!`,
    notifyReshuffled: '🔄 Deck ran out — discard pile reshuffled into a fresh deck!',
    notifyPostDayApplied: '🪑 All players selected their new seats!',
    notifyInsufficientNext: '❌ Insufficient balance for next round!',
    notifyWaitTurn: 'Please wait for your turn!',
    notifyAlreadyDrawn: 'You already drew a card — choose 1 card to discard!',
    notifyDeckEmpty: 'Both deck and discard pile are empty!',
    notifyCardDrawn: (c: string) => `Drew ${c}! Discard 1 card when ready.`,
    notifyDiscardPickedNeedMeld: (c: string) => `Picked up ${c}! You must either Meld or click Return first.`,
    notifyDiscardPickedFree: (c: string) => `Picked up ${c}! Play freely since you already melded.`,
    notifyReturnedDiscard: (c: string) => `Returned ${c} to the discard pile; now draw from the deck.`,
    notifyMeldTurnOnly: 'You can only meld on your own turn!',
    notifyMeldNeed41: (pts: number) => `You need at least 41 points in valid sets or runs to open! (${pts}/41)`,
    notifyMeldedOk: (pts: number) => `✨ Great meld! Opened with ${pts} points.`,
    notifyLayoffBeforeMeld: '🚫 You must complete your 41-point opening meld before laying off cards!',
    notifySetFull4: 'This set already has 4 cards!',
    notifyNoMoreJokersRun: 'Cannot add another Joker to this run!',
    notifyJokerLaidOff: '🃏 Joker laid off onto table meld!',
    notifyJokerSwapped: '✨ Swapped the Joker for the matching natural card!',
    notifyMismatchGroup: 'This card does not fit that meld group!',
    notifyCardLaidOff: (c: string) => `Card ${c} laid off onto the table!`,
    notifyNeedSwapNatural: (lbl: string) => `You must hold ${lbl} in your hand to swap this Joker!`,
    winTitleDopeyJoker: '👑 Golden Winner! (3x)',
    winTitleDopey: '🔥 Dopey / Monte Winner! (2x)',
    winTitleJokerFinish: '🃏 Dopey / Monte (Joker Finish)! (2x)',
    winTitleStreakJoker: (n: number) => `👑 Golden (${n}th Win Streak + Joker)! (3x)`,
    winTitleStreak: (n: number) => `🔥 Dopey / Monte (${n} Win Streak)! (2x)`,
    winTitleNormal: '🎉 Congratulations! You Won!',
    winTitleTimeout: '🏆 Other players did not use their turn time, so you are the Winner of this round!',
    loseTitleTimeout: (w: string) => `⏳ Turn time expired for remaining players — ${w} won the round!`,
    loseTitle: (w: string, mult?: number) =>
      mult && mult >= 3
        ? `😔 ${w} won Golden (3x)!`
        : mult === 2
        ? `😔 ${w} won Dopey / Monte (2x)!`
        : `😔 ${w} won this round!`,
    notifyYourTurnFull: 'Your turn! (90s timer + 30s warning)',
    notifyOppMelded: (name: string, pts: number) => `${name} melded ${pts} points!`,
    notifyAlreadyDiscarded: '🚫 You already discarded this turn!',
    notifyNotYourTurn: 'Not your turn yet — please wait!',
    notifyMustDrawFirst: 'Draw from the deck or discard pile before discarding!',
    notifyMustMeldOrReturn: '🚫 Since you picked up the discard before melding, you must Meld or click Return!',
    notifyIllegalMatchingDiscard: '🚫 Illegal discard! That card lays off onto an existing table meld.',
    notifyDiscarded: (c: string) => `Discarded ${c}! Turn ended.`,
    notifyAutoSorted: 'Valid sets and runs sorted to the front!',
    notifyCardReordered: 'Card moved to your chosen position!',
    notifyInsufficientStake: (s: number) => `❌ Insufficient balance (${s} ETB required)!`,
    notifyRoomCreated: (n: number, s: number) => `Room #${n} created! (${s} ETB reserved; cancel anytime before start)`,
    notifyRoomCancelled: (name: string, s: number) => `✅ ${name} cancelled; ${s} ETB refunded to your wallet!`,
    notifyInsufficientJoin: (s: number) => `❌ You need ${s} ETB in your wallet to join!`,
    notifyInviteCopied: 'Invite link & code copied! Share with friends.',
    notifyLinkCopied: 'Invite link copied!',
    notifyInsufficientWallet: '❌ Insufficient wallet balance!',
    notifyEnterValidCode: 'Please enter a valid room code!',
    notifyRoomFull: 'Room is full!',
    notifyJoinedPrivateCode: (code: string) => `🎉 Joined Private Room ${code}!`,
    settingsBtn: 'Settings',
    rulesBtn: 'Rules',
    settingsTitle: 'Ramino Settings',
    languageSettingLabel: 'Select Language',
    soundFxLabel: 'Card & Victory Sound FX',
    soundOn: 'On',
    soundOff: 'Off',
    tableColorLabel: 'Table Felt Theme',
    themeEmerald: 'Emerald Felt',
    themeMahogany: 'Royal Mahogany',
    themeMidnight: 'Midnight Blue',
    groupHintsLabel: 'Highlight Formed Melds in Hand',
    groupHintsDesc: 'Marks ready sets and runs in your hand with a glowing top accent',
    landscapeLockLabel: 'Auto-Rotate Landscape',
    landscapeLockDesc: 'Expands table horizontally for comfortable mobile card play',
    openRulesFromSettings: 'View Full Ramino Rules',
    backToHomeHubBtn: 'Exit to Game Hub',
    rulesQuickValuesTitle: 'Card Point Values',
    rulesValNum: '2 – 10 = Face Value Points',
    rulesValFace: 'J, Q, K = 10 Points Each',
    rulesValAce: 'A = 11 Points (Q-K-A or Set) / 1 Point (A-2-3)',
    rulesValJoker: '🃏 Joker = Substitutes Any Missing Card',
    rulesExamplesTitle: 'Valid Meld Examples',
    rulesTrisLabel: 'Set (Same Rank • Different Suits)',
    rulesCatrisLabel: 'Run (Consecutive Ranks • Same Suit)',
    rulesProTipTitle: 'Pro Tip',
    rulesProTipBody: 'Drag and drop cards anywhere in your hand, or tap "Sort" to automatically group sets and runs up front!',
    rulesBadgeQuick: 'Player Guide',
    rulesWinMultiTitle: '7. Win Streak & Dealer Rotation',
    rulesWinMultiDesc: 'Each round winner deals the next round. Winning 3 games in a row at the same table activates 2x payouts until defeated (resets if a player leaves).',
    shareTelegramLabel: 'Send via Telegram',
    shareWhatsappLabel: 'Send via WhatsApp',
    inviteTextHeader: '🎮 SUN Ramino Private Table Invite!',
    notifyDopeyHoldGolden: '✨ Holding 5 Pairs + 1 Set! You can draw for Golden (3x) or tap Dopey anytime on your turn.',
    winnerCardsHeader: '🃏 Winner\'s Revealed Cards',
    winnerCardsTrustNote: 'Shown on the table for full player fairness & trust',
    winnerGroupPair: 'Pair',
    winnerGroupTris: 'Set',
    winnerGroupCatris: 'Run',
    winnerGroupClosing: 'Close',
    viewTableCardsBtn: '👁️ View on Table',
    openWinSummaryBtn: '🏆 Show Summary',
  },
};

/* ========================================================
   3. MAIN MODERN RAMINO GAME COMPONENT
   ======================================================== */
export const ModernRaminoGame: React.FC<ModernRaminoGameProps> = ({
  language = 'am',
  onChangeLanguage,
  sharedUsers,
  onUpdateSharedUsers,
  onBackToLobby,
  onOpenWallet,
  onRecordWalletTx,
}) => {
  const t = RAMINO_T[language] || RAMINO_T.am;
  // Navigation Flow: 1. Lobby -> (Optional Waiting) -> 2. Dealer Cut Ceremony -> 3. Game / PostDay Seat Pick
  const [view, setView] = useState<'lobby' | 'waiting' | 'ceremony' | 'postday_pick' | 'game'>('lobby');
  useEffect(() => {
    applyTelegramSwipeLock();
    scrollAppToTop();
  }, [view]);
  const [tableTheme, setTableTheme] = useState<TableTheme>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sun_ramino_table_theme');
      if (saved === 'emerald' || saved === 'mahogany' || saved === 'midnight') return saved;
    }
    return 'emerald';
  });
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sun_ramino_sound_enabled') !== 'false';
    }
    return true;
  });
  const [showGroupHints, setShowGroupHints] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sun_ramino_group_hints') !== 'false';
    }
    return true;
  });

  useEffect(() => {
    raminoAudio.setMuted(!soundEnabled);
    try {
      localStorage.setItem('sun_ramino_sound_enabled', String(soundEnabled));
    } catch {}
  }, [soundEnabled]);

  useEffect(() => {
    try {
      localStorage.setItem('sun_ramino_table_theme', tableTheme);
    } catch {}
  }, [tableTheme]);

  useEffect(() => {
    try {
      localStorage.setItem('sun_ramino_group_hints', String(showGroupHints));
    } catch {}
  }, [showGroupHints]);

  // Screen Orientation & Exact Viewport Detection: Automatically forces Landscape in Ceremony & Game with zero clipping!
  const [viewportSize, setViewportSize] = useState<{ w: number; h: number }>(() => {
    if (typeof window !== 'undefined') {
      return {
        w: window.visualViewport?.width ?? window.innerWidth,
        h: window.visualViewport?.height ?? window.innerHeight,
      };
    }
    return { w: 1024, h: 768 };
  });
  const isPortrait = viewportSize.h > viewportSize.w;
  const [forceLandscapeRotate, setForceLandscapeRotate] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sun_ramino_landscape_lock') !== 'false';
    }
    return true;
  });

  useEffect(() => {
    try {
      localStorage.setItem('sun_ramino_landscape_lock', String(forceLandscapeRotate));
    } catch {}
  }, [forceLandscapeRotate]);

  useEffect(() => {
    const handleResize = () => {
      if (typeof window !== 'undefined') {
        const w = Math.round(window.visualViewport?.width ?? window.innerWidth);
        const h = Math.round(window.visualViewport?.height ?? window.innerHeight);
        setViewportSize({ w, h });
      }
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    window.visualViewport?.addEventListener('resize', handleResize);
    handleResize();
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      window.visualViewport?.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    if (view === 'game' || view === 'ceremony' || view === 'postday_pick') {
      if (typeof screen !== 'undefined' && 'orientation' in screen && (screen.orientation as any)?.lock) {
        try {
          (screen.orientation as any).lock('landscape').catch(() => {});
        } catch {}
      }
    }
  }, [view]);

  const shouldRotateToLandscape =
    isPortrait && forceLandscapeRotate && (view === 'game' || view === 'ceremony' || view === 'postday_pick');
  const modalMaxHeightPx = shouldRotateToLandscape ? Math.max(220, viewportSize.w - 20) : undefined;

  // Player Profile & Balance
  const player = sharedUsers?.[0];
  const balance = player?.balance ?? 500;
  const playerName = player?.name || 'Sun Player';
  const playerPhone = player?.phone?.trim() || '';
  const myPlayerId = useMemo(() => {
    const ph = player?.phone?.trim();
    if (ph) return `p_${ph}`;
    if (player?.id) return String(player.id);
    return `cid_${getDeviceClientId()}`;
  }, [player?.phone, player?.id]);
  const myPlayerIdRef = useRef(myPlayerId);
  myPlayerIdRef.current = myPlayerId;

  // Private-Room-Only Live E2EE HD Voice Chat States & WebRTC Signaling
  const [isPrivateRoomGame, setIsPrivateRoomGame] = useState(false);
  const [activePrivateRoomCode, setActivePrivateRoomCode] = useState<string | null>(null);
  const [voiceAccessKey, setVoiceAccessKey] = useState<string | null>(null);
  const voiceAccessKeyRef = useRef<string | null>(null);
  voiceAccessKeyRef.current = voiceAccessKey;

  const [isMicMuted, setIsMicMuted] = useState(true);
  const [isDeafened, setIsDeafened] = useState(false);
  const [isLocalSpeaking, setIsLocalSpeaking] = useState(false);
  const [isVoiceStageOpen, setIsVoiceStageOpen] = useState(false);
  const [isPushToTalkActive, setIsPushToTalkActive] = useState(false);
  const [voiceConnectedCount, setVoiceConnectedCount] = useState(1);
  const [activeSpeakerName, setActiveSpeakerName] = useState<string | null>(null);
  const [speakingOpponentId, setSpeakingOpponentId] = useState<string | null>(null);
  const [voicePeersList, setVoicePeersList] = useState<
    { peerId: string; playerName: string; isMuted: boolean; isSpeaking: boolean }[]
  >([]);
  const [mutedPeerIds, setMutedPeerIds] = useState<Record<string, boolean>>({});
  const mutedPeerIdsRef = useRef<Record<string, boolean>>({});
  mutedPeerIdsRef.current = mutedPeerIds;

  const [isVoiceAudioLocked, setIsVoiceAudioLocked] = useState(false);
  const activePrivateRoomCodeRef = useRef<string | null>(null);
  activePrivateRoomCodeRef.current = activePrivateRoomCode;

  const myVoicePeerIdRef = useRef<string>(`peer_${Math.random().toString(36).slice(2, 10)}`);
  const voiceJoinedRef = useRef<boolean>(false);
  const activeVoiceRoomCodeRef = useRef<string | null>(null);
  const localMicStreamRef = useRef<MediaStream | null>(null);
  const micCaptureCtxRef = useRef<AudioContext | null>(null);
  const micSourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const micProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const micSilentGainRef = useRef<GainNode | null>(null);
  const playbackAudioCtxRef = useRef<AudioContext | null>(null);
  const playbackCompressorRef = useRef<DynamicsCompressorNode | null>(null);
  const peerPlaybackMapRef = useRef<Map<string, { nextPlayTime: number; gainNode: GainNode }>>(new Map());
  const voiceAesKeyRef = useRef<CryptoKey | null>(null);
  const voiceAesKeySecretRef = useRef<string>('');
  const voiceTxQueueRef = useRef<Promise<void>>(Promise.resolve());
  const voiceRxQueueRef = useRef<Promise<void>>(Promise.resolve());
  const lastVoiceResyncAtRef = useRef<number>(0);
  const voiceTxPendingCountRef = useRef<number>(0);
  const pttReleaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMicMutedRef = useRef(isMicMuted);
  isMicMutedRef.current = isMicMuted;
  const isDeafenedRef = useRef(isDeafened);
  isDeafenedRef.current = isDeafened;
  const isLocalSpeakingRef = useRef(isLocalSpeaking);
  isLocalSpeakingRef.current = isLocalSpeaking;
  const playerNameRef = useRef(playerName);
  playerNameRef.current = playerName;

  const syncVoiceAccessKey = (rawKey?: string | null) => {
    const k = String(rawKey || '').trim();
    if (!k) return;
    if (voiceAccessKeyRef.current !== k) {
      voiceAccessKeyRef.current = k;
      voiceAesKeyRef.current = null;
      voiceAesKeySecretRef.current = '';
      setVoiceAccessKey(k);
    }
  };

  const xorVoiceBytes = (bytes: Uint8Array, secret: string): Uint8Array => {
    const out = new Uint8Array(bytes.length);
    const keyStr = secret || 'SUN_RAMINO_VOICE_FALLBACK';
    let h = 2166136261;
    for (let i = 0; i < keyStr.length; i++) {
      h ^= keyStr.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    for (let i = 0; i < bytes.length; i++) {
      h ^= i & 0xff;
      h = Math.imul(h, 16777619);
      const mask = ((h >>> 24) ^ (h >>> 16) ^ (h >>> 8) ^ keyStr.charCodeAt(i % keyStr.length)) & 0xff;
      out[i] = bytes[i] ^ mask;
    }
    return out;
  };

  const deriveVoiceAesKey = async (roomCode: string, accessKey: string): Promise<CryptoKey | null> => {
    try {
      if (typeof window === 'undefined' || !window.crypto?.subtle) return null;
      const secretId = `${roomCode}:${accessKey || roomCode}`;
      if (voiceAesKeyRef.current && voiceAesKeySecretRef.current === secretId) {
        return voiceAesKeyRef.current;
      }
      const enc = new TextEncoder();
      const material = enc.encode(`SUN_RAMINO_VOICE_E2EE_V1:${roomCode}:${accessKey || roomCode}`);
      const digest = await window.crypto.subtle.digest('SHA-256', material);
      const imported = await window.crypto.subtle.importKey(
        'raw',
        digest,
        { name: 'AES-GCM' },
        false,
        ['encrypt', 'decrypt']
      );
      voiceAesKeyRef.current = imported;
      voiceAesKeySecretRef.current = secretId;
      return imported;
    } catch {
      return null;
    }
  };

  const uint8ToBase64 = (bytes: Uint8Array): string => {
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
  };

  const base64ToUint8 = (b64: string): Uint8Array => {
    const binary = atob(b64);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      out[i] = binary.charCodeAt(i);
    }
    return out;
  };

  const downsampleFloat32ToInt16 = (input: Float32Array, inputRate: number, targetRate = 16000): Int16Array => {
    const preamp = 1.55;
    if (inputRate <= targetRate) {
      const out = new Int16Array(input.length);
      for (let i = 0; i < input.length; i++) {
        const s = Math.max(-1, Math.min(1, input[i] * preamp));
        out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }
      return out;
    }
    const ratio = inputRate / targetRate;
    const outLen = Math.max(1, Math.floor(input.length / ratio));
    const out = new Int16Array(outLen);
    let offsetResult = 0;
    let offsetBuffer = 0;
    while (offsetResult < outLen) {
      const nextOffsetBuffer = Math.min(input.length, Math.round((offsetResult + 1) * ratio));
      let accum = 0;
      let count = 0;
      for (let i = offsetBuffer; i < nextOffsetBuffer; i++) {
        accum += input[i];
        count++;
      }
      const avg = (count > 0 ? accum / count : 0) * preamp;
      const clamped = Math.max(-1, Math.min(1, avg));
      out[offsetResult] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
      offsetResult++;
      offsetBuffer = nextOffsetBuffer;
    }
    return out;
  };

  const ensurePlaybackAudioCtx = (): AudioContext | null => {
    if (typeof window === 'undefined') return null;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      if (!playbackAudioCtxRef.current || playbackAudioCtxRef.current.state === 'closed') {
        const ctx = new AudioCtx({ latencyHint: 'interactive' });
        playbackAudioCtxRef.current = ctx;
        playbackCompressorRef.current = null;
        peerPlaybackMapRef.current.clear();
        ctx.onstatechange = () => {
          setIsVoiceAudioLocked(ctx.state !== 'running');
        };
        try {
          const comp = ctx.createDynamicsCompressor();
          comp.threshold.value = -22;
          comp.knee.value = 18;
          comp.ratio.value = 6;
          comp.attack.value = 0.005;
          comp.release.value = 0.15;
          comp.connect(ctx.destination);
          playbackCompressorRef.current = comp;
        } catch {
          playbackCompressorRef.current = null;
        }
      }
      if (playbackAudioCtxRef.current.state === 'suspended') {
        playbackAudioCtxRef.current
          .resume()
          .then(() => {
            if (playbackAudioCtxRef.current) {
              setIsVoiceAudioLocked(playbackAudioCtxRef.current.state !== 'running');
            }
          })
          .catch(() => {
            setIsVoiceAudioLocked(true);
          });
      }
      setIsVoiceAudioLocked(playbackAudioCtxRef.current.state !== 'running');
      return playbackAudioCtxRef.current;
    } catch {
      return null;
    }
  };

  const applyRemoteAudioVolumes = () => {
    const shouldDuck = !isMicMutedRef.current && isLocalSpeakingRef.current;
    const targetVol = shouldDuck ? 0.35 : 1.35;
    const ctx = playbackAudioCtxRef.current;
    peerPlaybackMapRef.current.forEach((slot, peerId) => {
      const peerMuted = Boolean(mutedPeerIdsRef.current[peerId]);
      const finalGain = isDeafenedRef.current || peerMuted ? 0 : targetVol;
      try {
        if (ctx) {
          slot.gainNode.gain.setTargetAtTime(finalGain, ctx.currentTime, 0.02);
        } else {
          slot.gainNode.gain.value = finalGain;
        }
      } catch {
        slot.gainNode.gain.value = finalGain;
      }
    });
  };

  const stopVoiceChatSession = () => {
    if (pttReleaseTimerRef.current) {
      clearTimeout(pttReleaseTimerRef.current);
      pttReleaseTimerRef.current = null;
    }
    if (micSourceNodeRef.current) {
      try {
        micSourceNodeRef.current.disconnect();
      } catch {}
      micSourceNodeRef.current = null;
    }
    if (micProcessorRef.current) {
      try {
        micProcessorRef.current.onaudioprocess = null;
        micProcessorRef.current.disconnect();
      } catch {}
      micProcessorRef.current = null;
    }
    if (micSilentGainRef.current) {
      try {
        micSilentGainRef.current.disconnect();
      } catch {}
      micSilentGainRef.current = null;
    }
    if (micCaptureCtxRef.current && micCaptureCtxRef.current !== playbackAudioCtxRef.current) {
      try {
        micCaptureCtxRef.current.close();
      } catch {}
    }
    micCaptureCtxRef.current = null;
    if (localMicStreamRef.current) {
      localMicStreamRef.current.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch {}
      });
      localMicStreamRef.current = null;
    }
    peerPlaybackMapRef.current.clear();
    if (playbackCompressorRef.current) {
      try {
        playbackCompressorRef.current.disconnect();
      } catch {}
      playbackCompressorRef.current = null;
    }
    if (playbackAudioCtxRef.current) {
      try {
        playbackAudioCtxRef.current.close();
      } catch {}
      playbackAudioCtxRef.current = null;
    }
    setIsVoiceAudioLocked(false);
    if (voiceJoinedRef.current && gameWsRef.current?.readyState === WebSocket.OPEN) {
      try {
        gameWsRef.current.send(
          JSON.stringify({
            type: 'ramino:voice:leave',
            roomCode: activeVoiceRoomCodeRef.current || '',
          })
        );
      } catch {}
    }
    voiceJoinedRef.current = false;
    activeVoiceRoomCodeRef.current = null;
    voiceAesKeyRef.current = null;
    voiceAesKeySecretRef.current = '';
    voiceTxPendingCountRef.current = 0;
    setIsLocalSpeaking(false);
    setIsPushToTalkActive(false);
    setSpeakingOpponentId(null);
    setActiveSpeakerName(null);
    setVoicePeersList([]);
    setVoiceConnectedCount(1);
  };

  // Sync mute state onto local mic tracks & broadcast real-time mic badge on single shared socket
  useEffect(() => {
    if (localMicStreamRef.current) {
      localMicStreamRef.current.getAudioTracks().forEach((t) => {
        t.enabled = !isMicMuted;
      });
    }
    if (isMicMuted) {
      setIsLocalSpeaking(false);
    }
    if (voiceJoinedRef.current && gameWsRef.current?.readyState === WebSocket.OPEN) {
      gameWsRef.current.send(
        JSON.stringify({ type: 'ramino:voice:mic-state', isMuted: isMicMuted })
      );
      if (isMicMuted) {
        gameWsRef.current.send(
          JSON.stringify({ type: 'ramino:voice:speaking', isSpeaking: false })
        );
      }
    }
  }, [isMicMuted]);

  // Sync deafen, per-peer local mute & acoustic echo-suppression ducking
  useEffect(() => {
    applyRemoteAudioVolumes();
    if (isDeafened) {
      setSpeakingOpponentId(null);
      setActiveSpeakerName(null);
    }
  }, [isDeafened, isLocalSpeaking, isMicMuted, mutedPeerIds]);

  // Ensure live microphone capture & stream E2EE encrypted audio frames over the single gameWsRef WebSocket
  const ensureLocalMicAndAttach = async (): Promise<boolean> => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      triggerNotification(t.notifyMicUnsupported);
      return false;
    }
    try {
      let stream = localMicStreamRef.current;
      if (!stream || stream.getAudioTracks().every((t) => t.readyState === 'ended')) {
        const voiceConstraints = {
          echoCancellation: { ideal: true },
          noiseSuppression: { ideal: true },
          autoGainControl: { ideal: true },
          channelCount: { ideal: 1 },
        } as MediaTrackConstraints;

        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: voiceConstraints });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        }
        localMicStreamRef.current = stream;

        const ctx = ensurePlaybackAudioCtx();
        if (ctx) {
          micCaptureCtxRef.current = ctx;
          if (ctx.state === 'suspended') {
            await ctx.resume().catch(() => {});
          }
          if (micSourceNodeRef.current) {
            try {
              micSourceNodeRef.current.disconnect();
            } catch {}
          }
          if (micProcessorRef.current) {
            try {
              micProcessorRef.current.onaudioprocess = null;
              micProcessorRef.current.disconnect();
            } catch {}
          }
          if (micSilentGainRef.current) {
            try {
              micSilentGainRef.current.disconnect();
            } catch {}
          }
          const src = ctx.createMediaStreamSource(stream);
          micSourceNodeRef.current = src;
          const processor = ctx.createScriptProcessor(2048, 1, 1);
          const silentGain = ctx.createGain();
          // Non-zero -100dB gain prevents Chrome/Android WebView from optimizing out ScriptProcessorNode callbacks
          silentGain.gain.value = 0.00001;
          micProcessorRef.current = processor;
          micSilentGainRef.current = silentGain;

          let prevSpeaking = false;
          let speakingHoldUntil = 0;
          let txHoldUntil = 0;

          processor.onaudioprocess = (audioEvent) => {
            const inputData = audioEvent.inputBuffer.getChannelData(0);
            if (!inputData || inputData.length === 0) return;

            if (isMicMutedRef.current) {
              if (prevSpeaking) {
                prevSpeaking = false;
                setIsLocalSpeaking(false);
                if (voiceJoinedRef.current && gameWsRef.current?.readyState === WebSocket.OPEN) {
                  gameWsRef.current.send(
                    JSON.stringify({ type: 'ramino:voice:speaking', isSpeaking: false })
                  );
                }
              }
              return;
            }

            let sumSq = 0;
            for (let i = 0; i < inputData.length; i++) {
              const v = inputData[i];
              sumSq += v * v;
            }
            const rms = Math.sqrt(sumSq / inputData.length);
            const now = Date.now();
            if (rms > 0.004) {
              speakingHoldUntil = now + 320;
            }
            if (rms > 0.00035) {
              txHoldUntil = now + 650;
            }

            const speakingNow = rms > 0.004 || now < speakingHoldUntil;
            if (speakingNow !== prevSpeaking) {
              prevSpeaking = speakingNow;
              setIsLocalSpeaking(speakingNow);
              if (voiceJoinedRef.current && gameWsRef.current?.readyState === WebSocket.OPEN) {
                gameWsRef.current.send(
                  JSON.stringify({ type: 'ramino:voice:speaking', isSpeaking: speakingNow })
                );
              }
            }

            const shouldTransmit = rms > 0.00035 || now < txHoldUntil;
            const roomCode = activeVoiceRoomCodeRef.current || activePrivateRoomCodeRef.current?.trim().toUpperCase();
            if (!shouldTransmit || !roomCode) return;
            if (gameWsRef.current?.readyState !== WebSocket.OPEN) return;
            if (!voiceJoinedRef.current) {
              sendVoiceJoinOnSharedWs(roomCode);
            }
            if (voiceTxPendingCountRef.current > 3) return;

            const pcm16 = downsampleFloat32ToInt16(inputData, ctx.sampleRate, 16000);
            const rawBytes = new Uint8Array(pcm16.buffer, pcm16.byteOffset, pcm16.byteLength);
            voiceTxPendingCountRef.current += 1;

            voiceTxQueueRef.current = voiceTxQueueRef.current
              .then(async () => {
                if (gameWsRef.current?.readyState !== WebSocket.OPEN) return;
                const accessSecret = voiceAccessKeyRef.current || '';
                const aesKey = await deriveVoiceAesKey(roomCode, accessSecret);
                if (aesKey && typeof window !== 'undefined' && window.crypto?.subtle) {
                  const iv = window.crypto.getRandomValues(new Uint8Array(12));
                  const cipherBuf = await window.crypto.subtle.encrypt(
                    { name: 'AES-GCM', iv: iv as BufferSource },
                    aesKey,
                    rawBytes as BufferSource
                  );
                  if (gameWsRef.current?.readyState === WebSocket.OPEN) {
                    gameWsRef.current.send(
                      JSON.stringify({
                        type: 'ramino:voice:audio',
                        roomCode,
                        enc: 'aes',
                        iv: uint8ToBase64(iv),
                        data: uint8ToBase64(new Uint8Array(cipherBuf)),
                      })
                    );
                  }
                } else {
                  const masked = xorVoiceBytes(rawBytes, `${roomCode}:${accessSecret}`);
                  if (gameWsRef.current?.readyState === WebSocket.OPEN) {
                    gameWsRef.current.send(
                      JSON.stringify({
                        type: 'ramino:voice:audio',
                        roomCode,
                        enc: 'xor',
                        iv: '',
                        data: uint8ToBase64(masked),
                      })
                    );
                  }
                }
              })
              .catch(() => {})
              .finally(() => {
                voiceTxPendingCountRef.current = Math.max(0, voiceTxPendingCountRef.current - 1);
              });
          };

          src.connect(processor);
          processor.connect(silentGain);
          silentGain.connect(ctx.destination);
        }
      } else if (micCaptureCtxRef.current && micCaptureCtxRef.current.state === 'suspended') {
        await micCaptureCtxRef.current.resume().catch(() => {});
      }

      stream.getAudioTracks().forEach((t) => {
        t.enabled = true;
      });
      return true;
    } catch {
      triggerNotification(t.notifyMicDenied);
      return false;
    }
  };

  const unlockRemoteAudioElements = () => {
    const ctx = ensurePlaybackAudioCtx();
    if (ctx) {
      if (ctx.state === 'suspended') {
        ctx
          .resume()
          .then(() => setIsVoiceAudioLocked(ctx.state !== 'running'))
          .catch(() => {});
      }
      // iOS Safari / Telegram WebView loudspeaker unlock via 1-sample silent buffer inside user gesture
      try {
        const silentBuf = ctx.createBuffer(1, 1, 22050);
        const src = ctx.createBufferSource();
        src.buffer = silentBuf;
        src.connect(ctx.destination);
        src.start(0);
      } catch {}
    }
    applyRemoteAudioVolumes();
  };

  const handleTogglePrivateMic = async () => {
    raminoAudio.playCardSnap();
    if (!isPrivateRoomGame || !activePrivateRoomCode) return;
    unlockRemoteAudioElements();
    if (isMicMuted) {
      const ok = await ensureLocalMicAndAttach();
      if (!ok) return;
      if (localMicStreamRef.current) {
        localMicStreamRef.current.getAudioTracks().forEach((tr) => {
          tr.enabled = true;
        });
      }
      setIsMicMuted(false);
      setIsPushToTalkActive(false);
      triggerNotification(t.notifyMicOpened);
    } else {
      setIsMicMuted(true);
      setIsPushToTalkActive(false);
    }
  };

  const handleStartPushToTalk = async () => {
    if (!isPrivateRoomGame || !activePrivateRoomCode) return;
    if (pttReleaseTimerRef.current) {
      clearTimeout(pttReleaseTimerRef.current);
      pttReleaseTimerRef.current = null;
    }
    unlockRemoteAudioElements();
    const ok = await ensureLocalMicAndAttach();
    if (!ok) return;
    if (localMicStreamRef.current) {
      localMicStreamRef.current.getAudioTracks().forEach((tr) => {
        tr.enabled = true;
      });
    }
    setIsPushToTalkActive(true);
    setIsMicMuted(false);
  };

  const handleEndPushToTalk = () => {
    if (!isPushToTalkActive) return;
    if (pttReleaseTimerRef.current) {
      clearTimeout(pttReleaseTimerRef.current);
    }
    pttReleaseTimerRef.current = setTimeout(() => {
      setIsPushToTalkActive(false);
      setIsMicMuted(true);
    }, 200);
  };

  const toggleMuteRemotePeer = (peerId: string) => {
    raminoAudio.playCardSnap();
    setMutedPeerIds((prev) => ({
      ...prev,
      [peerId]: !prev[peerId],
    }));
  };

  // Single-Connection E2EE AES-256-GCM Voice Channel riding directly on gameWsRef (Zero extra sockets / zero ICE/STUN mesh failures!)
  const inPrivateVoiceArena =
    (view === 'waiting' || view === 'ceremony' || view === 'game') &&
    isPrivateRoomGame &&
    Boolean(activePrivateRoomCode);
  const inPrivateVoiceArenaRef = useRef<boolean>(inPrivateVoiceArena);
  inPrivateVoiceArenaRef.current = inPrivateVoiceArena;

  const sendVoiceJoinOnSharedWs = (roomCode: string) => {
    if (gameWsRef.current?.readyState !== WebSocket.OPEN) return;
    voiceJoinedRef.current = true;
    activeVoiceRoomCodeRef.current = roomCode;
    gameWsRef.current.send(
      JSON.stringify({
        type: 'ramino:voice:join',
        roomCode,
        peerId: myVoicePeerIdRef.current,
        playerId: myPlayerIdRef.current,
        playerName: playerNameRef.current,
        voiceAccessKey: voiceAccessKeyRef.current || '',
        isMuted: isMicMutedRef.current,
      })
    );
  };

  const handleVoiceWsMessage = async (msg: any) => {
    try {
      const activeRoom = activeVoiceRoomCodeRef.current || activePrivateRoomCodeRef.current?.trim().toUpperCase();
      if (!msg || !activeRoom || msg.roomCode !== activeRoom) return;
      const sessionPeerId = myVoicePeerIdRef.current;

      if (msg.type === 'ramino:voice:error') {
        const activeR = activeVoiceRoomCodeRef.current || activePrivateRoomCodeRef.current?.trim().toUpperCase();
        if (activeR && gameWsRef.current?.readyState === WebSocket.OPEN) {
          setTimeout(() => {
            if (inPrivateVoiceArenaRef.current) {
              sendVoiceJoinOnSharedWs(activeR);
            }
          }, 700);
        }
        return;
      } else if (msg.type === 'ramino:voice:peers' && Array.isArray(msg.peers)) {
        if (typeof msg.voiceAccessKey === 'string' && msg.voiceAccessKey.trim()) {
          syncVoiceAccessKey(msg.voiceAccessKey);
        }
        const nextPeers = (msg.peers as { peerId: string; playerName: string; isMuted?: boolean }[])
          .filter((p) => p?.peerId && p.peerId !== sessionPeerId)
          .map((p) => ({
            peerId: String(p.peerId),
            playerName: String(p.playerName || 'Friend'),
            isMuted: p.isMuted !== false,
            isSpeaking: false,
          }));
        setVoicePeersList(nextPeers);
        setVoiceConnectedCount(1 + nextPeers.length);
      } else if (msg.type === 'ramino:voice:peer-joined') {
        const remotePeerId = String(msg.peerId || '');
        if (!remotePeerId || remotePeerId === sessionPeerId) return;
        setVoicePeersList((prev) => {
          const exists = prev.some((p) => p.peerId === remotePeerId);
          const next = exists
            ? prev.map((p) =>
                p.peerId === remotePeerId
                  ? { ...p, playerName: msg.playerName || p.playerName, isMuted: msg.isMuted !== false }
                  : p
              )
            : [
                ...prev,
                {
                  peerId: remotePeerId,
                  playerName: String(msg.playerName || 'Friend'),
                  isMuted: msg.isMuted !== false,
                  isSpeaking: false,
                },
              ];
          setVoiceConnectedCount(1 + next.length);
          return next;
        });
      } else if (msg.type === 'ramino:voice:audio') {
        const fromPeerId = String(msg.fromPeerId || '');
        if (!fromPeerId || fromPeerId === sessionPeerId) return;
        if (isDeafenedRef.current || Boolean(mutedPeerIdsRef.current[fromPeerId])) return;
        if (typeof msg.data !== 'string' || !msg.data) return;

        // Serialize decryption and WebAudio scheduling so frames never play out of order or collide
        voiceRxQueueRef.current = voiceRxQueueRef.current
          .then(async () => {
            if (isDeafenedRef.current || Boolean(mutedPeerIdsRef.current[fromPeerId])) return;
            const accessSecret = voiceAccessKeyRef.current || '';
            let plainBuf: ArrayBuffer;
            try {
              if (msg.enc === 'xor') {
                const cipherBytes = base64ToUint8(msg.data);
                const unmasked = xorVoiceBytes(cipherBytes, `${activeRoom}:${accessSecret}`);
                plainBuf = unmasked.buffer.slice(unmasked.byteOffset, unmasked.byteOffset + unmasked.byteLength) as ArrayBuffer;
              } else {
                if (typeof msg.iv !== 'string' || !msg.iv) return;
                const aesKey = await deriveVoiceAesKey(activeRoom, accessSecret);
                if (!aesKey) return;
                const ivBytes = base64ToUint8(msg.iv);
                const cipherBytes = base64ToUint8(msg.data);
                plainBuf = await window.crypto.subtle.decrypt(
                  { name: 'AES-GCM', iv: ivBytes as BufferSource },
                  aesKey,
                  cipherBytes as BufferSource
                );
              }
            } catch {
              // Key mismatch / missed voiceAccessKey sync: throttle re-sync from server once per 2.5s
              if (Date.now() - lastVoiceResyncAtRef.current > 2500 && gameWsRef.current?.readyState === WebSocket.OPEN) {
                lastVoiceResyncAtRef.current = Date.now();
                sendVoiceJoinOnSharedWs(activeRoom);
              }
              return;
            }
            if (plainBuf.byteLength < 2) return;
            const int16 = new Int16Array(plainBuf);
            if (int16.length === 0) return;

            const ctx = ensurePlaybackAudioCtx();
            if (!ctx) return;
            if (ctx.state === 'suspended') {
              await ctx.resume().catch(() => {});
            }
            if (ctx.state !== 'running') {
              setIsVoiceAudioLocked(true);
              return;
            }
            setIsVoiceAudioLocked(false);

            let slot = peerPlaybackMapRef.current.get(fromPeerId);
            if (!slot) {
              const gainNode = ctx.createGain();
              const shouldDuck = !isMicMutedRef.current && isLocalSpeakingRef.current;
              gainNode.gain.value = isDeafenedRef.current || mutedPeerIdsRef.current[fromPeerId] ? 0 : shouldDuck ? 0.35 : 1.45;
              gainNode.connect(playbackCompressorRef.current || ctx.destination);
              slot = { nextPlayTime: ctx.currentTime + 0.055, gainNode };
              peerPlaybackMapRef.current.set(fromPeerId, slot);
            }

            const audioBuf = ctx.createBuffer(1, int16.length, 16000);
            const chData = audioBuf.getChannelData(0);
            for (let i = 0; i < int16.length; i++) {
              chData[i] = int16[i] / 32768;
            }

            const nowTime = ctx.currentTime;
            if (slot.nextPlayTime < nowTime || slot.nextPlayTime > nowTime + 0.45) {
              slot.nextPlayTime = nowTime + 0.055;
            }
            const source = ctx.createBufferSource();
            source.buffer = audioBuf;
            source.connect(slot.gainNode);
            source.start(slot.nextPlayTime);
            slot.nextPlayTime += audioBuf.duration;
          })
          .catch(() => {});
      } else if (msg.type === 'ramino:voice:mic-state') {
        const pid = String(msg.peerId || '');
        const peerMuted = Boolean(msg.isMuted);
        setVoicePeersList((prev) =>
          prev.map((p) =>
            p.peerId === pid
              ? { ...p, isMuted: peerMuted, isSpeaking: peerMuted ? false : p.isSpeaking }
              : p
          )
        );
      } else if (msg.type === 'ramino:voice:speaking') {
        const pid = String(msg.peerId || '');
        const speaker = String(msg.playerName || '');
        const speakingNow = Boolean(msg.isSpeaking);
        setVoicePeersList((prev) =>
          prev.map((p) => (p.peerId === pid ? { ...p, isSpeaking: speakingNow } : p))
        );
        if (isDeafenedRef.current || (pid && mutedPeerIdsRef.current[pid])) return;
        if (speakingNow) {
          setActiveSpeakerName(speaker);
          const matchedOpp = opponentsRef.current.find(
            (o) => o.name.toLowerCase() === speaker.toLowerCase()
          );
          setSpeakingOpponentId(matchedOpp ? matchedOpp.id : speaker);
        } else {
          setActiveSpeakerName((cur) => (cur === speaker ? null : cur));
          setSpeakingOpponentId(null);
        }
      } else if (msg.type === 'ramino:voice:peer-left') {
        const leftId = String(msg.peerId || '');
        peerPlaybackMapRef.current.delete(leftId);
        setVoicePeersList((prev) => {
          const next = prev.filter((p) => p.peerId !== leftId);
          setVoiceConnectedCount(1 + next.length);
          return next;
        });
        if (winStreakRef.current > 0) {
          winStreakRef.current = 0;
          setWinStreak(0);
          triggerNotification(t.notifyStreakResetLeft);
        }
      } else if (msg.type === 'ramino:postday:request') {
        const requester = String(msg.playerName || 'Friend');
        const reqSource: 'header' | 'winner' = msg.source === 'winner' ? 'winner' : 'header';
        setPostDayRequest({
          requestedBy: requester,
          source: reqSource,
          acceptedIds: [requester],
          needsMyAccept: true,
          allAccepted: false,
        });
        raminoAudio.playSwap();
        triggerNotification(t.notifyPostDayAsked(requester));
      } else if (msg.type === 'ramino:postday:accept') {
        const acceptor = String(msg.playerName || 'Friend');
        setPostDayRequest((prev) => {
          if (!prev) return prev;
          if (prev.acceptedIds.includes(acceptor)) return prev;
          const nextAccepted = [...prev.acceptedIds, acceptor];
          return { ...prev, acceptedIds: nextAccepted };
        });
      } else if (msg.type === 'ramino:admin:control') {
        if (msg.action === 'close') {
          stopVoiceChatSession();
          setView('lobby');
          setIsPrivateRoomGame(false);
          setActivePrivateRoomCode(null);
          setVoiceAccessKey(null);
          triggerNotification(t.notifyAdminClosedRoom);
        } else if (msg.action === 'reset') {
          setView('lobby');
          triggerNotification(t.notifyAdminResetGame);
        }
      }
    } catch {}
  };

  const handleVoiceWsMessageRef = useRef(handleVoiceWsMessage);
  handleVoiceWsMessageRef.current = handleVoiceWsMessage;

  useEffect(() => {
    if (!inPrivateVoiceArena || !activePrivateRoomCode) {
      stopVoiceChatSession();
      return;
    }

    const sessionPeerId = `peer_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
    myVoicePeerIdRef.current = sessionPeerId;
    const roomCode = activePrivateRoomCode.trim().toUpperCase();
    activeVoiceRoomCodeRef.current = roomCode;

    void deriveVoiceAesKey(roomCode, voiceAccessKeyRef.current || '');
    sendVoiceJoinOnSharedWs(roomCode);

    // Unlock listener AudioContext immediately on ANY user gesture inside the private arena
    const handleUnlockGesture = () => {
      unlockRemoteAudioElements();
    };
    window.addEventListener('pointerdown', handleUnlockGesture, { passive: true });
    window.addEventListener('touchstart', handleUnlockGesture, { passive: true });
    window.addEventListener('click', handleUnlockGesture, { passive: true });

    // Retry voice join shortly in case shared WS was still opening
    const joinRetryTimer = window.setTimeout(() => {
      if (inPrivateVoiceArenaRef.current && !voiceJoinedRef.current && gameWsRef.current?.readyState === WebSocket.OPEN) {
        sendVoiceJoinOnSharedWs(roomCode);
      }
    }, 600);

    return () => {
      window.clearTimeout(joinRetryTimer);
      window.removeEventListener('pointerdown', handleUnlockGesture);
      window.removeEventListener('touchstart', handleUnlockGesture);
      window.removeEventListener('click', handleUnlockGesture);
      stopVoiceChatSession();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inPrivateVoiceArena, activePrivateRoomCode]);

  useEffect(() => {
    if (!inPrivateVoiceArena || !activePrivateRoomCode || !voiceAccessKey) return;
    const roomCode = activePrivateRoomCode.trim().toUpperCase();
    void deriveVoiceAesKey(roomCode, voiceAccessKey);
    if (!voiceJoinedRef.current || activeVoiceRoomCodeRef.current !== roomCode) {
      sendVoiceJoinOnSharedWs(roomCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceAccessKey]);

  // Lobby Rooms State (Synchronized live across all connected players via /api/ramino/rooms + WS)
  const [openRooms, setOpenRooms] = useState<RaminoRoom[]>([]);

  const [playerSeatCount, setPlayerSeatCount] = useState<2 | 3 | 4 | 5>(3);
  const [selectedStake, setSelectedStake] = useState<number>(30);
  const [privateStake, setPrivateStake] = useState<number>(30);
  const [activeTableStake, setActiveTableStake] = useState<number>(30);
  const [activeMultiplayerRoomCode, setActiveMultiplayerRoomCode] = useState<string | null>(null);
  const activeMultiplayerRoomCodeRef = useRef<string | null>(null);
  activeMultiplayerRoomCodeRef.current = activeMultiplayerRoomCode;

  const [waitingRoomPlayers, setWaitingRoomPlayers] = useState<
    { id: string; name: string; avatarLetter: string; avatarColor: string; isHost: boolean }[]
  >([]);
  const [isPrivateModalOpen, setIsPrivateModalOpen] = useState(false);
  const [isJoinCodeModalOpen, setIsJoinCodeModalOpen] = useState(false);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [privateCode, setPrivateCode] = useState<string>(
    () => `RAMINO-${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [privateRoomState, setPrivateRoomState] = useState<RaminoPrivateRoomSnapshot | null>(null);
  const [joinCodeInput, setJoinCodeInput] = useState<string>('');
  const [joinedRoomPreview, setJoinedRoomPreview] = useState<RaminoPrivateRoomSnapshot | null>(null);
  const [joinLookupError, setJoinLookupError] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [telegramBotUsername, setTelegramBotUsername] = useState<string>('Sungamsbot');
  const [notificationBanner, setNotificationBanner] = useState<string | null>(null);
  const [isBannedModalOpen, setIsBannedModalOpen] = useState<boolean>(false);
  const [isSelfSuspended, setIsSelfSuspended] = useState<boolean>(false);
  const prevSelfSuspendedRef = useRef<boolean>(false);

  const [winStreak, setWinStreak] = useState<number>(0);
  const winStreakRef = useRef<number>(0);
  winStreakRef.current = winStreak;

  // Private-Table Persistent Seating & Post Day (after 5 games) + Unlimited Reshuffle counter
  const [privateRoundCount, setPrivateRoundCount] = useState<number>(1);
  const privateRoundCountRef = useRef<number>(1);
  privateRoundCountRef.current = privateRoundCount;

  const [tableSeatOrder, setTableSeatOrder] = useState<
    { id: string; name: string; avatarLetter: string; avatarColor: string }[]
  >(BOT_PROFILES);
  const tableSeatOrderRef = useRef(tableSeatOrder);
  tableSeatOrderRef.current = tableSeatOrder;

  const [reshuffleCount, setReshuffleCount] = useState<number>(0);

  const [postDayRequest, setPostDayRequest] = useState<{
    requestedBy: string;
    source: 'header' | 'winner';
    acceptedIds: string[];
    needsMyAccept: boolean;
    allAccepted: boolean;
  } | null>(null);

  const [postDaySeatPick, setPostDaySeatPick] = useState<{
    source: 'header' | 'winner';
    revealedCount: number;
    currentPickerIdx: number;
    currentPickerId: string | null;
    currentPickerName: string | null;
    isMyPickTurn: boolean;
    entries: {
      id: string;
      name: string;
      avatarLetter: string;
      avatarColor: string;
      card: PlayingCard;
      rankOrder: number;
      pickedSeat: number | null;
      isSelf?: boolean;
    }[];
    chosenSeats: ({ id: string; name: string; avatarLetter: string; avatarColor: string; isSelf?: boolean } | null)[];
    completed: boolean;
    prevDealerName?: string;
    activeTurnOppId?: string | null;
  } | null>(null);

  const [winnerCelebration, setWinnerCelebration] = useState<{
    show: boolean;
    title: string;
    winnerId: string;
    winnerName: string;
    isOpponentWin?: boolean;
    finishMode?:
      | 'normal'
      | 'joker_finish'
      | 'streak_joker'
      | 'dopey'
      | 'dopey_joker'
      | 'bottom_normal'
      | 'bottom_dopey'
      | 'bottom_dopey_joker'
      | 'timeout_win';
    multiplier: number;
    dopeyMultiplier: number;
    streakMultiplier: number;
    streakCount: number;
    winAmount: number;
    rakeAmount: number;
    lostPenalty?: number;
    winnerCards?: PlayingCard[];
    winnerGroups?: WinnerShowcaseGroup[];
    winnerClosingCard?: PlayingCard | null;
  } | null>(null);
  const [isWinnerModalMinimized, setIsWinnerModalMinimized] = useState<boolean>(false);

  // Temporary Exit & Rejoin Before Expiry State (supports both Multiplayer Server Tables & Solo/Bot Games)
  interface SuspendedLocalRaminoSnapshot {
    phase: 'ceremony' | 'game';
    seatCount: 2 | 3 | 4 | 5;
    stake: number;
    isPrivateRoomGame: boolean;
    activePrivateRoomCode: string | null;
    privateRoundCount: number;
    reshuffleCount: number;
    tableSeatOrder: { id: string; name: string; avatarLetter: string; avatarColor: string }[];
    winStreak: number;
    opponents: RaminoOpponent[];
    turnSeconds: number;
    expiresAt: number;
    currentTurn: number;
    hasDrawn: boolean;
    drawnFromDiscardCard: PlayingCard | null;
    hasMelded: boolean;
    hasDiscarded: boolean;
    deckCards: PlayingCard[];
    bottomCard: PlayingCard;
    discardPile: PlayingCard[];
    playerHand: PlayingCard[];
    tableMelds: MeldGroup[];
    closedSetBadges: ClosedSetBadge[];
    meldTurnCounter: number;
    ceremonyDealer: string;
    cutParticipants: { id: string; name: string; card: PlayingCard; isWinner: boolean; isSelf?: boolean }[];
    ceremonyRevealedCount: number;
  }

  const LOCAL_RESUME_STORAGE_KEY = 'sun_ramino_local_resume_v1';
  const MP_RESUME_STORAGE_KEY = 'sun_ramino_mp_resume_v1';

  const loadUnexpiredLocalResume = (): SuspendedLocalRaminoSnapshot | null => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(LOCAL_RESUME_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as SuspendedLocalRaminoSnapshot;
      if (!parsed || typeof parsed.expiresAt !== 'number' || parsed.expiresAt <= Date.now()) {
        localStorage.removeItem(LOCAL_RESUME_STORAGE_KEY);
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  };

  const [suspendedLocalGame, setSuspendedLocalGame] = useState<SuspendedLocalRaminoSnapshot | null>(() =>
    loadUnexpiredLocalResume()
  );
  const [localResumeSecondsLeft, setLocalResumeSecondsLeft] = useState<number>(() => {
    const snap = loadUnexpiredLocalResume();
    return snap ? Math.max(0, Math.ceil((snap.expiresAt - Date.now()) / 1000)) : 0;
  });
  const [resumableMpSession, setResumableMpSession] = useState<{
    roomCode: string;
    stake: number;
    isPrivate: boolean;
    privateCode: string | null;
    phase: 'ceremony' | 'game';
    turnSeconds: number;
    isMyTurn: boolean;
    activePlayerName: string;
  } | null>(null);

  // Refs to keep interval/timeout callbacks free of stale closures or nested state setters
  const isMinimizedToLobbyRef = useRef<boolean>(false);
  const localGameEpochRef = useRef<number>(0);
  const openRoomsRef = useRef<RaminoRoom[]>(openRooms);
  openRoomsRef.current = openRooms;
  const onUpdateSharedUsersRef = useRef(onUpdateSharedUsers);
  onUpdateSharedUsersRef.current = onUpdateSharedUsers;
  const gameWsRef = useRef<WebSocket | null>(null);
  const lastSyncedRoundIndexRef = useRef<number>(-1);
  const debitedRoundIndexRef = useRef<number>(0);
  const creditedRoundKeyRef = useRef<string | null>(null);
  const lastProcessedEventIdRef = useRef<number>(0);
  const heldWaitingStakeRef = useRef<number>(0);
  const balanceRef = useRef<number>(balance);
  balanceRef.current = balance;
  const viewRef = useRef(view);
  viewRef.current = view;

  // Notification banner helper
  const triggerNotification = (text: string) => {
    setNotificationBanner(text);
    setTimeout(() => {
      setNotificationBanner((cur) => (cur === text ? null : cur));
    }, 3800);
  };

  const onRecordWalletTxRef = useRef(onRecordWalletTx);
  onRecordWalletTxRef.current = onRecordWalletTx;

  // Wallet helper (Unified across all games & synced with server)
  const adjustWalletBalance = (delta: number, reason?: string) => {
    if (onRecordWalletTxRef.current) {
      onRecordWalletTxRef.current(delta, reason || (delta < 0 ? 'Ramino Entry' : 'Ramino Win'));
      return;
    }
    if (onUpdateSharedUsersRef.current) {
      onUpdateSharedUsersRef.current((prev) =>
        prev.map((u, idx) => (idx === 0 ? { ...u, balance: Math.max(0, u.balance + delta) } : u))
      );
    }
    const phone = player?.phone;
    if (phone && delta !== 0) {
      fetch(buildApiUrl('/api/wallet/game-tx'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          name: playerName,
          delta,
          game: 'ramino',
          reason: reason || (delta < 0 ? 'Ramino Entry' : 'Ramino Win'),
        }),
      }).catch(() => {});
    }
  };

  const mapServerLobbyRooms = (roomsRaw: any[]): RaminoRoom[] => {
    if (!Array.isArray(roomsRaw)) return [];
    return roomsRaw.map((rm) => ({
      id: String(rm.id),
      name: String(rm.name || '#Room'),
      creator: String(rm.creator || 'Player'),
      avatarLetter: String(rm.avatarLetter || rm.creator?.[0] || 'P'),
      avatarColor: String(rm.avatarColor || 'bg-amber-400'),
      stake: Number(rm.stake || 30),
      max: ([2, 3, 4, 5].includes(Number(rm.max)) ? Number(rm.max) : 3) as 2 | 3 | 4 | 5,
      current: Number(rm.current || 1),
      duration: Number(rm.duration || 180),
      timeRemaining: Number(rm.timeRemaining || 0),
      isUserCreated:
        rm.creatorId === myPlayerIdRef.current ||
        (Boolean(playerPhone) && rm.creatorPhone === playerPhone),
    }));
  };

  const fetchServerOpenRooms = async () => {
    try {
      const res = await fetch(buildApiUrl(`/api/ramino/rooms?_t=${Date.now()}`), { cache: 'no-store' });
      const data = await res.json();
      if (data?.ok && Array.isArray(data.rooms)) {
        setOpenRooms(mapServerLobbyRooms(data.rooms));
      }
    } catch {}
  };

  const reconcileHandOrder = (prevHand: PlayingCard[], incomingHand: PlayingCard[]): PlayingCard[] => {
    if (!Array.isArray(incomingHand)) return prevHand;
    if (prevHand.length === 0) return incomingHand;
    const byId = new Map(incomingHand.map((c) => [c.id, c]));
    const kept = prevHand.filter((c) => byId.has(c.id)).map((c) => byId.get(c.id)!);
    const keptIds = new Set(kept.map((c) => c.id));
    const added = incomingHand.filter((c) => !keptIds.has(c.id));
    return [...kept, ...added];
  };

  const applyServerTableSnapshot = (tbl: any) => {
    if (!tbl || typeof tbl !== 'object') return;
    const stk = Number(tbl.stake || 30);
    setActiveTableStake(stk);
    const seats = ([2, 3, 4, 5].includes(Number(tbl.seatCount))
      ? Number(tbl.seatCount)
      : [2, 3, 4, 5].includes(Number(tbl.maxPlayers))
      ? Number(tbl.maxPlayers)
      : 3) as 2 | 3 | 4 | 5;
    setPlayerSeatCount(seats);
    setIsPrivateRoomGame(Boolean(tbl.isPrivate));
    if (tbl.voiceAccessKey) {
      syncVoiceAccessKey(tbl.voiceAccessKey);
    }
    if (tbl.isPrivate && tbl.roomCode) {
      setActivePrivateRoomCode(String(tbl.roomCode));
    }
    if (Array.isArray(tbl.playersSummary)) {
      setWaitingRoomPlayers(tbl.playersSummary);
    }

    const srvRoundCount = Number(tbl.privateRoundCount ?? 1);
    privateRoundCountRef.current = srvRoundCount;
    setPrivateRoundCount(srvRoundCount);
    setReshuffleCount(Number(tbl.reshuffleCount ?? 0));

    if (Array.isArray(tbl.cutParticipants)) setCutParticipants(tbl.cutParticipants);
    if (typeof tbl.ceremonyRevealedCount === 'number') setCeremonyRevealedCount(tbl.ceremonyRevealedCount);
    if (tbl.ceremonyDealer) setCeremonyDealer(String(tbl.ceremonyDealer));

    const myStreak = Number(tbl.myWinStreak ?? 0);
    winStreakRef.current = myStreak;
    setWinStreak(myStreak);

    if (tbl.bottomCard) setBottomCard(tbl.bottomCard);
    const nextDiscard = Array.isArray(tbl.discardPile) ? tbl.discardPile : [];
    discardPileRef.current = nextDiscard;
    setDiscardPile(nextDiscard);

    const deckLen = Number(tbl.deckCount ?? 0);
    setDeckCards((prev) => {
      if (prev.length === deckLen) return prev;
      return Array.from({ length: deckLen }, (_, idx) => ({
        id: `srv_deck_${idx}`,
        rank: '2',
        suit: '♠' as const,
        suitName: 'spades' as const,
        color: 'black' as const,
        value: 2,
        points: 2,
        isJoker: false,
      }));
    });

    const nextMelds = Array.isArray(tbl.tableMelds) ? tbl.tableMelds : [];
    tableMeldsRef.current = nextMelds;
    setTableMelds(nextMelds);
    if (Array.isArray(tbl.closedSetBadges)) {
      closedSetBadgesRef.current = tbl.closedSetBadges;
      setClosedSetBadges(tbl.closedSetBadges);
    }

    const nextOpps = Array.isArray(tbl.opponents) ? tbl.opponents : [];
    opponentsRef.current = nextOpps;
    setOpponents(nextOpps);

    setCurrentTurn(Number(tbl.currentTurn ?? 0));
    const drawnNow = Boolean(tbl.hasDrawn);
    hasDrawnRef.current = drawnNow;
    setHasDrawn(drawnNow);
    setDrawnFromDiscardCard(tbl.drawnFromDiscardCard || null);
    setHasMelded(Boolean(tbl.myHasMelded));
    setHasDiscarded(Boolean(tbl.hasDiscarded));
    if (typeof tbl.turnSeconds === 'number') setTurnSeconds(tbl.turnSeconds);

    const nextSuspended = Boolean(tbl.myIsSuspended);
    if (tbl.phase === 'game' && nextSuspended && !prevSelfSuspendedRef.current && !tbl.winnerCelebration?.show) {
      raminoAudio.playBuzzer();
      setIsBannedModalOpen(true);
    } else if (!nextSuspended || tbl.phase !== 'game') {
      if (!nextSuspended) setIsBannedModalOpen(false);
    }
    prevSelfSuspendedRef.current = nextSuspended;
    setIsSelfSuspended(nextSuspended);

    const srvRoundIdx = Number(tbl.roundIndex ?? 0);
    if (Array.isArray(tbl.myHand)) {
      if (srvRoundIdx !== lastSyncedRoundIndexRef.current) {
        lastSyncedRoundIndexRef.current = srvRoundIdx;
        setPlayerHand(tbl.myHand);
        setSelectedCardIds(new Set());
      } else {
        setPlayerHand((prev) => reconcileHandOrder(prev, tbl.myHand));
      }
    }

    // Charge stake once per new round (>1) if triggered by another player at the table
    if (tbl.phase === 'game' && srvRoundIdx > 1 && debitedRoundIndexRef.current !== srvRoundIdx) {
      debitedRoundIndexRef.current = srvRoundIdx;
      heldWaitingStakeRef.current = 0;
      adjustWalletBalance(-stk, `Ramino Round #${srvRoundIdx} (${stk} ETB)`);
    } else if (tbl.phase === 'game' && srvRoundIdx === 1) {
      debitedRoundIndexRef.current = 1;
      heldWaitingStakeRef.current = 0;
    }

    // Post Day Request & 1-Card Cut Seat Pick Sync
    if (tbl.postDayRequest) {
      setPostDayRequest({
        requestedBy: String(tbl.postDayRequest.requestedBy || ''),
        source: tbl.postDayRequest.source === 'winner' ? 'winner' : 'header',
        acceptedIds: Array.isArray(tbl.postDayRequest.acceptedNames)
          ? tbl.postDayRequest.acceptedNames
          : [],
        needsMyAccept: Boolean(tbl.postDayRequest.needsMyAccept),
        allAccepted: Boolean(tbl.postDayRequest.allAccepted),
      });
    } else {
      setPostDayRequest(null);
    }
    setPostDaySeatPick(tbl.postDaySeatPick || null);

    // Winner celebration + idempotent payout & 2x/3x loss penalty debiting
    if (tbl.winnerCelebration && tbl.winnerCelebration.show && tbl.phase !== 'postday_pick') {
      isMinimizedToLobbyRef.current = false;
      setResumableMpSession(null);
      try {
        localStorage.removeItem(MP_RESUME_STORAGE_KEY);
      } catch {}

      const wc = tbl.winnerCelebration;
      const isMe = wc.winnerId === myPlayerIdRef.current;
      const totalMult = Number(
        wc.totalMultiplier || Number(wc.dopeyMultiplier || 1) * Number(wc.streakMultiplier || 1)
      );
      let resolvedTitle = t.winTitleNormal;
      if (wc.titleKey === 'timeout_win') {
        resolvedTitle = isMe
          ? t.winTitleTimeout
          : t.loseTitleTimeout(String(wc.winnerName || 'Opponent'));
      } else if (!isMe) {
        resolvedTitle = t.loseTitle(String(wc.winnerName || 'Opponent'), totalMult);
      } else if (wc.titleKey === 'bottom_dopey_joker') {
        resolvedTitle = t.winBottomJokerDopey(String(wc.bottomCardStr || '🃏').slice(-1));
      } else if (wc.titleKey === 'bottom_dopey') {
        resolvedTitle = t.winBottomDopey(String(wc.bottomCardStr || ''));
      } else if (wc.titleKey === 'bottom_normal') {
        resolvedTitle = t.winBottomNormal(String(wc.bottomCardStr || ''));
      } else if (wc.titleKey === 'dopey_joker') {
        resolvedTitle = t.winTitleDopeyJoker;
      } else if (wc.titleKey === 'dopey') {
        resolvedTitle = t.winTitleDopey;
      } else if (wc.titleKey === 'streak_joker') {
        resolvedTitle = t.winTitleStreakJoker(Number(wc.streakCount || 3));
      } else if (wc.titleKey === 'joker_finish') {
        resolvedTitle = t.winTitleJokerFinish;
      } else if (wc.titleKey === 'streak') {
        resolvedTitle = t.winTitleStreak(Number(wc.streakCount || 3));
      }

      const rawPenalty =
        !isMe && totalMult > 1 ? Number(wc.loserExtraPenalty ?? stk * (totalMult - 1)) : 0;
      const appliedPenalty =
        !isMe && rawPenalty > 0 ? Math.min(balanceRef.current, Number(rawPenalty.toFixed(2))) : 0;

      setWinnerCelebration({
        show: true,
        title: resolvedTitle,
        winnerId: String(wc.winnerId),
        winnerName: String(wc.winnerName),
        isOpponentWin: !isMe,
        finishMode: wc.titleKey,
        multiplier: totalMult,
        dopeyMultiplier: Number(wc.dopeyMultiplier || 1),
        streakMultiplier: Number(wc.streakMultiplier || 1),
        streakCount: Number(wc.streakCount || 0),
        winAmount: isMe ? Number(wc.winAmount || 0) : 0,
        rakeAmount: Number(wc.rakeAmount || 0),
        lostPenalty: appliedPenalty,
        winnerCards: Array.isArray(wc.winnerCards) ? wc.winnerCards : [],
        winnerGroups: Array.isArray(wc.winnerGroups) ? wc.winnerGroups : [],
        winnerClosingCard: wc.winnerClosingCard || null,
      });

      if (wc.roundKey && creditedRoundKeyRef.current !== wc.roundKey) {
        creditedRoundKeyRef.current = wc.roundKey;
        setIsWinnerModalMinimized(false);
        if (isMe) {
          raminoAudio.playVictory();
          adjustWalletBalance(Number(wc.winAmount || 0), `Ramino Win (${totalMult}x)`);
        } else {
          raminoAudio.playBuzzer();
          if (appliedPenalty > 0) {
            adjustWalletBalance(
              -appliedPenalty,
              totalMult >= 3
                ? `Ramino ጎልደን 3x Loss (-${appliedPenalty} ETB)`
                : `Ramino ዶፔይ/ሞንቴ 2x Loss (-${appliedPenalty} ETB)`
            );
          }
        }
      }
    } else {
      setIsWinnerModalMinimized(false);
      setWinnerCelebration(null);
    }

    // One-time audio + notification dispatch for authoritative server events
    if (tbl.lastEvent && typeof tbl.lastEvent.id === 'number' && tbl.lastEvent.id > lastProcessedEventIdRef.current) {
      lastProcessedEventIdRef.current = tbl.lastEvent.id;
      const ev = tbl.lastEvent;
      if (ev.type === 'round_started') {
        raminoAudio.playDraw();
        if (tbl.currentTurn === 0 && tbl.hasDrawn) {
          triggerNotification(t.notifyDealerFirstDiscard(String(tbl.ceremonyDealer || '')));
        } else if (tbl.currentTurn === 0) {
          triggerNotification(t.notifyYourTurnStart(String(tbl.ceremonyDealer || '')));
        } else {
          triggerNotification(t.notifyDealerStarted(String(tbl.ceremonyDealer || '')));
        }
      } else if (ev.type === 'draw_deck' || ev.type === 'draw_discard') {
        raminoAudio.playDraw();
      } else if (ev.type === 'return_discard' || ev.type === 'layoff') {
        raminoAudio.playCardSnap();
      } else if (ev.type === 'meld') {
        raminoAudio.playVictory();
        if (ev.actorId !== myPlayerIdRef.current) {
          triggerNotification(t.notifyOppMelded(String(ev.actorName || ''), Number(ev.detail || 0)));
        }
      } else if (ev.type === 'discard') {
        raminoAudio.playCardSnap();
        if (tbl.currentTurn === 0) {
          triggerNotification(t.notifyYourTurnFull);
        }
      } else if (ev.type === 'postday_request' && ev.actorId !== myPlayerIdRef.current) {
        raminoAudio.playSwap();
        triggerNotification(t.notifyPostDayAsked(String(ev.actorName || '')));
      } else if (ev.type === 'postday_applied') {
        raminoAudio.playVictory();
        triggerNotification(t.notifyPostDayApplied);
      } else if (ev.type === 'player_left') {
        triggerNotification(t.notifyStreakResetLeft);
      } else if (ev.type === 'player_suspended' && ev.actorId !== myPlayerIdRef.current) {
        raminoAudio.playBuzzer();
        triggerNotification(t.notifyPlayerSuspended(String(ev.actorName || '')));
      }
    }

    const turnSecVal = Number(tbl.turnSeconds ?? 0);
    if (isMinimizedToLobbyRef.current) {
      if ((tbl.phase === 'game' || tbl.phase === 'ceremony') && turnSecVal > 0) {
        const turnIdx = Number(tbl.currentTurn ?? 0);
        const activeName =
          turnIdx === 0 ? playerNameRef.current : String(nextOpps[turnIdx - 1]?.name || '');
        const mpSummary = {
          roomCode: String(tbl.roomCode || activeMultiplayerRoomCodeRef.current || ''),
          stake: stk,
          isPrivate: Boolean(tbl.isPrivate),
          privateCode: tbl.isPrivate && tbl.roomCode ? String(tbl.roomCode) : null,
          phase: (tbl.phase === 'ceremony' ? 'ceremony' : 'game') as 'ceremony' | 'game',
          turnSeconds: turnSecVal,
          isMyTurn: turnIdx === 0,
          activePlayerName: activeName,
        };
        setResumableMpSession(mpSummary);
        try {
          localStorage.setItem(
            MP_RESUME_STORAGE_KEY,
            JSON.stringify({ ...mpSummary, updatedAt: Date.now() })
          );
        } catch {}
        return;
      }
      isMinimizedToLobbyRef.current = false;
      setResumableMpSession(null);
      try {
        localStorage.removeItem(MP_RESUME_STORAGE_KEY);
      } catch {}
      if (tbl.phase !== 'finished') {
        setView('lobby');
        return;
      }
    }

    if (tbl.phase === 'waiting') {
      setView('waiting');
    } else if (tbl.phase === 'ceremony') {
      setIsPrivateModalOpen(false);
      setIsJoinCodeModalOpen(false);
      setResumableMpSession(null);
      try {
        localStorage.setItem(
          MP_RESUME_STORAGE_KEY,
          JSON.stringify({
            roomCode: String(tbl.roomCode || ''),
            stake: stk,
            turnSeconds: turnSecVal,
            phase: 'ceremony',
            updatedAt: Date.now(),
          })
        );
      } catch {}
      setView('ceremony');
    } else if (tbl.phase === 'postday_pick') {
      setIsPrivateModalOpen(false);
      setIsJoinCodeModalOpen(false);
      setWinnerCelebration(null);
      setResumableMpSession(null);
      setView('postday_pick');
    } else if (tbl.phase === 'game' || tbl.phase === 'finished') {
      setIsPrivateModalOpen(false);
      setIsJoinCodeModalOpen(false);
      setIsBannedModalOpen(false);
      setResumableMpSession(null);
      try {
        if (tbl.phase === 'game' && turnSecVal > 0) {
          localStorage.setItem(
            MP_RESUME_STORAGE_KEY,
            JSON.stringify({
              roomCode: String(tbl.roomCode || ''),
              stake: stk,
              turnSeconds: turnSecVal,
              phase: 'game',
              updatedAt: Date.now(),
            })
          );
        } else {
          localStorage.removeItem(MP_RESUME_STORAGE_KEY);
        }
      } catch {}
      setView('game');
    }
  };
  const applyServerTableSnapshotRef = useRef(applyServerTableSnapshot);
  applyServerTableSnapshotRef.current = applyServerTableSnapshot;

  const sendRaminoGameAction = async (
    action: string,
    payload: Record<string, any> = {}
  ): Promise<boolean> => {
    const code = activeMultiplayerRoomCodeRef.current;
    if (!code) return false;
    try {
      const res = await fetch(buildApiUrl(`/api/ramino/tables/${encodeURIComponent(code)}/action`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: myPlayerIdRef.current,
          action,
          ...payload,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        raminoAudio.playBuzzer();
        if (data?.error) triggerNotification(data.error);
        if (data?.table) applyServerTableSnapshotRef.current(data.table);
        return false;
      }
      if (data?.table) {
        applyServerTableSnapshotRef.current(data.table);
      }
      return true;
    } catch {
      return false;
    }
  };

  const leaveMultiplayerTable = async (refundWaitingStake = true) => {
    const code = activeMultiplayerRoomCodeRef.current;
    const held = heldWaitingStakeRef.current;
    if (code) {
      if (gameWsRef.current?.readyState === WebSocket.OPEN) {
        try {
          gameWsRef.current.send(JSON.stringify({ type: 'ramino:table:leave' }));
        } catch {}
      }
      try {
        await fetch(buildApiUrl(`/api/ramino/tables/${encodeURIComponent(code)}/action`), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerId: myPlayerIdRef.current,
            action: 'leave_table',
          }),
        });
      } catch {}
    }
    if (refundWaitingStake && held > 0 && viewRef.current === 'waiting') {
      heldWaitingStakeRef.current = 0;
      adjustWalletBalance(held, `Ramino Leave Waiting Refund (${code || ''})`);
    } else {
      heldWaitingStakeRef.current = 0;
    }
    stopVoiceChatSession();
    isMinimizedToLobbyRef.current = false;
    setResumableMpSession(null);
    try {
      localStorage.removeItem(MP_RESUME_STORAGE_KEY);
    } catch {}
    setActiveMultiplayerRoomCode(null);
    activeMultiplayerRoomCodeRef.current = null;
    setIsPrivateRoomGame(false);
    setActivePrivateRoomCode(null);
    setIsMicMuted(true);
    winStreakRef.current = 0;
    setWinStreak(0);
    privateRoundCountRef.current = 1;
    setPrivateRoundCount(1);
    debitedRoundIndexRef.current = 0;
    lastSyncedRoundIndexRef.current = -1;
    creditedRoundKeyRef.current = null;
    lastProcessedEventIdRef.current = 0;
    setWinnerCelebration(null);
    setPostDayRequest(null);
    setPostDaySeatPick(null);
    setIsBannedModalOpen(false);
    setView('lobby');
    fetchServerOpenRooms();
  };

  const checkActiveServerRaminoSession = async () => {
    try {
      const res = await fetch(
        buildApiUrl(
          `/api/ramino/active-session?playerId=${encodeURIComponent(myPlayerIdRef.current)}&_t=${Date.now()}`
        ),
        { cache: 'no-store' }
      );
      const data = await res.json();
      if (
        data?.ok &&
        data.table &&
        (data.table.phase === 'game' || data.table.phase === 'ceremony') &&
        Number(data.table.turnSeconds ?? 0) > 0
      ) {
        const roomCode = String(data.table.roomCode || '');
        if (viewRef.current === 'lobby') {
          isMinimizedToLobbyRef.current = true;
        }
        setActiveMultiplayerRoomCode(roomCode);
        activeMultiplayerRoomCodeRef.current = roomCode;
        applyServerTableSnapshotRef.current(data.table);
        if (gameWsRef.current?.readyState === WebSocket.OPEN && roomCode) {
          gameWsRef.current.send(
            JSON.stringify({
              type: 'ramino:table:join',
              roomCode,
              playerId: myPlayerIdRef.current,
            })
          );
        }
      } else {
        setResumableMpSession(null);
        try {
          localStorage.removeItem(MP_RESUME_STORAGE_KEY);
        } catch {}
      }
    } catch {}
  };

  const clearLocalSuspendedGame = () => {
    setSuspendedLocalGame(null);
    setLocalResumeSecondsLeft(0);
    try {
      localStorage.removeItem(LOCAL_RESUME_STORAGE_KEY);
    } catch {}
  };

  const exitGameTemporarilyToLobby = () => {
    if (activeMultiplayerRoomCodeRef.current) {
      isMinimizedToLobbyRef.current = true;
      stopVoiceChatSession();
      setIsMicMuted(true);
      const secs = Math.max(15, turnSeconds);
      const mpSummary = {
        roomCode: activeMultiplayerRoomCodeRef.current,
        stake: activeTableStake,
        isPrivate: isPrivateRoomGame,
        privateCode: activePrivateRoomCode,
        phase: view === 'ceremony' ? ('ceremony' as const) : ('game' as const),
        turnSeconds: secs,
        isMyTurn: currentTurn === 0,
        activePlayerName:
          currentTurn === 0
            ? playerName
            : opponentsRef.current[currentTurn - 1]?.name || 'Player',
      };
      setResumableMpSession(mpSummary);
      try {
        localStorage.setItem(MP_RESUME_STORAGE_KEY, JSON.stringify(mpSummary));
      } catch {}
      setView('lobby');
      triggerNotification(t.notifySavedCanReturn);
      return;
    }

    localGameEpochRef.current += 1;
    stopVoiceChatSession();
    setIsMicMuted(true);
    const snapSecs = Math.max(15, turnSeconds);
    const snapshot: SuspendedLocalRaminoSnapshot = {
      phase: view === 'ceremony' ? 'ceremony' : 'game',
      seatCount: playerSeatCount,
      stake: selectedStake,
      isPrivateRoomGame,
      activePrivateRoomCode,
      privateRoundCount: privateRoundCountRef.current,
      reshuffleCount,
      tableSeatOrder: tableSeatOrderRef.current,
      winStreak: winStreakRef.current,
      opponents: opponentsRef.current,
      turnSeconds: snapSecs,
      expiresAt: Date.now() + snapSecs * 1000,
      currentTurn,
      hasDrawn,
      drawnFromDiscardCard,
      hasMelded,
      hasDiscarded,
      deckCards: deckCardsRef.current,
      bottomCard,
      discardPile: discardPileRef.current,
      playerHand,
      tableMelds: tableMeldsRef.current,
      closedSetBadges,
      meldTurnCounter: meldTurnCounterRef.current,
      ceremonyDealer,
      cutParticipants,
      ceremonyRevealedCount,
    };
    setSuspendedLocalGame(snapshot);
    setLocalResumeSecondsLeft(snapSecs);
    try {
      localStorage.setItem(LOCAL_RESUME_STORAGE_KEY, JSON.stringify(snapshot));
    } catch {}
    setView('lobby');
    triggerNotification(t.notifySavedCanReturn);
  };

  const handleResumeActiveGame = async () => {
    raminoAudio.playDraw();
    if (resumableMpSession && activeMultiplayerRoomCodeRef.current) {
      isMinimizedToLobbyRef.current = false;
      const targetCode = activeMultiplayerRoomCodeRef.current;
      try {
        const res = await fetch(
          buildApiUrl(
            `/api/ramino/tables/${encodeURIComponent(targetCode)}/state?playerId=${encodeURIComponent(myPlayerIdRef.current)}&_t=${Date.now()}`
          ),
          { cache: 'no-store' }
        );
        const data = await res.json();
        if (data?.ok && data.table && (data.table.phase === 'game' || data.table.phase === 'ceremony')) {
          applyServerTableSnapshotRef.current(data.table);
          return;
        }
      } catch {}
      setView(resumableMpSession.phase);
      return;
    }

    const snap = suspendedLocalGame || loadUnexpiredLocalResume();
    if (!snap || snap.expiresAt <= Date.now()) {
      clearLocalSuspendedGame();
      return;
    }
    clearLocalSuspendedGame();
    localGameEpochRef.current += 1;

    setPlayerSeatCount(snap.seatCount);
    setSelectedStake(snap.stake);
    setActiveTableStake(snap.stake);
    setIsPrivateRoomGame(snap.isPrivateRoomGame);
    setActivePrivateRoomCode(snap.activePrivateRoomCode);
    privateRoundCountRef.current = snap.privateRoundCount;
    setPrivateRoundCount(snap.privateRoundCount);
    setReshuffleCount(snap.reshuffleCount);
    tableSeatOrderRef.current = snap.tableSeatOrder;
    setTableSeatOrder(snap.tableSeatOrder);
    winStreakRef.current = snap.winStreak;
    setWinStreak(snap.winStreak);

    opponentsRef.current = snap.opponents;
    setOpponents(snap.opponents);
    deckCardsRef.current = snap.deckCards;
    setDeckCards(snap.deckCards);
    setBottomCard(snap.bottomCard);
    discardPileRef.current = snap.discardPile;
    setDiscardPile(snap.discardPile);
    setPlayerHand(snap.playerHand);
    tableMeldsRef.current = snap.tableMelds;
    setTableMelds(snap.tableMelds);
    setClosedSetBadges(snap.closedSetBadges);
    meldTurnCounterRef.current = snap.meldTurnCounter;
    setMeldTurnCounter(snap.meldTurnCounter);
    setCeremonyDealer(snap.ceremonyDealer);
    setCutParticipants(snap.cutParticipants);
    setCeremonyRevealedCount(snap.ceremonyRevealedCount);

    const remSecs = Math.max(1, Math.ceil((snap.expiresAt - Date.now()) / 1000));
    setTurnSeconds(remSecs);
    hasDrawnRef.current = snap.hasDrawn;
    setHasDrawn(snap.hasDrawn);
    setDrawnFromDiscardCard(snap.drawnFromDiscardCard);
    setHasMelded(snap.hasMelded);
    setHasDiscarded(snap.hasDiscarded);
    setCurrentTurn(snap.currentTurn);
    setIsBannedModalOpen(false);
    setWinnerCelebration(null);
    setView(snap.phase);

    if (snap.phase === 'game' && snap.currentTurn > 0) {
      runOpponentTurnsFrom(snap.currentTurn - 1, false);
    }
  };

  const handleForfeitResumableGame = () => {
    raminoAudio.playCardSnap();
    if (resumableMpSession && activeMultiplayerRoomCodeRef.current) {
      void leaveMultiplayerTable(false);
      return;
    }
    clearLocalSuspendedGame();
    localGameEpochRef.current += 1;
    winStreakRef.current = 0;
    setWinStreak(0);
    setIsPrivateRoomGame(false);
    setActivePrivateRoomCode(null);
  };

  // Persistent Ramino Game & Lobby WebSocket Synchronization
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let active = true;
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let wsOpen = false;

    const connectGameWs = () => {
      if (!active) return;
      try {
        const apiRoot = buildApiUrl('');
        const wsUrl = apiRoot
          ? `${apiRoot.replace(/^http/, 'ws')}/ws/bingo`
          : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/bingo`;
        ws = new WebSocket(wsUrl);
        gameWsRef.current = ws;

        ws.onopen = () => {
          wsOpen = true;
          const activeCode = activeMultiplayerRoomCodeRef.current;
          if (activeCode) {
            ws?.send(
              JSON.stringify({
                type: 'ramino:table:join',
                roomCode: activeCode,
                playerId: myPlayerIdRef.current,
              })
            );
          }
          if (inPrivateVoiceArenaRef.current && activePrivateRoomCodeRef.current) {
            sendVoiceJoinOnSharedWs(activePrivateRoomCodeRef.current.trim().toUpperCase());
          }
        };

        ws.onmessage = (evt) => {
          if (!active) return;
          try {
            const msg = JSON.parse(String(evt.data));
            if (msg?.type === 'ramino:lobby:sync' && Array.isArray(msg.rooms)) {
              setOpenRooms(mapServerLobbyRooms(msg.rooms));
            } else if (msg?.type === 'ramino:private-room:sync' && msg.room) {
              const roomSnap = msg.room as RaminoPrivateRoomSnapshot;
              if (roomSnap.code === privateCode.trim().toUpperCase()) {
                setPrivateRoomState(roomSnap);
              }
            } else if (msg?.type === 'ramino:table:sync' && msg.table) {
              const curCode = activeMultiplayerRoomCodeRef.current;
              if (!curCode || msg.table.roomCode === curCode) {
                applyServerTableSnapshotRef.current(msg.table);
              }
            } else if (msg?.type === 'ramino:action:error' && msg.error) {
              raminoAudio.playBuzzer();
              triggerNotification(String(msg.error));
            } else if (msg?.type === 'game:notify' && msg.notification) {
              const notifTxt = msg.notification.message || msg.notification.title;
              if (notifTxt) triggerNotification(String(notifTxt));
            } else if (typeof msg?.type === 'string' && (msg.type.startsWith('ramino:voice:') || msg.type.startsWith('ramino:postday:') || msg.type === 'ramino:admin:control')) {
              void handleVoiceWsMessageRef.current(msg);
            }
          } catch {}
        };

        ws.onclose = () => {
          wsOpen = false;
          if (gameWsRef.current === ws) gameWsRef.current = null;
          if (active) {
            reconnectTimer = setTimeout(connectGameWs, 1500);
          }
        };

        ws.onerror = () => {
          wsOpen = false;
        };
      } catch {}
    };

    fetchServerOpenRooms();
    void checkActiveServerRaminoSession();
    connectGameWs();

    const backupPoll = window.setInterval(async () => {
      if (!active) return;
      const code = activeMultiplayerRoomCodeRef.current;
      if (code && !wsOpen) {
        try {
          const res = await fetch(
            buildApiUrl(`/api/ramino/tables/${encodeURIComponent(code)}/state?playerId=${encodeURIComponent(myPlayerIdRef.current)}&_t=${Date.now()}`),
            { cache: 'no-store' }
          );
          const data = await res.json();
          if (data?.ok && data.table) {
            applyServerTableSnapshotRef.current(data.table);
          }
        } catch {}
      } else if (!code && !wsOpen) {
        fetchServerOpenRooms();
      }
    }, 2500);

    return () => {
      active = false;
      window.clearInterval(backupPoll);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) {
        try {
          ws.close();
        } catch {}
      }
      if (gameWsRef.current === ws) gameWsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Automatically bind active table room to Game WebSocket whenever activeMultiplayerRoomCode changes
  useEffect(() => {
    if (!activeMultiplayerRoomCode) return;
    if (gameWsRef.current?.readyState === WebSocket.OPEN) {
      gameWsRef.current.send(
        JSON.stringify({
          type: 'ramino:table:join',
          roomCode: activeMultiplayerRoomCode,
          playerId: myPlayerIdRef.current,
        })
      );
    }
  }, [activeMultiplayerRoomCode]);

  // Private Room Helpers (Server + LocalStorage mirror for invite links & code entry)
  const saveLocalPrivateRoom = (room: RaminoPrivateRoomSnapshot) => {
    try {
      const raw = localStorage.getItem('sun_ramino_private_rooms_v1');
      const map: Record<string, RaminoPrivateRoomSnapshot> = raw ? JSON.parse(raw) : {};
      map[room.code.toUpperCase()] = room;
      localStorage.setItem('sun_ramino_private_rooms_v1', JSON.stringify(map));
    } catch {}
  };

  const getLocalPrivateRoom = (code: string): RaminoPrivateRoomSnapshot | null => {
    try {
      const raw = localStorage.getItem('sun_ramino_private_rooms_v1');
      if (!raw) return null;
      const map: Record<string, RaminoPrivateRoomSnapshot> = JSON.parse(raw);
      return map[code.trim().toUpperCase()] || null;
    } catch {
      return null;
    }
  };

  const syncPrivateRoomToHost = async (
    code: string,
    seats: 2 | 3 | 4 | 5,
    stake: number
  ) => {
    const cleanCode = code.trim().toUpperCase();
    const fallbackRoom: RaminoPrivateRoomSnapshot = {
      code: cleanCode,
      hostId: myPlayerId,
      hostName: playerName,
      maxPlayers: seats,
      stake,
      players: [{ id: myPlayerId, name: playerName, isHost: true, joinedAt: Date.now() }],
      status: 'waiting',
    };
    saveLocalPrivateRoom(fallbackRoom);
    setPrivateRoomState(fallbackRoom);
    try {
      const res = await fetch(buildApiUrl('/api/ramino/private-rooms'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: cleanCode,
          hostId: myPlayerId,
          hostPhone: playerPhone,
          hostName: playerName,
          maxPlayers: seats,
          stake,
        }),
      });
      const data = await res.json();
      if (data?.ok && data.room) {
        if (data.room.voiceAccessKey) {
          syncVoiceAccessKey(data.room.voiceAccessKey);
        }
        saveLocalPrivateRoom(data.room);
        setPrivateRoomState(data.room);
      }
    } catch {}
  };

  const lookupPrivateRoomByCode = async (code: string): Promise<RaminoPrivateRoomSnapshot | null> => {
    const clean = code.trim().toUpperCase();
    if (!clean) return null;
    try {
      const res = await fetch(buildApiUrl(`/api/ramino/private-rooms/${encodeURIComponent(clean)}?_t=${Date.now()}`), {
        cache: 'no-store',
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.ok && data.room) {
          saveLocalPrivateRoom(data.room);
          return data.room as RaminoPrivateRoomSnapshot;
        }
      }
    } catch {}
    return getLocalPrivateRoom(clean);
  };

  // Auto-open Join Code modal if opened via a Private Room Invite Link (?raminoRoom=CODE)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const params = new URLSearchParams(window.location.search);
      const urlCode = params.get('raminoRoom');
      const storedCode = localStorage.getItem('sun_pending_ramino_room');
      const inviteCode = (urlCode || storedCode || '').trim().toUpperCase();
      if (inviteCode) {
        localStorage.removeItem('sun_pending_ramino_room');
        setJoinCodeInput(inviteCode);
        setIsJoinCodeModalOpen(true);
      }
    } catch {}
    fetch(buildApiUrl('/api/telegram/status'))
      .then((r) => r.json())
      .then((data) => {
        const activeUser = data?.details?.[0]?.botUsername || data?.bots?.[0];
        if (activeUser && typeof activeUser === 'string') {
          setTelegramBotUsername(activeUser.replace(/^@/, ''));
        }
      })
      .catch(() => {});
  }, []);

  // Poll Private Room while host modal is open so joined friends appear live (and syncs dedicated privateStake)
  useEffect(() => {
    if (!isPrivateModalOpen) return;
    syncPrivateRoomToHost(privateCode, playerSeatCount, privateStake);
    const timer = setInterval(async () => {
      const room = await lookupPrivateRoomByCode(privateCode);
      if (room) {
        setPrivateRoomState(room);
        if (room.status === 'started' && activeMultiplayerRoomCodeRef.current !== room.code.trim().toUpperCase()) {
          const cleanCode = room.code.trim().toUpperCase();
          if (balanceRef.current >= room.stake) {
            heldWaitingStakeRef.current = room.stake;
            adjustWalletBalance(-room.stake, `Ramino Private ${cleanCode}`);
            setIsPrivateRoomGame(true);
            setActivePrivateRoomCode(cleanCode);
            setActiveMultiplayerRoomCode(cleanCode);
            activeMultiplayerRoomCodeRef.current = cleanCode;
            setActiveTableStake(room.stake);
            setIsPrivateModalOpen(false);
            try {
              const stRes = await fetch(
                buildApiUrl(`/api/ramino/tables/${encodeURIComponent(cleanCode)}/state?playerId=${encodeURIComponent(myPlayerIdRef.current)}`),
                { cache: 'no-store' }
              );
              const stData = await stRes.json();
              if (stData?.ok && stData.table) {
                if (stData.table.voiceAccessKey) {
                  syncVoiceAccessKey(stData.table.voiceAccessKey);
                }
                applyServerTableSnapshotRef.current(stData.table);
              }
            } catch {}
          }
        }
      }
    }, 1500);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPrivateModalOpen, privateCode, playerSeatCount, privateStake]);

  // Live lookup of room details inside Join by Code modal
  useEffect(() => {
    if (!isJoinCodeModalOpen) return;
    const clean = joinCodeInput.trim().toUpperCase();
    if (clean.length < 4) {
      setJoinedRoomPreview(null);
      setJoinLookupError(null);
      return;
    }
    const timer = setTimeout(async () => {
      const room = await lookupPrivateRoomByCode(clean);
      if (room) {
        setJoinedRoomPreview(room);
        setJoinLookupError(null);
      } else {
        setJoinedRoomPreview(null);
        setJoinLookupError(t.notifyJoinLookupErr);
      }
    }, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isJoinCodeModalOpen, joinCodeInput]);

  // Smooth 1-Second Display Countdown for Lobby Open Rooms + Resumable Active Game Expiry
  useEffect(() => {
    const interval = setInterval(() => {
      setOpenRooms((prev) => {
        if (prev.length === 0) return prev;
        return prev
          .map((rm) => ({ ...rm, timeRemaining: Math.max(0, rm.timeRemaining - 1) }))
          .filter((rm) => rm.timeRemaining > 0);
      });

      if (suspendedLocalGame) {
        const rem = Math.max(0, Math.ceil((suspendedLocalGame.expiresAt - Date.now()) / 1000));
        setLocalResumeSecondsLeft(rem);
        if (rem <= 0) {
          setSuspendedLocalGame(null);
          try {
            localStorage.removeItem(LOCAL_RESUME_STORAGE_KEY);
          } catch {}
          winStreakRef.current = 0;
          setWinStreak(0);
        }
      }

      if (resumableMpSession && viewRef.current === 'lobby') {
        setResumableMpSession((prev) => {
          if (!prev) return null;
          if (prev.turnSeconds <= 1) {
            void checkActiveServerRaminoSession();
            return { ...prev, turnSeconds: 0 };
          }
          return { ...prev, turnSeconds: prev.turnSeconds - 1 };
        });
      }
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suspendedLocalGame, Boolean(resumableMpSession)]);

  // Format mm:ss
  const formatTimer = (sec: number) => {
    const s = Math.max(0, sec);
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m}:${rem < 10 ? '0' : ''}${rem}`;
  };

  // Live Lobby Stats
  const livePlayersCount = useMemo(() => {
    const inRooms = openRooms.reduce((sum, r) => sum + r.current, 0);
    return Math.max(1, inRooms + (view === 'game' ? playerSeatCount : 0));
  }, [openRooms, view, playerSeatCount]);

  // Dealer Cut Ceremony State (Dynamically matches playerSeatCount: 2 cards for 2 players, etc.)
  const [cutParticipants, setCutParticipants] = useState<
    { id: string; name: string; card: PlayingCard; isWinner: boolean; isSelf?: boolean }[]
  >([]);
  const [ceremonyDealer, setCeremonyDealer] = useState<string>('Hana');
  const [ceremonyRevealedCount, setCeremonyRevealedCount] = useState<number>(0);

  // Game Round State
  const [opponents, setOpponents] = useState<RaminoOpponent[]>([]);
  const [turnSeconds, setTurnSeconds] = useState<number>(120); // 90s thinking + 30s warning
  const [currentTurn, setCurrentTurn] = useState<number>(0); // 0 = Player, 1..N = Opponents
  const [hasDrawn, setHasDrawn] = useState<boolean>(false);
  const [drawnFromDiscardCard, setDrawnFromDiscardCard] = useState<PlayingCard | null>(null);
  const [hasMelded, setHasMelded] = useState<boolean>(false);
  const [hasDiscarded, setHasDiscarded] = useState<boolean>(false);

  const [deckCards, setDeckCards] = useState<PlayingCard[]>([]);
  const [bottomCard, setBottomCard] = useState<PlayingCard>({
    id: 'bot_card_10c',
    rank: '10',
    suit: '♣',
    suitName: 'clubs',
    color: 'black',
    value: 10,
    points: 10,
    isJoker: false,
  });
  const [discardPile, setDiscardPile] = useState<PlayingCard[]>([]);
  const [playerHand, setPlayerHand] = useState<PlayingCard[]>([]);
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set());

  // Clean Board Melds & Right-Side Closed Set Badges (IMG_3905)
  const [tableMelds, setTableMelds] = useState<MeldGroup[]>([]);
  const [closedSetBadges, setClosedSetBadges] = useState<ClosedSetBadge[]>([]);
  const [meldTurnCounter, setMeldTurnCounter] = useState<number>(0);

  const deckCardsRef = useRef<PlayingCard[]>(deckCards);
  deckCardsRef.current = deckCards;
  const discardPileRef = useRef<PlayingCard[]>(discardPile);
  discardPileRef.current = discardPile;
  const opponentsRef = useRef<RaminoOpponent[]>(opponents);
  opponentsRef.current = opponents;
  const tableMeldsRef = useRef<MeldGroup[]>(tableMelds);
  tableMeldsRef.current = tableMelds;
  const closedSetBadgesRef = useRef<ClosedSetBadge[]>(closedSetBadges);
  closedSetBadgesRef.current = closedSetBadges;
  const meldTurnCounterRef = useRef<number>(meldTurnCounter);
  meldTurnCounterRef.current = meldTurnCounter;
  const hasDrawnRef = useRef<boolean>(hasDrawn);
  hasDrawnRef.current = hasDrawn;

  // Drag & Drop States
  const [dragCardState, setDragCardState] = useState<{
    index: number;
    card: PlayingCard;
    x: number;
    y: number;
  } | null>(null);
  const [dragHoverTarget, setDragHoverTarget] = useState<number | null>(null);
  const dragStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const dragMovedRef = useRef<boolean>(false);
  const justDraggedRef = useRef<boolean>(false);
  const dragSlotsRef = useRef<{ index: number; cx: number; cy: number }[]>([]);
  const lastDragEvalPosRef = useRef<{ x: number; y: number } | null>(null);

  // Prepare Dealer Cut Ceremony for N players
  const startDealerCutCeremony = (seatCount: 2 | 3 | 4 | 5, stake: number) => {
    clearLocalSuspendedGame();
    localGameEpochRef.current += 1;
    winStreakRef.current = 0;
    setWinStreak(0);
    privateRoundCountRef.current = 1;
    setPrivateRoundCount(1);
    setReshuffleCount(0);
    const initialSeats = [...BOT_PROFILES];
    tableSeatOrderRef.current = initialSeats;
    setTableSeatOrder(initialSeats);
    setSelectedStake(stake);
    setActiveTableStake(stake);
    setPlayerSeatCount(seatCount);

    const cutDeck = buildShuffledDeck(1).filter((c) => !c.isJoker);
    // Ensure unique cut rank values so there is a clean winner
    const usedCutRanks = new Set<string>();
    const pickUniqueCutCard = () => {
      for (const c of cutDeck) {
        if (!usedCutRanks.has(c.rank)) {
          usedCutRanks.add(c.rank);
          return c;
        }
      }
      return cutDeck[0];
    };

    const oppCount = seatCount - 1;
    const activeBotsList = initialSeats.slice(0, oppCount);
    const participantsRaw = [
      ...activeBotsList.map((b) => ({
        id: b.id,
        name: b.name,
        card: pickUniqueCutCard(),
        isSelf: false,
      })),
      {
        id: 'self',
        name: playerName,
        card: pickUniqueCutCard(),
        isSelf: true,
      },
    ];

    let maxVal = -1;
    let winnerId = participantsRaw[0].id;
    participantsRaw.forEach((p) => {
      const val = CUT_RANK_ORDER[p.card.rank] || 0;
      if (val > maxVal) {
        maxVal = val;
        winnerId = p.id;
      }
    });

    const winnerObj = participantsRaw.find((p) => p.id === winnerId) || participantsRaw[0];
    setCeremonyDealer(winnerObj.name);
    setCutParticipants(
      participantsRaw.map((p) => ({
        ...p,
        isWinner: p.id === winnerId,
      }))
    );
    setCeremonyRevealedCount(0);
    setIsBannedModalOpen(false);
    setView('ceremony');
  };

  // Deal Cards & Enter Landscape Game Screen (100% strict card conservation — zero duplicates!)
  // Deal Round with Specific Dealer (Ceremony Winner OR Previous Round Winner!)
  const dealRoundWithDealer = (dealerName: string) => {
    clearLocalSuspendedGame();
    localGameEpochRef.current += 1;
    // Always deal from 2 full decks (108 cards) so identical paired cards (ጥንድ ካርታ) can be dealt cleanly for 2–5 players
    const deckCount: 1 | 2 = 2;
    const shuffled = buildShuffledDeck(deckCount);

    const dealerOppIdx = tableSeatOrderRef.current
      .slice(0, playerSeatCount - 1)
      .findIndex((b) => b.name === dealerName);
    const playerIsDealer = dealerName === playerName || dealerOppIdx === -1;

    let offset = 0;
    // Dealer receives 14 cards and opens play by discarding 1 card; everyone else receives 13 cards
    const selfCount = playerIsDealer ? 14 : 13;
    const dealtHand = shuffled.slice(offset, offset + selfCount);
    offset += selfCount;

    const activeOpps: RaminoOpponent[] = tableSeatOrderRef.current
      .slice(0, playerSeatCount - 1)
      .map((b) => {
        const oppIsDealer = !playerIsDealer && b.name === dealerName;
        const oppCount = oppIsDealer ? 14 : 13;
        const oppHand = shuffled.slice(offset, offset + oppCount);
        offset += oppCount;
        return {
          ...b,
          hand: oppHand,
          cardCount: oppHand.length,
          isDealer: oppIsDealer,
          hasMelded: false,
        };
      });

    const bCard = shuffled[offset];
    offset += 1;
    const remainingDeck = shuffled.slice(offset);

    opponentsRef.current = activeOpps;
    deckCardsRef.current = remainingDeck;
    discardPileRef.current = [];

    setCeremonyDealer(dealerName);
    setOpponents(activeOpps);
    setPlayerHand(dealtHand);
    setBottomCard(bCard);
    setDiscardPile([]);
    setDeckCards(remainingDeck);

    // Clean Board on Start!
    setTableMelds([]);
    tableMeldsRef.current = [];
    setClosedSetBadges([]);
    closedSetBadgesRef.current = [];
    setMeldTurnCounter(0);
    meldTurnCounterRef.current = 0;

    setSelectedCardIds(new Set());
    hasDrawnRef.current = playerIsDealer;
    setHasDrawn(playerIsDealer);
    setDrawnFromDiscardCard(null);
    setHasMelded(false);
    setHasDiscarded(false);
    setTurnSeconds(120); // 90s thinking + 30s warning
    prevSelfSuspendedRef.current = false;
    setIsSelfSuspended(false);
    setIsBannedModalOpen(false);
    setIsWinnerModalMinimized(false);
    setWinnerCelebration(null);
    setView('game');
    raminoAudio.playDraw();

    if (playerIsDealer) {
      setCurrentTurn(0);
      triggerNotification(t.notifyDealerFirstDiscard(dealerName));
    } else {
      triggerNotification(t.notifyDealerOpp(dealerName));
      setCurrentTurn(dealerOppIdx + 1);
      runOpponentTurnsFrom(dealerOppIdx, true);
    }
  };

  const enterGameFromCeremony = () => {
    dealRoundWithDealer(ceremonyDealer);
  };

  const enterGameFromCeremonyRef = useRef(enterGameFromCeremony);
  enterGameFromCeremonyRef.current = enterGameFromCeremony;

  // Dealer Cut Ceremony: Start face-down (SUN GAMES cover) -> Open one by one sequentially -> Auto-enter game!
  useEffect(() => {
    if (view !== 'ceremony' || activeMultiplayerRoomCode) return;
    const count = cutParticipants.length || playerSeatCount;
    setCeremonyRevealedCount(0);
    const timers: ReturnType<typeof setTimeout>[] = [];

    for (let i = 1; i <= count; i++) {
      timers.push(
        setTimeout(() => {
          raminoAudio.playCardSnap();
          setCeremonyRevealedCount(i);
        }, 700 * i)
      );
    }

    timers.push(
      setTimeout(() => {
        enterGameFromCeremonyRef.current();
      }, 700 * count + 1700)
    );

    return () => {
      timers.forEach((t) => clearTimeout(t));
    };
  }, [view, cutParticipants.length, playerSeatCount]);

  // Turn Countdown Timer: 90s Thinking + 30s Warning -> Suspend timed-out player!
  useEffect(() => {
    if (view !== 'game' || currentTurn !== 0 || isSelfSuspended || isBannedModalOpen || winnerCelebration?.show || activeMultiplayerRoomCode) return;

    const interval = setInterval(() => {
      setTurnSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [view, currentTurn, isSelfSuspended, isBannedModalOpen, winnerCelebration, activeMultiplayerRoomCode]);

  useEffect(() => {
    if (view !== 'game' || currentTurn !== 0 || isSelfSuspended || isBannedModalOpen || winnerCelebration?.show) return;

    if (turnSeconds === 30) {
      raminoAudio.playBuzzer();
      triggerNotification(t.notifyWarning30s);
    } else if (turnSeconds === 0 && !activeMultiplayerRoomCode) {
      raminoAudio.playBuzzer();
      winStreakRef.current = 0;
      setWinStreak(0);
      const activeOpps = opponentsRef.current.filter((o) => !o.isSuspended);
      if (playerSeatCount >= 3 && activeOpps.length >= 2) {
        // Suspend ONLY self; return self cards to deck and continue bots so user can watch live!
        prevSelfSuspendedRef.current = true;
        setIsSelfSuspended(true);
        if (playerHand.length > 0) {
          const nextDeck = [...deckCardsRef.current, ...playerHand];
          for (let i = nextDeck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [nextDeck[i], nextDeck[j]] = [nextDeck[j], nextDeck[i]];
          }
          deckCardsRef.current = nextDeck;
          setDeckCards(nextDeck);
          setPlayerHand([]);
        }
        setSelectedCardIds(new Set());
        setHasDrawn(false);
        setDrawnFromDiscardCard(null);
        setIsBannedModalOpen(true);
        const firstActiveOppIdx = opponentsRef.current.findIndex((o) => !o.isSuspended);
        runOpponentTurnsFrom(firstActiveOppIdx !== -1 ? firstActiveOppIdx : 0, false);
      } else {
        clearLocalSuspendedGame();
        const survivor = activeOpps[0] || opponentsRef.current[0];
        if (survivor) {
          triggerRoundWin({
            winnerId: survivor.id,
            winnerName: survivor.name,
            dopeyMultiplier: 1,
            customFinishMode: 'timeout_win',
            customTitle: t.loseTitleTimeout(survivor.name),
          });
        } else {
          setIsBannedModalOpen(true);
        }
      }
    }
  }, [turnSeconds, view, currentTurn, isSelfSuspended, isBannedModalOpen, winnerCelebration, activeMultiplayerRoomCode, playerSeatCount, playerHand]);

  // Contiguous Groups in Hand (for top bar & group elevation on tap)
  const { cardToGroupMap, firstCardOfGroupMap } = useMemo(
    () => detectContiguousGroupsInHand(playerHand),
    [playerHand]
  );

  // Strict 41 Points & Valid Meld Stats — Meld (ውረድ) ONLY appears when clicking/selecting a completed valid meld (3+ cards, zero ungrouped stray discard cards)
  const calculatedMeldStats = useMemo(() => {
    const selectedCards = playerHand.filter((c) => selectedCardIds.has(c.id));

    if (selectedCards.length < 3) {
      return {
        points: 0,
        canMeld: false,
        hasTrisOrCatris: false,
        formedGroupsCount: 0,
      };
    }

    if (isValidSet(selectedCards) || isValidRun(selectedCards)) {
      const pts = getGroupPoints(selectedCards);
      const isFinishing = selectedCards.length >= playerHand.length - 1;
      return {
        points: pts,
        canMeld:
          currentTurn === 0 &&
          (hasMelded ? true : pts >= 41) &&
          (hasDrawn || drawnFromDiscardCard !== null || isFinishing),
        hasTrisOrCatris: true,
        formedGroupsCount: 1,
      };
    }

    // Multiple formed groups selected together (e.g. 8-8-8 + J-J-J = 54 pts); require ALL selected cards to belong to valid melds
    const part = partitionValidMelds(selectedCards);
    const allSelectedAreValidMelds = part.melds.length > 0 && part.remaining.length === 0;
    const isFinishing = allSelectedAreValidMelds && selectedCards.length >= playerHand.length - 1;
    return {
      points: allSelectedAreValidMelds ? part.totalPoints : 0,
      canMeld:
        currentTurn === 0 &&
        allSelectedAreValidMelds &&
        (hasMelded ? true : part.totalPoints >= 41) &&
        (hasDrawn || drawnFromDiscardCard !== null || isFinishing),
      hasTrisOrCatris: allSelectedAreValidMelds,
      formedGroupsCount: allSelectedAreValidMelds ? part.melds.length : 0,
    };
  }, [playerHand, selectedCardIds, currentTurn, hasMelded, hasDrawn, drawnFromDiscardCard]);

  // Strict Dopey / Monte rule: ALWAYS strictly 5 identical pairs + 1 Tris (never mixed suits)
  const allowSameRankDopey = false;

  const isBottomCardFinisherReady = useMemo(() => {
    if (hasMelded || currentTurn !== 0 || hasDrawn || playerHand.length === 0) return false;

    const partWithout = partitionValidMelds(playerHand);
    const dopeyWithout = checkDopey(playerHand, undefined, allowSameRankDopey);

    // If hand can already finish without bottomCard, bottomCard must NOT light up
    if (dopeyWithout.isDopey) return false;
    if (
      partWithout.remaining.length === 0 &&
      partWithout.melds.length > 0 &&
      partWithout.totalPoints >= 41
    ) {
      return false;
    }

    // 1. Dopey Finisher (strictly 5 pairs + 1 Tris): bottomCard is the exact 1 card needed
    const dopeyWithBottom =
      playerHand.length === 12
        ? isExact13CardDopey([...playerHand, bottomCard], allowSameRankDopey)
        : playerHand.length === 13 &&
          playerHand.some((_, dropIdx) =>
            isExact13CardDopey(
              [...playerHand.filter((__, idx) => idx !== dropIdx), bottomCard],
              allowSameRankDopey
            )
          );
    if (dopeyWithBottom) return true;

    // 2. Meld Finisher: bottomCard is the exact 1 card needed to finish (all 14 meld OR 13 meld + 1 discard)
    const partWith = partitionValidMelds([...playerHand, bottomCard]);
    if (partWith.remaining.length === 0 && partWith.melds.length > 0 && partWith.totalPoints >= 41) {
      return true;
    }
    if (playerHand.length >= 12) {
      return playerHand.some((_, dropIdx) => {
        const sub = [...playerHand.filter((__, idx) => idx !== dropIdx), bottomCard];
        const p = partitionValidMelds(sub);
        return p.remaining.length === 0 && p.melds.length > 0 && p.totalPoints >= 41;
      });
    }
    return false;
  }, [playerHand, bottomCard, hasMelded, currentTurn, hasDrawn, allowSameRankDopey]);

  // Bottom Card Finisher Detection + Dopey Detection for Action Stack
  const dopeyReadyInfo = useMemo(() => {
    if (hasMelded || currentTurn !== 0) return { isDopey: false, isJokerFinished: false };
    return checkDopey(playerHand, undefined, allowSameRankDopey);
  }, [playerHand, hasMelded, currentTurn, allowSameRankDopey]);

  // Bottom Card Finisher Click -> Instant Win!
  const handleBottomCardFinisherClick = () => {
    if (isSelfSuspended) return;
    if (!isBottomCardFinisherReady) {
      raminoAudio.playBuzzer();
      triggerNotification(t.notifyBottomNotReady);
      return;
    }

    if (activeMultiplayerRoomCode) {
      void sendRaminoGameAction('bottom_win');
      return;
    }

    const combined = [...playerHand, bottomCard];
    const isDopeyViaBottom =
      (playerHand.length === 12 && isExact13CardDopey(combined, allowSameRankDopey)) ||
      (playerHand.length === 13 &&
        playerHand.some((_, dropIdx) =>
          isExact13CardDopey(
            [...playerHand.filter((__, idx) => idx !== dropIdx), bottomCard],
            allowSameRankDopey
          )
        ));
    const isBottomJoker = Boolean(bottomCard.isJoker || bottomCard.rank === 'JOKER');
    const dopeyMult = isDopeyViaBottom ? (isBottomJoker ? 3 : 2) : 1;
    const bottomMode: 'bottom_dopey_joker' | 'bottom_dopey' | 'bottom_normal' = isDopeyViaBottom
      ? isBottomJoker
        ? 'bottom_dopey_joker'
        : 'bottom_dopey'
      : 'bottom_normal';
    triggerRoundWin({
      winnerId: 'self',
      winnerName: playerName,
      dopeyMultiplier: dopeyMult,
      jokerFinish: isBottomJoker,
      customFinishMode: bottomMode,
      winnerCards: playerHand,
      closingCard: bottomCard,
      customTitle: isDopeyViaBottom && isBottomJoker
        ? t.winBottomJokerDopey(bottomCard.suit)
        : isDopeyViaBottom
        ? t.winBottomDopey(`${bottomCard.rank}${bottomCard.suit}`)
        : t.winBottomNormal(`${bottomCard.rank}${bottomCard.suit}`),
    });
  };

  // Pure helper: Partition older completed 4-suit sets into Closed Set Badges (IMG_3905) whenever a new meld happens!
  const partitionCollapsedFourSuitSets = (
    melds: MeldGroup[],
    currentSeq: number
  ): { remainingMelds: MeldGroup[]; badgesToAdd: ClosedSetBadge[] } => {
    const badgesToAdd: ClosedSetBadge[] = [];
    const remainingMelds: MeldGroup[] = [];

    for (const m of melds) {
      if (m.type === 'set' && isAllFourSuitsClosedSet(m.cards) && m.meldTurnSeq < currentSeq) {
        const rank = m.rank || m.cards[0].rank;
        badgesToAdd.push({
          id: `closed_${m.id}`,
          rank,
          ownerId: m.ownerId,
          ownerColor: m.ownerColor,
        });
      } else {
        remainingMelds.push(m);
      }
    }

    return { remainingMelds, badgesToAdd };
  };

  // Helper: Shuffle Discard Pile (except top card) back into Draw Deck — unlimited times until someone wins
  const reshuffleDiscardIntoDeck = (
    discardSource: PlayingCard[],
    silent = false
  ): PlayingCard[] => {
    if (discardSource.length <= 1) return [];
    const topCard = discardSource[discardSource.length - 1];
    const pool = [...discardSource.slice(0, -1)];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    deckCardsRef.current = pool;
    discardPileRef.current = [topCard];
    setDeckCards(pool);
    setDiscardPile([topCard]);
    setReshuffleCount((c) => c + 1);
    if (!silent) {
      raminoAudio.playSwap();
      triggerNotification(t.notifyReshuffled);
    }
    return pool;
  };

  // Post Day 1-Card Cut & Sequential Seat Selection (Available in Private Tables after 5+ games)
  const applyAcceptedPostDay = (source: 'header' | 'winner') => {
    const cutDeck = buildShuffledDeck(1).filter((c) => !c.isJoker);
    const usedRanks = new Set<string>();
    const pickUniqueCut = () => {
      for (const c of cutDeck) {
        if (!usedRanks.has(c.rank)) {
          usedRanks.add(c.rank);
          return c;
        }
      }
      return cutDeck[0];
    };

    const activeOpps = opponentsRef.current.slice(0, playerSeatCount - 1);
    const rawEntries = [
      {
        id: 'self',
        name: playerName,
        avatarLetter: playerName[0]?.toUpperCase() || 'P',
        avatarColor: 'bg-amber-400',
        card: pickUniqueCut(),
        rankOrder: 0,
        pickedSeat: null as number | null,
        isSelf: true,
      },
      ...activeOpps.map((o) => ({
        id: o.id,
        name: o.name,
        avatarLetter: o.avatarLetter,
        avatarColor: o.avatarColor,
        card: pickUniqueCut(),
        rankOrder: 0,
        pickedSeat: null as number | null,
        isSelf: false,
      })),
    ];

    rawEntries.sort((a, b) => (CUT_RANK_ORDER[b.card.rank] || 0) - (CUT_RANK_ORDER[a.card.rank] || 0));
    rawEntries.forEach((e, idx) => {
      e.rankOrder = idx + 1;
    });

    const activeTurnOppId = source === 'header' && currentTurn > 0 ? opponentsRef.current[currentTurn - 1]?.id || null : null;
    const prevDealerName = winnerCelebration?.winnerName || ceremonyDealer;

    setPostDayRequest(null);
    setWinnerCelebration(null);
    setPostDaySeatPick({
      source,
      revealedCount: 0,
      currentPickerIdx: 0,
      currentPickerId: rawEntries[0]?.id || null,
      currentPickerName: rawEntries[0]?.name || null,
      isMyPickTurn: false,
      entries: rawEntries,
      chosenSeats: Array.from({ length: rawEntries.length }, () => null),
      completed: false,
      prevDealerName,
      activeTurnOppId,
    });
    setView('postday_pick');
    raminoAudio.playSwap();
  };

  const applyLocalChosenPostDaySeats = (
    pickSnap: NonNullable<typeof postDaySeatPick>
  ) => {
    const seats = pickSnap.chosenSeats;
    const selfSeatIdx = seats.findIndex((s) => s?.id === 'self');
    const n = seats.length;
    const orderedOppsFromSelf: RaminoOpponent[] = [];
    const oppById = new Map(opponentsRef.current.map((o) => [o.id, o]));
    for (let step = 1; step < n; step++) {
      const seatOccupant = seats[(Math.max(0, selfSeatIdx) + step) % n];
      if (seatOccupant && seatOccupant.id !== 'self') {
        const oppObj = oppById.get(seatOccupant.id);
        if (oppObj) orderedOppsFromSelf.push(oppObj);
      }
    }

    if (orderedOppsFromSelf.length === opponentsRef.current.length) {
      opponentsRef.current = orderedOppsFromSelf;
      setOpponents(orderedOppsFromSelf);
      const activeSeats = orderedOppsFromSelf.map((o) => ({
        id: o.id,
        name: o.name,
        avatarLetter: o.avatarLetter,
        avatarColor: o.avatarColor,
      }));
      const activeIds = new Set(activeSeats.map((a) => a.id));
      const rest = tableSeatOrderRef.current.filter((p) => !activeIds.has(p.id));
      const nextSeatOrder = [...activeSeats, ...rest];
      tableSeatOrderRef.current = nextSeatOrder;
      setTableSeatOrder(nextSeatOrder);

      if (pickSnap.source === 'header' && pickSnap.activeTurnOppId) {
        const newIdx = orderedOppsFromSelf.findIndex((o) => o.id === pickSnap.activeTurnOppId);
        if (newIdx !== -1) setCurrentTurn(newIdx + 1);
      }
    }

    privateRoundCountRef.current = 1;
    setPrivateRoundCount(1);
    raminoAudio.playVictory();
    triggerNotification(t.notifyPostDayApplied);

    setTimeout(() => {
      setPostDaySeatPick(null);
      if (pickSnap.source === 'winner') {
        const dealer = pickSnap.prevDealerName || playerName;
        if (balanceRef.current < selectedStake) {
          raminoAudio.playBuzzer();
          triggerNotification(t.notifyInsufficientNext);
          setView('lobby');
          return;
        }
        adjustWalletBalance(-selectedStake, `Ramino Round (${selectedStake} ETB)`);
        dealRoundWithDealer(dealer);
      } else {
        setView('game');
      }
    }, 1050);
  };

  const handlePostDaySeatClick = (seatIndex: number) => {
    if (activeMultiplayerRoomCode) {
      void sendRaminoGameAction('postday_pick_seat', { seatIndex });
      return;
    }
    if (!postDaySeatPick || postDaySeatPick.completed) return;
    if (postDaySeatPick.revealedCount < postDaySeatPick.entries.length) return;
    const activeEntry = postDaySeatPick.entries[postDaySeatPick.currentPickerIdx];
    if (!activeEntry || activeEntry.id !== 'self') return;
    if (postDaySeatPick.chosenSeats[seatIndex] !== null) return;

    raminoAudio.playCardSnap();
    const nextChosen = [...postDaySeatPick.chosenSeats];
    nextChosen[seatIndex] = {
      id: activeEntry.id,
      name: activeEntry.name,
      avatarLetter: activeEntry.avatarLetter,
      avatarColor: activeEntry.avatarColor,
      isSelf: true,
    };
    const nextEntries = postDaySeatPick.entries.map((e, i) =>
      i === postDaySeatPick.currentPickerIdx ? { ...e, pickedSeat: seatIndex } : e
    );
    let nextPickerIdx = postDaySeatPick.currentPickerIdx + 1;

    if (nextPickerIdx === nextEntries.length - 1) {
      const lastEntry = nextEntries[nextPickerIdx];
      const remIdx = nextChosen.findIndex((s) => s === null);
      if (lastEntry && remIdx !== -1) {
        nextChosen[remIdx] = {
          id: lastEntry.id,
          name: lastEntry.name,
          avatarLetter: lastEntry.avatarLetter,
          avatarColor: lastEntry.avatarColor,
          isSelf: lastEntry.isSelf,
        };
        nextEntries[nextPickerIdx] = { ...lastEntry, pickedSeat: remIdx };
        nextPickerIdx = nextEntries.length;
      }
    }

    const done = nextPickerIdx >= nextEntries.length;
    const nextEntry = !done ? nextEntries[nextPickerIdx] : null;
    const nextPickState = {
      ...postDaySeatPick,
      entries: nextEntries,
      chosenSeats: nextChosen,
      currentPickerIdx: nextPickerIdx,
      currentPickerId: nextEntry?.id || null,
      currentPickerName: nextEntry?.name || null,
      isMyPickTurn: Boolean(nextEntry && nextEntry.id === 'self' && !done),
      completed: done,
    };
    setPostDaySeatPick(nextPickState);
    if (done) {
      applyLocalChosenPostDaySeats(nextPickState);
    }
  };

  // Solo/Bot Post Day 1-Card Cut Reveal + Sequential Bot Seat Auto-Pick
  useEffect(() => {
    if (view !== 'postday_pick' || activeMultiplayerRoomCode || !postDaySeatPick || postDaySeatPick.completed) {
      return;
    }
    const total = postDaySeatPick.entries.length;
    if (postDaySeatPick.revealedCount < total) {
      const timer = setTimeout(() => {
        raminoAudio.playCardSnap();
        setPostDaySeatPick((prev) => {
          if (!prev) return prev;
          const nextRev = prev.revealedCount + 1;
          const active = prev.entries[prev.currentPickerIdx];
          return {
            ...prev,
            revealedCount: nextRev,
            isMyPickTurn: nextRev >= total && !prev.completed && active?.id === 'self',
          };
        });
      }, 650);
      return () => clearTimeout(timer);
    }

    const active = postDaySeatPick.entries[postDaySeatPick.currentPickerIdx];
    if (active && active.id !== 'self') {
      const timer = setTimeout(() => {
        setPostDaySeatPick((prev) => {
          if (!prev || prev.completed || prev.revealedCount < prev.entries.length) return prev;
          const curEntry = prev.entries[prev.currentPickerIdx];
          if (!curEntry || curEntry.id === 'self') return prev;
          const openIndices = prev.chosenSeats
            .map((s, idx) => (s === null ? idx : -1))
            .filter((idx) => idx !== -1);
          if (openIndices.length === 0) return prev;
          const pickSeat = openIndices[Math.floor(Math.random() * openIndices.length)];
          raminoAudio.playCardSnap();

          const nextChosen = [...prev.chosenSeats];
          nextChosen[pickSeat] = {
            id: curEntry.id,
            name: curEntry.name,
            avatarLetter: curEntry.avatarLetter,
            avatarColor: curEntry.avatarColor,
            isSelf: false,
          };
          const nextEntries = prev.entries.map((e, i) =>
            i === prev.currentPickerIdx ? { ...e, pickedSeat: pickSeat } : e
          );
          let nextIdx = prev.currentPickerIdx + 1;

          if (nextIdx === nextEntries.length - 1) {
            const lastEntry = nextEntries[nextIdx];
            const remIdx = nextChosen.findIndex((s) => s === null);
            if (lastEntry && remIdx !== -1) {
              nextChosen[remIdx] = {
                id: lastEntry.id,
                name: lastEntry.name,
                avatarLetter: lastEntry.avatarLetter,
                avatarColor: lastEntry.avatarColor,
                isSelf: lastEntry.isSelf,
              };
              nextEntries[nextIdx] = { ...lastEntry, pickedSeat: remIdx };
              nextIdx = nextEntries.length;
            }
          }

          const done = nextIdx >= nextEntries.length;
          const nextEntry = !done ? nextEntries[nextIdx] : null;
          const nextState = {
            ...prev,
            entries: nextEntries,
            chosenSeats: nextChosen,
            currentPickerIdx: nextIdx,
            currentPickerId: nextEntry?.id || null,
            currentPickerName: nextEntry?.name || null,
            isMyPickTurn: Boolean(nextEntry && nextEntry.id === 'self' && !done),
            completed: done,
          };
          if (done) {
            setTimeout(() => applyLocalChosenPostDaySeats(nextState), 50);
          }
          return nextState;
        });
      }, 850);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    view,
    activeMultiplayerRoomCode,
    postDaySeatPick?.revealedCount,
    postDaySeatPick?.currentPickerIdx,
    postDaySeatPick?.completed,
  ]);

  const requestPostDayConsensus = (source: 'header' | 'winner') => {
    if (!isPrivateRoomGame || privateRoundCountRef.current < 5) return;
    raminoAudio.playSwap();

    if (activeMultiplayerRoomCode) {
      void sendRaminoGameAction('postday_request', { source });
      return;
    }

    setPostDayRequest({
      requestedBy: playerName,
      source,
      acceptedIds: [playerName],
      needsMyAccept: false,
      allAccepted: false,
    });

    if (gameWsRef.current?.readyState === WebSocket.OPEN && activePrivateRoomCode) {
      gameWsRef.current.send(
        JSON.stringify({
          type: 'ramino:postday:request',
          roomCode: activePrivateRoomCode,
          playerName,
          source,
        })
      );
    }

    // Seated opponents sequentially accept the Post Day request
    const seatedNames = opponentsRef.current.map((o) => o.name);
    seatedNames.forEach((oppName, idx) => {
      setTimeout(() => {
        setPostDayRequest((prev) => {
          if (!prev) return prev;
          const nextAcc = prev.acceptedIds.includes(oppName)
            ? prev.acceptedIds
            : [...prev.acceptedIds, oppName];
          const done = nextAcc.length >= 1 + seatedNames.length;
          return { ...prev, acceptedIds: nextAcc, allAccepted: done };
        });
        raminoAudio.playCardSnap();
        if (idx === seatedNames.length - 1) {
          setTimeout(() => applyAcceptedPostDay(source), 550);
        }
      }, 420 * (idx + 1));
    });
  };

  const handleAcceptIncomingPostDay = () => {
    if (!postDayRequest) return;
    raminoAudio.playCardSnap();
    if (activeMultiplayerRoomCode) {
      void sendRaminoGameAction('postday_accept');
      return;
    }
    if (gameWsRef.current?.readyState === WebSocket.OPEN && activePrivateRoomCode) {
      gameWsRef.current.send(
        JSON.stringify({
          type: 'ramino:postday:accept',
          roomCode: activePrivateRoomCode,
          playerName,
        })
      );
    }
    const seatedNames = opponentsRef.current.map((o) => o.name);
    setPostDayRequest((prev) =>
      prev
        ? {
            ...prev,
            needsMyAccept: false,
            acceptedIds: prev.acceptedIds.includes(playerName)
              ? prev.acceptedIds
              : [...prev.acceptedIds, playerName],
          }
        : prev
    );
    seatedNames.forEach((oppName, idx) => {
      setTimeout(() => {
        setPostDayRequest((prev) => {
          if (!prev) return prev;
          const nextAcc = prev.acceptedIds.includes(oppName)
            ? prev.acceptedIds
            : [...prev.acceptedIds, oppName];
          const done = nextAcc.length >= 1 + seatedNames.length;
          return { ...prev, acceptedIds: nextAcc, allAccepted: done };
        });
        if (idx === seatedNames.length - 1) {
          setTimeout(() => applyAcceptedPostDay(postDayRequest.source), 550);
        }
      }, 360 * (idx + 1));
    });
  };

  // Draw from Deck (auto-reshuffles discard pile as many times as needed until someone wins)
  const handleDrawFromDeck = () => {
    if (isSelfSuspended) return;
    if (currentTurn !== 0) {
      raminoAudio.playBuzzer();
      triggerNotification(t.notifyWaitTurn);
      return;
    }
    if (hasDrawn) {
      raminoAudio.playBuzzer();
      triggerNotification(t.notifyAlreadyDrawn);
      return;
    }

    if (activeMultiplayerRoomCode) {
      void sendRaminoGameAction('draw_deck');
      return;
    }

    let sourceDeck = [...deckCardsRef.current];
    if (sourceDeck.length === 0) {
      if (discardPileRef.current.length <= 1) {
        triggerNotification(t.notifyDeckEmpty);
        return;
      }
      sourceDeck = reshuffleDiscardIntoDeck(discardPileRef.current);
    }

    if (sourceDeck.length === 0) return;

    const drawn = sourceDeck[0];
    const nextDeck = sourceDeck.slice(1);
    raminoAudio.playDraw();
    deckCardsRef.current = nextDeck;
    setDeckCards(nextDeck);
    if (nextDeck.length === 0 && discardPileRef.current.length > 1) {
      reshuffleDiscardIntoDeck(discardPileRef.current);
    }
    setPlayerHand((prev) => [...prev, drawn]);
    setHasDrawn(true);
    setDrawnFromDiscardCard(null);
    triggerNotification(t.notifyCardDrawn(`${drawn.rank}${drawn.suit}`));
  };

  // Draw from Discard Pile
  const handleDrawFromDiscard = () => {
    if (isSelfSuspended) return;
    if (currentTurn !== 0) {
      raminoAudio.playBuzzer();
      triggerNotification(t.notifyWaitTurn);
      return;
    }
    if (hasDrawn) {
      raminoAudio.playBuzzer();
      triggerNotification(t.notifyAlreadyDrawn);
      return;
    }
    if (discardPile.length === 0) return;

    if (activeMultiplayerRoomCode) {
      void sendRaminoGameAction('draw_discard');
      return;
    }

    const top = discardPile[discardPile.length - 1];
    raminoAudio.playDraw();
    setPlayerHand((prev) => [...prev, top]);
    const nextDiscard = discardPile.slice(0, -1);
    discardPileRef.current = nextDiscard;
    setDiscardPile(nextDiscard);
    setHasDrawn(true);
    setDrawnFromDiscardCard(top);
    if (!hasMelded) {
      triggerNotification(t.notifyDiscardPickedNeedMeld(`${top.rank}${top.suit}`));
    } else {
      triggerNotification(t.notifyDiscardPickedFree(`${top.rank}${top.suit}`));
    }
  };

  // Return Picked-Up Discard Card
  const handleReturnDiscardCard = () => {
    if (!drawnFromDiscardCard || hasDiscarded) return;
    if (activeMultiplayerRoomCode) {
      void sendRaminoGameAction('return_discard');
      return;
    }
    raminoAudio.playCardSnap();
    const returned = drawnFromDiscardCard;
    const nextDiscard = [...discardPileRef.current, returned];
    discardPileRef.current = nextDiscard;
    setPlayerHand((prev) => prev.filter((c) => c.id !== returned.id));
    setDiscardPile(nextDiscard);
    setSelectedCardIds((prev) => {
      const next = new Set(prev);
      next.delete(returned.id);
      return next;
    });
    setHasDrawn(false);
    setDrawnFromDiscardCard(null);
    triggerNotification(t.notifyReturnedDiscard(`${returned.rank}${returned.suit}`));
  };

  // Meld
  const handleMeldClick = () => {
    if (isSelfSuspended) return;
    if (currentTurn !== 0) {
      raminoAudio.playBuzzer();
      triggerNotification(t.notifyMeldTurnOnly);
      return;
    }
    if (!calculatedMeldStats.canMeld) {
      raminoAudio.playBuzzer();
      triggerNotification(t.notifyMeldNeed41(calculatedMeldStats.points));
      return;
    }

    if (activeMultiplayerRoomCode) {
      const selectedIdsArr = selectedCardIds.size >= 3 ? Array.from(selectedCardIds) : [];
      void sendRaminoGameAction('meld', { cardIds: selectedIdsArr }).then((ok) => {
        if (ok) setSelectedCardIds(new Set());
      });
      return;
    }

    const selectedCards = playerHand.filter((c) => selectedCardIds.has(c.id));
    let newMeldGroups: { type: 'set' | 'run'; cards: PlayingCard[] }[] = [];

    if (selectedCards.length >= 3) {
      if (isValidSet(selectedCards)) {
        newMeldGroups = [{ type: 'set', cards: selectedCards }];
      } else if (isValidRun(selectedCards)) {
        newMeldGroups = [{ type: 'run', cards: normalizeRunCardsOrder(selectedCards, true) }];
      } else {
        const handPos = new Map(playerHand.map((c, idx) => [c.id, idx]));
        const part = partitionValidMelds(selectedCards);
        newMeldGroups = part.melds.map((m) => {
          if (m.type !== 'run') return { type: m.type, cards: m.cards };
          const inHandOrder = [...m.cards].sort(
            (a, b) => (handPos.get(a.id) ?? 0) - (handPos.get(b.id) ?? 0)
          );
          return { type: m.type, cards: normalizeRunCardsOrder(inHandOrder, true) };
        });
      }
    } else {
      const part = partitionValidMelds(playerHand);
      newMeldGroups = part.melds.map((m) => ({
        type: m.type,
        cards: m.type === 'run' ? normalizeRunCardsOrder(m.cards, false) : m.cards,
      }));
    }

    if (newMeldGroups.length === 0) return;

    const nextSeq = meldTurnCounterRef.current + 1;
    meldTurnCounterRef.current = nextSeq;
    setMeldTurnCounter(nextSeq);

    const addedMelds: MeldGroup[] = newMeldGroups.map((g, idx) => ({
      id: `meld_${Date.now()}_${idx}`,
      type: g.type,
      rank: g.cards.find((c) => !c.isJoker)?.rank,
      suit: g.cards.find((c) => !c.isJoker)?.suit,
      cards: g.cards,
      ownerId: 'self',
      ownerColor: 'border-amber-400',
      meldTurnSeq: nextSeq,
    }));

    const meldedIds = new Set(newMeldGroups.flatMap((g) => g.cards.map((c) => c.id)));
    const nextHand = playerHand.filter((c) => !meldedIds.has(c.id));

    const { remainingMelds, badgesToAdd } = partitionCollapsedFourSuitSets(tableMeldsRef.current, nextSeq);
    const updatedTableMelds = [...remainingMelds, ...addedMelds];
    tableMeldsRef.current = updatedTableMelds;

    raminoAudio.playVictory();
    setTableMelds(updatedTableMelds);
    if (badgesToAdd.length > 0) {
      const nextBadges = [...closedSetBadgesRef.current, ...badgesToAdd];
      closedSetBadgesRef.current = nextBadges;
      setClosedSetBadges(nextBadges);
    }
    setPlayerHand(nextHand);
    setSelectedCardIds(new Set());
    setHasMelded(true);
    setDrawnFromDiscardCard(null);
    triggerNotification(t.notifyMeldedOk(calculatedMeldStats.points));

    if (nextHand.length === 0) {
      handleFinalWinCheck(nextHand);
    }
  };

  // Layoff 1 selected card (including Joker!) onto an existing table meld OR Swap Joker
  const handleTableMeldClick = (meldId: string, cardIdx: number) => {
    const targetMeld = tableMelds.find((m) => m.id === meldId);
    if (!targetMeld) return;
    const targetCard = targetMeld.cards[cardIdx];

    // Case 1: Player selected 1 card in hand -> Layoff onto table meld (Natural card OR Joker!) OR direct swap if matching Joker
    if (selectedCardIds.size === 1) {
      if (!hasMelded) {
        raminoAudio.playBuzzer();
        triggerNotification(t.notifyLayoffBeforeMeld);
        return;
      }
      const [selId] = Array.from(selectedCardIds);
      const selCard = playerHand.find((c) => c.id === selId);
      if (!selCard) return;

      // 1A: Selected card is a JOKER -> Layoff Joker onto Set (<4) or Run (<13)!
      if (selCard.isJoker) {
        let updatedCards: PlayingCard[] | null = null;
        if (targetMeld.type === 'set') {
          if (targetMeld.cards.length >= 4) {
            raminoAudio.playBuzzer();
            triggerNotification(t.notifySetFull4);
            return;
          }
          updatedCards = [...targetMeld.cards, selCard];
        } else {
          updatedCards = insertCardIntoRunMeld(targetMeld.cards, selCard, cardIdx);
          if (!updatedCards) {
            raminoAudio.playBuzzer();
            triggerNotification(t.notifyNoMoreJokersRun);
            return;
          }
        }

        if (activeMultiplayerRoomCode) {
          void sendRaminoGameAction('layoff_card', { meldId, cardId: selId, cardIdx }).then((ok) => {
            if (ok) setSelectedCardIds(new Set());
          });
          return;
        }

        raminoAudio.playCardSnap();
        const nextHand = playerHand.filter((c) => c.id !== selId);
        const nextTableMelds = tableMeldsRef.current.map((m) =>
          m.id === meldId ? { ...m, cards: updatedCards! } : m
        );
        tableMeldsRef.current = nextTableMelds;
        setPlayerHand(nextHand);
        setSelectedCardIds(new Set());
        setDrawnFromDiscardCard(null);
        setTableMelds(nextTableMelds);
        triggerNotification(t.notifyJokerLaidOff);
        if (nextHand.length === 0) handleFinalWinCheck(nextHand);
        return;
      }

      // 1B: Clicked a Joker on table while holding its exact replacement natural card -> Swap!
      if (targetCard.isJoker) {
        const info = getTableMeldJokerInfo(targetMeld, cardIdx);
        const nonJokers = targetMeld.cards.filter((c) => !c.isJoker);
        const matchesSwap =
          info &&
          selCard.rank === info.rank &&
          (targetMeld.type === 'run'
            ? selCard.suit === info.suit
            : !nonJokers.some((c) => c.suit === selCard.suit));
        if (matchesSwap) {
          if (activeMultiplayerRoomCode) {
            void sendRaminoGameAction('swap_joker', { meldId, cardIdx, cardId: selId }).then((ok) => {
              if (ok) setSelectedCardIds(new Set());
            });
            return;
          }
          raminoAudio.playSwap();
          const nextTableMelds = tableMeldsRef.current.map((m) => {
            if (m.id !== meldId) return m;
            const updated = [...m.cards];
            updated[cardIdx] = selCard;
            return { ...m, cards: updated };
          });
          tableMeldsRef.current = nextTableMelds;
          setPlayerHand((prev) => prev.map((c) => (c.id === selId ? targetCard : c)));
          setSelectedCardIds(new Set());
          setDrawnFromDiscardCard(null);
          setTableMelds(nextTableMelds);
          triggerNotification(t.notifyJokerSwapped);
          return;
        }
      }

      // 1C: Normal natural card layoff onto Set or Run
      let combined: PlayingCard[] | null = null;
      if (targetMeld.type === 'set') {
        const candidate = [...targetMeld.cards, selCard];
        if (isValidSet(candidate)) combined = candidate;
      } else {
        combined = insertCardIntoRunMeld(targetMeld.cards, selCard, cardIdx);
      }

      if (!combined) {
        raminoAudio.playBuzzer();
        triggerNotification(t.notifyMismatchGroup);
        return;
      }

      if (activeMultiplayerRoomCode) {
        void sendRaminoGameAction('layoff_card', { meldId, cardId: selId, cardIdx }).then((ok) => {
          if (ok) setSelectedCardIds(new Set());
        });
        return;
      }

      raminoAudio.playCardSnap();
      const nextHand = playerHand.filter((c) => c.id !== selId);
      const nextTableMelds = tableMeldsRef.current.map((m) =>
        m.id === meldId ? { ...m, cards: combined! } : m
      );
      tableMeldsRef.current = nextTableMelds;
      setPlayerHand(nextHand);
      setSelectedCardIds(new Set());
      setDrawnFromDiscardCard(null);
      setTableMelds(nextTableMelds);
      triggerNotification(t.notifyCardLaidOff(`${selCard.rank}${selCard.suit}`));
      if (nextHand.length === 0) handleFinalWinCheck(nextHand);
      return;
    }

    // Case 2: No single card selected & clicking a Joker on table -> Auto-find matching natural card in hand & swap
    if (targetCard.isJoker) {
      if (!hasMelded) {
        raminoAudio.playBuzzer();
        triggerNotification(t.notifyLayoffBeforeMeld);
        return;
      }
      const info = getTableMeldJokerInfo(targetMeld, cardIdx);
      const nonJokers = targetMeld.cards.filter((c) => !c.isJoker);
      const requiredRank = info?.rank || targetMeld.rank || 'J';
      const matchIdx = playerHand.findIndex((c) => {
        if (c.isJoker || c.rank !== requiredRank) return false;
        if (targetMeld.type === 'run' && info?.suit) {
          return c.suit === info.suit;
        }
        return !nonJokers.some((n) => n.suit === c.suit);
      });
      if (matchIdx === -1) {
        raminoAudio.playBuzzer();
        const label = targetMeld.type === 'run' && info?.suit ? `${requiredRank}${info.suit}` : requiredRank;
        triggerNotification(t.notifyNeedSwapNatural(label));
        return;
      }
      if (activeMultiplayerRoomCode) {
        void sendRaminoGameAction('swap_joker', { meldId, cardIdx });
        return;
      }
      const naturalCard = playerHand[matchIdx];
      raminoAudio.playSwap();
      setPlayerHand((prev) => {
        const copy = [...prev];
        copy.splice(matchIdx, 1, targetCard);
        return copy;
      });
      setTableMelds((prev) =>
        prev.map((m) => {
          if (m.id !== meldId) return m;
          const updated = [...m.cards];
          updated[cardIdx] = naturalCard;
          return { ...m, cards: updated };
        })
      );
      triggerNotification(t.notifyJokerSwapped);
    }
  };

  // Unified Round Win Handler (Winner Deals Next + Joker Finish 2x / 3-Streak+Joker 3x / Dopey 2x / Dopey+Joker 3x)
  const triggerRoundWin = ({
    winnerId,
    winnerName,
    dopeyMultiplier,
    jokerFinish = false,
    customTitle,
    customFinishMode,
    winnerCards = [],
    closingCard = null,
  }: {
    winnerId: string;
    winnerName: string;
    dopeyMultiplier: number;
    jokerFinish?: boolean;
    customTitle?: string;
    customFinishMode?:
      | 'normal'
      | 'joker_finish'
      | 'streak_joker'
      | 'dopey'
      | 'dopey_joker'
      | 'bottom_normal'
      | 'bottom_dopey'
      | 'bottom_dopey_joker'
      | 'timeout_win';
    winnerCards?: PlayingCard[];
    closingCard?: PlayingCard | null;
  }) => {
    clearLocalSuspendedGame();
    setIsWinnerModalMinimized(false);
    const pot = selectedStake * playerSeatCount;
    const rake = pot * 0.1;

    // Winner always becomes the next round's Dealer!
    setCeremonyDealer(winnerName);

    if (winnerId === 'self') {
      const prevStreak = winStreakRef.current;
      const nextStreak = prevStreak + 1;
      winStreakRef.current = nextStreak;
      setWinStreak(nextStreak);

      const isDopeyWin = dopeyMultiplier >= 2;
      const isJoker = Boolean(jokerFinish || dopeyMultiplier === 3);
      const isThreePlusStreak = prevStreak >= 3;

      let totalMultiplier = 1;
      let finishMode:
        | 'normal'
        | 'joker_finish'
        | 'streak_joker'
        | 'dopey'
        | 'dopey_joker'
        | 'bottom_normal'
        | 'bottom_dopey'
        | 'bottom_dopey_joker'
        | 'timeout_win' = 'normal';
      let resolvedDopeyMult = 1;
      let resolvedStreakMult = 1;
      let resolvedTitle = t.winTitleNormal;

      if (isDopeyWin && isJoker) {
        totalMultiplier = 3;
        resolvedDopeyMult = 3;
        finishMode = customFinishMode || 'dopey_joker';
        resolvedTitle = t.winTitleDopeyJoker;
      } else if (isDopeyWin) {
        totalMultiplier = 2;
        resolvedDopeyMult = 2;
        finishMode = customFinishMode || 'dopey';
        resolvedTitle = t.winTitleDopey;
      } else if (isThreePlusStreak && isJoker) {
        totalMultiplier = 3;
        resolvedStreakMult = 3;
        finishMode = 'streak_joker';
        resolvedTitle = t.winTitleStreakJoker(nextStreak);
      } else if (isJoker) {
        totalMultiplier = 2;
        finishMode = 'joker_finish';
        resolvedTitle = t.winTitleJokerFinish;
      } else if (isThreePlusStreak) {
        totalMultiplier = 2;
        resolvedStreakMult = 2;
        finishMode = customFinishMode || 'normal';
        resolvedTitle = t.winTitleStreak(nextStreak);
      } else if (customFinishMode) {
        finishMode = customFinishMode;
      }

      const showcase = extractLocalWinnerShowcaseGroups({
        winnerId,
        winnerHand: winnerCards,
        tableMelds: tableMeldsRef.current,
        closedSetBadges: closedSetBadgesRef.current,
        finishMode,
        closingCard,
      });

      const netWin = (pot - rake) * totalMultiplier;
      adjustWalletBalance(netWin, `Ramino Win (${totalMultiplier}x)`);

      raminoAudio.playVictory();
      setWinnerCelebration({
        show: true,
        title: customTitle || resolvedTitle,
        winnerId,
        winnerName,
        isOpponentWin: false,
        finishMode,
        multiplier: totalMultiplier,
        dopeyMultiplier: resolvedDopeyMult,
        streakMultiplier: resolvedStreakMult,
        streakCount: nextStreak,
        winAmount: netWin,
        rakeAmount: rake,
        winnerCards: showcase.winnerCards,
        winnerGroups: showcase.winnerGroups,
        winnerClosingCard: showcase.winnerClosingCard,
      });
    } else {
      // Loss resets consecutive win streak back to 0 AND deducts 2x (ዶፔይ/ሞንቴ) or 3x (ጎልደን) penalty from wallet!
      winStreakRef.current = 0;
      setWinStreak(0);
      const isDopeyLoss = dopeyMultiplier >= 2;
      const isJokerLoss = Boolean(jokerFinish || dopeyMultiplier >= 3);
      const lossMult =
        dopeyMultiplier >= 3 || (isDopeyLoss && isJokerLoss)
          ? 3
          : isDopeyLoss || isJokerLoss
          ? 2
          : 1;
      const resolvedLossMode =
        customFinishMode ||
        (lossMult >= 3
          ? 'dopey_joker'
          : isDopeyLoss
          ? 'dopey'
          : isJokerLoss
          ? 'joker_finish'
          : 'normal');
      const showcase = extractLocalWinnerShowcaseGroups({
        winnerId,
        winnerHand: winnerCards,
        tableMelds: tableMeldsRef.current,
        closedSetBadges: closedSetBadgesRef.current,
        finishMode: resolvedLossMode,
        closingCard,
      });
      const extraPenalty =
        lossMult > 1
          ? Math.min(balanceRef.current, Number((selectedStake * (lossMult - 1)).toFixed(2)))
          : 0;
      if (extraPenalty > 0) {
        adjustWalletBalance(
          -extraPenalty,
          lossMult >= 3
            ? `Ramino ጎልደን 3x Loss (-${extraPenalty} ETB)`
            : `Ramino ዶፔይ/ሞንቴ 2x Loss (-${extraPenalty} ETB)`
        );
      }
      raminoAudio.playBuzzer();
      setWinnerCelebration({
        show: true,
        title: t.loseTitle(winnerName, lossMult),
        winnerId,
        winnerName,
        isOpponentWin: true,
        finishMode: resolvedLossMode,
        multiplier: lossMult,
        dopeyMultiplier: dopeyMultiplier >= 2 ? dopeyMultiplier : 1,
        streakMultiplier: 1,
        streakCount: 0,
        winAmount: 0,
        rakeAmount: rake,
        lostPenalty: extraPenalty,
        winnerCards: showcase.winnerCards,
        winnerGroups: showcase.winnerGroups,
        winnerClosingCard: showcase.winnerClosingCard,
      });
    }
  };

  // Sequential Opponent Turns Runner (starts from given opponent index, wraps back to player turn 0)
  const runOpponentTurnsFrom = (startOppIdx: number, firstOpponentAlreadyHas14 = false) => {
    const epochAtStart = localGameEpochRef.current;
    const stepTurn = (oppIdx: number, skipDrawForOpeningDealer = false) => {
      if (epochAtStart !== localGameEpochRef.current) return;
      const activeOpps = opponentsRef.current;
      let nextIdx = oppIdx;
      while (nextIdx < activeOpps.length && activeOpps[nextIdx]?.isSuspended) {
        nextIdx += 1;
      }
      if (nextIdx >= activeOpps.length) {
        if (prevSelfSuspendedRef.current) {
          const firstBot = activeOpps.findIndex((o) => !o.isSuspended);
          if (firstBot !== -1) {
            stepTurn(firstBot, false);
          }
          return;
        }
        setCurrentTurn(0);
        setHasDiscarded(false);
        setHasDrawn(false);
        setTurnSeconds(120);
        triggerNotification(t.notifyYourTurnFull);
        return;
      }

      const opp = activeOpps[nextIdx];
      setCurrentTurn(nextIdx + 1);

      setTimeout(() => {
        if (epochAtStart !== localGameEpochRef.current) return;
        raminoAudio.playCardSnap();

        const latestOpp = opponentsRef.current[nextIdx] || opp;
        let oppHand = [...(latestOpp.hand || [])];

        if (!skipDrawForOpeningDealer) {
          // Draw 1 real card from deck (or reshuffle discard pile unlimited times if empty) — zero card duplication!
          let curDeck = [...deckCardsRef.current];
          if (curDeck.length === 0 && discardPileRef.current.length > 1) {
            curDeck = reshuffleDiscardIntoDeck(discardPileRef.current);
          }

          if (curDeck.length > 0) {
            oppHand.push(curDeck[0]);
            const nextDeck = curDeck.slice(1);
            deckCardsRef.current = nextDeck;
            setDeckCards(nextDeck);
          }
        }

        // Check if unmelded bot completed Dopey/Monte (5 pairs + 1 Tris) -> 2x ዶፔይ/ሞንቴ or 3x ጎልደን!
        let oppHasMelded = Boolean(latestOpp.hasMelded);
        if (!oppHasMelded) {
          const oppDopey = checkDopey(oppHand, undefined, allowSameRankDopey);
          if (oppDopey.isDopey) {
            let botDopeyClosing: PlayingCard | null = null;
            if (oppHand.length === 14) {
              const dropIdx = oppDopey.isJokerFinished
                ? oppHand.findIndex(
                    (c, idx) =>
                      (c.isJoker || c.rank === 'JOKER') &&
                      isExact13CardDopey(oppHand.filter((_, i) => i !== idx), allowSameRankDopey)
                  )
                : oppHand.findIndex((_, idx) =>
                    isExact13CardDopey(oppHand.filter((_, i) => i !== idx), allowSameRankDopey)
                  );
              if (dropIdx !== -1) {
                const [dropped] = oppHand.splice(dropIdx, 1);
                botDopeyClosing = dropped;
                const nextDiscard = [...discardPileRef.current, dropped];
                discardPileRef.current = nextDiscard;
                setDiscardPile(nextDiscard);
              }
            }
            const updatedDopeyOpps = opponentsRef.current.map((o, idx) =>
              idx === nextIdx ? { ...o, hand: oppHand, cardCount: oppHand.length, hasMelded: oppHasMelded } : o
            );
            opponentsRef.current = updatedDopeyOpps;
            setOpponents(updatedDopeyOpps);
            triggerRoundWin({
              winnerId: latestOpp.id,
              winnerName: latestOpp.name,
              dopeyMultiplier: oppDopey.isJokerFinished ? 3 : 2,
              jokerFinish: oppDopey.isJokerFinished,
              winnerCards: oppHand,
              closingCard: botDopeyClosing,
            });
            return;
          }
        }

        // Check if bot holds real valid melds (41+ pts if unmelded, or any valid meld if already melded)
        const oppEval = partitionValidMelds(oppHand);
        if (oppEval.melds.length > 0 && (oppHasMelded || oppEval.totalPoints >= 41)) {
          const nextS = meldTurnCounterRef.current + 1;
          meldTurnCounterRef.current = nextS;

          const botAddedMelds: MeldGroup[] = oppEval.melds.map((g, gIdx) => ({
            id: `bot_m_${nextS}_${gIdx}`,
            type: g.type,
            rank: g.cards.find((c) => !c.isJoker)?.rank,
            suit: g.cards.find((c) => !c.isJoker)?.suit,
            cards: g.cards,
            ownerId: latestOpp.id,
            ownerColor: 'border-sky-400',
            meldTurnSeq: nextS,
          }));

          const { remainingMelds, badgesToAdd } = partitionCollapsedFourSuitSets(tableMeldsRef.current, nextS);
          const nextMelds: MeldGroup[] = [...remainingMelds, ...botAddedMelds];
          tableMeldsRef.current = nextMelds;

          setMeldTurnCounter(nextS);
          setTableMelds(nextMelds);
          if (badgesToAdd.length > 0) {
            const nextBadges = [...closedSetBadgesRef.current, ...badgesToAdd];
            closedSetBadgesRef.current = nextBadges;
            setClosedSetBadges(nextBadges);
          }

          const meldedBotIds = new Set(oppEval.melds.flatMap((m) => m.cards.map((c) => c.id)));
          oppHand = oppHand.filter((c) => !meldedBotIds.has(c.id));
          oppHasMelded = true;
          triggerNotification(t.notifyOppMelded(latestOpp.name, oppEval.totalPoints));
        }

        // Discard 1 real non-joker card from bot's actual hand (if cards left)
        let botDiscardedJoker = false;
        let botClosingDiscard: PlayingCard | null = null;
        if (oppHand.length > 0) {
          const discardIdx = oppHand.findIndex((c) => !c.isJoker);
          const chosenIdx = discardIdx !== -1 ? discardIdx : 0;
          const [botDiscarded] = oppHand.splice(chosenIdx, 1);
          botClosingDiscard = botDiscarded || null;
          if (botDiscarded?.isJoker || botDiscarded?.rank === 'JOKER') {
            botDiscardedJoker = true;
          }
          const nextDiscard = [...discardPileRef.current, botDiscarded];
          discardPileRef.current = nextDiscard;
          setDiscardPile(nextDiscard);
          if (deckCardsRef.current.length === 0 && nextDiscard.length > 1 && oppHand.length > 0) {
            reshuffleDiscardIntoDeck(nextDiscard);
          }
        }

        const updatedOpps = opponentsRef.current.map((o, idx) =>
          idx === nextIdx ? { ...o, hand: oppHand, cardCount: oppHand.length, hasMelded: oppHasMelded } : o
        );
        opponentsRef.current = updatedOpps;
        setOpponents(updatedOpps);

        // If bot emptied their hand -> Bot wins round & becomes next Dealer!
        if (oppHand.length === 0) {
          triggerRoundWin({
            winnerId: latestOpp.id,
            winnerName: latestOpp.name,
            dopeyMultiplier: 1,
            jokerFinish: botDiscardedJoker,
            winnerCards: [],
            closingCard: botClosingDiscard,
          });
          return;
        }

        stepTurn(nextIdx + 1, false);
      }, 1400);
    };

    stepTurn(startOppIdx, firstOpponentAlreadyHas14);
  };

  // Discard Attempt (Strict Single Discard + Discard-Pickup Rule + Illegal Discard Rule + Opponent Turn Simulation)
  const handleDiscardAttempt = (cardId: string) => {
    if (isSelfSuspended) return;
    if (hasDiscarded) {
      raminoAudio.playBuzzer();
      triggerNotification(t.notifyAlreadyDiscarded);
      return;
    }
    if (currentTurn !== 0) {
      raminoAudio.playBuzzer();
      triggerNotification(t.notifyNotYourTurn);
      return;
    }
    if (!hasDrawn) {
      raminoAudio.playBuzzer();
      triggerNotification(t.notifyMustDrawFirst);
      return;
    }

    const cardToDiscard = playerHand.find((c) => c.id === cardId);
    if (!cardToDiscard) return;

    const nextHand = playerHand.filter((c) => c.id !== cardId);
    const closesDopeyWithDiscard =
      !hasMelded &&
      nextHand.length === 13 &&
      isExact13CardDopey(nextHand, allowSameRankDopey);

    const isJoker = cardToDiscard.isJoker || cardToDiscard.rank === 'JOKER';
    const closesDopeyWithJoker = closesDopeyWithDiscard && isJoker;

    // Before opening meld (!hasMelded): if player picked up from discard pile this turn,
    // they MUST meld OR return before discarding (unless closing Dopey with a Joker).
    // Once melded (hasMelded === true), they can play & discard freely!
    if (!hasMelded && drawnFromDiscardCard !== null && !closesDopeyWithJoker && nextHand.length > 0) {
      raminoAudio.playBuzzer();
      triggerNotification(t.notifyMustMeldOrReturn);
      return;
    }

    const isLastCard = playerHand.length === 1;
    const allCardsMatch = playerHand.every((c) => doesCardMatchTableMelds(c, tableMelds));
    const matchesTable = doesCardMatchTableMelds(cardToDiscard, tableMelds);

    if (matchesTable && !isJoker && !isLastCard && !allCardsMatch && !closesDopeyWithDiscard) {
      raminoAudio.playBuzzer();
      triggerNotification(t.notifyIllegalMatchingDiscard);
      return;
    }

    if (activeMultiplayerRoomCode) {
      void sendRaminoGameAction('discard', { cardId }).then((ok) => {
        if (ok) setSelectedCardIds(new Set());
      });
      return;
    }

    // Valid discard!
    raminoAudio.playCardSnap();
    const nextDiscardPile = [...discardPileRef.current, cardToDiscard];
    discardPileRef.current = nextDiscardPile;
    setPlayerHand(nextHand);
    setDiscardPile(nextDiscardPile);
    setSelectedCardIds(new Set());
    setHasDrawn(false);
    setDrawnFromDiscardCard(null);
    setHasDiscarded(true);

    // IMPORTANT: Discarding a normal (non-Joker) card while holding 13-card Dopey (5 pairs + 1 Tris)
    // does NOT auto-end the round — player stays on 5 pairs + 1 Tris and gets the chance to draw a Joker for Golden (3x)!
    if (nextHand.length === 0 || closesDopeyWithJoker) {
      handleFinalWinCheck(nextHand, cardToDiscard);
      return;
    }

    if (deckCardsRef.current.length === 0 && nextDiscardPile.length > 1) {
      reshuffleDiscardIntoDeck(nextDiscardPile);
    }

    if (closesDopeyWithDiscard) {
      triggerNotification(t.notifyDopeyHoldGolden);
    } else {
      triggerNotification(t.notifyDiscarded(`${cardToDiscard.rank}${cardToDiscard.suit}`));
    }
    runOpponentTurnsFrom(0);
  };

  // Final Win Check (Joker Finish 2x / 3-Streak+Joker 3x / Dopey 2x / Dopey+Joker 3x)
  const handleFinalWinCheck = (handSnapshot: PlayingCard[], closingCard?: PlayingCard | null) => {
    if (activeMultiplayerRoomCode) {
      void sendRaminoGameAction('dopey_win');
      return;
    }
    let cleanHand = [...handSnapshot];
    let resolvedClosing = closingCard || null;
    const dopey = checkDopey(cleanHand, resolvedClosing, allowSameRankDopey);
    if (dopey.isDopey && cleanHand.length === 14 && !resolvedClosing) {
      const dropIdx = dopey.isJokerFinished
        ? cleanHand.findIndex(
            (c, idx) =>
              (c.isJoker || c.rank === 'JOKER') &&
              isExact13CardDopey(cleanHand.filter((_, i) => i !== idx), allowSameRankDopey)
          )
        : cleanHand.findIndex((_, idx) =>
            isExact13CardDopey(cleanHand.filter((_, i) => i !== idx), allowSameRankDopey)
          );
      if (dropIdx !== -1) {
        const [dropped] = cleanHand.splice(dropIdx, 1);
        resolvedClosing = dropped;
        const nextDiscard = [...discardPileRef.current, dropped];
        discardPileRef.current = nextDiscard;
        setDiscardPile(nextDiscard);
        setPlayerHand(cleanHand);
      }
    }
    const dopeyMultiplier = dopey.isJokerFinished ? 3 : dopey.isDopey ? 2 : 1;
    const isJokerClosing = Boolean(
      resolvedClosing && (resolvedClosing.isJoker || resolvedClosing.rank === 'JOKER')
    );
    triggerRoundWin({
      winnerId: 'self',
      winnerName: playerName,
      dopeyMultiplier,
      jokerFinish: isJokerClosing,
      winnerCards: cleanHand,
      closingCard: resolvedClosing,
    });
  };

  // Smart Auto-Sort: Groups Tris (Sets) AND strictly ordered Catris (Runs) together at front,
  // then sorts remaining cards cleanly by rank order (2..10, J, Q, K, A) and suit!
  const handleAutoSort = () => {
    raminoAudio.playDraw();
    setPlayerHand((prev) => {
      const part = partitionValidMelds(prev);
      const groupedCards = part.melds.flatMap((m) =>
        m.type === 'run' ? normalizeRunCardsOrder(m.cards, false) : m.cards
      );
      const ungroupedNaturals = part.remaining.filter((c) => !c.isJoker);
      const ungroupedJokers = part.remaining.filter((c) => c.isJoker);

      ungroupedNaturals.sort((a, b) => {
        const rA = RANKS.indexOf(a.rank);
        const rB = RANKS.indexOf(b.rank);
        if (rA !== rB) return rA - rB;
        return a.suit.localeCompare(b.suit);
      });

      return [...groupedCards, ...ungroupedNaturals, ...ungroupedJokers];
    });
    triggerNotification(t.notifyAutoSorted);
  };

  // Tap Card: If card is inside a formed group (Set, Run, or Pair), elevate all cards in that group together;
  // tapping a Set/Run clears stray Pair/Single selections so Meld button stays accurate!
  const toggleSelectCard = (id: string) => {
    if (dragMovedRef.current) {
      dragMovedRef.current = false;
      return;
    }
    raminoAudio.playCardSnap();

    const grp = cardToGroupMap.get(id);
    if (grp) {
      const allSelected = grp.cardIds.every((cid) => selectedCardIds.has(cid));
      setSelectedCardIds((prev) => {
        const next = new Set<string>();
        prev.forEach((pid) => {
          const pGrp = cardToGroupMap.get(pid);
          if (!pGrp) return;
          if (grp.type === 'pair') {
            next.add(pid);
          } else if (pGrp.type !== 'pair') {
            next.add(pid);
          }
        });
        if (allSelected) {
          grp.cardIds.forEach((cid) => next.delete(cid));
        } else {
          grp.cardIds.forEach((cid) => next.add(cid));
        }
        return next;
      });
      return;
    }

    setSelectedCardIds((prev) => {
      if (prev.has(id)) {
        const next = new Set(prev);
        next.delete(id);
        return next;
      }
      const hadFormedGroupSelected = Array.from(prev).some((pid) => cardToGroupMap.has(pid));
      if (hadFormedGroupSelected) {
        // Check if this card completes/extends the selected group cleanly; if not, switch directly to selecting this 1 card for discard!
        const candidateIds = new Set(prev);
        candidateIds.add(id);
        const candidateCards = playerHand.filter((c) => candidateIds.has(c.id));
        const part = partitionValidMelds(candidateCards);
        if (part.melds.length > 0 && part.remaining.length === 0) {
          return candidateIds;
        }
        return new Set([id]);
      }
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  // Smooth Pointer Drag-and-Drop (Properly maps rotated Landscape coordinates!)
  const mapClientToContainer = (clientX: number, clientY: number) => {
    if (shouldRotateToLandscape && typeof window !== 'undefined') {
      return {
        x: clientY,
        y: viewportSize.w - clientX,
      };
    }
    return { x: clientX, y: clientY };
  };

  const handleCardPointerDown = (index: number, e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
    // Snapshot resting slot centers ONCE before any cards shift/fade so hover detection never flickers
    const slots: { index: number; cx: number; cy: number }[] = [];
    document.querySelectorAll('[data-hand-index]').forEach((node) => {
      const el = node as HTMLElement;
      const idxStr = el.dataset.handIndex;
      if (idxStr === undefined) return;
      const idxVal = parseInt(idxStr, 10);
      if (isNaN(idxVal)) return;
      const rect = el.getBoundingClientRect();
      const mappedSlot = mapClientToContainer(rect.left + rect.width / 2, rect.top + rect.height / 2);
      slots.push({
        index: idxVal,
        cx: mappedSlot.x,
        cy: mappedSlot.y,
      });
    });
    slots.sort((a, b) => a.index - b.index);
    dragSlotsRef.current = slots;

    dragStartPosRef.current = { x: e.clientX, y: e.clientY };
    lastDragEvalPosRef.current = { x: e.clientX, y: e.clientY };
    dragMovedRef.current = false;
    justDraggedRef.current = false;
    const mapped = mapClientToContainer(e.clientX, e.clientY);
    setDragCardState({
      index,
      card: playerHand[index],
      x: mapped.x,
      y: mapped.y,
    });
    setDragHoverTarget(index);
  };

  const handleCardPointerMove = (e: React.PointerEvent) => {
    if (!dragCardState) return;
    if (dragStartPosRef.current) {
      const dist = Math.hypot(e.clientX - dragStartPosRef.current.x, e.clientY - dragStartPosRef.current.y);
      if (dist > 8) {
        dragMovedRef.current = true;
        justDraggedRef.current = true;
      }
    }
    if (!dragMovedRef.current) return;

    const mapped = mapClientToContainer(e.clientX, e.clientY);
    setDragCardState((prev) => (prev ? { ...prev, x: mapped.x, y: mapped.y } : null));

    // Only re-evaluate drop slot when pointer actually moves > 4px to prevent stationary jitter
    if (lastDragEvalPosRef.current) {
      const delta = Math.hypot(
        e.clientX - lastDragEvalPosRef.current.x,
        e.clientY - lastDragEvalPosRef.current.y
      );
      if (delta < 4) return;
    }
    lastDragEvalPosRef.current = { x: e.clientX, y: e.clientY };

    const slots = dragSlotsRef.current;
    if (slots.length === 0) return;

    let bestIdx: number | null = null;
    let bestDist = Infinity;
    let currentDist = Infinity;
    for (const slot of slots) {
      const d = Math.hypot(mapped.x - slot.cx, (mapped.y - slot.cy) * 0.45);
      if (slot.index === dragHoverTarget) {
        currentDist = d;
      }
      if (d < bestDist) {
        bestDist = d;
        bestIdx = slot.index;
      }
    }

    // Apply 12px hysteresis so cards never flicker back and forth on boundaries
    if (
      bestIdx !== null &&
      bestIdx !== dragHoverTarget &&
      (dragHoverTarget === null || bestDist + 12 < currentDist)
    ) {
      setDragHoverTarget(bestIdx);
    }
  };

  const handleCardPointerUp = (e: React.PointerEvent) => {
    if (!dragCardState) return;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
    if (dragMovedRef.current && dragHoverTarget !== null && dragCardState.index !== dragHoverTarget) {
      raminoAudio.playCardSnap();
      setPlayerHand((prev) => {
        const next = [...prev];
        const [moved] = next.splice(dragCardState.index, 1);
        next.splice(dragHoverTarget, 0, moved);
        return next;
      });
      triggerNotification(t.notifyCardReordered);
    }
    setDragCardState(null);
    setDragHoverTarget(null);
    dragStartPosRef.current = null;
    lastDragEvalPosRef.current = null;
    dragSlotsRef.current = [];
    dragMovedRef.current = false;
    setTimeout(() => {
      justDraggedRef.current = false;
    }, 80);
  };

  // Lobby Actions: Create Server-Synced Public Room (+ Deduct Stake + Cancelable Refund)
  const handleCreateRoom = async () => {
    clearLocalSuspendedGame();
    if (balance < selectedStake) {
      raminoAudio.playBuzzer();
      triggerNotification(t.notifyInsufficientStake(selectedStake));
      return;
    }

    try {
      const res = await fetch(buildApiUrl('/api/ramino/rooms'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorId: myPlayerId,
          creatorPhone: playerPhone,
          creatorName: playerName,
          maxPlayers: playerSeatCount,
          stake: selectedStake,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok || !data.room) {
        raminoAudio.playBuzzer();
        triggerNotification(data?.error || t.notifyInsufficientStake(selectedStake));
        return;
      }
      heldWaitingStakeRef.current = selectedStake;
      adjustWalletBalance(-selectedStake, `Ramino Room ${data.room.name}`);
      if (Array.isArray(data.rooms)) {
        setOpenRooms(mapServerLobbyRooms(data.rooms));
      }
      setIsPrivateRoomGame(false);
      setActivePrivateRoomCode(null);
      setActiveTableStake(selectedStake);
      if (data.tableCode) {
        setActiveMultiplayerRoomCode(String(data.tableCode));
        activeMultiplayerRoomCodeRef.current = String(data.tableCode);
      }
      raminoAudio.playDraw();
      const roomNum = parseInt(String(data.room.name || '').replace('#', ''), 10) || 1000;
      triggerNotification(t.notifyRoomCreated(roomNum, selectedStake));
    } catch {
      raminoAudio.playBuzzer();
    }
  };

  // Cancel Created Room -> Server Delete & Immediate Refund
  const handleCancelCreatedRoom = async (room: RaminoRoom) => {
    try {
      const res = await fetch(buildApiUrl(`/api/ramino/rooms/${encodeURIComponent(room.id)}/cancel`), {
        method: 'POST',
      });
      const data = await res.json();
      if (Array.isArray(data?.rooms)) {
        setOpenRooms(mapServerLobbyRooms(data.rooms));
      } else {
        setOpenRooms((prev) => prev.filter((r) => r.id !== room.id));
      }
    } catch {
      setOpenRooms((prev) => prev.filter((r) => r.id !== room.id));
    }
    const pubTableCode = `PUB_${room.id.toUpperCase()}`;
    if (activeMultiplayerRoomCodeRef.current === pubTableCode) {
      setActiveMultiplayerRoomCode(null);
      activeMultiplayerRoomCodeRef.current = null;
    }
    heldWaitingStakeRef.current = 0;
    adjustWalletBalance(room.stake, `Ramino Cancel Refund ${room.name}`);
    raminoAudio.playSwap();
    const dispName = room.name.startsWith('#') ? `${t.roomPrefix}${room.name.slice(1)}` : room.name;
    triggerNotification(t.notifyRoomCancelled(dispName, room.stake));
  };

  // Join or Enter Public Room -> Server-Synced Human Table (enters Waiting Room or Ceremony when full)
  const handleJoinOrStartRoom = async (room: RaminoRoom) => {
    clearLocalSuspendedGame();
    const pubTableCode = `PUB_${room.id.toUpperCase()}`;
    if (!room.isUserCreated) {
      if (balance < room.stake) {
        raminoAudio.playBuzzer();
        triggerNotification(t.notifyInsufficientJoin(room.stake));
        return;
      }
      try {
        const res = await fetch(buildApiUrl(`/api/ramino/rooms/${encodeURIComponent(room.id)}/join`), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerId: myPlayerId,
            playerPhone,
            playerName,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data?.ok || !data.table) {
          raminoAudio.playBuzzer();
          triggerNotification(data?.error || t.notifyRoomFull);
          fetchServerOpenRooms();
          return;
        }
        heldWaitingStakeRef.current = room.stake;
        adjustWalletBalance(-room.stake, `Ramino Join ${room.name}`);
        setIsPrivateRoomGame(false);
        setActivePrivateRoomCode(null);
        setIsMicMuted(true);
        setActiveTableStake(room.stake);
        setActiveMultiplayerRoomCode(String(data.tableCode || pubTableCode));
        activeMultiplayerRoomCodeRef.current = String(data.tableCode || pubTableCode);
        raminoAudio.playDraw();
        applyServerTableSnapshot(data.table);
      } catch {
        raminoAudio.playBuzzer();
      }
      return;
    }

    // Host clicking Start on their own public room -> open server waiting/table view
    try {
      setIsPrivateRoomGame(false);
      setActivePrivateRoomCode(null);
      setIsMicMuted(true);
      setActiveTableStake(room.stake);
      setActiveMultiplayerRoomCode(pubTableCode);
      activeMultiplayerRoomCodeRef.current = pubTableCode;
      const stRes = await fetch(
        buildApiUrl(`/api/ramino/tables/${encodeURIComponent(pubTableCode)}/state?playerId=${encodeURIComponent(myPlayerId)}&_t=${Date.now()}`),
        { cache: 'no-store' }
      );
      const stData = await stRes.json();
      if (stRes.ok && stData?.ok && stData.table) {
        raminoAudio.playDraw();
        applyServerTableSnapshot(stData.table);
        if ((stData.table.playersSummary?.length || 0) >= 2 && stData.table.phase === 'waiting') {
          await sendRaminoGameAction('start_game');
        }
        return;
      }
    } catch {}
    startDealerCutCeremony(room.max, room.stake);
  };

  // Render Opponent Seat Pill
  const renderOpponentSeat = (opp: RaminoOpponent | undefined, seatNum: number) => {
    if (!opp) {
      return (
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-dashed border-white/30 bg-black/25 flex items-center justify-center text-white/60 text-sm font-black">
          +
        </div>
      );
    }
    const isSpeaking = !isDeafened && speakingOpponentId === opp.id;
    const isTurn = !opp.isSuspended && currentTurn === seatNum;
    return (
      <div
        className={`relative flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/80 border shadow-lg transition ${
          opp.isSuspended
            ? 'border-rose-500/50 opacity-65'
            : isTurn
            ? 'border-amber-400 ring-2 ring-amber-400/50'
            : 'border-white/20'
        }`}
      >
        <div className="relative">
          <div
            className={`w-7 h-7 rounded-full ${opp.avatarColor} text-slate-950 font-black flex items-center justify-center text-xs shadow ${
              isSpeaking ? 'ring-2 ring-emerald-400 animate-pulse' : ''
            }`}
          >
            {opp.avatarLetter}
          </div>
          {opp.isDealer && (
            <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-400 text-slate-950 font-black text-[8px] flex items-center justify-center shadow">
              D
            </span>
          )}
        </div>
        <div className="flex flex-col leading-tight">
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-black text-white">{opp.name}</span>
            {opp.isSuspended ? (
              <span className="px-1 rounded bg-rose-500/35 text-rose-300 text-[8px] font-black">
                {t.suspendedBadge}
              </span>
            ) : (
              opp.hasMelded && (
                <span className="px-1 rounded bg-emerald-500/30 text-emerald-300 text-[8px] font-bold">{t.meldedBadge}</span>
              )
            )}
          </div>
          <span className="text-[9px] text-gray-400 font-bold">
            {opp.isSuspended ? '👁️' : `${opp.cardCount} ${t.cardWord}`}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div
      onPointerMove={handleCardPointerMove}
      onPointerUp={handleCardPointerUp}
      onPointerCancel={handleCardPointerUp}
      style={
        shouldRotateToLandscape
          ? {
              position: 'fixed',
              top: '50%',
              left: '50%',
              width: `${viewportSize.h}px`,
              height: `${viewportSize.w}px`,
              transform: 'translate(-50%, -50%) rotate(90deg)',
              transformOrigin: 'center center',
              overflow: 'hidden',
              zIndex: 9999,
            }
          : view === 'game' || view === 'ceremony'
          ? {
              position: 'fixed',
              inset: 0,
              width: '100%',
              height: '100%',
              overflow: 'hidden',
              zIndex: 9999,
            }
          : {
              width: '100%',
              minHeight: '100%',
              touchAction: 'pan-y',
            }
      }
      className={`select-none flex flex-col font-sans transition-colors duration-500 relative ${
        view === 'lobby' || view === 'waiting'
          ? 'bg-[#0f0728] text-slate-50 overflow-y-auto overflow-x-hidden'
          : tableTheme === 'emerald'
          ? 'bg-[#03150d] text-emerald-50 overflow-hidden'
          : tableTheme === 'mahogany'
          ? 'bg-[#1a0a06] text-amber-50 overflow-hidden'
          : 'bg-[#030914] text-slate-50 overflow-hidden'
      }`}
    >
      {/* Floating System Notification Banner */}
      {notificationBanner && (
        <div className="fixed top-2 left-1/2 -translate-x-1/2 z-[100000] bg-black/95 border border-amber-400 text-yellow-300 px-3 py-1.5 rounded-xl shadow-2xl flex items-center gap-1.5 text-[11px] sm:text-xs font-black max-w-[85%] pointer-events-none">
          <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>{notificationBanner}</span>
        </div>
      )}

      {/* Floating Dragged Card — Large, Elevated Above Finger/Pointer, Matching Hand Card Face */}
      {dragCardState && dragMovedRef.current && (() => {
        const dc = dragCardState.card;
        const dcIsJoker = dc.isJoker || dc.rank === 'JOKER';
        const dcRankColor = dcIsJoker
          ? 'text-red-700'
          : dc.suit === '♦'
          ? 'text-blue-600'
          : dc.suit === '♣'
          ? 'text-emerald-700'
          : dc.suit === '♥'
          ? 'text-red-600'
          : 'text-slate-950';
        const dcSuitColor = dc.suit === '♥' || dc.suit === '♦' ? 'text-red-600' : 'text-slate-950';
        return (
          <div
            style={{
              position: 'fixed',
              left: dragCardState.x - 36,
              top: Math.max(8, dragCardState.y - 118),
              pointerEvents: 'none',
              zIndex: 999999,
              transform: 'rotate(2deg) scale(1.06)',
            }}
            className="w-16 h-26 sm:w-[80px] sm:h-[126px] rounded-xl bg-[#fcfbf7] border-2 border-yellow-400 ring-4 ring-yellow-400/75 shadow-[0_20px_40px_rgba(0,0,0,0.9)] p-1.5 flex flex-col justify-between"
          >
            <div className="flex flex-col items-start leading-none">
              {dcIsJoker ? (
                <div className="flex flex-col items-center leading-[0.9] text-[8px] sm:text-[9px] font-black text-red-700">
                  <span>J</span>
                  <span>O</span>
                  <span>K</span>
                  <span>E</span>
                  <span>R</span>
                </div>
              ) : (
                <>
                  <span className={`text-sm sm:text-base font-black leading-none ${dcRankColor}`}>
                    {dc.rank}
                  </span>
                  <span className={`text-xs sm:text-sm leading-none mt-0.5 ${dcSuitColor}`}>
                    {dc.suit}
                  </span>
                </>
              )}
            </div>
            <div className={`text-3xl sm:text-4xl text-center leading-none my-auto ${dcSuitColor}`}>
              {dcIsJoker ? '🃏' : dc.suit}
            </div>
          </div>
        );
      })()}

      {/* ========================================================
          VIEW 1: LOBBY (FIRST SCREEN - MATCHING IMG_3931 + SCATTERED ANIMATED CARDS)
         ======================================================== */}
      {view === 'lobby' && (
        <div className="relative w-full overflow-x-hidden overflow-y-auto">
          <style>{`
            @keyframes raminoDriftA {
              0%, 100% { transform: translate3d(0px, 0px, 0) rotate(var(--r0, -14deg)); }
              50% { transform: translate3d(8px, -16px, 0) rotate(calc(var(--r0, -14deg) + 6deg)); }
            }
            @keyframes raminoDriftB {
              0%, 100% { transform: translate3d(0px, 0px, 0) rotate(var(--r0, 16deg)); }
              50% { transform: translate3d(-10px, 14px, 0) rotate(calc(var(--r0, 16deg) - 7deg)); }
            }
            @keyframes raminoDriftC {
              0%, 100% { transform: translate3d(0px, 0px, 0) rotate(var(--r0, -8deg)) scale(1); }
              50% { transform: translate3d(6px, 12px, 0) rotate(calc(var(--r0, -8deg) + 5deg)) scale(1.04); }
            }
          `}</style>

          {/* Animated Scattered Background Playing Cards */}
          <div className="fixed inset-0 pointer-events-none select-none overflow-hidden z-0">
            {[
              { rank: 'A', suit: '♠', color: 'text-slate-950', left: '4%', top: '8%', rot: '-18deg', anim: 'raminoDriftA 7.5s ease-in-out infinite' },
              { rank: 'K', suit: '♥', color: 'text-red-600', left: '84%', top: '7%', rot: '22deg', anim: 'raminoDriftB 8.2s ease-in-out infinite' },
              { rank: '10', suit: '♦', color: 'text-blue-600', suitColor: 'text-red-600', left: '10%', top: '28%', rot: '14deg', anim: 'raminoDriftC 9s ease-in-out infinite' },
              { rank: 'JOK', suit: '🃏', color: 'text-red-700', left: '88%', top: '26%', rot: '-16deg', anim: 'raminoDriftA 6.8s ease-in-out infinite', isJoker: true },
              { rank: 'Q', suit: '♣', color: 'text-emerald-700', suitColor: 'text-slate-950', left: '3%', top: '50%', rot: '-24deg', anim: 'raminoDriftB 9.4s ease-in-out infinite' },
              { rank: 'J', suit: '♠', color: 'text-slate-950', left: '89%', top: '48%', rot: '19deg', anim: 'raminoDriftC 7.8s ease-in-out infinite' },
              { rank: '8', suit: '♥', color: 'text-red-600', left: '7%', top: '72%', rot: '12deg', anim: 'raminoDriftA 8.6s ease-in-out infinite' },
              { rank: '7', suit: '♦', color: 'text-blue-600', suitColor: 'text-red-600', left: '85%', top: '70%', rot: '-21deg', anim: 'raminoDriftB 7.2s ease-in-out infinite' },
              { rank: '9', suit: '♣', color: 'text-emerald-700', suitColor: 'text-slate-950', left: '22%', top: '14%', rot: '-9deg', anim: 'raminoDriftC 10s ease-in-out infinite' },
              { rank: 'A', suit: '♥', color: 'text-red-600', left: '72%', top: '15%', rot: '11deg', anim: 'raminoDriftA 8.9s ease-in-out infinite' },
              { rank: 'K', suit: '♠', color: 'text-slate-950', left: '18%', top: '86%', rot: '-15deg', anim: 'raminoDriftB 7.9s ease-in-out infinite' },
              { rank: 'Q', suit: '♦', color: 'text-blue-600', suitColor: 'text-red-600', left: '75%', top: '85%', rot: '17deg', anim: 'raminoDriftC 8.4s ease-in-out infinite' },
            ].map((fc, idx) => (
              <div
                key={idx}
                style={
                  {
                    left: fc.left,
                    top: fc.top,
                    '--r0': fc.rot,
                    animation: fc.anim,
                  } as React.CSSProperties
                }
                className="absolute w-12 h-18 sm:w-14 sm:h-21 rounded-xl bg-[#fcfbf7]/90 border border-amber-300/60 shadow-[0_10px_28px_rgba(0,0,0,0.65)] p-1.5 flex flex-col justify-between opacity-25 sm:opacity-35"
              >
                <div className="flex flex-col items-start leading-none">
                  <span className={`text-[11px] sm:text-xs font-black leading-none ${fc.color}`}>
                    {fc.rank}
                  </span>
                  <span className={`text-[10px] leading-none mt-0.5 ${fc.suitColor || fc.color}`}>
                    {fc.isJoker ? '★' : fc.suit}
                  </span>
                </div>
                <div className={`text-lg sm:text-xl text-center leading-none ${fc.suitColor || fc.color}`}>
                  {fc.suit}
                </div>
              </div>
            ))}
          </div>

          <div className="flex-1 w-full max-w-2xl mx-auto p-3 sm:p-5 flex flex-col gap-3 pb-24 relative z-10">
          {/* Top Bar */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              {onBackToLobby && (
                <button
                  onClick={onBackToLobby}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>{t.exitBtn}</span>
                </button>
              )}
              <div className="flex items-center gap-2">
                <span className="text-2xl">♠</span>
                <div>
                  <h1 className="text-lg sm:text-xl font-black text-amber-400 uppercase tracking-wide leading-none">
                    {t.brandTitle}
                  </h1>
                  <span className="text-[10px] text-purple-300/80 font-bold">{t.brandSub}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  raminoAudio.playCardSnap();
                  setIsRulesModalOpen(true);
                }}
                className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-amber-300 text-xs font-black flex items-center gap-1 transition cursor-pointer"
                title={t.rulesTooltip}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t.rulesBtn}</span>
              </button>
              <button
                onClick={() => {
                  raminoAudio.playCardSnap();
                  setIsSettingsModalOpen(true);
                }}
                className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-300 text-xs font-black flex items-center gap-1 transition cursor-pointer"
                title={t.settingsBtn}
              >
                <Settings className="w-3.5 h-3.5" />
                <span>{t.settingsBtn}</span>
              </button>
            </div>
          </div>

          {/* Resume Active Game Banner (while timer > 0) */}
          {((resumableMpSession && resumableMpSession.turnSeconds > 0 && activeMultiplayerRoomCode) ||
            (suspendedLocalGame && localResumeSecondsLeft > 0)) && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/90 via-[#15283d]/95 to-amber-950/80 border-2 border-emerald-400/70 shadow-xl flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs sm:text-sm font-black text-emerald-300 flex items-center gap-1.5">
                  <Play className="w-4 h-4 fill-current shrink-0" />
                  <span>{t.resumeBannerTitle}</span>
                </div>
                <p className="text-[11px] text-amber-200 font-bold mt-0.5">
                  {t.resumeBannerSub(
                    resumableMpSession ? resumableMpSession.stake : suspendedLocalGame!.stake,
                    resumableMpSession ? resumableMpSession.turnSeconds : localResumeSecondsLeft
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleForfeitResumableGame}
                  className="px-2.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/35 border border-rose-400/40 text-rose-200 font-bold text-[11px] cursor-pointer transition"
                >
                  {t.resumeForfeitBtn}
                </button>
                <button
                  type="button"
                  onClick={() => void handleResumeActiveGame()}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 hover:brightness-105 text-slate-950 font-black text-xs shadow-lg cursor-pointer transition"
                >
                  {t.resumeReturnBtn}
                </button>
              </div>
            </div>
          )}

          {/* 3 Live Stats Cards */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-1">
            <div className="p-3 rounded-2xl bg-[#1b0d36]/90 border border-purple-500/30 flex flex-col items-center justify-center text-center shadow-lg">
              <div className="flex items-center gap-1 text-purple-300 text-xs font-bold mb-1">
                <Users className="w-3.5 h-3.5 text-purple-400" />
                <span>{t.playersCardLabel}</span>
              </div>
              <span className="text-xl sm:text-2xl font-black text-white">{livePlayersCount}</span>
              <span className="text-[9px] text-purple-300/70 font-semibold mt-0.5">{t.liveStreamSub}</span>
            </div>

            <div className="p-3 rounded-2xl bg-[#1b0d36]/90 border border-purple-500/30 flex flex-col items-center justify-center text-center shadow-lg">
              <div className="flex items-center gap-1 text-purple-300 text-xs font-bold mb-1">
                <span>🎮</span>
                <span>{t.openRoomsCardLabel}</span>
              </div>
              <span className="text-xl sm:text-2xl font-black text-white">{openRooms.length}</span>
              <span className="text-[9px] text-purple-300/70 font-semibold mt-0.5">{t.activeRoomsSub}</span>
            </div>

            <div className="p-2.5 sm:p-3 rounded-2xl bg-[#1b0d36]/90 border border-purple-500/30 flex flex-col items-center justify-center text-center shadow-lg">
              <button
                type="button"
                onClick={() => onOpenWallet?.('history')}
                className="flex flex-col items-center cursor-pointer hover:opacity-90 transition"
                title={t.walletSub}
              >
                <div className="flex items-center gap-1 text-yellow-300 text-xs font-bold mb-0.5">
                  <span>🪙</span>
                  <span>{t.balanceCardLabel}</span>
                </div>
                <span className="text-sm sm:text-base font-black text-amber-400 font-mono">
                  {balance.toLocaleString()} {t.currencyUnit}
                </span>
              </button>
              <div className="flex items-center gap-1 mt-1.5 w-full">
                <button
                  type="button"
                  onClick={() => {
                    raminoAudio.playCardSnap();
                    onOpenWallet?.('deposit');
                  }}
                  className="flex-1 py-1 px-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[10px] transition cursor-pointer"
                >
                  + {t.depositShort}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    raminoAudio.playCardSnap();
                    onOpenWallet?.('withdraw');
                  }}
                  className="flex-1 py-1 px-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-[10px] transition cursor-pointer"
                >
                  - {t.withdrawShort}
                </button>
              </div>
            </div>
          </div>

          {/* Open Rooms List with Live Timer & Cancel/Refund */}
          <div className="p-3 sm:p-4 rounded-3xl bg-[#170a2f]/90 border border-purple-500/30 flex flex-col gap-2.5 shadow-xl">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2 text-xs sm:text-sm font-black text-yellow-400">
                <span>🎮</span>
                <span>{t.openRoomsHeader(openRooms.length)}</span>
              </div>
              <button
                onClick={() => {
                  raminoAudio.playCardSnap();
                  void fetchServerOpenRooms();
                  triggerNotification(t.roomsRefreshed);
                }}
                className="text-xs font-bold text-gray-300 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{t.refreshBtn}</span>
              </button>
            </div>

            {openRooms.length === 0 ? (
              <div className="py-6 text-center text-xs text-purple-300/60 font-bold">
                {t.noOpenRooms}
              </div>
            ) : (
              <div className="space-y-2">
                {openRooms.map((room) => (
                  <div
                    key={room.id}
                    className="p-3 rounded-2xl bg-[#221045] border border-purple-400/20 hover:border-purple-400/40 flex items-center justify-between gap-2 transition shadow-md"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-full shrink-0 ${
                          room.avatarColor || 'bg-amber-500'
                        } text-slate-950 font-black flex items-center justify-center text-sm shadow`}
                      >
                        {room.avatarLetter || room.creator[0] || 'R'}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs sm:text-sm font-black text-white leading-tight truncate">
                          {room.name} {room.isUserCreated ? `(${t.yoursTag})` : ''}
                        </h4>
                        <p className="text-[11px] text-yellow-300 font-semibold mt-0.5">
                          {room.stake} {t.currencyUnit} • {room.current}/{room.max} {t.playersWord} •{' '}
                          {t.twoDecksShort}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div
                        className={`flex items-center gap-1 text-[11px] font-mono font-bold ${
                          room.timeRemaining <= 15 ? 'text-rose-400 animate-pulse' : 'text-gray-300'
                        }`}
                      >
                        <span>⏱️</span>
                        <span>{formatTimer(room.timeRemaining)}</span>
                      </div>

                      {room.isUserCreated ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleCancelCreatedRoom(room)}
                            className="px-2.5 py-1.5 rounded-xl bg-rose-600/90 hover:bg-rose-500 text-white font-black text-[11px] transition shadow cursor-pointer flex items-center gap-1"
                            title={t.cancelRefundTip}
                          >
                            <X className="w-3 h-3" />
                            <span>{t.cancelRefundBtn}</span>
                          </button>
                          <button
                            onClick={() => handleJoinOrStartRoom(room)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[11px] transition shadow cursor-pointer flex items-center gap-1"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            <span>{t.startBtn}</span>
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleJoinOrStartRoom(room)}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition shadow-lg active:scale-95 cursor-pointer"
                        >
                          {t.joinBtn}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Player Seat Count Selector */}
          <div className="p-3 sm:p-4 rounded-3xl bg-[#170a2f]/90 border border-purple-500/30 flex flex-col gap-2.5 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs sm:text-sm font-black text-white">
                <Users className="w-4 h-4 text-purple-400" />
                <span>{t.choosePlayersLabel}</span>
              </div>
              <span className="text-[11px] font-bold text-amber-300">
                {t.twoDecksDesc}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {([
                { count: 2 as const, time: '60s', cards: 108 },
                { count: 3 as const, time: '180s', cards: 108 },
                { count: 4 as const, time: '240s', cards: 108 },
                { count: 5 as const, time: '300s', cards: 108 },
              ] as const).map((seat) => (
                <button
                  key={seat.count}
                  onClick={() => {
                    setPlayerSeatCount(seat.count);
                    raminoAudio.playCardSnap();
                  }}
                  className={`py-2 px-1 rounded-2xl border flex flex-col items-center justify-center transition cursor-pointer ${
                    playerSeatCount === seat.count
                      ? 'bg-[#291353] border-yellow-400 ring-2 ring-yellow-400/50 text-white shadow-lg'
                      : 'bg-[#200d41] border-purple-500/30 text-gray-300 hover:border-purple-400/50'
                  }`}
                >
                  <span className="text-xs font-black">{t.seatOptionLabel(seat.count)}</span>
                  <span className="text-[10px] text-amber-300 mt-0.5">⏱️ {seat.time}</span>
                  <span className="text-[9px] text-purple-300/70">{t.seatDeckLabel(seat.cards)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Stake Selection */}
          <div className="p-3 sm:p-4 rounded-3xl bg-[#170a2f]/90 border border-purple-500/30 flex flex-col gap-3 shadow-xl">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-black text-white">
              <span>🪙</span>
              <span>{t.stakeLabel}</span>
            </div>

            <div className="relative">
              <input
                type="number"
                min="10"
                step="10"
                value={selectedStake}
                onChange={(e) => setSelectedStake(Math.max(10, parseInt(e.target.value, 10) || 10))}
                placeholder={t.stakePlaceholder}
                className="w-full px-4 py-2.5 rounded-2xl bg-[#221045] border border-purple-400/30 text-sm font-bold text-white placeholder-purple-300/40 focus:outline-none focus:border-yellow-400"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 font-mono font-black text-yellow-400 text-xs">
                {t.currencyUnit}
              </span>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {[30, 50, 100, 200, 500, 1000, 2000, 3000, 5000, 10000].map((stakeVal) => (
                <button
                  key={stakeVal}
                  onClick={() => {
                    setSelectedStake(stakeVal);
                    raminoAudio.playCardSnap();
                  }}
                  className={`py-2 rounded-xl text-xs font-black transition cursor-pointer border ${
                    selectedStake === stakeVal
                      ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md font-extrabold'
                      : 'bg-[#221045] text-gray-200 border-purple-500/30 hover:border-purple-400'
                  }`}
                >
                  {stakeVal}
                </button>
              ))}
            </div>
          </div>

          {/* Create Room Button */}
          <button
            onClick={handleCreateRoom}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 font-black text-sm sm:text-base shadow-xl hover:brightness-110 active:scale-98 transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>+</span>
            <span>{t.createRoomBtn(selectedStake, playerSeatCount)}</span>
          </button>

          {/* Sticky Bottom Actions */}
          <div className="fixed bottom-0 left-0 right-0 p-3 bg-black/90 backdrop-blur-md border-t border-purple-500/20 z-40 flex items-center justify-center">
            <div className="max-w-2xl w-full flex items-center justify-between gap-3">
              <button
                onClick={() => {
                  raminoAudio.playCardSnap();
                  const freshCode = `RAMINO-${Math.floor(1000 + Math.random() * 9000)}`;
                  setPrivateCode(freshCode);
                  setIsPrivateModalOpen(true);
                }}
                className="flex-1 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg active:scale-95 transition cursor-pointer"
              >
                <Lock className="w-4 h-4" />
                <span>{t.privateRoomBtn}</span>
              </button>

              <button
                onClick={() => {
                  raminoAudio.playCardSnap();
                  setIsJoinCodeModalOpen(true);
                }}
                className="flex-1 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg active:scale-95 transition cursor-pointer"
              >
                <Key className="w-4 h-4" />
                <span>{t.joinByCodeBtn}</span>
              </button>
            </div>
          </div>
          </div>
        </div>
      )}

      {/* ========================================================
          VIEW 1.5: MULTIPLAYER HUMAN WAITING ROOM (ZERO COMPUTER BOTS)
         ======================================================== */}
      {view === 'waiting' && (
        <div className="flex-1 w-full min-h-screen flex flex-col bg-gradient-to-b from-[#0b041c] via-[#13082f] to-[#080316] text-slate-50">
          <header className="w-full px-3 sm:px-5 py-2.5 bg-black/80 border-b border-teal-500/25 flex items-center justify-between gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                raminoAudio.playCardSnap();
                void leaveMultiplayerTable(true);
              }}
              className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/35 border border-rose-400/40 text-rose-200 font-black text-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{t.cancelLeaveRefundBtn}</span>
            </button>

            <div className="flex items-center gap-1.5">
              {isPrivateRoomGame && activePrivateRoomCode && (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-2xl bg-[#101829]/90 border border-emerald-400/35 shadow-lg">
                  <button
                    type="button"
                    onClick={() => {
                      raminoAudio.playCardSnap();
                      setIsVoiceStageOpen(true);
                    }}
                    className="px-2 py-0.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/35 text-emerald-300 text-[10px] font-black flex items-center gap-1 cursor-pointer transition"
                    title={t.voiceStageTitle}
                  >
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    <span className="hidden sm:inline">{t.voiceStageBtn}</span>
                    <span>• {voiceConnectedCount}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleTogglePrivateMic}
                    className={`px-2 py-0.5 rounded-xl text-[10px] font-black flex items-center gap-1 transition cursor-pointer ${
                      !isMicMuted ? 'bg-emerald-500 text-slate-950' : 'bg-white/10 text-rose-300'
                    }`}
                  >
                    {!isMicMuted ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}
                    <span>{!isMicMuted ? t.micOpen : t.micOpenBtn}</span>
                  </button>
                  <button
                    type="button"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      void handleStartPushToTalk();
                    }}
                    onPointerUp={handleEndPushToTalk}
                    onPointerLeave={handleEndPushToTalk}
                    onPointerCancel={handleEndPushToTalk}
                    className={`px-2 py-0.5 rounded-xl text-[10px] font-black flex items-center gap-1 select-none touch-none transition cursor-pointer ${
                      isPushToTalkActive
                        ? 'bg-sky-400 text-slate-950 ring-2 ring-sky-300'
                        : 'bg-sky-500/20 text-sky-200 border border-sky-400/35 hover:bg-sky-500/30'
                    }`}
                  >
                    <Mic className="w-3 h-3" />
                    <span className="hidden md:inline">{t.voiceHoldToTalk}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      raminoAudio.playCardSnap();
                      setIsDeafened(!isDeafened);
                    }}
                    className={`p-1 rounded-xl text-xs transition cursor-pointer ${
                      isDeafened ? 'bg-rose-500/20 text-rose-300' : 'bg-white/5 text-gray-300'
                    }`}
                    title={isDeafened ? t.deafenOpenTip : t.deafenMuteTip}
                  >
                    <Headphones className="w-3 h-3" />
                  </button>
                  {isVoiceAudioLocked && !isDeafened && (
                    <button
                      type="button"
                      onClick={() => {
                        unlockRemoteAudioElements();
                        raminoAudio.playCardSnap();
                      }}
                      className="px-2 py-0.5 rounded-xl bg-amber-400 text-slate-950 font-black text-[10px] animate-pulse cursor-pointer"
                    >
                      🔊 {language === 'en' ? 'Enable Audio' : 'ድምፅ ክፈት'}
                    </button>
                  )}
                </div>
              )}
              <button
                type="button"
                onClick={() => setIsRulesModalOpen(true)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-amber-300 transition cursor-pointer"
                title={t.rulesTooltip}
              >
                <HelpCircle className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsSettingsModalOpen(true)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-amber-300 transition cursor-pointer"
                title={t.settingsBtn}
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </header>

          <div className="flex-1 flex items-center justify-center p-4">
            <div className="max-w-md w-full rounded-3xl bg-[#190a33]/95 border-2 border-teal-400/50 p-5 space-y-4 shadow-2xl">
              <div className="text-center space-y-1.5">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/15 border border-teal-400/40 text-teal-300 text-xs font-black">
                  {isPrivateRoomGame ? <Lock className="w-3.5 h-3.5" /> : <Users className="w-3.5 h-3.5" />}
                  <span>{t.waitingRoomTitle(isPrivateRoomGame)}</span>
                </div>
                <div className="flex items-center justify-center gap-2 flex-wrap pt-1">
                  {(activePrivateRoomCode || activeMultiplayerRoomCode) && (
                    <span className="px-3 py-1 rounded-xl bg-black/60 border border-amber-400/40 text-amber-300 font-mono font-black text-sm">
                      🔑 {activePrivateRoomCode || activeMultiplayerRoomCode}
                    </span>
                  )}
                  <span className="px-3 py-1 rounded-xl bg-amber-400/15 border border-amber-400/40 text-yellow-300 font-black text-xs">
                    🪙 {activeTableStake.toLocaleString()} {t.currencyUnit}
                  </span>
                </div>
              </div>

              {isPrivateRoomGame && activePrivateRoomCode && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(activePrivateRoomCode).catch(() => {});
                        setCodeCopied(true);
                        setTimeout(() => setCodeCopied(false), 1800);
                      }}
                      className="py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-teal-200 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {codeCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{codeCopied ? t.copiedBtn : t.copyCodeBtn}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const tgUrl = `https://t.me/${telegramBotUsername}?start=ramino_${encodeURIComponent(activePrivateRoomCode)}`;
                        navigator.clipboard?.writeText(tgUrl).catch(() => {});
                        setLinkCopied(true);
                        triggerNotification(t.notifyLinkCopied);
                        setTimeout(() => setLinkCopied(false), 1800);
                      }}
                      className="py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-sky-200 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {linkCopied ? <Check className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
                      <span>{linkCopied ? t.copiedBtn : t.copyLinkBtn}</span>
                    </button>
                  </div>
                  <a
                    href={`https://t.me/share/url?url=${encodeURIComponent(`https://t.me/${telegramBotUsername}?start=ramino_${encodeURIComponent(activePrivateRoomCode)}`)}&text=${encodeURIComponent(`${t.inviteTextHeader}\n👥 ${t.seatOptionLabel(playerSeatCount)} • 🪙 ${activeTableStake} ${t.currencyUnit}\n🔑 ${activePrivateRoomCode}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2 px-3 rounded-xl bg-[#229ED9]/25 hover:bg-[#229ED9]/40 border border-[#229ED9]/60 text-sky-100 font-black text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-[#29B6F6] shrink-0">
                      <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z" />
                    </svg>
                    <span>{t.sendTelegramBtn}</span>
                  </a>
                </div>
              )}

              <div className="p-3 rounded-2xl bg-black/45 border border-white/10 space-y-2">
                <div className="flex items-center justify-between text-xs font-black text-gray-200">
                  <span>{t.joinedFriendsHeader(waitingRoomPlayers.length, playerSeatCount)}</span>
                  <span className="text-[11px] text-amber-300">
                    {t.twoDecksShort}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Array.from({ length: playerSeatCount }).map((_, idx) => {
                    const occupant = waitingRoomPlayers[idx];
                    return (
                      <div
                        key={idx}
                        className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                          occupant
                            ? 'bg-emerald-500/15 border-emerald-400/45 text-emerald-100'
                            : 'bg-white/5 border-white/10 text-gray-400 animate-pulse'
                        }`}
                      >
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 ${
                            occupant ? `${occupant.avatarColor || 'bg-amber-400'} text-slate-950` : 'bg-white/10 text-gray-400'
                          }`}
                        >
                          {occupant ? occupant.avatarLetter : '?'}
                        </div>
                        <span className="truncate">
                          {occupant
                            ? `${occupant.isHost ? '👑 ' : '✓ '}${occupant.name}${occupant.id === myPlayerId ? ` (${t.yoursTag})` : ''}`
                            : t.waitingFriendSlot(idx)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {waitingRoomPlayers.length < 2 && (
                <div className="px-3 py-2 rounded-xl bg-amber-500/15 border border-amber-400/40 text-amber-200 text-xs font-bold text-center">
                  {t.waitingPlayersNeeded}
                </div>
              )}

              {waitingRoomPlayers.find((p) => p.isHost)?.id === myPlayerId && waitingRoomPlayers.length >= 2 ? (
                <button
                  type="button"
                  onClick={() => void sendRaminoGameAction('start_game')}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 text-slate-950 font-black text-sm shadow-xl hover:brightness-105 transition cursor-pointer"
                >
                  {t.waitingHostStartBtn(activeTableStake, waitingRoomPlayers.length)}
                </button>
              ) : (
                <div className="text-center text-xs font-bold text-teal-200/90 animate-pulse py-1">
                  {t.waitingForHostMsg}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          VIEW 2: DEALER CUT CEREMONY (FACE-DOWN -> REVEAL -> AUTO-START GAME)
         ======================================================== */}
      {view === 'ceremony' && (
        <div className="flex-1 w-full h-full flex flex-col bg-[#080316] relative overflow-hidden">
          {/* Ramino Minimal Header: Back + Private-Room-Only Live Voice Chat + Rules/Settings */}
          <header className="w-full px-3 py-1 bg-black/85 border-b border-emerald-500/20 flex items-center justify-between z-40 shrink-0">
            <button
              onClick={() => {
                raminoAudio.playCardSnap();
                exitGameTemporarilyToLobby();
              }}
              className="px-2.5 py-0.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-yellow-300 font-black text-xs flex items-center gap-1 transition cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{t.backBtn}</span>
            </button>

            <div className="flex items-center gap-1.5">
              {isPrivateRoomGame && activePrivateRoomCode && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-2xl bg-[#101829]/90 border border-emerald-400/35">
                  <button
                    type="button"
                    onClick={() => {
                      raminoAudio.playCardSnap();
                      setIsVoiceStageOpen(true);
                    }}
                    className="px-2 py-0.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/35 text-emerald-300 text-[10px] font-black flex items-center gap-1 cursor-pointer transition"
                    title={t.voiceStageTitle}
                  >
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    <span className="hidden sm:inline">{activePrivateRoomCode}</span>
                    <span>• {voiceConnectedCount}</span>
                  </button>
                  <button
                    onClick={handleTogglePrivateMic}
                    className={`px-2 py-0.5 rounded-xl text-[10px] font-black flex items-center gap-1 transition cursor-pointer ${
                      !isMicMuted ? 'bg-emerald-500 text-slate-950' : 'bg-white/10 text-rose-300'
                    }`}
                  >
                    {!isMicMuted ? (
                      <Mic className={`w-3 h-3 ${isLocalSpeaking ? 'animate-pulse' : ''}`} />
                    ) : (
                      <MicOff className="w-3 h-3" />
                    )}
                    <span>{!isMicMuted ? t.micOpen : t.micOpenBtn}</span>
                  </button>
                  <button
                    onClick={() => {
                      raminoAudio.playCardSnap();
                      setIsDeafened(!isDeafened);
                    }}
                    className={`p-1 rounded-xl text-xs transition cursor-pointer ${
                      isDeafened ? 'bg-rose-500/20 text-rose-300' : 'bg-white/5 text-gray-300'
                    }`}
                    title={isDeafened ? t.deafenOpenTip : t.deafenMuteTip}
                  >
                    <Headphones className="w-3 h-3" />
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => setIsRulesModalOpen(true)}
                style={{ touchAction: 'manipulation' }}
                className="relative z-[60] shrink-0 pointer-events-auto p-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-amber-300 transition cursor-pointer"
                title={t.rulesTooltip}
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsSettingsModalOpen(true)}
                style={{ touchAction: 'manipulation' }}
                className="relative z-[60] shrink-0 pointer-events-auto p-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-amber-300 transition cursor-pointer"
                title={t.settingsBtn}
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
            </div>
          </header>

          <div className="flex-1 flex flex-col items-center justify-center p-2 gap-3">
            <div className="bg-[#120822] border-2 border-yellow-500/60 rounded-full px-4 py-1 shadow-2xl flex items-center gap-2">
              <span className="text-base">🃏</span>
              <h2 className="text-xs sm:text-sm font-black text-yellow-300 tracking-wide">
                {t.ceremonyTitle(playerSeatCount)}
              </h2>
            </div>

            {/* Face-down SUN GAMES cards first -> open ONE BY ONE sequentially -> highest card deals -> straight to game */}
            <div className="flex items-center justify-center gap-3 sm:gap-6 flex-wrap">
              {cutParticipants.map((part, pIdx) => {
                const isRed = part.card.color === 'red';
                const isCardOpen = pIdx < ceremonyRevealedCount;
                const allOpened = ceremonyRevealedCount >= cutParticipants.length;
                return (
                  <div
                    key={part.id}
                    className={`flex flex-col items-center gap-1 transition-all duration-500 ${
                      allOpened && part.isWinner
                        ? 'scale-110'
                        : allOpened
                        ? 'opacity-80'
                        : isCardOpen
                        ? 'scale-105'
                        : 'animate-pulse'
                    }`}
                  >
                    {!isCardOpen ? (
                      /* Face-down SUN GAMES Cover */
                      <div className="w-15 h-22 sm:w-19 sm:h-27 rounded-xl border-2 border-amber-400 bg-gradient-to-br from-[#1b1035] via-[#0e1730] to-[#050814] shadow-2xl p-1 flex flex-col items-center justify-center">
                        <div className="w-full h-full rounded-lg border border-amber-400/50 flex flex-col items-center justify-center bg-[radial-gradient(circle_at_center,_rgba(251,191,36,0.22)_0%,_transparent_70%)]">
                          <span className="text-sm mb-0.5">☀️</span>
                          <span className="text-[9px] font-black tracking-widest text-amber-300">SUN</span>
                          <span className="text-[7px] font-extrabold tracking-wider text-yellow-200/90">GAMES</span>
                        </div>
                      </div>
                    ) : (
                      /* Opened Card */
                      <div
                        className={`w-15 h-22 sm:w-19 sm:h-27 rounded-xl bg-white p-1.5 shadow-2xl flex flex-col justify-between font-bold ${
                          allOpened && part.isWinner
                            ? 'border-2 border-yellow-400 ring-4 ring-yellow-400/75'
                            : 'border border-slate-300'
                        }`}
                      >
                        <span className={`text-xs sm:text-sm font-black ${isRed ? 'text-red-600' : 'text-slate-950'}`}>
                          {part.card.rank}{part.card.suit}
                        </span>
                        <span className={`text-2xl sm:text-3xl text-center ${isRed ? 'text-red-600' : 'text-slate-950'}`}>
                          {part.card.suit}
                        </span>
                        <span className={`text-xs sm:text-sm font-black text-right rotate-180 ${isRed ? 'text-red-600' : 'text-slate-950'}`}>
                          {part.card.rank}{part.card.suit}
                        </span>
                      </div>
                    )}
                    <span className={`text-[11px] font-black ${allOpened && part.isWinner ? 'text-yellow-400' : 'text-gray-300'}`}>
                      {part.name} {allOpened && part.isWinner ? `• ${t.dealerBadge}` : ''}
                    </span>
                  </div>
                );
              })}
            </div>

            {ceremonyRevealedCount >= cutParticipants.length ? (
              <div className="bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 font-black px-4 py-1 rounded-full shadow-2xl text-xs animate-bounce">
                {t.ceremonyWinnerBanner(
                  ceremonyDealer,
                  `${cutParticipants.find((p) => p.isWinner)?.card.rank || ''}${cutParticipants.find((p) => p.isWinner)?.card.suit || ''}`
                )}
              </div>
            ) : (
              <div className="text-xs font-bold text-amber-300/90 animate-pulse">
                {t.ceremonyRevealing(ceremonyRevealedCount, cutParticipants.length)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          VIEW 2.5: POST DAY 1-CARD CUT & SEQUENTIAL SEAT SELECTION
         ======================================================== */}
      {view === 'postday_pick' && postDaySeatPick && (
        <div className="flex-1 w-full h-full flex flex-col bg-[#080316] relative overflow-hidden">
          <header className="w-full px-3 py-1 bg-black/85 border-b border-teal-500/25 flex items-center justify-between z-40 shrink-0">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-xl bg-teal-500/20 border border-teal-400/40 text-teal-200 font-black text-xs flex items-center gap-1">
                🪑 {t.postDayBtn.replace('🪑 ', '')}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsRulesModalOpen(true)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-amber-300 transition cursor-pointer"
                title={t.rulesTooltip}
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsSettingsModalOpen(true)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-amber-300 transition cursor-pointer"
                title={t.settingsBtn}
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
            </div>
          </header>

          <div className="flex-1 flex flex-col items-center justify-center p-2.5 sm:p-4 gap-3 overflow-y-auto">
            <div className="bg-[#120822] border-2 border-teal-400/60 rounded-full px-4 py-1 shadow-2xl flex items-center gap-2">
              <h2 className="text-xs sm:text-sm font-black text-teal-300 tracking-wide">
                {t.postDayPickTitle(postDaySeatPick.entries.length)}
              </h2>
            </div>

            {/* 1-Card Cut Row Ordered Highest (#1) -> Lowest (#N) */}
            <div className="flex items-center justify-center gap-2.5 sm:gap-5 flex-wrap">
              {postDaySeatPick.entries.map((entry, idx) => {
                const isRed = entry.card.color === 'red';
                const isOpen = idx < postDaySeatPick.revealedCount;
                const allOpened = postDaySeatPick.revealedCount >= postDaySeatPick.entries.length;
                const isPickingNow =
                  allOpened && !postDaySeatPick.completed && idx === postDaySeatPick.currentPickerIdx;
                return (
                  <div
                    key={entry.id}
                    className={`flex flex-col items-center gap-1 transition-all duration-300 ${
                      isPickingNow ? 'scale-110' : entry.pickedSeat !== null ? 'opacity-75' : ''
                    }`}
                  >
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                        isPickingNow
                          ? 'bg-amber-400 text-slate-950 border-yellow-200 animate-bounce'
                          : 'bg-black/60 text-teal-200 border-teal-400/30'
                      }`}
                    >
                      #{entry.rankOrder}
                    </span>
                    {!isOpen ? (
                      <div className="w-14 h-20 sm:w-16 sm:h-24 rounded-xl border-2 border-amber-400 bg-gradient-to-br from-[#1b1035] via-[#0e1730] to-[#050814] shadow-xl p-1 flex flex-col items-center justify-center animate-pulse">
                        <span className="text-xs">☀️</span>
                        <span className="text-[8px] font-black text-amber-300">SUN</span>
                      </div>
                    ) : (
                      <div
                        className={`w-14 h-20 sm:w-16 sm:h-24 rounded-xl bg-white p-1.5 shadow-2xl flex flex-col justify-between font-bold ${
                          isPickingNow
                            ? 'border-2 border-yellow-400 ring-4 ring-yellow-400/70'
                            : 'border border-slate-300'
                        }`}
                      >
                        <span className={`text-xs font-black ${isRed ? 'text-red-600' : 'text-slate-950'}`}>
                          {entry.card.rank}{entry.card.suit}
                        </span>
                        <span className={`text-xl sm:text-2xl text-center ${isRed ? 'text-red-600' : 'text-slate-950'}`}>
                          {entry.card.suit}
                        </span>
                        <span className={`text-xs font-black text-right rotate-180 ${isRed ? 'text-red-600' : 'text-slate-950'}`}>
                          {entry.card.rank}{entry.card.suit}
                        </span>
                      </div>
                    )}
                    <span className={`text-[11px] font-black max-w-[82px] truncate ${isPickingNow ? 'text-yellow-300' : 'text-gray-200'}`}>
                      {entry.name}{entry.isSelf ? ` (${t.yoursTag})` : ''}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Active Turn Banner */}
            {postDaySeatPick.revealedCount < postDaySeatPick.entries.length ? (
              <div className="text-xs font-bold text-amber-300 animate-pulse">
                {t.ceremonyRevealing(postDaySeatPick.revealedCount, postDaySeatPick.entries.length)}
              </div>
            ) : postDaySeatPick.completed ? (
              <div className="bg-emerald-500 text-slate-950 font-black px-4 py-1.5 rounded-full text-xs shadow-xl animate-bounce">
                {t.postDayPickDone}
              </div>
            ) : (
              <div
                className={`px-4 py-1.5 rounded-full text-xs font-black shadow-xl border ${
                  postDaySeatPick.isMyPickTurn
                    ? 'bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 border-yellow-100 animate-pulse'
                    : 'bg-teal-950/90 text-teal-200 border-teal-400/50'
                }`}
              >
                {postDaySeatPick.isMyPickTurn
                  ? t.postDayPickYourTurn
                  : t.postDayPickOtherTurn(postDaySeatPick.currentPickerName || '')}
              </div>
            )}

            {/* Table Seats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 max-w-2xl w-full pt-1">
              {postDaySeatPick.chosenSeats.map((occ, seatIdx) => {
                const canSelect =
                  postDaySeatPick.isMyPickTurn &&
                  !postDaySeatPick.completed &&
                  postDaySeatPick.revealedCount >= postDaySeatPick.entries.length &&
                  occ === null;
                return (
                  <button
                    key={seatIdx}
                    type="button"
                    disabled={!canSelect}
                    onClick={() => handlePostDaySeatClick(seatIdx)}
                    className={`p-2.5 rounded-2xl border-2 flex flex-col items-center justify-center gap-1.5 transition shadow-lg ${
                      occ
                        ? occ.isSelf
                          ? 'bg-amber-500/20 border-amber-400 text-amber-100'
                          : 'bg-emerald-500/15 border-emerald-400/50 text-emerald-100'
                        : canSelect
                        ? 'bg-teal-500/20 hover:bg-teal-400/35 border-teal-400 ring-2 ring-teal-300/60 text-white cursor-pointer active:scale-95 animate-pulse'
                        : 'bg-white/5 border-white/15 text-gray-400 cursor-default'
                    }`}
                  >
                    <span className="text-[10px] font-black uppercase tracking-wider opacity-80">
                      {t.postDaySeatLabel(seatIdx + 1)}
                    </span>
                    {occ ? (
                      <>
                        <div
                          className={`w-8 h-8 rounded-full ${occ.avatarColor || 'bg-amber-400'} text-slate-950 font-black text-xs flex items-center justify-center shadow`}
                        >
                          {occ.avatarLetter}
                        </div>
                        <span className="text-xs font-black truncate max-w-full">
                          {occ.name}{occ.isSelf ? ` (${t.yoursTag})` : ''}
                        </span>
                      </>
                    ) : (
                      <>
                        <div className="w-8 h-8 rounded-full bg-white/10 border border-dashed border-white/30 flex items-center justify-center text-sm">
                          🪑
                        </div>
                        <span className="text-[11px] font-bold">
                          {t.postDayPickOpenSeat}
                        </span>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          VIEW 3: IN-GAME SCREEN (FULL-SCREEN LANDSCAPE, VOICE CHAT HEADER RESTORED, 4 SEATING LAYOUTS)
         ======================================================== */}
      {view === 'game' && (
        <div className="flex-1 w-full h-full flex flex-col relative overflow-hidden">
          {/* Slim Ramino Header: Back + Streak + Private Voice Chat + Rules + Settings */}
          <header className="relative z-50 w-full px-2.5 py-0.5 bg-black/85 backdrop-blur-md border-b border-emerald-500/20 flex items-center justify-between gap-2 shrink-0 pointer-events-auto">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  raminoAudio.playCardSnap();
                  exitGameTemporarilyToLobby();
                }}
                className="px-2.5 py-0.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-yellow-300 font-black text-[11px] flex items-center gap-1 transition cursor-pointer active:scale-95"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{t.backBtn}</span>
              </button>

              {winStreak > 0 && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                    winStreak >= 3
                      ? 'bg-amber-400/20 border-amber-400 text-amber-300 animate-pulse'
                      : 'bg-white/10 border-white/15 text-emerald-300'
                  }`}
                >
                  {t.streakLabel(winStreak)}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {isPrivateRoomGame && activePrivateRoomCode && (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-2xl bg-[#101829]/95 border border-emerald-400/40 shadow-lg">
                  <button
                    type="button"
                    onClick={() => {
                      raminoAudio.playCardSnap();
                      setIsVoiceStageOpen(true);
                    }}
                    className="px-1.5 py-0.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/35 text-emerald-300 text-[10px] font-black flex items-center gap-1 transition cursor-pointer"
                    title={t.voiceStageTitle}
                  >
                    <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span className="font-mono text-teal-200 hidden md:inline">{activePrivateRoomCode}</span>
                    <span>• 👥 {voiceConnectedCount}</span>
                    <span className="hidden lg:inline text-slate-300">• {t.roundWord} {privateRoundCount}</span>
                  </button>

                  {privateRoundCount >= 5 && (
                    <button
                      onClick={() => requestPostDayConsensus('header')}
                      className="px-2 py-0.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-[10px] shadow transition cursor-pointer"
                      title={t.postDayTip}
                    >
                      {t.postDayBtn}
                    </button>
                  )}

                  {activeSpeakerName && !isDeafened && (
                    <span className="text-[9px] font-black text-emerald-300 animate-pulse px-1 hidden sm:inline">
                      🔊 {activeSpeakerName}
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={handleTogglePrivateMic}
                    className={`px-2 py-0.5 rounded-xl text-[10px] font-black flex items-center gap-1 transition cursor-pointer ${
                      !isMicMuted
                        ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30 ring-1 ring-emerald-300'
                        : 'bg-white/10 text-rose-300 hover:bg-white/15'
                    }`}
                  >
                    {!isMicMuted ? (
                      <Mic className={`w-3 h-3 ${isLocalSpeaking ? 'animate-pulse' : ''}`} />
                    ) : (
                      <MicOff className="w-3 h-3" />
                    )}
                    <span className="font-bold hidden sm:inline">{!isMicMuted ? t.micOpen : t.micOpenBtn}</span>
                  </button>

                  <button
                    type="button"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      void handleStartPushToTalk();
                    }}
                    onPointerUp={handleEndPushToTalk}
                    onPointerLeave={handleEndPushToTalk}
                    onPointerCancel={handleEndPushToTalk}
                    className={`px-1.5 py-0.5 rounded-xl text-[10px] font-black flex items-center gap-1 select-none touch-none transition cursor-pointer ${
                      isPushToTalkActive
                        ? 'bg-sky-400 text-slate-950 ring-2 ring-sky-300'
                        : 'bg-sky-500/20 text-sky-200 border border-sky-400/35 hover:bg-sky-500/30'
                    }`}
                    title={t.voiceHoldToTalk}
                  >
                    <Mic className="w-3 h-3" />
                    <span className="hidden lg:inline">{t.voiceHoldToTalk}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsDeafened(!isDeafened);
                      raminoAudio.playCardSnap();
                    }}
                    className={`p-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                      isDeafened ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'bg-white/5 text-gray-300 hover:text-white'
                    }`}
                    title={isDeafened ? t.deafenOpenTip : t.deafenMuteTip}
                  >
                    <Headphones className="w-3 h-3" />
                  </button>

                  {(!isMicMuted || isLocalSpeaking) && (
                    <div className="flex items-center gap-0.5 px-0.5">
                      <span className={`w-1 h-2 bg-emerald-400 rounded-full ${isLocalSpeaking ? 'animate-bounce' : ''}`}></span>
                      <span className={`w-1 h-3.5 bg-emerald-300 rounded-full ${isLocalSpeaking ? 'animate-bounce [animation-delay:0.15s]' : ''}`}></span>
                      <span className={`w-1 h-2.5 bg-emerald-400 rounded-full ${isLocalSpeaking ? 'animate-bounce [animation-delay:0.3s]' : ''}`}></span>
                    </div>
                  )}
                  {isVoiceAudioLocked && !isDeafened && (
                    <button
                      type="button"
                      onClick={() => {
                        unlockRemoteAudioElements();
                        raminoAudio.playCardSnap();
                      }}
                      className="px-2 py-0.5 rounded-xl bg-amber-400 text-slate-950 font-black text-[10px] animate-pulse cursor-pointer"
                    >
                      🔊 {language === 'en' ? 'Enable Audio' : 'ድምፅ ክፈት'}
                    </button>
                  )}
                </div>
              )}

              <button
                onClick={() => setSoundEnabled((prev) => !prev)}
                className={`p-1 rounded-xl border text-xs transition cursor-pointer ${
                  soundEnabled
                    ? 'bg-white/10 hover:bg-white/20 border-white/15 text-emerald-300'
                    : 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                }`}
                title={t.soundFxLabel}
              >
                {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  raminoAudio.playCardSnap();
                  setIsRulesModalOpen(true);
                }}
                style={{ touchAction: 'manipulation' }}
                className="relative z-[60] shrink-0 pointer-events-auto px-2 py-0.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-amber-300 font-black text-[10px] flex items-center gap-1 transition cursor-pointer"
                title={t.rulesTooltip}
              >
                <BookOpen className="w-3 h-3" />
                <span className="hidden sm:inline">{t.rulesBtn}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  raminoAudio.playCardSnap();
                  setIsSettingsModalOpen(true);
                }}
                style={{ touchAction: 'manipulation' }}
                className="relative z-[60] shrink-0 pointer-events-auto px-2 py-0.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-300 font-black text-[10px] flex items-center gap-1 transition cursor-pointer"
                title={t.settingsBtn}
              >
                <Settings className="w-3 h-3" />
                <span className="hidden sm:inline">{t.settingsBtn}</span>
              </button>
            </div>
          </header>

          {/* Table Felt Arena — Full Viewport Fit */}
          <main className="flex-1 min-h-0 w-full flex flex-col items-center justify-center p-1 sm:p-1.5 relative overflow-hidden">
            <div
              className={`w-full max-w-6xl h-full rounded-[28px] sm:rounded-[48px] border-3 border-[#6c5531]/75 p-1.5 sm:p-2 flex flex-col justify-between relative shadow-2xl overflow-hidden ${
                tableTheme === 'emerald'
                  ? 'bg-[radial-gradient(ellipse_at_center,_#0d4e33_0%,_#062e1d_55%,_#02160d_100%)]'
                  : tableTheme === 'mahogany'
                  ? 'bg-[radial-gradient(ellipse_at_center,_#4b1d13_0%,_#2c100a_58%,_#140603_100%)]'
                  : 'bg-[radial-gradient(ellipse_at_center,_#102b52_0%,_#091731_58%,_#030914_100%)]'
              }`}
            >
              {/* Watermark */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
                <span className="text-2xl sm:text-5xl font-serif font-black tracking-[0.45em] text-emerald-200/10 uppercase">
                  SUN GAMES
                </span>
              </div>

              {/* ====================================================
                  SEATING LAYOUTS MATCHING THE 4 UPLOADED IMAGES
                 ==================================================== */}

              {/* 2 PLAYERS (IMG_3930): Opponent 1 at Top-Center */}
              {playerSeatCount === 2 && (
                <div className="relative z-20 flex items-center justify-center pt-0.5 shrink-0">
                  {renderOpponentSeat(opponents[0], 1)}
                </div>
              )}

              {/* 3 PLAYERS (IMG_3928): Opponent 1 Top-Left, Opponent 2 Top-Right */}
              {playerSeatCount === 3 && (
                <div className="relative z-20 flex items-center justify-between px-8 sm:px-16 pt-0.5 shrink-0">
                  {renderOpponentSeat(opponents[0], 1)}
                  {renderOpponentSeat(opponents[1], 2)}
                </div>
              )}

              {/* 4 PLAYERS (IMG_3927): Opponent 2 at Top-Center (plus Left & Right in middle row) */}
              {playerSeatCount === 4 && (
                <div className="relative z-20 flex items-center justify-center pt-0.5 shrink-0">
                  {renderOpponentSeat(opponents[1], 2)}
                </div>
              )}

              {/* 5 PLAYERS (IMG_3926): Opponent 2 Top-Left & Opponent 3 Top-Right (plus Mid-Left & Mid-Right) */}
              {playerSeatCount === 5 && (
                <div className="relative z-20 flex items-center justify-between px-10 sm:px-24 pt-0.5 shrink-0">
                  {renderOpponentSeat(opponents[1], 2)}
                  {renderOpponentSeat(opponents[2], 3)}
                </div>
              )}

              {/* ====================================================
                  MIDDLE ROW: DECK/DISCARD (LEFT) + TABLE MELDS (CENTER) + CLOSED SETS (RIGHT) + SIDE SEATS
                  In 4 & 5 players, side seats stack cleanly above Deck / Badges so melds NEVER hide!
                 ==================================================== */}
              <div className="relative z-20 flex-1 min-h-0 flex items-center justify-between px-1 sm:px-2.5 gap-1.5 sm:gap-2 my-0">
                {/* Left Column: Side Seat (4/5 players stacked neatly above) + Draw Deck + Half Bottom Card + Discard Pile */}
                <div className="flex flex-col items-start justify-center gap-1.5 shrink-0">
                  {(playerSeatCount === 4 || playerSeatCount === 5) && (
                    <div className="flex scale-90 origin-left -mb-0.5">
                      {renderOpponentSeat(opponents[0], 1)}
                    </div>
                  )}

                  {/* Draw Deck ("SUN GAMES") + Half-Exposed Bottom Card + Discard Pile */}
                  <div className="relative flex items-center gap-2.5 sm:gap-4 pl-5 pb-3 pt-0.5">
                    <div className="relative flex items-center justify-center">
                      {/* Bottom Card Finisher: Half-covered by Draw Deck so the exposed half clearly shows rank & suit */}
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          handleBottomCardFinisherClick();
                        }}
                        style={{
                          position: 'absolute',
                          top: '13px',
                          left: '-18px',
                          transform: 'rotate(-18deg)',
                          zIndex: 1,
                        }}
                        className={`w-11 h-16 sm:w-14 sm:h-20 rounded-xl bg-[#fcfbf7] border-2 p-1 flex flex-col justify-between shadow-xl cursor-pointer transition-all ${
                          isBottomCardFinisherReady
                            ? 'border-yellow-400 ring-4 ring-yellow-400 shadow-[0_0_24px_rgba(250,204,21,1)] animate-pulse'
                            : 'border-slate-300 opacity-95'
                        }`}
                        title={t.bottomCardTip(`${bottomCard.rank}${bottomCard.suit}`)}
                      >
                        <div className="flex flex-col items-start leading-none">
                          <span className={`text-[11px] font-black leading-none ${bottomCard.color === 'red' ? 'text-red-600' : 'text-slate-950'}`}>
                            {bottomCard.rank}
                          </span>
                          <span className={`text-[10px] leading-none ${bottomCard.color === 'red' ? 'text-red-600' : 'text-slate-950'}`}>
                            {bottomCard.suit}
                          </span>
                        </div>
                        <div className={`text-base text-center leading-none ${bottomCard.color === 'red' ? 'text-red-600' : 'text-slate-950'}`}>
                          {bottomCard.suit}
                        </div>
                      </div>

                      {/* Draw Deck ("SUN GAMES" Luxury Card Back) — Prominently Visible On Top */}
                      <div
                        onClick={handleDrawFromDeck}
                        style={{ zIndex: 10 }}
                        className="relative w-11 h-16 sm:w-14 sm:h-20 rounded-xl border-2 border-amber-400 bg-gradient-to-br from-[#1b1035] via-[#0e1730] to-[#050814] shadow-[0_10px_22px_rgba(0,0,0,0.85),2px_2px_0_#c9952a] flex flex-col items-center justify-between p-1 cursor-pointer hover:scale-105 active:scale-95 transition"
                        title={t.drawDeckTip}
                      >
                        <div className="w-full h-full rounded-lg border border-amber-400/45 flex flex-col items-center justify-between py-0.5 px-0.5 bg-[radial-gradient(circle_at_center,_rgba(251,191,36,0.18)_0%,_transparent_70%)]">
                          <span className="text-[9px] leading-none">☀️</span>
                          <div className="flex flex-col items-center leading-none text-center">
                            <span className="text-[7px] sm:text-[8px] font-black tracking-widest text-amber-300">
                              SUN
                            </span>
                            <span className="text-[6px] font-extrabold tracking-wider text-yellow-200/90 mt-0.5">
                              GAMES
                            </span>
                          </div>
                          <span
                            className={`px-1 py-0.2 rounded-full border text-[7px] font-mono font-black ${
                              deckCards.length === 0 && discardPile.length > 1
                                ? 'bg-amber-400 border-yellow-200 text-slate-950 animate-pulse'
                                : 'bg-black/70 border-amber-400/40 text-amber-300'
                            }`}
                          >
                            {deckCards.length === 0 && discardPile.length > 1
                              ? '🔄'
                              : `${deckCards.length}${reshuffleCount > 0 ? '↻' : ''}`}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Discard Pile — Clearly Visible (or Empty Slot before Dealer's opening discard) */}
                    {discardPile.length > 0 ? (
                      <div
                        onClick={handleDrawFromDiscard}
                        className="relative w-11 h-16 sm:w-14 sm:h-20 rounded-xl border-2 border-white bg-[#fcfbf7] shadow-[0_10px_22px_rgba(0,0,0,0.85)] p-1 flex flex-col justify-between cursor-pointer hover:scale-105 active:scale-95 transition z-10"
                        title={t.discardPileTip}
                      >
                        {(() => {
                          const top = discardPile[discardPile.length - 1];
                          const topIsJoker = top.isJoker || top.rank === 'JOKER';
                          const topRankColor = topIsJoker
                            ? 'text-red-700'
                            : top.suit === '♦'
                            ? 'text-blue-600'
                            : top.suit === '♣'
                            ? 'text-emerald-700'
                            : top.suit === '♥'
                            ? 'text-red-600'
                            : 'text-slate-950';
                          const topSuitColor = top.suit === '♥' || top.suit === '♦' ? 'text-red-600' : 'text-slate-950';
                          return (
                            <>
                              <div className="flex flex-col items-start leading-none">
                                <span className={`text-[11px] sm:text-xs font-black leading-none ${topRankColor}`}>
                                  {topIsJoker ? 'JOK' : top.rank}
                                </span>
                                <span className={`text-[10px] leading-none mt-0.5 ${topSuitColor}`}>
                                  {top.suit}
                                </span>
                              </div>
                              <div className={`text-xl sm:text-2xl text-center leading-none my-auto ${topSuitColor}`}>
                                {top.suit}
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    ) : (
                      <div
                        className="relative w-11 h-16 sm:w-14 sm:h-20 rounded-xl border-2 border-dashed border-amber-300/45 bg-black/30 flex flex-col items-center justify-center text-[9px] font-black text-amber-200/75 text-center px-1 z-10"
                        title={t.discardPileTip}
                      >
                        <span>{t.discardSlotLabel}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Center Felt: Open Table Melds (IMG_3903 - Full 2-3 row visibility) + Revealed Winner Cards For Trust */}
                <div className="flex-1 min-w-0 max-h-full flex flex-wrap items-center justify-center content-center gap-1 sm:gap-1.5 px-1 overflow-visible">
                  {winnerCelebration?.show &&
                    ((winnerCelebration.winnerGroups && winnerCelebration.winnerGroups.length > 0) ||
                      winnerCelebration.winnerClosingCard) && (
                      <div className="w-full max-w-xl mx-auto mb-1 p-1.5 sm:p-2 rounded-2xl bg-black/70 border-2 border-yellow-400/80 shadow-[0_0_24px_rgba(250,204,21,0.35)] backdrop-blur-md">
                        <div className="flex items-center justify-between gap-2 px-1 pb-1 border-b border-yellow-400/20">
                          <span className="text-[10px] sm:text-xs font-black text-yellow-300 truncate">
                            {t.winnerCardsHeader} • {winnerCelebration.winnerName}
                          </span>
                          <span className="text-[9px] text-emerald-300 font-bold hidden sm:inline">
                            {t.winnerCardsTrustNote}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1.5">
                          {(winnerCelebration.winnerGroups || []).map((grp, gIdx) => {
                            const grpBorder =
                              grp.label === 'pair'
                                ? 'border-fuchsia-400/60 bg-fuchsia-950/35'
                                : grp.label === 'catris'
                                ? 'border-sky-400/60 bg-sky-950/35'
                                : 'border-emerald-400/60 bg-emerald-950/35';
                            const grpText =
                              grp.label === 'pair'
                                ? t.winnerGroupPair
                                : grp.label === 'catris'
                                ? t.winnerGroupCatris
                                : t.winnerGroupTris;
                            return (
                              <div
                                key={gIdx}
                                className={`flex flex-col items-center p-1 rounded-xl border ${grpBorder}`}
                              >
                                <div className="flex items-center -space-x-2.5 sm:-space-x-3">
                                  {grp.cards.map((c, cIdx) => {
                                    const cIsJ = Boolean(c.isJoker || c.rank === 'JOKER');
                                    const rClr = cIsJ
                                      ? 'text-red-700'
                                      : c.suit === '♦'
                                      ? 'text-blue-600'
                                      : c.suit === '♣'
                                      ? 'text-emerald-700'
                                      : c.suit === '♥'
                                      ? 'text-red-600'
                                      : 'text-slate-950';
                                    const sClr =
                                      c.suit === '♥' || c.suit === '♦' ? 'text-red-600' : 'text-slate-950';
                                    return (
                                      <div
                                        key={`${c.id}_${cIdx}`}
                                        className={`w-7 h-10 sm:w-8 sm:h-11 rounded-md p-0.5 flex flex-col justify-between shadow border ${
                                          cIsJ
                                            ? 'bg-[#fef3c7] border-amber-400'
                                            : 'bg-[#fcfbf7] border-slate-300'
                                        }`}
                                      >
                                        <span className={`text-[9px] sm:text-[10px] font-black leading-none ${rClr}`}>
                                          {cIsJ ? 'JOK' : c.rank}
                                        </span>
                                        <span className={`text-xs sm:text-sm leading-none self-end ${sClr}`}>
                                          {cIsJ ? '🃏' : c.suit}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                                <span className="text-[8px] font-black text-white/80 mt-0.5 leading-none">
                                  {grpText}
                                </span>
                              </div>
                            );
                          })}
                          {winnerCelebration.winnerClosingCard && (
                            <div className="flex flex-col items-center p-1 rounded-xl border border-yellow-400/75 bg-amber-950/45">
                              {(() => {
                                const cc = winnerCelebration.winnerClosingCard;
                                const ccIsJ = Boolean(cc.isJoker || cc.rank === 'JOKER');
                                const rClr = ccIsJ
                                  ? 'text-red-700'
                                  : cc.suit === '♦'
                                  ? 'text-blue-600'
                                  : cc.suit === '♣'
                                  ? 'text-emerald-700'
                                  : cc.suit === '♥'
                                  ? 'text-red-600'
                                  : 'text-slate-950';
                                const sClr =
                                  cc.suit === '♥' || cc.suit === '♦' ? 'text-red-600' : 'text-slate-950';
                                return (
                                  <div
                                    className={`w-7 h-10 sm:w-8 sm:h-11 rounded-md p-0.5 flex flex-col justify-between shadow border ${
                                      ccIsJ
                                        ? 'bg-[#fef3c7] border-amber-400'
                                        : 'bg-[#fcfbf7] border-slate-300'
                                    }`}
                                  >
                                    <span className={`text-[9px] sm:text-[10px] font-black leading-none ${rClr}`}>
                                      {ccIsJ ? 'JOK' : cc.rank}
                                    </span>
                                    <span className={`text-xs sm:text-sm leading-none self-end ${sClr}`}>
                                      {ccIsJ ? '🃏' : cc.suit}
                                    </span>
                                  </div>
                                );
                              })()}
                              <span className="text-[8px] font-black text-yellow-300 mt-0.5 leading-none">
                                {t.winnerGroupClosing}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  {tableMelds.map((meld) => {
                    const meldCount = tableMelds.length;
                    const meldCardSize =
                      meldCount >= 9
                        ? 'w-7.5 h-11 sm:w-9.5 sm:h-13.5'
                        : meldCount >= 5
                        ? 'w-9 h-13 sm:w-11 sm:h-15'
                        : 'w-10.5 h-15 sm:w-12.5 sm:h-[70px]';
                    const meldOverlap =
                      meldCount >= 9
                        ? '-space-x-3.5 sm:-space-x-4.5'
                        : meldCount >= 5
                        ? '-space-x-4 sm:-space-x-5'
                        : '-space-x-5 sm:-space-x-6';
                    return (
                      <div
                        key={meld.id}
                        className={`relative p-0.5 sm:p-1 rounded-lg sm:rounded-xl bg-[#0b2a1e]/75 border-l-[3px] ${meld.ownerColor} border border-white/20 backdrop-blur-sm shadow-[0_5px_14px_rgba(0,0,0,0.45)]`}
                      >
                        <div className={`flex items-center ${meldOverlap}`}>
                          {meld.cards.map((c, cIdx) => {
                            const isLast = cIdx === meld.cards.length - 1;
                            const jokerInfo = c.isJoker ? getTableMeldJokerInfo(meld, cIdx) : null;
                            const displayRank = c.isJoker ? jokerInfo?.rank || 'JOK' : c.rank;
                            const displaySuit = c.isJoker ? jokerInfo?.suit || '🃏' : c.suit;
                            const rankColorClass = c.isJoker
                              ? displaySuit === '♦'
                                ? 'text-blue-600'
                                : displaySuit === '♣'
                                ? 'text-emerald-700'
                                : displaySuit === '♥'
                                ? 'text-red-600'
                                : 'text-amber-700'
                              : c.suit === '♦'
                              ? 'text-blue-600'
                              : c.suit === '♣'
                              ? 'text-emerald-700'
                              : c.suit === '♥'
                              ? 'text-red-600'
                              : 'text-slate-950';
                            const suitColorClass =
                              displaySuit === '♥' || displaySuit === '♦' ? 'text-red-600' : 'text-slate-950';
                            return (
                              <div
                                key={c.id + cIdx}
                                onClick={() => handleTableMeldClick(meld.id, cIdx)}
                                className={`${meldCardSize} relative rounded-md sm:rounded-lg p-0.5 sm:p-1 flex flex-col justify-between shadow-[0_2px_7px_rgba(0,0,0,0.38)] cursor-pointer transition hover:scale-105 hover:z-30 select-none border ${
                                  c.isJoker
                                    ? 'bg-[#fef3c7] border-amber-400 ring-1 ring-amber-400/70'
                                    : 'bg-[#fcfbf7] border-slate-300/90'
                                }`}
                              >
                                <div className="flex flex-col items-start pl-0.5 leading-none">
                                  <span
                                    className={`${
                                      meldCount >= 9 ? 'text-[11px] sm:text-xs' : 'text-xs sm:text-sm'
                                    } font-black tracking-tighter leading-none ${rankColorClass}`}
                                  >
                                    {displayRank}
                                  </span>
                                  <span
                                    className={`${
                                      meldCount >= 9 ? 'text-[10px] sm:text-[11px]' : 'text-[11px] sm:text-xs'
                                    } leading-none mt-0.5 ${suitColorClass}`}
                                  >
                                    {displaySuit}
                                  </span>
                                </div>

                                {c.isJoker ? (
                                  <div className="flex items-center justify-end px-0.5 pb-0.5 mt-auto">
                                    <span className="text-[11px] sm:text-sm leading-none">🃏</span>
                                  </div>
                                ) : (
                                  isLast && (
                                    <div
                                      className={`self-end pr-0.5 pb-0.5 ${
                                        meldCount >= 9 ? 'text-base sm:text-2xl' : 'text-xl sm:text-3xl'
                                      } leading-none ${suitColorClass}`}
                                    >
                                      {c.suit}
                                    </div>
                                  )
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Right Column: Side Seat (4/5 players stacked neatly above) + Closed Sets Badges (IMG_3905) */}
                {(closedSetBadges.length > 0 || playerSeatCount === 4 || playerSeatCount === 5) && (
                  <div className="flex flex-col items-end justify-center gap-1.5 shrink-0">
                    {playerSeatCount === 4 && (
                      <div className="flex scale-90 origin-right">
                        {renderOpponentSeat(opponents[2], 3)}
                      </div>
                    )}
                    {playerSeatCount === 5 && (
                      <div className="flex scale-90 origin-right">
                        {renderOpponentSeat(opponents[3], 4)}
                      </div>
                    )}

                    {closedSetBadges.length > 0 && (
                      <div className="flex flex-col items-end gap-1 sm:gap-1.5">
                        {closedSetBadges.map((badge) => (
                          <div
                            key={badge.id}
                            className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-[#fcfbf7] border-l-4 ${badge.ownerColor} shadow-[0_4px_12px_rgba(0,0,0,0.45)] flex items-center gap-1 text-[11px] sm:text-sm font-black tracking-tight`}
                            title={t.closedSetsTip}
                          >
                            <span className="text-slate-950 font-black mr-0.5">{badge.rank}</span>
                            <span className="text-slate-950 leading-none">♠</span>
                            <span className="text-red-600 leading-none">♥</span>
                            <span className="text-slate-950 leading-none">♣</span>
                            <span className="text-red-600 leading-none">♦</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ====================================================
                  BOTTOM ROW: PILL+CIRCULAR TIMER HUD (LEFT) + LARGER HAND CARDS (CENTER) + ACTION STACK (RIGHT)
                 ==================================================== */}
              <div className="relative z-30 flex items-end justify-between gap-1.5 sm:gap-2 pt-1 pb-0.5 shrink-0">
                {/* Bottom-Left: Compact Player HUD (Gold Pill + Avatar + Username + Smaller Circular Timer Ring) */}
                <div className="relative flex items-center shrink-0 mb-0.5">
                  {/* Left Dark Gold-Bordered Capsule Pill */}
                  <div
                    className={`rounded-full pl-0.5 pr-6 sm:pr-7 py-0.5 flex items-center gap-1 sm:gap-1.5 bg-[#161012]/95 border-[1.5px] shadow-[0_6px_16px_rgba(0,0,0,0.8)] backdrop-blur-md ${
                      currentTurn === 0 && turnSeconds <= 30 ? 'border-rose-500' : 'border-[#d4a55b]'
                    }`}
                  >
                    {/* Circular Portrait Avatar */}
                    <div className="relative w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-sky-200 border border-[#d4a55b] flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                      <svg viewBox="0 0 36 36" className="w-full h-full">
                        <circle cx="18" cy="18" r="18" fill="#a5d8f3" />
                        <path d="M8 36c0-6 4.5-9.5 10-9.5s10 3.5 10 9.5z" fill="#2c4f8a" />
                        <path d="M14 27l4 6 4-6z" fill="#ffffff" />
                        <ellipse cx="18" cy="16" rx="6" ry="7" fill="#9a6445" />
                        <path d="M12 14c0-4.5 2.5-7 6-7s6 2.5 6 7c-1.5-2-4-2.5-6-2.5s-4.5.5-6 2.5z" fill="#221712" />
                        <circle cx="15.8" cy="15.5" r="0.8" fill="#1b120e" />
                        <circle cx="20.2" cy="15.5" r="0.8" fill="#1b120e" />
                        <path d="M15.8 19.2c1.2 1 3.2 1 4.4 0" stroke="#ffffff" strokeWidth="1" fill="none" strokeLinecap="round" />
                      </svg>
                      {ceremonyDealer === playerName && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-amber-400 text-slate-950 font-black text-[6px] flex items-center justify-center shadow">
                          D
                        </span>
                      )}
                    </div>

                    {/* Username & Card Count */}
                    <div className="flex flex-col leading-tight min-w-0 pr-0.5">
                      <span className="text-[9px] sm:text-[10px] font-bold text-[#f0c078] truncate max-w-[46px] sm:max-w-[58px]">
                        {playerName}
                      </span>
                      <div className="flex items-center gap-0.5">
                        <span className="text-[8px] sm:text-[9px] font-semibold text-[#a58e76]">
                          {isSelfSuspended ? t.suspendedBadge : `${playerHand.length} ${t.cardWord}`}
                        </span>
                        {!isSelfSuspended && hasMelded && (
                          <span className="px-0.5 rounded bg-emerald-500/30 text-emerald-300 text-[6px] font-black">
                            ✓
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Overlapping Glossy Circular Timer Ring (Compact) */}
                  <div
                    className={`-ml-5 sm:-ml-5.5 relative w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-b from-[#2b221e] to-[#0d0908] border-[1.5px] flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(227,181,104,0.45)] ${
                      isSelfSuspended
                        ? 'border-rose-500/70 opacity-75'
                        : currentTurn === 0 && turnSeconds <= 30
                        ? 'border-rose-500 animate-pulse shadow-[0_0_14px_rgba(244,63,94,0.65)]'
                        : 'border-[#e3b568]'
                    }`}
                  >
                    <svg viewBox="0 0 48 48" className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none">
                      <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2.6" />
                      <circle
                        cx="24"
                        cy="24"
                        r="20"
                        fill="none"
                        stroke={currentTurn === 0 && turnSeconds <= 30 ? '#f43f5e' : '#f0bd69'}
                        strokeWidth="2.8"
                        strokeLinecap="round"
                        strokeDasharray={125.66}
                        strokeDashoffset={125.66 * (1 - Math.min(1, Math.max(0, turnSeconds / 120)))}
                        className="transition-all duration-1000"
                      />
                    </svg>
                    <div className="absolute inset-x-1 top-0.5 h-1/2 rounded-t-full bg-gradient-to-b from-white/15 to-transparent pointer-events-none" />
                    <span
                      className={`relative z-10 text-[9px] sm:text-[10px] font-black font-sans tracking-tight ${
                        isSelfSuspended || (currentTurn === 0 && turnSeconds <= 30) ? 'text-rose-400' : 'text-[#f4c67a]'
                      }`}
                    >
                      {isSelfSuspended ? '👁️' : formatTimer(turnSeconds)}
                    </span>
                  </div>
                </div>

                {isSelfSuspended ? (
                  <div className="flex-1 min-w-0 flex items-center justify-center px-2 py-2">
                    <div className="px-4 py-2 rounded-2xl bg-rose-950/80 border border-rose-400/50 text-rose-100 text-[11px] sm:text-xs font-black text-center shadow-xl backdrop-blur-md">
                      {t.spectatorBanner}
                    </div>
                  </div>
                ) : (
                <>
                {/* Bottom-Center: Hand-Held Curved Card Fan (IMG_3933) with Smooth Non-Jittery Sliding */}
                <div className="flex-1 min-w-0 flex items-end justify-center overflow-visible -mb-3 sm:-mb-4 pt-5">
                  <div
                    className={`flex items-end px-2 overflow-visible ${
                      playerHand.length >= 11 ? '-space-x-6 sm:-space-x-7.5' : '-space-x-5 sm:-space-x-6.5'
                    }`}
                  >
                    {playerHand.map((card, idx) => {
                      const isSelected = selectedCardIds.has(card.id);
                      const activeDrag = dragCardState !== null && dragMovedRef.current;
                      const dragIdx = dragCardState?.index ?? -1;
                      const isDragging = activeDrag && dragIdx === idx;
                      const isHoverTarget =
                        activeDrag &&
                        dragHoverTarget === idx &&
                        dragIdx !== idx;
                      const grpInfo = cardToGroupMap.get(card.id);

                      const total = playerHand.length;
                      const maxAngle = total > 8 ? 22 : 12;
                      const angleStep = total > 1 ? maxAngle / (total - 1) : 0;
                      const angle = total > 1 ? -maxAngle / 2 + idx * angleStep : 0;
                      const norm = total > 1 ? (idx - (total - 1) / 2) / ((total - 1) / 2) : 0;
                      const arcY = Math.abs(norm) * Math.abs(norm) * 16;
                      const translateY = isSelected ? arcY - 22 : arcY;

                      // Gently slide neighboring cards aside during drag without changing their scale or rect feedback
                      let shiftX = 0;
                      if (activeDrag && dragHoverTarget !== null && dragHoverTarget !== dragIdx) {
                        if (dragHoverTarget > dragIdx && idx > dragIdx && idx <= dragHoverTarget) {
                          shiftX = -14;
                        } else if (dragHoverTarget < dragIdx && idx >= dragHoverTarget && idx < dragIdx) {
                          shiftX = 14;
                        }
                      }

                      const isJoker = card.isJoker || card.rank === 'JOKER';
                      const rankColorClass = isJoker
                        ? 'text-red-700'
                        : card.suit === '♦'
                        ? 'text-blue-600'
                        : card.suit === '♣'
                        ? 'text-emerald-700'
                        : card.suit === '♥'
                        ? 'text-red-600'
                        : 'text-slate-950';
                      const suitColorClass =
                        card.suit === '♥' || card.suit === '♦' ? 'text-red-600' : 'text-slate-950';

                      return (
                        <div
                          key={card.id}
                          data-hand-index={idx}
                          data-card-drag="true"
                          onPointerDown={(e) => handleCardPointerDown(idx, e)}
                          onClick={() => {
                            if (justDraggedRef.current) return;
                            toggleSelectCard(card.id);
                          }}
                          style={{
                            transform: `translateX(${shiftX}px) rotate(${angle}deg) translateY(${translateY}px)`,
                            transformOrigin: 'bottom center',
                            transition:
                              'transform 280ms cubic-bezier(0.22, 1, 0.36, 1), opacity 200ms ease',
                            zIndex: isSelected ? 40 : 10 + idx,
                            opacity: isDragging ? 0.14 : 1,
                            touchAction: 'none',
                          }}
                          className={`relative w-14 h-25 sm:w-[70px] sm:h-[118px] rounded-xl bg-[#fcfbf7] border border-stone-300/95 flex flex-col justify-between p-1.5 select-none cursor-grab active:cursor-grabbing shadow-[0_8px_20px_rgba(0,0,0,0.68)] ${
                            isSelected
                              ? 'border-yellow-400 ring-2 ring-yellow-400 shadow-[0_12px_24px_rgba(250,204,21,0.65)]'
                              : ''
                          } ${isHoverTarget ? 'border-amber-400 ring-2 ring-amber-400/80' : ''} ${
                            showGroupHints && grpInfo ? `border-t-[3.5px] ${grpInfo.colorClass}` : ''
                          }`}
                        >
                          {isHoverTarget && (
                            <span className="absolute -top-4.5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[8px] shadow-md whitespace-nowrap z-50 pointer-events-none">
                              {t.hereMarker}
                            </span>
                          )}

                          {/* Top-Left Crisp Corner Rank & Suit (Visible along the entire curved fan) */}
                          <div className="flex flex-col items-start pl-0.5 leading-none">
                            {isJoker ? (
                              <div className="flex flex-col items-center leading-[0.88] text-[8px] sm:text-[9px] font-black text-red-700 tracking-tighter">
                                <span>J</span>
                                <span>O</span>
                                <span>K</span>
                                <span>E</span>
                                <span>R</span>
                              </div>
                            ) : (
                              <>
                                <span
                                  className={`text-[15px] sm:text-[18px] font-black tracking-tighter leading-none ${rankColorClass}`}
                                >
                                  {card.rank}
                                </span>
                                <span
                                  className={`text-[13px] sm:text-[15px] leading-none mt-0.5 ${suitColorClass}`}
                                >
                                  {card.suit}
                                </span>
                              </>
                            )}
                          </div>

                          {/* Center Suit / Joker Face */}
                          <div className="flex items-center justify-center my-auto pb-2">
                            {isJoker ? (
                              <span className="text-2xl sm:text-3xl leading-none">🃏</span>
                            ) : (
                              <span
                                className={`text-xl sm:text-2xl leading-none opacity-85 ${suitColorClass}`}
                              >
                                {card.suit}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Bottom-Right Vertical Button Stack (Always Shows ✦ ደርድር) */}
                <div className="flex flex-col gap-1 w-24 sm:w-28 shrink-0 items-stretch pb-0.5 z-40">
                  {/* 0. Dopey Button */}
                  {dopeyReadyInfo.isDopey && (
                    <button
                      onClick={() => handleFinalWinCheck(playerHand)}
                      className="w-full py-1 px-1.5 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-slate-950 font-black text-[9px] sm:text-[11px] shadow-[0_0_18px_rgba(250,204,21,0.9)] border border-yellow-100 flex items-center justify-center gap-1 animate-pulse active:scale-95 transition cursor-pointer"
                    >
                      <span>
                        {dopeyReadyInfo.isJokerFinished ? t.dopeyJokerBtn : t.dopeyBtn}
                      </span>
                    </button>
                  )}

                  {/* 1. Meld Button */}
                  {calculatedMeldStats.canMeld && (
                    <button
                      onClick={handleMeldClick}
                      className="w-full py-1 px-2 rounded-xl bg-gradient-to-b from-[#fae29c] via-[#e9bd55] to-[#c9952a] text-slate-950 font-black text-[10px] sm:text-xs shadow-[0_0_16px_rgba(250,204,21,0.65)] border border-yellow-200 flex items-center justify-center gap-1 active:scale-95 transition cursor-pointer"
                    >
                      <ArrowDownCircle className="w-3 h-3 text-sky-700 shrink-0" />
                      <span>{t.meldBtn(calculatedMeldStats.points)}</span>
                    </button>
                  )}

                  {/* 2. Auto Sort Button */}
                  <button
                    onClick={handleAutoSort}
                    className="w-full py-1 px-2 rounded-xl bg-gradient-to-b from-[#fae29c] via-[#e9bd55] to-[#c9952a] text-slate-950 font-black text-[10px] sm:text-xs shadow-lg border border-yellow-200 flex items-center justify-center gap-1 active:scale-95 transition cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3 text-slate-950 shrink-0" />
                    <span>{t.sortBtn}</span>
                  </button>

                  {/* 3. Return Discard Card Button */}
                  {drawnFromDiscardCard !== null && !hasDiscarded && (
                    <button
                      onClick={handleReturnDiscardCard}
                      className="w-full py-1 px-2 rounded-xl bg-gradient-to-b from-[#fae29c] via-[#e9bd55] to-[#c9952a] text-slate-950 font-black text-[10px] sm:text-xs shadow-lg border border-yellow-200 flex items-center justify-center gap-1 active:scale-95 transition cursor-pointer"
                    >
                      <span>{t.returnBtn}</span>
                    </button>
                  )}

                  {/* 4. Discard Button */}
                  {currentTurn === 0 && hasDrawn && !hasDiscarded && selectedCardIds.size === 1 && (() => {
                    const isLockedByOpeningDiscardPickup = !hasMelded && drawnFromDiscardCard !== null;
                    return (
                      <button
                        onClick={() => {
                          const [cardId] = Array.from(selectedCardIds);
                          handleDiscardAttempt(cardId);
                        }}
                        className={`w-full py-1 px-2 rounded-xl font-black text-[10px] sm:text-xs shadow-lg border flex items-center justify-center gap-1 transition ${
                          isLockedByOpeningDiscardPickup
                            ? 'bg-slate-800/90 border-rose-500/40 text-gray-300 opacity-75 cursor-not-allowed'
                            : 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white border-rose-300 active:scale-95 cursor-pointer'
                        }`}
                      >
                        {isLockedByOpeningDiscardPickup && (
                          <Lock className="w-2.5 h-2.5 text-rose-300 shrink-0" />
                        )}
                        <span>{isLockedByOpeningDiscardPickup ? t.discardLockedBtn : t.discardBtn}</span>
                      </button>
                    );
                  })()}
                </div>
                </>
                )}
              </div>
            </div>
          </main>
        </div>
      )}

      {/* ========================================================
          BANNED / SUSPENDED FOR TIMEOUT MODAL (WITH LIVE SPECTATOR OPTION)
         ======================================================== */}
      {isBannedModalOpen && !winnerCelebration?.show && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[100000] flex items-center justify-center p-4">
          <div className="bg-[#1b0b18] border-2 border-rose-500 rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl">
            <Ban className="w-12 h-12 text-rose-500 mx-auto" />
            <h3 className="text-lg font-black text-rose-400">{t.bannedTitle}</h3>
            <p className="text-xs text-gray-300 leading-relaxed">
              {isSelfSuspended ? t.bannedSpectatorDesc : t.bannedDesc}
            </p>
            {isSelfSuspended ? (
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setIsBannedModalOpen(false)}
                  className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:brightness-105 text-slate-950 font-black text-xs cursor-pointer shadow-lg"
                >
                  {t.watchGameBtn}
                </button>
                <button
                  onClick={() => {
                    setIsBannedModalOpen(false);
                    clearLocalSuspendedGame();
                    if (activeMultiplayerRoomCode) {
                      void leaveMultiplayerTable(false);
                      return;
                    }
                    setView('lobby');
                  }}
                  className="w-full py-2 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-gray-300 font-bold text-xs cursor-pointer"
                >
                  {t.backToLobbyBtn}
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setIsBannedModalOpen(false);
                  clearLocalSuspendedGame();
                  if (activeMultiplayerRoomCode) {
                    void leaveMultiplayerTable(false);
                    return;
                  }
                  setView('lobby');
                }}
                className="w-full py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs cursor-pointer"
              >
                {t.backToLobbyBtn}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          PRIVATE ROOM CREATION MODAL
         ======================================================== */}
      {isPrivateModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-[#190a33] border-2 border-teal-400/50 rounded-3xl p-4 sm:p-5 max-w-md w-full space-y-3.5 shadow-2xl my-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-teal-400" />
                <h3 className="text-base font-black text-white">{t.privateModalTitle}</h3>
              </div>
              <button
                onClick={() => setIsPrivateModalOpen(false)}
                className="text-gray-400 hover:text-white font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {(() => {
              const privateInviteLink = `https://t.me/${telegramBotUsername}?start=ramino_${encodeURIComponent(privateCode)}`;
              const joinedPlayers = privateRoomState?.players || [
                { name: playerName, isHost: true, joinedAt: Date.now() },
              ];
              const friendSlotsCount = playerSeatCount - 1;

              const inviteMessage = `${t.inviteTextHeader}\n👥 ${t.seatOptionLabel(playerSeatCount)} • 🪙 ${privateStake} ${t.currencyUnit}\n🔑 ${privateCode}\n🔗 ${privateInviteLink}`;
              const telegramInviteUrl = `https://t.me/share/url?url=${encodeURIComponent(privateInviteLink)}&text=${encodeURIComponent(
                `${t.inviteTextHeader}\n👥 ${t.seatOptionLabel(playerSeatCount)} • 🪙 ${privateStake} ${t.currencyUnit}\n🔑 ${privateCode}`
              )}`;
              const whatsappInviteUrl = `https://wa.me/?text=${encodeURIComponent(inviteMessage)}`;

              const handleShareInvite = async () => {
                if (typeof navigator !== 'undefined' && navigator.share) {
                  try {
                    await navigator.share({
                      title: `${t.brandTitle} (${privateCode})`,
                      text: inviteMessage,
                      url: privateInviteLink,
                    });
                    return;
                  } catch {}
                }
                navigator.clipboard?.writeText(inviteMessage).catch(() => {});
                setLinkCopied(true);
                triggerNotification(t.notifyInviteCopied);
                setTimeout(() => setLinkCopied(false), 2000);
              };

              return (
                <div className="space-y-3 text-xs">
                  {/* Step 1: Choose Number of Friends */}
                  <div className="space-y-1.5">
                    <label className="text-gray-200 font-black flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <UserPlus className="w-3.5 h-3.5 text-teal-300" />
                        {t.chooseFriendsStep}
                      </span>
                      <span className="text-[10px] text-amber-300 font-bold">
                        {t.seatSummary(playerSeatCount, friendSlotsCount)}
                      </span>
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {([2, 3, 4, 5] as const).map((cnt) => (
                        <button
                          key={cnt}
                          type="button"
                          onClick={() => {
                            raminoAudio.playCardSnap();
                            setPlayerSeatCount(cnt);
                          }}
                          className={`py-2 px-1 rounded-xl border flex flex-col items-center justify-center transition cursor-pointer ${
                            playerSeatCount === cnt
                              ? 'bg-teal-500/25 border-teal-300 ring-1 ring-teal-300 text-white font-black'
                              : 'bg-black/40 border-white/10 text-gray-300 hover:border-teal-400/40'
                          }`}
                        >
                          <span className="text-[11px] font-black">{t.seatPersonCount(cnt)}</span>
                          <span className="text-[9px] text-teal-300/90">
                            {cnt === 2 ? t.friendSingle : t.friendPlural(cnt - 1)}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Step 2: Dedicated Private Room Stake */}
                  <div className="space-y-1.5">
                    <label className="text-gray-200 font-black flex items-center justify-between">
                      <span>🪙 {t.privateStakeStep}</span>
                      <span className="text-[11px] font-mono font-black text-amber-300">
                        {privateStake.toLocaleString()} {t.currencyUnit}
                      </span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="10"
                        step="10"
                        value={privateStake}
                        onChange={(e) => setPrivateStake(Math.max(10, parseInt(e.target.value, 10) || 10))}
                        placeholder={t.stakePlaceholder}
                        className="w-full px-3 py-2 rounded-xl bg-black/60 border border-teal-500/40 text-amber-300 font-mono font-bold text-sm focus:outline-none focus:border-yellow-400"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono font-black text-yellow-400 text-[11px]">
                        {t.currencyUnit}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[30, 50, 100, 200, 500, 1000, 2000, 5000].map((stakeOpt) => (
                        <button
                          key={stakeOpt}
                          type="button"
                          onClick={() => {
                            raminoAudio.playCardSnap();
                            setPrivateStake(stakeOpt);
                          }}
                          className={`py-1.5 rounded-lg text-[11px] font-black transition cursor-pointer border ${
                            privateStake === stakeOpt
                              ? 'bg-amber-400 text-slate-950 border-amber-300 shadow'
                              : 'bg-black/40 text-gray-200 border-white/10 hover:border-teal-400/50'
                          }`}
                        >
                          {stakeOpt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Step 3: Room Code */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-gray-200 font-black">{t.roomCodeStep}</label>
                      <button
                        type="button"
                        onClick={() => {
                          raminoAudio.playCardSnap();
                          setPrivateCode(`RAMINO-${Math.floor(1000 + Math.random() * 9000)}`);
                        }}
                        className="text-[10px] text-teal-300 hover:text-teal-200 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>{t.newCodeBtn}</span>
                      </button>
                    </div>
                    <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-black/60 border border-teal-500/40 text-amber-300 font-mono font-black text-base">
                      <span>{privateCode}</span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.writeText(privateCode).catch(() => {});
                          setCodeCopied(true);
                          setTimeout(() => setCodeCopied(false), 1800);
                        }}
                        className="text-[11px] text-teal-300 font-sans flex items-center gap-1 cursor-pointer"
                      >
                        {codeCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{codeCopied ? t.copiedBtn : t.copyCodeBtn}</span>
                      </button>
                    </div>
                  </div>

                  {/* Step 3: Invite Link via Telegram & WhatsApp */}
                  <div className="space-y-1.5">
                    <label className="text-gray-200 font-black flex items-center gap-1.5">
                      <Link2 className="w-3.5 h-3.5 text-amber-300" />
                      {t.inviteLinkStep}
                    </label>
                    <div className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-black/60 border border-purple-400/30">
                      <span className="flex-1 truncate text-[10px] font-mono text-sky-300">
                        {privateInviteLink}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.writeText(privateInviteLink).catch(() => {});
                          setLinkCopied(true);
                          triggerNotification(t.notifyLinkCopied);
                          setTimeout(() => setLinkCopied(false), 1800);
                        }}
                        className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-teal-300 font-bold text-[10px] flex items-center gap-1 shrink-0 cursor-pointer"
                      >
                        {linkCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        <span>{linkCopied ? t.copiedBtn : t.copyLinkBtn}</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <a
                        href={telegramInviteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-2.5 px-2 rounded-xl bg-[#229ED9]/20 hover:bg-[#229ED9]/35 border border-[#229ED9]/60 text-sky-200 font-black text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-[#29B6F6] shrink-0">
                          <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z" />
                        </svg>
                        <span>{t.sendTelegramBtn}</span>
                      </a>

                      <a
                        href={whatsappInviteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-2.5 px-2 rounded-xl bg-[#25D366]/20 hover:bg-[#25D366]/35 border border-[#25D366]/60 text-emerald-200 font-black text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-[#25D366] shrink-0">
                          <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21 5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zm5.79 14.12c-.24.68-1.41 1.3-1.95 1.38-.52.08-1.18.11-1.91-.12-.44-.14-1-.33-1.72-.64-3.03-1.31-5.01-4.37-5.16-4.57-.15-.2-1.23-1.64-1.23-3.13 0-1.49.78-2.22 1.06-2.52.28-.3.6-.38.8-.38.2 0 .4 0 .57.01.18.01.43-.07.67.51.24.59.83 2.03.9 2.18.08.15.13.32.03.52-.1.2-.15.32-.3.5-.15.18-.32.4-.45.54-.15.15-.31.32-.13.62.18.3.79 1.31 1.7 2.12 1.17 1.04 2.15 1.37 2.45 1.52.3.15.48.13.66-.08.18-.2.76-.89.96-1.19.2-.3.41-.25.68-.15.28.1 1.76.83 2.06.98.3.15.5.22.57.35.08.13.08.73-.16 1.41z" />
                        </svg>
                        <span>{t.sendWhatsappBtn}</span>
                      </a>
                    </div>

                    <button
                      type="button"
                      onClick={handleShareInvite}
                      className="w-full py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-amber-200 font-bold text-[11px] flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <Share2 className="w-3 h-3" />
                      <span>{t.shareFullInviteBtn}</span>
                    </button>
                  </div>

                  {/* Step 4: Live Invited / Joined Friends Tracker */}
                  <div className="p-2.5 rounded-2xl bg-black/45 border border-white/10 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-black text-gray-200">
                      <span>{t.joinedFriendsHeader(joinedPlayers.length, playerSeatCount)}</span>
                      <span className="text-emerald-400 flex items-center gap-1 text-[10px]">
                        <Mic className="w-3 h-3" /> {t.voiceChannelReady}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {Array.from({ length: playerSeatCount }).map((_, idx) => {
                        const occupant = joinedPlayers[idx];
                        return (
                          <div
                            key={idx}
                            className={`px-2 py-1.5 rounded-lg border text-[10px] font-bold flex items-center justify-between ${
                              occupant
                                ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-200'
                                : 'bg-white/5 border-white/10 text-gray-400'
                            }`}
                          >
                            <span className="truncate">
                              {occupant ? `${occupant.isHost ? '👑 ' : '✓ '}${occupant.name}` : t.waitingFriendSlot(idx)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}

            <button
              onClick={async () => {
                unlockRemoteAudioElements();
                const cleanCode = privateCode.trim().toUpperCase();
                const targetStake = Math.max(10, privateStake);
                if (balance < targetStake) {
                  raminoAudio.playBuzzer();
                  triggerNotification(t.notifyInsufficientWallet);
                  return;
                }
                try {
                  await syncPrivateRoomToHost(cleanCode, playerSeatCount, targetStake);
                  const res = await fetch(
                    buildApiUrl(`/api/ramino/private-rooms/${encodeURIComponent(cleanCode)}/start`),
                    {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ playerId: myPlayerId }),
                    }
                  );
                  const data = await res.json();
                  if (!res.ok || !data?.ok || !data.table) {
                    raminoAudio.playBuzzer();
                    triggerNotification(data?.error || t.notifyJoinLookupErr);
                    return;
                  }
                  heldWaitingStakeRef.current = targetStake;
                  adjustWalletBalance(-targetStake, `Ramino Private ${cleanCode}`);
                  setIsPrivateRoomGame(true);
                  setActivePrivateRoomCode(cleanCode);
                  setActiveMultiplayerRoomCode(cleanCode);
                  activeMultiplayerRoomCodeRef.current = cleanCode;
                  setActiveTableStake(targetStake);
                  setIsMicMuted(true);
                  setIsPrivateModalOpen(false);
                  applyServerTableSnapshot(data.table);
                } catch {
                  raminoAudio.playBuzzer();
                  triggerNotification(t.notifyJoinLookupErr);
                }
              }}
              className="w-full py-3 rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-sm shadow-xl transition cursor-pointer"
            >
              {t.startPrivateRoomBtn(privateStake, playerSeatCount)}
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          JOIN BY CODE / INVITE LINK MODAL
         ======================================================== */}
      {isJoinCodeModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#190a33] border-2 border-blue-400/50 rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-blue-400" />
                <h3 className="text-base font-black text-white">{t.joinModalTitle}</h3>
              </div>
              <button
                onClick={() => setIsJoinCodeModalOpen(false)}
                className="text-gray-400 hover:text-white font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-gray-300 font-bold block mb-1">{t.enterCodeLabel}</label>
                <input
                  type="text"
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                  placeholder={t.codePlaceholder}
                  className="w-full px-3 py-2.5 rounded-xl bg-black/60 border border-blue-400/40 text-amber-300 font-mono font-bold text-sm uppercase focus:outline-none focus:border-yellow-400"
                />
              </div>

              {joinedRoomPreview && (
                <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-400/40 space-y-1.5 text-emerald-100">
                  <div className="flex items-center justify-between font-black">
                    <span>👑 {t.hostLabel} {joinedRoomPreview.hostName}</span>
                    <span className="text-amber-300">{joinedRoomPreview.stake} {t.currencyUnit}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-emerald-200/90">
                    <span>
                      👥 {t.playersLabel} {joinedRoomPreview.players.length}/{joinedRoomPreview.maxPlayers}
                    </span>
                    <span className="flex items-center gap-1">
                      <Mic className="w-3 h-3" /> {t.voiceLabel} {joinedRoomPreview.code}
                    </span>
                  </div>
                </div>
              )}

              {joinLookupError && !joinedRoomPreview && joinCodeInput.trim().length >= 4 && (
                <div className="px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-400/30 text-amber-200 text-[11px] font-semibold">
                  {joinLookupError}
                </div>
              )}
            </div>

            <button
              onClick={async () => {
                unlockRemoteAudioElements();
                const cleanCode = joinCodeInput.trim().toUpperCase();
                if (!cleanCode) {
                  raminoAudio.playBuzzer();
                  triggerNotification(t.notifyEnterValidCode);
                  return;
                }
                try {
                  const previewRoom = joinedRoomPreview || (await lookupPrivateRoomByCode(cleanCode));
                  const preCheckStake = Number(previewRoom?.stake || 0);
                  if (preCheckStake > 0 && balance < preCheckStake) {
                    raminoAudio.playBuzzer();
                    triggerNotification(t.notifyInsufficientWallet);
                    return;
                  }
                  const res = await fetch(
                    buildApiUrl(`/api/ramino/private-rooms/${encodeURIComponent(cleanCode)}/join`),
                    {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        playerId: myPlayerId,
                        playerPhone,
                        playerName,
                      }),
                    }
                  );
                  const data = await res.json();
                  if (!res.ok || !data?.ok || !data.room || !data.table) {
                    raminoAudio.playBuzzer();
                    triggerNotification(data?.error || t.notifyJoinLookupErr);
                    return;
                  }
                  const targetSeats = ([2, 3, 4, 5].includes(Number(data.room.maxPlayers))
                    ? Number(data.room.maxPlayers)
                    : 3) as 2 | 3 | 4 | 5;
                  const targetStake = Number(data.table.stake || data.room.stake || 30);
                  if (balance < targetStake) {
                    await fetch(
                      buildApiUrl(`/api/ramino/tables/${encodeURIComponent(cleanCode)}/action`),
                      {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ playerId: myPlayerId, action: 'leave_table' }),
                      }
                    ).catch(() => {});
                    raminoAudio.playBuzzer();
                    triggerNotification(t.notifyInsufficientWallet);
                    return;
                  }
                  const resolvedVoiceKey = data.room?.voiceAccessKey || data.table?.voiceAccessKey;
                  if (resolvedVoiceKey) {
                    syncVoiceAccessKey(resolvedVoiceKey);
                  }
                  saveLocalPrivateRoom(data.room);
                  heldWaitingStakeRef.current = targetStake;
                  adjustWalletBalance(-targetStake, `Ramino Private Join ${cleanCode}`);
                  setPlayerSeatCount(targetSeats);
                  setActiveTableStake(targetStake);
                  setIsPrivateRoomGame(true);
                  setActivePrivateRoomCode(cleanCode);
                  setActiveMultiplayerRoomCode(cleanCode);
                  activeMultiplayerRoomCodeRef.current = cleanCode;
                  setIsMicMuted(true);
                  setIsJoinCodeModalOpen(false);
                  triggerNotification(t.notifyJoinedPrivateCode(cleanCode));
                  applyServerTableSnapshot(data.table);
                } catch {
                  raminoAudio.playBuzzer();
                  triggerNotification(t.notifyJoinLookupErr);
                }
              }}
              className="w-full py-3 rounded-2xl bg-blue-500 hover:bg-blue-400 text-white font-black text-sm shadow-xl transition cursor-pointer"
            >
              {t.joinRoomSubmit(joinedRoomPreview)}
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          WINNER CELEBRATION MODAL (Reveals Winner Cards + Table Peek Toggle)
         ======================================================== */}
      {winnerCelebration?.show && view !== 'postday_pick' && (
        isWinnerModalMinimized ? (
          <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-[100000] px-3 py-2 rounded-2xl bg-[#121626]/95 border-2 border-yellow-400 shadow-2xl flex items-center gap-2 max-w-[95vw]">
            <span className="text-xs font-black text-yellow-300 truncate max-w-[180px] sm:max-w-[260px]">
              {winnerCelebration.title}
            </span>
            <button
              type="button"
              onClick={() => setIsWinnerModalMinimized(false)}
              className="px-2.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-[11px] shrink-0 cursor-pointer"
            >
              {t.openWinSummaryBtn}
            </button>
          </div>
        ) : (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[100000] flex items-center justify-center p-2 sm:p-4 overflow-hidden">
          <div
            style={{ maxHeight: modalMaxHeightPx ? `${modalMaxHeightPx}px` : '88dvh' }}
            className="bg-[#121626] border-2 border-yellow-400 rounded-[28px] p-4 sm:p-5 max-w-md w-full text-center flex flex-col overflow-hidden shadow-2xl"
          >
            <div
              style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' }}
              className="flex-1 min-h-0 overflow-y-auto overscroll-contain space-y-3 pr-0.5"
            >
            <div className="flex items-start justify-between gap-2">
              <span className="w-20" />
              <span className="text-4xl leading-none">{winnerCelebration.isOpponentWin ? '🃏' : '👑'}</span>
              <button
                type="button"
                onClick={() => setIsWinnerModalMinimized(true)}
                className="px-2 py-1 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-[10px] font-black text-amber-200 whitespace-nowrap cursor-pointer"
              >
                {t.viewTableCardsBtn}
              </button>
            </div>
            <h2 className="text-base sm:text-lg font-black text-yellow-300 leading-snug">
              {winnerCelebration.title}
            </h2>

            {((winnerCelebration.winnerGroups && winnerCelebration.winnerGroups.length > 0) ||
              winnerCelebration.winnerClosingCard) && (
              <div className="p-2.5 rounded-2xl bg-[#07261a]/95 border border-emerald-400/45 space-y-1.5 text-left">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-black text-yellow-300">
                    {t.winnerCardsHeader} ({winnerCelebration.winnerName})
                  </span>
                  <span className="text-[9px] font-bold text-emerald-300/90">
                    ✓ {t.winnerCardsTrustNote}
                  </span>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-1.5 pt-0.5">
                  {(winnerCelebration.winnerGroups || []).map((grp, gIdx) => {
                    const grpStyle =
                      grp.label === 'pair'
                        ? 'border-fuchsia-400/55 bg-fuchsia-950/35'
                        : grp.label === 'catris'
                        ? 'border-sky-400/55 bg-sky-950/35'
                        : 'border-emerald-400/55 bg-emerald-950/35';
                    const grpLbl =
                      grp.label === 'pair'
                        ? t.winnerGroupPair
                        : grp.label === 'catris'
                        ? t.winnerGroupCatris
                        : t.winnerGroupTris;
                    return (
                      <div
                        key={gIdx}
                        className={`flex flex-col items-center p-1 rounded-xl border ${grpStyle}`}
                      >
                        <div className="flex items-center -space-x-2">
                          {grp.cards.map((c, cIdx) => {
                            const cIsJ = Boolean(c.isJoker || c.rank === 'JOKER');
                            const rClr = cIsJ
                              ? 'text-red-700'
                              : c.suit === '♦'
                              ? 'text-blue-600'
                              : c.suit === '♣'
                              ? 'text-emerald-700'
                              : c.suit === '♥'
                              ? 'text-red-600'
                              : 'text-slate-950';
                            const sClr =
                              c.suit === '♥' || c.suit === '♦' ? 'text-red-600' : 'text-slate-950';
                            return (
                              <div
                                key={`${c.id}_${cIdx}`}
                                className={`w-7 h-10 rounded-md p-0.5 flex flex-col justify-between shadow border ${
                                  cIsJ
                                    ? 'bg-[#fef3c7] border-amber-400'
                                    : 'bg-[#fcfbf7] border-slate-300'
                                }`}
                              >
                                <span className={`text-[9px] font-black leading-none ${rClr}`}>
                                  {cIsJ ? 'JOK' : c.rank}
                                </span>
                                <span className={`text-xs leading-none self-end ${sClr}`}>
                                  {cIsJ ? '🃏' : c.suit}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                        <span className="text-[8px] font-black text-white/85 mt-0.5 leading-none">
                          {grpLbl}
                        </span>
                      </div>
                    );
                  })}
                  {winnerCelebration.winnerClosingCard && (
                    <div className="flex flex-col items-center p-1 rounded-xl border border-yellow-400/75 bg-amber-950/45">
                      {(() => {
                        const cc = winnerCelebration.winnerClosingCard;
                        const ccIsJ = Boolean(cc.isJoker || cc.rank === 'JOKER');
                        const rClr = ccIsJ
                          ? 'text-red-700'
                          : cc.suit === '♦'
                          ? 'text-blue-600'
                          : cc.suit === '♣'
                          ? 'text-emerald-700'
                          : cc.suit === '♥'
                          ? 'text-red-600'
                          : 'text-slate-950';
                        const sClr =
                          cc.suit === '♥' || cc.suit === '♦' ? 'text-red-600' : 'text-slate-950';
                        return (
                          <div
                            className={`w-7 h-10 rounded-md p-0.5 flex flex-col justify-between shadow border ${
                              ccIsJ
                                ? 'bg-[#fef3c7] border-amber-400'
                                : 'bg-[#fcfbf7] border-slate-300'
                            }`}
                          >
                            <span className={`text-[9px] font-black leading-none ${rClr}`}>
                              {ccIsJ ? 'JOK' : cc.rank}
                            </span>
                            <span className={`text-xs leading-none self-end ${sClr}`}>
                              {ccIsJ ? '🃏' : cc.suit}
                            </span>
                          </div>
                        );
                      })()}
                      <span className="text-[8px] font-black text-yellow-300 mt-0.5 leading-none">
                        {t.winnerGroupClosing}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="p-3 rounded-2xl bg-black/60 border border-yellow-500/30 space-y-1.5 text-xs">
              <div className="flex justify-between text-gray-300">
                <span>{t.potAmountLabel}</span>
                <span className="font-mono">
                  {(activeMultiplayerRoomCode ? activeTableStake : selectedStake) *
                    (activeMultiplayerRoomCode ? Math.max(2, opponents.length + 1) : playerSeatCount)}{' '}
                  {t.currencyUnit}
                </span>
              </div>
              <div className="flex justify-between text-rose-400">
                <span>{t.rakeLabel}</span>
                <span className="font-mono">-{winnerCelebration.rakeAmount.toFixed(1)} {t.currencyUnit}</span>
              </div>
              {winnerCelebration.multiplier >= 3 && (
                <div className="flex justify-between text-yellow-300 font-black">
                  <span>{t.goldenMultLabel}</span>
                  <span>3x (ጎልደን)</span>
                </div>
              )}
              {winnerCelebration.multiplier === 2 && (
                <div className="flex justify-between text-amber-300 font-black">
                  <span>{t.dopeyMultLabel}</span>
                  <span>2x (ዶፔይ / ሞንቴ)</span>
                </div>
              )}
              {!winnerCelebration.isOpponentWin && winnerCelebration.streakCount > 0 && winnerCelebration.streakCount < 3 && (
                <div className="text-[10px] text-sky-300 font-bold pt-0.5">
                  {t.streakProgress(winnerCelebration.streakCount)}
                </div>
              )}
              {winnerCelebration.isOpponentWin && (winnerCelebration.lostPenalty ?? 0) > 0 && (
                <div className="flex justify-between text-rose-400 font-black border-t border-rose-500/20 pt-1.5">
                  <span>{t.penaltyDeductedLabel}</span>
                  <span className="font-mono">-{Number(winnerCelebration.lostPenalty).toFixed(1)} {t.currencyUnit}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black text-emerald-400 border-t border-white/10 pt-2">
                <span>{t.netWonLabel}</span>
                <span className="font-mono text-base text-yellow-300">
                  {winnerCelebration.isOpponentWin
                    ? `0.0 ${t.currencyUnit}`
                    : `+${winnerCelebration.winAmount.toFixed(1)} ${t.currencyUnit}`}
                </span>
              </div>
              <div className="text-[11px] text-amber-200/90 font-bold pt-1">
                {t.nextDealerLabel} <span className="text-yellow-300">{winnerCelebration.winnerName}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  const tableStakeAmt = activeMultiplayerRoomCode ? activeTableStake : selectedStake;
                  if (balance < tableStakeAmt) {
                    raminoAudio.playBuzzer();
                    triggerNotification(t.notifyInsufficientNext);
                    return;
                  }
                  if (activeMultiplayerRoomCode) {
                    const nextIdx = (lastSyncedRoundIndexRef.current >= 0 ? lastSyncedRoundIndexRef.current : 1) + 1;
                    debitedRoundIndexRef.current = nextIdx;
                    adjustWalletBalance(-tableStakeAmt, `Ramino Next Round (${tableStakeAmt} ETB)`);
                    void sendRaminoGameAction('next_round').then((ok) => {
                      if (!ok) {
                        debitedRoundIndexRef.current = lastSyncedRoundIndexRef.current;
                        adjustWalletBalance(tableStakeAmt, `Ramino Next Round Revert`);
                      }
                    });
                    return;
                  }
                  if (isPrivateRoomGame) {
                    const nextRound = privateRoundCountRef.current + 1;
                    privateRoundCountRef.current = nextRound;
                    setPrivateRoundCount(nextRound);
                  }
                  adjustWalletBalance(-tableStakeAmt, `Ramino Next Round (${tableStakeAmt} ETB)`);
                  dealRoundWithDealer(winnerCelebration.winnerName);
                }}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 font-black text-sm shadow-xl hover:brightness-105 transition cursor-pointer"
              >
                {t.nextRoundBtn(
                  winnerCelebration.winnerName,
                  isPrivateRoomGame ? ` • ${t.roundWord} #${privateRoundCount + 1}` : ''
                )}
              </button>

              {isPrivateRoomGame && privateRoundCount >= 5 && (
                <button
                  onClick={() => requestPostDayConsensus('winner')}
                  className="w-full py-2.5 rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs shadow-lg transition cursor-pointer"
                >
                  {t.postDayWinnerBtn}
                </button>
              )}

              <button
                onClick={() => {
                  clearLocalSuspendedGame();
                  if (activeMultiplayerRoomCode) {
                    void leaveMultiplayerTable(false);
                    return;
                  }
                  winStreakRef.current = 0;
                  setWinStreak(0);
                  privateRoundCountRef.current = 1;
                  setPrivateRoundCount(1);
                  setWinnerCelebration(null);
                  setView('lobby');
                }}
                className="w-full py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-gray-200 font-black text-xs transition cursor-pointer"
              >
                {t.backToLobbyResetBtn}
              </button>
            </div>
            </div>
          </div>
        </div>
        )
      )}

      {/* ========================================================
          POST DAY MUTUAL ACCEPTANCE MODAL (All Players Accept)
         ======================================================== */}
      {postDayRequest && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[100001] flex items-center justify-center p-2 sm:p-4 overflow-hidden">
          <div
            style={{ maxHeight: modalMaxHeightPx ? `${modalMaxHeightPx}px` : '88dvh' }}
            className="bg-[#121626] border-2 border-teal-400 rounded-3xl p-4 sm:p-5 max-w-sm w-full flex flex-col overflow-hidden shadow-2xl"
          >
            <div
              style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' }}
              className="flex-1 min-h-0 overflow-y-auto overscroll-contain space-y-3.5 pr-0.5"
            >
            <div className="text-center space-y-1">
              <span className="text-3xl">🪑</span>
              <h3 className="text-base font-black text-teal-300">{t.postDayModalTitle}</h3>
              <p className="text-[11px] text-gray-300">{t.postDayModalDesc(postDayRequest.requestedBy)}</p>
            </div>

            <div className="space-y-1.5 bg-black/50 rounded-2xl p-3 border border-white/10 text-xs">
              {[playerName, ...opponents.map((o) => o.name)].map((pName) => {
                const accepted = postDayRequest.acceptedIds.includes(pName);
                return (
                  <div
                    key={pName}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl border ${
                      accepted
                        ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-200'
                        : 'bg-white/5 border-white/10 text-gray-300'
                    }`}
                  >
                    <span className="font-bold">{pName}</span>
                    <span className="text-[11px] font-black">
                      {accepted ? t.acceptedBadge : t.waitingAcceptBadge}
                    </span>
                  </div>
                );
              })}
            </div>

            {postDayRequest.needsMyAccept ? (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleAcceptIncomingPostDay}
                  className="py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs cursor-pointer"
                >
                  {t.acceptPostDayBtn}
                </button>
                <button
                  onClick={() => setPostDayRequest(null)}
                  className="py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-gray-200 font-black text-xs cursor-pointer"
                >
                  {t.closeBtn}
                </button>
              </div>
            ) : (
              <div className="text-center text-[11px] font-black text-teal-300">
                {postDayRequest.allAccepted ? t.allAcceptedPostDay : t.waitingAllPostDay}
              </div>
            )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          RAMINO SETTINGS MODAL (ቅንብር)
         ======================================================== */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 z-[100002] overflow-hidden">
          <div
            style={{ maxHeight: modalMaxHeightPx ? `${modalMaxHeightPx}px` : '88dvh' }}
            className="bg-[#121626] border-2 border-amber-400/45 rounded-[24px] sm:rounded-[28px] p-4 sm:p-5 max-w-md w-full text-left flex flex-col overflow-hidden shadow-2xl"
          >
            <div className="shrink-0 flex items-center justify-between border-b border-white/10 pb-2.5 mb-2.5">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-black text-amber-300">{t.settingsTitle}</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-gray-200 hover:text-white font-black text-sm flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div
              style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' }}
              className="flex-1 min-h-0 overflow-y-auto overscroll-contain space-y-3 text-xs pr-1"
            >
              {/* Language Switcher */}
              <div className="p-3 rounded-2xl bg-black/45 border border-white/10 space-y-2">
                <div className="flex items-center gap-1.5 font-black text-slate-200">
                  <Globe className="w-4 h-4 text-sky-400" />
                  <span>{t.languageSettingLabel}</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {(
                    [
                      { code: 'am' as Language, label: 'አማርኛ' },
                      { code: 'ti' as Language, label: 'ትግርኛ' },
                      { code: 'om' as Language, label: 'Afaan Oromoo' },
                      { code: 'en' as Language, label: 'English' },
                    ]
                  ).map((langOpt) => (
                    <button
                      key={langOpt.code}
                      type="button"
                      onClick={() => {
                        raminoAudio.playCardSnap();
                        onChangeLanguage?.(langOpt.code);
                      }}
                      className={`py-2 px-2.5 rounded-xl font-black text-xs border transition cursor-pointer ${
                        language === langOpt.code
                          ? 'bg-amber-400 text-slate-950 border-amber-300 shadow'
                          : 'bg-white/5 text-slate-300 border-white/10 hover:border-amber-400/40'
                      }`}
                    >
                      {langOpt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sound Toggle */}
              <div className="p-3 rounded-2xl bg-black/45 border border-white/10 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {soundEnabled ? (
                    <Volume2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <VolumeX className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <span className="font-black text-slate-200">{t.soundFxLabel}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSoundEnabled((prev) => !prev)}
                  className={`px-3 py-1.5 rounded-xl font-black text-[11px] transition cursor-pointer ${
                    soundEnabled
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-rose-500/25 text-rose-300 border border-rose-500/40'
                  }`}
                >
                  {soundEnabled ? t.soundOn : t.soundOff}
                </button>
              </div>

              {/* Table Felt Theme */}
              <div className="p-3 rounded-2xl bg-black/45 border border-white/10 space-y-2">
                <div className="flex items-center gap-1.5 font-black text-slate-200">
                  <Palette className="w-4 h-4 text-emerald-400" />
                  <span>{t.tableColorLabel}</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {(
                    [
                      { id: 'emerald' as TableTheme, label: t.themeEmerald, dot: 'bg-emerald-600' },
                      { id: 'mahogany' as TableTheme, label: t.themeMahogany, dot: 'bg-amber-800' },
                      { id: 'midnight' as TableTheme, label: t.themeMidnight, dot: 'bg-blue-700' },
                    ]
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        raminoAudio.playCardSnap();
                        setTableTheme(opt.id);
                      }}
                      className={`p-2 rounded-xl border flex flex-col items-center gap-1.5 font-black text-[10px] text-center transition cursor-pointer ${
                        tableTheme === opt.id
                          ? 'bg-white/15 border-amber-400 text-amber-300 ring-1 ring-amber-400/60'
                          : 'bg-white/5 border-white/10 text-slate-300 hover:border-white/25'
                      }`}
                    >
                      <span className={`w-5 h-5 rounded-full border border-white/40 ${opt.dot}`} />
                      <span className="leading-tight">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Group Accent Hints Toggle */}
              <div className="p-3 rounded-2xl bg-black/45 border border-white/10 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-black text-slate-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>{t.groupHintsLabel}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">{t.groupHintsDesc}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    raminoAudio.playCardSnap();
                    setShowGroupHints((prev) => !prev);
                  }}
                  className={`px-3 py-1.5 rounded-xl font-black text-[11px] shrink-0 transition cursor-pointer ${
                    showGroupHints
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-white/10 text-slate-300 border border-white/15'
                  }`}
                >
                  {showGroupHints ? t.soundOn : t.soundOff}
                </button>
              </div>

              {/* Auto-Landscape Toggle */}
              <div className="p-3 rounded-2xl bg-black/45 border border-white/10 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-black text-slate-200 flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    <span>{t.landscapeLockLabel}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">{t.landscapeLockDesc}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    raminoAudio.playCardSnap();
                    setForceLandscapeRotate((prev) => !prev);
                  }}
                  className={`px-3 py-1.5 rounded-xl font-black text-[11px] shrink-0 transition cursor-pointer ${
                    forceLandscapeRotate
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-white/10 text-slate-300 border border-white/15'
                  }`}
                >
                  {forceLandscapeRotate ? t.soundOn : t.soundOff}
                </button>
              </div>

              {/* Quick Actions: Wallet Deposit/Withdraw + Open Full Rules + Back to Hub */}
              <div className="grid grid-cols-1 gap-2 pt-1">
                {onOpenWallet && (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        raminoAudio.playCardSnap();
                        setIsSettingsModalOpen(false);
                        onOpenWallet('deposit');
                      }}
                      className="py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1 cursor-pointer transition shadow"
                    >
                      <span>+ {t.depositShort}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        raminoAudio.playCardSnap();
                        setIsSettingsModalOpen(false);
                        onOpenWallet('withdraw');
                      }}
                      className="py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center justify-center gap-1 cursor-pointer transition shadow"
                    >
                      <span>- {t.withdrawShort}</span>
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setIsSettingsModalOpen(false);
                    setIsRulesModalOpen(true);
                  }}
                  className="w-full py-2.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-sky-200 font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer transition"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>{t.openRulesFromSettings}</span>
                </button>

                {onBackToLobby && (
                  <button
                    type="button"
                    onClick={() => {
                      stopVoiceChatSession();
                      setIsSettingsModalOpen(false);
                      onBackToLobby();
                    }}
                    className="w-full py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-200 font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer transition"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>{t.backToHomeHubBtn}</span>
                  </button>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsSettingsModalOpen(false)}
              className="shrink-0 mt-3 w-full py-2.5 rounded-xl bg-amber-500 text-slate-950 font-black text-xs hover:bg-amber-400 transition cursor-pointer"
            >
              {t.understoodCloseBtn}
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          AWESOME PLAYER-FRIENDLY RULES MODAL (VISUAL + CRYSTAL CLEAR)
         ======================================================== */}
      {isRulesModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 z-[100003] overflow-hidden">
          <div
            style={{ maxHeight: modalMaxHeightPx ? `${modalMaxHeightPx}px` : '88dvh' }}
            className="bg-[#121626] border-2 border-yellow-500/45 rounded-[24px] sm:rounded-[28px] p-4 sm:p-5 max-w-xl w-full text-left flex flex-col overflow-hidden shadow-2xl"
          >
            <div className="shrink-0 flex items-center justify-between border-b border-white/10 pb-2.5 mb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🃏</span>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-yellow-300 leading-tight">
                    {t.rulesModalTitle}
                  </h3>
                  <span className="text-[10px] font-bold text-emerald-300">{t.rulesBadgeQuick}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRulesModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-gray-200 hover:text-white font-black text-sm flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div
              style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' }}
              className="flex-1 min-h-0 overflow-y-auto overscroll-contain space-y-3.5 pr-1"
            >

            {/* Visual Card Point Values Quick Reference */}
            <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500/15 via-slate-900/80 to-emerald-500/10 border border-amber-400/35 space-y-2">
              <h4 className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                <span>🎯</span>
                <span>{t.rulesQuickValuesTitle}</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] font-bold text-slate-200">
                <div className="px-2.5 py-1.5 rounded-xl bg-black/45 border border-white/10">{t.rulesValNum}</div>
                <div className="px-2.5 py-1.5 rounded-xl bg-black/45 border border-white/10">{t.rulesValFace}</div>
                <div className="px-2.5 py-1.5 rounded-xl bg-black/45 border border-white/10">{t.rulesValAce}</div>
                <div className="px-2.5 py-1.5 rounded-xl bg-black/45 border border-amber-400/30 text-amber-200">
                  {t.rulesValJoker}
                </div>
              </div>
            </div>

            {/* Visual Mini-Card Examples (Tris vs Catris) */}
            <div className="p-3 rounded-2xl bg-black/45 border border-white/10 space-y-2.5">
              <h4 className="text-xs font-black text-sky-300">{t.rulesExamplesTitle}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="p-2.5 rounded-xl bg-[#07261a] border border-emerald-500/35 space-y-1.5">
                  <div className="text-[10px] font-black text-emerald-300">{t.rulesTrisLabel}</div>
                  <div className="flex items-center gap-1">
                    {[
                      { r: 'K', s: '♠', c: 'text-slate-950' },
                      { r: 'K', s: '♥', c: 'text-red-600' },
                      { r: 'K', s: '♦', c: 'text-red-600' },
                    ].map((mc, idx) => (
                      <div
                        key={idx}
                        className="w-8 h-11 rounded-lg bg-[#fcfbf7] border border-stone-300 flex flex-col items-center justify-center shadow text-xs font-black"
                      >
                        <span className={mc.c}>{mc.r}</span>
                        <span className={`${mc.c} text-[10px]`}>{mc.s}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-[#0b1f38] border border-sky-500/35 space-y-1.5">
                  <div className="text-[10px] font-black text-sky-300">{t.rulesCatrisLabel}</div>
                  <div className="flex items-center gap-1">
                    {[
                      { r: '7', s: '♥', c: 'text-red-600' },
                      { r: '8', s: '♥', c: 'text-red-600' },
                      { r: '9', s: '♥', c: 'text-red-600' },
                      { r: '10', s: '♥', c: 'text-red-600' },
                    ].map((mc, idx) => (
                      <div
                        key={idx}
                        className="w-8 h-11 rounded-lg bg-[#fcfbf7] border border-stone-300 flex flex-col items-center justify-center shadow text-xs font-black"
                      >
                        <span className={mc.c}>{mc.r}</span>
                        <span className={`${mc.c} text-[10px]`}>{mc.s}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Structured Detailed Rules */}
            <div className="text-xs text-gray-300 space-y-2.5 leading-relaxed">
              <div className="p-3 rounded-xl bg-black/40 border border-emerald-500/20">
                <h4 className="font-black text-emerald-400 mb-1">{t.rule1Title}</h4>
                <p>{t.rule1Desc}</p>
              </div>
              <div className="p-3 rounded-xl bg-black/40 border border-amber-500/20">
                <h4 className="font-black text-amber-400 mb-1">{t.rule2Title}</h4>
                <p>{t.rule2Desc}</p>
              </div>
              <div className="p-3 rounded-xl bg-black/40 border border-teal-500/20">
                <h4 className="font-black text-teal-400 mb-1">{t.rule3Title}</h4>
                <p>{t.rule3Desc}</p>
              </div>
              <div className="p-3 rounded-xl bg-black/40 border border-rose-500/20">
                <h4 className="font-black text-rose-400 mb-1">{t.rule4Title}</h4>
                <p>{t.rule4Desc}</p>
              </div>
              <div className="p-3 rounded-xl bg-black/40 border border-purple-500/25">
                <h4 className="font-black text-purple-300 mb-1">{t.rule5Title}</h4>
                <p>{t.rule5Desc}</p>
              </div>
              <div className="p-3 rounded-xl bg-black/40 border border-sky-500/25">
                <h4 className="font-black text-sky-300 mb-1">{t.rule6Title}</h4>
                <p>{t.rule6Desc}</p>
              </div>
              <div className="p-3 rounded-xl bg-black/40 border border-yellow-500/25">
                <h4 className="font-black text-yellow-300 mb-1">{t.rulesWinMultiTitle}</h4>
                <p>{t.rulesWinMultiDesc}</p>
              </div>
            </div>

            {/* Pro Tip Box */}
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-400/30 text-[11px] text-emerald-200 leading-relaxed">
              <span className="font-black text-emerald-300">💡 {t.rulesProTipTitle}: </span>
              <span>{t.rulesProTipBody}</span>
            </div>

            </div>

            <button
              type="button"
              onClick={() => setIsRulesModalOpen(false)}
              className="shrink-0 mt-3 w-full py-2.5 rounded-xl bg-amber-500 text-slate-950 font-black text-xs hover:bg-amber-400 transition cursor-pointer"
            >
              {t.understoodCloseBtn}
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          TIKTOK / TELEGRAM-STYLE PRIVATE E2EE VOICE STAGE SHEET
         ======================================================== */}
      {isVoiceStageOpen && isPrivateRoomGame && activePrivateRoomCode && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 z-[100004] overflow-hidden">
          <div
            style={{ maxHeight: modalMaxHeightPx ? `${modalMaxHeightPx}px` : '88dvh' }}
            className="w-full sm:max-w-md rounded-t-[28px] sm:rounded-[28px] bg-gradient-to-b from-[#0d172a] via-[#0b1222] to-[#060912] border-t-2 sm:border-2 border-emerald-400/45 shadow-2xl flex flex-col overflow-hidden text-slate-50"
          >
            {/* Stage Header */}
            <div className="shrink-0 px-4 pt-3.5 pb-3 border-b border-white/10 flex items-center justify-between gap-2 bg-black/35">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <h3 className="text-sm font-black text-white truncate">{t.voiceStageTitle}</h3>
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 text-[10px] font-black">
                    {t.voiceE2eeBadge}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1 text-[10px] font-bold text-slate-400">
                  <span className="font-mono text-teal-300">#{activePrivateRoomCode}</span>
                  <span>•</span>
                  <span className="text-sky-300">{t.voiceHdBadge}</span>
                  <span>•</span>
                  <span>👥 {voiceConnectedCount}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsVoiceStageOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-gray-200 flex items-center justify-center font-black text-sm cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Untappable E2EE Guarantee Banner */}
            <div className="px-4 pt-2.5 shrink-0">
              <div className="px-3 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-400/25 text-[10px] text-emerald-200/95 font-semibold leading-snug flex items-start gap-2">
                <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>{t.voiceUntappableNote}</span>
              </div>
            </div>

            {/* Stage Participant Grid (TikTok Live / Telegram Avatar Rings) */}
            <div
              style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' }}
              className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 space-y-3"
            >
              <div className="text-[11px] font-black text-slate-300">
                {t.voiceParticipantsLabel} ({1 + voicePeersList.length})
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {/* Local Player Tile */}
                <div
                  className={`relative p-3 rounded-2xl border flex flex-col items-center text-center gap-2 transition-all ${
                    !isMicMuted && isLocalSpeaking
                      ? 'bg-emerald-500/15 border-emerald-400 ring-2 ring-emerald-400/40 shadow-lg shadow-emerald-500/15'
                      : 'bg-white/5 border-white/10'
                  }`}
                >
                  <div className="relative">
                    {!isMicMuted && isLocalSpeaking && (
                      <span className="absolute -inset-1.5 rounded-full border-2 border-emerald-400/75 animate-ping" />
                    )}
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-black text-slate-950 shadow-lg ${
                        !isMicMuted ? 'bg-gradient-to-br from-emerald-300 to-teal-400' : 'bg-amber-400'
                      }`}
                    >
                      {playerName[0]?.toUpperCase() || 'Y'}
                    </div>
                    <span
                      className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center border border-slate-950 ${
                        !isMicMuted ? 'bg-emerald-400 text-slate-950' : 'bg-rose-500 text-white'
                      }`}
                    >
                      {!isMicMuted ? <Mic className="w-2.5 h-2.5" /> : <MicOff className="w-2.5 h-2.5" />}
                    </span>
                  </div>
                  <div className="min-w-0 w-full">
                    <div className="text-xs font-black text-white truncate">
                      {playerName} ({t.yoursTag})
                    </div>
                    <div
                      className={`text-[10px] font-bold mt-0.5 ${
                        !isMicMuted && isLocalSpeaking
                          ? 'text-emerald-300'
                          : !isMicMuted
                          ? 'text-teal-300'
                          : 'text-slate-400'
                      }`}
                    >
                      {!isMicMuted && isLocalSpeaking
                        ? t.voiceSpeakingNow
                        : !isMicMuted
                        ? t.voiceMicLive
                        : t.voiceListening}
                    </div>
                  </div>
                </div>

                {/* Connected Remote Peers */}
                {voicePeersList.map((peer) => {
                  const isLocallyMuted = Boolean(mutedPeerIds[peer.peerId]);
                  const activeVoice = !peer.isMuted && peer.isSpeaking && !isLocallyMuted && !isDeafened;
                  return (
                    <div
                      key={peer.peerId}
                      className={`relative p-3 rounded-2xl border flex flex-col items-center text-center gap-2 transition-all ${
                        activeVoice
                          ? 'bg-sky-500/15 border-sky-400 ring-2 ring-sky-400/40 shadow-lg shadow-sky-500/15'
                          : 'bg-white/5 border-white/10'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleMuteRemotePeer(peer.peerId)}
                        className={`absolute top-2 right-2 p-1 rounded-lg text-[10px] transition cursor-pointer ${
                          isLocallyMuted
                            ? 'bg-rose-500/25 text-rose-300 border border-rose-400/40'
                            : 'bg-white/10 text-slate-300 hover:bg-white/20'
                        }`}
                        title={isLocallyMuted ? t.voiceUnmutePeer : t.voiceMutePeer}
                      >
                        {isLocallyMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                      </button>

                      <div className="relative">
                        {activeVoice && (
                          <span className="absolute -inset-1.5 rounded-full border-2 border-sky-400/75 animate-ping" />
                        )}
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-sky-300 to-indigo-400 flex items-center justify-center text-lg font-black text-slate-950 shadow-lg">
                          {peer.playerName[0]?.toUpperCase() || 'F'}
                        </div>
                        <span
                          className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center border border-slate-950 ${
                            !peer.isMuted ? 'bg-emerald-400 text-slate-950' : 'bg-slate-700 text-rose-300'
                          }`}
                        >
                          {!peer.isMuted ? <Mic className="w-2.5 h-2.5" /> : <MicOff className="w-2.5 h-2.5" />}
                        </span>
                      </div>

                      <div className="min-w-0 w-full">
                        <div className="text-xs font-black text-white truncate">{peer.playerName}</div>
                        <div
                          className={`text-[10px] font-bold mt-0.5 ${
                            isLocallyMuted
                              ? 'text-rose-300'
                              : activeVoice
                              ? 'text-sky-300'
                              : 'text-slate-400'
                          }`}
                        >
                          {isLocallyMuted
                            ? t.voiceMutePeer
                            : activeVoice
                            ? t.voiceSpeakingNow
                            : t.voiceListening}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Telegram / TikTok Dock Controls */}
            <div className="shrink-0 px-4 py-3.5 bg-black/55 border-t border-white/10 flex items-center justify-between gap-2.5">
              <button
                type="button"
                onClick={handleTogglePrivateMic}
                className={`px-3.5 py-2.5 rounded-2xl font-black text-xs flex items-center gap-1.5 transition cursor-pointer ${
                  !isMicMuted && !isPushToTalkActive
                    ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/25'
                    : 'bg-white/10 hover:bg-white/15 text-slate-200 border border-white/15'
                }`}
              >
                {!isMicMuted ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4 text-rose-400" />}
                <span>{!isMicMuted ? t.micOpen : t.voiceTapToSpeak}</span>
              </button>

              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  void handleStartPushToTalk();
                }}
                onPointerUp={handleEndPushToTalk}
                onPointerLeave={handleEndPushToTalk}
                onPointerCancel={handleEndPushToTalk}
                className={`flex-1 py-3 px-4 rounded-2xl font-black text-xs flex items-center justify-center gap-2 select-none touch-none transition cursor-pointer shadow-xl ${
                  isPushToTalkActive
                    ? 'bg-gradient-to-r from-sky-400 via-cyan-300 to-emerald-400 text-slate-950 scale-[0.98] ring-4 ring-sky-400/40'
                    : 'bg-gradient-to-r from-sky-500 to-indigo-500 hover:brightness-110 text-white'
                }`}
              >
                <Mic className={`w-4 h-4 ${isPushToTalkActive ? 'animate-pulse' : ''}`} />
                <span>{isPushToTalkActive ? t.voiceReleaseToMute : t.voiceHoldToTalk}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  raminoAudio.playCardSnap();
                  setIsDeafened((prev) => !prev);
                }}
                className={`p-2.5 rounded-2xl border transition cursor-pointer ${
                  isDeafened
                    ? 'bg-rose-500/25 border-rose-400/50 text-rose-300'
                    : 'bg-white/10 hover:bg-white/15 border-white/15 text-slate-200'
                }`}
                title={isDeafened ? t.deafenOpenTip : t.deafenMuteTip}
              >
                <Headphones className="w-4 h-4" />
              </button>
            </div>
            {isVoiceAudioLocked && !isDeafened && (
              <div className="shrink-0 px-4 py-2 bg-amber-500/20 border-t border-amber-400/40 flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-amber-200">
                  {language === 'en' ? 'Browser paused audio — tap to hear friends' : 'ድምፅ ለመስማት ይንኩ'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    unlockRemoteAudioElements();
                    raminoAudio.playCardSnap();
                  }}
                  className="px-3 py-1 rounded-xl bg-amber-400 text-slate-950 font-black text-[11px] cursor-pointer"
                >
                  🔊 {language === 'en' ? 'Enable Audio' : 'ድምፅ ክፈት'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ModernRaminoGame;
