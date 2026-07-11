import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export interface MockDataRequest {
  tableName: string
  tableComment?: string
  columns: Array<{
    name: string
    dataType: string
    nullable: boolean
    primaryKey: boolean
    unique: boolean
    comment?: string
  }>
  rowCount: number
  useLLM?: boolean
}

export interface MockDataColumn {
  name: string
  dataType: string
  values: any[]
}

export interface MockDataResult {
  tableName: string
  columns: MockDataColumn[]
  rows: Record<string, any>[]
  sql: string
}

export interface LLMMockRequest {
  tableName: string
  description?: string
  columns: Array<{
    name: string
    dataType: string
    description?: string
  }>
  rowCount: number
  template?: string
}

const firstNames = ['张', '李', '王', '刘', '陈', '杨', '赵', '黄', '周', '吴', '徐', '孙', '马', '朱', '胡', '郭', '何', '高', '林', '罗']
const lastNames = ['伟', '芳', '娜', '敏', '静', '丽', '强', '磊', '军', '洋', '勇', '艳', '杰', '娟', '涛', '明', '超', '秀英', '华', '平']
const cities = ['北京', '上海', '广州', '深圳', '杭州', '南京', '成都', '武汉', '西安', '重庆', '苏州', '天津', '郑州', '长沙', '沈阳']
const departments = ['技术部', '产品部', '市场部', '销售部', '人力资源', '财务部', '运营部', '法务部', '行政部', '客服部']
const genericStatuses = ['active', 'inactive', 'pending', 'approved', 'rejected', 'cancelled', 'completed']
const genericCategories = ['电子产品', '服装', '食品', '家居', '运动', '图书', '美妆', '母婴', '汽车', '数码']
const districts = ['朝阳', '海淀', '东城', '西城', '丰台', '石景山', '通州', '昌平', '大兴', '房山', '门头沟', '顺义', '平谷', '怀柔', '密云']

const weaponTypes = ['近战武器', '远程武器', '法术武器', '防御装备', '暗器', '弓弩', '长兵器', '短兵器', '钝器', '锐器']
const weaponNames = ['倚天剑', '屠龙刀', '方天画戟', '青龙偃月刀', '丈八蛇矛', '七星宝刀', '湛卢剑', '干将莫邪', '太阿剑', '鱼肠剑', '霸王枪', '暴雨梨花针', '打狗棒', '金蛇剑', '血刀']
const bookTitles = ['深入浅出数据库设计', '高性能MySQL实战', '算法导论精解', '云原生架构之道', '人工智能简史', '代码整洁之道', '设计模式之禅', '微服务架构设计', '分布式系统原理', '数据密集型应用设计']
const productNames = ['智能手机', '笔记本电脑', '无线耳机', '智能手表', '平板电脑', '机械键盘', '显示器', '移动硬盘', '路由器', '摄像头']
const colorNames = ['红色', '蓝色', '绿色', '黑色', '白色', '紫色', '橙色', '灰色', '金色', '银色', '棕色', '粉色']
const sizes = ['S', 'M', 'L', 'XL', 'XXL', '均码']
const courseNames = ['高等数学', '线性代数', '概率论', '大学物理', '数据结构', '操作系统', '计算机网络', '编译原理', '数据库原理', '软件工程']
const gameNames = ['王者荣耀', '英雄联盟', '原神', '绝地求生', '我的世界', '塞尔达传说', '最终幻想', '魔兽世界', '星际争霸', '暗黑破坏神']
const companyNames = ['阿里巴巴', '腾讯', '百度', '字节跳动', '华为', '小米', '京东', '美团', '网易', '拼多多']
const jobTitles = ['高级工程师', '产品经理', 'UI设计师', '架构师', '项目经理', '运营总监', '技术总监', '数据分析师', '测试工程师', '开发工程师']
const brandNames = ['华为', '小米', '苹果', '三星', '索尼', '联想', '戴尔', '惠普', '华硕', '佳能', 'OPPO', 'vivo', '荣耀', '格力', '美的']
const paymentMethods = ['微信支付', '支付宝', '银行卡', '信用卡', '现金']
const shippingCompanies = ['顺丰速运', '中通快递', '圆通速递', '韵达快递', '京东物流', '邮政EMS', '百世快递']

type TableDomain = 'person' | 'product' | 'order' | 'blog' | 'finance' | 'inventory' | 'logistics' | 'game' | 'medical' | 'education' | 'general'

interface DomainData {
  names: string[]
  statuses: string[]
  categories: string[]
  descriptions: string[]
}

