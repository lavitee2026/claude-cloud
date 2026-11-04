// 图的登记表。每张图只讲一件事；颜色只用主题变量（--fg 前景、--bg 背景、--muted 次要、--fill-1/2/3 灰阶），黑白灰细线。
// kind: mermaid（构建时预渲染为 SVG）、svg（静态）、interactive（静态 SVG + 交互脚本，docx 用静态帧）

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const T = (x, y, s, o = {}) => `<text x="${x}" y="${y}"${o.anchor ? ` text-anchor="${o.anchor}"` : ''}${o.size ? ` font-size="${o.size}"` : ''}${o.cls ? ` class="${o.cls}"` : ''}${o.weight ? ` font-weight="${o.weight}"` : ''}>${esc(s)}</text>`;

// ---------- 01 决策顺序（mermaid） ----------
const decision = {
  kind: 'mermaid',
  alt: '做决定的顺序：说清问题，医生确认原因，判断医美管不管，比较三类方式，查资质，判断能否接受代价',
  caption: '做决定的顺序，项目名放在最后。',
  src: `flowchart TD
  A["说清问题的部位与表现"] --> B["医生确认原因"]
  B --> C{{"医美管不管、管到什么程度"}}
  C -- "不管或作用有限" --> D["护肤、防晒、调整作息，或暂不处理"]
  C -- "在范围内" --> E["比较三类方式<br/>恢复期、维持时间、可逆性"]
  E --> F["查机构与医生资质"]
  F --> G{{"能否接受恢复期、维持成本与风险"}}
  G -- "能" --> H["面诊后决定"]
  G -- "不能" --> D`,
};

// ---------- 12 作用层次（静态） ----------
function depthSvg() {
  const layers = [
    { name: '表皮', y0: 50, y1: 70 },
    { name: '真皮', y0: 70, y1: 140 },
    { name: '皮下组织', y0: 140, y1: 230 },
    { name: '筋膜层', y0: 230, y1: 270 },
  ];
  const cols = [
    { name: '强脉冲光', x: 210, y0: 52, y1: 100, note: '浅表色素与血管' },
    { name: '激光', x: 320, y0: 52, y1: 135, note: '随波长与方式变化' },
    { name: '射频', x: 430, y0: 75, y1: 205, note: '加热真皮与皮下' },
    { name: '聚焦超声', x: 540, y0: 150, y1: 250, note: '聚焦成热凝固点', dots: true },
  ];
  let s = `<svg viewBox="0 0 640 310" role="img" aria-label="强脉冲光、激光、射频、聚焦超声作用层次的相对深度示意" class="fig-svg">`;
  layers.forEach((l, i) => {
    s += `<rect x="110" y="${l.y0}" width="510" height="${l.y1 - l.y0}" class="f${i % 2 ? 2 : 1}"/>`;
    s += T(100, (l.y0 + l.y1) / 2 + 5, l.name, { anchor: 'end', size: 13 });
  });
  s += `<line x1="110" y1="50" x2="620" y2="50" class="ln-strong"/>`;
  for (const l of layers) s += `<line x1="110" y1="${l.y1}" x2="620" y2="${l.y1}" class="ln"/>`;
  for (const c of cols) {
    s += T(c.x, 34, c.name, { anchor: 'middle', size: 13, weight: 600 });
    if (c.dots) {
      for (const y of [175, 245]) for (const dx of [-24, -8, 8, 24]) s += `<circle cx="${c.x + dx}" cy="${y}" r="4.5" class="dot"/>`;
      s += `<line x1="${c.x}" y1="52" x2="${c.x}" y2="168" class="ln-dash"/>`;
    } else {
      s += `<rect x="${c.x - 9}" y="${c.y0}" width="18" height="${c.y1 - c.y0}" rx="2" class="bar"/>`;
    }
    s += T(c.x, 292, c.note, { anchor: 'middle', size: 12, cls: 'muted' });
  }
  s += `</svg>`;
  return s;
}
const depth = {
  kind: 'svg', svg: depthSvg,
  alt: '四类光电方法作用层次的相对深度',
  caption: '四类方法作用层次的相对深度示意，实际深度随设备、波长和参数变化。',
};

