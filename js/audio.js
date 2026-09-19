export class AudioManager {
  constructor(settings) {
    this.settings = settings;
    this.ctx = null;
    this.musicTimer = null;
    this.step = 0;
  }
  unlock() {
    try {
      this.ctx ??= new (window.AudioContext || window.webkitAudioContext)();
      this.ctx.resume();
      this.sync();
    } catch {}
  }
  tone(freq, duration = 0.22, volume = 0.08, delay = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay,
      o = this.ctx.createOscillator(),
      g = this.ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(volume, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    o.connect(g);
    g.connect(this.ctx.destination);
    o.start(t);
    o.stop(t + duration + 0.02);
    o.onended = () => {
      o.disconnect();
      g.disconnect();
    };
  }
  play(name, combo = 1) {
    if (!this.settings.sound) return;
    const notes = {
      select: [660],
      invalid: [180, 155],
      match: [660, 880, 1100],
      hint: [520, 780],
      undo: [440, 330],
      shuffle: [330, 440, 660],
      complete: [523, 659, 784, 1047],
    };
    (notes[name] || [500]).forEach((n, i) =>
      this.tone(
        n * (name === "match" ? 1 + (combo - 1) * 0.08 : 1),
        name === "complete" ? 0.7 : 0.24,
        0.065,
        i * 0.065,
      ),
    );
  }
  sync() {
    if (this.musicTimer && this.ctx && this.settings.music && !document.hidden)
      return;
    clearInterval(this.musicTimer);
    this.musicTimer = null;
    if (this.ctx && this.settings.music && !document.hidden) {
      const sequence = [261.63, 329.63, 392, 493.88, 392, 329.63, 293.66, 392];
      this.musicTimer = setInterval(() => {
        this.tone(sequence[this.step++ % 8], 2.5, 0.018);
      }, 1800);
    }
  }
  suspend() {
    clearInterval(this.musicTimer);
    this.musicTimer = null;
    this.ctx?.suspend();
  }
}
