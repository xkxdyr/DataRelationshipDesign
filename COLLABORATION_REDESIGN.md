# 实时协作系统重构设计文档

> 创建日期：2026-06-12
> 版本：v2.0
> 状态：设计中

---

## 一、问题诊断

### 1.1 当前实现的核心问题

#### 问题1：时序竞态问题（Critical）

**症状日志**：
```
collabService.ts:109 协作服务连接成功
collabService.ts:169 WebSocket 未连接
collabService.ts:143 协作服务连接关闭
```

**根本原因**：

1. **CollabProvider 的依赖链问题**：
   ```
   currentProject?.collaborationEnabled 变化
       ↓
   CollabProvider.useEffect 重新执行
       ↓
   清理函数调用 collabService.disconnect()
       ↓
   然后重新执行 connectToProject()
       ↓
   同时 isConnected 变化触发 useCRDT.useEffect
       ↓
   形成竞态条件
   ```

2. **useCRDT 的 enabled 依赖问题**：
   ```typescript
   const crdt = useCRDT({
     projectId: currentProject?.id || '',
     enabled: isConnected && !!currentProject,  // 依赖 isConnected
     ...
   })
   ```
   
   当 `isConnected` 从 false → true → false → true 变化时，`useCRDT` 的 useEffect 会多次初始化和清理。

**解决方案**：
- 分离连接状态与 CRDT 初始化状态
- 使用 Promise/状态机管理连接流程
- 避免 useEffect 依赖链导致的重复执行

---

#### 问题2：邀请码系统问题（High）

**当前实现**：
- 邀请码存储在内存 `inviteStore: Map<string, InviteCode>`
- 服务器重启后全部丢失
- 没有过期清理机制
- 只能使用一次

**重构方案**：
1. 新增 `Invite` 数据库模型
2. 支持多次使用（可配置）
3. 支持过期时间
4. 支持查看历史邀请记录
5. 支持撤销邀请

---

#### 问题3：CRDT 与数据库集成问题（Critical）

**当前问题**：
1. CRDT 文档从空开始，不从数据库加载
2. CRDT 更新不持久化到数据库
3. 本地操作不通过 CRDT 同步
4. 项目切换时 CRDT 状态混乱

**重构方案**：
1. 连接成功后先从数据库加载数据到 CRDT
2. CRDT 更新后定时持久化到数据库
3. 所有操作统一通过 CRDT 执行
4. 项目切换时正确清理和重建 CRDT 状态

---

#### 问题4：权限检查不完整（High）

**当前问题**：
- WebSocket 连接只检查 `collaborationEnabled`
- 不检查用户是否是项目成员
- 不检查用户角色权限

**重构方案**：
1. 连接时验证用户身份（JWT）
2. 检查用户是否有项目访问权限
3. 根据角色限制操作权限

---

## 二、架构设计

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                            前端层 (React)                            │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────────┐ │
│  │  UI 组件    │  │  Zustand    │  │      CollabManager          │ │
│  │  (Canvas)   │  │ (appStore)  │  │  (单例，管理协作生命周期)    │ │
│  └──────┬──────┘  └──────┬──────┘  └──────────────┬──────────────┘ │
│         │                 │                        │                │
│         └─────────────────┼────────────────────────┘                │
│                           │                                         │
│              ┌────────────▼────────────┐                           │
│              │      CollabProvider     │                           │
│              │   (Context Provider)    │                           │
│              └────────────┬────────────┘                           │
│                           │                                         │
└───────────────────────────┼─────────────────────────────────────────┘
                            │ WebSocket
┌───────────────────────────┼─────────────────────────────────────────┐
│                        后端层 (Express)                              │
├───────────────────────────┼─────────────────────────────────────────┤
│  ┌────────────────────────▼──────────────────────────────────────┐  │
│  │                    CollabWebSocketServer                      │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌──────────────────────┐  │  │
│  │  │  Auth验证   │  │  Room管理   │  │  消息路由/广播       │  │  │
│  │  └──────┬──────┘  └──────┬──────┘  └──────────┬───────────┘  │  │
│  │         │                 │                    │               │  │
│  │  ┌──────▼──────┐  ┌──────▼──────┐  ┌──────────▼───────────┐  │  │
│  │  │  CRDT文档   │  │  持久化服务 │  │  权限服务            │  │  │
│  │  │  Manager   │  │             │  │                      │  │  │
│  │  └─────────────┘  └─────────────┘  └──────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                              │                                       │
└──────────────────────────────┼───────────────────────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │      SQLite DB      │
                    │  (Prisma ORM)       │
                    └─────────────────────┘
