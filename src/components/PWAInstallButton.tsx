import React, { useState } from 'react';
import {
  Download,
  Smartphone,
  CheckCircle2,
  Share2,
  X,
  FileDown,
  Copy,
  Check,
  QrCode,
  Sparkles,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { buildApiUrl } from '../utils/realtimeRoomClient';

interface PWAInstallButtonProps {
  isDark?: boolean;
  variant?: 'header' | 'card' | 'compact';
  label?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  isDark = true,
  variant = 'header',
  label,
}) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadedLauncher, setDownloadedLauncher] = useState(false);
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const sharedProductionUrl = 'https://ais-pre-5o2vwpcgfgshkft456mpos-198161772381.europe-west2.run.app';
  const currentAppUrl =
    typeof window !== 'undefined' &&
    window.location?.origin &&
    !window.location.origin.startsWith('file') &&
    !window.location.origin.includes('ais-dev-')
      ? window.location.origin
      : sharedProductionUrl;

  const directApkDownloadUrl = buildApiUrl('/Sun-Bingo.apk');

  const handleDownloadSignedApk = async () => {
    setIsGenerating(true);
    setShareStatus(null);
    try {
      const res = await fetch(directApkDownloadUrl);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Sun-Bingo.apk';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setDownloadedLauncher(true);
        setShareStatus(
          '✅ ሙሉው የ Android አፕ (Sun-Bingo.apk) ወርዷል! የወረደውን Sun-Bingo.apk ፋይል በስልክዎ ነክተው በቀጥታ "Install" ይበሉት!'
        );
        return;
      }
    } catch {
      // fallback below
    } finally {
      setIsGenerating(false);
    }
    const a = document.createElement('a');
    a.href = `${sharedProductionUrl}/Sun-Bingo.apk`;
    a.download = 'Sun-Bingo.apk';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${encodeURIComponent(
    currentAppUrl
  )}`;

  const handleInstallClick = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (!accepted) {
        setShowModal(true);
      }
    } else {
      setShowModal(true);
    }
  };

  const handleCopyAndroidLink = () => {
    if (typeof window !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(currentAppUrl).catch(() => {});
      setCopiedUrl(true);
      setShareStatus(
        '✓ የ Android App መጫኛ ሊንክ ኮፒ ተደርጓል! በስልክዎ Chrome Browser ላይ ከፍተው "Install App" ይበሉት!'
      );
      setTimeout(() => setCopiedUrl(false), 2500);
    }
  };

  // Fetches the complete, 100% self-contained standalone Ezi Bingo HTML application (~720 KB)
  // that works on ANY Android phone when transferred via Bluetooth, Xender, Telegram, or WhatsApp!
  const getStandaloneAppHtml = async (): Promise<string> => {
    try {
      if (
        typeof window !== 'undefined' &&
        (window.location.protocol === 'file:' ||
          window.location.protocol === 'content:' ||
          (window as unknown as { __EZI_STANDALONE__?: boolean }).__EZI_STANDALONE__)
      ) {
        return '<!DOCTYPE html>\n' + document.documentElement.outerHTML;
      }
      const res = await fetch(buildApiUrl('/Ezi-Bingo-App.html'), { cache: 'no-store' });
      if (res.ok) {
        const text = await res.text();
        if (text && text.length > 50000) {
          return text;
        }
      }
    } catch {
      // Fallback below
    }
    return '<!DOCTYPE html>\n' + document.documentElement.outerHTML;
  };

  // Downloads the full 100% self-contained Ezi-Bingo-Android-App.html file
  const handleDownloadFullStandaloneApp = async () => {
    setIsGenerating(true);
    setShareStatus(null);
    try {
      const fullHtml = await getStandaloneAppHtml();
      const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Sun-Bingo-Android-App.html';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setDownloadedLauncher(true);
      setShareStatus(
        'ሙሉው የ Android አፕ ፋይል (Sun-Bingo-Android-App.html) ወርዷል! በቴሌግራም፣ ዋትስአፕ፣ Xender ወይም ብሉቱዝ ለማንኛውም Android ስልክ ሲልኩት በቀጥታ ይከፈታል!'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // Shares the full standalone Sun-Bingo-Android-App.html file via Web Share API (or downloads it if blocked by iframe)
  const handleShareStandaloneFile = async () => {
    setIsGenerating(true);
    setShareStatus(null);
    try {
      const fullHtml = await getStandaloneAppHtml();
      const file = new File([fullHtml], 'Sun-Bingo-Android-App.html', {
        type: 'text/html',
      });

      if (
        navigator.share &&
        navigator.canShare &&
        navigator.canShare({ files: [file] })
      ) {
        try {
          await navigator.share({
            title: 'Sun Bingo (ሳን ቢንጎ) - Android App',
            text: `🎲 Sun Bingo (ሳን ቢንጎ) የ Android መተግበሪያ!\n📲 በቀጥታ ለመጫን፦ ${currentAppUrl}`,
            files: [file],
          });
          setShareStatus('ሙሉው የ Android አፕ ፋይል በተሳካ ሁኔታ ተልኳል!');
          setIsGenerating(false);
          return;
        } catch {
          // Fall back to direct file download
        }
      }

      await handleDownloadFullStandaloneApp();
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      {variant === 'compact' ? (
        <button
          type="button"
          onClick={handleInstallClick}
          className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 text-[11px] font-black flex items-center gap-1 shadow-sm cursor-pointer whitespace-nowrap shrink-0 transition-transform active:scale-95"
          title="የ Android መተግበሪያ አውርድ / ስልክ ላይ ጫን"
        >
          <Download className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>{label || '📲 መተግበሪያ ጫን (Install)'}</span>
        </button>
      ) : variant === 'header' ? (
        <button
          type="button"
          onClick={handleInstallClick}
          className="px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-sm cursor-pointer whitespace-nowrap transition-transform active:scale-95"
          title="ኢዚ ቢንጎ የ Android አፕ አውርድ እና ስልክ ላይ ጫን"
        >
          <Download className="w-4 h-4 stroke-[2.5]" />
          <span>{label || '📲 መተግበሪያ ጫን (Install)'}</span>
        </button>
      ) : (
        <div
          className={`rounded-2xl border p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
            isDark
              ? 'bg-gradient-to-r from-emerald-950/70 via-slate-900 to-amber-950/40 border-emerald-500/40'
              : 'bg-gradient-to-r from-emerald-50 via-white to-amber-50 border-emerald-300'
          }`}
        >
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 text-slate-950 flex items-center justify-center font-black text-lg shadow-md shrink-0">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-black">
                  📲 የ Android ስልክ መተግበሪያ (Ezi-Bingo.apk)
                </h3>
                {isInstalled ? (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> ስልክዎ ላይ ተጭኗል
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-500 text-slate-950">
                    Native APK Ready
                  </span>
                )}
              </div>
              <p
                className={`text-xs mt-1 leading-relaxed ${
                  isDark ? 'text-slate-300' : 'text-slate-600'
                }`}
              >
                ሙሉውን የአንድሮይድ መተግበሪያ (`Ezi-Bingo.apk` ከ75ቱም የቢንጎ ድምፆች ጋር) በቀጥታ ስልክዎ ላይ አውርደው ይጫኑ!
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <a
              href="/Ezi-Bingo.apk?v=10"
              download="Ezi-Bingo.apk"
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-lg cursor-pointer no-underline"
            >
              <Download className="w-4 h-4 stroke-[2.5]" />
              <span>📲 Download APK</span>
            </a>
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-lg cursor-pointer"
            >
              <Smartphone className="w-4 h-4 stroke-[2.5]" />
              <span>ተጨማሪ አማራጮች</span>
            </button>
          </div>
        </div>
      )}

      {/* Direct 1-Tap Android App Installer Modal (Zero Configuration Needed) */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
          <div
            className={`w-full max-w-md max-h-[92vh] overflow-y-auto rounded-3xl border p-5 shadow-2xl space-y-4 my-auto ${
              isDark
                ? 'bg-slate-900 border-emerald-500/40 text-slate-100'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-3 border-slate-700/50">
              <div className="flex items-center gap-2.5">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-400 via-teal-500 to-amber-500 text-slate-950 flex items-center justify-center font-black shadow-lg">
                  <Smartphone className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black">
                    Ezi Bingo — ሙሉ የ Android መተግበሪያ
                  </h3>
                  <p className="text-[11px] text-emerald-400 font-bold">
                    ሁሉም ነገሩ ያለቀ — በአንድ ንክኪ የሚጫን (Ready to Install)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-xl bg-rose-600 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {shareStatus && (
              <div className="p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-extrabold leading-relaxed">
                {shareStatus}
              </div>
            )}

            {/* 1. Direct One-Tap Install or Download Complete App File */}
            <div
              className={`p-4 rounded-2xl border space-y-3.5 ${
                isDark
                  ? 'bg-emerald-950/30 border-emerald-500/40'
                  : 'bg-emerald-50 border-emerald-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-black text-emerald-400 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  <span>1. ያለቀለትን ሙሉ የ Android አፕ አውርድ / ጫን</span>
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-slate-950">
                  100% Ready
                </span>
              </div>

              {isInstallable && (
                <button
                  type="button"
                  onClick={install}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                >
                  <Download className="w-5 h-5 stroke-[2.5]" />
                  <span>📲 አሁኑኑ ስልኬ ላይ ጫን (1-Tap Install App)</span>
                </button>
              )}

              <a
                href="/Ezi-Bingo.apk?v=10"
                download="Ezi-Bingo.apk"
                onClick={() => {
                  setDownloadedLauncher(true);
                  setShareStatus(
                    '✅ ሙሉው የ Android አፕ (Ezi-Bingo.apk) እየወረደ ነው! ሲጨርስ የወረደውን Ezi-Bingo.apk ፋይል ነክተው "Install" ይበሉት!'
                  );
                }}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg cursor-pointer no-underline"
              >
                <Download className="w-5 h-5 stroke-[2.5]" />
                <span>📲 Download APK — Ezi-Bingo.apk አውርድና ጫን</span>
              </a>

              <button
                type="button"
                disabled={isGenerating}
                onClick={handleDownloadFullStandaloneApp}
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg cursor-pointer disabled:opacity-50"
              >
                <FileDown className="w-5 h-5 stroke-[2.5]" />
                <span>
                  {isGenerating
                    ? 'ሙሉውን አፕ በማውረድ ላይ...'
                    : downloadedLauncher
                    ? '✓ ወርዷል! ድጋሚ አውርድ (Ezi-Bingo-Android-App.html)'
                    : '📥 ሙሉውን የ Android አፕ ፋይል አውርድ (1-Click Download)'}
                </span>
              </button>

              <button
                type="button"
                disabled={isGenerating}
                onClick={handleShareStandaloneFile}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow cursor-pointer disabled:opacity-50"
              >
                <Share2 className="w-4 h-4" />
                <span>በቴሌግራም / ዋትስአፕ / ብሉቱዝ ለሌላ ስልክ ላክ</span>
              </button>
            </div>

            {/* 2. Direct Android Chrome Link + QR Code */}
            <div
              className={`p-4 rounded-2xl border space-y-3 ${
                isDark ? 'bg-slate-800/70 border-slate-700' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="text-xs font-black text-amber-400 flex items-center gap-1.5">
                <QrCode className="w-4 h-4" />
                <span>2. በስልክዎ Chrome ላይ በቀጥታ ለመጫን፦</span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={currentAppUrl}
                  className={`flex-1 px-3 py-2 rounded-xl text-xs font-mono-tabular border ${
                    isDark
                      ? 'bg-slate-950 border-slate-700 text-emerald-300'
                      : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
                <button
                  type="button"
                  onClick={handleCopyAndroidLink}
                  className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  {copiedUrl ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedUrl ? 'Copied!' : 'ሊንክ Copy'}</span>
                </button>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <div className="p-1.5 rounded-xl bg-white shadow shrink-0">
                  <img
                    src={qrCodeImageUrl}
                    alt="Ezi Bingo Android App QR"
                    className="w-20 h-20 rounded-lg"
                  />
                </div>
                <ol className="list-decimal list-inside space-y-1 text-[11px] opacity-90 leading-relaxed">
                  <li>
                    ከላይ ያለውን ሊንክ በ Android ስልክዎ <strong>Chrome</strong> ይክፈቱ።
                  </li>
                  <li>
                    ከላይ በቀኝ ጥግ <strong>⋮ (3 ነጥብ) &rarr; &ldquo;Install app&rdquo;</strong> ይበሉት፤ ወዲያውኑ ስልክዎ ላይ ይጫናል!
                  </li>
                </ol>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowModal(false)}
              className={`w-full py-2.5 rounded-xl font-extrabold text-xs cursor-pointer ${
                isDark
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                  : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
              }`}
            >
              ዝጋ (Close)
            </button>
          </div>
        </div>
      )}
    </>
  );
};

