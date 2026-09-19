import {
  Application,
  Container,
  Sprite,
  Texture,
  Rectangle,
  Graphics,
  Text,
} from "../vendor/pixi.mjs";
import { MatchEffects } from "./match-effects.js";
import { SYMBOLS, isFree } from "./board.js";
import { matchPose, entrancePose, MATCH_DURATION } from "./motion.js";
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
    this.cancelPress = () => {
      this.pressed = null;
      if (this.board) this.refresh();
    };
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
    this.app.canvas.addEventListener("pointercancel", this.cancelPress);
    this.app.canvas.addEventListener("touchcancel", this.cancelPress);
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
    this.board.sortableChildren = true;
    this.clock = 0;
    this.fx = new Container();
    this.fx.eventMode = "none";
    this.pressed = null;
    this.app.stage.addChild(this.board, this.fx);
    const dot = new Graphics().circle(4, 4, 4).fill(0xffffff);
    this.particleTexture = this.app.renderer.generateTexture(dot);
    dot.destroy();
    const petal = new Graphics().ellipse(7, 4, 7, 4).fill(0xffffff);
    const shard = new Graphics().poly([0, 0, 8, 2, 5, 10, 1, 7]).fill(0xffffff);
    this.petalTexture = this.app.renderer.generateTexture(petal);
    this.shardTexture = this.app.renderer.generateTexture(shard);
    petal.destroy();
    shard.destroy();
    const glowCanvas = document.createElement("canvas");
    glowCanvas.width = glowCanvas.height = 128;
    const glowContext = glowCanvas.getContext("2d");
    const gradient = glowContext.createRadialGradient(64, 64, 1, 64, 64, 64);
    gradient.addColorStop(0, "#ffe2a099");
    gradient.addColorStop(1, "#ffe2a000");
    glowContext.fillStyle = gradient;
    glowContext.fillRect(0, 0, 128, 128);
    this.comboGlow = new Sprite(Texture.from(glowCanvas));
    this.comboGlow.anchor.set(0.5);
    this.comboGlow.visible = false;
    this.comboLabel = new Text({
      text: "",
      style: {
        fontFamily: "Georgia",
        fontSize: 25,
        fill: 0xffe3a1,
        dropShadow: { color: 0x15392e, blur: 4, distance: 2 },
      },
    });
    this.comboLabel.anchor.set(0.5);
    this.comboLabel.visible = false;
    this.comboLife = 0;
    this.fx.addChild(this.comboGlow, this.comboLabel);
    for (let i = 0; i < 180; i++) {
      const sprite = new Sprite(this.particleTexture);
      sprite.visible = false;
      sprite.anchor.set(0.5);
      this.fx.addChild(sprite);
      this.particles.push({ sprite, life: 0, vx: 0, vy: 0, total: 0 });
    }
    this.matchEffects = new MatchEffects(
      this.app,
      this.settings,
      this.comboGlow.texture,
      this.shardTexture,
    );
    this.app.ticker.add((t) => this.tick(t.elapsedMS));
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.host);
    this.resize();
    progress(100);
  }
  setBoard(tiles, { transition = "none" } = {}) {
    this.matchEffects.clear();
    this.pressed = null;
    this.comboLife = 0;
    this.comboLabel.visible = this.comboGlow.visible = false;
    for (const p of this.particles) {
      p.life = 0;
      p.sprite.visible = false;
    }
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
      const sheen = new Graphics().roundRect(5, 4, 87, 119, 10).fill(0xfff4cd);
      sheen.alpha = 0;
      sheen.eventMode = "none";
      const halo = new Sprite(this.comboGlow.texture);
      halo.anchor.set(0.5);
      halo.position.set(48, 64);
      halo.width = 136;
      halo.height = 166;
      halo.tint = 0xd5ec8b;
      halo.alpha = 0;
      halo.eventMode = "none";
      container.addChild(halo, shadow, glow, sprite, sheen);
      container.zIndex = tile.z * 100 + tile.y * 7 + tile.x;
      container.eventMode = "static";
      container.cursor = "pointer";
      container.hitArea = new Rectangle(0, 0, 98, 132);
      container.on("pointerdown", (event) => {
        if (
          this.pressed !== null ||
          event.isPrimary === false ||
          !isFree(tile, this.tiles)
        )
          return;
        this.pressed = tile.id;
        this.pressPointer = event.pointerId;
        this.refresh();
      });
      const release = (event) => {
        if (event.pointerId === this.pressPointer) {
          this.pressed = null;
          this.refresh();
        }
      };
      container.on("pointerup", release);
      container.on("pointerupoutside", release);
      container.on("pointercancel", release);
      container.on("pointertap", (event) => {
        if (event.isPrimary !== false) this.onSelect(tile.id);
      });
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
        sheen,
        halo,
        selection: 0,
        origin: { x: 0, y: 0 },
        size: 1,
        entered: transition === "none",
        entry: 0,
        transition,
        delay:
          transition === "deal"
            ? (tile.id % 3) * 0.008 + tile.z * 0.022
            : tile.y * 0.012 + tile.x * 0.006 + tile.z * 0.018,
        matchTime: 0,
        matchX: 0,
        matchY: 0,
        impacted: false,
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
    this.onResize?.();
    if (!this.tiles.length) return;
    const xs = this.tiles.map((t) => t.x * 92 + t.z * 5),
      ys = this.tiles.map((t) => t.y * 125 - t.z * 13);
    const minX = Math.min(...xs) - 20,
      maxX = Math.max(...xs) + 116,
      minY = Math.min(...ys) - 19,
      maxY = Math.max(...ys) + 147;
    this.scale = Math.min(
      (width - 8) / (maxX - minX),
      (height - 16) / (maxY - minY),
      1.65,
    );
    this.board.scale.set(this.scale);
    this.board.position.set(
      (width - (maxX - minX) * this.scale) / 2 - minX * this.scale,
      (height - (maxY - minY) * this.scale) / 2 - minY * this.scale,
    );
    for (const v of this.views.values()) {
      v.baseX = v.tile.x * 92 + v.tile.z * 5;
      v.baseY = v.tile.y * 125 - v.tile.z * 13;
      const direction = v.tile.id % 5,
        across = width / this.scale + 110,
        down = height / this.scale + 150;
      v.origin.x =
        direction === 0 || direction === 3
          ? -across
          : direction === 1 || direction === 4
            ? across
            : 0;
      v.origin.y = direction === 2 ? down : direction >= 3 ? -down : 0;
      const pose = !v.entered
        ? entrancePose(
            v.entry,
            v.delay,
            v.transition,
            this.settings.reducedMotion,
            v.origin,
          )
        : { x: 0, y: 0, alpha: 1 };
      v.container.position.set(v.baseX + pose.x, v.baseY + pose.y);
      if (!v.entered) v.container.alpha = pose.alpha;
    }
  }
  refresh() {
    if (this.settings.reducedMotion) {
      for (const p of this.particles) {
        p.life = 0;
        p.sprite.visible = false;
      }
      this.comboGlow.visible = false;
    }
    for (const v of this.views.values()) {
      const free = isFree(v.tile, this.tiles),
        active = v.tile.id === this.selected || v.tile.id === this.pressed,
        hint = this.hinted.includes(v.tile.id);
      v.container.visible = !v.tile.removed || v.fade > 0;
      v.container.eventMode = v.tile.removed ? "none" : "static";
      v.free = free;
      v.active = active;
      if (active && v.selection === 0) v.selection = 0.22;
      v.sprite.tint = active
        ? 0xe6f3ba
        : free
          ? 0xffffff
          : this.settings.highContrast
            ? 0x839f8f
            : 0xd4ded1;
      v.glow.visible = active || hint || v.fade > 0;
      v.glow.tint = active ? 0xd7ef83 : 0xffffff;
      v.halo.alpha = active ? 0.22 : 0;
      // Preserve real Mahjong layer order during entry and selection.
      v.container.zIndex =
        v.fade > 0
          ? 2000 + v.tile.id
          : v.tile.z * 100 + v.tile.y * 7 + v.tile.x;
      v.targetY = 0;
      if (!v.fade && v.entered) v.container.alpha = 1;
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
  remove(ids, reward = 0) {
    this.pressed = null;
    const views = ids.map((id) => this.views.get(id)).filter(Boolean);
    const centerX = views.reduce((sum, v) => sum + v.baseX, 0) / views.length;
    const centerY = views.reduce((sum, v) => sum + v.baseY, 0) / views.length;
    views.forEach((v, index) => {
      v.fade = this.settings.reducedMotion ? 0.09 : MATCH_DURATION;
      v.matchTime = 0;
      v.entered = true;
      v.selection = 0;
      v.halo.alpha = 0;
      v.matchX = centerX - v.baseX;
      v.matchY = centerY - v.baseY;
      v.impacted = false;
      v.impactLeader = index === 0;
      v.matchReward = reward;
      v.container.position.set(v.baseX, v.baseY);
      v.container.scale.set(1);
      if (this.settings.reducedMotion && index === 0 && reward)
        this.matchEffects.reward(
          this.board.x + (centerX + 48) * this.scale,
          this.board.y + (centerY + 60) * this.scale,
          reward,
        );
    });
    this.selected = null;
    this.hinted = [];
    this.refresh();
  }
  burst(x, y, count = 50, petals = false) {
    if (this.settings.reducedMotion) return;
    let left = Math.round((count * (this.quality + 1)) / 3);
    for (const p of this.particles) {
      if (p.life > 0) continue;
      const a = Math.random() * Math.PI * 2,
        speed = 20 + Math.random() * 95;
      p.sprite.position.set(x, y);
      const isPetal = petals && Math.random() > 0.5;
      p.sprite.texture = isPetal
        ? this.petalTexture
        : Math.random() > 0.6
          ? this.shardTexture
          : this.particleTexture;
      p.sprite.tint = isPetal
        ? 0xe9b8b5
        : Math.random() > 0.25
          ? 0xe4c47b
          : 0xfff6d2;
      p.sprite.rotation = Math.random() * Math.PI;
      p.sprite.scale.set(0.25 + Math.random() * 0.65);
      p.sprite.visible = true;
      p.sprite.alpha = 1;
      p.vx = Math.cos(a) * speed;
      p.vy = Math.sin(a) * speed - 20;
      p.total = p.life = (petals ? 1.3 : 0.4) + Math.random() * 0.5;
      if (--left <= 0) break;
    }
  }
  celebrate() {
    this.burst(
      this.host.clientWidth / 2,
      this.host.clientHeight / 2,
      160,
      true,
    );
    this.showCombo(0);
  }
  showCombo(combo) {
    if (combo > 0) return; // Match combos belong to the top HUD; keep completion feedback unchanged.
    this.comboLife = 0.85;
    this.comboLabel.text = combo
      ? `${combo}×  Beautiful flow`
      : "A garden in harmony";
    this.comboLabel.position.set(
      this.host.clientWidth / 2,
      this.host.clientHeight * 0.43,
    );
    this.comboGlow.position.copyFrom(this.comboLabel.position);
    this.comboLabel.visible = true;
    this.comboGlow.visible = !this.settings.reducedMotion;
    if (combo) this.burst(this.comboLabel.x, this.comboLabel.y, 12);
  }
  tick(ms) {
    const dt = Math.min(ms, 50) / 1000;
    const animationDt = Math.min(ms, 1000) / 1000;
    this.onFrame?.(animationDt);
    this.matchEffects.tick(animationDt);
    if (this.comboLife > 0) {
      this.comboLife = Math.max(0, this.comboLife - dt);
      this.comboLabel.alpha = this.comboGlow.alpha = Math.min(
        1,
        this.comboLife * 3,
      );
      if (!this.settings.reducedMotion) this.comboLabel.y -= dt * 13;
      this.comboGlow.scale.set(1.5 + (1 - this.comboLife / 0.85) * 1.3);
      if (!this.comboLife)
        this.comboLabel.visible = this.comboGlow.visible = false;
    }
    this.clock += dt;
    for (const v of this.views.values()) {
      if (v.tile.removed && !v.fade) continue;
      const reduced = this.settings.reducedMotion,
        active = v.active;
      v.dy = reduced ? 0 : v.dy + (v.targetY - v.dy) * Math.min(1, dt * 24);
      const targetSize = active && !reduced ? 1.015 : 1;
      v.selection += ((active ? 1 : 0) - v.selection) * Math.min(1, dt * 35);
      v.halo.alpha = 0.38 * v.selection;
      v.size = reduced
        ? 1
        : v.size + (targetSize - v.size) * Math.min(1, dt * 22);
      let dx = 0,
        dy = v.dy,
        size = v.size,
        alpha = 1;
      v.sheen.alpha = 0;
      if (v.shake > 0) {
        v.shake = Math.max(0, v.shake - dt);
        dx = reduced ? 0 : Math.sin(v.shake * 90) * 3;
      }
      if (!v.entered) {
        v.entry += animationDt;
        const pose = entrancePose(
          v.entry,
          v.delay,
          v.transition,
          reduced,
          v.origin,
        );
        dx += pose.x;
        dy += pose.y;
        size *= pose.scale;
        alpha = pose.alpha;
        v.entered = pose.done;
      }
      v.glow.alpha = reduced
        ? 1
        : this.hinted.includes(v.tile.id)
          ? 0.62 + 0.38 * Math.sin(this.clock * 5) ** 2
          : active
            ? 0.75
            : 1;
      if (v.fade > 0) {
        v.matchTime += animationDt;
        const pose = matchPose(v.matchTime, reduced);
        dx = pose.pull * v.matchX;
        dy = pose.pull * v.matchY + pose.lift;
        size = pose.scale;
        alpha = pose.alpha;
        v.sheen.alpha = pose.flash;
        v.fade = pose.done
          ? 0
          : Math.max(0.001, (reduced ? 0.08 : MATCH_DURATION) - v.matchTime);
        if (pose.impact && !v.impacted) {
          v.impacted = true;
          if (v.impactLeader) {
            this.onImpact?.(v.matchReward);
            const x = this.board.x + (v.baseX + v.matchX + 48) * this.scale,
              y = this.board.y + (v.baseY + v.matchY + 60) * this.scale;
            this.matchEffects.shatter(x, y, 90 * this.scale, this.quality);
            if (v.matchReward)
              this.matchEffects.reward(x, Math.max(16, y - 12), v.matchReward);
          }
        }
        if (pose.done) v.container.visible = false;
      }
      // Center scaling keeps the symbol still and expands the shadow under the lifted tile.
      v.container.position.set(
        v.baseX + dx - (size - 1) * 48,
        v.baseY + dy - (size - 1) * 64,
      );
      v.container.scale.set(size);
      v.container.alpha = alpha;
      v.shadow.y = v.fade > 0 ? 0 : -dy * 0.6;
      v.shadow.alpha = active ? 1 : 0.8;
      v.shadow.scale.set(1);
    }
    for (const p of this.particles) {
      if (p.life <= 0) continue;
      p.life -= dt;
      p.sprite.visible = p.life > 0;
      p.sprite.x += p.vx * dt;
      p.sprite.y += p.vy * dt;
      p.vy += 60 * dt;
      p.sprite.rotation += dt;
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
    this.cancelPress();
    this.app.stop();
  }
  start() {
    this.app.start();
  }
  destroy() {
    this.app.canvas.removeEventListener("pointercancel", this.cancelPress);
    this.app.canvas.removeEventListener("touchcancel", this.cancelPress);
    this.resizeObserver.disconnect();
    this.app.destroy(true, {
      children: true,
      texture: true,
      textureSource: true,
    });
  }
}