const domainData: Record<string, DomainData> = {
  person: {
    names: [],
    statuses: ['在职', '离职', '试用期', '休假', '停职', '外派'],
    categories: [],
    descriptions: ['资深工程师，专注后端开发8年', '产品经理，擅长需求分析与用户研究', '高级设计师，10年UI/UX设计经验', '项目经理，持有PMP认证', '运营专家，擅长用户增长策略', '全栈开发工程师，前后端通吃', '数据分析师，精通Python与SQL', '技术团队负责人，管理20人团队']
  },
  product: {
    names: ['智能手机Pro', '超薄笔记本电脑', '降噪无线耳机', '智能手表S3', '4K高清显示器', '机械键盘RGB', '便携移动硬盘', '高速路由器', '4K网络摄像头', '蓝牙音箱',
      '激光打印机', '高清投影仪', '专业麦克风', '快充充电宝', 'Type-C数据线', '无线鼠标', '平板电脑Air', '智能门锁', '智能灯泡', '运动相机'],
    statuses: ['上架', '下架', '缺货', '预售', '清仓', '新品', '热卖'],
    categories: ['电子产品', '服装', '食品', '家居', '运动', '图书', '美妆', '母婴', '汽车配件', '数码配件'],
    descriptions: ['高品质{name}，性价比首选', '{name}新款上市，限时优惠', '热销{name}，好评如潮', '品牌{name}，质保2年', '进口{name}，品质保证', '{name}升级版性能提升30%', '{name}用户好评率98%', '{name}限时特价，错过等一年']
  },
  order: {
    names: [],
    statuses: ['待付款', '已付款', '已发货', '已完成', '已取消', '已退款', '部分退款', '待审核'],
    categories: [],
    descriptions: ['加急订单，优先处理', '普通订单，常规配送', '大额订单需财务审核', '新客户首单享优惠', 'VIP客户订单，享受专属折扣', '跨境订单，需海关清关']
  },
  blog: {
    names: [],
    statuses: ['草稿', '已发布', '已归档', '审核中', '驳回', '置顶'],
    categories: ['技术', '生活', '旅行', '美食', '设计', 'AI', '前端', '后端', '产品', '创业', '运维', '安全'],
    descriptions: ['深入解析{name}的技术原理和实践', '{name}的最佳实践指南', '从零开始学习{name}', '{name}实战经验分享', '{name}的未来趋势分析', '关于{name}的深度思考', '{name}源码解读与优化']
  },
  finance: {
    names: [],
    statuses: ['已入账', '待入账', '已出账', '待审批', '已驳回', '已完成', '处理中'],
    categories: ['收入', '支出', '转账', '退款', '手续费', '薪资', '报销', '采购', '税费'],
    descriptions: ['日常办公费用报销', '差旅报销单', '项目采购支出审批', '月度薪资发放明细', '季度绩效奖金', '年终奖发放记录']
  },
  inventory: {
    names: [],
    statuses: ['充足', '不足', '缺货', '预订中', '已锁定', '退货中', '待盘点'],
    categories: ['原材料', '半成品', '成品', '包装材料', '配件', '辅料'],
    descriptions: ['A类高周转商品，每周补货', 'B类常规商品，双周补货', 'C类低周转商品，月度盘点', '季节性商品，按季备货', '临期商品，优先出库']
  },
  logistics: {
    names: [],
    statuses: ['待取件', '运输中', '已到达', '派送中', '已签收', '已退回', '异常'],
    categories: ['标准快递', '同城配送', '冷链运输', '国际物流', '货运', '航空件'],
    descriptions: ['易碎品，轻拿轻放', '普通包裹，标准配送', '生鲜冷链，优先配送', '贵重物品保价运输', '加急配送，当日达']
  },
  game: {
    names: ['王者荣耀', '英雄联盟', '原神', '绝地求生', '我的世界', '塞尔达传说', '最终幻想XVI', '魔兽世界', '星际争霸II', '暗黑破坏神IV', '崩坏：星穹铁道', '永劫无间', '幻塔', '鸣潮', '无限暖暖'],
    statuses: ['开发中', '已上线', '维护中', '停服', '测试中', '预发布', '公测'],
    categories: ['角色扮演', '动作冒险', '射击游戏', '策略游戏', '模拟经营', '休闲益智', '体育竞技', 'MOBA', '卡牌对战'],
    descriptions: ['史诗级{name}世界观设定', '{name}重制版高清画质', '{name}多人在线竞技', '{name}年度最佳游戏提名', '{name}新手入门完全指南', '{name}DLC扩展包内容详解']
  },
  medical: {
    names: [],
    statuses: ['待诊', '就诊中', '已诊断', '住院', '出院', '康复中', '已治愈', '复诊'],
    categories: ['内科', '外科', '儿科', '妇产科', '眼科', '牙科', '皮肤科', '骨科', '神经科', '心血管科'],
    descriptions: ['常规体检报告', '门诊诊断记录', '住院治疗记录', '手术康复记录', '慢性病管理方案', '康复训练计划']
  },
  education: {
    names: ['高等数学', '线性代数', '概率论', '大学物理', '数据结构', '操作系统', '计算机网络', '编译原理', '数据库原理', '软件工程',
      '英语精读', '日语入门', '经济学原理', '心理学导论', '管理学基础', '人工智能导论', '机器学习'],
    statuses: ['选课中', '进行中', '已结课', '已通过', '未通过', '重修', '免修'],
    categories: ['必修课', '选修课', '通识课', '实践课', '实验课', '讲座', '研讨课'],
    descriptions: ['{name}核心课程教学大纲', '{name}重点难点解析', '{name}期末考试复习指南', '{name}实验指导书', '{name}课程设计任务书', '{name}经典教材推荐']
  },
  general: {
    names: ['基础配置项', '系统参数', '通用记录', '标准数据项', '通用配置', '业务信息', '数据条目'],
    statuses: ['启用', '禁用', '待审核', '已归档', '草稿', '发布'],
    categories: ['基础数据', '配置数据', '业务数据', '系统数据', '日志数据', '管理数据'],
    descriptions: ['{name}的标准配置信息', '{name}的业务处理记录', '{name}的系统默认参数', '{name}的基础数据项', '{name}的运行日志']
  }
}

