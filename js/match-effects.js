import { Container, Sprite, Graphics, Text } from "../vendor/pixi.mjs";
import { clamp, easeOut } from "./motion.js";
export class MatchEffects {
  constructor(app, settings, glowTexture, shardTexture) {
    this.settings = settings;
    this.layer = new Container();
    this.layer.eventMode = "none";
    app.stage.addChild(this.layer);
    this.pools = {};

    const flower = new Graphics();
    for (let i = 0; i < 5; i++) {
      const a = (i * Math.PI * 2) / 5;
      flower
        .circle(10 + Math.cos(a) * 5, 10 + Math.sin(a) * 5, 4)
        .fill(0xf2aac5);
    }
    flower.circle(10, 10, 2.5).fill(0xffdf94);
    const petal = new Graphics().ellipse(7, 3.5, 7, 3.5).fill(0xf0b0c9);
    const sparkle = new Graphics()
      .poly([5, 0, 6.5, 3.5, 10, 5, 6.5, 6.5, 5, 10, 3.5, 6.5, 0, 5, 3.5, 3.5])
      .fill(0xffedb8);
    const textures = {
      flower: app.renderer.generateTexture(flower),
      petal: app.renderer.generateTexture(petal),
      sparkle: app.renderer.generateTexture(sparkle),
      flash: glowTexture,
      glow: glowTexture,
      shard: shardTexture,
    };
    flower.destroy();
    petal.destroy();
    sparkle.destroy();
    for (const [kind, count] of Object.entries({
      shard: 96,
      petal: 48,
      flower: 20,
      sparkle: 30,
      flash: 12,
      glow: 12,
      reward: 8,
    })) {
      this.pools[kind] = [];
      for (let i = 0; i < count; i++) {
        const sprite =
          kind === "reward"
            ? new Text({
                text: "",
                style: {
                  fontFamily: "Arial",
                  fontWeight: "bold",
                  fontSize: 16,
                  fill: 0xffd878,
                  stroke: { color: 0x493622, width: 2 },
                  dropShadow: { color: 0x302318, blur: 2, distance: 1 },
                },
              })
            : new Sprite(textures[kind]);
        sprite.anchor.set(0.5);
        sprite.visible = false;
        sprite.eventMode = "none";
        if (kind === "flash" || kind === "glow") sprite.blendMode = "screen";
        this.layer.addChild(sprite);
        this.pools[kind].push({
          sprite,
          kind,
          active: false,
          age: 0,
          duration: 0,
          delay: 0,
          x: 0,
          y: 0,
          dx: 0,
          dy: 0,
          rotation: 0,
          spin: 0,
          size: 1,
        });
      }
    }
  }
  emit(kind, x, y, duration, delay, dx = 0, dy = 0, size = 1) {
    let p = this.pools[kind].find((p) => !p.active);
    if (!p && kind === "shard")
      p = this.pools.shard.reduce((oldest, item) =>
        item.age > oldest.age ? item : oldest,
      );
    if (!p) return null;
    Object.assign(p, {
      active: true,
      age: 0,
      duration,
      delay,
      x,
      y,
      dx,
      dy,
      size,
      rotation: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 0.6,
    });
    p.sprite.visible = false;
    p.sprite.alpha = 0;
    p.sprite.position.set(x, y);
    p.sprite.scale.set(size);
    return p;
  }
  spawn(x, y, tileWidth, quality) {
    if (this.settings.reducedMotion) return;
    const low = quality === 0,
      s = tileWidth / 48,
      spread = Math.min(1, s);
    this.emit("flash", x, y, 0.11, 0.03, 0, 0, (tileWidth / 128) * 0.8);
    if (!low)
      this.emit("glow", x, y, 0.24, 0.03, 0, 0, (tileWidth / 128) * 1.15);
    for (const [kind, count] of [
      ["flower", low ? 2 : 3],
      ["petal", low ? 4 : 8],
      ["sparkle", low ? 2 : 4],
    ]) {
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2,
          d =
            (kind === "petal"
              ? 15 + Math.random() * 30
              : 10 + Math.random() * 14) * spread;
        const size =
          kind === "flower"
            ? 0.42 + Math.random() * 0.15
            : kind === "petal"
              ? 0.36 + Math.random() * 0.3
              : 0.35 + Math.random() * 0.25;
        this.emit(
          kind,
          x,
          y,
          kind === "petal"
            ? 0.24 + Math.random() * 0.12
            : 0.23 + Math.random() * 0.07,
          0.06,
          Math.cos(a) * d,
          Math.sin(a) * d - 5,
          size * Math.min(1.3, s),
        );
      }
    }
  }
  shatter(x, y, tileWidth, quality) {
    if (this.settings.reducedMotion) return;
    this.emit("flash", x, y, 0.13, 0, 0, 0, (tileWidth / 128) * 1.6);
    if (quality > 0)
      this.emit("glow", x, y, 0.24, 0, 0, 0, (tileWidth / 128) * 1.9);
    const count = quality === 0 ? 12 : 24;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2,
        distance = 25 + Math.random() * 42;
      const p = this.emit(
        "shard",
        x,
        y,
        0.3 + Math.random() * 0.16,
        0,
        Math.cos(angle) * distance,
        Math.sin(angle) * distance,
        0.7 + Math.random() * 0.8,
      );
      if (p) {
        p.sprite.tint = Math.random() < 0.28 ? 0x78bba4 : 0xffefcb;
        p.spin = (Math.random() - 0.5) * 5;
      }
    }
    for (let i = 0; i < 6; i++) {
      const a = Math.random() * Math.PI * 2;
      this.emit(
        "sparkle",
        x,
        y,
        0.25,
        0,
        Math.cos(a) * 35,
        Math.sin(a) * 35,
        0.65,
      );
    }
  }
  reward(x, y, amount) {
    const p = this.emit(
      "reward",
      x,
      y,
      0.4,
      0,
      0,
      this.settings.reducedMotion ? 0 : -20,
      1,
    );
    if (p) {
      p.sprite.text = `+${amount}`;
      p.rotation = p.spin = 0;
    }
  }
  tick(dt) {
    this.poolList ??= Object.values(this.pools);
    for (const pool of (this.poolList ??= Object.values(this.pools)))
      for (const p of pool) {
        if (!p.active) continue;
        p.age += dt;
        const t = p.age - p.delay;
        if (t < 0) continue;
        const n = clamp(t / p.duration);
        if (n === 1 || (this.settings.reducedMotion && p.kind !== "reward")) {
          p.active = false;
          p.sprite.visible = false;
          continue;
        }
        p.sprite.visible = true;
        const e = easeOut(n);
        p.sprite.position.set(p.x + p.dx * e, p.y + p.dy * e);
        p.sprite.rotation = p.rotation + p.spin * n;
        if (p.kind === "flash" || p.kind === "glow") {
          p.sprite.rotation = 0;
          p.sprite.scale.set(p.size * (0.85 + 0.25 * e));
          p.sprite.alpha = (p.kind === "flash" ? 0.85 : 0.45) * (1 - n);
        } else if (p.kind === "reward") {
          p.sprite.alpha = clamp(t / 0.035) * (1 - clamp((n - 0.5) / 0.5));
          p.sprite.scale.set(
            this.settings.reducedMotion
              ? 1
              : n < 0.2
                ? 0.8 + 0.25 * easeOut(n / 0.2)
                : 1.05 - 0.05 * easeOut((n - 0.2) / 0.8),
          );
        } else {
          p.sprite.alpha = clamp(t / 0.025) * (1 - clamp((n - 0.2) / 0.8));
          p.sprite.scale.set(p.size * (0.8 + 0.2 * e));
        }
      }
  }
  clear() {
    for (const pool of (this.poolList ??= Object.values(this.pools)))
      for (const p of pool) {
        p.active = false;
        p.sprite.visible = false;
      }
  }
  get activeCount() {
    let n = 0;
    for (const pool of (this.poolList ??= Object.values(this.pools)))
      for (const p of pool) if (p.active) n++;
    return n;
  }
}