```

---

### 2.2 协作生命周期状态机

```
                    ┌─────────────────────────────────────────────────┐
                    │                  IDLE (空闲)                    │
                    │  - 无当前项目或未启用协作                        │
                    └────────────────────┬────────────────────────────┘
                                         │
                    当前项目启用协作 ─────┘
                                         ▼
              ┌────────────────────────────────────────────────────────┐
              │                    CONNECTING (连接中)                  │
              │  - 验证用户身份和项目权限                                 │
              │  - 建立 WebSocket 连接                                   │
              └────────────────────┬───────────────────────────────────┘
                                   │
                      连接成功 ─────┘
                                   ▼
                    ┌──────────────────────────────────────────┐
                    │          INITIALIZING (初始化中)          │
                    │  - 从数据库加载数据到 CRDT                │
                    │  - 同步远程状态                           │
                    └─────────────────────┬────────────────────┘
                                          │
                       初始化完成 ─────────┘
                                          ▼
              ┌────────────────────────────────────────────────────────┐
              │                   CONNECTED (已连接)                    │
              │  - 实时同步操作                                           │
              │  - 处理用户加入/离开                                       │
              │  - 定时持久化                                              │
              └──────────────────────┬───────────────────────────────────┘
                                     │
                  项目切换/禁用协作 ─────┘
                                     ▼
                    ┌──────────────────────────────────────────┐
                    │           DISCONNECTING (断开中)          │
                    │  - 保存当前状态                           │
                    │  - 清理资源                               │
                    └─────────────────────┬────────────────────┘
                                          │
                               完成 ──────┘
                                          ▼
                                     IDLE
```

---

## 三、详细设计

### 3.1 前端重构

#### 3.1.1 单例协作管理器 (CollabManager)

**目的**：
- 避免 React useEffect 竞态条件
- 统一管理协作生命周期
- 提供稳定的 API

**设计**：
```typescript
type CollabState = 'idle' | 'connecting' | 'initializing' | 'connected' | 'disconnecting'

class CollabManager {
  private state: CollabState = 'idle'
  private currentProjectId: string | null = null
  private ws: WebSocket | null = null
  private doc: Y.Doc | null = null
  private reconnectAttempts = 0
  
  // 状态回调
  private onStateChange?: (state: CollabState) => void
  private onUsersChange?: (users: UserInfo[]) => void
  private onDataChange?: () => void
  private onError?: (error: Error) => void
  
  // 单例模式
  private static instance: CollabManager
  static getInstance(): CollabManager
  
  // 核心方法
  async connect(projectId: string, userId: string, userName: string): Promise<void>
  async disconnect(): Promise<void>
  
  // CRDT 操作（统一入口）
  createTable(table: TableData): void
  updateTable(tableId: string, updates: Partial<TableData>): void
  deleteTable(tableId: string): void
  // ... 其他操作
  
  // 获取当前数据
  getTables(): TableData[]
  getColumns(): ColumnData[]
  getRelationships(): RelationshipData[]
  getState(): CollabState
  getOnlineUsers(): UserInfo[]
}
```

---

#### 3.1.2 简化的 CollabProvider

**目的**：
- 将 CollabManager 注入 Context
- 提供 React hooks 访问
- 响应状态变化更新 UI

**设计**：
```typescript
interface CollabContextType {
  state: CollabState
  isConnected: boolean
  isReady: boolean
  onlineUsers: UserInfo[]
  
  // 操作方法
  createTable: (table: TableData) => void
  updateTable: (tableId: string, updates: Partial<TableData>) => void
  deleteTable: (tableId: string) => void
  // ...
}

