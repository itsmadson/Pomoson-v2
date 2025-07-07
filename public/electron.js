const { app, BrowserWindow, session, ipcMain } = require('electron')
const path = require('path')

let dynamicOrigin = null

ipcMain.on('set-jira-origin', (event, origin) => {
  dynamicOrigin = origin
  console.log('Received JIRA origin:', dynamicOrigin)
})

function createWindow() {
  // Inject custom headers before sending any requests
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    if (dynamicOrigin && details.url.startsWith(dynamicOrigin)) {
      details.requestHeaders['User-Agent'] =
          'Mozilla/5.0 (X11; Linux x86_64; rv:139.0) Gecko/20100101 Firefox/139.0'
      details.requestHeaders['Accept'] =
          'application/json, application/vnd-ms-excel'
      details.requestHeaders['Accept-Language'] = 'en-US,en;q=0.5'
      details.requestHeaders['Accept-Encoding'] = 'gzip, deflate, br, zstd'
      details.requestHeaders['Origin'] = dynamicOrigin
      details.requestHeaders['Content-Type'] = 'application/json'
      details.requestHeaders['Sec-GPC'] = '1'
      details.requestHeaders['Connection'] = 'keep-alive'
      details.requestHeaders['Sec-Fetch-Dest'] = 'empty'
      details.requestHeaders['Sec-Fetch-Mode'] = 'cors'
      details.requestHeaders['Sec-Fetch-Site'] = 'same-origin'
    }

    callback({ requestHeaders: details.requestHeaders })
  })

  const mainWindow = new BrowserWindow({
    width: 430,
    height: 830,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: !process.env.ROLLUP_WATCH,
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: __dirname + './pomoson2.ico',
  })

  const startUrl = process.env.ROLLUP_WATCH
      ? 'http://localhost:8080'
      : `file://${path.join(__dirname, 'index.html')}`

  mainWindow.loadURL(startUrl).catch(err => console.error('Failed to load:', err))

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
