#!/usr/bin/env python3
"""检查网站目录里的内部链接：链接到的文件要存在，带井号的锚点要在目标页里有对应的 id。
外部链接（http、https、mailto）不检查。有断链时列出前 50 条，退出码为 1。
用法：python3 tools/check-links.py site
      python3 tools/check-links.py build/package/医美选择网站"""
import re
import sys
from pathlib import Path
from urllib.parse import unquote

root = Path(sys.argv[1] if len(sys.argv) > 1 else 'site')
if not root.is_dir():
    sys.exit(f'找不到目录 {root}，先运行 npm run site')
pages = sorted(root.rglob('*.html'))
ids = {f.resolve(): set(re.findall(r'\sid="([^"]+)"', f.read_text(encoding='utf-8'))) for f in pages}
bad, n = [], 0
for f in pages:
    for m in re.finditer(r'\s(?:href|src)="([^"]+)"', f.read_text(encoding='utf-8')):
        u = m.group(1)
        if re.match(r'^(https?:|mailto:|data:|javascript:)', u):
            continue
        n += 1
        path, _, frag = u.partition('#')
        tgt = (f.parent / unquote(path)).resolve() if path else f.resolve()
        if not tgt.exists() or (frag and tgt.suffix == '.html' and unquote(frag) not in ids.get(tgt, set())):
            bad.append(f'{f.relative_to(root)}  {u}')
print(f'{len(pages)} 页，内部链接 {n} 个，断链 {len(bad)} 个')
for b in bad[:50]:
    print('  ' + b)
sys.exit(1 if bad else 0)