function CollabProvider({ children }) {
  const [state, setState] = useState<CollabState>('idle')
  const [onlineUsers, setOnlineUsers] = useState<UserInfo[]>([])
  
  // 监听当前项目变化
  const { currentProject, currentUser } = useAppStore()
  
  useEffect(() => {
    const manager = CollabManager.getInstance()
    
    // 注册状态回调
    manager.onStateChange = setState
    manager.onUsersChange = setOnlineUsers
    manager.onDataChange = () => {
      // 同步数据到 Zustand 或直接从 manager 获取
    }
    
    return () => {
      manager.onStateChange = undefined
      manager.onUsersChange = undefined
      manager.onDataChange = undefined
    }
  }, [])
  
  // 根据项目状态管理连接
  useEffect(() => {
    const manager = CollabManager.getInstance()
    
    if (!currentProject || !currentUser) {
      manager.disconnect()
      return
    }
    
    const isLocal = currentProject.id.startsWith('local_')
    const shouldConnect = !isLocal && currentProject.collaborationEnabled
    
    if (shouldConnect && manager.getState() !== 'connected') {
      manager.connect(
        currentProject.id,
        currentUser.id,
        currentUser.displayName || currentUser.username
      )
    } else if (!shouldConnect && manager.getState() !== 'idle') {
      manager.disconnect()
    }
  }, [currentProject?.id, currentProject?.collaborationEnabled, currentUser?.id])
  
  // 提供 Context
  return (
    <CollabContext.Provider value={{
      state,
      isConnected: state === 'connected',
      isReady: state === 'connected' || state === 'initializing',
      onlineUsers,
      // 操作方法代理到 manager
      createTable: (t) => CollabManager.getInstance().createTable(t),
      // ...
    }}>
      {children}
    </CollabContext.Provider>
  )
}
```

---

### 3.2 后端重构

#### 3.2.1 数据库模型新增

```prisma
// 邀请码模型
model Invite {
  id          String   @id @default(cuid())
  code        String   @unique
  projectId   String
  project     Project  @relation(fields: [projectId], references: [id])
  role        String   @default("editor")  // owner, editor, viewer
  maxUses     Int      @default(1)         // 最大使用次数
  usedCount   Int      @default(0)         // 已使用次数
  createdBy   String
  createdAt   DateTime @default(now())
  expiresAt   DateTime
  isActive    Boolean  @default(true)
  
  @@index([code])
  @@index([projectId])
  @@index([expiresAt])
}
```

---

#### 3.2.2 连接认证流程

```
客户端                                           服务端
   │                                                 │
   │  1. GET /api/projects/:id/collaboration-status  │
   │ ──────────────────────────────────────────────>│
   │                                                 │
   │  2. 返回 collaborationEnabled                  │
   │ <──────────────────────────────────────────────│
   │                                                 │
   │  3. 如果启用，建立 WebSocket 连接               │
   │     ws://server/ws/collab                      │
   │     ?projectId=xxx&token=jwt                   │
   │ ──────────────────────────────────────────────>│
   │                                                 │
   │  4. 服务端验证:                                 │
   │     - JWT 验证用户身份                          │
   │     - 检查用户是否是项目成员                    │
   │     - 检查项目是否启用协作                      │
   │                                                 │
   │  5. 返回连接成功或错误                          │
   │ <──────────────────────────────────────────────│
   │                                                 │
   │  6. 服务端发送初始数据:                         │
   │     - 从数据库加载项目数据                       │
   │     - 序列化到 CRDT                             │
   │     - 发送 SYNC_RESPONSE                       │
   │ <──────────────────────────────────────────────│
   │                                                 │
```

---

#### 3.2.3 消息协议

```typescript
enum MessageType {
  // 连接管理
  CONNECTION_ACK = 'conn:ack',
  CONNECTION_ERROR = 'conn:error',
  
  // 用户管理
  USER_JOIN = 'user:join',
  USER_LEAVE = 'user:leave',
  USER_LIST = 'user:list',
  
  // 同步
  SYNC_REQUEST = 'sync:request',
  SYNC_RESPONSE = 'sync:response',
  
  // 操作
  OP_UPDATE = 'op:update',  // CRDT 更新
  
  // 心跳
  PING = 'system:ping',
  PONG = 'system:pong',
}

// 消息格式
interface CollabMessage {
  type: MessageType
  projectId: string
  userId: string
  data?: any
  timestamp: number
}
```

---

### 3.3 操作同步流程

#### 3.3.1 本地操作流程

```
用户在 Canvas 操作
        │
        ▼
