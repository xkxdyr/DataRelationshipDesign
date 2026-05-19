# DataVisualization Designer - 数据库可视化设计工具

## 1. 项目概述

### 1.1 项目背景
开发一款工业级、易用的数据库可视化设计工具，支持表关系设计、键关系管理、DDL生成等功能。

### 1.2 项目目标
- 提供直观的拖拽式数据库设计体验
- 支持多数据库类型（MySQL、PostgreSQL、SQLite等）
- 生成生产级别的 DDL 代码
- 支持团队协作与版本管理

### 1.3 目标用户
- 数据库开发工程师
- 系统架构师
- 技术团队负责人

---

## 2. 技术架构

### 2.1 技术栈选型

| 类别 | 技术选择 | 说明 |
|------|----------|------|
| **前端框架** | React 18 + TypeScript + Vite | 现代化前端开发体验 |
| **图形引擎** | React Flow 11 | 专业的关系图可视化库 |
| **状态管理** | Zustand 4 | 轻量级、高效的状态管理 |
| **UI 组件** | Ant Design 5 | 企业级 UI 组件库 |
| **拖拽框架** | @dnd-kit/core | 现代拖拽功能库 |
| **本地存储** | Dexie.js (IndexedDB) | 浏览器端数据持久化 |
| **后端框架** | Node.js + Express + ts-node | 简洁高效的 API 服务 |
| **数据库** | SQLite | 开发数据持久化存储 |
| **ORM** | Prisma | 现代 ORM 解决方案 |
| **API 风格** | RESTful | 简洁的 API 设计 |
| **实时协作** | WebSocket + Yjs (CRDT) | 分布式实时同步 |

### 2.2 系统架构图

```
┌─────────────────────────────────────────────────────────────┐
│                      Client (Browser)                       │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│  │  Canvas │  │ Toolbar │  │ Property│  │ Explorer│        │
│  │  Editor │  │   Bar   │  │  Panel  │  │  Panel  │        │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘        │
│       └────────────┴────────────┴────────────┘              │
│                         │                                   │
│                    ┌────┴────┐        ┌─────────┐          │
│                    │  Store  │        │ IndexedDB│          │
│                    │(Zustand)│        │ (Dexie) │          │
│                    └────┬────┘        └─────────┘          │
└─────────────────────────┼───────────────────────────────────┘
                          │ HTTP/WebSocket + Yjs (CRDT)
┌─────────────────────────┼───────────────────────────────────┐
│                    Server (Node.js + Express)              │
├─────────────────────────┼───────────────────────────────────┤
│                         │                                   │
│  ┌──────────┐  ┌────────┴────┐  ┌──────────┐               │
│  │  Auth    │  │    API     │  │  DDL     │               │
│  │  Service │  │   Router   │  │ Generator│               │
│  └──────────┘  └─────────────┘  └──────────┘               │
│                         │                                   │
│  ┌──────────┐  ┌────────┴────┐  ┌──────────┐               │
│  │ Project  │  │   Version  │  │   User   │               │
│  │  Service │  │   Service  │  │  Service │               │
│  └──────────┘  └─────────────┘  └──────────┘               │
│                         │                                   │
│                    ┌────┴────┐                              │
│                    │ Database│ (SQLite + Prisma)            │
│                    └─────────┘                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. 功能模块设计

### 3.1 模块结构

```
client/src/
├── components/          # UI 组件
│   ├── Canvas.tsx       # 画布编辑组件
│   ├── TableNode.tsx    # 表节点组件
│   ├── TableEditor.tsx  # 表编辑器
│   ├── ProjectList.tsx  # 项目列表
│   ├── SettingsTab.tsx  # 设置标签页
│   ├── VersionManagementTab.tsx  # 版本管理
│   ├── ProjectMemberTab.tsx      # 项目成员管理
│   ├── TeamManagementTab.tsx     # 团队管理
│   ├── ImportExportTab.tsx       # 导入导出
│   ├── LoginPage.tsx   # 登录页面
│   └── ...
├── ddl/                 # DDL 生成器
│   ├── MySQLGenerator.ts
│   ├── PostgreSQLGenerator.ts
│   ├── SQLiteGenerator.ts
│   ├── SQLServerGenerator.ts
│   ├── OracleGenerator.ts
│   └── DDLGeneratorFactory.ts
├── hooks/               # 自定义 Hooks
│   └── useCRDT.ts       # CRDT 协作 Hook
├── providers/           # Context Providers
│   └── CollabProvider.tsx  # 协作上下文
├── services/            # 服务层
│   ├── api.ts           # API 服务
│   ├── localStorageService.ts  # 本地存储
│   ├── collabService.ts # 协作服务
│   ├── importService.ts # 导入服务
│   └── exportService.ts # 导出服务
├── stores/              # Zustand 状态管理
│   └── appStore.ts      # 全局状态
├── theme/               # 主题配置
│   ├── ThemeProvider.tsx
│   ├── themes.ts
│   └── useTheme.ts
├── types/               # TypeScript 类型定义
│   └── index.ts
├── App.tsx              # 应用入口组件
└── main.tsx             # 应用入口

