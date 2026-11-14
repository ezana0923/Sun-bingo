import { Language } from '../types/bingo';
import { getLetterForBall } from './bingoEngine';

class SoundManager {
  private ctx: AudioContext | null = null;
  private lastSpokenKey: string | null = null;
  private lastSpokenTime = 0;
  private sfxEnabled = true;
  private voiceEnabled = true;
  private voiceGender: 'female' | 'male' = 'female';
  private vibrationEnabled = true;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const savedVoice = localStorage.getItem('ezi_pref_voice');
        if (savedVoice !== null) this.voiceEnabled = savedVoice === 'true';
        const savedSfx = localStorage.getItem('ezi_pref_sfx');
        if (savedSfx !== null) this.sfxEnabled = savedSfx === 'true';
        else if (savedVoice !== null) this.sfxEnabled = savedVoice === 'true';
        const savedGender = localStorage.getItem('ezi_pref_voice_gender');
        if (savedGender === 'male' || savedGender === 'female') this.voiceGender = savedGender;
        const savedVib = localStorage.getItem('ezi_pref_vibration');
        if (savedVib !== null) this.vibrationEnabled = savedVib === 'true';
      } catch {
        // ignore
      }
    }
  }

  public setVoiceEnabled(enabled: boolean) {
    this.voiceEnabled = enabled;
    if (!enabled && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('ezi_pref_voice', String(enabled));
      } catch {
        // ignore
      }
    }
  }

  public isVoiceEnabled(): boolean {
    return this.voiceEnabled;
  }

  public setVoiceGender(gender: 'female' | 'male') {
    this.voiceGender = gender;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('ezi_pref_voice_gender', gender);
      } catch {
        // ignore
      }
    }
  }

  public getVoiceGender(): 'female' | 'male' {
    return this.voiceGender;
  }

  public setVibrationEnabled(enabled: boolean) {
    this.vibrationEnabled = enabled;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('ezi_pref_vibration', String(enabled));
      } catch {
        // ignore
      }
    }
  }

  public isVibrationEnabled(): boolean {
    return this.vibrationEnabled;
  }

  public vibrate(pattern: number | number[] = 100) {
    if (!this.vibrationEnabled) return;
    if (typeof window !== 'undefined' && 'navigator' in window && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate(pattern);
      } catch {
        // ignore
      }
    }
  }

  public setSfxEnabled(enabled: boolean) {
    this.sfxEnabled = enabled;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('ezi_pref_sfx', String(enabled));
      } catch {
        // ignore
      }
    }
  }

  public isSfxEnabled(): boolean {
    return this.sfxEnabled;
  }

  public setAllSoundsEnabled(enabled: boolean) {
    this.setVoiceEnabled(enabled);
    this.setSfxEnabled(enabled);
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public unlockAudioContext() {
    const ctx = this.getContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        const silent = new SpeechSynthesisUtterance(' ');
        silent.volume = 0.01;
        window.speechSynthesis.speak(silent);
      } catch {}
    }
  }

  public playBallPop() {
    if (!this.sfxEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch {
      // ignore audio error
    }
  }

  public playDaubClick() {
    if (!this.sfxEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(660, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch {
      // ignore
    }
  }

  public playClick() {
    this.playDaubClick();
  }

  public playDaub() {
    this.playDaubClick();
  }

  public playWinFanfare() {
    this.playVictoryFanfare();
  }

  public announceBall(ball: number, lang: Language = 'am') {
    this.speakBall(ball, true, lang);
  }

  public playVictoryFanfare() {
    this.vibrate([250, 100, 250, 100, 450]);
    if (!this.sfxEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        const startTime = ctx.currentTime + idx * 0.12;
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.22, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.35);
      });
    } catch {
      // ignore
    }
  }

  public playErrorBuzzer() {
    this.vibrate([300, 100, 300]);
    if (!this.sfxEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(110, ctx.currentTime + 0.35);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.38);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.38);
    } catch {
      // ignore
    }
  }

  public playNotificationChime() {
    this.vibrate([120, 80, 150]);
    if (!this.sfxEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const freqs = [587.33, 880];
      freqs.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        const t = ctx.currentTime + i * 0.14;
        osc.frequency.setValueAtTime(f, t);
        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.25);
      });
    } catch {
      // ignore
    }
  }

  private applyVoiceSettings(utterance: SpeechSynthesisUtterance, lang: Language) {
    utterance.lang = lang === 'am' ? 'am-ET' : 'en-US';
    if (this.voiceGender === 'male') {
      utterance.pitch = 0.82;
      try {
        const voices = window.speechSynthesis.getVoices();
        const maleVoice = voices.find(
          (v) =>
            (v.name.toLowerCase().includes('male') ||
              v.name.toLowerCase().includes('david') ||
              v.name.toLowerCase().includes('guy') ||
              v.name.toLowerCase().includes('george')) &&
            !v.name.toLowerCase().includes('female')
        );
        if (maleVoice) utterance.voice = maleVoice;
      } catch {
        // ignore
      }
    } else {
      utterance.pitch = 1.18;
      try {
        const voices = window.speechSynthesis.getVoices();
        const femaleVoice = voices.find(
          (v) =>
            v.name.toLowerCase().includes('female') ||
            v.name.toLowerCase().includes('zira') ||
            v.name.toLowerCase().includes('samantha') ||
            v.name.toLowerCase().includes('jenny')
        );
        if (femaleVoice) utterance.voice = femaleVoice;
      } catch {
        // ignore
      }
    }
  }

  /**
   * Sound-only 6-second alert when 30 seconds remain before the game starts!
   * Plays a rhythmic 6-second alert chime sequence + voice announcement + vibration.
   */
  public playSixSecondCountdownAlert(lang: Language = 'am') {
    this.vibrate([200, 100, 200, 100, 350]);
    const ctx = this.getContext();
    if (ctx && this.sfxEnabled) {
      try {
        for (let sec = 0; sec < 6; sec++) {
          const baseTime = ctx.currentTime + sec * 1.0;
          const notes = sec % 2 === 0 ? [587.33, 880] : [659.25, 987.77];
          notes.forEach((f, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            const start = baseTime + idx * 0.18;
            osc.frequency.setValueAtTime(f, start);
            gain.gain.setValueAtTime(0.2, start);
            gain.gain.exponentialRampToValueAtTime(0.001, start + 0.42);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(start);
            osc.stop(start + 0.42);
          });
        }
      } catch {
        // ignore
      }
    }

    if (this.voiceEnabled && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const text =
          lang === 'am'
            ? 'ማሳወቂያ! ጨዋታው ሊጀምር ሰላሳ ሰከንድ ብቻ ቀርቶታል! እባክዎ ካርቴላዎን ያስመዝግቡ።'
            : 'Attention! The bingo game will start in 30 seconds! Please register your cartelas now.';
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.92;
        this.applyVoiceSettings(utterance, lang);
        window.speechSynthesis.speak(utterance);
        // Stop speech after 6 seconds if still speaking
        setTimeout(() => {
          try {
            if (window.speechSynthesis.speaking) {
              window.speechSynthesis.cancel();
            }
          } catch {
            // ignore
          }
        }, 6000);
      } catch {
        // ignore
      }
    }
  }

  /**
   * Sound-only announcement when the game pattern/rule is assigned by Admin.
   */
  public speakGamePatternAlert(patternTitle: string, lang: Language = 'am') {
    this.playNotificationChime();
    if (!this.voiceEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const text =
        lang === 'am'
          ? `የጨዋታው አይነት ${patternTitle} ተሰይሟል`
          : `Game pattern set to ${patternTitle}`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      this.applyVoiceSettings(utterance, lang);
      window.speechSynthesis.speak(utterance);
    } catch {
      // ignore
    }
  }

  public speakBall(
    ball: number,
    enabled: boolean,
    lang: Language = 'am',
    callSpeedSec = 5,
    matchKey = ''
  ) {
    const now = Date.now();
    const dedupKey = `${matchKey}:${ball}`;
    // Prevent duplicate announcements of the exact same ball in the same round!
    if (this.lastSpokenKey === dedupKey || (this.lastSpokenKey?.endsWith(`:${ball}`) && now - this.lastSpokenTime < 3500)) {
      return;
    }
    this.lastSpokenKey = dedupKey;
    this.lastSpokenTime = now;

    if (this.sfxEnabled && enabled) {
      this.playBallPop();
    }
    this.vibrate(35);
    if (!enabled || !this.voiceEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const letter = getLetterForBall(ball);
      const utterance = new SpeechSynthesisUtterance(`${letter} ${ball}`);
      utterance.rate = callSpeedSec <= 1 ? 1.65 : callSpeedSec <= 2 ? 1.4 : callSpeedSec <= 3 ? 1.2 : 0.95;
      this.applyVoiceSettings(utterance, lang);
      window.speechSynthesis.speak(utterance);
    } catch {
      // ignore speech synthesis errors
    }
  }
}

export const soundFX = new SoundManager();

if (typeof window !== 'undefined') {
  const autoUnlock = () => {
    soundFX.unlockAudioContext();
  };
  window.addEventListener('click', autoUnlock, { once: true, passive: true });
  window.addEventListener('touchstart', autoUnlock, { once: true, passive: true });
  window.addEventListener('keydown', autoUnlock, { once: true, passive: true });
}
