const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electron', {
  isDev: process.env.ROLLUP_WATCH,

  sendOrigin: (origin) => {
    ipcRenderer.send('set-jira-origin', origin)
  }
})
