#!/usr/bin/env node
// 生成网站：site/（多页静态站）与 site-preview/index.html（单文件预览）。
// 依赖 build/figures/ 里预渲染的 mermaid SVG，先运行 npm run figures。
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, listDocs, splitInline, CATEGORIES, DISCLAIMER, INTEREST, SIGNATURE } from './lib.mjs';
import { FIGURES, FIGURE_CSS, FACE_ZONES } from './figures.mjs';
import { PROBLEMS, NEEDS, ENTRIES } from './nav.mjs';

const CONFIG = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/site.config.json'), 'utf-8'));
const SITE_NAME = CONFIG.title;
const BASE = CONFIG.cname ? `https://${CONFIG.cname}/` : CONFIG.baseUrl;
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// ---------- 数据 ----------
const revised = listDocs('content/articles');
const originals = listDocs('content/originals');
const landings = listDocs('content/landing');
const byId = new Map();
for (const d of originals) byId.set(d.meta.id, d);
for (const d of revised) byId.set(d.meta.id, d);
const articles = [...byId.values()].sort((a, b) => a.meta.id.localeCompare(b.meta.id));
const landingBySlug = new Map(landings.map((d) => [d.meta.id, d]));

// ---------- 链接 ----------
// target: 'multi'（depth 为页面所在目录层级）或 'spa'
function linker(target, depth) {
  const up = '../'.repeat(depth);
  return {
    home: () => (target === 'spa' ? '#home' : `${up}index.html`),
    article: (id) => (target === 'spa' ? `#a-${id}` : `${up}a/${id}.html`),
    landing: (slug) => (target === 'spa' ? `#g-${slug}` : `${up}g/${slug}.html`),
    refs: () => (target === 'spa' ? '#refs' : `${up}refs.html`),
    about: () => (target === 'spa' ? '#about' : `${up}about.html`),
    catalog: () => (target === 'spa' ? '#catalog' : `${up}catalog.html`),
    category: (n) => (target === 'spa' ? `#c-${n}` : `${up}c/${n}.html`),
    guides: () => (target === 'spa' ? '#guides' : `${up}guides.html`),
    search: () => (target === 'spa' ? '#search' : `${up}search.html`),
    anchor: (id) => `#${id}`,
  };
}

// ---------- 行内 ----------
function inline(text, ctx) {
  let html = '';
  for (const part of splitInline(text)) {
    if (part.t === 'cite') {
      const links = part.v.split(',').map((seg) => {
        const first = seg.split(/[-–]/)[0].trim();
        return `<a href="${ctx.link.anchor(`ref-${ctx.docId}-${first}`)}">${esc(seg.trim())}</a>`;
      });
      html += `<sup class="cite">[${links.join(',')}]</sup>`;
    } else {
      let t = esc(part.v);
      // 第 N 篇、第 N、M 篇 → 链接
      t = t.replace(/第 ((?:\d{1,2}(?:、)?)+) 篇/g, (m, nums) => {
        const linked = nums.split('、').filter(Boolean).map((n) => {
          const id = n.padStart(2, '0');
          return byId.has(id) ? `<a href="${ctx.link.article(id)}">${n}</a>` : n;
        }).join('、');
        return `第 ${linked} 篇`;
      });
      html += t;
    }
  }
  return html;
}

