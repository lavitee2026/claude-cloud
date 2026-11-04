// 第二批图：5 张 mermaid、2 张静态 SVG、4 张交互图。文字均取自对应篇目。
// 交互图提供 html()（站点用，含控件）与 staticHtml()（出 PNG 用）；无静态图的标 noPng。
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const T = (x, y, s, o = {}) => `<text x="${x}" y="${y}"${o.anchor ? ` text-anchor="${o.anchor}"` : ''} font-size="${o.size || 13}"${o.cls ? ` class="${o.cls}"` : ''}${o.weight ? ` font-weight="${o.weight}"` : ''}>${esc(s)}</text>`;

// ---------- mermaid ----------
const verify = {
  kind: 'mermaid', alt: '机构、诊疗科目、项目、医生、产品逐层查证',
  caption: '机构、医生和产品逐层查证，任何一层对不上，就不在这里做。',
  src: `flowchart TD
  A["机构<br/>医疗机构执业许可证，营业执照不能代替"] --> B["诊疗科目<br/>许可证上核准了对应的美容科目"]
  B --> C["项目<br/>在机构的项目或手术目录里，属于几级"]
  C --> D["医生<br/>执业地点在这家机构，主诊医师资格，手术有授权"]
  D --> E["产品<br/>批准文号或注册证号查得到，当面打开，核对批号"]
  E --> F["都对得上，再谈价格"]
  A -. "对不上" .-> X["不在这里做"]
  B -. "对不上" .-> X
  C -. "对不上" .-> X
  D -. "对不上" .-> X
  E -. "对不上" .-> X`,
};
const triage = {
  kind: 'mermaid', alt: '治疗后的变化按两份清单分流',
  caption: '治疗后的变化，按治疗前拿到的两份清单分流，拿不准的交给医生判断。',
  src: `flowchart TD
  A["治疗后出现变化"] --> B{{"对照治疗前医生写下的两份清单"}}
  B -- "在正常反应清单里" --> C["按清单护理，每天定时拍照，按时复诊"]
  B -- "拿不准" --> D["拍照发给机构，打电话说明，让医生判断"]
  B -- "在立即联系清单里" --> E["立即联系做治疗的机构和医生"]
  E -- "联系不上，或症状加重" --> F["去有相应急诊的综合医院"]
  B -- "胸痛、呼吸困难、咯血、喉咙发紧" --> G["直接打 120"]`,
};
const surgery = {
  kind: 'mermaid', alt: '外科术后的紧急信号与对应动作',
  caption: '外科术后的几类信号和对应的动作，局部的问题找做手术的医生，全身的问题直接打 120。',
  src: `flowchart LR
  H["一侧突然明显肿胀、发硬<br/>伤口持续渗血"] --> M["立即联系做手术的医生"]
  I["发热<br/>伤口红肿热痛加重或流脓"] --> M
  M -- "联系不上" --> ER["有整形外科或普外科急诊的综合医院"]
  V["单侧小腿肿痛"] --> G["直接打 120"]
  P["突发胸痛、呼吸困难、咯血"] --> G
  L["口周发麻、耳鸣<br/>意识模糊、抽搐"] --> G`,
};
const dispute = {
  kind: 'mermaid', alt: '效果不满意与医疗损害的分流与处理途径',
  caption: '先处理身体，再分清两种情况，处理途径按协商、调解、诉讼的顺序。',
  src: `flowchart TD
  A["做完不满意"] --> B["先处理身体的问题"]
  B --> C{{"诊疗中受到损害<br/>且机构或医生有过错吗"}}
  C -- "没有，效果和预期不一样" --> D["效果不满意<br/>看术前约定，协商补做、修复或部分退费"]
  C -- "有，过错往往需要鉴定" --> E["医疗损害<br/>有过错的，由医疗机构承担赔偿责任"]
  D --> F["协商，结果写成书面协议"]
  E --> F
  F -- "不成" --> G["人民调解或行政调解"]
  G -- "不成" --> H["向人民法院起诉"]
  B -.-> R["全程保存证据<br/>复制病历，必要时封存"]`,
};
const money = {
  kind: 'mermaid', alt: '预付与分期的资金流向',
  caption: '预付的钱在机构手里；分期的借款合同另一方是金融机构，对治疗不满意不影响还款。',
  src: `flowchart LR
  subgraph 预付
    A1["你"] -- "储值、买套餐" --> B1["医美机构<br/>余额在机构手里"]
    B1 -- "分次提供服务" --> A1
  end
  subgraph 分期
    A2["你"] -- "签借款合同，按月还款" --> C2["金融机构或分期平台"]
    C2 -- "替你一次付清" --> B2["医美机构"]
    B2 -- "提供服务" --> A2
  end`,
};

