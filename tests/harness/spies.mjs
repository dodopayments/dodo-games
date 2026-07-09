// Browser-side instrumentation injected via `context.addInitScript(installSpies)`.
//
// MUST be fully self-contained (no closure over module scope) because Playwright
// serializes the function source and runs it in the page BEFORE any game script.
//
// It measures the quality signals defined in the dodo-juice.js contract:
//   DodoJuice.audio.play(cue, opts)      -> distinct audio cues
//   DodoJuice.particles.emit(...)        -> particle firings (invocations)
//   DodoJuice.particles.count()          -> live particle count (real emissions)
//   DodoJuice.shake(el, intensity, ms)   -> screenshake firings
//   DodoJuice._attempted                 -> reduced-motion "hooks were driven" proof
//   DodoJuice.reducedMotion              -> reduced-motion flag
// ...and the analytics contract by intercepting `dataLayer.push` (gtag routes
// every event through it), since analytics.js exposes DodoAnalytics as a lexical
// `const` (NOT on window) — so window.DodoAnalytics cannot be wrapped directly.

export function installSpies() {
  const S = {
    audioCues: [],
    audioPlayCalls: 0,
    particleEmits: 0,
    shakes: 0,
    maxParticleCount: 0,
    audioContextCreated: false,
    analytics: [], // { event, params }
  };
  window.__DODO_SPY__ = S;

  // ---- Analytics: intercept dataLayer.push (gtag -> dataLayer.push(arguments)) ----
  // Pre-seed dataLayer so analytics.js `window.dataLayer = window.dataLayer || []`
  // keeps OUR array (with the overridden push) instead of replacing it.
  const dl = Array.isArray(window.dataLayer) ? window.dataLayer : [];
  const origPush = Array.prototype.push.bind(dl);
  dl.push = function () {
    try {
      for (let i = 0; i < arguments.length; i += 1) {
        const a = arguments[i];
        if (a && a[0] === 'event' && typeof a[1] === 'string') {
          S.analytics.push({ event: a[1], params: a[2] || {} });
        }
      }
    } catch (e) {
      /* never let the spy break the game */
    }
    return origPush.apply(null, arguments);
  };
  window.dataLayer = dl;

  // ---- AudioContext creation flag (fallback signal for "audio initialized") ----
  const NativeAC = window.AudioContext || window.webkitAudioContext;
  if (NativeAC) {
    const WrappedAC = function () {
      S.audioContextCreated = true;
      return new NativeAC(...arguments);
    };
    WrappedAC.prototype = NativeAC.prototype;
    try {
      window.AudioContext = WrappedAC;
      window.webkitAudioContext = WrappedAC;
    } catch (e) {
      /* ignore */
    }
  }

  // ---- DodoJuice spy: instrument on assignment (single IIFE assigns it once) ----
  let dj;

  function instrument(obj) {
    if (!obj) return;
    try {
      if (obj.audio && typeof obj.audio.play === 'function' && !obj.audio.play.__djSpied) {
        const orig = obj.audio.play.bind(obj.audio);
        const wrapped = function (cue) {
          try {
            S.audioPlayCalls += 1;
            S.audioCues.push(String(cue));
          } catch (e) { /* ignore */ }
          return orig.apply(this, arguments);
        };
        wrapped.__djSpied = true;
        obj.audio.play = wrapped;
      }
      if (obj.particles && typeof obj.particles.emit === 'function' && !obj.particles.emit.__djSpied) {
        const orig = obj.particles.emit.bind(obj.particles);
        const wrapped = function () {
          try { S.particleEmits += 1; } catch (e) { /* ignore */ }
          return orig.apply(this, arguments);
        };
        wrapped.__djSpied = true;
        obj.particles.emit = wrapped;
      }
      if (typeof obj.shake === 'function' && !obj.shake.__djSpied) {
        const orig = obj.shake;
        const wrapped = function () {
          try { S.shakes += 1; } catch (e) { /* ignore */ }
          return orig.apply(this, arguments);
        };
        wrapped.__djSpied = true;
        obj.shake = wrapped;
      }
    } catch (e) {
      /* ignore */
    }
  }

  // Re-run instrumentation on demand (safety net if methods are attached after
  // the initial window.DodoJuice assignment).
  S.reinstrument = function () { instrument(dj); };

  // Poll the live particle count and remember the peak. Under normal motion this
  // becomes > 0 when particles actually render; under reduced motion it stays 0.
  S.sampleParticles = function () {
    try {
      if (dj && dj.particles && typeof dj.particles.count === 'function') {
        const c = dj.particles.count();
        if (typeof c === 'number' && c > S.maxParticleCount) S.maxParticleCount = c;
      }
    } catch (e) { /* ignore */ }
  };

  // Read the reduced-motion "attempted" counters (proves gameplay drove the hooks
  // even when nothing rendered).
  S.readAttempted = function () {
    try {
      return dj && dj._attempted ? JSON.parse(JSON.stringify(dj._attempted)) : null;
    } catch (e) {
      return null;
    }
  };

  S.reducedMotion = function () {
    try { return dj ? !!dj.reducedMotion : null; } catch (e) { return null; }
  };

  S.hasJuice = function () { return !!dj; };

  try {
    Object.defineProperty(window, 'DodoJuice', {
      configurable: true,
      get() { return dj; },
      set(v) { dj = v; instrument(v); },
    });
  } catch (e) {
    /* ignore */
  }
}
