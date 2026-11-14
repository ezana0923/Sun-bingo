import React, { useState } from 'react';
import { X, Trophy, CheckCircle2, Eye, Shield } from 'lucide-react';
import { generateCartelaById, getLetterForBall, formatWinnerPhone } from '../utils/bingoEngine';
import { WinnerAnnouncement } from '../types/bingo';

interface WinnerCartelaInspectorModalProps {
  winner: WinnerAnnouncement | null;
  roundId?: number | string;
  countdownSeconds?: number | null;
  preGameHash?: string;
  onOpenVerifyModal?: () => void;
  onClose: () => void;
  isDark: boolean;
}

const BINGO_HEADER_COLS = [
  { char: 'B', bg: 'bg-emerald-600 text-white' },
  { char: 'I', bg: 'bg-rose-600 text-white' },
  { char: 'N', bg: 'bg-sky-600 text-white' },
  { char: 'G', bg: 'bg-blue-600 text-white' },
  { char: 'O', bg: 'bg-amber-500 text-white' },
];

export const WinnerCartelaInspectorModal: React.FC<
  WinnerCartelaInspectorModalProps
> = ({ winner, roundId, countdownSeconds, preGameHash, onOpenVerifyModal, onClose, isDark }) => {
  const [hashCopied, setHashCopied] = useState(false);

  if (!winner) return null;

  const cartela = generateCartelaById(winner.cartelaId);
  const calledSet = new Set(winner.calledBallsSnapshot);
  const winningCoordSet = new Set(
    winner.winningCells.map(([r, c]) => `${r},${c}`)
  );

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[70] flex items-center justify-center p-2 bg-black/80 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-[295px] sm:max-w-[320px] rounded-2xl border p-2.5 shadow-2xl space-y-1.5 ${
          isDark
            ? 'bg-slate-900 border-emerald-500/60 text-slate-100'
            : 'bg-white border-emerald-500 text-slate-900'
        }`}
      >
        {/* Top Header with Prominent Back/Close Button */}
        <div
          className={`flex items-center justify-between gap-1.5 pb-1.5 border-b ${
            isDark
              ? 'border-slate-700/50'
              : 'border-slate-200'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center font-extrabold shadow-xs shrink-0">
              <Trophy className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] uppercase font-bold text-amber-400">አሸናፊ ተጫዋች</span>
                <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono-tabular font-extrabold text-[9px] border border-emerald-500/40">
                  #{winner.cartelaId}
                </span>
              </div>
              <h3 className="text-sm font-black text-white truncate leading-tight">
                {winner.userName}
              </h3>
              <p className="text-[11px] font-mono-tabular font-bold text-slate-300 flex items-center gap-1 leading-tight">
                <span className="text-amber-400">📱</span>
                <span className="tracking-wide text-white">{formatWinnerPhone(winner.userPhone)}</span>
                <span className="text-slate-400">•</span>
                <span className="text-emerald-400 font-extrabold ml-1">+{winner.prizeAmount.toFixed(0)} ETB</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {countdownSeconds !== undefined && countdownSeconds !== null && (
              <span className="px-1.5 py-0.5 rounded-md bg-amber-500 text-slate-950 font-mono-tabular text-[10px] font-black">
                {countdownSeconds}s
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-extrabold flex items-center gap-1 cursor-pointer shadow-xs"
            >
              <X className="w-3.5 h-3.5" />
              <span>ተመለስ</span>
            </button>
          </div>
        </div>

        {/* Ultra-Compact Single-Line Pattern & Last Ball Info */}
        <div
          className={`px-2 py-1 rounded-lg border text-[10px] flex items-center justify-between gap-1.5 ${
            isDark
              ? 'bg-slate-800/80 border-slate-700'
              : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="font-extrabold flex items-center gap-1 text-emerald-400 truncate min-w-0">
            <CheckCircle2 className="w-3 h-3 shrink-0" />
            <span className="truncate">{winner.patternTitle}</span>
          </div>
          <div className="font-mono-tabular font-bold shrink-0">
            <span className="px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 font-extrabold">
              {getLetterForBall(winner.lastBall)}-{winner.lastBall}
            </span>{' '}
            <span className="opacity-75">({winner.calledBallsSnapshot.length}/75)</span>
          </div>
        </div>

        {/* Ultra-Compact 5x5 Winning Cartela Board */}
        <div
          className={`p-2 rounded-xl border ${
            isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between px-2.5 py-1 mb-1.5 rounded-lg bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 text-white text-[11px] font-extrabold shadow-xs">
            <span className="font-mono-tabular font-black">ካርቴላ #{winner.cartelaId}</span>
            <div className="text-right leading-tight">
              <span className="block font-black text-white text-xs">{winner.userName}</span>
              <span className="block text-[10px] font-mono-tabular text-amber-300 font-bold">
                📱 {formatWinnerPhone(winner.userPhone)} •
              </span>
            </div>
          </div>

          <div className="max-w-[205px] mx-auto">
            <div className="grid grid-cols-5 gap-1 mb-1">
              {BINGO_HEADER_COLS.map((col) => (
                <div
                  key={col.char}
                  className={`h-5 rounded font-extrabold text-[10px] flex items-center justify-center ${col.bg}`}
                >
                  {col.char}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-5 gap-1">
              {cartela.numbers.map((row, rIdx) =>
                row.map((num, cIdx) => {
                  const isCenterFree = rIdx === 2 && cIdx === 2;
                  const isWinningPatternCell = winningCoordSet.has(`${rIdx},${cIdx}`);
                  const isCalled = isCenterFree || calledSet.has(num);
                  const isLastBall = !isCenterFree && num === winner.lastBall;

                  return (
                    <div
                      key={`${rIdx}-${cIdx}`}
                      className={`h-6.5 rounded-full font-mono-tabular font-extrabold text-[11px] flex items-center justify-center border ${
                        isLastBall
                          ? 'bg-amber-400 text-slate-950 border-white ring-1 ring-amber-300 shadow-xs'
                          : isWinningPatternCell
                          ? 'bg-emerald-600 text-white border-emerald-400 shadow-2xs'
                          : isCalled
                          ? 'bg-blue-600/75 text-white border-blue-400'
                          : isDark
                          ? 'bg-slate-800 text-slate-400 border-slate-700'
                          : 'bg-white text-slate-500 border-slate-200'
                      }`}
                    >
                      {isCenterFree ? 'F' : num}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 mt-1.5 pt-1 border-t border-slate-700/20 text-[9px] font-bold">
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block" />
              አሸናፊ ቅጥ
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
              የመጨረሻ ({winner.lastBall})
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" />
              የወጡ
            </span>
          </div>
        </div>

        {/* Single-Line Pre-Game Locked SHA-256 Hash below the winning cartela */}
        {/* Compact 2-Line Pre-Game Locked SHA-256 Hash below the winning cartela */}
        {preGameHash && (
          <div
            className={`p-1.5 rounded-xl border space-y-1 ${
              isDark
                ? 'bg-slate-950 border-emerald-500/40 text-slate-100'
                : 'bg-emerald-50/80 border-emerald-300 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between gap-1">
              <span className="text-[9px] font-black text-emerald-500 flex items-center gap-1 shrink-0">
                <Shield className="w-2.5 h-2.5 shrink-0" />
                <span>ቅድመ-ጨዋታ የተቆለፈ SHA-256 ሃሽ (Pre-Game Hash - ዙር #{roundId || '1'})፦</span>
              </span>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    if (typeof navigator !== 'undefined' && navigator.clipboard) {
                      navigator.clipboard.writeText(preGameHash).catch(() => {});
                      setHashCopied(true);
                      setTimeout(() => setHashCopied(false), 2000);
                    }
                  }}
                  className="px-1.5 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[8.5px] font-black cursor-pointer shadow-2xs"
                >
                  {hashCopied ? '✓ ተገልብጧል' : 'ኮፒ (Copy)'}
                </button>
                {onOpenVerifyModal && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenVerifyModal();
                    }}
                    className={`px-1.5 py-0.5 rounded border text-[8.5px] font-bold cursor-pointer shadow-2xs ${
                      isDark
                        ? 'bg-slate-800 border-emerald-500/40 text-emerald-400 hover:bg-slate-700'
                        : 'bg-white border-emerald-300 text-emerald-800 hover:bg-emerald-100'
                    }`}
                  >
                    አረጋግጥ (Verify)
                  </button>
                )}
              </div>
            </div>

            <div
              className={`p-1 rounded font-mono-tabular text-[8.5px] leading-tight select-all break-all border ${
                isDark
                  ? 'bg-slate-900 border-slate-800 text-emerald-300'
                  : 'bg-white border-emerald-200 text-emerald-900'
              }`}
              title={preGameHash}
            >
              {preGameHash}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="w-full py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>← ተመለስ / ዝጋ (Back)</span>
        </button>
      </div>
    </div>
  );
};
