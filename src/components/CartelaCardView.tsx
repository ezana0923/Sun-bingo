import React from 'react';
import { X, Trophy, Ban, CheckCircle, CheckSquare, Square, Lock } from 'lucide-react';
import { CartelaCard, DaubColor, Language } from '../types/bingo';
import { TRANSLATIONS } from '../utils/translations';

interface CartelaCardViewProps {
  cartela: CartelaCard;
  calledBalls: number[];
  activeBall: number | null;
  autoDaub: boolean;
  daubColor: DaubColor;
  language: Language;
  isDark: boolean;
  isGameStarted?: boolean;
  isGameFinished?: boolean;
  isFastBingoMode?: boolean;
  isPostTwoMinutes?: boolean;
  isCompact3Col?: boolean;
  isSelected?: boolean;
  isDimmedUnregistered?: boolean;
  showSelectCheckbox?: boolean;
  shapeBadge?: string | null;
  onToggleSelect?: (cartelaId: number) => void;
  onToggleRegister: (cartelaId: number) => void;
  onRemoveCartela: (cartelaId: number) => void;
  onToggleCellDaub: (cartelaId: number, row: number, col: number) => void;
  onClaimBingo: (cartela: CartelaCard) => void;
}

const BINGO_HEADER_COLS = [
  { char: 'B', bg: 'bg-emerald-600 text-white' },
  { char: 'I', bg: 'bg-rose-600 text-white' },
  { char: 'N', bg: 'bg-sky-600 text-white' },
  { char: 'G', bg: 'bg-blue-600 text-white' },
  { char: 'O', bg: 'bg-amber-500 text-white' },
];

const DAUB_COLOR_MAP: Record<DaubColor, string> = {
  blue: 'bg-blue-600 text-white ring-blue-300 border-blue-500',
  red: 'bg-rose-600 text-white ring-rose-300 border-rose-500',
  green: 'bg-emerald-600 text-white ring-emerald-300 border-emerald-500',
  yellow: 'bg-amber-400 text-slate-950 ring-amber-200 border-amber-500',
  purple: 'bg-purple-600 text-white ring-purple-300 border-purple-500',
};

