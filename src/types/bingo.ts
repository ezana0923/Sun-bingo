export type Language = 'am' | 'ti' | 'om' | 'en';
export type DaubColor = 'blue' | 'red' | 'green' | 'yellow' | 'purple';
export type AppAccentColor = 'amber' | 'emerald' | 'blue' | 'rose' | 'purple' | 'cyan';
export type UnregisteredWhenStartedMode = 'hide' | 'dim';
export type CartelaSortMode =
  | 'default'
  | 'by_lines'
  | 'by_called'
  | 'by_squares'
  | 'by_square'
  | 'by_rect'
  | 'by_cross'
  | 'by_t';
export type CallSpeed = 1 | 2 | 3 | 5 | 10 | 15;

export interface ShapeGroup {
  nameAm: string;
  nameEn: string;
  color: 'sky' | 'amber' | 'rose' | 'purple' | 'emerald' | string;
  cells: [number, number][];
}

export interface PatternVariation {
  id: string;
  label: string;
  description?: string;
  shapeGroups?: ShapeGroup[];
  isAdminExtra?: boolean;
  grid: boolean[][]; // 5x5 boolean matrix where true means required cell (row 2, col 2 is always FREE)
}

export interface BingoRulePattern {
  id: number;
  code: string;
  isFastBingo?: boolean;
  titleAm: string;
  titleTi: string;
  titleOm: string;
  titleEn: string;
  descAm: string;
  descEn: string;
  adminVariantsCount?: number;
  category?: 'square' | 'line' | 'shape' | 'special' | string;
  variations: PatternVariation[];
}

export interface CartelaCard {
  id: number; // 1 to 70000
  numbers: number[][]; // 5x5 matrix ([row][col], where numbers[2][2] = 0 for FREE)
  isRegistered: boolean;
  isBonus?: boolean;
  isBlocked?: boolean;
  manualMarks: boolean[][]; // 5x5 manual clicks when auto-daub is off or user clicks
}

export interface BankPaymentAccount {
  id: string;
  bankName: string;
  shortName: string;
  accountNumber: string;
  accountHolder: string;
  badgeBg: string;
}

export interface TransactionRecord {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  type: 'deposit' | 'withdraw' | 'transfer' | 'win' | 'bet' | 'referral';
  method: 'CBE' | 'Abyssinia' | 'Telebirr' | 'M-Pesa' | 'Wallet' | 'System' | string;
  amount: number;
  referenceNumber: string;
  fullSmsText?: string;
  recipientPhone?: string;
  status: 'approved' | 'pending' | 'rejected';
  timestamp: string;
}

export interface UserAccount {
  id: string;
  name: string;
  phone: string;
  passwordHash: string;
  balance: number;
  bonusBalance: number;
  referralCode: string;
  referredCount: number;
  referralEarnings: number;
  isBlocked: boolean;
  isAdmin: boolean;
  joinedAt: string;
}

export interface HeroBannerAd {
  id: string;
  title: string;
  subtitle: string;
  badgeText: string;
  accentColor: 'blue' | 'emerald' | 'amber' | 'rose';
  imageUrl?: string;
  isActive: boolean;
}

export interface WinnerAnnouncement {
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

export interface GameHistoryRecord {
  id: string;
  gameMatchId: number;
  timestamp: string;
  stakeAmount: number;
  prizeAmount: number;
  patternTitle: string;
  totalBallsCalled: number;
  lastBall: number;
  calledBallsSnapshot: number[];
  provablyFairHash?: string;
  serverSeed?: string;
  playedByCurrentUser?: boolean;
  myRegisteredCartelaIds?: number[];
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

export interface VerificationFailureInfo {
  cartelaId: number;
  reasonAm: string;
  missingNumbers: number[];
  lastBallIncluded: boolean;
  countdownSeconds: number;
}

export type NotificationPreference = 'always' | 'registered_only' | 'none' | 'wins_only' | 'mute';

