import path from "node:path"

import { app, shell, BrowserWindow, ipcMain } from "electron"
import { electronApp, optimizer, is } from "@electron-toolkit/utils"
import isDev from "electron-is-dev"

let RelicCore = null
let Settings = null

if (isDev) {
	RelicCore = require("../../../core/dist").default
	Settings = global.Settings = require("../../../core/dist/classes/Settings").default
} else {
	RelicCore = require("@ragestudio/relic-core").default
	Settings = global.Settings = require("@ragestudio/relic-core/src/classes/Settings").default
}

import CoreAdapter from "./classes/CoreAdapter"
import sendToRender from "./utils/sendToRender"
import pkg from "../../package.json"

const { autoUpdater } = require("electron-differential-updater")
const ProtocolRegistry = require("protocol-registry")

const protocolRegistryNamespace = "relic"

class LogsViewer {
	window = null

	async createWindow() {
		this.window = new BrowserWindow({
			width: 800,
			height: 600,
			show: false,
			resizable: true,
			autoHideMenuBar: true,
			icon: "../../resources/icon.png",
			webPreferences: {
				preload: path.join(__dirname, "../preload/index.js"),
				sandbox: false,
			},
		})

		if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
			this.window.loadURL(`${process.env["ELECTRON_RENDERER_URL"]}/#logs`)
		} else {
			this.window.loadFile(path.join(__dirname, "../renderer/index.html"), {
				hash: "#logs",
			})
		}

		await new Promise((resolve) => this.window.once("ready-to-show", resolve))

		this.window.show()

		return this.window
	}

	closeWindow() {
		if (this.window) {
			this.window.close()
		}
	}
}

class ElectronApp {
	constructor() {
		this.core = new RelicCore()
		this.adapter = new CoreAdapter(this, this.core)
	}

	window = null

	logsViewer = new LogsViewer()

	handlers = {
		"updater:check": () => {
			autoUpdater.checkForUpdates()
		},
		"updater:apply": () => {
			setTimeout(() => {
				autoUpdater.quitAndInstall()
			}, 3000)
		},
		"settings:get": async (event, key) => {
			return await Settings.get(key)
		},
		"settings:set": async (event, key, value) => {
			return await Settings.set(key, value)
		},
		"settings:delete": async (event, key) => {
			return await Settings.delete(key)
		},
		"settings:has": async (event, key) => {
			return await Settings.has(key)
		},
		"app:open-logs": async (event) => {
			const loggerWindow = await this.logsViewer.createWindow()

			this.adapter.attachLogger(loggerWindow)

			loggerWindow.on("closed", () => {
				this.adapter.detachLogger()
			})

			loggerWindow.webContents.send("logger:new", {
				timestamp: new Date().getTime(),
				message: "Logger opened, starting watching logs",
			})
		},
		"app:init": async (event, data) => {
			try {
				await this.adapter.initialize()

				return {
					pkg: pkg,
					authorizedServices: {}
				}
			} catch (error) {
				console.error(error)

				sendToRender("app:init:failed", {
					message: "Initalization failed",
					error: error,
				})

				return {
					error
				}
			}
		}
	}

	createWindow() {
		this.window = global.mainWindow = new BrowserWindow({
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

		this.window.on("ready-to-show", () => {
			this.window.show()
		})

		this.window.webContents.setWindowOpenHandler((details) => {
			shell.openExternal(details.url)

			return { action: "deny" }
		})

		if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
			this.window.loadURL(process.env["ELECTRON_RENDERER_URL"])
		} else {
			this.window.loadFile(path.join(__dirname, "../renderer/index.html"))
		}
	}

	handleURLProtocol(url) {
		const urlStarter = `${protocolRegistryNamespace}://`

		if (url.startsWith(urlStarter)) {
			const urlValue = url.split(urlStarter)[1]

			let explicitAction = urlValue.split("#")

			// remove trailing slash for windows :(
			if (explicitAction[0].endsWith("/")) {
				explicitAction[0] = explicitAction[0].slice(0, -1)
			}

			if (explicitAction.length > 0) {
				switch (explicitAction[0]) {
					case "authorize": {
						if (!explicitAction[2]) {
							const [pkg_id, token] = explicitAction[1].split("%23")
							return this.core.package.authorize(pkg_id, token)
						} else {
							return this.core.package.authorize(explicitAction[1], explicitAction[2])
						}
					}
					default: {
						return sendToRender("pkg:installation:invoked", explicitAction[0])
					}
				}
			} else {
				// by default if no action is specified, assume is a install action
				return sendToRender("pkg:installation:invoked", urlValue)
			}
		}
	}

	handleOnSecondInstance = async (event, commandLine, workingDirectory) => {
		event.preventDefault()

		// Someone tried to run a second instance, we should focus our window.
		if (this.window) {
			if (this.window.isMinimized()) {
				this.window.restore()
			}

			this.window.focus()
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

		await this.createWindow()

		if (!isDev) {
			autoUpdater.on("update-available", (ev, info) => {
				console.log(info)
				sendToRender("app:checking_update_downloading", info)
			})

			autoUpdater.on("error", (ev, err) => {
				console.error(err)
				sendToRender("app:checking_update_error")
			})

			autoUpdater.on("update-downloaded", (ev, info) => {
				console.log(info)
				sendToRender("app:update_available", info)
			})

			sendToRender("app:checking_update")

			await autoUpdater.checkForUpdates()
		}
	}
}

new ElectronApp().initialize()