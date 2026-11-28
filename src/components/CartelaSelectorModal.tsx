import React, { useState } from 'react';
import { X, Plus, Sparkles, Search, Shuffle } from 'lucide-react';
import { Language } from '../types/bingo';

interface CartelaSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCount: number;
  maxCartelas: number;
  maxPoolId?: number;
  blockedCartelaIds: number[];
  existingCartelaIds: number[];
  otherLockedCartelaIds?: number[];
  bonusCartelasForOver20?: number;
  language?: Language;
  isDark: boolean;
  onAddBatchCartelas: (count: number) => void;
  onAddSpecificCartela: (id: number) => void;
}

const SELECTOR_COPY: Record<
  Language,
  {
    title: string;
    freeCapSuffix: string;
    heldCount: string;
    freeCapNote: string;
    over20NotePrefix: string;
    over20NoteSuffix: string;
    freeRulePrefix: string;
    freeRuleHighlight: string;
    freeRuleSuffix: string;
    specialBonusPrefix: string;
    specialBonusHighlight: (n: number) => string;
    specialBonusSuffix: string;
    batchLabelFree: string;
    batchLabelPaid: string;
    cartelaUnit: string;
    freeBonusChip: (n: number) => string;
    pickFromGrid: (maxPool: number) => string;
    manualFastLabel: (maxPool: number) => string;
    manualPaidLabel: string;
    placeholderFast: string;
    placeholderPaid: string;
    addBtn: string;
    errRangeFast: string;
    errInvalidId: string;
    errBlocked: (id: number) => string;
    errTakenByOther: (id: number) => string;
    errAlreadyPicked: (id: number) => string;
    errMaxReached: (max: number) => string;
  }
