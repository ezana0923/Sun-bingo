import React from 'react';
import { X, Ban, AlertTriangle, ShieldAlert } from 'lucide-react';
import { generateCartelaById } from '../utils/bingoEngine';

interface BlockedCartelaInspectorModalProps {
  isOpen?: boolean;
  cartelaId: number | null;
  reason?: string | null;
  calledBalls?: number[];
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

export const BlockedCartelaInspectorModal: React.FC<BlockedCartelaInspectorModalProps> = ({
  isOpen,
  cartelaId,
  reason,
  calledBalls = [],
  onClose,
  isDark,
}) => {
  if (isOpen === false || cartelaId === null) return null;

  const cartela = generateCartelaById(cartelaId);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[75] flex items-center justify-center p-2 bg-black/80 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-[310px] sm:max-w-[340px] rounded-2xl border p-3 shadow-2xl space-y-2.5 ${
          isDark
            ? 'bg-slate-900 border-rose-500/60 text-slate-100'
            : 'bg-white border-rose-500 text-slate-900'
        }`}
      >
        {/* Top Header */}
        <div
          className={`flex items-center justify-between gap-1.5 pb-2 border-b ${
            isDark ? 'border-slate-700/50' : 'border-slate-200'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center font-extrabold shadow-xs shrink-0">
              <Ban className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-black truncate leading-tight text-rose-400">
                የታገደ ካርቴላ #{cartelaId}
              </h3>
              <p className="text-[10px] text-slate-400 font-bold truncate leading-tight">
                Blocked Cartela Inspection
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-extrabold flex items-center gap-1 cursor-pointer shadow-xs"
          >
            <X className="w-3.5 h-3.5" />
            <span>ተመለስ</span>
          </button>
        </div>

        {/* Reason Banner */}
        <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs space-y-1">
          <div className="flex items-center gap-1.5 font-black text-rose-400">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>የታገደበት ምክንያት፦</span>
          </div>
          <p className="text-[11px] leading-relaxed text-rose-100 font-semibold">
            {reason ||
              'የተሳሳተ ቢንጎ (False Bingo Claim) የተጠየቀው ቁጥር በካርቴላው ቅጥ ውስጥ የለም ወይም ገና አልወጣም።'}
          </p>
        </div>

        {/* 5x5 Numbers Grid with B I N G O Headers */}
        <div
          className={`p-2 rounded-xl border ${
            isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="grid grid-cols-5 gap-1 mb-1 text-center">
            {BINGO_HEADER_COLS.map((col) => (
              <div
                key={col.char}
                className={`py-1 rounded font-black text-xs ${col.bg} shadow-xs select-none`}
              >
                {col.char}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-5 gap-1">
            {cartela.numbers.map((row, rIdx) =>
              row.map((num, cIdx) => {
                const isCenter = rIdx === 2 && cIdx === 2;
                return (
                  <div
                    key={`${rIdx}-${cIdx}`}
                    className={`aspect-square rounded-lg flex items-center justify-center font-mono-tabular font-extrabold text-xs sm:text-sm select-none border ${
                      isCenter
                        ? 'bg-emerald-600 text-white border-emerald-400 font-black'
                        : isDark
                        ? 'bg-slate-800/80 text-rose-200 border-rose-500/20'
                        : 'bg-white text-rose-800 border-rose-200'
                    }`}
                  >
                    {isCenter ? 'F' : num}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="pt-1 flex justify-center">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-black cursor-pointer transition-colors"
          >
            ዝጋ (Close)
          </button>
        </div>
      </div>
    </div>
  );
};