function inferTableDomain(tableName: string, tableComment?: string): TableDomain {
  const full = `${tableName} ${tableComment || ''}`.toLowerCase()

  if (/用户|人员|员工|客户|会员|user|employee|customer|member|person|student|teacher|admin|author|staff|crew/.test(full)) return 'person'
  if (/产品|商品|货物|product|goods|item|merchandise|sku|commodity/.test(full)) return 'product'
  if (/订单|order|交易|trade|transaction/.test(full)) return 'order'
  if (/博客|文章|blog|post|article|news|feed/.test(full)) return 'blog'
  if (/财务|金融|账户|账单|finance|accounting|payment|billing|ledger|revenue|expense/.test(full)) return 'finance'
  if (/仓库|库存|warehouse|stock|inventory|storage/.test(full)) return 'inventory'
  if (/物流|快递|shipping|delivery|logistics|transport|freight/.test(full)) return 'logistics'
  if (/游戏|game|gaming|esport/.test(full)) return 'game'
  if (/医疗|医院|医生|病人|患者|doctor|patient|health|medical|clinic|hospital|treatment/.test(full)) return 'medical'
  if (/教育|学校|课程|学生|老师|school|education|course|enrollment|grade|score|exam/.test(full)) return 'education'
  if (/公司|企业|company|enterprise|org|corp|firm|business/.test(full)) return 'person'
  if (/评论|评价|review|rating|feedback|comment/.test(full)) return 'blog'
  if (/项目|project|task|assignment/.test(full)) return 'general'
  if (/部门|department|dept|division/.test(full)) return 'person'

  return 'general'
}

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomFloat(min: number, max: number, decimals: number = 2): number {
  return Number((Math.random() * (max - min) + min).toFixed(decimals))
}

function randomEmail(first?: string, last?: string): string {
  const f = first?.toLowerCase() || randomItem(firstNames).toLowerCase()
  const l = last?.toLowerCase() || randomItem(lastNames).toLowerCase()
  const domains = ['gmail.com', 'qq.com', '163.com', 'outlook.com', 'yahoo.com']
  return `${f}${l}${randomInt(100, 999)}@${randomItem(domains)}`
}

function randomPhone(): string {
  const prefixes = ['138', '139', '137', '136', '135', '134', '150', '151', '152', '158', '159', '188', '189', '186', '185']
  return `${randomItem(prefixes)}${randomInt(10000000, 99999999)}`
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
}

function randomUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

function isStringType(dataType: string): boolean {
  const upper = dataType.toUpperCase()
  return upper.includes('VARCHAR') || upper.includes('CHAR') || upper.includes('TEXT') || upper.includes('CLOB')
}

function isIntegerType(dataType: string): boolean {
  const upper = dataType.toUpperCase()
  return upper.includes('INT') || upper.includes('BIGINT') || upper.includes('TINYINT') ||
    upper.includes('SMALLINT') || upper.includes('MEDIUMINT')
}

function isFloatType(dataType: string): boolean {
  const upper = dataType.toUpperCase()
  return upper.includes('DECIMAL') || upper.includes('NUMERIC') ||
    upper.includes('FLOAT') || upper.includes('DOUBLE') || upper.includes('REAL')
}

function isDateType(dataType: string): boolean {
  const upper = dataType.toUpperCase()
  return upper.includes('DATE') || upper.includes('TIME') ||
    upper.includes('TIMESTAMP') || upper.includes('DATETIME')
}

function isBooleanType(dataType: string): boolean {
  const upper = dataType.toUpperCase()
  return upper.includes('BOOLEAN') || upper.includes('BIT') || upper.includes('BOOL')
}

function isBlobType(dataType: string): boolean {
  const upper = dataType.toUpperCase()
  return upper.includes('BLOB') || upper.includes('BINARY') || upper.includes('VARBINARY')
}

function isUUIDType(dataType: string): boolean {
  const upper = dataType.toUpperCase()
  return upper.includes('UUID') || upper.includes('GUID')
}

function isJSONType(dataType: string): boolean {
  const upper = dataType.toUpperCase()
  return upper.includes('JSON') || upper.includes('JSONB')
}

function isEnumType(dataType: string): boolean {
  const upper = dataType.toUpperCase()
  return upper.includes('ENUM') || upper.includes('SET')
}

function isPrimaryKeyTypeCheck(name: string): boolean {
  return name === 'id' || name.endsWith('_id') || name.endsWith('_key')
}

function makeFullContext(colName: string, colComment?: string, tableName?: string, tableComment?: string): string {
  return `${colName} ${colComment || ''} ${tableName || ''} ${tableComment || ''}`.toLowerCase()
}

function isPersonalName(colName: string, tableName?: string, tableComment?: string): boolean {
  const lower = colName.toLowerCase()
  if (lower === 'name') {
    const full = `${tableName || ''} ${tableComment || ''}`.toLowerCase()
    const personKeywords = ['user', 'person', 'employee', 'customer', 'student', 'teacher',
      'author', 'member', 'owner', 'creator', 'manager', 'contact', 'admin', 'client', 'guest',
      '用户', '人员', '员工', '客户', '学生', '老师', '作者', '成员', '负责人', '联系人']
    return personKeywords.some(kw => full.includes(kw))
  }
  if (lower.includes('姓名')) return true
  if (/^(first|last|full|real|nick)_name$/.test(lower)) return true
  if (lower.includes('用户名') || lower.includes('昵称')) return true
  const hasNameKeyword = lower.includes('name') || lower.includes('姓名')
  if (!hasNameKeyword) return false
  const full = `${colName} ${tableName || ''} ${tableComment || ''}`.toLowerCase()
  const personKeywords = ['user', 'person', 'employee', 'customer', 'student', 'teacher',
    'author', 'member', 'owner', 'creator', 'manager', 'contact', 'admin', 'client', 'guest',
    '用户', '人员', '员工', '客户', '学生', '老师', '作者', '成员', '负责人', '联系人']
  return personKeywords.some(kw => full.includes(kw))
}