> = {
  am: {
    title: 'ካርቴላ መምረጫ',
    freeCapSuffix: '(የነፃ ጨዋታ — እስከ 10 ካርቴላ ብቻ)',
    heldCount: 'አሁን የያዙት፦',
    freeCapNote: ' · በነፃ ጨዋታ አንድ ተጫዋች እስከ 10 ካርቴላ ብቻ ነው የሚፈቀደው!',
    over20NotePrefix: ' · ከ20 በላይ (21+) ላስመዘገበ +',
    over20NoteSuffix: ' ካርቴላ ቦነስ በነፃ ይሰጣል!',
    freeRulePrefix: '🎁 የነፃ ጨዋታ ሕግ፦ በነፃ ጨዋታ እያንዳንዱ ተጫዋች ',
    freeRuleHighlight: 'እስከ 10 ካርቴላ ብቻ',
    freeRuleSuffix: ' መምረጥ እና ማስመዝገብ ይችላል!',
    specialBonusPrefix: 'ልዩ ቦነስ፦ ከ 20 በላይ ካርቴላ ለሚያስመዘግቡ ተጫዋቾች (21 እና ከዚያ በላይ) ',
    specialBonusHighlight: (n) => `+${n} ተጨማሪ ነፃ ካርቴላ`,
    specialBonusSuffix: ' ወዲያውኑ ይጨመራል!',
    batchLabelFree: 'በብዛት ይምረጡ (ከ 1 እስከ 10 ካርቴላ ብቻ)፦',
    batchLabelPaid: 'በብዛት ይምረጡ (1, 2, 3, 5, 10, 15, 20, 25, 30 ካርቴላዎች)፦',
    cartelaUnit: 'ካርቴላ',
    freeBonusChip: (n) => `+${n} ነፃ ቦነስ!`,
    pickFromGrid: (maxPool) => `ከ 1 – ${maxPool} ቁጥር ነክተው ይምረጡ፦`,
    manualFastLabel: (maxPool) => `ወይም የሚፈልጉትን ካርቴላ ቁጥር (1 – ${maxPool}) በእጅ ያስገቡ፦`,
    manualPaidLabel: 'ወይም የሚፈልጉትን የካርቴላ ቁጥር በእጅ ያስገቡ፦',
    placeholderFast: 'ምሳሌ: 125',
    placeholderPaid: 'ምሳሌ: 22185',
    addBtn: 'ጨምር',
    errRangeFast: 'እባክዎ ከ 1 እስከ 500 ውስጥ ያለ የካርቴላ ቁጥር ያስገቡ።',
    errInvalidId: 'እባክዎ ትክክለኛ የካርቴላ ቁጥር ያስገቡ።',
    errBlocked: (id) => `ካርቴላ #${id} ታግዷል! ሌላ ቁጥር ይምረጡ።`,
    errTakenByOther: (id) => `ካርቴላ #${id} በሌላ ተጫዋች ተይዟል! እባክዎ ሌላ ቁጥር ይምረጡ።`,
    errAlreadyPicked: (id) => `ካርቴላ #${id} ቀድሞውኑ ተመርጧል!`,
    errMaxReached: (max) => `ከፍተኛው የካርቴላ መጠን (${max}) ደርሷል!`,
  },
  ti: {
    title: 'ካርቴላ መምረጺ',
    freeCapSuffix: '(ናጻ ጸወታ — ክሳብ 10 ካርቴላ ጥራይ)',
    heldCount: 'ሕጂ ዝሓዝኩሞ፦',
    freeCapNote: ' · ኣብ ናጻ ጸወታ ሓደ ተጻዋታይ ክሳብ 10 ካርቴላ ጥራይ እዩ ዝፍቀድ!',
    over20NotePrefix: ' · ልዕሊ 20 (21+) ንዝመዝገበ +',
    over20NoteSuffix: ' ካርቴላ ቦነስ ብናጻ ይወሃብ!',
    freeRulePrefix: '🎁 ሕጊ ናጻ ጸወታ፦ ኣብ ናጻ ጸወታ ነፍሲ ወከፍ ተጻዋታይ ',
    freeRuleHighlight: 'ክሳብ 10 ካርቴላ ጥራይ',
    freeRuleSuffix: ' ክመርጽን ክምዝግብን ይኽእል!',
    specialBonusPrefix: 'ፍሉይ ቦነስ፦ ልዕሊ 20 ካርቴላ ንዝምዝግቡ ተጻወትቲ (21ን ልዕሊኡን) ',
    specialBonusHighlight: (n) => `+${n} ተወሳኺ ናጻ ካርቴላ`,
    specialBonusSuffix: ' ብኡንብኡ ይውሰኽ!',
    batchLabelFree: 'ብብዝሒ ምረጹ (ካብ 1 ክሳብ 10 ካርቴላ ጥራይ)፦',
    batchLabelPaid: 'ብብዝሒ ምረጹ (1, 2, 3, 5, 10, 15, 20, 25, 30 ካርቴላታት)፦',
    cartelaUnit: 'ካርቴላ',
    freeBonusChip: (n) => `+${n} ናጻ ቦነስ!`,
    pickFromGrid: (maxPool) => `ካብ 1 – ${maxPool} ቁጽሪ ጠዊቕኩም ምረጹ፦`,
    manualFastLabel: (maxPool) => `ወይ ትደልይዎ ቁጽሪ ካርቴላ (1 – ${maxPool}) ብኢድ ኣእትዉ፦`,
    manualPaidLabel: 'ወይ ትደልይዎ ቁጽሪ ካርቴላ ብኢድ ኣእትዉ፦',
    placeholderFast: 'ንኣብነት: 125',
    placeholderPaid: 'ንኣብነት: 22185',
    addBtn: 'ወስኽ',
    errRangeFast: 'በጃኹም ካብ 1 ክሳብ 500 ዘሎ ቁጽሪ ካርቴላ ኣእትዉ።',
    errInvalidId: 'በጃኹም ትኽክለኛ ቁጽሪ ካርቴላ ኣእትዉ።',
    errBlocked: (id) => `ካርቴላ #${id} ተኣጊዱ እዩ! ካልእ ቁጽሪ ምረጹ።`,
    errTakenByOther: (id) => `ካርቴላ #${id} ብኻልእ ተጻዋታይ ተታሒዙ እዩ! ካልእ ቁጽሪ ምረጹ።`,
    errAlreadyPicked: (id) => `ካርቴላ #${id} ድሮ ተመሪጹ እዩ!`,
    errMaxReached: (max) => `ዝለዓለ ብዝሒ ካርቴላ (${max}) በጺሑ እዩ!`,
  },
  om: {
    title: 'Filannoo Kaarteelaa',
    freeCapSuffix: '(Tapha Bilisaa — Kaarteelaa 10 Qofa)',
    heldCount: 'Kan amma qabdan:',
    freeCapNote: ' · Tapha bilisaa irratti taphataan tokko hanga kaarteelaa 10 qofa hayyamama!',
    over20NotePrefix: ' · 20 ol (21+) kan galmeesseef +',
    over20NoteSuffix: ' boonasii bilisaa ni kennama!',
    freeRulePrefix: '🎁 Seera Tapha Bilisaa: Tapha bilisaa irratti taphataan hundi ',
    freeRuleHighlight: 'hanga kaarteelaa 10 qofa',
    freeRuleSuffix: ' filachuu fi galmeessuu danda’a!',
    specialBonusPrefix: 'Boonasii Addaa: Taphattoota kaarteelaa 20 ol galmeessaniif (21 fi isaa ol) ',
    specialBonusHighlight: (n) => `+${n} Kaarteelaa Bilisaa Dabalataa`,
    specialBonusSuffix: ' battalumatti ni dabalama!',
    batchLabelFree: 'Baay’inaan filadhu (1 hanga 10 qofa):',
    batchLabelPaid: 'Baay’inaan filadhu (1, 2, 3, 5, 10, 15, 20, 25, 30):',
    cartelaUnit: 'Kaarteelaa',
    freeBonusChip: (n) => `+${n} Bilisa!`,
    pickFromGrid: (maxPool) => `Lakkoofsa 1 – ${maxPool} keessaa cuqaasii filadhu:`,
    manualFastLabel: (maxPool) => `Ykn lakkoofsa kaarteelaa barbaaddu (1 – ${maxPool}) harkaan galchi:`,
    manualPaidLabel: 'Ykn lakkoofsa kaarteelaa barbaaddu harkaan galchi:',
    placeholderFast: 'Fkn: 125',
    placeholderPaid: 'Fkn: 22185',
    addBtn: 'Dabali',
    errRangeFast: 'Maaloo lakkoofsa kaarteelaa 1 hanga 500 gidduu galchi.',
    errInvalidId: 'Maaloo lakkoofsa kaarteelaa sirrii galchi.',
    errBlocked: (id) => `Kaarteelaan #${id} dhorkameera! Lakkoofsa biraa filadhu.`,
    errTakenByOther: (id) => `Kaarteelaan #${id} taphataa biraan qabameera! Lakkoofsa biraa filadhu.`,
    errAlreadyPicked: (id) => `Kaarteelaan #${id} dursee filatameera!`,
    errMaxReached: (max) => `Baay’inni kaarteelaa ol’aanaan (${max}) guutameera!`,
  },
  en: {
    title: 'Cartela Selector',
    freeCapSuffix: '(Free Game — Up to 10 Cartelas)',
    heldCount: 'Currently Held:',
    freeCapNote: ' · In free rounds, each player may register up to 10 cartelas.',
    over20NotePrefix: ' · Register 21+ cartelas and get +',
    over20NoteSuffix: ' free bonus cartelas!',
    freeRulePrefix: '🎁 Free Round Rule: Each player can pick and register ',
    freeRuleHighlight: 'up to 10 cartelas max',
    freeRuleSuffix: '.',
    specialBonusPrefix: 'Special Bonus: Players registering over 20 cartelas (21+) receive ',
    specialBonusHighlight: (n) => `+${n} extra FREE bonus cartelas`,
    specialBonusSuffix: ' automatically!',
    batchLabelFree: 'Quick Pick Batch (1 to 10 Cartelas):',
    batchLabelPaid: 'Quick Pick Batch (1, 2, 3, 5, 10, 15, 20, 25, 30):',
    cartelaUnit: 'Cartelas',
    freeBonusChip: (n) => `+${n} Free Bonus!`,
    pickFromGrid: (maxPool) => `Tap a number from 1 – ${maxPool} to pick:`,
    manualFastLabel: (maxPool) => `Or enter a specific cartela number (1 – ${maxPool}):`,
    manualPaidLabel: 'Or enter a specific cartela number:',
    placeholderFast: 'e.g. 125',
    placeholderPaid: 'e.g. 22185',
    addBtn: 'Add',
    errRangeFast: 'Please enter a cartela number between 1 and 500.',
    errInvalidId: 'Please enter a valid cartela number.',
    errBlocked: (id) => `Cartela #${id} is blocked! Please pick another number.`,
    errTakenByOther: (id) => `Cartela #${id} is already held by another player! Pick another.`,
    errAlreadyPicked: (id) => `Cartela #${id} is already selected!`,
    errMaxReached: (max) => `Maximum cartela limit (${max}) reached!`,
  },
};

