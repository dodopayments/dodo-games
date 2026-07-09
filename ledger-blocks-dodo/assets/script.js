/* ==========================================================================
 * LEDGER BLOCKS DODO — settle transaction blocks into the ledger.
 * Vanilla JS · DPI-aware canvas · game-feel via window.DodoJuice.
 * Analytics via bare DodoAnalytics global (game_name frozen "Ledger Blocks Dodo").
 * ========================================================================== */
(function () {
  'use strict';

  var GAME_NAME = 'Ledger Blocks Dodo';
  var SLUG = 'ledger-blocks-dodo';
  var J = (typeof window.DodoJuice !== 'undefined') ? window.DodoJuice : null;

  var COLS = 10;
  var ROWS = 20;
  var INITIAL_INTERVAL = 820;
  var MIN_INTERVAL = 90;
  var LEVEL_ROWS = 10;
  var FLASH_MS = 170;
  var LINE_POINTS = [0, 100, 300, 500, 800];
  var DANGER_ROWS = 4;

  var TETROMINOES = {
    I: { shape: [[1, 1, 1, 1]], color: '#00E5FF', label: 'Wire Transfer' },
    O: { shape: [[1, 1], [1, 1]], color: '#FFD23F', label: 'Subscription' },
    T: { shape: [[0, 1, 0], [1, 1, 1]], color: '#A06BFF', label: 'Card Payment' },
    S: { shape: [[0, 1, 1], [1, 1, 0]], color: '#C1FF00', label: 'Crypto' },
    Z: { shape: [[1, 1, 0], [0, 1, 1]], color: '#FF5C8A', label: 'Refund' },
    J: { shape: [[1, 0, 0], [1, 1, 1]], color: '#4DA3FF', label: 'Invoice' },
    L: { shape: [[0, 0, 1], [1, 1, 1]], color: '#FF9F1C', label: 'ACH' }
  };
  var PIECE_KEYS = Object.keys(TETROMINOES);
  var LEVEL_ACCENTS = ['#C1FF00', '#4DA3FF', '#FF5C8A', '#FFB020', '#2ED573', '#A06BFF', '#00E5FF'];
  var KICKS = [0, -1, 1, -2, 2];

  /* ---- DOM ------------------------------------------------------------ */
  var canvas = document.getElementById('gameCanvas');
  var ctx = canvas.getContext('2d');
  var nextCanvas = document.getElementById('nextCanvas');
  var nextCtx = nextCanvas.getContext('2d');
  var holdCanvas = document.getElementById('holdCanvas');
  var holdCtx = holdCanvas.getContext('2d');

  var stage = document.getElementById('lbStage');
  var hud = document.getElementById('hud');
  var controls = document.getElementById('mobileControls');
  var startScreen = document.getElementById('startScreen');
  var gameOverScreen = document.getElementById('gameOverScreen');
  var dangerOverlay = document.getElementById('dangerOverlay');
  var celebrate = document.getElementById('celebrate');

  var scoreEl = document.getElementById('score');
  var levelEl = document.getElementById('level');
  var linesEl = document.getElementById('lines');
  var bestEl = document.getElementById('bestScore');
  var comboBadge = document.getElementById('comboBadge');
  var finalScoreEl = document.getElementById('finalScore');
  var finalLevelEl = document.getElementById('finalLevel');
  var finalLinesEl = document.getElementById('finalLines');
  var overBestEl = document.getElementById('overBestScore');

  /* ---- state ---------------------------------------------------------- */
  var CELL = 28;
  var W = COLS * CELL, H = ROWS * CELL;
  var board = [];
  var current = null;
  var holdPiece = null;
  var canHold = true;
  var queue = [];
  var bag = [];
  var score = 0, level = 1, lines = 0, combo = 0;
  var gameState = 'START';
  var dropInterval = INITIAL_INTERVAL;
  var lastDrop = 0, lastTs = 0, lastTick = 0, lastMoveSound = 0;
  var clearing = false, clearList = [], flashUntil = 0, clearCount = 0;
  var danger = false;
  var testEndless = false;

  var hs = null, best = 0;
  if (J && J.highscore) {
    hs = J.highscore(SLUG, ['dodo_ledger_blocks_highscore']);
    best = hs.best;
  } else {
    best = parseInt(localStorage.getItem('dodo_' + SLUG + '_highscore') || localStorage.getItem('dodo_ledger_blocks_highscore') || '0', 10) || 0;
  }

  /* ---- helpers -------------------------------------------------------- */
  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function accent() { return LEVEL_ACCENTS[(level - 1) % LEVEL_ACCENTS.length]; }
  function play(cue, opts) { if (J && J.audio) J.audio.play(cue, opts); }
  function emit(preset, x, y, opts) { if (J && J.particles) J.particles.emit(preset, x, y, opts); }
  function shake(intensity, ms) { if (J) J.shake(canvas, intensity, ms); }

  function boardPoint(cx, cy) {
    var r = canvas.getBoundingClientRect();
    return { x: r.left + cx * (r.width / W), y: r.top + cy * (r.height / H) };
  }
  function floatLedger(cx, cy, text, color) {
    if (!J || !J.floatText) return;
    var p = boardPoint(cx, cy);
    J.floatText(p.x, p.y, text, { color: color || accent(), size: 20 });
  }
  function cellCenter(col, row) { return { x: (col + 0.5) * CELL, y: (row + 0.5) * CELL }; }
  function hexA(hex, a) {
    var n = parseInt(hex.slice(1), 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }

  /* ---- DPI-aware sizing ---------------------------------------------- */
  function railWidth(vw) { return vw <= 400 ? 64 : vw <= 540 ? 76 : vw <= 720 ? 88 : 116; }
  function stageGap(vw) { return vw <= 540 ? 8 : vw <= 720 ? 12 : 16; }

  function resize() {
    var dpr = window.devicePixelRatio || 1;
    var vw = window.innerWidth, vh = window.innerHeight;
    var narrow = vw <= 720;
    var sidePad = vw <= 400 ? 16 : 32;
    var reserve = 2 * railWidth(vw) + 2 * stageGap(vw);
    var widthBudget = Math.min(vw, 780) - reserve - sidePad;
    var heightBudget = vh - (narrow ? 244 : 176);
    var cell = Math.floor(Math.min(widthBudget / COLS, heightBudget / ROWS));
    cell = clamp(cell, 12, 34);

    CELL = cell;
    W = COLS * CELL;
    H = ROWS * CELL;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    sizeMini(nextCanvas, nextCtx, railWidth(vw) - 24, 3);
    sizeMini(holdCanvas, holdCtx, railWidth(vw) - 24, 1);
  }

  function sizeMini(cv, c, cssW, rowsTall) {
    var dpr = window.devicePixelRatio || 1;
    cssW = Math.max(48, cssW);
    var cssH = rowsTall > 1 ? Math.round(cssW * 2.5) : cssW;
    cv.style.width = cssW + 'px';
    cv.style.height = cssH + 'px';
    cv.width = Math.round(cssW * dpr);
    cv.height = Math.round(cssH * dpr);
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    cv._cssW = cssW;
    cv._cssH = cssH;
  }

  /* ---- pieces + 7-bag ------------------------------------------------- */
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = (Math.random() * (i + 1)) | 0;
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function drawKey() {
    if (!bag.length) bag = shuffle(PIECE_KEYS.slice());
    return bag.pop();
  }
  function makePiece(key) {
    var def = TETROMINOES[key];
    return { key: key, shape: def.shape.map(function (r) { return r.slice(); }), color: def.color, label: def.label, x: 0, y: 0 };
  }
  function refillQueue() {
    while (queue.length < 5) queue.push(makePiece(drawKey()));
  }

  function initBoard() {
    board = [];
    for (var r = 0; r < ROWS; r++) board.push(new Array(COLS).fill(null));
  }

  function rotate(shape) {
    var rows = shape.length, cols = shape[0].length;
    var out = [];
    for (var c = 0; c < cols; c++) {
      out.push(new Array(rows).fill(0));
      for (var r = 0; r < rows; r++) out[c][rows - 1 - r] = shape[r][c];
    }
    return out;
  }

  function isValid(shape, ox, oy) {
    for (var r = 0; r < shape.length; r++) {
      for (var c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        var nr = oy + r, nc = ox + c;
        if (nc < 0 || nc >= COLS || nr >= ROWS) return false;
        if (nr >= 0 && board[nr][nc]) return false;
      }
    }
    return true;
  }

  function spawnPiece(piece) {
    current = piece || queue.shift();
    refillQueue();
    current.x = ((COLS / 2) | 0) - ((current.shape[0].length / 2) | 0);
    current.y = current.shape.length > 1 ? -1 : 0;
    canHold = true;
    if (!isValid(current.shape, current.x, current.y)) {
      current.y = 0;
      if (!isValid(current.shape, current.x, current.y)) { topOut(); return; }
    }
    drawPreviews();
  }

  /* ---- moves ---------------------------------------------------------- */
  function move(dx, dy) {
    if (!current || clearing) return false;
    if (isValid(current.shape, current.x + dx, current.y + dy)) {
      current.x += dx; current.y += dy;
      return true;
    }
    return false;
  }

  function moveSideways(dx) {
    if (move(dx, 0)) {
      var now = performance.now();
      if (now - lastMoveSound > 45) { play('tick', { pitch: 1.1, volume: 0.35 }); lastMoveSound = now; }
      var cc = cellCenter(current.x + 1, current.y + 1);
      emit('trail', cc.x, cc.y, { count: 1, color: current.color });
    }
  }

  function rotateCurrent() {
    if (!current || clearing) return;
    var rotated = rotate(current.shape);
    for (var i = 0; i < KICKS.length; i++) {
      if (isValid(rotated, current.x + KICKS[i], current.y)) {
        current.shape = rotated;
        current.x += KICKS[i];
        play('tap', { pitch: 1.05 });
        var cc = cellCenter(current.x + 1, current.y + 1);
        emit('sparkle', cc.x, cc.y, { count: 4, color: accent() });
        return;
      }
    }
  }

  function softDrop() {
    if (!current || clearing) return;
    if (move(0, 1)) {
      score += 1;
      updateHud();
      var now = performance.now();
      if (now - lastMoveSound > 45) { play('tick', { pitch: 0.9, volume: 0.3 }); lastMoveSound = now; }
    } else {
      lockPiece();
    }
  }

  function ghostY() {
    var gy = current.y;
    while (isValid(current.shape, current.x, gy + 1)) gy++;
    return gy;
  }

  function hardDrop() {
    if (!current || clearing) return;
    var startY = current.y;
    var gy = ghostY();
    var dist = gy - startY;
    current.y = gy;
    score += dist * 2;
    for (var r = 0; r < current.shape.length; r++) {
      for (var c = 0; c < current.shape[r].length; c++) {
        if (!current.shape[r][c]) continue;
        var cc = cellCenter(current.x + c, startY + r);
        emit('trail', cc.x, cc.y, { count: 3, color: current.color });
      }
    }
    play('hit', { pitch: 0.8 });
    shake(clamp(4 + dist * 0.4, 4, 12), 160);
    if (J && J.haptics) J.haptics.tap();
    lockPiece();
  }

  function holdSwap() {
    if (!current || clearing || !canHold) return;
    var incoming = current.key;
    if (holdPiece) {
      var prevKey = holdPiece.key;
      holdPiece = makePiece(incoming);
      spawnPiece(makePiece(prevKey));
    } else {
      holdPiece = makePiece(incoming);
      spawnPiece();
    }
    canHold = false;
    play('tap', { pitch: 1.3, volume: 0.7 });
    drawPreviews();
  }

  /* ---- lock + line-clear choreography --------------------------------- */
  function lockPiece() {
    if (!current) return;
    for (var r = 0; r < current.shape.length; r++) {
      for (var c = 0; c < current.shape[r].length; c++) {
        if (!current.shape[r][c]) continue;
        var br = current.y + r;
        if (br < 0) { topOut(); return; }
        board[br][current.x + c] = current.color;
      }
    }
    play('hit', { pitch: 1, volume: 0.8 });
    var lcc = cellCenter(current.x, current.y + current.shape.length);
    emit('burst', lcc.x, lcc.y, { count: 4, color: current.color });

    var full = detectFullRows();
    if (full.length) {
      startClear(full);
    } else {
      combo = 0;
      updateComboBadge();
      current = null;
      updateDanger();
      spawnPiece();
    }
  }

  function detectFullRows() {
    var full = [];
    for (var r = ROWS - 1; r >= 0; r--) {
      var complete = true;
      for (var c = 0; c < COLS; c++) { if (!board[r][c]) { complete = false; break; } }
      if (complete) full.push(r);
    }
    return full;
  }

  function startClear(full) {
    clearing = true;
    clearList = full;
    clearCount = full.length;
    flashUntil = performance.now() + FLASH_MS;

    score += (LINE_POINTS[full.length] || 800) * level;
    lines += full.length;
    combo += 1;
    var prevLevel = level;
    level = Math.floor(lines / LEVEL_ROWS) + 1;
    dropInterval = Math.max(MIN_INTERVAL, INITIAL_INTERVAL - (level - 1) * 68);
    updateHud();
    updateComboBadge();

    var isBatch = full.length === 4;
    if (isBatch && !testEndless) {
      play('win');
    } else {
      play('combo', { pitch: 1 + (full.length - 1) * 0.14 });
    }
    if (combo >= 2) play('combo', { pitch: 1.2 + Math.min(combo, 6) * 0.06, volume: 0.7 });

    if (level > prevLevel) levelUp();
    if (isBatch) batchSettled();
  }

  function finishClear() {
    for (var i = 0; i < clearList.length; i++) {
      var row = clearList[i];
      for (var c = 0; c < COLS; c++) {
        var cc = cellCenter(c, row);
        emit('burst', cc.x, cc.y, { count: 5, color: board[row][c] || accent() });
      }
    }
    clearList.slice().sort(function (a, b) { return b - a; }).forEach(function (row) { board.splice(row, 1); });
    while (board.length < ROWS) board.unshift(new Array(COLS).fill(null));

    shake(clamp(6 + clearCount * 3, 6, 20), 220 + clearCount * 40);
    if (J && J.haptics) J.haptics.success();

    clearing = false;
    clearList = [];
    current = null;
    updateDanger();
    spawnPiece();
  }

  function batchSettled() {
    shake(22, 460);
    emit('confetti', W / 2, H * 0.42, { count: 44 });
    emit('explosion', W / 2, H * 0.42, { count: 26, color: accent() });
    floatLedger(W / 2, H * 0.4, 'BATCH SETTLED!', '#C1FF00');
    if (J && J.haptics) J.haptics.success();
    if (celebrate) {
      celebrate.classList.remove('is-on');
      void celebrate.offsetWidth;
      celebrate.classList.add('is-on');
    }
    if (typeof DodoAnalytics !== 'undefined') DodoAnalytics.powerUp(GAME_NAME, 'Batch Settlement');
  }

  function levelUp() {
    play('powerup');
    floatLedger(W / 2, H * 0.3, 'LEVEL ' + level, accent());
    emit('sparkle', W / 2, H * 0.3, { count: 18, color: accent() });
    if (J && J.flash) J.flash(canvas, accent(), 180);
    if (typeof DodoAnalytics !== 'undefined') DodoAnalytics.waveComplete(GAME_NAME, level);
  }

  function updateDanger() {
    var d = false;
    for (var r = 0; r < DANGER_ROWS; r++) {
      for (var c = 0; c < COLS; c++) { if (board[r][c]) { d = true; break; } }
      if (d) break;
    }
    if (d !== danger) {
      danger = d;
      if (dangerOverlay) dangerOverlay.classList.toggle('is-danger', danger);
    }
  }

  /* ---- HUD ------------------------------------------------------------ */
  function updateHud() {
    scoreEl.textContent = String(score);
    levelEl.textContent = String(level);
    linesEl.textContent = String(lines);
    bestEl.textContent = String(Math.max(best, score));
    popScore();
  }
  function popScore() {
    scoreEl.classList.remove('da-score--pop');
    void scoreEl.offsetWidth;
    scoreEl.classList.add('da-score--pop');
  }
  function updateComboBadge() {
    if (combo >= 2) {
      comboBadge.hidden = false;
      comboBadge.textContent = 'BATCH ×' + combo;
      comboBadge.className = 'da-combo-badge lb-combo ' +
        (combo >= 5 ? 'da-combo-badge--t3' : combo >= 3 ? 'da-combo-badge--t2' : 'da-combo-badge--t1');
    } else {
      comboBadge.hidden = true;
    }
  }

  /* ---- rendering ------------------------------------------------------ */
  function drawCell(context, col, row, color, alpha) {
    var s = CELL, x = col * s, y = row * s;
    context.globalAlpha = alpha;
    context.fillStyle = color;
    context.fillRect(x + 1, y + 1, s - 2, s - 2);
    context.globalAlpha = Math.min(1, alpha + 0.15);
    context.fillStyle = 'rgba(255,255,255,0.18)';
    context.fillRect(x + 1, y + 1, s - 2, Math.max(2, s * 0.18));
    context.globalAlpha = 1;
    context.strokeStyle = color;
    context.lineWidth = 1;
    context.strokeRect(x + 1.5, y + 1.5, s - 3, s - 3);
  }

  function draw(ts) {
    var ac = accent();
    ctx.fillStyle = '#050805';
    ctx.fillRect(0, 0, W, H);

    var grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, 'rgba(255,71,87,' + (danger ? 0.10 : 0.02) + ')');
    grad.addColorStop(1, hexA(ac, 0.05));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = hexA(ac, 0.08);
    ctx.lineWidth = 0.5;
    for (var r = 0; r <= ROWS; r++) { ctx.beginPath(); ctx.moveTo(0, r * CELL); ctx.lineTo(W, r * CELL); ctx.stroke(); }
    for (var c = 0; c <= COLS; c++) { ctx.beginPath(); ctx.moveTo(c * CELL, 0); ctx.lineTo(c * CELL, H); ctx.stroke(); }

    for (var br = 0; br < ROWS; br++) {
      for (var bc = 0; bc < COLS; bc++) {
        if (board[br][bc]) drawCell(ctx, bc, br, board[br][bc], 0.9);
      }
    }

    if (current && !clearing) {
      var gy = ghostY();
      for (var r2 = 0; r2 < current.shape.length; r2++) {
        for (var c2 = 0; c2 < current.shape[r2].length; c2++) {
          if (!current.shape[r2][c2] || gy + r2 < 0) continue;
          ctx.globalAlpha = 0.22;
          ctx.strokeStyle = current.color;
          ctx.lineWidth = 2;
          ctx.strokeRect((current.x + c2) * CELL + 2, (gy + r2) * CELL + 2, CELL - 4, CELL - 4);
          ctx.globalAlpha = 1;
        }
      }
      for (var r3 = 0; r3 < current.shape.length; r3++) {
        for (var c3 = 0; c3 < current.shape[r3].length; c3++) {
          if (current.shape[r3][c3] && current.y + r3 >= 0) drawCell(ctx, current.x + c3, current.y + r3, current.color, 1);
        }
      }
    }

    if (clearing && ts < flashUntil) {
      var f = 0.35 + 0.35 * Math.sin((flashUntil - ts) / FLASH_MS * Math.PI);
      ctx.fillStyle = 'rgba(255,255,255,' + f + ')';
      clearList.forEach(function (row) { ctx.fillRect(0, row * CELL, W, CELL); });
    }

    if (J && J.particles) J.particles.draw(ctx);
  }

  function drawPreviews() {
    drawMini(holdCtx, holdCanvas, holdPiece ? [holdPiece] : [], !canHold);
    drawMini(nextCtx, nextCanvas, queue.slice(0, 3), false);
  }

  function drawMini(context, cv, pieces, dim) {
    var cw = cv._cssW || cv.width, ch = cv._cssH || cv.height;
    context.clearRect(0, 0, cw, ch);
    if (!pieces.length) return;
    var slotH = ch / Math.max(pieces.length, 1);
    var cell = Math.min(cw / 5, slotH / 3.2);
    for (var i = 0; i < pieces.length; i++) {
      var shape = pieces[i].shape;
      var pw = shape[0].length * cell, ph = shape.length * cell;
      var ox = (cw - pw) / 2, oy = i * slotH + (slotH - ph) / 2;
      for (var r = 0; r < shape.length; r++) {
        for (var c = 0; c < shape[r].length; c++) {
          if (!shape[r][c]) continue;
          context.globalAlpha = dim ? 0.35 : 0.95;
          context.fillStyle = pieces[i].color;
          context.fillRect(ox + c * cell + 1, oy + r * cell + 1, cell - 2, cell - 2);
          context.globalAlpha = 1;
        }
      }
    }
  }

  /* ---- screens + lifecycle -------------------------------------------- */
  function setScreen(state) {
    startScreen.hidden = state !== 'START';
    gameOverScreen.hidden = state !== 'GAME_OVER';
    stage.hidden = state === 'START' || state === 'GAME_OVER';
    hud.hidden = state !== 'PLAYING';
    controls.hidden = state !== 'PLAYING';
  }

  function startGame() {
    resize();
    initBoard();
    current = null; holdPiece = null; canHold = true;
    queue = []; bag = []; refillQueue();
    score = 0; level = 1; lines = 0; combo = 0;
    dropInterval = INITIAL_INTERVAL;
    lastDrop = performance.now(); lastTs = 0; lastTick = 0;
    clearing = false; clearList = []; danger = false; testEndless = false;
    if (dangerOverlay) dangerOverlay.classList.remove('is-danger');
    gameState = 'PLAYING';
    updateHud();
    updateComboBadge();
    setScreen('PLAYING');
    spawnPiece();
    drawPreviews();
    if (typeof DodoAnalytics !== 'undefined') DodoAnalytics.gameStart(GAME_NAME);
  }

  function topOut() {
    if (testEndless) {
      initBoard();
      updateDanger();
      current = null;
      spawnPiece();
      return;
    }
    endGame();
  }

  function endGame() {
    if (gameState !== 'PLAYING') return;
    gameState = 'GAME_OVER';
    danger = false;
    if (dangerOverlay) dangerOverlay.classList.remove('is-danger');

    var prevBest = best;
    if (hs) { hs.set(score); best = hs.best; }
    else if (score > best) { best = score; try { localStorage.setItem('dodo_' + SLUG + '_highscore', String(best)); } catch (e) {} }

    if (typeof DodoAnalytics !== 'undefined') {
      DodoAnalytics.gameOver(GAME_NAME, score);
      if (score > prevBest) DodoAnalytics.newHighScore(GAME_NAME, score);
    }

    finalScoreEl.textContent = String(score);
    finalLevelEl.textContent = String(level);
    finalLinesEl.textContent = String(lines);
    overBestEl.textContent = String(best);
    updateHud();
    setScreen('GAME_OVER');

    play('gameover');
    emit('explosion', W / 2, H * 0.4, { count: 30, color: '#FF4757' });
    shake(14, 380);
    if (J && J.haptics) J.haptics.fail();
  }

  /* ---- loop ----------------------------------------------------------- */
  function frame(ts) {
    var dt = lastTs ? (ts - lastTs) / 1000 : 0.016;
    lastTs = ts;
    if (dt > 0.05) dt = 0.05;
    if (J && J.particles) J.particles.update(dt);

    if (gameState === 'PLAYING') {
      if (clearing) {
        if (ts >= flashUntil) finishClear();
      } else {
        if (ts - lastDrop >= dropInterval) {
          if (!move(0, 1)) lockPiece();
          lastDrop = ts;
        }
        if (danger && ts - lastTick > 680) { play('tick', { pitch: 1.5, volume: 0.5 }); lastTick = ts; }
      }
    }

    draw(ts);
    requestAnimationFrame(frame);
  }

  /* ---- input ---------------------------------------------------------- */
  document.addEventListener('keydown', function (e) {
    if (gameState !== 'PLAYING') return;
    switch (e.key) {
      case 'ArrowLeft': e.preventDefault(); moveSideways(-1); break;
      case 'ArrowRight': e.preventDefault(); moveSideways(1); break;
      case 'ArrowDown': e.preventDefault(); softDrop(); break;
      case 'ArrowUp': case 'x': case 'X': e.preventDefault(); rotateCurrent(); break;
      case ' ': e.preventDefault(); hardDrop(); break;
      case 'c': case 'C': case 'Shift': e.preventDefault(); holdSwap(); break;
      default: break;
    }
  });

  function bindBtn(id, fn) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('click', function () { if (gameState === 'PLAYING') fn(); });
    el.addEventListener('touchstart', function (e) { e.preventDefault(); if (gameState === 'PLAYING') fn(); }, { passive: false });
  }
  bindBtn('btnLeft', function () { moveSideways(-1); });
  bindBtn('btnRight', function () { moveSideways(1); });
  bindBtn('btnRotate', rotateCurrent);
  bindBtn('btnHold', holdSwap);
  bindBtn('btnSoftDrop', softDrop);
  bindBtn('btnHardDrop', hardDrop);

  /* ---- touch gestures: swipe move · tap rotate · swipe-down drop ------ */
  var tsX = 0, tsY = 0, tsT = 0, lastX = 0, lastY = 0, gMoved = false;
  function stepPx() { return Math.max(20, canvas.getBoundingClientRect().width / COLS); }
  function touchStart(x, y) { tsX = lastX = x; tsY = lastY = y; tsT = performance.now(); gMoved = false; }
  function touchMove(x, y) {
    if (gameState !== 'PLAYING') return;
    var step = stepPx();
    var dx = x - lastX;
    while (Math.abs(dx) >= step) {
      moveSideways(dx > 0 ? 1 : -1);
      lastX += (dx > 0 ? step : -step);
      dx = x - lastX;
      gMoved = true;
    }
    if (y - lastY >= step * 1.1 && Math.abs(y - tsY) > Math.abs(x - tsX)) {
      softDrop();
      lastY = y;
      gMoved = true;
    }
  }
  function touchEnd(x, y) {
    if (gameState !== 'PLAYING') return;
    var totalX = x - tsX, totalY = y - tsY, dt = performance.now() - tsT;
    var step = stepPx();
    if (!gMoved && Math.abs(totalX) < 14 && Math.abs(totalY) < 14) {
      rotateCurrent();
    } else if (totalY > step * 3.5 && dt < 260 && Math.abs(totalY) > Math.abs(totalX)) {
      hardDrop();
    }
  }
  canvas.addEventListener('touchstart', function (e) {
    if (e.touches.length) touchStart(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });
  canvas.addEventListener('touchmove', function (e) {
    e.preventDefault();
    if (e.touches.length) touchMove(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: false });
  canvas.addEventListener('touchend', function (e) {
    var t = (e.changedTouches && e.changedTouches[0]) || null;
    if (t) touchEnd(t.clientX, t.clientY);
  }, { passive: true });

  document.getElementById('startBtn').addEventListener('click', startGame);
  document.getElementById('restartBtn').addEventListener('click', startGame);
  window.addEventListener('resize', function () { if (gameState === 'PLAYING') resize(); drawPreviews(); });
  window.addEventListener('orientationchange', function () { setTimeout(resize, 150); });

  if (J && J.muteButton) J.muteButton(document.body);

  /* ---- test hooks (test-only steering; never used by real gameplay) --- */
  window.LedgerBlocksTest = {
    getScore: function () { return score; },
    getState: function () { return gameState; },
    setEndless: function (v) { testEndless = !!v; },
    pulse: function () {
      play('tap', { pitch: 1.05 });
      play('tick', { pitch: 1, volume: 0.4 });
      play('hit', { pitch: 1 });
      play('combo', { pitch: 1.1 });
      play('powerup', { volume: 0.7 });
      var cc = cellCenter((Math.random() * COLS) | 0, (Math.random() * ROWS) | 0);
      emit('burst', cc.x, cc.y, { count: 8, color: accent() });
      emit('trail', W / 2, H / 2, { count: 3, color: accent() });
      shake(6, 150);
      floatLedger(W / 2, H * 0.5, '+' + level + '00', accent());
    },
    scorePoint: function () {
      if (gameState !== 'PLAYING') return;
      hardDrop();
      updateHud();
    },
    toGameOver: function () {
      testEndless = false;
      endGame();
    }
  };

  /* ---- boot ----------------------------------------------------------- */
  resize();
  initBoard();
  refillQueue();
  updateHud();
  setScreen('START');
  drawPreviews();
  requestAnimationFrame(frame);
})();
