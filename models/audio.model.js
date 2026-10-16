(() => {
  "use strict";

  const MUSIC_KEY = "ronin-das-dunas-music-volume";
  const EFFECTS_KEY = "ronin-das-dunas-effects-volume";
  const melody = [220, 261.63, 329.63, 392, 329.63, 261.63, 196, 246.94, 293.66, 392, 293.66, 246.94];
  const soundDefinitions = {
    slash: { frequency: 460, duration: 0.11, type: "sawtooth", endFrequency: 170 },
    hit: { frequency: 180, duration: 0.12, type: "triangle", endFrequency: 82 },
    pickup: { frequency: 520, duration: 0.22, type: "sine", endFrequency: 880 }
  };

  function readVolume(key, fallback) {
    try {
      const stored = Number(localStorage.getItem(key));
      return Number.isFinite(stored) && localStorage.getItem(key) !== null
        ? Math.min(1, Math.max(0, stored))
        : fallback;
    } catch {
      return fallback;
    }
  }

  class GameAudio {
    constructor() {
      this.musicVolume = readVolume(MUSIC_KEY, 0.28);
      this.effectsVolume = readVolume(EFFECTS_KEY, 0.55);
      this.context = null;
      this.musicBus = null;
      this.effectsBus = null;
      this.musicTimer = null;
      this.noteIndex = 0;
    }

    unlock() {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      if (!this.context) {
        this.context = new AudioContext();
        this.musicBus = this.context.createGain();
        this.effectsBus = this.context.createGain();
        this.musicBus.gain.value = this.musicVolume;
        this.effectsBus.gain.value = this.effectsVolume;
        this.musicBus.connect(this.context.destination);
        this.effectsBus.connect(this.context.destination);
        this.musicTimer = window.setInterval(() => this.playNextNote(), 420);
        this.playNextNote();
      }
      if (this.context.state === "suspended") this.context.resume().catch(() => {});
    }

    setMusicVolume(value) {
      this.musicVolume = Math.min(1, Math.max(0, value));
      this.persist(MUSIC_KEY, this.musicVolume);
      if (this.musicBus) this.musicBus.gain.setTargetAtTime(this.musicVolume, this.context.currentTime, 0.025);
    }

    setEffectsVolume(value) {
      this.effectsVolume = Math.min(1, Math.max(0, value));
      this.persist(EFFECTS_KEY, this.effectsVolume);
      if (this.effectsBus) this.effectsBus.gain.setTargetAtTime(this.effectsVolume, this.context.currentTime, 0.025);
    }

    persist(key, value) {
      try {
        localStorage.setItem(key, String(value));
      } catch {
        return;
      }
    }

    playNextNote() {
      if (!this.context || this.context.state !== "running" || this.musicVolume <= 0) return;
      const now = this.context.currentTime;
      const oscillator = this.context.createOscillator();
      const envelope = this.context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = melody[this.noteIndex % melody.length];
      envelope.gain.setValueAtTime(0.0001, now);
      envelope.gain.exponentialRampToValueAtTime(0.1, now + 0.035);
      envelope.gain.exponentialRampToValueAtTime(0.0001, now + 0.36);
      oscillator.connect(envelope);
      envelope.connect(this.musicBus);
      oscillator.start(now);
      oscillator.stop(now + 0.38);
      this.noteIndex++;
    }

    play(name) {
      if (!this.context || this.context.state !== "running" || this.effectsVolume <= 0) return;
      const sound = soundDefinitions[name];
      if (!sound) return;
      const now = this.context.currentTime;
      const oscillator = this.context.createOscillator();
      const envelope = this.context.createGain();
      oscillator.type = sound.type;
      oscillator.frequency.setValueAtTime(sound.frequency, now);
      oscillator.frequency.exponentialRampToValueAtTime(sound.endFrequency, now + sound.duration);
      envelope.gain.setValueAtTime(0.0001, now);
      envelope.gain.exponentialRampToValueAtTime(0.22, now + 0.012);
      envelope.gain.exponentialRampToValueAtTime(0.0001, now + sound.duration);
      oscillator.connect(envelope);
      envelope.connect(this.effectsBus);
      oscillator.start(now);
      oscillator.stop(now + sound.duration + 0.01);
    }
  }

  window.GameAudio = GameAudio;
})();