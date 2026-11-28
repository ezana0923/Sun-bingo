import { buildApiUrl } from './realtimeRoomClient';

const SHARED_APP_URL =
  'https://ais-pre-5o2vwpcgfgshkft456mpos-198161772381.europe-west2.run.app';

function resolveLiveHttpsAppUrl(): string {
  if (
    typeof window !== 'undefined' &&
    window.location.origin &&
    window.location.origin.startsWith('https://') &&
    !window.location.origin.includes('localhost')
  ) {
    if (window.location.hostname.startsWith('ais-dev-')) {
      return window.location.origin.replace('https://ais-dev-', 'https://ais-pre-');
    }
    return window.location.origin;
  }
  return SHARED_APP_URL;
}

export async function connectTelegramBotEverywhere(rawToken: string): Promise<{
  ok: boolean;
  message: string;
}> {
  const token = rawToken.trim();
  if (!token || !token.includes(':')) {
    return {
      ok: false,
      message: '❌ ትክክለኛ የቴሌግራም Bot Token ያስገቡ (ለምሳሌ፦ 7123456:AAH...)።',
    };
  }

  // Always use the single backend poller (/api/telegram/connect) so messages are NEVER duplicated!
  try {
    const serverRes = await fetch(buildApiUrl('/api/telegram/connect'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, appUrl: resolveLiveHttpsAppUrl() }),
    });
    const serverData = await serverRes.json().catch(() => null);
    if (serverRes.ok && serverData?.ok) {
      localStorage.setItem('ezi_telegram_bot_token', token);
      return { ok: true, message: serverData.message };
    }
    if (serverData?.error) {
      return { ok: false, message: `❌ ${serverData.error}` };
    }
  } catch {
    // ignore
  }

  return {
    ok: false,
    message: '❌ ከቴሌግራም ሰርቨር ጋር መገናኘት አልተቻለም። እባክዎ Token ያረጋግጡ።',
  };
}

export async function disconnectTelegramBotEverywhere(token?: string): Promise<{
  ok: boolean;
  message: string;
}> {
  try {
    localStorage.removeItem('ezi_telegram_bot_token');
    const serverRes = await fetch(buildApiUrl('/api/telegram/disconnect'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    if (serverRes.ok) {
      const data = await serverRes.json();
      return { ok: true, message: data.message || '✅ የቴሌግራም ቦት ተቋርጧል!' };
    }
  } catch {
    // ignore
  }

  localStorage.removeItem('ezi_telegram_bot_token');
  return { ok: true, message: '✅ የቴሌግራም ቦት ተቋርጧል (Disconnected)!' };
}

// Check once on load if a saved bot token needs to be resumed after a cold start
if (typeof window !== 'undefined') {
  const ensureBotConnectedOnce = async () => {
    const saved = localStorage.getItem('ezi_telegram_bot_token');
    if (!saved || !saved.includes(':')) return;
    try {
      const statusRes = await fetch(buildApiUrl('/api/telegram/status'));
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        if (statusData && statusData.activeCount > 0) {
          return;
        }
      }
      await connectTelegramBotEverywhere(saved);
    } catch {
      // ignore
    }
  };

  ensureBotConnectedOnce();
}