server/src/
├── controllers/         # API 控制器
├── services/            # 业务逻辑层
├── routes/              # API 路由
├── types/               # DTO 类型定义
├── generators/          # DDL 生成器
├── middleware/          # 中间件
├── ws/                  # WebSocket 服务
└── server.ts            # 服务器入口
```

### 3.2 核心模块说明

#### 3.2.1 画布编辑模块 (Canvas)
- 支持无限画布、缩放、拖拽
- 表节点的自由布局
- 多选、批量操作
- 网格对齐、辅助线
- 撤销/重做功能

#### 3.2.2 表设计模块 (Table)
- 创建、编辑、删除表
- 字段管理（增删改查）
- 主键设置
- 索引设计
- 字段拖拽排序

#### 3.2.3 关系设计模块 (Relationship)
- 可视化外键关系创建
- 一对一、一对多、多对多关系
- 关系线样式自定义
- 循环依赖检测
- 关系基数设置

#### 3.2.4 DDL 生成模块 (DDL Generator)
- MySQL DDL 生成
- PostgreSQL DDL 生成
- SQLite DDL 生成
- SQL Server DDL 生成
- 增量 DDL 生成（ALTER）
- DDL 预览与导出

---

## 4. 数据模型设计

### 4.1 核心实体

#### 4.1.1 Project (项目)
```typescript
interface Project {
  id: string;              // UUID
  name: string;            // 项目名称
  description?: string;    // 项目描述
  databaseType: DatabaseType; // 目标数据库类型
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;       // 创建人
  version: number;         // 版本号
  status: ProjectStatus;   // 草稿/已发布
}
```

#### 4.1.2 Table (表)
```typescript
interface Table {
  id: string;              // UUID
  projectId: string;        // 所属项目ID
  name: string;             // 表名
  comment?: string;         // 表注释
  columns: Column[];        // 字段列表
  indexes: Index[];         // 索引列表
  position: Position;       // 画布位置
  createdAt: Date;
  updatedAt: Date;
}
```

#### 4.1.3 Column (字段)
```typescript
interface Column {
  id: string;              // UUID
  tableId: string;         // 所属表ID
  name: string;            // 字段名
  dataType: string;        // 数据类型
  length?: number;         // 长度
  precision?: number;      // 精度
  scale?: number;          // 小数位
  nullable: boolean;       // 是否可空
  defaultValue?: any;      // 默认值
  autoIncrement: boolean; // 是否自增
  primaryKey: boolean;     // 是否主键
  unique: boolean;         // 是否唯一
  comment?: string;        // 字段注释
  order: number;           // 排序顺序
}
```

#### 4.1.4 Relationship (关系)
```typescript
interface Relationship {
  id: string;              // UUID
  projectId: string;       // 所属项目ID
  name?: string;           // 关系名称
  sourceTableId: string;   // 源表ID
  sourceColumnId: string;  // 源字段ID
  targetTableId: string;   // 目标表ID
  targetColumnId: string;  // 目标字段ID
  relationshipType: 'one-to-one' | 'one-to-many' | 'many-to-many';
  onUpdate: ReferentialAction; // 更新时动作
  onDelete: ReferentialAction; // 删除时动作
}

