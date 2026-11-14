import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Menu,
  X,
  Volume2,
  VolumeX,
  Wallet,
  Play,
  RotateCcw,
  Check,
  CheckCircle2,
  Sparkles,
  Clock,
  Flame,
  Snowflake,
  Trash2,
  Shuffle,
  ChevronLeft,
  Copy,
  Info,
  Shield,
  Layers,
  Globe,
  Crown,
  FastForward,
  Trophy,
  ShieldCheck,
  ChevronUp,
  Download,
  BarChart2,
} from 'lucide-react';

const fireConfetti = () => {
  try {
    if (typeof (window as any).confetti === 'function') {
      (window as any).fireConfetti(); // confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
    }
  } catch {}
};

/* ========================================================
   1. TYPES
   ======================================================== */

export type Language = 'am' | 'en' | 'ti' | 'om';
export type KenoSpeed = 'normal' | 'fast' | 'turbo' | 'instant';
export type KenoSideBet = 'heads' | 'tails' | 'evens' | 'odd' | 'even' | 'odd_even_tie';

export interface KenoPaytableTier {
  hits: number;
  multiplier: number;
  descriptionAm: string;
}

export interface KenoRoundResult {
  roundId: string;
  roundNumber: number;
  timestamp: number;
  playerPicks: number[];
  drawnBalls: number[];
  matchedBalls: number[];
  superBall: number;
  isSuperBallMatched: boolean;
  spotCount: number;
  stake: number;
  baseMultiplier: number;
  totalMultiplier: number;
  payout: number;
  sideBet?: {
    type: KenoSideBet;
    stake: number;
    won: boolean;
    multiplier: number;
    payout: number;
  };
  netProfit: number;
}

export interface KenoStats {
  totalRoundsPlayed: number;
  totalBirrWagered: number;
  totalBirrWon: number;
  biggestWin: number;
  ballFrequency: Record<number, number>;
}

export interface FastKenoScreenProps {
  onBackToLudo?: () => void;
  onOpenBingo?: () => void;
  onOpenWallet?: () => void;
  initialBalance?: number;
  onBalanceChange?: (newBalance: number) => void;
  language?: Language;
  onChangeLanguage?: (lang: Language) => void;
}


/* ========================================================
   2. AUDIO SYNTHESIZER (Web Audio API - Zero Asset Dependency)
   ======================================================== */
// Procedural Web Audio API sound synthesizer for Fast Keno (ፈጣን ኬኖ)
// Zero external asset dependencies, crystal clear, ultra-low latency

class KenoAudioManager {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private vibrate(pattern: number | number[] = 25) {
    if ('navigator' in window && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Ignore haptics errors
      }
    }
  }

  // Soft clean tick when tapping a number to pick it
  public playSelect() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;
    this.vibrate(20);

    const ctx = this.ctx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.05); // A5

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.07);
  }

  // Softer tone when deselecting a number
  public playDeselect() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;
    this.vibrate(15);

    const ctx = this.ctx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(740, now);
    osc.frequency.exponentialRampToValueAtTime(370, now + 0.05);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.06);
  }

  // Pop sound when a ball is drawn into the chute
  public playBallPop(ballIndex: number) {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const ctx = this.ctx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // Scale pitch slightly as draw progresses (1..20)
    const baseFreq = 300 + (ballIndex % 20) * 15;
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, now + 0.04);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.06);
  }

  // Celebratory bell chime when a drawn ball matches player's pick!
  public playHitMatch(hitCount: number) {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;
    this.vibrate([40, 20, 60]);

    const ctx = this.ctx;
    const now = ctx.currentTime;

    // Harmonic bell chord based on hits
    const pentatonic = [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98, 2093.0];
    const pitch = pentatonic[Math.min(hitCount - 1, pentatonic.length - 1)] || 1046.5;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(pitch, now);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(pitch * 1.5, now);

    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.3);
    osc2.stop(now + 0.3);
  }

  // Golden Super Ball dramatic reveal sound
  public playSuperBall() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;
    this.vibrate([60, 40, 80, 40, 120]);

    const ctx = this.ctx;
    const now = ctx.currentTime;

    const notes = [440, 554.37, 659.25, 880, 1108.73];
    notes.forEach((freq, idx) => {
      const time = now + idx * 0.05;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, time);

      gain.gain.setValueAtTime(0.2, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(time);
      osc.stop(time + 0.26);
    });
  }

  // Quick Pick shuffle cascade
  public playShuffle() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;
    this.vibrate(30);

    const ctx = this.ctx;
    const now = ctx.currentTime;

    for (let i = 0; i < 5; i++) {
      const time = now + i * 0.03;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(400 + Math.random() * 600, time);

      gain.gain.setValueAtTime(0.1, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.03);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(time);
      osc.stop(time + 0.04);
    }
  }

  // Big Win fanfare with triumphal trumpet chords
  public playBigWin() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;
    this.vibrate([100, 50, 150, 50, 300]);

    const ctx = this.ctx;
    const now = ctx.currentTime;

    const chords = [
      { t: 0, f: [392, 523.25, 659.25] }, // C major
      { t: 0.15, f: [392, 523.25, 659.25] },
      { t: 0.3, f: [440, 587.33, 698.46] }, // D minor
      { t: 0.45, f: [523.25, 659.25, 783.99, 1046.5] }, // High C major
    ];

    chords.forEach((chord) => {
      chord.f.forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const time = now + chord.t;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, time);

        gain.gain.setValueAtTime(0.2, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.45);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(time);
        osc.stop(time + 0.48);
      });
    });
  }

  // Cash counter sound
  public playCashRegister() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const ctx = this.ctx;
    const now = ctx.currentTime;

    // Bell ding
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1760, now); // A6
    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.42);
  }
}

export const kenoAudio = new KenoAudioManager();


/* ========================================================
   3. KENO ENGINE & PAYTABLES
   ======================================================== */

// Spot 1 to 10 canonical paytables matching IMG_3865_763601dc.jpeg exactly
export const KENO_PAYTABLES: Record<number, KenoPaytableTier[]> = {
  1: [
    { hits: 1, multiplier: 3.5, descriptionAm: '1 የተመታ (3.5x)' },
  ],
  2: [
    { hits: 1, multiplier: 1.0, descriptionAm: '1 የተመታ (1x)' },
    { hits: 2, multiplier: 10.0, descriptionAm: '2 የተመታ (10x)' },
  ],
  3: [
    { hits: 2, multiplier: 2.0, descriptionAm: '2 የተመታ (2x)' },
    { hits: 3, multiplier: 50.0, descriptionAm: '3 የተመታ (50x)' },
  ],
  4: [
    { hits: 2, multiplier: 1.5, descriptionAm: '2 የተመታ (1.5x)' },
    { hits: 3, multiplier: 10.0, descriptionAm: '3 የተመታ (10x)' },
    { hits: 4, multiplier: 80.0, descriptionAm: '4 የተመታ (80x)' },
  ],
  5: [
    { hits: 2, multiplier: 1.0, descriptionAm: '2 የተመታ (1x)' },
    { hits: 3, multiplier: 3.0, descriptionAm: '3 የተመታ (3x)' },
    { hits: 4, multiplier: 30.0, descriptionAm: '4 የተመታ (30x)' },
    { hits: 5, multiplier: 150.0, descriptionAm: '5 የተመታ (150x)' },
  ],
  6: [
    { hits: 3, multiplier: 2.0, descriptionAm: '3 የተመታ (2x)' },
    { hits: 4, multiplier: 15.0, descriptionAm: '4 የተመታ (15x)' },
    { hits: 5, multiplier: 60.0, descriptionAm: '5 የተመታ (60x)' },
    { hits: 6, multiplier: 500.0, descriptionAm: '6 የተመታ (500x)' },
  ],
  7: [
    { hits: 0, multiplier: 1.0, descriptionAm: '0 የተመታ (1x)' },
    { hits: 3, multiplier: 2.0, descriptionAm: '3 የተመታ (2x)' },
    { hits: 4, multiplier: 4.0, descriptionAm: '4 የተመታ (4x)' },
    { hits: 5, multiplier: 20.0, descriptionAm: '5 የተመታ (20x)' },
    { hits: 6, multiplier: 80.0, descriptionAm: '6 የተመታ (80x)' },
    { hits: 7, multiplier: 1000.0, descriptionAm: '7 የተመታ (1,000x)' },
  ],
  8: [
    { hits: 0, multiplier: 1.0, descriptionAm: '0 የተመታ (1x)' },
    { hits: 4, multiplier: 5.0, descriptionAm: '4 የተመታ (5x)' },
    { hits: 5, multiplier: 15.0, descriptionAm: '5 የተመታ (15x)' },
    { hits: 6, multiplier: 50.0, descriptionAm: '6 የተመታ (50x)' },
    { hits: 7, multiplier: 200.0, descriptionAm: '7 የተመታ (200x)' },
    { hits: 8, multiplier: 2000.0, descriptionAm: '8 የተመታ (2,000x)' },
  ],
  9: [
    { hits: 0, multiplier: 2.0, descriptionAm: '0 የተመታ (2x)' },
    { hits: 4, multiplier: 2.0, descriptionAm: '4 የተመታ (2x)' },
    { hits: 5, multiplier: 10.0, descriptionAm: '5 የተመታ (10x)' },
    { hits: 6, multiplier: 25.0, descriptionAm: '6 የተመታ (25x)' },
    { hits: 7, multiplier: 125.0, descriptionAm: '7 የተመታ (125x)' },
    { hits: 8, multiplier: 1000.0, descriptionAm: '8 የተመታ (1,000x)' },
    { hits: 9, multiplier: 5000.0, descriptionAm: '9 የተመታ (5,000x)' },
  ],
  10: [
    { hits: 0, multiplier: 2.0, descriptionAm: '0 የተመታ (2x)' },
    { hits: 5, multiplier: 5.0, descriptionAm: '5 የተመታ (5x)' },
    { hits: 6, multiplier: 30.0, descriptionAm: '6 የተመታ (30x)' },
    { hits: 7, multiplier: 100.0, descriptionAm: '7 የተመታ (100x)' },
    { hits: 8, multiplier: 300.0, descriptionAm: '8 የተመታ (300x)' },
    { hits: 9, multiplier: 2000.0, descriptionAm: '9 የተመታ (2,000x)' },
    { hits: 10, multiplier: 10000.0, descriptionAm: '10 የተመታ (10,000x)' },
  ],
};

// Side Bet Odds & Descriptions
export const SIDE_BET_CONFIG: Record<
  KenoSideBet,
  { titleAm: string; titleEn: string; multiplier: number; descAm: string }
> = {
  heads: {
    titleAm: 'ላይ (1-40)',
    titleEn: 'Heads (1-40)',
    multiplier: 2.0,
    descAm: 'ከወጡት 20 ኳሶች 11 ወይም ከዚያ በላይ በ1-40 ውስጥ ሲሆኑ',
  },
  tails: {
    titleAm: 'ታች (41-80)',
    titleEn: 'Tails (41-80)',
    multiplier: 2.0,
    descAm: 'ከወጡት 20 ኳሶች 11 ወይም ከዚያ በላይ በ41-80 ውስጥ ሲሆኑ',
  },
  evens: {
    titleAm: 'እኩል (10:10)',
    titleEn: 'Equal (10:10)',
    multiplier: 4.5,
    descAm: 'በትክክል 10 ኳስ በ1-40 እና 10 ኳስ በ41-80 ውስጥ ሲሆኑ',
  },
  odd: {
    titleAm: 'ኦድ (Odd > 10)',
    titleEn: 'Odd (>10)',
    multiplier: 2.0,
    descAm: 'ከወጡት 20 ኳሶች 11 ወይም ከዚያ በላይ ጎዶሎ ቁጥሮች ሲሆኑ',
  },
  even: {
    titleAm: 'ኢቭን (Even > 10)',
    titleEn: 'Even (>10)',
    multiplier: 2.0,
    descAm: 'ከወጡት 20 ኳሶች 11 ወይም ከዚያ በላይ ተጋማሽ ቁጥሮች ሲሆኑ',
  },
  odd_even_tie: {
    titleAm: 'እኩል (10 ኦድ : 10 ኢቭን)',
    titleEn: 'Tie (10:10)',
    multiplier: 4.5,
    descAm: 'በትክክል 10 ጎዶሎ እና 10 ተጋማሽ ቁጥሮች ሲሆኑ',
  },
};

// Generate 20 distinct random numbers out of 1..80
export function generateKenoDraw(): number[] {
  const allNumbers = Array.from({ length: 80 }, (_, i) => i + 1);
  // Fisher-Yates shuffle
  for (let i = allNumbers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allNumbers[i], allNumbers[j]] = [allNumbers[j], allNumbers[i]];
  }
  return allNumbers.slice(0, 20);
}

// Calculate base multiplier from hits
export function calculateKenoMultiplier(spotCount: number, hitsCount: number): number {
  const paytable = KENO_PAYTABLES[spotCount];
  if (!paytable) return 0;
  const match = paytable.find((t) => t.hits === hitsCount);
  return match ? match.multiplier : 0;
}

// Side bet evaluation
export function evaluateSideBet(
  drawnBalls: number[],
  sideBetType: KenoSideBet
): { won: boolean; multiplier: number } {
  const headsCount = drawnBalls.filter((n) => n <= 40).length;
  const tailsCount = drawnBalls.filter((n) => n > 40).length;
  const oddCount = drawnBalls.filter((n) => n % 2 !== 0).length;
  const evenCount = drawnBalls.filter((n) => n % 2 === 0).length;

  const config = SIDE_BET_CONFIG[sideBetType];
  const mult = config ? config.multiplier : 0;

  let won = false;
  switch (sideBetType) {
    case 'heads':
      won = headsCount >= 11;
      break;
    case 'tails':
      won = tailsCount >= 11;
      break;
    case 'evens':
      won = headsCount === 10 && tailsCount === 10;
      break;
    case 'odd':
      won = oddCount >= 11;
      break;
    case 'even':
      won = evenCount >= 11;
      break;
    case 'odd_even_tie':
      won = oddCount === 10 && evenCount === 10;
      break;
  }

  return { won, multiplier: won ? mult : 0 };
}

// Quick pick generator (picks 'count' unique numbers between 1..80)
export function generateQuickPick(count: number, current: number[] = []): number[] {
  const target = Math.min(10, Math.max(1, count));
  const pool = Array.from({ length: 80 }, (_, i) => i + 1);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, target).sort((a, b) => a - b);
}

// LocalStorage stats key
const STATS_STORAGE_KEY = 'ezi_fast_keno_stats_v1';
const HISTORY_STORAGE_KEY = 'ezi_fast_keno_history_v1';

export function getInitialKenoStats(): KenoStats {
  try {
    const raw = localStorage.getItem(STATS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // Ignore storage errors
  }
  // Authentic canonical frequencies matching IMG_3869 and IMG_3870
  const CANONICAL_SCREENSHOT_FREQ: Record<number, number> = {
    1: 20, 2: 25, 3: 26, 4: 26, 5: 23, 6: 14, 7: 26, 8: 23, 9: 24, 10: 34,
    11: 23, 12: 30, 13: 28, 14: 18, 15: 27, 16: 22, 17: 25, 18: 21, 19: 36, 20: 24,
    21: 25, 22: 22, 23: 27, 24: 23, 25: 26, 26: 24, 27: 21, 28: 25, 29: 22, 30: 29,
    31: 24, 32: 27, 33: 23, 34: 25, 35: 22, 36: 26, 37: 24, 38: 25, 39: 31, 40: 23,
    41: 30, 42: 32, 43: 30, 44: 24, 45: 32, 46: 22, 47: 26, 48: 25, 49: 23, 50: 27,
    51: 22, 52: 25, 53: 24, 54: 26, 55: 21, 56: 25, 57: 23, 58: 24, 59: 27, 60: 29,
    61: 23, 62: 25, 63: 22, 64: 26, 65: 24, 66: 21, 67: 34, 68: 25, 69: 23, 70: 26,
    71: 24, 72: 32, 73: 30, 74: 35, 75: 25, 76: 22, 77: 26, 78: 30, 79: 24, 80: 30,
  };

  return {
    totalRoundsPlayed: 100,
    totalBirrWagered: 2400,
    totalBirrWon: 2180,
    biggestWin: 5000,
    ballFrequency: CANONICAL_SCREENSHOT_FREQ,
  };
}

export function saveKenoStats(stats: KenoStats) {
  try {
    localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(stats));
  } catch {
    // Ignore
  }
}

export function getInitialKenoHistory(): KenoRoundResult[] {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // Ignore
  }
  return [];
}

export function saveKenoHistory(history: KenoRoundResult[]) {
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history.slice(0, 30)));
  } catch {
    // Ignore
  }
}

// Hot and Cold analysis
export function getHotAndColdNumbers(ballFrequency: Record<number, number>): {
  hot: number[];
  cold: number[];
} {
  const entries = Object.entries(ballFrequency).map(([num, count]) => ({
    num: Number(num),
    count,
  }));
  entries.sort((a, b) => b.count - a.count);

  const hot = entries.slice(0, 5).map((e) => e.num);
  const cold = entries.slice(-5).map((e) => e.num);
  return { hot, cold };
}


/* ========================================================
   4. TRANSLATIONS (Amharic, English, Afaan Oromoo, Tigrinya)
   ======================================================== */

export interface KenoTranslations {
  back: string;
  deposit: string;
  chooseNumbers: (count: number) => string;
  allSelected: string;
  from1to80: string;
  drawing: string;
  bet: string;
  tabGame: string;
  tabHistory: string;
  tabResults: string;
  tabStatistics: string;
  allLabel: string;
  myTicketsLabel: string;
  myBetsLabel: string;
  statusWaiting: string;
  statusLost: string;
  statusWon: (amount: number) => string;
  betAmountLabel: (amount: number) => string;
  // Modal Rules & Fairness
  tabRules: string;
  tabFairness: string;
  maxWinTitle: string;
  kenoDesc1: string;
  kenoDesc2: string;
  howToPlayTitle: string;
  howToPlayDesc: string;
  howToPlayStep1: string;
  howToPlayStep2: string;
  howToPlayStep3: string;
  howToPlayDelete: string;
  hotColdDesc: string;
  paymentsTitle: string;
  paymentsDesc1: string;
  paymentsDesc2: string;
  disconnectionPolicy: string;
  aboutFairnessTitle: string;
  fairnessDesc1: string;
  fairnessDesc2: string;
  hashCodeLabel: string;
  copyLabel: string;
  copiedLabel: string;
  fairnessDesc3: string;
  closeBtn: string;
  // Menu items
  menuTitle: string;
  languageSelectTitle: string;
  liveTicketsMenu: string;
  rulesPaymentsMenu: string;
  fairnessMenu: string;
  quickPick10Menu: string;
  clearAllMenu: string;
  goToBingoMenu: string;
  goToLudoMenu: string;
  walletMenu: (balance: number) => string;
  soundEffectsMenu: string;
  onLabel: string;
  offLabel: string;
  // Results & Statistics
  lastRoundBalls: (round: number) => string;
  notStartedYet: string;
  hotNumbersTitle: string;
  coldNumbersTitle: string;
  noTicketsYet: string;
  roundHits: (round: number, hits: number, spots: number) => string;
  // Win Celebration
  bigWinTitle: string;
  bigWinDesc: (hits: number, spots: number) => string;
  prizeAwarded: string;
  multiplierText: (mult: number) => string;
  claimAndContinue: string;
  insufficientBalance: (curr: number) => string;
  selectAtLeastOne: string;
  numbersCount: (count: number) => string;
  last100Rounds: string;
  sortLabel: string;
  tabLeaderboard: string;
  drawIdLabel: string;
  combinationLabel: string;
  waitLabel: string;
  drawDivider: string;
  fairnessButton: string;
  saltTitle: string;
  saltDesc: string;
  keyTitle: string;
  keyDesc: string;
  keyParams: string[];
  keyExampleDesc: string;
  shaExplanation: string;
  verifyGuideDesc: string;
  skip: string;
}

