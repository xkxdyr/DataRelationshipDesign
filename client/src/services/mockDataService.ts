import { Table, Column } from '../types'

export interface MockDataRule {
  columnName: string
  dataType: string
  rule: 'random' | 'sequence' | 'fixed' | 'name' | 'email' | 'phone' | 'address' | 'date' | 'uuid'
  fixedValue?: string
  min?: number
  max?: number
  prefix?: string
  suffix?: string
}

export interface MockDataOptions {
  tableId: string
  tableName: string
  count: number
  rules: MockDataRule[]
}

export interface MockDataResult {
  success: boolean
  data: Record<string, any>[]
  message?: string
}

// 常用中文姓名
const firstNames = ['伟', '芳', '娜', '敏', '静', '丽', '强', '磊', '军', '洋', '勇', '艳', '杰', '涛', '明', '超', '秀', '霞', '平', '刚', '桂英', '桂兰', '桂芳', '桂珍', '桂花']
const lastNames = ['李', '王', '张', '刘', '陈', '杨', '赵', '黄', '周', '吴', '徐', '孙', '胡', '朱', '高', '林', '何', '郭', '马', '罗', '梁', '宋', '郑', '谢', '韩']

// 常用邮箱域名
const emailDomains = ['gmail.com', 'qq.com', '163.com', 'outlook.com', 'yahoo.com', 'hotmail.com', 'sina.com', 'sohu.com']

// 常用城市
const cities = ['北京', '上海', '广州', '深圳', '杭州', '南京', '成都', '武汉', '西安', '重庆', '天津', '苏州', '郑州', '长沙', '青岛']

// 常用街道
const streets = ['中山路', '解放路', '人民路', '建设路', '和平路', '文化路', '工业路', '光明路', '胜利路', '友谊路']

class MockDataService {
  private sequenceCounters: Map<string, number> = new Map()

  generateMockData(options: MockDataOptions): MockDataResult {
    try {
      const data: Record<string, any>[] = []
      
      for (let i = 0; i < options.count; i++) {
        const row: Record<string, any> = {}
        
        for (const rule of options.rules) {
          row[rule.columnName] = this.generateValue(rule, i)
        }
        
        data.push(row)
      }
      
      return {
        success: true,
        data
      }
    } catch (error) {
      return {
        success: false,
        data: [],
        message: error instanceof Error ? error.message : '生成模拟数据失败'
      }
    }
  }

  private generateValue(rule: MockDataRule, index: number): any {
    switch (rule.rule) {
      case 'fixed':
        return rule.fixedValue ?? ''
      
      case 'sequence':
        const key = `${rule.columnName}`
        const current = this.sequenceCounters.get(key) ?? (rule.min ?? 1)
        this.sequenceCounters.set(key, current + 1)
        return current
      
      case 'name':
        return this.generateName()
      
      case 'email':
        return this.generateEmail()
      
      case 'phone':
        return this.generatePhone()
      
      case 'address':
        return this.generateAddress()
      
      case 'date':
        return this.generateDate()
      
      case 'uuid':
        return this.generateUUID()
      
      case 'random':
      default:
        return this.generateRandomByType(rule)
    }
  }