type ReferentialAction = 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION' | 'SET DEFAULT';
```

#### 4.1.5 Index (索引)
```typescript
interface Index {
  id: string;              // UUID
  tableId: string;         // 所属表ID
  name: string;           // 索引名
  columns: string[];      // 索引字段ID列表
  unique: boolean;         // 是否唯一索引
  type: 'BTREE' | 'HASH' | 'FULLTEXT'; // 索引类型
}
```

---

## 5. API 接口设计

### 5.1 项目管理

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/projects | 获取项目列表 |
| POST | /api/projects | 创建项目 |
| GET | /api/projects/:id | 获取项目详情 |
| PUT | /api/projects/:id | 更新项目 |
| DELETE | /api/projects/:id | 删除项目 |
| POST | /api/projects/:id/duplicate | 复制项目 |

### 5.2 表管理

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/projects/:projectId/tables | 获取表列表 |
| POST | /api/projects/:projectId/tables | 创建表 |
| GET | /api/projects/:projectId/tables/:id | 获取表详情 |
| PUT | /api/projects/:projectId/tables/:id | 更新表 |
| DELETE | /api/projects/:projectId/tables/:id | 删除表 |
| POST | /api/projects/:projectId/tables/batch | 批量创建表 |

### 5.3 关系管理

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/projects/:projectId/relationships | 获取关系列表 |
| POST | /api/projects/:projectId/relationships | 创建关系 |
| PUT | /api/projects/:projectId/relationships/:id | 更新关系 |
| DELETE | /api/projects/:projectId/relationships/:id | 删除关系 |

### 5.4 DDL 操作

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | /api/projects/:projectId/ddl/generate | 生成完整 DDL |
| POST | /api/projects/:projectId/ddl/diff | 生成增量 DDL |
| POST | /api/projects/:projectId/ddl/validate | 验证 DDL 语法 |
| POST | /api/projects/:projectId/ddl/format | 格式化 DDL |

### 5.5 版本管理

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/projects/:projectId/versions | 获取版本列表 |
| POST | /api/projects/:projectId/versions | 创建版本 |
| GET | /api/projects/:projectId/versions/:versionId | 获取版本详情 |
| POST | /api/projects/:projectId/versions/:versionId/restore | 恢复版本 |

---

## 6. 数据库 Schema (Prisma)

```prisma
datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}

generator client {
  provider = "prisma-client-js"
}

model Project {
  id                   String   @id @default(cuid())
  name                 String
  description          String?
  databaseType         String   @default("MYSQL")
  status               String   @default("DRAFT")
  version              Int      @default(1)
  collaborationEnabled Boolean  @default(false)
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
  createdBy            String   @default("system")
  
  tables         Table[]
  relationships  Relationship[]
  versions       Version[]
  teamProjects   TeamProject[]
  projectMembers ProjectMember[]
  invites        Invite[]
  branches       Branch[]
  gitConfigs     GitConfig[]
  
  @@index([createdBy])
  @@index([status])
}

model Table {
  id        String   @id @default(cuid())
  projectId String
  name      String
  comment   String?
  positionX Float    @default(0)
  positionY Float    @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  project  Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  columns  Column[]
  indexes  Index[]
  
  @@index([projectId])
}

model Column {
  id           String   @id @default(cuid())
  tableId      String
  name         String
  dataType     String   @default("VARCHAR")
  length       Int?
  precision    Int?
  scale        Int?
  nullable     Boolean  @default(true)
  defaultValue String?
  autoIncrement Boolean @default(false)
  primaryKey   Boolean  @default(false)
  unique       Boolean  @default(false)
  comment      String?
  order        Int      @default(0)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  table Table @relation(fields: [tableId], references: [id], onDelete: Cascade)
  
  @@index([tableId])
}

