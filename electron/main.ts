import { app, BrowserWindow, ipcMain, nativeImage, Menu, MenuItemConstructorOptions, dialog } from 'electron'
import path from 'node:path'
import fs from 'node:fs'

process.env.DIST = path.join(__dirname, '../dist')
process.env.PUBLIC = app.isPackaged ? process.env.DIST : path.join(process.env.DIST, '../public')

let win: BrowserWindow | null

const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL

function createWindow () {
  win = new BrowserWindow({
    icon: path.join(process.env.PUBLIC, 'jsrunner.png'),
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      devTools: true,
      nodeIntegration: false,
      contextIsolation: true
    }
  })
  
  // Handlers básicos de ventana
  ipcMain.on('close-me', () => {
    // Forzar el cierre de la aplicación
    app.exit(0)
  })
  ipcMain.on('maximize', () => {
    win?.maximize()
  })
  ipcMain.on('unmaximize', () => {
    win?.unmaximize()
  })

  // Handler para mostrar el menú contextual expandido
  ipcMain.on('show-context-menu', (event) => {
    const template: MenuItemConstructorOptions[] = [
      {
        label: 'Archivo',
        submenu: [
          {
            label: 'Templates',
            submenu: [
              {
                label: 'React Básico',
                click: () => { event.sender.send('context-menu-command', 'load-template-react-basic') }
              },
              {
                label: 'Manipulación DOM',
                click: () => { event.sender.send('context-menu-command', 'load-template-vanilla-dom') }
              },
              {
                label: 'Algoritmos Básicos',
                click: () => { event.sender.send('context-menu-command', 'load-template-algorithms') }
              },
              {
                label: 'API y Fetch',
                click: () => { event.sender.send('context-menu-command', 'load-template-api-fetch') }
              }
            ]
          },
          { type: 'separator' },
          {
            label: 'Guardar Todo',
            accelerator: 'CmdOrCtrl+Shift+S',
            click: () => { event.sender.send('context-menu-command', 'save-all-files') }
          },
          { type: 'separator' },
          {
            label: 'Exportar Workspace...',
            accelerator: 'CmdOrCtrl+E',
            click: () => { event.sender.send('context-menu-command', 'export-workspace') }
          },
          {
            label: 'Importar Workspace...',
            accelerator: 'CmdOrCtrl+I',
            click: () => { event.sender.send('context-menu-command', 'import-workspace') }
          }
        ]
      },
      {
        label: 'Herramientas',
        submenu: [
          {
            label: 'Variables de Entorno...',
            accelerator: 'CmdOrCtrl+Shift+E',
            click: () => { event.sender.send('context-menu-command', 'show-environment-variables') }
          },
          {
            label: 'Gestor de Paquetes NPM...',
            accelerator: 'CmdOrCtrl+Shift+P',
            click: () => { event.sender.send('context-menu-command', 'show-package-manager') }
          },
          { type: 'separator' },
          {
            label: 'Limpiar Historial de Ejecución',
            click: () => { event.sender.send('context-menu-command', 'clear-history') }
          },
          {
            label: 'Limpiar Resultados',
            accelerator: 'CmdOrCtrl+K',
            click: () => { event.sender.send('context-menu-command', 'clear-results') }
          }
        ]
      },
      {
        label: 'Vista',
        submenu: [
          {
            label: 'Cambiar Layout',
            accelerator: 'CmdOrCtrl+\\',
            click: () => { event.sender.send('context-menu-command', 'toggle-layout') }
          },
          {
            label: 'Configuración del Toolbar...',
            accelerator: 'CmdOrCtrl+,',
            click: () => { event.sender.send('context-menu-command', 'show-toolbar-settings') }
          },
          { type: 'separator' },
          {
            label: 'Recargar',
            accelerator: 'CmdOrCtrl+R',
            role: 'reload'
          },
          {
            label: 'Herramientas de Desarrollador',
            accelerator: 'F12',
            role: 'toggleDevTools'
          }
        ]
      },
      { type: 'separator' },
      {
        label: 'Acerca de JSRunner',
        click: () => { event.sender.send('context-menu-command', 'show-about') }
      }
    ]
    
    const menu = Menu.buildFromTemplate(template)
    menu.popup({ window: BrowserWindow.fromWebContents(event.sender) ?? undefined })
  })

  // Handler para importar workspace con diálogo de archivo
  ipcMain.handle('import-workspace-dialog', async () => {
    if (!win) return null

    const result = await dialog.showOpenDialog(win, {
      title: 'Importar Workspace',
      filters: [
        { name: 'Archivos JSON', extensions: ['json'] },
        { name: 'Todos los archivos', extensions: ['*'] }
      ],
      properties: ['openFile']
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    try {
      const filePath = result.filePaths[0]
      const fileContent = fs.readFileSync(filePath, 'utf-8')
      return fileContent
    } catch (error) {
      console.error('Error reading workspace file:', error)
      return null
    }
  })

  // Handler para exportar workspace con diálogo de archivo
  ipcMain.handle('export-workspace-dialog', async (event, workspaceData) => {
    if (!win) return false

    const result = await dialog.showSaveDialog(win, {
      title: 'Exportar Workspace',
      defaultPath: `jsrunner-workspace-${Date.now()}.json`,
      filters: [
        { name: 'Archivos JSON', extensions: ['json'] },
        { name: 'Todos los archivos', extensions: ['*'] }
      ]
    })

    if (result.canceled || !result.filePath) {
      return false
    }

    try {
      fs.writeFileSync(result.filePath, workspaceData, 'utf-8')
      return true
    } catch (error) {
      console.error('Error saving workspace file:', error)
      return false
    }
  })

  // Handler para mostrar información "Acerca de"
  ipcMain.on('show-about-dialog', () => {
    if (!win) return

    dialog.showMessageBox(win, {
      type: 'info',
      title: 'Acerca de JSRunner',
      message: 'JSRunner',
      detail: 'Editor y ejecutor de JavaScript/TypeScript\nVersión 1.0.3\n\nDesarrollado con Electron + React + Monaco Editor',
      buttons: ['OK']
    })
  })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date()).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(process.env.DIST, 'index.html'))
  }
}

app.on('window-all-closed', () => {
  win = null
})
app
  .whenReady()
  .then(() => {
    if (process.platform === 'darwin') {
      app.dock.setIcon(
        nativeImage.createFromPath(path.join(process.env.PUBLIC, 'jsrunner.png'))
      )
    }
  })
  .then(createWindow)
