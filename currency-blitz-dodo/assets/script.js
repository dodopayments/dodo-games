/* ==========================================================================
 * CURRENCY BLITZ DODO — timed FX conversion race.
 * Vanilla JS, DOM-based. Juice via window.DodoJuice. Analytics via DodoAnalytics
 * (game_name frozen as "Currency Blitz Dodo"). Arcade mid-rates (not live FX).
 * ========================================================================== */
(function () {
  'use strict';

  var GAME_NAME = 'Currency Blitz Dodo';
  var SLUG = 'currency-blitz-dodo';
  var HAS_JUICE = typeof window.DodoJuice !== 'undefined';
  var J = HAS_JUICE ? window.DodoJuice : null;

  /* ---- Arcade mid-rates: units of currency per 1 USD -------------------- */
  var RATES = {
    USD: 1,
    EUR: 0.92,
    GBP: 0.79,
    INR: 83.5,
    SGD: 1.34,
    JPY: 149.5,
    AED: 3.67,
    AUD: 1.53,
    CAD: 1.36,
    CHF: 0.88
  };

  var META = {
    USD: { name: 'US Dollar', flag: '$' },
    EUR: { name: 'Euro', flag: '€' },
    GBP: { name: 'British Pound', flag: '£' },
    INR: { name: 'Indian Rupee', flag: '₹' },
    SGD: { name: 'Singapore Dollar', flag: 'S$' },
    JPY: { name: 'Japanese Yen', flag: '¥' },
    AED: { name: 'UAE Dirham', flag: 'د.إ' },
    AUD: { name: 'Australian Dollar', flag: 'A$' },
    CAD: { name: 'Canadian Dollar', flag: 'C$' },
    CHF: { name: 'Swiss Franc', flag: 'Fr' }
  };

  var PAIRS = {
    easy: [
      ['USD', 'INR'], ['INR', 'USD'],
      ['EUR', 'USD'], ['USD', 'EUR'],
      ['GBP', 'USD'], ['USD', 'GBP']
    ],
    medium: [
      ['SGD', 'INR'], ['INR', 'SGD'],
      ['JPY', 'USD'], ['USD', 'JPY'],
      ['AED', 'INR'], ['INR', 'AED'],
      ['EUR', 'INR'], ['GBP', 'INR']
    ],
    hard: [
      ['USD', 'CHF'], ['CHF', 'USD'],
      ['AUD', 'CAD'], ['CAD', 'AUD'],
      ['EUR', 'JPY'], ['JPY', 'EUR'],
      ['GBP', 'SGD'], ['SGD', 'GBP'],
      ['AED', 'EUR'], ['CHF', 'INR'],
      ['AUD', 'INR'], ['CAD', 'JPY']
    ]
  };

  var DIFFICULTIES = {
    easy: {
      key: 'easy',
      label: 'Easy',
      seconds: 15,
      decimals: 0,
      tolerancePct: 0.02,
      amounts: [25, 50, 75, 100, 150, 200, 250, 500]
    },
    medium: {
      key: 'medium',
      label: 'Medium',
      seconds: 12,
      decimals: 0,
      tolerancePct: 0.015,
      amounts: [40, 80, 120, 175, 240, 350, 480, 750]
    },
    hard: {
      key: 'hard',
      label: 'Hard',
      seconds: 10,
      decimals: 2,
      tolerancePct: 0.005,
      amounts: [37.5, 64.25, 99.99, 128.4, 256.75, 499.5, 812.3, 1250.55]
    }
  };

  var RING_CIRC = 2 * Math.PI * 52;
  var MAX_LIVES = 3;
  var MAX_MULT = 8;
  var DOUBLE_WINDOW = 3;
  var FREEZE_BONUS = 5;
  var COMBO_EVERY = 5;

  /* ---- state ------------------------------------------------------------ */
  var difficulty = 'easy';
  var DIFF = DIFFICULTIES[difficulty];
  var mode = 'blitz'; // blitz | daily
  var gameState = 'START';
  var score = 0;
  var lives = MAX_LIVES;
  var streak = 0;
  var bestStreak = 0;
  var correctCount = 0;
  var freezeCharges = 1;
  var comboMult = 1;
  var answerLocked = false;
  var currentQ = null;
  var questionStartedAt = 0;
  var timeLeftMs = 0;
  var timeLimitMs = 0;
  var timerRaf = 0;
  var lastTickSec = -1;
  var answerTimes = [];
  var dailySeed = 0;
  var rngState = 1;

  /* ---- DOM -------------------------------------------------------------- */
  var shell = document.getElementById('cbShell');
  var gameScreen = document.getElementById('gameScreen');
  var startScreen = document.getElementById('startScreen');
  var gameOverScreen = document.getElementById('gameOverScreen');
  var stage = document.getElementById('cbStage');
  var difficultySelect = document.getElementById('difficultySelect');
  var modeBlitz = document.getElementById('modeBlitz');
  var modeDaily = document.getElementById('modeDaily');
  var startButton = document.getElementById('startButton');
  var restartButton = document.getElementById('restartButton');
  var menuButton = document.getElementById('menuButton');
  var freezeBtn = document.getElementById('freezeBtn');
  var doubleHint = document.getElementById('doubleHint');
  var numPad = document.getElementById('numPad');
  var answerInput = document.getElementById('answerInput');
  var answerField = document.querySelector('.cb-answer__field');
  var answerCurrency = document.getElementById('answerCurrency');
  var feedback = document.getElementById('feedback');
  var promptCard = document.getElementById('promptCard');
  var timerEl = document.querySelector('.cb-timer');
  var timerRing = document.getElementById('timerRing');
  var timerSecs = document.getElementById('timerSecs');

  var scoreEl = document.getElementById('score');
  var streakEl = document.getElementById('streak');
  var livesEl = document.getElementById('lives');
  var bestScoreEl = document.getElementById('bestScore');
  var comboBadge = document.getElementById('comboBadge');
  var freezeCountEl = document.getElementById('freezeCount');

  var fromAmount = document.getElementById('fromAmount');
  var fromCode = document.getElementById('fromCode');
  var toCode = document.getElementById('toCode');
  var rateHint = document.getElementById('rateHint');
  var promptEyebrow = document.getElementById('promptEyebrow');

  var lbScore = document.getElementById('lbScore');
  var lbStreak = document.getElementById('lbStreak');
  var lbAvg = document.getElementById('lbAvg');
  var lbDaily = document.getElementById('lbDaily');

  var finalScoreEl = document.getElementById('finalScore');
  var finalCorrect = document.getElementById('finalCorrect');
  var finalStreak = document.getElementById('finalStreak');
  var finalAvg = document.getElementById('finalAvg');
  var finalFast = document.getElementById('finalFast');
  var overDiffLabel = document.getElementById('overDiffLabel');
  var overDiffBest = document.getElementById('overDiffBest');
  var overBestScore = document.getElementById('overBestScore');
  var resultEyebrow = document.getElementById('resultEyebrow');
  var resultTitle = document.getElementById('resultTitle');

  /* ---- persistence ------------------------------------------------------ */
  var hs = (J && J.highscore) ? J.highscore(SLUG) : null;
  var best = hs ? hs.best : (parseInt(localStorage.getItem('dodo_' + SLUG + '_highscore') || '0', 10) || 0);

  function lsGet(k, fallback) {
    try {
      var v = localStorage.getItem(k);
      return v == null ? fallback : v;
    } catch (e) { return fallback; }
  }
  function lsSet(k, v) {
    try { localStorage.setItem(k, String(v)); } catch (e) {}
  }
  function diffBestKey(d) { return 'dodo_' + SLUG + '_best_' + d; }
  function getDiffBest(d) { return parseInt(lsGet(diffBestKey(d), '0'), 10) || 0; }
  function setDiffBest(d, v) { if (v > getDiffBest(d)) lsSet(diffBestKey(d), v); }

  function getMeta() {
    return {
      bestStreak: parseInt(lsGet('dodo_' + SLUG + '_best_streak', '0'), 10) || 0,
      avgMs: parseFloat(lsGet('dodo_' + SLUG + '_avg_ms', '0')) || 0,
      avgSamples: parseInt(lsGet('dodo_' + SLUG + '_avg_n', '0'), 10) || 0,
      dailyKey: lsGet('dodo_' + SLUG + '_daily_key', ''),
      dailyBest: parseInt(lsGet('dodo_' + SLUG + '_daily_best', '0'), 10) || 0
    };
  }
  function setMeta(partial) {
    var m = getMeta();
    Object.keys(partial).forEach(function (k) { m[k] = partial[k]; });
    lsSet('dodo_' + SLUG + '_best_streak', m.bestStreak);
    lsSet('dodo_' + SLUG + '_avg_ms', m.avgMs);
    lsSet('dodo_' + SLUG + '_avg_n', m.avgSamples);
    lsSet('dodo_' + SLUG + '_daily_key', m.dailyKey);
    lsSet('dodo_' + SLUG + '_daily_best', m.dailyBest);
  }

  function todayKey() {
    var d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  /* ---- juice ------------------------------------------------------------ */
  if (J && J.particles && J.particles.overlay) J.particles.overlay();
  if (J && J.muteButton) J.muteButton(document.body);

  function play(cue, opts) { if (J && J.audio) J.audio.play(cue, opts); }
  function emit(preset, x, y, opts) { if (J && J.particles) J.particles.emit(preset, x, y, opts); }
  function shakeEl(node, intensity, ms) { if (J && node) J.shake(node, intensity || 6, ms || 240); }
  function floatAt(x, y, text, color, size) {
    if (J && J.floatText) J.floatText(x, y, text, { color: color || '#C1FF00', size: size || 20 });
  }
  function hapt(kind) { if (J && J.haptics && J.haptics[kind]) J.haptics[kind](); }

  function centerOf(el) {
    var r = (el || stage || document.body).getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  /* ---- helpers ---------------------------------------------------------- */
  function pad(n) { return n < 10 ? '0' + n : String(n); }

  function formatMs(ms) {
    if (!ms || !isFinite(ms)) return '—';
    return (ms / 1000).toFixed(1) + 's';
  }

  function hashSeed(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0) || 1;
  }

  function rng() {
    // xorshift32
    rngState ^= rngState << 13;
    rngState ^= rngState >>> 17;
    rngState ^= rngState << 5;
    return ((rngState >>> 0) % 100000) / 100000;
  }

  function pick(arr) {
    return arr[Math.floor(rng() * arr.length) % arr.length];
  }

  function convert(amount, from, to) {
    return amount * (RATES[to] / RATES[from]);
  }

  function roundTo(n, decimals) {
    var f = Math.pow(10, decimals);
    return Math.round(n * f) / f;
  }

  function formatAnswer(n, decimals) {
    if (decimals <= 0) return String(Math.round(n));
    return n.toFixed(decimals);
  }

  function parseAnswer(raw) {
    if (!raw) return NaN;
    var cleaned = String(raw).replace(/,/g, '').trim();
    if (!cleaned || cleaned === '.' || cleaned === '-') return NaN;
    return Number(cleaned);
  }

  function isWithinTolerance(guess, exact, decimals, pct) {
    if (!isFinite(guess)) return false;
    var target = roundTo(exact, decimals);
    var g = roundTo(guess, decimals);
    if (decimals >= 2 && Math.abs(g - target) < 0.005) return true;
    var allowed = Math.max(Math.abs(target) * pct, decimals >= 2 ? 0.05 : 1);
    return Math.abs(g - target) <= allowed;
  }

  /* ---- HUD -------------------------------------------------------------- */
  function livesGlyphs() {
    var out = '';
    for (var i = 0; i < MAX_LIVES; i++) out += i < lives ? '●' : '○';
    return out;
  }

  function updateHud() {
    if (scoreEl) scoreEl.textContent = String(score);
    if (streakEl) streakEl.textContent = String(streak);
    if (livesEl) livesEl.textContent = livesGlyphs();
    if (bestScoreEl) bestScoreEl.textContent = String(Math.max(best, score));
    if (freezeCountEl) freezeCountEl.textContent = String(freezeCharges);
    if (freezeBtn) {
      freezeBtn.disabled = freezeCharges <= 0 || gameState !== 'PLAYING' || answerLocked;
      freezeBtn.classList.toggle('is-ready', freezeCharges > 0 && gameState === 'PLAYING');
    }
    updateComboBadge();
  }

  function updateComboBadge() {
    if (!comboBadge) return;
    if (comboMult >= 2) {
      comboBadge.hidden = false;
      comboBadge.textContent = 'COMBO ×' + comboMult;
      comboBadge.className = 'da-combo-badge ' +
        (comboMult >= 6 ? 'da-combo-badge--t3' : comboMult >= 4 ? 'da-combo-badge--t2' : 'da-combo-badge--t1');
    } else {
      comboBadge.hidden = true;
    }
  }

  function popScore() {
    if (!scoreEl) return;
    scoreEl.classList.remove('da-score--pop');
    void scoreEl.offsetWidth;
    scoreEl.classList.add('da-score--pop');
  }

  function showFeedback(text, kind) {
    if (!feedback) return;
    feedback.textContent = text;
    feedback.className = 'cb-feedback is-show' + (kind ? ' is-' + kind : '');
  }

  function clearFeedback() {
    if (!feedback) return;
    feedback.className = 'cb-feedback';
    feedback.textContent = '';
  }

  function refreshLeaderboard() {
    var m = getMeta();
    var day = todayKey();
    if (m.dailyKey !== day) {
      m.dailyBest = 0;
      m.dailyKey = day;
      setMeta(m);
    }
    if (lbScore) lbScore.textContent = String(best);
    if (lbStreak) lbStreak.textContent = String(m.bestStreak);
    if (lbAvg) lbAvg.textContent = m.avgSamples ? formatMs(m.avgMs) : '—';
    if (lbDaily) lbDaily.textContent = String(m.dailyBest);
  }

  /* ---- timer ------------------------------------------------------------ */
  function stopTimer() {
    if (timerRaf) cancelAnimationFrame(timerRaf);
    timerRaf = 0;
  }

  function setTimerVisual(ratio, secs) {
    if (timerRing) timerRing.style.strokeDashoffset = String(RING_CIRC * (1 - Math.max(0, Math.min(1, ratio))));
    if (timerSecs) timerSecs.textContent = String(Math.max(0, secs));
    if (!timerEl) return;
    timerEl.classList.toggle('is-warn', secs <= 5 && secs > 3);
    timerEl.classList.toggle('is-danger', secs <= 3);
  }

  function tickTimer(now) {
    if (gameState !== 'PLAYING' || answerLocked) return;
    var elapsed = now - questionStartedAt;
    timeLeftMs = Math.max(0, timeLimitMs - elapsed);
    var secs = Math.ceil(timeLeftMs / 1000);
    setTimerVisual(timeLeftMs / timeLimitMs, secs);

    if (doubleHint) {
      var elapsedSec = elapsed / 1000;
      doubleHint.classList.toggle('is-hot', elapsedSec <= DOUBLE_WINDOW);
    }

    if (secs !== lastTickSec) {
      lastTickSec = secs;
      if (secs <= 3 && secs > 0) play('tick', { pitch: 1 + (3 - secs) * 0.08 });
    }

    if (timeLeftMs <= 0) {
      onTimeout();
      return;
    }
    timerRaf = requestAnimationFrame(tickTimer);
  }

  function startQuestionTimer() {
    stopTimer();
    questionStartedAt = performance.now();
    timeLimitMs = DIFF.seconds * 1000;
    timeLeftMs = timeLimitMs;
    lastTickSec = -1;
    if (timerEl) timerEl.classList.remove('is-frozen', 'is-warn', 'is-danger');
    setTimerVisual(1, DIFF.seconds);
    timerRaf = requestAnimationFrame(tickTimer);
  }

  function useFreeze() {
    if (gameState !== 'PLAYING' || answerLocked || freezeCharges <= 0) return;
    freezeCharges -= 1;
    timeLimitMs += FREEZE_BONUS * 1000;
    timeLeftMs += FREEZE_BONUS * 1000;
    if (timerEl) {
      timerEl.classList.add('is-frozen');
      setTimeout(function () { if (timerEl) timerEl.classList.remove('is-frozen'); }, 900);
    }
    play('powerup');
    hapt('success');
    var c = centerOf(freezeBtn);
    emit('sparkle', c.x, c.y, { count: 14, color: '#4DA3FF' });
    floatAt(c.x, c.y - 10, '+5s FREEZE', '#4DA3FF', 18);
    showFeedback('⏱ Clock frozen · +' + FREEZE_BONUS + 's', 'bonus');
    updateHud();
  }

  /* ---- questions -------------------------------------------------------- */
  function makeQuestion() {
    var pairs = PAIRS[difficulty] || PAIRS.easy;
    var pair = pick(pairs);
    var from = pair[0];
    var to = pair[1];
    var amount = pick(DIFF.amounts);
    if (difficulty === 'hard' && rng() > 0.45) {
      amount = roundTo(20 + rng() * 1800, 2);
    } else if (difficulty !== 'hard' && rng() > 0.7) {
      amount = pick([10, 20, 30, 60, 90, 300, 400, 600]);
    }
    var exact = convert(amount, from, to);
    return {
      from: from,
      to: to,
      amount: amount,
      exact: exact,
      displayExact: roundTo(exact, DIFF.decimals)
    };
  }

  function renderQuestion(q) {
    currentQ = q;
    answerLocked = false;
    if (fromAmount) fromAmount.textContent = formatAnswer(q.amount, Number.isInteger(q.amount) ? 0 : 2);
    if (fromCode) fromCode.textContent = q.from;
    if (toCode) toCode.textContent = q.to;
    if (answerCurrency) answerCurrency.textContent = q.to;
    if (promptEyebrow) promptEyebrow.textContent = mode === 'daily' ? 'Daily Convert' : 'Convert';
    if (rateHint) {
      rateHint.textContent = DIFF.decimals > 0
        ? 'Arcade mid-rate · round to 2 decimals'
        : 'Arcade mid-rate · nearest whole ' + q.to;
    }
    if (answerInput) {
      answerInput.value = '';
      answerInput.focus({ preventScroll: true });
    }
    if (answerField) answerField.classList.remove('is-correct', 'is-wrong');
    if (promptCard) {
      promptCard.classList.remove('is-shake');
      void promptCard.offsetWidth;
      promptCard.classList.add('cb-prompt');
    }
    clearFeedback();
    updateHud();
    startQuestionTimer();
  }

  function nextQuestion() {
    renderQuestion(makeQuestion());
  }

  /* ---- scoring ---------------------------------------------------------- */
  function awardCorrect(elapsedMs) {
    var elapsedSec = elapsedMs / 1000;
    var speedBonus = Math.max(0, Math.round((DIFF.seconds - elapsedSec) * 8));
    var base = 100 + speedBonus;
    var doubled = elapsedSec <= DOUBLE_WINDOW;
    if (doubled) base *= 2;

    streak += 1;
    correctCount += 1;
    if (streak > bestStreak) bestStreak = streak;

    if (streak > 0 && streak % COMBO_EVERY === 0) {
      comboMult = Math.min(MAX_MULT, comboMult * 2);
      play('combo', { pitch: 1 + comboMult * 0.05 });
      var cc = centerOf(promptCard);
      emit('confetti', cc.x, cc.y, { count: 24 });
      floatAt(cc.x, cc.y - 24, 'COMBO ×' + comboMult, '#C1FF00', 26);
      if (streak % 10 === 0) freezeCharges += 1;
    }

    var pts = base * comboMult;
    score += pts;
    answerTimes.push(elapsedMs);

    if (streak > 0 && streak % 5 === 0) freezeCharges = Math.min(3, freezeCharges + 1);

    var pos = centerOf(promptCard);
    emit('burst', pos.x, pos.y, { count: doubled ? 18 : 12, color: doubled ? '#C1FF00' : '#2ED573' });
    floatAt(pos.x, pos.y - 8, '+' + pts + (doubled ? ' 2×' : ''), doubled ? '#C1FF00' : '#2ED573', 22);
    play('score', { pitch: 1 + Math.min(streak, 10) * 0.04 });
    if (doubled) play('powerup', { pitch: 1.1 });
    hapt('success');
    popScore();

    var msg = '✓ ' + formatAnswer(currentQ.displayExact, DIFF.decimals) + ' ' + currentQ.to;
    if (doubled) msg += ' · DOUBLE';
    if (comboMult > 1) msg += ' · ×' + comboMult;
    showFeedback(msg, doubled ? 'bonus' : 'good');
  }

  function loseLife(reason) {
    lives -= 1;
    streak = 0;
    comboMult = 1;
    play('fail');
    hapt('fail');
    shakeEl(shell || promptCard, 8, 280);
    if (promptCard) {
      promptCard.classList.remove('is-shake');
      void promptCard.offsetWidth;
      promptCard.classList.add('is-shake');
    }
    if (answerField) {
      answerField.classList.remove('is-wrong');
      void answerField.offsetWidth;
      answerField.classList.add('is-wrong');
    }
    var exactTxt = currentQ ? formatAnswer(currentQ.displayExact, DIFF.decimals) + ' ' + currentQ.to : '';
    showFeedback((reason || 'Miss') + (exactTxt ? ' · was ' + exactTxt : ''), 'bad');
    updateHud();
  }

  function submitAnswer() {
    if (gameState !== 'PLAYING' || answerLocked || !currentQ) return;
    var guess = parseAnswer(answerInput && answerInput.value);
    if (!isFinite(guess)) {
      showFeedback('Enter an amount', 'bad');
      play('tick');
      return;
    }

    answerLocked = true;
    stopTimer();
    var elapsed = performance.now() - questionStartedAt;
    var ok = isWithinTolerance(guess, currentQ.exact, DIFF.decimals, DIFF.tolerancePct);

    if (ok) {
      if (answerField) answerField.classList.add('is-correct');
      awardCorrect(elapsed);
      updateHud();
      setTimeout(function () {
        if (gameState === 'PLAYING') nextQuestion();
      }, 520);
    } else {
      loseLife('Wrong');
      if (lives <= 0) {
        setTimeout(endGame, 700);
      } else {
        setTimeout(function () {
          if (gameState === 'PLAYING') nextQuestion();
        }, 850);
      }
    }
  }

  function onTimeout() {
    if (gameState !== 'PLAYING' || answerLocked) return;
    answerLocked = true;
    stopTimer();
    loseLife('Time up');
    if (lives <= 0) {
      setTimeout(endGame, 700);
    } else {
      setTimeout(function () {
        if (gameState === 'PLAYING') nextQuestion();
      }, 850);
    }
  }

  /* ---- flow ------------------------------------------------------------- */
  function setDifficulty(key) {
    if (!DIFFICULTIES[key]) return;
    difficulty = key;
    DIFF = DIFFICULTIES[key];
    var buttons = difficultySelect ? difficultySelect.querySelectorAll('.cb-seg__btn') : [];
    for (var i = 0; i < buttons.length; i++) {
      var active = buttons[i].getAttribute('data-diff') === key;
      buttons[i].classList.toggle('is-active', active);
      buttons[i].setAttribute('aria-pressed', active ? 'true' : 'false');
    }
  }

  function setMode(next) {
    mode = next;
    if (modeBlitz) {
      modeBlitz.classList.toggle('is-active', mode === 'blitz');
      modeBlitz.setAttribute('aria-pressed', mode === 'blitz' ? 'true' : 'false');
    }
    if (modeDaily) {
      modeDaily.classList.toggle('is-active', mode === 'daily');
      modeDaily.setAttribute('aria-pressed', mode === 'daily' ? 'true' : 'false');
    }
    if (mode === 'daily') setDifficulty('medium');
    if (difficultySelect) difficultySelect.style.opacity = mode === 'daily' ? '0.45' : '1';
    if (difficultySelect) difficultySelect.style.pointerEvents = mode === 'daily' ? 'none' : '';
  }

  function startGame() {
    if (mode === 'daily') {
      setDifficulty('medium');
      dailySeed = hashSeed(todayKey() + ':' + SLUG);
      rngState = dailySeed;
    } else {
      rngState = (Date.now() % 1000000) || 1;
    }

    score = 0;
    lives = MAX_LIVES;
    streak = 0;
    bestStreak = 0;
    correctCount = 0;
    freezeCharges = 1;
    comboMult = 1;
    answerTimes = [];
    gameState = 'PLAYING';

    if (startScreen) startScreen.hidden = true;
    if (gameOverScreen) gameOverScreen.hidden = true;
    if (gameScreen) gameScreen.hidden = false;

    updateHud();
    nextQuestion();

    if (typeof DodoAnalytics !== 'undefined') {
      DodoAnalytics.gameStart(GAME_NAME, mode === 'daily' ? 'daily' : difficulty);
    }
  }

  function endGame() {
    if (gameState === 'GAME_OVER') return;
    gameState = 'GAME_OVER';
    stopTimer();
    answerLocked = true;

    var isNewHigh = score > best;
    if (hs) best = hs.set(score);
    else if (isNewHigh) {
      best = score;
      lsSet('dodo_' + SLUG + '_highscore', best);
    }
    setDiffBest(difficulty, score);

    var m = getMeta();
    if (bestStreak > m.bestStreak) m.bestStreak = bestStreak;
    if (answerTimes.length) {
      var sum = 0;
      for (var i = 0; i < answerTimes.length; i++) sum += answerTimes[i];
      var runAvg = sum / answerTimes.length;
      if (m.avgSamples <= 0) {
        m.avgMs = runAvg;
        m.avgSamples = answerTimes.length;
      } else {
        var totalN = m.avgSamples + answerTimes.length;
        m.avgMs = ((m.avgMs * m.avgSamples) + sum) / totalN;
        m.avgSamples = totalN;
      }
    }
    var day = todayKey();
    if (m.dailyKey !== day) {
      m.dailyKey = day;
      m.dailyBest = 0;
    }
    if (mode === 'daily' && score > m.dailyBest) m.dailyBest = score;
    setMeta(m);
    refreshLeaderboard();

    var avg = answerTimes.length ? (answerTimes.reduce(function (a, b) { return a + b; }, 0) / answerTimes.length) : 0;
    var fastest = answerTimes.length ? Math.min.apply(null, answerTimes) : 0;

    if (finalScoreEl) finalScoreEl.textContent = String(score);
    if (finalCorrect) finalCorrect.textContent = String(correctCount);
    if (finalStreak) finalStreak.textContent = String(bestStreak);
    if (finalAvg) finalAvg.textContent = formatMs(avg);
    if (finalFast) finalFast.textContent = formatMs(fastest);
    if (overDiffLabel) overDiffLabel.textContent = mode === 'daily' ? 'Daily' : DIFF.label;
    if (overDiffBest) overDiffBest.textContent = String(mode === 'daily' ? m.dailyBest : getDiffBest(difficulty));
    if (overBestScore) overBestScore.textContent = String(best);

    if (resultEyebrow) resultEyebrow.textContent = isNewHigh ? 'New High Score' : (mode === 'daily' ? 'Daily Settled' : 'Settlement Closed');
    if (resultTitle) {
      resultTitle.textContent = isNewHigh ? 'FX Unicorn!' : (correctCount >= 10 ? 'Strong Book' : 'Out of Runway');
    }

    if (gameScreen) gameScreen.hidden = true;
    if (gameOverScreen) gameOverScreen.hidden = false;

    var c = centerOf(gameOverScreen);
    if (isNewHigh) {
      emit('confetti', c.x, c.y, { count: 36 });
      play('win');
    } else {
      play('gameover');
    }

    if (typeof DodoAnalytics !== 'undefined') {
      DodoAnalytics.gameOver(GAME_NAME, score, {
        correct: correctCount,
        streak: bestStreak,
        difficulty: mode === 'daily' ? 'daily' : difficulty
      });
      if (isNewHigh) DodoAnalytics.newHighScore(GAME_NAME, score);
    }
  }

  function showMenu() {
    stopTimer();
    gameState = 'START';
    if (gameScreen) gameScreen.hidden = true;
    if (gameOverScreen) gameOverScreen.hidden = true;
    if (startScreen) startScreen.hidden = false;
    refreshLeaderboard();
  }

  /* ---- input ------------------------------------------------------------ */
  function appendDigit(ch) {
    if (gameState !== 'PLAYING' || answerLocked || !answerInput) return;
    var v = answerInput.value || '';
    if (ch === '.') {
      if (DIFF.decimals <= 0) return;
      if (v.indexOf('.') !== -1) return;
      if (!v) v = '0';
    }
    if (ch !== '.' && v.replace('.', '').length >= 9) return;
    answerInput.value = v + ch;
    play('tick', { volume: 0.45, pitch: 1.2 });
  }

  function backspace() {
    if (gameState !== 'PLAYING' || answerLocked || !answerInput) return;
    answerInput.value = answerInput.value.slice(0, -1);
  }

  function clearAnswer() {
    if (gameState !== 'PLAYING' || answerLocked || !answerInput) return;
    answerInput.value = '';
  }

  function pressVisual(btn) {
    if (!btn) return;
    btn.classList.add('is-pressed');
    setTimeout(function () { btn.classList.remove('is-pressed'); }, 90);
  }

  if (numPad) {
    numPad.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-key]');
      if (!btn) return;
      pressVisual(btn);
      var key = btn.getAttribute('data-key');
      if (key === 'submit') submitAnswer();
      else if (key === 'back') backspace();
      else if (key === 'clear') clearAnswer();
      else appendDigit(key);
    });
  }

  if (answerInput) {
    answerInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        submitAnswer();
      }
    });
    // Keep native typing available on desktop; pad still works on mobile.
    answerInput.addEventListener('input', function () {
      var v = answerInput.value.replace(/[^0-9.]/g, '');
      var parts = v.split('.');
      if (parts.length > 2) v = parts[0] + '.' + parts.slice(1).join('');
      if (DIFF.decimals <= 0) v = v.replace(/\./g, '');
      answerInput.value = v;
    });
  }

  document.addEventListener('keydown', function (e) {
    if (gameState !== 'PLAYING') {
      if (gameState === 'START' && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        startGame();
      }
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      submitAnswer();
      return;
    }
    if (e.key === 'f' || e.key === 'F') {
      e.preventDefault();
      useFreeze();
      return;
    }
    if (e.key === 'Backspace') {
      // let input handle if focused
      if (document.activeElement !== answerInput) {
        e.preventDefault();
        backspace();
      }
    }
  });

  /* ---- bindings --------------------------------------------------------- */
  if (difficultySelect) {
    difficultySelect.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-diff]');
      if (!btn || mode === 'daily') return;
      setDifficulty(btn.getAttribute('data-diff'));
    });
  }
  if (modeBlitz) modeBlitz.addEventListener('click', function () { setMode('blitz'); });
  if (modeDaily) modeDaily.addEventListener('click', function () { setMode('daily'); });
  if (startButton) startButton.addEventListener('click', startGame);
  if (restartButton) restartButton.addEventListener('click', startGame);
  if (menuButton) menuButton.addEventListener('click', showMenu);
  if (freezeBtn) freezeBtn.addEventListener('click', useFreeze);

  /* ---- boot ------------------------------------------------------------- */
  if (timerRing) {
    timerRing.style.strokeDasharray = String(RING_CIRC);
    timerRing.style.strokeDashoffset = '0';
  }
  setDifficulty('easy');
  setMode('blitz');
  refreshLeaderboard();
  updateHud();

  /* Test hooks for harness / manual QA */
  window.CurrencyBlitzTest = {
    start: startGame,
    submit: submitAnswer,
    freeze: useFreeze,
    getState: function () {
      return {
        gameState: gameState,
        score: score,
        lives: lives,
        streak: streak,
        comboMult: comboMult,
        difficulty: difficulty,
        mode: mode,
        question: currentQ
      };
    },
    convert: convert,
    rates: RATES
  };
})();
