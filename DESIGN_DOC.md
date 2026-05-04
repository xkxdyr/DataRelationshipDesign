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
| **前端框架** | React 18 + TypeScript | 更好的类型安全和开发体验 |
| **图形引擎** | React Flow | 专业的关系图可视化库 |
| **状态管理** | Zustand | 轻量级、高效的状态管理 |
| **UI 组件** | Ant Design 5 | 企业级 UI 组件库 |
| **拖拽框架** | dnd-kit | 现代拖拽功能库 |
| **后端框架** | Node.js + Express | 简洁高效的 API 服务 |
| **数据库** | SQLite (本地) / PostgreSQL | 数据持久化存储 |
| **ORM** | Prisma | 现代 ORM 解决方案 |
| **API 风格** | RESTful + GraphQL | 灵活的 API 设计 |

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
│                    ┌────┴────┐                              │
│                    │  Store  │ (Zustand)                     │
│                    └────┬────┘                              │
└─────────────────────────┼───────────────────────────────────┘
                          │ HTTP/WebSocket
┌─────────────────────────┼───────────────────────────────────┐
│                    Server (Node.js)                         │
├─────────────────────────┼───────────────────────────────────┤
│                         │                                   │
│  ┌──────────┐  ┌────────┴────┐  ┌──────────┐               │
│  │  Auth    │  │    API     │  │  DDL     │               │
│  │  Service │  │   Gateway  │  │ Generator│               │
│  └──────────┘  └─────────────┘  └──────────┘               │
│                         │                                   │
│  ┌──────────┐  ┌────────┴────┐  ┌──────────┐               │
│  │ Project  │  │   Version  │  │   Sync   │               │
│  │  Service │  │   Service  │  │  Service │               │
│  └──────────┘  └─────────────┘  └──────────┘               │
│                         │                                   │
│                    ┌────┴────┐                              │
│                    │ Database│ (PostgreSQL)                 │
│                    └─────────┘                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. 功能模块设计

### 3.1 模块结构

```
src/
├── modules/
│   ├── canvas/           # 画布编辑模块
│   │   ├── components/  # 画布组件
│   │   ├── hooks/       # 画布相关 hooks
│   │   └── stores/      # 画布状态管理
│   ├── table/           # 表设计模块
│   │   ├── components/  # 表组件
│   │   ├── hooks/       # 表操作逻辑
│   │   └── stores/      # 表状态管理
│   ├── relationship/    # 关系设计模块
│   │   ├── components/  # 关系组件
│   │   ├── hooks/       # 关系逻辑
│   │   └── stores/      # 关系状态管理
│   ├── ddl/             # DDL 生成模块
│   │   ├── generator/   # 各数据库 DDL 生成器
│   │   └── parser/      # SQL 解析器
│   ├── collaboration/  # 协作模块
│   │   ├── hooks/       # 协作相关 hooks
│   │   └── services/    # 实时协作服务
│   └── settings/        # 设置模块
│
├── components/          # 公共组件
├── hooks/               # 公共 hooks
├── services/            # API 服务
├── stores/              # 全局状态
├── types/               # TypeScript 类型定义
├── utils/               # 工具函数
└── constants/           # 常量定义
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
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model Project {
  id           String   @id @default(uuid())
  name         String
  description  String?
  databaseType DatabaseType
  status       ProjectStatus @default(DRAFT)
  version      Int      @default(1)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  createdBy    String
  
  tables        Table[]
  relationships Relationship[]
  versions      Version[]
  
  @@index([createdBy])
  @@index([status])
}

model Table {
  id        String   @id @default(uuid())
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
  id           String   @id @default(uuid())
  tableId      String
  name         String
  dataType     String
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
  id              String   @id @default(uuid())
  projectId       String
  name            String?
  sourceTableId   String
  sourceColumnId  String
  targetTableId   String
  targetColumnId  String
  relationshipType RelationshipType
  onUpdate        ReferentialAction @default(CASCADE)
  onDelete        ReferentialAction @default(CASCADE)
  createdAt       DateTime @default(now())
  
  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  
  @@index([projectId])
  @@index([sourceTableId])
  @@index([targetTableId])
}

model Index {
  id      String   @id @default(uuid())
  tableId String
  name    String
  columns String[] // JSON array of column IDs
  unique  Boolean  @default(false)
  type    IndexType @default(BTREE)
  
  table Table @relation(fields: [tableId], references: [id], onDelete: Cascade)
  
  @@index([tableId])
}

model Version {
  id        String   @id @default(uuid())
  projectId String
  version   Int
  name      String
  comment   String?
  data      Json     // 完整的项目快照
  createdAt DateTime @default(now())
  
  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  
  @@unique([projectId, version])
}

enum DatabaseType {
  MYSQL
  POSTGRESQL
  SQLITE
  SQLSERVER
  ORACLE
}

enum ProjectStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}

enum RelationshipType {
  ONE_TO_ONE
  ONE_TO_MANY
  MANY_TO_MANY
}

enum ReferentialAction {
  CASCADE
  SET_NULL
  RESTRICT
  NO_ACTION
  SET_DEFAULT
}

enum IndexType {
  BTREE
  HASH
  FULLTEXT
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

### Phase 1: 基础功能 (MVP)
- [ ] 项目管理（CRUD）
- [ ] 表设计（创建、编辑、删除）
- [ ] 字段设计（增删改查）
- [ ] 基础画布展示
- [ ] MySQL DDL 生成

### Phase 2: 关系设计
- [ ] 可视化关系创建
- [ ] 关系线展示
- [ ] 外键关系管理
- [ ] 多数据库 DDL 生成

### Phase 3: 高级功能
- [ ] 索引设计
- [ ] 版本管理
- [ ] 逆向工程
- [ ] 增量 DDL 生成

### Phase 4: 协作功能
- [ ] 用户认证
- [ ] 团队协作
- [ ] 权限管理
- [ ] 实时同步

---

## 12. 技术选型理由

| 技术 | 理由 |
|------|------|
| **React + TypeScript** | 成熟稳定，类型安全，生态丰富 |
| **React Flow** | 专为关系图设计，支持自定义节点和边 |
| **Zustand** | 比 Redux 轻量，API 简洁，TypeScript 支持好 |
| **Ant Design** | 组件丰富，企业级体验 |
| **Node.js + Express** | 高并发，适合 I/O 密集型操作 |
| **Prisma** | 类型安全的 ORM，迁移方便 |
| **PostgreSQL** | 支持 JSON，高可用，成熟稳定 |

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