function generateDomainContextName(tableName?: string, tableComment?: string, index: number = 0): string {
  const domain = inferTableDomain(tableName || '', tableComment)
  const dd = domainData[domain]
  const seq = index + 1

  if (domain === 'product') {
    if (dd && dd.names.length > 0) return randomItem(dd.names)
    return `${randomItem(productNames)} Pro`
  }
  if (domain === 'game') {
    if (dd && dd.names.length > 0) return randomItem(dd.names)
    return randomItem(gameNames)
  }
  if (domain === 'education') {
    if (dd && dd.names.length > 0) return randomItem(dd.names)
    return randomItem(courseNames)
  }
  if (domain === 'order') {
    return `订单${String(seq).padStart(6, '0')}`
  }
  if (domain === 'person') {
    return `${randomItem(firstNames)}${randomItem(lastNames)}的${randomItem(['工作记录', '项目', '任务', '报告', '方案'])}`
  }
  if (domain === 'blog') {
    return randomItem(bookTitles)
  }
  if (domain === 'finance') {
    return `财务单据${String(seq).padStart(4, '0')}`
  }
  if (domain === 'inventory') {
    return `物料${String(seq).padStart(4, '0')}`
  }
  if (domain === 'logistics') {
    return `运单${String(seq).padStart(8, '0')}`
  }
  if (domain === 'medical') {
    return `患者${String(seq).padStart(4, '0')}`
  }

  const context = `${tableName || ''} ${tableComment || ''}`.toLowerCase()
  if (context.includes('产品') || context.includes('商品') || context.includes('product')) {
    return `${randomItem(productNames)} Pro`
  }
  if (context.includes('课程') || context.includes('course') || context.includes('教育')) {
    return randomItem(courseNames)
  }
  if (context.includes('游戏') || context.includes('game')) {
    return randomItem(gameNames)
  }
  if (context.includes('公司') || context.includes('company') || context.includes('企业')) {
    return randomItem(companyNames)
  }

  return `${tableName || 'item'}_${String(seq).padStart(3, '0')}`
}

function generateThingName(colName: string, index: number, colComment?: string, tableName?: string, tableComment?: string): string {
  const lower = colName.toLowerCase()
  const ctx = makeFullContext(colName, colComment, tableName, tableComment)
  const seq = index + 1

  if (ctx.includes('武器') || ctx.includes('weapon') || ctx.includes('兵器') || ctx.includes('装备')) {
    if (ctx.includes('类型') || ctx.includes('type') || ctx.includes('种类') || ctx.includes('分类')) {
      return randomItem(weaponTypes)
    }
    return randomItem(weaponNames) + ` (${seq}号)`
  }

  if (ctx.includes('书') || ctx.includes('book') || ctx.includes('文献') || ctx.includes('教材')) {
    return `《${randomItem(bookTitles)}》`
  }

  if (ctx.includes('产品') || ctx.includes('product') || ctx.includes('商品') || ctx.includes('货品')) {
    const dd = domainData['product']
    if (dd && dd.names.length > 0) {
      return `${randomItem(dd.names)} ${['Pro', 'Max', 'Plus', 'Lite', 'SE'][seq % 5]} 第${seq}代`
    }
    return `${randomItem(productNames)} ${['Pro', 'Max', 'Plus', 'Lite', 'SE'][seq % 5]} 第${seq}代`
  }

  if (ctx.includes('课程') || ctx.includes('course') || ctx.includes('学科') || ctx.includes('科目')) {
    const dd = domainData['education']
    if (dd && dd.names.length > 0) return randomItem(dd.names)
    return randomItem(courseNames)
  }

  if (ctx.includes('游戏') || ctx.includes('game')) {
    const dd = domainData['game']
    if (dd && dd.names.length > 0) return randomItem(dd.names)
    return randomItem(gameNames)
  }

  if (ctx.includes('公司') || ctx.includes('company') || ctx.includes('企业') || ctx.includes('厂商') || ctx.includes('品牌') || ctx.includes('brand')) {
    return randomItem(companyNames)
  }

  if (ctx.includes('分类') || ctx.includes('category') || ctx.includes('类型') || ctx.includes('type') || ctx.includes('种类')) {
    return randomItem(genericCategories)
  }

  const domain = inferTableDomain(tableName || '', tableComment)
  const dd_domain = domainData[domain]
  const ctxName = generateDomainContextName(tableName, tableComment, seq - 1)
  if (dd_domain && dd_domain.names.length > 0) {
    return `${randomItem(dd_domain.names)}${String(seq).padStart(3, '0')}`
  }
  return `${ctxName}-${colName}-${String(seq).padStart(3, '0')}`
}

