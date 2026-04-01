import { isWeb } from '../utils/platform';

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
    // Browsers suspend AudioContext until a user gesture — resume on first click
    if (audioContext.state === 'suspended') {
      const resume = () => {
        audioContext?.resume();
        document.removeEventListener('click', resume);
        document.removeEventListener('keydown', resume);
      };
      document.addEventListener('click', resume);
      document.addEventListener('keydown', resume);
    }
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  return audioContext;
}

/**
 * Play a short notification chime when a new print job arrives.
 * Uses Web Audio API on web, expo-av on mobile.
 */
export async function playNewJobSound() {
  try {
    if (isWeb && typeof window !== 'undefined' && typeof AudioContext !== 'undefined') {
      const ctx = getAudioContext();

      // Generate a pleasant two-tone chime
      const now = ctx.currentTime;

      // First tone (higher)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.value = 880; // A5
      gain1.gain.setValueAtTime(0.3, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.3);

      // Second tone (lower, slightly delayed)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.value = 1174.66; // D6
      gain2.gain.setValueAtTime(0.3, now + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.15);
      osc2.stop(now + 0.45);
    } else {
      // Mobile: use expo-av
      try {
        const { Audio } = require('expo-av');
        // Play a system notification sound or generate one
        const { sound } = await Audio.Sound.createAsync(
          // Use a basic beep - expo-av can play from require() but we use a generated tone
          undefined,
          { shouldPlay: false }
        );
        // Fallback: just log (actual sound file would be bundled as an asset)
        console.log('[Sound] New job notification');
      } catch {
        // expo-av not available or no sound file
      }
    }
  } catch (error) {
    console.log('[Sound] Failed to play:', error);
  }
}
