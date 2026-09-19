export class OpeningDoors {
  constructor(host, settings) {
    this.settings = settings;
    this.animations = [];
    this.element = document.createElement("div");
    this.element.className = "opening-doors";
    this.element.setAttribute("aria-hidden", "true");
    this.element.hidden = true;
    const artwork = (
      side,
    ) => `<svg viewBox="0 0 600 600" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <defs>
        <radialGradient id="paper-${side}"><stop stop-color="#fff6d4"/><stop offset=".7" stop-color="#e9d4a0"/><stop offset="1" stop-color="#b59a65"/></radialGradient>
        <linearGradient id="brass-${side}" x2="1" y2="1"><stop stop-color="#f7dfa0"/><stop offset=".45" stop-color="#a87634"/><stop offset=".7" stop-color="#e9c377"/><stop offset="1" stop-color="#805125"/></linearGradient>
        <clipPath id="window-${side}"><circle cx="300" cy="300" r="248"/></clipPath>
        <pattern id="lattice-${side}" width="62" height="62" patternUnits="userSpaceOnUse"><path d="M0 0H62V62" fill="none" stroke="#523626" stroke-width="7"/><path d="M6 6H56V56H6Z" fill="none" stroke="#a17949" stroke-width="1.5"/></pattern>
      </defs>
      <circle cx="300" cy="306" r="276" fill="#0a1714" opacity=".5"/>
      <circle cx="300" cy="300" r="274" fill="url(#brass-${side})"/>
      <circle cx="300" cy="300" r="263" fill="#34261b"/>
      <circle cx="300" cy="300" r="251" fill="url(#paper-${side})"/>
      <g clip-path="url(#window-${side})">
        <path d="M60 570Q170 340 105 80M92 420Q130 370 210 356M125 315Q90 230 51 226M124 230Q181 216 220 151M495 551Q425 369 505 100" fill="none" stroke="#687b57" stroke-width="7" opacity=".25"/>
        <path d="M140 391q50-59 80-38-25 40-80 38M111 272q-76-13-66-52 55 1 66 52M132 215q21-73 73-68-9 49-73 68M471 339q-67-52-82-21 20 41 82 21" fill="#687b57" opacity=".28"/>
        <circle cx="300" cy="300" r="251" fill="url(#lattice-${side})"/>
      </g>
      <path d="M300 27V573" stroke="#241b14" stroke-width="16"/>
      <path d="M294 29V571M306 29V571" stroke="#b18a4c" stroke-width="2"/>
      <circle cx="300" cy="300" r="65" fill="#2d2b20" stroke="url(#brass-${side})" stroke-width="8"/>
      <circle cx="300" cy="300" r="53" fill="#365344" stroke="#c9a25c" stroke-width="2"/>
      <circle cx="300" cy="300" r="44" fill="none" stroke="#a98b50" stroke-width="3" stroke-dasharray="2 6"/>
      <path d="M300 273c-25-29-48 6 0 32 48-26 25-61 0-32Zm0 32c-32-17-39 18 0 23 39-5 32-40 0-23Z" fill="none" stroke="#e4c888" stroke-width="3"/>
      <path d="M300 239V361" stroke="#201d16" stroke-width="5"/>
      <path d="M280 288v24m40-24v24" stroke="#f3d697" stroke-width="6" stroke-linecap="round"/>
    </svg>`;
    this.element.innerHTML = `<div class="door-panel door-left">${artwork("left")}</div><div class="door-panel door-right">${artwork("right")}</div>`;
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