export const KENO_TRANSLATIONS: Record<Language, KenoTranslations> = {
  am: {
    back: 'መነሻ',
    deposit: 'ብር አስገባ',
    chooseNumbers: (count: number) => `${count} ቁጥሮች ይምረጡ`,
    allSelected: '10 ቁጥሮች ተመርጠዋል',
    from1to80: 'ከ 1 እስከ 80',
    drawing: 'እየወጣ ነው...',
    bet: 'ወራረድ',
    tabGame: 'ጨዋታ',
    tabHistory: 'ታሪክ',
    tabResults: 'ውጤቶች',
    tabStatistics: 'ስታቲስቲክስ',
    allLabel: 'ሁሉም',
    myTicketsLabel: 'የእኔ ትኬቶች',
    myBetsLabel: 'የእኔ ውርርዶች',
    statusWaiting: 'በመጠባበቅ ላይ',
    statusLost: 'ተሸንፏል',
    statusWon: (amount: number) => `አሸንፏል +${amount} ብር`,
    betAmountLabel: (amount: number) => `ውርርድ ${amount}`,
    numbersCount: (count: number) => `${count} ቁጥሮች`,
    insufficientBalance: (curr: number) => `በቂ ቀሪ ሂሳብ የለዎትም! (ያለዎት፦ ${curr} ብር)`,
    selectAtLeastOne: 'እባክዎ ቢያንስ 1 ቁጥር ይምረጡ!',
    // Rules & Fairness
    tabRules: 'ህጎች',
    tabFairness: 'ፍትሃዊነት',
    maxWinTitle: 'ከፍተኛ ድል - 5,000,000 ብር',
    kenoDesc1: 'ኬኖ ተጫዋቾች ከ 1 እስከ 80 ባሉት ቁጥሮች ውስጥ ከ 1 እስከ 10 ቁጥሮችን መርጠው የሚወራረዱበት ጨዋታ ነው።',
    kenoDesc2: 'በእያንዳንዱ ዙር 20 ኳሶች በዘፈቀደ የቁጥር ማመንጫ እጣ ይወጣላቸዋል።',
    howToPlayTitle: 'እንዴት እንደሚጫወቱ',
    howToPlayDesc: 'በአንድ ደቂቃ ውስጥ በሚካሄደው ዙር ውስጥ የሚከተሉትን ያድርጉ፦',
    howToPlayStep1: 'የሚፈልጉትን የቁጥሮች ጥምር ይምረጡ',
    howToPlayStep2: 'የውርርድ መጠን ያስተካክሉ',
    howToPlayStep3: '«ወራረድ» የሚለውን ቁልፍ ይጫኑ',
    howToPlayDelete: 'የተመረጡትን ቁጥሮች በማንኛውም ጊዜ ማጥፋት ይችላሉ።',
    hotColdDesc: 'በሰሌዳው ላይ ቀይ ነጥቦች በብዛት የወጡ ትኩስ ቁጥሮች ሲሆኑ፣ ሰማያዊ ነጥቦች ያልወጡ ቀዝቃዛ ቁጥሮች ናቸው።',
    paymentsTitle: 'የክፍያ ሰንጠረዥ',
    paymentsDesc1: 'ሁሉም አሸናፊ የኳስ ጥምረቶች ከውርርድዎ ጋር የሚባዛ የራሳቸው የዕድል ብዜት አላቸው።',
    paymentsDesc2: 'አሸናፊነት የሚሰላው በተወራረዱት ኳሶች እና በትክክል በተመቱት ኳሶች ብዛት ጥምርታ ነው።',
    disconnectionPolicy: 'የኔትወርክ መቋረጥ ፖሊሲ፦ ውርርድዎ በሰርቨሩ ተቀብሎ በነበረበት ወቅት ግንኙነት ቢቋረጥም ጨዋታው በተለመደው ሁኔታ ይቀጥላል እንዲሁም ማንኛውም አሸናፊነት በውጤቱ መሰረት ይከበራል።',
    aboutFairnessTitle: 'ስለ ጨዋታው ፍትሃዊነት',
    fairnessDesc1: 'ከእያንዳንዱ ዙር መጀመሪያ በፊት ተጫዋቾች የተመሰጠረ ሃሽ ኮድ ይሰጣቸዋል። የዙሩ ውጤት በቅድሚያ የተወሰነ ነው።',
    fairnessDesc2: 'የዙሩ ውጤት በጨዋታው ወቅት ሳይሆን አስቀድሞ ተወስኖ በኮድ መልክ ይሰጣል።',
    hashCodeLabel: 'ሃሽ ኮድ *',
    copyLabel: 'ኮፒ አድርግ',
    copiedLabel: 'ተቀድቷል!',
    fairnessDesc3: 'ከዙሩ ማብቂያ በኋላ ቁልፍ እና ጨው ይሰጣል። ተጫዋቾች ይህንን ኮድ በማመስጠር የዙሩ ውጤት አስቀድሞ መወሰኑን ማረጋገጥ ይችላሉ።',
    closeBtn: 'ዝጋ',
    // Menu
    menuTitle: 'ፈጣን ኬኖ ማውጫ',
    languageSelectTitle: 'ቋንቋ ይምረጡ',
    liveTicketsMenu: 'የተጫዋቾች የቀጥታ ትኬቶች',
    rulesPaymentsMenu: 'የጨዋታ ህጎችና ብዜት',
    fairnessMenu: 'ስለ ጨዋታው ፍትሃዊነት',
    quickPick10Menu: '10 ቁጥሮች በራንደም ምረጥ',
    clearAllMenu: 'ሁሉንም አጽዳ',
    goToBingoMenu: 'ወደ ኢትዮጵያ ቢንጎ ሂድ',
    goToLudoMenu: 'ወደ ሉዶ ማስተር ሂድ',
    walletMenu: (balance: number) => `ዋሌትና ቀሪ ሂሳብ (${balance} ብር)`,
    soundEffectsMenu: 'የጨዋታ ድምፅ',
    onLabel: 'በርቷል',
    offLabel: 'ጠፍቷል',
    // Results & Statistics
    lastRoundBalls: (round: number) => `የመጨረሻው ዙር #${round} (የወጡ 20 ኳሶች)`,
    notStartedYet: 'ገና አልተጀመረም',
    hotNumbersTitle: 'ትኩስ ቁጥሮች',
    coldNumbersTitle: 'ቀዝቃዛ ቁጥሮች',
    noTicketsYet: 'እስካሁን ምንም ትኬት አልተጫወቱም።',
    roundHits: (round: number, hits: number, spots: number) => `ዙር #${round} (${hits}/${spots})`,
    // Win Celebration
    bigWinTitle: 'እንኳን ደስ አለዎት!',
    bigWinDesc: (hits: number, spots: number) => `በዚህ ዙር ${hits}/${spots} ቁጥሮችን በትክክል መተዋል!`,
    prizeAwarded: 'የተሸለሙት ብር',
    multiplierText: (mult: number) => `(${mult}x ብዜት)`,
    last100Rounds: 'የመጨረሻ 100 ዙሮች',
    sortLabel: 'ደርድር',
    tabLeaderboard: 'መሪዎች',
    drawIdLabel: 'ዙር መለያ',
    combinationLabel: 'ጥምረት',
    waitLabel: 'ጠብቅ',
    drawDivider: 'እጣ',
    fairnessButton: 'ፍትሃዊነት',
    saltTitle: 'ጨው ምንድን ነው?',
    saltDesc: 'ጨው የፊደላትና የቁጥሮች የዘፈቀደ ቅደም ተከተል ነው (ለምሳሌ፦ e20d4c76c654)።',
    keyTitle: 'ቁልፍ ምንድን ነው?',
    keyDesc: 'ቁልፍ የአራት መለኪያዎች ጥምረት ጽሑፍ ነው፦',
    keyParams: [
      '1. የዙር መለያ',
      '2. የወጡት ቁጥሮች',
      '3. የጨዋታው ስም "Keno"',
      '4. የዘፈቀደ ፊደላትና ቁጥሮች',
    ],
    keyExampleDesc: 'ጨዋታው ካለቀ በኋላ ተጫዋቹ በታሪኩ ውስጥ ሙሉ ቁልፉን በግልጽ ማየትና ማረጋገጥ ይችላል።',
    shaExplanation: 'ቁልፉን ከጨው ጋር በ SHA512 በማመስጠር አስቀድሞ የተሰጠውን ሃሽ ኮድ ማግኘት ይቻላል።',
    verifyGuideDesc: 'በውጤት ክፍሉ ያለውን የማረጋገጫ ምልክት በመጫን ትክክለኛነቱን መፈተሽ ይችላሉ።',
    skip: 'አሳልፍ',
    claimAndContinue: 'ተቀበል እና ቀጥል',
  },
  en: {
    back: 'Back',
    deposit: 'Deposit',
    chooseNumbers: (count: number) => `Choose ${count} numbers`,
    allSelected: '10 numbers selected',
    from1to80: 'From 1 to 80',
    drawing: 'DRAWING...',
    bet: 'BET',
    tabGame: 'GAME',
    tabHistory: 'HISTORY',
    tabResults: 'RESULTS',
    tabStatistics: 'STATISTICS',
    allLabel: 'All',
    myTicketsLabel: 'My Tickets',
    myBetsLabel: 'My Bets',
    statusWaiting: 'Waiting',
    statusLost: 'Lost',
    statusWon: (amount: number) => `Won +${amount} ETB`,
    betAmountLabel: (amount: number) => `Bet ${amount}`,
    numbersCount: (count: number) => `${count} numbers`,
    insufficientBalance: (curr: number) => `Insufficient balance! (Current: ${curr} ETB)`,
    selectAtLeastOne: 'Please select at least 1 number!',
    // Rules & Fairness
    tabRules: 'RULES',
    tabFairness: 'FAIRNESS',
    maxWinTitle: 'Max Win - 5,000,000 ETB',
    kenoDesc1: 'Keno is a game where the player bets on balls numbered 1-80 by choosing a combination from balls numbered 1 to 10.',
    kenoDesc2: 'During each round, 20 of the balls numbered from 1-80 are drawn in sequence using a random number generator.',
    howToPlayTitle: 'How to play',
    howToPlayDesc: 'To participate in the game, the player must perform the following actions during the round, which lasts one minute:',
    howToPlayStep1: 'Choose the combination of numbers',
    howToPlayStep2: 'Set the amount limit for betting',
    howToPlayStep3: 'Click the "Bet" button',
    howToPlayDelete: 'The player can also delete the combination of already selected numbers.',
    hotColdDesc: 'In the field where the numbers from 1 to 80 are present, HOT and COLD numbers are indicated in red and blue colors, with hot numbers being those that are frequently drawn and blue being those that are drawn more infrequently.',
    paymentsTitle: 'Payments',
    paymentsDesc1: 'All winning ball combinations have corresponding odds, which is multiplied by the player\'s bet amount.',
    paymentsDesc2: 'The winning combination is calculated as the ratio of the number of balls bet to the number of guessed balls.',
    disconnectionPolicy: 'Disconnection policy: If a disconnection occurs after an active game round and your bets were accepted by the server, the game will proceed as normal and any winnings will be processed according to the game result regardless of the disconnection.',
    aboutFairnessTitle: 'ABOUT FAIRNESS',
    fairnessDesc1: 'Before the start of a round, the players are provided with a "Hash Code*" - an encrypted text combination "Key*". Here are the round outcome numbers.',
    fairnessDesc2: 'The outcome of the round is determined not at the moment of the game, but in advance for current round, and is given to the players in coded form.',
    hashCodeLabel: 'Hash (Hash) code *',
    copyLabel: 'Copy',
    copiedLabel: 'Copied!',
    fairnessDesc3: 'After the end of a round, the players are provided with a "Key*" and an additional input parameter for getting the "Hash Code*" - "Salt*" Using them, every player can copy and encrypt this combination to see that the encrypted "Key * " corresponds to the "Hash code *" previously determined by the system. This ensures that the outcome of the game is determined not at the moment of the round, but previously, before playing a round.',
    closeBtn: 'Close',
    // Menu
    menuTitle: 'Fast Keno Menu',
    languageSelectTitle: 'Select Language',
    liveTicketsMenu: 'Live Player Tickets',
    rulesPaymentsMenu: 'Rules & Payments',
    fairnessMenu: 'About Fairness',
    quickPick10Menu: 'Quick Pick 10 Numbers',
    clearAllMenu: 'Clear All Numbers',
    goToBingoMenu: 'Play Ethiopian Bingo',
    goToLudoMenu: 'Play Sun Ludo Master',
    walletMenu: (balance: number) => `Wallet & Balance (${balance} ETB)`,
    soundEffectsMenu: 'Sound Effects',
    onLabel: 'ON',
    offLabel: 'OFF',
    // Results & Statistics
    lastRoundBalls: (round: number) => `Last Round #${round} (20 Drawn Balls)`,
    notStartedYet: 'Not started yet',
    hotNumbersTitle: 'HOT NUMBERS',
    coldNumbersTitle: 'COLD NUMBERS',
    noTicketsYet: 'No tickets played yet.',
    roundHits: (round: number, hits: number, spots: number) => `Round #${round} (${hits}/${spots} Hits)`,
    // Win Celebration
    bigWinTitle: 'CONGRATULATIONS! (BIG WIN)',
    bigWinDesc: (hits: number, spots: number) => `You correctly matched ${hits}/${spots} numbers!`,
    prizeAwarded: 'Amount Won',
    multiplierText: (mult: number) => `(${mult}x Multiplier)`,
    last100Rounds: 'Last 100 rounds',
    sortLabel: 'Sort',
    tabLeaderboard: 'LEADERBOARD',
    drawIdLabel: 'Draw ID',
    combinationLabel: 'Combination',
    waitLabel: 'WAIT',
    drawDivider: 'Draw',
    fairnessButton: 'FAIRNESS',
    saltTitle: 'What is "Salt*"',
    saltDesc: 'What is "Salt*" - it is a random sequence of letters and numbers, For instance: e20d4c76c654.',
    keyTitle: 'What is "Key*"',
    keyDesc: 'What is "Key*" - a text combination of four parameters',
    keyParams: [
      '1. Round Id',
      '2. The outcome numbers',
      '3. Wording "Keno"',
      '4. A random sequence of letters and numbers',
    ],
    keyExampleDesc: 'After the end of a game, the player will see the Key in his betting history as follows: Round ID (for example, 3013185); the outcome numbers (for instance: numbers 1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20); the name of the game - Keno, and a random sequence of letters and numbers - ca50e5af-9fd6-46fc-bafa-5cfa21d2602e, followed by the "Key*", which in this case is - 3013185_numbers_1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20_Keno_ca50e5af-9fd6-46fc-bafa-5cfa21d2602e.',
    shaExplanation: 'If we encrypt the "Key*" via the "Salt*" (for example, 2b4545ed5a) using the SHA512 generator, we\'ll get the defined Hash code. 3586ED7EECC3AEA4A6AC4A359D96E5CF30BBC47E24ED9E030066D7C7DE6C82B1F1376122E35B5165342F27243E1BE5B46B31F2A5D97E6DE26E0E4A6202DF3CDD.',
    verifyGuideDesc: 'To get a hash code you can click on check icon in Result section and perform the check. You can get the encryption "Key*" and "Hash Code*" below or check on any online server that has a generator SHA512 With Salt.',
    skip: 'Skip',
    claimAndContinue: 'Claim & Continue',
  },
  om: {
    back: 'Deebi\'i',
    deposit: 'Birrii Galchi',
    chooseNumbers: (count: number) => `Lakkoofsa ${count} filadhu`,
    allSelected: 'Lakkoofsi 10 filatameera',
    from1to80: '1 hanga 80 irraa',
    drawing: 'Bahaa jira...',
    bet: 'BET',
    tabGame: 'TAPHA',
    tabHistory: 'SEENAA',
    tabResults: 'BU\'AA',
    tabStatistics: 'ISTAATISTIKSI',
    allLabel: 'Hunda',
    myTicketsLabel: 'Tikkeettii Koo',
    myBetsLabel: 'Waliigaltee Koo',
    statusWaiting: 'Eeggachaa jira',
    statusLost: 'Mo\'atameera',
    statusWon: (amount: number) => `Injifate +${amount} ETB`,
    betAmountLabel: (amount: number) => `Waliigaltee ${amount}`,
    numbersCount: (count: number) => `Lakkoofsota ${count}`,
    insufficientBalance: (curr: number) => `Hangi qarshii keessanii hin ga\'u! (${curr} ETB)`,
    selectAtLeastOne: 'Mee yoo xiqqaate lakkoofsa 1 filadhaa!',
    tabRules: 'SEERA',
    tabFairness: 'QULQULLINA',
    maxWinTitle: 'Mo\'ichaa Ol\'aanaa - 5,000,000 ETB',
    kenoDesc1: 'Keenoon tapha lakkoofsa 1-80 keessaa lakkoofsa 1-10 filachuun taphatamudha.',
    kenoDesc2: 'Marsaa hunda keessatti kubbaaleen 20 lakkoofsa 1-80 irraa carraadhaan ba\'u.',
    howToPlayTitle: 'Akkaataa Taphaa',
    howToPlayDesc: 'Tapha keessatti hirmaachuuf daqiiqaa 1 keessatti kanneen armaan gadii raawwadhaa:',
    howToPlayStep1: 'Makaa lakkoofsotaa filadhaa',
    howToPlayStep2: 'Hamma qarshii murteessaa',
    howToPlayStep3: 'Qabduu "BET" tuqaa',
    howToPlayDelete: 'Lakkoofsota filataman yeroo barbaaddanitti haquu dandeessu.',
    hotColdDesc: 'Dirree irratti tuqaan diimaan (🔥) kanneen baay\'inaan ba\'an yoo ta\'an, cuquliisni (❄️) kanneen xiqqaatanidha.',
    paymentsTitle: 'Kaffaltii',
    paymentsDesc1: 'Makaan kubbaa injifatu hundi baay\'ata bu\'aa qaba.',
    paymentsDesc2: 'Bu\'aan lakkoofsota filataman irratti hundaa\'ee shallagama.',
    disconnectionPolicy: 'Tajaajilli interneetii yoo cite taphichi akkuma jirutti itti fufa.',
    aboutFairnessTitle: 'WAA\'EE HAQA QABEESSUMMAA',
    fairnessDesc1: 'Marsaan hundinuu dursamee Hash Code dhaan eegama.',
    fairnessDesc2: 'Bu\'aan taphaa dursee murteeffama.',
    hashCodeLabel: 'Hash (Hash) code *',
    copyLabel: 'Garagalchi',
    copiedLabel: 'Garagalchameera!',
    fairnessDesc3: 'Dhuma irratti Key fi Salt dhaan mirkaneessuun ni danda\'ama.',
    closeBtn: 'Cufi',
    menuTitle: 'Baafata Keenoo',
    languageSelectTitle: 'Afaan Filadhaa',
    liveTicketsMenu: 'Tikkeettii Taphattootaa',
    rulesPaymentsMenu: 'Seera fi Kaffaltii',
    fairnessMenu: 'Haqa Qabeessummaa',
    quickPick10Menu: 'Lakkoofsa 10 Battalatti Filadhu',
    clearAllMenu: 'Hunda Qulqulleessi',
    goToBingoMenu: 'Gara Itoophiyaa Biingootti',
    goToLudoMenu: 'Gara Luudoo Maastariitti',
    walletMenu: (balance: number) => `Waleettii fi Qabeenya (${balance} ETB)`,
    soundEffectsMenu: 'Sagalee Taphaa',
    onLabel: 'Banaa',
    offLabel: 'Cufaa',
    lastRoundBalls: (round: number) => `Marsaa #${round} (Kubbaalee 20)`,
    notStartedYet: 'Ammallee hin jalqabne',
    hotNumbersTitle: 'LAKKOOFSOTA HO\'AA',
    coldNumbersTitle: 'LAKKOOFSOTA QABBANA\'AA',
    noTicketsYet: 'Tikkeettiin ammatti hin jiru.',
    roundHits: (round: number, hits: number, spots: number) => `Marsaa #${round} (${hits}/${spots})`,
    bigWinTitle: 'BAGAA GAMMADDAN!',
    bigWinDesc: (hits: number, spots: number) => `Lakkoofsota ${hits}/${spots} sirriitti rukuttaniittu!`,
    prizeAwarded: 'Birrii Injifatame',
    multiplierText: (mult: number) => `(${mult}x Baay\'ata)`,
    last100Rounds: 'Marsaa 100n darban',
    sortLabel: 'Tartiibsi',
    tabLeaderboard: 'DUR-DEEMTOTA',
    drawIdLabel: 'Eenyummaa Marsaa',
    combinationLabel: 'Makaa Kubbaalee',
    waitLabel: 'EEGI',
    drawDivider: 'Carraa',
    fairnessButton: 'QULQULLINA',
    saltTitle: 'Soogiddi maalidha?',
    saltDesc: 'Soogiddi tartiiba qubeewwanii fi lakkoofsotaa tasaati (fakkeenyaaf: e20d4c76c654).',
    keyTitle: 'Furtuun maalidha?',
    keyDesc: 'Furtuun barreeffama ulaagaalee afurii walitti makamedha:',
    keyParams: [
      '1. Lakkoofsa Marsaa',
      '2. Lakkoofsota bahan',
      '3. Maqaa taphaa "Keno"',
      '4. Tartiiba qubee fi lakkoofsotaa tasaa',
    ],
    keyExampleDesc: 'Taphichi erga xumuramee booda taphataan seenaa isaa keessatti furtuu guutuu ifatti ilaalee mirkaneessuu ni danda\'a.',
    shaExplanation: 'Furtuu soogidda waliin SHA512 dhaan icciiteessuun koodii haashii duraan kenname argachuun ni danda\'ama.',
    verifyGuideDesc: 'Mallattoo mirkaneessaa kutaa bu\'aa keessa jiru tuquun sirrummaa isaa mirkaneessuu dandeessu.',
    skip: 'Darbisi',
    claimAndContinue: 'Fudhadhu & Itti Fufi',
  },
  ti: {
    back: 'ተመለስ',
    deposit: 'ብር ኣእቱ',
    chooseNumbers: (count: number) => `${count} ቍጽርታት ምረጽ`,
    allSelected: '10 ቍጽርታት ተመሪጾም',
    from1to80: 'ካብ 1 ክሳብ 80',
    drawing: 'ይወጽእ ኣሎ...',
    bet: 'ተወራረድ',
    tabGame: 'ጸወታ',
    tabHistory: 'ታሪኽ',
    tabResults: 'ውጽኢት',
    tabStatistics: 'ስታቲስቲክስ',
    allLabel: 'ኩሉ',
    myTicketsLabel: 'ትኬተይ',
    myBetsLabel: 'መወራረድየይ',
    statusWaiting: 'ይጽበ ኣሎ',
    statusLost: 'ተሳዒሩ',
    statusWon: (amount: number) => `ተዓዊቱ +${amount} ብር`,
    betAmountLabel: (amount: number) => `መወራረዲ ${amount}`,
    numbersCount: (count: number) => `${count} ቍጽርታት`,
    insufficientBalance: (curr: number) => `እኹል ቀሪ ሕሳብ የብልኩምን! (${curr} ብር)`,
    selectAtLeastOne: 'በጃኹም እንተወሓደ 1 ቍጽሪ ምረጹ!',
    tabRules: 'ሕግታት',
    tabFairness: 'ትኽክለኛነት',
    maxWinTitle: 'ዝለዓለ ዓወት - 5,000,000 ብር',
    kenoDesc1: 'ኬኖ ካብ 1 ክሳብ 80 ካብ ዘለዉ ቍጽርታት ካብ 1 ክሳብ 10 መሪጽካ ዝውራረድ ጸወታ እዩ።',
    kenoDesc2: 'ኣብ ነፍሲ ወከፍ ዙር 20 ኩዕሶታት ብዕጫ ይወጽኡ።',
    howToPlayTitle: 'ኣገባብ ጸወታ',
    howToPlayDesc: 'ኣብ ውሽጢ ሓደ ደቒቕ ዝካየድ ዙር ነዚኦም ፈጽሙ፦',
    howToPlayStep1: 'ዝደለኹምዎም ቍጽርታት ምረጹ',
    howToPlayStep2: 'መጠን ገንዘብ ኣመዓራርዩ',
    howToPlayStep3: '«ተወራረድ» ዝብል ጠውቑ',
    howToPlayDelete: 'ዝተመርጹ ቍጽርታት ብዝደለኹምዎ ሰዓት ክትድምስስዎም ትኽእሉ ኢኹም።',
    hotColdDesc: 'ቀያሕቲ ነጥብታት ብዙሕ ጊዜ ዝወጹ ክኾኑ ከለዉ፣ ሰማያዊ ነጥብታት ድማ ዝወሓዱ እዮም።',
    paymentsTitle: 'ክፍሊት',
    paymentsDesc1: 'ኩሎም ኣሸነፍቲ ጥምረታት ናይ ባዕሎም ብዜት ኣለዎም።',
    paymentsDesc2: 'ዓወት ብዝተወራረድኩምሎምን ብዝወጹን ቍጽርታት ይሰላዕ።',
    disconnectionPolicy: 'ኔትዎርክ እንተተቛሪጹ እውን ጸወታ ብተለምዶ ይቕጽል ውጽኢቱ እውን ይኽበር።',
    aboutFairnessTitle: 'ብዛዕባ ትኽክለኛነት',
    fairnessDesc1: 'ቅድሚ ምጅማር ዙር ዝተመስጠረ ሃሽ ኮድ ይወሃብ።',
    fairnessDesc2: 'ውጽኢት ዙር ኣቐዲሙ ዝተወሰነ እዩ።',
    hashCodeLabel: 'ሃሽ ኮድ *',
    copyLabel: 'ቅዳሕ',
    copiedLabel: 'ተቐዲሑ!',
    fairnessDesc3: 'ድሕሪ ምዝዛም ዙር ብመፍትሕን ጨውን ምርግጋጽ ይከኣል።',
    closeBtn: 'ዕጾ',
    menuTitle: 'ናይ ኬኖ ማውጫ',
    languageSelectTitle: 'ቋንቋ ምረጹ',
    liveTicketsMenu: 'ትኬታት ተጻወትቲ',
    rulesPaymentsMenu: 'ሕግታትን ክፍሊትን',
    fairnessMenu: 'ብዛዕባ ትኽክለኛነት',
    quickPick10Menu: '10 ቍጽርታት ብራንደም ምረጽ',
    clearAllMenu: 'ኩሉ ኣጽሪ',
    goToBingoMenu: 'ናብ ኢትዮጵያ ቢንጎ ኺድ',
    goToLudoMenu: 'ናብ ሉዶ ማስተር ኺድ',
    walletMenu: (balance: number) => `ዋሌትን ቀሪ ሕሳብን (${balance} ብር)`,
    soundEffectsMenu: 'ድምጺ ጸወታ',
    onLabel: 'ክፉት',
    offLabel: 'ዕጹው',
    lastRoundBalls: (round: number) => `ዝሓለፈ ዙር #${round} (20 ኩዕሶታት)`,
    notStartedYet: 'ገና ኣይተጀመረን',
    hotNumbersTitle: 'ዉዑያት ቍጽርታት',
    coldNumbersTitle: 'ዝሑላት ቍጽርታት',
    noTicketsYet: 'ዝኾነ ትኬት ኣይተጻወቱን።',
    roundHits: (round: number, hits: number, spots: number) => `ዙር #${round} (${hits}/${spots})`,
    bigWinTitle: 'እንቋዕ ሓጎሰኩም!',
    bigWinDesc: (hits: number, spots: number) => `ኣብዚ ዙር ${hits}/${spots} ቍጽርታት ብትኽክል ወቒዕኩም!`,
    prizeAwarded: 'ዝተሸለምኩምዎ ብር',
    multiplierText: (mult: number) => `(${mult}x ብዜት)`,
    last100Rounds: 'ናይ መወዳእታ 100 ዙራት',
    sortLabel: 'ደርድር',
    tabLeaderboard: 'መራሕቲ',
    drawIdLabel: 'ዙር መለለዪ',
    combinationLabel: 'ጥምረት',
    waitLabel: 'ተጸበ',
    drawDivider: 'ዕጫ',
    fairnessButton: 'ትኽክለኛነት',
    saltTitle: 'ጨው እንታይ እዩ?',
    saltDesc: 'ጨው ሃንደበታዊ ቅደም ተኸተል ፊደላትን ቍጽርታትን እዩ (ንኣብነት፦ e20d4c76c654)።',
    keyTitle: 'መፍትሕ እንታይ እዩ?',
    keyDesc: 'መፍትሕ ጥምረት ናይ ኣርባዕተ መለክዒታት ጽሑፍ እዩ፦',
    keyParams: [
      '1. መለለዪ ዙር',
      '2. ዝወጹ ቍጽርታት',
      '3. ስም ጸወታ "Keno"',
      '4. ሃንደበታዊ ፊደላትን ቍጽርታትን',
    ],
    keyExampleDesc: 'ድሕሪ ምዝዛም ጸወታ ተጻዋታይ ኣብ ታሪኹ ምሉእ መፍትሕ ብንጹር ክርእን ከረጋግጽን ይኽእል።',
    shaExplanation: 'መፍትሕ ምስ ጨው ብ SHA512 ብምምስጣር ኣቐዲሙ ዝተዋህበ ሃሽ ኮድ ምርካብ ይከኣል።',
    verifyGuideDesc: 'ኣብ ክፍሊ ውጽኢት ዘሎ ምልክት መረጋገጺ ብምጥዋቕ ትኽክለኛነቱ ክትፍትሹ ትኽእሉ ኢኹም።',
    skip: 'ሕለፎ',
    claimAndContinue: 'ተቐበል እሞ ቀጽል',
  },
};


