#!/usr/bin/env node
// 生成 docx：dist/医美选择-正文.docx、dist/医美选择-工程化说明.docx
// 版式参数见工程化说明「docx 版式」一节；依赖 build/figures/*.png，先运行 npm run figures。
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { ROOT, listDocs, loadDoc, splitInline, DISCLAIMER, INTEREST, SIGNATURE } from './lib.mjs';
import { FIGURES } from './figures.mjs';

const require = createRequire(import.meta.url);
const docx = require(require.resolve('docx', { paths: [ROOT, '/opt/node22/lib/node_modules', '/opt/node-tools/node_modules'] }));
const {
  Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell, WidthType, BorderStyle,
  AlignmentType, LevelFormat, Footer, PageNumber, PageBreak, TableLayoutType, VerticalAlign, LineRuleType,
} = docx;

// ---------- 版式参数 ----------
const C = { text: '262626', green: '1F4A38', black: '000000', footer: '8A908A' };
const F = {
  sans: { ascii: 'Arial', hAnsi: 'Arial', eastAsia: '黑体', cs: 'Arial' },
  serif: { ascii: 'Times New Roman', hAnsi: 'Times New Roman', eastAsia: '宋体', cs: 'Times New Roman' },
  kai: { ascii: 'Times New Roman', hAnsi: 'Times New Roman', eastAsia: '楷体', cs: 'Times New Roman' },
};
const SZ = { title: 44, subtitle: 26, h1: 26, h2: 22, body: 21, note: 19, td: 19, th: 18, footer: 16 }; // 半磅
const MARGIN = { top: 1420, right: 1300, bottom: 1420, left: 1300 };
const PAGE_W = 11906; // A4
const TEXT_W = PAGE_W - MARGIN.left - MARGIN.right; // 9306 twips
const AUTO = LineRuleType.AUTO;
const LINE = { line: 360, lineRule: AUTO }; // 1.5 倍行距
let CITES = true; // 工程化说明里的 [1] 是示例，不转上标
const INDENT = 480;

const run = (text, o = {}) => new TextRun({ text, font: o.font || F.serif, size: o.size || SZ.body, color: o.color || C.text, bold: !!o.bold, superScript: !!o.sup });
function runsOf(text, o = {}) {
  const out = [];
  for (const part of splitInline(text)) {
    if (part.t === 'cite') out.push(run(`[${part.v}]`, { ...o, sup: CITES }));
    else out.push(run(part.v, o));
  }
  return out;
}
const border = (color, size) => ({ style: BorderStyle.SINGLE, color, size, space: 4 });

// ---------- 段落构件 ----------
const P = {
  body: (text) => new Paragraph({ children: runsOf(text), indent: { firstLine: INDENT }, spacing: { ...LINE, before: 0, after: 80 }, alignment: AlignmentType.JUSTIFIED }),
  plain: (text, o = {}) => new Paragraph({ children: runsOf(text, o), spacing: { ...LINE, before: o.before ?? 0, after: o.after ?? 80 }, alignment: o.align || AlignmentType.JUSTIFIED, indent: o.indent }),
  h1: (text) => new Paragraph({ children: [run(text, { font: F.sans, size: SZ.h1, bold: true })], spacing: { before: 360, after: 160, line: 300, lineRule: AUTO }, keepNext: true, keepLines: true, border: { bottom: border(C.green, 4) } }),
  h2: (text) => new Paragraph({ children: [run(text, { font: F.sans, size: SZ.h2, bold: true })], spacing: { before: 240, after: 100, line: 300, lineRule: AUTO }, keepNext: true }),
  label: (text) => new Paragraph({ children: [run(text, { font: F.sans, size: SZ.body, bold: true })], spacing: { before: 200, after: 80 }, keepNext: true }),
  note: (text, o = {}) => new Paragraph({ children: runsOf(text, { font: F.kai, size: SZ.note }), spacing: { line: 320, lineRule: AUTO, before: o.before ?? 120, after: o.after ?? 60 }, alignment: o.align || AlignmentType.JUSTIFIED }),
  signature: () => new Paragraph({ children: [run(SIGNATURE, { font: F.kai, size: SZ.body })], alignment: AlignmentType.RIGHT, spacing: { before: 240, after: 0 } }),
  pageBreak: () => new Paragraph({ children: [new PageBreak()] }),
};

