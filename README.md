# 数据库可视化设计工具

专业的工业级数据库设计工具，支持可视化设计、关系管理和DDL导出。

## ✨ 功能特性

- 📊 **可视化设计** - 拖拽式设计数据库表
- 🔗 **关系管理** - 完整的外键约束支持
- 📄 **DDL 导出** - 一键导出多数据库 DDL（MySQL/PostgreSQL/SQLite/SQL Server/Oracle）
- 📈 **版本管理** - 数据库设计版本控制
- 📝 **索引管理** - 普通索引与唯一索引支持
- 🎨 **主题系统** - 4种主题支持（浅色/深色/Darcula/蓝色）
- 🖼️ **ER图导出** - 支持导出为PNG和SVG
- 📥 **导入导出** - JSON和SQL导入导出
- 🤖 **AI助手** - AI智能生成表结构（可选API密钥）
- 📱 **响应式设计** - IntelliJ IDEA风格界面
- 📴 **离线模式** - IndexedDB本地存储支持

## 🚀 快速开始

### 环境要求
- Node.js >= 18
- npm 或 yarn

### 安装与启动

#### 后端
```bash
cd server
npm install
npm run dev
# 访问: http://localhost:3001
```

#### 前端
```bash
cd client
npm install
npm run dev
# 访问: http://localhost:3002
```

## 📁 项目结构

```
DataRelationshipDesign/
├── client/                 # 前端（React 18 + TypeScript + Vite）
│   ├── src/
│   │   ├── components/     # UI 组件（Ant Design 5 + React Flow）
│   │   ├── services/       # API 服务层
│   │   ├── stores/         # Zustand 状态管理
│   │   ├── types/          # TypeScript 类型定义
│   │   ├── theme/          # 主题配置
│   │   └── providers/      # Context Providers
│   └── dist/               # 生产构建
├── server/                 # 后端（Node.js + Express + Prisma）
│   ├── src/
│   │   ├── controllers/    # API 控制器
│   │   ├── services/       # 业务逻辑层
│   │   ├── routes/         # API 路由
│   │   ├── generators/     # DDL 生成器
│   │   └── types/          # DTO 类型定义
│   ├── prisma/             # Prisma 数据模型
│   └── dist/               # 生产构建
├── logs/                   # 更新日志
│   └── update.log          # 系统更新日志
├── DESIGN_DOC.md           # 完整技术设计文档
├── COMPLETED_FEATURES.md   # 已完成功能归档
├── RECOMMENDED_FEATURES.md # 推荐功能文档
├── PENDING_FEATURES.md     # 待确认功能文档
├── INCOMPLETE_FEATURES.md  # 未正确执行功能记录
└── README.md               # 本文件
```

## 🛠️ 技术栈

### 前端
- **React 18** - UI 框架
- **TypeScript** - 类型安全
- **Ant Design** - UI 组件库
- **React Flow** - 可视化画布
- **Zustand** - 状态管理
- **Vite** - 构建工具

### 后端
- **Node.js** - 运行时
- **Express** - Web 框架
- **Prisma** - ORM
- **SQLite** - 开发数据库
- **TypeScript** - 类型安全

## 📖 使用指南

### 1. 创建项目
- 点击 "新建项目"
- 输入项目名称

### 2. 设计表
- 点击 "新建表"
- 拖拽表到合适位置
- 点击表节点打开编辑器
- 添加、编辑、删除列

### 3. 添加关系（外键）
- 通过 API 添加表之间的关系
- 支持级联更新和删除

### 4. 导出 DDL
- 点击 "导出 DDL" 按钮
- 完整的 MySQL 建表语句会自动下载

## 📄 API 文档

### 健康检查
- `GET /api/health` - 健康检查

### 用户认证
- `POST /api/users/register` - 用户注册
- `POST /api/users/login` - 用户登录
- `GET /api/users/me` - 获取当前用户（需认证）
- `GET /api/users/search` - 搜索用户
- `GET /api/users/:userId` - 获取用户信息
- `GET /api/users/projects` - 获取用户有权限的项目

### 项目管理
- `GET /api/projects` - 获取所有项目（需认证）
- `POST /api/projects` - 创建项目（需认证）
- `GET /api/projects/:id` - 获取单个项目（需认证）
- `PUT /api/projects/:id` - 更新项目（需认证）
- `DELETE /api/projects/:id` - 删除项目（需认证）
- `POST /api/projects/:id/duplicate` - 复制项目（需认证）

### 表管理
- `GET /api/projects/:projectId/tables` - 获取项目表（需认证）
- `POST /api/projects/:projectId/tables` - 创建表（需认证）
- `GET /api/tables/:id` - 获取单个表（需认证）
- `PUT /api/tables/:id` - 更新表（需认证）
- `DELETE /api/tables/:id` - 删除表（需认证）
- `PATCH /api/tables/:id/position` - 更新表位置（需认证）

