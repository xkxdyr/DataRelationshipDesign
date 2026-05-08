import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  showOpenDialog: (options: Electron.OpenDialogOptions) =>
    ipcRenderer.invoke('show-open-dialog', options),

  showSaveDialog: (options: Electron.SaveDialogOptions) =>
    ipcRenderer.invoke('show-save-dialog', options),

  showMessageBox: (options: Electron.MessageBoxOptions) =>
    ipcRenderer.invoke('show-message-box', options),

  readFile: (filePath: string) =>
    ipcRenderer.invoke('read-file', filePath),

  writeFile: (filePath: string, content: string) =>
    ipcRenderer.invoke('write-file', filePath, content),

  getAppPath: () =>
    ipcRenderer.invoke('get-app-path'),

  getVersion: () =>
    ipcRenderer.invoke('get-version'),

  onMenuAction: (callback: (action: string) => void) => {
    ipcRenderer.on('menu-action', (event, action) => callback(action))
  },

  removeMenuActionListener: () => {
    ipcRenderer.removeAllListeners('menu-action')
  },
})

declare global {
  interface Window {
    electronAPI: {
      showOpenDialog: (options: Electron.OpenDialogOptions) => Promise<Electron.OpenDialogReturnValue>
      showSaveDialog: (options: Electron.SaveDialogOptions) => Promise<Electron.SaveDialogReturnValue>
      showMessageBox: (options: Electron.MessageBoxOptions) => Promise<Electron.MessageBoxReturnValue>
      readFile: (filePath: string) => Promise<{ success: boolean; content?: string; error?: string }>
      writeFile: (filePath: string, content: string) => Promise<{ success: boolean; error?: string }>
      getAppPath: () => Promise<string>
      getVersion: () => Promise<string>
      onMenuAction: (callback: (action: string) => void) => void
      removeMenuActionListener: () => void
    }
  }
}