// 报头：篇号行、主标题、副标题，上下两条深绿粗线
function masthead(eyebrow, title, subtitle, extra) {
  const items = [];
  if (eyebrow) items.push(new Paragraph({ children: [run(eyebrow, { font: F.sans, size: SZ.note, color: C.text })], spacing: { before: 0, after: 60 }, border: { top: border(C.green, 12) }, keepNext: true }));
  items.push(new Paragraph({ children: [run(title, { font: F.sans, size: SZ.title, bold: true })], spacing: { before: eyebrow ? 0 : 0, after: 60, line: 400, lineRule: AUTO }, border: eyebrow ? undefined : { top: border(C.green, 12) }, keepNext: true }));
  const subBorder = extra ? undefined : { bottom: border(C.green, 12) };
  items.push(new Paragraph({ children: [run(subtitle, { font: F.sans, size: SZ.subtitle })], spacing: { before: 0, after: extra ? 40 : 240 }, border: subBorder, keepNext: true }));
  if (extra) items.push(new Paragraph({ children: [run(extra, { font: F.sans, size: SZ.note })], spacing: { before: 0, after: 240 }, border: { bottom: border(C.green, 12) } }));
  return items;
}

function summaryBlock(text) {
  return new Paragraph({ children: [run('速读　', { font: F.sans, size: SZ.body, bold: true }), ...runsOf(String(text))], spacing: { ...LINE, before: 0, after: 160 }, alignment: AlignmentType.JUSTIFIED });
}
function takeaway(text) {
  return new Paragraph({ children: runsOf(String(text), { font: F.sans }), border: { left: border(C.green, 12) }, indent: { left: 200 }, spacing: { line: 340, lineRule: AUTO, before: 80, after: 200 } });
}

function emergency(b) {
  const out = [];
  out.push(new Paragraph({ children: [run('立即联系治疗机构或去急诊的情况', { font: F.sans, size: SZ.body, bold: true })], border: { top: border(C.black, 8) }, spacing: { before: 200, after: 80 }, keepNext: true }));
  for (const it of b.items) out.push(new Paragraph({ children: runsOf(it), numbering: { reference: 'bullet', level: 0 }, spacing: { line: 320, lineRule: AUTO, after: 40 }, keepNext: true }));
  out.push(new Paragraph({ children: runsOf(b.note || '', { size: SZ.note }), border: { bottom: border(C.black, 8) }, spacing: { line: 320, lineRule: AUTO, before: 60, after: 200 } }));
  return out;
}

let listInstance = 0;
function orderedList(items) {
  listInstance += 1;
  return items.map((it) => new Paragraph({ children: runsOf(it), numbering: { reference: 'num', level: 0, instance: listInstance }, spacing: { ...LINE, after: 40 }, alignment: AlignmentType.JUSTIFIED }));
}
function bulletList(items) {
  return items.map((it) => new Paragraph({ children: runsOf(it), numbering: { reference: 'bullet', level: 0 }, spacing: { ...LINE, after: 40 } }));
}

// 表格：黑色水平细线，无竖线，无底纹，表头加粗居中
function table(header, rows, widths) {
  const n = header.length;
  const w = widths || weightWidths(header, rows);
  const none = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  const thin = { style: BorderStyle.SINGLE, size: 4, color: C.black };
  const heavy = { style: BorderStyle.SINGLE, size: 8, color: C.black };
  const cell = (text, i, isHead, isLast) => new TableCell({
    width: { size: w[i], type: WidthType.DXA },
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    verticalAlign: VerticalAlign.TOP,
    borders: { left: none, right: none, top: isHead ? heavy : none, bottom: isHead ? thin : isLast ? heavy : thin },
    children: [new Paragraph({
      children: runsOf(text, isHead ? { font: F.sans, size: SZ.th, bold: true } : { size: SZ.td }),
      alignment: isHead ? AlignmentType.CENTER : AlignmentType.LEFT, spacing: { line: 300, lineRule: AUTO, before: 0, after: 0 },
    })],
  });
  return new Table({
    width: { size: TEXT_W, type: WidthType.DXA }, columnWidths: w, layout: TableLayoutType.FIXED,
    borders: { top: none, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none },
    rows: [
      new TableRow({ tableHeader: true, children: header.map((h, i) => cell(h, i, true, false)) }),
      ...rows.map((r, ri) => new TableRow({ cantSplit: true, children: Array.from({ length: n }, (_, i) => cell(r[i] ?? '', i, false, ri === rows.length - 1)) })),
    ],
  });
}
function weightWidths(header, rows) {
  // 按各列最长内容分配宽度，最窄 1200 twips
  const n = header.length;
  const len = Array.from({ length: n }, (_, i) => Math.max(header[i].length * 1.2, ...rows.map((r) => Math.min(40, (r[i] || '').length))));
  const total = len.reduce((a, b) => a + b, 0);
  let w = len.map((l) => Math.max(1200, Math.round((l / total) * TEXT_W)));
  const s = w.reduce((a, b) => a + b, 0);
  w = w.map((x) => Math.round((x * TEXT_W) / s));
  w[n - 1] += TEXT_W - w.reduce((a, b) => a + b, 0);
  return w;
}
const spacer = () => new Paragraph({ children: [], spacing: { before: 0, after: 120 } });