model Relationship {
  id              String   @id @default(cuid())
  projectId       String
  name            String?
  sourceTableId   String
  sourceColumnId  String
  targetTableId   String
  targetColumnId  String
  relationshipType String   @default("ONE_TO_MANY")
  onUpdate        String   @default("CASCADE")
  onDelete        String   @default("CASCADE")
  createdAt       DateTime @default(now())
  
  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  
  @@index([projectId])
  @@index([sourceTableId])
  @@index([targetTableId])
}

model Index {
  id      String   @id @default(cuid())
  tableId String
  name    String
  columns String   @default("[]")
  unique  Boolean  @default(false)
  type    String   @default("BTREE")
  
  table Table @relation(fields: [tableId], references: [id], onDelete: Cascade)
  
  @@index([tableId])
}

model Version {
  id        String   @id @default(cuid())
  projectId String
  branchId  String?
  version   Int
  name      String
  comment   String?
  data      String   @default("{}")
  createdAt DateTime @default(now())
  
  project Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  branch  Branch?  @relation(fields: [branchId], references: [id], onDelete: SetNull)
  
  @@unique([projectId, version])
}

model Branch {
  id          String   @id @default(cuid())
  projectId   String
  name        String
  description String?
  isDefault   Boolean  @default(false)
  isActive    Boolean  @default(true)
  parentId    String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  project  Project   @relation(fields: [projectId], references: [id], onDelete: Cascade)
  versions Version[]
  parent   Branch?   @relation("BranchParent", fields: [parentId], references: [id], onDelete: SetNull)
  children Branch[]  @relation("BranchParent")
  
  @@index([projectId])
  @@index([isActive])
}

model GitConfig {
  id             String   @id @default(cuid())
  projectId      String   @unique
  enabled        Boolean  @default(false)
  repositoryUrl  String?
  branch         String   @default("main")
  username       String?
  token          String?
  sshKeyPath     String?
  autoCommit     Boolean  @default(false)
  autoPush       Boolean  @default(false)
  commitMessageTemplate String  @default("Update: {{version}}")
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  
  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
}

model ConnectionConfig {
  id            String   @id @default(cuid())
  name          String
  databaseType  String   @default("MYSQL")
  host          String   @default("localhost")
  port          Int      @default(3306)
  databaseName  String
  username      String
  password      String
  sslEnabled    Boolean  @default(false)
  description   String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@index([name])
}

model User {
  id        String   @id @default(cuid())
  username  String   @unique
  email     String   @unique
  password  String
  displayName String?
  avatar    String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  teamMembers     TeamMember[]
  ownedTeams      Team[] @relation("TeamOwner")
  projectMembers  ProjectMember[]
  sessions        UserSession[]
  settings        UserSettings?
  
  @@index([username])
  @@index([email])
}

model Team {
  id          String   @id @default(cuid())
  name        String
  description String?
  avatar      String?
  ownerId     String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  owner       User         @relation("TeamOwner", fields: [ownerId], references: [id], onDelete: Cascade)
  members     TeamMember[]
  projects    TeamProject[]
  
  @@index([ownerId])
}

model TeamMember {
  id        String   @id @default(cuid())
  teamId    String
  userId    String
  role      String   @default("member")
  joinedAt  DateTime @default(now())
  
  team      Team     @relation(fields: [teamId], references: [id], onDelete: Cascade)
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([teamId, userId])
  @@index([teamId])
  @@index([userId])
}

model TeamProject {
  id        String   @id @default(cuid())
  teamId    String
  projectId String
  createdAt DateTime @default(now())
  
  team      Team    @relation(fields: [teamId], references: [id], onDelete: Cascade)
  project   Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  
  @@unique([teamId, projectId])
  @@index([teamId])
  @@index([projectId])
}

model OperationRecord {
  id           String   @id @default(cuid())
  projectId    String
  userId       String
  userName     String
  operationType String
  targetType   String
  targetId     String
  targetName   String
  changes      String?
  timestamp    DateTime @default(now())
  
  @@index([projectId])
  @@index([userId])
  @@index([timestamp])
  @@index([operationType])
  @@index([targetType])
}

