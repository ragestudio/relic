import { contextBridge, ipcRenderer } from "electron"
import { electronAPI } from "@electron-toolkit/preload"

const api = {}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld(
      "ipc",
      {
        exec: (channel, ...args) => {
          return ipcRenderer.invoke(channel, ...args)
        },
        send: (channel, args) => {
          ipcRenderer.send(channel, args)
        },
        on: (channel, listener) => {
          ipcRenderer.on(channel, (event, ...args) => listener(event, ...args))
        },
        off: (channel, listener) => {
          ipcRenderer.removeListener(channel, listener)
        }
      },

    )
    contextBridge.exposeInMainWorld("electron", electronAPI)

    contextBridge.exposeInMainWorld("api", api)
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = electronAPI
  window.api = api
}