// 图：PNG，按原始比例缩放
function pngSize(file) {
  const b = fs.readFileSync(file);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}
function figure(name, maxPx) {
  if (FIGURES[name].noPng) return [];
  const file = path.join(ROOT, 'build/figures', `${name}.png`);
  const { w, h } = pngSize(file);
  const target = Math.min(maxPx, w / 2);
  const height = Math.round((h / w) * target);
  return [
    new Paragraph({ children: [new ImageRun({ type: 'png', data: fs.readFileSync(file), transformation: { width: Math.round(target), height }, altText: { title: name, description: FIGURES[name].alt, name } })], alignment: AlignmentType.CENTER, spacing: { before: 200, after: 60, line: 240, lineRule: AUTO }, keepNext: true }),
    P.note(FIGURES[name].caption, { align: AlignmentType.CENTER, before: 0, after: 200 }),
  ];
}
const FIG_WIDTH = { decision: 420, depth: 520, timeline: 560, lineRule: AUTO, face: 260, botox: 560 };

// ---------- 正文块 ----------
function blocks(bs, opts = {}) {
  const out = [];
  for (const b of bs) {
    switch (b.type) {
      case 'h2': if (b.text !== '参考文献') out.push(P.h1(b.text)); break;
      case 'h3': out.push(P.h2(b.text)); break;
      case 'p': out.push(opts.noIndent ? P.plain(b.text) : P.body(b.text)); break;
      case 'ol': out.push(...orderedList(b.items)); break;
      case 'ul': out.push(...bulletList(b.items)); break;
      case 'table': out.push(table(b.header, b.rows), spacer()); break;
      case 'emergency': out.push(...emergency(b)); break;
      case 'figure': out.push(...figure(b.name, FIG_WIDTH[b.name] || 520)); break;
      case 'evidence': out.push(P.note(b.text, { before: 240 })); break;
      case 'refs':
        out.push(P.label('参考文献'));
        for (const r of b.items) out.push(new Paragraph({ children: [run(`[${r.n}] `, { size: SZ.note }), run(r.text, { size: SZ.note })], indent: { left: 420, hanging: 420 }, spacing: { line: 300, lineRule: AUTO, after: 40 }, alignment: AlignmentType.LEFT }));
        break;
      default: break;
    }
  }
  return out;
}

function footer(label) {
  return new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [
    new TextRun({ text: `${label}　`, font: F.sans, size: SZ.footer, color: C.footer }),
    new TextRun({ children: [PageNumber.CURRENT], font: F.sans, size: SZ.footer, color: C.footer }),
  ] })] });
}

const NUMBERING = { config: [
  { reference: 'num', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: INDENT, hanging: INDENT } }, run: { font: F.serif, size: SZ.body, color: C.text } } }] },
  { reference: 'bullet', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: INDENT, hanging: INDENT } }, run: { font: F.serif, size: SZ.body, color: C.text } } }] },
] };
const STYLES = { default: { document: { run: { font: F.serif, size: SZ.body, color: C.text }, paragraph: { spacing: LINE } } } };
const SECTION_PROPS = { page: { size: { width: PAGE_W, height: 16838 }, margin: MARGIN } };

async function save(doc, file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, await Packer.toBuffer(doc));
  console.log('docx', path.relative(ROOT, file));
}