### 列管理
- `GET /api/tables/:tableId/columns` - 获取表列（需认证）
- `POST /api/tables/:tableId/columns` - 创建列（需认证）
- `POST /api/tables/:tableId/columns/bulk` - 批量创建列（需认证）
- `PUT /api/columns/:id` - 更新列（需认证）
- `DELETE /api/columns/:id` - 删除列（需认证）
- `PATCH /api/tables/:tableId/columns/order` - 更新列顺序（需认证）

### 关系管理
- `GET /api/projects/:projectId/relationships` - 获取关系（需认证）
- `POST /api/projects/:projectId/relationships` - 创建关系（需认证）
- `GET /api/relationships/:id` - 获取单个关系（需认证）
- `PUT /api/relationships/:id` - 更新关系（需认证）
- `DELETE /api/relationships/:id` - 删除关系（需认证）

### 索引管理
- `GET /api/tables/:tableId/indexes` - 获取索引（需认证）
- `POST /api/tables/:tableId/indexes` - 创建索引（需认证）
- `GET /api/indexes/:id` - 获取单个索引（需认证）
- `PUT /api/indexes/:id` - 更新索引（需认证）
- `DELETE /api/indexes/:id` - 删除索引（需认证）

### 版本管理
- `GET /api/projects/:projectId/versions` - 获取版本（需认证）
- `POST /api/projects/:projectId/versions` - 创建版本（需认证）
- `GET /api/versions/:id` - 获取单个版本（需认证）
- `PUT /api/versions/:id` - 更新版本（需认证）
- `DELETE /api/versions/:id` - 删除版本（需认证）

### DDL导出
- `GET /api/ddl/projects/:projectId/ddl` - 导出项目DDL
- `GET /api/ddl/tables/:tableId/ddl` - 导出表DDL
- `GET /api/ddl/databases` - 获取支持的数据库类型

### 数据库连接
- `GET /api/connections` - 获取连接配置（需认证）
- `POST /api/connections` - 创建连接（需认证）
- `GET /api/connections/:id` - 获取单个连接（需认证）
- `PUT /api/connections/:id` - 更新连接（需认证）
- `DELETE /api/connections/:id` - 删除连接（需认证）
- `POST /api/connections/test` - 测试连接（需认证）

### 团队管理
- `GET /api/teams` - 获取团队列表（需认证）
- `POST /api/teams` - 创建团队（需认证）
- `GET /api/teams/:teamId` - 获取团队信息（需认证）
- `PUT /api/teams/:teamId` - 更新团队（需认证）
- `DELETE /api/teams/:teamId` - 删除团队（需认证）

### 项目成员管理
- `GET /api/projects/:projectId/members` - 获取项目成员（需认证）
- `POST /api/projects/:projectId/members` - 添加项目成员（需认证）
- `DELETE /api/projects/:projectId/members/:userId` - 移除项目成员（需认证）
- `PUT /api/projects/:projectId/members/:userId/role` - 更新成员角色（需认证）

### 会话管理
- `GET /api/sessions/active` - 获取活跃会话（需认证）
- `GET /api/sessions/all` - 获取所有会话（需认证）
- `DELETE /api/sessions/:sessionId` - 终止会话（需认证）
- `POST /api/sessions/invalidate-all` - 终止所有会话（需认证）

### 历史记录
- `GET /api/history/project/:projectId` - 获取项目历史（需认证）
- `GET /api/history/project/:projectId/stats` - 获取历史统计（需认证）
- `DELETE /api/history/project/:projectId` - 清除项目历史（需认证）

## ✅ 已完成功能

所有核心功能已完成！✓

- ✅ 可视化关系连线
- ✅ 导出 ER 图（PNG/SVG）
- ✅ PostgreSQL 完整支持
- ✅ 多数据库DDL导出
- ✅ 导入 SQL
- ✅ 完整主题系统
- ✅ 离线模式
- ✅ 完整导入导出（JSON/SQL）
- ✅ AI 响应式设计 IntelliJ IDEA风格
- ✅ 主题系统
- ✅ MySQL/PostgreSQL/SQLite/SQL Server/Oracle DDL 完整支持

## 🎯 已完成增强功能

- [x] 数据库同步（MySQL/PostgreSQL/SQLite）
- [x] 数据库逆向工程（从现有数据库导入表结构）
- [x] 分支管理功能（类似Apifox分支管理）
- [x] Git配置集成
- [x] 版本可视化对比
- [x] 增量 DDL 生成（ALTER TABLE）
- [x] 本地 SQLite 文件可视化导入
- [x] 评论与标注系统
- [x] 关系线智能避让
- [x] 字段级协作锁机制
- [x] 操作历史 JSON/CSV 导出
- [x] Ollama 本地大模型支持
- [x] 用户认证与团队管理
- [x] WebSocket + Yjs CRDT 实时协作

## 📄 许可证

MIT License
