import React, { useState, useEffect } from 'react';
import { X, Shield, CheckCircle2, Sparkles, Eye, Shuffle, ChevronLeft, ChevronRight, LayoutGrid, MonitorPlay, Search } from 'lucide-react';
import { BINGO_PATTERNS, getRuleTitleByLang, getRuleDescByLang } from '../data/bingoPatterns';
import { BingoRulePattern, Language, ShapeGroup } from '../types/bingo';

interface RulesAndPatternsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activePatternId: number;
  isAdminAuthenticated: boolean;
  onSelectPattern?: (patternId: number) => void;
  registrationMinutes?: number | null;
  onSetRegistrationMinutes?: (minutes: number) => void;
  language: Language;
  isDark: boolean;
}

const BINGO_LETTERS = [
  { char: 'B', bg: 'bg-emerald-600 text-white' },
  { char: 'I', bg: 'bg-rose-600 text-white' },
  { char: 'N', bg: 'bg-sky-600 text-white' },
  { char: 'G', bg: 'bg-blue-600 text-white' },
  { char: 'O', bg: 'bg-amber-500 text-white' },
];

export const RulesAndPatternsModal: React.FC<RulesAndPatternsModalProps> = ({
  isOpen,
  onClose,
  activePatternId,
  isAdminAuthenticated,
  onSelectPattern,
  registrationMinutes,
  onSetRegistrationMinutes,
  language,
  isDark,
}) => {
  // All rules are available without restriction to everyone!
  const [selectedRuleId, setSelectedRuleId] = useState<number | 'ALL'>(activePatternId || 27);
  const [viewMode, setViewMode] = useState<'interactive' | 'grid'>('interactive');
  const [currentVariantIdx, setCurrentVariantIdx] = useState<number>(0);
  const [jumpInput, setJumpInput] = useState<string>('1');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedRules, setExpandedRules] = useState<Record<number, boolean>>({});

  // Keep selected rule in sync if activePatternId changes initially
  useEffect(() => {
    if (activePatternId) {
      setSelectedRuleId(activePatternId);
      setCurrentVariantIdx(0);
      setJumpInput('1');
    }
  }, [activePatternId]);

  if (!isOpen) return null;

  const getRuleTitle = (rule: BingoRulePattern) => getRuleTitleByLang(rule, language);
  const getRuleDesc = (rule: BingoRulePattern) => getRuleDescByLang(rule, language);

  // Filter rules according to selected tab or search query
  const filteredRules = BINGO_PATTERNS.filter((r) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchNum = r.id.toString() === q || `ሕግ ${r.id}`.includes(q) || `rule ${r.id}`.includes(q);
      const matchTitle =
        r.titleAm.toLowerCase().includes(q) ||
        r.titleEn.toLowerCase().includes(q) ||
        (r.titleTi && r.titleTi.toLowerCase().includes(q)) ||
        (r.titleOm && r.titleOm.toLowerCase().includes(q));
      return matchNum || matchTitle;
    }
    if (selectedRuleId === 'ALL') return true;
    return r.id === selectedRuleId;
  });

  // Current single rule for interactive viewer
  const currentInteractiveRule =
    selectedRuleId === 'ALL'
      ? BINGO_PATTERNS.find((r) => r.id === activePatternId) || BINGO_PATTERNS[0]
      : BINGO_PATTERNS.find((r) => r.id === selectedRuleId) || BINGO_PATTERNS[0];

  const totalCurrentVariants = currentInteractiveRule?.variations?.length || 1;
  const safeVariantIdx = Math.max(0, Math.min(totalCurrentVariants - 1, currentVariantIdx));
  const currentVariation = currentInteractiveRule?.variations?.[safeVariantIdx];

  const handleNextVariant = () => {
    const next = (safeVariantIdx + 1) % totalCurrentVariants;
    setCurrentVariantIdx(next);
    setJumpInput(String(next + 1));
  };

  const handlePrevVariant = () => {
    const prev = (safeVariantIdx - 1 + totalCurrentVariants) % totalCurrentVariants;
    setCurrentVariantIdx(prev);
    setJumpInput(String(prev + 1));
  };

  const handleRandomVariant = () => {
    const rand = Math.floor(Math.random() * totalCurrentVariants);
    setCurrentVariantIdx(rand);
    setJumpInput(String(rand + 1));
  };

  const handleJumpSubmit = (val: string) => {
    const num = parseInt(val, 10);
    if (!isNaN(num) && num >= 1 && num <= totalCurrentVariants) {
      setCurrentVariantIdx(num - 1);
      setJumpInput(String(num));
    }
  };

  const selectRule = (id: number | 'ALL') => {
    setSelectedRuleId(id);
    setCurrentVariantIdx(0);
    setJumpInput('1');
  };

  // Color mapping helper for shapes
  const getShapeColor = (colorName?: string) => {
    switch (colorName) {
      case 'purple':
        return {
          bg: '#8b5cf6',
          text: '#ffffff',
          boxShadow: '0 0 14px rgba(139, 92, 246, 0.85)',
          legendClass: 'bg-[#8b5cf6] shadow-[0_0_8px_rgba(139,92,246,0.6)]',
        };
      case 'emerald':
        return {
          bg: '#10b981',
          text: '#0f172a',
          boxShadow: '0 0 14px rgba(16, 185, 129, 0.85)',
          legendClass: 'bg-[#10b981] shadow-[0_0_8px_rgba(16,185,129,0.6)]',
        };
      case 'sky':
        return {
          bg: '#06b6d4',
          text: '#0f172a',
          boxShadow: '0 0 14px rgba(6, 182, 212, 0.85)',
          legendClass: 'bg-[#06b6d4] shadow-[0_0_8px_rgba(6,182,212,0.6)]',
        };
      case 'amber':
        return {
          bg: '#f59e0b',
          text: '#0f172a',
          boxShadow: '0 0 14px rgba(245, 158, 11, 0.85)',
          legendClass: 'bg-[#f59e0b] shadow-[0_0_8px_rgba(245,158,11,0.6)]',
        };
      case 'rose':
        return {
          bg: '#f43f5e',
          text: '#ffffff',
          boxShadow: '0 0 14px rgba(244, 63, 94, 0.85)',
          legendClass: 'bg-[#f43f5e] shadow-[0_0_8px_rgba(244,63,94,0.6)]',
        };
      default:
        return {
          bg: '#38bdf8',
          text: '#0f172a',
          boxShadow: '0 0 14px rgba(56, 189, 248, 0.85)',
          legendClass: 'bg-[#38bdf8] shadow-[0_0_8px_rgba(56,189,248,0.6)]',
        };
    }
  };

  // Build cell to color map for the interactive variation
  const interactiveCellColorMap = new Map<string, string>();
  if (currentVariation?.shapeGroups) {
    for (const sg of currentVariation.shapeGroups) {
      for (const [r, c] of sg.cells) {
        interactiveCellColorMap.set(`${r},${c}`, sg.color);
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div
        className={`relative w-full max-w-6xl max-h-[95vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden ${
          isDark ? 'bg-[#0f172a] border-slate-700 text-slate-100' : 'bg-slate-900 border-slate-700 text-slate-100'
        }`}
      >
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-[#1e293b]/95 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 font-black flex items-center justify-center text-lg shadow-lg">
              {selectedRuleId === 'ALL' ? '27' : `#${currentInteractiveRule?.id}`}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                  <span>
                    {language === 'ti'
                      ? `ኩሎም 27 ናይ ቢንጎ ሕግታት (ከሕጊ 1 ክሳብ 27)`
                      : language === 'om'
                      ? `Heerota Biingoo 27 Hunda (1 hanga 27)`
                      : language === 'en'
                      ? `All 27 Bingo Rules & Patterns (Rule 1 to 27)`
                      : `ሁሉም 27 የቢንጎ ሕጎችና አማራጮች (ከሕግ 1 እስከ 27)`}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    ያለምንም ገደብ (Open to All)
                  </span>
                </h2>
              </div>
              <p className="text-xs text-slate-400">
                {language === 'ti'
                  ? `ኩሎም ሕግታት ምስ ኩሎም መማረጺታቶም ብተለዋዋጭ 5×5 ሰሌዳን ዝርዝርን ይርከቡ`
                  : language === 'om'
                  ? `Heerota hunda fi filannoowwan isaanii gabatee 5x5 irratti ilaalaa`
                  : language === 'en'
                  ? `Inspect all rules with full winning combinations in interactive viewer and grid`
                  : `የሁሉም 27 ሕጎች አማራጮች በሙሉ (ሕግ 27 56ቱ፣ ሕግ 26 36ቱ፣ ሕግ 4 200ው፣ ሕግ 3 252ቱ...) ያለምንም ገደብ`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
              <button
                type="button"
                onClick={() => setViewMode('interactive')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'interactive'
                    ? 'bg-emerald-500 text-slate-950 shadow-md scale-102'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="ተለዋዋጭ ሰሌዳ መመልከቻ (Interactive Single Board Viewer)"
              >
                <MonitorPlay className="w-3.5 h-3.5" />
                <span>ተለዋዋጭ (Viewer)</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-emerald-500 text-slate-950 shadow-md scale-102'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="ሁሉንም አማራጮች በጎን ለጎን ሰሌዳ ማሳያ (Grid Mode)"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>ዝርዝር (Grid)</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 transition-colors cursor-pointer shadow-md"
            >
              <X className="w-4 h-4" />
              <span>ዝጋ (Close)</span>
            </button>
          </div>
        </div>

        {/* 27 Rules Filter Bar with Count Badges */}
        <div className="flex items-center gap-2 px-4 py-2 bg-[#0f172a] border-b border-slate-800 overflow-x-auto">
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => selectRule('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black whitespace-nowrap transition-all cursor-pointer ${
                selectedRuleId === 'ALL'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {language === 'en' ? 'All 27 Rules' : 'ሁሉም 27 ሕጎች (All)'}
            </button>

            {BINGO_PATTERNS.map((rule) => {
              const isSelected = selectedRuleId === rule.id;
              const isActiveGameRule = activePatternId === rule.id;
              const count = rule.variations?.length || 0;

              return (
                <button
                  key={rule.id}
                  type="button"
                  onClick={() => selectRule(rule.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer border ${
                    isSelected
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md scale-105'
                      : isActiveGameRule
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/50 hover:bg-amber-500/30'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  <span>ሕግ #{rule.id}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                      isSelected
                        ? 'bg-slate-950 text-emerald-400'
                        : 'bg-slate-900 text-slate-300'
                    }`}
                  >
                    {count}
                  </span>
                  {isActiveGameRule && <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Admin Registration Countdown Setting (if admin) */}
        {isAdminAuthenticated && (
          <div className="px-4 py-2.5 bg-gradient-to-r from-amber-950/40 via-slate-900 to-amber-950/20 border-b border-amber-500/30 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-amber-400 font-bold">⏱️ የጨዋታ መመዝገቢያ ደቂቃ (Admin Countdown):</span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {[1, 2, 3, 5, 10, 15, 20].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => onSetRegistrationMinutes && onSetRegistrationMinutes(mins)}
                  className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer transition-all ${
                    registrationMinutes === mins
                      ? 'bg-amber-500 text-slate-950 font-black scale-105 shadow-xs'
                      : 'bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  {mins} ደቂቃ
                </button>
              ))}
              <button
                type="button"
                onClick={() => onSetRegistrationMinutes && onSetRegistrationMinutes(0)}
                className={`px-2 py-1 rounded-lg font-bold cursor-pointer ${
                  registrationMinutes === 0 || registrationMinutes === null
                    ? 'bg-rose-600 text-white font-black'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                ያለ ደቂቃ
              </button>
            </div>
          </div>
        )}

        {/* Modal Main Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#0f172a]">
          {/* INTERACTIVE VIEWER MODE (ልክ እንደ ተጠቃሚው ኮድ - EXACT VIEWER IMPLEMENTATION) */}
          {viewMode === 'interactive' && selectedRuleId !== 'ALL' && currentInteractiveRule && (
            <div className="flex flex-col items-center max-w-xl mx-auto w-full">
              {/* Rule Header */}
              <div className="text-center mb-4 w-full">
                <div className="flex items-center justify-center gap-2 mb-1 flex-wrap">
                  <span className="px-3 py-1 rounded-lg bg-blue-600 text-white font-black text-xs">
                    ሕግ #{currentInteractiveRule.id}
                  </span>
                  <h1 className="text-xl sm:text-2xl font-black text-emerald-400">
                    {getRuleTitle(currentInteractiveRule)}
                  </h1>
                  {activePatternId === currentInteractiveRule.id && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      የአሁኑ ጨዋታ ሕግ (Active)
                    </span>
                  )}
                </div>

                <p className="text-sm text-slate-400 max-w-lg mx-auto">
                  {getRuleDesc(currentInteractiveRule)}
                </p>

                {/* Legend for shape groups */}
                {currentVariation?.shapeGroups && currentVariation.shapeGroups.length > 0 && (
                  <div className="flex gap-3 sm:gap-4 mt-3 flex-wrap justify-center items-center">
                    {currentVariation.shapeGroups.map((sg, idx) => {
                      const style = getShapeColor(sg.color);
                      return (
                        <div key={idx} className="flex items-center gap-1.5 text-xs text-slate-200 font-bold">
                          <div className={`w-4 h-4 rounded-md ${style.legendClass}`} />
                          <span>{language === 'en' ? sg.nameEn : sg.nameAm}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* BINGO Board Wrapper */}
              <div className="bg-[#1e293b] p-4 sm:p-6 rounded-2xl border border-slate-700 shadow-[0_15px_35px_rgba(0,0,0,0.6)] mb-4 w-full max-w-[380px] sm:max-w-[420px]">
                {/* B I N G O Header with bottom emerald border */}
                <div className="grid grid-cols-5 gap-2 sm:gap-2.5 mb-3 text-center font-black text-lg sm:text-xl text-slate-100">
                  {['B', 'I', 'N', 'G', 'O'].map((letter) => (
                    <div
                      key={letter}
                      className="flex items-center justify-center h-9 sm:h-10 border-b-3 border-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                    >
                      {letter}
                    </div>
                  ))}
                </div>

                {/* 5x5 Board Grid */}
                <div className="grid grid-cols-5 gap-2 sm:gap-2.5">
                  {currentVariation ? (
                    currentVariation.grid.map((row, rIdx) =>
                      row.map((isHit, cIdx) => {
                        const isCenterFree = rIdx === 2 && cIdx === 2;
                        const cellColorKey = interactiveCellColorMap.get(`${rIdx},${cIdx}`);
                        const colorStyle = cellColorKey ? getShapeColor(cellColorKey) : null;

                        return (
                          <div
                            key={`${rIdx}-${cIdx}`}
                            style={
                              isHit && colorStyle
                                ? {
                                    backgroundColor: colorStyle.bg,
                                    color: colorStyle.text,
                                    boxShadow: colorStyle.boxShadow,
                                  }
                                : isCenterFree
                                ? {
                                    backgroundColor: '#10b981',
                                    color: '#0f172a',
                                    boxShadow: '0 0 12px rgba(16, 185, 129, 0.8)',
                                  }
                                : isHit
                                ? {
                                    backgroundColor: '#10b981',
                                    color: '#0f172a',
                                    boxShadow: '0 0 12px rgba(16, 185, 129, 0.8)',
                                  }
                                : undefined
                            }
                            className={`aspect-square rounded-xl flex items-center justify-center font-black text-base sm:text-lg transition-all select-none relative ${
                              isHit || isCenterFree
                                ? 'scale-102 ring-1 ring-white/20'
                                : 'bg-[#334155] text-slate-500'
                            }`}
                          >
                            {isCenterFree ? (
                              <span className="text-xs sm:text-sm font-black">★ F</span>
                            ) : isHit ? (
                              <span>✓</span>
                            ) : (
                              <span className="text-sm text-slate-600">•</span>
                            )}
                          </div>
                        );
                      })
                    )
                  ) : (
                    <div className="col-span-5 py-8 text-center text-slate-400">
                      ምስል እየተጫነ ነው...
                    </div>
                  )}
                </div>
              </div>

              {/* Controls */}
              <div className="flex flex-col items-center gap-3 w-full max-w-[380px] sm:max-w-[420px]">
                {/* Prev / Next Buttons */}
                <div className="flex gap-2.5 w-full">
                  <button
                    type="button"
                    onClick={handlePrevVariant}
                    className="flex-1 py-3 px-4 rounded-xl font-black text-sm bg-[#334155] text-slate-100 hover:bg-[#475569] active:scale-97 transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>← ያለፈው</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleNextVariant}
                    className="flex-1 py-3 px-4 rounded-xl font-black text-sm bg-[#10b981] text-slate-950 hover:bg-[#34d399] active:scale-97 transition-all flex items-center justify-center gap-1 cursor-pointer shadow-lg"
                  >
                    <span>ቀጣይ →</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Random Button */}
                <button
                  type="button"
                  onClick={handleRandomVariant}
                  className="w-full py-2.5 px-4 rounded-xl font-black text-sm bg-[#38bdf8] text-slate-950 hover:bg-[#7dd3fc] active:scale-97 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Shuffle className="w-4 h-4" />
                  <span>🎲 በዘፈቀደ ቀይር (Random)</span>
                </button>

                {/* Jump to pattern input box */}
                <div className="flex items-center justify-center gap-2.5 text-sm font-bold text-slate-300 w-full bg-[#1e293b] p-2.5 rounded-xl border border-slate-700">
                  <label htmlFor="jump-pattern-input" className="whitespace-nowrap">ወደ አማራጭ ቁጥር:</label>
                  <input
                    id="jump-pattern-input"
                    type="number"
                    min="1"
                    max={totalCurrentVariants}
                    value={jumpInput}
                    onChange={(e) => {
                      setJumpInput(e.target.value);
                      handleJumpSubmit(e.target.value);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleJumpSubmit((e.target as HTMLInputElement).value);
                    }}
                    className="w-20 px-2.5 py-1.5 rounded-lg border border-slate-600 bg-[#0f172a] text-[#10b981] text-center font-black text-base focus:outline-none focus:border-emerald-500"
                  />
                  <span>/ {totalCurrentVariants}</span>
                </div>

                {/* Info Card */}
                <div className="bg-[#1e293b] border-l-4 border-[#10b981] px-4 py-3 rounded-xl w-full text-center text-sm font-bold text-slate-200">
                  አማራጭ ቁጥር፦ <span className="text-emerald-400 font-black text-base">{safeVariantIdx + 1}</span> ከ {totalCurrentVariants}
                  {currentVariation?.description && (
                    <div className="text-xs text-slate-400 mt-0.5 font-normal">
                      {currentVariation.description}
                    </div>
                  )}
                </div>

                {/* Admin Select Rule for Game Button */}
                {isAdminAuthenticated && onSelectPattern && (
                  <button
                    type="button"
                    onClick={() => {
                      onSelectPattern(currentInteractiveRule.id);
                      onClose();
                    }}
                    className={`w-full py-3 px-4 rounded-xl text-sm font-black transition-all cursor-pointer shadow-lg mt-1 ${
                      activePatternId === currentInteractiveRule.id
                        ? 'bg-emerald-600 text-white'
                        : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                    }`}
                  >
                    {activePatternId === currentInteractiveRule.id
                      ? '✓ የአሁኑ ጨዋታ ሕግ ሆኗል (Currently Active)'
                      : '🎯 ይህንን ሕግ ለጨዋታው ምረጥ (Set as Active Game Rule)'}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* GRID MODE OR 'ALL' RULES VIEW (Side-by-side thumbnail cards) */}
          {(viewMode === 'grid' || selectedRuleId === 'ALL') && (
            <div className="space-y-8">
              {filteredRules.map((rule) => {
                const isCurrentGameRule = activePatternId === rule.id;
                const variations = rule.variations || [];

                return (
                  <div
                    key={rule.id}
                    className="rounded-2xl border border-slate-700/80 bg-[#1e293b]/70 p-4 sm:p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2.5 py-0.5 rounded-md text-xs font-black bg-blue-600 text-white">
                            ሕግ #{rule.id}
                          </span>
                          <h3 className="text-base sm:text-lg font-black text-white">
                            {getRuleTitle(rule)}
                          </h3>
                          <span className="px-2 py-0.5 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            {variations.length} አማራጮች (Options)
                          </span>
                          {isCurrentGameRule && (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                              <Sparkles className="w-3.5 h-3.5" />
                              የአሁኑ ጨዋታ ሕግ (Active)
                            </span>
                          )}
                        </div>
                        <p className="text-xs sm:text-sm text-slate-400 mt-1">
                          {getRuleDesc(rule)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Switch to Interactive Viewer for this rule */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedRuleId(rule.id);
                            setViewMode('interactive');
                            setCurrentVariantIdx(0);
                            setJumpInput('1');
                          }}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 text-emerald-400 border border-emerald-500/30 hover:bg-slate-700 transition-all cursor-pointer flex items-center gap-1"
                        >
                          <MonitorPlay className="w-3.5 h-3.5" />
                          <span>በትልቁ ተመልከት (Viewer)</span>
                        </button>

                        {/* Admin Select Rule */}
                        {isAdminAuthenticated && onSelectPattern && (
                          <button
                            type="button"
                            onClick={() => {
                              onSelectPattern(rule.id);
                              onClose();
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                              isCurrentGameRule
                                ? 'bg-emerald-600 text-white'
                                : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                            }`}
                          >
                            {isCurrentGameRule ? '✓ ተመርጧል' : '🎯 ምረጥ'}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Variations Grid (side-by-side cards) */}
                    {(() => {
                      const isExpanded = Boolean(expandedRules[rule.id]);
                      // When a single rule is chosen, show all options! When viewing 'ALL', show first 100 with expand button
                      const displayLimit = selectedRuleId !== 'ALL' || isExpanded ? variations.length : Math.min(variations.length, 100);
                      const displayedVariations = variations.slice(0, displayLimit);

                      return (
                        <>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                            {displayedVariations.map((variation, vIdx) => {
                              const cellColorMap = new Map<string, string>();
                              if (variation.shapeGroups) {
                                for (const sg of variation.shapeGroups) {
                                  for (const [r, c] of sg.cells) {
                                    cellColorMap.set(`${r},${c}`, sg.color);
                                  }
                                }
                              }

                              return (
                                <div
                                  key={variation.id}
                                  onClick={() => {
                                    setSelectedRuleId(rule.id);
                                    setViewMode('interactive');
                                    setCurrentVariantIdx(vIdx);
                                    setJumpInput(String(vIdx + 1));
                                  }}
                                  className="rounded-xl border border-slate-700 bg-[#0f172a] p-2.5 flex flex-col items-center hover:border-emerald-500/80 hover:scale-102 transition-all cursor-pointer shadow-sm group"
                                >
                                  <div className="w-full flex items-center justify-between text-[11px] font-black text-slate-300 mb-1.5">
                                    <span className="truncate group-hover:text-emerald-400">
                                      {variation.label}
                                    </span>
                                    <span className="text-[10px] text-slate-500">#{vIdx + 1}</span>
                                  </div>

                                  {/* B I N G O Header */}
                                  <div className="grid grid-cols-5 gap-0.5 w-full mb-1 text-[9px] font-black text-center text-slate-400">
                                    {['B', 'I', 'N', 'G', 'O'].map((l) => (
                                      <div key={l} className="bg-slate-800 rounded-xs py-0.5">
                                        {l}
                                      </div>
                                    ))}
                                  </div>

                                  {/* 5x5 Cells */}
                                  <div className="grid grid-cols-5 gap-1 w-full">
                                    {variation.grid.map((row, rIdx) =>
                                      row.map((isHit, cIdx) => {
                                        const isCenterFree = rIdx === 2 && cIdx === 2;
                                        const shapeColor = cellColorMap.get(`${rIdx},${cIdx}`);
                                        const style = shapeColor ? getShapeColor(shapeColor) : null;

                                        return (
                                          <div
                                            key={`${rIdx}-${cIdx}`}
                                            style={
                                              isHit && style
                                                ? { backgroundColor: style.bg, color: style.text }
                                                : isCenterFree
                                                ? { backgroundColor: '#10b981', color: '#0f172a' }
                                                : isHit
                                                ? { backgroundColor: '#10b981', color: '#0f172a' }
                                                : undefined
                                            }
                                            className={`aspect-square rounded-sm flex items-center justify-center text-[9px] font-black ${
                                              isHit || isCenterFree
                                                ? ''
                                                : 'bg-slate-800 text-slate-600'
                                            }`}
                                          >
                                            {isCenterFree ? 'F' : isHit ? '✓' : ''}
                                          </div>
                                        );
                                      })
                                    )}
                                  </div>

                                  {/* Legend labels */}
                                  {variation.shapeGroups && variation.shapeGroups.length > 0 && (
                                    <div className="w-full flex flex-wrap gap-1 mt-1.5 pt-1 border-t border-slate-800">
                                      {variation.shapeGroups.slice(0, 3).map((sg, idx) => (
                                        <span
                                          key={idx}
                                          className="text-[9px] px-1 rounded bg-slate-800 text-slate-300 font-semibold"
                                        >
                                          {language === 'en' ? sg.nameEn : sg.nameAm}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {/* Show more button if there are more variations in ALL view */}
                          {variations.length > displayLimit && (
                            <div className="flex justify-center mt-3">
                              <button
                                type="button"
                                onClick={() => setExpandedRules((prev) => ({ ...prev, [rule.id]: true }))}
                                className="px-5 py-2.5 rounded-xl text-xs font-black bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-all cursor-pointer shadow-lg"
                              >
                                ▼ ቀሪዎቹን {variations.length - displayLimit} አማራጮች አሳይ (ሁሉንም {variations.length} አማራጮች አሳይ)
                              </button>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Bottom Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-t border-slate-800 bg-[#1e293b] text-xs text-slate-400">
          <span>
            ማሳሰቢያ፦ ሁሉም የቢንጎ ሕጎች (1-27) እና አማራጮቻቸው ለሁሉም ተጫዋቾች በግልጽ ይታያሉ። የመጨረሻው የወጣው ቁጥር በሰራው ቢንጎ ውስጥ መኖር አለበት።
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg font-black bg-slate-800 text-white hover:bg-slate-700 cursor-pointer"
          >
            ተመለስ (Done)
          </button>
        </div>
      </div>
    </div>
  );
};
