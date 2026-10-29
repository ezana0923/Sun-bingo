const SHARED_APP_URL =
  'https://ais-pre-5o2vwpcgfgshkft456mpos-198161772381.europe-west2.run.app';

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
    const serverRes = await fetch('/api/telegram/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, appUrl: SHARED_APP_URL }),
    });
    if (serverRes.ok) {
      const serverData = await serverRes.json();
      if (serverData && serverData.ok) {
        localStorage.setItem('ezi_telegram_bot_token', token);
        return { ok: true, message: serverData.message };
      }
    }
  } catch {
    // ignore
  }

  return {
    ok: false,
    message: '❌ ከቴሌግራም ሰርቨር ጋር መገናኘት አልተቻለም። እባክዎ Token ያረጋግጡ።',
  };
}

// Check once on load if a saved bot token needs to be resumed after a cold start
if (typeof window !== 'undefined') {
  const ensureBotConnectedOnce = async () => {
    const saved = localStorage.getItem('ezi_telegram_bot_token');
    if (!saved || !saved.includes(':')) return;
    try {
      const statusRes = await fetch('/api/telegram/status');
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

