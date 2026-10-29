import React, { useState } from 'react';
import { X, Plus, Sparkles, Search, Shuffle } from 'lucide-react';

interface CartelaSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCount: number;
  maxCartelas: number;
  maxPoolId?: number;
  blockedCartelaIds: number[];
  existingCartelaIds: number[];
  bonusCartelasForOver20?: number;
  isDark: boolean;
  onAddBatchCartelas: (count: number) => void;
  onAddSpecificCartela: (id: number) => void;
}

const BATCH_OPTIONS = [1, 2, 3, 5, 10, 15, 20, 25, 30];

export const CartelaSelectorModal: React.FC<CartelaSelectorModalProps> = ({
  isOpen,
  onClose,
  currentCount,
  maxCartelas,
  maxPoolId = 70000,
  blockedCartelaIds,
  existingCartelaIds,
  bonusCartelasForOver20 = 5,
  isDark,
  onAddBatchCartelas,
  onAddSpecificCartela,
}) => {
  const [specificIdInput, setSpecificIdInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const remainingCapacity = Math.max(0, maxCartelas - currentCount);

  const handleSpecificAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const parsed = parseInt(specificIdInput, 10);
    if (isNaN(parsed) || parsed < 1 || parsed > maxPoolId) {
      setErrorMsg(maxPoolId <= 500 ? `እባክዎ ከ 1 እስከ 500 ውስጥ ያለ የካርቴላ ቁጥር ያስገቡ።` : `እባክዎ ትክክለኛ የካርቴላ ቁጥር ያስገቡ።`);
      return;
    }
    if (blockedCartelaIds.includes(parsed)) {
      setErrorMsg(`ካርቴላ #${parsed} ታግዷል (Blocked)! ሌላ ቁጥር ይምረጡ።`);
      return;
    }
    if (existingCartelaIds.includes(parsed)) {
      setErrorMsg(`ካርቴላ #${parsed} ቀድሞውኑ ተመርጧል!`);
      return;
    }
    if (remainingCapacity <= 0) {
      setErrorMsg(`ከፍተኛው የካርቴላ መጠን (${maxCartelas}) ደርሷል!`);
      return;
    }
    onAddSpecificCartela(parsed);
    setSpecificIdInput('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-sm">
      <div
        className={`w-full max-w-lg rounded-2xl border p-5 shadow-2xl ${
          isDark
            ? 'bg-slate-900 border-slate-700 text-slate-100'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-700/30">
          <div>
            <h3 className="text-base sm:text-lg font-extrabold flex items-center gap-2">
              <Plus className="w-5 h-5 text-emerald-500" />
              <span>ካርቴላ መምረጫ {maxCartelas <= 5 ? '(የነፃ ጨዋታ — 5 ካርቴላ ብቻ)' : ''}</span>
            </h3>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              አሁን የያዙት፦ {currentCount}/{maxCartelas}
              {maxCartelas <= 5
                ? ' · የነፃ ጨዋታ 5 ካርቴላ ብቻ ነው የሚፈቀደው!'
                : bonusCartelasForOver20 > 0
                ? ` · ከ20 በላይ ላስመዘገበ +${bonusCartelasForOver20} ካርቴላ ቦነስ በነፃ ይሰጣል!`
                : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-rose-600 text-white hover:bg-rose-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Bonus Banner */}
        {maxCartelas <= 5 ? (
          <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-blue-500/20 border border-emerald-500/40 mb-4 flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-emerald-400 shrink-0" />
            <p className="text-xs font-bold">
              🎁 የነፃ ጨዋታ ሕግ፦ በነፃ ጨዋታ እያንዳንዱ ተጫዋች{' '}
              <span className="text-emerald-400 underline">እስከ 5 ካርቴላ ብቻ</span> መምረጥ እና ማስመዝገብ ይችላል!
            </p>
          </div>
        ) : (
          bonusCartelasForOver20 > 0 && (
            <div className="p-3 rounded-xl bg-gradient-to-r from-amber-500/20 via-emerald-500/20 to-blue-500/20 border border-amber-500/40 mb-4 flex items-center gap-2.5">
              <Sparkles className="w-5 h-5 text-amber-500 shrink-0" />
              <p className="text-xs font-bold">
                ልዩ ቦነስ፦ ከ 20 በላይ ካርቴላ ለሚያስመዘግቡ ተጫዋቾች{' '}
                <span className="text-emerald-500 underline">
                  +{bonusCartelasForOver20} ተጨማሪ ካርቴላ በነፃ (FREE Bonus)
                </span>{' '}
                ወዲያውኑ ይጨመራል!
              </p>
            </div>
          )
        )}

        {/* Quick Batch Selection Grid */}
        <div className="mb-5">
          <label className="block text-xs font-bold mb-2">
            {maxCartelas <= 5
              ? 'በብዛት ይምረጡ (ከ 1 እስከ 5 ካርቴላ ብቻ)፦'
              : 'በብዛት ይምረጡ (1, 2, 3, 5, 10, 15, 20, 25, 30 ካርቴላዎች)፦'}
          </label>
          <div className="grid grid-cols-3 gap-2.5">
            {BATCH_OPTIONS.filter((count) => count <= maxCartelas).map((count) => {
              const hasBonus = count > 20 && bonusCartelasForOver20 > 0 && maxCartelas > 5;
              return (
                <button
                  key={count}
                  type="button"
                  onClick={() => {
                    onAddBatchCartelas(count);
                    onClose();
                  }}
                  className={`py-3 px-3 rounded-xl font-extrabold text-sm flex flex-col items-center justify-center border transition-all cursor-pointer active:scale-95 ${
                    hasBonus
                      ? 'bg-gradient-to-br from-emerald-600 to-teal-700 text-white border-emerald-400 shadow-md'
                      : isDark
                      ? 'bg-slate-800 hover:bg-blue-600 text-slate-100 border-slate-700'
                      : 'bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-900 border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <Shuffle className="w-3.5 h-3.5 opacity-80" />
                    <span>{count} ካርቴላ</span>
                  </div>
                  {hasBonus && (
                    <span className="text-[10px] font-bold text-amber-300 mt-0.5">
                      +{bonusCartelasForOver20} ነፃ ቦነስ!
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* If maxPoolId <= 500 (Fast Bingo), show the 1 to 500 visual number grid as well */}
        {maxPoolId <= 500 && (
          <div className="mb-4">
            <label className="block text-xs font-bold mb-1.5 text-teal-400">
              ከ 1 – {maxPoolId} ቁጥር ነክተው ይምረጡ፦
            </label>
            <div className="max-h-56 overflow-y-auto rounded-xl bg-[#092329] p-2 border border-teal-500/30">
              <div className="grid grid-cols-10 gap-1">
                {Array.from({ length: maxPoolId }, (_, i) => i + 1).map((num) => {
                  const isTaken = existingCartelaIds.includes(num);
                  const isBlocked = blockedCartelaIds.includes(num);
                  return (
                    <button
                      key={num}
                      type="button"
                      disabled={isBlocked}
                      onClick={() => {
                        if (!isTaken) {
                          onAddSpecificCartela(num);
                        }
                      }}
                      className={`h-8 rounded-lg text-xs font-extrabold font-mono-tabular flex items-center justify-center cursor-pointer transition-all ${
                        isBlocked
                          ? 'bg-rose-700/80 text-white/70 cursor-not-allowed'
                          : isTaken
                          ? 'bg-[#24c65a] text-white shadow'
                          : 'bg-[#1e3a42] hover:bg-[#294d57] text-white'
                      }`}
                    >
                      {num}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Specific Cartela ID Search (1 - maxPoolId) */}
        <form onSubmit={handleSpecificAdd} className="space-y-2">
          <label className="block text-xs font-bold">
            {maxPoolId <= 500
              ? `ወይም የሚፈልጉትን ካርቴላ ቁጥር (1 – ${maxPoolId}) በእጅ ያስገቡ፦`
              : 'ወይም የሚፈልጉትን የካርቴላ ቁጥር በእጅ ያስገቡ፦'}
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="number"
                min={1}
                max={maxPoolId}
                value={specificIdInput}
                onChange={(e) => setSpecificIdInput(e.target.value)}
                placeholder={maxPoolId <= 500 ? 'ምሳሌ: 125' : 'ምሳሌ: 22185'}
                className={`w-full pl-9 pr-3 py-2.5 rounded-xl text-sm font-mono-tabular border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isDark
                    ? 'bg-slate-800 border-slate-700 text-white'
                    : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs sm:text-sm whitespace-nowrap cursor-pointer"
            >
              ጨምር (Add)
            </button>
          </div>
          {errorMsg && <p className="text-xs font-bold text-rose-500">{errorMsg}</p>}
        </form>
      </div>
    </div>
  );
};
