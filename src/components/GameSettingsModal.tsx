import React from 'react';
import {
  X,
  Sliders,
  CheckSquare,
  Square,
  CheckCircle2,
  Trash2,
  ArrowUpDown,
  Columns2,
  Columns3,
  BookOpen,
  Zap,
  ChevronUp,
  ChevronDown,
  Lock,
  Volume2,
  VolumeX,
  Smartphone,
} from 'lucide-react';
import { Language, CartelaSortMode, UnregisteredWhenStartedMode } from '../types/bingo';
import { TRANSLATIONS } from '../utils/translations';

interface GameSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
  totalCartelas: number;
  selectedCartelaIds: number[];
  stakeAmount: number;
  roundId?: number;
  prizeAmount?: number;
  activePlayersCount?: number;
  calledBallsCount?: number;
  sortMode: CartelaSortMode;
  gridColumns: 2 | 3;
  autoDaub: boolean;
  voiceEnabled?: boolean;
  sfxEnabled?: boolean;
  voiceGender?: 'female' | 'male';
  onChangeVoiceGender?: (gender: 'female' | 'male') => void;
  vibrationEnabled?: boolean;
  onToggleVibration?: () => void;
  language: Language;
  showFullCartelasSection: boolean;
  unregisteredWhenStartedMode?: UnregisteredWhenStartedMode;
  onChangeUnregisteredWhenStartedMode?: (mode: UnregisteredWhenStartedMode) => void;
  onChangeLanguage: (lang: Language) => void;
  onToggleShowFullCartelas: () => void;
  onRegisterAll: () => void;
  onOpenFastBingoApp?: () => void;
  onOpenAdminLogin?: () => void;
  onSelectAllCartelas: () => void;
  onClearSelection: () => void;
  onRegisterSelected: () => void;
  onDeleteSelected: () => void;
  onChangeSortMode: (mode: CartelaSortMode) => void;
  onChangeGridColumns: (cols: 2 | 3) => void;
  onToggleAutoDaub: () => void;
  onToggleVoice?: () => void;
  onToggleSfx?: () => void;
  onOpenPatternVisualizer?: () => void;
  onResetMarks?: () => void;
}

