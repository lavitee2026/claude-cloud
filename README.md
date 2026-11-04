# 医美选择

「医美选择」栏目的内容源、网站与 docx 的构建工具。写作规范见 `写作规范.md`，规格与设计依据见 `docs/工程化说明.md`，日常更新、发布与故障处理的操作步骤见 `docs/维护手册.md`。

```bash
npm install          # 安装 mermaid、docx、axe-core
npm run build        # 自检、出图、网站、分享卡片图、docx、断链检查
npm run a11y         # 无障碍抽查，加 -- --all 检查全部页面
npm run package      # 部署包 dist/医美选择网站-日期.zip
npm run preview      # 本地预览 http://127.0.0.1:8080
```

单项命令（lint、figures、site、og、docx、check）与先后顺序见维护手册的命令一节。出图和分享卡片图需要 Playwright 与中文字体，安装方法见维护手册的环境准备一节。

网站由 `.github/workflows/pages.yml` 发布到 GitHub Pages，首次使用前在仓库 Settings → Pages 把 Source 设为 GitHub Actions。站点网址、自定义域名与版次在 `tools/site.config.json` 修改。
