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
# 访问: http://localhost:3000 (或 http://localhost:3002, http://localhost:3003)
```

## 📁 项目结构

```
DataRelationshipDesign/
├── client/                 # 前端（React + TypeScript）
│   ├── src/
│   │   ├── components/     # UI 组件
│   │   ├── services/       # API 服务
│   │   ├── stores/         # Zustand 状态管理
│   │   └── types/          # TypeScript 类型
│   └── dist/               # 生产构建
├── server/                 # 后端（Node.js + Express + Prisma）
│   ├── src/
│   │   ├── controllers/    # API 控制器
│   │   ├── services/       # 业务逻辑层
│   │   ├── routes/         # API 路由
│   │   └── generators/     # DDL 生成器
│   ├── prisma/             # Prisma 数据模型
│   └── dist/               # 生产构建
├── DESIGN_DOC.md           # 完整设计文档
├── COMPLETED_FEATURES.md   # 已完成功能归档
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

### 项目管理
- `GET /api/projects` - 获取所有项目
- `POST /api/projects` - 创建项目
- `GET /api/projects/:id` - 获取单个项目
- `PUT /api/projects/:id` - 更新项目
- `DELETE /api/projects/:id` - 删除项目
- `GET /api/projects/:id/ddl` - 导出项目 DDL

### 表管理
- `GET /api/projects/:projectId/tables` - 获取项目表
- `POST /api/projects/:projectId/tables` - 创建表
- `GET /api/tables/:id` - 获取单个表
- `PUT /api/tables/:id` - 更新表
- `DELETE /api/tables/:id` - 删除表
- `PATCH /api/tables/:id/position` - 更新表位置
- `GET /api/tables/:id/ddl` - 导出表 DDL

### 列管理
- `GET /api/tables/:tableId/columns` - 获取表列
- `POST /api/tables/:tableId/columns` - 创建列
- `POST /api/tables/:tableId/columns/bulk` - 批量创建列
- `PUT /api/columns/:id` - 更新列
- `DELETE /api/columns/:id` - 删除列
- `PATCH /api/tables/:tableId/columns/order` - 更新列顺序

### 关系管理
- `GET /api/projects/:projectId/relationships` - 获取关系
- `POST /api/projects/:projectId/relationships` - 创建关系
- `GET /api/relationships/:id` - 获取单个关系
- `PUT /api/relationships/:id` - 更新关系
- `DELETE /api/relationships/:id` - 删除关系

### 索引管理
- `GET /api/tables/:tableId/indexes` - 获取索引
- `POST /api/tables/:tableId/indexes` - 创建索引
- `GET /api/indexes/:id` - 获取单个索引
- `PUT /api/indexes/:id` - 更新索引
- `DELETE /api/indexes/:id` - 删除索引

### 版本管理
- `GET /api/projects/:projectId/versions` - 获取版本
- `POST /api/projects/:projectId/versions` - 创建版本
- `GET /api/versions/:id` - 获取单个版本
- `PUT /api/versions/:id` - 更新版本
- `DELETE /api/versions/:id` - 删除版本

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

## 🎯 未来计划

- [ ] 数据库同步（MySQL）
- [ ] 团队协作
- [ ] 数据迁移

## 📄 许可证

MIT License
