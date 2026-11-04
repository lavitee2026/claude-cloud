// 站点里图的交互。无依赖；尊重「减少动态效果」设置。
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- 面部高风险部位 ----------
  function initFace(root) {
    var data = JSON.parse(root.getAttribute('data-zones'));
    var panel = root.querySelector('.face-panel');
    var zones = root.querySelectorAll('.zone');
    function show(id) {
      zones.forEach(function (z) { z.classList.toggle('on', z.getAttribute('data-zone') === id); z.setAttribute('aria-pressed', z.getAttribute('data-zone') === id ? 'true' : 'false'); });
      var d = data[id];
      panel.innerHTML = '<p class="fp-name">' + d.name + '</p>' +
        '<p class="fp-text">' + d.vessel + '</p>' +
        '<dl class="fp-num"><div><dt>2015 年综述</dt><dd>' + d.p15 + '</dd></div><div><dt>2019 年更新</dt><dd>' + d.p19 + '</dd></div></dl>' +
        '<p class="fp-note">注射后视力损害病例中涉及该部位的比例</p>';
    }
    zones.forEach(function (z) {
      var id = z.getAttribute('data-zone');
      z.addEventListener('click', function () { show(id); });
      z.addEventListener('mouseenter', function () { show(id); });
      z.addEventListener('focus', function () { show(id); });
      z.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); show(id); } });
    });
    show(root.getAttribute('data-default') || 'nose');
  }

  // ---------- 肉毒毒素 ----------
  function effect(t) {
    if (t < 3) return 0;
    if (t < 14) { var u = (t - 3) / 11; return u * u * (3 - 2 * u); }
    if (t < 80) return 1;
    if (t < 160) return 0.5 * (1 + Math.cos(Math.PI * (t - 80) / 80));
    return 0;
  }
  function status(t) {
    if (t < 3) return '药物尚未起效，神经照常释放乙酰胆碱，肌肉收缩，做表情时出现皱纹。';
    if (t < 14) return '乙酰胆碱的释放被阻断，肌肉收缩逐渐减弱，皱纹变浅。';
    if (t < 80) return '效果稳定，做表情时皱纹明显减少。';
    if (t < 160) return '神经末梢长出新的连接，肌肉收缩逐渐恢复，皱纹重新出现。';
    return '效果基本消退，要维持需要再次注射。';
  }
  function initBotox(root) {
    var svg = root.querySelector('svg');
    var NS = 'http://www.w3.org/2000/svg';
    var stripes = svg.querySelector('#bx-stripes'), ach = svg.querySelector('#bx-ach');
    var muscle = svg.querySelector('#bx-muscle'), skin = svg.querySelector('#bx-skin');
    var block = svg.querySelector('#bx-block'), cursor = svg.querySelector('#bx-cursor'), dot = svg.querySelector('#bx-dot');
    var range = root.querySelector('input[type=range]'), btn = root.querySelector('button'), out = root.querySelector('.bx-day'), st = root.querySelector('.bx-status');
    var stripeEls = [], achEls = [];
    for (var i = 0; i < 15; i++) { var l = document.createElementNS(NS, 'line'); l.setAttribute('class', 'stripe'); stripes.appendChild(l); stripeEls.push(l); }
    for (var k = 0; k < 6; k++) { var c = document.createElementNS(NS, 'circle'); c.setAttribute('r', '3'); c.setAttribute('class', 'ach'); ach.appendChild(c); achEls.push(c); }
    var t = 0, phase = 0, playing = false, last = 0;
    function X(d) { return 70 + d / 180 * 520; }
    function Y(e) { return 300 - e * 70; }
    function draw() {
      var e = effect(t), act = 1 - e;
      var pulse = playing && !reduce ? 0.5 - 0.5 * Math.cos(2 * Math.PI * phase) : 1;
      var c = act * pulse;
      var w = 200 * (1 - 0.22 * c), x0 = 150 - w / 2;
      muscle.setAttribute('x', x0.toFixed(1)); muscle.setAttribute('width', w.toFixed(1));
      stripeEls.forEach(function (l, i) { var x = x0 + (i + 0.5) * w / stripeEls.length; l.setAttribute('x1', x.toFixed(1)); l.setAttribute('x2', x.toFixed(1)); l.setAttribute('y1', '114'); l.setAttribute('y2', '150'); });
      var n = Math.round(6 * act);
      achEls.forEach(function (el, i) {
        var visible = i < n;
        var y = 86 + ((phase * 1.6 + i / 6) % 1) * 22;
        el.setAttribute('cx', String(95 + i * 22)); el.setAttribute('cy', (playing && !reduce ? y : 96).toFixed(1));
        el.setAttribute('opacity', visible ? '1' : '0');
      });
      block.setAttribute('opacity', e.toFixed(2));
      var amp = 2 + 16 * c, d = 'M300 100';
      for (var x = 300; x <= 600; x += 4) { var yy = 100 - amp * Math.pow(Math.abs(Math.sin((x - 300) / 300 * Math.PI * 3)), 3); d += ' L' + x + ' ' + yy.toFixed(1); }
      skin.setAttribute('d', d);
      cursor.setAttribute('x1', X(t).toFixed(1)); cursor.setAttribute('x2', X(t).toFixed(1));
      dot.setAttribute('cx', X(t).toFixed(1)); dot.setAttribute('cy', Y(e).toFixed(1));
      range.value = String(Math.round(t));
      out.textContent = '注射后第 ' + Math.round(t) + ' 天';
      st.textContent = status(t);
    }
    function frame(ts) {
      if (!playing) return;
      var dt = last ? Math.min(0.05, (ts - last) / 1000) : 0; last = ts;
      t += dt * (reduce ? 0 : 15); phase = (phase + dt / 1.2) % 1;
      if (t >= 180) { t = 180; stop(); draw(); return; }
      draw(); requestAnimationFrame(frame);
    }
    var steps = [0, 7, 30, 120, 170], si = 0, timer = null;
    function play() {
      if (t >= 180) t = 0;
      playing = true; btn.textContent = '暂停'; btn.setAttribute('aria-pressed', 'true');
      if (reduce) { si = 0; timer = setInterval(function () { t = steps[si++]; draw(); if (si >= steps.length) stop(); }, 1400); }
      else { last = 0; requestAnimationFrame(frame); }
    }
    function stop() { playing = false; btn.textContent = '播放'; btn.setAttribute('aria-pressed', 'false'); if (timer) { clearInterval(timer); timer = null; } draw(); }
    btn.addEventListener('click', function () { playing ? stop() : play(); });
    range.addEventListener('input', function () { if (playing) stop(); t = Number(range.value); draw(); });
    draw();
  }

  function init(scope) {
    (scope || document).querySelectorAll('[data-fig=face]').forEach(function (el) { if (!el.__init) { el.__init = 1; initFace(el); } });
    (scope || document).querySelectorAll('[data-fig=botox]').forEach(function (el) { if (!el.__init) { el.__init = 1; initBotox(el); } });
  }
  window.__figInit = init;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { init(); }); else init();
})();

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
