import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('spotlight', {
  hide: () => ipcRenderer.send('spotlight:hide'),
  quit: () => ipcRenderer.send('spotlight:quit'),
  expand: () => ipcRenderer.send('spotlight:expand'),
  collapse: () => ipcRenderer.send('spotlight:collapse'),
  openDialog: (actionId: string) => ipcRenderer.send('spotlight:openDialog', actionId),
  closeDialog: () => ipcRenderer.send('spotlight:closeDialog'),
  launch: (appId: string) => ipcRenderer.send('spotlight:launch', appId),
  openUrl: (url: string) => ipcRenderer.send('spotlight:openUrl', url),
})
