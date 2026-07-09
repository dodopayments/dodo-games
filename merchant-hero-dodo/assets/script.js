/* ==========================================================================
 * MERCHANT HERO — side-scrolling space shooter with named waves, intermission
 * upgrade picks, enemy attack patterns, telegraphed mini-bosses, no-damage
 * combo scoring, and full DodoJuice game-feel. Vanilla JS, DPI-aware canvas.
 * Analytics via bare DodoAnalytics (game_name frozen "Merchant Hero").
 * Highscore via DodoJuice.highscore('merchant-hero-dodo', ['dodoHighscore']).
 * ========================================================================== */
(function () {
  'use strict';

  var GAME_NAME = 'Merchant Hero';
  var HAS_JUICE = typeof window.DodoJuice !== 'undefined';
  var J = HAS_JUICE ? window.DodoJuice : null;

  /* ---- tuning --------------------------------------------------------- */
  var BASE_FIRE_CD = 0.30;      // seconds between shots (before firerate upg)
  var SHIELD_COST = 50;
  var INVULN_TIME = 0.9;

  var WAVE_NAMES = [
    'Chargeback Skirmish', 'Bug Swarm', 'Phantom Flotilla', 'Mixed Threats',
    'Fraud Armada', 'Drone Blitz', 'Chargeback Storm', 'Deep Space Audit'
  ];
  var BOSS_NAMES = [
    'Chargeback Titan', 'Fraud Overlord', 'Botnet Leviathan', 'Downtime Kraken'
  ];

  var UPGRADES = [
    { key: 'firerate', abbr: 'IS', name: 'Instant Settlement', color: '#C1FF00', desc: 'Faster fire rate — settle threats the instant they appear.' },
    { key: 'spread', abbr: 'MC', name: 'Multi-Currency', color: '#4DA3FF', desc: 'Add an extra spread bolt to every shot you fire.' },
    { key: 'shield', abbr: 'PV', name: 'PCI Vault', color: '#B026FF', desc: 'Bigger, longer-lasting KYC shield capacity.' }
  ];
  var UPG_MAP = {};
  UPGRADES.forEach(function (u) { UPG_MAP[u.key] = u; });

  var KILL_QUIPS = [
    'Fraudster vaporized!', 'Chargeback denied!', 'Clean flow!',
    'Payment authorized!', 'KYC compliant!', 'Uptime stable!'
  ];

  /* ---- DOM ------------------------------------------------------------ */
  var canvas = document.getElementById('gameCanvas');
  var ctx = canvas.getContext('2d');
  var shell = document.getElementById('mhShell');
  var hud = document.getElementById('hud');
  var startScreen = document.getElementById('start-screen');
  var intermission = document.getElementById('intermission');
  var pauseScreen = document.getElementById('pauseScreen');
  var gameOverScreen = document.getElementById('game-over-screen');

  var startBtn = document.getElementById('start-btn');
  var restartBtn = document.getElementById('restart-btn');
  var resumeBtn = document.getElementById('resume-btn');
  var quitBtn = document.getElementById('quit-btn');
  var shieldBtn = document.getElementById('shieldBtn');
  var fireBtn = document.getElementById('fireBtn');
  var touchControls = document.getElementById('touchControls');

  var scoreDisplay = document.getElementById('score-display');
  var waveDisplay = document.getElementById('wave-display');
  var waveNameEl = document.getElementById('wave-name');
  var comboBadge = document.getElementById('comboBadge');
  var integrityBar = document.getElementById('integrity-bar');
  var shieldBar = document.getElementById('shield-bar');
  var bossBar = document.getElementById('bossBar');
  var bossName = document.getElementById('boss-name');
  var bossFill = document.getElementById('boss-fill');
  var intermissionEyebrow = document.getElementById('intermissionEyebrow');
  var upgradeChoices = document.getElementById('upgradeChoices');

  var waveIntro = document.getElementById('waveIntro');
  var waveIntroEyebrow = document.getElementById('waveIntroEyebrow');
  var waveIntroName = document.getElementById('waveIntroName');

  var finalScoreEl = document.getElementById('final-score');
  var highScoreEl = document.getElementById('high-score');
  var finalWaveEl = document.getElementById('final-wave');
  var finalComboEl = document.getElementById('final-combo');

  /* ---- state ---------------------------------------------------------- */
  var W = 0, H = 0;
  var gameState = 'START';       // START | PLAYING | INTERMISSION | PAUSED | GAME_OVER
  var testEndless = false;       // test-only: never auto-clear wave / never game over

  var score = 0, wave = 0;
  var integrity = 100;
  var shield = 100, shieldActive = false, shieldTimer = 0;
  var combo = 1, bestCombo = 1, tookDamageThisWave = false;
  var invuln = 0;
  var upg = { firerate: 0, spread: 0, shield: 0 };
  var autoFire = false;

  var player = null;
  var bullets = [];
  var enemies = [];
  var enemyBullets = [];
  var boss = null;

  var spawnRemaining = 0, spawnClock = 0, spawnGap = 0.9;
  var fireClock = 0;
  var frameCount = 0;
  var lastTs = 0;
  var introTimer = 0;

  /* nebula parallax layers */
  var starLayers = [];
  var nebulaClouds = [];

  var hs = null, best = 0;

  /* ---- highscore (with legacy migration) ------------------------------ */
  if (J && J.highscore) {
    hs = J.highscore('merchant-hero-dodo', ['dodoHighscore']);
    best = hs.best;
  } else {
    best = parseInt(localStorage.getItem('dodo_merchant-hero-dodo_highscore') ||
      localStorage.getItem('dodoHighscore') || '0', 10) || 0;
  }

  /* ---- helpers -------------------------------------------------------- */
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function fmt(n) { return Math.round(n).toLocaleString('en-US'); }
  function play(cue, opts) { if (J && J.audio) J.audio.play(cue, opts); }
  function emit(preset, x, y, opts) { if (J && J.particles) J.particles.emit(preset, x, y, opts); }
  function shake(intensity, ms) { if (J) J.shake(canvas, intensity, ms); }

  function cssPoint(lx, ly) {
    var r = canvas.getBoundingClientRect();
    var sx = W ? r.width / W : 1;
    var sy = H ? r.height / H : 1;
    return { x: r.left + lx * sx, y: r.top + ly * sy };
  }
  function floatQuip(lx, ly, text, color) {
    if (!J || !J.floatText) return;
    var p = cssPoint(lx, ly);
    J.floatText(p.x, p.y, text, { color: color || '#C1FF00', size: 18 });
  }

  /* ---- derived upgrade values ---------------------------------------- */
  function fireCooldown() { return Math.max(0.08, BASE_FIRE_CD * Math.pow(0.82, upg.firerate)); }
  function spreadCount() { return 1 + upg.spread; }
  function shieldMax() { return 100 + upg.shield * 40; }
  function shieldRegen() { return 14 + upg.shield * 6; }
  function shieldDuration() { return 2.4 + upg.shield * 0.7; }

  /* ---- DPI-aware sizing ---------------------------------------------- */
  function resize() {
    var dpr = window.devicePixelRatio || 1;
    var cssW = Math.max(240, Math.floor(shell.clientWidth || window.innerWidth));
    var cssH = Math.max(320, Math.floor(shell.clientHeight || window.innerHeight));
    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    W = cssW; H = cssH;
    initStarfield();
    if (player) {
      player.x = clamp(player.x, player.w * 0.4, W * 0.62);
      player.y = clamp(player.y, 0, H - player.h);
    }
  }

  function initStarfield() {
    starLayers = [];
    var defs = [
      { count: Math.round(W * H / 14000), speed: 16, min: 0.5, max: 1.1, alpha: 0.4 },
      { count: Math.round(W * H / 22000), speed: 42, min: 0.9, max: 1.8, alpha: 0.6 },
      { count: Math.round(W * H / 40000), speed: 88, min: 1.2, max: 2.6, alpha: 0.85 }
    ];
    for (var d = 0; d < defs.length; d++) {
      var arr = [];
      var n = clamp(defs[d].count, 8, 90);
      for (var i = 0; i < n; i++) {
        arr.push({ x: Math.random() * W, y: Math.random() * H, s: rnd(defs[d].min, defs[d].max), code: Math.random() > 0.92 });
      }
      starLayers.push({ stars: arr, speed: defs[d].speed, alpha: defs[d].alpha });
    }
    nebulaClouds = [];
    var palette = ['rgba(176,38,255,0.14)', 'rgba(77,163,255,0.12)', 'rgba(193,255,0,0.07)'];
    for (var c = 0; c < 3; c++) {
      nebulaClouds.push({
        x: rnd(0, W), y: rnd(0, H), r: rnd(Math.min(W, H) * 0.35, Math.min(W, H) * 0.7),
        speed: rnd(6, 16), color: palette[c % palette.length]
      });
    }
  }

  function updateNebula(dt) {
    for (var l = 0; l < starLayers.length; l++) {
      var L = starLayers[l];
      for (var i = 0; i < L.stars.length; i++) {
        var st = L.stars[i];
        st.x -= L.speed * dt;
        if (st.x < -4) { st.x = W + 4; st.y = Math.random() * H; }
      }
    }
    for (var c = 0; c < nebulaClouds.length; c++) {
      var cl = nebulaClouds[c];
      cl.x -= cl.speed * dt;
      if (cl.x + cl.r < 0) { cl.x = W + cl.r; cl.y = rnd(0, H); }
    }
  }

  /* ---- entities ------------------------------------------------------- */
  function makePlayer() {
    var s = clamp(Math.min(W, H) * 0.085, 24, 56);
    return { x: W * 0.14, y: H * 0.5, w: s, h: s * 0.66, aimX: W * 0.14, aimY: H * 0.5 };
  }

  function e_top() { return H * 0.06; }

  function makeEnemy(type, pattern, y) {
    var base = Math.min(W, H);
    var e = { type: type, pattern: pattern, x: W + 60, y: y, baseY: y, t: 0, flash: 0, dead: false };
    var diffVX = 0.02 * wave;
    if (type === 'comet') {
      e.w = clamp(base * 0.06, 22, 46); e.h = e.w; e.color = '#FF4757'; e.hp = 1; e.scoreVal = 120;
      e.vx = -(0.26 + diffVX) * W; e.freq = rnd(3, 5); e.amp = H * 0.06; e.dmg = 22;
    } else if (type === 'phantom') {
      e.w = clamp(base * 0.07, 26, 52); e.h = e.w; e.color = '#B026FF'; e.hp = 3; e.maxHp = 3; e.scoreVal = 300;
      e.vx = -(0.16 + diffVX * 0.6) * W; e.freq = rnd(2, 3.5); e.amp = H * 0.05; e.dmg = 28;
    } else {
      e.w = clamp(base * 0.05, 18, 40); e.h = e.w; e.color = '#FFD23F'; e.hp = 1; e.scoreVal = 60;
      e.vx = -(0.2 + diffVX) * W; e.freq = rnd(4, 7); e.amp = H * 0.08; e.dmg = 16;
    }
    e.maxHp = e.maxHp || e.hp;
    return e;
  }

  function spawnEnemy(type, pattern, y) {
    var e = makeEnemy(type, pattern, clamp(y, e_top(), H - 40));
    enemies.push(e);
    return e;
  }

  /* ---- waves ---------------------------------------------------------- */
  function getWaveMeta(n) {
    var isBoss = n % 5 === 0 && n > 0;
    var name = isBoss
      ? BOSS_NAMES[(Math.floor(n / 5) - 1 + BOSS_NAMES.length) % BOSS_NAMES.length]
      : WAVE_NAMES[(n - 1 + WAVE_NAMES.length) % WAVE_NAMES.length];
    return { isBoss: isBoss, name: name };
  }
  function getWaveLabel(n) {
    var m = getWaveMeta(n);
    return m.isBoss ? ('Wave ' + n + ' — Mini-Boss: ' + m.name) : ('Wave ' + n + ' — ' + m.name);
  }

  function choosePattern(n) {
    if (n === 3) return { type: 'phantom', pattern: 'dive' }; // Phantom Flotilla
    var roll = Math.random();
    var type = roll < 0.5 ? 'comet' : (roll < 0.8 ? 'drone' : 'phantom');
    var pool = type === 'phantom' ? ['dive', 'sine'] : (type === 'drone' ? ['sine', 'formation'] : ['straight', 'sine']);
    var pattern = pool[(Math.random() * pool.length) | 0];
    if (n >= 4 && Math.random() < 0.25) pattern = 'formation';
    return { type: type, pattern: pattern };
  }

  function setupNormalWave(n) {
    spawnRemaining = Math.min(6 + n * 2, 26);
    spawnGap = Math.max(0.35, 1.0 - n * 0.05);
    spawnClock = 0.45;
  }

  function updateSpawns(dt) {
    if (spawnRemaining <= 0) return;
    spawnClock -= dt;
    if (spawnClock > 0) return;
    spawnClock = spawnGap;
    var pick = choosePattern(wave);
    if (pick.pattern === 'formation') {
      var gy = rnd(H * 0.25, H * 0.75);
      var k = Math.min(3, spawnRemaining);
      for (var i = 0; i < k; i++) spawnEnemy(pick.type, 'formation', clamp(gy + (i - 1) * H * 0.13, e_top(), H - 40));
      spawnRemaining -= k;
    } else {
      spawnEnemy(pick.type, pick.pattern, rnd(H * 0.12, H * 0.86));
      spawnRemaining -= 1;
    }
  }

  function startWave(n) {
    wave = n;
    var meta = getWaveMeta(n);
    enemies = []; enemyBullets = [];
    tookDamageThisWave = false;
    gameState = 'PLAYING';
    setScreen('PLAYING');
    showWaveIntro(n, meta);
    if (meta.isBoss) startBoss(n);
    else { boss = null; bossBar.hidden = true; setupNormalWave(n); }
    updateHUD();
  }

  function startNextWave() { startWave(wave + 1); }

  function awardWaveClear() {
    var noDmg = !tookDamageThisWave;
    if (noDmg) combo = Math.min(combo + 1, 9);
    if (combo > bestCombo) bestCombo = combo;
    var bonus = Math.round(250 * wave * (noDmg ? combo : 1));
    score += bonus;
    play('combo', { pitch: 1 + Math.min(combo, 6) * 0.05 });
    if (player) emit('confetti', player.x, H * 0.4, { count: 26 });
    if (J && J.haptics) J.haptics.success();
    if (typeof DodoAnalytics !== 'undefined') DodoAnalytics.waveComplete(GAME_NAME, wave);
    floatQuip(W * 0.5, H * 0.4, noDmg ? ('FLAWLESS ×' + combo + '  +$' + fmt(bonus)) : ('WAVE CLEARED  +$' + fmt(bonus)), '#C1FF00');
    tookDamageThisWave = false;
    updateHUD();
  }

  function onWaveCleared() {
    awardWaveClear();
    enterIntermission();
  }

  function enterIntermission() {
    gameState = 'INTERMISSION';
    intermissionEyebrow.textContent = 'Wave ' + wave + ' Cleared';
    renderUpgradeChoices();
    setScreen('INTERMISSION');
  }

  function hexToSoft(hex) {
    var h = hex.replace('#', '');
    var r = parseInt(h.substring(0, 2), 16), g = parseInt(h.substring(2, 4), 16), b = parseInt(h.substring(4, 6), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',0.16)';
  }

  function renderUpgradeChoices() {
    while (upgradeChoices.firstChild) upgradeChoices.removeChild(upgradeChoices.firstChild);
    UPGRADES.forEach(function (u) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'mh-upg';

      var icon = document.createElement('span');
      icon.className = 'mh-upg__icon';
      icon.style.color = u.color;
      icon.style.background = hexToSoft(u.color);
      icon.textContent = u.abbr;

      var name = document.createElement('span');
      name.className = 'mh-upg__name';
      name.textContent = u.name;

      var desc = document.createElement('span');
      desc.className = 'mh-upg__desc';
      desc.textContent = u.desc;

      var lvl = document.createElement('span');
      lvl.className = 'mh-upg__lvl';
      lvl.textContent = 'Level ' + upg[u.key] + ' \u2192 ' + (upg[u.key] + 1);

      btn.appendChild(icon);
      btn.appendChild(name);
      btn.appendChild(desc);
      btn.appendChild(lvl);
      btn.addEventListener('click', function () { chooseUpgrade(u.key); });
      upgradeChoices.appendChild(btn);
    });
  }

  function chooseUpgrade(key) {
    applyUpgrade(key);
    startNextWave();
  }

  function applyUpgrade(key) {
    if (!UPG_MAP[key]) key = 'firerate';
    upg[key] = Math.min(upg[key] + 1, 6);
    var def = UPG_MAP[key];
    play('powerup');
    if (player) { emit('sparkle', player.x, player.y, { count: 18, color: def.color }); emit('burst', player.x, player.y, { count: 14, color: def.color }); }
    if (J && J.flash) J.flash(canvas, def.color, 180);
    if (J && J.haptics) J.haptics.success();
    if (key === 'shield') shield = shieldMax();
    if (typeof DodoAnalytics !== 'undefined') DodoAnalytics.powerUp(GAME_NAME, def.name);
    updateHUD();
  }

  function showWaveIntro(n, meta) {
    waveIntroEyebrow.textContent = meta.isBoss ? 'MINI-BOSS' : ('Wave ' + n);
    waveIntroName.textContent = meta.name;
    waveIntro.hidden = false;
    waveIntro.classList.remove('mh-intro--show');
    void waveIntro.offsetWidth;
    waveIntro.classList.add('mh-intro--show');
    if (introTimer) clearTimeout(introTimer);
    introTimer = setTimeout(function () { waveIntro.hidden = true; }, 1700);
  }

  /* ---- firing / shield ------------------------------------------------ */
  function handleFiring(dt) {
    fireClock -= dt;
    var want = keys.fire || autoFire;
    if (want && fireClock <= 0 && player) { fireBullet(); fireClock = fireCooldown(); }
  }

  function fireBullet() {
    if (!player) return;
    var n = spreadCount();
    var bx = player.x + player.w * 0.55, by = player.y;
    var sp = 1.15 * W;
    var r = Math.max(3, player.w * 0.1);
    for (var i = 0; i < n; i++) {
      var ang = (i - (n - 1) / 2) * 0.12;
      bullets.push({ x: bx, y: by, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, r: r, dead: false });
    }
    play('tap', { pitch: rnd(0.94, 1.14) });
    emit('sparkle', bx, by, { count: 2, color: '#FFD23F' });
  }

  function activateShield() {
    if (shield >= SHIELD_COST && !shieldActive) {
      shieldActive = true;
      shieldTimer = shieldDuration();
      shield -= SHIELD_COST;
      play('whoosh');
      if (player) emit('sparkle', player.x, player.y, { count: 16, color: '#4DA3FF' });
      if (J && J.flash) J.flash(canvas, '#4DA3FF', 140);
      if (J && J.haptics) J.haptics.tap();
      shieldBtn.classList.add('is-active');
      updateHUD();
      return true;
    }
    return false;
  }

  function updateShield(dt) {
    if (shieldActive) {
      shieldTimer -= dt;
      if (shieldTimer <= 0) { shieldActive = false; shieldBtn.classList.remove('is-active'); shieldShatter(); }
    } else if (shield < shieldMax()) {
      shield = Math.min(shieldMax(), shield + shieldRegen() * dt);
    }
  }

  function shieldShatter() {
    if (player) emit('explosion', player.x, player.y, { count: 18, color: '#4DA3FF' });
    shake(7, 200);
    play('whoosh', { pitch: 0.78 });
    if (J && J.haptics) J.haptics.tap();
  }

  /* ---- scoring / damage ---------------------------------------------- */
  function addScore(base, lx, ly) {
    var gain = Math.round(base * combo);
    score += gain;
    floatQuip(lx, ly, '+$' + fmt(gain), '#C1FF00');
    popScore();
    updateHUD();
  }

  function destroyEnemy(e, byPlayer) {
    if (e.dead) return;
    e.dead = true;
    emit('explosion', e.x, e.y, { count: 18, color: e.color });
    shake(clamp(4 + e.scoreVal * 0.01, 4, 10), 200);
    play('score');
    if (byPlayer && Math.random() < 0.35) floatQuip(e.x, e.y - e.h, KILL_QUIPS[(Math.random() * KILL_QUIPS.length) | 0], '#8ef442');
    addScore(e.scoreVal, e.x, e.y);
    if (J && J.haptics) J.haptics.tap();
  }

  function damagePlayer(amount) {
    if (invuln > 0 || gameState !== 'PLAYING') return;
    integrity -= amount;
    if (combo !== 1) combo = 1;
    tookDamageThisWave = true;
    play('fail');
    if (J && J.flash) J.flash(canvas, '#FF4757', 200);
    shake(12, 320);
    if (player) emit('burst', player.x, player.y, { count: 12, color: '#FF4757' });
    if (J && J.haptics) J.haptics.fail();
    invuln = INVULN_TIME;
    if (integrity <= 0) {
      if (!testEndless) { integrity = 0; updateHUD(); gameOver(); return; }
      integrity = 15;
    }
    updateHUD();
  }

  function absorbHit(e) {
    e.dead = true;
    emit('sparkle', e.x, e.y, { count: 10, color: '#4DA3FF' });
    play('whoosh', { volume: 0.5, pitch: 1.1 });
    shake(5, 140);
    addScore(Math.round(e.scoreVal * 0.5), e.x, e.y);
  }

  /* ---- update loop ---------------------------------------------------- */
  function update(dt) {
    updateNebula(dt);
    if (gameState !== 'PLAYING') return;
    frameCount++;

    handleFiring(dt);
    updatePlayer(dt);
    if (player) emit('trail', player.x - player.w * 0.55, player.y, { count: 2, color: '#4DA3FF' });
    updateShield(dt);

    if (boss) updateBoss(dt); else updateSpawns(dt);
    updateEnemies(dt);
    updateBullets(dt);
    updateEnemyBullets(dt);
    handleCollisions();

    if (invuln > 0) invuln -= dt;

    enemies = enemies.filter(function (e) { return !e.dead; });
    bullets = bullets.filter(function (b) { return !b.dead; });
    enemyBullets = enemyBullets.filter(function (b) { return !b.dead; });

    if (!boss) {
      if (!testEndless) {
        if (spawnRemaining <= 0 && enemies.length === 0) onWaveCleared();
      } else if (spawnRemaining <= 0) {
        spawnRemaining = 8;
      }
    }
    updateHUD();
  }

  function updatePlayer(dt) {
    if (!player) return;
    if (pointerActive) {
      var k = Math.min(1, dt * 16);
      player.x += (player.aimX - player.x) * k;
      player.y += (player.aimY - player.y) * k;
    } else {
      var vx = 0.72 * W * dt, vy = 0.9 * H * dt;
      if (keys.left) player.x -= vx;
      if (keys.right) player.x += vx;
      if (keys.up) player.y -= vy;
      if (keys.down) player.y += vy;
    }
    player.x = clamp(player.x, player.w * 0.4, W * 0.62);
    player.y = clamp(player.y, 0, H - player.h);
  }

  function updateEnemies(dt) {
    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      e.t += dt;
      e.x += e.vx * dt;
      if (e.pattern === 'sine' || e.pattern === 'formation') {
        e.y = e.baseY + Math.sin(e.t * e.freq) * e.amp;
      } else if (e.pattern === 'dive' && player) {
        e.y += (player.y - e.y) * Math.min(1, dt * 1.4);
      }
      e.y = clamp(e.y, 0, H - e.h);
      if (e.flash > 0) e.flash -= dt;
      if (e.x < -80) e.dead = true;
    }
  }

  function updateBullets(dt) {
    for (var i = 0; i < bullets.length; i++) {
      var b = bullets[i];
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.x > W + 30 || b.y < -30 || b.y > H + 30) b.dead = true;
    }
  }

  function updateEnemyBullets(dt) {
    for (var i = 0; i < enemyBullets.length; i++) {
      var b = enemyBullets[i];
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.x < -30 || b.y < -30 || b.y > H + 30) b.dead = true;
    }
  }

  function handleCollisions() {
    var i, j;
    for (i = 0; i < bullets.length; i++) {
      var b = bullets[i];
      if (b.dead) continue;
      for (j = 0; j < enemies.length; j++) {
        var e = enemies[j];
        if (e.dead) continue;
        if (Math.abs(b.x - e.x) < e.w * 0.5 + b.r && Math.abs(b.y - e.y) < e.h * 0.5 + b.r) {
          b.dead = true; e.hp--; e.flash = 0.12;
          play('hit', { pitch: rnd(0.95, 1.1) });
          emit('burst', b.x, b.y, { count: 6, color: '#ffffff' });
          if (e.hp <= 0) destroyEnemy(e, true);
          break;
        }
      }
      if (b.dead) continue;
      if (boss && boss.entered && Math.abs(b.x - boss.x) < boss.w * 0.5 + b.r && Math.abs(b.y - boss.y) < boss.h * 0.5 + b.r) {
        b.dead = true; boss.hp--; boss.flash = 0.1;
        play('hit', { pitch: rnd(0.9, 1.05) });
        emit('burst', b.x, b.y, { count: 7, color: '#ffffff' });
        if (boss.hp <= 0) defeatBoss();
      }
    }
    if (!player) return;
    for (j = 0; j < enemies.length; j++) {
      var en = enemies[j];
      if (en.dead) continue;
      if (Math.abs(en.x - player.x) < en.w * 0.5 + player.w * 0.5 && Math.abs(en.y - player.y) < en.h * 0.5 + player.h * 0.5) {
        if (shieldActive) { absorbHit(en); }
        else { en.dead = true; emit('explosion', player.x, player.y, { count: 14, color: '#FF4757' }); damagePlayer(en.dmg); }
      }
    }
    for (i = 0; i < enemyBullets.length; i++) {
      var eb = enemyBullets[i];
      if (eb.dead) continue;
      if (Math.abs(eb.x - player.x) < eb.r + player.w * 0.5 && Math.abs(eb.y - player.y) < eb.r + player.h * 0.5) {
        if (shieldActive) { eb.dead = true; emit('sparkle', eb.x, eb.y, { count: 8, color: '#4DA3FF' }); play('whoosh', { volume: 0.4 }); }
        else { eb.dead = true; damagePlayer(eb.dmg); }
      }
    }
  }

  /* ---- boss ----------------------------------------------------------- */
  function startBoss(n) {
    var sz = clamp(Math.min(W, H) * 0.18, 60, 170);
    boss = {
      x: W + 100, y: H * 0.5, w: sz, h: sz, tgt: W * 0.74,
      hp: 60 + n * 14, maxHp: 60 + n * 14, t: 0, entered: false,
      telegraph: 0, attackClock: 2.4, flash: 0
    };
    var m = getWaveMeta(n);
    bossName.textContent = 'Mini-Boss — ' + m.name;
    bossBar.hidden = false;
    updateBossBar();
    play('gameover', { pitch: 1.4, volume: 0.5 });
  }

  function updateBoss(dt) {
    var b = boss;
    b.t += dt;
    if (!b.entered) {
      b.x += (b.tgt - b.x) * Math.min(1, dt * 2.2);
      if (Math.abs(b.x - b.tgt) < 4) b.entered = true;
    } else {
      b.y = clamp(H * 0.5 + Math.sin(b.t * 0.9) * H * 0.3, b.h * 0.5, H - b.h * 0.5);
      if (b.telegraph > 0) {
        b.telegraph -= dt;
        if (b.telegraph <= 0) { bossFire(b); b.attackClock = rnd(1.9, 3.0); }
      } else {
        b.attackClock -= dt;
        if (b.attackClock <= 0) { b.telegraph = 0.85; play('tick'); }
      }
    }
    if (b.flash > 0) b.flash -= dt;
    updateBossBar();
  }

  function bossFire(b) {
    if (!player) return;
    var baseAng = Math.atan2(player.y - b.y, player.x - b.x);
    var sp = 0.52 * W;
    play('hit', { pitch: 0.7 });
    for (var i = 0; i < 5; i++) {
      var ang = baseAng + (i - 2) * 0.16;
      enemyBullets.push({ x: b.x - b.w * 0.4, y: b.y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, r: Math.max(4, b.w * 0.06), dmg: 20, dead: false });
    }
    emit('burst', b.x - b.w * 0.4, b.y, { count: 8, color: '#FF4757' });
    shake(4, 120);
  }

  function defeatBoss() {
    var b = boss;
    emit('explosion', b.x, b.y, { count: 40, color: '#FF4757' });
    emit('explosion', b.x, b.y, { count: 30, color: '#C1FF00' });
    shake(18, 500);
    play('win');
    if (J && J.haptics) J.haptics.success();
    addScore(2000, b.x, b.y);
    floatQuip(b.x, b.y, 'BOTNET NEUTRALIZED!', '#C1FF00');
    boss = null; bossBar.hidden = true;
    if (!testEndless) onWaveCleared();
  }

  function updateBossBar() {
    if (!boss) return;
    bossFill.style.width = clamp(boss.hp / boss.maxHp * 100, 0, 100) + '%';
  }

  /* ---- render --------------------------------------------------------- */
  function draw() {
    ctx.clearRect(0, 0, W, H);
    drawNebula();
    var sceneVisible = gameState === 'PLAYING' || gameState === 'INTERMISSION' || gameState === 'PAUSED';
    if (sceneVisible) {
      for (var i = 0; i < enemies.length; i++) drawEnemy(enemies[i]);
      if (boss) drawBoss(boss);
      for (var k = 0; k < enemyBullets.length; k++) drawEnemyBullet(enemyBullets[k]);
      for (var m = 0; m < bullets.length; m++) drawBullet(bullets[m]);
      if (player) drawPlayer(player);
    }
    if (J && J.particles) J.particles.draw(ctx);
  }

  function drawNebula() {
    ctx.fillStyle = '#05010a';
    ctx.fillRect(0, 0, W, H);
    for (var c = 0; c < nebulaClouds.length; c++) {
      var cl = nebulaClouds[c];
      var g = ctx.createRadialGradient(cl.x, cl.y, 0, cl.x, cl.y, cl.r);
      g.addColorStop(0, cl.color);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(cl.x - cl.r, cl.y - cl.r, cl.r * 2, cl.r * 2);
    }
    for (var l = 0; l < starLayers.length; l++) {
      var L = starLayers[l];
      for (var i = 0; i < L.stars.length; i++) {
        var st = L.stars[i];
        if (st.code) {
          ctx.font = '9px monospace';
          ctx.fillStyle = 'rgba(193,255,0,' + (L.alpha * 0.7) + ')';
          ctx.fillText(Math.random() > 0.5 ? '1' : '0', st.x, st.y);
        } else {
          ctx.fillStyle = 'rgba(200,210,255,' + L.alpha + ')';
          ctx.fillRect(st.x, st.y, st.s, st.s);
        }
      }
    }
  }

  function drawPlayer(p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    var flick = invuln > 0 && (Math.floor(frameCount / 4) % 2 === 0);
    // engine flame
    ctx.globalAlpha = (flick ? 0.3 : 1) * (0.5 + Math.random() * 0.5);
    ctx.fillStyle = '#4DA3FF';
    ctx.beginPath();
    ctx.moveTo(-p.w * 0.5, -p.h * 0.22);
    ctx.lineTo(-p.w * 0.5 - (p.w * 0.4 + Math.random() * p.w * 0.3), 0);
    ctx.lineTo(-p.w * 0.5, p.h * 0.22);
    ctx.closePath(); ctx.fill();
    ctx.globalAlpha = flick ? 0.45 : 1;
    // hull
    ctx.shadowBlur = 14; ctx.shadowColor = '#C1FF00';
    ctx.fillStyle = '#C1FF00';
    ctx.beginPath();
    ctx.moveTo(p.w * 0.55, 0);
    ctx.lineTo(-p.w * 0.45, -p.h * 0.5);
    ctx.lineTo(-p.w * 0.25, 0);
    ctx.lineTo(-p.w * 0.45, p.h * 0.5);
    ctx.closePath(); ctx.fill();
    // cockpit
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#05010a';
    ctx.beginPath();
    ctx.arc(p.w * 0.02, 0, p.w * 0.13, 0, Math.PI * 2);
    ctx.fill();
    // shield bubble
    if (shieldActive) {
      ctx.globalAlpha = 0.25 + Math.sin(frameCount * 0.3) * 0.1;
      ctx.fillStyle = '#4DA3FF';
      ctx.beginPath(); ctx.arc(0, 0, p.w * 0.95, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.9; ctx.strokeStyle = '#9fd0ff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, p.w * 0.95, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }

  function drawBullet(b) {
    ctx.save();
    ctx.shadowBlur = 10; ctx.shadowColor = '#FFD23F';
    ctx.fillStyle = '#fff01f';
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawEnemyBullet(b) {
    ctx.save();
    ctx.shadowBlur = 10; ctx.shadowColor = '#FF4757';
    ctx.fillStyle = '#ff7b8c';
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawEnemy(e) {
    ctx.save();
    ctx.translate(e.x, e.y);
    var col = e.flash > 0 ? '#ffffff' : e.color;
    ctx.shadowBlur = 12; ctx.shadowColor = e.color;
    ctx.fillStyle = col;
    if (e.type === 'comet') {
      ctx.beginPath(); ctx.arc(0, 0, e.w * 0.45, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.5;
      ctx.beginPath(); ctx.moveTo(e.w * 0.4, 0); ctx.lineTo(e.w * 1.1, -e.h * 0.25); ctx.lineTo(e.w * 1.1, e.h * 0.25); ctx.closePath(); ctx.fill();
    } else if (e.type === 'phantom') {
      ctx.fillRect(-e.w * 0.5, -e.h * 0.5, e.w, e.h);
      ctx.fillStyle = '#05010a';
      ctx.fillRect(-e.w * 0.28, -e.h * 0.18, e.w * 0.16, e.h * 0.16);
      ctx.fillRect(e.w * 0.12, -e.h * 0.18, e.w * 0.16, e.h * 0.16);
      if (e.maxHp > 1) {
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.fillRect(-e.w * 0.5, e.h * 0.5 + 3, e.w * (e.hp / e.maxHp), 3);
      }
    } else {
      ctx.beginPath();
      ctx.moveTo(-e.w * 0.5, -e.h * 0.5);
      ctx.lineTo(0, e.h * 0.5);
      ctx.lineTo(e.w * 0.5, -e.h * 0.5);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  function drawBoss(b) {
    ctx.save();
    ctx.translate(b.x, b.y);
    var telegraphing = b.telegraph > 0;
    var col = b.flash > 0 ? '#ffffff' : (telegraphing && Math.floor(b.t * 12) % 2 === 0 ? '#ff9aa8' : '#FF4757');
    ctx.shadowBlur = 22; ctx.shadowColor = '#FF4757';
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(b.w * 0.5, 0);
    ctx.lineTo(0, -b.h * 0.5);
    ctx.lineTo(-b.w * 0.5, -b.h * 0.3);
    ctx.lineTo(-b.w * 0.3, 0);
    ctx.lineTo(-b.w * 0.5, b.h * 0.3);
    ctx.lineTo(0, b.h * 0.5);
    ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#05010a';
    ctx.beginPath(); ctx.arc(-b.w * 0.05, 0, b.w * 0.16, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = telegraphing ? '#fff01f' : '#FF4757';
    ctx.beginPath(); ctx.arc(-b.w * 0.05, 0, b.w * 0.08, 0, Math.PI * 2); ctx.fill();
    if (telegraphing && player) {
      ctx.globalAlpha = 0.4 + Math.sin(b.t * 20) * 0.25;
      ctx.strokeStyle = '#fff01f'; ctx.lineWidth = 2; ctx.setLineDash([8, 8]);
      ctx.beginPath(); ctx.moveTo(-b.w * 0.4, 0); ctx.lineTo(player.x - b.x, player.y - b.y); ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
  }

  /* ---- HUD ------------------------------------------------------------ */
  function updateHUD() {
    scoreDisplay.textContent = '$' + fmt(score);
    waveDisplay.textContent = String(wave || 1);
    waveNameEl.textContent = getWaveLabel(wave || 1);
    integrityBar.style.width = clamp(integrity, 0, 100) + '%';
    integrityBar.style.background = integrity <= 30
      ? 'linear-gradient(90deg,#FF4757,#ff8fa0)'
      : 'linear-gradient(90deg,#C1FF00,#9ACC00)';
    var sm = shieldMax();
    shieldBar.style.width = (sm ? shield / sm * 100 : 0) + '%';
    updateComboBadge();
  }

  function updateComboBadge() {
    if (combo > 1) {
      comboBadge.hidden = false;
      comboBadge.textContent = 'COMBO ×' + combo;
      comboBadge.className = 'da-combo-badge mh-combo ' +
        (combo >= 6 ? 'da-combo-badge--t3' : combo >= 3 ? 'da-combo-badge--t2' : 'da-combo-badge--t1');
    } else {
      comboBadge.hidden = true;
    }
  }

  function popScore() {
    scoreDisplay.classList.remove('da-score--pop');
    void scoreDisplay.offsetWidth;
    scoreDisplay.classList.add('da-score--pop');
  }

  /* ---- screens -------------------------------------------------------- */
  function setScreen(s) {
    startScreen.hidden = s !== 'START';
    intermission.hidden = s !== 'INTERMISSION';
    pauseScreen.hidden = s !== 'PAUSED';
    gameOverScreen.hidden = s !== 'GAME_OVER';
    hud.hidden = (s === 'START' || s === 'GAME_OVER');
    touchControls.hidden = (s !== 'PLAYING');
  }

  function startGame() {
    resize();
    testEndless = false;
    score = 0; integrity = 100; combo = 1; bestCombo = 1; tookDamageThisWave = false;
    upg = { firerate: 0, spread: 0, shield: 0 };
    shield = 100; shieldActive = false; shieldTimer = 0; invuln = 0;
    autoFire = false; setAutoFire(false);
    shieldBtn.classList.remove('is-active');
    bullets = []; enemies = []; enemyBullets = []; boss = null; bossBar.hidden = true;
    player = makePlayer();
    fireClock = 0; frameCount = 0; wave = 0;
    startWave(1);
    if (typeof DodoAnalytics !== 'undefined') DodoAnalytics.gameStart(GAME_NAME);
  }

  function gameOver() {
    if (gameState === 'GAME_OVER') return;
    gameState = 'GAME_OVER';
    var prevBest = best;
    if (hs) { hs.set(Math.round(score)); best = hs.best; }
    else if (score > best) { best = Math.round(score); try { localStorage.setItem('dodo_merchant-hero-dodo_highscore', String(best)); } catch (e) {} }

    if (typeof DodoAnalytics !== 'undefined') {
      DodoAnalytics.gameOver(GAME_NAME, Math.round(score));
      if (score > prevBest) DodoAnalytics.newHighScore(GAME_NAME, Math.round(score));
    }

    finalScoreEl.textContent = '$' + fmt(score);
    highScoreEl.textContent = '$' + fmt(best);
    finalWaveEl.textContent = 'Wave ' + (wave || 1);
    finalComboEl.textContent = '×' + bestCombo;
    setScreen('GAME_OVER');

    play('gameover');
    if (player) emit('explosion', player.x, player.y, { count: 34, color: '#FF4757' });
    shake(16, 450);
    if (J && J.haptics) J.haptics.fail();
  }

  function pauseGame() { if (gameState !== 'PLAYING') return; gameState = 'PAUSED'; setScreen('PAUSED'); }
  function resumeGame() { if (gameState !== 'PAUSED') return; gameState = 'PLAYING'; lastTs = 0; setScreen('PLAYING'); }
  function toStart() { gameState = 'START'; boss = null; bossBar.hidden = true; setScreen('START'); }

  /* ---- input ---------------------------------------------------------- */
  var keys = { up: false, down: false, left: false, right: false, fire: false };
  var pointerActive = false;

  function setAutoFire(v) { autoFire = !!v; fireBtn.setAttribute('aria-pressed', v ? 'true' : 'false'); }

  document.addEventListener('keydown', function (e) {
    var k = e.key;
    if (k === 'ArrowUp' || k === 'w' || k === 'W') keys.up = true;
    if (k === 'ArrowDown' || k === 's' || k === 'S') keys.down = true;
    if (k === 'ArrowLeft' || k === 'a' || k === 'A') keys.left = true;
    if (k === 'ArrowRight' || k === 'd' || k === 'D') keys.right = true;
    if (k === ' ' || k === 'Spacebar') keys.fire = true;
    if (k === 'Shift') { if (gameState === 'PLAYING') activateShield(); }
    if (k === 'p' || k === 'P' || k === 'Escape') {
      if (gameState === 'PLAYING') pauseGame();
      else if (gameState === 'PAUSED') resumeGame();
    }
    if ((k === 'ArrowUp' || k === 'ArrowDown' || k === 'ArrowLeft' || k === 'ArrowRight' || k === ' ') && gameState === 'PLAYING') e.preventDefault();
  });
  document.addEventListener('keyup', function (e) {
    var k = e.key;
    if (k === 'ArrowUp' || k === 'w' || k === 'W') keys.up = false;
    if (k === 'ArrowDown' || k === 's' || k === 'S') keys.down = false;
    if (k === 'ArrowLeft' || k === 'a' || k === 'A') keys.left = false;
    if (k === 'ArrowRight' || k === 'd' || k === 'D') keys.right = false;
    if (k === ' ' || k === 'Spacebar') keys.fire = false;
  });

  function pointerToLogical(clientX, clientY) {
    var r = canvas.getBoundingClientRect();
    return { x: (clientX - r.left) * (W / r.width), y: (clientY - r.top) * (H / r.height) };
  }
  function handlePointer(clientX, clientY) {
    if (gameState !== 'PLAYING' || !player) return;
    var pt = pointerToLogical(clientX, clientY);
    pointerActive = true;
    player.aimX = clamp(pt.x, player.w * 0.4, W * 0.62);
    player.aimY = clamp(pt.y, 0, H - player.h);
  }

  canvas.addEventListener('touchstart', function (e) {
    if (e.touches && e.touches.length) { handlePointer(e.touches[0].clientX, e.touches[0].clientY); if (!autoFire) fireBullet(); }
  }, { passive: true });
  canvas.addEventListener('touchmove', function (e) {
    e.preventDefault();
    if (e.touches && e.touches.length) handlePointer(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: false });
  canvas.addEventListener('touchend', function () { pointerActive = false; });

  canvas.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    handlePointer(e.clientX, e.clientY);
    if (e.pointerType === 'mouse' && !autoFire) fireBullet();
  });
  canvas.addEventListener('pointermove', function (e) {
    if (e.buttons || e.pointerType === 'touch') handlePointer(e.clientX, e.clientY);
  });
  window.addEventListener('pointerup', function () { pointerActive = false; });

  /* buttons */
  startBtn.addEventListener('click', startGame);
  restartBtn.addEventListener('click', startGame);
  resumeBtn.addEventListener('click', resumeGame);
  quitBtn.addEventListener('click', toStart);
  shieldBtn.addEventListener('click', function () { activateShield(); });
  fireBtn.addEventListener('click', function () { setAutoFire(!autoFire); play('tap'); });

  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', function () { setTimeout(resize, 150); });

  /* mute toggle */
  if (J && J.muteButton) J.muteButton(document.body);

  /* particles: attach once (Mode A) — update/draw run in the loop, emit on events/frames */
  if (J && J.particles && J.particles.attach) J.particles.attach(canvas, ctx);

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

  /* ---- test hooks (test-only steering; never used by real gameplay) --- */
  window.MerchantHeroTest = {
    shoot: function () { fireBullet(); },
    scorePoint: function () {
      var y = player ? player.y : H * 0.5;
      var e = makeEnemy('comet', 'straight', clamp(y, e_top(), H - 40));
      e.x = W * 0.5;
      enemies.push(e);
      destroyEnemy(e, true);
    },
    damage: function () { damagePlayer(10); },
    shield: function () { shield = shieldMax(); shieldActive = false; return activateShield(); },
    pickUpgrade: function (key) { applyUpgrade(key || 'firerate'); },
    waveClearPulse: function () { awardWaveClear(); },
    clearWaveFull: function () { onWaveCleared(); },
    spawnBoss: function () {
      var bn = wave - (wave % 5) + 5; if (bn < 5) bn = 5;
      wave = bn; enemies = []; enemyBullets = [];
      gameState = 'PLAYING'; setScreen('PLAYING');
      startBoss(bn); updateHUD();
      return bn;
    },
    endGame: function () { gameOver(); },
    setEndless: function (v) { testEndless = !!v; },
    setAutoFire: function (v) { setAutoFire(!!v); },
    getState: function () { return gameState; },
    getScore: function () { return Math.round(score); },
    getWave: function () { return wave; }
  };

  /* ---- boot ----------------------------------------------------------- */
  resize();
  updateHUD();
  setScreen('START');
  requestAnimationFrame(frame);
})();
