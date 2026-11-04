// 站点脚本：单文件预览的页面切换、首页篇目搜索。
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
    };
    window.addEventListener('hashchange', show);
    show();
  } else {
    initSearch();
    initSiteSearch();
  }
})();
