#!/usr/bin/env node
// 分享卡片图：每页一张 1200×630 PNG，输出到 site/og/。先运行 npm run site。
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { ROOT } from './lib.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require(require.resolve('playwright', { paths: [ROOT, '/opt/node22/lib/node_modules', '/usr/lib/node_modules'] }));
const pages = JSON.parse(fs.readFileSync(path.join(ROOT, 'build/og-pages.json'), 'utf-8'));
const OUT = path.join(ROOT, 'site/og');
fs.mkdirSync(OUT, { recursive: true });
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

const tpl = (p) => `<!doctype html><meta charset="utf-8"><style>
body{margin:0;width:1200px;height:630px;background:#FAFAF8;color:#262626;font-family:"Noto Sans CJK SC","PingFang SC",sans-serif;overflow:hidden}
.card{position:absolute;inset:0;padding:64px 80px;display:flex;flex-direction:column}
.top{display:flex;justify-content:space-between;align-items:baseline;border-bottom:6px solid #1f4a38;padding-bottom:18px}
.site{font-size:34px;font-weight:700;letter-spacing:.14em}.kind{font-size:26px;color:#6B706B}
.t{font-size:${p.title.length > 12 ? 64 : 80}px;font-weight:700;line-height:1.25;margin-top:56px;max-width:1040px}
.s{font-size:34px;color:#5C615C;margin-top:18px;line-height:1.45;max-width:1040px}
.foot{margin-top:auto;border-top:2px solid #1f4a38;padding-top:16px;display:flex;justify-content:space-between;font-size:24px;color:#6B706B}
.sig{font-family:"AR PL UKai CN","Noto Serif CJK SC",serif;color:#262626;letter-spacing:.2em}
</style><div class="card"><div class="top"><span class="site">医美选择</span><span class="kind">${esc(p.kind)}</span></div><div class="t">${esc(p.title)}</div>${p.subtitle ? `<div class="s">${esc(p.subtitle)}</div>` : ''}<div class="foot"><span>医美科普 · 不构成诊断或治疗建议</span><span class="sig">于意云 何</span></div></div>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
for (const p of pages) {
  await page.setContent(tpl(p));
  await page.screenshot({ path: path.join(OUT, `${p.key}.png`) });
}
await browser.close();
console.log(`og: ${pages.length} 张`);
