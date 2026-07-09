/* ==========================================================================
 * TOKEN MATCH DODO — memory-pairs with difficulty, combos, peek + full juice.
 * Vanilla JS, DOM-based. Game-feel via window.DodoJuice (overlay particles,
 * screenshake, floatText, synth audio). Analytics via bare DodoAnalytics global
 * (game_name frozen as "Token Match Dodo"). Card art is built with the DOM +
 * DOMParser (no innerHTML) from original flat SVG icons — no trademarked logos.
 * ========================================================================== */
(function () {
  'use strict';

  var GAME_NAME = 'Token Match Dodo';
  var HAS_JUICE = typeof window.DodoJuice !== 'undefined';
  var J = HAS_JUICE ? window.DodoJuice : null;
  var SVG_NS = 'http://www.w3.org/2000/svg';
  var DARK = 'rgba(6,8,4,0.62)';

  /* ---- token art: original flat SVG icons (no trademarked logos) -------- */
  var TOKENS = [
    { id: 'coin', label: 'Payout', color: '#FFD23F', art: function (c) {
      return '<circle cx="24" cy="24" r="15" fill="' + c + '"/>' +
        '<circle cx="24" cy="24" r="15" fill="none" stroke="' + DARK + '" stroke-width="2"/>' +
        '<circle cx="24" cy="24" r="9" fill="none" stroke="' + DARK + '" stroke-width="2.4"/>' +
        '<rect x="22.4" y="15" width="3.2" height="18" rx="1.6" fill="' + DARK + '"/>'; } },
    { id: 'card', label: 'Card', color: '#4DA3FF', art: function (c) {
      return '<rect x="7" y="13" width="34" height="22" rx="4" fill="' + c + '"/>' +
        '<rect x="7" y="18" width="34" height="5" fill="' + DARK + '"/>' +
        '<rect x="12" y="28" width="11" height="3" rx="1.5" fill="' + DARK + '"/>' +
        '<rect x="30" y="27" width="7" height="5" rx="1.4" fill="' + DARK + '"/>'; } },
    { id: 'shield', label: 'Fraud Shield', color: '#C1FF00', art: function (c) {
      return '<path d="M24 7l13 5v9c0 8-5.6 14-13 17-7.4-3-13-9-13-17v-9z" fill="' + c + '"/>' +
        '<path d="M18 24l4 4 8-9" stroke="' + DARK + '" stroke-width="3.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'; } },
    { id: 'key', label: 'API Key', color: '#FFB020', art: function (c) {
      return '<circle cx="17" cy="18" r="8" fill="none" stroke="' + c + '" stroke-width="4"/>' +
        '<circle cx="17" cy="18" r="2.6" fill="' + c + '"/>' +
        '<path d="M22.5 23.5L37 38M31 34l4-4M35 38l3-3" stroke="' + c + '" stroke-width="4" stroke-linecap="round" fill="none"/>'; } },
    { id: 'wallet', label: 'Wallet', color: '#00E5FF', art: function (c) {
      return '<rect x="8" y="12" width="32" height="24" rx="4" fill="' + c + '"/>' +
        '<path d="M8 19h32" stroke="' + DARK + '" stroke-width="2"/>' +
        '<rect x="27" y="21" width="15" height="9" rx="2.4" fill="' + DARK + '"/>' +
        '<circle cx="33" cy="25.5" r="2.2" fill="' + c + '"/>'; } },
    { id: 'invoice', label: 'Invoice', color: '#E8E8E8', art: function (c) {
      return '<path d="M12 6h15l9 9v27H12z" fill="' + c + '"/>' +
        '<path d="M27 6v9h9" fill="' + DARK + '"/>' +
        '<path d="M17 22h14M17 28h14M17 34h9" stroke="' + DARK + '" stroke-width="2.4" stroke-linecap="round"/>'; } },
    { id: 'gateway', label: 'Gateway', color: '#FF5C8A', art: function (c) {
      return '<path d="M9 41V24a15 15 0 0 1 30 0v17" fill="none" stroke="' + c + '" stroke-width="5" stroke-linecap="round"/>' +
        '<path d="M18 41V25a6 6 0 0 1 12 0v16z" fill="' + c + '" opacity="0.55"/>' +
        '<circle cx="24" cy="24" r="2.6" fill="' + c + '"/>'; } },
    { id: 'vault', label: 'Vault', color: '#A78BFA', art: function (c) {
      return '<rect x="8" y="9" width="32" height="30" rx="4" fill="' + c + '"/>' +
        '<circle cx="24" cy="24" r="9" fill="none" stroke="' + DARK + '" stroke-width="2.6"/>' +
        '<circle cx="24" cy="24" r="2.6" fill="' + DARK + '"/>' +
        '<path d="M24 15v-3M24 36v-3M15 24h-3M36 24h-3" stroke="' + DARK + '" stroke-width="2.6" stroke-linecap="round"/>'; } },
    { id: 'bank', label: 'Settlement', color: '#2ED573', art: function (c) {
      return '<path d="M24 8l16 8H8z" fill="' + c + '"/>' +
        '<rect x="11" y="19" width="4" height="15" fill="' + c + '"/>' +
        '<rect x="22" y="19" width="4" height="15" fill="' + c + '"/>' +
        '<rect x="33" y="19" width="4" height="15" fill="' + c + '"/>' +
        '<rect x="8" y="36" width="32" height="4" rx="1.4" fill="' + c + '"/>'; } },
    { id: 'qr', label: 'QR Pay', color: '#FFFFFF', art: function (c) {
      return '<rect x="8" y="8" width="12" height="12" rx="2" fill="none" stroke="' + c + '" stroke-width="3"/>' +
        '<rect x="28" y="8" width="12" height="12" rx="2" fill="none" stroke="' + c + '" stroke-width="3"/>' +
        '<rect x="8" y="28" width="12" height="12" rx="2" fill="none" stroke="' + c + '" stroke-width="3"/>' +
        '<rect x="12" y="12" width="4" height="4" fill="' + c + '"/>' +
        '<rect x="32" y="12" width="4" height="4" fill="' + c + '"/>' +
        '<rect x="12" y="32" width="4" height="4" fill="' + c + '"/>' +
        '<rect x="28" y="28" width="5" height="5" fill="' + c + '"/>' +
        '<rect x="36" y="36" width="4" height="4" fill="' + c + '"/>' +
        '<rect x="28" y="36" width="4" height="4" fill="' + c + '"/>'; } },
    { id: 'lock', label: 'Encryption', color: '#FF7B54', art: function (c) {
      return '<rect x="11" y="21" width="26" height="20" rx="4" fill="' + c + '"/>' +
        '<path d="M16 21v-4a8 8 0 0 1 16 0v4" fill="none" stroke="' + c + '" stroke-width="4"/>' +
        '<circle cx="24" cy="29" r="3" fill="' + DARK + '"/>' +
        '<rect x="22.5" y="29" width="3" height="7" rx="1.5" fill="' + DARK + '"/>'; } },
    { id: 'bolt', label: 'Instant', color: '#FFE45C', art: function (c) {
      return '<path d="M27 5L12 28h9l-3 15 17-25h-9z" fill="' + c + '"/>' +
        '<path d="M27 5L12 28h9l-3 15 17-25h-9z" fill="none" stroke="' + DARK + '" stroke-width="1.6" stroke-linejoin="round"/>'; } }
  ];

  var FRONT_ART =
    '<rect x="5" y="5" width="38" height="38" rx="9" fill="none" stroke="rgba(193,255,0,0.25)" stroke-width="2"/>' +
    '<circle cx="24" cy="24" r="9" fill="none" stroke="rgba(193,255,0,0.55)" stroke-width="2.4"/>' +
    '<circle cx="24" cy="24" r="3" fill="#C1FF00"/>';

  /* Build an <svg> node from an inner-markup string via DOMParser (no innerHTML). */
  function svgNode(inner) {
    var doc = new DOMParser().parseFromString(
      '<svg xmlns="' + SVG_NS + '" viewBox="0 0 48 48" fill="none">' + inner + '</svg>',
      'image/svg+xml'
    );
    return document.importNode(doc.documentElement, true);
  }

  function el(tag, cls) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    return n;
  }

  /* ---- difficulty ------------------------------------------------------- */
  var DIFFICULTIES = {
    starter: { key: 'starter', label: 'Starter', cols: 4, rows: 3, pairs: 6 },
    growth: { key: 'growth', label: 'Growth', cols: 4, rows: 4, pairs: 8 },
    enterprise: { key: 'enterprise', label: 'Enterprise', cols: 6, rows: 4, pairs: 12 }
  };

  var MATCH_BASE = 100;
  var PEEK_PENALTY = 200;
  var MAX_MULT = 8;

  /* ---- state ------------------------------------------------------------ */
  var difficulty = 'growth';
  var DIFF = DIFFICULTIES[difficulty];
  var gameState = 'START';       // START | PLAYING | GAME_OVER
  var flipState = 'IDLE';        // IDLE | ONE_FLIPPED | CHECKING
  var firstCard = null, secondCard = null;
  var matchedPairs = 0, moves = 0, score = 0;
  var combo = 0, bestCombo = 0;
  var peekUsed = false, peekActive = false;
  var startTime = null, timerInterval = null;
  var pulseI = 0;

  /* ---- DOM -------------------------------------------------------------- */
  var gameScreen = document.getElementById('gameScreen');
  var startScreen = document.getElementById('startScreen');
  var gameOverScreen = document.getElementById('gameOverScreen');
  var gridEl = document.getElementById('grid');
  var difficultySelect = document.getElementById('difficultySelect');

  var startButton = document.getElementById('startButton');
  var restartButton = document.getElementById('restartButton');
  var menuButton = document.getElementById('menuButton');
  var peekButton = document.getElementById('peekButton');

  var scoreEl = document.getElementById('score');
  var movesEl = document.getElementById('moves');
  var timerEl = document.getElementById('timer');
  var bestScoreEl = document.getElementById('bestScore');
  var comboBadge = document.getElementById('comboBadge');
  var diffPill = document.getElementById('diffPill');
  var peekCostEl = document.getElementById('peekCost');

  var startDiffLabel = document.getElementById('startDiffLabel');
  var startDiffBest = document.getElementById('startDiffBest');
  var startBest = document.getElementById('startBest');

  var finalScoreEl = document.getElementById('finalScore');
  var finalMovesEl = document.getElementById('finalMoves');
  var finalTimeEl = document.getElementById('finalTime');
  var finalComboEl = document.getElementById('finalCombo');
  var overDiffLabel = document.getElementById('overDiffLabel');
  var overDiffBest = document.getElementById('overDiffBest');
  var overBestScoreEl = document.getElementById('overBestScore');

  /* ---- highscore (with legacy migration) -------------------------------- */
  var hs = (J && J.highscore) ? J.highscore('token-match-dodo', ['dodo_token_match_highscore']) : null;
  var best = hs ? hs.best : (parseInt(localStorage.getItem('dodo_token-match-dodo_highscore') || localStorage.getItem('dodo_token_match_highscore') || '0', 10) || 0);

  function diffBestKey(d) { return 'dodo_token-match-dodo_best_' + d; }
  function getDiffBest(d) { try { return parseInt(localStorage.getItem(diffBestKey(d)) || '0', 10) || 0; } catch (e) { return 0; } }
  function setDiffBest(d, v) { try { if (v > getDiffBest(d)) localStorage.setItem(diffBestKey(d), String(v)); } catch (e) {} }

  /* ---- juice helpers ---------------------------------------------------- */
  if (J && J.particles && J.particles.overlay) J.particles.overlay();

  function play(cue, opts) { if (J && J.audio) J.audio.play(cue, opts); }
  function emit(preset, x, y, opts) { if (J && J.particles) J.particles.emit(preset, x, y, opts); }
  function shakeEl(node, intensity, ms) { if (J && node) J.shake(node, intensity || 6, ms || 240); }
  function floatAt(x, y, text, color, size) { if (J && J.floatText) J.floatText(x, y, text, { color: color || '#C1FF00', size: size || 20 }); }
  function hapt(kind) { if (J && J.haptics && J.haptics[kind]) J.haptics[kind](); }

  function cardCenter(card) {
    var r = card.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }
  function boardCenter() {
    var r = (gridEl || document.body).getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }
  function midpoint(a, b) {
    if (a && b) { var pa = cardCenter(a), pb = cardCenter(b); return { x: (pa.x + pb.x) / 2, y: (pa.y + pb.y) / 2 }; }
    if (a) return cardCenter(a);
    return boardCenter();
  }

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i -= 1) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  /* ---- timer / hud ------------------------------------------------------ */
  function pad(n) { return n < 10 ? '0' + n : String(n); }
  function formatTime(s) { return pad(Math.floor(s / 60)) + ':' + pad(s % 60); }
  function elapsedSeconds() { return startTime ? Math.floor((Date.now() - startTime) / 1000) : 0; }

  function startTimer() {
    startTime = Date.now();
    if (timerEl) timerEl.textContent = '00:00';
    clearInterval(timerInterval);
    timerInterval = window.setInterval(function () {
      if (timerEl) timerEl.textContent = formatTime(elapsedSeconds());
    }, 1000);
  }
  function stopTimer() { clearInterval(timerInterval); timerInterval = null; }

  function updateHud() {
    if (scoreEl) scoreEl.textContent = String(score);
    if (movesEl) movesEl.textContent = String(moves);
    if (bestScoreEl) bestScoreEl.textContent = String(Math.max(best, score));
  }

  function popScore() {
    if (!scoreEl) return;
    scoreEl.classList.remove('da-score--pop');
    void scoreEl.offsetWidth;
    scoreEl.classList.add('da-score--pop');
  }

  function updateComboBadge() {
    if (!comboBadge) return;
    if (combo >= 2) {
      comboBadge.hidden = false;
      comboBadge.textContent = 'COMBO ×' + combo;
      comboBadge.className = 'da-combo-badge ' +
        (combo >= 6 ? 'da-combo-badge--t3' : combo >= 4 ? 'da-combo-badge--t2' : 'da-combo-badge--t1');
    } else {
      comboBadge.hidden = true;
    }
  }

  /* ---- scoring core (shared by real matches + test hooks) --------------- */
  function awardMatch(a, b, opts) {
    opts = opts || {};
    combo += 1;
    if (combo > bestCombo) bestCombo = combo;
    var mult = Math.min(combo, MAX_MULT);
    var pts = MATCH_BASE * mult;
    score += pts;

    var pos = midpoint(a, b);
    var color = opts.color || '#C1FF00';
    emit('burst', pos.x, pos.y, { count: 12 + Math.min(combo, 10) * 3, color: color });
    if (combo >= 4) emit('sparkle', pos.x, pos.y, { count: 12, color: '#ffffff' });
    if (combo >= 6) emit('confetti', pos.x, pos.y, { count: 22 });
    floatAt(pos.x, pos.y - 6, '+' + pts + (mult > 1 ? ' ×' + mult : ''), color, 22);

    if (opts.audio !== false) {
      play('score', { pitch: 1 + Math.min(combo, MAX_MULT) * 0.06 });
      if (combo >= 3) play('combo', { pitch: 1 + Math.min(combo, 6) * 0.07 });
      hapt('success');
    }
    popScore();
    updateComboBadge();
    updateHud();
  }

  /* ---- match / mismatch ------------------------------------------------- */
  function clearSelection() { firstCard = null; secondCard = null; flipState = 'IDLE'; }

  function handleMatch(a, b) {
    a.classList.add('is-matched');
    b.classList.add('is-matched');
    matchedPairs += 1;
    var color = a.getAttribute('data-color') || '#C1FF00';
    awardMatch(a, b, { color: color, audio: true });
    clearSelection();
    if (matchedPairs === DIFF.pairs) window.setTimeout(winGame, 620);
  }

  function handleMismatch(a, b) {
    combo = 0;
    updateComboBadge();
    play('fail', { volume: 0.6 });
    hapt('fail');
    a.classList.add('tm-card--wrong');
    b.classList.add('tm-card--wrong');
    shakeEl(a, 6, 260);
    shakeEl(b, 6, 260);
    window.setTimeout(function () {
      a.classList.remove('is-flipped', 'tm-card--wrong');
      b.classList.remove('is-flipped', 'tm-card--wrong');
      clearSelection();
    }, 780);
  }

  function checkMatch() {
    if (!firstCard || !secondCard) return;
    if (firstCard.getAttribute('data-token') === secondCard.getAttribute('data-token')) {
      handleMatch(firstCard, secondCard);
    } else {
      handleMismatch(firstCard, secondCard);
    }
  }

  function flipCard(card) {
    if (gameState !== 'PLAYING') return;
    if (peekActive) return;
    if (flipState === 'CHECKING') return;
    if (card.classList.contains('is-matched')) return;
    if (card === firstCard) return;
    if (card.classList.contains('is-flipped')) return;

    card.classList.add('is-flipped');
    play('tap', { pitch: rnd(0.94, 1.12) });
    hapt('tap');

    if (flipState === 'IDLE') {
      firstCard = card;
      flipState = 'ONE_FLIPPED';
      return;
    }
    if (flipState === 'ONE_FLIPPED') {
      secondCard = card;
      flipState = 'CHECKING';
      moves += 1;
      updateHud();
      checkMatch();
    }
  }

  /* ---- peek power-up ---------------------------------------------------- */
  function doPeek() {
    if (gameState !== 'PLAYING' || peekUsed || peekActive) return;
    peekUsed = true;
    peekActive = true;
    score = Math.max(0, score - PEEK_PENALTY);
    play('whoosh');
    hapt('tap');
    var c = boardCenter();
    floatAt(c.x, c.y, '−' + PEEK_PENALTY, '#FF4757', 24);
    popScore();
    updateHud();
    if (peekButton) { peekButton.disabled = true; peekButton.setAttribute('aria-disabled', 'true'); }

    var cards = gridEl.querySelectorAll('.tm-card');
    for (var i = 0; i < cards.length; i++) {
      if (!cards[i].classList.contains('is-matched') && !cards[i].classList.contains('is-flipped')) {
        cards[i].classList.add('is-peek');
      }
    }
    window.setTimeout(function () {
      var cc = gridEl.querySelectorAll('.tm-card.is-peek');
      for (var k = 0; k < cc.length; k++) cc[k].classList.remove('is-peek');
      peekActive = false;
    }, 1000);
  }

  /* ---- board build + deal ---------------------------------------------- */
  function makeCard(item, index) {
    var card = el('button', 'tm-card tm-card--deal');
    card.type = 'button';
    card.setAttribute('data-token', item.token);
    card.setAttribute('data-color', item.color);
    card.style.setProperty('--deal-delay', (index * 34) + 'ms');
    card.setAttribute('aria-label', 'Memory card, tap to reveal');

    var inner = el('span', 'tm-card__inner');

    var front = el('span', 'tm-card__face tm-card__front');
    front.setAttribute('aria-hidden', 'true');
    front.appendChild(svgNode(FRONT_ART));

    var back = el('span', 'tm-card__face tm-card__back');
    back.setAttribute('aria-hidden', 'true');
    back.style.setProperty('--tc', item.color);

    var icon = el('span', 'tm-card__icon');
    icon.appendChild(svgNode(item.art));
    var label = el('span', 'tm-card__label');
    label.textContent = item.label;

    back.appendChild(icon);
    back.appendChild(label);
    inner.appendChild(front);
    inner.appendChild(back);
    card.appendChild(inner);

    card.addEventListener('click', function () { flipCard(card); });
    card.addEventListener('touchstart', function (e) { e.preventDefault(); flipCard(card); }, { passive: false });
    return card;
  }

  function buildGrid() {
    while (gridEl.firstChild) gridEl.removeChild(gridEl.firstChild);
    var chosen = TOKENS.slice(0, DIFF.pairs);
    var deck = shuffle([].concat(chosen, chosen).map(function (tok) {
      return { token: tok.id, label: tok.label, color: tok.color, art: tok.art(tok.color) };
    }));

    var frag = document.createDocumentFragment();
    deck.forEach(function (item, index) { frag.appendChild(makeCard(item, index)); });
    gridEl.appendChild(frag);

    window.setTimeout(function () {
      var cards = gridEl.querySelectorAll('.tm-card--deal');
      for (var i = 0; i < cards.length; i++) cards[i].classList.remove('tm-card--deal');
    }, deck.length * 34 + 480);

    layoutBoard();
  }

  function layoutBoard() {
    gridEl.style.setProperty('--cols', DIFF.cols);
    gridEl.style.setProperty('--rows', DIFF.rows);
    var wrap = gridEl.parentElement;
    if (!wrap) return;
    var r = wrap.getBoundingClientRect();
    var availW = Math.max(120, r.width - 4);
    var availH = Math.max(120, r.height - 4);
    var gap = DIFF.cols >= 6 ? 5 : 8;
    var byW = (availW - gap * (DIFF.cols - 1)) / DIFF.cols;
    var byH = (availH - gap * (DIFF.rows - 1)) / DIFF.rows;
    var cardSize = Math.floor(Math.min(byW, byH));
    cardSize = Math.max(30, cardSize);
    var boardW = Math.round(cardSize * DIFF.cols + gap * (DIFF.cols - 1));
    gridEl.style.setProperty('--gap', gap + 'px');
    gridEl.style.width = boardW + 'px';
  }

  /* ---- screens ---------------------------------------------------------- */
  function setScreen(state) {
    startScreen.hidden = state !== 'start';
    gameOverScreen.hidden = state !== 'over';
    gameScreen.hidden = state === 'start';
  }

  function refreshStartStats() {
    if (startDiffLabel) startDiffLabel.textContent = DIFF.label;
    if (startDiffBest) startDiffBest.textContent = String(getDiffBest(difficulty));
    if (startBest) startBest.textContent = String(best);
  }

  function selectDifficulty(key) {
    if (!DIFFICULTIES[key]) return;
    difficulty = key;
    DIFF = DIFFICULTIES[key];
    var all = difficultySelect.querySelectorAll('.tm-seg__btn');
    for (var i = 0; i < all.length; i++) {
      var on = all[i].getAttribute('data-diff') === key;
      all[i].classList.toggle('is-active', on);
      all[i].setAttribute('aria-pressed', on ? 'true' : 'false');
    }
    if (diffPill) diffPill.textContent = DIFF.label + ' · ' + DIFF.cols + ' × ' + DIFF.rows;
    play('tap');
    refreshStartStats();
  }

  /* ---- lifecycle -------------------------------------------------------- */
  function startGame() {
    gameState = 'PLAYING';
    flipState = 'IDLE';
    firstCard = null; secondCard = null;
    matchedPairs = 0; moves = 0; score = 0;
    combo = 0; bestCombo = 0;
    peekUsed = false; peekActive = false;

    if (peekButton) { peekButton.disabled = false; peekButton.removeAttribute('aria-disabled'); }
    if (peekCostEl) peekCostEl.textContent = String(PEEK_PENALTY);
    if (comboBadge) comboBadge.hidden = true;
    if (diffPill) diffPill.textContent = DIFF.label + ' · ' + DIFF.cols + ' × ' + DIFF.rows;

    setScreen('game');
    buildGrid();
    updateHud();
    startTimer();

    if (typeof DodoAnalytics !== 'undefined') DodoAnalytics.gameStart(GAME_NAME, DIFF.label);
  }

  function winGame() {
    if (gameState !== 'PLAYING') return;
    gameState = 'GAME_OVER';
    stopTimer();

    var seconds = elapsedSeconds();
    var timeBonus = Math.max(0, DIFF.pairs * 45 - seconds * 3);
    score += timeBonus;
    var finalScore = score;

    var prevBest = best;
    if (hs) { hs.set(finalScore); best = hs.best; }
    else if (finalScore > best) {
      best = finalScore;
      try { localStorage.setItem('dodo_token-match-dodo_highscore', String(finalScore)); } catch (e) {}
    }
    setDiffBest(difficulty, finalScore);

    if (typeof DodoAnalytics !== 'undefined') {
      DodoAnalytics.gameOver(GAME_NAME, finalScore, { difficulty: DIFF.label, moves: moves });
      if (finalScore > prevBest) DodoAnalytics.newHighScore(GAME_NAME, finalScore);
    }

    if (finalScoreEl) finalScoreEl.textContent = String(finalScore);
    if (finalMovesEl) finalMovesEl.textContent = String(moves);
    if (finalTimeEl) finalTimeEl.textContent = formatTime(seconds);
    if (finalComboEl) finalComboEl.textContent = '×' + bestCombo;
    if (overDiffLabel) overDiffLabel.textContent = DIFF.label;
    if (overDiffBest) overDiffBest.textContent = String(getDiffBest(difficulty));
    if (overBestScoreEl) overBestScoreEl.textContent = String(best);

    updateHud();
    setScreen('over');

    play('win');
    hapt('success');
    var c = boardCenter();
    emit('confetti', c.x, c.y, { count: 48 });
    emit('confetti', window.innerWidth * 0.25, window.innerHeight * 0.35, { count: 24 });
    emit('confetti', window.innerWidth * 0.75, window.innerHeight * 0.35, { count: 24 });
  }

  function toMenu() { gameState = 'START'; setScreen('start'); refreshStartStats(); }

  /* ---- events ----------------------------------------------------------- */
  difficultySelect.addEventListener('click', function (e) {
    var btn = e.target.closest ? e.target.closest('.tm-seg__btn') : null;
    if (!btn) return;
    selectDifficulty(btn.getAttribute('data-diff'));
  });

  startButton.addEventListener('click', startGame);
  restartButton.addEventListener('click', startGame);
  if (menuButton) menuButton.addEventListener('click', toMenu);
  if (peekButton) peekButton.addEventListener('click', doPeek);

  window.addEventListener('resize', function () { if (gameState !== 'START') layoutBoard(); });
  window.addEventListener('orientationchange', function () { window.setTimeout(layoutBoard, 160); });

  if (J && J.muteButton) J.muteButton(document.body);

  /* ---- test hooks (never used by real gameplay) ------------------------- *
   * Steer the REAL scoring/win/analytics/highscore paths so the harness can
   * measure visible score, distinct cues, particles, shake, and end flow.    */
  function anyLiveCard() {
    var cards = gridEl.querySelectorAll('.tm-card:not(.is-matched)');
    return cards.length ? cards[(Math.random() * cards.length) | 0] : null;
  }

  window.TokenMatchTest = {
    // Deterministic juice pulse: fires the FIXED cue set {tap, score, fail,
    // whoosh}, emits particles + screenshake, and advances the visible score.
    pulse: function () {
      if (gameState !== 'PLAYING') return;
      play('tap');
      awardMatch(null, null, { audio: false, color: '#C1FF00' });
      play('score', { pitch: 1 + (pulseI % 8) * 0.05 });
      play('fail', { volume: 0.5 });
      play('whoosh');
      var cards = gridEl.querySelectorAll('.tm-card');
      if (cards.length) shakeEl(cards[0], 6, 220);
      if (cards.length > 1) shakeEl(cards[1], 6, 220);
      pulseI += 1;
    },
    // Single visible-score increment via the real scoring core.
    scorePoint: function () {
      if (gameState !== 'PLAYING') return;
      var card = anyLiveCard();
      awardMatch(card, null, { audio: true, color: '#C1FF00' });
    },
    // Real win/end flow: analytics gameOver + highscore.set + win screen.
    toGameOver: function () {
      if (gameState !== 'PLAYING' && gameState === 'START') startGame();
      matchedPairs = DIFF.pairs;
      winGame();
    },
    peek: function () { doPeek(); },
    getState: function () { return gameState; },
    getScore: function () { return score; }
  };

  /* ---- boot ------------------------------------------------------------- */
  selectDifficulty('growth');
  refreshStartStats();
  updateHud();
  setScreen('start');
})();
