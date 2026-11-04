// 站点脚本：单文件预览的页面切换、全文搜索、深浅色切换、文章页小标题与引用预览。
(function () {
  var app = document.getElementById('app');
  var spa = app && app.classList.contains('spa');

  function initSearch(scope) {
    var input = (scope || document).querySelector('#toc-search');
    if (!input || input.__init) return; input.__init = 1;
    var items = document.querySelectorAll('.toc li');
    var out = document.querySelector('#toc-count');
    function run() {
      var q = input.value.trim();
      var n = 0;
      items.forEach(function (li) { var hit = !q || li.getAttribute('data-text').indexOf(q) >= 0; li.hidden = !hit; if (hit) n++; });
      document.querySelectorAll('.toc-group').forEach(function (g) { g.hidden = !g.querySelector('li:not([hidden])'); });
      if (out) out.textContent = q ? n + ' 篇' : '';
    }
    input.addEventListener('input', run);
  }


  // ---------- 全文搜索 ----------
  function initSiteSearch(scope) {
    var input = (scope || document).querySelector('#site-q');
    if (!input || input.__init) return; input.__init = 1;
    var list = document.getElementById('site-results'), out = document.getElementById('site-q-count');
    var base = (app && app.getAttribute('data-base')) || '';
    var index = window.__SEARCH || null;
    function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
    function load(cb) {
      if (index) return cb();
      fetch(base + 'assets/search-index.json').then(function (r) { return r.json(); }).then(function (d) { index = d; cb(); }).catch(function () { out.textContent = '索引加载失败，请刷新重试'; });
    }
    function snippet(x, terms) {
      var i = x.indexOf(terms[0]); if (i < 0) i = 0;
      var s = Math.max(0, i - 30), seg = x.slice(s, s + 110);
      var h = esc(seg);
      terms.forEach(function (t) { if (t) h = h.split(esc(t)).join('<mark>' + esc(t) + '</mark>'); });
      return (s > 0 ? '……' : '') + h + '……';
    }
    function run() {
      var q = input.value.trim();
      if (!q) { list.innerHTML = ''; out.textContent = ''; return; }
      load(function () {
        var terms = q.split(/\s+/).filter(Boolean);
        var hits = index.map(function (d) {
          var all = d.t + ' ' + d.s + ' ' + d.x, score = 0;
          for (var k = 0; k < terms.length; k++) {
            var t = terms[k]; if (all.indexOf(t) < 0) return null;
            if (d.t.indexOf(t) >= 0) score += 10; if (d.s.indexOf(t) >= 0) score += 5;
            score += Math.min(10, d.x.split(t).length - 1);
          }
          return { d: d, score: score };
        }).filter(Boolean).sort(function (a, b) { return b.score - a.score; }).slice(0, 30);
        out.textContent = hits.length ? '找到 ' + hits.length + ' 页' + (hits.length === 30 ? '，只显示前 30 页' : '') : '没有找到，换一个说法试试';
        list.innerHTML = hits.map(function (h) {
          var href = spa ? '#' + h.d.k : base + h.d.u;
          return '<li><a href="' + href + '"><span class="t">' + esc(h.d.t) + '</span> <span class="sub">' + esc(h.d.s) + '</span></a><span class="rc">' + esc(h.d.c) + '</span><p>' + snippet(h.d.x, terms) + '</p></li>';
        }).join('');
      });
    }
    var timer; input.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(run, 120); });
    try { var q0 = new URLSearchParams(location.search).get('q'); if (q0 && !spa) { input.value = q0; run(); } } catch (e) {}
  }

  // ---------- 深浅色切换 ----------
  var darkMq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  function themeNow() {
    var t = document.documentElement.getAttribute('data-theme');
    return t || (darkMq && darkMq.matches ? 'dark' : 'light');
  }
  function syncThemeButtons() {
    var dark = themeNow() === 'dark';
    document.querySelectorAll('[data-theme-toggle]').forEach(function (b) {
      b.hidden = false;
      b.textContent = dark ? '浅色' : '深色';
      b.setAttribute('aria-label', dark ? '切换到浅色' : '切换到深色');
    });
  }
  function initTheme() {
    document.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-theme-toggle]');
      if (!b) return;
      var next = themeNow() === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (err) {}
      syncThemeButtons();
    });
    if (darkMq && darkMq.addEventListener) darkMq.addEventListener('change', syncThemeButtons);
    syncThemeButtons();
  }

  // ---------- 文章页：小标题随滚动标出当前节，引用编号点开预览 ----------
  var wideMq = window.matchMedia ? window.matchMedia('(min-width: 1200px)') : { matches: false };
  var layouts = [];
  var sheet = null, openState = null;

  function spy() {
    layouts.forEach(function (L) {
      if (!L.el.offsetParent) return;
      var cur = null;
      for (var i = 0; i < L.heads.length; i++) { if (L.heads[i].getBoundingClientRect().top < 120) cur = L.heads[i]; else break; }
      var id = cur ? cur.id : '';
      if (id === L.cur) return; L.cur = id;
      L.links.forEach(function (a) { if (a.getAttribute('href') === '#' + id) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
    });
  }
  var spyQueued = false;
  window.addEventListener('scroll', function () { if (spyQueued) return; spyQueued = true; requestAnimationFrame(function () { spyQueued = false; spy(); }); }, { passive: true });

  function refOf(a) {
    var id = decodeURIComponent((a.getAttribute('href') || '').slice(1));
    var li = id && document.getElementById(id);
    return li ? { id: id, n: li.getAttribute('value') || '', text: li.textContent.trim() } : null;
  }
  function fillPreview(box, ref, closeCls) {
    box.innerHTML = '';
    var hd = document.createElement('div'); hd.className = 'hd';
    var lbl = document.createElement('span'); lbl.className = 'lbl'; lbl.textContent = '引用 [' + ref.n + ']';
    var x = document.createElement('button'); x.type = 'button'; x.className = 'cite-x ' + (closeCls || ''); x.textContent = '关闭';
    x.addEventListener('click', function () { closePreview(true); });
    hd.appendChild(lbl); hd.appendChild(x);
    var body = document.createElement('span'); body.textContent = ref.text;
    var go = document.createElement('a'); go.className = 'go'; go.href = '#' + ref.id; go.textContent = '跳到文献表';
    go.addEventListener('click', function () { closePreview(false); });
    box.appendChild(hd); box.appendChild(body); box.appendChild(go);
    return x;
  }
  function closePreview(refocus) {
    if (!openState) return;
    var s = openState; openState = null;
    s.box.hidden = true;
    s.a.classList.remove('on'); s.a.removeAttribute('aria-expanded');
    if (refocus) s.a.focus();
  }
  function openPreview(a, L) {
    var ref = refOf(a); if (!ref) return false;
    if (openState && openState.a === a) { closePreview(true); return true; }
    closePreview(false);
    var box, focusEl;
    if (wideMq.matches && L.rail) {
      box = L.card;
      fillPreview(box, ref);
      box.hidden = false;
      var top = a.getBoundingClientRect().top - L.rail.getBoundingClientRect().top - 10;
      top = Math.max(0, Math.min(top, L.rail.offsetHeight - box.offsetHeight));
      box.style.top = top + 'px';
    } else {
      if (!sheet) {
        sheet = document.createElement('div');
        sheet.className = 'cite-sheet'; sheet.setAttribute('role', 'dialog'); sheet.hidden = true;
        document.body.appendChild(sheet);
      }
      box = sheet;
      box.setAttribute('aria-label', '引用 [' + ref.n + ']');
      var inner = document.createElement('div'); inner.className = 'in';
      var grip = document.createElement('span'); grip.className = 'grip'; grip.setAttribute('aria-hidden', 'true');
      box.innerHTML = ''; inner.appendChild(grip); box.appendChild(inner);
      var wrapEl = document.createElement('div'); wrapEl.style.display = 'contents'; inner.appendChild(wrapEl);
      focusEl = fillPreview(wrapEl, ref);
      box.hidden = false;
    }
    a.classList.add('on'); a.setAttribute('aria-expanded', 'true');
    openState = { a: a, box: box };
    if (focusEl) focusEl.focus();
    return true;
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && openState) closePreview(true); });
  document.addEventListener('click', function (e) {
    if (!openState) return;
    if (openState.box.contains(e.target) || e.target.closest('sup.cite')) return;
    closePreview(false);
  });
  if (wideMq.addEventListener) wideMq.addEventListener('change', function () { closePreview(false); });

  function initArticle(scope) {
    (scope || document).querySelectorAll('.art-layout').forEach(function (el) {
      if (el.__init) return; el.__init = 1;
      var L = { el: el, cur: null, links: Array.prototype.slice.call(el.querySelectorAll('.toc-list a')), rail: el.querySelector('.cite-rail') };
      var seen = {};
      L.heads = [];
      L.links.forEach(function (a) {
        var id = decodeURIComponent(a.getAttribute('href').slice(1));
        if (seen[id]) return; seen[id] = 1;
        var h = document.getElementById(id); if (h) L.heads.push(h);
      });
      if (L.rail) {
        L.card = document.createElement('div'); L.card.className = 'cite-card'; L.card.hidden = true; L.card.setAttribute('aria-live', 'polite');
        L.rail.appendChild(L.card);
      }
      el.querySelectorAll('sup.cite a').forEach(function (a) {
        a.addEventListener('click', function (e) {
          if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
          if (openPreview(a, L)) e.preventDefault();
        });
      });
      layouts.push(L);
    });
    spy();
  }

  initTheme();

  if (spa) {
    var pages = document.querySelectorAll('.page');
    var show = function () {
      var h = decodeURIComponent(location.hash.slice(1)) || 'home';
      var page = document.getElementById('p-' + h), target = null;
      if (!page) { target = document.getElementById(h); page = target ? target.closest('.page') : document.getElementById('p-home'); }
      pages.forEach(function (p) { p.hidden = p !== page; });
      if (target) target.scrollIntoView(); else window.scrollTo(0, 0);
      if (page.getAttribute('data-title')) document.title = page.getAttribute('data-title');
      if (window.__figInit) window.__figInit(page);
      initSearch(page);
      initSiteSearch(page);
      initArticle(page);
    };
    window.addEventListener('hashchange', show);
    show();
  } else {
    initSearch();
    initSiteSearch();
    initArticle();
  }
})();
