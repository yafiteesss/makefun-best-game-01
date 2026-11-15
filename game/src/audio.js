// Sound, synthesized live with WebAudio: no audio files, nothing fetched. Every
// effect is a short oscillator or noise envelope, so the game stays silent until
// the player's first gesture creates the audio context (browsers require that).

export function createAudio() {
  let context = null;
  let master = null;
  let muted = false;

  function ensure() {
    if (context) {
      if (context.state === 'suspended') context.resume();
      return true;
    }
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = 0.35;
      master.connect(context.destination);
      return true;
    } catch {
      return false;
    }
  }

  function tone({ frequency, endFrequency = null, duration = 0.12, type = 'sine', volume = 0.5, delay = 0 }) {
    if (!context || muted) return;
    const start = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    if (endFrequency !== null) {
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), start + duration);
    }
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    oscillator.connect(gain);
    gain.connect(master);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.05);
  }

  function noise({ duration = 0.25, volume = 0.5, delay = 0 }) {
    if (!context || muted) return;
    const start = context.currentTime + delay;
    const length = Math.max(1, Math.floor(context.sampleRate * duration));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    }
    const source = context.createBufferSource();
    const gain = context.createGain();
    gain.gain.value = volume;
    source.buffer = buffer;
    source.connect(gain);
    gain.connect(master);
    source.start(start);
  }

  return {
    ensure,
    get muted() {
      return muted;
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    /** A mote pickup: the pitch climbs with the combo, so a chain sounds like one. */
    pickup(combo) {
      const base = 520 * Math.pow(1.059, Math.min(combo, 8));
      tone({ frequency: base, endFrequency: base * 1.5, duration: 0.14, type: 'sine', volume: 0.4 });
      tone({ frequency: base * 2, duration: 0.08, type: 'triangle', volume: 0.15 });
    },
    brightPickup(combo) {
      const base = 660 * Math.pow(1.059, Math.min(combo, 8));
      tone({ frequency: base, endFrequency: base * 2, duration: 0.2, type: 'sine', volume: 0.45 });
      tone({ frequency: base * 1.5, endFrequency: base * 3, duration: 0.18, type: 'triangle', volume: 0.2, delay: 0.05 });
    },
    /** A rock hit: a low thud with a burst of noise. */
    hit() {
      tone({ frequency: 160, endFrequency: 55, duration: 0.3, type: 'sawtooth', volume: 0.5 });
      noise({ duration: 0.22, volume: 0.4 });
    },
    dash() {
      noise({ duration: 0.14, volume: 0.25 });
      tone({ frequency: 300, endFrequency: 700, duration: 0.12, type: 'sine', volume: 0.2 });
    },
    /** The beacon lights: a rising four-note arpeggio. */
    level() {
      [523, 659, 784, 1047].forEach((frequency, i) => {
        tone({ frequency, duration: 0.35, type: 'triangle', volume: 0.4, delay: i * 0.09 });
      });
    },
    /** The lamp goes out: a slow falling tone. */
    over() {
      tone({ frequency: 392, endFrequency: 98, duration: 0.9, type: 'sine', volume: 0.4 });
      tone({ frequency: 196, endFrequency: 49, duration: 1.1, type: 'triangle', volume: 0.3, delay: 0.1 });
    },
  };
}