const BATCH_OPTIONS = [1, 2, 3, 5, 10, 15, 20, 25, 30];

export const CartelaSelectorModal: React.FC<CartelaSelectorModalProps> = ({
  isOpen,
  onClose,
  currentCount,
  maxCartelas,
  maxPoolId = 70000,
  blockedCartelaIds,
  existingCartelaIds,
  otherLockedCartelaIds = [],
  bonusCartelasForOver20 = 5,
  language = 'am',
  isDark,
  onAddBatchCartelas,
  onAddSpecificCartela,
}) => {
  const [specificIdInput, setSpecificIdInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const sText = SELECTOR_COPY[language] || SELECTOR_COPY.am;
  const remainingCapacity = Math.max(0, maxCartelas - currentCount);

  const handleSpecificAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const parsed = parseInt(specificIdInput, 10);
    if (isNaN(parsed) || parsed < 1 || parsed > maxPoolId) {
      setErrorMsg(maxPoolId <= 500 ? sText.errRangeFast : sText.errInvalidId);
      return;
    }
    if (blockedCartelaIds.includes(parsed)) {
      setErrorMsg(sText.errBlocked(parsed));
      return;
    }
    if (otherLockedCartelaIds.includes(parsed)) {
      setErrorMsg(sText.errTakenByOther(parsed));
      return;
    }
    if (existingCartelaIds.includes(parsed)) {
      setErrorMsg(sText.errAlreadyPicked(parsed));
      return;
    }
    if (remainingCapacity <= 0) {
      setErrorMsg(sText.errMaxReached(maxCartelas));
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
              <span>{sText.title} {maxCartelas <= 10 ? sText.freeCapSuffix : ''}</span>
            </h3>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {sText.heldCount} {currentCount}/{maxCartelas}
              {maxCartelas <= 10
                ? sText.freeCapNote
                : bonusCartelasForOver20 > 0
                ? `${sText.over20NotePrefix}${bonusCartelasForOver20}${sText.over20NoteSuffix}`
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
        {maxCartelas <= 10 ? (
          <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-blue-500/20 border border-emerald-500/40 mb-4 flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-emerald-400 shrink-0" />
            <p className="text-xs font-bold">
              {sText.freeRulePrefix}
              <span className="text-emerald-400 underline">{sText.freeRuleHighlight}</span>
              {sText.freeRuleSuffix}
            </p>
          </div>
        ) : (
          bonusCartelasForOver20 > 0 && (
            <div className="p-3 rounded-xl bg-gradient-to-r from-amber-500/20 via-emerald-500/20 to-blue-500/20 border border-amber-500/40 mb-4 flex items-center gap-2.5">
              <Sparkles className="w-5 h-5 text-amber-500 shrink-0" />
              <p className="text-xs font-bold">
                {sText.specialBonusPrefix}
                <span className="text-emerald-500 underline">
                  {sText.specialBonusHighlight(bonusCartelasForOver20)}
                </span>
                {sText.specialBonusSuffix}
              </p>
            </div>
          )
        )}

        {/* Quick Batch Selection Grid */}
        <div className="mb-5">
          <label className="block text-xs font-bold mb-2">
            {maxCartelas <= 10 ? sText.batchLabelFree : sText.batchLabelPaid}
          </label>
          <div className="grid grid-cols-3 gap-2.5">
            {BATCH_OPTIONS.filter((count) => count <= maxCartelas).map((count) => {
              const hasBonus = count > 20 && bonusCartelasForOver20 > 0 && maxCartelas > 10;
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
                    <span>{count} {sText.cartelaUnit}</span>
                  </div>
                  {hasBonus && (
                    <span className="text-[10px] font-bold text-amber-300 mt-0.5">
                      {sText.freeBonusChip(bonusCartelasForOver20)}
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
              {sText.pickFromGrid(maxPoolId)}
            </label>
            <div className="max-h-56 overflow-y-auto rounded-xl bg-[#092329] p-2 border border-teal-500/30">
              <div className="grid grid-cols-10 gap-1">
                {Array.from({ length: maxPoolId }, (_, i) => i + 1).map((num) => {
                  const isTaken = existingCartelaIds.includes(num);
                  const isBlocked = blockedCartelaIds.includes(num);
                  const isLockedByOther = otherLockedCartelaIds.includes(num);
                  return (
                    <button
                      key={num}
                      type="button"
                      disabled={isBlocked || isLockedByOther}
                      onClick={() => {
                        if (!isTaken && !isLockedByOther && !isBlocked) {
                          onAddSpecificCartela(num);
                        }
                      }}
                      className={`h-8 rounded-lg text-xs font-extrabold font-mono-tabular flex items-center justify-center transition-all ${
                        isBlocked || isLockedByOther
                          ? 'bg-rose-700/80 text-white/80 cursor-not-allowed'
                          : isTaken
                          ? 'bg-[#24c65a] text-white shadow cursor-pointer'
                          : 'bg-[#1e3a42] hover:bg-[#294d57] text-white cursor-pointer'
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
              ? sText.manualFastLabel(maxPoolId)
              : sText.manualPaidLabel}
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
                placeholder={maxPoolId <= 500 ? sText.placeholderFast : sText.placeholderPaid}
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
              {sText.addBtn}
            </button>
          </div>
          {errorMsg && <p className="text-xs font-bold text-rose-500">{errorMsg}</p>}
        </form>
      </div>
    </div>
  );
};