// ---------- 图 ----------
function figureHtml(name, ctx) {
  const fig = FIGURES[name];
  let inner;
  if (fig.html) inner = fig.html(ctx);
  else if (fig.kind === 'mermaid') inner = fs.readFileSync(path.join(ROOT, 'build/figures', `${name}.svg`), 'utf-8');
  else if (name === 'face') inner = `<div class="fig-face" data-fig="face" data-default="nose" data-zones="${esc(JSON.stringify(FACE_ZONES))}"><div class="face-svg">${fig.svg()}</div><div class="face-panel" aria-live="polite"></div></div><p class="fig-hint">点选或用 Tab 键切换部位</p>`;
  else if (name === 'botox') inner = `<div class="fig-botox" data-fig="botox">${fig.svg()}<div class="bx-controls"><button type="button" aria-pressed="false">播放</button><label class="sr" for="bx-range-${ctx.docId}">注射后天数</label><input type="range" id="bx-range-${ctx.docId}" min="0" max="180" step="1" value="0"><output class="bx-day">注射后第 0 天</output></div><p class="bx-status" aria-live="polite"></p></div>`;
  else if (name === 'cost') {
    const f = (id, label, v, unit, step = '1') => `<label class="cc-f" for="cc-${id}"><span>${label}</span><span class="cc-in"><input type="number" inputmode="decimal" id="cc-${id}" min="0" step="${step}" value="${v}"><i>${unit}</i></span></label>`;
    inner = `<div class="fig-cost" data-fig="cost"><div class="cc-grid">${f('price', '单次价格', 3000, '元', '100')}${f('months', '维持时间', 4, '个月', '0.5')}${f('extra', '第一年起始疗程另加', 0, '次')}${f('years', '打算坚持', 3, '年')}${f('days', '每次不方便见人', 2, '天')}</div><dl class="cc-out"><div><dt>一年约做</dt><dd id="cc-per">3 次</dd></div><div><dt>第一年花费</dt><dd id="cc-first">9,000 元</dd></div><div><dt>几年合计</dt><dd id="cc-total">27,000 元</dd></div><div><dt>一年的恢复天数</dt><dd id="cc-rec">6 天</dd></div></dl><p class="cc-note">示例数字可以直接改成医生给你的报价和估计。</p></div>`;
  }
  else inner = fig.svg();
  return `<figure class="figure figure-${name}">${inner}<figcaption>${inline(fig.caption, ctx)}</figcaption></figure>`;
}

