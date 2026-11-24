/**
 * 预置阶段备忘内容（国内常见产检节奏）
 *
 * 每条都带：
 *   weekStart / weekEnd  建议孕周窗口（整数周，闭区间），用来排序和提示时机
 *   weekNote             窗口尾部的补充说明，例如 NT 的「+6天」
 *   kind                 exam 产检项目 / prepare 准备事项 / caution 注意事项
 *
 * 用户可在 App 内增删改，导出备份时一并包含。
 */
export const defaultStageItems = [
  // ---------- 孕早期 ----------
  {
    stage: 'early', sortOrder: 1, weekStart: 6, weekEnd: 8, kind: 'exam',
    title: '确认宫内孕',
    detail: '停经 6-8 周做 B 超，确认宫内妊娠、有胎心胎芽。有腹痛或出血随时就诊。'
  },
  {
    stage: 'early', sortOrder: 2, weekStart: 8, weekEnd: 12, kind: 'prepare',
    title: '建档',
    detail: '带身份证、医保卡、早孕 B 超单，到社区或医院建母子健康手册。热门医院名额紧张，建议提前问。'
  },
  {
    stage: 'early', sortOrder: 3, weekStart: 9, weekEnd: 12, kind: 'exam',
    title: '基础化验',
    detail: '血常规、尿常规、血型、肝肾功能、乙肝梅毒 HIV、甲功等。多数需要空腹，早上早点去。'
  },
  {
    stage: 'early', sortOrder: 4, weekStart: 11, weekEnd: 13, weekNote: '+6天', kind: 'exam',
    title: 'NT 检查',
    detail: '超声测量胎儿颈项透明层厚度，是早期筛查的重要一项。过了 14 周就做不了，别错过窗口。'
  },
  {
    stage: 'early', sortOrder: 5, weekStart: 6, weekEnd: 13, kind: 'caution',
    title: '早孕反应应对',
    detail: '少食多餐、避开油腻气味、可补维生素 B6。吐到吃不下、明显消瘦或尿少，要及时就医。'
  },
  {
    stage: 'early', sortOrder: 6, weekStart: 0, weekEnd: 13, kind: 'caution',
    title: '禁忌提醒',
    detail: '禁烟酒；不吃生食和未消毒奶制品；用药先问医生；避免泡温泉、桑拿等高温环境。'
  },

  // ---------- 孕中期 ----------
  {
    stage: 'middle', sortOrder: 1, weekStart: 15, weekEnd: 20, kind: 'exam',
    title: '唐筛或无创 DNA',
    detail: '唐筛在 15-20 周；高龄或唐筛高风险可选无创 DNA（12-22 周）。具体听医生建议。'
  },
  {
    stage: 'middle', sortOrder: 2, weekStart: 18, weekEnd: 20, kind: 'prepare',
    title: '感受胎动',
    detail: '初产妇多在 18-20 周开始感觉到，像小鱼吐泡。这时候还不用数，留意规律就好。'
  },
  {
    stage: 'middle', sortOrder: 3, weekStart: 20, weekEnd: 24, kind: 'exam',
    title: '大排畸超声',
    detail: '系统超声筛查胎儿结构畸形，耗时较长。宝宝体位不配合可能要爬楼梯或改天再来。'
  },
  {
    stage: 'middle', sortOrder: 4, weekStart: 24, weekEnd: 28, kind: 'exam',
    title: '糖耐量试验 OGTT',
    detail: '75g 葡萄糖耐量试验，筛查妊娠期糖尿病。前一晚 10 点后禁食，当天抽三次血，带点吃的。'
  },
  {
    stage: 'middle', sortOrder: 5, weekStart: 24, weekEnd: 28, kind: 'exam',
    title: '血常规复查',
    detail: '重点看血红蛋白，排查孕期贫血。偏低的话医生会建议补铁。'
  },
  {
    stage: 'middle', sortOrder: 6, weekStart: 14, weekEnd: 27, kind: 'caution',
    title: '营养与体重',
    detail: '均衡饮食、适量补钙补铁，孕中期每周增重 0.3-0.5kg 比较合适。增重过快易合并糖高、血压高。'
  },

  // ---------- 孕晚期 ----------
  {
    stage: 'late', sortOrder: 1, weekStart: 28, weekEnd: 36, kind: 'prepare',
    title: '产检加密',
    detail: '28-36 周每两周一次，36 周后每周一次。临近预产期别嫌跑得勤，这是必要的监测。'
  },
  {
    stage: 'late', sortOrder: 2, weekStart: 28, weekEnd: 40, kind: 'caution',
    title: '数胎动',
    detail: '每天固定时间数 1 小时，3 次以上为正常。明显变少或突然剧烈增多，立刻去医院。'
  },
  {
    stage: 'late', sortOrder: 3, weekStart: 32, weekEnd: 34, kind: 'exam',
    title: '胎心监护 NST',
    detail: '从 32-34 周起定期做，每次约 20 分钟，评估胎儿宫内状况。做之前吃点东西，宝宝更活跃。'
  },
  {
    stage: 'late', sortOrder: 4, weekStart: 32, weekEnd: 36, kind: 'prepare',
    title: '待产包准备',
    detail: '证件、母婴用品、洗漱用品、出院衣服，提前打包放门口。顺手把住院路线和联系人存好。'
  },
  {
    stage: 'late', sortOrder: 5, weekStart: 36, weekEnd: 40, kind: 'caution',
    title: '临产信号识别',
    detail: '规律宫缩（5 分钟一次、持续 1 小时）、破水、见红量多，任一出现立即就医。破水后尽量平躺。'
  }
].map((d, i) => ({ ...d, status: 'pending', sortOrder: d.sortOrder ?? i + 1 }))

/** 条目类型，决定在页面上归到哪一组、用哪种颜色 */
export const STAGE_KINDS = [
  { key: 'exam', label: '产检项目' },
  { key: 'prepare', label: '准备事项' },
  { key: 'caution', label: '注意事项' }
]

export const KIND_LABELS = STAGE_KINDS.reduce((acc, k) => {
  acc[k.key] = k.label
  return acc
}, {})

/**
 * 按标题查预置条目的孕周与类型。
 * 老数据（升级前写入的条目）没有 weekStart/kind，靠这个补齐。
 * 标题比较时忽略空格与括号，避免「糖耐量试验(OGTT)」这类写法差异匹配不上。
 */
const normTitle = t => String(t || '').replace(/[\s()（）]/g, '').toLowerCase()

const META_BY_TITLE = defaultStageItems.reduce((acc, d) => {
  acc[normTitle(d.title)] = {
    weekStart: d.weekStart,
    weekEnd: d.weekEnd,
    weekNote: d.weekNote || '',
    kind: d.kind
  }
  return acc
}, {})

export function stageMetaByTitle(title) {
  return META_BY_TITLE[normTitle(title)] || null
}