function generateContextString(colName: string, index: number, colComment?: string, tableName?: string, tableComment?: string): string {
  const lower = colName.toLowerCase()
  const ctx = makeFullContext(colName, colComment, tableName, tableComment)
  const seq = index + 1

  const hasNameKeyword = lower.includes('name') || lower.includes('名') || lower.includes('称') || lower.includes('标题') || lower.includes('title') || lower.includes('标签') || lower.includes('label')
  if (hasNameKeyword) {
    return generateThingName(colName, index, colComment, tableName, tableComment)
  }

  if (ctx.includes('武器') || ctx.includes('weapon') || ctx.includes('兵器') || ctx.includes('装备')) {
    return generateThingName(colName, index, colComment, tableName, tableComment)
  }

  if (lower.includes('description') || lower.includes('描述') || lower.includes('说明') || lower.includes('备注') || lower.includes('remark') || lower.includes('note') || lower.includes('简介') || lower.includes('introduction') || lower.includes('detail') || lower.includes('content') || lower.includes('summary') || lower.includes('overview') || lower.includes('info') || lower.includes('正文') || lower.includes('内容') || lower.includes('详情') || lower.includes('概述') || lower.includes('介绍') || lower.includes('摘要') || lower.includes('全文') || lower.includes('详细')) {
    const ctxName = generateDomainContextName(tableName, tableComment)
    return `${ctxName}的详细描述文本。${colName}：这是第${seq}条样本数据，用于测试和验证。`
  }

  if (lower.includes('address') || lower.includes('地址') || lower.includes('location') || lower.includes('位置')) {
    return `${randomItem(cities)}市${randomItem(districts)}区${randomItem(['中山路', '人民路', '建设路', '解放路', '长江路'])}${randomInt(1, 999)}号`
  }

  if (lower.includes('email') || lower.includes('邮箱') || lower.includes('mail')) {
    return randomEmail()
  }

  if (lower.includes('phone') || lower.includes('mobile') || lower.includes('tel') || lower.includes('电话') || lower.includes('手机')) {
    return randomPhone()
  }

  if (lower.includes('city') || lower.includes('城市')) {
    return randomItem(cities)
  }

  if (lower.includes('department') || lower.includes('部门')) {
    return randomItem(departments)
  }

  if (lower.includes('颜色') || lower.includes('color') || lower.includes('colour')) {
    return randomItem(colorNames)
  }

  if (lower.includes('尺寸') || lower.includes('size') || lower.includes('规格')) {
    return randomItem(sizes)
  }

  const domain = inferTableDomain(tableName || '', tableComment)
  const dd = domainData[domain]

  if (lower.includes('status') || lower.includes('状态')) {
    if (dd && dd.statuses.length > 0) return randomItem(dd.statuses)
    return randomItem(genericStatuses)
  }

  if (lower.includes('category') || lower.includes('分类') || lower.includes('类型') || lower.includes('type')) {
    if (dd && dd.categories.length > 0) return randomItem(dd.categories)
    return randomItem(genericCategories)
  }

  if (dd && dd.names.length > 0 && hasNameKeyword) {
    return randomItem(dd.names) + ` ${seq}`
  }

  const ctxName = generateDomainContextName(tableName, tableComment, seq - 1)
  if (dd && dd.names.length > 0) {
    return `${randomItem(dd.names)}${String(seq).padStart(3, '0')}`
  }
  return `${ctxName}-${colName}-${String(seq).padStart(3, '0')}`
}

function generateStringValue(colName: string, index: number, colComment?: string, tableName?: string, tableComment?: string): string {
  const name = colName.toLowerCase()
  const ctx = makeFullContext(colName, colComment, tableName, tableComment)

  if (isPersonalName(name, tableName, tableComment)) {
    if (name.includes('first') || name === 'first_name') return randomItem(firstNames)
    if (name.includes('last') || name === 'last_name') return randomItem(lastNames)
    return `${randomItem(firstNames)}${randomItem(lastNames)}`
  }

  if (name.includes('email') || name.includes('邮箱') || name.includes('mail')) {
    return randomEmail()
  }

  if (name.includes('phone') || name.includes('mobile') || name.includes('tel') || name.includes('电话') || name.includes('手机')) {
    return randomPhone()
  }

  if (name.includes('city') || name.includes('城市')) {
    return randomItem(cities)
  }

  if (name.includes('department') || name.includes('部门')) {
    return randomItem(departments)
  }

  if (name.includes('address') || name.includes('地址') || name.includes('location') || name.includes('位置')) {
    return `${randomItem(cities)}市${randomItem(districts)}区${randomItem(['中山路', '人民路', '建设路', '解放路'])}${randomInt(1, 999)}号`
  }

  if (name.includes('gender') || name.includes('性别') || name.includes('sex')) {
    return randomItem(['男', '女'])
  }

  if (name.includes('颜色') || name.includes('color') || name.includes('colour')) {
    return randomItem(colorNames)
  }

  if (name.includes('尺寸') || name.includes('size') || name.includes('规格')) {
    return randomItem(sizes)
  }

  const domain = inferTableDomain(tableName || '', tableComment)
  const dd = domainData[domain]

  if (name.includes('status') || name.includes('状态')) {
    if (dd && dd.statuses.length > 0) return randomItem(dd.statuses)
    return randomItem(genericStatuses)
  }

  if (name.includes('category') || name.includes('分类')) {
    if (dd && dd.categories.length > 0) return randomItem(dd.categories)
    return randomItem(genericCategories)
  }

  const isDescriptionLike = name.includes('description') || name.includes('note') || name.includes('remark') || name.includes('描述') || name.includes('简介') || name.includes('说明') || name.includes('comment') || name.includes('introduction') || name.includes('detail') || name.includes('content') || name.includes('summary') || name.includes('overview') || name.includes('info') || name.includes('正文') || name.includes('内容') || name.includes('详情') || name.includes('概述') || name.includes('介绍') || name.includes('摘要') || name.includes('全文') || name.includes('详细') || ctx.includes('描述') || ctx.includes('说明') || ctx.includes('简介') || ctx.includes('介绍') || ctx.includes('详情') || ctx.includes('概述') || ctx.includes('摘要')

  if (isDescriptionLike) {
    const ctxName = generateDomainContextName(tableName, tableComment, index)
    if (dd && dd.descriptions.length > 0) {
      const desc = randomItem(dd.descriptions)
      return desc.replace(/\{name\}/g, ctxName)
    }
    return `${ctxName}的详细描述信息。${colName}：第${index + 1}条。`
  }

  if (name.includes('title') || name.includes('标题') || name.includes('subject')) {
    if (dd && dd.names.length > 0) return randomItem(dd.names)
    return generateThingName(colName, index, colComment, tableName, tableComment)
  }

  if (name.includes('payment') || name.includes('支付') || name.includes('付款')) {
    return randomItem(paymentMethods)
  }

  if (name.includes('shipping') || name.includes('express') || name.includes('快递') || name.includes('物流') || name.includes('配送')) {
    return randomItem(shippingCompanies)
  }

  if (name.includes('brand') || name.includes('品牌') || name.includes('厂商') || name.includes('制造商')) {
    return randomItem(brandNames)
  }

  if ((name.includes('position') || name.includes('job') || name.includes('title') || name.includes('职位') || name.includes('职称') || name.includes('职务')) &&
      (ctx.includes('person') || ctx.includes('用户') || ctx.includes('员工') || ctx.includes('人员'))) {
    return randomItem(jobTitles)
  }

  return generateContextString(colName, index, colComment, tableName, tableComment)
}

