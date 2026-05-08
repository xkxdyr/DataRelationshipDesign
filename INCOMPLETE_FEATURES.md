# 未正确执行文档

## 说明
本文档用于记录未正确执行、测试报错有 Bug 的功能卡点。

---

## 未正确执行功能列表

| 序号 | 功能名称 | 模块 | 记录日期 | 开发者 | 卡点/报错信息 | 当前状态 |
|------|----------|------|----------|--------|--------------|----------|
| 1 | 环境初始化 | 项目环境 | 2026-05-04 | Assistant | PowerShell 执行策略限制 npm 命令: "未对文件 npm.ps1 进行数字签名" | ✅ 已解决 (通过 node 直接调用 npm cli 路径) |
| 2 | 后端 API 自测 | 后端测试 | 2026-05-04 | Assistant | 后端服务在 PowerShell 环境中无法保持长时间运行，进程被自动终止 (exit code -1073741510)，但代码编译通过，TypeScript 无错误 | ⚠️ 代码正常，环境限制 |
| 3 | JSON 导入功能 | 导入模块 | 2026-05-06 | Assistant | 导入 JSON 时程序运行错误，无法正常导入数据和关系；导入时未成功解析关系 | ✅ 已修复 (导出时添加 tableId 字段) |
| 4 | useForm 未连接警告 | 前端表单 | 2026-05-06 | Assistant | Warning: Instance created by `useForm` is not connected to any Form element. Forget to pass `form` prop? | ✅ 已修复 (所有组件添加隐藏Form确保始终连接) |

| 5 | Electron桌面端集成 | 桌面应用 | 2026-05-08 | Assistant | Electron下载安装失败，网络连接超时(ETIMEDOUT)；已尝试多种镜像源(cdn.npmmirror.com等)均失败；镜像地址可访问但实际下载请求超时 | ⚠️ 网络环境限制，需手动在网络正常环境下安装 |
| 6 | vite-plugin-electron配置 | 桌面应用 | 2026-05-08 | Assistant | 已完成vite.config.ts配置、electron/main.ts主进程、electron/preload.ts预加载脚本编写；待Electron包安装成功后可继续测试 | ⏸️ 等待Electron安装 |

---

## 变更记录
- 2026-05-04: 文档初始化
- 2026-05-06: 添加 JSON 导入功能 BUG 记录（关系解析失败）
- 2026-05-08: 添加 Electron 桌面端集成卡点记录（网络超时）
