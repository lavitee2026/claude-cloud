#!/usr/bin/env node
// 生成网站：site/（多页静态站）与 site-preview/index.html（单文件预览）。
// 依赖 build/figures/ 里预渲染的 mermaid SVG，先运行 npm run figures。
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, listDocs, splitInline, CATEGORIES, DISCLAIMER, INTEREST, SIGNATURE } from './lib.mjs';
import { FIGURES, FIGURE_CSS, FACE_ZONES } from './figures.mjs';
import { PROBLEMS, NEEDS, ENTRIES } from './nav.mjs';

const SITE_NAME = '医美选择';
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
  if (fig.kind === 'mermaid') inner = fs.readFileSync(path.join(ROOT, 'build/figures', `${name}.svg`), 'utf-8');
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
  return `<nav class="topbar" aria-label="站点"><a class="site" href="${link.home()}">${SITE_NAME}</a>${crumb ? `<span class="crumb">${crumb}</span>` : ''}<span style="flex:1"></span><a href="${link.refs()}">文献</a><a href="${link.about()}">声明</a></nav>`;
}

function articlePage(doc, link) {
  const m = doc.meta;
  const ctx = { link, docId: m.id };
  const idx = articles.findIndex((a) => a.meta.id === m.id);
  const prev = articles[idx - 1], next = articles[idx + 1];
  const related = (m.related || []).filter((id) => byId.has(id) && id !== m.id);
  let h = topbar(link, esc(m.category));
  h += `<article class="wrap"><header class="art-head"><p class="eyebrow">第 ${Number(m.id)} 篇 · ${esc(m.category)}</p><h1 class="title">${esc(m.title)}</h1><p class="subtitle">${esc(m.subtitle)}</p>`;
  if (m.status === '原稿') h += `<p class="status-note">本篇为原稿，尚未按新体例修订和核查证据，试点确认后修订。</p>`;
  h += `<div class="summary"><b>速读</b>${inline(String(m.summary), ctx)}</div>`;
  if (m.takeaway) h += `<p class="takeaway">${inline(String(m.takeaway), ctx)}</p>`;
  h += `</header><div class="prose">${blocksHtml(doc.blocks, ctx)}</div>`;
  h += `<p class="statement">${esc(DISCLAIMER)}</p><p class="statement">${esc(INTEREST)}</p><p class="signature">${SIGNATURE}</p>`;
  if (related.length) h += `<section class="related"><h2>相关篇目</h2><ul>${related.map((id) => { const r = byId.get(id).meta; return `<li><a href="${link.article(id)}">第 ${Number(id)} 篇 ${esc(r.title)} · ${esc(r.subtitle)}</a></li>`; }).join('')}</ul></section>`;
  h += `<nav class="pager" aria-label="上一篇和下一篇">${prev ? `<a href="${link.article(prev.meta.id)}">上一篇 ${esc(prev.meta.title)}</a>` : '<span></span>'}${next ? `<a href="${link.article(next.meta.id)}">下一篇 ${esc(next.meta.title)}</a>` : '<span></span>'}</nav>`;
  h += `</article>`;
  return { title: `${m.title} · ${m.subtitle}`, body: h };
}

function landingPage(doc, link) {
  const m = doc.meta;
  const ctx = { link, docId: `g-${m.id}` };
  let h = topbar(link, `按${esc(m.kind)}`);
  h += `<article class="wrap"><header class="art-head"><p class="eyebrow">按${esc(m.kind)}</p><h1 class="title">${esc(m.title)}</h1><p class="subtitle">${esc(m.subtitle)}</p>`;
  h += `<div class="summary"><b>速读</b>${inline(String(m.summary), ctx)}</div><p class="takeaway">${inline(String(m.takeaway), ctx)}</p></header>`;
  h += `<div class="prose">${blocksHtml(doc.blocks, ctx)}</div>`;
  h += `<p class="statement">${esc(DISCLAIMER)}</p><p class="signature">${SIGNATURE}</p></article>`;
  return { title: m.title, body: h };
}

function navList(items, link) {
  return `<ul class="navlist">${items.map((x) => {
    if (x.slug && landingBySlug.has(x.slug)) return `<li class="live"><a href="${link.landing(x.slug)}">${esc(x.name)}</a></li>`;
    const first = x.ids[0];
    return `<li><a href="${link.article(first)}">${esc(x.name)}</a><span class="soon">导读待上线</span></li>`;
  }).join('')}</ul>`;
}

