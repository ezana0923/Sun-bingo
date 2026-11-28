import React, { useEffect, useState } from 'react';
import { Language } from '../types/bingo';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

const OFFLINE_TEXT: Record<Language, string> = {
  am: 'ኢንተርኔት ተቋርጧል — የተቀመጠ መረጃ እየተጠቀሙ ነው።',
  ti: 'ኢንተርኔት ተቋሪጹ ኣሎ — ዝተዓቀበ ሓበሬታ ትጥቀሙ ኣለኹም።',
  om: 'Interneetiin citeera — odeeffannoo kuufame fayyadamaa jirtu.',
  en: 'Offline Mode — Using cached data.',
};

const readStoredLang = (): Language => {
  if (typeof window !== 'undefined') {
    const s =
      localStorage.getItem('ezi_selected_language') ||
      localStorage.getItem('ezi_fast_language') ||
      localStorage.getItem('ezi_regular_language') ||
      localStorage.getItem('ezi_pref_lang');
    if (s === 'am' || s === 'ti' || s === 'om' || s === 'en') return s;
  }
  return 'am';
};

export const OfflineIndicator: React.FC<{ language?: Language }> = ({ language }) => {
  const isOnline = useOnlineStatus();
  const [storedLang, setStoredLang] = useState<Language>(readStoredLang);

  useEffect(() => {
    const syncLang = () => setStoredLang(readStoredLang());
    window.addEventListener('storage', syncLang);
    return () => window.removeEventListener('storage', syncLang);
  }, []);

  if (isOnline) return null;

  const activeLang = language ?? storedLang;

  return (
    <div className="fixed bottom-20 left-4 z-50 flex items-center gap-2 rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-extrabold text-slate-950 shadow-lg">
      <span className="h-2.5 w-2.5 rounded-full bg-slate-950 animate-pulse" />
      {OFFLINE_TEXT[activeLang] || OFFLINE_TEXT.am}
    </div>
  );
};
