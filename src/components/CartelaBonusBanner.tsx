import React, { useState } from 'react';
import { Gift, ChevronDown, ChevronUp, Sparkles, CheckCircle2 } from 'lucide-react';
import { BONUS_TIERS_CONFIG, calculateCartelaBonus } from '../utils/cartelaBonus';
import { Language } from '../types/bingo';

interface CartelaBonusBannerProps {
  registeredCount: number;
  stakeAmount: number;
  language: Language;
  isDark?: boolean;
}

export const CartelaBonusBanner: React.FC<CartelaBonusBannerProps> = ({
  registeredCount,
  stakeAmount,
  language,
  isDark = true,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const bonus = calculateCartelaBonus(registeredCount, stakeAmount);

  const isAm = language === 'am';

  return (
    <div
      className={`rounded-2xl border transition-all overflow-hidden ${
        isDark
          ? 'bg-gradient-to-r from-amber-950/40 via-slate-900 to-amber-950/30 border-amber-500/40 text-slate-100'
          : 'bg-gradient-to-r from-amber-50 via-white to-amber-50 border-amber-300 text-slate-900'
      }`}
    >
      <div className="p-3 sm:p-3.5 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 flex-1 min-w-[240px]">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 flex items-center justify-center font-black shadow-md shrink-0">
            <Gift className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs sm:text-sm font-black text-amber-400">
                {isAm ? 'የካርቴላ ቦነስ ደረጃዎች' : 'Cartela Bonus Tiers'}
              </h4>
              {bonus.bonusCount > 0 ? (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[11px] font-black font-mono-tabular">
                  +{bonus.bonusCount} {isAm ? 'ነፃ ቦነስ' : 'Free Bonus'}
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[10px] font-bold">
                  {isAm ? '5+ ካርቴላ → 1 ቦነስ' : '5+ Cards → 1 Bonus'}
                </span>
              )}
            </div>

            <p className="text-[11px] text-slate-300 mt-0.5">
              {isAm ? bonus.tierLabelAm : bonus.tierLabelEn}
              {bonus.nextTierHintAm && (
                <span className="text-amber-300 font-bold ml-1.5">
                  ({isAm ? bonus.nextTierHintAm : bonus.nextTierHintEn})
                </span>
              )}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className={`px-3 py-1.5 rounded-xl border text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all ${
            isDark
              ? 'bg-slate-800/80 hover:bg-slate-700 border-amber-500/30 text-amber-300'
              : 'bg-white hover:bg-amber-100 border-amber-300 text-amber-800'
          }`}
        >
          <span>{isAm ? 'የቦነስ ደረጃዎች እይ' : 'View Tiers'}</span>
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Expanded Tiers Breakdown */}
      {isExpanded && (
        <div
          className={`p-3.5 border-t space-y-2.5 ${
            isDark ? 'border-amber-500/20 bg-slate-950/60' : 'border-amber-200 bg-amber-50/50'
          }`}
        >
          <p className="text-xs text-slate-300 leading-relaxed">
            {isAm
              ? '5 ተጨማሪ ካርቴላ ከገዙ 1 የቦነስ ካርቴላ ያገኛሉ። ቦነስ በራሱ ይሰጣል፤ ካርቴላ ብቻ ያስመዝግቡ። አንድ ደረጃ ሲደርሱ ነጻ ካርቴላዎቹ ከሚያስመዘግቧቸው ካርቴላዎች ይወሰዳሉ፣ የሚከፍሉት ለቀሪዎቹ ብቻ ነው። ቦነስ የሚሰጠው ጨዋታው ከመጀመሩ በፊት ብቻ ነው።'
              : 'Buy 5 additional cartelas and get 1 bonus cartela. Bonus is awarded automatically; simply register your cards. When you reach a tier, the free bonus cards are deducted from your registered cards and you only pay for the remainder. Bonus is granted strictly before game start.'}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 font-mono-tabular">
            {BONUS_TIERS_CONFIG.map((tier) => {
              const isCurrentTier = registeredCount >= tier.minCards;
              return (
                <div
                  key={tier.minCards}
                  className={`p-2 rounded-xl border flex items-center justify-between text-xs transition-all ${
                    isCurrentTier
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-black'
                      : isDark
                      ? 'bg-slate-900/60 border-slate-800 text-slate-400'
                      : 'bg-white border-slate-200 text-slate-700'
                  }`}
                >
                  <span className="font-bold">{isAm ? tier.labelAm : tier.labelEn}</span>
                  {isCurrentTier && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
