import { contextBridge, ipcRenderer } from 'electron'
import { domReady, useLoading } from './utils'

// eslint-disable-next-line react-hooks/rules-of-hooks
const { appendLoading, removeLoading } = useLoading()

domReady().then(appendLoading)

contextBridge.exposeInMainWorld('electronAPI', {
  // Controles de ventana
  closeApp: () => ipcRenderer.send('close-me'),
  maximizeApp: () => ipcRenderer.send('maximize'),
  unmaximizeApp: () => ipcRenderer.send('unmaximize'),
  
  // Menú contextual
  showContextMenu: () => ipcRenderer.send('show-context-menu'),
  
  // IPC methods
  send: (channel: string, data?: any) => ipcRenderer.send(channel, data),
  invoke: (channel: string, data?: any) => ipcRenderer.invoke(channel, data),
  on: (channel: string, listener: (event: any, ...args: any[]) => void) => {
    ipcRenderer.on(channel, listener);
  },
  removeListener: (channel: string, listener: (event: any, ...args: any[]) => void) => {
    ipcRenderer.removeListener(channel, listener);
  },
  
  // Diálogos específicos
  exportWorkspace: (workspaceData: string) => ipcRenderer.invoke('export-workspace-dialog', workspaceData),
  importWorkspace: () => ipcRenderer.invoke('import-workspace-dialog'),
  showAbout: () => ipcRenderer.send('show-about-dialog')
})

setTimeout(removeLoading, 1000)
