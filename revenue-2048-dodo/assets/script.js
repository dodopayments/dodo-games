/* ==========================================================================
 * REVENUE 2048 DODO — merge revenue tiles from $1 to a $1B unicorn.
 * Vanilla JS DOM grid. FLIP slide animation, merge-chain combos, one-per-run
 * Refund (undo), milestone celebrations, and post-$1B endless mode.
 * Game-feel via window.DodoJuice; analytics via bare DodoAnalytics global
 * (game_name frozen as "Revenue 2048 Dodo").
 * ========================================================================== */
(function () {
  'use strict';

  var GAME_NAME = 'Revenue 2048 Dodo';
  var SLUG = 'revenue-2048-dodo';
  var LEGACY_KEYS = ['dodo_revenue_2048_highscore'];
  var NEW_KEY = 'dodo_' + SLUG + '_highscore';

  var GRID = 4;
  var WIN_VALUE = 1073741824;
  var COMBO_BASE = 25;
  var SLIDE_MS = 120;

  var MILESTONES = {
    1024: 'FIRST $1K! \uD83D\uDCB8',
    1048576: '$1M ARR! \uD83D\uDE80',
    1073741824: '$1B UNICORN! \uD83E\uDD84'
  };

  var J = (typeof window.DodoJuice !== 'undefined') ? window.DodoJuice : null;

  /* ---- state ---------------------------------------------------------- */
  var gameState = 'START';
  var score = 0;
  var best = 0;
  var sessionStartBest = 0;
  var board = createEmptyBoard();
  var milestones = new Set();
  var prevState = null;
  var hasUndoState = false;
  var undoUsed = false;
  var endless = false;
  var comboTimer = 0;

  var touchStartX = 0;
  var touchStartY = 0;

  var hs = null;
  if (J && J.highscore) {
    hs = J.highscore(SLUG, LEGACY_KEYS);
    best = hs.best;
  } else {
    best = parseInt(localStorage.getItem(NEW_KEY) || localStorage.getItem(LEGACY_KEYS[0]) || '0', 10) || 0;
  }

  /* ---- DOM ------------------------------------------------------------ */
  var startScreen = document.getElementById('startScreen');
  var gameScreen = document.getElementById('gameScreen');
  var gameOverScreen = document.getElementById('gameOverScreen');
  var winOverlay = document.getElementById('winOverlay');

  var startButton = document.getElementById('startButton');
  var restartButton = document.getElementById('restartButton');
  var newGameButton = document.getElementById('newGameButton');
  var newGameFromWinButton = document.getElementById('newGameFromWinButton');
  var keepPlayingButton = document.getElementById('keepPlayingButton');
  var undoButton = document.getElementById('undoButton');

  var scoreEl = document.getElementById('score');
  var bestScoreEl = document.getElementById('bestScore');
  var finalScoreEl = document.getElementById('finalScore');
  var overBestScoreEl = document.getElementById('overBestScore');
  var comboBadge = document.getElementById('comboBadge');
  var gridEl = document.getElementById('grid');

  var cells = [];

  /* ---- pure board helpers --------------------------------------------- */
  function createEmptyBoard() {
    return Array.from({ length: GRID }, function () { return Array(GRID).fill(0); });
  }

  function cloneBoard(src) {
    return src.map(function (row) { return row.slice(); });
  }

  function sameBoard(a, b) {
    for (var r = 0; r < GRID; r += 1) {
      for (var c = 0; c < GRID; c += 1) {
        if (a[r][c] !== b[r][c]) return false;
      }
    }
    return true;
  }

  function formatTileValue(v) {
    if (v >= 1073741824) return '$1B';
    if (v >= 1048576) return '$' + Math.floor(v / 1048576) + 'M';
    if (v >= 1024) return '$' + Math.floor(v / 1024) + 'K';
    return '$' + v;
  }

  function formatScore(v) {
    if (v < 1000) return '$' + v;
    if (v < 1e6) return '$' + trimNum(v / 1e3) + 'K';
    if (v < 1e9) return '$' + trimNum(v / 1e6) + 'M';
    return '$' + trimNum(v / 1e9) + 'B';
  }

  function trimNum(n) {
    var s = n >= 100 ? n.toFixed(0) : n.toFixed(1);
    return s.replace(/\.0$/, '');
  }

  function tierFor(v) {
    if (v >= 1073741824) return 8;
    if (v >= 16777216) return 7;
    if (v >= 1048576) return 6;
    if (v >= 262144) return 5;
    if (v >= 16384) return 4;
    if (v >= 1024) return 3;
    if (v >= 256) return 2;
    if (v >= 16) return 1;
    return 0;
  }

  function pitchForValue(v) {
    var p = 0.7 + clamp(log2(v), 1, 30) * 0.055;
    return clamp(p, 0.7, 2.4);
  }

  function log2(v) { return Math.log(v) / Math.LN2; }
  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

  /* ---- juice helpers (all guarded) ------------------------------------ */
  function play(cue, opts) { if (J && J.audio) J.audio.play(cue, opts); }
  function emit(preset, x, y, opts) { if (J && J.particles) J.particles.emit(preset, x, y, opts); }
  function shakeBoard(intensity, ms) { if (J) J.shake(gridEl, intensity, ms); }
  function floatText(x, y, text, color) { if (J && J.floatText) J.floatText(x, y, text, { color: color, size: 20 }); }

  function cellCenter(index) {
    var r = cells[index].getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  /* ---- grid build + render -------------------------------------------- */
  function buildGrid() {
    for (var i = 0; i < GRID * GRID; i += 1) {
      var cell = document.createElement('div');
      cell.className = 'cell';
      cell.setAttribute('role', 'gridcell');
      gridEl.appendChild(cell);
      cells.push(cell);
    }
  }

  function makeTile(value) {
    var t = document.createElement('div');
    var label = formatTileValue(value);
    t.className = 'tile';
    t.dataset.tier = String(tierFor(value));
    t.dataset.len = String(label.length);
    t.textContent = label;
    return t;
  }

  function clearCells() {
    for (var i = 0; i < cells.length; i += 1) {
      var cell = cells[i];
      while (cell.firstChild) cell.removeChild(cell.firstChild);
    }
  }

  function slideFrom(el, srcIndex, destIndex) {
    var src = cells[srcIndex];
    var dst = cells[destIndex];
    var dx = src.offsetLeft - dst.offsetLeft;
    var dy = src.offsetTop - dst.offsetTop;
    if (!dx && !dy) return;
    el.style.transition = 'none';
    el.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
    requestAnimationFrame(function () {
      el.style.transition = 'transform ' + SLIDE_MS + 'ms cubic-bezier(0.22,1,0.36,1)';
      el.style.transform = 'translate(0,0)';
    });
  }

  function renderBoard(opts) {
    opts = opts || {};
    var moves = opts.moves || null;
    var newTileIndex = (opts.newTileIndex == null) ? -1 : opts.newTileIndex;
    var mergedSet = new Set(opts.mergedDest || []);
    var animate = !!opts.animate && moves;

    clearCells();

    if (animate) {
      for (var m = 0; m < moves.length; m += 1) {
        var mv = moves[m];
        var tile = makeTile(mv.value);
        if (mergedSet.has(mv.to)) tile.classList.add('is-merge');
        cells[mv.to].appendChild(tile);
        slideFrom(tile, mv.fromIndex, mv.to);
        if (mv.merged && mv.from2Index != null && mv.from2Index !== mv.to) {
          spawnGhost(mv.value / 2, mv.to, mv.from2Index);
        }
      }
      if (newTileIndex >= 0) {
        var nv = board[Math.floor(newTileIndex / GRID)][newTileIndex % GRID];
        var ntile = makeTile(nv);
        ntile.classList.add('is-new');
        cells[newTileIndex].appendChild(ntile);
      }
    } else {
      for (var r = 0; r < GRID; r += 1) {
        for (var c = 0; c < GRID; c += 1) {
          if (board[r][c]) cells[r * GRID + c].appendChild(makeTile(board[r][c]));
        }
      }
    }
  }

  function spawnGhost(value, destIndex, fromIndex) {
    var g = makeTile(value);
    g.classList.add('is-ghost');
    cells[destIndex].appendChild(g);
    slideFrom(g, fromIndex, destIndex);
    window.setTimeout(function () {
      if (g.parentNode) g.parentNode.removeChild(g);
    }, SLIDE_MS + 40);
  }

  /* ---- spawning ------------------------------------------------------- */
  function getEmptyPositions() {
    var empty = [];
    for (var r = 0; r < GRID; r += 1) {
      for (var c = 0; c < GRID; c += 1) {
        if (board[r][c] === 0) empty.push(r * GRID + c);
      }
    }
    return empty;
  }

  function addRandomTile() {
    var empty = getEmptyPositions();
    if (!empty.length) return -1;
    var index = empty[Math.floor(Math.random() * empty.length)];
    board[Math.floor(index / GRID)][index % GRID] = Math.random() < 0.9 ? 1 : 2;
    return index;
  }

  /* ---- move computation (with FLIP source tracking) ------------------- */
  function lineCells(dir, i) {
    var arr = [];
    var k;
    if (dir === 'left') { for (k = 0; k < GRID; k += 1) arr.push([i, k]); }
    else if (dir === 'right') { for (k = GRID - 1; k >= 0; k -= 1) arr.push([i, k]); }
    else if (dir === 'up') { for (k = 0; k < GRID; k += 1) arr.push([k, i]); }
    else { for (k = GRID - 1; k >= 0; k -= 1) arr.push([k, i]); }
    return arr;
  }

  function computeMove(dir) {
    var newBoard = createEmptyBoard();
    var moves = [];
    var mergedDest = [];
    var scoreGain = 0;
    var mergeCount = 0;

    for (var i = 0; i < GRID; i += 1) {
      var line = lineCells(dir, i);
      var seq = [];
      for (var s = 0; s < line.length; s += 1) {
        var rr = line[s][0];
        var cc = line[s][1];
        if (board[rr][cc] !== 0) seq.push({ v: board[rr][cc], from: rr * GRID + cc });
      }

      var out = [];
      var k = 0;
      while (k < seq.length) {
        if (k + 1 < seq.length && seq[k].v === seq[k + 1].v) {
          out.push({ v: seq[k].v * 2, from: seq[k].from, from2: seq[k + 1].from, merged: true });
          scoreGain += seq[k].v * 2;
          mergeCount += 1;
          k += 2;
        } else {
          out.push({ v: seq[k].v, from: seq[k].from, from2: null, merged: false });
          k += 1;
        }
      }

      for (var o = 0; o < out.length; o += 1) {
        var dr = line[o][0];
        var dc = line[o][1];
        var dest = dr * GRID + dc;
        newBoard[dr][dc] = out[o].v;
        moves.push({
          to: dest,
          fromIndex: out[o].from,
          from2Index: out[o].from2,
          merged: out[o].merged,
          value: out[o].v
        });
        if (out[o].merged) mergedDest.push(dest);
      }
    }

    return { newBoard: newBoard, moves: moves, scoreGain: scoreGain, mergeCount: mergeCount, mergedDest: mergedDest };
  }

  function canMove() {
    if (getEmptyPositions().length) return true;
    for (var r = 0; r < GRID; r += 1) {
      for (var c = 0; c < GRID; c += 1) {
        var v = board[r][c];
        if (r + 1 < GRID && board[r + 1][c] === v) return true;
        if (c + 1 < GRID && board[r][c + 1] === v) return true;
      }
    }
    return false;
  }

  function maxMergedValue(mergedDest) {
    var mx = 0;
    for (var i = 0; i < mergedDest.length; i += 1) {
      var idx = mergedDest[i];
      var v = board[Math.floor(idx / GRID)][idx % GRID];
      if (v > mx) mx = v;
    }
    return mx;
  }

  /* ---- HUD ------------------------------------------------------------ */
  function updateHud() {
    scoreEl.textContent = formatScore(score);
    bestScoreEl.textContent = formatScore(best);
  }

  function celebrateText(text, color) {
    var r = gridEl.getBoundingClientRect();
    floatText(r.left + r.width / 2, r.top + r.height * 0.32, text, color);
  }

  function bumpScore() {
    scoreEl.classList.remove('da-score--pop');
    void scoreEl.offsetWidth;
    scoreEl.classList.add('da-score--pop');
  }

  function flashCombo(mergeCount, bonus) {
    var tier = mergeCount >= 4 ? 'da-combo-badge--t3' : (mergeCount >= 3 ? 'da-combo-badge--t2' : 'da-combo-badge--t1');
    comboBadge.className = 'da-combo-badge r2048-combo ' + tier;
    comboBadge.textContent = 'COMBO \u00D7' + mergeCount + ' +$' + bonus.toLocaleString('en-US');
    comboBadge.hidden = false;
    void comboBadge.offsetWidth;
    comboBadge.classList.add('da-anim-pop');
    window.clearTimeout(comboTimer);
    comboTimer = window.setTimeout(function () { comboBadge.hidden = true; }, 1400);
  }

  function refreshUndoButton() {
    undoButton.disabled = undoUsed || !hasUndoState || gameState !== 'PLAYING';
  }

  function setScreen(state) {
    gameScreen.classList.toggle('hidden', state === 'start');
    startScreen.classList.toggle('hidden', state !== 'start');
    gameOverScreen.classList.toggle('hidden', state !== 'over');
  }

  /* ---- core move ------------------------------------------------------ */
  function doMove(direction) {
    if (gameState !== 'PLAYING') return false;

    var res = computeMove(direction);
    if (sameBoard(board, res.newBoard)) return false;

    prevState = { board: cloneBoard(board), score: score, milestones: new Set(milestones) };
    hasUndoState = true;

    board = res.newBoard;
    score += res.scoreGain;

    var comboBonus = 0;
    if (res.mergeCount >= 2) {
      comboBonus = COMBO_BASE * res.mergeCount * (res.mergeCount - 1);
      score += comboBonus;
    }

    var newIndex = addRandomTile();
    renderBoard({ moves: res.moves, newTileIndex: newIndex, mergedDest: res.mergedDest, animate: true });
    bumpScore();
    updateHud();

    if (res.mergeCount === 0) {
      play('tap', { pitch: 0.9, volume: 0.5 });
    } else {
      play('score', { pitch: pitchForValue(maxMergedValue(res.mergedDest)) });
      emitMergeParticles(res.mergedDest, res.mergeCount);
      shakeBoard(clamp(4 + res.mergeCount * 2, 4, 14), 200);
      if (res.mergeCount >= 2) {
        play('combo', { pitch: 1 + Math.min(res.mergeCount, 5) * 0.08 });
        flashCombo(res.mergeCount, comboBonus);
        if (J && J.haptics) J.haptics.success();
      } else if (J && J.haptics) {
        J.haptics.tap();
      }
    }

    if (hs) { hs.set(score); best = hs.best; }
    else if (score > best) best = score;
    updateHud();

    checkMilestones(res.mergedDest);
    refreshUndoButton();

    if (gameState === 'PLAYING' && !canMove()) endGame();
    return true;
  }

  function emitMergeParticles(mergedDest, mergeCount) {
    for (var i = 0; i < mergedDest.length; i += 1) {
      var p = cellCenter(mergedDest[i]);
      emit('burst', p.x, p.y, { count: 8 + mergeCount * 4, color: '#C1FF00' });
    }
  }

  function checkMilestones(mergedDest) {
    for (var i = 0; i < mergedDest.length; i += 1) {
      var idx = mergedDest[i];
      var v = board[Math.floor(idx / GRID)][idx % GRID];
      if (!MILESTONES[v] || milestones.has(v)) continue;
      milestones.add(v);

      var p = cellCenter(idx);
      play('win');
      emit('confetti', p.x, p.y, { count: 42 });
      celebrateText(MILESTONES[v], '#C1FF00');
      var tile = cells[idx].querySelector('.tile');
      if (tile) tile.classList.add('is-milestone');
      if (J && J.haptics) J.haptics.success();

      if (v === WIN_VALUE && !endless) {
        gameState = 'WIN';
        winOverlay.classList.remove('hidden');
      }
    }
  }

  /* ---- undo (Refund) -------------------------------------------------- */
  function doRefund() {
    if (undoUsed || !hasUndoState || !prevState) return;
    if (gameState !== 'PLAYING' && gameState !== 'WIN') return;

    board = cloneBoard(prevState.board);
    score = prevState.score;
    milestones = new Set(prevState.milestones);
    undoUsed = true;
    hasUndoState = false;
    gameState = 'PLAYING';
    winOverlay.classList.add('hidden');

    renderBoard({ animate: false });
    updateHud();
    refreshUndoButton();
    play('whoosh');
    if (J && J.haptics) J.haptics.tap();
  }

  /* ---- lifecycle ------------------------------------------------------ */
  function startGame() {
    gameState = 'PLAYING';
    score = 0;
    best = hs ? hs.best : best;
    sessionStartBest = best;
    board = createEmptyBoard();
    milestones = new Set();
    prevState = null;
    hasUndoState = false;
    undoUsed = false;
    endless = false;
    comboBadge.hidden = true;
    winOverlay.classList.add('hidden');

    addRandomTile();
    addRandomTile();

    setScreen('game');
    updateHud();
    renderBoard({ animate: false });
    refreshUndoButton();

    if (typeof DodoAnalytics !== 'undefined') DodoAnalytics.gameStart(GAME_NAME);
  }

  function keepPlaying() {
    if (gameState !== 'WIN') return;
    gameState = 'PLAYING';
    endless = true;
    winOverlay.classList.add('hidden');
    refreshUndoButton();
  }

  function endGame() {
    if (gameState === 'GAME_OVER') return;
    gameState = 'GAME_OVER';

    if (hs) hs.set(score);
    else if (score > best) { best = score; try { localStorage.setItem(NEW_KEY, String(score)); } catch (e) {} }
    var finalBest = hs ? hs.best : best;

    if (typeof DodoAnalytics !== 'undefined') {
      DodoAnalytics.gameOver(GAME_NAME, score);
      if (score > sessionStartBest) DodoAnalytics.newHighScore(GAME_NAME, score);
    }

    finalScoreEl.textContent = formatScore(score);
    overBestScoreEl.textContent = formatScore(finalBest);
    updateHud();
    setScreen('over');

    play('gameover');
    shakeBoard(10, 380);
    if (J && J.haptics) J.haptics.fail();
    refreshUndoButton();
  }

  /* ---- input ---------------------------------------------------------- */
  var DIR_KEYS = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };

  document.addEventListener('keydown', function (e) {
    if (!DIR_KEYS[e.key]) return;
    e.preventDefault();
    doMove(DIR_KEYS[e.key]);
  });

  gridEl.addEventListener('touchstart', function (e) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  gridEl.addEventListener('touchend', function (e) {
    var dx = e.changedTouches[0].clientX - touchStartX;
    var dy = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return;
    if (Math.abs(dx) > Math.abs(dy)) doMove(dx > 0 ? 'right' : 'left');
    else doMove(dy > 0 ? 'down' : 'up');
  }, { passive: true });

  startButton.addEventListener('click', startGame);
  restartButton.addEventListener('click', startGame);
  newGameButton.addEventListener('click', startGame);
  newGameFromWinButton.addEventListener('click', startGame);
  keepPlayingButton.addEventListener('click', keepPlaying);
  undoButton.addEventListener('click', doRefund);

  if (J && J.muteButton) J.muteButton(document.body);
  if (J && J.particles && J.particles.overlay) J.particles.overlay();

  /* ---- test hooks (real functions; test-only state steering) ---------- */
  window.Revenue2048Test = {
    move: function (dir) { return doMove(dir); },
    scorePoint: function () {
      if (gameState !== 'PLAYING') return;
      board = createEmptyBoard();
      board[0][0] = 1;
      board[0][1] = 1;
      doMove('left');
    },
    scriptedBeat: function () {
      if (gameState !== 'PLAYING') return;
      board = createEmptyBoard();
      board[0][3] = 1;
      doMove('left');
      board = createEmptyBoard();
      board[0][0] = 1; board[0][1] = 1; board[0][2] = 2; board[0][3] = 2;
      doMove('left');
      undoUsed = false;
      doRefund();
    },
    refund: function () { undoUsed = false; doRefund(); },
    triggerMilestone: function (value) {
      if (gameState !== 'PLAYING') return;
      var v = value || 1024;
      board = createEmptyBoard();
      board[0][0] = v / 2;
      board[0][1] = v / 2;
      doMove('left');
    },
    toGameOver: function () { endGame(); },
    restart: function () { startGame(); },
    getScore: function () { return score; },
    getState: function () { return gameState; }
  };

  /* ---- boot ----------------------------------------------------------- */
  buildGrid();
  updateHud();
  renderBoard({ animate: false });
  setScreen('start');
})();
