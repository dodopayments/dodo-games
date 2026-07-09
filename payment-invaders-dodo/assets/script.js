/* ==========================================================================
 * PAYMENT INVADERS — Space-Invaders-style gateway defense.
 * Vanilla JS. DPI-aware canvas, game-feel via window.DodoJuice (audio synth,
 * particles, screenshake, floatText, haptics, highscore migration).
 * Analytics via window.DodoAnalytics (game_name frozen as "Payment Invaders").
 * ========================================================================== */
(function () {
  'use strict';

  var J = (typeof window.DodoJuice !== 'undefined') ? window.DodoJuice : null;
  var GAME_NAME = 'Payment Invaders';

  /* Logical (design) resolution. All gameplay math is in this space; the canvas
     backing store is scaled to CSS-size x devicePixelRatio for crisp retina. */
  var GAME_W = 800, GAME_H = 600;

  var canvas = document.getElementById('gameCanvas');
  var ctx = canvas.getContext('2d');

  /* ---- juice helpers (route harness-visible signals through DodoJuice) ---- */
  function sfx(name, opts) { if (J && J.audio) J.audio.play(name, opts); }
  function emit(preset, x, y, opts) { if (J && J.particles) J.particles.emit(preset, x, y, opts); }
  function shakeScreen(intensity, ms) { if (J && J.shake) J.shake(canvas, intensity, ms); }

  /* DodoJuice.floatText uses viewport coords — map logical -> CSS -> viewport. */
  function floatText(lx, ly, text, color) {
    if (!J || !J.floatText) return;
    var r = canvas.getBoundingClientRect();
    var sx = r.width / GAME_W, sy = r.height / GAME_H;
    J.floatText(r.left + lx * sx, r.top + ly * sy, text, { color: color || '#C1FF00', size: 18 });
  }

  /* ---- DPI-aware, responsive canvas sizing -------------------------------- */
  function resizeCanvas() {
    var dpr = window.devicePixelRatio || 1;
    var coarse = window.matchMedia && window.matchMedia('(max-width: 820px), (pointer: coarse)').matches;
    var reservedTop = 74;                    // stats bar + top corner controls
    var reservedBottom = coarse ? 150 : 64;  // D-pad on touch devices
    var availW = Math.max(240, window.innerWidth - 24);
    var availH = Math.max(280, window.innerHeight - reservedTop - reservedBottom);
    var aspect = GAME_W / GAME_H;            // 4:3
    var cssW = Math.min(availW, availH * aspect);
    var cssH = cssW / aspect;
    if (cssH > availH) { cssH = availH; cssW = cssH * aspect; }
    cssW = Math.max(240, Math.floor(cssW));
    cssH = Math.floor(cssW / aspect);

    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    // Map the GAME_W x GAME_H logical space onto the physical backing store.
    ctx.setTransform(canvas.width / GAME_W, 0, 0, canvas.height / GAME_H, 0, 0);
  }
  window.addEventListener('resize', resizeCanvas);
  window.addEventListener('orientationchange', function () { setTimeout(resizeCanvas, 150); });

  /* ==========================================================================
   * GAME STATE
   * ========================================================================== */
  var hs = (J && J.highscore) ? J.highscore('payment-invaders-dodo', ['paymentInvadersHighScore']) : null;

  var game = {
    state: 'menu', // menu | playing | paused | gameOver
    score: 0,
    highScore: hs ? hs.get() : (parseInt(localStorage.getItem('paymentInvadersHighScore'), 10) || 0),
    wave: 1,
    lives: 3,
    combo: 1,
    comboTimer: 0,
    shieldEnergy: 100,
    kycEnergy: 100,
    shieldActive: false,
    shieldTimer: 0,
    stats: { chargebacks: 0, fraudsters: 0, bugs: 0, bosses: 0 },
    achievements: [],
    slogans: [
      '🔒 Encrypted with 256-bit AES!', '💳 PCI DSS Level 1 Compliant!',
      '🚀 99.99% Uptime Guaranteed!', '🛡️ Real-time Fraud Detection!',
      '⚡ Instant Payment Processing!', '🌍 200+ Countries Supported!',
      '🔐 2FA Enabled Successfully!', '✅ KYC Verification Complete!',
      '💎 Premium Security Active!', '🎯 Zero-tolerance Fraud Policy!'
    ],
    currentSlogan: '',
    sloganTimer: 0
  };

  var testEndless = false; // test-only: disables damage/game-over during scripted play

  var player = null;
  var enemies = [];
  var bullets = [];
  var enemyBullets = [];
  var powerUps = [];
  var stars = [];

  var keys = {};
  var enemyDirection = 1;
  var enemySpeed = 1;

  function initStars() {
    stars = [];
    for (var i = 0; i < 90; i++) {
      stars.push({
        x: Math.random() * GAME_W,
        y: Math.random() * GAME_H,
        size: Math.random() * 2 + 0.5,
        speed: Math.random() * 1 + 0.5,
        color: ['#a855f7', '#ec4899', '#84cc16', '#ffffff'][(Math.random() * 4) | 0]
      });
    }
  }

  /* ==========================================================================
   * ENTITIES
   * ========================================================================== */
  function Player() {
    this.width = 60;
    this.height = 40;
    this.x = GAME_W / 2 - this.width / 2;
    this.y = GAME_H - 80;
    this.speed = 6;
    this.shootCooldown = 0;
    this.kycCooldown = 0;
    this.invulnerable = 0;
  }
  Player.prototype.draw = function () {
    ctx.save();
    if (this.invulnerable > 0 && Math.floor(this.invulnerable / 5) % 2 === 0) ctx.globalAlpha = 0.5;

    if (game.shieldActive) {
      ctx.beginPath();
      ctx.arc(this.x + this.width / 2, this.y + this.height / 2, 45, 0, Math.PI * 2);
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3;
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#22c55e';
      ctx.stroke();
    }

    var grad = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.height);
    grad.addColorStop(0, '#a855f7');
    grad.addColorStop(0.5, '#ec4899');
    grad.addColorStop(1, '#7c3aed');
    ctx.fillStyle = grad;
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#a855f7';
    ctx.beginPath();
    ctx.moveTo(this.x + this.width / 2, this.y);
    ctx.lineTo(this.x + this.width, this.y + this.height);
    ctx.lineTo(this.x + this.width - 10, this.y + this.height);
    ctx.lineTo(this.x + this.width / 2, this.y + this.height - 15);
    ctx.lineTo(this.x + 10, this.y + this.height);
    ctx.lineTo(this.x, this.y + this.height);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#22d3ee';
    ctx.shadowColor = '#22d3ee';
    ctx.beginPath();
    ctx.ellipse(this.x + this.width / 2, this.y + 15, 8, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f97316';
    ctx.shadowColor = '#f97316';
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.ellipse(this.x + this.width / 2, this.y + this.height + 5, 8 + Math.random() * 3, 12 + Math.random() * 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };
  Player.prototype.update = function () {
    if (keys['ArrowLeft'] || keys['a']) this.x -= this.speed;
    if (keys['ArrowRight'] || keys['d']) this.x += this.speed;
    this.x = Math.max(0, Math.min(GAME_W - this.width, this.x));
    if (this.shootCooldown > 0) this.shootCooldown--;
    if (this.kycCooldown > 0) this.kycCooldown--;
    if (this.invulnerable > 0) this.invulnerable--;
  };
  Player.prototype.shoot = function () {
    if (this.shootCooldown > 0) return;
    this.shootCooldown = 12;
    bullets.push(new Bullet(this.x + this.width / 2 - 3, this.y, 0, -12, 'normal'));
    sfx('tap', { pitch: 1.15, volume: 0.7 });
  };
  Player.prototype.kycShoot = function () {
    if (this.kycCooldown > 0 || game.kycEnergy < 25) return;
    this.kycCooldown = 30;
    game.kycEnergy -= 25;
    for (var angle = -30; angle <= 30; angle += 15) {
      var rad = angle * Math.PI / 180;
      bullets.push(new Bullet(this.x + this.width / 2 - 3, this.y, Math.sin(rad) * 8, Math.cos(rad) * -10, 'kyc'));
    }
    sfx('tap', { pitch: 0.72, volume: 0.85 });
  };
  Player.prototype.activateShield = function () {
    if (game.shieldEnergy < 30 || game.shieldActive) return;
    game.shieldActive = true;
    game.shieldTimer = 180;
    game.shieldEnergy -= 30;
    sfx('powerup', { pitch: 0.8, volume: 0.7 });
    emit('sparkle', this.x + this.width / 2, this.y + this.height / 2, { count: 12, color: '#22c55e' });
  };

  function Bullet(x, y, vx, vy, type) {
    this.x = x; this.y = y; this.vx = vx; this.vy = vy; this.type = type;
    this.width = type === 'kyc' ? 8 : 6;
    this.height = type === 'kyc' ? 15 : 20;
  }
  Bullet.prototype.draw = function () {
    ctx.save();
    var grad = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.height);
    if (this.type === 'kyc') {
      grad.addColorStop(0, '#f97316'); grad.addColorStop(1, '#eab308');
      ctx.shadowColor = '#f97316';
    } else {
      grad.addColorStop(0, '#84cc16'); grad.addColorStop(1, '#22c55e');
      ctx.shadowColor = '#84cc16';
    }
    ctx.fillStyle = grad;
    ctx.shadowBlur = 15;
    ctx.fillRect(this.x, this.y, this.width, this.height);
    ctx.restore();
  };
  Bullet.prototype.update = function () { this.x += this.vx; this.y += this.vy; };

  function EnemyBullet(x, y, vx, vy) {
    this.x = x; this.y = y; this.vx = vx; this.vy = vy; this.width = 8; this.height = 8;
  }
  EnemyBullet.prototype.draw = function () {
    ctx.save();
    ctx.fillStyle = '#ef4444';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#ef4444';
    ctx.beginPath();
    ctx.arc(this.x + 4, this.y + 4, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };
  EnemyBullet.prototype.update = function () { this.x += this.vx; this.y += this.vy; };

  var ENEMY_TYPES = {
    chargeback: { width: 40, height: 35, health: 1, score: 100, color1: '#ef4444', color2: '#dc2626', shootChance: 0.002, symbol: '💸' },
    fraudster: { width: 45, height: 40, health: 2, score: 250, color1: '#f97316', color2: '#ea580c', shootChance: 0.004, symbol: '🎭' },
    bug: { width: 35, height: 30, health: 1, score: 150, color1: '#eab308', color2: '#ca8a04', shootChance: 0.003, symbol: '🐛' },
    shielded: { width: 48, height: 42, health: 3, score: 350, color1: '#14b8a6', color2: '#0d9488', shootChance: 0.005, symbol: '🛡️' },
    boss: { width: 100, height: 80, health: 38, score: 5000, color1: '#7c3aed', color2: '#6d28d9', shootChance: 0.014, symbol: '☠️' }
  };
  var FLANK_VX = 1.6; // |bullet.vx| above this counts as a flank (spread) shot

  function Enemy(x, y, type) {
    var cfg = ENEMY_TYPES[type];
    this.type = type;
    this.width = cfg.width; this.height = cfg.height;
    this.x = x; this.y = y;
    this.health = cfg.health; this.maxHealth = cfg.health;
    this.score = cfg.score;
    this.color1 = cfg.color1; this.color2 = cfg.color2;
    this.shootChance = cfg.shootChance; this.symbol = cfg.symbol;
    this.animOffset = Math.random() * Math.PI * 2;
    this.bob = 0;
    // shielded-fraudster telegraph state: shield up ~4s, drops ~1.3s
    this.shieldUp = type === 'shielded';
    this.shieldCycle = 240;
  }
  Enemy.prototype.draw = function () {
    ctx.save();
    var wobble = Math.sin(Date.now() / 200 + this.animOffset) * 3;
    var grad = ctx.createRadialGradient(
      this.x + this.width / 2, this.y + this.height / 2, 0,
      this.x + this.width / 2, this.y + this.height / 2, this.width / 2);
    grad.addColorStop(0, this.color1);
    grad.addColorStop(1, this.color2);
    ctx.fillStyle = grad;
    ctx.shadowBlur = 15;
    ctx.shadowColor = this.color1;

    if (this.type === 'boss') {
      ctx.beginPath();
      ctx.ellipse(this.x + this.width / 2, this.y + this.height / 2 + this.bob, this.width / 2, this.height / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ef4444'; ctx.shadowColor = '#ef4444'; ctx.shadowBlur = 20;
      ctx.beginPath(); ctx.ellipse(this.x + this.width / 3, this.y + this.height / 2.5, 10, 8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(this.x + this.width * 2 / 3, this.y + this.height / 2.5, 10, 8, 0, 0, Math.PI * 2); ctx.fill();
      var bw = 84, bh = 8, bx = this.x + this.width / 2 - bw / 2, by = this.y - 16;
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#333'; ctx.fillRect(bx, by, bw, bh);
      ctx.fillStyle = '#22c55e'; ctx.fillRect(bx, by, bw * (this.health / this.maxHealth), bh);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.strokeRect(bx, by, bw, bh);
    } else {
      ctx.fillRect(this.x + 5, this.y + 5 + wobble, this.width - 10, this.height - 15);
      ctx.fillRect(this.x + 8, this.y + wobble, 6, 8);
      ctx.fillRect(this.x + this.width - 14, this.y + wobble, 6, 8);
      ctx.fillRect(this.x, this.y + this.height - 10 + wobble, 8, 10);
      ctx.fillRect(this.x + this.width - 8, this.y + this.height - 10 + wobble, 8, 10);
      ctx.fillStyle = '#ffffff'; ctx.shadowBlur = 5;
      ctx.fillRect(this.x + 10, this.y + 12 + wobble, 6, 6);
      ctx.fillRect(this.x + this.width - 16, this.y + 12 + wobble, 6, 6);

      // Front shield (faces the player, along the bottom edge).
      if (this.type === 'shielded' && this.shieldUp) {
        var about = this.shieldCycle < 40; // telegraph: pulse warn just before drop
        ctx.shadowBlur = 16;
        ctx.shadowColor = about ? '#facc15' : '#5eead4';
        ctx.strokeStyle = about ? '#facc15' : '#5eead4';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(this.x + this.width / 2, this.y + this.height + 3 + wobble, this.width / 2 + 3, Math.PI * 0.12, Math.PI * 0.88);
        ctx.stroke();
      }
    }
    ctx.restore();
  };
  Enemy.prototype.update = function (direction, speed) {
    this.x += direction * speed;
    if (this.type === 'boss') this.bob = Math.sin(Date.now() / 300) * 6;
    if (this.type === 'shielded') {
      this.shieldCycle--;
      if (this.shieldCycle <= 0) {
        this.shieldUp = !this.shieldUp;
        this.shieldCycle = this.shieldUp ? 240 : 80;
      }
    }
    if (Math.random() < this.shootChance) this.shoot();
  };
  Enemy.prototype.shoot = function () {
    if (this.type === 'boss') {
      for (var i = -1; i <= 1; i++) {
        enemyBullets.push(new EnemyBullet(this.x + this.width / 2 - 4 + i * 22, this.y + this.height, i * 0.8, 4));
      }
    } else {
      enemyBullets.push(new EnemyBullet(this.x + this.width / 2 - 4, this.y + this.height, 0, 5));
    }
  };
  Enemy.prototype.hit = function (dmg) { this.health -= (dmg || 1); return this.health <= 0; };

  var POWERUP_TYPES = {
    ssl: { color: '#22c55e', symbol: '🔐', effect: 'shield', label: 'SSL Certificate' },
    encryption: { color: '#3b82f6', symbol: '🔑', effect: 'rapidFire', label: 'Encryption Key' },
    compliance: { color: '#eab308', symbol: '⭐', effect: 'scoreMultiplier', label: 'Compliance Boost' },
    life: { color: '#ef4444', symbol: '❤️', effect: 'life', label: 'Extra Gateway' }
  };
  function PowerUp(x, y, type) {
    this.type = type; this.x = x; this.y = y; this.width = 30; this.height = 30;
    this.vy = 2; this.config = POWERUP_TYPES[type]; this.rotation = 0;
  }
  PowerUp.prototype.draw = function () {
    ctx.save();
    ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
    this.rotation += 0.05;
    ctx.shadowBlur = 20; ctx.shadowColor = this.config.color;
    ctx.fillStyle = this.config.color + '40';
    ctx.beginPath();
    ctx.arc(0, 0, 18 + Math.sin(Date.now() / 200) * 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = this.config.color; ctx.lineWidth = 2; ctx.stroke();
    ctx.font = '18px system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(this.config.symbol, 0, 0);
    ctx.restore();
  };
  PowerUp.prototype.update = function () { this.y += this.vy; };

  /* ==========================================================================
   * WAVES
   * ========================================================================== */
  function spawnWave() {
    enemies = [];
    var isBoss = game.wave % 5 === 0;
    if (isBoss) {
      bossAlertFx();
      showSlogan('⚠️ MEGA BREACH DETECTED! ⚠️');
      enemies.push(new Enemy(GAME_W / 2 - 50, 50, 'boss'));
      var minions = Math.min(Math.floor(game.wave / 5), 3);
      for (var i = 0; i < minions; i++) enemies.push(new Enemy(120 + i * 180, 160, 'fraudster'));
    } else {
      var rows = Math.min(3 + Math.floor(game.wave / 3), 6);
      var cols = Math.min(6 + Math.floor(game.wave / 2), 10);
      for (var row = 0; row < rows; row++) {
        for (var col = 0; col < cols; col++) {
          var type;
          if (row === 0) type = (game.wave >= 3 && col % 2 === 0) ? 'shielded' : 'fraudster';
          else if (row === 1) type = Math.random() < 0.5 ? 'bug' : 'chargeback';
          else type = 'chargeback';
          enemies.push(new Enemy(80 + col * 65, 50 + row * 50, type));
        }
      }
      showSlogan(game.slogans[(Math.random() * game.slogans.length) | 0]);
    }
  }

  /* ==========================================================================
   * COLLISIONS + REWARDS
   * ========================================================================== */
  function rectCollision(a, b) {
    return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
  }

  // A destroyed enemy: particles, score+combo, stats, powerup drop, audio, shake.
  function killEnemy(enemy) {
    var ex = enemy.x + enemy.width / 2, ey = enemy.y + enemy.height / 2;
    emit('explosion', ex, ey, { count: enemy.type === 'boss' ? 40 : 16, color: enemy.color1 });
    emit('burst', ex, ey, { count: 8, color: '#ffffff' });

    var points = Math.floor(enemy.score * game.combo);
    game.score += points;
    floatText(ex, enemy.y - 4, '+' + points, game.combo > 1.4 ? '#C1FF00' : '#ffffff');
    game.comboTimer = 120;
    game.combo = Math.min(game.combo + 0.1, 5);

    if (enemy.type === 'chargeback') game.stats.chargebacks++;
    else if (enemy.type === 'fraudster' || enemy.type === 'shielded') game.stats.fraudsters++;
    else if (enemy.type === 'bug') game.stats.bugs++;
    else if (enemy.type === 'boss') game.stats.bosses++;

    if (Math.random() < 0.1 || enemy.type === 'boss') {
      var types = Object.keys(POWERUP_TYPES);
      powerUps.push(new PowerUp(enemy.x, enemy.y, types[(Math.random() * types.length) | 0]));
    }

    var idx = enemies.indexOf(enemy);
    if (idx >= 0) enemies.splice(idx, 1);

    sfx('hit', { pitch: enemy.type === 'boss' ? 0.7 : 1 });
    shakeScreen(enemy.type === 'boss' ? 14 : 4, enemy.type === 'boss' ? 320 : 130);
    if (J && J.haptics) J.haptics.tap();
    checkAchievements();
    updateUI();
  }

  // A non-lethal graze: small feedback (front-shield block or partial damage).
  function grazeEnemy(enemy, blocked) {
    var gx = enemy.x + enemy.width / 2, gy = enemy.y + enemy.height + 2;
    emit(blocked ? 'sparkle' : 'burst', gx, gy, { count: blocked ? 6 : 5, color: blocked ? '#5eead4' : '#ffffff' });
    sfx('tick', { pitch: blocked ? 1.5 : 1.2, volume: 0.6 });
  }

  function checkCollisions() {
    // Player bullets vs enemies (with shielded-fraudster front-shield logic)
    for (var i = bullets.length - 1; i >= 0; i--) {
      var bullet = bullets[i];
      for (var j = enemies.length - 1; j >= 0; j--) {
        var enemy = enemies[j];
        if (!rectCollision(bullet, enemy)) continue;

        // Shielded fraudster: front shield blocks FRONTAL shots while raised.
        if (enemy.type === 'shielded' && enemy.shieldUp && Math.abs(bullet.vx) < FLANK_VX) {
          bullets.splice(i, 1);
          grazeEnemy(enemy, true); // blocked — must flank (spread) or wait for the shield-drop
          break;
        }

        bullets.splice(i, 1);
        if (enemy.hit(bullet.type === 'kyc' ? 1 : 1)) killEnemy(enemy);
        else grazeEnemy(enemy, false);
        break;
      }
    }

    if (testEndless) { collectPowerUps(); return; }

    // Enemy bullets vs player
    if (player.invulnerable <= 0) {
      for (var k = enemyBullets.length - 1; k >= 0; k--) {
        if (rectCollision(enemyBullets[k], player)) {
          enemyBullets.splice(k, 1);
          if (!game.shieldActive) playerHit();
          else { emit('sparkle', player.x + player.width / 2, player.y, { count: 8, color: '#22c55e' }); sfx('tick'); }
        }
      }
    }

    // Enemies reaching the player line
    for (var m = 0; m < enemies.length; m++) {
      if (enemies[m].y + enemies[m].height >= player.y) { playerHit(); break; }
    }

    collectPowerUps();
  }

  function collectPowerUps() {
    for (var i = powerUps.length - 1; i >= 0; i--) {
      if (rectCollision(powerUps[i], player)) { applyPowerUp(powerUps[i]); powerUps.splice(i, 1); }
    }
  }

  function playerHit() {
    emit('explosion', player.x + player.width / 2, player.y + player.height / 2, { count: 22, color: '#ec4899' });
    sfx('fail');
    shakeScreen(18, 300);
    if (J && J.haptics) J.haptics.fail();
    if (testEndless) { player.invulnerable = 60; return; } // no life loss during scripted play
    game.lives--;
    player.invulnerable = 120;
    game.combo = 1;
    updateUI();
    if (game.lives <= 0) gameOver();
  }

  function applyPowerUp(pu) {
    sfx('powerup');
    emit('sparkle', player.x + player.width / 2, player.y, { count: 16, color: pu.config.color });
    floatText(player.x + player.width / 2, player.y - 20, pu.config.label + '!', pu.config.color);
    switch (pu.config.effect) {
      case 'shield': game.shieldEnergy = Math.min(100, game.shieldEnergy + 50); break;
      case 'rapidFire': player.shootCooldown = 0; game.kycEnergy = Math.min(100, game.kycEnergy + 40); break;
      case 'scoreMultiplier': game.combo = Math.min(5, game.combo + 1); break;
      case 'life': game.lives = Math.min(5, game.lives + 1); break;
    }
    if (typeof DodoAnalytics !== 'undefined') DodoAnalytics.powerUp(GAME_NAME, pu.config.label);
    showSlogan('⬆️ ' + pu.config.label + ' Acquired!');
    updateUI();
  }

  /* Wave-clear celebration (juice + audio + analytics). Called on real clear
     and by the test pulse (deterministic 'combo' cue). */
  function awardWaveFx() {
    sfx('combo');
    emit('confetti', GAME_W / 2, GAME_H * 0.4, { count: 20 });
    shakeScreen(4, 120);
    if (typeof DodoAnalytics !== 'undefined') DodoAnalytics.waveComplete(GAME_NAME, game.wave);
  }

  function bossAlertFx() {
    sfx('whoosh');
    shakeScreen(8, 220);
  }

  /* ==========================================================================
   * ACHIEVEMENTS (da-toast transitions, no raw setTimeout DOM swap)
   * ========================================================================== */
  var ACHIEVEMENTS = {
    firstBlood: { name: 'First Blood', desc: 'Destroy your first threat', check: function () { return game.stats.chargebacks + game.stats.fraudsters + game.stats.bugs > 0; } },
    fraudHunter: { name: 'Fraud Hunter', desc: 'Destroy 10 fraudsters', check: function () { return game.stats.fraudsters >= 10; } },
    bossSlayer: { name: 'Boss Slayer', desc: 'Defeat a Mega Breach', check: function () { return game.stats.bosses >= 1; } },
    comboMaster: { name: 'Combo Master', desc: 'Reach 5x combo', check: function () { return game.combo >= 5; } },
    wave10: { name: 'Gateway Defender', desc: 'Reach wave 10', check: function () { return game.wave >= 10; } },
    score10k: { name: 'High Roller', desc: 'Score 10,000 points', check: function () { return game.score >= 10000; } }
  };
  function checkAchievements() {
    for (var key in ACHIEVEMENTS) {
      if (!ACHIEVEMENTS.hasOwnProperty(key)) continue;
      if (game.achievements.indexOf(key) === -1 && ACHIEVEMENTS[key].check()) {
        game.achievements.push(key);
        showAchievement(ACHIEVEMENTS[key]);
      }
    }
  }
  function showAchievement(a) {
    var c = document.getElementById('achievementContainer');
    if (!c) return;
    var el = document.createElement('div');
    el.className = 'pi-toast'; // enters via da-slide-in keyframe (dodo-arcade.css)
    var eye = document.createElement('span'); eye.className = 'pi-toast__eyebrow'; eye.textContent = '🏆 Achievement Unlocked';
    var name = document.createElement('span'); name.className = 'pi-toast__name'; name.textContent = a.name;
    var desc = document.createElement('span'); desc.className = 'pi-toast__desc'; desc.textContent = a.desc;
    el.appendChild(eye); el.appendChild(name); el.appendChild(desc);
    c.appendChild(el);
    if (J && J.haptics) J.haptics.success();
    // Leave via CSS transition (.is-leaving), then remove on transitionend.
    setTimeout(function () {
      el.classList.add('is-leaving');
      var done = function () { if (el.parentNode) el.parentNode.removeChild(el); };
      el.addEventListener('transitionend', done, { once: true });
      setTimeout(done, 420);
    }, 3000);
  }

  /* ==========================================================================
   * SLOGANS (in-canvas ticker)
   * ========================================================================== */
  function showSlogan(text) { game.currentSlogan = text; game.sloganTimer = 180; }
  function drawSlogan() {
    if (game.sloganTimer <= 0) return;
    var alpha = Math.min(1, game.sloganTimer / 60);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = '700 16px ' + 'ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#84cc16';
    ctx.shadowBlur = 10; ctx.shadowColor = '#84cc16';
    ctx.fillText(game.currentSlogan, GAME_W / 2, 30);
    ctx.restore();
  }

  /* ==========================================================================
   * UPDATE + RENDER
   * ========================================================================== */
  function update() {
    player.update();
    if (keys[' '] || keys['Space']) player.shoot();
    if (keys['z'] || keys['Z']) player.kycShoot();
    if (keys['x'] || keys['X']) player.activateShield();

    if (game.shieldActive) { game.shieldTimer--; if (game.shieldTimer <= 0) game.shieldActive = false; }
    game.shieldEnergy = Math.min(100, game.shieldEnergy + 0.05);
    game.kycEnergy = Math.min(100, game.kycEnergy + 0.1);

    if (game.comboTimer > 0) game.comboTimer--;
    else game.combo = Math.max(1, game.combo - 0.01);
    if (game.sloganTimer > 0) game.sloganTimer--;

    bullets.forEach(function (b) { b.update(); });
    bullets = bullets.filter(function (b) { return b.y > -50 && b.y < GAME_H + 50 && b.x > -50 && b.x < GAME_W + 50; });
    enemyBullets.forEach(function (b) { b.update(); });
    enemyBullets = enemyBullets.filter(function (b) { return b.y < GAME_H + 50; });

    var needsReverse = false;
    enemies.forEach(function (e) {
      e.update(enemyDirection, enemySpeed);
      if (e.x <= 0 || e.x + e.width >= GAME_W) needsReverse = true;
    });
    if (needsReverse) {
      enemyDirection *= -1;
      enemies.forEach(function (e) {
        e.y += 15;
        if (testEndless && e.y > GAME_H - 120) e.y = 40; // keep the scripted demo on-screen
      });
    }

    powerUps.forEach(function (p) { p.update(); });
    powerUps = powerUps.filter(function (p) { return p.y < GAME_H + 50; });

    stars.forEach(function (s) { s.y += s.speed; if (s.y > GAME_H) { s.y = 0; s.x = Math.random() * GAME_W; } });

    checkCollisions();

    if (enemies.length === 0) {
      game.wave++;
      enemySpeed = 1 + game.wave * 0.1;
      awardWaveFx();
      spawnWave();
    }
    updateUI();
  }

  function render() {
    ctx.clearRect(0, 0, GAME_W, GAME_H);
    ctx.fillStyle = '#0a0412';
    ctx.fillRect(0, 0, GAME_W, GAME_H);

    // starfield
    ctx.globalAlpha = 0.6;
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      ctx.fillStyle = s.color;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // subtle grid
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.08)';
    ctx.lineWidth = 1;
    for (var gx = 0; gx < GAME_W; gx += 40) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, GAME_H); ctx.stroke(); }
    for (var gy = 0; gy < GAME_H; gy += 40) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(GAME_W, gy); ctx.stroke(); }

    if (!player) return; // menu: canvas hidden, nothing to render

    powerUps.forEach(function (p) { p.draw(); });
    bullets.forEach(function (b) { b.draw(); });
    enemyBullets.forEach(function (b) { b.draw(); });
    enemies.forEach(function (e) { e.draw(); });
    player.draw();

    if (J && J.particles) J.particles.draw(ctx); // juice rendered into our own ctx

    drawSlogan();

    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.font = '10px ui-monospace, monospace';
    ctx.fillStyle = '#a855f7';
    ctx.textAlign = 'right';
    ctx.fillText('Secured by DodoPay™', GAME_W - 10, GAME_H - 10);
    ctx.restore();
  }

  function updateUI() {
    document.getElementById('scoreDisplay').textContent = game.score.toLocaleString();
    document.getElementById('waveDisplay').textContent = game.wave;
    document.getElementById('comboDisplay').textContent = 'x' + game.combo.toFixed(1);
    document.getElementById('livesDisplay').textContent = '❤️'.repeat(Math.max(0, game.lives));
    document.getElementById('shieldBar').style.width = game.shieldEnergy + '%';
    document.getElementById('kycBar').style.width = game.kycEnergy + '%';
  }

  /* ==========================================================================
   * MAIN LOOP (persistent; particles run on a real dt)
   * ========================================================================== */
  var lastTs = 0;
  function frame(ts) {
    var dt = lastTs ? (ts - lastTs) / 1000 : 0.016;
    lastTs = ts;
    if (dt > 0.05) dt = 0.05;
    if (J && J.particles) J.particles.update(dt);
    if (game.state === 'playing') update();
    render();
    requestAnimationFrame(frame);
  }

  /* ==========================================================================
   * STATE MANAGEMENT
   * ========================================================================== */
  function startGame() {
    game.state = 'playing';
    game.score = 0; game.wave = 1; game.lives = 3;
    game.combo = 1; game.comboTimer = 0;
    game.shieldEnergy = 100; game.kycEnergy = 100; game.shieldActive = false;
    game.stats = { chargebacks: 0, fraudsters: 0, bugs: 0, bosses: 0 };
    game.achievements = [];
    testEndless = false;

    player = new Player();
    enemies = []; bullets = []; enemyBullets = []; powerUps = [];
    enemyDirection = 1; enemySpeed = 1;
    if (J && J.particles) J.particles.clear();

    initStars();
    spawnWave();

    document.getElementById('menuOverlay').style.display = 'none';
    document.getElementById('gameOverOverlay').style.display = 'none';
    document.getElementById('pauseOverlay').style.display = 'none';
    document.getElementById('gameContainer').style.display = 'flex';

    resizeCanvas();
    updateUI();

    if (typeof DodoAnalytics !== 'undefined') DodoAnalytics.gameStart(GAME_NAME);
  }

  function gameOver() {
    if (game.state === 'gameOver') return;
    game.state = 'gameOver';

    var isNew = game.score > game.highScore;
    if (hs) { hs.set(game.score); game.highScore = hs.get(); }
    else if (isNew) { game.highScore = game.score; try { localStorage.setItem('paymentInvadersHighScore', String(game.highScore)); } catch (e) {} }

    sfx('gameover');
    emit('explosion', GAME_W / 2, GAME_H * 0.5, { count: 34, color: '#ec4899' });
    shakeScreen(16, 400);

    document.getElementById('finalScore').textContent = game.score.toLocaleString();
    document.getElementById('finalWave').textContent = game.wave;
    document.getElementById('statChargebacks').textContent = game.stats.chargebacks;
    document.getElementById('statFraudsters').textContent = game.stats.fraudsters;
    document.getElementById('statBugs').textContent = game.stats.bugs;
    document.getElementById('statBosses').textContent = game.stats.bosses;
    document.getElementById('menuHighScore').textContent = game.highScore.toLocaleString();

    if (typeof DodoAnalytics !== 'undefined') {
      DodoAnalytics.gameOver(GAME_NAME, game.score, { wave: game.wave, chargebacks: game.stats.chargebacks, fraudsters: game.stats.fraudsters, bugs: game.stats.bugs, bosses: game.stats.bosses });
      if (isNew) DodoAnalytics.newHighScore(GAME_NAME, game.score);
    }

    var messages = [
      'Your payment system has been compromised!', 'The fraudsters have won this round...',
      'Gateway offline! Time to reboot!', 'Security breach detected!', 'Transaction failed! Try again?'
    ];
    document.getElementById('gameOverMessage').textContent = messages[(Math.random() * messages.length) | 0];
    document.getElementById('gameOverOverlay').style.display = 'flex';
  }

  function togglePause() {
    if (game.state === 'playing') {
      game.state = 'paused';
      document.getElementById('pauseOverlay').style.display = 'flex';
    } else if (game.state === 'paused') {
      game.state = 'playing';
      document.getElementById('pauseOverlay').style.display = 'none';
    }
  }

  /* ==========================================================================
   * INPUT
   * ========================================================================== */
  document.addEventListener('keydown', function (e) {
    keys[e.key] = true;
    if (e.key === 'Escape') { e.preventDefault(); togglePause(); }
    if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault();
  });
  document.addEventListener('keyup', function (e) { keys[e.key] = false; });

  document.getElementById('startBtn').addEventListener('click', startGame);
  document.getElementById('restartBtn').addEventListener('click', startGame);
  document.getElementById('resumeBtn').addEventListener('click', togglePause);

  /* Mobile D-pad: hold move/fire; tap spread/shield (cooldown-gated). */
  function bindHold(id, key) {
    var el = document.getElementById(id);
    if (!el) return;
    var down = function (e) { e.preventDefault(); keys[key] = true; };
    var up = function (e) { e.preventDefault(); keys[key] = false; };
    el.addEventListener('touchstart', down, { passive: false });
    el.addEventListener('touchend', up, { passive: false });
    el.addEventListener('touchcancel', up, { passive: false });
    el.addEventListener('mousedown', down);
    el.addEventListener('mouseup', up);
    el.addEventListener('mouseleave', up);
  }
  function bindTap(id, fn) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('touchstart', function (e) { e.preventDefault(); if (game.state === 'playing' && player) fn(); }, { passive: false });
    el.addEventListener('click', function () { if (game.state === 'playing' && player) fn(); });
  }
  bindHold('mobileLeft', 'ArrowLeft');
  bindHold('mobileRight', 'ArrowRight');
  bindHold('mobileFire', ' ');
  bindTap('mobileSpread', function () { player.kycShoot(); });
  bindTap('mobileShield', function () { player.activateShield(); });

  /* Mute toggle (shared substrate button, top-right). */
  if (J && J.muteButton) J.muteButton(document.body);

  /* Attach particle system to the game canvas/ctx. */
  if (J && J.particles) J.particles.attach(canvas, ctx);

  /* ==========================================================================
   * TEST HOOKS — window.PaymentInvadersTest (test-only steering; shipped
   * gameplay never calls these). Every hook runs REAL game functions.
   * The scripted `pulse` fires a FIXED cue set {tap,tick,hit,powerup,fail,
   * combo,whoosh} — the full universe of endless-mode cues — so the harness
   * mute assertion (distinct cue set must not grow while muted) stays stable.
   * ========================================================================== */
  function testPickupPowerup() {
    var types = Object.keys(POWERUP_TYPES);
    var pu = new PowerUp(GAME_W / 2 - 15, (player ? player.y : GAME_H - 80) - 40, types[(Math.random() * types.length) | 0]);
    applyPowerUp(pu); // 'powerup' + sparkle emit + floatText + analytics
  }

  window.PaymentInvadersTest = {
    setEndless: function (v) { testEndless = !!v; },
    getState: function () { return game.state; },
    getScore: function () { return game.score; },
    getWave: function () { return game.wave; },

    // Deterministic, real, visible-score-incrementing kill.
    scorePoint: function () {
      if (game.state !== 'playing' || !player) return;
      var e = new Enemy(GAME_W / 2 - 22, 130, 'fraudster');
      enemies.push(e);
      killEnemy(e);
    },

    // One juicy beat covering the full endless cue set (see note above).
    pulse: function () {
      if (game.state !== 'playing' || !player) return;
      player.shootCooldown = 0; player.shoot();            // 'tap'
      var e = new Enemy(GAME_W / 2 - 22, 130, 'fraudster');
      enemies.push(e);
      grazeEnemy(e, false);                                // 'tick'
      killEnemy(e);                                        // 'hit' + explosion + score + combo + shake
      testPickupPowerup();                                 // 'powerup'
      playerHit();                                         // 'fail' + shake (no life loss in endless)
      awardWaveFx();                                       // 'combo' + confetti + waveComplete analytics
      bossAlertFx();                                       // 'whoosh' + shake
    },

    spawnBoss: function () {
      if (game.state !== 'playing') return;
      game.wave = 5; enemies = []; bullets = []; enemyBullets = [];
      spawnWave();
    },

    // Real game-over path (analytics + highscore.set).
    endGame: function () { testEndless = false; gameOver(); }
  };

  /* ==========================================================================
   * BOOT
   * ========================================================================== */
  document.getElementById('menuHighScore').textContent = game.highScore.toLocaleString();
  initStars();
  resizeCanvas();
  requestAnimationFrame(frame);
})();
