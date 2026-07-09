/* ==========================================================================
 * FRAUD WHACKER DODO — arcade whack-a-mole with target variety, combo meter,
 * frenzy swarms, lives, and full game-feel juice. Vanilla JS, stays DOM.
 * Single rAF scheduler drives all spawn/despawn timing (no setTimeout drift).
 * Game-feel via window.DodoJuice; analytics via window.DodoAnalytics
 * (game_name frozen as "Fraud Whacker Dodo").
 * ========================================================================== */
(function () {
  'use strict';

  var GAME_NAME = 'Fraud Whacker Dodo';
  var J = (typeof window.DodoJuice !== 'undefined') ? window.DodoJuice : null;

  /* ---- tuning --------------------------------------------------------- */
  var HOLES = 9;
  var MAX_LIVES = 3;
  var SPAWN_MAX = 1050, SPAWN_MIN = 520;      // ms between spawns (ramps down)
  var TTL_MAX = 1550, TTL_MIN = 820;          // ms a target stays up (ramps down)
  var RAMP_SECONDS = 75;                       // seconds to reach full difficulty
  var FRENZY_EVERY = 25;                        // whacks per frenzy
  var FRENZY_MS = 5000;
  var PTS = { fraud: 10, golden: 20, decoy: 15 };
  var PENALTY = 25;

  var ICON = { fraud: '\uD83E\uDD16', golden: '\u2726', decoy: '\u26A0', legit: '\u2713' };
  var LABEL = { fraud: 'FRAUD', golden: 'GOLD', decoy: 'CHARGE', legit: 'LEGIT' };

  /* ---- DOM ------------------------------------------------------------ */
  var shell = document.getElementById('fwShell');
  var hud = document.getElementById('hud');
  var startScreen = document.getElementById('startScreen');
  var gameScreen = document.getElementById('gameScreen');
  var gameOverScreen = document.getElementById('gameOverScreen');
  var gridEl = document.getElementById('grid');

  var startButton = document.getElementById('startButton');
  var restartButton = document.getElementById('restartButton');
  var scoreEl = document.getElementById('score');
  var bestScoreEl = document.getElementById('bestScore');
  var livesEl = document.getElementById('lives');
  var comboBadge = document.getElementById('comboBadge');
  var finalScoreEl = document.getElementById('finalScore');
  var finalComboEl = document.getElementById('finalCombo');
  var finalBlockedEl = document.getElementById('finalBlocked');
  var overBestScoreEl = document.getElementById('overBestScore');
  var resultTitle = document.getElementById('resultTitle');
  var resultEyebrow = document.getElementById('resultEyebrow');

  var holes = [], targetEls = [], iconEls = [], labelEls = [];

  /* ---- state ---------------------------------------------------------- */
  var gameState = 'START';       // START | PLAYING | GAME_OVER
  var testEndless = false;       // test-only: disables lives/frenzy ending mid-session
  var score = 0, best = 0, combo = 0, bestCombo = 0, lives = MAX_LIVES;
  var blocked = 0, whackCount = 0, sinceFrenzy = 0;
  var frenzyActive = false, frenzyEnd = 0;

  var startTime = 0, lastSpawn = 0;
  var curSpawn = SPAWN_MAX, curTtl = TTL_MAX, maxActive = 3;

  var targets = new Map();       // index -> { type, spawnAt, ttl, lastSpark }
  var holeClearAt = new Array(HOLES).fill(0);

  /* ---- highscore (with legacy migration) ------------------------------ */
  var hs = null;
  if (J && J.highscore) {
    hs = J.highscore('fraud-whacker-dodo', ['dodo_fraud_whacker_highscore']);
    best = hs.best;
  } else {
    best = parseInt(localStorage.getItem('dodo_fraud-whacker-dodo_highscore') ||
      localStorage.getItem('dodo_fraud_whacker_highscore') || '0', 10) || 0;
  }

  /* ---- juice/audio wrappers ------------------------------------------- */
  function nowMs() { return (window.performance && performance.now) ? performance.now() : Date.now(); }
  function play(cue, opts) { if (J && J.audio) J.audio.play(cue, opts); }
  function emit(preset, x, y, opts) { if (J && J.particles) J.particles.emit(preset, x, y, opts); }
  function shake(el, i, ms) { if (J && J.shake) J.shake(el, i, ms); }
  function flash(el, c, ms) { if (J && J.flash) J.flash(el, c, ms); }
  function floatText(x, y, txt, color) { if (J && J.floatText) J.floatText(x, y, txt, { color: color, size: 20 }); }
  function hapt(kind) { if (J && J.haptics && J.haptics[kind]) J.haptics[kind](); }

  function holeCenter(index) {
    var r = holes[index].getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height * 0.42 };
  }

  function splash(x, y) {
    if (x == null || y == null) return;
    if (J && J.reducedMotion) return;
    var d = document.createElement('div');
    d.className = 'fw-splash';
    d.style.left = x + 'px';
    d.style.top = y + 'px';
    document.body.appendChild(d);
    window.setTimeout(function () { if (d.parentNode) d.parentNode.removeChild(d); }, 420);
  }

  function makeEl(tag, cls) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    return e;
  }

  /* ---- HUD ------------------------------------------------------------ */
  function multiplier() { return combo >= 10 ? 4 : combo >= 6 ? 3 : combo >= 3 ? 2 : 1; }

  function popScore() {
    scoreEl.classList.remove('da-score--pop');
    void scoreEl.offsetWidth;
    scoreEl.classList.add('da-score--pop');
  }

  function updateHud() {
    scoreEl.textContent = String(score);
    bestScoreEl.textContent = String(Math.max(best, score));
    if (combo >= 2) {
      var m = multiplier();
      comboBadge.hidden = false;
      comboBadge.textContent = 'COMBO \u00D7' + combo + (m > 1 ? ' \u00B7 ' + m + 'x' : '');
      comboBadge.className = 'da-combo-badge fw-combo ' +
        (combo >= 10 ? 'da-combo-badge--t3' : combo >= 6 ? 'da-combo-badge--t2' : 'da-combo-badge--t1');
    } else {
      comboBadge.hidden = true;
    }
  }

  function renderLives() {
    var kids = [];
    for (var i = 0; i < MAX_LIVES; i++) {
      kids.push(makeEl('span', 'fw-shield' + (i >= lives ? ' fw-shield--lost' : '')));
    }
    livesEl.replaceChildren.apply(livesEl, kids);
  }

  /* ---- hole visuals --------------------------------------------------- */
  function markHit(index) {
    holes[index].classList.remove('is-up', 'is-down');
    holes[index].classList.add('is-hit');
    holeClearAt[index] = nowMs() + 240;
  }
  function slamDown(index) {
    holes[index].classList.remove('is-up', 'is-hit');
    holes[index].classList.add('is-down');
    holeClearAt[index] = nowMs() + 200;
  }
  function resetHole(index) {
    holes[index].classList.remove('is-up', 'is-hit', 'is-down');
    var el = targetEls[index];
    el.className = 'fw-target';
    el.style.removeProperty('--fw-fuse-ms');
    iconEls[index].textContent = '';
    labelEls[index].textContent = '';
    holeClearAt[index] = 0;
  }

  /* ---- spawn / despawn (rAF-scheduled) -------------------------------- */
  function firstFreeHole() {
    var free = [];
    for (var i = 0; i < HOLES; i++) {
      if (!targets.has(i) && !holeClearAt[i]) free.push(i);
    }
    return free.length ? free[(Math.random() * free.length) | 0] : null;
  }

  function pickType() {
    if (frenzyActive) return Math.random() < 0.22 ? 'golden' : 'fraud';
    var r = Math.random();
    if (r < 0.20) return 'legit';
    if (r < 0.29) return 'golden';
    if (r < 0.44) return 'decoy';
    return 'fraud';
  }

  function ttlFor(type) {
    if (type === 'golden') return curTtl * 0.62;
    if (type === 'decoy') return curTtl * 1.15;
    return curTtl;
  }

  function spawnTarget(index, type, ts) {
    var ttl = ttlFor(type);
    targets.set(index, { type: type, spawnAt: ts, ttl: ttl, lastSpark: 0 });
    var el = targetEls[index];
    el.className = 'fw-target fw-target--' + type + (type === 'decoy' ? ' is-armed' : '');
    iconEls[index].textContent = ICON[type];
    labelEls[index].textContent = LABEL[type];
    if (type === 'decoy') el.style.setProperty('--fw-fuse-ms', Math.round(ttl) + 'ms');
    holes[index].classList.remove('is-hit', 'is-down');
    void holes[index].offsetWidth;         // reflow so the pop transition fires
    holes[index].classList.add('is-up');
    play('tick', { volume: 0.5 });
    if (type === 'golden') {
      var c = holeCenter(index);
      emit('sparkle', c.x, c.y, { count: 8, color: '#ffd23f' });
    }
  }

  function despawn(index, t) {
    if (t.type === 'decoy') { explodeDecoy(index); return; }
    if (t.type === 'legit') {
      score += 2; updateHud();
      targets.delete(index); slamDown(index);
      return;
    }
    combo = 0; updateHud();
    targets.delete(index); slamDown(index);
  }

  function explodeDecoy(index) {
    targets.delete(index);
    combo = 0;
    lives -= 1;
    updateHud(); renderLives();
    var c = holeCenter(index);
    play('fail', { pitch: 0.55 });
    hapt('fail');
    emit('explosion', c.x, c.y, { count: 26, color: '#FF9F1C' });
    floatText(c.x, c.y, '-1 LIFE', '#FF4757');
    shake(shell, 12, 320);
    slamDown(index);
    if (lives <= 0 && !testEndless) endGame();
  }

  /* ---- whacking ------------------------------------------------------- */
  function award(index, base, color, at) {
    combo += 1;
    if (combo > bestCombo) bestCombo = combo;
    var pts = base * multiplier();
    score += pts;
    blocked += 1;
    whackCount += 1;
    sinceFrenzy += 1;
    updateHud();
    popScore();
    var c = at || holeCenter(index);
    emit('burst', c.x, c.y, { count: 10 + Math.min(combo, 12), color: color });
    floatText(c.x, c.y, '+' + pts, color);
    markHit(index);
    if (!testEndless && !frenzyActive && sinceFrenzy >= FRENZY_EVERY) startFrenzy();
  }

  function wrongWhack(index, at) {
    combo = 0;
    score = Math.max(0, score - PENALTY);
    updateHud();
    play('fail');
    hapt('fail');
    var c = at || holeCenter(index);
    emit('burst', c.x, c.y, { count: 14, color: '#FF4757' });
    floatText(c.x, c.y, '-' + PENALTY, '#FF4757');
    flash(shell, '#FF4757', 180);
    shake(shell, 10, 260);
    targets.delete(index);
    markHit(index);
  }

  function whackHole(index, vx, vy) {
    splash(vx, vy);
    if (gameState !== 'PLAYING') return;
    var t = targets.get(index);
    if (!t) return;                 // empty hole — no penalty, no combo change
    var at = (vx != null) ? { x: vx, y: vy } : holeCenter(index);
    var pitch = 1 + Math.min(combo, 12) * 0.05;
    if (t.type === 'legit') { wrongWhack(index, at); return; }
    if (t.type === 'golden') {
      award(index, PTS.golden, '#ffd23f', at);
      play('score');
      play('hit', { pitch: pitch });
      emit('sparkle', at.x, at.y, { count: 12, color: '#ffd23f' });
      hapt('success');
      return;
    }
    award(index, PTS[t.type], '#C1FF00', at);
    play('hit', { pitch: pitch });
    hapt('tap');
  }

  /* ---- frenzy --------------------------------------------------------- */
  function startFrenzy() {
    frenzyActive = true;
    frenzyEnd = nowMs() + FRENZY_MS;
    sinceFrenzy = 0;
    shell.classList.add('is-frenzy');
    play('whoosh');
    var r = shell.getBoundingClientRect();
    emit('sparkle', r.left + r.width / 2, r.top + r.height * 0.4, { count: 22, color: '#FFB020' });
    floatText(r.left + r.width / 2, r.top + r.height * 0.3, 'FRENZY!', '#FFB020');
  }
  function endFrenzy() {
    frenzyActive = false;
    shell.classList.remove('is-frenzy');
  }

  /* ---- difficulty ramp ------------------------------------------------ */
  function updateDifficulty(ts) {
    var t = (ts - startTime) / 1000 / RAMP_SECONDS;
    if (t < 0) t = 0; else if (t > 1) t = 1;
    curSpawn = SPAWN_MAX + (SPAWN_MIN - SPAWN_MAX) * t;
    curTtl = TTL_MAX + (TTL_MIN - TTL_MAX) * t;
    maxActive = 3 + Math.floor(t * 2);
    if (frenzyActive) { curSpawn *= 0.55; maxActive += 1; }
  }

  /* ---- main loop (single rAF scheduler) ------------------------------- */
  var expired = [];
  function loop(ts) {
    if (gameState === 'PLAYING') {
      updateDifficulty(ts);
      if (frenzyActive && ts >= frenzyEnd) endFrenzy();

      if (ts - lastSpawn >= curSpawn && targets.size < maxActive) {
        var idx = firstFreeHole();
        if (idx != null) { spawnTarget(idx, pickType(), ts); lastSpawn = ts; }
      }

      expired.length = 0;
      targets.forEach(function (t, index) {
        if (ts - t.spawnAt >= t.ttl) expired.push(index);
        else if (t.type === 'golden' && ts - t.lastSpark > 170) {
          t.lastSpark = ts;
          var c = holeCenter(index);
          emit('sparkle', c.x, c.y, { count: 3, color: '#ffd23f' });
        }
      });
      for (var e = 0; e < expired.length; e++) {
        var i2 = expired[e];
        var tt = targets.get(i2);
        if (tt) despawn(i2, tt);
      }
    }

    for (var i = 0; i < HOLES; i++) {
      if (holeClearAt[i] && ts >= holeClearAt[i]) resetHole(i);
    }
    requestAnimationFrame(loop);
  }

  /* ---- screens -------------------------------------------------------- */
  function setScreen(state) {
    startScreen.hidden = state !== 'start';
    gameScreen.hidden = state === 'start';
    gameOverScreen.hidden = state !== 'over';
    hud.hidden = state !== 'game';
    if (state !== 'game') { shell.classList.remove('is-frenzy'); frenzyActive = false; }
  }

  function clearBoard() {
    targets.clear();
    for (var i = 0; i < HOLES; i++) { holeClearAt[i] = 0; resetHole(i); }
  }

  function startGame() {
    gameState = 'PLAYING';
    testEndless = false;
    score = 0; combo = 0; bestCombo = 0; lives = MAX_LIVES;
    blocked = 0; whackCount = 0; sinceFrenzy = 0;
    frenzyActive = false;
    clearBoard();
    startTime = nowMs();
    lastSpawn = startTime - 500;
    updateDifficulty(startTime);
    renderLives();
    updateHud();
    setScreen('game');
    if (typeof DodoAnalytics !== 'undefined') DodoAnalytics.gameStart(GAME_NAME);
  }

  function endGame() {
    if (gameState !== 'PLAYING') return;
    gameState = 'GAME_OVER';
    frenzyActive = false;
    shell.classList.remove('is-frenzy');
    clearBoard();

    var prevBest = best;
    if (hs) { hs.set(score); best = hs.best; }
    else if (score > best) { best = score; try { localStorage.setItem('dodo_fraud-whacker-dodo_highscore', String(best)); } catch (e) {} }

    if (typeof DodoAnalytics !== 'undefined') {
      DodoAnalytics.gameOver(GAME_NAME, score);
      if (score > prevBest) DodoAnalytics.newHighScore(GAME_NAME, score);
    }

    resultEyebrow.textContent = 'Gateway Breached';
    resultTitle.textContent = (score > prevBest && score > 0) ? 'New Personal Best!' : 'Shift Over';
    finalScoreEl.textContent = String(score);
    finalComboEl.textContent = String(bestCombo);
    overBestScoreEl.textContent = String(best);
    finalBlockedEl.textContent = String(blocked);
    updateHud();
    setScreen('over');

    play('gameover');
    var r = shell.getBoundingClientRect();
    emit('explosion', r.left + r.width / 2, r.top + r.height * 0.4, { count: 30, color: '#FF4757' });
    shake(shell, 14, 400);
    hapt('fail');
  }

  /* ---- input ---------------------------------------------------------- */
  function buildGrid() {
    for (var i = 0; i < HOLES; i++) {
      var hole = makeEl('button', 'fw-hole');
      hole.type = 'button';
      hole.setAttribute('aria-label', 'Terminal ' + (i + 1));

      var target = makeEl('div', 'fw-target');
      var icon = makeEl('span', 'fw-target__icon');
      var label = makeEl('span', 'fw-target__label');
      var fuse = makeEl('span', 'fw-target__fuse');
      target.appendChild(icon);
      target.appendChild(label);
      target.appendChild(fuse);

      var stage = makeEl('div', 'fw-hole__stage');
      stage.appendChild(target);

      hole.appendChild(makeEl('div', 'fw-hole__pit'));
      hole.appendChild(stage);
      hole.appendChild(makeEl('div', 'fw-hole__rim'));

      (function (index, elh) {
        var touchedAt = 0;
        elh.addEventListener('touchstart', function (ev) {
          ev.preventDefault();
          touchedAt = nowMs();
          var tt = ev.changedTouches && ev.changedTouches[0];
          whackHole(index, tt ? tt.clientX : null, tt ? tt.clientY : null);
        }, { passive: false });
        elh.addEventListener('click', function (ev) {
          if (nowMs() - touchedAt < 600) return;   // ignore click synthesized after touch
          whackHole(index, ev.clientX, ev.clientY);
        });
      })(i, hole);

      gridEl.appendChild(hole);
      holes.push(hole);
      targetEls.push(target);
      iconEls.push(icon);
      labelEls.push(label);
    }
  }

  document.addEventListener('keydown', function (e) {
    var map = { '1': 0, '2': 1, '3': 2, '4': 3, '5': 4, '6': 5, '7': 6, '8': 7, '9': 8 };
    if (map[e.key] !== undefined && gameState === 'PLAYING') {
      var c = holeCenter(map[e.key]);
      whackHole(map[e.key], c.x, c.y);
    }
  });

  startButton.addEventListener('click', startGame);
  restartButton.addEventListener('click', startGame);

  /* ---- test hooks (test-only steering; never used by real gameplay) --- */
  function testWhackFraud() {
    var idx = firstFreeHole();
    if (idx == null) {
      idx = (Math.random() * HOLES) | 0;
      resetHole(idx);
      targets.delete(idx);
    }
    spawnTarget(idx, 'fraud', nowMs());
    var c = holeCenter(idx);
    award(idx, PTS.fraud, '#C1FF00', c);
    play('hit', { pitch: 1 + Math.min(combo, 12) * 0.05 });
    return idx;
  }

  window.FraudWhackerTest = {
    setEndless: function (v) { testEndless = !!v; },
    scorePoint: function () {
      if (gameState !== 'PLAYING') return;
      testWhackFraud();
    },
    pulse: function () {
      if (gameState !== 'PLAYING') return;
      play('tick', { volume: 0.5 });
      var idx = testWhackFraud();
      play('score');
      play('fail');
      shake(shell, 5, 140);
      var c = holeCenter(idx == null ? 0 : idx);
      emit('sparkle', c.x, c.y, { count: 6, color: '#C1FF00' });
    },
    spawnFraud: function (index) {
      if (gameState !== 'PLAYING') return null;
      var idx = (index == null) ? firstFreeHole() : index;
      if (idx == null) return null;
      if (targets.has(idx)) return idx;
      spawnTarget(idx, 'fraud', nowMs());
      return idx;
    },
    triggerFrenzy: function () { if (gameState === 'PLAYING' && !frenzyActive) startFrenzy(); },
    toGameOver: function () { testEndless = false; if (gameState !== 'PLAYING') return; if (score <= 0) testWhackFraud(); endGame(); },
    getState: function () { return gameState; },
    getScore: function () { return score; },
    holeCount: function () { return HOLES; }
  };

  /* ---- boot ----------------------------------------------------------- */
  buildGrid();
  renderLives();
  updateHud();
  setScreen('start');
  if (J && J.particles && J.particles.overlay) J.particles.overlay();
  if (J && J.muteButton) J.muteButton(document.body);
  requestAnimationFrame(loop);
})();
