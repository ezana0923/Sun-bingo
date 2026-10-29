import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  RefreshCw,
  Send,
  X,
  QrCode,
  Clock,
  Info,
  DollarSign,
  Trophy,
  Gamepad2,
  AlignLeft,
  Grid,
  Layers,
} from 'lucide-react';
import { getLetterForBall } from '../utils/bingoEngine';
import { CallSpeed, Language } from '../types/bingo';
import { TRANSLATIONS } from '../utils/translations';

interface MasterBoard75Props {
  calledBalls: number[];
  activeBall: number | null;
  isPlaying: boolean;
  isPaused: boolean;
  callSpeedSec: CallSpeed;
  isFastBingoMode?: boolean;
  voiceEnabled: boolean;
  sfxEnabled?: boolean;
  autoDaub?: boolean;
  isSelectModeActive?: boolean;
  selectedCartelasCount?: number;
  isAdminMode: boolean;
  language: Language;
  isDark: boolean;
  currentUserName?: string;
  adminRoomMessage?: string;
  adminRoomMessageAt?: string;
  gamePatternName?: string;
  gameMatchId?: string | number;
  stakeAmount?: number;
  prizeAmount?: number;
  registeredCount?: number;
  heldCartelasCount?: number;
  preGameCountdown?: number | null;
  isGameFinished?: boolean;
  winningCartelaIds?: number[];
  blockedCartelaIds?: number[];
  bingoCountdown?: number | null;
  onInspectWinnerCartela?: (cartelaId: number) => void;
  onInspectBlockedCartela?: (cartelaId: number) => void;
  onOpenRulesModal?: () => void;
  onUpdateAdminRoomMessage?: (message: string) => void;
  onToggleVoice: () => void;
  onToggleSfx?: () => void;
  onToggleAutoDaub?: () => void;
  onRefreshState?: () => void;
  onToggleSelectMode?: () => void;
  onRegisterSelected?: () => void;
  onDeleteSelected?: () => void;
  onChangeSpeed: (sec: CallSpeed) => void;
  onToggleFastBingoMode?: () => void;
  onTogglePause: () => void;
  onDrawNextManual: () => void;
  onResetGame: () => void;
}

const ROWS_CONFIG = [
  {
    letter: 'B',
    min: 1,
    max: 15,
    letterStyle: 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/40',
    activeBallStyle: 'bg-gradient-to-b from-blue-500 to-blue-700 text-white shadow-md shadow-blue-500/30',
  },
  {
    letter: 'I',
    min: 16,
    max: 30,
    letterStyle: 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/40',
    activeBallStyle: 'bg-gradient-to-b from-rose-500 to-red-700 text-white shadow-md shadow-rose-500/30',
  },
  {
    letter: 'N',
    min: 31,
    max: 45,
    letterStyle: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/40',
    activeBallStyle: 'bg-gradient-to-b from-emerald-500 to-green-700 text-white shadow-md shadow-emerald-500/30',
  },
  {
    letter: 'G',
    min: 46,
    max: 60,
    letterStyle: 'bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/40',
    activeBallStyle: 'bg-gradient-to-b from-purple-500 to-indigo-700 text-white shadow-md shadow-purple-500/30',
  },
  {
    letter: 'O',
    min: 61,
    max: 75,
    letterStyle: 'bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-500/40',
    activeBallStyle: 'bg-gradient-to-b from-orange-500 to-amber-600 text-white shadow-md shadow-orange-500/30',
  },
];

const DEFAULT_EZI_ADMIN_INFO = `ክቡራን ደምበኞቻችን በ 3ቱ ስልኮች ዲፖዚት ማድረግ ትችላላችሁ 0942742684 (Sun Bingo)`;

