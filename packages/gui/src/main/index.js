global.SettingsStore = new Store({
	name: "settings",
	watch: true,
})

import RelicCore from "@ragestudio/relic-core/src"
import CoreAdapter from "./classes/CoreAdapter"

import sendToRender from "./utils/sendToRender"

import path from "node:path"

import { app, shell, BrowserWindow, ipcMain } from "electron"
import { electronApp, optimizer, is } from "@electron-toolkit/utils"
import isDev from "electron-is-dev"
import Store from "electron-store"

import pkg from "../../package.json"

const { autoUpdater } = require("electron-differential-updater")
const ProtocolRegistry = require("protocol-registry")

const protocolRegistryNamespace = "relic"

class ElectronApp {
	constructor() {
		this.win = null
		this.core = new RelicCore()
		this.adapter = new CoreAdapter(this, this.core)
	}

	handlers = {
		"pkg:list": async () => {
			return await this.core.package.list()
		},
		"pkg:get": async (event, pkg_id) => {
			return await this.core.db.getPackages(pkg_id)
		},
		"pkg:read": async (event, manifest_path, options = {}) => {
			const manifest = await this.core.package.read(manifest_path, options)

			return JSON.stringify({
				...this.core.db.defaultPackageState({ ...manifest }),
				...manifest,
				name: manifest.pkg_name,
			})
		},
		"pkg:install": async (event, manifest_path) => {
			return await this.core.package.install(manifest_path)
		},
		"pkg:update": async (event, pkg_id, { execOnFinish = false } = {}) => {
			await this.core.package.update(pkg_id)

			if (execOnFinish) {
				await this.core.package.execute(pkg_id)
			}

			return true
		},
		"pkg:apply": async (event, pkg_id, changes) => {
			return await this.core.package.apply(pkg_id, changes)
		},
		"pkg:uninstall": async (event, pkg_id) => {
			return await this.core.package.uninstall(pkg_id)
		},
		"pkg:execute": async (event, pkg_id) => {
			return await this.core.package.execute(pkg_id)
		},
		"pkg:open": async (event, pkg_id) => {
			return await this.core.openPath(pkg_id)
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
			try {
				await this.core.initialize()
				await this.core.setup()
			} catch (err) {
				console.error(err)

				sendToRender("new:notification", {
					message: "Setup failed",
					description: err.message
				})
			}

			return {
				pkg: pkg,
				authorizedServices: {}
			}
		}
	}

	events = {
		"open-runtime-path": () => {
			return this.core.openPath()
		},
		"open-dev-logs": () => {
			return sendToRender("new:message", {
				message: "Not implemented yet",
			})
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