// ---------- 25 手术分级（静态） ----------
function gradesSvg() {
  const steps = [
    { lv: '一级', lines: ['操作不复杂', '难度和风险不大'] },
    { lv: '二级', lines: ['有一定难度和风险', '硬膜外阻滞麻醉', '静脉全身麻醉'] },
    { lv: '三级', lines: ['难度和风险较大', '术前备血', '气管插管全身麻醉'] },
    { lv: '四级', lines: ['难度高、风险大', '目录里只有五项', '三级整形外科医院', '或设相关科室的', '三级综合医院'] },
  ];
  let s = `<svg viewBox="0 0 680 350" role="img" aria-label="美容外科项目的四个级别" class="fig-svg">`;
  steps.forEach((st, i) => {
    const w = 155, x = 14 + i * 165, h = 100 + i * 45, y = 310 - h;
    s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" class="f${i < 2 ? 1 : i === 2 ? 2 : 3} outline-r"/>`;
    s += T(x + 12, y + 28, st.lv, { size: 17, weight: 600 });
    st.lines.forEach((l, j) => { s += T(x + 12, y + 52 + j * 20, l, { size: 12, cls: j === 0 ? '' : 'muted' }); });
  });
  s += `<line x1="8" y1="310" x2="672" y2="310" class="ln-strong"/>`;
  s += T(14, 336, '级别越高，对麻醉、机构条件和医生授权的要求越严', { size: 12, cls: 'muted' });
  s += `</svg>`;
  return s;
}
const grades = { kind: 'svg', svg: gradesSvg, alt: '美容外科项目分级与麻醉、机构要求', caption: '2009 年《医疗美容项目分级管理目录》的四个级别，各省可在此基础上调整。' };

// ---------- 05 可逆性三个程度（静态） ----------
function reversibilitySvg() {
  const cols = [
    { t: '可逆性较好', items: ['肉毒毒素，随时间代谢', '透明质酸，可以溶解', '强脉冲光、激光', '射频、超声'], cls: 'f1' },
    { t: '部分可逆', items: ['胶原蛋白', '聚左旋乳酸、聚己内酯', '鼻部假体，可以取出', '乳房假体，可以取出'], cls: 'f2' },
    { t: '难以回头', items: ['截骨、削骨', '重睑切开、眼袋手术', '吸脂、腹壁成形', '颌面骨手术'], cls: 'f3' },
  ];
  let s = `<svg viewBox="0 0 660 250" role="img" aria-label="常见项目按可逆性分为三个程度" class="fig-svg">`;
  cols.forEach((c, i) => {
    const x = 10 + i * 217;
    s += `<rect x="${x}" y="10" width="205" height="44" class="${c.cls} outline-r"/>`;
    s += T(x + 102, 38, c.t, { anchor: 'middle', size: 16, weight: 600 });
    c.items.forEach((it, j) => { s += `<line x1="${x}" y1="${88 + j * 40}" x2="${x + 205}" y2="${88 + j * 40}" class="ln-thin"/>` + T(x + 10, 80 + j * 40, it, { size: 13 }); });
  });
  s += `<path d="M20 238 L640 238" class="ln-strong"/><path d="M630 232 L642 238 L630 244 Z" class="solid"/>`;
  s += T(20, 230, '越往右，做了以后越难回到原样', { size: 12, cls: 'muted' });
  s += `</svg>`;
  return s;
}
const reversibility = { kind: 'svg', svg: reversibilitySvg, alt: '常见项目的可逆性', caption: '项目本身的可逆程度，并发症要另外看，可逆的产品引起的并发症不一定可逆。' };