export const CartelaCardView: React.FC<CartelaCardViewProps> = ({
  cartela,
  calledBalls,
  activeBall,
  autoDaub,
  daubColor,
  language,
  isDark,
  isGameStarted = false,
  isGameFinished = false,
  isFastBingoMode = false,
  isPostTwoMinutes = false,
  isCompact3Col = false,
  isSelected = false,
  isDimmedUnregistered = false,
  showSelectCheckbox = false,
  shapeBadge = null,
  onToggleSelect,
  onToggleRegister,
  onRemoveCartela,
  onToggleCellDaub,
  onClaimBingo,
}) => {
  const t = TRANSLATIONS[language];
  const calledSet = new Set(calledBalls);
  const gameActive = isGameStarted || calledBalls.length > 0;

  return (
    <div
      className={`rounded-2xl border overflow-hidden transition-all flex flex-col ${
        isDimmedUnregistered
          ? 'pointer-events-none select-none'
          : ''
      } ${
        isSelected
          ? 'ring-2 ring-amber-400 border-amber-400 shadow-lg'
          : cartela.isBlocked
          ? isDark
            ? 'bg-rose-950/30 border-rose-600/70 opacity-85'
            : 'bg-rose-50 border-rose-400 opacity-90'
          : isDark
          ? 'bg-slate-900 border-slate-700 shadow-md'
          : 'bg-white border-slate-300 shadow-sm'
      }`}
    >
      {/* Top Header Bar: Lock icon when registered, or Select Checkbox only when select mode is active + Cartela ID + Shape Badge + Remove X */}
      <div
        className={`flex items-center justify-between text-white ${
          isCompact3Col ? 'px-1.5 py-1 text-[11px]' : 'px-2.5 py-1.5 text-xs sm:text-sm'
        } ${
          cartela.isBlocked
            ? 'bg-rose-700'
            : isSelected
            ? 'bg-amber-600'
            : cartela.isBonus
            ? 'bg-gradient-to-r from-amber-600 to-orange-600'
            : 'bg-blue-600'
        }`}
      >
        <div className="flex items-center gap-1 min-w-0">
          {cartela.isRegistered ? (
            <span
              className="p-0.5 rounded bg-white/15 flex items-center justify-center shrink-0"
              title="ተመዝግቧልና ተቆልፏል (Registered & Locked)"
            >
              <Lock className={`${isCompact3Col ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-amber-300`} />
            </span>
          ) : (
            !gameActive &&
            (showSelectCheckbox || isSelected) &&
            onToggleSelect && (
              <button
                type="button"
                onClick={() => onToggleSelect(cartela.id)}
                className="p-0.5 rounded hover:bg-white/20 transition-colors cursor-pointer flex items-center shrink-0"
                title="ምረጥ (Select Cartela)"
              >
                {isSelected ? (
                  <CheckSquare className={`${isCompact3Col ? 'w-3.5 h-3.5' : 'w-4 h-4'} text-amber-200 fill-amber-500/30`} />
                ) : (
                  <Square className={`${isCompact3Col ? 'w-3.5 h-3.5' : 'w-4 h-4'} text-white/90`} />
                )}
              </button>
            )
          )}
          <span
            onClick={() =>
              !gameActive &&
              !cartela.isRegistered &&
              (showSelectCheckbox || isSelected) &&
              onToggleSelect &&
              onToggleSelect(cartela.id)
            }
            className={`font-extrabold font-mono-tabular tracking-tight shrink-0 ${
              isCompact3Col ? 'text-[11px] sm:text-xs' : 'text-xs sm:text-sm'
            } ${
              !gameActive && !cartela.isRegistered && (showSelectCheckbox || isSelected)
                ? 'cursor-pointer'
                : ''
            }`}
          >
            #{cartela.id}
          </span>
          {/* Shape completed count badge (e.g. S-3, S-1, S-0, R-2, +-1, T-2) matching IMG_3758_1b92cc16.jpeg */}
          {shapeBadge && (
            <span
              className={`font-black font-mono-tabular tracking-wider rounded-md shrink-0 shadow-xs border ${
                isCompact3Col ? 'text-[9px] px-1 py-0.2' : 'text-[10px] sm:text-[11px] px-1.5 py-0.5'
              } ${
                shapeBadge.endsWith('-0')
                  ? 'bg-slate-800/90 text-slate-300 border-slate-600'
                  : 'bg-amber-400 text-slate-950 border-amber-300 shadow-[0_0_6px_rgba(251,191,36,0.5)]'
              }`}
              title={`የተሰሩ ቅርጾች ብዛት፦ ${shapeBadge}`}
            >
              {shapeBadge}
            </span>
          )}
          {cartela.isBonus && (
            <span className={`${isCompact3Col ? 'text-[8px] px-1' : 'text-[10px] px-1.5'} font-extrabold bg-white/20 py-0.5 rounded shrink-0`}>
              BONUS
            </span>
          )}
        </div>

        {cartela.isRegistered && !isGameFinished ? (
          <span
            className="p-0.5 rounded bg-white/15 flex items-center justify-center opacity-85"
            title="ካርቴላ ከተመዘገበ በኋላ መመለስ ወይም ማጥፋት አይቻልም"
          >
            <Lock className={`${isCompact3Col ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-amber-300`} />
          </span>
        ) : !gameActive || isGameFinished ? (
          <button
            type="button"
            onClick={() => onRemoveCartela(cartela.id)}
            className="p-0.5 rounded hover:bg-white/20 transition-colors cursor-pointer"
            title="አስወግድ (Remove Cartela)"
          >
            <X className={`${isCompact3Col ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
          </button>
        ) : null}
      </div>

      {/* Registration Status / BINGO! Claim Button OR "ጨዋታ ተጠናቋል" in the Same Top Slot */}
      <div className={isCompact3Col ? 'p-1 pb-0.5' : 'p-2 pb-1'}>
        {isDimmedUnregistered ? (
          <div className="w-full py-1 px-1.5 rounded-lg bg-slate-800/90 text-slate-400 text-[10px] sm:text-[11px] font-bold flex items-center justify-center select-none border border-slate-700/60">
            <span>{t.unregisteredInactive || 'ያልተመዘገበ (አይሰራም)'}</span>
          </div>
        ) : isGameFinished ? (
          isFastBingoMode ? (
            gameActive || cartela.isRegistered ? (
              <button
                type="button"
                onClick={() => onClaimBingo(cartela)}
                className={`w-full ${isCompact3Col ? 'py-1 px-1 text-[10px] sm:text-xs font-black' : 'py-1.5 px-2 text-[11px] sm:text-xs font-extrabold'} rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white flex items-center justify-center gap-1 hover:brightness-110 active:scale-98 shadow-md cursor-pointer transition-all`}
              >
                <Trophy className={`${isCompact3Col ? 'w-3 h-3' : 'w-3.5 h-3.5'} shrink-0`} />
                <span className="truncate">{t.claimBingo}</span>
              </button>
            ) : null
          ) : (
            <div className={`w-full ${isCompact3Col ? 'py-1 px-1.5 text-[10px] sm:text-xs' : 'py-1.5 px-2.5 text-[11px] sm:text-xs'} rounded-xl bg-neutral-700 text-white font-extrabold flex items-center justify-center shadow-xs select-none`}>
              <span className="truncate">ጨዋታ ተጠናቋል</span>
            </div>
          )
        ) : cartela.isBlocked ? (
          <div className={`w-full ${isCompact3Col ? 'py-1 px-1 text-[10px]' : 'py-1.5 px-2 text-[11px] sm:text-xs'} rounded-xl bg-rose-600 text-white font-extrabold flex items-center justify-center gap-1`}>
            <Ban className={`${isCompact3Col ? 'w-3 h-3' : 'w-3.5 h-3.5'} shrink-0`} />
            <span className="truncate">{t.blockedCardBadge}</span>
          </div>
        ) : cartela.isRegistered || (isFastBingoMode && gameActive) ? (
          gameActive ? (
            <button
              type="button"
              onClick={() => onClaimBingo(cartela)}
              className={`w-full ${isCompact3Col ? 'py-1 px-1 text-[10px] sm:text-xs font-black' : 'py-1.5 px-2 text-[11px] sm:text-xs font-extrabold'} rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white flex items-center justify-center gap-1 hover:brightness-110 active:scale-98 shadow-md cursor-pointer transition-all`}
            >
              <Trophy className={`${isCompact3Col ? 'w-3 h-3' : 'w-3.5 h-3.5'} shrink-0`} />
              <span className="truncate">{t.claimBingo}</span>
            </button>
          ) : (
            <div
              className={`w-full ${isCompact3Col ? 'py-1 px-1 text-[10px]' : 'py-1.5 px-2 text-[11px] sm:text-xs'} rounded-xl bg-emerald-600 text-white font-extrabold flex items-center justify-center gap-1 shadow-xs select-none`}
              title={t.registered}
            >
              <Lock className={`${isCompact3Col ? 'w-3 h-3' : 'w-3.5 h-3.5'} shrink-0 text-amber-200`} />
              <CheckCircle className={`${isCompact3Col ? 'w-3 h-3' : 'w-3.5 h-3.5'} shrink-0`} />
              <span className="truncate">{t.registered}</span>
            </div>
          )
        ) : (
          <button
            type="button"
            onClick={() => onToggleRegister(cartela.id)}
            className={`w-full ${isCompact3Col ? 'py-1 px-1 text-[10px]' : 'py-1.5 px-2 text-[11px] sm:text-xs'} rounded-xl font-extrabold transition-colors flex items-center justify-center gap-1 cursor-pointer bg-blue-600 text-white hover:bg-blue-700 shadow-xs`}
          >
            <span className="truncate">{t.registerCartela}</span>
          </button>
        )}
      </div>

      {/* B I N G O Colored Column Headers */}
      <div className={`grid grid-cols-5 ${isCompact3Col ? 'gap-0.5 px-1 pt-0.5' : 'gap-1 px-2 pt-1'}`}>
        {BINGO_HEADER_COLS.map((col) => (
          <div
            key={col.char}
            className={`${isCompact3Col ? 'h-5 sm:h-6 text-[10px] sm:text-xs' : 'h-6 sm:h-7 text-xs sm:text-sm'} rounded-md font-extrabold flex items-center justify-center shadow-2xs ${col.bg}`}
          >
            {col.char}
          </div>
        ))}
      </div>

      {/* 5x5 Circular Number Cells */}
      <div className={`grid grid-cols-5 ${isCompact3Col ? 'gap-0.5 p-1' : 'gap-1 p-2'}`}>
        {cartela.numbers.map((row, rIdx) =>
          row.map((num, cIdx) => {
            const isCenterFree = rIdx === 2 && cIdx === 2;
            const isCalledOrActive = calledSet.has(num) || (activeBall !== null && activeBall === num);
            const isMarked = isCenterFree
              ? true
              : autoDaub
              ? calledSet.has(num) || cartela.manualMarks[rIdx][cIdx]
              : cartela.manualMarks[rIdx][cIdx] && isCalledOrActive;

            const isActiveBallCell = !isCenterFree && activeBall !== null && activeBall === num;

            return (
              <button
                key={`${rIdx}-${cIdx}`}
                type="button"
                disabled={cartela.isBlocked || isCenterFree || (!isCalledOrActive && !autoDaub)}
                onClick={() => {
                  if (isCalledOrActive || autoDaub) {
                    onToggleCellDaub(cartela.id, rIdx, cIdx);
                  }
                }}
                title={
                  isCenterFree
                    ? 'Free Space (F)'
                    : isCalledOrActive
                    ? `${num} - የወጣ ቁጥር (ለመጥቆር ይንኩ)`
                    : `${num} - ገና ያልወጣ ቁጥር`
                }
                className={`aspect-square rounded-full font-mono-tabular font-extrabold flex items-center justify-center transition-transform select-none border ${
                  !isCenterFree && !isCalledOrActive && !autoDaub ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                } ${
                  isCompact3Col ? 'text-[10px] sm:text-xs font-black' : 'text-sm sm:text-base font-extrabold'
                } ${
                  isCenterFree
                    ? 'bg-emerald-500 text-white border-emerald-600 shadow-xs scale-105'
                    : isActiveBallCell
                    ? 'bg-gradient-to-br from-yellow-300 via-fuchsia-500 to-rose-600 text-white font-black border-yellow-200 ring-2 ring-yellow-300 shadow-[0_0_14px_rgba(250,204,21,0.9)] scale-110 z-10 animate-pulse'
                    : isMarked
                    ? `${DAUB_COLOR_MAP[daubColor]} shadow-xs`
                    : isDark
                    ? 'bg-slate-800 text-slate-100 border-slate-700 hover:bg-slate-700 active:scale-95'
                    : 'bg-slate-50 text-slate-900 border-slate-300 hover:bg-slate-100 active:scale-95'
                }`}
              >
                {isCenterFree ? 'F' : num}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