// ---------- 41 皮肤缺血的表现顺序（静态） ----------
function timelineSvg() {
  const stages = [
    { x: 100, t: '注射当时或不久', l1: '发白、发灰', l2: '和周围界限清楚', cls: 'sw1' },
    { x: 260, t: '接着', l1: '蓝紫、暗红', l2: '网状、大理石样花纹', cls: 'sw2' },
    { x: 420, t: '随后', l1: '水疱、小脓疱', l2: '皮肤变黑', cls: 'sw3' },
    { x: 580, t: '几天后', l1: '坏死', l2: '结痂', cls: 'sw4' },
  ];
  let s = `<svg viewBox="0 0 680 300" role="img" aria-label="血管栓塞后皮肤变化的先后顺序" class="fig-svg">`;
  s += `<defs>
    <pattern id="net" width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="10" class="sk2"/><path d="M0 5 Q2.5 0 5 5 T10 5 M5 0 Q10 2.5 5 5 T5 10" class="sk-line" fill="none"/></pattern>
    <pattern id="pus" width="14" height="14" patternUnits="userSpaceOnUse"><rect width="14" height="14" class="sk3"/><circle cx="4" cy="4" r="2.6" class="sk-hole"/><circle cx="11" cy="10" r="2" class="sk-hole"/></pattern>
  </defs>`;
  s += `<line x1="40" y1="160" x2="640" y2="160" class="ln-strong"/>`;
  s += `<path d="M632 154 L642 160 L632 166 Z" class="solid"/>`;
  for (const st of stages) {
    const fill = st.cls === 'sw2' ? 'url(#net)' : st.cls === 'sw3' ? 'url(#pus)' : '';
    s += `<rect x="${st.x - 42}" y="40" width="84" height="84" rx="10" class="${st.cls}"${fill ? ` fill="${fill}"` : ''}/>`;
    s += `<line x1="${st.x}" y1="124" x2="${st.x}" y2="160" class="ln"/><circle cx="${st.x}" cy="160" r="4" class="solid"/>`;
    s += T(st.x, 184, st.t, { anchor: 'middle', size: 13, weight: 600 });
    s += T(st.x, 206, st.l1, { anchor: 'middle', size: 13 });
    s += T(st.x, 226, st.l2, { anchor: 'middle', size: 12, cls: 'muted' });
  }
  // 疼痛逐渐加重
  s += `<path d="M60 268 L600 252 L600 276 Z" class="f3"/>`;
  s += T(60, 292, '疼痛通常比一般注射后重，而且越来越重', { size: 12, cls: 'muted' });
  s += `</svg>`;
  return s;
}
const timeline = {
  kind: 'svg', svg: timelineSvg,
  alt: '皮肤缺血的表现按出现先后排列',
  caption: '皮肤缺血的表现按出现的先后排列，各阶段持续的时间因人而异，颜色以灰度示意。',
};

// ---------- 24 面部高风险部位（交互） ----------
export const FACE_ZONES = {
  nose: { name: '鼻部', vessel: '皮肤和皮下组织薄，血管贴近表面，鼻尖、鼻翼的血供来自少数几根小动脉。做过鼻部手术的，血管位置可能改变。', p15: '25.5%', p19: '56.3%' },
  glabella: { name: '眉间', vessel: '附近的小动脉和供应眼睛的眼动脉相连。美国一项大样本研究中，眉间发生的栓塞平均后果最重。', p15: '38.8%', p19: '27.1%' },
  forehead: { name: '额头', vessel: '附近的小动脉和眼动脉相连，填充物可能逆着血流进入眼部的血管。', p15: '12.2%', p19: '18.8%' },
  nlf: { name: '鼻唇沟', vessel: '靠近鼻翼的位置有面动脉的分支经过。美国一项大样本研究中，鼻唇沟和唇部最容易发生栓塞。', p15: '13.3%', p19: '14.6%' },
  temple: { name: '太阳穴', vessel: '有颞浅动脉和颞中静脉经过，层次复杂。', p15: '未单列', p19: '未单列' },
};
function faceSvg() {
  let s = `<svg viewBox="0 0 360 430" role="group" aria-label="面部注射高风险部位示意" class="fig-svg face">`;
  // 轮廓与五官（线稿）
  s += `<path d="M180 30 C 105 30 70 95 72 175 C 74 250 95 315 130 360 C 150 386 165 398 180 398 C 195 398 210 386 230 360 C 265 315 286 250 288 175 C 290 95 255 30 180 30 Z" class="outline"/>`;
  s += `<path d="M108 158 Q 135 146 162 154" class="feat"/><path d="M198 154 Q 225 146 252 158" class="feat"/>`;
  s += `<path d="M112 186 Q 135 172 158 186 Q 135 196 112 186 Z" class="feat"/><path d="M202 186 Q 225 172 248 186 Q 225 196 202 186 Z" class="feat"/>`;
  s += `<circle cx="135" cy="185" r="5" class="solid"/><circle cx="225" cy="185" r="5" class="solid"/>`;
  s += `<path d="M172 175 L 168 248 M188 175 L 192 248" class="feat-thin"/>`;
  s += `<path d="M160 252 Q 152 266 166 270 Q 180 276 194 270 Q 208 266 200 252" class="feat"/>`;
  s += `<path d="M146 312 Q 180 300 214 312 Q 180 330 146 312 Z" class="feat"/>`;
  s += `<path d="M157 262 Q 140 285 144 310" class="feat-thin"/><path d="M203 262 Q 220 285 216 310" class="feat-thin"/>`;
  // 区域
  const zone = (id, d) => `<path d="${d}" class="zone" data-zone="${id}" tabindex="0" role="button" aria-label="${FACE_ZONES[id].name}"/>`;
  s += zone('forehead', 'M110 80 Q 180 50 250 80 L 255 132 Q 220 122 198 134 L 162 134 Q 140 122 105 132 Z');
  s += zone('glabella', 'M164 138 L 196 138 L 194 170 L 166 170 Z');
  s += zone('temple', 'M76 140 Q 92 128 100 146 L 102 196 Q 88 204 78 192 Z M284 140 Q 268 128 260 146 L 258 196 Q 272 204 282 192 Z');
  s += zone('nose', 'M168 172 L 192 172 L 196 246 Q 214 262 200 274 Q 180 282 160 274 Q 146 262 164 246 Z');
  s += zone('nlf', 'M150 258 Q 128 284 134 314 L 148 314 Q 144 288 162 266 Z M210 258 Q 232 284 226 314 L 212 314 Q 216 288 198 266 Z');
  s += `</svg>`;
  return s;
}
const face = {
  kind: 'interactive', svg: faceSvg,
  alt: '面部注射高风险部位：鼻部、眉间、额头、鼻唇沟、太阳穴',
  caption: '部位为示意。占比为两次全球文献综述中注射后视力损害病例的部位分布，一个病例可涉及多个部位，占比相加超过 100%。',
};

