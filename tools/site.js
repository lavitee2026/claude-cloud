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
    };
    window.addEventListener('hashchange', show);
    show();
  } else {
    initSearch();
  }
})();
