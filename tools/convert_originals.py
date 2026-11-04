#!/usr/bin/env python3
"""把原 docx 经 pandoc 转成的 GitHub Markdown 拆成单篇，转为本仓库的内容格式。

用法：
  pandoc -t gfm --wrap=none 原稿.docx -o build/source.gfm.md
  python3 tools/convert_originals.py build/source.gfm.md

已在 content/articles/ 修订过的篇目跳过；其余写入 content/originals/，status 为原稿。
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
src = Path(sys.argv[1]).read_text(encoding='utf-8')

# 篇目表：编号 → 批次
toc = {}
for m in re.finditer(r'^\|\s*(\d{2})\s*\|\s*([^|]+?)\s*\|\s*(.+?)\s*\|\s*(\d)\s*\|', src, re.M):
    toc[m.group(1)] = m.group(4)

parts = re.split(r'\n(?=第 \d+ 篇 · )', src)[1:]
revised = {p.stem for p in (ROOT / 'content/articles').glob('*.md')}
out_dir = ROOT / 'content/originals'
out_dir.mkdir(parents=True, exist_ok=True)

def unescape(s):
    s = re.sub(r'<sup>\\?\[(\d+)\\?\]</sup>', r'[\1]', s)
    s = re.sub(r'\^\\\[(\d+)\\\]\^', r'[\1]', s)
    s = s.replace('\\[', '[').replace('\\]', ']').replace('\\*', '*')
    return s

for p in parts:
    lines = p.strip('\n').split('\n')
    head = lines[0]
    m = re.match(r'第 (\d+) 篇 · ([^·]+) · ([^·]+) · 证据等级 (\S+)', head)
    nid = f'{int(m.group(1)):02d}'
    if nid in revised:
        continue
    category, page_type, evidence = m.group(2).strip(), m.group(3).strip(), m.group(4).strip()
    body = [unescape(l) for l in lines[1:]]
    text = '\n'.join(body)

    title = re.search(r'^\*\*(.+?)\*\*\s*$', text, re.M).group(1)
    after_title = text.split(f'**{title}**', 1)[1].lstrip('\n')
    subtitle = after_title.split('\n', 1)[0].strip()
    summary = re.search(r'^\*\*摘要\s*\*\*(.+)$', text, re.M).group(1).strip()
    takeaway_m = re.search(r'^> \*\*(.+?)\*\*\s*$', text, re.M)
    takeaway = takeaway_m.group(1).strip() if takeaway_m else ''

    # 正文：从「适用人群」开始，到证据等级为止
    start = text.index('**适用人群**')
    rest = text[start:]
    ev_m = re.search(r'^证据等级\s*\n?(.+?)(?=\n\n)', rest, re.M | re.S)
    evidence_text = ''
    if ev_m:
        evidence_text = '证据等级 ' + re.sub(r'\s+', ' ', ev_m.group(1)).strip()
        main = rest[:ev_m.start()]
        tail = rest[ev_m.end():]
    else:
        main, tail = rest, ''
    refs = re.findall(r'^\[(\d+)\]\s*(.+)$', tail, re.M)

    out = []
    in_emerg = False
    emerg_items = []
    for line in main.split('\n'):
        s = line.rstrip()
        hm = re.match(r'^\*\*(.+?)\*\*$', s)
        if hm:
            if in_emerg:
                out.append('::: emergency'); out += [f'- {x}' for x in emerg_items]; out.append(note if note else ''); out.append(':::'); out.append('')
                in_emerg = False
            name = hm.group(1).strip()
            if name.startswith('立即联系'):
                in_emerg = True; emerg_items = []; note = ''
                continue
            out.append(f'## {name}')
            continue
        if in_emerg:
            im = re.match(r'^>\s*·\s*(.*)$', s)
            if im and im.group(1).strip():
                emerg_items.append(im.group(1).strip()); continue
            if re.match(r'^>\s*$', s) or s == '':
                continue
            if s.startswith('>'):
                if emerg_items:
                    emerg_items[-1] += s.lstrip('> ').strip()
                else:
                    emerg_items.append(s.lstrip('> ·').strip())
                continue
            note = s.strip()
            out.append('::: emergency'); out += [f'- {x}' for x in emerg_items]; out.append(note); out.append(':::'); out.append('')
            in_emerg = False
            continue
        s = re.sub(r'^(\d+)\\\.\s*', r'\1. ', s)
        s = s.replace('**', '')
        if s.startswith('> '):
            s = s[2:]
        out.append(s)
    body_md = re.sub(r'\n{3,}', '\n\n', '\n'.join(out)).strip()
    # 表格单元格里的加粗已去掉；有序列表之间的空行去掉
    body_md = re.sub(r'(\n\d+\. [^\n]+)\n\n(?=\d+\. )', r'\1\n', body_md)
    body_md = re.sub(r'(\n\d+\. [^\n]+)\n\n(?=\d+\. )', r'\1\n', body_md)

    fm = [
        '---', f'id: {nid}', f'title: {title}', f'subtitle: {subtitle}', f'category: {category}',
        f'page_type: {page_type}', f'evidence: {evidence}', f'batch: {toc.get(nid, "")}', 'status: 原稿',
        'verified: 2026-11-02', f'emergency: {"true" if "::: emergency" in body_md else "false"}',
        f'summary: {summary}', f'takeaway: {takeaway}', '---', '',
    ]
    doc = '\n'.join(fm) + body_md + '\n\n'
    if evidence_text:
        doc += '::: evidence\n' + evidence_text + '\n:::\n\n'
    if refs:
        doc += '## 参考文献\n\n' + '\n'.join(f'[{n}] {re.sub(r"\s+", " ", t)}' for n, t in refs) + '\n'
    (out_dir / f'{nid}.md').write_text(doc, encoding='utf-8')
    print(nid, title, len(refs))