function generateIntegerValue(colName: string, index: number, tableName?: string, tableComment?: string): number {
  const name = colName.toLowerCase()
  const ctx = makeFullContext(colName, '', tableName, tableComment)

  if (isPrimaryKeyTypeCheck(name)) {
    return index + 1
  }

  if (name.includes('id') || name.includes('key') || name.includes('code') || name.includes('编号')) {
    return 10000 + index + 1
  }

  if (name.includes('age') || name.includes('年龄')) {
    return randomInt(18, 65)
  }

  if (name.includes('year') || name.includes('年份') || name.includes('年')) {
    return randomInt(2020, 2026)
  }

  if (name.includes('month') || name.includes('月份') || name.includes('月')) {
    return randomInt(1, 12)
  }

  if (name.includes('day') || name.includes('日') || name.includes('天')) {
    return randomInt(1, 31)
  }

  if (name.includes('hour') || name.includes('小时')) {
    return randomInt(0, 23)
  }

  if (name.includes('minute') || name.includes('分钟')) {
    return randomInt(0, 59)
  }

  if (name.includes('count') || name.includes('quantity') || name.includes('数量') ||
      name.includes('num') || name.includes('number')) {
    if (ctx.includes('stock') || ctx.includes('库存') || ctx.includes('warehouse')) {
      return randomInt(0, 5000)
    }
    return randomInt(1, 10000)
  }

  if (name.includes('stock') || name.includes('库存')) {
    return randomInt(0, 10000)
  }

  if (name.includes('score') || name.includes('评分') || name.includes('等级') || name.includes('level')) {
    return randomInt(1, 5)
  }

  if (name.includes('flag') || name.includes('标记') || name.includes('enabled') || name.includes('active') || name.includes('启用') || name.includes('激活')) {
    return randomInt(0, 1)
  }

  if (name.includes('priority') || name.includes('优先级') || name.includes('sort') || name.includes('排序') || name.includes('order')) {
    return randomInt(0, 100)
  }

  if (name.includes('status') || name.includes('state') || name.includes('状态')) {
    const domain = inferTableDomain(tableName || '', tableComment)
    const dd = domainData[domain]
    if (dd && dd.statuses.length > 0) {
      return randomInt(0, dd.statuses.length - 1)
    }
    return randomInt(0, 3)
  }

  if (name.includes('type') || name.includes('类型') || name.includes('category')) {
    return randomInt(1, 10)
  }

  return randomInt(0, 10000)
}

function generateFloatValue(colName: string, tableName?: string, tableComment?: string): number {
  const name = colName.toLowerCase()
  const ctx = makeFullContext(colName, '', tableName, tableComment)

  if (name.includes('price') || name.includes('价格') || name.includes('金额') || name.includes('费用') || name.includes('cost')) {
    if (ctx.includes('order') || ctx.includes('订单') || ctx.includes('交易')) {
      return randomFloat(1.00, 9999.99, 2)
    }
    return randomFloat(0.01, 9999.99, 2)
  }

  if (name.includes('amount') || name.includes('总计') || name.includes('total')) {
    if (ctx.includes('order') || ctx.includes('订单')) {
      return randomFloat(10.00, 99999.99, 2)
    }
    return randomFloat(0.01, 99999.99, 2)
  }

  if (name.includes('salary') || name.includes('工资') || name.includes('薪资')) {
    return randomFloat(3000, 50000, 2)
  }

  if (name.includes('percent') || name.includes('rate') || name.includes('比例') || name.includes('率') || name.includes('折扣') || name.includes('discount')) {
    if (ctx.includes('discount') || ctx.includes('折扣')) {
      return randomFloat(1, 99, 0)
    }
    return randomFloat(0, 100, 2)
  }

  if (name.includes('weight') || name.includes('重量') || name.includes('mass')) {
    return randomFloat(0.01, 100, 3)
  }

  if (name.includes('height') || name.includes('高度') || name.includes('length') || name.includes('长度')) {
    return randomFloat(0.1, 200, 2)
  }

  if (name.includes('width') || name.includes('宽度')) {
    return randomFloat(0.1, 150, 2)
  }

  if (name.includes('lat') || name.includes('纬度') || name.includes('longitude') || name.includes('经度') || name.includes('lng')) {
    return randomFloat(-180, 180, 6)
  }

  if (name.includes('temperature') || name.includes('温度') || name.includes('temp')) {
    return randomFloat(-20, 45, 1)
  }

  return randomFloat(0, 10000, 2)
}

