/*!
 * Dodo Games — home page controller.
 * Vanilla JS, single IIFE. Renders the card grid from window.DODO_GAMES,
 * powers live search + genre filters, personal-best / RESUME / NEW badges,
 * the day-rotating featured spotlight, the Boss Mode easter egg, and a
 * lightweight rAF ambient background (drifting currency glyphs).
 *
 * Built with DOM APIs only (no innerHTML). Test hook: window.__bgFrames.
 * Analytics: uses the bare lexical `DodoAnalytics` global (guarded).
 */
(function () {
  'use strict';

  var SVG_NS = 'http://www.w3.org/2000/svg';
  var GAMES = (window.DODO_GAMES || []).slice();
  var NEW_WINDOW_MS = 90 * 24 * 60 * 60 * 1000; // 90 days
  var GENRES = ['All', 'Action', 'Puzzle', 'Arcade', 'Word'];
  var prefersReduced = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Single-path icon geometry (drawn via createElementNS, never innerHTML).
  var PATH_TROPHY =
    'M18 2H6v2H2v4a4 4 0 0 0 4 4 6 6 0 0 0 5 3.9V19H8v2h8v-2h-3v-3.1A6 6 0 0 0 18 12a4 4 0 0 0 4-4V4h-4V2ZM4 8V6h2v4a2 2 0 0 1-2-2Zm16 0a2 2 0 0 1-2 2V6h2v2Z';
  var PATH_IDEA =
    'M9 21h6v-1H9v1Zm3-19a7 7 0 0 0-4 12.7c.6.4 1 1.1 1 1.8V18h6v-1.5c0-.7.4-1.4 1-1.8A7 7 0 0 0 12 2Zm-1 20h2v1a1 1 0 0 1-2 0v-1Z';

  /* ---- small DOM helpers ---------------------------------------------- */
  function el(tag, cls) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    return node;
  }

  function icon(pathD) {
    var svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'currentColor');
    svg.setAttribute('aria-hidden', 'true');
    var p = document.createElementNS(SVG_NS, 'path');
    p.setAttribute('d', pathD);
    svg.appendChild(p);
    return svg;
  }

  function readBest(slug) {
    try {
      var raw = localStorage.getItem('dodo_' + slug + '_highscore');
      if (raw == null) return null;
      var s = String(raw).trim();
      if (/^-?\d+$/.test(s)) {
        var n = parseInt(s, 10);
        return n > 0 ? n : null;
      }
      var v = JSON.parse(s);
      if (typeof v === 'number' && isFinite(v) && v > 0) return v;
      if (v && typeof v === 'object') {
        var cand = v.highScore || v.high || v.best || v.score;
        if (typeof cand === 'number' && cand > 0) return cand;
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  function isNew(released) {
    var t = Date.parse(released);
    if (isNaN(t)) return false;
    var age = Date.now() - t;
    return age >= 0 && age <= NEW_WINDOW_MS;
  }

  function lastPlayed() {
    try {
      return localStorage.getItem('dodo_last_played');
    } catch (e) {
      return null;
    }
  }

  /* ---- card rendering -------------------------------------------------- */
  function buildCard(game) {
    var a = el('a', 'card card--game');
    a.href = '/' + game.slug;
    a.setAttribute('data-slug', game.slug);
    a.setAttribute('data-genre', game.genre);
    a.setAttribute('data-title', game.title);
    a.setAttribute('data-hook', game.hook);
    a.setAttribute('aria-label', game.title + ' — ' + game.genre + '. ' + game.hook);

    // Thumbnail + badges
    var thumb = el('div', 'card__thumb');
    var badges = el('div', 'card__badges');

    var newBadge = el('span', 'badge badge--new');
    newBadge.textContent = 'New';
    if (!isNew(game.released)) newBadge.hidden = true;

    var resumeBadge = el('span', 'badge badge--resume');
    resumeBadge.setAttribute('data-role', 'resume');
    resumeBadge.textContent = 'Resume';
    if (lastPlayed() !== game.slug) resumeBadge.hidden = true;

    badges.appendChild(newBadge);
    badges.appendChild(resumeBadge);

    var img = el('img');
    img.src = 'assets/images/' + game.slug + '.png';
    img.alt = game.title;
    img.width = 600;
    img.height = 338;
    img.loading = 'lazy';
    img.decoding = 'async';

    thumb.appendChild(badges);
    thumb.appendChild(img);

    // Body
    var body = el('div', 'card__body');
    var top = el('div', 'card__top');
    var title = el('span', 'card__title');
    title.textContent = game.title;
    var genre = el('span', 'card__genre');
    genre.textContent = game.genre;
    top.appendChild(title);
    top.appendChild(genre);

    var hook = el('p', 'card__hook');
    hook.textContent = game.hook;

    var foot = el('div', 'card__foot');
    var best = el('span', 'card__best');
    best.setAttribute('data-role', 'best');
    best.appendChild(icon(PATH_TROPHY));
    var bestVal = el('span');
    bestVal.setAttribute('data-role', 'best-value');
    var b = readBest(game.slug);
    if (b == null) {
      best.hidden = true;
    } else {
      bestVal.textContent = b.toLocaleString();
    }
    best.appendChild(bestVal);

    var play = el('span', 'card__play');
    play.textContent = 'Play \u2192';
    foot.appendChild(best);
    foot.appendChild(play);

    body.appendChild(top);
    body.appendChild(hook);
    body.appendChild(foot);

    a.appendChild(thumb);
    a.appendChild(body);
    return a;
  }

  function buildIdeaCard() {
    var a = el('a', 'card card--idea');
    a.href = 'https://discord.gg/bYqAp4ayYh';
    a.target = '_blank';
    a.rel = 'noopener';
    a.setAttribute('aria-label', 'Got a crazy game idea? Contribute on Discord.');

    var ico = el('span', 'idea-icon');
    ico.appendChild(icon(PATH_IDEA));
    var h = el('h3');
    h.textContent = 'Got a Crazy Idea?';
    var p = el('p');
    p.textContent = 'Contribute to the madness. Vibe-code with us on Discord. Fully open source.';
    var play = el('span', 'card__play');
    play.textContent = 'Submit Idea \u2192';

    a.appendChild(ico);
    a.appendChild(h);
    a.appendChild(p);
    a.appendChild(play);
    return a;
  }

  /* ---- featured spotlight (rotates by day) ----------------------------- */
  function renderFeatured() {
    if (!GAMES.length) return;
    var idx = Math.floor(Date.now() / 86400000) % GAMES.length;
    var g = GAMES[idx];
    var media = document.getElementById('spotlightMedia');
    var title = document.getElementById('spotlightTitle');
    var hook = document.getElementById('spotlightHook');
    var genre = document.getElementById('spotlightGenre');
    var play = document.getElementById('spotlightPlay');

    if (media) {
      while (media.firstChild) media.removeChild(media.firstChild);
      var img = el('img');
      img.src = 'assets/images/' + g.slug + '.png';
      img.alt = g.title;
      img.width = 640;
      img.height = 360;
      img.loading = 'lazy';
      img.decoding = 'async';
      media.appendChild(img);
    }
    if (title) title.textContent = g.title;
    if (hook) hook.textContent = g.hook;
    if (genre) genre.textContent = g.genre;
    if (play) {
      play.href = '/' + g.slug;
      play.setAttribute('data-slug', g.slug);
    }
  }

  /* ---- search + filter ------------------------------------------------- */
  var state = { query: '', genre: 'All' };
  var cardEls = [];
  var ideaEl = null;
  var countEl = null;
  var emptyEl = null;

  function applyFilters() {
    var q = state.query.trim().toLowerCase();
    var shown = 0;
    for (var i = 0; i < cardEls.length; i++) {
      var c = cardEls[i];
      var matchGenre = state.genre === 'All' || c.getAttribute('data-genre') === state.genre;
      var hay = (c.getAttribute('data-title') + ' ' +
        c.getAttribute('data-hook') + ' ' +
        c.getAttribute('data-genre')).toLowerCase();
      var matchQ = q === '' || hay.indexOf(q) !== -1;
      var show = matchGenre && matchQ;
      c.hidden = !show;
      if (show) shown++;
    }
    if (ideaEl) ideaEl.hidden = !(state.genre === 'All' && q === '');
    if (countEl) countEl.textContent = shown + (shown === 1 ? ' game' : ' games');
    if (emptyEl) emptyEl.hidden = shown > 0;
  }

  function buildFilters() {
    var wrap = document.getElementById('filters');
    if (!wrap) return;
    GENRES.forEach(function (genre) {
      var b = el('button', 'chip');
      b.type = 'button';
      b.textContent = genre;
      b.setAttribute('data-genre', genre);
      b.setAttribute('aria-pressed', genre === state.genre ? 'true' : 'false');
      b.addEventListener('click', function () {
        state.genre = genre;
        var chips = wrap.querySelectorAll('.chip');
        for (var k = 0; k < chips.length; k++) {
          chips[k].setAttribute('aria-pressed',
            chips[k].getAttribute('data-genre') === genre ? 'true' : 'false');
        }
        applyFilters();
      });
      wrap.appendChild(b);
    });
  }

  /* ---- boss mode ------------------------------------------------------- */
  function initBossMode() {
    var btn = document.getElementById('bossBtn');
    var overlay = document.getElementById('bossOverlay');
    if (!btn || !overlay) return;
    var originalTitle = document.title;

    function toggle() {
      var open = overlay.classList.toggle('is-open');
      document.title = open ? 'Q3_Budget_Projections_Final_v2.xlsx - Excel' : originalTitle;
      if (typeof DodoAnalytics !== 'undefined') {
        DodoAnalytics.bossMode(open);
      }
    }

    btn.addEventListener('click', toggle);
    overlay.addEventListener('dblclick', toggle);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && overlay.classList.contains('is-open')) toggle();
    });
  }

  /* ---- ambient background (rAF drifting currency glyphs) --------------- */
  function initBackground() {
    window.__bgFrames = 0;
    var canvas = document.getElementById('bg-canvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    var GLYPHS = ['$', '\u20B9', '\u20AC', '\u00A3', '\u00A5', '\u20BF', '%', '\u25C8'];
    var particles = [];
    var w = 0;
    var h = 0;
    var rafId = 0;

    function spawn(anywhere) {
      return {
        x: Math.random() * w,
        y: anywhere ? Math.random() * h : -20,
        vy: 0.25 + Math.random() * 0.85,
        size: 12 + Math.random() * 20,
        alpha: 0.08 + Math.random() * 0.22,
        char: GLYPHS[(Math.random() * GLYPHS.length) | 0],
        drift: (Math.random() - 0.5) * 0.4,
      };
    }

    function resize() {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
      var target = Math.min(64, Math.max(20, Math.floor(w / 34)));
      particles = [];
      for (var i = 0; i < target; i++) particles.push(spawn(true));
    }

    function frame() {
      ctx.clearRect(0, 0, w, h);
      ctx.textBaseline = 'middle';
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        p.y += p.vy;
        p.x += p.drift;
        if (p.y - p.size > h) {
          particles[i] = spawn(false);
          continue;
        }
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = '#C1FF00';
        ctx.font = '600 ' + p.size.toFixed(0) + 'px ui-monospace, "SF Mono", Menlo, monospace';
        ctx.fillText(p.char, p.x, p.y);
      }
      ctx.globalAlpha = 1;
      window.__bgFrames++;
      rafId = requestAnimationFrame(frame);
    }

    function start() {
      if (prefersReduced) return;
      if (rafId) return;
      rafId = requestAnimationFrame(frame);
    }

    function stop() {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
    }

    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop();
      else start();
    });

    resize();
    start();
  }

  /* ---- boot ------------------------------------------------------------ */
  function init() {
    var grid = document.getElementById('grid');
    countEl = document.getElementById('gameCount');
    emptyEl = document.getElementById('emptyState');

    if (grid) {
      var frag = document.createDocumentFragment();
      GAMES.forEach(function (g) {
        var card = buildCard(g);
        cardEls.push(card);
        frag.appendChild(card);
      });
      ideaEl = buildIdeaCard();
      frag.appendChild(ideaEl);
      grid.appendChild(frag);

      grid.addEventListener('click', function (e) {
        var card = e.target.closest ? e.target.closest('.card--game') : null;
        if (card && card.getAttribute('data-slug')) {
          try {
            localStorage.setItem('dodo_last_played', card.getAttribute('data-slug'));
          } catch (err) { /* storage disabled */ }
        }
      });
    }

    var search = document.getElementById('search');
    if (search) {
      search.addEventListener('input', function () {
        state.query = search.value;
        applyFilters();
      });
    }

    buildFilters();
    applyFilters();
    renderFeatured();

    var spotPlay = document.getElementById('spotlightPlay');
    if (spotPlay) {
      spotPlay.addEventListener('click', function () {
        var slug = spotPlay.getAttribute('data-slug');
        if (slug) {
          try { localStorage.setItem('dodo_last_played', slug); } catch (err) { /* noop */ }
        }
      });
    }

    initBossMode();
    initBackground();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
