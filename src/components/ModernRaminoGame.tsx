import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Users,
  Sparkles,
  RotateCcw,
  HelpCircle,
  ArrowLeft,
  Lock,
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
import { buildApiUrl } from '../utils/realtimeRoomClient';

interface RaminoPrivateRoomSnapshot {
  code: string;
  hostName: string;
  maxPlayers: 2 | 3 | 4 | 5;
  stake: number;
  players: { name: string; isHost: boolean; joinedAt: number }[];
  status: 'waiting' | 'started';
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
  // Fisher-Yates shuffle
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
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
                addCandidate('run', allIdx.map((i) => cards[i]), allIdx);
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
  type: 'set' | 'run';
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

  let i = 0;
  let gIdx = 0;
  while (i < hand.length) {
    let matchedLen = 0;
    let matchedType: 'set' | 'run' = 'set';

    // Try longest window first (5 down to 3)
    for (let len = Math.min(6, hand.length - i); len >= 3; len--) {
      const slice = hand.slice(i, i + len);
      if (len <= 4 && isValidSet(slice)) {
        matchedLen = len;
        matchedType = 'set';
        break;
      }
      if (isValidRun(slice)) {
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
      slice.forEach((c) => cardToGroupMap.set(c.id, info));
      firstCardOfGroupMap.set(slice[0].id, { info, span: matchedLen });
      gIdx++;
      i += matchedLen;
    } else {
      i++;
    }
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

// Check exact 13-card Dopey: 5 pairs (10 cards: identical rank+suit or with Joker) + 1 valid Tris (3-card Run OR 3-card Set, with/without Joker)
function isExact13CardDopey(cards13: PlayingCard[], allowSameRankPairs = false): boolean {
  if (cards13.length !== 13) return false;

  for (let i = 0; i < 11; i++) {
    for (let j = i + 1; j < 12; j++) {
      for (let k = j + 1; k < 13; k++) {
        const triple = [cards13[i], cards13[j], cards13[k]];
        if (!isValidSet(triple) && !isValidRun(triple)) continue;

        const rem10: PlayingCard[] = [];
        for (let m = 0; m < 13; m++) {
          if (m !== i && m !== j && m !== k) rem10.push(cards13[m]);
        }
        if (canFormFivePairs(rem10, allowSameRankPairs)) {
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
  const nonJokers = cards.filter((c) => !c.isJoker);
  const hasTwo = nonJokers.some((c) => c.rank === '2');
  const hasKingOrQueen = nonJokers.some((c) => c.rank === 'K' || c.rank === 'Q');
  if (hasTwo && !hasKingOrQueen) {
    return ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  }
  return ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
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
  const firstNatPos = meld.cards.findIndex((c) => !c.isJoker);
  if (firstNatPos === -1) return null;
  const firstNatOrderIdx = order.indexOf(meld.cards[firstNatPos].rank);
  if (firstNatOrderIdx === -1) return null;
  const startOrderIdx = firstNatOrderIdx - firstNatPos;
  const targetRank = order[startOrderIdx + cardIdx];
  const suit = meld.suit || meld.cards[firstNatPos].suit;
  return targetRank ? { rank: targetRank, suit } : null;
}

function insertCardIntoRunMeld(
  cards: PlayingCard[],
  newCard: PlayingCard,
  clickedIdx: number
): PlayingCard[] | null {
  if (cards.length >= 13) return null;

  if (newCard.isJoker) {
    const order = getRunOrderForMeld(cards);
    const firstNatPos = cards.findIndex((c) => !c.isJoker);
    if (firstNatPos === -1) return [...cards, newCard];
    const firstNatOrderIdx = order.indexOf(cards[firstNatPos].rank);
    if (firstNatOrderIdx === -1) return [...cards, newCard];
    const startOrderIdx = firstNatOrderIdx - firstNatPos;
    const endOrderIdx = startOrderIdx + cards.length - 1;
    const canPrepend = startOrderIdx > 0;
    const canAppend = endOrderIdx < order.length - 1;
    if (!canPrepend && !canAppend) return null;
    if (clickedIdx === 0 && canPrepend) return [newCard, ...cards];
    if (canAppend) return [...cards, newCard];
    return [newCard, ...cards];
  }

  const candidate = [...cards, newCard];
  if (!isValidRun(candidate)) return null;

  const order = getRunOrderForMeld(candidate);
  const nonJokers = candidate
    .filter((c) => !c.isJoker)
    .sort((a, b) => order.indexOf(a.rank) - order.indexOf(b.rank));
  const jokers = candidate.filter((c) => c.isJoker);

  if (nonJokers.length === 0) return candidate;

  // Build sorted sequence filling interior gaps with Jokers first
  const arranged: PlayingCard[] = [nonJokers[0]];
  let jokerCursor = 0;
  for (let i = 1; i < nonJokers.length; i++) {
    const prevIdx = order.indexOf(nonJokers[i - 1].rank);
    const currIdx = order.indexOf(nonJokers[i].rank);
    const gapCount = currIdx - prevIdx - 1;
    for (let g = 0; g < gapCount && jokerCursor < jokers.length; g++) {
      arranged.push(jokers[jokerCursor++]);
    }
    arranged.push(nonJokers[i]);
  }

  // Place any leftover Jokers cleanly on the right end (or left end if already at top rank)
  let highIdx = order.indexOf(nonJokers[nonJokers.length - 1].rank);
  let lowIdx = order.indexOf(nonJokers[0].rank);
  while (jokerCursor < jokers.length) {
    if (clickedIdx === 0 && lowIdx > 0) {
      arranged.unshift(jokers[jokerCursor++]);
      lowIdx--;
    } else if (highIdx < order.length - 1) {
      arranged.push(jokers[jokerCursor++]);
      highIdx++;
    } else if (lowIdx > 0) {
      arranged.unshift(jokers[jokerCursor++]);
      lowIdx--;
    } else {
      break;
    }
  }

  return arranged;
}

const RAMINO_T: Record<Language, any> = {
  am: {
    brandTitle: 'ኮንከር ራሚኖ',
    brandSub: 'መቀለ ራሚኖ ሎቢ',
    exitBtn: 'መውጫ',
    backBtn: 'መመለሻ',
    rulesTooltip: 'ህግጋት',
    playersCardLabel: 'ተጫዋቾች',
    liveStreamSub: 'ቀጥታ ስርጭት',
    openRoomsCardLabel: 'ክፍት ክፍሎች',
    activeRoomsSub: 'ንቁ ክፍሎች',
    balanceCardLabel: 'ቀሪ ሂሳብ',
    walletSub: 'ዋሌት',
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
    dopeyBtn: '👑 ዶፔይ • 2x',
    dopeyJokerBtn: '👑 ዶፔይ በጆከር • 3x',
    meldBtn: (pts: number) => `ውረድ • ${pts}`,
    sortBtn: 'ደርድር',
    returnBtn: 'መልስ',
    discardLockedBtn: 'ጣል (ውረድ ወይም መልስ)',
    discardBtn: 'ጣል',
    bannedTitle: 'ከጨዋታው ታግደዋል!',
    bannedDesc: 'በተሰጠው 90 ሰከንድ የማሰቢያ ጊዜ እና 30 ሰከንድ ማስጠንቀቂያ ውስጥ ካርታ ባለመሳብዎ ወይም ባለማንሳትዎ ከጨዋታው ተሰርዘዋል።',
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
    rakeLabel: 'የኮንከር 10% ኮሚሽን:',
    dopeyMultLabel: 'ዶፔይ ብዜት:',
    streakMultLabel: (n: number) => `🔥 ተከታታይ ድል (${n}ኛ):`,
    streakTimes: (m: number) => `${m}x እጥፍ`,
    streakProgress: (n: number) => `🔥 ተከታታይ ድል: ${n}/3 (በ3ኛው ድል እጥፍ ይከፈላል!)`,
    netWonLabel: 'የተጣራ ገቢ:',
    nextDealerLabel: '👑 ቀጣይ ካርታ የሚያከፋፍለው:',
    nextRoundBtn: (dealer: string, extra: string) => `🔄 ቀጣይ ዙር ጀምር (${dealer} ያከፋፍላል${extra})`,
    postDayWinnerBtn: '🪑 ፖስት ዴይ (ሁሉም ተቀብለው አዲስ ወንበር ይሰጣል)',
    backToLobbyResetBtn: 'ወደ ሎቢ ተመለስ',
    postDayModalTitle: 'ፖስት ዴይ — የወንበር መቀየሪያ ጥያቄ',
    postDayModalDesc: (name: string) => `${name} ሁሉም ተጫዋቾች አዲስ ወንበር እንዲያገኙ ፖስት ዴይ ጠይቋል`,
    acceptedBadge: '✓ ተቀብሏል',
    waitingAcceptBadge: '⏳ በመጠበቅ ላይ...',
    acceptPostDayBtn: '✓ ጥያቄውን ተቀበል',
    closeBtn: 'ዝጋ',
    allAcceptedPostDay: '✅ ሁሉም ተጫዋቾች ተቀብለዋል! አዲስ ወንበር በመሰጠት ላይ...',
    waitingAllPostDay: '⏳ የሁሉም ተጫዋቾች መቀበል በመጠበቅ ላይ...',
    rulesModalTitle: 'የመቀለ ራሚኖ ህግጋት',
    understoodCloseBtn: 'ተረድቻለሁ',
    rule1Title: '1. ሰዓት (90 ሰከንድ + 30 ሰከንድ ማስጠንቀቂያ)',
    rule1Desc: 'ተቃራኒ ተጫዋች ካርታ ሲጥልልዎ 90 ሰከንድ የማሰቢያ ጊዜ ይጀምራል፤ ካለቀ በቀይ 30 ሰከንድ ማስጠንቀቂያ ይሰጣል። ካርታ ካልሳቡ ከጨዋታ ይታገዳሉ።',
    rule2Title: '2. መውረድ (41 ነጥብ) እና ከተጣለ ካርታ ማንሳት',
    rule2Desc: 'ለመውረድ ቢያንስ 41 ነጥብ በትክክለኛ ትሪስ ወይም ካትሪስ መሰራት አለበት። ለመጀመሪያ ሳትወርድ ከተጣለ ካርታ ከወሰድክ «ውረድ ወይም መልስ» ግዴታ ነው (ሳትወርድ ገቢ አይቻልም)፤ ከወረድክ በኋላ ግን እንደፈለግክ መጫወት ትችላለህ።',
    rule3Title: '3. የታችኛው ካርድ እና ዶፔይ ማሸነፊያ',
    rule3Desc: 'ያልወረደ ተጫዋች ሁሉንም ካርዶቹን በቡድን ከሰበሰበ እና ለመጨረስ የታችኛው ካርድ ብቻ የሚያስፈልገው ከሆነ በወርቃማ ብርሃን ይበራል፤ በመንካት በቅጽበት ያሸንፋል። 5 ጥንዶች + 1 ትሪስ (ዶፔይ) 2x ሲሆን በጆከር ከተዘጋ 3x እጥፍ ይሰጣል።',
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
    notifyDealerStarted: (dealer: string) => `👑 ${dealer} (አሸናፊ) ካርታ አከፋፍሏል! ጨዋታው ተጀምሯል።`,
    notifyDealtSelf: 'ካርታ ተከፋፍሏል! ከመደቡ ወይም ከተጣለው ካርታ ይሳቡ።',
    notifyDealerOpp: (dealer: string) => `👑 ${dealer} (አሸናፊ) ካርታ አከፋፍሏል!`,
    notifyYourTurnStart: (dealer: string) => `👑 ${dealer} ካርታ አከፋፍሏል! የእርስዎ ተራ ነው።`,
    notifyWarning30s: '⚠️ 30 ሰከንድ ማስጠንቀቂያ! ካርታ ካልሳቡ ከጨዋታ ይታገዳሉ!',
    notifyBottomNotReady: 'የታችኛው ካርድ ማሸነፊያ ገና አልተሟላም! ተራዎ ሲደርስ ሁሉንም ካርታዎች በቡድን መያዝ አለብዎት።',
    winBottomJokerDopey: (s: string) => `👑 ዶፔይ በታችኛው ጆከር (${s}) አሸናፊ! (3x)`,
    winBottomDopey: (c: string) => `🔥 ዶፔይ በታችኛው ካርድ (${c}) አሸናፊ! (2x)`,
    winBottomNormal: (c: string) => `🏆 በታችኛው ካርድ (${c}) አሸናፊ!`,
    notifyReshuffled: '🔄 መደቡ ስላለቀ የተጣሉት ካርዶች ተቀላቅለው አዲስ መደብ ሆነዋል!',
    notifyPostDayApplied: '🪑 ሁሉም ተጫዋቾች የፖስት ዴይ ጥያቄውን ተቀብለዋል! አዲስ ወንበር ተሰጥቷል።',
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
    winTitleDopeyJoker: '👑 ዶፔይ በጆከር አሸናፊ! (3x)',
    winTitleDopey: '🔥 ዶፔይ አሸናፊ! (2x)',
    winTitleStreak: (n: number) => `🔥 ${n}ኛ ተከታታይ ድል! (2x)`,
    winTitleNormal: '🎉 እንኳን ደስ አለዎት! አሸንፈዋል!',
    loseTitle: (w: string) => `😔 ${w} ይህን ዙር አሸንፏል!`,
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
    inviteTextHeader: '🎮 የመቀለ ራሚኖ የግል ክፍል ግብዣ!',
  },
  ti: {
    brandTitle: 'ኮንከር ራሚኖ',
    brandSub: 'መቐለ ራሚኖ ሎቢ',
    exitBtn: 'መውጽኢ',
    backBtn: 'ተመለስ',
    rulesTooltip: 'ሕግታት',
    playersCardLabel: 'ተጻወትቲ',
    liveStreamSub: 'ቀጥታ ስርጭት',
    openRoomsCardLabel: 'ክፉታት ክፍልታት',
    activeRoomsSub: 'ንጡፋት ክፍልታት',
    balanceCardLabel: 'ቀሪ ሕሳብ',
    walletSub: 'ዋሌት',
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
    dopeyBtn: '👑 ዶፔይ • 2x',
    dopeyJokerBtn: '👑 ዶፔይ ብጆከር • 3x',
    meldBtn: (pts: number) => `ውረድ • ${pts}`,
    sortBtn: 'ደርድር',
    returnBtn: 'ምለስ',
    discardLockedBtn: 'ደርቢ (ውረድ ወይ ምለስ)',
    discardBtn: 'ደርቢ',
    bannedTitle: 'ካብ ጸወታ ተኣጊድኩም!',
    bannedDesc: 'ኣብ ዝተዋህበ 90 ሰከንድ መሕሰቢን 30 ሰከንድ መጠንቀቕታን ካርታ ብዘይምስሓብኩም ካብ ጸወታ ወጺእኩም።',
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
    rakeLabel: 'ናይ ኮንከር 10% ኮሚሽን:',
    dopeyMultLabel: 'ዶፔይ ብዜት:',
    streakMultLabel: (n: number) => `🔥 ተኸታታሊ ዓወት (${n}ይ):`,
    streakTimes: (m: number) => `${m}x ዕጽፊ`,
    streakProgress: (n: number) => `🔥 ተኸታታሊ ዓወት: ${n}/3 (ኣብ 3ይ ዓወት ዕጽፊ ይኽፈል!)`,
    netWonLabel: 'ዝተጻረየ እቶት:',
    nextDealerLabel: '👑 ቀጻሊ ካርታ ዘከፋፍል:',
    nextRoundBtn: (dealer: string, extra: string) => `🔄 ቀጻሊ ዙር ጀምር (${dealer} የከፋፍል${extra})`,
    postDayWinnerBtn: '🪑 ፖስት ዴይ (ኩሎም ምስ ተቐበሉ ሓድሽ ወንበር)',
    backToLobbyResetBtn: 'ናብ ሎቢ ተመለስ',
    postDayModalTitle: 'ፖስት ዴይ — ሕቶ መቐየሪ ወንበር',
    postDayModalDesc: (name: string) => `${name} ኩሎም ተጻወትቲ ሓድሽ ወንበር ክረኽቡ ፖስት ዴይ ሓቲቱ`,
    acceptedBadge: '✓ ተቐቢሉ',
    waitingAcceptBadge: '⏳ ይጽበ ኣሎ...',
    acceptPostDayBtn: '✓ ሕቶ ተቐበል',
    closeBtn: 'ዕጾ',
    allAcceptedPostDay: '✅ ኩሎም ተጻወትቲ ተቐቢሎም! ሓድሽ ወንበር ይወሃብ ኣሎ...',
    waitingAllPostDay: '⏳ ምቕባል ኩሎም ተጻወትቲ ይጽበ ኣሎ...',
    rulesModalTitle: 'ሕግታት መቐለ ራሚኖ',
    understoodCloseBtn: 'ተረዲአዮ',
    rule1Title: '1. ሰዓት (90 ሰከንድ + 30 ሰከንድ መጠንቀቕታ)',
    rule1Desc: 'ተጻራሪ ተጻዋታይ ካርታ ምስ ደርበየልኩም 90 ሰከንድ መሕሰቢ ይጅምር፤ ምስ ተወድአ ብቐይሕ 30 ሰከንድ መጠንቀቕታ ይወሃብ። ካርታ እንተዘይስሒብኩም ትእገዱ።',
    rule2Title: '2. ምውራድ (41 ነጥቢ)ን ካብ ዝተደርበየ ምልዓልን',
    rule2Desc: 'ንምውራድ ብውሑዱ 41 ነጥቢ ብትሪስ ወይ ካትሪስ ክስራሕ ኣለዎ። ንመጀመርያ ከይወረድኩም ካብ ዝተደርበየ ካርታ እንተልዒልኩም ግድን ክትወርዱ ወይ ክትመልሱ ኣለኩም።',
    rule3Title: '3. ናይ ታሕቲ ካርታን ዶፔይን ዓወት',
    rule3Desc: 'ዘይወረደ ተጻዋታይ ካርታታቱ ብጉጅለ ኣኪቡ ናይ ታሕቲ ካርታ ጥራይ ዝተርፎ እንተኾይኑ ብወርቃዊ ብርሃን ይበርህ። 5 ጽምድታት + 1 ትሪስ 2x ብጆከር እንተተዓጽዩ 3x ዕጽፊ ይህብ።',
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
    notifyDealerStarted: (dealer: string) => `👑 ${dealer} ካርታ ኣከፋፊሉ! ጸወታ ተጀሚሩ።`,
    notifyDealtSelf: 'ካርታ ተኸፋፊሉ! ካብ መደብ ወይ ዝተደርበየ ስሓቡ።',
    notifyDealerOpp: (dealer: string) => `👑 ${dealer} ካርታ ኣከፋፊሉ!`,
    notifyYourTurnStart: (dealer: string) => `👑 ${dealer} ካርታ ኣከፋፊሉ! ተራኹም እዩ።`,
    notifyWarning30s: '⚠️ 30 ሰከንድ መጠንቀቕታ! ካርታ እንተዘይስሒብኩም ክትእገዱ ኢኹም!',
    notifyBottomNotReady: 'ናይ ታሕቲ ካርታ መሸነፊ ገና ኣይተማልአን።',
    winBottomJokerDopey: (s: string) => `👑 ዶፔይ ብናይ ታሕቲ ጆከር (${s}) ተዓዋቲ! (3x)`,
    winBottomDopey: (c: string) => `🔥 ዶፔይ ብናይ ታሕቲ ካርታ (${c}) ተዓዋቲ! (2x)`,
    winBottomNormal: (c: string) => `🏆 ብናይ ታሕቲ ካርታ (${c}) ተዓዋቲ!`,
    notifyReshuffled: '🔄 መደብ ስለዝተወድአ ዝተደርበዩ ካርታታት ተሓዋዊሶም!',
    notifyPostDayApplied: '🪑 ኩሎም ተጻወትቲ ፖስት ዴይ ተቐቢሎም! ሓድሽ ወንበር ተዋሂቡ።',
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
    winTitleDopeyJoker: '👑 ዶፔይ ብጆከር ተዓዋቲ! (3x)',
    winTitleDopey: '🔥 ዶፔይ ተዓዋቲ! (2x)',
    winTitleStreak: (n: number) => `🔥 ${n}ይ ተኸታታሊ ዓወት! (2x)`,
    winTitleNormal: '🎉 እንቋዕ ሓጎሰኩም! ተዓዊትኩም!',
    loseTitle: (w: string) => `😔 ${w} ነዚ ዙር ተዓዊቱ!`,
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
    inviteTextHeader: '🎮 ብሕታዊ ክፍሊ መቐለ ራሚኖ ዕድመ!',
  },
  om: {
    brandTitle: 'Konkar Raaminoo',
    brandSub: 'Galma Raaminoo',
    exitBtn: 'Bahi',
    backBtn: 'Deebi\'i',
    rulesTooltip: 'Seera',
    playersCardLabel: 'Taphattoota',
    liveStreamSub: 'Kallattiin',
    openRoomsCardLabel: 'Kutaalee Banaa',
    activeRoomsSub: 'Kutaalee Qophii',
    balanceCardLabel: 'Haftee Qarshii',
    walletSub: 'Waaletii',
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
    dopeyMultLabel: 'Baay\'ata Dooppey:',
    streakMultLabel: (n: number) => `🔥 Injifannoo walitti aansee (${n}ffaa):`,
    streakTimes: (m: number) => `Dachaa ${m}x`,
    streakProgress: (n: number) => `🔥 Walitti aansee: ${n}/3 (3ffaa irratti dachaa kaffala!)`,
    netWonLabel: 'Galii Qulqulluu:',
    nextDealerLabel: '👑 Kan itti aansee raabsu:',
    nextRoundBtn: (dealer: string, extra: string) => `🔄 Marsaa itti aanu jalqabi (${dealer} ni raabsa${extra})`,
    postDayWinnerBtn: '🪑 Poost Deey (Hundi yoo fudhatan teessoo haaraa)',
    backToLobbyResetBtn: 'Gara Galmaatti Deebi\'i',
    postDayModalTitle: 'Poost Deey — Gaaffii Jijjiirraa Teessoo',
    postDayModalDesc: (name: string) => `${name} hundi teessoo haaraa akka argatan Poost Deey gaafateera`,
    acceptedBadge: '✓ Fudhatameera',
    waitingAcceptBadge: '⏳ Eegaa jira...',
    acceptPostDayBtn: '✓ Gaaffii Fudhadhu',
    closeBtn: 'Cufi',
    allAcceptedPostDay: '✅ Hundi fudhataniiru! Teessoon haaraan kennamaa jira...',
    waitingAllPostDay: '⏳ Hundi akka fudhatan eegaa jira...',
    rulesModalTitle: 'Seera Raaminoo',
    understoodCloseBtn: 'Hubadheera',
    rule1Title: '1. Sa\'aatii (Sekondii 90 + Sekondii 30 of eeggannoo)',
    rule1Desc: 'Taphataan kaardii yoo gatu sekondii 90 keessatti harkisuu qabda; yoo darbe sekondii 30 of eeggannoo booda ni dhorkamta.',
    rule2Title: '2. Bu\'uu (Qabxii 41) fi Kaardii gatame kaasuun',
    rule2Desc: 'Bu\'uuf yoo xiqqaate qabxii 41 garee sirriidhaan qabaachuu qabda. Osoo hin bu\'iin kaardii gatame yoo kaaste bu\'uu ykn deebisuu qabda.',
    rule3Title: '3. Kaardii Jalaa fi Dooppey',
    rule3Desc: 'Kaardiiwwan hunda gareedhaan qabattee kaardii jalaa qofa yoo si hafe ifa warqee ibsa. Cimdii 5 + 1 tiriis 2x yoo jookeraan cufame 3x kenna.',
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
    notifyDealerStarted: (dealer: string) => `👑 ${dealer} raabseera! Taphni jalqabameera.`,
    notifyDealtSelf: 'Kaardiin raabsameera! Tuutaa ykn gatame irraa harkisi.',
    notifyDealerOpp: (dealer: string) => `👑 ${dealer} raabseera!`,
    notifyYourTurnStart: (dealer: string) => `👑 ${dealer} raabseera! Dabaan kan keeti.`,
    notifyWarning30s: '⚠️ Of eeggannoo sekondii 30! Kaardii yoo hin harkisne ni dhorkamta!',
    notifyBottomNotReady: 'Kaardiin jalaa ammallee qophii miti.',
    winBottomJokerDopey: (s: string) => `👑 Dooppey jookera jalaa (${s}) dhaan injifate! (3x)`,
    winBottomDopey: (c: string) => `🔥 Dooppey kaardii jalaa (${c}) dhaan injifate! (2x)`,
    winBottomNormal: (c: string) => `🏆 Kaardii jalaa (${c}) dhaan injifate!`,
    notifyReshuffled: '🔄 Tuutaan waan dhumeef kaardiiwwan walitti makamaniiru!',
    notifyPostDayApplied: '🪑 Hundi Poost Deey fudhataniiru! Teessoon haaraan kennameera.',
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
    winTitleDopeyJoker: '👑 Dooppey Jookeraan Injifate! (3x)',
    winTitleDopey: '🔥 Dooppey Injifate! (2x)',
    winTitleStreak: (n: number) => `🔥 Injifannoo Walitti Aanu ${n}ffaa! (2x)`,
    winTitleNormal: '🎉 Baga Gammaddan! Injifattaniittu!',
    loseTitle: (w: string) => `😔 ${w} marsaa kana injifateera!`,
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
    inviteTextHeader: '🎮 Afeerraa Kutaa Dhuunfaa Konkar Raaminoo!',
  },
  en: {
    brandTitle: 'Conker Ramino',
    brandSub: 'Mekelle Ramino Lobby',
    exitBtn: 'Exit',
    backBtn: 'Back',
    rulesTooltip: 'Rules',
    playersCardLabel: 'Players',
    liveStreamSub: 'Live Online',
    openRoomsCardLabel: 'Open Rooms',
    activeRoomsSub: 'Active Tables',
    balanceCardLabel: 'Balance',
    walletSub: 'Wallet',
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
    dopeyBtn: '👑 Dopey • 2x',
    dopeyJokerBtn: '👑 Joker Dopey • 3x',
    meldBtn: (pts: number) => `Meld • ${pts}`,
    sortBtn: 'Sort',
    returnBtn: 'Return',
    discardLockedBtn: 'Discard (Meld/Return)',
    discardBtn: 'Discard',
    bannedTitle: 'Removed From Table!',
    bannedDesc: 'You did not draw within the 90s turn timer and 30s warning, so you have been removed from the table.',
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
    dopeyMultLabel: 'Dopey Multiplier:',
    streakMultLabel: (n: number) => `🔥 Win Streak (${n}):`,
    streakTimes: (m: number) => `${m}x Multiplier`,
    streakProgress: (n: number) => `🔥 Win Streak: ${n}/3 (3rd consecutive win pays 2x!)`,
    netWonLabel: 'Net Winnings:',
    nextDealerLabel: '👑 Next Round Dealer:',
    nextRoundBtn: (dealer: string, extra: string) => `🔄 Start Next Round (${dealer} deals${extra})`,
    postDayWinnerBtn: '🪑 Post Day (All Accept New Seats)',
    backToLobbyResetBtn: 'Back to Lobby',
    postDayModalTitle: 'Post Day — Reseat Request',
    postDayModalDesc: (name: string) => `${name} requested Post Day so all players receive new seats`,
    acceptedBadge: '✓ Accepted',
    waitingAcceptBadge: '⏳ Waiting...',
    acceptPostDayBtn: '✓ Accept Request',
    closeBtn: 'Close',
    allAcceptedPostDay: '✅ Everyone accepted! Reassigning seats...',
    waitingAllPostDay: '⏳ Waiting for all players to accept...',
    rulesModalTitle: 'Conker Ramino Rules',
    understoodCloseBtn: 'Got It',
    rule1Title: '1. Turn Timer (90s + 30s Warning)',
    rule1Desc: 'Once the previous player discards, you have 90s to think plus a 30s red warning. Failing to draw removes you from the table.',
    rule2Title: '2. Opening Meld (41 Points) & Discard Pickup',
    rule2Desc: 'Your opening meld must total at least 41 points in valid sets or runs. If you pick up from the discard pile before your opening meld, you must either meld immediately or return it before discarding.',
    rule3Title: '3. Bottom Card & Dopey Payouts',
    rule3Desc: 'If you have not melded and all remaining cards form complete melds/Dopey only with the Bottom Card, it glows gold — tap it to win! Dopey (5 pairs + 1 set) pays 2x, or 3x when closed with a Joker.',
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
    notifyDealerStarted: (dealer: string) => `👑 ${dealer} dealt! Game started.`,
    notifyDealtSelf: 'Cards dealt! Draw from the deck or discard pile.',
    notifyDealerOpp: (dealer: string) => `👑 ${dealer} dealt the cards!`,
    notifyYourTurnStart: (dealer: string) => `👑 ${dealer} dealt! It is your turn.`,
    notifyWarning30s: '⚠️ 30s Warning! Draw a card now or you will be removed!',
    notifyBottomNotReady: 'Bottom card win condition is not complete yet.',
    winBottomJokerDopey: (s: string) => `👑 Bottom Joker Dopey Win (${s})! (3x)`,
    winBottomDopey: (c: string) => `🔥 Bottom Card Dopey Win (${c})! (2x)`,
    winBottomNormal: (c: string) => `🏆 Bottom Card Finisher Win (${c})!`,
    notifyReshuffled: '🔄 Deck ran out — discard pile reshuffled into a fresh deck!',
    notifyPostDayApplied: '🪑 All players accepted Post Day! New seats have been assigned.',
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
    winTitleDopeyJoker: '👑 Joker Dopey Winner! (3x)',
    winTitleDopey: '🔥 Dopey Winner! (2x)',
    winTitleStreak: (n: number) => `🔥 ${n} Consecutive Wins! (2x)`,
    winTitleNormal: '🎉 Congratulations! You Won!',
    loseTitle: (w: string) => `😔 ${w} won this round!`,
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
    inviteTextHeader: '🎮 Conker Ramino Private Table Invite!',
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
}) => {
  const t = RAMINO_T[language] || RAMINO_T.am;
  // Navigation Flow: 1. Lobby -> 2. Dealer Cut Ceremony -> 3. Game (Mandatory Landscape)
  const [view, setView] = useState<'lobby' | 'ceremony' | 'game'>('lobby');
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
    if (view === 'game' || view === 'ceremony') {
      if (typeof screen !== 'undefined' && 'orientation' in screen && (screen.orientation as any)?.lock) {
        try {
          (screen.orientation as any).lock('landscape').catch(() => {});
        } catch {}
      }
    }
  }, [view]);

  const shouldRotateToLandscape = isPortrait && forceLandscapeRotate && (view === 'game' || view === 'ceremony');

  // Player Profile & Balance
  const player = sharedUsers?.[0];
  const balance = player?.balance ?? 500;
  const playerName = player?.name || 'Sun Player';

  // Private-Room-Only Live Voice Chat States & WebRTC Signaling
  const [isPrivateRoomGame, setIsPrivateRoomGame] = useState(false);
  const [activePrivateRoomCode, setActivePrivateRoomCode] = useState<string | null>(null);
  const [isMicMuted, setIsMicMuted] = useState(true);
  const [isDeafened, setIsDeafened] = useState(false);
  const [isLocalSpeaking, setIsLocalSpeaking] = useState(false);
  const [voiceConnectedCount, setVoiceConnectedCount] = useState(1);
  const [activeSpeakerName, setActiveSpeakerName] = useState<string | null>(null);
  const [speakingOpponentId, setSpeakingOpponentId] = useState<string | null>(null);

  const myVoicePeerIdRef = useRef<string>(`peer_${Math.random().toString(36).slice(2, 10)}`);
  const voiceWsRef = useRef<WebSocket | null>(null);
  const localMicStreamRef = useRef<MediaStream | null>(null);
  const voicePeerConnsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const remoteAudioMapRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const micAnalyserIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const localAudioCtxRef = useRef<AudioContext | null>(null);
  const isMicMutedRef = useRef(isMicMuted);
  isMicMutedRef.current = isMicMuted;
  const isDeafenedRef = useRef(isDeafened);
  isDeafenedRef.current = isDeafened;
  const playerNameRef = useRef(playerName);
  playerNameRef.current = playerName;

  const stopVoiceChatSession = () => {
    if (micAnalyserIntervalRef.current) {
      clearInterval(micAnalyserIntervalRef.current);
      micAnalyserIntervalRef.current = null;
    }
    if (localAudioCtxRef.current) {
      try {
        localAudioCtxRef.current.close();
      } catch {}
      localAudioCtxRef.current = null;
    }
    if (localMicStreamRef.current) {
      localMicStreamRef.current.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch {}
      });
      localMicStreamRef.current = null;
    }
    voicePeerConnsRef.current.forEach((pc) => {
      try {
        pc.close();
      } catch {}
    });
    voicePeerConnsRef.current.clear();
    remoteAudioMapRef.current.forEach((audioEl) => {
      try {
        audioEl.pause();
        audioEl.srcObject = null;
      } catch {}
    });
    remoteAudioMapRef.current.clear();
    if (voiceWsRef.current) {
      try {
        if (voiceWsRef.current.readyState === WebSocket.OPEN) {
          voiceWsRef.current.send(JSON.stringify({ type: 'ramino:voice:leave' }));
        }
        voiceWsRef.current.close();
      } catch {}
      voiceWsRef.current = null;
    }
    setIsLocalSpeaking(false);
    setSpeakingOpponentId(null);
    setActiveSpeakerName(null);
    setVoiceConnectedCount(1);
  };

  // Sync mute state onto local mic tracks
  useEffect(() => {
    if (localMicStreamRef.current) {
      localMicStreamRef.current.getAudioTracks().forEach((t) => {
        t.enabled = !isMicMuted;
      });
    }
    if (isMicMuted) {
      setIsLocalSpeaking(false);
    }
  }, [isMicMuted]);

  // Sync deafen state onto all remote peer <audio> elements
  useEffect(() => {
    remoteAudioMapRef.current.forEach((audioEl) => {
      audioEl.muted = isDeafened;
    });
    if (isDeafened) {
      setSpeakingOpponentId(null);
      setActiveSpeakerName(null);
    }
  }, [isDeafened]);

  // Ensure live microphone capture & attach tracks to all active WebRTC peers
  const ensureLocalMicAndAttach = async (): Promise<boolean> => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      triggerNotification(t.notifyMicUnsupported);
      return false;
    }
    try {
      let stream = localMicStreamRef.current;
      if (!stream || stream.getAudioTracks().every((t) => t.readyState === 'ended')) {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        localMicStreamRef.current = stream;

        // Live microphone speaking level detector
        try {
          const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          if (AudioCtx) {
            const ctx = new AudioCtx();
            localAudioCtxRef.current = ctx;
            const src = ctx.createMediaStreamSource(stream);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 256;
            src.connect(analyser);
            const data = new Uint8Array(analyser.frequencyBinCount);
            let prevSpeaking = false;
            if (micAnalyserIntervalRef.current) clearInterval(micAnalyserIntervalRef.current);
            micAnalyserIntervalRef.current = setInterval(() => {
              if (isMicMutedRef.current) {
                if (prevSpeaking) {
                  prevSpeaking = false;
                  setIsLocalSpeaking(false);
                  if (voiceWsRef.current?.readyState === WebSocket.OPEN) {
                    voiceWsRef.current.send(JSON.stringify({ type: 'ramino:voice:speaking', isSpeaking: false }));
                  }
                }
                return;
              }
              analyser.getByteTimeDomainData(data);
              let sumSq = 0;
              for (let i = 0; i < data.length; i++) {
                const v = (data[i] - 128) / 128;
                sumSq += v * v;
              }
              const rms = Math.sqrt(sumSq / data.length);
              const speakingNow = rms > 0.022;
              if (speakingNow !== prevSpeaking) {
                prevSpeaking = speakingNow;
                setIsLocalSpeaking(speakingNow);
                if (voiceWsRef.current?.readyState === WebSocket.OPEN) {
                  voiceWsRef.current.send(JSON.stringify({ type: 'ramino:voice:speaking', isSpeaking: speakingNow }));
                }
              }
            }, 140);
          }
        } catch {}
      }

      stream.getAudioTracks().forEach((t) => {
        t.enabled = false; // caller toggles unmute immediately after attaching
      });

      // Attach local audio track to existing WebRTC peer connections & renegotiate
      for (const [peerId, pc] of voicePeerConnsRef.current.entries()) {
        const senders = pc.getSenders();
        for (const track of stream.getAudioTracks()) {
          const existingAudioSender = senders.find((s) => s.track?.kind === 'audio');
          if (existingAudioSender) {
            await existingAudioSender.replaceTrack(track);
          } else {
            pc.addTrack(track, stream);
          }
        }
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          if (voiceWsRef.current?.readyState === WebSocket.OPEN) {
            voiceWsRef.current.send(
              JSON.stringify({
                type: 'ramino:voice:signal',
                toPeerId: peerId,
                signal: { sdp: pc.localDescription },
              })
            );
          }
        } catch {}
      }
      return true;
    } catch {
      triggerNotification(t.notifyMicDenied);
      return false;
    }
  };

