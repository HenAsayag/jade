export class OpeningDoors {
  constructor(host, settings) {
    this.settings = settings;
    this.animations = [];
    this.element = document.createElement("div");
    this.element.className = "opening-doors";
    this.element.setAttribute("aria-hidden", "true");
    this.element.hidden = true;
    const artwork = `<svg viewBox="0 0 600 900" preserveAspectRatio="none"><defs><radialGradient id="paper"><stop stop-color="#fff1b6"/><stop offset="1" stop-color="#bea16e"/></radialGradient><linearGradient id="wood"><stop stop-color="#351c13"/><stop offset=".5" stop-color="#814a28"/><stop offset="1" stop-color="#382016"/></linearGradient><pattern id="lattice" width="75" height="90" patternUnits="userSpaceOnUse"><path d="M0 0H75V90" fill="none" stroke="#63381e" stroke-width="9"/></pattern></defs><path fill="url(#wood)" d="M0 0H600V900H0z"/><ellipse cx="300" cy="450" rx="285" ry="350" fill="url(#paper)" stroke="#ac7640" stroke-width="12"/><ellipse cx="300" cy="450" rx="279" ry="344" fill="url(#lattice)"/><path d="M40 660Q140 420 70 260M65 475l95-90M73 405l-35-90M80 540l120-30M540 680Q440 490 530 320" fill="none" stroke="#747a4f" stroke-width="6" opacity=".3"/><path d="M298 0V900" stroke="#321a11" stroke-width="14"/><circle cx="300" cy="450" r="72" fill="#53351d" stroke="#e0b45c" stroke-width="8"/><circle cx="300" cy="450" r="58" fill="none" stroke="#b78840" stroke-width="3" stroke-dasharray="3 5"/><circle cx="300" cy="450" r="37" fill="none" stroke="#d0a15a" stroke-width="6"/><path d="M300 378V522" stroke="#29170f" stroke-width="7"/></svg>`;
    this.element.innerHTML = `<div class="door-panel door-left">${artwork}</div><div class="door-panel door-right">${artwork}</div>`;
    host.append(this.element);
  }
  play() {
    this.cancel();
    if (this.settings.reducedMotion) return;
    this.element.hidden = false;
    this.animations = [...this.element.children].map((panel, index) =>
      panel.animate(
        [
          { transform: "translateX(0)", offset: 0 },
          { transform: "translateX(0)", offset: 0.18 },
          { transform: `translateX(${index ? 102 : -102}%)`, offset: 1 },
        ],
        {
          duration: 1100,
          easing: "cubic-bezier(.45,0,.15,1)",
          fill: "forwards",
        },
      ),
    );
    const current = this.animations;
    Promise.all(current.map((a) => a.finished))
      .then(() => {
        if (this.animations === current) this.cancel();
      })
      .catch(() => {});
  }
  cancel() {
    this.animations.forEach((a) => a.cancel());
    this.animations = [];
    this.element.hidden = true;
  }
  pause() {
    this.animations.forEach((a) => a.pause());
  }
  resume() {
    this.animations.forEach((a) => a.play());
  }
}