// ---------- 正文 docx ----------
async function buildBody() {
  const revised = listDocs('content/articles');
  const landings = listDocs('content/landing');
  const front = [];
  front.push(...masthead('', '医美选择', '栏目全文合集 · 修订版', `2026 年 11 月 · ${revised.length} 篇与 ${landings.length} 个导读页`));
  front.push(P.h1('本册内容'));
  front.push(P.body('本册收入「医美选择」栏目全部篇目和导读页。全栏按证据优先的方式修订，疗效、风险、维持时间和法规要求逐条核对原始来源，正文用方括号数字标注，对应每篇末尾的参考文献；每篇的证据等级和来源说明放在文末。导读页按问题和按处境两种方式进入，列出该读的篇目和顺序。'));
  front.push(table(['编号', '子分类', '篇目'], revised.map((a) => [a.meta.id, a.meta.category, `${a.meta.title} · ${a.meta.subtitle}`]), [900, 2200, 6206]));
  front.push(spacer());
  front.push(P.h1('声明'));
  front.push(P.note(DISCLAIMER, { before: 0 }));
  front.push(P.note(INTEREST));
  front.push(P.pageBreak());
  front.push(P.h1('阅读入口'));
  front.push(P.body('按此刻的情况，可以从下面三个入口读起。按具体问题或处境进入的，先读导读页，导读页列出了该读的篇目和顺序。'));
  front.push(table(['你的情况', '从这里读'], [
    ['想做还没定', '第 3 篇 恢复期、维持时间与可逆性对照；第 4 篇 效果边界；第 9 篇 安全、无痛、无恢复期与永久'],
    ['正在挑机构', '第 33 篇 查机构；第 34 篇 查医生；第 36 篇 面诊；第 37 篇 价格'],
    ['做完不放心', '第 40 篇 术后反应与信号；第 41 篇 注射后的紧急信号；第 42 篇 外科术后的紧急信号'],
  ], [2000, 7306]));
  front.push(...emergency({ items: ['皮肤发白、发灰、发紫，出现网状花纹，疼痛越来越重', '视物模糊、视力下降、眼痛，直接去眼科急诊', '呼吸困难、胸痛、咯血，嘴唇或喉咙发紧肿胀，直接打 120'], note: '注射或手术以后出现以上情况，立即联系做治疗的机构；联系不上，去医院急诊。' }));

  const children = [...front];
  // 导读：按问题在前，按处境在后
  landings.sort((a, b) => (a.meta.kind === b.meta.kind ? 0 : a.meta.kind === '问题' ? -1 : 1));
  for (const g of landings) {
    const m = g.meta;
    children.push(P.pageBreak());
    children.push(...masthead(`导读 · 按${m.kind}`, m.title, m.subtitle));
    children.push(summaryBlock(m.summary), takeaway(m.takeaway));
    children.push(...blocks(g.blocks));
    children.push(P.signature());
  }
  // 篇目
  const allRefs = [];
  for (const a of revised) {
    const m = a.meta;
    children.push(P.pageBreak());
    children.push(...masthead(`第 ${Number(m.id)} 篇 · ${m.category}`, m.title, m.subtitle));
    children.push(summaryBlock(m.summary), takeaway(m.takeaway));
    children.push(...blocks(a.blocks));
    children.push(P.signature());
    const refs = a.blocks.find((b) => b.type === 'refs');
    if (refs) for (const r of refs.items) allRefs.push({ text: r.text, from: Number(m.id) });
  }
  // 文献总表（去重）
  const merged = [];
  for (const r of allRefs) {
    const key = r.text.replace(/\s+/g, '').replace(/DOI:.*/, '').slice(0, 60);
    const hit = merged.find((x) => x.key === key);
    if (hit) { if (!hit.from.includes(r.from)) hit.from.push(r.from); } else merged.push({ key, text: r.text, from: [r.from] });
  }
  children.push(P.pageBreak());
  children.push(...masthead('', '文献总表', `全栏引用的 ${merged.length} 份文献，按首次出现的篇目排列`));
  merged.forEach((r, i) => children.push(new Paragraph({ children: [run(`${i + 1}. `, { size: SZ.note }), run(r.text, { size: SZ.note }), run(`　引用篇目 ${r.from.join('、')}`, { size: SZ.note, font: F.kai })], indent: { left: 420, hanging: 420 }, spacing: { line: 300, lineRule: AUTO, after: 60 } })));

  const doc = new Document({
    creator: '于意云', title: '医美选择 栏目全文合集 修订版', description: '医美选择栏目全文合集修订版',
    styles: STYLES, numbering: NUMBERING,
    sections: [{ properties: SECTION_PROPS, footers: { default: footer('医美选择 · 修订版') }, children }],
  });
  await save(doc, path.join(ROOT, 'dist/医美选择-正文.docx'));
}

// ---------- 工程化说明 docx ----------
async function buildEngineering() {
  CITES = false;
  const d = loadDoc(path.join(ROOT, 'docs/工程化说明.md'));
  const m = d.meta;
  const children = [...masthead('', m.title, m.subtitle, `版本 ${m.version} · ${m.date}`)];
  children.push(...blocks(d.blocks));
  const doc = new Document({
    creator: '于意云', title: '医美选择 工程化说明', styles: STYLES, numbering: NUMBERING,
    sections: [{ properties: SECTION_PROPS, footers: { default: footer('医美选择 · 工程化说明') }, children }],
  });
  await save(doc, path.join(ROOT, 'dist/医美选择-工程化说明.docx'));
}

// 版式构件供其他合集复用（如 tools/build-diet-docx.mjs）
export { docx, C, F, SZ, LINE, TEXT_W, run, runsOf, P, masthead, summaryBlock, takeaway, table, spacer, blocks, footer, NUMBERING, STYLES, SECTION_PROPS, save };

if (import.meta.url === `file://${process.argv[1]}`) {
  await buildBody();
  await buildEngineering();
}
