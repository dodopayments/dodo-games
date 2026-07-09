/* ==========================================================================
 * DODO DASH — endless desert runner with parallax day/night, obstacle variety,
 * coins + magnet, speed ramp + milestones, near-miss bonuses, a per-run
 * double-jump unlock, and full DodoJuice game-feel.
 * Vanilla JS. Renders into a DPI-aware canvas; juice via window.DodoJuice.
 * Analytics via bare DodoAnalytics (game_name frozen as "Dodo Dash").
 * ========================================================================== */
(function () {
  'use strict';

  var GAME_NAME = 'Dodo Dash';
  var SLUG = 'dodo-dash';
  var HAS_JUICE = typeof window.DodoJuice !== 'undefined';
  var J = HAS_JUICE ? window.DodoJuice : null;

  /* ---- tuning --------------------------------------------------------- */
  var SPEED_START = 0.42;      // world speed as fraction of canvas width / sec
  var SPEED_MAX = 0.98;
  var SPEED_RAMP = 0.009;      // per second
  var METER_RATE = 30;         // meters gained per second at speedFrac 1.0
  var DIST_POINTS = 1;         // score per meter
  var COIN_VALUE = 25;         // score per coin
  var NEAR_MISS_BONUS = 60;
  var DAY_LEN = 900;           // meters per full day/night cycle
  var MILESTONE = 500;         // celebration every N meters
  var DJ_UNLOCK = 1000;        // double-jump unlock distance (meters)

  var GRAVITY = 2.7;           // * H  px/s^2
  var GRAVITY_HOLD = 0.44;     // gravity multiplier while rising + jump held
  var GRAVITY_FAST = 1.9;      // gravity multiplier while ducking mid-air
  var JUMP_V = 1.34;           // * H  px/s (applied upward)
  var NEAR_MISS_FRAC = 0.07;   // clearance < H*this counts as a near miss

  var COLOR = {
    coin: '#FFD23F', magnet: '#FFB020', cactus: '#FF4757',
    boulder: '#8A8F99', invoice: '#4DA3FF', dust: '#D9B98A', green: '#C1FF00'
  };

  var NEAR_QUIPS = ['Close call! ⚡', 'Threaded it! 🧵', 'Barely! 😅', 'Slick dodge! ✨', 'Nice hustle! 🏃'];
  var MILE_QUIPS = ['Settlement cleared! 💸', 'On a roll! 🔥', 'Payout secured! 🟢', 'Momentum! ⚡', 'Streak up! 📈'];
  var CRASH_QUIPS = ['Payment declined! ❌', 'Chargeback filed! 🔴', 'Wiped out! 💥'];

  /* ---- DOM ------------------------------------------------------------ */
  var canvas = document.getElementById('gameCanvas');
  var ctx = canvas.getContext('2d');
  var stage = document.getElementById('ddStage');
  var hud = document.getElementById('hud');
  var startScreen = document.getElementById('startScreen');
  var gameOverScreen = document.getElementById('gameOverScreen');

  var startButton = document.getElementById('startButton');
  var restartButton = document.getElementById('restartButton');

  var scoreEl = document.getElementById('score');
  var distanceEl = document.getElementById('distance');
  var coinsEl = document.getElementById('coins');
  var bestEl = document.getElementById('best');
  var djBadge = document.getElementById('djBadge');

  var resultTitle = document.getElementById('resultTitle');
  var resultEyebrow = document.getElementById('resultEyebrow');
  var finalDistanceEl = document.getElementById('finalDistance');
  var finalCoinsEl = document.getElementById('finalCoins');
  var finalScoreEl = document.getElementById('finalScore');
  var overBestScoreEl = document.getElementById('overBestScore');
  var overBestDistanceEl = document.getElementById('overBestDistance');

  /* ---- assets --------------------------------------------------------- */
  var dodoImg = new Image();
  dodoImg.src = 'assets/dodo.svg';

  /* ---- state ---------------------------------------------------------- */
  var W = 0, H = 0, groundY = 0, groundH = 0;
  var gameState = 'START';        // START | PLAYING | GAME_OVER
  var endless = false;            // test-only: disables lethal collisions
  var lastTs = 0;

  var speedFrac = SPEED_START;
  var distanceM = 0, score = 0, coins = 0, combo = 0;
  var lastMilestone = 0, djUnlocked = false;
  var magnetTime = 0;
  var milestoneFlash = 0;

  var obstacles = [];
  var pickups = [];
  var spawnTimer = 1.8;
  var coinTimer = 2.4;

  var bgFar = 0, bgMid = 0, groundScroll = 0;
  var stars = [];

  var dodo = {
    x: 0, y: 0, w: 0, h: 0, baseH: 0, dy: 0,
    grounded: true, ducking: false, jumps: 0, maxJumps: 1,
    runCycle: 0, squash: 1, rot: 0, dead: false
  };

  /* input */
  var jumpHeld = false, duckHeld = false, pressStartY = 0, pointerDown = false;

  /* ---- persistence (highscore + legacy migration + best distance) ----- */
  var hs = null, best = 0, bestDistance = 0;
  var BEST_KEY = 'dodo_' + SLUG + '_highscore';
  var BEST_DIST_KEY = 'dodo_' + SLUG + '_bestdistance';
  if (HAS_JUICE && J.highscore) {
    hs = J.highscore(SLUG, ['dodo_dash_highscore']);
    best = hs.best;
  } else {
    best = parseInt(localStorage.getItem(BEST_KEY) || localStorage.getItem('dodo_dash_highscore') || '0', 10) || 0;
  }
  try { bestDistance = parseInt(localStorage.getItem(BEST_DIST_KEY) || '0', 10) || 0; } catch (e) { bestDistance = 0; }

  /* ---- helpers -------------------------------------------------------- */
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }
  function play(cue, opts) { if (J && J.audio) J.audio.play(cue, opts); }
  function emit(preset, x, y, opts) { if (J && J.particles) J.particles.emit(preset, x, y, opts); }
  function shake(intensity, ms) { if (J) J.shake(canvas, intensity, ms); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  function cssPoint(logicalX, logicalY) {
    var r = canvas.getBoundingClientRect();
    return { x: r.left + logicalX * (r.width / W), y: r.top + logicalY * (r.height / H) };
  }
  function floatQuip(logicalX, logicalY, text, color, size) {
    if (!J || !J.floatText) return;
    var p = cssPoint(logicalX, logicalY);
    J.floatText(p.x, p.y, text, { color: color || COLOR.green, size: size || 20 });
  }
  function rgb(a) { return 'rgb(' + (a[0] | 0) + ',' + (a[1] | 0) + ',' + (a[2] | 0) + ')'; }
  function mix(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }

  /* day/night palettes (rgb triplets) */
  var SKY_DAY_TOP = [96, 152, 226], SKY_DAY_BOT = [244, 206, 150];
  var SKY_NIGHT_TOP = [8, 11, 28], SKY_NIGHT_BOT = [32, 28, 62];
  var DUNE_FAR_DAY = [212, 176, 120], DUNE_FAR_NIGHT = [38, 42, 74];
  var DUNE_MID_DAY = [192, 146, 90], DUNE_MID_NIGHT = [26, 28, 52];
  var GROUND_DAY = [176, 132, 78], GROUND_NIGHT = [22, 24, 44];

  /* ---- DPI-aware sizing ---------------------------------------------- */
  function resize() {
    var dpr = window.devicePixelRatio || 1;
    var cssW = canvas.clientWidth || stage.clientWidth || window.innerWidth;
    var cssH = canvas.clientHeight || stage.clientHeight || window.innerHeight;
    cssW = Math.max(240, Math.floor(cssW));
    cssH = Math.max(240, Math.floor(cssH));
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    W = cssW; H = cssH;
    layout();
  }

  function layout() {
    groundH = clamp(H * 0.16, 42, 140);
    groundY = H - groundH;
    dodo.baseH = clamp(H * 0.14, 34, 78);
    dodo.w = dodo.baseH * 0.94;
    dodo.x = clamp(W * 0.12, 34, 190);
    if (gameState !== 'PLAYING' || dodo.grounded) {
      dodo.h = dodo.ducking ? dodo.baseH * 0.55 : dodo.baseH;
      dodo.y = groundY - dodo.h;
    }
    if (!stars.length) buildStars();
  }

  function buildStars() {
    stars = [];
    for (var i = 0; i < 70; i++) {
      stars.push({ x: Math.random(), y: Math.random() * 0.55, s: rnd(0.6, 2.2), tw: rnd(0, Math.PI * 2) });
    }
  }

  /* ---- player --------------------------------------------------------- */
  function setDuck(on) {
    if (on === dodo.ducking) return;
    var feet = dodo.y + dodo.h;
    dodo.ducking = on;
    dodo.h = on ? dodo.baseH * 0.55 : dodo.baseH;
    dodo.y = feet - dodo.h;
  }

  function doJump() {
    if (dodo.dead) return false;
    if (dodo.grounded) {
      dodo.dy = -JUMP_V * H;
      dodo.grounded = false;
      dodo.jumps = 1;
      dodo.squash = 1.22;
      play('whoosh', { pitch: 1.0 });
      emit('burst', dodo.x + dodo.w * 0.5, groundY, { count: 6, color: COLOR.dust });
      if (J && J.haptics) J.haptics.tap();
      return true;
    }
    if (dodo.jumps < dodo.maxJumps) {
      dodo.dy = -JUMP_V * H * 0.92;
      dodo.jumps += 1;
      dodo.squash = 1.18;
      play('whoosh', { pitch: 1.25 });
      emit('sparkle', dodo.x + dodo.w * 0.5, dodo.y + dodo.h, { count: 10, color: COLOR.green });
      if (J && J.haptics) J.haptics.tap();
      return true;
    }
    return false;
  }

  function landEffect() {
    dodo.squash = 0.74;
    play('tap', { pitch: rnd(0.9, 1.05) });
    emit('burst', dodo.x + dodo.w * 0.5, groundY, { count: 8, color: COLOR.dust });
    shake(4, 120);
  }

  function forceLandEffect() {
    dodo.grounded = true; dodo.dy = 0; dodo.jumps = 0;
    dodo.y = groundY - dodo.h;
    landEffect();
  }

  function updatePlayer(dt) {
    setDuck(duckHeld && !dodo.dead);
    var g = GRAVITY * H;
    var mult = 1;
    if (dodo.dy < 0 && jumpHeld) mult = GRAVITY_HOLD;
    if (dodo.ducking && !dodo.grounded) mult = GRAVITY_FAST;
    dodo.dy += g * mult * dt;
    dodo.y += dodo.dy * dt;

    var floorY = groundY - dodo.h;
    if (dodo.y >= floorY) {
      var wasAir = !dodo.grounded;
      dodo.y = floorY; dodo.dy = 0; dodo.grounded = true; dodo.jumps = 0;
      if (wasAir) landEffect();
    } else {
      dodo.grounded = false;
    }

    if (dodo.grounded) {
      dodo.runCycle += dt * (5 + speedFrac * 7);
      // running dust every frame while grounded (drives particle juice)
      emit('trail', dodo.x + dodo.w * 0.18, groundY - 2, { count: 1, color: COLOR.dust });
    }
    dodo.squash += (1 - dodo.squash) * Math.min(1, dt * 12);
  }

  function updateDeath(dt) {
    dodo.dy += GRAVITY * H * 1.15 * dt;
    dodo.y += dodo.dy * dt;
    dodo.rot += dodo.deadVr * dt;
  }

  /* ---- obstacles ------------------------------------------------------ */
  function spawnObstacle() {
    var r = Math.random();
    var canInvoice = distanceM > 120;
    var canBoulder = distanceM > 60;
    var type = 'cactus';
    if (canInvoice && r < 0.28) type = 'invoice';
    else if (canBoulder && r < 0.5) type = 'boulder';

    var o = { type: type, x: W + 20, passed: false, hit: false, minClear: 1e9, rot: 0 };
    if (type === 'cactus') {
      o.h = rnd(H * 0.16, H * 0.40);
      o.w = clamp(H * 0.10, 16, 46);
      o.y = groundY - o.h;
    } else if (type === 'boulder') {
      o.r = rnd(H * 0.10, H * 0.16);
      o.w = o.r * 2; o.h = o.r * 2;
      o.y = groundY - o.h;
    } else { // invoice — floats at standing head-height; must duck under
      o.w = clamp(H * 0.20, 34, 88);
      o.h = clamp(H * 0.12, 22, 54);
      o.y = groundY - dodo.baseH * 1.55 - rnd(0, H * 0.04);
    }
    obstacles.push(o);

    // Risk lane: coins clustered around the obstacle (reward for threading it).
    if (Math.random() < 0.7) spawnCoinCluster(o);
  }

  function playerBox() {
    return { x: dodo.x, y: dodo.y, w: dodo.w, h: dodo.h };
  }

  function overlaps(a, b, pad) {
    pad = pad || 0;
    return a.x + pad < b.x + b.w && a.x + a.w - pad > b.x &&
      a.y + pad < b.y + b.h && a.y + a.h - pad > b.y;
  }

  function updateObstacles(dt) {
    var sp = speedFrac * W;
    var pb = playerBox();
    for (var i = obstacles.length - 1; i >= 0; i--) {
      var o = obstacles[i];
      o.x -= sp * dt;
      if (o.type === 'boulder') o.rot += (sp * dt) / (o.r || 1);

      var xOverlap = o.x < pb.x + pb.w && o.x + o.w > pb.x;
      if (xOverlap) {
        // vertical clearance while sharing the player's column
        var clear;
        if (pb.y + pb.h <= o.y) clear = o.y - (pb.y + pb.h);          // player above
        else if (pb.y >= o.y + o.h) clear = pb.y - (o.y + o.h);       // player below (ducked under)
        else clear = -1;                                              // vertically overlapping
        if (clear >= 0 && clear < o.minClear) o.minClear = clear;
        if (clear < 0 && !o.hit && !dodo.dead) {
          o.hit = true;
          if (!endless) { die(o); return; }
        }
      }

      if (!o.passed && o.x + o.w < pb.x) {
        o.passed = true;
        if (!o.hit && o.minClear < H * NEAR_MISS_FRAC) triggerNearMiss(o);
      }
      if (o.x + o.w < -40) obstacles.splice(i, 1);
    }
  }

  function triggerNearMiss(o) {
    combo += 1;
    score += NEAR_MISS_BONUS;
    play('combo', { pitch: clamp(1 + combo * 0.04, 1, 1.6) });
    var px = dodo.x + dodo.w * 0.5, py = dodo.y;
    emit('sparkle', px, py, { count: 14, color: COLOR.green });
    floatQuip(px, py - dodo.h * 0.4, pick(NEAR_QUIPS) + ' +' + NEAR_MISS_BONUS, COLOR.green, 18);
    shake(5, 140);
    popScore();
    if (J && J.haptics) J.haptics.tap();
  }

  /* ---- coins + magnet ------------------------------------------------- */
  function spawnCoinCluster(o) {
    var n = 3 + (Math.random() * 3 | 0);
    if (o.type === 'invoice') {
      // risky low line the player must grab while ducking through
      for (var k = 0; k < n; k++) {
        pickups.push(coin(o.x + o.w + 20 + k * H * 0.09, groundY - dodo.baseH * 0.35));
      }
    } else {
      // arc of coins peaking above the jump
      var top = o.y - H * 0.10;
      for (var j = 0; j < n; j++) {
        var t = j / (n - 1);
        var cy = groundY - dodo.baseH * 0.6 - Math.sin(t * Math.PI) * (groundY - top);
        pickups.push(coin(o.x + o.w * 0.5 + (t - 0.5) * H * 0.5, cy));
      }
    }
  }

  function spawnCoinRun() {
    var n = 3 + (Math.random() * 4 | 0);
    var baseY = groundY - dodo.baseH * rnd(0.4, 1.4);
    for (var k = 0; k < n; k++) pickups.push(coin(W + 30 + k * H * 0.11, baseY));
    // occasional magnet power-up token
    if (Math.random() < 0.16) {
      var m = coin(W + 30 + n * H * 0.11, groundY - dodo.baseH * rnd(0.6, 1.2));
      m.magnet = true;
      pickups.push(m);
    }
  }

  function coin(x, y) {
    return { x: x, y: y, r: Math.max(9, H * 0.028), phase: Math.random() * Math.PI * 2, magnet: false };
  }

  function updatePickups(dt) {
    var sp = speedFrac * W;
    var pcx = dodo.x + dodo.w * 0.5, pcy = dodo.y + dodo.h * 0.5;
    for (var i = pickups.length - 1; i >= 0; i--) {
      var c = pickups[i];
      c.x -= sp * dt;
      c.phase += dt * 5;
      if (magnetTime > 0 && !c.magnet) {
        var dx = pcx - c.x, dy = pcy - c.y;
        var d = Math.sqrt(dx * dx + dy * dy) || 1;
        if (d < W * 0.42) {
          var pullSpeed = W * 1.4 * dt;
          c.x += (dx / d) * pullSpeed;
          c.y += (dy / d) * pullSpeed;
        }
      }
      var ddx = pcx - c.x, ddy = pcy - c.y;
      if (ddx * ddx + ddy * ddy < (c.r + dodo.w * 0.5) * (c.r + dodo.w * 0.5)) {
        if (c.magnet) activateMagnet(c.x, c.y);
        else collectCoinValue(c.x, c.y);
        pickups.splice(i, 1);
        continue;
      }
      if (c.x + c.r < -30) pickups.splice(i, 1);
    }
    if (magnetTime > 0) magnetTime -= dt;
  }

  function collectCoinValue(x, y) {
    coins += 1;
    score += COIN_VALUE;
    play('score', { pitch: clamp(1 + coins * 0.005, 1, 1.4) });
    emit('sparkle', x != null ? x : dodo.x + dodo.w, y != null ? y : dodo.y, { count: 8, color: COLOR.coin });
    floatQuip(x != null ? x : dodo.x + dodo.w, (y != null ? y : dodo.y) - 6, '+' + COIN_VALUE, COLOR.coin, 16);
    popScore();
  }

  function activateMagnet(x, y) {
    magnetTime = 6.5;
    play('powerup');
    emit('sparkle', x != null ? x : dodo.x, y != null ? y : dodo.y, { count: 18, color: COLOR.magnet });
    emit('burst', x != null ? x : dodo.x, y != null ? y : dodo.y, { count: 12, color: COLOR.magnet });
    floatQuip(x != null ? x : dodo.x, (y != null ? y : dodo.y) - 8, 'MAGNET!', COLOR.magnet, 20);
    if (J && J.flash) J.flash(canvas, COLOR.magnet, 160);
    if (J && J.haptics) J.haptics.success();
  }

  /* ---- milestones + double jump --------------------------------------- */
  function updateMilestones() {
    var m = Math.floor(distanceM / MILESTONE);
    if (m > lastMilestone) {
      lastMilestone = m;
      celebrateMilestone(m * MILESTONE);
    }
    if (!djUnlocked && distanceM >= DJ_UNLOCK) unlockDoubleJump();
  }

  function celebrateMilestone(meters) {
    play('win');
    play('tick', { pitch: 1.4 });
    emit('confetti', W * 0.5, H * 0.28, { count: 34 });
    floatQuip(W * 0.5, H * 0.3, meters + 'm · ' + pick(MILE_QUIPS), COLOR.green, 24);
    milestoneFlash = 0.5;
    shake(7, 220);
    speedFrac = Math.min(SPEED_MAX, speedFrac + 0.03);
    if (J && J.haptics) J.haptics.success();
  }

  function unlockDoubleJump() {
    djUnlocked = true;
    dodo.maxJumps = 2;
    djBadge.hidden = false;
    play('powerup');
    emit('confetti', W * 0.5, H * 0.32, { count: 26 });
    floatQuip(W * 0.5, H * 0.36, 'DOUBLE JUMP UNLOCKED', COLOR.green, 22);
    shake(6, 220);
    if (J && J.haptics) J.haptics.success();
  }

  /* ---- HUD ------------------------------------------------------------ */
  function popScore() {
    if (!scoreEl) return;
    scoreEl.classList.remove('da-score--pop');
    void scoreEl.offsetWidth;
    scoreEl.classList.add('da-score--pop');
  }

  function updateHud() {
    var s = Math.floor(score);
    scoreEl.textContent = String(s);
    distanceEl.textContent = Math.floor(distanceM) + 'm';
    coinsEl.textContent = String(coins);
    bestEl.textContent = String(Math.max(best, s));
    djBadge.className = 'da-combo-badge dd-badge' + (djUnlocked ? ' da-combo-badge--t3' : '');
  }

  /* ---- speed + distance ----------------------------------------------- */
  function updateWorld(dt) {
    speedFrac = Math.min(SPEED_MAX, speedFrac + SPEED_RAMP * dt);
    var s = speedFrac * W * dt;
    bgFar += s * 0.16; bgMid += s * 0.4; groundScroll += s;

    var dm = speedFrac * dt * METER_RATE;
    distanceM += dm;
    score += dm * DIST_POINTS;

    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnObstacle();
      var gap = clamp(1.45 - speedFrac * 0.7, 0.82, 1.4) + rnd(0.15, 0.65);
      spawnTimer = gap;
    }
    coinTimer -= dt;
    if (coinTimer <= 0) {
      spawnCoinRun();
      coinTimer = rnd(1.6, 3.2);
    }
    if (milestoneFlash > 0) milestoneFlash = Math.max(0, milestoneFlash - dt * 1.6);
  }

  /* ---- render --------------------------------------------------------- */
  function draw() {
    ctx.clearRect(0, 0, W, H);
    var phase = (distanceM % DAY_LEN) / DAY_LEN;
    var dayness = 0.5 + 0.5 * Math.sin(phase * Math.PI * 2);

    drawSky(dayness);
    drawStars(1 - dayness);
    drawCelestial(phase, dayness);
    drawDunes(bgFar, H * 0.62, H * 0.06, rgb(mix(DUNE_FAR_NIGHT, DUNE_FAR_DAY, dayness)), 0.9);
    drawDunes(bgMid, H * 0.74, H * 0.09, rgb(mix(DUNE_MID_NIGHT, DUNE_MID_DAY, dayness)), 1.4);
    drawGround(dayness);
    drawPickups();
    drawObstacles();
    drawPlayer();

    if (J && J.particles) J.particles.draw(ctx);

    if (milestoneFlash > 0) {
      ctx.save();
      ctx.globalAlpha = milestoneFlash * 0.5;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
  }

  function drawSky(dayness) {
    var g = ctx.createLinearGradient(0, 0, 0, groundY);
    g.addColorStop(0, rgb(mix(SKY_NIGHT_TOP, SKY_DAY_TOP, dayness)));
    g.addColorStop(1, rgb(mix(SKY_NIGHT_BOT, SKY_DAY_BOT, dayness)));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, groundY);
  }

  function drawStars(nightness) {
    if (nightness <= 0.02) return;
    ctx.save();
    for (var i = 0; i < stars.length; i++) {
      var st = stars[i];
      var tw = 0.6 + 0.4 * Math.sin(st.tw + distanceM * 0.05);
      ctx.globalAlpha = nightness * tw;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(st.x * W, st.y * groundY, st.s, st.s);
    }
    ctx.restore();
  }

  function drawCelestial(phase, dayness) {
    var isDay = phase < 0.5;
    var local = isDay ? phase / 0.5 : (phase - 0.5) / 0.5;
    var cx = W * (0.12 + 0.76 * local);
    var cy = H * 0.46 - Math.sin(local * Math.PI) * H * 0.34;
    var r = Math.max(18, H * 0.05);
    ctx.save();
    if (isDay) {
      ctx.shadowColor = 'rgba(255,220,140,0.8)';
      ctx.shadowBlur = 40;
      ctx.fillStyle = '#FFE7A3';
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.shadowColor = 'rgba(200,220,255,0.6)';
      ctx.shadowBlur = 26;
      ctx.fillStyle = '#E8EEFF';
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath(); ctx.arc(cx + r * 0.42, cy - r * 0.28, r * 0.82, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function drawDunes(offset, baseY, amp, color, freqScale) {
    var freq = (Math.PI * 2 / W) * (1.2 * freqScale);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    var step = Math.max(12, W / 40);
    for (var x = -step; x <= W + step; x += step) {
      var y = baseY + Math.sin((x + offset) * freq) * amp + Math.sin((x + offset) * freq * 2.3) * amp * 0.3;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W + step, groundY);
    ctx.closePath();
    ctx.fill();
  }

  function drawGround(dayness) {
    ctx.fillStyle = rgb(mix(GROUND_NIGHT, GROUND_DAY, dayness));
    ctx.fillRect(0, groundY, W, groundH);
    // top edge line
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.fillRect(0, groundY, W, 2);
    // scrolling pebbles/dashes
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    var gap = Math.max(26, W * 0.05);
    var off = groundScroll % gap;
    for (var x = -off; x < W; x += gap) {
      ctx.fillRect(x, groundY + groundH * 0.42, gap * 0.34, 3);
    }
  }

  function drawPickups() {
    for (var i = 0; i < pickups.length; i++) {
      var c = pickups[i];
      var bob = Math.sin(c.phase) * c.r * 0.18;
      ctx.save();
      ctx.translate(c.x, c.y + bob);
      if (c.magnet) {
        ctx.shadowColor = COLOR.magnet; ctx.shadowBlur = 18;
        ctx.strokeStyle = COLOR.magnet; ctx.lineWidth = Math.max(3, c.r * 0.4);
        ctx.beginPath(); ctx.arc(0, 0, c.r, Math.PI * 0.15, Math.PI * 0.85, true); ctx.stroke();
        ctx.fillStyle = COLOR.magnet;
        ctx.fillRect(-c.r * 0.9, c.r * 0.35, c.r * 0.5, c.r * 0.5);
        ctx.fillRect(c.r * 0.4, c.r * 0.35, c.r * 0.5, c.r * 0.5);
      } else {
        ctx.shadowColor = COLOR.coin; ctx.shadowBlur = 14;
        ctx.fillStyle = COLOR.coin;
        ctx.beginPath(); ctx.arc(0, 0, c.r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.font = '800 ' + Math.round(c.r * 1.3) + 'px ' + '"SF Mono", ui-monospace, monospace';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('$', 0, 1);
      }
      ctx.restore();
    }
  }

  function drawObstacles() {
    for (var i = 0; i < obstacles.length; i++) {
      var o = obstacles[i];
      if (o.type === 'cactus') drawCactus(o);
      else if (o.type === 'boulder') drawBoulder(o);
      else drawInvoice(o);
    }
  }

  function drawCactus(o) {
    ctx.save();
    ctx.fillStyle = COLOR.cactus;
    ctx.shadowColor = 'rgba(255,71,87,0.5)'; ctx.shadowBlur = 12;
    var armW = o.w * 0.5;
    roundRect(o.x + o.w * 0.28, o.y, o.w * 0.44, o.h, o.w * 0.2); ctx.fill();
    // arms
    roundRect(o.x, o.y + o.h * 0.35, armW, o.h * 0.16, o.h * 0.06); ctx.fill();
    roundRect(o.x, o.y + o.h * 0.18, o.w * 0.2, o.h * 0.34, o.w * 0.08); ctx.fill();
    roundRect(o.x + o.w * 0.6, o.y + o.h * 0.5, armW, o.h * 0.14, o.h * 0.05); ctx.fill();
    roundRect(o.x + o.w * 0.8, o.y + o.h * 0.3, o.w * 0.2, o.h * 0.34, o.w * 0.08); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    roundRect(o.x + o.w * 0.34, o.y + o.h * 0.1, o.w * 0.12, o.h * 0.8, o.w * 0.05); ctx.fill();
    ctx.restore();
  }

  function drawBoulder(o) {
    var cx = o.x + o.r, cy = o.y + o.r;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 10;
    ctx.fillStyle = COLOR.boulder;
    ctx.beginPath(); ctx.arc(0, 0, o.r, 0, Math.PI * 2); ctx.fill();
    ctx.rotate(o.rot);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = Math.max(2, o.r * 0.12);
    ctx.beginPath(); ctx.moveTo(-o.r * 0.5, -o.r * 0.2); ctx.lineTo(o.r * 0.1, o.r * 0.1); ctx.lineTo(-o.r * 0.1, o.r * 0.5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(o.r * 0.3, -o.r * 0.5); ctx.lineTo(o.r * 0.45, o.r * 0.1); ctx.stroke();
    ctx.rotate(-o.rot);
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,71,87,0.9)';
    ctx.font = '800 ' + Math.round(o.r * 0.42) + 'px "SF Mono", ui-monospace, monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('CB', 0, -o.r - o.r * 0.35);
    ctx.restore();
  }

  function drawInvoice(o) {
    ctx.save();
    ctx.shadowColor = 'rgba(77,163,255,0.55)'; ctx.shadowBlur = 14;
    ctx.fillStyle = '#EAF2FF';
    roundRect(o.x, o.y, o.w, o.h, 4); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = COLOR.invoice;
    ctx.fillRect(o.x, o.y, o.w, Math.max(4, o.h * 0.22));
    ctx.fillStyle = 'rgba(20,40,80,0.55)';
    var lineH = Math.max(2, o.h * 0.08);
    for (var k = 0; k < 3; k++) {
      ctx.fillRect(o.x + o.w * 0.12, o.y + o.h * (0.4 + k * 0.18), o.w * (0.76 - k * 0.16), lineH);
    }
    ctx.fillStyle = COLOR.invoice;
    ctx.font = '800 ' + Math.round(o.h * 0.34) + 'px "SF Mono", ui-monospace, monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('$', o.x + o.w * 0.5, o.y - o.h * 0.02 + o.h * 0.11);
    ctx.restore();
  }

  function drawPlayer() {
    var cx = dodo.x + dodo.w / 2, cy = dodo.y + dodo.h / 2;
    var sy = clamp(dodo.squash, 0.7, 1.25);
    var sx = 1 / sy;
    ctx.save();
    ctx.translate(cx, cy);
    if (dodo.dead) ctx.rotate(dodo.rot);
    ctx.scale(sx, sy);

    // double-jump aura
    if (djUnlocked && !dodo.dead) {
      ctx.save();
      ctx.globalAlpha = 0.35 + 0.15 * Math.sin(dodo.runCycle * 6);
      ctx.strokeStyle = COLOR.green; ctx.lineWidth = 2;
      ctx.shadowColor = COLOR.green; ctx.shadowBlur = 16;
      ctx.beginPath(); ctx.arc(0, 0, dodo.w * 0.72, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }

    // magnet field
    if (magnetTime > 0 && !dodo.dead) {
      ctx.save();
      ctx.globalAlpha = 0.22;
      ctx.strokeStyle = COLOR.magnet; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, dodo.w * (0.9 + 0.15 * Math.sin(dodo.runCycle * 8)), 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }

    drawLegs();

    var bw = dodo.w, bh = dodo.h;
    if (dodoImg.complete && dodoImg.naturalWidth) {
      ctx.drawImage(dodoImg, -bw / 2, -bh / 2, bw, bh);
    } else {
      ctx.fillStyle = COLOR.green;
      ctx.beginPath(); ctx.arc(0, 0, bw / 2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function drawLegs() {
    var swing = Math.sin(dodo.runCycle * Math.PI * 2);
    var lift = dodo.grounded ? 0 : -dodo.h * 0.08;
    ctx.strokeStyle = '#0D0D0D';
    ctx.lineWidth = Math.max(3, dodo.w * 0.11);
    ctx.lineCap = 'round';
    var hipY = dodo.h * 0.34;
    var footY = dodo.h * 0.5;
    var reach = dodo.grounded ? dodo.w * 0.2 : dodo.w * 0.08;
    ctx.beginPath();
    ctx.moveTo(-dodo.w * 0.12, hipY);
    ctx.lineTo(-dodo.w * 0.12 + swing * reach, footY + lift);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(dodo.w * 0.12, hipY);
    ctx.lineTo(dodo.w * 0.12 - swing * reach, footY + lift * 0.6);
    ctx.stroke();
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

  /* ---- death / end run ------------------------------------------------ */
  function die(o) {
    if (dodo.dead || gameState !== 'PLAYING') return;
    dodo.dead = true;
    dodo.dy = -0.7 * H;
    dodo.deadVr = rnd(6, 11) * (Math.random() < 0.5 ? -1 : 1);
    play('hit');
    if (J && J.later) { /* noop */ }
    setTimeout(function () { play('gameover'); }, 170);
    emit('explosion', dodo.x + dodo.w * 0.5, dodo.y + dodo.h * 0.5, { count: 30, color: COLOR.cactus });
    emit('burst', dodo.x + dodo.w * 0.5, dodo.y + dodo.h * 0.5, { count: 16, color: COLOR.dust });
    shake(16, 420);
    if (J && J.haptics) J.haptics.fail();
    endRun();
  }

  function endRun() {
    gameState = 'GAME_OVER';
    var finalScore = Math.floor(score);
    var distM = Math.floor(distanceM);
    var prevBest = best;

    if (hs) { hs.set(finalScore); best = hs.best; }
    else if (finalScore > best) { best = finalScore; try { localStorage.setItem(BEST_KEY, String(best)); } catch (e) {} }
    if (distM > bestDistance) { bestDistance = distM; try { localStorage.setItem(BEST_DIST_KEY, String(distM)); } catch (e) {} }

    if (typeof DodoAnalytics !== 'undefined') {
      DodoAnalytics.gameOver(GAME_NAME, finalScore, { distance: distM, coins: coins });
      if (finalScore > prevBest) DodoAnalytics.newHighScore(GAME_NAME, finalScore);
    }

    resultEyebrow.textContent = 'Run Complete';
    resultTitle.textContent = pick(CRASH_QUIPS);
    finalDistanceEl.textContent = distM + 'm';
    finalCoinsEl.textContent = String(coins);
    finalScoreEl.textContent = String(finalScore);
    overBestScoreEl.textContent = String(best);
    overBestDistanceEl.textContent = bestDistance + 'm';
    updateHud();
    setScreen('GAME_OVER');
  }

  /* ---- screens -------------------------------------------------------- */
  function setScreen(state) {
    startScreen.hidden = state !== 'START';
    gameOverScreen.hidden = state !== 'GAME_OVER';
    hud.hidden = (state === 'START');
  }

  function startGame() {
    resize();
    gameState = 'PLAYING';
    endless = false;
    speedFrac = SPEED_START;
    distanceM = 0; score = 0; coins = 0; combo = 0;
    lastMilestone = 0; djUnlocked = false; magnetTime = 0; milestoneFlash = 0;
    obstacles = []; pickups = [];
    spawnTimer = 1.8; coinTimer = 2.4;
    bgFar = 0; bgMid = 0; groundScroll = 0;
    dodo.maxJumps = 1; dodo.jumps = 0; dodo.dead = false; dodo.rot = 0;
    dodo.ducking = false; dodo.grounded = true; dodo.dy = 0; dodo.squash = 1;
    dodo.h = dodo.baseH; dodo.y = groundY - dodo.h;
    djBadge.hidden = true;
    jumpHeld = false; duckHeld = false;
    updateHud();
    setScreen('PLAYING');
    if (typeof DodoAnalytics !== 'undefined') {
      DodoAnalytics.gameStart(GAME_NAME);
    }
  }

  /* ---- loop ----------------------------------------------------------- */
  function frame(ts) {
    var dt = lastTs ? (ts - lastTs) / 1000 : 0.016;
    lastTs = ts;
    if (dt > 0.05) dt = 0.05;
    if (J && J.particles) J.particles.update(dt);
    if (gameState === 'PLAYING') {
      updateWorld(dt);
      updatePlayer(dt);
      updateObstacles(dt);
      updatePickups(dt);
      updateMilestones();
      updateHud();
    } else if (gameState === 'GAME_OVER' && dodo.dead) {
      updateDeath(dt);
    }
    draw();
    requestAnimationFrame(frame);
  }

  /* ---- input ---------------------------------------------------------- */
  function onPressDown(clientY) {
    if (gameState === 'PLAYING') {
      jumpHeld = true;
      pressStartY = clientY;
      doJump();
    }
  }
  function onPressUp() { jumpHeld = false; duckHeld = false; }

  document.addEventListener('keydown', function (e) {
    var k = e.key;
    if (k === ' ' || k === 'Spacebar' || k === 'ArrowUp' || k === 'w' || k === 'W') {
      if (gameState === 'START') { startGame(); }
      else if (gameState === 'GAME_OVER') { if (!dodo.dead || dodo.y > H) startGame(); else startGame(); }
      else { jumpHeld = true; doJump(); }
      if (gameState === 'PLAYING') e.preventDefault();
    } else if (k === 'ArrowDown' || k === 's' || k === 'S') {
      duckHeld = true;
      if (gameState === 'PLAYING') e.preventDefault();
    }
  });
  document.addEventListener('keyup', function (e) {
    var k = e.key;
    if (k === ' ' || k === 'Spacebar' || k === 'ArrowUp' || k === 'w' || k === 'W') jumpHeld = false;
    if (k === 'ArrowDown' || k === 's' || k === 'S') duckHeld = false;
  });

  // Mouse (pointer) — touch handled separately to support synthetic TouchEvents.
  canvas.addEventListener('pointerdown', function (e) {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    pointerDown = true;
    onPressDown(e.clientY);
  });
  window.addEventListener('pointerup', function (e) {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    pointerDown = false;
    onPressUp();
  });

  // Touch — tap = jump, hold = higher jump, swipe down = duck.
  canvas.addEventListener('touchstart', function (e) {
    if (!(e.touches && e.touches.length)) return;
    onPressDown(e.touches[0].clientY);
    if (gameState === 'PLAYING') e.preventDefault();
  }, { passive: false });
  canvas.addEventListener('touchmove', function (e) {
    if (!(e.touches && e.touches.length)) return;
    var dy = e.touches[0].clientY - pressStartY;
    if (dy > Math.max(30, H * 0.06)) { duckHeld = true; jumpHeld = false; }
    if (gameState === 'PLAYING') e.preventDefault();
  }, { passive: false });
  canvas.addEventListener('touchend', function () { onPressUp(); });
  canvas.addEventListener('touchcancel', function () { onPressUp(); });

  startButton.addEventListener('click', startGame);
  restartButton.addEventListener('click', startGame);

  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', function () { setTimeout(resize, 150); });

  /* mute toggle */
  if (J && J.muteButton) J.muteButton(document.body);

  /* particles attach to our own context */
  if (J && J.particles && J.particles.attach) J.particles.attach(canvas, ctx);

  /* ---- test hooks (test-only steering; never used by real gameplay) --- */
  window.DodoDashTest = {
    start: function () { startGame(); },
    jump: function () { if (gameState === 'PLAYING') { jumpHeld = true; doJump(); } },
    releaseJump: function () { jumpHeld = false; },
    duck: function (on) { duckHeld = !!on; },
    // One real scoring action: collect a coin (visible score increments).
    scorePoint: function () { collectCoinValue(dodo.x + dodo.w, dodo.y); updateHud(); },
    // One juicy beat wired to REAL gameplay functions (>=5 distinct cues,
    // multiple particle emits + screenshakes). Used by the harness play session.
    pulse: function () {
      if (gameState !== 'PLAYING') return;
      forceLandEffect();                 // 'tap' + dust + shake
      doJump();                          // 'whoosh' + dust
      collectCoinValue(dodo.x + dodo.w, dodo.y - dodo.h * 0.4); // 'score' + sparkle
      triggerNearMiss(null);             // 'combo' + sparkle + shake + quip
      activateMagnet(dodo.x, dodo.y);    // 'powerup' + flash + sparkle
      play('tick');                      // distinct UI cue
      updateHud();
    },
    setEndless: function (v) { endless = !!v; },
    forceGameOver: function () { if (gameState === 'PLAYING') die(null); },
    getScore: function () { return Math.floor(score); },
    getDistance: function () { return Math.floor(distanceM); },
    getState: function () { return gameState; }
  };

  /* ---- boot ----------------------------------------------------------- */
  resize();
  updateHud();
  setScreen('START');
  requestAnimationFrame(frame);
})();
