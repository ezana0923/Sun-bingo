// Telegram Mini App Viewport Lock, Overscroll Guard & Top-Scroll Reset Utility

interface TgWebAppLike {
  ready?: () => void;
  expand?: () => void;
  disableVerticalSwipes?: () => void;
  isVerticalSwipesEnabled?: boolean;
  onEvent?: (eventType: string, cb: () => void) => void;
}

interface TgWindow extends Window {
  Telegram?: { WebApp?: TgWebAppLike };
  TelegramWebviewProxy?: {
    postEvent?: (eventType: string, eventData: string) => void;
  };
}

let isLockInstalled = false;

export function applyTelegramSwipeLock(): void {
  if (typeof window === 'undefined') return;
  const w = window as TgWindow;
  const tg = w.Telegram?.WebApp;

  try {
    tg?.ready?.();
  } catch {}
  try {
    tg?.expand?.();
  } catch {}
  try {
    if (typeof tg?.disableVerticalSwipes === 'function') {
      tg.disableVerticalSwipes();
    }
    if (tg && 'isVerticalSwipesEnabled' in tg) {
      tg.isVerticalSwipesEnabled = false;
    }
  } catch {}

  try {
    w.TelegramWebviewProxy?.postEvent?.('web_app_expand', '');
    w.TelegramWebviewProxy?.postEvent?.(
      'web_app_setup_swipe_behavior',
      JSON.stringify({ allow_vertical_swipe: false })
    );
  } catch {}

  try {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(
        JSON.stringify({
          eventType: 'web_app_setup_swipe_behavior',
          eventData: { allow_vertical_swipe: false },
        }),
        '*'
      );
      window.parent.postMessage(
        JSON.stringify({
          eventType: 'web_app_expand',
          eventData: {},
        }),
        '*'
      );
    }
  } catch {}

  try {
    document.documentElement.classList.add('tg-viewport-locked');
    document.body.classList.add('tg-viewport-locked');
  } catch {}
}

export function scrollAppToTop(): void {
  if (typeof window === 'undefined') return;
  const resetNow = () => {
    try {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      const rootEl = document.getElementById('root');
      if (rootEl) rootEl.scrollTop = 0;
      document
        .querySelectorAll<HTMLElement>('[data-app-scroll="true"], .fixed.inset-0.overflow-y-auto')
        .forEach((el) => {
          el.scrollTop = 0;
        });
    } catch {}
  };

  resetNow();
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => {
      resetNow();
      setTimeout(resetNow, 40);
    });
  }
}

function findScrollableParent(
  target: EventTarget | null,
  axis: 'y' | 'x'
): HTMLElement | null {
  let el = target instanceof HTMLElement ? target : null;
  while (el && el !== document.documentElement && el !== document.body) {
    const style = window.getComputedStyle(el);
    if (axis === 'y') {
      const oy = style.overflowY;
      if (
        (oy === 'auto' || oy === 'scroll' || oy === 'overlay') &&
        el.scrollHeight > el.clientHeight + 1
      ) {
        return el;
      }
    } else {
      const ox = style.overflowX;
      if (
        (ox === 'auto' || ox === 'scroll' || ox === 'overlay') &&
        el.scrollWidth > el.clientWidth + 1
      ) {
        return el;
      }
    }
    el = el.parentElement;
  }
  return null;
}

export function installTelegramViewportLock(): void {
  if (typeof window === 'undefined' || isLockInstalled) return;
  isLockInstalled = true;

  applyTelegramSwipeLock();

  const w = window as TgWindow;
  try {
    w.Telegram?.WebApp?.onEvent?.('viewportChanged', () => {
      applyTelegramSwipeLock();
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    });
  } catch {}

  window.addEventListener('DOMContentLoaded', applyTelegramSwipeLock);
  window.addEventListener('load', applyTelegramSwipeLock);
  window.addEventListener('focus', applyTelegramSwipeLock);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) applyTelegramSwipeLock();
  });

  // Keep outer html/body pinned at scroll 0 even when inputs receive focus
  window.addEventListener(
    'scroll',
    () => {
      if (window.scrollY !== 0 || document.documentElement.scrollTop !== 0 || document.body.scrollTop !== 0) {
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      }
    },
    { passive: true }
  );

  // Touchmove overscroll guard: prevents pulling down outer Telegram WebView or closing Mini App
  let startX = 0;
  let startY = 0;

  document.addEventListener(
    'touchstart',
    (e: TouchEvent) => {
      if (e.touches.length === 1) {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
      }
    },
    { passive: true }
  );

  document.addEventListener(
    'touchmove',
    (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (
          tag === 'INPUT' &&
          (target as HTMLInputElement).type === 'range'
        ) {
          return;
        }
        if (target.closest('[data-card-drag], [data-allow-touch]')) {
          return;
        }
      }

      const dx = e.touches[0].clientX - startX;
      const dy = e.touches[0].clientY - startY;

      // Allow horizontal scrolling on horizontal card strips / carousels
      if (Math.abs(dx) > Math.abs(dy)) {
        const hScroll = findScrollableParent(e.target, 'x');
        if (hScroll) return;
      }

      const vScroll = findScrollableParent(e.target, 'y');
      if (!vScroll) {
        if (Math.abs(dy) >= Math.abs(dx) && Math.abs(dy) > 2) {
          if (e.cancelable) e.preventDefault();
        }
        return;
      }

      const atTop = vScroll.scrollTop <= 0;
      const atBottom =
        vScroll.scrollTop + vScroll.clientHeight >= vScroll.scrollHeight - 1;

      if ((dy > 0 && atTop) || (dy < 0 && atBottom)) {
        if (e.cancelable) e.preventDefault();
      }
    },
    { passive: false }
  );
}