  const handleTogglePrivateMic = async () => {
    raminoAudio.playCardSnap();
    if (!isPrivateRoomGame || !activePrivateRoomCode) return;
    if (isMicMuted) {
      const ok = await ensureLocalMicAndAttach();
      if (!ok) return;
      if (localMicStreamRef.current) {
        localMicStreamRef.current.getAudioTracks().forEach((t) => {
          t.enabled = true;
        });
      }
      setIsMicMuted(false);
      triggerNotification(t.notifyMicOpened);
    } else {
      setIsMicMuted(true);
      if (voiceWsRef.current?.readyState === WebSocket.OPEN) {
        voiceWsRef.current.send(JSON.stringify({ type: 'ramino:voice:speaking', isSpeaking: false }));
      }
    }
  };

  // Connect real-time WebRTC + WebSocket Voice Channel ONLY inside Private Room games
  useEffect(() => {
    const inPrivateArena =
      (view === 'ceremony' || view === 'game') && isPrivateRoomGame && Boolean(activePrivateRoomCode);
    if (!inPrivateArena || !activePrivateRoomCode) {
      stopVoiceChatSession();
      return;
    }

    const roomCode = activePrivateRoomCode.trim().toUpperCase();
    const resolved = buildApiUrl('/ws/bingo');
    const wsUrl = resolved.startsWith('http')
      ? resolved.replace(/^http/, 'ws')
      : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/bingo`;

    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl);
    } catch {
      return;
    }
    voiceWsRef.current = ws;

    const getOrCreatePeer = (remotePeerId: string, remoteName: string) => {
      const existing = voicePeerConnsRef.current.get(remotePeerId);
      if (existing) return existing;

      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      });

      if (localMicStreamRef.current) {
        localMicStreamRef.current.getAudioTracks().forEach((t) => {
          pc.addTrack(t, localMicStreamRef.current!);
        });
      } else {
        try {
          pc.addTransceiver('audio', { direction: 'recvonly' });
        } catch {}
      }

      pc.onicecandidate = (ev) => {
        if (ev.candidate && ws.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              type: 'ramino:voice:signal',
              toPeerId: remotePeerId,
              signal: { candidate: ev.candidate },
            })
          );
        }
      };

      pc.ontrack = (ev) => {
        const remoteStream = ev.streams?.[0];
        if (!remoteStream) return;
        let audioEl = remoteAudioMapRef.current.get(remotePeerId);
        if (!audioEl) {
          audioEl = new Audio();
          audioEl.autoplay = true;
          (audioEl as unknown as { playsInline?: boolean }).playsInline = true;
          remoteAudioMapRef.current.set(remotePeerId, audioEl);
        }
        audioEl.srcObject = remoteStream;
        audioEl.muted = isDeafenedRef.current;
        audioEl.volume = 1.0;
        audioEl.play().catch(() => {});
      };

      const visibleCount = 1 + Array.from(voicePeerConnsRef.current.keys()).filter((id) => !id.startsWith('adm_mon_')).length;
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
          voicePeerConnsRef.current.delete(remotePeerId);
          const nextVis =
            1 + Array.from(voicePeerConnsRef.current.keys()).filter((id) => !id.startsWith('adm_mon_')).length;
          setVoiceConnectedCount(nextVis);
        }
      };

      voicePeerConnsRef.current.set(remotePeerId, pc);
      if (!remotePeerId.startsWith('adm_mon_')) {
        setVoiceConnectedCount(
          1 + Array.from(voicePeerConnsRef.current.keys()).filter((id) => !id.startsWith('adm_mon_')).length
        );
      } else {
        void visibleCount;
      }
      // Keep remoteName referenced cleanly
      if (remoteName) {
        // peer registered
      }
      return pc;
    };

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          type: 'ramino:voice:join',
          roomCode,
          peerId: myVoicePeerIdRef.current,
          playerName: playerNameRef.current,
        })
      );
    };

    ws.onmessage = async (event) => {
      try {
        const msg = JSON.parse(String(event.data));
        if (!msg || msg.roomCode !== roomCode) return;

        if (msg.type === 'ramino:voice:peers' && Array.isArray(msg.peers)) {
          for (const peer of msg.peers as { peerId: string; playerName: string }[]) {
            if (!peer?.peerId || peer.peerId === myVoicePeerIdRef.current) continue;
            const pc = getOrCreatePeer(peer.peerId, peer.playerName);
            try {
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(
                  JSON.stringify({
                    type: 'ramino:voice:signal',
                    toPeerId: peer.peerId,
                    signal: { sdp: pc.localDescription },
                  })
                );
              }
            } catch {}
          }
          setVoiceConnectedCount(1 + voicePeerConnsRef.current.size);
        } else if (msg.type === 'ramino:voice:peer-joined') {
          if (msg.peerId && msg.peerId !== myVoicePeerIdRef.current) {
            getOrCreatePeer(msg.peerId, msg.playerName || 'Friend');
          }
        } else if (msg.type === 'ramino:voice:signal') {
          const fromPeerId = String(msg.fromPeerId || '');
          if (!fromPeerId || fromPeerId === myVoicePeerIdRef.current) return;
          const pc = getOrCreatePeer(fromPeerId, msg.playerName || 'Friend');
          const sig = msg.signal;
          if (sig?.sdp) {
            await pc.setRemoteDescription(new RTCSessionDescription(sig.sdp));
            if (sig.sdp.type === 'offer') {
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(
                  JSON.stringify({
                    type: 'ramino:voice:signal',
                    toPeerId: fromPeerId,
                    signal: { sdp: pc.localDescription },
                  })
                );
              }
            }
          } else if (sig?.candidate) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(sig.candidate));
            } catch {}
          }
        } else if (msg.type === 'ramino:voice:speaking') {
          if (isDeafenedRef.current) return;
          const speaker = String(msg.playerName || '');
          if (msg.isSpeaking) {
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
          const pc = voicePeerConnsRef.current.get(leftId);
          if (pc) {
            try {
              pc.close();
            } catch {}
            voicePeerConnsRef.current.delete(leftId);
          }
          const audioEl = remoteAudioMapRef.current.get(leftId);
          if (audioEl) {
            try {
              audioEl.pause();
              audioEl.srcObject = null;
            } catch {}
            remoteAudioMapRef.current.delete(leftId);
          }
          setVoiceConnectedCount(1 + voicePeerConnsRef.current.size);
          // Any player leaving the table resets consecutive win streak back to 0
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
            triggerNotification(t.notifyAdminClosedRoom);
          } else if (msg.action === 'reset') {
            setView('lobby');
            triggerNotification(t.notifyAdminResetGame);
          }
        }
      } catch {}
    };

    return () => {
      stopVoiceChatSession();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, isPrivateRoomGame, activePrivateRoomCode]);

  // Lobby Rooms State with Real 1s Countdowns & Auto-Refund at 0:00
  const [openRooms, setOpenRooms] = useState<RaminoRoom[]>([
    {
      id: 'r_7714',
      name: '#7714',
      creator: 'S',
      avatarLetter: 'S',
      avatarColor: 'bg-amber-500',
      stake: 200,
      max: 4,
      current: 2,
      duration: 240,
      timeRemaining: 215,
    },
    {
      id: 'r_9201',
      name: '#9201',
      creator: 'H',
      avatarLetter: 'H',
      avatarColor: 'bg-orange-500',
      stake: 500,
      max: 5,
      current: 3,
      duration: 300,
      timeRemaining: 265,
    },
  ]);

  const [playerSeatCount, setPlayerSeatCount] = useState<2 | 3 | 4 | 5>(3);
  const [selectedStake, setSelectedStake] = useState<number>(30);
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
  const [notificationBanner, setNotificationBanner] = useState<string | null>(null);
  const [isBannedModalOpen, setIsBannedModalOpen] = useState<boolean>(false);

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

  const [winnerCelebration, setWinnerCelebration] = useState<{
    show: boolean;
    title: string;
    winnerId: string;
    winnerName: string;
    isOpponentWin?: boolean;
    multiplier: number;
    dopeyMultiplier: number;
    streakMultiplier: number;
    streakCount: number;
    winAmount: number;
    rakeAmount: number;
  } | null>(null);

  // Refs to keep interval/timeout callbacks free of stale closures or nested state setters
  const openRoomsRef = useRef<RaminoRoom[]>(openRooms);
  openRoomsRef.current = openRooms;
  const onUpdateSharedUsersRef = useRef(onUpdateSharedUsers);
  onUpdateSharedUsersRef.current = onUpdateSharedUsers;

  // Notification banner helper
  const triggerNotification = (text: string) => {
    setNotificationBanner(text);
    setTimeout(() => {
      setNotificationBanner((cur) => (cur === text ? null : cur));
    }, 3800);
  };

  // Wallet helper (Unified across all games & synced with server)
  const adjustWalletBalance = (delta: number) => {
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
        body: JSON.stringify({ phone, name: playerName, delta, game: 'ramino' }),
      }).catch(() => {});
    }
  };

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
      hostName: playerName,
      maxPlayers: seats,
      stake,
      players: [{ name: playerName, isHost: true, joinedAt: Date.now() }],
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
          hostName: playerName,
          maxPlayers: seats,
          stake,
        }),
      });
      const data = await res.json();
      if (data?.ok && data.room) {
        saveLocalPrivateRoom(data.room);
        setPrivateRoomState(data.room);
      }
    } catch {}
  };

  const lookupPrivateRoomByCode = async (code: string): Promise<RaminoPrivateRoomSnapshot | null> => {
    const clean = code.trim().toUpperCase();
    if (!clean) return null;
    try {
      const res = await fetch(buildApiUrl(`/api/ramino/private-rooms/${encodeURIComponent(clean)}`));
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
  }, []);

  // Poll Private Room while host modal is open so joined friends appear live
  useEffect(() => {
    if (!isPrivateModalOpen) return;
    syncPrivateRoomToHost(privateCode, playerSeatCount, selectedStake);
    const timer = setInterval(async () => {
      const room = await lookupPrivateRoomByCode(privateCode);
      if (room) setPrivateRoomState(room);
    }, 2000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPrivateModalOpen, privateCode, playerSeatCount, selectedStake]);

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
        setJoinLookupError('በዚህ ኮድ የተፈጠረ ክፍል አልተገኘም ወይም ሊንኩን በትክክል ያረጋግጡ።');
      }
    }, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isJoinCodeModalOpen, joinCodeInput]);

  // Lobby 1-Second Live Timer & Auto-Refund at 0:00 (no side effects inside state updater)
  useEffect(() => {
    const interval = setInterval(() => {
      const curRooms = openRoomsRef.current;
      if (curRooms.length === 0) return;

      const next: RaminoRoom[] = [];
      const expiredCreated: RaminoRoom[] = [];

      for (const rm of curRooms) {
        if (rm.timeRemaining <= 1) {
          if (rm.isUserCreated) {
            expiredCreated.push(rm);
          }
        } else {
          next.push({ ...rm, timeRemaining: rm.timeRemaining - 1 });
        }
      }

      setOpenRooms(next);

      if (expiredCreated.length > 0) {
        const totalRefund = expiredCreated.reduce((s, r) => s + r.stake, 0);
        adjustWalletBalance(totalRefund);
        const lastExpired = expiredCreated[expiredCreated.length - 1];
        triggerNotification(`⏰ ክፍል ${lastExpired.name} ሰዓቱ ስላለቀ ተዘግቷል፤ ${totalRefund} ETB ወደ ዋሌትዎ ተመልሷል!`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

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
    winStreakRef.current = 0;
    setWinStreak(0);
    privateRoundCountRef.current = 1;
    setPrivateRoundCount(1);
    setReshuffleCount(0);
    const initialSeats = [...BOT_PROFILES];
    tableSeatOrderRef.current = initialSeats;
    setTableSeatOrder(initialSeats);
    setSelectedStake(stake);
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
    const deckCount: 1 | 2 = playerSeatCount === 2 ? 1 : 2;
    const shuffled = buildShuffledDeck(deckCount);

    let offset = 0;
    // Deal 13 cards to player (13 cards -> draws 14th on their turn!)
    const dealtHand = shuffled.slice(offset, offset + 13);
    offset += 13;

    // Deal 13 real cards from the same shuffled shoe to each opponent (preserving table seat order!)
    const activeOpps: RaminoOpponent[] = tableSeatOrderRef.current
      .slice(0, playerSeatCount - 1)
      .map((b) => {
        const oppHand = shuffled.slice(offset, offset + 13);
        offset += 13;
        return {
          ...b,
          hand: oppHand,
          cardCount: oppHand.length,
          isDealer: b.name === dealerName,
          hasMelded: false,
        };
      });

    const bCard = shuffled[offset];
    offset += 1;
    const firstDiscard = shuffled[offset];
    offset += 1;
    const remainingDeck = shuffled.slice(offset);

    opponentsRef.current = activeOpps;
    deckCardsRef.current = remainingDeck;
    discardPileRef.current = [firstDiscard];

    setCeremonyDealer(dealerName);
    setOpponents(activeOpps);
    setPlayerHand(dealtHand);
    setBottomCard(bCard);
    setDiscardPile([firstDiscard]);
    setDeckCards(remainingDeck);

    // Clean Board on Start!
    setTableMelds([]);
    tableMeldsRef.current = [];
    setClosedSetBadges([]);
    setMeldTurnCounter(0);
    meldTurnCounterRef.current = 0;

    setSelectedCardIds(new Set());
    setHasDrawn(false);
    setDrawnFromDiscardCard(null);
    setHasMelded(false);
    setHasDiscarded(false);
    setTurnSeconds(120); // 90s thinking + 30s warning
    setIsBannedModalOpen(false);
    setWinnerCelebration(null);
    setView('game');
    raminoAudio.playDraw();

    // Seat right after the dealer starts first
    const dealerOppIdx = activeOpps.findIndex((o) => o.name === dealerName);
    if (dealerName === playerName) {
      // Self dealt -> Opponent 1 starts if bots > 0, else self
      if (activeOpps.length > 0) {
        triggerNotification(t.notifyDealerStarted(dealerName));
        setCurrentTurn(1);
        runOpponentTurnsFrom(0);
      } else {
        setCurrentTurn(0);
        triggerNotification(t.notifyDealtSelf);
      }
    } else if (dealerOppIdx !== -1 && dealerOppIdx < activeOpps.length - 1) {
      triggerNotification(t.notifyDealerOpp(dealerName));
      setCurrentTurn(dealerOppIdx + 2);
      runOpponentTurnsFrom(dealerOppIdx + 1);
    } else {
      // Last opponent dealt -> Player ('self') plays first!
      setCurrentTurn(0);
      triggerNotification(t.notifyYourTurnStart(dealerName));
    }
  };

  const enterGameFromCeremony = () => {
    dealRoundWithDealer(ceremonyDealer);
  };

  const enterGameFromCeremonyRef = useRef(enterGameFromCeremony);
  enterGameFromCeremonyRef.current = enterGameFromCeremony;

  // Dealer Cut Ceremony: Start face-down (SUN GAMES cover) -> Open one by one sequentially -> Auto-enter game!
  useEffect(() => {
    if (view !== 'ceremony') return;
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

  // Turn Countdown Timer: 90s Thinking + 30s Warning -> Ban if no card drawn!
  useEffect(() => {
    if (view !== 'game' || currentTurn !== 0 || isBannedModalOpen || winnerCelebration?.show) return;

    const interval = setInterval(() => {
      setTurnSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [view, currentTurn, isBannedModalOpen, winnerCelebration]);

  useEffect(() => {
    if (view !== 'game' || currentTurn !== 0 || isBannedModalOpen || winnerCelebration?.show) return;

    if (turnSeconds === 30) {
      raminoAudio.playBuzzer();
      triggerNotification(t.notifyWarning30s);
    } else if (turnSeconds === 0 && !hasDrawnRef.current) {
      raminoAudio.playBuzzer();
      winStreakRef.current = 0;
      setWinStreak(0);
      setIsBannedModalOpen(true);
    }
  }, [turnSeconds, view, currentTurn, isBannedModalOpen, winnerCelebration]);

  // Contiguous Groups in Hand (for top bar & group elevation on tap)
  const { cardToGroupMap, firstCardOfGroupMap } = useMemo(
    () => detectContiguousGroupsInHand(playerHand),
    [playerHand]
  );

  // Strict 41 Points & Valid Meld Stats (Shows when player drew / picked up from discard OR can finish)
  const calculatedMeldStats = useMemo(() => {
    const selectedCards = playerHand.filter((c) => selectedCardIds.has(c.id));

    if (selectedCards.length >= 3) {
      if (isValidSet(selectedCards) || isValidRun(selectedCards)) {
        const pts = getGroupPoints(selectedCards);
        const isFinishing = selectedCards.length >= playerHand.length - 1;
        return {
          points: pts,
          canMeld: (hasMelded ? true : pts >= 41) && (hasDrawn || drawnFromDiscardCard !== null || isFinishing),
          hasTrisOrCatris: true,
          formedGroupsCount: 1,
        };
      }
      // Multiple groups selected together (e.g. 8-8-8 + J-J-J = 54 pts)
      const part = partitionValidMelds(selectedCards);
      const isFinishing = part.remaining.length === 0 && selectedCards.length >= playerHand.length - 1;
      return {
        points: part.totalPoints,
        canMeld:
          (hasMelded ? part.melds.length > 0 : part.totalPoints >= 41 && part.melds.length > 0) &&
          (hasDrawn || drawnFromDiscardCard !== null || isFinishing),
        hasTrisOrCatris: part.melds.length > 0,
        formedGroupsCount: part.melds.length,
      };
    }

    // Otherwise inspect full hand formed melds
    const handPart = partitionValidMelds(playerHand);
    const isFinishing = handPart.remaining.length <= 1 && handPart.melds.length > 0;
    return {
      points: handPart.totalPoints,
      canMeld:
        handPart.melds.length > 0 &&
        (hasMelded || handPart.totalPoints >= 41) &&
        (hasDrawn || drawnFromDiscardCard !== null || isFinishing),
      hasTrisOrCatris: handPart.melds.length > 0,
      formedGroupsCount: handPart.melds.length,
    };
  }, [playerHand, selectedCardIds, hasMelded, hasDrawn, drawnFromDiscardCard]);

  // Bottom Card Finisher (10♣ or bottomCard): Glows ONLY when unmelded player is on their turn before drawing,
  // cannot already finish without bottomCard, and bottomCard strictly completes ALL cards to finish!
  const allowSameRankDopey = playerSeatCount === 2;

  const isBottomCardFinisherReady = useMemo(() => {
    if (hasMelded || currentTurn !== 0 || hasDrawn || playerHand.length === 0) return false;

    const partWithout = partitionValidMelds(playerHand);
    const dopeyWithout = checkDopey(playerHand, undefined, allowSameRankDopey);

    // If hand is already complete without bottomCard, bottomCard is NOT needed
    if (dopeyWithout.isDopey) return false;
    if (partWithout.remaining.length === 0 && partWithout.melds.length > 0) return false;

    // 1. Dopey Finisher where bottomCard is strictly required (not already Dopey)
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

    // 2. Meld Finisher: ALL cards in hand + bottomCard form valid melds (0 remaining) with >= 41 pts
    const testHand = [...playerHand, bottomCard];
    const partWith = partitionValidMelds(testHand);
    return (
      partWithout.remaining.length >= 1 &&
      partWith.remaining.length === 0 &&
      partWith.melds.length > 0 &&
      partWith.totalPoints >= 41
    );
  }, [playerHand, bottomCard, hasMelded, currentTurn, hasDrawn, allowSameRankDopey]);

  // Bottom Card Finisher Detection + Dopey Detection for Action Stack
  const dopeyReadyInfo = useMemo(() => {
    if (hasMelded || currentTurn !== 0) return { isDopey: false, isJokerFinished: false };
    return checkDopey(playerHand, undefined, allowSameRankDopey);
  }, [playerHand, hasMelded, currentTurn, allowSameRankDopey]);

  // Bottom Card Finisher Click -> Instant Win!
  const handleBottomCardFinisherClick = () => {
    if (!isBottomCardFinisherReady) {
      raminoAudio.playBuzzer();
      triggerNotification(t.notifyBottomNotReady);
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
    triggerRoundWin({
      winnerId: 'self',
      winnerName: playerName,
      dopeyMultiplier: dopeyMult,
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

  // Post Day Handler (Available in Private Tables after 5+ games: reassigns all players into new seats)
  const buildShuffledSeatOrder = () => {
    const activeCount = Math.max(1, playerSeatCount - 1);
    const currentActive = [...tableSeatOrderRef.current.slice(0, activeCount)];
    const rest = [...tableSeatOrderRef.current.slice(activeCount)];
    if (currentActive.length >= 2) {
      const prevSig = currentActive.map((p) => p.id).join(',');
      for (let attempt = 0; attempt < 6; attempt++) {
        for (let i = currentActive.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [currentActive[i], currentActive[j]] = [currentActive[j], currentActive[i]];
        }
        if (currentActive.map((p) => p.id).join(',') !== prevSig) break;
      }
    }
    const nextOrder = [...currentActive, ...rest];
    tableSeatOrderRef.current = nextOrder;
    setTableSeatOrder(nextOrder);
    return nextOrder;
  };

  const applyAcceptedPostDay = (source: 'header' | 'winner') => {
    const nextOrder = buildShuffledSeatOrder();
    if (source === 'header') {
      const activeOppId = currentTurn > 0 ? opponentsRef.current[currentTurn - 1]?.id : null;
      const byId = new Map(opponentsRef.current.map((o) => [o.id, o]));
      const reorderedOpps = nextOrder
        .slice(0, playerSeatCount - 1)
        .map((profile) => byId.get(profile.id))
        .filter((o): o is RaminoOpponent => Boolean(o));

      if (reorderedOpps.length === opponentsRef.current.length) {
        opponentsRef.current = reorderedOpps;
        setOpponents(reorderedOpps);
        if (activeOppId) {
          const newIdx = reorderedOpps.findIndex((o) => o.id === activeOppId);
          if (newIdx !== -1) setCurrentTurn(newIdx + 1);
        }
      }
    }
    privateRoundCountRef.current = 1;
    setPrivateRoundCount(1);
    raminoAudio.playVictory();
    triggerNotification(t.notifyPostDayApplied);

    if (source === 'winner' && winnerCelebration) {
      if (balance < selectedStake) {
        raminoAudio.playBuzzer();
        triggerNotification(t.notifyInsufficientNext);
        return;
      }
      adjustWalletBalance(-selectedStake);
      const dealer = winnerCelebration.winnerName;
      setPostDayRequest(null);
      dealRoundWithDealer(dealer);
    } else {
      setTimeout(() => {
        setPostDayRequest(null);
      }, 950);
    }
  };

  const requestPostDayConsensus = (source: 'header' | 'winner') => {
    if (!isPrivateRoomGame || privateRoundCountRef.current < 5) return;
    raminoAudio.playSwap();

    setPostDayRequest({
      requestedBy: playerName,
      source,
      acceptedIds: [playerName],
      needsMyAccept: false,
      allAccepted: false,
    });

    if (voiceWsRef.current?.readyState === WebSocket.OPEN && activePrivateRoomCode) {
      voiceWsRef.current.send(
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
    if (voiceWsRef.current?.readyState === WebSocket.OPEN && activePrivateRoomCode) {
      voiceWsRef.current.send(
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

    const selectedCards = playerHand.filter((c) => selectedCardIds.has(c.id));
    let newMeldGroups: { type: 'set' | 'run'; cards: PlayingCard[] }[] = [];

    if (selectedCards.length >= 3) {
      if (isValidSet(selectedCards)) {
        newMeldGroups = [{ type: 'set', cards: selectedCards }];
      } else if (isValidRun(selectedCards)) {
        newMeldGroups = [{ type: 'run', cards: selectedCards }];
      } else {
        const part = partitionValidMelds(selectedCards);
        newMeldGroups = part.melds.map((m) => ({ type: m.type, cards: m.cards }));
      }
    } else {
      const part = partitionValidMelds(playerHand);
      newMeldGroups = part.melds.map((m) => ({ type: m.type, cards: m.cards }));
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
      setClosedSetBadges((prev) => [...prev, ...badgesToAdd]);
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

        raminoAudio.playCardSnap();
        const nextHand = playerHand.filter((c) => c.id !== selId);
        setPlayerHand(nextHand);
        setSelectedCardIds(new Set());
        setDrawnFromDiscardCard(null);
        setTableMelds((prev) =>
          prev.map((m) => (m.id === meldId ? { ...m, cards: updatedCards! } : m))
        );
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
          raminoAudio.playSwap();
          setPlayerHand((prev) => prev.map((c) => (c.id === selId ? targetCard : c)));
          setSelectedCardIds(new Set());
          setDrawnFromDiscardCard(null);
          setTableMelds((prev) =>
            prev.map((m) => {
              if (m.id !== meldId) return m;
              const updated = [...m.cards];
              updated[cardIdx] = selCard;
              return { ...m, cards: updated };
            })
          );
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

      raminoAudio.playCardSnap();
      const nextHand = playerHand.filter((c) => c.id !== selId);
      setPlayerHand(nextHand);
      setSelectedCardIds(new Set());
      setDrawnFromDiscardCard(null);
      setTableMelds((prev) =>
        prev.map((m) => (m.id === meldId ? { ...m, cards: combined! } : m))
      );
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

  // Unified Round Win Handler (Winner Deals Next + Dopey 2x/3x + 3+ Consecutive Win Streak 2x)
  const triggerRoundWin = ({
    winnerId,
    winnerName,
    dopeyMultiplier,
    customTitle,
  }: {
    winnerId: string;
    winnerName: string;
    dopeyMultiplier: number;
    customTitle?: string;
  }) => {
    const pot = selectedStake * playerSeatCount;
    const rake = pot * 0.1;

    // Winner always becomes the next round's Dealer!
    setCeremonyDealer(winnerName);

    if (winnerId === 'self') {
      const nextStreak = winStreakRef.current + 1;
      winStreakRef.current = nextStreak;
      setWinStreak(nextStreak);

      const streakMultiplier = nextStreak >= 3 ? 2 : 1;
      const totalMultiplier = dopeyMultiplier * streakMultiplier;
      const netWin = (pot - rake) * totalMultiplier;
      adjustWalletBalance(netWin);

      raminoAudio.playVictory();
      setWinnerCelebration({
        show: true,
        title:
          customTitle ||
          (dopeyMultiplier === 3
            ? t.winTitleDopeyJoker
            : dopeyMultiplier === 2
            ? t.winTitleDopey
            : nextStreak >= 3
            ? t.winTitleStreak(nextStreak)
            : t.winTitleNormal),
        winnerId,
        winnerName,
        isOpponentWin: false,
        multiplier: totalMultiplier,
        dopeyMultiplier,
        streakMultiplier,
        streakCount: nextStreak,
        winAmount: netWin,
        rakeAmount: rake,
      });
    } else {
      // Loss resets consecutive win streak back to 0!
      winStreakRef.current = 0;
      setWinStreak(0);
      raminoAudio.playBuzzer();
      setWinnerCelebration({
        show: true,
        title: t.loseTitle(winnerName),
        winnerId,
        winnerName,
        isOpponentWin: true,
        multiplier: 1,
        dopeyMultiplier: 1,
        streakMultiplier: 1,
        streakCount: 0,
        winAmount: 0,
        rakeAmount: rake,
      });
    }
  };

  // Sequential Opponent Turns Runner (starts from given opponent index, wraps back to player turn 0)
  const runOpponentTurnsFrom = (startOppIdx: number) => {
    const stepTurn = (oppIdx: number) => {
      const activeOpps = opponentsRef.current;
      if (oppIdx >= activeOpps.length) {
        setCurrentTurn(0);
        setHasDiscarded(false);
        setHasDrawn(false);
        setTurnSeconds(120);
        triggerNotification(t.notifyYourTurnFull);
        return;
      }

      const opp = activeOpps[oppIdx];
      setCurrentTurn(oppIdx + 1);

      setTimeout(() => {
        raminoAudio.playCardSnap();

        // Draw 1 real card from deck (or reshuffle discard pile unlimited times if empty) — zero card duplication!
        let curDeck = [...deckCardsRef.current];
        if (curDeck.length === 0 && discardPileRef.current.length > 1) {
          curDeck = reshuffleDiscardIntoDeck(discardPileRef.current);
        }

        const latestOpp = opponentsRef.current[oppIdx] || opp;
        let oppHand = [...(latestOpp.hand || [])];
        if (curDeck.length > 0) {
          oppHand.push(curDeck[0]);
          const nextDeck = curDeck.slice(1);
          deckCardsRef.current = nextDeck;
          setDeckCards(nextDeck);
        }

        // Check if bot holds real valid melds (41+ pts if unmelded, or any valid meld if already melded)
        let oppHasMelded = Boolean(latestOpp.hasMelded);
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
            setClosedSetBadges((prev) => [...prev, ...badgesToAdd]);
          }

          const meldedBotIds = new Set(oppEval.melds.flatMap((m) => m.cards.map((c) => c.id)));
          oppHand = oppHand.filter((c) => !meldedBotIds.has(c.id));
          oppHasMelded = true;
          triggerNotification(t.notifyOppMelded(latestOpp.name, oppEval.totalPoints));
        }

        // Discard 1 real non-joker card from bot's actual hand (if cards left)
        if (oppHand.length > 0) {
          const discardIdx = oppHand.findIndex((c) => !c.isJoker);
          const chosenIdx = discardIdx !== -1 ? discardIdx : 0;
          const [botDiscarded] = oppHand.splice(chosenIdx, 1);
          const nextDiscard = [...discardPileRef.current, botDiscarded];
          discardPileRef.current = nextDiscard;
          setDiscardPile(nextDiscard);
          if (deckCardsRef.current.length === 0 && nextDiscard.length > 1 && oppHand.length > 0) {
            reshuffleDiscardIntoDeck(nextDiscard);
          }
        }

        const updatedOpps = opponentsRef.current.map((o, idx) =>
          idx === oppIdx ? { ...o, hand: oppHand, cardCount: oppHand.length, hasMelded: oppHasMelded } : o
        );
        opponentsRef.current = updatedOpps;
        setOpponents(updatedOpps);

        // If bot emptied their hand -> Bot wins round & becomes next Dealer!
        if (oppHand.length === 0) {
          triggerRoundWin({
            winnerId: latestOpp.id,
            winnerName: latestOpp.name,
            dopeyMultiplier: 1,
          });
          return;
        }

        stepTurn(oppIdx + 1);
      }, 1400);
    };

    stepTurn(startOppIdx);
  };

  // Discard Attempt (Strict Single Discard + Discard-Pickup Rule + Illegal Discard Rule + Opponent Turn Simulation)
  const handleDiscardAttempt = (cardId: string) => {
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

    // Before opening meld (!hasMelded): if player picked up from discard pile this turn,
    // they MUST meld OR return before discarding (unless closing Dopey).
    // Once melded (hasMelded === true), they can play & discard freely!
    if (!hasMelded && drawnFromDiscardCard !== null && !closesDopeyWithDiscard && nextHand.length > 0) {
      raminoAudio.playBuzzer();
      triggerNotification(t.notifyMustMeldOrReturn);
      return;
    }

    const isJoker = cardToDiscard.isJoker || cardToDiscard.rank === 'JOKER';
    const isLastCard = playerHand.length === 1;
    const allCardsMatch = playerHand.every((c) => doesCardMatchTableMelds(c, tableMelds));
    const matchesTable = doesCardMatchTableMelds(cardToDiscard, tableMelds);

    if (matchesTable && !isJoker && !isLastCard && !allCardsMatch && !closesDopeyWithDiscard) {
      raminoAudio.playBuzzer();
      triggerNotification(t.notifyIllegalMatchingDiscard);
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

    if (nextHand.length === 0 || closesDopeyWithDiscard) {
      handleFinalWinCheck(nextHand, cardToDiscard);
      return;
    }

    if (deckCardsRef.current.length === 0 && nextDiscardPile.length > 1) {
      reshuffleDiscardIntoDeck(nextDiscardPile);
    }

    triggerNotification(t.notifyDiscarded(`${cardToDiscard.rank}${cardToDiscard.suit}`));
    runOpponentTurnsFrom(0);
  };

  // Final Win Check (Dopey 2x/3x & 3+ Win Streak 2x & 10% Conker Rake)
  const handleFinalWinCheck = (handSnapshot: PlayingCard[], closingCard?: PlayingCard | null) => {
    const dopey = checkDopey(handSnapshot, closingCard, allowSameRankDopey);
    const dopeyMultiplier = dopey.isJokerFinished ? 3 : dopey.isDopey ? 2 : 1;
    triggerRoundWin({
      winnerId: 'self',
      winnerName: playerName,
      dopeyMultiplier,
    });
  };

  // Smart Auto-Sort: Groups Tris (Sets) AND Catris (Runs) together at front!
  const handleAutoSort = () => {
    raminoAudio.playDraw();
    setPlayerHand((prev) => {
      const part = partitionValidMelds(prev);
      const groupedCards = part.melds.flatMap((m) => m.cards);
      const ungroupedNaturals = part.remaining.filter((c) => !c.isJoker);
      const ungroupedJokers = part.remaining.filter((c) => c.isJoker);

      ungroupedNaturals.sort((a, b) => {
        if (a.value !== b.value) return a.value - b.value;
        return a.suit.localeCompare(b.suit);
      });

      return [...groupedCards, ...ungroupedNaturals, ...ungroupedJokers];
    });
    triggerNotification(t.notifyAutoSorted);
  };

  // Tap Card: If card is inside a formed group, elevate the ENTIRE group together!
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
        const next = new Set(prev);
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
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
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

  // Lobby Actions: Create Room (Adds to Open Rooms + Deducts Stake + Cancelable Refund)
  const handleCreateRoom = () => {
    if (balance < selectedStake) {
      raminoAudio.playBuzzer();
      triggerNotification(t.notifyInsufficientStake(selectedStake));
      return;
    }

    const duration = SEAT_DURATION_MAP[playerSeatCount];
    const roomNum = Math.floor(1000 + Math.random() * 9000);
    const newRoom: RaminoRoom = {
      id: `r_${Date.now()}`,
      name: `#${roomNum}`,
      creator: playerName,
      avatarLetter: playerName[0]?.toUpperCase() || 'P',
      avatarColor: 'bg-amber-400',
      stake: selectedStake,
      max: playerSeatCount,
      current: 1,
      duration,
      timeRemaining: duration,
      isUserCreated: true,
    };

    adjustWalletBalance(-selectedStake);
    setOpenRooms((prev) => [newRoom, ...prev]);
    raminoAudio.playDraw();
    triggerNotification(t.notifyRoomCreated(roomNum, selectedStake));
  };