// ---------- 03 对照（交互，无静态图） ----------
export const COMPARE_ROWS = [
  // [项目, 类别, 恢复期, 效果出现, 维持时间, 可逆性(1 较好 2 部分 3 难以回头), 排序用的恢复天数]
  ['强脉冲光', '光电', '发红数小时到一两天，色斑结痂约一周脱落', '逐次显现，一般三到五次', '数月到一两年', 1, 1],
  ['色素激光', '光电', '结痂一到两周', '痂皮脱落后可见', '雀斑、晒斑可能复发', 1, 10],
  ['非剥脱点阵', '光电', '发红、轻度肿胀一到三天', '一到三个月逐渐显现，需多次', '对痘坑的改善相对持久', 1, 2],
  ['剥脱点阵', '光电', '渗出、结痂一到两周，发红可持续数周', '一到三个月逐渐显现', '对痘坑的改善相对持久', 1, 14],
  ['射频', '光电', '多数当天可正常活动', '一到三个月逐渐显现', '数月到一年', 1, 0.5],
  ['微聚焦超声', '光电', '当天可正常活动，压痛或轻度肿胀数天', '二到三个月逐渐显现', '研究随访到一年', 1, 0.6],
  ['激光脱毛', '光电', '发红数小时到一天', '常需四到八次', '毛发长期减少，部分会再生', 1, 0.4],
  ['肉毒毒素', '注射', '针眼当天消退，偶有淤青', '三到七天起效，两周稳定', '三到六个月', 1, 0.3],
  ['透明质酸', '注射', '肿胀、淤青三到七天', '注射后即可看到', '六个月到一年半', 1, 5],
  ['胶原蛋白', '注射', '轻度肿胀数天', '注射后即可看到', '多为数月到一年', 2, 3],
  ['再生类材料', '注射', '肿胀数天，按要求按摩', '数周到数月逐渐显现', '一到两年或更长', 2, 3.5],
  ['重睑术', '外科', '明显肿胀一到两周', '三到六个月外形稳定', '长期，随年龄变化', 3, 14],
  ['鼻整形', '外科', '肿胀二到三周，外形稳定需半年到一年', '半年到一年', '长期，假体需随访', 2, 21],
  ['眼袋手术', '外科', '肿胀、淤青一到两周', '一到三个月', '多年，随年龄变化', 3, 12],
  ['吸脂', '外科', '穿压力衣数周，肿胀一到三个月', '三到六个月', '长期，受体重变化影响', 3, 45],
  ['隆乳（假体）', '外科', '恢复正常活动需数周', '三到六个月', '假体需长期随访', 2, 28],
];
const REV = { 1: '可逆性较好', 2: '部分可逆', 3: '难以回头' };
const compare = {
  kind: 'interactive', noPng: true, svg: () => '', alt: '常见项目的恢复期、效果出现、维持时间与可逆性对照',
  caption: '恢复期等均为常见区间，排序只按恢复期的大致长短，具体以说明书和医生告知为准。',
  html: () => {
    const chip = (g, v, label, on) => `<button type="button" class="chip${on ? ' on' : ''}" data-g="${g}" data-v="${v}" aria-pressed="${on}">${label}</button>`;
    const rows = COMPARE_ROWS.map((r) => `<tr data-cat="${r[1]}" data-rev="${r[5]}" data-rec="${r[6]}"><th scope="row">${esc(r[0])}</th><td>${esc(r[2])}</td><td>${esc(r[3])}</td><td>${esc(r[4])}</td><td><span class="rev rev${r[5]}">${REV[r[5]]}</span></td></tr>`).join('');
    return `<div class="fig-compare" data-fig="compare"><div class="cmp-ctl"><div class="cmp-g" role="group" aria-label="类别">${chip('cat', '', '全部', true)}${chip('cat', '光电', '光电', false)}${chip('cat', '注射', '注射', false)}${chip('cat', '外科', '外科', false)}</div><div class="cmp-g" role="group" aria-label="可逆性">${chip('rev', '', '不限', true)}${chip('rev', '1', '可逆性较好', false)}${chip('rev', '2', '部分可逆', false)}${chip('rev', '3', '难以回头', false)}</div><label class="cmp-sort"><input type="checkbox" id="cmp-sort"> 按恢复期从短到长</label></div><div class="table-wrap" tabindex="0" role="region" aria-label="对照表，可左右滑动"><table class="cmp-table"><thead><tr><th scope="col">项目</th><th scope="col">恢复期的日常影响</th><th scope="col">效果出现</th><th scope="col">维持时间</th><th scope="col">能否回头</th></tr></thead><tbody>${rows}</tbody></table></div><p class="cmp-count" aria-live="polite"></p></div>`;
  },
};

