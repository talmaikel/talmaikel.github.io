(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(pointer: fine)').matches;
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  /* ---------- Toast ---------- */
  var toastEl = $('#toast'), toastTimer;
  function toast(text) {
    toastEl.textContent = text;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 2200);
  }

  /* ---------- Scroll progress bar ---------- */
  var bar = $('.progress span');
  function onScroll() {
    var h = document.documentElement;
    var max = h.scrollHeight - h.clientHeight;
    bar.style.transform = 'scaleX(' + (max > 0 ? h.scrollTop / max : 0) + ')';
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Cursor spotlight ---------- */
  if (finePointer && !reduceMotion) {
    var spot = $('.spotlight'), raf = 0, mx = 0, my = 0;
    document.addEventListener('pointermove', function (e) {
      mx = e.clientX; my = e.clientY;
      if (!raf) raf = requestAnimationFrame(function () {
        spot.style.setProperty('--x', mx + 'px');
        spot.style.setProperty('--y', my + 'px');
        spot.classList.add('on');
        raf = 0;
      });
    });
    document.addEventListener('pointerleave', function () { spot.classList.remove('on'); });
  }

  /* ---------- Typed eyebrow ---------- */
  var typed = $('.typed');
  if (typed && !reduceMotion) {
    var full = typed.getAttribute('data-type'), i = 0;
    typed.setAttribute('aria-label', full);
    typed.textContent = '';
    (function tick() {
      typed.textContent = full.slice(0, ++i);
      if (i < full.length) setTimeout(tick, 28 + Math.random() * 40);
    })();
  }

  /* ---------- Reveal on scroll + scramble headings ---------- */
  var GLYPHS = '01<>/_{}[]#*+=';
  function scramble(el) {
    if (el.dataset.done) return;
    el.dataset.done = '1';
    var nodes = [];
    (function walk(n) {
      n.childNodes.forEach(function (c) {
        if (c.nodeType === 3 && c.textContent.trim()) nodes.push({ node: c, text: c.textContent });
        else if (c.nodeType === 1) walk(c);
      });
    })(el);
    el.setAttribute('aria-label', (el.innerText || el.textContent).replace(/\s+/g, ' ').trim());
    var frame = 0, total = 22;
    (function step() {
      frame++;
      nodes.forEach(function (n) {
        var revealUpTo = Math.floor((frame / total) * n.text.length);
        var out = '';
        for (var k = 0; k < n.text.length; k++) {
          var ch = n.text[k];
          out += (k < revealUpTo || ch === ' ') ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0];
        }
        n.node.textContent = out;
      });
      if (frame < total) requestAnimationFrame(step);
      else nodes.forEach(function (n) { n.node.textContent = n.text; });
    })();
  }

  if ('IntersectionObserver' in window && !reduceMotion) {
    document.documentElement.classList.add('js-reveal');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        if (e.target.hasAttribute('data-scramble')) scramble(e.target);
        else e.target.classList.add('in');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    $$('.reveal, [data-scramble]').forEach(function (el) { io.observe(el); });
  }

  /* ---------- Stack band: light up each layer in turn ---------- */
  var toks = $$('.stack .tok');
  if (toks.length && !reduceMotion) {
    var t = 0;
    setInterval(function () {
      toks.forEach(function (el) { el.classList.remove('lit'); });
      toks[t % toks.length].classList.add('lit');
      t++;
    }, 900);
  }

  /* ---------- Magnetic primary buttons ---------- */
  if (finePointer && !reduceMotion) {
    $$('.btn-primary, .nav .btn-cv').forEach(function (b) {
      b.addEventListener('pointermove', function (e) {
        var r = b.getBoundingClientRect();
        var dx = (e.clientX - (r.left + r.width / 2)) / r.width;
        var dy = (e.clientY - (r.top + r.height / 2)) / r.height;
        b.style.transform = 'translate(' + (dx * 6).toFixed(1) + 'px,' + (dy * 6).toFixed(1) + 'px)';
      });
      b.addEventListener('pointerleave', function () { b.style.transform = ''; });
    });
  }

  /* ---------- Ask my agent ---------- */
  var agentUrl = ($('meta[name="agent-url"]') || {}).content || '';
  var log = $('#agent-log'), form = $('#agent-form'), input = $('#agent-input'), chips = $('#agent-chips');
  var history = [], busy = false;

  if (!agentUrl) {
    var status = $('.term-bar .muted');
    if (status) status.textContent = ' · offline';
    $('.terminal').classList.add('offline');
  }

  function addMsg(role, text) {
    var wrap = document.createElement('div');
    wrap.className = 'msg ' + (role === 'user' ? 'me' : 'bot');
    var who = document.createElement('span');
    who.className = 'who mono';
    who.textContent = role === 'user' ? 'you' : 'agent';
    var p = document.createElement('p');
    wrap.appendChild(who);
    wrap.appendChild(p);
    log.appendChild(wrap);
    if (role === 'user' || reduceMotion) {
      p.textContent = text;
    } else {
      // Stream the reply in, word by word.
      var words = text.split(/(\s+)/), w = 0;
      (function next() {
        p.textContent += words.slice(w, w + 3).join('');
        w += 3;
        log.scrollTop = log.scrollHeight;
        if (w < words.length) setTimeout(next, 22);
      })();
    }
    log.scrollTop = log.scrollHeight;
    return wrap;
  }

  function thinking() {
    var el = document.createElement('div');
    el.className = 'msg bot thinking';
    el.innerHTML = '<span class="who mono">agent</span><p><span class="dots" aria-label="Thinking"><i></i><i></i><i></i></span></p>';
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
    return el;
  }

  function ask(q) {
    q = (q || '').trim();
    if (!q || busy) return;
    busy = true;
    form.classList.add('busy');
    addMsg('user', q);
    history.push({ role: 'user', content: q });
    input.value = '';
    chips.hidden = true;

    if (!agentUrl) {
      setTimeout(function () {
        addMsg('bot', "I'm not switched on yet. In the meantime, you can email Tal at talmaikel123@gmail.com or download the CV above.");
        busy = false; form.classList.remove('busy');
      }, 500);
      return;
    }

    var dots = thinking();
    fetch(agentUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: history.slice(-12) })
    })
      .then(function (r) { return r.json().catch(function () { return {}; }); })
      .then(function (data) {
        dots.remove();
        var text = data.reply || data.error || 'Something went wrong. Please try again.';
        if (data.reply) history.push({ role: 'assistant', content: data.reply });
        else history.pop();
        addMsg('bot', text);
      })
      .catch(function () {
        dots.remove();
        history.pop();
        addMsg('bot', "I couldn't connect. Please try again, or email Tal at talmaikel123@gmail.com.");
      })
      .then(function () { busy = false; form.classList.remove('busy'); });
  }

  form.addEventListener('submit', function (e) { e.preventDefault(); ask(input.value); });
  chips.addEventListener('click', function (e) {
    var b = e.target.closest('.chip');
    if (b) ask(b.textContent);
  });

  // Hide the floating button while the agent section is on screen.
  var fab = $('.fab'), agentSec = $('#agent');
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      fab.classList.toggle('hide', es[0].isIntersecting);
    }, { threshold: 0.2 }).observe(agentSec);
  }
  fab.addEventListener('click', function () { setTimeout(function () { input.focus({ preventScroll: true }); }, 450); });

  /* ---------- Command palette (⌘K / Ctrl+K) ---------- */
  var palette = $('#palette'), pInput = $('#palette-input'), pList = $('#palette-list'), active = 0;
  function go(id) { return function () { document.getElementById(id).scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' }); }; }
  function open(url) { return function () { window.open(url, '_blank', 'noopener'); }; }
  var commands = [
    { label: 'Ask my agent', hint: 'chat', run: function () { go('agent')(); setTimeout(function () { input.focus({ preventScroll: true }); }, 450); } },
    { label: 'Go to selected work', hint: '/work', run: go('work') },
    { label: 'Go to about', hint: '/about', run: go('about') },
    { label: 'Go to contact', hint: '/contact', run: go('contact') },
    { label: 'Download CV (PDF)', hint: 'cv.pdf', run: function () { var a = document.createElement('a'); a.href = 'assets/Tal_Mikel_CV.pdf'; a.download = ''; document.body.appendChild(a); a.click(); a.remove(); } },
    { label: 'Copy email address', hint: 'email', run: function () {
        var email = 'talmaikel123@gmail.com';
        (navigator.clipboard ? navigator.clipboard.writeText(email) : Promise.reject())
          .then(function () { toast('Email copied: ' + email); }, function () { toast(email); });
      } },
    { label: 'Open GitHub', hint: '↗', run: open('https://github.com/talmaikel') },
    { label: 'Open LinkedIn', hint: '↗', run: open('https://linkedin.com/in/tal-mikel-software-developer') },
    { label: 'Visit gng139.online', hint: '↗', run: open('https://www.gng139.online') }
  ];
  var filtered = commands;

  function render() {
    var q = pInput.value.toLowerCase().trim();
    filtered = commands.filter(function (c) { return c.label.toLowerCase().indexOf(q) !== -1; });
    if (active >= filtered.length) active = 0;
    pList.innerHTML = '';
    filtered.forEach(function (c, idx) {
      var li = document.createElement('li');
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', idx === active ? 'true' : 'false');
      li.id = 'cmd-' + idx;
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.tabIndex = -1;
      btn.innerHTML = '<span></span><span class="mono muted"></span>';
      btn.firstChild.textContent = c.label;
      btn.lastChild.textContent = c.hint;
      btn.addEventListener('click', function () { runCmd(c); });
      btn.addEventListener('pointermove', function () { if (active !== idx) { active = idx; render(); } });
      li.appendChild(btn);
      pList.appendChild(li);
    });
    if (!filtered.length) {
      var empty = document.createElement('li');
      empty.className = 'empty mono muted';
      empty.textContent = 'No match. Try "cv" or "agent".';
      pList.appendChild(empty);
    }
    pInput.setAttribute('aria-activedescendant', filtered.length ? 'cmd-' + active : '');
  }
  function openPalette() {
    if (palette.open) return;
    pInput.value = ''; active = 0; render();
    palette.showModal();
    pInput.focus();
  }
  function runCmd(c) { palette.close(); c.run(); }

  document.addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); palette.open ? palette.close() : openPalette(); }
  });
  $$('[data-open-palette]').forEach(function (b) { b.addEventListener('click', openPalette); });
  pInput.addEventListener('input', function () { active = 0; render(); });
  pInput.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); active = (active + 1) % Math.max(filtered.length, 1); render(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); active = (active - 1 + filtered.length) % Math.max(filtered.length, 1); render(); }
    else if (e.key === 'Enter') { e.preventDefault(); if (filtered[active]) runCmd(filtered[active]); }
  });
  palette.addEventListener('click', function (e) { if (e.target === palette) palette.close(); });

  // Show the right shortcut for the visitor's OS.
  if (!/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)) {
    $$('.kbd-btn kbd').forEach(function (k) { k.textContent = 'Ctrl K'; });
  }

  /* ---------- Hello, fellow developer ---------- */
  try {
    console.log('%c tal_mikel_ ', 'background:#C8F135;color:#0B0D10;font:600 14px monospace;padding:4px 6px;border-radius:4px',
      '\nOpening devtools? You\'re my kind of person.\nPress ⌘K / Ctrl+K on the page, or say hi: talmaikel123@gmail.com');
  } catch (e) {}
})();