// ---------- 块 ----------
function blocksHtml(blocks, ctx) {
  let h = '';
  for (const b of blocks) {
    switch (b.type) {
      case 'h2':
        if (b.text === '参考文献') break;
        h += `<h2 id="${ctx.docId}-s${b.line}">${esc(b.text)}</h2>`; break;
      case 'h3': h += `<h3>${esc(b.text)}</h3>`; break;
      case 'p': h += `<p>${inline(b.text, ctx)}</p>`; break;
      case 'ol': h += `<ol>${b.items.map((x) => `<li>${inline(x, ctx)}</li>`).join('')}</ol>`; break;
      case 'ul': h += `<ul>${b.items.map((x) => `<li>${inline(x, ctx)}</li>`).join('')}</ul>`; break;
      case 'table':
        h += `<div class="table-wrap"><table><thead><tr>${b.header.map((c) => `<th scope="col">${inline(c, ctx)}</th>`).join('')}</tr></thead><tbody>${b.rows.map((r) => `<tr>${r.map((c) => `<td>${inline(c, ctx)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
        break;
      case 'emergency':
        h += `<aside class="emergency" aria-label="立即联系治疗机构或去急诊的情况"><p class="em-title">立即联系治疗机构或去急诊的情况</p><ul>${b.items.map((x) => `<li>${inline(x, ctx)}</li>`).join('')}</ul>${b.note ? `<p>${inline(b.note, ctx)}</p>` : ''}</aside>`;
        break;
      case 'figure': h += figureHtml(b.name, ctx); break;
      case 'evidence': h += `<p class="evidence">${inline(b.text, ctx)}</p>`; break;
      case 'refs':
        h += `<p class="refs-title">参考文献</p><ol class="refs">${b.items.map((r) => `<li id="ref-${ctx.docId}-${r.n}" value="${r.n}">${esc(r.text).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" rel="noopener" target="_blank">$1</a>')}</li>`).join('')}</ol>`;
        break;
      default: break;
    }
  }
  return h;
}

// ---------- 页面 ----------
function topbar(link, crumb) {
  return crumb ? `<p class="crumbline">${crumb}</p>` : '';
}

function siteHeader(link, mainId) {
  return `<a class="skip" href="#${mainId}">跳到正文</a><header class="sitebar"><div class="sitebar-in"><a class="site" href="${link.home()}">${SITE_NAME}</a><nav aria-label="站点"><a href="${link.catalog()}">篇目</a><a href="${link.guides()}">导读</a><a href="${link.search()}">搜索</a><a href="${link.refs()}">文献</a><a href="${link.about()}">声明</a></nav></div></header>`;
}

function siteFooter(link, full) {
  const head = full ? `<p>${esc(DISCLAIMER)}</p><p>${esc(INTEREST)}</p>` : `<p>医美科普，不构成诊断或治疗建议，不推荐任何机构、医生或产品。<a href="${link.about()}">完整声明</a></p>`;
  return `<footer class="sitefoot">${head}<p>${SITE_NAME} · 于意云 何 · 2026 年 11 月修订版</p></footer>`;
}

function articlePage(doc, link) {
  const m = doc.meta;
  const ctx = { link, docId: m.id };
  const idx = articles.findIndex((a) => a.meta.id === m.id);
  const prev = articles[idx - 1], next = articles[idx + 1];
  const related = (m.related || []).filter((id) => byId.has(id) && id !== m.id);
  let h = topbar(link, `<a href="${link.category(CATEGORIES.indexOf(m.category) + 1)}">${esc(m.category)}</a>`);
  h += `<article class="wrap"><header class="art-head"><p class="eyebrow">第 ${Number(m.id)} 篇 · ${esc(m.category)}</p><h1 class="title">${esc(m.title)}</h1><p class="subtitle">${esc(m.subtitle)}</p>`;
  if (m.status === '原稿') h += `<p class="status-note">本篇为原稿，尚未按新体例修订和核查证据，试点确认后修订。</p>`;
  h += `<div class="summary"><b>速读</b>${inline(String(m.summary), ctx)}</div>`;
  if (m.takeaway) h += `<p class="takeaway">${inline(String(m.takeaway), ctx)}</p>`;
  h += `</header><div class="prose">${blocksHtml(doc.blocks, ctx)}</div>`;
  h += `<p class="statement">${esc(DISCLAIMER)}</p><p class="statement">${esc(INTEREST)}</p><p class="signature">${SIGNATURE}</p>`;
  if (related.length) h += `<section class="related"><h2>相关篇目</h2><ul>${related.map((id) => { const r = byId.get(id).meta; return `<li><a href="${link.article(id)}">第 ${Number(id)} 篇 ${esc(r.title)} · ${esc(r.subtitle)}</a></li>`; }).join('')}</ul></section>`;
  h += `<nav class="pager" aria-label="上一篇和下一篇">${prev ? `<a href="${link.article(prev.meta.id)}">上一篇 ${esc(prev.meta.title)}</a>` : '<span></span>'}${next ? `<a href="${link.article(next.meta.id)}">下一篇 ${esc(next.meta.title)}</a>` : '<span></span>'}</nav>`;
  h += `</article>`;
  return { title: `${m.title} · ${m.subtitle}`, body: h, desc: String(m.summary), type: 'article', modified: m.verified, section: m.category };
}

function landingPage(doc, link) {
  const m = doc.meta;
  const ctx = { link, docId: `g-${m.id}` };
  let h = topbar(link, `<a href="${link.guides()}">导读</a> · 按${esc(m.kind)}`);
  h += `<article class="wrap"><header class="art-head"><p class="eyebrow">按${esc(m.kind)}</p><h1 class="title">${esc(m.title)}</h1><p class="subtitle">${esc(m.subtitle)}</p>`;
  h += `<div class="summary"><b>速读</b>${inline(String(m.summary), ctx)}</div><p class="takeaway">${inline(String(m.takeaway), ctx)}</p></header>`;
  h += `<div class="prose">${blocksHtml(doc.blocks, ctx)}</div>`;
  h += `<p class="statement">${esc(DISCLAIMER)}</p><p class="signature">${SIGNATURE}</p></article>`;
  return { title: m.title, body: h, desc: String(m.summary), type: 'article', modified: m.verified, section: `导读 · 按${m.kind}` };
}

function navList(items, link) {
  return `<ul class="navlist">${items.map((x) => {
    if (x.slug && landingBySlug.has(x.slug)) return `<li class="live"><a href="${link.landing(x.slug)}">${esc(x.name)}</a></li>`;
    const first = x.ids[0];
    return `<li><a href="${link.article(first)}">${esc(x.name)}</a><span class="soon">导读待上线</span></li>`;
  }).join('')}</ul>`;
}


// 首页点选图：面部与身体的示意线稿，标签链接到问题导读页
function navMapSvg(link) {
  const L = [
    // [slug, 名称, 标签x, 标签y, 对齐, 点x, 点y]
    ['dongtai', '动态皱纹', 20, 104, 'start', 170, 112],
    ['yanbu', '眼部形态', 20, 168, 'start', 138, 176],
    ['aoxian', '凹陷与容量不足', 20, 214, 'start', 140, 200],
    ['seban', '色斑与肤色不均', 20, 258, 'start', 122, 232],
    ['songchi', '松弛与下垂', 20, 312, 'start', 122, 292],
    ['zhidi', '皮肤质地', 272, 132, 'start', 214, 150],
    ['bibu', '鼻部形态', 272, 184, 'start', 172, 214],
    ['fanhong', '泛红与红血丝', 272, 232, 'start', 214, 232],
    ['dougeng', '痘坑与毛孔', 272, 272, 'start', 208, 258],
    ['gugu', '面部骨骼', 272, 318, 'start', 228, 290],
    ['xiongbu', '胸部', 566, 150, 'start', 500, 150],
    ['tixing', '身体轮廓与脂肪', 566, 214, 'start', 500, 214],
    ['maofa', '多余毛发', 566, 318, 'start', 478, 320],
  ];
  let s = `<svg viewBox="0 0 680 370" class="fig-svg navmap" role="group" aria-label="按部位找问题">`;
  s += `<ellipse cx="170" cy="205" rx="92" ry="128" class="outline"/>`;
  s += `<path d="M122 170 Q140 160 158 170 Q140 180 122 170 Z M182 170 Q200 160 218 170 Q200 180 182 170 Z" class="feat"/>`;
  s += `<path d="M164 185 L160 222 Q170 230 180 222 L176 185" class="feat-thin"/><path d="M148 262 Q170 254 192 262 Q170 274 148 262 Z" class="feat"/>`;
  s += `<circle cx="490" cy="62" r="26" class="outline"/>`;
  s += `<path d="M444 106 Q490 92 536 106 L548 200 Q530 214 528 240 L522 350 M458 350 L452 240 Q450 214 432 200 L444 106 M444 106 L420 220 M536 106 L560 220" class="outline"/>`;
  for (const [slug, name, lx, ly, , px, py] of L) {
    const w = name.length * 14;
    const ex = lx < px ? lx + w + 4 : lx - 4;
    s += `<line x1="${ex}" y1="${ly - 5}" x2="${px}" y2="${py}" class="lead"/><circle cx="${px}" cy="${py}" r="3.5" class="pt"/>`;
    s += `<a href="${link.landing(slug)}"><text x="${lx}" y="${ly}" font-size="14">${name}</text></a>`;
  }
  s += `</svg>`;
  return s;
}

function homePage(link) {
  let h = `<header class="masthead"><h1>${SITE_NAME}</h1><p class="lede">先说清楚要解决的问题，再选方式、查资质、算代价，项目名放在最后。</p><p>44 篇 · 六个子分类 · 24 个导读页 · 2026 年 11 月修订版</p></header>`;
  h += `<aside class="home-urgent" aria-label="紧急情况"><p>注射或手术以后出现下面的情况，立即联系做治疗的机构，联系不上去医院急诊。</p><ul><li>皮肤发白、发灰、发紫，出现网状花纹，疼痛越来越重</li><li>视物模糊、视力下降、眼痛，直接去眼科急诊</li><li>呼吸困难、胸痛、咯血，嘴唇或喉咙发紧肿胀，直接打 120</li></ul><p class="go"><a href="${link.article('41')}">注射后的紧急信号</a> · <a href="${link.article('42')}">外科术后的紧急信号</a> · <a href="${link.landing('buanxin')}">做完不放心</a></p></aside>`;
  h += `<section class="home-section"><h2>从这里读起</h2><div class="entries">${ENTRIES.map((e) => `<div><h3>${esc(e.name)}</h3><ul>${e.ids.map((id) => { const r = byId.get(id).meta; return `<li><a href="${link.article(id)}">${Number(id)} ${esc(r.title)}</a> <span class="sub">${esc(r.subtitle)}</span></li>`; }).join('')}</ul></div>`).join('')}</div></section>`;
  h += `<section class="home-section navmap-wrap"><h2>按部位找问题</h2>${navMapSvg(link)}</section>`;
  h += `<section class="home-section"><h2>按问题</h2>${navList(PROBLEMS, link)}</section>`;
  h += `<section class="home-section"><h2>按处境</h2>${navList(NEEDS, link)}</section>`;
  h += `<section class="home-section"><h2>全部篇目</h2><div class="search"><label class="sr" for="toc-search">搜索篇目</label><input type="search" id="toc-search" placeholder="搜索篇目，如 透明质酸、恢复期、价格"><output id="toc-count"></output></div>`;
  for (const cat of CATEGORIES) {
    const list = articles.filter((a) => a.meta.category === cat);
    h += `<div class="toc-group"><p class="toc-cat">${esc(cat)}</p><ul class="toc">${list.map((a) => { const m = a.meta; const text = esc(`${m.title} ${m.subtitle} ${m.category} ${m.summary}`); return `<li data-text="${text}"><span class="no">${m.id}</span><a href="${link.article(m.id)}"><span class="t">${esc(m.title)}</span> <span class="sub">${esc(m.subtitle)}</span></a><span></span></li>`; }).join('')}</ul></div>`;
  }
  h += `</section>`;
  return { title: SITE_NAME, body: `<div>${h}</div>`, desc: CONFIG.description, type: 'website' };
}

function refsPage(link) {
  let h = topbar(link, '文献') + `<div class="wrap prose"><header class="art-head"><h1 class="title">文献总表</h1><p class="subtitle">全部篇目的参考文献，按篇目排列</p></header>`;
  for (const d of revised) {
    const refs = d.blocks.find((b) => b.type === 'refs');
    if (!refs) continue;
    h += `<h2>第 ${Number(d.meta.id)} 篇 ${esc(d.meta.title)}</h2><ol class="refs">${refs.items.map((r) => `<li value="${r.n}">${esc(r.text)}</li>`).join('')}</ol>`;
  }
  h += `</div>`;
  return { title: '文献总表', body: h, desc: '医美选择全部篇目的参考文献，按篇目排列。', type: 'website' };
}

function aboutPage(link) {
  const h = topbar(link, '声明') + `<div class="wrap prose"><header class="art-head"><h1 class="title">声明</h1></header><h2>科普声明</h2><p>${esc(DISCLAIMER)}</p><h2>利益声明</h2><p>${esc(INTEREST)}</p><h2>证据与修订</h2><p>每篇末尾的证据等级与来源说明写在同一段，正文中的方括号数字对应文末的参考文献。全部篇目按证据优先的方式重新核查过，每篇的核查日期记录在内容源文件里；会过期的事实每六个月复核一次。</p><p class="signature">${SIGNATURE}</p></div>`;
  return { title: '声明', body: h, desc: '医美选择的科普声明、利益声明与证据说明。', type: 'website' };
}


function excerpt(s, n = 60) { s = String(s); const i = s.indexOf('。'); const first = i > 0 && i < n ? s.slice(0, i + 1) : s.slice(0, n) + '……'; return first; }

function catalogPage(link) {
  let h = `<div class="wrap"><header class="art-head"><h1 class="title">篇目</h1><p class="subtitle">六个子分类，共 ${articles.length} 篇</p></header>`;
  CATEGORIES.forEach((cat, i) => {
    const list = articles.filter((a) => a.meta.category === cat);
    h += `<section class="cat-block"><h2><a href="${link.category(i + 1)}">${esc(cat)}</a><span class="cnt">${list.length} 篇</span></h2><ul class="toc">${list.map((a) => `<li><span class="no">${a.meta.id}</span><a href="${link.article(a.meta.id)}"><span class="t">${esc(a.meta.title)}</span> <span class="sub">${esc(a.meta.subtitle)}</span></a><span></span></li>`).join('')}</ul></section>`;
  });
  h += `</div>`;
  return { title: '篇目', body: h, desc: `医美选择全部 ${articles.length} 篇，按决策框架、光电、注射、外科、机构与医生甄别、术后护理与风险六个子分类排列。`, type: 'website' };
}

const CAT_INTRO = {
  '决策框架': '做决定之前的问题、效果边界、可逆性、维持成本，以及几类常见的营销话术。',
  '光电类项目': '强脉冲光、激光、点阵、射频、聚焦超声和激光脱毛，各管什么、做不到什么。',
  '注射类项目': '肉毒毒素、透明质酸、胶原与再生材料、水光，以及注射的高风险部位。',
  '外科类项目': '手术分级、麻醉，以及重睑、鼻整形、眼袋与面部提升、隆乳、吸脂和四级手术。',
  '机构与医生甄别': '查机构、查医生、查产品，面诊、价格、预付与分期，签字之前看什么。',
  '术后护理与风险': '术后反应与信号，注射和外科术后的紧急信号，光电术后护理，效果不满意与医疗损害。',
};

function categoryPage(i, link) {
  const cat = CATEGORIES[i];
  const list = articles.filter((a) => a.meta.category === cat);
  const ctx = { link, docId: `c-${i + 1}` };
  let h = topbar(link, `<a href="${link.catalog()}">篇目</a>`);
  h += `<div class="wrap"><header class="art-head"><p class="eyebrow">子分类 ${i + 1} / ${CATEGORIES.length}</p><h1 class="title">${esc(cat)}</h1><p class="subtitle">${esc(CAT_INTRO[cat])}</p></header><ul class="cards">`;
  for (const a of list) {
    const m = a.meta;
    h += `<li><a href="${link.article(m.id)}"><span class="no">第 ${Number(m.id)} 篇</span><span class="t">${esc(m.title)}</span><span class="sub">${esc(m.subtitle)}</span></a><p>${inline(String(m.takeaway), ctx)}</p></li>`;
  }
  h += `</ul></div>`;
  return { title: cat, body: h, desc: `${cat}：${CAT_INTRO[cat]}`.replace('：', '，'), type: 'website' };
}

function guidesPage(link) {
  const ctx = { link, docId: 'guides' };
  let h = `<div class="wrap"><header class="art-head"><h1 class="title">导读</h1><p class="subtitle">按问题 ${PROBLEMS.length} 页，按处境 ${NEEDS.length} 页，每页列出该读的篇目和顺序</p></header>`;
  for (const [label, items] of [['按问题', PROBLEMS], ['按处境', NEEDS]]) {
    h += `<section class="cat-block"><h2>${label}</h2><ul class="cards">`;
    for (const x of items) {
      const g = landingBySlug.get(x.slug);
      if (!g) continue;
      h += `<li><a href="${link.landing(x.slug)}"><span class="t">${esc(g.meta.title)}</span><span class="sub">${esc(g.meta.subtitle)}</span></a><p>${inline(String(g.meta.takeaway), ctx)}</p></li>`;
    }
    h += `</ul></section>`;
  }
  h += `</div>`;
  return { title: '导读', body: h, desc: '按问题和按处境进入医美选择的 24 个导读页，每页列出该读的篇目和顺序。', type: 'website' };
}

function searchPage(link) {
  const h = `<div class="wrap"><header class="art-head"><h1 class="title">搜索</h1><p class="subtitle">在全部篇目和导读页的正文里查找</p></header><div class="search big"><label class="sr" for="site-q">搜索关键词</label><input type="search" id="site-q" placeholder="如 透明质酸 溶解、射频 烫伤、预付 退款" autocomplete="off"><output id="site-q-count"></output></div><ol class="results" id="site-results"></ol><p class="fig-hint">多个关键词用空格分开，结果需要同时包含这些词。</p></div>`;
  return { title: '搜索', body: h, desc: '在医美选择的全部篇目和导读页里搜索。', type: 'website' };
}

function notFoundPage(link) {
  const h = `<div class="wrap"><header class="art-head"><h1 class="title">没有找到这个页面</h1><p class="subtitle">网址可能有误，或者页面已经调整</p></header><div class="prose"><p>可以从<a href="${link.home()}">首页</a>、<a href="${link.catalog()}">篇目</a>或<a href="${link.search()}">搜索</a>重新进入。注射或手术后出现紧急情况，请看<a href="${link.landing('jinji')}">现在有紧急情况</a>，或直接拨打 120。</p></div></div>`;
  return { title: '页面不存在', body: h, desc: '页面不存在。', type: 'website' };
}

// ---------- 输出 ----------
const CSS = fs.readFileSync(path.join(ROOT, 'tools/site.css'), 'utf-8') + FIGURE_CSS;
const JS_FIG = fs.readFileSync(path.join(ROOT, 'tools/figures-runtime.js'), 'utf-8');
const JS_SITE = fs.readFileSync(path.join(ROOT, 'tools/site.js'), 'utf-8');

function allPages(target) {
  const pages = [];
  pages.push({ key: 'home', file: 'index.html', depth: 0, render: (l) => homePage(l), prio: '1.0' });
  pages.push({ key: 'catalog', file: 'catalog.html', depth: 0, render: (l) => catalogPage(l), prio: '0.8' });
  CATEGORIES.forEach((c, i) => pages.push({ key: `c-${i + 1}`, file: `c/${i + 1}.html`, depth: 1, render: (l) => categoryPage(i, l), prio: '0.7' }));
  pages.push({ key: 'guides', file: 'guides.html', depth: 0, render: (l) => guidesPage(l), prio: '0.8' });
  for (const a of articles) pages.push({ key: `a-${a.meta.id}`, file: `a/${a.meta.id}.html`, depth: 1, render: (l) => articlePage(a, l), prio: '0.9' });
  for (const g of landings) pages.push({ key: `g-${g.meta.id}`, file: `g/${g.meta.id}.html`, depth: 1, render: (l) => landingPage(g, l), prio: '0.8' });
  pages.push({ key: 'search', file: 'search.html', depth: 0, render: (l) => searchPage(l), prio: '0.3' });
  pages.push({ key: 'refs', file: 'refs.html', depth: 0, render: (l) => refsPage(l), prio: '0.4' });
  pages.push({ key: 'about', file: 'about.html', depth: 0, render: (l) => aboutPage(l), prio: '0.4' });
  pages.push({ key: '404', file: '404.html', depth: 0, render: (l) => notFoundPage(l), noindex: true });
  return pages.map((p) => ({ ...p, out: p.render(linker(target, p.depth)) }));
}

function shell(p, target) {
  const link = linker(target, p.depth);
  const mainId = target === 'spa' ? `main-${p.key}` : 'main';
  return `${siteHeader(link, mainId)}<main id="${mainId}" tabindex="-1">${p.out.body}</main>${siteFooter(link, p.key === 'home')}`;
}

// ---------- 搜索索引 ----------
const plain = (s) => String(s).replace(CITE_RE_G, '').replace(/\s+/g, ' ').trim();
const CITE_RE_G = /\[\d+(?:\s*[,\-–]\s*\d+)*\]/g;
function docText(doc) {
  const out = [];
  for (const b of doc.blocks) {
    if (b.type === 'p' || b.type === 'evidence') out.push(b.text);
    else if (b.type === 'ol' || b.type === 'ul') out.push(...b.items);
    else if (b.type === 'table') out.push(...b.rows.flat());
    else if (b.type === 'emergency') out.push(...b.items, b.note);
    else if (b.type === 'h2' && b.text !== '参考文献') out.push(b.text);
  }
  return plain(out.join(' '));
}
const SEARCH_INDEX = [
  ...articles.map((a) => ({ u: `a/${a.meta.id}.html`, k: `a-${a.meta.id}`, t: a.meta.title, s: a.meta.subtitle, c: `第 ${Number(a.meta.id)} 篇 · ${a.meta.category}`, x: plain(`${a.meta.summary} ${docText(a)}`) })),
  ...landings.map((g) => ({ u: `g/${g.meta.id}.html`, k: `g-${g.meta.id}`, t: g.meta.title, s: g.meta.subtitle, c: `导读 · 按${g.meta.kind}`, x: plain(`${g.meta.summary} ${docText(g)}`) })),
];

// ---------- 头部信息 ----------
function headMeta(p) {
  const url = BASE + (p.file === 'index.html' ? '' : p.file);
  const title = p.out.title === SITE_NAME ? SITE_NAME : `${p.out.title} · ${SITE_NAME}`;
  const desc = plain(p.out.desc || CONFIG.description).slice(0, 120);
  const og = `${BASE}og/${p.key}.png`;
  let m = `<meta name="description" content="${esc(desc)}">\n<link rel="canonical" href="${url}">\n`;
  if (p.noindex) m += `<meta name="robots" content="noindex">\n`;
  m += `<meta property="og:site_name" content="${esc(SITE_NAME)}">\n<meta property="og:locale" content="zh_CN">\n<meta property="og:type" content="${p.out.type === 'article' ? 'article' : 'website'}">\n<meta property="og:title" content="${esc(title)}">\n<meta property="og:description" content="${esc(desc)}">\n<meta property="og:url" content="${url}">\n<meta property="og:image" content="${og}">\n<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">\n<meta name="twitter:card" content="summary_large_image">\n`;
  m += `<meta name="theme-color" content="#1f4a38">\n<meta name="author" content="${esc(CONFIG.author)}">\n`;
  if (p.out.type === 'article') {
    const ld = { '@context': 'https://schema.org', '@type': 'MedicalWebPage', name: p.out.title, description: desc, inLanguage: 'zh-CN', url, image: og, dateModified: p.out.modified, author: { '@type': 'Person', name: CONFIG.author }, isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: BASE }, articleSection: p.out.section };
    m += `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>\n`;
  }
  return { m, title };
}

// ---------- 多页站 ----------
const SITE = path.join(ROOT, 'site');
fs.rmSync(SITE, { recursive: true, force: true });
fs.mkdirSync(path.join(SITE, 'assets'), { recursive: true });
fs.writeFileSync(path.join(SITE, 'assets/site.css'), CSS);
fs.writeFileSync(path.join(SITE, 'assets/site.js'), JS_FIG + '\n' + JS_SITE);
fs.writeFileSync(path.join(SITE, 'assets/search-index.json'), JSON.stringify(SEARCH_INDEX));
fs.writeFileSync(path.join(SITE, 'assets/favicon.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#ffffff"/><rect x="6" y="6" width="52" height="52" rx="9" fill="none" stroke="#1f4a38" stroke-width="5"/><text x="32" y="43" text-anchor="middle" font-family="PingFang SC,Noto Sans CJK SC,Microsoft YaHei,sans-serif" font-size="30" font-weight="700" fill="#262626">医</text></svg>`);
fs.writeFileSync(path.join(SITE, '.nojekyll'), '');
if (CONFIG.cname) fs.writeFileSync(path.join(SITE, 'CNAME'), CONFIG.cname + '\n');
const multi = allPages('multi');
for (const p of multi) {
  const up = '../'.repeat(p.depth);
  const { m, title } = headMeta(p);
  const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
${m}<link rel="icon" href="${up}assets/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="${up}assets/site.css">
<script src="${up}assets/site.js" defer></script>
</head>
<body><div id="app" data-base="${up}">${shell(p, 'multi')}</div></body>
</html>
`;
  const f = path.join(SITE, p.file);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, html);
}
const today = new Date().toISOString().slice(0, 10);
fs.writeFileSync(path.join(SITE, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${multi.filter((p) => !p.noindex).map((p) => `  <url><loc>${BASE}${p.file === 'index.html' ? '' : p.file}</loc><lastmod>${p.out.modified || today}</lastmod><priority>${p.prio}</priority></url>`).join('\n')}\n</urlset>\n`);
fs.writeFileSync(path.join(SITE, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${BASE}sitemap.xml\n`);
// 分享卡片图的待生成清单（tools/og-images.mjs 读取）
fs.mkdirSync(path.join(ROOT, 'build'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'build/og-pages.json'), JSON.stringify(multi.map((p) => {
  const kind = p.key.startsWith('a-') ? `第 ${Number(p.key.slice(2))} 篇 · ${p.out.section}` : p.key.startsWith('g-') ? p.out.section : '';
  const [t1, t2] = p.key.startsWith('a-') ? p.out.title.split(' · ') : [p.out.title, p.key === 'home' ? '先说清楚要解决的问题，再选方式、查资质、算代价' : ''];
  return { key: p.key, title: t1, subtitle: t2 || '', kind };
})));

// ---------- 单文件预览（claude.ai 私有页面：不写 doctype/html/head/body，由平台包裹） ----------
const PREVIEW = path.join(ROOT, 'site-preview');
fs.mkdirSync(PREVIEW, { recursive: true });
const sections = allPages('spa').filter((p) => p.key !== '404').map((p) => `<section class="page" id="p-${p.key}" data-title="${esc(p.out.title)}"${p.key === 'home' ? '' : ' hidden'}>${shell(p, 'spa')}</section>`).join('\n');
const preview = `<title>${SITE_NAME}</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>${CSS}</style>
<div id="app" class="spa">
${sections}
</div>
<script>window.__SEARCH = ${JSON.stringify(SEARCH_INDEX).replace(/</g, '\\u003c')};</script>
<script>${JS_FIG}</script>
<script>${JS_SITE}</script>
`;
fs.writeFileSync(path.join(PREVIEW, 'index.html'), preview);
console.log(`site: ${multi.length} 页；搜索索引 ${(JSON.stringify(SEARCH_INDEX).length / 1024).toFixed(0)} KB；preview: ${(preview.length / 1024).toFixed(0)} KB`);
