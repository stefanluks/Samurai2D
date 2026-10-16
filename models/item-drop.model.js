(() => {
  "use strict";

  const catalog = {
    heart: {
      color: "#e85b63",
      weight: 1.2,
      apply(player, config) {
        if (player.lives >= config.maxLives) return false;
        player.lives++;
        return true;
      }
    },
    agility: {
      color: "#68dfcc",
      weight: 1,
      apply(player, config) {
        player.effects.agility = config.itemEffectDuration;
        return true;
      }
    },
    emerald: {
      color: "#69e584",
      weight: 1,
      apply(player, config) {
        player.effects.emerald = config.itemEffectDuration;
        return true;
      }
    },
    midnight: {
      color: "#a18aff",
      weight: 1,
      apply(player, config) {
        player.effects.midnight = config.itemEffectDuration;
        return true;
      }
    }
  };

  class ItemDropSystem {
    static create(x, groundY, player, config) {
      if (Math.random() >= config.itemDropChance) return null;

      const available = Object.entries(catalog).filter(([type]) =>
        type !== "heart" || player.lives < config.maxLives
      );
      const totalWeight = available.reduce((total, [, item]) => total + item.weight, 0);
      let roll = Math.random() * totalWeight;
      let type = available[0][0];
      for (const [candidate, item] of available) {
        roll -= item.weight;
        if (roll <= 0) {
          type = candidate;
          break;
        }
      }

      return {
        type,
        x,
        groundY,
        age: 0,
        lifetime: config.itemLifetime,
        phase: Math.random() * Math.PI * 2
      };
    }

    static update(item, delta) {
      item.age += delta;
      item.lifetime -= delta;
      return item.lifetime > 0;
    }

    static collect(item, player, config) {
      const definition = catalog[item.type];
      return definition && definition.apply(player, config) ? item.type : null;
    }

    static draw(context, item) {
      const definition = catalog[item.type];
      const bob = Math.sin(item.age * 4 + item.phase) * 2;
      const centerY = item.groundY - 17 + bob;
      const fade = item.lifetime < 2 ? 0.45 + Math.sin(item.age * 22) * 0.3 : 1;

      context.save();
      context.globalAlpha = fade;
      context.fillStyle = "rgba(54, 39, 30, .2)";
      context.beginPath();
      context.ellipse(item.x, item.groundY - 1, 15, 4, 0, 0, Math.PI * 2);
      context.fill();

      context.fillStyle = `${definition.color}33`;
      context.beginPath();
      context.arc(item.x, centerY, 17, 0, Math.PI * 2);
      context.fill();

      if (item.type === "heart") {
        context.fillStyle = definition.color;
        context.strokeStyle = "#fff0d2";
        context.lineWidth = 1.5;
        context.beginPath();
        context.moveTo(item.x, centerY + 9);
        context.bezierCurveTo(item.x - 18, centerY - 2, item.x - 9, centerY - 15, item.x, centerY - 7);
        context.bezierCurveTo(item.x + 9, centerY - 15, item.x + 18, centerY - 2, item.x, centerY + 9);
        context.fill();
        context.stroke();
      } else {
        context.fillStyle = "#dce7e1";
        context.strokeStyle = "#43534d";
        context.lineWidth = 1.5;
        context.beginPath();
        context.roundRect(item.x - 8, centerY - 9, 16, 21, 4);
        context.fill();
        context.stroke();
        context.fillStyle = definition.color;
        context.beginPath();
        context.roundRect(item.x - 6, centerY, 12, 9, [1, 1, 3, 3]);
        context.fill();
        context.fillStyle = "#f0cf88";
        context.fillRect(item.x - 4, centerY - 14, 8, 5);
        context.strokeStyle = "#f8e8bf";
        context.lineWidth = 1;
        context.strokeRect(item.x - 5, centerY - 16, 10, 3);
      }
      context.restore();
    }
  }

  window.ItemDropSystem = ItemDropSystem;
})();