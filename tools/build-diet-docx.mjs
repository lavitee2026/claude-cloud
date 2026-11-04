#!/usr/bin/env node
// 生成 docx：dist/吃的证据-全稿.docx
// 内容源：content/diet/01.md 至 09.md 为正文，content/diet/appendix.md 为编辑附录（不随文发布）。
// 版式沿用 tools/build-docx.mjs 的构件，参数见工程化说明「docx 版式」一节。
import path from 'node:path';
import { ROOT, listDocs, loadDoc } from './lib.mjs';
import {
  docx, P, masthead, summaryBlock, takeaway, table, spacer, blocks, footer, NUMBERING, STYLES, SECTION_PROPS, save,
} from './build-docx.mjs';

const { Document } = docx;

const SERIES = '吃的证据';
const DISCLAIMER = '本系列为饮食与营养科普，不构成诊断或治疗建议，不推荐任何食品、补剂、护肤品或品牌。患有慢性病、正在服药、备孕或怀孕的读者，调整饮食之前请先咨询医生或医院的临床营养科。';
const INTEREST = '作者从事医疗美容机构经营管理工作。本系列不推荐任何具体机构和产品，文中提到的企业与组织均为公开报道中的事例。';

async function build() {
  const articles = listDocs('content/diet').filter((d) => /\/\d{2}\.md$/.test(d.file));
  const appendix = loadDoc(path.join(ROOT, 'content/diet/appendix.md'));

  const children = [];
  children.push(...masthead('', SERIES, '营养说法的证据与适合的做法', `${articles.length} 篇全稿 · 2026 年 11 月`));
  children.push(P.h1('本册内容'));
  children.push(P.body('本册收入「吃的证据」系列的全部篇目。每篇开头是速读摘要和一句结论，正文用方括号数字标注来源，对应篇末的参考文献，研究机构与数据来源写在篇末的注里。册末的编辑附录收录系列设定、发布顺序、作者待补的位置和待核清单，供编辑使用，不随文发布。'));
  children.push(table(['编号', '篇目', '读者能得到什么'], articles.map((a) => [a.meta.id, `${a.meta.title} · ${a.meta.subtitle}`, a.meta.reader || '']), [900, 4300, 4106]));
  children.push(spacer());
  children.push(P.h1('声明'));
  children.push(P.note(DISCLAIMER, { before: 0 }));
  children.push(P.note(INTEREST));

  for (const a of articles) {
    const m = a.meta;
    children.push(P.pageBreak());
    children.push(...masthead(`第 ${Number(m.id)} 篇 · ${SERIES}`, m.title, m.subtitle));
    children.push(summaryBlock(m.summary), takeaway(m.takeaway));
    children.push(...blocks(a.blocks));
    children.push(P.signature());
  }

  const am = appendix.meta;
  children.push(P.pageBreak());
  children.push(...masthead('编辑附录 · 不随文发布', am.title, am.subtitle));
  children.push(...blocks(appendix.blocks));

  const doc = new Document({
    creator: '于意云', title: `${SERIES} 全稿`, description: '吃的证据系列九篇全稿与编辑附录',
    styles: STYLES, numbering: NUMBERING,
    sections: [{ properties: SECTION_PROPS, footers: { default: footer(`${SERIES} · 全稿`) }, children }],
  });
  await save(doc, path.join(ROOT, 'dist/吃的证据-全稿.docx'));
}

await build();