function generateValueByType(
  dataType: string,
  columnName: string,
  index: number,
  isPrimaryKey: boolean,
  colComment?: string,
  tableName?: string,
  tableComment?: string
): any {
  const name = columnName.toLowerCase()
  const upperType = dataType.toUpperCase()

  if (isPrimaryKey) {
    if (isIntegerType(dataType)) {
      return index + 1
    }
    if (isStringType(dataType)) {
      return randomUUID()
    }
    return randomUUID()
  }

  if (isStringType(dataType)) {
    return generateStringValue(columnName, index, colComment, tableName, tableComment)
  }

  if (isIntegerType(dataType)) {
    return generateIntegerValue(columnName, index, tableName, tableComment)
  }

  if (isFloatType(dataType)) {
    return generateFloatValue(columnName, tableName, tableComment)
  }

  if (isBooleanType(dataType)) {
    return Math.random() > 0.5
  }

  if (isDateType(dataType)) {
    if (upperType.includes('DATE') && !upperType.includes('DATETIME') && !upperType.includes('TIMESTAMP')) {
      return randomDate(new Date('2020-01-01'), new Date()).toISOString().split('T')[0]
    }
    return randomDate(new Date('2020-01-01'), new Date()).toISOString()
  }

  if (isEnumType(dataType)) {
    const match = dataType.match(/ENUM\s*\((.*?)\)/i) || dataType.match(/SET\s*\((.*?)\)/i)
    if (match) {
      const values = match[1].split(',').map(v => v.trim().replace(/^['"]|['"]$/g, ''))
      return randomItem(values)
    }
    return `option_${index + 1}`
  }

  if (isUUIDType(dataType)) {
    return randomUUID()
  }

  if (isJSONType(dataType)) {
    return JSON.stringify({
      key: `${columnName}_${index}`,
      value: randomInt(1, 100),
      metadata: { source: 'mock', index }
    })
  }

  if (isBlobType(dataType)) {
    return null
  }

  return `${columnName}_value_${index + 1}`
}

export const llmDataMockService = {
  async generateMockData(request: MockDataRequest, configId?: string): Promise<MockDataResult> {
    // 当 configId 存在时，使用 LLM 生成数据
    if (configId) {
      return this.generateMockDataWithLLM(request, configId)
    }
    return this.generateMockDataByRules(request)
  },

  async generateMockDataWithLLM(request: MockDataRequest, configId: string): Promise<MockDataResult> {
    const { llmService } = await import('./llmService')
    const { tableName, tableComment, columns, rowCount } = request

    const fieldList = columns.map(col => {
      let desc = `${col.name} (${col.dataType})`
      if (col.comment) desc += ` - ${col.comment}`
      if (col.primaryKey) desc += ' [主键]'
      if (col.unique) desc += ' [唯一]'
      if (!col.nullable) desc += ' [非空]'
      return desc
    }).join(', ')

    // 构建领域上下文：表注释 + 列注释，帮助LLM生成语义正确的数据
    let domainContext = ''
    if (tableComment) {
      domainContext = `\n\n【重要 - 表的业务含义】\n此表是: ${tableComment}\n请根据这个业务含义生成真实、合理、符合业务场景的模拟数据。`
    }
    const commentFields = columns.filter(c => c.comment).map(c => `  - ${c.name}: ${c.comment}`)
    if (commentFields.length > 0) {
      domainContext += `\n\n【字段业务含义】\n${commentFields.join('\n')}\n请务必参考以上字段含义来生成数据，确保数据在语义上是合理的。`
    }

    const prompt = `请为数据库表 "${tableName}" 生成 ${rowCount} 条模拟测试数据。

【表结构】
${fieldList}
${domainContext}

【输出要求】
1. 数据必须符合字段的业务含义和约束
2. 字符串内容要真实自然（如姓名用真实人名、地址用真实格式）
3. 数值要在合理范围内
4. 日期要是近期的合理日期
5. 只返回JSON数组，不要有其他文字`

    const systemPrompt = '你是一个数据生成专家。请严格根据表注释和字段注释生成语义正确、真实合理的模拟数据。例如：如果字段注释说"属性名称，如火、水、草"，就生成"火"、"水"这样的值，而不是生成随机的字符串。只返回JSON数组，不要有其他文字。'

    const response = await llmService.callLLMWithConfig(configId, prompt, systemPrompt)

    // 解析 LLM 返回的 JSON 数据
    let rows: Record<string, any>[] = []
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        rows = JSON.parse(jsonMatch[0])
      }
    } catch (e) {
      console.error('解析LLM生成的数据失败，回退到规则生成:', e)
      return this.generateMockDataByRules(request)
    }

    // 如果解析失败或数据为空，回退到规则生成
    if (!rows || rows.length === 0) {
      return this.generateMockDataByRules(request)
    }

    const columnData: MockDataColumn[] = columns.map(col => ({
      name: col.name,
      dataType: col.dataType,
      values: rows.map(row => row[col.name] ?? null)
    }))

    rows.forEach((row, i) => { row._key = `mock-row-${tableName}-${i}` })

    const sql = this.generateInsertSQL(tableName, columns, rows)

    return {
      tableName,
      columns: columnData,
      rows,
      sql
    }
  },

  generateMockDataByRules(request: MockDataRequest): MockDataResult {
    const { tableName, tableComment, columns, rowCount } = request
    const rows: Record<string, any>[] = []
    const columnData: MockDataColumn[] = columns.map(col => ({
      name: col.name,
      dataType: col.dataType,
      values: []
    }))

    for (let i = 0; i < rowCount; i++) {
      const row: Record<string, any> = {}

      columns.forEach((col, colIndex) => {
        let value: any = null

        if (!col.nullable || col.primaryKey || col.unique) {
          value = generateValueByType(col.dataType, col.name, i, col.primaryKey, col.comment, tableName, tableComment)
        } else {
          if (Math.random() > 0.1) {
            value = generateValueByType(col.dataType, col.name, i, col.primaryKey, col.comment, tableName, tableComment)
          }
        }

        row[col.name] = value
        columnData[colIndex].values.push(value)
      })
      row._key = `mock-row-${tableName}-${i}`
      rows.push(row)
    }

    const sql = this.generateInsertSQL(tableName, columns, rows)

    return {
      tableName,
      columns: columnData,
      rows,
      sql
    }
  },

  generateInsertSQL(tableName: string, columns: any[], rows: Record<string, any>[]): string {
    if (rows.length === 0) return ''

    const columnNames = columns.map(c => c.name).join(', ')
    const sqlStatements: string[] = []

    for (const row of rows) {
      const values = columns.map(col => {
        const value = row[col.name]
        if (value === null || value === undefined) return 'NULL'
        if (typeof value === 'number' || typeof value === 'boolean') return value.toString()
        if (typeof value === 'string') {
          return `'${value.replace(/'/g, "''")}'`
        }
        return `'${String(value).replace(/'/g, "''")}'`
      }).join(', ')

      sqlStatements.push(`INSERT INTO ${tableName} (${columnNames}) VALUES (${values});`)
    }

    return sqlStatements.join('\n')
  },

  async getTemplates(): Promise<Array<{ id: string; name: string; description: string }>> {
    return [
      { id: 'users', name: '用户表', description: '包含姓名、邮箱、电话、地址等用户信息' },
      { id: 'products', name: '商品表', description: '包含商品名称、价格、分类、库存等信息' },
      { id: 'orders', name: '订单表', description: '包含订单号、用户ID、金额、状态等信息' },
      { id: 'employees', name: '员工表', description: '包含员工姓名、部门、职位、薪资等信息' },
      { id: 'blogs', name: '博客表', description: '包含标题、内容、作者、发布时间等信息' }
    ]
  },

  async generateBatchMockData(requests: MockDataRequest[], configId?: string): Promise<MockDataResult[]> {
    return Promise.all(requests.map(req => this.generateMockData(req, configId)))
  },

  async writeMockDataToDatabase(connection: any, tableName: string, data: any[]): Promise<{ success: boolean; insertedCount: number; errors?: string[] }> {
    const errors: string[] = []
    let insertedCount = 0

    try {
      // 动态导入数据库驱动
      const dbType = (connection.databaseType || 'MYSQL').toUpperCase()

      if (dbType === 'SQLITE') {
        const Database = (await import('better-sqlite3')).default
        const db = new Database(connection.databaseName || connection.host)
        db.pragma('journal_mode = WAL')

        const insertStmt = data.map(row => {
          const columns = Object.keys(row).filter(k => k !== '_key')
          const values = columns.map(col => {
            const val = row[col]
            if (val === null || val === undefined) return 'NULL'
            if (typeof val === 'number' || typeof val === 'boolean') return String(val)
            return `'${String(val).replace(/'/g, "''")}'`
          })
          return `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${values.join(', ')});`
        })

        const transaction = db.transaction(() => {
          for (const sql of insertStmt) {
            try {
              db.exec(sql)
              insertedCount++
            } catch (e: any) {
              errors.push(`行 ${insertedCount + 1}: ${e.message}`)
            }
          }
        })
        transaction()
        db.close()
      } else {
        // 对于 MySQL/PostgreSQL/SQL Server 等，使用 mysql2/pg 驱动
        if (dbType === 'MYSQL') {
          const mysql = await import('mysql2/promise')
          const conn = await mysql.createConnection({
            host: connection.host,
            port: connection.port,
            user: connection.username,
            password: connection.password,
            database: connection.databaseName,
            ssl: connection.sslEnabled ? { rejectUnauthorized: false } : undefined
          })

          for (const row of data) {
            const columns = Object.keys(row).filter(k => k !== '_key')
            const values = columns.map(col => row[col])
            const placeholders = columns.map(() => '?').join(', ')
            const sql = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`
            try {
              await conn.execute(sql, values)
              insertedCount++
            } catch (e: any) {
              errors.push(`行 ${insertedCount + 1}: ${e.message}`)
            }
          }
          await conn.end()
        } else if (dbType === 'POSTGRESQL') {
          // @ts-ignore - pg 为可选依赖
          const pg = await import('pg')
          const client = new pg.Client({
            host: connection.host,
            port: connection.port,
            user: connection.username,
            password: connection.password,
            database: connection.databaseName,
            ssl: connection.sslEnabled ? { rejectUnauthorized: false } : undefined
          })
          await client.connect()

          for (const row of data) {
            const columns = Object.keys(row).filter(k => k !== '_key')
            const values = columns.map(col => row[col])
            const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ')
            const sql = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`
            try {
              await client.query(sql, values)
              insertedCount++
            } catch (e: any) {
              errors.push(`行 ${insertedCount + 1}: ${e.message}`)
            }
          }
          await client.end()
        } else {
          // 其他数据库类型，生成SQL语句但不执行
          return { success: false, insertedCount: 0, errors: [`暂不支持 ${dbType} 数据库的直接写入，请复制SQL手动执行`] }
        }
      }

      return { success: insertedCount > 0, insertedCount, errors: errors.length > 0 ? errors : undefined }
    } catch (error: any) {
      return { success: false, insertedCount: 0, errors: [error.message] }
    }
  }
}