/* ==========================================================================
 * FIREWALL BREAKER DODO — combo Breakout with 9 handcrafted firewall layers,
 * shielded + explosive bricks, moving rows, power-ups, per-level stars, and
 * full juice. Vanilla JS. DPI-aware canvas; game-feel via window.DodoJuice.
 * Analytics via window.DodoAnalytics (game_name frozen as "Firewall Breaker Dodo").
 * ========================================================================== */
(function () {
  'use strict';

  var GAME_NAME = 'Firewall Breaker Dodo';
  var HAS_JUICE = typeof window.DodoJuice !== 'undefined';
  var J = HAS_JUICE ? window.DodoJuice : null;

  /* ---- tuning --------------------------------------------------------- */
  var MAX_LEVELS = 9;
  var START_LIVES = 3;
  var PADDLE_W_FRAC = 0.20;
  var BALL_R_FRAC = 0.016;
  var KEY_SPEED = 1.5;          // paddle keyboard speed (court widths / sec)
  var STARS_KEY = 'dodo_firewall-breaker-dodo_stars';

  /* Brick kinds (fraud-severity theme preserved + shielded/explosive). */
  var BRICK = {
    L: { hp: 1, shield: 0, color: '#2ED573', score: 10, name: 'Low Risk' },
    A: { hp: 1, shield: 0, color: '#FFB020', score: 20, name: 'Anomaly' },
    S: { hp: 2, shield: 0, color: '#FF8C00', score: 30, name: 'Suspicious' },
    C: { hp: 3, shield: 0, color: '#FF4757', score: 50, name: 'Critical Fraud' },
    H: { hp: 2, shield: 1, color: '#4DA3FF', score: 45, name: 'Shielded' },
    X: { hp: 1, shield: 0, color: '#FFD23F', score: 40, name: 'Explosive', explosive: true }
  };

  var LEVELS = [
    { name: 'Perimeter Scan', sub: 'Basic fraud filters online.', moving: [],
      map: ['LLLLLLLLL', 'AAAAAAAAA', 'LLLLLLLLL'] },
    { name: 'Signature Filter', sub: 'Known bad patterns stacked up.', moving: [],
      map: ['AAAAAAAAA', 'SSSSSSSSS', 'AAAAAAAAA', 'LLLLLLLLL'] },
    { name: 'Risk Engine', sub: 'Critical fraud — three hits deep.', moving: [],
      map: ['CCCCCCCCC', 'SSSSSSSSS', 'AAAAAAAAA', 'SSSSSSSSS'] },
    { name: 'Rolling Audit', sub: 'Bricks on the move. Track them.', moving: [0, 2],
      map: ['.SSSSSSS.', 'CACACACAC', '.AAAAAAA.', 'LLLLLLLLL'] },
    { name: 'Hardened Gate', sub: 'Shielded nodes — crack the shield first.', moving: [],
      map: ['HHHHHHHHH', 'CSCSCSCSC', 'AHAHAHAHA', 'SSSSSSSSS'] },
    { name: 'Detonation Grid', sub: 'Explosive nodes chain-react.', moving: [],
      map: ['X.X.X.X.X', 'SSSSSSSSS', 'X.X.X.X.X', 'CCCCCCCCC'] },
    { name: 'Adaptive Mesh', sub: 'Moving shields meet live charges.', moving: [1],
      map: ['HSHSHSHSH', '.C.C.C.C.', 'XSXSXSXSX', 'AAAAAAAAA'] },
    { name: 'Zero Trust', sub: 'Everything, everywhere, at once.', moving: [1, 3],
      map: ['CHCHCHCHC', '.XSXSXSX.', 'HCHCHCHCH', '.X.X.X.X.', 'SSSSSSSSS'] },
    { name: 'Core Vault', sub: 'The final firewall. Breach it.', moving: [1, 3],
      map: ['CCCCCCCCC', '.HXHXHXH.', 'CSCSCSCSC', '.XHXHXHX.', 'CCCCCCCCC'] }
  ];

  var POWERUPS = {
    shield: { label: 'PCI Shield', color: '#C1FF00', effect: 'wider paddle', dur: 10 },
    twofa: { label: '2FA Ball', color: '#4DA3FF', effect: 'extra ball', dur: 0 },
    ratelimiter: { label: 'Rate Limiter', color: '#FFB020', effect: 'slow ball', dur: 8 }
  };
  var POWERUP_KEYS = ['shield', 'twofa', 'ratelimiter'];

  /* ---- DOM ------------------------------------------------------------ */
  var canvas = document.getElementById('gameCanvas');
  var ctx = canvas.getContext('2d');
  var shell = document.getElementById('fbStage');
  var hud = document.getElementById('hud');
  var startScreen = document.getElementById('startScreen');
  var pauseScreen = document.getElementById('pauseScreen');
  var gameOverScreen = document.getElementById('gameOverScreen');
  var levelIntro = document.getElementById('levelIntro');
  var introEyebrow = document.getElementById('introEyebrow');
  var introTitle = document.getElementById('introTitle');
  var introSub = document.getElementById('introSub');

  var startButton = document.getElementById('startButton');
  var restartButton = document.getElementById('restartButton');
  var resumeButton = document.getElementById('resumeButton');
  var quitButton = document.getElementById('quitButton');

  var scoreEl = document.getElementById('score');
  var bestScoreEl = document.getElementById('bestScore');
  var levelEl = document.getElementById('level');
  var livesEl = document.getElementById('lives');
  var comboBadge = document.getElementById('comboBadge');

  var resultEyebrow = document.getElementById('resultEyebrow');
  var resultTitle = document.getElementById('resultTitle');
  var resultStars = document.getElementById('resultStars');
  var finalScoreEl = document.getElementById('finalScore');
  var finalComboEl = document.getElementById('finalCombo');
  var finalLevelEl = document.getElementById('finalLevel');
  var overBestScoreEl = document.getElementById('overBestScore');
  var overStarsEl = document.getElementById('overStars');

  /* ---- SVG icons (static, template-controlled markup) ----------------- */
  var SHIELD_SPENT = 'fb-lives__shield fb-lives__shield--spent';
  function shieldSvg(spent) {
    return '<svg class="' + (spent ? SHIELD_SPENT : 'fb-lives__shield') + '" viewBox="0 0 24 28" aria-hidden="true"><path fill="currentColor" d="M12 1 L22 5 V13 C22 20 17 25 12 27 C7 25 2 20 2 13 V5 Z"/></svg>';
  }
  var STAR_PATH = 'M12 2 l2.9 6.3 6.9 .7 -5.1 4.7 1.4 6.8 -6-3.5 -6 3.5 1.4 -6.8 -5.1 -4.7 6.9 -.7 Z';
  function starSvg(on) {
    return '<svg class="fb-stars__star' + (on ? ' fb-stars__star--on' : '') + '" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="' + STAR_PATH + '"/></svg>';
  }

  /* ---- state ---------------------------------------------------------- */
  var W = 0, H = 0;
  var gameState = 'START';
  var testEndless = false;

  var score = 0, lives = START_LIVES, level = 1;
  var combo = 0, peakCombo = 0, runPeakCombo = 0;
  var livesLostThisLevel = 0, levelPeakCombo = 0;
  var lastStars = 0;
  var transitioning = false, clearing = false;
  var flashPaddle = 0;
  var gameTime = 0;
  var lastTs = 0;
  var introHideTimer = null;

  var paddle = { x: 0, y: 0, w: 0, baseW: 0, h: 0 };
  var balls = [];
  var blocks = [];
  var powerups = [];
  var pendingChain = [];
  var powerTimers = { shield: 0, ratelimiter: 0 };
  var rateApplied = false;
  var curCols = 9, curRows = 3;

  var hs = null, best = 0;
  var starsMap = readStars();

  /* ---- persistence ---------------------------------------------------- */
  if (HAS_JUICE && J.highscore) {
    hs = J.highscore('firewall-breaker-dodo', ['dodo_firewall_breaker_highscore']);
    best = hs.best;
  } else {
    best = parseInt(localStorage.getItem('dodo_firewall-breaker-dodo_highscore') || localStorage.getItem('dodo_firewall_breaker_highscore') || '0', 10) || 0;
  }

  function readStars() {
    try {
      var raw = localStorage.getItem(STARS_KEY);
      var obj = raw ? JSON.parse(raw) : {};
      return (obj && typeof obj === 'object') ? obj : {};
    } catch (e) { return {}; }
  }
  function writeStars() { try { localStorage.setItem(STARS_KEY, JSON.stringify(starsMap)); } catch (e) {} }
  function totalStars() {
    var t = 0;
    for (var k in starsMap) { if (Object.prototype.hasOwnProperty.call(starsMap, k)) t += (starsMap[k] | 0); }
    return t;
  }

  /* ---- helpers -------------------------------------------------------- */
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function play(cue, opts) { if (J && J.audio) J.audio.play(cue, opts); }
  function emit(preset, x, y, opts) { if (J && J.particles) J.particles.emit(preset, x, y, opts); }
  function shake(intensity, ms) { if (J) J.shake(canvas, intensity, ms); }

  function cssPoint(logicalX, logicalY) {
    var r = canvas.getBoundingClientRect();
    return { x: r.left + logicalX, y: r.top + logicalY };
  }
  function floatQuip(logicalX, logicalY, text, color) {
    if (!J || !J.floatText) return;
    var p = cssPoint(logicalX, logicalY);
    J.floatText(p.x, p.y, text, { color: color || '#C1FF00', size: 18 });
  }

  /* ---- DPI-aware sizing ---------------------------------------------- */
  function resize() {
    var dpr = window.devicePixelRatio || 1;
    var availW = shell.clientWidth || window.innerWidth;
    var availH = shell.clientHeight || window.innerHeight;
    var margin = 14;
    var maxW = availW - margin * 2;
    var maxH = availH - margin * 2;
    var aspect = 0.72; // w / h — portrait court
    var cssW = Math.min(maxW, maxH * aspect);
    var cssH = cssW / aspect;
    if (cssH > maxH) { cssH = maxH; cssW = cssH * aspect; }
    cssW = Math.max(240, Math.floor(cssW));
    cssH = Math.max(320, Math.floor(cssH));

    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    W = cssW; H = cssH;
    layoutPaddle();
    layoutBlocks();
  }

  function layoutPaddle() {
    var prevRatio = paddle.baseW ? (paddle.x + paddle.w / 2) / W : 0.5;
    paddle.baseW = Math.max(58, W * PADDLE_W_FRAC);
    paddle.w = powerTimers.shield > 0 ? paddle.baseW * 1.6 : paddle.baseW;
    paddle.h = clamp(H * 0.02, 9, 16);
    paddle.y = H - H * 0.058;
    paddle.x = clamp(prevRatio * W - paddle.w / 2, 0, W - paddle.w);
  }

  function layoutBlocks() {
    if (!blocks.length) return;
    var gap = Math.max(3, W * 0.008);
    var fieldTop = H * 0.085;
    var fieldBottom = H * 0.46;
    var bw = (W - gap * (curCols + 1)) / curCols;
    var rowH = (fieldBottom - fieldTop) / curRows;
    var bh = rowH - gap;
    for (var i = 0; i < blocks.length; i++) {
      var b = blocks[i];
      b.baseX = gap + b.col * (bw + gap);
      b.w = bw; b.h = bh;
      b.y = fieldTop + b.row * rowH;
      b.amp = b.moving ? bw * 0.85 : 0;
      if (!b.moving) b.x = b.baseX;
    }
  }

  /* ---- level loading -------------------------------------------------- */
  function loadLevel(n) {
    var data = LEVELS[clamp(n, 1, MAX_LEVELS) - 1];
    var map = data.map;
    curRows = map.length;
    curCols = map[0].length;
    blocks = [];
    for (var row = 0; row < curRows; row++) {
      var line = map[row];
      var moving = data.moving.indexOf(row) !== -1;
      for (var col = 0; col < curCols; col++) {
        var ch = line.charAt(col);
        if (ch === '.' || !BRICK[ch]) continue;
        var def = BRICK[ch];
        blocks.push({
          kind: ch, col: col, row: row,
          x: 0, baseX: 0, y: 0, w: 0, h: 0,
          hp: def.hp, maxHp: def.hp,
          shield: def.shield, maxShield: def.shield,
          color: def.color, score: def.score,
          explosive: !!def.explosive,
          moving: moving, amp: 0, phase: rnd(0, Math.PI * 2),
          alive: true
        });
      }
    }
    powerups = [];
    pendingChain = [];
    powerTimers.shield = 0; powerTimers.ratelimiter = 0; rateApplied = false;
    combo = 0; peakCombo = 0; levelPeakCombo = 0; livesLostThisLevel = 0;
    clearing = false;
    layoutPaddle();
    layoutBlocks();
    paddle.x = (W - paddle.w) / 2;
    spawnBall();
    showIntro(n, data);
    updateHud();
    updateComboBadge();
  }

  function showIntro(n, data) {
    if (!levelIntro) return;
    introEyebrow.textContent = 'Layer ' + n + ' / ' + MAX_LEVELS;
    introTitle.textContent = data.name;
    introSub.textContent = data.sub;
    levelIntro.hidden = false;
    levelIntro.classList.remove('da-anim-pop');
    void levelIntro.offsetWidth;
    levelIntro.classList.add('da-anim-pop');
    if (introHideTimer) clearTimeout(introHideTimer);
    introHideTimer = setTimeout(function () { if (levelIntro) levelIntro.hidden = true; }, 1600);
  }

  /* ---- ball ----------------------------------------------------------- */
  function ballSpeed() { return H * Math.min(0.95, 0.6 + (level - 1) * 0.032); }

  function makeBall(x, y, dir) {
    var r = Math.max(5, W * BALL_R_FRAC);
    var speed = ballSpeed();
    var ang = rnd(-0.4, 0.4);
    return {
      x: x, y: y, r: r,
      vx: Math.sin(ang) * speed * (dir || 1),
      vy: -Math.abs(Math.cos(ang) * speed),
      speed: speed
    };
  }
  function spawnBall() {
    var r = Math.max(5, W * BALL_R_FRAC);
    balls = [makeBall(paddle.x + paddle.w / 2, paddle.y - r - 2, Math.random() < 0.5 ? 1 : -1)];
  }

  /* ---- combo ---------------------------------------------------------- */
  function comboTier() { return combo >= 9 ? 3 : combo >= 5 ? 2 : combo >= 2 ? 1 : 0; }
  function updateComboBadge() {
    var t = comboTier();
    if (t === 0) { comboBadge.hidden = true; return; }
    comboBadge.hidden = false;
    comboBadge.textContent = 'COMBO ×' + combo;
    comboBadge.className = 'da-combo-badge fb-combo da-combo-badge--t' + t;
  }
  function resetCombo(viaPaddle) {
    if (combo >= 2 && viaPaddle) {
      var pitch = 1 + clamp(combo, 0, 12) * 0.04;
      play('tap', { pitch: pitch });
    }
    combo = 0;
    updateComboBadge();
  }

  /* ---- brick destruction --------------------------------------------- */
  function hitBlock(block) {
    if (block.shield > 0) {
      block.shield -= 1;
      play('tap', { pitch: 1.3 });
      emit('sparkle', block.x + block.w / 2, block.y + block.h / 2, { count: 8, color: block.color });
      if (J && J.haptics) J.haptics.tap();
      return;
    }
    block.hp -= 1;
    if (block.hp > 0) {
      play('hit', { pitch: 1.05, volume: 0.7 });
      emit('sparkle', block.x + block.w / 2, block.y + block.h / 2, { count: 6, color: block.color });
      return;
    }
    destroyBlock(block, false);
  }

  function destroyBlock(block, viaChain) {
    if (!block.alive) return;
    block.alive = false;
    combo += 1;
    if (combo > peakCombo) peakCombo = combo;
    if (combo > levelPeakCombo) levelPeakCombo = combo;
    if (combo > runPeakCombo) runPeakCombo = combo;

    var mult = 1 + Math.min(combo, 20) * 0.12;
    var pts = Math.round(block.score * mult);
    score += pts;

    var cx = block.x + block.w / 2;
    var cy = block.y + block.h / 2;
    var pitch = 1 + Math.min(combo, 14) * 0.03;
    play('hit', { pitch: pitch });
    if (combo >= 2 && combo % 3 === 0) play('combo', { pitch: pitch });

    if (block.explosive) {
      emit('explosion', cx, cy, { count: 26, color: block.color });
    } else {
      emit('burst', cx, cy, { count: 8 + Math.min(combo, 14), color: block.color });
    }
    shake(clamp(3 + combo * 1.1, 3, 18), 150);
    if (combo >= 3 || pts >= 45) floatQuip(cx, cy, '+' + pts, block.color);

    if (!viaChain && Math.random() < 0.16) spawnPowerup(block);
    else if (viaChain && Math.random() < 0.10) spawnPowerup(block);

    updateComboBadge();
    updateHud();

    if (block.explosive) scheduleChain(block);
  }

  function scheduleChain(block) {
    var cx = block.x + block.w / 2;
    var cy = block.y + block.h / 2;
    var radius = Math.max(block.w, block.h) * 1.5;
    for (var i = 0; i < blocks.length; i++) {
      var nb = blocks[i];
      if (!nb.alive || nb === block) continue;
      var dx = (nb.x + nb.w / 2) - cx;
      var dy = (nb.y + nb.h / 2) - cy;
      if (dx * dx + dy * dy <= radius * radius) {
        pendingChain.push({ block: nb, at: gameTime + 0.07 });
      }
    }
  }

  function processChain() {
    if (!pendingChain.length) return;
    var still = [];
    for (var i = 0; i < pendingChain.length; i++) {
      var e = pendingChain[i];
      if (e.at <= gameTime) {
        if (e.block.alive) destroyBlock(e.block, true);
      } else {
        still.push(e);
      }
    }
    pendingChain = still;
  }

  /* ---- power-ups ------------------------------------------------------ */
  function spawnPowerup(block) {
    var type = POWERUP_KEYS[(Math.random() * POWERUP_KEYS.length) | 0];
    powerups.push({
      type: type,
      x: block.x + block.w / 2,
      y: block.y + block.h,
      r: Math.max(14, W * 0.042),
      vy: H * 0.28,
      t: 0
    });
    emit('sparkle', block.x + block.w / 2, block.y + block.h, { count: 8, color: POWERUPS[type].color });
  }

  function collectPowerup(pu) {
    var def = POWERUPS[pu.type];
    play('powerup');
    emit('burst', pu.x, pu.y, { count: 18, color: def.color });
    emit('sparkle', pu.x, pu.y, { count: 14, color: def.color });
    floatQuip(pu.x, pu.y - 8, def.label + '!', def.color);
    flashPaddle = 1;
    if (J && J.flash) J.flash(canvas, def.color, 160);
    if (J && J.haptics) J.haptics.success();
    if (typeof DodoAnalytics !== 'undefined') DodoAnalytics.powerUp(GAME_NAME, def.label);
    applyPowerup(pu.type);
  }

  function applyPowerup(type) {
    if (type === 'shield') {
      powerTimers.shield = POWERUPS.shield.dur;
      layoutPaddle();
    } else if (type === 'twofa') {
      var src = balls[0] || makeBall(paddle.x + paddle.w / 2, paddle.y - 20, -1);
      var nb = makeBall(src.x, src.y, -1);
      nb.r = src.r;
      nb.vx = -src.vx || Math.sin(0.5) * ballSpeed();
      nb.vy = -Math.abs(nb.vy);
      balls.push(nb);
    } else if (type === 'ratelimiter') {
      if (!rateApplied) {
        for (var i = 0; i < balls.length; i++) { balls[i].vx *= 0.6; balls[i].vy *= 0.6; balls[i].speed *= 0.6; }
        rateApplied = true;
      }
      powerTimers.ratelimiter = POWERUPS.ratelimiter.dur;
    }
  }

  function updatePowerTimers(dt) {
    if (powerTimers.shield > 0) {
      powerTimers.shield -= dt;
      if (powerTimers.shield <= 0) { powerTimers.shield = 0; layoutPaddle(); }
    }
    if (powerTimers.ratelimiter > 0) {
      powerTimers.ratelimiter -= dt;
      if (powerTimers.ratelimiter <= 0) {
        powerTimers.ratelimiter = 0;
        if (rateApplied) {
          for (var i = 0; i < balls.length; i++) { balls[i].vx /= 0.6; balls[i].vy /= 0.6; balls[i].speed /= 0.6; }
          rateApplied = false;
        }
      }
    }
  }

  function updatePowerups(dt) {
    var next = [];
    for (var i = 0; i < powerups.length; i++) {
      var pu = powerups[i];
      pu.y += pu.vy * dt;
      pu.t += dt;
      var caught = pu.y + pu.r * 0.5 >= paddle.y &&
        pu.x >= paddle.x - pu.r * 0.4 && pu.x <= paddle.x + paddle.w + pu.r * 0.4 &&
        pu.y - pu.r * 0.5 <= paddle.y + paddle.h;
      if (caught) { collectPowerup(pu); continue; }
      if (pu.y < H + pu.r) next.push(pu);
    }
    powerups = next;
  }

  /* ---- physics -------------------------------------------------------- */
  function updateBall(b, dt) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;

    if (b.x - b.r < 0) { b.x = b.r; b.vx = Math.abs(b.vx); play('tap', { pitch: rnd(0.9, 1.1), volume: 0.5 }); }
    else if (b.x + b.r > W) { b.x = W - b.r; b.vx = -Math.abs(b.vx); play('tap', { pitch: rnd(0.9, 1.1), volume: 0.5 }); }
    if (b.y - b.r < 0) { b.y = b.r; b.vy = Math.abs(b.vy); play('tap', { pitch: rnd(0.9, 1.1), volume: 0.5 }); }

    // paddle collision with english
    if (b.vy > 0 && b.y + b.r >= paddle.y && b.y - b.r <= paddle.y + paddle.h &&
        b.x >= paddle.x - b.r && b.x <= paddle.x + paddle.w + b.r) {
      var speed = b.speed;
      var hitPos = (b.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
      hitPos = clamp(hitPos, -1, 1);
      b.vx = hitPos * speed * 0.78;
      var vy = Math.sqrt(Math.max(speed * speed * 0.12, speed * speed - b.vx * b.vx));
      b.vy = -vy;
      b.y = paddle.y - b.r - 0.5;
      resetCombo(true);
      flashPaddle = 1;
      emit('sparkle', b.x, paddle.y, { count: 5, color: '#C1FF00' });
      if (J && J.haptics) J.haptics.tap();
    }

    // brick collision (one per frame)
    for (var i = 0; i < blocks.length; i++) {
      var block = blocks[i];
      if (!block.alive) continue;
      var closestX = clamp(b.x, block.x, block.x + block.w);
      var closestY = clamp(b.y, block.y, block.y + block.h);
      var ddx = b.x - closestX, ddy = b.y - closestY;
      if (ddx * ddx + ddy * ddy <= b.r * b.r) {
        var prevX = b.x - b.vx * dt, prevY = b.y - b.vy * dt;
        var wasOutY = prevY < block.y || prevY > block.y + block.h;
        var wasOutX = prevX < block.x || prevX > block.x + block.w;
        if (wasOutY) b.vy = -b.vy;
        else if (wasOutX) b.vx = -b.vx;
        else b.vy = -b.vy;
        hitBlock(block);
        break;
      }
    }

    // ball trail — emitted every frame (drives juice)
    emit('trail', b.x, b.y, { count: 2, color: '#C1FF00' });

    return b.y - b.r <= H + b.r * 2;
  }

  function update(dt) {
    if (gameState !== 'PLAYING') return;
    gameTime += dt;
    if (flashPaddle > 0) flashPaddle = Math.max(0, flashPaddle - dt * 4);

    updatePaddle(dt);
    updatePowerTimers(dt);

    for (var i = 0; i < blocks.length; i++) {
      var b = blocks[i];
      if (b.moving && b.alive) {
        b.phase += dt * 1.1;
        b.x = clamp(b.baseX + Math.sin(b.phase) * b.amp, 0, W - b.w);
      }
    }

    if (transitioning) return;

    updatePowerups(dt);
    processChain();

    var alive = [];
    for (var k = 0; k < balls.length; k++) {
      if (updateBall(balls[k], dt)) alive.push(balls[k]);
    }
    balls = alive;

    if (!balls.length) { loseLife(); return; }

    maybeLevelClear();
  }

  /* ---- level clear / life loss / game over ---------------------------- */
  function maybeLevelClear() {
    if (clearing || transitioning) return;
    for (var i = 0; i < blocks.length; i++) { if (blocks[i].alive) return; }
    levelClear();
  }

  function computeStars() {
    var stars = 1;
    if (livesLostThisLevel === 0) stars = 2;
    if (livesLostThisLevel === 0 && levelPeakCombo >= 6) stars = 3;
    lastStars = stars;
    var key = String(level);
    if ((starsMap[key] | 0) < stars) { starsMap[key] = stars; writeStars(); }
    return stars;
  }

  function levelClear() {
    clearing = true;
    computeStars();
    play('win');
    emit('confetti', W / 2, H * 0.4, { count: 38 });
    shake(8, 320);
    if (J && J.haptics) J.haptics.success();

    if (typeof DodoAnalytics !== 'undefined') DodoAnalytics.waveComplete(GAME_NAME, level);

    if (testEndless) {
      transitioning = true;
      setTimeout(function () {
        if (gameState !== 'PLAYING') return;
        loadLevel(level);
        transitioning = false;
        clearing = false;
      }, 500);
      return;
    }

    if (level >= MAX_LEVELS) { endGame(true); return; }

    transitioning = true;
    balls = [];
    powerups = [];
    setTimeout(function () {
      if (gameState !== 'PLAYING') return;
      level += 1;
      loadLevel(level);
      transitioning = false;
    }, 850);
  }

  function loseLife() {
    combo = 0;
    updateComboBadge();
    livesLostThisLevel += 1;
    play('fail');
    shake(10, 320);
    emit('explosion', paddle.x + paddle.w / 2, H - H * 0.02, { count: 24, color: '#FF4757' });
    if (J && J.haptics) J.haptics.fail();

    if (testEndless) { spawnBall(); return; }

    lives -= 1;
    updateLives();
    if (lives <= 0) { endGame(false); return; }
    spawnBall();
  }

  function endGame(won) {
    if (gameState !== 'PLAYING') return;
    gameState = 'GAME_OVER';
    transitioning = false;

    var prevBest = best;
    if (hs) { hs.set(score); best = hs.best; }
    else if (score > best) { best = score; try { localStorage.setItem('dodo_firewall-breaker-dodo_highscore', String(best)); } catch (e) {} }

    if (typeof DodoAnalytics !== 'undefined') {
      DodoAnalytics.gameOver(GAME_NAME, score, { level: level, best_combo: runPeakCombo });
      if (score > prevBest) DodoAnalytics.newHighScore(GAME_NAME, score);
    }

    if (!won) lastStars = starsMap[String(level)] | 0;

    resultEyebrow.textContent = won ? 'All Layers Breached' : 'Breach Report';
    resultTitle.textContent = won ? 'Firewall Breached!' : 'Firewall Held';
    renderStars(resultStars, lastStars);
    finalScoreEl.textContent = String(score);
    finalComboEl.textContent = '×' + runPeakCombo;
    finalLevelEl.textContent = won ? MAX_LEVELS + '/' + MAX_LEVELS : level + '/' + MAX_LEVELS;
    overBestScoreEl.textContent = String(best);
    overStarsEl.textContent = String(totalStars());
    updateHud();
    setScreen('GAME_OVER');

    if (won) { play('win'); emit('confetti', W / 2, H / 2, { count: 46 }); if (J && J.haptics) J.haptics.success(); }
    else { play('gameover'); emit('explosion', W / 2, H * 0.45, { count: 34, color: '#FF4757' }); shake(14, 420); if (J && J.haptics) J.haptics.fail(); }
  }

  /* ---- paddle input --------------------------------------------------- */
  function updatePaddle(dt) {
    var speed = KEY_SPEED * W * dt;
    if (keys.left) paddle.x -= speed;
    if (keys.right) paddle.x += speed;
    if (pointerActive && pointerX != null) {
      var target = pointerX - paddle.w / 2;
      paddle.x += (target - paddle.x) * Math.min(1, dt * 22);
    }
    paddle.x = clamp(paddle.x, 0, W - paddle.w);
  }

  /* ---- render --------------------------------------------------------- */
  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#060a04';
    ctx.fillRect(0, 0, W, H);

    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, 'rgba(77,163,255,0.05)');
    g.addColorStop(0.5, 'rgba(193,255,0,0.02)');
    g.addColorStop(1, 'rgba(193,255,0,0.05)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.globalAlpha = 0.06;
    ctx.fillStyle = '#C1FF00';
    ctx.font = '900 ' + Math.round(W * 0.14) + 'px system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('DODO', W / 2, H * 0.66);
    ctx.restore();

    for (var i = 0; i < blocks.length; i++) { if (blocks[i].alive) drawBlock(blocks[i]); }
    for (var p = 0; p < powerups.length; p++) drawPowerup(powerups[p]);
    drawPaddle();
    for (var k = 0; k < balls.length; k++) drawBall(balls[k]);

    if (J && J.particles) J.particles.draw(ctx);
  }

  function drawBlock(block) {
    var alpha = 0.55 + 0.45 * (block.hp / block.maxHp);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = block.color;
    ctx.shadowColor = block.color;
    ctx.shadowBlur = 8;
    roundRect(block.x, block.y, block.w, block.h, 3);
    ctx.fill();
    ctx.restore();

    if (block.explosive) {
      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = '#050505';
      ctx.font = '800 ' + Math.round(block.h * 0.8) + 'px system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('!', block.x + block.w / 2, block.y + block.h / 2 + 0.5);
      ctx.restore();
    }

    if (block.shield > 0) {
      ctx.save();
      ctx.strokeStyle = '#ffffff';
      ctx.globalAlpha = 0.85;
      ctx.lineWidth = 2;
      ctx.shadowColor = block.color;
      ctx.shadowBlur = 10;
      roundRect(block.x + 1.5, block.y + 1.5, block.w - 3, block.h - 3, 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawPaddle() {
    var r = Math.min(paddle.h / 2, 8);
    ctx.save();
    ctx.shadowColor = '#C1FF00';
    ctx.shadowBlur = flashPaddle > 0.5 ? 28 : 12;
    ctx.fillStyle = flashPaddle > 0.5 ? '#ffffff' : '#C1FF00';
    roundRect(paddle.x, paddle.y, paddle.w, paddle.h, r);
    ctx.fill();
    ctx.restore();
  }

  function drawBall(b) {
    ctx.save();
    ctx.shadowColor = '#C1FF00';
    ctx.shadowBlur = 16;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawPowerup(pu) {
    var def = POWERUPS[pu.type];
    var pulse = 1 + Math.sin(pu.t * 7) * 0.08;
    ctx.save();
    ctx.translate(pu.x, pu.y);
    ctx.scale(pulse, pulse);
    ctx.rotate(Math.sin(pu.t * 3) * 0.15);
    ctx.shadowColor = def.color;
    ctx.shadowBlur = 18;
    ctx.fillStyle = 'rgba(5,5,5,0.9)';
    ctx.strokeStyle = def.color;
    ctx.lineWidth = 2.5;
    roundRect(-pu.r, -pu.r * 0.62, pu.r * 2, pu.r * 1.24, 5);
    ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = def.color;
    ctx.font = '800 ' + Math.round(pu.r * 0.62) + 'px system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(def.label.split(' ')[0].toUpperCase(), 0, 1);
    ctx.restore();
  }

  function roundRect(x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /* ---- HUD ------------------------------------------------------------ */
  function updateHud() {
    scoreEl.textContent = String(score);
    bestScoreEl.textContent = String(Math.max(best, score));
    levelEl.textContent = level + '/' + MAX_LEVELS;
    scoreEl.classList.remove('da-score--pop');
    void scoreEl.offsetWidth;
    scoreEl.classList.add('da-score--pop');
  }

  function updateLives() {
    var html = '';
    for (var i = 0; i < START_LIVES; i++) html += shieldSvg(i >= lives);
    livesEl.innerHTML = html;
  }

  function renderStars(container, count) {
    var html = '';
    for (var i = 0; i < 3; i++) html += starSvg(i < count);
    container.innerHTML = html;
  }

  /* ---- screens -------------------------------------------------------- */
  function setScreen(state) {
    startScreen.hidden = state !== 'START';
    pauseScreen.hidden = state !== 'PAUSED';
    gameOverScreen.hidden = state !== 'GAME_OVER';
    hud.hidden = (state === 'START');
    if (state !== 'PLAYING' && levelIntro) levelIntro.hidden = true;
  }

  function startGame() {
    resize();
    gameState = 'PLAYING';
    testEndless = false;
    transitioning = false;
    score = 0; lives = START_LIVES; level = 1;
    combo = 0; peakCombo = 0; runPeakCombo = 0; lastStars = 0;
    gameTime = 0;
    updateLives();
    loadLevel(1);
    setScreen('PLAYING');
    if (typeof DodoAnalytics !== 'undefined') DodoAnalytics.gameStart(GAME_NAME);
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

  /* ---- input ---------------------------------------------------------- */
  var keys = { left: false, right: false };
  var pointerActive = false;
  var pointerX = null;

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
  function handlePointer(clientX, clientY, lowerOnly) {
    if (gameState !== 'PLAYING') return;
    var pt = pointerToCourt(clientX, clientY);
    if (lowerOnly && pt.y < H * 0.5) return; // touch drives from lower half
    pointerActive = true;
    pointerX = clamp(pt.x, 0, W);
  }

  canvas.addEventListener('mousemove', function (e) {
    if (gameState !== 'PLAYING') return;
    var pt = pointerToCourt(e.clientX, e.clientY);
    pointerActive = true;
    pointerX = clamp(pt.x, 0, W);
  });
  canvas.addEventListener('mouseleave', function () { pointerActive = false; });

  canvas.addEventListener('touchstart', function (e) {
    if (e.touches && e.touches.length) handlePointer(e.touches[0].clientX, e.touches[0].clientY, true);
  }, { passive: true });
  canvas.addEventListener('touchmove', function (e) {
    e.preventDefault();
    if (e.touches && e.touches.length) handlePointer(e.touches[0].clientX, e.touches[0].clientY, true);
  }, { passive: false });
  canvas.addEventListener('touchend', function () { pointerActive = false; });

  startButton.addEventListener('click', startGame);
  restartButton.addEventListener('click', startGame);
  if (resumeButton) resumeButton.addEventListener('click', resumeGame);
  if (quitButton) quitButton.addEventListener('click', function () { gameState = 'START'; setScreen('START'); });

  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', function () { setTimeout(resize, 150); });

  if (J && J.muteButton) J.muteButton(document.body);
  if (J && J.particles && J.particles.attach) J.particles.attach(canvas, ctx);

  /* ---- test hooks (test-only steering; never used by real gameplay) --- */
  function firstAliveBlock() {
    for (var i = 0; i < blocks.length; i++) { if (blocks[i].alive) return blocks[i]; }
    return null;
  }
  window.FirewallBreakerTest = {
    breakBrick: function () {
      if (gameState !== 'PLAYING') return;
      var b = firstAliveBlock();
      if (!b && testEndless) { loadLevel(level); b = firstAliveBlock(); }
      if (b) { b.shield = 0; b.hp = 1; destroyBlock(b, false); }
    },
    pulse: function () {
      if (gameState !== 'PLAYING') return;
      for (var i = 0; i < 3; i++) {
        var b = firstAliveBlock();
        if (!b && testEndless) { loadLevel(level); b = firstAliveBlock(); }
        if (b) { b.shield = 0; b.hp = 1; destroyBlock(b, false); }
      }
      resetCombo(true);       // 'tap' (pitch by combo)
      this.spawnAndPickup();  // 'powerup'
      this.loseLifeBeat();    // 'fail'
      play('tick');           // extra distinct UI cue
    },
    spawnAndPickup: function () {
      var type = POWERUP_KEYS[(Math.random() * POWERUP_KEYS.length) | 0];
      collectPowerup({ type: type, x: paddle.x + paddle.w / 2, y: paddle.y - 20, r: 16, t: 0, vy: 0 });
    },
    loseLifeBeat: function () {
      var prev = testEndless;
      testEndless = true;
      loseLife();
      testEndless = prev;
    },
    setEndless: function (v) { testEndless = !!v; },
    forceGameOver: function () { testEndless = false; if (gameState === 'PLAYING') endGame(false); },
    forceLevelClear: function () {
      if (gameState !== 'PLAYING') return;
      for (var i = 0; i < blocks.length; i++) blocks[i].alive = false;
      levelClear();
    },
    getScore: function () { return score; },
    getLevel: function () { return level; },
    getState: function () { return gameState; }
  };

  /* ---- boot ----------------------------------------------------------- */
  resize();
  updateLives();
  updateHud();
  setScreen('START');
  requestAnimationFrame(frame);
})();
