// 内容解析：front matter + 块级结构。站点构建、docx 构建与自检脚本共用。
import fs from 'node:fs';
import path from 'node:path';

export const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

// ---------- front matter ----------
function parseValue(raw) {
  const v = raw.trim();
  if (v.startsWith('[') && v.endsWith(']')) {
    const inner = v.slice(1, -1).trim();
    return inner ? inner.split(',').map((s) => s.trim()).filter(Boolean) : [];
  }
  if (v === 'true') return true;
  if (v === 'false') return false;
  return v;
}

export function splitFrontMatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return { meta: {}, body: text, bodyStartLine: 1 };
  const meta = {};
  for (const line of m[1].split('\n')) {
    const mm = line.match(/^([A-Za-z_][\w-]*):\s?(.*)$/);
    if (mm) meta[mm[1]] = parseValue(mm[2]);
  }
  const bodyStartLine = m[0].split('\n').length;
  return { meta, body: text.slice(m[0].length), bodyStartLine };
}

// ---------- blocks ----------
// 块类型：h2, p, ol, ul, table, emergency, figure, evidence, refs
export function parseBlocks(body, startLine = 1) {
  const lines = body.split('\n');
  const blocks = [];
  let i = 0;
  let section = '';
  const push = (b) => { b.section = section; blocks.push(b); };
  while (i < lines.length) {
    const line = lines[i];
    const lineNo = startLine + i;
    if (!line.trim()) { i++; continue; }

    // 容器块 ::: name [arg]
    const fence = line.match(/^:::\s*(\w+)\s*(.*)$/);
    if (fence) {
      const kind = fence[1];
      const arg = fence[2].trim();
      const inner = [];
      i++;
      while (i < lines.length && !/^:::\s*$/.test(lines[i])) { inner.push(lines[i]); i++; }
      i++; // 跳过结束的 :::
      if (kind === 'figure') push({ type: 'figure', name: arg, line: lineNo });
      else if (kind === 'emergency') {
        const items = inner.filter((l) => /^-\s+/.test(l)).map((l) => l.replace(/^-\s+/, ''));
        const note = inner.filter((l) => l.trim() && !/^-\s+/.test(l)).join('');
        push({ type: 'emergency', items, note, line: lineNo });
      } else if (kind === 'evidence') push({ type: 'evidence', text: inner.join('').trim(), line: lineNo });
      else push({ type: kind, text: inner.join('\n'), line: lineNo });
      continue;
    }

    if (/^##\s+/.test(line)) {
      section = line.replace(/^##\s+/, '').trim();
      push({ type: 'h2', text: section, line: lineNo });
      i++; continue;
    }
    if (/^#{3,}\s+/.test(line)) {
      push({ type: 'h3', text: line.replace(/^#+\s+/, ''), line: lineNo });
      i++; continue;
    }

    // 参考文献条目
    if (section === '参考文献' && /^\[\d+\]/.test(line)) {
      const items = [];
      while (i < lines.length && /^\[\d+\]/.test(lines[i])) {
        const mm = lines[i].match(/^\[(\d+)\]\s*(.*)$/);
        items.push({ n: Number(mm[1]), text: mm[2], line: startLine + i });
        i++;
      }
      push({ type: 'refs', items, line: lineNo });
      continue;
    }

    if (/^\|/.test(line)) {
      const rows = [];
      while (i < lines.length && /^\|/.test(lines[i])) { rows.push(lines[i]); i++; }
      const cells = (r) => r.replace(/^\|/, '').replace(/\|\s*$/, '').split('|').map((c) => c.trim());
      const header = cells(rows[0]);
      const body = rows.slice(2).map(cells);
      push({ type: 'table', header, rows: body, line: lineNo });
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) { items.push(lines[i].replace(/^\d+\.\s+/, '')); i++; }
      push({ type: 'ol', items, line: lineNo });
      continue;
    }
    if (/^-\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^-\s+/.test(lines[i])) { items.push(lines[i].replace(/^-\s+/, '')); i++; }
      push({ type: 'ul', items, line: lineNo });
      continue;
    }

    // 段落：连续非空行合并
    const para = [];
    while (i < lines.length && lines[i].trim() && !/^(##|:::|\||\d+\.\s|-\s)/.test(lines[i])) { para.push(lines[i]); i++; }
    push({ type: 'p', text: para.join(''), line: lineNo });
  }
  return blocks;
}

export function loadDoc(file) {
  const text = fs.readFileSync(file, 'utf-8');
  const { meta, body, bodyStartLine } = splitFrontMatter(text);
  const blocks = parseBlocks(body, bodyStartLine);
  return { file, meta, blocks, text };
}

// ---------- 行内 ----------
// 引用 [1] [1][2] [1,2] [1-3] → 结构化片段
export const CITE_RE = /\[(\d+(?:\s*[,\-–]\s*\d+)*)\]/g;

export function citeNumbers(token) {
  const out = [];
  for (const part of token.split(',')) {
    const r = part.split(/[-–]/).map((s) => Number(s.trim()));
    if (r.length === 2) for (let k = r[0]; k <= r[1]; k++) out.push(k);
    else out.push(r[0]);
  }
  return out;
}

export function splitInline(text) {
  // 返回 [{t:'text', v}, {t:'cite', v:'1', nums:[1]}]
  const parts = [];
  let last = 0;
  for (const m of text.matchAll(CITE_RE)) {
    if (m.index > last) parts.push({ t: 'text', v: text.slice(last, m.index) });
    parts.push({ t: 'cite', v: m[1], nums: citeNumbers(m[1]) });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ t: 'text', v: text.slice(last) });
  return parts;
}

// ---------- 全集 ----------
export function listDocs(dir) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs).filter((f) => f.endsWith('.md')).sort().map((f) => loadDoc(path.join(abs, f)));
}

export function cjkCount(s) {
  return (s.match(/[一-鿿]/g) || []).length;
}

export const SIGNATURE = '于意云 何';

export const CATEGORIES = ['决策框架', '光电类项目', '注射类项目', '外科类项目', '机构与医生甄别', '术后护理与风险'];

export const DISCLAIMER = '本栏目为医美科普，不构成诊断或治疗建议，不推荐任何机构、医生或产品。是否适合某个项目，以面诊医生的检查和判断为准。注射或手术后出现皮肤发白发紫、视物模糊、呼吸困难、胸痛，请立即联系治疗机构，或前往医院急诊、拨打 120。';
export const INTEREST = '作者从事医疗美容机构经营管理工作。本栏目不提及、不推荐任何具体机构，包括作者任职的机构。';
