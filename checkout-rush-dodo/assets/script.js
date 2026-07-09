/* ==========================================================================
 * CHECKOUT RUSH — endless payment-matching rush. Read the front customer's
 * payment method, tap the matching key before their patience drains. VIPs,
 * rush-hour escalation, a UPI rail that unlocks at 30s, and a 10-combo
 * Instant Settlement that clears the queue. Vanilla JS, stays DOM.
 * Game-feel via window.DodoJuice; analytics via window.DodoAnalytics
 * (game_name frozen as "Checkout Rush").
 * ========================================================================== */
(function () {
  'use strict';

  var GAME_NAME = 'Checkout Rush';
  var SLUG = 'checkout-rush-dodo';
  var J = (typeof window.DodoJuice !== 'undefined') ? window.DodoJuice : null;

  var GREEN = '#C1FF00';
  var GOLD = '#FFD23F';

  /* ---- tuning --------------------------------------------------------- */
  var BASE_PTS = 12;
  var VIP_MULT = 3;
  var SETTLE_COMBO = 10;
  var MAX_LIVES = 3;
  var MAX_QUEUE = 5;
  var MAX_MISS = 3;
  var MISS_DRAIN = 0.34;
  var REG_LIFE = 8.0;
  var VIP_LIFE = 4.5;
  var SPAWN_MAX = 1700, SPAWN_MIN = 650, SPAWN_STEP = 230;
  var STAGE_MS = 22000, MAX_STAGE = 4, UPI_MS = 30000;

  var TYPES_ALL = ['CARD', 'CRYPTO', 'QR', 'UPI'];
  var GLYPH = { CARD: '\uD83D\uDCB3', CRYPTO: '\u20BF', QR: '\uD83D\uDCF1', UPI: '\u20B9' };
  var TYPE_COLOR = { CARD: '#4DA3FF', CRYPTO: '#FF9F1C', QR: '#B57BFF', UPI: '#21D0C3' };
  var FACE = { happy: '\uD83D\uDE0A', neutral: '\uD83D\uDE10', angry: '\uD83D\uDE20' };
  var RUSH = ['Open Hours', 'Lunch Rush', 'Rush Hour', 'Peak Rush', 'Meltdown'];

  /* ---- DOM ------------------------------------------------------------ */
  var shell = document.getElementById('crShell');
  var hud = document.getElementById('hud');
  var startScreen = document.getElementById('startScreen');
  var gameScreen = document.getElementById('gameScreen');
  var gameOverScreen = document.getElementById('gameOverScreen');
  var queueEl = document.getElementById('queue');
  var padEl = document.getElementById('pad');
  var desk = document.querySelector('.cr-desk');

  var startButton = document.getElementById('btn-start');
  var restartButton = document.getElementById('btn-restart');
  var upiBtn = document.getElementById('btn-upi');

  var scoreEl = document.getElementById('score');
  var bestScoreEl = document.getElementById('bestScore');
  var livesEl = document.getElementById('lives');
  var comboBadge = document.getElementById('comboBadge');
  var rushLabel = document.getElementById('rushLabel');
  var settleMeter = document.getElementById('settleMeter');
  var settleFill = document.getElementById('settleFill');
  var settlePips = document.getElementById('settlePips');

  var finalCountEl = document.getElementById('finalCount');
  var finalComboEl = document.getElementById('finalCombo');
  var overBestScoreEl = document.getElementById('overBestScore');
  var finalScoreEl = document.getElementById('finalScore');
  var resultEyebrow = document.getElementById('resultEyebrow');
  var resultTitle = document.getElementById('resultTitle');

  /* ---- state ---------------------------------------------------------- */
  var gameState = 'START';         // START | PLAYING | GAME_OVER
  var testEndless = false;         // test-only: no game-over + suppresses natural cues/VIPs
  var score = 0, best = 0, combo = 0, bestCombo = 0, served = 0, lives = MAX_LIVES;
  var stage = 0, upiUnlocked = false;
  var curSpawn = SPAWN_MAX, decayMult = 1;
  var startTime = 0, lastSpawn = 0, lastTick = 0, lastTs = 0;
  var queue = [];

  /* ---- highscore (standard key; no legacy keys to migrate) ------------ */
  var hs = null;
  if (J && J.highscore) {
    hs = J.highscore(SLUG, []);
    best = hs.best;
  } else {
    best = parseInt(localStorage.getItem('dodo_' + SLUG + '_highscore') || '0', 10) || 0;
  }

  /* ---- juice / audio wrappers ----------------------------------------- */
  function nowMs() { return (window.performance && performance.now) ? performance.now() : Date.now(); }
  function sfx(name, opts) { if (J && J.audio) J.audio.play(name, opts); }
  function cue(name, opts) { if (testEndless) return; sfx(name, opts); }
  function emit(preset, x, y, opts) { if (J && J.particles) J.particles.emit(preset, x, y, opts); }
  function shake(el, i, ms) { if (J && J.shake) J.shake(el, i, ms); }
  function flash(el, c, ms) { if (J && J.flash) J.flash(el, c, ms); }
  function floatText(x, y, txt, color) { if (J && J.floatText) J.floatText(x, y, txt, { color: color, size: 20 }); }
  function hapt(kind) { if (J && J.haptics && J.haptics[kind]) J.haptics[kind](); }

  function makeEl(tag, cls) { var e = document.createElement(tag); if (cls) e.className = cls; return e; }
  function fmt(n) { return Number(n).toLocaleString('en-US'); }

  function center(el) {
    if (!el || !el.getBoundingClientRect) return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    var r = el.getBoundingClientRect();
    if (!r.width && !r.height) { var s = shell.getBoundingClientRect(); return { x: s.left + s.width / 2, y: s.top + s.height / 2 }; }
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  /* ---- customers ------------------------------------------------------ */
  function buildCustomerEl(c) {
    var el = makeEl('div', 'cr-cust cr-cust--' + c.type.toLowerCase() + (c.vip ? ' is-vip' : ''));
    el.setAttribute('role', 'listitem');
    el.style.setProperty('--cr-bub', TYPE_COLOR[c.type]);
    var crown = makeEl('span', 'cr-cust__crown'); crown.textContent = '\uD83D\uDC51';
    var bubble = makeEl('div', 'cr-cust__bubble'); bubble.textContent = GLYPH[c.type];
    var char = makeEl('div', 'cr-cust__char');
    var head = makeEl('div', 'cr-cust__head'); head.textContent = FACE.happy;
    var body = makeEl('div', 'cr-cust__body');
    char.appendChild(head); char.appendChild(body);
    var bar = makeEl('div', 'cr-cust__bar');
    var fill = makeEl('div', 'cr-cust__fill');
    bar.appendChild(fill);
    el.appendChild(crown); el.appendChild(bubble); el.appendChild(char); el.appendChild(bar);
    c.el = el; c.head = head; c.fill = fill; c.state = null;
  }

  function makeCustomer(type, vip) {
    var c = { type: type, vip: !!vip, patience: 1, misses: 0, life: vip ? VIP_LIFE : REG_LIFE };
    buildCustomerEl(c);
    return c;
  }

  function activeTypeCount() { return upiUnlocked ? 4 : 3; }
  function vipChance() { return Math.min(0.24, 0.08 + stage * 0.03); }

  function addCustomer(type, vip) {
    if (queue.length >= MAX_QUEUE) return null;
    var c = makeCustomer(type, vip);
    queue.push(c);
    queueEl.appendChild(c.el);
    updateEmotion(c);
    updateFront();
    if (vip) {
      cue('combo');
      var ctr = center(c.el);
      emit('sparkle', ctr.x, ctr.y, { count: 12, color: GOLD });
      floatText(ctr.x, ctr.y - 24, 'VIP', GOLD);
    }
    return c;
  }

  function updateFront() {
    for (var i = 0; i < queue.length; i++) queue[i].el.classList.toggle('is-front', i === 0);
  }

  function updateEmotion(c) {
    var p = c.patience;
    var st = p > 0.6 ? 'happy' : p > 0.3 ? 'neutral' : 'angry';
    if (c.state !== st) {
      c.state = st;
      c.el.classList.remove('is-happy', 'is-neutral', 'is-angry');
      c.el.classList.add('is-' + st);
      c.head.textContent = FACE[st];
    }
    c.fill.style.transform = 'scaleX(' + Math.max(0, p).toFixed(3) + ')';
  }

  function removeCustomerEl(c, cls, ms) {
    if (c._leaving) return;
    c._leaving = true;
    c.el.classList.remove('is-front');
    c.el.classList.add(cls);
    window.setTimeout(function () { if (c.el && c.el.parentNode) c.el.parentNode.removeChild(c.el); }, ms);
  }

  function clearQueue() {
    for (var i = 0; i < queue.length; i++) {
      var c = queue[i];
      if (c.el && c.el.parentNode) c.el.parentNode.removeChild(c.el);
    }
    queue.length = 0;
    var leftovers = queueEl.querySelectorAll('.cr-cust');
    for (var j = 0; j < leftovers.length; j++) if (leftovers[j].parentNode) leftovers[j].parentNode.removeChild(leftovers[j]);
  }

  /* ---- scoring -------------------------------------------------------- */
  function multiplier() { return combo >= 8 ? 3 : combo >= 4 ? 2 : 1; }

  function popScore() {
    scoreEl.classList.remove('da-score--pop');
    void scoreEl.offsetWidth;
    scoreEl.classList.add('da-score--pop');
  }

  function serveCorrect(c) {
    var idx = queue.indexOf(c);
    if (idx < 0) return;
    queue.splice(idx, 1);
    combo += 1;
    if (combo > bestCombo) bestCombo = combo;
    var pts = Math.round(BASE_PTS * multiplier() * (c.vip ? VIP_MULT : 1));
    score += pts; served += 1;
    var ctr = center(c.el);
    cue('score', { pitch: 1 + Math.min(combo, 12) * 0.06 });
    emit('burst', ctr.x, ctr.y, { count: 8 + Math.min(combo, 12), color: c.vip ? GOLD : GREEN });
    floatText(ctr.x, ctr.y - 10, '+$' + pts, c.vip ? GOLD : '#8ef442');
    if (c.vip) { emit('sparkle', ctr.x, ctr.y, { count: 10, color: GOLD }); hapt('success'); }
    else hapt('tap');
    popScore();
    removeCustomerEl(c, 'is-served', 470);
    updateFront();
    updateHud();
    if (!testEndless && combo > 0 && combo % SETTLE_COMBO === 0) triggerSettlement();
  }

  function missFront(type) {
    var c = queue[0];
    if (!c) return;
    combo = 0;
    c.misses += 1;
    c.patience -= MISS_DRAIN;
    var ctr = center(c.el);
    cue('fail');
    hapt('fail');
    emit('burst', ctr.x, ctr.y, { count: 12, color: '#FF4757' });
    floatText(ctr.x, ctr.y - 10, 'DECLINED', '#FF4757');
    flash(shell, '#FF4757', 160);
    shake(shell, 9, 240);
    updateEmotion(c);
    updateHud();
    if (c.misses >= MAX_MISS || c.patience <= 0) loseCustomer(c);
  }

  function loseCustomer(c) {
    var idx = queue.indexOf(c);
    if (idx < 0) return;
    queue.splice(idx, 1);
    combo = 0;
    removeCustomerEl(c, 'is-lost', 520);
    updateFront();
    if (testEndless) { updateHud(); return; }
    lives -= 1;
    renderLives();
    var ctr = center(c.el);
    cue('fail', { pitch: 0.6 });
    emit('explosion', ctr.x, ctr.y, { count: 20, color: '#FF4757' });
    floatText(ctr.x, ctr.y, '\u2212 GATEWAY', '#FF4757');
    shake(shell, 10, 260);
    updateHud();
    if (lives <= 0) endGame();
  }

  function triggerSettlement() {
    sfx('powerup');
    sfx('whoosh');
    if (typeof DodoAnalytics !== 'undefined') DodoAnalytics.powerUp(GAME_NAME, 'Instant Settlement');
    var deskCtr = center(desk);
    floatText(deskCtr.x, deskCtr.y - 40, 'INSTANT SETTLEMENT!', GOLD);
    var cleared = queue.slice();
    for (var i = 0; i < cleared.length; i++) {
      var c = cleared[i];
      var pts = BASE_PTS * 2 * (c.vip ? VIP_MULT : 1);
      score += pts; served += 1;
      var ctr = center(c.el);
      emit('confetti', ctr.x, ctr.y, { count: 16 });
      removeCustomerEl(c, 'is-served', 470);
    }
    queue.length = 0;
    emit('confetti', deskCtr.x, deskCtr.y, { count: 40 });
    shake(shell, 12, 360);
    hapt('success');
    updateFront();
    updateHud();
  }

  /* ---- UPI rail + toasts ---------------------------------------------- */
  function unlockUPI() {
    if (upiUnlocked) return;
    upiUnlocked = true;
    upiBtn.hidden = false;
    padEl.classList.add('is-quad');
    cue('powerup');
    var ctr = center(desk);
    emit('sparkle', ctr.x, ctr.y, { count: 18, color: TYPE_COLOR.UPI });
    toast('UPI ENABLED', 'New payment rail online');
    if (typeof DodoAnalytics !== 'undefined') DodoAnalytics.powerUp(GAME_NAME, 'UPI Unlocked');
  }

  function toast(title, sub) {
    var t = makeEl('div', 'da-toast cr-toast');
    var b = makeEl('b', 'cr-toast__t'); b.textContent = title;
    t.appendChild(b);
    if (sub) { var s = makeEl('span', 'cr-toast__s'); s.textContent = sub; t.appendChild(s); }
    document.body.appendChild(t);
    window.setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 2200);
  }

  /* ---- HUD ------------------------------------------------------------ */
  function setRush(s) {
    rushLabel.textContent = RUSH[Math.min(s, RUSH.length - 1)];
    rushLabel.className = 'cr-rush' + (s >= 3 ? ' is-peak' : s >= 1 ? ' is-hot' : '');
  }

  function onStageChange() {
    setRush(stage);
    if (stage > 0) toast(RUSH[Math.min(stage, RUSH.length - 1)].toUpperCase(), 'Queue heating up');
  }

  function renderLives() {
    var shown = Math.max(0, lives);
    var kids = [];
    for (var i = 0; i < MAX_LIVES; i++) kids.push(makeEl('span', 'cr-heart' + (i >= shown ? ' cr-heart--lost' : '')));
    livesEl.replaceChildren.apply(livesEl, kids);
  }

  function updateHud() {
    scoreEl.textContent = '$' + fmt(score);
    bestScoreEl.textContent = '$' + fmt(Math.max(best, score));
    if (combo >= 2) {
      var m = multiplier();
      comboBadge.hidden = false;
      comboBadge.textContent = '\u00D7' + combo + (m > 1 ? ' ' + m + 'x' : '');
      comboBadge.className = 'da-combo-badge cr-combo ' +
        (combo >= 8 ? 'da-combo-badge--t3' : combo >= 4 ? 'da-combo-badge--t2' : 'da-combo-badge--t1');
    } else {
      comboBadge.hidden = true;
    }
    var prog = (combo > 0 && combo % SETTLE_COMBO === 0) ? SETTLE_COMBO : (combo % SETTLE_COMBO);
    var frac = prog / SETTLE_COMBO;
    settleFill.style.transform = 'scaleX(' + frac + ')';
    settlePips.textContent = prog + '/' + SETTLE_COMBO;
    settleMeter.classList.toggle('is-ready', frac >= 1);
  }

  /* ---- screens -------------------------------------------------------- */
  function setScreen(s) {
    startScreen.hidden = s !== 'start';
    gameScreen.hidden = s !== 'game';
    gameOverScreen.hidden = s !== 'over';
    hud.hidden = s !== 'game';
  }

  function startGame() {
    gameState = 'PLAYING';
    testEndless = false;
    score = 0; combo = 0; bestCombo = 0; served = 0; lives = MAX_LIVES;
    stage = 0; upiUnlocked = false; curSpawn = SPAWN_MAX; decayMult = 1;
    clearQueue();
    upiBtn.hidden = true;
    padEl.classList.remove('is-quad');
    setRush(0);
    var now = nowMs();
    startTime = now; lastSpawn = now - 600; lastTick = 0; lastTs = 0;
    renderLives();
    updateHud();
    setScreen('game');
    addCustomer(TYPES_ALL[(Math.random() * 3) | 0], false);
    if (typeof DodoAnalytics !== 'undefined') DodoAnalytics.gameStart(GAME_NAME);
  }

  function persistBestCombo() {
    try {
      var k = 'dodo_' + SLUG + '_bestcombo';
      var prev = parseInt(localStorage.getItem(k) || '0', 10) || 0;
      if (bestCombo > prev) localStorage.setItem(k, String(bestCombo));
    } catch (e) { /* storage unavailable */ }
  }

  function endGame() {
    if (gameState !== 'PLAYING') return;
    gameState = 'GAME_OVER';

    var prevBest = best;
    if (hs) { hs.set(score); best = hs.best; }
    else if (score > best) { best = score; try { localStorage.setItem('dodo_' + SLUG + '_highscore', String(best)); } catch (e) { /* storage unavailable */ } }
    persistBestCombo();

    if (typeof DodoAnalytics !== 'undefined') {
      DodoAnalytics.gameOver(GAME_NAME, score, { customersProcessed: served, maxStreak: bestCombo });
      if (score > prevBest) DodoAnalytics.newHighScore(GAME_NAME, score);
    }

    finalCountEl.textContent = String(served);
    finalComboEl.textContent = String(bestCombo);
    overBestScoreEl.textContent = '$' + fmt(best);
    finalScoreEl.textContent = '$' + fmt(score);
    resultEyebrow.textContent = (score > prevBest && score > 0) ? 'New Record' : 'Market Closed';
    resultTitle.textContent = (score > prevBest && score > 0) ? 'New Personal Best!' : 'Shift Over';
    updateHud();
    setScreen('over');
    clearQueue();

    sfx('gameover');
    var ctr = center(shell);
    emit('explosion', ctr.x, ctr.y * 0.55, { count: 30, color: '#FF4757' });
    shake(shell, 14, 400);
    hapt('fail');
  }

  /* ---- main loop (single rAF) ----------------------------------------- */
  var expired = [];
  function loop(ts) {
    if (gameState === 'PLAYING') {
      var dt = lastTs ? (ts - lastTs) / 1000 : 0.016;
      if (dt > 0.05) dt = 0.05;
      var elapsed = ts - startTime;

      var newStage = Math.min(MAX_STAGE, Math.floor(elapsed / STAGE_MS));
      if (newStage !== stage) { stage = newStage; onStageChange(); }
      curSpawn = Math.max(SPAWN_MIN, SPAWN_MAX - stage * SPAWN_STEP);
      decayMult = 1 + stage * 0.16;
      if (!upiUnlocked && elapsed >= UPI_MS) unlockUPI();

      if (ts - lastSpawn >= curSpawn && queue.length < MAX_QUEUE) {
        addCustomer(TYPES_ALL[(Math.random() * activeTypeCount()) | 0], !testEndless && Math.random() < vipChance());
        lastSpawn = ts;
      }

      expired.length = 0;
      for (var i = 0; i < queue.length; i++) {
        var c = queue[i];
        c.patience -= dt / c.life * decayMult;
        updateEmotion(c);
        if (c.patience <= 0) expired.push(c);
      }
      for (var e = 0; e < expired.length; e++) {
        if (gameState !== 'PLAYING') break;
        loseCustomer(expired[e]);
      }

      if (!testEndless && queue.length >= MAX_QUEUE - 1 && ts - lastTick > 900) {
        lastTick = ts;
        cue('tick', { volume: 0.6 });
      }
    }
    lastTs = ts;
    requestAnimationFrame(loop);
  }

  /* ---- input ---------------------------------------------------------- */
  function pressKey(btn) {
    if (!btn) return;
    btn.classList.add('is-press');
    window.setTimeout(function () { btn.classList.remove('is-press'); }, 120);
  }

  function handlePay(type, btn) {
    if (gameState !== 'PLAYING') return;
    pressKey(btn);
    var c = queue[0];
    if (!c) return;
    if (c.type === type) serveCorrect(c);
    else missFront(type);
  }

  function wireKey(btn, type) {
    var touchedAt = 0;
    btn.addEventListener('touchstart', function (ev) {
      ev.preventDefault();
      touchedAt = nowMs();
      handlePay(type, btn);
    }, { passive: false });
    btn.addEventListener('click', function () {
      if (nowMs() - touchedAt < 600) return;
      handlePay(type, btn);
    });
  }

  wireKey(document.getElementById('btn-card'), 'CARD');
  wireKey(document.getElementById('btn-crypto'), 'CRYPTO');
  wireKey(document.getElementById('btn-qr'), 'QR');
  wireKey(upiBtn, 'UPI');

  document.addEventListener('keydown', function (e) {
    if (gameState !== 'PLAYING') return;
    var k = e.key.toLowerCase();
    if (k === 'a') handlePay('CARD', document.getElementById('btn-card'));
    else if (k === 's') handlePay('CRYPTO', document.getElementById('btn-crypto'));
    else if (k === 'd') handlePay('QR', document.getElementById('btn-qr'));
    else if (k === 'f' && upiUnlocked) handlePay('UPI', upiBtn);
  });

  startButton.addEventListener('click', startGame);
  restartButton.addEventListener('click', startGame);

  if (J && J.particles && J.particles.overlay) J.particles.overlay();
  if (J && J.muteButton) J.muteButton(document.body);

  /* ---- test hooks (test-only steering; never used by real gameplay) --- */
  function testServeFront() {
    if (gameState !== 'PLAYING') return;
    var c = queue[0];
    if (!c) c = addCustomer(TYPES_ALL[0], false);
    if (c) serveCorrect(c);
  }

  window.CheckoutRushTest = {
    setEndless: function (v) { testEndless = !!v; },
    scorePoint: function () { testServeFront(); },
    toGameOver: function () {
      testEndless = false;
      if (gameState !== 'PLAYING') return;
      if (score <= 0) testServeFront();
      endGame();
    },
    pulse: function () {
      if (gameState !== 'PLAYING') return;
      sfx('tick', { volume: 0.5 });
      testServeFront();
      sfx('score', { pitch: 1 + Math.min(combo, 12) * 0.06 });
      sfx('fail');
      sfx('powerup');
      var ctr = center(desk);
      emit('burst', ctr.x, ctr.y, { count: 8 });
      shake(shell, 4, 130);
    },
    spawnFront: function (type) {
      if (gameState !== 'PLAYING') return null;
      var c = makeCustomer(type || TYPES_ALL[0], false);
      queue.unshift(c);
      queueEl.insertBefore(c.el, queueEl.firstChild);
      if (queue.length > MAX_QUEUE) {
        var extra = queue.pop();
        if (extra && extra.el && extra.el.parentNode) extra.el.parentNode.removeChild(extra.el);
      }
      updateEmotion(c);
      updateFront();
      return true;
    },
    spawnVip: function () { return addCustomer(TYPES_ALL[(Math.random() * activeTypeCount()) | 0], true) ? true : false; },
    unlockUPI: function () { unlockUPI(); },
    triggerSettlement: function () {
      if (gameState !== 'PLAYING') return;
      var prev = testEndless; testEndless = false;
      combo = SETTLE_COMBO; triggerSettlement();
      testEndless = prev;
    },
    getState: function () { return gameState; },
    getScore: function () { return score; },
    getCombo: function () { return combo; },
    isUpiUnlocked: function () { return upiUnlocked; }
  };

  /* ---- boot ----------------------------------------------------------- */
  renderLives();
  updateHud();
  setRush(0);
  setScreen('start');
  requestAnimationFrame(loop);
})();
