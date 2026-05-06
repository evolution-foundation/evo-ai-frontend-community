/**
 * Utility functions for playing notification sounds
 */

export type NotificationTone = 'ding' | 'chime' | 'bell' | 'notification' | 'magic';

interface AudioSettings {
  enable_audio_alerts: boolean;
  notification_tone: NotificationTone;
  always_play_audio_alert: boolean; // If false, play only when tab is inactive
  alert_if_unread_assigned_conversation_exist: boolean;
}

// Map of tone names to audio file paths
// Files are located in /public/audio/notifications/
const TONE_FILES: Record<NotificationTone, string> = {
  ding: '/audio/notifications/ding.mp3',
  chime: '/audio/notifications/chime.mp3',
  bell: '/audio/notifications/bell.mp3',
  notification: '/audio/notifications/ping.mp3',
  magic: '/audio/notifications/magic.mp3',
};

type AudioContextClass = typeof AudioContext;

const getAudioContextClass = (): AudioContextClass | null => {
  if (typeof window === 'undefined') return null;
  return window.AudioContext || (window as unknown as { webkitAudioContext: AudioContextClass }).webkitAudioContext || null;
};

// Shared AudioContext — created once and reused to survive browser autoplay restrictions.
// The "unlocked" flag lives on the context itself (not module-global) so that recreating
// the context after close() / HMR / suspend automatically requires a fresh unlock.
type UnlockableAudioContext = AudioContext & { __unlocked?: boolean };
let sharedAudioContext: UnlockableAudioContext | null = null;

const getOrCreateAudioContext = (): UnlockableAudioContext | null => {
  const Ctx = getAudioContextClass();
  if (!Ctx) return null;
  if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
    sharedAudioContext = new Ctx() as UnlockableAudioContext;
  }
  return sharedAudioContext;
};

/**
 * Must be called inside a user-gesture event handler (click, keydown, etc.).
 * Resumes the shared AudioContext so that subsequent notification sounds are
 * allowed by the browser's autoplay policy even when the tab is inactive.
 */
export const unlockAudioContext = (): void => {
  const ctx = getOrCreateAudioContext();
  if (!ctx || ctx.__unlocked) return;
  if (ctx.state === 'suspended') {
    ctx.resume().then(() => {
      ctx.__unlocked = true;
    }).catch(() => {
      // Ignore — will retry on next user gesture
    });
  } else {
    ctx.__unlocked = true;
  }
};

const playToneWithAudioContext = (tone: NotificationTone): void => {
  const ctx = getOrCreateAudioContext();
  if (!ctx) return;

  const resume = ctx.state === 'suspended' ? ctx.resume() : Promise.resolve();
  resume.then(() => {
    const frequencies: Record<NotificationTone, number> = {
      ding: 800,
      chime: 600,
      bell: 400,
      notification: 500,
      magic: 700,
    };

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.frequency.value = frequencies[tone];
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.5);
  }).catch(() => {
    // AudioContext could not be resumed — browser is blocking audio
  });
};

const playFileWithAudioContext = async (toneFile: string, tone: NotificationTone): Promise<void> => {
  const ctx = getOrCreateAudioContext();
  if (!ctx) {
    playToneWithAudioContext(tone);
    return;
  }

  try {
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    const response = await fetch(toneFile);
    if (!response.ok) {
      throw new Error(`Audio file fetch failed: ${response.status} ${toneFile}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

    const source = ctx.createBufferSource();
    const gainNode = ctx.createGain();
    source.buffer = audioBuffer;
    // Match oscillator fallback volume so user perception stays stable when the
    // .mp3 path falls back to the synthesized tone.
    gainNode.gain.value = 0.3;
    source.connect(gainNode);
    gainNode.connect(ctx.destination);
    source.start(0);
  } catch (error) {
    console.error('Error playing notification sound, falling back to oscillator tone:', error);
    playToneWithAudioContext(tone);
  }
};

/**
 * Close and reset the shared AudioContext. Useful for tests and hot-reload.
 */
export const closeSharedAudioContext = (): void => {
  if (sharedAudioContext && sharedAudioContext.state !== 'closed') {
    sharedAudioContext.close().catch(() => {
      // Ignore — context may already be closing
    });
  }
  sharedAudioContext = null;
};

let audioSettingsCache: AudioSettings | null = null;

/**
 * Load audio settings from localStorage or use defaults
 */
export const getAudioSettings = (): AudioSettings => {
  if (audioSettingsCache) {
    return audioSettingsCache;
  }

  try {
    const stored = localStorage.getItem('audio_notification_settings');
    if (stored) {
      audioSettingsCache = JSON.parse(stored);
      return audioSettingsCache!;
    }
  } catch (error) {
    console.error('Error loading audio settings:', error);
  }

  const defaults: AudioSettings = {
    enable_audio_alerts: false,
    notification_tone: 'ding',
    always_play_audio_alert: false,
    alert_if_unread_assigned_conversation_exist: false,
  };

  audioSettingsCache = defaults;
  return defaults;
};

/**
 * Save audio settings to localStorage
 */
export const saveAudioSettings = (settings: Partial<AudioSettings>): void => {
  const current = getAudioSettings();
  const updated = { ...current, ...settings };

  try {
    localStorage.setItem('audio_notification_settings', JSON.stringify(updated));
    audioSettingsCache = updated;
  } catch (error) {
    console.error('Error saving audio settings:', error);
  }
};

/**
 * Check if tab is currently active
 */
const isTabActive = (): boolean => {
  return !document.hidden;
};

/**
 * Play notification sound based on settings
 */
export const playNotificationSound = async (
  settings?: Partial<AudioSettings>,
  checkUnreadConversations?: () => boolean
): Promise<void> => {
  const audioSettings = settings ? { ...getAudioSettings(), ...settings } : getAudioSettings();

  if (!audioSettings.enable_audio_alerts) {
    return;
  }

  // If always_play_audio_alert is false, only play when tab is inactive
  if (!audioSettings.always_play_audio_alert && isTabActive()) {
    return;
  }

  if (audioSettings.alert_if_unread_assigned_conversation_exist) {
    if (checkUnreadConversations) {
      if (!checkUnreadConversations()) return;
    } else {
      return;
    }
  }

  const toneFile = TONE_FILES[audioSettings.notification_tone];
  await playFileWithAudioContext(toneFile, audioSettings.notification_tone);
};

/**
 * Play a preview of the notification sound (ignores conditions)
 */
export const playNotificationSoundPreview = async (tone: NotificationTone): Promise<void> => {
  const toneFile = TONE_FILES[tone];
  await playFileWithAudioContext(toneFile, tone);
};

/**
 * Clear audio settings cache (useful when settings are updated)
 */
export const clearAudioSettingsCache = (): void => {
  audioSettingsCache = null;
};
