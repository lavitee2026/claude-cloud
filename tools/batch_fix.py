#!/usr/bin/env python3
"""原稿的机械修订：删去摘要里的报幕句，改带疑问的小标题，补 problems、needs、related 字段。
用法：python3 tools/batch_fix.py content/originals/*.md
证据核查与改写另行逐篇进行。"""
import re, sys, json, subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
HEADINGS = {
    '统计数字说的是什么': '统计数字的含义', '费用由什么组成': '费用组成', '什么时候联系机构': '联系机构的时机',
    '签字意味着什么': '签字的效力', '怎么查一个产品': '产品查询', '看到时怎么想': '辨别方法',
    '价格由什么组成': '价格组成', '谁来打、在哪里打': '注射者与场所', '监管怎么规定': '监管规定',
    '监管怎么认定': '监管认定', '发现了怎么办': '发现后的处理', '出院时带走什么': '出院资料',
    '为什么是四级': '四级的依据', '头衔怎么看': '头衔的含义', '网上怎么查': '网上查询',
    '效果不满意怎么处理': '效果不满意的处理', '咨询中被放大怎么办': '咨询中的应对', '在哪里做': '场所要求',
    '医疗损害怎么处理': '医疗损害的处理', '谁来做': '麻醉的实施者', '为什么要算维持成本': '单次价格与一年花费',
    '法律怎么规定': '法律规定', '美容院能做什么': '美容院的业务范围', '出了问题怎么办': '纠纷处理',
    '价差从哪里来': '价差来源', '价目表怎么看': '价目表的读法', '怎样读这张表': '表的读法',
}
# 导航表（与 tools/nav.mjs 一致）
nav = subprocess.run(['node', '-e', "import('./tools/nav.mjs').then(m=>console.log(JSON.stringify({p:m.PROBLEMS,n:m.NEEDS})))"], cwd=ROOT, capture_output=True, text=True).stdout
nav = json.loads(nav)

def fm_list(v):
    return '[' + ', '.join(v) + ']'

for f in sys.argv[1:]:
    path = Path(f)
    t = path.read_text(encoding='utf-8')
    fm_end = t.index('\n---\n', 4) + 5
    fm, body = t[:fm_end], t[fm_end:]
    nid = re.search(r'^id: (\d+)', fm, re.M).group(1)
    # 摘要报幕句
    def fix_summary(m):
        sents = [s for s in m.group(1).split('。') if s.strip()]
        sents = [s for s in sents if not s.strip().startswith('本文')]
        return 'summary: ' + '。'.join(sents) + '。'
    fm = re.sub(r'^summary: (.+)$', fix_summary, fm, flags=re.M)
    # 小标题
    for a, b in HEADINGS.items():
        body = body.replace(f'\n## {a}\n', f'\n## {b}\n')
    # 导航字段
    problems = [x['name'] for x in nav['p'] if nid in x['ids']]
    needs = [x['name'] for x in nav['n'] if nid in x['ids']]
    related = []
    for m in re.finditer(r'第 ((?:\d{1,2}、?)+) 篇', body):
        for n in m.group(1).split('、'):
            if n and f'{int(n):02d}' != nid and f'{int(n):02d}' not in related:
                related.append(f'{int(n):02d}')
    related = sorted(related)
    fm = re.sub(r'^(problems|needs|related): .*\n', '', fm, flags=re.M)
    fm = fm.replace('\nsummary:', f'\nproblems: {fm_list(problems)}\nneeds: {fm_list(needs)}\nrelated: {fm_list(related)}\nsummary:', 1)
    path.write_text(fm + body, encoding='utf-8')
    print(nid, len(problems), len(needs), len(related))
