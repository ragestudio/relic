import { contextBridge, ipcRenderer } from "electron"
import { electronAPI } from "@electron-toolkit/preload"

const api = {
  settings: {
    get: (key) => {
      return ipcRenderer.invoke("settings:get", key)
    },
    set: (key, value) => {
      return ipcRenderer.invoke("settings:set", key, value)
    },
    delete: (key) => {
      return ipcRenderer.invoke("settings:delete", key)
    },
    has: (key) => {
      return ipcRenderer.invoke("settings:has", key)
    },
  },
}

const versions = {
  electron: process.versions.electron,
  chrome: process.versions.chrome,
  node: process.versions.node,
  v8: process.versions.v8,
  uv: process.versions.uv
}

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
    contextBridge.exposeInMainWorld("versions", versions)
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = electronAPI
  window.api = api
  window.versions = versions
}