  // Cancel Created Room -> Immediate Refund
  const handleCancelCreatedRoom = (room: RaminoRoom) => {
    setOpenRooms((prev) => prev.filter((r) => r.id !== room.id));
    adjustWalletBalance(room.stake);
    raminoAudio.playSwap();
    const dispName = room.name.startsWith('#') ? `${t.roomPrefix}${room.name.slice(1)}` : room.name;
    triggerNotification(t.notifyRoomCancelled(dispName, room.stake));
  };

  // Join or Start Public Room -> Transitions Lobby -> Dealer Cut Ceremony (Voice Chat disabled in Public Rooms)
  const handleJoinOrStartRoom = (room: RaminoRoom) => {
    if (!room.isUserCreated) {
      if (balance < room.stake) {
        raminoAudio.playBuzzer();
        triggerNotification(t.notifyInsufficientJoin(room.stake));
        return;
      }
      adjustWalletBalance(-room.stake);
    }
    setOpenRooms((prev) => prev.filter((r) => r.id !== room.id));
    setIsPrivateRoomGame(false);
    setActivePrivateRoomCode(null);
    setIsMicMuted(true);
    raminoAudio.playDraw();
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
    const isTurn = currentTurn === seatNum;
    return (
      <div
        className={`relative flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/80 border shadow-lg transition ${
          isTurn
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
            {opp.hasMelded && (
              <span className="px-1 rounded bg-emerald-500/30 text-emerald-300 text-[8px] font-bold">{t.meldedBadge}</span>
            )}
          </div>
          <span className="text-[9px] text-gray-400 font-bold">{opp.cardCount} {t.cardWord}</span>
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
        view === 'lobby'
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

            <div className="p-3 rounded-2xl bg-[#1b0d36]/90 border border-purple-500/30 flex flex-col items-center justify-center text-center shadow-lg">
              <div className="flex items-center gap-1 text-yellow-300 text-xs font-bold mb-1">
                <span>🪙</span>
                <span>{t.balanceCardLabel}</span>
              </div>
              <span className="text-sm sm:text-base font-black text-amber-400 font-mono">
                {balance.toLocaleString()} {t.currencyUnit}
              </span>
              <span className="text-[9px] text-purple-300/70 font-semibold mt-0.5">{t.walletSub}</span>
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
                          {room.max === 2 ? t.oneDeckShort : t.twoDecksShort}
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
                {playerSeatCount === 2 ? t.oneDeckDesc : t.twoDecksDesc}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {([
                { count: 2 as const, time: '60s', cards: 54 },
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
          VIEW 2: DEALER CUT CEREMONY (FACE-DOWN -> REVEAL -> AUTO-START GAME)
         ======================================================== */}
      {view === 'ceremony' && (
        <div className="flex-1 w-full h-full flex flex-col bg-[#080316] relative overflow-hidden">
          {/* Ramino Minimal Header: Back + Private-Room-Only Live Voice Chat + Rules/Settings */}
          <header className="w-full px-3 py-1 bg-black/85 border-b border-emerald-500/20 flex items-center justify-between z-40 shrink-0">
            <button
              onClick={() => {
                raminoAudio.playCardSnap();
                stopVoiceChatSession();
                setIsPrivateRoomGame(false);
                setActivePrivateRoomCode(null);
                setIsMicMuted(true);
                setView('lobby');
              }}
              className="px-2.5 py-0.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-yellow-300 font-black text-xs flex items-center gap-1 transition cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{t.backBtn}</span>
            </button>

            <div className="flex items-center gap-1.5">
              {isPrivateRoomGame && activePrivateRoomCode && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-2xl bg-black/60 border border-emerald-500/30">
                  <span className="text-[9px] font-mono font-bold text-teal-300 hidden sm:inline">
                    🔒 {activePrivateRoomCode} ({voiceConnectedCount})
                  </span>
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
                onClick={() => setIsRulesModalOpen(true)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-amber-300 transition cursor-pointer"
                title={t.rulesTooltip}
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsSettingsModalOpen(true)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-amber-300 transition cursor-pointer"
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
          VIEW 3: IN-GAME SCREEN (FULL-SCREEN LANDSCAPE, VOICE CHAT HEADER RESTORED, 4 SEATING LAYOUTS)
         ======================================================== */}
      {view === 'game' && (
        <div className="flex-1 w-full h-full flex flex-col relative overflow-hidden">
          {/* Slim Ramino Header: Back + Streak + Private Voice Chat + Rules + Settings */}
          <header className="w-full px-2.5 py-0.5 bg-black/85 backdrop-blur-md border-b border-emerald-500/20 flex items-center justify-between gap-2 z-40 shrink-0">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  raminoAudio.playCardSnap();
                  stopVoiceChatSession();
                  setIsPrivateRoomGame(false);
                  setActivePrivateRoomCode(null);
                  setIsMicMuted(true);
                  winStreakRef.current = 0;
                  setWinStreak(0);
                  setView('lobby');
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
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-2xl bg-black/60 border border-emerald-500/30">
                  <span className="text-[9px] font-mono font-bold text-teal-300">
                    🔒 {activePrivateRoomCode} • 👥 {voiceConnectedCount} • {t.roundWord} {privateRoundCount}
                  </span>

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
                    <span className="text-[9px] font-black text-emerald-300 animate-pulse px-1">
                      🔊 {activeSpeakerName}
                    </span>
                  )}

                  <button
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
                    <span className="font-bold">{!isMicMuted ? t.micOpen : t.micOpenBtn}</span>
                  </button>

                  <button
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
                onClick={() => {
                  raminoAudio.playCardSnap();
                  setIsRulesModalOpen(true);
                }}
                className="px-2 py-0.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-amber-300 font-black text-[10px] flex items-center gap-1 transition cursor-pointer"
                title={t.rulesTooltip}
              >
                <BookOpen className="w-3 h-3" />
                <span className="hidden sm:inline">{t.rulesBtn}</span>
              </button>

              <button
                onClick={() => {
                  raminoAudio.playCardSnap();
                  setIsSettingsModalOpen(true);
                }}
                className="px-2 py-0.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-300 font-black text-[10px] flex items-center gap-1 transition cursor-pointer"
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

                    {/* Discard Pile — Clearly Visible */}
                    {discardPile.length > 0 && (
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
                    )}
                  </div>
                </div>

                {/* Center Felt: Open Table Melds (IMG_3903 - Full 2-3 row visibility in 2, 3, 4 & 5 players!) */}
                <div className="flex-1 min-w-0 max-h-full flex flex-wrap items-center justify-center content-center gap-1 sm:gap-1.5 px-1 overflow-visible">
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
                          {playerHand.length} {t.cardWord}
                        </span>
                        {hasMelded && (
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
                      currentTurn === 0 && turnSeconds <= 30
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
                        currentTurn === 0 && turnSeconds <= 30 ? 'text-rose-400' : 'text-[#f4c67a]'
                      }`}
                    >
                      {formatTimer(turnSeconds)}
                    </span>
                  </div>
                </div>

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
                  {hasDrawn && !hasDiscarded && selectedCardIds.size === 1 && (() => {
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
              </div>
            </div>
          </main>
        </div>
      )}

      {/* ========================================================
          BANNED FOR TIMEOUT WITHOUT DRAWING MODAL
         ======================================================== */}
      {isBannedModalOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100000] flex items-center justify-center p-4">
          <div className="bg-[#1b0b18] border-2 border-rose-500 rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl">
            <Ban className="w-12 h-12 text-rose-500 mx-auto" />
            <h3 className="text-lg font-black text-rose-400">{t.bannedTitle}</h3>
            <p className="text-xs text-gray-300 leading-relaxed">{t.bannedDesc}</p>
            <button
              onClick={() => {
                setIsBannedModalOpen(false);
                setView('lobby');
              }}
              className="w-full py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs cursor-pointer"
            >
              {t.backToLobbyBtn}
            </button>
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
              const privateInviteLink =
                typeof window !== 'undefined'
                  ? `${window.location.origin}/?game=ramino&raminoRoom=${encodeURIComponent(privateCode)}`
                  : '';
              const joinedPlayers = privateRoomState?.players || [
                { name: playerName, isHost: true, joinedAt: Date.now() },
              ];
              const friendSlotsCount = playerSeatCount - 1;

              const inviteMessage = `${t.inviteTextHeader}\n👥 ${t.seatOptionLabel(playerSeatCount)} • 🪙 ${selectedStake} ${t.currencyUnit}\n🔑 ${privateCode}\n🔗 ${privateInviteLink}`;
              const telegramInviteUrl = `https://t.me/share/url?url=${encodeURIComponent(privateInviteLink)}&text=${encodeURIComponent(
                `${t.inviteTextHeader}\n👥 ${t.seatOptionLabel(playerSeatCount)} • 🪙 ${selectedStake} ${t.currencyUnit}\n🔑 ${privateCode}`
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

                  {/* Step 2: Room Code */}
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
                if (balance < selectedStake) {
                  raminoAudio.playBuzzer();
                  triggerNotification(t.notifyInsufficientWallet);
                  return;
                }
                try {
                  await fetch(buildApiUrl(`/api/ramino/private-rooms/${encodeURIComponent(privateCode)}/start`), {
                    method: 'POST',
                  });
                } catch {}
                setIsPrivateRoomGame(true);
                setActivePrivateRoomCode(privateCode.trim().toUpperCase());
                setIsMicMuted(true);
                adjustWalletBalance(-selectedStake);
                setIsPrivateModalOpen(false);
                startDealerCutCeremony(playerSeatCount, selectedStake);
              }}
              className="w-full py-3 rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-sm shadow-xl transition cursor-pointer"
            >
              {t.startPrivateRoomBtn(selectedStake, playerSeatCount)}
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
                const cleanCode = joinCodeInput.trim().toUpperCase();
                if (!cleanCode) {
                  raminoAudio.playBuzzer();
                  triggerNotification(t.notifyEnterValidCode);
                  return;
                }
                let roomToJoin = joinedRoomPreview || (await lookupPrivateRoomByCode(cleanCode));
                try {
                  const res = await fetch(buildApiUrl(`/api/ramino/private-rooms/${encodeURIComponent(cleanCode)}/join`), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ playerName }),
                  });
                  const data = await res.json();
                  if (res.ok && data?.ok && data.room) {
                    roomToJoin = data.room;
                    saveLocalPrivateRoom(data.room);
                  } else if (res.status === 400) {
                    raminoAudio.playBuzzer();
                    triggerNotification(data?.error || t.notifyRoomFull);
                    return;
                  }
                } catch {}

                const targetSeats = roomToJoin?.maxPlayers || playerSeatCount;
                const targetStake = roomToJoin?.stake || selectedStake;
                if (balance < targetStake) {
                  raminoAudio.playBuzzer();
                  triggerNotification(t.notifyInsufficientWallet);
                  return;
                }
                setPlayerSeatCount(targetSeats);
                setSelectedStake(targetStake);
                setIsPrivateRoomGame(true);
                setActivePrivateRoomCode(cleanCode);
                setIsMicMuted(true);
                adjustWalletBalance(-targetStake);
                setIsJoinCodeModalOpen(false);
                triggerNotification(t.notifyJoinedPrivateCode(cleanCode));
                startDealerCutCeremony(targetSeats, targetStake);
              }}
              className="w-full py-3 rounded-2xl bg-blue-500 hover:bg-blue-400 text-white font-black text-sm shadow-xl transition cursor-pointer"
            >
              {t.joinRoomSubmit(joinedRoomPreview)}
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          WINNER CELEBRATION MODAL (Winner Deals Next Round + Dopey & 3+ Streak Multipliers)
         ======================================================== */}
      {winnerCelebration?.show && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100000] flex items-center justify-center p-4">
          <div className="bg-[#121626] border-2 border-yellow-400 rounded-[32px] p-5 sm:p-6 max-w-sm w-full text-center space-y-3.5 shadow-2xl">
            <span className="text-5xl">{winnerCelebration.isOpponentWin ? '🃏' : '👑'}</span>
            <h2 className="text-lg sm:text-xl font-black text-yellow-300 leading-snug">
              {winnerCelebration.title}
            </h2>

            <div className="p-3.5 rounded-2xl bg-black/60 border border-yellow-500/30 space-y-1.5 text-xs">
              <div className="flex justify-between text-gray-300">
                <span>{t.potAmountLabel}</span>
                <span className="font-mono">{selectedStake * playerSeatCount} {t.currencyUnit}</span>
              </div>
              <div className="flex justify-between text-rose-400">
                <span>{t.rakeLabel}</span>
                <span className="font-mono">-{winnerCelebration.rakeAmount.toFixed(1)} {t.currencyUnit}</span>
              </div>
              {winnerCelebration.dopeyMultiplier > 1 && (
                <div className="flex justify-between text-amber-300 font-bold">
                  <span>{t.dopeyMultLabel}</span>
                  <span>{winnerCelebration.dopeyMultiplier}x</span>
                </div>
              )}
              {winnerCelebration.streakMultiplier > 1 && (
                <div className="flex justify-between text-emerald-300 font-bold">
                  <span>{t.streakMultLabel(winnerCelebration.streakCount)}</span>
                  <span>{t.streakTimes(winnerCelebration.streakMultiplier)}</span>
                </div>
              )}
              {!winnerCelebration.isOpponentWin && winnerCelebration.streakCount > 0 && winnerCelebration.streakCount < 3 && (
                <div className="text-[10px] text-sky-300 font-bold pt-0.5">
                  {t.streakProgress(winnerCelebration.streakCount)}
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
                  if (balance < selectedStake) {
                    raminoAudio.playBuzzer();
                    triggerNotification(t.notifyInsufficientNext);
                    return;
                  }
                  if (isPrivateRoomGame) {
                    const nextRound = privateRoundCountRef.current + 1;
                    privateRoundCountRef.current = nextRound;
                    setPrivateRoundCount(nextRound);
                  }
                  adjustWalletBalance(-selectedStake);
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
      )}

      {/* ========================================================
          POST DAY MUTUAL ACCEPTANCE MODAL (All Players Accept)
         ======================================================== */}
      {postDayRequest && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[100001] flex items-center justify-center p-4">
          <div className="bg-[#121626] border-2 border-teal-400 rounded-3xl p-5 max-w-sm w-full space-y-3.5 shadow-2xl">
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
      )}

      {/* ========================================================
          RAMINO SETTINGS MODAL (ቅንብር)
         ======================================================== */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-[100002]">
          <div className="bg-[#121626] border-2 border-amber-400/45 rounded-[28px] p-5 max-w-md w-full text-left space-y-4 shadow-2xl max-h-[88vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-black text-amber-300">{t.settingsTitle}</h3>
              </div>
              <button
                onClick={() => setIsSettingsModalOpen(false)}
                className="text-gray-400 hover:text-white font-black text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
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

              {/* Quick Actions: Open Full Rules + Back to Hub */}
              <div className="grid grid-cols-1 gap-2 pt-1">
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
              onClick={() => setIsSettingsModalOpen(false)}
              className="w-full py-2.5 rounded-xl bg-amber-500 text-slate-950 font-black text-xs hover:bg-amber-400 transition cursor-pointer"
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
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 z-[100003]">
          <div className="bg-[#121626] border-2 border-yellow-500/45 rounded-[28px] p-4 sm:p-6 max-w-xl w-full text-left space-y-3.5 shadow-2xl max-h-[88vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
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
                onClick={() => setIsRulesModalOpen(false)}
                className="text-gray-400 hover:text-white font-black text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

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

            <button
              onClick={() => setIsRulesModalOpen(false)}
              className="w-full py-2.5 rounded-xl bg-amber-500 text-slate-950 font-black text-xs hover:bg-amber-400 transition cursor-pointer"
            >
              {t.understoodCloseBtn}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModernRaminoGame;
