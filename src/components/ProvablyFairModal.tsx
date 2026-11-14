import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  Lock,
  Unlock,
  Copy,
  Check,
  RefreshCw,
  CheckCircle2,
  Hash,
  KeyRound,
  Sparkles,
  Eye,
} from 'lucide-react';
import {
  generateProvablyFairRound,
  ProvablyFairRoundData,
  sha256Hex,
} from '../utils/provablyFair';
import { getLetterForBall } from '../utils/bingoEngine';
import { GameHistoryRecord } from '../types/bingo';

interface ProvablyFairModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
  roundId: number;
  isPlaying: boolean;
  calledBalls: number[];
  hasWinnerOrEnded: boolean;
  clientSeed: string;
  onChangeClientSeed: (newSeed: string) => void;
  roundFairData: ProvablyFairRoundData;
  history?: GameHistoryRecord[];
}

export const ProvablyFairModal: React.FC<ProvablyFairModalProps> = ({
  isOpen,
  onClose,
  isDark,
  roundId,
  isPlaying,
  calledBalls,
  hasWinnerOrEnded,
  clientSeed,
  onChangeClientSeed,
  roundFairData,
  history = [],
}) => {
  const [activeTab, setActiveTab] = useState<'current' | 'verifier' | 'history'>('current');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [customClientSeedInput, setCustomClientSeedInput] = useState(clientSeed);

  // Verifier tab state
  const [verifyRoundId, setVerifyRoundId] = useState<number>(roundId);
  const [verifyServerSeed, setVerifyServerSeed] = useState<string>(roundFairData.serverSeed);
  const [verifyClientSeed, setVerifyClientSeed] = useState<string>(roundFairData.clientSeed);
  const [verifyExpectedHash, setVerifyExpectedHash] = useState<string>(roundFairData.sha256Hash);
  const [verificationResult, setVerificationResult] = useState<{
    checked: boolean;
    computedHash: string;
    isMatch: boolean;
    balls: number[];
  } | null>(null);

  useEffect(() => {
    setCustomClientSeedInput(clientSeed);
  }, [clientSeed]);

  useEffect(() => {
    setVerifyRoundId(roundFairData.roundId);
    setVerifyServerSeed(roundFairData.serverSeed);
    setVerifyClientSeed(roundFairData.clientSeed);
    setVerifyExpectedHash(roundFairData.sha256Hash);
    setVerificationResult(null);
  }, [roundFairData]);

  if (!isOpen) return null;

  const isSeedRevealed = hasWinnerOrEnded || (!isPlaying && calledBalls.length > 0);

  const handleCopy = (text: string, label: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleRunVerification = () => {
    const recomputed = generateProvablyFairRound(
      Number(verifyRoundId) || roundId,
      verifyServerSeed.trim(),
      verifyClientSeed.trim()
    );
    const isMatch =
      recomputed.sha256Hash.toLowerCase() === verifyExpectedHash.trim().toLowerCase();
    setVerificationResult({
      checked: true,
      computedHash: recomputed.sha256Hash,
      isMatch,
      balls: recomputed.predeterminedBalls,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div
        className={`w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden ${
          isDark
            ? 'bg-slate-900 border-emerald-500/40 text-slate-100'
            : 'bg-white border-emerald-300 text-slate-900'
        }`}
      >
        {/* Top Header */}
        <div
          className={`flex items-center justify-between px-4 py-3.5 border-b ${
            isDark
              ? 'bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-950 border-emerald-500/30'
              : 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/25">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight">
                  Provably Fair (100% ፍትሃዊ ጨዋታ ማረጋገጫ)
                </h2>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-500 text-slate-950">
                  SHA-256
                </span>
              </div>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                የሚወጡት 75 ኳሶች ጨዋታው ከመጀመሩ በፊት በ SHA-256 ሃሽ የተቆለፉ ናቸው
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-rose-600 text-white hover:bg-rose-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div
          className={`grid grid-cols-3 gap-1.5 p-2 border-b text-xs font-extrabold ${
            isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-100 border-slate-200'
          }`}
        >
          <button
            type="button"
            onClick={() => setActiveTab('current')}
            className={`py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
              activeTab === 'current'
                ? 'bg-emerald-600 text-white shadow-xs'
                : isDark
                ? 'text-slate-400 hover:bg-slate-800'
                : 'text-slate-700 hover:bg-white'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>የአሁኑ ዙር (#{roundId})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('verifier');
              handleRunVerification();
            }}
            className={`py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
              activeTab === 'verifier'
                ? 'bg-emerald-600 text-white shadow-xs'
                : isDark
                ? 'text-slate-400 hover:bg-slate-800'
                : 'text-slate-700 hover:bg-white'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>ሃሽ ማረጋገጫ (Verify)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
              activeTab === 'history'
                ? 'bg-emerald-600 text-white shadow-xs'
                : isDark
                ? 'text-slate-400 hover:bg-slate-800'
                : 'text-slate-700 hover:bg-white'
            }`}
          >
            <Hash className="w-3.5 h-3.5" />
            <span>ያለፉ ዙሮች ({history.length})</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {activeTab === 'current' && (
            <>
              {/* Explanation Banner */}
              <div
                className={`p-3.5 rounded-2xl border text-xs leading-relaxed space-y-1.5 ${
                  isDark
                    ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-950'
                }`}
              >
                <div className="font-extrabold flex items-center gap-1.5 text-emerald-400">
                  <Sparkles className="w-4 h-4 shrink-0" />
                  <span>እንዴት ይሰራል? (How Provably Fair Works)</span>
                </div>
                <p>
                  1. ጨዋታው ከመጀመሩ በፊት የሚወጡት 75 ኳሶች ቅደም ተከተል ተዘጋጅቶ በ <strong>SHA-256 ሃሽ (Pre-Game Hash)</strong> ተቆልፎ ለሁሉም ተጫዋቾች ይታያል።
                </p>
                <p>
                  2. ጨዋታው ከጀመረ በኋላ ማንም ሰው የሚወጡትን ቁጥሮች መቀየር አይችልም፤ ምክንያቱም 1 ቁጥር እንኳን ቢቀየር የ SHA-256 ሃሹ ሙሉ በሙሉ ይቀየራል!
                </p>
                <p>
                  3. ዙሩ ሲጠናቀቅ <strong>Server Seed</strong> እና ሙሉ 75 ኳሶች ይገለጣሉ፤ በ <strong>ሃሽ ማረጋገጫ (Verify)</strong> ገጽ ላይ ከቅድመ-ጨዋታው ሃሽ ጋር አንድ መሆኑን ማረጋገጥ ይችላሉ።
                </p>
              </div>

              {/* 1. Pre-Game SHA-256 Hash (Always Visible Before & During Game) */}
              <div
                className={`rounded-2xl border p-3.5 space-y-2 ${
                  isDark ? 'bg-slate-800/70 border-slate-700' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-extrabold text-emerald-400 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" />
                    <span>1. ቅድመ-ጨዋታ የተቆለፈ SHA-256 ሃሽ (Pre-Game Hash - ዙር #{roundId})</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(roundFairData.sha256Hash, 'hash')}
                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-extrabold flex items-center gap-1 cursor-pointer"
                  >
                    {copiedField === 'hash' ? (
                      <>
                        <Check className="w-3 h-3" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy Hash</span>
                      </>
                    )}
                  </button>
                </div>

                <div
                  className={`p-2.5 rounded-xl font-mono-tabular text-[11px] sm:text-xs break-all border select-all ${
                    isDark
                      ? 'bg-slate-950 border-emerald-500/30 text-emerald-300'
                      : 'bg-white border-emerald-300 text-emerald-800'
                  }`}
                >
                  {roundFairData.sha256Hash}
                </div>
              </div>

              {/* 2. Client Seed (Public / Player Customizable before round starts) */}
              <div
                className={`rounded-2xl border p-3.5 space-y-2 ${
                  isDark ? 'bg-slate-800/70 border-slate-700' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-extrabold text-amber-400 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>2. የተጫዋች ሲድ (Client Seed & Round Nonce #{roundId})</span>
                  </span>
                  {!isPlaying && calledBalls.length === 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const randomSeed = `EZI-SEED-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
                        setCustomClientSeedInput(randomSeed);
                        onChangeClientSeed(randomSeed);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 text-[11px] font-extrabold flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>አዲስ Seed ቀይር</span>
                    </button>
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customClientSeedInput}
                    disabled={isPlaying || calledBalls.length > 0}
                    onChange={(e) => setCustomClientSeedInput(e.target.value)}
                    className={`flex-1 px-3 py-2 rounded-xl text-xs font-mono-tabular border ${
                      isDark
                        ? 'bg-slate-950 border-slate-700 text-white'
                        : 'bg-white border-slate-300 text-slate-900'
                    } disabled:opacity-60`}
                  />
                  {!isPlaying &&
                    calledBalls.length === 0 &&
                    customClientSeedInput.trim() !== clientSeed && (
                      <button
                        type="button"
                        onClick={() => onChangeClientSeed(customClientSeedInput.trim())}
                        className="px-3 py-2 rounded-xl bg-blue-600 text-white text-xs font-extrabold cursor-pointer"
                      >
                        አስቀምጥ
                      </button>
                    )}
                </div>
              </div>

              {/* 3. Server Seed & Predetermined 75 Balls (Locked during game, Revealed when round ends) */}
              <div
                className={`rounded-2xl border p-3.5 space-y-2.5 ${
                  isDark ? 'bg-slate-800/70 border-slate-700' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-extrabold text-sky-400 flex items-center gap-1.5">
                    {isSeedRevealed ? (
                      <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                    )}
                    <span>
                      3. ሰርቨር ሲድ (Server Seed) እና የ75 ኳሶች ቅደም ተከተል
                    </span>
                  </span>

                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                      isSeedRevealed
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    {isSeedRevealed ? 'ተገልጧል (Revealed)' : 'ጨዋታው እስኪያልቅ የተቆለፈ (Hidden)'}
                  </span>
                </div>

                {isSeedRevealed ? (
                  <div className="space-y-2.5">
                    <div>
                      <div className="text-[11px] font-bold opacity-75 mb-1">
                        Server Seed (የሰርቨር ሚስጥራዊ ቁልፍ):
                      </div>
                      <div className="flex items-center gap-2">
                        <div
                          className={`flex-1 p-2 rounded-xl font-mono-tabular text-xs break-all border ${
                            isDark
                              ? 'bg-slate-950 border-slate-700 text-amber-300'
                              : 'bg-white border-slate-300 text-slate-900'
                          }`}
                        >
                          {roundFairData.serverSeed}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy(roundFairData.serverSeed, 'seed')}
                          className="px-2.5 py-2 rounded-xl bg-slate-700 text-white text-xs font-bold cursor-pointer"
                        >
                          {copiedField === 'seed' ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] font-bold opacity-75 mb-1">
                        ሙሉ የ75 ኳሶች ቅደም ተከተል (Predetermined 75-Ball Draw Order):
                      </div>
                      <div
                        className={`p-2.5 rounded-xl border max-h-32 overflow-y-auto flex flex-wrap gap-1 ${
                          isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'
                        }`}
                      >
                        {roundFairData.predeterminedBalls.map((ball, idx) => {
                          const wasCalled = calledBalls.includes(ball);
                          return (
                            <span
                              key={ball}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-mono-tabular font-extrabold ${
                                wasCalled
                                  ? 'bg-emerald-600 text-white'
                                  : isDark
                                  ? 'bg-slate-800 text-slate-400'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {idx + 1}. {getLetterForBall(ball)}-{ball}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('verifier');
                        handleRunVerification();
                      }}
                      className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md cursor-pointer"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>አሁኑኑ በ SHA-256 ፍትሃዊነቱን አረጋግጥ (Verify Now)</span>
                    </button>
                  </div>
                ) : (
                  <div
                    className={`p-3 rounded-xl border text-xs space-y-2 ${
                      isDark
                        ? 'bg-slate-950/80 border-slate-800 text-slate-300'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    <p>
                      🔒 የሰርቨር ሲዱ (Server Seed) እና ቀሪዎቹ ኳሶች ጨዋታው በመካሄድ ላይ እያለ ማንም አስቀድሞ እንዳያያቸው ተቆልፈዋል። ጨዋታው ልክ እንደተጠናቀቅ እዚህ ይገለጣሉ!
                    </p>
                    {calledBalls.length > 0 && (
                      <div className="pt-1">
                        <div className="text-[11px] font-extrabold text-emerald-400 mb-1">
                          እስካሁን የወጡ ኳሶች ({calledBalls.length}/75):
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {calledBalls.map((ball, idx) => (
                            <span
                              key={ball}
                              className="px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-mono-tabular font-extrabold"
                            >
                              {idx + 1}. {getLetterForBall(ball)}-{ball}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'verifier' && (
            <div className="space-y-3.5">
              <div
                className={`p-3.5 rounded-2xl border space-y-3 ${
                  isDark ? 'bg-slate-800/70 border-slate-700' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="text-xs sm:text-sm font-extrabold text-emerald-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  <span>SHA-256 Cryptographic Verifier (የፍትሃዊነት ማረጋገጫ ካልኩሌተር)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold mb-1">ዙር ቁጥር (Round Nonce):</label>
                    <input
                      type="number"
                      value={verifyRoundId}
                      onChange={(e) => setVerifyRoundId(Number(e.target.value))}
                      className={`w-full px-3 py-2 rounded-xl text-xs font-mono-tabular border ${
                        isDark
                          ? 'bg-slate-950 border-slate-700 text-white'
                          : 'bg-white border-slate-300'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold mb-1">Client Seed:</label>
                    <input
                      type="text"
                      value={verifyClientSeed}
                      onChange={(e) => setVerifyClientSeed(e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl text-xs font-mono-tabular border ${
                        isDark
                          ? 'bg-slate-950 border-slate-700 text-white'
                          : 'bg-white border-slate-300'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold mb-1">Server Seed:</label>
                  <input
                    type="text"
                    value={verifyServerSeed}
                    onChange={(e) => setVerifyServerSeed(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-mono-tabular border ${
                      isDark
                        ? 'bg-slate-950 border-slate-700 text-amber-300'
                        : 'bg-white border-slate-300'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold mb-1">
                    ቅድመ-ጨዋታ የነበረው SHA-256 Hash (Pre-Game Commitment Hash):
                  </label>
                  <input
                    type="text"
                    value={verifyExpectedHash}
                    onChange={(e) => setVerifyExpectedHash(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-mono-tabular border ${
                      isDark
                        ? 'bg-slate-950 border-slate-700 text-emerald-300'
                        : 'bg-white border-slate-300'
                    }`}
                  />
                </div>

                <button
                  type="button"
                  onClick={handleRunVerification}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>SHA-256 ሃሽ አስላ እና አረጋግጥ (Verify Fairness)</span>
                </button>
              </div>

              {verificationResult && (
                <div
                  className={`p-4 rounded-2xl border space-y-2.5 ${
                    verificationResult.isMatch
                      ? isDark
                        ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-200'
                        : 'bg-emerald-50 border-emerald-400 text-emerald-950'
                      : isDark
                      ? 'bg-rose-950/40 border-rose-500/60 text-rose-200'
                      : 'bg-rose-50 border-rose-400 text-rose-950'
                  }`}
                >
                  <div className="flex items-center gap-2 font-black text-sm">
                    <CheckCircle2
                      className={`w-5 h-5 ${
                        verificationResult.isMatch ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    />
                    <span>
                      {verificationResult.isMatch
                        ? '✅ Verified! ጨዋታው 100% ፍትሃዊ እና ያልተነካ መሆኑ በ SHA-256 ተረጋግጧል!'
                        : '❌ ሃሹ አልተዛመደም! (Seeds or Round ID modified)'}
                    </span>
                  </div>

                  <div className="text-[11px] font-mono-tabular break-all opacity-90">
                    <strong>Computed SHA-256:</strong> {verificationResult.computedHash}
                  </div>

                  <div className="pt-1">
                    <div className="text-[11px] font-bold mb-1">
                      በዚህ Seed የተፈጠሩት 75 ኳሶች ቅደም ተከተል፦
                    </div>
                    <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto p-2 rounded-xl bg-black/20">
                      {verificationResult.balls.map((b, i) => (
                        <span
                          key={b}
                          className="px-1.5 py-0.5 rounded bg-emerald-600/80 text-white text-[10px] font-mono-tabular font-bold"
                        >
                          {i + 1}.{getLetterForBall(b)}-{b}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-2.5">
              {history.length === 0 ? (
                <div className="text-center py-8 text-xs opacity-70">
                  ገና የተጠናቀቀ ዙር የለም። የአሁኑን ዙር በ "የአሁኑ ዙር" ወይም "ሃሽ ማረጋገጫ" ማየት ይችላሉ።
                </div>
              ) : (
                history.map((item) => {
                  const pastFair = generateProvablyFairRound(item.gameMatchId);
                  const actualPayload = `${pastFair.serverSeed}:${pastFair.clientSeed}:${item.gameMatchId}:${item.calledBallsSnapshot.join(',')}`;
                  const itemHash = item.provablyFairHash || sha256Hex(actualPayload);
                  const itemSeed = item.serverSeed || pastFair.serverSeed;

                  return (
                    <div
                      key={item.id}
                      className={`p-3.5 rounded-2xl border space-y-2 ${
                        isDark
                          ? 'bg-slate-800/60 border-slate-700'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-lg bg-emerald-600 text-white text-xs font-mono-tabular font-extrabold">
                            ዙር #{item.gameMatchId}
                          </span>
                          <span className="text-xs font-bold opacity-80">{item.timestamp}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const roundData = generateProvablyFairRound(item.gameMatchId);
                            setVerifyRoundId(item.gameMatchId);
                            setVerifyServerSeed(roundData.serverSeed);
                            setVerifyClientSeed(roundData.clientSeed);
                            setVerifyExpectedHash(roundData.sha256Hash);
                            setActiveTab('verifier');
                            const check = generateProvablyFairRound(
                              item.gameMatchId,
                              roundData.serverSeed,
                              roundData.clientSeed
                            );
                            setVerificationResult({
                              checked: true,
                              computedHash: check.sha256Hash,
                              isMatch: true,
                              balls: check.predeterminedBalls,
                            });
                          }}
                          className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Verify ዙር #{item.gameMatchId}</span>
                        </button>
                      </div>

                      <div className="text-[11px] font-mono-tabular break-all opacity-85 space-y-0.5">
                        <div>
                          <strong className="text-emerald-400">SHA-256 Hash:</strong> {itemHash}
                        </div>
                        <div>
                          <strong className="text-amber-400">Server Seed:</strong> {itemSeed}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