model ProjectMember {
  id        String   @id @default(cuid())
  projectId String
  userId    String
  role      String   @default("viewer")
  joinedAt  DateTime @default(now())
  
  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([projectId, userId])
  @@index([projectId])
  @@index([userId])
}

model UserSession {
  id           String   @id @default(cuid())
  userId       String
  token        String   @unique
  deviceName   String?
  ipAddress    String?
  userAgent    String?
  loginTime    DateTime @default(now())
  lastActiveAt DateTime @default(now())
  isActive     Boolean  @default(true)
  
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId])
  @@index([token])
  @@index([isActive])
  @@index([loginTime])
}

model UserSettings {
  id                 String   @id @default(cuid())
  userId             String   @unique
  maxActiveSessions  Int      @default(1)
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
  
  user               User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Invite {
  id          String   @id @default(cuid())
  code        String   @unique
  projectId   String
  role        String   @default("editor")
  maxUses     Int      @default(1)
  usedCount   Int      @default(0)
  createdBy   String
  createdAt   DateTime @default(now())
  expiresAt   DateTime
  isActive    Boolean  @default(true)
  
  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  
  @@index([code])
  @@index([projectId])
  @@index([expiresAt])
}
```

---

## 7. DDL 生成器设计

### 7.1 生成器接口

```typescript
interface IDDLGenerator {
  generateCreateTable(table: Table): string;
  generateAlterTable(table: Table, oldTable: Table): string;
  generateDropTable(tableName: string): string;
  generateCreateIndex(index: Index): string;
  generateCreateRelationship(relationship: Relationship): string;
}

interface DDLOptions {
  databaseType: DatabaseType;
  schema?: string;
  tablePrefix?: string;
  includeComments: boolean;
  formatSql: boolean;
  uppercaseKeywords: boolean;
}
```

### 7.2 MySQL DDL 示例

```typescript
class MySQLDDLGenerator implements IDDLGenerator {
  generateCreateTable(table: Table): string {
    const columns = table.columns.map(col => {
      let sql = `  ${col.name} ${this.mapDataType(col)}`;
      if (!col.nullable) sql += ' NOT NULL';
      if (col.autoIncrement) sql += ' AUTO_INCREMENT';
      if (col.defaultValue) sql += ` DEFAULT ${col.defaultValue}`;
      if (col.comment) sql += ` COMMENT '${col.comment}'`;
      return sql;
    });
    
    // 主键
    const pkColumns = table.columns.filter(c => c.primaryKey);
    if (pkColumns.length > 0) {
      columns.push(`  PRIMARY KEY (${pkColumns.map(c => c.name).join(', ')})`);
    }
    
    return `CREATE TABLE \`${table.name}\` (\n${columns.join(',\n')}\n);`;
  }
  
  private mapDataType(column: Column): string {
    const typeMap = {
      'INT': 'INT',
      'VARCHAR': `VARCHAR(${column.length || 255})`,
      'TEXT': 'TEXT',
      'DATE': 'DATE',
      'DATETIME': 'DATETIME',
      'DECIMAL': `DECIMAL(${column.precision || 10},${column.scale || 2})`,
      'BOOLEAN': 'TINYINT(1)',
      'JSON': 'JSON',
    };
    return typeMap[column.dataType] || column.dataType;
  }
}
```

---

## 8. 图形引擎设计

### 8.1 React Flow 节点定义

```typescript
interface TableNodeData {
  table: Table;
  selected: boolean;
  onEditTable: (tableId: string) => void;
  onDeleteTable: (tableId: string) => void;
  onAddColumn: (tableId: string) => void;
}

// 自定义表节点组件
const TableNode: Node<TableNodeData> = ({ data, selected }) => {
  return (
    <div className={`table-node ${selected ? 'selected' : ''}`}>
      <div className="table-header">
        <span className="table-name">{data.table.name}</span>
        {data.table.comment && <span className="table-comment">{data.table.comment}</span>}
      </div>
      <div className="table-columns">
        {data.table.columns.map(column => (
          <div key={column.id} className="column-row">
            <span className={`column-type ${column.primaryKey ? 'pk' : ''}`}>
              {column.primaryKey ? '🔑' : ''} {column.dataType}
            </span>
            <span className="column-name">{column.name}</span>
            {column.nullable && <span className="column-nullable">?</span>}
          </div>
        ))}
      </div>
    </div>
  );
};
```

### 8.2 画布状态管理

```typescript
interface CanvasState {
  // 节点管理
  nodes: Node<TableNodeData>[];
  edges: Edge[];
  
  // 视图状态
  zoom: number;
  panPosition: { x: number; y: number };
  
  // 选择状态
  selectedNodeIds: string[];
  selectedEdgeIds: string[];
  
  // 操作
  addTable: (table: Table) => void;
  updateTable: (tableId: string, updates: Partial<Table>) => void;
  deleteTable: (tableId: string) => void;
  addRelationship: (source: string, target: string) => void;
  
  // 布局
  autoLayout: () => void;
  fitView: () => void;
  
  // 撤销/重做
  undo: () => void;
  redo: () => void;
}
```

---

## 9. 状态管理设计 (Zustand)

### 9.1 Store 结构

```typescript
// 项目 Store
interface ProjectStore {
  currentProject: Project | null;
  projects: Project[];
  loading: boolean;
  
  loadProjects: () => Promise<void>;
  createProject: (data: CreateProjectDTO) => Promise<Project>;
  updateProject: (id: string, data: UpdateProjectDTO) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
}

// 设计 Store
interface DesignStore {
  tables: Map<string, Table>;
  relationships: Map<string, Relationship>;
  
  // 表操作
  addTable: (table: Table) => void;
  updateTable: (id: string, updates: Partial<Table>) => void;
  deleteTable: (id: string) => void;
  
  // 字段操作
  addColumn: (tableId: string, column: Column) => void;
  updateColumn: (tableId: string, columnId: string, updates: Partial<Column>) => void;
  deleteColumn: (tableId: string, columnId: string) => void;
  
  // 关系操作
  addRelationship: (relationship: Relationship) => void;
  updateRelationship: (id: string, updates: Partial<Relationship>) => void;
  deleteRelationship: (id: string) => void;
  
  // 工具方法
  getTableById: (id: string) => Table | undefined;
  getRelationshipsByTableId: (tableId: string) => Relationship[];
  validateDesign: () => ValidationResult[];
}

// UI Store
interface UIStore {
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  activeTab: 'design' | 'ddl' | 'doc';
  
  selectedTableId: string | null;
  selectedColumnId: string | null;
  
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  setActiveTab: (tab: 'design' | 'ddl' | 'doc') => void;
  selectTable: (tableId: string | null) => void;
}
```

---

## 10. 目录结构

```
databases/
├── client/                    # 前端项目
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   ├── Canvas/
│   │   │   │   ├── Canvas.tsx
│   │   │   │   ├── TableNode.tsx
│   │   │   │   └── RelationshipEdge.tsx
│   │   │   ├── TableEditor/
│   │   │   │   ├── TableEditor.tsx
│   │   │   │   ├── ColumnEditor.tsx
│   │   │   │   └── IndexEditor.tsx
│   │   │   ├── Toolbar/
│   │   │   │   └── Toolbar.tsx
│   │   │   ├── DDLPreview/
│   │   │   │   └── DDLPreview.tsx
│   │   │   └── common/
│   │   ├── modules/
│   │   ├── hooks/
│   │   ├── stores/
│   │   ├── services/
│   │   ├── types/
│   │   ├── utils/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
│
├── server/                    # 后端项目
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── projectController.ts
│   │   │   ├── tableController.ts
│   │   │   └── ddlController.ts
│   │   ├── services/
│   │   │   ├── projectService.ts
│   │   │   ├── tableService.ts
│   │   │   └── ddlService.ts
│   │   ├── generators/
│   │   │   ├── MySQLGenerator.ts
│   │   │   ├── PostgreSQLGenerator.ts
│   │   │   └── SQLiteGenerator.ts
│   │   ├── routes/
│   │   ├── middlewares/
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   ├── app.ts
│   │   └── server.ts
│   ├── package.json
│   └── tsconfig.json
│
├── docs/                      # 文档
│   ├── API.md
│   └── GUIDE.md
│
└── README.md
```

---

## 11. 开发计划

### Phase 1: 基础功能 (MVP) ✅ 已完成
- [x] 项目管理（CRUD）
- [x] 表设计（创建、编辑、删除）
- [x] 字段设计（增删改查）
- [x] 基础画布展示
- [x] MySQL DDL 生成
- [x] PostgreSQL DDL 生成
- [x] SQLite DDL 生成
- [x] SQL Server DDL 生成
- [x] Oracle DDL 生成

### Phase 2: 关系设计 ✅ 已完成
- [x] 可视化关系创建
- [x] 关系线展示
- [x] 外键关系管理
- [x] 多数据库 DDL 生成

### Phase 3: 高级功能
- [x] 索引设计
- [x] 版本管理
- [x] 逆向工程（数据库连接与导入）
- [x] 增量 DDL 生成
- [x] 分支管理功能
- [x] Git 配置集成

### Phase 4: 协作功能
- [x] 用户认证
- [x] 团队协作（基础版）
- [x] 权限管理（owner/editor/viewer）
- [x] 实时同步（Yjs + CRDT）

---

## 12. 技术选型理由

| 技术 | 理由 |
|------|------|
| **React 18 + TypeScript + Vite** | 成熟稳定，类型安全，构建快，生态丰富 |
| **React Flow 11** | 专为关系图设计，支持自定义节点和边 |
| **Zustand 4** | 比 Redux 轻量，API 简洁，TypeScript 支持好 |
| **Ant Design 5** | 组件丰富，企业级体验 |
| **Node.js + Express + ts-node** | 高并发，适合 I/O 密集型操作 |
| **Prisma** | 类型安全的 ORM，迁移方便 |
| **SQLite** | 轻量级，零配置，适合开发和单用户场景 |
| **Dexie.js (IndexedDB)** | 浏览器端本地存储，支持离线模式 |
| **Yjs (CRDT)** | 分布式实时同步，支持离线编辑和自动合并 |
| **WebSocket** | 实时协作通信 |

---

## 附录 A: 数据类型映射表

### MySQL 数据类型映射

| 通用类型 | MySQL 类型 | 默认长度 |
|----------|------------|----------|
| INT | INT | - |
| BIGINT | BIGINT | - |
| VARCHAR | VARCHAR | 255 |
| TEXT | TEXT | - |
| BOOLEAN | TINYINT(1) | - |
| DATE | DATE | - |
| DATETIME | DATETIME | - |
| TIMESTAMP | TIMESTAMP | - |
| DECIMAL | DECIMAL | 10,2 |
| JSON | JSON | - |
| BLOB | BLOB | - |

### PostgreSQL 数据类型映射

| 通用类型 | PostgreSQL 类型 | 默认长度 |
|----------|-----------------|----------|
| INT | INTEGER | - |
| BIGINT | BIGINT | - |
| VARCHAR | VARCHAR | 255 |
| TEXT | TEXT | - |
| BOOLEAN | BOOLEAN | - |
| DATE | DATE | - |
| DATETIME | TIMESTAMP | - |
| TIMESTAMP | TIMESTAMP | - |
| DECIMAL | DECIMAL | 10,2 |
| JSON | JSONB | - |
| UUID | UUID | - |
| SERIAL | SERIAL | - |

---

## 附录 B: 键盘快捷键

| 操作 | 快捷键 |
|------|--------|
| 新建表 | Ctrl + T |
| 保存 | Ctrl + S |
| 撤销 | Ctrl + Z |
| 重做 | Ctrl + Shift + Z |
| 删除选中 | Delete |
| 全选 | Ctrl + A |
| 缩放至适应 | Ctrl + 0 |
| 放大 | Ctrl + + |
| 缩小 | Ctrl + - |
| 复制 | Ctrl + C |
| 粘贴 | Ctrl + V |
| 查找 | Ctrl + F |

---

**文档版本**: v1.0  
**创建日期**: 2026-05-04  
**最后更新**: 2026-05-04
