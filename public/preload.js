const { contextBridge } = require('electron')

contextBridge.exposeInMainWorld('electron', {
  isDev: process.env.ROLLUP_WATCH
})