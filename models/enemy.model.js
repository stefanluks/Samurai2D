(() => {
  "use strict";

  const FRAME_SIZE = 200;
  const FOOT_Y = 121;
  const definitions = {
    midnight: { folder: "Midnight" },
    esmerald: { folder: "Esmeralda" }
  };
  const animations = {
    idle: { file: "Idle.png", frames: 8, fps: 12, loop: true },
    run: { file: "Run.png", frames: 8, fps: 18, loop: true },
    attack: { file: "Attack1.png", frames: 6, fps: 20, loop: false },
    hurt: { file: "Take Hit.png", frames: 4, fps: 16, loop: false },
    death: { file: "Death.png", frames: 6, fps: 16, loop: false }
  };
  const imageSets = {};

  for (const [type, definition] of Object.entries(definitions)) {
    imageSets[type] = {};
    for (const [name, settings] of Object.entries(animations)) {
      const image = new Image();
      image.src = `Inimigos/${definition.folder}/${settings.file}`;
      imageSets[type][name] = { ...settings, image };
    }
  }

  class EnemyModel {
    constructor(type) {
      this.type = type;
      this.current = "idle";
      this.frame = 0;
      this.elapsed = 0;
    }

    setAnimation(name) {
      if (this.current === name) return;
      this.current = name;
      this.frame = 0;
      this.elapsed = 0;
    }

    update(delta) {
      const animation = imageSets[this.type][this.current];
      this.elapsed += delta;
      const frameDuration = 1 / animation.fps;
      while (this.elapsed >= frameDuration) {
        this.elapsed -= frameDuration;
        if (this.frame < animation.frames - 1) this.frame++;
        else if (animation.loop) this.frame = 0;
      }
    }

    draw(context, x, baseline, size, facing = 1) {
      const animation = imageSets[this.type][this.current];
      if (!animation.image.complete || !animation.image.naturalWidth) return;
      context.save();
      context.translate(x, baseline);
      context.scale(facing, 1);
      context.imageSmoothingEnabled = false;
      context.drawImage(
        animation.image,
        this.frame * FRAME_SIZE, 0, FRAME_SIZE, FRAME_SIZE,
        -size / 2, -size * FOOT_Y / FRAME_SIZE, size, size
      );
      context.restore();
    }
  }

  window.EnemyModel = EnemyModel;
})();