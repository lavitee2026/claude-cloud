#!/usr/bin/env node
// 写作规范自检。规则来源：写作规范.md「动笔与自检」及各章禁令。
// 用法：node tools/lint.mjs [文件或目录...]   默认检查 content/articles 与 content/landing
// 退出码：有 error 时为 1，只有 warn 时为 0。
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, loadDoc, cjkCount, citeNumbers, CITE_RE } from './lib.mjs';
import { FIGURES } from './figures.mjs';

// ---------- 规则表 ----------
// level: error 必须改；warn 需要作者判断
export const RULES = [
  { id: 'bold', level: 'error', desc: '不加粗', re: /\*\*[^*]+\*\*/g },
  { id: 'dash', level: 'error', desc: '非必要不用破折号', re: /——|—|--(?!-)/g },
  { id: 'colon', level: 'warn', desc: '非必要不用冒号（引出话术引文除外）', re: /：(?!「)/g },
  { id: 'label-colon', level: 'error', desc: '标签词冒号', re: /^[一-鿿]{1,8}：/gm },
  { id: 'dquote', level: 'warn', desc: '双引号改用直角引号「」', re: /[“”"]/g },
  { id: 'banned', level: 'error', desc: '禁用词', re: /拆开|拆解|拆穿|一刀|砍掉|落盘|立住/g },
  { id: 'banned-chai', level: 'warn', desc: '禁用词「拆」', re: /拆(?!除|迁|线)/g },
  { id: 'bigword', level: 'warn', desc: '刻意大词', re: /结构|机制|维度|路径|变现|赖以成立|本质上|量级|按亿计|成分|一向如此|这一层/g },
  { id: 'verb', level: 'error', desc: '万能动词与视角腔', re: /解读|解构|叙事|从[^，。]{1,8}视角/g },
  { id: 'contrast', level: 'warn', desc: '对照句式', re: /不是[^。；！？]{1,24}而是|既是[^。；]{1,24}也是|这不是[^。；]{1,16}，是|是[^。；，]{1,12}，不是[^。；]{1,12}[。；]/g },
  { id: 'naming', level: 'error', desc: '迂回命名', re: /可以叫|不妨称之为|某种意义上|姑且称/g },
  { id: 'announce', level: 'warn', desc: '报幕句', re: /本文|写到这里|得分开说|下面我们|接下来我|说一句反方向|还有一件事我得说|那这有什么用/g },
  { id: 'emotion', level: 'error', desc: '伪情绪拍', re: /我想了很久|我愣了一下|我确实看见/g },
  { id: 'absolute', level: 'warn', desc: '绝对化表述', re: /唯一(?!标识)|几乎全部|几乎总是|没有[^。，]{0,6}可查|永久|百分之百|100%/g },
  { id: 'superlative', level: 'warn', desc: '替读者排序的最高级', re: /最该|最有争议|最重要|最关键|最值得/g },
  { id: 'position', level: 'warn', desc: '位置化与端点化表述', re: /落在[^。，]{0,6}身上|那一端|这一端|够得到哪一段|落到[^。，]{0,4}头上/g },
  { id: 'meta', level: 'warn', desc: '展示推理过程', re: /往下推|可以推出|由此可见|不难看出|这一点可以从/g },
  { id: 'prophecy', level: 'warn', desc: '时间预言与灾难化', re: /名存实亡|必将|注定/g },
  { id: 'promise', level: 'warn', desc: '承诺、辩护与自谦', re: /我们会改|不是终版|做不到的部分我们不写|才疏学浅/g },
  { id: 'halfwidth', level: 'error', desc: '中文语境用全角标点', re: /[一-鿿][,;:?!]|[,;:?!][一-鿿]|[一-鿿]\(|\)[一-鿿]/g },
  { id: 'spacing', level: 'warn', desc: '中文与数字、英文之间留白', re: /[一-鿿][A-Za-z0-9]|[A-Za-z0-9%][一-鿿]/g },
];

// 列表允许出现的小节（读者会对照着用的段落）
const LIST_SECTIONS = ['面诊时可以问的问题', '阅读顺序', '联系与就医顺序', '治疗前要拿到的东西', '行动清单', '要点速查'];
// 允许单字母与汉字紧贴的写法（型号、单位等）
const SPACING_ALLOW = /A 型|[A-Z]型|第[0-9]/;

function lintDoc(doc) {
  const issues = [];
  const add = (level, rule, line, msg) => issues.push({ level, rule, line, msg });
  const { meta, blocks } = doc;
  const isArticle = /content\/articles\//.test(doc.file);

  // 逐块检查文字规则（参考文献、表格表头不查标点与留白）
  const textOf = (b) => {
    if (b.type === 'p' || b.type === 'evidence') return [b.text];
    if (b.type === 'ol' || b.type === 'ul') return b.items;
    if (b.type === 'table') return b.rows.flat();
    if (b.type === 'emergency') return [...b.items, b.note];
    if (b.type === 'h2' || b.type === 'h3') return [b.text];
    return [];
  };
  const metaTexts = ['summary', 'takeaway', 'title', 'subtitle'].filter((k) => meta[k]).map((k) => ({ k, v: String(meta[k]) }));
  const checkText = (s, line) => {
    const clean = s.replace(CITE_RE, '').replace(/https?:\/\/\S+/g, '');
    for (const r of RULES) {
      r.re.lastIndex = 0;
      for (const m of clean.matchAll(r.re)) {
        if (r.id === 'spacing') {
          const ctx = clean.slice(Math.max(0, m.index - 1), m.index + 3);
          if (SPACING_ALLOW.test(ctx)) continue;
        }
        add(r.level, r.id, line, `${r.desc}「${clean.slice(Math.max(0, m.index - 6), m.index + m[0].length + 6)}」`);
      }
    }
  };
  for (const { k, v } of metaTexts) checkText(v, `meta.${k}`);
  for (const b of blocks) {
    if (b.type === 'refs') continue;
    for (const s of textOf(b)) checkText(s, b.line);
  }

  // 标题层级：正文最多一级小标题
  for (const b of blocks) if (b.type === 'h3') add('error', 'heading-depth', b.line, '标题层级超过两级');
  // 标题禁冒号与破折号
  for (const k of ['title', 'subtitle']) if (meta[k] && /[：:—]/.test(meta[k])) add('error', 'title-punct', `meta.${k}`, '标题禁冒号与破折号');
  // 小标题不承担疑问
  for (const b of blocks) if (b.type === 'h2' && /[？?吗呢]|怎么|怎样|为什么|谁|哪里|什么/.test(b.text) && !LIST_SECTIONS.includes(b.text) && !/^面诊时可以问的问题$/.test(b.text)) add('warn', 'heading-question', b.line, `小标题带疑问「${b.text}」`);
  // 单句成段（短句）
  for (const b of blocks) if (b.type === 'p' && cjkCount(b.text) < 22 && (b.text.match(/[。！？]/g) || []).length <= 1 && b.section !== '今天能做的一件事') add('warn', 'one-liner', b.line, `单句成段「${b.text}」`);
  // 列表数量与位置
  for (const b of blocks) if ((b.type === 'ol' || b.type === 'ul') && !LIST_SECTIONS.includes(b.section)) add('warn', 'list-place', b.line, `列表出现在「${b.section}」`);

  // 引号与括号配对
  const all = doc.text;
  for (const [o, c] of [['「', '」'], ['“', '”'], ['（', '）'], ['《', '》']]) {
    const no = all.split(o).length - 1, nc = all.split(c).length - 1;
    if (no !== nc) add('error', 'pairing', '-', `${o}${c} 不配对（${no}/${nc}）`);
  }

  // 引用：顺序编码、编号存在、无孤儿
  const refBlock = blocks.find((b) => b.type === 'refs');
  const refNums = refBlock ? refBlock.items.map((x) => x.n) : [];
  const seen = [];
  for (const b of blocks) {
    if (b.type === 'refs') continue;
    for (const s of textOf(b)) for (const m of s.matchAll(CITE_RE)) for (const n of citeNumbers(m[1])) {
      if (!refNums.includes(n)) add('error', 'cite-missing', b.line, `引用 [${n}] 在参考文献中不存在`);
      if (!seen.includes(n)) seen.push(n);
    }
  }
  seen.forEach((n, idx) => { if (n !== idx + 1) add('error', 'cite-order', '-', `顺序编码错位：第 ${idx + 1} 个首次出现的引用是 [${n}]`); });
  for (const n of refNums) if (!seen.includes(n)) add('error', 'cite-orphan', '-', `参考文献 [${n}] 未在正文引用`);
  refNums.forEach((n, idx) => { if (n !== idx + 1) add('error', 'ref-seq', '-', `参考文献编号不连续 [${n}]`); });
  if (refBlock) for (const it of refBlock.items) {
    if (!/\[(J|Z|EB\/OL|M|S|R|C|D|N)\]/.test(it.text)) add('warn', 'ref-type', it.line, `缺少文献类型标识 [${it.n}]`);
  }

  // 文章体例
  if (isArticle) {
    for (const k of ['id', 'title', 'subtitle', 'category', 'evidence', 'summary', 'takeaway', 'verified']) if (!meta[k]) add('error', 'meta', '-', `缺少字段 ${k}`);
    if (meta.emergency === true && !blocks.some((b) => b.type === 'emergency')) add('error', 'emergency', '-', 'emergency 为 true 但没有急诊框');
    if (!blocks.some((b) => b.type === 'evidence')) add('error', 'evidence', '-', '缺少文末证据等级');
    const ev = blocks.find((b) => b.type === 'evidence');
    if (ev && !ev.text.startsWith(`证据等级 ${meta.evidence}`)) add('error', 'evidence-grade', ev.line, `文末等级与元数据 ${meta.evidence} 不一致`);
    const sumLen = cjkCount(String(meta.summary || ''));
    if (sumLen < 150 || sumLen > 330) add('warn', 'summary-length', 'meta.summary', `速读摘要 ${sumLen} 字，建议 200 至 300 字`);
  }
  for (const b of blocks) if (b.type === 'figure' && !FIGURES[b.name]) add('error', 'figure', b.line, `未登记的图「${b.name}」`);

  // 字数
  const bodyText = blocks.filter((b) => !['refs', 'evidence'].includes(b.type)).flatMap(textOf).join('');
  const words = cjkCount(bodyText) + cjkCount(String(meta.summary || ''));
  return { issues, words };
}

// ---------- 入口 ----------
function collect(args) {
  const targets = args.length ? args : ['content/articles', 'content/landing'];
  const files = [];
  for (const t of targets) {
    const abs = path.resolve(ROOT, t);
    if (fs.statSync(abs).isDirectory()) for (const f of fs.readdirSync(abs).sort()) { if (f.endsWith('.md')) files.push(path.join(abs, f)); }
    else files.push(abs);
  }
  return files;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const files = collect(process.argv.slice(2));
  let errors = 0, warns = 0;
  for (const f of files) {
    const { issues, words } = lintDoc(loadDoc(f));
    const rel = path.relative(ROOT, f);
    const e = issues.filter((x) => x.level === 'error').length, w = issues.length - e;
    errors += e; warns += w;
    console.log(`\n${rel}  正文约 ${words} 字  error ${e}  warn ${w}`);
    for (const x of issues) console.log(`  ${x.level === 'error' ? 'E' : 'W'} ${String(x.line).padEnd(13)} ${x.rule.padEnd(16)} ${x.msg}`);
  }
  console.log(`\n合计 ${files.length} 个文件，error ${errors}，warn ${warns}`);
  process.exit(errors ? 1 : 0);
}

export { lintDoc };
