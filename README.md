# 医美选择

「医美选择」栏目的内容源、网站与 docx 的构建工具。写作规范见 `写作规范.md`，工程细节见 `docs/工程化说明.md`。

```bash
npm install          # 安装 mermaid（预渲染流程图用）
npm run lint         # 写作规范自检
npm run figures      # 出图：build/figures/*.svg、*.png
npm run site         # 网站：site/（多页）与 site-preview/index.html（单文件）
npm run og           # 分享卡片图：site/og/
npm run docx         # docx：dist/
npm run preview      # 本地预览 http://127.0.0.1:8080
```

修订一篇稿件的流程、证据等级标准与待核清单，见工程化说明。

网站由 `.github/workflows/pages.yml` 发布到 GitHub Pages，首次使用前在仓库 Settings → Pages 把 Source 设为 GitHub Actions。站点网址与自定义域名在 `tools/site.config.json` 修改。
