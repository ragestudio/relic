import path from "node:path"

import { app, shell, BrowserWindow, ipcMain } from "electron"
import { electronApp, optimizer, is } from "@electron-toolkit/utils"
import { autoUpdater } from "electron-differential-updater"

import open from "open"

import icon from "../../resources/icon.png?asset"
import pkg from "../../package.json"

import setup from "./setup"

import PkgManager from "./pkgManager"

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
      autoHideMenuBar: true,
      ...(process.platform === "linux" ? { icon } : {}),
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

  async initialize() {
    for (const key in this.handlers) {
      ipcMain.handle(key, this.handlers[key])
    }

    for (const key in this.events) {
      ipcMain.on(key, this.events[key])
    }

    await app.whenReady()

    autoUpdater.on("update-available", (ev, info) => {
      console.log(info)

      this.sendToRender("new:message", {
        message: `New update available, downloading...`,
        type: "loading",
      })
    })

    autoUpdater.on("error", (ev, err) => {
      console.error(err)

      this.sendToRender("new:message", {
        message: "Failed to auto update...",
        type: "error",
      })
    })

    autoUpdater.on("update-downloaded", (ev, info) => {
      console.log(info)

      this.sendToRender("new:message", {
        message: `Update downloaded, restarting...`,
        type: "loading",
      })
    })

    autoUpdater.on("update-downloaded", (ev, info) => {
      setTimeout(() => {
        autoUpdater.quitAndInstall()
      }, 3000)
    })

    autoUpdater.checkForUpdates()

    // Set app user model id for windows
    electronApp.setAppUserModelId("com.electron")

    app.on("browser-window-created", (_, window) => {
      optimizer.watchWindowShortcuts(window)
    })

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
  }
}

new ElectronApp().initialize()