/**
 * Procedural Web Audio Synthesis Engine for Cosmic & Gravitational Sonification.
 * Zero external audio files required — 100% procedurally synthesized in browser.
 */

const AUDIO_STORAGE_KEY = 'three_body_audio_muted';

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = this.getStoredMuteState();
    this.droneGain = null;
    this.masterGain = null;
    this.droneOsc1 = null;
    this.droneOsc2 = null;
    this.lastChirpTime = 0;
    this.lastAlarmTime = 0;
  }

  getStoredMuteState() {
    try {
      const stored = localStorage.getItem(AUDIO_STORAGE_KEY);
      return stored !== null ? JSON.parse(stored) : false;
    } catch (e) {
      return false;
    }
  }

  init() {
    if (this.ctx) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;

      this.ctx = new AudioContext();

      // Master output
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.6, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.startDeepSpaceDrone();
    } catch (e) {
      // AudioContext requires user gesture
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  setMuted(muted) {
    this.isMuted = muted;
    try {
      localStorage.setItem(AUDIO_STORAGE_KEY, JSON.stringify(muted));
    } catch (e) {}

    if (this.masterGain && this.ctx) {
      const target = muted ? 0 : 0.6;
      this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.masterGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.05);
    }
  }

  toggleMute() {
    this.init();
    this.resume();
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  startDeepSpaceDrone() {
    if (!this.ctx || this.droneGain) return;

    try {
      this.droneGain = this.ctx.createGain();
      this.droneGain.gain.setValueAtTime(0.04, this.ctx.currentTime);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(140, this.ctx.currentTime);
      filter.Q.setValueAtTime(2, this.ctx.currentTime);

      // Low frequency drone oscillators (55Hz A1 and 82.5Hz E2)
      this.droneOsc1 = this.ctx.createOscillator();
      this.droneOsc1.type = 'sine';
      this.droneOsc1.frequency.setValueAtTime(55, this.ctx.currentTime);

      this.droneOsc2 = this.ctx.createOscillator();
      this.droneOsc2.type = 'triangle';
      this.droneOsc2.frequency.setValueAtTime(82.4, this.ctx.currentTime);

      this.droneOsc1.connect(filter);
      this.droneOsc2.connect(filter);
      filter.connect(this.droneGain);
      this.droneGain.connect(this.masterGain);

      this.droneOsc1.start();
      this.droneOsc2.start();
    } catch (e) {}
  }

  /**
   * Synthesizes a Gravitational Wave Chirp on tight periastron passes / high acceleration.
   */
  triggerGravitationalChirp(speed, minDistance) {
    if (!this.ctx || this.isMuted) return;
    const now = performance.now();
    if (now - this.lastChirpTime < 180) return;
    this.lastChirpTime = now;

    try {
      this.resume();
      const t = this.ctx.currentTime;

      const baseFreq = Math.min(650, Math.max(120, 150 + speed * 120));
      const endFreq = baseFreq * (1 + Math.min(2.5, 0.4 / Math.max(0.02, minDistance)));

      const osc = this.ctx.createOscillator();
      osc.type = 'sine';

      const gain = this.ctx.createGain();
      const panner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;

      osc.frequency.setValueAtTime(baseFreq, t);
      osc.frequency.exponentialRampToValueAtTime(endFreq, t + 0.16);

      const amp = Math.min(0.22, 0.05 + 0.15 * (speed / 3));
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(amp, t + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);

      if (panner) {
        panner.pan.setValueAtTime((Math.random() - 0.5) * 0.8, t);
        osc.connect(gain);
        gain.connect(panner);
        panner.connect(this.masterGain);
      } else {
        osc.connect(gain);
        gain.connect(this.masterGain);
      }

      osc.start(t);
      osc.stop(t + 0.25);
    } catch (e) {}
  }

  /**
   * Plays a cinematic HUD warning notification sound.
   * Levels: 'CAUTION' (double high beep), 'WARNING' (dual urgent tone), 'CRITICAL' (klaxon siren)
   */
  playWarningAlarm(level = 'WARNING') {
    if (!this.ctx || this.isMuted) return;
    const now = performance.now();
    if (now - this.lastAlarmTime < 350) return; // Prevent sound overlapping too quickly
    this.lastAlarmTime = now;

    try {
      this.resume();
      const t = this.ctx.currentTime;

      if (level === 'CRITICAL') {
        // Urgent 3-pulse red alert klaxon
        [0, 0.14, 0.28].forEach((offset) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(880, t + offset);
          osc.frequency.exponentialRampToValueAtTime(440, t + offset + 0.1);

          gain.gain.setValueAtTime(0.12, t + offset);
          gain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.11);

          osc.connect(gain);
          gain.connect(this.masterGain);
          osc.start(t + offset);
          osc.stop(t + offset + 0.12);
        });
      } else if (level === 'WARNING') {
        // High-tech 2-pulse warning tone
        [0, 0.12].forEach((offset, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(idx === 0 ? 740 : 880, t + offset);

          gain.gain.setValueAtTime(0.08, t + offset);
          gain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.09);

          osc.connect(gain);
          gain.connect(this.masterGain);
          osc.start(t + offset);
          osc.stop(t + offset + 0.1);
        });
      } else {
        // Subtle Caution chime
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(620, t);
        osc.frequency.exponentialRampToValueAtTime(780, t + 0.08);

        gain.gain.setValueAtTime(0.09, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.15);
      }
    } catch (e) {}
  }

  /**
   * Subtle UI interaction acoustic feedback
   */
  playUiBeep(freq = 440, duration = 0.08) {
    if (!this.ctx || this.isMuted) return;
    try {
      this.resume();
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.04, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t);
      osc.stop(t + duration + 0.02);
    } catch (e) {}
  }
}

export const audio = new AudioEngine();