/* ========================================================
   5. LOGO COMPONENT
   ======================================================== */

interface FastKenoLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const FastKenoLogo: React.FC<FastKenoLogoProps> = ({
  className = '',
  size = 'md',
}) => {
  const fontSizes = {
    sm: { fast: 'text-sm sm:text-base', keno: 'text-base sm:text-lg' },
    md: { fast: 'text-base sm:text-lg', keno: 'text-lg sm:text-xl' },
    lg: { fast: 'text-xl sm:text-2xl', keno: 'text-2xl sm:text-3xl' },
  }[size];

  return (
    <div className={`flex flex-col items-start justify-center select-none leading-none ${className}`}>
      {/* "FAST" in white italic sans-serif bold */}
      <span
        className={`font-black italic tracking-tighter text-white ${fontSizes.fast}`}
        style={{
          fontFamily: 'system-ui, -apple-system, sans-serif',
          textShadow: '0 2px 4px rgba(0,0,0,0.8)',
          letterSpacing: '-0.05em',
        }}
      >
        FAST
      </span>
      {/* "KENO" in bright emerald mint green italic sans-serif bold */}
      <span
        className={`font-black italic tracking-tight text-[#4ade80] ${fontSizes.keno} -mt-0.5`}
        style={{
          fontFamily: 'system-ui, -apple-system, sans-serif',
          textShadow: '0 0 10px rgba(74,222,128,0.6), 0 2px 4px rgba(0,0,0,0.8)',
          letterSpacing: '-0.03em',
        }}
      >
        KENO
      </span>
    </div>
  );
};


/* ========================================================
   6. FAST KENO MAIN COMPONENT
   ======================================================== */
// Canonical Hot and Cold numbers from reference screenshots
const SCREENSHOT_HOT_NUMBERS = [2, 15, 30, 39, 60];
const SCREENSHOT_COLD_NUMBERS = [12, 28, 45, 75, 77];

// Authentic Results Rounds matching IMG_3873_7b1b88c8.jpeg
export interface ResultRound {
  id: string;
  time: string;
  balls: number[];
  isCurrent?: boolean;
}

export const CANONICAL_RESULTS_DRAWS: ResultRound[] = [
  {
    id: '894076452',
    time: '21:35:37',
    balls: [49, 12, 42, 28, 39, 64, 69, 15, 16, 6, 74, 63, 22, 48, 13, 36, 2, 73, 10, 46],
  },
  {
    id: '894076364',
    time: '21:34:08',
    balls: [58, 19, 37, 42, 45, 6, 61, 9, 63, 39, 51, 46, 16, 15, 20, 41, 5, 8, 11, 73],
  },
  {
    id: '894076278',
    time: '21:32:38',
    balls: [77, 34, 5, 6, 73, 3, 7, 36, 60, 51, 26, 79, 38, 80, 43, 63, 8, 62, 1, 35],
  },
  {
    id: '894076184',
    time: '21:31:09',
    balls: [67, 71, 33, 57, 38, 62, 23, 76, 31, 52, 1, 4, 44, 72, 21, 45, 73, 50, 12, 53],
  },
  {
    id: '894076090',
    time: '21:29:40',
    balls: [78, 6, 45, 67, 29, 59, 70, 17, 65, 40, 16, 43, 23, 8, 1, 54, 72, 66, 63, 28],
  },
  {
    id: '894076001',
    time: '21:28:10',
    balls: [49, 33, 18, 1, 38, 80, 29, 44, 7, 77, 3, 15, 63, 73, 67, 34, 60, 28, 61, 72],
  },
  {
    id: '894075916',
    time: '21:26:41',
    balls: [9, 77, 10, 60, 71, 58, 75, 36, 19, 44, 43, 5, 8, 17, 37, 64, 27, 53, 25, 45],
  },
  {
    id: '894075822',
    time: '21:25:12',
    balls: [46, 56, 8, 79, 49, 77, 21, 42, 45, 47, 80, 28, 33, 35, 52, 41, 54, 6, 63, 73],
  },
  {
    id: '894075739',
    time: '21:23:42',
    balls: [44, 53, 41, 7, 54, 34, 62, 2, 61, 5, 27, 8, 16, 69, 51, 63, 70, 4, 71, 33],
  },
];

// Authentic History Tickets matching IMG_3871_d9bbbb5f.jpeg
export interface HistoryItem {
  id: string;
  drawId: string;
  dateStr: string;
  numbers: number[];
  matchedNumbers: number[];
  bet: number;
  payout: number;
  status: 'Won' | 'Lost';
}

export const CANONICAL_HISTORY_ITEMS: HistoryItem[] = [
  {
    id: 'h-1',
    drawId: '378590974',
    dateStr: '07/11/26 19:09:12',
    numbers: [41, 46, 13, 38, 67],
    matchedNumbers: [41, 67],
    bet: 10,
    payout: 10,
    status: 'Won',
  },
  {
    id: 'h-2',
    drawId: '378590974',
    dateStr: '07/11/26 19:09:12',
    numbers: [71, 39, 60, 2, 79],
    matchedNumbers: [60],
    bet: 10,
    payout: 0,
    status: 'Lost',
  },
  {
    id: 'h-3',
    drawId: '378590974',
    dateStr: '07/11/26 19:09:12',
    numbers: [39, 35, 33, 7, 28],
    matchedNumbers: [35, 33, 7],
    bet: 10,
    payout: 30,
    status: 'Won',
  },
  {
    id: 'h-4',
    drawId: '866375932',
    dateStr: '07/11/26 19:08:06',
    numbers: [69, 42, 45, 35, 58],
    matchedNumbers: [69, 42],
    bet: 10,
    payout: 10,
    status: 'Won',
  },
  {
    id: 'h-5',
    drawId: '866375932',
    dateStr: '07/11/26 19:08:06',
    numbers: [5, 13, 9, 43, 56, 62, 80],
    matchedNumbers: [9, 43, 56],
    bet: 10,
    payout: 20,
    status: 'Won',
  },
  {
    id: 'h-6',
    drawId: '679143320',
    dateStr: '07/11/26 19:06:49',
    numbers: [27, 33, 55, 25, 58],
    matchedNumbers: [25, 58],
    bet: 10,
    payout: 10,
    status: 'Won',
  },
];

// Authentic Community Tickets matching IMG_3874_0f196fa0.jpeg & IMG_3867_d8e5209f.jpeg
interface CommunityTicket {
  id: string;
  handle: string;
  numbers: number[];
  bet: number;
  status: 'Waiting' | 'Lost' | 'Won';
  wonAmount?: number;
}

const INITIAL_COMMUNITY_TICKETS: CommunityTicket[] = [
  // Exact tickets visible in video (ScreenRecording_11-07-2026_22-12-57_1)
  { id: 't-vid1', handle: '4***S', numbers: [7, 17, 57, 67], bet: 10000, status: 'Waiting' },
  { id: 't-vid2', handle: '1***S', numbers: [22, 23, 53], bet: 5000, status: 'Waiting' },
  { id: 't-vid3', handle: '1***B', numbers: [1, 2, 3], bet: 4000, status: 'Waiting' },
  { id: 't-vid4', handle: '1***B', numbers: [1, 2, 3], bet: 2000, status: 'Waiting' },
  { id: 't-vid5', handle: '1***B', numbers: [59, 50, 77], bet: 2000, status: 'Waiting' },
  { id: 't-img1', handle: '1***R', numbers: [31, 21, 22], bet: 50, status: 'Waiting' },
  { id: 't-img2', handle: '1***R', numbers: [1, 11, 31], bet: 50, status: 'Waiting' },
  { id: 't-img3', handle: '1***R', numbers: [7, 8, 9], bet: 50, status: 'Waiting' },
  { id: 't-img4', handle: '1***R', numbers: [8, 9, 19], bet: 50, status: 'Waiting' },
  { id: 't-img5', handle: '1***R', numbers: [78, 68, 15], bet: 50, status: 'Waiting' },
  { id: 't1', handle: 'D***a', numbers: [62, 14], bet: 2, status: 'Waiting' },
  { id: 't2', handle: 'አ***ት', numbers: [10, 1, 80], bet: 2, status: 'Waiting' },
  { id: 't3', handle: 'M***k', numbers: [75, 53, 28, 14, 57, 35, 32, 37, 7, 44], bet: 2, status: 'Waiting' },
  { id: 't4', handle: 'K***b', numbers: [43, 53, 33, 75, 13, 27, 4, 19, 23, 28], bet: 2, status: 'Waiting' },
  { id: 't5', handle: 'C***u', numbers: [23, 67, 26, 7], bet: 6, status: 'Lost' },
  { id: 't6', handle: 'T***a', numbers: [38, 29, 20, 59], bet: 2, status: 'Lost' },
  { id: 't7', handle: 'T***a', numbers: [73, 62, 52, 31], bet: 2, status: 'Lost' },
  { id: 't8', handle: 'T***a', numbers: [74, 75, 76, 77, 78], bet: 2, status: 'Lost' },
  { id: 't9', handle: 'D***w', numbers: [11, 22, 33, 44, 55], bet: 10, status: 'Won', wonAmount: 30 },
  { id: 't10', handle: 'B***t', numbers: [7, 14, 21, 35, 70], bet: 5, status: 'Won', wonAmount: 750 },
];

