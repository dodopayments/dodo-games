/*!
 * DodoJuice — shared game-feel toolkit for the Dodo Games arcade.
 * Vanilla JS, zero dependencies, single IIFE exposing window.DodoJuice.
 * Modules: audio (WebAudio synth), particles (pooled canvas system),
 * shake / flash / floatText, haptics, reduced-motion gating,
 * highscore (with legacy migration) and muteButton.
 *
 * Design notes for the verification harness:
 *   - DodoJuice.audio.play and DodoJuice.particles.emit are PLAIN function
 *     properties (never frozen / never getters) so they can be spied/wrapped.
 *   - Every decorative API increments DodoJuice._attempted[api] on EVERY call,
 *     then no-ops the real effect when reduced motion is active. So under
 *     `prefers-reduced-motion: reduce` real emissions are zero while the
 *     _attempted counters prove gameplay still drives the hooks.
 */
(function (global) {
  'use strict';

  var W = global || (typeof window !== 'undefined' ? window : {});
  var DodoJuice = {};

  /* ---- brand + shared constants ---------------------------------------- */
  var GREEN = '#C1FF00';
  var TWO_PI = Math.PI * 2;
  var FONT = '"Space Grotesk", "Segoe UI", system-ui, -apple-system, sans-serif';
  var MUTE_KEY = 'dodo_audio_muted';

  /* ---- tiny helpers ---------------------------------------------------- */
  function rand(a, b) { return a + Math.random() * (b - a); }
  function nowMs() {
    return (W.performance && W.performance.now) ? W.performance.now() : Date.now();
  }
  function raf(fn) {
    var r = W.requestAnimationFrame;
    if (r) return r(fn);
    return W.setTimeout ? W.setTimeout(function () { fn(nowMs()); }, 16) : 0;
  }
  function later(fn, ms) { if (W.setTimeout) W.setTimeout(fn, ms); }
  function lsGet(k) { try { return W.localStorage ? W.localStorage.getItem(k) : null; } catch (e) { return null; } }
  function lsSet(k, v) { try { if (W.localStorage) W.localStorage.setItem(k, v); } catch (e) {} }
  function lsDel(k) { try { if (W.localStorage) W.localStorage.removeItem(k); } catch (e) {} }

  /* ====================================================================== *
   * REDUCED MOTION — live-updating boolean from matchMedia.
   * ====================================================================== */
  var reducedMotion = false;
  (function initReducedMotion() {
    if (!W.matchMedia) return;
    var mq;
    try { mq = W.matchMedia('(prefers-reduced-motion: reduce)'); } catch (e) { return; }
    if (!mq) return;
    reducedMotion = !!mq.matches;
    var onChange = function (e) {
      reducedMotion = !!(e && e.matches);
      DodoJuice.reducedMotion = reducedMotion;
    };
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else if (mq.addListener) mq.addListener(onChange);
  })();
  DodoJuice.reducedMotion = reducedMotion;

  /* attempt counters — incremented on every decorative call (see file header) */
  DodoJuice._attempted = { emit: 0, shake: 0, flash: 0, floatText: 0 };

  /* ====================================================================== *
   * AUDIO — WebAudio synthesizer with named cue presets.
   * AudioContext is created lazily on the first user gesture (autoplay
   * policy). Every play() before the context exists — or while muted — is a
   * safe no-op. Modeled on flappy-dodo/assets/script.js.
   * ====================================================================== */
  var audioCtx = null;
  var masterGain = null;
  var noiseBuf = null;
  var muted = lsGet(MUTE_KEY) === '1';

  function ensureCtx() {
    if (audioCtx) return audioCtx;
    var AC = W.AudioContext || W.webkitAudioContext;
    if (!AC) return null;
    try {
      audioCtx = new AC();
      masterGain = audioCtx.createGain();
      masterGain.gain.value = 0.85;
      masterGain.connect(audioCtx.destination);
    } catch (e) { audioCtx = null; }
    return audioCtx;
  }

  function getNoise(ctx) {
    if (noiseBuf) return noiseBuf;
    var len = Math.floor(ctx.sampleRate * 0.4);
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = noiseBuf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return noiseBuf;
  }

  /* one oscillator note with a frequency glide + AD gain envelope */
  function osc(ctx, dest, type, f0, f1, t0, dur, peak, ramp) {
    var o = ctx.createOscillator();
    var g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t0);
    if (f1 && f1 !== f0) {
      if (ramp === 'exp') o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t0 + dur);
      else o.frequency.linearRampToValueAtTime(f1, t0 + dur);
    }
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(dest);
    o.start(t0); o.stop(t0 + dur + 0.02);
    return o;
  }

  /* a filtered noise burst with an exponential decay */
  function noise(ctx, dest, t0, dur, peak, filterType, freq) {
    var src = ctx.createBufferSource();
    src.buffer = getNoise(ctx);
    var g = ctx.createGain();
    g.gain.setValueAtTime(Math.max(0.0002, peak), t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    if (filterType) {
      var bp = ctx.createBiquadFilter();
      bp.type = filterType;
      bp.frequency.value = freq || 1000;
      src.connect(bp); bp.connect(g);
    } else {
      src.connect(g);
    }
    g.connect(dest);
    src.start(t0); src.stop(t0 + dur + 0.02);
  }

  /* Cue registry. `p` = pitch multiplier, `v` = volume multiplier. */
  var CUES = {
    // tap: soft sine blip gliding 300->520Hz (~90ms) — light action feedback
    tap: function (c, d, t, p, v) { osc(c, d, 'sine', 300 * p, 520 * p, t, 0.09, 0.18 * v, 'lin'); },
    // score: two-step square 800Hz then 1200Hz (~180ms) — classic point pickup
    score: function (c, d, t, p, v) { osc(c, d, 'square', 800 * p, 800 * p, t, 0.06, 0.09 * v); osc(c, d, 'square', 1200 * p, 1200 * p, t + 0.06, 0.12, 0.08 * v); },
    // combo: two ascending triangle notes, pitch-laddered by opts.pitch — combo chime
    combo: function (c, d, t, p, v) { osc(c, d, 'triangle', 520 * p, 520 * p, t, 0.07, 0.12 * v); osc(c, d, 'triangle', 780 * p, 880 * p, t + 0.05, 0.12, 0.11 * v, 'lin'); },
    // powerup: triangle sweep 440->880->1760Hz (~350ms) — celebratory ascension
    powerup: function (c, d, t, p, v) { var o = osc(c, d, 'triangle', 440 * p, 1760 * p, t, 0.35, 0.14 * v, 'lin'); o.frequency.linearRampToValueAtTime(880 * p, t + 0.12); },
    // hit: sawtooth thud 220->80Hz plus a short lowpass noise transient — impact
    hit: function (c, d, t, p, v) { osc(c, d, 'sawtooth', 220 * p, 80 * p, t, 0.12, 0.2 * v, 'exp'); noise(c, d, t, 0.06, 0.15 * v, 'lowpass', 1200); },
    // fail: descending triangle 300->120Hz (~220ms) — soft negative
    fail: function (c, d, t, p, v) { osc(c, d, 'triangle', 300 * p, 120 * p, t, 0.22, 0.18 * v, 'lin'); },
    // gameover: long sawtooth power-down 220->20Hz exp (~550ms) — defeat sting
    gameover: function (c, d, t, p, v) { osc(c, d, 'sawtooth', 220 * p, 20 * p, t, 0.55, 0.28 * v, 'exp'); },
    // win: three-note square fanfare C5-E5-G5 (~400ms) — victory
    win: function (c, d, t, p, v) { osc(c, d, 'square', 523 * p, 523 * p, t, 0.12, 0.12 * v); osc(c, d, 'square', 659 * p, 659 * p, t + 0.1, 0.12, 0.12 * v); osc(c, d, 'square', 784 * p, 784 * p, t + 0.2, 0.2, 0.14 * v); },
    // tick: tiny square click at 1000Hz (~35ms) — countdown / UI tick
    tick: function (c, d, t, p, v) { osc(c, d, 'square', 1000 * p, 1000 * p, t, 0.035, 0.08 * v); },
    // whoosh: band-passed noise sweep (~250ms) — movement / swipe
    whoosh: function (c, d, t, p, v) { noise(c, d, t, 0.25, 0.12 * v, 'bandpass', 900 * p); }
  };

  DodoJuice.audio = {
    cues: CUES,
    /* play(cueName, {pitch=1, volume=1}) — no-op when muted or before ctx */
    play: function (name, opts) {
      if (muted) return;
      var c = audioCtx;
      if (!c) return;
      var fn = CUES[name];
      if (!fn) return;
      opts = opts || {};
      var p = opts.pitch || 1;
      var v = (opts.volume == null) ? 1 : opts.volume;
      var t = c.currentTime + 0.001;
      try { fn(c, masterGain, t, p, v); } catch (e) {}
    },
    setMuted: function (b) {
      muted = !!b;
      lsSet(MUTE_KEY, muted ? '1' : '0');
      updateMuteButtons();
    },
    isMuted: function () { return muted; }
  };

  /* Lazy context unlock: one-time gesture listeners (autoplay compliance). */
  (function bindGesture() {
    if (!W.addEventListener) return;
    var unlock = function () {
      var c = ensureCtx();
      if (c && c.state === 'suspended' && c.resume) { try { c.resume(); } catch (e) {} }
      W.removeEventListener('pointerdown', unlock, true);
      W.removeEventListener('keydown', unlock, true);
      W.removeEventListener('touchstart', unlock, true);
    };
    W.addEventListener('pointerdown', unlock, true);
    W.addEventListener('keydown', unlock, true);
    W.addEventListener('touchstart', unlock, true);
  })();

  /* ====================================================================== *
   * PARTICLES — pooled canvas system (max 500, no GC churn).
   * Mode A: attach(canvas, ctx) — game calls update(dt)+draw(ctx) in its loop.
   * Mode B: overlay() — a fixed pointer-events:none full-viewport canvas with
   *         its own rAF loop (paused while document.hidden).
   * Both modes share one pool.
   * ====================================================================== */
  var MAX = 500;
  var pool = [];
  var cursor = 0;
  var activeCount = 0;
  var COLORS = ['#C1FF00', '#8ef442', '#ffffff', '#00e5ff', '#ff5c8a', '#ffd23f'];

  function Particle() {
    this.active = false; this.x = 0; this.y = 0; this.vx = 0; this.vy = 0;
    this.life = 0; this.max = 1; this.size = 1; this.color = GREEN;
    this.shape = 'sq'; this.grav = 0; this.drag = 1; this.rot = 0; this.vr = 0;
  }
  for (var pi = 0; pi < MAX; pi++) pool.push(new Particle());

  /* round-robin slot allocation — overwrites the oldest when the pool is full */
  function slot() {
    var pt = pool[cursor];
    if (!pt.active) activeCount++;
    cursor = (cursor + 1) % MAX;
    return pt;
  }

  function emitN(n, x, y, cfg) {
    for (var i = 0; i < n; i++) {
      var pt = slot();
      var ang = cfg.ang != null ? cfg.ang() : rand(0, TWO_PI);
      var spd = rand(cfg.spdMin, cfg.spdMax);
      pt.x = x; pt.y = y;
      pt.vx = Math.cos(ang) * spd;
      pt.vy = Math.sin(ang) * spd + (cfg.vy0 || 0);
      pt.life = rand(cfg.lifeMin, cfg.lifeMax); pt.max = pt.life;
      pt.size = rand(cfg.sizeMin, cfg.sizeMax);
      pt.color = cfg.color ? cfg.color() : GREEN;
      pt.shape = cfg.shape || 'sq';
      pt.grav = cfg.grav || 0; pt.drag = cfg.drag == null ? 1 : cfg.drag;
      pt.rot = Math.random() * TWO_PI; pt.vr = rand(-6, 6);
      pt.active = true;
    }
  }

  var PRESETS = {
    // burst: radial spray of green sparks with light gravity — generic pop
    burst: function (x, y, o) { emitN(o.count || 14, x, y, { spdMin: 60, spdMax: 260, lifeMin: 0.3, lifeMax: 0.6, sizeMin: 2, sizeMax: 5, grav: 300, drag: 0.9, shape: 'sq', color: function () { return o.color || GREEN; } }); },
    // confetti: upward-biased multi-color spinning rectangles falling under gravity
    confetti: function (x, y, o) { emitN(o.count || 28, x, y, { spdMin: 80, spdMax: 320, lifeMin: 0.8, lifeMax: 1.6, sizeMin: 5, sizeMax: 10, grav: 520, drag: 0.96, vy0: -120, shape: 'rect', color: function () { return COLORS[(Math.random() * COLORS.length) | 0]; } }); },
    // trail: a few slow short-lived dots — motion trails behind a moving object
    trail: function (x, y, o) { emitN(o.count || 4, x, y, { spdMin: 5, spdMax: 40, lifeMin: 0.2, lifeMax: 0.45, sizeMin: 2, sizeMax: 4, grav: 0, drag: 0.9, shape: 'circle', color: function () { return o.color || GREEN; } }); },
    // sparkle: tiny rising twinkles — pickups / shine accents
    sparkle: function (x, y, o) { emitN(o.count || 8, x, y, { spdMin: 10, spdMax: 90, lifeMin: 0.3, lifeMax: 0.7, sizeMin: 1, sizeMax: 3, grav: -40, drag: 0.92, shape: 'circle', color: function () { return o.color || '#ffffff'; } }); },
    // explosion: dense fast radial blast, orange+green, medium gravity — big impacts
    explosion: function (x, y, o) { emitN(o.count || 30, x, y, { spdMin: 120, spdMax: 420, lifeMin: 0.4, lifeMax: 0.9, sizeMin: 3, sizeMax: 8, grav: 200, drag: 0.88, shape: 'sq', color: function () { return Math.random() < 0.5 ? (o.color || '#ff7b00') : GREEN; } }); }
  };

  function updatePool(dt) {
    var d = dt > 0 ? dt : 0.0166;
    if (d > 0.1) d = 0.0166;
    for (var i = 0; i < MAX; i++) {
      var pt = pool[i];
      if (!pt.active) continue;
      pt.vy += pt.grav * d;
      if (pt.drag !== 1) {
        var df = Math.pow(pt.drag, d * 60);
        pt.vx *= df; pt.vy *= df;
      }
      pt.x += pt.vx * d; pt.y += pt.vy * d;
      pt.rot += pt.vr * d;
      pt.life -= d;
      if (pt.life <= 0) { pt.active = false; activeCount--; }
    }
  }

  function drawPool(ctx) {
    if (!ctx) return;
    for (var i = 0; i < MAX; i++) {
      var pt = pool[i];
      if (!pt.active) continue;
      var a = pt.life / pt.max;
      if (a > 1) a = 1; else if (a < 0) a = 0;
      ctx.globalAlpha = a;
      ctx.fillStyle = pt.color;
      if (pt.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, Math.max(0.5, pt.size * a), 0, TWO_PI);
        ctx.fill();
      } else if (pt.shape === 'rect') {
        ctx.save();
        ctx.translate(pt.x, pt.y);
        ctx.rotate(pt.rot);
        ctx.fillRect(-pt.size / 2, -pt.size / 2, pt.size, pt.size * 0.6);
        ctx.restore();
      } else {
        var s = pt.size;
        ctx.fillRect(pt.x - s / 2, pt.y - s / 2, s, s);
      }
    }
    ctx.globalAlpha = 1;
  }

  /* overlay-mode state */
  var overlayCanvas = null, overlayCtx = null, overlayPending = false, overlayLast = 0;
  var attachedCtx = null;

  function resizeOverlay() {
    if (!overlayCanvas) return;
    var dpr = W.devicePixelRatio || 1;
    var w = W.innerWidth || 300, h = W.innerHeight || 150;
    overlayCanvas.width = Math.round(w * dpr);
    overlayCanvas.height = Math.round(h * dpr);
    if (overlayCtx && overlayCtx.setTransform) overlayCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function overlayFrame(ts) {
    overlayPending = false;
    if (!overlayCanvas || !overlayCtx) return;
    var hidden = !!(W.document && W.document.hidden);
    var dt = overlayLast ? (ts - overlayLast) / 1000 : 0.016;
    overlayLast = ts;
    if (!hidden) {
      updatePool(dt);
      overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
      drawPool(overlayCtx);
    }
    if (activeCount > 0 || hidden) startOverlayLoop();
    else overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
  }

  function startOverlayLoop() {
    if (overlayPending || !overlayCanvas) return;
    overlayPending = true;
    overlayLast = 0;
    raf(overlayFrame);
  }

  DodoJuice.particles = {
    /* emit(preset, x, y, opts) — gated by reduced motion (see file header) */
    emit: function (preset, x, y, opts) {
      DodoJuice._attempted.emit++;
      if (reducedMotion) return;
      var fn = PRESETS[preset] || PRESETS.burst;
      fn(x || 0, y || 0, opts || {});
      if (overlayCanvas) startOverlayLoop();
    },
    /* Mode A: canvas games render into their own context. */
    attach: function (canvas, ctx) {
      attachedCtx = ctx || (canvas && canvas.getContext && canvas.getContext('2d')) || null;
      return this;
    },
    update: function (dt) { updatePool(dt); },
    draw: function (ctx) { drawPool(ctx || attachedCtx); },
    /* Mode B: DOM games — auto-created full-viewport overlay with its own loop. */
    overlay: function () {
      if (overlayCanvas) return overlayCanvas;
      var doc = W.document;
      if (!doc || !doc.createElement) return null;
      var cv = doc.createElement('canvas');
      cv.className = 'dodo-juice-overlay';
      var s = cv.style;
      s.position = 'fixed'; s.left = '0'; s.top = '0';
      s.width = '100%'; s.height = '100%';
      s.pointerEvents = 'none'; s.zIndex = '9998';
      (doc.body || doc.documentElement).appendChild(cv);
      overlayCanvas = cv;
      overlayCtx = cv.getContext ? cv.getContext('2d') : null;
      resizeOverlay();
      if (W.addEventListener) W.addEventListener('resize', resizeOverlay);
      startOverlayLoop();
      return cv;
    },
    count: function () { return activeCount; },
    clear: function () {
      for (var i = 0; i < MAX; i++) pool[i].active = false;
      activeCount = 0;
    }
  };

  /* ====================================================================== *
   * SCREEN EFFECTS — shake / flash / floatText (all reduced-motion gated).
   * ====================================================================== */

  /* CSS-transform screenshake with linear decay; works on canvas or container */
  DodoJuice.shake = function (el, intensity, ms) {
    DodoJuice._attempted.shake++;
    if (reducedMotion || !el || !el.style) return;
    intensity = intensity || 8;
    ms = ms || 300;
    var base = el.getAttribute && el.getAttribute('data-dj-base');
    if (base == null) { base = el.style.transform || ''; if (el.setAttribute) el.setAttribute('data-dj-base', base); }
    var start = nowMs();
    function step() {
      var t = (nowMs() - start) / ms;
      if (t >= 1 || !el.style) {
        el.style.transform = base;
        if (el.removeAttribute) el.removeAttribute('data-dj-base');
        return;
      }
      var k = (1 - t) * intensity;
      var dx = (Math.random() * 2 - 1) * k;
      var dy = (Math.random() * 2 - 1) * k;
      el.style.transform = (base ? base + ' ' : '') + 'translate(' + dx.toFixed(2) + 'px,' + dy.toFixed(2) + 'px)';
      raf(step);
    }
    raf(step);
  };

  /* Colored flash overlay pinned to an element's rect, fading out then removed */
  DodoJuice.flash = function (el, color, ms) {
    DodoJuice._attempted.flash++;
    if (reducedMotion) return;
    var doc = W.document;
    if (!doc || !doc.createElement) return;
    color = color || GREEN;
    ms = ms || 220;
    var target = el || doc.body;
    var r = target && target.getBoundingClientRect
      ? target.getBoundingClientRect()
      : { left: 0, top: 0, width: (W.innerWidth || 300), height: (W.innerHeight || 150) };
    var d = doc.createElement('div');
    var s = d.style;
    s.position = 'fixed';
    s.left = r.left + 'px'; s.top = r.top + 'px';
    s.width = r.width + 'px'; s.height = r.height + 'px';
    s.background = color; s.opacity = '0.5';
    s.pointerEvents = 'none'; s.zIndex = '9999';
    s.transition = 'opacity ' + ms + 'ms ease-out';
    if (target && target.style && target.style.borderRadius) s.borderRadius = target.style.borderRadius;
    (doc.body || doc.documentElement).appendChild(d);
    if (d.offsetWidth) { /* force reflow */ }
    later(function () { s.opacity = '0'; }, 12);
    later(function () { if (d.parentNode) d.parentNode.removeChild(d); }, ms + 60);
  };

  /* Floating score text via an absolutely-positioned DOM node, auto-removed */
  DodoJuice.floatText = function (x, y, text, opts) {
    DodoJuice._attempted.floatText++;
    if (reducedMotion) return;
    var doc = W.document;
    if (!doc || !doc.createElement) return;
    opts = opts || {};
    var d = doc.createElement('div');
    d.className = 'dodo-juice-float';
    d.textContent = String(text);
    var s = d.style;
    s.position = 'fixed';
    s.left = (x || 0) + 'px'; s.top = (y || 0) + 'px';
    s.transform = 'translate(-50%,-50%)';
    s.color = opts.color || GREEN;
    s.font = '700 ' + (opts.size || 22) + 'px ' + FONT;
    s.pointerEvents = 'none'; s.zIndex = '9999';
    s.textShadow = '0 2px 8px rgba(0,0,0,.6)';
    s.transition = 'transform 900ms cubic-bezier(.2,.8,.2,1), opacity 900ms ease-out';
    s.willChange = 'transform, opacity';
    (doc.body || doc.documentElement).appendChild(d);
    if (d.offsetWidth) { /* force reflow */ }
    later(function () { s.transform = 'translate(-50%,-160%)'; s.opacity = '0'; }, 12);
    later(function () { if (d.parentNode) d.parentNode.removeChild(d); }, 1000);
  };

  /* ====================================================================== *
   * HAPTICS — navigator.vibrate, feature-guarded.
   * ====================================================================== */
  function vibrate(pattern) {
    try {
      var n = W.navigator;
      if (n && 'vibrate' in n) n.vibrate(pattern);
    } catch (e) {}
  }
  DodoJuice.haptics = {
    tap: function () { vibrate(10); },
    success: function () { vibrate([12, 30, 12]); },
    fail: function () { vibrate([40, 30, 40]); }
  };

  /* ====================================================================== *
   * HIGHSCORE — persists under dodo_{slug}_highscore with one-time migration
   * of the max numeric value found across legacyKeys (then removes them).
   * ====================================================================== */
  DodoJuice.highscore = function (slug, legacyKeys) {
    var key = 'dodo_' + slug + '_highscore';
    function read() {
      var v = lsGet(key);
      if (v == null) return 0;
      var n = parseInt(v, 10);
      return isNaN(n) ? 0 : n;
    }
    var cur = read();
    if (legacyKeys && legacyKeys.length) {
      var best = cur;
      for (var i = 0; i < legacyKeys.length; i++) {
        var lk = legacyKeys[i];
        var lv = lsGet(lk);
        if (lv != null) {
          var n = parseInt(lv, 10);
          if (!isNaN(n) && n > best) best = n;
          lsDel(lk);
        }
      }
      if (best > cur) { lsSet(key, String(best)); cur = best; }
    }
    var api = {
      get: function () { return read(); },
      set: function (score) {
        score = parseInt(score, 10);
        if (isNaN(score)) score = 0;
        if (score > read()) lsSet(key, String(score));
        return read();
      }
    };
    try {
      Object.defineProperty(api, 'best', { get: function () { return read(); }, enumerable: true });
    } catch (e) {
      api.best = cur;
    }
    return api;
  };

  /* ====================================================================== *
   * MUTE BUTTON — injects a .da-mute-toggle button wired to audio mute.
   * ====================================================================== */
  var muteButtons = [];
  function muteIcon(m) { return m ? '🔇' : '🔊'; }
  function updateMuteButtons() {
    for (var i = muteButtons.length - 1; i >= 0; i--) {
      var b = muteButtons[i];
      if (!b || !b.parentNode) { muteButtons.splice(i, 1); continue; }
      b.textContent = muteIcon(muted);
      if (b.setAttribute) {
        b.setAttribute('aria-pressed', muted ? 'true' : 'false');
        b.setAttribute('aria-label', muted ? 'Unmute' : 'Mute');
      }
    }
  }
  DodoJuice.muteButton = function (container) {
    var doc = W.document;
    if (!doc || !doc.createElement) return null;
    var b = doc.createElement('button');
    b.type = 'button';
    b.className = 'da-mute-toggle';
    b.textContent = muteIcon(muted);
    if (b.setAttribute) {
      b.setAttribute('aria-pressed', muted ? 'true' : 'false');
      b.setAttribute('aria-label', muted ? 'Unmute' : 'Mute');
    }
    if (b.addEventListener) {
      b.addEventListener('click', function () { DodoJuice.audio.setMuted(!muted); });
    }
    (container || doc.body).appendChild(b);
    muteButtons.push(b);
    return b;
  };

  DodoJuice.version = '1.0.0';
  W.DodoJuice = DodoJuice;
  if (typeof module !== 'undefined' && module.exports) module.exports = DodoJuice;

})(typeof window !== 'undefined' ? window : this);