export const GameSettingsModal: React.FC<GameSettingsModalProps> = ({
  isOpen,
  onClose,
  isDark,
  totalCartelas,
  selectedCartelaIds,
  stakeAmount,
  roundId = 10,
  prizeAmount = 0,
  activePlayersCount = 0,
  calledBallsCount = 0,
  sortMode,
  gridColumns,
  autoDaub,
  voiceEnabled = true,
  sfxEnabled = true,
  voiceGender = 'female',
  onChangeVoiceGender,
  vibrationEnabled = true,
  onToggleVibration,
  language,
  showFullCartelasSection,
  unregisteredWhenStartedMode = 'hide',
  onChangeUnregisteredWhenStartedMode,
  onChangeLanguage,
  onToggleShowFullCartelas,
  onRegisterAll,
  onOpenFastBingoApp,
  onOpenAdminLogin,
  onSelectAllCartelas,
  onClearSelection,
  onRegisterSelected,
  onDeleteSelected,
  onChangeSortMode,
  onChangeGridColumns,
  onToggleAutoDaub,
  onToggleVoice,
  onToggleSfx,
  onOpenPatternVisualizer,
  onResetMarks,
}) => {
  if (!isOpen) return null;

  const t = TRANSLATIONS[language];
  const allSelected = totalCartelas > 0 && selectedCartelaIds.length === totalCartelas;

  const sortOptions: { id: CartelaSortMode; label: string }[] = [
    { id: 'by_square', label: 'በስኴር (2በ2)' },
    { id: 'by_rect', label: 'በሬክታንግል (3በ2/2በ3)' },
    { id: 'by_cross', label: 'በ + (3በ3 መስቀል)' },
    { id: 'by_t', label: 'በ T (3በ3)' },
    { id: 'by_lines', label: t.sortLines },
    { id: 'by_called', label: t.sortCalled },
    { id: 'by_squares', label: t.sortCorners },
    { id: 'default', label: t.sortDefault },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div
        className={`w-full max-w-lg rounded-2xl border p-4 sm:p-5 shadow-2xl space-y-3.5 max-h-[92vh] overflow-y-auto ${
          isDark
            ? 'bg-slate-900 border-slate-700 text-slate-100'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-700/30">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm select-none">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold">
                {t.settings}
              </h2>
              <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {t.settingsDesc}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-rose-600 text-white hover:bg-rose-700 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Reset Daub Marks Option (ምልክት የተደረጉ የጠቆሩ አጥፉ) */}
        {onResetMarks && (
          <div className="flex items-center justify-between p-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10">
            <div>
              <div className="text-xs font-black text-rose-400">
                ምልክት የተደረጉ አጥፉ (Reset Marks)
              </div>
              <div className="text-[10px] text-rose-300/80">
                በካርቴላዎች ላይ የጠቆሩ ምልክቶችን በሙሉ ያጸዳል
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                onResetMarks();
                onClose();
              }}
              className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>አጥፉ (Reset)</span>
            </button>
          </div>
        )}


        {/* Link to Separate Fast Bingo App */}
        {onOpenFastBingoApp && (
          <div
            className={`rounded-2xl border p-3 flex items-center justify-between gap-3 ${
              isDark
                ? 'bg-amber-950/30 border-amber-500/50'
                : 'bg-amber-50 border-amber-300'
            }`}
          >
            <div>
              <div className="text-xs font-extrabold text-amber-500 flex items-center gap-1.5">
                <Zap className="w-4 h-4 fill-current" />
                <span>⚡ Ezi Fast Bingo ({t.fastBingoBadge})</span>
              </div>
              <p className="text-[11px] opacity-80">
                {t.fastRuleShort}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenFastBingoApp();
              }}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 text-xs font-extrabold cursor-pointer whitespace-nowrap shadow-sm"
            >
              {t.fastAppBtn}
            </button>
          </div>
        )}

        {/* Section 1: ሁሉንም ምረጥ (Select) & ሁሉንም አስመዝግብ */}
        <div
          className={`rounded-2xl border p-3.5 space-y-2.5 ${
            isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs font-extrabold flex items-center gap-1.5 text-amber-500">
              <CheckSquare className="w-3.5 h-3.5" />
              <span>{t.cartelaSelectionSection}</span>
            </h3>
            <span className="text-xs font-mono-tabular font-extrabold">
              {selectedCartelaIds.length} / {totalCartelas}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={allSelected ? onClearSelection : onSelectAllCartelas}
              className={`px-3 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 border cursor-pointer ${
                isDark
                  ? 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-700'
                  : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-100'
              }`}
            >
              {allSelected ? (
                <>
                  <Square className="w-4 h-4 text-slate-400" />
                  <span>{t.unselectBtn}</span>
                </>
              ) : (
                <>
                  <CheckSquare className="w-4 h-4 text-amber-500" />
                  <span>{t.selectBtn}</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                onRegisterAll();
                onClose();
              }}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{t.registerAllBtn}</span>
            </button>

            {selectedCartelaIds.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    onRegisterSelected();
                    onClose();
                  }}
                  className="px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {t.registerSelectedBtn} ({selectedCartelaIds.length}) · {stakeAmount} ETB
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onDeleteSelected();
                    onClose();
                  }}
                  className="px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer bg-rose-600 hover:bg-rose-500 text-white shadow-sm"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>
                    {t.deleteSelectedBtn} ({selectedCartelaIds.length})
                  </span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Section 2: 2 ጎን ለጎን | 3 ጎን ለጎን | Show Less (ሰብስብ) */}
        <div
          className={`rounded-2xl border p-3.5 space-y-2.5 ${
            isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="text-xs font-extrabold text-blue-400">
            {t.cartelaViewSection}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onChangeGridColumns(2)}
              className={`px-3 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 border cursor-pointer ${
                gridColumns === 2
                  ? 'bg-blue-600 text-white border-blue-500'
                  : isDark
                  ? 'bg-slate-900 border-slate-700 text-slate-300'
                  : 'bg-white border-slate-300 text-slate-700'
              }`}
            >
              <Columns2 className="w-4 h-4" />
              <span>{t.twoSideBySide}</span>
            </button>

            <button
              type="button"
              onClick={() => onChangeGridColumns(3)}
              className={`px-3 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 border cursor-pointer ${
                gridColumns === 3
                  ? 'bg-blue-600 text-white border-blue-500'
                  : isDark
                  ? 'bg-slate-900 border-slate-700 text-slate-300'
                  : 'bg-white border-slate-300 text-slate-700'
              }`}
            >
              <Columns3 className="w-4 h-4" />
              <span>{t.threeSideBySide}</span>
            </button>

            <button
              type="button"
              onClick={onToggleShowFullCartelas}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold border cursor-pointer transition-colors ${
                isDark
                  ? 'bg-slate-900 text-rose-400 hover:bg-slate-800 border-slate-700'
                  : 'bg-rose-50 text-rose-600 hover:bg-rose-100 border-rose-200'
              }`}
            >
              {showFullCartelasSection ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  <span>{t.showLess}</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  <span>{t.showMore}</span>
                </>
              )}
            </button>
          </div>

          {onChangeUnregisteredWhenStartedMode && (
            <div className="pt-2.5 border-t border-slate-700/20 space-y-1.5">
              <div className="text-[11px] font-extrabold text-amber-400">
                ጨዋታ ከተጀመረ ያልተመዘገበ ካርቴላ፦
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onChangeUnregisteredWhenStartedMode('hide')}
                  className={`py-2 px-3 rounded-xl text-xs font-extrabold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    unregisteredWhenStartedMode === 'hide'
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-xs'
                      : isDark
                      ? 'bg-slate-900 border-slate-700 text-slate-300'
                      : 'bg-white border-slate-300 text-slate-700'
                  }`}
                >
                  <span>ይጥፋ (Hide)</span>
                </button>
                <button
                  type="button"
                  onClick={() => onChangeUnregisteredWhenStartedMode('dim')}
                  className={`py-2 px-3 rounded-xl text-xs font-extrabold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    unregisteredWhenStartedMode === 'dim'
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-xs'
                      : isDark
                      ? 'bg-slate-900 border-slate-700 text-slate-300'
                      : 'bg-white border-slate-300 text-slate-700'
                  }`}
                >
                  <span>ደብዝዝ (Dim)</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Section 3: የፈጣን ቢንጎ አደራደር (Cartela Sorting) */}
        <div
          className={`rounded-2xl border p-3.5 space-y-2.5 ${
            isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <h3 className="text-xs font-extrabold flex items-center gap-1.5 text-amber-400">
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>{t.sortingSection}</span>
          </h3>

          <div className="flex flex-wrap gap-1.5">
            {sortOptions.map((opt) => {
              const isActive = sortMode === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onChangeSortMode(opt.id)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-extrabold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-xs'
                      : isDark
                      ? 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800'
                      : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-100'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 4: ቋንቋ (አማ, ትግ, OM, EN) & Auto daub (Au) */}
        <div
          className={`rounded-2xl border p-3.5 space-y-3 ${
            isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'
          }`}
        >
          {/* Auto Daub (Au) Toggle inside ቅንብር (Settings) */}
          <div className="flex items-center justify-between gap-3 pb-2.5 border-b border-slate-700/20">
            <div>
              <div className="text-xs font-black flex items-center gap-1.5 text-emerald-400">
                <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-[11px] font-mono-tabular font-black text-emerald-300">
                  Au
                </span>
                <span>{t.autoDaub} (Auto Daub)</span>
              </div>
              <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {autoDaub
                  ? (language === 'am'
                      ? 'ቁጥሮች በወጡ ቅጽበት በራሳቸው ይጠቁራሉ'
                      : language === 'ti'
                      ? 'ቍጽርታት ኣብ ዝወጹሉ ቅጽበት ባዕሎም ይጽልምቱ'
                      : language === 'om'
                      ? 'Lakkoofsonni yeroo ba’an ofumaan mallatteeffamu'
                      : 'Numbers are automatically daubed when called')
                  : (language === 'am'
                      ? 'ተጫዋቹ በእጁ ቁጥሮችን ነክቶ ይጠቁራል'
                      : language === 'ti'
                      ? 'ተጻዋታይ ብኢዱ ነቒፉ ይጽልምት'
                      : language === 'om'
                      ? 'Taphattan harka isaatiin tuqee mallatteessa'
                      : 'Player marks called numbers manually')}
              </p>
            </div>
            <button
              type="button"
              onClick={onToggleAutoDaub}
              className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-2 border transition-all cursor-pointer shadow-sm active:scale-95 shrink-0 ${
                autoDaub
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black shadow-emerald-500/30'
                  : isDark
                  ? 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
                  : 'bg-white text-slate-600 border-slate-300 hover:text-slate-900'
              }`}
            >
              <span className={`w-2.5 h-2.5 rounded-full ${autoDaub ? 'bg-slate-950 animate-ping' : 'bg-slate-500'}`} />
              <span>{autoDaub ? 'Au በርቷል (ON)' : 'Au ጠፍቷል (OFF)'}</span>
            </button>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-extrabold text-emerald-400">{t.languageLabel}</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(
                [
                  { id: 'am', label: 'አማርኛ' },
                  { id: 'ti', label: 'ትግርኛ' },
                  { id: 'om', label: 'Afaan Oromoo' },
                  { id: 'en', label: 'English' },
                ] as const
              ).map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => onChangeLanguage(l.id)}
                  className={`py-2 px-3 rounded-xl text-xs font-extrabold border transition-all cursor-pointer text-center ${
                    language === l.id
                      ? 'bg-teal-600 text-white border-teal-500 shadow-md ring-2 ring-teal-400/50'
                      : isDark
                      ? 'bg-slate-900/90 text-slate-300 border-slate-700/80 hover:bg-slate-800'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sound Controls inside ቅንብር (Settings): ጠሪ ON/OFF, ድምጽ ON/OFF, ንዝረት ON/OFF እና ወንድ/ሴት ጠሪ */}
          <div className="pt-2.5 border-t border-slate-700/20 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-extrabold text-emerald-400">
                {t.soundColLabel} (Voice, SFX & Vibration):
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {onToggleVoice && (
                  <button
                    type="button"
                    onClick={onToggleVoice}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold border transition-colors cursor-pointer ${
                      voiceEnabled
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                        : isDark
                        ? 'bg-slate-900 text-slate-400 border-slate-700'
                        : 'bg-white text-slate-600 border-slate-300'
                    }`}
                  >
                    {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                    <span>{voiceEnabled ? 'ጠሪ ON' : 'ጠሪ OFF'}</span>
                  </button>
                )}

                {onToggleSfx && (
                  <button
                    type="button"
                    onClick={onToggleSfx}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold border transition-colors cursor-pointer ${
                      sfxEnabled
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-xs'
                        : isDark
                        ? 'bg-slate-900 text-slate-400 border-slate-700'
                        : 'bg-white text-slate-600 border-slate-300'
                    }`}
                  >
                    {sfxEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                    <span>{sfxEnabled ? 'ድምጽ ON' : 'ድምጽ OFF'}</span>
                  </button>
                )}

                {onToggleVibration && (
                  <button
                    type="button"
                    onClick={onToggleVibration}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold border transition-colors cursor-pointer ${
                      vibrationEnabled
                        ? 'bg-purple-600 text-white border-purple-500 shadow-xs'
                        : isDark
                        ? 'bg-slate-900 text-slate-400 border-slate-700'
                        : 'bg-white text-slate-600 border-slate-300'
                    }`}
                    title="የጨዋታ ማሳወቂያ ንዝረት (Vibration)"
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>{vibrationEnabled ? 'ንዝረት ON' : 'ንዝረት OFF'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Caller Gender Selector: ወንድ (Male) ወይም ሴት (Female) */}
            {onChangeVoiceGender && (
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-700/20 text-xs">
                <span className={`font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  🗣️ የጠሪው ድምጽ (Caller Voice)፦
                </span>
                <div className={`flex items-center p-0.5 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-300'}`}>
                  <button
                    type="button"
                    onClick={() => onChangeVoiceGender('female')}
                    className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                      voiceGender === 'female'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : isDark
                        ? 'text-slate-400 hover:text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    ሴት (Female)
                  </button>
                  <button
                    type="button"
                    onClick={() => onChangeVoiceGender('male')}
                    className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                      voiceGender === 'male'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : isDark
                        ? 'text-slate-400 hover:text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    ወንድ (Male)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
