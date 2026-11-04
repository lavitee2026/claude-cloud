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

  // ---------- 维持成本计算器 ----------
  function initCost(root) {
    var $ = function (id) { return root.querySelector('#cc-' + id); };
    var fmt = function (n) { return Math.round(n).toLocaleString('zh-CN'); };
    function run() {
      var price = Math.max(0, +$('price').value || 0), months = Math.max(0.5, +$('months').value || 0.5);
      var extra = Math.max(0, +$('extra').value || 0), years = Math.max(1, Math.round(+$('years').value || 1)), days = Math.max(0, +$('days').value || 0);
      var per = 12 / months, first = per + extra, total = first + per * (years - 1);
      $('per').textContent = (Math.round(per * 10) / 10) + ' 次';
      $('first').textContent = fmt(first * price) + ' 元';
      $('total').textContent = fmt(total * price) + ' 元';
      $('total').previousElementSibling.textContent = years + ' 年合计';
      $('rec').textContent = Math.round(per * days * 10) / 10 + ' 天';
    }
    root.querySelectorAll('input').forEach(function (i) { i.addEventListener('input', run); });
    run();
  }


  // ---------- 通用：芯片组单选 ----------
  function chips(root, onChange) {
    root.querySelectorAll('.chip[data-g]').forEach(function (c) {
      c.addEventListener('click', function () {
        var g = c.getAttribute('data-g');
        root.querySelectorAll('.chip[data-g="' + g + '"]').forEach(function (o) { o.classList.toggle('on', o === c); o.setAttribute('aria-pressed', o === c ? 'true' : 'false'); });
        onChange();
      });
    });
    return function (g) { var on = root.querySelector('.chip[data-g="' + g + '"].on'); return on ? on.getAttribute('data-v') : ''; };
  }

  // ---------- 03 对照表 ----------
  function initCompare(root) {
    var tbody = root.querySelector('tbody'), rows = Array.prototype.slice.call(tbody.rows), sort = root.querySelector('#cmp-sort'), count = root.querySelector('.cmp-count');
    var get = chips(root, run);
    function run() {
      var cat = get('cat'), rev = get('rev'), n = 0;
      var list = rows.slice();
      if (sort.checked) list.sort(function (a, b) { return +a.getAttribute('data-rec') - +b.getAttribute('data-rec'); });
      list.forEach(function (r) {
        var hit = (!cat || r.getAttribute('data-cat') === cat) && (!rev || r.getAttribute('data-rev') === rev);
        r.hidden = !hit; if (hit) n++; tbody.appendChild(r);
      });
      count.textContent = '显示 ' + n + ' 个项目';
    }
    sort.addEventListener('change', run); run();
  }

  // ---------- 12 选择性光热作用 ----------
  function initSpt(root) {
    var s = function (id) { return root.querySelector('#spt-' + id); };
    var st = root.querySelector('.spt-status'), msg = s('msg');
    var get = chips(root, reset);
    function reset() {
      s('beam').setAttribute('opacity', '0');
      s('pig').setAttribute('r', '9'); s('halo').setAttribute('r', '10'); s('halo').style.opacity = 0;
      s('ves').classList.remove('hot'); s('ves-halo').setAttribute('rx', '26'); s('ves-halo').setAttribute('ry', '12'); s('ves-halo').style.opacity = 0;
      msg.textContent = '选好条件后点「照射」'; st.textContent = '';
    }
    function fire() {
      reset();
      var target = get('target'), wave = get('wave'), pulse = get('pulse');
      s('beam').setAttribute('opacity', '1');
      setTimeout(function () {
        if (wave === 'off') {
          msg.textContent = '目标几乎不吸收';
          st.textContent = '波长没有对准目标，光能大多没有被目标吸收，目标的变化很小，能量被其他组织分散吸收。';
          return;
        }
        var spread = pulse === 'long';
        if (target === '色素') {
          s('pig').setAttribute('r', '11');
          s('halo').style.opacity = spread ? 0.28 : 0.18; s('halo').setAttribute('r', spread ? '46' : '14');
        } else {
          s('ves').classList.add('hot');
          s('ves-halo').style.opacity = spread ? 0.28 : 0.18; s('ves-halo').setAttribute('rx', spread ? '70' : '30'); s('ves-halo').setAttribute('ry', spread ? '44' : '15');
        }
        msg.textContent = spread ? '热量扩散到周围组织' : '热量留在目标里';
        st.textContent = spread
          ? '脉冲时间过长，目标吸收的热量来得及传到周围，周围组织也被加热，烫伤和色素改变的风险随之增加。'
          : '波长被目标优先吸收，脉冲时间又足够短，热量集中在目标里，周围组织少受损伤，这就是选择性光热作用。';
      }, reduce ? 0 : 450);
    }
    root.querySelector('.spt-fire').addEventListener('click', fire);
    reset();
  }

  // ---------- 18 毛囊周期 ----------
  function initHair(root) {
    var NS = 'http://www.w3.org/2000/svg', g = root.querySelector('#hair-g'), legend = root.querySelector('#hair-legend'), st = root.querySelector('.hair-status');
    var START = ['g', 'r', 's', 'g', 's', 'r', 'g', 's', 'g', 'r', 's', 'g', 's', 'r', 'g', 's'];
    var NEXT = { g: 'r', r: 's', s: 'g' }, NAME = { g: '生长期', r: '退行期', s: '休止期' };
    var f, rounds;
    function el(tag, a) { var e = document.createElementNS(NS, tag); for (var k in a) e.setAttribute(k, a[k]); return e; }
    function draw() {
      while (g.firstChild) g.removeChild(g.firstChild);
      f.forEach(function (x, i) {
        var cx = 50 + i * 36, deep = x.p === 'g' ? 150 : x.p === 'r' ? 122 : 100;
        if (x.hit < 2) {
          var top = x.p === 's' ? 66 : x.p === 'r' ? 46 : 26;
          g.appendChild(el('line', { x1: cx, y1: deep, x2: cx, y2: top, class: 'hair-s' + (x.hit === 1 ? ' thin' : '') }));
        }
        g.appendChild(el('circle', { cx: cx, cy: deep + 4, r: x.p === 'g' ? 7 : 5, class: 'bulb' + (x.hit >= 2 ? ' dead' : x.p === 'g' ? '' : ' rest') }));
      });
    }
    function legendDraw() {
      var items = [['bulb', '生长期，毛球大、黑色素多'], ['bulb rest', '退行期或休止期'], ['bulb dead', '受损，不再长出']];
      items.forEach(function (it, i) { legend.appendChild(el('circle', { cx: i * 200 + 6, cy: 0, r: 6, class: it[0] })); var t = el('text', { x: i * 200 + 18, y: 4, 'font-size': 12 }); t.textContent = it[1]; legend.appendChild(t); });
    }
    function status() {
      var dead = f.filter(function (x) { return x.hit >= 2; }).length, thin = f.filter(function (x) { return x.hit === 1; }).length, grow = f.filter(function (x) { return x.p === 'g' && x.hit < 2; }).length;
      st.textContent = rounds === 0
        ? '毛囊处在不同阶段，此刻只有 ' + grow + ' 个处在生长期。点按钮做一次治疗。'
        : '已做 ' + rounds + ' 次：' + dead + ' 个受损不再长出，' + thin + ' 个变细，' + (f.length - dead - thin) + ' 个还没有被处理到。';
    }
    function step() {
      rounds++;
      f.forEach(function (x) { if (x.p === 'g' && x.hit < 2) x.hit++; });
      f.forEach(function (x) { x.p = NEXT[x.p]; });
      draw(); status();
    }
    function reset() { f = START.map(function (p) { return { p: p, hit: 0 }; }); rounds = 0; draw(); status(); }
    root.querySelector('.hair-go').addEventListener('click', step);
    root.querySelector('.hair-reset').addEventListener('click', reset);
    legendDraw(); reset();
  }

  // ---------- 22 填充材料时间轴 ----------
  function initFillers(root) {
    var data = JSON.parse(root.getAttribute('data-rows')), panel = root.querySelector('.fl-panel'), rows = root.querySelectorAll('.fl-row');
    function show(i) {
      rows.forEach(function (r) { r.classList.toggle('on', +r.getAttribute('data-i') === i); });
      var d = data[i];
      panel.innerHTML = '<b>' + d.name + '</b>　起效　' + d.onsetText + '。维持　' + d.keepText + '。' + d.dissolve + '。';
    }
    rows.forEach(function (r) {
      var i = +r.getAttribute('data-i');
      r.addEventListener('click', function () { show(i); });
      r.addEventListener('focus', function () { show(i); });
      r.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); show(i); } });
    });
    show(0);
  }

  function init(scope) {
    var reg = { compare: initCompare, spt: initSpt, hair: initHair, fillers: initFillers };
    Object.keys(reg).forEach(function (k) { (scope || document).querySelectorAll('[data-fig=' + k + ']').forEach(function (el) { if (!el.__init) { el.__init = 1; reg[k](el); } }); });
    (scope || document).querySelectorAll('[data-fig=cost]').forEach(function (el) { if (!el.__init) { el.__init = 1; initCost(el); } });
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