// ---------- 12 选择性光热作用（交互动画） ----------
function sptSvg() {
  let s = `<svg viewBox="0 0 640 300" role="img" aria-label="选择性光热作用示意" class="fig-svg spt">`;
  s += `<rect x="20" y="70" width="600" height="40" class="f1"/><rect x="20" y="110" width="600" height="170" class="f2"/>`;
  s += `<line x1="20" y1="70" x2="620" y2="70" class="ln-strong"/>`;
  s += T(28, 94, '表皮', { size: 12, cls: 'muted' }) + T(28, 134, '真皮', { size: 12, cls: 'muted' });
  s += `<g id="spt-beam" opacity="0"><rect x="300" y="0" width="40" height="70" class="beam"/><path d="M300 70 L340 70 L360 280 L280 280 Z" class="beam-in"/></g>`;
  s += `<circle id="spt-halo" cx="320" cy="90" r="10" class="halo"/>`;
  s += `<circle id="spt-pig" cx="320" cy="90" r="9" class="target"/>`;
  s += `<ellipse id="spt-ves-halo" cx="320" cy="200" rx="26" ry="12" class="halo"/>`;
  s += `<ellipse id="spt-ves" cx="320" cy="200" rx="26" ry="11" class="vessel"/>`;
  s += T(352, 94, '色素颗粒', { size: 12 }) + T(352, 204, '扩张的小血管', { size: 12 });
  s += `<text id="spt-msg" x="20" y="40" font-size="14" font-weight="600"></text>`;
  s += `</svg>`;
  return s;
}
const spt = {
  kind: 'interactive', svg: sptSvg, alt: '选择性光热作用：波长对准目标、脉冲时间合适时，热量只留在目标里',
  caption: '选择合适的波长和脉冲时间，目标吸收光能受热，周围组织少受损伤。图为示意。',
  html: () => `<div class="fig-spt" data-fig="spt">${sptSvg()}<div class="spt-ctl"><div class="cmp-g" role="group" aria-label="目标">${['色素', '血管'].map((v, i) => `<button type="button" class="chip${i === 0 ? ' on' : ''}" data-g="target" data-v="${v}" aria-pressed="${i === 0}">目标 ${v}</button>`).join('')}</div><div class="cmp-g" role="group" aria-label="波长">${[['on', '波长对准目标'], ['off', '波长没对准']].map(([v, l], i) => `<button type="button" class="chip${i === 0 ? ' on' : ''}" data-g="wave" data-v="${v}" aria-pressed="${i === 0}">${l}</button>`).join('')}</div><div class="cmp-g" role="group" aria-label="脉冲时间">${[['short', '脉冲时间合适'], ['long', '脉冲时间过长']].map(([v, l], i) => `<button type="button" class="chip${i === 0 ? ' on' : ''}" data-g="pulse" data-v="${v}" aria-pressed="${i === 0}">${l}</button>`).join('')}</div><button type="button" class="spt-fire">照射</button></div><p class="bx-status spt-status" aria-live="polite"></p></div>`,
  staticState: 'ideal',
};

