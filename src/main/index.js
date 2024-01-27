import sendToRender from "./utils/sendToRender"

global.SettingsStore = new Store({
  name: "settings",
  watch: true,
})

import path from "node:path"

import { app, shell, BrowserWindow, ipcMain } from "electron"
import { electronApp, optimizer, is } from "@electron-toolkit/utils"
import isDev from "electron-is-dev"
import Store from "electron-store"

import pkg from "../../package.json"

import setup from "./setup"

import PkgManager from "./pkg_mng"
import { readManifest } from "./utils/readManifest"

import GoogleDriveAPI from "./lib/google_drive"

const { autoUpdater } = require("electron-differential-updater")
const ProtocolRegistry = require("protocol-registry")

const protocolRegistryNamespace = "rsbundle"

class ElectronApp {
  constructor() {
    this.pkgManager = new PkgManager()
    this.win = null
  }

  handlers = {
    "pkg:list": async () => {
      return await this.pkgManager.getInstalledPackages()
    },
    "pkg:read": async (event, manifest_url) => {
      return JSON.stringify(await readManifest(manifest_url))
    },
    "pkg:install": async (event, manifest) => {
      this.pkgManager.install(manifest)
    },
    "pkg:update": (event, manifest_id) => {
      this.pkgManager.update(manifest_id)
    },
    "pkg:apply": (event, manifest_id, changes) => {
      this.pkgManager.applyChanges(manifest_id, changes)
    },
    "pkg:uninstall": (event, ...args) => {
      this.pkgManager.uninstall(...args)
    },
    "pkg:execute": (event, ...args) => {
      this.pkgManager.execute(...args)
    },
    "pkg:open": (event, manifest_id) => {
      this.pkgManager.open(manifest_id)
    },
    "updater:check": () => {
      autoUpdater.checkForUpdates()
    },
    "updater:apply": () => {
      setTimeout(() => {
        autoUpdater.quitAndInstall()
      }, 3000)
    },
    "settings:get": (e, key) => {
      return global.SettingsStore.get(key)
    },
    "settings:set": (e, key, value) => {
      return global.SettingsStore.set(key, value)
    },
    "settings:delete": (e, key) => {
      return global.SettingsStore.delete(key)
    },
    "settings:has": (e, key) => {
      return global.SettingsStore.has(key)
    },
    "app:init": async (event, data) => {
      await setup()

      // check if can decode google drive token
      const googleDrive_enabled = !!(await GoogleDriveAPI.readCredentials())

      return {
        pkg: pkg,
        authorizedServices: {
          drive: googleDrive_enabled
        }
      }
    }
  }

  events = {
    "open-runtime-path": () => {
      return this.pkgManager.openRuntimePath()
    },
    "open-dev-logs": () => {
      return
    }
  }

  createWindow() {
    this.win = global.win = new BrowserWindow({
      width: 450,
      height: 670,
      show: false,
      resizable: false,
      autoHideMenuBar: true,
      icon: "../../resources/icon.png",
      webPreferences: {
        preload: path.join(__dirname, "../preload/index.js"),
        sandbox: false
      }
    })

    this.win.on("ready-to-show", () => {
      this.win.show()
    })

    this.win.webContents.setWindowOpenHandler((details) => {
      shell.openExternal(details.url)

      return { action: "deny" }
    })

    if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
      this.win.loadURL(process.env["ELECTRON_RENDERER_URL"])
    } else {
      this.win.loadFile(path.join(__dirname, "../renderer/index.html"))
    }
  }

  handleURLProtocol(url) {
    const urlStarter = `${protocolRegistryNamespace}://`

    if (url.startsWith(urlStarter)) {
      const urlValue = url.split(urlStarter)[1]

      const explicitAction = urlValue.split("%3E")

      if (explicitAction[1]) {
        const [action, value] = explicitAction

        switch (action) {
          case "install": {
            return sendToRender("installation:invoked", value)
          }
          default: {
            return sendToRender("new:message", {
              message: "Unrecognized URL action"
            })
          }
        }
      } else {
        // by default if no action is specified, assume is a install action
        return sendToRender("installation:invoked", urlValue)
      }
    }
  }

  handleOnSecondInstance = async (event, commandLine, workingDirectory) => {
    event.preventDefault()

    // Someone tried to run a second instance, we should focus our window.
    if (this.win) {
      if (this.win.isMinimized()) {
        this.win.restore()
      }

      this.win.focus()
    }

    console.log(`Second instance >`, commandLine)

    const url = commandLine.pop()

    await this.handleURLProtocol(url)
  }

  async initialize() {
    // Set app user model id for windows
    electronApp.setAppUserModelId("com.electron")

    const gotTheLock = await app.requestSingleInstanceLock()

    if (!gotTheLock) {
      return app.quit()
    }

    for (const key in this.handlers) {
      ipcMain.handle(key, this.handlers[key])
    }

    for (const key in this.events) {
      ipcMain.on(key, this.events[key])
    }

    app.on("second-instance", this.handleOnSecondInstance)

    app.on("open-url", (event, url) => {
      event.preventDefault()

      this.handleURLProtocol(url)
    })

    app.on("browser-window-created", (_, window) => {
      optimizer.watchWindowShortcuts(window)
    })

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createWindow()
      }
    })

    app.on("window-all-closed", () => {
      if (process.platform !== "darwin") {
        app.quit()
      }
    })

    await app.whenReady()

    if (isDev) {
      if (app.isDefaultProtocolClient(protocolRegistryNamespace)) {
        app.removeAsDefaultProtocolClient(protocolRegistryNamespace)
      }

      ProtocolRegistry.register({
        protocol: protocolRegistryNamespace,
        command: `"${process.execPath}" "${path.resolve(process.argv[1])}" $_URL_`,
        override: true,
        script: true,
        terminal: false
      })
    } else {
      if (!app.isDefaultProtocolClient(protocolRegistryNamespace)) {
        app.setAsDefaultProtocolClient(protocolRegistryNamespace)
      }
    }

    await GoogleDriveAPI.init()

    await this.createWindow()

    if (!isDev) {
      autoUpdater.on("update-available", (ev, info) => {
        console.log(info)
      })

      autoUpdater.on("error", (ev, err) => {
        console.error(err)
      })

      autoUpdater.on("update-downloaded", (ev, info) => {
        console.log(info)

        sendToRender("app:update_available", info)
      })

      await autoUpdater.checkForUpdates()
    }
  }
}

new ElectronApp().initialize()
