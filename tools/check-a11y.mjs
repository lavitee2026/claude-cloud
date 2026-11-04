#!/usr/bin/env node
// 无障碍检查：在本机起一个临时服务读取 site/，用 axe-core 按 WCAG 2.1 AA 与最佳实践检查。
// 浅色、深色两种配色，1440 与 390 两种宽度各查一遍。有问题时列出规则与位置，退出码为 1。
// 用法：npm run a11y            抽查 12 个代表页
//       npm run a11y -- --all   检查全部页面，耗时约为抽查的 7 倍
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import { ROOT } from './lib.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require(require.resolve('playwright', { paths: [ROOT, '/opt/node22/lib/node_modules', '/usr/lib/node_modules'] }));
const AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js', { paths: [ROOT] }), 'utf-8');
const SITE = path.join(ROOT, 'site');
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp' };

const SAMPLE = ['index.html', 'a/20.html', 'a/03.html', 'a/37.html', 'g/jinji.html', 'catalog.html', 'c/3.html', 'guides.html', 'search.html', 'refs.html', 'about.html', '404.html'];
const all = process.argv.includes('--all');
const list = all
  ? fs.readdirSync(SITE, { recursive: true }).filter((f) => f.endsWith('.html')).map((f) => f.split(path.sep).join('/'))
  : SAMPLE;

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(SITE, p);
  if (!f.startsWith(SITE) || !fs.existsSync(f)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
}).listen(0);
const base = `http://127.0.0.1:${server.address().port}/`;

const browser = await chromium.launch();
const found = {};
for (const scheme of ['light', 'dark']) for (const width of [1440, 390]) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: scheme });
  for (const u of list) {
    const page = await ctx.newPage();
    await page.goto(base + u, { waitUntil: 'networkidle' });
    await page.addScriptTag({ content: AXE });
    const v = await page.evaluate(async () => (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'] })).violations
      .map((x) => ({ id: x.id, impact: x.impact, help: x.help, at: x.nodes.slice(0, 2).map((n) => n.target.join(' ')) })));
    for (const x of v) (found[`${x.impact} ${x.id} ${x.help}`] ||= []).push(`${scheme}/${width}/${u} ${x.at.join(' | ')}`);
    await page.close();
  }
  await ctx.close();
}
await browser.close();
server.close();

const keys = Object.keys(found);
console.log(`${list.length} 页 × 深浅两色 × 两种宽度，问题 ${keys.length} 类`);
for (const k of keys) { console.log(k); for (const s of found[k].slice(0, 4)) console.log('  ' + s); }
process.exit(keys.length ? 1 : 0);
