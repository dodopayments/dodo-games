/* ==========================================================================
 * DODO PONG — rally-combo Pong with power-ups, selectable AI, and full juice.
 * Vanilla JS. Renders into a DPI-aware canvas; game-feel via window.DodoJuice.
 * Analytics via window.DodoAnalytics (game_name frozen as "Dodo Pong").
 * ========================================================================== */
(function () {
  'use strict';

  var GAME_NAME = 'Dodo Pong';
  var SLUG = 'dodo-pong';
  var HAS_JUICE = typeof window.DodoJuice !== 'undefined';
  var J = HAS_JUICE ? window.DodoJuice : null;

  /* ---- tuning --------------------------------------------------------- */
  var WIN_SCORE = 11;
  var WIN_BY = 2;
  var BASE_BALL_SPEED = 0.62;   // fraction of court height per second
  var MAX_RALLY_SPEED = 1.35;   // additive cap from rally scaling
  var PADDLE_W_FRAC = 0.22;     // fraction of court width
  var PADDLE_H_FRAC = 0.022;    // fraction of court height
  var BALL_R_FRAC = 0.018;
  var KEY_SPEED = 1.35;         // player keyboard speed (court widths / sec)
  var SLOWMO = 0.5;

  var DIFFICULTIES = {
    starter: { label: 'Starter', react: 0.06, accuracy: 0.55, error: 0.34, speed: 0.42, predict: 0.15 },
    growth: { label: 'Growth', react: 0.14, accuracy: 0.74, error: 0.20, speed: 0.62, predict: 0.45 },
    enterprise: { label: 'Enterprise', react: 0.34, accuracy: 0.93, error: 0.07, speed: 0.92, predict: 0.9 }
  };

  var POWERUPS = {
    multiball: { label: 'Batch Settlement', color: '#C1FF00', glyph: '⧉' },
    extend: { label: 'Limit Increase', color: '#4DA3FF', glyph: '⇔' },
    curve: { label: 'Smart Routing', color: '#FF5C8A', glyph: '∿' }
  };
  var POWERUP_KEYS = ['multiball', 'extend', 'curve'];

  var SCORE_QUIPS = [
    'Transaction Approved! ✅', 'Settlement Cleared! 💸', 'Instant Payout! ⚡',
    'Funds Captured! 🟢', 'Routing Optimized! 🧭'
  ];
  var CONCEDE_QUIPS = [
    'Payment Declined! ❌', 'Processing… ⏳', 'Chargeback Filed! 🔴', 'Retry Queued… 🔁'
  ];

  /* ---- DOM ------------------------------------------------------------ */
  var canvas = document.getElementById('gameCanvas');
  var ctx = canvas.getContext('2d');
  var shell = document.getElementById('pongShell');
  var hud = document.getElementById('hud');
  var startScreen = document.getElementById('startScreen');
  var pauseScreen = document.getElementById('pauseScreen');
  var gameOverScreen = document.getElementById('gameOverScreen');

  var startButton = document.getElementById('startButton');
  var restartButton = document.getElementById('restartButton');
  var resumeButton = document.getElementById('resumeButton');
  var quitButton = document.getElementById('quitButton');
  var difficultySelect = document.getElementById('difficultySelect');

  var playerScoreEl = document.getElementById('playerScore');
  var aiScoreEl = document.getElementById('aiScore');
  var bestScoreEl = document.getElementById('bestScore');
  var rallyBadge = document.getElementById('rallyBadge');
  var resultTitle = document.getElementById('resultTitle');
  var resultEyebrow = document.getElementById('resultEyebrow');
  var finalPlayerScoreEl = document.getElementById('finalPlayerScore');
  var finalAiScoreEl = document.getElementById('finalAiScore');
  var finalRallyEl = document.getElementById('finalRally');
  var finalSettledEl = document.getElementById('finalSettled');
  var overBestScoreEl = document.getElementById('overBestScore');

  /* ---- state ---------------------------------------------------------- */
  var W = 0, H = 0;              // logical (CSS) court size
  var gameState = 'START';       // START | PLAYING | PAUSED | GAME_OVER
  var difficulty = 'growth';
  var testEndless = false;       // test-only: disables win detection during scripted play

  var playerScore = 0, aiScore = 0;
  var rally = 0, bestRally = 0, settled = 0;
  var timescale = 1;

  var player = { x: 0, y: 0, w: 0, h: 0, baseW: 0, aim: 0 };
  var ai = { x: 0, y: 0, w: 0, h: 0, aimX: 0 };
  var balls = [];

  var serving = false, serveTimer = 0, serveCount = 3;
  var powerup = null;            // floating pickup {type,x,y,r,vy,t}
  var powerupTimer = 4;          // seconds until next spawn attempt
  var active = null;             // {type,timeLeft}
  var flashPaddle = 0;

  var hs = null, best = 0;
  var lastTs = 0;

  /* ---- highscore (with legacy migration) ------------------------------ */
  var BEST_KEY = 'dodo_' + SLUG + '_highscore';
  if (HAS_JUICE && J.highscore) {
    hs = J.highscore(SLUG, ['dodo_pong_highscore']);
    best = hs.best;
  } else {
    best = parseInt(localStorage.getItem(BEST_KEY) || localStorage.getItem('dodo_pong_highscore') || '0', 10) || 0;
  }
  try { bestRally = parseInt(localStorage.getItem('dodo_dodo-pong_bestrally') || '0', 10) || 0; } catch (e) { bestRally = 0; }

  /* ---- helpers -------------------------------------------------------- */
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function play(cue, opts) { if (J && J.audio) J.audio.play(cue, opts); }
  function emit(preset, x, y, opts) { if (J && J.particles) J.particles.emit(preset, x, y, opts); }
  function shake(intensity, ms) { if (J) J.shake(canvas, intensity, ms); }
  function rectPx(v) { return v; }

  function cssPoint(logicalX, logicalY) {
    // logical coords already equal CSS px of the canvas; add canvas offset for fixed overlays.
    var r = canvas.getBoundingClientRect();
    return { x: r.left + logicalX, y: r.top + logicalY };
  }

  function floatQuip(logicalX, logicalY, text, color) {
    if (!J || !J.floatText) return;
    var p = cssPoint(logicalX, logicalY);
    J.floatText(p.x, p.y, text, { color: color || '#C1FF00', size: 20 });
  }

  /* ---- DPI-aware sizing ---------------------------------------------- */
  function resize() {
    var dpr = window.devicePixelRatio || 1;
    var availW = shell.clientWidth || window.innerWidth;
    var availH = shell.clientHeight || window.innerHeight;
    // Portrait court, aspect ~ 0.68 (w/h). Fit inside the stage with margin.
    var margin = 14;
    var maxW = availW - margin * 2;
    var maxH = availH - margin * 2;
    var aspect = 0.68;
    var cssW = Math.min(maxW, maxH * aspect);
    var cssH = cssW / aspect;
    if (cssH > maxH) { cssH = maxH; cssW = cssH * aspect; }
    cssW = Math.max(200, Math.floor(cssW));
    cssH = Math.max(280, Math.floor(cssH));

    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    W = cssW; H = cssH;
    layoutEntities();
  }

  function layoutEntities() {
    player.baseW = W * PADDLE_W_FRAC;
    player.w = (active && active.type === 'extend') ? player.baseW * 1.7 : player.baseW;
    player.h = H * PADDLE_H_FRAC;
    ai.w = W * PADDLE_W_FRAC;
    ai.h = H * PADDLE_H_FRAC;
    player.y = H - H * 0.05;
    ai.y = H * 0.05 - ai.h;
    player.x = clamp(player.x, 0, W - player.w);
    ai.x = clamp(ai.x, 0, W - ai.w);
    if (gameState === 'START' || gameState === 'GAME_OVER') {
      player.x = (W - player.w) / 2;
      ai.x = (W - ai.w) / 2;
    }
  }

  /* ---- balls ---------------------------------------------------------- */
  function makeBall(dir) {
    var r = Math.max(5, Math.min(W, H) * BALL_R_FRAC);
    var speed = BASE_BALL_SPEED * H;
    var ang = rnd(-0.35, 0.35);
    return {
      x: W / 2, y: H / 2, r: r,
      vx: Math.sin(ang) * speed,
      vy: (dir || (Math.random() < 0.5 ? 1 : -1)) * Math.cos(ang) * speed,
      speed: speed, curve: 0, trailHue: '#C1FF00'
    };
  }

  function serveBall(dir) {
    balls = [makeBall(dir)];
    balls[0].vx = 0; balls[0].vy = 0; // frozen during countdown
    serving = true; serveCount = 3; serveTimer = 0;
  }

  function launchServe() {
    var b = balls[0];
    var speed = BASE_BALL_SPEED * H;
    var ang = rnd(-0.35, 0.35);
    var dir = Math.random() < 0.5 ? 1 : -1;
    b.vx = Math.sin(ang) * speed;
    b.vy = dir * Math.cos(ang) * speed;
    b.speed = speed;
    serving = false;
  }

  function ballSpeedForRally() {
    var t = clamp(rally / 18, 0, 1);
    return BASE_BALL_SPEED * H * (1 + t * MAX_RALLY_SPEED);
  }

  /* ---- rally + scoring ------------------------------------------------ */
  function multiplier() { return 1 + Math.floor(rally / 4); }

  function updateHud() {
    playerScoreEl.textContent = String(playerScore);
    aiScoreEl.textContent = String(aiScore);
    bestScoreEl.textContent = String(Math.max(best, playerScore));
    if (rally >= 2) {
      var m = multiplier();
      rallyBadge.hidden = false;
      rallyBadge.textContent = 'RALLY ×' + rally + (m > 1 ? ' · ' + m + 'x' : '');
      rallyBadge.className = 'da-combo-badge ' +
        (rally >= 10 ? 'da-combo-badge--t3' : rally >= 6 ? 'da-combo-badge--t2' : 'da-combo-badge--t1');
    } else {
      rallyBadge.hidden = true;
    }
  }

  function popScore(el) {
    if (!el) return;
    el.classList.remove('da-score--pop');
    void el.offsetWidth;
    el.classList.add('da-score--pop');
  }

  function onRallyHit(b, isPlayer) {
    rally += 1;
    if (rally > bestRally) bestRally = rally;
    settled += 100 * multiplier();
    var pitch = 1 + clamp(rally, 0, 14) * 0.05;
    play('hit', { pitch: pitch });
    if (rally >= 3 && rally % 3 === 0) play('combo', { pitch: pitch });
    emit('burst', b.x, b.y, { count: 8 + Math.min(rally, 12), color: isPlayer ? '#C1FF00' : '#B8B8B8' });
    shake(clamp(4 + rally * 0.8, 4, 16), 180);
    flashPaddle = isPlayer ? 1 : 0.6;
    if (J && J.haptics && isPlayer) J.haptics.tap();
    updateHud();
  }

  function awardPoint(who) {
    // real scoring path (checks win)
    if (who === 'player') {
      playerScore += 1;
      popScore(playerScoreEl);
      play('score');
      floatQuip(W / 2, H * 0.62, SCORE_QUIPS[(Math.random() * SCORE_QUIPS.length) | 0], '#C1FF00');
      emit('confetti', W / 2, H * 0.62, { count: 22 });
    } else {
      aiScore += 1;
      popScore(aiScoreEl);
      play('fail');
      floatQuip(W / 2, H * 0.38, CONCEDE_QUIPS[(Math.random() * CONCEDE_QUIPS.length) | 0], '#FF4757');
    }
    rally = 0;
    clearPowerupState();
    updateHud();
    if (!testEndless && checkWin()) return;
    serveBall(who === 'player' ? -1 : 1); // serve toward the conceding side
  }

  function checkWin() {
    var diff = Math.abs(playerScore - aiScore);
    if ((playerScore >= WIN_SCORE || aiScore >= WIN_SCORE) && diff >= WIN_BY) {
      endMatch(playerScore > aiScore ? 'player' : 'ai');
      return true;
    }
    return false;
  }

  function isMatchPoint() {
    var hi = Math.max(playerScore, aiScore);
    return hi >= WIN_SCORE - 1 && Math.abs(playerScore - aiScore) >= WIN_BY - 1;
  }

  /* ---- power-ups ------------------------------------------------------ */
  function trySpawnPowerup(dt) {
    if (active || powerup || serving || gameState !== 'PLAYING') return;
    powerupTimer -= dt;
    if (powerupTimer > 0) return;
    powerupTimer = rnd(7, 11);
    var type = POWERUP_KEYS[(Math.random() * POWERUP_KEYS.length) | 0];
    powerup = {
      type: type, x: rnd(W * 0.25, W * 0.75), y: H / 2 + rnd(-H * 0.08, H * 0.08),
      r: Math.max(16, W * 0.05), t: 0
    };
  }

  function collectPowerup(b) {
    if (!powerup) return;
    var dx = b.x - powerup.x, dy = b.y - powerup.y;
    if (dx * dx + dy * dy > (powerup.r + b.r) * (powerup.r + b.r)) return;
    activatePowerup(powerup.type, powerup.x, powerup.y);
    powerup = null;
  }

  function activatePowerup(type, x, y) {
    var def = POWERUPS[type];
    active = { type: type, timeLeft: 8.5 };
    play('powerup');
    emit('sparkle', x, y, { count: 20, color: def.color });
    emit('burst', x, y, { count: 16, color: def.color });
    floatQuip(x, y - 10, def.label + '!', def.color);
    if (J && J.flash) J.flash(canvas, def.color, 200);
    if (J && J.haptics) J.haptics.success();
    if (typeof DodoAnalytics !== 'undefined') {
      DodoAnalytics.powerUp(GAME_NAME, def.label);
    }
    if (type === 'multiball') {
      var src = balls[0] || makeBall(-1);
      for (var i = 0; i < 2; i++) {
        var nb = makeBall(-1);
        nb.x = src.x; nb.y = src.y; nb.r = src.r;
        var a = (i === 0 ? -0.5 : 0.5);
        var sp = ballSpeedForRally();
        nb.vx = Math.sin(a) * sp; nb.vy = -Math.abs(Math.cos(a) * sp);
        balls.push(nb);
      }
    } else if (type === 'extend') {
      layoutEntities();
    } else if (type === 'curve') {
      for (var k = 0; k < balls.length; k++) balls[k].curve = (Math.random() < 0.5 ? 1 : -1) * 120;
    }
  }

  function updateActive(dt) {
    if (!active) return;
    active.timeLeft -= dt;
    if (active.timeLeft <= 0) clearPowerupState();
  }

  function clearPowerupState() {
    if (active && active.type === 'extend') { active = null; layoutEntities(); return; }
    if (active && active.type === 'curve') { for (var k = 0; k < balls.length; k++) balls[k].curve = 0; }
    active = null;
  }

  /* ---- physics update ------------------------------------------------- */
  function update(dt) {
    if (gameState !== 'PLAYING') return;
    var ts = (isMatchPoint() && !serving) ? SLOWMO : 1;
    timescale += (ts - timescale) * Math.min(1, dt * 8);
    var sdt = dt * timescale;

    if (flashPaddle > 0) flashPaddle = Math.max(0, flashPaddle - dt * 4);
    updatePlayer(dt);
    updateAI(sdt);
    updateActive(dt);
    trySpawnPowerup(dt);
    if (powerup) powerup.t += dt;

    if (serving) {
      serveTimer += dt;
      var n = 3 - Math.floor(serveTimer / 0.3);
      if (n !== serveCount && n >= 1) { serveCount = n; play('tick'); }
      if (serveTimer >= 1.0) launchServe();
      return;
    }

    for (var i = balls.length - 1; i >= 0; i--) {
      var b = balls[i];
      if (b.curve) b.vx += b.curve * sdt;
      b.x += b.vx * sdt;
      b.y += b.vy * sdt;

      // side walls
      if (b.x - b.r < 0) { b.x = b.r; b.vx = Math.abs(b.vx); wallHit(b); }
      else if (b.x + b.r > W) { b.x = W - b.r; b.vx = -Math.abs(b.vx); wallHit(b); }

      // paddle collisions
      collidePaddle(b, player, true);
      collidePaddle(b, ai, false);
      collectPowerup(b);

      // trail
      emit('trail', b.x, b.y, { count: 2, color: b.curve ? '#FF5C8A' : '#C1FF00' });

      // scoring (ball leaves top/bottom)
      if (b.y + b.r < 0) { removeBall(i, 'player'); }
      else if (b.y - b.r > H) { removeBall(i, 'ai'); }

      // a point started a new serve or ended the match — stop iterating the old list
      if (serving || gameState !== 'PLAYING') break;
    }
  }

  function removeBall(i, scorer) {
    balls.splice(i, 1);
    if (balls.length === 0) {
      awardPoint(scorer);
    }
    // in multi-ball, points only settle when the last ball leaves — keeps it fair
  }

  function wallHit(b) {
    play('tap', { pitch: rnd(0.9, 1.1) });
    emit('sparkle', b.x, b.y, { count: 5, color: '#ffffff' });
  }

  function collidePaddle(b, pad, isPlayer) {
    var movingToward = isPlayer ? b.vy > 0 : b.vy < 0;
    if (!movingToward) return;
    var withinY = isPlayer
      ? (b.y + b.r >= pad.y && b.y - b.r <= pad.y + pad.h)
      : (b.y - b.r <= pad.y + pad.h && b.y + b.r >= pad.y);
    if (!withinY) return;
    if (b.x < pad.x - b.r || b.x > pad.x + pad.w + b.r) return;

    var speed = ballSpeedForRally();
    var hitPos = (b.x - (pad.x + pad.w / 2)) / (pad.w / 2);
    hitPos = clamp(hitPos, -1, 1);
    b.vx = hitPos * speed * 0.85;
    var vy = Math.sqrt(Math.max(1, speed * speed - b.vx * b.vx));
    b.vy = isPlayer ? -vy : vy;
    b.y = isPlayer ? pad.y - b.r : pad.y + pad.h + b.r;
    b.speed = speed;
    onRallyHit(b, isPlayer);
  }

  function updatePlayer(dt) {
    var speed = KEY_SPEED * W * dt;
    if (keys.left) player.x -= speed;
    if (keys.right) player.x += speed;
    if (player.aim != null && pointerActive) {
      // smooth follow toward pointer/touch target
      var target = player.aim - player.w / 2;
      player.x += (target - player.x) * Math.min(1, dt * 18);
    }
    player.x = clamp(player.x, 0, W - player.w);
  }

  function updateAI(dt) {
    var cfg = DIFFICULTIES[difficulty];
    // find the most threatening ball (closest, moving up toward AI)
    var target = null, bestD = Infinity;
    for (var i = 0; i < balls.length; i++) {
      var b = balls[i];
      if (b.vy < 0) {
        var d = b.y;
        if (d < bestD) { bestD = d; target = b; }
      }
    }
    if (!target) target = balls[0];

    if (target && Math.random() < cfg.react) {
      var predictX = target.x;
      if (Math.random() < cfg.predict && target.vy < 0) {
        var timeToReach = target.y / Math.max(1, -target.vy);
        predictX = target.x + target.vx * timeToReach;
        // reflect prediction off side walls
        while (predictX < 0 || predictX > W) {
          if (predictX < 0) predictX = -predictX;
          if (predictX > W) predictX = 2 * W - predictX;
        }
      }
      var acc = Math.random() < cfg.accuracy;
      var err = acc ? 0 : (Math.random() - 0.5) * W * cfg.error;
      ai.aimX = predictX + err;
    }
    var center = ai.x + ai.w / 2;
    var diff = ai.aimX - center;
    var maxMove = cfg.speed * W * dt;
    ai.x += clamp(diff, -maxMove, maxMove);
    ai.x = clamp(ai.x, 0, W - ai.w);
  }

  /* ---- render --------------------------------------------------------- */
  function draw() {
    ctx.clearRect(0, 0, W, H);

    // court background
    ctx.fillStyle = '#060a04';
    ctx.fillRect(0, 0, W, H);

    // subtle side glow gradient
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, 'rgba(77,163,255,0.05)');
    g.addColorStop(0.5, 'rgba(193,255,0,0.02)');
    g.addColorStop(1, 'rgba(193,255,0,0.06)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // center line
    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 12]);
    ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.stroke();
    ctx.setLineDash([]);

    // center-court branding
    ctx.save();
    ctx.globalAlpha = 0.10;
    ctx.fillStyle = '#C1FF00';
    ctx.font = '900 ' + Math.round(W * 0.11) + 'px ' + '"Space Grotesk", system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('DODO', W / 2, H / 2 - W * 0.06);
    ctx.fillText('PONG', W / 2, H / 2 + W * 0.06);
    ctx.restore();

    // big score watermark
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = 'rgba(184,184,184,0.5)';
    ctx.font = '800 ' + Math.round(H * 0.06) + 'px "SF Mono", ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(String(aiScore), W * 0.5, H * 0.28);
    ctx.fillStyle = 'rgba(193,255,0,0.5)';
    ctx.fillText(String(playerScore), W * 0.5, H * 0.74);
    ctx.restore();

    // side labels
    ctx.save();
    ctx.font = '700 ' + Math.round(H * 0.016) + 'px "SF Mono", ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(184,184,184,0.6)';
    ctx.fillText('PROCESSOR', W / 2, H * 0.035);
    ctx.fillStyle = 'rgba(193,255,0,0.7)';
    ctx.fillText('MERCHANT', W / 2, H * 0.975);
    ctx.restore();

    // power-up token
    if (powerup) drawPowerup(powerup);

    // paddles
    drawPaddle(ai, '#B8B8B8', flashPaddle > 0 && flashPaddle <= 0.6);
    drawPaddle(player, '#C1FF00', flashPaddle > 0.6);

    // balls
    for (var i = 0; i < balls.length; i++) drawBall(balls[i]);

    // particles (juice) rendered into our own context
    if (J && J.particles) J.particles.draw(ctx);

    // serve countdown
    if (serving && gameState === 'PLAYING') drawCountdown();

    // active power-up timer ring
    if (active) drawActiveBadge();
  }

  function drawPaddle(pad, color, flash) {
    var r = Math.min(pad.h / 2, 8);
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = flash ? 26 : 12;
    ctx.fillStyle = flash ? '#ffffff' : color;
    roundRect(pad.x, pad.y, pad.w, pad.h, r);
    ctx.fill();
    ctx.restore();
  }

  function drawBall(b) {
    ctx.save();
    ctx.shadowColor = b.curve ? '#FF5C8A' : '#C1FF00';
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#050505';
    ctx.font = '800 ' + Math.round(b.r * 1.1) + 'px "SF Mono", monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('$', b.x, b.y + 0.5);
  }

  function drawPowerup(p) {
    var def = POWERUPS[p.type];
    var pulse = 1 + Math.sin(p.t * 6) * 0.08;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(pulse, pulse);
    ctx.shadowColor = def.color;
    ctx.shadowBlur = 22;
    ctx.fillStyle = 'rgba(5,5,5,0.85)';
    ctx.strokeStyle = def.color;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, p.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = def.color;
    ctx.font = '800 ' + Math.round(p.r * 1.1) + 'px "Space Grotesk", system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(def.glyph, 0, 1);
    ctx.restore();
  }

  function drawCountdown() {
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = '#C1FF00';
    ctx.shadowColor = '#C1FF00';
    ctx.shadowBlur = 24;
    ctx.font = '900 ' + Math.round(H * 0.12) + 'px "Space Grotesk", system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(clamp(serveCount, 1, 3)), W / 2, H / 2);
    ctx.restore();
  }

  function drawActiveBadge() {
    var def = POWERUPS[active.type];
    var frac = clamp(active.timeLeft / 8.5, 0, 1);
    var cx = W - 22, cy = 22, r = 12;
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = def.color;
    ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2); ctx.stroke();
    ctx.fillStyle = def.color;
    ctx.font = '800 12px "Space Grotesk", system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(def.glyph, cx, cy + 0.5);
    ctx.restore();
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /* ---- loop ----------------------------------------------------------- */
  function frame(ts) {
    var dt = lastTs ? (ts - lastTs) / 1000 : 0.016;
    lastTs = ts;
    if (dt > 0.05) dt = 0.05;
    if (J && J.particles) J.particles.update(dt);
    update(dt);
    draw();
    requestAnimationFrame(frame);
  }

  /* ---- screens -------------------------------------------------------- */
  function setScreen(state) {
    startScreen.hidden = state !== 'START';
    pauseScreen.hidden = state !== 'PAUSED';
    gameOverScreen.hidden = state !== 'GAME_OVER';
    hud.hidden = (state === 'START');
  }

  function startGame() {
    resize();
    gameState = 'PLAYING';
    testEndless = false;
    playerScore = 0; aiScore = 0; rally = 0; settled = 0; bestRally = 0;
    timescale = 1; active = null; powerup = null; powerupTimer = rnd(5, 8);
    layoutEntities();
    player.x = (W - player.w) / 2; ai.x = (W - ai.w) / 2; ai.aimX = W / 2;
    serveBall(Math.random() < 0.5 ? 1 : -1);
    updateHud();
    setScreen('PLAYING');
    if (typeof DodoAnalytics !== 'undefined') {
      DodoAnalytics.gameStart(GAME_NAME, DIFFICULTIES[difficulty].label);
    }
  }

  function pauseGame() {
    if (gameState !== 'PLAYING') return;
    gameState = 'PAUSED';
    setScreen('PAUSED');
  }
  function resumeGame() {
    if (gameState !== 'PAUSED') return;
    gameState = 'PLAYING';
    lastTs = 0;
    setScreen('PLAYING');
  }

  function endMatch(winner) {
    if (gameState !== 'PLAYING') return;
    gameState = 'GAME_OVER';
    timescale = 1;

    var prevBest = best;
    if (hs) { hs.set(playerScore); best = hs.best; }
    else if (playerScore > best) { best = playerScore; try { localStorage.setItem(BEST_KEY, String(best)); } catch (e) {} }
    try { localStorage.setItem('dodo_dodo-pong_bestrally', String(Math.max(bestRally, parseInt(localStorage.getItem('dodo_dodo-pong_bestrally') || '0', 10) || 0))); } catch (e) {}

    if (typeof DodoAnalytics !== 'undefined') {
      DodoAnalytics.gameOver(GAME_NAME, playerScore, { difficulty: DIFFICULTIES[difficulty].label, ai_score: aiScore });
      if (playerScore > prevBest) DodoAnalytics.newHighScore(GAME_NAME, playerScore);
    }

    var won = winner === 'player';
    resultEyebrow.textContent = won ? 'Settlement Complete' : 'Batch Failed';
    resultTitle.textContent = won ? 'Merchant Wins!' : 'Processor Wins!';
    finalPlayerScoreEl.textContent = String(playerScore);
    finalAiScoreEl.textContent = String(aiScore);
    finalRallyEl.textContent = String(bestRally);
    finalSettledEl.textContent = '$' + settled.toLocaleString('en-US');
    overBestScoreEl.textContent = String(best);
    updateHud();
    setScreen('GAME_OVER');

    if (won) {
      play('win');
      emit('confetti', W / 2, H / 2, { count: 40 });
      if (J && J.haptics) J.haptics.success();
    } else {
      play('gameover');
      emit('explosion', W / 2, H * 0.3, { count: 32, color: '#FF4757' });
      shake(14, 400);
      if (J && J.haptics) J.haptics.fail();
    }
  }

  /* ---- input ---------------------------------------------------------- */
  var keys = { left: false, right: false };
  var pointerActive = false;

  document.addEventListener('keydown', function (e) {
    var k = e.key;
    if (k === 'ArrowLeft' || k === 'a' || k === 'A') keys.left = true;
    if (k === 'ArrowRight' || k === 'd' || k === 'D') keys.right = true;
    if (k === 'p' || k === 'P' || k === 'Escape') {
      if (gameState === 'PLAYING') pauseGame();
      else if (gameState === 'PAUSED') resumeGame();
    }
    if ((k === 'ArrowLeft' || k === 'ArrowRight') && gameState === 'PLAYING') e.preventDefault();
  });
  document.addEventListener('keyup', function (e) {
    var k = e.key;
    if (k === 'ArrowLeft' || k === 'a' || k === 'A') keys.left = false;
    if (k === 'ArrowRight' || k === 'd' || k === 'D') keys.right = false;
  });

  function pointerToCourt(clientX, clientY) {
    var r = canvas.getBoundingClientRect();
    return { x: (clientX - r.left) * (W / r.width), y: (clientY - r.top) * (H / r.height) };
  }
  function handlePointer(clientX, clientY) {
    if (gameState !== 'PLAYING') return;
    var pt = pointerToCourt(clientX, clientY);
    if (pt.y < H * 0.45) return; // only the player's (lower) half drives the paddle
    pointerActive = true;
    player.aim = clamp(pt.x, 0, W);
  }

  canvas.addEventListener('touchmove', function (e) {
    e.preventDefault();
    if (e.touches && e.touches.length) handlePointer(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: false });
  canvas.addEventListener('touchstart', function (e) {
    if (e.touches && e.touches.length) handlePointer(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });
  canvas.addEventListener('touchend', function () { pointerActive = false; });

  canvas.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    handlePointer(e.clientX, e.clientY);
  });
  canvas.addEventListener('pointermove', function (e) {
    if (e.buttons || e.pointerType === 'touch') handlePointer(e.clientX, e.clientY);
  });
  window.addEventListener('pointerup', function () { pointerActive = false; });

  /* difficulty selector */
  difficultySelect.addEventListener('click', function (e) {
    var btn = e.target.closest ? e.target.closest('.pong-seg__btn') : null;
    if (!btn) return;
    difficulty = btn.getAttribute('data-diff');
    var all = difficultySelect.querySelectorAll('.pong-seg__btn');
    for (var i = 0; i < all.length; i++) {
      var on = all[i] === btn;
      all[i].classList.toggle('is-active', on);
      all[i].setAttribute('aria-pressed', on ? 'true' : 'false');
    }
    play('tap');
  });

  startButton.addEventListener('click', startGame);
  restartButton.addEventListener('click', startGame);
  resumeButton.addEventListener('click', resumeGame);
  quitButton.addEventListener('click', function () { gameState = 'START'; setScreen('START'); });

  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', function () { setTimeout(resize, 150); });

  /* mute toggle */
  if (J && J.muteButton) J.muteButton(document.body);

  /* ---- test hooks (test-only steering; never used by real gameplay) --- */
  window.DodoPongTest = {
    scorePlayer: function () {
      playerScore += 1;
      popScore(playerScoreEl);
      play('score'); play('tick');
      emit('burst', W / 2, H * 0.62, { count: 12, color: '#C1FF00' });
      shake(6, 160);
      floatQuip(W / 2, H * 0.62, SCORE_QUIPS[(Math.random() * SCORE_QUIPS.length) | 0], '#C1FF00');
      updateHud();
    },
    scoreAi: function () {
      aiScore += 1;
      popScore(aiScoreEl);
      play('fail');
      shake(5, 150);
      updateHud();
    },
    endMatchPlayer: function () {
      testEndless = false;
      playerScore = WIN_SCORE; aiScore = 0;
      endMatch('player');
    },
    spawnAndPickup: function () {
      var type = POWERUP_KEYS[(Math.random() * POWERUP_KEYS.length) | 0];
      activatePowerup(type, W / 2, H / 2);
    },
    trackBall: function () {
      if (!balls.length) return;
      var b = balls[0];
      player.aim = clamp(b.x, 0, W);
      pointerActive = true;
    },
    setEndless: function (v) { testEndless = !!v; },
    getState: function () { return gameState; },
    getPlayerScore: function () { return playerScore; }
  };

  /* ---- boot ----------------------------------------------------------- */
  resize();
  updateHud();
  setScreen('START');
  requestAnimationFrame(frame);
})();
