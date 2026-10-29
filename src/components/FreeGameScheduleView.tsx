import React, { useEffect, useState } from 'react';
import { Clock, Gift, Sparkles, PlayCircle, BookOpen, Zap } from 'lucide-react';
import { HeroBannerAd, Language } from '../types/bingo';
import { TRANSLATIONS } from '../utils/translations';
import { BINGO_PATTERNS } from '../data/bingoPatterns';

interface FreeGameScheduleViewProps {
  heroBanners: HeroBannerAd[];
  activePatternId: number;
  language: Language;
  isDark: boolean;
  onGoToPlay: () => void;
  onStartFastBingo?: (patternId?: number) => void;
  onOpenRulesModal: () => void;
  onTriggerFreeDemoGame: () => void;
}

const FREE_SCHEDULE_SLOTS = [
  {
    id: 'slot-1',
    ethTimeLabel: '2:00 ጥዋት (Morning)',
    stdHour: 8,
    stdMin: 0,
    prizeEtb: 1500,
    titleAm: 'የጥዋት ነፃ ቢንጎ ጨዋታ',
  },
  {
    id: 'slot-2',
    ethTimeLabel: '8:00 ቀን (Afternoon)',
    stdHour: 14,
    stdMin: 0,
    prizeEtb: 2500,
    titleAm: 'የቀን ልዩ ነፃ ቢንጎ ጨዋታ',
  },
  {
    id: 'slot-3',
    ethTimeLabel: '12:00 ከምሽቱ (Evening)',
    stdHour: 18,
    stdMin: 0,
    prizeEtb: 4000,
    titleAm: 'የምሽት ነፃ ቢንጎ ጨዋታ',
  },
  {
    id: 'slot-4',
    ethTimeLabel: '4:30 ማታ (Night)',
    stdHour: 22,
    stdMin: 30,
    prizeEtb: 5000,
    titleAm: 'የማታ ታላቅ ነፃ ቢንጎ ጨዋታ',
  },
];

