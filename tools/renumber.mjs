#!/usr/bin/env node
// 按 GB/T 7714 顺序编码制，把正文引用按首次出现的顺序重新编号，并重排参考文献表。
// 用法：node tools/renumber.mjs content/articles/01.md [--write]
import fs from 'node:fs';
import { CITE_RE, citeNumbers } from './lib.mjs';

const [file, flag] = process.argv.slice(2);
const text = fs.readFileSync(file, 'utf-8');
const fm = (text.match(/^---\n[\s\S]*?\n---\n/) || [''])[0];
const refStart = text.indexOf('\n## 参考文献');
if (refStart < 0) { console.error('没有参考文献小节'); process.exit(1); }
const body = text.slice(fm.length, refStart);
const refs = text.slice(refStart);

const order = [];
for (const m of body.matchAll(CITE_RE)) for (const n of citeNumbers(m[1])) if (!order.includes(n)) order.push(n);
const map = new Map(order.map((n, i) => [n, i + 1]));

const fmt = (nums) => {
  const s = [...new Set(nums.map((n) => map.get(n) ?? n))].sort((a, b) => a - b);
  // 连续三个以上合并为区间
  const out = []; let i = 0;
  while (i < s.length) { let j = i; while (j + 1 < s.length && s[j + 1] === s[j] + 1) j++; out.push(j - i >= 2 ? `${s[i]}-${s[j]}` : s.slice(i, j + 1).join(',')); i = j + 1; }
  return out.join(',');
};
// 先把相邻的 [1][2] 合并为 [1,2]，再一次性映射
let merged = body;
const ADJ = /\[(\d+(?:\s*[,\-–]\s*\d+)*)\]\[(\d+(?:\s*[,\-–]\s*\d+)*)\]/;
while (ADJ.test(merged)) merged = merged.replace(ADJ, (_, a, b) => `[${a},${b}]`);
const newBody = merged.replace(CITE_RE, (_, inner) => `[${fmt(citeNumbers(inner))}]`);

const lines = refs.split('\n');
const items = lines.filter((l) => /^\[\d+\]/.test(l));
const others = lines.filter((l) => !/^\[\d+\]/.test(l));
const byOld = new Map(items.map((l) => [Number(l.match(/^\[(\d+)\]/)[1]), l.replace(/^\[\d+\]\s*/, '')]));
const missing = [...byOld.keys()].filter((n) => !map.has(n));
const sorted = [...order, ...missing].map((old, i) => `[${i + 1}] ${byOld.get(old)}`);
const head = others.join('\n').replace(/\n+$/, '');
const result = fm + newBody + head + '\n' + sorted.join('\n') + '\n';

if (missing.length) console.warn('未被引用的文献（排在末尾）：', missing.join(', '));
console.log('映射', [...map].map(([a, b]) => `${a}→${b}`).join(' '));
if (flag === '--write') fs.writeFileSync(file, result); else process.stdout.write(result.slice(-600));
