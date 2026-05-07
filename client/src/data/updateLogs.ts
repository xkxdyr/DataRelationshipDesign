export interface UpdateLog {
  date: string
  version: string
  changes: UpdateChange[]
}

export interface UpdateChange {
  type: 'feature' | 'improvement' | 'bugfix' | 'security' | 'ui'
  title: string
  description?: string
}

export const updateLogs: UpdateLog[] = [
  {
    date: '2026-05-07',
    version: 'v1.0.8',
    changes: [
      {
        type: 'feature',
        title: '多选和批量操作功能',
        description: '支持Ctrl/Cmd+点击多选表、框选多表、批量删除选中表、全选/取消选择功能'
      },
      {
        type: 'improvement',
        title: 'Canvas选择体验优化',
        description: '优化节点选择逻辑，支持Shift/Ctrl/Cmd多选操作，添加选择变化回调'
      }
    ]
  },
  {
    date: '2026-05-07',
    version: 'v1.0.7',
    changes: [
      {
        type: 'feature',
        title: '数据模拟功能',
        description: '根据表结构自动生成模拟数据，支持9种数据生成规则，支持SQL/JSON/CSV导出'
      },
      {
        type: 'feature',
        title: '可视化版本对比',
        description: '支持对比两个版本的表、字段、关系差异，支持导出对比报告'
      },
      {
        type: 'improvement',
        title: '数据库连接管理增强',
        description: '添加搜索功能、连接状态指示、SSL标识、测试时间显示'
      },
      {
        type: 'ui',
        title: '设置页面更新日志',
        description: '在设置中添加更新日志显示，方便用户了解最新功能'
      },
      {
        type: 'bugfix',
        title: '修复TypeScript编译错误',
        description: '修复6个TypeScript编译错误，包括未使用变量、无效CSS属性等'
      }
    ]
  },
  {
    date: '2026-05-06',
    version: 'v1.0.6',
    changes: [
      {
        type: 'feature',
        title: '增强字段选择器显示',
        description: '选择表和字段时显示表名注释、字段约束及注释'
      },
      {
        type: 'feature',
        title: '级联规则悬浮提示',
        description: '更新和删除规则处添加悬浮提示，展示CASCADE/SET NULL/RESTRICT等规则作用'
      },
      {
        type: 'feature',
        title: 'SQL导入一键整理',
        description: '导入SQL项目增加一键整理功能，自动优化表布局'
      },
      {
        type: 'improvement',
        title: 'Canvas useForm警告修复',
        description: '修复Form实例未连接警告'
      },
      {
        type: 'bugfix',
        title: '后端路由前缀修复',
        description: '修复API返回HTML 404错误的问题'
      }
    ]
  },
  {
    date: '2026-05-05',
    version: 'v1.0.5',
    changes: [
      {
        type: 'feature',
        title: '数据库连接管理',
        description: '支持配置和管理数据库连接，包含连接测试功能'
      },
      {
        type: 'feature',
        title: '数据库逆向工程',
        description: '从现有数据库导入表结构、关系、索引'
      },
      {
        type: 'feature',
        title: '数据库同步功能',
        description: '将设计同步到实际数据库，支持预览变更'
      }
    ]
  },
  {
    date: '2026-05-04',
    version: 'v1.0.4',
    changes: [
      {
        type: 'feature',
        title: '离线数据存储',
        description: '使用IndexedDB存储项目数据，支持离线使用'
      },
      {
        type: 'feature',
        title: '离线模式支持',
        description: '无网络连接时仍能查看和编辑设计'
      },
      {
        type: 'feature',
        title: '本地项目导入导出',
        description: '支持将项目导出为JSON/SQL文件'
      },
      {
        type: 'feature',
        title: '自动保存到本地',
        description: '定期自动保存设计数据到浏览器本地存储'
      },
      {
        type: 'feature',
        title: '本地模式切换',
        description: '提供在线/离线模式切换开关'
      }
    ]
  },
  {
    date: '2026-05-03',
    version: 'v1.0.3',
    changes: [
      {
        type: 'feature',
        title: '字体大小设置',
        description: '支持用户自定义字体大小'
      },
      {
        type: 'improvement',
        title: 'UI全面检查',
        description: '检查并修复界面元素对齐问题'
      },
      {
        type: 'improvement',
        title: 'TableEditor布局优化',
        description: '优化表编辑器的布局和交互'
      }
    ]
  },
  {
    date: '2026-05-02',
    version: 'v1.0.2',
    changes: [
      {
        type: 'feature',
        title: '团队协作基础架构',
        description: '设计团队协作功能的基础架构'
      },
      {
        type: 'feature',
        title: '实时同步服务',
        description: 'WebSocket实时同步设计变更'
      },
      {
        type: 'feature',
        title: '用户权限管理',
        description: '项目访问权限、编辑权限、只读权限等'
      }
    ]
  },
  {
    date: '2026-05-01',
    version: 'v1.0.1',
    changes: [
      {
        type: 'feature',
        title: '项目管理',
        description: '支持创建、编辑、删除项目'
      },
      {
        type: 'feature',
        title: '表设计',
        description: '支持创建、编辑、删除数据表'
      },
      {
        type: 'feature',
        title: '关系管理',
        description: '支持创建表之间的关系'
      },
      {
        type: 'feature',
        title: '索引管理',
        description: '支持创建和管理索引'
      }
    ]
  },
  {
    date: '2026-04-30',
    version: 'v1.0.0',
    changes: [
      {
        type: 'feature',
        title: '初始版本发布',
        description: '数据库可视化设计工具正式发布'
      }
    ]
  }
]

export const getChangeTypeLabel = (type: UpdateChange['type']): string => {
  const labels: Record<UpdateChange['type'], string> = {
    feature: '新功能',
    improvement: '改进',
    bugfix: 'Bug修复',
    security: '安全更新',
    ui: '界面更新'
  }
  return labels[type]
}

export const getChangeTypeColor = (type: UpdateChange['type']): string => {
  const colors: Record<UpdateChange['type'], string> = {
    feature: 'green',
    improvement: 'blue',
    bugfix: 'red',
    security: 'purple',
    ui: 'orange'
  }
  return colors[type]
}
