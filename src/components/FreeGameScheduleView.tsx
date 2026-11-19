import React, { useEffect, useState } from 'react';
import { Clock, Gift, Sparkles, PlayCircle, BookOpen, Zap } from 'lucide-react';
import { HeroBannerAd, Language } from '../types/bingo';
import { TRANSLATIONS } from '../utils/translations';
import { BINGO_PATTERNS, getRuleTitleByLang } from '../data/bingoPatterns';
import { localizeHeroAd } from '../utils/adTranslations';

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

const FREE_SCHEDULE_SLOTS: {
  id: string;
  ethTimeLabel: Record<Language, string>;
  stdHour: number;
  stdMin: number;
  prizeEtb: number;
  title: Record<Language, string>;
}[] = [
  {
    id: 'slot-1',
    ethTimeLabel: {
      am: '2:00 ጥዋት (Morning)',
      ti: '2:00 ንግሆ (Morning)',
      om: '2:00 Ganama (Morning)',
      en: '8:00 AM (Morning)',
    },
    stdHour: 8,
    stdMin: 0,
    prizeEtb: 1500,
    title: {
      am: 'የጥዋት ነፃ ቢንጎ ጨዋታ',
      ti: 'ናይ ንግሆ ናጻ ቢንጎ ጸወታ',
      om: 'Tapha Biingoo Bilisaa Ganamaa',
      en: 'Morning Free Bingo Round',
    },
  },
  {
    id: 'slot-2',
    ethTimeLabel: {
      am: '8:00 ቀን (Afternoon)',
      ti: '8:00 ድሕሪ ቀትሪ (Afternoon)',
      om: '8:00 Guyyaa (Afternoon)',
      en: '2:00 PM (Afternoon)',
    },
    stdHour: 14,
    stdMin: 0,
    prizeEtb: 2500,
    title: {
      am: 'የቀን ልዩ ነፃ ቢንጎ ጨዋታ',
      ti: 'ናይ ቀትሪ ፍሉይ ናጻ ቢንጎ ጸወታ',
      om: 'Tapha Biingoo Bilisaa Addaa Guyyaa',
      en: 'Afternoon Special Free Bingo',
    },
  },
  {
    id: 'slot-3',
    ethTimeLabel: {
      am: '12:00 ከምሽቱ (Evening)',
      ti: '12:00 ምሸት (Evening)',
      om: '12:00 Galgala (Evening)',
      en: '6:00 PM (Evening)',
    },
    stdHour: 18,
    stdMin: 0,
    prizeEtb: 4000,
    title: {
      am: 'የምሽት ነፃ ቢንጎ ጨዋታ',
      ti: 'ናይ ምሸት ናጻ ቢንጎ ጸወታ',
      om: 'Tapha Biingoo Bilisaa Galgalaa',
      en: 'Evening Free Bingo Round',
    },
  },
  {
    id: 'slot-4',
    ethTimeLabel: {
      am: '4:30 ማታ (Night)',
      ti: '4:30 ለይቲ (Night)',
      om: '4:30 Halkan (Night)',
      en: '10:30 PM (Night)',
    },
    stdHour: 22,
    stdMin: 30,
    prizeEtb: 5000,
    title: {
      am: 'የማታ ታላቅ ነፃ ቢንጎ ጨዋታ',
      ti: 'ናይ ለይቲ ዓብዪ ናጻ ቢንጎ ጸወታ',
      om: 'Tapha Biingoo Bilisaa Guddaa Halkanii',
      en: 'Late Night Grand Free Bingo',
    },
  },
];

const SCHEDULE_TEXT: Record<
  Language,
  {
    fastTag: string;
    fastHeadline: string;
    fastSub: string;
    openFastBtn: string;
    playNow: string;
    currentRuleLabel: string;
    viewPatternBtn: string;
    viewPatternTitle: string;
    dailyTimesNote: string;
    tryFreeNow: string;
    freeTag: string;
    prizeLabel: string;
    countdownLabel: string;
  }