调用 useCollab().createTable(table)
        │
        ▼
CollabManager.createTable(table)
        │
        ▼
┌──────────────────────────────┐
│ 检查协作状态:                 │
│ - idle: 直接操作本地数据      │
│ - connected: 通过 CRDT 操作  │
└──────────────────────────────┘
        │
   connected?
   ┌────┴────┐
   │         │
   ▼         ▼
  是         否
   │         │
   ▼         │
doc.transact  │
  创建数据    │
   │         │
   ▼         │
发送 OP_UPDATE
  消息       │
   │         │
   ▼         │
同步到远程   │
   │         │
   └────┬────┘
        │
        ▼
更新本地 UI
        │
        ▼
保存到 localStorage
```

---

#### 3.3.2 远程操作接收流程

```
收到 WebSocket OP_UPDATE 消息
        │
        ▼
CollabManager 处理
        │
        ▼
Y.applyUpdate(doc, update)
        │
        ▼
触发 doc 'update' 事件
        │
        ▼
同步数据到本地状态
        │
        ▼
更新 UI
        │
        ▼
保存到 localStorage
```

---

## 四、文件变更清单

### 4.1 新增文件

| 文件路径 | 说明 |
|---------|------|
| `client/src/managers/collabManager.ts` | 单例协作管理器 |
| `client/src/types/collab.ts` | 协作相关类型定义 |

### 4.2 修改文件

| 文件路径 | 修改内容 |
|---------|---------|
| `client/src/providers/CollabProvider.tsx` | 简化，使用 CollabManager |
| `client/src/hooks/useCRDT.ts` | 移除，功能合并到 CollabManager |
| `client/src/services/collabService.ts` | 简化，只负责 WebSocket 通信 |
| `client/src/components/EditProjectTab.tsx` | 优化协作模式切换逻辑 |
| `server/prisma/schema.prisma` | 添加 Invite 模型 |
| `server/src/controllers/inviteController.ts` | 持久化邀请码 |
| `server/src/ws/server.ts` | 添加 JWT 认证、权限检查、数据加载 |
| `server/src/ws/crdt.ts` | 持久化 CRDT 数据 |

---

## 五、开发步骤

### Phase 1：基础重构（P0）

1. ✅ 创建 `CollabManager` 单例
2. ✅ 重构 `CollabProvider` 使用 CollabManager
3. ✅ 简化 `collabService`
4. ✅ 移除 `useCRDT` hook

### Phase 2：后端完善（P0）

1. ✅ 添加 `Invite` 数据库模型
2. ✅ 重构邀请码控制器
3. ✅ WebSocket 添加 JWT 认证
4. ✅ 添加权限检查

### Phase 3：数据同步（P0）

1. ✅ 连接后从数据库加载数据到 CRDT
2. ✅ CRDT 更新持久化到数据库
3. ✅ 本地/云端操作统一通过 CRDT

### Phase 4：测试与验证（P1）

1. ✅ 协作模式开关测试
2. ✅ 多人同步测试
3. ✅ 邀请码测试
4. ✅ 权限测试

---

## 六、风险与注意事项

### 6.1 数据一致性

- 问题：CRDT 与数据库可能不一致
- 解决方案：
  - 每次连接时以数据库为准
  - 定时持久化（30秒）
  - 用户操作时即时持久化

### 6.2 离线支持

- 问题：用户断线后操作丢失
- 解决方案：
  - CRDT 自动合并
  - 断线后本地操作保存在 CRDT
  - 重连后自动同步

### 6.3 性能优化

- 问题：大项目 CRDT 文档大
- 解决方案：
  - 增量同步（只传差异）
  - 消息压缩
  - 操作批处理

---

## 七、验收标准

### 功能验收

1. ✅ 协作模式开关能正常切换
2. ✅ 切换后能实时连接/断开
3. ✅ 多人编辑能实时同步
4. ✅ 邀请码能正常生成和使用
5. ✅ 权限控制生效

### 技术验收

1. ✅ 无控制台错误
2. ✅ TypeScript 类型正确
3. ✅ 代码风格一致
4. ✅ 无内存泄漏

---

## 八、参考资料

- [Yjs 官方文档](https://docs.yjs.dev/)
- [WebSocket 规范](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [Prisma Schema 参考](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)
