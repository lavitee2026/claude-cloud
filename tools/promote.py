#!/usr/bin/env python3
"""把一篇原稿按替换表修订后移入 content/articles/。
用法：python3 tools/promote.py 02 edits.json
edits.json 为 [[旧文本, 新文本], ...]；旧文本必须在原稿中恰好出现一次。
另把 status 改为修订，verified 改为当天。"""
import json, sys, datetime, subprocess
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
nid, edits_file = sys.argv[1], sys.argv[2]
src = ROOT / 'content/originals' / f'{nid}.md'
dst = ROOT / 'content/articles' / f'{nid}.md'
t = src.read_text(encoding='utf-8')
for old, new in json.loads(Path(edits_file).read_text(encoding='utf-8')):
    n = t.count(old)
    if n != 1:
        sys.exit(f'替换失败（出现 {n} 次）：{old[:40]}')
    t = t.replace(old, new)
t = t.replace('status: 原稿', 'status: 修订')
import re
t = re.sub(r'^verified: .*$', f'verified: {datetime.date.today().isoformat()}', t, count=1, flags=re.M)
dst.write_text(t, encoding='utf-8')
subprocess.run(['git', 'rm', '-q', '--cached', str(src)], cwd=ROOT, check=False)
src.unlink()
print('修订', nid, '→', dst.relative_to(ROOT))