// ---------- 20 肉毒毒素的作用与消退（交互动画） ----------
// e(t)：效果强度示意，0 无效果，1 完全起效。3 天起效，14 天稳定，80 天后开始消退，约 120 天降到一半，160 天回到原状。
export function botoxEffect(t) {
  if (t < 3) return 0;
  if (t < 14) { const u = (t - 3) / 11; return u * u * (3 - 2 * u); }
  if (t < 80) return 1;
  if (t < 160) return 0.5 * (1 + Math.cos(Math.PI * (t - 80) / 80));
  return 0;
}
function botoxSvg() {
  const X = (t) => 70 + (t / 180) * 520; // 0..180 天
  const Y = (e) => 300 - e * 70;
  let curve = '';
  for (let t = 0; t <= 180; t += 1) curve += `${t ? 'L' : 'M'}${X(t).toFixed(1)} ${Y(botoxEffect(t)).toFixed(1)} `;
  let s = `<svg viewBox="0 0 640 340" role="img" aria-label="肉毒毒素阻断神经信号、肌肉放松、数月后恢复的过程示意" class="fig-svg botox">`;
  // 神经肌肉接头
  s += T(150, 22, '神经末梢', { anchor: 'middle', size: 12, cls: 'muted' });
  s += `<rect x="70" y="30" width="160" height="50" rx="22" class="f1 outline"/>`;
  for (const [x, y] of [[100, 50], [125, 60], [150, 48], [175, 60], [200, 50]]) s += `<circle cx="${x}" cy="${y}" r="6" class="vesicle"/>`;
  s += `<g id="bx-block">${[105, 150, 195].map((x) => `<path d="M${x - 6} 74 L${x + 6} 86 M${x + 6} 74 L${x - 6} 86" class="block"/>`).join('')}</g>`;
  s += `<g id="bx-ach"></g>`;
  s += `<rect id="bx-muscle" x="50" y="112" width="200" height="40" class="f2 outline"/>`;
  s += `<g id="bx-stripes"></g>`;
  s += T(150, 170, '肌肉', { anchor: 'middle', size: 12, cls: 'muted' });
  // 皮肤表面
  s += T(450, 22, '皮肤表面', { anchor: 'middle', size: 12, cls: 'muted' });
  s += `<path id="bx-skin" d="" class="skin"/>`;
  s += `<rect x="300" y="110" width="300" height="42" class="f2"/>`;
  s += T(450, 170, '做表情时的皱纹', { anchor: 'middle', size: 12, cls: 'muted' });
  // 时间曲线
  s += `<line x1="70" y1="300" x2="590" y2="300" class="ln"/><line x1="70" y1="225" x2="70" y2="300" class="ln"/>`;
  for (const t of [0, 30, 60, 90, 120, 150, 180]) s += `<line x1="${X(t)}" y1="300" x2="${X(t)}" y2="305" class="ln"/>` + T(X(t), 320, String(t), { anchor: 'middle', size: 11, cls: 'muted' });
  s += T(600, 320, '天', { size: 11, cls: 'muted' });
  s += T(62, 234, '效果', { anchor: 'end', size: 11, cls: 'muted' });
  s += `<path d="${curve}" class="curve"/>`;
  s += `<line x1="${X(120)}" y1="222" x2="${X(120)}" y2="300" class="ln-dash"/>`;
  s += T(X(120) + 6, 218, '约 120 天 中位维持', { size: 11 });
  s += T(X(14) + 4, 218, '约 14 天 稳定', { size: 11 });
  s += `<line id="bx-cursor" x1="${X(0)}" y1="222" x2="${X(0)}" y2="300" class="cursor"/>`;
  s += `<circle id="bx-dot" cx="${X(0)}" cy="${Y(0)}" r="5" class="solid"/>`;
  s += `</svg>`;
  return s;
}
const botox = {
  kind: 'interactive', svg: botoxSvg,
  alt: '肉毒毒素阻断乙酰胆碱释放，肌肉放松，皱纹变浅，数月后神经恢复连接',
  caption: '曲线为示意。起效和稳定时间依据说明书，约 120 天为三期临床试验汇总分析中有效者效果的中位维持时间[3]。',
  controls: true,
};