function homePage(link) {
  let h = `<header class="masthead"><h1>${SITE_NAME}</h1><p>栏目全文合集 · 44 篇 · 六个子分类 · 24 个导读页 · 2026 年 11 月修订版</p></header>`;
  h += `<aside class="home-urgent" aria-label="紧急情况"><p>注射或手术以后出现下面的情况，立即联系做治疗的机构，联系不上去医院急诊。</p><ul><li>皮肤发白、发灰、发紫，出现网状花纹，疼痛越来越重</li><li>视物模糊、视力下降、眼痛，直接去眼科急诊</li><li>呼吸困难、胸痛、咯血，嘴唇或喉咙发紧肿胀，直接打 120</li></ul><p class="go"><a href="${link.article('41')}">注射后的紧急信号</a> · <a href="${link.article('42')}">外科术后的紧急信号</a> · <a href="${link.landing('buanxin')}">做完不放心</a></p></aside>`;
  h += `<section class="home-section"><h2>从这里读起</h2><div class="entries">${ENTRIES.map((e) => `<div><h3>${esc(e.name)}</h3><ul>${e.ids.map((id) => { const r = byId.get(id).meta; return `<li><a href="${link.article(id)}">${Number(id)} ${esc(r.title)}</a> <span class="sub">${esc(r.subtitle)}</span></li>`; }).join('')}</ul></div>`).join('')}</div></section>`;
  h += `<section class="home-section"><h2>按问题</h2>${navList(PROBLEMS, link)}</section>`;
  h += `<section class="home-section"><h2>按处境</h2>${navList(NEEDS, link)}</section>`;
  h += `<section class="home-section"><h2>全部篇目</h2><div class="search"><label class="sr" for="toc-search">搜索篇目</label><input type="search" id="toc-search" placeholder="搜索篇目，如 透明质酸、恢复期、价格"><output id="toc-count"></output></div>`;
  for (const cat of CATEGORIES) {
    const list = articles.filter((a) => a.meta.category === cat);
    h += `<div class="toc-group"><p class="toc-cat">${esc(cat)}</p><ul class="toc">${list.map((a) => { const m = a.meta; const text = esc(`${m.title} ${m.subtitle} ${m.category} ${m.summary}`); return `<li data-text="${text}"><span class="no">${m.id}</span><a href="${link.article(m.id)}"><span class="t">${esc(m.title)}</span> <span class="sub">${esc(m.subtitle)}</span></a><span></span></li>`; }).join('')}</ul></div>`;
  }
  h += `</section>`;
  h += `<footer class="footer"><p>${esc(DISCLAIMER)}</p><p>${esc(INTEREST)}</p><p>于意云 何</p></footer>`;
  return { title: SITE_NAME, body: `<div>${h}</div>` };
}

function refsPage(link) {
  let h = topbar(link, '文献') + `<div class="wrap prose"><header class="art-head"><h1 class="title">文献总表</h1><p class="subtitle">全部篇目的参考文献，按篇目排列</p></header>`;
  for (const d of revised) {
    const refs = d.blocks.find((b) => b.type === 'refs');
    if (!refs) continue;
    h += `<h2>第 ${Number(d.meta.id)} 篇 ${esc(d.meta.title)}</h2><ol class="refs">${refs.items.map((r) => `<li value="${r.n}">${esc(r.text)}</li>`).join('')}</ol>`;
  }
  h += `</div>`;
  return { title: '文献总表', body: h };
}

function aboutPage(link) {
  const h = topbar(link, '声明') + `<div class="wrap prose"><header class="art-head"><h1 class="title">声明</h1></header><h2>科普声明</h2><p>${esc(DISCLAIMER)}</p><h2>利益声明</h2><p>${esc(INTEREST)}</p><h2>证据与修订</h2><p>每篇末尾的证据等级与来源说明写在同一段，正文中的方括号数字对应文末的参考文献。全部篇目按证据优先的方式重新核查过，每篇的核查日期记录在内容源文件里；会过期的事实每六个月复核一次。</p><p class="signature">${SIGNATURE}</p></div>`;
  return { title: '声明', body: h };
}

// ---------- 输出 ----------
const CSS = fs.readFileSync(path.join(ROOT, 'tools/site.css'), 'utf-8') + FIGURE_CSS;
const JS_FIG = fs.readFileSync(path.join(ROOT, 'tools/figures-runtime.js'), 'utf-8');
const JS_SITE = fs.readFileSync(path.join(ROOT, 'tools/site.js'), 'utf-8');

function allPages(target) {
  const pages = [];
  pages.push({ key: 'home', file: 'index.html', depth: 0, render: (l) => homePage(l) });
  for (const a of articles) pages.push({ key: `a-${a.meta.id}`, file: `a/${a.meta.id}.html`, depth: 1, render: (l) => articlePage(a, l) });
  for (const g of landings) pages.push({ key: `g-${g.meta.id}`, file: `g/${g.meta.id}.html`, depth: 1, render: (l) => landingPage(g, l) });
  pages.push({ key: 'refs', file: 'refs.html', depth: 0, render: (l) => refsPage(l) });
  pages.push({ key: 'about', file: 'about.html', depth: 0, render: (l) => aboutPage(l) });
  return pages.map((p) => ({ ...p, out: p.render(linker(target, p.depth)) }));
}

// 多页站
const SITE = path.join(ROOT, 'site');
fs.rmSync(SITE, { recursive: true, force: true });
fs.mkdirSync(path.join(SITE, 'assets'), { recursive: true });
fs.writeFileSync(path.join(SITE, 'assets/site.css'), CSS);
fs.writeFileSync(path.join(SITE, 'assets/site.js'), JS_FIG + '\n' + JS_SITE);
fs.writeFileSync(path.join(SITE, '.nojekyll'), '');
for (const p of allPages('multi')) {
  const up = '../'.repeat(p.depth);
  const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(p.out.title === SITE_NAME ? SITE_NAME : `${p.out.title} · ${SITE_NAME}`)}</title>
<link rel="stylesheet" href="${up}assets/site.css">
<script src="${up}assets/site.js" defer></script>
</head>
<body><div id="app">${p.out.body}</div></body>
</html>
`;
  const f = path.join(SITE, p.file);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, html);
}

// 单文件预览（claude.ai 私有页面：不写 doctype/html/head/body，由平台包裹）
const PREVIEW = path.join(ROOT, 'site-preview');
fs.mkdirSync(PREVIEW, { recursive: true });
const sections = allPages('spa').map((p) => `<section class="page" id="p-${p.key}" data-title="${esc(p.out.title)}"${p.key === 'home' ? '' : ' hidden'}>${p.out.body}</section>`).join('\n');
const preview = `<title>${SITE_NAME}</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>${CSS}</style>
<div id="app" class="spa">
${sections}
</div>
<script>${JS_FIG}</script>
<script>${JS_SITE}</script>
`;
fs.writeFileSync(path.join(PREVIEW, 'index.html'), preview);
console.log(`site: ${allPages('multi').length} 页；preview: ${(preview.length / 1024).toFixed(0)} KB`);
