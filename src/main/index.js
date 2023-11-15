import lodash from "lodash"

global.sendToRenderer = (event, data) => {
  function serializeIpc(data) {
    const copy = lodash.cloneDeep(data)

    // remove fns
    if (!Array.isArray(copy)) {
      Object.keys(copy).forEach((key) => {
        if (typeof copy[key] === "function") {
          delete copy[key]
        }
      })
    }

    return copy
  }

  global.win.webContents.send(event, serializeIpc(data))
}

const { autoUpdater } = require("electron-differential-updater")
const ProtocolRegistry = require("protocol-registry")

import path from "node:path"

import { app, shell, BrowserWindow, ipcMain } from "electron"
import { electronApp, optimizer, is } from "@electron-toolkit/utils"
import isDev from "electron-is-dev"

import open from "open"

import pkg from "../../package.json"

import setup from "./setup"

import PkgManager from "./pkg_mng"
import { readManifest } from "./utils/readManifest"

const protocolRegistryNamespace = "rsbundle"

class ElectronApp {
  constructor() {
    this.pkgManager = new PkgManager()
    this.win = null
  }

  handlers = {
    pkg: () => {
      return pkg
    },
    "get:installations": async () => {
      return await this.pkgManager.getInstallations()
    },
    "bundle:read": async (event, manifest_url) => {
      return JSON.stringify(await readManifest(manifest_url))
    },
    "bundle:update": (event, manifest_id) => {
      this.pkgManager.update(manifest_id)
    },
    "bundle:exec": (event, manifest_id) => {
      this.pkgManager.execute(manifest_id)
    },
    "bundle:install": async (event, manifest) => {
      this.pkgManager.install(manifest)
    },
    "bundle:uninstall": (event, manifest_id) => {
      this.pkgManager.uninstall(manifest_id)
    },
    "bundle:open": (event, manifest_id) => {
      this.pkgManager.openBundleFolder(manifest_id)
    },
    "check:setup": async () => {
      return await setup()
    },
    "updater:check": () => {
      autoUpdater.checkForUpdates()
    },
    "updater:apply": () => {
      setTimeout(() => {
        autoUpdater.quitAndInstall()
      }, 3000)
    }
  }

  events = {
    "open-runtime-path": () => {
      return open(this.pkgManager.runtimePath)
    },
  }

  sendToRender(event, ...args) {
    console.log(`[sendToRender][${event}]`, ...args)
    this.win.webContents.send(event, ...args)
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
    console.log(url)

    const urlStarter = `${protocolRegistryNamespace}://`

    if (url.startsWith(urlStarter)) {
      const urlValue = url.split(urlStarter)[1]

      const explicitAction = urlValue.split("%3E")

      if (explicitAction[1]) {
        const [action, value] = explicitAction

        switch (action) {
          case "install": {
            return this.sendToRender("installation:invoked", value)
          }

          default: {
            return this.sendToRender("new:message", {
              message: "Unrecognized URL action",
            })
          }
        }
      } else {
        // by default if no action is specified, assume is a install action
        return this.sendToRender("installation:invoked", urlValue)
      }
    }
  }

  async initialize() {
    const gotTheLock = app.requestSingleInstanceLock()

    if (!gotTheLock) {
      app.quit()
    } else {
      app.on("second-instance", (event, commandLine, workingDirectory) => {
        event.preventDefault()

        // Someone tried to run a second instance, we should focus our window.
        if (this.win) {
          if (this.win.isMinimized()) {
            this.win.restore()
          }

          this.win.focus()
        }

        const url = commandLine.pop()

        this.handleURLProtocol(url)
      })
    }

    for (const key in this.handlers) {
      ipcMain.handle(key, this.handlers[key])
    }

    for (const key in this.events) {
      ipcMain.on(key, this.events[key])
    }

    await app.whenReady()

    // Set app user model id for windows
    electronApp.setAppUserModelId("com.electron")

    app.on("open-url", (event, url) => {
      event.preventDefault()

      this.handleURLProtocol(url)
    })

    app.on("browser-window-created", (_, window) => {
      optimizer.watchWindowShortcuts(window)
    })

    autoUpdater.on("update-available", (ev, info) => {
      console.log(info)
    })

    autoUpdater.on("error", (ev, err) => {
      console.error(err)
    })

    autoUpdater.on("update-downloaded", (ev, info) => {
      console.log(info)

      this.sendToRender("update-available", info)
    })

    if (isDev) {
      if (app.isDefaultProtocolClient(protocolRegistryNamespace)) {
        app.removeAsDefaultProtocolClient(protocolRegistryNamespace)
      }

      ProtocolRegistry.register({
        protocol: protocolRegistryNamespace,
        command: `"${process.execPath}" "${path.resolve(
          process.argv[1]
        )}" $_URL_`,
        override: true,
        script: true,
        terminal: false,
      })
    } else {
      if (!app.isDefaultProtocolClient(protocolRegistryNamespace)) {
        app.setAsDefaultProtocolClient(protocolRegistryNamespace)
      }
    }

    this.createWindow()

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

    autoUpdater.checkForUpdates()
  }
}

new ElectronApp().initialize()