export const FIGURES = { decision, depth, timeline, face, botox };

// 图的样式，站点与离线渲染共用
export const FIGURE_CSS = `
.fig-svg{width:100%;height:auto;display:block;font-family:var(--sans);fill:var(--fg)}
.fig-svg text{fill:var(--fg)} .fig-svg .muted{fill:var(--muted)}
.fig-svg .f1{fill:var(--fill-1)} .fig-svg .f2{fill:var(--fill-2)} .fig-svg .f3{fill:var(--fill-3)}
.fig-svg .ln{stroke:var(--fg);stroke-width:1;fill:none} .fig-svg .ln-strong{stroke:var(--fg);stroke-width:1.6;fill:none}
.fig-svg .ln-thin{stroke:var(--fg);stroke-width:.6;opacity:.55} .fig-svg .ln-dash{stroke:var(--fg);stroke-width:1;stroke-dasharray:4 3;fill:none}
.fig-svg .bar{fill:var(--fill-3);stroke:var(--fg);stroke-width:1}
.fig-svg .dot,.fig-svg .solid{fill:var(--fg)} .fig-svg .hole{fill:var(--bg)}
/* 皮肤颜色示意用固定灰阶，深浅主题下都由浅到深 */
.fig-svg .sw1{fill:#ffffff;stroke:var(--fg);stroke-width:1.6} .fig-svg .sw2,.fig-svg .sw3{stroke:var(--fg);stroke-width:1} .fig-svg .sw4{fill:#262626;stroke:var(--fg);stroke-width:1}
.fig-svg .sk2{fill:#d4d7d3} .fig-svg .sk3{fill:#8f948e} .fig-svg .sk-line{stroke:#262626;stroke-width:.6;opacity:.6} .fig-svg .sk-hole{fill:#ffffff}
.fig-svg .outline{fill:none;stroke:var(--fg);stroke-width:1.4} .fig-svg rect.outline{fill:var(--fill-1)}
.fig-svg .feat{fill:none;stroke:var(--fg);stroke-width:1.2;stroke-linecap:round} .fig-svg .feat-thin{fill:none;stroke:var(--fg);stroke-width:.9;stroke-linecap:round}
.fig-svg .zone{fill:var(--fg);fill-opacity:.06;stroke:var(--fg);stroke-width:1;stroke-dasharray:3 3;cursor:pointer;transition:fill-opacity .15s}
.fig-svg .zone:hover,.fig-svg .zone:focus{fill-opacity:.18;outline:none;stroke-dasharray:none}
.fig-svg .zone.on{fill-opacity:.3;stroke-width:1.6;stroke-dasharray:none}
.fig-svg .vesicle{fill:var(--bg);stroke:var(--fg);stroke-width:1} .fig-svg .ach{fill:var(--fg)}
.fig-svg .block{stroke:var(--fg);stroke-width:2.2;stroke-linecap:round}
.fig-svg .stripe{stroke:var(--fg);stroke-width:1;opacity:.6}
.fig-svg .skin{fill:none;stroke:var(--fg);stroke-width:2}
.fig-svg .curve{fill:none;stroke:var(--fg);stroke-width:2}
.fig-svg .cursor{stroke:var(--fg);stroke-width:1;opacity:.5}
`;
