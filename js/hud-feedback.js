import { ScoreTween, clamp, easeOut } from "./motion.js";
export class HudFeedback {
  constructor(score, mark, settings) {
    this.score = score;
    this.mark = mark;
    this.settings = settings;
    this.counter = new ScoreTween();
    this.initialized = false;
    this.chain = 0;
    this.age = 10;
    this.life = 0;
    this.mark.innerHTML =
      '<span class="combo-caption">Combo</span><span class="combo-old"></span><span class="combo-value"></span><span class="combo-idle">◇</span>';
    this.old = mark.querySelector(".combo-old");
    this.current = mark.querySelector(".combo-value");
  }
  resize(board) {
    const area = board.getBoundingClientRect(),
      hud = this.mark.parentElement.getBoundingClientRect();
    this.mark.style.setProperty(
      "--combo-x",
      `${area.left + area.width / 2 - hud.left}px`,
    );
  }
  setScore(value, snap = false) {
    this.counter.set(
      value,
      snap || !this.initialized || this.settings.reducedMotion,
    );
    this.initialized = true;
    this.score.textContent = Math.round(this.counter.value).toLocaleString();
  }
  reset() {
    this.chain = 0;
    this.life = 0;
    this.mark.classList.remove("has-combo");
    this.setScore(0, true);
  }
  combo(continues) {
    this.chain = continues ? this.chain + 1 : 1;
    this.old.textContent = this.current.textContent;
    this.current.textContent = String(this.chain);
    this.age = 0;
    this.life = 5;
    this.mark.classList.add("has-combo");
    this.tick(0);
  }
  tick(dt) {
    const score = this.counter.tick(dt).toLocaleString();
    if (this.score.textContent !== score) this.score.textContent = score;
    this.age += dt;
    this.life = Math.max(0, this.life - dt);
    if (!this.life) {
      this.mark.classList.remove("has-combo");
      return;
    }
    const reduced = this.settings.reducedMotion,
      p = clamp(this.age / 0.18);
    const scale = reduced
      ? 1
      : this.age < 0.08
        ? 0.75 + 0.4 * easeOut(this.age / 0.08)
        : 1.15 - 0.15 * easeOut((this.age - 0.08) / 0.1);
    this.current.style.opacity = String(reduced ? 1 : clamp(this.age / 0.04));
    this.current.style.transform = `scale(${scale})`;
    this.old.style.opacity = String(reduced ? 0 : 1 - clamp(this.age / 0.1));
    this.old.style.transform = `scale(${1 - 0.1 * p})`;
  }
}
