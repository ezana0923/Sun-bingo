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

  const bonusCopy = {
    am: {
      title: 'የካርቴላ ቦነስ ደረጃዎች',
      freeBonus: 'ነፃ ቦነስ',
      minHint: '5+ ካርቴላ → 1 ቦነስ',
      viewTiers: 'የቦነስ ደረጃዎች እይ',
      tierDesc:
        '5 ተጨማሪ ካርቴላ ከገዙ 1 የቦነስ ካርቴላ ያገኛሉ። ቦነስ በራሱ ይሰጣል፤ ካርቴላ ብቻ ያስመዝግቡ። አንድ ደረጃ ሲደርሱ ነጻ ካርቴላዎቹ ከሚያስመዘግቧቸው ካርቴላዎች ይወሰዳሉ፣ የሚከፍሉት ለቀሪዎቹ ብቻ ነው። ቦነስ የሚሰጠው ጨዋታው ከመጀመሩ በፊት ብቻ ነው።',
    },
    ti: {
      title: 'ደረጃታት ቦነስ ካርቴላ',
      freeBonus: 'ናጻ ቦነስ',
      minHint: '5+ ካርቴላ → 1 ቦነስ',
      viewTiers: 'ደረጃታት ቦነስ ርአ',
      tierDesc:
        '5 ተወሳኺ ካርቴላ እንተገዚእኩም 1 ናይ ቦነስ ካርቴላ ትረኽቡ። ቦነስ ብርእሱ ይውሃብ፤ ካርቴላ ጥራይ ኣመዝግቡ። ደረጃ ምስ በጻሕኩም ነጻ ካርቴላታት ካብ ዝተመዝገቡ ይውሰዱ እሞ ነቲ ዝተረፈ ጥራይ ትኸፍሉ። ቦነስ ጸወታ ቅድሚ ምጅማሩ ጥራይ ይውሃብ።',
    },
    om: {
      title: 'Sadarkaalee Boonasii Kaartelaa',
      freeBonus: 'Boonasii Bilisaa',
      minHint: 'Kaartelaa 5+ → Boonasii 1',
      viewTiers: 'Sadarkaalee Boonasii Ilaali',
      tierDesc:
        'Kaartelaa dabalataa 5 yoo bittan kaartelaa boonasii 1 argattu. Boonasiin ofumaan kennama; kaartelaa qofa galmeessaa. Yeroo sadarkaa tokko geessan kaartelaawwan bilisaa warra galmeessitan keessaa hir’ifamanii kan hafe qofaaf kaffaltu. Boonasiin taphni osoo hin jalqabin dura qofa kennama.',
    },
    en: {
      title: 'Cartela Bonus Tiers',
      freeBonus: 'Free Bonus',
      minHint: '5+ Cards → 1 Bonus',
      viewTiers: 'View Tiers',
      tierDesc:
        'Buy 5 additional cartelas and get 1 bonus cartela. Bonus is awarded automatically; simply register your cards. When you reach a tier, the free bonus cards are deducted from your registered cards and you only pay for the remainder. Bonus is granted strictly before game start.',
    },
  }[language];

  const isLocal = language !== 'en';

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
                {bonusCopy.title}
              </h4>
              {bonus.bonusCount > 0 ? (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[11px] font-black font-mono-tabular">
                  +{bonus.bonusCount} {bonusCopy.freeBonus}
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[10px] font-bold">
                  {bonusCopy.minHint}
                </span>
              )}
            </div>

            <p className="text-[11px] text-slate-300 mt-0.5">
              {isLocal ? bonus.tierLabelAm : bonus.tierLabelEn}
              {bonus.nextTierHintAm && (
                <span className="text-amber-300 font-bold ml-1.5">
                  ({isLocal ? bonus.nextTierHintAm : bonus.nextTierHintEn})
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
          <span>{bonusCopy.viewTiers}</span>
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
            {bonusCopy.tierDesc}
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
                  <span className="font-bold">{isLocal ? tier.labelAm : tier.labelEn}</span>
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
