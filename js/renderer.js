import {
  Application,
  Container,
  Sprite,
  Texture,
  Rectangle,
  Graphics,
} from "../vendor/pixi.mjs";
import { SYMBOLS, isFree } from "./board.js";
export class BoardRenderer {
  constructor(host, settings, onSelect, onQuality) {
    this.host = host;
    this.settings = settings;
    this.onSelect = onSelect;
    this.onQuality = onQuality;
    this.app = new Application();
    this.views = new Map();
    this.textures = {};
    this.particles = [];
    this.tiles = [];
    this.selected = null;
    this.hinted = [];
    this.quality = 2;
    this.slowTime = 0;
    this.scale = 1;
    this.destroyed = false;
  }
  async init(progress) {
    await this.app.init({
      preference: "webgl",
      backgroundAlpha: 0,
      antialias: true,
      resolution: Math.min(devicePixelRatio, 2),
      autoDensity: true,
      width: this.host.clientWidth,
      height: this.host.clientHeight,
    });
    this.host.append(this.app.canvas);
    this.app.canvas.setAttribute("aria-hidden", "true");
    const manifest = await (await fetch("assets/manifest.json")).json();
    const atlas = document.createElement("canvas");
    atlas.width = 1024;
    atlas.height = 768;
    const ctx = atlas.getContext("2d");
    let loaded = 0;
    await Promise.all(
      SYMBOLS.map(async (key, i) => {
        const img = new Image();
        img.src = manifest.assets[key].path;
        await img.decode();
        const x = (i % 10) * 100,
          y = Math.floor(i / 10) * 140;
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(x + 4, y + 3, 90, 126, 11);
        ctx.clip();
        ctx.drawImage(img, x + 3, y + 2, 92, 128);
        ctx.restore();
        progress(15 + (++loaded / SYMBOLS.length) * 75);
      }),
    );
    this.atlasTexture = Texture.from(atlas);
    SYMBOLS.forEach((key, i) => {
      this.textures[key] = new Texture({
        source: this.atlasTexture.source,
        frame: new Rectangle(
          (i % 10) * 100,
          Math.floor(i / 10) * 140,
          100,
          140,
        ),
      });
    });
    this.board = new Container();
    this.fx = new Container();
    this.app.stage.addChild(this.board, this.fx);
    const dot = new Graphics().circle(4, 4, 4).fill(0xffffff);
    this.particleTexture = this.app.renderer.generateTexture(dot);
    dot.destroy();
    for (let i = 0; i < 180; i++) {
      const sprite = new Sprite(this.particleTexture);
      sprite.visible = false;
      sprite.anchor.set(0.5);
      this.fx.addChild(sprite);
      this.particles.push({ sprite, life: 0, vx: 0, vy: 0, total: 0 });
    }
    this.app.ticker.add((t) => this.tick(t.deltaMS));
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.host);
    this.resize();
    progress(100);
  }
  setBoard(tiles) {
    for (const v of this.views.values())
      v.container.destroy({ children: true });
    this.views.clear();
    this.tiles = tiles;
    this.selected = null;
    this.hinted = [];
    for (const tile of [...tiles].sort(
      (a, b) => a.z - b.z || a.y - b.y || a.x - b.x,
    )) {
      const container = new Container(),
        shadow = new Graphics()
          .roundRect(6, 8, 87, 124, 11)
          .fill({ color: 0x001a13, alpha: 0.48 }),
        glow = new Graphics()
          .roundRect(1, 0, 95, 134, 12)
          .stroke({ color: 0xffe0a0, width: 3 }),
        sprite = new Sprite(this.textures[tile.symbol]);
      container.addChild(shadow, glow, sprite);
      container.eventMode = "static";
      container.cursor = "pointer";
      container.hitArea = new Rectangle(0, 0, 98, 132);
      container.on("pointertap", () => this.onSelect(tile.id));
      glow.visible = false;
      this.board.addChild(container);
      this.views.set(tile.id, {
        container,
        sprite,
        glow,
        shadow,
        tile,
        baseX: 0,
        baseY: 0,
        dy: 0,
        targetY: 0,
        pop: 0,
        shake: 0,
        fade: 0,
      });
    }
    this.resize();
    this.refresh();
  }
  resize() {
    const width = Math.max(1, this.host.clientWidth),
      height = Math.max(1, this.host.clientHeight);
    this.app.renderer.resize(width, height);
    if (!this.tiles.length) return;
    const xs = this.tiles.map((t) => t.x * 92 + t.z * 5),
      ys = this.tiles.map((t) => t.y * 125 - t.z * 13);
    const minX = Math.min(...xs),
      maxX = Math.max(...xs) + 98,
      minY = Math.min(...ys),
      maxY = Math.max(...ys) + 134;
    this.scale = Math.min(
      (width - 32) / (maxX - minX),
      (height - 14) / (maxY - minY),
      0.85,
    );
    this.board.scale.set(this.scale);
    this.board.position.set(
      (width - (maxX - minX) * this.scale) / 2 - minX * this.scale,
      (height - (maxY - minY) * this.scale) / 2 - minY * this.scale,
    );
    for (const v of this.views.values()) {
      v.baseX = v.tile.x * 92 + v.tile.z * 5;
      v.baseY = v.tile.y * 125 - v.tile.z * 13;
      v.container.position.set(v.baseX, v.baseY + v.dy);
    }
  }
  refresh() {
    for (const v of this.views.values()) {
      const free = isFree(v.tile, this.tiles),
        active = v.tile.id === this.selected,
        hint = this.hinted.includes(v.tile.id);
      v.container.visible = !v.tile.removed || v.fade > 0;
      v.container.eventMode = v.tile.removed ? "none" : "static";
      v.sprite.tint = free
        ? 0xffffff
        : this.settings.highContrast
          ? 0x839f8f
          : 0xd4ded1;
      v.glow.visible = active || hint;
      v.targetY = active ? -7 : 0;
      if (!v.fade) {
        v.container.alpha = 1;
        v.container.scale.set(active ? 1.04 : 1);
      }
      v.shadow.alpha = active ? 1 : 0.8;
    }
  }
  select(id) {
    this.selected = id;
    this.hinted = [];
    this.refresh();
  }
  hint(ids) {
    this.hinted = ids;
    this.refresh();
  }
  invalid(ids) {
    for (const id of ids) {
      const v = this.views.get(id);
      if (v) v.shake = this.settings.reducedMotion ? 0 : 0.2;
    }
  }
  remove(ids) {
    for (const id of ids) {
      const v = this.views.get(id);
      if (!v) continue;
      v.fade = this.settings.reducedMotion ? 0.05 : 0.3;
      v.glow.visible = true;
      const p = this.board.toGlobal({ x: v.baseX + 48, y: v.baseY + 60 });
      this.burst(p.x, p.y, 16);
    }
    this.selected = null;
    this.hinted = [];
    this.refresh();
  }
  burst(x, y, count = 50) {
    if (this.settings.reducedMotion) return;
    let left = Math.round((count * (this.quality + 1)) / 3);
    for (const p of this.particles) {
      if (p.life > 0) continue;
      const a = Math.random() * Math.PI * 2,
        speed = 20 + Math.random() * 95;
      p.sprite.position.set(x, y);
      p.sprite.tint = Math.random() > 0.25 ? 0xe4c47b : 0xfff6d2;
      p.sprite.scale.set(0.25 + Math.random() * 0.65);
      p.sprite.visible = true;
      p.sprite.alpha = 1;
      p.vx = Math.cos(a) * speed;
      p.vy = Math.sin(a) * speed - 20;
      p.total = p.life = 0.4 + Math.random() * 0.5;
      if (--left <= 0) break;
    }
  }
  celebrate() {
    this.burst(this.host.clientWidth / 2, this.host.clientHeight / 2, 160);
  }
  tick(ms) {
    const dt = Math.min(ms, 50) / 1000;
    for (const v of this.views.values()) {
      v.dy += (v.targetY - v.dy) * Math.min(1, dt * 22);
      let dx = 0;
      if (v.shake > 0) {
        v.shake -= dt;
        dx = Math.sin(v.shake * 90) * 3;
      }
      v.container.position.set(v.baseX + dx, v.baseY + v.dy);
      if (v.fade > 0) {
        v.fade = Math.max(0, v.fade - dt);
        v.container.alpha = Math.min(1, v.fade / 0.2);
        v.container.scale.set(1 + (1 - v.fade / 0.3) * 0.07);
        if (!v.fade) v.container.visible = false;
      }
    }
    for (const p of this.particles) {
      if (p.life <= 0) continue;
      p.life -= dt;
      p.sprite.visible = p.life > 0;
      p.sprite.x += p.vx * dt;
      p.sprite.y += p.vy * dt;
      p.vy += 60 * dt;
      p.sprite.alpha = Math.max(0, p.life / p.total);
    }
    if (ms > 25 && ms < 250) this.slowTime += ms;
    else this.slowTime = Math.max(0, this.slowTime - ms / 2);
    if (this.slowTime > 4000 && this.quality > 0) {
      this.quality--;
      this.app.renderer.resolution =
        this.quality === 1 ? Math.min(devicePixelRatio, 1.5) : 1;
      this.resize();
      this.slowTime = 0;
      this.onQuality?.(["Low", "Medium", "High"][this.quality]);
    }
  }
  stop() {
    this.app.stop();
  }
  start() {
    this.app.start();
  }
  destroy() {
    this.resizeObserver.disconnect();
    this.app.destroy(true, {
      children: true,
      texture: true,
      textureSource: true,
    });
  }
}
