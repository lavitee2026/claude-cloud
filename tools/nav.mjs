// 导航数据：问题导向与需求导向的落地页。slug 为 content/landing/ 下的文件名，未写的为 null。
export const PROBLEMS = [
  { name: '色斑与肤色不均', slug: null, ids: ['12', '13', '14', '43'] },
  { name: '泛红与红血丝', slug: null, ids: ['12', '13'] },
  { name: '痘坑与毛孔', slug: null, ids: ['12', '15'] },
  { name: '动态皱纹', slug: null, ids: ['20'] },
  { name: '凹陷与容量不足', slug: 'aoxian', ids: ['29', '21', '22', '31', '05', '24', '41'] },
  { name: '松弛与下垂', slug: null, ids: ['12', '16', '17', '29'] },
  { name: '皮肤质地', slug: null, ids: ['12', '15', '23'] },
  { name: '多余毛发', slug: null, ids: ['12', '18'] },
  { name: '眼部形态', slug: null, ids: ['27', '29'] },
  { name: '鼻部形态', slug: null, ids: ['28', '24'] },
  { name: '胸部', slug: null, ids: ['30'] },
  { name: '身体轮廓与脂肪', slug: null, ids: ['31', '32'] },
  { name: '面部骨骼', slug: null, ids: ['32'] },
];

export const NEEDS = [
  { name: '现在有紧急情况', slug: null, ids: ['41', '42', '40'] },
  { name: '做完不放心', slug: 'buanxin', ids: ['40', '41', '42', '43', '24', '44'] },
  { name: '想做还没定', slug: null, ids: ['01', '03', '04', '05', '06'] },
  { name: '恢复期要短', slug: null, ids: ['03', '12', '43'] },
  { name: '想先选能回头的', slug: null, ids: ['05', '20', '21'] },
  { name: '算长期花费', slug: null, ids: ['06', '37', '38'] },
  { name: '正在挑机构和医生', slug: null, ids: ['33', '34', '35', '36'] },
  { name: '看到宣传拿不准', slug: null, ids: ['08', '09', '10', '11'] },
  { name: '要签字付钱了', slug: null, ids: ['37', '38', '39'] },
  { name: '效果不满意或出了问题', slug: null, ids: ['44'] },
  { name: '医生说不建议', slug: null, ids: ['07', '36'] },
];

// 首页三个入口，取自第 01 篇
export const ENTRIES = [
  { name: '想做还没定', ids: ['03', '04', '09'] },
  { name: '正在挑机构', ids: ['33', '34', '36', '37'] },
  { name: '做完不放心', ids: ['40', '41', '42'] },
];
