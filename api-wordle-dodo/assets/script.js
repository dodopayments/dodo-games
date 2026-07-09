/* ==========================================================================
 * API WORDLE DODO — daily + free-play payment-term Wordle with streaks,
 * hard mode, a 150+ term fintech dictionary (with definitions), CSS-event tile
 * reveals, tiered win celebrations and full DodoJuice audio/particle juice.
 *
 * Vanilla JS. Stays DOM (no canvas). Game-feel via window.DodoJuice.
 * Analytics via bare `DodoAnalytics` global (game_name frozen "API Wordle Dodo").
 * ========================================================================== */
(function () {
  'use strict';

  var GAME_NAME = 'API Wordle Dodo';
  var SLUG = 'api-wordle-dodo';
  var HAS_JUICE = typeof window.DodoJuice !== 'undefined';
  var J = HAS_JUICE ? window.DodoJuice : null;

  var MAX_GUESSES = 6;
  var WORD_LENGTH = 5;
  var STAGGER = 100;   // ms between tile flips
  var FLIP_MS = 200;   // ms per half-flip (matches CSS transition)

  /* ---- dictionary: 150+ real 5-letter fintech terms + one-line defs ----- */
  var TERMS = [
    ['DEBIT', 'A deduction drawn directly from an account balance.'],
    ['TOKEN', 'A surrogate value that replaces sensitive card data.'],
    ['FRAUD', 'Deception intended for unlawful financial gain.'],
    ['VAULT', 'A secure store for keys, cash, or card data.'],
    ['SWIFT', 'The global network for interbank payment messages.'],
    ['BATCH', 'A group of transactions captured and settled together.'],
    ['FUNDS', 'Money available for payment or investment.'],
    ['YIELD', 'The return earned on an investment or deposit.'],
    ['STAKE', 'Capital placed at risk in pursuit of a return.'],
    ['ASSET', 'A resource of measurable economic value.'],
    ['BONDS', 'Debt securities that pay fixed interest.'],
    ['TRADE', 'The exchange of goods, services, or assets.'],
    ['AUDIT', 'An official examination of financial records.'],
    ['DRAFT', 'A written order directing the payment of money.'],
    ['FLOAT', 'Funds in transit between two accounts.'],
    ['GROSS', 'Total revenue before any deductions.'],
    ['INDEX', 'A benchmark tracking a basket of assets.'],
    ['LIMIT', 'The maximum spend or exposure allowed.'],
    ['MERGE', 'To combine two companies, ledgers, or records.'],
    ['ORDER', 'An instruction to buy, sell, or pay.'],
    ['PAYER', 'The party sending a payment.'],
    ['PAYEE', 'The party receiving a payment.'],
    ['QUERY', 'A request for data from a system.'],
    ['RATES', 'The prices charged for interest or exchange.'],
    ['SPLIT', 'Dividing one payment across several parties.'],
    ['TAXES', 'Compulsory levies imposed by a government.'],
    ['VALUE', 'The monetary worth of something.'],
    ['WIRES', 'Electronic bank-to-bank money transfers.'],
    ['AGENT', 'An intermediary acting on another party\u2019s behalf.'],
    ['BILLS', 'Statements of money owed for goods or services.'],
    ['CARDS', 'Payment instruments such as debit or credit.'],
    ['DEALS', 'Negotiated business or pricing agreements.'],
    ['FOREX', 'The foreign-exchange currency market.'],
    ['GRANT', 'Funds awarded that need not be repaid.'],
    ['HEDGE', 'An investment taken to offset risk.'],
    ['ISSUE', 'To release securities or a payment card.'],
    ['JOINT', 'An account shared by two or more holders.'],
    ['KIOSK', 'A self-service payment or checkout terminal.'],
    ['LOANS', 'Sums borrowed to be repaid with interest.'],
    ['MICRO', 'A very small payment or transaction amount.'],
    ['MONEY', 'A medium of exchange for goods and services.'],
    ['PRICE', 'The amount charged for a product or service.'],
    ['QUOTA', 'An assigned share, target, or ceiling.'],
    ['BUYER', 'One who purchases goods or services.'],
    ['CHAIN', 'A linked, tamper-evident sequence of blocks.'],
    ['BLOCK', 'A bundle of transactions recorded on a ledger.'],
    ['CACHE', 'A fast store of frequently used data.'],
    ['CLOUD', 'Remote servers that host applications and data.'],
    ['CODES', 'Identifiers such as CVV or authorization codes.'],
    ['COINS', 'Units of physical or digital currency.'],
    ['COSTS', 'Expenses incurred while doing business.'],
    ['CROWD', 'The many backers behind a crowdfunding raise.'],
    ['CYCLE', 'A recurring billing or settlement period.'],
    ['ENTRY', 'A single recorded line in a ledger.'],
    ['ERROR', 'A fault raised during processing.'],
    ['FINAL', 'The settled, irreversible state of a payment.'],
    ['FIXED', 'A rate or fee that does not change.'],
    ['FRAME', 'A structured unit of data in a protocol.'],
    ['GAINS', 'Profits realized from investments.'],
    ['GATES', 'Control points, as in a payment gateway.'],
    ['GIFTS', 'Prepaid value loaded onto a gift card.'],
    ['GOALS', 'Targeted savings or revenue amounts.'],
    ['GRADE', 'A rating of credit or asset quality.'],
    ['GUARD', 'A safeguard placed against fraud or loss.'],
    ['HOOKS', 'Webhooks delivering event callbacks.'],
    ['HOURS', 'Billable units of worked time.'],
    ['INPUT', 'Data entered into a system.'],
    ['LEVEL', 'A tier of pricing, access, or risk.'],
    ['LINKS', 'Shareable payment links for collecting money.'],
    ['LOGIN', 'Credentials granting access to an account.'],
    ['LOGIC', 'The rules that govern how processing behaves.'],
    ['MERIT', 'Creditworthiness or demonstrated quality.'],
    ['METAL', 'A premium, heavier payment-card tier.'],
    ['MODEL', 'A pricing, risk, or revenue framework.'],
    ['NICHE', 'A specialized segment of a market.'],
    ['NODES', 'Individual participants in a network.'],
    ['NOTES', 'Banknotes, or short-term promissory notes.'],
    ['OFFER', 'A proposed price, deal, or term sheet.'],
    ['OWNER', 'The holder of an asset or account.'],
    ['PANEL', 'A dashboard view of key metrics.'],
    ['PATCH', 'A small software fix or update.'],
    ['PHASE', 'A defined stage within a rollout.'],
    ['PILOT', 'A limited trial launch of a product.'],
    ['PLANS', 'The subscription tiers a product offers.'],
    ['POINT', 'A loyalty reward unit, or a basis point.'],
    ['POOLS', 'Aggregated funds or shared liquidity.'],
    ['PROXY', 'An intermediary server or standing party.'],
    ['QUEUE', 'Transactions lined up awaiting processing.'],
    ['QUOTE', 'A stated price offered for a trade.'],
    ['RALLY', 'A sustained rise in market prices.'],
    ['RANGE', 'The span between a high and a low price.'],
    ['REPAY', 'To pay back a borrowed sum.'],
    ['RESET', 'To restore a value to its default.'],
    ['RETRY', 'To reattempt a failed payment.'],
    ['RISKS', 'Potential financial losses to be managed.'],
    ['ROBOT', 'An automated trading or agent bot.'],
    ['ROLES', 'Permission sets assigned to users.'],
    ['ROUTE', 'The path a payment takes to settle.'],
    ['RULES', 'Conditions that govern transaction handling.'],
    ['SALES', 'Completed revenue-earning transactions.'],
    ['SAVER', 'One who regularly sets money aside.'],
    ['SCALE', 'To grow capacity or transaction volume.'],
    ['SCOPE', 'The range of permissions a token grants.'],
    ['SCORE', 'A numeric measure of creditworthiness.'],
    ['SHARE', 'A unit of ownership in a company.'],
    ['SHIFT', 'A change in market direction or strategy.'],
    ['SHOPS', 'Merchants that sell goods to buyers.'],
    ['SLICE', 'A portion carved from a split payment.'],
    ['SMART', 'Self-executing, as in a smart contract.'],
    ['SPEND', 'The total money paid out.'],
    ['STACK', 'The layered technology behind a product.'],
    ['STORE', 'A merchant\u2019s shopfront, physical or online.'],
    ['STOCK', 'A tradable share of company ownership.'],
    ['TERMS', 'The agreed conditions of a contract.'],
    ['TIERS', 'Ranked levels of pricing or status.'],
    ['TILLS', 'Cash drawers or point-of-sale registers.'],
    ['TOTAL', 'The full summed amount due.'],
    ['TOUCH', 'A contactless tap to pay.'],
    ['TRIAL', 'A free evaluation period for a service.'],
    ['TRUST', 'A fiduciary arrangement holding assets.'],
    ['UNITS', 'Countable quantities of a product sold.'],
    ['USAGE', 'Metered consumption billed to a customer.'],
    ['USERS', 'The accounts active on a platform.'],
    ['VALID', 'Passing all verification checks.'],
    ['VENUE', 'A marketplace or exchange for trading.'],
    ['WAGES', 'Regular payments made for labor.'],
    ['WORTH', 'The assessed value of an asset.'],
    ['ZEROS', 'The digits a reset balance falls to.'],
    ['DEBTS', 'Sums of money that are owed.'],
    ['EARNS', 'Generates income or interest.'],
    ['CENTS', 'Hundredths of a dollar.'],
    ['CHECK', 'A written order instructing a bank to pay.'],
    ['CLEAR', 'To settle and finalize a transaction.'],
    ['CLAIM', 'A formal demand for payment or refund.'],
    ['FIRMS', 'Registered business companies.'],
    ['FLOWS', 'The movements of cash in and out.'],
    ['SETUP', 'The initial configuration of an account.'],
    ['BOOKS', 'The accounting records of a business.'],
    ['CROSS', 'A currency pair not involving the dollar.'],
    ['DRAWS', 'Withdrawals taken against a credit line.'],
    ['FILES', 'Records or batches submitted for processing.'],
    ['GIROS', 'Bank transfers pushed from payer to payee.'],
    ['LEASE', 'A financed contract to use an asset.'],
    ['MINTS', 'Facilities that produce official currency.'],
    ['PACES', 'The rhythm at which volume grows.'],
    ['PARTY', 'A named participant in a transaction.'],
    ['SEALS', 'Cryptographic marks certifying authenticity.'],
    ['SPANS', 'The intervals a statement covers.'],
    ['TALLY', 'A running count of amounts owed.'],
    ['TAKEN', 'Captured, as an authorized amount.'],
    ['TAPES', 'Consolidated feeds of trade prices.'],
    ['THEFT', 'The unlawful taking of funds.'],
    ['TRACK', 'To monitor a shipment or payment status.'],
    ['UNTIE', 'To release funds held in escrow.'],
    ['VOIDS', 'Cancels a transaction before it settles.'],
    ['VOUCH', 'To guarantee or attest to a payment.'],
    ['WORKS', 'The operations that keep a system running.'],
    ['ZONES', 'Regions with distinct pricing or rules.']
  ];

  var WORDS = TERMS.map(function (t) { return t[0]; });
  var DEFS = {};
  for (var di = 0; di < TERMS.length; di++) DEFS[TERMS[di][0]] = TERMS[di][1];
  var VALID = {};
  for (var vi = 0; vi < WORDS.length; vi++) VALID[WORDS[vi]] = true;

  var KB_ROWS = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'DELETE']
  ];

  var WIN_QUIPS = {
    ace: ['FLAWLESS SETTLEMENT!', 'INSTANT SETTLEMENT!', 'ZERO LATENCY!'],
    great: ['CLEARED FAST!', 'BATCH SETTLED!', 'FUNDS CAPTURED!'],
    ok: ['TRANSACTION APPROVED!', 'PAYMENT CLEARED!', 'SETTLED IN TIME!']
  };

  /* ---- DOM refs -------------------------------------------------------- */
  var boardEl = document.getElementById('gameBoard');
  var statStreakEl = document.getElementById('statStreak');
  var statMaxEl = document.getElementById('statMax');
  var statGamesEl = document.getElementById('statGames');
  var statWinEl = document.getElementById('statWin');
  var overlayEl = document.getElementById('resultOverlay');
  var resultEyebrowEl = document.getElementById('resultEyebrow');
  var resultTitleEl = document.getElementById('resultTitle');
  var resultTextEl = document.getElementById('resultText');
  var resultTermEl = document.getElementById('resultTerm');
  var shareBtn = document.getElementById('shareBtn');
  var newGameBtn = document.getElementById('newGameBtn');
  var modeDailyBtn = document.getElementById('modeDaily');
  var modeFreeBtn = document.getElementById('modeFree');
  var hardToggleBtn = document.getElementById('hardToggle');
  var modeTagEl = document.getElementById('modeTag');
  var toastEl = document.getElementById('toast');

  /* ---- state ----------------------------------------------------------- */
  var targetWord = '';
  var currentGuess = '';
  var guesses = [];
  var gameState = 'PLAYING';       // PLAYING | WIN | LOSE
  var letterStates = {};
  var mode = 'daily';              // daily | free
  var hardMode = false;
  var revealing = false;
  var testReplay = false;          // test hook: bypass the once-per-day daily lock
  var toastTimer = 0;

  /* ---- stats (migrated shape, canonical store: dodo_wordle_stats) ------- */
  var STATS_KEY = 'dodo_wordle_stats';
  var hs = (J && J.highscore) ? J.highscore(SLUG, []) : null; // numeric: max streak

  function num(v, d) { var n = parseInt(v, 10); return isNaN(n) ? d : n; }

  function defaultStats() {
    return {
      games: 0, wins: 0, currentStreak: 0, maxStreak: 0,
      guessDist: [0, 0, 0, 0, 0, 0],
      lastDailyDay: null, lastDailyWon: false
    };
  }

  function loadStats() {
    var raw = null;
    try { raw = localStorage.getItem(STATS_KEY); } catch (e) { raw = null; }
    var base = defaultStats();
    if (raw != null) {
      var parsed = null;
      try { parsed = JSON.parse(raw); } catch (e) { parsed = null; }
      if (parsed && typeof parsed === 'object') {
        // Lossless migration: keep legacy {games,wins}; fill new fields.
        base.games = num(parsed.games, 0);
        base.wins = num(parsed.wins, 0);
        base.currentStreak = num(parsed.currentStreak, 0);
        base.maxStreak = num(parsed.maxStreak, 0);
        if (Array.isArray(parsed.guessDist) && parsed.guessDist.length === 6) {
          base.guessDist = parsed.guessDist.map(function (n) { return num(n, 0); });
        }
        base.lastDailyDay = (parsed.lastDailyDay == null) ? null : num(parsed.lastDailyDay, null);
        base.lastDailyWon = !!parsed.lastDailyWon;
      } else if (typeof parsed === 'number' && !isNaN(parsed)) {
        base.maxStreak = parsed; // tolerate a bare-number legacy seed
      }
    }
    return base;
  }

  var stats = loadStats();

  function persistStats() {
    try { localStorage.setItem(STATS_KEY, JSON.stringify(stats)); } catch (e) {}
    // Mirror max streak into the standard numeric highscore key.
    if (hs) hs.set(stats.maxStreak);
    else { try { localStorage.setItem('dodo_' + SLUG + '_highscore', String(stats.maxStreak)); } catch (e) {} }
  }
  // Write the highscore mirror once on boot so the standard key always exists
  // (also completes the one-time migration from a seeded legacy stats object).
  persistStats();

  function updateStatsUi() {
    var winRate = stats.games ? Math.round((stats.wins / stats.games) * 100) : 0;
    if (statStreakEl) statStreakEl.textContent = String(stats.currentStreak);
    if (statMaxEl) statMaxEl.textContent = String(stats.maxStreak);
    if (statGamesEl) statGamesEl.textContent = String(stats.games);
    if (statWinEl) statWinEl.textContent = String(winRate);
  }
  function popStat(el) {
    if (!el) return;
    el.classList.remove('da-score--pop');
    void el.offsetWidth;
    el.classList.add('da-score--pop');
  }

  /* ---- juice helpers --------------------------------------------------- */
  function play(cue, opts) { if (J && J.audio) J.audio.play(cue, opts); }
  function emit(preset, x, y, opts) { if (J && J.particles) J.particles.emit(preset, x, y, opts); }
  function shakeEl(el, intensity, ms) { if (J && J.shake && el) J.shake(el, intensity, ms); }
  function tileCenter(tile) {
    var r = tile.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }
  function floatAt(x, y, text, color) {
    if (J && J.floatText) J.floatText(x, y, text, { color: color || '#C1FF00', size: 22 });
  }
  function toast(msg, kind) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.className = 'da-toast' + (kind ? ' da-toast--' + kind : '');
    toastEl.hidden = false;
    toastEl.classList.remove('da-anim-slide');
    void toastEl.offsetWidth;
    toastEl.classList.add('da-anim-slide');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.hidden = true; }, 1800);
  }

  /* ---- daily seed (deterministic per local calendar day) --------------- */
  function todayIndex() {
    var n = new Date();
    var utcMidnight = Date.UTC(n.getFullYear(), n.getMonth(), n.getDate());
    return Math.floor(utcMidnight / 86400000);
  }
  function hashDay(day) {
    // xorshift-ish mix so consecutive days map to unrelated words.
    var h = (day ^ 0x9e3779b9) >>> 0;
    h = Math.imul(h ^ (h >>> 15), 0x85ebca6b) >>> 0;
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
    h ^= h >>> 16;
    return h >>> 0;
  }
  function dailyWord() { return WORDS[hashDay(todayIndex()) % WORDS.length]; }
  function randomWord() { return WORDS[(Math.random() * WORDS.length) | 0]; }

  /* ---- board / keyboard build ------------------------------------------ */
  function buildBoard() {
    boardEl.textContent = '';
    for (var row = 0; row < MAX_GUESSES; row += 1) {
      var rowEl = document.createElement('div');
      rowEl.className = 'guess-row row-' + row;
      for (var col = 0; col < WORD_LENGTH; col += 1) {
        var tile = document.createElement('div');
        tile.className = 'tile';
        rowEl.appendChild(tile);
      }
      boardEl.appendChild(rowEl);
    }
  }

  function buildKeyboard() {
    KB_ROWS.forEach(function (row, rowIdx) {
      var rowEl = document.getElementById('kb-row-' + rowIdx);
      if (!rowEl) return;
      rowEl.textContent = '';
      row.forEach(function (key) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = key === 'DELETE' ? '\u232B' : key;
        btn.dataset.key = key;
        btn.className = 'kb-key';
        if (key === 'ENTER' || key === 'DELETE') btn.classList.add('kb-wide');
        btn.addEventListener('click', function () { handleKey(key); });
        btn.addEventListener('touchstart', function (e) {
          e.preventDefault();
          handleKey(key);
        }, { passive: false });
        rowEl.appendChild(btn);
      });
    });
  }

  function keyEl(letter) { return document.querySelector('[data-key="' + letter + '"]'); }
  function popKey(letter) {
    var btn = keyEl(letter);
    if (!btn) return;
    btn.classList.remove('da-pop');
    void btn.offsetWidth;
    btn.classList.add('da-pop');
  }

  function updateCurrentRow() {
    var row = guesses.length;
    var tiles = document.querySelectorAll('.row-' + row + ' .tile');
    tiles.forEach(function (tile, i) {
      var ch = currentGuess[i] || '';
      tile.textContent = ch;
      tile.classList.toggle('filled', Boolean(ch));
    });
  }

  function shakeRow(row) {
    var rowEl = document.querySelector('.row-' + row);
    if (!rowEl) return;
    rowEl.classList.remove('da-anim-shake');
    void rowEl.offsetWidth;
    rowEl.classList.add('da-anim-shake');
    shakeEl(rowEl, 8, 260);
  }

  /* ---- scoring --------------------------------------------------------- */
  function evaluateGuess(guess, target) {
    var result = new Array(WORD_LENGTH);
    for (var r = 0; r < WORD_LENGTH; r++) result[r] = 'absent';
    var targetArr = target.split('');
    var guessArr = guess.split('');
    for (var i = 0; i < WORD_LENGTH; i += 1) {
      if (guessArr[i] === targetArr[i]) { result[i] = 'correct'; targetArr[i] = null; guessArr[i] = null; }
    }
    for (var k = 0; k < WORD_LENGTH; k += 1) {
      if (guessArr[k] === null) continue;
      var idx = targetArr.indexOf(guessArr[k]);
      if (idx !== -1) { result[k] = 'present'; targetArr[idx] = null; }
    }
    return result;
  }

  function updateKeyState(letter, state) {
    var btn = keyEl(letter);
    if (!btn) return;
    var priority = { correct: 3, present: 2, absent: 1 };
    var current = btn.dataset.state || '';
    if (!current || priority[state] > priority[current]) {
      btn.dataset.state = state;
      var isWide = btn.dataset.key === 'ENTER' || btn.dataset.key === 'DELETE';
      btn.className = 'kb-key';
      if (isWide) btn.classList.add('kb-wide');
      btn.classList.add(state);
      letterStates[letter] = state;
    }
  }

  /* Hard-mode: every revealed hint must be reused. Returns null if OK, else msg. */
  function hardModeViolation(guess) {
    if (!hardMode || guesses.length === 0) return null;
    var required = {}; // letter -> min count that must appear
    for (var g = 0; g < guesses.length; g++) {
      var res = evaluateGuess(guesses[g], targetWord);
      for (var i = 0; i < WORD_LENGTH; i++) {
        if (res[i] === 'correct' && guess[i] !== guesses[g][i]) {
          return 'Hard mode: ' + ordinal(i + 1) + ' letter must be ' + guesses[g][i] + '.';
        }
      }
      var seen = {};
      for (var j = 0; j < WORD_LENGTH; j++) {
        if (res[j] === 'present' || res[j] === 'correct') {
          seen[guesses[g][j]] = (seen[guesses[g][j]] || 0) + 1;
        }
      }
      for (var L in seen) if (!required[L] || seen[L] > required[L]) required[L] = seen[L];
    }
    for (var letter in required) {
      var count = 0;
      for (var c = 0; c < WORD_LENGTH; c++) if (guess[c] === letter) count++;
      if (count < required[letter]) return 'Hard mode: guess must contain ' + letter + '.';
    }
    return null;
  }
  function ordinal(n) { return n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : n + 'th'; }

  /* ---- reveal (CSS transition events, staggered — no setTimeout chains) - */
  function supportsTransitions() {
    return typeof document.documentElement.style.transition === 'string';
  }

  function revealRow(row, guess, results, onDone) {
    var tiles = document.querySelectorAll('.row-' + row + ' .tile');
    var reduced = !!(J && J.reducedMotion);

    if (reduced || !supportsTransitions()) {
      // Instant, event-free path (also used under prefers-reduced-motion).
      tiles.forEach(function (tile, i) { applyTileResult(tile, guess[i], results[i]); });
      if (onDone) onDone();
      return;
    }

    revealing = true;
    var done = 0;
    tiles.forEach(function (tile, i) {
      tile.style.transitionDelay = (i * STAGGER) + 'ms';
      var onDown = function (e) {
        if (e.propertyName !== 'transform') return;
        tile.removeEventListener('transitionend', onDown);
        applyTileResult(tile, guess[i], results[i]);
        var onUp = function (e2) {
          if (e2.propertyName !== 'transform') return;
          tile.removeEventListener('transitionend', onUp);
          tile.style.transitionDelay = '';
          done += 1;
          if (done === WORD_LENGTH) { revealing = false; if (onDone) onDone(); }
        };
        tile.addEventListener('transitionend', onUp);
        tile.classList.remove('flip-down');
      };
      tile.addEventListener('transitionend', onDown);
      requestAnimationFrame(function () { tile.classList.add('flip-down'); });
    });

    // Safety net: if a transitionend is ever dropped, finalize anyway.
    var guard = STAGGER * WORD_LENGTH + FLIP_MS * 2 + 400;
    setTimeout(function () {
      if (revealing) {
        revealing = false;
        tiles.forEach(function (tile, i) { applyTileResult(tile, guess[i], results[i]); tile.style.transitionDelay = ''; });
        if (onDone) onDone();
      }
    }, guard);
  }

  function applyTileResult(tile, letter, state) {
    if (tile.dataset.revealed === '1') return;
    tile.dataset.revealed = '1';
    tile.classList.remove('flip-down', 'filled');
    tile.classList.add('revealed', state);
    updateKeyState(letter, state);
    play('tick', { pitch: 1 + Math.random() * 0.1 });
    if (state === 'correct') play('score', { pitch: 1.35 });
    else if (state === 'present') play('score', { pitch: 1.1 });
    else play('fail', { pitch: 0.7, volume: 0.5 });
    if (state !== 'absent') {
      var c = tileCenter(tile);
      emit('burst', c.x, c.y, { count: state === 'correct' ? 10 : 6, color: state === 'correct' ? '#C1FF00' : '#FFB020' });
    }
  }

  /* ---- submit ---------------------------------------------------------- */
  function submitGuess() {
    if (gameState !== 'PLAYING' || revealing) return;
    var guess = currentGuess;
    if (guess.length < WORD_LENGTH) { shakeRow(guesses.length); play('fail'); toast('Not enough letters', 'danger'); return; }
    if (!VALID[guess]) { shakeRow(guesses.length); play('fail'); toast('Not in the payment dictionary', 'danger'); return; }
    var hv = hardModeViolation(guess);
    if (hv) { shakeRow(guesses.length); play('fail'); toast(hv, 'danger'); return; }

    var row = guesses.length;
    guesses.push(guess);
    currentGuess = '';
    var results = evaluateGuess(guess, targetWord);
    var won = guess === targetWord;
    var lost = !won && guesses.length >= MAX_GUESSES;

    // Terminal result is recorded SYNCHRONOUSLY (stats/streak/HUD/persistence/
    // analytics) so the visible streak updates immediately; the celebratory
    // overlay is shown after the tile reveal completes.
    if (won || lost) recordResult(won, guesses.length);

    revealRow(row, guess, results, function () {
      if (won) celebrateWin(guesses.length);
      else if (lost) revealLoss();
    });
  }

  function recordResult(won, guessCount) {
    gameState = won ? 'WIN' : 'LOSE';
    stats.games += 1;
    if (won) {
      stats.wins += 1;
      stats.currentStreak += 1;
      if (stats.currentStreak > stats.maxStreak) stats.maxStreak = stats.currentStreak;
      if (guessCount >= 1 && guessCount <= 6) stats.guessDist[guessCount - 1] += 1;
    } else {
      stats.currentStreak = 0;
    }
    if (mode === 'daily') { stats.lastDailyDay = todayIndex(); stats.lastDailyWon = won; }
    persistStats();
    updateStatsUi();
    popStat(statStreakEl);

    if (typeof DodoAnalytics !== 'undefined') {
      DodoAnalytics.gameOver(GAME_NAME, guessCount, { won: won, mode: mode, streak: stats.currentStreak });
      if (won) DodoAnalytics.newHighScore(GAME_NAME, stats.maxStreak);
    }
  }

  /* ---- end-of-game presentation --------------------------------------- */
  function tierFor(guessCount) {
    if (guessCount <= 2) return 'ace';
    if (guessCount <= 4) return 'great';
    return 'ok';
  }

  function celebrateWin(guessCount) {
    var tier = tierFor(guessCount);
    var cx = window.innerWidth / 2, cy = window.innerHeight * 0.32;
    play('win');
    if (J && J.haptics) J.haptics.success();
    if (tier === 'ace') {
      emit('confetti', cx, cy, { count: 60 });
      emit('confetti', cx * 0.5, cy, { count: 30 });
      emit('confetti', cx * 1.5, cy, { count: 30 });
      play('combo', { pitch: 1.5 });
    } else if (tier === 'great') {
      emit('confetti', cx, cy, { count: 34 });
      emit('burst', cx, cy, { count: 18, color: '#C1FF00' });
    } else {
      emit('sparkle', cx, cy, { count: 16, color: '#C1FF00' });
    }
    var quips = WIN_QUIPS[tier];
    floatAt(cx, cy, quips[(Math.random() * quips.length) | 0], '#C1FF00');
    showOverlay(true, guessCount, tier);
  }

  function revealLoss() {
    play('gameover');
    if (J && J.haptics) J.haptics.fail();
    shakeEl(boardEl, 10, 380);
    showOverlay(false, guesses.length, null);
  }

  function setTerm(word) {
    if (!resultTermEl) return;
    resultTermEl.textContent = '';
    var label = document.createElement('span');
    label.className = 'result-term__label';
    label.textContent = 'Today\u2019s term';
    var b = document.createElement('b');
    b.textContent = word;
    resultTermEl.appendChild(label);
    resultTermEl.appendChild(document.createTextNode(' '));
    resultTermEl.appendChild(b);
    resultTermEl.appendChild(document.createTextNode(' \u2014 ' + (DEFS[word] || 'a payment term.')));
  }

  function showOverlay(won, guessCount, tier) {
    if (resultEyebrowEl) resultEyebrowEl.textContent = won
      ? (tier === 'ace' ? 'Flawless' : 'Settled') : 'Batch Failed';
    if (resultTitleEl) resultTitleEl.textContent = won ? 'Payment API solved!' : 'Request failed!';
    if (resultTextEl) resultTextEl.textContent = won
      ? 'You cracked it in ' + guessCount + ' ' + (guessCount === 1 ? 'try' : 'tries') + '.'
      : 'Out of tries — better luck next batch.';
    setTerm(targetWord);
    if (shareBtn) shareBtn.textContent = 'Share Results';
    overlayEl.classList.remove('hidden');
    overlayEl.hidden = false;
  }

  function forceOverlayVisible() {
    // Instantly finalize any in-flight reveal and show the result overlay.
    if (revealing) {
      revealing = false;
      var row = guesses.length - 1;
      if (row >= 0) {
        var tiles = document.querySelectorAll('.row-' + row + ' .tile');
        var res = evaluateGuess(guesses[row], targetWord);
        tiles.forEach(function (tile, i) { applyTileResult(tile, guesses[row][i], res[i]); tile.style.transitionDelay = ''; });
      }
    }
    showOverlay(gameState === 'WIN', guesses.length, gameState === 'WIN' ? tierFor(guesses.length) : null);
  }

  /* ---- share ----------------------------------------------------------- */
  function getShareText() {
    var head = 'API Wordle Dodo ' + (mode === 'daily' ? '#' + todayIndex() + ' ' : '') +
      (gameState === 'WIN' ? guesses.length : 'X') + '/' + MAX_GUESSES;
    var lines = [head, ''];
    guesses.forEach(function (guess) {
      var results = evaluateGuess(guess, targetWord);
      lines.push(results.map(function (r) {
        return r === 'correct' ? '\uD83D\uDFE9' : r === 'present' ? '\uD83D\uDFE8' : '\u2B1B';
      }).join(''));
    });
    return lines.join('\n');
  }

  /* ---- input ----------------------------------------------------------- */
  function handleKey(key) {
    if (gameState !== 'PLAYING' || revealing) return;
    if (key === 'DELETE') {
      currentGuess = currentGuess.slice(0, -1);
      updateCurrentRow();
      play('tap', { pitch: 0.8, volume: 0.5 });
    } else if (key === 'ENTER') {
      submitGuess();
    } else if (/^[A-Z]$/.test(key) && currentGuess.length < WORD_LENGTH) {
      currentGuess += key;
      updateCurrentRow();
      popKey(key);
      play('tap');
    }
  }

  function resetKeyboardStates() {
    document.querySelectorAll('.kb-key').forEach(function (btn) {
      var isWide = btn.dataset.key === 'ENTER' || btn.dataset.key === 'DELETE';
      btn.className = 'kb-key';
      if (isWide) btn.classList.add('kb-wide');
      delete btn.dataset.state;
    });
  }

  /* ---- start / mode / restart ------------------------------------------ */
  function applyModeUi() {
    if (modeDailyBtn) {
      modeDailyBtn.classList.toggle('is-active', mode === 'daily');
      modeDailyBtn.setAttribute('aria-pressed', mode === 'daily' ? 'true' : 'false');
    }
    if (modeFreeBtn) {
      modeFreeBtn.classList.toggle('is-active', mode === 'free');
      modeFreeBtn.setAttribute('aria-pressed', mode === 'free' ? 'true' : 'false');
    }
    if (modeTagEl) modeTagEl.textContent = mode === 'daily' ? 'Daily \u00B7 #' + todayIndex() : 'Free Play';
  }

  function startGame(opts) {
    opts = opts || {};
    if (opts.mode) mode = opts.mode;

    // Daily streak-gap: a skipped day breaks the streak before this game counts.
    if (mode === 'daily' && stats.lastDailyDay != null) {
      var gap = todayIndex() - stats.lastDailyDay;
      if (gap > 1 && stats.currentStreak > 0) { stats.currentStreak = 0; persistStats(); }
    }

    if (opts.forcedWord) targetWord = opts.forcedWord;
    else if (mode === 'daily') targetWord = dailyWord();
    else targetWord = randomWord();

    currentGuess = '';
    guesses = [];
    gameState = 'PLAYING';
    letterStates = {};
    revealing = false;
    overlayEl.classList.add('hidden');
    overlayEl.hidden = true;

    buildBoard();
    resetKeyboardStates();
    applyModeUi();
    updateStatsUi();

    if (typeof DodoAnalytics !== 'undefined') DodoAnalytics.gameStart(GAME_NAME, mode);
  }

  function alreadyPlayedTodayDaily() {
    return mode === 'daily' && !testReplay && stats.lastDailyDay === todayIndex();
  }

  function switchMode(next) {
    if (next === mode) return;
    mode = next;
    play('tap');
    startGame({ mode: next });
    if (alreadyPlayedTodayDaily()) showDailyDoneState();
  }

  function showDailyDoneState() {
    // Daily already completed today — reveal the answer, invite Free Play.
    gameState = stats.lastDailyWon ? 'WIN' : 'LOSE';
    targetWord = dailyWord();
    if (resultEyebrowEl) resultEyebrowEl.textContent = 'Come back tomorrow';
    if (resultTitleEl) resultTitleEl.textContent = stats.lastDailyWon ? 'Daily solved!' : 'Daily done';
    if (resultTextEl) resultTextEl.textContent = 'You already played today\u2019s daily. Try Free Play for more.';
    setTerm(targetWord);
    overlayEl.classList.remove('hidden');
    overlayEl.hidden = false;
  }

  /* ---- events ---------------------------------------------------------- */
  if (shareBtn) {
    shareBtn.addEventListener('click', function () {
      play('tap');
      var text = getShareText();
      if (typeof DodoAnalytics !== 'undefined') DodoAnalytics.shareScore(GAME_NAME, 'clipboard');
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () {
          shareBtn.textContent = 'Copied! \u2713';
          setTimeout(function () { shareBtn.textContent = 'Share Results'; }, 2000);
        }).catch(function () { toast('Copy failed', 'danger'); });
      } else {
        toast('Clipboard unavailable', 'danger');
      }
    });
  }

  if (newGameBtn) {
    newGameBtn.addEventListener('click', function () {
      play('tap');
      // After a daily is finished, "New Game" continues in Free Play.
      var next = (mode === 'daily' && !testReplay) ? 'free' : mode;
      startGame({ mode: next });
    });
  }

  // Controls blur after activation so the physical Enter/Space keys always
  // belong to guessing (not the last-focused button).
  if (modeDailyBtn) modeDailyBtn.addEventListener('click', function () { switchMode('daily'); modeDailyBtn.blur(); });
  if (modeFreeBtn) modeFreeBtn.addEventListener('click', function () { switchMode('free'); modeFreeBtn.blur(); });
  if (hardToggleBtn) {
    hardToggleBtn.addEventListener('click', function () {
      hardToggleBtn.blur();
      // Hard mode can only be changed before the first guess of a round.
      if (guesses.length > 0 && gameState === 'PLAYING') { toast('Hard mode locks after your first guess', 'danger'); play('fail'); return; }
      hardMode = !hardMode;
      hardToggleBtn.setAttribute('aria-pressed', hardMode ? 'true' : 'false');
      hardToggleBtn.classList.toggle('is-active', hardMode);
      play(hardMode ? 'score' : 'tap');
      toast(hardMode ? 'Hard mode ON \u2014 hints must be reused' : 'Hard mode off');
    });
  }

  document.addEventListener('keydown', function (e) {
    if (gameState !== 'PLAYING' || revealing) return;
    if (e.key === 'Enter') handleKey('ENTER');
    else if (e.key === 'Backspace') handleKey('DELETE');
    else if (/^[a-zA-Z]$/.test(e.key)) handleKey(e.key.toUpperCase());
  });

  /* ---- juice bootstrapping --------------------------------------------- */
  if (J && J.particles && J.particles.overlay) J.particles.overlay();
  if (J && J.muteButton) J.muteButton(document.body);

  /* ---- test hooks (test-only; shipped gameplay never calls these) ------ */
  window.ApiWordleTest = {
    // Deterministic replayable start with a KNOWN word (default AUDIT).
    start: function (word) {
      testReplay = true;
      hardMode = false;
      if (hardToggleBtn) { hardToggleBtn.setAttribute('aria-pressed', 'false'); hardToggleBtn.classList.remove('is-active'); }
      startGame({ mode: 'daily', forcedWord: (word || 'AUDIT').toUpperCase() });
    },
    // Submit the exact target → real win path (visible streak increments).
    scorePoint: function () {
      if (gameState !== 'PLAYING') return;
      currentGuess = targetWord;
      updateCurrentRow();
      submitGuess();
    },
    // Real end flow: ensure the game-over overlay is shown (force a loss if still playing).
    toGameOver: function () {
      if (gameState === 'PLAYING') {
        recordResult(false, MAX_GUESSES);
        gameState = 'LOSE';
      }
      forceOverlayVisible();
    },
    // 8s scripted loop firing {tap, tick, score, fail}; never win/gameover.
    beginScriptedPlay: function () {
      testReplay = true;
      hardMode = false;
      startGame({ mode: 'free', forcedWord: 'AUDIT' });
    },
    scriptedStep: function (n) {
      if (gameState !== 'PLAYING') this.beginScriptedPlay();
      // Reset before the last row so we never hit a win/lose terminal state.
      if (guesses.length >= MAX_GUESSES - 2) this.beginScriptedPlay();
      if (revealing) return;
      if (n % 3 === 0) {
        // valid, non-target partial guess -> reveal fires tick + score + fail
        // (+ burst particles per present/correct tile).
        currentGuess = (targetWord === 'TRADE') ? 'PRICE' : 'TRADE';
        updateCurrentRow();
        submitGuess();
      } else {
        // typing (tap) + an invalid word (fail + shake) + backspace.
        ['Q', 'Z', 'X', 'W', 'K'].forEach(function (ch) { handleKey(ch); });
        submitGuess(); // 'QZXWK' is not in the dictionary -> fail + shake
        currentGuess = '';
        updateCurrentRow();
      }
    },
    // Tap on-screen keyboard keys via synthetic touch, then submit — drives the
    // core verb (guessing) with reveals/particles so the mobile clip has motion.
    _tapKey: function (ch) {
      var btn = keyEl(ch);
      if (!btn) { handleKey(ch); return; }
      try {
        var r = btn.getBoundingClientRect();
        var t = new Touch({ identifier: 1, target: btn, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 });
        btn.dispatchEvent(new TouchEvent('touchstart', { touches: [t], changedTouches: [t], bubbles: true, cancelable: true }));
      } catch (e) { handleKey(ch); }
    },
    touchScript: function () {
      if (gameState !== 'PLAYING') this.beginScriptedPlay();
      if (guesses.length >= MAX_GUESSES - 2) this.beginScriptedPlay();
      if (revealing) return;
      var word = (targetWord === 'TRADE') ? 'PRICE' : 'TRADE';
      var self = this;
      word.split('').forEach(function (ch) { self._tapKey(ch); });
      self._tapKey('ENTER');
    },
    getState: function () { return gameState; },
    getStreak: function () { return stats.currentStreak; },
    getTarget: function () { return targetWord; },
    isBusy: function () { return revealing; },
    setMode: function (m) { startGame({ mode: m }); }
  };

  /* ---- boot ------------------------------------------------------------ */
  buildKeyboard();
  updateStatsUi();
  startGame({ mode: 'daily' });
  if (alreadyPlayedTodayDaily()) showDailyDoneState();
})();