export const FreeGameScheduleView: React.FC<FreeGameScheduleViewProps> = ({
  heroBanners,
  activePatternId,
  language,
  isDark,
  onGoToPlay,
  onStartFastBingo,
  onOpenRulesModal,
  onTriggerFreeDemoGame,
}) => {
  const t = TRANSLATIONS[language];
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getCountdownString = (targetHour: number, targetMin: number) => {
    const target = new Date(now);
    target.setHours(targetHour, targetMin, 0, 0);
    if (target.getTime() <= now.getTime()) {
      target.setDate(target.getDate() + 1);
    }
    const diffSec = Math.max(0, Math.floor((target.getTime() - now.getTime()) / 1000));
    const hrs = Math.floor(diffSec / 3600);
    const mins = Math.floor((diffSec % 3600) / 60);
    const secs = diffSec % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const currentRule =
    BINGO_PATTERNS.find((r) => r.id === activePatternId) || BINGO_PATTERNS[0];

  return (
    <div className="space-y-5">
      {/* ⚡ FAST BINGO (ፈጣን ቢንጎ አፕ) SPOTLIGHT BANNER */}
      {onStartFastBingo && (
        <div className="rounded-2xl p-4 sm:p-5 bg-gradient-to-r from-amber-500 via-orange-600 to-rose-600 text-white shadow-xl border border-amber-300/40 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-slate-950/30 text-amber-200 text-xs font-extrabold">
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>⚡ EZI FAST BINGO APP · ለብቻው የተዘጋጀ ፈጣን ቢንጎ አፕ</span>
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold">
              የፈጣን ቢንጎ አፕ፦ 1 መስመር (Horizontal, Vertical, Diagonal) ወይም 4ቱ የማዕዘን ካስ!
            </h2>
            <p className="text-xs sm:text-sm text-amber-100 font-semibold">
              በማንኛውም 1 መስመር (የተኛ፣ የቆመ፣ ዲያጎናል) ወይም በ 4ቱ የማዕዘን ካሶች (4 Corners) ወዲያውኑ የሚያሸንፉበት ራሱን የቻለ አፕ!
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onStartFastBingo()}
              className="px-4 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-900 text-amber-400 font-extrabold text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer shadow-lg"
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>⚡ የፈጣን ቢንጎ አፕ ክፈት (Open Fast Bingo App)</span>
            </button>
          </div>
        </div>
      )}
      {/* Hero Banners & Promotional Ads Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {heroBanners.map((banner) => {
          const gradientClass =
            banner.accentColor === 'emerald'
              ? 'from-emerald-700 via-teal-700 to-slate-900 border-emerald-500/40'
              : banner.accentColor === 'amber'
              ? 'from-amber-600 via-orange-700 to-slate-900 border-amber-500/40'
              : banner.accentColor === 'rose'
              ? 'from-rose-700 via-red-800 to-slate-900 border-rose-500/40'
              : 'from-blue-700 via-indigo-800 to-slate-900 border-blue-500/40';

          return (
            <div
              key={banner.id}
              className={`rounded-2xl overflow-hidden bg-gradient-to-br ${gradientClass} text-white border shadow-lg flex flex-col justify-between`}
            >
              {banner.imageUrl && (
                <div className="w-full h-36 sm:h-44 overflow-hidden bg-slate-950/50 border-b border-white/15">
                  <img
                    src={banner.imageUrl}
                    alt={banner.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <div className="inline-flex items-center gap-1.5 text-xs font-extrabold text-amber-300 mb-2">
                    <Sparkles className="w-4 h-4" />
                    <span>{banner.badgeText}</span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-extrabold leading-snug">
                    {banner.title}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-200 mt-1.5 leading-relaxed">
                    {banner.subtitle}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 mt-4 pt-3 border-t border-white/15">
                  <button
                    type="button"
                    onClick={onGoToPlay}
                    className="px-4 py-2 rounded-xl bg-white text-slate-950 font-extrabold text-xs flex items-center gap-1.5 hover:bg-slate-100 cursor-pointer"
                  >
                    <PlayCircle className="w-4 h-4 text-emerald-600" />
                    <span>ወደ ጨዋታ ግባ (Play Now)</span>
                  </button>

                  <button
                    type="button"
                    onClick={onOpenRulesModal}
                    className="px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>{t.rulesAndPatterns} (16)</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Active Game Rule Preview Banner */}
      <div
        className={`rounded-2xl border p-4 flex flex-wrap items-center justify-between gap-3 ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <div>
          <div className="text-xs font-bold text-emerald-500">
            የአሁኑ ዙር አሸናፊ ቅጥ (Current Winning Rule #{currentRule.id})
          </div>
          <div className="text-sm sm:text-base font-extrabold mt-0.5 flex items-center gap-2">
            <span>{currentRule.titleAm}</span>
            <button
              type="button"
              onClick={onOpenRulesModal}
              title="የጨዋታውን አይነት በምስል እይ"
              className="w-6 h-6 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-400 hover:bg-amber-500 hover:text-slate-950 flex items-center justify-center cursor-pointer transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {currentRule.descAm}
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenRulesModal}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold cursor-pointer whitespace-nowrap"
        >
          የአሁኑን ጨዋታ አሸናፊ ቅጥ እይ (View Pattern)
        </button>
      </div>

      {/* Daily Free Game Schedule (2:00 ጥዋት, 8:00 ቀን, 12:00 ከምሽቱ, 4:30 ማታ) */}
      <div
        className={`rounded-2xl border p-4 sm:p-5 ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-emerald-500" />
            <h3 className="text-base sm:text-lg font-extrabold">
              {t.freeGameSchedule} (በየቀኑ በ 2:00 ጥዋት፣ 8:00 ቀን፣ 12:00 ከምሽቱ እና 4:30 ማታ)
            </h3>
          </div>

          <button
            type="button"
            onClick={onTriggerFreeDemoGame}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold cursor-pointer"
          >
            ነፃ ጨዋታ አሁን ሞክር (Start Free Round Now)
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {FREE_SCHEDULE_SLOTS.map((slot) => {
            const countdown = getCountdownString(slot.stdHour, slot.stdMin);
            return (
              <div
                key={slot.id}
                className={`p-4 rounded-2xl border flex flex-col justify-between ${
                  isDark
                    ? 'bg-slate-800/60 border-slate-700'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-500 mb-1">
                    <span>ነፃ ጨዋታ (FREE)</span>
                    <Clock className="w-4 h-4" />
                  </div>
                  <div className="text-base font-extrabold">{slot.ethTimeLabel}</div>
                  <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {slot.titleAm}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-700/20 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase opacity-70 font-bold">ሽልማት</div>
                    <div className="text-sm font-extrabold font-mono-tabular text-amber-500">
                      {slot.prizeEtb} ETB
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase opacity-70 font-bold">ቀሪ ጊዜ (Countdown)</div>
                    <div className="text-sm font-extrabold font-mono-tabular text-blue-500">
                      {countdown}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