  private generateName(): string {
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)]
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)]
    return lastName + firstName
  }

  private generateEmail(): string {
    const name = Math.random().toString(36).substring(2, 8)
    const domain = emailDomains[Math.floor(Math.random() * emailDomains.length)]
    return `${name}@${domain}`
  }

  private generatePhone(): string {
    const prefixes = ['138', '139', '137', '136', '135', '134', '159', '158', '157', '150', '151', '152', '188', '187', '182', '181']
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)]
    const suffix = Math.floor(Math.random() * 100000000).toString().padStart(8, '0')
    return prefix + suffix
  }

  private generateAddress(): string {
    const city = cities[Math.floor(Math.random() * cities.length)]
    const street = streets[Math.floor(Math.random() * streets.length)]
    const number = Math.floor(Math.random() * 999) + 1
    return `${city}市${street}${number}号`
  }

  private generateDate(): string {
    const start = new Date(2020, 0, 1)
    const end = new Date()
    const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
    return date.toISOString().split('T')[0]
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0
      const v = c === 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
  }

  private generateRandomByType(rule: MockDataRule): any {
    const dataType = rule.dataType.toUpperCase()
    
    if (dataType.includes('INT')) {
      const min = rule.min ?? 0
      const max = rule.max ?? 1000
      return Math.floor(Math.random() * (max - min + 1)) + min
    }
    
    if (dataType.includes('VARCHAR') || dataType.includes('CHAR') || dataType.includes('TEXT')) {
      const length = rule.max ?? 10
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
      let result = ''
      for (let i = 0; i < Math.min(length, 10); i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length))
      }
      return (rule.prefix ?? '') + result + (rule.suffix ?? '')
    }
    
    if (dataType.includes('DECIMAL') || dataType.includes('FLOAT') || dataType.includes('DOUBLE')) {
      const min = rule.min ?? 0
      const max = rule.max ?? 100
      return parseFloat((Math.random() * (max - min) + min).toFixed(2))
    }
    
    if (dataType.includes('DATE') || dataType.includes('TIME')) {
      return this.generateDate()
    }
    
    if (dataType.includes('BOOL')) {
      return Math.random() > 0.5
    }
    
    return ''
  }

  // 根据表结构自动生成规则
  generateRulesFromTable(table: Table): MockDataRule[] {
    return table.columns.map(column => {
      const rule: MockDataRule = {
        columnName: column.name,
        dataType: column.dataType,
        rule: this.inferRuleFromColumn(column)
      }
      
      // 根据数据类型设置范围
      if (column.dataType.toUpperCase().includes('INT')) {
        rule.min = 1
        rule.max = 1000
      }
      
      return rule
    })
  }

  private inferRuleFromColumn(column: Column): MockDataRule['rule'] {
    const name = column.name.toLowerCase()
    const dataType = column.dataType.toUpperCase()
    
    // 根据列名推断规则
    if (name.includes('name') || name.includes('姓名')) {
      return 'name'
    }
    
    if (name.includes('email') || name.includes('邮箱') || name.includes('邮件')) {
      return 'email'
    }
    
    if (name.includes('phone') || name.includes('tel') || name.includes('手机') || name.includes('电话')) {
      return 'phone'
    }
    
    if (name.includes('address') || name.includes('addr') || name.includes('地址')) {
      return 'address'
    }
    
    if (name.includes('date') || name.includes('time') || name.includes('日期') || name.includes('时间')) {
      return 'date'
    }
    
    if (name.includes('uuid') || name.includes('id')) {
      if (dataType.includes('VARCHAR') || dataType.includes('CHAR')) {
        return 'uuid'
      }
    }
    
    // 主键使用序列
    if (column.primaryKey && dataType.includes('INT')) {
      return 'sequence'
    }
    
    return 'random'
  }

  resetSequence(): void {
    this.sequenceCounters.clear()
  }

  // 导出为 SQL INSERT 语句
  exportToSQL(tableName: string, data: Record<string, any>[], columns: Column[]): string {
    if (data.length === 0) return ''
    
    const columnNames = columns.map(c => c.name).join(', ')
    const values = data.map(row => {
      const rowValues = columns.map(col => {
        const value = row[col.name]
        if (value === null || value === undefined) {
          return 'NULL'
        }
        if (typeof value === 'string') {
          return `'${value.replace(/'/g, "''")}'`
        }
        if (typeof value === 'boolean') {
          return value ? '1' : '0'
        }
        return value
      })
      return `(${rowValues.join(', ')})`
    })
    
    return `INSERT INTO ${tableName} (${columnNames}) VALUES\n${values.join(',\n')};`
  }

  // 导出为 JSON
  exportToJSON(data: Record<string, any>[]): string {
    return JSON.stringify(data, null, 2)
  }

  // 导出为 CSV
  exportToCSV(data: Record<string, any>[], columns: Column[]): string {
    if (data.length === 0) return ''
    
    const headers = columns.map(c => c.name).join(',')
    const rows = data.map(row => {
      return columns.map(col => {
        const value = row[col.name]
        if (value === null || value === undefined) return ''
        const str = String(value)
        // 如果包含逗号或引号，需要转义
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`
        }
        return str
      }).join(',')
    })
    
    return [headers, ...rows].join('\n')
  }
}

export const mockDataService = new MockDataService()