// ---------- 18 毛囊周期（交互） ----------
const hair = {
  kind: 'interactive', alt: '毛囊轮流进入生长期，所以激光脱毛要分次做',
  caption: '图为示意。只有处在生长期的毛囊对激光反应好，毛囊轮流进入生长期，所以要按周期分次治疗；实际效果因人而异，长期永久脱毛缺乏高质量证据。',
  svg: () => `<svg viewBox="0 0 640 230" role="img" aria-label="毛囊周期示意" class="fig-svg hair"><rect x="20" y="70" width="600" height="100" class="f1"/><line x1="20" y1="70" x2="620" y2="70" class="ln-strong"/>${T(20, 62, '皮肤表面', { size: 12, cls: 'muted' })}<g id="hair-g"></g><g id="hair-legend" transform="translate(20,205)"></g></svg>`,
  html() { return `<div class="fig-hair" data-fig="hair">${this.svg()}<div class="spt-ctl"><button type="button" class="spt-fire hair-go">做一次治疗，再等一个周期</button><button type="button" class="chip hair-reset">重新开始</button></div><p class="bx-status hair-status" aria-live="polite"></p></div>`; },
};

// ---------- 22 填充材料时间轴（交互） ----------
export const FILLERS = [
  { name: '透明质酸', onset: [0, 0.5], keep: [6, 18], keepText: '多为六个月到一年半', onsetText: '注射后即刻，一到两周稳定', dissolve: '可以用透明质酸酶溶解' },
  { name: '胶原蛋白', onset: [0, 0.2], keep: [3, 12], keepText: '多为数月到一年', onsetText: '注射后即刻', dissolve: '多数不能溶解' },
  { name: '再生类材料', onset: [1, 3], keep: [12, 24], keepText: '多为一到两年或更久，常需两到三次', onsetText: '几周到几个月逐渐出现', dissolve: '不能溶解，有结节的风险', more: true },
  { name: '自体脂肪', onset: [0, 3], keep: [3, 36], keepText: '存活的部分长期保留，面部研究汇总约保留一半', onsetText: '存活率因部位和个人而异', dissolve: '不能溶解', faint: true },
];
function fillersSvg() {
  const X = (m) => 150 + (m / 36) * 460;
  let s = `<svg viewBox="0 0 640 250" role="img" aria-label="四种填充材料的起效与维持时间" class="fig-svg fillers">`;
  for (const m of [0, 6, 12, 18, 24, 30, 36]) s += `<line x1="${X(m)}" y1="20" x2="${X(m)}" y2="215" class="ln-thin"/>` + T(X(m), 234, String(m), { anchor: 'middle', size: 11, cls: 'muted' });
  s += T(620, 234, '月', { size: 11, cls: 'muted' });
  FILLERS.forEach((f, i) => {
    const y = 30 + i * 48;
    s += `<g class="fl-row" data-i="${i}" tabindex="0" role="button" aria-label="${f.name}">`;
    s += T(140, y + 18, f.name, { anchor: 'end', size: 13, weight: 600 });
    s += `<rect x="${X(f.onset[0])}" y="${y + 6}" width="${Math.max(3, X(f.onset[1]) - X(f.onset[0]))}" height="18" class="f3"/>`;
    s += `<rect x="${X(f.keep[0])}" y="${y + 6}" width="${X(f.keep[1]) - X(f.keep[0])}" height="18" class="${f.faint ? 'bar-faint' : 'bar'}"/>`;
    if (f.more || f.faint) s += `<path d="M${X(f.keep[1]) + 2} ${y + 6} L${X(f.keep[1]) + 12} ${y + 15} L${X(f.keep[1]) + 2} ${y + 24} Z" class="solid"/>`;
    s += `<rect x="20" y="${y}" width="600" height="30" class="hit"/></g>`;
  });
  s += `</svg>`;
  return s;
}
const fillers = {
  kind: 'interactive', svg: fillersSvg, alt: '透明质酸、胶原蛋白、再生类材料、自体脂肪的起效与维持时间',
  caption: '深色为起效阶段，浅色为常见的维持区间，箭头表示可能更久；区间为说明书和研究中的常见范围，以产品说明书为准。',
  html: () => `<div class="fig-fillers" data-fig="fillers" data-rows="${esc(JSON.stringify(FILLERS))}">${fillersSvg()}<div class="fl-panel" aria-live="polite"></div><p class="fig-hint">点选一种材料查看说明</p></div>`,
};

