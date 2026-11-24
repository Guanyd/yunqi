/**
 * 预置阶段备忘内容（国内常见产检节奏）
 * 用户可在 App 内增删改，导出备份时一并包含。
 */
export const defaultStageItems = [
  // 孕早期
  { stage: 'early', sortOrder: 1, title: '确认宫内孕', detail: '停经6-8周B超确认宫内妊娠、胎心胎芽', status: 'pending' },
  { stage: 'early', sortOrder: 2, title: '建档', detail: '携带身份证、医保卡、早孕B超单到社区或医院建母子健康手册', status: 'pending' },
  { stage: 'early', sortOrder: 3, title: '基础化验', detail: '血常规、尿常规、血型、肝肾功能、乙肝梅毒HIV、甲功等', status: 'pending' },
  { stage: 'early', sortOrder: 4, title: 'NT检查', detail: '孕11-13+6周，超声测量胎儿颈项透明层厚度', status: 'pending' },
  { stage: 'early', sortOrder: 5, title: '早孕反应应对', detail: '少食多餐、避免油腻、补充维生素B6；剧烈呕吐及时就医', status: 'pending' },
  { stage: 'early', sortOrder: 6, title: '禁忌提醒', detail: '禁烟酒、避免生食/未消毒奶制品、慎用药物、避免高温环境', status: 'pending' },
  // 孕中期
  { stage: 'middle', sortOrder: 1, title: '唐筛或无创DNA', detail: '孕15-20周唐氏筛查；高风险或高龄可选无创DNA（12-22周）', status: 'pending' },
  { stage: 'middle', sortOrder: 2, title: '大排畸超声', detail: '孕20-24周系统超声筛查胎儿结构畸形', status: 'pending' },
  { stage: 'middle', sortOrder: 3, title: '血常规复查', detail: '关注血红蛋白，预防孕期贫血', status: 'pending' },
  { stage: 'middle', sortOrder: 4, title: '感受胎动', detail: '初产妇约18-20周开始感知胎动，记录规律', status: 'pending' },
  { stage: 'middle', sortOrder: 5, title: '营养与体重', detail: '均衡饮食、适量补钙铁、每周增重约0.3-0.5kg', status: 'pending' },
  // 孕晚期
  { stage: 'late', sortOrder: 1, title: '糖耐量试验(OGTT)', detail: '孕24-28周，75g葡萄糖耐量试验筛查妊娠期糖尿病', status: 'pending' },
  { stage: 'late', sortOrder: 2, title: '产检加密', detail: '28-36周每2周一次，36周后每周一次', status: 'pending' },
  { stage: 'late', sortOrder: 3, title: '胎心监护(NST)', detail: '孕32-34周起定期胎心监护，评估胎儿宫内状况', status: 'pending' },
  { stage: 'late', sortOrder: 4, title: '待产包准备', detail: '证件、母婴用品、洗漱用品，提前打包放门口', status: 'pending' },
  { stage: 'late', sortOrder: 5, title: '临产信号识别', detail: '规律宫缩(5分钟一次持续1小时)、破水、见红量多立即就医', status: 'pending' },
  { stage: 'late', sortOrder: 6, title: '数胎动', detail: '每天固定时间数1小时胎动，≥3次为正常；明显减少及时就诊', status: 'pending' }
]