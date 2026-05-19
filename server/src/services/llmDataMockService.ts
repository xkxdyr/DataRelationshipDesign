import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export interface MockDataRequest {
  tableName: string
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
const statuses = ['active', 'inactive', 'pending', 'approved', 'rejected', 'cancelled', 'completed']
const categories = ['电子产品', '服装', '食品', '家居', '运动', '图书', '美妆', '母婴', '汽车', '数码']
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

function isNumericType(dataType: string): boolean {
  const upper = dataType.toUpperCase()
  return upper.includes('INT') || upper.includes('BIGINT') || upper.includes('TINYINT') ||
    upper.includes('SMALLINT') || upper.includes('DECIMAL') || upper.includes('NUMERIC') ||
    upper.includes('FLOAT') || upper.includes('DOUBLE') || upper.includes('REAL') ||
    upper.includes('NUMBER')
}

const personalContextKeywords = ['user', 'person', 'employee', 'customer', 'student', 'teacher',
  'author', 'member', 'owner', 'creator', 'manager', 'contact', 'admin', 'client', 'guest',
  '用户', '人员', '员工', '客户', '学生', '老师', '作者', '成员', '负责人', '联系人']

function isPersonalName(colName: string): boolean {
  const lower = colName.toLowerCase()
  if (lower === 'name') return true
  if (lower.includes('姓名')) return true
  if (/^(first|last|full|real|nick)_name$/.test(lower)) return true
  if (lower.includes('用户名') || lower.includes('昵称')) return true
  const hasNameKeyword = lower.includes('name') || lower.includes('姓名')
  if (!hasNameKeyword) return false
  return personalContextKeywords.some(kw => lower.includes(kw))
}

function generateThingName(colName: string, index: number, comment?: string): string {
  const lower = colName.toLowerCase()
  const context = (comment || '').toLowerCase()

  const fullContext = `${lower} ${context}`
  const seq = index + 1

  if (fullContext.includes('武器') || fullContext.includes('weapon') || fullContext.includes('兵器') || fullContext.includes('装备')) {
    if (fullContext.includes('类型') || fullContext.includes('type') || fullContext.includes('种类') || fullContext.includes('分类')) {
      return randomItem(weaponTypes)
    }
    return randomItem(weaponNames) + ` (${seq}号)`
  }

  if (fullContext.includes('书') || fullContext.includes('book') || fullContext.includes('文献') || fullContext.includes('教材')) {
    return `《${randomItem(bookTitles)}》`
  }

  if (fullContext.includes('产品') || fullContext.includes('product') || fullContext.includes('商品') || fullContext.includes('货品')) {
    return `${randomItem(productNames)} ${['Pro','Max','Plus','Lite','SE'][seq % 5]} 第${seq}代`
  }

  if (fullContext.includes('颜色') || fullContext.includes('color') || fullContext.includes('colour')) {
    return randomItem(colorNames)
  }

  if (fullContext.includes('尺寸') || fullContext.includes('size') || fullContext.includes('规格') || fullContext.includes('型号')) {
    return randomItem(sizes)
  }

  if (fullContext.includes('课程') || fullContext.includes('course') || fullContext.includes('学科') || fullContext.includes('科目')) {
    return randomItem(courseNames)
  }

  if (fullContext.includes('游戏') || fullContext.includes('game')) {
    return randomItem(gameNames)
  }

  if (fullContext.includes('公司') || fullContext.includes('company') || fullContext.includes('企业') || fullContext.includes('厂商')) {
    return randomItem(companyNames)
  }

  if (fullContext.includes('分类') || fullContext.includes('category') || fullContext.includes('类型') || fullContext.includes('type') || fullContext.includes('种类')) {
    return randomItem(categories)
  }

  return `${colName}-${String(seq).padStart(3, '0')}`
}

function generateContextString(colName: string, index: number, comment?: string): string {
  const lower = colName.toLowerCase()
  const context = (comment || '').toLowerCase()
  const fullContext = `${lower} ${context}`
  const seq = index + 1

  const hasNameKeyword = lower.includes('name') || lower.includes('名') || lower.includes('称') || lower.includes('标题') || lower.includes('title') || lower.includes('标签') || lower.includes('label')
  if (hasNameKeyword) {
    return generateThingName(colName, index, comment)
  }

  if (fullContext.includes('武器') || fullContext.includes('weapon') || fullContext.includes('兵器') || fullContext.includes('装备')) {
    return generateThingName(colName, index, comment)
  }

  if (lower.includes('description') || lower.includes('描述') || lower.includes('说明') || lower.includes('备注') || lower.includes('remark') || lower.includes('note') || lower.includes('简介')) {
    return `${colName}的详细描述文本，这是第${seq}条样本数据，用于测试和验证数据库存储容量及检索性能。`
  }

  if (lower.includes('address') || lower.includes('地址') || lower.includes('location') || lower.includes('位置')) {
    return `${randomItem(cities)}市${randomItem(districts)}区${randomItem(['中山路','人民路','建设路','解放路','长江路'])}${randomInt(1, 999)}号`
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

  if (lower.includes('status') || lower.includes('状态')) {
    return randomItem(statuses)
  }

  if (lower.includes('category') || lower.includes('分类') || lower.includes('类型') || lower.includes('type')) {
    return randomItem(categories)
  }

  if (lower.includes('颜色') || lower.includes('color') || lower.includes('colour')) {
    return randomItem(colorNames)
  }

  if (lower.includes('尺寸') || lower.includes('size') || lower.includes('规格')) {
    return randomItem(sizes)
  }

  return `${colName}-${String(seq).padStart(3, '0')}`
}

function generateValueByType(
  dataType: string,
  columnName: string,
  index: number,
  isPrimaryKey: boolean,
  comment?: string
): any {
  const name = columnName.toLowerCase()

  if (isPrimaryKey) {
    if (isNumericType(dataType)) {
      return index + 1
    }
    return randomUUID()
  }

  if (isPersonalName(name)) {
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

  if (name.includes('status') || name.includes('状态')) {
    return randomItem(statuses)
  }

  if (name.includes('category') || name.includes('分类')) {
    return randomItem(categories)
  }

  if (name.includes('address') || name.includes('地址') || name.includes('location') || name.includes('位置')) {
    return `${randomItem(cities)}市${randomItem(districts)}区${randomItem(['中山路','人民路','建设路','解放路'])}${randomInt(1, 999)}号`
  }

  if (name.includes('price') || name.includes('amount') || name.includes('salary') || name.includes('价格') || name.includes('金额') || name.includes('费用')) {
    return randomFloat(10, 10000)
  }

  if (name.includes('age') || name.includes('年龄')) {
    return randomInt(18, 80)
  }

  if (name.includes('count') || name.includes('quantity') || name.includes('数量') || name.includes('num') || name.includes('stock') || name.includes('库存') || name.includes('评分')) {
    return randomInt(0, 1000)
  }

  if (name.includes('date') || name.includes('time') || name.includes('created') || name.includes('updated') || name.includes('日期') || name.includes('时间')) {
    return randomDate(new Date('2020-01-01'), new Date()).toISOString().split('T')[0]
  }

  if (name.includes('description') || name.includes('note') || name.includes('remark') || name.includes('描述') || name.includes('简介') || name.includes('说明')) {
    return `${columnName}的详细描述文本，这是第${index + 1}条样本数据，用于测试和验证。`
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

  if (isStringType(dataType)) {
    return generateContextString(columnName, index, comment)
  }

  if (isNumericType(dataType)) {
    if (name.includes('id') || name.includes('key') || name.includes('code') || name.includes('编号')) {
      return 10000 + index + 1
    }
    if (name.includes('year') || name.includes('年份') || name.includes('年')) {
      return randomInt(2020, 2026)
    }
    if (name.includes('month') || name.includes('月份') || name.includes('月')) {
      return randomInt(1, 12)
    }
    if (name.includes('percent') || name.includes('rate') || name.includes('比例') || name.includes('率')) {
      return randomFloat(0, 100, 2)
    }
    return randomInt(0, 10000)
  }

  if (dataType.toUpperCase().includes('BOOLEAN') || dataType.toUpperCase().includes('BIT')) {
    return Math.random() > 0.5
  }

  if (dataType.toUpperCase().includes('BLOB') || dataType.toUpperCase().includes('BINARY')) {
    return null
  }

  if (dataType.toUpperCase().includes('UUID')) {
    return randomUUID()
  }

  if (dataType.toUpperCase().includes('JSON')) {
    return JSON.stringify({
      key: `${columnName}_${index}`,
      value: randomInt(1, 100),
      metadata: { source: 'mock', index }
    })
  }

  return `${columnName}_value_${index + 1}`
}

export const llmDataMockService = {
  generateMockData(request: MockDataRequest): MockDataResult {
    const { tableName, columns, rowCount } = request
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
          value = generateValueByType(col.dataType, col.name, i, col.primaryKey, col.comment)
        } else {
          if (Math.random() > 0.1) {
            value = generateValueByType(col.dataType, col.name, i, col.primaryKey, col.comment)
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

  async generateBatchMockData(requests: MockDataRequest[]): Promise<MockDataResult[]> {
    return requests.map(req => this.generateMockData(req))
  }
}