export const MasterBoard75: React.FC<MasterBoard75Props> = ({
  calledBalls,
  activeBall,
  isPlaying,
  isPaused,
  callSpeedSec,
  isFastBingoMode = false,
  autoDaub = false,
  isAdminMode,
  language,
  isDark,
  adminRoomMessage = '',
  adminRoomMessageAt = '',
  gamePatternName = '4 መስመር',
  gameMatchId = '770426',
  stakeAmount = 10,
  prizeAmount = 500,
  registeredCount = 1,
  heldCartelasCount,
  preGameCountdown = null,
  isGameFinished = false,
  winningCartelaIds = [],
  blockedCartelaIds = [],
  bingoCountdown = null,
  onInspectWinnerCartela,
  onInspectBlockedCartela,
  onOpenRulesModal,
  onUpdateAdminRoomMessage,
  onToggleAutoDaub,
  onRefreshState,
  onChangeSpeed,
  onTogglePause,
  onDrawNextManual,
  onResetGame,
}) => {
  const [showFullBoard, setShowFullBoard] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [adminDraftMessage, setAdminDraftMessage] = useState('');

  const t = TRANSLATIONS[language];
  const calledSet = new Set(calledBalls);

  const handleRefresh = () => {
    setIsRefreshing(true);
    if (onRefreshState) {
      onRefreshState();
    } else {
      onResetGame();
    }
    setTimeout(() => setIsRefreshing(false), 450);
  };

  const handlePostAdminMessage = (msgToSet: string) => {
    const clean = msgToSet.trim();
    if (onUpdateAdminRoomMessage) {
      onUpdateAdminRoomMessage(clean);
    }
    if (clean) {
      setAdminDraftMessage('');
    }
  };

  const get3DBallGradient = (ball: number) => {
    const letter = getLetterForBall(ball);
    if (letter === 'B') return 'from-blue-400 via-blue-600 to-blue-900 ring-blue-400/50';
    if (letter === 'I') return 'from-rose-400 via-red-600 to-red-900 ring-rose-400/50';
    if (letter === 'N') return 'from-emerald-500 via-teal-700 to-emerald-950 ring-emerald-400/50';
    if (letter === 'G') return 'from-purple-400 via-purple-600 to-indigo-950 ring-purple-400/50';
    return 'from-orange-400 via-amber-600 to-orange-950 ring-orange-400/50';
  };

  // ALL previously called balls (excluding current active ball), ordered newest-first so user can slide/scroll horizontally to inspect EVERY called ball!
  const allPreviousBalls =
    calledBalls.length > 1 ? calledBalls.slice(0, -1).reverse() : [];

  const formattedMatchId = String(gameMatchId).slice(0, 8);
  const formatCountdownMinSec = (secs: number) => {
    const m = Math.floor(Math.max(0, secs) / 60);
    const s = Math.max(0, secs) % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };
  const displayTime =
    preGameCountdown !== null && preGameCountdown > 0
      ? formatCountdownMinSec(preGameCountdown)
      : adminRoomMessageAt ||
        new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  const displayStatus = isGameFinished
    ? (isFastBingoMode ? (isPlaying ? t.statusPlaying : t.statusReady) : 'ተጠናቋል!')
    : bingoCountdown !== null && bingoCountdown > 0
    ? `ቢንጎ የማለት ሰዓት (${bingoCountdown}s)`
    : bingoCountdown === 0 && winningCartelaIds.length > 0
    ? 'ተጠናቋል!'
    : preGameCountdown !== null && preGameCountdown > 0
    ? `ምዝገባ ክፍት ነው (${formatCountdownMinSec(preGameCountdown)})`
    : isPlaying
    ? isPaused
      ? t.statusPaused
      : t.statusPlaying
    : calledBalls.length > 0 && winningCartelaIds.length > 0
    ? 'ተጠናቋል!'
    : t.statusReady;
  const userHeldCount = typeof heldCartelasCount === 'number' ? heldCartelasCount : registeredCount;

  return (
    <div
      className={`rounded-2xl border p-2.5 sm:p-3.5 transition-all ${
        isFastBingoMode
          ? isDark
            ? 'bg-slate-900/95 border-amber-500/40 shadow-lg'
            : 'bg-slate-100 border-slate-300 shadow-sm'
          : isDark
          ? 'bg-slate-900/95 border-slate-800 shadow-lg'
          : 'bg-slate-100 border-slate-300 shadow-sm'
      }`}
    >
      {/* Top Row: Left = የወጡ ቁጥሮች: | Center = [Refresh Icon] + [Au Icon] | Right = የወጡ ኳሶች ብዛት: X + [Show More/Less Swap Icon] */}
      <div className="flex items-center justify-between gap-1.5 mb-2 px-0.5">
        <span
          className={`text-xs sm:text-sm font-extrabold tracking-tight shrink-0 ${
            isDark ? 'text-slate-200' : 'text-slate-800'
          }`}
        >
          {t.calledNumbers}
        </span>

        {/* Center Icons: Refresh Icon + Auto-Daub ("Au") Icon ONLY */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleRefresh}
            title="አድስ (Refresh)"
            aria-label="Refresh"
            className={`w-7 h-7 rounded-lg border transition-all cursor-pointer flex items-center justify-center active:scale-95 ${
              isDark
                ? 'bg-slate-800 text-cyan-400 border-slate-700 hover:bg-slate-700'
                : 'bg-white text-cyan-700 border-slate-300 hover:bg-cyan-50 shadow-2xs'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 stroke-[2.5] ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

          {!isFastBingoMode && onOpenRulesModal && (
            <button
              type="button"
              onClick={onOpenRulesModal}
              title={`የጨዋታ አይነት በምስል እይ (${gamePatternName})`}
              aria-label="የጨዋታ አይነት በምስል እይ"
              className={`w-7 h-7 rounded-lg border transition-all cursor-pointer flex items-center justify-center active:scale-95 ${
                isDark
                  ? 'bg-slate-800 text-amber-400 border-amber-500/40 hover:bg-amber-500 hover:text-slate-950'
                  : 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-500 hover:text-white shadow-2xs'
              }`}
            >
              <Grid className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className={`font-mono-tabular text-xs sm:text-sm font-extrabold ${
              isDark ? 'text-slate-200' : 'text-slate-800'
            }`}
          >
            {t.totalCalled} {calledBalls.length}
          </span>

          {/* Show More / Show Less Icon Button (በምልክት ብቻ) */}
          <button
            type="button"
            onClick={() => setShowFullBoard(!showFullBoard)}
            title={showFullBoard ? t.showLess : t.showMore}
            aria-label={showFullBoard ? t.showLess : t.showMore}
            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl border flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
              isDark
                ? 'bg-slate-800 text-rose-400 hover:bg-slate-700 border-slate-700'
                : 'bg-white text-rose-600 hover:bg-rose-50 border-slate-300 shadow-2xs'
            }`}
          >
            {showFullBoard ? (
              <ChevronUp className="w-4 h-4 stroke-[2.75]" />
            ) : (
              <ChevronDown className="w-4 h-4 stroke-[2.75]" />
            )}
          </button>
        </div>
      </div>

      {/* SWAPPABLE CONTENT:
          1) When Show Less (!showFullBoard): Shows the Horizontal Sliding Strip of Called Balls (የሚወጡት ቁጥሮች ማሳያ).
          2) When Show More (showFullBoard):
             - In Ezi Bingo (!isFastBingoMode): Displays the exact ጨዋታ / መረጃ / ኮድ / ሰዓት / ጨዋታ ተጠናቋል / ዋጋ / የጨዋታ ብዛት / ሽልማት / የወጡ ኳሶች ብዛት: X / 75-Ball Board layout from IMG_3575.jpeg!
             - In Fast Bingo (isFastBingoMode): Shows the compact 75-Ball Master Board. */}
      {!showFullBoard ? (
        /* STATE 1 (Show Less): Horizontal Sliding Strip of ALL Called Balls */
        <div
          className={`flex items-center justify-between gap-2 p-2 rounded-2xl border ${
            isDark ? 'bg-slate-950/75 border-slate-800' : 'bg-white/90 border-slate-200/90'
          }`}
        >
          <div
            className="flex items-center gap-2 overflow-x-auto py-1 px-0.5 w-full scroll-smooth"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {/* Active 3D Sphere Ball (Hidden in Fast Bingo per user request "በ fast bingo active number እንዳይኖር") */}
            {!isFastBingoMode &&
              (activeBall ? (
                <div className="relative w-13 h-13 sm:w-15 sm:h-15 rounded-full bg-gradient-to-br from-emerald-500 via-green-700 to-emerald-950 ring-2 ring-emerald-400/80 shadow-lg flex items-center justify-center text-white shrink-0 transition-transform duration-200">
                  <div className="absolute top-1.5 left-2.5 w-5 h-2 rounded-full bg-white/35 rotate-[-20deg] pointer-events-none" />
                  <span className="text-sm sm:text-base font-black font-mono-tabular tracking-tight text-white drop-shadow">
                    {getLetterForBall(activeBall)}-{activeBall}
                  </span>
                </div>
              ) : (
                <div
                  className={`w-13 h-13 sm:w-15 sm:h-15 rounded-full border-2 border-dashed flex flex-col items-center justify-center shrink-0 ${
                    isDark ? 'border-slate-700 text-slate-500' : 'border-slate-300 text-slate-400'
                  }`}
                >
                  <span className="text-[10px] font-bold">Sun</span>
                  <span className="text-xs font-extrabold">--</span>
                </div>
              ))}

            {/* ALL Previous Called Balls — Horizontally Slidable so the player can swipe & see every called number! */}
            <div className="flex items-center gap-1.5 sm:gap-2 pr-2">
              {(isFastBingoMode ? calledBalls.slice().reverse() : allPreviousBalls).length === 0 ? (
                <span className={`text-xs whitespace-nowrap ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  {t.nextBallsPlaceholder}
                </span>
              ) : (
                (isFastBingoMode ? calledBalls.slice().reverse() : allPreviousBalls).map((b, idx) => (
                  <div
                    key={`${b}-${idx}`}
                    className={`relative w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br ${get3DBallGradient(
                      b
                    )} flex items-center justify-center text-white font-mono-tabular shadow-md shrink-0 select-none`}
                    title={`${getLetterForBall(b)}-${b}`}
                  >
                    <div className="absolute top-1 left-1.5 w-3 h-1.5 rounded-full bg-white/30 rotate-[-20deg] pointer-events-none" />
                    <span className="text-xs sm:text-sm font-black leading-none drop-shadow">
                      {b}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        /* STATE 2 (Show More):
           - In Ezi Bingo (!isFastBingoMode): Matches the uploaded reference photo IMG_3575.jpeg
           - In Fast Bingo (isFastBingoMode): Compact 75-Ball Board */
        <div className="space-y-2">
          {!isFastBingoMode && (
            <>
              {/* CARD 1: ጨዋታ: + መረጃ + ኮድ: / ሰዓት: / ሁኔታ */}
              <div
                className={`rounded-2xl border p-3 space-y-2.5 shadow-sm ${
                  isDark
                    ? 'bg-slate-950/90 border-slate-800 text-slate-100'
                    : 'bg-white border-slate-200/90 text-slate-800'
                }`}
              >
                <div className="flex items-center justify-between gap-2 text-xs sm:text-sm">
                  <div className="flex items-center gap-2 min-w-0 flex-wrap">
                    <Gamepad2 className="w-4 h-4 text-blue-500 shrink-0" />
                    <span className={isDark ? 'text-slate-400 font-bold' : 'text-slate-500 font-bold'}>
                      {t.game}:
                    </span>
                    <span className="font-black tracking-tight truncate">
                      {!gamePatternName || gamePatternName === 'አልተጠቀሰም' || gamePatternName === 'አልተመረጠም'
                        ? language === 'am'
                          ? 'አልተቀመጠም'
                          : language === 'ti'
                          ? 'ኣይተወሰነን'
                          : language === 'om'
                          ? 'Hinkiilamne'
                          : 'Not Set'
                        : gamePatternName}
                    </span>
                    {onOpenRulesModal && (
                      <button
                        type="button"
                        onClick={onOpenRulesModal}
                        title={
                          isAdminMode
                            ? language === 'am'
                              ? 'ጨዋታና ደቂቃ ምረጥ'
                              : language === 'ti'
                              ? 'ጸወታን ደቒቕን ምረጽ'
                              : language === 'om'
                              ? 'Tapha fi Daqiiqaa Filadhu'
                              : 'Select Game & Mins'
                            : `${t.game}: ${gamePatternName}`
                        }
                        aria-label={
                          isAdminMode
                            ? language === 'am'
                              ? 'ጨዋታና ደቂቃ ምረጥ'
                              : language === 'ti'
                              ? 'ጸወታን ደቒቕን ምረጽ'
                              : language === 'om'
                              ? 'Tapha fi Daqiiqaa Filadhu'
                              : 'Select Game & Mins'
                            : `${t.game}: ${gamePatternName}`
                        }
                        className={`px-2.5 py-1 rounded-xl border flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shrink-0 shadow-xs ${
                          isAdminMode
                            ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black border-amber-300'
                            : isDark
                            ? 'bg-amber-500/15 border-amber-500/40 text-amber-400 hover:bg-amber-500 hover:text-slate-950'
                            : 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-500 hover:text-white'
                        }`}
                      >
                        <Grid className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span className="text-xs font-black">
                          {isAdminMode
                            ? language === 'am'
                              ? '🎯 ጨዋታና ደቂቃ ምረጥ'
                              : language === 'ti'
                              ? '🎯 ጸወታን ደቒቕን ምረጽ'
                              : language === 'om'
                              ? '🎯 Tapha fi Daqiiqaa Filadhu'
                              : '🎯 Select Game & Mins'
                            : language === 'am'
                            ? 'ሕግ እይ'
                            : language === 'ti'
                            ? 'ሕጊ ርአ'
                            : language === 'om'
                            ? 'Heera Ilaali'
                            : 'View Rules'}
                        </span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Row 2: መረጃ: <Admin Message> */}
                <div className="flex items-start gap-2 text-xs sm:text-sm leading-relaxed">
                  <AlignLeft className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <span className={`${isDark ? 'text-slate-400' : 'text-slate-500'} font-bold mr-1.5`}>
                      {t.infoLabel}
                    </span>
                    <span className="font-semibold break-words whitespace-pre-line">
                      {adminRoomMessage || DEFAULT_EZI_ADMIN_INFO}
                    </span>
                  </div>
                </div>

                {/* Admin-Only Quick Edit for Info Message */}
                {isAdminMode && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (adminDraftMessage.trim()) {
                        handlePostAdminMessage(adminDraftMessage);
                      }
                    }}
                    className={`flex items-center gap-1.5 pt-2 border-t ${
                      isDark ? 'border-slate-800' : 'border-slate-200'
                    }`}
                  >
                    <input
                      type="text"
                      value={adminDraftMessage}
                      onChange={(e) => setAdminDraftMessage(e.target.value)}
                      placeholder="መረጃ መልእክት እዚህ ይፃፉ..."
                      className={`flex-1 px-2.5 py-1.5 rounded-xl text-xs font-bold border focus:outline-none ${
                        isDark
                          ? 'bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 focus:border-amber-400'
                          : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-amber-500'
                      }`}
                    />
                    <button
                      type="submit"
                      disabled={!adminDraftMessage.trim()}
                      className="px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1 cursor-pointer disabled:opacity-45 shrink-0"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>ለጥፍ</span>
                    </button>
                    {adminRoomMessage && (
                      <button
                        type="button"
                        onClick={() => handlePostAdminMessage('')}
                        title="መልእክቱን አጥፋ"
                        className="p-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white cursor-pointer shrink-0 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </form>
                )}

                {/* Row 3: ኮድ: | ሰዓት: | የአሁን ቁጥር | ጨዋታ ተጠናቋል */}
                <div
                  className={`flex flex-wrap items-center justify-between gap-2 pt-2 border-t text-[11px] sm:text-xs font-bold ${
                    isDark ? 'border-slate-800/90 text-slate-300' : 'border-slate-200/80 text-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <QrCode className="w-3.5 h-3.5 opacity-75 shrink-0" />
                    <span>{t.codeLabel}</span>
                    <span className="font-mono-tabular font-extrabold">{formattedMatchId}</span>
                  </div>

                  <div
                    className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-400"
                    title="እርስዎ የያዙት ካርቴላ ብዛት: 1"
                  >
                    <Gamepad2 className="w-4 h-4 shrink-0" />
                    <span className="font-mono-tabular font-black text-xs sm:text-sm">
                      1
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 opacity-75 shrink-0" />
                    <span>{t.timeLabel}</span>
                    <span
                      className={`font-mono-tabular font-extrabold ${
                        preGameCountdown !== null && preGameCountdown > 0
                          ? 'text-amber-500 animate-pulse'
                          : ''
                      }`}
                    >
                      {displayTime}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <Info className="w-3.5 h-3.5 opacity-75 shrink-0" />
                    <span className="font-extrabold">{displayStatus}</span>
                  </div>
                </div>
              </div>

              {/* CARD 2: ዋጋ | ሽልማት */}
              <div
                className={`rounded-2xl border px-3 py-2 flex items-center justify-between gap-2 text-xs sm:text-sm font-bold shadow-sm ${
                  isDark
                    ? 'bg-slate-950/90 border-slate-800 text-slate-200'
                    : 'bg-white border-slate-200/90 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>{t.betStake}</span>
                  <span className="font-mono-tabular font-black text-emerald-500">
                    ${stakeAmount}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <Trophy className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>{t.prizePool}:</span>
                  <span className="font-mono-tabular font-black text-amber-500">
                    ${Math.round(prizeAmount)}
                  </span>
                </div>
              </div>
            </>
          )}

          {/* Admin Quick Caller Controls */}
          {isAdminMode && (
            <div className="flex flex-wrap items-center justify-end gap-1.5">
              <div className="flex items-center rounded-lg p-0.5 bg-slate-800 text-white">
                {([1, 2, 3, 5, 10, 15] as const).map((spd) => (
                  <button
                    key={spd}
                    type="button"
                    onClick={() => onChangeSpeed(spd)}
                    className={`px-2 py-1 rounded-md text-[11px] font-mono-tabular font-bold transition-colors cursor-pointer ${
                      callSpeedSec === spd
                        ? spd <= 3
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-emerald-500 text-slate-950'
                        : 'text-slate-300 hover:text-white'
                    }`}
                    title={`የኳስ ፍጥነት ${spd} ሰከንድ`}
                  >
                    {spd}s
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={onTogglePause}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1 transition-colors cursor-pointer ${
                  !isPlaying || isPaused
                    ? 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-sm'
                    : 'bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-sm'
                }`}
                title={!isPlaying || isPaused ? 'ጨዋታ ጀምር / ቀጥል (Start / Resume)' : 'አቁም (Pause)'}
              >
                {!isPlaying || isPaused ? (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{calledBalls.length === 0 ? 'ጀምር (Start)' : 'ቀጥል'}</span>
                  </>
                ) : (
                  <>
                    <Pause className="w-3.5 h-3.5 fill-current" />
                    <span>አቁም</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onDrawNextManual}
                className="p-2 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-500 transition-colors cursor-pointer"
                title="በእጅ ቀጣይ ኳስ አውጣ (Manual Next Ball)"
              >
                <SkipForward className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={onResetGame}
                className="p-2 rounded-xl text-xs font-bold bg-rose-600/20 text-rose-500 hover:bg-rose-600 hover:text-white transition-colors cursor-pointer"
                title="ጨዋታ ዳግም ጀምር (Reset)"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* CARD 3: የወጡ ኳሶች ብዛት: X + Full 75-Ball Master Board (B: 1-15, I: 16-30, N: 31-45, G: 46-60, O: 61-75) */}
          <div
            className={`rounded-2xl border p-2.5 space-y-2 select-none ${
              isDark
                ? 'bg-slate-950/85 border-slate-800'
                : 'bg-white border-slate-200/90 shadow-xs'
            }`}
          >
            {!isFastBingoMode && bingoCountdown !== null && bingoCountdown > 0 && (
              <div className="flex items-center justify-center p-2 rounded-xl bg-slate-900/90 border border-amber-500/40 text-amber-400 animate-pulse font-black text-xs sm:text-sm">
                <span>
                  {language === 'am'
                    ? `ቢንጎ የማለት ሰዓት ${bingoCountdown} ሰከንድ`
                    : language === 'ti'
                    ? `ናይ ቢንጎ ምባል ግዜ ${bingoCountdown} ሰከንድ`
                    : language === 'om'
                    ? `Yeroo Bingo Jedhu ${bingoCountdown} Sekondii`
                    : `Bingo Claim Window ${bingoCountdown}s`}
                </span>
              </div>
            )}

            <div className="space-y-1.5">
              {ROWS_CONFIG.map((row) => {
                const numbers = Array.from({ length: 15 }, (_, i) => row.min + i);
                return (
                  <div key={row.letter} className="grid grid-cols-16 gap-1 items-center">
                    {/* Row Letter Indicator */}
                    <div
                      className={`h-7 sm:h-8 rounded-lg border font-extrabold text-xs sm:text-sm flex items-center justify-center ${row.letterStyle}`}
                    >
                      {row.letter}
                    </div>

                    {/* 15 Numbers in Row */}
                    {numbers.map((num) => {
                      const isCalled = calledSet.has(num);
                      const isCurrent = !isFastBingoMode && activeBall === num;
                      return (
                        <div
                          key={num}
                          className={`h-7 sm:h-8 rounded-lg font-mono-tabular text-[11px] sm:text-xs font-extrabold flex items-center justify-center transition-all ${
                            isCurrent
                              ? 'bg-slate-900 text-emerald-400 font-black ring-2 ring-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.9)] scale-105 z-10'
                              : isCalled
                              ? row.activeBallStyle
                              : isDark
                              ? 'bg-slate-800/90 text-slate-400 border border-slate-700/80'
                              : 'bg-slate-100 text-slate-700 border border-slate-300/90'
                          }`}
                        >
                          {num}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>

          {/* BINGO CARDS & BLOCKED STATUS BADGES (At the bottom of the board, only when Show More is active, and hidden if neither exists!) */}
          {((winningCartelaIds && winningCartelaIds.length > 0) ||
            (blockedCartelaIds && blockedCartelaIds.length > 0)) && (
            <div
              className={`p-2.5 sm:p-3 rounded-2xl border flex flex-wrap items-center justify-between gap-2 text-xs font-bold ${
                isDark
                  ? 'bg-slate-950/90 border-slate-800 text-slate-100 shadow-md'
                  : 'bg-white border-slate-200 text-slate-900 shadow-2xs'
              }`}
            >
              <div className="flex items-center gap-3 flex-wrap">
                {/* 1. Bingo Cards (ያሸነፈ ካርቴላ ሲኖር ብቻ የካርቴላ ቁጥሩን በግልጽ [ 22782 ] አድርጎ ያሳያል) */}
                {winningCartelaIds && winningCartelaIds.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-emerald-400 font-extrabold flex items-center gap-1">
                      <Trophy className="w-3.5 h-3.5 text-emerald-400" />
                      Bingo Cards:
                    </span>
                    {winningCartelaIds.map((cid) => (
                      <button
                        key={cid}
                        type="button"
                        onClick={() => onInspectWinnerCartela && onInspectWinnerCartela(cid)}
                        className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono-tabular font-black text-xs hover:bg-emerald-500 hover:text-slate-950 transition-colors cursor-pointer active:scale-95 shadow-2xs"
                        title="የአሸናፊውን ካርቴላ ዝርዝር እይ"
                      >
                        [ {cid} ]
                      </button>
                    ))}
                  </div>
                )}

                {/* 2. Blocked (የታገደ ካርቴላ ሲኖር ብቻ [ 13994 ] ብሎ ያሳያል፤ ሲነካ ዝርዝሩን ያሳያል) */}
                {blockedCartelaIds && blockedCartelaIds.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-rose-400 font-extrabold flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                      Blocked:
                    </span>
                    {blockedCartelaIds.length > 8 ? (
                      <span className="px-2.5 py-0.5 rounded-md bg-rose-600/20 text-rose-300 border border-rose-500/40 font-extrabold text-xs">
                        «{blockedCartelaIds.length} የታገዱ ካርቴላዎች»
                      </span>
                    ) : (
                      blockedCartelaIds.map((cid) => (
                        <button
                          key={cid}
                          type="button"
                          onClick={() => onInspectBlockedCartela && onInspectBlockedCartela(cid)}
                          className="px-2 py-0.5 rounded-md bg-rose-600/20 text-rose-300 border border-rose-500/40 font-mono-tabular font-black text-xs hover:bg-rose-600 hover:text-white transition-colors cursor-pointer active:scale-95 shadow-2xs"
                          title="የታገደውን ካርቴላ ቁጥሮች እና ምክንያት እይ"
                        >
                          [ {cid} ]
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
