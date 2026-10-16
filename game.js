(() => {
  "use strict";

  const config = window.GAME_CONFIG;
  const canvas = document.getElementById("gameCanvas");
  const shell = document.getElementById("gameShell");
  const nameInput = document.getElementById("scoreNameInput");
  const ctx = canvas.getContext("2d");
  const playerModel = new window.PlayerModel();
  const gameAudio = new window.GameAudio();
  const gameLogo = new Image();
  gameLogo.src = "assets/logo.png";
  const menuSamuraiArt = new Image();
  menuSamuraiArt.src = "assets/samurai-menu.png";
  const HEIGHT = config.height;
  const SCORE_STORAGE_KEY = "ronin-das-dunas-scores";
  const keys = new Set();

  let width = 960;
  let mode = "menu";
  let transition = null;
  let activeVolumeSlider = null;
  let lastTime = 0;
  let spawnTimer = 0;
  let dustTimer = 0;
  let magicParticleTimer = 0;
  let shake = 0;
  let particles = [];
  let itemDrops = [];
  let enemies = [];
  let score = 0;
  let player;
  let lastAttackAt = 0;
  let playerName = "";
  let scoreSaved = false;
  let scoreSaveStatus = "";
  let bestMachineScore = 0;
  let isMachineRecord = false;
  let rankingScores = [];

  const colors = {
    ink: "#242b28",
    cream: "#fff1d3",
    rust: "#b95036",
    gold: "#f4c66a",
    sand: "#dca75f"
  };
  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const rect = shell.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(rect.width * ratio));
    canvas.height = Math.max(1, Math.round(rect.height * ratio));
    width = HEIGHT * rect.width / rect.height;
    ctx.setTransform(canvas.height / HEIGHT, 0, 0, canvas.height / HEIGHT, 0, 0);
  }

  function resetGame() {
    player = {
      x: width * 0.28,
      y: HEIGHT - config.groundHeight - 68,
      vx: 0,
      facing: 1,
      lives: config.maxLives,
      invulnerable: 0,
      hurtTimer: 0,
      attack: 0,
      hitSet: new Set(),
      effects: { agility: 0, emerald: 0, midnight: 0 }
    };
    enemies = [];
    particles = [];
    itemDrops = [];
    score = 0;
    dustTimer = 0;
    magicParticleTimer = 0;
    spawnTimer = config.initialSpawnInterval;
    shake = 0;
    playerName = "";
    nameInput.value = "";
    scoreSaved = false;
    scoreSaveStatus = "";
    bestMachineScore = 0;
    isMachineRecord = false;
    playerModel.setAnimation("idle");
    mode = "playing";
  }

  function roundRect(x, y, w, h, r, fill, stroke) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  function text(value, x, y, size, color, align = "left", font = "Trebuchet MS, Segoe UI, sans-serif") {
    ctx.font = `600 ${size}px ${font}`;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = "middle";
    ctx.fillText(value, x, y);
  }

  function drawMenuBackground() {
    const background = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    background.addColorStop(0, "#d8845b");
    background.addColorStop(1, "#dca75f");
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, HEIGHT);
  }

  function drawSun() {
    const x = width * 0.77;
    const y = HEIGHT * 0.24;
    ctx.fillStyle = "rgba(255, 237, 184, .28)";
    ctx.beginPath();
    ctx.arc(x, y, 66, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffe4a0";
    ctx.beginPath();
    ctx.arc(x, y, 39, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawMountain(points, fill) {
    ctx.beginPath();
    ctx.moveTo(points[0][0] * width, points[0][1] * HEIGHT);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i][0] * width, points[i][1] * HEIGHT);
    }
    ctx.lineTo(width, HEIGHT);
    ctx.lineTo(0, HEIGHT);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  }

  function drawCactus(x, y, scale = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.lineCap = "round";
    ctx.strokeStyle = "#53664b";
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -51);
    ctx.moveTo(0, -26);
    ctx.lineTo(-13, -26);
    ctx.lineTo(-13, -39);
    ctx.moveTo(0, -35);
    ctx.lineTo(12, -35);
    ctx.lineTo(12, -46);
    ctx.stroke();
    ctx.restore();
  }

  function drawBackground() {
    const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    sky.addColorStop(0, "#d8845b");
    sky.addColorStop(0.48, "#e8aa6d");
    sky.addColorStop(1, "#f0ca82");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, HEIGHT);
    drawSun();
    drawMountain([[0, 0.53], [0.14, 0.39], [0.27, 0.55], [0.43, 0.36], [0.59, 0.53], [0.75, 0.41], [0.9, 0.56]], "#bc7959");
    drawMountain([[0, 0.64], [0.18, 0.5], [0.34, 0.62], [0.51, 0.47], [0.7, 0.63], [0.87, 0.49]], "#cf8958");
    drawMountain([[0, 0.74], [0.19, 0.61], [0.38, 0.73], [0.56, 0.6], [0.75, 0.74], [0.93, 0.59]], "#d99b5c");

    ctx.fillStyle = "rgba(255, 231, 178, .18)";
    ctx.beginPath();
    ctx.ellipse(width * 0.17, HEIGHT * 0.77, width * 0.43, 68, 0, Math.PI, Math.PI * 2);
    ctx.ellipse(width * 0.81, HEIGHT * 0.82, width * 0.4, 58, 0, Math.PI, Math.PI * 2);
    ctx.fill();

    const groundY = HEIGHT - config.groundHeight;
    const ground = ctx.createLinearGradient(0, groundY, 0, HEIGHT);
    ground.addColorStop(0, "#d6a45e");
    ground.addColorStop(1, "#a97643");
    ctx.fillStyle = ground;
    ctx.fillRect(0, groundY, width, config.groundHeight);
    ctx.fillStyle = "#efd08a";
    ctx.fillRect(0, groundY, width, 3);

    drawCactus(width * 0.12, groundY - 3, 0.9);
    drawCactus(width * 0.88, groundY - 1, 1.16);
    ctx.fillStyle = "#8e6648";
    for (const [x, y, r] of [[0.22, 0.84, 4], [0.48, 0.9, 3], [0.68, 0.82, 5], [0.94, 0.9, 3]]) {
      ctx.beginPath();
      ctx.ellipse(width * x, HEIGHT * y, r * 1.6, r, -0.2, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < 7; i++) {
      const x = (i + 0.5) * width / 7;
      ctx.strokeStyle = "rgba(124, 82, 47, .22)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, groundY + 16 + (i % 2) * 9);
      ctx.lineTo(x + 20, groundY + 19 + (i % 2) * 9);
      ctx.stroke();
    }
  }

  function drawSamurai() {
    if (player.invulnerable > 0 && Math.floor(player.invulnerable * 14) % 2 === 0) return;
    const x = player.x;
    ctx.fillStyle = "rgba(64, 45, 34, .2)";
    ctx.beginPath();
    ctx.ellipse(x, player.y + 67, 34, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    playerModel.draw(ctx, x, player.y + 68, config.playerCharacterSize * config.characterScale, player.facing);
  }

  function drawEnemy(enemy) {
    ctx.fillStyle = "rgba(64, 45, 34, .2)";
    ctx.beginPath();
    ctx.ellipse(enemy.x, enemy.y + 65, 38, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    const size = config.enemyCharacterSize * config.characterScale;
    enemy.model.draw(ctx, enemy.x, enemy.y + 66, size, enemy.facing);
    if (enemy.maxHealth > 1) {
      const barWidth = size * 0.28;
      const barY = enemy.y + 66 - size * 0.26 - 14;
      ctx.fillStyle = "rgba(36, 43, 40, .8)";
      ctx.fillRect(enemy.x - barWidth / 2, barY, barWidth, 6);
      ctx.fillStyle = "#e87559";
      ctx.fillRect(enemy.x - barWidth / 2, barY, barWidth * enemy.health / enemy.maxHealth, 6);
    }
  }

  function drawHud() {
    const activeEffectColor = player.effects.emerald > 0
      ? "#69e584"
      : player.effects.midnight > 0
        ? "#a18aff"
        : player.effects.agility > 0
          ? "#68dfcc"
          : "rgba(255, 241, 211, .22)";
    roundRect(20, 18, Math.min(220, width * 0.48), 54, 9, "rgba(35, 42, 39, .78)", activeEffectColor);
    text("VIDAS", 36, 37, 12, "#e8cf9e");
    for (let i = 0; i < config.maxLives; i++) {
      text(i < player.lives ? "♥" : "·", 41 + i * 24, 56, 21, i < player.lives ? "#e87559" : "#86776a");
    }
    roundRect(width - 158, 18, 138, 48, 9, "rgba(35, 42, 39, .78)", activeEffectColor);
    text("DERROTADOS", width - 89, 34, 10, "#e8cf9e", "center");
    text(String(score), width - 89, 51, 16, colors.cream, "center");
  }

  function drawFullscreenButton() {
    const x = width - 37;
    const y = 36;
    roundRect(x - 17, y - 17, 34, 34, 8, "rgba(35, 42, 39, .48)", "rgba(255, 241, 211, .3)");
    ctx.strokeStyle = colors.cream;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 7, y - 4); ctx.lineTo(x - 7, y - 8); ctx.lineTo(x - 3, y - 8);
    ctx.moveTo(x + 3, y - 8); ctx.lineTo(x + 7, y - 8); ctx.lineTo(x + 7, y - 4);
    ctx.moveTo(x - 7, y + 4); ctx.lineTo(x - 7, y + 8); ctx.lineTo(x - 3, y + 8);
    ctx.moveTo(x + 3, y + 8); ctx.lineTo(x + 7, y + 8); ctx.lineTo(x + 7, y + 4);
    ctx.stroke();
  }

  function drawMenu() {
    drawMenuBackground();
    drawFullscreenButton();
    const buttons = menuButtons();
    if (gameLogo.complete && gameLogo.naturalWidth) {
      const logoWidth = Math.min(620, width * 0.62);
      const logoHeight = logoWidth * gameLogo.naturalHeight / gameLogo.naturalWidth;
      ctx.drawImage(gameLogo, width * 0.72 - logoWidth / 2, HEIGHT * 0.12, logoWidth, logoHeight);
    }
    drawMenuSamurai(width * 0.22, HEIGHT * 0.87);
    drawMenuButton(buttons.start, "INICIAR JORNADA", true);
    drawMenuButton(buttons.ranking, "RANKING", false);
    drawMenuButton(buttons.options, "OPÇÕES", false);
  }

  function menuButtons() {
    const buttonWidth = Math.min(290, width * 0.34);
    const x = width * 0.72 - buttonWidth / 2;
    return {
      start: { x, y: HEIGHT * 0.57, width: buttonWidth, height: 58 },
      ranking: { x, y: HEIGHT * 0.69, width: buttonWidth, height: 54 },
      options: { x, y: HEIGHT * 0.81, width: buttonWidth, height: 50 }
    };
  }

  function drawMenuButton(button, label, primary) {
    roundRect(
      button.x, button.y, button.width, button.height, 8,
      primary ? colors.gold : "rgba(36, 43, 40, .32)",
      primary ? "#ffe5a5" : "rgba(255, 241, 211, .58)"
    );
    text(label, button.x + button.width / 2, button.y + button.height / 2, 16, primary ? colors.ink : colors.cream, "center");
  }

  function drawMenuSamurai(x, baseline) {
    const verticalOffset = 22;
    if (!menuSamuraiArt.complete || !menuSamuraiArt.naturalWidth) {
      playerModel.draw(ctx, x, baseline + verticalOffset, config.playerCharacterSize * config.characterScale * 1.5, 1);
      return;
    }
    const frameWidth = menuSamuraiArt.naturalWidth / 8;
    const imageHeight = HEIGHT * 0.98;
    const imageWidth = imageHeight * frameWidth / menuSamuraiArt.naturalHeight;
    ctx.drawImage(
      menuSamuraiArt,
      0, 0, frameWidth, menuSamuraiArt.naturalHeight,
      x - imageWidth / 2, (HEIGHT - imageHeight) / 2 + verticalOffset, imageWidth, imageHeight
    );
  }

  function optionsLayout() {
    const panel = {
      x: width * 0.53,
      y: HEIGHT * 0.24,
      width: Math.min(430, width * 0.44),
      height: HEIGHT * 0.68
    };
    const sliderX = panel.x + 30;
    const sliderWidth = panel.width - 60;
    const buttonGap = 14;
    const buttonWidth = (panel.width - 60 - buttonGap) / 2;
    return {
      panel,
      musicSlider: { x: sliderX, y: panel.y + 112, width: sliderWidth, height: 18 },
      effectsSlider: { x: sliderX, y: panel.y + 194, width: sliderWidth, height: 18 },
      fullscreen: { x: panel.x + 23, y: panel.y + 245, width: buttonWidth, height: 42 },
      back: { x: panel.x + 23 + buttonWidth + buttonGap, y: panel.y + 245, width: buttonWidth, height: 42 }
    };
  }

  function drawVolumeSlider(slider, label, value) {
    text(label, slider.x, slider.y - 23, 13, colors.cream);
    text(`${Math.round(value * 100)}%`, slider.x + slider.width, slider.y - 23, 13, colors.gold, "right");
    roundRect(slider.x, slider.y, slider.width, 8, 4, "rgba(255, 241, 211, .24)");
    roundRect(slider.x, slider.y, slider.width * value, 8, 4, colors.gold);
    ctx.fillStyle = colors.cream;
    ctx.beginPath();
    ctx.arc(slider.x + slider.width * value, slider.y + 4, 10, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawOptions() {
    drawMenuBackground();
    drawFullscreenButton();
    if (gameLogo.complete && gameLogo.naturalWidth) {
      const logoWidth = Math.min(620, width * 0.62);
      const logoHeight = logoWidth * gameLogo.naturalHeight / gameLogo.naturalWidth;
      ctx.drawImage(gameLogo, width * 0.72 - logoWidth / 2, HEIGHT * 0.12, logoWidth, logoHeight);
    }
    drawMenuSamurai(width * 0.22, HEIGHT * 0.87);

    const controls = optionsLayout();
    const { panel } = controls;
    roundRect(panel.x, panel.y, panel.width, panel.height, 12, "rgba(37, 44, 40, .92)", "rgba(255, 241, 211, .3)");
    text("OPÇÕES", panel.x + panel.width / 2, panel.y + 36, 28, colors.cream, "center", "Georgia, serif");
    drawVolumeSlider(controls.musicSlider, "VOLUME DA MÚSICA", gameAudio.musicVolume);
    drawVolumeSlider(controls.effectsSlider, "EFEITOS SONOROS", gameAudio.effectsVolume);
    drawMenuButton(controls.fullscreen, document.fullscreenElement ? "SAIR DA TELA CHEIA" : "TELA CHEIA", false);
    drawMenuButton(controls.back, "VOLTAR", false);
  }

  function setVolumeFromPointer(slider, point, setter) {
    const value = Math.min(1, Math.max(0, (point.x - slider.x) / slider.width));
    setter.call(gameAudio, value);
  }

  function readMachineRanking() {
    try {
      const entries = JSON.parse(localStorage.getItem(SCORE_STORAGE_KEY) || "[]");
      if (!Array.isArray(entries)) return [];
      return entries
        .filter(entry => entry && typeof entry.name === "string" && Number.isFinite(entry.points))
        .sort((first, second) => second.points - first.points)
        .slice(0, 10);
    } catch {
      return [];
    }
  }

  function drawRankingPanel(x) {
    const panelWidth = Math.min(440, width * 0.49);
    const panelY = 34;
    const panelHeight = HEIGHT - 68;
    roundRect(x, panelY, panelWidth, panelHeight, 12, "rgba(37, 44, 40, .94)", "rgba(255, 241, 211, .3)");
    text("RANKING", x + panelWidth / 2, panelY + 37, 29, colors.cream, "center", "Georgia, serif");
    text("10 MELHORES PONTUAÇÕES", x + panelWidth / 2, panelY + 70, 11, "#e8cf9e", "center");

    if (rankingScores.length === 0) {
      text("Ainda não há pontuações salvas.", x + panelWidth / 2, panelY + 132, 14, "#e7d2ad", "center");
    } else {
      rankingScores.forEach((entry, index) => {
        const rowY = panelY + 105 + index * 28;
        const rankColor = index === 0 ? colors.gold : colors.cream;
        text(String(index + 1).padStart(2, "0"), x + 24, rowY, 13, rankColor);
        text(entry.name.slice(0, 20), x + 62, rowY, 13, colors.cream);
        text(String(entry.points), x + panelWidth - 24, rowY, 13, rankColor, "right");
        if (index < rankingScores.length - 1) {
          ctx.fillStyle = "rgba(255, 241, 211, .12)";
          ctx.fillRect(x + 22, rowY + 14, panelWidth - 44, 1);
        }
      });
    }

    const backButton = { x: x + 22, y: panelY + panelHeight - 58, width: panelWidth - 44, height: 40 };
    drawMenuButton(backButton, "VOLTAR AO MENU", false);
    return backButton;
  }

  function beginRankingTransition() {
    rankingScores = readMachineRanking();
    transition = { elapsed: 0, duration: 0.72 };
    mode = "transition";
  }

  function drawRanking() {
    drawMenuBackground();
    drawFullscreenButton();
    drawRankingPanel(26);
    drawMenuSamurai(width * 0.79, HEIGHT * 0.87);
  }

  function drawMenuTransition() {
    drawMenuBackground();
    drawFullscreenButton();
    const progress = Math.min(1, transition.elapsed / transition.duration);
    const eased = progress * progress * (3 - 2 * progress);
    const samuraiX = width * (0.22 + 0.57 * eased);
    const panelStart = width + 16;
    const panelX = panelStart + (26 - panelStart) * eased;
    drawMenuSamurai(samuraiX, HEIGHT * 0.87);
    drawRankingPanel(panelX);
  }

  function spawnEnemy() {
    const fromLeft = Math.random() < 0.5;
    const type = Math.random() < 0.5 ? "midnight" : "esmerald";
    const health = 1 + Math.floor(score / config.enemyHealthInterval);
    enemies.push({
      x: fromLeft ? -28 : width + 28,
      y: HEIGHT - config.groundHeight - 66,
      facing: fromLeft ? 1 : -1,
      attackCooldown: 0.7 + Math.random() * 0.6,
      type,
      health,
      maxHealth: health,
      flash: 0,
      model: new window.EnemyModel(type),
      hitTimer: 0,
      deathTimer: 0,
      attackTimer: 0,
      attackHit: false,
      speed: config.enemySpeed * (type === "esmerald" ? 1.1 : 1)
    });
  }

  function burst(x, y, color, count = 10) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 55 + Math.random() * 190;
      particles.push({
        kind: "burst",
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 35,
        life: 0.25 + Math.random() * 0.35,
        maxLife: 0.6,
        color,
        size: 2 + Math.random() * 4
      });
    }
  }

  function emitRunningDust(x, y, facing) {
    for (let i = 0; i < 2; i++) {
      particles.push({
        kind: "dust",
        x: x + (Math.random() - 0.5) * 12,
        y: y - Math.random() * 5,
        vx: -facing * (12 + Math.random() * 24) + (Math.random() - 0.5) * 12,
        vy: -10 - Math.random() * 18,
        life: 0.3 + Math.random() * 0.16,
        maxLife: 0.46,
        color: "#f2d5a5",
        size: 4 + Math.random() * 7
      });
    }
  }

  function emitBlood(x, y, direction) {
    const bloodColors = ["#7f1d2b", "#a52332", "#c43a3c"];
    for (let i = 0; i < 8; i++) {
      particles.push({
        kind: "blood",
        x: x + (Math.random() - 0.5) * 10,
        y: y + (Math.random() - 0.5) * 12,
        vx: direction * (24 + Math.random() * 112) + (Math.random() - 0.5) * 34,
        vy: -30 - Math.random() * 105,
        life: 0.24 + Math.random() * 0.2,
        maxLife: 0.44,
        color: bloodColors[Math.floor(Math.random() * bloodColors.length)],
        size: 2 + Math.random() * 4
      });
    }
  }

  function emitMagicParticles(type) {
    const palette = type === "emerald" ? ["#5be08a", "#9bffba"] : ["#9276f4", "#c2a8ff"];
    particles.push({
      kind: `magic-${type}`,
      x: player.x + (Math.random() - 0.5) * 56,
      y: player.y + 8 + Math.random() * 54,
      vx: (Math.random() - 0.5) * 34,
      vy: -18 - Math.random() * 28,
      life: 0.35 + Math.random() * 0.28,
      maxLife: 0.63,
      color: palette[Math.floor(Math.random() * palette.length)],
      size: 2 + Math.random() * 3
    });
  }

  function attack() {
    if (mode !== "playing" || player.attack > 0.04 || performance.now() - lastAttackAt < 140) return;
    player.attack = config.attackDuration;
    player.hitSet.clear();
    lastAttackAt = performance.now();
    playerModel.setAnimation("attack", true);
    gameAudio.play("slash");
  }

  function hurtPlayer(enemy) {
    if (player.invulnerable > 0) return;
    gameAudio.play("hit");
    player.lives--;
    player.invulnerable = config.hitInvulnerability;
    player.hurtTimer = 0.3;
    player.x = Math.max(24, Math.min(width - 24, player.x + (player.x < enemy.x ? -1 : 1) * 18));
    shake = 0.12;
    burst(player.x, player.y + 28, "#e87559", 8);
    if (player.lives <= 0) {
      bestMachineScore = getBestMachineScore();
      isMachineRecord = score > bestMachineScore;
      mode = "gameover";
    }
  }

  function update(dt) {
    if (mode === "transition") {
      transition.elapsed += dt;
      playerModel.update(dt);
      if (transition.elapsed >= transition.duration) {
        mode = "ranking";
        transition = null;
      }
      return;
    }
    if (mode === "menu" || mode === "ranking" || mode === "options") {
      playerModel.update(dt);
      return;
    }
    if (mode !== "playing") return;
    const left = keys.has("ArrowLeft") || keys.has("a");
    const right = keys.has("ArrowRight") || keys.has("d");
    const direction = (right ? 1 : 0) - (left ? 1 : 0);
    for (const effect of Object.keys(player.effects)) {
      player.effects[effect] = Math.max(0, player.effects[effect] - dt);
    }
    player.vx = direction * config.playerSpeed * (player.effects.agility > 0 ? config.agilitySpeedMultiplier : 1);
    if (direction) player.facing = direction;
    const previousX = player.x;
    player.x = Math.max(24, Math.min(width - 24, player.x + player.vx * dt));
    if (player.x !== previousX) {
      dustTimer -= dt;
      if (dustTimer <= 0) {
        emitRunningDust(player.x - player.facing * 24, HEIGHT - config.groundHeight - 2, player.facing);
        dustTimer = 0.075;
      }
    } else {
      dustTimer = 0;
    }
    player.invulnerable = Math.max(0, player.invulnerable - dt);
    player.hurtTimer = Math.max(0, player.hurtTimer - dt);
    player.attack = Math.max(0, player.attack - dt);
    const animation = player.hurtTimer > 0 ? "hurt" : player.attack > 0 ? "attack" : direction ? "run" : "idle";
    playerModel.setAnimation(animation);
    playerModel.update(dt);

    if (player.attack > 0 && player.attack < config.attackDuration * 0.72) {
      for (const enemy of enemies) {
        const dx = (enemy.x - player.x) * player.facing;
        if (dx > 0 && dx < 132 && Math.abs(enemy.y - player.y) < 42 && !enemy.dead && !player.hitSet.has(enemy)) {
          player.hitSet.add(enemy);
          gameAudio.play("hit");
          enemy.flash = 0.16;
          const matchingEffect = player.effects[enemy.type] > 0;
          enemy.health -= 1 + (matchingEffect ? config.matchingDamageBonus : 0);
          enemy.x += player.facing * 12;
          emitBlood(enemy.x, enemy.y + 28, player.facing);
          if (enemy.health <= 0) {
            enemy.dead = true;
            enemy.deathTimer = 0.65;
            enemy.model.setAnimation("death");
            score++;
            shake = 0.09;
            burst(enemy.x, enemy.y + 30, "#ffe2a4", 12);
            const drop = window.ItemDropSystem.create(
              enemy.x,
              HEIGHT - config.groundHeight,
              player,
              config
            );
            if (drop) itemDrops.push(drop);
          } else {
            enemy.hitTimer = 0.32;
            enemy.attackTimer = 0;
            enemy.attackHit = true;
            enemy.model.setAnimation("hurt");
          }
        }
      }
    }

    spawnTimer -= dt;
    const enemyLimit = Math.min(config.maximumEnemyLimit, config.initialEnemyLimit + Math.floor(score / config.enemyHealthInterval));
    if (spawnTimer <= 0 && enemies.filter(enemy => !enemy.dead).length < enemyLimit) {
      spawnEnemy();
      spawnTimer = Math.max(config.minimumSpawnInterval, config.initialSpawnInterval / (1 + score * config.spawnAcceleration));
    }

    for (const enemy of enemies) {
      enemy.flash = Math.max(0, enemy.flash - dt);
      if (enemy.dead) {
        enemy.deathTimer = Math.max(0, enemy.deathTimer - dt);
        enemy.model.update(dt);
        continue;
      }
      enemy.hitTimer = Math.max(0, enemy.hitTimer - dt);
      enemy.attackTimer = Math.max(0, enemy.attackTimer - dt);
      enemy.attackCooldown -= dt;
      const dx = player.x - enemy.x;
      enemy.facing = dx >= 0 ? 1 : -1;
      if (enemy.hitTimer > 0) {
        enemy.model.setAnimation("hurt");
      } else if (enemy.attackTimer > 0) {
        enemy.model.setAnimation("attack");
        if (!enemy.attackHit && enemy.attackTimer <= config.enemyAttackDuration - config.enemyAttackWindup) {
          enemy.attackHit = true;
          if (Math.abs(dx) <= 132) hurtPlayer(enemy);
        }
      } else if (Math.abs(dx) > 132) {
        enemy.x += Math.sign(dx) * enemy.speed * dt;
        enemy.model.setAnimation("run");
      } else if (enemy.attackCooldown <= 0) {
        enemy.attackTimer = config.enemyAttackDuration;
        enemy.attackHit = false;
        enemy.model.setAnimation("attack");
        enemy.attackCooldown = 1.05;
      } else {
        enemy.model.setAnimation("idle");
      }
      enemy.model.update(dt);
    }
    enemies = enemies.filter(enemy => enemy.dead ? enemy.deathTimer > 0 : enemy.x > -120 && enemy.x < width + 120);

    magicParticleTimer -= dt;
    if (magicParticleTimer <= 0) {
      if (player.effects.emerald > 0) emitMagicParticles("emerald");
      if (player.effects.midnight > 0) emitMagicParticles("midnight");
      magicParticleTimer = 0.075;
    }

    itemDrops = itemDrops.filter(item => window.ItemDropSystem.update(item, dt));
    for (let index = itemDrops.length - 1; index >= 0; index--) {
      const item = itemDrops[index];
      if (Math.abs(item.x - player.x) > 34) continue;
      const collected = window.ItemDropSystem.collect(item, player, config);
      if (!collected) continue;
      itemDrops.splice(index, 1);
      gameAudio.play("pickup");
      const pickupColors = {
        heart: "#e85b63",
        agility: "#68dfcc",
        emerald: "#69e584",
        midnight: "#a18aff"
      };
      burst(item.x, item.groundY - 16, pickupColors[collected], 8);
    }

    for (const particle of particles) {
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      if (particle.kind === "dust") {
        particle.vx *= Math.max(0, 1 - dt * 3);
        particle.vy += 12 * dt;
      } else if (particle.kind === "blood") {
        particle.vy += 620 * dt;
      } else if (particle.kind?.startsWith("magic-")) {
        particle.vy -= 14 * dt;
        particle.vx *= Math.max(0, 1 - dt * 1.5);
      } else {
        particle.vy += 410 * dt;
      }
      particle.life -= dt;
    }
    particles = particles.filter(particle => particle.life > 0);
    shake = Math.max(0, shake - dt);
  }

  function drawParticles() {
    for (const particle of particles) {
      const opacity = Math.max(0, particle.life / particle.maxLife);
      const isMagic = particle.kind?.startsWith("magic-") ?? false;
      ctx.globalAlpha = opacity * (particle.kind === "dust" ? 0.34 : isMagic ? 0.9 : 1);
      ctx.fillStyle = particle.color;
      if (particle.kind === "dust") {
        ctx.beginPath();
        ctx.ellipse(particle.x, particle.y, particle.size, particle.size * 0.62, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (particle.kind === "blood") {
        ctx.save();
        ctx.translate(particle.x, particle.y);
        ctx.rotate(Math.atan2(particle.vy, particle.vx) + Math.PI / 2);
        ctx.beginPath();
        ctx.ellipse(0, 0, particle.size * 0.55, particle.size * 1.3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (isMagic) {
        ctx.beginPath();
        ctx.moveTo(particle.x, particle.y - particle.size);
        ctx.lineTo(particle.x + particle.size * 0.58, particle.y);
        ctx.lineTo(particle.x, particle.y + particle.size);
        ctx.lineTo(particle.x - particle.size * 0.58, particle.y);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
      }
    }
    ctx.globalAlpha = 1;
  }

  function getBestMachineScore() {
    try {
      const savedScores = JSON.parse(localStorage.getItem(SCORE_STORAGE_KEY) || "[]");
      if (!Array.isArray(savedScores)) return 0;
      return savedScores.reduce((best, item) =>
        item && Number.isFinite(item.points) ? Math.max(best, item.points) : best, 0);
    } catch {
      return 0;
    }
  }

  function saveScore() {
    const name = playerName.trim();
    if (!name) {
      scoreSaveStatus = "Digite seu nome para salvar.";
      nameInput.focus({ preventScroll: true });
      return;
    }
    if (scoreSaved) return;

    try {
      const previous = JSON.parse(localStorage.getItem(SCORE_STORAGE_KEY) || "[]");
      const scores = Array.isArray(previous)
        ? previous.filter(item => item && typeof item.name === "string" && Number.isFinite(item.points))
        : [];
      scores.push({ name: name.slice(0, 20), points: score });
      scores.sort((first, second) => second.points - first.points);
      localStorage.setItem(SCORE_STORAGE_KEY, JSON.stringify(scores.slice(0, 50)));
      bestMachineScore = Math.max(bestMachineScore, score);
      scoreSaved = true;
      scoreSaveStatus = "Pontuação salva neste navegador.";
      nameInput.blur();
    } catch {
      scoreSaveStatus = "Não foi possível salvar a pontuação.";
    }
  }

  function returnToMenu() {
    mode = "menu";
    transition = null;
    playerName = "";
    nameInput.value = "";
    nameInput.blur();
    keys.clear();
    playerModel.setAnimation("idle", true);
  }

  function drawGameOver() {
    ctx.fillStyle = "rgba(31, 37, 34, .56)";
    ctx.fillRect(0, 0, width, HEIGHT);
    const panelWidth = Math.min(430, width - 28);
    const panelX = (width - panelWidth) / 2;
    const panelY = (HEIGHT - 380) / 2;
    roundRect(panelX, panelY, panelWidth, 380, 12, "rgba(37, 44, 40, .96)", "rgba(255, 241, 211, .28)");
    text("FIM DE JOGO", width / 2, panelY + 34, Math.min(32, width * 0.09), colors.cream, "center", "Georgia, serif");
    text(`Derrotados: ${score}`, width / 2, panelY + 70, 16, "#e7d2ad", "center");
    const recordMessage = isMachineRecord ? "NOVO RECORDE DA MÁQUINA!" : `Recorde da máquina: ${bestMachineScore}`;
    text(recordMessage, width / 2, panelY + 101, 13, isMachineRecord ? colors.gold : "#e8cf9e", "center");
    text("NOME DO JOGADOR", panelX + 22, panelY + 125, 11, "#e8cf9e");
    roundRect(panelX + 16, panelY + 138, panelWidth - 32, 44, 5, "rgba(255, 241, 211, .1)", "rgba(255, 241, 211, .4)");
    const cursor = !scoreSaved && Math.floor(performance.now() / 450) % 2 === 0 ? "|" : "";
    text(playerName + cursor, panelX + 28, panelY + 160, 16, colors.cream);
    roundRect(width / 2 - 112, panelY + 196, 224, 44, 7, colors.gold, "#ffe5a5");
    text(scoreSaved ? "PONTUAÇÃO SALVA" : "SALVAR PONTUAÇÃO", width / 2, panelY + 218, 14, colors.ink, "center");
    if (scoreSaveStatus) text(scoreSaveStatus, width / 2, panelY + 260, Math.min(12, width * 0.04), "#e7d2ad", "center");

    const buttonGap = 16;
    const buttonWidth = (panelWidth - 32 - buttonGap) / 2;
    const buttonY = panelY + 300;
    const retryX = panelX + 16;
    const menuX = retryX + buttonWidth + buttonGap;
    roundRect(retryX, buttonY, buttonWidth, 42, 7, "rgba(255, 241, 211, .08)", "rgba(255, 241, 211, .28)");
    text("TENTAR NOVAMENTE", retryX + buttonWidth / 2, buttonY + 21, 12, colors.cream, "center");
    roundRect(menuX, buttonY, buttonWidth, 42, 7, "rgba(255, 241, 211, .08)", "rgba(255, 241, 211, .28)");
    text("MENU PRINCIPAL", menuX + buttonWidth / 2, buttonY + 21, 12, colors.cream, "center");
  }

  function draw() {
    ctx.clearRect(0, 0, width, HEIGHT);
    if (mode === "menu") {
      drawMenu();
      return;
    }
    if (mode === "ranking") {
      drawRanking();
      return;
    }
    if (mode === "options") {
      drawOptions();
      return;
    }
    if (mode === "transition") {
      drawMenuTransition();
      return;
    }
    drawBackground();
    if (shake > 0) ctx.save();
    if (shake > 0) ctx.translate((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 6);
    for (const enemy of enemies) {
      if (enemy.flash > 0) ctx.globalAlpha = 0.48 + Math.random() * 0.52;
      drawEnemy(enemy);
      ctx.globalAlpha = 1;
    }
    for (const item of itemDrops) window.ItemDropSystem.draw(ctx, item);
    drawSamurai();
    drawParticles();
    if (shake > 0) ctx.restore();
    drawHud();
    if (mode === "gameover") drawGameOver();
  }

  function frame(timestamp) {
    const dt = Math.min((timestamp - lastTime) / 1000 || 0, 0.033);
    lastTime = timestamp;
    update(dt);
    draw();
    requestAnimationFrame(frame);
  }

  function canvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: (event.clientX - rect.left) * width / rect.width, y: (event.clientY - rect.top) * HEIGHT / rect.height };
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      shell.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.();
    }
  }

  canvas.addEventListener("pointerdown", event => {
    event.preventDefault();
    canvas.focus();
    gameAudio.unlock();
    const point = canvasPoint(event);
    if (point.x > width - 72 && point.y < 72) {
      toggleFullscreen();
      return;
    }
    if (mode === "menu") {
      const buttons = menuButtons();
      if (point.x >= buttons.start.x && point.x <= buttons.start.x + buttons.start.width && point.y >= buttons.start.y && point.y <= buttons.start.y + buttons.start.height) {
        resetGame();
      } else if (point.x >= buttons.ranking.x && point.x <= buttons.ranking.x + buttons.ranking.width && point.y >= buttons.ranking.y && point.y <= buttons.ranking.y + buttons.ranking.height) {
        beginRankingTransition();
      } else if (point.x >= buttons.options.x && point.x <= buttons.options.x + buttons.options.width && point.y >= buttons.options.y && point.y <= buttons.options.y + buttons.options.height) {
        mode = "options";
      }
      return;
    }
    if (mode === "options") {
      const controls = optionsLayout();
      const withinSlider = slider =>
        point.x >= slider.x - 12 && point.x <= slider.x + slider.width + 12 &&
        point.y >= slider.y - 12 && point.y <= slider.y + slider.height + 12;
      if (withinSlider(controls.musicSlider)) {
        activeVolumeSlider = "music";
        setVolumeFromPointer(controls.musicSlider, point, gameAudio.setMusicVolume);
        canvas.setPointerCapture(event.pointerId);
      } else if (withinSlider(controls.effectsSlider)) {
        activeVolumeSlider = "effects";
        setVolumeFromPointer(controls.effectsSlider, point, gameAudio.setEffectsVolume);
        canvas.setPointerCapture(event.pointerId);
      } else if (point.x >= controls.fullscreen.x && point.x <= controls.fullscreen.x + controls.fullscreen.width && point.y >= controls.fullscreen.y && point.y <= controls.fullscreen.y + controls.fullscreen.height) {
        toggleFullscreen();
      } else if (point.x >= controls.back.x && point.x <= controls.back.x + controls.back.width && point.y >= controls.back.y && point.y <= controls.back.y + controls.back.height) {
        activeVolumeSlider = null;
        mode = "menu";
      }
      return;
    }
    if (mode === "ranking") {
      const panelWidth = Math.min(440, width * 0.49);
      const buttonX = 26 + 22;
      const buttonY = 34 + HEIGHT - 68 - 58;
      const buttonWidth = panelWidth - 44;
      if (point.x >= buttonX && point.x <= buttonX + buttonWidth && point.y >= buttonY && point.y <= buttonY + 40) returnToMenu();
      return;
    }
    if (mode === "transition") return;
    if (mode === "gameover") {
      const centerX = width / 2;
      const panelWidth = Math.min(430, width - 28);
      const panelX = (width - panelWidth) / 2;
      const panelY = (HEIGHT - 380) / 2;
      const buttonGap = 16;
      const buttonWidth = (panelWidth - 32 - buttonGap) / 2;
      const buttonY = panelY + 300;
      const retryX = panelX + 16;
      const menuX = retryX + buttonWidth + buttonGap;
      if (Math.abs(point.x - centerX) <= 112 && point.y >= panelY + 196 && point.y <= panelY + 240) {
        saveScore();
      } else if (point.x >= retryX && point.x <= retryX + buttonWidth && point.y >= buttonY && point.y <= buttonY + 42) {
        resetGame();
      } else if (point.x >= menuX && point.x <= menuX + buttonWidth && point.y >= buttonY && point.y <= buttonY + 42) {
        returnToMenu();
      } else if (point.y >= panelY + 138 && point.y <= panelY + 182) {
        nameInput.focus({ preventScroll: true });
      }
      return;
    }
    attack();
  });

  canvas.addEventListener("pointermove", event => {
    if (mode !== "options" || !activeVolumeSlider) return;
    const controls = optionsLayout();
    const point = canvasPoint(event);
    if (activeVolumeSlider === "music") setVolumeFromPointer(controls.musicSlider, point, gameAudio.setMusicVolume);
    else setVolumeFromPointer(controls.effectsSlider, point, gameAudio.setEffectsVolume);
  });

  canvas.addEventListener("pointerup", () => { activeVolumeSlider = null; });
  canvas.addEventListener("pointercancel", () => { activeVolumeSlider = null; });

  window.addEventListener("keydown", event => {
    if (event.target === nameInput) return;
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    if (mode === "gameover") {
      event.preventDefault();
      if (key === "Enter") saveScore();
      else if (key === "r") resetGame();
      else if (key === "m") returnToMenu();
      else if (!scoreSaved && key === "Backspace") playerName = playerName.slice(0, -1);
      else if (!scoreSaved && playerName.length < 20 && /^[\p{L}\p{N} _.'-]$/u.test(key)) playerName += key;
      return;
    }
    if (key === "f") {
      toggleFullscreen();
      return;
    }
    if (mode === "menu") return;
    if (mode === "options") {
      if (key === "Escape") mode = "menu";
      return;
    }
    if (mode === "ranking") {
      if (key === "Escape") returnToMenu();
      return;
    }
    if (mode === "transition") return;
    if (["ArrowLeft", "ArrowRight", " "].includes(key)) event.preventDefault();
    keys.add(key);
    if ((key === " " || key === "j") && !event.repeat) attack();
  });
  nameInput.addEventListener("input", () => {
    playerName = nameInput.value.slice(0, 20);
  });
  nameInput.addEventListener("keydown", event => {
    if (mode === "gameover" && event.key === "Enter") {
      event.preventDefault();
      saveScore();
    }
  });
  window.addEventListener("keyup", event => keys.delete(event.key.length === 1 ? event.key.toLowerCase() : event.key));
  window.addEventListener("blur", () => keys.clear());
  window.addEventListener("resize", resize);
  document.addEventListener("fullscreenchange", resize);

  resize();
  requestAnimationFrame(frame);
})();