import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import path from 'path'
import fs from 'fs'
import log from 'electron-log'

log.initialize()
log.transports.file.level = 'info'
log.transports.console.level = 'debug'

log.info('应用启动中...')

let mainWindow: BrowserWindow | null = null

const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL
const isDev = !!VITE_DEV_SERVER_URL

process.on('uncaughtException', (error) => {
  log.error('未捕获的异常:', error)
  dialog.showErrorBox('错误', `发生未知错误: ${error.message}`)
  app.exit(1)
})

process.on('unhandledRejection', (reason) => {
  log.error('未处理的Promise拒绝:', reason)
})

function createWindow() {
  log.info('创建主窗口...')

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
    show: false,
    backgroundColor: '#1e1e1e',
    titleBarStyle: 'default',
    autoHideMenuBar: false,
  })

  mainWindow.once('ready-to-show', () => {
    log.info('窗口准备就绪')
    mainWindow?.show()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  if (isDev) {
    log.info('开发模式: 连接到开发服务器', VITE_DEV_SERVER_URL)
    mainWindow.loadURL(VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    const indexPath = path.join(__dirname, '../dist/index.html')
    log.info('生产模式: 加载文件', indexPath)
    mainWindow.loadFile(indexPath)
  }

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    log.error('页面加载失败:', errorCode, errorDescription)
  })

  mainWindow.webContents.on('crashed', () => {
    log.error('渲染进程崩溃')
  })

  mainWindow.webContents.setWindowOpenHandling(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
}

function createMenu() {
  const { Menu, MenuItem } = require('electron')

  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: '文件',
      submenu: [
        {
          label: '新建项目',
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow?.webContents.send('menu-action', 'new-project'),
        },
        {
          label: '打开项目',
          accelerator: 'CmdOrCtrl+O',
          click: () => mainWindow?.webContents.send('menu-action', 'open-project'),
        },
        { type: 'separator' },
        {
          label: '保存',
          accelerator: 'CmdOrCtrl+S',
          click: () => mainWindow?.webContents.send('menu-action', 'save'),
        },
        { type: 'separator' },
        {
          label: '导入',
          submenu: [
            {
              label: '导入 JSON',
              click: () => mainWindow?.webContents.send('menu-action', 'import-json'),
            },
            {
              label: '导入 SQL',
              click: () => mainWindow?.webContents.send('menu-action', 'import-sql'),
            },
          ],
        },
        {
          label: '导出',
          submenu: [
            {
              label: '导出 JSON',
              click: () => mainWindow?.webContents.send('menu-action', 'export-json'),
            },
            {
              label: '导出 SQL',
              click: () => mainWindow?.webContents.send('menu-action', 'export-sql'),
            },
            {
              label: '导出 ER 图',
              click: () => mainWindow?.webContents.send('menu-action', 'export-er'),
            },
          ],
        },
        { type: 'separator' },
        { role: 'quit', label: '退出' },
      ],
    },
    {
      label: '编辑',
      submenu: [
        { role: 'undo', label: '撤销' },
        { role: 'redo', label: '重做' },
        { type: 'separator' },
        { role: 'cut', label: '剪切' },
        { role: 'copy', label: '复制' },
        { role: 'paste', label: '粘贴' },
        { role: 'delete', label: '删除' },
        { type: 'separator' },
        { role: 'selectAll', label: '全选' },
      ],
    },
    {
      label: '视图',
      submenu: [
        { role: 'reload', label: '刷新' },
        { role: 'forceReload', label: '强制刷新' },
        { role: 'toggleDevTools', label: '开发者工具' },
        { type: 'separator' },
        { role: 'resetZoom', label: '重置缩放' },
        { role: 'zoomIn', label: '放大' },
        { role: 'zoomOut', label: '缩小' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: '全屏' },
      ],
    },
    {
      label: '窗口',
      submenu: [
        { role: 'minimize', label: '最小化' },
        { role: 'zoom', label: '缩放' },
        { role: 'close', label: '关闭' },
      ],
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '关于',
          click: () => {
            dialog.showMessageBox({
              type: 'info',
              title: '关于',
              message: '数据库可视化设计工具',
              detail: '版本: 1.0.0\n专业的工业级数据库设计工具，支持可视化设计、关系管理和DDL导出。',
            })
          },
        },
        {
          label: '打开日志文件夹',
          click: () => {
            shell.openPath(path.dirname(log.transports.file.getFile().path))
          },
        },
      ],
    },
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

ipcMain.handle('show-open-dialog', async (event, options) => {
  log.info('打开文件对话框:', options)
  return dialog.showOpenDialog(mainWindow!, options)
})

ipcMain.handle('show-save-dialog', async (event, options) => {
  log.info('保存文件对话框:', options)
  return dialog.showSaveDialog(mainWindow!, options)
})

ipcMain.handle('show-message-box', async (event, options) => {
  log.info('消息框:', options)
  return dialog.showMessageBox(mainWindow!, options)
})

ipcMain.handle('read-file', async (event, filePath) => {
  log.info('读取文件:', filePath)
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    return { success: true, content }
  } catch (error: any) {
    log.error('读取文件失败:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('write-file', async (event, filePath, content) => {
  log.info('写入文件:', filePath)
  try {
    fs.writeFileSync(filePath, content, 'utf-8')
    return { success: true }
  } catch (error: any) {
    log.error('写入文件失败:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('get-app-path', async () => {
  return app.getPath('userData')
})

ipcMain.handle('get-version', async () => {
  return app.getVersion()
})

app.whenReady().then(() => {
  log.info('Electron应用就绪')
  createMenu()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  log.info('所有窗口已关闭')
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  log.info('应用即将退出')
})
