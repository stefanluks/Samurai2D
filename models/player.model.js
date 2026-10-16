(() => {
	"use strict";

	const FRAME_SIZE = 96;
	const FOOT_Y = 80;
	const animations = {
		idle: { file: "IDLE.png", frames: 10, fps: 12, loop: true },
		run: { file: "RUN.png", frames: 16, fps: 20, loop: true },
		attack: { file: "ATTACK 1.png", frames: 7, fps: 32, loop: false },
		hurt: { file: "HURT.png", frames: 4, fps: 18, loop: false }
	};

	class PlayerModel {
		constructor() {
			this.animations = {};
			for (const [name, settings] of Object.entries(animations)) {
				const image = new Image();
				image.src = `Sprites/${settings.file}`;
				this.animations[name] = { ...settings, image, frame: 0, elapsed: 0 };
			}
			this.current = "idle";
		}

		setAnimation(name, restart = false) {
			if (this.current === name && !restart) return;
			this.current = name;
			this.animations[name].frame = 0;
			this.animations[name].elapsed = 0;
		}

		update(delta) {
			const animation = this.animations[this.current];
			animation.elapsed += delta;
			const frameDuration = 1 / animation.fps;
			while (animation.elapsed >= frameDuration) {
				animation.elapsed -= frameDuration;
				if (animation.frame < animation.frames - 1) animation.frame++;
				else if (animation.loop) animation.frame = 0;
			}
		}

		draw(context, x, baseline, size, facing = 1) {
			const animation = this.animations[this.current];
			if (!animation.image.complete || !animation.image.naturalWidth) return;
			context.save();
			context.translate(x, baseline);
			context.scale(facing, 1);
			context.imageSmoothingEnabled = false;
			context.drawImage(
				animation.image,
				animation.frame * FRAME_SIZE, 0, FRAME_SIZE, FRAME_SIZE,
				-size / 2, -size * FOOT_Y / FRAME_SIZE, size, size
			);
			context.restore();
		}
	}

	window.PlayerModel = PlayerModel;
})();