// Exact Payment Matrix Cells matching IMG_3865_763601dc.jpeg
// Row = Hit Count (0 to 10), Col = Spot Count (1 to 10)
const PAYMENT_MATRIX: (number | null)[][] = [
  // Hit 0
  [null, null, null, null, null, null, 1, 1, 2, 2],
  // Hit 1
  [3.5, 1, null, null, null, null, null, null, null, null],
  // Hit 2
  [null, 10, 2, 1.5, 1, null, null, null, null, null],
  // Hit 3
  [null, null, 50, 10, 3, 2, 2, null, null, null],
  // Hit 4
  [null, null, null, 80, 30, 15, 4, 5, 2, null],
  // Hit 5
  [null, null, null, null, 150, 60, 20, 15, 10, 5],
  // Hit 6
  [null, null, null, null, null, 500, 80, 50, 25, 30],
  // Hit 7
  [null, null, null, null, null, null, 1000, 200, 125, 100],
  // Hit 8
  [null, null, null, null, null, null, null, 2000, 1000, 300],
  // Hit 9
  [null, null, null, null, null, null, null, null, 5000, 2000],
  // Hit 10
  [null, null, null, null, null, null, null, null, null, 10000],
];

export const FastKenoScreen: React.FC<FastKenoScreenProps> = ({
  onBackToLudo,
  onOpenBingo,
  onOpenWallet,
  initialBalance = 9980,
  onBalanceChange,
  language: externalLanguage,
  onChangeLanguage,
}) => {
  const [user, setUser] = useState({
    id: 'keno_player_1',
    name: 'Player',
    birrBalance: initialBalance,
    totalMatches: 0,
    totalBirrWon: 0,
    totalWins: 0,
    avatar: '🎯',
  });

  // Keep internal balance in sync if parent initialBalance changes
  useEffect(() => {
    if (initialBalance !== undefined) {
      setUser((prev) => (prev.birrBalance !== initialBalance ? { ...prev, birrBalance: initialBalance } : prev));
    }
  }, [initialBalance]);

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [language, setLanguage] = useState<Language>(externalLanguage || 'am');

  useEffect(() => {
    if (externalLanguage && externalLanguage !== language) {
      setLanguage(externalLanguage);
    }
  }, [externalLanguage, language]);

  const updateUserProfile = (updates: any) => {
    setUser((prev) => {
      const next = { ...prev, ...updates };
      if (updates.birrBalance !== undefined && onBalanceChange) {
        onBalanceChange(updates.birrBalance);
      }
      return next;
    });
  };

  // Dynamic Translations based on current selected language
  const t = KENO_TRANSLATIONS[language] || KENO_TRANSLATIONS.am;

  // Sync keno audio with global sound setting
  useEffect(() => {
    kenoAudio.enabled = soundEnabled;
  }, [soundEnabled]);

  // Player selected numbers (up to 10 max)
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([1]);

  // Stake value (default 2 ETB as shown in reference screenshots)
  const [stake, setStake] = useState<number>(2);

  // Bottom Nav Tab: 'game' | 'history' | 'results' | 'statistics' | 'leaderboard'
  const [activeTab, setActiveTab] = useState<'game' | 'history' | 'results' | 'statistics' | 'leaderboard'>('game');

  // Slide-out Menu
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);

  // Rules & Fairness Modal state
  const [showRulesModal, setShowRulesModal] = useState<boolean>(false);
  const [rulesActiveTab, setRulesActiveTab] = useState<'rules' | 'fairness'>('rules');

  // Live 60-second Countdown Timer (counts down from 60 to 0 then auto-starts round)
  const [countdownSeconds, setCountdownSeconds] = useState<number>(60);
  const [hasActiveBet, setHasActiveBet] = useState<boolean>(false);
  const [activeUserTicketId, setActiveUserTicketId] = useState<string | null>(null);
  
  // Multi-ticket betting: allows a player to place multiple tickets for the same upcoming draw
  const [userActiveTickets, setUserActiveTickets] = useState<{
    id: string;
    ticketIndex: number;
    numbers: number[];
    stake: number;
    timestamp: number;
  }[]>([]);
  const userActiveTicketsRef = useRef<typeof userActiveTickets>([]);
  userActiveTicketsRef.current = userActiveTickets;

  const [isBallPopping, setIsBallPopping] = useState<boolean>(false);
  const [currentHitsCount, setCurrentHitsCount] = useState<number>(0);
  const [isBetAccepted, setIsBetAccepted] = useState<boolean>(false);
  const [roundWonPayout, setRoundWonPayout] = useState<number>(0);

  // Draw State
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [drawnBalls, setDrawnBalls] = useState<number[]>([]);
  const [currentRevealedIndex, setCurrentRevealedIndex] = useState<number>(-1);
  const [roundNumber, setRoundNumber] = useState<number>(() => 127161519);
  const currentDrawId = roundNumber.toString().slice(0, 9);
  const [lastRoundResult, setLastRoundResult] = useState<KenoRoundResult | null>(null);

  // Provably Fair Hash for current round
  const [currentRoundHash] = useState<string>(
    '3586ED7EECC3AEA4A6AC4A359D96E5CF30BBC47E24ED9E030066D7C7DE6C82B1F1376122E35B5165342F27243E1BE5B46B31F2A5D97E6DE26E0E4A6202DF3CDD'
  );
  const [copiedHash, setCopiedHash] = useState<boolean>(false);

  // Stats & History
  const [stats, setStats] = useState<KenoStats>(() => getInitialKenoStats());
  const [history, setHistory] = useState<KenoRoundResult[]>(() => getInitialKenoHistory());
  const [communityTickets, setCommunityTickets] = useState<CommunityTicket[]>(INITIAL_COMMUNITY_TICKETS);

  // Canonical Results Draws (matching IMG_3873_7b1b88c8.jpeg)
  const [resultsDraws, setResultsDraws] = useState<ResultRound[]>(() => CANONICAL_RESULTS_DRAWS);

  // Canonical History Tickets (matching IMG_3871_d9bbbb5f.jpeg)
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>(() => CANONICAL_HISTORY_ITEMS);

  // Win Celebration modal
  const [showWinModal, setShowWinModal] = useState<KenoRoundResult | null>(null);

  const drawIntervalRef = useRef<any>(null);
  const resetTimeoutRef = useRef<any>(null);
  const cardsCarouselRef = useRef<HTMLDivElement>(null);

  // Synchronized refs for interval access
  const isDrawingRef = useRef(false);
  isDrawingRef.current = isDrawing;

  const hasActiveBetRef = useRef(hasActiveBet);
  hasActiveBetRef.current = hasActiveBet;

  const activeUserTicketIdRef = useRef(activeUserTicketId);
  activeUserTicketIdRef.current = activeUserTicketId;

  const selectedNumbersRef = useRef(selectedNumbers);
  selectedNumbersRef.current = selectedNumbers;

  const stakeRef = useRef(stake);
  stakeRef.current = stake;

  // Active user tickets count & total bets in current session
  const [myTicketsCount, setMyTicketsCount] = useState<number>(0);
  const [myBetsTotal, setMyBetsTotal] = useState<number>(0);

  // Statistics Sort Toggle (false = natural 1..80 per IMG_3869, true = descending frequency per IMG_3870)
  const [isStatsSorted, setIsStatsSorted] = useState<boolean>(false);

  // In-Game Toast notification banner
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  // Memoized 80-item statistics list matching IMG_3869 & IMG_3870
  const statsItems = useMemo(() => {
    const items = Array.from({ length: 80 }, (_, i) => {
      const num = i + 1;
      const count = stats.ballFrequency[num] ?? 24;
      return { num, count };
    });

    if (isStatsSorted) {
      // Descending by frequency count, secondary by ball number
      items.sort((a, b) => {
        if (b.count !== a.count) {
          return b.count - a.count;
        }
        return a.num - b.num;
      });
    } else {
      // Natural ball number order 1..80
      items.sort((a, b) => a.num - b.num);
    }

    return items;
  }, [stats.ballFrequency, isStatsSorted]);

  // Grouped history tickets by Draw ID matching IMG_3871_d9bbbb5f.jpeg
  const groupedHistory = useMemo(() => {
    const groups: { drawId: string; dateStr: string; items: HistoryItem[] }[] = [];
    historyItems.forEach((item) => {
      let grp = groups.find((g) => g.drawId === item.drawId);
      if (!grp) {
        grp = { drawId: item.drawId, dateStr: item.dateStr, items: [] };
        groups.push(grp);
      }
      grp.items.push(item);
    });
    return groups;
  }, [historyItems]);

  // Fast-forward / Skip draw animation
  const handleSkipDraw = () => {
    if (!isDrawing) return;
    if (drawIntervalRef.current) clearInterval(drawIntervalRef.current);
    setCurrentRevealedIndex(20);
    finalizeBet(drawnBalls);
  };

  // Video matching: Balls placed in Row 2 (bottom row: balls 1 to 10)
  const row2Balls = useMemo(() => {
    if (currentRevealedIndex < 1) return [];
    // At index 1..9, balls 0..(currentRevealedIndex-1) have moved into bottom row
    // At index >= 10, all 10 balls (0..9) are in bottom row
    return drawnBalls.slice(0, Math.min(10, currentRevealedIndex));
  }, [drawnBalls, currentRevealedIndex]);

  // Video matching: Balls placed in Row 1 (top row: balls 11 to 20)
  const row1Balls = useMemo(() => {
    if (currentRevealedIndex < 11) return [];
    // At index 11..19, balls 10..(currentRevealedIndex-1) have moved into top row
    // At index >= 20, all 10 balls (10..19) are in top row
    return drawnBalls.slice(10, Math.min(20, currentRevealedIndex));
  }, [drawnBalls, currentRevealedIndex]);

  // Ball currently in center circle (null when index === 20 or < 0, exactly as in video Frame 00:11-00:15)
  const activeCenterBall = useMemo(() => {
    if (currentRevealedIndex >= 0 && currentRevealedIndex < 20) {
      return drawnBalls[currentRevealedIndex];
    }
    return null;
  }, [drawnBalls, currentRevealedIndex]);

  // Counter number displayed at top right: 01..20
  const drawCounterNumber = useMemo(() => {
    if (currentRevealedIndex < 0) return 0;
    return Math.min(20, currentRevealedIndex + 1);
  }, [currentRevealedIndex]);

  const [isAdminPaused, setIsAdminPaused] = useState(false);
  const lastKenoResetTokenRef = useRef(0);

  useEffect(() => {
    let active = true;
    const syncKenoAdmin = async () => {
      try {
        const res = await fetch('/api/keno/admin/state');
        const data = await res.json();
        if (!active || !data?.ok) return;
        setIsAdminPaused(Boolean(data.isPaused));
        if (typeof data.resetToken === 'number' && data.resetToken !== lastKenoResetTokenRef.current) {
          if (lastKenoResetTokenRef.current !== 0) {
            setCountdownSeconds(Number(data.defaultCountdownSec || 60));
            setIsDrawing(false);
            showToast('🔄 አድሚን አዲስ የኬኖ ዙር ጀምሯል!');
          }
          lastKenoResetTokenRef.current = data.resetToken;
        }
      } catch {}
    };
    syncKenoAdmin();
    const tmr = window.setInterval(syncKenoAdmin, 4000);
    return () => {
      active = false;
      window.clearInterval(tmr);
    };
  }, []);

  // 60-SECOND COUNTDOWN TICKER: Counts down from 60s to 0s then AUTO-STARTS the draw!
  useEffect(() => {
    if (isDrawing || isAdminPaused) return;

    const timer = setInterval(() => {
      setCountdownSeconds((prev) => {
        if (prev <= 1) {
          // Timer reached 0: Automatically start the game/draw!
          setTimeout(() => {
            if (!isDrawingRef.current) {
              startAuthenticKenoDraw();
            }
          }, 50);
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isDrawing, isAdminPaused]);

  // Format digital countdown string "01:00" -> "00:59" -> "00:00"
  const formattedCountdown = useMemo(() => {
    const mins = Math.floor(countdownSeconds / 60);
    const secs = countdownSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, [countdownSeconds]);

  // Toggle number pick (up to 10 max)
  const toggleNumber = (num: number) => {
    if (isDrawing) return;

    if (selectedNumbers.includes(num)) {
      kenoAudio.playDeselect();
      setSelectedNumbers((prev) => prev.filter((n) => n !== num));
    } else {
      if (selectedNumbers.length >= 10) {
        kenoAudio.playDeselect();
        return;
      }
      kenoAudio.playSelect();
      setSelectedNumbers((prev) => [...prev, num].sort((a, b) => a - b));
    }
  };

  // Quick Pick 10 numbers
  const handleQuickPick10 = () => {
    if (isDrawing) return;
    kenoAudio.playShuffle();
    const pool = Array.from({ length: 80 }, (_, i) => i + 1);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    setSelectedNumbers(pool.slice(0, 10).sort((a, b) => a - b));
  };

  // Clear selection
  const handleClear = () => {
    if (isDrawing) return;
    kenoAudio.playDeselect();
    setSelectedNumbers([]);
  };

  // Stepper handlers
  const handleDecreaseStake = () => {
    setStake((prev) => Math.max(1, prev - 1));
  };

  const handleIncreaseStake = () => {
    setStake((prev) => prev + 1);
  };

  const handleMultiplyStake = (factor: number) => {
    setStake((prev) => Math.max(1, prev * factor));
  };

  const handleMaxStake = () => {
    const maxAffordable = Math.min(1000, Math.max(10, Math.floor(user.birrBalance)));
    setStake(maxAffordable);
  };

  // Real Authentic Keno Draw Engine (20 balls out of 80, drawn one by one at 1s cadence)
  const startAuthenticKenoDraw = () => {
    if (isDrawingRef.current) return;

    if (resetTimeoutRef.current) {
      clearTimeout(resetTimeoutRef.current);
    }
    if (drawIntervalRef.current) {
      clearInterval(drawIntervalRef.current);
    }

    setIsDrawing(true);
    isDrawingRef.current = true;
    setCurrentRevealedIndex(-1);
    setCurrentHitsCount(0);

    // Generate 20 unique random balls from 1 to 80
    const fullDraw = generateKenoDraw();
    setDrawnBalls(fullDraw);

    // Distinct numbers picked across all active user tickets
    const activeTickets = userActiveTicketsRef.current;
    const allUserPicks = Array.from(new Set(activeTickets.flatMap((t) => t.numbers)));

    let idx = 0;
    // Exactly 1000ms cadence matching the video (1 second per ball)
    drawIntervalRef.current = setInterval(() => {
      setCurrentRevealedIndex(idx);
      const ball = fullDraw[idx];
      const isHit = allUserPicks.includes(ball);
      const isSuperBall = idx === 19;

      // Trigger ball pop scale bounce
      setIsBallPopping(true);
      setTimeout(() => setIsBallPopping(false), 240);

      // Real-time hits tracking across user picks
      const hitsSoFar = allUserPicks.filter((n) =>
        fullDraw.slice(0, idx + 1).includes(n)
      ).length;
      setCurrentHitsCount(hitsSoFar);

      // Authentic Keno sound effects
      if (isSuperBall) {
        kenoAudio.playSuperBall();
      } else if (isHit) {
        kenoAudio.playHitMatch(hitsSoFar);
      } else {
        kenoAudio.playBallPop(idx);
      }

      idx++;
      if (idx >= 20) {
        clearInterval(drawIntervalRef.current);
        // After 20th ball is revealed in center, wait 1000ms for it to move into Row 1 slot 10 and empty center!
        setTimeout(() => {
          setCurrentRevealedIndex(20);
          finalizeBet(fullDraw);
        }, 1000);
      }
    }, 1000);
  };

  // Place Bet: allows placing multiple independent tickets for the upcoming draw round!
  const handlePlaceBet = () => {
    if (isDrawing) return;

    if (selectedNumbers.length === 0) {
      showToast(t.selectAtLeastOne);
      return;
    }

    if (stake > user.birrBalance) {
      showToast(t.insufficientBalance(user.birrBalance));
      if (onOpenWallet) onOpenWallet();
      return;
    }

    // Deduct stake from player balance
    updateUserProfile({
      birrBalance: user.birrBalance - stake,
      totalMatches: user.totalMatches + 1,
    });

    const ticketIdx = userActiveTickets.length + 1;
    const myTicketId = `my-${Date.now()}-${ticketIdx}`;
    const newTicket = {
      id: myTicketId,
      ticketIndex: ticketIdx,
      numbers: [...selectedNumbers],
      stake: stake,
      timestamp: Date.now(),
    };

    setUserActiveTickets((prev) => [...prev, newTicket]);
    setMyTicketsCount((prev) => prev + 1);
    setMyBetsTotal((prev) => prev + stake);
    setHasActiveBet(true);
    setActiveUserTicketId(myTicketId);

    setIsBetAccepted(true);
    setTimeout(() => {
      setIsBetAccepted(false);
    }, 1400);

    // Add user's ticket with video format: "1 My Ticket", "2 My Ticket", etc.
    const myNewTicket: CommunityTicket = {
      id: myTicketId,
      handle: `${ticketIdx} My Ticket`,
      numbers: [...selectedNumbers],
      bet: stake,
      status: 'Waiting',
    };
    setCommunityTickets((prev) => [myNewTicket, ...prev]);

    // Clear board so the player can immediately pick a separate set of numbers!
    setSelectedNumbers([]);
    kenoAudio.playSelect();

    // Auto-slide to the new draft card matching IMG_3879 and video
    setTimeout(() => {
      if (cardsCarouselRef.current) {
        cardsCarouselRef.current.scrollTo({
          left: cardsCarouselRef.current.scrollWidth,
          behavior: 'smooth',
        });
      }
    }, 100);

    showToast(
      language === 'am'
        ? `ቲኬት #${ticketIdx} ተይዟል! (${newTicket.numbers.length} ቁጥር • ${stake} ETB)`
        : `Ticket #${ticketIdx} placed! (${newTicket.numbers.length} picks • ${stake} ETB)`
    );

    // NOTE: Keep countdown running uninterrupted until 00:00 per user requirement:
    // "ጨዋታው 60 ሰከንዱ ካለቀ እንዲጀምር"
  };

  // Finalize bet calculation for all placed user tickets and schedule transition back
  const finalizeBet = (drawn20: number[]) => {
    const activeTickets = userActiveTicketsRef.current;
    const superBall = drawn20[19];

    let totalUserPayout = 0;
    let winningTicketsCount = 0;
    const newHistoryItems: HistoryItem[] = [];

    // Evaluate each of user's active tickets!
    activeTickets.forEach((ticket) => {
      const hits = ticket.numbers.filter((n) => drawn20.includes(n));
      const isSuperBallHit = ticket.numbers.includes(superBall);
      const baseMult = calculateKenoMultiplier(ticket.numbers.length, hits.length);
      const superMult = isSuperBallHit && baseMult > 0 ? 2.0 : 1.0;
      const totalMult = baseMult * superMult;
      const payout = Math.round(ticket.stake * totalMult);

      if (payout > 0) {
        totalUserPayout += payout;
        winningTicketsCount++;
      }

      newHistoryItems.push({
        id: `h-${Date.now()}-${ticket.id}`,
        drawId: roundNumber.toString(),
        dateStr: new Date().toLocaleDateString('en-GB') + ' ' + new Date().toLocaleTimeString('en-GB'),
        numbers: [...ticket.numbers],
        matchedNumbers: hits,
        bet: ticket.stake,
        payout: payout,
        status: payout > 0 ? 'Won' : 'Lost',
      });
    });

    // Append to Results Draws table (matching IMG_3873)
    const newDrawResult: ResultRound = {
      id: roundNumber.toString(),
      time: new Date().toLocaleTimeString('en-GB'),
      balls: drawn20,
    };
    setResultsDraws((prev) => [
      newDrawResult,
      ...prev.filter((rd) => rd.balls && rd.balls.length > 0),
    ]);

    // Append new user history items
    if (newHistoryItems.length > 0) {
      setHistoryItems((prev) => [...newHistoryItems, ...prev]);
    }

    // Update community tickets statuses
    setCommunityTickets((prev) =>
      prev.map((tk) => {
        const userTicket = activeTickets.find((ut) => ut.id === tk.id);
        if (userTicket) {
          const hits = userTicket.numbers.filter((n) => drawn20.includes(n));
          const isSuperBallHit = userTicket.numbers.includes(superBall);
          const baseMult = calculateKenoMultiplier(userTicket.numbers.length, hits.length);
          const superMult = isSuperBallHit && baseMult > 0 ? 2.0 : 1.0;
          const payout = Math.round(userTicket.stake * baseMult * superMult);
          return {
            ...tk,
            status: payout > 0 ? 'Won' : 'Lost',
            wonAmount: payout > 0 ? payout : undefined,
          };
        }
        if (tk.status === 'Waiting') {
          const tHits = tk.numbers.filter((num) => drawn20.includes(num));
          const tMult = calculateKenoMultiplier(tk.numbers.length, tHits.length);
          const tWon = tMult > 0;
          return {
            ...tk,
            status: tWon ? 'Won' : 'Lost',
            wonAmount: tWon ? Math.round(tk.bet * tMult) : undefined,
          };
        }
        return tk;
      })
    );

    // Update Stats
    const updatedFreq = { ...stats.ballFrequency };
    drawn20.forEach((b) => {
      updatedFreq[b] = (updatedFreq[b] || 0) + 1;
    });

    const totalWageredThisRound = activeTickets.reduce((acc, tk) => acc + tk.stake, 0);
    const newStats: KenoStats = {
      totalRoundsPlayed: stats.totalRoundsPlayed + 1,
      totalBirrWagered: stats.totalBirrWagered + totalWageredThisRound,
      totalBirrWon: stats.totalBirrWon + totalUserPayout,
      biggestWin: Math.max(stats.biggestWin, totalUserPayout),
      ballFrequency: updatedFreq,
    };
    setStats(newStats);
    saveKenoStats(newStats);

    // Record won payout for "YOU WIN" display in center circle (Frame 00:41 to 00:45)
    setRoundWonPayout(totalUserPayout);

    // Credit winnings to player
    if (totalUserPayout > 0) {
      updateUserProfile({
        birrBalance: user.birrBalance + totalUserPayout,
        totalBirrWon: user.totalBirrWon + totalUserPayout,
        totalWins: user.totalWins + winningTicketsCount,
      });

      if (totalUserPayout >= 100) {
        kenoAudio.playBigWin();
        fireConfetti(); // confetti({ particleCount: 140, spread: 85, origin: { y: 0.55 } });
      } else {
        kenoAudio.playCashRegister();
      }

      showToast(
        language === 'am'
          ? `እንኳን ደስ አለዎት! ${winningTicketsCount} ቲኬት አሸንፏል (+${totalUserPayout} ETB)`
          : `Congratulations! ${winningTicketsCount} ticket(s) won (+${totalUserPayout} ETB)`
      );
    }

    setRoundNumber((prev) => prev + 1);

    // Hold completed 20-ball draw display for 5.0 seconds (matching video)
    // then return to the 80-board and start the fresh 60-second countdown for next round!
    resetTimeoutRef.current = setTimeout(() => {
      setIsDrawing(false);
      isDrawingRef.current = false;
      setUserActiveTickets([]);
      userActiveTicketsRef.current = [];
      setHasActiveBet(false);
      setActiveUserTicketId(null);
      setMyTicketsCount(0);
      setMyBetsTotal(0);
      setSelectedNumbers([]);
      setCountdownSeconds(60);
      setCurrentRevealedIndex(-1);
      setCurrentHitsCount(0);
      setRoundWonPayout(0);
    }, 5000);
  };

  // Currently revealed drawn balls set
  const revealedDrawnSet = useMemo(() => {
    return new Set(drawnBalls.slice(0, currentRevealedIndex + 1));
  }, [drawnBalls, currentRevealedIndex]);

  // All numbers picked across all active user tickets
  const allUserPickedNumbers = useMemo(() => {
    return Array.from(new Set(userActiveTickets.flatMap((t) => t.numbers)));
  }, [userActiveTickets]);

  const copyHashToClipboard = () => {
    navigator.clipboard?.writeText(currentRoundHash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  return (
    <div className="w-full min-h-screen bg-[#0d1117] text-[#e6edf3] flex items-center justify-center p-0 select-none antialiased">
      {/* Mobile Screen Shell strictly matching IMG_3867_d8e5209f.jpeg (Smooth Unified Vertical Scroll) */}
      <div id="keno-scroll-container" className="w-full max-w-[420px] min-h-screen bg-[#11161d] text-slate-100 flex flex-col relative shadow-[0_0_90px_rgba(0,0,0,0.95)] border-x border-[#1c232d] overflow-y-auto">
        
        {/* ========================================================
            1. STICKY TOP HEADER BAR (Stays locked at top while scrolling)
            Matching IMG_3867_d8e5209f.jpeg exactly!
            ======================================================== */}
        <div className="sticky top-0 z-30 bg-[#11161d]/95 backdrop-blur-md px-3 pt-2 pb-1.5 border-b border-[#1c232d]/90 shadow-md">
          {/* Row 1: [< Back] on left, [Deposit] on right */}
          <div className="w-full flex items-center justify-between pb-1.5">
            <button
              type="button"
              onClick={() => (onBackToLudo ? onBackToLudo() : setIsMenuOpen(true))}
              className="flex items-center gap-1 px-3 py-1 rounded-xl bg-[#1c2430] hover:bg-[#253040] border border-[#2d3748] text-amber-400 text-xs font-extrabold transition active:scale-95 cursor-pointer shadow-sm"
              title={t.back}
            >
              <ChevronLeft className="w-4 h-4" />
              <span>🏠 {t.back}</span>
            </button>

            <button
              type="button"
              onClick={() => (onOpenWallet ? onOpenWallet() : showToast(t.walletMenu(user.birrBalance)))}
              className="px-3.5 py-1 rounded-xl bg-[#22c55e] hover:bg-[#16a34a] text-slate-950 font-black text-xs shadow-md transition active:scale-95 cursor-pointer"
            >
              {t.deposit}
            </button>
          </div>

          {/* Row 2: [FAST KENO] Logo | [ 🪙 0 ETB | ID: 127161519 (✓) ] | [ ☰ ] */}
          <div className="w-full flex items-center justify-between pt-0.5">
            {/* FAST KENO Two-tone Logo */}
            <div className="cursor-pointer" onClick={() => setIsMenuOpen(true)}>
              <FastKenoLogo size="sm" />
            </div>

            {/* Center Pill: [ 🪙 {balance} ETB | ID: {roundNumber} ✓ ] */}
            <div className="flex items-center rounded-full bg-[#161c24] border border-[#2d3748] px-2.5 py-1 text-xs shadow-sm">
              <button
                type="button"
                onClick={() => (onOpenWallet ? onOpenWallet() : showToast(t.walletMenu(user.birrBalance)))}
                className="flex items-center gap-1 pr-2 border-r border-[#2d3748] hover:text-[#4ade80] transition cursor-pointer"
                title={t.walletMenu(user.birrBalance)}
              >
                <span className="w-2.5 h-2.5 rounded-full border border-amber-400 bg-amber-500/30 text-amber-300 flex items-center justify-center text-[7px] font-bold">
                  O
                </span>
                <span className="font-mono font-bold text-white text-[11px]">
                  {user.birrBalance}
                </span>
                <span className="text-[10px] text-slate-400 font-semibold">ETB</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setRulesActiveTab('fairness');
                  setShowRulesModal(true);
                }}
                className="flex items-center gap-1 pl-2 text-[11px] text-slate-300 font-mono hover:text-[#4ade80] transition cursor-pointer"
                title={t.tabFairness}
              >
                <span className="text-slate-400">ID:</span>
                <span className="font-bold text-white">{roundNumber.toString().slice(0, 9)}</span>
                <div className="w-3.5 h-3.5 rounded-full bg-[#22c55e]/20 border border-[#22c55e] flex items-center justify-center text-[#22c55e] text-[9px] font-black">
                  ✓
                </div>
              </button>
            </div>

            {/* Hamburger Menu (3 Green Lines) */}
            <button
              type="button"
              onClick={() => setIsMenuOpen(true)}
              className="p-1 rounded-lg text-[#4ade80] hover:text-white transition cursor-pointer"
              aria-label="Menu"
            >
              <Menu className="w-6 h-6 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* IN-GAME TOAST BANNER */}
        {toastMessage && (
          <div className="sticky top-14 z-40 px-3 py-1 pointer-events-none animate-in fade-in slide-in-from-top-2">
            <div className="w-full bg-[#16202c] border border-[#22c55e] text-[#a7f3d0] text-xs font-bold px-3 py-2 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.8)] flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#4ade80] shrink-0" />
              <span className="text-center">{toastMessage}</span>
            </div>
          </div>
        )}

        {/* ========================================================
            2. SCROLLABLE MAIN CONTENT (Smoothly scrolls up and down)
            ======================================================== */}
        <div className="px-3 pt-1 pb-4 flex flex-col">

          {/* TAB 1: GAME VIEW (Live Draw Arena when drawing, or Board + Controls when betting) */}
          {activeTab === 'game' ? (
            isDrawing ? (
            <div className="w-full relative my-1 pt-2 pb-3 px-2 sm:px-3 rounded-3xl bg-gradient-to-b from-[#091118] via-[#060b11] to-[#04080c] border border-[#1b2b3b] shadow-[0_12px_40px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col items-center justify-center animate-in fade-in duration-200">
              
              {/* TOP STATUS BAR: ONLY 09 / 20 COUNTER (Top Right, matching video Frame 00:00 to 00:15) */}
              <div className="w-full flex items-center justify-end mb-1 px-1 relative z-20">
                <div className="font-mono font-bold text-sm sm:text-base tracking-widest flex items-center gap-1 drop-shadow-[0_0_8px_rgba(74,222,128,0.5)]">
                  <span className="text-white">
                    {String(drawCounterNumber).padStart(2, '0')}
                  </span>
                  <span className="text-[#22c55e] font-black">/</span>
                  <span className="text-white">20</span>
                </div>
              </div>

              {/* ROTATING CONCENTRIC RADAR RINGS BACKGROUND & CENTER 3D BALL (Video & IMG_3874) */}
              <div className="relative w-56 h-36 sm:w-64 sm:h-40 flex items-center justify-center my-0.5">
                {/* Crosshairs lines with subtle green radar presence */}
                <div className="absolute w-full h-[1px] bg-gradient-to-r from-transparent via-[#22c55e]/25 to-transparent pointer-events-none" />
                <div className="absolute h-full w-[1px] bg-gradient-to-b from-transparent via-[#22c55e]/25 to-transparent pointer-events-none" />

                {/* Rotating radar beam sweep (8s loop) */}
                <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,transparent_0_300deg,rgba(34,197,94,0.18)_360deg)] animate-spin [animation-duration:8s] pointer-events-none" />

                {/* Concentric radar circle tracks */}
                <div className="absolute w-52 h-34 sm:w-60 sm:h-38 rounded-full border border-teal-500/25 pointer-events-none" />
                <div className="absolute w-42 h-28 sm:w-48 sm:h-32 rounded-full border border-dashed border-teal-400/25 pointer-events-none" />
                <div className="absolute w-30 h-20 sm:w-36 sm:h-24 rounded-full border border-emerald-500/35 pointer-events-none" />
                <div className="absolute w-20 h-14 sm:w-24 sm:h-16 rounded-full border border-teal-400/40 pointer-events-none" />

                {/* Soft center ambient emerald glow */}
                <div className="absolute w-36 h-24 rounded-full bg-emerald-500/20 blur-2xl pointer-events-none" />

                {/* CENTER CIRCLE: 3D Sphere when drawing, or "YOU WIN [Amount]" when 20 balls finish (Frame 00:41 to 00:45) */}
                {activeCenterBall !== null ? (
                  <div
                    className={`relative z-10 w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center transition-all duration-200 select-none ${
                      isBallPopping ? 'scale-115' : 'scale-100'
                    } ${
                      allUserPickedNumbers.includes(activeCenterBall) || selectedNumbers.includes(activeCenterBall)
                        ? 'bg-[radial-gradient(circle_at_35%_25%,#86efac_0%,#22c55e_45%,#15803d_80%,#052e16_100%)] border-2 border-[#bbf7d0] shadow-[0_0_35px_rgba(34,197,94,0.95),inset_0_2px_4px_rgba(255,255,255,0.7)] text-slate-950 font-black'
                        : 'bg-[radial-gradient(circle_at_35%_25%,#486377_0%,#1e2e3d_45%,#0c151e_85%,#04090e_100%)] border border-teal-500/40 shadow-[0_8px_25px_rgba(0,0,0,0.9),0_0_20px_rgba(20,184,166,0.35),inset_0_2px_4px_rgba(255,255,255,0.45),inset_0_-4px_8px_rgba(0,0,0,0.85)] text-white font-black'
                    }`}
                  >
                    {/* Curved 3D Glassy reflection highlight matching video */}
                    <div className="absolute top-2 left-3 w-5 h-2.5 rounded-full bg-gradient-to-b from-white/70 via-white/20 to-transparent blur-[0.6px] -rotate-25 pointer-events-none" />
                    
                    {/* Center Ball Number */}
                    <span className="font-mono text-2xl sm:text-3xl font-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]">
                      {activeCenterBall}
                    </span>
                  </div>
                ) : currentRevealedIndex >= 20 && roundWonPayout > 0 ? (
                  /* YOU WIN Announcement in Center of Radar (Frame 00:41 to 00:45) */
                  <div className="relative z-10 flex flex-col items-center justify-center animate-in zoom-in-90 duration-300 select-none text-center">
                    <span className="text-xs sm:text-sm font-black tracking-widest text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] uppercase">
                      YOU WIN
                    </span>
                    <span className="font-mono text-3xl sm:text-4xl font-black text-[#22c55e] drop-shadow-[0_0_16px_rgba(34,197,94,0.95)]">
                      {roundWonPayout}
                    </span>
                  </div>
                ) : (
                  /* Empty radar center circle when round finishes without win or before draw */
                  <div className="relative z-10 w-16 h-16 sm:w-20 sm:h-20 rounded-full border border-teal-500/20 bg-transparent" />
                )}
              </div>

              {/* DRAWN BALLS: Balls 1..10 in Bottom Row, Balls 11..20 in Top Row (Video & IMG_3874) */}
              <div className="w-full flex flex-col gap-1.5 sm:gap-2 px-1 my-2 z-10 max-w-[390px] mx-auto">
                {/* Row 1 (Top row): Balls 11 to 20 (Visible when ball 11 starts) */}
                {currentRevealedIndex >= 10 && (
                  <div className="grid grid-cols-10 gap-1 sm:gap-1.5 w-full animate-in fade-in duration-300">
                    {Array.from({ length: 10 }).map((_, slotIdx) => {
                      const ballNum = row1Balls[slotIdx];
                      const isHit = ballNum !== undefined && (allUserPickedNumbers.includes(ballNum) || selectedNumbers.includes(ballNum));
                      return (
                        <div
                          key={`row1-${slotIdx}`}
                          className={`aspect-square rounded-full flex items-center justify-center font-mono font-bold text-xs sm:text-sm transition-all duration-200 relative overflow-hidden select-none ${
                            ballNum !== undefined
                              ? isHit
                                ? 'bg-[radial-gradient(circle_at_35%_25%,#86efac_0%,#22c55e_50%,#15803d_85%,#052e16_100%)] border border-[#bbf7d0] shadow-[0_0_12px_rgba(34,197,94,0.95),inset_0_1px_3px_rgba(255,255,255,0.7)] text-slate-950 font-black scale-105 ring-1 ring-white/80'
                                : 'bg-[radial-gradient(circle_at_35%_25%,#3a5369_0%,#1c2937_50%,#0c131b_90%,#060a0e_100%)] border border-[#384e63]/80 text-white shadow-[0_4px_8px_rgba(0,0,0,0.8),inset_0_1px_2px_rgba(255,255,255,0.35),inset_0_-2px_4px_rgba(0,0,0,0.7)]'
                              : 'border border-transparent'
                          }`}
                        >
                          {ballNum !== undefined && (
                            <div className="absolute top-0.5 left-1 w-2.5 h-1.5 rounded-full bg-gradient-to-b from-white/50 to-transparent blur-[0.2px] -rotate-20 pointer-events-none" />
                          )}
                          {ballNum !== undefined ? ballNum : ''}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Row 2 (Bottom row): Balls 1 to 10 */}
                <div className="grid grid-cols-10 gap-1 sm:gap-1.5 w-full">
                  {Array.from({ length: 10 }).map((_, slotIdx) => {
                    const ballNum = row2Balls[slotIdx];
                    const isHit = ballNum !== undefined && (allUserPickedNumbers.includes(ballNum) || selectedNumbers.includes(ballNum));
                    return (
                      <div
                        key={`row2-${slotIdx}`}
                        className={`aspect-square rounded-full flex items-center justify-center font-mono font-bold text-xs sm:text-sm transition-all duration-200 relative overflow-hidden select-none ${
                          ballNum !== undefined
                            ? isHit
                              ? 'bg-[radial-gradient(circle_at_35%_25%,#86efac_0%,#22c55e_50%,#15803d_85%,#052e16_100%)] border border-[#bbf7d0] shadow-[0_0_12px_rgba(34,197,94,0.95),inset_0_1px_3px_rgba(255,255,255,0.7)] text-slate-950 font-black scale-105 ring-1 ring-white/80'
                              : 'bg-[radial-gradient(circle_at_35%_25%,#3a5369_0%,#1c2937_50%,#0c131b_90%,#060a0e_100%)] border border-[#384e63]/80 text-white shadow-[0_4px_8px_rgba(0,0,0,0.8),inset_0_1px_2px_rgba(255,255,255,0.35),inset_0_-2px_4px_rgba(0,0,0,0.7)]'
                            : 'border border-transparent'
                        }`}
                      >
                        {ballNum !== undefined && (
                          <div className="absolute top-0.5 left-1 w-2.5 h-1.5 rounded-full bg-gradient-to-b from-white/50 to-transparent blur-[0.2px] -rotate-20 pointer-events-none" />
                        )}
                        {ballNum !== undefined ? ballNum : ''}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* BETTING & SELECTION BOARD (Visible when not drawing) */
            <>
              {/* Glowing Digital Countdown Timer Pill at Top Center (matching video Frame 00:00 to 00:16 & 00:46 to 00:50) */}
              <div className="w-full flex items-center justify-center py-1 relative z-10">
                <div className="px-3.5 py-0.5 rounded-xl bg-[#111c24] border border-[#22c55e]/50 shadow-[0_0_12px_rgba(34,197,94,0.25)] flex items-center justify-center">
                  <span className="font-mono font-black text-sm tracking-widest text-[#4ade80]">
                    {formattedCountdown}
                  </span>
                </div>
              </div>

              {/* SLIDING CARDS CAROUSEL: Placed tickets slide horizontally + Active Draft Card (matching IMG_3879 and video) */}
              <div
                ref={cardsCarouselRef}
                className="w-full flex items-stretch gap-2.5 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory py-1 my-1"
              >
                {/* 1. PLACED TICKETS CARDS (Slide into view from left) */}
                {userActiveTickets.map((tk, idx) => {
                  const payTable = KENO_PAYTABLES[tk.numbers.length];
                  const maxMult = payTable?.slice(-1)[0]?.multiplier || 0;
                  const maxWin = Math.round(tk.stake * maxMult);

                  return (
                    <div
                      key={tk.id}
                      className="w-[88%] shrink-0 snap-center rounded-2xl bg-[#16202c] border border-[#253240] p-2.5 shadow-lg relative flex flex-col justify-between gap-2"
                    >
                      {/* Top Row: [ (Ticket #) ]  Possible win [AMOUNT]  [ ✓ Stake ETB ]  [ ? ] */}
                      <div className="w-full flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-b from-[#86efac] via-[#22c55e] to-[#064e3b] border border-[#bbf7d0] text-slate-950 font-black font-mono text-sm flex items-center justify-center shadow-md shrink-0">
                            {idx + 1}
                          </div>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-white font-bold text-xs sm:text-sm">
                              {language === 'am' ? 'ሊያሸንፉ የሚችሉት' : 'Possible win'}
                            </span>
                            <span className="font-mono font-black text-base sm:text-lg text-[#4ade80]">
                              {maxWin}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-full bg-[#142d20] border border-[#22c55e]/60 text-[#4ade80] font-mono font-bold text-[10px] flex items-center gap-1">
                            ✓ {tk.stake} ETB
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setRulesActiveTab('rules');
                              setShowRulesModal(true);
                            }}
                            className="w-6 h-6 rounded-full bg-[#1e2a38] border border-[#2d3d52] hover:border-[#4ade80] flex items-center justify-center text-[#4ade80] font-black text-xs transition cursor-pointer"
                          >
                            ?
                          </button>
                        </div>
                      </div>

                      {/* Middle Row: Compact Payout Odds Table (Match & Pays) */}
                      {payTable && (
                        <div className="w-full bg-[#101720]/80 border border-[#1e2936] rounded-xl px-2.5 py-1.5 flex flex-col gap-1 text-[11px] font-mono">
                          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                            <span className="text-slate-400 font-semibold w-11 shrink-0">Match</span>
                            {payTable
                              .filter((t) => t.hits > 0)
                              .map((tier) => (
                                <span key={`match-${tk.id}-${tier.hits}`} className="w-8 text-center text-slate-200 font-bold shrink-0">
                                  {tier.hits}
                                </span>
                              ))}
                          </div>
                          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar border-t border-[#1a2430] pt-1">
                            <span className="text-slate-400 font-semibold w-11 shrink-0">Pays</span>
                            {payTable
                              .filter((t) => t.hits > 0)
                              .map((tier) => (
                                <span key={`pays-${tk.id}-${tier.hits}`} className="w-8 text-center text-[#4ade80] font-black shrink-0">
                                  x{tier.multiplier}
                                </span>
                              ))}
                          </div>
                        </div>
                      )}

                      {/* Bottom Row: Ticket numbers in horizontal row */}
                      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                        {tk.numbers.map((num) => (
                          <div
                            key={`tk-${tk.id}-num-${num}`}
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#222c38] border border-[#313f52] text-[#4ade80] font-mono font-black text-xs flex items-center justify-center shrink-0 shadow-sm"
                          >
                            {num}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {/* 2. ACTIVE DRAFT CARD (Current selection or Choose 10 numbers) */}
                <div className={`${userActiveTickets.length > 0 ? 'w-[88%]' : 'w-full'} shrink-0 snap-center transition-all`}>
                  {selectedNumbers.length > 0 ? (
                    /* POSSIBLE WIN CARD (Video Frames 00:00, 00:02, 00:04, 00:08, 00:10, 00:13, 00:48) */
                    <div className="w-full bg-[#16202c] border border-[#253240] rounded-2xl p-2.5 shadow-lg relative flex flex-col justify-between gap-2 h-full">
                      {/* Top Row: [ (Ticket #) ]  Possible win [AMOUNT]  [ ? ] */}
                      <div className="w-full flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-b from-[#86efac] via-[#22c55e] to-[#064e3b] border border-[#bbf7d0] text-slate-950 font-black font-mono text-sm flex items-center justify-center shadow-md shrink-0">
                            {userActiveTickets.length + 1}
                          </div>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-white font-bold text-xs sm:text-sm">
                              {language === 'am' ? 'ሊያሸንፉ የሚችሉት' : 'Possible win'}
                            </span>
                            <span className="font-mono font-black text-base sm:text-lg text-[#4ade80]">
                              {Math.round(stake * (KENO_PAYTABLES[selectedNumbers.length]?.slice(-1)[0]?.multiplier || 0))}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setRulesActiveTab('rules');
                            setShowRulesModal(true);
                          }}
                          className="w-6 h-6 rounded-full bg-[#1e2a38] border border-[#2d3d52] hover:border-[#4ade80] flex items-center justify-center text-[#4ade80] font-black text-xs transition cursor-pointer"
                        >
                          ?
                        </button>
                      </div>

                      {/* Middle Row: Compact Payout Odds Table (Match & Pays) */}
                      {KENO_PAYTABLES[selectedNumbers.length] && (
                        <div className="w-full bg-[#101720]/80 border border-[#1e2936] rounded-xl px-2.5 py-1.5 flex flex-col gap-1 text-[11px] font-mono">
                          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                            <span className="text-slate-400 font-semibold w-11 shrink-0">Match</span>
                            {KENO_PAYTABLES[selectedNumbers.length]
                              .filter((t) => t.hits > 0)
                              .map((tier) => (
                                <span key={`match-draft-${tier.hits}`} className="w-8 text-center text-slate-200 font-bold shrink-0">
                                  {tier.hits}
                                </span>
                              ))}
                          </div>
                          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar border-t border-[#1a2430] pt-1">
                            <span className="text-slate-400 font-semibold w-11 shrink-0">Pays</span>
                            {KENO_PAYTABLES[selectedNumbers.length]
                              .filter((t) => t.hits > 0)
                              .map((tier) => (
                                <span key={`pays-draft-${tier.hits}`} className="w-8 text-center text-[#4ade80] font-black shrink-0">
                                  x{tier.multiplier}
                                </span>
                              ))}
                          </div>
                        </div>
                      )}

                      {/* Bottom Row: Selected numbers in horizontal row of dark boxes (tap to remove) */}
                      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                        {selectedNumbers.map((num) => (
                          <button
                            key={`sel-tag-${num}`}
                            type="button"
                            onClick={() => toggleNumber(num)}
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#222c38] hover:bg-[#2e3b4b] border border-[#313f52] text-white font-mono font-black text-xs flex items-center justify-center shrink-0 shadow-sm transition active:scale-95 cursor-pointer"
                            title="Click to remove"
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    /* Default Hero Card: Choose 10 numbers (matching IMG_3879) */
                    <div className="w-full bg-[#182029] border border-[#252f3d] rounded-2xl p-3 shadow-lg relative overflow-hidden flex items-center justify-between min-h-[96px] h-full">
                      <div className="absolute inset-0 pointer-events-none opacity-15 flex items-center justify-start pl-4">
                        <div className="w-32 h-32 rounded-full border border-[#4ade80]" />
                        <div className="w-48 h-48 rounded-full border border-[#4ade80] absolute" />
                        <div className="w-64 h-64 rounded-full border border-[#4ade80] absolute" />
                      </div>

                      {/* Left: 3 Overlapping 3D Glossy Spheres (80, 10, and big front ball) */}
                      <div className="relative w-16 h-14 shrink-0 flex items-center justify-center z-10">
                        <div className="absolute -top-1 left-0 w-6 h-6 rounded-full bg-gradient-to-br from-[#334155] via-[#1e293b] to-[#0f172a] border border-slate-500/40 shadow-md flex items-center justify-center text-[9px] font-black font-mono text-slate-200">
                          80
                        </div>

                        <div className="absolute -top-1 right-1 w-7 h-7 rounded-full bg-gradient-to-br from-[#1e3a5f] via-[#0f233d] to-[#081324] border border-cyan-500/40 shadow-md flex items-center justify-center text-[10px] font-black font-mono text-cyan-200">
                          10
                        </div>

                        <div className="absolute bottom-0 left-0 w-11 h-11 rounded-full bg-gradient-to-b from-[#86efac] via-[#22c55e] to-[#064e3b] border-2 border-[#bbf7d0] shadow-[0_0_15px_rgba(34,197,94,0.7),inset_0_2px_4px_rgba(255,255,255,0.8)] flex items-center justify-center text-slate-950 font-black text-lg font-mono transform rotate-[-4deg]">
                          {userActiveTickets.length + 1}
                        </div>
                      </div>

                      {/* Middle Text: Dynamic per selected language */}
                      <div className="flex-1 pl-3 z-10">
                        <h2 className="text-white font-black text-base sm:text-lg leading-tight tracking-tight">
                          {t.chooseNumbers(10)}
                        </h2>
                        <p className="text-[#4ade80] text-xs font-bold mt-0.5">
                          {t.from1to80}
                        </p>
                      </div>

                      {/* Right: Circular Help Button (?) */}
                      <button
                        type="button"
                        onClick={() => {
                          setRulesActiveTab('rules');
                          setShowRulesModal(true);
                        }}
                        className="w-8 h-8 rounded-full bg-[#1e2a38] border border-[#2d3d52] hover:border-[#4ade80] flex items-center justify-center text-[#4ade80] font-black text-sm shadow-md transition cursor-pointer z-10 shrink-0"
                        title={t.rulesPaymentsMenu}
                      >
                        ?
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* 80-NUMBER BOARD (10 COLUMNS x 8 ROWS) */}
              <div className="w-full grid grid-cols-10 gap-1 sm:gap-1.5 my-1">
                {Array.from({ length: 80 }, (_, i) => i + 1).map((num) => {
                  const isSelected = selectedNumbers.includes(num);
                  const isDrawn = revealedDrawnSet.has(num);
                  const isHit = isSelected && isDrawn;

                  const isHotDot = SCREENSHOT_HOT_NUMBERS.includes(num);
                  const isColdDot = SCREENSHOT_COLD_NUMBERS.includes(num);

                  return (
                    <button
                      key={`keno-num-${num}`}
                      type="button"
                      onClick={() => toggleNumber(num)}
                      disabled={isDrawing}
                      className={`aspect-square rounded-lg flex items-center justify-center relative font-mono font-bold text-xs sm:text-sm transition-all duration-150 cursor-pointer ${
                        isHit
                          ? 'bg-[#22c55e] text-slate-950 font-black shadow-[0_0_12px_rgba(34,197,94,0.9)] ring-2 ring-white scale-105 z-10'
                          : isSelected
                          ? 'bg-[#22c55e] text-slate-950 font-black shadow-[0_0_10px_rgba(34,197,94,0.7)] scale-102 z-10'
                          : isDrawn
                          ? 'bg-[#1e2a3a] border border-[#38bdf8]/60 text-[#38bdf8]'
                          : 'bg-[#1b222b] hover:bg-[#232c37] text-[#94a3b8] hover:text-white border border-[#252f3c]/60'
                      }`}
                    >
                      <span>{num}</span>

                      {/* Hot coral red dot */}
                      {isHotDot && !isSelected && (
                        <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#f87171] shadow-[0_0_4px_rgba(248,113,113,0.9)]" />
                      )}

                      {/* Cold cyan blue dot */}
                      {isColdDot && !isSelected && (
                        <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#38bdf8] shadow-[0_0_4px_rgba(56,189,248,0.9)]" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* STAKE SELECTOR ROW: [ - 2 + ] [ X2 ] [ MAX ] */}
              <div className="w-full grid grid-cols-12 gap-1.5 my-1.5">
                <div className="col-span-7 bg-[#182029] border border-[#252f3d] rounded-xl flex items-center justify-between px-3 py-2 shadow">
                  <button
                    type="button"
                    onClick={handleDecreaseStake}
                    disabled={isDrawing || stake <= 1}
                    className="w-7 h-7 rounded-lg bg-[#212b37] hover:bg-[#2b3746] text-white flex items-center justify-center font-black text-base cursor-pointer disabled:opacity-40 transition active:scale-95"
                  >
                    —
                  </button>

                  <span className="font-mono font-black text-lg sm:text-xl text-white">
                    {stake}
                  </span>

                  <button
                    type="button"
                    onClick={handleIncreaseStake}
                    disabled={isDrawing}
                    className="w-7 h-7 rounded-lg bg-[#212b37] hover:bg-[#2b3746] text-white flex items-center justify-center font-black text-base cursor-pointer transition active:scale-95"
                  >
                    +
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleMultiplyStake(2)}
                  disabled={isDrawing}
                  className="col-span-2 bg-[#182029] hover:bg-[#212b37] border border-[#252f3d] rounded-xl flex items-center justify-center text-[#4ade80] font-black text-xs font-mono transition cursor-pointer active:scale-95 shadow"
                >
                  X2
                </button>

                <button
                  type="button"
                  onClick={handleMaxStake}
                  disabled={isDrawing}
                  className="col-span-3 bg-[#182029] hover:bg-[#212b37] border border-[#252f3d] rounded-xl flex items-center justify-center text-[#4ade80] font-black text-xs tracking-wider transition cursor-pointer active:scale-95 shadow"
                >
                  MAX
                </button>
              </div>

              {/* GIANT FOREST GREEN "BET" BUTTON (Video Frames 00:00 to 00:16 & 00:46 to 00:50) */}
              <button
                type="button"
                onClick={handlePlaceBet}
                disabled={isDrawing || selectedNumbers.length === 0}
                className={`w-full py-3.5 rounded-2xl font-black text-lg tracking-wider transition-all transform shadow-xl flex items-center justify-center gap-2 cursor-pointer ${
                  isDrawing
                    ? 'bg-[#1b2e25] text-slate-500 cursor-not-allowed opacity-80'
                    : isBetAccepted
                    ? 'bg-[#22c55e] border-2 border-white text-slate-950 scale-102 shadow-[0_0_25px_rgba(34,197,94,0.9)] animate-in zoom-in-95'
                    : selectedNumbers.length > 0
                    ? 'bg-gradient-to-b from-[#2e5744] via-[#244b39] to-[#1c3e2f] border border-[#4ade80]/60 text-[#a7f3d0] hover:brightness-110 active:scale-98 shadow-[0_4px_20px_rgba(34,197,94,0.3)]'
                    : 'bg-[#1f362c] text-[#718b7e] cursor-not-allowed'
                }`}
              >
                {isBetAccepted ? (
                  <div className="flex items-center gap-2 text-slate-950 font-black">
                    <Check className="w-5 h-5 stroke-[3]" />
                    <span>{language === 'am' ? 'ዉርርዱ ተቀባይነት አግኝቷል' : 'BET ACCEPTED'}</span>
                  </div>
                ) : (
                  <span>
                    {isDrawing
                      ? t.drawing
                      : t.bet}
                  </span>
                )}
              </button>
            </>
          )
        ) : (
          /* NON-GAME TABS (RESULTS, HISTORY, STATS): Top Stake Selector + BET button (matching IMG_3882) */
          <div className="w-full flex flex-col mb-1 animate-in fade-in">
            {/* STAKE SELECTOR ROW: [ - 10 + ] [ X2 ] [ MAX ] */}
            <div className="w-full grid grid-cols-12 gap-1.5 my-1.5">
              <div className="col-span-7 bg-[#182029] border border-[#252f3d] rounded-xl flex items-center justify-between px-3 py-2 shadow">
                <button
                  type="button"
                  onClick={handleDecreaseStake}
                  disabled={isDrawing || stake <= 1}
                  className="w-7 h-7 rounded-lg bg-[#212b37] hover:bg-[#2b3746] text-white flex items-center justify-center font-black text-base cursor-pointer disabled:opacity-40 transition active:scale-95"
                >
                  —
                </button>

                <span className="font-mono font-black text-lg sm:text-xl text-white">
                  {stake}
                </span>

                <button
                  type="button"
                  onClick={handleIncreaseStake}
                  disabled={isDrawing}
                  className="w-7 h-7 rounded-lg bg-[#212b37] hover:bg-[#2b3746] text-white flex items-center justify-center font-black text-base cursor-pointer transition active:scale-95"
                >
                  +
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleMultiplyStake(2)}
                disabled={isDrawing}
                className="col-span-2 bg-[#182029] hover:bg-[#212b37] border border-[#252f3d] rounded-xl flex items-center justify-center text-[#4ade80] font-black text-xs font-mono transition cursor-pointer active:scale-95 shadow"
              >
                X2
              </button>

              <button
                type="button"
                onClick={handleMaxStake}
                disabled={isDrawing}
                className="col-span-3 bg-[#182029] hover:bg-[#212b37] border border-[#252f3d] rounded-xl flex items-center justify-center text-[#4ade80] font-black text-xs tracking-wider transition cursor-pointer active:scale-95 shadow"
              >
                MAX
              </button>
            </div>

            {/* FOREST GREEN "BET" BUTTON (matching IMG_3882) */}
            <button
              type="button"
              onClick={() => {
                if (selectedNumbers.length === 0) {
                  handleQuickPick10();
                }
                handlePlaceBet();
              }}
              disabled={isDrawing}
              className={`w-full py-3.5 rounded-2xl font-black text-lg tracking-wider transition-all transform shadow-xl flex items-center justify-center gap-2 cursor-pointer ${
                isDrawing
                  ? 'bg-[#1b2e25] text-slate-500 cursor-not-allowed opacity-80'
                  : isBetAccepted
                  ? 'bg-[#22c55e] border-2 border-white text-slate-950 scale-102 shadow-[0_0_25px_rgba(34,197,94,0.9)] animate-in zoom-in-95'
                  : 'bg-gradient-to-b from-[#2e5744] via-[#244b39] to-[#1c3e2f] border border-[#4ade80]/60 text-[#a7f3d0] hover:brightness-110 active:scale-98 shadow-[0_4px_20px_rgba(34,197,94,0.3)]'
              }`}
            >
              {isBetAccepted ? (
                <div className="flex items-center gap-2 text-slate-950 font-black">
                  <Check className="w-5 h-5 stroke-[3]" />
                  <span>{language === 'am' ? 'ዉርርዱ ተቀባይነት አግኝቷል' : 'BET ACCEPTED'}</span>
                </div>
              ) : (
                <span>{isDrawing ? t.drawing : t.bet}</span>
              )}
            </button>
          </div>
        )}

        {/* NAVIGATION TABS: 5 TABS (GAME, HISTORY, RESULTS, STATISTICS, LEADERBOARD) matching IMG_3874 & IMG_3873 */}
          <div className="w-full flex items-center justify-between border-t border-[#1c232d] pt-2.5 mt-2 px-1 text-[11px] font-black overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveTab('game')}
              className={`flex flex-col items-center gap-1 transition cursor-pointer relative pb-1 shrink-0 ${
                activeTab === 'game' ? 'text-[#4ade80]' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-1">
                <span>▶</span>
                <span>{t.tabGame}</span>
              </div>
              {activeTab === 'game' && (
                <div className="w-full h-[2.5px] bg-[#4ade80] rounded-full absolute -bottom-0.5 shadow-[0_0_8px_rgba(74,222,128,0.8)]" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`flex flex-col items-center gap-1 transition cursor-pointer relative pb-1 shrink-0 ${
                activeTab === 'history' ? 'text-[#4ade80]' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-1">
                <span>↺</span>
                <span>{t.tabHistory}</span>
              </div>
              {activeTab === 'history' && (
                <div className="w-full h-[2.5px] bg-[#4ade80] rounded-full absolute -bottom-0.5 shadow-[0_0_8px_rgba(74,222,128,0.8)]" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('results')}
              className={`flex flex-col items-center gap-1 transition cursor-pointer relative pb-1 shrink-0 ${
                activeTab === 'results' ? 'text-[#4ade80]' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-1">
                <span>✓</span>
                <span>{t.tabResults}</span>
              </div>
              {activeTab === 'results' && (
                <div className="w-full h-[2.5px] bg-[#4ade80] rounded-full absolute -bottom-0.5 shadow-[0_0_8px_rgba(74,222,128,0.8)]" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('statistics')}
              className={`flex flex-col items-center gap-1 transition cursor-pointer relative pb-1 shrink-0 ${
                activeTab === 'statistics' ? 'text-[#4ade80]' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-1">
                <BarChart2 className="w-3.5 h-3.5" />
                <span>{t.tabStatistics}</span>
              </div>
              {activeTab === 'statistics' && (
                <div className="w-full h-[2.5px] bg-[#4ade80] rounded-full absolute -bottom-0.5 shadow-[0_0_8px_rgba(74,222,128,0.8)]" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('leaderboard')}
              className={`flex flex-col items-center gap-1 transition cursor-pointer relative pb-1 shrink-0 ${
                activeTab === 'leaderboard' ? 'text-[#4ade80]' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-1">
                <Crown className="w-3.5 h-3.5" />
                <span>{t.tabLeaderboard}</span>
              </div>
              {activeTab === 'leaderboard' && (
                <div className="w-full h-[2.5px] bg-[#4ade80] rounded-full absolute -bottom-0.5 shadow-[0_0_8px_rgba(74,222,128,0.8)]" />
              )}
            </button>
          </div>

          {/* BOTTOM SUBBAR: [ All 35249 | My Tickets 0 | My Bets 0 ] (Only on GAME tab, matching IMG_3874) */}
          {activeTab === 'game' && (
            <div className="w-full flex items-center justify-between text-[11px] text-slate-400 pt-1.5 pb-2 px-1 font-mono border-b border-[#1c232d]">
              <div>
                <span>{t.allLabel} </span>
                <span className="text-[#4ade80] font-bold">35249</span>
              </div>

              <div>
                <span>{t.myTicketsLabel} </span>
                <span className="text-[#4ade80] font-bold">{myTicketsCount}</span>
              </div>

              <div>
                <span>{t.myBetsLabel} </span>
                <span className="text-[#4ade80] font-bold">{myBetsTotal}</span>
              </div>
            </div>
          )}

          {/* ========================================================
              3. INLINE DYNAMIC CONTENT FEED (DIRECTLY BELOW TABS)
              ======================================================== */}
          <div className="w-full pt-2">
            
            {/* TAB 1: ▶ GAME — LIVE TICKETS INLINE (IMG_3874 & IMG_3867) */}
            {activeTab === 'game' && (
              <div className="space-y-2">
                {communityTickets.map((tk) => {
                  const hitNums = tk.numbers.filter((n) => revealedDrawnSet.has(n));
                  const isUserTk = userActiveTickets.some((ut) => ut.id === tk.id);

                  return (
                    <div
                      key={tk.id}
                      className={`p-2.5 rounded-2xl flex flex-col gap-1.5 transition-all ${
                        isUserTk
                          ? 'bg-[#14221b] border-2 border-[#22c55e]/80 shadow-[0_0_15px_rgba(34,197,94,0.3)]'
                          : 'bg-[#161c24] border border-[#242c38] shadow-sm'
                      }`}
                    >
                      {/* Top: Handle with optional YOU badge */}
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 font-mono font-bold text-[#4ade80]">
                          <span>{tk.handle}</span>
                          {isUserTk && (
                            <span className="px-1.5 py-0.2 rounded bg-[#22c55e] text-slate-950 font-black text-[9px] uppercase tracking-wider">
                              YOU
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {t.numbersCount(tk.numbers.length)}
                        </span>
                      </div>

                      {/* 10-slot numbers bar */}
                      <div className="grid grid-cols-10 gap-1 items-center">
                        {Array.from({ length: 10 }).map((_, slotIdx) => {
                          const num = tk.numbers[slotIdx];
                          const isHit = num !== undefined && (hitNums.includes(num) || (tk.status === 'Won' && slotIdx === 0));

                          return (
                            <div
                              key={`slot-${slotIdx}`}
                              className={`aspect-square rounded-lg flex items-center justify-center font-mono font-black text-xs ${
                                num !== undefined
                                  ? isHit
                                    ? 'bg-[#22c55e] text-slate-950 shadow-[0_0_8px_rgba(34,197,94,0.8)] ring-1 ring-white'
                                    : 'bg-[#252e3b] text-white border border-[#333d4d]'
                                  : 'bg-[#181f28] border border-[#202732] opacity-40'
                              }`}
                            >
                              {num !== undefined ? num : ''}
                            </div>
                          );
                        })}
                      </div>

                      {/* Bottom: Bet & Status (Waiting / Lost / Won) */}
                      <div className="flex items-center justify-between text-xs pt-0.5 font-mono">
                        <span className="text-white font-bold">{t.betAmountLabel(tk.bet)}</span>
                        {tk.status === 'Waiting' ? (
                          <span className="text-[#fbbf24] font-black">{t.statusWaiting}</span>
                        ) : tk.status === 'Won' ? (
                          <span className="text-[#4ade80] font-black">
                            {t.statusWon(tk.wonAmount || tk.bet * 2)}
                          </span>
                        ) : (
                          <span className="text-[#f87171] font-bold">{t.statusLost}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* TAB 2: ↺ HISTORY — GROUPED BY DRAW ID WITH FAIRNESS BUTTON (IMG_3871_d9bbbb5f.jpeg) */}
            {activeTab === 'history' && (
              <div className="space-y-4 animate-fade-in">
                {Object.keys(groupedHistory).length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500 italic bg-[#161c24] rounded-2xl border border-[#242c38]">
                    {t.noTicketsYet}
                  </div>
                ) : (
                  Object.entries(groupedHistory).map(([drawId, group]) => (
                    <div key={`group-${drawId}`} className="space-y-2">
                      {/* Section divider with Draw ID & Date matching IMG_3871 */}
                      <div className="flex items-center gap-2 py-1">
                        <div className="flex-1 h-[1px] bg-[#253240]" />
                        <div className="flex flex-col items-center text-center px-2">
                          <span className="text-xs font-bold text-[#4ade80] tracking-wide">
                            {t.drawDivider}
                          </span>
                          <span className="text-[11px] font-mono font-bold text-[#4ade80]">
                            {t.drawIdLabel}: {drawId}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {group.dateStr}
                          </span>
                        </div>
                        <div className="flex-1 h-[1px] bg-[#253240]" />
                      </div>

                      {/* Ticket cards under this draw */}
                      {group.items.map((item) => (
                        <div
                          key={item.id}
                          className="p-2.5 rounded-2xl bg-[#161c24] border border-[#242c38] shadow-sm flex flex-col gap-1.5"
                        >
                          {/* 10-slot numbers bar */}
                          <div className="grid grid-cols-10 gap-1 items-center">
                            {Array.from({ length: 10 }).map((_, slotIdx) => {
                              const num = item.numbers[slotIdx];
                              const isHit = num !== undefined && item.matchedNumbers.includes(num);

                              return (
                                <div
                                  key={`hist-slot-${slotIdx}`}
                                  className={`aspect-square rounded-lg flex items-center justify-center font-mono font-black text-xs ${
                                    num !== undefined
                                      ? isHit
                                        ? 'bg-[#22c55e] text-slate-950 font-black shadow-[0_0_8px_rgba(34,197,94,0.8)]'
                                        : 'bg-[#252e3b] text-white border border-[#333d4d]'
                                      : 'bg-[#181f28] border border-[#202732] opacity-30'
                                  }`}
                                >
                                  {num !== undefined ? num : ''}
                                </div>
                              );
                            })}
                          </div>

                          {/* Bottom: Bet & Result (+Payout or Lost) */}
                          <div className="flex items-center justify-between text-xs pt-0.5 font-mono">
                            <span className="text-white font-bold">{t.betAmountLabel(item.bet)}</span>
                            {item.payout > 0 ? (
                              <span className="text-[#4ade80] font-black">+{item.payout}</span>
                            ) : (
                              <span className="text-[#f87171] font-bold">{t.statusLost}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))
                )}

                {/* BOTTOM LARGE GREEN SHIELD "FAIRNESS" BUTTON (IMG_3871) */}
                <div className="pt-4 pb-2 flex flex-col items-center justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      setRulesActiveTab('fairness');
                      setShowRulesModal(true);
                    }}
                    className="flex flex-col items-center gap-2 group cursor-pointer active:scale-95 transition"
                  >
                    {/* Big glossy green shield icon matching IMG_3871 */}
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-b from-[#22c55e] via-[#16a34a] to-[#15803d] border-2 border-[#86efac] shadow-[0_0_20px_rgba(34,197,94,0.6)] flex items-center justify-center transform group-hover:scale-105 transition-transform">
                      <ShieldCheck className="w-9 h-9 text-white stroke-[2.5]" />
                    </div>
                    <span className="font-black text-white text-base tracking-widest uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                      {t.fairnessButton}
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: ✓ RESULTS — DRAW ID & COMBINATION TABLE (IMG_3873_7b1b88c8.jpeg) */}
            {activeTab === 'results' && (
              <div className="w-full flex flex-col space-y-2 animate-fade-in">
                {/* Table Header: Draw ID (Left) | Combination (Right) */}
                <div className="w-full flex items-center justify-between text-xs text-slate-400 font-semibold px-2 py-1 border-b border-[#1c232d]">
                  <span>{t.drawIdLabel}</span>
                  <span>{t.combinationLabel}</span>
                </div>

                {/* Active Round Row with "WAIT" pill (Row 1 in IMG_3873) */}
                <div className="p-2 rounded-2xl bg-[#161c24] border border-[#242c38] flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setRulesActiveTab('fairness');
                        setShowRulesModal(true);
                      }}
                      className="text-[#4ade80] hover:scale-110 transition cursor-pointer"
                      title={t.tabFairness}
                    >
                      <ShieldCheck className="w-6 h-6 fill-[#16a34a] text-white" />
                    </button>
                    <span className="font-mono font-bold text-xs text-[#4ade80]">
                      {currentDrawId}
                    </span>
                  </div>

                  <div className="flex-1 max-w-[210px] sm:max-w-[240px] flex justify-center">
                    <div className="w-full py-2 rounded-xl bg-[#202936] text-slate-400 font-mono font-black text-xs tracking-widest text-center">
                      {t.waitLabel}
                    </div>
                  </div>
                </div>

                {/* Completed Rounds Rows (Rows 2+ in IMG_3873) */}
                {resultsDraws
                  .filter((rd) => rd.balls && rd.balls.length > 0)
                  .map((rd) => (
                  <div
                    key={`res-draw-${rd.id}`}
                    className="p-2 rounded-2xl bg-[#161c24] border border-[#242c38] flex items-center justify-between gap-2 sm:gap-3"
                  >
                    {/* Left: Shield + Draw ID + Time */}
                    <div className="flex items-start gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setRulesActiveTab('fairness');
                          setShowRulesModal(true);
                        }}
                        className="text-[#4ade80] hover:scale-110 transition cursor-pointer mt-0.5"
                        title={t.tabFairness}
                      >
                        <ShieldCheck className="w-6 h-6 fill-[#16a34a] text-white" />
                      </button>

                      <div className="flex flex-col">
                        <span className="font-mono font-bold text-xs text-[#4ade80]">
                          {rd.id}
                        </span>
                        <span className="font-mono text-[10px] text-slate-400">
                          {rd.time}
                        </span>
                      </div>
                    </div>

                    {/* Right: 10x2 Combination Grid (20 balls matching IMG_3873) */}
                    <div className="flex-1 max-w-[210px] sm:max-w-[240px] flex flex-col gap-1">
                      {/* Row 1 (first 10 balls) */}
                      <div className="grid grid-cols-10 gap-0.5">
                        {rd.balls.slice(0, 10).map((num: number, i: number) => (
                          <div
                            key={`b1-${rd.id}-${i}`}
                            className="aspect-square rounded-[4px] bg-[#202936] flex items-center justify-center font-mono font-bold text-[10px] text-slate-300"
                          >
                            {num}
                          </div>
                        ))}
                      </div>

                      {/* Row 2 (second 10 balls) */}
                      <div className="grid grid-cols-10 gap-0.5">
                        {rd.balls.slice(10, 20).map((num: number, i: number) => (
                          <div
                            key={`b2-${rd.id}-${i}`}
                            className="aspect-square rounded-[4px] bg-[#202936] flex items-center justify-center font-mono font-bold text-[10px] text-slate-300"
                          >
                            {num}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* TAB 4: 📊 STATISTICS — LAST 100 ROUNDS FREQUENCY LIST (IMG_3869 & IMG_3870) */}
            {activeTab === 'statistics' && (
              <div className="w-full flex flex-col pb-4 animate-fade-in">
                {/* Subheader: Last 100 rounds | Sort ≡ */}
                <div className="flex items-center justify-between text-xs text-slate-400 py-1.5 px-1 border-b border-[#1c232d]/80 mb-2 font-sans">
                  <span className="font-semibold text-slate-400">{t.last100Rounds}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsStatsSorted((prev) => !prev);
                      kenoAudio.playSelect();
                    }}
                    className="flex items-center gap-1.5 text-xs text-[#4ade80] hover:text-[#86efac] font-medium transition cursor-pointer select-none active:scale-95"
                    title={isStatsSorted ? 'Sorted by frequency (Highest first)' : 'Default number order (1 to 80)'}
                  >
                    <span>{t.sortLabel}</span>
                    {/* 3-horizontal-bars icon matching IMG_3870 and IMG_3869 */}
                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 16 16">
                      <path d="M2 3.5h12v1.5H2V3.5zm0 3.8h8v1.5H2V7.3zm0 3.8h4v1.5H2v-1.5z" />
                    </svg>
                  </button>
                </div>

                {/* 80-Item Statistics List matching IMG_3869 and IMG_3870 */}
                <div className="flex flex-col space-y-1.5">
                  {statsItems.map((item) => {
                    // Maximum frequency cap for scaling the green line (max is ~36-40)
                    const percent = Math.min(100, Math.max(8, (item.count / 38) * 100));
                    const isSelected = selectedNumbers.includes(item.num);

                    return (
                      <div
                        key={`stat-ball-${item.num}`}
                        className="flex items-center gap-3 py-0.5 px-0.5 group"
                      >
                        {/* Number box matching IMG_3870/IMG_3869 */}
                        <button
                          type="button"
                          onClick={() => toggleNumber(item.num)}
                          disabled={isDrawing}
                          title={`Click to ${isSelected ? 'deselect' : 'select'} #${item.num}`}
                          className={`w-9 h-7 rounded-md flex items-center justify-center font-mono text-xs font-bold shrink-0 transition cursor-pointer ${
                            isSelected
                              ? 'bg-[#22c55e] text-slate-950 font-black shadow-[0_0_8px_rgba(34,197,94,0.7)]'
                              : 'bg-[#252f3b] text-slate-300 border border-[#323d4e] hover:border-[#4ade80]'
                          }`}
                        >
                          {item.num}
                        </button>

                        {/* Thin green horizontal progress line */}
                        <div className="flex-1 h-[2px] bg-transparent relative flex items-center">
                          <div
                            className="h-[2px] bg-[#22c55e] rounded-full shadow-[0_0_4px_rgba(34,197,94,0.5)] transition-all duration-300"
                            style={{ width: `${percent}%` }}
                          />
                        </div>

                        {/* Frequency count matching IMG_3870/IMG_3869 */}
                        <span className="font-mono text-xs font-bold text-[#4ade80] w-6 text-right shrink-0">
                          {item.count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 5: 👑 LEADERBOARD — TOP WINNERS */}
            {activeTab === 'leaderboard' && (
              <div className="space-y-2 animate-fade-in pb-2">
                <div className="flex items-center justify-between text-xs text-slate-400 px-2 py-1 border-b border-[#1c232d]">
                  <span className="font-semibold">{t.tabLeaderboard}</span>
                  <span className="font-mono text-[11px] text-[#4ade80]">Top Today</span>
                </div>

                {[
                  { rank: 1, handle: '1***R', payout: '50 000 ETB', spot: '10/10', color: 'from-amber-400 to-amber-600' },
                  { rank: 2, handle: '9***X', payout: '35 000 ETB', spot: '9/10', color: 'from-slate-300 to-slate-500' },
                  { rank: 3, handle: '4***K', payout: '20 000 ETB', spot: '8/8', color: 'from-amber-700 to-amber-900' },
                  { rank: 4, handle: '7***M', payout: '10 000 ETB', spot: '7/7', color: 'from-slate-700 to-slate-800' },
                  { rank: 5, handle: '2***Z', payout: '5 000 ETB', spot: '6/6', color: 'from-slate-700 to-slate-800' },
                ].map((lb) => (
                  <div
                    key={`lb-${lb.rank}`}
                    className="p-3 rounded-2xl bg-[#161c24] border border-[#242c38] flex items-center justify-between text-xs shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${lb.color} text-slate-950 font-black font-mono flex items-center justify-center text-xs shadow-md shrink-0`}>
                        {lb.rank}
                      </div>
                      <div>
                        <div className="font-mono font-bold text-white flex items-center gap-1.5">
                          <span>{lb.handle}</span>
                          <span className="text-[10px] text-[#4ade80] px-1.5 py-0.2 rounded bg-[#1c2b22] font-mono">
                            {lb.spot}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {t.drawIdLabel} #894076{lb.rank * 110}
                        </div>
                      </div>
                    </div>

                    <div className="font-mono font-black text-sm text-[#4ade80]">
                      +{lb.payout}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Floating bottom chevron button matching video (Frame 00:00 to 00:17) */}
          <div className="w-full flex items-center justify-center pt-3 pb-2">
            <button
              type="button"
              onClick={() => {
                window.scrollTo({ top: window.scrollY > 100 ? 0 : 400, behavior: 'smooth' });
                const el = document.getElementById('keno-scroll-container');
                if (el) {
                  el.scrollTo({ top: el.scrollTop > 100 ? 0 : 400, behavior: 'smooth' });
                }
              }}
              className="w-10 h-6 rounded-xl bg-[#172332] hover:bg-[#203044] border border-[#2b3d52] text-[#38bdf8] flex items-center justify-center shadow-md transition cursor-pointer active:scale-95"
            >
              <ChevronUp className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* ========================================================
            4. RULES & FAIRNESS MODAL (matching IMG_3880 & IMG_3881)
            ======================================================== */}
        {showRulesModal && (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4">
            <div className="w-full max-w-lg rounded-3xl bg-[#0e1217] border border-[#232d3b] shadow-2xl flex flex-col text-white max-h-[92vh] overflow-hidden animate-in zoom-in-95">
              
              {/* Modal Header: [ (i) RULES ]  [ (✓) FAIRNESS ]       [ X ] */}
              <div className="w-full flex items-center justify-between border-b border-[#1c2430] bg-[#121720] px-4 py-3 shrink-0">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setRulesActiveTab('rules')}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                      rulesActiveTab === 'rules'
                        ? 'bg-[#153424] text-[#4ade80] border border-[#23583c] shadow-sm'
                        : 'bg-[#11161d] text-slate-300 border border-[#1e2633] hover:text-white'
                    }`}
                  >
                    <Info className="w-4 h-4 text-[#4ade80]" />
                    <span>{language === 'am' ? 'ህጎች' : language === 'ti' ? 'ሕግታት' : language === 'om' ? 'Seera' : 'RULES'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRulesActiveTab('fairness')}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                      rulesActiveTab === 'fairness'
                        ? 'bg-[#153424] text-[#4ade80] border border-[#23583c] shadow-sm'
                        : 'bg-[#11161d] text-slate-300 border border-[#1e2633] hover:text-white'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 text-[#4ade80]" />
                    <span>{language === 'am' ? 'ትክክለኛነት' : language === 'ti' ? 'ፍትሓውነት' : language === 'om' ? 'Haqaa' : 'FAIRNESS'}</span>
                  </button>
                </div>

                {/* Close Button: Large white X icon (IMG_3880) */}
                <button
                  type="button"
                  onClick={() => setShowRulesModal(false)}
                  className="p-1 rounded-full text-white hover:text-slate-300 transition cursor-pointer"
                  aria-label="Close"
                >
                  <X className="w-6 h-6 stroke-[2.5]" />
                </button>
              </div>

              {/* Modal Body: Scrollable Content with Upward Chevron at bottom */}
              <div
                id="fairness-modal-body"
                className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs sm:text-[13px] leading-relaxed text-slate-200"
              >
                {rulesActiveTab === 'rules' ? (
                  <>
                    <div>
                      <h3 className="font-black text-base text-white">
                        {t.maxWinTitle}
                      </h3>
                      <p className="mt-2 text-slate-300">
                        {t.kenoDesc1}
                      </p>
                      <p className="mt-2 text-slate-300">
                        {t.kenoDesc2}
                      </p>
                    </div>

                    <div>
                      <h4 className="font-black text-white text-sm">{t.howToPlayTitle}</h4>
                      <p className="mt-1 text-slate-300">
                        {t.howToPlayDesc}
                      </p>
                      <ul className="mt-2 space-y-1 list-disc list-inside text-slate-300">
                        <li>{t.howToPlayStep1}</li>
                        <li>{t.howToPlayStep2}</li>
                        <li>{t.howToPlayStep3}</li>
                      </ul>
                      <p className="mt-2 text-slate-300">
                        {t.howToPlayDelete}
                      </p>
                      <p className="mt-2 text-slate-300">
                        {t.hotColdDesc}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-[#252f3d]">
                      <h4 className="font-black text-white text-sm">{t.paymentsTitle}</h4>
                      <p className="mt-1 text-slate-300">
                        {t.paymentsDesc1}
                      </p>
                      <p className="mt-1 text-slate-300">
                        {t.paymentsDesc2}
                      </p>

                      <div className="mt-3 overflow-x-auto rounded-xl border border-[#2d3748] bg-[#0d1117]">
                        <table className="w-full text-center border-collapse font-mono text-[10px]">
                          <thead>
                            <tr className="bg-[#182029] text-slate-300 border-b border-[#2d3748]">
                              <th className="p-1 border-r border-[#2d3748] w-6"></th>
                              {Array.from({ length: 10 }, (_, i) => i + 1).map((col) => (
                                <th key={`col-${col}`} className="p-1 border-r border-[#2d3748] font-bold">
                                  {col}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {PAYMENT_MATRIX.map((rowCells, hitCount) => (
                              <tr key={`hit-${hitCount}`} className="border-b border-[#242c38]">
                                <td className="p-1 font-bold text-slate-400 bg-[#161c24] border-r border-[#2d3748]">
                                  {hitCount}
                                </td>
                                {rowCells.map((val, colIdx) => (
                                  <td
                                    key={`cell-${hitCount}-${colIdx}`}
                                    className={`p-1 border-r border-[#242c38] ${
                                      val !== null
                                        ? selectedNumbers.length === colIdx + 1
                                          ? 'bg-[#22c55e]/20 text-[#4ade80] font-black'
                                          : 'text-slate-200 font-bold'
                                        : 'text-transparent'
                                    }`}
                                  >
                                    {val !== null ? val : ''}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <p className="mt-3 text-[11px] text-slate-400 leading-normal">
                        {t.disconnectionPolicy}
                      </p>
                    </div>

                    {/* Upward Chevron Button at bottom */}
                    <div className="w-full flex items-center justify-center pt-3 pb-1">
                      <button
                        type="button"
                        onClick={() => {
                          const el = document.getElementById('fairness-modal-body');
                          if (el) el.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="w-10 h-6 rounded-xl bg-[#172332] hover:bg-[#203044] border border-[#2b3d52] text-[#38bdf8] flex items-center justify-center shadow-md transition cursor-pointer active:scale-95"
                      >
                        <ChevronUp className="w-4 h-4 stroke-[2.5]" />
                      </button>
                    </div>
                  </>
                ) : (
                  /* ABOUT FAIRNESS SECTION (Word-for-word matching IMG_3880 & IMG_3881) */
                  <div className="flex flex-col space-y-4">
                    {/* Centered 3D Glossy Green Shield with Checkmark (IMG_3880) */}
                    <div className="flex flex-col items-center justify-center pt-1 pb-1">
                      <div className="relative w-16 h-16 flex items-center justify-center drop-shadow-[0_8px_20px_rgba(34,197,94,0.45)]">
                        <svg className="w-16 h-16" viewBox="0 0 64 64" fill="none">
                          <defs>
                            <linearGradient id="fairnessShieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#4ade80" />
                              <stop offset="35%" stopColor="#22c55e" />
                              <stop offset="75%" stopColor="#15803d" />
                              <stop offset="100%" stopColor="#052e16" />
                            </linearGradient>
                            <linearGradient id="fairnessShieldShine" x1="0%" y1="0%" x2="50%" y2="80%">
                              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.75" />
                              <stop offset="60%" stopColor="#ffffff" stopOpacity="0.1" />
                              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                            </linearGradient>
                          </defs>
                          <path
                            d="M32 4L10 12V30C10 44 19 56 32 60C45 56 54 44 54 30V12L32 4Z"
                            fill="url(#fairnessShieldGrad)"
                            stroke="#86efac"
                            strokeWidth="1.5"
                          />
                          <path
                            d="M32 6L12 13.5V28C12 36 16 44 24 50C22 40 22 24 32 6Z"
                            fill="url(#fairnessShieldShine)"
                          />
                          <path
                            d="M22 30L28 36L42 22"
                            stroke="white"
                            strokeWidth="5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                      <h2 className="text-white font-black text-base sm:text-lg tracking-wider uppercase mt-2">
                        {language === 'am' ? 'ስለ ጨዋታው ትክክለኛነት' : language === 'ti' ? 'ብዛዕባ ፍትሓውነት ጸወታ' : language === 'om' ? 'Waaʼee Haqaa Taphaa' : 'ABOUT FAIRNESS'}
                      </h2>
                    </div>

                    {/* Paragraph 1 */}
                    <p className="text-slate-200">
                      Before the start of a round, the players are provided with a “Hash Code*” – an encrypted text combination “Key*”. Here are the round outcome numbers.
                    </p>

                    {/* Paragraph 2 */}
                    <p className="text-slate-200">
                      The outcome of the round is determined not at the moment of the game, but in advance for current round, and is given to the players in coded form.
                    </p>

                    {/* Paragraph 3 */}
                    <p className="break-all font-mono text-[11px] sm:text-xs text-slate-300">
                      For example, “Hash (Hash) code *” <span className="text-[#4ade80] font-bold">3586ED7EECC3AEA4A6AC4A359D96E5CF30BBC47E24ED9E030066D7C7DE6C82B1F1376122E35B5165342F27243E1BE5B46B31F2A5D97E6DE26E0E4A6202DF3CDD</span>.
                    </p>

                    {/* Paragraph 4 */}
                    <p className="text-slate-200">
                      After the end of a round, the players are provided with a “Key*” and an additional input parameter for getting the “Hash Code*” - “Salt*” Using them, every player can copy and encrypt this combination to see that the encrypted “Key * ” corresponds to the “Hash code *” previously determined by the system. This ensures that the outcome of the game is determined not at the moment of the round, but previously, before playing a round.
                    </p>

                    {/* Paragraph 5 */}
                    <p className="text-slate-200">
                      What is “Salt*” - it is a random sequence of letters and numbers, For instance: <span className="font-mono text-[#4ade80] font-bold">e20d4c76c654</span>.
                    </p>

                    {/* Paragraph 6 */}
                    <div className="space-y-1 text-slate-200">
                      <p>What is “Key*” - a text combination of four parameters</p>
                      <ol className="list-decimal list-inside pl-2 space-y-0.5 text-slate-300 font-medium">
                        <li>Round Id</li>
                        <li>The outcome numbers</li>
                        <li>Wording “Keno”</li>
                        <li>A random sequence of letters and numbers</li>
                      </ol>
                    </div>

                    {/* Paragraph 7 */}
                    <p className="break-all text-[11px] sm:text-xs text-slate-300 leading-relaxed">
                      After the end of a game, the player will see the Key in his betting history s follows: Round ID (for example, 3013185); the outcome numbers (for stance: numbers 1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20): the name of the game - Keno, and a random sequence of letters and numbers - ca50e5af-9fd6- 46fc-bafa-5cfa21d2602e, followed by the “Key*”, which in this case is - <span className="font-mono text-[#a7f3d0] font-bold">3013185_numbers_1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20_Keno_ca50e5af-9fd6-46fc-bafa-5cfa21d2602e</span>.
                    </p>

                    {/* Paragraph 8 */}
                    <p className="break-all font-mono text-[11px] sm:text-xs text-slate-300 leading-relaxed">
                      If we encrypt the “Key*” via the “Salt*” (for example, <span className="text-[#4ade80] font-bold">2b4545ed5a</span>) using the SHA512 generator, we’ll get the defined Hash code. <span className="text-[#4ade80] font-bold">3586ED7EECC3AEA4A6AC4A359D96E5CF30BBC47E24ED9E030066D7C7DE6C82B1F1376122E35B5165342F27243E1BE5B46B31F2A5D97E6DE26E0E4A6202DF3CDD</span>.
                    </p>

                    {/* Paragraph 9 */}
                    <p className="text-[11px] sm:text-xs text-slate-400 leading-relaxed">
                      To get a hash code you can click on check icon in Result section and perform the check. You can get the encryption “Key*” and “Hash Code*” below or check on any online server that has a generator SHA512 With Salt.
                    </p>

                    {/* Interactive 128-Hexadecimal Hash Box */}
                    <div className="w-full text-left p-3 rounded-2xl bg-[#070b10] border border-[#22c55e]/40 font-mono text-xs space-y-1.5 shadow-inner mt-2">
                      <div className="flex items-center justify-between text-slate-400 font-bold">
                        <span>{t.hashCodeLabel} (SHA512):</span>
                        <button
                          type="button"
                          onClick={copyHashToClipboard}
                          className="flex items-center gap-1 text-[#4ade80] hover:text-[#86efac] font-sans font-bold cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>{copiedHash ? t.copiedLabel : t.copyLabel}</span>
                        </button>
                      </div>
                      <div className="text-[#a7f3d0] break-all leading-tight font-black select-all tracking-wider text-[11px]">
                        {currentRoundHash}
                      </div>
                    </div>

                    {/* Upward Chevron Button at bottom (matching IMG_3881) */}
                    <div className="w-full flex items-center justify-center pt-3 pb-1">
                      <button
                        type="button"
                        onClick={() => {
                          const el = document.getElementById('fairness-modal-body');
                          if (el) el.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="w-10 h-6 rounded-xl bg-[#172332] hover:bg-[#203044] border border-[#2b3d52] text-[#38bdf8] flex items-center justify-center shadow-md transition cursor-pointer active:scale-95"
                      >
                        <ChevronUp className="w-4 h-4 stroke-[2.5]" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            5. SLIDE-OUT MENU (With Language Selector & App Navigation)
            ======================================================== */}
        {isMenuOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end">
            <div className="w-full max-w-xs h-full bg-[#11161d] border-l border-[#252f3d] p-4 sm:p-5 shadow-2xl flex flex-col justify-between text-white animate-in slide-in-from-right overflow-y-auto">
              <div className="space-y-3.5">
                <div className="flex items-center justify-between border-b border-[#252f3d] pb-2.5">
                  <FastKenoLogo size="md" />
                  <button
                    type="button"
                    onClick={() => setIsMenuOpen(false)}
                    className="p-1 text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* LANGUAGE SELECTION CARD */}
                <div className="p-3 rounded-2xl bg-[#182029] border border-[#2d3748] flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                    <div className="flex items-center gap-1.5">
                      <Globe className="w-4 h-4 text-[#4ade80]" />
                      <span>{t.languageSelectTitle}</span>
                    </div>
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-[#252f3d] text-[#4ade80] font-black">
                      {language.toUpperCase()}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { code: 'am', label: 'አማርኛ', flag: '🇪🇹' },
                      { code: 'en', label: 'English', flag: '🇬🇧' },
                      { code: 'om', label: 'Oromoo', flag: '🇪🇹' },
                      { code: 'ti', label: 'ትግርኛ', flag: '🇪🇹' },
                    ].map((langItem) => {
                      const isSelected = language === langItem.code;
                      return (
                        <button
                          key={langItem.code}
                          type="button"
                          onClick={() => {
                            const nextLang = langItem.code as Language;
                            setLanguage(nextLang);
                            onChangeLanguage?.(nextLang);
                            showToast(
                              langItem.code === 'am'
                                ? 'ቋንቋ ወደ አማርኛ ተቀይሯል'
                                : langItem.code === 'om'
                                ? 'Afaan Oromootti jijjiirameera'
                                : langItem.code === 'ti'
                                ? 'ቋንቋ ናብ ትግርኛ ተቐይሩ'
                                : 'Language switched to English'
                            );
                          }}
                          className={`py-1.5 px-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                            isSelected
                              ? 'bg-[#1b2e25] border-[#4ade80] text-[#4ade80] shadow-[0_0_8px_rgba(74,222,128,0.4)]'
                              : 'bg-[#212b37] border-[#2d3748] text-slate-300 hover:border-slate-500'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <span>{langItem.flag}</span>
                            <span className="truncate">{langItem.label}</span>
                          </div>
                          {isSelected && <span className="text-[11px] font-black">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRulesActiveTab('rules');
                      setShowRulesModal(true);
                      setIsMenuOpen(false);
                    }}
                    className="w-full p-2.5 rounded-xl bg-[#182029] border border-[#2d3748] flex items-center gap-3 text-xs font-bold text-slate-200 hover:bg-[#212b37] cursor-pointer"
                  >
                    <Info className="w-4 h-4 text-[#4ade80]" />
                    <span>{t.rulesPaymentsMenu}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setRulesActiveTab('fairness');
                      setShowRulesModal(true);
                      setIsMenuOpen(false);
                    }}
                    className="w-full p-2.5 rounded-xl bg-[#182029] border border-[#2d3748] flex items-center gap-3 text-xs font-bold text-slate-200 hover:bg-[#212b37] cursor-pointer"
                  >
                    <Shield className="w-4 h-4 text-[#4ade80]" />
                    <span>{t.fairnessMenu}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleQuickPick10();
                      setIsMenuOpen(false);
                    }}
                    className="w-full p-2.5 rounded-xl bg-[#182029] border border-[#2d3748] flex items-center gap-3 text-xs font-bold text-[#4ade80] hover:bg-[#212b37] cursor-pointer"
                  >
                    <Shuffle className="w-4 h-4 text-[#4ade80]" />
                    <span>{t.quickPick10Menu}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleClear();
                      setIsMenuOpen(false);
                    }}
                    className="w-full p-2.5 rounded-xl bg-[#182029] border border-[#2d3748] flex items-center gap-3 text-xs font-bold text-slate-300 hover:text-rose-400 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4 text-rose-400" />
                    <span>{t.clearAllMenu}</span>
                  </button>

                  <div className="h-px bg-[#252f3d] my-2" />

                  {onOpenBingo && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onOpenBingo();
                      }}
                      className="w-full p-2.5 rounded-xl bg-gradient-to-r from-emerald-600/30 to-teal-700/30 border border-emerald-500/50 flex items-center gap-3 text-xs font-black text-emerald-300 hover:brightness-110 cursor-pointer"
                    >
                      <span>🎟️</span>
                      <span>{t.goToBingoMenu}</span>
                    </button>
                  )}

                  {onBackToLudo && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onBackToLudo();
                      }}
                      className="w-full p-2.5 rounded-xl bg-gradient-to-r from-amber-600/30 to-yellow-700/30 border border-amber-500/50 flex items-center gap-3 text-xs font-black text-amber-300 hover:brightness-110 cursor-pointer"
                    >
                      <span>👑</span>
                      <span>{t.goToLudoMenu}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      if (onOpenWallet) {
                        onOpenWallet();
                      } else {
                        showToast(t.walletMenu(user.birrBalance));
                      }
                    }}
                    className="w-full p-2.5 rounded-xl bg-[#182029] border border-[#2d3748] flex items-center gap-3 text-xs font-bold text-amber-300 cursor-pointer"
                  >
                    <Wallet className="w-4 h-4 text-amber-400" />
                    <span>{t.walletMenu(user.birrBalance)}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className="w-full p-2.5 rounded-xl bg-[#182029] border border-[#2d3748] flex items-center justify-between text-xs font-bold text-slate-200 cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      {soundEnabled ? (
                        <Volume2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <VolumeX className="w-4 h-4 text-rose-400" />
                      )}
                      <span>{t.soundEffectsMenu}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {soundEnabled ? t.onLabel : t.offLabel}
                    </span>
                  </button>

                  <a
                    href="/fast_keno_source_code.zip"
                    download="fast_keno_source_code.zip"
                    className="w-full p-2.5 rounded-xl bg-gradient-to-r from-emerald-600/30 to-green-600/30 border border-[#4ade80]/60 flex items-center justify-between text-xs font-black text-[#4ade80] hover:brightness-125 cursor-pointer no-underline"
                  >
                    <div className="flex items-center gap-2">
                      <Download className="w-4 h-4 text-[#4ade80]" />
                      <span>የ Keno ፋይሎች አውርድ (.ZIP)</span>
                    </div>
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-[#1b2e25] text-[#4ade80]">
                      ZIP
                    </span>
                  </a>
                </div>
              </div>

              <div className="pt-3 border-t border-[#252f3d] flex items-center justify-between text-[11px] text-slate-500 font-mono">
                <span>Fast Keno Master</span>
                <span>v1.0.7</span>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            6. WIN CELEBRATION MODAL
            ======================================================== */}
        {showWinModal && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-sm rounded-3xl bg-[#11161d] border-2 border-[#4ade80] p-6 shadow-2xl text-center flex flex-col items-center gap-3 animate-in zoom-in-95">
              <div className="text-5xl animate-bounce">🏆</div>
              <h2 className="text-xl font-black text-[#4ade80] drop-shadow">
                {t.bigWinTitle}
              </h2>
              <p className="text-xs text-slate-300">
                {t.bigWinDesc(showWinModal.matchedBalls.length, showWinModal.spotCount)}
              </p>

              <div className="p-3 rounded-2xl bg-[#182029] border border-[#4ade80]/60 w-full text-center">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                  {t.prizeAwarded}
                </span>
                <div className="text-2xl font-black text-[#4ade80] font-mono mt-0.5">
                  +{showWinModal.payout.toLocaleString()} ETB
                </div>
                <span className="text-[11px] text-slate-400">
                  {t.multiplierText(showWinModal.totalMultiplier)}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setShowWinModal(null)}
                className="w-full py-2.5 rounded-full bg-[#22c55e] text-slate-950 font-black text-sm shadow-lg hover:brightness-110 cursor-pointer"
              >
                {t.claimAndContinue}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


// Default export for direct drop-in as App.tsx in any AI Studio project
export default function App() {
  return (
    <div className="w-full min-h-screen bg-[#070b0e] text-slate-100 flex flex-col items-center justify-start overflow-x-hidden font-sans">
      <div className="w-full max-w-md min-h-screen bg-[#0e141b] shadow-2xl flex flex-col">
        <FastKenoScreen />
      </div>
    </div>
  );
}
