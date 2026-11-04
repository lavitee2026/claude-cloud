#!/usr/bin/env node
// 预渲染：mermaid → 主题化 SVG；所有图 → PNG（docx 与微信端用位图）。
// 输出：build/figures/<name>.svg（仅 mermaid）、build/figures/<name>.png
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { ROOT } from './lib.mjs';
import { FIGURES, FIGURE_CSS, FACE_ZONES } from './figures.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require(require.resolve('playwright', { paths: [ROOT, '/opt/node22/lib/node_modules', '/usr/lib/node_modules'] }));

const OUT = path.join(ROOT, 'build/figures');
fs.mkdirSync(OUT, { recursive: true });

// mermaid 用占位色渲染，之后替换为主题变量，深浅主题都能用
const FG = '#010203', BG = '#fdfefc', MID = '#f1f2f0';
const MERMAID_THEME = {
  theme: 'base',
  themeVariables: {
    fontFamily: '"Noto Sans CJK SC","PingFang SC","Microsoft YaHei","WenQuanYi Zen Hei",sans-serif',
    fontSize: '15px',
    background: BG, primaryColor: BG, primaryTextColor: FG, primaryBorderColor: FG,
    secondaryColor: BG, tertiaryColor: BG, lineColor: FG, textColor: FG,
    mainBkg: BG, nodeBorder: FG, clusterBkg: BG, clusterBorder: FG,
    edgeLabelBackground: MID, titleColor: FG, nodeTextColor: FG,
  },
  flowchart: { curve: 'linear', htmlLabels: false, nodeSpacing: 36, rankSpacing: 44, padding: 12 },
  securityLevel: 'strict',
};

export function themeMermaidSvg(svg) {
  return svg
    .replace(new RegExp(FG, 'gi'), 'var(--fg)')
    .replace(new RegExp(BG, 'gi'), 'var(--bg)')
    .replace(new RegExp(MID, 'gi'), 'var(--fill-1)')
    .replace(/rgb\(1,\s*2,\s*3\)/g, 'var(--fg)')
    .replace(/rgb\(253,\s*254,\s*252\)/g, 'var(--bg)')
    .replace(/<svg /, '<svg class="fig-svg mermaid-svg" ');
}

const LIGHT_VARS = `:root{--fg:#262626;--bg:#ffffff;--muted:#6b706b;--fill-1:#f2f3f1;--fill-2:#e3e5e2;--fill-3:#b9bdb8;--sans:"Noto Sans CJK SC","WenQuanYi Zen Hei",sans-serif}body{margin:0;background:#fff}`;

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ deviceScaleFactor: 2, viewport: { width: 900, height: 700 } });

  // 1. mermaid
  const mermaidJs = fs.readFileSync(path.join(ROOT, 'node_modules/mermaid/dist/mermaid.min.js'), 'utf-8');
  await page.setContent('<!doctype html><meta charset="utf-8"><body></body>');
  await page.addScriptTag({ content: mermaidJs });
  for (const [name, fig] of Object.entries(FIGURES)) {
    if (fig.kind !== 'mermaid') continue;
    const svg = await page.evaluate(async ({ src, cfg }) => {
      window.mermaid.initialize({ startOnLoad: false, ...cfg });
      const { svg } = await window.mermaid.render('m' + Math.random().toString(36).slice(2), src);
      return svg;
    }, { src: fig.src, cfg: MERMAID_THEME });
    fs.writeFileSync(path.join(OUT, `${name}.svg`), themeMermaidSvg(svg));
    console.log('mermaid', name);
  }

  // 2. PNG
  const runtime = fs.readFileSync(path.join(ROOT, 'tools/figures-runtime.js'), 'utf-8');
  for (const [name, fig] of Object.entries(FIGURES)) {
    if (fig.noPng) continue;
    let inner;
    if (fig.kind === 'mermaid') inner = fs.readFileSync(path.join(OUT, `${name}.svg`), 'utf-8');
    else inner = fig.svg();
    let wrap = `<div id="fig" style="width:${name === 'face' ? 380 : name === 'decision' ? 560 : 760}px;padding:8px">${inner}</div>`;
    if (name === 'botox') wrap = `<div id="fig" data-fig="botox" style="width:760px;padding:8px">${inner}<div hidden><button></button><input type="range" min="0" max="180"><span class="bx-day"></span><span class="bx-status"></span></div></div>`;
    await page.setContent(`<!doctype html><meta charset="utf-8"><style>${LIGHT_VARS}${FIGURE_CSS}.mermaid-svg{max-width:100%}</style><body>${wrap}</body>`);
    if (name === 'botox') await page.addScriptTag({ content: runtime });
    if (name === 'face') {
      // 静态版：在各区域标出部位名称
      await page.evaluate((zones) => {
        const svg = document.querySelector('svg');
        const NS = 'http://www.w3.org/2000/svg';
        const seen = {};
        svg.querySelectorAll('.zone').forEach((z) => {
          const id = z.getAttribute('data-zone');
          if (seen[id]) return; seen[id] = 1;
          const b = z.getBBox();
          const t = document.createElementNS(NS, 'text');
          let x = b.x + b.width / 2, y = b.y + b.height / 2 + 4;
          if (id === 'temple') { x = b.x - 4; y = b.y + b.height / 2 + 4; }
          if (id === 'nlf') { x = b.x + 8; y = b.y + b.height + 16; }
          if (id === 'glabella') { y = b.y - 4; }
          t.setAttribute('x', x); t.setAttribute('y', y); t.setAttribute('text-anchor', id === 'temple' ? 'end' : id === 'nlf' ? 'start' : 'middle');
          t.setAttribute('font-size', '13'); t.setAttribute('font-weight', '600');
          t.textContent = zones[id].name; svg.appendChild(t);
        });
      }, FACE_ZONES);
    }
    const el = await page.$('#fig');
    await el.screenshot({ path: path.join(OUT, `${name}.png`), omitBackground: false });
    console.log('png', name);
  }
  await browser.close();
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(e); process.exit(1); });