export const FIGURES2 = { verify, triage, surgery, dispute, money, grades, reversibility, compare, spt, hair, fillers };

export const FIGURE2_CSS = `
.fig-svg .outline-r{stroke:var(--ink);stroke-width:1}
.fig-svg .beam{fill:var(--ink);opacity:.25} .fig-svg .beam-in{fill:var(--ink);opacity:.12}
.fig-svg .target{fill:var(--ink);transition:r .4s} .fig-svg .vessel{fill:var(--paper);stroke:var(--ink);stroke-width:1.5}
.fig-svg .vessel.hot{fill:var(--ink)} .fig-svg .halo{fill:var(--ink);opacity:0;transition:r .9s,rx .9s,ry .9s,opacity .9s}
.fig-svg .bar{fill:var(--fill-3)} .fig-svg .bar-faint{fill:var(--fill-2);stroke:var(--ink);stroke-width:.6;stroke-dasharray:3 2}
.fig-svg .hit{fill:transparent;cursor:pointer} .fig-svg .fl-row:focus{outline:none} .fig-svg .fl-row.on .hit,.fig-svg .fl-row:focus .hit{fill:var(--ink);fill-opacity:.07}
.fig-svg .hair-s{stroke:var(--ink);stroke-width:2.4;stroke-linecap:round} .fig-svg .hair-s.thin{stroke-width:1;opacity:.6}
.fig-svg .bulb{fill:var(--ink)} .fig-svg .bulb.rest{fill:var(--paper);stroke:var(--ink);stroke-width:1} .fig-svg .bulb.dead{fill:var(--fill-2);stroke:var(--ink3);stroke-width:1;stroke-dasharray:2 2}
.chip{font:inherit;font-family:var(--sans);font-size:13px;color:var(--ink);background:var(--paper);border:1px solid var(--rule);padding:3px 10px;cursor:pointer}
.chip.on{border-color:var(--ink);background:var(--panel)} .chip:hover{border-color:var(--ink)}
.cmp-ctl,.spt-ctl{display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center;margin:0 0 8px;font-family:var(--sans);font-size:13px}
.cmp-g{display:flex;flex-wrap:wrap;gap:6px}
.cmp-sort{display:flex;gap:6px;align-items:center}
.cmp-table th[scope=row]{font-family:var(--sans);font-weight:600;white-space:nowrap;text-align:left;padding:8px 10px;border-bottom:1px solid var(--rule)}
.rev{font-family:var(--sans);font-size:12px;border:1px solid var(--ink);padding:0 5px;white-space:nowrap} .rev2{background:var(--fill-1)} .rev3{background:var(--fill-2)}
.cmp-count{font-family:var(--sans);font-size:12px;color:var(--ink3);margin:4px 0 0}
.spt-fire{font:inherit;font-family:var(--sans);font-size:14px;color:var(--ink);background:var(--paper);border:1.5px solid var(--ink);padding:4px 16px;cursor:pointer}
.spt-fire:hover{background:var(--panel)}
.fl-panel{font-family:var(--sans);font-size:14px;line-height:1.7;border-top:1px solid var(--rule);padding-top:8px;min-height:4.8em}
.fl-panel b{font-weight:600}
.navmap{display:block} .navmap a text{fill:var(--ink)} .navmap a:hover text,.navmap a:focus text{text-decoration:underline} .navmap a:focus{outline:none}
.navmap .pt{fill:var(--ink)} .navmap .lead{stroke:var(--ink3);stroke-width:.8}
@media (max-width:520px){.navmap-wrap{display:none}}
`;
