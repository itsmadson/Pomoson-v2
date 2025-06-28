const { app, BrowserWindow } = require('electron')
const path = require('path')

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: !process.env.ROLLUP_WATCH, // Disable only in dev
      preload: path.join(__dirname, 'preload.js')
    }
  })

  // Load the app
  const startUrl = process.env.ROLLUP_WATCH
    ? 'http://localhost:8080'
    : `file://${path.join(__dirname, 'index.html')}`

  mainWindow.loadURL(startUrl)
    .catch(err => console.error('Failed to load:', err))

  // Open DevTools in development mode
  if (process.env.ROLLUP_WATCH) {
    mainWindow.webContents.openDevTools()
  }
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})