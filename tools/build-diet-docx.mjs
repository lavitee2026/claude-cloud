#!/usr/bin/env node
// 生成 docx：dist/吃的证据.docx（成品，不含编辑附录）
// 内容源：content/diet/01.md 至 10.md。content/diet/appendix.md 是编辑用的记录，不进成品。
// 版式沿用 tools/build-docx.mjs 的构件，参数见工程化说明「docx 版式」一节。
import path from 'node:path';
import { ROOT, listDocs } from './lib.mjs';
import {
  docx, P, masthead, summaryBlock, takeaway, table, spacer, blocks, footer, NUMBERING, STYLES, SECTION_PROPS, save,
} from './build-docx.mjs';

const { Document } = docx;

const SERIES = '吃的证据';
const DISCLAIMER = '本书为饮食与营养科普，不构成诊断或治疗建议，不推荐任何食品、补剂、护肤品或品牌。患有慢性病、正在服药、备孕或怀孕的读者，调整饮食之前请先咨询医生或医院的临床营养科。';
const INTEREST = '作者从事医疗美容机构经营管理工作。本书不推荐任何具体机构和产品，文中提到的企业与组织均为公开报道中的事例。';
const PREFACE = '本书收入「吃的证据」系列十篇。前九篇逐一看几种流行的饮食说法，种子油、红肉、蛋白质、碳水、超加工食品、转基因、吃进去的美容产品和研究资助，证据有多少，放到日常里可以怎么做；第十篇讲证据站得住的几件事。每篇开头是速读和一句结论，正文用方括号数字标注来源，对应篇末的参考文献，研究机构与数据来源写在篇末的注里。';

async function build() {
  const articles = listDocs('content/diet').filter((d) => /\/\d{2}\.md$/.test(d.file));

  const children = [];
  children.push(...masthead('', SERIES, '营养说法的证据与适合的做法', '于意云 · 2026 年 11 月'));
  children.push(P.h1('本书内容'));
  children.push(P.body(PREFACE));
  children.push(table(['编号', '篇目', '本篇内容'], articles.map((a) => [a.meta.id, `${a.meta.title} · ${a.meta.subtitle}`, a.meta.reader || '']), [900, 4300, 4106]));
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

  const doc = new Document({
    creator: '于意云', title: SERIES, description: '吃的证据：营养说法的证据与适合的做法',
    styles: STYLES, numbering: NUMBERING,
    sections: [{ properties: SECTION_PROPS, footers: { default: footer(SERIES) }, children }],
  });
  await save(doc, path.join(ROOT, 'dist/吃的证据.docx'));
}

await build();
