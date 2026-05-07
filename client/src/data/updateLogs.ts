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
    version: 'v1.1.6',
    changes: [
      {
        type: 'feature',
        title: '自动适应视图功能',
        description: '切换项目或表数量变化时自动调整视图，使所有表节点可见，避免表被遮挡'
      },
      {
        type: 'feature',
        title: '全选功能完善',
        description: 'Ctrl+A快捷键可全选画布上所有表，方便批量操作，配合Ctrl+C复制和Delete删除实现高效管理'
      },
      {
        type: 'ui',
        title: '表节点统计信息增强',
        description: 'Canvas表节点底部显示统计信息：字段数量、主键数量、索引数量、关系数量，直观展示表元数据'
      },
      {
        type: 'feature',
        title: '增量DDL生成功能',
        description: '支持生成ALTER TABLE语句（添加/修改/删除列、添加/删除索引），用于数据库增量同步'
      },
      {
        type: 'feature',
        title: '复制粘贴表功能',
        description: '支持Ctrl+C复制选中表、Ctrl+V粘贴表，粘贴时自动偏移位置，支持复制字段和索引'
      },
      {
        type: 'ui',
        title: '画布缩放级别指示器增强',
        description: '缩放指示器添加绿色高亮样式，100%时显示醒目标识，提升视觉反馈'
      },
      {
        type: 'ui',
        title: '缩放指示器点击重置功能',
        description: '点击缩放百分比数字可快速重置为100%，添加手型光标和悬停效果'
      },
      {
        type: 'feature',
        title: 'Ctrl+0 快捷键重置缩放',
        description: '添加键盘快捷键 Ctrl+0/Cmd+0 快速将画布缩放重置为100%'
      },
      {
        type: 'ui',
        title: '缩放提示信息优化',
        description: '缩放指示器添加工具提示，显示"点击重置为100% (Ctrl+0)"操作引导'
      }
    ]
  },
  {
    date: '2026-05-07',
    version: 'v1.1.5',
    changes: [
      {
        type: 'improvement',
        title: '索引管理界面增强',
        description: '索引列表显示统计信息（总数、唯一索引数），空状态显示友好提示'
      },
      {
        type: 'improvement',
        title: '索引列字段信息增强',
        description: '包含列显示字段数量，悬停提示显示完整列名和注释信息'
      },
      {
        type: 'ui',
        title: '索引编辑按钮优化',
        description: '添加编辑按钮图标，与删除按钮保持一致的视觉风格'
      },
      {
        type: 'ui',
        title: '索引卡片交互优化',
        description: '索引卡片添加过渡动画效果，提升用户体验'
      }
    ]
  },
  {
    date: '2026-05-07',
    version: 'v1.1.4',
    changes: [
      {
        type: 'feature',
        title: '关系基数设置功能',
        description: '关系编辑器新增源表和目标表基数设置选项，支持 1、N、* 三种基数类型'
      },
      {
        type: 'feature',
        title: '基数信息展示',
        description: '关系列表显示基数信息（格式：1→N），Canvas 连线标签显示基数标识'
      },
      {
        type: 'feature',
        title: '后端基数字段支持',
        description: '数据库 Relationship 表新增 sourceCardinality 和 targetCardinality 字段'
      },
      {
        type: 'ui',
        title: '基数设置工具提示',
        description: '基数选择器添加 InfoCircleOutlined 图标提示，说明基数含义'
      }
    ]
  },
  {
    date: '2026-05-07',
    version: 'v1.1.3',
    changes: [
      {
        type: 'feature',
        title: '画布搜索定位功能',
        description: '实现 Ctrl+F 搜索表名功能，支持搜索表名和注释，自动定位并高亮显示搜索结果'
      },
      {
        type: 'feature',
        title: '搜索历史记录',
        description: '保存最近搜索的10个表名到 localStorage，支持快速选择历史记录'
      },
      {
        type: 'feature',
        title: '节点高亮定位',
        description: '搜索命中的表节点显示金色高亮边框和平滑阴影效果，支持 Esc 键清除高亮'
      },
      {
        type: 'ui',
        title: '搜索结果下拉面板',
        description: '搜索时显示匹配结果下拉列表，悬停高亮效果，显示表名和注释信息'
      }
    ]
  },
  {
    date: '2026-05-07',
    version: 'v1.1.2',
    changes: [
      {
        type: 'feature',
        title: '表注释显示增强',
        description: 'Canvas节点表头区域显示表注释，注释过长时自动省略，紧凑模式下字体缩小'
      },
      {
        type: 'feature',
        title: '字段注释快速编辑',
        description: '表编辑器列管理中添加注释列，支持快速输入和编辑字段注释'
      },
      {
        type: 'feature',
        title: '字段注释图标提示',
        description: 'Canvas节点字段行显示注释图标，鼠标悬停显示完整注释内容'
      },
      {
        type: 'ui',
        title: '注释输入框优化',
        description: '字段注释输入框添加Tooltip提示，图标颜色区分有无注释状态'
      }
    ]
  },
  {
    date: '2026-05-07',
    version: 'v1.1.1',
    changes: [
      {
        type: 'feature',
        title: '循环依赖检测功能',
        description: '设计文档3.2.3要求：在创建关系时自动检测循环依赖，使用DFS算法检测图中的环，支持一对一、一对多、多对多关系类型'
      },
      {
        type: 'improvement',
        title: '关系编辑器增强',
        description: '添加循环依赖预览警告，实时检测并显示会导致循环的关系路径，提供友好的警告提示'
      }
    ]
  },
  {
    date: '2026-05-07',
    version: 'v1.1.0',
    changes: [
      {
        type: 'feature',
        title: '字段拖拽排序功能',
        description: '使用@dnd-kit实现字段拖拽排序，支持拖拽手柄快速调整字段顺序'
      },
      {
        type: 'improvement',
        title: '表编辑器重构',
        description: '使用SortableItem组件封装字段编辑，添加拖拽视觉反馈'
      }
    ]
  },
  {
    date: '2026-05-07',
    version: 'v1.0.9',
    changes: [
      {
        type: 'feature',
        title: '网格对齐和辅助线功能',
        description: '支持网格对齐开关、辅助线显示开关、网格大小可调节(10-50px)'
      }
    ]
  },
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
