/* ==========================================================================
 * TRANSACTION SNAKE — grid Snake with smooth movement, level progression,
 * golden-apple events, moving fraud voids, PCI-shield invincibility and full
 * juice. Vanilla JS, DPI-aware canvas, game-feel via window.DodoJuice.
 * Analytics via bare DodoAnalytics global (game_name frozen "Transaction Snake").
 * ========================================================================== */
(function () {
  'use strict';

  var GAME_NAME = 'Transaction Snake';
  var HAS_JUICE = typeof window.DodoJuice !== 'undefined';
  var J = HAS_JUICE ? window.DodoJuice : null;
  var GREEN = '#C1FF00';
  var CYAN = '#22d3ee';
  var GOLD = '#ffd23f';
  var BLUE = '#4DA3FF';
  var RED = '#FF4757';

  /* ---- tuning --------------------------------------------------------- */
  var GRID = 20;
  var BASE_STEP = 145;        // ms per grid tick at level 1
  var MIN_STEP = 62;
  var FOOD_POINTS = 100;
  var GOLDEN_MULT = 5;
  var SHIELD_MS = 6000;
  var SHIELD_BLINK = 1600;
  var GOLD_TTL = 6;           // seconds a golden apple stays
  var GOLD_COOLDOWN = 15;     // seconds between golden events
  var APPLES_PER_LEVEL = 10;
  var DYING_DUR = 0.66;       // seconds of death-replay beat

  var TIPS = [
    'Enable 3D Secure 2.0 to shift chargeback liability away from your business.',
    'Velocity checks block fraudsters testing many cards in quick succession.',
    'Tokenize sensitive data — never store raw card numbers.',
    'Keep chargeback ratios under 1% to avoid a frozen merchant account.',
    'A multi-acquirer strategy keeps transactions flowing during an outage.',
    'AVS matches billing addresses to catch stolen-card fraud early.',
    'Machine-learning models catch fraud patterns static rules miss.',
    'Geo-fencing filters transactions from high-risk regions.'
  ];

  /* ---- DOM ------------------------------------------------------------ */
  var canvas = document.getElementById('gameCanvas');
  var ctx = canvas.getContext('2d');
  var shell = document.getElementById('snakeShell');
  var stage = document.getElementById('snakeStage');
  var hud = document.getElementById('hud');
  var startScreen = document.getElementById('start-screen');
  var gameOverScreen = document.getElementById('game-over-screen');
  var startBtn = document.getElementById('start-btn');
  var restartBtn = document.getElementById('restart-btn');
  var dpad = document.getElementById('dpad');

  var scoreEl = document.getElementById('score-value');
  var levelEl = document.getElementById('level-value');
  var bestEl = document.getElementById('best-value');
  var comboBadge = document.getElementById('combo-badge');
  var deathReasonEl = document.getElementById('death-reason');
  var finalScoreEl = document.getElementById('final-score');
  var overBestEl = document.getElementById('over-best');
  var securityTipEl = document.getElementById('security-tip');

  /* ---- state ---------------------------------------------------------- */
  var W = 0, H = 0, cellSize = 0;
  var gameState = 'START';   // START | PLAYING | PAUSED | DYING | GAME_OVER
  var testEndless = false;   // test-only: suppresses death + golden events

  var snake = [];            // grid cells (head first)
  var render = [];           // float render positions (cells), eased each frame
  var dir = { x: 1, y: 0 };
  var nextDir = { x: 1, y: 0 };

  var food = null;
  var golden = null;         // { x, y, ttl }
  var shieldItem = null;
  var fraudBlocks = [];

  var isShielded = false, shieldMs = 0;
  var score = 0, level = 1, applesEaten = 0, chain = 0;
  var stepMs = BASE_STEP;
  var stepTimer = 0;
  var goldenCooldown = GOLD_COOLDOWN;
  var auraTimer = 0;

  var dyingTimer = 0, dyingReason = '';
  var collisionPt = { x: 0, y: 0 };

  var lastTs = 0;

  /* ---- highscore (standard key; no legacy key exists for this game) ---- */
  var hs = (HAS_JUICE && J.highscore) ? J.highscore('snake-game-dodo', []) : null;
  var best = hs ? hs.get() : (parseInt(localStorage.getItem('dodo_snake-game-dodo_highscore') || '0', 10) || 0);

  /* ---- helpers -------------------------------------------------------- */
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function play(cue, opts) { if (J && J.audio) J.audio.play(cue, opts); }
  function emit(preset, x, y, opts) { if (J && J.particles) J.particles.emit(preset, x, y, opts); }
  function shake(intensity, ms) { if (J) J.shake(stage, intensity, ms); }
  function reduced() { return !!(J && J.reducedMotion); }

  function cellPixel(c) { return { x: (c.x + 0.5) * cellSize, y: (c.y + 0.5) * cellSize }; }
  function headPixel() { return { x: (render[0].x + 0.5) * cellSize, y: (render[0].y + 0.5) * cellSize }; }

  function floatAt(cssX, cssY, text, opts) {
    if (!J || !J.floatText) return;
    var r = canvas.getBoundingClientRect();
    J.floatText(r.left + cssX, r.top + cssY, text, opts || {});
  }

  /* ---- DPI-aware sizing ---------------------------------------------- */
  function resize() {
    var dpr = window.devicePixelRatio || 1;
    var availW = shell.clientWidth || window.innerWidth;
    var availH = shell.clientHeight || window.innerHeight;
    var hudH = hud && !hud.hidden ? hud.offsetHeight : 52;
    var dpadH = dpad ? dpad.offsetHeight : 170;
    var reserved = hudH + dpadH + 48;
    var maxW = availW - 20;
    var maxH = availH - reserved;
    var size = Math.min(maxW, maxH);
    size = clamp(Math.floor(size), 220, 620);

    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    W = size; H = size; cellSize = W / GRID;
  }

  /* ---- spawning ------------------------------------------------------- */
  function occupied(x, y, includeItems) {
    for (var i = 0; i < snake.length; i++) if (snake[i].x === x && snake[i].y === y) return true;
    for (var f = 0; f < fraudBlocks.length; f++) if (fraudBlocks[f].x === x && fraudBlocks[f].y === y) return true;
    if (includeItems) {
      if (food && food.x === x && food.y === y) return true;
      if (golden && golden.x === x && golden.y === y) return true;
      if (shieldItem && shieldItem.x === x && shieldItem.y === y) return true;
    }
    return false;
  }

  function freeCell(minHeadDist) {
    for (var attempt = 0; attempt < 200; attempt++) {
      var x = (Math.random() * GRID) | 0;
      var y = (Math.random() * GRID) | 0;
      if (occupied(x, y, true)) continue;
      if (minHeadDist) {
        var hx = snake[0].x, hy = snake[0].y;
        if (Math.abs(x - hx) + Math.abs(y - hy) < minHeadDist) continue;
      }
      return { x: x, y: y };
    }
    return null;
  }

  function spawnFood() { var c = freeCell(0); if (c) food = { x: c.x, y: c.y }; }

  function spawnFraud(count, movingChance) {
    for (var i = 0; i < count; i++) {
      var c = freeCell(5);
      if (!c) return;
      var block = { x: c.x, y: c.y, moving: false, ax: { x: 0, y: 0 }, cd: 0, period: 3 };
      if (movingChance && Math.random() < movingChance) {
        block.moving = true;
        block.period = 3;
        block.cd = block.period;
        block.ax = Math.random() < 0.5 ? { x: (Math.random() < 0.5 ? 1 : -1), y: 0 } : { x: 0, y: (Math.random() < 0.5 ? 1 : -1) };
      }
      fraudBlocks.push(block);
    }
  }

  function spawnShieldItem() { var c = freeCell(3); if (c) shieldItem = { x: c.x, y: c.y, t: 0 }; }

  function spawnGolden() { var c = freeCell(4); if (c) golden = { x: c.x, y: c.y, ttl: GOLD_TTL }; }

  /* ---- moving fraud (grid-aligned, telegraphed) ----------------------- */
  function moveFraud() {
    for (var i = 0; i < fraudBlocks.length; i++) {
      var b = fraudBlocks[i];
      if (!b.moving) continue;
      b.cd -= 1;
      if (b.cd > 0) continue;
      b.cd = b.period;
      var nx = b.x + b.ax.x, ny = b.y + b.ax.y;
      if (nx < 0 || nx >= GRID || ny < 0 || ny >= GRID || occupied(nx, ny, false) || (food && food.x === nx && food.y === ny)) {
        b.ax.x = -b.ax.x; b.ax.y = -b.ax.y;
        nx = b.x + b.ax.x; ny = b.y + b.ax.y;
        if (nx < 0 || nx >= GRID || ny < 0 || ny >= GRID || occupied(nx, ny, false)) continue;
      }
      b.x = nx; b.y = ny;
    }
  }

  function fraudAt(x, y) {
    for (var i = 0; i < fraudBlocks.length; i++) if (fraudBlocks[i].x === x && fraudBlocks[i].y === y) return fraudBlocks[i];
    return null;
  }

  /* ---- scoring / progression ------------------------------------------ */
  function multiplier() { return 1 + Math.floor(chain / 5); }

  function updateHud() {
    scoreEl.textContent = String(score);
    levelEl.textContent = String(level);
    bestEl.textContent = String(Math.max(best, score));
    if (chain >= 2) {
      comboBadge.hidden = false;
      comboBadge.textContent = 'CHAIN ×' + chain + (multiplier() > 1 ? ' · ' + multiplier() + 'x' : '');
      comboBadge.className = 'da-combo-badge ' + (chain >= 12 ? 'da-combo-badge--t3' : chain >= 6 ? 'da-combo-badge--t2' : 'da-combo-badge--t1');
    } else {
      comboBadge.hidden = true;
    }
  }

  function popScore() {
    scoreEl.classList.remove('da-score--pop');
    void scoreEl.offsetWidth;
    scoreEl.classList.add('da-score--pop');
  }

  function awardPayment(points, pix) {
    chain += 1;
    var gained = points * multiplier();
    score += gained;
    applesEaten += 1;
    popScore();
    play('score', { pitch: 1 + Math.min(chain, 14) * 0.04 });
    emit('burst', pix.x, pix.y, { count: 8 + Math.min(chain, 12), color: GREEN });
    floatAt(pix.x, pix.y - cellSize * 0.5, '+' + gained, { color: GREEN, size: 20 });
    if (J && J.haptics) J.haptics.tap();
    updateHud();
    maybeLevelUp();
    maybeSpawnShield();
  }

  function eatGolden(head) {
    var pix = cellPixel(head);
    chain += 1;
    var gained = FOOD_POINTS * GOLDEN_MULT * multiplier();
    score += gained;
    applesEaten += 1;
    golden = null;
    goldenCooldown = GOLD_COOLDOWN;
    popScore();
    play('combo', { pitch: 1.2 });
    emit('confetti', pix.x, pix.y, { count: 30 });
    emit('sparkle', pix.x, pix.y, { count: 16, color: GOLD });
    floatAt(pix.x, pix.y - cellSize * 0.5, 'GOLDEN ×5  +' + gained, { color: GOLD, size: 22 });
    shake(10, 220);
    if (J && J.haptics) J.haptics.success();
    updateHud();
    maybeLevelUp();
    maybeSpawnShield();
  }

  function maybeLevelUp() {
    if (applesEaten === 0 || applesEaten % APPLES_PER_LEVEL !== 0) return;
    level += 1;
    stepMs = Math.max(MIN_STEP, BASE_STEP - (level - 1) * 9);
    play('powerup', { pitch: 1 + Math.min(level, 6) * 0.05 });
    floatAt(W / 2, H * 0.4, 'LEVEL ' + level, { color: CYAN, size: 28 });
    emit('sparkle', W / 2, H * 0.4, { count: 20, color: CYAN });
    emit('confetti', W / 2, H * 0.4, { count: 18 });
    if (J && J.flash) J.flash(canvas, CYAN, 220);
    shake(8, 220);
    spawnFraud(1, level >= 3 ? 0.6 : 0);
    if (typeof DodoAnalytics !== 'undefined' && DodoAnalytics.waveComplete) {
      DodoAnalytics.waveComplete(GAME_NAME, level);
    }
    updateHud();
  }

  function maybeSpawnShield() {
    if (!shieldItem && !isShielded && applesEaten > 0 && applesEaten % 7 === 0) spawnShieldItem();
  }

  function activateShield(head) {
    var pix = cellPixel(head);
    isShielded = true;
    shieldMs = SHIELD_MS;
    shieldItem = null;
    play('powerup');
    emit('sparkle', pix.x, pix.y, { count: 20, color: BLUE });
    if (J && J.flash) J.flash(canvas, BLUE, 200);
    if (J && J.haptics) J.haptics.success();
    floatAt(pix.x, pix.y - cellSize * 0.5, 'PCI SHIELD', { color: BLUE, size: 20 });
    if (typeof DodoAnalytics !== 'undefined' && DodoAnalytics.powerUp) {
      DodoAnalytics.powerUp(GAME_NAME, 'PCI Shield');
    }
  }

  function destroyFraud(fb, head) {
    var pix = cellPixel(head);
    fraudBlocks = fraudBlocks.filter(function (b) { return b !== fb; });
    play('hit');
    emit('explosion', pix.x, pix.y, { count: 18, color: RED });
    shake(8, 180);
    floatAt(pix.x, pix.y - cellSize * 0.5, 'BLOCKED', { color: BLUE, size: 18 });
  }

  /* ---- one grid step -------------------------------------------------- */
  function hitsSelf(head) {
    for (var i = 0; i < snake.length - 1; i++) {
      if (snake[i].x === head.x && snake[i].y === head.y) return true;
    }
    return false;
  }

  function doStep() {
    dir = nextDir;
    moveFraud();

    var nx = snake[0].x + dir.x;
    var ny = snake[0].y + dir.y;

    if (nx < 0 || nx >= GRID || ny < 0 || ny >= GRID) {
      if (testEndless) { nx = (nx + GRID) % GRID; ny = (ny + GRID) % GRID; }
      else { collisionPt = cellPixel({ x: clamp(nx, 0, GRID - 1), y: clamp(ny, 0, GRID - 1) }); beginDeath('Boundary breach · packet lost'); return; }
    }
    var head = { x: nx, y: ny };

    if (hitsSelf(head) && !testEndless) {
      collisionPt = cellPixel(head);
      beginDeath('Internal loop · self-reference error');
      return;
    }

    var fb = fraudAt(head.x, head.y);
    if (fb) {
      if (isShielded || testEndless) {
        destroyFraud(fb, head);
      } else {
        collisionPt = cellPixel(head);
        beginDeath('Security breach · fraud void hit');
        return;
      }
    }

    snake.unshift(head);
    render.unshift({ x: render[0].x, y: render[0].y });

    var grew = false;
    if (food && head.x === food.x && head.y === food.y) {
      grew = true;
      awardPayment(FOOD_POINTS, cellPixel(head));
      spawnFood();
    } else if (golden && head.x === golden.x && head.y === golden.y) {
      grew = true;
      eatGolden(head);
    } else if (shieldItem && head.x === shieldItem.x && head.y === shieldItem.y) {
      activateShield(head);
    }

    if (!grew) { snake.pop(); render.pop(); }
  }

  /* ---- death flow ----------------------------------------------------- */
  function beginDeath(reason) {
    if (gameState !== 'PLAYING') return;
    chain = 0;
    updateHud();
    if (reduced()) { finalizeDeath(reason); return; }
    gameState = 'DYING';
    dyingTimer = 0;
    dyingReason = reason;
    play('gameover');
    play('hit');
    if (J && J.flash) J.flash(canvas, RED, 260);
    shake(16, 420);
    emit('explosion', collisionPt.x, collisionPt.y, { count: 30, color: RED });
    if (J && J.haptics) J.haptics.fail();
  }

  function finalizeDeath(reason) {
    gameState = 'GAME_OVER';
    var prevBest = best;
    if (hs) { hs.set(score); best = hs.best; }
    else if (score > best) { best = score; try { localStorage.setItem('dodo_snake-game-dodo_highscore', String(best)); } catch (e) {} }

    if (typeof DodoAnalytics !== 'undefined') {
      DodoAnalytics.gameOver(GAME_NAME, score);
      if (score > prevBest && DodoAnalytics.newHighScore) DodoAnalytics.newHighScore(GAME_NAME, score);
    }

    deathReasonEl.textContent = reason;
    finalScoreEl.textContent = '$' + score.toLocaleString('en-US');
    overBestEl.textContent = '$' + best.toLocaleString('en-US');
    securityTipEl.textContent = TIPS[(Math.random() * TIPS.length) | 0];
    updateHud();
    setScreen('GAME_OVER');
  }

  /* ---- update --------------------------------------------------------- */
  function update(dt) {
    if (gameState === 'DYING') {
      dyingTimer += dt;
      if (dyingTimer >= DYING_DUR) finalizeDeath(dyingReason);
      return;
    }
    if (gameState !== 'PLAYING') return;

    // shield timer + aura
    if (isShielded) {
      shieldMs -= dt * 1000;
      auraTimer += dt;
      if (auraTimer >= 0.04) {
        auraTimer = 0;
        var hp = headPixel();
        emit('trail', hp.x, hp.y, { count: 3, color: BLUE });
      }
      if (shieldMs <= 0) {
        isShielded = false;
        play('whoosh');
        var hp2 = headPixel();
        floatAt(hp2.x, hp2.y - cellSize * 0.5, 'SHIELD DOWN', { color: BLUE, size: 18 });
      }
    }

    // golden-apple event lifecycle (suppressed during scripted play)
    if (!testEndless) {
      if (golden) {
        golden.ttl -= dt;
        if (golden.ttl <= 0) { golden = null; goldenCooldown = GOLD_COOLDOWN * 0.6; }
      } else {
        goldenCooldown -= dt;
        if (goldenCooldown <= 0) { spawnGolden(); }
      }
    }

    // grid stepping
    stepTimer += dt * 1000;
    while (stepTimer >= stepMs && gameState === 'PLAYING') {
      stepTimer -= stepMs;
      doStep();
    }

    // smooth render easing toward logical cells
    var rate = (1000 / stepMs) * 3.9;
    var k = 1 - Math.exp(-rate * dt);
    if (k > 1) k = 1;
    for (var i = 0; i < render.length && i < snake.length; i++) {
      render[i].x += (snake[i].x - render[i].x) * k;
      render[i].y += (snake[i].y - render[i].y) * k;
    }
  }

  /* ---- render --------------------------------------------------------- */
  function draw() {
    ctx.clearRect(0, 0, W, H);

    var zoom = 1, ox = 0, oy = 0;
    if (gameState === 'DYING') {
      var t = clamp(dyingTimer / DYING_DUR, 0, 1);
      zoom = 1 + t * 0.5;
      ox = collisionPt.x - collisionPt.x * zoom;
      oy = collisionPt.y - collisionPt.y * zoom;
    }
    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(zoom, zoom);

    drawBoard();
    drawFraud();
    if (food) drawFood(food);
    if (golden) drawGolden(golden);
    if (shieldItem) drawShieldItem(shieldItem);
    drawSnake();
    if (J && J.particles) J.particles.draw(ctx);
    ctx.restore();

    if (gameState === 'DYING') {
      var tf = clamp(dyingTimer / DYING_DUR, 0, 1);
      ctx.save();
      ctx.globalAlpha = 0.35 * (1 - tf);
      ctx.fillStyle = RED;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
  }

  function drawBoard() {
    ctx.fillStyle = '#060b12';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (var i = 1; i < GRID; i++) {
      var p = i * cellSize;
      ctx.moveTo(p, 0); ctx.lineTo(p, H);
      ctx.moveTo(0, p); ctx.lineTo(W, p);
    }
    ctx.stroke();
  }

  function drawFraud() {
    for (var i = 0; i < fraudBlocks.length; i++) {
      var b = fraudBlocks[i];
      var x = b.x * cellSize, y = b.y * cellSize, s = cellSize;
      // telegraph next cell for imminent movers
      if (b.moving && b.cd <= 1) {
        var tx = clamp(b.x + b.ax.x, 0, GRID - 1) * cellSize;
        var ty = clamp(b.y + b.ax.y, 0, GRID - 1) * cellSize;
        ctx.save();
        ctx.globalAlpha = 0.35 + 0.25 * Math.sin(Date.now() / 120);
        ctx.strokeStyle = RED;
        ctx.lineWidth = 2;
        ctx.strokeRect(tx + 2, ty + 2, s - 4, s - 4);
        ctx.restore();
      }
      ctx.save();
      ctx.shadowBlur = 12; ctx.shadowColor = RED;
      ctx.fillStyle = 'rgba(255, 71, 87, 0.92)';
      roundRect(x + 1.5, y + 1.5, s - 3, s - 3, 4); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#1a0206';
      ctx.font = '800 ' + (s * 0.6) + 'px ' + monoFont();
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(b.moving ? '⚡' : '✕', x + s / 2, y + s / 2 + 1);
      ctx.restore();
    }
  }

  function drawFood(f) {
    var c = cellPixel(f);
    var pulse = 1 + Math.sin(Date.now() / 220) * 0.08;
    ctx.save();
    ctx.shadowBlur = 16; ctx.shadowColor = GREEN;
    ctx.fillStyle = GREEN;
    ctx.beginPath();
    ctx.arc(c.x, c.y, (cellSize / 2 - 2) * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#0a2e0a';
    ctx.font = '800 ' + (cellSize * 0.62) + 'px ' + monoFont();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('$', c.x, c.y + 1);
    ctx.restore();
  }

  function drawGolden(g) {
    var c = cellPixel(g);
    var pulse = 1 + Math.sin(Date.now() / 130) * 0.12;
    ctx.save();
    ctx.shadowBlur = 22; ctx.shadowColor = GOLD;
    ctx.fillStyle = GOLD;
    ctx.beginPath();
    ctx.arc(c.x, c.y, (cellSize / 2 - 1) * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#4a3600';
    ctx.font = '900 ' + (cellSize * 0.6) + 'px ' + monoFont();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('$', c.x, c.y + 1);
    // countdown ring
    var frac = clamp(g.ttl / GOLD_TTL, 0, 1);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(c.x, c.y, cellSize * 0.72, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = GOLD; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(c.x, c.y, cellSize * 0.72, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  function drawShieldItem(s) {
    var c = cellPixel(s);
    var pulse = 1 + Math.sin(Date.now() / 200) * 0.1;
    ctx.save();
    ctx.shadowBlur = 18; ctx.shadowColor = BLUE;
    ctx.fillStyle = BLUE;
    ctx.beginPath();
    ctx.arc(c.x, c.y, (cellSize / 2 - 2) * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#04121f';
    ctx.font = '900 ' + (cellSize * 0.56) + 'px ' + monoFont();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('⛨', c.x, c.y + 1);
    ctx.restore();
  }

  function drawSnake() {
    var blink = isShielded && shieldMs <= SHIELD_BLINK ? (Math.sin(Date.now() / 90) > 0) : false;
    for (var i = snake.length - 1; i >= 0; i--) {
      var rp = render[i] || snake[i];
      var cx = (rp.x + 0.5) * cellSize;
      var cy = (rp.y + 0.5) * cellSize;
      var head = i === 0;
      var r = cellSize / 2 - 1.5;
      ctx.save();
      if (head) {
        ctx.shadowBlur = 16; ctx.shadowColor = isShielded ? BLUE : GREEN;
        ctx.fillStyle = isShielded ? BLUE : GREEN;
      } else {
        var f = 1 - i / (snake.length + 4);
        ctx.shadowBlur = 6; ctx.shadowColor = GREEN;
        ctx.fillStyle = shadeGreen(f);
      }
      roundRect(cx - r, cy - r, r * 2, r * 2, Math.max(3, cellSize * 0.28));
      ctx.fill();
      ctx.restore();

      if (head) {
        // eyes
        ctx.save();
        ctx.fillStyle = '#050505';
        var ex = dir.x * cellSize * 0.16, ey = dir.y * cellSize * 0.16;
        var px = -dir.y * cellSize * 0.18, py = dir.x * cellSize * 0.18;
        ctx.beginPath(); ctx.arc(cx + ex + px, cy + ey + py, cellSize * 0.09, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + ex - px, cy + ey - py, cellSize * 0.09, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        // shield aura ring
        if (isShielded && !blink) {
          ctx.save();
          ctx.strokeStyle = BLUE; ctx.lineWidth = 2;
          ctx.globalAlpha = 0.8;
          ctx.shadowBlur = 14; ctx.shadowColor = BLUE;
          ctx.beginPath(); ctx.arc(cx, cy, r + 4 + Math.sin(Date.now() / 140) * 2, 0, Math.PI * 2); ctx.stroke();
          ctx.restore();
        }
      }
    }
  }

  function shadeGreen(f) {
    // fade from bright green head-ward to dim green tail-ward
    var g = Math.round(180 + 75 * f);
    return 'rgb(' + Math.round(120 * f + 40) + ',' + g + ',' + Math.round(30 * f) + ')';
  }

  function monoFont() { return '"SF Mono", ui-monospace, Menlo, monospace'; }

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
    gameOverScreen.hidden = state !== 'GAME_OVER';
    hud.hidden = state === 'START';
  }

  function initEntities() {
    snake = [{ x: 8, y: 10 }, { x: 7, y: 10 }, { x: 6, y: 10 }];
    render = snake.map(function (s) { return { x: s.x, y: s.y }; });
    dir = { x: 1, y: 0 };
    nextDir = { x: 1, y: 0 };
    food = null; golden = null; shieldItem = null;
    fraudBlocks = [];
    isShielded = false; shieldMs = 0;
    score = 0; level = 1; applesEaten = 0; chain = 0;
    stepMs = BASE_STEP; stepTimer = 0; goldenCooldown = GOLD_COOLDOWN; auraTimer = 0;
    if (J && J.particles) J.particles.clear();
    spawnFood();
    spawnFraud(3, 0);
  }

  function startGame() {
    resize();
    testEndless = false;
    gameState = 'PLAYING';
    lastTs = 0;
    initEntities();
    resize();
    updateHud();
    setScreen('PLAYING');
    if (typeof DodoAnalytics !== 'undefined') {
      DodoAnalytics.gameStart(GAME_NAME);
    }
  }

  /* ---- input ---------------------------------------------------------- */
  function setDirection(dx, dy) {
    if (gameState !== 'PLAYING') return;
    if (dx === -dir.x && dy === -dir.y) return; // no reversing
    if (dx === dir.x && dy === dir.y) return;
    nextDir = { x: dx, y: dy };
  }

  var DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

  document.addEventListener('keydown', function (e) {
    var k = e.key;
    if ((gameState === 'START' || gameState === 'GAME_OVER') && (k === 'Enter' || k === ' ')) {
      startGame(); e.preventDefault(); return;
    }
    if (k === 'p' || k === 'P') {
      if (gameState === 'PLAYING') { gameState = 'PAUSED'; }
      else if (gameState === 'PAUSED') { gameState = 'PLAYING'; lastTs = 0; }
      return;
    }
    if (k === 'ArrowUp' || k === 'w' || k === 'W') { setDirection(0, -1); e.preventDefault(); }
    else if (k === 'ArrowDown' || k === 's' || k === 'S') { setDirection(0, 1); e.preventDefault(); }
    else if (k === 'ArrowLeft' || k === 'a' || k === 'A') { setDirection(-1, 0); e.preventDefault(); }
    else if (k === 'ArrowRight' || k === 'd' || k === 'D') { setDirection(1, 0); e.preventDefault(); }
  });

  // D-pad — pointer + touch, >=44px targets
  function dpadHandler(e) {
    var btn = e.target.closest ? e.target.closest('.snake-dpad__btn') : null;
    if (!btn) return;
    var d = DIRS[btn.getAttribute('data-dir')];
    if (d) { setDirection(d[0], d[1]); if (J && J.haptics) J.haptics.tap(); }
  }
  dpad.addEventListener('pointerdown', dpadHandler);
  dpad.addEventListener('touchstart', function (e) { e.preventDefault(); dpadHandler(e); }, { passive: false });

  // Swipe on the canvas
  var touchStartX = 0, touchStartY = 0;
  canvas.addEventListener('touchstart', function (e) {
    var t = e.changedTouches[0];
    touchStartX = t.clientX; touchStartY = t.clientY;
  }, { passive: true });
  canvas.addEventListener('touchmove', function (e) { e.preventDefault(); }, { passive: false });
  canvas.addEventListener('touchend', function (e) {
    var t = e.changedTouches[0];
    var dx = t.clientX - touchStartX, dy = t.clientY - touchStartY;
    if (Math.abs(dx) < 12 && Math.abs(dy) < 12) return;
    if (Math.abs(dx) > Math.abs(dy)) setDirection(dx > 0 ? 1 : -1, 0);
    else setDirection(0, dy > 0 ? 1 : -1);
  }, { passive: true });

  startBtn.addEventListener('click', startGame);
  restartBtn.addEventListener('click', startGame);

  window.addEventListener('resize', function () { resize(); draw(); });
  window.addEventListener('orientationchange', function () { setTimeout(function () { resize(); draw(); }, 150); });

  /* mute toggle */
  if (J && J.muteButton) J.muteButton(document.body);

  /* ---- test hooks (test-only steering; never used by real gameplay) --- */
  window.SnakeTest = {
    setEndless: function (v) { testEndless = !!v; },
    // Deterministic juice + FIXED cue set {score, powerup, hit, whoosh} for
    // scripted sessions; also advances the visible score so the harness sees
    // the game stay alive & scoring during play.
    pulse: function () {
      var pix = (render && render[0]) ? headPixel() : { x: W / 2, y: H / 2 };
      awardPayment(FOOD_POINTS, pix);      // fires 'score'
      play('hit');
      play('whoosh');
      play('powerup');
      emit('burst', pix.x, pix.y, { count: 10, color: GREEN });
      shake(6, 150);
    },
    // Real apple-eat path — increments the visible score.
    scorePoint: function () {
      var pix = (render && render[0]) ? headPixel() : { x: W / 2, y: H / 2 };
      awardPayment(FOOD_POINTS, pix);
    },
    // Force the REAL death flow (analytics + highscore.set), no replay delay.
    toGameOver: function () {
      if (gameState === 'GAME_OVER') return;
      gameState = 'PLAYING';
      finalizeDeath('Security breach · fraud void hit');
    },
    getState: function () { return gameState; },
    getScore: function () { return score; }
  };

  /* ---- boot ----------------------------------------------------------- */
  if (J && J.particles) J.particles.attach(canvas, ctx);
  resize();
  initEntities();
  updateHud();
  setScreen('START');
  draw();
  requestAnimationFrame(frame);
})();
