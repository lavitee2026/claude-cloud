#!/usr/bin/env python3
"""确定网站域名后运行一次：给每页补上规范网址与分享图地址，生成站点地图，并更新 robots.txt。
用法（在网站目录里运行）：
    python3 set-domain.py https://www.example.com/
    python3 set-domain.py https://www.example.com/yimei/     # 部署在子目录时带上目录
可以重复运行，换域名时再运行一次即可。只用 Python 3 自带的库。"""
import json, re, sys
from pathlib import Path

if len(sys.argv) != 2 or not re.match(r'^https?://', sys.argv[1]):
    sys.exit('用法：python3 set-domain.py https://你的域名/')
base = sys.argv[1] if sys.argv[1].endswith('/') else sys.argv[1] + '/'
root = Path(__file__).resolve().parent
BLOCK = re.compile(r'<!--site-url-begin-->.*?<!--site-url-end-->\n?', re.S)
MARK = re.compile(r'<!--site-url:([^:]+):([^>]+?)-->')

# 404 页会在任意深度的缺失网址下显示，相对链接会错位，所以改成完整网址；上次写入的域名记在注释里，换域名时整体替换
BASE_MARK = re.compile(r'<!--site-base:([^>]*)-->')
def fix_404(t):
    old = BASE_MARK.search(t)
    if old:
        o = old.group(1)
        if o == base:
            return t
        # 只换本站页面与资源的链接（旧域名后面还跟着文件），上层站点的链接不动
        t = re.sub(r'(\s(?:href|src)=")' + re.escape(o) + r'(?=[^"])', lambda m: m.group(1) + base, t)
        return t.replace(old.group(0), f'<!--site-base:{base}-->')
    t = re.sub(r'(\s(?:href|src)=")(?!https?:|#|/|data:|mailto:)', lambda m: m.group(1) + base, t)
    return t.replace('<head>', f'<head>\n<!--site-base:{base}-->', 1)

n = 0
for f in root.rglob('*.html'):
    t0 = f.read_text(encoding='utf-8')
    t = BLOCK.sub('', t0)
    if f.name == '404.html' and f.parent == root:
        t = fix_404(t)
    def repl(m):
        path, key = m.group(1), m.group(2)
        url = base + ('' if path == 'index.html' else path)
        og = f'{base}og/{key}.png'
        return (m.group(0) + '\n<!--site-url-begin-->'
                f'<link rel="canonical" href="{url}">\n<meta property="og:url" content="{url}">\n'
                f'<meta property="og:image" content="{og}">\n<meta property="og:image:width" content="1200">\n'
                '<meta property="og:image:height" content="630"><!--site-url-end-->')
    t2, k = MARK.subn(repl, t)
    if t2 != t0:
        f.write_text(t2, encoding='utf-8'); n += 1

pages = json.loads((root / 'sitemap.json').read_text(encoding='utf-8'))
urls = '\n'.join(f'  <url><loc>{base}{p["path"]}</loc><lastmod>{p["lastmod"]}</lastmod><priority>{p["priority"]}</priority></url>' for p in pages)
(root / 'sitemap.xml').write_text(f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{urls}\n</urlset>\n', encoding='utf-8')
(root / 'robots.txt').write_text(f'User-agent: *\nAllow: /\nSitemap: {base}sitemap.xml\n', encoding='utf-8')
print(f'已处理 {n} 个页面，站点地图 {len(pages)} 条，域名 {base}')