> = {
  am: {
    fastTag: '⚡ SUN FAST BINGO · ለብቻው የተዘጋጀ ፈጣን ቢንጎ',
    fastHeadline: 'የፈጣን ቢንጎ አፕ፦ 1 መስመር (Horizontal, Vertical, Diagonal) ወይም 4ቱ የማዕዘን ካስ!',
    fastSub: 'በማንኛውም 1 መስመር ወይም በ 4ቱ የማዕዘን ካሶች (4 Corners) ወዲያውኑ የሚያሸንፉበት ፈጣን ቢንጎ!',
    openFastBtn: '⚡ የፈጣን ቢንጎ አፕ ክፈት',
    playNow: 'ወደ ጨዋታ ግባ',
    currentRuleLabel: 'የአሁኑ ዙር አሸናፊ ቅጥ',
    viewPatternBtn: 'የአሁኑን አሸናፊ ቅጥ እይ',
    viewPatternTitle: 'የጨዋታውን አይነት በምስል እይ',
    dailyTimesNote: 'በየቀኑ በ 2:00 ጥዋት፣ 8:00 ቀን፣ 12:00 ከምሽቱ እና 4:30 ማታ',
    tryFreeNow: 'ነፃ ጨዋታ አሁን ሞክር',
    freeTag: 'ነፃ ጨዋታ (FREE)',
    prizeLabel: 'ሽልማት',
    countdownLabel: 'ቀሪ ጊዜ',
  },
  ti: {
    fastTag: '⚡ SUN FAST BINGO · ብሕታዊ ቅልጡፍ ቢንጎ',
    fastHeadline: 'ቅልጡፍ ቢንጎ፦ 1 መስመር (Horizontal, Vertical, Diagonal) ወይ 4 ኩርናዓት!',
    fastSub: 'ብዝኾነ 1 መስመር ወይ ብ 4 ኩርናዓት ብኡንብኡ ትዕወቱሉ ቅልጡፍ ቢንጎ!',
    openFastBtn: '⚡ ቅልጡፍ ቢንጎ ክፈት',
    playNow: 'ናብ ጸወታ እቶ',
    currentRuleLabel: 'ናይ ሕጂ ዙር ተዓዋቲ ቅጥዒ',
    viewPatternBtn: 'ናይ ሕጂ ተዓዋቲ ቅጥዒ ርአ',
    viewPatternTitle: 'ዓይነት ጸወታ ብስእሊ ርአ',
    dailyTimesNote: 'መዓልታዊ ብ 2:00 ንግሆ፣ 8:00 ቀትሪ፣ 12:00 ምሸትን 4:30 ለይትን',
    tryFreeNow: 'ናጻ ጸወታ ሕጂ ፈትን',
    freeTag: 'ናጻ ጸወታ (FREE)',
    prizeLabel: 'ሽልማት',
    countdownLabel: 'ዝተረፈ ግዜ',
  },
  om: {
    fastTag: '⚡ SUN FAST BINGO · Biingoo Saffisaa',
    fastHeadline: 'Biingoo Saffisaa: Sarara 1 (Horizontal, Vertical, Diagonal) ykn Gojjaa 4!',
    fastSub: 'Sarara 1 kamiyyuu ykn gojjaa 4n battalumatti kan itti mo’attan Biingoo Saffisaa!',
    openFastBtn: '⚡ Biingoo Saffisaa Bani',
    playNow: 'Amma Taphadhu',
    currentRuleLabel: 'Seera Injifannoo Marsaa Ammaa',
    viewPatternBtn: 'Fakkii Seeraa Ilaali',
    viewPatternTitle: 'Gosa taphaa fakkiidhaan ilaali',
    dailyTimesNote: 'Guyyaa hunda sa’aatii 2:00 ganama, 8:00 guyyaa, 12:00 galgala fi 4:30 halkan',
    tryFreeNow: 'Tapha Bilisaa Amma Yaali',
    freeTag: 'BILISAA (FREE)',
    prizeLabel: 'Badhaasa',
    countdownLabel: 'Yeroo Hafe',
  },
  en: {
    fastTag: '⚡ SUN FAST BINGO · Dedicated Speed Room',
    fastHeadline: 'Fast Bingo: Win with Any 1 Line (Horizontal, Vertical, Diagonal) or 4 Corners!',
    fastSub: 'Instant-win Fast Bingo room where any completed line or 4 corners wins immediately!',
    openFastBtn: '⚡ Open Fast Bingo',
    playNow: 'Play Now',
    currentRuleLabel: 'Current Round Winning Pattern',
    viewPatternBtn: 'View Winning Pattern',
    viewPatternTitle: 'Preview winning pattern visually',
    dailyTimesNote: 'Daily at 8:00 AM, 2:00 PM, 6:00 PM & 10:30 PM',
    tryFreeNow: 'Try Free Round Now',
    freeTag: 'FREE ROUND',
    prizeLabel: 'Prize',
    countdownLabel: 'Countdown',
  },
};

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
  const st = SCHEDULE_TEXT[language] || SCHEDULE_TEXT.am;
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
      {/* ⚡ FAST BINGO SPOTLIGHT BANNER */}
      {onStartFastBingo && (
        <div className="rounded-2xl p-4 sm:p-5 bg-gradient-to-r from-amber-500 via-orange-600 to-rose-600 text-white shadow-xl border border-amber-300/40 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-slate-950/30 text-amber-200 text-xs font-extrabold">
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>{st.fastTag}</span>
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold">{st.fastHeadline}</h2>
            <p className="text-xs sm:text-sm text-amber-100 font-semibold">{st.fastSub}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onStartFastBingo()}
              className="px-4 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-900 text-amber-400 font-extrabold text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer shadow-lg"
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>{st.openFastBtn}</span>
            </button>
          </div>
        </div>
      )}
      {/* Hero Banners & Promotional Ads Section (Auto-translated by Language) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {heroBanners
          .filter((b) => b.isActive !== false)
          .map((rawBanner) => {
            const banner = localizeHeroAd(rawBanner, language);
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
                      <span>{banner.ctaText || st.playNow}</span>
                    </button>

                    <button
                      type="button"
                      onClick={onOpenRulesModal}
                      className="px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <BookOpen className="w-4 h-4" />
                      <span>{t.rulesAndPatterns}</span>
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
          <div className="text-xs font-bold text-emerald-500">{st.currentRuleLabel}</div>
          <div className="text-sm sm:text-base font-extrabold mt-0.5 flex items-center gap-2">
            <span>{getRuleTitleByLang(currentRule, language)}</span>
            <button
              type="button"
              onClick={onOpenRulesModal}
              title={st.viewPatternTitle}
              className="w-6 h-6 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-400 hover:bg-amber-500 hover:text-slate-950 flex items-center justify-center cursor-pointer transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
            </button>
          </div>
          {language === 'am' && (
            <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {currentRule.descAm}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onOpenRulesModal}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold cursor-pointer whitespace-nowrap"
        >
          {st.viewPatternBtn}
        </button>
      </div>

      {/* Daily Free Game Schedule */}
      <div
        className={`rounded-2xl border p-4 sm:p-5 ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-emerald-500" />
            <h3 className="text-base sm:text-lg font-extrabold">
              {t.freeGameSchedule} ({st.dailyTimesNote})
            </h3>
          </div>

          <button
            type="button"
            onClick={onTriggerFreeDemoGame}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold cursor-pointer"
          >
            {st.tryFreeNow}
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
                    <span>{st.freeTag}</span>
                    <Clock className="w-4 h-4" />
                  </div>
                  <div className="text-base font-extrabold">{slot.ethTimeLabel[language] || slot.ethTimeLabel.am}</div>
                  <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {slot.title[language] || slot.title.am}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-700/20 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase opacity-70 font-bold">{st.prizeLabel}</div>
                    <div className="text-sm font-extrabold font-mono-tabular text-amber-500">
                      {slot.prizeEtb} ETB
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase opacity-70 font-bold">{st.countdownLabel}</div>
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
